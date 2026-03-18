import type { FastifyPluginAsync } from 'fastify';

const TABLER_VERSION = '1.4.0';

type NavKey = 'products' | 'bookings' | 'logs';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderDocument(title: string, body: string, script: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/core@${TABLER_VERSION}/dist/css/tabler.min.css" />
  <style>
    :root {
      --gyg-shell: #f4f6fb;
      --gyg-sidebar: #182433;
      --gyg-sidebar-muted: rgba(255, 255, 255, 0.72);
      --gyg-accent: #206bc4;
    }

    html[data-bs-theme='dark'] body {
      background: linear-gradient(180deg, #0b1220 0%, #0f172a 42%, #101826 100%);
    }

    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(180deg, #eef3fb 0%, #f7f9fd 40%, #f4f6fb 100%);
    }

    .navbar-vertical {
      background: linear-gradient(180deg, #182433 0%, #101926 100%);
      border-right: 0;
    }

    .app-sidebar {
      box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.04);
    }

    .app-sidebar .container-fluid {
      padding: 1rem 1rem 1.25rem;
    }

    .app-sidebar .navbar-collapse {
      flex-direction: column;
    }

    .navbar-brand-title {
      color: #fff;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      line-height: 1.2;
    }

    .navbar-brand-subtitle {
      color: var(--gyg-sidebar-muted);
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    .app-nav {
      gap: 0.35rem;
    }

    .navbar-vertical .nav-link {
      color: var(--gyg-sidebar-muted);
      border-radius: 0.9rem;
      margin-bottom: 0;
      padding: 0.95rem 1rem;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.3;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .navbar-vertical .nav-link.active,
    .navbar-vertical .nav-link:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }

    .page-header-card {
      background:
        radial-gradient(circle at top right, rgba(32, 107, 196, 0.24), transparent 32%),
        linear-gradient(135deg, #fff 0%, #f7f9fd 100%);
      border: 1px solid rgba(15, 23, 42, 0.06);
      border-radius: 1.25rem;
      padding: 1.25rem;
      box-shadow: 0 14px 50px rgba(15, 23, 42, 0.06);
    }

    html[data-bs-theme='dark'] .page-header-card {
      background:
        radial-gradient(circle at top right, rgba(76, 147, 240, 0.16), transparent 34%),
        linear-gradient(135deg, #111827 0%, #0f172a 100%);
      border-color: rgba(148, 163, 184, 0.12);
      box-shadow: 0 18px 52px rgba(2, 6, 23, 0.3);
    }

    .nav-link-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 1.25rem;
      opacity: 0.92;
    }

    .nav-link-label {
      display: block;
      letter-spacing: 0;
    }

    .btn .nav-link-icon {
      width: 1rem;
      height: 1rem;
      flex: 0 0 auto;
      margin-right: 0.4rem;
    }

    .sidebar-auth {
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .sidebar-auth-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1rem;
      padding: 0.875rem;
    }

    .sidebar-auth-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: nowrap;
    }

    .sidebar-auth-actions .btn {
      white-space: nowrap;
    }

    .theme-switcher {
      margin-top: 0.75rem;
      display: grid;
      gap: 0.5rem;
    }

    .theme-switcher .btn-group {
      width: 100%;
    }

    .theme-switcher .btn {
      justify-content: center;
    }

    .login-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background:
        radial-gradient(circle at top left, rgba(32, 107, 196, 0.18), transparent 28%),
        linear-gradient(180deg, #edf3fb 0%, #f8faff 100%);
    }

    .login-card {
      width: min(100%, 440px);
      border-radius: 1.25rem;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .product-card {
      height: 100%;
      border-radius: 1rem;
      border: 1px solid rgba(15, 23, 42, 0.08);
      transition: transform 0.16s ease, box-shadow 0.16s ease;
    }

    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    }

    .product-meta {
      font-size: 0.75rem;
      color: var(--tblr-secondary);
      word-break: break-all;
    }

    .debug-output {
      background: #0f172a;
      color: #dbeafe;
      border-radius: 1rem;
      padding: 1rem;
      font-size: 0.8125rem;
      min-height: 160px;
      white-space: pre-wrap;
      overflow: auto;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .floating-console-btn {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 1050;
      box-shadow: 0 16px 36px rgba(32, 107, 196, 0.28);
    }

    .console-output {
      background: #0f172a;
      color: #dbeafe;
      border-radius: 0.875rem;
      padding: 1rem;
      min-height: 240px;
      max-height: 40vh;
      overflow: auto;
      font-size: 0.8125rem;
      white-space: pre-wrap;
    }

    .console-output-entry + .console-output-entry {
      margin-top: 0.875rem;
      padding-top: 0.875rem;
      border-top: 1px solid rgba(148, 163, 184, 0.18);
    }

    .console-output-meta {
      color: #93c5fd;
      font-size: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .supplier-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .supplier-toolbar .form-select,
    .supplier-toolbar .form-control {
      min-width: 140px;
    }

    .stat-soft {
      border-radius: 1rem;
      background: #f6f8fc;
      padding: 1rem;
      border: 1px solid rgba(15, 23, 42, 0.06);
    }

    .empty-state {
      border: 1px dashed rgba(15, 23, 42, 0.15);
      border-radius: 1rem;
      padding: 2rem 1rem;
      text-align: center;
      color: var(--tblr-secondary);
      background: rgba(255, 255, 255, 0.7);
    }

    html[data-bs-theme='dark'] .empty-state,
    html[data-bs-theme='dark'] .stat-soft {
      background: rgba(15, 23, 42, 0.66);
      border-color: rgba(148, 163, 184, 0.12);
    }

    @media (min-width: 992px) {
      .app-sidebar .navbar-collapse {
        min-height: calc(100vh - 4.5rem);
      }
    }

    @media (max-width: 991.98px) {
      .app-sidebar .navbar-collapse {
        padding-top: 0.75rem;
      }

      .sidebar-auth {
        margin-top: 1rem;
      }
    }
  </style>
</head>
<body>
${body}
<script src="https://cdn.jsdelivr.net/npm/@tabler/core@${TABLER_VERSION}/dist/js/tabler.min.js"></script>
<script>
${script}
</script>
</body>
</html>`;
}

function renderIcon(
  name:
    | 'package'
    | 'calendar'
    | 'activity'
    | 'plus'
    | 'refresh'
    | 'shield'
    | 'moon'
    | 'sun'
    | 'device'
    | 'terminal'
    | 'copy'
    | 'trash'
    | 'chevronLeft'
    | 'chevronRight'
    | 'search'
    | 'list'
): string {
  const icons = {
    package:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 4v10l-7 4l-7-4V7z"/><path d="M12 12l7-4"/><path d="M12 12v9"/><path d="M12 12L5 8"/></svg>',
    calendar:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/></svg>',
    activity:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3 6l4-12l3 6h4"/></svg>',
    plus:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    refresh:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/></svg>',
    shield:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 4v5c0 5-3 8-7 9c-4-1-7-4-7-9V7z"/></svg>',
    moon:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.132 0 .263 0 .393 .002a9 9 0 1 0 8.605 11.994a9 9 0 0 1 -8.998 -11.996z"/></svg>',
    sun:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 12h1"/><path d="M12 3v1"/><path d="M5.6 5.6l.7 .7"/><path d="M20 12h1"/><path d="M12 20v1"/><path d="M18.4 18.4l.7 .7"/><path d="M18.4 5.6l.7 -.7"/><path d="M5.6 18.4l.7 -.7"/></svg>',
    device:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/><path d="M7 20h10"/><path d="M9 16v4"/><path d="M15 16v4"/></svg>',
    terminal:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7l5 5l-5 5"/><path d="M12 19l7 0"/></svg>',
    copy:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    trash:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7l1 -3h4l1 3"/></svg>',
    chevronLeft:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6"/></svg>',
    chevronRight:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg>',
    search:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/></svg>',
    list:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l11 0"/><path d="M9 12l11 0"/><path d="M9 18l11 0"/><path d="M5 6l0 .01"/><path d="M5 12l0 .01"/><path d="M5 18l0 .01"/></svg>'
  } as const;

  return icons[name];
}

function renderAppShell(options: {
  activeNav: NavKey;
  pretitle: string;
  title: string;
  description: string;
  actions?: string;
  content: string;
}): string {
  const navItems = [
    { key: 'products', href: '/', label: '商品列表', icon: renderIcon('package') },
    { key: 'bookings', href: '/gyg-bookings', label: 'GYG Booking 管理', icon: renderIcon('calendar') },
    { key: 'logs', href: '/integration-logs', label: 'GYG 访问日志', icon: renderIcon('activity') }
  ];

  const navHtml = navItems
    .map(
      (item) => `<li class="nav-item">
        <a class="nav-link${item.key === options.activeNav ? ' active' : ''}" href="${item.href}">
          ${item.icon}
          <span class="nav-link-label">${item.label}</span>
        </a>
      </li>`
    )
    .join('');

  return `<div id="login-screen" class="login-shell" hidden>
    <div class="card login-card">
      <div class="card-body p-4 p-md-5">
        <div class="text-uppercase text-secondary fw-bold mb-2">GYG Admin</div>
        <h1 class="h2 mb-3">输入 Admin Token</h1>
        <p class="text-secondary mb-4">当前后台先使用单字段登录。Token 仅保存在浏览器本地，用于调用现有管理接口。</p>
        <form id="login-form" class="d-grid gap-3">
          <label class="form-label mb-0">
            <span class="form-label-description">Admin Token</span>
            <input id="login-token" class="form-control form-control-lg" placeholder="x-admin-token" autocomplete="off" />
          </label>
          <button class="btn btn-primary btn-lg" type="submit">进入后台</button>
        </form>
        <div id="login-error" class="text-danger small mt-3" hidden></div>
      </div>
    </div>
  </div>

  <div id="app-shell" class="page" hidden>
    <aside class="navbar navbar-vertical navbar-expand-lg app-sidebar" data-bs-theme="dark">
      <div class="container-fluid">
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#sidebar-menu" aria-controls="sidebar-menu" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="navbar-brand navbar-brand-autodark d-flex flex-column align-items-start py-3">
          <span class="navbar-brand-subtitle">Tabler Based</span>
          <span class="navbar-brand-title">GYG Admin Console</span>
        </div>
        <div class="collapse navbar-collapse" id="sidebar-menu">
          <ul class="navbar-nav app-nav pt-lg-2">
            ${navHtml}
          </ul>
          <div class="sidebar-auth">
            <div class="sidebar-auth-card">
              <div class="d-flex align-items-center gap-2 text-secondary small mb-2">
                ${renderIcon('shield')}
                <span>当前认证</span>
              </div>
              <div class="sidebar-auth-actions">
                <span id="token-indicator" class="badge bg-azure-lt text-azure">未登录</span>
                <button id="logout-btn" class="btn btn-sm btn-outline-light" type="button">退出</button>
              </div>
              <div class="theme-switcher">
                <div class="text-secondary small">主题</div>
                <div class="btn-group" role="group" aria-label="Theme switcher">
                  <button type="button" class="btn btn-sm btn-outline-light" data-theme-value="auto">${renderIcon('device')}<span>跟随系统</span></button>
                  <button type="button" class="btn btn-sm btn-outline-light" data-theme-value="light">${renderIcon('sun')}<span>浅色</span></button>
                  <button type="button" class="btn btn-sm btn-outline-light" data-theme-value="dark">${renderIcon('moon')}<span>深色</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <div class="page-wrapper">
      <div class="page-body">
        <div class="container-xl py-4 py-lg-5">
          <div class="page-header-card mb-4">
            <div class="row align-items-center g-3">
              <div class="col">
                <div class="text-uppercase text-secondary fw-bold small">${options.pretitle}</div>
                <h1 class="page-title mb-2">${options.title}</h1>
                <div class="text-secondary">${options.description}</div>
              </div>
              <div class="col-12 col-md-auto">
                ${options.actions ?? ''}
              </div>
            </div>
          </div>
          ${options.content}
        </div>
      </div>
    </div>
  </div>

  <a href="#" class="btn btn-floating btn-icon btn-primary floating-console-btn" data-bs-toggle="offcanvas" data-bs-target="#console-offcanvas" aria-controls="console-offcanvas" aria-label="Open debug console">
    ${renderIcon('terminal')}
  </a>

  <div class="offcanvas offcanvas-bottom h-auto" tabindex="-1" id="console-offcanvas" aria-labelledby="console-offcanvas-label">
    <div class="offcanvas-header">
      <div>
        <div class="text-uppercase text-secondary fw-bold small">Runtime Console</div>
        <h2 class="offcanvas-title" id="console-offcanvas-label">请求与调试输出</h2>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button id="copy-console" class="btn btn-outline-primary btn-sm" type="button">${renderIcon('copy')}<span>复制</span></button>
        <button id="clear-console" class="btn btn-outline-secondary btn-sm" type="button">${renderIcon('trash')}<span>清空</span></button>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
    </div>
    <div class="offcanvas-body pt-0">
      <div id="console-output" class="console-output">Ready</div>
    </div>
  </div>`;
}

function sharedScript(pageScript: string): string {
  return `
const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_THEME_KEY = 'admin_theme_mode';
const consoleEntries = [];

function getToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

function setToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
}

function clearToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function getThemeMode() {
  return localStorage.getItem(ADMIN_THEME_KEY) || 'auto';
}

function resolveTheme(mode) {
  if (mode === 'dark' || mode === 'light') {
    return mode;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode) {
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute('data-bs-theme', resolved);
  document.querySelectorAll('[data-theme-value]').forEach((button) => {
    const active = button.getAttribute('data-theme-value') === mode;
    button.classList.toggle('btn-primary', active);
    button.classList.toggle('btn-outline-light', !active);
  });
}

function setThemeMode(mode) {
  localStorage.setItem(ADMIN_THEME_KEY, mode);
  applyTheme(mode);
}

function renderShellVisibility() {
  const token = getToken();
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  const indicator = document.getElementById('token-indicator');
  if (token) {
    loginScreen.hidden = true;
    appShell.hidden = false;
    if (indicator) {
      indicator.textContent = '已登录';
      indicator.className = 'badge bg-green-lt text-green';
    }
  } else {
    loginScreen.hidden = false;
    appShell.hidden = true;
    if (indicator) {
      indicator.textContent = '未登录';
      indicator.className = 'badge bg-azure-lt text-azure';
    }
  }
}

async function api(path, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error('请先输入 Admin Token');
  }

  const headers = Object.assign({}, options.headers || {}, {
    'x-admin-token': token
  });

  if (Object.prototype.hasOwnProperty.call(options, 'body')) {
    headers['content-type'] = headers['content-type'] || 'application/json';
  }

  const response = await fetch(path, Object.assign({}, options, { headers }));
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  }

  return body;
}

function formatOutput(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function renderConsole() {
  const output = document.getElementById('console-output');
  if (!output) {
    return;
  }
  if (!consoleEntries.length) {
    output.textContent = 'Ready';
    return;
  }
  output.innerHTML = consoleEntries
    .map((entry) => '<div class="console-output-entry"><div class="console-output-meta">' + entry.time + '</div><div>' + entry.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') + '</div></div>')
    .join('');
  output.scrollTop = output.scrollHeight;
}

function appendLog(value) {
  consoleEntries.push({
    time: new Date().toLocaleString('zh-CN'),
    text: formatOutput(value)
  });
  renderConsole();
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getThemeMode());
  renderShellVisibility();
  renderConsole();

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  if (media && media.addEventListener) {
    media.addEventListener('change', () => {
      if (getThemeMode() === 'auto') {
        applyTheme('auto');
      }
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.getElementById('login-token');
      const error = document.getElementById('login-error');
      const token = input.value.trim();
      if (!token) {
        error.hidden = false;
        error.textContent = '请输入 Admin Token';
        return;
      }
      setToken(token);
      error.hidden = true;
      renderShellVisibility();
      if (typeof window.onAdminReady === 'function') {
        window.onAdminReady();
      }
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearToken();
      renderShellVisibility();
    });
  }

  document.querySelectorAll('[data-theme-value]').forEach((button) => {
    button.addEventListener('click', () => {
      setThemeMode(button.getAttribute('data-theme-value'));
    });
  });

  const clearConsoleBtn = document.getElementById('clear-console');
  if (clearConsoleBtn) {
    clearConsoleBtn.addEventListener('click', () => {
      consoleEntries.length = 0;
      renderConsole();
    });
  }

  const copyConsoleBtn = document.getElementById('copy-console');
  if (copyConsoleBtn) {
    copyConsoleBtn.addEventListener('click', async () => {
      const text = consoleEntries.map((entry) => '[' + entry.time + ']\\n' + entry.text).join('\\n\\n');
      await navigator.clipboard.writeText(text || 'Ready');
      appendLog('Console copied to clipboard');
    });
  }

  ${pageScript}
});
`;
}

function productsPage(): string {
  const body = renderAppShell({
    activeNav: 'products',
    pretitle: 'Products',
    title: '商品列表',
    description: '先按 Tabler 的组合式后台结构整理入口。右侧功能组件后续再逐步细化。',
    actions: `<div class="d-flex gap-2">
      <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#create-product-modal" type="button">${renderIcon('plus')}<span>新建商品</span></button>
      <button id="reload-products" class="btn btn-outline-primary" type="button">${renderIcon('refresh')}<span>刷新列表</span></button>
    </div>`,
    content: `<div class="row row-cards">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">商品目录</h3>
              <div class="text-secondary small mt-1">先从已有商品中提取 Supplier ID，下拉切换后自动加载。</div>
            </div>
          </div>
          <div class="card-body border-bottom py-3">
            <div class="supplier-toolbar">
              <div class="text-secondary">
                Supplier
                <div class="ms-2 d-inline-block">
                  <select id="supplierIdFilter" class="form-select form-select-sm" aria-label="Select supplier"></select>
                </div>
              </div>
              <div class="text-secondary">
                Show
                <div class="mx-2 d-inline-block">
                  <input id="pageSize" type="number" class="form-control form-control-sm" value="8" min="1" max="100" size="3" aria-label="Products count">
                </div>
                entries
              </div>
              <div class="ms-auto text-secondary">
                Search:
                <div class="ms-2 d-inline-block">
                  <input id="productSearch" type="text" class="form-control form-control-sm" placeholder="商品名 / productId" aria-label="Search products">
                </div>
              </div>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-selectable card-table table-vcenter text-nowrap datatable">
              <thead>
                <tr>
                  <th class="w-1"><input id="selectAllProducts" class="form-check-input m-0 align-middle" type="checkbox" aria-label="Select all products"></th>
                  <th class="w-1">No.</th>
                  <th>商品</th>
                  <th>Supplier</th>
                  <th>External ID</th>
                  <th>Status</th>
                  <th>Currency</th>
                  <th>Timezone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="productsTableBody"></tbody>
            </table>
          </div>
          <div class="card-footer">
            <div class="row g-2 justify-content-center justify-content-sm-between">
              <div class="col-auto d-flex align-items-center">
                <p id="productsTableMeta" class="m-0 text-secondary">Showing <strong>0 to 0</strong> of <strong>0 entries</strong></p>
              </div>
              <div class="col-auto">
                <ul class="pagination m-0 ms-auto">
                  <li class="page-item">
                    <button id="prevPage" class="page-link" type="button" aria-label="Previous">${renderIcon('chevronLeft')}</button>
                  </li>
                  <li class="page-item disabled">
                    <span id="pageIndicator" class="page-link">1 / 1</span>
                  </li>
                  <li class="page-item">
                    <button id="nextPage" class="page-link" type="button" aria-label="Next">${renderIcon('chevronRight')}</button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal modal-blur fade" id="create-product-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">创建商品</h3>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form id="create-product-form">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">supplierId</label>
                  <input id="supplierId" class="form-control" value="supplier123" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">productId</label>
                  <input id="productId" class="form-control" value="prod-web-001" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">name</label>
                  <input id="name" class="form-control" value="Web Product" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">timezone</label>
                  <input id="timezone" class="form-control" value="Asia/Shanghai" required />
                </div>
                <div class="col-md-4">
                  <label class="form-label">currency</label>
                  <input id="currency" class="form-control" value="CNY" required />
                </div>
                <div class="col-md-4">
                  <label class="form-label">pricingMode</label>
                  <select id="pricingMode" class="form-select">
                    <option value="MANUAL_IN_GYG">MANUAL_IN_GYG</option>
                    <option value="PRICE_OVER_API">PRICE_OVER_API</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">status</label>
                  <select id="status" class="form-select">
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">description</label>
                  <textarea id="description" class="form-control" rows="4">Created from Tabler UI</textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-link link-secondary" type="button" data-bs-dismiss="modal">取消</button>
              <button class="btn btn-primary ms-auto" type="submit">创建商品</button>
            </div>
          </form>
        </div>
      </div>
    </div>`
  });

  const script = sharedScript(`
const supplierSelect = document.getElementById('supplierIdFilter');
const productsTableBody = document.getElementById('productsTableBody');
const pageSizeInput = document.getElementById('pageSize');
const productSearchInput = document.getElementById('productSearch');
const productsTableMeta = document.getElementById('productsTableMeta');
const pageIndicator = document.getElementById('pageIndicator');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const selectAllProducts = document.getElementById('selectAllProducts');
let allProducts = [];
let currentPage = 1;

function print(value) {
  appendLog(value);
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function statusBadge(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') {
    return '<span class="badge bg-success-lt text-success">active</span>';
  }
  if (normalized === 'inactive') {
    return '<span class="badge bg-secondary-lt text-secondary">inactive</span>';
  }
  return '<span class="badge bg-azure-lt text-azure">' + esc(status || '-') + '</span>';
}

function getFilteredProducts() {
  const supplierId = supplierSelect.value;
  const keyword = productSearchInput.value.trim().toLowerCase();
  return allProducts.filter((product) => {
    if (supplierId && product.supplierId !== supplierId) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return [product.name, product.productId, product.id, product.supplierId]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });
}

function renderProductsTable() {
  const filtered = getFilteredProducts();
  const pageSize = Math.max(1, Number(pageSizeInput.value || 8));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);
  productsTableBody.innerHTML = '';

  if (!pageRows.length) {
    productsTableBody.innerHTML = '<tr><td colspan="9"><div class="empty-state">当前筛选条件下没有商品</div></td></tr>';
  } else {
    pageRows.forEach((product, index) => {
      const row = document.createElement('tr');
      row.innerHTML =
        '<td><input class="form-check-input m-0 align-middle table-selectable-check" type="checkbox" aria-label="Select product"></td>' +
        '<td><span class="text-secondary">' + esc(String(startIndex + index + 1).padStart(3, '0')) + '</span></td>' +
        '<td><div class="fw-semibold">' + esc(product.name || '-') + '</div><div class="text-secondary small">' + esc(product.id || '-') + '</div></td>' +
        '<td>' + esc(product.supplierId || '-') + '</td>' +
        '<td>' + esc(product.productId || '-') + '</td>' +
        '<td>' + statusBadge(product.status) + '</td>' +
        '<td>' + esc(product.currency || '-') + '</td>' +
        '<td>' + esc(product.timezone || '-') + '</td>' +
        '<td class="text-end"><div class="dropdown"><button class="btn dropdown-toggle align-text-top" data-bs-toggle="dropdown" type="button">Actions</button><div class="dropdown-menu dropdown-menu-end"><a class="dropdown-item" href="/products/' + encodeURIComponent(product.id) + '/calendar">商品详情</a></div></div></td>';
      productsTableBody.appendChild(row);
    });
  }

  const shownFrom = filtered.length ? startIndex + 1 : 0;
  const shownTo = Math.min(startIndex + pageRows.length, filtered.length);
  productsTableMeta.innerHTML = 'Showing <strong>' + shownFrom + ' to ' + shownTo + '</strong> of <strong>' + filtered.length + ' entries</strong>';
  pageIndicator.textContent = currentPage + ' / ' + totalPages;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  if (selectAllProducts) {
    selectAllProducts.checked = false;
  }
}

function renderSupplierOptions() {
  const supplierIds = Array.from(new Set(allProducts.map((product) => product.supplierId).filter(Boolean))).sort();
  const currentValue = supplierSelect.value;
  supplierSelect.innerHTML = supplierIds.map((supplierId) => '<option value="' + esc(supplierId) + '">' + esc(supplierId) + '</option>').join('');
  if (!supplierSelect.innerHTML) {
    supplierSelect.innerHTML = '<option value="">No suppliers</option>';
    return;
  }
  if (currentValue && supplierIds.includes(currentValue)) {
    supplierSelect.value = currentValue;
  }
  const createSupplierInput = document.getElementById('supplierId');
  if (createSupplierInput && supplierSelect.value) {
    createSupplierInput.value = supplierSelect.value;
  }
}

async function loadProducts() {
  const data = await api('/admin/products');
  allProducts = data.data || [];
  renderSupplierOptions();
  renderProductsTable();
  print(data);
}

document.getElementById('reload-products').addEventListener('click', () => {
  loadProducts().catch((error) => print(String(error)));
});

supplierSelect.addEventListener('change', () => {
  currentPage = 1;
  document.getElementById('supplierId').value = supplierSelect.value;
  renderProductsTable();
  print({ action: 'supplier_changed', supplierId: supplierSelect.value });
});

productSearchInput.addEventListener('input', () => {
  currentPage = 1;
  renderProductsTable();
});

pageSizeInput.addEventListener('change', () => {
  currentPage = 1;
  renderProductsTable();
});

prevPageBtn.addEventListener('click', () => {
  currentPage = Math.max(1, currentPage - 1);
  renderProductsTable();
});

nextPageBtn.addEventListener('click', () => {
  currentPage += 1;
  renderProductsTable();
});

if (selectAllProducts) {
  selectAllProducts.addEventListener('change', () => {
    document.querySelectorAll('#productsTableBody .table-selectable-check').forEach((checkbox) => {
      checkbox.checked = selectAllProducts.checked;
    });
  });
}

document.getElementById('create-product-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const payload = {
      supplierId: document.getElementById('supplierId').value.trim(),
      productId: document.getElementById('productId').value.trim(),
      name: document.getElementById('name').value.trim(),
      description: document.getElementById('description').value.trim(),
      timezone: document.getElementById('timezone').value.trim(),
      currency: document.getElementById('currency').value.trim(),
      pricingMode: document.getElementById('pricingMode').value,
      status: document.getElementById('status').value,
      destinationCity: 'Shanghai',
      destinationCountry: 'CHN'
    };
    const data = await api('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    print(data);
    window.bootstrap.Modal.getInstance(document.getElementById('create-product-modal')).hide();
    await loadProducts();
  } catch (error) {
    print(String(error));
  }
});

