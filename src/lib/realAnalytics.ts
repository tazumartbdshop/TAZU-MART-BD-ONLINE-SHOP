// /src/lib/realAnalytics.ts
// 100% Real, Privacy-Conscious, Non-blocking Website Analytics Tracker for TAZU MART BD

export interface AnalyticsPayload {
  eventType: 
    | 'session_start'
    | 'page_view'
    | 'product_view'
    | 'add_to_cart'
    | 'checkout_start'
    | 'order_created'
    | 'order_completed'
    | 'login'
    | 'signup';
  path?: string;
  title?: string;
  referrer?: string;
  metadata?: Record<string, any>;
  userId?: string | null;
  userName?: string | null;
}

class RealAnalytics {
  private visitorId: string = '';
  private sessionId: string = '';
  private isInitialized: boolean = false;
  private heartbeatInterval: any = null;
  private lastTrackedPath: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initIds();
    }
  }

  private initIds() {
    try {
      // 1. Persistent Anonymous Visitor ID (localStorage)
      let vid = localStorage.getItem('tazu_vid');
      if (!vid) {
        vid = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('tazu_vid', vid);
      }
      this.visitorId = vid;

      // 2. Session ID (sessionStorage)
      let sid = sessionStorage.getItem('tazu_sid');
      if (!sid) {
        sid = 's_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        sessionStorage.setItem('tazu_sid', sid);
      }
      this.sessionId = sid;
    } catch {
      this.visitorId = 'v_fallback_' + Date.now();
      this.sessionId = 's_fallback_' + Date.now();
    }
  }

  // Check if current page is an admin or internal URL
  private isAdminOrInternal(): boolean {
    if (typeof window === 'undefined') return true;
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin') || path.includes('/admin/')) {
      return true;
    }
    return false;
  }

  // Get current logged in customer info if available
  private getAuthUser(): { id: string | null; name: string | null } {
    try {
      if (typeof window === 'undefined') return { id: null, name: null };
      const raw = localStorage.getItem('tazu-auth-user') || localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        const user = parsed.state?.user || parsed.user || parsed;
        if (user && (user.id || user.uid)) {
          return {
            id: user.id || user.uid,
            name: user.name || user.displayName || user.email || 'Customer',
          };
        }
      }
    } catch {}
    return { id: null, name: null };
  }

  // Generate unique event ID for deduplication
  private generateEventId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 8)}_${Date.now()}`;
  }

  // Non-blocking asynchronous dispatch
  private sendEvent(payload: AnalyticsPayload) {
    if (typeof window === 'undefined') return;

    // Do not track Admin dashboard activity as public customer traffic
    if (this.isAdminOrInternal()) return;

    // Non-blocking deferred dispatch using setTimeout 0
    setTimeout(() => {
      try {
        const auth = this.getAuthUser();
        const currentPath = payload.path || window.location.pathname;
        const now = new Date();

        const eventBody = {
          eventId: this.generateEventId(payload.eventType),
          sessionId: this.sessionId,
          visitorId: this.visitorId,
          userId: payload.userId || auth.id,
          userName: payload.userName || auth.name,
          eventType: payload.eventType,
          path: currentPath,
          title: payload.title || document.title || 'TAZU MART BD',
          referrer: payload.referrer || document.referrer || '',
          timestamp: now.toISOString(),
          dateString: now.toISOString().split('T')[0],
          device: {
            isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
            screen: `${window.innerWidth}x${window.innerHeight}`,
            userAgent: navigator.userAgent,
          },
          metadata: payload.metadata || {},
        };

        const jsonStr = JSON.stringify(eventBody);

        // Prefer sendBeacon for unblockable fire-and-forget
        if (navigator.sendBeacon) {
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const sent = navigator.sendBeacon('/api/analytics/event', blob);
          if (sent) return;
        }

        // Fallback to fetch with keepalive
        fetch('/api/analytics/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: jsonStr,
          keepalive: true,
        }).catch(() => {});
      } catch (err) {
        // Silently catch to never break customer experience
      }
    }, 0);
  }

  // Send live heartbeat ping
  private sendHeartbeat() {
    if (typeof window === 'undefined') return;
    if (this.isAdminOrInternal()) return;
    if (document.visibilityState === 'hidden') return;

    const auth = this.getAuthUser();
    const payload = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      userId: auth.id,
      userName: auth.name,
      currentPath: window.location.pathname,
      pageTitle: document.title || 'TAZU MART BD',
      device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      referrer: document.referrer || '',
    };

    const jsonStr = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/heartbeat', blob);
    } else {
      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr,
        keepalive: true,
      }).catch(() => {});
    }
  }

  // Public Methods
  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;
    this.initIds();

    if (this.isAdminOrInternal()) return;

    // Check if session_start has already been logged in this session
    const sessionStarted = sessionStorage.getItem('tazu_session_started');
    if (!sessionStarted) {
      sessionStorage.setItem('tazu_session_started', 'true');
      this.sendEvent({
        eventType: 'session_start',
        path: window.location.pathname,
        title: document.title,
      });
    }

    // Initial page view
    this.trackPageView(window.location.pathname, document.title);

    // Start Live Heartbeat Loop (every 25s)
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.sendHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);

    // Heartbeat on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.sendHeartbeat();
      }
    });
  }

  public trackPageView(path: string, title?: string, referrer?: string) {
    if (this.isAdminOrInternal()) return;
    if (this.lastTrackedPath === path) return;
    this.lastTrackedPath = path;

    this.sendEvent({
      eventType: 'page_view',
      path,
      title: title || document.title,
      referrer,
    });
    this.sendHeartbeat();
  }

  public trackProductView(product: {
    id: string | number;
    name: string;
    category?: string;
    price?: number;
    image?: string;
  }) {
    if (this.isAdminOrInternal()) return;
    this.sendEvent({
      eventType: 'product_view',
      path: window.location.pathname,
      title: product.name,
      metadata: {
        productId: String(product.id),
        productName: product.name,
        category: product.category || 'General',
        price: product.price || 0,
        image: product.image || '',
      },
    });
  }

  public trackAddToCart(item: {
    id: string | number;
    name: string;
    price: number;
    quantity?: number;
    category?: string;
  }) {
    if (this.isAdminOrInternal()) return;
    this.sendEvent({
      eventType: 'add_to_cart',
      metadata: {
        productId: String(item.id),
        productName: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        category: item.category || 'General',
      },
    });
  }

  public trackCheckoutStart(items: any[], totalAmount: number) {
    if (this.isAdminOrInternal()) return;
    this.sendEvent({
      eventType: 'checkout_start',
      metadata: {
        itemCount: items?.length || 0,
        total: totalAmount,
      },
    });
  }

  public trackOrderPlaced(order: {
    orderId?: string;
    total: number;
    itemCount?: number;
    paymentMethod?: string;
  }) {
    if (this.isAdminOrInternal()) return;
    this.sendEvent({
      eventType: 'order_created',
      metadata: {
        orderId: order.orderId,
        total: order.total,
        itemCount: order.itemCount || 1,
        paymentMethod: order.paymentMethod,
      },
    });
  }

  public trackLogin(user: { id?: string; email?: string; name?: string }) {
    if (this.isAdminOrInternal()) return;
    this.sendEvent({
      eventType: 'login',
      userId: user.id,
      userName: user.name || user.email,
      metadata: {
        email: user.email,
      },
    });
  }

  public trackSignup(user: { id?: string; email?: string; name?: string }) {
    if (this.isAdminOrInternal()) return;
    this.sendEvent({
      eventType: 'signup',
      userId: user.id,
      userName: user.name || user.email,
      metadata: {
        email: user.email,
      },
    });
  }
}

export const realAnalytics = new RealAnalytics();
