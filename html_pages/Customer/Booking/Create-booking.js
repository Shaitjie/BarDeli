// create-booking.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://fawlfsukrqrucrrxrjvq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhd2xmc3VrcnFydWNycnhyanZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzU2OTUsImV4cCI6MjA3MTAxMTY5NX0.KGH5SAJvCEhnz3NHdp6LeMgCvZp-nP1Tj6oIL32J6K8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Clear previous booking data when booking page loads
localStorage.removeItem('selectedFixedMenus');
localStorage.removeItem('selectedMenuItems');
localStorage.removeItem('selectedExtras');
localStorage.removeItem('bookingTotal');
localStorage.removeItem('depositPaid');

let menus = [];
let menuItems = [];
let extras = [];

let selectedFixedMenus = [];     
let selectedMenuItems = [];    
let selectedExtras = [];       
let steps, currentStep = 0;

async function initializeBooking() {
  menus = await fetchMenus();
  menuItems = await fetchMenuItems();
  extras = await fetchExtraItems();

  renderFixedMenus();
  renderExtras();
  setupSteps();
}

function $id(id) { return document.getElementById(id); }

function showToast(message) {
  const toast = $id('toast');
  const toastMessage = $id('toastMessage');
  if (!toast || !toastMessage) return;
  toastMessage.innerText = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

//Fetching
async function fetchMenus() {
  const { data, error } = await supabase
    .from('menu')
    .select('menu_id, menu_name, description, menu_price')
    .order('menu_name', { ascending: true });

  if (error) {
    console.error('Error fetching menus:', error);
    return [];
  }
  return data || [];
}

async function fetchMenuItems() {
  const { data, error } = await supabase
    .from('menu_item')
    .select('menu_item_id, item_name, description, item_price, category')
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('item_name', { ascending: true });

  if (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }
  return data || [];
}

async function fetchExtraItems() {
  const { data, error } = await supabase
    .from('extra')
    .select('extra_id, extra_name, description, extra_price')
    .eq('is_available', true)
    .order('extra_name', { ascending: true });

  if (error) {
    console.error('Error fetching extras:', error);
    return [];
  }
  return data || [];
}

/* -------------------------
   Render functions
   ------------------------- */
function renderFixedMenus() {
  const menuList = $id('menuList');
  if (!menuList) return;
  menuList.innerHTML = '';

  // Fixed menu cards
  menus.forEach(menu => {
    const card = document.createElement('div');
    card.className = 'p-4 border rounded hover:shadow cursor-pointer flex flex-col justify-between';
    card.dataset.menuId = menu.menu_id;
    card.innerHTML = `
      <div>
        <h3 class="font-bold text-lg">${escapeHtml(menu.menu_name)}</h3>
        <p class="text-sm text-gray-600 mt-1">${escapeHtml(menu.description || '')}</p>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <span class="font-semibold">R${parseFloat(menu.menu_price).toFixed(2)} / person</span>
        <button class="px-3 py-1 bg-orange-600 text-white rounded select-menu-btn">Select</button>
      </div>
    `;

    // click handler
    card.querySelector('.select-menu-btn').addEventListener('click', (e) => {
      e.preventDefault();
      toggleFixedMenu(menu);
    });

    menuList.appendChild(card);
  });

  // Custom menu card - opens modal
  const customCard = document.createElement('div');
  customCard.className = 'p-4 border rounded hover:shadow cursor-pointer';
  customCard.innerHTML = `
    <h3 class="font-bold text-lg">Custom Menu</h3>
    <p class="text-sm text-gray-600 mt-1">Select individual items and quantities</p>
    <div class="mt-3">
      <button id="openCustomMenu" class="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-500">
        Open Custom Menu
      </button>
    </div>
  `;
  menuList.appendChild(customCard);

  // Open modal
  $id('openCustomMenu')?.addEventListener('click', () => {
    const modal = $id('customMenuModal');
    const content = $id('customMenuContent');
    if (modal && content) {
      renderCustomMenuItems(content);
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  });
   
  // mark already selected fixed menus visually
  updateFixedMenuSelectionUI();
}

function renderCustomMenuItems(container) {
  // group by category
  const groups = menuItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  container.innerHTML = '';
  Object.keys(groups).forEach(category => {
    const catDiv = document.createElement('div');
    catDiv.className = 'mb-4';
    catDiv.innerHTML = `<h4 class="text-md font-bold mb-2">${escapeHtml(category)}</h4>`;
    const list = document.createElement('div');
    list.className = 'space-y-2';
    groups[category].forEach(item => {
      const itemRow = document.createElement('div');
      itemRow.className = 'flex items-center justify-between border p-2 rounded';
      itemRow.innerHTML = `
        <div>
          <div class="font-medium">${escapeHtml(item.item_name)}</div>
          <div class="text-sm text-gray-600">R${parseFloat(item.item_price || 0).toFixed(2)}</div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="px-2 py-1 bg-gray-200 rounded qty-decrease" data-id="${item.menu_item_id}">−</button>
          <input class="w-16 text-center border rounded qty-input" type="number" min="0" value="0" data-id="${item.menu_item_id}" />
          <button class="px-2 py-1 bg-gray-200 rounded qty-increase" data-id="${item.menu_item_id}">＋</button>
        </div>
      `;
      // attach events
      itemRow.querySelector('.qty-input').addEventListener('input', (e) => {
        const q = parseInt(e.target.value || '0', 10);
        updateMenuItemQuantity(item, Math.max(0, isNaN(q) ? 0 : q));
      });
      itemRow.querySelector('.qty-decrease').addEventListener('click', () => {
        const input = itemRow.querySelector('.qty-input');
        const newVal = Math.max(0, parseInt(input.value || '0', 10) - 1);
        input.value = newVal;
        updateMenuItemQuantity(item, newVal);
      });
      itemRow.querySelector('.qty-increase').addEventListener('click', () => {
        const input = itemRow.querySelector('.qty-input');
        const newVal = parseInt(input.value || '0', 10) + 1;
        input.value = newVal;
        updateMenuItemQuantity(item, newVal);
      });

      list.appendChild(itemRow);
    });
    catDiv.appendChild(list);
    container.appendChild(catDiv);
  });

  // initialize inputs from state
  selectedMenuItems.forEach(sel => {
    const el = container.querySelector(`.qty-input[data-id="${sel.menu_item_id}"]`);
    if (el) el.value = sel.quantity;
  });
}

function renderExtras() {
  const extrasList = $id('extrasList');
  if (!extrasList) return;
  extrasList.innerHTML = '';

  extras.forEach(item => {
    const container = document.createElement('div');
    container.className = 'flex items-center justify-between border p-2 rounded';
    container.dataset.extraId = item.extra_id;
    container.innerHTML = `
      <div>
        <div class="font-medium">${escapeHtml(item.extra_name)}</div>
        <div class="text-sm text-gray-600">${escapeHtml(item.description || '')}</div>
      </div>
      <div class="flex items-center space-x-2">
        <input type="checkbox" class="extra-checkbox" data-id="${item.extra_id}" />
        <input type="number" class="w-16 text-center extra-qty hidden" data-id="${item.extra_id}" min="1" value="1" />
      </div>
    `;

    // checkbox behavior: show qty when checked
    const checkbox = container.querySelector('.extra-checkbox');
    const qtyInput = container.querySelector('.extra-qty');
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        qtyInput.classList.remove('hidden');
        addExtraSelection(item, parseInt(qtyInput.value || '1', 10));
        showToast(`${item.extra_name} added`);
      } else {
        qtyInput.classList.add('hidden');
        removeExtraSelection(item.extra_id);
        showToast(`${item.extra_name} removed`);
      }
    });
    qtyInput.addEventListener('input', (e) => {
      const q = Math.max(1, parseInt(e.target.value || '1', 10));
      e.target.value = q;
      updateExtraQuantity(item.extra_id, q);
    });

    extrasList.appendChild(container);
  });

  // restore checks from state
  selectedExtras.forEach(sel => {
    const cb = extrasList.querySelector(`.extra-checkbox[data-id="${sel.extra_id}"]`);
    const qinp = extrasList.querySelector(`.extra-qty[data-id="${sel.extra_id}"]`);
    if (cb) cb.checked = true;
    if (qinp) { qinp.classList.remove('hidden'); qinp.value = sel.quantity; }
  });
}

