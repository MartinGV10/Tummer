'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { Avatar } from '@radix-ui/themes'
import { IconMessageCircle, IconPencil, IconSend2, IconTrash, IconX } from '@tabler/icons-react'
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

type Condition = {
  id: string
  name: string
}

type CommunityPost = CommunityPostRow & {
  author: ProfileSummary | null
  conditionName: string | null
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
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
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

      if (!active) return

      setConditions(conditionList)
      setConditionMap(conditionsLookup)
      setPosts(mergePosts(rows, profileMap, conditionsLookup))
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
            prev.map((post) => (post.id === mergedPost.id ? mergedPost : post))
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
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conditionMap])

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
    const confirmed = window.confirm('Delete this post?')
    if (!confirmed) return

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
    <div className="p-4 md:p-6 mt-3 md:mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex flex-col gap-5">
        <div className="rounded-3xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-medium tracking-tight text-gray-900">Community</h1>
              <p className="mt-1 text-sm text-gray-600">
                Share advice, ask questions, post updates, and connect with others managing similar conditions.
              </p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-white/80 px-4 py-3 text-sm text-gray-700 shadow-sm">
              Realtime feed enabled
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-green-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <Avatar
              size="5"
              radius="full"
              src={getAvatarUrl(profile?.avatar_url)}
              fallback={profile?.first_name?.[0] ?? 'U'}
              color="green"
              className="border border-green-200"
            />
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.username : 'Community member'}
                </p>
                <p className="text-xs text-gray-500">
                  {editingPostId ? 'Editing your post' : 'Share an update with the community'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Post Type</label>
                  <select
                    className="w-full rounded-xl border border-green-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    value={selectedPostType}
                    onChange={(e) => setSelectedPostType(e.target.value)}
                  >
                    <option value="">Choose a post type</option>
                    {POST_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Condition Tag</label>
                  <select
                    className="w-full rounded-xl border border-green-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    value={composerConditionId}
                    onChange={(e) => setSelectedConditionId(e.target.value || null)}
                  >
                    <option value="">No condition tag</option>
                    {conditions.map((condition) => (
                      <option key={condition.id} value={condition.id}>{condition.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                value={content}
                maxLength={POST_CHAR_LIMIT}
                rows={5}
                placeholder="What's been going on with your condition lately?"
                className="w-full resize-none rounded-2xl border border-green-200 bg-green-50/40 px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
                onChange={(e) => setContent(e.target.value)}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs">
                  <span className={remainingChars < 50 ? 'font-medium text-amber-700' : 'text-gray-500'}>
                    {remainingChars} characters remaining
                  </span>
                  {submitError && <p className="mt-1 text-red-600">{submitError}</p>}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {editingPostId && (
                    <button
                      type="button"
                      onClick={resetComposer}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700"
                    >
                      <IconX size={16} />
                      <span className="ml-2">Cancel Edit</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePost}
                    disabled={!canSubmit || isPending}
                    className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconSend2 size={16} />
                    <span className="ml-2">{isPending ? (editingPostId ? 'Saving...' : 'Posting...') : editingPostId ? 'Save Post' : 'Post'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Posts</h2>
            <p className="text-xs text-gray-500">Newest first</p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">Loading community feed...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
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
                  className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar
                        size="4"
                        radius="full"
                        src={getAvatarUrl(post.author?.avatar_url)}
                        fallback={(post.author?.username?.[0] ?? 'U').toUpperCase()}
                        color="green"
                        className="border border-green-200"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{displayName(post.author)}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                          <span>@{post.author?.username?.trim() || 'member'}</span>
                          <span>&bull;</span>
                          <span>{relativeTime(post.created_at, now)}</span>
                          {post.updated_at !== post.created_at && (
                            <>
                              <span>&bull;</span>
                              <span>Edited</span>
                            </>
                          )}
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(post)}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700"
                        >
                          <IconPencil size={14} />
                          <span className="ml-1.5">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          disabled={deletingId === post.id}
                          className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition-all hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <IconTrash size={14} />
                          <span className="ml-1.5">{deletingId === post.id ? 'Deleting...' : 'Delete'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{post.content}</p>
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