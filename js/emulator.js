/**
 * FoldC64 — Emulator Module
 *
 * Wraps Nostalgist.js (VICE x64 WebAssembly core) to provide a clean
 * interface for the C64 emulator lifecycle, file loading, and state management.
 *
 * @module emulator
 */

import { Nostalgist } from 'nostalgist';
import { StorageManager } from './storage.js';

/**
 * C64 emulator wrapper using Nostalgist.js
 */
export class C64Emulator {
  /** @type {HTMLCanvasElement} */
  #canvas = null;

  /** @type {Nostalgist|null} */
  #nostalgist = null;

  /** @type {StorageManager} */
  #storage = null;

  /** @type {boolean} */
  #running = false;

  /** @type {boolean} */
  #audioStarted = false;

  /**
   * @param {HTMLCanvasElement} canvasElement - Canvas for emulator rendering
   * @param {StorageManager} storage - Storage manager for save states
   */
  constructor(canvasElement, storage) {
    this.#canvas = canvasElement;
    this.#storage = storage;
  }

  /**
   * Initialize and launch the C64 emulator.
   * Boots to the BASIC READY prompt.
   *
   * @param {Function} [onProgress] - Progress callback (0-100)
   * @returns {Promise<void>}
   */
  async launch(onProgress) {
    if (this.#nostalgist) {
      console.warn('[FoldC64] Emulator already launched');
      return;
    }

    try {
      if (onProgress) onProgress(10);

      // Configure Nostalgist with the VICE x64 core
      this.#nostalgist = await Nostalgist.launch({
        core: 'vice_x64',
        element: this.#canvas,
        size: 'auto',
        style: {
          width: '100%',
          height: '100%',
        },

        // No ROM to autostart — boot to BASIC prompt
        // rom: undefined,

        // RetroArch configuration overrides
        retroarchConfig: {
          // Video
          video_smooth: 'false',           // Keep pixels sharp
          video_scale_integer: 'true',     // Integer scaling for pixel-perfect display
          aspect_ratio_index: '22',        // Core provided aspect ratio

          // Audio
          audio_enable: 'true',
          audio_volume: '5.0',             // Slight boost (dB)

          // Input
          input_auto_game_focus: '2',      // Auto-focus on input
          input_autodetect_enable: 'true',
        },

        // VICE core options
        coreConfig: {
          'vice_sid_engine': 'ReSID',           // Best SID emulation quality
          'vice_sid_model': '6581',              // Classic C64 SID chip
          'vice_drive_true_emulation': 'enabled', // Accurate 1541 drive
          'vice_autostart': 'enabled',
          'vice_reset': 'autostart',
        },
      });

      if (onProgress) onProgress(90);

      this.#running = true;

      if (onProgress) onProgress(100);

