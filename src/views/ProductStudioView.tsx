import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  Sliders,
  Download,
  Save,
  CheckCircle,
  Sparkles,
  Layers,
  Palette,
  Undo2,
} from 'lucide-react';
import { db } from '../services/db';
import { Product } from '../types';

export const ProductStudioView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'
  );

  // Filters & Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [bgTemplate, setBgTemplate] = useState<'none' | 'studio-white' | 'luxury-dark' | 'gold-gradient' | 'fresh-emerald' | 'tech-neon'>('none');
  const [showWatermark, setShowWatermark] = useState(true);
  const [badgeText, setBadgeText] = useState('عرض خاص');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    db.getAll<Product>('products').then((prods) => {
      setProducts(prods);
      if (prods.length > 0) {
        setSelectedProductId(prods[0].id);
        if (prods[0].images && prods[0].images.length > 0) {
          setCurrentImageSrc(prods[0].images[0]);
        }
      }
    });
  }, []);

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.images && prod.images.length > 0) {
      setCurrentImageSrc(prod.images[0]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCurrentImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Redraw canvas whenever adjustments change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 600;
      canvas.width = size;
      canvas.height = size;

      // 1. Draw Background template if selected
      if (bgTemplate === 'studio-white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
      } else if (bgTemplate === 'luxury-dark') {
        const grad = ctx.createRadialGradient(size / 2, size / 2, 50, size / 2, size / 2, size * 0.7);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      } else if (bgTemplate === 'gold-gradient') {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#451a03');
        grad.addColorStop(1, '#78350f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      } else if (bgTemplate === 'fresh-emerald') {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(1, '#022c22');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      } else if (bgTemplate === 'tech-neon') {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#3b0764');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      } else {
        ctx.clearRect(0, 0, size, size);
      }

      // 2. Draw Image with Rotation and CSS filters
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

      // Scale to fit nicely
      const scale = 0.85;
      const w = size * scale;
      const h = size * scale;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      // 3. Draw Watermark / Store badge if enabled
      if (showWatermark) {
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(size - 60, 60, 42, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#020617';
        ctx.font = 'bold 13px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, size - 60, 65);
        ctx.restore();

        // Footer brand
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '11px Cairo, sans-serif';
        ctx.fillText('MIZAN STUDIO ULTRA', 24, size - 24);
      }
    };
    img.src = currentImageSrc;
  }, [currentImageSrc, brightness, contrast, saturation, rotation, bgTemplate, showWatermark, badgeText]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `mizan-product-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleSaveToProduct = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedProductId) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const prod = await db.getById<Product>('products', selectedProductId);
    if (prod) {
      prod.images = [dataUrl, ...(prod.images || [])];
      prod.updatedAt = new Date().toISOString();
      await db.put('products', prod);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setBgTemplate('none');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">استوديو الكتالوج وتعديل صور المنتجات</h1>
          <p className="text-xs text-slate-400">تحرير الصور محلياً، ضبط الإضاءة، استبدال الخلفيات والشارات دون أي سيرفر</p>
        </div>

        {/* Product selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">ربط بالصنف:</span>
          <select
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
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
        {/* Canvas Display Viewport */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl p-6 relative">
          <div className="max-w-[480px] w-full aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>

          {/* Quick upload & rotate bar below preview */}
          <div className="flex items-center gap-3 mt-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>رفع صورة من الجهاز / الكاميرا</span>
            </button>
            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <RotateCw className="w-4 h-4 text-cyan-400" />
              <span>تدوير 90°</span>
            </button>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <Undo2 className="w-4 h-4 text-rose-400" />
              <span>إعادة ضبط</span>
            </button>
          </div>
        </div>

        {/* Adjustments & Templates Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>ضبط الإضاءة والألوان (Canvas Filters)</span>
            </h3>

            {/* Brightness */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>السطوع (Brightness)</span>
                <span>{brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>التباين (Contrast)</span>
                <span>{contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>تشبع الألوان (Saturation)</span>
                <span>{saturation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Background Studio Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-cyan-400" />
                <span>قوالب خلفيات الاستوديو المدمجة</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                {[
                  { id: 'none', label: 'شفاف / أصلي' },
                  { id: 'studio-white', label: 'أبيض نظيف' },
                  { id: 'luxury-dark', label: 'أسود فاخر' },
                  { id: 'gold-gradient', label: 'ذهبي وبني' },
                  { id: 'fresh-emerald', label: 'أخضر طبيعي' },
                  { id: 'tech-neon', label: 'تقني نيوني' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setBgTemplate(bg.id as any)}
                    className={`py-2 px-1 rounded-xl border text-center transition-colors ${
                      bgTemplate === bg.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                        : 'border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark & Badges */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">شارة التخفيض والشعار</span>
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  className="rounded accent-amber-500"
                />
              </div>
              {showWatermark && (
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  placeholder="نص الشارة..."
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              {savedSuccess && (
                <div className="p-2 bg-emerald-950 border border-emerald-700 text-emerald-400 rounded-lg text-xs text-center">
                  تم حفظ الصورة المعدلة بنجاح في بطاقة الصنف!
                </div>
              )}
              <button
                onClick={handleSaveToProduct}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>حفظ في بطاقة الصنف بالمخزون</span>
              </button>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>تصدير الصورة بجودة عالية PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
