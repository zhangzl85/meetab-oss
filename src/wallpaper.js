// meetab-oss — 壁纸（保留 Bing 每日一图 + 自定义图）
// 纯前端拉取，无后端。Bing 每日一图通过公开的 JSON 接口获取当天直链。
import { store } from './store.js';

const BING_JSON = 'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN';
const CACHE_KEY = 'wp_cache';

// 取 Bing 当天壁纸直链（带按日期缓存，避免每次刷新都请求）
async function fetchBingUrl() {
  const today = new Date().toISOString().slice(0, 10);
  const cached = store.get(CACHE_KEY);
  if (cached && cached.date === today && cached.url) return cached.url;

  try {
    const res = await fetch(BING_JSON, { cache: 'no-store' });
    if (!res.ok) throw new Error('bing ' + res.status);
    const data = await res.json();
    const url = data.url || (data.images && data.images[0] && data.images[0].url);
    if (!url) throw new Error('no url');
    store.set(CACHE_KEY, { date: today, url });
    return url;
  } catch (e) {
    console.warn('[wallpaper] Bing 获取失败，回退渐变', e);
    return null;
  }
}

// 应用壁纸到背景层
export async function applyWallpaper(cfg) {
  const wp = cfg.wallpaper || {};
  const layer = document.getElementById('wallpaper');
  if (!layer) return;

  let url = null;
  if (wp.enabled) {
    if (wp.source === 'custom' && wp.customUrl) {
      url = wp.customUrl;
    } else {
      url = await fetchBingUrl();
    }
  }

  const blur = Math.max(0, Math.min(20, Number(wp.blur) || 0));
  layer.style.setProperty('--wp-blur', blur + 'px');

  if (url) {
    layer.style.backgroundImage = `url("${url}")`;
    layer.classList.add('has-image');
    layer.setAttribute('aria-hidden', 'true');
  } else {
    // 无图时回退到内置渐变（CSS 控制）
    layer.style.backgroundImage = '';
    layer.classList.remove('has-image');
  }
}

export function initWallpaper(getCfg) {
  // 设置变更时自动重绘
  store.on('wallpaper', () => applyWallpaper(getCfg()));
  applyWallpaper(getCfg());
}
