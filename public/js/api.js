const API_URL = '/api';

// Example API call
async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    return await response.json();
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
} 