'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Flame, Medal, Target, Bell, Lock, Users, Check, Sparkles, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// Mock data for avatars
const mockAvatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
}

export default function ChallengesPage() {
  const [notified, setNotified] = useState(false)
  const { user } = useAuth()

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 md:p-12 border border-clean-border shadow-sm text-center relative overflow-hidden"
      >
        {user?.role === 'ADMIN' ? (
          <Link
            href="/dashboard/challenges/admin"
            className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-lg border border-clean-accent/35 bg-clean-accent/10 px-3 py-2 text-xs font-bold text-clean-accent transition hover:bg-clean-accent/15 md:right-6 md:top-6"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin Control Center
          </Link>
        ) : null}
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-clean-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-clean-accent to-clean-accent-soft text-white flex items-center justify-center shadow-lg shadow-clean-accent/20 mb-6"
          >
            <Trophy className="w-12 h-12" />
          </motion.div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-clean-text mb-4 tracking-tight">
            Team Challenges <br className="md:hidden" /> <span className="text-clean-muted">Are Coming</span>
          </h1>
          <p className="text-lg text-clean-muted max-w-xl mx-auto mb-8">
            Get ready to push your limits. We&apos;re building leaderboards, achievement badges, and team streaks to keep you accountable.
          </p>

          <button
            onClick={() => setNotified(true)}
            disabled={notified}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              notified 
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-clean-accent text-white hover:bg-clean-accent hover:shadow-md active:scale-95'
            }`}
          >
            <AnimatePresence mode="wait">
              {notified ? (
                <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  You&apos;re on the list!
                </motion.div>
              ) : (
                <motion.div key="bell" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notify me at launch
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.div>

      {/* Feature Preview Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Card 1 */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 border border-clean-border shadow-sm flex flex-col items-center text-center group">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Flame className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg mb-2">30-Day Streaks</h3>
          <p className="text-sm text-clean-muted mb-4 flex-1">
            Build consistency with daily check-ins. Keep your streak alive to unlock exclusive rewards.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" /> Coming Soon
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 border border-clean-border shadow-sm flex flex-col items-center text-center group">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Target className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg mb-2">Community Leaderboard</h3>
          <p className="text-sm text-clean-muted mb-4 flex-1">
            See how you stack up against the squad. Climb the ranks by logging workouts and hitting PRs.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" /> In Progress
          </div>
        </motion.div>

        {/* Card 3 */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 border border-clean-border shadow-sm flex flex-col items-center text-center group">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Medal className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg mb-2">Achievement Badges</h3>
          <p className="text-sm text-clean-muted mb-4 flex-1">
            Collect unique badges for milestones. Show off your heavy lifts and consistency milestones.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" /> Planning
          </div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Community Countdown */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl p-6 md:p-8 border border-clean-border shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-clean-hover text-clean-text">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-lg">Launch Waitlist</h2>
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex -space-x-3">
              {mockAvatars.map((url, i) => (
                <img key={i} src={url} alt="Member avatar" className="w-10 h-10 rounded-full border-2 border-white bg-gray-100" />
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white bg-clean-hover flex items-center justify-center text-xs font-bold text-clean-muted">
                +44
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-clean-text">48</div>
              <div className="text-xs text-clean-muted font-medium">ready to compete</div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-xs font-bold text-clean-muted mb-2 uppercase tracking-wider">
              <span>Goal: 100 athletes</span>
              <span>48%</span>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '48%' }}
                transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                className="h-full bg-clean-accent rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Rank Teaser */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl p-6 md:p-8 border border-clean-border shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 rounded-xl bg-clean-hover text-clean-text">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-lg">Your Rank Preview</h2>
          </div>

          <div className="relative rounded-2xl bg-gray-50 border border-gray-100 p-6 flex items-center justify-between group">
            {/* Blurred content */}
            <div className="flex items-center gap-4 blur-[4px] opacity-60 transition-all group-hover:blur-[6px]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wide">Current Tier</div>
                <div className="text-2xl font-extrabold text-gray-800">Gold Elite</div>
                <div className="text-xs font-medium text-gray-500 mt-1">Top 5% of athletes</div>
              </div>
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/20 backdrop-blur-[2px]">
              <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-2">
                <Lock className="w-5 h-5 text-clean-muted" />
              </div>
              <span className="text-sm font-bold text-clean-text bg-white/80 px-3 py-1 rounded-full shadow-sm">
                Unlocks at launch
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
