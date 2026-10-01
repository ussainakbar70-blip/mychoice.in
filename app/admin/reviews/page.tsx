"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Star, CheckCircle2, XCircle, Trash2, RefreshCw, ShieldCheck } from "lucide-react";
import { adminGetReviews, adminUpdateReviewStatus, adminDeleteReview, ReviewItem } from "@/lib/reviews";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await adminGetReviews();
      setReviews(data);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    setUpdatingId(id);
    try {
      await adminUpdateReviewStatus(id, status);
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    setUpdatingId(id);
    try {
      await adminDeleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Customer Reviews Moderation
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Ensure authenticity and uphold truth in product feedback. No fake or synthetic reviews allowed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadReviews} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Queue
        </Button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-400">Loading moderation queue...</div>
        ) : reviews.length > 0 ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-6 space-y-3 hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
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
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {rev.title || "Review by " + rev.authorName}
                    </span>
                    {rev.verifiedPurchase && (
                      <Badge variant="success" size="sm">
                        Verified Purchase
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        rev.status === "approved"
                          ? "success"
                          : rev.status === "rejected"
                          ? "danger"
                          : "gold"
                      }
                      size="sm"
                    >
                      {rev.status}
                    </Badge>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {rev.reviewText}
                </p>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-neutral-400">
                    Author: <strong className="text-neutral-700 dark:text-neutral-300">{rev.authorName}</strong>
                    {rev.productName && ` • Product: ${rev.productName}`}
                  </span>

                  <div className="flex items-center gap-2">
                    {rev.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={updatingId === rev.id}
                        onClick={() => handleUpdateStatus(rev.id, "approved")}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Approve
                      </Button>
                    )}
                    {rev.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={updatingId === rev.id}
                        onClick={() => handleUpdateStatus(rev.id, "rejected")}
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Reject
                      </Button>
                    )}
                    <button
                      onClick={() => handleDelete(rev.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      title="Permanently Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-neutral-400 space-y-1">
            <MessageSquare className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto" />
            <p>No reviews submitted for moderation yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