function toggleFixedMenu(menu) {
  const idx = selectedFixedMenus.findIndex(m => +m.menu_id === +menu.menu_id);
  if (idx === -1) {
    selectedFixedMenus.push({
      menu_id: menu.menu_id,
      menu_name: menu.menu_name,
      menu_price: parseFloat(menu.menu_price || 0)
    });
    showToast(`${menu.menu_name} selected`);
  } else {
    selectedFixedMenus.splice(idx, 1);
    showToast(`${menu.menu_name} removed`);
  }
  updateFixedMenuSelectionUI();
  saveSelectionsToLocal();
}

function updateFixedMenuSelectionUI() {
  const menuCards = document.querySelectorAll('#menuList > div.p-4.border');
  menuCards.forEach(card => {
    const menuId = card.dataset.menuId;
    if (!menuId) return;
    const isSelected = selectedFixedMenus.some(m => +m.menu_id === +menuId);
    card.classList.toggle('ring-2', isSelected);
    card.classList.toggle('ring-orange-500', isSelected);
  });
  // also update any selected count UI if needed
}

function updateMenuItemQuantity(item, quantity) {
  quantity = parseInt(quantity || 0, 10);
  const idx = selectedMenuItems.findIndex(si => +si.menu_item_id === +item.menu_item_id);
  if (quantity <= 0) {
    if (idx !== -1) selectedMenuItems.splice(idx, 1);
  } else {
    const payload = {
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      item_price: parseFloat(item.item_price || 0),
      category: item.category || 'Other',
      quantity
    };
    if (idx === -1) selectedMenuItems.push(payload);
    else selectedMenuItems[idx] = payload;
  }
  saveSelectionsToLocal();
  showToast(`${item.item_name} set to ${quantity}`);
}

