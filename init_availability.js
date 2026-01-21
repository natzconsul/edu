// Firestore Availability Initialization Script
// Run this once to set up the availability schedule in Firestore
// Usage: node init_availability.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC6EDtwoyKUfaYWp7injNFfyWq_YIqtW48",
    authDomain: "natzconsul.firebaseapp.com",
    projectId: "natzconsul",
    storageBucket: "natzconsul.firebasestorage.app",
    messagingSenderId: "734592808171",
    appId: "1:734592808171:web:2625848980a2d0d8fbbaae"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Availability Schedule Configuration
// Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
// ranges: Array of [startHour, endHour] in 24-hour format
// Firestore doesn't support nested arrays, so we use objects instead
const availabilitySchedule = {
    0: { ranges: [] },                                              // Sunday: Closed
    1: { ranges: [{ start: 15, end: 16 }] },                       // Monday: 3:00 PM - 4:00 PM
    2: { ranges: [] },                                              // Tuesday: Closed
    3: { ranges: [{ start: 15, end: 16 }] },                       // Wednesday: 3:00 PM - 4:00 PM
    4: { ranges: [] },                                              // Thursday: Closed
    5: { ranges: [{ start: 10, end: 12 }, { start: 15, end: 16 }] }, // Friday: 10:00 AM - 12:00 PM, 3:00 PM - 4:00 PM
    6: { ranges: [] }                                               // Saturday: Closed
};

async function initializeAvailability() {
    try {
        console.log('Initializing availability schedule in Firestore...');

        const availabilityRef = doc(db, 'config', 'availability');
        await setDoc(availabilityRef, {
            schedule: availabilitySchedule,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        });

        console.log('✅ Availability schedule successfully initialized!');
        console.log('Schedule:', JSON.stringify(availabilitySchedule, null, 2));

    } catch (error) {
        console.error('❌ Error initializing availability:', error);
        throw error;
    }
}

// Run initialization
initializeAvailability()
    .then(() => {
        console.log('\n✅ Initialization complete!');
        console.log('You can now close this script.');
    })
    .catch((error) => {
        console.error('\n❌ Initialization failed:', error);
        process.exit(1);
    });
