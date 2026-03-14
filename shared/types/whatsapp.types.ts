export enum WhatsappTemplateType {
  ORDER_CONFIRMATION = "ORDER_CONFIRMATION",
  PICKUP_SCHEDULED = "PICKUP_SCHEDULED",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  DELAY_ALERT = "DELAY_ALERT",
}

export interface WhatsappLog {
  readonly id: string;
  readonly orderId: string;
  /** Recipient phone in E.164 format */
  readonly recipientPhone: string;
  readonly messageType: WhatsappTemplateType;
  readonly content: string;
  readonly sentAt: string;
  readonly deliveryStatus: string;
}
