import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WalletCard } from '@/components/customer/WalletCard'

describe('WalletCard', () => {
  it('renders link to /wallet/{merchantSlug}', () => {
    render(
      <WalletCard
        merchantSlug="coffee-shop"
        merchantName="Coffee Shop"
        balance={150}
        logoUrl={null}
      />,
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/wallet/coffee-shop')
  })

  it('displays balance formatted with toLocaleString', () => {
    render(
      <WalletCard
        merchantSlug="shop"
        merchantName="Shop"
        balance={1500}
        logoUrl={null}
      />,
    )
    // toLocaleString may format as "1,500" in en-US
    expect(screen.getByText(/1.500|1,500/)).toBeInTheDocument()
  })

  it('renders img when logoUrl is provided', () => {
    render(
      <WalletCard
        merchantSlug="shop"
        merchantName="Shop"
        balance={0}
        logoUrl="https://example.com/logo.png"
      />,
    )
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png')
  })

  it('renders first character initial as fallback when logoUrl is null', () => {
    render(
      <WalletCard
        merchantSlug="boba-place"
        merchantName="Boba Place"
        balance={75}
        logoUrl={null}
      />,
    )
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })
})
