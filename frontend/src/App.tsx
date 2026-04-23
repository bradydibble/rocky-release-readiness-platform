import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import NavBar from './components/NavBar'
import { getMe } from './lib/api'
import { useAppStore } from './lib/store'

export default function App() {
  const setIsAdmin = useAppStore((s) => s.setIsAdmin)
  const setUser = useAppStore((s) => s.setUser)
  const { data } = useQuery({ queryKey: ['me'], queryFn: getMe })

  useEffect(() => {
    if (data) {
      setIsAdmin(data.is_admin)
      setUser(data.user ?? null)
    }
  }, [data, setIsAdmin, setUser])

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <Outlet />
      </main>
    </div>
  )
}
