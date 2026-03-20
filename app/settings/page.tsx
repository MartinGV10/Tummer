'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useProfile } from '@/src/context/ProfileContext'
import { Avatar, Callout } from '@radix-ui/themes'
import { IconInfoCircle, IconPhotoEdit, IconTrashX } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'
import { GENDER_OPTIONS, normalizeGenderValue } from '@/src/shared/profileGender'
const INPUT_CLASS =
  'w-full rounded-xl border border-green-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm transition-all outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100'

const Settings = () => {
  const { profile, loading, updateProfile } = useProfile()



  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (profile) {
      setFirstname(profile.first_name ?? '')
      setLastname(profile.last_name ?? '')
      setUsername(profile.username ?? '')
      setGender(normalizeGenderValue(profile.gender) ?? '')
    }
    
    const loadEmail = async () => {
      const {
        data: { user },
        } = await supabase.auth.getUser()
      
        if (user?.email) {
          setEmail(user.email)
        }
    }

    loadEmail()

  }, [profile])

  useEffect(() => {
    if (!message) return

    const timer = setTimeout(() => {
      setMessage(null)
    }, 3000);

    return () => clearTimeout(timer)
  }, [message])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setMessage(null)

    try {
      await updateProfile({
        first_name: firstname,
        last_name: lastname,
        username: username,
        gender: normalizeGenderValue(gender),
      })

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.email !== email) {
        const { error: emailError } = await supabase.auth.updateUser({ email })
        if (emailError) throw emailError

        setMessage('Check your email to confirm the new address')
      } else {
        setMessage('Profile updated!')
      }


      setMessage('Profile updated!')
    } catch (err) {
      console.error(err)
      setMessage('Something went wrong updating your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (!profile && loading) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-10 md:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-green-100 bg-white/80 p-8 shadow-sm">
          <p className="text-sm text-gray-500">Loading your settings...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file || !profile) return

  try {
    setUploading(true)
    setMessage(null)

    const ext = file.name.split('.').pop()
    const fileName = `${profile.id}-${Date.now()}.${ext}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error', uploadError)
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

    await updateProfile({ avatar_url: publicUrl })

    setMessage('Profile picture updated!')
  } catch (err) {
    console.error(err)
    setMessage('Error uploading profile picture.')
  } finally {
    setUploading(false)
    e.target.value = ''
  }
}

const deleteAvatar = async () => {
  if (!profile?.avatar_url) return

  try {
    setUploading(true)

    const url = profile.avatar_url
    const path = url.split('/object/public/avatars/')[1]

    await supabase.storage.from('avatars').remove([path])
    await updateProfile({ avatar_url: null })
    setMessage('Successfully deleted avatar')
  } catch (err) {
    console.error(err)
    setMessage('Error deleting avatar')
  } finally {
    setUploading(false)
  }
}


  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-green-100 bg-linear-to-r from-green-50 via-white to-emerald-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Account</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-medium tracking-tight text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-600">Manage your profile details, avatar, and account preferences.</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-900">{email || profile.username}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="rounded-3xl border border-green-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <Avatar
                  size="9"
                  radius="full"
                  src={profile.avatar_url ?? undefined}
                  fallback={profile.first_name[0]}
                  color="green"
                  className="border-2 border-green-600 shadow-md"
                />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">@{profile.username}</p>
                <p className="mt-3 max-w-xs text-sm text-gray-600">
                  Keep your account details up to date so the rest of the app can personalize your experience.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/60 p-4">
                <p className="text-sm font-medium text-gray-900">Profile Photo</p>
                <p className="mt-1 text-xs text-gray-600">Upload a new avatar or remove your current one.</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleAvatarChange} />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-green-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-green-400 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <IconPhotoEdit size={18} />
                    <span className="ml-2">{uploading ? 'Uploading...' : 'Change'}</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition-all hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={deleteAvatar}
                    disabled={uploading}
                  >
                    <IconTrashX size={18} />
                    <span className="ml-2">Remove</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-8">
            <div className="rounded-3xl border border-green-200 bg-white p-6 shadow-sm md:p-7">
              <div className="flex flex-col gap-2 border-b border-green-100 pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Profile Details</h2>
                  <p className="text-sm text-gray-600">Update the information tied to your account.</p>
                </div>
                <div className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">
                  Changes to your email may require confirmation.
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-800">First Name</label>
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-800">Last Name</label>
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-800">Username</label>
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-800">Gender</label>
                    <select
                      className={INPUT_CLASS}
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-gray-800">Email</label>
                    <input
                      type="email"
                      className={INPUT_CLASS}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {message && (
                  <Callout.Root color={message.includes('wrong') || message.includes('Error') ? 'red' : 'green'}>
                    <Callout.Icon>
                      <IconInfoCircle />
                    </Callout.Icon>
                    <Callout.Text>{message}</Callout.Text>
                  </Callout.Root>
                )}

                <div className="flex flex-col gap-3 border-t border-green-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    Your profile changes help personalize tracking, trends, and recommendations across the app.
                  </p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Settings
