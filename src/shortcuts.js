// meetab-oss — 捷径页（网格 / 文件夹 4↔5 列预览 / 拖拽 / 图标）
import { store } from './store.js';

let data = [];        // 顶层捷径数组（文件夹可嵌套）
let path = [];        // 当前所在文件夹路径（folder id 列表，从根到当前）

const grid = () => document.getElementById('grid');
const crumb = () => document.getElementById('crumb');

function uid() {
  return 'sc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function domainOf(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}
// 客户端（本地）取图标：浏览器直接从站点/CDN 拉，不经过任何后端。
// 主用 DuckDuckGo 公共图标服务（CORS 友好、国内外通用），失败再回退站点自身 favicon。
function faviconFor(url) {
  const d = domainOf(url);
  return d ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(d)}.ico` : '';
}

// 顺序尝试多个候选，返回第一个能加载的图标地址（失败回调 null）。
// candidates：DuckDuckGo → 站点根 /favicon.ico → 站点 /apple-touch-icon.png
function prefetchFavicon(domain, cb) {
  const candidates = [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://${domain}/favicon.ico`,
    `https://${domain}/apple-touch-icon.png`,
  ];
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) { cb(null); return; }
    const img = new Image();
    img.onload = () => cb(candidates[i]);
    img.onerror = () => { i++; tryNext(); };
    img.src = candidates[i];
  };
  tryNext();
}

// 客户端取网页标题：纯前端受 CORS 限制无法直接读外部 HTML 的 <title>，
// 因此走随项目附带的同源 /_meta 代理（需以 server.py 启动）。
// 若服务端无该接口（纯 http.server 部署），fetch 失败则静默降级为手动填写。
function fetchMeta(url, cb) {
  const d = domainOf(url);
  if (!d) { cb(null); return; }
  fetch('/_meta?url=' + encodeURIComponent(url))
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => cb(j && j.title ? j.title : null))
    .catch(() => cb(null));
}

function letterOf(title) {
  return (title || '?').trim().charAt(0).toUpperCase() || '?';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// 递归查找节点及其所在数组
function find(id, list = data, parent = null) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { node: list[i], list, index: i, parent };
    if (list[i].type === 'folder') {
      const r = find(id, list[i].items, list[i]);
      if (r) return r;
    }
  }
  return null;
}
function currentList() {
  if (!path.length) return data;
  const f = find(path[path.length - 1]);
  return f ? f.node.items : data;
}

// 文件夹预览：≤12 维持 4 列，13~15 自动 5 列全显，16+ 截断 15 +「+N」
function folderPreviewHTML(items) {
  const n = items.length;
  const cols = n > 12 ? 5 : 4;
  let show = n, plus = 0;
  if (n > 15) { show = 15; plus = n - 15; }
  const cells = items.slice(0, show).map((it) => {
    const ic = it.icon || faviconFor(it.url);
    if (ic) return `<img class="pf-ic" src="${esc(ic)}" alt="" loading="lazy" onerror="this.outerHTML=window.__letterSpan('${esc(it.title)}')">`;
    return `<span class="pf-ic pf-ticon">${letterOf(it.title)}</span>`;
  });
  if (plus > 0) cells.push(`<span class="pf-ic pf-plus">+${plus}</span>`);
  return `<div class="folder-preview" style="--pf-cols:${cols}">${cells.join('')}</div>`;
}

function tileHTML(node) {
  const isFolder = node.type === 'folder';
  let iconHTML;
  if (isFolder) {
    iconHTML = `<span class="tile-icon folder-ic">📁</span>`;
  } else if (node.icon && node.icon.startsWith('char:')) {
    // 文字图标（用户手填的字 / emoji），无网络请求
    iconHTML = `<span class="tile-icon"><span class="tile-ticon">${esc(node.icon.slice(5))}</span></span>`;
  } else {
    const ic = (node.icon && !node.icon.startsWith('char:')) ? node.icon : faviconFor(node.url);
    iconHTML = ic
      ? `<span class="tile-icon"><img class="tile-img" src="${esc(ic)}" alt="" loading="lazy" onerror="this.outerHTML=window.__letterTile('${esc(node.title)}')"></span>`
      : `<span class="tile-icon"><span class="tile-ticon">${letterOf(node.title)}</span></span>`;
  }
  const preview = isFolder && node.items.length ? folderPreviewHTML(node.items) : '';
  const count = isFolder ? `<span class="tile-count">${node.items.length}</span>` : '';
  return `
    <div class="tile ${isFolder ? 'tile-folder' : 'tile-site'}" draggable="true"
         data-id="${node.id}" data-type="${node.type}" title="${esc(node.title)}">
      ${iconHTML}${count}
      <div class="tile-title">${esc(node.title)}</div>
      ${preview}
      <button class="tile-edit" data-act="edit" title="编辑">✎</button>
    </div>`;
}

