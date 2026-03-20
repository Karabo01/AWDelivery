import { OrderStatus } from "@prisma/client";

/**
 * Allowed status transitions. PENDING_PAYMENT → CONFIRMED only happens
 * via the PayFast webhook, never through admin actions directly.
 */
const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.CONFIRMED]: [OrderStatus.PICKUP_SCHEDULED],
  [OrderStatus.PICKUP_SCHEDULED]: [OrderStatus.PICKED_UP],
  [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
  [OrderStatus.IN_TRANSIT]: [
    OrderStatus.DELIVERED,
    OrderStatus.FAILED,
    OrderStatus.DELAYED,
  ],
  [OrderStatus.DELAYED]: [OrderStatus.IN_TRANSIT],
};

export function isValidTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}
