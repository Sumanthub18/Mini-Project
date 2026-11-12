import { useEffect, useRef } from 'react'

/**
 * Interactive mouse-following cyber ripple effect for the Hero background.
 * Uses a lightweight WebGL shader with automatic graceful Canvas2D fallback.
 * Respects prefers-reduced-motion and pauses when tab/hero is offscreen.
 */
export default function HeroRippleOverlay({ active = true }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    let frameId = null
    let disposed = false
    const ripples = []

    const pushRipple = (x, y) => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const nx = (x - rect.left) / rect.width
      const ny = (y - rect.top) / rect.height
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return

      const last = ripples[ripples.length - 1]
      if (last && performance.now() - last.born < 85) return
      ripples.push({ x: nx, y: ny, born: performance.now() })
      if (ripples.length > 6) ripples.shift()
    }

    const handlePointerMove = (e) => pushRipple(e.clientX, e.clientY)
    const handlePointerDown = (e) => pushRipple(e.clientX, e.clientY)

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerdown', handlePointerDown, { passive: true })

    // Try lightweight WebGL shader first; fallback to Canvas2D ripples if unavailable
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true })

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      const w = rect?.width || window.innerWidth
      const h = rect?.height || window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    if (gl) {
      const vsSrc = `
        attribute vec2 a_pos;
        varying vec2 v_uv;
        void main() {
          v_uv = a_pos * 0.5 + 0.5;
          v_uv.y = 1.0 - v_uv.y;
          gl_Position = vec4(a_pos, 0.0, 1.0);
        }
      `
      const fsSrc = `
        precision mediump float;
        varying vec2 v_uv;
        uniform vec2 u_res;
        uniform vec3 u_ripples[6];
        void main() {
          vec2 aspect = vec2(u_res.x / max(u_res.y, 1.0), 1.0);
          float alpha = 0.0;
          vec3 col = vec3(0.0);
          for (int i = 0; i < 6; i++) {
            float age = u_ripples[i].z;
            if (age > 0.0 && age < 1.8) {
              float dist = length((v_uv - u_ripples[i].xy) * aspect);
              float radius = age * 0.28;
              float ring = exp(-pow((dist - radius) * 32.0, 2.0));
              float fade = (1.0 - age / 1.8) * 0.24;
              float contribution = ring * fade;
              alpha += contribution;
              col += mix(vec3(0.435, 0.471, 1.0), vec3(0.0, 0.898, 1.0), fract(float(i) * 0.5)) * contribution;
            }
          }
          gl_FragColor = vec4(col, min(alpha, 0.35));
        }
      `

      const compile = (type, src) => {
        const shader = gl.createShader(type)
        gl.shaderSource(shader, src)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader)
          return null
        }
        return shader
      }

      const vs = compile(gl.VERTEX_SHADER, vsSrc)
      const fs = compile(gl.FRAGMENT_SHADER, fsSrc)
      let program = null
      if (vs && fs) {
        program = gl.createProgram()
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          program = null
        }
      }

      if (program) {
        gl.useProgram(program)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
        const locPos = gl.getAttribLocation(program, 'a_pos')
        gl.enableVertexAttribArray(locPos)
        gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0)

        const locRes = gl.getUniformLocation(program, 'u_res')
        const locRipples = gl.getUniformLocation(program, 'u_ripples')
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        const renderGL = () => {
          if (disposed) return
          frameId = requestAnimationFrame(renderGL)
          if (document.hidden) return

          const now = performance.now()
          const flat = new Float32Array(18)
          for (let i = 0; i < 6; i++) {
            const rp = ripples[i]
            if (rp) {
              const age = (now - rp.born) / 1000
              if (age < 1.8) {
                flat[i * 3] = rp.x
                flat[i * 3 + 1] = rp.y
                flat[i * 3 + 2] = age
              }
            }
          }

          gl.clearColor(0, 0, 0, 0)
          gl.clear(gl.COLOR_BUFFER_BIT)
          gl.uniform2f(locRes, canvas.width, canvas.height)
          gl.uniform3fv(locRipples, flat)
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
        renderGL()

        return () => {
          disposed = true
          if (frameId) cancelAnimationFrame(frameId)
          window.removeEventListener('pointermove', handlePointerMove)
          window.removeEventListener('pointerdown', handlePointerDown)
          window.removeEventListener('resize', resize)
        }
      }
    }

    // Graceful Canvas2D Fallback
    const ctx = canvas.getContext('2d')
    const render2D = () => {
      if (disposed || !ctx) return
      frameId = requestAnimationFrame(render2D)
      if (document.hidden) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const now = performance.now()
      for (const rp of ripples) {
        const age = (now - rp.born) / 1000
        if (age >= 1.6) continue
        const r = age * Math.min(canvas.width, canvas.height) * 0.22
        const alpha = (1 - age / 1.6) * 0.22
        ctx.beginPath()
        ctx.arc(rp.x * canvas.width, rp.y * canvas.height, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
    render2D()

    return () => {
      disposed = true
      if (frameId) cancelAnimationFrame(frameId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}

