import { describe, it, expect, beforeEach } from "vitest";
import { signUpUser, signInUser, signOutUser, getCurrentUser, updateProfile, checkIsAdmin } from "../lib/auth";

describe("Customer Authentication Subsystem", () => {
  beforeEach(() => {
    // Clear local auth storage in mock environment
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  it("registers a new customer profile successfully", async () => {
    const res = await signUpUser({
      email: "newcustomer@example.com",
      password: "StrongPassword123!",
      fullName: "Jane Doe",
      phone: "+1 555-0199",
    });

    expect(res.error).toBeNull();
    expect(res.user).not.toBeNull();
    expect(res.user?.email).toBe("newcustomer@example.com");
    expect(res.user?.fullName).toBe("Jane Doe");
    expect(res.user?.role).toBe("customer");
  });

  it("authenticates an existing customer via signInUser", async () => {
    const res = await signInUser({
      email: "testclient@example.com",
      password: "Password123!",
    });

    expect(res.error).toBeNull();
    expect(res.user).toBeDefined();
    expect(res.user?.email).toBe("testclient@example.com");
  });

  it("correctly identifies admin users vs standard customers", async () => {
    const customerRes = await signInUser({
      email: "client@example.com",
      password: "Password123!",
    });
    expect(customerRes.user?.role).toBe("customer");

    const adminRes = await signInUser({
      email: "store.admin@example.com",
      password: "AdminPassword123!",
    });
    expect(adminRes.user?.role).toBe("admin");
  });

  it("updates customer profile information", async () => {
    await signInUser({
      email: "client@example.com",
      password: "Password123!",
    });

    const updateRes = await updateProfile({
      fullName: "Updated Name",
      phone: "+1 555-9988",
    });

    expect(updateRes.error).toBeNull();
    expect(updateRes.profile?.fullName).toBe("Updated Name");
    expect(updateRes.profile?.phone).toBe("+1 555-9988");
  });

  it("signs out and clears active user session", async () => {
    await signInUser({
      email: "client@example.com",
      password: "Password123!",
    });

    const signoutRes = await signOutUser();
    expect(signoutRes.error).toBeNull();

    const current = await getCurrentUser();
    expect(current).toBeNull();
  });
});
