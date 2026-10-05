#!/usr/bin/env python3
"""meetab-oss 附带的小型服务器：静态托管 + /_meta 标题代理。

- 静态文件服务（等价于 `python3 -m http.server`）
- GET /_meta?url=<encoded>  -> 服务端抓取该网址的 <title>，返回 JSON {"title": "..."}
  用于纯前端因 CORS 无法直接读取外部网页标题时，由本机服务端代抓。
  仅支持 http/https，带超时与体积上限，避免被当作开放代理滥用。

启动：python3 server.py  （或 PORT=8901 python3 server.py）
"""
import os
import re
import json
import urllib.request
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8901"))
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/_meta":
            self._meta(parsed)
            return
        super().do_GET()

    def _meta(self, parsed):
        title = ""
        q = urllib.parse.parse_qs(parsed.query)
        url = (q.get("url") or [""])[0]
        if url and url.startswith(("http://", "https://")):
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "Mozilla/5.0 (meetab-oss meta fetcher)"}
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    raw = resp.read(200000)
                enc = resp.headers.get_content_charset() or "utf-8"
                try:
                    text = raw.decode(enc, errors="replace")
                except Exception:
                    text = raw.decode("utf-8", errors="replace")
                m = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
                if m:
                    title = re.sub(r"\s+", " ", m.group(1).strip())
            except Exception:
                title = ""
        body = json.dumps({"title": title}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


def main():
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"meetab-oss serving on http://0.0.0.0:{PORT}  (static + /_meta)")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
