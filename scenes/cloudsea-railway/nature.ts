import * as T from "three";
import { fogAtDepth, layerOrder } from "./depth";
import { createJourney, regionLength, journeyColumns } from "./journey";
import type { Params } from "./params";
import type { createLighting } from "./lighting";

// Continuous world coordinates, not a collection of pre-drawn silhouettes.
// Each octave adds a different scale of contour; the same field is sampled for
// pigment and lighting so that colour follows the form rather than floating on it.
const noise = `
float hash(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fb(vec2 p){float v=.52*n(p);p=mat2(.8,-.6,.6,.8)*p*2.07+17.2;v+=.26*n(p);p=p*2.03+7.6;v+=.13*n(p);return v+.065*n(p*2.01+11.);}
float contour(vec2 p){return fb(p+vec2(n(p*.37+5.),n(p*.43-9.))*1.7);}
`;
const vertex = `varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy*2.,0.,1.);}`;
interface Layer {
  kind: "cloud" | "mountain";
  y: number;
  height: number;
  scale: number;
  depth: number;
  haze: number;
  seed: number;
}
export const natureLayers: readonly Layer[] = [
  {
    kind: "mountain",
    y: -265,
    height: 320,
    scale: 140,
    depth: 0.035,
    haze: 0.4,
    seed: 12,
  },
  {
    kind: "cloud",
    y: -112,
    height: 44,
    scale: 250,
    depth: 0.05,
    haze: 0.25,
    seed: 27,
  },
  {
    kind: "mountain",
    y: -340,
    height: 450,
    scale: 180,
    depth: 0.08,
    haze: 0.27,
    seed: 34,
  },
  {
    kind: "cloud",
    y: -345,
    height: 630,
    scale: 390,
    depth: 0.14,
    haze: 0.06,
    seed: 51,
  },
  {
    kind: "mountain",
    y: -355,
    height: 370,
    scale: 360,
    depth: 0.22,
    haze: 0.14,
    seed: 39,
  },
  {
    kind: "cloud",
    y: -285,
    height: 220,
    scale: 245,
    depth: 0.32,
    haze: 0.08,
    seed: 67,
  },
  {
    kind: "mountain",
    y: -490,
    height: 390,
    scale: 295,
    depth: 0.48,
    haze: 0.08,
    seed: 63,
  },
  {
    kind: "cloud",
    y: -375,
    height: 260,
    scale: 210,
    depth: 0.7,
    haze: 0.03,
    seed: 76,
  },
  {
    kind: "cloud",
    y: -545,
    height: 370,
    scale: 240,
    depth: 1.35,
    haze: 0.01,
    seed: 89,
  },
  {
    kind: "mountain",
    y: -880,
    height: 850,
    scale: 280,
    depth: 1.85,
    haze: 0,
    seed: 104,
  },
  {
    kind: "cloud",
    y: -740,
    height: 370,
    scale: 250,
    depth: 2.4,
    haze: 0,
    seed: 117,
  },
];