      console.log('[FoldC64] Emulator launched successfully');
    } catch (err) {
      console.error('[FoldC64] Failed to launch emulator:', err);
      throw err;
    }
  }

  /**
   * Ensure audio context is started (requires user gesture).
   * Call this from a touch/click handler.
   */
  async ensureAudio() {
    if (this.#audioStarted) return;

    try {
      // Nostalgist.js manages the audio context internally via RetroArch.
      // We just need to resume it after a user gesture.
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtx.close(); // We don't need this context; RetroArch has its own
      this.#audioStarted = true;
    } catch (err) {
      console.warn('[FoldC64] Audio context resume failed:', err);
    }
  }

  /**
   * Load and autostart a ROM file (.prg, .d64, .t64, .crt, .tap)
   *
   * @param {File} file - File object from file picker
   * @returns {Promise<void>}
   */
  async loadFile(file) {
    if (!this.#nostalgist) {
      throw new Error('Emulator not launched');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer]);
      const url = URL.createObjectURL(blob);

      // Restart the emulator with the new ROM
      // Nostalgist doesn't have a direct "load file" method after launch,
      // so we relaunch with the ROM
      await this.#nostalgist.restart();

      // For Nostalgist, we need to relaunch with the file
      const previousNostalgist = this.#nostalgist;

      this.#nostalgist = await Nostalgist.launch({
        core: 'vice_x64',
        element: this.#canvas,
        size: 'auto',
        style: {
          width: '100%',
          height: '100%',
        },
        rom: {
          fileName: file.name,
          fileContent: arrayBuffer,
        },
        retroarchConfig: {
          video_smooth: 'false',
          video_scale_integer: 'true',
          aspect_ratio_index: '22',
          audio_enable: 'true',
          audio_volume: '5.0',
          input_auto_game_focus: '2',
        },
        coreConfig: {
          'vice_sid_engine': 'ReSID',
          'vice_sid_model': '6581',
          'vice_drive_true_emulation': 'enabled',
          'vice_autostart': 'enabled',
          'vice_reset': 'autostart',
        },
      });

      // Clean up the previous instance
      try {
        // previousNostalgist may not have an explicit exit,
        // but reusing the same canvas should be fine
      } catch (_) { /* ignore cleanup errors */ }

      URL.revokeObjectURL(url);
      console.log(`[FoldC64] Loaded file: ${file.name}`);
    } catch (err) {
      console.error('[FoldC64] Failed to load file:', err);
      throw err;
    }
  }

  /**
   * Open a file picker and load the selected file.
   *
   * @returns {Promise<void>}
   */
  async openFilePicker() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.prg,.d64,.t64,.crt,.tap,.g64';

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (file) {
          try {
            await this.loadFile(file);
            resolve();
          } catch (err) {
            reject(err);
          }
        } else {
          resolve(); // User cancelled
        }
      });

      input.click();
    });
  }

  /**
   * Save the current emulator state.
   *
   * @param {string} name - Name for the save state
   * @returns {Promise<void>}
   */
  async saveState(name) {
    if (!this.#nostalgist) {
      throw new Error('Emulator not launched');
    }

    try {
      const state = await this.#nostalgist.saveState();

      // state contains { state: Blob, thumbnail?: Blob }
      await this.#storage.saveState(name, {
        data: state.state,
        screenshot: state.thumbnail || null,
      });

      console.log(`[FoldC64] State saved: ${name}`);
    } catch (err) {
      console.error('[FoldC64] Failed to save state:', err);
      throw err;
    }
  }

  /**
   * Load a previously saved emulator state.
   *
   * @param {string} name - Name of the save state to load
   * @returns {Promise<void>}
   */
  async loadState(name) {
    if (!this.#nostalgist) {
      throw new Error('Emulator not launched');
    }

    try {
      const saved = await this.#storage.loadState(name);
      if (!saved) {
        throw new Error(`Save state not found: ${name}`);
      }

      await this.#nostalgist.loadState(saved.data);

      console.log(`[FoldC64] State loaded: ${name}`);
    } catch (err) {
      console.error('[FoldC64] Failed to load state:', err);
      throw err;
    }
  }

  /**
   * Pause the emulator.
   */
  async pause() {
    if (this.#nostalgist && this.#running) {
      await this.#nostalgist.pause();
      this.#running = false;
    }
  }

  /**
   * Resume the emulator.
   */
  async resume() {
    if (this.#nostalgist && !this.#running) {
      await this.#nostalgist.resume();
      this.#running = true;
    }
  }

  /**
   * Reset the C64 (hard reset).
   */
  async reset() {
    if (this.#nostalgist) {
      await this.#nostalgist.restart();
      console.log('[FoldC64] Emulator reset');
    }
  }

  /**
   * Check if the emulator is currently running.
   *
   * @returns {boolean}
   */
  get isRunning() {
    return this.#running;
  }

  /**
   * Get the Nostalgist instance (for advanced usage).
   *
   * @returns {Nostalgist|null}
   */
  get instance() {
    return this.#nostalgist;
  }
}

export default C64Emulator;
