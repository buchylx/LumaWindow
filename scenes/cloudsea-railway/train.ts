import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { createLighting } from "./lighting";

export const coachDimensions = { length: 68, bodyHeight: 13.5, count: 8 };
/** Authored side elevation: long coaches, arched roofs, quiet undercarriages. */
export function createPassengerTrain() {
  const group = new T.Group();
  // Body, roof, chassis, broad side light, brass, glass, shaded glass.
  const parts: T.BufferGeometry[][] = Array.from({ length: 7 }, () => []);
  function shape(layer: number, draw: (s: T.Shape) => void) {
    const s = new T.Shape();
    draw(s);
    s.closePath();
    parts[layer].push(new T.ShapeGeometry(s, 10));
  }
  function rect(layer: number, x: number, y: number, w: number, h: number) {
    const g = new T.PlaneGeometry(w, h);
    g.translate(x, y, 0);
    parts[layer].push(g);
  }
  function circle(layer: number, x: number, y: number, r: number) {
    const g = new T.CircleGeometry(r, 20);
    g.translate(x, y, 0);
    parts[layer].push(g);
  }
  for (let i = 0; i < coachDimensions.count; i++) {
    const x = -70 - i * 72;
    shape(0, (s) => {
      s.moveTo(x - 34, 7);
      s.lineTo(x + 34, 7);
      s.lineTo(x + 34, 19);
      s.quadraticCurveTo(x + 32, 20.5, x + 29, 20.5);
      s.lineTo(x - 29, 20.5);
      s.quadraticCurveTo(x - 34, 20.5, x - 34, 19);
    });
    shape(1, (s) => {
      s.moveTo(x - 35, 20);
      s.quadraticCurveTo(x - 32, 23.6, x - 27, 23.8);
      s.lineTo(x + 27, 23.8);
      s.quadraticCurveTo(x + 32, 23.6, x + 35, 20);
    });
    rect(3, x, 11.6, 65, 3.4);
    rect(4, x, 9.2, 65, 0.34);
    rect(2, x, 6.5, 69, 1.6);
    // Vestibules connect the bodies without separating them into bright boxes.
    rect(2, x - 36, 13.5, 4, 10);
    for (const end of [-1, 1]) {
      rect(2, x + end * 30, 15, 4.3, 10);
      rect(0, x + end * 30, 14, 3.1, 10);
      rect(6, x + end * 30, 17, 2, 3.2);
      const bogie = x + end * 23;
      circle(2, bogie - 3.4, 3.8, 2.6);
      circle(2, bogie + 3.4, 3.8, 2.6);
      rect(2, bogie, 5, 12, 2.7);
    }
    for (let j = 0; j < 9; j++) {
      const wx = x - 24 + j * 6;
      // Narrow mullions are implied by spacing, not bright outlines.
      rect(2, wx, 16.8, 4.5, 6.1);
      rect((i * 9 + j) % 7 === 0 ? 6 : 5, wx, 17, 3.7, 4.7);
      if ((i + j) % 4 === 0) rect(6, wx + 1.2, 17, 0.65, 4.6);
    }
    // End door and discreet roof vents, no luminous wheel rims.
    rect(1, x - 15, 24, 2.4, 0.65);
    rect(1, x + 15, 24, 2.4, 0.65);
  }
  // Low tender; coal is a subdued shallow silhouette.
  shape(0, (s) => {
    s.moveTo(-34, 7);
    s.lineTo(-6, 7);
    s.lineTo(-6, 20);
    s.lineTo(-30, 20);
    s.quadraticCurveTo(-34, 19, -34, 16);
  });
  shape(1, (s) => {
    s.moveTo(-30, 20);
    s.quadraticCurveTo(-20, 23, -8, 20);
  });
  rect(3, -20, 11.5, 23, 3);
  rect(2, -20, 6, 31, 2);
  for (const x of [-28, -21, -12]) circle(2, x, 4.3, 3);
  // Curved cab roof and long boiler create one horizontal silhouette.
  shape(0, (s) => {
    s.moveTo(-6, 7);
    s.lineTo(13, 7);
    s.lineTo(13, 24);
    s.lineTo(-6, 24);
  });
  shape(1, (s) => {
    s.moveTo(-9, 23);
    s.quadraticCurveTo(3, 28, 16, 23);
  });
  rect(2, 1.6, 19, 9.5, 8);
  rect(6, 1.6, 19.4, 7.1, 5.8);
  rect(0, 1.6, 19, 0.65, 7);
  shape(0, (s) => {
    s.moveTo(10, 10);
    s.lineTo(56, 10);
    s.quadraticCurveTo(64, 10, 64, 17);
    s.quadraticCurveTo(64, 23, 56, 23);
    s.lineTo(10, 23);
  });
  shape(3, (s) => {
    s.moveTo(12, 19);
    s.lineTo(59, 19);
    s.quadraticCurveTo(59, 22, 55, 22);
    s.lineTo(12, 22);
  });
  rect(1, 38, 11, 49, 2.1);
  for (const x of [23, 40, 55]) rect(4, x, 17, 0.4, 11);
  shape(0, (s) => {
    s.moveTo(50, 22);
    s.lineTo(55, 22);
    s.lineTo(55.8, 30);
    s.lineTo(49.8, 30);
  });
  rect(1, 52.8, 30, 7, 0.9);
  shape(0, (s) => {
    s.moveTo(25, 23);
    s.lineTo(25, 24.8);
    s.quadraticCurveTo(29, 29, 33, 24.8);
    s.lineTo(33, 23);
  });
  rect(2, 32, 7, 78, 2);
  for (const x of [17, 30, 43]) {
    circle(2, x, 5.5, 5);
    circle(0, x, 5.5, 3.6);
    rect(2, x, 5.5, 6.6, 0.7);
  }
  for (const x of [55, 63]) circle(2, x, 4, 2.7);
  rect(4, 30, 5.1, 28, 0.4);
  rect(2, 68, 8, 4, 1.4);
  rect(1, 65, 17, 2.4, 8);
  rect(5, 66, 19, 1.3, 1.8);
  const materials = parts.map(
    () =>
      new T.MeshBasicMaterial({
        transparent: true,
        vertexColors: true,
        depthTest: false,
        depthWrite: false,
      }),
  );
  const geometries = parts.map((list, i) => {
    const g = mergeGeometries(list);
    list.forEach((p) => p.dispose());
    // Broad tonal planes survive the distant viewing scale without fine moving trim.
    const position = g.getAttribute("position");
    const shades = new Float32Array(position.count * 3);
    for (let v = 0; v < position.count; v++) {
      const y = position.getY(v);
      const tone =
        i === 0
          ? 0.7 + Math.max(0, Math.min(1, (y - 7) / 17)) * 0.3
          : i === 3
            ? 0.72 + Math.max(0, Math.min(1, (y - 9) / 14)) * 0.28
            : i >= 5
              ? 0.78 + Math.max(0, Math.min(1, (y - 14) / 6)) * 0.22
              : 1;
      shades.set([tone, tone, tone], v * 3);
    }
    g.setAttribute("color", new T.BufferAttribute(shades, 3));
    const mesh = new T.Mesh(g, materials[i]);
    mesh.renderOrder = 48 + i;
    group.add(mesh);
    return g;
  });
  return {
    group,
    chimney: new T.Vector3(52.8, 31, 0),
    update(light: ReturnType<typeof createLighting>, veil: number) {
      const r = light.roles;
      [
        r.carriage,
        r.roof,
        r.undercarriage,
        r.carriageLight,
        r.brass,
        r.window,
        r.windowDim,
      ].forEach((c, i) => {
        materials[i].color.copy(c);
        if (i < 5) materials[i].color.lerp(light.colors[1], veil);
      });
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
