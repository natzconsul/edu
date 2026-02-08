const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const Stripe = require("stripe");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

/**
 * Configure response headers for CORS
 */
function setCorsHeaders(req, res) {
    const allowedOrigins = [
        'https://natzconsult.com',
        'https://www.natzconsult.com',
        'https://natzconsult.web.app',
        'https://natzconsult.firebaseapp.com',
        'http://localhost:3000',
        'http://localhost:8081',
        'http://127.0.0.1:8081'
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
}

/**
 * AI Assistant System Prompt
 */
const SYSTEM_PROMPT = `
You are the NATZ Consult AI Assistant. Your goal is to help international students (especially from West Africa) achieve their dreams of studying in Canada.
You are professional, encouraging, and highly knowledgeable about Canadian education.

**Key Knowledge:**
1. **NATZ Consult:** Founded by Gabriel Sofekun, an ISTQB-certified QA professional and ICEF (CCG) expert.
2. **Core Services:** 
   - Strategic Education Consulting for Top University Admissions.
   - Personalized Application Strategy & Career Pathway Planning.
   - Guidance on Study Permits (IRCC), Accommodation, and Arrival.
   - Software QA & Tech Solutions for small businesses.
3. **Availability:** We offer strategy sessions ($100 CAD) and Intake processing ($500 CAD).
4. **Canadian Advantage:** High quality of life, post-study work permits (PGWP), and diverse academic landscape.

**Instructions:**
- Keep responses concise (under 3 or 4 sentences where possible).
- If asked about specific legal immigration advice, state that you are an education consultant, not a lawyer, and point them to IRCC resources.
- Always encourage students to book a consultation for personalized strategy.
- Your tone should be "Expert Consultant meets Friendly Guide".
`;

/**
 * AI Assistant Cloud Function
 */
exports.natzAiAssistant = functions.runWith({ secrets: ['GEMINI_API_KEY'] }).https.onRequest(async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Missing question' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Missing GEMINI_API_KEY environment variable");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Simple chat logic (stateless for now, but could be expanded)
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
                { role: "model", parts: [{ text: "Understood. I am the NATZ Consult AI Assistant, ready to help students with their Canadian education journey." }] }
            ],
            generationConfig: {
                maxOutputTokens: 250,
            },
        });

        const result = await chat.sendMessage(question);
        const response = await result.response;
        const text = response.text();

        return res.json({ answer: text });

    } catch (error) {
        console.error("AI Assistant Error:", error);
        return res.status(500).json({ error: "I'm having trouble thinking right now. Please try again or use the WhatsApp button to chat with our team." });
    }
});

/**
 * Lazy-initialize Stripe
 */
function getStripe() {
    const secret = process.env.STRIPE_SECRET;
    if (!secret) {
        throw new Error("Missing STRIPE_SECRET environment variable");
    }
    return new Stripe(secret);
}

/**
 * Lazy-initialize SendGrid
 */
function initSendGrid() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        throw new Error("Missing SENDGRID_API_KEY environment variable");
    }
    sgMail.setApiKey(apiKey);
}

/**
 * Helper function to send emails via SendGrid
 */
