import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Create a supabase client on the browser with project's credentials
  return createBrowserClient(
    'https://mwkyzvhnofkjvukjweuh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13a3l6dmhub2ZranZ1a2p3ZXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4Nzk3MzQsImV4cCI6MjA1OTQ1NTczNH0.416i9YfYzz24GFGf_JSBWHKZxgkj5_8p8LvAC4XZ6qY',
    {
      // Tell Supabase to use persistent sessions in localStorage
      auth: {
        persistSession: true,
        // Specify exactly where to store the session
        storageKey: 'sb-rythmix-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  )
}