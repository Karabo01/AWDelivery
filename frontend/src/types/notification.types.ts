export enum NotificationTemplateType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  DELAY_ALERT = 'DELAY_ALERT',
}

export interface NotificationLog {
  readonly id: string
  readonly orderId: string
  readonly recipientEmail: string
  readonly messageType: NotificationTemplateType
  readonly content: string
  readonly sentAt: string
  readonly deliveryStatus: string
}
