import { Button } from "@radix-ui/themes";
import { IconStethoscope, IconUsersGroup, IconCompass } from '@tabler/icons-react';

export default function Home() {
  return (
    <div className="flex items-center justify-center mt-15 flex-col gap-10">
      <div className="flex items-center w-5/6 rounded-2xl flex-col space-y-10 p-10">
        <h1 className="text-5xl font-bold">Turn daily choices into long-term results</h1>
        <p className="text-xl font-medium">From meal planning to tolerance tracking and progress insights, everything you need to support healthier habits — all in one place</p>
        <button className="bg-green-600 hover:bg-green-800 text-white p-3 text-lg rounded-xl font-medium cursor-pointer transition-all shadow-lg">Start For Free</button>
        <ul className="flex space-x-3">
          <li>Always Free</li>
          <li>No Credit Card Required</li>
          <li>Get started in minutes</li>
        </ul>
      </div>

      <div className="flex justify-around items-center flex-col bg-linear-to-r from-green-200 to-green-100 w-5/6 rounded-2xl p-10 shadow-xl">
        <div className="flex items-start w-5/6 rounded-2xl p-5 flex-col">
          <h1 className="text-3xl font-semibold">The first app of it's kind for people with dietary conditions</h1>
          <p className="text-xl font-medium">Track meals, manage symptoms, and make informed choices with guidance tailored to your condition</p>

          <div className="w-full flex justify-center my-6 shadow-lg">
            <div className="flex gap-6 bg-white px-6 py-4 rounded-xl">
              <div>
                <p>pic 1</p>
                <p className="text-lg font-medium">Understand Food Tolerance</p>
                <p>Learn what agrees with your body through everyday meals</p>
              </div>

              <div>
                <p>pic 2</p>
                <p className="text-lg font-medium">Track What You Eat</p>
                <p>Log meals in seconds to build a clearer picture over time</p>
              </div>

              <div>
                <p>pic 3</p>
                <p className="text-lg font-medium">Monitor Digestion Patterns</p>
                <p>Spot changes and trends in digestive health over time</p>
              </div>
            </div>
          </div>

          <button className="self-center bg-green-600 hover:bg-green-800 text-white p-3 text-lg rounded-xl font-medium cursor-pointer transition-all shadow-lg">
            Start Logging Today
          </button>
        </div>
      </div>

      
      <div className="flex items-center justify-around w-5/6 rounded-2xl flex-col space-y-5 p-10 ">
        <h1 className="text-3xl font-semibold">Support built around your needs</h1>
        <p className="font-medium text-lg">Connect with resources and guidance built for people managing dietary conditions — designed to help you feel supported, informed, and empowered</p>
        <div className="flex justify-around gap-10 w-4/6">
          <div className="p-5 rounded-2xl flex flex-col items-center space-y-2 hover:scale-110 transition-all hover:bg-green-300 shadow-md text-center bg-linear-to-tr from-green-200 to-green-300">
            <IconStethoscope size={50} className="bg-white rounded-2xl box-content p-2 shadow-lg "></IconStethoscope>
            <p className="p-2 border-b-2 font-semibold">Treatment & Care Options</p>
            <p>Explore evidence-based treatment paths, lifestyle adjustments, and questions to discuss with your healthcare provider</p>
          </div>
          <div className="p-5 rounded-2xl flex flex-col items-center space-y-2 hover:scale-110 transition-all hover:bg-green-300 shadow-md text-center bg-linear-to-tr from-green-200 to-green-300">
            <IconCompass size={50} className="bg-white rounded-2xl box-content p-2 shadow-lg"></IconCompass>
            <p className="p-2 border-b-2 font-semibold">Personalized Guidance</p>
            <p className="">Receive insights tailored tailored to your condition, symptoms, and daily patters</p>
          </div>
          <div className="p-5 rounded-2xl flex flex-col items-center space-y-2 hover:scale-110 transition-all hover:bg-green-400 shadow-md text-center bg-linear-to-tr from-green-200 to-green-300">
            <IconUsersGroup size={50} className="bg-white rounded-2xl box-content p-2 shadow-lg "></IconUsersGroup>
            {/* <span className="text-sm bg-white rounded-2xl p-2">Coming Soon</span> */}
            <p className="p-2 border-b-2 font-semibold">Community Support</p>
            <p>Connect with others navigation similar dietary conditions for shared understanding and support</p>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-col justify-around bg-linear-to-tr from-green-100 to-green-200 w-5/6 rounded-2xl p-10 shadow-lg space-y-5 mb-10">
        <h1 className="text-3xl font-semibold">Choose Your Plan</h1>
        <p className="text-xl font-medium">Start for free and upgrade at any time</p>

        <div className="grid grid-cols-3 gap-5 w-5/6 text-center">
          <div className="bg-white p-5 rounded-2xl border-green-500 border-3 flex flex-col space-y-5 shadow-xl">
            <p className="text-2xl font-medium">Free</p>
            <p className="text-3xl font-bold">$0/<span className="text-base">Month</span></p>
            <p className="font-medium ">Meal and digestion tracking essentials</p>
            <ul className="font-medium">
              <li>Log meals</li>
              <li>Track digestion</li>
              <li>Label tolerant foods</li>
              <li>Add daily notes</li>
              <li>Community Support (Coming Soon)</li>
            </ul>
            <button className="mt-auto bg-green-600 hover:bg-green-800 text-white p-2 text-base rounded-xl font-medium transition-all shadow-md cursor-pointer">Start Now</button>
          </div>

          <div className="bg-white p-5 rounded-2xl border-green-500 border-3 flex flex-col space-y-5 shadow-xl">
            <p className="text-2xl font-medium">Pro</p>
            <p className="text-3xl font-bold">$10/<span className="text-base">Month</span></p>
            <p className="font-medium ">Turn your data into clear, personalized insights</p>
            <ul className="font-medium">
              <li>Everything in free</li>
              <li>Food-digestion pattern insights</li>
              <li>Personalized guidance</li>
              <li>Data export</li>
            </ul>
            <button className="bg-green-600 hover:bg-green-800 text-white p-2 text-base rounded-xl font-medium cursor-pointer transition-all shadow-md mt-auto">Upgrade</button>
          </div>

          <div className="bg-white p-5 rounded-2xl border-green-500 border-3 flex flex-col space-y-5 shadow-xl">
            <p className="text-2xl font-medium">Max</p>
            <p className="text-3xl font-bold">$50/<span className="text-base">6 Months</span></p>
            <p className="font-medium ">All Pro features at a discounted rate</p>
            <ul className="font-medium">
              <li>Everything in pro</li>
              <li>Save 15% with a 6-month plan</li>
              <li>Deeper insights over time</li>
              <li>Long term trend tracking</li>
              <li>Priority email support</li>
            </ul>
            <button className="bg-green-600 hover:bg-green-800 text-white p-2 text-base rounded-xl font-medium cursor-pointer transition-all shadow-md mt-auto">Upgrade</button>
            {/* bg-linear-to-t from-green-600 to-green-700 */}
          </div>
        </div>
      </div>
    </div>
  );
}
