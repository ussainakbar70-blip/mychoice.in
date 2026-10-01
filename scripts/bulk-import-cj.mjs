import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const apiKey = process.env.CJ_API_KEY;
const baseUrl = process.env.CJ_API_BASE_URL || 'https://developers.cjdropshipping.com/api2.0';

// Store Category Mappings
const CATEGORY_MAP = {
  homeKitchen: 'a1000000-0000-0000-0000-000000000001',
  petSupplies: 'a1000000-0000-0000-0000-000000000002',
  beautyPersonalCare: 'a1000000-0000-0000-0000-000000000003',
  fashionAccessories: 'a1000000-0000-0000-0000-000000000004',
  phoneTech: 'a1000000-0000-0000-0000-000000000005',
  fitnessWellness: 'a1000000-0000-0000-0000-000000000006',
  ecoFriendly: 'a1000000-0000-0000-0000-000000000007',
  babyKids: 'a1000000-0000-0000-0000-000000000008',
};

function determineCategoryId(categoryName = '', title = '') {
  const text = `${categoryName} ${title}`.toLowerCase();

  if (text.includes('pet') || text.includes('dog') || text.includes('cat') || text.includes('catnip')) {
    return CATEGORY_MAP.petSupplies;
  }
  if (text.includes('baby') || text.includes('kid') || text.includes('children') || text.includes('toy') || text.includes('girl dress')) {
    return CATEGORY_MAP.babyKids;
  }
  if (text.includes('fitness') || text.includes('yoga') || text.includes('massager') || text.includes('massage') || text.includes('bike') || text.includes('sport')) {
    return CATEGORY_MAP.fitnessWellness;
  }
  if (text.includes('beauty') || text.includes('makeup') || text.includes('skin') || text.includes('hair') || text.includes('capsule') || text.includes('health')) {
    return CATEGORY_MAP.beautyPersonalCare;
  }
  if (text.includes('phone') || text.includes('wireless') || text.includes('charger') || text.includes('earbud') || text.includes('smart') || text.includes('electronic')) {
    return CATEGORY_MAP.phoneTech;
  }
  if (text.includes('eco') || text.includes('solar') || text.includes('bamboo') || text.includes('sustainable')) {
    return CATEGORY_MAP.ecoFriendly;
  }
  if (text.includes('shirt') || text.includes('dress') || text.includes('boot') || text.includes('shoe') || text.includes('necklace') || text.includes('watch') || text.includes('hoodie') || text.includes('jewelry') || text.includes('leather')) {
    return CATEGORY_MAP.fashionAccessories;
  }
  return CATEGORY_MAP.homeKitchen;
}

function cleanTitle(rawTitle) {
  let title = rawTitle;
  // If JSON array string like '["item1", "item2"]'
  if (title.startsWith('[') && title.endsWith(']')) {
    try {
      const arr = JSON.parse(title);
      title = arr[0] || title;
    } catch {}
  }
  // Trim excessive length
  const cleaned = title
    .replace(/cross-border/gi, '')
    .replace(/hot sale/gi, '')
    .replace(/drop shipping/gi, '')
    .replace(/dropship/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > 70) {
    return cleaned.slice(0, 70).replace(/\s+\S*$/, '') + '...';
  }
  return cleaned;
}

