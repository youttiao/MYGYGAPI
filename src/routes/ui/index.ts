import type { FastifyPluginAsync } from 'fastify';

const rootHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>OPS 商品管理</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fb;margin:0;color:#0f172a}
.wrap{max-width:980px;margin:24px auto;padding:0 16px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:14px}
h1{margin:0 0 10px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
label{font-size:12px;color:#334155;display:block;margin-bottom:4px}
input,textarea,select,button{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px}
button{background:#111827;color:#fff;cursor:pointer}
.list{display:grid;gap:8px}
.item{border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;padding:10px}
a{color:#1d4ed8;text-decoration:none}
.out{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;border-radius:8px;padding:10px;font-size:12px}
</style>
</head>
<body>
<div class="wrap">
  <h1>商品管理</h1>
  <div class="card">
    <div class="row">
      <div><label>Admin Token</label><input id="token" placeholder="x-admin-token" /></div>
      <div><label>Supplier ID</label><input id="supplierIdFilter" value="supplier123" /></div>
    </div>
    <div style="margin-top:10px" class="row">
      <button id="load">加载商品</button>
      <button id="goBookings">进入 GYG Bookings 管理页</button>
    </div>
  </div>

  <div class="card">
    <h3>创建商品</h3>
    <div class="row">
      <div><label>supplierId</label><input id="supplierId" value="supplier123" /></div>
      <div><label>productId</label><input id="productId" value="prod-web-001" /></div>
      <div><label>name</label><input id="name" value="Web Product" /></div>
      <div><label>timezone</label><input id="timezone" value="Asia/Shanghai" /></div>
      <div><label>currency</label><input id="currency" value="CNY" /></div>
      <div><label>status</label><select id="status"><option>active</option><option>inactive</option></select></div>
    </div>
    <div style="margin-top:10px"><label>description</label><textarea id="description">Created from root ui</textarea></div>
    <div style="margin-top:10px"><button id="create">创建商品</button></div>
  </div>

  <div class="card">
    <h3>商品列表</h3>
    <div id="products" class="list"></div>
  </div>

  <div class="card">
    <h3>输出</h3>
    <div id="out" class="out">Ready</div>
  </div>
</div>
<script>
const out = document.getElementById('out');
const print = (v)=>out.textContent = typeof v==='string'?v:JSON.stringify(v,null,2);
const tokenInput = document.getElementById('token');
tokenInput.value = localStorage.getItem('admin_token') || '';
tokenInput.addEventListener('change',()=>localStorage.setItem('admin_token',tokenInput.value.trim()));

async function api(path, options={}){
  const token = tokenInput.value.trim();
  if(!token) throw new Error('请先输入 Admin Token');
  const headers = Object.assign({'content-type':'application/json','x-admin-token':token}, options.headers||{});
  const res = await fetch(path, Object.assign({}, options, {headers}));
  const text = await res.text();
  let body; try{body=JSON.parse(text)}catch{body=text}
  if(!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

async function loadProducts(){
  const supplierId = document.getElementById('supplierIdFilter').value.trim();
  const q = supplierId ? ('?supplierId='+encodeURIComponent(supplierId)) : '';
  const data = await api('/admin/products'+q);
  const products = data.data || [];
  const c = document.getElementById('products');
  c.innerHTML = '';
  products.forEach(p=>{
    const div = document.createElement('div');
    div.className='item';
    div.innerHTML = '<b>'+p.name+'</b><br/>external: '+p.productId+'<br/>internal: '+p.id+
    '<br/><a href="/products/'+encodeURIComponent(p.id)+'/calendar">进入日历管理</a>';
    c.appendChild(div);
  });
  print(data);
}

document.getElementById('load').onclick = ()=>loadProducts().catch(e=>print(String(e)));
document.getElementById('goBookings').onclick = ()=>{ window.location.href = '/gyg-bookings'; };

document.getElementById('create').onclick = async ()=>{
  try{
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
    const data = await api('/admin/products', {method:'POST', body:JSON.stringify(payload)});
    print(data);
    await loadProducts();
  }catch(e){print(String(e));}
};
</script>
</body></html>`;

const bookingsHtml = `<!doctype html><html lang="zh-CN"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>GYG Bookings 管理</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fb;margin:0;color:#0f172a}
.wrap{max-width:980px;margin:24px auto;padding:0 16px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:14px}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}input,select,button{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px}button{background:#111827;color:#fff;cursor:pointer}
.out{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;border-radius:8px;padding:10px;font-size:12px}
</style></head><body><div class="wrap">
<div class="card"><h2>GYG Bookings 管理</h2><p><a href="/">返回商品管理首页</a></p>
<div class="row">
<div><input id="token" placeholder="Admin Token"/></div>
<div><select id="status"><option value="">all status</option><option>created</option><option>confirmed</option><option>cancelled</option><option>failed</option></select></div>
<div><input id="gygRef" placeholder="gygBookingReference"/></div>
</div><div style="margin-top:10px"><button id="load">查询 Bookings</button></div></div>
<div class="card"><div id="out" class="out">Ready</div></div></div>
<script>
const out=document.getElementById('out');const t=document.getElementById('token');t.value=localStorage.getItem('admin_token')||'';t.onchange=()=>localStorage.setItem('admin_token',t.value.trim());
const print=(v)=>out.textContent=typeof v==='string'?v:JSON.stringify(v,null,2);
document.getElementById('load').onclick=async()=>{try{const token=t.value.trim(); if(!token) throw new Error('缺少 token');
const status=document.getElementById('status').value;const ref=document.getElementById('gygRef').value.trim();
const q=new URLSearchParams(); if(status) q.set('status',status); if(ref) q.set('gygBookingReference',ref);
const res=await fetch('/admin/bookings'+(q.toString()?('?'+q.toString()):''),{headers:{'x-admin-token':token}}); const text=await res.text(); let body; try{body=JSON.parse(text)}catch{body=text}
if(!res.ok) throw new Error(JSON.stringify(body)); print(body);}catch(e){print(String(e));}};
</script></body></html>`;

const calendarHtml = (id: string) => `<!doctype html><html lang="zh-CN"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>商品日历管理</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fb;margin:0;color:#0f172a}
.wrap{max-width:980px;margin:24px auto;padding:0 16px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:14px}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}label{font-size:12px;color:#334155;display:block;margin-bottom:4px}
input,button{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px}button{background:#111827;color:#fff;cursor:pointer}
.out{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;border-radius:8px;padding:10px;font-size:12px}
</style></head><body><div class="wrap">
<div class="card"><h2>商品日历管理</h2><p><a href="/">返回商品列表</a></p><p>product internal id: <b>${id}</b></p>
<div class="row"><div><label>Admin Token</label><input id="token"/></div><div><label>fromDateTime</label><input id="from" value="2030-01-01T00:00:00+08:00"/></div><div><label>toDateTime</label><input id="to" value="2030-01-31T23:59:59+08:00"/></div></div>
<div class="row" style="margin-top:10px"><button id="load">查询日历</button><button id="save">写入单个时段</button><div></div></div>
<div class="row" style="margin-top:10px"><div><label>dateTime</label><input id="dateTime" value="2030-01-10T10:00:00+08:00"/></div><div><label>vacancies</label><input id="vacancies" type="number" value="20"/></div><div><label>adult price</label><input id="price" type="number" value="19900"/></div></div>
</div>
<div class="card"><div id="out" class="out">Ready</div></div>
</div>
<script>
const out=document.getElementById('out'); const print=(v)=>out.textContent=typeof v==='string'?v:JSON.stringify(v,null,2);
const tokenEl=document.getElementById('token'); tokenEl.value=localStorage.getItem('admin_token')||''; tokenEl.onchange=()=>localStorage.setItem('admin_token',tokenEl.value.trim());
async function api(path,opt={}){const token=tokenEl.value.trim();if(!token) throw new Error('缺少 token');const headers=Object.assign({'content-type':'application/json','x-admin-token':token},opt.headers||{});const res=await fetch(path,Object.assign({},opt,{headers}));const t=await res.text();let b;try{b=JSON.parse(t)}catch{b=t}if(!res.ok) throw new Error(JSON.stringify(b));return b;}

document.getElementById('load').onclick=async()=>{try{const from=document.getElementById('from').value.trim(); const to=document.getElementById('to').value.trim(); const q='?fromDateTime='+encodeURIComponent(from)+'&toDateTime='+encodeURIComponent(to);const data=await api('/admin/products/${id}/availability'+q); print(data);}catch(e){print(String(e));}};

document.getElementById('save').onclick=async()=>{try{const payload={availabilities:[{dateTime:document.getElementById('dateTime').value.trim(),cutoffSeconds:3600,vacancies:Number(document.getElementById('vacancies').value),currency:'CNY',pricesByCategory:{retailPrices:[{category:'ADULT',price:Number(document.getElementById('price').value)}]}}]};const data=await api('/admin/products/${id}/availability',{method:'POST',body:JSON.stringify(payload)}); print(data);}catch(e){print(String(e));}};
</script></body></html>`;

const uiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_request, reply) => {
    reply.type('text/html; charset=utf-8').send(rootHtml);
  });

  fastify.get('/gyg-bookings', async (_request, reply) => {
    reply.type('text/html; charset=utf-8').send(bookingsHtml);
  });

  fastify.get('/products/:id/calendar', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    reply.type('text/html; charset=utf-8').send(calendarHtml(id));
  });
};

export default uiRoutes;
