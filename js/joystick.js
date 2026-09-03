/**
 * @file joystick.js
 * @description Virtual joystick module for C64 game control.
 */

export class C64Joystick {
  /**
   * @param {HTMLElement} containerElement - The element to render the joystick into.
   * @param {HTMLElement} canvasElement - The canvas element to send keyboard events to.
   */
  constructor(containerElement, canvasElement) {
    this.containerElement = containerElement;
    this.canvasElement = canvasElement;
    this.port = 2; // Default to port 2
    this.activeKeys = new Set();
    this.joystickTouchId = null;
    this.fireTouchId = null;
    this.baseRadius = 100; // Half of ~200px
    this.knobRadius = 40;  // Half of ~80px
    this.deadZoneRadius = this.baseRadius * 0.2; // 20% deadzone
    
    // Binding methods
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleFireTouchStart = this.handleFireTouchStart.bind(this);
    this.handleFireTouchEnd = this.handleFireTouchEnd.bind(this);
  }

  init() {
    this.createDOM();
    this.attachEventListeners();
  }

  createDOM() {
    this.view = document.createElement('div');
    this.view.className = 'joystick-view';
    this.view.style.display = 'flex';
    this.view.style.justifyContent = 'space-between';
    this.view.style.alignItems = 'center';
    this.view.style.padding = '20px';
    this.view.style.userSelect = 'none';

    // Port Selector
    const portSelector = document.createElement('div');
    portSelector.className = 'port-selector';
    portSelector.style.position = 'absolute';
    portSelector.style.top = '10px';
    portSelector.style.left = '50%';
    portSelector.style.transform = 'translateX(-50%)';
    portSelector.innerHTML = `
      <button id="port1-btn" style="padding: 5px 10px;">PORT 1</button>
      <button id="port2-btn" style="padding: 5px 10px; font-weight: bold;">PORT 2</button>
    `;
    this.view.appendChild(portSelector);

    // Joystick Area
    this.joystickArea = document.createElement('div');
    this.joystickArea.className = 'joystick-area';
    this.joystickArea.style.position = 'relative';
    this.joystickArea.style.width = '200px';
    this.joystickArea.style.height = '200px';
    
    this.joystickBase = document.createElement('div');
    this.joystickBase.className = 'joystick-base';
    this.joystickBase.style.width = '100%';
    this.joystickBase.style.height = '100%';
    this.joystickBase.style.borderRadius = '50%';
    this.joystickBase.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    this.joystickBase.style.position = 'absolute';
    this.joystickBase.style.border = '2px solid rgba(255, 255, 255, 0.4)';

    this.joystickKnob = document.createElement('div');
    this.joystickKnob.className = 'joystick-stick';
    this.joystickKnob.style.width = '80px';
    this.joystickKnob.style.height = '80px';
    this.joystickKnob.style.borderRadius = '50%';
    this.joystickKnob.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    this.joystickKnob.style.position = 'absolute';
    this.joystickKnob.style.top = '60px'; // (200 - 80) / 2
    this.joystickKnob.style.left = '60px';

    this.joystickArea.appendChild(this.joystickBase);
    this.joystickArea.appendChild(this.joystickKnob);
    this.view.appendChild(this.joystickArea);

    // Fire Button Area
    this.fireArea = document.createElement('div');
    this.fireArea.className = 'fire-area';

    this.fireButton = document.createElement('div');
    this.fireButton.className = 'fire-button';
    this.fireButton.style.width = '100px';
    this.fireButton.style.height = '100px';
    this.fireButton.style.borderRadius = '50%';
    this.fireButton.style.backgroundColor = 'red';
    this.fireButton.style.display = 'flex';
    this.fireButton.style.justifyContent = 'center';
    this.fireButton.style.alignItems = 'center';
    this.fireButton.style.color = 'white';
    this.fireButton.style.fontWeight = 'bold';
    this.fireButton.textContent = 'FIRE';

    this.fireArea.appendChild(this.fireButton);
    this.view.appendChild(this.fireArea);

    this.containerElement.appendChild(this.view);

    // Port button events
    const p1Btn = portSelector.querySelector('#port1-btn');
    const p2Btn = portSelector.querySelector('#port2-btn');
    
    p1Btn.addEventListener('click', () => {
      this.setPort(1);
      p1Btn.style.fontWeight = 'bold';
      p2Btn.style.fontWeight = 'normal';
    });
    
    p2Btn.addEventListener('click', () => {
      this.setPort(2);
      p2Btn.style.fontWeight = 'bold';
      p1Btn.style.fontWeight = 'normal';
    });
  }

