import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cjdropshipping.com",
      },
      {
        protocol: "https",
        hostname: "**.cjdropshipping.com",
      },
      {
        protocol: "https",
        hostname: "**.aliyuncs.com",
      },
      {
        protocol: "https",
        hostname: "**.alicdn.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://sdk.cashfree.com https://api.cashfree.com https://translate.google.com https://translate.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: https://images.unsplash.com https://cjdropshipping.com https://*.cjdropshipping.com https://*.aliyuncs.com https://*.alicdn.com https://translate.googleapis.com https://www.gstatic.com",
              "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://api.cashfree.com https://sandbox.cashfree.com https://*.cashfree.com https://*.supabase.co https://developers.cjdropshipping.com https://translate.googleapis.com https://translate.google.com",
              "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.cashfree.com https://api.cashfree.com https://sandbox.cashfree.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self' https://api.razorpay.com https://*.cashfree.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
