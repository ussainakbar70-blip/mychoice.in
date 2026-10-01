# Razorpay Integration Guide — MYCHOICE.in

## Overview

MYCHOICE.in integrates **Razorpay** as its primary production payment gateway subsystem. The integration follows an isolated backend provider architecture:

```
Browser Checkout
      ↓
API Layer (/api/payments/create-order)
      ↓
Payment Service Abstraction (lib/payments/)
      ↓
Payment Provider (RazorpayPaymentProvider)
      ↓
Razorpay REST API v1
```

---

## 1. Environment Configuration

Add the following variables to `.env.local` (local dev) or the production environment (Hostinger / Vercel):

```bash
# Gateway Selection & Mode
PAYMENT_PROVIDER=razorpay
PAYMENT_MODE=test      # 'test' for Sandbox, 'live' for Production
PAYMENT_CURRENCY=INR   # Indian Rupee (primary store currency)

# Razorpay API Credentials
RAZORPAY_KEY_ID=rzp_test_...        # Public Key (Safe for client prefill)
RAZORPAY_KEY_SECRET=...             # Server-Only Secret (Never expose to client!)
RAZORPAY_WEBHOOK_SECRET=...         # Webhook Signing Secret

# Base URL for Webhook Registration
APP_BASE_URL=https://mychoice.in
```

> **Security Rule**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must **NEVER** be prefixed with `NEXT_PUBLIC_` or placed in client bundles.

---

## 2. Test Mode vs. Live Mode

| Setting | Test Mode | Live Mode |
| :--- | :--- | :--- |
| **`PAYMENT_MODE`** | `test` | `live` |
| **`RAZORPAY_KEY_ID`** | Starts with `rzp_test_` | Starts with `rzp_live_` |
| **Real Charges** | No (Simulated cards/UPI) | Yes (Real INR banking transactions) |
| **Test Cards** | Razorpay standard test cards | Customer personal cards/UPI |

---

## 3. Webhook Configuration

### Endpoint URL
```
https://YOUR-DOMAIN.com/api/webhooks/razorpay
```

### Setup in Razorpay Dashboard:
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Go to **Settings** → **Webhooks**.
3. Click **Add New Webhook**.
4. Enter your Webhook URL: `https://mychoice.in/api/webhooks/razorpay`.
5. Enter a strong secret into the **Secret** field and set it as `RAZORPAY_WEBHOOK_SECRET` in your environment.
6. Select the following **Active Events**:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `refund.processed`
   - `refund.created`
   - `refund.failed`
7. Save the webhook.

---

## 4. Cryptographic Signature Verification

All browser checkout responses and incoming webhooks are cryptographically verified using **HMAC-SHA256** with constant-time equality checks (`crypto.timingSafeEqual`):

- **Checkout Verification**:
  ```
  signature = HMAC-SHA256(provider_order_id + "|" + provider_payment_id, RAZORPAY_KEY_SECRET)
  ```
- **Webhook Verification**:
  ```
  signature = HMAC-SHA256(raw_request_body, RAZORPAY_WEBHOOK_SECRET)
  ```

---

## 5. Webhook Idempotency & Ledger

Webhooks are deduplicated using the PostgreSQL `payment_webhook_events` table with unique constraint `(provider, event_id)`. Replayed or duplicate webhook deliveries return `HTTP 200` immediately without duplicating fulfillment, inventory deductions, or refund accounting.

---

## 6. Refunds & Partial Refunds

Refunds are initiated by authorized store administrators:
- Endpoint: `POST /api/admin/payments/[id]/refund`
- Supports full and partial refunds.
- Validates:
  - Payment is in `captured` state.
  - `refund_amount <= (amount - prior_refunds)`.
  - Amount > 0.
- Automatically creates an entry in the `refunds` ledger, updates `payments`, and notifies the customer via transactional email.

---

## 7. Discrepancy Reconciliation

If an unexpected event occurs (e.g., customer closes browser before confirmation or a webhook is delayed), administrators can trigger one-click reconciliation:
- Endpoint: `POST /api/admin/payments/[id]/reconcile`
- Fetches real-time status from Razorpay REST API.
- Compares provider status with local database state.
- Applies verified unidirectional state transitions and triggers downstream CJ fulfillment if needed.
