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

Your task is to rewrite and significantly expand the user's prompt into a comprehensive, detailed, and structured format that produces high-quality AI outputs.

Follow these rules strictly:

• Preserve the original intent of the user's prompt at all times.
• Do NOT change the meaning or objective of the prompt.
• EXPAND the prompt significantly - add depth, specificity, and detailed instructions.
• Use bullet points, numbered lists, and clear sections - NOT essay or paragraph style.
• Improve clarity by removing ambiguity and vague language.
• Add a clear and suitable ROLE for the AI with specific expertise mentioned.
• Add detailed CONTEXT that helps the AI understand the full picture.
• Add comprehensive CONSTRAINTS including:
  - Specific requirements and expectations
  - Things to include and exclude
  - Quality standards
  - Formatting preferences
• Define a detailed OUTPUT FORMAT with:
  - Structure specifications
  - Section breakdowns if applicable
  - Length expectations
  - Style requirements
• Include EXAMPLES or sample structures when helpful.
• Add EDGE CASES or special considerations the AI should handle.
• Maintain a professional and practical tone unless otherwise required.
• Do NOT add explanations, headings, or commentary outside the improved prompt.
• Do NOT mention that the prompt was optimized or rewritten.
• Ensure the final prompt is ready to be copied and used directly.

STRUCTURE THE FINAL PROMPT USING CLEAR SECTIONS:

[ROLE]
- Detailed AI role with specific expertise

[TASK]
- Clear, comprehensive task description
- Multiple sub-tasks if applicable

[CONTEXT]
- Background information
- Relevant details the AI needs to know

[REQUIREMENTS]
- Bullet-pointed list of specific requirements
- What to include
- What to avoid

[OUTPUT FORMAT]
- Detailed format specifications
- Structure breakdown
- Length and style requirements

IMPORTANT: Generate a COMPREHENSIVE and DETAILED prompt. Short prompts are not acceptable. Expand on every aspect.

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

// Start server
app.listen(PORT, () => {
  console.log(`Promptly backend running on http://localhost:${PORT}`);
  if (!OPENROUTER_API_KEY) {
    console.warn('WARNING: OPENROUTER_API_KEY is not set. API calls will fail.');
  }
});
