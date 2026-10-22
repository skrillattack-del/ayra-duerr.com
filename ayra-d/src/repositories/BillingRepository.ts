import { apiClient } from '@/lib/apiClient'

export interface BillingStatus {
  stripeConfigured: boolean
  membership_tier: 'FREE' | 'PAID'
  subscription_status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED'
  current_period_end: string | null
  cancel_at_period_end: boolean
  hasStripeCustomer: boolean
}

export const BillingRepository = {
  async getStatus(): Promise<BillingStatus> {
    return apiClient.get<BillingStatus>('/api/billing/status')
  },

  /** Starts a hosted Checkout session and returns the redirect URL. */
  async createCheckout(): Promise<string> {
    const data = await apiClient.post<{ url: string }>('/api/billing/checkout')
    return data.url
  },

  /** Opens the Stripe Billing Portal and returns the redirect URL. */
  async openPortal(): Promise<string> {
    const data = await apiClient.post<{ url: string }>('/api/billing/portal')
    return data.url
  },
}

