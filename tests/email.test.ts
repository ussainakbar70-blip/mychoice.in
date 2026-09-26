import { describe, it, expect } from "vitest";
import { renderEmailTemplate } from "@/lib/email/templates";
import { emailService } from "@/lib/email";

describe("Transactional Email Subsystem", () => {
  it("renders order_confirmation template with luxury layout & details", () => {
    const { subject, html } = renderEmailTemplate("order_confirmation", {
      orderNumber: "ORD-2026-10001",
      customerName: "Alex Mercer",
      total: 116.0,
      items: [
        { productName: "Ultrasonic Diffuser", quantity: 2, totalPrice: 116.0 },
      ],
    });

    expect(subject).toContain("ORD-2026-10001");
    expect(html).toContain("MYCHOICE");
    expect(html).toContain("Alex Mercer");
    expect(html).toContain("$116.00");
    expect(html).toContain("Ultrasonic Diffuser");
  });

  it("renders order_shipped template with tracking link", () => {
    const { subject, html } = renderEmailTemplate("order_shipped", {
      orderNumber: "ORD-2026-10001",
      trackingNumber: "CJTRACK998877",
      carrier: "DHL Express",
    });

    expect(subject).toContain("Shipped");
    expect(html).toContain("CJTRACK998877");
    expect(html).toContain("DHL Express");
  });

  it("sends email successfully using the development provider", async () => {
    const res = await emailService.send({
      to: { email: "customer@example.com", name: "Jane Doe" },
      subject: "Test Notification",
      template: "welcome_email",
      data: { name: "Jane" },
    });

    expect(res.success).toBe(true);
    expect(res.provider).toBe("development-mock");
    expect(res.messageId).toBeDefined();
  });
});
