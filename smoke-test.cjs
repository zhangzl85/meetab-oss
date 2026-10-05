const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('CONSOLE: ' + m.text()); });
  const failed404 = [];
  page.on('response', (r) => { if (r.status() === 404 && r.url().startsWith('http://localhost:8137')) failed404.push(r.url()); });

  await page.goto('http://localhost:8137/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const report = {};

  // 1. 时钟已渲染（非占位）
  report.clock = await page.textContent('#clock');
  // 2. 初始在搜索页（overlay 未开）
  report.overlayOpenInit = await page.evaluate(() => document.body.classList.contains('overlay-open'));

  // 3. 滚轮下滑进捷径页
  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(400);
  report.overlayOpenAfterWheel = await page.evaluate(() => document.body.classList.contains('overlay-open'));
  report.gridVisible = await page.evaluate(() => {
    const g = document.getElementById('grid');
    return g && getComputedStyle(g).display !== 'none';
  });

  // 4. 添加捷径
  await page.click('#addShortcut');
  await page.waitForTimeout(200);
  await page.fill('#fTitle', '测试站');
  await page.fill('#fUrl', 'https://example.com');
  await page.click('#fSave');
  await page.waitForTimeout(300);
  report.tileCount = await page.evaluate(() => document.querySelectorAll('#grid .tile').length);
  report.tileTitle = await page.evaluate(() => {
    const t = document.querySelector('#grid .tile .tile-title');
    return t ? t.textContent : null;
  });

  // 4b. 文字图标（零网络）：新增一个用 emoji 作图标的捷径
  await page.click('#addShortcut');
  await page.waitForTimeout(200);
  await page.fill('#fTitle', '文字站');
  await page.fill('#fUrl', 'https://text.example.com');
  await page.fill('#fIcon', '');           // 清空自动预取的图片 URL
  await page.fill('#fIconText', '★');      // 选用文字图标
  await page.click('#fSave');
  await page.waitForTimeout(300);
  report.charIcon = await page.evaluate(() => {
    const t = [...document.querySelectorAll('#grid .tile')].find((x) => x.querySelector('.tile-title')?.textContent === '文字站');
    return t ? (t.querySelector('.tile-ticon') ? t.querySelector('.tile-ticon').textContent : null) : 'NOT_FOUND';
  });

  // 4c. 获取图标按钮存在且点击不报错（结果受外网可达性影响，仅验证不崩溃）
  await page.click('#addShortcut');
  await page.waitForTimeout(150);
  await page.fill('#fTitle', '取图标站');
  await page.fill('#fUrl', 'https://github.com');
  await page.click('#fFetch');
  await page.waitForTimeout(1500);
  report.fetchBtnWorks = await page.evaluate(() => !!document.getElementById('fFetch'));
  await page.click('#fSave').catch(() => {});
  await page.waitForTimeout(150);

  // 5. 返回搜索页（收起）
  await page.click('#overlayClose');
  await page.waitForTimeout(400);
  report.overlayClosed = await page.evaluate(() => !document.body.classList.contains('overlay-open'));

  // 6. 主题切换为深色并回来
  await page.click('#settingsOpen');
  await page.waitForTimeout(300);
  await page.selectOption('#sTheme', 'dark');
  await page.waitForTimeout(200);
  report.themeDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.selectOption('#sTheme', 'light');
  await page.waitForTimeout(200);
  report.themeLight = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  // 切换方式
  await page.selectOption('#sPageSwitch', 'both');
  await page.waitForTimeout(100);
  await page.click('#settingsClose');
  await page.waitForTimeout(300);
  report.pageSwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('meetab_oss_pageSwitchMode') || 'null'));

  // 7. 持久化（重载后捷径仍在、主题浅色）
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  report.tileCountAfterReload = await page.evaluate(() => document.querySelectorAll('#grid .tile').length);

  // 8. 右键切换（both 模式）
  await page.mouse.click(400, 300, { button: 'right' });
  await page.waitForTimeout(400);
  report.overlayOpenByRightClick = await page.evaluate(() => document.body.classList.contains('overlay-open'));

  report.errors = errors;
  report.failed404 = failed404;

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (errors.length || failed404.length) process.exit(2);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });
