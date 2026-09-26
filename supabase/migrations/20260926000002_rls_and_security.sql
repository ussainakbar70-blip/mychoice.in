-- ==============================================================================
-- MYCHOICE.in - Row Level Security (RLS) & Security Policies
-- Migration: 20260926000002_rls_and_security.sql
-- ==============================================================================

-- Helper function: Check if current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS across all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tag_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cj_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cj_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cj_order_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can manage profiles"
    ON profiles FOR ALL
    USING (public.is_admin());

-- 2. CATEGORIES POLICIES
CREATE POLICY "Public can view active categories"
    ON categories FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins can manage categories"
    ON categories FOR ALL
    USING (public.is_admin());

-- 3. PRODUCTS POLICIES
CREATE POLICY "Public can view published products"
    ON products FOR SELECT
    USING (status = 'published' OR public.is_admin());

CREATE POLICY "Admins can manage products"
    ON products FOR ALL
    USING (public.is_admin());

-- 4. VARIANTS & IMAGES
CREATE POLICY "Public can view active variants of published products"
    ON product_variants FOR SELECT
    USING (
        (is_active = TRUE AND EXISTS (
            SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.status = 'published'
        ))
        OR public.is_admin()
    );

CREATE POLICY "Admins can manage variants"
    ON product_variants FOR ALL
    USING (public.is_admin());

CREATE POLICY "Public can view product images"
    ON product_images FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can manage product images"
    ON product_images FOR ALL
    USING (public.is_admin());

-- 5. TAGS POLICIES
CREATE POLICY "Public can view tags" ON product_tags FOR SELECT USING (TRUE);
CREATE POLICY "Public can view tag maps" ON product_tag_map FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage tags" ON product_tags FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage tag maps" ON product_tag_map FOR ALL USING (public.is_admin());

-- 6. CUSTOMERS & ADDRESSES
CREATE POLICY "Users view own customer record"
    ON customers FOR SELECT
    USING (auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users update own customer record"
    ON customers FOR UPDATE
    USING (auth_user_id = auth.uid());

CREATE POLICY "Admins manage customers"
    ON customers FOR ALL
    USING (public.is_admin());

CREATE POLICY "Users view own addresses"
    ON addresses FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM customers WHERE customers.id = addresses.customer_id AND customers.auth_user_id = auth.uid())
        OR public.is_admin()
    );

CREATE POLICY "Users manage own addresses"
    ON addresses FOR ALL
    USING (
        EXISTS (SELECT 1 FROM customers WHERE customers.id = addresses.customer_id AND customers.auth_user_id = auth.uid())
        OR public.is_admin()
    );

-- 7. CARTS & CART ITEMS
CREATE POLICY "Users manage own carts"
    ON carts FOR ALL
    USING (
        (customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE customers.id = carts.customer_id AND customers.auth_user_id = auth.uid()))
        OR session_id IS NOT NULL
        OR public.is_admin()
    );

CREATE POLICY "Users manage own cart items"
    ON cart_items FOR ALL
    USING (
        EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND (
            (carts.customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE customers.id = carts.customer_id AND customers.auth_user_id = auth.uid()))
            OR carts.session_id IS NOT NULL
        ))
        OR public.is_admin()
    );

-- 8. ORDERS & ORDER ITEMS
CREATE POLICY "Customers view own orders"
    ON orders FOR SELECT
    USING (
        (customer_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM customers WHERE customers.id = orders.customer_id AND customers.auth_user_id = auth.uid()
        ))
        OR public.is_admin()
    );

CREATE POLICY "Admins manage orders"
    ON orders FOR ALL
    USING (public.is_admin());

CREATE POLICY "Customers view own order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (
                (orders.customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE customers.id = orders.customer_id AND customers.auth_user_id = auth.uid()))
                OR public.is_admin()
            )
        )
    );

CREATE POLICY "Admins manage order items"
    ON order_items FOR ALL
    USING (public.is_admin());

-- 9. PAYMENTS & SHIPMENTS (Customer read own, admin manage all)
CREATE POLICY "Customers view own payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders WHERE orders.id = payments.order_id AND (
                (orders.customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE customers.id = orders.customer_id AND customers.auth_user_id = auth.uid()))
                OR public.is_admin()
            )
        )
    );

CREATE POLICY "Admins manage payments"
    ON payments FOR ALL
    USING (public.is_admin());

CREATE POLICY "Customers view own shipments"
    ON shipments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND (
                (orders.customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE customers.id = orders.customer_id AND customers.auth_user_id = auth.uid()))
                OR public.is_admin()
            )
        )
    );

CREATE POLICY "Admins manage shipments"
    ON shipments FOR ALL
    USING (public.is_admin());

-- 10. COUPONS
CREATE POLICY "Public view active coupons"
    ON coupons FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins manage coupons"
    ON coupons FOR ALL
    USING (public.is_admin());

CREATE POLICY "Users view own coupon redemptions"
    ON coupon_redemptions FOR SELECT
    USING (
        (customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE customers.id = coupon_redemptions.customer_id AND customers.auth_user_id = auth.uid()))
        OR public.is_admin()
    );

-- 11. REVIEWS
CREATE POLICY "Public view approved reviews"
    ON reviews FOR SELECT
    USING (status = 'approved' OR public.is_admin());

CREATE POLICY "Authenticated users submit reviews"
    ON reviews FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage reviews"
    ON reviews FOR ALL
    USING (public.is_admin());

-- 12. WISHLIST
CREATE POLICY "Users manage own wishlist"
    ON wishlist_items FOR ALL
    USING (
        EXISTS (SELECT 1 FROM customers WHERE customers.id = wishlist_items.customer_id AND customers.auth_user_id = auth.uid())
        OR public.is_admin()
    );

-- 13. NEWSLETTER & CONTACT
CREATE POLICY "Anyone can subscribe to newsletter"
    ON newsletter_subscribers FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Anyone can submit contact message"
    ON contact_messages FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Admins view subscribers and messages"
    ON newsletter_subscribers FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins view and manage contact messages"
    ON contact_messages FOR ALL
    USING (public.is_admin());

-- 14. RESTRICTED SUPPLIER & ADMIN TABLES (Strictly Admin-Only)
CREATE POLICY "Admins manage CJ products" ON cj_products FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage CJ variants" ON cj_variants FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage CJ order sync" ON cj_order_sync FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage webhook events" ON webhook_events FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage audit logs" ON audit_logs FOR ALL USING (public.is_admin());
CREATE POLICY "Public can read site settings, Admins manage" ON site_settings FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage site settings" ON site_settings FOR ALL USING (public.is_admin());
