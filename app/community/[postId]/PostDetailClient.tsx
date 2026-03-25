'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { Avatar } from '@radix-ui/themes'
import { IconArrowLeft, IconChevronDown, IconMessageCircle, IconSend2, IconX } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'
import { useProfile } from '@/src/context/ProfileContext'
import CommentThread from './CommentThread'
import CommunityPostCard from '../CommunityPostCard'
import {
  applyCommentCountsToPosts,
  applyLikesToPosts,
  COMMENT_CHAR_LIMIT,
  Condition,
  COMMUNITY_POST_SELECT,
  CommunityComment,
  CommunityPost,
  CommunityPostCommentRow,
  CommunityPostLikeRow,
  CommunityPostRow,
  fetchCommunityComments,
  fetchConditions,
  fetchLikesForPosts,
  fetchProfilesByIds,
  formatPostDebugDetails,
  getAvatarUrl,
  getFriendlyCommentError,
  getFriendlyPostError,
  insertCommunityComment,
  mergeComments,
  mergePosts,
  normalizeCommunityComment,
  normalizeCommunityPost,
  POST_CHAR_LIMIT,
  POST_TYPE_OPTIONS,
  updateCommunityPost,
} from '../communityData'

type PostDetailClientProps = {
  params: Promise<{
    postId: string
  }>
}

