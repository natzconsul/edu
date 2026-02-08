# SendGrid Setup Guide

## Step 1: Create SendGrid Account (2 minutes)

1. Go to [https://signup.sendgrid.com/](https://signup.sendgrid.com/)
2. Sign up for a **free account**
3. Verify your email address
4. Complete the onboarding questions (select "Transactional emails")

---

## Step 2: Create API Key (2 minutes)

1. Once logged in, go to **Settings > API Keys** in the left sidebar
   - Direct link: [https://app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys)
2. Click **"Create API Key"**
3. Name it: `NATZ Consult Booking Emails`
4. Select **"Full Access"** (or at minimum "Mail Send" access)
5. Click **"Create & View"**
6. **COPY THE API KEY** (starts with `SG.`) - you won't see it again!

---

## Step 3: Verify Sender Email (IMPORTANT)

SendGrid requires you to verify the email address you'll send FROM:

1. Go to **Settings > Sender Authentication**
   - Direct link: [https://app.sendgrid.com/settings/sender_auth](https://app.sendgrid.com/settings/sender_auth)
2. Click **"Verify a Single Sender"**
3. Fill in the form:
   - **From Name:** NATZ Consult
   - **From Email Address:** info@natzconsult.com (or your preferred email)
   - **Reply To:** info@natzconsult.com
   - **Company Address:** (your business address)
4. Click **"Create"**
5. **Check your email** (info@natzconsult.com) for verification link
6. Click the verification link

---

## Step 4: Update Firebase Function

I'll update your `functions/index.js` to use SendGrid instead of EmailJS.

---

## Step 5: Add SendGrid API Key to .env

Add this line to `functions/.env`:

```
SENDGRID_API_KEY=SG.your_actual_api_key_here
```

---

## Step 6: Install SendGrid Package

Run this command in the `functions` directory:

```bash
cd functions
npm install @sendgrid/mail
cd ..
```

---

## Step 7: Deploy Updated Function

```bash
firebase deploy --only functions
```

---

## Benefits of SendGrid:

✅ **100 free emails/day** (vs EmailJS's 200/month)
✅ **No domain restrictions** - use with unlimited client projects
✅ **Better deliverability** - professional email service
✅ **Server-friendly** - designed for backend use
✅ **Scalable** - easy to upgrade if needed

---

## After Setup:

Test the payment flow and you should receive:
- Receipt email to customer
- Confirmation email to admin

Both emails will come from `info@natzconsult.com` (or whatever you verified).
