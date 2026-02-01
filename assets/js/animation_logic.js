
/**
 * Initialize the animated background with optimized performance
 * Loads 42 icons moving in a Perlin-like wave that converges at the center
 */
function initBackgroundAnimation() {
    const container = document.getElementById('animated-background-container');
    if (!container) return;

    // Configuration
    const ICON_COUNT = 42;
    const ICONS = [
        // Book
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>',
        // Graduation Cap
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" /></svg>',
        // Globe
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>',
        // Microscope (Science)
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M6 22h12a2 2 0 0 0 .5-3.99A2 2 0 0 0 18 18h-1V4a2 2 0 0 0-3.99-.25A2 2 0 0 0 13 4v1h-2V4a2 2 0 0 0-3.99-.25A2 2 0 0 0 7 4v14H6a2 2 0 0 0 .5 3.99A2 2 0 0 0 6 22z" /></svg>',
        // Atom (Physics)
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M20.2 17.6l-2.05-5.22c.67-1.12 1.34-2.23 2.05-3.34 1.3 2.03-2.98 5.66 0 8.56zM8.45 13.91l-1.63 2.5a8.96 8.96 0 0 1-1.95-6.85c.67.65 1.35 1.3 2.02 1.96.52.8 1.04 1.59 1.56 2.39zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /><circle cx="12" cy="12" r="3" /></svg>',
        // Pencil (Arts/Writing)
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" /></svg>',
        // Scroll (Generic)
        '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M14 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 0V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2h-8z"/></svg>'
    ];

    // Complementary Colors (Soft pastels/muted tones to not distract)
    // Blues, Cyans, Purples, Ambers, Emeralds, Roses, Pinks
    const COLORS = [
        'text-sky-400', 'text-indigo-400', 'text-emerald-400',
        'text-rose-400', 'text-amber-400', 'text-purple-400', 'text-pink-400'
    ];

    // Create particles
    const particles = [];

    for (let i = 0; i < ICON_COUNT; i++) {
        const div = document.createElement('div');
        div.className = `absolute will-change-transform opacity-30 ${COLORS[i % COLORS.length]}`;
        // 50% smaller -> w-4 h-4 to w-6 h-6 approx (standard was w-8)
        div.classList.add(i % 2 === 0 ? 'w-4 h-4' : 'w-5 h-5');
        div.innerHTML = ICONS[i % ICONS.length];

        container.appendChild(div);

        // Random properties for motion logic
        particles.push({
            element: div,
            x: Math.random() * 100, // 0-100vw
            speed: 0.05 + Math.random() * 0.1, // Moving Right
            yPhase: Math.random() * Math.PI * 2,
            yFreq: 0.02 + Math.random() * 0.03,
            yAmp: 10 + Math.random() * 20, // Base amplitude
            yCenterOffset: (Math.random() - 0.5) * 60 // Vertical spread around center line
        });
    }

    // Animation Loop
    function animate() {
        // Animation logic here to be moved to main app.js
        // Included here for reference of the logic structure
    }
}
