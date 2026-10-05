// meetab-oss — 搜索页（搜索引擎按钮 + 下拉，回车搜索 / 网址直达）
const ENGINES = [
  { key: 'bing', name: '必应', icon: 'B', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { key: 'google', name: 'Google', icon: 'G', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { key: 'baidu', name: '百度', icon: '百', url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
  { key: 'duckduckgo', name: 'DuckDuckGo', icon: 'D', url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
];

export function engineList() { return ENGINES; }

export function initSearch(getCfg, setCfg) {
  const input = document.getElementById('searchInput');
  const form = document.getElementById('searchForm');
  const btn = document.getElementById('engineBtn');
  const icon = document.getElementById('engineIcon');
  const dd = document.getElementById('engineDropdown');
  const list = document.getElementById('engineList');
  if (!input || !form || !btn || !icon || !dd || !list) return;

  let engine = getCfg().engine || 'bing';
  const current = () => ENGINES.find((x) => x.key === engine) || ENGINES[0];

  function paintIcon() { icon.textContent = current().icon; }
  function renderList() {
    list.innerHTML = ENGINES.map((e) =>
      `<div class="engine-item ${e.key === engine ? 'active' : ''}" data-key="${e.key}">
        <span class="ei-ic">${e.icon}</span><span>${e.name}</span>
      </div>`).join('');
    list.querySelectorAll('.engine-item').forEach((it) => {
      it.onclick = () => {
        engine = it.dataset.key;
        setCfg('engine', engine);
        paintIcon();
        renderList();
        dd.classList.add('hidden');
        input.focus();
      };
    });
  }
  paintIcon();
  renderList();

  btn.onclick = (e) => { e.stopPropagation(); dd.classList.toggle('hidden'); };
  document.addEventListener('click', (e) => {
    if (!dd.contains(e.target) && e.target !== btn) dd.classList.add('hidden');
  });

  function doSearch(raw) {
    const v = (raw || '').trim();
    if (!v) return;
    let target;
    if (/^https?:\/\//i.test(v)) target = v;
    else if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(v) && !/\s/.test(v)) target = 'https://' + v;
    else target = current().url(v);
    window.open(target, '_blank', 'noopener');
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); doSearch(input.value); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doSearch(input.value); }
  });
}