window.onAdminReady = () => {
  loadProducts().catch((error) => print(String(error)));
};

if (getToken()) {
  window.onAdminReady();
}
`);

  return renderDocument('GYG 商品列表', body, script);
}

function bookingsPage(): string {
  const body = renderAppShell({
    activeNav: 'bookings',
    pretitle: 'Bookings',
    title: 'GYG Booking 管理',
    description: '保留现有 booking 查询接口，先完成 Tabler 后台壳层和筛选交互。',
    content: `<div class="row row-cards">
      <div class="col-12 col-xl-4">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">筛选条件</h3>
          </div>
          <div class="card-body d-grid gap-3">
            <label class="form-label mb-0">
              <span class="form-label-description">状态</span>
              <select id="status" class="form-select">
                <option value="">all status</option>
                <option value="created">created</option>
                <option value="confirmed">confirmed</option>
                <option value="cancelled">cancelled</option>
                <option value="failed">failed</option>
              </select>
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">GYG Booking Reference</span>
              <input id="gygRef" class="form-control" placeholder="gygBookingReference" />
            </label>
            <button id="load" class="btn btn-primary" type="button">查询 Bookings</button>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-8">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">查询结果</h3>
          </div>
          <div class="card-body">
            <div class="text-secondary">查询结果将写入底部调试面板。</div>
          </div>
        </div>
      </div>
    </div>`
  });

  const script = sharedScript(`
