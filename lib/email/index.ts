import { EmailProvider, EmailPayload, EmailSendResult } from "./types";
import { renderEmailTemplate } from "./templates";

export * from "./types";
export * from "./templates";

export class DevelopmentEmailProvider implements EmailProvider {
  name = "development";

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    const { subject } = renderEmailTemplate(payload.template, payload.data);
    const mockMessageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    console.log(`[Email Service - DEV] Sent "${payload.template}" to ${payload.to.email}`);
    console.log(`[Email Service - DEV] Subject: "${subject}" | Message ID: ${mockMessageId}`);

    return {
      success: true,
      messageId: mockMessageId,
      provider: "development-mock",
    };
  }
}

export class ProductionRestEmailProvider implements EmailProvider {
  name = "production-rest";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    const { subject, html } = renderEmailTemplate(payload.template, payload.data);

    try {
      // Clean generic REST adapter compatible with Resend / Postmark / SendGrid APIs
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "concierge@mychoice.in",
          to: [payload.to.email],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Email provider error: ${errorText}`,
          provider: "resend",
        };
      }

      const resData = await response.json();
      return {
        success: true,
        messageId: resData.id,
        provider: "resend",
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown email transport error",
        provider: "resend",
      };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  if (apiKey && process.env.EMAIL_PROVIDER !== "development") {
    return new ProductionRestEmailProvider(apiKey);
  }
  return new DevelopmentEmailProvider();
}

export const emailService = {
  async send(payload: EmailPayload): Promise<EmailSendResult> {
    if (!payload.to?.email || !payload.to.email.trim()) {
      return {
        success: true,
        messageId: "skipped_no_email",
        provider: "skipped",
      };
    }
    const provider = getEmailProvider();
    return await provider.sendEmail(payload);
  },
};
