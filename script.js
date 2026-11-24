/* ==========================================================================
   Melon Soap - Shared Frontend Script
   Auto-detects page elements to initialize Product, Order, or Admin logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Product Page Detection (#product-list & #filter-bar)
  if (document.getElementById('product-list')) {
    initProductPage();
  }

  // 2. Order Page Detection (#orderForm)
  if (document.getElementById('orderForm')) {
    initOrderPage();
  }

  // 3. Admin Page Detection (#ordersTable)
  if (document.getElementById('ordersTable')) {
    initAdminPage();
  }
});

/* ==========================================================================
   1. PRODUCT PAGE LOGIC (product.html)
   ========================================================================== */
async function initProductPage() {
  const productListEl = document.getElementById('product-list');
  const filterBarEl = document.getElementById('filter-bar');
  let allProducts = [];

  const moods = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  // Read ?mood=xxx from URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialMoodParam = (urlParams.get('mood') || 'all').toLowerCase();
  const validMoodKeys = moods.map(m => m.key);
  let activeMood = validMoodKeys.includes(initialMoodParam) ? initialMoodParam : 'all';

  // Render Filter Buttons
  function renderFilterButtons() {
    if (!filterBarEl) return;
    filterBarEl.innerHTML = moods.map(m => {
      const isActive = m.key === activeMood;
      const moodClass = m.key !== 'all' ? `mood-${m.key}` : '';
      return `
        <button 
          type="button" 
          class="btn ${isActive ? 'btn-solid' : ''} ${moodClass}" 
          data-mood="${m.key}"
          style="padding: 0.6rem 1.4rem; font-size: 0.72rem;"
        >
          ${m.key !== 'all' ? '<span class="mood-dot"></span>' : ''}
          ${m.label}
        </button>
      `;
    }).join('');

    // Attach click events to filter buttons
    filterBarEl.querySelectorAll('button[data-mood]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeMood = btn.getAttribute('data-mood');
        renderFilterButtons();
        renderProducts();
      });
    });
  }

  // Render Product Cards
  function renderProducts() {
    const filtered = activeMood === 'all'
      ? allProducts
      : allProducts.filter(p => (p.mood || '').toLowerCase() === activeMood);

    if (filtered.length === 0) {
      productListEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--text-muted);">
          ไม่พบสินค้าในหมวดหมู่นี้
        </div>
      `;
      return;
    }

    productListEl.innerHTML = filtered.map(product => {
      const moodKey = (product.mood || 'fresh').toLowerCase();
      const itemText = `${product.name} (${product.size})`;
      const orderUrl = `order.html?item=${encodeURIComponent(itemText)}&price=${encodeURIComponent(product.price)}`;

      return `
        <article class="product-card mood-${moodKey}">
          <div class="product-image-wrap">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
          </div>
          <div class="product-meta">
            <span class="mood-indicator mood-underline">
              <span class="mood-dot"></span>
              ${escapeHtml(product.mood)}
            </span>
            <span>${escapeHtml(product.size)}</span>
          </div>
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          <p class="product-desc">${escapeHtml(product.description)}</p>
          <div class="product-footer">
            <span class="product-price">฿${Number(product.price).toLocaleString('th-TH')}</span>
            <a href="${orderUrl}" class="btn" style="padding: 0.65rem 1.5rem;">สั่งซื้อ</a>
          </div>
        </article>
      `;
    }).join('');
  }

  // Fetch products.json
  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error('Failed to load products.json');
    allProducts = await response.json();
    renderFilterButtons();
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    productListEl.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--text-secondary);">
        ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง
      </div>
    `;
  }
}

/* ==========================================================================
   2. ORDER PAGE LOGIC (order.html)
   ========================================================================== */
function initOrderPage() {
  const orderForm = document.getElementById('orderForm');
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // Read item & price from URL parameters and always populate both fields
  const urlParams = new URLSearchParams(window.location.search);
  const itemParam = urlParams.get('item') || '';
  const priceParam = urlParams.get('price') || '';

  if (itemsInput) {
    itemsInput.value = itemParam;
  }
  if (totalInput) {
    totalInput.value = priceParam;
  }

  // Handle form submission
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const customerNameEl = document.getElementById('customerName');
    const contactEl = document.getElementById('contact');
    const noteEl = document.getElementById('note');

    const payload = {
      customerName: customerNameEl ? customerNameEl.value.trim() : '',
      contact: contactEl ? contactEl.value.trim() : '',
      items: itemsInput ? itemsInput.value.trim() : '',
      total: totalInput ? totalInput.value.trim() : '',
      note: noteEl ? noteEl.value.trim() : '',
      timestamp: new Date().toISOString()
    };

    try {
      const existingRaw = localStorage.getItem('bodyScentOrders');
      const orders = existingRaw ? JSON.parse(existingRaw) : [];
      if (Array.isArray(orders)) {
        orders.push(payload);
        localStorage.setItem('bodyScentOrders', JSON.stringify(orders));
      } else {
        localStorage.setItem('bodyScentOrders', JSON.stringify([payload]));
      }
    } catch (error) {
      console.error('Failed to save order to localStorage:', error);
    }

    window.location.href = 'thankyou.html';
  });
}

/* ==========================================================================
   3. ADMIN PAGE LOGIC (admin.html)
   ========================================================================== */
function initAdminPage() {
  const tableEl = document.getElementById('ordersTable');
  const tbody = tableEl.querySelector('tbody');
  if (!tbody) return;

  let orders = [];
  try {
    const rawData = localStorage.getItem('bodyScentOrders');
    const parsed = rawData ? JSON.parse(rawData) : [];
    if (Array.isArray(parsed)) {
      orders = parsed;
    }
  } catch (error) {
    console.error('Failed to read orders from localStorage:', error);
    orders = [];
  }

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="100%" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          ยังไม่มีคำสั่งซื้อ
        </td>
      </tr>
    `;
    return;
  }

  // Sort by latest timestamp first
  orders.sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  // Render rows
  tbody.innerHTML = orders.map(order => {
    const formattedDate = order.timestamp
      ? new Date(order.timestamp).toLocaleString('th-TH')
      : '-';
    const totalDisplay = order.total !== '' && !isNaN(Number(order.total))
      ? `฿${Number(order.total).toLocaleString('th-TH')}`
      : escapeHtml(order.total || '-');

    return `
      <tr>
        <td>${escapeHtml(formattedDate)}</td>
        <td>${escapeHtml(order.customerName || '-')}</td>
        <td>${escapeHtml(order.contact || '-')}</td>
        <td>${escapeHtml(order.items || '-')}</td>
        <td>${totalDisplay}</td>
        <td>${escapeHtml(order.note || '-')}</td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   Utility: Prevent XSS when rendering user/JSON strings
   ========================================================================== */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
