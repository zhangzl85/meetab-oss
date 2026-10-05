// meetab-oss — 入口装配（两屏翻页：搜索页 #main ↔ 捷径页 #overlay）
import { loadConfig, store } from './store.js';
import { initTheme, applyTheme } from './theme.js';
import { initWallpaper, applyWallpaper } from './wallpaper.js';
import { initShortcuts, addShortcut, render as renderShortcuts } from './shortcuts.js';
import { initSearch } from './search.js';
import { initSettings } from './settings.js';

let cfg = loadConfig();
const getCfg = () => cfg;
function setCfg(key, val) {
  cfg[key] = val;
  store.set(key, val);
}

let overlayOpen = false;
let overscrollAccum = 0;
let overscrollTimer = null;

function boot() {
  // 1. 主题
  initTheme(() => getCfg().theme);
  store.on('theme', (m) => { if (m !== undefined) applyTheme(m); });

  // 2. 壁纸
  initWallpaper(getCfg);
  store.on('wallpaper', () => applyWallpaper(getCfg()));

  // 3. 捷径页
  initShortcuts();

  // 4. 搜索页
  initSearch(getCfg, setCfg);

  // 5. 设置面板
  initSettings(getCfg, setCfg);

  // 6. 时钟
  initClock();

  // 7. 两屏翻页
  bindPageFlip();

  // 8. 工具栏按钮
  const addBtn = document.getElementById('addShortcut');
  if (addBtn) addBtn.onclick = addShortcut;
  const closeBtn = document.getElementById('overlayClose');
  if (closeBtn) closeBtn.onclick = () => setOverlay(false);

  // 8b. 浏览器扩展弹窗（仿米贴）
  const extBtn = document.getElementById('extBtn');
  const extModal = document.getElementById('extModal');
  const extClose = document.getElementById('extClose');
  const openExt = () => { if (extModal) { extModal.hidden = false; requestAnimationFrame(() => extModal.classList.add('open')); } };
  const closeExt = () => { if (extModal) { extModal.classList.remove('open'); extModal.hidden = true; } };
  if (extBtn) extBtn.onclick = openExt;
  if (extClose) extClose.onclick = closeExt;
  if (extModal) extModal.addEventListener('click', (e) => { if (e.target === extModal) closeExt(); });

  // 9. 网格底部渐隐
  const grid = document.getElementById('grid');
  const fade = document.getElementById('gridFade');
  const updFade = () => {
    if (!fade || !grid) return;
    const canScroll = grid.scrollHeight > grid.clientHeight + 2;
    const atBottom = grid.scrollTop >= grid.scrollHeight - grid.clientHeight - 4;
    fade.classList.toggle('visible', canScroll && !atBottom);
  };
  grid.addEventListener('scroll', updFade);
  window.addEventListener('resize', updFade);
  updFade();
}

/* ---------- 两屏翻页 ---------- */
function setOverlay(open) {
  if (open === overlayOpen) return;
  overlayOpen = open;
  document.body.classList.toggle('overlay-open', open);
  const ov = document.getElementById('overlay');
  if (ov) ov.classList.toggle('visible', open);
  const sh = document.getElementById('scrollHint');
  if (sh) sh.classList.toggle('hidden', open);
  if (open) {
    renderShortcuts();
    const g = document.getElementById('grid');
    if (g) g.scrollTop = 0;
    requestAnimationFrame(() => document.getElementById('gridFade') &&
      document.getElementById('gridFade').classList.toggle('visible', g && g.scrollHeight > g.clientHeight + 40));
  }
}

function bindPageFlip() {
  const searchInput = document.getElementById('searchInput');

  // 滚轮：搜索页下滑进捷径页；捷径页滚到顶继续上滑返回
  window.addEventListener('wheel', (e) => {
    if (document.body.classList.contains('settings-open')) return;
    const mode = getCfg().pageSwitchMode || 'wheel';
    if (mode === 'rightclick') return;
    if (!overlayOpen) {
      if (e.deltaY > 6) setOverlay(true);
    } else {
      const g = document.getElementById('grid');
      if (g && g.scrollTop <= 2 && e.deltaY < 0) {
        overscrollAccum += -e.deltaY;
        clearTimeout(overscrollTimer);
        overscrollTimer = setTimeout(() => { overscrollAccum = 0; }, 350);
        if (overscrollAccum >= 200) { overscrollAccum = 0; setOverlay(false); }
      } else {
        overscrollAccum = 0;
      }
    }
  }, { passive: true });

  // 右键空白处：切到下一屏（rightclick / both 模式）
  document.addEventListener('contextmenu', (e) => {
    const mode = getCfg().pageSwitchMode || 'wheel';
    if (mode === 'wheel') return;
    if (e.target.closest('.tile, .tool-btn, .overlay-close, a, button, input, select, textarea, .engine-dropdown, .modal, .drawer, .brand-sub')) return;
    if (document.body.classList.contains('settings-open')) return;
    e.preventDefault();
    setOverlay(!overlayOpen);
  });

  // 键盘：Esc 返回 / ↓ 在搜索框打开捷径页
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (extModal && !extModal.hidden) { closeExt(); return; }
      if (overlayOpen) setOverlay(false);
      if (document.body.classList.contains('settings-open')) document.getElementById('settingsClose')?.click();
      return;
    }
    if (e.key === 'ArrowDown' && document.activeElement === searchInput && !overlayOpen) {
      e.preventDefault(); setOverlay(true);
    }
  });

  // 触摸：上滑进 / 顶部下滑出
  let ty = null;
  window.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (ty == null) return;
    const dy = ty - e.changedTouches[0].clientY; // 正=上滑
    const mode = getCfg().pageSwitchMode || 'wheel';
    if (mode === 'rightclick') { ty = null; return; }
    if (!overlayOpen && dy > 60) setOverlay(true);
    else if (overlayOpen) {
      const g = document.getElementById('grid');
      if (g && g.scrollTop <= 2 && dy < -60) setOverlay(false);
    }
    ty = null;
  }, { passive: true });
}

/* ---------- 时钟 ---------- */
function initClock() {
  const clock = document.getElementById('clock');
  const date = document.getElementById('date');
  function tick() {
    const d = new Date();
    if (clock) clock.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (date) {
      try { date.textContent = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }); }
      catch { date.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
    }
  }
  tick();
  setInterval(tick, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
