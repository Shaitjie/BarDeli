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
      <p>Price per person: $${item.price}</p>
    `;
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

// ------------------ Modal functions ------------------
export function openMenuModal(menuId) {
  alert(`Open modal for ${menuId}`);
}

export function selectCustomMenu() {
  alert('Open custom menu selection');
}

// ------------------ Auto load menu on page load ------------------
window.addEventListener('DOMContentLoaded', loadMenuItems);



