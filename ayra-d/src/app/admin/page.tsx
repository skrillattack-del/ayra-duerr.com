'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Users, 
  Dumbbell, 
  Activity, 
  Shield, 
  ChevronLeft,
  Search,
  MoreHorizontal,
  UserCog,
  Ban,
  TrendingUp,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { AdminRepository, type AdminStats, type AdminUser, type AdminActivity } from '@/repositories/AdminRepository'
import HomepagePeopleEditor from '@/components/admin/HomepagePeopleEditor'
import CommunityModeration from '@/components/admin/CommunityModeration'
import BusinessProfileEditor from '@/components/admin/BusinessProfileEditor'

// ============================================
// COMPONENTS
// ============================================

function StatCard({ icon: Icon, label, value, trend, loading }: { 
  icon: any, 
  label: string, 
  value: number | string,
  trend?: string,
  loading?: boolean
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/80 border border-zinc-800 p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <Icon className="w-5 h-5 text-emerald-500 mb-3" />
      {loading ? (
        <div className="h-9 w-16 bg-zinc-800 animate-pulse rounded" />
      ) : (
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      )}
      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-1">{label}</p>
      {trend && !loading && (
        <div className="flex items-center gap-1 mt-2 text-emerald-400 text-xs">
          <TrendingUp className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      )}
    </motion.div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const config = {
    ADMIN: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🔴' },
    TRAINER: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '🟡' },
    CLIENT: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '🟢' },
  }[role] || { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: '⚪' }

  return (
    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${config.color}`}>
      {config.icon} {role}
    </span>
  )
}

function UserRow({ user, onAction }: { user: AdminUser, onAction: (action: string, user: AdminUser) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const lastActive = user.last_active_at || user.updated_at

  const isDisabled = user.is_active === false

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${isDisabled ? 'opacity-50' : ''}`}
    >
      <td className="py-4 px-4">
        <div>
          <p className="text-white font-medium">{user.display_name}</p>
          <p className="text-slate-500 text-sm">{user.email}</p>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <RoleBadge role={user.role} />
          {isDisabled && (
            <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
              Disabled
            </span>
          )}
        </div>
      </td>
      <td className="py-4 px-4 text-slate-400 text-sm">{formatDate(user.created_at)}</td>
      <td className="py-4 px-4 text-slate-400 text-sm">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lastActive ? formatDate(lastActive) : 'Never'}
        </span>
      </td>
      <td className="py-4 px-4 relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-zinc-700 rounded transition-colors"
        >
          <MoreHorizontal className="w-4 h-4 text-slate-400" />
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-4 top-12 bg-zinc-900 border border-zinc-700 rounded shadow-xl z-50 min-w-[160px]">
              <button
                onClick={() => { onAction('role', user); setMenuOpen(false) }}
                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-zinc-800 flex items-center gap-2"
              >
                <UserCog className="w-4 h-4" /> Change Role
              </button>
              {isDisabled ? (
                <button
                  onClick={() => { onAction('enable', user); setMenuOpen(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-emerald-400 hover:bg-zinc-800 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Enable User
                </button>
              ) : (
                <button
                  onClick={() => { onAction('disable', user); setMenuOpen(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-2"
                >
                  <Ban className="w-4 h-4" /> Disable User
                </button>
              )}
            </div>
          </>
        )}
      </td>
    </motion.tr>
  )
}

function ActivityItem({ item }: { item: AdminActivity }) {
  const typeIcon = {
    progress: '🟢',
    join: '🔵',
    create: '🟡',
    signup: '🟣',
  }[item.type] || '⚪'

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
    const days = Math.floor(hrs / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-800/50 last:border-0">
      <span className="text-sm">{typeIcon}</span>
      <div className="flex-1">
        <p className="text-slate-300 text-sm">{item.message}</p>
        <p className="text-slate-600 text-xs mt-1">{timeAgo(item.timestamp)}</p>
      </div>
    </div>
  )
}

function RoleChangeModal({ 
  user, 
  onClose, 
  onConfirm,
  loading 
}: { 
  user: AdminUser, 
  onClose: () => void, 
  onConfirm: (role: 'ADMIN' | 'TRAINER' | 'CLIENT') => void,
  loading: boolean
}) {
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'TRAINER' | 'CLIENT'>(user.role)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md"
      >
        <h3 className="text-lg font-bold text-white mb-4">Change Role</h3>
        <p className="text-slate-400 text-sm mb-4">
          Update role for <span className="text-emerald-400">{user.email}</span>
        </p>
        
        <div className="space-y-2 mb-6">
          {(['CLIENT', 'TRAINER', 'ADMIN'] as const).map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`w-full p-3 rounded border text-left flex items-center justify-between transition-colors ${
                selectedRole === role 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <RoleBadge role={role} />
              {selectedRole === role && <CheckCircle className="w-4 h-4 text-emerald-500" />}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-zinc-700 rounded text-slate-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(selectedRole)}
            disabled={loading || selectedRole === user.role}
            className="flex-1 px-4 py-2 bg-emerald-600 rounded text-white font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// MAIN ADMIN DASHBOARD
// ============================================
export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const userRole = String(user?.role ?? '').toUpperCase()
  
  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [activity, setActivity] = useState<AdminActivity[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'community' | 'business'>('overview')
  
  // UI states
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null)
  const [roleChangeLoading, setRoleChangeLoading] = useState(false)

  // Load stats
  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const data = await AdminRepository.getStats()
      setStats(data)
    } catch (err: any) {
      console.error('Failed to load stats:', err)
      if (err.status === 403) {
        setError('Access denied. Admin privileges required.')
      } else {
        toast(mapApiErrorToToast(err, { action: 'load admin stats' }))
      }
    } finally {
      setLoadingStats(false)
    }
  }, [toast])

  // Load users
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const data = await AdminRepository.getUsers({
        search: searchQuery || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
      })
      setUsers(data.users)
    } catch (err: any) {
      console.error('Failed to load users:', err)
      toast(mapApiErrorToToast(err, { action: 'load users' }))
    } finally {
      setLoadingUsers(false)
    }
  }, [searchQuery, roleFilter, toast])

  // Load activity
  const loadActivity = useCallback(async () => {
    setLoadingActivity(true)
    try {
      const data = await AdminRepository.getActivity(15)
      setActivity(data)
    } catch (err: any) {
      console.error('Failed to load activity:', err)
      toast(mapApiErrorToToast(err, { action: 'load recent activity' }))
    } finally {
      setLoadingActivity(false)
    }
  }, [toast])

  // Initial load
  useEffect(() => {
    if (!authLoading && user) {
      loadStats()
      loadUsers()
      loadActivity()
    }
  }, [authLoading, user, loadStats, loadUsers, loadActivity])

  // Reload users when filters change
  useEffect(() => {
    if (!authLoading && user) {
      const timer = setTimeout(() => loadUsers(), 300) // Debounce
      return () => clearTimeout(timer)
    }
  }, [searchQuery, roleFilter, authLoading, user, loadUsers])

  // Handle user actions
  const handleUserAction = async (action: string, targetUser: AdminUser) => {
    if (action === 'role') {
      setRoleModalUser(targetUser)
      return
    }

    if (action === 'disable' || action === 'enable') {
      const nextActive = action === 'enable'
      const confirmed = window.confirm(
        nextActive
          ? `Enable ${targetUser.email}? They will be able to log in again.`
          : `Disable ${targetUser.email}? They will be blocked from logging in and signed out on their next token refresh.`
      )
      if (!confirmed) return

      try {
        const updated = await AdminRepository.updateUserStatus(targetUser.id, nextActive)
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
        toast({
          status: 'OK',
          title: nextActive ? 'USER ENABLED' : 'USER DISABLED',
          message: `${targetUser.email} ${nextActive ? 'can log in again.' : 'has been disabled.'}`,
          sector: 'ADMIN',
        })
      } catch (err) {
        toast(mapApiErrorToToast(err, { action: `${nextActive ? 'enable' : 'disable'} this user` }))
      }
    }
  }

  // Handle role change
  const handleRoleChange = async (newRole: 'ADMIN' | 'TRAINER' | 'CLIENT') => {
    if (!roleModalUser) return
    
    setRoleChangeLoading(true)
    try {
      await AdminRepository.updateUserRole(roleModalUser.id, newRole)
      toast({ status: 'OK', title: 'ROLE UPDATED', message: `${roleModalUser.email} is now ${newRole}.`, sector: 'ADMIN' })
      setRoleModalUser(null)
      loadUsers() // Refresh list
      loadStats() // Refresh stats in case role counts changed
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'update this user\'s role' }))
    } finally {
      setRoleChangeLoading(false)
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  // Auth check - redirect non-admins
  // Note: Backend also enforces this, this is just UX
  if (!user) {
    router.replace('/')
    return null
  }
  
  if (userRole !== 'ADMIN') {
    router.replace('/dashboard')
    return null
  }

  // Show error if access denied
  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-zinc-800 rounded text-white hover:bg-zinc-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-zinc-800 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-emerald-500" />
              <h1 className="text-xl font-black tracking-widest uppercase">
                Admin <span className="text-emerald-500">Console</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button 
              onClick={() => { loadStats(); loadUsers(); loadActivity() }}
              className="p-2 hover:bg-zinc-800 rounded transition-colors"
              title="Refresh all"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <span className="text-slate-500">Logged in as</span>
            <span className="text-emerald-400 font-mono">{user?.email}</span>
            <RoleBadge role={userRole || 'CLIENT'} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-zinc-900 border border-zinc-800 rounded p-1 w-fit">
          {(
            [
              ['overview', 'Overview'],
              ['community', 'Community'],
              ['business', 'Business Profile'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                activeTab === key ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'community' && <CommunityModeration />}
        {activeTab === 'business' && <BusinessProfileEditor />}

        <div className={activeTab === 'overview' ? '' : 'hidden'}>
        {/* Stats Grid */}
        <section className="mb-8">
          <h2 className="text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-4">{'// System Overview'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              icon={Users} 
              label="Total Users" 
              value={stats?.totalUsers ?? 0} 
              loading={loadingStats}
            />
            <StatCard 
              icon={Activity} 
              label="Active Today" 
              value={stats?.activeToday ?? 0}
              loading={loadingStats}
            />
            <StatCard 
              icon={Dumbbell} 
              label="Challenges" 
              value={stats?.totalChallenges ?? 0}
              loading={loadingStats}
            />
            <StatCard 
              icon={TrendingUp} 
              label="Progress Logs" 
              value={stats?.totalProgressLogs ?? 0}
              loading={loadingStats}
            />
          </div>
        </section>

        <HomepagePeopleEditor />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Management Table */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] uppercase tracking-[0.4em] text-slate-500">{'// User Management'}</h2>
              <span className="text-xs text-slate-600">{users.length} users</span>
            </div>
            
            {/* Search & Filter */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-10 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="TRAINER">Trainer</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded overflow-hidden">
              {loadingUsers ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto" />
                  <p className="text-slate-500 mt-4 text-sm">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No users found
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Joined</th>
                      <th className="text-left py-3 px-4">Last Active</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <UserRow key={u.id} user={u} onAction={handleUserAction} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Activity Feed */}
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-4">{'// Recent Activity'}</h2>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
              {loadingActivity ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mx-auto" />
                </div>
              ) : activity.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No recent activity</p>
              ) : (
                activity.map(item => (
                  <ActivityItem key={item.id} item={item} />
                ))
              )}
            </div>
          </section>
        </div>
        </div>
      </main>

      {/* Role Change Modal */}
      {roleModalUser && (
        <RoleChangeModal
          user={roleModalUser}
          onClose={() => setRoleModalUser(null)}
          onConfirm={handleRoleChange}
          loading={roleChangeLoading}
        />
      )}
    </div>
  )
}
