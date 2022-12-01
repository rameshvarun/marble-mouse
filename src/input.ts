import { Vector2, MathUtils } from "three";
import * as log from "loglevel";

const GAMEPAD_DEADZONE = 0.15;
function appyDeadZone(value: number): number {
  if (Math.abs(value) < GAMEPAD_DEADZONE) return 0;
  return value;
}

const joystickArea = document.getElementById("joystick-area")!;
class VirtualJoystick {
  joystickCenter?: THREE.Vector2;

  joystickBase: HTMLImageElement;
  joystickNub: HTMLImageElement;

  joystickRadius: number;

  movement?: THREE.Vector2;

  constructor() {
    joystickArea.addEventListener(
      "touchstart",
      e => {
        let touch = e.touches[0];
        this.joystickCenter = new Vector2(touch.clientX, touch.clientY);

        this.joystickBase.style.visibility = "visible";

        this.joystickBase.style.left = this.joystickCenter.x + "px";
        this.joystickBase.style.top = this.joystickCenter.y + "px";

        e.preventDefault();
        e.stopImmediatePropagation();
      },
      { passive: false }
    );

    joystickArea.addEventListener(
      "touchmove",
      e => {
        let touch = e.touches[0];
        let touchVec = new Vector2(touch.clientX, touch.clientY);

        let diff = touchVec.clone().sub(this.joystickCenter!);
        if (diff.length() > this.joystickRadius) {
          diff.normalize().multiplyScalar(this.joystickRadius);
        }

        let nubPosition = this.joystickCenter!.clone().add(diff);

        this.joystickNub.style.visibility = "visible";
        this.joystickNub.style.left = nubPosition.x + "px";
        this.joystickNub.style.top = nubPosition.y + "px";

        this.movement = diff.clone().multiplyScalar(1 / this.joystickRadius);
        this.movement.y = -this.movement.y;

        e.preventDefault();
        e.stopImmediatePropagation();
      },
      { passive: false }
    );

    joystickArea.addEventListener(
      "touchend",
      e => {
        this.joystickCenter = undefined;
        this.movement = undefined;

        this.joystickBase.style.visibility = "hidden";
        this.joystickNub.style.visibility = "hidden";

        e.preventDefault();
        e.stopImmediatePropagation();
      },
      { passive: false }
    );

    joystickArea.innerHTML += `<img id='joystick-base' style="visibility:hidden; position: absolute; width:2in; transform: translate3d(-50%, -50%, 0); pointer-events: none;" src="${require("./assets/ui/joystick-base.svg")}"></img>`;
    joystickArea.innerHTML += `<img id='joystick-nub' style="visibility:hidden; position: absolute; width:0.5in; transform: translate3d(-50%, -50%, 0); pointer-events: none;" src="${require("./assets/ui/joystick-nub.svg")}"></img>`;

    this.joystickBase = document.getElementById(
      "joystick-base"
    )! as HTMLImageElement;
    this.joystickNub = document.getElementById(
      "joystick-nub"
    )! as HTMLImageElement;

    this.joystickRadius = this.joystickBase.offsetWidth / 2;
  }

  value(): THREE.Vector2 | null {
    if (this.movement) {
      return this.movement;
    }
    return null;
  }

  disable() {
    joystickArea.style.visibility = "hidden";
  }

  enable() {
    joystickArea.style.visibility = "visible";
  }
}

export const vj = new VirtualJoystick();

export class Input {
  previousPressedKeys: Map<string, boolean> = new Map();
  pressedKeys: Map<string, boolean> = new Map();

  previousGamepadInputs: Map<number, { buttons: Array<boolean> }> = new Map();

  update() {
    this.previousPressedKeys = new Map();
    for (let [key, value] of this.pressedKeys.entries()) {
      this.previousPressedKeys.set(key, value);
    }

    if (navigator.getGamepads) {
      this.previousGamepadInputs = new Map();

      for (let gamepad of navigator.getGamepads()) {
        if (!gamepad) continue;
        this.previousGamepadInputs.set(gamepad.index, {
          buttons: gamepad.buttons.map(b => b.pressed)
        });
      }
    }
  }

  constructor() {
    document.addEventListener(
      "keydown",
      event => {
        this.pressedKeys.set(event.key, true);

        event.preventDefault();
      },
      false
    );

    document.addEventListener(
      "keyup",
      event => {
        this.pressedKeys.set(event.key, false);

        event.preventDefault();
      },
      false
    );
  }

  cameraControl(xrSession): number {
    // Try to read keyboard input.
    let A = this.pressedKeys.get("a");
    let D = this.pressedKeys.get("d");

    if (A || D) {
      return (A ? -1 : 0) + (D ? 1 : 0);
    }

    // Try to read gamepad input.
    if (navigator.getGamepads) {
      for (let gamepad of navigator.getGamepads()) {
        if (!gamepad) continue;

        // Gamepad right thumbstick.
        if (gamepad.axes.length >= 3) {
          let x = appyDeadZone(gamepad.axes[2]);

          if (Math.abs(x) > 0) {
            return x;
          }
        }
      }
    }

    return 0;
  }

