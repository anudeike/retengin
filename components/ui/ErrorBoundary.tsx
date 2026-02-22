'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-center text-muted-foreground">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="font-medium">Something went wrong.</p>
            <p className="text-sm mt-1">{this.state.error?.message}</p>
            <Button
              variant="link"
              size="sm"
              className="mt-4"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </Button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
