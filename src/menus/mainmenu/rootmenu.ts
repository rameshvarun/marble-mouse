import { selectCustomLevel } from "../../custom-levels";
import { UI_CONTAINER } from "../../dom-elements";
import { input } from "../../input";
import { CourseSelect } from "./courseselect";
import { CreditsPhase } from "./credits";
import { DirectionalUINavigator } from "../directional-navigator";
import { MainMenuPhase } from "./mainmenuphase";
import MarbleMouseWorld from "../marblemouseworld";
import { OptionsPhase } from "./options";
import { CLICK_SFX } from "../../sound";

export class RootMenu extends MainMenuPhase {
  buttons: Array<HTMLButtonElement> = [];
  navigator?: DirectionalUINavigator;

  onEnter() {
    UI_CONTAINER.innerHTML = `
    <div style="width: 100%; height: 100%; padding: 1.0em; box-sizing: border-box; display: flex; justify-content: center;">
    <div style="width: 100%; max-width: 800px; height: 100%; color: white; display: flex; flex-direction: column; justify-content: center; align-items: stretch; box-sizing: border-box;">
      <button id="start-game-button" class="menu-button">START GAME</button>
      <button style="display: none;" id="marble-mouse-world-button" class="menu-button">MARBLE MOUSE WORLD</button>
      <div style="display: flex; flex-direction: row;">
        <button style="flex-grow: 1; display: none;" id="load-custom-level-button" class="menu-button">LOAD CUSTOM LEVEL</button>
        <button style="display: none;" id="custom-level-more-info-button" class="menu-button">?</button>
      </div>
      <button id="options-button" style="display: none;" class="menu-button">OPTIONS</button>
      <button id="credits-button" style="" class="menu-button">ABOUT</button>
      <button id="exit-button" style="display: none;" class="menu-button">EXIT</button>
      </div>
    </div>`;

    let startGameButton = document.getElementById(
      "start-game-button"
    )! as HTMLButtonElement;
    let marbleMouseWorldButton = document.getElementById(
      "marble-mouse-world-button"
    )! as HTMLButtonElement;
    let customLevelButton = document.getElementById(
      "load-custom-level-button"
    )! as HTMLButtonElement;
    let customLevelInfoButton = document.getElementById(
      "custom-level-more-info-button"
    )! as HTMLButtonElement;
    let optionsButton = document.getElementById(
      "options-button"
    )! as HTMLButtonElement;
    let creditsButton = document.getElementById(
      "credits-button"
    )! as HTMLButtonElement;
    let exitButton = document.getElementById(
      "exit-button"
    )! as HTMLButtonElement;

    customLevelButton.style.display = "inline";
    customLevelInfoButton.style.display = "inline";

    this.buttons = [
      startGameButton,
      marbleMouseWorldButton,
      customLevelButton,
      optionsButton,
      creditsButton,
      exitButton
    ].filter(b => b.style.display !== "none");

    this.navigator = new DirectionalUINavigator(this.buttons);

    document.getElementById("start-game-button")!.onclick = () => {
      CLICK_SFX.play();
      this.startTransition(new CourseSelect(this.mainMenu));
    };

    document.getElementById("load-custom-level-button")!.onclick = () => {
      CLICK_SFX.play();
      selectCustomLevel();
    };
    document.getElementById("custom-level-more-info-button")!.onclick = () => {
      CLICK_SFX.play();
      window.open("https://github.com/rameshvarun/marble-mouse-custom-mapping");
    };

    document.getElementById("marble-mouse-world-button")!.onclick = () => {
      CLICK_SFX.play();
      this.mainMenu.startTransition(new MarbleMouseWorld(this.mainMenu.game));
    };

    document.getElementById("credits-button")!.onclick = () => {
      CLICK_SFX.play();
      this.startTransition(new CreditsPhase(this.mainMenu));
    };

    document.getElementById("options-button")!.onclick = () => {
      CLICK_SFX.play();
      this.startTransition(new OptionsPhase(this.mainMenu));
    };
  }

  update() {
    let movement = input.movement(this.mainMenu.renderer.xr.getSession());
    this.navigator?.update(movement);
  }
}
