import * as THREE from "three";
import { input } from "../input";
import { SWITCH_SFX } from "../sound";

export class DirectionalUINavigator {
  elements: Array<HTMLElement>;

  constructor(elements: Array<HTMLElement>) {
    this.elements = elements;

    for (let element of this.elements) {
      element.addEventListener("mouseenter", () => {
        this.elements.forEach(b => b.classList.remove("selected"));
        element.classList.add("selected");

        SWITCH_SFX.play();
      });
      element.addEventListener("mouseleave", () => {
        element.classList.remove("selected");
      });
    }
  }

  scrollTo(element: HTMLElement) {
    try {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      element.scrollIntoView(false);
    }
  }

  previousMovement: THREE.Vector2 = new THREE.Vector2();
  update(movement: THREE.Vector2) {
    if (movement.y > 0.5 && this.previousMovement.y < 0.5) {
      let currentSelection = this.elements.findIndex(b =>
        b.classList.contains("selected")
      );
      if (currentSelection === -1) {
        this.elements[this.elements.length - 1].classList.add("selected");
      } else {
        this.elements[currentSelection].classList.remove("selected");
        let nextButton =
          (currentSelection + this.elements.length - 1) % this.elements.length;
        this.elements[nextButton].classList.add("selected");

        this.scrollTo(this.elements[nextButton]);
      }

      SWITCH_SFX.play();
    }
    if (movement.y < -0.5 && this.previousMovement.y > -0.5) {
      let currentSelection = this.elements.findIndex(b =>
        b.classList.contains("selected")
      );
      if (currentSelection === -1) {
        this.elements[0].classList.add("selected");
      } else {
        this.elements[currentSelection].classList.remove("selected");
        let nextButton = (currentSelection + 1) % this.elements.length;
        this.elements[nextButton].classList.add("selected");

        this.scrollTo(this.elements[nextButton]);
      }

      SWITCH_SFX.play();
    }
    this.previousMovement = movement;

    if (input.select()) {
      let selection = this.elements.find(b => b.classList.contains("selected"));
      if (selection) {
        selection.click();
      }
    }
  }
}
