'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AdminControlCenter } from '@/components/challenges/admin/AdminControlCenter'

export default function ChallengesAdminPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/?reason=session-expired')
    else if (user.role !== 'ADMIN') router.replace('/dashboard/challenges')
  }, [loading, router, user])

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gonga-bg text-gonga-secondary">
        <div className="flex flex-col items-center gap-3" role="status" aria-label="Verifying admin access">
          <ShieldCheck className="h-9 w-9 animate-pulse" aria-hidden="true" />
          <span className="challenge-admin-display text-xs uppercase tracking-widest">Verifying secure session</span>
        </div>
      </div>
    )
  }

  return <AdminControlCenter />
}
