/**
 * C64Keyboard Module
 * Generates and manages a virtual Commodore 64 keyboard for the FoldC64 PWA.
 * Dispatches standard KeyboardEvent to the emulator canvas for Nostalgist.js/RetroArch compatibility.
 */

// C64 Key Mapping to PC standard KeyboardEvent values
const keyMappings = {
  'ARROWLEFT': { code: 'Delete', key: 'Delete', keyCode: 46 },
  '1': { code: 'Digit1', key: '1', keyCode: 49 },
  '2': { code: 'Digit2', key: '2', keyCode: 50 },
  '3': { code: 'Digit3', key: '3', keyCode: 51 },
  '4': { code: 'Digit4', key: '4', keyCode: 52 },
  '5': { code: 'Digit5', key: '5', keyCode: 53 },
  '6': { code: 'Digit6', key: '6', keyCode: 54 },
  '7': { code: 'Digit7', key: '7', keyCode: 55 },
  '8': { code: 'Digit8', key: '8', keyCode: 56 },
  '9': { code: 'Digit9', key: '9', keyCode: 57 },
  '0': { code: 'Digit0', key: '0', keyCode: 48 },
  '+': { code: 'Equal', key: '=', keyCode: 187 },
  '-': { code: 'Minus', key: '-', keyCode: 189 },
  '£': { code: 'Insert', key: 'Insert', keyCode: 45 },
  'CLR/HOME': { code: 'Home', key: 'Home', keyCode: 36 },
  'INST/DEL': { code: 'Backspace', key: 'Backspace', keyCode: 8 },

  'CTRL': { code: 'ControlLeft', key: 'Control', keyCode: 17 },
  'Q': { code: 'KeyQ', key: 'q', keyCode: 81 },
  'W': { code: 'KeyW', key: 'w', keyCode: 87 },
  'E': { code: 'KeyE', key: 'e', keyCode: 69 },
  'R': { code: 'KeyR', key: 'r', keyCode: 82 },
  'T': { code: 'KeyT', key: 't', keyCode: 84 },
  'Y': { code: 'KeyY', key: 'y', keyCode: 89 },
  'U': { code: 'KeyU', key: 'u', keyCode: 85 },
  'I': { code: 'KeyI', key: 'i', keyCode: 73 },
  'O': { code: 'KeyO', key: 'o', keyCode: 79 },
  'P': { code: 'KeyP', key: 'p', keyCode: 80 },
  '@': { code: 'BracketLeft', key: '[', keyCode: 219 },
  '*': { code: 'BracketRight', key: ']', keyCode: 221 },
  'UPARROW': { code: 'Backquote', key: '`', keyCode: 192 },
  'RESTORE': { code: 'PageUp', key: 'PageUp', keyCode: 33 },

  'RUN/STOP': { code: 'Escape', key: 'Escape', keyCode: 27 },
  'SHIFT LOCK': { code: 'CapsLock', key: 'CapsLock', keyCode: 20 },
  'A': { code: 'KeyA', key: 'a', keyCode: 65 },
  'S': { code: 'KeyS', key: 's', keyCode: 83 },
  'D': { code: 'KeyD', key: 'd', keyCode: 68 },
  'F': { code: 'KeyF', key: 'f', keyCode: 70 },
  'G': { code: 'KeyG', key: 'g', keyCode: 71 },
  'H': { code: 'KeyH', key: 'h', keyCode: 72 },
  'J': { code: 'KeyJ', key: 'j', keyCode: 74 },
  'K': { code: 'KeyK', key: 'k', keyCode: 75 },
  'L': { code: 'KeyL', key: 'l', keyCode: 76 },
  ':': { code: 'Semicolon', key: ';', keyCode: 186 },
  ';': { code: 'Quote', key: '\'', keyCode: 222 },
  '=': { code: 'Backslash', key: '\\', keyCode: 220 },
  'RETURN': { code: 'Enter', key: 'Enter', keyCode: 13 },

  'C=': { code: 'Tab', key: 'Tab', keyCode: 9 },
  'LEFT SHIFT': { code: 'ShiftLeft', key: 'Shift', keyCode: 16 },
  'Z': { code: 'KeyZ', key: 'z', keyCode: 90 },
  'X': { code: 'KeyX', key: 'x', keyCode: 88 },
  'C': { code: 'KeyC', key: 'c', keyCode: 67 },
  'V': { code: 'KeyV', key: 'v', keyCode: 86 },
  'B': { code: 'KeyB', key: 'b', keyCode: 66 },
  'N': { code: 'KeyN', key: 'n', keyCode: 78 },
  'M': { code: 'KeyM', key: 'm', keyCode: 77 },
  ',': { code: 'Comma', key: ',', keyCode: 188 },
  '.': { code: 'Period', key: '.', keyCode: 190 },
  '/': { code: 'Slash', key: '/', keyCode: 191 },
  'RIGHT SHIFT': { code: 'ShiftRight', key: 'Shift', keyCode: 16 },
  'CRSR UD': { code: 'ArrowDown', key: 'ArrowDown', keyCode: 40 },
  'CRSR LR': { code: 'ArrowRight', key: 'ArrowRight', keyCode: 39 },

  'SPACE': { code: 'Space', key: ' ', keyCode: 32 },

  'F1': { code: 'F1', key: 'F1', keyCode: 112 },
  'F3': { code: 'F3', key: 'F3', keyCode: 114 },
  'F5': { code: 'F5', key: 'F5', keyCode: 116 },
  'F7': { code: 'F7', key: 'F7', keyCode: 118 }
};

