import fs from "fs/promises";
import path from "path";

// Types for Analytics Events
export interface AnalyticsEvent {
  eventId: string;
  sessionId: string;
  visitorId: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
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
  path: string;
  title?: string;
  referrer?: string;
  timestamp: string; // ISO string
  dateString: string; // YYYY-MM-DD
  device?: {
    userAgent?: string;
    isMobile?: boolean;
    browser?: string;
    os?: string;
    screen?: string;
  };
  metadata?: Record<string, any>;
}

export interface LiveSession {
  sessionId: string;
  visitorId: string;
  userId?: string | null;
  userName?: string | null;
  isLoggedIn: boolean;
  currentPath: string;
  pageTitle?: string;
  device?: string;
  ip?: string;
  firstSeen: number; // ms
  lastHeartbeat: number; // ms
  referrer?: string;
  eventsCount: number;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  visits: number;
  uniqueVisitors: number;
  visitorIds: string[];
  newAccounts: number;
  uniqueLoginUsers: number;
  loginUserIds: string[];
  loginEvents: number;
  productViews: number;
  productViewCounts: Record<string, { name: string; category?: string; count: number; image?: string }>;
  addToCartCount: number;
  checkoutCount: number;
  ordersCount: number;
  completedOrdersCount: number;
  revenue: number;
}

class AnalyticsEngine {
  private activeSessions: Map<string, LiveSession> = new Map();
  private processedEventIds: Set<string> = new Set();
  private recentEvents: AnalyticsEvent[] = [];
  private dailySummaries: Map<string, DailySummary> = new Map();
  private supabaseClient: any = null;
  private backupFilePath = path.join(process.cwd(), 'analytics_events_store.json');
  private isLoaded = false;
  private lastPersistTime = 0;

  constructor() {
    // Prune stale sessions every 20 seconds (session expires after 2 minutes of no heartbeat)
    setInterval(() => {
      this.pruneStaleSessions();
    }, 20000);

    // Periodic sync with Supabase / disk every 30 seconds
    setInterval(() => {
      this.persistAnalyticsStore().catch((err) => {
        console.warn("[Analytics Engine] Background persistence notice:", err?.message);
      });
    }, 30000);
  }

  public setSupabaseClient(client: any) {
    this.supabaseClient = client;
    this.initStore();
  }

