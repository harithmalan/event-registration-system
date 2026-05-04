import { createBrowserClient as supabaseCreateBrowserClient } from '@supabase/auth-helpers-nextjs'

export const createBrowserClient = () =>
  supabaseCreateBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
