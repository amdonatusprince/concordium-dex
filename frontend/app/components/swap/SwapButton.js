import Button from '../shared/Button'

export default function SwapButton({ 
  token0Amount, 
  token1Amount, 
  token0, 
  token1,
  onSwap 
}) {
  // Determine button state and message
  let buttonText = 'Swap'
  let isDisabled = false

  if (!token0 || !token1) {
    buttonText = 'Select a token'
    isDisabled = true
  } else if (!token0Amount || !token1Amount) {
    buttonText = 'Enter an amount'
    isDisabled = true
  }
  // Add more validation as needed (e.g., insufficient balance)

  return (
    <Button
      onClick={onSwap}
      disabled={isDisabled}
      className="mt-4"
    >
      {buttonText}
    </Button>
  )
}