import type { FastifyPluginAsync } from 'fastify';
import {
  applyDateOverrideMode,
  formatClosedDateRange,
  hasBootstrapModalApi,
  getDayOverrideAction,
  getDateOverrideMode,
  getNextDateOverrideMode,
  getVisibleCalendarOffsets,
  getCalendarRuleState,
  groupClosedDatesIntoRanges
} from './availabilityWorkbench.js';

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
      padding: 0.9rem 0.95rem 1.2rem;
    }

    .app-sidebar .navbar-collapse {
      flex-direction: column;
    }

    .navbar-brand-title {
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      line-height: 1.15;
    }

    .navbar-brand-subtitle {
      color: var(--gyg-sidebar-muted);
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.4rem 0 1rem;
      margin-bottom: 0.35rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .sidebar-brand-mark {
      width: 2.4rem;
      height: 2.4rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.85rem;
      background: linear-gradient(135deg, rgba(32, 107, 196, 0.35), rgba(32, 107, 196, 0.08));
      color: #dbeafe;
      flex: 0 0 auto;
    }

    .sidebar-brand-mark .nav-link-icon {
      width: 1.2rem;
      height: 1.2rem;
      margin-right: 0;
    }

    .sidebar-brand-copy {
      min-width: 0;
    }

    .sidebar-brand-main {
      color: #fff;
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.15;
      margin: 0;
      letter-spacing: 0;
    }

    .sidebar-brand-sub {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.75rem;
      margin-top: 0.15rem;
      line-height: 1.2;
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

    .nav-link-copy {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .nav-link-title {
      display: block;
      font-size: 1rem;
      line-height: 1.2;
    }

    .nav-link-subtitle {
      display: block;
      font-size: 0.72rem;
      line-height: 1.15;
      color: rgba(255, 255, 255, 0.52);
      margin-top: 0.15rem;
      letter-spacing: 0.02em;
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .theme-switcher-icons {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .theme-icon-btn {
      width: 2rem;
      height: 2rem;
      padding: 0;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .theme-icon-btn .nav-link-icon {
      width: 1rem;
      height: 1rem;
      margin-right: 0;
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
      width: 3rem;
      height: 3rem;
      padding: 0;
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

    .app-main-container {
      width: min(100%, 1680px);
      max-width: calc(100vw - 2rem);
    }

    .product-link {
      color: inherit;
      text-decoration: none;
    }

    .product-link:hover {
      color: var(--gyg-accent);
      text-decoration: underline;
    }

    .product-attr-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.4rem;
    }

    .modal-section {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 1rem;
      background: rgba(248, 250, 252, 0.72);
      padding: 1rem;
    }

    .modal-section-title {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--tblr-secondary);
      margin-bottom: 0.875rem;
    }

    .modal-option-card {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.8);
      padding: 0.875rem;
      height: 100%;
    }

    .modal-option-card .btn-group-vertical > .btn,
    .modal-option-card .d-grid > .btn {
      text-align: left;
      justify-content: flex-start;
      font-weight: 600;
    }

    .modal-form-hint {
      margin-top: 0.35rem;
      font-size: 0.75rem;
      color: var(--tblr-secondary);
    }

    html[data-bs-theme='dark'] .modal-section {
      background: rgba(15, 23, 42, 0.34);
      border-color: rgba(148, 163, 184, 0.12);
    }

    html[data-bs-theme='dark'] .modal-option-card {
      background: rgba(15, 23, 42, 0.58);
      border-color: rgba(148, 163, 184, 0.14);
    }

    html[data-bs-theme='dark'] .modal-option-card .btn-outline-primary,
    html[data-bs-theme='dark'] .modal-option-card .btn-outline-secondary {
      color: rgba(226, 232, 240, 0.92);
      border-color: rgba(148, 163, 184, 0.24);
      background: rgba(15, 23, 42, 0.24);
    }

    html[data-bs-theme='dark'] .modal-option-card .btn-check:checked + .btn-outline-primary,
    html[data-bs-theme='dark'] .modal-option-card .btn-check:checked + .btn-outline-secondary {
      color: #dbeafe;
      border-color: rgba(59, 130, 246, 0.52);
      background: rgba(30, 64, 175, 0.38);
      box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.16);
    }

    html[data-bs-theme='dark'] #create-product-modal .modal-content {
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(148, 163, 184, 0.12);
    }

    html[data-bs-theme='dark'] #create-product-modal .modal-header,
    html[data-bs-theme='dark'] #create-product-modal .modal-footer {
      border-color: rgba(148, 163, 184, 0.12);
    }

    .availability-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .availability-summary .badge {
      font-size: 0.875rem;
      padding: 0.65rem 0.85rem;
      border-radius: 999px;
    }

    .rule-card {
      height: 100%;
    }

    .rule-quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .inline-choice-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .inline-choice-group .btn {
      text-align: center;
      justify-content: center;
      font-weight: 700;
    }

    .selected-date-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      min-height: 2.5rem;
    }

    .calendar-shell {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      align-items: start;
    }

    .month-card {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.76);
      padding: 1rem;
    }

    .month-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .weekdays-row,
    .days-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.5rem;
    }

    .weekdays-row {
      margin-bottom: 0.5rem;
    }

    .weekday-label {
      text-align: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--tblr-secondary);
      letter-spacing: 0.04em;
    }

    .day-cell {
      min-height: 88px;
      border-radius: 1rem;
      border: 1px solid rgba(15, 23, 42, 0.08);
      padding: 0.65rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 0.4rem;
      background: rgba(255, 255, 255, 0.9);
      transition: transform 0.16s ease, box-shadow 0.16s ease;
      cursor: pointer;
    }

    .day-cell:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    }

    .day-cell.is-outside {
      opacity: 0.35;
      cursor: default;
    }

    .day-cell.is-today {
      box-shadow: inset 0 0 0 2px rgba(32, 107, 196, 0.42);
    }

    .day-cell.is-open {
      border-color: rgba(34, 197, 94, 0.28);
      background: linear-gradient(180deg, rgba(220, 252, 231, 0.95), rgba(240, 253, 244, 0.88));
    }

    .day-cell.is-manual-open {
      border-color: rgba(22, 163, 74, 0.4);
      background: linear-gradient(180deg, rgba(187, 247, 208, 0.98), rgba(220, 252, 231, 0.92));
      box-shadow: inset 0 0 0 1px rgba(22, 163, 74, 0.18);
    }

    .day-cell.is-manual-closed {
      border-color: rgba(239, 68, 68, 0.3);
      background: linear-gradient(180deg, rgba(254, 226, 226, 0.98), rgba(254, 242, 242, 0.92));
    }

    .day-cell.is-weekly-closed {
      border-color: rgba(59, 130, 246, 0.24);
      background: linear-gradient(180deg, rgba(219, 234, 254, 0.96), rgba(239, 246, 255, 0.9));
    }

    .day-cell.is-advance-closed {
      border-color: rgba(249, 115, 22, 0.28);
      background: linear-gradient(180deg, rgba(255, 237, 213, 0.96), rgba(255, 247, 237, 0.9));
    }

    .day-cell.is-past {
      border-style: dashed;
      background: rgba(241, 245, 249, 0.9);
    }

    .day-topline {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      gap: 0.18rem;
    }

    .day-number {
      font-size: 1.2rem;
      font-weight: 800;
      line-height: 1;
    }

    .day-emoji {
      font-size: 1.05rem;
      line-height: 1;
    }

    .day-detail-state {
      border-radius: 1rem;
      padding: 0.9rem 1rem;
      background: rgba(248, 250, 252, 0.9);
      border: 1px solid rgba(15, 23, 42, 0.08);
    }

    .day-detail-state .detail-emoji {
      font-size: 1.15rem;
      line-height: 1;
    }

    html[data-bs-theme='dark'] .day-detail-state {
      background: rgba(15, 23, 42, 0.72);
      border-color: rgba(148, 163, 184, 0.12);
    }

    .manual-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      z-index: 1050;
    }

    .calendar-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .calendar-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .calendar-legend .badge {
      font-size: 0.8rem;
      padding: 0.45rem 0.65rem;
    }

    html[data-bs-theme='dark'] .month-card {
      background: rgba(15, 23, 42, 0.6);
      border-color: rgba(148, 163, 184, 0.12);
    }

    html[data-bs-theme='dark'] .day-cell {
      border-color: rgba(148, 163, 184, 0.12);
      background: rgba(15, 23, 42, 0.48);
    }

    html[data-bs-theme='dark'] .day-cell.is-open {
      background: linear-gradient(180deg, rgba(20, 83, 45, 0.82), rgba(5, 46, 22, 0.72));
      border-color: rgba(74, 222, 128, 0.24);
    }

    html[data-bs-theme='dark'] .day-cell.is-manual-open {
      background: linear-gradient(180deg, rgba(22, 101, 52, 0.88), rgba(5, 46, 22, 0.78));
      border-color: rgba(134, 239, 172, 0.4);
      box-shadow: inset 0 0 0 1px rgba(134, 239, 172, 0.28);
    }

    html[data-bs-theme='dark'] .day-cell.is-manual-closed {
      background: linear-gradient(180deg, rgba(127, 29, 29, 0.84), rgba(69, 10, 10, 0.76));
      border-color: rgba(248, 113, 113, 0.24);
    }

    html[data-bs-theme='dark'] .day-cell.is-weekly-closed {
      background: linear-gradient(180deg, rgba(30, 58, 138, 0.82), rgba(15, 23, 42, 0.76));
      border-color: rgba(96, 165, 250, 0.24);
    }

    html[data-bs-theme='dark'] .day-cell.is-advance-closed {
      background: linear-gradient(180deg, rgba(124, 45, 18, 0.84), rgba(67, 20, 7, 0.76));
      border-color: rgba(251, 146, 60, 0.24);
    }

    html[data-bs-theme='dark'] .day-cell.is-past {
      background: rgba(30, 41, 59, 0.68);
    }

    @media (max-width: 1199.98px) {
      .calendar-shell {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (max-width: 767.98px) {
      .month-card {
        padding: 0.75rem;
      }

      .weekdays-row,
      .days-grid {
        gap: 0.35rem;
      }

      .calendar-controls {
        align-items: stretch;
      }

      .day-cell {
        min-height: 72px;
        padding: 0.5rem 0.45rem;
        border-radius: 0.85rem;
      }

      .day-topline {
        gap: 0.1rem;
      }

      .day-number {
        font-size: 1rem;
      }

      .day-emoji {
        font-size: 0.95rem;
      }
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
    | 'sparkles'
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
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l11 0"/><path d="M9 12l11 0"/><path d="M9 18l11 0"/><path d="M5 6l0 .01"/><path d="M5 12l0 .01"/><path d="M5 18l0 .01"/></svg>',
    sparkles:
      '<svg xmlns="http://www.w3.org/2000/svg" class="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.1L18 9l-4.1 1.9L12 15l-1.9-4.1L6 9l4.1-1.9z"/><path d="M5 18l.5 1.5L7 20l-1.5 .5L5 22l-.5-1.5L3 20l1.5-.5z"/><path d="M19 16l.7 1.3L21 18l-1.3 .7L19 20l-.7-1.3L17 18l1.3-.7z"/></svg>'
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
    { key: 'products', href: '/', label: '商品列表', subtitle: 'Products', icon: renderIcon('package') },
    { key: 'bookings', href: '/gyg-bookings', label: '预订管理', subtitle: 'GYG Bookings', icon: renderIcon('calendar') },
    { key: 'logs', href: '/integration-logs', label: '访问日志', subtitle: 'Access Logs', icon: renderIcon('activity') }
  ];

  const navHtml = navItems
    .map(
      (item) => `<li class="nav-item">
        <a class="nav-link${item.key === options.activeNav ? ' active' : ''}" href="${item.href}">
          ${item.icon}
          <span class="nav-link-copy">
            <span class="nav-link-title">${item.label}</span>
            <span class="nav-link-subtitle">${item.subtitle}</span>
          </span>
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
        <div class="sidebar-brand">
          <span class="sidebar-brand-mark">${renderIcon('sparkles')}</span>
          <div class="sidebar-brand-copy">
            <div class="navbar-brand-subtitle">Tabler Based</div>
            <div class="sidebar-brand-main">GYG Admin Console</div>
            <div class="sidebar-brand-sub">运营后台 · Ops Console</div>
          </div>
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
                <div class="text-secondary small">Theme</div>
                <div class="theme-switcher-icons" role="group" aria-label="Theme switcher">
                  <button type="button" class="btn btn-sm btn-outline-light theme-icon-btn" data-theme-value="auto" aria-label="Follow system">${renderIcon('device')}</button>
                  <button type="button" class="btn btn-sm btn-outline-light theme-icon-btn" data-theme-value="light" aria-label="Light mode">${renderIcon('sun')}</button>
                  <button type="button" class="btn btn-sm btn-outline-light theme-icon-btn" data-theme-value="dark" aria-label="Dark mode">${renderIcon('moon')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <div class="page-wrapper">
      <div class="page-body">
        <div class="container-xl app-main-container py-4 py-lg-5">
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
              <div class="text-secondary small mt-1">Products Directory · 先从已有商品中提取 Supplier ID，下拉切换后自动加载。</div>
            </div>
          </div>
          <div class="card-body border-bottom py-3">
            <div class="supplier-toolbar">
              <div class="text-secondary">
                Supplier ID
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
                  <th>商品 Product</th>
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
      <div class="modal-dialog modal-xl modal-dialog-centered">
          <div class="modal-content">
          <div class="modal-header">
            <div>
              <h3 class="modal-title mb-1">创建商品 Create Product</h3>
              <div class="text-secondary small">基础信息 + 销售模型。创建后可在详情页继续维护规则与 availability。</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form id="create-product-form">
            <div class="modal-body">
              <div class="modal-section mb-3">
                <div class="modal-section-title">基础标识</div>
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
                    <label class="form-label">名称 Name</label>
                    <input id="name" class="form-control" value="Web Product" required />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">状态 Status</label>
                    <select id="status" class="form-select">
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="modal-section mb-3">
                <div class="modal-section-title">销售模型</div>
                <div class="row row-cards g-3">
                  <div class="col-md-4">
                    <div class="modal-option-card">
                      <label class="form-label">可用性类型 Availability</label>
                      <div class="btn-group-vertical w-100" role="group" aria-label="Availability type">
                        <input type="radio" class="btn-check" name="availabilityType" id="availabilityTypeTimePoint" value="TIME_POINT" checked />
                        <label class="btn btn-outline-primary" for="availabilityTypeTimePoint">time point</label>
                        <input type="radio" class="btn-check" name="availabilityType" id="availabilityTypeTimePeriod" value="TIME_PERIOD" />
                        <label class="btn btn-outline-primary" for="availabilityTypeTimePeriod">time period</label>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="modal-option-card">
                      <label class="form-label">产品类型 Product Type</label>
                      <div class="btn-group-vertical w-100" role="group" aria-label="Product type">
                        <input type="radio" class="btn-check" name="productType" id="productTypeIndividual" value="INDIVIDUAL" checked />
                        <label class="btn btn-outline-primary" for="productTypeIndividual">individual</label>
                        <input type="radio" class="btn-check" name="productType" id="productTypeGroup" value="GROUP" />
                        <label class="btn btn-outline-primary" for="productTypeGroup">group</label>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="modal-option-card">
                      <label class="form-label">定价模式 Pricing</label>
                      <div class="btn-group-vertical w-100" role="group" aria-label="Pricing mode">
                        <input type="radio" class="btn-check" name="pricingMode" id="pricingModeManual" value="MANUAL_IN_GYG" checked />
                        <label class="btn btn-outline-primary" for="pricingModeManual">MANUAL_IN_GYG</label>
                        <input type="radio" class="btn-check" name="pricingMode" id="pricingModeApi" value="PRICE_OVER_API" />
                        <label class="btn btn-outline-primary" for="pricingModeApi">PRICE_OVER_API</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-section mb-3">
                <div class="modal-section-title">运营信息</div>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">时区 Timezone</label>
                    <input id="timezone" class="form-control" value="Asia/Shanghai" required />
                    <div class="modal-form-hint">后续适合迁移到 Supplier 级设置，避免每次新建商品重复填写。</div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">币种 Currency</label>
                    <input id="currency" class="form-control" value="CNY" required />
                    <div class="modal-form-hint">建议和 supplier 的默认售卖币种统一管理。</div>
                  </div>
                </div>
              </div>

              <div class="modal-section">
                <div class="modal-section-title">描述</div>
                <label class="form-label">Description</label>
                <textarea id="description" class="form-control" rows="3">Created from Tabler UI</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <div class="me-auto text-secondary small">创建完成后可直接进入新的 Availability 工作台继续维护销售规则。</div>
              <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">取消</button>
              <button class="btn btn-primary ms-auto" type="submit">创建商品</button>
            </div>
          </form>
        </div>
      </div>
    </div>`
  });

  const script = sharedScript(`
const PRODUCTS_SUPPLIER_KEY = 'products_supplier_filter';
const supplierSelect = document.getElementById('supplierIdFilter');
const productsTableBody = document.getElementById('productsTableBody');
const pageSizeInput = document.getElementById('pageSize');
const productSearchInput = document.getElementById('productSearch');
const productsTableMeta = document.getElementById('productsTableMeta');
const pageIndicator = document.getElementById('pageIndicator');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const selectAllProducts = document.getElementById('selectAllProducts');
const createProductForm = document.getElementById('create-product-form');
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

function getRadioValue(name) {
  const checked = document.querySelector('input[name="' + name + '"]:checked');
  return checked ? checked.value : '';
}

function setRadioValue(name, value) {
  document.querySelectorAll('input[name="' + name + '"]').forEach((input) => {
    input.checked = input.value === value;
  });
}

function getSavedSupplierId() {
  return localStorage.getItem(PRODUCTS_SUPPLIER_KEY) || '';
}

function setSavedSupplierId(value) {
  if (value) {
    localStorage.setItem(PRODUCTS_SUPPLIER_KEY, value);
    return;
  }
  localStorage.removeItem(PRODUCTS_SUPPLIER_KEY);
}

function closeCreateProductModal() {
  const modalElement = document.getElementById('create-product-modal');
  if (!modalElement) {
    return;
  }

  try {
    if (window.bootstrap && window.bootstrap.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }
  } catch (error) {
    print({ action: 'close_modal_fallback', error: String(error) });
  }

  modalElement.classList.remove('show');
  modalElement.setAttribute('aria-hidden', 'true');
  modalElement.style.display = 'none';
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
  document.querySelectorAll('.modal-backdrop').forEach((node) => node.remove());
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
        '<td><div class="fw-semibold"><a class="product-link" href="/products/' + encodeURIComponent(product.id) + '">' + esc(product.name || '-') + '</a></div><div class="text-secondary small">' + esc(product.id || '-') + '</div><div class="product-attr-badges"><span class="badge bg-azure-lt text-azure">' + esc(String(product.availabilityType || 'TIME_POINT').toLowerCase().replace('_', ' ')) + '</span><span class="badge bg-lime-lt text-lime">' + esc(String(product.productType || 'INDIVIDUAL').toLowerCase()) + '</span></div></td>' +
        '<td>' + esc(product.supplierId || '-') + '</td>' +
        '<td>' + esc(product.productId || '-') + '</td>' +
        '<td>' + statusBadge(product.status) + '</td>' +
        '<td>' + esc(product.currency || '-') + '</td>' +
        '<td>' + esc(product.timezone || '-') + '</td>' +
        '<td class="text-end"><div class="dropdown"><button class="btn dropdown-toggle align-text-top" data-bs-toggle="dropdown" type="button">Actions</button><div class="dropdown-menu dropdown-menu-end"><a class="dropdown-item" href="/products/' + encodeURIComponent(product.id) + '">Availability 工作台</a><a class="dropdown-item" href="/products/' + encodeURIComponent(product.id) + '/settings">产品设置 / 调试</a></div></div></td>';
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
  const currentValue = supplierSelect.value || getSavedSupplierId();
  supplierSelect.innerHTML = supplierIds.map((supplierId) => '<option value="' + esc(supplierId) + '">' + esc(supplierId) + '</option>').join('');
  if (!supplierSelect.innerHTML) {
    supplierSelect.innerHTML = '<option value="">No suppliers</option>';
    setSavedSupplierId('');
    return;
  }
  if (currentValue && supplierIds.includes(currentValue)) {
    supplierSelect.value = currentValue;
  } else if (supplierIds.length) {
    supplierSelect.value = supplierIds[0];
  }
  setSavedSupplierId(supplierSelect.value);
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
  setSavedSupplierId(supplierSelect.value);
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

createProductForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = createProductForm.querySelector('button[type="submit"]');
  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '创建中...';
    }
    const payload = {
      supplierId: document.getElementById('supplierId').value.trim(),
      productId: document.getElementById('productId').value.trim(),
      name: document.getElementById('name').value.trim(),
      description: document.getElementById('description').value.trim(),
      timezone: document.getElementById('timezone').value.trim(),
      currency: document.getElementById('currency').value.trim(),
      availabilityType: getRadioValue('availabilityType'),
      productType: getRadioValue('productType'),
      pricingMode: getRadioValue('pricingMode'),
      status: document.getElementById('status').value,
      destinationCity: 'Shanghai',
      destinationCountry: 'CHN'
    };
    const data = await api('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    print(data);
    await loadProducts();
    closeCreateProductModal();
    createProductForm.reset();
    document.getElementById('status').value = 'active';
    setRadioValue('availabilityType', 'TIME_POINT');
    setRadioValue('productType', 'INDIVIDUAL');
    setRadioValue('pricingMode', 'MANUAL_IN_GYG');
    if (supplierSelect.value) {
      document.getElementById('supplierId').value = supplierSelect.value;
    }
    print({ action: 'create_product_success', productId: payload.productId });
  } catch (error) {
    print(String(error));
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = '创建商品';
    }
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
            <h3 class="card-title">筛选条件 Filters</h3>
          </div>
          <div class="card-body d-grid gap-3">
            <label class="form-label mb-0">
              <span class="form-label-description">状态 Status</span>
              <select id="status" class="form-select">
                <option value="">all status</option>
                <option value="created">created</option>
                <option value="confirmed">confirmed</option>
                <option value="cancelled">cancelled</option>
                <option value="failed">failed</option>
              </select>
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">预订号 Booking Ref</span>
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
            <h3 class="card-title">筛选条件 Filters</h3>
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
              <span class="form-label-description">路径 Path</span>
              <input id="path" class="form-control" placeholder="/1/get-availabilities/" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">状态码 Status</span>
              <input id="statusCode" class="form-control" placeholder="200" />
            </label>
            <label class="form-label mb-0">
              <span class="form-label-description">条数 Limit</span>
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

function availabilityWorkbenchPage(id: string, timezone: string): string {
  const safeId = escapeHtml(id);
  const body = renderAppShell({
    activeNav: 'products',
    pretitle: 'Availability',
    title: 'Availability 工作台',
    description: '按规则维护可售日期。默认可售，重点管理提前停售、每周关闭和手动关闭日期。',
    actions: `<div class="d-flex gap-2">
      <a class="btn btn-outline-primary" href="/products/${safeId}/settings">进入产品设置页</a>
      <a class="btn btn-outline-secondary" href="/">返回商品列表</a>
    </div>`,
    content: `<div class="row row-cards">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <div class="row g-3 align-items-center">
              <div class="col-lg">
                <div id="availabilityHeadline" class="h2 mb-2">加载商品中...</div>
                <div id="availabilitySubline" class="text-secondary">正在读取商品规则和日历状态。</div>
              </div>
              <div class="col-12 col-lg-auto">
                <div id="availabilitySummary" class="availability-summary"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-4">
        <div class="row row-cards">
          <div class="col-12">
            <div class="card rule-card">
              <div class="card-header">
                <h3 class="card-title">⏳ 提前停售</h3>
              </div>
              <div class="card-body d-grid gap-3">
                <div class="form-label mb-0">提前 N 天停售</div>
                <div class="inline-choice-group">
                  <input class="btn-check" type="radio" name="advance-close-days" id="advance-close-0" value="0" checked />
                  <label class="btn btn-outline-primary" for="advance-close-0">0 天</label>
                  <input class="btn-check" type="radio" name="advance-close-days" id="advance-close-1" value="1" />
                  <label class="btn btn-outline-primary" for="advance-close-1">1 天</label>
                  <input class="btn-check" type="radio" name="advance-close-days" id="advance-close-3" value="3" />
                  <label class="btn btn-outline-primary" for="advance-close-3">3 天</label>
                  <input class="btn-check" type="radio" name="advance-close-days" id="advance-close-7" value="7" />
                  <label class="btn btn-outline-primary" for="advance-close-7">7 天</label>
                  <input class="btn-check" type="radio" name="advance-close-days" id="advance-close-14" value="14" />
                  <label class="btn btn-outline-primary" for="advance-close-14">14 天</label>
                  <input class="btn-check" type="radio" name="advance-close-days" id="advance-close-30" value="30" />
                  <label class="btn btn-outline-primary" for="advance-close-30">30 天</label>
                </div>
                <div class="d-flex gap-2">
                  <button id="saveAdvanceCloseRule" class="btn btn-primary" type="button">保存提前停售</button>
                </div>
                <div class="text-secondary small">修改后不会立即作用到日历，点击保存后才会生效。</div>
              </div>
            </div>
          </div>

          <div class="col-12">
            <div class="card rule-card">
              <div class="card-header">
                <h3 class="card-title">📅 每周关闭</h3>
              </div>
              <div class="card-body d-grid gap-3">
                <div class="inline-choice-group">
                  <input class="btn-check" type="checkbox" id="weekday-1" value="1" />
                  <label class="btn btn-outline-primary" for="weekday-1">周一</label>
                  <input class="btn-check" type="checkbox" id="weekday-2" value="2" />
                  <label class="btn btn-outline-primary" for="weekday-2">周二</label>
                  <input class="btn-check" type="checkbox" id="weekday-3" value="3" />
                  <label class="btn btn-outline-primary" for="weekday-3">周三</label>
                  <input class="btn-check" type="checkbox" id="weekday-4" value="4" />
                  <label class="btn btn-outline-primary" for="weekday-4">周四</label>
                  <input class="btn-check" type="checkbox" id="weekday-5" value="5" />
                  <label class="btn btn-outline-primary" for="weekday-5">周五</label>
                  <input class="btn-check" type="checkbox" id="weekday-6" value="6" />
                  <label class="btn btn-outline-primary" for="weekday-6">周六</label>
                  <input class="btn-check" type="checkbox" id="weekday-7" value="7" />
                  <label class="btn btn-outline-primary" for="weekday-7">周日</label>
                </div>
                <div class="d-flex gap-2">
                  <button id="saveWeeklyClosedRule" class="btn btn-primary" type="button">保存每周关闭</button>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12">
            <div class="card rule-card">
              <div class="card-header">
                <h3 class="card-title">🔴 特殊日期关闭</h3>
              </div>
              <div class="card-body d-grid gap-3">
                <div class="row g-3">
                  <div class="col-6">
                    <label class="form-label mb-0">
                      <span class="form-label-description">开始日期</span>
                      <input id="closeRangeFrom" type="date" class="form-control" />
                    </label>
                  </div>
                  <div class="col-6">
                    <label class="form-label mb-0">
                      <span class="form-label-description">结束日期</span>
                      <input id="closeRangeTo" type="date" class="form-control" />
                    </label>
                  </div>
                </div>
                <div class="d-flex gap-2">
                  <button id="addClosedRange" class="btn btn-outline-danger" type="button">添加关闭区间</button>
                  <button id="clearClosedDates" class="btn btn-outline-secondary" type="button">清空手动关闭</button>
                </div>
                <div id="selectedClosedDates" class="selected-date-list"></div>
                <div class="d-flex gap-2">
                  <button id="saveClosedDatesRule" class="btn btn-primary" type="button">保存特殊日期关闭</button>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12">
            <div class="card rule-card">
              <div class="card-header">
                <h3 class="card-title">操作</h3>
              </div>
              <div class="card-body d-grid gap-2">
                <button id="resetAvailabilityRules" class="btn btn-outline-secondary" type="button">恢复已保存规则</button>
                <button id="openSettingsPage" class="btn btn-outline-primary" type="button">打开产品设置页</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-8">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">日历预演</h3>
              <div class="text-secondary small">周一为第一列。月历只显示已保存规则，点击各自保存按钮后才会更新。</div>
            </div>
            <div class="ms-auto d-flex gap-2">
              <button id="calendarPrev" class="btn btn-outline-secondary" type="button">上一月</button>
              <button id="calendarToday" class="btn btn-outline-primary" type="button">回到今天</button>
              <button id="calendarNext" class="btn btn-outline-secondary" type="button">下一月</button>
            </div>
          </div>
          <div class="card-body">
            <div class="calendar-controls">
              <div class="calendar-legend mb-0">
                <span class="badge bg-green-lt text-green">🟢 可售</span>
                <span class="badge bg-red-lt text-red">🔴 手动关闭</span>
                <span class="badge bg-green-lt text-green">✅ 手动打开</span>
                <span class="badge bg-orange-lt text-orange">⏳ 提前停售</span>
                <span class="badge bg-azure-lt text-azure">🔁 周规则关闭</span>
                <span class="badge bg-secondary-lt text-secondary">📍 今天</span>
              </div>
              <label class="row g-2 align-items-center m-0">
                <span class="col">快速开关日历模式</span>
                <span class="col-auto">
                  <label class="form-check form-check-single form-switch mb-0">
                    <input id="quickToggleCalendarMode" class="form-check-input" type="checkbox" />
                  </label>
                </span>
              </label>
            </div>
            <div id="calendarShell" class="calendar-shell"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="dayDetailModal" tabindex="-1" aria-labelledby="dayDetailTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <div class="text-uppercase text-secondary fw-bold small">Date Detail</div>
              <h2 class="modal-title h3 mb-0" id="dayDetailTitle">选择某一天</h2>
            </div>
            <button id="closeDayDetailModal" type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="dayDetailBody" class="d-grid gap-3 text-secondary">点击日历中的某一天查看状态解释。</div>
          </div>
        </div>
      </div>
    </div>`
  });

const script = sharedScript(`
const applyDateOverrideMode = ${applyDateOverrideMode.toString()};
const getCalendarRuleState = ${getCalendarRuleState.toString()};
const groupClosedDatesIntoRanges = ${groupClosedDatesIntoRanges.toString()};
const formatClosedDateRange = ${formatClosedDateRange.toString()};
const getDateOverrideMode = ${getDateOverrideMode.toString()};
const getNextDateOverrideMode = ${getNextDateOverrideMode.toString()};
const getVisibleCalendarOffsets = ${getVisibleCalendarOffsets.toString()};
const getDayOverrideAction = ${getDayOverrideAction.toString()};
const hasBootstrapModalApi = ${hasBootstrapModalApi.toString()};
const PRODUCT_ID = ${JSON.stringify(id)};
const PRODUCT_TIMEZONE = ${JSON.stringify(timezone)};
const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
let workbenchProduct = null;
let savedRuleState = {
  advanceCloseDays: 0,
  weeklyClosedDays: [],
  closedDates: [],
  openedDates: []
};
let draftRuleState = {
  advanceCloseDays: 0,
  weeklyClosedDays: [],
  closedDates: [],
  openedDates: []
};
let calendarOffset = 0;
let manualDayDetailBackdrop = null;
let quickToggleCalendarMode = false;

function print(value) {
  appendLog(value);
}

function escapeText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function toDateStringInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return map.year + '-' + map.month + '-' + map.day;
}

function todayInProductTimeZone() {
  return toDateStringInTimeZone(new Date(), PRODUCT_TIMEZONE);
}

function parseDateOnly(dateStr) {
  return new Date(dateStr + 'T00:00:00.000Z');
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const value = parseDateOnly(dateStr);
  value.setUTCDate(value.getUTCDate() + days);
  return formatDateOnly(value);
}

function diffDays(fromStr, toStr) {
  const from = parseDateOnly(fromStr);
  const to = parseDateOnly(toStr);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function weekdayMonFirst(dateStr) {
  const day = parseDateOnly(dateStr).getUTCDay();
  return day === 0 ? 7 : day;
}

function monthAnchor(offset) {
  const today = parseDateOnly(todayInProductTimeZone());
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
}

function monthTitle(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long'
  }).format(date);
}

