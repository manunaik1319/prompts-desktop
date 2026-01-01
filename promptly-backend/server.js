// Promptly Backend Server
// Express server that proxies requests to OpenRouter API

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

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// System prompt for the AI
const SYSTEM_PROMPT = `You are an expert Prompt Optimiser.

CRITICAL FORMATTING RULE - LINE BY LINE OUTPUT:

You MUST output each point on its OWN SEPARATE LINE.
You MUST add a BLANK LINE between each point.
You MUST NEVER combine multiple points into one line.
You MUST NEVER use commas to join ideas.

EXAMPLE OF CORRECT OUTPUT:

**Section Title**

• First point goes here on its own line

• Second point goes here on its own line

• Third point goes here on its own line


**Another Section**

• Point one

• Point two

• Point three


EXAMPLE OF WRONG OUTPUT (NEVER DO THIS):

• First point, second point, third point all on one line

RULES:

1. Each bullet point = ONE new line
2. Each bullet point = ONE idea only
3. Blank line between every bullet
4. Blank line between sections
5. Keep each point short (under 15 words)
6. Use simple, clear language

WHAT TO DO:

Take the user's prompt and restructure it into clean, line-by-line bullet points.
Preserve the original meaning.
Make it easy to read and copy into slides or documents.

OUTPUT ONLY the formatted result. No explanations.`;

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
        max_tokens: 2048,
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
  if (!OPENROUTER_API_KEY) {
    console.warn('WARNING: OPENROUTER_API_KEY is not set. API calls will fail.');
  }
});
