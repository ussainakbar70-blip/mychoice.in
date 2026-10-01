import { CartItem } from "./context";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/db/client";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";
import { getProductById } from "@/lib/db/products";

export interface RefreshedCartResult {
  items: CartItem[];
  hasChanges: boolean;
  messages: string[];
}

/**
 * Validates cart items against current database products and variants.
 * Recalculates authoritative prices and validates current inventory levels.
 */
export async function validateAndRefreshCart(items: CartItem[]): Promise<RefreshedCartResult> {
  const refreshed: CartItem[] = [];
  const messages: string[] = [];
  let hasChanges = false;

  for (const item of items) {
    let product = DEMO_PRODUCTS.find((p) => p.id === item.productId);
    if (!product && isSupabaseConfigured()) {
      product = (await getProductById(item.productId)) || undefined;
    }

    if (!product || product.status !== "published") {
      messages.push(`"${item.name}" is no longer available and was removed from your bag.`);
      hasChanges = true;
      continue;
    }

    const variant = product.variants.find((v) => v.id === item.variantId);
    if (!variant || !variant.isActive) {
      messages.push(`The selected option for "${product.name}" is unavailable and was removed.`);
      hasChanges = true;
      continue;
    }

    // Check inventory
    if (variant.inventoryQuantity <= 0) {
      messages.push(`"${product.name}" is currently out of stock and was removed.`);
      hasChanges = true;
      continue;
    }

    let quantity = item.quantity;
    if (quantity > variant.inventoryQuantity) {
      quantity = variant.inventoryQuantity;
      messages.push(`Quantity for "${product.name}" was adjusted to available stock (${quantity}).`);
      hasChanges = true;
    }

    // Price check against authoritative database
    if (item.price !== variant.price) {
      messages.push(`Price for "${product.name}" changed from $${item.price.toFixed(2)} to $${variant.price.toFixed(2)}.`);
      hasChanges = true;
    }

    refreshed.push({
      ...item,
      price: variant.price, // Force server authoritative price
      sku: variant.sku,
      quantity,
    });
  }

  return {
    items: refreshed,
    hasChanges,
    messages,
  };
}

/**
 * Merge guest cart items into customer's authenticated database cart.
 */
export async function mergeGuestCart(
  customerId: string,
  guestItems: CartItem[]
): Promise<CartItem[]> {
  if (guestItems.length === 0) {
    return getAuthenticatedCart(customerId);
  }

  const existingAuthItems = await getAuthenticatedCart(customerId);

  // Combine items by variantId
  const combinedMap = new Map<string, CartItem>();

  for (const item of existingAuthItems) {
    combinedMap.set(item.variantId, { ...item });
  }

  for (const guestItem of guestItems) {
    const existing = combinedMap.get(guestItem.variantId);
    if (existing) {
      existing.quantity += guestItem.quantity;
    } else {
      combinedMap.set(guestItem.variantId, { ...guestItem });
    }
  }

  // Refresh authoritative data & inventory
  const combinedList = Array.from(combinedMap.values());
  const validated = await validateAndRefreshCart(combinedList);

  // Persist merged cart
  await saveAuthenticatedCart(customerId, validated.items);

  // Clear guest cart from local storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("mychoice_cart");
  }

  return validated.items;
}

/**
 * Fetch authenticated cart from Supabase or memory.
 */
export async function getAuthenticatedCart(customerId: string): Promise<CartItem[]> {
  if (isSupabaseConfigured() && customerId) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: cart } = await supabase
        .from("carts")
        .select("id")
        .eq("customer_id", customerId)
        .single();

      if (cart) {
        const { data: items, error } = await supabase
          .from("cart_items")
          .select("*, products(name, product_images(public_url)), product_variants(price, sku, option_1_name, option_1_value)")
          .eq("cart_id", cart.id);

        if (!error && items) {
          return items.map((i: any) => ({
            variantId: i.variant_id,
            productId: i.product_id,
            name: i.products?.name || "Product",
            variantName: i.product_variants?.option_1_value
              ? `${i.product_variants.option_1_name}: ${i.product_variants.option_1_value}`
              : undefined,
            price: Number(i.unit_price || i.product_variants?.price || 0),
            image: i.products?.product_images?.[0]?.public_url || "",
            sku: i.product_variants?.sku || "",
            quantity: i.quantity,
          }));
        }
      }
    } catch (err) {
      console.warn("[Cart] DB fetch failed, falling back to local:", err);
    }
  }

  return [];
}

/**
 * Persist cart items for authenticated customer.
 */
export async function saveAuthenticatedCart(customerId: string, items: CartItem[]): Promise<void> {
  if (isSupabaseConfigured() && customerId) {
    try {
      const supabase = getSupabaseBrowserClient();
      let { data: cart } = await supabase
        .from("carts")
        .select("id")
        .eq("customer_id", customerId)
        .single();

      if (!cart) {
        const { data: newCart } = await supabase
          .from("carts")
          .insert({ customer_id: customerId })
          .select("id")
          .single();
        cart = newCart;
      }

      if (cart) {
        // Clear existing items and repopulate
        await supabase.from("cart_items").delete().eq("cart_id", cart.id);

        if (items.length > 0) {
          await supabase.from("cart_items").insert(
            items.map((i) => ({
              cart_id: cart.id,
              product_id: i.productId,
              variant_id: i.variantId,
              quantity: i.quantity,
              unit_price: i.price,
            }))
          );
        }
      }
    } catch (err) {
      console.warn("[Cart] DB save failed:", err);
    }
  }
}
