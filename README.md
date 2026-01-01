# Promptly - AI Prompt Optimizer

Transform your AI prompts into professional, structured queries with one click.

![Promptly](https://img.shields.io/badge/version-1.0.0-8b5cf6) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Instant Optimization** - Transform any prompt into professional format
- **Multiple Tones** - Professional, Creative, Technical, Friendly, Concise
- **Universal Support** - Works with ChatGPT, Claude, Gemini, and more
- **Keyboard Shortcut** - Quick access with `Ctrl+I` / `Cmd+I`
- **One-Click Copy** - Instantly copy improved prompts

## Project Structure

```
promptly/
├── promptly-extension/     # Chrome Extension
│   ├── manifest.json
│   ├── popup.html/css/js
│   ├── content.js/css
│   ├── about.html
│   └── icons/
│
└── promptly-backend/       # Express Server
    ├── server.js
    ├── package.json
    └── public/
        ├── index.html      # Landing page
        ├── admin.html      # Admin login
        └── dashboard.html  # Admin dashboard
```

## Quick Start

### 1. Backend Setup

```bash
cd promptly-backend
npm install

# Create .env file
echo "OPENROUTER_API_KEY=your_key_here" > .env
echo "ADMIN_USERNAME=admin" >> .env
echo "ADMIN_PASSWORD=your_password" >> .env
echo "JWT_SECRET=your_secret" >> .env

npm start
```

Server runs on `http://localhost:3001`

### 2. Chrome Extension

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `promptly-extension` folder

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes |
| `ADMIN_USERNAME` | Admin login username | Yes |
| `ADMIN_PASSWORD` | Admin login password | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `PORT` | Server port (default: 3001) | No |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/improve-prompt` | Improve a prompt |
| GET | `/api/urls` | Get public URL directory |
| POST | `/api/admin/login` | Admin authentication |
| GET | `/api/admin/urls` | Get URLs (authenticated) |
| POST | `/api/admin/urls` | Add URL (authenticated) |
| DELETE | `/api/admin/urls/:id` | Delete URL (authenticated) |

## Tech Stack

- **Frontend**: Vanilla JS, CSS3 (Inter font, gradients)
- **Backend**: Node.js, Express
- **AI**: OpenRouter API (GPT-4, Claude)
- **Auth**: JWT

## License

MIT
