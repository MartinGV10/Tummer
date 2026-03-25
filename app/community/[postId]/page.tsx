'use client'

import PostDetailClient from './PostDetailClient'

type CommunityPostDetailPageProps = {
  params: Promise<{
    postId: string
  }>
}

export default function CommunityPostDetailPage({ params }: CommunityPostDetailPageProps) {
  return <PostDetailClient params={params} />
}
