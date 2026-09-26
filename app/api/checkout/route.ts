import { NextRequest, NextResponse } from "next/server";
import { CheckoutRequestSchema } from "@/lib/validation/schemas";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";
import { calculateOrderTotals, AuthoritativeLineItem } from "@/lib/pricing/calculator";
import { getPaymentProvider } from "@/lib/payments";
import { dbStore } from "@/lib/db/client";
import { cjService } from "@/lib/cj";
import { emailService } from "@/lib/email";

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

    // 2. Check Idempotency Guard (prevent duplicate order creation on double-submit)
    const existingOrders = dbStore.getAllOrders();
    const duplicate = existingOrders.find((o) => o.idempotencyKey === idempotencyKey);
    if (duplicate) {
      return NextResponse.json({
        success: true,
        orderNumber: duplicate.orderNumber,
        orderId: duplicate.id,
        isIdempotentReplay: true,
        redirectUrl: `/order/success?order_number=${duplicate.orderNumber}`,
      });
    }

    // 3. Authoritative Product & Price Lookup from Database (Never trust client prices)
    const authoritativeItems: AuthoritativeLineItem[] = [];

    for (const clientItem of items) {
      const product = DEMO_PRODUCTS.find((p) => p.id === clientItem.productId);
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

      // Check Real Inventory Quantity
      if (variant.inventoryQuantity < clientItem.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${product.name} (${variant.option1Value || "Default"}). Only ${variant.inventoryQuantity} available.`,
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
        unitPrice: variant.price, // Authoritative price from catalog
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

    // 5. Payment Provider Processing
    const paymentProvider = getPaymentProvider();
    const paymentIntent = await paymentProvider.createPayment({
      orderId: `temp_${Date.now()}`,
      orderNumber: "PENDING",
      amount: calculation.totalAmount,
      currency: "USD",
      customerEmail: email,
      customerName: shippingAddress.fullName,
    });

    if (!paymentIntent.success || paymentIntent.status === "failed") {
      return NextResponse.json(
        { error: paymentIntent.errorMessage || "Payment authorization failed." },
        { status: 402 }
      );
    }

    // 6. Save Confirmed Order in Database
    const savedOrder = dbStore.createOrder({
      email,
      currency,
      subtotal: calculation.subtotal,
      shippingAmount: calculation.shippingAmount,
      discountAmount: calculation.discountAmount,
      taxAmount: calculation.taxAmount,
      totalAmount: calculation.totalAmount,
      paymentStatus: "paid",
      orderStatus: "confirmed",
      fulfillmentStatus: "pending_sync",
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

    // 7. Synchronize Order to CJ Dropshipping API v2
    try {
      const cjOrderProducts = authoritativeItems
        .filter((item) => item.cjVariantId)
        .map((item) => ({
          vid: item.cjVariantId!,
          quantity: item.quantity,
        }));

      if (cjOrderProducts.length > 0) {
        const cjResponse = await cjService.createOrder({
          orderNumber: savedOrder.orderNumber,
          shippingCountryCode: shippingAddress.countryCode,
          shippingCountry: shippingAddress.country,
          shippingProvince: shippingAddress.state,
          shippingCity: shippingAddress.city,
          shippingAddress: shippingAddress.addressLine1,
          shippingAddress2: shippingAddress.addressLine2,
          shippingCustomerName: shippingAddress.fullName,
          shippingZip: shippingAddress.postalCode,
          shippingPhone: shippingAddress.phone,
          payType: 3, // Order only, awaiting balance/payment
          products: cjOrderProducts,
          remark: notes,
        });

        if (cjResponse.code === 200 && cjResponse.data?.orderId) {
          dbStore.updateOrder(savedOrder.id, {
            cjOrderId: cjResponse.data.orderId,
            fulfillmentStatus: "awaiting_cj_payment",
          });
        }
      }
    } catch (cjErr) {
      // Order recovery principle: Do NOT lose customer order if CJ API has temporary network hiccup
      console.error("CJ Sync Error during checkout:", cjErr);
      // Keeps fulfillmentStatus = 'pending_sync' for background retry queue
    }

    // 8. Dispatch Order Confirmation Email
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

    return NextResponse.json({
      success: true,
      orderNumber: savedOrder.orderNumber,
      orderId: savedOrder.id,
      redirectUrl: `/order/success?order_number=${savedOrder.orderNumber}`,
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