  attachEventListeners() {
    this.joystickArea.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.joystickArea.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.joystickArea.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.joystickArea.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });

    this.fireButton.addEventListener('touchstart', this.handleFireTouchStart, { passive: false });
    this.fireButton.addEventListener('touchend', this.handleFireTouchEnd, { passive: false });
    this.fireButton.addEventListener('touchcancel', this.handleFireTouchEnd, { passive: false });
  }

  setPort(port) {
    this.port = port;
    this.releaseAllKeys();
  }

  /**
   * Helper to dispatch keyboard events to the canvas
   */
  dispatchKey(type, code, key) {
    const event = new KeyboardEvent(type, {
      code: code,
      key: key,
      bubbles: true,
      cancelable: true
    });
    this.canvasElement.dispatchEvent(event);
  }

  updateKeys(newKeys) {
    // Release keys not in newKeys
    for (const keyObj of this.activeKeys) {
      // Don't release Fire key from joystick area (handled separately)
      if (keyObj.code === 'KeyX') continue;
      
      if (!newKeys.some(k => k.code === keyObj.code)) {
        this.dispatchKey('keyup', keyObj.code, keyObj.key);
        this.activeKeys.delete(keyObj);
      }
    }
    
    // Press keys in newKeys that aren't currently active
    for (const newKey of newKeys) {
      let isAlreadyActive = false;
      for (const activeKey of this.activeKeys) {
        if (activeKey.code === newKey.code) {
          isAlreadyActive = true;
          break;
        }
      }
      if (!isAlreadyActive) {
        this.dispatchKey('keydown', newKey.code, newKey.key);
        this.activeKeys.add(newKey);
      }
    }
  }

  releaseAllKeys() {
    for (const keyObj of Array.from(this.activeKeys)) {
      this.dispatchKey('keyup', keyObj.code, keyObj.key);
    }
    this.activeKeys.clear();
  }

  handleTouchStart(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (this.joystickTouchId === null) {
        this.joystickTouchId = e.changedTouches[i].identifier;
        this.processJoystickTouch(e.changedTouches[i]);
        break;
      }
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.joystickTouchId) {
        this.processJoystickTouch(e.changedTouches[i]);
        break;
      }
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.resetJoystickPos();
        this.updateKeys([]); // release joystick keys
        break;
      }
    }
  }

  processJoystickTouch(touch) {
    const rect = this.joystickArea.getBoundingClientRect();
    const centerX = rect.left + this.baseRadius;
    const centerY = rect.top + this.baseRadius;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Clamp visual stick position
    let visualX = dx;
    let visualY = dy;
    const maxDist = this.baseRadius - this.knobRadius;
    if (distance > maxDist) {
      visualX = (dx / distance) * maxDist;
      visualY = (dy / distance) * maxDist;
    }
    
    this.joystickKnob.style.transform = `translate(${visualX}px, ${visualY}px)`;
    
    // Process input directions
    const newKeys = [];
    if (distance > this.deadZoneRadius) {
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      // Determine 8 directions
      if (angle >= -112.5 && angle < -67.5) {
        newKeys.push({ code: 'ArrowUp', key: 'ArrowUp' });
      } else if (angle >= -67.5 && angle < -22.5) {
        newKeys.push({ code: 'ArrowUp', key: 'ArrowUp' });
        newKeys.push({ code: 'ArrowRight', key: 'ArrowRight' });
      } else if (angle >= -22.5 && angle < 22.5) {
        newKeys.push({ code: 'ArrowRight', key: 'ArrowRight' });
      } else if (angle >= 22.5 && angle < 67.5) {
        newKeys.push({ code: 'ArrowDown', key: 'ArrowDown' });
        newKeys.push({ code: 'ArrowRight', key: 'ArrowRight' });
      } else if (angle >= 67.5 && angle < 112.5) {
        newKeys.push({ code: 'ArrowDown', key: 'ArrowDown' });
      } else if (angle >= 112.5 && angle < 157.5) {
        newKeys.push({ code: 'ArrowDown', key: 'ArrowDown' });
        newKeys.push({ code: 'ArrowLeft', key: 'ArrowLeft' });
      } else if (angle >= 157.5 || angle < -157.5) {
        newKeys.push({ code: 'ArrowLeft', key: 'ArrowLeft' });
      } else if (angle >= -157.5 && angle < -112.5) {
        newKeys.push({ code: 'ArrowUp', key: 'ArrowUp' });
        newKeys.push({ code: 'ArrowLeft', key: 'ArrowLeft' });
      }
    }
    
    this.updateKeys(newKeys);
  }

  resetJoystickPos() {
    this.joystickKnob.style.transform = 'translate(0px, 0px)';
  }

  handleFireTouchStart(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (this.fireTouchId === null) {
        this.fireTouchId = e.changedTouches[i].identifier;
        this.fireButton.style.backgroundColor = 'darkred';
        this.dispatchKey('keydown', 'KeyX', 'x');
        // Add to active keys to track state internally
        let alreadyActive = false;
        for (const k of this.activeKeys) {
            if (k.code === 'KeyX') alreadyActive = true;
        }
        if (!alreadyActive) this.activeKeys.add({ code: 'KeyX', key: 'x' });
        break;
      }
    }
  }

  handleFireTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.fireTouchId) {
        this.fireTouchId = null;
        this.fireButton.style.backgroundColor = 'red';
        
        let toRemove = null;
        for (const keyObj of this.activeKeys) {
          if (keyObj.code === 'KeyX') {
            toRemove = keyObj;
            break;
          }
        }
        if (toRemove) {
          this.activeKeys.delete(toRemove);
          this.dispatchKey('keyup', 'KeyX', 'x');
        }
        break;
      }
    }
  }

  destroy() {
    this.releaseAllKeys();
    if (this.view && this.view.parentNode) {
      this.view.parentNode.removeChild(this.view);
    }
  }
}