  movement(xrSession): THREE.Vector2 {
    // Try to read virtual joystick input.
    let vjValue = vj.value();
    if (vjValue) return vjValue;

    // Try to read keyboard input.
    let ArrowUp = this.pressedKeys.get("ArrowUp");
    let ArrowDown = this.pressedKeys.get("ArrowDown");
    let ArrowRight = this.pressedKeys.get("ArrowRight");
    let ArrowLeft = this.pressedKeys.get("ArrowLeft");

    if (ArrowUp || ArrowDown || ArrowLeft || ArrowRight) {
      let upDown = (ArrowUp ? 1 : 0) + (ArrowDown ? -1 : 0);
      let leftRight = (ArrowLeft ? -1 : 0) + (ArrowRight ? 1 : 0);
      return new Vector2(leftRight, upDown).normalize();
    }

    // Try to read gamepad input.
    if (navigator.getGamepads) {
      for (let gamepad of navigator.getGamepads()) {
        if (!gamepad) continue;

        // Gamepad left thumbstick.
        if (gamepad.axes.length >= 2) {
          let x = appyDeadZone(gamepad.axes[0]);
          let y = appyDeadZone(gamepad.axes[1]);

          if (Math.abs(x) > 0 || Math.abs(y) > 0) {
            return new Vector2(x, -y);
          }
        }

        // Gamepad D-pad.
        if (gamepad.buttons.length >= 16) {
          let up = gamepad.buttons[12].pressed;
          let down = gamepad.buttons[13].pressed;
          let left = gamepad.buttons[14].pressed;
          let right = gamepad.buttons[15].pressed;

          if (up || down || left || right) {
            let upDown = (up ? 1 : 0) + (down ? -1 : 0);
            let leftRight = (left ? -1 : 0) + (right ? 1 : 0);
            return new Vector2(leftRight, upDown).normalize();
          }
        }
      }
    }

    if (xrSession && xrSession.inputSources) {
      for (let inputSource of xrSession.inputSources) {
        let gamepad = inputSource.gamepad;
        if (!gamepad) continue;
        if (gamepad.mapping !== "xr-standard") continue;

        // Try to read thumbstick of this XR input device.
        if (gamepad.axes.length >= 4) {
          let x = appyDeadZone(gamepad.axes[2]);
          let y = appyDeadZone(gamepad.axes[3]);

          if (Math.abs(x) > 0 || Math.abs(y) > 0) {
            return new Vector2(x, -y);
          }
        }

        // TODO: Try to read trackpad.
      }
    }

    return new Vector2(0, 0);
  }

  select(): boolean {
    if (
      !this.previousPressedKeys.get("Enter") &&
      this.pressedKeys.get("Enter")
    ) {
      return true;
    }

    // Gamepad input.
    if (navigator.getGamepads) {
      for (let gamepad of navigator.getGamepads()) {
        if (!gamepad) continue;

        const previous = this.previousGamepadInputs.get(gamepad.index);
        if (!previous) continue;

        if (gamepad.buttons.length < 1 || previous.buttons.length < 1) continue;

        if (!previous.buttons[0] && gamepad.buttons[0].pressed) return true;
      }
    }

    return false;
  }

  skip(): boolean {
    if (vj.value()) return true;
    if (Array.from(this.pressedKeys.values()).some(b => b)) return true;

    if (navigator.getGamepads) {
      for (let gamepad of navigator.getGamepads()) {
        if (!gamepad) continue;

        if (gamepad.buttons.some(b => b.pressed)) return true;
      }
    }

    return false;
  }

  vibrate(intensity: number) {
    if (window.navigator.vibrate) {
      let time = MathUtils.mapLinear(intensity, 0, 1, 5, 150);
      log.debug(`Vibration time = ${time}...`);
      window.navigator.vibrate(time);
    }
  }

  pause(): boolean {
    if (
      !this.previousPressedKeys.get("Escape") &&
      this.pressedKeys.get("Escape")
    ) {
      return true;
    }

    if (
      !this.previousPressedKeys.get("SoftLeft") &&
      this.pressedKeys.get("SoftLeft")
    ) {
      return true;
    }

    // Gamepad input.
    if (navigator.getGamepads) {
      for (let gamepad of navigator.getGamepads()) {
        if (!gamepad) continue;

        const previous = this.previousGamepadInputs.get(gamepad.index);
        if (!previous) continue;

        if (gamepad.buttons.length < 10 || previous.buttons.length < 10)
          continue;

        if (!previous.buttons[9] && gamepad.buttons[9].pressed) return true;
      }
    }

    return false;
  }

  back(): boolean {
    if (
      !this.previousPressedKeys.get("Escape") &&
      this.pressedKeys.get("Escape")
    ) {
      return true;
    }

    if (
      !this.previousPressedKeys.get("SoftLeft") &&
      this.pressedKeys.get("SoftLeft")
    ) {
      return true;
    }

    // Gamepad input.
    if (navigator.getGamepads) {
      for (let gamepad of navigator.getGamepads()) {
        if (!gamepad) continue;

        const previous = this.previousGamepadInputs.get(gamepad.index);
        if (!previous) continue;

        if (gamepad.buttons.length < 2 || previous.buttons.length < 2) continue;

        if (!previous.buttons[1] && gamepad.buttons[1].pressed) return true;
      }
    }

    return false;
  }
}
export const input = new Input();
