// ============================================
// INVOICES — CRUD & DASHBOARD (Client Isolated)
// ============================================

function getInvoicesKey() {
  const userId = state.user?.id || 'guest';
  return `invoice_data_${userId}`;
}

async function loadInvoices() {
  if (!state.user) {
    state.invoices = [];
    return;
  }

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        state.invoices = data.map(inv => ({
          ...inv,
          items: inv.invoice_items || []
        }));
        return;
      }
    } catch (err) {
      console.warn('Failed to load invoices from Supabase:', err);
    }
  }

  const saved = localStorage.getItem(getInvoicesKey()) || localStorage.getItem('invoice_data_guest') || localStorage.getItem('invoice_data');
  try {
    state.invoices = saved ? JSON.parse(saved) : [];
  } catch (e) {
    state.invoices = [];
  }
  if (!Array.isArray(state.invoices)) {
    state.invoices = [];
  }
  if (saved && !localStorage.getItem(getInvoicesKey())) {
    localStorage.setItem(getInvoicesKey(), JSON.stringify(state.invoices));
  }
}

// ============================================
// OPENER & CLOSER PRESETS FOR QUOTATION / INVOICE
// ============================================
const OPENER_PRESETS = {
  'quote_std': {
    name: 'Quotation — Standard Greeting',
    text: `Dear Sirs,\nWe thank you for your valued Enquiry for supply of items listed below.\nIn this context, we are pleased to submit our best Quote for supply of the same on Commercial Terms & Conditions noted hereunder:`
  },
  'quote_formal': {
    name: 'Quotation — Formal Business',
    text: `Dear Sir / Madam,\nWith reference to your esteemed requirement, we take pleasure in submitting our formal price quotation for your kind consideration:`
  },
  'inv_std': {
    name: 'Invoice — Standard Greeting',
    text: `Dear Customer,\nThank you for doing business with us. Please find below the detailed invoice for the products/services provided as per agreed terms:`
  }
};

const CLOSER_PRESETS = {
  'quote_std': {
    name: 'Quotation — Standard Closing',
    text: `We hope you find our Quote to be in order and look forward to an opportunity of serving you very soon.\nThanking you, we remain,\nYours faithfully,`
  },
  'quote_formal': {
    name: 'Quotation — Formal Closing',
    text: `Should you require any further clarification or technical information, please feel free to contact us.\nAssuring you of our best attention and services at all times.\nSincerely,`
  },
  'inv_std': {
    name: 'Invoice — Standard Closing',
    text: `Thank you for your business! We appreciate your prompt payment.\nWarm regards,`
  }
};

function applyOpenerPreset(presetKey) {
  if (OPENER_PRESETS[presetKey]) {
    document.getElementById('inv-opener').value = OPENER_PRESETS[presetKey].text;
  }
}

function applyCloserPreset(presetKey) {
  if (CLOSER_PRESETS[presetKey]) {
    document.getElementById('inv-closer').value = CLOSER_PRESETS[presetKey].text;
  }
}

function onDocTypeChange() {
  const docType = document.getElementById('inv-doc-type').value;
  const openerEl = document.getElementById('inv-opener');
  const closerEl = document.getElementById('inv-closer');
  const subjectEl = document.getElementById('inv-subject');

  if (docType === 'QUOTATION') {
    if (!openerEl.value || openerEl.value.includes('Dear Customer')) {
      applyOpenerPreset('quote_std');
      document.getElementById('preset-opener-select').value = 'quote_std';
    }
    if (!closerEl.value || closerEl.value.includes('Thank you for your business')) {
      applyCloserPreset('quote_std');
      document.getElementById('preset-closer-select').value = 'quote_std';
    }
    if (!subjectEl.value) {
      subjectEl.value = 'Subject: Quote for supply of Goods / Services';
    }
  } else if (docType === 'INVOICE' || docType === 'PROFORMA INVOICE') {
    if (!openerEl.value || openerEl.value.includes('valued Enquiry')) {
      applyOpenerPreset('inv_std');
      document.getElementById('preset-opener-select').value = 'inv_std';
    }
    if (!closerEl.value || closerEl.value.includes('look forward to an opportunity')) {
      applyCloserPreset('inv_std');
      document.getElementById('preset-closer-select').value = 'inv_std';
    }
    if (subjectEl.value.startsWith('Subject: Quote')) {
      subjectEl.value = '';
    }
  }
}

