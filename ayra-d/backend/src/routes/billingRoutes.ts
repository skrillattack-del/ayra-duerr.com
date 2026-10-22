import { Router } from 'express';
import { prisma } from '../db/client';
import { authenticateJWT } from '../middleware/authMiddleware';
import { getStripe, isStripeConfigured } from '../services/stripeService';

const router: Router = Router();

function frontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
}

/**
 * GET /api/billing/status
 * Current billing state from the DB (webhook-truthful, not JWT-truthful).
 */
router.get('/status', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        membership_tier: true,
        subscription_status: true,
        current_period_end: true,
        cancel_at_period_end: true,
        stripe_customer_id: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      stripeConfigured: isStripeConfigured(),
      membership_tier: user.membership_tier,
      subscription_status: user.subscription_status,
      current_period_end: user.current_period_end,
      cancel_at_period_end: user.cancel_at_period_end,
      hasStripeCustomer: !!user.stripe_customer_id,
    });
  } catch (error) {
    console.error('Billing status error:', error);
    res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

/**
 * POST /api/billing/checkout
 * Creates a hosted Checkout Session for the PRO subscription → { url }.
 */
router.post('/checkout', authenticateJWT, async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Billing is not configured', code: 'BILLING_UNCONFIGURED' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, membership_tier: true, role: true, stripe_customer_id: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.membership_tier === 'PAID') {
      return res.status(409).json({ error: 'You already have a PRO membership' });
    }

    const stripe = getStripe();

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripe_customer_id: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      subscription_data: { metadata: { userId: user.id } },
      allow_promotion_codes: true,
      success_url: `${frontendUrl()}/dashboard/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl()}/dashboard/settings?checkout=cancelled`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to start checkout' });
  }
});

/**
 * POST /api/billing/portal
 * Creates a Billing Portal session for managing/cancelling → { url }.
 */
router.post('/portal', authenticateJWT, async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Billing is not configured', code: 'BILLING_UNCONFIGURED' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { stripe_customer_id: true },
    });
    if (!user?.stripe_customer_id) {
      return res.status(404).json({ error: 'No billing account found' });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${frontendUrl()}/dashboard/settings`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

export default router;
