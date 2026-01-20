// EMERGENCY DEBUG TEST
// Paste this ENTIRE script into your browser console (F12)

console.log('=== FIREBASE DEBUG TEST ===');

// 1. Check Firebase config
console.log('Firebase Config:', {
    apiKey: 'AIzaSyC6EDtwoyKUfaYWp7injNFfyWq_YIqtW48',
    projectId: 'natzconsul'
});

// 2. Test if db object exists
console.log('Firestore DB object exists?', typeof db !== 'undefined');

// 3. Try a simple read operation
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

async function testFirestoreConnection() {
    console.log('--- Testing Firestore Connection ---');

    try {
        console.log('Attempting to read from bookings collection...');
        const querySnapshot = await getDocs(collection(db, "bookings"));
        console.log('✅ SUCCESS! Read operation worked.');
        console.log('Number of documents:', querySnapshot.size);

        querySnapshot.forEach((doc) => {
            console.log('Document ID:', doc.id);
            console.log('Document data:', doc.data());
        });

    } catch (error) {
        console.error('❌ FAILED! Error details:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Full error:', error);

        // Check specific error codes
        if (error.code === 'permission-denied') {
            console.error('🔴 PERMISSION DENIED - Rules are blocking access');
            console.error('This means:');
            console.error('1. Rules were not deployed correctly, OR');
            console.error('2. Rules have a syntax error, OR');
            console.error('3. Database is in wrong mode');
        } else if (error.code === 'unavailable') {
            console.error('🔴 UNAVAILABLE - Cannot reach Firestore');
        }
    }
}

// Run the test
testFirestoreConnection();

// 4. Check if Firestore is in the right region
console.log('--- Check Firebase Console ---');
console.log('Go to: https://console.firebase.google.com/project/natzconsul/firestore');
console.log('Verify:');
console.log('1. Database exists (not "Create database" button)');
console.log('2. Rules tab shows your rules');
console.log('3. Rules were published (check timestamp)');
