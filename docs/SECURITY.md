# Security Hardening & Threat Mitigation Architecture

**Platform**: MYCHOICE.in  
**Security Posture**: Zero-Trust Layered E-Commerce Architecture

---

## 1. Threat Mitigation Matrix

| Potential Vulnerability / Attack Vector | Mitigation Architecture in MYCHOICE.in |
| :--- | :--- |
| **Client-Side Price Tampering** | Orders are strictly evaluated against authoritative database prices on the server. The client never passes trusted monetary values. |
| **Payment Signature Forgery** | Cryptographic verification via HMAC-SHA256 with constant-time buffer comparison (`crypto.timingSafeEqual`) on both browser callbacks and raw webhook bodies. |
| **Duplicate Payment Orders / Double-Click** | Server-side idempotency keys enforce deduplication. Duplicate requests return existing order details without initiating multiple gateway charges. |
| **Webhook Replay Attacks** | `payment_webhook_events` ledger enforces unique `(provider, event_id)` constraints. Duplicate events return HTTP 200 without duplicate execution. |
| **Inventory Overselling / Race Conditions** | Variant stock counts are atomically checked and decremented. Requests exceeding available stock are rejected before charging whenever possible. |
| **Credential / Secret Leakage** | `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `CJ_CLIENT_SECRET` reside exclusively in server runtime and are never bundled into client JS. |
| **Insecure Direct Object Reference (IDOR)** | Row Level Security (RLS) ensures customers can only query their own profiles, orders, and addresses. Server checks verify ownership in `/order/success/[orderId]` and `/account/orders/[id]`. |
| **Internal Cost & Margin Leakage** | All customer-facing product endpoints sanitize variant data using `sanitizeCustomerProduct()`, stripping `costPrice` and supplier shipping costs before returning payloads. |
| **Coupon Manipulation / Expiration Abuse** | All coupon validations (expiry, active flag, min order amount, max discount, customer usage) execute server-side in `lib/coupons/`. |
| **SQL Injection & Malformed Payloads** | Parameterized queries via Supabase client and strict Zod runtime schema validation on all API endpoints. |
| **Administrative Privilege Escalation** | Admin routes and APIs enforce role verification against `profiles.role = 'admin'` via database security definer functions and server checks. |
| **Refund Fraud / Excessive Refunds** | Refund endpoint checks that requested refund <= captured amount minus prior refunds. Only authorized administrators can issue refunds. |
| **Denial of Service / Brute Force** | Rate limiting protects checkout creation, payment verification, admin refunds, and webhook receiver routes. |
| **Observability & Secret Redaction** | Structured logging automatically redacts card numbers, passwords, bearer tokens, and API secrets. |

---

## 2. Secrets Management & Environment Hygiene

- **Rule**: Never commit `.env` or `.env.local` files to Git.
- **Rule**: All sensitive server tokens (`RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `CJ_CLIENT_SECRET`, `EMAIL_PROVIDER_API_KEY`) must be injected exclusively via runtime environment variables.
- **Rule**: `.env.example` must contain only variable names and placeholder values.
- **Rule**: Never disable RLS to resolve frontend layout or data issues.
- **Rule**: Secrets must never be logged or output in error responses.

---

## 3. Production Security Headers & CSP

Implemented in `next.config.mjs`:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy`: Strictly allows trusted scripts, frames, and connect endpoints for Razorpay, Supabase, and CJ Dropshipping while forbidding inline eval in production.
