import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )
}

export async function POST(req: Request) {
  const supabase = makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single()

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { memberId, targetGroupId } = await req.json()
  if (!memberId || !targetGroupId) {
    return NextResponse.json({ error: 'Missing memberId or targetGroupId.' }, { status: 400 })
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from('tug_of_war_members')
    .select('id, user_id, group_id')
    .eq('id', memberId)
    .single()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
  }

  if (member.group_id === targetGroupId) {
    return NextResponse.json({ error: 'Member is already in that group.' }, { status: 400 })
  }

  const { data: targetGroup, error: targetGroupError } = await supabaseAdmin
    .from('tug_of_war_groups')
    .select('id, member_count, max_members')
    .eq('id', targetGroupId)
    .single()

  if (targetGroupError || !targetGroup) {
    return NextResponse.json({ error: 'Target group not found.' }, { status: 404 })
  }

  if (targetGroup.member_count >= targetGroup.max_members) {
    return NextResponse.json({ error: 'Target group is already full.' }, { status: 400 })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('tug_of_war_members')
    .delete()
    .eq('id', memberId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const { error: insertError } = await supabaseAdmin
    .from('tug_of_war_members')
    .insert({
      group_id: targetGroupId,
      user_id: member.user_id,
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
