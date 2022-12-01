import Scene from "../scene";

import * as CANNON from "cannon";

import log from "loglevel";

import { Vector3, MathUtils } from "three";

import {
  BOING_SFX,
  COIN_SFX,
  HIT_SFX,
  HORN_SFX,
  SQUEAK_SFX,
  GOAL_SFX,
  PAUSE_SFX,
  UNPAUSE_SFX,
  BACK_SFX,
  STAR_SFX
} from "../sound";

import { vj, input } from "../input";

import * as THREE from "three";
import { Object3D, Vector2 } from "three";

const velocity = require("velocity-animate");

import ScoreKeeper from "../scorekeeper";

import Game from "../game";

const mathjs = require("mathjs");

const UP_VECTOR = new THREE.Vector3(0, 1, 0);

const LAYER_CAMERA_COLLISION = 1;

// @ts-ignore
window.THREE = THREE;
window.CANNON = CANNON;
require("../third-party/CannonDebugRenderer.js");

import {
  loadGLTF,
  toCannonVec,
  toTHREEVec,
  toCannonQuaternion,
  updateObjectFromBody,
  finiteDifference,
  setCastShadows,
  setReceiveShadows,
  downgradePBRMaterials,
  collectMaterials,
  toTHREEQuaternion,
  dampVector
} from "../utils";

import { closestPointInSceneToPoint } from "../closest-point";

import { FADE_DURATION, irisWipeIn, irisWipeOut } from "../transition";

const UI_CONTAINER = document.getElementById("ui-container")!;

const MAX_CAMERA_DISTANCE = 10;

const GRAVITY = 15;
const DIRECT_MOVEMENT_STRENGTH = 5;

const TILT_MAGNITUDE = 0.8;

type LevelState =
  | "loading"
  | "playing"
  | "goal"
  | "falling"
  | "intro"
  | "intro-fading";

import { DEBUG, RECORD_INTRO, SCREENSHOT_INTRO } from "../debug-mode";
import MainMenu from "../menus/mainmenu";
import { getGraphicsOptions } from "../options";

import { COIN_GLTF, GOAL_GLTF, STAR_GLTF } from "../preload";

const PAUSE_BUTTON = document.getElementById(
  "pause-button"
)! as HTMLImageElement;

import { DirectionalUINavigator } from "../menus/directional-navigator";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { LOADING_SPINNER } from "../dom-elements";
import Entity from "./entity";
import { CoinParticles, BonkParticles, BallParticles } from "./particles";

import PlatformMover from "./platform-mover";

class PhysicsBodyInterpolator {
  interpolate(sphere: THREE.Object3D, t: number) {
    sphere.position.lerpVectors(this.lastPosition, this.nextPosition, t);
    sphere.quaternion.slerpQuaternions(
      this.lastOrientation,
      this.nextOrientation,
      t
    );
  }

  lastPosition: THREE.Vector3 = new THREE.Vector3();
  nextPosition: THREE.Vector3 = new THREE.Vector3();

  lastOrientation: THREE.Quaternion = new THREE.Quaternion();
  nextOrientation: THREE.Quaternion = new THREE.Quaternion();

  constructor() {}

  reset(body: CANNON.Body) {
    this.lastPosition = this.nextPosition = toTHREEVec(body.position);
    this.lastOrientation = this.nextOrientation = toTHREEQuaternion(
      body.quaternion
    );
  }

  nextState(body: CANNON.Body) {
    this.lastPosition = this.nextPosition;
    this.nextPosition = toTHREEVec(body.position);

    this.lastOrientation = this.nextOrientation;
    this.nextOrientation = toTHREEQuaternion(body.quaternion);
  }
}

export class Level extends Scene {
  dolly: THREE.Group = new THREE.Group();
  roomscale: THREE.Group = new THREE.Group();

  background: THREE.Group = new THREE.Group();

  world: CANNON.World = new CANNON.World();

  state: LevelState = "loading";

  // A list of all level collision bodies, used for raycasting while avoiding the ball.
  collisionBodies: Array<CANNON.Body> = [];

  sphere: THREE.Mesh;
  sphereBody: CANNON.Body;
  sphereInterpolator: PhysicsBodyInterpolator = new PhysicsBodyInterpolator();

  // The current tilt of the level, as a unit vector. Gravity goes in the direction of the tilt.
  tilt: THREE.Vector3;

  stageParent: THREE.Object3D = new THREE.Object3D();
  stageChild: THREE.Object3D = new THREE.Object3D();

  worldAABB: CANNON.AABB = new CANNON.AABB();

  goal: THREE.Vector3 = new THREE.Vector3();

  cameraTargetPosition: THREE.Vector3 = new THREE.Vector3();

  time: number = 0;
  fixedIntervalTime: number = 0;

  coinCount: number = 0;

  entities: Array<Entity> = [];
  add(entity: Entity) {
    this.entities.push(entity);
  }
  remove(entity: Entity) {
    this.entities = this.entities.filter(e => e !== entity);
  }

  blinkMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial();
  ballMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial();
  blinkTime: number = MathUtils.randFloat(0, 4);

