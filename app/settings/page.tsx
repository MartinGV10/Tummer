import React from 'react'
import UserNav from '../components/UserNav'

const Settings = () => {
  return (
    <>
      <UserNav />
      {/* <div className='p-10 grid grid-flow-col grid-cols-2 gap-10'> */}
      <div className='p-10 flex justify-center flex-col'>
        <h1 className='text-xl font-medium'>Settings</h1>
        <div className='w-4/6 rounded-2xl bg-green-50 p-5 shadow-lg'>
          <div className='flex flex-col space-y-5'>
            <h1 className='text-lg font-medium border-b-2 border-b-green-500 w-1/9'>Account</h1>
            <label>First Name</label>
            <label>Last Name</label>
            <label>Username</label>
            <label>Email</label>
            <label>Password</label>
            <label>Confirm New Password</label>
          </div>
        </div>
      </div>
    </>
  )
}

export default Settings