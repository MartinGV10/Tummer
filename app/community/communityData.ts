import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

export type CommunityPostRow = {
  id: string
  user_id: string
  content: string
  tag: string | null
  post_type: string | null
  created_at: string
  updated_at: string
}

export type ProfileSummary = {
  id: string
  username: string | null
  avatar_url: string | null
}

export type PublicProfile = ProfileSummary & {
  first_name: string | null
  last_name: string | null
  condition_id: string | null
  show_condition_on_profile: boolean
}

export type CommunityPostLikeRow = {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export type CommunityPostCommentRow = {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  updated_at: string
}

export type Condition = {
  id: string
  name: string
}

export type CommunityComment = CommunityPostCommentRow & {
  author: ProfileSummary | null
}

export type CommunityPost = CommunityPostRow & {
  author: ProfileSummary | null
  conditionName: string | null
  likeCount: number
  viewerHasLiked: boolean
  commentCount: number
}

export const POST_CHAR_LIMIT = 500
export const COMMENT_CHAR_LIMIT = 500
export const POST_TYPE_OPTIONS = [
  { value: 'question', label: 'Question' },
  { value: 'advice', label: 'Advice' },
  { value: 'tip', label: 'Tip' },
  { value: 'experience', label: 'Experience' },
  { value: 'flare_update', label: 'Flare Update' },
] as const
export const COMMUNITY_POST_SELECT = 'id, user_id, content, tag, post_type, created_at, updated_at'
export const COMMUNITY_COMMENT_SELECT = 'id, post_id, user_id, content, parent_id, created_at, updated_at'

export function displayName(profile: ProfileSummary | null): string {
  if (!profile) return 'Community member'
  return profile.username?.trim() || 'Community member'
}

export function relativeTime(value: string, now: number): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  const diffSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000))
  if (diffSeconds < 10) return 'Just now'
  if (diffSeconds < 60) return `${diffSeconds}s ago`

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function postTypeLabel(value: string | null): string | null {
  return POST_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? null
}

export function getAvatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export async function fetchProfilesByIds(userIds: string[]): Promise<Record<string, ProfileSummary>> {
  if (userIds.length === 0) return {}

  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', uniqueIds)

  if (error) {
    console.warn('Error loading community profiles:', error)
    return {}
  }

  return ((data ?? []) as ProfileSummary[]).reduce<Record<string, ProfileSummary>>((acc, item) => {
    acc[item.id] = {
      id: item.id,
      username: item.username ?? null,
      avatar_url: item.avatar_url ?? null,
    }
    return acc
  }, {})
}

export async function fetchConditions(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('conditions')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error loading conditions for community:', error)
    return {}
  }

  return ((data ?? []) as Condition[]).reduce<Record<string, string>>((acc, item) => {
    acc[String(item.id)] = item.name
    return acc
  }, {})
}

export async function fetchConditionNamesByIds(conditionIds: string[]): Promise<Record<string, string>> {
  if (conditionIds.length === 0) return {}

  const uniqueIds = [...new Set(
    conditionIds
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter((id) => id.length > 0 && id !== 'null' && id !== 'undefined')
  )]
  if (uniqueIds.length === 0) return {}

  const { data, error } = await supabase
    .from('conditions')
    .select('id, name')
    .in('id', uniqueIds)

  if (error) {
    console.error('Error loading condition tags for posts:', error)
    return {}
  }

  return ((data ?? []) as Condition[]).reduce<Record<string, string>>((acc, item) => {
    acc[String(item.id)] = item.name
    return acc
  }, {})
}

export function mergePosts(
  posts: CommunityPostRow[],
  profiles: Record<string, ProfileSummary>,
  conditions: Record<string, string>
): CommunityPost[] {
  return posts.map((post) => ({
    ...post,
    author: profiles[post.user_id] ?? null,
    conditionName: post.tag ? conditions[String(post.tag)] ?? post.tag : null,
    likeCount: 0,
    viewerHasLiked: false,
    commentCount: 0,
  }))
}

export function mergeComments(
  comments: CommunityPostCommentRow[],
  profiles: Record<string, ProfileSummary>
): CommunityComment[] {
  return comments.map((comment) => ({
    ...comment,
    author: profiles[comment.user_id] ?? null,
  }))
}

