import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCustomerStore } from './useCustomerStore';
import { realAnalytics } from '../lib/realAnalytics';

type UserRole = 'customer' | 'admin' | 'moderator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  username?: string;
  gender?: string;
  dob?: string;
  address?: string;
  country?: string;
  division?: string;
  district?: string;
  city?: string;
  upazila?: string;
  area?: string;
  houseRoad?: string;
  street?: string;
  zipCode?: string;
  postalCode?: string;
  landmark?: string;
  profileImage?: string;
  language?: string;
  occasionName?: string;
  specialDate?: string;
  interests?: string[];
  marketingEmail?: boolean;
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setInitializing: (isInitializing: boolean) => void;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitializing: true,
      setInitializing: (isInitializing) => set({ isInitializing }),
      login: (user) => {
        set({ user, isAuthenticated: true, isInitializing: false });
        try {
          realAnalytics.trackLogin({
            id: user.id,
            email: user.email,
            name: user.name,
          });
        } catch {}
        // Sync customer data
        setTimeout(() => {
          useCustomerStore.getState().syncCustomerFromAuth(user);
        }, 500);
      },
      logout: async () => {
        localStorage.removeItem('auth_token');
        set({ user: null, isAuthenticated: false, isInitializing: false });
        try {
          sessionStorage.clear();
        } catch (e) {
          console.warn("sessionStorage clear note:", e);
        }
      },
      updateUser: (updatedUser) => {
        set((state) => {
          const newUser = state.user ? { ...state.user, ...updatedUser } : null;
          
          // Sync to database if user exists
          if (newUser) {
            // Update users table via API
            fetch('/api/db/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update',
                table: 'users',
                payload: updatedUser,
                where: { id: newUser.id }
              })
            }).catch(err => console.warn("Users sync error:", err));
            
            // Sync customers table if role is customer
            if (newUser.role === 'customer') {
               useCustomerStore.getState().updateCustomer(newUser.id, updatedUser as any)
                 .catch(err => console.warn("Customers sync error:", err));
            }
          }
          
          return { user: newUser };
        });
      },
    }),
    {
      name: 'luxemart-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
