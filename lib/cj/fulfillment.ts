import { getSupabaseServerClient, isSupabaseConfigured, dbStore } from "@/lib/db/client";
import { getPaymentByOrderId } from "@/lib/payments/orders";
import { logger } from "@/lib/security/logger";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";
import { cjHttpClient } from "./client";
import { cjMockProvider } from "./mock";
import { isCJConfigured } from "./index";
import {
  CJApiResponse,
  CJCreateOrderRequest,
  CJCreateOrderResult,
  CJCreateOrderProduct,
} from "./types";

export type FulfillmentEligibilityCode =
  | "ELIGIBLE"
  | "ORDER_NOT_FOUND"
  | "ORDER_CANCELLED"
  | "ORDER_REFUNDED"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_NOT_CAPTURED"
  | "PAYMENT_FAILED"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "PAYMENT_CURRENCY_MISMATCH"
  | "ALREADY_SUBMITTED"
  | "EMPTY_ITEMS"
  | "UNMAPPED_VARIANTS"
  | "INVALID_SHIPPING_ADDRESS";

export interface ValidatedCJShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

export interface FulfillmentEligibilityResult {
  eligible: boolean;
  code: FulfillmentEligibilityCode;
  message: string;
  order?: any;
  payment?: any;
  cjOrderId?: string;
  items?: CJCreateOrderProduct[];
  shippingAddress?: ValidatedCJShippingAddress;
  unmappedItems?: Array<{
    productId?: string;
    variantId?: string;
    sku?: string;
    productName?: string;
  }>;
}

export interface FulfillOrderResult {
  success: boolean;
  cjOrderId?: string;
  cjOrderNumber?: string;
  status: string;
  message: string;
  code?: string;
  requiresBalancePayment?: boolean;
}

export interface FulfillLocalOrderOptions {
  allowTestMode?: boolean;
  idempotencyKey?: string;
}

/**
 * Checks whether live CJ fulfillment is explicitly enabled.
 * Default is FALSE to guarantee zero accidental wallet/balance deduction in dev/test/sandbox.
 */
export function isLiveCJFulfillmentEnabled(): boolean {
  return (
    process.env.CJ_LIVE_FULFILLMENT_ENABLED === "true" &&
    process.env.CJ_MODE === "production" &&
    isCJConfigured()
  );
}

/**
 * Normalizes destination country into standard 2-letter ISO country code and full country name.
 */
export function normalizeCountry(countryInput?: string, countryCodeInput?: string): {
  countryCode: string;
  country: string;
} {
  let code = (countryCodeInput || "").trim().toUpperCase();
  const c = (countryInput || "").toLowerCase().trim();

  if (code.length === 2) {
    if (code === "US") return { countryCode: "US", country: "United States" };
    if (code === "IN") return { countryCode: "IN", country: "India" };
    if (code === "GB") return { countryCode: "GB", country: "United Kingdom" };
    if (code === "CA") return { countryCode: "CA", country: "Canada" };
    if (code === "AU") return { countryCode: "AU", country: "Australia" };
    if (code === "DE") return { countryCode: "DE", country: "Germany" };
    if (code === "FR") return { countryCode: "FR", country: "France" };
    if (code === "AE") return { countryCode: "AE", country: "United Arab Emirates" };
    return { countryCode: code, country: countryInput || code };
  }

  if (c.includes("united states") || c === "usa" || c === "us") {
    return { countryCode: "US", country: "United States" };
  }
  if (c.includes("india") || c === "in") {
    return { countryCode: "IN", country: "India" };
  }
  if (c.includes("united kingdom") || c === "uk" || c === "gb" || c.includes("great britain")) {
    return { countryCode: "GB", country: "United Kingdom" };
  }
  if (c.includes("canada") || c === "ca") {
    return { countryCode: "CA", country: "Canada" };
  }
  if (c.includes("australia") || c === "au") {
    return { countryCode: "AU", country: "Australia" };
  }
  if (c.includes("germany") || c === "de" || c.includes("deutschland")) {
    return { countryCode: "DE", country: "Germany" };
  }
  if (c.includes("france") || c === "fr") {
    return { countryCode: "FR", country: "France" };
  }
  if (c.includes("emirates") || c === "uae" || c === "ae") {
    return { countryCode: "AE", country: "United Arab Emirates" };
  }

  return {
    countryCode: code || (c.length === 2 ? c.toUpperCase() : "US"),
    country: countryInput || "United States",
  };
}

