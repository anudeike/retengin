import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MerchantStatusBadge } from '@/components/admin/MerchantStatusBadge'

describe('MerchantStatusBadge', () => {
  it("active → renders 'active' with green class", () => {
    render(<MerchantStatusBadge status="active" />)
    const badge = screen.getByText('active')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('green')
  })

  it("pending → renders 'pending' with yellow class", () => {
    render(<MerchantStatusBadge status="pending" />)
    const badge = screen.getByText('pending')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('yellow')
  })

  it("suspended → renders 'suspended' without green or yellow classes", () => {
    render(<MerchantStatusBadge status="suspended" />)
    const badge = screen.getByText('suspended')
    expect(badge).toBeInTheDocument()
    expect(badge.className).not.toContain('green')
    expect(badge.className).not.toContain('yellow')
  })
})
