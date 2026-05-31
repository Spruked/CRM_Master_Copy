import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { updateCRMContext } from '@/lib/orb-integration'

function viewFromPath(pathname: string) {
  const clean = pathname.replace(/^\/+/, '').trim()
  return clean || 'dashboard'
}

export function CRMProvider({ children }: { children: ReactNode }) {
  const location = useLocation()

  useEffect(() => {
    updateCRMContext({
      currentPath: location.pathname,
      currentView: viewFromPath(location.pathname),
      user: 'bryan@spruked.com',
    })
  }, [location.pathname])

  return <>{children}</>
}
