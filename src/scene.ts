import * as THREE from "three";
import { DEBUG } from "./debug-mode";
import Game from "./game";
import * as log from "loglevel";
import { Color, MathUtils } from "three";
import { irisWipeIn, irisWipeOut } from "./transition";
import { getGraphicsOptions } from "./options";
import { LightProbeHelper } from "three/examples/jsm/helpers/LightProbeHelper";

export default class Scene {
  scene: THREE.Scene = new THREE.Scene();

  camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  game: Game;
  renderer: THREE.WebGLRenderer;

  constructor(game: Game) {
    this.game = game;
    this.renderer = game.renderer;
    this.onResize(window.innerWidth, window.innerHeight);
  }

  onResize(width: number, height: number) {
    if (height > width) {
      let verticalFOV = MathUtils.clamp((height / width) * 45, 75, 100);
      log.debug(`Vertical FOV: ${verticalFOV}...`);
      this.camera.fov = verticalFOV;
    } else {
      let horizontalFOV = MathUtils.clamp((width / height) * 75, 0, 130);
      log.debug(`Horizontal FOV: ${horizontalFOV}...`);
      this.camera.fov = (height / width) * horizontalFOV;
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number) {
    throw new Error(`Scene.update unimplemented.`);
  }
  draw() {
    throw new Error(`Scene.draw unimplemented.`);
  }

  onPause() {}

  onEnter() {}
  onLeave() {}

  directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(
    0xffffff,
    3.5
  );
  directionalLightOffset: THREE.Vector3 = new THREE.Vector3(
    0.4,
    1.0,
    0.5
  ).multiplyScalar(50);

  addLights(scene: THREE.Scene) {
    let SHADOW_EXTEND = 50;

    let directionalLight = this.directionalLight;
    directionalLight.position.copy(this.directionalLightOffset);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    if (getGraphicsOptions().shadows) {
      //Set up shadow properties for the light
      directionalLight.castShadow = true;

      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;

      directionalLight.shadow.camera.top = SHADOW_EXTEND;
      directionalLight.shadow.camera.bottom = -SHADOW_EXTEND;
      directionalLight.shadow.camera.left = SHADOW_EXTEND;
      directionalLight.shadow.camera.right = -SHADOW_EXTEND;

      directionalLight.shadow.radius = 1;
      directionalLight.shadow.bias = -0.0005;

      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 200;
    }

    if (DEBUG) {
      const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
      scene.add(helper);
    }

    let lightProbe = new THREE.LightProbe();

    const color = new Color().set(0xffffff);
    lightProbe.sh.coefficients[0]
      .set(color.r, color.g, color.b)
      .multiplyScalar(1.3);
    lightProbe.sh.coefficients[1]
      .set(color.r, color.g, color.b)
      .multiplyScalar(-0.3);
    lightProbe.sh.coefficients[2]
      .set(color.r, color.g, color.b)
      .multiplyScalar(-0.2);
    lightProbe.sh.coefficients[3]
      .set(color.r, color.g, color.b)
      .multiplyScalar(-0.1);

    scene.add(lightProbe);
  }

  transitionStarted: boolean = false;
  startTransition(next: Scene | (() => void)) {
    if (!this.transitionStarted) {
      this.transitionStarted = true;
      irisWipeOut().then(() => {
        if (next instanceof Scene) {
          this.game.transitionTo(next);
        } else {
          next();
        }
      });
    }
  }
}
