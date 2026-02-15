import React from 'react'

const AddFood = () => {
  return (
    <div className="p-6 mt-5 flex flex-col items-center">
      <div className="w-full max-w-6xl flex items-center justify-between mb-4 border-b-2 border-b-green-600 pb-3">
        <h1 className="text-3xl font-medium flex items-center gap-3">Add Foods</h1>
      </div>

      <form className='flex flex-col w-full max-w-6xl pt-2 justify-between align-center pb-2 space-y-5'>
        <div className='flex space-x-5'>
          <div className='flex flex-col space-y-5 w-2/3'>
            <div>
              <p className='font-medium'>Food Name</p>
              <input type="text" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600'/>
            </div>

            <div>
              <p className='font-medium'>Category</p>
              <input type="text" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600'/>
            </div>

          </div>

          <div className="flex flex-col space-y-5 w-2/3">
            <div>
              <p className='font-medium'>Last Reaction Date</p>
              <input type="date" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600'/>
            </div>

            <div>
              <p className='font-medium'>Severity Level</p>
            <input type="text" placeholder='1-5' className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600'/>
            </div>
          </div>

          <div className='flex flex-col space-y-5 w-2/3'>
            <div>
              <p className='font-medium'>Common Symptoms</p>
              <input type="text" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600'/>
            </div>

            <div>
              <p className='font-medium'>Notes</p>
              <input type="text" className='shadow-md w-full bg-gray-50 border-2 rounded-lg p-2 border-green-600'/>
            </div>
          </div>
        </div>

        <button className='font-medium shadow-lg transition-all cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 disabled:opacity-50'>Add Food</button>

      </form>
    </div>
  )
}

export default AddFood