// C64 Keyboard Layout Definition
const c64Layout = [
  // Row 0
  [{ id: 'ARROWLEFT', main: '←' }, { id: '1', main: '1', sub: '!' }, { id: '2', main: '2', sub: '"' }, { id: '3', main: '3', sub: '#' }, { id: '4', main: '4', sub: '$' }, { id: '5', main: '5', sub: '%' }, { id: '6', main: '6', sub: '&' }, { id: '7', main: '7', sub: "'" }, { id: '8', main: '8', sub: '(' }, { id: '9', main: '9', sub: ')' }, { id: '0', main: '0' }, { id: '+', main: '+', sub: '+' }, { id: '-', main: '-', sub: '−' }, { id: '£', main: '£' }, { id: 'CLR/HOME', main: 'CLR', sub: 'HOME', class: 'special-key' }, { id: 'INST/DEL', main: 'INST', sub: 'DEL', class: 'special-key' }],
  // Row 1
  [{ id: 'CTRL', main: 'CTRL', class: 'special-key' }, { id: 'Q', main: 'Q' }, { id: 'W', main: 'W' }, { id: 'E', main: 'E' }, { id: 'R', main: 'R' }, { id: 'T', main: 'T' }, { id: 'Y', main: 'Y' }, { id: 'U', main: 'U' }, { id: 'I', main: 'I' }, { id: 'O', main: 'O' }, { id: 'P', main: 'P' }, { id: '@', main: '@' }, { id: '*', main: '*' }, { id: 'UPARROW', main: '↑', sub: 'π' }, { id: 'RESTORE', main: 'RESTORE', class: 'special-key' }],
  // Row 2
  [{ id: 'RUN/STOP', main: 'RUN', sub: 'STOP', class: 'special-key' }, { id: 'SHIFT LOCK', main: 'SHIFT', sub: 'LOCK', class: 'special-key' }, { id: 'A', main: 'A' }, { id: 'S', main: 'S' }, { id: 'D', main: 'D' }, { id: 'F', main: 'F' }, { id: 'G', main: 'G' }, { id: 'H', main: 'H' }, { id: 'J', main: 'J' }, { id: 'K', main: 'K' }, { id: 'L', main: 'L' }, { id: ':', main: ':', sub: '[' }, { id: ';', main: ';', sub: ']' }, { id: '=', main: '=' }, { id: 'RETURN', main: 'RETURN', class: 'special-key' }],
  // Row 3
  [{ id: 'C=', main: 'C=' }, { id: 'LEFT SHIFT', main: 'SHIFT', class: 'special-key' }, { id: 'Z', main: 'Z' }, { id: 'X', main: 'X' }, { id: 'C', main: 'C' }, { id: 'V', main: 'V' }, { id: 'B', main: 'B' }, { id: 'N', main: 'N' }, { id: 'M', main: 'M' }, { id: ',', main: ',', sub: '<' }, { id: '.', main: '.', sub: '>' }, { id: '/', main: '/', sub: '?' }, { id: 'RIGHT SHIFT', main: 'SHIFT', class: 'special-key' }, { id: 'CRSR UD', main: 'CRSR', sub: '↕', class: 'special-key' }, { id: 'CRSR LR', main: 'CRSR', sub: '↔', class: 'special-key' }],
  // Row 4
  [{ id: 'SPACE', main: ' ', class: 'space-key' }]
];

