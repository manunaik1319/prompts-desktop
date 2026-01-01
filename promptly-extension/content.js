/**
 * Promptly - Grammarly-style inline assistant for AI prompts
 * Content script that injects floating "Improve" button near text inputs
 */
(function() {
  'use strict';

  // Configuration
  const API_URL = 'http://localhost:3001/improve-prompt';
  const MIN_TEXT_LENGTH = 10;
  const DEBOUNCE_DELAY = 400;

  // State
  let floatingBtn = null;
  let activeInput = null;
  let debounceTimer = null;
  let isProcessing = false;

  /**
   * Create and inject the floating button into DOM
   */
  function createFloatingButton() {
    if (floatingBtn && document.body.contains(floatingBtn)) return floatingBtn;

    floatingBtn = document.createElement('div');
    floatingBtn.id = 'promptly-floating-btn';
    floatingBtn.setAttribute('role', 'button');
    floatingBtn.setAttribute('aria-label', 'Improve prompt');
    setButtonState('idle');
    floatingBtn.style.display = 'none';
    document.body.appendChild(floatingBtn);

    // Event listeners
    floatingBtn.addEventListener('click', handleImprove);
    floatingBtn.addEventListener('mousedown', (e) => e.preventDefault()); // Prevent blur

    return floatingBtn;
  }

  /**
   * Set button visual state
   */
  function setButtonState(state) {
    if (!floatingBtn) return;

    floatingBtn.classList.remove('promptly-loading', 'promptly-success', 'promptly-error');

    switch (state) {
      case 'idle':
        floatingBtn.innerHTML = `
          <span class="promptly-icon">✨</span>
          <span class="promptly-text">Improve</span>
        `;
        break;
      case 'loading':
        floatingBtn.classList.add('promptly-loading');
        floatingBtn.innerHTML = `
          <span class="promptly-spinner"></span>
          <span class="promptly-text">Improving...</span>
        `;
        break;
      case 'success':
        floatingBtn.classList.add('promptly-success');
        floatingBtn.innerHTML = `
          <span class="promptly-icon">✅</span>
          <span class="promptly-text">Improved</span>
        `;
        break;
      case 'error':
        floatingBtn.classList.add('promptly-error');
        floatingBtn.innerHTML = `
          <span class="promptly-icon">⚠️</span>
          <span class="promptly-text">Error</span>
        `;
        break;
    }
  }

  /**
   * Position the button relative to the active input
   */
  function positionButton(input) {
    if (!floatingBtn || !input) return;

    const rect = input.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const btnWidth = floatingBtn.offsetWidth || 100;
    const btnHeight = floatingBtn.offsetHeight || 36;

    // Position above input, aligned to right
    let top = rect.top + scrollTop - btnHeight - 8;
    let left = rect.right + scrollLeft - btnWidth;

    // If button would go off-screen top, position below input
    if (top < scrollTop + 10) {
      top = rect.bottom + scrollTop + 8;
    }

    // Keep within viewport horizontally
    if (left < scrollLeft + 10) {
      left = scrollLeft + 10;
    }

    floatingBtn.style.top = top + 'px';
    floatingBtn.style.left = left + 'px';
  }

  /**
   * Show the floating button near an input
   */
  function showButton(input) {
    if (!floatingBtn) createFloatingButton();
    if (isProcessing) return;

    activeInput = input;
    floatingBtn.style.display = 'flex';
    setButtonState('idle');
    
    // Use requestAnimationFrame for smooth positioning
    requestAnimationFrame(() => positionButton(input));
  }

  /**
   * Hide the floating button
   */
  function hideButton() {
    if (floatingBtn && !isProcessing) {
      floatingBtn.style.display = 'none';
    }
  }

  /**
   * Get text value from various input types
   */
  function getInputValue(element) {
    if (!element) return '';

    // Standard inputs
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return element.value || '';
    }

    // Contenteditable elements
    if (element.getAttribute('contenteditable') === 'true') {
      return element.innerText || element.textContent || '';
    }

    // Check for nested contenteditable (ChatGPT uses this pattern)
    const nestedEditable = element.querySelector('[contenteditable="true"]');
    if (nestedEditable) {
      return nestedEditable.innerText || nestedEditable.textContent || '';
    }

    return '';
  }

  /**
   * Set text value and trigger input events for framework reactivity
   */
  function setInputValue(element, value) {
    if (!element) return;

    // Standard inputs
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      // Use native setter for React compatibility
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      ).set;
      nativeInputValueSetter.call(element, value);

      // Dispatch events for React/Vue/Angular
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

      // Move cursor to end
      element.selectionStart = element.selectionEnd = value.length;
      element.focus();
      return;
    }

    // Contenteditable elements
    if (element.getAttribute('contenteditable') === 'true') {
      element.innerText = value;
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      
      // Move cursor to end
      moveCursorToEnd(element);
      element.focus();
      return;
    }

    // Check for nested contenteditable
    const nestedEditable = element.querySelector('[contenteditable="true"]');
    if (nestedEditable) {
      nestedEditable.innerText = value;
      nestedEditable.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      moveCursorToEnd(nestedEditable);
      nestedEditable.focus();
    }
  }

  /**
   * Move cursor to end of contenteditable element
   */
  function moveCursorToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Handle click on Improve button
   */
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.improvedPrompt) {
        setInputValue(activeInput, data.improvedPrompt);
        setButtonState('success');

        // Hide after success
        setTimeout(() => {
          isProcessing = false;
          hideButton();
        }, 1500);
      } else {
        throw new Error(data.error || 'No improved prompt received');
      }
    } catch (error) {
      console.error('[Promptly] Error:', error.message);
      setButtonState('error');

      // Reset after error
      setTimeout(() => {
        isProcessing = false;
        if (activeInput && getInputValue(activeInput).trim().length >= MIN_TEXT_LENGTH) {
          setButtonState('idle');
        } else {
          hideButton();
        }
      }, 2000);
    }
  }

  /**
   * Check if element is a valid text input
   */
  function isValidInput(element) {
    if (!element || !element.tagName) return false;

    const tag = element.tagName.toUpperCase();

    // Skip hidden or disabled elements
    if (element.disabled || element.hidden || element.offsetParent === null) {
      return false;
    }

    // Textarea
    if (tag === 'TEXTAREA') return true;

    // Text input
    if (tag === 'INPUT') {
      const type = (element.type || 'text').toLowerCase();
      return ['text', 'search', 'url'].includes(type);
    }

    // Contenteditable
    if (element.getAttribute('contenteditable') === 'true') return true;

    // Check for contenteditable children (some chat UIs wrap the editable)
    if (element.querySelector && element.querySelector('[contenteditable="true"]')) {
      return true;
    }

    return false;
  }

  /**
   * Find the actual editable element (handles nested contenteditable)
   */
  function getEditableElement(element) {
    if (!element) return null;

    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return element;
    }

    if (element.getAttribute('contenteditable') === 'true') {
      return element;
    }

    // Check parent chain for contenteditable
    let parent = element.parentElement;
    while (parent) {
      if (parent.getAttribute('contenteditable') === 'true') {
        return parent;
      }
      parent = parent.parentElement;
    }

    return element;
  }

  /**
   * Handle input events (typing)
   */
  function handleInput(e) {
    const element = getEditableElement(e.target);
    if (!isValidInput(element)) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const value = getInputValue(element).trim();

      if (value.length >= MIN_TEXT_LENGTH) {
        showButton(element);
      } else {
        hideButton();
      }
    }, DEBOUNCE_DELAY);
  }

  /**
   * Handle focus events
   */
  function handleFocus(e) {
    const element = getEditableElement(e.target);
    if (!isValidInput(element)) return;

    setTimeout(() => {
      const value = getInputValue(element).trim();
      if (value.length >= MIN_TEXT_LENGTH) {
        showButton(element);
      }
    }, 100);
  }

  /**
   * Handle blur events
   */
  function handleBlur(e) {
    setTimeout(() => {
      // Don't hide if hovering over button or still processing
      if (isProcessing) return;
      if (floatingBtn && floatingBtn.matches(':hover')) return;

      hideButton();
    }, 150);
  }

  /**
   * Handle scroll and resize for repositioning
   */
  function handleReposition() {
    if (activeInput && floatingBtn && floatingBtn.style.display !== 'none') {
      positionButton(activeInput);
    }
  }

  /**
   * Initialize the extension
   */
  function init() {
    // Create button on load
    createFloatingButton();

    // Event listeners with capture for shadow DOM compatibility
    document.addEventListener('input', handleInput, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    document.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    // MutationObserver for dynamic content (React, Vue, etc.)
    const observer = new MutationObserver((mutations) => {
      // Reposition if DOM changes while button is visible
      if (activeInput && floatingBtn && floatingBtn.style.display !== 'none') {
        // Check if activeInput is still in DOM
        if (!document.body.contains(activeInput)) {
          hideButton();
          activeInput = null;
        } else {
          requestAnimationFrame(() => positionButton(activeInput));
        }
      }

      // Ensure button still exists
      if (floatingBtn && !document.body.contains(floatingBtn)) {
        floatingBtn = null;
        createFloatingButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    console.log('[Promptly] Extension loaded');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
