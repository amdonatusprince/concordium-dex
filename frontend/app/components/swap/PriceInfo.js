import { useMemo } from 'react'
import useDummyPrices from '../../hooks/useDummyPrices'

export default function PriceInfo({ 
  token0, 
  token1, 
  token0Amount,
  token1Amount 
}) {
  const prices = useDummyPrices()

  const exchangeRate = useMemo(() => {
    if (!token0 || !token1) return null
    return prices[token1.symbol] / prices[token0.symbol]
  }, [token0, token1, prices])

  const priceImpact = useMemo(() => {
    if (!token0Amount || !token1Amount) return null
    // Dummy calculation - in reality, this would be calculated based on pool reserves
    return Math.abs((token1Amount / token0Amount / exchangeRate - 1) * 100)
  }, [token0Amount, token1Amount, exchangeRate])

  if (!token0 || !token1) return null

  return (
    <div className="mt-4 space-y-2 text-sm text-gray-400">
      <div className="flex justify-between">
        <span>Rate</span>
        <span>
          1 {token0.symbol} = {exchangeRate?.toFixed(6)} {token1.symbol}
        </span>
      </div>

      {priceImpact !== null && (
        <div className="flex justify-between">
          <span>Price Impact</span>
          <span className={priceImpact > 5 ? 'text-red-500' : 'text-gray-400'}>
            {priceImpact.toFixed(2)}%
          </span>
        </div>
      )}

      <div className="flex justify-between">
        <span>Minimum Received</span>
        <span>
          {token1Amount 
            ? (Number(token1Amount) * 0.995).toFixed(6) 
            : '0.00'} {token1?.symbol}
        </span>
      </div>

      <div className="flex justify-between">
        <span>Liquidity Provider Fee</span>
        <span>0.3%</span>
      </div>
    </div>
  )
}