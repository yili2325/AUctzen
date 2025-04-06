// Analytics tracking functions

// Initialize analytics
function initAnalytics() {
  // Enable debug mode in development
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  window.analyticsDebugMode = isLocalhost || 
                             window.location.search.includes('debug_analytics=true');
  
  // Check if Google Analytics is loaded
  if (typeof gtag === 'undefined') {
    console.warn('Google Analytics not loaded');
    
    // Create a fallback function that logs to console
    window.gtag = function() {
      console.log('Analytics call:', arguments);
    };
  }
  
  // If in debug mode, log all analytics calls
  if (window.analyticsDebugMode) {
    const originalGtag = window.gtag;
    window.gtag = function() {
      console.log('%c📊 Analytics Event:', 'color: #4285f4; font-weight: bold', ...arguments);
      return originalGtag.apply(this, arguments);
    };
    
    console.log('%c📊 Analytics Debug Mode Enabled', 'color: #4285f4; font-weight: bold; font-size: 14px');
  }
}

// Track signup events
function trackSignup(method, plan) {
  if (window.analyticsDebugMode) {
    console.log(`%c📊 Tracking signup: method=${method}, plan=${plan}`, 'color: #0f9d58');
  }
  
  // Send event to Google Analytics
  gtag('event', 'sign_up', {
    'method': method,
    'plan': plan
  });
  
  // You could also send to other analytics platforms here
}

// Track login events
function trackLogin(method) {
  gtag('event', 'login', {
    'method': method
  });
}

// Track subscription events
function trackSubscription(plan, price) {
  gtag('event', 'purchase', {
    'items': [{
      'id': plan,
      'name': `${plan} Plan`,
      'price': price
    }]
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAnalytics); 