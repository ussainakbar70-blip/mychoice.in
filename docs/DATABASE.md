# PostgreSQL Database Schema & Migration Guide

**Platform**: Supabase PostgreSQL 15+  
**Architecture**: Relational schema with UUID primary keys, check constraints, foreign keys, B-tree indexes, and Row Level Security (RLS).

---

## 1. Relational Table Dictionary (26 Core Tables)

| Table | Purpose | Primary Key | Key Security & Constraints |
| :--- | :--- | :--- | :--- |
| `profiles` | Extends `auth.users` with customer/admin roles | UUID | RLS: User read/write own, Admin read all |
| `categories` | Top-level store categories (8 core collections) | UUID | RLS: Public read active, Admin write |
| `products` | Curated product definitions & SEO metadata | UUID | RLS: Public read published, Admin write |
| `product_variants`| SKUs, options, pricing, and supplier cost | UUID | RLS: Cost and CJ vid protected from public |
| `product_images` | Gallery images, order, and primary flag | UUID | RLS: Public read, Admin write |
| `product_tags` | Taxonomies and indexing tags | UUID | RLS: Public read, Admin write |
| `product_tag_map` | Many-to-many product to tag junction | (product_id, tag_id) | Foreign keys cascade on delete |
| `customers` | Customer identity records | UUID | RLS: User read own, Admin read all |
| `addresses` | Customer shipping and billing destinations | UUID | RLS: User read/write own |
| `carts` | Session & user persisted shopping carts | UUID | Unique session_id or customer_id |
| `cart_items` | Variant lines inside cart with quantities | UUID | Unique (cart_id, variant_id) |
| `orders` | Human-friendly order records (`ORD-2026-XXXXX`) | UUID | RLS: Customers read own, Admin manage all |
| `order_items` | Snapshot of purchased line items & prices | UUID | Foreign key references order_id cascade |
| `payments` | Audit trail of payment transactions & status | UUID | Provider, payment ID, status check |
| `shipments` | Courier, tracking number, and tracking URL | UUID | Indexed by tracking_number |
| `coupons` | Percentage and fixed promo codes | UUID | Unique code, check constraints on discount |
| `coupon_redemptions` | Audit ledger of redeemed coupon codes | UUID | Tracks customer_id, order_id, discount |
| `reviews` | Customer ratings (1-5) and feedback | UUID | Verified purchase flag, Admin moderation |
| `wishlist_items` | Customer saved product wishlist | UUID | Unique (customer_id, product_id) |
| `newsletter_subscribers` | Email marketing consent list | UUID | Unique email, source tracking |
| `contact_messages` | Customer concierge inquiry tickets | UUID | Status tracking (unread/read/replied) |
| `cj_products` | Cached raw JSON product snapshots from CJ API | UUID | Unique `cj_product_id` |
| `cj_variants` | Cached CJ variant data & stock levels | UUID | Unique `cj_variant_id` |
| `cj_order_sync` | Sync queue, retries, and errors for CJ orders | UUID | Indexed on sync_status |
| `webhook_events` | Idempotent event ledger from external APIs | UUID | Unique `event_id`, processed flag |
| `audit_logs` | Immutable audit log of administrative actions | UUID | Actor ID, action type, JSON metadata |
| `site_settings` | Dynamic store parameters and currency rates | UUID | Unique key, JSONB value |

---

## 2. Row Level Security (RLS) Strategy

All tables enforce Row Level Security:
- **Customers**: Permitted to select their own profile, orders, addresses, and wishlist.
- **Admin Isolation**: Admin operations use the security definer function `public.is_admin()`, verifying user membership in `profiles` where `role = 'admin'`.
- **Supplier Protection**: Tables containing wholesale costs, supplier IDs, margins, and webhook payloads (`cj_products`, `cj_variants`, `cj_order_sync`, `webhook_events`, `audit_logs`) are strictly restricted to admin access.

---

## 3. Running Migrations

Execute the migration scripts directly in Supabase SQL Editor or using Supabase CLI:

```bash
# Apply schema
supabase db push
# Or run migration scripts sequentially:
# 1. supabase/migrations/20260926000001_initial_schema.sql
# 2. supabase/migrations/20260926000002_rls_and_security.sql
# 3. supabase/seed.sql
```
