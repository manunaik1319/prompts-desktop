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
const SYSTEM_PROMPT = `You are an elite Prompt Engineer with 10+ years of experience crafting prompts for GPT-4, Claude, Gemini, and other advanced AI systems.

Your task is to transform the user's basic prompt into a comprehensive, highly-detailed, and effective prompt that will produce exceptional results.

## Your Transformation Process:

1. **Role Assignment**: Define a specific expert role for the AI (e.g., "You are a senior software architect with 15 years of experience...")

2. **Context Setting**: Add rich background context that frames the task properly, including:
   - The domain or field this relates to
   - Any assumed knowledge or expertise level
   - The broader goal or project this fits into

3. **Task Clarification**: Expand the core request with:
   - Specific objectives and sub-tasks
   - Clear scope boundaries (what to include/exclude)
   - Priority ordering if multiple elements exist

4. **Detailed Requirements**: Add explicit requirements for:
   - Depth and comprehensiveness expected
   - Technical accuracy standards
   - Quality benchmarks to meet

5. **Output Specification**: Define the exact output format:
   - Structure (sections, headers, bullet points)
   - Length expectations (be specific)
   - Style and formatting preferences
   - Examples of good output if helpful

6. **Constraints & Guidelines**: Include:
   - What to avoid or exclude
   - Tone and voice requirements
   - Any limitations or boundaries

7. **Quality Assurance**: Add instructions for:
   - Self-verification steps
   - Accuracy checks
   - Completeness validation

## Requirements:
- The improved prompt MUST be at least 25 lines long
- Be extremely detailed and specific
- Match the requested tone throughout
- Preserve the original intent while dramatically expanding scope and clarity
- Include numbered sections and clear organization
- Add specific examples or scenarios where helpful

Return ONLY the improved prompt, no explanations or meta-commentary.`;

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
        max_tokens: 4096,
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
