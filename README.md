# Promptly - AI Prompt Improver

A Chrome Extension that improves your AI prompts using OpenRouter API.

## Project Structure

```
prompt/
├── promptly-extension/     # Chrome Extension
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   └── icon*.png          # Add your icons
│
└── promptly-backend/       # Express Server
    ├── server.js
    ├── package.json
    ├── .env.example
    └── .env               # Create this with your API key
```

## Setup Instructions

### 1. Backend Setup

```bash
cd promptly-backend

# Install dependencies
npm install

# Create .env file with your OpenRouter API key
# Copy .env.example to .env and add your key
cp .env.example .env

# Edit .env and replace with your actual API key
# Get your key at: https://openrouter.ai/keys

# Start the server
npm start
```

Server runs on http://localhost:3001

### 2. Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `promptly-extension` folder
5. The extension icon appears in your toolbar

### 3. Add Extension Icons (Optional)

Create or download icons and save as:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Place them in the `promptly-extension` folder.

## Usage

1. Make sure the backend server is running
2. Click the Promptly extension icon
3. Paste your prompt
4. Select a tone (Professional, Creative, Short & Direct)
5. Click "Improve Prompt"
6. Copy the improved prompt to clipboard

## API Endpoint

**POST /improve-prompt**

Request:
```json
{
  "prompt": "your prompt text",
  "tone": "Professional"
}
```

Response:
```json
{
  "improvedPrompt": "improved prompt text"
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| OPENROUTER_API_KEY | Your OpenRouter API key | Yes |
| PORT | Server port (default: 3001) | No |
