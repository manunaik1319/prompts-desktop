// Promptly Backend Server
// Express server that proxies requests to OpenRouter API

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// System prompt for the AI
const SYSTEM_PROMPT = `You are an expert Prompt Optimiser and AI Prompt Engineer.

Your task is to rewrite and improve the user's prompt so it produces high-quality, accurate, and professional AI outputs.

Follow these rules strictly:

• Preserve the original intent of the user's prompt at all times.
• Do NOT change the meaning or objective of the prompt.
• Improve clarity by removing ambiguity and vague language.
• Rewrite the prompt in a clean, structured, and easy-to-understand format.
• Add a clear and suitable ROLE for the AI if it is missing.
• Add relevant CONTEXT only when it improves understanding.
• Add helpful CONSTRAINTS (length, tone, format) only when necessary.
• Define a clear OUTPUT FORMAT if the original prompt does not specify one.
• Maintain a professional and practical tone unless otherwise required.
• Avoid unnecessary verbosity or filler content.
• Do NOT add explanations, headings, or commentary outside the improved prompt.
• Do NOT mention that the prompt was optimized or rewritten.
• Ensure the final prompt is ready to be copied and used directly.

STRUCTURE THE FINAL PROMPT USING CLEAR SEPARATION AND LINE SPACING:

- Start with the AI role  
- Then clearly state the task  
- Then add context (if applicable)  
- Then list constraints or requirements  
- Then specify the expected output format  

IMPORTANT OUTPUT RULE:

Return ONLY the improved prompt.  
No analysis.  
No notes.  
No extra text.`;

// POST /improve-prompt endpoint
app.post('/improve-prompt', async (req, res) => {
  try {
    const { prompt, tone } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'Prompt is required and cannot be empty' });
    }

    if (!tone) {
      return res.status(400).json({ error: 'Tone is required' });
    }

    // Check for API key
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error: API key not set' });
    }

    // Prepare the user message with tone context
    const userMessage = `Tone: ${tone}\n\nPrompt to improve:\n${prompt.trim()}`;

    // Call OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Promptly'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    const data = await response.json();

    // Check for API errors
    if (!response.ok) {
      console.error('OpenRouter API error:', data);
      return res.status(response.status).json({ 
        error: data.error?.message || 'Failed to improve prompt' 
      });
    }

    // Extract the improved prompt from the response
    const improvedPrompt = data.choices?.[0]?.message?.content;

    if (!improvedPrompt) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    // Return the improved prompt
    res.json({ improvedPrompt: improvedPrompt.trim() });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Promptly backend running on http://localhost:${PORT}`);
  if (!OPENROUTER_API_KEY) {
    console.warn('WARNING: OPENROUTER_API_KEY is not set. API calls will fail.');
  }
});
