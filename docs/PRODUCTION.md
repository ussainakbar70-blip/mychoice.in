# Production Deployment & Go-Live Readiness — MYCHOICE.in

## 1. System Requirements & Build Specifications

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Framework**: Next.js 15 (App Router with React 19)
- **Database**: Supabase PostgreSQL with RLS enabled
- **Gateway**: Razorpay v1 REST API (PCI-DSS Level 1)
- **Fulfillment**: CJdropshipping Open API v2.0
- **Domain**: `https://mychoice.in` (HTTPS strictly enforced)

---

## 2. Build & Quality Verification Commands

Before deploying to production, run the complete verification suite locally or in CI:

```bash
# 1. Install exact production dependencies
npm install

# 2. Strict TypeScript type check
npm run typecheck

# 3. Lint rules verification
npm run lint

# 4. Comprehensive test suite
npm test

# 5. Production bundle build
npm run build
```

---

## 3. Production Deployment Environment Variables

Configure these variables in your hosting environment (Hostinger Node.js Application Manager, Vercel, or custom VPS):

```bash
# Domain & Production URL
NEXT_PUBLIC_SITE_URL=https://mychoice.in
APP_BASE_URL=https://mychoice.in
SITE_INDEXING_ENABLED=true

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Primary Payment Gateway (Razorpay Live)
PAYMENT_PROVIDER=razorpay
PAYMENT_MODE=live
PAYMENT_CURRENCY=INR
RAZORPAY_KEY_ID=rzp_live_<your-live-key-id>
RAZORPAY_KEY_SECRET=<your-live-key-secret>
RAZORPAY_WEBHOOK_SECRET=<your-live-webhook-secret>

# Dropshipping (CJdropshipping Production)
CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
CJ_CLIENT_ID=<your-cj-client-id>
CJ_CLIENT_SECRET=<your-cj-client-secret>
CJ_ACCESS_TOKEN=<your-cj-access-token>
CJ_REFRESH_TOKEN=<your-cj-refresh-token>
CJ_OPEN_ID=<your-cj-open-id>
CJ_WEBHOOK_SECRET=<your-cj-webhook-secret>

# Email Delivery (Resend / SendGrid / Postmark)
EMAIL_PROVIDER=resend
EMAIL_PROVIDER_API_KEY=<your-email-api-key>
EMAIL_FROM="MYCHOICE.in <orders@mychoice.in>"
ADMIN_EMAIL=admin@mychoice.in
```

---

## 4. Hostinger Deployment Instructions

If deploying to Hostinger Cloud or VPS:
1. **Node.js Selector**:
   - Application Root: `/home/username/public_html` (or subdomain folder)
   - Application URL: `https://mychoice.in`
   - Node.js Version: `20.x` or `22.x`
   - Application Mode: `Production`
   - Application Startup File: `node_modules/next/dist/bin/next` (with argument `start`) or custom server script `npm start`.
2. **Reverse Proxy & SSL**:
   - Activate Let's Encrypt SSL in hPanel with "Force HTTPS" enabled.
   - Payments must NEVER operate over plain HTTP.
3. **Environment Variables**:
   - Input all keys from section 3 in the Node.js configuration panel.
4. **Database Migrations**:
   - Run Supabase migrations from local CLI: `npx supabase db push` or apply `supabase/migrations/*.sql` directly via the Supabase SQL editor.

---

## 5. Exact Checklist Before Accepting LIVE Payments

To transition safely from sandbox testing to live customer payments:

1. [ ] **KYC Verification**: Complete merchant KYC approval on Razorpay Dashboard.
2. [ ] **Switch to Live Keys**: Replace `rzp_test_...` with `rzp_live_...` in production environment settings.
3. [ ] **Configure Live Webhook**:
   - Add `https://mychoice.in/api/webhooks/razorpay` in the Razorpay Live Dashboard.
   - Set the secret in `RAZORPAY_WEBHOOK_SECRET`.
   - Subscribe to: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.created`, `refund.failed`.
4. [ ] **CJ Balance Verification**: Ensure your CJdropshipping account has sufficient funds or authorized credit if using auto-fulfillment. (Default `payType: 3` requires manual confirmation to prevent unwanted auto-deductions).
5. [ ] **DNS & HTTPS**: Verify `https://mychoice.in` resolves correctly and returns valid SSL certificates.
6. [ ] **Live Test Order**: Perform a single real ₹10 or low-denomination live order, verify that payment is captured, verify that CJ order is created, and perform a ₹10 test refund to verify the full loop.
