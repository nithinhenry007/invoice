const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const path = require('path');

const projectPath = 'd:\\ANT\\invoice-maker';
const html = fs.readFileSync(path.join(projectPath, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable'
});

const window = dom.window;
const document = window.document;

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value.toString(); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};
window.localStorage = localStorageMock;

// Mock matchMedia
window.matchMedia = () => ({ matches: false });

// Mock jsPDF
window.jspdf = { jsPDF: class {} };

const scripts = [
  'js/config.js',
  'js/utils.js',
  'js/auth.js',
  'js/settings.js',
  'js/invoices.js',
  'js/items.js',
  'js/preview.js',
  'js/pdf-templates.js',
  'js/app.js'
];

for (const script of scripts) {
  const code = fs.readFileSync(path.join(projectPath, script), 'utf8');
  const el = document.createElement('script');
  el.textContent = code;
  document.head.appendChild(el);
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Test] DOMContentLoaded fired.');
  
  // Wait a bit for async checkSession etc
  await new Promise(r => setTimeout(r, 500));
  
  // Open invoice form
  console.log('[Test] Calling _openNewInvoiceForm()');
  window._openNewInvoiceForm();
  
  // Fill client name (required)
  document.getElementById('inv-client-name').value = 'Test Client';
  
  console.log('[Test] Submitting form via Save Invoice button');
  const btn = document.getElementById('save-invoice-btn');
  const form = document.getElementById('invoice-form');
  
  // Attach event listener to track form submission
  let formSubmittedNatively = false;
  form.addEventListener('submit', (e) => {
    if (!e.defaultPrevented) {
      formSubmittedNatively = true;
    }
  });

  // Click the submit button
  btn.click();
  
  await new Promise(r => setTimeout(r, 500));
  
  console.log('[Test] Form submitted natively (page reload)?', formSubmittedNatively);
  console.log('[Test] Invoices in state:', window.state.invoices.length);
  if (window.state.invoices.length > 0) {
    console.log('[Test] Invoice ID:', window.state.invoices[0].id);
  }
});
