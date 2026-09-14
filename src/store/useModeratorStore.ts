import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDb } from '../lib/db';
import { hashPassword, isBcryptHash } from '../lib/authCrypto';

export type StaffRole = 'moderator' | 'staff' | 'support';

export interface Moderator {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | '';
  password: string; // Stored as bcrypt hash
  role: StaffRole;
  status: 'Active' | 'Inactive';
  permissions: string[];
  createdAt: number;
}

interface ModeratorStore {
  moderators: Moderator[];
  isUnlocked: boolean;
  isSimUnlocked: boolean;
  sectionPassword: string;
  isLoaded: boolean;
  subscribe: () => () => void;
  loadFromBackend: () => Promise<void>;
  addModerator: (moderator: Omit<Moderator, 'id' | 'createdAt'>) => Promise<Moderator>;
  updateModerator: (id: string, updatedModerator: Partial<Moderator>) => Promise<void>;
  deleteModerator: (id: string) => Promise<void>;
  getModeratorByEmail: (email: string) => Moderator | undefined;
  setUnlocked: (v: boolean) => void;
  setSimUnlocked: (v: boolean) => void;
  setSectionPassword: (v: string) => void;
}

// Pre-hashed bcrypt signature of 'moderator123'
const DEFAULT_HASH = '$2b$10$oFjwcp8nO.mtU6.3xNRfLOr3wQYFg6YQpa0ebRuoj1JnOCiRX7f9m';

const defaultModerators: Moderator[] = [
  {
    id: 'mod_1',
    name: 'Rakib Hasan',
    email: 'rakib.hasan@gmail.com',
    phone: '01711111111',
    dob: '1995-05-15',
    gender: 'Male',
    password: DEFAULT_HASH,
    role: 'moderator',
    status: 'Active',
    permissions: ['dashboard', 'orders', 'delivery'],
    createdAt: 1740000000000,
  },
  {
    id: 'mod_2',
    name: 'Nusrat Jahan',
    email: 'nusrat.jahan@gmail.com',
    phone: '01722222222',
    dob: '1998-08-20',
    gender: 'Female',
    password: DEFAULT_HASH,
    role: 'moderator',
    status: 'Active',
    permissions: ['dashboard', 'products', 'categories', 'reviews'],
    createdAt: 1740100000000,
  },
  {
    id: 'mod_3',
    name: 'Imran Hossain',
    email: 'imran.hossain@gmail.com',
    phone: '01733333333',
    dob: '1992-12-10',
    gender: 'Male',
    password: DEFAULT_HASH,
    role: 'staff',
    status: 'Inactive',
    permissions: ['dashboard', 'analytics'],
    createdAt: 1740200000000,
  },
  {
    id: 'mod_4',
    name: 'Sadia Islam',
    email: 'sadia.islam@gmail.com',
    phone: '01744444444',
    dob: '1997-03-25',
    gender: 'Female',
    password: DEFAULT_HASH,
    role: 'support',
    status: 'Active',
    permissions: ['dashboard', 'support', 'reviews', 'orders'],
    createdAt: 1740300000000,
  }
];

export const useModeratorStore = create<ModeratorStore>()(
  persist(
    (set, get) => ({
      moderators: defaultModerators,
      isUnlocked: false,
      isSimUnlocked: false,
      sectionPassword: 'Aistudio@2026',
      isLoaded: false,

      loadFromBackend: async () => {
        try {
          const res = await fetch('/api/admin/moderators');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              set({ moderators: data, isLoaded: true });
              return;
            }
          }
        } catch {
          // fallback to client store
        }
      },

      subscribe: () => {
        get().loadFromBackend();

        // Polling as a fallback for real-time (every 30s)
        const interval = setInterval(() => {
          get().loadFromBackend();
        }, 30000);

        return () => {
          clearInterval(interval);
        };
      },

      setUnlocked: (v) => set({ isUnlocked: v }),
      setSimUnlocked: (v) => set({ isSimUnlocked: v }),
      setSectionPassword: (v) => {
        set({ sectionPassword: v });
      },

      addModerator: async (moderator) => {
        const id = `mod_${Date.now()}`;
        const hashedPassword = isBcryptHash(moderator.password)
          ? moderator.password
          : hashPassword(moderator.password);

        const newModerator: Moderator = {
          ...moderator,
          password: hashedPassword,
          id,
          createdAt: Date.now(),
        };

        set((state) => ({ moderators: [newModerator, ...state.moderators] }));

        // Sync with backend API
        try {
          await fetch('/api/admin/moderators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newModerator)
          });
        } catch {}

        return newModerator;
      },

      updateModerator: async (id, updatedModerator) => {
        const payload = { ...updatedModerator };
        if (payload.password) {
          payload.password = isBcryptHash(payload.password)
            ? payload.password
            : hashPassword(payload.password);
        }

        set((state) => ({
          moderators: state.moderators.map((m) =>
            m.id === id ? { ...m, ...payload } : m
          ),
        }));

        // Sync with backend API
        try {
          await fetch(`/api/admin/moderators/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch {}
      },

      deleteModerator: async (id) => {
        set((state) => ({
          moderators: state.moderators.filter((m) => m.id !== id),
        }));

        // Sync with backend API
        try {
          await fetch(`/api/admin/moderators/${id}`, {
            method: 'DELETE'
          });
        } catch {}
      },

      getModeratorByEmail: (email) => {
        if (!email) return undefined;
        return get().moderators.find(
          (m) => m.email.toLowerCase() === email.trim().toLowerCase()
        );
      },
    }),
    {
      name: 'tazu_mart_moderators_store_v2',
      partialize: (state) => ({
        moderators: state.moderators,
        sectionPassword: state.sectionPassword,
      }),
    }
  )
);
