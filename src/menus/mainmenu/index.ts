import * as THREE from "three";

import Scene from "../../scene";
import Game from "../../game";

import { irisWipeIn, irisWipeOut } from "../../transition";

import { vj, input } from "../../input";

import { loadGLTF, setReceiveShadows, setCastShadows } from "../../utils";

import { MainMenuPhase } from "./mainmenuphase";
import { RootMenu } from "./rootmenu";

import { DirectionalUINavigator } from "../directional-navigator";
import { COIN_GLTF, GOAL_GLTF, ROOM_GLTF } from "../../preload";
import {
  LOADING_SPINNER,
  PAUSE_BUTTON,
  UI_CONTAINER,
  VERSION_CONTAINER
} from "../../dom-elements";
import { getGraphicsOptions } from "../../options";
import { BACK_SFX, PAUSE_SFX } from "../../sound";

export class TitleScreenPhase extends MainMenuPhase {
  onEnter() {
    UI_CONTAINER.innerHTML = `<img style="box-sizing: border-box;
      padding: 10px; width: 100%; height: 100%;" src='${require("../../assets/ui/title-screen.svg")}'></img>`;

    document.addEventListener("touchstart", () => this.next(), false);
    document.addEventListener("click", () => this.next(), false);
    setTimeout(() => this.next(), 5 * 1000);
  }

  playedSound: boolean = false;
  next() {
    if (!this.playedSound) {
      BACK_SFX.play();
      this.playedSound = true;
    }
    this.startTransition(new RootMenu(this.mainMenu));
  }

  update(dt) {
    if (input.skip()) {
      this.next();
    }
  }
}

export default class MainMenu extends Scene {
  phase: MainMenuPhase;

  background: THREE.Group = new THREE.Group();

  dolly: THREE.Group = new THREE.Group();
  roomscale: THREE.Group = new THREE.Group();

  time: number = 0;

  constructor(game: Game, initialPhase?: { new (MainMenu): MainMenuPhase }) {
    super(game);

    if (initialPhase) {
      this.phase = new initialPhase(this);
    } else {
      this.phase = new TitleScreenPhase(this);
    }

    this.addLights(this.scene);

    this.scene.add(this.background);

    this.scene.add(this.dolly);
    this.dolly.add(this.camera);
    this.dolly.scale.set(10, 10, 10);

    this.scene.add(this.roomscale);
    this.roomscale.scale.set(60, 60, 60);
    this.roomscale.position.set(0, -50, 0);
  }

  outroStarted: boolean = false;
  ready: boolean = false;

  transitionTo(nextPhase: MainMenuPhase) {
    this.phase.onLeave();
    this.phase = nextPhase;
    this.phase.onEnter();
  }

  onEnter() {
    vj.disable();
    VERSION_CONTAINER.style.display = "inline";
    PAUSE_BUTTON.style.display = "none";

    this.loadScene().then(() => {
      this.phase.onEnter();
      irisWipeIn();
    });
  }

  onLeave() {
    super.onLeave();
    VERSION_CONTAINER.style.display = "none";
    this.phase.onLeave();
  }

  coins: Array<THREE.Object3D> = [];

  async loadScene() {
    LOADING_SPINNER.style.display = "inline";

    // Load background.
    let backgroundGLTF = await ROOM_GLTF;
    backgroundGLTF.scene.scale.set(40, 40, 40);
    this.background.add(backgroundGLTF.scene.clone());

    // Load level.
    let sceneGLTF = await loadGLTF(require("../../assets/levels/simple.glb"));
    setReceiveShadows(sceneGLTF.scene);
    setCastShadows(sceneGLTF.scene);
    this.scene.add(sceneGLTF.scene.clone());

    let coinGLTF = await COIN_GLTF;
    setCastShadows(coinGLTF.scene);
    setReceiveShadows(coinGLTF.scene);

    this.scene.traverse(object => {
      if (object.userData.entity === "coin") {
        let coin = coinGLTF.scene.clone();
        object.add(coin);
        this.coins.push(coin);
      }
    });

    let goalGLTF = await GOAL_GLTF;
    setCastShadows(goalGLTF.scene);
    setReceiveShadows(goalGLTF.scene);
    this.scene.getObjectByName("Goal")!.add(goalGLTF.scene.clone());

    {
      let segments = getGraphicsOptions().geometry === "high" ? 12 : 8;

      let texture =
        getGraphicsOptions().geometry === "high"
          ? require("../../assets/images/ball-texture.png")
          : require("../../assets/images/ball-texture-small.png");

      var geometry = new THREE.SphereGeometry(1, segments, segments);
      var material = new THREE.MeshStandardMaterial();
      material.map = THREE.ImageUtils.loadTexture(texture);
      material.map.magFilter = THREE.NearestFilter;
      material.map.minFilter = THREE.NearestFilter;

      let mesh = new THREE.Mesh(geometry, material);
      setCastShadows(mesh);
      setReceiveShadows(mesh);

      this.scene.add(mesh);
      mesh.position.set(0, 1.0, 0);
    }

    LOADING_SPINNER.style.display = "none";
  }

  update(dt: number) {
    this.time += dt;

    for (let coin of this.coins) {
      // Rotate coin.
      const COIN_ROTATE_SPEED = 3;
      coin.quaternion.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        COIN_ROTATE_SPEED * this.time
      );
    }

    const ROTATE_SPEED = 0.2;
    const ROTATE_RADIUS = 60;

    let center = new THREE.Vector3(11.9, -10.9, -20.6);

    if (this.game.isXR()) {
      let offset = new THREE.Vector3(
        center.x + ROTATE_RADIUS * 0.5,
        20,
        center.z + ROTATE_RADIUS * 0.5
      );
      let look = new THREE.Vector3(
        center.x + ROTATE_RADIUS * 2,
        20,
        center.z + ROTATE_RADIUS * 2
      );
      this.dolly.position.copy(offset);
      this.dolly.lookAt(look);
    } else {
      let offset = new THREE.Vector3(
        ROTATE_RADIUS * Math.cos(ROTATE_SPEED * this.time),
        30,
        ROTATE_RADIUS * Math.sin(ROTATE_SPEED * this.time)
      );

      this.dolly.position.copy(center.clone().add(offset));
      this.camera.lookAt(center);
    }

    this.phase.update(dt);
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
    this.renderer.render(this.scene, this.camera);

    this.phase.draw();
  }
}
