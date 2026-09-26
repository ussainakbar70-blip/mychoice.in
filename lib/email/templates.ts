import { EmailTemplateType } from "./types";
import { SITE_CONFIG } from "../config/site";

function baseLayout(content: string, preheader: string = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_CONFIG.brandName}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0A0A0A; color: #171717; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #F8F9FA; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background-color: #0A0A0A; padding: 32px 40px; text-align: center; }
    .logo-text { font-size: 20px; font-weight: 800; letter-spacing: 3px; color: #FFFFFF; margin: 0; }
    .logo-gold { color: #D4AF37; }
    .content { padding: 40px; }
    .h1 { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0; letter-spacing: -0.02em; }
    .p { font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 24px 0; }
    .button { display: inline-block; background-color: #0A0A0A; color: #FFFFFF !important; font-size: 13px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; letter-spacing: 0.5px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .badge-gold { background-color: #FEF3C7; color: #92400E; }
    .badge-green { background-color: #D1FAE5; color: #065F46; }
    .footer { padding: 24px 40px; text-align: center; background-color: #F9FAFB; border-top: 1px solid #F3F4F6; }
    .footer-text { font-size: 11px; color: #9CA3AF; margin: 0 0 8px 0; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <table class="wrapper" role="presentation">
    <tr>
      <td align="center">
        <div class="container">
          <div class="header">
            <h2 class="logo-text">MYCHOICE<span class="logo-gold">.in</span></h2>
            <div style="font-size: 9px; letter-spacing: 2px; color: #A3A3A3; margin-top: 4px; text-transform: uppercase;">Curated Global Living</div>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p class="footer-text">&copy; ${new Date().getFullYear()} ${SITE_CONFIG.brandLegalName}. All rights reserved.</p>
            <p class="footer-text">${SITE_CONFIG.contact.address}</p>
            <p class="footer-text">Questions? Contact <a href="mailto:${SITE_CONFIG.contact.supportEmail}" style="color:#D4AF37;text-decoration:none;">${SITE_CONFIG.contact.supportEmail}</a></p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailTemplate(template: EmailTemplateType, data: Record<string, any>): { subject: string; html: string } {
  switch (template) {
    case "order_confirmation": {
      const { orderNumber, total, items, customerName, shippingAddress } = data;
      const subject = `Order Confirmed: ${orderNumber} | MYCHOICE.in`;
      const html = baseLayout(`
        <div style="margin-bottom: 20px;"><span class="badge badge-green">Order Confirmed</span></div>
        <h1 class="h1">Thank you for your order, ${customerName || "Valued Client"}.</h1>
        <p class="p">We are preparing your curated selection. Your order reference is <strong>${orderNumber}</strong>.</p>
        <div style="background-color: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6B7280; margin-bottom: 12px;">Order Summary</div>
          ${items ? items.map((i: any) => `
            <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">
              <span>${i.productName} (x${i.quantity})</span>
              <span style="font-weight: 600;">$${i.totalPrice?.toFixed(2) || i.price}</span>
            </div>
          `).join("") : ""}
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; padding-top: 12px;">
            <span>Total Paid</span>
            <span style="color: #D4AF37;">$${Number(total || 0).toFixed(2)}</span>
          </div>
        </div>
        <a href="${SITE_CONFIG.siteUrl}/track-order?order_number=${orderNumber}" class="button">Track Your Shipment</a>
      `, `Your order ${orderNumber} is confirmed.`);
      return { subject, html };
    }

    case "order_processing": {
      const { orderNumber } = data;
      const subject = `Order Processing: ${orderNumber} | MYCHOICE.in`;
      const html = baseLayout(`
        <div style="margin-bottom: 20px;"><span class="badge badge-gold">In Processing</span></div>
        <h1 class="h1">Your items are being hand-inspected.</h1>
        <p class="p">Our quality fulfillment team is preparing order <strong>${orderNumber}</strong> for dispatch. You will receive tracking details once the courier collects your parcel.</p>
        <a href="${SITE_CONFIG.siteUrl}/track-order?order_number=${orderNumber}" class="button">View Order Status</a>
      `, `Order ${orderNumber} is currently processing.`);
      return { subject, html };
    }

    case "order_shipped": {
      const { orderNumber, trackingNumber, trackingUrl, carrier } = data;
      const subject = `Shipped: Your order ${orderNumber} is on the way | MYCHOICE.in`;
      const html = baseLayout(`
        <div style="margin-bottom: 20px;"><span class="badge badge-green">In Transit</span></div>
        <h1 class="h1">Your shipment is on its way.</h1>
        <p class="p">Order <strong>${orderNumber}</strong> has been handed to our express courier partner ${carrier ? `(${carrier})` : ""}.</p>
        <div style="background-color: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700;">Waybill / Tracking Code</div>
          <div style="font-size: 18px; font-family: monospace; font-weight: 700; color: #111827; margin: 8px 0;">${trackingNumber || "Pending Courier Scan"}</div>
        </div>
        <a href="${trackingUrl || `${SITE_CONFIG.siteUrl}/track-order?order_number=${orderNumber}`}" class="button">Track Package</a>
      `, `Package dispatched for order ${orderNumber}.`);
      return { subject, html };
    }

    case "order_delivered": {
      const { orderNumber } = data;
      const subject = `Delivered: Your package has arrived | MYCHOICE.in`;
      const html = baseLayout(`
        <div style="margin-bottom: 20px;"><span class="badge badge-green">Delivered</span></div>
        <h1 class="h1">Your package has arrived.</h1>
        <p class="p">Courier telemetry indicates order <strong>${orderNumber}</strong> has been delivered to your destination address. We hope you cherish your new essentials.</p>
        <a href="${SITE_CONFIG.siteUrl}/account" class="button">Visit Account Portal</a>
      `, `Order ${orderNumber} has been delivered.`);
      return { subject, html };
    }

    case "refund_issued": {
      const { orderNumber, amount } = data;
      const subject = `Refund Notification: ${orderNumber} | MYCHOICE.in`;
      const html = baseLayout(`
        <h1 class="h1">Refund Confirmation</h1>
        <p class="p">A refund of <strong>$${Number(amount || 0).toFixed(2)}</strong> has been initiated for order <strong>${orderNumber}</strong>. Depending on your financial institution, funds will appear in 3–5 business days.</p>
      `, `Refund processed for order ${orderNumber}.`);
      return { subject, html };
    }

    case "password_reset": {
      const { resetUrl } = data;
      const subject = `Reset Your Password | MYCHOICE.in`;
      const html = baseLayout(`
        <h1 class="h1">Password Reset Request</h1>
        <p class="p">We received a request to update the password for your MYCHOICE account. Click the secure link below to establish a new password:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p class="p" style="margin-top: 24px; font-size: 12px; color: #9CA3AF;">If you did not request this, please disregard this email.</p>
      `, "Password reset link for your MYCHOICE account.");
      return { subject, html };
    }

    case "welcome_email": {
      const { name } = data;
      const subject = `Welcome to MYCHOICE.in | Curated Essentials`;
      const html = baseLayout(`
        <h1 class="h1">Welcome, ${name || "Friend"}.</h1>
        <p class="p">Welcome to the MYCHOICE collective. We curate high-design, precision-engineered essentials across home, wellness, and modern technology.</p>
        <p class="p">Use privilege code <strong style="color:#D4AF37;">WELCOME10</strong> for 10% off your inaugural order.</p>
        <a href="${SITE_CONFIG.siteUrl}/shop" class="button">Explore Collections</a>
      `, "Welcome to MYCHOICE.in - Discover curated living.");
      return { subject, html };
    }

    case "contact_confirmation": {
      const { name, ticketId } = data;
      const subject = `We received your message [Ticket #${ticketId || "MC"}] | MYCHOICE.in`;
      const html = baseLayout(`
        <h1 class="h1">Message Received</h1>
        <p class="p">Dear ${name}, our client concierge team has logged your inquiry. An advisor will review your notes and respond within one business day.</p>
      `, "Your inquiry to MYCHOICE concierge has been received.");
      return { subject, html };
    }

    default:
      return {
        subject: `Notification from ${SITE_CONFIG.brandName}`,
        html: baseLayout(`<p class="p">You have a notification from ${SITE_CONFIG.brandName}.</p>`),
      };
  }
}