function getCheckedWeekdays() {
  return Array.from(document.querySelectorAll('[id^="weekday-"]:checked'))
    .map((input) => Number(input.value))
    .sort((a, b) => a - b);
}

function getSelectedAdvanceCloseDays() {
  const selected = document.querySelector('input[name="advance-close-days"]:checked');
  return selected ? Number(selected.value) : 0;
}

function syncInputsFromDraft() {
  const selectedAdvance = document.querySelector('input[name="advance-close-days"][value="' + draftRuleState.advanceCloseDays + '"]');
  if (selectedAdvance) {
    selectedAdvance.checked = true;
  }
  document.querySelectorAll('[id^="weekday-"]').forEach((input) => {
    input.checked = draftRuleState.weeklyClosedDays.includes(Number(input.value));
  });
  renderSelectedClosedDates();
}

function syncDraftFromInputs() {
  draftRuleState.advanceCloseDays = Math.max(0, getSelectedAdvanceCloseDays());
  draftRuleState.weeklyClosedDays = getCheckedWeekdays();
}

function renderSelectedClosedDates() {
  const container = document.getElementById('selectedClosedDates');
  container.innerHTML = '';
  if (!draftRuleState.closedDates.length && !draftRuleState.openedDates.length) {
    container.innerHTML = '<span class="text-secondary small">当前没有单日手动覆盖</span>';
    return;
  }
  groupClosedDatesIntoRanges(draftRuleState.closedDates).forEach((range) => {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'btn btn-sm btn-outline-danger';
    badge.textContent = '🔴 ' + formatClosedDateRange(range);
    badge.addEventListener('click', () => {
      const rangeDates = new Set(range.dates);
      draftRuleState.closedDates = draftRuleState.closedDates.filter((item) => !rangeDates.has(item));
      renderSelectedClosedDates();
      renderWorkbench();
    });
    container.appendChild(badge);
  });
  groupClosedDatesIntoRanges(draftRuleState.openedDates).forEach((range) => {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'btn btn-sm btn-outline-success';
    badge.textContent = '🟢 ' + formatClosedDateRange(range);
    badge.addEventListener('click', () => {
      const rangeDates = new Set(range.dates);
      draftRuleState.openedDates = draftRuleState.openedDates.filter((item) => !rangeDates.has(item));
      renderSelectedClosedDates();
      renderWorkbench();
    });
    container.appendChild(badge);
  });
}

