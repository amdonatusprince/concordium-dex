import { useState, useEffect } from 'react'

export default function useDummyPrices() {
  const [prices, setPrices] = useState({
    CCD: 0.12,
    USDC: 1.00
  })

  useEffect(() => {
    // Simulate price updates
    const interval = setInterval(() => {
      setPrices(prev => ({
        ...prev,
        CCD: prev.CCD * (1 + (Math.random() - 0.5) * 0.01)
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return prices
} 