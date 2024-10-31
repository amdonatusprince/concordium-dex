import { useState, useEffect } from 'react'
import TokenInput from '../shared/TokenInput'
import Button from '../shared/Button'
import { tokens } from '../../constants/tokens'
import useDummyPrices from '../../hooks/useDummyPrices'

export default function AddLiquidity() {
  const [token0Amount, setToken0Amount] = useState('')
  const [token1Amount, setToken1Amount] = useState('')
  const [token0, setToken0] = useState(tokens[0])
  const [token1, setToken1] = useState(tokens[1])
  const prices = useDummyPrices()

  // Simulate price ratio calculation
  useEffect(() => {
    if (token0Amount && token0 && token1) {
      const rate = prices[token1.symbol] / prices[token0.symbol]
      setToken1Amount((Number(token0Amount) * rate).toFixed(6))
    }
  }, [token0Amount, token0, token1, prices])

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold text-gray-900 mb-4">Add Liquidity</div>
      
      {/* First Token Input */}
      <TokenInput
        value={token0Amount}
        onChange={setToken0Amount}
        selectedToken={token0}
        onSelectToken={() => {}}
      />

      {/* Plus Sign */}
      <div className="flex justify-center">
        <div className="bg-white border border-gray-200 p-2 rounded-full 
                      text-gray-600 shadow-sm">
          +
        </div>
      </div>

      {/* Second Token Input */}
      <TokenInput
        value={token1Amount}
        onChange={setToken1Amount}
        selectedToken={token1}
        onSelectToken={() => {}}
      />

      {/* Price and Pool Share Info */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 mt-6 border border-gray-200 shadow-sm">
        <div className="text-sm font-medium text-gray-600 mb-4 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Prices and Pool Share
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="group hover:shadow-md transition-all duration-200 text-center bg-white p-4 rounded-xl border border-gray-100">
            <div className="text-lg text-gray-900 font-semibold group-hover:text-indigo-600 transition-colors">
              {(token0Amount / token1Amount) ? (token0Amount / token1Amount).toFixed(4) : '0.0000'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-600">{token0?.symbol}</span>
              {' '}per{' '}
              <span className="font-medium text-gray-600">{token1?.symbol}</span>
            </div>
          </div>

          <div className="group hover:shadow-md transition-all duration-200 text-center bg-white p-4 rounded-xl border border-gray-100">
            <div className="text-lg text-gray-900 font-semibold group-hover:text-indigo-600 transition-colors">
              {(token1Amount / token0Amount) ? (token1Amount / token0Amount).toFixed(4) : '0.0000'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-600">{token1?.symbol}</span>
              {' '}per{' '}
              <span className="font-medium text-gray-600">{token0?.symbol}</span>
            </div>
          </div>

          <div className="group hover:shadow-md transition-all duration-200 text-center bg-white p-4 rounded-xl border border-gray-100">
            <div className="text-lg text-gray-900 font-semibold group-hover:text-indigo-600 transition-colors">
              0.3%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-600">Share of Pool</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Liquidity Button */}
      <div className="mt-4">
        <Button
          onClick={() => console.log('Add liquidity')}
          disabled={!token0Amount || !token1Amount}
        >
          Add Liquidity
        </Button>
      </div>
    </div>
  )
}