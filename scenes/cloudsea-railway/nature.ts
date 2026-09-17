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
    y: -130,
    height: 430,
    scale: 640,
    depth: 0.035,
    haze: 0.78,
    seed: 12,
  },
  {
    kind: "cloud",
    y: -165,
    height: 65,
    scale: 260,
    depth: 0.06,
    haze: 0.55,
    seed: 27,
  },
  {
    kind: "mountain",
    y: -380,
    height: 630,
    scale: 440,
    depth: 0.24,
    haze: 0.44,
    seed: 39,
  },
  {
    kind: "cloud",
    y: -295,
    height: 460,
    scale: 350,
    depth: 0.18,
    haze: 0.13,
    seed: 51,
  },
  {
    kind: "mountain",
    y: -450,
    height: 510,
    scale: 350,
    depth: 0.36,
    haze: 0.26,
    seed: 63,
  },
  {
    kind: "cloud",
    y: -285,
    height: 260,
    scale: 220,
    depth: 0.55,
    haze: 0.13,
    seed: 76,
  },
  {
    kind: "cloud",
    y: -455,
    height: 290,
    scale: 230,
    depth: 1.35,
    haze: 0.08,
    seed: 89,
  },
  {
    kind: "mountain",
    y: -920,
    height: 970,
    scale: 320,
    depth: 1.85,
    haze: 0.03,
    seed: 104,
  },
  {
    kind: "cloud",
    y: -670,
    height: 370,
    scale: 230,
    depth: 2.4,
    haze: 0.02,
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
        varying vec2 uvScreen;uniform vec2 bounds;
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
          // Overlapping seeded billows build a new silhouette at every world
          // position. Their sizes and elevations follow the larger weather field.
          float top=base-100.;
          for(int j=-2;j<=2;j++){
            float cell=floor(p.x*2.)+float(j);
            float cx=(cell+.2+hash(vec2(cell,seed))*.6)*.5;
            float r=.36+hash(vec2(cell,seed+4.))*.3;
            float dx=p.x-cx;
            float tower=pow(smoothstep(.22,.87,n(vec2(cx*.47,seed+9.))),1.5);
            float cap=sqrt(max(0.,1.-dx*dx/(r*r)));
            float rise=height*(.03+tower*(.16+shape*1.08)*(.32+terrain.y*.95))+r*size*(.45+shape*.22);
            float clearance=depth>1.?65.*sin(cx*.9+seed):0.;
            top=max(top,base+(amount-.64)*(depth>1.?140.:370.)+(terrain.x-.55)*130.+rise*cap-clearance);

          }
          float rough=fb(p*18.+vec2(0,seed));
          float edge=top-w.y+(rough-.5)*size*.095;
          if(edge < -4.)discard;
          float alpha=smoothstep(-1.6,1.6,edge);
          // Rounded internal billows break into uneven pigment at the edges.
          // Broad connected pigment masses; no nine-neighbour exponential loop.
          float pigment=contour(p*3.8+vec2(seed,1.));
          float brush=fb(vec2(p.x*9.,p.y*11.)+seed);
          float form=clamp(edge/(size*(.72+shape*.35)),0.,1.);
          float shade=clamp(.91-form*.58+(pigment-.5)*.8+(brush-.5)*.13,0.,1.);
          float middle=smoothstep(.27,.45,shade),lit=smoothstep(.65,.75,shade);
          vec3 col=mix(shadow,body,middle);col=mix(col,light,lit);
          float rim=(1.-smoothstep(2.,10.,edge))*smoothstep(.50,.72,pigment);
          col=mix(col,light,rim*.2);
          // A low-frequency wash, not sparkle or animated grain.
          col=mix(col,col*vec3(1.035,.98,1.025),n(p*.7+seed)*.35);
          `
              : `
          // Ridged terrain with independent valleys. The near layer has long
          // openings between landforms, leaving the train visible most of the time.
          float rolling=.25+.56*n(vec2(p.x*.58,seed+12.))+.17*n(vec2(p.x*1.6,seed+8.));
          float spine=1.-abs(2.*n(vec2(p.x*.68,seed+3.))-1.);
          float chain=.10+.68*pow(spine,1.35)+.19*(1.-abs(2.*n(vec2(p.x*2.3,seed+3.))-1.));
          float islands=pow(smoothstep(.24,.82,ridge),2.1);
          float massif=mix(mix(rolling,chain,terrain.z),islands,terrain.w*.85);
          if(near>.5)massif=pow(smoothstep(.34,.82,ridge),2.3);
          float teeth=abs(n(vec2(p.x*4.1,seed+4.))-.5)*.13+abs(n(vec2(p.x*12.7,seed+2.))-.5)*.045;
          float top=base+height*(massif*(.56+terrain.z*.6)+teeth);
          float edge=top-w.y;
          if(edge < -2.)discard;
          float alpha=smoothstep(-1.2,1.2,edge);
          float strokes=fb(vec2(p.x*5.5+p.y*1.4,p.y*2.1)+seed);
          float face=strokes+n(vec2(p.x*9.+p.y*2.2,seed))*.16;
          vec3 col=mix(shadow,body,smoothstep(.32,.65,face)*.72);
          col=mix(col,light,smoothstep(.61,.76,face)*.38*(1.-near*.6));
          col=mix(col,shadow,smoothstep(80.,height,edge)*.24);
          `
          }
          col*=vec3(1.+warmth*.13,1.,1.-warmth*.12);
          col=mix(col,haze,clamp(fog*(.78+.22*(1.-smoothstep(-360.,180.,w.y))),0.,.96));
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
        u.fog.value = fogAtDepth(params.fog, cfg.depth, cfg.haze * 0.2);
        u.night.value = lighting.night;
        u.warmth.value =
          params.palette === "warm" ? 1 : params.palette === "blue" ? -1 : 0;
        const roles = lighting.roles;
        if (cfg.kind === "cloud") {
          u.shadow.value
            .copy(cfg.depth > 1 ? roles.cloudNearShade : roles.cloudFarShade)
            .lerp(shadow, cfg.depth > 0.1 && cfg.depth < 1 ? 0.7 : 0);
          u.body.value.copy(cfg.depth > 1 ? roles.cloudNearBody : body);
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
      night: { value: 0 },
      bounds: { value: new T.Vector2(889, 500) },
      travel: { value: 0 },
      seed: { value: seed % 8191 },
    },
    vertexShader: vertex,
    fragmentShader: `precision highp float;varying vec2 uvScreen;uniform vec3 top,horizon,light;uniform float night,travel,seed;uniform vec2 bounds;${noise}
    void main(){vec2 p=(uvScreen-.5)*bounds*2.;
      vec3 col=mix(horizon,top,smoothstep(-170.,500.,p.y));
      vec2 q=vec2((p.x+travel)/650.+seed,p.y/32.);
      float wisps=contour(q);float veil=smoothstep(.63,.70,wisps)*smoothstep(-40.,150.,p.y);
      col=mix(col,light,veil*.42);
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
