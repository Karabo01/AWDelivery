import type { OrderStatus } from "./types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending payment",
  CONFIRMED: "Confirmed",
  PICKUP_SCHEDULED: "Pickup scheduled",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  DELAYED: "Delayed",
};

export interface StatusAction {
  label: string;
  next: OrderStatus;
  variant: "primary" | "danger" | "warning";
  requiresPod?: boolean;
}

export function nextActionsFor(status: OrderStatus): StatusAction[] {
  switch (status) {
    case "PICKUP_SCHEDULED":
      return [{ label: "Mark Picked Up", next: "PICKED_UP", variant: "primary" }];
    case "PICKED_UP":
      return [{ label: "Start Transit", next: "IN_TRANSIT", variant: "primary" }];
    case "IN_TRANSIT":
      return [
        { label: "Mark Delivered", next: "DELIVERED", variant: "primary", requiresPod: true },
        { label: "Report Delayed", next: "DELAYED", variant: "warning" },
        { label: "Report Failed", next: "FAILED", variant: "danger" },
      ];
    case "DELAYED":
      return [{ label: "Resume Transit", next: "IN_TRANSIT", variant: "primary" }];
    default:
      return [];
  }
}
