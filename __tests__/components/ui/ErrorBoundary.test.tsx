import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// Suppress expected console.error output from React error boundary
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test explosion!')
  return <div>Safe content</div>
}

describe('ErrorBoundary', () => {
  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('shows fallback UI with error message when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/Test explosion!/i)).toBeInTheDocument()
  })

  it('renders custom fallback prop when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
    expect(screen.queryByText(/Something went wrong/i)).toBeNull()
  })

  it('recovers and re-renders children after "Try again" click', async () => {
    const user = userEvent.setup()

    // We need a stateful wrapper so we can control the throw after reset
    let shouldThrow = true

    function ControlledBomb() {
      if (shouldThrow) throw new Error('Controlled explosion')
      return <div>Recovered content</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ControlledBomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()

    // Fix the throw, then click "Try again"
    shouldThrow = false
    await user.click(screen.getByRole('button', { name: /Try again/i }))

    // After reset, the boundary re-renders children — rerender to help React pick up
    rerender(
      <ErrorBoundary>
        <ControlledBomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Recovered content')).toBeInTheDocument()
  })
})
