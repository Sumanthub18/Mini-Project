import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * Layer 4: 3D Holographic Crystal Security Shield with Glowing Central AI Core.
 * Built with lightweight procedural Three.js geometry.
 * Automatically degrades to a CSS/SVG holographic shield if WebGL is unavailable.
 */
export default function HoloShield3D({ scrollProgressRef, interactive = true, variant = 'hero' }) {
  const containerRef = useRef(null)
  const [webglFailed, setWebglFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (mq) {
      setReducedMotion(mq.matches)
      const listener = (e) => setReducedMotion(e.matches)
      mq.addEventListener?.('change', listener)
      return () => mq.removeEventListener?.('change', listener)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer
    let scene
    let camera
    let frameId = null
    let disposed = false

    try {
      scene = new THREE.Scene()
      const width = container.clientWidth || window.innerWidth
      const height = container.clientHeight || window.innerHeight

      camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
      camera.position.set(0, 0, 7.2)

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(width, height)
      renderer.setClearColor(0x000000, 0)
      container.innerHTML = ''
      container.appendChild(renderer.domElement)
    } catch (err) {
      setWebglFailed(true)
      return
    }

    // Lighting — Violet, Indigo, and Electric Cyan reflections
    const ambientLight = new THREE.AmbientLight(0x8d94ff, 0.9)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0x00e5ff, 2.2)
    keyLight.position.set(4, 5, 5)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0xa78bfa, 2.4)
    rimLight.position.set(-5, -2, 3)
    scene.add(rimLight)

    const corePointLight = new THREE.PointLight(0x00e5ff, 3.2, 8)
    corePointLight.position.set(0, 0, 0.8)
    scene.add(corePointLight)

    // Root shield group
    const shieldGroup = new THREE.Group()
    scene.add(shieldGroup)

    // Procedural Shield Shape (Extruded Crystal Shield)
    const shieldShape = new THREE.Shape()
    shieldShape.moveTo(0, 1.85)
    shieldShape.bezierCurveTo(0.85, 1.62, 1.42, 1.38, 1.48, 1.18)
    shieldShape.lineTo(1.48, 0.08)
    shieldShape.bezierCurveTo(1.48, -0.95, 0.85, -1.52, 0, -1.96)
    shieldShape.bezierCurveTo(-0.85, -1.52, -1.48, -0.95, -1.48, 0.08)
    shieldShape.lineTo(-1.48, 1.18)
    shieldShape.bezierCurveTo(-1.42, 1.38, -0.85, 1.62, 0, 1.85)

    const extrudeSettings = {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.12,
      bevelSegments: 3,
      curveSegments: 20,
    }
    const shieldGeometry = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings)
    shieldGeometry.center()

    // Crystal glass material
    const crystalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6f78ff,
      emissive: 0x1e1359,
      emissiveIntensity: 0.45,
      metalness: 0.18,
      roughness: 0.12,
      transmission: 0.65,
      transparent: true,
      opacity: 0.42,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      ior: 1.48,
      side: THREE.DoubleSide,
    })
    const shieldMesh = new THREE.Mesh(shieldGeometry, crystalMaterial)
    shieldGroup.add(shieldMesh)

    // Holographic wireframe shell around crystal shield
    const edgesGeo = new THREE.EdgesGeometry(shieldGeometry, 18)
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.55,
    })
    const shieldEdges = new THREE.LineSegments(edgesGeo, edgesMat)
    shieldEdges.scale.setScalar(1.015)
    shieldGroup.add(shieldEdges)

    // Inner faceted AI Core (Icosahedron)
    const coreGeo = new THREE.IcosahedronGeometry(0.46, 1)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x6f78ff,
      emissiveIntensity: 1.35,
      metalness: 0.3,
      roughness: 0.15,
      transparent: true,
      opacity: 0.92,
    })
    const aiCore = new THREE.Mesh(coreGeo, coreMat)
    aiCore.position.set(0, 0.08, 0.12)
    shieldGroup.add(aiCore)

    // Wireframe lattice over AI Core
    const coreWireGeo = new THREE.IcosahedronGeometry(0.56, 1)
    const coreWireMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.42,
    })
    const aiCoreWire = new THREE.Mesh(coreWireGeo, coreWireMat)
    aiCoreWire.position.copy(aiCore.position)
    shieldGroup.add(aiCoreWire)

    // Two Orbital Holographic Rings
    const ring1Geo = new THREE.TorusGeometry(1.88, 0.014, 12, 80)
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x8d94ff,
      transparent: true,
      opacity: 0.35,
    })
    const orbitalRing1 = new THREE.Mesh(ring1Geo, ring1Mat)
    orbitalRing1.rotation.x = Math.PI / 2.6
    orbitalRing1.rotation.y = 0.25
    shieldGroup.add(orbitalRing1)

    const ring2Geo = new THREE.TorusGeometry(2.22, 0.01, 10, 80)
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.24,
    })
    const orbitalRing2 = new THREE.Mesh(ring2Geo, ring2Mat)
    orbitalRing2.rotation.x = -Math.PI / 3.1
    orbitalRing2.rotation.y = -0.35
    shieldGroup.add(orbitalRing2)

    // Pointer tracking
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
    const handlePointerMove = (e) => {
      if (!interactive) return
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = -(e.clientY / window.innerHeight) * 2 + 1
      pointer.targetX = nx
      pointer.targetY = ny
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    // Resize handling
    const handleResize = () => {
      if (!container || disposed) return
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    const clock = new THREE.Clock()

    const animate = () => {
      if (disposed) return
      frameId = requestAnimationFrame(animate)

      if (document.hidden) return

      const t = clock.getElapsedTime()
      const isMobile = window.innerWidth < 768
      const scrollP = scrollProgressRef?.current ?? 0

      // Smooth pointer damping
      pointer.x += (pointer.targetX - pointer.x) * 0.05
      pointer.y += (pointer.targetY - pointer.y) * 0.05

      // Scroll-choreographed position, scale, and rotation (Nectarline-inspired motion arc)
      let baseX = 0
      let baseY = 0
      let baseScale = 1

      if (variant === 'hero') {
        if (isMobile) {
          baseX = 0
          baseY = 0.7 - scrollP * 0.8
          baseScale = 0.62 - Math.sin(scrollP * Math.PI) * 0.1
        } else {
          // Hero right -> glides toward left/center in intro/capabilities -> frames CTA at bottom
          const waveX = Math.sin(scrollP * Math.PI * 1.65)
          baseX = 2.05 - scrollP * 1.9 - waveX * 0.75
          baseY = 0.15 + Math.sin(scrollP * Math.PI * 2) * 0.28
          baseScale = 1.05 - Math.sin(scrollP * Math.PI) * 0.22
        }
      } else {
        // Subtle ambient centered backdrop for app routes
        baseX = isMobile ? 0 : 2.3
        baseY = 0.1
        baseScale = isMobile ? 0.55 : 0.72
      }

      const floatOffset = reducedMotion ? 0 : Math.sin(t * 1.15) * 0.12
      shieldGroup.position.x += (baseX + pointer.x * 0.18 - shieldGroup.position.x) * 0.08
      shieldGroup.position.y += (baseY + floatOffset + pointer.y * 0.14 - shieldGroup.position.y) * 0.08
      shieldGroup.scale.setScalar(baseScale)

      // Smooth rotation combining scroll progress, slow drift, and subtle pointer tilt
      const targetRotY = (reducedMotion ? 0.25 : t * 0.24) + scrollP * Math.PI * 1.4 + pointer.x * 0.26
      const targetRotX = Math.sin(t * 0.7) * 0.06 - pointer.y * 0.18 + scrollP * 0.22
      shieldGroup.rotation.y += (targetRotY - shieldGroup.rotation.y) * 0.08
      shieldGroup.rotation.x += (targetRotX - shieldGroup.rotation.x) * 0.08

      if (!reducedMotion) {
        aiCore.rotation.y = -t * 0.6
        aiCore.rotation.x = t * 0.35
        aiCoreWire.rotation.y = t * 0.45
        orbitalRing1.rotation.z = t * 0.28
        orbitalRing2.rotation.z = -t * 0.22
        corePointLight.intensity = 2.6 + Math.sin(t * 2.2) * 0.65
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      disposed = true
      if (frameId) cancelAnimationFrame(frameId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('resize', handleResize)

      shieldGeometry.dispose()
      crystalMaterial.dispose()
      edgesGeo.dispose()
      edgesMat.dispose()
      coreGeo.dispose()
      coreMat.dispose()
      coreWireGeo.dispose()
      coreWireMat.dispose()
      ring1Geo.dispose()
      ring1Mat.dispose()
      ring2Geo.dispose()
      ring2Mat.dispose()
      renderer?.dispose()
    }
  }, [interactive, reducedMotion, scrollProgressRef, variant])

  // Graceful CSS/SVG Holographic Fallback if WebGL is unavailable
  if (webglFailed) {
    return (
      <div className="fixed inset-0 pointer-events-none flex items-center justify-end pr-[8%] opacity-45" aria-hidden="true">
        <div className="w-72 h-80 md:w-96 md:h-[420px] tl-float-slow flex items-center justify-center relative">
          <div
            className="absolute inset-8 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.28), rgba(111,120,255,0.18), transparent 70%)' }}
          />
          <svg viewBox="0 0 220 260" fill="none" className="w-full h-full drop-shadow-[0_0_24px_rgba(0,229,255,0.35)]">
            <defs>
              <linearGradient id="fallbackCrystal" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6F78FF" stopOpacity="0.38" />
                <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <path
              d="M110 14 L196 48 V124 C196 184 158 224 110 246 C62 224 24 184 24 124 V48 Z"
              fill="url(#fallbackCrystal)"
              stroke="#00E5FF"
              strokeWidth="1.8"
            />
            <circle cx="110" cy="122" r="28" fill="rgba(0,229,255,0.2)" stroke="#8D94FF" strokeWidth="1.5" />
            <circle cx="110" cy="122" r="10" fill="#00E5FF" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      aria-hidden="true"
    />
  )
}

