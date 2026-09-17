import * as T from "three";
import { fogAtDepth, layerOrder } from "./depth";
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
    y: -90,
    height: 180,
    scale: 540,
    depth: 0.035,
    haze: 0.78,
    seed: 12,
  },
  {
    kind: "cloud",
    y: -75,
    height: 75,
    scale: 230,
    depth: 0.06,
    haze: 0.55,
    seed: 27,
  },
  {
    kind: "mountain",
    y: -380,
    height: 620,
    scale: 440,
    depth: 0.24,
    haze: 0.44,
    seed: 39,
  },
  {
    kind: "cloud",
    y: -230,
    height: 500,
    scale: 350,
    depth: 0.18,
    haze: 0.13,
    seed: 51,
  },
  {
    kind: "mountain",
    y: -480,
    height: 460,
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
    y: -900,
    height: 910,
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
  const mats = natureLayers.map((cfg) => {
    const mat = new T.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        bounds: { value: new T.Vector2(889, 500) },
        travel: { value: 0 },
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
        uniform float travel,seed,base,height,size,amount,shape,fog,night,near,warmth;
        uniform vec3 shadow,body,light,haze;
        ${noise}
        void main(){
          vec2 w=(uvScreen-.5)*bounds*2.;w.x+=travel;
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
            float rise=height*(.02+tower*(.25+shape*.94))+r*size*.82;
            top=max(top,base+(amount-.64)*290.+rise*cap);
          }
          float rough=fb(p*18.+vec2(0,seed));
          float edge=top-w.y+(rough-.5)*size*.095;
          if(edge < -4.)discard;
          float alpha=smoothstep(-1.6,1.6,edge);
          // Rounded internal billows break into uneven pigment at the edges.
          vec2 b=p*3.2+vec2(7.,seed),bi=floor(b),normal=vec2(0.);
          float weight=0.;
          for(int iy=-1;iy<=1;iy++)for(int ix=-1;ix<=1;ix++){
            vec2 cell=bi+vec2(float(ix),float(iy));
            vec2 centre=cell+vec2(hash(cell),hash(cell+43.7));
            vec2 d=b-centre;float dd=dot(d,d);
            float blend=exp(-dd*3.5);normal+=d*blend;weight+=blend;
          }
          normal/=max(.001,weight);
          float pigment=.53+normal.y*.5-normal.x*.3+(fb(p*9.+seed)-.5)*.28;
          float form=clamp(edge/(size*.8),0.,1.);
          float shade=clamp(.88-form*.49+(pigment-.5)*1.15,0.,1.);
          float band1=smoothstep(.20,.34,shade),band2=smoothstep(.42,.56,shade),band3=smoothstep(.70,.82,shade);
          vec3 col=mix(shadow,body,band1*.55);col=mix(col,body,band2*.72);col=mix(col,light,band3*.88);
          float rim=(1.-smoothstep(3.,15.,edge))*smoothstep(.38,.65,pigment);
          col=mix(col,light,rim*.28);
          // A low-frequency wash, not sparkle or animated grain.
          col=mix(col,col*vec3(1.035,.98,1.025),n(p*.7+seed)*.35);
          `
              : `
          // Ridged terrain with independent valleys. The near layer has long
          // openings between landforms, leaving the train visible most of the time.
          float massif=near>.5?pow(smoothstep(.29,.79,ridge),2.):pow(smoothstep(.10,.90,ridge),2.8);
          float teeth=abs(n(vec2(p.x*3.1,seed+4.))-.5)*.25+abs(n(vec2(p.x*10.7,seed+2.))-.5)*.10+abs(n(vec2(p.x*31.7,seed+7.))-.5)*.035;
          float top=base+height*(massif*.94+teeth);
          float edge=top-w.y;
          if(edge < -2.)discard;
          float alpha=smoothstep(-1.2,1.2,edge);
          float strokes=fb(vec2(p.x*5.5+p.y*1.4,p.y*2.1)+seed);
          float face=strokes+n(vec2(p.x*9.+p.y*2.2,seed))*.16;
          vec3 col=mix(shadow,body,smoothstep(.35,.53,face)*.77);
          col=mix(col,light,smoothstep(.64,.7,face)*.28*(1.-near*.6));
          col=mix(col,shadow,smoothstep(80.,height,edge)*.24);
          `
          }
          col*=vec3(1.+warmth*.07,1.,1.-warmth*.06);
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
      mats.forEach((mat, i) => {
        const cfg = natureLayers[i],
          u = mat.uniforms;
        u.bounds.value.set(halfWidth, halfHeight);
        u.travel.value = distance * cfg.depth;
        u.amount.value = params.clouds;
        u.shape.value = params.cloudShape;
        u.fog.value = fogAtDepth(params.fog, cfg.depth, cfg.haze * 0.2);
        u.night.value = lighting.night;
        u.warmth.value =
          params.palette === "warm" ? 1 : params.palette === "blue" ? -1 : 0;
        if (cfg.kind === "cloud") {
          u.shadow.value.copy(shadow).multiplyScalar(cfg.depth > 1 ? 0.69 : 1);
          u.body.value.copy(body).lerp(shadow, cfg.depth > 1 ? 0.27 : 0);
          u.light.value.copy(light);
        } else {
          u.shadow.value.copy(rockDark).multiplyScalar(cfg.depth > 1 ? 0.6 : 1);
          u.body.value
            .copy(rockLight)
            .lerp(rockDark, cfg.depth > 1 ? 0.8 : 0.25);
          u.light.value.copy(body).lerp(rockDark, cfg.depth > 1 ? 0.75 : 0.1);
        }
        u.haze.value
          .copy(cfg.kind === "cloud" ? horizon : lighting.colors[0])
          .lerp(horizon, cfg.kind === "cloud" ? 0 : 0.22);
      });
    },
    dispose() {
      mats.forEach((m) => m.dispose());
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
