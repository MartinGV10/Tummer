'use client'
import { useProfile } from "@/src/context/ProfileContext"
import { IconMoodSadDizzy, IconPoo, IconSoup } from '@tabler/icons-react'
import Link from "next/link"
import { Avatar } from "@radix-ui/themes"

export default function DashboardPage() {
  const { profile } = useProfile()

  if (!profile) {
    return null
  }

  return (
    <div className="p-6 mt-5 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-4">
        <h1 className="text-3xl font-medium flex items-center gap-3">
          Welcome {profile.first_name}!
          <Avatar
            size="5"
            radius="full"
            src={profile.avatar_url ?? undefined}
            fallback={profile.first_name[0]}
            color="green"
            className="border-2 border-green-600"
          />
        </h1>
      </div>

      {/* Main content */}
      <div className="w-full max-w-6xl flex gap-5 bg-green-100 p-5 rounded-2xl shadow-md">

        {/* Today at a glance */}
        <div className="flex-[3] p-5 rounded-xl shadow-lg bg-white border-2 border-green-500 space-y-5">
          <h2 className="text-2xl font-semibold">Today at a glance</h2>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {/* Meals */}
            <div className="flex flex-col items-center justify-between bg-green-50 p-4 rounded-xl border border-green-400 shadow-sm">
              <p className="text-sm font-medium text-gray-700 text-center">
                Meals Logged
              </p>
              <div className="mt-3 flex items-center justify-center h-16 w-16 rounded-full border-2 border-green-500 bg-white">
                <span className="text-xl font-semibold text-gray-900">
                  1/3
                </span>
              </div>
            </div>

            {/* Bowels */}
            <div className="flex flex-col items-center justify-between bg-green-50 p-4 rounded-xl border border-green-400 shadow-sm">
              <p className="text-sm font-medium text-gray-700 text-center">
                Bowels Logged
              </p>
              <div className="mt-3 flex items-center justify-center h-16 w-16 rounded-full border-2 border-green-500 bg-white">
                <span className="text-xl font-semibold text-gray-900">
                  1
                </span>
              </div>
            </div>

            {/* Days without pain */}
            <div className="flex flex-col items-center justify-between bg-green-50 p-4 rounded-xl border border-green-400 shadow-sm">
              <p className="text-sm font-medium text-gray-700 text-center">
                Days without pain
              </p>
              <div className="mt-3 flex items-center justify-center h-16 w-16 rounded-full border-2 border-green-500 bg-white">
                <span className="text-xl font-semibold text-gray-900">
                  45
                </span>
              </div>
            </div>
          </div>

          {/* Subtle summary row so it doesn't feel empty */}
          <div className="mt-4 border-t border-green-100 pt-4 flex items-center justify-between text-sm text-gray-600">
            <p>Last meal logged: <span className="font-medium">12:43 PM</span></p>
            <p>Last bowel logged: <span className="font-medium">9:10 AM</span></p>
            <p>Triggers today: <span className="font-medium">None</span></p>
          </div>
        </div>

        {/* What to do next */}
        <div className="flex-[1] p-5 rounded-xl shadow-lg bg-white flex flex-col space-y-4 border-2 border-green-500">
          <h2 className="font-semibold text-xl mb-1">What to do next?</h2>

          <button className="hover:bg-green-100 p-2 rounded-lg text-left font-medium transition-all">
            <Link href="/trackMeals" className="flex items-center justify-between">
              <span>Log a meal</span>
              <IconSoup size={26} />
            </Link>
          </button>

          <button className="hover:bg-green-100 p-2 rounded-lg text-left font-medium transition-all">
            <Link href="/trackBowels" className="flex items-center justify-between">
              <span>Log a bowel</span>
              <IconPoo size={26} />
            </Link>
          </button>

          <button className="hover:bg-green-100 p-2 rounded-lg text-left font-medium transition-all">
            <Link href="/log" className="flex items-center justify-between">
              <span>View triggers</span>
              <IconMoodSadDizzy size={26} />
            </Link>
          </button>
        </div>
      </div>
    </div>
  )
}
