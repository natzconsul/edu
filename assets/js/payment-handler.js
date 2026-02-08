// Check for payment success/cancellation on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('payment_success') === 'true') {
        const type = urlParams.get('type') || 'booking';
        // Show success modal
        showPaymentSuccessModal(type);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('payment_cancelled') === 'true') {
        // Show cancellation message
        showPaymentCancelledModal();
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

function showPaymentSuccessModal(type) {
    const amount = type === 'intake' ? '$581.69 CAD' : '$115.64 CAD';
    const serviceName = type === 'intake' ? 'Intake Application' : 'Consultation';

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-slate-900 border border-brand-sky/30 rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div class="text-center space-y-6">
                <!-- Success Icon -->
                <div class="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                    <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                
                <!-- Title -->
                <h2 class="text-2xl md:text-3xl font-black text-white">Payment Successful!</h2>
                
                <!-- Message -->
                <div class="space-y-3 text-slate-300">
                    <p class="text-lg font-medium">Thank you for your payment of <span class="text-brand-sky font-bold">${amount}</span></p>
                    <p class="text-sm">Your ${serviceName} has been confirmed. You will receive a receipt email shortly with all the details.</p>
                    <p class="text-xs text-slate-400">Please check your spam folder if you don't see it within a few minutes.</p>
                </div>
                
                <!-- Close Button -->
                <button onclick="this.closest('.fixed').remove()" 
                    class="w-full bg-brand-sky hover:bg-brand-sky/90 text-brand-dark font-bold py-3 px-6 rounded-xl transition-all">
                    Got it!
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showPaymentCancelledModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div class="text-center space-y-6">
                <!-- Warning Icon -->
                <div class="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                    <svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                
                <!-- Title -->
                <h2 class="text-2xl md:text-3xl font-black text-white">Payment Cancelled</h2>
                
                <!-- Message -->
                <div class="space-y-3 text-slate-300">
                    <p class="text-lg font-medium">Your payment was cancelled.</p>
                    <p class="text-sm">No charges were made. Feel free to try booking again when you're ready.</p>
                </div>
                
                <!-- Close Button -->
                <button onclick="this.closest('.fixed').remove()" 
                    class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all">
                    Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
