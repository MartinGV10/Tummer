'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { Avatar } from '@radix-ui/themes'
import { IconChevronDown, IconHeart, IconMessageCircle, IconPencil, IconSend2, IconTrash, IconX } from '@tabler/icons-react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { useProfile } from '@/src/context/ProfileContext'

type CommunityPostRow = {
  id: string
  user_id: string
  content: string
  tag: string | null
  post_type: string | null
  created_at: string
  updated_at: string
}

type ProfileSummary = {
  id: string
  username: string | null
  avatar_url: string | null
}

type CommunityPostLikeRow = {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

type Condition = {
  id: string
  name: string
}

type CommunityPost = CommunityPostRow & {
  author: ProfileSummary | null
  conditionName: string | null
  likeCount: number
  viewerHasLiked: boolean
}
const POST_CHAR_LIMIT = 500
const POST_TYPE_OPTIONS = [
  { value: 'question', label: 'Question' },
  { value: 'advice', label: 'Advice' },
  { value: 'tip', label: 'Tip' },
  { value: 'experience', label: 'Experience' },
  { value: 'flare_update', label: 'Flare Update' },
] as const

function displayName(profile: ProfileSummary | null): string {
  if (!profile) return 'Community member'
  return profile.username?.trim() || 'Community member'
}

function relativeTime(value: string, now: number): string {
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

function postTypeLabel(value: string | null): string | null {
  return POST_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? null
}

function getAvatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

async function fetchProfilesByIds(userIds: string[]): Promise<Record<string, ProfileSummary>> {
  if (userIds.length === 0) return {}

  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', uniqueIds)

  if (error) {
    console.warn('Error loading post authors:', error)
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

async function fetchConditions(): Promise<Record<string, string>> {
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

async function fetchConditionNamesByIds(conditionIds: string[]): Promise<Record<string, string>> {
  if (conditionIds.length === 0) return {}

  const uniqueIds = [...new Set(conditionIds.map((id) => String(id)).filter(Boolean))]
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

function mergePosts(
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
  }))
}

async function fetchLikesForPosts(
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

function applyLikesToPosts(
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

function normalizeCommunityPost(row: Partial<CommunityPostRow>): CommunityPostRow {
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

function isMissingColumnError(error: PostgrestError | null, column: string): boolean {
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

function getFriendlyPostError(error: PostgrestError | null, isEditing: boolean): string {
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

function formatPostDebugDetails(error: PostgrestError | null): string {
  if (!error) return ''

  const parts = [error.code, error.message, error.details, error.hint]
    .filter((value): value is string => Boolean(value && value.trim()))

  return parts.length > 0 ? ` (${parts.join(' | ')})` : ''
}

async function insertCommunityPost(
  userId: string,
  payload: Pick<CommunityPostRow, 'content' | 'tag' | 'post_type'>
) {
  const fullInsert = await supabase.from('community_posts').insert({
    user_id: userId,
    ...payload,
  })

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

    return supabase.from('community_posts').insert(fallbackPayload)
  }

  return fullInsert
}

async function updateCommunityPost(
  postId: string,
  userId: string,
  payload: Pick<CommunityPostRow, 'content' | 'tag' | 'post_type'>
) {
  const fullUpdate = await supabase
    .from('community_posts')
    .update(payload)
    .eq('id', postId)
    .eq('user_id', userId)

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
  }

  return fullUpdate
}

const Community = () => {
  const { profile } = useProfile()
  const [content, setContent] = useState('')
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null)
  const [selectedPostType, setSelectedPostType] = useState('')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [conditionMap, setConditionMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmPostId, setDeleteConfirmPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [likingPostIds, setLikingPostIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true

    const loadCommunityData = async () => {
      setLoading(true)
      setError(null)

      const [postsRes, conditionsLookup] = await Promise.all([
        supabase
          .from('community_posts')
          .select('id, user_id, content, tag, post_type, created_at, updated_at')
          .order('created_at', { ascending: false }),
        fetchConditions(),
      ])

      if (!active) return

      if (postsRes.error) {
        console.warn('Error loading community posts:', postsRes.error)
        setError(`Could not load community posts right now.${formatPostDebugDetails(postsRes.error)}`)
        setPosts([])
        setLoading(false)
        return
      }

      const conditionList = Object.entries(conditionsLookup).map(([id, name]) => ({ id, name }))
      const rows = ((postsRes.data ?? []) as Array<Partial<CommunityPostRow>>).map((row) =>
        normalizeCommunityPost(row)
      )

      const userIds = [...new Set(rows.map((post) => post.user_id).filter(Boolean))]
      const profileMap = await fetchProfilesByIds(userIds)
      const { counts, viewerLikedPostIds } = await fetchLikesForPosts(rows.map((post) => post.id), profile?.id)

      if (!active) return

      setConditions(conditionList)
      setConditionMap(conditionsLookup)
      setPosts(applyLikesToPosts(mergePosts(rows, profileMap, conditionsLookup), counts, viewerLikedPostIds))
      setLoading(false)
    }

    void loadCommunityData()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const missingTags = [...new Set(
      posts
        .filter((post) => post.tag && !post.conditionName)
        .map((post) => String(post.tag))
    )]

    if (missingTags.length === 0) return

    let active = true

    const backfillConditionNames = async () => {
      const fetchedMap = await fetchConditionNamesByIds(missingTags)
      if (!active || Object.keys(fetchedMap).length === 0) return

      setConditionMap((prev) => ({ ...prev, ...fetchedMap }))
      setPosts((prev) =>
        prev.map((post) => ({
          ...post,
          conditionName: post.tag
            ? post.conditionName ?? fetchedMap[String(post.tag)] ?? post.tag
            : null,
        }))
      )
    }

    void backfillConditionNames()

    return () => {
      active = false
    }
  }, [posts])

  useEffect(() => {
    const channel = supabase
      .channel('community-posts-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_posts',
        },
        async (payload) => {
          const newPost = normalizeCommunityPost(payload.new as Partial<CommunityPostRow>)
          const profileMap = await fetchProfilesByIds([newPost.user_id])
          const mergedPost = mergePosts([newPost], profileMap, conditionMap)[0]

          setPosts((prev) => {
            if (prev.some((post) => post.id === mergedPost.id)) return prev
            return [mergedPost, ...prev].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_posts',
        },
        async (payload) => {
          const updatedPost = normalizeCommunityPost(payload.new as Partial<CommunityPostRow>)
          const profileMap = await fetchProfilesByIds([updatedPost.user_id])
          const mergedPost = mergePosts([updatedPost], profileMap, conditionMap)[0]

          setPosts((prev) =>
            prev.map((post) => (post.id === mergedPost.id ? { ...mergedPost, likeCount: post.likeCount, viewerHasLiked: post.viewerHasLiked } : post))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_posts',
        },
        (payload) => {
          const deletedPost = payload.old as { id: string }
          setPosts((prev) => prev.filter((post) => post.id !== deletedPost.id))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_post_likes',
        },
        (payload) => {
          const like = payload.new as CommunityPostLikeRow
          setPosts((prev) => prev.map((post) => {
            if (post.id !== like.post_id) return post
            if (like.user_id === profile?.id && post.viewerHasLiked) return post
            return {
              ...post,
              likeCount: post.likeCount + 1,
              viewerHasLiked: like.user_id === profile?.id ? true : post.viewerHasLiked,
            }
          }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_post_likes',
        },
        (payload) => {
          const like = payload.old as CommunityPostLikeRow
          setPosts((prev) => prev.map((post) => {
            if (post.id !== like.post_id) return post
            if (like.user_id === profile?.id && !post.viewerHasLiked) return post
            return {
              ...post,
              likeCount: Math.max(0, post.likeCount - 1),
              viewerHasLiked: like.user_id === profile?.id ? false : post.viewerHasLiked,
            }
          }))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conditionMap, profile?.id])

  const remainingChars = POST_CHAR_LIMIT - content.length
  const composerConditionId = selectedConditionId ?? profile?.condition_id ?? ''
  const canSubmit =
    content.trim().length > 0 &&
    content.length <= POST_CHAR_LIMIT &&
    selectedPostType.trim().length > 0 &&
    Boolean(profile)

  const resetComposer = () => {
    setContent('')
    setSelectedPostType('')
    setSelectedConditionId(null)
    setEditingPostId(null)
    setSubmitError(null)
  }

  const handleLikeToggle = async (post: CommunityPost) => {
    if (!profile) return

    const wasLiked = post.viewerHasLiked

    setLikingPostIds((prev) => (prev.includes(post.id) ? prev : [...prev, post.id]))
    setError(null)
    setPosts((prev) => prev.map((item) => {
      if (item.id !== post.id) return item
      return {
        ...item,
        viewerHasLiked: !wasLiked,
        likeCount: Math.max(0, item.likeCount + (wasLiked ? -1 : 1)),
      }
    }))

    if (wasLiked) {
      const { error } = await supabase
        .from('community_post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', profile.id)

      if (error) {
        console.error('Error removing community post like:', error)
        setPosts((prev) => prev.map((item) => {
          if (item.id !== post.id) return item
          return {
            ...item,
            viewerHasLiked: true,
            likeCount: item.likeCount + 1,
          }
        }))
        setError('Could not remove your like right now.')
      }
    } else {
      const { error } = await supabase
        .from('community_post_likes')
        .insert({
          post_id: post.id,
          user_id: profile.id,
        })

      if (error) {
        console.error('Error adding community post like:', error)
        setPosts((prev) => prev.map((item) => {
          if (item.id !== post.id) return item
          return {
            ...item,
            viewerHasLiked: false,
            likeCount: Math.max(0, item.likeCount - 1),
          }
        }))
        setError('Could not like that post right now.')
      }
    }

    setLikingPostIds((prev) => prev.filter((postId) => postId !== post.id))
  }

  const handlePost = () => {
    if (!profile) return
    if (!content.trim()) {
      setSubmitError('Write something before posting.')
      return
    }

    if (!selectedPostType.trim()) {
      setSubmitError('Choose what kind of post this is.')
      return
    }

    if (content.length > POST_CHAR_LIMIT) {
      setSubmitError(`Posts must be ${POST_CHAR_LIMIT} characters or less.`)
      return
    }

    setSubmitError(null)

    startTransition(async () => {
      const payload = {
        content: content.trim(),
        tag: composerConditionId || null,
        post_type: selectedPostType || null,
      }

      const response = editingPostId
        ? await updateCommunityPost(editingPostId, profile.id, payload)
        : await insertCommunityPost(profile.id, payload)

      if (response.error) {
        console.warn('Community post save failed:', response.error)
        setSubmitError(
          `${getFriendlyPostError(response.error, Boolean(editingPostId))}${formatPostDebugDetails(response.error)}`
        )
        return
      }

      resetComposer()
    })
  }

  const handleEdit = (post: CommunityPost) => {
    setEditingPostId(post.id)
    setContent(post.content)
    setSelectedConditionId(post.tag ?? '')
    setSelectedPostType(post.post_type ?? '')
    setSubmitError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (postId: string) => {
    setDeletingId(postId)
    setError(null)

    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', profile?.id ?? '')

    if (error) {
      console.error('Error deleting community post:', error)
      setError('Could not delete that post.')
      setDeletingId(null)
      return
    }

    if (editingPostId === postId) {
      resetComposer()
    }

    setPosts((prev) => prev.filter((post) => post.id !== postId))
    setDeletingId(null)
    setDeleteConfirmPostId(null)
  }

  const emptyState = useMemo(
    () => (
      <div className="rounded-2xl border border-dashed border-green-300 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
          <IconMessageCircle size={24} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">No posts yet</h2>
        <p className="mt-2 text-sm text-gray-600">
          Be the first to share a question, tip, flare update, or piece of advice with the community.
        </p>
      </div>
    ),
    []
  )

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 xl:grid xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
      {deleteConfirmPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-xl">
            <div className="border-b border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Confirm Delete</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">Delete this post?</h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <p className="text-sm leading-6 text-gray-600">
                This will permanently remove the post from the community feed.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPostId(null)}
                  disabled={Boolean(deletingId)}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(deleteConfirmPostId)}
                  disabled={Boolean(deletingId)}
                  className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-all hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === deleteConfirmPostId ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        <aside className="xl:sticky xl:top-24">
          <div className="overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm">
            <div className="border-b border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">Create Post</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">Community Feed</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Ask questions, share tips, and post quick updates while the feed stays front and center.
              </p>
            </div>

            <div className="p-5">
              <div className="flex items-start gap-3">
                <Avatar
                  size="5"
                  radius="full"
                  src={getAvatarUrl(profile?.avatar_url)}
                  fallback={profile?.first_name?.[0] ?? 'U'}
                  color="green"
                  className="border border-green-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.username : 'Community member'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {editingPostId ? 'Editing your post' : 'Post to the community'}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Post Type</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-2xl border border-green-200 bg-white px-3 py-3 pr-10 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100 cursor-pointer"
                      value={selectedPostType}
                      onChange={(e) => setSelectedPostType(e.target.value)}
                    >
                      <option value="">Choose a post type</option>
                      {POST_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <IconChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Condition Tag</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-2xl border border-green-200 bg-white px-3 py-3 pr-10 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100 cursor-pointer"
                      value={composerConditionId}
                      onChange={(e) => setSelectedConditionId(e.target.value || null)}
                    >
                      <option value="">No condition tag</option>
                      {conditions.map((condition) => (
                        <option key={condition.id} value={condition.id}>{condition.name}</option>
                      ))}
                    </select>
                    <IconChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Message</label>
                  <textarea
                    value={content}
                    maxLength={POST_CHAR_LIMIT}
                    rows={7}
                    placeholder="What's been going on with your condition lately?"
                    className="w-full resize-none rounded-3xl border border-green-200 bg-green-50/60 px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50/70 px-3 py-2.5 text-xs text-gray-600">
                  <span className={remainingChars < 50 ? 'font-semibold text-amber-700' : 'font-medium text-green-800'}>
                    {remainingChars} characters remaining
                  </span>
                  {submitError && <p className="mt-1.5 text-red-600">{submitError}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handlePost}
                    disabled={!canSubmit || isPending}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <IconSend2 size={16} />
                    <span className="ml-2">{isPending ? (editingPostId ? 'Saving...' : 'Posting...') : editingPostId ? 'Save Post' : 'Post to Feed'}</span>
                  </button>
                  {editingPostId && (
                    <button
                      type="button"
                      onClick={resetComposer}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 cursor-pointer"
                    >
                      <IconX size={16} />
                      <span className="ml-2">Cancel Edit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-[28px] border border-green-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Live Discussion</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Newest posts first</h2>
              <p className="mt-1 text-sm text-gray-600">
                The feed is the focus here, with quick context and actions on every post.
              </p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50/80 px-4 py-3 text-sm text-gray-700 shadow-sm">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'} in the feed
            </div>
          </div>

          {loading ? (
            <div className="overflow-hidden rounded-[28px] border border-green-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">Loading community feed...</p>
            </div>
          ) : error ? (
            <div className="overflow-hidden rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : posts.length === 0 ? (
            emptyState
          ) : (
            posts.map((post) => {
              const isOwner = post.user_id === profile?.id
              const postType = postTypeLabel(post.post_type)

              return (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm transition-all hover:border-green-300 hover:shadow-md"
                >
                  <div className="border-b border-green-100 px-5 py-4 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar
                          size="4"
                          radius="full"
                          src={getAvatarUrl(post.author?.avatar_url)}
                          fallback={(post.author?.username?.[0] ?? 'U').toUpperCase()}
                          color="green"
                          className="border border-green-200"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-sm font-semibold text-gray-900">{displayName(post.author)}</p>
                            <span className="text-xs text-gray-400">@{post.author?.username?.trim() || 'member'}</span>
                            <span className="hidden text-xs text-gray-300 sm:inline">•</span>
                            <span className="text-xs text-gray-500">{relativeTime(post.created_at, now)}</span>
                            {post.updated_at !== post.created_at && <span className="text-xs text-gray-400">Edited</span>}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {postType && (
                              <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-800">
                                {postType}
                              </span>
                            )}
                            {post.conditionName && (
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                {post.conditionName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isOwner && (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(post)}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 cursor-pointer"
                          >
                            <IconPencil size={14} />
                            <span className="ml-1.5 hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmPostId(post.id)}
                            disabled={deletingId === post.id}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition-all hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                          >
                            <IconTrash size={14} />
                            <span className="ml-1.5 hidden sm:inline">{deletingId === post.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-5 sm:px-6">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{post.content}</p>

                    <div className="mt-5 flex items-center gap-3 border-t border-green-100 pt-4">
                      <button
                        type="button"
                        onClick={() => void handleLikeToggle(post)}
                        disabled={!profile || likingPostIds.includes(post.id)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                          post.viewerHasLiked
                            ? 'border-green-300 bg-green-50 text-green-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:text-green-700'
                        }`}
                      >
                        <IconHeart size={15} className={post.viewerHasLiked ? 'text-green-700' : 'text-gray-500'} />
                        <span>{post.viewerHasLiked ? 'Liked' : 'Like'}</span>
                      </button>
                      <span className="text-xs font-medium text-gray-500">
                        {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
                      </span>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}

export default Community







