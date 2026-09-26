"use client";

import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config/site";
import { Button } from "@/components/ui/Button";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
          Client Concierge
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Contact Our Concierge
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
          Inquiries regarding existing orders, product specifications, or bespoke curations are answered within 12 business hours.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Left Information (5 Cols) */}
        <div className="md:col-span-5 space-y-6 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-900 dark:text-white block">Email Inquiries</span>
                <span>{SITE_CONFIG.contact.email}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-900 dark:text-white block">Client Telephone</span>
                <span>{SITE_CONFIG.contact.phone}</span>
                <span className="block text-[11px] text-neutral-400">{SITE_CONFIG.contact.hours}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-900 dark:text-white block">Studio Headquarters</span>
                <span>{SITE_CONFIG.contact.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form (7 Cols) */}
        <div className="md:col-span-7">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Message Transmitted
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  A concierge specialist has received your inquiry and will follow up shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Subject / Order Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Inquiry Details
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>

                <Button variant="primary" size="md" type="submit" className="w-full" rightIcon={<Send className="w-3.5 h-3.5" />}>
                  Transmit Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
