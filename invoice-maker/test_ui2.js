const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable',
  beforeParse(window) {
    window.localStorage = {
      getItem: (k) => window.localStorage[k] || null,
      setItem: (k, v) => { window.localStorage[k] = v; },
      removeItem: (k) => { delete window.localStorage[k]; },
      clear: () => {}
    };
    window.fetch = async () => ({ json: async () => ({}) });
    window.alert = console.log;
    window.console.error = (...args) => console.log('ERROR:', ...args);
    window.console.warn = (...args) => console.log('WARN:', ...args);
  }
});

dom.window.addEventListener('load', async () => {
  try {
    const scripts = [
      'js/utils.js', 'js/items.js', 'js/invoices.js', 'js/clients.js', 
      'js/settings.js', 'js/preview.js', 'js/pdf-templates.js', 'js/app.js'
    ];

    for (const src of scripts) {
      const code = fs.readFileSync(src, 'utf8');
      const el = dom.window.document.createElement('script');
      el.textContent = code;
      dom.window.document.body.appendChild(el);
    }
    
    console.log('Scripts loaded. Calling initApp...');
    if(dom.window.initApp) await dom.window.initApp();

    console.log('Starting invoice creation...');
    if (dom.window.startNewInvoice) {
      dom.window.startNewInvoice();
    } else {
      dom.window._openNewInvoiceForm();
    }
    
    const onboarding = dom.window.document.getElementById('onboarding-modal');
    if (onboarding && onboarding.style.display === 'flex') {
      console.log('Onboarding modal shown, clicking skip');
      dom.window.skipOnboardingAndCreateInvoice();
    }

    console.log('Simulating form save...');
    const ev = { preventDefault: () => {} };
    await dom.window.saveInvoice(ev);
    
    console.log('Save executed. state.invoices:', dom.window.state.invoices);
  } catch (err) {
    console.log('FATAL SCRIPT ERROR:', err);
  }
  process.exit(0);
});
