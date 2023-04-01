import { Cartesian2, Cartesian3, SceneTransforms } from "cesium";

export function infoBox(
  frameDiv: HTMLElement,
  cartesain: Cartesian2,
  info: string
) {
  const cartographic =
    window.Viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesain);
  const height = window.Viewer.scene.globe.getHeight(cartographic);

  const newCartesain = Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    height
  );

  let coordinates = SceneTransforms.wgs84ToWindowCoordinates(
    window.Viewer.scene,
    newCartesain
  );
  const infoDiv = document.createElement("div");
  infoDiv.className = "infoBox";
  infoDiv.innerHTML = info;
  frameDiv.appendChild(infoDiv);
  positionPopUp(coordinates, infoDiv);

  const listenerEvt = () => {
    const new_cartesain = Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      window.Viewer.scene.globe.getHeight(cartographic)
    );
    const changeCoordinates = SceneTransforms.wgs84ToWindowCoordinates(
      window.Viewer.scene,
      new_cartesain
    );
    if (
      coordinates &&
      changeCoordinates &&
      coordinates.x &&
      changeCoordinates.x &&
      coordinates.y &&
      changeCoordinates.y
    ) {
      if (
        coordinates.x !== changeCoordinates.x ||
        coordinates.y !== changeCoordinates.y
      ) {
        positionPopUp(changeCoordinates, infoDiv);
        coordinates = changeCoordinates;
      }
    }
  };
  window.Viewer.scene.postRender.addEventListener(listenerEvt);
  return { infoDiv, listenerEvt };
}

function positionPopUp(coordinates: Cartesian2, infoDiv: HTMLDivElement) {
  const x = coordinates.x - infoDiv.offsetWidth / 2;
  const y = coordinates.y - infoDiv.offsetHeight - 65;
  infoDiv.style.left = x + "px";
  infoDiv.style.top = y + "px";
}
