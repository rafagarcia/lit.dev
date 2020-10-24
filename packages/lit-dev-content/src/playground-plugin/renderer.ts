/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import * as playwright from 'playwright';
import * as pathlib from 'path';
import {startDevServer} from '@web/dev-server';
import {DevServer} from '@web/dev-server-core';

/**
 * Playwright-based renderer for playground-elements.
 */
export class Renderer {
  private server: RendererServer;
  private browser: playwright.Browser;
  private page: playwright.Page;
  private stopped = false;

  private constructor(
    server: RendererServer,
    browser: playwright.Browser,
    page: playwright.Page
  ) {
    this.server = server;
    this.browser = browser;
    this.page = page;
  }

  static async start(): Promise<Renderer> {
    return new Promise(async (resolve) => {
      const browser = await playwright.chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();
      const server = await RendererServer.start();

      const body = `
      <!doctype html>
      <script type="module">
        import "/node_modules/code-sample-editor/lib/codemirror-editor.js";
        window.editor = document.createElement('codemirror-editor');
        document.body.appendChild(window.editor);
      </script>
    `;
      const url = server.serveOnce(body);
      await page.goto(url);

      resolve(new Renderer(server, browser, page));
    });
  }

  async stop() {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    await Promise.all([this.server.stop(), this.browser.close()]);
  }

  async render(
    lang: 'html' | 'css' | 'js' | 'ts',
    code: string
  ): Promise<{html: string}> {
    if (this.stopped) {
      throw new Error('Renderer has already stopped');
    }

    // We're re-using a single element on a single page across all renders, to
    // maximize render speed, because there is a very signifigant startup cost.
    // So because this is an async interface, we need to serialize render
    // requests to ensure they don't interfere. In the future we could introduce
    // a pool of browsers to take advantage of concurrent rendering.
    await this.getPageLock();

    try {
      type WindowWithEditor = typeof window & {
        editor: {
          shadowRoot: ShadowRoot;
          updateComplete: Promise<void>;
          type: string;
          value: string;
        };
      };
      const codemirrorHtml = await this.page.evaluate(
        async ([lang, code]) => {
          const editor = (window as WindowWithEditor).editor;
          editor.type = lang;
          editor.value = code;
          await editor.updateComplete;
          const cm = editor.shadowRoot.querySelector('.CodeMirror-code');
          if (cm === null) {
            throw new Error(
              '<codemirror-editor> did not render a ".CodeMirror-code" element'
            );
          }
          return cm.innerHTML;
        },
        [lang, code]
      );
      const html = `<div class="CodeMirror cm-s-default">${codemirrorHtml}</div>`;
      return {html};
    } finally {
      this.releasePageLock();
    }
  }

  private numLockWaiters = 0;
  private lockWaiterResolves: Array<() => void> = [];

  private getPageLock(): void | Promise<void> {
    this.numLockWaiters++;
    if (this.numLockWaiters > 1) {
      return new Promise((resolve) => {
        this.lockWaiterResolves.push(resolve);
      });
    }
  }

  private releasePageLock(): void {
    this.numLockWaiters--;
    if (this.numLockWaiters > 0) {
      const resolve = this.lockWaiterResolves.shift()!;
      resolve();
    }
  }
}

/**
 * HTTP server for the Playwright renderer.
 */
class RendererServer {
  private wds: DevServer;
  private bodyMap: Map<string, string>;
  private nextId = 0;

  private constructor(wds: DevServer, bodyMap: Map<string, string>) {
    this.wds = wds;
    this.bodyMap = bodyMap;
  }

  static async start(): Promise<RendererServer> {
    const bodyMap = new Map<string, string>();
    return new Promise(async (resolve) => {
      // Stop Web Dev Server from taking over the whole terminal.
      const realWrite = process.stdout.write;
      process.stdout.write = (() => {}) as any;
      const wds = await startDevServer({
        config: {
          rootDir: pathlib.resolve(__dirname, '..'),
          preserveSymlinks: true, // Needed when a dependency is NPM linked
          nodeResolve: true,
          middleware: [
            async (ctx, next) => {
              if (ctx.URL.pathname !== '/') {
                return next();
              }
              const id = ctx.URL.searchParams.get('id');
              if (id === null) {
                return next();
              }
              const body = bodyMap.get(id);
              if (body === undefined) {
                return next();
              }
              ctx.response.type = 'text/html';
              ctx.response.body = body;
              bodyMap.delete(id);
            },
          ],
        },
      });
      process.stdout.write = realWrite;
      resolve(new RendererServer(wds, bodyMap));
    });
  }

  async stop(): Promise<void> {
    await this.wds.stop();
  }

  /**
   * Generate a URL that will serve the given HTML body exactly one time. Once
   * the URL has been requested, it will become invalid.
   */
  serveOnce(body: string): string {
    const id = String(this.nextId++);
    this.bodyMap.set(id, body);
    return `http://localhost:${this.wds.config.port}/?id=${id}`;
  }
}
