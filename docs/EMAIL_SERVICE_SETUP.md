# Email Service Setup Guide

## Email Service Provider: SendGrid

Read Master uses **SendGrid** for transactional and marketing emails.

### Why SendGrid?

- **Reliable Delivery**: Industry-leading deliverability rates
- **Rich API**: Comprehensive Node.js SDK
- **Email Templates**: Visual template editor + API templates
- **Analytics**: Open rates, click rates, bounce tracking
- **Webhooks**: Real-time event notifications
- **Generous Free Tier**: 100 emails/day free
- **Scale-Ready**: Handles millions of emails

### Alternative Providers Considered

- **Resend**: Modern, developer-friendly, but newer and less proven
- **AWS SES**: Cost-effective at scale, but complex setup
- **Mailgun**: Good option, but SendGrid has better templates
- **Postmark**: Excellent for transactional, limited marketing features

## Setup Instructions

### 1. Create SendGrid Account

1. Go to [https://signup.sendgrid.com/](https://signup.sendgrid.com/)
2. Sign up with your work email
3. Verify your email address
4. Complete the onboarding questionnaire

### 2. Domain Authentication

**Critical for deliverability!**

1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Add your domain (e.g., `readmaster.ai`)
4. Follow DNS setup instructions:
   - Add CNAME records to your DNS provider
   - Add TXT record for SPF
   - Add DKIM records
5. Wait for DNS propagation (up to 48 hours)
6. Verify in SendGrid dashboard

### 3. Create API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name: `Read Master Production` (or `Development`)
4. Select **Restricted Access**
5. Enable permissions:
   - **Mail Send**: Full Access
   - **Email Activity**: Read Access
   - **Template Engine**: Full Access
   - **Suppressions**: Read Access
   - **Stats**: Read Access
6. Copy the API key (you'll only see it once!)
7. Store securely in environment variables

### 4. Configure Environment Variables

Add to `.env`:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=no-reply@readmaster.ai
SENDGRID_FROM_NAME=Read Master
SENDGRID_WEBHOOK_SECRET=your_webhook_secret_here

# Email Settings
EMAIL_ENABLED=true
EMAIL_SEND_REAL_EMAILS=false # Set to true in production
```

Add to Vercel:
```bash
vercel env add SENDGRID_API_KEY
vercel env add SENDGRID_FROM_EMAIL
vercel env add SENDGRID_FROM_NAME
vercel env add SENDGRID_WEBHOOK_SECRET
```

### 5. Set Up Webhooks

Webhooks allow real-time tracking of email events (opens, clicks, bounces, etc.)

1. Go to **Settings** → **Mail Settings** → **Event Webhook**
2. Enable **Event Notification**
3. Set **HTTP POST URL**: `https://your-domain.com/api/email/webhook`
4. Select events to track:
   - ✅ Processed
   - ✅ Delivered
   - ✅ Opened
   - ✅ Clicked
   - ✅ Bounced
   - ✅ Dropped
   - ✅ Spam Report
   - ✅ Unsubscribe
5. **Enable Signed Event Webhook** (important for security!)
6. Copy the verification key → Store as `SENDGRID_WEBHOOK_SECRET`
7. Test webhook with SendGrid's test feature

### 6. Create Email Templates (Optional - for now)

SendGrid supports two types of templates:

**1. Dynamic Templates (Recommended)**
- Visual editor in SendGrid dashboard
- Handlebars syntax: `{{name}}`, `{{#if condition}}`
- Versioning and testing built-in

**2. Legacy Templates**
- HTML in codebase
- More flexible but harder to maintain

We'll start with code-based templates and migrate to Dynamic Templates later.

## Email Types

Read Master sends the following email types:

### Transactional Emails
- Welcome email (immediate)
- Password reset
- Email verification
- Book upload confirmation
- AI assessment results

### Onboarding Sequence
- Day 0: Welcome
- Day 1: Getting started guide
- Day 3: Feature discovery
- Day 7: First week check-in

### Engagement Emails
- Reading streak achievements
- Book completion celebrations
- Weekly progress summary
- Milestone achievements

### Re-engagement
- 3-day inactive reminder
- 7-day inactive tip
- 14-day inactive personalized recommendation
- 30-day inactive survey

### Conversion Emails
- Library limit reached (Free → Pro)
- AI limit reached (Free → Pro)
- Feature discovery (Pro features)
- Upgrade prompts

### Admin/System
- Error notifications
- Performance alerts
- Weekly analytics summary

## Rate Limits

**Free Tier:**
- 100 emails/day
- 40,000 emails first month

**Essential Plan ($19.95/mo):**
- 50,000 emails/month
- No daily sending limit

**Pro Plan ($89.95/mo):**
- 1.5M emails/month
- Advanced features

## Best Practices

### 1. Always Use Unsubscribe Links
```html
<a href="{{unsubscribe_url}}">Unsubscribe</a>
```

### 2. Personalize Emails
```javascript
{
  to: user.email,
  templateId: 'd-xyz',
  dynamicTemplateData: {
    name: user.firstName,
    bookTitle: book.title,
    readingStreak: user.streak
  }
}
```

### 3. Handle Bounces
- Hard bounces: Remove from list
- Soft bounces: Retry later
- Track suppression list

### 4. Monitor Deliverability
- Keep bounce rate < 2%
- Keep spam rate < 0.1%
- Monitor engagement (opens, clicks)

### 5. Respect User Preferences
- Honor unsubscribe immediately
- Allow granular email preferences
- Provide easy opt-in/opt-out

## Testing

### Development
```bash
EMAIL_SEND_REAL_EMAILS=false
# Emails are logged to console, not sent
```

### Staging
```bash
EMAIL_SEND_REAL_EMAILS=true
SENDGRID_FROM_EMAIL=staging@readmaster.ai
# Send to test addresses only
```

### Production
```bash
EMAIL_SEND_REAL_EMAILS=true
SENDGRID_FROM_EMAIL=no-reply@readmaster.ai
# Send to real users
```

## Troubleshooting

### Emails Not Sending
1. Check API key is valid
2. Verify domain authentication
3. Check SendGrid dashboard for errors
4. Review Activity Feed in SendGrid

### Low Open Rates
1. Check sender reputation
2. Improve subject lines
3. Send at optimal times
4. Ensure mobile-friendly

### High Bounce Rate
1. Verify email addresses at signup
2. Remove hard bounces
3. Clean email list regularly
4. Check DNS configuration

## Monitoring

Track these metrics in SendGrid dashboard:

- **Delivery Rate**: Should be > 95%
- **Open Rate**: Target 20-30% for marketing, 50%+ for transactional
- **Click Rate**: Target 2-5%
- **Bounce Rate**: Keep < 2%
- **Spam Reports**: Keep < 0.1%
- **Unsubscribe Rate**: Keep < 0.5%

## Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid Node.js Library](https://github.com/sendgrid/sendgrid-nodejs)
- [Email Best Practices](https://sendgrid.com/blog/email-best-practices/)
- [Deliverability Guide](https://sendgrid.com/resource/email-deliverability-guide/)

## Next Steps

1. ✅ Choose provider (SendGrid)
2. ⏳ Create SendGrid account
3. ⏳ Authenticate domain
4. ⏳ Get API key
5. ⏳ Install SDK: `pnpm add @sendgrid/mail`
6. ⏳ Create database models
7. ⏳ Build EmailService
8. ⏳ Set up webhook handler
9. ⏳ Create email templates
10. ⏳ Test thoroughly
