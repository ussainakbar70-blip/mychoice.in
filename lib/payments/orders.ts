import crypto from "crypto";
import {
  PaymentRecord,
  SafeCheckoutPayload,
  CreatePaymentOrderParams,
  PaymentStatus,
} from "./types";
import { getPaymentProvider } from "./provider";
import { calculateOrderTotals, AuthoritativeLineItem } from "@/lib/pricing/calculator";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";
import { getProductById } from "@/lib/db/products";
import { dbStore, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";
import { toPaise, areAmountsEqual } from "./money";
import { PaymentValidationError, PaymentAmountMismatchError } from "./errors";
import { getPaymentCurrency, getPaymentMode } from "./config";

export interface CreateCheckoutPaymentRequest {
  email?: string | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    countryCode: string;
  };
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  couponCode?: string;
  currency?: string;
  idempotencyKey?: string;
  notes?: string;
  customerId?: string;
}

export interface CheckoutPaymentResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  paymentId: string;
  checkout: SafeCheckoutPayload;
  isIdempotentReplay?: boolean;
}

/**
 * Creates or retrieves a server-authoritative payment order.
 * Strictly re-evaluates catalog prices, inventory, and coupon validity.
 */
export async function createCheckoutPaymentOrder(
  req: CreateCheckoutPaymentRequest
): Promise<CheckoutPaymentResult> {
  const currency = req.currency || getPaymentCurrency();

  // 1. Idempotency Check: if idempotency key exists and order is already present
  if (req.idempotencyKey) {
    // Check local store
    const existingOrders = dbStore.getAllOrders();
    const dup = existingOrders.find((o) => o.idempotencyKey === req.idempotencyKey);
    if (dup) {
      const payment = dbStore.getPaymentByOrderId(dup.id);
      if (payment && payment.providerOrderId) {
        const provider = getPaymentProvider();
        return {
          success: true,
          orderId: dup.id,
          orderNumber: dup.orderNumber,
          paymentId: payment.id,
          isIdempotentReplay: true,
          checkout: {
            keyId: process.env.CASHFREE_APP_ID || process.env.RAZORPAY_KEY_ID || "mock_key_test_id",
            appId: process.env.CASHFREE_APP_ID,
            paymentSessionId: payment.metadata?.paymentSessionId,
            orderId: dup.id,
            orderNumber: dup.orderNumber,
            provider: provider.name,
            providerOrderId: payment.providerOrderId,
            mode: getPaymentMode(),
            amount: payment.amount,
            amountMinor: toPaise(payment.amount),
            currency: payment.currency,
            customer: {
              name: dup.shippingAddress.fullName,
              email: dup.email,
              contact: dup.shippingAddress.phone,
            },
          },
        };
      }
    }

    // Check Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        const { data: dbOrder } = await supabase
          .from("orders")
          .select("id, order_number, email, shipping_address, total_amount, currency")
          .eq("idempotency_key", req.idempotencyKey)
          .single();

        if (dbOrder) {
          const { data: dbPayment } = await supabase
            .from("payments")
            .select("*")
            .eq("order_id", dbOrder.id)
            .single();

          if (dbPayment && dbPayment.provider_order_id) {
            const provider = getPaymentProvider();
            const customerName = (dbOrder.shipping_address as any)?.fullName || req.shippingAddress.fullName;
            return {
              success: true,
              orderId: dbOrder.id,
              orderNumber: dbOrder.order_number,
              paymentId: dbPayment.id,
              isIdempotentReplay: true,
              checkout: {
                keyId: process.env.CASHFREE_APP_ID || process.env.RAZORPAY_KEY_ID || "mock_key_test_id",
                appId: process.env.CASHFREE_APP_ID,
                paymentSessionId: dbPayment.metadata?.paymentSessionId,
                orderId: dbOrder.id,
                orderNumber: dbOrder.order_number,
                provider: provider.name,
                providerOrderId: dbPayment.provider_order_id,
                mode: getPaymentMode(),
                amount: Number(dbPayment.amount),
                amountMinor: toPaise(Number(dbPayment.amount)),
                currency: dbPayment.currency,
                customer: {
                  name: customerName,
                  email: dbOrder.email,
                  contact: req.shippingAddress.phone,
                },
              },
            };
          }
        }
      } catch {
        // Continue if query misses
      }
    }
  }

  // 2. Server-Authoritative Product & Inventory Re-validation
  if (!req.items || req.items.length === 0) {
    throw new PaymentValidationError("Cart is empty. Please select products to continue.");
  }

  const authoritativeItems: AuthoritativeLineItem[] = [];

  for (const clientItem of req.items) {
    if (clientItem.quantity <= 0) {
      throw new PaymentValidationError("All items must have a quantity of at least 1.");
    }

    let product = DEMO_PRODUCTS.find((p) => p.id === clientItem.productId);
    if (!product && isSupabaseConfigured()) {
      product = (await getProductById(clientItem.productId)) || undefined;
    }

    if (!product) {
      throw new PaymentValidationError(`Product ID "${clientItem.productId}" not found.`);
    }

    const variant = product.variants.find((v) => v.id === clientItem.variantId);
    if (!variant) {
      throw new PaymentValidationError(`Selected variant not found for product "${product.name}".`);
    }

    if (!variant.isActive) {
      throw new PaymentValidationError(`Product "${product.name}" (${variant.option1Value || "Default"}) is currently unavailable.`);
    }

    // Check inventory race condition
    if (variant.inventoryQuantity < clientItem.quantity) {
      throw new PaymentValidationError(
        `Insufficient inventory for "${product.name}". Only ${variant.inventoryQuantity} units available.`
      );
    }

    authoritativeItems.push({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantName: variant.option1Value ? `${variant.option1Name}: ${variant.option1Value}` : undefined,
      sku: variant.sku,
      quantity: clientItem.quantity,
      unitPrice: variant.price,
      costPrice: variant.costPrice,
      shippingCost: variant.shippingCost,
      weight: variant.weight,
      cjProductId: product.cjProductId,
      cjVariantId: variant.cjVariantId,
    });
  }

  // 3. Recalculate Server-Authoritative Totals
  const calculation = calculateOrderTotals(authoritativeItems, req.couponCode);
  if (calculation.errors.length > 0) {
    throw new PaymentValidationError(calculation.errors[0]);
  }

  // 4. Generate Authoritative Order ID (RFC4122 UUID) and Order Number
  const authoritativeOrderId = crypto.randomUUID();
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const authoritativeOrderNumber = `ORD-${year}-${randomSuffix}`;

  // Create Local Order in 'pending_payment' / 'pending' state using the authoritative UUID
  const savedOrder = dbStore.createOrder({
    id: authoritativeOrderId,
    orderNumber: authoritativeOrderNumber,
    email: req.email || "",
    currency,
    subtotal: calculation.subtotal,
    shippingAmount: calculation.shippingAmount,
    discountAmount: calculation.discountAmount,
    taxAmount: calculation.taxAmount,
    totalAmount: calculation.totalAmount,
    paymentStatus: "pending",
    orderStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    shippingAddress: req.shippingAddress,
    idempotencyKey: req.idempotencyKey,
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

  // 5. Initialize Payment Record with status 'created' linked to authoritative UUID
  const savedPayment = dbStore.createPayment({
    orderId: authoritativeOrderId,
    provider: getPaymentProvider().name,
    amount: calculation.totalAmount,
    currency,
    status: "created",
    email: req.email || null,
    contact: req.shippingAddress.phone,
    refundStatus: "none",
    refundAmount: 0,
    metadata: {
      orderNumber: authoritativeOrderNumber,
      shippingCity: req.shippingAddress.city,
    },
  });

  // 6. Create Payment Order with Provider (Cashfree / Razorpay / Mock)
  const provider = getPaymentProvider();
  const paymentOrderParams: CreatePaymentOrderParams = {
    orderId: authoritativeOrderId,
    orderNumber: authoritativeOrderNumber,
    amount: calculation.totalAmount,
    currency,
    customerEmail: req.email || undefined,
    customerName: req.shippingAddress.fullName,
    customerPhone: req.shippingAddress.phone,
    notes: {
      orderId: authoritativeOrderId,
      orderNumber: authoritativeOrderNumber,
    },
  };

  const providerResult = await provider.createPaymentOrder(paymentOrderParams);
  if (!providerResult.success || !providerResult.providerOrderId) {
    throw new PaymentValidationError(
      providerResult.errorMessage || "Failed to initiate payment gateway transaction."
    );
  }

  // 7. Update Payment Record with Provider Order ID and status 'pending'
  dbStore.updatePayment(savedPayment.id, {
    providerOrderId: providerResult.providerOrderId,
    status: "pending",
    metadata: {
      ...savedPayment.metadata,
      paymentSessionId: providerResult.paymentSessionId,
    },
  });

  // 8. Persist order & payment into Supabase with authoritative UUID if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data: dbOrderRow, error: orderErr } = await supabase
        .from("orders")
        .insert({
          id: authoritativeOrderId,
          order_number: authoritativeOrderNumber,
          customer_id: req.customerId || null,
          email: req.email || null,
          phone: req.shippingAddress.phone || null,
          customer_name: req.shippingAddress.fullName || null,
          currency,
          subtotal: calculation.subtotal,
          shipping_amount: calculation.shippingAmount,
          discount_amount: calculation.discountAmount,
          tax_amount: calculation.taxAmount,
          total_amount: calculation.totalAmount,
          payment_status: "pending",
          order_status: "pending",
          fulfillment_status: "unfulfilled",
          idempotency_key: req.idempotencyKey || null,
          shipping_address: req.shippingAddress,
          notes: req.notes || null,
        })
        .select()
        .single();

      if (!orderErr && dbOrderRow) {
        // Insert order items referencing authoritative UUID
        await supabase.from("order_items").insert(
          authoritativeItems.map((item) => ({
            order_id: authoritativeOrderId,
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

        // Insert payment record referencing authoritative UUID
        await supabase.from("payments").insert({
          order_id: authoritativeOrderId,
          provider: provider.name,
          provider_order_id: providerResult.providerOrderId,
          amount: calculation.totalAmount,
          currency,
          status: "pending",
          email: req.email || null,
          contact: req.shippingAddress.phone,
          refund_status: "none",
          refund_amount: 0.00,
          metadata: {
            paymentSessionId: providerResult.paymentSessionId,
          },
        });
      }
    } catch (dbErr) {
      console.warn("[Payments] Supabase persistence fallback:", dbErr);
    }
  }

  // 9. Return Safe Checkout Configuration (Authoritative UUID is consistent everywhere)
  return {
    success: true,
    orderId: authoritativeOrderId,
    orderNumber: authoritativeOrderNumber,
    paymentId: savedPayment.id,
    checkout: {
      keyId: providerResult.keyId || process.env.CASHFREE_APP_ID || process.env.RAZORPAY_KEY_ID || "mock_key_test_id",
      appId: providerResult.keyId || process.env.CASHFREE_APP_ID,
      paymentSessionId: providerResult.paymentSessionId,
      orderId: authoritativeOrderId,
      orderNumber: authoritativeOrderNumber,
      provider: provider.name,
      providerOrderId: providerResult.providerOrderId,
      mode: getPaymentMode(),
      amount: calculation.totalAmount,
      amountMinor: providerResult.amountMinor,
      currency,
      customer: {
        name: req.shippingAddress.fullName,
        email: req.email,
        contact: req.shippingAddress.phone,
      },
    },
  };
}

/**
 * Retrieves payment record by order ID.
 */
export async function getPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          orderId: data.order_id,
          provider: data.provider,
          providerOrderId: data.provider_order_id,
          providerPaymentId: data.provider_payment_id,
          providerSignature: data.provider_signature,
          amount: Number(data.amount),
          currency: data.currency,
          status: data.status as PaymentStatus,
          method: data.method,
          email: data.email,
          contact: data.contact,
          failureCode: data.failure_code,
          failureReason: data.failure_reason,
          refundStatus: data.refund_status || "none",
          refundAmount: Number(data.refund_amount || 0),
          paidAt: data.paid_at,
          capturedAt: data.captured_at,
          metadata: data.metadata,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {
      // Fallback
    }
  }

  const p = dbStore.getPaymentByOrderId(orderId);
  if (!p) return null;
  return {
    id: p.id,
    orderId: p.orderId,
    provider: p.provider,
    providerOrderId: p.providerOrderId,
    providerPaymentId: p.providerPaymentId,
    providerSignature: p.providerSignature,
    amount: p.amount,
    currency: p.currency,
    status: p.status as PaymentStatus,
    method: p.method,
    email: p.email,
    contact: p.contact,
    failureCode: p.failureCode,
    failureReason: p.failureReason,
    refundStatus: p.refundStatus as any,
    refundAmount: p.refundAmount,
    paidAt: p.paidAt,
    capturedAt: p.capturedAt,
    metadata: p.metadata,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
