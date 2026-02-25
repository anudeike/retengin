import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import ConnectDonePage from '@/app/(merchant)/dashboard/connect/done/page'

describe('ConnectDonePage', () => {
  let closeSpy: ReturnType<typeof vi.spyOn>
  let replaceMock: ReturnType<typeof vi.fn>
  const originalLocation = window.location

  beforeEach(() => {
    closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)

    // jsdom makes window.location non-configurable; delete it and replace with a mock
    replaceMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, replace: replaceMock, origin: originalLocation.origin },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    closeSpy.mockRestore()
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
    // Reset opener between tests
    Object.defineProperty(window, 'opener', {
      value: null,
      writable: true,
      configurable: true,
    })
  })

  it('posts square_connected message to opener and closes the window when opener exists', async () => {
    const mockOpenerPostMessage = vi.fn()
    Object.defineProperty(window, 'opener', {
      value: { closed: false, postMessage: mockOpenerPostMessage },
      writable: true,
      configurable: true,
    })

    render(<ConnectDonePage />)
    await new Promise((r) => setTimeout(r, 0))

    expect(mockOpenerPostMessage).toHaveBeenCalledWith(
      { type: 'square_connected' },
      window.location.origin,
    )
    expect(closeSpy).toHaveBeenCalled()
  })

  it('redirects to /dashboard/connect?success=true when there is no opener', async () => {
    Object.defineProperty(window, 'opener', {
      value: null,
      writable: true,
      configurable: true,
    })

    render(<ConnectDonePage />)
    await new Promise((r) => setTimeout(r, 0))

    expect(replaceMock).toHaveBeenCalledWith('/dashboard/connect?success=true')
    expect(closeSpy).not.toHaveBeenCalled()
  })

  it('redirects to /dashboard/connect?success=true when opener is closed', async () => {
    Object.defineProperty(window, 'opener', {
      value: { closed: true, postMessage: vi.fn() },
      writable: true,
      configurable: true,
    })

    render(<ConnectDonePage />)
    await new Promise((r) => setTimeout(r, 0))

    expect(replaceMock).toHaveBeenCalledWith('/dashboard/connect?success=true')
    expect(closeSpy).not.toHaveBeenCalled()
  })

  it('falls back to replace when opener.postMessage throws', async () => {
    Object.defineProperty(window, 'opener', {
      value: {
        closed: false,
        postMessage: vi.fn().mockImplementation(() => {
          throw new Error('cross-origin frame')
        }),
      },
      writable: true,
      configurable: true,
    })

    render(<ConnectDonePage />)
    await new Promise((r) => setTimeout(r, 0))

    expect(replaceMock).toHaveBeenCalledWith('/dashboard/connect?success=true')
    expect(closeSpy).not.toHaveBeenCalled()
  })
})
