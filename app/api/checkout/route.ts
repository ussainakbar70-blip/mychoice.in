import { NextRequest, NextResponse } from "next/server";
import { CheckoutRequestSchema } from "@/lib/validation/schemas";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";
import { calculateOrderTotals, AuthoritativeLineItem } from "@/lib/pricing/calculator";
import { getPaymentProvider } from "@/lib/payments";
import { dbStore, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";
import { emailService } from "@/lib/email";
import { getProductById } from "@/lib/db/products";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // 1. Strict Zod input validation
    const parseResult = CheckoutRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid checkout request",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      email,
      shippingAddress,
      items,
      couponCode,
      currency,
      idempotencyKey,
      notes,
    } = parseResult.data;

    // 2. Idempotency Guard: prevent duplicate orders caused by retries or double clicks
    if (idempotencyKey) {
      const existingOrders = dbStore.getAllOrders();
      const duplicate = existingOrders.find((o) => o.idempotencyKey === idempotencyKey);
      if (duplicate) {
        return NextResponse.json({
          success: true,
          orderNumber: duplicate.orderNumber,
          orderId: duplicate.id,
          isIdempotentReplay: true,
          redirectUrl: `/order/success/${duplicate.orderNumber}`,
        });
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseServerClient();
          const { data: dupOrder } = await supabase
            .from("orders")
            .select("id, order_number")
            .eq("idempotency_key", idempotencyKey)
            .single();

          if (dupOrder) {
            return NextResponse.json({
              success: true,
              orderNumber: dupOrder.order_number,
              orderId: dupOrder.id,
              isIdempotentReplay: true,
              redirectUrl: `/order/success/${dupOrder.order_number}`,
            });
          }
        } catch {
          // Continue if query misses
        }
      }
    }

    // 3. Authoritative Product & Price Lookup from Database (Never trust client prices)
    const authoritativeItems: AuthoritativeLineItem[] = [];

    for (const clientItem of items) {
      if (clientItem.quantity <= 0) {
        return NextResponse.json(
          { error: "Item quantity must be greater than zero." },
          { status: 400 }
        );
      }

      let product = DEMO_PRODUCTS.find((p) => p.id === clientItem.productId);
      if (!product && isSupabaseConfigured()) {
        product = (await getProductById(clientItem.productId)) || undefined;
      }

      if (!product) {
        return NextResponse.json(
          { error: `Product ID "${clientItem.productId}" not found in catalog.` },
          { status: 400 }
        );
      }

      const variant = product.variants.find((v) => v.id === clientItem.variantId);
      if (!variant) {
        return NextResponse.json(
          { error: `Variant ID "${clientItem.variantId}" not found for product "${product.name}".` },
          { status: 400 }
        );
      }

      if (!variant.isActive) {
        return NextResponse.json(
          { error: `Selected variant for "${product.name}" is currently unavailable.` },
          { status: 400 }
        );
      }

      // Check Real Inventory Quantity
      if (variant.inventoryQuantity < clientItem.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${product.name} (${variant.option1Value || "Standard"}). Only ${variant.inventoryQuantity} available.`,
          },
          { status: 409 }
        );
      }

      authoritativeItems.push({
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        variantName: variant.option1Value ? `${variant.option1Name}: ${variant.option1Value}` : undefined,
        sku: variant.sku,
        quantity: clientItem.quantity,
        unitPrice: variant.price, // Server-Authoritative Price
        costPrice: variant.costPrice,
        shippingCost: variant.shippingCost,
        weight: variant.weight,
        cjProductId: product.cjProductId,
        cjVariantId: variant.cjVariantId,
      });
    }

    // 4. Calculate Server-Authoritative Totals
    const calculation = calculateOrderTotals(authoritativeItems, couponCode);
    if (calculation.errors.length > 0) {
      return NextResponse.json({ error: calculation.errors[0] }, { status: 400 });
    }

    // 5. Payment Processing Architecture
    // Uses payment provider abstraction for gateway order creation
    const paymentProvider = getPaymentProvider();
    const paymentOrder = await paymentProvider.createPaymentOrder({
      orderId: `temp_${Date.now()}`,
      orderNumber: "PENDING",
      amount: calculation.totalAmount,
      currency: currency || "USD",
      customerEmail: email || undefined,
      customerName: shippingAddress.fullName,
      customerPhone: shippingAddress.phone,
    });

    // Determine initial payment status:
    // If running in development/mock provider mode and transaction simulates success, mark pending_payment or paid accordingly
    const isMockPaid = paymentOrder.success && (process.env.PAYMENT_PROVIDER === "development" || process.env.PAYMENT_PROVIDER === "mock");
    const paymentStatus: "paid" | "pending_payment" = isMockPaid ? "paid" : "pending_payment";

    // 6. Save Confirmed Order in Local Store & Supabase
    const savedOrder = dbStore.createOrder({
      email: email || "",
      currency: currency || "USD",
      subtotal: calculation.subtotal,
      shippingAmount: calculation.shippingAmount,
      discountAmount: calculation.discountAmount,
      taxAmount: calculation.taxAmount,
      totalAmount: calculation.totalAmount,
      paymentStatus: paymentStatus as any,
      orderStatus: "confirmed",
      fulfillmentStatus: "unfulfilled",
      shippingAddress,
      idempotencyKey,
      items: authoritativeItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: Number((item.unitPrice * item.quantity).toFixed(2)),
        cjProductId: item.cjProductId,
        cjVariantId: item.cjVariantId,
      })),
    });

    // Safely deduct inventory in local store
    for (const item of authoritativeItems) {
      const prod = DEMO_PRODUCTS.find((p) => p.id === item.productId);
      const variant = prod?.variants.find((v) => v.id === item.variantId);
      if (variant) {
        variant.inventoryQuantity = Math.max(0, variant.inventoryQuantity - item.quantity);
      }
    }

    // Persist to Supabase if connected
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        const { data: dbOrder, error: orderErr } = await supabase
          .from("orders")
          .insert({
            id: savedOrder.id,
            order_number: savedOrder.orderNumber,
            email: email || null,
            phone: shippingAddress.phone || null,
            customer_name: shippingAddress.fullName || null,
            currency: currency || "USD",
            subtotal: calculation.subtotal,
            shipping_amount: calculation.shippingAmount,
            discount_amount: calculation.discountAmount,
            tax_amount: calculation.taxAmount,
            total_amount: calculation.totalAmount,
            payment_status: paymentStatus,
            order_status: "confirmed",
            fulfillment_status: "unfulfilled",
            idempotency_key: idempotencyKey || null,
            shipping_address: shippingAddress,
            notes: typeof notes === "string" ? notes : JSON.stringify({ shippingAddress, notes }),
          })
          .select()
          .single();

        if (!orderErr && dbOrder) {
          // Insert order items
          await supabase.from("order_items").insert(
            authoritativeItems.map((item) => ({
              order_id: dbOrder.id,
              product_id: item.productId,
              variant_id: item.variantId,
              product_name: item.productName,
              variant_name: item.variantName || null,
              sku: item.sku,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: Number((item.unitPrice * item.quantity).toFixed(2)),
              cj_product_id: item.cjProductId || null,
              cj_variant_id: item.cjVariantId || null,
            }))
          );

          // Inventory deduction in Supabase via RPC or update
          for (const item of authoritativeItems) {
            try {
              await supabase.rpc("decrease_variant_inventory", {
                p_variant_id: item.variantId,
                p_quantity: item.quantity,
              });
            } catch {
              // Fallback direct update
              const { data: vRow } = await supabase
                .from("product_variants")
                .select("inventory_quantity")
                .eq("id", item.variantId)
                .single();
              if (vRow) {
                await supabase
                  .from("product_variants")
                  .update({
                    inventory_quantity: Math.max(0, vRow.inventory_quantity - item.quantity),
                  })
                  .eq("id", item.variantId);
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn("[Checkout] Supabase order persistence fallback:", dbErr);
      }
    }

    // 7. Dispatch Order Confirmation Email
    if (email) {
      try {
        await emailService.send({
          to: { email, name: shippingAddress.fullName },
          subject: `Order Confirmed: ${savedOrder.orderNumber} | MYCHOICE.in`,
          template: "order_confirmation",
          data: {
            orderNumber: savedOrder.orderNumber,
            total: savedOrder.totalAmount,
            customerName: shippingAddress.fullName,
            shippingAddress,
            items: savedOrder.items,
          },
        });
      } catch (emailErr) {
        console.warn("Non-fatal email dispatch error:", emailErr);
      }
    }

    // Future CJ Dropshipping integration is prepared at architecture level and will be triggered in Mega Prompt 2.
    // In compliance with Rule 14, NO direct CJ API call is made here.

    return NextResponse.json({
      success: true,
      orderNumber: savedOrder.orderNumber,
      orderId: savedOrder.id,
      redirectUrl: `/order/success/${savedOrder.orderNumber}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal checkout failure";
    console.error("Checkout route error:", error);
    return NextResponse.json(
      { error: "We were unable to process your order. Please try again." },
      { status: 500 }
    );
  }
}
