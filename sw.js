/* 모닝 브리핑 — 앱 설치용 서비스 워커
 * - 화면(index.html): 네트워크 먼저. 끊겼을 때만 저장해 둔 화면을 쓴다.
 *   (화면을 고쳐 올리면 다음에 열 때 바로 반영된다)
 * - 데이터(api.github.com): 손대지 않는다. 항상 최신 Gist를 직접 읽는다.
 * - 글꼴(cdn.jsdelivr.net): 한 번 받으면 저장해 두고 쓴다.
 */
var CACHE = "morning-board-shell";
var FONTS = "morning-board-fonts";
var ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (u) { return c.add(new Request(u, { cache: "reload" })).catch(function () {}); }));
  }).catch(function () {}));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return (k === CACHE || k === FONTS) ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }).catch(function () {}));
});

function put(name, req, res) { try { var c = res.clone(); caches.open(name).then(function (x) { x.put(req, c).catch(function () {}); }); } catch (e) {} }

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url; try { url = new URL(req.url); } catch (err) { return; }

  if (url.hostname === "api.github.com") return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req.url, { cache: "no-store" }).then(function (res) {
      if (res && res.ok) put(CACHE, "./index.html", res);
      return res;
    }).catch(function () {
      return caches.match("./index.html").then(function (hit) {
        return hit || new Response("<meta charset=utf-8><p style='font:15px system-ui;padding:2rem'>인터넷에 연결되면 다시 열어 주세요.</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
      });
    }));
    return;
  }

  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { if (res) put(FONTS, req, res); return res; })
        .catch(function () { return new Response("", { headers: { "Content-Type": "text/css" } }); });
    }));
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.status === 200) put(CACHE, req, res);
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || new Response("", { status: 504 }); });
    }));
  }
});
