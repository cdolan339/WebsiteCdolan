import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'
import { useEffect } from 'react'
import { LoadingCurtain } from '@/components/LoadingCurtain'

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

  return <LoadingCurtain visible={true} message="Loading" />
}
