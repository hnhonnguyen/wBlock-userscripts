// YouTube exposes dubbed audio tracks behind the player API while Tube
// Cleaner hides the native settings menu. This checks the toolbar pill lists
// the tracks, switches them, remembers the language, and restores it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webkit, devices } from 'playwright';

const script = readFileSync(new URL('../../packages/tube-cleaner/dist/tube-cleaner.user.js', import.meta.url), 'utf8');
const fixture = new URL('./fixture.html', import.meta.url).href;
const browser = await webkit.launch();
try {
  const context = await browser.newContext(devices['iPhone 13']);
  await context.addInitScript(script);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  async function installAudioMock() {
    await page.evaluate(() => {
      const player = document.getElementById('movie_player');
      const tracks = [
        { id: 'en.4', getLanguageInfo: () => ({ name: 'English original', id: 'en.4', isDefault: true, isAutoDubbed: false }) },
        { id: 'vi.3', getLanguageInfo: () => ({ name: 'Vietnamese', id: 'vi.3', isDefault: false, isAutoDubbed: false }) }
      ];
      window.__audioTracks = tracks;
      window.__currentAudioTrack = tracks[0];
      window.__audioTrackCalls = [];
      player.getAvailableAudioTracks = () => window.__audioTracks;
      player.getAudioTrack = () => window.__currentAudioTrack;
      player.setAudioTrack = track => {
        window.__audioTrackCalls.push(track.id);
        window.__currentAudioTrack = track;
      };
    });
  }
  async function state() {
    return page.evaluate(() => ({
      preference: localStorage.getItem('wblock.tubeCleaner.audioLanguage'),
      current: window.__currentAudioTrack && window.__currentAudioTrack.id,
      calls: window.__audioTrackCalls ? window.__audioTrackCalls.slice() : [],
      pill: document.querySelector('.wblock-tc-audio-track-button')?.textContent || null,
      visible: (() => {
        const button = document.querySelector('.wblock-tc-audio-track-button');
        return !!button && !!(button.offsetWidth || button.offsetHeight);
      })()
    }));
  }
  async function showToolbar() {
    const visible = await page.evaluate(() =>
      document.querySelector('.wblock-tc-toolbar')?.style.opacity === '1');
    if (!visible) await page.evaluate(() => document.querySelector('.wblock-tc-handle').click());
    await page.waitForTimeout(100);
  }
  async function select(label) {
    await showToolbar();
    await page.evaluate(() => document.querySelector('.wblock-tc-audio-track-button').click());
    const options = await page.locator('.wblock-tc-audio-track-menu > button').allTextContents();
    await page.locator('.wblock-tc-audio-track-menu > button', { hasText: label }).click();
    return options;
  }

  await page.goto(fixture);
  await page.waitForSelector('.wblock-tc-native');
  await installAudioMock();
  await page.waitForSelector('.wblock-tc-audio-track-button', { state: 'visible', timeout: 5000 });
  let s = await state();
  assert.equal(s.pill, 'EN', 'the pill shows the current track');
  assert.equal(s.current, 'en.4');

  await showToolbar();
  const options = await page.locator('.wblock-tc-audio-track-button').evaluate(() => {
    const button = document.querySelector('.wblock-tc-audio-track-button');
    button.click();
    return Array.from(document.querySelectorAll('.wblock-tc-audio-track-menu > button')).map(b => b.textContent);
  });  assert.deepEqual(options, ['Auto', 'English original', 'Vietnamese']);
  await page.locator('.wblock-tc-audio-track-menu > button', { hasText: 'Vietnamese' }).click();
  await page.waitForTimeout(300);
  s = await state();
  assert.equal(s.preference, 'vi');
  assert.equal(s.current, 'vi.3');
  assert.deepEqual(s.calls, ['vi.3']);
  assert.equal(s.pill, 'VI');
  console.log('PASS: the audio-track pill switches to a dubbed track and saves it');

  await page.reload();
  await page.waitForSelector('.wblock-tc-native');
  await installAudioMock();
  await page.waitForTimeout(6000);
  s = await state();
  assert.equal(s.preference, 'vi');
  assert.equal(s.current, 'vi.3', 'the saved language is restored on the next load');
  assert.equal(s.pill, 'VI');
  console.log('PASS: the saved audio language is applied automatically');

  await select('Auto');
  await page.waitForTimeout(300);
  s = await state();
  assert.equal(s.preference, null);
  assert.equal(s.current, 'en.4', 'Auto returns to the default track');
  assert.equal(s.pill, 'EN');
  console.log('PASS: Auto clears the preference and returns to the original track');

  await page.evaluate(() => { window.__audioTracks = window.__audioTracks.slice(0, 1); });
  await page.waitForTimeout(3500);
  s = await state();
  assert.equal(s.visible, false, 'the pill hides when there is only one track');
  console.log('PASS: the audio-track pill only appears when a choice exists');

  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
