// Create a new file to test localStorage
function testLocalStorage() {
    try {
        // Test if localStorage is available
        if (typeof localStorage === 'undefined') {
            console.error('localStorage is not available in this browser');
            return false;
        }
        
        // Test writing to localStorage
        localStorage.setItem('test', 'test value');
        
        // Test reading from localStorage
        const testValue = localStorage.getItem('test');
        
        // Test if the value was correctly stored
        if (testValue !== 'test value') {
            console.error('localStorage test failed: value mismatch');
            return false;
        }
        
        // Test removing from localStorage
        localStorage.removeItem('test');
        
        console.log('localStorage test passed');
        return true;
    } catch (error) {
        console.error('localStorage test failed with error:', error);
        return false;
    }
}

// Run the test
document.addEventListener('DOMContentLoaded', function() {
    console.log('Testing localStorage...');
    const result = testLocalStorage();
    console.log('localStorage test result:', result);
}); 