// routes/geminiExplain.js
const express = require('express');
const router = express.Router();
const askGemini = require('../utils/geminiClients');

router.post('/explain', async (req, res) => {
  const { question, answer, userQuestion } = req.body;

  const prompt = `
You are a friendly tutor helping someone prepare for the Australian Citizenship Test.

Question: ${question}
Correct Answer: ${answer}
Student asked: "${userQuestion || 'Why is this correct?'}"

Explain this in a clear, helpful, beginner-friendly way.
  `;

  try {
    const reply = await askGemini(prompt);
    res.json({ explanation: reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;