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
const SYSTEM_PROMPT = `You are an expert Prompt Optimiser and professional content structuring assistant.

Your task is to rewrite the user's prompt so that the AI output is:
- Clean
- Clearly structured
- Point-wise
- Well-spaced
- Easy to read in slides or documents

STRICT RULES (DO NOT BREAK THESE):

• Preserve the original intent of the user's prompt.
• Do NOT change the meaning.
• Do NOT compress information into paragraphs.
• Do NOT write long sentences joined by commas.
• Do NOT output dense or continuous text blocks.

FORMATTING RULES (VERY IMPORTANT):

• ALWAYS use bullet points or numbered points.
• Each point must be on a NEW LINE.
• Leave a BLANK LINE between each point.
• Each point should be concise (1–2 lines max).
• Use simple, professional language.

STRUCTURE RULES:

• Clearly separate sections using headings.
• Each section must contain 3–5 bullet points.
• Headings must be on their own line.
• Bullet points must appear BELOW the heading with spacing.

OUTPUT STRUCTURE TEMPLATE (FOLLOW EXACTLY):

Section Title

• Point 1  

• Point 2  

• Point 3  

(Blank line before next section)

STYLE REQUIREMENTS:

• Professional and formal tone
• Simple English
• No technical jargon unless required
• Persuasive but clear
• Investor-ready language

OUTPUT RESTRICTIONS:

• Do NOT include explanations or meta-comments.
• Do NOT mention formatting rules.
• Do NOT include instructions.
• Return ONLY the formatted output.

FINAL GOAL:

The output must look ready to be directly copied into:
- Pitch deck slides
- Business documents
- Presentations`;

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
