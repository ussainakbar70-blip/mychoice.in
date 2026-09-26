# Production Deployment & Custom .IN Domain Setup

**Target URL**: `https://mychoice.in` and `https://www.mychoice.in`  
**Infrastructure Stack**: Vercel (Frontend & Serverless API) + Supabase (PostgreSQL & Auth). Both operate on generous free-tier quotas.

---

## 1. Free-Tier Infrastructure Provisioning

### A. Supabase Database & Auth Setup
1. Create a free account at [supabase.com](https://supabase.com).
2. Create a new project (e.g., `mychoice-store`).
3. Under **SQL Editor**, execute the migration files sequentially:
   - `supabase/migrations/20260926000001_initial_schema.sql`
   - `supabase/migrations/20260926000002_rls_and_security.sql`
   - `supabase/seed.sql`
4. Retrieve your credentials from **Project Settings > API**:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret key` -> `SUPABASE_SERVICE_ROLE_KEY`

### B. Vercel Hosting Setup
1. Connect your GitHub repository to [vercel.com](https://vercel.com).
2. Configure Environment Variables in the Vercel Dashboard matching `.env.example`:
   ```env
   NEXT_PUBLIC_SITE_URL=https://mychoice.in
   NEXT_PUBLIC_SUPABASE_URL=https://<your-id>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
   CJ_API_KEY=...
   CJ_WEBHOOK_SECRET=...
   SITE_INDEXING_ENABLED=true
   ```
3. Deploy!

---

## 2. Custom .IN Domain DNS Configuration

1. In your domain registrar (GoDaddy, Namecheap, Hostinger, BigRock):
2. Add the following DNS records for `mychoice.in`:
   - **Apex Record (Root)**:
     - Type: `A`
     - Name: `@`
     - Value: `76.76.21.21` (Vercel IP)
   - **Subdomain Record (WWW)**:
     - Type: `CNAME`
     - Name: `www`
     - Value: `cname.vercel-dns.com`
3. In Vercel Project Settings > Domains:
   - Add `mychoice.in`
   - Add `www.mychoice.in`
   - Set `mychoice.in` as Canonical, and configure redirect from `www.mychoice.in` to `mychoice.in`.
4. Vercel automatically provisions and renews free SSL certificates (Let's Encrypt).
