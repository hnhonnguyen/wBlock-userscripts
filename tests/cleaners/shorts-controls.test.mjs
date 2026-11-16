// Shorts on mobile web has no quality menu. This checks the fork's compact
// quality and speed pills apply saved choices, keep the reel UI stock, and
// disappear on regular watch pages.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webkit, devices } from 'playwright';

const script = readFileSync(new URL('../../packages/tube-cleaner/dist/tube-cleaner.user.js', import.meta.url), 'utf8');
const fixture = readFileSync(new URL('./fixture.html', import.meta.url), 'utf8');
const browser = await webkit.launch();
try {
  const context = await browser.newContext(devices['iPhone 13']);
  await context.addInitScript(() => {
    try {
      if (!localStorage.getItem('wblock.test.shortsSeeded')) {
        localStorage.setItem('wblock.tubeCleaner.quality', 'hd1080');
        localStorage.setItem('wblock.tubeCleaner.playbackSpeed', '1.5');
        localStorage.setItem('wblock.test.shortsSeeded', '1');
      }
    } catch (e) { /* ignore */ }
  });
  await context.addInitScript(script);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://www.youtube.com/**', route => route.fulfill({
    status: 200, contentType: 'text/html', body: fixture
  }));

  async function makeReady() {
    await page.evaluate(() => {
      const video = document.querySelector('#movie_player video');
      Object.defineProperty(video, 'readyState', { configurable: true, value: 4 });
      video.dispatchEvent(new Event('loadedmetadata'));
    });
    await page.waitForTimeout(1500);
  }
  async function state() {
    return page.evaluate(() => ({
      path: location.pathname,
      qualityPill: document.querySelector('.wblock-tc-shorts-quality-button')?.textContent || null,
      speedPill: document.querySelector('.wblock-tc-shorts-speed-button')?.textContent || null,
      toolbar: !!document.querySelector('.wblock-tc-toolbar'),
      preference: localStorage.getItem('wblock.tubeCleaner.quality'),
      speedPreference: localStorage.getItem('wblock.tubeCleaner.playbackSpeed'),
      current: document.getElementById('movie_player')?.getPlaybackQuality() || null,
      range: window.__qualityRangeCalls?.at(-1) || null,
      rate: document.querySelector('#movie_player video')?.playbackRate
    }));
  }

  await page.goto('https://www.youtube.com/shorts/SHORTSVID12', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.wblock-tc-shorts-quality-button');
  await makeReady();
  let s = await state();
  assert.equal(s.path, '/shorts/SHORTSVID12');
  assert.equal(s.toolbar, false, 'Shorts keeps the stock player chrome');
  assert.equal(s.qualityPill, '1080p', 'the quality pill shows the applied saved quality');
  assert.equal(s.speedPill, '1.5x', 'the speed pill shows the saved playback speed');
  assert.deepEqual(s.range, ['hd1080', 'hd1080']);
  assert.equal(s.current, 'hd1080');
  assert.equal(s.rate, 1.5);
  console.log('PASS: Shorts applies the saved quality and speed through the media APIs');

  await page.locator('.wblock-tc-shorts-quality-button').click();
  const qualityOptions = await page.locator('.wblock-tc-shorts-quality-menu > button').allTextContents();
  assert.ok(qualityOptions.includes('720p'), 'the quality pill exposes the quality ladder');
  await page.locator('.wblock-tc-shorts-quality-menu > button', { hasText: '720p' }).click();
  await page.waitForTimeout(1500);
  s = await state();
  assert.equal(s.preference, 'hd720');
  assert.equal(s.current, 'hd720');
  assert.equal(s.qualityPill, '720p');
  console.log('PASS: choosing a Shorts quality updates the saved preference');

  await page.locator('.wblock-tc-shorts-speed-button').click();
  const speedOptions = await page.locator('.wblock-tc-shorts-speed-menu > button').allTextContents();
  assert.ok(speedOptions.includes('2x'), 'the speed pill exposes the speed ladder');
  await page.locator('.wblock-tc-shorts-speed-menu > button', { hasText: /^2x$/ }).click();
  await page.waitForTimeout(500);
  s = await state();
  assert.equal(s.speedPreference, '2');
  assert.equal(s.rate, 2);
  assert.equal(s.speedPill, '2x');
  console.log('PASS: choosing a Shorts speed updates the saved preference');

  await page.evaluate(() => {
    const video = document.querySelector('#movie_player video');
    window.__shortsPipMode = 'inline';
    video.webkitSupportsPresentationMode = mode => mode === 'picture-in-picture';
    video.webkitSetPresentationMode = mode => {
      window.__shortsPipMode = mode;
      video.dispatchEvent(new Event('webkitpresentationmodechanged'));
    };
    Object.defineProperty(video, 'webkitPresentationMode', {
      configurable: true,
      get: () => window.__shortsPipMode
    });
  });
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.wblock-tc-shorts-pip-button').isVisible(), true);
  await page.locator('.wblock-tc-shorts-pip-button').click();
  assert.equal(await page.evaluate(() => window.__shortsPipMode), 'picture-in-picture');
  assert.equal(await page.locator('.wblock-tc-shorts-pip-button').getAttribute('aria-pressed'), 'true');
  await page.locator('.wblock-tc-shorts-pip-button').click();
  assert.equal(await page.evaluate(() => window.__shortsPipMode), 'inline');
  assert.equal(await page.locator('.wblock-tc-shorts-pip-button').getAttribute('aria-pressed'), 'false');
  console.log('PASS: the Shorts PiP pill enters and leaves picture-in-picture');

  await page.goto('https://www.youtube.com/watch?v=TESTVID123', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.wblock-tc-native');
  assert.equal(await page.locator('.wblock-tc-shorts-quality-button').count(), 0, 'watch pages keep only the normal toolbar');
  assert.equal(await page.locator('.wblock-tc-shorts-speed-button').count(), 0, 'watch pages keep only the normal toolbar');
  assert.equal(await page.locator('.wblock-tc-shorts-pip-button').count(), 0, 'watch pages keep only the normal toolbar');
  console.log('PASS: the Shorts pills are removed on regular watch pages');

  await page.goto('https://www.youtube.com/shorts/SHORTSVID12', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.wblock-tc-shorts-quality-button');
  await makeReady();
  s = await state();
  assert.equal(s.preference, 'hd720', 'the Shorts quality choice persists');
  assert.equal(s.current, 'hd720');
  assert.equal(s.speedPreference, '2', 'the Shorts speed choice persists');
  assert.equal(s.rate, 2);
  console.log('PASS: saved Shorts quality and speed are restored on a later visit');

  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
