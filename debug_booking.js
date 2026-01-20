// Quick debug test - paste this in browser console after opening the booking modal

// Test the validation functions
console.log('Testing validation functions:');
console.log('Email valid?', validateEmail('natsofekun@gmail.com'));
console.log('Phone valid?', validatePhone('3334444555'));
console.log('Name valid?', validateName('jhf'));

// Test data that will be sent
const testData = {
    name: 'jhf',
    email: 'natsofekun@gmail.com',
    phone: '3334444555',
    citizenship: 'ury',
    residence: 'dgdfg',
    education: 'High School',
    desired: 'dghgdfg',
    slotKey: '2026-0-20-8-0',
    slotLabel: '2026-01-20 at 08:00',
    monthKey: '2026-0',
    bookedAt: new Date()
};

console.log('Test data:', testData);

// Try to create a booking manually
import { collection, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const testBooking = async () => {
    try {
        const bookingData = {
            ...testData,
            bookedAt: Timestamp.now()
        };
        console.log('Attempting to create booking:', bookingData);
        const docRef = await addDoc(collection(db, "bookings"), bookingData);
        console.log('✅ SUCCESS! Document written with ID:', docRef.id);
    } catch (error) {
        console.error('❌ ERROR:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    }
};

// Run the test
testBooking();
