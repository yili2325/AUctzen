// utils/geminiClient.js
const axios = require('axios');

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function askGemini(prompt) {
  // Check if API key is configured
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in environment variables');
    throw new Error('GEMINI API key is not configured');
  }

  try {
    console.log('Sending request to Gemini API');
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Received response from Gemini API');
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No explanation returned.';
  } catch (error) {
    console.error('Gemini API error:', error.message);
    if (error.response) {
      console.error('Error response data:', JSON.stringify(error.response.data));
      console.error('Error response status:', error.response.status);
      throw new Error(`Gemini API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('No response received from Gemini API');
    } else {
      console.error('Error setting up request:', error.message);
      throw new Error(`Failed to set up Gemini API request: ${error.message}`);
    }
  }
}

module.exports = askGemini;