import { useState } from 'react'
import Card from '../shared/Card'
import AddLiquidity from './AddLiquidity'
import RemoveLiquidity from './RemoveLiquidity'

export default function LiquidityCard() {
  const [isAdding, setIsAdding] = useState(true)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`
            px-4 py-2 rounded-lg
            font-medium text-white
            transition-all duration-200
            flex items-center gap-2
            ${isAdding 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-600 hover:bg-blue-700'
            }
            shadow-sm hover:shadow
          `}
        >
          <span className="text-lg">
            {isAdding ? '-' : '+'}
          </span>
          {isAdding ? 'Remove Liquidity' : 'Add Liquidity'}
        </button>
      </div>

      <Card>
        {isAdding ? <AddLiquidity /> : <RemoveLiquidity />}
      </Card>
    </div>
  )
} 