async function startNewInvoice() {
  try {
    if (!isCompanyProfileComplete()) {
      // Show onboarding modal but allow skipping
      showOnboardingModal();
      return;
    }
    _openNewInvoiceForm();
  } catch (err) {
    console.error(err);
    showToast('Error starting new invoice: ' + err.message, 'error');
  }
}

function skipOnboardingAndCreateInvoice() {
  closeOnboardingModal();
  _openNewInvoiceForm();
}

function _openNewInvoiceForm() {
  try {
    state.currentInvoiceId = null;
    document.getElementById('invoice-form-title').textContent = 'New Document';
    document.getElementById('invoice-form-subtitle').textContent = 'Create a professional quotation or invoice';
    document.getElementById('invoice-form').reset();

    // Set defaults
    document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('inv-discount').value = 0;
    document.getElementById('inv-doc-type').value = 'QUOTATION';
    document.getElementById('inv-specs').value = '';
    document.getElementById('inv-subject').value = '';
    document.getElementById('inv-opener').value = '';
    document.getElementById('inv-closer').value = '';

    // Ensure cgst_sgst is checked (default)
    const defaultGstRadio = document.querySelector('input[name="gst-type"][value="cgst_sgst"]');
    if (defaultGstRadio) defaultGstRadio.checked = true;

    onDocTypeChange();

    // Pre-fill terms from settings
    if (state.settings?.default_terms) {
      document.getElementById('inv-terms').value = state.settings.default_terms;
    }

    // Set default GST rate from settings
    if (state.settings?.default_gst_rate != null) {
      const rateSelect = document.getElementById('inv-gst-rate');
      const rate = String(state.settings.default_gst_rate);
      for (let opt of rateSelect.options) {
        if (opt.value === rate) { opt.selected = true; break; }
      }
    }

    // Get next invoice number
    const prefix = state.settings?.invoice_prefix || 'INV';
    const year = new Date().getFullYear();
    const count = (Array.isArray(state.invoices) ? state.invoices.length : 0) + 1;
    const invNumEl = document.getElementById('inv-number');
    if (invNumEl) invNumEl.value = `${prefix}-${year}-${String(count).padStart(4, '0')}`;

    // Clear items and add one empty row
    const tbody = document.getElementById('items-tbody');
    if (tbody) tbody.innerHTML = '';
    if (typeof addItemRow === 'function') addItemRow();
    if (typeof recalculateTotals === 'function') recalculateTotals();
    navigateTo('invoice-form');
    const formNavItem = document.querySelector('.nav-item[data-view="invoice-form"]');
    if (formNavItem) formNavItem.classList.add('active');

    if (!isCompanyProfileComplete()) {
      showToast('Tip: Go to Settings to set your company name for professional invoices.', 'info');
    }
  } catch (err) {
    console.error('_openNewInvoiceForm error:', err);
    showToast('Error opening invoice form: ' + err.message, 'error');
  }
}


