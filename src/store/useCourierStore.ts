import { create } from 'zustand';

export interface CourierItem {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  apiBaseUrl?: string;
  authType: 'api_key_secret' | 'bearer_token' | 'basic_auth' | 'custom_headers' | 'none';
  apiKeyMasked?: string;
  secretKeyMasked?: string;
  accessTokenMasked?: string;
  hasApiKey?: boolean;
  hasSecretKey?: boolean;
  hasAccessToken?: boolean;
  clientId?: string;
  storeId?: string;
  username?: string;
  phoneSearchEndpoint?: string;
  orderHistoryEndpoint?: string;
  trackingEndpoint?: string;
  statusEndpoint?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  requestMethod: 'GET' | 'POST';
  requiredHeaders?: string;
  mappingType: 'steadfast' | 'pathao' | 'redx' | 'generic';
  status: 'active' | 'inactive';
  lastTestedAt?: string;
  lastTestStatus?: 'connected' | 'failed' | 'untested';
  lastTestMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParcelHistoryItem {
  consignmentId: string;
  trackingCode?: string;
  orderDate?: string;
  status: string;
  deliveryDate?: string | null;
  codAmount?: number | null;
  currentHub?: string | null;
  trackingLink?: string | null;
}

export interface FraudCheckResponse {
  success: boolean;
  configured?: boolean;
  courier?: CourierItem;
  phone?: string;
  found?: boolean;
  message?: string;
  error?: string;
  data?: {
    totalParcels: number;
    totalDelivered: number;
    totalCancelled: number | null;
    totalReturned: number | null;
    totalPending: number | null;
    totalPartialDelivered: number | null;
    totalFraudReports: number;
    deliverySuccessRate: number | null;
    parcels?: ParcelHistoryItem[];
  };
}

interface CourierStore {
  couriers: CourierItem[];
  loading: boolean;
  error: string | null;
  selectedCourierId: string;
  fetchCouriers: () => Promise<CourierItem[]>;
  setSelectedCourierId: (id: string) => void;
  addCourier: (data: Partial<CourierItem> & { name: string; apiKey?: string; secretKey?: string; accessToken?: string; password?: string }) => Promise<{ success: boolean; error?: string; courier?: CourierItem }>;
  updateCourier: (id: string, data: Partial<CourierItem> & { apiKey?: string; secretKey?: string; accessToken?: string; password?: string }) => Promise<{ success: boolean; error?: string; courier?: CourierItem }>;
  deleteCourier: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleCourierStatus: (id: string) => Promise<boolean>;
  testConnection: (id: string) => Promise<{ success: boolean; message: string; latencyMs?: number; error?: string }>;
  executeFraudCheck: (phone: string, courierId?: string) => Promise<FraudCheckResponse>;
  sendParcel: (payload: {
    courierId: string;
    orderId: string;
    customerName: string;
    customerPhone: string;
    fullAddress: string;
    codAmount: number;
    notes?: string;
    city?: string;
    area?: string;
  }) => Promise<{
    success: boolean;
    trackingId?: string;
    consignmentId?: string;
    status?: string;
    courier?: CourierItem;
    message?: string;
    error?: string;
    apiResponse?: any;
  }>;
}

export const useCourierStore = create<CourierStore>((set, get) => ({
  couriers: [],
  loading: false,
  error: null,
  selectedCourierId: '',

  fetchCouriers: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/admin/couriers');
      const data = await res.json();
      if (data.success && Array.isArray(data.couriers)) {
        const activeOne = data.couriers.find((c: CourierItem) => c.status === 'active');
        set({ 
          couriers: data.couriers, 
          loading: false,
          selectedCourierId: get().selectedCourierId || (activeOne ? activeOne.id : (data.couriers[0]?.id || ''))
        });
        return data.couriers;
      }
      set({ loading: false });
      return [];
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to fetch couriers' });
      return [];
    }
  },

  setSelectedCourierId: (id: string) => {
    set({ selectedCourierId: id });
  },

  addCourier: async (payload) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/admin/couriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchCouriers();
        return { success: true, courier: data.courier };
      }
      set({ loading: false });
      return { success: false, error: data.error || 'Failed to add courier' };
    } catch (err: any) {
      set({ loading: false });
      return { success: false, error: err.message || 'Network error' };
    }
  },

  updateCourier: async (id, payload) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/admin/couriers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchCouriers();
        return { success: true, courier: data.courier };
      }
      set({ loading: false });
      return { success: false, error: data.error || 'Failed to update courier' };
    } catch (err: any) {
      set({ loading: false });
      return { success: false, error: err.message || 'Network error' };
    }
  },

  deleteCourier: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/admin/couriers/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchCouriers();
        return { success: true };
      }
      set({ loading: false });
      return { success: false, error: data.error || 'Failed to delete courier' };
    } catch (err: any) {
      set({ loading: false });
      return { success: false, error: err.message || 'Network error' };
    }
  },

  toggleCourierStatus: async (id) => {
    const courier = get().couriers.find(c => c.id === id);
    if (!courier) return false;
    const newStatus = courier.status === 'active' ? 'inactive' : 'active';
    const result = await get().updateCourier(id, { status: newStatus });
    return result.success;
  },

  testConnection: async (id) => {
    try {
      const res = await fetch(`/api/admin/couriers/${id}/test`, {
        method: 'POST'
      });
      const data = await res.json();
      // Refresh courier list to capture updated test status
      get().fetchCouriers().catch(() => {});
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error occurred while testing connection'
      };
    }
  },

  executeFraudCheck: async (phone: string, courierId?: string) => {
    try {
      const targetCourierId = courierId || get().selectedCourierId;
      const url = `/api/admin/fraud-check?phone=${encodeURIComponent(phone)}${targetCourierId ? `&courierId=${encodeURIComponent(targetCourierId)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: `Unable to fetch courier data. Please check courier API connection (${err.message || 'Network error'}).`
      };
    }
  },

  sendParcel: async (payload) => {
    try {
      const res = await fetch('/api/admin/couriers/send-parcel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error occurred while submitting parcel'
      };
    }
  }
}));