function addExtraSelection(item, quantity=1) {
  quantity = Math.max(1, parseInt(quantity || 1, 10));
  const idx = selectedExtras.findIndex(e => +e.extra_id === +item.extra_id);
  const payload = { extra_id: item.extra_id, extra_name: item.extra_name, extra_price: parseFloat(item.extra_price || 0), quantity };
  if (idx === -1) selectedExtras.push(payload);
  else selectedExtras[idx] = payload;
  saveSelectionsToLocal();
}

function removeExtraSelection(extra_id) {
  const idx = selectedExtras.findIndex(e => +e.extra_id === +extra_id);
  if (idx !== -1) selectedExtras.splice(idx, 1);
  saveSelectionsToLocal();
}

function updateExtraQuantity(extra_id, qty) {
  const idx = selectedExtras.findIndex(e => +e.extra_id === +extra_id);
  if (idx !== -1) {
    selectedExtras[idx].quantity = Math.max(1, parseInt(qty || 1, 10));
    saveSelectionsToLocal();
  }
}

// Summary population
function populateSummary() {
  const summaryDiv = $id('summaryDetails');
  if (!summaryDiv) return;
  summaryDiv.innerHTML = '';

  // Basic event details
  summaryDiv.innerHTML += `<p><strong>Event Name:</strong> ${escapeHtml($id('eventName')?.value || 'Not specified')}</p>`;
  summaryDiv.innerHTML += `<p><strong>Date:</strong> ${escapeHtml($id('eventDate')?.value || 'Not specified')}</p>`;
  summaryDiv.innerHTML += `<p><strong>Time:</strong> ${escapeHtml($id('eventTime')?.value || 'Not specified')}</p>`;
  summaryDiv.innerHTML += `<p><strong>Type:</strong> ${escapeHtml($id('eventType')?.value || 'Not specified')}</p>`;
  summaryDiv.innerHTML += `<p><strong>Guests:</strong> ${escapeHtml($id('guests')?.value || 'Not specified')}</p>`;
  summaryDiv.innerHTML += `<p><strong>Address:</strong> ${escapeHtml($id('address')?.value || 'Not specified')}</p>`;

  // Fixed menus
  if (selectedFixedMenus.length > 0) {
    summaryDiv.innerHTML += `<p class="mt-2"><strong>Fixed Menus Selected:</strong></p>`;
    selectedFixedMenus.forEach(m => {
      summaryDiv.innerHTML += `<p class="ml-4">• ${escapeHtml(m.menu_name)} - R${m.menu_price.toFixed(2)} / person</p>`;
    });
  } else {
    summaryDiv.innerHTML += `<p class="mt-2"><strong>Fixed Menus Selected:</strong> None</p>`;
  }

  // Custom items
  if (selectedMenuItems.length > 0) {
    summaryDiv.innerHTML += `<p class="mt-2"><strong>Custom Menu Items Selected:</strong></p>`;
    selectedMenuItems.forEach(it => {
      const lineTotal = (parseFloat(it.item_price || 0) * (it.quantity || 0));
      summaryDiv.innerHTML += `<p class="ml-4">• ${escapeHtml(it.quantity + '× ' + it.item_name)} - R${lineTotal.toFixed(2)}</p>`;
    });
  } else {
    summaryDiv.innerHTML += `<p class="mt-2"><strong>Custom Menu Items Selected:</strong> None</p>`;
  }

  // Extras
  if (selectedExtras.length > 0) {
    summaryDiv.innerHTML += `<p class="mt-2"><strong>Extras Selected:</strong></p>`;
    selectedExtras.forEach(ex => {
      const exTotal = parseFloat(ex.extra_price || 0) * (ex.quantity || 1);
      summaryDiv.innerHTML += `<p class="ml-4">• ${escapeHtml(ex.quantity + '× ' + ex.extra_name)} - R${exTotal.toFixed(2)}</p>`;
    });
  } else {
    summaryDiv.innerHTML += `<p class="mt-2"><strong>Extras Selected:</strong> None</p>`;
  }

  // Totals calculation
  const guests = parseInt($id('guests')?.value || '1', 10) || 1;

  // fixed menus are per-person prices
  const fixedMenusTotalPerPerson = selectedFixedMenus.reduce((sum, m) => sum + parseFloat(m.menu_price || 0), 0);
  const fixedTotal = fixedMenusTotalPerPerson * guests;

  // custom items are absolute totals defined by quantity * item_price
  const customTotal = selectedMenuItems.reduce((sum, it) => sum + (parseFloat(it.item_price || 0) * (it.quantity || 0)), 0);

  const extrasTotal = selectedExtras.reduce((sum, ex) => sum + (parseFloat(ex.extra_price || 0) * (ex.quantity || 1)), 0);

  const grandTotal = fixedTotal + customTotal + extrasTotal;
  const deposit = grandTotal * 0.5;

  // save for submit
  localStorage.setItem('bookingTotal', grandTotal.toFixed(2));
  localStorage.setItem('depositPaid', deposit.toFixed(2));
  localStorage.setItem('selectedFixedMenus', JSON.stringify(selectedFixedMenus));
  localStorage.setItem('selectedMenuItems', JSON.stringify(selectedMenuItems));
  localStorage.setItem('selectedExtras', JSON.stringify(selectedExtras));

  summaryDiv.innerHTML += `<hr class="my-4">`;
  summaryDiv.innerHTML += `<p><strong>Menu Subtotal (fixed):</strong> R${fixedTotal.toFixed(2)}</p>`;
  summaryDiv.innerHTML += `<p><strong>Custom Items Subtotal:</strong> R${customTotal.toFixed(2)}</p>`;
  summaryDiv.innerHTML += `<p><strong>Extras Subtotal:</strong> R${extrasTotal.toFixed(2)}</p>`;
  summaryDiv.innerHTML += `<p class="text-lg"><strong>Total Amount:</strong> R${grandTotal.toFixed(2)}</p>`;
  summaryDiv.innerHTML += `<p class="text-lg text-orange-600"><strong>Deposit Required (50%):</strong> R${deposit.toFixed(2)}</p>`;
}

