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
    <div style="margin-top:10px" class="row">
      <button id="goLogs">查看 GYG 访问日志</button>
      <div></div>
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
document.getElementById('goLogs').onclick = ()=>{ window.location.href = '/integration-logs'; };

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

const logsHtml = `<!doctype html><html lang="zh-CN"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>GYG 访问日志</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fb;margin:0;color:#0f172a}
.wrap{max-width:1200px;margin:24px auto;padding:0 16px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:14px}
.row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}input,select,button{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px}button{background:#111827;color:#fff;cursor:pointer}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e5e7eb;padding:6px;text-align:left;vertical-align:top}th{background:#f8fafc}
.out{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;border-radius:8px;padding:10px;font-size:12px}
</style></head><body><div class="wrap">
<div class="card"><h2>GYG 访问日志</h2><p><a href="/">返回商品管理首页</a></p>
<div class="row">
<div><input id="token" placeholder="Admin Token"/></div>
<div><select id="source"><option value="">all source</option><option value="GYG">GYG</option><option value="GYG_NOTIFY">GYG_NOTIFY</option></select></div>
<div><input id="path" placeholder="path, eg /1/get-availabilities/"/></div>
<div><input id="statusCode" placeholder="status code, eg 200"/></div>
</div>
<div class="row" style="margin-top:10px">
<div><input id="limit" type="number" min="1" max="500" value="100"/></div>
<div><button id="load">加载日志</button></div>
<div></div><div></div>
</div></div>
<div class="card">
<table><thead><tr><th>Time</th><th>Source</th><th>Method</th><th>Path</th><th>Status</th><th>IP</th><th>Duration(ms)</th><th>RequestId</th><th>Body</th></tr></thead><tbody id="tbody"></tbody></table>
</div>
<div class="card"><div id="out" class="out">Ready</div></div></div>
<script>
const out=document.getElementById('out');const tbody=document.getElementById('tbody');
const t=document.getElementById('token');t.value=localStorage.getItem('admin_token')||'';t.onchange=()=>localStorage.setItem('admin_token',t.value.trim());
const print=(v)=>out.textContent=typeof v==='string'?v:JSON.stringify(v,null,2);
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function short(v){const s=typeof v==='string'?v:JSON.stringify(v); return s.length>180?s.slice(0,180)+'...':s;}
async function loadLogs(){
  const token=t.value.trim(); if(!token) throw new Error('缺少 token');
  const q=new URLSearchParams();
  const source=document.getElementById('source').value; if(source) q.set('source',source);
  const path=document.getElementById('path').value.trim(); if(path) q.set('path',path);
  const statusCode=document.getElementById('statusCode').value.trim(); if(statusCode) q.set('statusCode',statusCode);
  const limit=document.getElementById('limit').value.trim(); if(limit) q.set('limit',limit);
  const res=await fetch('/admin/access-logs?'+q.toString(),{headers:{'x-admin-token':token}});
  const text=await res.text(); let body; try{body=JSON.parse(text)}catch{body=text}
  if(!res.ok) throw new Error(JSON.stringify(body));
  const rows=body.data||[];
  tbody.innerHTML='';
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+esc(r.createdAt)+'</td><td>'+esc(r.source)+'</td><td>'+esc(r.method)+'</td><td>'+esc(r.path)+'</td><td>'+esc(r.statusCode)+'</td><td>'+esc(r.ip)+'</td><td>'+esc(r.durationMs)+'</td><td>'+esc(r.requestId)+'</td><td>'+esc(short(r.requestBody||r.responseBody||r.errorMessage||''))+'</td>';
    tbody.appendChild(tr);
  });
  print({count: rows.length});
}
document.getElementById('load').onclick=()=>loadLogs().catch(e=>print(String(e)));
</script></body></html>`;