function showDayDetailModal() {
  const modalElement = document.getElementById('dayDetailModal');
  if (hasBootstrapModalApi(window.bootstrap)) {
    window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
    return;
  }

  modalElement.style.display = 'block';
  modalElement.classList.add('show');
  modalElement.removeAttribute('aria-hidden');
  modalElement.setAttribute('aria-modal', 'true');
  document.body.classList.add('modal-open');

  if (!manualDayDetailBackdrop) {
    manualDayDetailBackdrop = document.createElement('div');
    manualDayDetailBackdrop.className = 'modal-backdrop fade show manual-modal-backdrop';
    manualDayDetailBackdrop.addEventListener('click', hideDayDetailModal);
  }

  document.body.appendChild(manualDayDetailBackdrop);
}

function hideDayDetailModal() {
  const modalElement = document.getElementById('dayDetailModal');
  if (hasBootstrapModalApi(window.bootstrap)) {
    window.bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    return;
  }

  modalElement.classList.remove('show');
  modalElement.style.display = 'none';
  modalElement.setAttribute('aria-hidden', 'true');
  modalElement.removeAttribute('aria-modal');
  document.body.classList.remove('modal-open');

  if (manualDayDetailBackdrop && manualDayDetailBackdrop.parentNode) {
    manualDayDetailBackdrop.parentNode.removeChild(manualDayDetailBackdrop);
  }
}

