// WebGL finishing pass over the 2D scene: bloom, colour grade, vignette, film grain, flashes.
// Falls back to showing the 2D canvas directly if WebGL is unavailable.
const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;
const BRIGHT = `precision mediump float; varying vec2 uv; uniform sampler2D t; uniform float th;
void main(){ vec3 c = texture2D(t, uv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(th, th + 0.35, l), 1.); }`;
const BLUR = `precision mediump float; varying vec2 uv; uniform sampler2D t; uniform vec2 d;
void main(){ vec3 c = texture2D(t, uv).rgb * 0.227027;
 c += (texture2D(t, uv + d * 1.3846).rgb + texture2D(t, uv - d * 1.3846).rgb) * 0.316216;
 c += (texture2D(t, uv + d * 3.2308).rgb + texture2D(t, uv - d * 3.2308).rgb) * 0.070270;
 gl_FragColor = vec4(c, 1.); }`;
const FINAL = `precision mediump float; varying vec2 uv; uniform sampler2D t; uniform sampler2D b1; uniform sampler2D b2;
uniform float bloom; uniform vec3 tint; uniform vec3 lift; uniform float vig; uniform float time; uniform float flash; uniform vec3 flashC; uniform vec2 res; uniform float grain; uniform float sat;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 c = texture2D(t, uv).rgb;
  vec3 bl = texture2D(b1, uv).rgb * 0.7 + texture2D(b2, uv).rgb * 0.9;
  c += bl * bloom;
  float L = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(L), c, sat);
  c = c * tint + lift * (1. - c);
  vec2 q = uv - 0.5; q.x *= res.x / res.y;
  c *= 1. - vig * smoothstep(0.35, 1.05, length(q));
  c = mix(c, flashC, flash);
  float g = h(floor(uv * res / 2.) + floor(time * 24.)) - 0.5;
  c += g * grain;
  c = c / (1. + max(vec3(0.), c - 1.) * 0.6);
  gl_FragColor = vec4(c, 1.);
}`;

export interface Grade { bloom: number; tint: [number, number, number]; lift: [number, number, number]; vig: number; sat: number; threshold: number }
export const GRADES: Grade[] = [
  { bloom: 1.05, tint: [1.0, 0.98, 1.04], lift: [0.012, 0.016, 0.04], vig: 0.55, sat: 1.08, threshold: 0.62 },
  { bloom: 1.15, tint: [1.04, 0.97, 1.03], lift: [0.03, 0.012, 0.04], vig: 0.6, sat: 1.1, threshold: 0.6 },
  { bloom: 0.95, tint: [0.96, 1.02, 1.0], lift: [0.008, 0.02, 0.02], vig: 0.7, sat: 0.9, threshold: 0.6 },
];

export class Post {
  out: HTMLCanvasElement; src: HTMLCanvasElement; gl: WebGLRenderingContext | null = null;
  private progs: Record<string, WebGLProgram> = {}; private tex!: WebGLTexture; private fbs: { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }[] = [];
  grade: Grade = GRADES[0]; flash = 0; flashC: [number, number, number] = [1, 1, 1]; bloomBoost = 0;
  constructor(out: HTMLCanvasElement, src: HTMLCanvasElement, off = false) {
    this.out = out; this.src = src;
    if (off) return;
    try {
      const gl = out.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }) as WebGLRenderingContext | null;
      if (gl) { this.gl = gl; this.setup(); }
    } catch { this.gl = null; }
  }
  get ok() { return !!this.gl; }
  private prog(fs: string) {
    const gl = this.gl!; const mk = (t: number, s: string) => { const sh = gl.createShader(t)!; gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader'); return sh; };
    const p = gl.createProgram()!; gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link'); return p;
  }
  private mkTex() { const gl = this.gl!; const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
  private setup() {
    const gl = this.gl!;
    this.progs = { bright: this.prog(BRIGHT), blur: this.prog(BLUR), final: this.prog(FINAL) };
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.tex = this.mkTex();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  }
  resize(w: number, h: number) {
    this.out.width = w; this.out.height = h;
    if (!this.gl) return; const gl = this.gl;
    for (const f of this.fbs) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.tex); }
    this.fbs = [];
    const sizes = [[w >> 2, h >> 2], [w >> 2, h >> 2], [w >> 3, h >> 3], [w >> 3, h >> 3]];
    for (const [fw, fh] of sizes) {
      const tex = this.mkTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.max(1, fw), Math.max(1, fh), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fb = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      this.fbs.push({ fb, tex, w: Math.max(1, fw), h: Math.max(1, fh) });
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  private pass(prog: WebGLProgram, target: { fb: WebGLFramebuffer; w: number; h: number } | null, input: WebGLTexture, set?: (p: WebGLProgram) => void) {
    const gl = this.gl!; gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : this.out.width, target ? target.h : this.out.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, input); gl.uniform1i(gl.getUniformLocation(prog, 't'), 0);
    set?.(prog); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render(time: number) {
    const gl = this.gl; if (!gl) return;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.src);
    const [a, b, c, d] = this.fbs, P = this.progs, G = this.grade;
    this.pass(P.bright, a, this.tex, p => gl.uniform1f(gl.getUniformLocation(p, 'th'), G.threshold));
    const blur = (from: typeof a, to: typeof a, dx: number, dy: number) => this.pass(P.blur, to, from.tex, p => gl.uniform2f(gl.getUniformLocation(p, 'd'), dx / from.w, dy / from.h));
    blur(a, b, 1, 0); blur(b, a, 0, 1);
    this.pass(P.blur, c, a.tex, p => gl.uniform2f(gl.getUniformLocation(p, 'd'), 1 / a.w, 0));
    blur(c, d, 0, 1); blur(d, c, 1.6, 0); blur(c, d, 0, 1.6);
    this.pass(P.final, null, this.tex, p => {
      const u = (n: string) => gl.getUniformLocation(p, n);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, a.tex); gl.uniform1i(u('b1'), 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, d.tex); gl.uniform1i(u('b2'), 2);
      gl.uniform1f(u('bloom'), G.bloom + this.bloomBoost); gl.uniform3fv(u('tint'), G.tint); gl.uniform3fv(u('lift'), G.lift);
      gl.uniform1f(u('vig'), G.vig); gl.uniform1f(u('sat'), G.sat); gl.uniform1f(u('time'), time); gl.uniform1f(u('flash'), this.flash); gl.uniform3fv(u('flashC'), this.flashC);
      gl.uniform2f(u('res'), this.out.width, this.out.height); gl.uniform1f(u('grain'), 0.035);
      gl.activeTexture(gl.TEXTURE0);
    });
  }
}