function populatePaymentSummary() {
  const total = parseFloat(localStorage.getItem('bookingTotal') || '0') || 0;
  const deposit = parseFloat(localStorage.getItem('depositPaid') || '0') || 0;
  $id('totalAmount') && ($id('totalAmount').innerText = total.toFixed(2));
  $id('depositAmount') && ($id('depositAmount').innerText = deposit.toFixed(2));
}

// Step navigation
function setupSteps() {
  steps = document.querySelectorAll('.step');
  if (!steps || steps.length === 0) return;
  currentStep = 0;
  showStep(currentStep);

  // Next / Prev are wired in HTML to call nextStep() / prevStep()
}
function showStep(index) {
  steps.forEach((s, i) => s.classList.toggle('hidden', i !== index));
  $id('stepText') && ($id('stepText').innerText = `Step ${index + 1} of ${steps.length}`);
  $id('progressBar') && ($id('progressBar').style.width = `${((index + 1) / steps.length) * 100}%`);
}

function validateStep(index) {
  let isValid = true;

  // clear old errors
  document.querySelectorAll('.error-text').forEach(e => e.remove());
  document.querySelectorAll('.border-red-500').forEach(e => e.classList.remove('border-red-500'));

  if (index === 0) {
    // Step 1: Event details
    const requiredFields = [
      { id: 'eventName', label: 'Event Name' },
      { id: 'eventDate', label: 'Event Date' },
      { id: 'eventTime', label: 'Event Time' },
      { id: 'eventType', label: 'Event Type' },
      { id: 'guests', label: 'Number of Guests' },
      { id: 'address', label: 'Event Location' },
    ];

    requiredFields.forEach(f => {
      const el = $id(f.id);
      if (!el || !el.value.trim()) {
        showFieldError(el, `${f.label} is required`);
        isValid = false;
      } else if (f.id === 'guests' && parseInt(el.value, 10) <= 0) {
        showFieldError(el, 'Number of guests must be greater than 0');
        isValid = false;
      }
    });
  }

  if (index === 1) {
    // Step 2: Menu selection
    if (selectedFixedMenus.length === 0 && selectedMenuItems.length === 0) {
      alert('Please select at least one fixed menu or custom menu item before proceeding.');
      isValid = false;
    }
  }

  if (index === 2) {
    // Step 3: Extras — optional, but we can skip validation here
    isValid = true;
  }

  if (index === 4) {
    // Step 5: Payment
    const fileInput = $id('paymentProof');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showFieldError(fileInput, 'Please upload proof of payment');
      isValid = false;
    }
  }

  return isValid;
}

