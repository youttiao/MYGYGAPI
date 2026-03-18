const tableRows = document.getElementById('tableRows');
const mobileCards = document.getElementById('mobileCards');
const slotCount = document.getElementById('slotCount');
const refreshAt = document.getElementById('refreshAt');
const toast = document.getElementById('toast');
const form = document.getElementById('slotForm');
const refreshBtn = document.getElementById('refreshBtn');
const navItems = Array.from(document.querySelectorAll('.nav-item'));
const moduleViews = Array.from(document.querySelectorAll('.module-view'));
const navMoreBtn = document.getElementById('navMoreBtn');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const navDrawer = document.getElementById('navDrawer');
const drawerCloseBtn = document.getElementById('drawerCloseBtn');
const drawerBody = document.getElementById('drawerBody');

let inventoryLoaded = false;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? '#7c2d21' : '#102427';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function esc(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function switchModule(moduleName) {
  navItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.nav === moduleName);
  });
  moduleViews.forEach((view) => {
    view.classList.toggle('active', view.dataset.module === moduleName);
  });

  if (moduleName === 'inventory' && !inventoryLoaded) {
    loadSlots().catch((err) => showToast(err.message || '初始化失败', true));
  }
}

function openDrawer() {
  if (!navDrawer || !drawerBackdrop) return;
  drawerBackdrop.hidden = false;
  navDrawer.classList.add('open');
  navDrawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  if (!navDrawer || !drawerBackdrop) return;
  navDrawer.classList.remove('open');
  navDrawer.setAttribute('aria-hidden', 'true');
  drawerBackdrop.hidden = true;
  document.body.style.overflow = '';
}

function buildDrawerItems(activeModule) {
  if (!drawerBody) return;
  drawerBody.innerHTML = '';
  for (const item of navItems) {
    const moduleName = item.dataset.nav || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drawer-item' + (moduleName === activeModule ? ' active' : '');
    btn.textContent = item.textContent || moduleName;
    btn.addEventListener('click', () => {
      switchModule(moduleName || 'inventory');
      closeDrawer();
    });
    drawerBody.appendChild(btn);
  }
}

async function loadSlots() {
  const res = await fetch('/admin/calendar');
  if (!res.ok) {
    throw new Error('无法加载库存列表');
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  slotCount.textContent = String(items.length);
  refreshAt.textContent = new Date().toLocaleTimeString();

  tableRows.innerHTML = '';
  mobileCards.innerHTML = '';

  for (const slot of items) {
    const productId = esc(slot.productId);
    const dateTime = esc(slot.dateTime);
    const vacancies = esc(slot.vacancies);
    const updatedAt = esc(slot.updatedAt);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${productId}</td>
      <td>${dateTime}</td>
      <td>${vacancies}</td>
      <td>${updatedAt}</td>
      <td><button class="btn btn-danger" data-product-id="${productId}" data-date-time="${dateTime}">删除</button></td>
    `;
    tableRows.appendChild(tr);

    const card = document.createElement('article');
    card.className = 'mobile-item';
    card.innerHTML = `
      <div><span class="mobile-key">Product</span><span class="mobile-value">${productId}</span></div>
      <div><span class="mobile-key">DateTime</span><span class="mobile-value">${dateTime}</span></div>
      <div><span class="mobile-key">Vacancies</span><span class="mobile-value">${vacancies}</span></div>
      <div><span class="mobile-key">Updated</span><span class="mobile-value">${updatedAt}</span></div>
      <button class="btn btn-danger" data-product-id="${productId}" data-date-time="${dateTime}">删除</button>
    `;
    mobileCards.appendChild(card);
  }

  inventoryLoaded = true;
}

async function upsertSlot() {
  const payload = {
    productId: form.productId.value.trim(),
    dateTime: form.dateTime.value.trim(),
    vacancies: Number(form.vacancies.value),
  };

  const res = await fetch('/admin/calendar/slot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || '保存失败');
  }
}

async function deleteSlot(productId, dateTime) {
  const qs = new URLSearchParams({ productId, dateTime });
  const res = await fetch(`/admin/calendar/slot?${qs.toString()}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || '删除失败');
  }
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await upsertSlot();
      await loadSlots();
      showToast('保存成功');
    } catch (err) {
      showToast(err.message || '保存失败', true);
    }
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    try {
      await loadSlots();
      showToast('已刷新');
    } catch (err) {
      showToast(err.message || '刷新失败', true);
    }
  });
}

navItems.forEach((item) => {
  item.addEventListener('click', () => switchModule(item.dataset.nav || 'inventory'));
});

if (navMoreBtn) {
  navMoreBtn.addEventListener('click', () => {
    const active = document.querySelector('.nav-item.active')?.dataset?.nav || 'inventory';
    buildDrawerItems(active);
    openDrawer();
  });
}

if (drawerCloseBtn) {
  drawerCloseBtn.addEventListener('click', closeDrawer);
}

if (drawerBackdrop) {
  drawerBackdrop.addEventListener('click', closeDrawer);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDrawer();
});

document.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (!target.matches('button[data-product-id][data-date-time]')) {
    return;
  }

  const productId = target.dataset.productId || '';
  const dateTime = target.dataset.dateTime || '';
  if (!productId || !dateTime) {
    return;
  }

  try {
    await deleteSlot(productId, dateTime);
    await loadSlots();
    showToast('删除成功');
  } catch (err) {
    showToast(err.message || '删除失败', true);
  }
});

switchModule('inventory');
