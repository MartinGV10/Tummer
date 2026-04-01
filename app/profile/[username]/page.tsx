'use client'

import PublicProfileClient from './PublicProfileClient'

type PublicProfilePageProps = {
  params: Promise<{
    username: string
  }>
}

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
  return <PublicProfileClient params={params} />
}
