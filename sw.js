/* 英语小冒险 PWA Service Worker */
const VERSION = "v1";
const SHELL = "shell-" + VERSION;
const AUDIO = "audio-" + VERSION;
const SHELL_FILES = ["./", "./index.html", "./manifest.json",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      return c.addAll(SHELL_FILES).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== SHELL && k !== AUDIO;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isAudio = url.pathname.indexOf("/assets/") >= 0;

  if (isAudio) {
    e.respondWith(
      caches.open(AUDIO).then(function (c) {
        return c.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && res.ok) c.put(req, res.clone()).catch(function () {});
            return res;
          }).catch(function () { return hit || Response.error(); });
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && (req.mode === "navigate" || url.pathname.endsWith(".html") ||
            url.pathname.endsWith(".json") || url.pathname.indexOf("/icons/") >= 0)) {
          caches.open(SHELL).then(function (c) { c.put(req, res.clone()).catch(function () {}); });
        }
        return res;
      }).catch(function () {
        if (req.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    })
  );
});
