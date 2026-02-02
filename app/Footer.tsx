import React from 'react'
import { IconBrandGithub, IconBrandLinkedin, IconMail } from '@tabler/icons-react';

const Footer = () => {
  return (
    <footer className='flex flex-col items-center justify-around bg-green-50 border-t-4 border-t-green-300 space-y-5'>
        <div className='flex justify-around w-full mt-5 p-5'>
            <div className='flex flex-col items-start space-y-2'>
                <h1 className='text-3xl text-black font-medium'>Tummer</h1>
                <p className='font-medium text-lg'>Make your health a priority</p>
                <button className='bg-green-600 p-2 rounded-2xl text-white font-medium cursor-pointer hover:bg-green-700 transition-all shadow-lg'>Begin Tracking</button>
            </div>

            <div className='flex justify-around w-1/5'>
                <div>
                    <h1 className='font-semibold'>Join</h1>
                    <ul>
                        <li className='hover:text-green-700 transition-all cursor-pointer'>Sign up</li>
                        <li className='hover:text-green-700 transition-all cursor-pointer'>Login</li>
                        <li className='hover:text-green-700 transition-all cursor-pointer'>Support</li>
                    </ul>
                </div>
                <div className='flex flex-col items-center text-center w-1/2'>
                    <h1 className='font-semibold'>About the creator</h1>
                    <div className='flex items-center justify-center gap-2'>
                        <a target='_blank' href='https://github.com/MartinGV10'><IconBrandGithub  size={30} className='cursor-pointer hover:text-green-800 hover:bg-green-300 rounded-2xl p-1 box-content transition-all'></IconBrandGithub></a>

                        <a target='_blank' href='https://linkedin.com/in/martin-ganen/'><IconBrandLinkedin size={30} className='cursor-pointer hover:text-green-800 hover:bg-green-300 rounded-2xl p-1 box-content transition-all'></IconBrandLinkedin></a>

                        <a target='_blank' href='martinganen10@gmail.com'><IconMail size={30} className='cursor-pointer hover:text-green-800 hover:bg-green-300 rounded-2xl p-1 box-content transition-all'></IconMail></a>
                    </div>
                </div>
            </div>
        </div>

        <div className='flex flex-col items-center mt-5 border-t w-5/6 border-t-green-400 p-5'>
            <p>Made by a Crohn's patient</p>
            <p>&copy; Tummer {new Date().getFullYear()}</p>
        </div>
    </footer>
  )
}

export default Footer