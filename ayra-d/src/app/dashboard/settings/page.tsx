'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { UserRepository } from '@/repositories/UserRepository'
import { AuthRepository } from '@/repositories/AuthRepository'
import { BillingRepository, type BillingStatus } from '@/repositories/BillingRepository'
import {
  ShieldCheck,
  Crown,
  Users,
  Loader2,
  Check,
  Lock,
  Sparkles,
  KeyRound,
  CreditCard,
  AlertTriangle,
  Pencil,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/providers/ToastProvider'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { mediaUrl } from '@/lib/media'

const TIER_STEPS = [
  { key: 'FREE', label: 'Free', icon: Users },
  { key: 'PAID', label: 'Paid', icon: Crown },
  { key: 'ADMIN', label: 'Admin', icon: ShieldCheck },
] as const

const PLAN_FEATURES: Record<'FREE' | 'PAID', { included: string[]; locked: string[] }> = {
  FREE: {
    included: ['3 workout templates', 'Basic progress tracking', 'Community access'],
    locked: ['Unlimited templates', 'Advanced analytics', 'Public template sharing'],
  },
  PAID: {
    included: [
      'Unlimited templates',
      'Advanced analytics',
      'Public template sharing',
      'Priority support',
    ],
    locked: [],
  },
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function SettingsPage() {
  const { user, loading, refreshUser } = useAuth()
  const { toast } = useToast()

  const [switchingPlan, setSwitchingPlan] = useState(false)
  const [redeemCodeInput, setRedeemCodeInput] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [billingBusy, setBillingBusy] = useState(false)

  const loadBilling = useCallback(() => {
    BillingRepository.getStatus().then(setBilling).catch(() => setBilling(null))
  }, [])

  useEffect(() => {
    loadBilling()
  }, [loadBilling])

  // Handle return from Stripe Checkout: ?checkout=success|cancelled
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (!checkout) return
    window.history.replaceState({}, '', window.location.pathname)

    if (checkout === 'cancelled') {
      toast({ title: 'Checkout cancelled — no changes made', variant: 'default' })
      return
    }
    if (checkout !== 'success') return

    toast({ title: 'Payment received — activating your PRO membership…', variant: 'success' })
    let tries = 0
    const poll = async () => {
      tries += 1
      try {
        const status = await BillingRepository.getStatus()
        setBilling(status)
        if (status.membership_tier === 'PAID') {
          await AuthRepository.refreshToken().catch(() => undefined)
          await refreshUser()
          window.dispatchEvent(new Event('auth:changed'))
          toast({ title: 'Welcome to PRO 👑', variant: 'success' })
          return
        }
      } catch {
        // keep polling
      }
      if (tries < 10) setTimeout(poll, 2000)
    }
    poll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStripeUpgrade = async () => {
    setBillingBusy(true)
    try {
      const url = await BillingRepository.createCheckout()
      window.location.href = url
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'start checkout' }))
      setBillingBusy(false)
    }
  }

  const handleManageBilling = async () => {
    setBillingBusy(true)
    try {
      const url = await BillingRepository.openPortal()
      window.location.href = url
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'open the billing portal' }))
      setBillingBusy(false)
    }
  }

  const tierLabel = user?.role === 'ADMIN' ? 'Admin' : user?.membership_tier === 'PAID' ? 'Paid' : 'Free'
  const TierIcon = user?.role === 'ADMIN' ? ShieldCheck : user?.membership_tier === 'PAID' ? Crown : Users

  const handlePlanSwitch = async (nextTier: 'FREE' | 'PAID') => {
    setSwitchingPlan(true)
    try {
      await UserRepository.updatePlan(nextTier)
      await refreshUser()
      window.dispatchEvent(new Event('auth:changed'))
      toast({
        title: `Switched to ${nextTier === 'PAID' ? 'Paid' : 'Free'} plan`,
        variant: 'success',
      })
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'switch your plan' }))
    } finally {
      setSwitchingPlan(false)
    }
  }

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!redeemCodeInput.trim()) return
    setRedeeming(true)
    try {
      await UserRepository.redeemCode(redeemCodeInput.trim())
      await refreshUser()
      window.dispatchEvent(new Event('auth:changed'))
      setRedeemCodeInput('')
      toast({ title: 'Admin access granted', variant: 'success' })
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'redeem your code' }))
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-clean-accent" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-sm text-gray-500">Manage your membership, billing, and access.</p>
      </div>

      {/* Profile Quick Info */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
        {user?.avatar_url ? (
          <img
            src={mediaUrl(user.avatar_url) ?? undefined}
            alt=""
            className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-clean-accent to-clean-accent-soft flex items-center justify-center text-white text-xl font-bold shadow shrink-0">
            {initials(user?.display_name || 'GF')}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg truncate">{user?.display_name || 'Athlete'}</h2>
          <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
              <TierIcon className="w-3.5 h-3.5" />
              {tierLabel}
            </span>
            <p className="text-xs text-gray-400">
              Edit your profile via the sidebar{' '}
              <Pencil className="w-3 h-3 inline text-clean-accent" />
            </p>
          </div>
        </div>
      </div>

      {/* Membership & Admin Access */}
      <div id="membership-plan" className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
        {/* Tier ladder */}
        <div>
          <h2 className="font-bold text-lg mb-1">Your rank</h2>
          <p className="text-sm text-gray-500 mb-5">Level up by switching plans or redeeming a code.</p>
          <div className="flex items-center">
            {TIER_STEPS.map((step, i) => {
              const currentIndex = user?.role === 'ADMIN' ? 2 : user?.membership_tier === 'PAID' ? 1 : 0
              const reached = i <= currentIndex
              const isCurrent = i === currentIndex
              const StepIcon = step.icon
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <motion.div
                      animate={isCurrent ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                      transition={isCurrent ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : {}}
                      className={`relative w-11 h-11 rounded-full flex items-center justify-center border-2 ${
                        reached
                          ? 'bg-clean-accent border-clean-accent text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-300'
                      }`}
                    >
                      <StepIcon className="w-5 h-5" />
                      {isCurrent && (
                        <motion.span
                          className="absolute inset-0 rounded-full border-2 border-clean-accent"
                          animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                    </motion.div>
                    <span className={`text-xs font-bold ${reached ? 'text-gray-800' : 'text-gray-300'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < TIER_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 rounded-full ${
                        i < currentIndex ? 'bg-clean-accent' : 'bg-gray-100'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {user?.role === 'ADMIN' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-4 text-sm font-semibold text-white bg-gradient-to-r from-clean-accent to-clean-accent-soft px-5 py-4 rounded-2xl shadow-lg shadow-clean-accent/20"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -6, 6, 0] }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0"
              >
                <ShieldCheck className="w-5 h-5" />
              </motion.div>
              <div>
                <p className="font-bold flex items-center gap-1.5">
                  Admin access unlocked <Sparkles className="w-4 h-4" />
                </p>
                <p className="text-xs font-normal text-white/80">Full platform access — no plan limits apply.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="plans"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              <div>
                <h2 className="font-bold text-lg mb-1">Membership plan</h2>
                <p className="text-sm text-gray-500 mb-4">
                  {billing?.stripeConfigured
                    ? 'Secure payments powered by Stripe. Cancel anytime from the billing portal.'
                    : 'This is a demo — switch your plan anytime, no payment required.'}
                </p>

                {billing?.stripeConfigured && billing.subscription_status === 'PAST_DUE' && (
                  <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Your last payment failed. Update your payment method to keep PRO benefits.
                    <button onClick={handleManageBilling} className="ml-auto font-bold underline shrink-0">
                      Fix payment
                    </button>
                  </div>
                )}

                {billing?.stripeConfigured && user?.membership_tier === 'PAID' && (
                  <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-600">
                    <CreditCard className="w-4 h-4 shrink-0 text-clean-accent" />
                    <span>
                      {billing.cancel_at_period_end
                        ? `PRO ends ${billing.current_period_end ? new Date(billing.current_period_end).toLocaleDateString() : 'at period end'}`
                        : billing.current_period_end
                          ? `Renews ${new Date(billing.current_period_end).toLocaleDateString()}`
                          : 'Active subscription'}
                    </span>
                    <button
                      onClick={handleManageBilling}
                      disabled={billingBusy}
                      className="ml-auto text-xs font-bold text-clean-accent hover:underline shrink-0 disabled:opacity-50"
                    >
                      Manage billing
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(['FREE', 'PAID'] as const).map((tier) => {
                    const isCurrentTier = user?.membership_tier === tier
                    const isPaidTier = tier === 'PAID'
                    const TierCardIcon = isPaidTier ? Crown : Users
                    return (
                      <motion.div
                        key={tier}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className={`relative rounded-2xl border-2 p-5 overflow-hidden transition-colors ${
                          isCurrentTier ? 'border-clean-accent bg-clean-accent/5' : 'border-gray-100'
                        }`}
                      >
                        {isPaidTier && !isCurrentTier && (
                          <span className="absolute top-0 right-0 text-[10px] font-bold text-white bg-gray-900 px-2.5 py-1 rounded-bl-xl">
                            MOST POPULAR
                          </span>
                        )}
                        <AnimatePresence>
                          {isCurrentTier && (
                            <motion.span
                              initial={{ scale: 0, rotate: -15 }}
                              animate={{ scale: 1, rotate: -8 }}
                              exit={{ scale: 0 }}
                              className="absolute top-3 right-3 text-[10px] font-bold text-white bg-clean-accent px-2 py-1 rounded-full"
                            >
                              CURRENT
                            </motion.span>
                          )}
                        </AnimatePresence>

                        <div className="flex items-center gap-2 font-bold mb-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isPaidTier
                                ? 'bg-gradient-to-br from-amber-400 to-[#ff5d4f] text-white'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            <TierCardIcon className="w-4 h-4" />
                          </div>
                          {isPaidTier ? 'Paid' : 'Free'}
                        </div>

                        <ul className="space-y-1.5 mb-4">
                          {PLAN_FEATURES[tier].included.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-xs text-gray-600">
                              <Check className="w-3.5 h-3.5 text-clean-accent shrink-0" />
                              {feature}
                            </li>
                          ))}
                          {PLAN_FEATURES[tier].locked.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-xs text-gray-300">
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        {isCurrentTier ? (
                          <span className="text-xs font-bold text-clean-accent">Current plan</span>
                        ) : billing?.stripeConfigured ? (
                          isPaidTier ? (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              disabled={billingBusy}
                              onClick={handleStripeUpgrade}
                              className="w-full text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 bg-clean-accent text-white hover:bg-clean-accent flex items-center justify-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              {billingBusy ? 'Redirecting…' : 'Upgrade with Stripe'}
                            </motion.button>
                          ) : (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              disabled={billingBusy}
                              onClick={handleManageBilling}
                              className="w-full text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 border border-gray-200 hover:bg-gray-50"
                            >
                              Cancel in billing portal
                            </motion.button>
                          )
                        ) : (
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            disabled={switchingPlan}
                            onClick={() => handlePlanSwitch(tier)}
                            className={`w-full text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 ${
                              isPaidTier
                                ? 'bg-clean-accent text-white hover:bg-clean-accent'
                                : 'border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {switchingPlan ? 'Switching...' : `Switch to ${isPaidTier ? 'Paid' : 'Free'}`}
                          </motion.button>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <h2 className="font-bold text-lg mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-clean-accent" /> Redeem admin code
                </h2>
                <p className="text-sm text-gray-500 mb-3">Got a secret code? Redeem it to unlock admin access.</p>
                <form onSubmit={handleRedeemCode} className="flex gap-2">
                  <input
                    value={redeemCodeInput}
                    onChange={(e) => setRedeemCodeInput(e.target.value)}
                    placeholder="Enter code"
                    aria-label="Admin code"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-clean-accent/30"
                  />
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.96 }}
                    disabled={redeeming || !redeemCodeInput.trim()}
                    className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 flex items-center gap-2"
                  >
                    {redeeming && <Loader2 className="w-4 h-4 animate-spin" />}
                    {redeeming ? 'Redeeming...' : 'Redeem'}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}