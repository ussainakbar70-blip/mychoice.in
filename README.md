# MYCHOICE.in — Premium Custom Dropshipping Storefront & CJdropshipping Fulfillment Engine

> **A custom-built, production-grade ecommerce brand engineered from scratch.**  
> Completely independent of WordPress, WooCommerce, and Shopify. Directly integrated with official **CJdropshipping Open API v2.0** and backed by **Supabase PostgreSQL**.

---

## 💎 Brand Vision & Design Philosophy

**MYCHOICE.in** is designed to look, feel, and function like an international luxury direct-to-consumer brand ($100M+ startup tier). It rejects deceptive countdown timers, fake scarcity badges, and chaotic AliExpress-style layouts. Instead, it prioritizes:
- **Architectural Minimalism**: Deep obsidian and alabaster neutrals with champagne gold accents.
- **Curated Intentionality**: 8 focused collections with high-resolution editorial presentation.
- **Financial & Operational Security**: Authoritative server pricing, double-submit idempotency tokens, and zero client-side secret exposure.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Storefront & Backend** | Next.js 15 (App Router, Server Actions, API Routes), React 19, TypeScript |
| **Styling & Design System** | Tailwind CSS, Lucide Icons, Custom Vector SVG Brand Mark |
| **Database & Auth** | Supabase PostgreSQL 15+ (26 Relational Tables, Foreign Keys, Indexes, RLS) |
| **Fulfillment Engine** | CJdropshipping Open API v2.0 (`lib/cj/`) with Token Auto-Refresh & HMAC Webhooks |
| **Validation & Testing** | Zod (Runtime Schema Validation), Vitest (Automated Unit & Integration Tests) |
| **Multi-Currency** | Localized formatting across **USD**, **INR**, **EUR**, **GBP**, and **AED** |

---

## 📁 Repository Structure

```
├── app/                          # Next.js 15 App Router
│   ├── (storefront)/             # Customer browsing pages
│   │   ├── page.tsx              # Luxury editorial homepage (Hero, 8 collections, Best Sellers)
│   │   ├── shop/                 # Master catalog with interactive filters & sorting
│   │   ├── category/[slug]/      # Dedicated category landing pages
│   │   ├── product/[slug]/       # Product detail page (Gallery, variants, specs, reviews)
│   │   ├── cart/                 # Shopping bag with coupon code & threshold progress
│   │   ├── checkout/             # High-conversion checkout with address autofill
│   │   ├── order/success/        # Order receipt & confirmation page
│   │   ├── track-order/          # Live courier milestone tracking timeline
│   │   ├── account/              # Customer account & order history portal
│   │   ├── about/                # Brand manifesto & design philosophy
│   │   ├── shipping/             # International shipping & courier policy
│   │   ├── returns/              # 30-day effortless returns policy
│   │   ├── privacy/ & terms/     # Legal terms & compliance policies
│   │   └── contact/              # Client concierge contact form
│   ├── admin/                    # Secure Admin Management Portal
│   │   ├── page.tsx              # Operations dashboard (Revenue, orders, CJ telemetry)
│   │   ├── products/             # Product manager + Unit Economics Profit Calculator
│   │   ├── cj/products/          # CJdropshipping catalog explorer & draft importer
│   │   ├── orders/               # Order pipeline manager & fulfillment dispatcher
│   │   ├── integrations/cj/      # Real-time CJ API v2 health & diagnostics
│   │   └── settings/             # Store configuration & infrastructure health matrix
│   ├── api/                      # Serverless API routes
│   │   ├── checkout/route.ts     # Authoritative server pricing & idempotency guard
│   │   ├── orders/route.ts       # Order status & milestone checkpoints
│   │   └── webhooks/cj/route.ts  # HMAC-SHA256 authenticated webhook listener
├── components/                   # Modular UI components
│   ├── ui/                       # Logo, Button, Badge, Modal primitives
│   ├── layout/                   # Header, AnnouncementBar, Navbar, Footer, MobileMenu
│   ├── product/                  # ProductCard, ProductDetailView, CatalogView
│   ├── cart/                     # Slide-over mini-cart drawer
│   └── search/                   # Instant search modal with keyboard navigation
├── lib/                          # Core business logic & integrations
│   ├── cj/                       # Dedicated CJdropshipping API v2 client & mock adapter
│   ├── currency/                 # Multi-currency conversions & localized formatters
│   ├── pricing/                  # Authoritative pricing & admin profit calculator
│   ├── payments/                 # PaymentProvider interface & development sandbox adapter
│   ├── validation/               # Zod runtime schemas
│   ├── config/                   # Site settings & threshold parameters
│   └── db/                       # Supabase client & in-memory local data store
├── supabase/                     # PostgreSQL Migrations & Seed Data
│   ├── migrations/               # 20260926000001_initial_schema.sql, 20260926000002_rls.sql
│   └── seed.sql                  # 8 store categories, 24 demo products, coupons, settings
├── tests/                        # Vitest automated test suite
└── docs/                         # Comprehensive architectural & operational manuals
```

---

## 🚀 Quick Start (Development Mode)

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd lively-lavoisier
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(The system runs out of the box in zero-config development mode using high-fidelity mock adapters for CJ API and local databases).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

```bash
# Run Vitest automated unit and integration tests
npm test

# Run TypeScript strict type verification
npm run typecheck

# Run production build
npm run build
```

---

## 📦 Supabase Setup

When connecting your live Supabase project:
1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL scripts in the Supabase SQL editor:
   - `supabase/migrations/20260926000001_initial_schema.sql` (Creates 26 tables)
   - `supabase/migrations/20260926000002_rls_and_security.sql` (Enables Row Level Security)
   - `supabase/seed.sql` (Seeds 8 collections and initial site settings)
3. Copy your project URL, anon key, and service role key into `.env.local`.

---

## 🌐 Custom .IN Domain Deployment

Detailed step-by-step setup guides are located in:
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DATABASE.md](docs/DATABASE.md)
- [docs/CJ-INTEGRATION.md](docs/CJ-INTEGRATION.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/SECURITY.md](docs/SECURITY.md)

---

## 🛡️ License
Private and proprietary. Designed and engineered for **MYCHOICE.in**.
