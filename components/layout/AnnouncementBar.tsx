import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config/site";

export function AnnouncementBar() {
  if (!SITE_CONFIG.announcement.enabled) return null;

  return (
    <aside aria-label="Announcement" className="bg-neutral-950 text-neutral-200 text-xs py-2 px-4 border-b border-white/5 relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
        <Sparkles className="w-3.5 h-3.5 text-brand-gold shrink-0 animate-pulse-subtle" />
        <span className="tracking-tight text-neutral-300">
          {SITE_CONFIG.announcement.text}
        </span>
        {SITE_CONFIG.announcement.linkText && (
          <Link
            href={SITE_CONFIG.announcement.linkUrl}
            className="inline-flex items-center gap-1 font-semibold text-white hover:text-brand-gold transition-colors ml-1 underline underline-offset-2"
          >
            <span>{SITE_CONFIG.announcement.linkText}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </aside>
  );
}
