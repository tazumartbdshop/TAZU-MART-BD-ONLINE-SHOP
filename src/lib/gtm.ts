
export const generateEventId = (prefix = 'EVT'): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${randomStr}`;
};

export const pushEvent = (eventName: string, eventData: Record<string, any> = {}) => {
  const eventId = eventData.event_id || generateEventId();
  const enrichedData = {
    event: eventName,
    event_id: eventId,
    ...eventData,
    timestamp: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push(enrichedData);

    // If server-side tracking is active, asynchronously dispatch to server proxy endpoint for dual-delivery
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ eventName, payload: enrichedData })], { type: 'application/json' });
        navigator.sendBeacon('/api/admin/marketing/simulate-event', blob);
      } else {
        fetch('/api/admin/marketing/simulate-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName, payload: enrichedData }),
          keepalive: true
        }).catch(() => {});
      }
    } catch {}
  }

  return eventId;
};

// --- Standard E-commerce & User Event Helpers ---
export const trackPageView = (pageTitle?: string, pageLocation?: string) => {
  return pushEvent('page_view', {
    page_title: pageTitle || (typeof document !== 'undefined' ? document.title : ''),
    page_location: pageLocation || (typeof window !== 'undefined' ? window.location.href : ''),
  });
};

export const trackViewItem = (product: { id: string | number; name: string; price: number; category?: string }) => {
  return pushEvent('view_item', {
    currency: 'BDT',
    value: product.price,
    items: [{
      item_id: String(product.id),
      item_name: product.name,
      price: product.price,
      item_category: product.category || 'General',
      quantity: 1
    }]
  });
};

export const trackAddToCart = (product: { id: string | number; name: string; price: number; quantity?: number; category?: string }) => {
  const qty = product.quantity || 1;
  return pushEvent('add_to_cart', {
    currency: 'BDT',
    value: product.price * qty,
    items: [{
      item_id: String(product.id),
      item_name: product.name,
      price: product.price,
      item_category: product.category || 'General',
      quantity: qty
    }]
  });
};

export const trackBeginCheckout = (items: any[], totalValue: number) => {
  return pushEvent('begin_checkout', {
    currency: 'BDT',
    value: totalValue,
    items: items.map(i => ({
      item_id: String(i.id || i.product_id),
      item_name: i.name || i.title,
      price: i.price,
      quantity: i.quantity || 1
    }))
  });
};

export const trackPurchase = (order: { id: string | number; total: number; items?: any[]; customerEmail?: string; customerPhone?: string }) => {
  return pushEvent('purchase', {
    transaction_id: String(order.id),
    currency: 'BDT',
    value: order.total,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    items: (order.items || []).map(i => ({
      item_id: String(i.id || i.product_id),
      item_name: i.name || i.title,
      price: i.price,
      quantity: i.quantity || 1
    }))
  });
};

export const trackLogin = (method = 'Standard') => {
  return pushEvent('login', { method });
};

export const trackSignUp = (method = 'Standard') => {
  return pushEvent('sign_up', { method });
};

