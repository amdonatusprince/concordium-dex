export default function Button({ onClick, disabled, className = '', children }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-base
          transition-all duration-200 shadow-sm
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
            : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'}
          ${className}
        `}
      >
        {children}
      </button>
    )
  }