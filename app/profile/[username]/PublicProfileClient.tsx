'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@radix-ui/themes'
import { IconArrowLeft, IconMessageCircle, IconNotes, IconUserCircle } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'
import { useProfile } from '@/src/context/ProfileContext'
import { resolveConditionRef } from '@/src/shared/conditionRefs'
import CommunityPostCard from '@/app/community/CommunityPostCard'
import {
  applyCommentCountsToPosts,
  applyLikesToPosts,
  COMMUNITY_POST_SELECT,
  CommunityPost,
  CommunityPostRow,
  displayName,
  fetchCommentCountsForPosts,
  fetchConditionNamesByIds,
  fetchLikesForPosts,
  fetchPublicProfileByUsername,
  getAvatarUrl,
  mergePosts,
  normalizeCommunityPost,
} from '@/app/community/communityData'
import UserNav from '@/app/components/UserNav'

type PublicProfileClientProps = {
  params: Promise<{
    username: string
  }>
}

export default function PublicProfileClient({ params }: PublicProfileClientProps) {
  const { profile: viewerProfile } = useProfile()
  const [username, setUsername] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileUsername, setProfileUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [conditionName, setConditionName] = useState<string | null>(null)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [profileId, setProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [likingPostIds, setLikingPostIds] = useState<string[]>([])

  useEffect(() => {
    let active = true
    void params.then((resolved) => {
      if (active) setUsername(resolved.username)
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
    if (!username) return

    let active = true

    const loadProfile = async () => {
      setLoading(true)
      setError(null)

      const publicProfile = await fetchPublicProfileByUsername(decodeURIComponent(username))

      if (!active) return

      if (!publicProfile) {
        setError('That profile could not be found.')
        setProfileId(null)
        setPosts([])
        setLoading(false)
        return
      }

      const fullName = [publicProfile.first_name, publicProfile.last_name]
        .map((value) => value?.trim() ?? '')
        .filter(Boolean)
        .join(' ')

      setProfileId(publicProfile.id)
      setProfileName(fullName || displayName(publicProfile))
      setProfileUsername(publicProfile.username?.trim() || 'member')
      setAvatarUrl(publicProfile.avatar_url ?? null)

      if (publicProfile.show_condition_on_profile && publicProfile.condition_id) {
        const resolvedCondition = await resolveConditionRef(supabase, publicProfile.condition_id)
        if (active) {
          setConditionName(resolvedCondition.conditionName ?? null)
        }
      } else {
        setConditionName(null)
      }

      const postsRes = await supabase
        .from('community_posts')
        .select(COMMUNITY_POST_SELECT)
        .eq('user_id', publicProfile.id)
        .order('created_at', { ascending: false })

      if (!active) return

      if (postsRes.error) {
        setError('Could not load this account right now.')
        setPosts([])
        setLoading(false)
        return
      }

      const rows = ((postsRes.data ?? []) as Array<Partial<CommunityPostRow>>).map((row) => normalizeCommunityPost(row))
      const authorMap = {
        [publicProfile.id]: {
          id: publicProfile.id,
          username: publicProfile.username ?? null,
          avatar_url: publicProfile.avatar_url ?? null,
        },
      }

      const [likes, commentCounts] = await Promise.all([
        fetchLikesForPosts(rows.map((post) => post.id), viewerProfile?.id),
        fetchCommentCountsForPosts(rows.map((post) => post.id)),
      ])

      if (!active) return

      const conditionMap = await fetchConditionNamesByIds(
        rows
          .map((post) => post.tag)
          .filter((tag): tag is string => Boolean(tag && tag.trim()))
      )

      if (!active) return

      const mergedPosts = mergePosts(rows, authorMap, conditionMap)
      const postsWithStats = applyCommentCountsToPosts(
        applyLikesToPosts(mergedPosts, likes.counts, likes.viewerLikedPostIds),
        commentCounts
      )

      setPosts(postsWithStats)
      setLoading(false)
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [username, viewerProfile?.id])

  const handleLikeToggle = async (post: CommunityPost) => {
    if (!viewerProfile) return

    const wasLiked = post.viewerHasLiked
    setLikingPostIds((prev) => (prev.includes(post.id) ? prev : [...prev, post.id]))
    setPosts((prev) => prev.map((item) => (
      item.id === post.id
        ? {
            ...item,
            viewerHasLiked: !wasLiked,
            likeCount: Math.max(0, item.likeCount + (wasLiked ? -1 : 1)),
          }
        : item
    )))

    const query = wasLiked
      ? supabase.from('community_post_likes').delete().eq('post_id', post.id).eq('user_id', viewerProfile.id)
      : supabase.from('community_post_likes').insert({ post_id: post.id, user_id: viewerProfile.id })

    const { error: likeError } = await query

    if (likeError) {
      setPosts((prev) => prev.map((item) => (
        item.id === post.id
          ? {
              ...item,
              viewerHasLiked: wasLiked,
              likeCount: Math.max(0, item.likeCount + (wasLiked ? 1 : -1)),
            }
          : item
      )))
    }

    setLikingPostIds((prev) => prev.filter((postId) => postId !== post.id))
  }

  const totalReplies = useMemo(
    () => posts.reduce((sum, post) => sum + post.commentCount, 0),
    [posts]
  )

  if (loading) {
    return (
      <>
        <UserNav />
        <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto max-w-5xl rounded-[28px] border border-green-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Loading profile...</p>
          </div>
        </div>
      </>
    )
  }

  if (error || !profileId) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <div className="rounded-[28px] border border-green-100 bg-white px-5 py-4 shadow-sm">
            <Link href="/community" className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-green-700">
              <IconArrowLeft size={16} />
              <span>Back to community</span>
            </Link>
          </div>
          <div className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">{error ?? 'That profile is unavailable.'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <UserNav/>
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="rounded-[28px] border border-green-100 bg-white px-5 py-4 shadow-sm">
          <Link href="/community" className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-green-700">
            <IconArrowLeft size={16} />
            <span>Back to community</span>
          </Link>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-green-200 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(187,247,208,0.8),_transparent_42%),linear-gradient(135deg,_#f0fdf4,_#ffffff_48%,_#ecfdf5)] px-6 py-8 md:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  size="8"
                  radius="full"
                  src={getAvatarUrl(avatarUrl)}
                  fallback={profileName[0] ?? 'U'}
                  color="green"
                  className="border-2 border-green-600 shadow-md"
                />
                <div>
                  {/* <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">Community Account</p> */}
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{profileName}</h1>
                  <p className="mt-1 text-sm text-gray-500">@{profileUsername}</p>
                  {conditionName && (
                    <span className="mt-3 inline-flex rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-green-800 shadow-sm">
                      {conditionName}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Posts</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{posts.length}</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Replies</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{totalReplies}</p>
                </div>
                {/* <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm col-span-2 sm:col-span-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Condition</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {conditionName ? conditionName : 'Condition private'}
                  </p>
                </div> */}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[28px] border border-green-100 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                {posts.length === 0 ? <IconUserCircle size={22} /> : <IconNotes size={22} />}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Post History</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">
                  {posts.length === 0 ? 'No posts yet' : `${profileName.split(' ')[0]}'s posts`}
                </h2>
                <p className="text-sm text-gray-600">
                  {posts.length === 0
                    ? 'This user has no posts yet.'
                    : 'Recent community activity.'}
                </p>
              </div>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-green-300 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                <IconMessageCircle size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Nothing posted yet</h3>
              <p className="mt-2 text-sm text-gray-600">Check back later to see updates, questions, and shared experiences.</p>
            </div>
          ) : (
            posts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                now={now}
                profileId={viewerProfile?.id}
                canLike={Boolean(viewerProfile)}
                isLiking={likingPostIds.includes(post.id)}
                onLikeToggle={handleLikeToggle}
                detailHref={`/community/${post.id}`}
              />
            ))
          )}
        </section>
      </div>
    </div>
    </>

  )
}
