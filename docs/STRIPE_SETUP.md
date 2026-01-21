# Stripe Payment Integration - Setup Guide

## Overview

Read Master uses Stripe for payment processing and subscription management. This guide covers the complete setup process.

## Table of Contents

1. [Stripe Account Setup](#stripe-account-setup)
2. [Product & Price Creation](#product--price-creation)
3. [Environment Variables](#environment-variables)
4. [Testing](#testing)
5. [Webhook Configuration](#webhook-configuration)
6. [Production Deployment](#production-deployment)

---

## Stripe Account Setup

### 1. Create a Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up for an account
3. Complete business profile (can be done later)

### 2. Get API Keys

1. In Stripe Dashboard, go to **Developers** > **API keys**
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Click **Reveal test key** and copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

---

## Product & Price Creation

### Create Pro Tier Product

1. In Stripe Dashboard, go to **Products**
2. Click **+ Add product**
3. Fill in details:
   - **Name**: `Read Master Pro`
   - **Description**: `Pro tier with advanced AI features, TTS downloads (5/month), and priority support`
   - **Pricing model**: `Recurring`
   - **Price**: `$9.99 USD` (or your preferred amount)
   - **Billing period**: `Monthly`
4. Click **Save product**
5. **Copy the Price ID** (looks like `price_1ABC...` or `price_abc123...`)
6. Save this as your `STRIPE_PRO_PRICE_ID`

### Create Scholar Tier Product

1. Click **+ Add product**
2. Fill in details:
   - **Name**: `Read Master Scholar`
   - **Description**: `Scholar tier with all Pro features plus unlimited TTS downloads, ElevenLabs voices, and premium support`
   - **Pricing model**: `Recurring`
   - **Price**: `$29.99 USD` (or your preferred amount)
   - **Billing period**: `Monthly`
3. Click **Save product**
4. **Copy the Price ID**
5. Save this as your `STRIPE_SCHOLAR_PRICE_ID`

### Optional: Add Annual Plans

For each tier:

1. Go to the product page
2. Click **Add another price**
3. Set:
   - **Price**: Annual rate (e.g., $99/year for Pro)
   - **Billing period**: `Yearly`
4. Click **Add price**
5. Copy the new Price ID for annual plans

---

## Environment Variables

### Development (.env.local)

```bash
# Stripe API Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs (from product creation above)
STRIPE_PRO_PRICE_ID=price_1ABC123...
STRIPE_SCHOLAR_PRICE_ID=price_1XYZ789...

# Optional: Annual Price IDs
STRIPE_PRO_ANNUAL_PRICE_ID=price_1DEF456...
STRIPE_SCHOLAR_ANNUAL_PRICE_ID=price_1GHI012...
```

### Production (Vercel Environment Variables)

In Vercel Dashboard:

1. Go to **Settings** > **Environment Variables**
2. Add the same variables but with **production** keys:
   - Use `sk_live_...` for `STRIPE_SECRET_KEY`
   - Use production Price IDs
   - Add `STRIPE_PUBLISHABLE_KEY` for frontend (starts with `pk_live_`)

---

## Testing

### Test Cards

Stripe provides test cards for development:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Success (default) |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0069` | Expired card |

**For all test cards:**
- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

### Test Mode vs. Live Mode

- **Test mode**: Uses `sk_test_` keys, charges are not real
- **Live mode**: Uses `sk_live_` keys, charges are real money

Toggle between modes in Stripe Dashboard (top left).

---

## Webhook Configuration

### 1. Set Up Webhook Endpoint

#### Local Development (Using Stripe CLI)

1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to http://localhost:3000/api/payments/webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`)
5. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

#### Production (Vercel)

1. In Stripe Dashboard, go to **Developers** > **Webhooks**
2. Click **+ Add endpoint**
3. Enter your production URL:
   ```
   https://your-domain.com/api/payments/webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.updated`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

### 2. Webhook Events

Our webhook handler (`/api/payments/webhook`) listens for:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update user subscription, upgrade tier |
| `customer.subscription.created` | Set user tier, log subscription start |
| `customer.subscription.updated` | Update tier if plan changes |
| `customer.subscription.deleted` | Downgrade user to FREE tier |
| `invoice.payment_succeeded` | Log payment, track revenue |
| `invoice.payment_failed` | Send payment failed notification |

---

## Production Deployment

### Pre-Launch Checklist

- [ ] Products created in **Live mode** (not Test mode)
- [ ] Environment variables set in Vercel with `sk_live_` keys
- [ ] Webhook endpoint added in Live mode
- [ ] Test a full payment flow in production with a real card
- [ ] Verify user tier is updated correctly after payment
- [ ] Verify webhook events are received and processed
- [ ] Verify customer portal works (manage subscription, update payment method)
- [ ] Set up email notifications for failed payments
- [ ] Review Stripe's tax settings if applicable
- [ ] Enable automatic tax calculation if selling in multiple regions

### Monitoring

1. **Stripe Dashboard**:
   - Monitor payments in **Payments** tab
   - Track subscriptions in **Subscriptions** tab
   - View webhook logs in **Developers** > **Webhooks**

2. **Sentry**:
   - Payment errors are logged to Sentry
   - Webhook processing failures are tracked

3. **Analytics**:
   - Revenue is tracked in DailyAnalytics
   - Subscription events are logged in AuditLog

---

## Pricing Recommendations

### Suggested Tier Pricing

| Tier | Monthly | Annual | Savings |
|------|---------|--------|---------|
| **Free** | $0 | $0 | - |
| **Pro** | $9.99 | $99/year | ~17% |
| **Scholar** | $29.99 | $299/year | ~17% |

### Considerations

- **Free tier**: Basic features to hook users
- **Pro tier**: For serious readers ($10/month is common for productivity tools)
- **Scholar tier**: For power users and professionals (3x Pro tier)
- **Annual discount**: 15-20% off encourages annual commitment
- **Student discount**: Consider offering 50% off with edu email verification

---

## Feature Gating by Tier

| Feature | Free | Pro | Scholar |
|---------|------|-----|---------|
| Books | 10 | Unlimited | Unlimited |
| AI Pre-Reading Guides | 5/month | Unlimited | Unlimited |
| AI Comprehension Checks | 10/month | Unlimited | Unlimited |
| SRS Flashcards | 100 cards | Unlimited | Unlimited |
| TTS Voice | Web Speech API | OpenAI Voices | ElevenLabs Premium |
| TTS Downloads | ❌ | 5/month | Unlimited |
| Social Features | ✅ | ✅ | ✅ |
| Offline Reading | ✅ | ✅ | ✅ |
| Annotations | ✅ | ✅ | ✅ |
| Themes | 3 themes | All themes | All themes + Custom |
| Reading Analytics | Basic | Advanced | Advanced + Export |
| Priority Support | ❌ | ✅ | ✅ + 1-on-1 |

---

## Common Issues

### "No such price: price_..."

- **Issue**: Price ID not found
- **Solution**: Double-check the Price ID copied from Stripe Dashboard matches the environment variable

### "No such customer: cus_..."

- **Issue**: Customer doesn't exist in Stripe
- **Solution**: Ensure customer is created during checkout session

### Webhook signature verification failed

- **Issue**: Invalid webhook secret
- **Solution**: Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard

### Payment succeeded but tier not upgraded

- **Issue**: Webhook not processed correctly
- **Solution**: Check Stripe webhook logs and Sentry for errors

---

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

## Support

For issues with Stripe integration:

1. Check Stripe Dashboard logs
2. Check Sentry for errors
3. Review webhook event logs in Stripe Dashboard
4. Contact Stripe support for account-specific issues

**Last Updated:** January 21, 2026
