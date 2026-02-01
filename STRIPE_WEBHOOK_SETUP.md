# Stripe Webhook Setup Instructions

## Step 1: Go to Stripe Dashboard
1. Open [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click **Developers** in the top navigation
3. Click **Webhooks** in the left sidebar

## Step 2: Add New Endpoint
1. Click the **"Add endpoint"** button (or **"Test in test mode"** if using test keys)
2. **Endpoint URL**: Paste this exact URL:
   ```
   https://us-central1-natzconsult.cloudfunctions.net/stripeWebhook
   ```

## Step 3: Select Events
1. Click **"Select events"**
2. Search for and check: **`checkout.session.completed`**
3. Click **"Add events"**

## Step 4: Create Endpoint
1. Click **"Add endpoint"** at the bottom
2. **IMPORTANT**: After creation, you'll see a **"Signing secret"** (starts with `whsec_...`)
3. Click **"Reveal"** or **"Copy"** to get the secret

## Step 5: Update Your .env File
1. Open `functions/.env`
2. Replace the placeholder with your actual webhook secret:
   ```
   STRIPE_SECRET=sk_live_YOUR_ACTUAL_SECRET_HERE
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
   ```

## Step 6: Redeploy Functions
```bash
firebase deploy --only functions
```

## Step 7: Deploy Frontend
```bash
firebase deploy
```

---

## Testing
Once everything is deployed, you can test by:
1. Going to your website
2. Clicking "Book a Consultation"
3. Selecting a slot
4. You should be redirected to Stripe Checkout
5. After payment, the booking status should automatically update to "paid" in Firestore