function sortComments(comments: CommunityComment[]): CommunityComment[] {
  return [...comments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export default function PostDetailClient({ params }: PostDetailClientProps) {
  const router = useRouter()
  const { profile } = useProfile()
  const [postId, setPostId] = useState('')
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [conditionMap, setConditionMap] = useState<Record<string, string>>({})
  const [editContent, setEditContent] = useState('')
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null)
  const [selectedPostType, setSelectedPostType] = useState('')
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [postSubmitError, setPostSubmitError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingPost, setDeletingPost] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [commentReplyContent, setCommentReplyContent] = useState('')
  const [activeCommentReplyId, setActiveCommentReplyId] = useState<string | null>(null)
  const [commentReplyError, setCommentReplyError] = useState<string | null>(null)
  const [expandedCommentIds, setExpandedCommentIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [likingPostIds, setLikingPostIds] = useState<string[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [isPending, startTransition] = useTransition()
  const [isSavingPost, startPostTransition] = useTransition()
  const [isReplyingToComment, startCommentReplyTransition] = useTransition()

  useEffect(() => {
    let active = true
    void params.then((resolved) => {
      if (active) setPostId(resolved.postId)
    })
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

      const [postRes, commentsRes, fetchedConditionMap] = await Promise.all([
        supabase.from('community_posts').select(COMMUNITY_POST_SELECT).eq('id', postId).maybeSingle(),
        fetchCommunityComments(postId),
        fetchConditions(),
      ])

      if (!active) return

      if (postRes.error) {
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
        setError(`Could not load replies right now.${formatPostDebugDetails(commentsRes.error)}`)
        setPost(null)
        setComments([])
        setLoading(false)
        return
      }

      const postRow = normalizeCommunityPost(postRes.data as Partial<CommunityPostRow>)
      const commentRows = ((commentsRes.data ?? []) as Array<Partial<CommunityPostCommentRow>>).map(normalizeCommunityComment)
      const userIds = [...new Set([postRow.user_id, ...commentRows.map((comment) => comment.user_id)].filter(Boolean))]
      const [profileMap, likes] = await Promise.all([
        fetchProfilesByIds(userIds),
        fetchLikesForPosts([postId], profile?.id),
      ])

      if (!active) return

      const mergedPost = mergePosts([postRow], profileMap, fetchedConditionMap)[0]
      const postWithCounts = applyCommentCountsToPosts(
        applyLikesToPosts([mergedPost], likes.counts, likes.viewerLikedPostIds),
        { [postId]: commentRows.length }
      )[0]

      setConditions(Object.entries(fetchedConditionMap).map(([id, name]) => ({ id, name })))
      setConditionMap(fetchedConditionMap)
      setPost(postWithCounts)
      setComments(sortComments(mergeComments(commentRows, profileMap)))
      setEditContent(postWithCounts.content)
      setSelectedConditionId(postWithCounts.tag ?? null)
      setSelectedPostType(postWithCounts.post_type ?? '')
      setPostSubmitError(null)
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts', filter: `id=eq.${postId}` }, async (payload) => {
        const updatedPost = normalizeCommunityPost(payload.new as Partial<CommunityPostRow>)
        const profileMap = await fetchProfilesByIds([updatedPost.user_id])
        setPost((prev) => prev ? { ...prev, ...mergePosts([updatedPost], profileMap, conditionMap)[0] } : prev)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_posts', filter: `id=eq.${postId}` }, () => {
        setPost(null)
        setError('That post is no longer available.')
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_post_likes', filter: `post_id=eq.${postId}` }, (payload) => {
        const like = payload.new as CommunityPostLikeRow
        setPost((prev) => prev ? {
          ...prev,
          likeCount: prev.likeCount + (like.user_id === profile?.id && prev.viewerHasLiked ? 0 : 1),
          viewerHasLiked: like.user_id === profile?.id ? true : prev.viewerHasLiked,
        } : prev)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_post_likes', filter: `post_id=eq.${postId}` }, (payload) => {
        const like = payload.old as CommunityPostLikeRow
        setPost((prev) => prev ? {
          ...prev,
          likeCount: Math.max(0, prev.likeCount - (like.user_id === profile?.id && !prev.viewerHasLiked ? 0 : 1)),
          viewerHasLiked: like.user_id === profile?.id ? false : prev.viewerHasLiked,
        } : prev)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_post_comments', filter: `post_id=eq.${postId}` }, async (payload) => {
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
          if (mergedComment.parent_id) setExpandedCommentIds((prev) => ({ ...prev, [mergedComment.parent_id as string]: true }))
          setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_post_comments', filter: `post_id=eq.${postId}` }, (payload) => {
        const updatedComment = normalizeCommunityComment(payload.new as Partial<CommunityPostCommentRow>)
        setComments((prev) => prev.map((comment) => comment.id === updatedComment.id ? { ...comment, ...updatedComment } : comment))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_post_comments', filter: `post_id=eq.${postId}` }, (payload) => {
        const deletedComment = payload.old as CommunityPostCommentRow
        let removed = false
        setComments((prev) => {
          const next = prev.filter((comment) => comment.id !== deletedComment.id)
          removed = next.length !== prev.length
          return next
        })
        if (removed) setPost((prev) => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conditionMap, postId, profile?.id])

  const isOwner = post?.user_id === profile?.id
  const remainingChars = COMMENT_CHAR_LIMIT - replyContent.length
  const commentReplyRemainingChars = COMMENT_CHAR_LIMIT - commentReplyContent.length
  const postRemainingChars = POST_CHAR_LIMIT - editContent.length
  const canSavePost = Boolean(profile && post && isOwner && editContent.trim() && selectedPostType.trim() && editContent.length <= POST_CHAR_LIMIT)
  const childCommentsByParent = useMemo(() => comments.reduce<Record<string, CommunityComment[]>>((acc, comment) => {
    if (!comment.parent_id) return acc
    acc[comment.parent_id] = [...(acc[comment.parent_id] ?? []), comment]
    return acc
  }, {}), [comments])
  const rootComments = useMemo(() => comments.filter((comment) => !comment.parent_id), [comments])
  const emptyReplies = useMemo(() => (
    <div className="rounded-[28px] border border-dashed border-green-300 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
        <IconMessageCircle size={24} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">No replies yet</h2>
      <p className="mt-2 text-sm text-gray-600">Start the conversation and be the first person to reply to this post.</p>
    </div>
  ), [])

  const resetPostEditor = () => {
    if (!post) return
    setEditContent(post.content)
    setSelectedConditionId(post.tag ?? null)
    setSelectedPostType(post.post_type ?? '')
    setPostSubmitError(null)
    setIsEditingPost(false)
  }

  const handleToggleReply = (commentId: string) => {
    setActiveCommentReplyId((prev) => prev === commentId ? null : commentId)
    setCommentReplyContent('')
    setCommentReplyError(null)
  }

  const handleLikeToggle = async (targetPost: CommunityPost) => {
    if (!profile) return
    const wasLiked = targetPost.viewerHasLiked
    setLikingPostIds((prev) => (prev.includes(targetPost.id) ? prev : [...prev, targetPost.id]))
    setPost((prev) => prev ? { ...prev, viewerHasLiked: !wasLiked, likeCount: Math.max(0, prev.likeCount + (wasLiked ? -1 : 1)) } : prev)
    const query = wasLiked
      ? supabase.from('community_post_likes').delete().eq('post_id', targetPost.id).eq('user_id', profile.id)
      : supabase.from('community_post_likes').insert({ post_id: targetPost.id, user_id: profile.id })
    const { error: likeError } = await query
    if (likeError) setError(wasLiked ? 'Could not remove your like right now.' : 'Could not like that post right now.')
    setLikingPostIds((prev) => prev.filter((value) => value !== targetPost.id))
  }

  const handlePostSave = () => {
    if (!profile || !post || post.user_id !== profile.id) return
    if (!editContent.trim()) return setPostSubmitError('Write something before saving.')
    if (!selectedPostType.trim()) return setPostSubmitError('Choose what kind of post this is.')
    if (editContent.length > POST_CHAR_LIMIT) return setPostSubmitError(`Posts must be ${POST_CHAR_LIMIT} characters or less.`)
    setPostSubmitError(null)
    startPostTransition(async () => {
      const response = await updateCommunityPost(post.id, profile.id, { content: editContent.trim(), tag: selectedConditionId || null, post_type: selectedPostType || null })
      if (response.error) return setPostSubmitError(`${getFriendlyPostError(response.error, true)}${formatPostDebugDetails(response.error)}`)
      const savedPost = normalizeCommunityPost(response.data as Partial<CommunityPostRow>)
      setPost((prev) => prev ? { ...prev, ...savedPost, conditionName: savedPost.tag ? conditionMap[String(savedPost.tag)] ?? savedPost.tag : null } : prev)
      setIsEditingPost(false)
    })
  }

  const handleDeletePost = async () => {
    if (!profile || !post || post.user_id !== profile.id) return
    setDeletingPost(true)
    const { error: deleteError } = await supabase.from('community_posts').delete().eq('id', post.id).eq('user_id', profile.id)
    if (deleteError) {
      setError('Could not delete that post.')
      setDeletingPost(false)
      setDeleteConfirmOpen(false)
      return
    }
    router.push('/community')
  }

  const insertReply = (content: string, parentId?: string | null, onError?: (message: string) => void, onDone?: () => void) => {
    if (!profile || !post) return
    const action = async () => {
      const response = await insertCommunityComment(post.id, profile.id, content.trim(), parentId)
      if (response.error) return onError?.(`${getFriendlyCommentError(response.error)}${formatPostDebugDetails(response.error)}`)
      const savedComment = normalizeCommunityComment(response.data as Partial<CommunityPostCommentRow>)
      const mergedComment: CommunityComment = { ...savedComment, author: { id: profile.id, username: profile.username ?? null, avatar_url: profile.avatar_url ?? null } }
      setComments((prev) => prev.some((comment) => comment.id === mergedComment.id) ? prev : sortComments([...prev, mergedComment]))
      if (parentId) setExpandedCommentIds((prev) => ({ ...prev, [parentId]: true }))
      setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev)
      onDone?.()
    }
    return action()
  }

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return setSubmitError('Write something before replying.')
    if (replyContent.length > COMMENT_CHAR_LIMIT) return setSubmitError(`Replies must be ${COMMENT_CHAR_LIMIT} characters or less.`)
    setSubmitError(null)
    startTransition(async () => {
      await insertReply(replyContent, null, setSubmitError, () => setReplyContent(''))
    })
  }

  const handleCommentReplySubmit = (parentCommentId: string) => {
    if (!commentReplyContent.trim()) return setCommentReplyError('Write something before replying.')
    if (commentReplyContent.length > COMMENT_CHAR_LIMIT) return setCommentReplyError(`Replies must be ${COMMENT_CHAR_LIMIT} characters or less.`)
    setCommentReplyError(null)
    startCommentReplyTransition(async () => {
      await insertReply(commentReplyContent, parentCommentId, setCommentReplyError, () => {
        setCommentReplyContent('')
        setActiveCommentReplyId(null)
      })
    })
  }

  const renderChildThread = (comment: CommunityComment, depth: number) => (
    <CommentThread
      key={comment.id}
      comment={comment}
      depth={depth}
      now={now}
      profileLoaded={Boolean(profile)}
      childCommentsByParent={childCommentsByParent}
      expandedCommentIds={expandedCommentIds}
      activeCommentReplyId={activeCommentReplyId}
      commentReplyContent={commentReplyContent}
      commentReplyError={commentReplyError}
      commentReplyRemainingChars={commentReplyRemainingChars}
      isReplyingToComment={isReplyingToComment}
      onToggleReply={handleToggleReply}
      onToggleExpand={(commentId) => setExpandedCommentIds((prev) => ({ ...prev, [commentId]: !(prev[commentId] ?? false) }))}
      onCommentReplyContentChange={setCommentReplyContent}
      onCancelCommentReply={() => {
        setActiveCommentReplyId(null)
        setCommentReplyContent('')
        setCommentReplyError(null)
      }}
      onSubmitCommentReply={handleCommentReplySubmit}
      renderChildThread={renderChildThread}
    />
  )

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {deleteConfirmOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 backdrop-blur-sm"><div className="w-full max-w-md overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-xl"><div className="border-b border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Confirm Delete</p><h2 className="mt-1 text-lg font-semibold text-gray-900">Delete this post?</h2></div><div className="space-y-4 px-5 py-5"><p className="text-sm leading-6 text-gray-600">This will permanently remove the post and send you back to the community feed.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDeleteConfirmOpen(false)} disabled={deletingPost} className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">Cancel</button><button type="button" onClick={() => void handleDeletePost()} disabled={deletingPost} className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-all hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">{deletingPost ? 'Deleting...' : 'Delete Post'}</button></div></div></div></div>}

        <div className="flex items-center justify-between rounded-[28px] border border-green-100 bg-white px-5 py-4 shadow-sm"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Post Discussion</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Replies</h1></div><Link href="/community" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-green-300 hover:text-green-700"><IconArrowLeft size={16} /><span>Back to feed</span></Link></div>

        {loading ? <div className="overflow-hidden rounded-[28px] border border-green-200 bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">Loading post...</p></div> : error ? <div className="overflow-hidden rounded-[28px] border border-red-200 bg-white p-6 shadow-sm"><p className="text-sm text-red-600">{error}</p></div> : !post ? <div className="overflow-hidden rounded-[28px] border border-green-200 bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">That post is unavailable.</p></div> : <>
          <CommunityPostCard post={post} now={now} profileId={profile?.id} canLike={Boolean(profile)} isLiking={likingPostIds.includes(post.id)} onLikeToggle={handleLikeToggle} onEdit={isOwner ? (targetPost) => { setEditContent(targetPost.content); setSelectedConditionId(targetPost.tag ?? null); setSelectedPostType(targetPost.post_type ?? ''); setPostSubmitError(null); setIsEditingPost(true); window.scrollTo({ top: 0, behavior: 'smooth' }) } : undefined} onDelete={isOwner ? () => setDeleteConfirmOpen(true) : undefined} deletingId={deletingPost ? post.id : null} hideReplyLink className="hover:border-green-200 hover:shadow-sm" />

          {isOwner && isEditingPost && <section className="overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm"><div className="border-b border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Edit Post</p><h2 className="mt-1 text-lg font-semibold text-gray-900">Update your post</h2></div><div className="space-y-4 p-5"><div className="space-y-1.5"><label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Post Type</label><div className="relative"><select className="w-full appearance-none rounded-2xl border border-green-200 bg-white px-3 py-3 pr-10 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100 cursor-pointer" value={selectedPostType} onChange={(e) => setSelectedPostType(e.target.value)}><option value="">Choose a post type</option>{POST_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><IconChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" /></div></div><div className="space-y-1.5"><label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Condition Tag</label><div className="relative"><select className="w-full appearance-none rounded-2xl border border-green-200 bg-white px-3 py-3 pr-10 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100 cursor-pointer" value={selectedConditionId ?? ''} onChange={(e) => setSelectedConditionId(e.target.value || null)}><option value="">No condition tag</option>{conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.name}</option>)}</select><IconChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" /></div></div><div className="space-y-1.5"><label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Message</label><textarea value={editContent} maxLength={POST_CHAR_LIMIT} rows={6} placeholder="What's been going on with your condition lately?" className="w-full resize-none rounded-3xl border border-green-200 bg-green-50/60 px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100" onChange={(e) => setEditContent(e.target.value)} /></div><div className="rounded-2xl border border-green-100 bg-green-50/70 px-3 py-2.5 text-xs text-gray-600"><span className={postRemainingChars < 50 ? 'font-semibold text-amber-700' : 'font-medium text-green-800'}>{postRemainingChars} characters remaining</span>{postSubmitError && <p className="mt-1.5 text-red-600">{postSubmitError}</p>}</div><div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={resetPostEditor} className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 cursor-pointer"><IconX size={16} /><span className="ml-2">Cancel Edit</span></button><button type="button" onClick={handlePostSave} disabled={!canSavePost || isSavingPost} className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"><IconSend2 size={16} /><span className="ml-2">{isSavingPost ? 'Saving...' : 'Save Post'}</span></button></div></div></section>}

          <section className="overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm"><div className="flex items-center gap-3 px-4 py-4 sm:px-5"><Avatar size="4" radius="full" src={getAvatarUrl(profile?.avatar_url)} fallback={profile?.first_name?.[0] ?? 'U'} color="green" className="border border-green-200" /><div className="min-w-0 flex-1"><input type="text" value={replyContent} maxLength={COMMENT_CHAR_LIMIT} placeholder="Write a reply..." className="w-full rounded-full border border-green-200 bg-green-50/60 px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100" onChange={(e) => setReplyContent(e.target.value)} /><div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1"><span className={`text-xs ${remainingChars < 50 ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>{remainingChars} left</span>{submitError && <p className="text-xs text-red-600">{submitError}</p>}</div></div><button type="button" onClick={handleReplySubmit} disabled={!profile || !replyContent.trim() || isPending} className="inline-flex shrink-0 items-center justify-center rounded-full bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"><IconSend2 size={16} /><span className="ml-2 hidden sm:inline">{isPending ? 'Replying...' : 'Reply'}</span></button></div></section>

          <section className="space-y-4"><div className="flex items-center justify-between rounded-[28px] border border-green-100 bg-white px-5 py-4 shadow-sm"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Conversation</p><h2 className="mt-1 text-lg font-semibold text-gray-900">{post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}</h2></div></div>{comments.length === 0 ? emptyReplies : rootComments.map((comment) => renderChildThread(comment, 0))}</section>
        </>}
      </div>
    </div>
  )
}
