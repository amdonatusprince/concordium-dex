'use client'
import { useState } from 'react'
import SwapCard from './components/swap/SwapCard'
import LiquidityCard from './components/liquidity/LiquidityCard'

export default function Home() {
  const [activeTab, setActiveTab] = useState('swap')

  return (
    <main className="flex min-h-screen flex-col items-center py-12 px-4">
      <div className="w-full max-w-[480px]">
        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1.5 rounded-xl shadow-sm">
            <button
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === 'swap' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
                }`}
              onClick={() => setActiveTab('swap')}
            >
              Swap
            </button>
            <button
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === 'liquidity' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
                }`}
              onClick={() => setActiveTab('liquidity')}
            >
              Liquidity
            </button>
          </div>
        </div>
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200">
          {activeTab === 'swap' ? <SwapCard /> : <LiquidityCard />}
        </div>
      </div>
    </main>
  )
}