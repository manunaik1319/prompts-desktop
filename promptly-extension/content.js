/**
 * Promptly - Floating "Improve" button for AI chat inputs
 */
(function() {
  'use strict';

  const API_URL = 'http://localhost:3001/improve-prompt';
  const MIN_TEXT_LENGTH = 10;

  let floatingBtn = null;
  let activeInput = null;
  let isProcessing = false;

  function createFloatingButton() {
    if (floatingBtn && document.body.contains(floatingBtn)) return floatingBtn;

    floatingBtn = document.createElement('div');
    floatingBtn.id = 'promptly-floating-btn';
    floatingBtn.innerHTML = `<span class="promptly-icon">✨</span><span class="promptly-text">Improve</span>`;
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

  function positionButton(input) {
    if (!floatingBtn || !input) return;

    const rect = input.getBoundingClientRect();
    const btnHeight = 36;
    const btnWidth = floatingBtn.offsetWidth || 100;

    let top = rect.top + window.scrollY - btnHeight - 8;
    let left = rect.right + window.scrollX - btnWidth;

    if (top < window.scrollY + 10) {
      top = rect.bottom + window.scrollY + 8;
    }
    if (left < 10) left = 10;
    if (left + btnWidth > window.innerWidth - 10) {
      left = window.innerWidth - btnWidth - 10;
    }

    floatingBtn.style.top = top + 'px';
    floatingBtn.style.left = left + 'px';
    floatingBtn.style.display = 'flex';
  }

  function hideButton() {
    if (floatingBtn && !isProcessing) {
      floatingBtn.style.display = 'none';
    }
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
    
    // Clear existing content
    el.innerHTML = '';
    
    // Create a text node with the value
    const textNode = document.createTextNode(value);
    el.appendChild(textNode);
    
    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    // Trigger input event
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
  }

  async function handleImprove(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!activeInput || isProcessing) return;

    const prompt = getInputValue(activeInput).trim();
    if (!prompt || prompt.length < MIN_TEXT_LENGTH) return;

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
          hideButton();
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

  function checkAndShowButton() {
    const input = findChatInput();
    if (!input) return;

    const value = getInputValue(input).trim();
    if (value.length >= MIN_TEXT_LENGTH) {
      activeInput = input;
      createFloatingButton();
      setButtonState('idle');
      positionButton(input);
    } else {
      hideButton();
    }
  }

  function init() {
    createFloatingButton();
    floatingBtn.style.display = 'none';

    // Check periodically for input changes
    setInterval(checkAndShowButton, 500);

    // Also listen to input events
    document.addEventListener('input', (e) => {
      setTimeout(checkAndShowButton, 100);
    }, true);

    document.addEventListener('focus', (e) => {
      setTimeout(checkAndShowButton, 100);
    }, true);

    document.addEventListener('click', (e) => {
      setTimeout(checkAndShowButton, 100);
    }, true);

    // Reposition on scroll/resize
    window.addEventListener('scroll', () => {
      if (activeInput && floatingBtn.style.display !== 'none') {
        positionButton(activeInput);
      }
    }, true);

    window.addEventListener('resize', () => {
      if (activeInput && floatingBtn.style.display !== 'none') {
        positionButton(activeInput);
      }
    });

    console.log('[Promptly] Extension loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
