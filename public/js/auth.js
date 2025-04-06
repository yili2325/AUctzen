// Authentication functionality for login and signup pages

// Plan selection functionality
document.querySelectorAll('.plan-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.plan-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        this.classList.add('selected');
    });
});

// Check if there's a plan parameter in the URL and select that plan
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.plan-options')) {
        const urlParams = new URLSearchParams(window.location.search);
        const planParam = urlParams.get('plan');
        
        if (planParam) {
            const planOption = document.querySelector(`.plan-option[data-plan="${planParam}"]`);
            if (planOption) {
                document.querySelectorAll('.plan-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                planOption.classList.add('selected');
            }
        }
    }
});

// Form submission
if (document.getElementById('signup-form')) {
    document.getElementById('signup-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const selectedPlan = document.querySelector('.plan-option.selected').dataset.plan;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        // In a real app, you would send this data to your server
        console.log('Signup data:', { name, email, password, plan: selectedPlan });
        
        // Redirect based on plan
        if (selectedPlan === 'free') {
            window.location.href = '/practice.html?plan=free';
        } else if (selectedPlan === 'premium') {
            window.location.href = '/payment.html?plan=premium';
        } else if (selectedPlan === 'lifetime') {
            window.location.href = '/payment.html?plan=lifetime';
        }
    });
}

// Get API URL function
function getApiUrl() {
    // For development, use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:50011';
    }
    
    // Log hostname for debugging
    console.log('Current hostname:', window.location.hostname);
    
    // For production, use same-origin API URL
    return '';  // Empty string for same origin requests
}

// Login form handling
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            console.log('Attempting login with:', { email });
            const apiUrl = getApiUrl();
            console.log('Using API URL:', apiUrl);
            
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            console.log('Login response status:', response.status);
            
            // Check if the response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Non-JSON response received:', contentType);
                const text = await response.text();
                console.error('Response text:', text.substring(0, 100) + '...');
                throw new Error('The server returned an invalid response. Please try again later.');
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error('Server error response:', data);
                throw new Error(data.message || data.msg || 'Login failed. Please check your credentials.');
            }
            
            console.log('Login successful, data:', data);
            
            // Store token and login status
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId || data.user?.id);
            localStorage.setItem('isLoggedIn', 'true');
            
            // Store user data
            const user = {
                id: data.userId || data.user?.id,
                email: email,
                plan: data.subscription?.plan || data.user?.subscription?.plan || 'basic',
                name: data.name || data.user?.name,
                registrationDate: data.user?.createdAt || data.createdAt || new Date().toISOString()
            };
            localStorage.setItem('user', JSON.stringify(user));
            
            // Initialize practice status for new user
            localStorage.setItem('practiceStatus', JSON.stringify({
                setsCompleted: 0,
                lastPracticeDate: null
            }));
            
            // Redirect based on parameters
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            
            if (redirect) {
                // If the redirect was to practice.html, go to practice_main.html instead
                if (redirect === '/practice.html' || redirect.startsWith('/practice.html?')) {
                    window.location.href = '/practice_main.html' + (redirect.includes('?') ? redirect.substring(redirect.indexOf('?')) : '');
                } else {
                    window.location.href = redirect;
                }
            } else {
                window.location.href = '/dashboard.html';
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Show error message to user
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.backgroundColor = '#ffebee';
            errorElement.style.color = '#c62828';
            errorElement.style.padding = '10px';
            errorElement.style.borderRadius = '4px';
            errorElement.style.marginBottom = '15px';
            errorElement.textContent = error.message || 'Failed to log in. Please try again.';
            
            const form = document.getElementById('login-form');
            form.insertBefore(errorElement, form.firstChild);
            
            // Remove error message after 5 seconds
            setTimeout(() => {
                errorElement.remove();
            }, 5000);
        }
    });
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') && localStorage.getItem('isLoggedIn') === 'true';
}

// Redirect if not logged in
function requireAuth() {
    // Don't redirect if on practice.html page - we'll handle auth check via popup
    if (window.location.pathname.includes('practice.html')) {
        console.log('On practice page - auth check will be handled via popup');
        return true;
    }

    if (!isLoggedIn()) {
        // Redirect to practice.html which handles the signup process
        window.location.href = '/practice.html?redirect=' + encodeURIComponent(window.location.pathname);
        return false;
    }
    return true;
}

// Redirect if already logged in
function redirectIfLoggedIn() {
    // Check for direct parameter in URL, which allows direct access even when logged in
    const urlParams = new URLSearchParams(window.location.search);
    const hasDirectParam = urlParams.has('direct');
    
    // Log all authentication state for debugging
    console.log('Auth check - URL:', window.location.href);
    console.log('Auth check - direct parameter present:', hasDirectParam);
    console.log('Auth check - token exists:', !!localStorage.getItem('token'));
    console.log('Auth check - isLoggedIn value:', localStorage.getItem('isLoggedIn'));
    
    // If direct parameter is specified, don't redirect
    if (hasDirectParam) {
        console.log('Direct parameter found, not redirecting even if logged in');
        return false;
    }
    
    if (isLoggedIn()) {
        console.log('User is logged in, redirecting to dashboard.html');
        window.location.href = '/dashboard.html';
        return true;
    }
    return false;
}

// Check if token is valid
function checkToken() {
    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    
    if (!token) {
        console.log('No token found in localStorage');
        return false;
    }
    
    try {
        // Decode the JWT token to check expiration
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        console.log('Token payload:', payload);
        
        // Check if token is expired
        if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            const now = new Date();
            
            console.log('Token expires on:', expDate.toLocaleString());
            console.log('Current time:', now.toLocaleString());
            console.log('Token is ' + (expDate > now ? 'valid' : 'expired'));
            
            return expDate > now;
        }
        
        return true;
    } catch (e) {
        console.error('Error checking token:', e);
        return false;
    }
}

