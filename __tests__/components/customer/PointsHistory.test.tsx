import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PointsHistory } from '@/components/customer/PointsHistory'

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    id:               'tx-001',
    transaction_type: 'earned',
    points:           100,
    balance_after:    200,
    created_at:       '2024-06-15T10:00:00Z',
    note:             null,
    ...overrides,
  }
}

describe('PointsHistory', () => {
  it('shows "No transactions yet" for empty array', () => {
    render(<PointsHistory transactions={[]} />)
    expect(screen.getByText(/No transactions yet/i)).toBeInTheDocument()
  })

  it("type='earned' shows label 'Earned' with green color class", () => {
    render(<PointsHistory transactions={[makeTx({ transaction_type: 'earned' })]} />)
    expect(screen.getByText('Earned')).toBeInTheDocument()
    const pts = screen.getByText(/\+100/i)
    expect(pts.className).toContain('green')
  })

  it("type='redeemed' shows label 'Redeemed' with orange color class", () => {
    render(<PointsHistory transactions={[makeTx({ transaction_type: 'redeemed', points: -100 })]} />)
    expect(screen.getByText('Redeemed')).toBeInTheDocument()
    const pts = screen.getByText(/-100/i)
    expect(pts.className).toContain('orange')
  })

  it("type='reversed' shows label 'Reversed' with red color class", () => {
    render(<PointsHistory transactions={[makeTx({ transaction_type: 'reversed', points: -50 })]} />)
    expect(screen.getByText('Reversed')).toBeInTheDocument()
    const pts = screen.getByText(/-50/i)
    expect(pts.className).toContain('red')
  })

  it("type='admin_correction' shows label 'Correction' with blue color class", () => {
    render(<PointsHistory transactions={[makeTx({ transaction_type: 'admin_correction', points: 25 })]} />)
    expect(screen.getByText('Correction')).toBeInTheDocument()
    const pts = screen.getByText(/\+25/i)
    expect(pts.className).toContain('blue')
  })

  it('positive points show + prefix', () => {
    render(<PointsHistory transactions={[makeTx({ points: 75 })]} />)
    expect(screen.getByText(/\+75/)).toBeInTheDocument()
  })

  it('renders balance_after value per row', () => {
    render(<PointsHistory transactions={[makeTx({ balance_after: 350 })]} />)
    expect(screen.getByText(/350.*bal/i)).toBeInTheDocument()
  })

  it('renders note when present', () => {
    render(<PointsHistory transactions={[makeTx({ note: 'Admin correction note' })]} />)
    expect(screen.getByText('Admin correction note')).toBeInTheDocument()
  })

  it('omits note element when note is null', () => {
    render(<PointsHistory transactions={[makeTx({ note: null })]} />)
    expect(screen.queryByText('null')).toBeNull()
    // Just check the label renders normally
    expect(screen.getByText('Earned')).toBeInTheDocument()
  })
})
