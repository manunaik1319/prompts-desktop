/**
 * Promptly - Floating "Improve" button for AI chat inputs
 * Always visible on all pages
 */
(function() {
  'use strict';

  const API_URL = 'http://localhost:3001/improve-prompt';
  const MIN_TEXT_LENGTH = 3;

  let floatingBtn = null;
  let activeInput = null;
  let isProcessing = false;

  function createFloatingButton() {
    if (floatingBtn && document.body.contains(floatingBtn)) return floatingBtn;

    floatingBtn = document.createElement('div');
    floatingBtn.id = 'promptly-floating-btn';
    floatingBtn.innerHTML = `<span class="promptly-icon">✨</span><span class="promptly-text">Improve</span>`;
    floatingBtn.style.display = 'flex';
    document.body.appendChild(floatingBtn);

    floatingBtn.addEventListener('click', handleImprove);
    floatingBtn.addEventListener('mousedown', (e) => e.preventDefault());

    return floatingBtn;
  }

  function setButtonState(state) {
    if (!floatingBtn) return;
    floatingBtn.className = '';
    floatingBtn.id = 'promptly-floating-btn';

    switch (state) {
      case 'idle':
        floatingBtn.innerHTML = `<span class="promptly-icon">✨</span><span class="promptly-text">Improve</span>`;
        break;
      case 'loading':
        floatingBtn.classList.add('promptly-loading');
        floatingBtn.innerHTML = `<span class="promptly-spinner"></span><span class="promptly-text">Improving...</span>`;
        break;
      case 'success':
        floatingBtn.classList.add('promptly-success');
        floatingBtn.innerHTML = `<span class="promptly-icon">✅</span><span class="promptly-text">Done!</span>`;
        break;
      case 'error':
        floatingBtn.classList.add('promptly-error');
        floatingBtn.innerHTML = `<span class="promptly-icon">⚠️</span><span class="promptly-text">Error</span>`;
        break;
    }
  }

  function positionButtonFixed() {
    if (!floatingBtn) return;
    floatingBtn.style.position = 'fixed';
    floatingBtn.style.bottom = '20px';
    floatingBtn.style.right = '20px';
    floatingBtn.style.top = 'auto';
    floatingBtn.style.left = 'auto';
    floatingBtn.style.display = 'flex';
    floatingBtn.style.zIndex = '2147483647';
  }

  function getInputValue(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
    return el.innerText || el.textContent || '';
  }

  function setInputValue(el, value) {
    if (!el) return;

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const setter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      ).set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.focus();
      return;
    }

    // Contenteditable
    el.focus();
    el.innerHTML = '';
    const textNode = document.createTextNode(value);
    el.appendChild(textNode);
    
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
  }

  async function handleImprove(e) {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing) return;

    // Find the active input
    const input = findChatInput();
    if (!input) {
      setButtonState('error');
      setTimeout(() => setButtonState('idle'), 1500);
      return;
    }

    activeInput = input;
    const prompt = getInputValue(activeInput).trim();
    
    if (!prompt || prompt.length < MIN_TEXT_LENGTH) {
      setButtonState('error');
      setTimeout(() => setButtonState('idle'), 1500);
      return;
    }

    isProcessing = true;
    setButtonState('loading');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tone: 'Professional' })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.improvedPrompt) {
        setInputValue(activeInput, data.improvedPrompt);
        setButtonState('success');
        setTimeout(() => {
          isProcessing = false;
          setButtonState('idle');
        }, 1500);
      } else {
        throw new Error(data.error || 'No response');
      }
    } catch (error) {
      console.error('[Promptly] Error:', error);
      setButtonState('error');
      setTimeout(() => {
        isProcessing = false;
        setButtonState('idle');
      }, 2000);
    }
  }

  function findChatInput() {
    // ChatGPT
    let input = document.querySelector('#prompt-textarea');
    if (input) return input;

    // ChatGPT contenteditable
    input = document.querySelector('[data-id="root"] [contenteditable="true"]');
    if (input) return input;

    // Claude
    input = document.querySelector('[contenteditable="true"].ProseMirror');
    if (input) return input;

    input = document.querySelector('div[contenteditable="true"][data-placeholder]');
    if (input) return input;

    // Gemini
    input = document.querySelector('.ql-editor[contenteditable="true"]');
    if (input) return input;

    input = document.querySelector('rich-textarea [contenteditable="true"]');
    if (input) return input;

    // Generic contenteditable
    input = document.querySelector('[contenteditable="true"]');
    if (input) return input;

    // Generic textarea
    input = document.querySelector('textarea');
    if (input) return input;

    return null;
  }

  function init() {
    createFloatingButton();
    positionButtonFixed();
    setButtonState('idle');
    console.log('[Promptly] Extension loaded - always visible');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
