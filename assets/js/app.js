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

    // EmailJS Configuration
    EMAILJS_PUBLIC_KEY: 'b5nfTFmqBkaKNpwDv',
    EMAILJS_SERVICE_ID: 'service_yx8uz9g',
    EMAILJS_TEMPLATE_BOOKING: 'template_4ttjwc7',
    EMAILJS_TEMPLATE_INTAKE: 'template_cmavibh',

    // Validation
    MAX_NAME_LENGTH: 100,
    MIN_PHONE_LENGTH: 10,
    MAX_PHONE_LENGTH: 20
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
    grid.innerHTML = '<div class="col-span-7 py-8 text-center text-slate-500 animate-pulse">Loading availability...</div>';
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
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-white hover:bg-slate-700 hover:text-brand-sky'
            } ${selectedDate && date.getTime() === selectedDate.getTime()
                ? 'bg-brand-sky text-brand-dark hover:bg-brand-sky hover:text-brand-dark shadow-lg shadow-brand-sky/20'
                : ''
            }`;

        if (!isPast && hasSlots) {
            cell.onclick = () => selectDate(date);
            // Indicator for availability
            const dot = document.createElement('div');
            dot.className = 'absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-slate-600';
            if (selectedDate && date.getTime() === selectedDate.getTime()) dot.classList.add('bg-brand-dark');
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
                btn.className = "py-3 px-4 rounded-xl border border-slate-700 hover:border-brand-sky text-slate-300 hover:text-brand-sky text-sm font-bold transition-all bg-slate-800/50 hover:bg-slate-800";
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
    const citizenship = sanitizeInput(document.getElementById('bk_citizenship').value);
    const residence = sanitizeInput(document.getElementById('bk_residence').value);
    const education = document.getElementById('bk_education_level').value;
    const desired = sanitizeInput(document.getElementById('bk_desired').value);

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
        showMessage('error', 'Please fill out all required fields');
        return;
    }

    submitBtn.innerText = 'SECURING SLOT...';
    submitBtn.disabled = true;

    try {
        // Extract year and month from the slot date for indexing
        const slotDate = selectedSlot.dateObj || new Date(selectedSlot.label.split(' at ')[0]);
        const monthKey = `${slotDate.getFullYear()}-${slotDate.getMonth()}`;

        // CRITICAL: Check if slot is still available (race condition prevention)
        submitBtn.innerText = 'CHECKING AVAILABILITY...';
        const slotQuery = query(
            collection(db, "bookings"),
            where("slotKey", "==", selectedSlot.key)
        );
        const existingBookings = await getDocs(slotQuery);

        if (!existingBookings.empty) {
            // Slot was just booked by another user
            showMessage('error', 'This slot was just booked by another user. Please select a different time.');
            bookedSlots.add(selectedSlot.key); // Update local cache
            await fetchBookings(currentMonth); // Refresh all bookings
            renderCalendar(); // Update UI
            backToCalendar(); // Return to calendar view
            return;
        }

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
            monthKey: monthKey,
            bookedAt: Timestamp.now()
        };

        // 1. Save to Firestore to block the slot
        submitBtn.innerText = 'SECURING SLOT...';
        await addDoc(collection(db, "bookings"), bookingData);

        // 2. Add to local set immediately for feedback
        bookedSlots.add(selectedSlot.key);

        // 3. Send email notification via EmailJS
        submitBtn.innerText = 'SENDING CONFIRMATION...';
        try {
            await emailjs.send(
                CONFIG.EMAILJS_SERVICE_ID,
                CONFIG.EMAILJS_TEMPLATE_BOOKING,
                {
                    to_emails: CONFIG.CONTACT_EMAILS.join(', '),
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
                    })
                },
                CONFIG.EMAILJS_PUBLIC_KEY
            );

            showMessage('success', 'Booking confirmed! NATZ Consult will contact you soon.');
        } catch (emailError) {
            console.error('Email notification error:', emailError);
            // Still show success since booking was saved to Firestore
            showMessage('warning', 'Booking saved! Email notification pending. We will contact you soon.');
        }

        closeBookingModal();
        // Refresh to ensure we have latest state
        await fetchBookings(currentMonth);
        renderCalendar();

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
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});


function switchTab(id) {
    // Content Mapping: separate content for home and about
    const contentMap = {
        'home': 'content-home',
        'about': 'content-about',
        'pathway': 'content-pathway'
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
    // We check all possible nav IDs
    const navIds = ['nav-home', 'nav-about', 'nav-pathway', 'nav-contact'];
    navIds.forEach(navId => {
        const el = document.getElementById(navId);
        if (el) {
            // A nav item is active if its ID matches 'nav-' + the clicked id
            el.classList.toggle('tab-active', navId === 'nav-' + id);

            // Special handling for the initial load or edge cases could go here
        }
    });

    // Update Hero dynamically (only if not contact)
    if (id !== 'contact') {
        const heroHeading = document.getElementById('hero-heading');
        const heroTagline = document.getElementById('hero-tagline');
        const heroButtons = document.querySelector('.hero-buttons');
        const heroSection = document.querySelector('header');

        // Hide buttons and reduce height on pathway and about pages
        if (id === 'pathway' || id === 'about') {
            if (heroButtons) heroButtons.classList.add('hidden');
            if (heroSection) {
                heroSection.classList.remove('min-h-[50vh]');
                heroSection.classList.add('min-h-[25vh]');
            }
        } else {
            // Show buttons and restore height on home page
            if (heroButtons) heroButtons.classList.remove('hidden');
            if (heroSection) {
                heroSection.classList.remove('min-h-[25vh]');
                heroSection.classList.add('min-h-[50vh]');
            }
        }

        if (id === 'pathway') {
            heroHeading.textContent = 'Your Journey to Academic Success';
            heroTagline.textContent = 'A clear, guided path from application to arrival.';
        } else if (id === 'about') {
            heroHeading.textContent = 'Empowering Global Educational Opportunity and Excellence';
            heroTagline.textContent = 'Strategic consultancy for international students';
        } else {
            heroHeading.textContent = 'Empowering Global Educational Opportunity and Excellence';
            heroTagline.textContent = 'Strategic consultancy for international students';
        }
    }
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
        await emailjs.send(
            CONFIG.EMAILJS_SERVICE_ID,
            CONFIG.EMAILJS_TEMPLATE_INTAKE,
            {
                to_emails: CONFIG.CONTACT_EMAILS.join(', '),
                from_name: formData.name,
                from_email: formData.email,
                phone: formData.phone,
                country: formData.country,
                address: formData.address,
                emergency_name: formData.emergencyName,
                emergency_phone: formData.emergencyPhone,
                program: formData.program,
                docs: formData.docs,
                link: formData.link,
                details: formData.details
            },
            CONFIG.EMAILJS_PUBLIC_KEY
        );

        showMessage('success', 'Application submitted! NATZ Consult will reach you soon.');
        document.getElementById('consult-form').reset();
    } catch (emailError) {
        console.error('Email error:', emailError);
        showMessage('error', 'Failed to submit application. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
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

document.addEventListener('DOMContentLoaded', async () => {
    // Load availability schedule from Firestore
    const firestoreLoaded = await loadAvailabilityFromFirestore();

    // Notify user if using fallback schedule
    if (!firestoreLoaded) {
        showMessage('warning', 'Using offline schedule. Availability may not be up-to-date. Please refresh if you encounter issues.');
    }

    // Initialize UI
    document.getElementById('current-year').innerText = new Date().getFullYear();
    document.getElementById('other_means_checkbox')?.addEventListener('change', (e) => {
        document.getElementById('other_means_details').classList.toggle('hidden', !e.target.checked);
    });
    document.getElementById('consult-form').addEventListener('submit', handleFormSubmit);

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
