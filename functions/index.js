const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const emailjs = require("@emailjs/nodejs");
// Use process.env for configuration (requires .env file)
const stripe = require("stripe")(process.env.STRIPE_SECRET);

admin.initializeApp();
const db = admin.firestore();

/**
 * Creates a Stripe Checkout Session for a consultation booking.
 * Called from the frontend after a slot is tentatively reserved.
 */
exports.createStripeCheckout = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        try {
            const { bookingData } = req.body;

            if (!bookingData) {
                return res.status(400).send('Missing booking data');
            }

            // 1. Create Checkout Session with ALL booking data in metadata
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Education Strategy Consultation',
                                description: `30-minute session for ${bookingData.name}`,
                            },
                            unit_amount: 5000, // $50.00 in cents
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${req.headers.origin}/?payment_success=true`,
                cancel_url: `${req.headers.origin}/?payment_cancelled=true`,
                customer_email: bookingData.email,
                metadata: {
                    // Store ALL booking data in metadata
                    name: bookingData.name,
                    email: bookingData.email,
                    phone: bookingData.phone,
                    citizenship: bookingData.citizenship,
                    residence: bookingData.residence,
                    education: bookingData.education,
                    desired: bookingData.desired,
                    slotKey: bookingData.slotKey,
                    slotLabel: bookingData.slotLabel,
                    monthKey: bookingData.monthKey
                }
            });

            // 2. Return Session URL to frontend
            res.json({ url: session.url });

        } catch (error) {
            console.error("Stripe Checkout Error:", error);
            res.status(500).send('Internal Server Error');
        }
    });
});

/**
 * Stripe Webhook to handle asynchronous payment events.
 * Creates booking in Firestore AFTER successful payment.
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // Extract booking data from metadata
        const bookingData = {
            name: session.metadata.name,
            email: session.metadata.email,
            phone: session.metadata.phone,
            citizenship: session.metadata.citizenship,
            residence: session.metadata.residence,
            education: session.metadata.education,
            desired: session.metadata.desired,
            slotKey: session.metadata.slotKey,
            slotLabel: session.metadata.slotLabel,
            monthKey: session.metadata.monthKey,
            stripeSessionId: session.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp()
        };

        try {
            // Check if slot is still available (race condition check)
            const slotQuery = await db.collection('bookings')
                .where('slotKey', '==', bookingData.slotKey)
                .get();

            if (!slotQuery.empty) {
                // Slot was already booked by another user - REFUND
                console.log(`⚠️ Slot ${bookingData.slotKey} already booked. Refunding payment.`);

                // Refund the payment
                const paymentIntent = session.payment_intent;
                await stripe.refunds.create({
                    payment_intent: paymentIntent,
                    reason: 'duplicate'
                });

                console.log(`✅ Refund issued for session ${session.id}`);

                // Send refund notification email
                try {
                    await emailjs.send(
                        process.env.EMAILJS_SERVICE_ID,
                        process.env.EMAILJS_TEMPLATE_BOOKING,
                        {
                            to_emails: bookingData.email,
                            from_name: 'NATZ Consult',
                            from_email: bookingData.email,
                            phone: bookingData.phone,
                            citizenship: bookingData.citizenship,
                            residence: bookingData.residence,
                            education: bookingData.education,
                            desired: bookingData.desired,
                            slot: bookingData.slotLabel,
                            booked_at: new Date().toLocaleString('en-US', {
                                dateStyle: 'full',
                                timeStyle: 'short'
                            }),
                            status: 'REFUNDED - Slot was already booked'
                        },
                        {
                            publicKey: process.env.EMAILJS_PUBLIC_KEY,
                            privateKey: process.env.EMAILJS_PRIVATE_KEY
                        }
                    );
                    console.log(`📧 Refund email sent to ${bookingData.email}`);
                } catch (emailError) {
                    console.error(`⚠️ Failed to send refund email:`, emailError);
                }

                return res.json({ received: true, refunded: true });
            }

            // Slot is available - create booking
            await db.collection('bookings').add(bookingData);
            console.log(`✅ Booking created for ${bookingData.name} - Slot: ${bookingData.slotLabel}`);

            // Send confirmation email to ADMIN
            try {
                await emailjs.send(
                    process.env.EMAILJS_SERVICE_ID,
                    process.env.EMAILJS_TEMPLATE_BOOKING,
                    {
                        to_emails: 'natzconsul21@gmail.com, info@natzconsult.com',
                        from_name: bookingData.name,
                        from_email: bookingData.email,
                        phone: bookingData.phone,
                        citizenship: bookingData.citizenship,
                        residence: bookingData.residence,
                        education: bookingData.education,
                        desired: bookingData.desired,
                        slot: bookingData.slotLabel,
                        booked_at: new Date().toLocaleString('en-US', {
                            dateStyle: 'full',
                            timeStyle: 'short'
                        }),
                        status: 'PAID & CONFIRMED'
                    },
                    {
                        publicKey: process.env.EMAILJS_PUBLIC_KEY,
                        privateKey: process.env.EMAILJS_PRIVATE_KEY
                    }
                );
                console.log(`📧 Confirmation email sent to admin`);
            } catch (emailError) {
                console.error(`⚠️ Failed to send admin confirmation email:`, emailError);
            }

            // Send confirmation email to USER (Receipt)
            try {
                await emailjs.send(
                    process.env.EMAILJS_SERVICE_ID,
                    process.env.EMAILJS_TEMPLATE_BOOKING,
                    {
                        to_emails: bookingData.email, // Send to the user
                        from_name: 'NATZ Consult',
                        from_email: 'info@natzconsult.com',
                        phone: bookingData.phone,
                        citizenship: bookingData.citizenship,
                        residence: bookingData.residence,
                        education: bookingData.education,
                        desired: bookingData.desired,
                        slot: bookingData.slotLabel,
                        booked_at: new Date().toLocaleString('en-US', {
                            dateStyle: 'full',
                            timeStyle: 'short'
                        }),
                        status: 'PAYMENT RECEIVED - $50.00' // Receipt status
                    },
                    {
                        publicKey: process.env.EMAILJS_PUBLIC_KEY,
                        privateKey: process.env.EMAILJS_PRIVATE_KEY
                    }
                );
                console.log(`📧 Receipt email sent to user: ${bookingData.email}`);
            } catch (emailError) {
                console.error(`⚠️ Failed to send user receipt email:`, emailError);
            }

        } catch (error) {
            console.error(`❌ Error processing booking:`, error);
            return res.status(500).send('Database Error');
        }
    }

    res.json({ received: true });
});
