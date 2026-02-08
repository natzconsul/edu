// Firebase Configuration (Placeholders)
// TODO: Replace with your actual project keys
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, Timestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC6EDtwoyKUfaYWp7injNFfyWq_YIqtW48",
    authDomain: "natzconsult.firebaseapp.com",
    projectId: "natzconsult",
    storageBucket: "natzconsult.firebasestorage.app",
    messagingSenderId: "734592808171",
    appId: "1:734592808171:web:2625848980a2d0d8fbbaae"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configuration
const CONFIG = {
    // Email recipients (both will receive notifications)
    CONTACT_EMAILS: ['natzconsul@gmail.com', 'info@natzconsult.com'],

    // Validation Constants
    MAX_NAME_LENGTH: 100,
    MIN_PHONE_LENGTH: 10,
    MAX_PHONE_LENGTH: 20,

    // Cloud Function URLs
    STRIPE_FUNCTION_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'https://us-central1-natzconsult.cloudfunctions.net/createStripeCheckout'
        : '/api/createStripeCheckout',
    AI_FUNCTION_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'https://us-central1-natzconsult.cloudfunctions.net/natzAiAssistant'
        : '/api/natzAiAssistant'
};

// Validation Helper Functions
function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const cleanPhone = phone.replace(/[\s()-]/g, '');
    return cleanPhone.length >= CONFIG.MIN_PHONE_LENGTH && cleanPhone.length <= CONFIG.MAX_PHONE_LENGTH;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
}

function validateName(name) {
    return name.length > 0 && name.length <= CONFIG.MAX_NAME_LENGTH;
}

let currentMonth = new Date();
let selectedDate = null;
let selectedSlot = null;

// DB for booked slots (Set of strings "YYYY-MM-DD-HH-mm")
const bookedSlots = new Set();

// Availability schedule - loaded from Firestore on app initialization
// Fallback schedule used if Firestore fetch fails
// Note: Using objects instead of nested arrays (Firestore limitation)
let AVAILABILITY = {
    1: { ranges: [{ start: 15, end: 16 }] },                       // Monday: 3:00 PM - 4:00 PM
    2: { ranges: [] },                                              // Tuesday: Closed
    3: { ranges: [{ start: 15, end: 16 }] },                       // Wednesday: 3:00 PM - 4:00 PM
    4: { ranges: [] },                                              // Thursday: Closed
    5: { ranges: [{ start: 10, end: 12 }, { start: 15, end: 16 }] }, // Friday: 10:00 AM - 12:00 PM, 3:00 PM - 4:00 PM
    0: { ranges: [] },                                              // Sunday: Closed
    6: { ranges: [] }                                               // Saturday: Closed
};

// Fetch availability schedule from Firestore
async function loadAvailabilityFromFirestore() {
    try {
        const availabilityRef = doc(db, 'config', 'availability');
        const availabilityDoc = await getDoc(availabilityRef);

        if (availabilityDoc.exists()) {
            const data = availabilityDoc.data();
            if (data.schedule) {
                AVAILABILITY = data.schedule;
                console.log('✅ Availability schedule loaded from Firestore');
                return true;
            }
        }

        console.warn('⚠️ No availability schedule found in Firestore, using fallback');
        return false;
    } catch (error) {
        console.error('❌ Error loading availability from Firestore:', error);
        console.warn('⚠️ Using fallback availability schedule');
        return false;
    }
}

