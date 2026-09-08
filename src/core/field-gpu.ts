import { compareFields, seedField, stepField, type FieldParameters } from './field';

const vertex = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const update = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D state;
uniform int size;
uniform vec2 rates;
uniform vec3 brush;
out vec4 result;
vec2 sampleAt(ivec2 p) { return texelFetch(state, (p + size) % size, 0).rg; }
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec2 c = sampleAt(p);
  vec2 lap = -c;
  lap += 0.2 * (sampleAt(p + ivec2(1,0)) + sampleAt(p + ivec2(-1,0)) + sampleAt(p + ivec2(0,1)) + sampleAt(p + ivec2(0,-1)));
  lap += 0.05 * (sampleAt(p + ivec2(1,1)) + sampleAt(p + ivec2(-1,1)) + sampleAt(p + ivec2(1,-1)) + sampleAt(p + ivec2(-1,-1)));
  float r = c.x * c.y * c.y;
  vec2 next = c + vec2(lap.x - r + rates.x * (1.0 - c.x), 0.5 * lap.y + r - (rates.x + rates.y) * c.y);
  if (brush.z > 0.0 && distance(gl_FragCoord.xy / float(size), brush.xy) < brush.z) next = vec2(0.5, 0.27);
  result = vec4(clamp(next, 0.0, 1.0), 0.0, 1.0);
}`;
const display = `#version 300 es
precision highp float;
uniform sampler2D state;
uniform vec2 screen;
uniform int palette;
out vec4 color;
void main() {
  vec2 uv = gl_FragCoord.xy / screen;
  vec2 grid = vec2(textureSize(state, 0));
  vec2 p = uv * grid - 0.5;
  ivec2 lo = ivec2(floor(p));
  ivec2 bounds = ivec2(grid);
  vec2 f = fract(p);
  float a = texelFetch(state, (lo + bounds) % bounds, 0).g;
  float b0 = texelFetch(state, (lo + ivec2(1,0) + bounds) % bounds, 0).g;
  float c = texelFetch(state, (lo + ivec2(0,1) + bounds) % bounds, 0).g;
  float d = texelFetch(state, (lo + ivec2(1,1) + bounds) % bounds, 0).g;
  float b = mix(mix(a, b0, f.x), mix(c, d, f.x), f.y);
  float shape = smoothstep(0.07, 0.31, b);
  float ridge = pow(max(0.0, 1.0 - abs(b - 0.20) * 12.0), 3.0);
  vec3 bg = palette == 0 ? vec3(0.145,0.110,0.176) : vec3(0.969,0.949,0.910);
  vec3 fg = palette == 0 ? vec3(0.933,0.667,0.510) : vec3(0.145,0.110,0.176);
  color = vec4(mix(bg, fg, shape) + ridge * (palette == 0 ? vec3(0.093,0.088,0.102) : vec3(-0.035)), 1.0);
}`;

export class FieldGPU {
  readonly gl: WebGL2RenderingContext;
  private updateProgram: WebGLProgram;
  private displayProgram: WebGLProgram;
  private textures: WebGLTexture[] = [];
  private buffers: WebGLFramebuffer[] = [];
  private vao: WebGLVertexArrayObject;
  private current = 0;
  steps = 0;
  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly size: number,
    initial: Float32Array,
  ) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl || !gl.getExtension('EXT_color_buffer_float'))
      throw new Error('This experiment needs WebGL 2 with floating-point render targets.');
    this.gl = gl;
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error || 'Shader compilation failed.');
      }
      return shader;
    };
    const program = (source: string) => {
      const p = gl.createProgram()!,
        v = compile(gl.VERTEX_SHADER, vertex),
        f = compile(gl.FRAGMENT_SHADER, source);
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.linkProgram(p);
      gl.deleteShader(v);
      gl.deleteShader(f);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p) || 'Shader link failed.');
      return p;
    };
    this.updateProgram = program(update);
    this.displayProgram = program(display);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture()!,
        buffer = gl.createFramebuffer()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      this.textures.push(texture);
      this.buffers.push(buffer);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        this.dispose();
        throw new Error('Floating-point framebuffer is incomplete.');
      }
    }
    this.reset(initial);
  }
  reset(initial: Float32Array) {
    if (initial.length !== this.size * this.size * 2)
      throw new Error('Grid dimensions do not match.');
    const rgba = new Float32Array(this.size * this.size * 4);
    for (let i = 0; i < initial.length / 2; i++) {
      rgba[i * 4] = initial[i * 2];
      rgba[i * 4 + 1] = initial[i * 2 + 1];
      rgba[i * 4 + 3] = 1;
    }
    const gl = this.gl;
    for (const texture of this.textures) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.size, this.size, gl.RGBA, gl.FLOAT, rgba);
    }
    this.steps = 0;
    this.current = 0;
  }
  step(count: number, parameters: FieldParameters, brush = [-1, -1, 0]) {
    const gl = this.gl,
      p = this.updateProgram;
    gl.useProgram(p);
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, this.size, this.size);
    gl.uniform1i(gl.getUniformLocation(p, 'state'), 0);
    gl.uniform1i(gl.getUniformLocation(p, 'size'), this.size);
    gl.uniform2f(gl.getUniformLocation(p, 'rates'), parameters.feed, parameters.kill);
    gl.uniform3fv(gl.getUniformLocation(p, 'brush'), brush);
    gl.activeTexture(gl.TEXTURE0);
    for (let i = 0; i < count; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.textures[this.current]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers[1 - this.current]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.current = 1 - this.current;
      this.steps++;
    }
  }
  draw(palette = 0) {
    const gl = this.gl,
      p = this.displayProgram;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(p);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.current]);
    gl.uniform1i(gl.getUniformLocation(p, 'state'), 0);
    gl.uniform1i(gl.getUniformLocation(p, 'palette'), palette);
    gl.uniform2f(gl.getUniformLocation(p, 'screen'), this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  read(): Float32Array {
    const gl = this.gl,
      rgba = new Float32Array(this.size * this.size * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers[this.current]);
    gl.readPixels(0, 0, this.size, this.size, gl.RGBA, gl.FLOAT, rgba);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('GPU readback failed.');
    const values = new Float32Array(this.size * this.size * 2);
    for (let i = 0; i < values.length / 2; i++) {
      values[i * 2] = rgba[i * 4];
      values[i * 2 + 1] = rgba[i * 4 + 1];
    }
    return values;
  }
  dispose() {
    const gl = this.gl;
    this.textures.forEach((t) => gl.deleteTexture(t));
    this.buffers.forEach((b) => gl.deleteFramebuffer(b));
    gl.deleteProgram(this.updateProgram);
    gl.deleteProgram(this.displayProgram);
    gl.deleteVertexArray(this.vao);
  }
}

export function validateGPU(parameters: FieldParameters) {
  const size = 64,
    count = 20;
  const initial = seedField(size, 7126),
    canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const gpu = new FieldGPU(canvas, size, initial);
  try {
    let expected = initial;
    for (let i = 0; i < count; i++) expected = stepField(expected, size, parameters);
    gpu.step(count, parameters);
    return {
      ...compareFields(expected, gpu.read()),
      size,
      steps: count,
      parameters,
      timestamp: new Date().toISOString(),
    };
  } finally {
    gpu.dispose();
    gpu.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