/**
 * Validates shipping address using authoritative orders.shipping_address JSONB data.
 * Checks all required fields (name, phone, addressLine1, city, state, postalCode, country).
 */
export function validateCJShippingAddress(rawAddr: any): {
  valid: boolean;
  address?: ValidatedCJShippingAddress;
  error?: string;
} {
  if (!rawAddr || typeof rawAddr !== "object") {
    return { valid: false, error: "Shipping address is completely missing or empty." };
  }

  const fullName = (rawAddr.fullName || rawAddr.name || rawAddr.customerName || "").trim();
  if (!fullName || fullName.length < 2) {
    return { valid: false, error: "Shipping address lacks a valid recipient name (minimum 2 characters)." };
  }

  const phone = (rawAddr.phone || rawAddr.contact || rawAddr.phoneNumber || "").trim();
  if (!phone || phone.length < 5) {
    return { valid: false, error: "Shipping address lacks a valid contact phone number." };
  }

  const addressLine1 = (
    rawAddr.addressLine1 ||
    rawAddr.address ||
    rawAddr.address_line_1 ||
    rawAddr.street ||
    ""
  ).trim();
  if (!addressLine1 || addressLine1.length < 3) {
    return { valid: false, error: "Shipping address lacks a valid street address." };
  }

  const addressLine2 = (rawAddr.addressLine2 || rawAddr.address_line_2 || "").trim();

  const city = (rawAddr.city || "").trim();
  if (!city || city.length < 2) {
    return { valid: false, error: "Shipping address lacks a valid city." };
  }

  const state = (rawAddr.state || rawAddr.province || rawAddr.region || "").trim();
  if (!state || state.length < 2) {
    return { valid: false, error: "Shipping address lacks a valid state or province." };
  }

  const postalCode = (
    rawAddr.postalCode ||
    rawAddr.zip ||
    rawAddr.postal_code ||
    rawAddr.zipCode ||
    ""
  ).trim();
  if (!postalCode || postalCode.length < 3) {
    return { valid: false, error: "Shipping address lacks a valid postal or zip code." };
  }

  const rawCountry = rawAddr.country || "";
  const rawCountryCode = rawAddr.countryCode || rawAddr.country_code || "";
  if (!rawCountry && !rawCountryCode) {
    return { valid: false, error: "Shipping address lacks a destination country." };
  }

  const { country, countryCode } = normalizeCountry(rawCountry, rawCountryCode);

  return {
    valid: true,
    address: {
      fullName,
      phone,
      addressLine1,
      addressLine2: addressLine2 || undefined,
      city,
      state,
      postalCode,
      country,
      countryCode,
    },
  };
}

/**
 * Resolves authoritative server-side CJ variant mappings for each order item.
 * NEVER creates fake VIDs. If any variant lacks mapping, reports unmapped items.
 */
export async function resolveOrderCJMappings(
  rawItems: any[],
  supabase?: any
): Promise<{
  valid: boolean;
  products: CJCreateOrderProduct[];
  unmappedItems: Array<{ productId?: string; variantId?: string; sku?: string; productName?: string }>;
  error?: string;
}> {
  if (!rawItems || rawItems.length === 0) {
    return {
      valid: false,
      products: [],
      unmappedItems: [],
      error: "Order contains no line items.",
    };
  }

  const products: CJCreateOrderProduct[] = [];
  const unmappedItems: Array<{ productId?: string; variantId?: string; sku?: string; productName?: string }> = [];

  for (const item of rawItems) {
    const variantId = item.variant_id || item.variantId;
    const productId = item.product_id || item.productId;
    const sku = item.sku;
    const productName = item.product_name || item.productName;
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);

    // 1. Direct item field mapping
    let vid: string | undefined = (item.cj_variant_id || item.cjVariantId || "").trim();

    // 2. Query Supabase product_variants external_variant_id
    if (!vid && variantId && supabase) {
      try {
        const { data: vData } = await supabase
          .from("product_variants")
          .select("external_variant_id")
          .eq("id", variantId)
          .single();
        if (vData?.external_variant_id) {
          vid = vData.external_variant_id.trim();
        }
      } catch {
        // Fallback to local check
      }
    }

    // 3. Query in-memory seed products
    if (!vid && variantId) {
      for (const p of DEMO_PRODUCTS) {
        const v = p.variants.find((cand) => cand.id === variantId);
        if (v?.cjVariantId) {
          vid = v.cjVariantId.trim();
          break;
        }
      }
    }

    // If still missing, item is unmapped. We do NOT invent fake VIDs!
    if (!vid) {
      unmappedItems.push({
        productId,
        variantId,
        sku,
        productName,
      });
    } else {
      products.push({
        vid,
        quantity,
      });
    }
  }

  if (unmappedItems.length > 0) {
    const itemNames = unmappedItems
      .map((i) => `"${i.productName || i.sku || i.variantId}"`)
      .join(", ");
    return {
      valid: false,
      products: [],
      unmappedItems,
      error: `Line items lack authoritative CJ Variant ID mapping: ${itemNames}`,
    };
  }

  return {
    valid: true,
    products,
    unmappedItems: [],
  };
}

