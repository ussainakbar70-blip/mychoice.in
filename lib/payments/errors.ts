/**
 * Typed Payment Errors and Safe Message Sanitization
 */

export class PaymentError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isSafeToExpose: boolean;

  constructor(message: string, code = "PAYMENT_ERROR", statusCode = 400, isSafeToExpose = false) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.statusCode = statusCode;
    this.isSafeToExpose = isSafeToExpose;
  }
}

export class PaymentValidationError extends PaymentError {
  constructor(message: string) {
    super(message, "PAYMENT_VALIDATION_FAILED", 400, true);
    this.name = "PaymentValidationError";
  }
}

export class PaymentVerificationError extends PaymentError {
  constructor(message = "Payment verification failed. Invalid cryptographic signature.") {
    super(message, "PAYMENT_SIGNATURE_INVALID", 400, true);
    this.name = "PaymentVerificationError";
  }
}

export class PaymentAmountMismatchError extends PaymentError {
  constructor(clientAmount: number, serverAmount: number) {
    super(
      `Price validation mismatch detected. Server recalculated total is $${serverAmount}, received $${clientAmount}.`,
      "PAYMENT_AMOUNT_MISMATCH",
      400,
      true
    );
    this.name = "PaymentAmountMismatchError";
  }
}

export class PaymentStateTransitionError extends PaymentError {
  constructor(fromState: string, toState: string) {
    super(
      `Illegal payment state transition from "${fromState}" to "${toState}".`,
      "PAYMENT_ILLEGAL_STATE_TRANSITION",
      409,
      false
    );
    this.name = "PaymentStateTransitionError";
  }
}

export class PaymentRefundError extends PaymentError {
  constructor(message: string) {
    super(message, "PAYMENT_REFUND_FAILED", 400, true);
    this.name = "PaymentRefundError";
  }
}

export class PaymentGatewayError extends PaymentError {
  constructor(message: string, statusCode = 502) {
    super(message, "GATEWAY_COMMUNICATION_ERROR", statusCode, false);
    this.name = "PaymentGatewayError";
  }
}

/**
 * Sanitizes errors for user-facing responses.
 * Never leaks database details, stack traces, or gateway secret keys.
 */
export function formatSafePaymentErrorMessage(error: unknown): string {
  if (error instanceof PaymentError && error.isSafeToExpose) {
    return error.message;
  }

  // Safe fallback messages
  return "Unable to process payment securely. Please check your payment details or try another payment method.";
}
