import { create } from 'zustand';
import { getDb } from '../lib/db';

export interface CourierAPI {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  secretKey: string;
  clientId: string;
  storeId: string;
  username: string;
  password: string;
  status: 'active' | 'inactive';
}

export interface DivisionCharge {
  id: string;
  name: string;
  charge: number;
}

interface DeliveryStore {
  courierApis: CourierAPI[];
  divisionCharges: DivisionCharge[];
  isLoaded: boolean;
  subscribe: () => () => void;
  updateCourierApi: (id: string, updates: Partial<CourierAPI>) => void;
  updateDivisionCharge: (id: string, charge: number) => void;
  updateAllDivisionCharges: (charges: { [key: string]: number }) => Promise<void>;
  getActiveCourier: () => CourierAPI | undefined;
  getChargeByDivision: (divisionName: string) => number;
}

const defaultState: { courierApis: CourierAPI[]; divisionCharges: DivisionCharge[] } = {
  courierApis: [
    { id: 'pathao', name: 'Pathao Courier', apiUrl: '', apiKey: '', secretKey: '', clientId: '', storeId: '', username: '', password: '', status: 'inactive' },
    { id: 'steadfast', name: 'SteadFast', apiUrl: '', apiKey: '', secretKey: '', clientId: '', storeId: '', username: '', password: '', status: 'inactive' },
    { id: 'redx', name: 'RedX', apiUrl: '', apiKey: '', secretKey: '', clientId: '', storeId: '', username: '', password: '', status: 'inactive' },
    { id: 'sundarban', name: 'Sundarban', apiUrl: '', apiKey: '', secretKey: '', clientId: '', storeId: '', username: '', password: '', status: 'active' },
    { id: 'ecourier', name: 'eCourier', apiUrl: '', apiKey: '', secretKey: '', clientId: '', storeId: '', username: '', password: '', status: 'inactive' },
    { id: 'paperfly', name: 'Paperfly', apiUrl: '', apiKey: '', secretKey: '', clientId: '', storeId: '', username: '', password: '', status: 'inactive' },
  ],
  divisionCharges: [
    { id: '1', name: 'Dhaka', charge: 80 },
    { id: '2', name: 'Chattogram', charge: 120 },
    { id: '3', name: 'Rajshahi', charge: 150 },
    { id: '4', name: 'Khulna', charge: 150 },
    { id: '5', name: 'Barishal', charge: 150 },
    { id: '6', name: 'Sylhet', charge: 150 },
    { id: '7', name: 'Rangpur', charge: 150 },
    { id: '8', name: 'Mymensingh', charge: 150 },
  ],
};

export const useDeliveryStore = create<DeliveryStore>((set, get) => ({
  ...defaultState,
  isLoaded: false,

  subscribe: () => {
    const db = getDb();
    if (!db) return () => {};

    const loadSettings = async () => {
        const { data, error } = await db.from('settings').select('*').eq('id', 'delivery').limit(1);
        if (!error && data && data.length > 0) {
            const dataObj = data[0];
            set({
              courierApis: dataObj.courierApis ?? defaultState.courierApis,
              divisionCharges: dataObj.divisionCharges ?? defaultState.divisionCharges,
              isLoaded: true
            });
        } else if (!error && data && data.length === 0) {
            db.from('settings').upsert([{ id: 'delivery', ...defaultState }]).then(({error}) => error && console.warn(error));
            set({ ...defaultState, isLoaded: true });
        }
    };
    
    loadSettings();
    
    const channel = db
      .channel('public:settings:delivery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.delivery' }, () => {
         loadSettings();
      })
      .subscribe();

    return () => {
        db.removeChannel(channel);
    };
  },

  updateCourierApi: (id, updates) => {
    const nextCourierApis = get().courierApis.map((api) => {
      if (api.id === id) {
        return { ...api, ...updates };
      }
      return updates.status === 'active' ? { ...api, status: 'inactive' as const } : api;
    });

    set({ courierApis: nextCourierApis });
    const db = getDb();
    if (db) {
        db.from('settings').update({ courierApis: nextCourierApis }).eq('id', 'delivery').then(({error}) => error && console.warn(error));
    }
  },

  updateDivisionCharge: (id, charge) => {
    const nextDivisionCharges = get().divisionCharges.map((div) => 
      div.id === id ? { ...div, charge } : div
    );

    set({ divisionCharges: nextDivisionCharges });
    const db = getDb();
    if (db) {
        db.from('settings').update({ divisionCharges: nextDivisionCharges }).eq('id', 'delivery').then(({error}) => error && console.warn(error));
    }
  },

  updateAllDivisionCharges: async (charges) => {
    const nextDivisionCharges = get().divisionCharges.map((div) => {
      const charge = charges[div.id];
      return charge !== undefined ? { ...div, charge } : div;
    });

    set({ divisionCharges: nextDivisionCharges });
    const db = getDb();
    if (db) {
      const { error } = await db.from('settings').update({ divisionCharges: nextDivisionCharges }).eq('id', 'delivery');
      if (error) {
        console.error("Error updating division charges:", error);
        throw error;
      }
    }
  },

  getActiveCourier: () => get().courierApis.find(api => api.status === 'active'),
  
  getChargeByDivision: (divisionName) => {
    const div = get().divisionCharges.find(d => d.name === divisionName);
    return div ? div.charge : 0;
  }
}));