function getAutomaticDateStatus(dateStr, ruleState) {
  const today = todayInProductTimeZone();
  const reasons = [];

  if (dateStr < today) {
    return { key: 'past', emoji: '⬜', label: '过去', reason: '过去日期', reasons };
  }

  if (ruleState.advanceCloseDays > 0 && diffDays(today, dateStr) < ruleState.advanceCloseDays) {
    reasons.push('提前' + ruleState.advanceCloseDays + '天停售');
    return { key: 'advance-closed', emoji: '⏳', label: '停售', reason: '提前关闭', reasons };
  }

  const weekday = weekdayMonFirst(dateStr);
  if (ruleState.weeklyClosedDays.includes(weekday)) {
    reasons.push(WEEKDAY_LABELS[weekday - 1] + '关闭');
    return { key: 'weekly-closed', emoji: '🔁', label: '周关闭', reason: WEEKDAY_LABELS[weekday - 1], reasons };
  }

  reasons.push('默认可售');
  return { key: 'open', emoji: '🟢', label: '可售', reason: '默认可售', reasons };
}

function getDateStatus(dateStr, ruleState) {
  const automaticStatus = getAutomaticDateStatus(dateStr, ruleState);
  if (automaticStatus.key === 'past') {
    return Object.assign({ overrideMode: 'follow-rules', automaticStatus }, automaticStatus);
  }

  const overrideMode = getDateOverrideMode(dateStr, ruleState.closedDates, ruleState.openedDates);
  if (overrideMode === 'manual-open') {
    const automaticReason = automaticStatus.key === 'open' ? null : automaticStatus.reason;
    return {
      key: 'manual-open',
      emoji: '✅',
      label: '打开',
      reason: automaticReason ? '手动打开（覆盖' + automaticReason + '）' : '手动打开',
      reasons: automaticReason ? ['手动打开', automaticReason] : ['手动打开'],
      overrideMode,
      automaticStatus
    };
  }

  if (overrideMode === 'manual-closed') {
    return {
      key: 'manual-closed',
      emoji: '🔴',
      label: '关闭',
      reason: '手动关闭',
      reasons: ['手动关闭'],
      overrideMode,
      automaticStatus
    };
  }

  return Object.assign({ overrideMode, automaticStatus }, automaticStatus);
}