function showFieldError(el, message) {
  if (!el) return;
  el.classList.add('border-red-500');
  const msg = document.createElement('p');
  msg.className = 'error-text text-red-600 text-sm mt-1';
  msg.innerText = message;
  el.insertAdjacentElement('afterend', msg);
}

function nextStep() {
  if (!steps) return;

  if (!validateStep(currentStep)) {
    return;
  }
  if (currentStep < steps.length - 1) {
    // populate summary/payments at correct steps
    if (currentStep === 1) populateSummary();  // stores menu
    if (currentStep === 2) populateSummary();  // populate summary after extras step
    if (currentStep === 3) populatePaymentSummary(); // before final
    currentStep++;
    showStep(currentStep);
  }
}
function prevStep() {
  if (!steps) return;
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
}

//Submission handler
async function submitBooking(e) {
  e.preventDefault();
  // get user id
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user || !user.id) {
    alert('You must be logged in to create a booking.');
    return;
  }

  const guests = parseInt($id('guests')?.value || '0', 10) || 0;
  const bookingData = {
    user_id: user.id,
    event_name: $id('eventName')?.value || null,
    event_date: $id('eventDate')?.value || null,
    event_time: $id('eventTime')?.value || null,
    event_type: $id('eventType')?.value || null,
    guest_count: guests,
    location: $id('address')?.value || null,
    status: 'Pending',
    total_cost: parseFloat(localStorage.getItem('bookingTotal') || '0') || 0,
    deposit_paid: parseFloat(localStorage.getItem('depositPaid') || '0') || 0,
  };

  // Insert booking
  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .insert([bookingData])
    .select()
    .single();

  if (bookingError || !booking) {
    console.error('Error creating booking:', bookingError);
    alert('Booking failed. Try again.');
    return;
  }
  const bookingId = booking.booking_id;

  // Insert fixed menus into booking_menu
  if (selectedFixedMenus.length > 0) {
    const fixedInserts = selectedFixedMenus.map(m => ({
      booking_id: bookingId,
      menu_id: m.menu_id
    }));
    const { error: fmErr } = await supabase.from('booking_menu').insert(fixedInserts);
    if (fmErr) console.error('Error inserting booking_menu:', fmErr);
  }

  // Insert custom menu items into booking_menu_item
  if (selectedMenuItems.length > 0) {
    const menuItemInserts = selectedMenuItems.map(it => ({
      booking_id: bookingId,
      menu_item_id: it.menu_item_id,
      item_price: parseFloat(it.item_price || 0),
      quantity: parseInt(it.quantity || 1, 10)
    }));
    const { error: bmiErr } = await supabase.from('booking_menu_item').insert(menuItemInserts);
    if (bmiErr) console.error('Error inserting booking_menu_item:', bmiErr);
  }

  // Insert extras into booking_extra
  if (selectedExtras.length > 0) {
    const extrasInserts = selectedExtras.map(ex => ({
      booking_id: bookingId,
      extra_id: ex.extra_id,
      item_price: parseFloat(ex.extra_price || 0),
      quantity: parseInt(ex.quantity || 1, 10)
    }));
    const { error: beErr } = await supabase.from('booking_extra').insert(extrasInserts);
    if (beErr) console.error('Error inserting booking_extra:', beErr);
  }

  // Upload payment proof and create payment record if file present
  const fileInput = $id('paymentProof');
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${bookingId}/${Date.now()}_${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('File upload error:', uploadError);
    } else {
      // create payment record
      const paymentPayload = {
        booking_id: bookingId,
        amount: bookingData.deposit_paid || 0,
        pop_url: filePath,
        status: 'Pending'
      };
      const { error: payErr } = await supabase.from('payment').insert([paymentPayload]);
      if (payErr) console.error('Error inserting payment:', payErr);
    }
  }

  showToast('Booking submitted successfully!');
  // ✅ Reset selections and form
  
  setTimeout(() => {
    // clear storage 
    localStorage.removeItem('selectedFixedMenus');
    localStorage.removeItem('selectedMenuItems');
    localStorage.removeItem('selectedExtras');
    localStorage.removeItem('bookingTotal');
    localStorage.removeItem('depositPaid');
    
    window.location.href = '../customerhomepage.html';
  }, 900);
}

