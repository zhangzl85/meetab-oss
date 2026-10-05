// meetab-oss — 主题管理（浅色 / 深色 / 跟随系统）
import { store } from './store.js';

const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function systemPrefersDark() {
  return mq ? mq.matches : false;
}

// 把 theme 解析成实际 light/dark
export function resolveTheme(mode) {
  if (mode === 'auto') return systemPrefersDark() ? 'dark' : 'light';
  return mode === 'dark' ? 'dark' : 'light';
}

export function applyTheme(mode) {
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-mode', mode); // 记住用户选择
  // 仅切 class（light/dark 简写，供 CSS body.light 规则使用），不回写 store，避免与订阅者互相触发死循环
  document.body.classList.toggle('light', resolved === 'light');
  document.body.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

export function initTheme(getMode) {
  // 监听系统主题变化（仅当处于 auto 时实时跟随）
  if (mq) {
    mq.addEventListener('change', () => {
      const cur = getMode();
      if (cur === 'auto') applyTheme('auto');
    });
  }
  applyTheme(getMode());
}
