import { DomainEvent } from '../events/events.module';

export interface NotificationContent {
  title: string;
  body: string;
  linkPath: string | null;
}

export function buildNotificationContent(event: DomainEvent): NotificationContent | null {
  const data = event.data;

  switch (event.type) {
    case 'order.created': {
      const invoiceNo = String(data.invoiceNo ?? '');
      return {
        title: 'Order placed',
        body: invoiceNo
          ? `Your order ${invoiceNo} was created and is awaiting payment.`
          : 'Your order was created and is awaiting payment.',
        linkPath: '/orders',
      };
    }
    case 'order.status_changed': {
      const invoiceNo = String(data.invoiceNo ?? '');
      const status = String(data.status ?? '').toUpperCase();
      if (status === 'PAID') {
        return {
          title: 'Payment received',
          body: invoiceNo
            ? `Order ${invoiceNo} is paid. Your downloads are ready in Library.`
            : 'Your payment was received. Check Library for downloads.',
          linkPath: '/library',
        };
      }
      if (status === 'FAILED') {
        return {
          title: 'Payment failed',
          body: invoiceNo
            ? `Payment for order ${invoiceNo} could not be completed.`
            : 'Your payment could not be completed.',
          linkPath: '/orders',
        };
      }
      return {
        title: 'Order updated',
        body: invoiceNo
          ? `Order ${invoiceNo} status changed to ${status || 'updated'}.`
          : 'Your order status was updated.',
        linkPath: '/orders',
      };
    }
    case 'product.favorited': {
      const productName = String(data.productName ?? 'your listing');
      const buyerEmail = String(data.buyerEmail ?? 'Someone');
      const productId = data.productId ? String(data.productId) : null;
      return {
        title: 'New favorite',
        body: `${buyerEmail} favorited "${productName}".`,
        linkPath: productId ? `/dashboard` : '/dashboard',
      };
    }
    case 'review.created': {
      const productName = String(data.productName ?? 'a product');
      const reviewerName = String(data.reviewerName ?? 'A buyer');
      const rating = data.rating != null ? `${data.rating}★ ` : '';
      const productId = data.productId ? String(data.productId) : null;
      return {
        title: 'New review',
        body: `${reviewerName} left a ${rating}review on "${productName}".`,
        linkPath: productId ? `/products/${productId}/reviews` : null,
      };
    }
    case 'review.replied': {
      const productName = String(data.productName ?? 'a product');
      const replierName = String(data.replierName ?? 'Someone');
      const productId = data.productId ? String(data.productId) : null;
      return {
        title: 'Review reply',
        body: `${replierName} replied to your review on "${productName}".`,
        linkPath: productId ? `/products/${productId}/reviews` : null,
      };
    }
    default:
      return null;
  }
}