function duplicateInvoice(invoiceId) {
  const original = state.invoices.find(i => i.id === invoiceId);
  if (!original) return;

  state.currentInvoiceId = null; // New invoice
  document.getElementById('invoice-form-title').textContent = 'New Document (Template)';
  document.getElementById('invoice-form-subtitle').textContent = 'Cloned from ' + original.invoice_number;

  // Basic Details
  document.getElementById('inv-name').value = original.invoice_name ? original.invoice_name + ' (Copy)' : '';
  document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('inv-due-date').value = '';
  const statusEl = document.getElementById('inv-status');
  if (statusEl) statusEl.value = 'draft';
  document.getElementById('inv-doc-type').value = original.document_type || 'QUOTATION';
  document.getElementById('inv-subject').value = original.subject || '';
  document.getElementById('inv-opener').value = original.opener || '';
  document.getElementById('inv-closer').value = original.closer || '';

  // Client Details
  document.getElementById('inv-client-name').value = original.client_name || '';
  document.getElementById('inv-client-gstin').value = original.client_gstin || '';
  document.getElementById('inv-client-address').value = original.client_address || '';
  document.getElementById('inv-ship-address').value = original.ship_address || '';
  document.getElementById('inv-client-phone').value = original.client_phone || '';
  document.getElementById('inv-client-email').value = original.client_email || '';

  // Notes & terms
  document.getElementById('inv-notes').value = original.notes || '';
  document.getElementById('inv-terms').value = original.terms || '';
  document.getElementById('inv-specs').value = original.specifications || '';
  document.getElementById('inv-discount').value = original.discount || 0;

  // GST
  const gstRadio = document.querySelector(`input[name="gst-type"][value="${original.gst_type}"]`);
  if (gstRadio) gstRadio.checked = true;
  document.getElementById('inv-gst-rate').value = original.gst_rate || 0;

  // Invoice Number generator
  const prefix = state.settings?.invoice_prefix || 'INV';
  const year = new Date().getFullYear();
  const count = state.invoices.length + 1;
  document.getElementById('inv-number').value = `${prefix}-${year}-${String(count).padStart(4, '0')}`;

  // Items
  document.getElementById('items-tbody').innerHTML = '';
  if (original.items && original.items.length > 0) {
    original.items.forEach(item => addItemRow(item));
  } else {
    addItemRow();
  }

  recalculateTotals();
  navigateTo('invoice-form');
}

async function editInvoice(invoiceId) {
  state.currentInvoiceId = invoiceId;
  const invoice = state.invoices.find(i => i.id === invoiceId);
  if (!invoice) return;

  document.getElementById('invoice-form-title').textContent = 'Edit Document';
  document.getElementById('invoice-form-subtitle').textContent = invoice.invoice_number;

  document.getElementById('inv-name').value = invoice.invoice_name || '';
  document.getElementById('inv-number').value = invoice.invoice_number;
  document.getElementById('inv-date').value = invoice.invoice_date;
  document.getElementById('inv-due-date').value = invoice.due_date || '';
  const statusEl = document.getElementById('inv-status');
  if (statusEl) statusEl.value = invoice.status;
  document.getElementById('inv-client-name').value = invoice.client_name;
  document.getElementById('inv-client-address').value = invoice.client_address || '';
  document.getElementById('inv-client-gstin').value = invoice.client_gstin || '';
  document.getElementById('inv-client-phone').value = invoice.client_phone || '';
  document.getElementById('inv-client-email').value = invoice.client_email || '';
  document.getElementById('inv-ship-address').value = invoice.ship_address || '';
  document.getElementById('inv-notes').value = invoice.notes || '';
  document.getElementById('inv-terms').value = invoice.terms || '';
  document.getElementById('inv-discount').value = invoice.discount || 0;
  document.getElementById('inv-doc-type').value = invoice.document_type || 'QUOTATION';
  document.getElementById('inv-specs').value = invoice.specifications || '';
  document.getElementById('inv-subject').value = invoice.subject || '';
  document.getElementById('inv-opener').value = invoice.opener || '';
  document.getElementById('inv-closer').value = invoice.closer || '';

  // GST
  const gstRadio = document.querySelector(`input[name="gst-type"][value="${invoice.gst_type}"]`);
  if (gstRadio) gstRadio.checked = true;
  const rateSelect = document.getElementById('inv-gst-rate');
  for (let opt of rateSelect.options) {
    if (opt.value === String(invoice.gst_rate)) { opt.selected = true; break; }
  }

  // Load items
  const items = invoice.items || [];

  document.getElementById('items-tbody').innerHTML = '';
  if (items && items.length > 0) {
    items.forEach(item => addItemRow(item));
  } else {
    addItemRow();
  }

  recalculateTotals();
  navigateTo('invoice-form');
}

