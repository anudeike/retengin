import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { toast } from 'sonner'
import { RewardUnlockToast } from '@/components/customer/RewardUnlockToast'

vi.mock('sonner', () => ({ toast: vi.fn() }))

const rewards = [
  { id: 'r1', name: 'Free Coffee', points_required: 100 },
  { id: 'r2', name: 'Free Lunch',  points_required: 500 },
]

describe('RewardUnlockToast', () => {
  beforeEach(() => {
    vi.mocked(toast).mockClear()
  })

  it('renders null (no DOM element)', () => {
    const { container } = render(
      <RewardUnlockToast previousBalance={0} currentBalance={50} rewards={rewards} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('fires toast when balance crosses a reward threshold (prev=90, current=110, reward at 100)', () => {
    render(<RewardUnlockToast previousBalance={90} currentBalance={110} rewards={rewards} />)
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining('Reward'),
      expect.objectContaining({ description: 'Free Coffee' }),
    )
  })

  it('does NOT fire when balance increases but no threshold crossed (prev=50, current=80, reward at 100)', () => {
    render(<RewardUnlockToast previousBalance={50} currentBalance={80} rewards={rewards} />)
    expect(toast).not.toHaveBeenCalled()
  })

  it('does NOT fire when prev === current at a threshold (prev=100, current=100)', () => {
    // Condition: r.points_required > previousBalance — 100 > 100 is false
    render(<RewardUnlockToast previousBalance={100} currentBalance={100} rewards={rewards} />)
    expect(toast).not.toHaveBeenCalled()
  })

  it('fires only the first matching reward when multiple thresholds are crossed (uses .find())', () => {
    render(<RewardUnlockToast previousBalance={0} currentBalance={600} rewards={rewards} />)
    // Both rewards qualify (0 < 100 <= 600 and 0 < 500 <= 600), but .find() returns the first
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ description: 'Free Coffee' }))
  })

  it('fires correct reward name in toast description', () => {
    render(<RewardUnlockToast previousBalance={400} currentBalance={600} rewards={rewards} />)
    // Only 'Free Lunch' (500) is newly crossed (400 < 500 <= 600)
    expect(toast).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ description: 'Free Lunch' }),
    )
  })
})
