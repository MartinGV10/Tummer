'use client'

import React from 'react'
import { Avatar } from '@radix-ui/themes'
import { IconSend2 } from '@tabler/icons-react'
import {
  COMMENT_CHAR_LIMIT,
  CommunityComment,
  getAvatarUrl,
  relativeTime,
} from '../communityData'

type CommentThreadProps = {
  comment: CommunityComment
  depth?: number
  now: number
  profileLoaded: boolean
  childCommentsByParent: Record<string, CommunityComment[]>
  expandedCommentIds: Record<string, boolean>
  activeCommentReplyId: string | null
  commentReplyContent: string
  commentReplyError: string | null
  commentReplyRemainingChars: number
  isReplyingToComment: boolean
  onToggleReply: (commentId: string) => void
  onToggleExpand: (commentId: string) => void
  onCommentReplyContentChange: (value: string) => void
  onCancelCommentReply: () => void
  onSubmitCommentReply: (commentId: string) => void
  renderChildThread: (comment: CommunityComment, depth: number) => React.ReactNode
}

export default function CommentThread({
  comment,
  depth = 0,
  now,
  profileLoaded,
  childCommentsByParent,
  expandedCommentIds,
  activeCommentReplyId,
  commentReplyContent,
  commentReplyError,
  commentReplyRemainingChars,
  isReplyingToComment,
  onToggleReply,
  onToggleExpand,
  onCommentReplyContentChange,
  onCancelCommentReply,
  onSubmitCommentReply,
  renderChildThread,
}: CommentThreadProps) {
  const childComments = childCommentsByParent[comment.id] ?? []
  const hasChildren = childComments.length > 0
  const isExpanded = expandedCommentIds[comment.id] ?? false
  const isReplyingHere = activeCommentReplyId === comment.id

  return (
    <div key={comment.id} className={depth > 0 ? 'mt-4 border-l border-green-100 pl-4 sm:pl-5' : ''}>
      <div className={depth === 0 ? 'overflow-hidden rounded-[28px] border border-green-200 bg-white shadow-sm' : ''}>
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
                <span className="hidden text-xs text-gray-300 sm:inline">•</span>
                <span className="text-xs text-gray-500">{relativeTime(comment.created_at, now)}</span>
                {comment.updated_at !== comment.created_at && <span className="text-xs text-gray-400">Edited</span>}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{comment.content}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onToggleReply(comment.id)}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-all hover:border-green-300 hover:text-green-700 cursor-pointer"
                >
                  Reply
                </button>

                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => onToggleExpand(comment.id)}
                    className="inline-flex items-center rounded-full border border-green-100 bg-green-50 px-3 py-2 text-xs font-medium text-green-800 transition-all hover:border-green-300 hover:bg-green-100 cursor-pointer"
                  >
                    {isExpanded
                      ? `Hide replies (${childComments.length})`
                      : `View ${childComments.length} ${childComments.length === 1 ? 'reply' : 'replies'}`}
                  </button>
                )}
              </div>

              {isReplyingHere && (
                <div className="mt-4 rounded-[24px] border border-green-100 bg-green-50/50 p-4">
                  <textarea
                    value={commentReplyContent}
                    maxLength={COMMENT_CHAR_LIMIT}
                    rows={3}
                    placeholder={`Reply to @${comment.author?.username?.trim() || 'member'}...`}
                    className="w-full resize-none rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    onChange={(e) => onCommentReplyContentChange(e.target.value)}
                  />

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs">
                      <span className={commentReplyRemainingChars < 50 ? 'font-semibold text-amber-700' : 'text-gray-500'}>
                        {commentReplyRemainingChars} left
                      </span>
                      {commentReplyError && <p className="mt-1 text-red-600">{commentReplyError}</p>}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={onCancelCommentReply}
                        className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-green-400 hover:text-green-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => onSubmitCommentReply(comment.id)}
                        disabled={!profileLoaded || !commentReplyContent.trim() || isReplyingToComment}
                        className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        <IconSend2 size={15} />
                        <span className="ml-2">{isReplyingToComment ? 'Replying...' : 'Post Reply'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {hasChildren && isExpanded && (
                <div className="mt-4">
                  {childComments.map((childComment) => renderChildThread(childComment, depth + 1))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
