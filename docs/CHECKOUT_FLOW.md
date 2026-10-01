# Checkout & Payment Master Architecture — MYCHOICE.in

## End-to-End Flow Pipeline

```
CUSTOMER
   ↓
PRODUCT SELECTION
   ↓
CART (Guest or Authenticated)
   ↓
CHECKOUT PAGE (/checkout)
   ↓
SERVER-SIDE ORDER VALIDATION (POST /api/payments/create-order)
   ├── Validate Schema with Zod
   ├── Reload Authoritative Product & Variant Catalog Prices
   ├── Check Variant Active Status & Inventory Race Conditions
   ├── Validate Coupon Code & Calculate Server Discount
   ├── Calculate Shipping & Tax
   ├── Idempotency Check (Prevent duplicate charges)
   ├── Create Local Order (payment_status: 'pending')
   └── Create Razorpay Order (POST https://api.razorpay.com/v1/orders)
   ↓
SAFE CLIENT PAYLOAD (key_id, razorpay_order_id, amountMinor, customer)
   ↓
CUSTOMER PAYS VIA RAZORPAY MODAL (UPI, Cards, NetBanking, Wallets)
   ↓
SERVER-SIDE PAYMENT VERIFICATION (Dual-Channel Confirmation)
   ├── Channel A: Browser Callback (POST /api/payments/verify)
   │     ├── Cryptographic Signature Verification (HMAC-SHA256 constant-time)
   │     ├── Server-Side Gateway Lookup (GET /v1/payments/{id})
   │     ├── Amount & Currency Verification
   │     └── Local Payment = CAPTURED, Order = PAID
   │
   └── Channel B: Async Webhook (POST /api/webhooks/razorpay)
         ├── Raw Request Body HMAC-SHA256 Verification
         ├── Idempotency Ledger Check (payment_webhook_events)
         └── Ensures payment confirmation even if browser tab closes
   ↓
CJ DROPSHIPPING FULFILLMENT TRIGGER (fulfillLocalOrder)
   ├── Order is Verified PAID
   ├── PayType: 3 (CJ balance NOT auto-deducted blindly)
   ├── Dispatch Order to CJ Open API v2.0
   └── Store CJ Order ID in Database
   ↓
CJ SHIPMENT & LOGISTICS TRACKING
   ├── Tracking Number Received via CJ Webhook / Polling
   ├── Email Notification Dispatched to Customer
   └── Customer Tracks Package (/track-order)
```

---

## 2. Failure Matrix & Resiliency Handling

| Case | Scenario | Architecture Behavior |
| :--- | :--- | :--- |
| **Case 1** | Customer closes browser during payment popup | Webhook receiver (`/api/webhooks/razorpay`) or admin reconciliation catches the payment and marks order as paid. |
| **Case 2** | Browser sends success but signature is invalid | Cryptographic verification rejects the payload. Order remains in `pending`. Payment is NOT marked captured. |
| **Case 3** | Payment succeeds but webhook is delayed | Synchronous browser verification confirms payment immediately. When webhook arrives later, idempotency ledger skips duplicate execution. |
| **Case 4** | Webhook arrives multiple times | Deduplication via unique `(provider, event_id)` constraint in `payment_webhook_events` returns HTTP 200 without duplicate fulfillment. |
| **Case 5** | Customer clicks "Pay" repeatedly | Client idempotency token ensures subsequent requests return the existing pending payment order. |
| **Case 6** | Payment succeeds but CJ inventory is out of stock | Payment remains **PAID**. Local order fulfillment status is marked **`manual_review`**. Admin is alerted. Customer is NOT told payment failed. |
| **Case 7** | CJ API is temporarily down | Order remains PAID. CJ fulfillment attempts are logged and retried via sync job. |
| **Case 8** | Refund webhook arrives twice | Processed once; duplicate refund accounting is blocked. |
| **Case 9** | Customer attempts to refund another customer's order | Unauthorized requests return 403 / 404. Customer accounts cannot access the refund API. |
| **Case 10** | Client tampers with product price or totals | Server recalculates authoritative totals directly from database catalog and rejects mismatched requests. |