function print(value) {
  appendLog(value);
}

async function loadBookings() {
  const status = document.getElementById('status').value;
  const ref = document.getElementById('gygRef').value.trim();
  const query = new URLSearchParams();
  if (status) {
    query.set('status', status);
  }
  if (ref) {
    query.set('gygBookingReference', ref);
  }
  const data = await api('/admin/bookings' + (query.toString() ? ('?' + query.toString()) : ''));
  print(data);
}

document.getElementById('load').addEventListener('click', () => {
  loadBookings().catch((error) => print(String(error)));
});
`);

  return renderDocument('GYG Booking 管理', body, script);
}

function logsPage(): string {
  const body = renderAppShell({
    activeNav: 'logs',
    pretitle: 'Logs',
    title: 'GYG 访问日志',
    description: '现阶段保留日志查询能力，用 Tabler 表格和筛选卡片重做信息布局。',
    content: `<div class="row row-cards">
      <div class="col-12 col-xl-3">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">筛选条件</h3>
          </div>
          <div class="card-body d-grid gap-3">
            <label class="form-label mb-0">
              <span class="form-label-description">Source</span>
              <select id="source" class="form-select">
                <option value="">all source</option>
                <option value="GYG">GYG</option>
                <option value="GYG_NOTIFY">GYG_NOTIFY</option>
              </select>
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">Path</span>
              <input id="path" class="form-control" placeholder="/1/get-availabilities/" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">Status Code</span>
              <input id="statusCode" class="form-control" placeholder="200" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">Limit</span>
              <input id="limit" class="form-control" type="number" min="1" max="500" value="100" />
            </label>
            <button id="load" class="btn btn-primary" type="button">加载日志</button>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-9">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">日志列表</h3>
          </div>
          <div class="table-wrap">
            <table class="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>IP</th>
                  <th>Duration</th>
                  <th>RequestId</th>
                  <th>Body</th>
                </tr>
              </thead>
              <tbody id="tbody"></tbody>
            </table>
          </div>
        </div>
        <div class="card mt-3">
          <div class="card-header">
            <h3 class="card-title">调试输出</h3>
          </div>
          <div class="card-body">
            <div class="text-secondary">查询结果与错误信息将写入底部调试面板。</div>
          </div>
        </div>
      </div>
    </div>`
  });

  const script = sharedScript(`
