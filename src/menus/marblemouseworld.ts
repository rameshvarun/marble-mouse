import Scene from "../scene";
import Game from "../game";

import * as THREE from "three";
import { irisWipeIn, irisWipeOut } from "../transition";
import { input, vj } from "../input";
import { loadGLTF, setCastShadows, setReceiveShadows } from "../utils";
import MainMenu from "./mainmenu";
import ScoreKeeper from "../scorekeeper";
import { container } from "./common";
import { DirectionalUINavigator } from "./directional-navigator";
import { RootMenu } from "./mainmenu/rootmenu";
import { BACK_SFX } from "../sound";

const UI_CONTAINER = document.getElementById("ui-container")!;

const INDEX_ROOT = "https://rameshvarun.github.io/marble-mouse-world";

const version = document.getElementById("version")!;

const PAUSE_BUTTON = document.getElementById(
  "pause-button"
)! as HTMLImageElement;

export default class MarbleMouseWorld extends Scene {
  background: THREE.Group = new THREE.Group();
  dolly: THREE.Group = new THREE.Group();

  navigator?: DirectionalUINavigator;

  constructor(game: Game) {
    super(game);

    this.addLights(this.scene);
    this.scene.add(this.background);

    this.scene.add(this.dolly);
    this.dolly.add(this.camera);
  }

  onEnter() {
    version.style.display = "none";
    PAUSE_BUTTON.style.display = "none";
    vj.disable();

    UI_CONTAINER.innerHTML = container(``);

    document.getElementById("back-button")!.onclick = () => {
      BACK_SFX.play();
      this.startTransition(new MainMenu(this.game, RootMenu));
    };

    this.loadScene();
    this.populateData();
  }

  async loadScene() {
    // Load background.
    let backgroundGLTF = await loadGLTF(
      require("../assets/backgrounds/mouse-world.glb")
    );
    backgroundGLTF.scene.scale.set(40, 40, 40);
    this.background.add(backgroundGLTF.scene);

    let fg = this.scene.getObjectByName("Foreground")!;
    setCastShadows(fg);
    setReceiveShadows(fg);

    irisWipeIn();
  }

  async populateData() {
    let response = await fetch(`${INDEX_ROOT}/courses.json`);
    let data = await response.json();

    let list = document.getElementById("container-content")!;
    for (let course of data) {
      list.innerHTML += `<div style="color: white; padding: 5px; border: 1px solid white; border-radius: 4px; margin-bottom: 10px;">
          <div style="display: grid; grid-template-columns: 1fr 3fr;">
            <div style="grid-column: 1;">
                <div style="background-color: black; background-image: url('${INDEX_ROOT}/${course.id}/thumbnail.png'); background-size: cover; width: 100%; padding-top: 100%; border-radius: 4px;"></div>
            </div>
            <div style="grid-column: 2; padding-left: 10px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div><span class="course-title">${course.name}</span></div>
                  <div><span>by ${course.author}</span></div>
                  <p>${course.description}</p>
                </div>
                <div><button id="${course.id}-play-button" class="play-course-button">PLAY</button></div>
            </div>
            </div>
          </div>
        </div>`;
    }

    this.navigator = new DirectionalUINavigator(
      data.map(course => document.getElementById(`${course.id}-play-button`)!)
    );

    for (let course of data) {
      document.getElementById(`${course.id}-play-button`)!.onclick = () => {
        this.startTransition(() => {
          this.game.playWorldCourse(
            course,
            new ScoreKeeper(course.parTime, course.parDeaths),
            course.levels.map(l => `${INDEX_ROOT}/${course.id}/${l}`),
            () => {
              this.game.transitionTo(new MarbleMouseWorld(this.game));
            }
          );
        });
      };
    }
  }

  time: number = 0;
  update(dt: number) {
    this.time += dt;

    if (input.back()) {
      document.getElementById("back-button")!.click();
    }
    let movement = input.movement(this.renderer.xr.getSession());
    this.navigator?.update(movement);

    const ROTATE_SPEED = 0.2;
    const ROTATE_RADIUS = 120;

    let center = new THREE.Vector3(0, 0, 0);

    if (this.game.isXR()) {
      let offset = new THREE.Vector3(
        center.x + ROTATE_RADIUS * 0.5,
        40,
        center.z + ROTATE_RADIUS * 0.5
      );
      let look = new THREE.Vector3(
        center.x + ROTATE_RADIUS * 2,
        40,
        center.z + ROTATE_RADIUS * 2
      );
      this.dolly.position.copy(offset);
      this.dolly.lookAt(look);
    } else {
      let offset = new THREE.Vector3(
        ROTATE_RADIUS * Math.cos(ROTATE_SPEED * this.time),
        40,
        ROTATE_RADIUS * Math.sin(ROTATE_SPEED * this.time)
      );

      this.dolly.position.copy(center.clone().add(offset));
      this.camera.lookAt(center);
    }
  }

  onLeave() {
    super.onLeave();
  }

  draw() {
    this.renderer.render(this.scene, this.camera);
  }
}