function renderSummary() {
  const calendarRuleState = getCalendarRuleState(savedRuleState, draftRuleState);
  const summary = document.getElementById('availabilitySummary');
  const weeklyText = calendarRuleState.weeklyClosedDays.length
    ? calendarRuleState.weeklyClosedDays.map((day) => WEEKDAY_LABELS[day - 1]).join(' / ')
    : '无';
  summary.innerHTML =
    '<span class="badge bg-green-lt text-green">🟢 默认可售</span>' +
    '<span class="badge bg-orange-lt text-orange">⏳ 提前关闭 ' + calendarRuleState.advanceCloseDays + ' 天</span>' +
    '<span class="badge bg-azure-lt text-azure">📅 每周关闭 ' + escapeText(weeklyText) + '</span>' +
    '<span class="badge bg-red-lt text-red">🔴 手动关闭 ' + calendarRuleState.closedDates.length + ' 天</span>' +
    '<span class="badge bg-green-lt text-green">✅ 手动打开 ' + calendarRuleState.openedDates.length + ' 天</span>';
}

function buildMonthCells(anchor) {
  const firstOfMonth = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const startOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const startDate = new Date(firstOfMonth);
  startDate.setUTCDate(firstOfMonth.getUTCDate() - startOffset);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const current = new Date(startDate);
    current.setUTCDate(startDate.getUTCDate() + i);
    cells.push({
      date: current,
      dateStr: formatDateOnly(current),
      isCurrentMonth: current.getUTCMonth() === anchor.getUTCMonth()
    });
  }
  return cells;
}