const tbody = document.getElementById('tbody');

function print(value) {
  appendLog(value);
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function short(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 180 ? text.slice(0, 180) + '...' : text;
}

async function loadLogs() {
  const query = new URLSearchParams();
  const source = document.getElementById('source').value;
  const path = document.getElementById('path').value.trim();
  const statusCode = document.getElementById('statusCode').value.trim();
  const limit = document.getElementById('limit').value.trim();
  if (source) query.set('source', source);
  if (path) query.set('path', path);
  if (statusCode) query.set('statusCode', statusCode);
  if (limit) query.set('limit', limit);

  const data = await api('/admin/access-logs?' + query.toString());
  const rows = data.data || [];
  tbody.innerHTML = '';

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + esc(row.createdAt) + '</td>' +
      '<td>' + esc(row.source) + '</td>' +
      '<td>' + esc(row.method) + '</td>' +
      '<td>' + esc(row.path) + '</td>' +
      '<td>' + esc(row.statusCode) + '</td>' +
      '<td>' + esc(row.ip) + '</td>' +
      '<td>' + esc(row.durationMs) + ' ms</td>' +
      '<td>' + esc(row.requestId) + '</td>' +
      '<td>' + esc(short(row.requestBody || row.responseBody || row.errorMessage || '')) + '</td>';
    tbody.appendChild(tr);
  });

  print({ count: rows.length });
}

