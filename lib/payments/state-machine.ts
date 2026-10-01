/**
 * Payment & Order State Machine
 * 
 * Guarantees strict, unidirectional and validated state transitions.
 * Prevents invalid state jumps (e.g. refunded -> captured, failed -> refunded).
 */

import { PaymentStatus, OrderPaymentStatus } from "./types";
import { PaymentStateTransitionError } from "./errors";

// Allowed transitions for payments table
const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  created: ["pending", "cancelled", "failed"],
  pending: ["authorized", "captured", "failed", "cancelled"],
  authorized: ["captured", "failed", "cancelled"],
  captured: ["partially_refunded", "refunded", "disputed"],
  succeeded: ["partially_refunded", "refunded", "disputed"], // Alias for captured
  failed: ["captured"], // Allowed only via authoritative admin reconciliation if provider actually captured
  cancelled: [],
  partially_refunded: ["partially_refunded", "refunded"],
  refunded: [],
  disputed: ["refunded", "captured"],
};

// Allowed transitions for order.payment_status
const ALLOWED_ORDER_PAYMENT_TRANSITIONS: Record<string, string[]> = {
  unpaid: ["pending", "pending_payment", "cancelled"],
  pending: ["pending_payment", "paid", "failed", "cancelled", "manual_review"],
  pending_payment: ["paid", "failed", "cancelled", "manual_review"],
  paid: ["partially_refunded", "refunded", "manual_review"],
  partially_refunded: ["partially_refunded", "refunded"],
  refunded: [],
  failed: ["pending_payment", "paid"], // Allowed on customer retry or reconciliation
  cancelled: [],
  manual_review: ["paid", "refunded", "cancelled"],
};

/**
 * Checks if a transition between payment states is valid.
 */
export function isValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true; // Idempotent no-op
  const allowed = ALLOWED_PAYMENT_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

/**
 * Asserts valid payment transition or throws typed error.
 */
export function assertValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!isValidPaymentTransition(from, to)) {
    throw new PaymentStateTransitionError(from, to);
  }
}

/**
 * Checks if a transition between order payment statuses is valid.
 */
export function isValidOrderPaymentTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_ORDER_PAYMENT_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

/**
 * Asserts valid order payment status transition.
 */
export function assertValidOrderPaymentTransition(from: string, to: string): void {
  if (!isValidOrderPaymentTransition(from, to)) {
    throw new PaymentStateTransitionError(from, to);
  }
}
