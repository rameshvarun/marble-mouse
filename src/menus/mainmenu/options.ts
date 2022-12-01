import { UI_CONTAINER } from "../../dom-elements";
import { container } from "../common";
import { MainMenuPhase } from "./mainmenuphase";
import { RootMenu } from "./rootmenu";

export class OptionsPhase extends MainMenuPhase {
  onEnter() {
    UI_CONTAINER.innerHTML = container(`
    <div>Pixel Ratio</div>
    <button>1.0</button>
    <button>Device</button>

    <button>Reset to Default</button>
    <button id="apply-changes">Apply Changes</button>
    `);

    document.getElementById("back-button")!.onclick = () => {
      this.startTransition(new RootMenu(this.mainMenu));
    };

    document.getElementById("apply-changes")!.onclick = () => {
      window.location.reload();
    };
  }
}