document.getElementById('load').addEventListener('click', () => {
  loadLogs().catch((error) => print(String(error)));
});
`);

  return renderDocument('GYG 访问日志', body, script);
}

function calendarPage(id: string, timezone: string): string {
  const safeId = escapeHtml(id);
  const safeTimezone = escapeHtml(timezone);
  const body = renderAppShell({
    activeNav: 'products',
    pretitle: 'Product Detail',
    title: '商品详情页',
    description: '这里先套用 Tabler 风格，核心日历、addons、推送 GYG 的现有功能先保留。',
    actions: `<a class="btn btn-outline-primary" href="/">返回商品列表</a>`,
    content: `<div class="row row-cards">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <div class="stat-soft">
                  <div class="text-secondary small">Internal Product ID</div>
                  <div class="fw-semibold">${safeId}</div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-soft">
                  <div class="text-secondary small">External Product ID</div>
                  <div id="externalProductId" class="fw-semibold">loading...</div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-soft">
                  <div class="text-secondary small">Timezone</div>
                  <div class="fw-semibold">${safeTimezone}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-4">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">查询日历</h3>
          </div>
          <div class="card-body d-grid gap-3">
            <label class="form-label mb-0">
              <span class="form-label-description">开始日期</span>
              <input id="fromDate" type="date" class="form-control" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">结束日期</span>
              <input id="toDate" type="date" class="form-control" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">时区偏移</span>
              <input id="tz" class="form-control" value="+08:00" />
            </label>
            <div class="d-grid gap-2">
              <button id="load" class="btn btn-primary" type="button">查询日历</button>
              <button id="quick7" class="btn btn-outline-primary" type="button">近 7 天</button>
              <button id="quick30" class="btn btn-outline-primary" type="button">近 30 天</button>
              <button id="pushToGyg" class="btn btn-outline-secondary" type="button">推送到 GYG Sandbox</button>
            </div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header">
            <h3 class="card-title">商品设置</h3>
          </div>
          <div class="card-body d-grid gap-3">
            <label class="form-label mb-0">
              <span class="form-label-description">自动关闭提前小时</span>
              <input id="autoCloseHours" type="number" min="0" value="0" class="form-control" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">participantsMin</span>
              <input id="participantsMin" type="number" min="1" value="1" class="form-control" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">participantsMax</span>
              <input id="participantsMax" type="number" min="1" value="999" class="form-control" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">groupSizeMin</span>
              <input id="groupSizeMin" type="number" min="1" class="form-control" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">groupSizeMax</span>
              <input id="groupSizeMax" type="number" min="1" class="form-control" />
            </label>
            <button id="saveAutoClose" class="btn btn-outline-primary" type="button">保存自动关闭设置</button>
            <button id="saveBookingRules" class="btn btn-outline-primary" type="button">保存预订规则</button>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-8">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">批量写入价格与库存</h3>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label">可用性类型</label>
                <select id="availabilityMode" class="form-select">
                  <option value="time_point">time point</option>
                  <option value="time_period">time period</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">开始日期</label>
                <input id="saveFromDate" type="date" class="form-control" />
              </div>
              <div class="col-md-4">
                <label class="form-label">结束日期</label>
                <input id="saveToDate" type="date" class="form-control" />
              </div>
              <div class="col-md-4">
                <label class="form-label">库存 vacancies</label>
                <input id="vacancies" type="number" value="20" class="form-control" />
              </div>
              <div class="col-md-8" id="timePointBlock">
                <label class="form-label">开始时间，逗号分隔</label>
                <input id="saveTimes" value="10:00,14:00" class="form-control" />
              </div>
              <div class="col-md-8" id="timePeriodBlock">
                <label class="form-label">openingTimes，例 09:00-12:00,14:00-18:00</label>
                <input id="openingRanges" value="09:00-12:00,14:00-18:00" class="form-control" />
              </div>
            </div>

            <hr class="my-4" />

            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label">GROUP 价</label>
                <input id="groupPrice" type="number" class="form-control" />
              </div>
              <div class="col-md-3">
                <label class="form-label">ADULT 价</label>
                <input id="adultPrice" type="number" class="form-control" />
              </div>
              <div class="col-md-3">
                <label class="form-label">YOUTH 价</label>
                <input id="youthPrice" type="number" class="form-control" />
              </div>
              <div class="col-md-3">
                <label class="form-label">CHILD 价</label>
                <input id="childPrice" type="number" class="form-control" />
              </div>
              <div class="col-md-3">
                <label class="form-label">INFANT 价</label>
                <input id="infantPrice" type="number" class="form-control" />
              </div>
              <div class="col-md-3">
                <label class="form-label">SENIOR 价</label>
                <input id="seniorPrice" type="number" class="form-control" />
              </div>
              <div class="col-md-3">
                <label class="form-label">STUDENT 价</label>
                <input id="studentPrice" type="number" class="form-control" />
              </div>
              <div class="col-md-3">
                <label class="form-label">currency</label>
                <input id="currency" value="CNY" class="form-control" />
              </div>
              <div class="col-md-4">
                <label class="form-label">cutoffSeconds</label>
                <input id="cutoffSeconds" type="number" value="3600" class="form-control" />
              </div>
              <div class="col-md-8 d-flex align-items-end">
                <button id="saveRange" class="btn btn-primary w-100" type="button">保存到日历</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header">
            <h3 class="card-title">已加载日历</h3>
          </div>
          <div class="table-wrap">
            <table class="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>OpeningTimes</th>
                  <th>Vacancies</th>
                  <th>Currency</th>
                  <th>Prices</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="tableBody"></tbody>
            </table>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header">
            <h3 class="card-title">Addons 配置</h3>
          </div>
          <div class="card-body">
            <div class="text-secondary small mb-3">currency 自动使用商品币种：<span id="addonsCurrency">-</span></div>
            <div id="addonsRows" class="d-grid gap-3"></div>
            <div class="d-flex gap-2 mt-3">
              <button id="addAddonRow" class="btn btn-outline-primary" type="button">新增 Addon</button>
              <button id="saveAddons" class="btn btn-primary" type="button">保存 Addons</button>
            </div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header">
            <h3 class="card-title">调试输出</h3>
          </div>
          <div class="card-body">
            <div class="text-secondary">所有返回结果、删除记录和推送日志都在底部调试面板查看。</div>
          </div>
        </div>
      </div>
    </div>`
  });

  const script = sharedScript(`
