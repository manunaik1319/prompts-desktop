(function() {
  const API_URL = 'http://localhost:3001/improve-prompt';
  let floatingBtn = null;
  let activeInput = null;
  let debounceTimer = null;

  function createFloatingButton() {
    if (floatingBtn) return floatingBtn;
    
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'promptly-floating-btn';
    floatingBtn.innerHTML = `
      <span class="promptly-icon">✨</span>
      <span class="promptly-text">Improve</span>
    `;
    floatingBtn.style.display = 'none';
    document.body.appendChild(floatingBtn);
    
    floatingBtn.addEventListener('click', handleImprove);
    
    return floatingBtn;
  }

  function positionButton(input) {
    if (!floatingBtn) return;
    
    const rect = input.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    
    floatingBtn.style.top = (rect.top + scrollTop - 40) + 'px';
    floatingBtn.style.left = (rect.right + scrollLeft - floatingBtn.offsetWidth - 10) + 'px';
  }

  function showButton(input) {
    if (!floatingBtn) createFloatingButton();
    
    activeInput = input;
    floatingBtn.style.display = 'flex';
    floatingBtn.classList.remove('promptly-loading');
    floatingBtn.innerHTML = `
      <span class="promptly-icon">✨</span>
      <span class="promptly-text">Improve</span>
    `;
    positionButton(input);
  }

  function hideButton() {
    if (floatingBtn) {
      floatingBtn.style.display = 'none';
    }
    activeInput = null;
  }

  function getInputValue(element) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return element.value;
    }
    if (element.getAttribute('contenteditable') === 'true') {
      return element.innerText || element.textContent;
    }
    return '';
  }

  function setInputValue(element, value) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.getAttribute('contenteditable') === 'true') {
      element.innerText = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async function handleImprove(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!activeInput) return;
    
    const prompt = getInputValue(activeInput).trim();
    if (!prompt) return;
    
    floatingBtn.classList.add('promptly-loading');
    floatingBtn.innerHTML = `
      <span class="promptly-spinner"></span>
      <span class="promptly-text">Improving...</span>
    `;
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tone: 'Professional' })
      });
      
      const data = await response.json();
      
      if (data.improvedPrompt) {
        setInputValue(activeInput, data.improvedPrompt);
        floatingBtn.innerHTML = `
          <span class="promptly-icon">✓</span>
          <span class="promptly-text">Done!</span>
        `;
        setTimeout(() => {
          if (activeInput && getInputValue(activeInput).trim()) {
            showButton(activeInput);
          } else {
            hideButton();
          }
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to improve');
      }
    } catch (error) {
      console.error('Promptly error:', error);
      floatingBtn.innerHTML = `
        <span class="promptly-icon">⚠</span>
        <span class="promptly-text">Error</span>
      `;
      setTimeout(() => showButton(activeInput), 2000);
    }
  }

  function isValidInput(element) {
    if (!element) return false;
    
    const tag = element.tagName;
    const isTextarea = tag === 'TEXTAREA';
    const isTextInput = tag === 'INPUT' && element.type === 'text';
    const isContentEditable = element.getAttribute('contenteditable') === 'true';
    
    return isTextarea || isTextInput || isContentEditable;
  }

  function handleInput(e) {
    const element = e.target;
    
    if (!isValidInput(element)) return;
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const value = getInputValue(element).trim();
      
      if (value.length > 10) {
        showButton(element);
      } else {
        hideButton();
      }
    }, 500);
  }

  function handleFocus(e) {
    const element = e.target;
    if (!isValidInput(element)) return;
    
    const value = getInputValue(element).trim();
    if (value.length > 10) {
      showButton(element);
    }
  }

  function handleBlur(e) {
    setTimeout(() => {
      if (floatingBtn && !floatingBtn.matches(':hover')) {
        hideButton();
      }
    }, 200);
  }

  function handleScroll() {
    if (activeInput && floatingBtn && floatingBtn.style.display !== 'none') {
      positionButton(activeInput);
    }
  }

  createFloatingButton();
  
  document.addEventListener('input', handleInput, true);
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);
  document.addEventListener('scroll', handleScroll, true);
  window.addEventListener('resize', handleScroll);

  const observer = new MutationObserver((mutations) => {
    if (activeInput && floatingBtn && floatingBtn.style.display !== 'none') {
      positionButton(activeInput);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
})();
