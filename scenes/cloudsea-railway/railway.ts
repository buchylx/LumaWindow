import * as T from "three";
import { fogAtDepth, railwayDepth } from "./depth";
import { createPassengerTrain } from "./train";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { createLighting } from "./lighting";

/** Artificial structures share precise architectural modules; nature does not. */
export function createRailway() {
  const group = new T.Group(),
    passengerTrain = createPassengerTrain(),
    train = passengerTrain.group;
  group.add(train);
  const materials = Array.from(
    { length: 4 },
    () =>
      new T.MeshBasicMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
  );
  const [stone, stoneLight, mortar, iron] = materials;
  const geometries: T.BufferGeometry[] = [];
  const bridgeParts: T.BufferGeometry[][] = [[], [], [], []];
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
  const chimney = new T.Vector3(),
    matrix = new T.Matrix4();
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
      train.scale.setScalar(0.82);
      chimney
        .copy(passengerTrain.chimney)
        .multiplyScalar(0.82)
        .add(train.position)
        .add(group.position);
      stone.color.copy(light.colors[5]).lerp(light.colors[2], 0.4);
      stoneLight.color.copy(light.colors[6]).lerp(light.colors[4], 0.12);
      mortar.color.copy(stone.color).multiplyScalar(0.83);
      iron.color.copy(light.colors[5]).multiplyScalar(0.63);
      const veil = fogAtDepth(fog, railwayDepth) * 0.28;
      passengerTrain.update(light, veil);
      for (const mat of [stone, stoneLight, mortar, iron]) {
        mat.color.lerp(light.colors[1], veil);
      }
    },
    dispose() {
      bridges.forEach((m) => m.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      passengerTrain.dispose();
    },
  };
}
