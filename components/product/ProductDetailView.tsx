"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  Check,
  Minus,
  Plus,
  ChevronDown,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { SeedProduct, SeedVariant } from "@/lib/db/seed-data";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getProductReviews, submitProductReview, ReviewItem } from "@/lib/reviews";
import { getWishlistProductIds, toggleWishlistItem } from "@/lib/db/wishlist";
import { getCurrentUser, UserProfile } from "@/lib/auth";

interface ProductDetailViewProps {
  product: SeedProduct;
  relatedProducts: SeedProduct[];
}

export function ProductDetailView({ product, relatedProducts }: ProductDetailViewProps) {
  const { addItem, currency } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<SeedVariant>(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>("specs");
  const [isAdding, setIsAdding] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState("");
  const [reviewErrMsg, setReviewErrMsg] = useState("");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const currentPrice = selectedVariant?.price ?? product.basePrice;
  const currentCompareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const inStock = (selectedVariant?.inventoryQuantity ?? 0) > 0;
  const availableStock = selectedVariant?.inventoryQuantity ?? 0;

  // Initialize wishlist & user & reviews
  useEffect(() => {
    getWishlistProductIds().then((ids) => {
      setIsWishlisted(ids.includes(product.id));
    });

    getCurrentUser().then((u) => {
      setCurrentUser(u);
      if (u?.fullName) setReviewAuthor(u.fullName);
    });

    getProductReviews(product.id)
      .then((data) => setReviews(data))
      .finally(() => setLoadingReviews(false));
  }, [product.id]);

  const handleToggleWishlist = async () => {
    const isNowAdded = await toggleWishlistItem(product.id, currentUser?.id);
    setIsWishlisted(isNowAdded);
  };

  const handleAddToCart = () => {
    if (!selectedVariant || !inStock) return;
    setIsAdding(true);

    addItem(
      {
        variantId: selectedVariant.id,
        productId: product.id,
        name: product.name,
        variantName: selectedVariant.option1Value
          ? `${selectedVariant.option1Name}: ${selectedVariant.option1Value}`
          : undefined,
        price: selectedVariant.price,
        image: product.images[selectedImageIndex]?.publicUrl || product.images[0]?.publicUrl,
        sku: selectedVariant.sku,
      },
      quantity
    );

    setTimeout(() => setIsAdding(false), 400);
  };

  const toggleAccordion = (key: string) => {
    setActiveAccordion(activeAccordion === key ? null : key);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewErrMsg("");
    setReviewSuccessMsg("");
    setIsSubmittingReview(true);

    try {
      const res = await submitProductReview({
        productId: product.id,
        authorName: reviewAuthor,
        rating: reviewRating,
        title: reviewTitle || undefined,
        reviewText: reviewComment,
        customerId: currentUser?.id,
      });

      if (!res.success && res.error) {
        setReviewErrMsg(res.error);
        setIsSubmittingReview(false);
        return;
      }

      setReviewSuccessMsg("Thank you! Your verified review has been submitted for moderation.");
      setShowReviewModal(false);
      setReviewComment("");
      setReviewTitle("");

      // Refresh reviews
      const updated = await getProductReviews(product.id);
      setReviews(updated);
    } catch {
      setReviewErrMsg("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-16 lg:space-y-24">
      {/* Product Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        {/* Left: Product Imagery Gallery (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Hero Image */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800/80">
            <img
              src={product.images[selectedImageIndex]?.publicUrl}
              alt={product.images[selectedImageIndex]?.altText || product.name}
              className="w-full h-full object-cover object-center transition-all duration-300"
            />
            {product.bestseller && (
              <div className="absolute top-4 left-4">
                <Badge variant="gold">Best Seller</Badge>
              </div>
            )}
            {product.newArrival && (
              <div className="absolute top-4 left-4">
                <Badge variant="blue">New Arrival</Badge>
              </div>
            )}
          </div>

          {/* Thumbnails Row */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    selectedImageIndex === idx
                      ? "border-neutral-900 dark:border-white shadow-md"
                      : "border-neutral-200 dark:border-neutral-800 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.publicUrl} alt={img.altText} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Buy Box & Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Brand & Wishlist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-widest text-neutral-500">
                {product.brandName}
              </span>
              <button
                onClick={handleToggleWishlist}
                className={`p-2 rounded-full border transition-colors ${
                  isWishlisted
                    ? "border-rose-200 text-rose-500 bg-rose-50 dark:bg-rose-950/30"
                    : "border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800"
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? "fill-rose-500" : ""}`} />
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white leading-snug">
              {product.name}
            </h1>

            {reviews.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(product.productRating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-neutral-200 text-neutral-200 dark:fill-neutral-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {product.productRating.toFixed(1)}
                </span>
                <span className="text-neutral-400">({reviews.length} reviews)</span>
              </div>
            )}
          </div>

          {/* Pricing & Savings */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
              {formatMoney(currentPrice, currency)}
            </span>
            {currentCompareAt && currentCompareAt > currentPrice && (
              <>
                <span className="text-sm text-neutral-400 line-through">
                  {formatMoney(currentCompareAt, currency)}
                </span>
                <Badge variant="success">
                  Save {formatMoney(currentCompareAt - currentPrice, currency)}
                </Badge>
              </>
            )}
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {product.shortDescription}
          </p>

          {/* Variants Selector */}
          {product.variants.length > 1 && (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                {product.variants[0].option1Name || "Option"}:{" "}
                <span className="text-neutral-900 dark:text-white font-bold">
                  {selectedVariant?.option1Value}
                </span>
              </label>

              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const isVariantInStock = v.inventoryQuantity > 0;

                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      disabled={!isVariantInStock}
                      className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold shadow-sm"
                          : isVariantInStock
                          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200"
                          : "opacity-40 cursor-not-allowed line-through bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {v.option1Value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock & Quantity Row */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs">
              {inStock ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    In Stock ({availableStock} units available)
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    Currently Out of Stock
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Stepper */}
              <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={!inStock}
                  className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-semibold text-neutral-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  disabled={!inStock || quantity >= availableStock}
                  className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart CTA */}
              <Button
                variant="primary"
                size="lg"
                disabled={!inStock}
                isLoading={isAdding}
                onClick={handleAddToCart}
                className="flex-1 text-sm font-semibold shadow-lg"
                leftIcon={<ShoppingBag className="w-4 h-4" />}
              >
                {inStock
                  ? `Add To Bag • ${formatMoney(currentPrice * quantity, currency)}`
                  : "Unavailable"}
              </Button>
            </div>
          </div>

          {/* Shipping & Delivery Guarantee Banner */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200">
              <Truck className="w-4 h-4 text-brand-gold shrink-0" />
              <span>
                <strong>Tracked Express Courier</strong>: Estimated arrival in <strong>5–9 business days</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200">
              <ShieldCheck className="w-4 h-4 text-brand-gold shrink-0" />
              <span>
                <strong>Direct Supplier Dispatch</strong>: Automated fulfillment &amp; live tracked international delivery.
              </span>
            </div>
          </div>

          {/* Product Details Accordion */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            {/* Specs Accordion */}
            <div>
              <button
                onClick={() => toggleAccordion("specs")}
                className="w-full py-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white"
              >
                <span>Specifications & Dimensions</span>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform ${
                    activeAccordion === "specs" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeAccordion === "specs" && (
                <div className="pb-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
                  {Object.entries(product.specifications || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-850">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{key}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">SKU</span>
                    <span className="font-mono text-[11px]">{selectedVariant?.sku}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Features Accordion */}
            <div>
              <button
                onClick={() => toggleAccordion("features")}
                className="w-full py-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white"
              >
                <span>Key Features & Craft</span>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform ${
                    activeAccordion === "features" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeAccordion === "features" && (
                <div className="pb-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
                  {(product.features || []).map((feat, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-gold mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="border-t border-neutral-200 dark:border-neutral-800 pt-16 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
              Customer Feedback
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
              Client Reviews ({reviews.length})
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewModal(true)}
              leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
            >
              Write a Review
            </Button>
          </div>
        </div>

        {reviewSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
            {reviewSuccessMsg}
          </div>
        )}

        {/* Review Modal Form */}
        {showReviewModal && (
          <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Submit Verified Review for &ldquo;{product.name}&rdquo;
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-xs text-neutral-400 hover:text-neutral-600"
              >
                Cancel
              </button>
            </div>

            {reviewErrMsg && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">
                {reviewErrMsg}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    placeholder="e.g. Elena R."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Rating</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                  >
                    <option value={5}>5 Stars - Exceptional</option>
                    <option value={4}>4 Stars - Very Good</option>
                    <option value={3}>3 Stars - Average</option>
                    <option value={2}>2 Stars - Below Expectations</option>
                    <option value={1}>1 Star - Poor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">Review Headline (Optional)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Exceeded expectations in quality"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">Review Comments</label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details on texture, tactile feel, build quality, and packaging..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                />
              </div>

              <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingReview}>
                Submit For Verification
              </Button>
            </form>
          </div>
        )}

        {/* Real Reviews Cards or Clean Empty State */}
        {loadingReviews ? (
          <div className="py-8 text-center text-xs text-neutral-400">Loading verified feedback...</div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-neutral-200 text-neutral-200 dark:fill-neutral-700"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-400">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {rev.title && (
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {rev.title}
                  </h4>
                )}
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {rev.reviewText}
                </p>
                <div className="pt-2 flex items-center gap-2 text-[11px] text-neutral-500">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{rev.authorName}</span>
                  {rev.verifiedPurchase && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <Check className="w-3 h-3" /> Verified Buyer
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Clean Empty State without Fake Reviews */
          <div className="py-12 px-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 text-center space-y-3 max-w-lg mx-auto">
            <MessageSquare className="w-8 h-8 text-neutral-400 mx-auto" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              No Client Reviews Yet
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Be the first to share your thoughts on craftsmanship and tactile quality after placing an order.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewModal(true)}
              className="mt-2"
            >
              Write First Review
            </Button>
          </div>
        )}
      </section>

      {/* Sticky Mobile Add to Cart Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden p-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-neutral-500 block">Total</span>
          <span className="text-base font-bold text-neutral-900 dark:text-white">
            {formatMoney(currentPrice * quantity, currency)}
          </span>
        </div>
        <Button
          variant="primary"
          size="md"
          disabled={!inStock}
          isLoading={isAdding}
          onClick={handleAddToCart}
          className="flex-1"
          leftIcon={<ShoppingBag className="w-4 h-4" />}
        >
          {inStock ? "Add to Bag" : "Out of Stock"}
        </Button>
      </div>
    </div>
  );
}
