// DOM Elements
const promptInput = document.getElementById('prompt-input');
const toneSelect = document.getElementById('tone-select');
const improveBtn = document.getElementById('improve-btn');
const btnText = document.querySelector('.btn-text');
const btnLoading = document.querySelector('.btn-loading');
const errorMessage = document.getElementById('error-message');
const outputSection = document.getElementById('output-section');
const promptOutput = document.getElementById('prompt-output');
const copyBtn = document.getElementById('copy-btn');
const copyText = document.getElementById('copy-text');

// Backend API URL - Change this if your server runs on a different port
const API_URL = 'http://localhost:3001/improve-prompt';

// Show/hide loading state
function setLoading(isLoading) {
  improveBtn.disabled = isLoading;
  btnText.style.display = isLoading ? 'none' : 'inline';
  btnLoading.style.display = isLoading ? 'inline' : 'none';
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  outputSection.style.display = 'none';
}

// Hide error message
function hideError() {
  errorMessage.style.display = 'none';
}

// Show output section with improved prompt
function showOutput(improvedPrompt) {
  promptOutput.value = improvedPrompt;
  outputSection.style.display = 'block';
  hideError();
}

// Handle improve button click
async function handleImprove() {
  const prompt = promptInput.value.trim();
  const tone = toneSelect.value;

  // Validate input
  if (!prompt) {
    showError('Please enter a prompt to improve.');
    return;
  }

  setLoading(true);
  hideError();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, tone }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to improve prompt');
    }

    showOutput(data.improvedPrompt);
  } catch (error) {
    // Handle network errors or API errors
    if (error.message === 'Failed to fetch') {
      showError('Cannot connect to server. Make sure the backend is running on port 3001.');
    } else {
      showError(error.message || 'Something went wrong. Please try again.');
    }
  } finally {
    setLoading(false);
  }
}

// Handle copy button click
async function handleCopy() {
  const textToCopy = promptOutput.value;
  
  try {
    await navigator.clipboard.writeText(textToCopy);
    
    // Show copied feedback
    copyBtn.classList.add('copied');
    copyText.textContent = '✓ Copied!';
    
    // Reset after 2 seconds
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyText.textContent = '📋 Copy to Clipboard';
    }, 2000);
  } catch (err) {
    showError('Failed to copy to clipboard');
  }
}

// Event listeners
improveBtn.addEventListener('click', handleImprove);
copyBtn.addEventListener('click', handleCopy);

// Allow Ctrl+Enter to submit
promptInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    handleImprove();
  }
});
