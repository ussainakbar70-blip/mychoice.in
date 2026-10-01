import { MetadataRoute } from "next";
import { CATEGORIES, DEMO_PRODUCTS } from "@/lib/db/seed-data";
import { getCategories } from "@/lib/db/categories";
import { getProducts } from "@/lib/db/products";
import { SITE_CONFIG } from "@/lib/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_CONFIG.siteUrl;

  // Retrieve products and categories from database or fallback to seed data
  let categories = CATEGORIES;
  let products = DEMO_PRODUCTS;

  try {
    const [dbCategories, { products: dbProducts }] = await Promise.all([
      getCategories(),
      getProducts({ status: "published", limit: 100 }),
    ]);
    if (dbCategories?.length) categories = dbCategories;
    if (dbProducts?.length) products = dbProducts;
  } catch {
    // Fallback to static seed data if DB is temporarily unreachable
  }

  const now = new Date();

  // Core High-Value Landing Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/shipping`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/returns`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/track-order`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Category Pages
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/category/${cat.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // Product Canonical Pages
  const productRoutes: MetadataRoute.Sitemap = products.map((prod) => ({
    url: `${baseUrl}/product/${prod.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.95,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
