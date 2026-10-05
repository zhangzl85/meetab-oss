// meetab-oss — 纯前端 localStorage 存储层
// 零后端、零密钥、零 meetab.cn 硬编码。所有数据存在浏览器本地。
const NS = 'meetab_oss_';

const subs = {};

function emit(key, val) {
  (subs[key] || []).forEach((fn) => {
    try { fn(val); } catch (e) { console.warn('[store] sub error', key, e); }
  });
}

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, val) {
    localStorage.setItem(NS + key, JSON.stringify(val));
    emit(key, val);
  },
  remove(key) {
    localStorage.removeItem(NS + key);
    emit(key, undefined);
  },
  // 简单的发布订阅，供跨组件同步（例如设置面板改了主题，背景立即更新）
  on(key, fn) {
    (subs[key] || (subs[key] = [])).push(fn);
    return () => store.off(key, fn);
  },
  off(key, fn) {
    if (subs[key]) subs[key] = subs[key].filter((f) => f !== fn);
  },
};

// 出厂默认配置（首次启动注入）
export const DEFAULTS = {
  theme: 'auto',                       // auto | light | dark
  engine: 'bing',                     // 默认搜索引擎
  pageSwitchMode: 'wheel',            // 搜索页↔捷径页切换：wheel | rightclick | both
  wallpaper: {
    enabled: true,                    // 是否启用 Bing 每日一图
    source: 'bing',                   // bing | custom
    customUrl: '',                    // 自定义背景图直链
    blur: 0,                          // 0-20 背景模糊强度
  },
  shortcuts: [],                      // 捷径数组（含文件夹）
};

export function loadConfig() {
  const cfg = { ...structuredCloneSafe(DEFAULTS) };
  // 逐字段合并，避免旧版本缺字段
  for (const k of Object.keys(DEFAULTS)) {
    const saved = store.get(k);
    if (saved !== null) cfg[k] = mergeDeep(cfg[k], saved);
  }
  return cfg;
}

function mergeDeep(base, over) {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return over;
  if (typeof over !== 'object' || over === null) return over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = mergeDeep(base[k], over[k]);
  return out;
}

function structuredCloneSafe(o) {
  return JSON.parse(JSON.stringify(o));
}
