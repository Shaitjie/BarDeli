//update-booking.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://fawlfsukrqrucrrxrjvq.supabase.co';
const supabaseKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhd2xmc3VrcnFydWNycnhyanZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzU2OTUsImV4cCI6MjA3MTAxMTY5NX0.KGH5SAJvCEhnz3NHdp6LeMgCvZp-nP1Tj6oIL32J6K8';
const supabase = createClient(supabaseUrl, supabaseKey);

let bookingId;
let menuPrice = 0;
let selectedExtras = [];
let allExtras = [];
let newlyUploadedProofs = []; // track proofs uploaded before form submit

// Toast helper
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMessage');
  toastMsg.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

async function uploadPaymentProof() {
  const fileInput = document.getElementById('paymentProof');
  if (!fileInput.files.length) return alert('Please select a file');

  const file = fileInput.files[0];
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${bookingId}/${Date.now()}_${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, file);

  if (uploadError) return console.error('File upload error:', uploadError);

  newlyUploadedProofs.push(filePath);
  fileInput.value = '';
  console.log('Uploading finished, showing toast...');
  showToast('Payment proof uploaded!');
}

document.getElementById('uploadProofBtn').addEventListener('click', uploadPaymentProof);

// After updating booking and extras
for (let filePath of newlyUploadedProofs) {
  const paymentPayload = {
    booking_id: bookingId,
    amount: parseFloat(document.getElementById('newdepositpaid').textContent) || 0,
    pop_url: filePath,
    status: 'Pending',
  };
  const { error: payErr } = await supabase.from('payment').insert([paymentPayload]);
  if (payErr) console.error('Error inserting payment:', payErr);
}

// Fetch all extras
async function fetchExtraItems() {
  const { data, error } = await supabase
    .from('extra')
    .select('extra_id, extra_name, description, extra_price')
    .eq('is_available', true);
  if (error) console.error(error);
  return data || [];
}

// Load booking
async function loadBooking() {
  const { data: booking, error } = await supabase
    .from('booking')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  if (error) return console.error(error);

  document.getElementById('eventDate').value = booking.event_date;
  document.getElementById('eventTime').value = booking.event_time;
  document.getElementById('guests').value = booking.guest_count;
  document.getElementById('address').value = booking.location;
  document.getElementById('currenttotalcost').textContent = booking.total_cost;
  document.getElementById('currentdepositpaid').textContent = booking.deposit_paid;

  // Store for recalculation
  menuPrice = booking.total_cost / (booking.guest_count || 1);

  // Load current extras
  const { data: extras, error: extrasError } = await supabase
    .from('booking_extra')
    .select('extra_id, quantity')
    .eq('booking_id', bookingId);

  if (!extrasError && extras) selectedExtras = extras;

  // Render extras
  allExtras = await fetchExtraItems();
  renderExtras();
}

// Render extras list
function renderExtras() {
  const container = document.getElementById('extrasList');
  container.innerHTML = '';

  allExtras.forEach(ex => {
    const selected = selectedExtras.find(s => s.extra_id === ex.extra_id);
    const qty = selected ? selected.quantity : 1;

    const div = document.createElement('div');
    div.className = 'flex items-center justify-between border p-2 rounded bg-white';
    div.innerHTML = `
      <div>
        <div class="font-medium">${ex.extra_name}</div>
        <div class="text-sm text-gray-600">R${ex.extra_price}</div>
      </div>
      <div class="flex items-center space-x-2">
        <input type="checkbox" class="extra-checkbox" data-id="${ex.extra_id}" ${selected ? 'checked' : ''}/>
        <input type="number" class="extra-qty w-16 text-center border rounded ${selected ? '' : 'hidden'}"
          min="1" value="${qty}" data-id="${ex.extra_id}" />
      </div>
    `;

    const checkbox = div.querySelector('.extra-checkbox');
    const qtyInput = div.querySelector('.extra-qty');

    checkbox.addEventListener('change', () => {
      const id = ex.extra_id;
      if (checkbox.checked) {
        qtyInput.classList.remove('hidden');
        updateExtrasState(id, true, parseInt(qtyInput.value));
      } else {
        qtyInput.classList.add('hidden');
        updateExtrasState(id, false);
      }
      calculateNewCosts();
    });

    qtyInput.addEventListener('input', () => {
      const q = Math.max(1, parseInt(qtyInput.value || '1', 10));
      updateExtrasState(ex.extra_id, true, q);
      calculateNewCosts();
    });

    container.appendChild(div);
  });
}

