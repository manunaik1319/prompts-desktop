async function test() {
  try {
    const response = await fetch('http://localhost:3001/improve-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'write a short story about a cat',
        tone: 'creative'
      })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
