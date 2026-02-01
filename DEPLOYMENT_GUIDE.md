# Deployment Guide: Stripe Integration (Option B)

## 1. Prerequisites
- **Stripe Account**: You need a stripe account.
- **Firebase Blaze Plan**: Your project must be on the Blaze plan (Pay-as-you-go).

## 2. Configuration (.env)
We will use a `.env` file to securely store your keys. This avoids the error you saw with the deprecated command.

1.  Navigate to the `functions` folder:
    `cd functions`
2.  Create a new file named `.env`.
3.  Paste the following content into it (replacing with your actual keys):

```text
STRIPE_SECRET=sk_test_YOUR_ACTUAL_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET
```

*(Note: You can get the `STRIPE_SECRET` from your Stripe Dashboard now. You can add the `STRIPE_WEBHOOK_SECRET` later after creating the webhook endpoint, for now just put a placeholder if you don't have it).*

## 3. Deploy Cloud Functions
Now deploy the functions. Since we fixed `firebase.json`, this command will now work.

**Make sure you are in the root directory** (run `cd ..` if you are still inside `functions`).

```bash
# Execute from the root functionality (c:\Users\user\.gemini\antigravity\scratch\edu)
firebase deploy --only functions
```

**IMPORTANT**: After successful deployment, the terminal will show you the **Function URL** for `createStripeCheckout`. It will look like:
`https://us-central1-natzconsult.cloudfunctions.net/createStripeCheckout`

## 4. Update Frontend Config
1. Copy the Function URL from the previous step.
2. Open `assets/js/app.js`.
3. Find `STRIPE_FUNCTION_URL` inside `CONFIG`.
4. Paste your actual URL there.

## 5. Setup Stripe Webhook
1. Go to **Stripe Dashboard > Developers > Webhooks**.
2. Click **Add Endpoint**.
3. **Endpoint URL**: `https://us-central1-natzconsult.cloudfunctions.net/stripeWebhook` (Replace with your actual project region/ID if different).
4. **Events to send**: Select `checkout.session.completed`.
5. Click **Add endpoint**.
6. **Copy the Signing Secret** (`whsec_...`) for this endpoint.
7. Update your `functions/.env` file with this new secret.
8. Redeploy functions to apply the secure config:
   ```bash
   firebase deploy --only functions
   ```

## 6. Final Deploy
Deploy your updated frontend.

```bash
firebase deploy
```
