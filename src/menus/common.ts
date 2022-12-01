export function container(contents: string): string {
  return `<img id="back-button" style="position: absolute; cursor: pointer; z-index: 1; margin: 0.2em; width: 1.2em; font-size: 3rem;" src="${require("../assets/ui/back.svg")}"/>
    <div style="width: 100%; height: 100%; padding: 1.0em; box-sizing: border-box; display: flex; justify-content: center;">
      <div style="width: 100%; height: 100%; padding: 10px; box-sizing: border-box; max-width: 600px;">
        <div id="container-content" style="width: 100%; height: 100%; padding: 10px; box-sizing: border-box; overflow-y: scroll; background-color: rgba(0.0, 0.0, 0.0, 0.5);">
        ${contents}
        </div>
      </div>
    </div>`;
}
