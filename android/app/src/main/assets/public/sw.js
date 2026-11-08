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
    "revision": "a1706364505c4d286f256c4171846eb4"
  }, {
    "url": "pwa-512x512.png",
    "revision": "2759943c9b11eaac182d4e631a1b379c"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d9b2a6947e70fb8c3a9fc3bee55d1e4c"
  }, {
    "url": "index.html",
    "revision": "474f09533602d75f47a7cf1851648792"
  }, {
    "url": "icon.svg",
    "revision": "ea5bbcdab7c6f5f92113a4241bf23693"
  }, {
    "url": "favicon.ico",
    "revision": "d80e0fa88af42cd9802f2daef9208a27"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d451efdd5eb9a880f9d709c9350aff62"
  }, {
    "url": "assets/index-CnyVRKd5.js",
    "revision": null
  }, {
    "url": "assets/index-CSLeGy8s.css",
    "revision": null
  }, {
    "url": "assets/id3Reader-D6UEcFk6.js",
    "revision": null
  }, {
    "url": "assets/aistudio/image_fc6b0103.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_f7d38961.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_da933fb4.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_d858e0cb.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_a29fb13e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_995ff80e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_9732eb07.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_623e7721.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_61a5209d.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_6128c985.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_4c0c5d27.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_2f024def.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_169b4522.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_0ef46655.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_0608e492.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d451efdd5eb9a880f9d709c9350aff62"
  }, {
    "url": "favicon.ico",
    "revision": "d80e0fa88af42cd9802f2daef9208a27"
  }, {
    "url": "icon.svg",
    "revision": "ea5bbcdab7c6f5f92113a4241bf23693"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d9b2a6947e70fb8c3a9fc3bee55d1e4c"
  }, {
    "url": "pwa-512x512.png",
    "revision": "2759943c9b11eaac182d4e631a1b379c"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "a1706364505c4d286f256c4171846eb4"
  }, {
    "url": "manifest.webmanifest",
    "revision": "eb1d960f9e05e7562119dfce11097e29"
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
