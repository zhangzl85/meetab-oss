# 米贴 · 开源版（meetab-oss）

纯前端的浏览器起始页：**搜索页 + 捷径页**，数据全部存在你自己的浏览器（`localStorage`），**零后端、零密钥、零构建**。

> 这是 [meetab.cn](https://meetab.cn) 的**独立开源版本**，只开源「搜索页 + 捷径页 + 各自设置」两块基础功能。与 meetab.cn 在线服务无隶属关系，图标获取、壁纸、数据存储全部在本地浏览器完成，不经过任何米贴服务器。

## 在线体验

- **开源版在线 Demo**（本仓库静态构建，纯前端、数据存你自己的浏览器）：[zhangzl85.github.io/meetab-oss](https://zhangzl85.github.io/meetab-oss/)
- **完整版 · 米贴在线服务** [`meetab.cn`](https://www.meetab.cn/)：含账号体系、云端多设备同步、更多工具与浏览器扩展能力。**注意：此为完整版，并非本开源构建**——开源版仅含「搜索页 + 捷径页」两块基础功能。

## 功能

- **搜索页**：搜索框（回车搜索 / 直接输入网址直达）+ 引擎切换（必应 / Google / 百度 / DuckDuckGo）
- **捷径页**：网格管理，支持文件夹归类；文件夹预览 ≤12 项 4 列、13~15 项自动 5 列、16+ 截断 15 项并显示「+N」
- **拖拽**：捷径拖到另一个捷径上 = 调序；拖到文件夹上 = 收进文件夹
- **图标（本地获取）**：添加捷径时点「获取图标」，浏览器**本地**按域名顺序尝试候选（`DuckDuckGo 图标服务 → 站点根 /favicon.ico → /apple-touch-icon.png`），全部失败则自动回退「首字兜底」；也支持手填「文字图标」（单个字 / emoji，零网络请求）
- **网站名称自动获取**：以附带的 `server.py` 启动时，点「获取图标」会**同时**由服务端代抓网页标题自动填入「名称」（服务端抓取不受浏览器跨域 CORS 限制）；仅用 `python3 -m http.server` 启动时名称需手填，其余功能不受影响
- **壁纸**：Bing 每日一图（客户端按日缓存），可换自定义图片直链
- **主题**：浅色 / 深色 / 跟随系统（无首屏闪烁）
- **两屏翻页**：搜索页下滑进捷径页，捷径页滚到顶继续上滑 / 点「收起 ↑」/ Esc 返回（切换方式可在设置里选「滚轮 / 右键空白 / 两者」）
- **数据**：导出 / 导入 JSON 备份，一键清空；全部仅存本机

## ⚠️ 为什么不能直接双击 index.html 打开

直接双击 `index.html`（地址栏显示 `file://...`）会**白屏 / 功能失效**。原因：

> 本项目用 **ES Module**（`type="module"`）组织代码。浏览器出于安全策略，对 `file://` 来源的模块脚本实施 **CORS 跨域拦截**，会直接拒绝加载 `src/app.js`，导致所有交互（搜索、捷径、设置）都不工作。

`localStorage` 在 `file://` 下可用，但模块脚本加载被拦，**所以必须用一个本地 HTTP 服务器打开**（让页面以 `http://` 来源加载模块）。

## 运行（本地）

无构建、无依赖，任意静态服务器即可。**请从项目根目录执行**：

```bash
cd meetab-oss
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

不想敲命令？项目根目录已附带启动脚本，双击即可：

- macOS / Linux：`serve.sh`（默认优先用 `server.py`，支持「网站名称自动获取」）
- Windows：`serve.bat`
- 或 `npm start`（等价于上面的 python 命令）

> 默认 `serve.sh` / `npm start` 会优先用 `server.py` 启动（多一个 `/_meta` 标题代理，可自动填网站名称）。若只想用系统自带静态服务器，可执行 `python3 -m http.server 8080`，图标照常自动获取、名称改为手填。

> 提示：直接双击 `index.html` 不会报错崩溃，而是会在页面底部弹出上面的「为什么打不开」说明，按提示起服务即可。

## 部署到自己的 NAS / 任意服务器

本项目是**纯静态文件**，没有任何后端、没有构建步骤。部署 = 把整个 `meetab-oss/` 文件夹当作一个静态站点托管。

**通用步骤（任意 NAS / VPS / 内网服务器）：**

1. 把 `meetab-oss/` 整个目录复制到你 NAS 的「网站根目录」（各家叫法不同：Web 根目录 / 共享目录 / 虚拟主机目录）。
2. 在 NAS 的「Web 服务 / 网页服务器」里把它设为一个站点（或用 File Station 直接指向该目录，开 HTTP 服务）。
3. 浏览器访问 `http://你的NAS内网IP:端口/` 即可。

**以飞牛 / 群晖这类 NAS 为例（命令行版）：**

```bash
# 假设你已把项目放在 ~/meetab-oss，NAS 的 Web 根目录是 /var/www/meetab
rsync -avz --delete ~/meetab-oss/ 用户名@NAS_IP:/var/www/meetab/
```

> 注意：
> - 图标获取、Bing 壁纸需要**访问外网**（图标从站点/CDN 拉、壁纸从 Bing 拉）。内网纯离线环境时，图标回退首字、壁纸回退内置渐变，功能不受影响。
> - 所有捷径与设置**只存在访问者各自的浏览器 `localStorage`**，换设备 / 清缓存不会同步；可用设置里的「导出 / 导入备份」迁移。
> - **想要「网站名称自动获取」？** 用项目里附带的 `server.py` 取代 `python3 -m http.server` 即可（它多提供一个同源 `/_meta` 接口，在后端代抓网页标题，不受浏览器跨域限制）。在 NAS 上执行 `PORT=8901 python3 server.py`，或把 `serve.sh` 拷过去运行。仍用纯 `http.server` 也能跑，只是名称需手填。

## 目录结构

```
index.html          页面骨架（含 file:// 友好提示 + 防闪烁主题引导）
style.css           米贴真实设计令牌 + 浅/深主题 + 两屏翻页样式
server.py           附带的小型服务器（静态托管 + /_meta 标题代理，支持名称自动获取）
serve.sh / serve.bat 一键本地启动（默认优先 server.py）
src/
  app.js            入口装配（两屏翻页 / 右键 / 触摸 / 键盘）
  store.js          localStorage 存储层 + 发布订阅 + 默认配置
  theme.js          主题管理（auto/light/dark，跟随系统）
  wallpaper.js      Bing 每日一图 + 自定义壁纸
  search.js         搜索页（引擎表 / 网址直达 / 引擎按钮+下拉）
  shortcuts.js      捷径页（网格 / 文件夹 / 拖拽 / 编辑器 / 本地取图标 + 兜底）
  settings.js       设置抽屉（外观 / 搜索 / 切换方式 / 数据备份）
```

## 浏览器扩展

开源版是纯网页应用，**无需安装扩展**即可使用全部开源功能。若想体验**完整版**的多设备同步、接管新标签页等能力，可安装米贴浏览器扩展：

| 浏览器 | 商店地址 |
| --- | --- |
| Microsoft Edge | [Edge 外接程序](https://microsoftedge.microsoft.com/addons/detail/%E7%B1%B3%E8%B4%B4%E6%A0%87%E7%AD%BE%E9%A1%B5/agcckokogdpklfcpophkcgkchcckgaod) |
| Google Chrome | [Chrome 网上应用店](https://chromewebstore.google.com/detail/%E7%B1%B3%E8%B4%B4%E6%A0%87%E7%AD%BE%E9%A1%B5/lbbjdgllbodjicbnblnjmchkllpdklfm?hl=zh-CN) |
| Mozilla Firefox | [Firefox 扩展](https://addons.mozilla.org/zh-CN/firefox/addon/%E7%B1%B3%E8%B4%B4%E6%A0%87%E7%AD%BE%E9%A1%B5/) |
| 更多版本 / 官网 | [meetab.cn](https://www.meetab.cn/)（完整版，非开源构建） |

> 应用内右上角圆形「扩展」按钮也会弹出同样的安装入口。扩展为**可选增强**，不影响开源版本身的使用。

## 数据与隐私

- 所有捷径与设置保存在浏览器 `localStorage`（命名空间 `meetab_oss_*`），**不上传任何服务器**。
- 唯一的外部请求：① Bing 每日一图接口（拿当天壁纸直链）；② 图标获取时浏览器向站点 / DuckDuckGo 图标服务拉取图标。断网或拉取失败时，壁纸回退内置渐变、图标回退首字，功能不受影响。

## 许可

代码以 [MIT](./LICENSE) 许可开源。「米贴 / meetab」名称与标识归原作者所有，本项目为独立开源版本。
