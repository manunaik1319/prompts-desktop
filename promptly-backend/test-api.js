fetch('http://localhost:3001/improve-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'write hello world', tone: 'professional' })
}).then(r => r.json()).then(console.log).catch(console.error);
