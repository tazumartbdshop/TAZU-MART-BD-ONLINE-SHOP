import { createClient } from '@supabase/supabase-js';

const SUPABASE_DEFAULT_URL = 'https://gaqyfjztpxvzijouiwwh.supabase.co';
const SUPABASE_DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcXlmanp0cHh2emlqb3Vpd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTM0NTIsImV4cCI6MjA5NTE2OTQ1Mn0.LdN6jVd5fYi_KsJnjridUl3Gr_RxahnXRvahb5dggsw';
const SUPABASE_DEFAULT_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcXlmanp0cHh2emlqb3Vpd3doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MzQ1MiwiZXhwIjoyMDk1MTY5NDUyfQ.TDCcHuch5MAn49KmnTZoPj9B3BiOany_OxhiRk92QJA';

const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch {}
  return '';
};

export const supabaseUrl = getEnv('VITE_SUPABASE_URL') || SUPABASE_DEFAULT_URL;
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || SUPABASE_DEFAULT_ANON_KEY;
export const supabaseServiceRole = getEnv('SUPABASE_SERVICE_ROLE_KEY') || SUPABASE_DEFAULT_SERVICE_KEY;

// Client-side client (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Server-side client (service role)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

