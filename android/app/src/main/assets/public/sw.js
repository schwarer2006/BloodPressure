/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "4171043438371d12e7167cbc2e446142"
  }, {
    "url": "pwa-512x512.png",
    "revision": "0d0b1119da632f48f06870265457a03f"
  }, {
    "url": "pwa-192x192.png",
    "revision": "61c5cd21fb85982fce756966566aa775"
  }, {
    "url": "index.html",
    "revision": "edb5a28ea3f554b8b4cdcfeae730c11a"
  }, {
    "url": "icon.svg",
    "revision": "e19adef460538ca1779112eca39859c0"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "c89516559ba790202a2370d8797b090c"
  }, {
    "url": "assets/web-kAj6c56Z.js",
    "revision": null
  }, {
    "url": "assets/web-CU41qumC.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Dqk5qvad.js",
    "revision": null
  }, {
    "url": "assets/index.es-DRrWr3Qo.js",
    "revision": null
  }, {
    "url": "assets/index-DcgyJFl1.js",
    "revision": null
  }, {
    "url": "assets/index-CmFYduWt.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-BQMeB5-K.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "c89516559ba790202a2370d8797b090c"
  }, {
    "url": "icon.svg",
    "revision": "e19adef460538ca1779112eca39859c0"
  }, {
    "url": "pwa-192x192.png",
    "revision": "61c5cd21fb85982fce756966566aa775"
  }, {
    "url": "pwa-512x512.png",
    "revision": "0d0b1119da632f48f06870265457a03f"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "4171043438371d12e7167cbc2e446142"
  }, {
    "url": "manifest.webmanifest",
    "revision": "8b4b8c5fd40bb693fcea2e8b3a31205a"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
