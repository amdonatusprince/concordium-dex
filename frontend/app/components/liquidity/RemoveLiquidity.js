import { useState } from 'react'
import Image from 'next/image'
import Button from '../shared/Button'
import { tokens } from '../../constants/tokens'

export default function RemoveLiquidity() {
  const [percentage, setPercentage] = useState(0)
  const [token0, token1] = [tokens[0], tokens[1]] // Example tokens

  // Dummy pool data
  const poolData = {
    totalShares: 1000,
    userShares: 100,
    token0Balance: 500,
    token1Balance: 1000,
  }

  const percentageButtons = [25, 50, 75, 100]

  const calculateOutputAmount = (tokenBalance) => {
    return (tokenBalance * poolData.userShares * percentage) / (poolData.totalShares * 100)
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold text-gray-900 mb-4">Remove Liquidity</div>

      {/* Percentage Selector */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="text-sm font-medium text-gray-600 mb-2 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M20 12H4" />
          </svg>
          Amount to Remove
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-4">{percentage}%</div>
        <div className="grid grid-cols-4 gap-2">
          {percentageButtons.map((value) => (
            <button
              key={value}
              onClick={() => setPercentage(value)}
              className={`
                py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
                ${percentage === value 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}
              `}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>

      {/* Token Output Preview */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="text-sm font-medium text-gray-600 mb-4 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          You Will Receive
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100">
            <span className="text-lg font-medium text-gray-900">
              {calculateOutputAmount(poolData.token0Balance).toFixed(6)}
            </span>
            <span className="flex items-center text-gray-600 font-medium">
              <Image 
                src={token0.logo}
                alt={token0.symbol}
                width={24}
                height={24}
                className="mr-2"
              />
              <span className="text-sm">{token0.symbol}</span>
            </span>
          </div>
          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100">
            <span className="text-lg font-medium text-gray-900">
              {calculateOutputAmount(poolData.token1Balance).toFixed(6)}
            </span>
            <span className="flex items-center text-gray-600 font-medium">
              <Image 
                src={token1.logo}
                alt={token1.symbol}
                width={24}
                height={24}
                className="mr-2"
              />
              <span className="text-sm">{token1.symbol}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pool Share Info */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Your Pool Share
          </span>
          <span className="text-lg font-semibold text-gray-900">
            {((poolData.userShares / poolData.totalShares) * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Remove Button */}
      <div className="mt-6">
        <Button
          onClick={() => console.log('Remove liquidity:', percentage)}
          disabled={percentage === 0}
        >
          Remove Liquidity
        </Button>
      </div>
    </div>
  )
}