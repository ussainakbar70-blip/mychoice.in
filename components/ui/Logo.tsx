import React from "react";
import Link from "next/link";

interface LogoProps {
  className?: string;
  variant?: "light" | "dark" | "auto";
  showTagline?: boolean;
}

export function Logo({ className = "", variant = "auto", showTagline = false }: LogoProps) {
  // Variant color definitions
  const isLight = variant === "light";
  const textColor = isLight ? "text-white" : variant === "dark" ? "text-neutral-900" : "text-neutral-900 dark:text-white";
  const subColor = isLight ? "text-neutral-400" : "text-neutral-500";
  const markStroke = isLight ? "#FFFFFF" : "#0F172A";
  const accentColor = "#D4AF37"; // Champagne Gold

  return (
    <Link href="/" className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {/* Precision Geometric Monogram Mark */}
      <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-subtle group-hover:shadow-glow transition-all duration-300">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 transition-transform duration-300 group-hover:scale-105"
        >
          {/* Stylized M Monogram with Precision Choice Apex */}
          <path
            d="M6 24V8L16 17L26 8V24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Subtle Golden Apex Diamond Accent */}
          <circle cx="16" cy="7" r="2" fill={accentColor} />
        </svg>
      </div>

      {/* Typography Wordmark */}
      <div className="flex flex-col">
        <div className="flex items-baseline tracking-[0.16em] font-bold text-lg leading-none">
          <span className={textColor}>MYCHOICE</span>
          <span className="text-xs font-semibold text-brand-gold ml-0.5 tracking-normal">.in</span>
        </div>
        {showTagline && (
          <span className={`text-[10px] uppercase tracking-[0.25em] font-medium mt-1 ${subColor}`}>
            Curated Living
          </span>
        )}
      </div>
    </Link>
  );
}
