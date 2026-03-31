import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

type ConditionRefRow = {
  id: string
  condition_id: string | null
}

type ConditionRow = {
  id: string
  name?: string | null
}

export type ResolvedConditionRef = {
  storedConditionId: string | null
  actualConditionId: string | null
  conditionName: string | null
}

const USER_CONDITION_REFS_TABLE = 'user_condition_refs'

function lowerParts(error: Pick<PostgrestError, 'message' | 'details' | 'hint'> | null): string {
  if (!error) return ''
  return [error.message, error.details, error.hint]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()
}

export function isMissingRelationError(error: Pick<PostgrestError, 'message' | 'details' | 'hint'> | null, relation: string): boolean {
  const haystack = lowerParts(error)
  if (!haystack) return false

  return haystack.includes(relation.toLowerCase()) && (
    haystack.includes('relation') ||
    haystack.includes('schema cache') ||
    haystack.includes('does not exist') ||
    haystack.includes('could not find')
  )
}

export async function resolveConditionRef(
  client: SupabaseClient,
  storedConditionId: string | null | undefined
): Promise<ResolvedConditionRef> {
  if (!storedConditionId) {
    return {
      storedConditionId: null,
      actualConditionId: null,
      conditionName: null,
    }
  }

  const refRes = await client
    .from(USER_CONDITION_REFS_TABLE)
    .select('id, condition_id')
    .eq('id', storedConditionId)
    .maybeSingle<ConditionRefRow>()

  if (!refRes.error && refRes.data?.condition_id) {
    const conditionRes = await client
      .from('conditions')
      .select('id, name')
      .eq('id', refRes.data.condition_id)
      .maybeSingle<ConditionRow>()

    return {
      storedConditionId,
      actualConditionId: refRes.data.condition_id,
      conditionName: conditionRes.error ? null : conditionRes.data?.name ?? null,
    }
  }

  if (refRes.error && !isMissingRelationError(refRes.error, USER_CONDITION_REFS_TABLE)) {
    throw refRes.error
  }

  const legacyConditionRes = await client
    .from('conditions')
    .select('id, name')
    .eq('id', storedConditionId)
    .maybeSingle<ConditionRow>()

  if (legacyConditionRes.error) {
    return {
      storedConditionId,
      actualConditionId: null,
      conditionName: null,
    }
  }

  return {
    storedConditionId,
    actualConditionId: legacyConditionRes.data?.id ?? null,
    conditionName: legacyConditionRes.data?.name ?? null,
  }
}

export async function persistConditionRef(
  client: SupabaseClient,
  userId: string,
  actualConditionId: string | null | undefined
): Promise<string | null> {
  if (!actualConditionId) {
    const deleteRes = await client
      .from(USER_CONDITION_REFS_TABLE)
      .delete()
      .eq('user_id', userId)

    if (deleteRes.error && !isMissingRelationError(deleteRes.error, USER_CONDITION_REFS_TABLE)) {
      throw deleteRes.error
    }

    return null
  }

  const upsertRes = await client
    .from(USER_CONDITION_REFS_TABLE)
    .upsert(
      {
        user_id: userId,
        condition_id: actualConditionId,
      },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single<{ id: string }>()

  if (upsertRes.error) {
    if (isMissingRelationError(upsertRes.error, USER_CONDITION_REFS_TABLE)) {
      return actualConditionId
    }

    throw upsertRes.error
  }

  return upsertRes.data.id
}
