import { getSupabaseBrowserClient, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "customer" | "admin";
  createdAt?: string;
  updatedAt?: string;
}

const LOCAL_AUTH_STORAGE_KEY = "mychoice_local_auth_user";
let inMemoryAuthUser: UserProfile | null = null;

/**
 * Signs up a new customer with email and password.
 * Creates an initial customer profile.
 */
export async function signUpUser(data: {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}): Promise<{ user: UserProfile | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
          },
        },
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (authData.user) {
        // Upsert into public profiles and customers
        const profile: UserProfile = {
          id: authData.user.id,
          email: authData.user.email || data.email,
          fullName: data.fullName || null,
          phone: data.phone || null,
          avatarUrl: null,
          role: "customer",
        };

        try {
          await supabase.from("profiles").upsert({
            id: profile.id,
            email: profile.email,
            full_name: profile.fullName,
            phone: profile.phone,
            role: "customer",
          });

          await supabase.from("customers").upsert({
            auth_user_id: profile.id,
            email: profile.email,
            full_name: profile.fullName,
            phone: profile.phone,
          });
        } catch (dbErr) {
          console.warn("[Auth] Failed to create linked profile:", dbErr);
        }

        return { user: profile, error: null };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Signup failed";
      return { user: null, error: message };
    }
  }

  // Development Fallback Authentication
  const devUser: UserProfile = {
    id: `usr_${Date.now()}`,
    email: data.email,
    fullName: data.fullName || "Demo Customer",
    phone: data.phone || null,
    avatarUrl: null,
    role: data.email.toLowerCase().includes("admin") ? "admin" : "customer",
    createdAt: new Date().toISOString(),
  };

  inMemoryAuthUser = devUser;

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(devUser));
    window.dispatchEvent(new CustomEvent("auth_state_change", { detail: devUser }));
  }

  return { user: devUser, error: null };
}

/**
 * Signs in an existing customer with email and password.
 */
export async function signInUser(data: {
  email: string;
  password: string;
}): Promise<{ user: UserProfile | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (authData.user) {
        // Fetch user profile from DB
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        const user: UserProfile = {
          id: authData.user.id,
          email: authData.user.email || data.email,
          fullName: profileData?.full_name || authData.user.user_metadata?.full_name || null,
          phone: profileData?.phone || authData.user.user_metadata?.phone || null,
          avatarUrl: profileData?.avatar_url || null,
          role: (profileData?.role as "admin" | "customer") || "customer",
        };

        return { user, error: null };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      return { user: null, error: message };
    }
  }

  // Development Fallback Authentication
  const devUser: UserProfile = {
    id: "usr_demo_client_1",
    email: data.email,
    fullName: "Elena Rostova",
    phone: "+1 (555) 234-5678",
    avatarUrl: null,
    role: data.email.toLowerCase().includes("admin") ? "admin" : "customer",
    createdAt: new Date().toISOString(),
  };

  inMemoryAuthUser = devUser;

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(devUser));
    window.dispatchEvent(new CustomEvent("auth_state_change", { detail: devUser }));
  }

  return { user: devUser, error: null };
}

/**
 * Signs out the current user session.
 */
export async function signOutUser(): Promise<{ error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign out error";
      return { error: message };
    }
  }

  inMemoryAuthUser = null;

  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("auth_state_change", { detail: null }));
  }

  return { error: null };
}

/**
 * Initiates a password reset email via Supabase.
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Password reset failed";
      return { success: false, error: message };
    }
  }

  // Development fallback
  console.log(`[Auth Mock] Password reset link simulated for: ${email}`);
  return { success: true, error: null };
}

/**
 * Updates password when customer visits /reset-password with valid recovery token.
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update password failed";
      return { success: false, error: message };
    }
  }

  return { success: true, error: null };
}

/**
 * Retrieves the currently active user profile.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  if (typeof window === "undefined") return inMemoryAuthUser;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        return {
          id: session.user.id,
          email: session.user.email || "",
          fullName: profile?.full_name || session.user.user_metadata?.full_name || null,
          phone: profile?.phone || session.user.user_metadata?.phone || null,
          avatarUrl: profile?.avatar_url || null,
          role: (profile?.role as "admin" | "customer") || "customer",
          createdAt: profile?.created_at,
          updatedAt: profile?.updated_at,
        };
      }
    } catch (err) {
      console.warn("[Auth] Failed to get session from Supabase:", err);
    }
  }

  // Development localStorage fallback
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Updates customer profile information.
 */
export async function updateProfile(data: {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<{ profile: UserProfile | null; error: string | null }> {
  const current = await getCurrentUser();
  if (!current) return { profile: null, error: "Not authenticated" };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const payload: Record<string, any> = {};
      if (data.fullName !== undefined) payload.full_name = data.fullName;
      if (data.phone !== undefined) payload.phone = data.phone;
      if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
      payload.updated_at = new Date().toISOString();

      const { data: updated, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", current.id)
        .select()
        .single();

      if (error) return { profile: null, error: error.message };

      const user: UserProfile = {
        id: updated.id,
        email: updated.email,
        fullName: updated.full_name,
        phone: updated.phone,
        avatarUrl: updated.avatar_url,
        role: updated.role,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };

      return { profile: user, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      return { profile: null, error: message };
    }
  }

  const updatedUser: UserProfile = {
    ...current,
    fullName: data.fullName ?? current.fullName,
    phone: data.phone ?? current.phone,
    avatarUrl: data.avatarUrl ?? current.avatarUrl,
    updatedAt: new Date().toISOString(),
  };

  inMemoryAuthUser = updatedUser;

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    window.dispatchEvent(new CustomEvent("auth_state_change", { detail: updatedUser }));
  }

  return { profile: updatedUser, error: null };
}

/**
 * Validates if the current user has verified administrator access.
 */
export async function checkIsAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user && user.role === "admin");
}
