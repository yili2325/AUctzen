// Function to toggle password visibility (global scope)
function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleButton = passwordInput.nextElementSibling;
    const icon = toggleButton.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Global variable to track selected plan
let selectedPlan = null;

function selectPlan(plan) {
    console.log('Plan selected:', plan);
    selectedPlan = plan;
    
    // Update UI to show selected plan
    document.querySelectorAll('.plan-option').forEach(card => {
        if (card.getAttribute('data-plan') === plan) {
            card.classList.add('selected');
            
            // Show the indicator
            const indicator = card.querySelector('.plan-selected-indicator');
            if (indicator) {
                indicator.style.display = 'flex';
            }
        } else {
            card.classList.remove('selected');
            
            // Hide the indicator
            const indicator = card.querySelector('.plan-selected-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    });
    
    // Clear any error message related to plan selection
    const errorMessage = document.getElementById('error-message');
    if (errorMessage && errorMessage.textContent.includes('select a plan')) {
        errorMessage.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize plan selection by finding the option with 'selected' class
    const selectedPlanOption = document.querySelector('.plan-option.selected');
    if (selectedPlanOption) {
        const initialPlan = selectedPlanOption.getAttribute('data-plan');
        if (initialPlan) {
            selectedPlan = initialPlan;
            console.log('Initial plan set to:', selectedPlan);
        }
    } else {
        // If no plan is pre-selected, select the basic plan by default
        const basicPlan = document.querySelector('.plan-option[data-plan="basic"]');
        if (basicPlan) {
            basicPlan.classList.add('selected');
            selectedPlan = 'basic';
            
            // Show the indicator
            const indicator = basicPlan.querySelector('.plan-selected-indicator');
            if (indicator) {
                indicator.style.display = 'flex';
            }
        }
    }

    // Initialize plan selection event listeners
    const planOptions = document.querySelectorAll('.plan-option');
    
    planOptions.forEach(option => {
        option.addEventListener('click', function() {
            const plan = this.getAttribute('data-plan');
            selectPlan(plan);
        });
    });
    
    // Form submission handling
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form values
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const name = firstName + ' ' + lastName; // Combine for 'name' field expected by API
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const termsAccepted = document.getElementById('terms').checked;
            
            // Validate form
            if (!validateForm(name, email, password, confirmPassword, termsAccepted)) {
                return;
            }
            
            // Show loading state
            const submitButton = signupForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Creating Account...';
            
            try {
                // Send registration request to server
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        firstName,
                        lastName,
                        email,
                        password,
                        plan: selectedPlan
                    })
                });
                
                console.log('Signup response status:', response.status);
                const data = await response.json();
                console.log('Signup response data:', data);
                
                if (!response.ok) {
                    throw new Error(data.msg || data.errors?.[0]?.msg || 'Registration failed');
                }
                
                // Store the token
                localStorage.setItem('token', data.token);
                localStorage.setItem('isLoggedIn', 'true');
                
                // Store user info
                const user = {
                    name: data.user.name,
                    email: data.user.email,
                    plan: data.user.subscription.plan,
                    id: data.user.id,
                    registrationDate: data.user.createdAt || new Date().toISOString()
                };
                localStorage.setItem('user', JSON.stringify(user));
                
                // Show success message
                const errorMessage = document.getElementById('error-message');
                errorMessage.textContent = 'Account created successfully! Redirecting...';
                errorMessage.style.display = 'block';
                errorMessage.style.color = '#28a745';
                
                // Redirect based on selected plan
                if (selectedPlan === 'basic') {
                    // Redirect to dashboard for free plan
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 1500);
                } else {
                    // Redirect to payment page for paid plans
                    setTimeout(() => {
                        window.location.href = `/payment.html?plan=${selectedPlan}`;
                    }, 1500);
                }
                
            } catch (error) {
                // Show error message
                const errorMessage = document.getElementById('error-message');
                errorMessage.textContent = error.message || 'An error occurred during registration';
                errorMessage.style.display = 'block';
                errorMessage.style.color = '#dc3545';
                
                // Reset button
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                
                console.error('Registration error:', error);
            }
        });
    }
    
    function validateForm(name, email, password, confirmPassword, termsAccepted) {
        const errorMessage = document.getElementById('error-message');
        
        // Reset error message
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        
        // Check if all fields are filled
        if (!name || !email || !password || !confirmPassword) {
            errorMessage.textContent = 'Please fill in all fields';
            errorMessage.style.display = 'block';
            return false;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMessage.textContent = 'Please enter a valid email address';
            errorMessage.style.display = 'block';
            return false;
        }
        
        // Check if passwords match
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            errorMessage.style.display = 'block';
            return false;
        }
        
        // Check if password is strong enough
        if (password.length < 8) {
            errorMessage.textContent = 'Password must be at least 8 characters long';
            errorMessage.style.display = 'block';
            return false;
        }
        
        // Check if a plan is selected
        if (!selectedPlan) {
            errorMessage.textContent = 'Please select a plan before creating your account';
            errorMessage.style.display = 'block';
            
            // Highlight the plan selection area to draw attention
            const planOptions = document.querySelector('.plan-options');
            if (planOptions) {
                planOptions.classList.add('highlight-selection');
                setTimeout(() => {
                    planOptions.classList.remove('highlight-selection');
                }, 2000);
            }
            
            // Scroll to the plan selection area
            const planSelection = document.querySelector('.plan-selection-container');
            if (planSelection) {
                planSelection.scrollIntoView({ behavior: 'smooth' });
            }
            
            return false;
        }
        
        // Check if terms are accepted
        if (!termsAccepted) {
            errorMessage.textContent = 'You must accept the Terms of Service and Privacy Policy';
            errorMessage.style.display = 'block';
            return false;
        }
        
        return true;
    }
}); 