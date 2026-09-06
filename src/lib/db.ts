// TAZU MART BD - Supabase Authoritative Database Client
import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

export interface DbResult<T = any> {
  data: T | null;
  error: any | null;
}

// Authoritative Supabase client instance
export const db: any = supabase;

export const getDb = (): any => supabase;
export const getDbCredentials = () => ({ url: supabaseUrl, key: supabaseAnonKey });
export const fetchDbConfigFromServer = async (): Promise<boolean> => true;

