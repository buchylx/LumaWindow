// Historical 0.1.1 atlas prototype; not imported by the current scene runtime.
import * as T from "three";
export const plane = () => new T.PlaneGeometry(1, 1);
export function paintedMaterial(texture: T.Texture, rect = [0, 0, 1, 1]) {
  return new T.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      map: { value: texture },
      rect: { value: new T.Vector4(...rect) },
      shadow: { value: new T.Color() },
      body: { value: new T.Color() },
      light: { value: new T.Color() },
      haze: { value: new T.Color() },
      mist: { value: 0 },
      opacity: { value: 1 },
      warmth: { value: 0 },
      lightShift: { value: 0 },
    },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D map;uniform vec4 rect;uniform vec3 shadow,body,light,haze;
      uniform float mist,opacity,warmth,lightShift;varying vec2 vUv;
      void main(){vec4 tex=texture2D(map,rect.xy+vUv*rect.zw);
      vec2 edge=min(vUv,1.-vUv);
      float alpha=tex.a*smoothstep(0.,.025,edge.x)*smoothstep(0.,.045,edge.y);
      if(alpha<.015)discard;
      float shade=clamp((tex.r-.12)*1.12+lightShift*(vUv.x-.5)*.18,0.,1.);
      vec3 c=mix(shadow,body,smoothstep(.20,.73,shade));
      c=mix(c,light,smoothstep(.70,.99,shade));
      c+=vec3(warmth*.028,warmth*.006,-warmth*.012);
      c=mix(c,haze,mist);gl_FragColor=vec4(c,alpha*opacity);
      #include <colorspace_fragment>
      }`,
  });
}
