export interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

export const SITE_CONFIG = {
  brandName: "MYCHOICE.in",
  brandLegalName: "MYCHOICE E-Commerce Private Limited",
  tagline: "Curated essentials for the way you live.",
  description: "A premier international lifestyle ecommerce brand offering thoughtfully engineered essentials across home, wellness, accessories, and modern living.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://mychoice.in",
  contact: {
    email: "mychoiceteam.com@gmail.com",
    supportEmail: "mychoiceteam.com@gmail.com",
    phone: "+91 800 456 7890",
    hours: "Monday - Friday, 9:00 AM - 6:00 PM IST",
    address: "MYCHOICE Design Labs, Sector 44, Gurugram, Haryana 122003, India",
  },
  social: {
    instagram: "https://instagram.com/mychoice.in",
    x: "https://x.com/mychoice_in",
    pinterest: "https://pinterest.com/mychoice_in",
    linkedin: "https://linkedin.com/company/mychoice-in",
  },
  navigation: [
    { label: "Shop All", href: "/shop" },
    { label: "New Arrivals", href: "/shop?sort=newest", badge: "New" },
    { label: "Best Sellers", href: "/shop?sort=bestseller" },
    { label: "Categories", href: "/#categories" },
    { label: "About", href: "/about" },
    { label: "Track Order", href: "/track-order" },
  ] as NavItem[],
  currencies: {
    default: "USD",
    supported: ["USD", "INR", "EUR", "GBP", "AED"] as const,
  },
  thresholds: {
    freeShippingUsd: 75.0,
    minimumMarginPercent: 35,
  },
  announcement: {
    enabled: true,
    text: "Complimentary Worldwide Express Shipping on Orders Over $75",
    linkText: "Shop The Collection",
    linkUrl: "/shop",
  },
};

export type SupportedCurrency = (typeof SITE_CONFIG.currencies.supported)[number];
