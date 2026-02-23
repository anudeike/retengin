import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CustomerTable } from '@/components/merchant/CustomerTable'

const customers = [
  { customer_id: 'c1', email: 'alice@example.com', display_name: 'Alice',  balance: 150 },
  { customer_id: 'c2', email: 'bob@example.com',   display_name: null,     balance: 75  },
]

describe('CustomerTable', () => {
  it('renders empty state when customers=[]', () => {
    render(<CustomerTable customers={[]} />)
    expect(screen.getByText(/No customers yet/i)).toBeInTheDocument()
  })

  it('renders customer email in table rows', () => {
    render(<CustomerTable customers={customers} />)
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('renders display_name when present', () => {
    render(<CustomerTable customers={customers} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows email as primary name when display_name is null', () => {
    render(<CustomerTable customers={[{ customer_id: 'c2', email: 'bob@example.com', display_name: null, balance: 75 }]} />)
    // email shown as the primary text
    expect(screen.getAllByText('bob@example.com').length).toBeGreaterThan(0)
  })

  it('renders customer balance in table rows', () => {
    render(<CustomerTable customers={customers} />)
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })
})
