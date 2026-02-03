'use client'
import { useProfile } from "@/src/context/ProfileContext"

export default function DashboardPage() {
  const profile = useProfile()

  return (
    <div className="p-6">
      <h1 className="text-2xl ">Welcome {profile.first_name}!</h1>
    </div>
  )
}
