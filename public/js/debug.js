// Debug script to help troubleshoot authentication issues
document.addEventListener('DOMContentLoaded', () => {
    console.log('Debug script loaded');
    
    // Check localStorage
    console.log('localStorage contents:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`${key}: ${localStorage.getItem(key)}`);
    }
    
    // Only show debug buttons in development mode
    const isDevMode = false; // Set this to false for production
    
    if (isDevMode) {
        // Add debug button
        const debugButton = document.createElement('button');
        debugButton.textContent = 'Debug Auth';
        debugButton.style.position = 'fixed';
        debugButton.style.bottom = '10px';
        debugButton.style.right = '10px';
        debugButton.style.zIndex = '9999';
        debugButton.style.padding = '5px 10px';
        debugButton.style.backgroundColor = '#f0f0f0';
        debugButton.style.border = '1px solid #ccc';
        debugButton.style.borderRadius = '4px';
        debugButton.style.cursor = 'pointer';
        
        debugButton.addEventListener('click', () => {
            const authStatus = {
                token: localStorage.getItem('token'),
                userId: localStorage.getItem('userId'),
                isLoggedIn: localStorage.getItem('isLoggedIn'),
                user: localStorage.getItem('user'),
                selectedPlan: localStorage.getItem('selectedPlan')
            };
            
            console.log('Auth status:', authStatus);
            alert(`Auth status:\nToken: ${authStatus.token ? 'Present' : 'Missing'}\nLogged in: ${authStatus.isLoggedIn}\nUser ID: ${authStatus.userId}`);
        });
        
        document.body.appendChild(debugButton);
        
        // Add clear test results button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Test Results';
        clearButton.style.position = 'fixed';
        clearButton.style.bottom = '50px';
        clearButton.style.right = '10px';
        clearButton.style.zIndex = '9999';
        clearButton.style.padding = '5px 10px';
        clearButton.style.backgroundColor = '#f44336';
        clearButton.style.color = 'white';
        clearButton.style.border = '1px solid #d32f2f';
        clearButton.style.borderRadius = '4px';
        clearButton.style.cursor = 'pointer';
        
        clearButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all test results? This cannot be undone.')) {
                clearTestResults();
            }
        });
        
        document.body.appendChild(clearButton);
    }
});

// Function to check test results
function checkTestResults() {
    // Get current user ID for user-specific data
    let userId = 'guest';
    try {
        if (typeof getCurrentUser === 'function') {
            const userData = getCurrentUser();
            userId = userData?.id || userData?.userId || 'guest';
        } else {
            const userData = JSON.parse(localStorage.getItem('user')) || {};
            userId = userData.id || userData.userId || 'guest';
        }
    } catch (e) {
        console.error('Error getting current user ID:', e);
    }
    
    // Check both legacy and user-specific test results
    const legacyTestResults = JSON.parse(localStorage.getItem('testResults') || '[]');
    const userTestResults = JSON.parse(localStorage.getItem(`testResults_${userId}`) || '[]');
    
    console.log('Legacy test results in localStorage:', legacyTestResults);
    console.log(`Test results for user ${userId}:`, userTestResults);
    
    return {
        legacy: legacyTestResults,
        user: userTestResults
    };
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Debug.js loaded');
    checkTestResults();
});

// Function to clear test results
function clearTestResults() {
    // Get current user ID for user-specific data
    let userId = 'guest';
    try {
        if (typeof getCurrentUser === 'function') {
            const userData = getCurrentUser();
            userId = userData?.id || userData?.userId || 'guest';
        } else {
            const userData = JSON.parse(localStorage.getItem('user')) || {};
            userId = userData.id || userData.userId || 'guest';
        }
    } catch (e) {
        console.error('Error getting current user ID:', e);
    }
    
    // Ask user which data to clear
    const clearOption = prompt(
        'What test results do you want to clear?\n' +
        '1. Current user only\n' +
        '2. Legacy data only\n' +
        '3. All test data\n' +
        'Enter number:'
    );
    
    if (clearOption === '1' || clearOption === '3') {
        localStorage.setItem(`testResults_${userId}`, '[]');
        console.log(`Test results cleared for user ${userId}`);
    }
    
    if (clearOption === '2' || clearOption === '3') {
        localStorage.setItem('testResults', '[]');
        console.log('Legacy test results cleared');
    }
    
    alert('Test results cleared. Refresh the page to see the changes.');
} 