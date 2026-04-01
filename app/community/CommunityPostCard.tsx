'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar } from '@radix-ui/themes'
import { IconHeart, IconMessageCircle, IconPencil, IconTrash } from '@tabler/icons-react'
import {
  CommunityPost,
  displayName,
  getAvatarUrl,
  postTypeLabel,
  relativeTime,
} from './communityData'

type CommunityPostCardProps = {
  post: CommunityPost
  now: number
  profileId?: string | null
  canLike?: boolean
  isLiking?: boolean
  onLikeToggle?: (post: CommunityPost) => void | Promise<void>
  onEdit?: (post: CommunityPost) => void
  onDelete?: (postId: string) => void
  deletingId?: string | null
  detailHref?: string
  hideReplyLink?: boolean
  className?: string
}

export default function CommunityPostCard({
  post,
  now,
  profileId,
  canLike = false,
  isLiking = false,
  onLikeToggle,
  onEdit,
  onDelete,
  deletingId,
  detailHref,
  hideReplyLink = false,
  className = '',
}: CommunityPostCardProps) {
  const router = useRouter()
  const isOwner = post.user_id === profileId
  const postType = postTypeLabel(post.post_type)
  const profileHref = post.author?.username?.trim()
    ? `/profile/${encodeURIComponent(post.author.username.trim())}`
    : null

  const handleOpenPost = () => {
    if (!detailHref) return
    router.push(detailHref)
  }

  return (
    <article
      className={`overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm transition-all hover:border-green-300 hover:shadow-md ${
        detailHref ? 'cursor-pointer' : ''
      } ${className}`.trim()}
      onClick={handleOpenPost}
      onKeyDown={(event) => {
        if (!detailHref) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleOpenPost()
        }
      }}
      role={detailHref ? 'link' : undefined}
      tabIndex={detailHref ? 0 : undefined}
    >
      <div className="border-b border-green-100 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {profileHref ? (
              <Link href={profileHref} onClick={(event) => event.stopPropagation()} className="shrink-0">
                <Avatar
                  size="4"
                  radius="full"
                  src={getAvatarUrl(post.author?.avatar_url)}
                  fallback={(post.author?.username?.[0] ?? 'U').toUpperCase()}
                  color="green"
                  className="border border-green-200"
                />
              </Link>
            ) : (
              <Avatar
                size="4"
                radius="full"
                src={getAvatarUrl(post.author?.avatar_url)}
                fallback={(post.author?.username?.[0] ?? 'U').toUpperCase()}
                color="green"
                className="border border-green-200"
              />
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {profileHref ? (
                  <Link
                    href={profileHref}
                    onClick={(event) => event.stopPropagation()}
                    className="text-sm font-semibold text-gray-900 transition-colors hover:text-green-700"
                  >
                    {displayName(post.author)}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold text-gray-900">{displayName(post.author)}</p>
                )}

                {profileHref ? (
                  <Link
                    href={profileHref}
                    onClick={(event) => event.stopPropagation()}
                    className="text-xs text-gray-400 transition-colors hover:text-green-700"
                  >
                    @{post.author?.username?.trim() || 'member'}
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400">@{post.author?.username?.trim() || 'member'}</span>
                )}

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

          {isOwner && (onEdit || onDelete) && (
            <div className="flex shrink-0 items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit(post)
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 cursor-pointer"
                >
                  <IconPencil size={14} />
                  <span className="ml-1.5 hidden sm:inline">Edit</span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(post.id)
                  }}
                  disabled={deletingId === post.id}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition-all hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <IconTrash size={14} />
                  <span className="ml-1.5 hidden sm:inline">{deletingId === post.id ? 'Deleting...' : 'Delete'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{post.content}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-green-100 pt-4">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void onLikeToggle?.(post)
            }}
            disabled={!canLike || isLiking}
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

          {!hideReplyLink && detailHref && (
            <Link
              href={detailHref}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-green-300 hover:text-green-700"
            >
              <IconMessageCircle size={15} className="text-gray-500" />
              <span>Reply</span>
            </Link>
          )}

          <span className="text-xs font-medium text-gray-500">
            {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
          </span>
        </div>
      </div>
    </article>
  )
}