  // Load existing persisted analytics summaries from Supabase settings or disk backup
  public async initStore() {
    if (this.isLoaded) return;
    try {
      // 1. Try to read from Supabase settings table
      if (this.supabaseClient) {
        const { data, error } = await this.supabaseClient
          .from('settings')
          .select('value')
          .eq('id', 'website_analytics_store_v1')
          .maybeSingle();

        if (data && data.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          this.hydrateFromObject(parsed);
          this.isLoaded = true;
          console.log(`[Analytics Engine] Successfully restored analytics data from Supabase settings.`);
          return;
        }
      }

      // 2. Fallback to reading disk backup file
      try {
        const raw = await fs.readFile(this.backupFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.hydrateFromObject(parsed);
        this.isLoaded = true;
        console.log(`[Analytics Engine] Restored analytics data from local backup file.`);
      } catch {
        // File doesn't exist yet, start clean
        this.isLoaded = true;
      }
    } catch (err) {
      console.warn("[Analytics Engine] Init store notice:", err);
      this.isLoaded = true;
    }
  }

  private hydrateFromObject(obj: any) {
    if (!obj) return;
    if (obj.dailySummaries && typeof obj.dailySummaries === 'object') {
      Object.entries(obj.dailySummaries).forEach(([date, val]: [string, any]) => {
        this.dailySummaries.set(date, {
          date,
          visits: Number(val.visits) || 0,
          uniqueVisitors: Number(val.uniqueVisitors) || (val.visitorIds?.length || 0),
          visitorIds: Array.isArray(val.visitorIds) ? val.visitorIds : [],
          newAccounts: Number(val.newAccounts) || 0,
          uniqueLoginUsers: Number(val.uniqueLoginUsers) || (val.loginUserIds?.length || 0),
          loginUserIds: Array.isArray(val.loginUserIds) ? val.loginUserIds : [],
          loginEvents: Number(val.loginEvents) || 0,
          productViews: Number(val.productViews) || 0,
          productViewCounts: val.productViewCounts || {},
          addToCartCount: Number(val.addToCartCount) || 0,
          checkoutCount: Number(val.checkoutCount) || 0,
          ordersCount: Number(val.ordersCount) || 0,
          completedOrdersCount: Number(val.completedOrdersCount) || 0,
          revenue: Number(val.revenue) || 0,
        });
      });
    }

    if (Array.isArray(obj.recentEvents)) {
      this.recentEvents = obj.recentEvents.slice(-2000);
      this.recentEvents.forEach(e => {
        if (e.eventId) this.processedEventIds.add(e.eventId);
      });
    }
  }

  // Persist current daily summaries and recent events to Supabase settings & local disk
  public async persistAnalyticsStore() {
    try {
      const now = Date.now();
      if (now - this.lastPersistTime < 10000) return; // Throttle to max once per 10s
      this.lastPersistTime = now;

      const summariesObj: Record<string, DailySummary> = {};
      this.dailySummaries.forEach((val, key) => {
        summariesObj[key] = val;
      });

      const payload = {
        updatedAt: new Date().toISOString(),
        dailySummaries: summariesObj,
        recentEvents: this.recentEvents.slice(-1000),
      };

      // Write to disk backup
      await fs.writeFile(this.backupFilePath, JSON.stringify(payload, null, 2), 'utf-8').catch(() => {});

      // Upsert into Supabase settings table
      if (this.supabaseClient) {
        await this.supabaseClient.from('settings').upsert({
          id: 'website_analytics_store_v1',
          value: JSON.stringify(payload),
        }, { onConflict: 'id' }).catch((err: any) => {
          console.warn("[Analytics Engine] Supabase settings upsert error:", err?.message);
        });
      }
    } catch (err) {
      console.warn("[Analytics Engine] Persist store error:", err);
    }
  }

  // Filter out bots, crawlers, and admin panel internal routes
  public isIgnoredTraffic(event: Partial<AnalyticsEvent>, userAgent?: string): boolean {
    const pathToCheck = (event.path || '').toLowerCase();
    
    // Ignore all Admin panel routes
    if (pathToCheck.startsWith('/admin') || pathToCheck.includes('/admin/')) {
      return true;
    }

    // Ignore known internal testing routes or API routes
    if (pathToCheck.startsWith('/api') || pathToCheck.startsWith('/_')) {
      return true;
    }

    // Check bot user agent patterns
    const ua = (userAgent || event.device?.userAgent || '').toLowerCase();
    if (
      ua.includes('bot') ||
      ua.includes('crawl') ||
      ua.includes('spider') ||
      ua.includes('slurp') ||
      ua.includes('headless') ||
      ua.includes('lighthouse') ||
      ua.includes('mediapartners-google') ||
      ua.includes('bytespider') ||
      ua.includes('yandexbot')
    ) {
      return true;
    }

    return false;
  }

  // Handle incoming live heartbeat from active client tabs
  public recordHeartbeat(sessionData: {
    sessionId: string;
    visitorId: string;
    userId?: string | null;
    userName?: string | null;
    currentPath: string;
    pageTitle?: string;
    device?: string;
    ip?: string;
    referrer?: string;
    userAgent?: string;
  }) {
    if (this.isIgnoredTraffic({ path: sessionData.currentPath }, sessionData.userAgent)) {
      return;
    }

    const now = Date.now();
    const existing = this.activeSessions.get(sessionData.sessionId);

    if (existing) {
      existing.lastHeartbeat = now;
      existing.currentPath = sessionData.currentPath;
      if (sessionData.pageTitle) existing.pageTitle = sessionData.pageTitle;
      if (sessionData.userId) {
        existing.userId = sessionData.userId;
        existing.userName = sessionData.userName || existing.userName;
        existing.isLoggedIn = true;
      }
    } else {
      this.activeSessions.set(sessionData.sessionId, {
        sessionId: sessionData.sessionId,
        visitorId: sessionData.visitorId,
        userId: sessionData.userId || null,
        userName: sessionData.userName || null,
        isLoggedIn: !!sessionData.userId,
        currentPath: sessionData.currentPath,
        pageTitle: sessionData.pageTitle || 'TAZU MART BD',
        device: sessionData.device || 'Desktop',
        ip: sessionData.ip || 'Unknown',
        firstSeen: now,
        lastHeartbeat: now,
        referrer: sessionData.referrer || 'Direct',
        eventsCount: 1,
      });
    }
  }

  // Record an incoming real analytics event
  public recordEvent(event: AnalyticsEvent, userAgent?: string): boolean {
    if (this.isIgnoredTraffic(event, userAgent)) {
      return false;
    }

    // Idempotency check: prevent duplicate event insertion
    if (event.eventId && this.processedEventIds.has(event.eventId)) {
      return false;
    }

    if (event.eventId) {
      this.processedEventIds.add(event.eventId);
      if (this.processedEventIds.size > 50000) {
        // Prevent memory leak by trimming
        const arr = Array.from(this.processedEventIds);
        this.processedEventIds = new Set(arr.slice(-25000));
      }
    }

    const now = new Date(event.timestamp || Date.now());
    const dateKey = event.dateString || now.toISOString().split('T')[0];

    // Get or initialize daily summary
    let summary = this.dailySummaries.get(dateKey);
    if (!summary) {
      summary = {
        date: dateKey,
        visits: 0,
        uniqueVisitors: 0,
        visitorIds: [],
        newAccounts: 0,
        uniqueLoginUsers: 0,
        loginUserIds: [],
        loginEvents: 0,
        productViews: 0,
        productViewCounts: {},
        addToCartCount: 0,
        checkoutCount: 0,
        ordersCount: 0,
        completedOrdersCount: 0,
        revenue: 0,
      };
      this.dailySummaries.set(dateKey, summary);
    }

    // Process event types
    switch (event.eventType) {
      case 'session_start': {
        summary.visits += 1;
        if (event.visitorId && !summary.visitorIds.includes(event.visitorId)) {
          summary.visitorIds.push(event.visitorId);
          summary.uniqueVisitors = summary.visitorIds.length;
        }
        break;
      }
      case 'page_view': {
        // If session_start wasn't received yet for this visitor today, record unique visitor
        if (event.visitorId && !summary.visitorIds.includes(event.visitorId)) {
          summary.visitorIds.push(event.visitorId);
          summary.uniqueVisitors = summary.visitorIds.length;
        }
        break;
      }
      case 'product_view': {
        summary.productViews += 1;
        const productId = event.metadata?.productId || event.path.split('/product/')[1] || 'unknown';
        const productName = event.metadata?.productName || event.title || `Product #${productId}`;
        const category = event.metadata?.category || 'General';
        const image = event.metadata?.image || '';

        if (!summary.productViewCounts[productId]) {
          summary.productViewCounts[productId] = {
            name: productName,
            category,
            count: 0,
            image,
          };
        }
        summary.productViewCounts[productId].count += 1;
        if (productName && summary.productViewCounts[productId].name !== productName) {
          summary.productViewCounts[productId].name = productName;
        }
        break;
      }
      case 'add_to_cart': {
        summary.addToCartCount += 1;
        break;
      }
      case 'checkout_start': {
        summary.checkoutCount += 1;
        break;
      }
      case 'order_created': {
        summary.ordersCount += 1;
        const total = Number(event.metadata?.total) || 0;
        if (total > 0) {
          summary.revenue += total;
        }
        break;
      }
      case 'order_completed': {
        summary.completedOrdersCount += 1;
        break;
      }
      case 'login': {
        summary.loginEvents += 1;
        const uid = event.userId || event.metadata?.userId;
        if (uid && !summary.loginUserIds.includes(uid)) {
          summary.loginUserIds.push(uid);
          summary.uniqueLoginUsers = summary.loginUserIds.length;
        }
        break;
      }
      case 'signup': {
        summary.newAccounts += 1;
        break;
      }
    }

    // Maintain recent events list
    this.recentEvents.push(event);
    if (this.recentEvents.length > 2000) {
      this.recentEvents = this.recentEvents.slice(-1000);
    }

    // Update active session event count
    const active = this.activeSessions.get(event.sessionId);
    if (active) {
      active.eventsCount += 1;
      active.lastHeartbeat = Date.now();
      active.currentPath = event.path;
    }

    return true;
  }

  // Remove sessions inactive for more than 2 minutes
  private pruneStaleSessions() {
    const cutoff = Date.now() - 120000; // 2 minutes
    this.activeSessions.forEach((session, key) => {
      if (session.lastHeartbeat < cutoff) {
        this.activeSessions.delete(key);
      }
    });
  }

  // Get true real-time active visitors
  public getLiveMetrics() {
    this.pruneStaleSessions();
    const sessions = Array.from(this.activeSessions.values());
    const count = sessions.length;

    const pathCounts: Record<string, number> = {};
    sessions.forEach(s => {
      pathCounts[s.currentPath] = (pathCounts[s.currentPath] || 0) + 1;
    });

    const topPages = Object.entries(pathCounts)
      .map(([path, viewers]) => ({ path, viewers }))
      .sort((a, b) => b.viewers - a.viewers)
      .slice(0, 5);

    const loggedInCount = sessions.filter(s => s.isLoggedIn).length;
    const guestCount = count - loggedInCount;

    return {
      liveVisitors: count,
      loggedInCount,
      guestCount,
      activeSessions: sessions.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat).slice(0, 20),
      topPages,
      timestamp: new Date().toISOString(),
    };
  }

