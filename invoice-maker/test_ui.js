const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable',
  beforeParse(window) {
    // Mock fetch, localStorage, etc.
    window.localStorage = {
      getItem: (k) => window.localStorage[k] || null,
      setItem: (k, v) => { window.localStorage[k] = v; },
      removeItem: (k) => { delete window.localStorage[k]; },
      clear: () => {}
    };
    window.fetch = async () => ({ json: async () => ({}) });
    window.alert = console.log;
    // Intercept console.error
    const origError = window.console.error;
    window.console.error = (...args) => {
      console.log('BROWSER_ERROR:', ...args);
      origError.apply(window.console, args);
    };
  }
});

dom.window.addEventListener('load', () => {
  console.log('Window loaded.');
  
  // Inject scripts one by one to ensure execution order
  const scripts = [
    'js/utils.js',
    'js/items.js',
    'js/invoices.js',
    'js/clients.js',
    'js/settings.js',
    'js/preview.js',
    'js/pdf-templates.js',
    'js/app.js'
  ];

  for (const src of scripts) {
    const code = fs.readFileSync(src, 'utf8');
    const el = dom.window.document.createElement('script');
    el.textContent = code;
    dom.window.document.body.appendChild(el);
  }

  // Simulate user actions
  try {
    console.log('Starting invoice creation...');
    if (dom.window.startNewInvoice) {
      dom.window.startNewInvoice();
    } else {
      console.log('startNewInvoice not found, calling _openNewInvoiceForm');
      dom.window._openNewInvoiceForm();
    }
    
    // Check if onboarding modal is shown
    const onboarding = dom.window.document.getElementById('onboarding-modal');
    if (onboarding && onboarding.style.display === 'flex') {
      console.log('Onboarding modal shown, clicking skip');
      dom.window.skipOnboardingAndCreateInvoice();
    }

    console.log('Simulating form save...');
    // We pass a dummy event object for preventDefault
    const ev = { preventDefault: () => {} };
    dom.window.saveInvoice(ev);
    
    console.log('Save executed. Checking errors...');
  } catch (err) {
    console.log('FATAL SCRIPT ERROR:', err);
  }
});
