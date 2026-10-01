# MYCHOICE.in — Modern Full-Stack Ecommerce System & Admin Console

> **A custom-built, production-grade ecommerce platform engineered from scratch.**  
> Built with Next.js 15 App Router, React 19, Tailwind CSS, and Supabase PostgreSQL.

---

## 💎 Brand Vision & Design Philosophy

**MYCHOICE.in** is designed to look, feel, and function like an international luxury direct-to-consumer brand ($100M+ startup tier). It rejects deceptive countdown timers, fake scarcity badges, and chaotic AliExpress-style layouts. Instead, it prioritizes:
- **Architectural Minimalism**: Deep obsidian and alabaster neutrals with champagne gold accents.
- **Curated Intentionality**: 8 focused collections with high-resolution editorial presentation.
- **Financial & Operational Security**: Authoritative server pricing, double-submit idempotency tokens, and zero client-side secret exposure.
- **Data Integrity**: Supabase as the source of truth, authentic metrics without fake numbers, and real empty states.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Storefront & Backend** | Next.js 15 (App Router, Server Components, API Routes), React 19, TypeScript |
| **Styling & Design System** | Tailwind CSS, Lucide Icons, Custom Luxury Design System |
| **Database & Auth** | Supabase PostgreSQL 15+ (27 Relational Tables, Foreign Keys, Indexes, RLS) |
| **State & Business Logic** | Modular service layer (`lib/auth`, `lib/cart`, `lib/products`, `lib/orders`, `lib/coupons`, `lib/admin`) |
| **Validation & Testing** | Zod (Runtime Schema Validation), Vitest (Automated Unit & Integration Tests) |
| **Multi-Currency** | Localized formatting across **USD**, **INR**, **EUR**, **GBP**, and **AED** |

---

## 📁 Repository Structure

```
├── app/                          # Next.js 15 App Router
│   ├── page.tsx                  # Luxury editorial homepage (Hero, 8 collections, Best Sellers)
│   ├── shop/                     # Master catalog with interactive filters & sorting
│   ├── products/                 # Product catalog route
│   │   └── [slug]/               # Product detail page (Gallery, variants, specs, reviews)
│   ├── category/[slug]/          # Dedicated category landing pages
│   ├── search/                   # Dedicated search page (/search?q=...) with query sync
│   ├── cart/                     # Shopping bag with coupon code & threshold progress
│   ├── checkout/                 # Authoritative server-side checkout with address capture
│   ├── order/success/[orderId]/  # Secure order confirmation page
│   ├── wishlist/                 # Wishlist with move-to-bag functionality
│   ├── login/                    # Customer authentication login
│   ├── register/                 # Customer registration
│   ├── forgot-password/          # Password recovery request
│   ├── reset-password/           # Password update
│   ├── account/                  # Customer portal with profile editor & saved addresses
│   │   └── orders/               # Customer order history & invoices (/account/orders/[id])
│   ├── admin/                    # Secure Admin Management Portal
│   │   ├── page.tsx              # Operations dashboard (Authentic revenue, order status counts)
│   │   ├── products/             # Product manager + create (/new) & edit (/[id])
│   │   ├── categories/           # Category manager with orphan protection & reordering
│   │   ├── inventory/            # Inventory matrix with low-stock deficit indicators
│   │   ├── orders/               # Order pipeline manager & fulfillment details (/[id])
│   │   ├── customers/            # Customer directory & customer file (/[id])
│   │   ├── coupons/              # Coupon management & toggles
│   │   ├── reviews/              # Review moderation queue (approve/reject/delete)
│   │   ├── settings/             # Store configuration & infrastructure health matrix
│   │   └── audit/                # Chronological audit logs of administrative actions
│   └── api/                      # Server API routes
│       ├── checkout/route.ts     # Authoritative server pricing & idempotency guard
│       ├── orders/route.ts       # Order status & milestone checkpoints
│       └── webhooks/cj/route.ts  # HMAC-SHA256 authenticated webhook listener
├── components/                   # Modular UI components
│   ├── ui/                       # Button, Badge, Modal, Input primitives
│   ├── layout/                   # Header, AnnouncementBar, Navbar, Footer, MobileMenu
│   ├── product/                  # ProductCard, ProductDetailView, ProductCatalogView
│   ├── cart/                     # Slide-over mini-cart drawer
│   └── search/                   # Instant search modal with keyboard navigation
├── lib/                          # Core business logic & integrations
│   ├── admin/                    # Admin metrics, inventory updates, and audit queries
│   ├── auth/                     # Supabase Auth client, session persistence, role checks
│   ├── cart/                     # Cart service, authoritative price recalculation, guest merge
│   ├── categories/               # Category CRUD and orphan product validation
│   ├── coupons/                  # Server-side coupon verification and calculations
│   ├── customers/                # Customer profile and address book management
│   ├── db/                       # Supabase client, queries, local fallback store, seed data
│   ├── orders/                   # Authoritative order creation, status transitions, audit logs
│   ├── pricing/                  # Authoritative pricing & admin profit calculator
│   ├── products/                 # Product CRUD, sanitization (stripping internal cost), SEO
│   └── reviews/                  # Review submission and admin moderation workflows
├── supabase/                     # PostgreSQL Migrations & Seed Data
│   ├── migrations/               # Versioned migration scripts
│   └── seed.sql                  # 8 store categories, demo products, coupons, settings
├── tests/                        # Vitest automated test suite (11 suites, 50+ tests)
└── docs/                         # Comprehensive architectural & operational manuals
```

