import { LoginForm } from '@/components/auth/LoginForm'
import { sendAdminMagicLink } from './actions'

export default function AdminLoginPage() {
  return (
    <LoginForm
      title="Admin Sign In"
      description="Enter your admin email address to receive a sign-in link."
      onSubmit={sendAdminMagicLink}
    />
  )
}
