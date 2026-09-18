/* ══════════════════════════════════════════════════════════════
   09-blazon3d.js — BLAZON, IN THREE DIMENSIONS.

   grumkata, three times: make the 3D look like the rest of the app.
   The UI is flat heraldry — a strict palette, banded colour, gilt
   edges, ink-dark grounds — and the two 3D rooms were photoreal-ish
   kit renders lit by point lights. No amount of grading a photo
   makes it a coat of arms.

   So every material in both rooms goes through here, and what comes
   out the other side is the same picture drawn the app's way:

     BANDED     the lit result is quantised into a few steps, the way
                a painted miniature or a woodcut has light, mid and
                shadow and nothing in between. This is what stops the
                room reading as a photograph.
     RAMPED     each band is pulled toward a three-colour ramp taken
                from the tinctures — Sable-blue in shadow, Tenné in
                the mids, Or in the light. The texture's own hue
                survives underneath (`tint` is a mix, not a replace),
                so oak still reads as oak and plaster as plaster;
                they just agree about what colour light is.
     GILT RIM   a fresnel edge in Or on anything with a normal to
                spare, which is what gives a stylised object its
                drawn outline without a second render pass.

   It is done with onBeforeCompile rather than by writing new
   materials, for two reasons that matter: three.js keeps its own
   lighting (point lights, distance falloff, the fire's flicker),
   and a Lambert stays a Lambert — the room is sixty thousand
   triangles of scenery and could not afford anything heavier.

   Lambert lights per VERTEX in r128, so there is no normal in its
   fragment shader: those get the bands and the ramp but no rim,
   which is right anyway — scenery does not need an outline, the
   things standing on the table do.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';
if (typeof THREE === 'undefined') return;

/* the two rooms, as three colours each. Same idea, different light:
   the tavern is a fire in a dark box, the hall is a cold night with
   torches down it. */
const ROOMS = {
  tavern: { low: [0.16, 0.14, 0.22], mid: [0.62, 0.40, 0.22], high: [1.00, 0.82, 0.46] },
  hall:   { low: [0.13, 0.17, 0.30], mid: [0.52, 0.40, 0.28], high: [1.00, 0.84, 0.52] }
};

const CEL = `
  /* ── BLAZON: banded light, the house ramp, a gilt rim ── */
  {
    float L = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    /* BANDED ON A CURVE, AND NEVER ONTO ZERO. A straight floor(L*steps)
       puts every fragment under 1/steps at pure black — and these two
       rooms are a fire in a dark box and a night corridor, so that is
       most of the picture: the first attempt tore the walls into hard
       black shapes. So the split is made on a perceptual curve, each
       band sits at its own MIDDLE rather than its floor, and the result
       is mixed back over the original by uCelHard — steps you can see,
       with the gradient still under them. */
    float g = pow(clamp(L, 0.0, 1.0), 0.55);
    float B = (floor(g * uCelSteps) + 0.5) / uCelSteps;
    B = pow(clamp(B, 0.0, 1.0), 1.0 / 0.55);
    float lit = mix(L, B, uCelHard);
    vec3 banded = gl_FragColor.rgb * (lit / max(L, 0.0015));
    /* the ramp: Sable-blue shadow, Tenné mid, Or light */
    vec3 ramp = mix(uCelLow, uCelMid, smoothstep(0.02, 0.30, lit));
    ramp = mix(ramp, uCelHigh, smoothstep(0.30, 0.80, lit));
    vec3 tinted = mix(banded, ramp * (0.25 + 1.35 * lit), uCelTint);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, tinted, uCelAmt);
  }
  #ifdef BLAZON_RIM
  {
    vec3 nrm = normalize(normal);
    vec3 vue = normalize(vViewPosition);
    float rim = pow(1.0 - clamp(dot(nrm, vue), 0.0, 1.0), 3.0);
    gl_FragColor.rgb += uCelHigh * smoothstep(0.30, 0.85, rim) * uCelRim;
  }
  #endif
`;

/* EVERY COMPILED SHADER THIS HAS PATCHED, so the stylising can be turned
   down after the fact. A material's uniforms only exist once three.js has
   compiled it, so there is nothing to hold onto until onBeforeCompile has
   run — which is why this is a list gathered there rather than a list of
   materials gathered here. `uCelAmt` is the one dial worth exposing: it is
   the final mix between the raw pixel and the whole stylised one, so
   setting it to 0 gives plain lighting without recompiling anything.

   07-options.js owns the number. Each entry remembers what it was BUILT
   with, so "softened" scales every material by the same proportion instead
   of flattening the strong ones down to the weak ones. */