---

## 🚀 Quick Start (Development Mode)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(The system runs out of the box in zero-config development mode using high-fidelity fallback stores and local persistence when Supabase credentials are not yet configured).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Quality Assurance

```bash
# Run Vitest automated unit and integration tests (11 test suites)
npm test

# Run TypeScript strict type verification (0 errors required)
npm run typecheck

# Run production build (verifies static rendering of all 42 routes)
npm run build
```

---

## 📦 Supabase Database Architecture & Migration Workflow

This project uses modern Supabase CLI migration workflows to ensure reproducible schema versioning, strict PostgreSQL types, and zero manual production modifications.

### 1. Versioned Database Migrations

Database migrations are located in `supabase/migrations/`:
- `20260926000001_initial_schema.sql`: Core 26 tables (products, variants, categories, carts, orders, customers, addresses, coupons, reviews, etc.).
- `20260926000002_rls_and_security.sql`: Row Level Security policies, `is_admin()` security definer function.
- `20260927000001_ecommerce_foundation_extensions.sql`: External mapping columns (`external_provider`, `external_product_id`, `external_sku`), order status constraints (`pending_payment`, `unfulfilled`, etc.), `decrease_variant_inventory` function, review moderation indexes.

### 2. Migration Commands

```bash
# Link to remote Supabase project
npx supabase link --project-ref <your-project-ref>

# Push pending migrations to remote Supabase
npm run db:push

# Generate updated TypeScript types
npm run db:types
```

---

## 🔐 Security Architecture

- **Server-Authoritative Pricing**: The browser never determines product prices, discounts, or order totals. All calculations are executed server-side.
- **Internal Cost Concealment**: Cost price (`cost_price`) and supplier shipping costs are stripped before product data reaches customer-facing payloads (`sanitizeCustomerProduct`).
- **Row Level Security (RLS)**: Customers can only query their own profiles, addresses, carts, orders, and wishlists. Admins require `role = 'admin'`.
- **Order Idempotency**: Checkout requests enforce unique idempotency tokens, preventing double-orders on retries or rapid clicks.
- **Safe Inventory Handling**: Atomically decrements stock and rejects orders with insufficient stock or non-positive quantities.
- **Zero Secrets Rule**: `SUPABASE_SERVICE_ROLE_KEY` and third-party supplier secrets are never exposed to browser bundles.

---

## 🌐 Documentation Directory

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Multi-tier application architecture and data flows.
- [docs/DATABASE.md](docs/DATABASE.md): Schema reference, tables, constraints, and migration instructions.
- [docs/SECURITY.md](docs/SECURITY.md): Threat mitigation matrix, RLS policies, and data isolation.
- [docs/CJ-INTEGRATION.md](docs/CJ-INTEGRATION.md): External fulfillment specifications (Phase 2).
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Production hosting and custom domain DNS setup.
