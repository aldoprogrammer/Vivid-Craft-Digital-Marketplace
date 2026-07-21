/** BullMQ custom job IDs must not contain ":" */
export function paymentJobId(orderId: string): string {
  return `payment-${orderId}`;
}

export function dlqJobId(orderId: string, originalJobId: string): string {
  return `dlq-${orderId}-${originalJobId}`;
}