/* -------------------------
   Persistence (optional)
   ------------------------- */
function saveSelectionsToLocal() {
  try {
    localStorage.setItem('selectedFixedMenus', JSON.stringify(selectedFixedMenus));
    localStorage.setItem('selectedMenuItems', JSON.stringify(selectedMenuItems));
    localStorage.setItem('selectedExtras', JSON.stringify(selectedExtras));
  } catch (err) { /* ignore */ }
}

function loadSelectionsFromLocal() {
  try {
    const a = JSON.parse(localStorage.getItem('selectedFixedMenus') || '[]');
    const b = JSON.parse(localStorage.getItem('selectedMenuItems') || '[]');
    const c = JSON.parse(localStorage.getItem('selectedExtras') || '[]');
    selectedFixedMenus = Array.isArray(a) ? a : [];
    selectedMenuItems = Array.isArray(b) ? b : [];
    selectedExtras = Array.isArray(c) ? c : [];
  } catch (err) {
    selectedFixedMenus = []; selectedMenuItems = []; selectedExtras = [];
  }
}

/* -------------------------
   Small helpers
   ------------------------- */
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* -------------------------
   Initialization on DOMContentLoaded
   ------------------------- */
window.addEventListener('DOMContentLoaded', async () => {
  // wire steps
  setupSteps();

  // load cached selections
  loadSelectionsFromLocal();

  // fetch data
  [menus, menuItems, extras] = await Promise.all([fetchMenus(), fetchMenuItems(), fetchExtraItems()]);

  // render UI pieces
  renderFixedMenus();
  renderExtras();


  // populate inputs if any selections restored
  // (selectedMenuItems quantities will be shown when user opens the custom section)

  // wire booking form submit (the HTML form id expected: bookingForm)
  const bookingForm = $id('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', submitBooking);
  } else {
    // fallback: if no form provided, try a submit button id 'submitBookingBtn'
    const submitBtn = $id('submitBookingBtn');
    if (submitBtn) submitBtn.addEventListener('click', submitBooking);
  }

  // wire next/prev buttons in HTML (if they call global nextStep / prevStep)
  window.nextStep = nextStep;
  window.prevStep = prevStep;

  // ensure summary container exists
  if ($id('summaryDetails')) populateSummary();

  // Modal close/save behavior
  const modal = document.getElementById('customMenuModal');
  const closeModal = document.getElementById('closeCustomMenu');
  const saveModal = document.getElementById('saveCustomMenu');

  if (closeModal && modal) {
    closeModal.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }

  if (saveModal && modal) {
    saveModal.addEventListener('click', () => {
      // Just close the modal; data is already synced to state
      showToast('Custom menu saved!');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }

  // Close modal when clicking outside content
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });
  }

});

// --- Start booking setup when the page loads ---
initializeBooking();

