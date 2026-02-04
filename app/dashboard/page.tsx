'use client'
import { useEffect, useState } from "react"
import { useProfile } from "@/src/context/ProfileContext"
import { IconHeart, IconMoodEmpty, IconMoodHappy, IconMoodSad, IconMoodSadDizzy, IconMoodSick, IconMoodSmile, IconPoo, IconSoup } from '@tabler/icons-react'
import Link from "next/link"
import { Avatar } from "@radix-ui/themes"

type MoodKey = 'happy' | 'smile' | 'neutral' | 'sad' | 'sick'

export default function DashboardPage() {
  const profile = useProfile()

  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const storageKey = `tummer-mood-${profile.username}`

  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(storageKey)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved) as { date: string; mood: MoodKey }
      const today = new Date().toISOString().slice(0, 10)

      if (parsed.date === today) {
        setSelectedMood(parsed.mood)
        setIsLocked(true)
      } else {
        localStorage.removeItem(storageKey)
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  const handleMoodClick = (mood: MoodKey) => {
    if (isLocked) return

    const today = new Date().toISOString().slice(0, 10)
    const payload = { date: today, mood }

    localStorage.setItem(storageKey, JSON.stringify(payload))
    setSelectedMood(mood)
    setIsLocked(true)
  }

  const baseIconClasses =
    "cursor-pointer rounded-2xl transition-all"

  const getMoodClasses = (mood: MoodKey) => {
    const isSelected = selectedMood === mood
    const lockedAndNotSelected = isLocked && !isSelected

    return [
      baseIconClasses,
      !isLocked && "hover:bg-green-200",
      isSelected && "bg-green-200 ring-2 ring-green-600",
      lockedAndNotSelected && "opacity-40 cursor-not-allowed"
    ]
      .filter(Boolean)
      .join(" ")
  }

  return (
    <div className="p-6 flex items-center justify-around flex-col space-y-5 mt-10">
      <h1 className="text-3xl w-5/6 font-medium items-center flex gap-3">
        Welcome {profile.first_name}!
        <Avatar
          size="4"
          radius="full"
          src={profile.avatar_url ?? undefined}
          fallback={profile.first_name[0]}
          color="green"
        />
      </h1>

      <div className="w-5/6 flex items-center justify-around gap-5 p-5 box-content bg-green-100 rounded-2xl shadow-md">

        {/* Today at a glance */}
        <div className="w-3/4 p-5 rounded-xl shadow-lg bg-white border-green-500 border-2 space-y-5">
          <h1 className="text-2xl font-medium">Today at a glance</h1>
          <div className="flex justify-around mb-10">
            <div className="space-y-2 flex flex-col items-center bg-green-100 p-5 rounded-xl border-2 border-green-600 font-medium shadow-lg w-1/4">
              <p className="text-center">Meals Logged</p>
              <p className="text-xl p-7 w-10 h-10 flex items-center justify-center bg-white rounded-4xl border-2 border-green-500">1/3</p>
            </div>

            <div className="space-y-2 flex flex-col items-center bg-green-100 p-5 rounded-xl border-2 border-green-600 font-medium shadow-lg w-1/4">
              <p className="text-center">Bowels Logged</p>
              <p className="text-xl p-7 w-10 h-10 flex items-center justify-center bg-white rounded-4xl border-2 border-green-500">1</p>
            </div>

            <div className="space-y-2 flex flex-col items-center bg-green-100 p-5 rounded-xl border-2 border-green-600 font-medium shadow-lg w-1/4">
              <p className="text-center">Days without pain</p>
              <p className="text-xl p-7 w-10 h-10 flex items-center justify-center bg-white rounded-4xl border-2 border-green-500">45</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-around space-y-3">
            <h1 className="text-xl font-medium">Mood Check</h1>
            <div className="flex gap-2">
              <p className="font-medium">
                {isLocked
                  ? "Mood saved for today"
                  : "How are you feeling?"}
              </p> 
              {isLocked && <IconHeart color="green"></IconHeart>}
            </div>
            <div className="flex gap-5">
              <IconMoodHappy size={50} color="green" className={getMoodClasses('happy')} onClick={() => handleMoodClick('happy')} />
              <IconMoodSmile size={50} color="green" className={getMoodClasses('smile')} onClick={() => handleMoodClick('smile')} />
              <IconMoodEmpty size={50}  color="green"  className={getMoodClasses('neutral')}  onClick={() => handleMoodClick('neutral')} />
              <IconMoodSad size={50} color="green" className={getMoodClasses('sad')} onClick={() => handleMoodClick('sad')} />
              <IconMoodSick size={50} color="green" className={getMoodClasses('sick')} onClick={() => handleMoodClick('sick')} />
            </div>
          </div>

        </div>

        {/* What to do next */}
        <div className="w-1/6 p-5 rounded-xl shadow-lg bg-white flex flex-col space-y-5 border-2 border-green-500">
          <h1 className="font-medium text-xl">What to do next?</h1>

          <div className="hover:bg-green-300 p-2 rounded-lg cursor-pointer font-medium transition-all">
            <Link href='/trackMeals' className="flex items-center justify-between">
              <p>Log a meal</p>
              <IconSoup size={30} />
            </Link>
          </div>

          <div className="hover:bg-green-300 p-2 rounded-lg cursor-pointer font-medium transition-all">
            <Link href='/trackBowels' className="flex items-center justify-between">
              <p>Log a bowel</p>
              <IconPoo size={30} />
            </Link>
          </div>

          <div className="hover:bg-green-300 p-2 rounded-lg cursor-pointer font-medium transition-all">
            <Link href='/log' className="flex items-center justify-between">
              <p>View triggers</p>
              <IconMoodSadDizzy size={30} />
            </Link>
          </div>

        </div>

      </div>
    </div>
  )
}
