import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectSquareButton } from '@/app/(merchant)/dashboard/connect/ConnectSquareButton'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

describe('ConnectSquareButton', () => {
  let openSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockRefresh.mockClear()
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    openSpy.mockRestore()
  })

  it('renders "Connect Square Account" when not connected', () => {
    render(<ConnectSquareButton isConnected={false} />)
    expect(screen.getByRole('button', { name: /connect square account/i })).toBeInTheDocument()
  })

  it('renders "Reconnect Square" when already connected', () => {
    render(<ConnectSquareButton isConnected={true} />)
    expect(screen.getByRole('button', { name: /reconnect square/i })).toBeInTheDocument()
  })

  it('calls window.open with /api/square/connect and _blank target when clicked', async () => {
    const user = userEvent.setup()
    render(<ConnectSquareButton isConnected={false} />)
    await user.click(screen.getByRole('button', { name: /connect square account/i }))
    expect(openSpy).toHaveBeenCalledWith('/api/square/connect', '_blank')
  })

  it('shows success message and calls router.refresh() when it receives a square_connected postMessage from the same origin', async () => {
    render(<ConnectSquareButton isConnected={false} />)

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'square_connected' },
          origin: window.location.origin,
        }),
      )
    })

    expect(screen.getByText(/successfully connected/i)).toBeInTheDocument()
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('ignores postMessage from a different origin', async () => {
    render(<ConnectSquareButton isConnected={false} />)

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'square_connected' },
          origin: 'https://evil.example.com',
        }),
      )
    })

    expect(screen.queryByText(/successfully connected/i)).not.toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('does not call router.refresh() after component unmounts', async () => {
    const { unmount } = render(<ConnectSquareButton isConnected={false} />)
    unmount()

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'square_connected' },
          origin: window.location.origin,
        }),
      )
    })

    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('replaces the button with a success message after connecting', async () => {
    render(<ConnectSquareButton isConnected={false} />)

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'square_connected' },
          origin: window.location.origin,
        }),
      )
    })

    expect(screen.getByText(/successfully connected/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /connect square account/i })).not.toBeInTheDocument()
  })
})