  // Resolve Date Range Boundaries
  private resolveDateRange(period: string, startDate?: string, endDate?: string, singleDate?: string) {
    const today = new Date();
    // Helper to format Date to YYYY-MM-DD
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let currentStart = '';
    let currentEnd = '';
    let previousStart = '';
    let previousEnd = '';

    if (singleDate) {
      currentStart = singleDate;
      currentEnd = singleDate;
      const prev = new Date(singleDate);
      prev.setDate(prev.getDate() - 1);
      previousStart = formatDate(prev);
      previousEnd = formatDate(prev);
      return { currentStart, currentEnd, previousStart, previousEnd, mode: 'single' };
    }

    switch (period) {
      case 'today': {
        const todayStr = formatDate(today);
        currentStart = todayStr;
        currentEnd = todayStr;

        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        const yestStr = formatDate(yest);
        previousStart = yestStr;
        previousEnd = yestStr;
        break;
      }
      case 'yesterday': {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        const yestStr = formatDate(yest);
        currentStart = yestStr;
        currentEnd = yestStr;

        const dayBefore = new Date(yest);
        dayBefore.setDate(dayBefore.getDate() - 1);
        previousStart = formatDate(dayBefore);
        previousEnd = formatDate(dayBefore);
        break;
      }
      case 'previous_day': {
        const dayBefore = new Date(today);
        dayBefore.setDate(dayBefore.getDate() - 2);
        const dbStr = formatDate(dayBefore);
        currentStart = dbStr;
        currentEnd = dbStr;

        const threeDaysAgo = new Date(dayBefore);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 1);
        previousStart = formatDate(threeDaysAgo);
        previousEnd = formatDate(threeDaysAgo);
        break;
      }
      case 'last7days': {
        const end = new Date(today);
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        currentStart = formatDate(start);
        currentEnd = formatDate(end);

        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - 6);
        previousStart = formatDate(prevStart);
        previousEnd = formatDate(prevEnd);
        break;
      }
      case 'thisweek': {
        // Week starts Monday or Sunday (let's use standard Monday)
        const dayOfWeek = today.getDay();
        const diff = (dayOfWeek + 6) % 7; // Monday = 0
        const monday = new Date(today);
        monday.setDate(monday.getDate() - diff);
        currentStart = formatDate(monday);
        currentEnd = formatDate(today);

        const prevMonday = new Date(monday);
        prevMonday.setDate(prevMonday.getDate() - 7);
        const prevSunday = new Date(monday);
        prevSunday.setDate(prevSunday.getDate() - 1);
        previousStart = formatDate(prevMonday);
        previousEnd = formatDate(prevSunday);
        break;
      }
      case 'lastweek': {
        const dayOfWeek = today.getDay();
        const diff = (dayOfWeek + 6) % 7;
        const thisMonday = new Date(today);
        thisMonday.setDate(thisMonday.getDate() - diff);

        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(lastMonday.getDate() - 7);
        const lastSunday = new Date(thisMonday);
        lastSunday.setDate(lastSunday.getDate() - 1);
        currentStart = formatDate(lastMonday);
        currentEnd = formatDate(lastSunday);

        const twoMondaysAgo = new Date(lastMonday);
        twoMondaysAgo.setDate(twoMondaysAgo.getDate() - 7);
        const twoSundaysAgo = new Date(lastMonday);
        twoSundaysAgo.setDate(twoSundaysAgo.getDate() - 1);
        previousStart = formatDate(twoMondaysAgo);
        previousEnd = formatDate(twoSundaysAgo);
        break;
      }
      case 'thismonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        currentStart = formatDate(firstDay);
        currentEnd = formatDate(today);

