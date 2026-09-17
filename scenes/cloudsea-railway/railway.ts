import * as T from "three";
import { fogAtDepth, railwayDepth } from "./depth";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { createLighting } from "./lighting";

/** Artificial structures share precise architectural modules; nature does not. */
export function createRailway() {
  const group = new T.Group(),
    train = new T.Group();
  group.add(train);
  const materials = Array.from(
    { length: 8 },
    () =>
      new T.MeshBasicMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
  );
  const [stone, stoneLight, mortar, iron, body, trim, glass, roof] = materials;
  const geometries: T.BufferGeometry[] = [];
  const bridgeParts: T.BufferGeometry[][] = [[], [], [], []];
  const trainParts: T.BufferGeometry[][] = [[], [], [], []];
  function rect(
    parts: T.BufferGeometry[][],
    layer: number,
    x: number,
    y: number,
    w: number,
    h: number,
    angle = 0,
  ) {
    const g = new T.PlaneGeometry(w, h);
    g.rotateZ(angle);
    g.translate(x, y, 0);
    parts[layer].push(g);
  }
  function poly(
    parts: T.BufferGeometry[][],
    layer: number,
    points: number[][],
  ) {
    const s = new T.Shape();
    points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    parts[layer].push(new T.ShapeGeometry(s));
  }
  function circle(
    parts: T.BufferGeometry[][],
    layer: number,
    x: number,
    y: number,
    r: number,
  ) {
    const g = new T.CircleGeometry(r, 20);
    g.translate(x, y, 0);
    parts[layer].push(g);
  }
  function line(
    parts: T.BufferGeometry[][],
    layer: number,
    x: number,
    y: number,
    x2: number,
    y2: number,
    width: number,
  ) {
    rect(
      parts,
      layer,
      (x + x2) / 2,
      (y + y2) / 2,
      Math.hypot(x2 - x, y2 - y),
      width,
      Math.atan2(y2 - y, x2 - x),
    );
  }
  // Elliptical arch with tapered piers, cornice, individual voussoirs and coping.
  const span = 210,
    radius = 89,
    spring = -85;
  const arch = new T.Shape();
  arch.moveTo(-105, 0);
  arch.lineTo(105, 0);
  arch.lineTo(112, -420);
  arch.lineTo(84, -420);
  arch.lineTo(radius, spring);
  for (let j = 0; j <= 48; j++) {
    const a = (j / 48) * Math.PI;
    arch.lineTo(Math.cos(a) * radius, spring + Math.sin(a) * 65);
  }
  arch.lineTo(-84, -420);
  arch.lineTo(-112, -420);
  arch.closePath();
  bridgeParts[0].push(new T.ShapeGeometry(arch));
  rect(bridgeParts, 1, 0, -3, 210, 4);
  rect(bridgeParts, 2, 0, -9, 210, 1.2);
  for (let j = 0; j < 24; j++) {
    const a = (j / 24) * Math.PI,
      b = ((j + 1) / 24) * Math.PI;
    poly(bridgeParts, 1, [
      [Math.cos(a) * 89, spring + Math.sin(a) * 65],
      [Math.cos(b) * 89, spring + Math.sin(b) * 65],
      [Math.cos(b) * 95, spring + Math.sin(b) * 72],
      [Math.cos(a) * 95, spring + Math.sin(a) * 72],
    ]);
    line(
      bridgeParts,
      2,
      Math.cos(a) * 90,
      spring + Math.sin(a) * 66,
      Math.cos(a) * 96,
      spring + Math.sin(a) * 73,
      0.65,
    );
  }
  for (let row = 0; row < 17; row++) {
    const y = -27 - row * 23;
    const opening =
      y > spring
        ? radius * Math.sqrt(Math.max(0, 1 - ((y - spring) / 65) ** 2))
        : radius;
    const width = Math.max(0, 105 - opening - 2);
    rect(bridgeParts, 2, -(105 + opening + 2) / 2, y, width, 0.6);
    rect(bridgeParts, 2, (105 + opening + 2) / 2, y, width, 0.6);
  }
  rect(bridgeParts, 1, 99, -243, 2.2, 350);
  rect(bridgeParts, 3, 0, 2, 210, 1.5);
  rect(bridgeParts, 3, 0, 8, 210, 0.9);
  for (let j = 0; j < 21; j++) rect(bridgeParts, 3, -100 + j * 10, 5, 0.6, 6);
  // Ten narrow coaches: body height and train length deliberately independent.
  for (let i = 0; i < 10; i++) {
    const x = -61 - i * 52;
    poly(trainParts, 0, [
      [x - 24, 6],
      [x + 24, 6],
      [x + 24, 20],
      [x + 21, 23],
      [x - 21, 23],
      [x - 24, 20],
    ]);
    rect(trainParts, 3, x, 23, 47, 2.2);
    rect(trainParts, 1, x, 6, 49, 1.2);
    rect(trainParts, 1, x, 11, 47, 0.55);
    rect(trainParts, 1, x, 20.5, 45, 0.6);
    rect(trainParts, 0, x - 25, 8, 5, 1);
    rect(trainParts, 1, x - 21, 14, 0.65, 14);
    rect(trainParts, 1, x + 21, 14, 0.65, 14);
    for (let j = 0; j < 8; j++) {
      const wx = x - 17.5 + j * 5;
      rect(trainParts, 1, wx, 16.4, 3.8, 6.6);
      rect(trainParts, 2, wx, 16.6, 2.9, 5.3);
      rect(trainParts, 0, wx, 17, 0.3, 5.5);
    }
    for (const dx of [-16, -11, 11, 16]) {
      circle(trainParts, 0, x + dx, 3.6, 2.8);
      circle(trainParts, 1, x + dx, 3.6, 0.8);
    }
    rect(trainParts, 1, x - 13.5, 4, 9, 0.75);
    rect(trainParts, 1, x + 13.5, 4, 9, 0.75);
    rect(trainParts, 3, x - 13, 25, 3, 1.5);
    rect(trainParts, 3, x + 13, 25, 3, 1.5);
  }
  // Tender, cab, boiler bands, bell, chimney, buffers and cattle guard.
  poly(trainParts, 0, [
    [-36, 6],
    [-10, 6],
    [-9, 22],
    [-35, 22],
  ]);
  poly(trainParts, 3, [
    [-34, 22],
    [-31, 25],
    [-28, 24],
    [-23, 26],
    [-18, 24],
    [-11, 23],
  ]);
  rect(trainParts, 1, -23, 12, 22, 0.7);
  rect(trainParts, 1, -23, 21, 28, 1.2);
  poly(trainParts, 0, [
    [-9, 6],
    [10, 6],
    [10, 29],
    [-9, 29],
  ]);
  rect(trainParts, 3, 0, 30, 24, 2.2);
  rect(trainParts, 1, 0, 23, 12, 9);
  rect(trainParts, 2, 0, 23, 9, 6.5);
  rect(trainParts, 0, 0, 23, 0.7, 7);
  rect(trainParts, 0, 27, 17, 38, 14);
  circle(trainParts, 0, 46, 17, 7);
  rect(trainParts, 1, 29, 22.2, 34, 1.1);
  rect(trainParts, 3, 28, 11, 35, 1.3);
  for (const x of [17, 29, 41]) rect(trainParts, 1, x, 17, 0.9, 12.5);
  poly(trainParts, 0, [
    [36, 22],
    [41, 22],
    [42, 36],
    [35, 36],
  ]);
  rect(trainParts, 1, 38.5, 36, 10, 2);
  circle(trainParts, 0, 19, 26, 3.8);
  rect(trainParts, 0, 19, 24, 8, 5);
  rect(trainParts, 1, 27, 28, 4, 2);
  rect(trainParts, 1, 27, 25, 1, 4);
  rect(trainParts, 1, 20, 7, 69, 2);
  rect(trainParts, 0, 50, 8, 5, 2);
  poly(trainParts, 3, [
    [45, 7],
    [56, 1],
    [46, 1],
  ]);
  rect(trainParts, 1, 48, 21, 3, 5);
  rect(trainParts, 2, 50, 21, 1.8, 3);
  for (const [x, r] of [
    [-31, 3.5],
    [-16, 3.5],
    [10, 6],
    [23, 6],
    [36, 6],
    [46, 3],
  ] as const) {
    circle(trainParts, 0, x, 5, r);
    circle(trainParts, 1, x, 5, r * 0.75);
    circle(trainParts, 0, x, 5, r * 0.56);
    circle(trainParts, 1, x, 5, 0.7);
  }
  rect(trainParts, 1, 23, 4, 27, 0.8);
  const bridges: T.InstancedMesh[] = [];
  function batch(
    parts: T.BufferGeometry[][],
    mats: T.MeshBasicMaterial[],
    parent: T.Group,
    order: number,
    instanced = false,
  ) {
    parts.forEach((list, i) => {
      const g = mergeGeometries(list);
      list.forEach((p) => p.dispose());
      geometries.push(g);
      const mesh = instanced
        ? new T.InstancedMesh(g, mats[i], 40)
        : new T.Mesh(g, mats[i]);
      mesh.renderOrder = order + i;
      mesh.frustumCulled = false;
      parent.add(mesh);
      if (mesh instanceof T.InstancedMesh) bridges.push(mesh);
    });
  }
  batch(bridgeParts, [stone, stoneLight, mortar, iron], group, 40, true);
  batch(trainParts, [body, trim, glass, roof], train, 48);
  const chimney = new T.Vector3(),
    matrix = new T.Matrix4();
  const nightWindow = new T.Color("#ffd294"),
    dayWindow = new T.Color("#bfa089");
  return {
    group,
    train,
    chimney,
    update(
      distance: number,
      halfWidth: number,
      _framing: number,
      light: ReturnType<typeof createLighting>,
      fog = 0,
    ) {
      group.position.y = -140;
      const start = Math.floor((distance - halfWidth) / span) - 1;
      const count = Math.min(40, Math.ceil((halfWidth * 2) / span) + 4);
      for (let i = 0; i < count; i++) {
        matrix.makeTranslation((start + i) * span - distance, 0, 0);
        bridges.forEach((mesh) => mesh.setMatrixAt(i, matrix));
      }
      bridges.forEach((mesh) => {
        mesh.count = count;
        mesh.instanceMatrix.needsUpdate = true;
      });
      train.position.set(225, 3, 0);
      train.scale.setScalar(0.86);
      chimney.set(225 + 38.5 * 0.86, -140 + 3 + 37 * 0.86, 0);
      stone.color.copy(light.colors[5]).lerp(light.colors[2], 0.4);
      stoneLight.color.copy(light.colors[6]).lerp(light.colors[4], 0.12);
      mortar.color.copy(stone.color).multiplyScalar(0.83);
      iron.color.copy(light.colors[5]).multiplyScalar(0.63);
      body.color.copy(light.colors[5]).multiplyScalar(0.55);
      trim.color.copy(light.colors[6]).lerp(light.colors[4], 0.04);
      roof.color.copy(light.colors[5]).multiplyScalar(0.78);
      glass.color.copy(dayWindow).lerp(nightWindow, light.night);
      const veil = fogAtDepth(fog, railwayDepth) * 0.28;
      for (const mat of [stone, stoneLight, mortar, iron, body, trim, roof]) {
        mat.color.lerp(light.colors[1], veil);
      }
    },
    dispose() {
      bridges.forEach((m) => m.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
