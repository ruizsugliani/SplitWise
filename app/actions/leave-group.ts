'use server'

import { createClient } from '@/lib/supabase/server'

export async function leaveGroup(groupId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase.rpc(
    'leave_spending_group',
    {
      p_group_id: groupId,
      p_user_id: user.id,
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  return { success: true }
}