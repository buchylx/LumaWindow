import * as T from "three";
import type {
  CreateContext,
  Frame,
  SceneInstance,
  Viewport,
} from "../../packages/scene-sdk/src";
import { random } from "../../packages/scene-sdk/src";
import { validateParams, type Params } from "./params";
import { celestialOrbit } from "./celestial";
import { DayCycle } from "./day-cycle";
import { createLighting } from "./lighting";
import { createRailway } from "./railway";
import { skyOffset } from "./depth";
import { createNature, createSky, createSteamMaterial } from "./nature";

interface SavedState {
  phase: number;
  distance: number;
  seed: number;
  windDistance?: number;
}
function isState(value: unknown): value is SavedState {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedState;
  return [v.phase, v.distance, v.seed].every(Number.isFinite);
}
export async function create(c: CreateContext): Promise<SceneInstance> {
  if (c.signal.aborted) throw Error("场景加载已取消");
  const renderer = new T.WebGLRenderer({
    canvas: c.canvas,
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  const releases: (() => void)[] = [() => renderer.dispose()];
  let disposed = false;
  function own<R extends { dispose(): void }>(resource: R): R {
    releases.push(() => resource.dispose());
    return resource;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (let i = releases.length - 1; i >= 0; i--) releases[i]();
  }
  try {
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.setClearColor("#162038");
    const scene = new T.Scene(),
      camera = new T.OrthographicCamera(-889, 889, 500, -500, 0.1, 2000);
    camera.position.z = 1000;
    const geometry = own(new T.PlaneGeometry(1, 1)),
      disc = own(new T.CircleGeometry(1, 80));
    const nature = own(createNature(geometry, c.seed)),
      sky = createSky(geometry, c.seed),
      railway = own(createRailway());
    own(sky.material);
    scene.add(sky.mesh, nature.group, railway.group);
    const params = { ...c.params };
    let target = { ...params },
      viewport = c.viewport;
    const saved = isState(c.state) ? c.state : undefined,
      clock = new DayCycle(params, saved?.phase),
      lighting = createLighting();
    let windDistance = Number.isFinite(saved?.windDistance)
      ? saved!.windDistance!
      : 0;
    let distance = saved?.seed === c.seed ? saved.distance : 0,
      lastElapsed = c.elapsed ?? 0,
      elapsed = lastElapsed;
    let halfWidth = 889,
      halfHeight = 500,
      zoom = 1;
    const sunMat = new T.MeshBasicMaterial({
      color: "#fff2cd",
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const moonMat = new T.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: { opacity: { value: 0 } },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv;uniform float opacity;void main(){vec2 q=vUv*2.-1.;float a=1.-smoothstep(.98,1.,length(q));
    float spots=0.;
    for(int i=0;i<14;i++){float k=float(i);vec2 centre=vec2(sin(k*17.13),sin(k*43.71))*.76;float r=.10+fract(sin(k*7.31)*431.7)*.22;spots+= (1.-smoothstep(r*.4,r,length(q-centre)))*.13;}
    vec3 col=mix(vec3(.84,.91,1.),vec3(.39,.52,.72),min(.72,spots*1.7));
    gl_FragColor=vec4(col,a*opacity);
    #include <colorspace_fragment>
    }`,
    });
    own(sunMat);
    own(moonMat);
    const sun = new T.Mesh(disc, sunMat),
      moon = new T.Mesh(geometry, moonMat);
    sun.renderOrder = -80;
    moon.renderOrder = -80;
    scene.add(sun, moon);
    const smokeRandom = random(c.seed + 521);
    const smoke = Array.from({ length: 14 }, (_, i) => {
      const mat = own(createSteamMaterial());
      mat.uniforms.seed.value = i * 17 + (c.seed % 311);
      const mesh = new T.Mesh(geometry, mat);
      mesh.renderOrder = 55;
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, age: -1, life: 10, x: 0, y: 0, size: 18 };
    });
    let smokeTimer = 0,
      smokeIndex = 0;
    function paint(blend = 1) {
      lighting.update(clock.phase, blend);
      const [top, horizon, , , light] = lighting.colors;
      const u = sky.material.uniforms;
      u.top.value.copy(top);
      u.horizon.value.copy(horizon);
      u.light.value.copy(light);
      u.night.value = lighting.night;
      u.lightDirection.value.set(lighting.lightX, lighting.lightY);
      u.travel.value = skyOffset(distance, windDistance);
      u.bounds.value.set(halfWidth, halfHeight);
      nature.update(distance, halfWidth, halfHeight, params, lighting);
      const orbit = celestialOrbit(clock.phase);
      const place = (mesh: T.Mesh, body: { x: number; altitude: number }) =>
        mesh.position.set(body.x * 790, -90 + body.altitude * 455, 0);
      place(sun, orbit.sun);
      place(moon, orbit.moon);
      sun.scale.setScalar(35);
      sunMat.opacity = orbit.sunOpacity;
      moon.scale.set(83, 83, 1);
      moonMat.uniforms.opacity.value = orbit.moonOpacity;
      railway.update(distance, halfWidth, params.framing, lighting, params.fog);
      smoke.forEach((s) =>
        s.mesh.material.uniforms.color.value.copy(lighting.roles.steam),
      );
    }
    function projection() {
      zoom = 0.75 + params.framing * 0.6;
      const aspect = Math.max(1.45, viewport.aspect);
      halfWidth = (500 * aspect) / zoom;
      halfHeight = 500 / zoom;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    }
    function resize(v: Viewport) {
      viewport = v;
      renderer.setSize(v.pixelWidth, v.pixelHeight, false);
      const h = Math.min(v.pixelHeight, Math.round(v.pixelWidth / 1.45));
      renderer.setViewport(
        0,
        Math.floor((v.pixelHeight - h) / 2),
        v.pixelWidth,
        h,
      );
      projection();
      paint();
    }
    function update(f: Frame) {
      clock.advance(Math.max(0, f.elapsed - lastElapsed));
      lastElapsed = f.elapsed;
      elapsed = f.elapsed;
      const ease = f.delta === 0 ? 1 : 1 - Math.exp(-f.delta * 1.5);
      for (const key of [
        "clouds",
        "fog",
        "speed",
        "cloudShape",
        "framing",
      ] as const)
        params[key] += (target[key] - params[key]) * ease;
      params.palette = target.palette;
      // The camera follows the distant train. Every stationary layer moves left;
      // depth controls its rate, with no screen-pinned foreground decorations.
      const motion = f.reducedMotion ? 0.25 : f.phase === "focus" ? 0.5 : 1;
      distance += f.delta * params.speed * 125 * motion;
      windDistance += f.delta * 2.2 * motion;
      projection();
      paint(ease);
      smokeTimer += f.delta * motion;
      if (smokeTimer > 0.8 + Math.max(0, Math.sin(elapsed * 0.22)) * 0.8) {
        smokeTimer = 0;
        const s = smoke[smokeIndex++ % smoke.length];
        s.age = 0;
        s.life = 11 + smokeRandom() * 3;
        s.x = railway.chimney.x;
        s.y = railway.chimney.y;
        s.size = 10 + smokeRandom() * 4;
      }
      for (const s of smoke) {
        if (s.age < 0) continue;
        s.age += f.delta * motion;
        const t = s.age / s.life;
        if (t >= 1) {
          s.age = -1;
          s.mesh.visible = false;
          continue;
        }
        s.mesh.visible = true;
        s.mesh.position.set(
          s.x - s.age * (13 + params.speed * 34),
          s.y + s.age * 3.2 + Math.sin(s.age * 0.55) * 1.3,
          0,
        );
        s.mesh.scale.set(
          s.size * (1.8 + t * 4.8),
          s.size * (0.65 + t * 1.5),
          1,
        );
        s.mesh.material.uniforms.opacity.value = Math.sin(Math.PI * t) * 0.53;
      }
    }
    resize(c.viewport);
    return {
      resize,
      update,
      setParams(p: Params) {
        target = validateParams(p);
        clock.configure(target);
      },
      render() {
        if (!disposed) renderer.render(scene, camera);
      },
      captureState() {
        return { phase: clock.phase, distance, seed: c.seed, windDistance };
      },
      dispose,
      stats() {
        return {
          ...renderer.info.memory,
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          phase: clock.phase,
          distance,
          skyWind: windDistance,
        };
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
