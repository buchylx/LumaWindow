import * as T from "three";
export function createSky() {
  const material = new T.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    uniforms: {
      top: { value: new T.Color("#99b8c0") },
      bottom: { value: new T.Color("#e6e2d9") },
      cloudLight: { value: new T.Color("#ffe0ad") },
      cloudShadow: { value: new T.Color("#9d809f") },
      travel: { value: 0 },
      density: { value: 0.55 },
      aspect: { value: 1 },
      seed: { value: 0 },
      banks: { value: 0.5 },
      shapeControl: { value: 0.45 },
      horizon: { value: 0.45 },
    },
    vertexShader:
      "varying vec2 uvv; void main(){uvv=uv;gl_Position=vec4(position.xy,1.,1.);}",
    fragmentShader: `varying vec2 uvv;
      uniform vec3 top,bottom,cloudLight,cloudShadow;
      uniform float travel,density,aspect,seed,banks,shapeControl,horizon;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      float field(vec2 p){return noise(p)*.58+noise(p*2.03+17.)*.28+noise(p*4.11+31.)*.14;}
      void main(){
        vec3 col=mix(bottom,top,smoothstep(horizon+.08,max(horizon+.3,1.),uvv.y));
        for(int i=0;i<4;i++){
          float layer=float(i);
          vec2 p=vec2(uvv.x*aspect,uvv.y)*vec2(2.8+layer*.6,mix(8.,3.2,shapeControl));
          p+=vec2(travel*(.003+layer*.0015),seed+layer*19.);
          float broad=noise(p*.38+11.);
          float shape=field(p+vec2(broad*.9,broad*.4));
          // Coverage follows one continuous field, not four repeated horizontal bands.
          float threshold=.48+(uvv.y-.35)*.45-density*.23+layer*.045+(banks-.5)*.08;
          float mass=shape+broad*.12-threshold;
          float softness=max(.003,fwidth(mass)*1.1);
          float mask=smoothstep(-softness,softness,mass)*smoothstep(.02,.20,density);
          float tone=smoothstep(-.10,.17,mass)+(broad-.5)*.18;
          vec3 cloud=mix(cloudShadow,cloudLight,clamp(.24+tone*.70,0.,1.));
          cloud=mix(cloud,bottom,.08+(3.-layer)*.09);
          col=mix(col,cloud,mask*smoothstep(horizon+.04,horizon+.24,uvv.y));
        }
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return { mesh, material };
}
