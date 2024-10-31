export default function Card({ children, className = '' }) {
  return (
    <div className={`p-6 rounded-3xl bg-white ${className}`}>
      {children}
    </div>
  )
}