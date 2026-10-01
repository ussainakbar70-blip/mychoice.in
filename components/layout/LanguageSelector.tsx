"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Globe, ChevronDown, Check, Search } from "lucide-react";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const MAJOR_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English (US)", flag: "🇺🇸" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇦🇪" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷" },
];

export function LanguageSelector({ className = "" }: { className?: string }) {
  const [currentLang, setCurrentLang] = useState<string>("en");
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize language from storage or existing cookie
  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-zA-Z\-]+)/);
      if (match && match[1]) {
        setCurrentLang(match[1]);
        return;
      }
      const saved = localStorage.getItem("mychoice_language");
      if (saved) {
        setCurrentLang(saved);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleLanguageSelect = (langCode: string) => {
    setCurrentLang(langCode);
    setIsOpen(false);

    try {
      localStorage.setItem("mychoice_language", langCode);
      const host = window.location.hostname;

      if (langCode === "en") {
        // Clear translation cookies to return to canonical English
        document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        document.cookie = `googtrans=; path=/; domain=${host}; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        document.cookie = `googtrans=; path=/; domain=.${host}; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        document.cookie = "googtrans=/en/en; path=/;";
      } else {
        document.cookie = `googtrans=/en/${langCode}; path=/;`;
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=${host};`;
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${host};`;
      }

      // Trigger Google Translate engine combo if already initialized
      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (combo) {
        combo.value = langCode;
        combo.dispatchEvent(new Event("change"));
      } else {
        window.location.reload();
      }
    } catch (e) {
      console.warn("Language switch error:", e);
      window.location.reload();
    }
  };

  const selectedMeta = useMemo(() => {
    return MAJOR_LANGUAGES.find((l) => l.code === currentLang) || MAJOR_LANGUAGES[0];
  }, [currentLang]);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return MAJOR_LANGUAGES;
    const q = searchQuery.toLowerCase().trim();
    return MAJOR_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
        aria-label="Select website language"
        title={`Language: ${selectedMeta.nativeName} (${selectedMeta.name})`}
      >
        <Globe className="w-3.5 h-3.5 text-brand-gold shrink-0" />
        <span className="text-sm leading-none mr-0.5">{selectedMeta.flag}</span>
        <span className="font-medium text-xs">{selectedMeta.nativeName}</span>
        <ChevronDown
          className={`w-3 h-3 text-neutral-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 max-h-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-2 z-50 animate-slide-down flex flex-col">
          {/* Header */}
          <div className="px-2.5 py-2 border-b border-neutral-100 dark:border-neutral-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
              Select Language / 言語 / Sprache
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800/80 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-brand-gold border-none"
              />
            </div>
          </div>

          {/* Languages List */}
          <div className="overflow-y-auto divide-y divide-neutral-50 dark:divide-neutral-800/40 py-1 scrollbar-thin">
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-400">
                No matching languages
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code === currentLang;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-xl transition-colors ${
                      isSelected
                        ? "bg-neutral-100 dark:bg-neutral-800 font-bold text-neutral-950 dark:text-white"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{lang.flag}</span>
                      <div>
                        <span className="block font-medium text-neutral-900 dark:text-white">
                          {lang.nativeName}
                        </span>
                        <span className="block text-[10px] text-neutral-400 font-normal">
                          {lang.name}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-brand-gold shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