// Manage selected extras
function updateExtrasState(extra_id, checked, quantity = 1) {
  const idx = selectedExtras.findIndex(e => e.extra_id === extra_id);
  if (checked) {
    if (idx === -1) selectedExtras.push({ extra_id, quantity });
    else selectedExtras[idx].quantity = quantity;
  } else {
    if (idx !== -1) selectedExtras.splice(idx, 1);
  }
}

//Event listener that changes when the user changes the guest count, and new total and deposit resets to R0 if there’s no valid guest number.
document.getElementById('guests').addEventListener('input', () => {
  const guests = parseInt(document.getElementById('guests').value, 10);

  if (!guests || guests <= 0) {
    // Reset to R0 when input is empty or invalid
    document.getElementById('newtotalcost').textContent = '0.00';
    document.getElementById('newdepositpaid').textContent = '0.00';
    return;
  }

  calculateNewCosts();
});

// Calculate new totals
function calculateNewCosts() {

  const guests = parseInt(document.getElementById('guests').value) || 0;

  const extrasTotal = selectedExtras.reduce((sum, ex) => {
    const extra = allExtras.find(e => e.extra_id === ex.extra_id);
    return sum + ((extra?.extra_price || 0) * ex.quantity);
  }, 0);

  const newTotal = guests > 0 ? (guests * menuPrice) + extrasTotal : 0;
  const newDeposit = newTotal * 0.5;

  document.getElementById('newtotalcost').textContent = newTotal.toFixed(2);
  document.getElementById('newdepositpaid').textContent = newDeposit.toFixed(2);
}

async function submitUpdate(e) {
  e.preventDefault();

  const newTotal = parseFloat(document.getElementById('newtotalcost').textContent);
  const newDeposit = parseFloat(document.getElementById('newdepositpaid').textContent);

  // Start with basic fields that always update
  const updatedData = {
    event_date: document.getElementById('eventDate').value,
    event_time: document.getElementById('eventTime').value,
    guest_count: parseInt(document.getElementById('guests').value),
    location: document.getElementById('address').value,
  };

  // ✅ Only include total_cost and deposit_paid if both are valid and not zero
  if (!isNaN(newTotal) && newTotal > 0) {
    updatedData.total_cost = newTotal;
  }

  if (!isNaN(newDeposit) && newDeposit > 0) {
    updatedData.deposit_paid = newDeposit;
  }

  // Update booking
  const { error: updateError } = await supabase
    .from('booking')
    .update(updatedData)
    .eq('booking_id', bookingId);

  if (updateError) return alert('Booking update failed.');

  // Update extras
  await supabase.from('booking_extra').delete().eq('booking_id', bookingId);
  if (selectedExtras.length > 0) {
    const inserts = selectedExtras.map(ex => ({
      booking_id: bookingId,
      extra_id: ex.extra_id,
      quantity: ex.quantity,
      item_price: allExtras.find(a => a.extra_id === ex.extra_id)?.extra_price || 0,
    }));
    await supabase.from('booking_extra').insert(inserts);
  }

  showToast('Booking updated successfully!');
  setTimeout(() => (window.location.href = '../customerbookingpage.html'), 1000);
}

// Cancel modal logic
function setupCancelModal() {
  const cancelBtn = document.getElementById('cancelBtn');
  const modal = document.getElementById('confirmModal');
  const stay = document.getElementById('modalCancel');
  const leave = document.getElementById('modalConfirm');

  cancelBtn.onclick = () => modal.classList.replace('hidden', 'flex');
  stay.onclick = () => modal.classList.replace('flex', 'hidden');
  leave.onclick = () => (window.location.href = '../customerbookingpage.html');
}

// Google Maps autocomplete
function initAutocomplete() {
  const input = document.getElementById('address');
  if (!input || !window.google) return;

  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ['formatted_address'],
    types: ['geocode'],
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.formatted_address) input.value = place.formatted_address;
  });
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
  setupCancelModal();
  const params = new URLSearchParams(window.location.search);
  bookingId = params.get('id');
  if (bookingId) await loadBooking();

  document.getElementById('guests').addEventListener('input', calculateNewCosts);
  document.getElementById('updateBookingForm').addEventListener('submit', submitUpdate);
  setTimeout(initAutocomplete, 1000);
});
