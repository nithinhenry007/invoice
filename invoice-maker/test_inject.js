// Test Invoice Creator - Run this in browser console to inject test data
// This creates a sample invoice and company profile in localStorage

(function() {
  const userId = 'usr_testuser';
  
  // 1. Set company settings
  const settings = {
    user_id: userId,
    company_name: 'NISSI ENTERPRISES',
    gstin: '36AABCN1234A1Z5',
    company_address: 'Ramanthapur, Hyderabad, Telangana - 500013',
    tagline: 'FRP MANUFACTURERS',
    phone: '+91 98765 43210',
    email: 'billing@nissi.com',
    bank_name: 'State Bank of India',
    account_no: '1234567890',
    ifsc_code: 'SBIN0001234',
    upi_id: 'nissi@sbi',
    invoice_prefix: 'INV',
    default_gst_rate: 18,
    currency_symbol: '₹',
    default_terms: 'Advance of 50% of order value along with purchase order. Balance at the time of Delivery.',
    updated_at: new Date().toISOString()
  };
  localStorage.setItem(`invoice_settings_${userId}`, JSON.stringify(settings));
  
  // 2. Create a sample invoice
  const testInvoice = {
    id: 'inv_test_001',
    user_id: userId,
    document_type: 'INVOICE',
    invoice_number: 'INV-2026-0001',
    invoice_name: 'FRP Tank Supply - Oct 2026',
    invoice_date: '2026-10-01',
    due_date: '2026-10-15',
    status: 'draft',
    client_name: 'ABC Industries Pvt Ltd',
    client_address: 'Plot No 45, Industrial Area, Pune - 411001',
    client_gstin: '27AABCA1234A1Z5',
    client_phone: '+91 98765 00001',
    client_email: 'purchase@abcindustries.com',
    ship_address: 'Plot No 45, Industrial Area, Pune - 411001',
    subject: 'Supply of FRP TANK 35KL',
    opener: 'Dear Customer,\nThank you for doing business with us. Please find below the detailed invoice for the products/services provided as per agreed terms:',
    closer: 'Thank you for your business! We appreciate your prompt payment.\nWarm regards,',
    gst_type: 'cgst_sgst',
    gst_rate: 18,
    discount: 0,
    subtotal: 150000,
    gst_amount: 27000,
    total: 177000,
    notes: 'Delivery within 30 days from receipt of advance payment.',
    terms: 'Advance of 50% of order value along with purchase order. Balance at the time of Delivery.',
    specifications: 'FRP Tank 35KL capacity, vertical cylindrical, open top with lid, UV stabilized.',
    items: [
      {
        description: 'FRP TANK 35KL - Vertical Cylindrical, Open Top with Lid',
        hsn_code: '3925',
        quantity: 1,
        unit: 'nos',
        unit_price: 150000,
        amount: 150000
      }
    ],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  
  const invoices = [testInvoice];
  localStorage.setItem(`invoice_data_${userId}`, JSON.stringify(invoices));
  
  // 3. Set user session
  const user = {
    id: userId,
    email: 'testuser@app.local',
    username: 'testuser',
    name: 'Test User'
  };
  localStorage.setItem('current_user_session', JSON.stringify(user));
  
  console.log('✅ Test data injected successfully!');
  console.log('Settings:', settings.company_name);
  console.log('Invoice:', testInvoice.invoice_number);
  console.log('\nRefresh the page to see the dashboard with test data.');
  alert('Test data injected! Click OK then refresh the page to see your test invoice.');
})();