// 供 onerror 内联调用，生成字母兜底
window.__letterTile = (title) => `<span class="tile-icon"><span class="tile-ticon">${letterOf(title)}</span></span>`;
window.__letterSpan = (title) => `<span class="pf-ic pf-ticon">${letterOf(title)}</span>`;

export function render() {
  const list = currentList();
  const g = grid();
  if (!g) return;
  if (!list.length) {
    g.innerHTML = `<div class="empty-hint">还没有捷径，点右上角「＋」添加，或把文件夹拖进来归类。</div>`;
  } else {
    g.innerHTML = list.map(tileHTML).join('');
  }
  renderCrumb();
  bindTiles();
}

function renderCrumb() {
  const c = crumb();
  if (!c) return;
  if (!path.length) { c.innerHTML = ''; return; }
  const parts = ['<a data-go="root">全部</a>'];
  let acc = [];
  for (const fid of path) {
    acc.push(fid);
    const f = find(fid);
    if (f) parts.push(`<a data-go="${fid}">${esc(f.node.title)}</a>`);
  }
  c.innerHTML = parts.join('<span class="crumb-sep">›</span>');
  c.querySelectorAll('a[data-go]').forEach((a) => {
    a.onclick = () => {
      const go = a.dataset.go;
      path = go === 'root' ? [] : acc.slice(0, acc.indexOf(go) + 1);
      render();
    };
  });
}

// ---- 拖拽 ----
let dragId = null;
function bindTiles() {
  grid().querySelectorAll('.tile').forEach((t) => {
    t.ondragstart = (e) => {
      dragId = t.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
      t.classList.add('dragging');
    };
    t.ondragend = () => { dragId = null; t.classList.remove('dragging'); clearDrop(); };
    t.ondragover = (e) => {
      e.preventDefault();
      if (t.dataset.id !== dragId) t.classList.add('drop-target');
    };
    t.ondragleave = () => t.classList.remove('drop-target');
    t.ondrop = (e) => {
      e.preventDefault();
      t.classList.remove('drop-target');
      const srcId = dragId;
      if (!srcId || srcId === t.dataset.id) return;
      onDrop(srcId, t.dataset.id);
    };
    t.onclick = (e) => {
      if (e.target.closest('.tile-edit')) { openEditor(t.dataset.id); return; }
      if (t.dataset.type === 'folder') {
        path = [...path, t.dataset.id];
        render();
      } else {
        const node = find(t.dataset.id);
        if (node && node.node.url) window.open(node.node.url, '_blank', 'noopener');
      }
    };
    const editBtn = t.querySelector('.tile-edit');
    if (editBtn) editBtn.onclick = (e) => { e.stopPropagation(); openEditor(t.dataset.id); };
  });
}
function clearDrop() { grid().querySelectorAll('.drop-target').forEach((t) => t.classList.remove('drop-target')); }

function onDrop(srcId, targetId) {
  const src = find(srcId);
  const tgt = find(targetId);
  if (!src || !tgt) return;
  if (src.node.type === 'folder' && (targetId === srcId || isAncestor(srcId, tgt.node))) return;
  const [moved] = src.list.splice(src.index, 1);
  if (tgt.node.type === 'folder') tgt.node.items.push(moved);
  else tgt.list.splice(tgt.index, 0, moved);
  persist();
  render();
}
function isAncestor(ancestorId, node) {
  if (node.type !== 'folder') return false;
  return node.items.some((it) => it.id === ancestorId || isAncestor(ancestorId, it));
}

