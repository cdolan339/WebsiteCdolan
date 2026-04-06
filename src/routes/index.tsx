import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'
import { useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: IndexRedirect,
})

function IndexRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated()) {
      navigate({ to: '/homepage', replace: true })
    } else {
      navigate({ to: '/login', replace: true })
    }
  }, [navigate])

  return <div style={{ background: '#0f0c29', minHeight: '100vh' }} />
}