const calendarHtml = (id: string) => `<!doctype html><html lang="zh-CN"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>商品日历管理</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fb;margin:0;color:#0f172a}
.wrap{max-width:1060px;margin:24px auto;padding:0 16px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:14px}
.row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}label{font-size:12px;color:#334155;display:block;margin-bottom:4px}
input,button,select{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px}
button{background:#111827;color:#fff;cursor:pointer}
button.secondary{background:#334155}
.out{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;border-radius:8px;padding:10px;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
th{background:#f8fafc}
.hint{color:#475569;font-size:12px}
.subblock{border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-top:12px;background:#f8fafc}
.subblock h4{margin:0 0 10px}
</style></head><body><div class="wrap">
<div class="card">
  <h2>商品日历管理</h2>
  <p><a href="/">返回商品列表</a></p>
  <p>product internal id: <b>${id}</b></p>
  <p>product external id: <b id="externalProductId">loading...</b></p>
  <div class="row">
    <div><label>Admin Token</label><input id="token"/></div>
    <div><label>查询开始日期</label><input id="fromDate" type="date"/></div>
    <div><label>查询结束日期</label><input id="toDate" type="date"/></div>
    <div><label>时区偏移</label><input id="tz" value="+08:00"/></div>
  </div>
  <div class="row" style="margin-top:10px">
    <div><button id="load">查询日历</button></div>
    <div><button id="quick7" class="secondary">近7天</button></div>
    <div><button id="quick30" class="secondary">近30天</button></div>
    <div><button id="pushToGyg" class="secondary">推送到 GYG Sandbox</button></div>
  </div>
</div>

<div class="card">
  <h3>写入价格与库存（支持批量区间）</h3>
  <div class="subblock">
    <h4>基础区间</h4>
    <div class="row">
      <div><label>可用性类型</label><select id="availabilityMode"><option value="time_point">time point(固定开团时间)</option><option value="time_period">time period(营业时段)</option></select></div>
      <div><label>开始日期</label><input id="saveFromDate" type="date"/></div>
      <div><label>结束日期</label><input id="saveToDate" type="date"/></div>
      <div><label>库存 vacancies</label><input id="vacancies" type="number" value="20"/></div>
    </div>
  </div>
  <div class="subblock" id="timePointBlock">
    <h4>Time Point 配置</h4>
    <div class="row">
      <div><label>开始时间(可多时段，逗号分隔)</label><input id="saveTimes" value="10:00,14:00"/></div>
      <div></div><div></div><div></div>
    </div>
  </div>
  <div class="subblock" id="timePeriodBlock">
    <h4>Time Period 配置</h4>
    <div class="row">
      <div><label>openingTimes(可多时段，例 09:00-12:00,14:00-18:00)</label><input id="openingRanges" value="09:00-12:00,14:00-18:00"/></div>
      <div></div><div></div><div></div>
    </div>
  </div>
  <div class="subblock">
    <h4>价格配置</h4>
    <div class="row">
      <div><label>GROUP 价(分)</label><input id="groupPrice" type="number" placeholder="group 产品请填"/></div>
      <div><label>成人 ADULT 价(分)</label><input id="adultPrice" type="number" value="19900"/></div>
      <div><label>青年 YOUTH 价(分)</label><input id="youthPrice" type="number" placeholder="可留空"/></div>
      <div><label>儿童 CHILD 价(分)</label><input id="childPrice" type="number" placeholder="可留空"/></div>
    </div>
    <div class="row" style="margin-top:10px">
      <div><label>婴儿 INFANT 价(分)</label><input id="infantPrice" type="number" placeholder="可留空"/></div>
      <div><label>老人 SENIOR 价(分)</label><input id="seniorPrice" type="number" placeholder="可留空"/></div>
      <div><label>学生 STUDENT 价(分)</label><input id="studentPrice" type="number" placeholder="可留空"/></div>
      <div><label>currency</label><input id="currency" value="CNY"/></div>
    </div>
    <div class="row" style="margin-top:10px">
      <div><label>cutoffSeconds</label><input id="cutoffSeconds" type="number" value="3600"/></div>
      <div><label>&nbsp;</label><button id="saveRange">保存到日历</button></div>
      <div></div><div></div>
    </div>
  </div>
  <div class="subblock">
    <h4>预订规则</h4>
    <div class="row">
      <div><label>预订人数最小值 participantsMin</label><input id="participantsMin" type="number" min="1" value="1"/></div>
      <div><label>预订人数最大值 participantsMax</label><input id="participantsMax" type="number" min="1" value="999"/></div>
      <div><label>GROUP groupSize 最小值(可选)</label><input id="groupSizeMin" type="number" min="1" placeholder="可留空"/></div>
      <div><label>GROUP groupSize 最大值</label><input id="groupSizeMax" type="number" min="1" value="999"/></div>
    </div>
    <div class="row" style="margin-top:10px">
      <div><button id="saveBookingRules" class="secondary">保存预订规则</button></div>
      <div></div><div></div><div></div>
    </div>
  </div>
  <p class="hint">说明：time point 会按开始时间写入多个具体时刻；time period 会写入 dateTime=00:00 并附带 openingTimes。</p>
</div>

<div class="card">
  <h3>已加载日历</h3>
  <div class="row" style="margin-bottom:10px">
    <div><label>自动关闭(提前小时)</label><input id="autoCloseHours" type="number" min="0" value="0"/></div>
    <div><label>&nbsp;</label><button id="saveAutoClose" class="secondary">保存自动关闭设置</button></div>
    <div></div>
    <div></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Time</th><th>OpeningTimes</th><th>Vacancies</th><th>Currency</th><th>Prices By Category</th><th>操作</th></tr></thead>
    <tbody id="tableBody"></tbody>
  </table>
</div>

<div class="card"><h3>输出</h3><div id="out" class="out">Ready</div></div>
</div>
<script>
const out=document.getElementById('out');
const tableBody=document.getElementById('tableBody');
const print=(v)=>out.textContent=typeof v==='string'?v:JSON.stringify(v,null,2);
const tokenEl=document.getElementById('token');
tokenEl.value=localStorage.getItem('admin_token')||'';
tokenEl.onchange=()=>localStorage.setItem('admin_token',tokenEl.value.trim());

function pad(v){return String(v).padStart(2,'0');}
function today(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function addDays(dateStr, days){const d=new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+days); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function toIso(dateStr,timeStr,tz){return dateStr+'T'+timeStr+':00'+tz;}
function pricesTextFromRow(row){
  try{
    const prices = row.pricesByCategory && row.pricesByCategory.retailPrices ? row.pricesByCategory.retailPrices : [];
    return prices.map(p=>p.category+':'+p.price).join(' | ');
  }catch{return '';}
}
function parseOffsetMinutes(tz){
  const m=String(tz||'').trim().match(/^([+-])(\d{2}):(\d{2})$/);
  if(!m) return 0;
  const sign=m[1]==='-'?-1:1;
  const hh=Number(m[2]||'0');
  const mm=Number(m[3]||'0');
  return sign*(hh*60+mm);
}
function formatInOffset(iso, tz){
  if(!iso) return {date:'',time:''};
  const d=new Date(iso);
  if(Number.isNaN(d.getTime())) return {date:'',time:''};
  const offsetMin=parseOffsetMinutes(tz);
  const shifted=new Date(d.getTime()+offsetMin*60000);
  return {
    date: shifted.getUTCFullYear()+'-'+pad(shifted.getUTCMonth()+1)+'-'+pad(shifted.getUTCDate()),
    time: pad(shifted.getUTCHours())+':'+pad(shifted.getUTCMinutes())
  };
}
function dateOnly(iso){
  const tz=(document.getElementById('tz')&&document.getElementById('tz').value)||'+08:00';
  return formatInOffset(iso,tz).date;
}
function timeOnly(iso){
  const tz=(document.getElementById('tz')&&document.getElementById('tz').value)||'+08:00';
  return formatInOffset(iso,tz).time;
}
function openingTimesText(row){
  const ots=Array.isArray(row.openingTimes)?row.openingTimes:[];
  return ots.map(x=>x.fromTime+'-'+x.toTime).join(' | ');
}
function updateAvailabilityModeUI(){
  const mode=document.getElementById('availabilityMode').value;
  document.getElementById('timePointBlock').style.display = mode==='time_point' ? 'block' : 'none';
  document.getElementById('timePeriodBlock').style.display = mode==='time_period' ? 'block' : 'none';
}

async function api(path,opt={}){
  const token=tokenEl.value.trim();
  if(!token) throw new Error('缺少 token');
  const baseHeaders={'x-admin-token':token};
  const hasBody=Object.prototype.hasOwnProperty.call(opt,'body') && opt.body!==undefined;
  const contentTypeHeader=hasBody ? {'content-type':'application/json'} : {};
  const headers=Object.assign({},baseHeaders,contentTypeHeader,opt.headers||{});
  const res=await fetch(path,Object.assign({},opt,{headers}));
  const t=await res.text(); let b; try{b=JSON.parse(t)}catch{b=t}
  if(!res.ok) throw new Error(JSON.stringify(b));
  return b;
}

function render(rows){
  tableBody.innerHTML='';
  (rows||[]).forEach(r=>{
    const tr=document.createElement('tr');
    const isTimePeriod=Array.isArray(r.openingTimes)&&r.openingTimes.length>0;
    const displayTime=isTimePeriod?'-':timeOnly(r.dateTime);
    tr.innerHTML='<td>'+dateOnly(r.dateTime)+'</td><td>'+displayTime+'</td><td>'+openingTimesText(r)+'</td><td>'+(r.vacancies??'')+'</td><td>'+(r.currency??'')+'</td><td>'+pricesTextFromRow(r)+'</td><td><button type=\"button\" data-del=\"'+r.id+'\" class=\"secondary\">删除</button></td>';
    tableBody.appendChild(tr);
  });
}

tableBody.onclick=async(ev)=>{
  const target=ev.target;
  const btn=target && target.closest ? target.closest('button[data-del]') : null;
  if(!btn) return;
  try{
    const availabilityId=btn.getAttribute('data-del');
    if(!availabilityId) throw new Error('availabilityId missing');
    const data=await api('/admin/products/${id}/availability/'+encodeURIComponent(availabilityId),{method:'DELETE'});
    if((data && data.data && data.data.deleted) !== 1){
      throw new Error('删除失败：记录不存在或已被删除');
    }
    print({ok:true, deletedAvailabilityId: availabilityId});
    await loadCalendar();
  }catch(e){print(String(e));}
};

async function loadCalendar(){
  const from=document.getElementById('fromDate').value;
  const to=document.getElementById('toDate').value;
  const tz=document.getElementById('tz').value.trim()||'+08:00';
  const fromIso=toIso(from,'00:00',tz);
  const toIsoStr=toIso(to,'23:59',tz);
  const q='?fromDateTime='+encodeURIComponent(fromIso)+'&toDateTime='+encodeURIComponent(toIsoStr);
  const data=await api('/admin/products/${id}/availability'+q);
  render(data.data||[]);
  print(data);
}

function setRange(days){
  const start=today();
  document.getElementById('fromDate').value=start;
  document.getElementById('toDate').value=addDays(start,days-1);
}

function listDates(from,to){
  const dates=[]; let d=from;
  while(d<=to){dates.push(d); d=addDays(d,1);}
  return dates;
}

async function saveRange(){
  const mode=document.getElementById('availabilityMode').value;
  const from=document.getElementById('saveFromDate').value;
  const to=document.getElementById('saveToDate').value;
  const timesRaw=document.getElementById('saveTimes').value.trim();
  const times=timesRaw.split(',').map(s=>s.trim()).filter(Boolean);
  const openingRangesRaw=document.getElementById('openingRanges').value.trim();
  const openingRanges=openingRangesRaw.split(',').map(s=>s.trim()).filter(Boolean);
  const tz=document.getElementById('tz').value.trim()||'+08:00';
  const vacancies=Number(document.getElementById('vacancies').value);
  const groupPriceRaw=document.getElementById('groupPrice').value.trim();
  const adultPriceRaw=document.getElementById('adultPrice').value.trim();
  const youthPriceRaw=document.getElementById('youthPrice').value.trim();
  const childPriceRaw=document.getElementById('childPrice').value.trim();
  const infantPriceRaw=document.getElementById('infantPrice').value.trim();
  const seniorPriceRaw=document.getElementById('seniorPrice').value.trim();
  const studentPriceRaw=document.getElementById('studentPrice').value.trim();
  const currency=document.getElementById('currency').value.trim().toUpperCase();
  const cutoffSeconds=Number(document.getElementById('cutoffSeconds').value);
  if(!from||!to) throw new Error('请选择开始和结束日期');
  if(to<from) throw new Error('结束日期不能小于开始日期');
  if(mode==='time_point' && times.length===0) throw new Error('time point 模式请填写至少一个开始时间');
  if(mode==='time_point' && times.some(t=>!/^\\d{2}:\\d{2}$/.test(t))) throw new Error('时间格式应为 HH:MM，例如 10:00,14:00');
  if(mode==='time_period' && openingRanges.length===0) throw new Error('time period 模式请填写 openingTimes');
  if(mode==='time_period' && openingRanges.some(r=>!/^\\d{2}:\\d{2}-\\d{2}:\\d{2}$/.test(r))) throw new Error('openingTimes 格式应为 HH:MM-HH:MM，例如 09:00-12:00,14:00-18:00');

  const retailPrices=[];
  if(groupPriceRaw!=='') retailPrices.push({category:'GROUP',price:Number(groupPriceRaw)});
  if(adultPriceRaw!=='') retailPrices.push({category:'ADULT',price:Number(adultPriceRaw)});
  if(youthPriceRaw!=='') retailPrices.push({category:'YOUTH',price:Number(youthPriceRaw)});
  if(childPriceRaw!=='') retailPrices.push({category:'CHILD',price:Number(childPriceRaw)});
  if(infantPriceRaw!=='') retailPrices.push({category:'INFANT',price:Number(infantPriceRaw)});
  if(seniorPriceRaw!=='') retailPrices.push({category:'SENIOR',price:Number(seniorPriceRaw)});
  if(studentPriceRaw!=='') retailPrices.push({category:'STUDENT',price:Number(studentPriceRaw)});
  if(retailPrices.length===0) throw new Error('请至少填写一个价格（可填 GROUP 或 ADULT 等）');

  const dates=listDates(from,to);
  const all=[];
  if(mode==='time_period'){
    const openingTimes=openingRanges.map((r)=>{const [fromTime,toTime]=r.split('-'); return {fromTime,toTime};});
    dates.forEach(d=>all.push({
      dateTime:toIso(d,'00:00',tz),
      openingTimes,
      cutoffSeconds,
      vacancies,
      currency,
      pricesByCategory:{retailPrices}
    }));
  }else{
    dates.forEach(d=>times.forEach(t=>all.push({
      dateTime:toIso(d,t,tz),
      cutoffSeconds,
      vacancies,
      currency,
      pricesByCategory:{retailPrices}
    })));
  }
  const payload={availabilities:all};
  const data=await api('/admin/products/${id}/availability',{method:'POST',body:JSON.stringify(payload)});
  print(data);
  await loadCalendar();
}

setRange(30);
document.getElementById('saveFromDate').value=today();
document.getElementById('saveToDate').value=today();
updateAvailabilityModeUI();
document.getElementById('availabilityMode').onchange=()=>updateAvailabilityModeUI();
api('/admin/products/${id}')
  .then((res)=>{
    document.getElementById('externalProductId').textContent = res.data?.productId || 'N/A';
    document.getElementById('autoCloseHours').value = String(res.data?.autoCloseHours ?? 0);
    document.getElementById('participantsMin').value = String(res.data?.participantsMin ?? 1);
    document.getElementById('participantsMax').value = String(res.data?.participantsMax ?? 999);
    const groupCfg = (res.data?.pricingCategories || []).find((x)=>x.category==='GROUP');
    if(groupCfg){
      if(groupCfg.groupSizeMin!=null) document.getElementById('groupSizeMin').value = String(groupCfg.groupSizeMin);
      if(groupCfg.groupSizeMax!=null) document.getElementById('groupSizeMax').value = String(groupCfg.groupSizeMax);
    }
  })
  .catch(()=>{document.getElementById('externalProductId').textContent = 'N/A';});
document.getElementById('quick7').onclick=()=>setRange(7);
document.getElementById('quick30').onclick=()=>setRange(30);
document.getElementById('load').onclick=()=>loadCalendar().catch(e=>print(String(e)));
document.getElementById('saveRange').onclick=()=>saveRange().catch(e=>print(String(e)));
document.getElementById('saveAutoClose').onclick=async()=>{
  try{
    const autoCloseHours=Number(document.getElementById('autoCloseHours').value||0);
    const data=await api('/admin/products/${id}/settings',{method:'PATCH',body:JSON.stringify({autoCloseHours})});
    print(data);
  }catch(e){print(String(e));}
};
document.getElementById('saveBookingRules').onclick=async()=>{
  try{
    const participantsMin=Number(document.getElementById('participantsMin').value||1);
    const participantsMax=Number(document.getElementById('participantsMax').value||999);
    const groupSizeMinRaw=document.getElementById('groupSizeMin').value.trim();
    const groupSizeMax=Number(document.getElementById('groupSizeMax').value||999);
    if(participantsMax < participantsMin) throw new Error('participantsMax 不能小于 participantsMin');
    const payload={
      participantsMin,
      participantsMax,
      groupSizeMax
    };
    if(groupSizeMinRaw!=='') payload.groupSizeMin=Number(groupSizeMinRaw);
    const data=await api('/admin/products/${id}/settings',{method:'PATCH',body:JSON.stringify(payload)});
    print(data);
  }catch(e){print(String(e));}
};
document.getElementById('pushToGyg').onclick=async()=>{
  try{
    const from=document.getElementById('fromDate').value;
    const to=document.getElementById('toDate').value;
    const tz=document.getElementById('tz').value.trim()||'+08:00';
    const payload={
      fromDateTime: toIso(from,'00:00',tz),
      toDateTime: toIso(to,'23:59',tz)
    };
    const data=await api('/admin/products/${id}/push-notify-availability-update',{method:'POST',body:JSON.stringify(payload)});
    print(data);
  }catch(e){print(String(e));}
};
</script></body></html>`;

const uiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_request, reply) => {
    reply.type('text/html; charset=utf-8').send(rootHtml);
  });

  fastify.get('/gyg-bookings', async (_request, reply) => {
    reply.type('text/html; charset=utf-8').send(bookingsHtml);
  });

  fastify.get('/integration-logs', async (_request, reply) => {
    reply.type('text/html; charset=utf-8').send(logsHtml);
  });

  fastify.get('/products/:id/calendar', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    reply.type('text/html; charset=utf-8').send(calendarHtml(id));
  });
};

export default uiRoutes;
