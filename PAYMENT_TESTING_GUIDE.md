# Payment Testing Troubleshooting Guide

## Issue: No booking in Firestore, no email receipt after payment

### Root Causes:
1. **Stripe Webhook Not Configured** - The webhook needs to be set up in Stripe Dashboard
2. **Missing Success URL Handler** - ✅ FIXED (added payment-handler.js)

---

## ✅ COMPLETED FIXES

### 1. Added Payment Success/Cancellation Handler
- Created `assets/js/payment-handler.js`
- Added script to `index.html`
- Now shows modal feedback after Stripe redirects back

---

## 🔧 REQUIRED: Configure Stripe Webhook

### Step 1: Go to Stripe Dashboard
1. Open [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"** button

### Step 2: Add Webhook Endpoint
**Endpoint URL:**
```
https://us-central1-natzconsult.cloudfunctions.net/stripeWebhook
```

**Events to select:**
- ✅ `checkout.session.completed`

### Step 3: Get Webhook Signing Secret
1. After creating the endpoint, click on it
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)

### Step 4: Update Environment Variable
1. Open `functions/.env`
2. Update the `STRIPE_WEBHOOK_SECRET` line:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
   ```

### Step 5: Redeploy Functions
```bash
firebase deploy --only functions
```

---

## 🧪 Testing After Webhook Setup

### Test Flow:
1. Go to http://localhost:8081
2. Click "Book Consultation"
3. Fill out the form
4. Select a time slot
5. Click "Proceed to Payment"
6. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`
7. Complete payment

### Expected Results:
✅ Redirected back to your site
✅ Success modal appears showing "$10.00 CAD (TEST MODE)"
✅ Booking appears in Firestore `bookings` collection
✅ Receipt email sent to customer
✅ Confirmation email sent to admin (natzconsul21@gmail.com, info@natzconsult.com)

---

## 🔍 Debugging

### Check Firebase Function Logs:
```bash
firebase functions:log --only stripeWebhook
```

### Check Stripe Webhook Logs:
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click on your endpoint
3. Check "Events" tab for recent attempts
4. Look for any errors

### Common Issues:
- **401 Unauthorized**: Webhook secret is incorrect
- **500 Error**: Check Firebase function logs
- **No webhook calls**: Endpoint URL is wrong or webhook not configured

---

## 📝 Current Configuration

**Price:** $10.00 CAD (TEST MODE)
**Currency:** CAD
**Stripe Function:** https://us-central1-natzconsult.cloudfunctions.net/createStripeCheckout
**Webhook Function:** https://us-central1-natzconsult.cloudfunctions.net/stripeWebhook

---

## ⚠️ Remember

After testing is complete, change the price back to production:
```javascript
unit_amount: 11564, // $115.64 CAD (includes $100 base + $12 tax + Stripe fees)
```

And update the receipt status:
```javascript
status: 'PAYMENT RECEIVED - $115.64 CAD (incl. tax & fees)'
```
