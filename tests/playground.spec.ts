/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {test, expect, Page} from '@playwright/test';

test.describe('Playground', () => {
  test('default example is simple-greeting.ts', async ({page}) => {
    await page.goto(`/playground`);

    await waitForPlaygroundPreviewToLoad(page);

    const greetingExample = page.locator(
      '#exampleContent > div:nth-child(1) > ul > li:nth-child(1)'
    );
    await expect(greetingExample).toHaveClass('exampleItem active');

    const codeEditor = page.locator('playground-code-editor #focusContainer');
    expect(
      (await codeEditor.textContent()).includes(
        `@customElement('simple-greeting')`
      )
    ).toBe(true);

    const playgroundPreviewFrame = await (
      await page.locator('playground-preview iframe').elementHandle()
    ).contentFrame();
    await expect(
      playgroundPreviewFrame.locator('simple-greeting p')
    ).toHaveText('Hello, World!');
    await expect(playgroundPreviewFrame.locator('simple-greeting p')).toHaveCSS(
      'color',
      'rgb(0, 0, 255)'
    );
  });

  test('updating the example code updates the preview', async ({page}) => {
    await page.goto(`/playground`);

    // Double click text=blue
    await page.dblclick('text=blue');

    // Change the text to red
    await page.keyboard.type('red');

    await waitForPlaygroundPreviewToLoad(page);

    const playgroundPreviewFrame = await (
      await page.locator('playground-preview iframe').elementHandle()
    ).contentFrame();
    await expect(
      playgroundPreviewFrame.locator('simple-greeting p')
    ).toHaveText('Hello, World!');
    await expect(playgroundPreviewFrame.locator('simple-greeting p')).toHaveCSS(
      'color',
      'rgb(255, 0, 0)'
    );
  });

  test('Hello world project golden', async ({page}) => {
    await page.goto('/playground');
    await waitForPlaygroundPreviewToLoad(page);
    // Because of shadow dom piercing, Playwright finds multiple '#content'
    // nodes, i.e. the page, and within the playground shadow DOM.
    await expect(
      await page.locator('main > #content').screenshot()
    ).toMatchSnapshot('helloWorldPlaygroundProject.png');
  });
});

async function waitForPlaygroundPreviewToLoad(page: Page) {
  await page.waitForSelector(
    'playground-preview [part="preview-loading-indicator"][aria-hidden="true"]'
  );
  // There is a fade-out transition on the playground loading bar that makes
  // screenshots flaky. Wait for the loading bar to have animated out.
  await page.waitForTimeout(250);
}
