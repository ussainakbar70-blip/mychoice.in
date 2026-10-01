# Cashfree Payment Gateway Integration Guide — MYCHOICE.in

## Overview

MYCHOICE.in integrates **Cashfree Payments** as its primary production payment gateway subsystem (utilizing the official Cashfree PG API `2023-08-01`). The implementation maintains a clean Strategy pattern architecture that preserves provider abstraction, state machines, refund ledgers, webhook deduplication, and automated CJ Dropshipping order fulfillment.

```
Browser Checkout (Cashfree SDK v3)
      ↓
API Layer (/api/payments/create-order)
      ↓
Payment Service Abstraction (lib/payments/)
      ↓
Payment Provider (CashfreePaymentProvider)
      ↓
Cashfree PG REST API (v2023-08-01)
      ↓
Payment Session ID returned to Client Modal
      ↓
Customer Completes Payment in Modal
      ↓
Authoritative Verification & Webhook Ingestion (/api/webhooks/cashfree)
      ↓
CJ Dropshipping Fulfillment Sync & Customer Email
```

---

## 1. Environment Configuration

Add the following variables to `.env.local` for local development or within your production hosting environment (Hostinger VPS / Vercel):

```bash
# Gateway Selection & Mode
PAYMENT_PROVIDER=cashfree
PAYMENT_MODE=test              # 'test' for Sandbox, 'live' for Production
PAYMENT_CURRENCY=INR           # Indian Rupee (primary store currency)

# Cashfree API Credentials
# Obtained from: Cashfree Merchant Dashboard -> Developers -> API Keys
NEXT_PUBLIC_CASHFREE_APP_ID=TEST...   # Public App/Client ID for frontend SDK
CASHFREE_APP_ID=TEST...               # Server App ID
CASHFREE_SECRET_KEY=cfsk_ma_test_...  # Server Secret Key (NEVER expose to client!)
CASHFREE_WEBHOOK_SECRET=...           # Webhook Verification Secret (optional, defaults to CASHFREE_SECRET_KEY)
CASHFREE_API_VERSION=2023-08-01       # Cashfree PG API Version

# Base URL for Webhook Registration and Return URLs
APP_BASE_URL=https://mychoice.in
```

> [!CAUTION]
> **Security Rule**: `CASHFREE_SECRET_KEY` and `CASHFREE_WEBHOOK_SECRET` must **NEVER** be prefixed with `NEXT_PUBLIC_` or bundled in client-side code. They are strictly isolated in server-side modules (`lib/payments/config.ts`).

---

## 2. Test Mode vs. Live Mode

| Setting | Test (Sandbox) Mode | Live (Production) Mode |
| :--- | :--- | :--- |
| **`PAYMENT_MODE`** | `test` or `sandbox` | `live` or `production` |
| **Cashfree Endpoint** | `https://sandbox.cashfree.com/pg` | `https://api.cashfree.com/pg` |
| **SDK Mode** | `sandbox` | `production` |
| **App ID Format** | Starts with `TEST` | Production Client ID |
| **Real Financial Impact** | No (Simulated cards/UPI/Netbanking) | Yes (Real INR banking transactions) |
| **Testing Instruments** | Cashfree Simulator test credentials | Customer personal cards/UPI/Netbanking |

---

## 3. Webhook Configuration

### Endpoint URL
```
https://YOUR-DOMAIN.com/api/webhooks/cashfree
```

