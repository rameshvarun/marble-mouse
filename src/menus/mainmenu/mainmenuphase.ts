import { irisWipeIn, irisWipeOut } from "../../transition";
import MainMenu from ".";

export class MainMenuPhase {
  mainMenu: MainMenu;
  constructor(mainMenu: MainMenu) {
    this.mainMenu = mainMenu;
  }
  onEnter() {}
  onLeave() {}

  draw() {}

  update(dt: number) {}

  transitionStarted: boolean = false;
  startTransition(nextPhase: MainMenuPhase) {
    if (!this.transitionStarted) {
      this.transitionStarted = true;
      irisWipeOut().then(() => {
        this.mainMenu.transitionTo(nextPhase);
        irisWipeIn();
      });
    }
  }
}
