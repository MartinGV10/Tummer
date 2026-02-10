'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useProfile } from '@/src/context/ProfileContext'
import { Avatar, Callout } from '@radix-ui/themes'
import { IconInfoCircle, IconPhotoEdit, IconTrashX } from '@tabler/icons-react'
import { supabase } from '@/lib/supabaseClient'

const Settings = () => {
  const { profile, loading, updateProfile } = useProfile()



  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (profile) {
      setFirstname(profile.first_name ?? '')
      setLastname(profile.last_name ?? '')
      setUsername(profile.username ?? '')
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
    return <div className="p-6">Loading...</div>
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
    <>
      <div className="p-10 flex justify-center flex-col items-center space-y-5">
        <div className="w-full max-w-6xl border-b-2 border-b-green-600 pb-2">
          <h1 className="text-2xl font-medium">Settings</h1>
          <p>Manage your account settings and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="flex flex-col w-full max-w-6xl pt-2">
          <div className="flex justify-between gap-10">
            {/* Left: Labels + Form */}
            <div className="flex flex-col flex-1">
              <h2 className="text-lg font-medium">Profile</h2>
              <p className="mb-4">Set account details</p>

              {/* FORM */}
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex flex-col mb-5">
                    <label className="mb-1 font-medium">First Name</label>
                    <input
                      type="text"
                      className="shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col mb-5">
                    <label className="mb-1 font-medium">Last Name</label>
                    <input
                      type="text"
                      className="shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex flex-col mb-5">
                    <label className="mb-1 font-medium">Username</label>
                    <input
                      type="text"
                      className="shadow-lg w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col mb-5">
                    <label className="mb-1 font-medium">Email</label>
                    <input
                      type="text"
                      className="shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600"
                      value={email} // if you have email in profile, otherwise leave blank or remove
                      onChange={(e) => setEmail(e.target.value)}
                      
                    />
                  </div>
                </div>

                {/* You can add condition here later */}

                <div className="col-span-2 flex items-center gap-4 mt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="font-medium shadow-lg transition-all cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {message && (
                    <Callout.Root>
                      <Callout.Icon>
                        <IconInfoCircle />
                      </Callout.Icon>
                      <Callout.Text>
                        {message}
                      </Callout.Text>
                    </Callout.Root>
                  )}

                </div>
              </form>
            </div>

            {/* Right: Avatar section */}
            <div className="flex flex-col items-center justify-center p-2 space-y-3">
              <Avatar
                size="9"
                radius="full"
                src={profile.avatar_url ?? undefined}
                fallback={profile.first_name[0]}
                color="green"
                className='border-2 border-green-600'
              />
              <div className="flex items-center justify-center gap-5">
                <input type="file" accept='image/*' ref={fileInputRef} className='hidden' onChange={handleAvatarChange}/>
                  <button className="p-2 rounded-lg hover:bg-gray-200 transition-all cursor-pointer border-2 border-green-600">
                  <IconPhotoEdit onClick={() => fileInputRef.current?.click()} disabled={uploading}></IconPhotoEdit>
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-200 transition-all cursor-pointer border-2 border-green-600">
                  <IconTrashX onClick={deleteAvatar} disabled={uploading}/>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}

export default Settings
