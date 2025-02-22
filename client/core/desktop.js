import {
  Euler,
  Raycaster,
  Vector2,
  Vector3,
} from './three.js';

// Player desktop controls

class DesktopControls {
  constructor({ camera, renderer, xr }) {
    this.isDesktop = true;
    this.aux = {
      center: new Vector2(),
      direction: new Vector3(),
      euler: new Euler(0, 0, 0, 'YXZ'),
      forward: new Vector3(),
      right: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
    };
    this.brush = {
      type: 0,
      size: 1,
    };
    this.buttons = {
      primary: false,
      secondary: false,
      tertiary: false,
    };
    this.buttonState = { ...this.buttons };
    this.camera = camera;
    this.keyboard = new Vector3(0, 0, 0);
    this.pointer = new Vector2(0, 0);
    this.raycaster = new Raycaster();
    this.raycaster.far = 32;
    this.renderer = renderer;
    this.speed = 6;
    this.xr = xr;
    this.onBlur = this.onBlur.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseWheel = this.onMouseWheel.bind(this);
    this.onPointerLock = this.onPointerLock.bind(this);
    this.requestPointerLock = this.requestPointerLock.bind(this);
    window.addEventListener('blur', this.onBlur, false);
    document.addEventListener('keydown', this.onKeyDown, false);
    document.addEventListener('keyup', this.onKeyUp, false);
    document.addEventListener('mousedown', this.onMouseDown, false);
    document.addEventListener('mousemove', this.onMouseMove, false);
    document.addEventListener('mouseup', this.onMouseUp, false);
    document.addEventListener('mousewheel', this.onMouseWheel, false);
    document.addEventListener('pointerlockchange', this.onPointerLock, false);
    renderer.addEventListener('mousedown', this.requestPointerLock, false);
  }

  dispose() {
    const { isLocked, renderer } = this;
    document.body.classList.remove('pointerlock');
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    renderer.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousewheel', this.onMouseWheel);
    document.removeEventListener('pointerlockchange', this.onPointerLock);
    if (isLocked) {
      document.exitPointerLock();
    }
  }

  onAnimationTick({ animation: { delta }, player }) {
    const {
      aux,
      buttons,
      buttonState,
      camera,
      keyboard,
      isLocked,
      pointer,
      raycaster,
      speed,
      xr,
    } = this;
    if (!isLocked) {
      return;
    }
    if (xr.enabled && xr.isPresenting) {
      document.exitPointerLock();
      return;
    }
    if (pointer.x !== 0 || pointer.y !== 0) {
      const { euler } = this.aux;
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= pointer.x * 0.003;
      euler.x -= pointer.y * 0.003;
      const PI_2 = Math.PI / 2;
      euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
      camera.quaternion.setFromEuler(euler);
      pointer.set(0, 0);
    }
    if (keyboard.x !== 0 || keyboard.y !== 0 || keyboard.z !== 0) {
      const {
        direction,
        forward,
        right,
        worldUp,
      } = this.aux;
      camera.getWorldDirection(forward);
      right.crossVectors(forward, worldUp);
      player.move(
        direction
          .set(0, 0, 0)
          .addScaledVector(right, keyboard.x)
          .addScaledVector(worldUp, keyboard.y)
          .addScaledVector(forward, keyboard.z)
          .normalize()
          .multiplyScalar(delta * speed)
      );
    }
    ['primary', 'secondary', 'tertiary'].forEach((button) => {
      const state = buttonState[button];
      buttons[`${button}Down`] = state && buttons[button] !== state;
      buttons[`${button}Up`] = !state && buttons[button] !== state;
      buttons[button] = state;
    });
    raycaster.setFromCamera(aux.center, camera);
  }

  onBlur() {
    const { buttonState, keyboard } = this;
    buttonState.primary = false;
    buttonState.secondary = false;
    buttonState.tertiary = false;
    this.buttons = { ...buttonState };
    keyboard.set(0, 0, 0);
  }

  onKeyDown({ keyCode, repeat }) {
    const { brush, keyboard } = this;
    if (repeat) return;
    switch (keyCode) {
      case 16:
        keyboard.y = -1;
        break;
      case 32:
        keyboard.y = 1;
        break;
      case 87:
        keyboard.z = 1;
        break;
      case 83:
        keyboard.z = -1;
        break;
      case 65:
        keyboard.x = -1;
        break;
      case 68:
        keyboard.x = 1;
        break;
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
        brush.type = keyCode - 49;
        brush.needsUpdate = true;
        break;
      default:
        break;
    }
  }

  onKeyUp({ keyCode, repeat }) {
    const { keyboard } = this;
    if (repeat) return;
    switch (keyCode) {
      case 16:
      case 32:
        keyboard.y = 0;
        break;
      case 87:
      case 83:
        keyboard.z = 0;
        break;
      case 65:
      case 68:
        keyboard.x = 0;
        break;
      default:
        break;
    }
  }

  onMouseDown({ button }) {
    const { buttonState, isLocked } = this;
    if (!isLocked) {
      return;
    }
    switch (button) {
      case 0:
        buttonState.primary = true;
        break;
      case 1:
        buttonState.tertiary = true;
        break;
      case 2:
        buttonState.secondary = true;
        break;
      default:
        break;
    }
  }

  onMouseMove({ movementX, movementY }) {
    const { isLocked, pointer } = this;
    if (!isLocked) {
      return;
    }
    pointer.set(movementX, movementY);
  }

  onMouseUp({ button }) {
    const { buttonState, isLocked } = this;
    if (!isLocked) {
      return;
    }
    switch (button) {
      case 0:
        buttonState.primary = false;
        break;
      case 1:
        buttonState.tertiary = false;
        break;
      case 2:
        buttonState.secondary = false;
        break;
      default:
        break;
    }
  }

  onMouseWheel({ deltaY }) {
    const { brush } = this;
    if (!brush.needsUpdate) {
      brush.size = Math.min(Math.max(brush.size + (deltaY < 0 ? 1 : -1), 1), 5);
      brush.needsUpdate = true;
    }
  }

  onPointerLock() {
    this.isLocked = !!document.pointerLockElement;
    document.body.classList[this.isLocked ? 'add' : 'remove']('pointerlock');
    if (!this.isLocked) {
      this.onBlur();
    }
  }

  requestPointerLock() {
    const { isLocked, xr } = this;
    if (isLocked || (xr.enabled && xr.isPresenting)) {
      return;
    }
    document.body.requestPointerLock();
  }

  reset() {
    this.camera.rotation.set(0, 0, 0);
    this.speed = 6;
  }
}

export default DesktopControls;
