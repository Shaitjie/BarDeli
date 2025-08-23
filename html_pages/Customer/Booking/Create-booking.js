import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://fawlfsukrqrucrrxrjvq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhd2xmc3VrcnFydWNycnhyanZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzU2OTUsImV4cCI6MjA3MTAxMTY5NX0.KGH5SAJvCEhnz3NHdp6LeMgCvZp-nP1Tj6oIL32J6K8'
const supabase = createClient(supabaseUrl, supabaseKey);

// ------------------ Fetch menu items ------------------
async function fetchMenuItems() {
  const { data: items, error } = await supabase
    .from('menuitem')
    .select('*')
    .eq('isavailable', true)
    .order('itemname', { ascending: true });

  if (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }
  return items;
}
// ------------------ Fetch Extra items ------------------

async function fetchExtraItems() {
   const { data: items, error } = await supabase
   .from('extras')
   .select('*')
   .eq('isavailable',true)
  .order('itemname', { ascending: true });

    if (error) {
    console.error('Error fetching Extra items:', error);
    return [];
  }
  return items;
}



// ------------------ Load Menu into Step 2 ------------------

export async function loadMenuItems() {
  const items = await fetchMenuItems();
  const menuList = document.getElementById('menuList');
  if (!menuList) return;

  menuList.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'p-4 border rounded hover:shadow cursor-pointer';
    card.innerHTML = `
      <h3 class="font-bold">${item.itemname}</h3>
      <p>${item.description || ''}</p>
      <p>Price per person: $${parseFloat(item.price).toFixed(2)}</p>
    `;
    card.dataset.menuitemid = item.menuitemid;
    card.dataset.itemname = item.itemname;
    card.dataset.price = item.price; // numeric value from DB
    card.dataset.description = item.description || '';
    card.dataset.category = item.category || '';

    card.onclick = () => openMenuModal(item.menuitemid);
    menuList.appendChild(card);
  });

  // Custom menu card
  const customCard = document.createElement('div');
  customCard.className = 'p-4 border rounded hover:shadow cursor-pointer';
  customCard.innerHTML = `
    <h3 class="font-bold">Custom Menu</h3>
    <p>Select individual items</p>
  `;
  customCard.onclick = () => selectCustomMenu();
  menuList.appendChild(customCard);
}
// ------------------ Load Extras into Step 2 ------------------
 export async function loadExtraItems() {
  const items = await fetchExtraItems();
  const extrasList = document.getElementById('extrasList'); // Get the correct container

  if (!extrasList) {
    console.error('Extras list element not found!');
    return;
  }

  extrasList.innerHTML = ''; // Clear the extras list


  
  items.forEach(item => {
    // Create a container for the checkbox and label
    const itemContainer = document.createElement('div');
    itemContainer.className = 'flex items-center space-x-2';

      // Attach data attributes for summary
    itemContainer.dataset.extrasid = item.extrasid;
    itemContainer.dataset.itemname = item.itemname || '';
    itemContainer.dataset.price = item.price || 0;
    itemContainer.dataset.category = item.category || '';
    itemContainer.dataset.quantity = item.quantity || 1;

    // Create the checkbox input
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `extra-${item.extrasid}`;
    checkbox.value = item.extrasid;
    checkbox.className = 'w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500';

    // Create the label for the checkbox
    const label = document.createElement('label');
    label.htmlFor = `extra-${item.extrasid}`;
    label.className = 'text-gray-700';
    label.textContent = `${item.itemname} - $${item.price}`;

    // Append the checkbox and label to the container
    itemContainer.appendChild(checkbox);
    itemContainer.appendChild(label);
    

    // Append the container to the extrasList div
    extrasList.appendChild(itemContainer);
  });
}







// // ------------------ Modal functions ------------------
// export function openMenuModal(menuId) {
//   alert(`Open modal for ${menuId}`);
// }

// export function selectCustomMenu() {
//   alert('Open custom menu selection');
// }

// export function openExtrasModal() {
//   alert('Open custom menu selection');
// }

// ------------------ Auto load menu on page load ------------------
window.addEventListener('DOMContentLoaded', loadMenuItems);

// ------------------ Auto Extra iems on page load ------------------

window.addEventListener('DOMContentLoaded', loadExtraItems);