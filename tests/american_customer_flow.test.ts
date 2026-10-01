import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { dbStore } from "@/lib/db/client";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";
import { createCheckoutPaymentOrder } from "@/lib/payments/orders";
import { processCashfreeWebhook } from "@/lib/payments/webhooks";
import { fulfillLocalOrder, syncOrderTracking } from "@/lib/cj/orders";
import { cjWebhookDispatcher, verifyCJWebhookSignature } from "@/lib/cj/webhooks";
import { setPaymentProviderForTesting } from "@/lib/payments/provider";
import { MockPaymentProvider } from "@/lib/payments/mock";
import { CashfreePaymentProvider } from "@/lib/payments/cashfree";

describe("End-to-End Flow: American Customer $29.99 -> Cashfree -> MyChoice -> CJ Dropshipping -> Customer Update", () => {
  const mockProvider = new MockPaymentProvider();
  const cjSecret = "test_cj_webhook_secret_key_123";

  beforeEach(() => {
    mockProvider.reset();
    setPaymentProviderForTesting(mockProvider);
  });

  it("executes the entire flow seamlessly from $29.99 payment to CJ tracking customer update", async () => {
    // -------------------------------------------------------------
    // Step 1: American Customer orders $29.99 item with US shipping address
    // -------------------------------------------------------------
    const sampleProduct = DEMO_PRODUCTS[0];
    const sampleVariant = sampleProduct.variants[0];

    const americanShippingAddress = {
      fullName: "Sarah Jenkins",
      phone: "+1 415-555-2671",
      addressLine1: "500 Howard Street",
      addressLine2: "Suite 350",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      country: "United States",
      countryCode: "US",
    };

    const checkoutReq = {
      email: "sarah.jenkins@example.com",
      currency: "USD",
      shippingAddress: americanShippingAddress,
      items: [
        {
          productId: sampleProduct.id,
          variantId: sampleVariant.id,
          quantity: 1,
        },
      ],
      idempotencyKey: `idem_us_${Date.now()}`,
    };

    const checkoutResult = await createCheckoutPaymentOrder(checkoutReq);
    expect(checkoutResult.success).toBe(true);
    expect(checkoutResult.orderId).toBeDefined();
    expect(checkoutResult.orderNumber).toBeDefined();

    // Verify order initial state in MyChoice
    const orderId = checkoutResult.orderId;
    const orderNumber = checkoutResult.orderNumber;
    let localOrder = dbStore.getOrder(orderId);
    expect(localOrder).toBeDefined();
    expect(localOrder?.currency).toBe("USD");
    expect(localOrder?.paymentStatus).toBe("pending");
    expect(localOrder?.orderStatus).toBe("pending");
    expect(localOrder?.fulfillmentStatus).toBe("unfulfilled");
    expect(localOrder?.shippingAddress.countryCode).toBe("US");
    expect(localOrder?.shippingAddress.country).toBe("United States");

    // -------------------------------------------------------------
    // Step 2 & 3: Cashfree confirms payment -> MyChoice marks order PAID
    // -------------------------------------------------------------
    const cashfreeProviderOrderId = checkoutResult.checkout.providerOrderId;
    const cfPaymentId = `cf_pay_${Date.now()}`;
    const webhookTimestamp = Date.now().toString();
    const webhookSecret = process.env.CASHFREE_SECRET_KEY || "cfsk_ma_test_local_secret";

    const cashfreePayloadObj = {
      type: "PAYMENT_SUCCESS_WEBHOOK",
      event_time: new Date().toISOString(),
      data: {
        order: {
          order_id: cashfreeProviderOrderId,
          order_amount: checkoutResult.checkout.amount,
          order_currency: "USD",
        },
        payment: {
          cf_payment_id: cfPaymentId,
          payment_status: "SUCCESS",
          payment_amount: checkoutResult.checkout.amount,
          payment_currency: "USD",
          payment_message: "Transaction Successful",
          bank_reference: "BANK_REF_9988",
        },
      },
    };

    const rawCashfreePayload = JSON.stringify(cashfreePayloadObj);
    const signatureToSign = `${webhookTimestamp}${rawCashfreePayload}`;
    const cashfreeSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signatureToSign)
      .digest("base64");

    // Configure Cashfree provider for webhook verification
    const cfProvider = new CashfreePaymentProvider({
      appId: "TEST_CF_APP_ID",
      secretKey: webhookSecret,
      webhookSecret,
    });
    setPaymentProviderForTesting(cfProvider);

    const webhookResult = await processCashfreeWebhook({
      rawBody: rawCashfreePayload,
      signatureHeader: cashfreeSignature,
      timestampHeader: webhookTimestamp,
    });

    expect(webhookResult.success).toBe(true);

    // Verify MyChoice marked the order as PAID
    localOrder = dbStore.getOrder(orderId);
    expect(localOrder?.paymentStatus).toBe("paid");
    expect(localOrder?.orderStatus).toBe("confirmed");

    const paymentRecord = dbStore.getPaymentByOrderId(orderId);
    expect(paymentRecord?.status).toBe("captured");
    expect(paymentRecord?.paidAt).toBeDefined();

    // -------------------------------------------------------------
    // Step 4: MyChoice creates CJ Dropshipping order
    // (FulfillLocalOrder is triggered on payment confirmation)
    // -------------------------------------------------------------
    const fulfillResult = await fulfillLocalOrder(orderId, { allowTestMode: true });
    expect(fulfillResult.success).toBe(true);
    expect(fulfillResult.cjOrderId).toBeDefined();
    expect(fulfillResult.status).toBe("submitted_to_cj");

    localOrder = dbStore.getOrder(orderId);
    expect(localOrder?.cjOrderId).toBe(fulfillResult.cjOrderId);
    expect(localOrder?.fulfillmentStatus).toBe("submitted_to_cj");

    // -------------------------------------------------------------
    // Step 5: CJ receives customer US shipping address
    // Verify address mapping preserved full American address details
    // -------------------------------------------------------------
    expect(localOrder?.shippingAddress.countryCode).toBe("US");
    expect(localOrder?.shippingAddress.country).toBe("United States");
    expect(localOrder?.shippingAddress.state).toBe("CA");
    expect(localOrder?.shippingAddress.city).toBe("San Francisco");
    expect(localOrder?.shippingAddress.addressLine1).toBe("500 Howard Street");
    expect(localOrder?.shippingAddress.addressLine2).toBe("Suite 350");
    expect(localOrder?.shippingAddress.postalCode).toBe("94105");
    expect(localOrder?.shippingAddress.phone).toBe("+1 415-555-2671");
    expect(localOrder?.shippingAddress.fullName).toBe("Sarah Jenkins");

    // -------------------------------------------------------------
    // Step 6 & 7: CJ fulfills order & CJ provides tracking
    // Simulate CJ shipping webhook arriving with tracking number
    // -------------------------------------------------------------
    const cjTrackingNumber = "CJTRK_US_99887766";
    const cjTrackingUrl = `https://www.17track.net/en/track?nums=${cjTrackingNumber}`;
    const cjLogisticsPayload = {
      messageType: "SHIPPING_TRACKING_UPDATE",
      messageId: `msg_cj_${Date.now()}`,
      sendTime: Date.now(),
      data: {
        orderNumber,
        trackingNumber: cjTrackingNumber,
        trackingUrl: cjTrackingUrl,
        logisticName: "CJ Packet Fast Line (USPS Express)",
      },
    };

    const cjWebhookResult = await cjWebhookDispatcher.processEvent(cjLogisticsPayload);
    expect(cjWebhookResult.handled).toBe(true);

    // -------------------------------------------------------------
    // Step 8: MyChoice updates customer
    // Verify order is marked shipped with tracking, and email notification recorded
    // -------------------------------------------------------------
    localOrder = dbStore.getOrder(orderId);
    expect(localOrder?.fulfillmentStatus).toBe("shipped");
    expect(localOrder?.trackingNumber).toBe(cjTrackingNumber);
    expect(localOrder?.trackingUrl).toBe(cjTrackingUrl);

    // Verify transactional shipping notification was dispatched to the American customer
    const trackingNotifKey = `track_${cjTrackingNumber}`;
    const hasNotification = dbStore.hasNotificationEvent(orderId, "order_shipped", trackingNotifKey);
    expect(hasNotification).toBe(true);

    // -------------------------------------------------------------
    // Step 9: Customer tracking query & synchronization
    // Verify syncOrderTracking reports synchronized state
    // -------------------------------------------------------------
    const syncRes = await syncOrderTracking(orderNumber);
    expect(syncRes.success).toBe(true);
    expect(syncRes.trackingNumber).toBeDefined();
    expect(syncRes.fulfillmentStatus).toBe("shipped");
  });
});