function openDayDetail(dateStr) {
  const calendarRuleState = getCalendarRuleState(savedRuleState, draftRuleState);
  const status = getDateStatus(dateStr, calendarRuleState);
  const overrideMode = getDateOverrideMode(dateStr, draftRuleState.closedDates, draftRuleState.openedDates);
  const defaultActionConfig = getDayOverrideAction(overrideMode);
  const actionConfig = overrideMode === 'follow-rules'
    ? (status.key === 'open'
        ? { action: 'close', label: '关闭当天', buttonClassName: 'btn btn-danger', targetMode: 'manual-closed' }
        : { action: 'open', label: '打开当天', buttonClassName: 'btn btn-primary', targetMode: 'manual-open' })
    : Object.assign({}, defaultActionConfig, {
        targetMode: defaultActionConfig.action === 'open'
          ? 'manual-open'
          : defaultActionConfig.action === 'close'
            ? 'manual-closed'
            : 'follow-rules'
      });
  const today = todayInProductTimeZone();
  document.getElementById('dayDetailTitle').textContent = dateStr;
  document.getElementById('dayDetailBody').innerHTML =
    '<div class="day-detail-state d-grid gap-2">' +
      '<div class="d-flex align-items-center gap-2"><span class="detail-emoji">' + status.emoji + '</span><span class="h4 mb-0">' + status.label + '</span></div>' +
      '<div><strong>状态：</strong> ' + escapeText(status.label) + '</div>' +
      '<div><strong>原因：</strong> ' + escapeText(status.reason) + '</div>' +
    '</div>' +
    '<div class="text-secondary">今天：' + today + '</div>' +
    '<div><strong>逻辑命中：</strong> ' + escapeText(status.reasons.join('，') || '无') + '</div>' +
    '<div class="d-flex gap-2 flex-wrap">' +
      '<button id="primaryToggleSingleDate" class="' + actionConfig.buttonClassName + '" type="button">' + actionConfig.label + '</button>' +
      (overrideMode !== 'follow-rules' ? '<button id="followRulesSingleDate" class="btn btn-outline-secondary" type="button">遵循规律</button>' : '') +
    '</div>';

  document.getElementById('primaryToggleSingleDate').addEventListener('click', () => {
    draftRuleState = applyDateOverrideMode(dateStr, draftRuleState, actionConfig.targetMode);
    renderSelectedClosedDates();
    renderWorkbench();
    hideDayDetailModal();
  });

  const followButton = document.getElementById('followRulesSingleDate');
  if (followButton) {
    followButton.addEventListener('click', () => {
      draftRuleState = applyDateOverrideMode(dateStr, draftRuleState, 'follow-rules');
      renderSelectedClosedDates();
      renderWorkbench();
      hideDayDetailModal();
    });
  }

  showDayDetailModal();
}