### Setup in Cashfree Dashboard:
1. Log in to the [Cashfree Merchant Dashboard](https://merchant.cashfree.com/merchants/login) (or Sandbox: `https://sandbox.cashfree.com`).
2. Navigate to **Payment Gateway** → **Developers** → **Webhooks**.
3. Click **Add Webhook Endpoint**.
4. Enter the Endpoint URL: `https://mychoice.in/api/webhooks/cashfree`.
5. Under **Event Types**, subscribe to:
   - `PAYMENT_SUCCESS_WEBHOOK`
   - `PAYMENT_FAILED_WEBHOOK`
   - `PAYMENT_USER_DROPPED_WEBHOOK`
   - `REFUND_STATUS_WEBHOOK`
6. Note the Webhook Secret (if configured separately) or ensure `CASHFREE_SECRET_KEY` matches the signing secret.
7. Save the endpoint and click **Test Webhook** to send a mock event.

---

## 4. Cryptographic Signature Verification

Cashfree authenticates webhooks via an HMAC-SHA256 signature calculated over the combined timestamp and raw request body, encoded in **Base64**:

```
signature = Base64(HMAC-SHA256(timestamp + rawBody, secretKey))
```

### Verification Flow:
1. The endpoint reads the raw unparsed string (`await req.text()`).
   > [!IMPORTANT]
   > Cashfree webhook verification **requires** the exact unparsed JSON string. Parsing it before verification alters whitespace and causes hash mismatches.
2. Extracts headers:
   - `x-webhook-timestamp`
   - `x-webhook-signature`
3. Concatenates `${timestamp}${rawBody}`.
4. Generates an HMAC-SHA256 digest with the secret key in Base64 format.
5. Performs a constant-time comparison (`crypto.timingSafeEqual`) to prevent timing attacks.

---

## 5. Webhook Idempotency & Event Processing

All incoming webhooks pass through our dedicated idempotency ledger:
1. **Deduplication**: Webhooks are recorded in `payment_webhook_events` with unique constraint `(provider, event_id)`.
2. **Replay Protection**: If an event has already been marked `processed = true`, the server returns `HTTP 200` with `{ isDuplicate: true }` without re-triggering inventory deductions or supplier orders.
3. **Downstream Automation**:
   - On `PAYMENT_SUCCESS_WEBHOOK`:
     - Updates payment status to `captured`.
     - Updates order payment status to `paid` and status to `confirmed`.
     - Automatically fires CJ Dropshipping bridge (`fulfillLocalOrder`).
     - Sends customer confirmation email (idempotently).
   - On `PAYMENT_FAILED_WEBHOOK`:
     - Updates payment status to `failed`.
     - Records failure reason.
   - On `REFUND_STATUS_WEBHOOK`:
     - Synchronizes refund status in `refunds` ledger.

---

## 6. Refunds & Partial Refunds

Refunds are triggered by store managers from the Admin Payment Dashboard:
- **Endpoint**: `POST /api/admin/payments/[id]/refund`
- **Cashfree API Call**: `POST /orders/{order_id}/refunds`
- **Validation**:
  - Payment must be in `captured` status.
  - `refund_amount <= (captured_amount - prior_refunds)`.
  - Amount must be > 0.
- **Ledger Recording**:
  - Creates a permanent entry in the `refunds` table.
  - Updates the payment `refund_status` (`partial` or `full`) and `refund_amount`.
  - Sends transactional refund notification to the customer.

---

## 7. Discrepancy Reconciliation

If a customer closes their browser before redirection or if webhook delivery experiences transient delays, administrators can execute real-time reconciliation:
- **Endpoint**: `POST /api/admin/payments/[id]/reconcile`
- **Action**: Queries Cashfree REST API `GET /orders/{order_id}` and `GET /orders/{order_id}/payments`.
- **Resolution**:
  - Compares gateway order status (`PAID`, `ACTIVE`, `EXPIRED`) with database status.
  - Applies safe unidirectional state transitions (e.g. `pending` → `captured`).
  - Automatically recovers missing dropshipping fulfillment tasks.

---

## 8. Sandbox Testing Checklist

When testing in Cashfree Sandbox mode:
1. Place an order on the storefront (`/shop` → `/cart` → `/checkout`).
2. The Cashfree Modal will open with sandbox credentials pre-filled.
3. Test successful card payment:
   - Card Number: `4012 0010 3714 1112`
   - Expiry: Any future date (e.g., `12/28`)
   - CVV: `123`
   - OTP: `123456` (or simulator auto-approve)
4. Verify that:
   - Order transitions to `paid` on `/checkout/success`.
   - Admin payment table (`/admin/payments`) displays the captured transaction.
   - Idempotent webhook logs appear in `payment_webhook_events`.
   - CJ dropshipping fulfillment engine dispatches the local order.
