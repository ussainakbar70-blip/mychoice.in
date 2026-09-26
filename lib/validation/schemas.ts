import { z } from "zod";

export const ShippingAddressSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  phone: z.string().min(6, "Phone number is required").max(20),
  addressLine1: z.string().min(5, "Street address must be at least 5 characters").max(150),
  addressLine2: z.string().max(100).optional(),
  city: z.string().min(2, "City is required").max(60),
  state: z.string().min(2, "State or province is required").max(60),
  postalCode: z.string().min(3, "Valid postal code is required").max(20),
  country: z.string().min(2, "Country is required").max(60),
  countryCode: z.string().length(2, "Two-letter country code required (e.g. IN, US, GB)").toUpperCase(),
});

export const OrderItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID required"),
  variantId: z.string().min(1, "Variant ID required"),
  quantity: z.number().int().positive("Quantity must be at least 1").max(50),
});

export const CheckoutRequestSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  shippingAddress: ShippingAddressSchema,
  billingAddress: ShippingAddressSchema.optional(),
  items: z.array(OrderItemInputSchema).min(1, "At least one item is required to checkout"),
  couponCode: z.string().max(30).optional(),
  currency: z.enum(["USD", "INR", "EUR", "GBP", "AED"]).default("USD"),
  idempotencyKey: z.string().min(8, "Valid idempotency token is required").max(100),
  notes: z.string().max(500).optional(),
});

export const NewsletterSubscriptionSchema = z.object({
  email: z.string().email("Valid email required"),
  source: z.string().max(50).default("footer"),
});

export const ContactMessageSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().email("Valid email address required"),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(120),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export const AdminProductUpdateSchema = z.object({
  name: z.string().min(3).max(200),
  slug: z.string().min(3).max(200),
  shortDescription: z.string().max(300),
  description: z.string().min(10),
  categoryId: z.string(),
  brandName: z.string().default("MYCHOICE"),
  status: z.enum(["draft", "published", "archived"]),
  riskStatus: z.enum(["normal", "review_required", "restricted", "rejected"]),
  featured: z.boolean(),
  bestseller: z.boolean(),
  newArrival: z.boolean(),
  basePrice: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional().nullable(),
  cjProductId: z.string().optional().nullable(),
  cjProductSku: z.string().optional().nullable(),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
