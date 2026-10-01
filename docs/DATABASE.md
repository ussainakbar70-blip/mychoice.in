# PostgreSQL Database Schema & Migration Guide

**Platform**: Supabase PostgreSQL 15+  
**Architecture**: Relational schema with UUID primary keys, check constraints, foreign keys, B-tree indexes, and Row Level Security (RLS).

---

## 1. Relational Table Dictionary (27 Core Tables)

| Table | Purpose | Primary Key | Key Security & Constraints |
| :--- | :--- | :--- | :--- |
| `profiles` | Extends `auth.users` with customer/admin roles | UUID | RLS: User read/write own, Admin read all |
| `categories` | Top-level store categories (8 core collections) | UUID | RLS: Public read active, Admin write |
| `products` | Curated product definitions & SEO metadata | UUID | RLS: Public read published, Admin write |
| `product_variants`| SKUs, options, pricing, and supplier cost | UUID | RLS: Cost and external mapping fields protected from public |
| `product_images` | Gallery images, order, and primary flag | UUID | RLS: Public read, Admin write |
| `product_tags` | Taxonomies and indexing tags | UUID | RLS: Public read, Admin write |
| `product_tag_map` | Many-to-many product to tag junction | (product_id, tag_id) | Foreign keys cascade on delete |
| `customers` | Customer identity records | UUID | RLS: User read own, Admin read all |
| `addresses` | Customer shipping and billing destinations | UUID | RLS: User read/write own |
| `carts` | Session & user persisted shopping carts | UUID | Unique session_id or customer_id |
| `cart_items` | Variant lines inside cart with quantities | UUID | Unique (cart_id, variant_id) |
| `orders` | Human-friendly order records (`ORD-2026-XXXXX`) | UUID | RLS: Customers read own, Admin manage all |
| `order_items` | Snapshot of purchased line items & prices | UUID | Historical immutable snapshots |
| `payments` | Audit trail of payment transactions & status | UUID | Provider, payment ID, status check |
| `shipments` | Courier, tracking number, and tracking URL | UUID | Indexed by tracking_number |
| `coupons` | Percentage and fixed promo codes | UUID | Unique code, check constraints on discount |
| `coupon_redemptions` | Audit ledger of redeemed coupon codes | UUID | Tracks customer_id, order_id, discount |
| `reviews` | Customer ratings (1-5) and feedback | UUID | Verified purchase flag, Admin moderation status |
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

## 2. Foundation Extension Migration (`20260927000001_ecommerce_foundation_extensions.sql`)

The extension migration introduces the following architectural enhancements:

1. **External Supplier Mapping Architecture (Phase 2 Readiness)**:
   - Added `external_provider`, `external_product_id`, `external_sku` to `products`.
   - Added `external_provider`, `external_product_id`, `external_variant_id`, `external_sku` to `product_variants`.

2. **Clean Order Status Model**:
   - Distinct `payment_status`: `pending_payment`, `paid`, `refunded`, `failed`, `manual_review`.
   - Distinct `fulfillment_status`: `unfulfilled`, `pending_fulfillment`, `processing`, `shipped`, `in_transit`, `delivered`, `cancelled`.

3. **Atomic Inventory Operations**:
   - `decrease_variant_inventory(p_variant_id UUID, p_quantity INT)`: Atomically validates existing stock and reduces `inventory_quantity` without race conditions.

4. **Unique Constraints**:
   - `idx_cart_items_unique_cart_variant`: Enforces single line per variant in each cart.
   - `idx_wishlist_items_unique`: Prevents duplicate wishlist entries per customer.

---

## 3. Row Level Security (RLS) Strategy

All tables enforce Row Level Security:
- **Customers**: Permitted to select and modify their own profile, orders, addresses, cart items, and wishlist.
- **Admin Isolation**: Admin operations use the security definer function `public.is_admin()`, verifying user membership in `profiles` where `role = 'admin'`.
- **Public**: Allowed read-only access to published products, active categories, product images, and approved customer reviews.

---

## 4. Running Migrations

Execute the migration scripts directly in Supabase SQL Editor or using Supabase CLI:

```bash
# Push migrations to remote database
npm run db:push

# Sequential order:
# 1. supabase/migrations/20260926000001_initial_schema.sql
# 2. supabase/migrations/20260926000002_rls_and_security.sql
# 3. supabase/migrations/20260927000001_ecommerce_foundation_extensions.sql
# 4. supabase/seed.sql
```