/**
 * Strict Fulfillment Eligibility Gate.
 * 
 * Verifies:
 * 1. Order exists
 * 2. Order is not cancelled
 * 3. Order is not refunded
 * 4. Payment exists
 * 5. Payment is successfully captured/paid
 * 6. Payment is not refunded
 * 7. Payment amount matches order total
 * 8. Payment currency matches order currency
 * 9. Order has not already been submitted to CJ (Idempotency)
 * 10. Shipping address is complete & valid
 * 11. All order items have valid CJ variant mappings
 */
export async function canOrderBeFulfilled(orderId: string): Promise<FulfillmentEligibilityResult> {
  const isSupabase = isSupabaseConfigured();
  let order: any = null;
  let supabase: any = null;

  // 1. Fetch Authoritative Order Data
  if (isSupabase) {
    try {
      supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();

      if (!error && data) {
        order = data;
      }
    } catch {
      // Fallback to local store
    }
  }

  if (!order) {
    order = dbStore.getOrder(orderId);
  }

  if (!order) {
    return {
      eligible: false,
      code: "ORDER_NOT_FOUND",
      message: `Order "${orderId}" not found in database.`,
    };
  }

  // 2. Order Cancellation / Refund Check
  const orderStatus = (order.order_status || order.orderStatus || "").toLowerCase();
  if (orderStatus === "cancelled") {
    return {
      eligible: false,
      code: "ORDER_CANCELLED",
      message: `Order ${order.order_number || order.orderNumber} is cancelled. Fulfillment blocked.`,
      order,
    };
  }
  if (orderStatus === "refunded") {
    return {
      eligible: false,
      code: "ORDER_REFUNDED",
      message: `Order ${order.order_number || order.orderNumber} is refunded. Fulfillment blocked.`,
      order,
    };
  }

  // 3. Idempotency Check: check if already dispatched to CJ
  const existingCjId = order.cj_order_id || order.cjOrderId;
  if (existingCjId) {
    return {
      eligible: false,
      code: "ALREADY_SUBMITTED",
      cjOrderId: existingCjId,
      message: `Order was already dispatched to CJ (ID: ${existingCjId}). Duplicate prevented.`,
      order,
    };
  }

  // Also verify cj_order_sync table for existing successful sync record
  if (isSupabase && supabase) {
    try {
      const { data: syncRow } = await supabase
        .from("cj_order_sync")
        .select("cj_order_id, sync_status")
        .eq("order_id", orderId)
        .in("sync_status", [
          "submitted_awaiting_payment",
          "submitted",
          "synced",
          "cj_processing",
          "shipped",
          "delivered",
        ])
        .limit(1)
        .maybeSingle();

      if (syncRow?.cj_order_id) {
        return {
          eligible: false,
          code: "ALREADY_SUBMITTED",
          cjOrderId: syncRow.cj_order_id,
          message: `Order was already dispatched to CJ (ID: ${syncRow.cj_order_id}). Duplicate prevented.`,
          order,
        };
      }
    } catch {
      // Continue
    }
  } else {
    const localSync = dbStore.getCJOrderSync(orderId);
    if (
      localSync &&
      localSync.cjOrderId &&
      ["submitted_awaiting_payment", "submitted", "synced", "cj_processing", "shipped", "delivered"].includes(
        localSync.syncStatus
      )
    ) {
      return {
        eligible: false,
        code: "ALREADY_SUBMITTED",
        cjOrderId: localSync.cjOrderId,
        message: `Order was already dispatched to CJ (ID: ${localSync.cjOrderId}). Duplicate prevented.`,
        order,
      };
    }
  }

  // 4. Payment State Verification Gate
  const orderPaymentStatus = (order.payment_status || order.paymentStatus || "").toLowerCase();
  if (orderPaymentStatus !== "paid") {
    return {
      eligible: false,
      code: orderPaymentStatus === "failed" ? "PAYMENT_FAILED" : "PAYMENT_NOT_CAPTURED",
      message: `Order payment status is '${orderPaymentStatus || "unpaid"}'. Authoritative payment required before fulfillment.`,
      order,
    };
  }

  // Authoritative Payment Record Check
  const payment = await getPaymentByOrderId(orderId);
  if (!payment) {
    return {
      eligible: false,
      code: "PAYMENT_NOT_FOUND",
      message: "No authoritative payment record exists for this order.",
      order,
    };
  }

  if (payment.status !== "captured") {
    return {
      eligible: false,
      code: payment.status === "failed" ? "PAYMENT_FAILED" : "PAYMENT_NOT_CAPTURED",
      message: `Payment status is '${payment.status}'. Only captured payments are eligible for CJ fulfillment.`,
      order,
      payment,
    };
  }

  if (payment.refundStatus === "full" || (payment as any).refund_status === "full") {
    return {
      eligible: false,
      code: "ORDER_REFUNDED",
      message: "Payment has been fully refunded. Fulfillment blocked.",
      order,
      payment,
    };
  }

  // Amount & Currency Verification
  const orderTotal = Number(order.total_amount ?? order.totalAmount ?? 0);
  const paymentAmount = Number(payment.amount ?? 0);
  if (Math.abs(paymentAmount - orderTotal) > 0.01) {
    return {
      eligible: false,
      code: "PAYMENT_AMOUNT_MISMATCH",
      message: `Payment amount (${paymentAmount}) does not match order total (${orderTotal}).`,
      order,
      payment,
    };
  }

  const orderCurrency = (order.currency || "").toUpperCase();
  const paymentCurrency = (payment.currency || "").toUpperCase();
  if (orderCurrency && paymentCurrency && orderCurrency !== paymentCurrency) {
    return {
      eligible: false,
      code: "PAYMENT_CURRENCY_MISMATCH",
      message: `Payment currency (${paymentCurrency}) does not match order currency (${orderCurrency}).`,
      order,
      payment,
    };
  }

  // 5. Shipping Address Validation
  let rawAddr = order.shipping_address || order.shippingAddress;
  if (!rawAddr && order.notes) {
    if (typeof order.notes === "object" && order.notes.shippingAddress) {
      rawAddr = order.notes.shippingAddress;
    } else if (typeof order.notes === "string") {
      try {
        const parsed = JSON.parse(order.notes);
        rawAddr = parsed.shippingAddress;
      } catch {
        // ignore
      }
    }
  }

  const addressValidation = validateCJShippingAddress(rawAddr);
  if (!addressValidation.valid || !addressValidation.address) {
    return {
      eligible: false,
      code: "INVALID_SHIPPING_ADDRESS",
      message: addressValidation.error || "Shipping address validation failed.",
      order,
      payment,
    };
  }

  // 6. Product & Variant Mapping Validation
  const rawItems = order.order_items || order.items || [];
  const mappingResult = await resolveOrderCJMappings(rawItems, supabase);
  if (!mappingResult.valid || mappingResult.products.length === 0) {
    return {
      eligible: false,
      code: mappingResult.unmappedItems.length > 0 ? "UNMAPPED_VARIANTS" : "EMPTY_ITEMS",
      message: mappingResult.error || "Item mapping validation failed.",
      order,
      payment,
      unmappedItems: mappingResult.unmappedItems,
    };
  }

  return {
    eligible: true,
    code: "ELIGIBLE",
    message: "Order is verified and fully eligible for CJ Dropshipping fulfillment.",
    order,
    payment,
    items: mappingResult.products,
    shippingAddress: addressValidation.address,
  };
}