function renderCalendarMonth(anchor, index) {
  const month = document.createElement('div');
  month.className = 'month-card';
  const today = todayInProductTimeZone();
  const calendarRuleState = getCalendarRuleState(savedRuleState, draftRuleState);
  const cells = buildMonthCells(anchor);
  const weekdays = WEEKDAY_LABELS.map((label) => '<div class="weekday-label">' + label.slice(1) + '</div>').join('');
  const days = cells.map((cell) => {
    const status = getDateStatus(cell.dateStr, calendarRuleState);
    const classes = [
      'day-cell',
      'is-' + status.key,
      cell.isCurrentMonth ? '' : 'is-outside',
      cell.dateStr === today ? 'is-today' : ''
    ].filter(Boolean).join(' ');
    return '<button type="button" class="' + classes + '" data-date="' + cell.dateStr + '" ' + (cell.isCurrentMonth ? '' : 'disabled') + '>' +
      '<div class="day-topline"><div class="day-number">' + Number(cell.dateStr.slice(-2)) + '</div><div class="day-emoji" aria-label="' + escapeText(status.label + (cell.dateStr === today ? ' Today' : '')) + '">' + status.emoji + '</div></div>' +
      '</button>';
  }).join('');

  month.innerHTML =
    '<div class="month-header"><div><div class="text-uppercase text-secondary fw-bold small">Month ' + (index + 1) + '</div><div class="h3 mb-0">' + monthTitle(anchor) + '</div></div></div>' +
    '<div class="weekdays-row">' + weekdays + '</div>' +
    '<div class="days-grid">' + days + '</div>';
  return month;
}

function renderCalendar() {
  const shell = document.getElementById('calendarShell');
  shell.innerHTML = '';
  getVisibleCalendarOffsets(calendarOffset).forEach((offset, index) => {
    shell.appendChild(renderCalendarMonth(monthAnchor(offset), index));
  });
  shell.querySelectorAll('.day-cell[data-date]').forEach((button) => {
    button.addEventListener('click', () => {
      const dateStr = button.getAttribute('data-date');
      if (quickToggleCalendarMode) {
        const currentMode = getDateOverrideMode(dateStr, draftRuleState.closedDates, draftRuleState.openedDates);
        draftRuleState = applyDateOverrideMode(dateStr, draftRuleState, getNextDateOverrideMode(currentMode));
        renderSelectedClosedDates();
        renderWorkbench();
        return;
      }
      openDayDetail(dateStr);
    });
  });
}

function renderWorkbench() {
  syncDraftFromInputs();
  renderSummary();
  renderCalendar();
}

async function saveRules(partialPayload) {
  syncDraftFromInputs();
  const payload = partialPayload && typeof partialPayload === 'object'
    ? Object.assign({}, partialPayload)
    : (() => {
        const fullPayload = {};
        fullPayload.advanceCloseDays = draftRuleState.advanceCloseDays;
        fullPayload.weeklyClosedDays = draftRuleState.weeklyClosedDays;
        fullPayload.closedDates = draftRuleState.closedDates;
        fullPayload.openedDates = draftRuleState.openedDates;
        return fullPayload;
      })();
  const data = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID) + '/availability-rules', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  if (Object.prototype.hasOwnProperty.call(payload, 'advanceCloseDays')) {
    savedRuleState.advanceCloseDays = draftRuleState.advanceCloseDays;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'weeklyClosedDays')) {
    savedRuleState.weeklyClosedDays = draftRuleState.weeklyClosedDays.slice();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'closedDates')) {
    savedRuleState.closedDates = draftRuleState.closedDates.slice();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'openedDates')) {
    savedRuleState.openedDates = draftRuleState.openedDates.slice();
  }
  print(data);
  renderWorkbench();
}

function restoreSavedRules() {
  draftRuleState = JSON.parse(JSON.stringify(savedRuleState));
  syncInputsFromDraft();
  renderWorkbench();
}

function addClosedRange() {
  const from = document.getElementById('closeRangeFrom').value;
  const to = document.getElementById('closeRangeTo').value;
  if (!from || !to) throw new Error('请选择关闭区间的开始和结束日期');
  if (to < from) throw new Error('结束日期不能早于开始日期');
  const set = new Set(draftRuleState.closedDates);
  draftRuleState.openedDates = draftRuleState.openedDates.filter((item) => item < from || item > to);
  let cursor = from;
  while (cursor <= to) {
    set.add(cursor);
    cursor = addDays(cursor, 1);
  }
  draftRuleState.closedDates = Array.from(set).sort();
  renderSelectedClosedDates();
  renderWorkbench();
}

function initializeWorkbenchView() {
  document.getElementById('availabilityHeadline').textContent = '默认可售日历';
  document.getElementById('availabilitySubline').textContent = getToken()
    ? '正在读取已保存规则...'
    : '未登录时先显示默认全开日历，登录后自动加载已保存规则。';
  document.getElementById('closeRangeFrom').value = todayInProductTimeZone();
  document.getElementById('closeRangeTo').value = todayInProductTimeZone();
  syncInputsFromDraft();
  renderWorkbench();
}

