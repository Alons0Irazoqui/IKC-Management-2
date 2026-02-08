
import { createClient } from '@supabase/supabase-js';

// Access environment variables securely
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yrexwcpyhdmmotfbxoqu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZXh3Y3B5aGRtbW90ZmJ4b3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MTA3MjYsImV4cCI6MjA4NjA4NjcyNn0.bvi0fQ56HMRnJuDi35SEhUQenI_saeF8E67d_sCfYOE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
