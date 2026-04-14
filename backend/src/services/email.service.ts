import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import prisma from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { getEmailTemplate } from "../config/email.config.js";
import type { NotificationTemplateType } from "@prisma/client";

let transporter: Transporter;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendNotificationEmail(
  recipientEmail: string,
  templateType: NotificationTemplateType,
  data: Record<string, string> = {},
  orderId?: string,
): Promise<{ id: string; deliveryStatus: string }> {
  const template = getEmailTemplate(templateType, data);

  try {
    console.log(
      `[Email] Sending ${templateType} to ${recipientEmail}${orderId ? ` for order ${orderId}` : ""}`,
    );

    await getTransporter().sendMail({
      from: `"AWDelivery" <${env.EMAIL_FROM}>`,
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
    });

    console.log(`[Email] ${templateType} sent to ${recipientEmail}`);

    const log = await prisma.notificationLog.create({
      data: {
        orderId,
        recipientEmail,
        messageType: templateType,
        content: JSON.stringify({ templateType, data }),
        deliveryStatus: "sent",
      },
    });

    return { id: log.id, deliveryStatus: "sent" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Email] Failed to send ${templateType} to ${recipientEmail}:`, errorMessage);

    try {
      const log = await prisma.notificationLog.create({
        data: {
          orderId,
          recipientEmail,
          messageType: templateType,
          content: JSON.stringify({ templateType, data, error: errorMessage }),
          deliveryStatus: "failed",
        },
      });
      return { id: log.id, deliveryStatus: "failed" };
    } catch (dbError) {
      console.error(`[Email] Also failed to write notification log to DB:`, dbError instanceof Error ? dbError.message : String(dbError));
      return { id: "unknown", deliveryStatus: "failed" };
    }
  }
}

export async function sendOtpEmail(email: string, code: string) {
  const template = getEmailTemplate("OTP_VERIFICATION" as NotificationTemplateType, { code });

  try {
    console.log(`[Email] Sending OTP to ${email}`);

    await getTransporter().sendMail({
      from: `"AWDelivery" <${env.EMAIL_FROM}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`[Email] OTP sent to ${email}`);

    const log = await prisma.notificationLog.create({
      data: {
        recipientEmail: email,
        messageType: "OTP_VERIFICATION" as NotificationTemplateType,
        content: JSON.stringify({ templateType: "OTP_VERIFICATION" }),
        deliveryStatus: "sent",
      },
    });

    return { id: log.id, deliveryStatus: "sent" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Email] Failed to send OTP to ${email}:`, errorMessage);

    const log = await prisma.notificationLog.create({
      data: {
        recipientEmail: email,
        messageType: "OTP_VERIFICATION" as NotificationTemplateType,
        content: JSON.stringify({ templateType: "OTP_VERIFICATION", error: errorMessage }),
        deliveryStatus: "failed",
      },
    });

    return { id: log.id, deliveryStatus: "failed" };
  }
}