const PRODUCT_ID = ${JSON.stringify(id)};
const PRODUCT_TIMEZONE = ${JSON.stringify(timezone)};
const tableBody = document.getElementById('tableBody');
let currentProductCurrency = 'CNY';

function print(value) {
  appendLog(value);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function addDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function toIso(dateStr, timeStr, tz) {
  return dateStr + 'T' + timeStr + ':00' + tz;
}

function parseOffsetMinutes(tz) {
  const match = String(tz || '').trim().match(/^([+-])(\\d{2}):(\\d{2})$/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

function formatInProductTimeZone(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: '', time: '' };
  }
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: PRODUCT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: PRODUCT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return { date: dateFmt.format(date), time: timeFmt.format(date) };
}

function dateOnly(iso) {
  return formatInProductTimeZone(iso).date;
}

function timeOnly(iso) {
  return formatInProductTimeZone(iso).time;
}

function pricesTextFromRow(row) {
  const prices = row.pricesByCategory && row.pricesByCategory.retailPrices ? row.pricesByCategory.retailPrices : [];
  return prices.map((item) => item.category + ':' + item.price).join(' | ');
}

function openingTimesText(row) {
  const openingTimes = Array.isArray(row.openingTimes) ? row.openingTimes : [];
  return openingTimes.map((item) => item.fromTime + '-' + item.toTime).join(' | ');
}

function updateAvailabilityModeUI() {
  const mode = document.getElementById('availabilityMode').value;
  document.getElementById('timePointBlock').style.display = mode === 'time_point' ? 'block' : 'none';
  document.getElementById('timePeriodBlock').style.display = mode === 'time_period' ? 'block' : 'none';
}

function render(rows) {
  tableBody.innerHTML = '';
  (rows || []).forEach((row) => {
    const tr = document.createElement('tr');
    const isTimePeriod = Array.isArray(row.openingTimes) && row.openingTimes.length > 0;
    const displayTime = isTimePeriod ? '-' : timeOnly(row.dateTime);
    tr.innerHTML =
      '<td>' + dateOnly(row.dateTime) + '</td>' +
      '<td>' + displayTime + '</td>' +
      '<td>' + openingTimesText(row) + '</td>' +
      '<td>' + (row.vacancies ?? '') + '</td>' +
      '<td>' + (row.currency ?? '') + '</td>' +
      '<td>' + pricesTextFromRow(row) + '</td>' +
      '<td><button type="button" class="btn btn-sm btn-outline-danger" data-del="' + row.id + '">删除</button></td>';
    tableBody.appendChild(tr);
  });
}

async function loadCalendar() {
  const from = document.getElementById('fromDate').value;
  const to = document.getElementById('toDate').value;
  const tz = document.getElementById('tz').value.trim() || '+08:00';
  const fromIso = toIso(from, '00:00', tz);
  const toIsoStr = toIso(to, '23:59', tz);
  const query = '?fromDateTime=' + encodeURIComponent(fromIso) + '&toDateTime=' + encodeURIComponent(toIsoStr);
  const data = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID) + '/availability' + query);
  render(data.data || []);
  print(data);
}