export async function fetchLikesForPosts(
  postIds: string[],
  viewerId: string | null | undefined
): Promise<{ counts: Record<string, number>; viewerLikedPostIds: Set<string> }> {
  if (postIds.length === 0) {
    return { counts: {}, viewerLikedPostIds: new Set<string>() }
  }

  const uniqueIds = [...new Set(postIds.filter(Boolean))]
  if (uniqueIds.length === 0) {
    return { counts: {}, viewerLikedPostIds: new Set<string>() }
  }

  const { data, error } = await supabase
    .from('community_post_likes')
    .select('id, post_id, user_id, created_at')
    .in('post_id', uniqueIds)

  if (error) {
    console.warn('Error loading likes for community posts:', error)
    return { counts: {}, viewerLikedPostIds: new Set<string>() }
  }

  const counts: Record<string, number> = {}
  const viewerLikedPostIds = new Set<string>()

  for (const like of (data ?? []) as CommunityPostLikeRow[]) {
    counts[like.post_id] = (counts[like.post_id] ?? 0) + 1
    if (viewerId && like.user_id === viewerId) {
      viewerLikedPostIds.add(like.post_id)
    }
  }

  return { counts, viewerLikedPostIds }
}

export async function fetchCommentCountsForPosts(postIds: string[]): Promise<Record<string, number>> {
  if (postIds.length === 0) return {}

  const uniqueIds = [...new Set(postIds.filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const { data, error } = await supabase
    .from('community_post_comments')
    .select('id, post_id')
    .in('post_id', uniqueIds)

  if (error) {
    console.warn('Error loading community comment counts:', error)
    return {}
  }

  return ((data ?? []) as Array<Pick<CommunityPostCommentRow, 'post_id'>>).reduce<Record<string, number>>((acc, item) => {
    acc[item.post_id] = (acc[item.post_id] ?? 0) + 1
    return acc
  }, {})
}

export function applyLikesToPosts(
  posts: CommunityPost[],
  counts: Record<string, number>,
  viewerLikedPostIds: Set<string>
): CommunityPost[] {
  return posts.map((post) => ({
    ...post,
    likeCount: counts[post.id] ?? 0,
    viewerHasLiked: viewerLikedPostIds.has(post.id),
  }))
}

export function applyCommentCountsToPosts(
  posts: CommunityPost[],
  counts: Record<string, number>
): CommunityPost[] {
  return posts.map((post) => ({
    ...post,
    commentCount: counts[post.id] ?? 0,
  }))
}

export function normalizeCommunityPost(row: Partial<CommunityPostRow>): CommunityPostRow {
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date(0).toISOString()
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : createdAt
  const legacyConditionId = (row as Partial<{ condition_id: string | null }>).condition_id ?? null

  return {
    id: row.id ?? '',
    user_id: row.user_id ?? '',
    content: row.content ?? '',
    tag: row.tag ?? legacyConditionId,
    post_type: row.post_type ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export function normalizeCommunityComment(row: Partial<CommunityPostCommentRow>): CommunityPostCommentRow {
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date(0).toISOString()
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : createdAt

  return {
    id: row.id ?? '',
    post_id: row.post_id ?? '',
    user_id: row.user_id ?? '',
    content: row.content ?? '',
    parent_id: row.parent_id ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export async function fetchPublicProfileByUsername(username: string): Promise<PublicProfile | null> {
  const trimmedUsername = username.trim()
  if (!trimmedUsername) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, first_name, last_name, condition_id, show_condition_on_profile')
    .ilike('username', trimmedUsername)
    .maybeSingle()

  if (error) {
    console.warn('Error loading public profile:', error)
    return null
  }

  if (!data) return null

  const profile = data as PublicProfile
  return {
    ...profile,
    first_name: profile.first_name ?? null,
    last_name: profile.last_name ?? null,
    condition_id: profile.condition_id ?? null,
    show_condition_on_profile: Boolean(profile.show_condition_on_profile),
  }
}

export function isMissingColumnError(error: PostgrestError | null, column: string): boolean {
  if (!error) return false

  const haystack = [error.message, error.details, error.hint]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()

  return haystack.includes(column.toLowerCase()) && (
    haystack.includes('column') ||
    haystack.includes('schema cache') ||
    haystack.includes('could not find')
  )
}

export function getFriendlyPostError(error: PostgrestError | null, isEditing: boolean): string {
  if (!error) {
    return isEditing ? 'Could not update your post right now.' : 'Could not publish your post right now.'
  }

  if (error.code === '42501') {
    return isEditing
      ? 'You do not have permission to update this post.'
      : 'You do not have permission to publish posts yet.'
  }

  if (error.code === '23503') {
    return 'Your post uses a condition tag that is no longer available.'
  }

  return isEditing ? 'Could not update your post right now.' : 'Could not publish your post right now.'
}

export function getFriendlyCommentError(error: PostgrestError | null): string {
  if (!error) return 'Could not send your reply right now.'
  if (error.code === '42501') return 'You do not have permission to reply to this post.'
  if (error.code === '23503') return 'This post is no longer available for replies.'
  if (isMissingColumnError(error, 'parent_id')) {
    return 'Threaded replies need a quick database update before they can be used.'
  }
  return 'Could not send your reply right now.'
}

export async function fetchCommunityComments(postId: string) {
  const fullSelect = await supabase
    .from('community_post_comments')
    .select(COMMUNITY_COMMENT_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (fullSelect.error && isMissingColumnError(fullSelect.error, 'parent_id')) {
    return supabase
      .from('community_post_comments')
      .select('id, post_id, user_id, content, created_at, updated_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
  }

  return fullSelect
}

export async function insertCommunityComment(
  postId: string,
  userId: string,
  content: string,
  parentId?: string | null
) {
  const fullInsert = await supabase
    .from('community_post_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content,
      parent_id: parentId ?? null,
    })
    .select(COMMUNITY_COMMENT_SELECT)
    .single()

  if (fullInsert.error && isMissingColumnError(fullInsert.error, 'parent_id')) {
    if (parentId) {
      return fullInsert
    }

    return supabase
      .from('community_post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
      })
      .select('id, post_id, user_id, content, created_at, updated_at')
      .single()
  }

  return fullInsert
}

export function formatPostDebugDetails(error: PostgrestError | null): string {
  if (!error) return ''

  const parts = [error.code, error.message, error.details, error.hint]
    .filter((value): value is string => Boolean(value && value.trim()))

  return parts.length > 0 ? ` (${parts.join(' | ')})` : ''
}

export async function insertCommunityPost(
  userId: string,
  payload: Pick<CommunityPostRow, 'content' | 'tag' | 'post_type'>
) {
  const fullInsert = await supabase
    .from('community_posts')
    .insert({
      user_id: userId,
      ...payload,
    })
    .select(COMMUNITY_POST_SELECT)
    .single()

  if (
    fullInsert.error &&
    (isMissingColumnError(fullInsert.error, 'tag') || isMissingColumnError(fullInsert.error, 'post_type'))
  ) {
    const fallbackPayload: {
      user_id: string
      content: string
      tag?: string | null
      post_type?: string | null
    } = {
      user_id: userId,
      content: payload.content,
    }

    if (!isMissingColumnError(fullInsert.error, 'tag')) {
      fallbackPayload.tag = payload.tag
    }

    if (!isMissingColumnError(fullInsert.error, 'post_type')) {
      fallbackPayload.post_type = payload.post_type
    }

    return supabase
      .from('community_posts')
      .insert(fallbackPayload)
      .select(COMMUNITY_POST_SELECT)
      .single()
  }

  return fullInsert
}

export async function updateCommunityPost(
  postId: string,
  userId: string,
  payload: Pick<CommunityPostRow, 'content' | 'tag' | 'post_type'>
) {
  const fullUpdate = await supabase
    .from('community_posts')
    .update(payload)
    .eq('id', postId)
    .eq('user_id', userId)
    .select(COMMUNITY_POST_SELECT)
    .single()

  if (
    fullUpdate.error &&
    (isMissingColumnError(fullUpdate.error, 'post_type') || isMissingColumnError(fullUpdate.error, 'tag'))
  ) {
    const fallbackPayload: {
      content: string
      tag?: string | null
      post_type?: string | null
    } = {
      content: payload.content,
    }

    if (!isMissingColumnError(fullUpdate.error, 'tag')) {
      fallbackPayload.tag = payload.tag
    }

    if (!isMissingColumnError(fullUpdate.error, 'post_type')) {
      fallbackPayload.post_type = payload.post_type
    }

    return supabase
      .from('community_posts')
      .update(fallbackPayload)
      .eq('id', postId)
      .eq('user_id', userId)
      .select(COMMUNITY_POST_SELECT)
      .single()
  }

  return fullUpdate
}
