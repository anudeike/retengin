import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RewardProgress } from '@/components/customer/RewardProgress'

const rewards = [
  { id: 'r1', name: 'Silver',   points_required: 100 },
  { id: 'r2', name: 'Gold',     points_required: 500 },
  { id: 'r3', name: 'Platinum', points_required: 1000 },
]

describe('RewardProgress', () => {
  it('shows empty state when rewards=[]', () => {
    render(<RewardProgress currentBalance={200} rewards={[]} />)
    expect(screen.getByText(/No rewards available yet/i)).toBeInTheDocument()
  })

  it('sorts rewards by points_required ascending to find next target', () => {
    // Provide rewards in reverse order — component should sort them
    const unsorted = [rewards[2], rewards[0], rewards[1]]
    render(<RewardProgress currentBalance={0} rewards={unsorted} />)
    // Next reward should be Silver (100), the smallest threshold
    expect(screen.getByText('Silver')).toBeInTheDocument()
  })

  it('shows correct "N pts to go" for next unachieved reward', () => {
    render(<RewardProgress currentBalance={200} rewards={rewards} />)
    // Next reward is Gold (500), 300 pts to go
    expect(screen.getByText(/300.*pts to go/i)).toBeInTheDocument()
  })

  it('shows unlocked rewards in the "Unlocked rewards" section', () => {
    render(<RewardProgress currentBalance={200} rewards={rewards} />)
    // Silver (100) is unlocked, Gold and Platinum are not
    expect(screen.getByText('Unlocked rewards')).toBeInTheDocument()
    const silverItems = screen.getAllByText('Silver')
    expect(silverItems.length).toBeGreaterThan(0)
  })

  it('hides progress section when all rewards are achieved (balance >= all thresholds)', () => {
    render(<RewardProgress currentBalance={2000} rewards={rewards} />)
    // No "pts to go" text when all are unlocked
    expect(screen.queryByText(/pts to go/i)).toBeNull()
    // All three should appear as unlocked
    expect(screen.getByText('Silver')).toBeInTheDocument()
    expect(screen.getByText('Gold')).toBeInTheDocument()
    expect(screen.getByText('Platinum')).toBeInTheDocument()
  })

  it('shows only next reward when balance is below all thresholds', () => {
    render(<RewardProgress currentBalance={0} rewards={rewards} />)
    // next = Silver (100), no unlocked rewards section
    expect(screen.getByText('Silver')).toBeInTheDocument()
    expect(screen.getByText(/100.*pts to go/i)).toBeInTheDocument()
    expect(screen.queryByText('Unlocked rewards')).toBeNull()
  })
})