// ---- 编辑器 ----
function openEditor(id) {
  const node = id ? find(id) : null;
  openForm(node ? { ...node.node } : { type: 'site', title: '', url: '', icon: '' });
}
function openForm(val) {
  const overlay = ensureModal();
  const isFolder = val.type === 'folder';
  // 解析已存图标：char: 前缀 = 文字图标；其余视为图片 URL
  const isChar = !!(val.icon && val.icon.startsWith('char:'));
  const iconUrlVal = isChar ? '' : (val.icon || '');
  const textVal = isChar ? val.icon.slice(5) : '';

  overlay.querySelector('.modal-body').innerHTML = `
    <label class="fld">类型
      <select id="fType">
        <option value="site" ${!isFolder ? 'selected' : ''}>网址捷径</option>
        <option value="folder" ${isFolder ? 'selected' : ''}>文件夹</option>
      </select>
    </label>
    <label class="fld">名称
      <input id="fTitle" type="text" value="${esc(val.title)}" placeholder="例如 视频 / B站">
    </label>
    <label class="fld fld-url" ${isFolder ? 'hidden' : ''}>网址
      <input id="fUrl" type="text" value="${esc(val.url || '')}" placeholder="https://...">
    </label>
    <label class="fld fld-icon" ${isFolder ? 'hidden' : ''}>图标
      <div class="icon-row">
        <input id="fIcon" type="text" value="${esc(iconUrlVal)}" placeholder="图标图片 URL（留空自动获取）">
        <button type="button" id="fFetch" class="btn">获取图标</button>
      </div>
      <div class="icon-prev" id="fIconPrev"></div>
    </label>
    <label class="fld fld-icontext" ${isFolder ? 'hidden' : ''}>或文字图标（留空则用图片图标；填单个字 / emoji 作为图标，零网络请求）
      <input id="fIconText" type="text" value="${esc(textVal)}" placeholder="如 ★ 或 邮 或 🎵" maxlength="4">
    </label>
    <p class="modal-msg" id="fMsg"></p>
  `;

  const fTitle = overlay.querySelector('#fTitle');
  const fUrl = overlay.querySelector('#fUrl');
  const fIcon = overlay.querySelector('#fIcon');
  const fIconText = overlay.querySelector('#fIconText');
  const fPrev = overlay.querySelector('#fIconPrev');
  const fMsg = overlay.querySelector('#fMsg');

  // 预览：文字图标优先，其次图片，再其次首字
  function paintPreview() {
    const t = fIconText.value.trim();
    const u = fIcon.value.trim();
    if (t) fPrev.innerHTML = `<span class="prev-ticon">${esc(t)}</span>`;
    else if (u) fPrev.innerHTML = `<img class="prev-img" src="${esc(u)}" onerror="this.outerHTML='<span class=&quot;prev-ticon&quot;>${esc((fTitle.value || '?').slice(0, 1))}</span>'">`;
    else fPrev.innerHTML = `<span class="prev-ticon">${esc((fTitle.value || '?').slice(0, 1))}</span>`;
  }
  fIconText.oninput = paintPreview;
  fIcon.oninput = () => { if (fIconText.value.trim()) fIconText.value = ''; paintPreview(); };
  fTitle.oninput = () => { if (!fIcon.value.trim() && !fIconText.value.trim()) paintPreview(); };

  // 获取图标：客户端按域名顺序尝试候选（DuckDuckGo → 站点根 favicon → apple-touch-icon）
  // 同时通过同源 /_meta 代理尝试补「网站名称」（需以 server.py 启动；纯 http.server 下静默跳过）
  overlay.querySelector('#fFetch').onclick = () => {
    const d = domainOf(fUrl.value.trim());
    if (!d) { fMsg.textContent = '请先填写有效网址'; return; }
    fMsg.textContent = '正在获取…';
    prefetchFavicon(d, (res) => {
      if (res) { fIcon.value = res; fIconText.value = ''; paintPreview(); }
      fetchMeta(fUrl.value.trim(), (t) => {
        if (t && !fTitle.value.trim()) fTitle.value = t;
        fMsg.textContent = res ? '' : '图标未自动获取到，可手动粘贴图标 URL，或改用文字图标';
      });
    });
  };

  // 编辑已有站点且无显式图标时，自动预取一次（仿米贴打开即见图标）
  if (!isFolder && !isChar && !iconUrlVal && domainOf(val.url || '')) {
    const u = val.url;
    prefetchFavicon(domainOf(u), (res) => {
      if (res) { fIcon.value = res; paintPreview(); }
    });
    // 自动尝试补名称（需 server.py 提供 /_meta；纯 http.server 下静默跳过）
    fetchMeta(u, (t) => { if (t && !fTitle.value.trim()) fTitle.value = t; });
  }
  paintPreview();

  const typeSel = overlay.querySelector('#fType');
  typeSel.onchange = () => {
    const f = typeSel.value === 'folder';
    overlay.querySelector('.fld-url').hidden = f;
    overlay.querySelector('.fld-icon').hidden = f;
    overlay.querySelector('.fld-icontext').hidden = f;
  };
  overlay.querySelector('#fSave').onclick = () => {
    const title = fTitle.value.trim();
    const type = typeSel.value;
    const url = fUrl.value.trim();
    const textIcon = fIconText.value.trim();
    const iconUrl = fIcon.value.trim();
    if (!title) { fMsg.textContent = '名称不能为空'; return; }
    if (type === 'site' && !/^https?:\/\//i.test(url)) { fMsg.textContent = '网址需以 http(s):// 开头'; return; }
    const id = val.id || uid();
    let icon;
    if (type === 'folder') icon = '';
    else if (textIcon) icon = 'char:' + textIcon;
    else icon = iconUrl || faviconFor(url);
    const obj = type === 'folder'
      ? { id, type: 'folder', title, items: val.items || [] }
      : { id, type: 'site', title, url, icon };
    if (val.id) {
      const f = find(val.id);
      if (f) Object.assign(f.node, obj);
    } else {
      currentList().push(obj);
    }
    persist();
    closeModal();
    render();
  };
  overlay.querySelector('#fDelete').hidden = !val.id;
  overlay.querySelector('#fDelete').onclick = () => {
    if (val.id) {
      const f = find(val.id);
      if (f) f.list.splice(f.index, 1);
      persist();
    }
    closeModal();
    render();
  };
  showModal('编辑捷径');
}

// ---- 新增入口（由工具栏调用） ----
export function addShortcut() { openEditor(null); }

// ---- 模态框 ----
let modalEl = null;
function ensureModal() {
  if (modalEl) return modalEl;
  const o = document.createElement('div');
  o.className = 'modal-overlay';
  o.hidden = true;
  o.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><span class="modal-title">编辑</span>
        <button class="modal-x" aria-label="关闭">✕</button></div>
      <div class="modal-body"></div>
      <div class="modal-foot">
        <button id="fDelete" class="btn btn-danger">删除</button>
        <span class="spacer"></span>
        <button class="btn" data-close>取消</button>
        <button id="fSave" class="btn btn-primary">保存</button>
      </div>
    </div>`;
  document.body.appendChild(o);
  o.querySelector('.modal-x').onclick = closeModal;
  o.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModal));
  o.onclick = (e) => { if (e.target === o) closeModal(); };
  modalEl = o;
  return o;
}
function showModal(title) {
  const o = ensureModal();
  o.querySelector('.modal-title').textContent = title;
  o.hidden = false;
  requestAnimationFrame(() => o.classList.add('open'));
}
function closeModal() {
  if (!modalEl) return;
  modalEl.classList.remove('open');
  modalEl.hidden = true;
}

function persist() {
  store.set('shortcuts', data);
  window.dispatchEvent(new CustomEvent('meetab:shortcuts', { detail: data }));
}

export function initShortcuts() {
  data = store.get('shortcuts', []);
  if (!Array.isArray(data)) data = [];
  render();
  store.on('shortcuts', (v) => {
    if (v !== undefined) { data = Array.isArray(v) ? v : []; path = []; render(); }
  });
}
