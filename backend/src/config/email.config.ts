import type { NotificationTemplateType } from "@prisma/client";

interface EmailTemplate {
  subject: string;
  html: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://awdelivery.co.za:5173";

export function getEmailTemplate(
  templateType: NotificationTemplateType,
  data: Record<string, string>,
): EmailTemplate {
  switch (templateType) {
    case "OTP_VERIFICATION":
      return {
        subject: "Your AWDelivery Verification Code",
        html: otpTemplate(data.code || ""),
      };
    case "ORDER_CONFIRMATION":
      return {
        subject: `Order ${data.trackingNumber || ""} Confirmed`,
        html: orderConfirmationTemplate(data.trackingNumber || ""),
      };
    case "PICKUP_SCHEDULED":
      return {
        subject: `Pickup Scheduled — ${data.trackingNumber || ""}`,
        html: simpleNotificationTemplate(
          "Pickup Scheduled",
          `Pickup has been scheduled for your order <strong>${data.trackingNumber}</strong>.${data.scheduledDate ? ` Scheduled date: ${data.scheduledDate}.` : ""}${data.driverName ? ` Driver: ${data.driverName}.` : ""}`,
        ),
      };
    case "PICKED_UP":
      return {
        subject: `Parcel Picked Up — ${data.trackingNumber || ""}`,
        html: simpleNotificationTemplate(
          "Parcel Picked Up",
          `Your parcel for order <strong>${data.trackingNumber}</strong> has been collected and is on its way.`,
        ),
      };
    case "IN_TRANSIT":
      return {
        subject: `Parcel In Transit — ${data.trackingNumber || ""}`,
        html: inTransitTemplate(data),
      };
    case "DELIVERED":
      return {
        subject: `Parcel Delivered — ${data.trackingNumber || ""}`,
        html: simpleNotificationTemplate(
          "Parcel Delivered",
          `Your order <strong>${data.trackingNumber}</strong> has been successfully delivered. Thank you for using AWDelivery!`,
        ),
      };
    case "DELAY_ALERT":
      return {
        subject: `Delivery Delayed — ${data.trackingNumber || ""}`,
        html: simpleNotificationTemplate(
          "Delivery Delayed",
          `Your order <strong>${data.trackingNumber}</strong> has been delayed.${data.reason ? ` Reason: ${data.reason}.` : ""}${data.newEstimate ? ` New estimate: ${data.newEstimate}.` : ""} We apologise for the inconvenience.`,
        ),
      };
    case "DRIVER_ASSIGNMENT":
      return {
        subject: `New Delivery Assignment — ${data.trackingNumber || ""}`,
        html: driverAssignmentTemplate(data),
      };
    case "ADMIN_NEW_ORDER":
      return {
        subject: `Action Required \u2014 Order ${data.trackingNumber || ""} Needs a Driver`,
        html: adminNewOrderTemplate(data),
      };
    default:
      return {
        subject: "AWDelivery Notification",
        html: simpleNotificationTemplate("Notification", "You have a new notification from AWDelivery."),
      };
  }
}

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background-color:#18181b;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">AWDelivery</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">&copy; 2026 AWDelivery. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpTemplate(code: string): string {
  return baseLayout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Verification Code</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.5;">
      Use the code below to verify your AWDelivery account. This code expires in 5 minutes.
    </p>
    <div style="text-align:center;padding:16px;background-color:#f4f4f5;border-radius:8px;margin-bottom:24px;">
      <span style="font-size:32px;font-weight:700;letter-spacing:6px;color:#18181b;">${code}</span>
    </div>
    <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
      If you did not request this code, please ignore this email.
    </p>
  `);
}

function orderConfirmationTemplate(trackingNumber: string): string {
  return baseLayout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Order Confirmed</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.5;">
      Your order has been confirmed and payment received. Your tracking number is:
    </p>
    <div style="text-align:center;padding:16px;background-color:#f4f4f5;border-radius:8px;margin-bottom:24px;">
      <span style="font-size:24px;font-weight:700;color:#18181b;">${trackingNumber}</span>
    </div>
    <p style="margin:0;font-size:14px;color:#52525b;line-height:1.5;">
      You can track your delivery at any time using the tracking page on our website.
    </p>
  `);
}

function driverAssignmentTemplate(data: Record<string, string>): string {
  return baseLayout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">New Delivery Assignment</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.5;">
      You have been assigned order <strong>${data.trackingNumber || "N/A"}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;font-size:14px;color:#52525b;line-height:1.6;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;"><strong>Sender</strong></td>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;">${data.senderName || "N/A"} — ${data.senderPhone || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;"><strong>Receiver Phone</strong></td>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;">${data.receiverPhone || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;"><strong>Pickup</strong></td>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;">${data.pickupAddress || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;"><strong>Delivery</strong></td>
        <td style="padding:8px 0;">${data.deliveryAddress || "N/A"}</td>
      </tr>
    </table>
  `);
}

function inTransitTemplate(data: Record<string, string>): string {
  return baseLayout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Your Parcel Is On Its Way!</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.5;">
      A parcel sent by <strong>${data.senderName || "the sender"}</strong> is now in transit and heading your way.
    </p>
    <div style="padding:16px;background-color:#f4f4f5;border-radius:8px;margin-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#52525b;line-height:1.6;">
        <tr>
          <td style="padding:4px 0;"><strong>Tracking Number</strong></td>
          <td style="padding:4px 0;text-align:right;"><strong>${data.trackingNumber || "N/A"}</strong></td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><strong>Sender</strong></td>
          <td style="padding:4px 0;text-align:right;">${data.senderName || "N/A"}</td>
        </tr>
      </table>
    </div>
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.5;">
      If you need any assistance, please don\u2019t hesitate to contact us:
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;">
      \ud83d\udcde <a href="tel:+27823855533" style="color:#18181b;text-decoration:none;font-weight:600;">082 385 5533</a>
    </p>
    <p style="margin:0;font-size:14px;color:#52525b;">
      \u2709\ufe0f <a href="mailto:orders@awdelivery.co.za" style="color:#18181b;text-decoration:none;font-weight:600;">orders@awdelivery.co.za</a>
    </p>
  `);
}

function adminNewOrderTemplate(data: Record<string, string>): string {
  const loginUrl = `${FRONTEND_URL}/login`;
  return baseLayout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Order Confirmed \u2014 Driver Needed</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.5;">
      A new order <strong>${data.trackingNumber || "N/A"}</strong> has been placed and payment has been confirmed.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.5;">
      Please log in to the admin dashboard and assign a driver for this delivery.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${loginUrl}" style="display:inline-block;padding:12px 32px;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Log in &amp; Assign Driver</a>
    </div>
    <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
      This is an automated notification. If the driver has already been assigned, you can ignore this email.
    </p>
  `);
}

function simpleNotificationTemplate(title: string, message: string): string {
  return baseLayout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">${title}</h2>
    <p style="margin:0;font-size:14px;color:#52525b;line-height:1.5;">${message}</p>
  `);
}