function openIntakeModal() {
    const modal = document.getElementById('intake-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Focus first focusable element for accessibility
    setTimeout(() => {
        const firstInput = modal.querySelector('input, select, textarea, button');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeIntakeModal() {
    const modal = document.getElementById('intake-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

async function openBookingModal() {
    const modal = document.getElementById('booking-modal');
    modal.classList.remove('hidden');
    await fetchBookings(currentMonth); // Fetch latest slots
    renderCalendar();

    // Focus first focusable element for accessibility
    setTimeout(() => {
        const firstButton = modal.querySelector('button');
        if (firstButton) firstButton.focus();
    }, 100);
}

async function fetchBookings(date) {
    bookedSlots.clear();
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthKey = `${year}-${month}`;

    try {
        // Simplified query - fetch all bookings and filter client-side
        // This avoids needing a Firestore index
        const querySnapshot = await getDocs(collection(db, "bookings"));

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Filter by monthKey client-side
            if (data.slotKey && data.monthKey === monthKey) {
                bookedSlots.add(data.slotKey);
            }
        });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        showMessage('error', 'Unable to load availability. Please refresh.');
    }
}

function closeBookingModal() {
    document.getElementById('booking-modal').classList.add('hidden');
    // Reset state
    selectedDate = null;
    selectedSlot = null;
    document.getElementById('booking-step-1').classList.remove('hidden');
    document.getElementById('booking-step-2').classList.add('hidden');
    document.getElementById('time-slots-container').classList.add('hidden');
    document.getElementById('booking-form').reset();
}

async function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    // Fetch bookings for the new month before rendering
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '<div class="col-span-7 py-8 text-center text-[#1E3A8A] animate-pulse">Loading availability...</div>';
    await fetchBookings(currentMonth);
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('current-month-label');

    grid.innerHTML = '';
    label.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Empty cells for padding
    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const isPast = date < today;
        const hasSlots = AVAILABILITY[dayOfWeek] && AVAILABILITY[dayOfWeek].ranges.length > 0;

        const cell = document.createElement('button');
        cell.textContent = day;
        cell.className = `p-3 rounded-lg text-sm font-bold transition-all relative ${isPast || !hasSlots
            ? 'text-[#0EA5E9]/40 cursor-not-allowed'
            : 'text-[#1E3A8A] hover:bg-blue-50 hover:text-[#1E3A8A]'
            } ${selectedDate && date.getTime() === selectedDate.getTime()
                ? 'bg-[#1E3A8A] text-white hover:bg-[#1E3A8A] hover:text-white shadow-lg shadow-brand-sky/20'
                : ''
            }`;

        if (!isPast && hasSlots) {
            cell.onclick = () => selectDate(date);
            // Indicator for availability
            const dot = document.createElement('div');
            // Change dot color based on selection state
            const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
            dot.className = `absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-sky'}`;
            cell.appendChild(dot);
        } else {
            cell.disabled = true;
        }

        grid.appendChild(cell);
    }
}

function selectDate(date) {
    selectedDate = date;
    renderCalendar(); // Re-render to show active state

    const label = document.getElementById('selected-date-label');
    label.textContent = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    label.className = "text-[#1E3A8A] ml-2";

    document.getElementById('time-slots-container').classList.remove('hidden');
    generateSlots(date);
}

function generateSlots(date) {
    const container = document.getElementById('slots-grid');
    container.innerHTML = '';

    const dayOfWeek = date.getDay();
    const config = AVAILABILITY[dayOfWeek];

    if (!config) return;

    config.ranges.forEach(range => {
        // Handle both old array format [[start, end]] and new object format {start, end}
        const startHour = Array.isArray(range) ? range[0] : range.start;
        const endHour = Array.isArray(range) ? range[1] : range.end;

        for (let h = startHour; h < endHour; h++) {
            // Create :00 and :30 slots
            [0, 30].forEach(minutes => {
                // Create simpler key for demo: "YYYY-MM-DD-HH-mm"
                const slotKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${h}-${minutes}`;

                // Check if booked
                if (bookedSlots.has(slotKey)) return;

                const timeLabel = new Date(0, 0, 0, h, minutes).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const btn = document.createElement('button');
                btn.textContent = timeLabel;
                btn.className = "py-3 px-4 rounded-xl border border-blue-200 hover:border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50 text-sm font-bold transition-all bg-white";
                btn.onclick = () => {
                    selectedSlot = { key: slotKey, label: `${date.toLocaleDateString()} at ${timeLabel}`, dateObj: date };
                    document.getElementById('confirm-slot-label').textContent = selectedSlot.label;
                    document.getElementById('booking-step-1').classList.add('hidden');
                    document.getElementById('booking-step-2').classList.remove('hidden');
                };
                container.appendChild(btn);
            });
        }
    });
}

function backToCalendar() {
    document.getElementById('booking-step-1').classList.remove('hidden');
    document.getElementById('booking-step-2').classList.add('hidden');
}

document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    // Collect and sanitize form data
    const name = sanitizeInput(document.getElementById('bk_name').value);
    const email = document.getElementById('bk_email').value.trim();
    const phone = document.getElementById('bk_phone').value.trim();
    const citizenship = document.getElementById('bk_citizenship').value; // Dropdown value
    const residence = document.getElementById('bk_residence').value; // Dropdown value
    const education = document.getElementById('bk_education_level').value;
    const desired = document.getElementById('bk_desired').value; // Dropdown value

    // Client-side validation (matches Firestore security rules)
    if (!validateName(name)) {
        showMessage('error', 'Please enter a valid name (1-100 characters)');
        return;
    }

    if (!validateEmail(email)) {
        showMessage('error', 'Please enter a valid email address');
        return;
    }

    if (!validatePhone(phone)) {
        showMessage('error', `Phone number must be ${CONFIG.MIN_PHONE_LENGTH}-${CONFIG.MAX_PHONE_LENGTH} characters`);
        return;
    }

    if (!citizenship || !residence || !education || !desired) {
        showMessage('error', 'Please select all required fields');
        return;
    }

    submitBtn.innerText = 'SECURING SLOT...';
    submitBtn.disabled = true;

    try {
        // Extract year and month from the slot date for indexing
        const slotDate = selectedSlot.dateObj || new Date(selectedSlot.label.split(' at ')[0]);
        const monthKey = `${slotDate.getFullYear()}-${slotDate.getMonth()}`;

        const bookingData = {
            name: name,
            email: email,
            phone: phone,
            citizenship: citizenship,
            residence: residence,
            education: education,
            desired: desired,
            slotKey: selectedSlot.key,
            slotLabel: selectedSlot.label,
            monthKey: monthKey
        };


        // Initiate Stripe Checkout
        submitBtn.innerText = 'REDIRECTING TO PAYMENT...';


        try {
            const response = await fetch(CONFIG.STRIPE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'booking',
                    data: bookingData
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create payment session');
            }

            const session = await response.json();

            // Redirect to Stripe (booking created after successful payment)
            window.location.href = session.url;

        } catch (paymentError) {
            console.error('Payment initialization failed:', paymentError);
            showMessage('error', 'Unable to initialize payment. Please try again.');
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }

    } catch (error) {
        console.error("Booking Error: ", error);

        // Provide more specific error messages
        if (error.code === 'permission-denied') {
            showMessage('error', 'Booking validation failed. Please check all fields.');
        } else if (error.code === 'unavailable') {
            showMessage('error', 'Network error. Please check your connection.');
        } else {
            showMessage('error', 'Could not reserve slot. Please try again.');
        }
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});


function switchTab(id) {
    // Content Mapping: separate content for home and about
    const contentMap = {
        'home': 'content-home',
        'about': 'content-about',
        'pathway': 'content-pathway',
        'tech': 'content-tech'
    };

    const targetContent = contentMap[id] || 'content-about';
    const footer = document.getElementById('contact');
    const mainContent = document.getElementById('tab-content');
    const heroSection = document.querySelector('header');

    // Handle Contact Tab
    if (id === 'contact') {
        // Hide main content and hero
        if (mainContent) mainContent.classList.add('hidden');
        if (heroSection) heroSection.classList.add('hidden');
        // Show footer
        if (footer) {
            footer.classList.remove('hidden');
            // Smooth scroll to footer
            setTimeout(() => footer.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    } else {
        // Show main content and hero
        if (mainContent) mainContent.classList.remove('hidden');
        if (heroSection) heroSection.classList.remove('hidden');
        // Hide footer
        if (footer) footer.classList.add('hidden');

        // 1. Update Content Visibility
        // We get all unique content IDs from the map values to ensure we toggle all
        const allContentIds = [...new Set(Object.values(contentMap))];
        allContentIds.forEach(contentId => {
            const el = document.getElementById(contentId);
            if (el) {
                el.classList.toggle('hidden', contentId !== targetContent);
            }
        });
    }

    // 2. Update Nav Highlights
    const navIds = ['nav-home', 'nav-about', 'nav-pathway', 'nav-tech', 'nav-contact'];
    navIds.forEach(navId => {
        const el = document.getElementById(navId);
        if (el) {
            el.classList.toggle('tab-active', navId === 'nav-' + id);
        }
    });

    // 3. Update Hero dynamically
    const heroHeading = document.getElementById('hero-heading');
    const heroTagline = document.getElementById('hero-tagline');
    const badgeIconText = document.getElementById('badge-icon-text');
    const badgeLabel = document.getElementById('badge-label');
    const intakeBtn = document.getElementById('intake-btn');

    if (id === 'tech') {
        if (badgeIconText) badgeIconText.textContent = 'ISTQB';
        if (badgeLabel) badgeLabel.textContent = 'Certified QA';
        if (intakeBtn) intakeBtn.classList.add('hidden');
    } else {
        if (badgeIconText) badgeIconText.textContent = 'ICEF';
        if (badgeLabel) badgeLabel.textContent = 'Certified Agent';
        if (intakeBtn) intakeBtn.classList.remove('hidden');
    }

    // No need to manage hero visibility - it's now part of home page content
}

function showMessage(type, content) {
    const box = document.getElementById('message-box');
    const messageContent = document.getElementById('message-content');
    box.classList.remove('hidden', 'bg-brand-dark', 'border-brand-sky', 'text-brand-sky', 'border-rose-500', 'text-rose-500', 'border-amber-500', 'text-amber-500', 'translate-y-20');

    if (type === 'success') {
        box.classList.add('bg-brand-dark', 'border-brand-sky', 'text-brand-sky');
        messageContent.innerHTML = `<svg class="w-6 h-6 mr-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg><span>${content}</span>`;
    } else if (type === 'warning') {
        box.classList.add('bg-brand-dark', 'border-amber-500', 'text-amber-500');
        messageContent.innerHTML = `<svg class="w-6 h-6 mr-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg><span>${content}</span>`;
    } else {
        box.classList.add('bg-brand-dark', 'border-rose-500', 'text-rose-500');
        messageContent.innerHTML = `<svg class="w-6 h-6 mr-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg><span>${content}</span>`;
    }

    setTimeout(() => box.classList.remove('translate-y-20'), 50);
    setTimeout(() => {
        box.classList.add('translate-y-20');
        setTimeout(() => box.classList.add('hidden'), 500);
    }, 6000);
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerText;

    // Collect and sanitize form data
    const name = sanitizeInput(document.getElementById('client_name').value);
    const email = document.getElementById('client_email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const country = document.getElementById('country').value;
    const address = sanitizeInput(document.getElementById('address').value);
    const emergencyName = sanitizeInput(document.getElementById('emergency_name').value);
    const emergencyPhone = document.getElementById('emergency_phone').value.trim();
    const program = document.querySelector('input[name="program"]:checked')?.value || 'Not Specified';
    const docs = Array.from(document.querySelectorAll('input[name="doc_list"]:checked')).map(c => c.value).join(', ');
    const link = document.getElementById('document_link').value.trim();
    const details = document.getElementById('other_means_checkbox').checked ? sanitizeInput(document.getElementById('other_means_details').value) : 'N/A';

    // Client-side validation
    if (!validateName(name)) {
        showMessage('error', 'Please enter a valid name (1-100 characters)');
        return;
    }

    if (!validateEmail(email)) {
        showMessage('error', 'Please enter a valid email address');
        return;
    }

    if (!validatePhone(phone)) {
        showMessage('error', `Phone number must be ${CONFIG.MIN_PHONE_LENGTH}-${CONFIG.MAX_PHONE_LENGTH} characters`);
        return;
    }

    if (!validatePhone(emergencyPhone)) {
        showMessage('error', 'Emergency contact phone number is invalid');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'SUBMITTING APPLICATION...';

    const formData = {
        name: name,
        email: email,
        phone: phone,
        country: country,
        address: address,
        emergencyName: emergencyName,
        emergencyPhone: emergencyPhone,
        program: program,
        docs: docs,
        link: link,
        details: details
    };

    try {
        const response = await fetch(CONFIG.STRIPE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'intake',
                data: formData
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to create payment session');
        }

        const session = await response.json();
        window.location.href = session.url;

    } catch (error) {
        console.error('Submission error:', error);
        showMessage('error', 'Failed to initialize payment. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

// AI Assistant UI Logic
function toggleAIChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    chatWindow.classList.toggle('hidden');
    if (!chatWindow.classList.contains('hidden')) {
        const input = document.getElementById('ai-chat-input');
        if (input) input.focus();
    }
}

async function handleAISubmit(event) {
    event.preventDefault();
    const input = document.getElementById('ai-chat-input');
    const messagesContainer = document.getElementById('ai-chat-messages');
    const question = input.value.trim();

    if (!question) return;

    // Add User Message
    addMessageToUI('user', question);
    input.value = '';

    // Add Loading State
    const loadingId = addMessageToUI('bot', 'AI is thinking...', true);

    try {
        const response = await fetch(CONFIG.AI_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: question }),
        });

        if (!response.ok) {
            throw new Error('AI Service unavailable');
        }

        const data = await response.json();
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) {
            loadingMsg.innerHTML = data.answer.replace(/\n/g, '<br>');
            loadingMsg.classList.remove('animate-pulse');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

    } catch (error) {
        console.error("AI Assistant Error:", error);
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) {
            loadingMsg.innerHTML = "I'm having a little trouble connecting to my brain. Please try again or reach out to our team via WhatsApp for immediate help!";
            loadingMsg.classList.remove('animate-pulse');
        }
    }
}

function addMessageToUI(sender, text, isLoading = false) {
    const container = document.getElementById('ai-chat-messages');
    const id = 'msg-' + Date.now();
    const isBot = sender === 'bot';

    const msgHtml = `
        <div class="flex gap-3 ${isBot ? '' : 'flex-row-reverse animate-in slide-in-from-right-5'}">
            <div class="w-8 h-8 rounded-lg ${isBot ? 'bg-purple-600/20 border-purple-500/20' : 'bg-brand-sky border-brand-sky'} flex items-center justify-center shrink-0 border">
                ${isBot
            ? '<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>'
            : '<svg class="w-4 h-4 text-brand-dark" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>'
        }
            </div>
            <div id="${id}" class="${isBot ? 'bg-slate-800/50 border-slate-700/50' : 'bg-purple-600 text-white border-purple-500'} p-4 rounded-2xl ${isBot ? 'rounded-tl-none' : 'rounded-tr-none'} border text-sm leading-relaxed max-w-[80%] ${isLoading ? 'animate-pulse' : ''}">
                ${text}
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', msgHtml);
    container.scrollTop = container.scrollHeight;
    return id;
}

// Expose functions to global scope for inline HTML handlers
// This MUST happen before DOMContentLoaded to ensure onclick handlers work
window.switchTab = switchTab;
window.openIntakeModal = openIntakeModal;
window.closeIntakeModal = closeIntakeModal;
window.openBookingModal = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.changeMonth = changeMonth;
window.backToCalendar = backToCalendar;
window.toggleAIChat = toggleAIChat;
window.handleAISubmit = handleAISubmit;
// Note: openMobileMenu and closeMobileMenu are defined in inline script in index.html


document.addEventListener('DOMContentLoaded', async () => {
    // Load availability schedule from Firestore
    const firestoreLoaded = await loadAvailabilityFromFirestore();

    // Notify user if using fallback schedule
    if (!firestoreLoaded) {
        showMessage('warning', 'Using offline schedule. Availability may not be up-to-date. Please refresh if you encounter issues.');
    }


    // Initialize UI
    // Ensure we start at the top of the page (fixes occasional load-at-bottom issue)
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // Ensure Home is the default active tab
    switchTab('home');
    document.getElementById('current-year').innerText = new Date().getFullYear();
    document.getElementById('other_means_checkbox')?.addEventListener('change', (e) => {
        document.getElementById('other_means_details').classList.toggle('hidden', !e.target.checked);
    });
    document.getElementById('consult-form').addEventListener('submit', handleFormSubmit);

    // ===========================
    // NAVIGATION EVENT LISTENERS (CSP Compliant)
    // ===========================

    // Logo click - navigate to home and scroll to top
    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
        logoHome.addEventListener('click', () => {
            switchTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Navigation menu items
    const navHome = document.getElementById('nav-home');
    if (navHome) {
        navHome.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('home');
        });
    }

    const navPathway = document.getElementById('nav-pathway');
    if (navPathway) {
        navPathway.addEventListener('click', () => switchTab('pathway'));
    }

    const navTech = document.getElementById('nav-tech');
    if (navTech) {
        navTech.addEventListener('click', () => switchTab('tech'));
    }

    const navAbout = document.getElementById('nav-about');
    if (navAbout) {
        navAbout.addEventListener('click', () => switchTab('about'));
    }

    const navContact = document.getElementById('nav-contact');
    if (navContact) {
        navContact.addEventListener('click', () => switchTab('contact'));
    }

    // Modal trigger buttons
    const intakeBtn = document.getElementById('intake-btn');
    if (intakeBtn) {
        intakeBtn.addEventListener('click', openIntakeModal);
    }

    const bookingBtn = document.getElementById('booking-btn');
    if (bookingBtn) {
        bookingBtn.addEventListener('click', openBookingModal);
    }

    // Side and Mobile Buttons
    const sideBookingBtn = document.getElementById('side-booking-btn');
    if (sideBookingBtn) sideBookingBtn.addEventListener('click', openBookingModal);

    const sideIntakeBtn = document.getElementById('side-intake-btn');
    if (sideIntakeBtn) sideIntakeBtn.addEventListener('click', openIntakeModal);

    const mobileBookingBtn = document.getElementById('mobile-booking-btn');
    if (mobileBookingBtn) mobileBookingBtn.addEventListener('click', openBookingModal);

    const mobileIntakeBtn = document.getElementById('mobile-intake-btn');
    if (mobileIntakeBtn) mobileIntakeBtn.addEventListener('click', openIntakeModal);

    // Keyboard navigation: ESC key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
            const bookingModal = document.getElementById('booking-modal');
            const intakeModal = document.getElementById('intake-modal');

            if (!bookingModal.classList.contains('hidden')) {
                closeBookingModal();
            } else if (!intakeModal.classList.contains('hidden')) {
                closeIntakeModal();
            }
        }
    });
});

// Start animation only after everything (including images) is fully loaded
window.addEventListener('load', () => {
    // Small delay to ensure rendering is settled
    setTimeout(() => {
        const heroContainer = document.querySelector('.hero-scroll-container');
        if (heroContainer) {
            heroContainer.classList.add('hero-scroll-active');
        }
    }, 100);

    // Initialize background icons
    setTimeout(initBackgroundAnimation, 1000);
});

/**
 * Initialize 42 animated icons moving in a converging wave pattern
 */
function initBackgroundAnimation() {
    const container = document.getElementById('animated-background-container');
    if (!container) return;

    const ICON_COUNT = 400; // Increased to 400
    // 7 Educational Icons
    const ICONS = [
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>', // Book
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" /></svg>', // Cap
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>', // Globe
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M6 22h12a2 2 0 0 0 .5-3.99A2 2 0 0 0 18 18h-1V4a2 2 0 0 0-3.99-.25A2 2 0 0 0 13 4v1h-2V4a2 2 0 0 0-3.99-.25A2 2 0 0 0 7 4v14H6a2 2 0 0 0 .5 3.99A2 2 0 0 0 6 22z" /></svg>', // Microscope
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M20.2 17.6l-2.05-5.22c.67-1.12 1.34-2.23 2.05-3.34 1.3 2.03-2.98 5.66 0 8.56zM8.45 13.91l-1.63 2.5a8.96 8.96 0 0 1-1.95-6.85c.67.65 1.35 1.3 2.02 1.96.52.8 1.04 1.59 1.56 2.39zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /><circle cx="12" cy="12" r="3" /></svg>', // Atom
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" /></svg>', // Pencil
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M14 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 0V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2h-8z"/></svg>' // Scroll
    ];
    // Complementary Colors
    const COLORS = [
        'text-sky-400', 'text-indigo-400', 'text-emerald-400',
        'text-rose-400', 'text-amber-400', 'text-purple-400', 'text-cyan-400'
    ];

    const particles = [];
    const baseY = 35; // Moved up to center better with larger spread
    let time = 0;

    for (let i = 0; i < ICON_COUNT; i++) {
        const div = document.createElement('div');
        // Increased from w-0.5 h-0.5 (2px) to 3px for 50% increase
        div.className = `absolute will-change-transform opacity-70 ${COLORS[i % COLORS.length]} w-[3px] h-[3px]`;
        div.innerHTML = ICONS[i % ICONS.length];

        container.appendChild(div);

        particles.push({
            element: div,
            x: Math.random() * 120 - 10,
            seed: Math.random() * 1000,
            speed: (0.01 + Math.random() * 0.02),
            yOffset: (Math.random() - 0.5) * 60, // Increased spread to 60 (1.5x)
            phase: Math.random() * Math.PI * 2,
            freq: 0.01 + Math.random() * 0.02
        });
    }

    function animate() {
        time += 0.005;
        particles.forEach(p => {
            // Update X
            p.x += p.speed;
            if (p.x > 110) p.x = -10;

            // Convergence Logic
            const distFromCenter = Math.abs(p.x - 50) / 50;
            const spreadFactor = Math.max(0.1, Math.pow(distFromCenter, 1.2));

            // 2D Noise-like wave motion (Sum of sines for organic feel)
            const noise = (
                Math.sin(p.x * p.freq + time + p.phase) * 6 +
                Math.sin(p.x * 0.05 + time * 0.5 + p.seed) * 4
            );

            // Final Y
            const y = baseY + noise + (p.yOffset * spreadFactor);

            p.element.style.transform = `translate3d(${p.x}vw, ${y}vh, 0)`;
        });

        requestAnimationFrame(animate);
    }

    animate();
}
