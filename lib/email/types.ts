export type EmailTemplateType =
  | "order_confirmation"
  | "order_processing"
  | "order_shipped"
  | "order_delivered"
  | "refund_issued"
  | "password_reset"
  | "welcome_email"
  | "contact_confirmation";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailPayload {
  to: EmailRecipient;
  subject: string;
  template: EmailTemplateType;
  data: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface EmailProvider {
  name: string;
  sendEmail(payload: EmailPayload): Promise<EmailSendResult>;
}