const live = [];
let force = (root.Options && root.Options.celAmt) ? root.Options.celAmt() : 1;
function strength(x) {
  force = x;
  live.forEach(e => { e.u.uCelAmt.value = e.amt * force; });
}

/* Patch a material in place. Returns it, so it can be wrapped round a
   constructor call. `rim` is only asked for where a fragment normal
   actually exists — Standard and Phong, not Lambert. */
function cel(mat, o) {
  if (!mat || mat.userData.blazon) return mat;
  o = o || {};
  const room = ROOMS[o.room || 'tavern'];
  const steps = o.steps == null ? 6.0 : o.steps;
  const tint = o.tint == null ? 0.30 : o.tint;
  const hard = o.hard == null ? 0.55 : o.hard;
  const amt = o.amt == null ? 1.0 : o.amt;
  const rim = o.rim == null ? 0.16 : o.rim;
  const wantRim = o.rim !== 0 && (mat.isMeshStandardMaterial || mat.isMeshPhongMaterial ||
                                  mat.isMeshPhysicalMaterial);
  mat.userData.blazon = true;
  if (wantRim) {
    mat.defines = mat.defines || {};
    mat.defines.BLAZON_RIM = '';
  }
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    shader.uniforms.uCelSteps = { value: steps };
    shader.uniforms.uCelHard  = { value: hard };
    shader.uniforms.uCelTint  = { value: tint };
    shader.uniforms.uCelAmt   = { value: amt * force };
    shader.uniforms.uCelRim   = { value: rim };
    live.push({ u: shader.uniforms, amt: amt });
    shader.uniforms.uCelLow   = { value: new THREE.Vector3().fromArray(o.low  || room.low) };
    shader.uniforms.uCelMid   = { value: new THREE.Vector3().fromArray(o.mid  || room.mid) };
    shader.uniforms.uCelHigh  = { value: new THREE.Vector3().fromArray(o.high || room.high) };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {',
        'uniform float uCelSteps; uniform float uCelTint; uniform float uCelAmt;\n' +
        'uniform float uCelRim; uniform float uCelHard; uniform vec3 uCelLow;\n' +
        'uniform vec3 uCelMid; uniform vec3 uCelHigh;\nvoid main() {')
      /* AFTER the tone map and the sRGB write, BEFORE the fog: banding a
         linear value posterises the dark end into nothing, and banding the
         fog as well would put a staircase across the depth of the room. */
      .replace('#include <fog_fragment>', CEL + '\n#include <fog_fragment>');
  };
  /* two materials that differ only by our defines must not share a
     compiled program */
  mat.customProgramCacheKey = () => 'blazon' + (wantRim ? 'R' : '') + steps + '|' + tint + '|' + hard;
  mat.needsUpdate = true;
  return mat;
}

/* ══ TUNING A RENDERER ════════════════════════════════
   grumkata: going from the menu to the table is laggy.

   It was, and it was not the models. A CPU profile of that beat put 16.6 of
   18.7 seconds in `(program)` — native driver work, with `getProgramInfoLog`
   the top named frame under it — for eighteen shader programs.

   `gl.linkProgram()` does NOT block: every modern driver links in the
   background and only makes you wait when you ask about the result. three.js
   asks on the very next line:

       gl.linkProgram(program);
       if (renderer.debug.checkShaderErrors) { gl.getProgramInfoLog(program) … }

   — so the whole link is dragged back onto the frame the player is watching,
   one program at a time, and the app freezes for as long as it takes. Turning
   the check off lets the driver keep them in the background where they
   belong. It is the standard fix and it is the whole of the hitch.

   THE COST IS REAL: a broken shader then fails silently, as a black object
   rather than a console error. So it is a switch, not a decision — put
   `monarchy.shaderlog` in localStorage, or `?shaderlog` on the URL, and the
   checks come back for as long as you are working on 09-blazon3d.js. */
function loud() {
  try {
    return root.localStorage.getItem('monarchy.shaderlog') != null
      || /[?&]shaderlog/.test(root.location.search);
  } catch (e) { return false; }
}
function tune(renderer) {
  if (!renderer || !renderer.debug) return renderer;
  renderer.debug.checkShaderErrors = loud();
  return renderer;
}

/* everything under `obj`, for when the meshes are already built */
function celAll(obj, o) {
  if (!obj) return obj;
  obj.traverse(n => {
    if (!n.material) return;
    (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => cel(m, o));
  });
  return obj;
}

root.Blazon3D = { cel, celAll, strength, tune, ROOMS };

})(window);
