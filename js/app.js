/**
 * FoldC64 — Main Application Controller
 *
 * Initializes the emulator, keyboard, joystick, and handles:
 * - Device posture detection (fold/unfold)
 * - Panel sliding (keyboard ↔ joystick)
 * - Settings/menu overlay
 * - Display mode toggling (retro/clean CRT)
 * - Fullscreen management
 *
 * @module app
 */

import { C64Emulator } from './emulator.js';
import { C64Keyboard } from './keyboard.js';
import { C64Joystick } from './joystick.js';
import { StorageManager } from './storage.js';

class FoldC64App {
  /** @type {C64Emulator} */
  #emulator = null;

  /** @type {C64Keyboard} */
  #keyboard = null;

  /** @type {C64Joystick} */
  #joystick = null;

  /** @type {StorageManager} */
  #storage = null;

  /** @type {'keyboard'|'joystick'} */
  #activePanel = 'keyboard';

  /** @type {'retro'|'clean'} */
  #displayMode = 'retro';

  /** @type {'continuous'|'folded'} */
  #posture = 'continuous';

  /** @type {HTMLElement} */
  #slider = null;

  async init() {
    console.log('[FoldC64] Initializing...');

    // ── Storage ──────────────────────────────────────────────
    this.#storage = new StorageManager();
    await this.#storage.init();

    // Load saved preferences
    const savedDisplayMode = await this.#storage.getSetting('displayMode');
    if (savedDisplayMode) {
      this.#displayMode = savedDisplayMode;
    }

    // ── DOM References ───────────────────────────────────────
    const canvas = document.getElementById('c64-canvas');
    const keyboardContainer = document.getElementById('keyboard-container');
    const joystickContainer = document.getElementById('joystick-container');
    this.#slider = document.getElementById('controls-slider');

    // ── Display Mode ─────────────────────────────────────────
    this.#applyDisplayMode();

    // ── Keyboard ─────────────────────────────────────────────
    this.#keyboard = new C64Keyboard(keyboardContainer, canvas);
    this.#keyboard.init();

    // ── Joystick ─────────────────────────────────────────────
    this.#joystick = new C64Joystick(joystickContainer, canvas);
    this.#joystick.init();

    // ── Posture Detection ────────────────────────────────────
    this.#initPostureDetection();

    // ── Panel Sliding (swipe gesture) ────────────────────────
    this.#initSwipeGesture();

    // ── UI Event Listeners ───────────────────────────────────
    this.#initUIListeners();

    // ── Emulator Launch ──────────────────────────────────────
    this.#emulator = new C64Emulator(canvas, this.#storage);

    const progressBar = document.getElementById('loading-progress');
    try {
      await this.#emulator.launch((progress) => {
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
        }
      });

      // Hide loading screen
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 500);
      }
    } catch (err) {
      console.error('[FoldC64] Failed to initialize emulator:', err);
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.querySelector('.c64-boot-text').innerHTML = `
          <p>**** FOLDC64 EMULATOR ****</p>
          <p class="error-text">LOAD ERROR</p>
          <p>${err.message}</p>
          <p>PRESS RELOAD TO RETRY</p>
        `;
      }
    }

    // ── Ensure audio on first interaction ────────────────────
    const startAudio = () => {
      this.#emulator?.ensureAudio();
      document.removeEventListener('touchstart', startAudio);
      document.removeEventListener('click', startAudio);
    };
    document.addEventListener('touchstart', startAudio, { once: true });
    document.addEventListener('click', startAudio, { once: true });

    console.log('[FoldC64] Initialization complete');
  }

  // ════════════════════════════════════════════════════════════
  // Posture Detection
  // ════════════════════════════════════════════════════════════

  #initPostureDetection() {
    if ('devicePosture' in navigator) {
      // Read initial posture
      this.#posture = navigator.devicePosture.type;
      this.#onPostureChange();

      // Listen for changes
      navigator.devicePosture.addEventListener('change', () => {
        this.#posture = navigator.devicePosture.type;
        this.#onPostureChange();
      });

      console.log(`[FoldC64] Device posture API available. Current: ${this.#posture}`);
    } else {
      console.log('[FoldC64] Device Posture API not available — using fallback layout');
    }

    // Also listen for resize events (covers posture transitions)
    window.addEventListener('resize', () => {
      this.#onResize();
    });
  }

  #onPostureChange() {
    const app = document.getElementById('app');

    if (this.#posture === 'folded') {
      app.classList.add('folded');
      app.classList.remove('flat');
      console.log('[FoldC64] Posture: FOLDED (laptop mode)');
    } else {
      app.classList.add('flat');
      app.classList.remove('folded');
      console.log('[FoldC64] Posture: CONTINUOUS (flat/tablet mode)');
    }
  }

  #onResize() {
    // Re-check viewport segments
    const segments = window.visualViewport?.segments;
    if (segments && segments.length === 2) {
      // Determine if it's laptop (vertical stack) or book (side by side)
      if (segments[0].left === segments[1].left) {
        document.getElementById('app').dataset.foldMode = 'laptop';
      } else {
        document.getElementById('app').dataset.foldMode = 'book';
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // Panel Sliding (Keyboard ↔ Joystick)
  // ════════════════════════════════════════════════════════════

  #initSwipeGesture() {
    const controlsPanel = document.getElementById('controls-panel');
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    controlsPanel.addEventListener('touchstart', (e) => {
      // Only track swipe if touch starts near the edges or on non-interactive elements
      const target = e.target;
      if (target.closest('.c64-key') || target.closest('.joystick-base') ||
          target.closest('.fire-button') || target.closest('.port-btn')) {
        return; // Don't interfere with keyboard/joystick touches
      }

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
    }, { passive: true });

    controlsPanel.addEventListener('touchmove', (e) => {
      if (!isDragging) return;

      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;

      // Only track horizontal swipes (ignore vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        e.preventDefault();
      }
    }, { passive: false });

    controlsPanel.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;

      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - startX;

      // Threshold for swipe: 80px minimum
      if (Math.abs(deltaX) > 80) {
        if (deltaX < 0 && this.#activePanel === 'keyboard') {
          this.#slideTo('joystick');
        } else if (deltaX > 0 && this.#activePanel === 'joystick') {
          this.#slideTo('keyboard');
        }
      }
    }, { passive: true });
  }

  /**
   * Slide the controls panel to show keyboard or joystick.
   *
   * @param {'keyboard'|'joystick'} panel
   */
  #slideTo(panel) {
    this.#activePanel = panel;

    if (panel === 'joystick') {
      this.#slider.classList.add('slide-to-joystick');
    } else {
      this.#slider.classList.remove('slide-to-joystick');
    }

    // Update indicator dots
    document.querySelectorAll('#slide-indicator .dot').forEach((dot) => {
      dot.classList.toggle('active', dot.dataset.panel === panel);
    });

    console.log(`[FoldC64] Slid to: ${panel}`);
  }

  // ════════════════════════════════════════════════════════════
  // UI Event Listeners
  // ════════════════════════════════════════════════════════════

  #initUIListeners() {
    // ── Menu button ──────────────────────────────────────────
    const btnMenu = document.getElementById('btn-menu');
    const settingsOverlay = document.getElementById('settings-overlay');
    const btnCloseSettings = document.getElementById('btn-close-settings');

    btnMenu?.addEventListener('click', () => {
      settingsOverlay.classList.remove('hidden');
      settingsOverlay.setAttribute('aria-hidden', 'false');
      this.#emulator?.pause();
    });

    btnCloseSettings?.addEventListener('click', () => {
      settingsOverlay.classList.add('hidden');
      settingsOverlay.setAttribute('aria-hidden', 'true');
      this.#emulator?.resume();
    });

    // Close overlay on backdrop click
    settingsOverlay?.querySelector('.overlay-backdrop')?.addEventListener('click', () => {
      btnCloseSettings.click();
    });

    // ── Display mode toggle ──────────────────────────────────
    const btnDisplayMode = document.getElementById('btn-display-mode');
    btnDisplayMode?.addEventListener('click', () => {
      this.#displayMode = this.#displayMode === 'retro' ? 'clean' : 'retro';
      this.#applyDisplayMode();
      this.#storage.setSetting('displayMode', this.#displayMode);
    });

    // Display mode in settings dropdown
    const settingDisplayMode = document.getElementById('setting-display-mode');
    settingDisplayMode?.addEventListener('change', (e) => {
      this.#displayMode = e.target.value;
      this.#applyDisplayMode();
      this.#storage.setSetting('displayMode', this.#displayMode);
    });

    // ── Load ROM ─────────────────────────────────────────────
    const btnLoadRom = document.getElementById('btn-load-rom');
    btnLoadRom?.addEventListener('click', async () => {
      settingsOverlay.classList.add('hidden');
      await this.#emulator?.openFilePicker();
      this.#emulator?.resume();
    });

    // ── Save / Load State ────────────────────────────────────
    const btnSaveState = document.getElementById('btn-save-state');
    btnSaveState?.addEventListener('click', async () => {
      const name = `save_${Date.now()}`;
      await this.#emulator?.saveState(name);
      alert(`State saved: ${name}`);
    });

    const btnLoadState = document.getElementById('btn-load-state');
    btnLoadState?.addEventListener('click', async () => {
      const states = await this.#storage?.listStates();
      if (!states || states.length === 0) {
        alert('No saved states found');
        return;
      }
      // Simple prompt-based state selection for now
      const names = states.map((s) => s.name).join('\n');
      const selected = prompt(`Select a state to load:\n\n${names}`);
      if (selected) {
        await this.#emulator?.loadState(selected.trim());
        settingsOverlay.classList.add('hidden');
        this.#emulator?.resume();
      }
    });

    // ── Reset ────────────────────────────────────────────────
    const btnReset = document.getElementById('btn-reset');
    btnReset?.addEventListener('click', async () => {
      settingsOverlay.classList.add('hidden');
      await this.#emulator?.reset();
      this.#emulator?.resume();
    });

    // ── Volume ───────────────────────────────────────────────
    const settingVolume = document.getElementById('setting-volume');
    settingVolume?.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value, 10);
      this.#storage.setSetting('volume', volume);
      // Volume control would need to be passed to the emulator/RetroArch
    });

    // ── Slide indicator dots ─────────────────────────────────
    document.querySelectorAll('#slide-indicator .dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        this.#slideTo(dot.dataset.panel);
      });
    });

    // ── Fullscreen toggle ─────────────────────────────────────
    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen?.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('[FoldC64] Fullscreen request failed:', err);
        });
      }
      // Close settings after toggling
      settingsOverlay.classList.add('hidden');
      settingsOverlay.setAttribute('aria-hidden', 'true');
      this.#emulator?.resume();
    });
  }

  // ════════════════════════════════════════════════════════════
  // Display Mode
  // ════════════════════════════════════════════════════════════

  #applyDisplayMode() {
    const screen = document.getElementById('c64-screen');
    if (!screen) return;

    if (this.#displayMode === 'retro') {
      screen.classList.add('retro-mode');
      screen.classList.remove('clean-mode');
    } else {
      screen.classList.add('clean-mode');
      screen.classList.remove('retro-mode');
    }

    // Sync the settings dropdown if open
    const dropdown = document.getElementById('setting-display-mode');
    if (dropdown) {
      dropdown.value = this.#displayMode;
    }

    console.log(`[FoldC64] Display mode: ${this.#displayMode}`);
  }
}

// ══════════════════════════════════════════════════════════════
// Bootstrap
// ══════════════════════════════════════════════════════════════

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('[FoldC64] Service worker registered:', registration.scope);
    } catch (err) {
      console.warn('[FoldC64] Service worker registration failed:', err);
    }
  });
}

// Launch the app
const app = new FoldC64App();
app.init().catch((err) => {
  console.error('[FoldC64] Fatal initialization error:', err);
});