/**
 * Creates an order directly with CJdropshipping via official Open API v2.0.
 * Default payType is 3 (create order without immediate auto-deduction, awaiting balance or confirmation).
 * Endpoint: POST /v1/shopping/order/createOrderV2
 */
export async function createCJOrder(
  orderData: CJCreateOrderRequest
): Promise<CJApiResponse<CJCreateOrderResult>> {
  if (!isLiveCJFulfillmentEnabled()) {
    return await cjMockProvider.createOrder(orderData);
  }

  return await cjHttpClient.request<CJCreateOrderResult>("/v1/shopping/order/createOrderV2", {
    method: "POST",
    body: orderData,
  });
}

/**
 * Core Fulfillment Engine:
 * Validates eligibility through the payment gate, ensures strict idempotency,
 * maps shipping address and products to the official CJ Dropshipping API v2.0 payload,
 * dispatches the order safely, and updates database sync ledgers.
 */
export async function fulfillLocalOrder(
  orderId: string,
  options: FulfillLocalOrderOptions = {}
): Promise<FulfillOrderResult> {
  const isSupabase = isSupabaseConfigured();
  const supabase = isSupabase ? getSupabaseServerClient() : null;

  logger.info("CJ fulfillment evaluation started", { orderId });

  // 1. Strict Eligibility & Payment Gate Check
  const eligibility = await canOrderBeFulfilled(orderId);

  // If already submitted, return existing info idempotently without re-dispatching
  if (eligibility.code === "ALREADY_SUBMITTED") {
    logger.info("CJ fulfillment skipped - order already submitted", {
      orderId,
      cjOrderId: eligibility.cjOrderId,
    });
    return {
      success: true,
      cjOrderId: eligibility.cjOrderId,
      status: eligibility.order?.fulfillment_status || eligibility.order?.fulfillmentStatus || "submitted_to_cj",
      message: eligibility.message,
    };
  }

  // If order was blocked by the eligibility gate
  if (!eligibility.eligible) {
    logger.warn("CJ fulfillment blocked by gate", {
      orderId,
      code: eligibility.code,
      reason: eligibility.message,
    });

    const isPaid = (eligibility.order?.payment_status || eligibility.order?.paymentStatus) === "paid";
    const failReason = `Fulfillment blocked (${eligibility.code}): ${eligibility.message}`;

    // If order was paid but blocked by missing mappings or invalid address:
    // Mark as manual_review, preserve order, record actionable failure note
    if (isPaid && eligibility.order) {
      if (isSupabase && supabase) {
        await supabase
          .from("orders")
          .update({
            fulfillment_status: "manual_review",
            internal_notes: failReason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        await supabase.from("cj_order_sync").upsert(
          {
            order_id: orderId,
            sync_status: "manual_review",
            error_message: failReason,
            last_attempt_at: new Date().toISOString(),
          },
          { onConflict: "order_id" }
        );
      } else {
        dbStore.updateOrder(orderId, {
          fulfillmentStatus: "manual_review",
          internalNotes: failReason,
        });
        dbStore.upsertCJOrderSync({
          orderId,
          syncStatus: "manual_review",
          errorMessage: failReason,
        });
      }
    }

    return {
      success: false,
      code: eligibility.code,
      status: "manual_review",
      message: eligibility.message,
    };
  }

  const { order, items: cjProducts, shippingAddress: addr } = eligibility;
  const orderNumber = order.order_number || order.orderNumber;
  const idemKey = options.idempotencyKey || `cj_fulfill_${orderId}`;

  // 2. Prepare Official CJ Create Order Request Payload
  const cjPayload: CJCreateOrderRequest = {
    orderNumber,
    shippingCountryCode: addr!.countryCode,
    shippingCountry: addr!.country,
    shippingProvince: addr!.state,
    shippingCity: addr!.city,
    shippingAddress: addr!.addressLine1,
    shippingAddress2: addr!.addressLine2 || "",
    shippingCustomerName: addr!.fullName,
    shippingZip: addr!.postalCode,
    shippingPhone: addr!.phone,
    email: order.email || "mychoiceteam.com@gmail.com",
    remark: `MYCHOICE.in Order ${orderNumber}`,
    payType: 3, // Safe PayType 3: Order only, balance payment authorized later (Rule 20 & 32)
    products: cjProducts!,
  };

  // 3. Record Initial Fulfillment Attempt in Ledger
  if (isSupabase && supabase) {
    await supabase.from("cj_fulfillment_attempts").insert({
      order_id: orderId,
      attempt_type: "create_order",
      idempotency_key: idemKey,
      status: "pending",
      payload: cjPayload,
    }).catch(() => {});
  } else {
    dbStore.recordCJFulfillmentAttempt({
      orderId,
      attemptType: "create_order",
      idempotencyKey: idemKey,
      status: "pending",
      payload: cjPayload,
    });
  }

  // 4. Dispatch to CJ Dropshipping API
  try {
    const cjRes = await createCJOrder(cjPayload);

    if (cjRes.code === 200 && cjRes.data?.orderId) {
      const cjOrderId = cjRes.data.orderId;
      const cjOrderNumber = cjRes.data.cjOrderNumber || `CJ-${cjOrderId}`;

      logger.info("CJ fulfillment order successfully created", {
        orderId,
        orderNumber,
        cjOrderId,
        cjOrderNumber,
      });

      // Update Order and Sync Ledgers
      if (isSupabase && supabase) {
        await supabase
          .from("orders")
          .update({
            cj_order_id: cjOrderId,
            fulfillment_status: "submitted_to_cj",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        await supabase.from("cj_order_sync").upsert(
          {
            order_id: orderId,
            cj_order_id: cjOrderId,
            sync_status: "submitted_awaiting_payment",
            last_attempt_at: new Date().toISOString(),
          },
          { onConflict: "order_id" }
        );

        await supabase
          .from("cj_fulfillment_attempts")
          .update({
            cj_order_id: cjOrderId,
            cj_order_number: cjOrderNumber,
            status: "submitted",
            response: cjRes.data,
            updated_at: new Date().toISOString(),
          })
          .eq("idempotency_key", idemKey);
      } else {
        dbStore.updateOrder(orderId, {
          cjOrderId,
          fulfillmentStatus: "submitted_to_cj",
        });

        dbStore.upsertCJOrderSync({
          orderId,
          cjOrderId,
          syncStatus: "submitted_awaiting_payment",
        });

        dbStore.updateCJFulfillmentAttempt(idemKey, {
          cjOrderId,
          cjOrderNumber,
          status: "submitted",
          response: cjRes.data,
        });
      }

      return {
        success: true,
        cjOrderId,
        cjOrderNumber,
        status: "submitted_to_cj",
        requiresBalancePayment: true,
        message: `Order successfully created in CJ Dropshipping (ID: ${cjOrderId}). Ready for balance authorization.`,
      };
    } else {
      const errMsg = cjRes.message || "CJ Order creation rejected by supplier";

      logger.error("CJ fulfillment order rejected", {
        orderId,
        error: errMsg,
        code: cjRes.code,
      });

      if (isSupabase && supabase) {
        await supabase
          .from("orders")
          .update({
            fulfillment_status: "manual_review",
            internal_notes: `CJ Fulfillment Error: ${errMsg}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        await supabase.from("cj_order_sync").upsert(
          {
            order_id: orderId,
            sync_status: "failed",
            error_message: errMsg,
            last_attempt_at: new Date().toISOString(),
          },
          { onConflict: "order_id" }
        );

        await supabase
          .from("cj_fulfillment_attempts")
          .update({
            status: "failed",
            error_message: errMsg,
            response: cjRes,
            updated_at: new Date().toISOString(),
          })
          .eq("idempotency_key", idemKey);
      } else {
        dbStore.updateOrder(orderId, {
          fulfillmentStatus: "manual_review",
          internalNotes: `CJ Fulfillment Error: ${errMsg}`,
        });

        dbStore.upsertCJOrderSync({
          orderId,
          syncStatus: "failed",
          errorMessage: errMsg,
        });

        dbStore.updateCJFulfillmentAttempt(idemKey, {
          status: "failed",
          errorMessage: errMsg,
          response: cjRes,
        });
      }

      return {
        success: false,
        status: "manual_review",
        message: `CJ Fulfillment failed: ${errMsg}`,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Fulfillment network/API error";

    logger.error("CJ fulfillment unexpected exception", {
      orderId,
      error: errorMsg,
    });

    if (isSupabase && supabase) {
      await supabase
        .from("orders")
        .update({
          fulfillment_status: "manual_review",
          internal_notes: `CJ Exception: ${errorMsg}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      await supabase.from("cj_order_sync").upsert(
        {
          order_id: orderId,
          sync_status: "failed",
          error_message: errorMsg,
          last_attempt_at: new Date().toISOString(),
        },
        { onConflict: "order_id" }
      );

      await supabase
        .from("cj_fulfillment_attempts")
        .update({
          status: "failed",
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("idempotency_key", idemKey);
    } else {
      dbStore.updateOrder(orderId, {
        fulfillmentStatus: "manual_review",
        internalNotes: `CJ Exception: ${errorMsg}`,
      });

      dbStore.upsertCJOrderSync({
        orderId,
        syncStatus: "failed",
        errorMessage: errorMsg,
      });

      dbStore.updateCJFulfillmentAttempt(idemKey, {
        status: "failed",
        errorMessage: errorMsg,
      });
    }

    return {
      success: false,
      status: "manual_review",
      message: `Fulfillment exception: ${errorMsg}`,
    };
  }
}
