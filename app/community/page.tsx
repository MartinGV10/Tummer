'use client'

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Avatar } from '@radix-ui/themes'
import { IconChevronDown, IconMessageCircle, IconSend2, IconX } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'
import AdSenseAd from '@/app/components/AdSenseAd'
import { useProfile } from '@/src/context/ProfileContext'
import CommunityPostCard from './CommunityPostCard'
import {
  applyCommentCountsToPosts,
  applyLikesToPosts,
  CommunityPost,
  CommunityPostCommentRow,
  CommunityPostLikeRow,
  CommunityPostRow,
  Condition,
  fetchCommentCountsForPosts,
  fetchConditionNamesByIds,
  fetchConditions,
  fetchLikesForPosts,
  fetchProfilesByIds,
  formatPostDebugDetails,
  getAvatarUrl,
  getFriendlyPostError,
  insertCommunityPost,
  mergePosts,
  normalizeCommunityPost,
  POST_CHAR_LIMIT,
  POST_TYPE_OPTIONS,
  ProfileSummary,
  updateCommunityPost,
} from './communityData'

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
  const conditionMapRef = useRef(conditionMap)
  const feedAdInterval = 12

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
      const rows = ((postsRes.data ?? []) as Array<Partial<CommunityPostRow>>).map((row) => normalizeCommunityPost(row))
      const userIds = [...new Set(rows.map((post) => post.user_id).filter(Boolean))]

      const [profileMap, likes, commentCounts] = await Promise.all([
        fetchProfilesByIds(userIds),
        fetchLikesForPosts(rows.map((post) => post.id), profile?.id),
        fetchCommentCountsForPosts(rows.map((post) => post.id)),
      ])

      if (!active) return

      const mergedPosts = mergePosts(rows, profileMap, conditionsLookup)
      const postsWithLikes = applyLikesToPosts(mergedPosts, likes.counts, likes.viewerLikedPostIds)

      setConditions(conditionList)
      setConditionMap(conditionsLookup)
      setPosts(applyCommentCountsToPosts(postsWithLikes, commentCounts))
      setLoading(false)
    }

    void loadCommunityData()

    return () => {
      active = false
    }
  }, [profile?.id])

  useEffect(() => {
    conditionMapRef.current = conditionMap
  }, [conditionMap])

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
          const mergedPost = mergePosts([newPost], profileMap, conditionMapRef.current)[0]

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
          const mergedPost = mergePosts([updatedPost], profileMap, conditionMapRef.current)[0]

          setPosts((prev) =>
            prev.map((post) => (
              post.id === mergedPost.id
                ? {
                    ...mergedPost,
                    likeCount: post.likeCount,
                    viewerHasLiked: post.viewerHasLiked,
                    commentCount: post.commentCount,
                  }
                : post
            ))
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_post_comments',
        },
        (payload) => {
          const comment = payload.new as CommunityPostCommentRow
          setPosts((prev) => prev.map((post) => (
            post.id === comment.post_id
              ? { ...post, commentCount: post.commentCount + 1 }
              : post
          )))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_post_comments',
        },
        (payload) => {
          const comment = payload.old as CommunityPostCommentRow
          setPosts((prev) => prev.map((post) => (
            post.id === comment.post_id
              ? { ...post, commentCount: Math.max(0, post.commentCount - 1) }
              : post
          )))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.id])

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
      const { error: likeError } = await supabase
        .from('community_post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', profile.id)

      if (likeError) {
        console.error('Error removing community post like:', likeError)
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
      const { error: likeError } = await supabase
        .from('community_post_likes')
        .insert({
          post_id: post.id,
          user_id: profile.id,
        })

      if (likeError) {
        console.error('Error adding community post like:', likeError)
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

      const savedPostRow = response.data ? normalizeCommunityPost(response.data as Partial<CommunityPostRow>) : null

      if (savedPostRow) {
        const currentUserProfile: Record<string, ProfileSummary> = {
          [profile.id]: {
            id: profile.id,
            username: profile.username ?? null,
            avatar_url: profile.avatar_url ?? null,
          },
        }
        const mergedPost = mergePosts([savedPostRow], currentUserProfile, conditionMapRef.current)[0]

        setPosts((prev) => {
          if (editingPostId) {
            return prev.map((post) => (
              post.id === mergedPost.id
                ? {
                    ...mergedPost,
                    likeCount: post.likeCount,
                    viewerHasLiked: post.viewerHasLiked,
                    commentCount: post.commentCount,
                  }
                : post
            ))
          }

          if (prev.some((post) => post.id === mergedPost.id)) return prev

          return [mergedPost, ...prev].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        })
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

    const { error: deleteError } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', profile?.id ?? '')

    if (deleteError) {
      console.error('Error deleting community post:', deleteError)
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

  const feedItems = useMemo(() => {
    const items: Array<{ type: 'post'; post: CommunityPost } | { type: 'ad'; key: string }> = []

    posts.forEach((post, index) => {
      items.push({ type: 'post', post })

      const isAdBreak = (index + 1) % feedAdInterval === 0
      const isNotLastPost = index < posts.length - 1

      if (isAdBreak && isNotLastPost) {
        items.push({ type: 'ad', key: `community-ad-${index + 1}` })
      }
    })

    return items
  }, [posts])

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
                    className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(deleteConfirmPostId)}
                    disabled={Boolean(deletingId)}
                    className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-all hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    {deletingId === deleteConfirmPostId ? 'Deleting...' : 'Delete Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <aside className="xl:sticky xl:top-24">
          <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm xl:max-h-[calc(100dvh-7rem)]">
            <div className="border-b border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">Create Post</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">Community Feed</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Ask questions, share tips, and post quick updates while the feed stays front and center.
              </p>
            </div>

            <div className="min-h-0 overflow-y-auto p-5">
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
                    rows={6}
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
          {/* <div className="flex flex-col gap-3 rounded-[28px] border border-green-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
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
          </div> */}

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
            feedItems.map((item) => (
              item.type === 'ad' ? (
                <AdSenseAd
                  key={item.key}
                  slot="4563997002"
                  variant="community"
                  label="Sponsored"
                  description="Community partner message"
                />
              ) : (
                <CommunityPostCard
                  key={item.post.id}
                  post={item.post}
                  now={now}
                  profileId={profile?.id}
                  canLike={Boolean(profile)}
                  isLiking={likingPostIds.includes(item.post.id)}
                  onLikeToggle={handleLikeToggle}
                  onEdit={handleEdit}
                  onDelete={setDeleteConfirmPostId}
                  deletingId={deletingId}
                  detailHref={`/community/${item.post.id}`}
                />
              )
            ))
          )}
        </section>
      </div>
    </div>
  )
}

export default Community

