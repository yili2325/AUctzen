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

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('login-error');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                // Make API call to authenticate user
                const API_URL = window.location.hostname === 'localhost' 
                  ? `http://${window.location.hostname}:50011/api` 
                  : '/api';
                
                const response = await fetch(`${API_URL}/auth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                });
                
                const data = await response.json();
                console.log('Login API response:', data);
                
                if (!response.ok) {
                    throw new Error(data.msg || 'Login failed');
                }
                
                // Store token and login status
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('isLoggedIn', 'true');
                
                // Check if there's a redirect parameter
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                
                // Redirect to the appropriate page
                if (redirect) {
                    window.location.href = redirect;
                } else {
                    window.location.href = '/practice.html';
                }
                
            } catch (error) {
                console.error('Login error:', error);
                if (errorMessage) {
                    errorMessage.textContent = error.message || 'Failed to log in. Please try again.';
                    errorMessage.style.display = 'block';
                } else {
                    alert(error.message || 'Failed to log in. Please try again.');
                }
            }
        });
    }
}); 