async function run() {
  console.log('--- STARTING BULK IMPORT FROM CJ DROPSHIPPING (2X PRICING) ---');

  // 1. Auth token
  const authRes = await fetch(`${baseUrl}/v1/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  const authData = await authRes.json();
  const token = authData.data.accessToken;
  console.log('✅ Authenticated with CJ API. Access token retrieved.');

  // Check existing PIDs to avoid re-importing
  const { data: existingRows } = await supabase.from('products').select('cj_product_id');
  const existingPids = new Set((existingRows || []).map((r) => r.cj_product_id).filter(Boolean));
  console.log(`ℹ️ Already in database: ${existingPids.size} CJ products.`);

  let importedCount = 0;
  const targetPages = [1, 2, 3]; // Pull across top 3 catalog pages (up to 45 products)

  for (const pageNum of targetPages) {
    console.log(`\nFetching CJ Catalog Page ${pageNum}...`);
    const listRes = await fetch(`${baseUrl}/v1/product/list?pageNum=${pageNum}&pageSize=15`, {
      headers: { 'CJ-Access-Token': token },
    });
    const listData = await listRes.json();
    const items = listData.data?.list || [];

    for (const item of items) {
      if (existingPids.has(item.pid)) {
        continue;
      }

      // Fetch full details
      const detailRes = await fetch(`${baseUrl}/v1/product/query?pid=${item.pid}`, {
        headers: { 'CJ-Access-Token': token },
      });
      const detailData = await detailRes.json();
      const p = detailData.data || item;

      const rawTitle = p.productNameEn || p.productName || 'Curated Lifestyle Product';
      const title = cleanTitle(rawTitle);
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50)}-${Date.now().toString().slice(-4)}`;
      const categoryId = determineCategoryId(p.categoryName, title);

      // 2X PRICE RULE
      const supplierCost = Number(p.sellPrice) || Number(item.sellPrice) || 12.0;
      const basePrice = Math.round(supplierCost * 2.0 * 100) / 100; // EXACT 2X
      const compareAtPrice = Math.round(basePrice * 1.35 * 100) / 100;

      // 1. Insert product
      const { data: newProd, error: prodErr } = await supabase.from('products').insert({
        slug,
        name: title,
        short_description: `Premium ${p.categoryName || 'lifestyle'} selection. Verified dropship fulfillment.`,
        description: p.description || `Crafted for everyday reliability and refined aesthetic appeal. Fully verified quality with fast, tracked global delivery.`,
        category_id: categoryId,
        brand_name: 'MYCHOICE',
        status: 'published',
        featured: importedCount % 4 === 0,
        bestseller: importedCount % 3 === 0,
        new_arrival: true,
        base_price: basePrice,
        compare_at_price: compareAtPrice,
        cj_product_id: p.pid,
        cj_product_sku: p.productSku,
        seo_title: `${title} | MYCHOICE.in`,
        seo_description: `Shop the curated ${title}. 2x value guaranteed with fast tracked delivery.`,
      }).select().single();

      if (prodErr) {
        console.error(`❌ Failed to insert product ${item.pid}:`, prodErr.message);
        continue;
      }

      existingPids.add(p.pid);
      importedCount++;
      console.log(`✅ [${importedCount}] Imported: "${title}" | Cost: $${supplierCost} -> 2x Selling Price: $${basePrice}`);

      // 2. Insert variants
      const variants = (p.variants && p.variants.length > 0) ? p.variants.slice(0, 8) : [{
        vid: `vid_${p.pid}_std`,
        variantSku: p.productSku || `SKU-${p.pid.slice(0, 8)}`,
        variantName: 'Standard',
        variantPrice: supplierCost,
        inventory: 50,
      }];

      const variantRows = variants.map((v, idx) => {
        const vCost = Number(v.variantPrice) || supplierCost;
        const vPrice = Math.round(vCost * 2.0 * 100) / 100; // EXACT 2X
        return {
          product_id: newProd.id,
          cj_variant_id: v.vid || `vid_${p.pid}_${idx}`,
          sku: v.variantSku || `MY-${p.pid.slice(0, 8)}-${idx + 1}`,
          price: vPrice,
          compare_at_price: Math.round(vPrice * 1.35 * 100) / 100,
          cost_price: vCost,
          shipping_cost: 0,
          inventory_quantity: v.inventory || 50,
          option_1_name: 'Style / Option',
          option_1_value: v.variantStandard || v.variantName || `Option ${idx + 1}`,
        };
      });

      await supabase.from('product_variants').insert(variantRows);

      // 3. Insert images
      const imageRows = [];
      if (p.productImage) {
        imageRows.push({
          product_id: newProd.id,
          public_url: p.productImage,
          alt_text: title,
          is_primary: true,
          sort_order: 0,
        });
      }
      if (p.productImageSet && Array.isArray(p.productImageSet)) {
        p.productImageSet.slice(0, 4).forEach((img, i) => {
          imageRows.push({
            product_id: newProd.id,
            public_url: img,
            alt_text: title,
            is_primary: false,
            sort_order: i + 1,
          });
        });
      }
      if (imageRows.length > 0) {
        await supabase.from('product_images').insert(imageRows);
      }

      // Small throttle to be courteous to CJ rate limits
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n🎉 BULK IMPORT COMPLETE! Successfully imported and published ${importedCount} live CJ products with 2x pricing!`);
}

run().catch(console.error);
