'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, BarChart } from '@/components/charts'
import { Activity, Dumbbell, BarChart3, Scale, Trophy, Target, TrendingUp } from 'lucide-react'

// Dummy Data
const liftData = [
  { label: 'Jan', value: 135 },
  { label: 'Feb', value: 145 },
  { label: 'Mar', value: 155 },
  { label: 'Apr', value: 165 },
  { label: 'May', value: 185 },
  { label: 'Jun', value: 205 },
  { label: 'Jul', value: 225 },
]

const volumeData = [
  { label: 'W1', value: 12000 },
  { label: 'W2', value: 13500 },
  { label: 'W3', value: 11000 },
  { label: 'W4', value: 15000 },
  { label: 'W5', value: 16000 },
  { label: 'W6', value: 17500 },
]

const bodyWeightData = [
  { label: 'Jan', value: 190 },
  { label: 'Feb', value: 188 },
  { label: 'Mar', value: 186 },
  { label: 'Apr', value: 185 },
  { label: 'May', value: 182 },
  { label: 'Jun', value: 180 },
]

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'lifts', label: 'Lifts (1RM)', icon: Dumbbell },
    { id: 'volume', label: 'Volume', icon: BarChart3 },
    { id: 'body', label: 'Body Metrics', icon: Scale },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress Dashboard</h1>
        <p className="text-sm text-clean-muted">Track your fitness journey, personal records, and body metrics over time.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-clean-sidebar p-1 rounded-xl border border-clean-border w-fit max-w-full overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                isActive ? 'text-white' : 'text-clean-muted hover:text-clean-text'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-progress-tab"
                  className="absolute inset-0 bg-clean-accent rounded-lg"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="bg-clean-sidebar rounded-3xl p-6 md:p-8 border border-clean-border shadow-sm min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-clean-bg p-4 rounded-2xl border border-clean-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-clean-text">Workouts Logged</h3>
                  </div>
                  <p className="text-3xl font-bold">142</p>
                  <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +12 this month
                  </p>
                </div>
                
                <div className="bg-clean-bg p-4 rounded-2xl border border-clean-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-clean-text">PRs Broken</h3>
                  </div>
                  <p className="text-3xl font-bold">24</p>
                  <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +3 this month
                  </p>
                </div>

                <div className="bg-clean-bg p-4 rounded-2xl border border-clean-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-clean-text">Active Goals</h3>
                  </div>
                  <p className="text-3xl font-bold">3</p>
                  <p className="text-sm text-clean-muted mt-1">Bench, Squat, Deadlift</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold mb-4">Overall Volume Trend</h3>
                <div className="bg-clean-bg rounded-2xl p-4 border border-clean-border flex justify-center">
                  <LineChart data={volumeData} width={800} height={300} color="#8b5cf6" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'lifts' && (
            <motion.div
              key="lifts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Estimated 1RM (Bench Press)</h3>
                <select className="bg-clean-bg border border-clean-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-clean-accent">
                  <option>Bench Press</option>
                  <option>Squat</option>
                  <option>Deadlift</option>
                </select>
              </div>
              <div className="bg-clean-bg rounded-2xl p-4 border border-clean-border flex justify-center">
                <LineChart data={liftData} width={800} height={350} color="#3b82f6" />
              </div>
            </motion.div>
          )}

          {activeTab === 'volume' && (
            <motion.div
              key="volume"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold mb-4">Weekly Volume (lbs)</h3>
                <div className="bg-clean-bg rounded-2xl p-4 border border-clean-border flex justify-center">
                  <BarChart data={volumeData} width={800} height={350} color="#10b981" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'body' && (
            <motion.div
              key="body"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Body Weight (lbs)</h3>
                <button className="bg-clean-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-clean-accent/90 transition-colors">
                  Log Weight
                </button>
              </div>
              <div className="bg-clean-bg rounded-2xl p-4 border border-clean-border flex justify-center">
                <LineChart data={bodyWeightData} width={800} height={350} color="#f59e0b" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
