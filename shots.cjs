const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const seed = async () => {
    await page.addInitScript(() => {
      const sc = [
        { id: 'a', type: 'site', title: 'B 站', url: 'https://bilibili.com', icon: '' },
        { id: 'b', type: 'site', title: 'GitHub', url: 'https://github.com', icon: '' },
        { id: 'c', type: 'site', title: 'YouTube', url: 'https://youtube.com', icon: '' },
        { id: 'd', type: 'folder', title: '音乐', items: [
          { id: 'd1', type: 'site', title: '网易云', url: 'https://music.163.com', icon: '' },
          { id: 'd2', type: 'site', title: 'QQ 音乐', url: 'https://y.qq.com', icon: '' },
          { id: 'd3', type: 'site', title: 'Spotify', url: 'https://spotify.com', icon: '' },
          { id: 'd4', type: 'site', title: 'Apple Music', url: 'https://music.apple.com', icon: '' },
        ] },
        { id: 'e', type: 'site', title: '知乎', url: 'https://zhihu.com', icon: '' },
        { id: 'f', type: 'site', title: '微博', url: 'https://weibo.com', icon: '' },
      ];
      localStorage.setItem('meetab_oss_shortcuts', JSON.stringify(sc));
      localStorage.setItem('meetab_oss_theme', '"light"');
    });
  };

  // 1. 搜索页（浅色）
  await seed();
  await page.goto('http://localhost:8137/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'preview-search.png' });

  // 2. 捷径页（滚轮进）
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'preview-shortcuts.png' });

  // 3. 设置抽屉（深色）
  await page.evaluate(() => { localStorage.setItem('meetab_oss_theme', '"dark"'); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('#settingsOpen');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'preview-settings-dark.png' });

  await browser.close();
  console.log('shots done');
})().catch((e) => { console.error(e); process.exit(1); });
