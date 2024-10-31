import { useState, useEffect } from 'react'
import Card from '../shared/Card'
import TokenInput from '../shared/TokenInput'
import SwapButton from './SwapButton'
import PriceInfo from './PriceInfo'
import { tokens } from '../../constants/tokens'
import useDummyPrices from '../../hooks/useDummyPrices'

export default function SwapCard() {
  const [token0Amount, setToken0Amount] = useState('')
  const [token1Amount, setToken1Amount] = useState('')
  const [token0, setToken0] = useState(tokens[0])
  const [token1, setToken1] = useState(tokens[1])
  const prices = useDummyPrices()

  // Simulate price calculation when token0Amount changes
  useEffect(() => {
    if (token0Amount && token0 && token1) {
      const rate = prices[token1.symbol] / prices[token0.symbol]
      setToken1Amount((Number(token0Amount) * rate).toFixed(6))
    }
  }, [token0Amount, token0, token1, prices])

  const handleSwap = () => {
    // Implement swap functionality
    console.log('Swap executed:', {
      token0Amount,
      token1Amount,
      token0: token0.symbol,
      token1: token1.symbol
    })
  }

  return (
    <Card>
      <div className="space-y-4">
        {/* First Token Input */}
        <TokenInput
          value={token0Amount}
          onChange={setToken0Amount}
          selectedToken={token0}
          onSelectToken={() => {}}
        />
        
        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <button 
            onClick={() => {
              const temp = token0
              setToken0(token1)
              setToken1(temp)
              setToken0Amount('')
              setToken1Amount('')
            }}
            className="p-2 bg-white border border-gray-200 rounded-full 
                     hover:bg-gray-50 transition-colors shadow-sm
                     text-gray-600 hover:text-gray-900"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 14l-7 7m0 0l-7-7m7 7V3" 
              />
            </svg>
          </button>
        </div>

        {/* Second Token Input */}
        <TokenInput
          value={token1Amount}
          onChange={setToken1Amount}
          selectedToken={token1}
          onSelectToken={() => {}}
        />

        {/* Price Information */}
        <div className="mt-4">
          <PriceInfo 
            token0={token0}
            token1={token1}
            token0Amount={token0Amount}
            token1Amount={token1Amount}
          />
        </div>
        
        {/* Swap Button */}
        <div className="mt-4">
          <SwapButton
            token0={token0}
            token1={token1}
            token0Amount={token0Amount}
            token1Amount={token1Amount}
            onSwap={handleSwap}
          />
        </div>
      </div>
    </Card>
  )
}