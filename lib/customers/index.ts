import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/db/client";

export interface CustomerAddress {
  id: string;
  customerId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode: string;
  isDefault: boolean;
  createdAt?: string;
}

const LOCAL_ADDRESSES_KEY = "mychoice_local_addresses";

function getLocalAddresses(): CustomerAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_ADDRESSES_KEY);
    return raw ? JSON.parse(raw) : [
      {
        id: "addr_default_1",
        customerId: "usr_demo_client_1",
        fullName: "Elena Rostova",
        phone: "+1 (555) 234-5678",
        addressLine1: "742 Evergreen Terrace",
        addressLine2: "Apt 4B",
        city: "Springfield",
        state: "Oregon",
        postalCode: "97477",
        country: "United States",
        countryCode: "US",
        isDefault: true,
      }
    ];
  } catch {
    return [];
  }
}

function saveLocalAddresses(addrs: CustomerAddress[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_ADDRESSES_KEY, JSON.stringify(addrs));
  }
}

/**
 * Fetch addresses for customer.
 */
export async function getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  if (isSupabaseConfigured() && customerId) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_default", { ascending: false });

      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          customerId: d.customer_id,
          fullName: d.full_name,
          phone: d.phone,
          addressLine1: d.address_line_1,
          addressLine2: d.address_line_2 || undefined,
          city: d.city,
          state: d.state,
          postalCode: d.postal_code,
          country: d.country,
          countryCode: d.country_code,
          isDefault: d.is_default,
          createdAt: d.created_at,
        }));
      }
    } catch (err) {
      console.warn("[Addresses] DB error, using local fallback:", err);
    }
  }

  return getLocalAddresses();
}

/**
 * Add a new address for customer.
 */
export async function addCustomerAddress(
  customerId: string,
  address: Omit<CustomerAddress, "id" | "customerId">
): Promise<CustomerAddress> {
  if (isSupabaseConfigured() && customerId) {
    const supabase = getSupabaseBrowserClient();

    // If marked default, unset others first
    if (address.isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("customer_id", customerId);
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert({
        customer_id: customerId,
        full_name: address.fullName,
        phone: address.phone,
        address_line_1: address.addressLine1,
        address_line_2: address.addressLine2 || null,
        city: address.city,
        state: address.state,
        postal_code: address.postalCode,
        country: address.country,
        country_code: address.countryCode || "IN",
        is_default: address.isDefault,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      customerId: data.customer_id,
      fullName: data.full_name,
      phone: data.phone,
      addressLine1: data.address_line_1,
      addressLine2: data.address_line_2 || undefined,
      city: data.city,
      state: data.state,
      postalCode: data.postal_code,
      country: data.country,
      countryCode: data.country_code,
      isDefault: data.is_default,
    };
  }

  // Local fallback
  const list = getLocalAddresses();
  if (address.isDefault) {
    list.forEach((a) => (a.isDefault = false));
  }
  const newAddr: CustomerAddress = {
    ...address,
    id: `addr_${Date.now()}`,
    customerId,
  };
  list.unshift(newAddr);
  saveLocalAddresses(list);
  return newAddr;
}

/**
 * Delete customer address.
 */
export async function deleteCustomerAddress(addressId: string, customerId: string): Promise<boolean> {
  if (isSupabaseConfigured() && customerId) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("addresses").delete().eq("id", addressId);
    return !error;
  }

  const list = getLocalAddresses().filter((a) => a.id !== addressId);
  saveLocalAddresses(list);
  return true;
}

/**
 * Set an address as default.
 */
export async function setDefaultCustomerAddress(addressId: string, customerId: string): Promise<boolean> {
  if (isSupabaseConfigured() && customerId) {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("addresses").update({ is_default: false }).eq("customer_id", customerId);
    const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", addressId);
    return !error;
  }

  const list = getLocalAddresses().map((a) => ({
    ...a,
    isDefault: a.id === addressId,
  }));
  saveLocalAddresses(list);
  return true;
}

/**
 * Admin: Get customer overview list with order counts & aggregate spend.
 */
export async function adminGetCustomers(): Promise<Array<{
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}>> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: customers, error } = await supabase
        .from("customers")
        .select("*, orders(id, total_amount, payment_status)")
        .order("created_at", { ascending: false });

      if (!error && customers) {
        return customers.map((c: any) => {
          const paidOrders = (c.orders || []).filter((o: any) => o.payment_status === "paid");
          const totalSpent = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
          return {
            id: c.id,
            email: c.email,
            fullName: c.full_name,
            phone: c.phone,
            orderCount: (c.orders || []).length,
            totalSpent: Number(totalSpent.toFixed(2)),
            createdAt: c.created_at,
          };
        });
      }
    } catch {
      // Fallback
    }
  }

  // Development demo customers
  return [
    {
      id: "cust-001",
      email: "elena.rostova@example.com",
      fullName: "Elena Rostova",
      phone: "+1 (555) 234-5678",
      orderCount: 2,
      totalSpent: 182.00,
      createdAt: "2026-08-14T10:30:00Z",
    },
    {
      id: "cust-002",
      email: "aarav.mehta@example.com",
      fullName: "Aarav Mehta",
      phone: "+91 98765 43210",
      orderCount: 1,
      totalSpent: 94.00,
      createdAt: "2026-09-02T14:15:00Z",
    },
  ];
}