function listDates(from, to) {
  const dates = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

async function saveRange() {
  const mode = document.getElementById('availabilityMode').value;
  const from = document.getElementById('saveFromDate').value;
  const to = document.getElementById('saveToDate').value;
  const tz = document.getElementById('tz').value.trim() || '+08:00';
  const vacancies = Number(document.getElementById('vacancies').value);
  const cutoffSeconds = Number(document.getElementById('cutoffSeconds').value);
  if (!from || !to) throw new Error('请选择开始和结束日期');
  if (to < from) throw new Error('结束日期不能小于开始日期');

  const retailPrices = [];
  [['GROUP', 'groupPrice'], ['ADULT', 'adultPrice'], ['YOUTH', 'youthPrice'], ['CHILD', 'childPrice'], ['INFANT', 'infantPrice'], ['SENIOR', 'seniorPrice'], ['STUDENT', 'studentPrice']].forEach(([category, id]) => {
    const value = document.getElementById(id).value.trim();
    if (value !== '') {
      retailPrices.push({ category, price: Number(value) });
    }
  });
  if (!retailPrices.length) throw new Error('请至少填写一个价格');

  const hasGroupPrice = retailPrices.some((item) => item.category === 'GROUP');
  const individualCategories = retailPrices.filter((item) => item.category !== 'GROUP').map((item) => item.category);
  const vacanciesByCategory = individualCategories.length ? individualCategories.map((category) => ({ category, vacancies })) : undefined;
  const currency = document.getElementById('currency').value.trim().toUpperCase();
  const all = [];
  const dates = listDates(from, to);

  if (mode === 'time_period') {
    const openingRanges = document.getElementById('openingRanges').value.trim().split(',').map((item) => item.trim()).filter(Boolean);
    if (!openingRanges.length) throw new Error('time period 模式请填写 openingTimes');
    if (openingRanges.some((item) => !/^\\d{2}:\\d{2}-\\d{2}:\\d{2}$/.test(item))) {
      throw new Error('openingTimes 格式应为 HH:MM-HH:MM');
    }
    const openingTimes = openingRanges.map((range) => {
      const [fromTime, toTime] = range.split('-');
      return { fromTime, toTime };
    });
    dates.forEach((date) => {
      all.push({
        dateTime: toIso(date, '00:00', tz),
        openingTimes,
        cutoffSeconds,
        vacancies: hasGroupPrice && !vacanciesByCategory ? vacancies : undefined,
        vacanciesByCategory,
        currency,
        pricesByCategory: { retailPrices }
      });
    });
  } else {
    const times = document.getElementById('saveTimes').value.trim().split(',').map((item) => item.trim()).filter(Boolean);
    if (!times.length) throw new Error('time point 模式请填写至少一个开始时间');
    if (times.some((item) => !/^\\d{2}:\\d{2}$/.test(item))) {
      throw new Error('时间格式应为 HH:MM');
    }
    dates.forEach((date) => {
      times.forEach((time) => {
        all.push({
          dateTime: toIso(date, time, tz),
          cutoffSeconds,
          vacancies: hasGroupPrice && !vacanciesByCategory ? vacancies : undefined,
          vacanciesByCategory,
          currency,
          pricesByCategory: { retailPrices }
        });
      });
    });
  }

  const data = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID) + '/availability', {
    method: 'POST',
    body: JSON.stringify({ availabilities: all })
  });
  print(data);
  await loadCalendar();
}

const ADDON_TYPES = ['FOOD', 'DRINKS', 'SAFETY', 'TRANSPORT', 'DONATION', 'OTHERS'];

function createAddonRow(addon) {
  const row = document.createElement('div');
  row.className = 'row g-3 align-items-end';
  const typeValue = addon && addon.addonType ? addon.addonType : 'FOOD';
  const priceValue = addon && typeof addon.retailPrice === 'number' ? String(addon.retailPrice) : '';
  const descValue = addon && addon.addonDescription ? addon.addonDescription.replaceAll('"', '&quot;') : '';
  row.innerHTML =
    '<div class="col-md-3"><label class="form-label">addonType</label><select class="form-select addonType">' + ADDON_TYPES.map((item) => '<option ' + (item === typeValue ? 'selected' : '') + '>' + item + '</option>').join('') + '</select></div>' +
    '<div class="col-md-3"><label class="form-label">retailPrice</label><input class="form-control addonPrice" type="number" min="0" value="' + priceValue + '" /></div>' +
    '<div class="col-md-4"><label class="form-label">addonDescription</label><input class="form-control addonDescription" value="' + descValue + '" /></div>' +
    '<div class="col-md-2"><button type="button" class="btn btn-outline-danger addonRemove w-100">删除</button></div>';
  return row;
}

function renderAddonsRows(addons) {
  const container = document.getElementById('addonsRows');
  container.innerHTML = '';
  const list = Array.isArray(addons) ? addons : [];
  if (!list.length) {
    container.appendChild(createAddonRow({ addonType: 'FOOD' }));
    return;
  }
  list.forEach((addon) => container.appendChild(createAddonRow(addon)));
}

