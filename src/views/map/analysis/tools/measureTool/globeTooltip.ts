import type { Cartesian2 } from "cesium";

export class GlobeTooltip {
  protected _frameDiv: HTMLElement | undefined;
  protected _div: HTMLElement;
  protected _titleDiv: HTMLElement;
  constructor(frameDiv: HTMLElement) {
    const div = document.createElement("div");
    div.className = "twipsy-right";
    div.style.position = "absolute";

    const arrow = document.createElement("div");
    arrow.className = "twipsy-arrow";
    div.appendChild(arrow);

    const title = document.createElement("div");
    title.className = "twipsy-inner";
    div.appendChild(title);

    frameDiv.appendChild(div);

    this._frameDiv = frameDiv;
    this._div = div;
    this._titleDiv = title;
  }
  setVisible(visible: boolean) {
    this._div.style.display = visible ? "block" : "none";
  }
  showAt(position: Cartesian2, message: string) {
    this.setVisible(true);
    this._titleDiv.innerHTML = message;
    this._div.style.left = position.x + 10 + "px";
    this._div.style.top = position.y - this._div.clientHeight / 2 + "px";
  }
  destory() {
    this._frameDiv?.removeChild(this._div);
    this._frameDiv = undefined;
  }
}
