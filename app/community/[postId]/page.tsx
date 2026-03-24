'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { Avatar } from '@radix-ui/themes'
import { IconArrowLeft, IconMessageCircle, IconSend2 } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'
import { useProfile } from '@/src/context/ProfileContext'
import CommunityPostCard from '../CommunityPostCard'
import {
  applyCommentCountsToPosts,
  applyLikesToPosts,
  COMMENT_CHAR_LIMIT,
  COMMUNITY_COMMENT_SELECT,
  COMMUNITY_POST_SELECT,
  CommunityComment,
  CommunityPost,
  CommunityPostCommentRow,
  CommunityPostLikeRow,
  CommunityPostRow,
  fetchConditions,
  fetchLikesForPosts,
  fetchProfilesByIds,
  formatPostDebugDetails,
  getAvatarUrl,
  getFriendlyCommentError,
  mergeComments,
  mergePosts,
  normalizeCommunityComment,
  normalizeCommunityPost,
  relativeTime,
} from '../communityData'

type CommunityPostDetailPageProps = {
  params: Promise<{
    postId: string
  }>
}

function sortComments(comments: CommunityComment[]): CommunityComment[] {
  return [...comments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export default function CommunityPostDetailPage({ params }: CommunityPostDetailPageProps) {
  const { profile } = useProfile()
  const [postId, setPostId] = useState('')
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [likingPostIds, setLikingPostIds] = useState<string[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let active = true

    const resolveParams = async () => {
      const resolved = await params
      if (!active) return
      setPostId(resolved.postId)
    }

    void resolveParams()

    return () => {
      active = false
    }
  }, [params])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!postId) return

    let active = true

    const loadPostDetail = async () => {
      setLoading(true)
      setError(null)

      const [postRes, commentsRes, conditionMap] = await Promise.all([
        supabase
          .from('community_posts')
          .select(COMMUNITY_POST_SELECT)
          .eq('id', postId)
          .maybeSingle(),
        supabase
          .from('community_post_comments')
          .select(COMMUNITY_COMMENT_SELECT)
          .eq('post_id', postId)
          .order('created_at', { ascending: true }),
        fetchConditions(),
      ])

      if (!active) return

      if (postRes.error) {
        console.warn('Error loading community post:', postRes.error)
        setError(`Could not load that post right now.${formatPostDebugDetails(postRes.error)}`)
        setPost(null)
        setComments([])
        setLoading(false)
        return
      }

      if (!postRes.data) {
        setError('That post could not be found.')
        setPost(null)
        setComments([])
        setLoading(false)
        return
      }

      if (commentsRes.error) {
        console.warn('Error loading community comments:', commentsRes.error)
        setError(`Could not load replies right now.${formatPostDebugDetails(commentsRes.error)}`)
        setPost(null)
        setComments([])
        setLoading(false)
        return
      }

      const postRow = normalizeCommunityPost(postRes.data as Partial<CommunityPostRow>)
      const commentRows = ((commentsRes.data ?? []) as Array<Partial<CommunityPostCommentRow>>)
        .map((row) => normalizeCommunityComment(row))
      const userIds = [...new Set([postRow.user_id, ...commentRows.map((comment) => comment.user_id)].filter(Boolean))]

      const [profileMap, likes] = await Promise.all([
        fetchProfilesByIds(userIds),
        fetchLikesForPosts([postId], profile?.id),
      ])

      if (!active) return

      const mergedPost = mergePosts([postRow], profileMap, conditionMap)[0]
      const postWithCounts = applyCommentCountsToPosts(
        applyLikesToPosts([mergedPost], likes.counts, likes.viewerLikedPostIds),
        { [postId]: commentRows.length }
      )[0]

      setPost(postWithCounts)
      setComments(sortComments(mergeComments(commentRows, profileMap)))
      setLoading(false)
    }

    void loadPostDetail()

    return () => {
      active = false
    }
  }, [postId, profile?.id])

  useEffect(() => {
    if (!postId) return

    const channel = supabase
      .channel(`community-post-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_posts',
          filter: `id=eq.${postId}`,
        },
        async (payload) => {
          const updatedPost = normalizeCommunityPost(payload.new as Partial<CommunityPostRow>)
          const profileMap = await fetchProfilesByIds([updatedPost.user_id])

          setPost((prev) => {
            if (!prev) return prev
            const mergedPost = mergePosts([updatedPost], profileMap, {
              ...(prev.tag && prev.conditionName ? { [String(prev.tag)]: prev.conditionName } : {}),
            })[0]
            return {
              ...prev,
              ...mergedPost,
              author: mergedPost.author ?? prev.author,
              conditionName: mergedPost.conditionName ?? prev.conditionName,
            }
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_posts',
          filter: `id=eq.${postId}`,
        },
        () => {
          setPost(null)
          setError('That post is no longer available.')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_post_likes',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const like = payload.new as CommunityPostLikeRow
          setPost((prev) => {
            if (!prev) return prev
            if (like.user_id === profile?.id && prev.viewerHasLiked) return prev
            return {
              ...prev,
              likeCount: prev.likeCount + 1,
              viewerHasLiked: like.user_id === profile?.id ? true : prev.viewerHasLiked,
            }
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_post_likes',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const like = payload.old as CommunityPostLikeRow
          setPost((prev) => {
            if (!prev) return prev
            if (like.user_id === profile?.id && !prev.viewerHasLiked) return prev
            return {
              ...prev,
              likeCount: Math.max(0, prev.likeCount - 1),
              viewerHasLiked: like.user_id === profile?.id ? false : prev.viewerHasLiked,
            }
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_post_comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const newComment = normalizeCommunityComment(payload.new as Partial<CommunityPostCommentRow>)
          const profileMap = await fetchProfilesByIds([newComment.user_id])
          const mergedComment = mergeComments([newComment], profileMap)[0]
          let added = false

          setComments((prev) => {
            if (prev.some((comment) => comment.id === mergedComment.id)) return prev
            added = true
            return sortComments([...prev, mergedComment])
          })

          if (added) {
            setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_post_comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const updatedComment = normalizeCommunityComment(payload.new as Partial<CommunityPostCommentRow>)
          setComments((prev) => prev.map((comment) => (
            comment.id === updatedComment.id
              ? { ...comment, ...updatedComment }
              : comment
          )))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_post_comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const deletedComment = payload.old as CommunityPostCommentRow
          let removed = false

          setComments((prev) => {
            const next = prev.filter((comment) => comment.id !== deletedComment.id)
            removed = next.length !== prev.length
            return next
          })

          if (removed) {
            setPost((prev) => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [postId, profile?.id])

  const remainingChars = COMMENT_CHAR_LIMIT - replyContent.length

  const handleLikeToggle = async (targetPost: CommunityPost) => {
    if (!profile) return

    const wasLiked = targetPost.viewerHasLiked

    setLikingPostIds((prev) => (prev.includes(targetPost.id) ? prev : [...prev, targetPost.id]))
    setError(null)
    setPost((prev) => prev ? {
      ...prev,
      viewerHasLiked: !wasLiked,
      likeCount: Math.max(0, prev.likeCount + (wasLiked ? -1 : 1)),
    } : prev)

    if (wasLiked) {
      const { error: likeError } = await supabase
        .from('community_post_likes')
        .delete()
        .eq('post_id', targetPost.id)
        .eq('user_id', profile.id)

      if (likeError) {
        console.error('Error removing community post like:', likeError)
        setPost((prev) => prev ? {
          ...prev,
          viewerHasLiked: true,
          likeCount: prev.likeCount + 1,
        } : prev)
        setError('Could not remove your like right now.')
      }
    } else {
      const { error: likeError } = await supabase
        .from('community_post_likes')
        .insert({
          post_id: targetPost.id,
          user_id: profile.id,
        })

      if (likeError) {
        console.error('Error adding community post like:', likeError)
        setPost((prev) => prev ? {
          ...prev,
          viewerHasLiked: false,
          likeCount: Math.max(0, prev.likeCount - 1),
        } : prev)
        setError('Could not like that post right now.')
      }
    }

    setLikingPostIds((prev) => prev.filter((value) => value !== targetPost.id))
  }

  const handleReplySubmit = () => {
    if (!profile || !post) return
    if (!replyContent.trim()) {
      setSubmitError('Write something before replying.')
      return
    }

    if (replyContent.length > COMMENT_CHAR_LIMIT) {
      setSubmitError(`Replies must be ${COMMENT_CHAR_LIMIT} characters or less.`)
      return
    }

    setSubmitError(null)

    startTransition(async () => {
      const response = await supabase
        .from('community_post_comments')
        .insert({
          post_id: post.id,
          user_id: profile.id,
          content: replyContent.trim(),
        })
        .select(COMMUNITY_COMMENT_SELECT)
        .single()

      if (response.error) {
        console.warn('Community reply save failed:', response.error)
        setSubmitError(`${getFriendlyCommentError(response.error)}${formatPostDebugDetails(response.error)}`)
        return
      }

      const savedComment = normalizeCommunityComment(response.data as Partial<CommunityPostCommentRow>)
      const mergedComment: CommunityComment = {
        ...savedComment,
        author: {
          id: profile.id,
          username: profile.username ?? null,
          avatar_url: profile.avatar_url ?? null,
        },
      }

      setComments((prev) => {
        if (prev.some((comment) => comment.id === mergedComment.id)) return prev
        return sortComments([...prev, mergedComment])
      })
      setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev)
      setReplyContent('')
    })
  }

  const emptyReplies = useMemo(
    () => (
      <div className="rounded-[28px] border border-dashed border-green-300 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
          <IconMessageCircle size={24} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">No replies yet</h2>
        <p className="mt-2 text-sm text-gray-600">
          Start the conversation and be the first person to reply to this post.
        </p>
      </div>
    ),
    []
  )

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between rounded-[28px] border border-green-100 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Post Discussion</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Replies</h1>
          </div>
          <Link
            href="/community"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-green-300 hover:text-green-700"
          >
            <IconArrowLeft size={16} />
            <span>Back to feed</span>
          </Link>
        </div>

        {loading ? (
          <div className="overflow-hidden rounded-[28px] border border-green-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Loading post...</p>
          </div>
        ) : error ? (
          <div className="overflow-hidden rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : !post ? (
          <div className="overflow-hidden rounded-[28px] border border-green-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">That post is unavailable.</p>
          </div>
        ) : (
          <>
            <CommunityPostCard
              post={post}
              now={now}
              profileId={profile?.id}
              canLike={Boolean(profile)}
              isLiking={likingPostIds.includes(post.id)}
              onLikeToggle={handleLikeToggle}
              hideReplyLink
              className="hover:border-green-200 hover:shadow-sm"
            />

            <section className="overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <Avatar
                  size="4"
                  radius="full"
                  src={getAvatarUrl(profile?.avatar_url)}
                  fallback={profile?.first_name?.[0] ?? 'U'}
                  color="green"
                  className="border border-green-200"
                />

                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={replyContent}
                    maxLength={COMMENT_CHAR_LIMIT}
                    placeholder="Write a reply..."
                    className="w-full rounded-full border border-green-200 bg-green-50/60 px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    onChange={(e) => setReplyContent(e.target.value)}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                    <span className={`text-xs ${remainingChars < 50 ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>
                      {remainingChars} left
                    </span>
                    {submitError && <p className="text-xs text-red-600">{submitError}</p>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReplySubmit}
                  disabled={!profile || !replyContent.trim() || isPending}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  <IconSend2 size={16} />
                  <span className="ml-2 hidden sm:inline">{isPending ? 'Replying...' : 'Reply'}</span>
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between rounded-[28px] border border-green-100 bg-white px-5 py-4 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Conversation</p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-900">
                    {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
                  </h2>
                </div>
              </div>

              {comments.length === 0 ? (
                emptyReplies
              ) : (
                comments.map((comment) => (
                  <article
                    key={comment.id}
                    className="overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm"
                  >
                    <div className="px-5 py-5 sm:px-6">
                      <div className="flex items-start gap-3">
                        <Avatar
                          size="4"
                          radius="full"
                          src={getAvatarUrl(comment.author?.avatar_url)}
                          fallback={(comment.author?.username?.[0] ?? 'U').toUpperCase()}
                          color="green"
                          className="border border-green-200"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-sm font-semibold text-gray-900">{comment.author?.username?.trim() || 'Community member'}</p>
                            <span className="text-xs text-gray-400">@{comment.author?.username?.trim() || 'member'}</span>
                            <span className="hidden text-xs text-gray-300 sm:inline">â€¢</span>
                            <span className="text-xs text-gray-500">{relativeTime(comment.created_at, now)}</span>
                            {comment.updated_at !== comment.created_at && <span className="text-xs text-gray-400">Edited</span>}
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}