const functionKeys = [
  { id: 'F1', main: 'F1', sub: 'F2', class: 'fn-key' },
  { id: 'F3', main: 'F3', sub: 'F4', class: 'fn-key' },
  { id: 'F5', main: 'F5', sub: 'F6', class: 'fn-key' },
  { id: 'F7', main: 'F7', sub: 'F8', class: 'fn-key' }
];

export class C64Keyboard {
  /**
   * Initialize the C64 Keyboard instance
   * @param {HTMLElement} containerElement - DOM element to render keyboard into
   * @param {HTMLElement} canvasElement - The emulator canvas to dispatch key events to
   */
  constructor(containerElement, canvasElement) {
    this.container = containerElement;
    this.canvas = canvasElement;
    this.activeKeys = new Map(); // Tracks keys currently pressed (pointer/touch id -> keyId)
    this.shiftLockActive = false;

    // Bound event listeners for cleanup
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this.preventGestures = this.preventGestures.bind(this);
  }

  /**
   * Build DOM, attach events
   */
  init() {
    this.render();
    this.attachEvents();
  }

  /**
   * Cleanup event listeners and DOM
   */
  destroy() {
    this.detachEvents();
    if (this.keyboardWrapper) {
      this.keyboardWrapper.remove();
    }
  }

  /**
   * Render the C64 keyboard DOM structure
   */
  render() {
    this.keyboardWrapper = document.createElement('div');
    this.keyboardWrapper.className = 'c64-keyboard';
    
    // Main Keys Container
    const mainGrid = document.createElement('div');
    mainGrid.className = 'c64-main-grid';
    
    c64Layout.forEach((row, rowIndex) => {
      const rowEl = document.createElement('div');
      rowEl.className = `c64-row c64-row-${rowIndex}`;
      
      row.forEach(keyDef => {
        const btn = this.createKeyElement(keyDef);
        rowEl.appendChild(btn);
      });
      mainGrid.appendChild(rowEl);
    });

    // Function Keys Container
    const fnGrid = document.createElement('div');
    fnGrid.className = 'c64-fn-grid';
    functionKeys.forEach(keyDef => {
      const btn = this.createKeyElement(keyDef);
      fnGrid.appendChild(btn);
    });

    this.keyboardWrapper.appendChild(mainGrid);
    this.keyboardWrapper.appendChild(fnGrid);
    this.container.appendChild(this.keyboardWrapper);
  }

  /**
   * Create an individual key button element
   * @param {Object} keyDef - The key definition object
   * @returns {HTMLElement} The created button element
   */
  createKeyElement(keyDef) {
    const btn = document.createElement('button');
    btn.className = 'c64-key';
    if (keyDef.class) {
      btn.classList.add(...keyDef.class.split(' '));
    }
    btn.setAttribute('data-c64-key', keyDef.id);

    const mainLabel = document.createElement('span');
    mainLabel.className = 'key-label';
    mainLabel.textContent = keyDef.main;
    btn.appendChild(mainLabel);

    if (keyDef.sub) {
      const subLabel = document.createElement('span');
      subLabel.className = 'key-sublabel';
      subLabel.textContent = keyDef.sub;
      btn.appendChild(subLabel);
    }

    return btn;
  }

  /**
   * Attach global pointer/touch events to the keyboard wrapper
   */
  attachEvents() {
    // Prevent default touch behaviors like scrolling and zooming
    this.keyboardWrapper.addEventListener('touchstart', this.preventGestures, { passive: false });
    this.keyboardWrapper.addEventListener('touchmove', this.preventGestures, { passive: false });
    
    // Use pointer events for unified mouse/touch handling
    this.keyboardWrapper.addEventListener('pointerdown', this.handlePointerDown);
    this.keyboardWrapper.addEventListener('pointerup', this.handlePointerUp);
    this.keyboardWrapper.addEventListener('pointermove', this.handlePointerMove);
    this.keyboardWrapper.addEventListener('pointercancel', this.handlePointerCancel);
    this.keyboardWrapper.addEventListener('pointerleave', this.handlePointerCancel);
  }

  detachEvents() {
    this.keyboardWrapper.removeEventListener('touchstart', this.preventGestures);
    this.keyboardWrapper.removeEventListener('touchmove', this.preventGestures);
    this.keyboardWrapper.removeEventListener('pointerdown', this.handlePointerDown);
    this.keyboardWrapper.removeEventListener('pointerup', this.handlePointerUp);
    this.keyboardWrapper.removeEventListener('pointermove', this.handlePointerMove);
    this.keyboardWrapper.removeEventListener('pointercancel', this.handlePointerCancel);
    this.keyboardWrapper.removeEventListener('pointerleave', this.handlePointerCancel);
  }