  createBall(): [THREE.Mesh, CANNON.Body] {
    let segments = getGraphicsOptions().geometry === "high" ? 12 : 8;

    let texture =
      getGraphicsOptions().geometry === "high"
        ? require("../assets/images/ball-texture.png")
        : require("../assets/images/ball-texture-small.png");

    let geometry = new THREE.SphereGeometry(1, segments, segments);
    let material = (this.ballMaterial = new THREE.MeshStandardMaterial());
    material.map = THREE.ImageUtils.loadTexture(texture);
    material.map.magFilter = THREE.NearestFilter;
    material.map.minFilter = THREE.NearestFilter;

    if (getGraphicsOptions().geometry === "high") {
      this.blinkMaterial.map = THREE.ImageUtils.loadTexture(
        require("../assets/images/ball-texture-blink.png")
      );
      this.blinkMaterial.map.magFilter = THREE.NearestFilter;
      this.blinkMaterial.map.minFilter = THREE.NearestFilter;
    } else {
      this.blinkMaterial = material;
    }

    let mesh = new THREE.Mesh(geometry, material);
    setCastShadows(mesh);
    setReceiveShadows(mesh);
    let body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, 0),
      shape: new CANNON.Sphere(1),
      angularDamping: 0.25,
      linearDamping: 0.25,
      material: new CANNON.Material("ball-material")
    });

    mesh.layers.enable(LAYER_CAMERA_COLLISION);

    body.material.restitution = 1.0;

    return [mesh, body];
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (this.paused) {
      document.getElementById("pause-menu")!.style.display = "inline";
      PAUSE_SFX.play();
      vj.disable();
    } else {
      document.getElementById("pause-menu")!.style.display = "none";
      UNPAUSE_SFX.play();
      vj.enable();
    }
  }

  onComplete: () => void;
  paused: boolean = false;

  score: ScoreKeeper;

  movingPlatformHelper: THREE.ArrowHelper = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0)
  );

  getAdditionalUI(): string {
    return "";
  }

  constructor(
    game: Game,
    score: ScoreKeeper,
    onComplete: () => void = () => {}
  ) {
    super(game);

    this.onComplete = onComplete;
    this.score = score;

    this.platformMover = new PlatformMover(this);

    if (getGraphicsOptions().physics === "low") {
      this.world.solver.iterations = 1;
    } else {
      this.world.solver.iterations = 10;
    }

    [this.sphere, this.sphereBody] = this.createBall();
    this.scene.add(this.sphere);
    this.world.addBody(this.sphereBody);

    this.addLights(this.scene);

    this.world.gravity.set(0, 0, 0);
    this.tilt = new THREE.Vector3(0, -1, 0);

    this.scene.add(this.stageParent);
    this.stageParent.add(this.stageChild);

    this.scene.add(this.dolly);
    this.dolly.add(this.camera);
    this.dolly.scale.set(15, 15, 15);

    this.scene.add(this.roomscale);
    this.roomscale.scale.set(60, 60, 60);
    this.roomscale.position.set(0, -50, 0);

    this.scene.add(this.background);

    if (DEBUG) {
      // @ts-ignore
      this.cannonDebugRenderer = new THREE.CannonDebugRenderer(
        this.scene,
        this.world
      );

      this.scene.add(this.movingPlatformHelper);
    }
  }

  navigator?: DirectionalUINavigator;

  onLeave() {
    super.onLeave();
  }

  onEnter() {
    vj.enable();
    document.getElementById("version")!.style.display = "none";

    const uiSize = "3rem";
    const uiPosition = "bottom: 0px;";

    UI_CONTAINER.innerHTML = `
      <div id="game-stats">
        <div id='coin-container' style="position: absolute; ${uiPosition} color: white; display: flex; flex-direction: row; align-items: center; font-size: ${uiSize};">
          <img style="width: 1.2em; padding: 0.2em;" src="${require("../assets/ui/coin.svg")}"/><span id="coin-count">0</span>
        </div>

        <div id='clock-container' style="position: absolute; ${uiPosition} right: 0px; color: white; display: flex; flex-direction: row; align-items: center; font-size: ${uiSize};">
          <span id="clock-count">0</span><img style="width: 1.2em; padding: 0.2em;" src="${require("../assets/ui/clock.svg")}"/>
        </div>
      </div>

      ${this.getAdditionalUI()}

      <div id="pause-menu" style="position: absolute; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: none;">
        <div style="width: 100%; height: 100%; padding: 1.0em; box-sizing: border-box; display: flex; justify-content: center;">
        <div style="width: 100%; max-width: 800px; height: 100%; color: white; display: flex; flex-direction: column; justify-content: center; align-items: stretch;">
          <h1 class="pause-menu-title" style="text-align: center">PAUSED</h1>
          <button id="exit-button" class="menu-button">EXIT TO MENU</button>
          <button id="retry-button" class="menu-button">RESTART LEVEL</button>
        </div>
        </div>
      </div>
      `;

    let exitButton = document.getElementById(
      "exit-button"
    )! as HTMLButtonElement;
    exitButton.onclick = () => {
      HORN_SFX.play();
      this.startTransition(new MainMenu(this.game));
    };

    let retryButton = document.getElementById(
      "retry-button"
    )! as HTMLButtonElement;
    retryButton.onclick = () => {
      BACK_SFX.play();
      this.score.addPlayTime(this.time);

      irisWipeOut().then(() => {
        this.reset();
        this.setPaused(false);
        irisWipeIn();
      });
    };

    this.navigator = new DirectionalUINavigator([exitButton, retryButton]);

    this.loadScene().then(async () => {
      let goalGLTF = await GOAL_GLTF;
      setCastShadows(goalGLTF.scene);
      setReceiveShadows(goalGLTF.scene);

      this.scene.getObjectByName("Goal")!.add(goalGLTF.scene.clone());
      this.goal.copy(this.scene.getObjectByName("Goal")!.position);

      this.onSceneLoaded();

      // Iris wipe in.
      irisWipeIn();

      // Switch to the playing state.
      this.state = "intro";
      this.reset();
    });
  }

  onPause() {
    this.setPaused(!this.paused);
  }

  onSceneLoaded() {}

  getBackgroundGLTF(): string | Promise<GLTF> {
    throw new Error(`getBackgroundGLTF needs to be implemented.`);
  }

  getLevelGLTF(): string {
    throw new Error(`getLevelGLTF needs to be implemented.`);
  }

  coins: Array<Object3D> = [];
  stars: Array<Object3D> = [];

  cannonDebugRenderer: any;

  platformMover: PlatformMover;

  async loadScene() {
    LOADING_SPINNER.style.display = "inline";

    // Load background.
    let backgroundGLTF: GLTF;

    let backgroundUrlOrPromise = this.getBackgroundGLTF();
    if (typeof backgroundUrlOrPromise === "string") {
      backgroundGLTF = await loadGLTF(backgroundUrlOrPromise);
    } else {
      backgroundGLTF = await backgroundUrlOrPromise;
    }

    backgroundGLTF.scene.scale.set(40, 40, 40);
    this.background.add(backgroundGLTF.scene.clone());

    // Load level.
    let sceneGLTF = await loadGLTF(this.getLevelGLTF());

    setReceiveShadows(sceneGLTF.scene);
    setCastShadows(sceneGLTF.scene);
    this.stageChild.add(sceneGLTF.scene.clone());

    let coinGLTF = await COIN_GLTF;
    setCastShadows(coinGLTF.scene);
    setReceiveShadows(coinGLTF.scene);

    let starGLTF = await STAR_GLTF;
    setCastShadows(starGLTF.scene);
    setReceiveShadows(starGLTF.scene);

    this.scene.updateWorldMatrix(true, true);
    this.scene.traverse(object => {
      if (object.userData.entity === "platform") {
        if (object.userData.cameracollide !== "false") {
          object.traverse(obj => {
            if (obj.type === "Mesh") obj.layers.enable(LAYER_CAMERA_COLLISION);
          });
        }

        let moving = !!object.userData.position || !!object.userData.rotation;
        let body = this.addStaticMesh(object, moving);

        let initalPosition = mathjs.matrix([
          body.position.x,
          body.position.y,
          body.position.z
        ]);
        let posFn: undefined | ((t: number) => CANNON.Vec3) = undefined;
        if (object.userData.position) {
          const posExpr = mathjs.compile(object.userData.position);
          posFn = (t: number) => {
            const matrix = posExpr.evaluate({
              t: t,
              init: initalPosition
            });
            return new CANNON.Vec3(
              matrix.get([0]),
              matrix.get([1]),
              matrix.get([2])
            );
          };
        }

        let euler = new CANNON.Vec3();
        body.quaternion.toEuler(euler);
        let initalRotation = mathjs.matrix([euler.x, euler.y, euler.z]);
        let rotFn: undefined | ((t: number) => CANNON.Vec3) = undefined;
        if (object.userData.rotation) {
          const rotExpr = mathjs.compile(object.userData.rotation);
          rotFn = (t: number) => {
            const matrix = rotExpr.evaluate({
              t: t,
              init: initalRotation
            });
            return new CANNON.Vec3(
              matrix.get([0]),
              matrix.get([1]),
              matrix.get([2])
            );
          };
        }

        if (posFn || rotFn) {
          this.platformMover.addMovingPlatform({
            object: object,
            body: body,
            position: posFn,
            rotation: rotFn
          });
        }

        if (object.userData.restitution) {
          body.material = new CANNON.Material("");
          body.material.restitution = object.userData.restitution;
        }

        if (object.userData.sticky === "true") {
          // @ts-ignore
          body._mm_sticky = true;
        }
      } else if (object.userData.entity === "coin") {
        let coin = coinGLTF.scene.clone();
        object.add(coin);
        this.coins.push(coin);
      } else if (object.userData.entity === "star") {
        let star = starGLTF.scene.clone();
        star.visible = false;
        object.add(star);
        this.stars.push(star);
      }

      if (object.userData.shadows === "false") {
        setCastShadows(object, false);
        setReceiveShadows(object, false);
      }

      if (object.userData.visible === "false") {
        object.visible = false;
      }
    });

    // Custom Background
    let customBackground = this.scene.getObjectByName("Background");
    if (customBackground) {
      customBackground.parent?.remove(customBackground);
      // TODO: Fix this line.
      this.background.remove(backgroundGLTF.scene);
      this.background.add(customBackground);

      setCastShadows(customBackground, false);
      setReceiveShadows(customBackground, false);
    }

    if (this.coins.length === 0) {
      document.getElementById("coin-container")!.style.display = "none";
    }

    LOADING_SPINNER.style.display = "none";
  }

  playTimer: number = 0;

  starsShown: boolean = false;

  reset() {
    // Move sphere to start position.
    let start = this.scene.getObjectByName("Start")!;
    this.sphereBody.position.copy(toCannonVec(start.position));
    this.sphereBody.quaternion.copy(toCannonQuaternion(start.quaternion));

    // Reset sphere dynamics.
    this.sphere.visible = true;
    this.sphereBody.velocity.setZero();
    this.sphereBody.angularVelocity.setZero();
    this.previousBallVelocity.setZero();

    // Reset physics interpolators.
    this.sphereInterpolator.reset(this.sphereBody);

    // Initial camera position.
    this.dolly.position.copy(
      toTHREEVec(this.sphereBody.position).add(new THREE.Vector3(0, 5, 5))
    );
    this.dolly.setRotationFromEuler(new THREE.Euler(0, 0, 0));
    this.cameraTargetPosition.copy(toTHREEVec(this.sphereBody.position));

    // Reset tilt.
    this.tilt = new THREE.Vector3(0, -1, 0);

    // Reset timer for level motion.
    this.time = 0;
    this.fixedIntervalTime = 0;

    // Reset play timer (for clock).
    this.playTimer = 0;
    document.getElementById("clock-count")!.innerHTML = this.playTimer.toFixed(
      1
    );

    // Reset coins.
    for (let coin of this.coins) {
      coin.visible = true;
    }
    this.coinCount = 0;
    document.getElementById("coin-count")!.innerHTML = "0";

    // Show stars, but only if this is the first reset called after
    // moving into the "playing" state.
    if (!this.starsShown && this.state === "playing") {
      for (let star of this.stars) {
        star.visible = true;
      }
    }
  }

  collectTrimeshes(root: THREE.Object3D, mesh: THREE.Object3D) {
    if (mesh.type === "Mesh") {
      let rootScale = new THREE.Vector3();
      root.getWorldScale(rootScale);

      // @ts-ignore
      let vertices = Float32Array.from(mesh.geometry.attributes.position.array);
      for (let i = 0; i < vertices.length; i += 3) {
        let point = new THREE.Vector3(
          vertices[i],
          vertices[i + 1],
          vertices[i + 2]
        );
        mesh.localToWorld(point);
        root.worldToLocal(point);
        vertices[i] = point.x * rootScale.x;
        vertices[i + 1] = point.y * rootScale.y;
        vertices[i + 2] = point.z * rootScale.z;
      }

      // @ts-ignore
      return [new CANNON.Trimesh(vertices, mesh.geometry.index.array)];
    } else {
      let trimeshes: Array<any> = [];
      for (let child of mesh.children) {
        trimeshes = trimeshes.concat(this.collectTrimeshes(root, child));
      }
      return trimeshes;
    }
  }

  addStaticMesh(mesh: THREE.Object3D, kinematic: boolean = false): CANNON.Body {
    let trimeshes = this.collectTrimeshes(mesh, mesh);

    let position = new THREE.Vector3();
    let quaternion = new THREE.Quaternion();
    mesh.getWorldPosition(position);
    mesh.getWorldQuaternion(quaternion);

    let body = new CANNON.Body({
      type: kinematic ? CANNON.Body.KINEMATIC : CANNON.Body.STATIC,
      position: toCannonVec(position),
      quaternion: toCannonQuaternion(quaternion),
      mass: 0
    });
    for (let trimesh of trimeshes) {
      body.addShape(trimesh);
    }

    this.world.addBody(body);
    this.collisionBodies.push(body);
    this.worldAABB.extend(body.aabb);

    mesh.userData.body = body;
    return body;
  }

  collectCoin() {
    this.coinCount++;
    COIN_SFX.play();
    document.getElementById(
      "coin-count"
    )!.innerHTML = this.coinCount.toString();

    input.vibrate(0.05);

    const coinContainer = document.getElementById("coin-container")!;
    velocity(coinContainer, { scaleX: "1.5", scaleY: "1.5" }, { duration: 80 });
    velocity(coinContainer, { scaleX: "1", scaleY: "1" }, { duration: 80 });
  }

  starCount: number = 0;
  collectStar() {
    STAR_SFX.play();
    input.vibrate(0.1);
    this.starCount++;
  }

  pulseClock() {
    const clockContainer = document.getElementById("clock-container")!;
    velocity(
      clockContainer,
      { scaleX: "1.5", scaleY: "1.5" },
      { duration: 80 }
    );
    velocity(clockContainer, { scaleX: "1", scaleY: "1" }, { duration: 80 });
  }

  previousBallVelocity: CANNON.Vec3 = new CANNON.Vec3();

  update(dt: number) {
    // End the update function if we are loading.
    if (this.state === "loading") return;

    // Handle pause menu keyboard navigation.
    if (this.paused) {
      let movement = input.movement(this.renderer.xr.getSession());
      this.navigator!.update(movement);
    }

    // Game stats not visible during intro.
    if (this.state === "intro" || this.state === "intro-fading") {
      document.getElementById("game-stats")!.style.visibility = "hidden";
    } else {
      document.getElementById("game-stats")!.style.visibility = "visible";
    }

    // Game is pausable / resumable if we are either paused
    // already or we are currently playing.
    if (this.paused || this.state === "playing") {
      PAUSE_BUTTON.style.display = "inline";
      if (input.pause()) this.setPaused(!this.paused);
    } else {
      PAUSE_BUTTON.style.display = "none";
    }

    // End the update function if we are paused.
    if (this.paused) return;

    // Increment time if we aren't paused.
    this.time += dt;

    if (this.state === "playing") {
      this.playTimer += dt;
      document.getElementById("clock-count")!.innerHTML = this.time.toFixed(1);
    }

    for (let coin of this.coins) {
      if (!coin.visible) continue;

      // Rotate coin.
      const COIN_ROTATE_SPEED = 3;
      coin.quaternion.setFromAxisAngle(
        UP_VECTOR,
        COIN_ROTATE_SPEED * this.time
      );

      // Handle coin collision.
      let coinPosition = new THREE.Vector3();
      coin.getWorldPosition(coinPosition);
      this.stageChild.worldToLocal(coinPosition);
      let dist = coinPosition.distanceTo(toTHREEVec(this.sphereBody.position));
      const COIN_DISTANCE = 1.8;
      if (this.state === "playing" && dist < COIN_DISTANCE) {
        coin.visible = false;
        this.collectCoin();

        if (getGraphicsOptions().particles) {
          this.add(new CoinParticles(this, coinPosition));
        }
      }
    }

    for (let star of this.stars) {
      if (!star.visible) continue;

      // Rotate star.
      const STAR_ROTATE_SPEED = 3;
      star.quaternion.setFromAxisAngle(
        UP_VECTOR,
        STAR_ROTATE_SPEED * this.time
      );

      // Handle star collision.
      let starPosition = new THREE.Vector3();
      star.getWorldPosition(starPosition);
      this.stageChild.worldToLocal(starPosition);
      let dist = starPosition.distanceTo(toTHREEVec(this.sphereBody.position));
      const STAR_DISTANCE = 4.0;
      if (this.state === "playing" && dist < STAR_DISTANCE) {
        star.visible = false;
        this.collectStar();

        if (getGraphicsOptions().particles) {
          this.add(new CoinParticles(this, starPosition));
        }
      }
    }

    // The 2D Vector from the camera to the ball. Represents the Up / Down component of tilt.
    let diff = this.sphere.position
      .clone()
      .sub(this.dolly.position)
      .setY(0)
      .normalize();

    // The 2D Vector that represents the Left / Right component of tilt.
    let lateral = diff
      .clone()
      .cross(new THREE.Vector3(0, 1, 0))
      .normalize();

    let xrForward = new THREE.Vector3(0, 0, -1);
    let xrLateral = new THREE.Vector3(1, 0, 0);
    if (this.game.isXR()) {
      let xrCamera = this.game.renderer.xr.getCamera(this.camera);

      let xrPosition = new THREE.Vector3();
      let xrOrientation = new THREE.Quaternion();
      let xrScale = new THREE.Vector3();
      xrCamera.matrixWorld.decompose(xrPosition, xrOrientation, xrScale);

      xrForward = xrForward
        .applyQuaternion(xrOrientation)
        .setY(0)
        .normalize();
      xrLateral = xrLateral
        .applyQuaternion(xrOrientation)
        .setY(0)
        .normalize();
    }

    // Calculate the target tilt.
    let tiltTarget = new THREE.Vector3(0, -1, 0);
    if (this.state === "playing") {
      let forwardAxis = this.game.isXR() ? xrForward : diff;
      let lateralAxis = this.game.isXR() ? xrLateral : lateral;

      // Movement is applied to tilt gravity.
      {
        let movement = input
          .movement(this.renderer.xr.getSession())
          .clone()
          .multiplyScalar(TILT_MAGNITUDE);
        tiltTarget.add(forwardAxis.clone().multiplyScalar(movement.y));
        tiltTarget.add(lateralAxis.clone().multiplyScalar(movement.x));
        tiltTarget.normalize();
      }

      // Movement is applied to directly control rolling.
      {
        let movement = input.movement(this.renderer.xr.getSession());
        let forceDirection = forwardAxis
          .clone()
          .multiplyScalar(movement.y)
          .add(lateralAxis.clone().multiplyScalar(movement.x));
        this.sphereBody.applyImpulse(
          toCannonVec(
            forceDirection.multiplyScalar(DIRECT_MOVEMENT_STRENGTH * dt)
          ),
          this.sphereBody.position.clone().vsub(new CANNON.Vec3(0, -0.5, 0))
        );
      }
    }

    // Interpolate tilt to the target.
    this.tilt = dampVector(this.tilt, tiltTarget, 8, dt);
    this.tilt.normalize();

    const TICKS_PER_SECOND = getGraphicsOptions().ticksPerSecond;
    const FIXED_TIMESTEP = 1.0 / TICKS_PER_SECOND;

    while (this.fixedIntervalTime < this.time) {
      if (this.state !== "goal") {
        // Make tilt the direction of gravity.
        this.world.gravity.copy(
          toCannonVec(this.tilt.clone().multiplyScalar(GRAVITY))
        );
      } else {
        this.world.gravity.set(0, GRAVITY, 0);
      }

      this.platformMover.movePlatforms(FIXED_TIMESTEP);

      let spherePreStepVelocity = this.sphereBody.velocity.clone();

      // Step physics.
      this.world.step(FIXED_TIMESTEP);

      // Check for a "bonk"
      let newSurfaceCollision: CANNON.Body | null = null;
      for (let body of this.world.bodies) {
        if (body === this.sphereBody) continue;

        if (
          // @ts-ignore
          this.world.collisionMatrix.get(this.sphereBody, body) &&
          // @ts-ignore
          !this.world.collisionMatrixPrevious.get(this.sphereBody, body)
        ) {
          newSurfaceCollision = body;
          break;
        }
      }

      const MIN_VEL = 8;
      const MAX_VEL = 30;

      if (this.state === "playing" && newSurfaceCollision) {
        let velDiff = spherePreStepVelocity.distanceTo(
          this.sphereBody.velocity
        );
        if (velDiff > MIN_VEL) {
          let intensity = MathUtils.mapLinear(velDiff, MIN_VEL, MAX_VEL, 0, 1);
          intensity = MathUtils.clamp(intensity, 0, 1);

          this.blinkTime = 0;

          log.debug(`Bonk, intensity = ${intensity}...`);
          input.vibrate(intensity);

          if (
            newSurfaceCollision.material &&
            newSurfaceCollision.material.restitution > 0.1
          ) {
            BOING_SFX.volume(intensity);
            BOING_SFX.play();
          } else {
            HIT_SFX.volume(intensity);
            HIT_SFX.play();

            if (intensity > 0.4) {
              this.squeakTimer = 4.6;
            }
          }

          if (intensity > 0.3 && getGraphicsOptions().particles) {
            for (let contact of this.world.contacts) {
              if (
                contact.bi === this.sphereBody &&
                contact.bj === newSurfaceCollision
              ) {
                let collisionPoint = this.sphereBody.position.vadd(contact.ri);
                let baseVel = new CANNON.Vec3();
                newSurfaceCollision.getVelocityAtWorldPoint(
                  collisionPoint,
                  baseVel
                );
                this.add(
                  new BonkParticles(
                    this,
                    toTHREEVec(collisionPoint),
                    toTHREEVec(baseVel),
                    intensity
                  )
                );
                break;
              }
            }
          }
        }
      }

      // Restrict velocity by a constant.
      const MAX_VELOCITY = getGraphicsOptions().ticksPerSecond === 15 ? 15 : 40;
      if (this.sphereBody.velocity.norm() > MAX_VELOCITY) {
        this.sphereBody.velocity.normalize();
        this.sphereBody.velocity.copy(
          this.sphereBody.velocity.mult(MAX_VELOCITY)
        );
        log.debug("Restricting velocity...");
      }

      this.sphereInterpolator.nextState(this.sphereBody);

      this.fixedIntervalTime += FIXED_TIMESTEP;
    }

    for (let entity of this.entities) {
      entity.update(dt);
    }

    // Update display objects from physics bodies.
    let interpolation = (this.time % FIXED_TIMESTEP) / FIXED_TIMESTEP;
    this.sphereInterpolator.interpolate(this.sphere, interpolation);
    this.platformMover.updatePlatforms();

    // Rotate stage for visual effect.
    {
      if (this.game.isAR()) {
        // Rotate stage around center.
        let center = toTHREEVec(this.getWorldCenter());
        this.stageParent.position.copy(center);
        this.stageChild.position.copy(center.clone().multiplyScalar(-1));

        if (this.sphere.parent === this.scene) {
          this.scene.remove(this.sphere);
          this.stageChild.add(this.sphere);
        }
      } else {
        // Rotate stage around ball.
        this.stageParent.position.copy(this.sphere.position);
        this.stageChild.position.copy(
          this.sphere.position.clone().multiplyScalar(-1)
        );

        if (this.sphere.parent === this.stageChild) {
          this.stageChild.remove(this.sphere);
          this.scene.add(this.sphere);
        }
      }

      let visualTilt = this.tilt.clone();
      if (this.game.isXR()) {
        // Ease up on the tilt effect in VR / AR.
        visualTilt.multiplyScalar(0.5);
      }

      // Set the tilt of the stage.
      this.stageParent.quaternion
        .setFromUnitVectors(new THREE.Vector3(0, -1, 0), visualTilt)
        .invert();
    }

    // Detect fall out.
    const FALL_OUT_BUFFER = 10;
    if (
      this.state === "playing" &&
      this.sphereBody.position.y < this.worldAABB.lowerBound.y - FALL_OUT_BUFFER
    ) {
      irisWipeOut().then(() => {
        this.reset();
        this.state = "playing";
        irisWipeIn();
      });

      this.pulseClock();
      this.state = "falling";

      setTimeout(() => {
        HORN_SFX.play();
      }, 500);

      this.score.incrementDeaths();
      this.score.addPlayTime(this.time);
    }

    // Detect goal.
    const GOAL_DISTANCE = 5;
    const GOAL_HEIGHT = 5;
    {
      let pos3D = this.sphereBody.position;
      let pos2D = new THREE.Vector2(pos3D.x, pos3D.z);
      let goal2D = new THREE.Vector2(this.goal.x, this.goal.z);

      let dist = pos2D.distanceTo(goal2D);
      if (
        this.state === "playing" &&
        dist < GOAL_DISTANCE &&
        this.sphereBody.position.y > this.goal.y &&
        this.sphereBody.position.y < this.goal.y + GOAL_HEIGHT
      ) {
        GOAL_SFX.play();
        input.vibrate(0.2);
        this.state = "goal";

        this.pulseClock();

        this.score.addPlayTime(this.time);
        this.score.reportCoins(this.coinCount, this.coins.length);
        this.score.reportStars(this.starCount, this.stars.length);

        setTimeout(() => {
          this.startTransition(() => {
            this.onComplete();
          });
        }, 2000);
        this.add(new BallParticles(this));
      }

      if (this.state === "goal") {
        let diff = goal2D.clone().sub(pos2D);
        let mag = dt * 10;
        this.sphereBody.applyImpulse(
          new CANNON.Vec3(mag * diff.x, 0, mag * diff.y),
          this.sphereBody.position
        );
      }
    }

    // Camera positioning.
    if (this.state === "playing") {
      if (!this.game.isVR()) {
        let CAMERA_HEIGHT = 5;
        let CAMERA_DISTANCE = 4;

        // Interpolate camera to a position following ball.
        let cameraTargetPos = this.sphere.position
          .clone()
          .add(diff.clone().multiplyScalar(-CAMERA_DISTANCE))
          .add(new THREE.Vector3(0, CAMERA_HEIGHT, 0));
        this.dolly.position.copy(
          dampVector(this.dolly.position, cameraTargetPos, 5, dt)
        );

        // Clamp camera distance from sphere.
        let offset = this.dolly.position.clone().sub(this.sphere.position);
        if (offset.length() > MAX_CAMERA_DISTANCE) {
          offset.normalize().multiplyScalar(MAX_CAMERA_DISTANCE);
        }
        this.dolly.position.copy(this.sphere.position.clone().add(offset));
      } else {
        const VR_CAMERA_HORIZONTAL_DISTANCE = { min: 8, max: 12 };
        const VR_CAMERA_HEIGHT_RANGE = { min: 10, max: 15 };

        let offset = this.dolly.position.clone().sub(this.sphere.position);

        let horizontalOffset = new Vector2(offset.x, offset.z);
        if (horizontalOffset.length() > VR_CAMERA_HORIZONTAL_DISTANCE.max) {
          // Pull us closer if we are too far away.
          horizontalOffset
            .normalize()
            .multiplyScalar(VR_CAMERA_HORIZONTAL_DISTANCE.max);
        } else if (
          horizontalOffset.length() < VR_CAMERA_HORIZONTAL_DISTANCE.min
        ) {
          // Push us away if we are too close.
          horizontalOffset
            .normalize()
            .multiplyScalar(VR_CAMERA_HORIZONTAL_DISTANCE.min);
        }

        let verticalOffset = MathUtils.clamp(
          offset.y,
          VR_CAMERA_HEIGHT_RANGE.min,
          VR_CAMERA_HEIGHT_RANGE.max
        );

        let targetOffset = new Vector3(
          horizontalOffset.x,
          verticalOffset,
          horizontalOffset.y
        );
        let cameraTargetPos = this.sphere.position.clone().add(targetOffset);

        this.dolly.position.copy(
          dampVector(this.dolly.position, cameraTargetPos, 5, dt)
        );
      }

      if (!this.game.isXR()) {
        // Prevent collision with level geometry.
        const CAMERA_RADIUS = 2.5;

        let layers = new THREE.Layers();
        layers.set(LAYER_CAMERA_COLLISION);

        let [closestPoint, closestDistance] = closestPointInSceneToPoint(
          this.dolly.position,
          this.scene,
          CAMERA_RADIUS,
          layers
        );
        if (closestPoint && closestDistance < CAMERA_RADIUS) {
          let push = CAMERA_RADIUS - closestDistance;
          let pushDir = this.dolly.position
            .clone()
            .sub(closestPoint)
            .normalize();
          this.dolly.position.add(pushDir.clone().multiplyScalar(push));
        }
      }
    }

    if (this.state !== "intro") {
      // Make camera look slightly above ball.
      let targetLook = this.sphere.position
        .clone()
        .add(new THREE.Vector3(0, 1, 0));
      this.cameraTargetPosition = dampVector(
        this.cameraTargetPosition,
        targetLook,
        15,
        dt
      );
      this.camera.lookAt(this.cameraTargetPosition);
    }

    if (this.state === "intro" || this.state === "intro-fading") {
      const INTRO_ROTATE_BUFFER = 20;
      const INTRO_DURATION = 5;

      const rotationAngle = MathUtils.mapLinear(
        this.time,
        0,
        INTRO_DURATION,
        0,
        2 * Math.PI
      );

      if (SCREENSHOT_INTRO && this.time > 0.5 && !this.screenshotTaken) {
        this.screenshotTaken = true;

        const dataURL = this.renderer.domElement.toDataURL("image/png");

        const link = document.createElement("a");
        link.setAttribute("download", "preview.png");
        link.href = dataURL;
        link.click();
      }

      if (RECORD_INTRO && !this.mediaRecorder) {
        // @ts-ignore
        const stream = this.renderer.domElement.captureStream();
        // @ts-ignore
        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm",
          videoBitsPerSecond: 20000000
        });

        this.mediaRecorder.ondataavailable = event => {
          log.debug(`Recorded a media chunk of ${event.data.size} bytes.`);
          if (event.data.size > 0) this.recordedChunks.push(event.data);
        };
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, {
            type: "video/webm"
          });
          const url = window.URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.setAttribute("download", "preview.webm");
          link.href = url;
          link.click();
        };
        this.mediaRecorder.start();
      }

      let worldCenter = this.getWorldCenter();
      let radius =
        Math.max(
          Math.abs(worldCenter.x - this.worldAABB.lowerBound.x),
          Math.abs(worldCenter.z - this.worldAABB.lowerBound.z)
        ) + INTRO_ROTATE_BUFFER;

      if (this.game.isXR()) {
        let offset = new THREE.Vector3(
          worldCenter.x + radius,
          20,
          worldCenter.z + radius
        );
        let look = new THREE.Vector3(
          worldCenter.x + radius * 2,
          20,
          worldCenter.z + radius * 2
        );
        this.dolly.position.copy(offset);
        this.dolly.lookAt(look);

        let center = toTHREEVec(worldCenter);

        this.stageParent.position.copy(center);
        this.stageChild.position.copy(center.clone().multiplyScalar(-1));

        this.stageParent.setRotationFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rotationAngle
        );

        if (this.sphere.parent === this.scene) {
          this.scene.remove(this.sphere);
          this.stageChild.add(this.sphere);
        }
      } else {
        let offset = new THREE.Vector3(
          worldCenter.x + radius * Math.cos(rotationAngle),
          10,
          worldCenter.z + radius * Math.sin(rotationAngle)
        );
        this.dolly.position.copy(offset);
        this.camera.lookAt(toTHREEVec(worldCenter));
      }

      if (
        this.state === "intro" &&
        (this.time > INTRO_DURATION - FADE_DURATION / 1000 || input.skip())
      ) {
        this.state = "intro-fading";
        BACK_SFX.play();
        irisWipeOut().then(() => {
          this.state = "playing";
          this.reset();
          irisWipeIn();
        });
      }
    } else {
      if (RECORD_INTRO && this.mediaRecorder) {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }
    }

    this.directionalLight.position.copy(
      this.dolly.position.clone().add(this.directionalLightOffset)
    );
    this.directionalLight.target.position.copy(this.dolly.position);

    if (DEBUG) this.cannonDebugRenderer.update();

    // Handle material change to make marble mouse blink.
    this.blinkTime += dt;
    if (this.blinkTime % 4 < 0.4) {
      this.sphere.material = this.blinkMaterial;
    } else {
      this.sphere.material = this.ballMaterial;
    }

    // Make marble mouse squeak randomly.
    this.squeakTimer += dt;
    if (this.state === "playing" && this.squeakTimer > 5) {
      SQUEAK_SFX.play();
      this.squeakTimer = MathUtils.randFloat(-20, 0);
    }
  }

  recordedChunks: Array<Blob> = [];
  mediaRecorder?: any;
  screenshotTaken: boolean = false;

  squeakTimer: number = MathUtils.randFloat(-20, 0);

  getWorldCenter(): CANNON.Vec3 {
    return this.worldAABB.lowerBound
      .clone()
      .vadd(this.worldAABB.upperBound)
      .mult(0.5);
  }

  draw() {
    if (this.game.isAR()) {
      this.background.visible = false;
      if (this.camera.parent === this.dolly) {
        this.dolly.remove(this.camera);
        this.roomscale.add(this.camera);
      }
    } else {
      this.background.visible = true;
      if (this.camera.parent === this.roomscale) {
        this.roomscale.remove(this.camera);
        this.dolly.add(this.camera);
      }
    }

    if (this.game.isXR()) {
      this.scene.traverse(obj => (obj.frustumCulled = false));
    } else {
      this.scene.traverse(obj => (obj.frustumCulled = true));
    }

    this.renderer.render(this.scene, this.camera);
  }
}
