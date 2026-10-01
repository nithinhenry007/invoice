const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously'
});

const window = dom.window;
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
window.supabaseClient = null;

(async () => {
  try {
    const scripts = [
      'js/utils.js', 'js/items.js', 'js/invoices.js', 
      'js/settings.js', 'js/preview.js', 'js/pdf-templates.js', 'js/app.js'
    ];

    for (const src of scripts) {
      const code = fs.readFileSync(src, 'utf8');
      const el = window.document.createElement('script');
      el.textContent = code;
      window.document.body.appendChild(el);
    }
    
    console.log('Scripts loaded. Setting dummy state...');
    window.state = {
      user: { id: 'usr1', email: 'test@test.com', name: 'Test' },
      settings: { company_name: 'Test Corp', default_gst_rate: 18, currency_symbol: 'Rs. ' },
      invoices: [],
      clients: []
    };

    console.log('Starting invoice creation...');
    if (window.startNewInvoice) {
      await window.startNewInvoice();
    } else {
      window._openNewInvoiceForm();
    }
    
    // Set some dummy values in form so it doesn't fail validation
    window.document.getElementById('inv-client-name').value = 'Client A';
    window.document.getElementById('inv-subject').value = 'Test Subject';
    window.document.getElementById('inv-opener').value = 'Hello';
    
    console.log('Simulating form save...');
    const ev = { preventDefault: () => {} };
    const id = await window.saveInvoice(ev);
    console.log('Saved invoice ID:', id);
    
    console.log('Calling saveAndPreview...');
    await window.saveAndPreview();
    
    console.log('SaveAndPreview executed successfully.');
  } catch (err) {
    console.log('FATAL SCRIPT ERROR:', err);
  }
  process.exit(0);
})();
