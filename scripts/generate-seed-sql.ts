import fs from "fs";
import path from "path";
import { CATEGORIES, DEMO_PRODUCTS } from "../lib/db/seed-data";

const categoryUuidMap: Record<string, string> = {
  "cat-home-kitchen": "a1000000-0000-0000-0000-000000000001",
  "cat-pet-supplies": "a1000000-0000-0000-0000-000000000002",
  "cat-beauty-personal-care": "a1000000-0000-0000-0000-000000000003",
  "cat-ornaments-fashion-accessories": "a1000000-0000-0000-0000-000000000004",
  "cat-phone-tech-accessories": "a1000000-0000-0000-0000-000000000005",
  "cat-fitness-wellness": "a1000000-0000-0000-0000-000000000006",
  "cat-eco-friendly-sustainable": "a1000000-0000-0000-0000-000000000007",
  "cat-baby-kids": "a1000000-0000-0000-0000-000000000008",
};

// Deterministic UUID generator for demo products & variants
function toUuid(prefix: string, index: number): string {
  const hexIdx = (index + 1).toString().padStart(12, "0");
  return `${prefix}-0000-0000-0000-${hexIdx}`;
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

let sql = `-- ==============================================================================
-- MYCHOICE.in - Comprehensive Production Database Seed Migration
-- Generates: 8 Core Categories, 24 Curated Demo Products, 50+ Variants, Images, Coupons & Settings
-- ==============================================================================

-- 1. Insert 8 Core Categories
INSERT INTO categories (id, slug, name, description, image_url, sort_order, is_active, seo_title, seo_description)
VALUES
`;

const catInserts = CATEGORIES.map((cat, idx) => {
  const catUuid = categoryUuidMap[cat.id] || toUuid("a1000000", idx);
  return `('${catUuid}', '${escapeSql(cat.slug)}', '${escapeSql(cat.name)}', '${escapeSql(cat.description)}', '${escapeSql(cat.imageUrl)}', ${cat.sortOrder}, TRUE, '${escapeSql(cat.seoTitle)}', '${escapeSql(cat.seoDescription)}')`;
});

sql += catInserts.join(",\n") + `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 2. Insert Coupons
sql += `-- 2. Insert Coupons
INSERT INTO coupons (id, code, description, discount_type, discount_value, minimum_order_value, maximum_discount, is_active)
VALUES
('c1000000-0000-0000-0000-000000000001', 'WELCOME10', '10% off your inaugural order', 'percentage', 10.00, 50.00, 30.00, TRUE),
('c1000000-0000-0000-0000-000000000002', 'SAVE20', '$20 off orders exceeding $120', 'fixed', 20.00, 120.00, NULL, TRUE),
('c1000000-0000-0000-0000-000000000003', 'LUXURY25', '25% VIP savings on seasonal essentials', 'percentage', 25.00, 200.00, 75.00, TRUE)
ON CONFLICT (id) DO NOTHING;\n\n`;

// 3. Insert Site Settings
sql += `-- 3. Insert Site Settings
INSERT INTO site_settings (key, value)
VALUES
('store_profile', '{
    "brandName": "MYCHOICE.in",
    "tagline": "Curated essentials for the way you live.",
    "supportEmail": "concierge@mychoice.in",
    "supportPhone": "+91 (800) 456-7890",
    "defaultCurrency": "USD",
    "supportedCurrencies": ["USD", "INR", "EUR", "GBP", "AED"],
    "minimumMarginPercent": 35,
    "freeShippingThreshold": 75.00
}'::jsonb),
('currency_rates', '{
    "base": "USD",
    "rates": {
        "USD": 1.0,
        "INR": 86.5,
        "EUR": 0.92,
        "GBP": 0.79,
        "AED": 3.67
    }
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;\n\n`;

// 4. Insert Products
sql += `-- 4. Insert 24 Curated Demo Products
INSERT INTO products (
    id, slug, name, short_description, description, category_id,
    brand_name, status, risk_status, featured, bestseller, new_arrival,
    seo_title, seo_description, base_currency, base_price, compare_at_price,
    cj_product_id, cj_product_sku, product_rating, review_count
) VALUES
`;

const prodInserts: string[] = [];
const variantInserts: string[] = [];
const imageInserts: string[] = [];

let variantGlobalIdx = 0;
let imageGlobalIdx = 0;

DEMO_PRODUCTS.forEach((prod, pIdx) => {
  const prodUuid = toUuid("b2000000", pIdx);
  const catUuid = categoryUuidMap[prod.categoryId] || categoryUuidMap["cat-home-kitchen"];
  const comparePriceVal = prod.compareAtPrice ? prod.compareAtPrice.toFixed(2) : "NULL";

  prodInserts.push(
    `('${prodUuid}', '${escapeSql(prod.slug)}', '${escapeSql(prod.name)}', '${escapeSql(prod.shortDescription)}', '${escapeSql(prod.description)}', '${catUuid}', '${escapeSql(prod.brandName)}', '${prod.status}', '${prod.riskStatus}', ${prod.featured ? "TRUE" : "FALSE"}, ${prod.bestseller ? "TRUE" : "FALSE"}, ${prod.newArrival ? "TRUE" : "FALSE"}, '${escapeSql(prod.seoTitle)}', '${escapeSql(prod.seoDescription)}', '${prod.baseCurrency}', ${prod.basePrice.toFixed(2)}, ${comparePriceVal}, '${escapeSql(prod.cjProductId)}', '${escapeSql(prod.cjProductSku)}', ${prod.productRating}, ${prod.reviewCount})`
  );

  // Variants
  prod.variants.forEach((v) => {
    const vUuid = toUuid("b3000000", variantGlobalIdx++);
    const vCompare = v.compareAtPrice ? v.compareAtPrice.toFixed(2) : "NULL";
    const opt1Name = v.option1Name ? `'${escapeSql(v.option1Name)}'` : "NULL";
    const opt1Val = v.option1Value ? `'${escapeSql(v.option1Value)}'` : "NULL";
    const opt2Name = v.option2Name ? `'${escapeSql(v.option2Name)}'` : "NULL";
    const opt2Val = v.option2Value ? `'${escapeSql(v.option2Value)}'` : "NULL";

    variantInserts.push(
      `('${vUuid}', '${prodUuid}', '${escapeSql(v.cjVariantId)}', '${escapeSql(v.sku)}', ${opt1Name}, ${opt1Val}, ${opt2Name}, ${opt2Val}, ${v.price.toFixed(2)}, ${vCompare}, ${v.costPrice.toFixed(2)}, ${v.shippingCost.toFixed(2)}, ${v.inventoryQuantity}, ${v.weight}, ${v.isActive ? "TRUE" : "FALSE"})`
    );
  });

  // Images
  prod.images.forEach((img) => {
    const imgUuid = toUuid("b4000000", imageGlobalIdx++);
    imageInserts.push(
      `('${imgUuid}', '${prodUuid}', NULL, '${escapeSql(img.publicUrl)}', '${escapeSql(img.altText)}', ${img.sortOrder}, ${img.isPrimary ? "TRUE" : "FALSE"})`
    );
  });
});

sql += prodInserts.join(",\n") + `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 5. Insert Product Variants
sql += `-- 5. Insert Product Variants
INSERT INTO product_variants (
    id, product_id, cj_variant_id, sku,
    option_1_name, option_1_value, option_2_name, option_2_value,
    price, compare_at_price, cost_price, shipping_cost, inventory_quantity, weight, is_active
) VALUES
`;
sql += variantInserts.join(",\n") + `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 6. Insert Product Images
sql += `-- 6. Insert Product Images
INSERT INTO product_images (
    id, product_id, variant_id, public_url, alt_text, sort_order, is_primary
) VALUES
`;
sql += imageInserts.join(",\n") + `\nON CONFLICT (id) DO NOTHING;\n\n`;

const targetPath = path.resolve(__dirname, "../supabase/seed.sql");
fs.writeFileSync(targetPath, sql, "utf-8");
console.log(`Generated complete seed SQL at: ${targetPath}`);
console.log(`Total Products: ${DEMO_PRODUCTS.length}`);
console.log(`Total Variants: ${variantInserts.length}`);
console.log(`Total Images: ${imageInserts.length}`);
