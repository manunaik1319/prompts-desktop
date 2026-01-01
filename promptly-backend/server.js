// Promptly Backend Server
// Express server that proxies requests to AI/ML API

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Admin credentials (in production, use environment variables and proper hashing)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'promptly123';
const JWT_SECRET = process.env.JWT_SECRET || 'promptly-secret-key-change-in-production';

// In-memory storage for URLs (in production, use a database)
let urls = [];
let tokens = new Set();

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
console.log('Gemini API Key loaded:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT FOUND');

// System prompt for the AI
const SYSTEM_PROMPT = `You are an expert Prompt Optimiser. Your job is to take a user's prompt and rewrite it to be more effective.

CRITICAL RULES:
1. The improved prompt must be AT LEAST as long as the original, preferably 2-3x longer
2. Write in complete, natural sentences and paragraphs - NOT ultra-short bullet fragments
3. Each line should be a full thought (15-50 words typically)
4. Add context, specifics, constraints, and formatting instructions that will help the AI understand better

STRUCTURE TO USE:
- Start with a clear role or context for the AI
- State the main task in detail
- Add specific requirements and constraints
- Include format expectations for the output
- End with any special instructions

GOOD LINE EXAMPLE:
"Please analyze the provided data and identify the top 3 trends, explaining the reasoning behind each trend with supporting evidence from the data."

BAD LINE EXAMPLE (too short):
"• Analyze data"
"• Find trends"

Write the improved prompt as flowing, professional instructions. Use bullet points sparingly and only when listing specific items. Output ONLY the improved prompt.`;

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
      if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY is not set in environment variables');
        return res.status(500).json({ error: 'Server configuration error: API key not set' });
      }

      // Prepare the user message with tone context
      const userMessage = `Tone: ${tone}\n\nPrompt to improve:\n${prompt.trim()}`;

      // Call Gemini API
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7
          }
        })
      });

      const data = await response.json();

      // Check for API errors
      if (!response.ok) {
        console.error('Gemini API error:', data);
        return res.status(response.status).json({ 
          error: data.error?.message || 'Failed to improve prompt' 
        });
      }

      // Extract the improved prompt from the response
      const improvedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text;

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

// Generate simple token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!tokens.has(token)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  next();
}

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateToken();
    tokens.add(token);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Public endpoint for URLs (API route, returns JSON)
app.get('/api/urls', (req, res) => {
  res.json({ urls });
});

// Get all URLs
app.get('/api/admin/urls', authMiddleware, (req, res) => {
  res.json({ urls });
});

// Add new URL
app.post('/api/admin/urls', authMiddleware, (req, res) => {
  const { url, name } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const newUrl = {
    id: crypto.randomBytes(8).toString('hex'),
    url,
    name: name || '',
    createdAt: new Date().toISOString()
  };
  
  urls.push(newUrl);
  res.json({ url: newUrl });
});

// Delete URL
app.delete('/api/admin/urls/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const index = urls.findIndex(u => u.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'URL not found' });
  }
  
  urls.splice(index, 1);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Promptly backend running on http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY is not set. API calls will fail.');
  }
});
