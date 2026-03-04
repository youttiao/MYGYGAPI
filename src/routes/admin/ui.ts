export const adminUiHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OPS Admin UI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f6f7fb; color: #1f2937; }
    .wrap { max-width: 980px; margin: 24px auto; padding: 0 16px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
    h1 { margin: 0 0 12px; font-size: 24px; }
    h2 { margin: 0 0 10px; font-size: 18px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    label { display: block; font-size: 12px; margin-bottom: 4px; color: #374151; }
    input, textarea, button, select { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
    textarea { min-height: 80px; }
    button { background: #111827; color: white; cursor: pointer; }
    button.secondary { background: #374151; }
    .out { background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 10px; white-space: pre-wrap; font-size: 12px; max-height: 300px; overflow: auto; }
    .products { display: grid; gap: 8px; }
    .product { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; background: #fafafa; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>OPS Admin UI (Minimal)</h1>

    <div class="card">
      <h2>1) Admin Token</h2>
      <div class="row">
        <div>
          <label>Admin Token</label>
          <input id="adminToken" placeholder="x-admin-token" />
        </div>
        <div>
          <label>Supplier ID (for list)</label>
          <input id="supplierIdFilter" value="supplier123" />
        </div>
      </div>
      <div style="margin-top:10px">
        <button id="loadProducts" class="secondary">加载产品列表</button>
      </div>
      <div id="products" class="products" style="margin-top:10px"></div>
    </div>

    <div class="card">
      <h2>2) 创建产品</h2>
      <div class="row">
        <div><label>supplierId</label><input id="supplierId" value="supplier123" /></div>
        <div><label>productId</label><input id="productId" value="prod-ui-001" /></div>
        <div><label>name</label><input id="name" value="UI Demo Product" /></div>
        <div><label>timezone</label><input id="timezone" value="Asia/Shanghai" /></div>
        <div><label>currency</label><input id="currency" value="CNY" /></div>
        <div>
          <label>status</label>
          <select id="status"><option value="active">active</option><option value="inactive">inactive</option></select>
        </div>
      </div>
      <div style="margin-top:10px">
        <label>description</label>
        <textarea id="description">Created from minimal admin ui</textarea>
      </div>
      <div style="margin-top:10px"><button id="createProduct">创建产品</button></div>
    </div>

    <div class="card">
      <h2>3) 写入 Availability</h2>
      <div class="row">
        <div><label>product internal id</label><input id="productInternalId" placeholder="从产品列表复制" /></div>
        <div><label>dateTime (ISO8601)</label><input id="dateTime" value="2030-01-01T10:00:00+08:00" /></div>
        <div><label>vacancies</label><input id="vacancies" type="number" value="20" /></div>
        <div><label>price (minor units)</label><input id="adultPrice" type="number" value="19900" /></div>
      </div>
      <div style="margin-top:10px"><button id="addAvailability">写入可用性</button></div>
    </div>

    <div class="card">
      <h2>4) 查询 Bookings</h2>
      <button id="loadBookings" class="secondary">查询订单</button>
    </div>

    <div class="card">
      <h2>输出</h2>
      <div id="out" class="out">Ready</div>
    </div>
  </div>

  <script>
    const out = document.getElementById('out');
    const print = (v) => { out.textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2); };
    const token = () => document.getElementById('adminToken').value.trim();

    async function api(path, options = {}) {
      const headers = Object.assign({ 'content-type': 'application/json', 'x-admin-token': token() }, options.headers || {});
      const res = await fetch(path, Object.assign({}, options, { headers }));
      const txt = await res.text();
      let body;
      try { body = JSON.parse(txt); } catch { body = txt; }
      if (!res.ok) throw new Error(JSON.stringify(body));
      return body;
    }

    document.getElementById('loadProducts').onclick = async () => {
      try {
        const supplierId = document.getElementById('supplierIdFilter').value.trim();
        const data = await api('/admin/products' + (supplierId ? ('?supplierId=' + encodeURIComponent(supplierId)) : ''));
        const container = document.getElementById('products');
        container.innerHTML = '';
        (data.data || []).forEach((p) => {
          const div = document.createElement('div');
          div.className = 'product';
          div.innerHTML = '<b>' + p.name + '</b><br/>external: ' + p.productId + '<br/>internal: ' + p.id;
          container.appendChild(div);
        });
        print(data);
      } catch (e) { print(String(e)); }
    };

    document.getElementById('createProduct').onclick = async () => {
      try {
        const payload = {
          supplierId: document.getElementById('supplierId').value.trim(),
          productId: document.getElementById('productId').value.trim(),
          name: document.getElementById('name').value.trim(),
          description: document.getElementById('description').value,
          timezone: document.getElementById('timezone').value.trim(),
          currency: document.getElementById('currency').value.trim(),
          status: document.getElementById('status').value,
          destinationCity: 'Shanghai',
          destinationCountry: 'CHN'
        };
        const data = await api('/admin/products', { method: 'POST', body: JSON.stringify(payload) });
        print(data);
      } catch (e) { print(String(e)); }
    };

    document.getElementById('addAvailability').onclick = async () => {
      try {
        const id = document.getElementById('productInternalId').value.trim();
        if (!id) throw new Error('product internal id required');
        const payload = {
          availabilities: [{
            dateTime: document.getElementById('dateTime').value.trim(),
            cutoffSeconds: 3600,
            vacancies: Number(document.getElementById('vacancies').value),
            currency: 'CNY',
            pricesByCategory: {
              retailPrices: [{ category: 'ADULT', price: Number(document.getElementById('adultPrice').value) }]
            }
          }]
        };
        const data = await api('/admin/products/' + encodeURIComponent(id) + '/availability', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        print(data);
      } catch (e) { print(String(e)); }
    };

    document.getElementById('loadBookings').onclick = async () => {
      try {
        const data = await api('/admin/bookings');
        print(data);
      } catch (e) { print(String(e)); }
    };
  </script>
</body>
</html>`;
