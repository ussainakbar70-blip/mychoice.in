import { SITE_CONFIG } from "@/lib/config/site";
import { SeedProduct } from "@/lib/db/seed-data";
import { SeedCategory } from "@/lib/db/seed-data";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Builds Schema.org Organization Structured Data
 */
export function buildOrganizationSchema() {
  const baseUrl = SITE_CONFIG.siteUrl;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: SITE_CONFIG.brandName,
    legalName: SITE_CONFIG.brandLegalName,
    url: baseUrl,
    logo: `${baseUrl}/favicon.svg`,
    description: SITE_CONFIG.description,
    email: SITE_CONFIG.contact.email,
    telephone: SITE_CONFIG.contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_CONFIG.contact.address,
      addressCountry: "US",
    },
    sameAs: [
      SITE_CONFIG.social.instagram,
      SITE_CONFIG.social.x,
      SITE_CONFIG.social.pinterest,
      SITE_CONFIG.social.linkedin,
    ],
  };
}

/**
 * Builds Schema.org WebSite Structured Data with Sitelinks Searchbox
 */
export function buildWebSiteSchema() {
  const baseUrl = SITE_CONFIG.siteUrl;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: SITE_CONFIG.brandName,
    description: SITE_CONFIG.tagline,
    publisher: {
      "@id": `${baseUrl}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: ["en", "ja", "de", "es", "fr", "zh-CN", "ar", "pt", "it", "ko", "hi"],
  };
}

/**
 * Builds Schema.org BreadcrumbList Structured Data
 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  const baseUrl = SITE_CONFIG.siteUrl;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Builds Schema.org Product Structured Data with Rich Snippets & Offer Spec
 */
export function buildProductSchema(product: SeedProduct) {
  const baseUrl = SITE_CONFIG.siteUrl;
  const canonicalUrl = `${baseUrl}/product/${product.slug}`;
  const primaryImage = product.images[0]?.publicUrl || `${baseUrl}/favicon.svg`;
  const allImages = product.images.map((img) => img.publicUrl);

  const minPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price))
    : product.basePrice;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonicalUrl}/#product`,
    name: product.name,
    description: product.description || product.shortDescription,
    image: allImages.length > 0 ? allImages : [primaryImage],
    sku: product.cjProductSku || product.variants[0]?.sku || product.id,
    mpn: product.cjProductId || product.id,
    brand: {
      "@type": "Brand",
      name: product.brandName || SITE_CONFIG.brandName,
    },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "USD",
      price: minPrice.toFixed(2),
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: SITE_CONFIG.brandName,
        url: baseUrl,
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "US",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
        merchantReturnLink: `${baseUrl}/returns`,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: minPrice >= SITE_CONFIG.thresholds.freeShippingUsd ? "0.00" : "9.95",
          currency: "USD",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: ["US", "CA", "GB", "EU", "AU", "JP"],
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
            unitCode: "d",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 5,
            maxValue: 9,
            unitCode: "d",
          },
        },
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (product.productRating || 4.9).toFixed(1),
      reviewCount: product.reviewCount || 18,
      bestRating: "5",
      worstRating: "1",
    },
  };
}

/**
 * Builds Schema.org ItemList Structured Data for Category & Shop Catalog
 */
export function buildItemListSchema(products: SeedProduct[], title: string, path: string) {
  const baseUrl = SITE_CONFIG.siteUrl;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    url: `${baseUrl}${path}`,
    numberOfItems: products.length,
    itemListElement: products.map((prod, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: prod.name,
      url: `${baseUrl}/product/${prod.slug}`,
      image: prod.images[0]?.publicUrl,
    })),
  };
}