function collectAddonsRows() {
  return Array.from(document.querySelectorAll('#addonsRows .row'))
    .map((row) => {
      const addonType = row.querySelector('.addonType').value;
      const priceRaw = row.querySelector('.addonPrice').value.trim();
      const addonDescription = row.querySelector('.addonDescription').value.trim();
      if (priceRaw === '') return null;
      const retailPrice = Number(priceRaw);
      if (!Number.isInteger(retailPrice) || retailPrice < 0) {
        throw new Error('addon retailPrice 必须是非负整数');
      }
      const addon = { addonType, retailPrice, currency: currentProductCurrency };
      if (addonDescription) addon.addonDescription = addonDescription;
      return addon;
    })
    .filter(Boolean);
}

tableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-del]');
  if (!button) return;
  try {
    const availabilityId = button.getAttribute('data-del');
    const data = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID) + '/availability/' + encodeURIComponent(availabilityId), {
      method: 'DELETE'
    });
    print(data);
    await loadCalendar();
  } catch (error) {
    print(String(error));
  }
});

document.getElementById('quick7').addEventListener('click', () => {
  document.getElementById('fromDate').value = today();
  document.getElementById('toDate').value = addDays(today(), 6);
});

document.getElementById('quick30').addEventListener('click', () => {
  document.getElementById('fromDate').value = today();
  document.getElementById('toDate').value = addDays(today(), 29);
});

document.getElementById('availabilityMode').addEventListener('change', updateAvailabilityModeUI);
document.getElementById('load').addEventListener('click', () => loadCalendar().catch((error) => print(String(error))));
document.getElementById('saveRange').addEventListener('click', () => saveRange().catch((error) => print(String(error))));

document.getElementById('saveAutoClose').addEventListener('click', async () => {
  try {
    const autoCloseHours = Number(document.getElementById('autoCloseHours').value || 0);
    const data = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID) + '/settings', {
      method: 'PATCH',
      body: JSON.stringify({ autoCloseHours })
    });
    print(data);
  } catch (error) {
    print(String(error));
  }
});

document.getElementById('saveBookingRules').addEventListener('click', async () => {
  try {
    const participantsMin = Number(document.getElementById('participantsMin').value || 1);
    const participantsMax = Number(document.getElementById('participantsMax').value || 999);
    const groupSizeMinRaw = document.getElementById('groupSizeMin').value.trim();
    const groupSizeMaxRaw = document.getElementById('groupSizeMax').value.trim();
    const payload = { participantsMin, participantsMax };
    if (groupSizeMinRaw) payload.groupSizeMin = Number(groupSizeMinRaw);
    if (groupSizeMaxRaw) payload.groupSizeMax = Number(groupSizeMaxRaw);
    const data = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID) + '/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    print(data);
  } catch (error) {
    print(String(error));
  }
});

document.getElementById('saveAddons').addEventListener('click', async () => {
  try {
    const addons = collectAddonsRows();
    const data = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID) + '/addons', {
      method: 'PATCH',
      body: JSON.stringify({ addons })
    });
    print(data);
  } catch (error) {
    print(String(error));
  }
});

document.getElementById('addAddonRow').addEventListener('click', () => {
  document.getElementById('addonsRows').appendChild(createAddonRow({ addonType: 'FOOD' }));
});

document.getElementById('addonsRows').addEventListener('click', (event) => {
  const button = event.target.closest('.addonRemove');
  if (!button) return;
  const row = button.closest('.row');
  if (row) row.remove();
  if (!document.querySelectorAll('#addonsRows .row').length) {
    document.getElementById('addonsRows').appendChild(createAddonRow({ addonType: 'FOOD' }));
  }
});

document.getElementById('pushToGyg').addEventListener('click', async () => {
  try {
    const from = document.getElementById('fromDate').value;
    const to = document.getElementById('toDate').value;
    const tz = document.getElementById('tz').value.trim() || '+08:00';
    const data = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID) + '/push-notify-availability-update', {
      method: 'POST',
      body: JSON.stringify({
        fromDateTime: toIso(from, '00:00', tz),
        toDateTime: toIso(to, '23:59', tz)
      })
    });
    print(data);
  } catch (error) {
    print(String(error));
  }
});

window.onAdminReady = async () => {
  try {
    document.getElementById('fromDate').value = today();
    document.getElementById('toDate').value = addDays(today(), 29);
    document.getElementById('saveFromDate').value = today();
    document.getElementById('saveToDate').value = today();
    updateAvailabilityModeUI();
    const product = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID));
    document.getElementById('externalProductId').textContent = product.data && product.data.productId ? product.data.productId : 'N/A';
    currentProductCurrency = product.data && product.data.currency ? String(product.data.currency).toUpperCase() : 'CNY';
    document.getElementById('addonsCurrency').textContent = currentProductCurrency;
    document.getElementById('autoCloseHours').value = String(product.data && product.data.autoCloseHours != null ? product.data.autoCloseHours : 0);
    document.getElementById('participantsMin').value = String(product.data && product.data.participantsMin != null ? product.data.participantsMin : 1);
    document.getElementById('participantsMax').value = String(product.data && product.data.participantsMax != null ? product.data.participantsMax : 999);
    const groupCfg = ((product.data && product.data.pricingCategories) || []).find((item) => item.category === 'GROUP');
    if (groupCfg && groupCfg.groupSizeMin != null) {
      document.getElementById('groupSizeMin').value = String(groupCfg.groupSizeMin);
    }
    if (groupCfg && groupCfg.groupSizeMax != null) {
      document.getElementById('groupSizeMax').value = String(groupCfg.groupSizeMax);
    }
    renderAddonsRows(product.data && product.data.addons ? product.data.addons : []);
    await loadCalendar();
  } catch (error) {
    print(String(error));
  }
};

if (getToken()) {
  window.onAdminReady();
}
`);

  return renderDocument(`商品详情 ${safeId}`, body, script);
}

const uiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_request, reply) => {
    reply.type('text/html; charset=utf-8').send(productsPage());
  });

  fastify.get('/gyg-bookings', async (_request, reply) => {
    reply.type('text/html; charset=utf-8').send(bookingsPage());
  });

  fastify.get('/integration-logs', async (_request, reply) => {
    reply.type('text/html; charset=utf-8').send(logsPage());
  });

  fastify.get('/products/:id/calendar', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const product = await fastify.prisma.product.findUnique({ where: { id } });
    reply.type('text/html; charset=utf-8').send(calendarPage(id, product?.timezone || 'Asia/Shanghai'));
  });
};

export default uiRoutes;