  preventGestures(e) {
    e.preventDefault();
  }

  /**
   * Dispatches a keyboard event to the canvas
   */
  dispatchCanvasKeyEvent(type, keyId) {
    const mapping = keyMappings[keyId];
    if (!mapping) return;

    const event = new KeyboardEvent(type, {
      key: mapping.key,
      code: mapping.code,
      keyCode: mapping.keyCode,
      which: mapping.keyCode,
      bubbles: true,
      cancelable: true,
      // Pass shift key modifier state if shift lock is active
      shiftKey: this.shiftLockActive
    });
    
    this.canvas.dispatchEvent(event);
  }

  /**
   * Handle key press down
   */
  pressKey(keyId, pointerId, element) {
    // Avoid double pressing if already active by another pointer
    let isAlreadyPressed = false;
    for (const [id, activeKeyId] of this.activeKeys.entries()) {
      if (activeKeyId === keyId && id !== pointerId) {
        isAlreadyPressed = true;
        break;
      }
    }

    this.activeKeys.set(pointerId, keyId);

    if (!isAlreadyPressed) {
      if (keyId === 'SHIFT LOCK') {
        this.toggleShiftLock(element);
      } else {
        element.classList.add('pressed');
        this.dispatchCanvasKeyEvent('keydown', keyId);
      }
    }
  }

  /**
   * Handle key release
   */
  releaseKey(keyId, pointerId) {
    this.activeKeys.delete(pointerId);

    // Only release visually and emit keyup if no other pointer is pressing this key
    let isStillPressed = false;
    for (const activeKeyId of this.activeKeys.values()) {
      if (activeKeyId === keyId) {
        isStillPressed = true;
        break;
      }
    }

    if (!isStillPressed && keyId !== 'SHIFT LOCK') {
      const element = this.keyboardWrapper.querySelector(`[data-c64-key="${keyId}"]`);
      if (element) {
        element.classList.remove('pressed');
      }
      this.dispatchCanvasKeyEvent('keyup', keyId);
    }
  }

  /**
   * Handle SHIFT LOCK toggle
   */
  toggleShiftLock(element) {
    this.shiftLockActive = !this.shiftLockActive;
    
    if (this.shiftLockActive) {
      element.classList.add('locked');
      this.dispatchCanvasKeyEvent('keydown', 'LEFT SHIFT');
    } else {
      element.classList.remove('locked');
      this.dispatchCanvasKeyEvent('keyup', 'LEFT SHIFT');
    }
  }

  // --- Pointer Event Handlers ---

  handlePointerDown(e) {
    const keyElement = e.target.closest('.c64-key');
    if (!keyElement) return;

    // Capture the pointer to this key to track it even if it moves slightly outside
    try { keyElement.setPointerCapture(e.pointerId); } catch(err) {}
    
    const keyId = keyElement.getAttribute('data-c64-key');
    if (keyId) {
      this.pressKey(keyId, e.pointerId, keyElement);
    }
  }

  handlePointerUp(e) {
    const keyElement = e.target.closest('.c64-key');
    const keyId = this.activeKeys.get(e.pointerId);
    
    if (keyElement) {
      try { keyElement.releasePointerCapture(e.pointerId); } catch(err) {}
    }

    if (keyId) {
      this.releaseKey(keyId, e.pointerId);
    }
  }

  handlePointerMove(e) {
    // If a pointer is down, track if it slides off the key
    const currentKeyId = this.activeKeys.get(e.pointerId);
    if (!currentKeyId) return;

    // Find what element we're hovering over right now
    // Pointer capture makes target always the original element, so we must use elementFromPoint
    const elementUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
    const keyUnderPointer = elementUnderPointer ? elementUnderPointer.closest('.c64-key') : null;
    const newKeyId = keyUnderPointer ? keyUnderPointer.getAttribute('data-c64-key') : null;

    if (currentKeyId !== newKeyId) {
      // Slid off the current key
      this.releaseKey(currentKeyId, e.pointerId);
      
      // Slid onto a new key
      if (newKeyId && keyUnderPointer) {
        this.pressKey(newKeyId, e.pointerId, keyUnderPointer);
      }
    }
  }

  handlePointerCancel(e) {
    const keyId = this.activeKeys.get(e.pointerId);
    if (keyId) {
      this.releaseKey(keyId, e.pointerId);
    }
  }
}

export default C64Keyboard;