window.onAdminReady = async () => {
  try {
    workbenchProduct = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID));
    const rules = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID) + '/availability-rules');
    document.getElementById('availabilityHeadline').textContent = (workbenchProduct.data && workbenchProduct.data.name) || '未命名商品';
    document.getElementById('availabilitySubline').textContent = 'Supplier ' + ((workbenchProduct.data && workbenchProduct.data.supplierId) || '-') + ' · External ' + ((workbenchProduct.data && workbenchProduct.data.productId) || '-') + ' · ' + PRODUCT_TIMEZONE;
    savedRuleState = {
      advanceCloseDays: rules.data && typeof rules.data.advanceCloseDays === 'number' ? rules.data.advanceCloseDays : 0,
      weeklyClosedDays: rules.data && Array.isArray(rules.data.weeklyClosedDays) ? rules.data.weeklyClosedDays : [],
      closedDates: rules.data && Array.isArray(rules.data.closedDates) ? rules.data.closedDates : [],
      openedDates: rules.data && Array.isArray(rules.data.openedDates) ? rules.data.openedDates : []
    };
    draftRuleState = JSON.parse(JSON.stringify(savedRuleState));
    syncInputsFromDraft();
    document.getElementById('closeRangeFrom').value = todayInProductTimeZone();
    document.getElementById('closeRangeTo').value = todayInProductTimeZone();
    renderWorkbench();
  } catch (error) {
    print(String(error));
  }
};

document.querySelectorAll('input[name="advance-close-days"]').forEach((input) => input.addEventListener('change', renderWorkbench));
document.querySelectorAll('[id^="weekday-"]').forEach((input) => input.addEventListener('change', renderWorkbench));
document.getElementById('addClosedRange').addEventListener('click', () => {
  try {
    addClosedRange();
  } catch (error) {
    print(String(error));
  }
});
document.getElementById('clearClosedDates').addEventListener('click', () => {
  draftRuleState.closedDates = [];
  draftRuleState.openedDates = [];
  renderSelectedClosedDates();
  renderWorkbench();
});
document.getElementById('saveAdvanceCloseRule').addEventListener('click', () => saveRules({
  advanceCloseDays: draftRuleState.advanceCloseDays
}).catch((error) => print(String(error))));
document.getElementById('saveWeeklyClosedRule').addEventListener('click', () => saveRules({
  weeklyClosedDays: draftRuleState.weeklyClosedDays
}).catch((error) => print(String(error))));
document.getElementById('saveClosedDatesRule').addEventListener('click', () => saveRules({
  closedDates: draftRuleState.closedDates,
  openedDates: draftRuleState.openedDates
}).catch((error) => print(String(error))));
document.getElementById('resetAvailabilityRules').addEventListener('click', restoreSavedRules);
document.getElementById('openSettingsPage').addEventListener('click', () => {
  window.location.href = '/products/' + encodeURIComponent(PRODUCT_ID) + '/settings';
});
document.getElementById('calendarPrev').addEventListener('click', () => {
  calendarOffset -= 1;
  renderCalendar();
});
document.getElementById('calendarNext').addEventListener('click', () => {
  calendarOffset += 1;
  renderCalendar();
});
document.getElementById('calendarToday').addEventListener('click', () => {
  calendarOffset = 0;
  renderCalendar();
});
document.getElementById('closeDayDetailModal').addEventListener('click', hideDayDetailModal);
document.getElementById('quickToggleCalendarMode').addEventListener('change', (event) => {
  quickToggleCalendarMode = event.target.checked;
});

initializeWorkbenchView();

if (getToken()) {
  window.onAdminReady();
}
`);

  return renderDocument(`Availability 工作台 ${safeId}`, body, script);
}

function calendarPage(id: string, timezone: string): string {
  const safeId = escapeHtml(id);
  const safeTimezone = escapeHtml(timezone);
  const body = renderAppShell({
    activeNav: 'products',
    pretitle: 'Product Detail',
    title: '商品详情页',
    description: '这里先套用 Tabler 风格，核心日历、addons、推送 GYG 的现有功能先保留。',
    actions: `<div class="d-flex gap-2"><a class="btn btn-outline-primary" href="/products/${safeId}">Availability 工作台</a><a class="btn btn-outline-secondary" href="/">返回商品列表</a></div>`,
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
              <div class="col-md-4">
                <div class="stat-soft">
                  <div class="text-secondary small">Availability Type</div>
                  <div id="productAvailabilityType" class="fw-semibold">loading...</div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-soft">
                  <div class="text-secondary small">Product Type</div>
                  <div id="productTypeLabel" class="fw-semibold">loading...</div>
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
                <input id="availabilityModeLabel" class="form-control" readonly />
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
let currentAvailabilityType = 'TIME_POINT';
let currentProductType = 'INDIVIDUAL';

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
  const isTimePoint = currentAvailabilityType === 'TIME_POINT';
  document.getElementById('timePointBlock').style.display = isTimePoint ? 'block' : 'none';
  document.getElementById('timePeriodBlock').style.display = isTimePoint ? 'none' : 'block';
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
  const mode = currentAvailabilityType === 'TIME_PERIOD' ? 'time_period' : 'time_point';
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
  const useGroupModel = currentProductType === 'GROUP';
  const vacanciesByCategory = !useGroupModel && individualCategories.length ? individualCategories.map((category) => ({ category, vacancies })) : undefined;
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
        vacancies: useGroupModel || (hasGroupPrice && !vacanciesByCategory) ? vacancies : undefined,
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
          vacancies: useGroupModel || (hasGroupPrice && !vacanciesByCategory) ? vacancies : undefined,
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
    const product = await api('/admin/products/' + encodeURIComponent(PRODUCT_ID));
    document.getElementById('externalProductId').textContent = product.data && product.data.productId ? product.data.productId : 'N/A';
    currentProductCurrency = product.data && product.data.currency ? String(product.data.currency).toUpperCase() : 'CNY';
    currentAvailabilityType = product.data && product.data.availabilityType ? String(product.data.availabilityType).toUpperCase() : 'TIME_POINT';
    currentProductType = product.data && product.data.productType ? String(product.data.productType).toUpperCase() : 'INDIVIDUAL';
    document.getElementById('productAvailabilityType').textContent = currentAvailabilityType.toLowerCase().replace('_', ' ');
    document.getElementById('productTypeLabel').textContent = currentProductType.toLowerCase();
    document.getElementById('availabilityModeLabel').value = currentAvailabilityType.toLowerCase().replace('_', ' ');
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
    updateAvailabilityModeUI();
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

  fastify.get('/products/:id', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const product = await fastify.prisma.product.findUnique({ where: { id } });
    reply.type('text/html; charset=utf-8').send(availabilityWorkbenchPage(id, product?.timezone || 'Asia/Shanghai'));
  });

  fastify.get('/products/:id/settings', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const product = await fastify.prisma.product.findUnique({ where: { id } });
    reply.type('text/html; charset=utf-8').send(calendarPage(id, product?.timezone || 'Asia/Shanghai'));
  });

  fastify.get('/products/:id/calendar', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    reply.redirect('/products/' + encodeURIComponent(id) + '/settings');
  });
};

export default uiRoutes;
