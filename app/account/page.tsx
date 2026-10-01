"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Package,
  MapPin,
  Heart,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Edit2,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { getCurrentUser, signOutUser, updateProfile, UserProfile } from "@/lib/auth";
import { getCustomerOrders, DetailedOrder } from "@/lib/orders";
import { getCustomerAddresses, addCustomerAddress, deleteCustomerAddress, CustomerAddress } from "@/lib/customers";
import { formatMoney } from "@/lib/currency";
import { useCart } from "@/lib/cart/context";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function AccountPage() {
  const router = useRouter();
  const { currency } = useCart();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "addresses">("overview");

  const [orders, setOrders] = useState<DetailedOrder[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);

  // New address state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrFullName, setNewAddrFullName] = useState("");
  const [newAddrPhone, setNewAddrPhone] = useState("");
  const [newAddrLine1, setNewAddrLine1] = useState("");
  const [newAddrLine2, setNewAddrLine2] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrState, setNewAddrState] = useState("");
  const [newAddrPostal, setNewAddrPostal] = useState("");
  const [newAddrCountry, setNewAddrCountry] = useState("India");
  const [addAddressLoading, setAddAddressLoading] = useState(false);

  useEffect(() => {
    async function loadAccountData() {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        // Redirect to login
        router.push("/login?redirect=/account");
        return;
      }

      setUser(currentUser);
      setNameInput(currentUser.fullName || "");
      setPhoneInput(currentUser.phone || "");

      // Load orders
      const userOrders = await getCustomerOrders({
        customerId: currentUser.id,
        email: currentUser.email,
      });
      setOrders(userOrders);

      // Load addresses
      const userAddrs = await getCustomerAddresses(currentUser.id);
      setAddresses(userAddrs);

      setLoading(false);
    }

    loadAccountData();
  }, [router]);

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveProfileLoading(true);
    const { profile, error } = await updateProfile({
      fullName: nameInput,
      phone: phoneInput,
    });
    if (profile) {
      setUser(profile);
      setIsEditingProfile(false);
    } else if (error) {
      alert(error);
    }
    setSaveProfileLoading(false);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAddAddressLoading(true);

    try {
      const added = await addCustomerAddress(user.id, {
        fullName: newAddrFullName,
        phone: newAddrPhone,
        addressLine1: newAddrLine1,
        addressLine2: newAddrLine2 || undefined,
        city: newAddrCity,
        state: newAddrState,
        postalCode: newAddrPostal,
        country: newAddrCountry,
        countryCode: "IN",
        isDefault: addresses.length === 0,
      });

      setAddresses((prev) => [added, ...prev]);
      setShowAddAddress(false);
      setNewAddrLine1("");
      setNewAddrLine2("");
      setNewAddrCity("");
      setNewAddrPostal("");
    } catch {
      alert("Failed to save address.");
    } finally {
      setAddAddressLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    await deleteCustomerAddress(id, user.id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-xs text-neutral-400">
        Loading account details...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
            Client Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
            Welcome, {user.fullName || user.email}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
              <span>Enter Admin Console</span>
            </Link>
          )}

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "overview"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile &amp; Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "orders"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850"
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4" />
              <span>Order History</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "addresses"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850"
            }`}
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4" />
              <span>Address Book</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
              {addresses.length}
            </span>
          </button>

          <Link
            href="/wishlist"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-colors"
          >
            <Heart className="w-4 h-4" />
            <span>My Wishlist</span>
          </Link>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Personal Information
                  </h3>
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="inline-flex items-center gap-1 text-xs text-brand-gold font-semibold hover:underline"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditingProfile ? "Cancel" : "Edit Profile"}</span>
                  </button>
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                      />
                    </div>
                    <Button type="submit" variant="primary" size="sm" isLoading={saveProfileLoading}>
                      Save Changes
                    </Button>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <span className="text-neutral-400 block">Full Name</span>
                      <strong className="text-neutral-900 dark:text-white font-medium">
                        {user.fullName || "Not provided"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Email Address</span>
                      <strong className="text-neutral-900 dark:text-white font-medium">
                        {user.email}
                      </strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Phone</span>
                      <strong className="text-neutral-900 dark:text-white font-medium">
                        {user.phone || "Not provided"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Account Role</span>
                      <Badge variant={user.role === "admin" ? "gold" : "neutral"}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Orders Overview */}
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Recent Orders
                  </h3>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs text-brand-gold hover:underline font-semibold"
                  >
                    View All ({orders.length}) &rarr;
                  </button>
                </div>

                {orders.length > 0 ? (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {orders.slice(0, 3).map((o) => (
                      <div key={o.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white block">
                            {o.orderNumber}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {new Date(o.createdAt).toLocaleDateString()} • {o.items.length} item(s)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                            {formatMoney(o.totalAmount, currency)}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-neutral-500">
                            {o.fulfillmentStatus}
                          </span>
                        </div>
                        <Link
                          href={`/account/orders/${o.orderNumber}`}
                          className="text-xs font-semibold text-brand-gold hover:underline shrink-0"
                        >
                          Details &rarr;
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 py-4 text-center">
                    No orders placed yet. Explore our curated collections.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Order History ({orders.length})
                </h3>
              </div>

              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
                        <div>
                          <span className="text-xs font-mono font-bold text-brand-gold">
                            {o.orderNumber}
                          </span>
                          <span className="text-[11px] text-neutral-400 block">
                            Placed on {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={o.paymentStatus === "paid" ? "success" : "neutral"}>
                            {o.paymentStatus}
                          </Badge>
                          <Badge variant="blue">
                            {o.fulfillmentStatus}
                          </Badge>
                        </div>
                      </div>

                      <div className="divide-y divide-neutral-100 dark:divide-neutral-850">
                        {o.items.map((item) => (
                          <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-medium text-neutral-900 dark:text-white">
                                {item.productName}
                              </span>
                              {item.variantName && (
                                <span className="text-neutral-400 block text-[11px]">
                                  {item.variantName}
                                </span>
                              )}
                            </div>
                            <span className="text-neutral-600 dark:text-neutral-400">
                              Qty {item.quantity} × {formatMoney(item.unitPrice, currency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                        <Link
                          href={`/account/orders/${o.orderNumber}`}
                          className="text-brand-gold hover:underline font-semibold"
                        >
                          View Full Order Invoice &rarr;
                        </Link>
                        <span className="font-bold text-neutral-900 dark:text-white">
                          Total: {formatMoney(o.totalAmount, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 space-y-2">
                  <Package className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-xs text-neutral-500">You haven&apos;t placed any orders yet.</p>
                  <Button variant="primary" size="sm" asChild>
                    <Link href="/shop">Start Shopping</Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Saved Delivery Addresses ({addresses.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAddress(!showAddAddress)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Address
                </Button>
              </div>

              {showAddAddress && (
                <form onSubmit={handleAddAddress} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">New Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Recipient Full Name"
                      value={newAddrFullName}
                      onChange={(e) => setNewAddrFullName(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Phone Number"
                      value={newAddrPhone}
                      onChange={(e) => setNewAddrPhone(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Street Address Line 1"
                    value={newAddrLine1}
                    onChange={(e) => setNewAddrLine1(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Apartment, Suite, Unit (Optional)"
                    value={newAddrLine2}
                    onChange={(e) => setNewAddrLine2(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={newAddrCity}
                      onChange={(e) => setNewAddrCity(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={newAddrState}
                      onChange={(e) => setNewAddrState(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Postal Code"
                      value={newAddrPostal}
                      onChange={(e) => setNewAddrPostal(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAddress(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={addAddressLoading}>
                      Save Address
                    </Button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs relative"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-neutral-900 dark:text-white">{a.fullName}</strong>
                      {a.isDefault && <Badge variant="gold">Default</Badge>}
                    </div>
                    <p className="text-neutral-500 leading-relaxed">
                      {a.addressLine1}
                      {a.addressLine2 && `, ${a.addressLine2}`}
                      <br />
                      {a.city}, {a.state} {a.postalCode}
                      <br />
                      {a.country} • {a.phone}
                    </p>
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleDeleteAddress(a.id)}
                        className="text-neutral-400 hover:text-red-500 text-[11px] inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
