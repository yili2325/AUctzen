/**
 * Password Strength Meter
 * Evaluates password strength and updates the UI accordingly
 */

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const strengthMeter = document.querySelector('.strength-meter-fill');
    const strengthText = document.querySelector('.strength-text span');
    
    if (!passwordInput || !strengthMeter || !strengthText) return;
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = evaluatePasswordStrength(password);
        
        // Update the strength meter
        strengthMeter.setAttribute('data-strength', strength);
        
        // Update the strength text
        const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
        strengthText.textContent = strengthLabels[strength];
    });
    
    function evaluatePasswordStrength(password) {
        // If empty password
        if (!password) return 0;
        
        let score = 0;
        
        // Length check
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        
        // Complexity checks
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);
        
        if (hasLowercase && hasUppercase) score += 1;
        if (hasNumbers) score += 1;
        if (hasSpecialChars) score += 1;
        
        // Cap the score at 3 (0-3 range)
        return Math.min(3, score);
    }
    
    console.log('Password strength meter initialized');
}); 