        const prevMonthFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthLast = new Date(today.getFullYear(), today.getMonth(), 0);
        previousStart = formatDate(prevMonthFirst);
        previousEnd = formatDate(prevMonthLast);
        break;
      }
      case 'lastmonth': {
        const prevMonthFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthLast = new Date(today.getFullYear(), today.getMonth(), 0);
        currentStart = formatDate(prevMonthFirst);
        currentEnd = formatDate(prevMonthLast);

        const twoMonthsFirst = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        const twoMonthsLast = new Date(today.getFullYear(), today.getMonth() - 1, 0);
        previousStart = formatDate(twoMonthsFirst);
        previousEnd = formatDate(twoMonthsLast);
        break;
      }
      case 'custom':
      default: {
        if (startDate && endDate) {
          currentStart = startDate;
          currentEnd = endDate;

          // Calculate period length in days
          const startMs = new Date(startDate).getTime();
          const endMs = new Date(endDate).getTime();
          const daysDiff = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));

          const prevEnd = new Date(startDate);
          prevEnd.setDate(prevEnd.getDate() - 1);
          const prevStart = new Date(prevEnd);
          prevStart.setDate(prevStart.getDate() - daysDiff + 1);

          previousStart = formatDate(prevStart);
          previousEnd = formatDate(prevEnd);
        } else {
          // Default to last 7 days
          const end = new Date(today);
          const start = new Date(today);
          start.setDate(start.getDate() - 6);
          currentStart = formatDate(start);
          currentEnd = formatDate(end);

          const prevEnd = new Date(start);
          prevEnd.setDate(prevEnd.getDate() - 1);
          const prevStart = new Date(prevEnd);
          prevStart.setDate(prevStart.getDate() - 6);
          previousStart = formatDate(prevStart);
          previousEnd = formatDate(prevEnd);
        }
        break;
      }
    }

    return { currentStart, currentEnd, previousStart, previousEnd, mode: period };
  }

  // Calculate percentage change with required formula: ((Current - Previous) / Previous) * 100
  public calculateGrowth(current: number, previous: number): {
    percentage: string;
    value: number;
    trend: 'up' | 'down' | 'neutral';
    formattedText: string;
  } {
    if (previous === 0) {
      if (current > 0) {
        return {
          percentage: '+100.0%',
          value: 100,
          trend: 'up',
          formattedText: '↑ +100.0%',
        };
      }
      return {
        percentage: '0.0%',
        value: 0,
        trend: 'neutral',
        formattedText: '0% — No Change',
      };
    }

    const diff = current - previous;
    const growth = (diff / previous) * 100;
    const isPositive = growth > 0;
    const isZero = Math.abs(growth) < 0.01;

    if (isZero) {
      return {
        percentage: '0.0%',
        value: 0,
        trend: 'neutral',
        formattedText: '0% — No Change',
      };
    }

    const sign = isPositive ? '+' : '';
    const formatted = `${sign}${growth.toFixed(1)}%`;
    return {
      percentage: formatted,
      value: Number(growth.toFixed(1)),
      trend: isPositive ? 'up' : 'down',
      formattedText: `${isPositive ? '↑' : '↓'} ${formatted}`,
    };
  }

  // Main Dashboard Analytics Aggregator: queries real Supabase DB + analytics event stream
  public async getDashboardAnalytics(params: {
    period?: string;
    startDate?: string;
    endDate?: string;
    singleDate?: string;
  }) {
    await this.initStore();

    const { currentStart, currentEnd, previousStart, previousEnd } = this.resolveDateRange(
      params.period || 'today',
      params.startDate,
      params.endDate,
      params.singleDate
    );

    // Fetch real data from Supabase: orders, users, products, reviews
    let dbOrders: any[] = [];
    let dbUsers: any[] = [];
    let dbProducts: any[] = [];
    let dbReviews: any[] = [];

    if (this.supabaseClient) {
      try {
        const [ordersRes, usersRes, productsRes, reviewsRes] = await Promise.all([
          this.supabaseClient.from('orders').select('*'),
          this.supabaseClient.from('users').select('*'),
          this.supabaseClient.from('products').select('*'),
          this.supabaseClient.from('reviews').select('*'),
        ]);

        if (ordersRes.data) dbOrders = ordersRes.data;
        if (usersRes.data) dbUsers = usersRes.data;
        if (productsRes.data) dbProducts = productsRes.data;
        if (reviewsRes.data) dbReviews = reviewsRes.data;
      } catch (err) {
        console.error("[Analytics Engine] Supabase query error:", err);
      }
    }

    // Helper to extract ISO date string YYYY-MM-DD from any date field
    const getDateString = (dateVal: any): string => {
      if (!dateVal) return '';
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

    const isDateInRange = (dateStr: string, start: string, end: string) => {
      if (!dateStr) return false;
      return dateStr >= start && dateStr <= end;
    };

    // 1. CALCULATE MARKETPLACE REVENUE & ORDERS FROM SUPABASE ORDERS
    const isCompletedOrder = (status: string) => {
      const s = (status || '').toLowerCase();
      return s === 'delivered' || s === 'completed';
    };

    const isCancelledOrder = (status: string) => {
      const s = (status || '').toLowerCase();
      return s === 'cancelled' || s === 'returned' || s === 'failed';
    };

    const isPaidOrValidOrder = (o: any) => {
      const status = (o.status || o.order_status || '').toLowerCase();
      const payment = (o.payment_status || '').toLowerCase();
      if (isCancelledOrder(status)) return false;
      // Valid order if delivered, completed, paid, or placed/confirmed
      return isCompletedOrder(status) || payment === 'paid' || status === 'confirmed' || status === 'preparing' || status === 'pending';
    };

    const getOrderTotal = (o: any): number => {
      return Number(o.total || o.total_amount || o.subtotal || 0);
    };

    // Current Period Orders
    const currentOrders = dbOrders.filter(o => {
      const d = getDateString(o.date || o.created_at);
      return isDateInRange(d, currentStart, currentEnd);
    });

    // Previous Period Orders
    const previousOrders = dbOrders.filter(o => {
      const d = getDateString(o.date || o.created_at);
      return isDateInRange(d, previousStart, previousEnd);
    });

    // Total Accumulated Orders (All Time)
    const totalAllTimeOrders = dbOrders.length;
    const totalAllTimeRevenue = dbOrders
      .filter(o => isPaidOrValidOrder(o))
      .reduce((sum, o) => sum + getOrderTotal(o), 0);

    const totalAllTimeDeliveredRevenue = dbOrders
      .filter(o => isCompletedOrder(o.status || o.order_status))
      .reduce((sum, o) => sum + getOrderTotal(o), 0);

    // Current Period Revenue
    const currentRevenue = currentOrders
      .filter(o => isPaidOrValidOrder(o))
      .reduce((sum, o) => sum + getOrderTotal(o), 0);

    const previousRevenue = previousOrders
      .filter(o => isPaidOrValidOrder(o))
      .reduce((sum, o) => sum + getOrderTotal(o), 0);

    const revenueGrowth = this.calculateGrowth(currentRevenue, previousRevenue);

    // Order Distribution by Status
    const statusCounts = {
      pending: 0,
      processing: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    };

    currentOrders.forEach(o => {
      const s = (o.status || o.order_status || '').toLowerCase();
      if (s === 'delivered' || s === 'completed') {
        statusCounts.delivered += 1;
      } else if (s === 'confirmed' || s === 'preparing' || s === 'packed' || s === 'shipping' || s === 'processing') {
        statusCounts.processing += 1;
      } else if (s === 'cancelled') {
        statusCounts.cancelled += 1;
      } else if (s === 'returned') {
        statusCounts.returned += 1;
      } else {
        statusCounts.pending += 1;
      }
    });

    const totalCurrentOrdersCount = currentOrders.length;
    const totalPreviousOrdersCount = previousOrders.length;
    const orderGrowth = this.calculateGrowth(totalCurrentOrdersCount, totalPreviousOrdersCount);

    // 2. CALCULATE ACQUISITION VELOCITY FROM SUPABASE USERS
    const currentNewUsers = dbUsers.filter(u => {
      const d = getDateString(u.created_at || u.registrationDate);
      return isDateInRange(d, currentStart, currentEnd);
    }).length;

    const previousNewUsers = dbUsers.filter(u => {
      const d = getDateString(u.created_at || u.registrationDate);
      return isDateInRange(d, previousStart, previousEnd);
    }).length;

    const acquisitionGrowth = this.calculateGrowth(currentNewUsers, previousNewUsers);

    // Total Customers in DB
    const totalCustomersCount = dbUsers.length;

    // 3. AGGREGATE WEBSITE ACTIVITY EVENTS FROM DAILY SUMMARIES
    let totalVisits = 0;
    const uniqueVisitorSet = new Set<string>();
    let totalNewAccountsEvent = 0;
    const uniqueLoginUserSet = new Set<string>();
    let totalLoginEvents = 0;
    let totalProductViews = 0;
    const aggregatedProductViews: Record<string, { id: string; name: string; category?: string; count: number; image?: string }> = {};
    let totalAddToCart = 0;
    let totalCheckout = 0;

    // Iterate through daily summaries in range
    this.dailySummaries.forEach((summary, dateKey) => {
      if (isDateInRange(dateKey, currentStart, currentEnd)) {
        totalVisits += summary.visits;
        summary.visitorIds.forEach(id => uniqueVisitorSet.add(id));
        totalNewAccountsEvent += summary.newAccounts;
        summary.loginUserIds.forEach(id => uniqueLoginUserSet.add(id));
        totalLoginEvents += summary.loginEvents;
        totalProductViews += summary.productViews;
        totalAddToCart += summary.addToCartCount;
        totalCheckout += summary.checkoutCount;

        // Aggregate product views
        Object.entries(summary.productViewCounts || {}).forEach(([pId, pData]) => {
          if (!aggregatedProductViews[pId]) {
            aggregatedProductViews[pId] = {
              id: pId,
              name: pData.name,
              category: pData.category,
              count: 0,
              image: pData.image,
            };
          }
          aggregatedProductViews[pId].count += pData.count;
        });
      }
    });

    const totalUniqueVisitors = uniqueVisitorSet.size;
    const totalUniqueLoginUsers = uniqueLoginUserSet.size;

    // Compare with previous period website activity
    let prevVisits = 0;
    const prevUniqueVisitorsSet = new Set<string>();
    let prevProductViews = 0;
    this.dailySummaries.forEach((summary, dateKey) => {
      if (isDateInRange(dateKey, previousStart, previousEnd)) {
        prevVisits += summary.visits;
        summary.visitorIds.forEach(id => prevUniqueVisitorsSet.add(id));
        prevProductViews += summary.productViews;
      }
    });

    const visitsGrowth = this.calculateGrowth(totalVisits, prevVisits);
    const uniqueVisitorsGrowth = this.calculateGrowth(totalUniqueVisitors, prevUniqueVisitorsSet.size);

    // 4. GENERATE TIME-SERIES CHART DATA FOR SELECTED RANGE
    const timeSeriesData: any[] = [];
    const startDateObj = new Date(currentStart);
    const endDateObj = new Date(currentEnd);
    const dayCursor = new Date(startDateObj);

    while (dayCursor <= endDateObj) {
      const dStr = dayCursor.toISOString().split('T')[0];
      const summary = this.dailySummaries.get(dStr);

      // Orders for this specific day
      const dayOrders = dbOrders.filter(o => getDateString(o.date || o.created_at) === dStr);
      const dayRevenue = dayOrders
        .filter(o => isPaidOrValidOrder(o))
        .reduce((sum, o) => sum + getOrderTotal(o), 0);

      const dayNewUsers = dbUsers.filter(u => getDateString(u.created_at || u.registrationDate) === dStr).length;

      const dateDisplay = dayCursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      timeSeriesData.push({
        date: dStr,
        name: dateDisplay,
        shortDate: dateDisplay,
        visits: summary?.visits || 0,
        uniqueVisitors: summary?.uniqueVisitors || 0,
        newUsers: (summary?.newAccounts || 0) + dayNewUsers,
        logins: summary?.uniqueLoginUsers || 0,
        loginEvents: summary?.loginEvents || 0,
        productViews: summary?.productViews || 0,
        addToCart: summary?.addToCartCount || 0,
        checkout: summary?.checkoutCount || 0,
        orders: dayOrders.length,
        completedOrders: dayOrders.filter(o => isCompletedOrder(o.status || o.order_status)).length,
        revenue: dayRevenue,
      });

      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    // 5. MONTHLY CALENDAR BREAKDOWN (If monthly or custom, provide complete month matrix)
    const monthlyCalendarRows: any[] = timeSeriesData.map(item => ({
      date: item.date,
      formattedDate: item.name,
      visitors: item.uniqueVisitors,
      visits: item.visits,
      newUsers: item.newUsers,
      logins: item.logins,
      productViews: item.productViews,
      addToCart: item.addToCart,
      orders: item.orders,
      revenue: item.revenue,
    }));

    // 6. TOP VIEWED PRODUCTS LIST
    const topViewedProducts = Object.values(aggregatedProductViews)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // If top viewed is empty, attach catalog products with real DB info
    if (topViewedProducts.length === 0 && dbProducts.length > 0) {
      dbProducts.slice(0, 5).forEach(p => {
        topViewedProducts.push({
          id: p.id,
          name: p.name,
          category: p.category || 'General',
          count: 0,
          image: p.image || p.images?.[0] || '',
        });
      });
    }

    // 7. MAIN MARKETPLACE SALES TRENDS (Top Selling from real DB order items)
    const productSalesMap: Record<string, { id: string; name: string; category: string; image: string; revenue: number; unitsSold: number; profit: number }> = {};
    
    currentOrders.forEach(o => {
      if (isCancelledOrder(o.status || o.order_status)) return;
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const pId = String(item.productId || item.id || `item_${item.name}`);
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          const rev = price * qty;
          const matchedProd = dbProducts.find(p => String(p.id) === pId);
          const buyingPrice = Number(matchedProd?.buyingPrice) || price * 0.7;
          const profit = (price - buyingPrice) * qty;

          if (!productSalesMap[pId]) {
            productSalesMap[pId] = {
              id: pId,
              name: item.name || matchedProd?.name || 'Item',
              category: matchedProd?.category || 'General',
              image: matchedProd?.image || item.image || '',
              revenue: 0,
              unitsSold: 0,
              profit: 0,
            };
          }
          productSalesMap[pId].revenue += rev;
          productSalesMap[pId].unitsSold += qty;
          productSalesMap[pId].profit += profit;
        });
      }
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    // Fallback if no item details in orders
    if (topSellingProducts.length < 5 && dbProducts.length > 0) {
      dbProducts.forEach(p => {
        if (topSellingProducts.length >= 5) return;
        if (!productSalesMap[String(p.id)]) {
          topSellingProducts.push({
            id: String(p.id),
            name: p.name,
            category: p.category || 'General',
            image: p.image || p.images?.[0] || '',
            revenue: 0,
            unitsSold: 0,
            profit: 0,
          });
        }
      });
    }

    // 8. CONVERSION FUNNEL
    const funnel = [
      { stage: 'Visitors', count: totalUniqueVisitors, dropOff: 0, rate: '100%' },
      { 
        stage: 'Product Views', 
        count: totalProductViews, 
        rate: totalUniqueVisitors > 0 ? `${((totalProductViews / totalUniqueVisitors) * 100).toFixed(1)}%` : '0.0%' 
      },
      { 
        stage: 'Add to Cart', 
        count: totalAddToCart, 
        rate: totalProductViews > 0 ? `${((totalAddToCart / totalProductViews) * 100).toFixed(1)}%` : '0.0%' 
      },
      { 
        stage: 'Checkout', 
        count: totalCheckout, 
        rate: totalAddToCart > 0 ? `${((totalCheckout / totalAddToCart) * 100).toFixed(1)}%` : '0.0%' 
      },
      { 
        stage: 'Orders Placed', 
        count: totalCurrentOrdersCount, 
        rate: totalCheckout > 0 ? `${((totalCurrentOrdersCount / totalCheckout) * 100).toFixed(1)}%` : '0.0%' 
      },
      { 
        stage: 'Completed Orders', 
        count: statusCounts.delivered, 
        rate: totalCurrentOrdersCount > 0 ? `${((statusCounts.delivered / totalCurrentOrdersCount) * 100).toFixed(1)}%` : '0.0%' 
      },
    ];

    // Average Order Value (AOV)
    const validOrdersCount = currentOrders.filter(o => isPaidOrValidOrder(o)).length;
    const aov = validOrdersCount > 0 ? Math.round(currentRevenue / validOrdersCount) : 0;

    // Live Metrics
    const liveMetrics = this.getLiveMetrics();

    return {
      success: true,
      lastUpdated: new Date().toISOString(),
      dateRange: {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        period: params.period || 'today',
      },
      // 4 Main Admin Metrics (Trade-Style)
      marketplaceRevenue: {
        currentRevenue,
        previousRevenue,
        totalAllTimeRevenue,
        totalAllTimeDeliveredRevenue,
        growth: revenueGrowth,
        isUptrend: revenueGrowth.trend === 'up',
      },
      orderDistribution: {
        total: totalCurrentOrdersCount,
        allTimeTotal: totalAllTimeOrders,
        growth: orderGrowth,
        counts: statusCounts,
        doughnutData: [
          { name: 'Completed', value: statusCounts.delivered, color: '#18181b' },
          { name: 'Processing', value: statusCounts.processing, color: '#0ea5e9' },
          { name: 'Pending', value: statusCounts.pending, color: '#a855f7' },
          { name: 'Cancelled', value: statusCounts.cancelled, color: '#f43f5e' },
          { name: 'Returned', value: statusCounts.returned, color: '#f59e0b' },
        ],
      },
      acquisitionVelocity: {
        currentNewUsers,
        previousNewUsers,
        totalCustomers: totalCustomersCount,
        growth: acquisitionGrowth,
        isUptrend: acquisitionGrowth.trend === 'up',
      },
      enterpriseInsights: {
        totalSales: totalAllTimeDeliveredRevenue,
        totalOrders: totalAllTimeOrders,
        totalCustomers: totalCustomersCount,
        totalRevenue: totalAllTimeRevenue,
        totalReviews: dbReviews.length,
        aov,
        salesGrowth: this.calculateGrowth(
          currentOrders.filter(o => isCompletedOrder(o.status || o.order_status)).reduce((s, o) => s + getOrderTotal(o), 0),
          previousOrders.filter(o => isCompletedOrder(o.status || o.order_status)).reduce((s, o) => s + getOrderTotal(o), 0)
        ),
        ordersGrowth: orderGrowth,
        customersGrowth: acquisitionGrowth,
        revenueGrowth: revenueGrowth,
      },
      // Dedicated Website Analytics
      websiteAnalytics: {
        totalVisits,
        uniqueVisitors: totalUniqueVisitors,
        liveVisitors: liveMetrics.liveVisitors,
        newAccounts: currentNewUsers,
        uniqueLoginUsers: totalUniqueLoginUsers,
        loginEvents: totalLoginEvents,
        productViews: totalProductViews,
        addToCart: totalAddToCart,
        checkout: totalCheckout,
        orders: totalCurrentOrdersCount,
        completedOrders: statusCounts.delivered,
        revenue: currentRevenue,
        visitsGrowth,
        uniqueVisitorsGrowth,
      },
      liveMetrics,
      timeSeriesData,
      monthlyCalendarRows,
      topViewedProducts,
      topSellingProducts,
      funnel,
      recentOrders: dbOrders
        .sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())
        .slice(0, 6)
        .map(o => ({
          id: o.id || o.order_id,
          orderId: o.order_id || (o.id ? `#ORD-${o.id}` : '#ORD-REF'),
          customerName: o.customer_name || o.name || 'Customer',
          total: getOrderTotal(o),
          status: o.status || o.order_status || 'Pending',
          paymentStatus: o.payment_status || 'Unpaid',
          date: o.date || o.created_at,
        })),
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
