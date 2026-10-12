import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Camera,
  Download,
  Sun,
  Layers,
  Sparkles,
  Maximize2,
  Box,
  Eye,
} from 'lucide-react';
import { db } from '../services/db';
import { Product } from '../types';

export const ThreeDStudioView: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [autoRotate, setAutoRotate] = useState(true);
  const [metallic, setMetallic] = useState(0.85);
  const [roughness, setRoughness] = useState(0.2);
  const [lightIntensity, setLightIntensity] = useState(1.5);
  const [meshColor, setMeshColor] = useState('#d4af37');
  const [environmentTheme, setEnvironmentTheme] = useState<'dark' | 'studio' | 'gold' | 'neon'>('dark');

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Drag interaction state
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    db.getAll<Product>('products').then((prods) => {
      setProducts(prods);
      if (prods.length > 0) {
        setSelectedProductId(prods[0].id);
        if (prods[0].model3dColor) setMeshColor(prods[0].model3dColor);
      }
    });
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 3.8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer with antialias and alpha
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Root Group for Product Meshes
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    groupRef.current = rootGroup;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, lightIntensity);
    dirLight1.position.set(5, 8, 5);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirLight2.position.set(-5, -2, -5);
    scene.add(dirLight2);

    // Subtle Ground Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.15, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.9;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Animation Loop
    const animate = () => {
      if (groupRef.current && autoRotate && !isDragging.current) {
        groupRef.current.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
      animFrameId.current = requestAnimationFrame(animate);
    };
    animate();

    // Mouse / Touch event handlers for interactive 3D orbit
    const handleDown = (clientX: number, clientY: number) => {
      isDragging.current = true;
      prevMouse.current = { x: clientX, y: clientY };
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging.current || !groupRef.current) return;
      const deltaX = clientX - prevMouse.current.x;
      const deltaY = clientY - prevMouse.current.y;
      groupRef.current.rotation.y += deltaX * 0.008;
      groupRef.current.rotation.x += deltaY * 0.008;
      // Clamp pitch
      groupRef.current.rotation.x = Math.max(-0.8, Math.min(0.8, groupRef.current.rotation.x));
      prevMouse.current = { x: clientX, y: clientY };
    };

    const handleUp = () => {
      isDragging.current = false;
    };

    const onMouseDown = (e: MouseEvent) => handleDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleUp();

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => handleUp();

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Rebuild 3D Model when selected product, color or material properties change
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear previous model children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    const currentProd = products.find((p) => p.id === selectedProductId);
    const type = currentProd?.model3dType || 'cylinder';
    const primaryColor = new THREE.Color(meshColor);

    const standardMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      metalness: metallic,
      roughness: roughness,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.1,
    });

    if (type === 'cylinder') {
      // Luxury Watch Model
      const caseGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.22, 48);
      const caseMesh = new THREE.Mesh(caseGeo, standardMat);
      caseMesh.castShadow = true;
      group.add(caseMesh);

      // Watch Dial Bezel
      const dialGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.24, 48);
      const dialMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
      const dialMesh = new THREE.Mesh(dialGeo, dialMat);
      group.add(dialMesh);

      // Crown knob
      const crownGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.15, 24);
      const crown = new THREE.Mesh(crownGeo, standardMat);
      crown.rotation.z = Math.PI / 2;
      crown.position.set(0.85, 0, 0);
      group.add(crown);

      // Straps
      const strapGeo = new THREE.BoxGeometry(0.5, 0.12, 1.6);
      const strapMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
      const strap = new THREE.Mesh(strapGeo, strapMat);
      group.add(strap);
    } else if (type === 'bottle') {
      // Luxury Perfume Bottle
      const bodyGeo = new THREE.BoxGeometry(0.9, 1.3, 0.5);
      const bodyMesh = new THREE.Mesh(bodyGeo, standardMat);
      bodyMesh.castShadow = true;
      group.add(bodyMesh);

      // Gold Collar
      const collarGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.18, 32);
      const collar = new THREE.Mesh(collarGeo, accentMat);
      collar.position.y = 0.72;
      group.add(collar);

      // Cap
      const capGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
      const cap = new THREE.Mesh(capGeo, standardMat);
      cap.position.y = 1.0;
      group.add(cap);
    } else if (type === 'device') {
      // Wireless ANC Headphones
      const ear1Geo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32);
      const ear1 = new THREE.Mesh(ear1Geo, standardMat);
      ear1.rotation.z = Math.PI / 2;
      ear1.position.set(-0.7, 0, 0);
      group.add(ear1);

      const ear2 = new THREE.Mesh(ear1Geo, standardMat);
      ear2.rotation.z = Math.PI / 2;
      ear2.position.set(0.7, 0, 0);
      group.add(ear2);

      // Headband Arc
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.7, 0.1, 0),
        new THREE.Vector3(-0.5, 0.9, 0),
        new THREE.Vector3(0, 1.1, 0),
        new THREE.Vector3(0.5, 0.9, 0),
        new THREE.Vector3(0.7, 0.1, 0),
      ]);
      const bandGeo = new THREE.TubeGeometry(curve, 32, 0.08, 12, false);
      const band = new THREE.Mesh(bandGeo, accentMat);
      group.add(band);
    } else if (type === 'can') {
      // Coffee Tin / Canister
      const canGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.4, 48);
      const can = new THREE.Mesh(canGeo, standardMat);
      can.castShadow = true;
      group.add(can);

      const lidGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.12, 48);
      const lid = new THREE.Mesh(lidGeo, accentMat);
      lid.position.y = 0.72;
      group.add(lid);
    } else {
      // Premium Packaging Box
      const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const box = new THREE.Mesh(boxGeo, standardMat);
      box.castShadow = true;
      group.add(box);
    }
  }, [selectedProductId, products, meshColor, metallic, roughness]);

  const handleCaptureSnapshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `mizan-3d-model-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">استوديو العرض والتجسيم ثلاثي الأبعاد (Mizan 3D)</h1>
          <p className="text-xs text-slate-400">محرك WebGL محلي كامل — تدوير، تحريك، خامات معدنية والتقاط صور عالية الدقة</p>
        </div>

        {/* Product selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">الصنف:</span>
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              const p = products.find((item) => item.id === e.target.value);
              if (p?.model3dColor) setMeshColor(p.model3dColor);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D WebGL Viewport */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[480px]">
          <div
            ref={mountRef}
            className="w-full h-[420px] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center"
          />

          {/* Interactive Helper Overlay */}
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-950/80 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-full text-[11px] text-slate-300">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>اسحب بالماوس أو الإصبع لتدوير المجسم 360°</span>
          </div>

          {/* Quick Toolbar below 3D scene */}
          <div className="flex items-center gap-2.5 mt-3">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-colors ${
                autoRotate
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>دوران تلقائي (Turntable)</span>
            </button>
            <button
              onClick={handleCaptureSnapshot}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>التقاط صورة 3D فورية</span>
            </button>
          </div>
        </div>

        {/* 3D Materials & Lighting Controller */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>خصائص الخامات والإضاءة 3D</span>
            </h3>

            {/* Mesh Color Picker */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium block">لون خامة المجسم</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={meshColor}
                  onChange={(e) => setMeshColor(e.target.value)}
                  className="w-10 h-8 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                />
                <span className="font-mono text-xs text-slate-400 uppercase">{meshColor}</span>
              </div>
            </div>

            {/* Metallic Level */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>البريق المعدني (Metalness)</span>
                <span>{Math.round(metallic * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={metallic}
                onChange={(e) => setMetallic(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Roughness */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>خشونة السطح (Roughness)</span>
                <span>{Math.round(roughness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={roughness}
                onChange={(e) => setRoughness(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Light Intensity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>شدة إضاءة الاستوديو</span>
                <span>{lightIntensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={lightIntensity}
                onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Technical guarantee */}
            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
              <div className="text-white font-bold">✓ تقنية WebGL المباشرة</div>
              <p>
                يتم تصيير المجسمات باستخدام وحدة معالجة الرسوميات (GPU) على جهازك مباشرة عبر Three.js دون أي خوادم خارجية أو تكلفة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
