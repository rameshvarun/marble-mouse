import Scene from "../scene";
import Game from "../game";

import * as THREE from "three";
import { irisWipeIn, irisWipeOut } from "../transition";
import { input, vj } from "../input";
import { loadGLTF, setCastShadows, setReceiveShadows } from "../utils";
import MainMenu from "./mainmenu";

import { getGraphicsOptions } from "../options";

const UI_CONTAINER = document.getElementById("ui-container")!;

import ScoreKeeper from "../scorekeeper";
import { DirectionalUINavigator } from "./directional-navigator";

const version = document.getElementById("version")!;

const PAUSE_BUTTON = document.getElementById(
  "pause-button"
)! as HTMLImageElement;

export const TROPHY_BACKGROUND_URL =
  getGraphicsOptions().geometry === "high"
    ? require("../assets/backgrounds/trophy.glb")
    : require("../assets/backgrounds/trophy-small.glb");

export default class StatsMenu extends Scene {
  background: THREE.Group = new THREE.Group();
  dolly: THREE.Group = new THREE.Group();

  navigator?: DirectionalUINavigator;

  constructor(
    name: string,
    game: Game,
    score: ScoreKeeper,
    onComplete: () => void = () => {}
  ) {
    super(game);

    let coinsRow =
      score.totalCoins === 0
        ? ""
        : `<div><img style="height: 1em;" src="${require("../assets/ui/coin.svg")}"/></div>
           <div style="justify-self: end;">${score.coinsCollected} / ${
            score.totalCoins
          }</div>
    <div style="justify-self: end;">+${score.calculateCoinBonus()}</div>`;

    let starsRow =
      score.totalStars === 0
        ? ""
        : `<div><img style="height: 1em;" src="${require("../assets/ui/star.svg")}"/></div>
         <div style="justify-self: end;">${score.starsCollected} / ${
            score.totalStars
          }</div>
        <div style="justify-self: end;">+${score.calculateStarsBonus()}</div>`;

    UI_CONTAINER.innerHTML = `
    <div style="height: 100%; align-items: center; color: white; display: flex; flex-direction: column; padding-left: 20px; padding-right: 20px; justify-content: center;">
        <div style="font-size: 8vmin; padding-bottom: 50px; text-align: center;">COURSE ${name} RESULTS</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; font-size: 8vmin; width: 100%;">
            <div><img style="height: 1em;" src="${require("../assets/ui/clock.svg")}"/></div>
            <div style="justify-self: end;">${score.formatPlayTime()}</div>
            <div style="justify-self: end;">+${score.calculateTimeBonus()}</div>

            <div><img style="height: 1em;" src="${require("../assets/ui/skull.svg")}"/></div>
            <div style="justify-self: end;">${score.deaths}</div>
            <div style="justify-self: end;">+${score.calculateDeathsBonus()}</div>

            ${coinsRow}

            ${starsRow}

            <div style="grid-column: 1; padding-bottom: 8px;"></div>

            <div style="grid-column: 1; font-size: 8vmin;">SCORE</div>
            <div></div>
            <div style="font-size: 10vmin; justify-self: end;">${score.calculateScore()}</div>
        </div>

        <button id="continue-button" class="menu-button">CONTINUE</button>
    </div>`;

    document.getElementById("continue-button")!.onclick = () => {
      this.startTransition(() => {
        onComplete();
      });
    };

    this.navigator = new DirectionalUINavigator([
      document.getElementById("continue-button")!
    ]);

    this.addLights(this.scene);
    this.scene.add(this.background);

    this.scene.add(this.dolly);
    this.dolly.add(this.camera);

    this.loadScene();
  }

  async loadScene() {
    // Load background.
    let backgroundGLTF = await loadGLTF(TROPHY_BACKGROUND_URL);
    backgroundGLTF.scene.scale.set(20, 20, 20);
    this.background.add(backgroundGLTF.scene);

    setCastShadows(this.background);
    setReceiveShadows(this.background);

    irisWipeIn();
  }

  time: number = 0;
  update(dt: number) {
    this.time += dt;

    let movement = input.movement(this.game.renderer.xr.getSession());
    this.navigator?.update(movement);

    const ROTATE_SPEED = 0.2;
    const ROTATE_RADIUS = 120;

    let center = new THREE.Vector3(0, 50, 0);

    let offset = new THREE.Vector3(
      ROTATE_RADIUS * Math.cos(ROTATE_SPEED * this.time),
      60,
      ROTATE_RADIUS * Math.sin(ROTATE_SPEED * this.time)
    );

    this.dolly.position.copy(center.clone().add(offset));
    this.camera.lookAt(center);
  }

  onEnter() {
    version.style.display = "none";
    PAUSE_BUTTON.style.display = "none";
    vj.disable();
  }

  onLeave() {
    super.onLeave();
  }

  draw() {
    this.renderer.render(this.scene, this.camera);
  }
}
