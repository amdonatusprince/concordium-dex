import './globals.css'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

export const metadata = {
  title: "Concordium DEX",
  description: "Swap your CIS-2 tokens with ease!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 min-h-screen"
      suppressHydrationWarning
      >
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
