import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Taplo</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        A universal loyalty network — earn points at every small business you love.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          href="/wallet"
          className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
        >
          Customer Wallet
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 border border-black rounded-lg font-medium hover:bg-gray-50 transition"
        >
          Merchant Dashboard
        </Link>
      </div>
    </main>
  )
}
