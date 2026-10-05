// meetab-oss — 设置面板（外观 / 搜索 / 数据）
import { store } from './store.js';
import { engineList } from './search.js';

let getCfg, setCfg;

export function initSettings(getConfig, setConfig) {
  getCfg = getConfig;
  setCfg = setConfig;
  const drawer = document.getElementById('settingsDrawer');
  if (!drawer) return;
  renderBody(drawer);

  document.getElementById('settingsClose').onclick = closeDrawer;
  document.getElementById('settingsOpen').onclick = openDrawer;
  drawer.onclick = (e) => { if (e.target === drawer) closeDrawer(); };
}

function renderBody(drawer) {
  const cfg = getCfg();
  const body = drawer.querySelector('.drawer-body');
  const themeOpts = [
    ['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色'],
  ].map(([k, n]) => `<option value="${k}" ${cfg.theme === k ? 'selected' : ''}>${n}</option>`).join('');
  const engOpts = engineList().map((e) => `<option value="${e.key}" ${cfg.engine === e.key ? 'selected' : ''}>${e.name}</option>`).join('');

  body.innerHTML = `
    <section class="set-sec">
      <h3>外观</h3>
      <label class="fld">主题
        <select id="sTheme">${themeOpts}</select>
      </label>
      <label class="fld">搜索页 ↔ 捷径页 切换方式
        <select id="sPageSwitch">
          <option value="wheel" ${cfg.pageSwitchMode !== 'rightclick' && cfg.pageSwitchMode !== 'both' ? 'selected' : ''}>滚轮下滑</option>
          <option value="rightclick" ${cfg.pageSwitchMode === 'rightclick' ? 'selected' : ''}>右键空白</option>
          <option value="both" ${cfg.pageSwitchMode === 'both' ? 'selected' : ''}>两者皆可</option>
        </select>
      </label>
      <label class="fld row"><span>启用 Bing 每日一图</span>
        <input id="sWpOn" type="checkbox" ${cfg.wallpaper.enabled ? 'checked' : ''}>
      </label>
      <label class="fld">壁纸来源
        <select id="sWpSrc">
          <option value="bing" ${cfg.wallpaper.source !== 'custom' ? 'selected' : ''}>Bing 每日一图</option>
          <option value="custom" ${cfg.wallpaper.source === 'custom' ? 'selected' : ''}>自定义图片</option>
        </select>
      </label>
      <label class="fld" id="sWpUrlFld" ${cfg.wallpaper.source === 'custom' ? '' : 'hidden'}>自定义背景图直链
        <input id="sWpUrl" type="text" placeholder="https://..." value="${esc(cfg.wallpaper.customUrl || '')}">
      </label>
      <label class="fld">背景模糊 <span id="sBlurVal">${cfg.wallpaper.blur}</span>
        <input id="sBlur" type="range" min="0" max="20" value="${cfg.wallpaper.blur}">
      </label>
    </section>

    <section class="set-sec">
      <h3>搜索</h3>
      <label class="fld">默认搜索引擎
        <select id="sEngine">${engOpts}</select>
      </label>
    </section>

    <section class="set-sec">
      <h3>数据（仅存本地浏览器）</h3>
      <p class="hint">所有捷径与设置都保存在本机 localStorage，不上传任何服务器。</p>
      <div class="btn-row">
        <button class="btn" id="sExport">导出备份</button>
        <button class="btn" id="sImport">导入备份</button>
        <button class="btn btn-danger" id="sReset">清空全部</button>
      </div>
      <input id="sImportFile" type="file" accept="application/json" hidden>
    </section>
  `;

  body.querySelector('#sTheme').onchange = (e) => { setCfg('theme', e.target.value); };
  body.querySelector('#sPageSwitch').onchange = (e) => { setCfg('pageSwitchMode', e.target.value); };
  body.querySelector('#sWpOn').onchange = (e) => setCfg('wallpaper', { ...getCfg().wallpaper, enabled: e.target.checked });
  const srcSel = body.querySelector('#sWpSrc');
  srcSel.onchange = (e) => {
    setCfg('wallpaper', { ...getCfg().wallpaper, source: e.target.value });
    body.querySelector('#sWpUrlFld').hidden = e.target.value !== 'custom';
  };
  body.querySelector('#sWpUrl').onchange = (e) => setCfg('wallpaper', { ...getCfg().wallpaper, customUrl: e.target.value.trim() });
  const blur = body.querySelector('#sBlur');
  blur.oninput = (e) => { body.querySelector('#sBlurVal').textContent = e.target.value; setCfg('wallpaper', { ...getCfg().wallpaper, blur: Number(e.target.value) }); };
  body.querySelector('#sEngine').onchange = (e) => setCfg('engine', e.target.value);

  body.querySelector('#sExport').onclick = exportBackup;
  body.querySelector('#sImport').onclick = () => body.querySelector('#sImportFile').click();
  body.querySelector('#sImportFile').onchange = importBackup;
  body.querySelector('#sReset').onclick = () => {
    if (!confirm('确定清空全部捷径与设置？此操作不可撤销。')) return;
    ['theme', 'engine', 'wallpaper', 'shortcuts', 'wp_cache'].forEach((k) => store.remove(k));
    location.reload();
  };
}

function exportBackup() {
  const out = {};
  ['theme', 'engine', 'wallpaper', 'shortcuts'].forEach((k) => { out[k] = store.get(k); });
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'meetab-oss-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      Object.keys(obj).forEach((k) => store.set(k, obj[k]));
      location.reload();
    } catch { alert('备份文件解析失败'); }
  };
  reader.readAsText(file);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function openDrawer() {
  const d = document.getElementById('settingsDrawer');
  if (d) { d.hidden = false; document.body.classList.add('settings-open'); requestAnimationFrame(() => d.classList.add('open')); }
}
export function closeDrawer() {
  const d = document.getElementById('settingsDrawer');
  if (d) { d.classList.remove('open'); d.hidden = true; document.body.classList.remove('settings-open'); }
}
