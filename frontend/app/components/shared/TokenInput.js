import Image from 'next/image'

export default function TokenInput({ 
  value, 
  onChange, 
  onSelectToken, 
  selectedToken 
}) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-all duration-200 border border-gray-200">
      <div className="flex justify-between gap-4">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.0"
          className="bg-transparent text-2xl outline-none w-full text-gray-900 placeholder-gray-400"
        />
        <button
          onClick={onSelectToken}
          className="flex items-center bg-white border border-gray-200 hover:bg-gray-50 
                   px-3 py-1.5 rounded-lg transition-colors shadow-sm min-w-[110px]"
        >
          {selectedToken ? (
            <>
              <Image 
                src={selectedToken.logo}
                alt={selectedToken.symbol}
                width={20}
                height={20}
                className="mr-2"
              />
              <span className="font-medium text-gray-600 text-sm">{selectedToken.symbol}</span>
            </>
          ) : (
            'Select Token'
          )}
        </button>
      </div>
    </div>
  )
}