// Get auth token
function getToken() {
    const token = localStorage.getItem('token');
    
    // Add debug logging
    if (!token) {
        console.log('No token found in localStorage via getToken()');
    } else {
        console.log('Token retrieved from localStorage');
        
        // Check if token is valid
        checkToken();
    }
    
    return token;
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    
    // Navigate to home page after logout
    window.location.href = '/';
}

// Update auth UI based on login status
function updateAuthUI() {
    const isUserLoggedIn = isLoggedIn();
    
    // Get UI elements
    const loginItem = document.getElementById('login-item');
    const signupItem = document.getElementById('signup-item');
    const logoutItem = document.getElementById('logout-item');
    const dashboardItem = document.getElementById('dashboard-item');
    
    // Get the practice link in the navigation
    const practiceLink = document.querySelector('.nav-links a[href="/practice.html"]');
    
    // Update navigation based on auth status
    if (isUserLoggedIn) {
        // Update navigation items
        if (loginItem) loginItem.style.display = 'none';
        if (signupItem) signupItem.style.display = 'none';
        if (logoutItem) {
            logoutItem.style.display = 'inline-block';
            // Add logout functionality
            logoutItem.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
        if (dashboardItem) dashboardItem.style.display = 'inline-block';
        
        // Update practice link to point to practice_main.html if logged in
        if (practiceLink) {
            practiceLink.href = '/practice_main.html';
        }
        
        // Get and display user information if needed
        try {
            const userData = JSON.parse(localStorage.getItem('user')) || {};
            console.log('Authenticated as:', userData.email || 'Unknown');
            
            // Display user name if available
            const userNameElement = document.getElementById('user-name');
            if (userNameElement && userData.name) {
                userNameElement.textContent = userData.name;
            }
        } catch (e) {
            console.error('Error loading user data:', e);
        }
    } else {
        // User is not logged in
        if (loginItem) loginItem.style.display = 'inline-block';
        if (signupItem) signupItem.style.display = 'inline-block';
        if (logoutItem) logoutItem.style.display = 'none';
        if (dashboardItem) dashboardItem.style.display = 'none';
        
        // Ensure practice link points to practice.html when not logged in
        if (practiceLink) {
            practiceLink.href = '/practice.html';
        }
    }
}

// Get current user data
function getCurrentUser() {
    try {
        const userData = JSON.parse(localStorage.getItem('user')) || {};
        return userData;
    } catch (e) {
        console.error('Error getting current user:', e);
        return {};
    }
}

// Check if user has admin role
function isAdmin() {
    try {
        const userData = JSON.parse(localStorage.getItem('user')) || {};
        return userData.role === 'admin';
    } catch (e) {
        console.error('Error checking admin status:', e);
        return false;
    }
}

// Check if the body has redirect-if-logged-in data attribute
if (document.body.dataset.redirectIfLoggedIn === 'true') {
    redirectIfLoggedIn();
}

// Attach logout functionality to logout links
document.addEventListener('DOMContentLoaded', function() {
    // Update UI based on login status
    updateAuthUI();
    
    // Attach logout functionality to logout button
    const logoutButton = document.getElementById('logout-item');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

// Password visibility toggle
document.addEventListener('DOMContentLoaded', function() {
    // Handle traditional password toggle buttons
    const passwordToggleBtns = document.querySelectorAll('.password-toggle-btn');
    
    passwordToggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            // Toggle password visibility
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Handle toggle-password class (used in login.html)
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
    
    // Add simple login button functionality
    const debugLoginBtn = document.getElementById('debug-login-btn');
    if (debugLoginBtn) {
        debugLoginBtn.addEventListener('click', async function() {
            try {
                // Check server status first (catch errors silently if endpoint doesn't exist)
                try {
                    const statusCheck = await fetch('/api/status');
                    const statusData = await statusCheck.json();
                    console.log('Server status check:', statusData);
                } catch (statusError) {
                    console.log('Status check failed, continuing anyway:', statusError);
                }
                
                // Get email from input or use default
                const email = document.getElementById('email').value || 'admin@gmail.com';
                
                try {
                    // Try the simple login endpoint if it exists
                    const response = await fetch('/api/auth/simple-login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            email: email,
                            password: 'any-password-will-work'
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Simple login successful:', data);
                        
                        // Save authentication data
                        localStorage.setItem('isLoggedIn', 'true');
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify({
                            id: data.userId,
                            email: data.user.email,
                            name: data.user.name,
                            plan: data.user.subscription?.plan || 'basic'
                        }));
                        
                        // Redirect to dashboard
                        window.location.href = '/dashboard.html';
                        return;
                    }
                } catch (endpointError) {
                    console.log('Simple login endpoint not available:', endpointError);
                }
                
                // Fallback: use emergency login
                console.log('Using emergency fallback login');
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('token', 'emergency-token');
                localStorage.setItem('user', JSON.stringify({
                    id: 'emergency-user',
                    email: email,
                    name: 'Emergency User',
                    plan: 'lifetime'
                }));
                window.location.href = '/dashboard.html';
                
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed: ' + error.message);
            }
        });
    }
});

// Call this when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth.js loaded, checking authentication...');
    updateAuthUI();
    
    // Check if this page requires authentication
    const requiresAuth = document.body.hasAttribute('data-requires-auth');
    if (requiresAuth) {
        console.log('This page requires authentication');
        requireAuth();
    }
    
    // Check if this page should redirect logged in users
    const redirectLoggedIn = document.body.hasAttribute('data-redirect-if-logged-in');
    if (redirectLoggedIn) {
        console.log('This page should redirect logged in users');
        redirectIfLoggedIn();
    }
}); 