async function saveInvoice(e) {
  if (e) e.preventDefault();

  const btn = document.getElementById('save-invoice-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';
  }

  // Get GST type safely
  const gstTypeEl = document.querySelector('input[name="gst-type"]:checked');
  if (!gstTypeEl) {
    showToast('Please select a GST type', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Invoice'; }
    return null;
  }

  const gstType = gstTypeEl.value;
  const gstRate = parseFloat(document.getElementById('inv-gst-rate').value) || 0;
  const discount = parseFloat(document.getElementById('inv-discount').value) || 0;
  const items = getItemsFromForm();
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxableAmount = subtotal - discount;

  let gstAmount = 0;
  if (gstType !== 'none') {
    gstAmount = taxableAmount * gstRate / 100;
  }
  const total = taxableAmount + gstAmount;

  const invoiceData = {
    user_id: state.user?.id || 'guest',
    document_type: document.getElementById('inv-doc-type').value || 'QUOTATION',
    specifications: document.getElementById('inv-specs').value,
    subject: document.getElementById('inv-subject').value,
    opener: document.getElementById('inv-opener').value,
    closer: document.getElementById('inv-closer').value,
    invoice_number: document.getElementById('inv-number').value,
    invoice_name: document.getElementById('inv-name').value,
    client_name: document.getElementById('inv-client-name').value,
    client_address: document.getElementById('inv-client-address').value,
    client_gstin: document.getElementById('inv-client-gstin').value,
    client_phone: document.getElementById('inv-client-phone').value,
    client_email: document.getElementById('inv-client-email').value,
    ship_address: document.getElementById('inv-ship-address').value,
    invoice_date: document.getElementById('inv-date').value,
    due_date: document.getElementById('inv-due-date').value || null,
    gst_type: gstType,
    gst_rate: gstRate,
    discount: parseFloat(discount.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    gst_amount: parseFloat(gstAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    notes: document.getElementById('inv-notes').value,
    terms: document.getElementById('inv-terms').value,
    status: document.getElementById('inv-status')?.value || 'draft',
    updated_at: new Date().toISOString()
  };

  try {
    const invoiceId = state.currentInvoiceId || 'inv_' + Date.now();
    invoiceData.id = invoiceId;
    invoiceData.items = items;

    if (!Array.isArray(state.invoices)) state.invoices = [];

    if (state.currentInvoiceId) {
      const idx = state.invoices.findIndex(i => i.id === state.currentInvoiceId);
      if (idx >= 0) state.invoices[idx] = invoiceData;
      else state.invoices.unshift(invoiceData);
    } else {
      state.invoices.unshift(invoiceData);
    }

    state.currentInvoiceId = invoiceId;
    localStorage.setItem(getInvoicesKey(), JSON.stringify(state.invoices));

    if (typeof pushCloudUserData === 'function') pushCloudUserData();

    if (supabaseClient && state.user?.id) {
      try {
        const { items: invoiceItemsList, ...invRecord } = invoiceData;
        await supabaseClient
          .from('invoices')
          .upsert({
            ...invRecord,
            user_id: state.user.id
          });
        await supabaseClient.from('invoice_items').delete().eq('invoice_id', invoiceId);
        if (Array.isArray(invoiceItemsList) && invoiceItemsList.length > 0) {
          const itemsData = invoiceItemsList.map((item, idx) => ({
            invoice_id: invoiceId,
            item_order: idx,
            description: item.description || '',
            hsn_code: item.hsn_code || '',
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'pcs',
            unit_price: parseFloat(item.unit_price) || 0,
            amount: parseFloat(item.amount) || 0
          }));
          await supabaseClient.from('invoice_items').insert(itemsData);
        }
      } catch (sbErr) {
        console.warn('Supabase invoice sync notice:', sbErr.message);
      }
    }

    showToast('Invoice saved successfully!', 'success');

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Invoice';
    }

    // Navigate to preview immediately if triggered directly by the Save Invoice button (e is present)
    if (e && typeof showInvoicePreview === 'function') {
      showInvoicePreview(invoiceId);
    }

    return invoiceId;
  } catch (err) {
    console.error('saveInvoice error:', err);
    showToast('Failed to save invoice: ' + (err.message || 'Storage error'), 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Invoice';
    }
    return null;
  }
}

async function saveAndPreview() {
  const form = document.getElementById('invoice-form');
  if (form && !form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const invoiceId = await saveInvoice();
  if (invoiceId) {
    await showInvoicePreview(invoiceId);
  }
}

// ============================================
// DELETE
// ============================================
let invoiceToDelete = null;

function promptDeleteInvoice(invoiceId) {
  invoiceToDelete = invoiceId;
  document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
  invoiceToDelete = null;
  document.getElementById('delete-modal').classList.remove('active');
}

async function confirmDeleteInvoice() {
  if (!invoiceToDelete) return;
  try {
    state.invoices = state.invoices.filter(i => i.id !== invoiceToDelete);
    localStorage.setItem(getInvoicesKey(), JSON.stringify(state.invoices));

    if (supabaseClient && state.user?.id) {
      await supabaseClient
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete)
        .eq('user_id', state.user.id);
    }

    renderDashboard();
    showToast('Invoice deleted', 'success');
  } catch (err) {
    showToast('Failed to delete invoice', 'error');
  }
  closeDeleteModal();
}

// ============================================
// DASHBOARD
// ============================================
function renderDashboard() {
  const invoices = state.invoices;
  const currency = getCurrency();

  document.getElementById('stat-total').textContent = invoices.length;

  const paidTotal = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  document.getElementById('stat-revenue').textContent = currency + formatNumber(paidTotal);

  const pendingCount = invoices.filter(i => i.status !== 'paid').length;
  document.getElementById('stat-pending').textContent = pendingCount;

  const now = new Date();
  const thisMonth = invoices.filter(i => {
    const d = new Date(i.invoice_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  document.getElementById('stat-month').textContent = thisMonth;

  filterInvoices();
}

function filterInvoices() {
  const search = (document.getElementById('search-input').value || '').toLowerCase();
  const filter = state.filter;
  const currency = getCurrency();

  let filtered = state.invoices;
  if (filter !== 'all') filtered = filtered.filter(i => i.status === filter);
  if (search) {
    filtered = filtered.filter(i =>
      (i.invoice_number || '').toLowerCase().includes(search) ||
      (i.invoice_name || '').toLowerCase().includes(search) ||
      (i.client_name || '').toLowerCase().includes(search)
    );
  }

  const tbody = document.getElementById('invoices-tbody');
  const emptyState = document.getElementById('empty-state');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = filtered.map(inv => `
    <tr>
      <td><span class="font-mono" style="font-size:0.85rem;">${escapeHtml(inv.invoice_number)}</span></td>
      <td>${escapeHtml(inv.invoice_name || '—')}</td>
      <td>${escapeHtml(inv.client_name)}</td>
      <td style="color:var(--text-secondary);font-size:0.88rem;">${formatDate(inv.invoice_date)}</td>
      <td style="font-weight:600;">${currency}${formatNumber(inv.total)}</td>
      <td><span class="status-badge ${inv.status}">${inv.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn" title="Preview" onclick="showInvoicePreview('${inv.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="action-btn" title="Edit" onclick="editInvoice('${inv.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn" title="Duplicate (Save as Template)" onclick="duplicateInvoice('${inv.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button class="action-btn" title="Download PDF" onclick="downloadInvoicePDF('${inv.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="action-btn delete" title="Delete" onclick="promptDeleteInvoice('${inv.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  filterInvoices();
}
