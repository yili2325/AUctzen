/**
 * Password Toggle Functionality
 * Allows users to toggle password visibility in password fields
 */

document.addEventListener('DOMContentLoaded', function() {
    // Find all password toggle buttons
    const toggleButtons = document.querySelectorAll('.password-toggle');
    
    // Add click event listener to each button
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Find the closest password input field
            const passwordField = this.closest('.password-input-container').querySelector('input');
            const icon = this.querySelector('i');
            
            // Toggle between password and text type
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordField.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    console.log('Password toggle functionality initialized');
}); 