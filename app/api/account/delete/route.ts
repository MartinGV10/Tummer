import { NextResponse } from 'next/server'
import { getAuthenticatedBillingUser } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isMissingRelationError } from '@/src/shared/conditionRefs'

async function deleteRowsByIds(table: string, idColumn: string, ids: string[]) {
  if (ids.length === 0) return

  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .in(idColumn, ids)

  if (error) {
    if (isMissingRelationError(error, table)) {
      return
    }

    throw error
  }
}

export async function DELETE(request: Request) {
  const authResult = await getAuthenticatedBillingUser(request)

  if ('response' in authResult) {
    return authResult.response
  }

  const userId = authResult.userId

  try {
    const profileRes = await supabaseAdmin
      .from('profiles')
      .select('avatar_url, stripe_customer_id, stripe_subscription_id')
      .eq('id', userId)
      .maybeSingle<{
        avatar_url: string | null
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
      }>()

    if (profileRes.error) {
      throw profileRes.error
    }

    const stripeSubscriptionId = profileRes.data?.stripe_subscription_id ?? null
    const stripeCustomerId = profileRes.data?.stripe_customer_id ?? null

    if (stripeSubscriptionId || stripeCustomerId) {
      const stripe = getStripe()

      if (stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(stripeSubscriptionId)
        } catch (error) {
          console.error('Failed to cancel Stripe subscription during account deletion:', error)
          throw new Error('Could not cancel your Stripe subscription right now.')
        }
      }

      if (stripeCustomerId) {
        try {
          await stripe.customers.del(stripeCustomerId)
        } catch (error) {
          console.error('Failed to delete Stripe customer during account deletion:', error)
          throw new Error('Could not close your Stripe customer record right now.')
        }
      }
    }

    const mealsRes = await supabaseAdmin
      .from('meals')
      .select('id')
      .eq('user_id', userId)

    if (mealsRes.error) {
      throw mealsRes.error
    }

    const mealIds = (mealsRes.data ?? []).map((row) => row.id).filter(Boolean)
    await deleteRowsByIds('meal_items', 'meal_id', mealIds)
    await deleteRowsByIds('meals', 'id', mealIds)

    const dailyLogsRes = await supabaseAdmin
      .from('daily_logs')
      .select('id')
      .eq('user_id', userId)

    if (dailyLogsRes.error) {
      throw dailyLogsRes.error
    }

    const dailyLogIds = (dailyLogsRes.data ?? []).map((row) => row.id).filter(Boolean)
    await deleteRowsByIds('symptom_entries', 'daily_log_id', dailyLogIds)
    await deleteRowsByIds('bowel_entries', 'daily_log_id', dailyLogIds)
    await deleteRowsByIds('daily_logs', 'id', dailyLogIds)

    const communityPostsRes = await supabaseAdmin
      .from('community_posts')
      .select('id')
      .eq('user_id', userId)

    if (communityPostsRes.error) {
      throw communityPostsRes.error
    }

    const communityPostIds = (communityPostsRes.data ?? []).map((row) => row.id).filter(Boolean)
    await deleteRowsByIds('community_post_likes', 'user_id', [userId])
    await deleteRowsByIds('community_post_comments', 'user_id', [userId])
    await deleteRowsByIds('community_post_likes', 'post_id', communityPostIds)
    await deleteRowsByIds('community_post_comments', 'post_id', communityPostIds)
    await deleteRowsByIds('community_posts', 'id', communityPostIds)

    await deleteRowsByIds('user_foods', 'user_id', [userId])
    await deleteRowsByIds('user_condition_refs', 'user_id', [userId])
    await deleteRowsByIds('profiles', 'id', [userId])

    const avatarUrl = profileRes.data?.avatar_url ?? null
    const avatarPath = avatarUrl?.split('/object/public/avatars/')[1]
    if (avatarPath) {
      const { error: storageError } = await supabaseAdmin.storage.from('avatars').remove([avatarPath])
      if (storageError) {
        console.error('Failed to delete avatar during account deletion:', storageError)
      }
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      throw authDeleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion failed:', error)
    return NextResponse.json({ error: 'Could not delete your account right now.' }, { status: 500 })
  }
}