export function createNature(geometry: T.PlaneGeometry, seed: number) {
  const group = new T.Group();
  const journey = createJourney(
    seed,
    natureLayers.map((l) => l.depth),
  );
  const mats = natureLayers.map((cfg, row) => {
    const mat = new T.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        bounds: { value: new T.Vector2(889, 500) },
        travel: { value: 0 },
        journeyMap: { value: journey.texture },
        journeyStart: { value: 0 },
        journeyRow: { value: (row + 0.5) / natureLayers.length },
        depth: { value: cfg.depth },
        lightDirection: { value: new T.Vector2(0.5, 0.7) },
        seed: { value: (seed % 8191) * 0.71 + cfg.seed },
        base: { value: cfg.y },
        height: { value: cfg.height },
        size: { value: cfg.scale },
        amount: { value: 0.64 },
        shape: { value: 0.6 },
        fog: { value: cfg.haze },
        night: { value: 0 },
        shadow: { value: new T.Color() },
        body: { value: new T.Color() },
        light: { value: new T.Color() },
        haze: { value: new T.Color() },
        near: { value: cfg.depth >= 1.8 ? 1 : 0 },
        warmth: { value: 0 },
      },
      vertexShader: vertex,
      fragmentShader: `precision highp float;
        varying vec2 uvScreen;uniform vec2 bounds,lightDirection;
        uniform float travel,seed,base,height,size,amount,shape,fog,night,near,warmth,depth;
        uniform sampler2D journeyMap;uniform float journeyStart,journeyRow;
        uniform vec3 shadow,body,light,haze;
        ${noise}
        void main(){
          vec2 w=(uvScreen-.5)*bounds*2.;w.x+=travel;
          // Morph rules by world position, not wall time: objects never change in place.
          float regionX=w.x/${regionLength.toFixed(1)},cell=floor(regionX),f=fract(regionX);
          vec4 regionA=texture2D(journeyMap,vec2((cell-journeyStart+.5)/${journeyColumns.toFixed(1)},journeyRow));
          vec4 regionB=texture2D(journeyMap,vec2((cell-journeyStart+1.5)/${journeyColumns.toFixed(1)},journeyRow));
          vec4 terrain=mix(regionA,regionB,f*f*(3.-2.*f));
          vec2 p=vec2(w.x/size+seed,(w.y-base)/size);
          float ridge=n(vec2(p.x*.47,seed+9.));
          ${
            cfg.kind === "cloud"
              ? `
          // A wide weather envelope carries smaller lobes. The same lobes
          // define the boundary and its painted light, rather than a noise overlay.
          float weather=n(vec2(p.x*.39,seed+9.));
          float tower=pow(smoothstep(.30,.85,weather),2.2);
          float lift=(.12+tower*(.32+shape*1.12))*(.5+terrain.y*.8);
          if(depth>1.)lift=.10+1.02*smoothstep(.0,1.6,lift);
          float top=base+height*lift+(amount-.64)*(depth>1.?140.:290.);
          vec2 q=p*vec2(3.4,3.8);
          q+=vec2(n(q*.31+seed),n(q*.27-seed))*1.25;
          float billow=fb(q+seed);
          float grain=fb(q*4.3+seed);
          float bulk=(top-w.y)/size;
          float edge=bulk+(billow-.5)*.85+(grain-.5)*.065;
          float aa=max(fwidth(edge),.003);
          if(edge < -aa)discard;
          float alpha=smoothstep(-aa,aa,edge);
          // Painted light follows a displaced copy of the same continuous density.
          // Large cool undersides sit below small warm highlights, without shiny cells.
          float sunward=fb(q-lightDirection*.48+seed);
          float illumination=(billow-sunward)*1.7+.53;
          illumination-=smoothstep(.06,1.45,bulk)*.20;
          illumination+=(grain-.5)*.13;
          float middle=smoothstep(.16,.52,illumination);
          float lit=smoothstep(.57,.78,illumination);
          vec3 col=mix(shadow,body,middle);col=mix(col,light,lit*.75);
          float rim=(1.-smoothstep(.025,.13,edge));
          col=mix(col,light,rim*smoothstep(.32,.62,illumination)*.65);
          `
              : `
          // Intersecting ridges and shoulders with open valleys. A single
          // continuous height field is sampled in world space, including near hills.
          float broad=n(vec2(p.x*.51,seed+5.));
          float ridgeA=1.-abs(2.*n(vec2(p.x*1.05,seed+11.))-1.);
          float ridgeB=n(vec2(p.x*2.7,seed+3.));
          float massif=pow(broad,1.5)*.65+ridgeA*.31+ridgeB*.12;
          massif*=.65+terrain.z*.65;
          if(near>.5)massif=pow(smoothstep(.42,.87,broad),2.8)*.93;
          float top=base+height*massif;
          top+=(fb(vec2(p.x*7.,seed))-.5)*height*.035;
          float edge=top-w.y;
          float aa=max(fwidth(edge),.65);
          if(edge < -aa)discard;
          float alpha=smoothstep(-aa,aa,edge);
          float below=(top-w.y)/height;
          // Angular, broad washes follow oblique ridges, not vertical blurred stripes.
          vec2 rock=vec2(p.x*2.4+p.y*.7,p.y*2.1);
          float facet=n(rock+seed)*.6+n(rock*2.2+7.)*.3;
          float direction=lightDirection.x*(n(vec2(p.x*2.,seed+1.))-.5);
          float face=smoothstep(.34,.54,facet+direction*.2-below*.08);
          vec3 col=mix(shadow,body,face);
          col=mix(col,light,smoothstep(.62,.74,facet+direction*.15)*.25);
          // A faint vein is a broad value change, never a thin moving line.
          col=mix(col,shadow,smoothstep(.5,.95,below)*.16);
          `
          }
          col*=vec3(1.+warmth*.13,1.,1.-warmth*.12);
          col=mix(col,haze,clamp(fog*(.40+.48*(1.-smoothstep(-380.,60.,w.y))),0.,.96));
          gl_FragColor=vec4(col,alpha);
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new T.Mesh(geometry, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = layerOrder(cfg.depth);
    group.add(mesh);
    return mat;
  });
  return {
    group,
    update(
      distance: number,
      halfWidth: number,
      halfHeight: number,
      params: Params,
      lighting: ReturnType<typeof createLighting>,
    ) {
      const [, horizon, shadow, body, light, rockDark, rockLight] =
        lighting.colors;
      journey.update(distance);
      mats.forEach((mat, i) => {
        const cfg = natureLayers[i],
          u = mat.uniforms;
        u.bounds.value.set(halfWidth, halfHeight);
        u.travel.value = distance * cfg.depth;
        u.journeyStart.value = journey.starts[i];
        u.amount.value = params.clouds;
        u.shape.value = params.cloudShape;
        u.fog.value = fogAtDepth(params.fog, cfg.depth, cfg.haze * 0.12);
        u.lightDirection.value.set(lighting.lightX, lighting.lightY);
        u.night.value = lighting.night;
        u.warmth.value =
          params.palette === "warm" ? 1 : params.palette === "blue" ? -1 : 0;
        const roles = lighting.roles;
        if (cfg.kind === "cloud") {
          u.shadow.value
            .copy(cfg.depth > 1 ? roles.cloudNearShade : roles.cloudFarShade)
            .lerp(shadow, cfg.depth > 0.1 && cfg.depth < 1 ? 0.7 : 0);
          u.body.value.copy(cfg.depth > 1 ? roles.cloudNearBody : body);
          if (cfg.depth > 1) u.body.value.lerp(shadow, 0.22);

          u.light.value.copy(light).lerp(body, cfg.depth < 0.1 ? 0.15 : 0);
        } else {
          u.shadow.value.copy(
            cfg.depth > 1
              ? roles.rockNear
              : cfg.depth < 0.1
                ? roles.rockFar
                : rockDark,
          );
          u.body.value
            .copy(
              cfg.depth > 1
                ? roles.rockMiddle
                : cfg.depth < 0.1
                  ? roles.rockFar
                  : rockLight,
            )
            .lerp(u.shadow.value, cfg.depth > 1 ? 0.7 : 0.12);
          if (cfg.depth < 0.1) u.body.value.lerp(rockLight, 0.32);
          u.light.value
            .copy(cfg.depth > 1 ? roles.rockMiddle : rockLight)
            .lerp(body, cfg.depth < 0.1 ? 0.16 : 0.09);
        }
        u.haze.value
          .copy(cfg.kind === "cloud" ? horizon : lighting.colors[0])
          .lerp(horizon, cfg.kind === "cloud" ? 0 : 0.22);
      });
    },
    dispose() {
      mats.forEach((m) => m.dispose());
      journey.dispose();
    },
  };
}

export function createSky(geometry: T.PlaneGeometry, seed: number) {
  const material = new T.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      top: { value: new T.Color() },
      horizon: { value: new T.Color() },
      light: { value: new T.Color() },
      lightDirection: { value: new T.Vector2(0.5, 0.7) },
      night: { value: 0 },
      bounds: { value: new T.Vector2(889, 500) },
      travel: { value: 0 },
      seed: { value: seed % 8191 },
    },
    vertexShader: vertex,
    fragmentShader: `precision highp float;varying vec2 uvScreen;uniform vec3 top,horizon,light;uniform float night,travel,seed;uniform vec2 bounds,lightDirection;${noise}
    void main(){vec2 p=(uvScreen-.5)*bounds*2.;
      vec3 col=mix(horizon,top,smoothstep(-170.,500.,p.y));
      vec2 q=vec2((p.x+travel)/470.+seed,p.y/42.);
      float wisps=contour(q+vec2(n(q*.4),0.));
      float breakUp=smoothstep(.3,.65,n(q*vec2(1.6,.25)+8.));
      float veil=smoothstep(.56,.69,wisps)*breakUp*smoothstep(-60.,180.,p.y);
      col=mix(col,light,veil*.27);
      float clearOpening=exp(-pow((p.x-lightDirection.x*600.)/750.,2.));
      col=mix(col,horizon,clearOpening*.10*(1.-smoothstep(-120.,260.,p.y)));
      vec2 s=vec2(p.x,p.y)*.14;float star=step(.989,hash(floor(s)+seed))*(1.-smoothstep(.02,.12,length(fract(s)-.5)));
      col=mix(col,light,star*night*.6*smoothstep(20.,200.,p.y));
      gl_FragColor=vec4(col,1.);
      #include <colorspace_fragment>
    }`,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return { mesh, material };
}

export function createSteamMaterial() {
  return new T.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      opacity: { value: 0 },
      seed: { value: 0 },
      color: { value: new T.Color() },
    },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float opacity,seed;uniform vec3 color;${noise}
    void main(){vec2 p=vUv*2.-1.;float d=length(p)+(.5-fb(p*4.+seed))*.6;float a=(1.-smoothstep(.57,.92,d))*opacity;gl_FragColor=vec4(color,a);
    #include <colorspace_fragment>
    }`,
  });
}
