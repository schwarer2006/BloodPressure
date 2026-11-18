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
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

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
    "revision": "7e616837e06cf4057a9dfcab5c71a33d"
  }, {
    "url": "icon.svg",
    "revision": "e19adef460538ca1779112eca39859c0"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "c89516559ba790202a2370d8797b090c"
  }, {
    "url": "assets/web-CVD0GylH.js",
    "revision": null
  }, {
    "url": "assets/web-BZxgNwmY.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Dqk5qvad.js",
    "revision": null
  }, {
    "url": "assets/pdfFonts-DB_nwAq0.js",
    "revision": null
  }, {
    "url": "assets/index.es-CN31hjsy.js",
    "revision": null
  }, {
    "url": "assets/index-CKVQCle8.css",
    "revision": null
  }, {
    "url": "assets/index-Bbsyig8h.js",
    "revision": null
  }, {
    "url": "assets/html2canvas-UVIGgzlI.js",
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
    "revision": "7600b6ca56f60b1da99014be338b5e05"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