async function sendEmail({ to, subject, html }) {
    try {
        initSendGrid();
        const msg = {
            to: to,
            from: 'info@natzconsult.com',
            subject: subject,
            html: html
        };
        await sgMail.send(msg);
        console.log(`📧 Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error(`⚠️ Failed to send email to ${to}:`, error);
        return false;
    }
}

/**
 * Creates a Stripe Checkout Session
 */
exports.createStripeCheckout = functions.https.onRequest(async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { type, data } = req.body;
        if (!type || !data) {
            return res.status(400).json({ error: 'Missing type or data' });
        }

        const stripe = getStripe();
        let sessionConfig = {
            payment_method_types: ['card'],
            mode: 'payment',
            success_url: `${req.headers.origin}/?payment_success=true&type=${type}`,
            cancel_url: `${req.headers.origin}/?payment_cancelled=true&type=${type}`,
            customer_email: data.email,
        };

        if (type === 'booking') {
            sessionConfig.line_items = [{
                price_data: {
                    currency: 'cad',
                    product_data: {
                        name: 'Education Strategy Consultation',
                        description: `30-minute session for ${data.name}`,
                    },
                    unit_amount: 11564, // $115.64 CAD ($100 + tax + fees)
                },
                quantity: 1,
            }];
            sessionConfig.metadata = {
                type: 'booking',
                ...data
            };
        } else if (type === 'intake') {
            sessionConfig.line_items = [{
                price_data: {
                    currency: 'cad',
                    product_data: {
                        name: 'Intake Process Application',
                        description: `Application fee for ${data.name}`,
                    },
                    unit_amount: 58169, // $581.69 CAD ($500 + tax + fees)
                },
                quantity: 1,
            }];
            sessionConfig.metadata = {
                type: 'intake',
                ...data
            };
        } else {
            return res.status(400).json({ error: 'Invalid payment type' });
        }

        console.log(`Creating ${type} checkout for ${data.email}`);
        const session = await stripe.checkout.sessions.create(sessionConfig);
        return res.json({ url: session.url });

    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Stripe Webhook
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
        console.error("Missing STRIPE_WEBHOOK_SECRET");
        return res.status(500).send("Server configuration error");
    }

    let event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const type = session.metadata.type;

        if (type === 'booking') {
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
                const slotQuery = await db.collection('bookings')
                    .where('slotKey', '==', bookingData.slotKey)
                    .get();

                if (!slotQuery.empty) {
                    console.log(`⚠️ Slot already booked. Refunding.`);
                    const stripe = getStripe();
                    await stripe.refunds.create({ payment_intent: session.payment_intent });

                    await sendEmail({
                        to: bookingData.email,
                        subject: 'Booking Refund - NATZ Consult',
                        html: `<p>Dear ${bookingData.name}, the slot was already booked. You have been refunded.</p>`
                    });
                    return res.json({ received: true, refunded: true });
                }

                await db.collection('bookings').add(bookingData);

                await sendEmail({
                    to: ['natzconsul21@gmail.com', 'info@natzconsult.com'],
                    subject: `New Booking - ${bookingData.name}`,
                    html: `<h2>New Booking</h2><p>${bookingData.name} booked ${bookingData.slotLabel}</p>`
                });

                await sendEmail({
                    to: bookingData.email,
                    subject: 'Booking Confirmed - NATZ Consult',
                    html: `<p>Thank you ${bookingData.name}! Your consultation for ${bookingData.slotLabel} is confirmed.</p>`
                });

            } catch (error) {
                console.error(`❌ Error processing booking:`, error);
                return res.status(500).send('Internal Error');
            }
        } else if (type === 'intake') {
            const intakeData = {
                name: session.metadata.name,
                email: session.metadata.email,
                phone: session.metadata.phone,
                country: session.metadata.country,
                address: session.metadata.address,
                emergencyName: session.metadata.emergencyName,
                emergencyPhone: session.metadata.emergencyPhone,
                program: session.metadata.program,
                docs: session.metadata.docs,
                link: session.metadata.link,
                details: session.metadata.details,
                stripeSessionId: session.id,
                paidAt: admin.firestore.FieldValue.serverTimestamp()
            };

            try {
                await db.collection('applications').add(intakeData);

                await sendEmail({
                    to: ['natzconsul21@gmail.com', 'info@natzconsult.com'],
                    subject: `New Intake Application - ${intakeData.name}`,
                    html: `<h2>New Intake Application</h2><ul><li><strong>Name:</strong> ${intakeData.name}</li><li><strong>Email:</strong> ${intakeData.email}</li></ul>`
                });

                await sendEmail({
                    to: intakeData.email,
                    subject: 'Application Received - NATZ Consult',
                    html: `<p>Thank you ${intakeData.name}! Your intake application has been received and paid. We will review it shortly.</p>`
                });

            } catch (error) {
                console.error(`❌ Error processing intake:`, error);
                return res.status(500).send('Internal Error');
            }
        }
    }

    return res.json({ received: true });
});

/**
 * Handles intake form submissions (Legacy - now we use Stripe)
 */
exports.submitIntake = functions.https.onRequest(async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    return res.status(410).send('Gone. Now handled via Stripe Checkout.');
});
