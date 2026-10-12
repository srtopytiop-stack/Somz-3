import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  QrCode,
  Search,
  CheckCircle,
  AlertCircle,
  Package,
  Printer,
  Upload,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { db } from '../services/db';
import { Product, CurrencyCode } from '../types';
import { QRCodeGenerator, Barcode1DGenerator } from '../services/barcodeEngine';

interface SmartScanViewProps {
  currency: CurrencyCode;
}

export const SmartScanView: React.FC<SmartScanViewProps> = ({ currency }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    db.getAll<Product>('products').then(setProducts);
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('المتصفح لا يدعم الوصول إلى الكاميرا مباشرة.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(
        err.message || 'تعذر تشغيل الكاميرا. يرجى التأكد من منح الإذن أو استخدام الإدخال اليدوي.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleLookup = (code: string) => {
    const clean = code.trim().toUpperCase();
    setScannedResult(clean);
    const prod = products.find(
      (p) =>
        p.sku.toUpperCase() === clean ||
        (p.barcode && p.barcode === clean) ||
        clean.includes(p.sku.toUpperCase())
    );
    setMatchedProduct(prod || null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">الماسح الذكي وقارئ الباركود (Mizan Smart Scan)</h1>
          <p className="text-xs text-slate-400">مسح رموز QR والباركود بكاميرا الهاتف أو الإدخال اليدوي للوصول الفوري لبيانات الصنف</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Viewport */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
          <div className="w-full max-w-md aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative flex items-center justify-center">
            {cameraActive ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" />
                {/* Visual Laser Scanner Animation */}
                <div className="absolute inset-x-8 top-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse"></div>
                <div className="absolute inset-8 border-2 border-dashed border-amber-400/60 rounded-xl pointer-events-none"></div>
              </>
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">الكاميرا متوقفة حالياً</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    اضغط أدناه لفتح كاميرا الهاتف ومسح ملصقات البضاعة والباركود فورياً
                  </p>
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="text-xs text-amber-400 bg-amber-950/60 border border-amber-800/60 p-2.5 rounded-xl text-center max-w-md w-full">
              {cameraError}
            </div>
          )}

          {/* Camera Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>تشغيل كاميرا المسح</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all"
              >
                <span>إيقاف الكاميرا</span>
              </button>
            )}
          </div>

          {/* Quick Manual Code Input */}
          <div className="w-full max-w-md pt-4 border-t border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-medium block">
              أو أدخل رمز الباركود أو SKU يدوياً أو عبر قارئ باركود USB:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="مثال: MIZ-WATCH-01 أو 628100234001"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLookup(manualCode);
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                onClick={() => handleLookup(manualCode)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700"
              >
                فحص الصنف
              </button>
            </div>
          </div>
        </div>

        {/* Scan Result / Product Details Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <span>نتيجة الفحص والمعلومات السريعة</span>
            </h3>

            {matchedProduct ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-emerald-800/60 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 block mb-0.5">
                        SKU: {matchedProduct.sku}
                      </span>
                      <h4 className="text-sm font-bold text-white">{matchedProduct.nameAr}</h4>
                      <p className="text-[11px] text-slate-400">{matchedProduct.categoryName}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold">
                      صنف مطابق
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">سعر البيع</span>
                      <span className="font-bold text-amber-400">
                        {matchedProduct.sellingPrice.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">الرصيد المتاح بالمخزن</span>
                      <span className="font-bold text-white">
                        {matchedProduct.currentStock} {matchedProduct.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Print Barcode Label for this product */}
                <div className="bg-white text-slate-950 p-4 rounded-xl text-center space-y-2">
                  <div className="font-black text-xs">{matchedProduct.nameAr}</div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: Barcode1DGenerator.generateSVG(matchedProduct.sku, { width: 220, height: 50 }),
                    }}
                  />
                  <div className="font-bold text-xs">{matchedProduct.sellingPrice.toLocaleString()} {currency}</div>
                  <button
                    onClick={() => window.print()}
                    className="w-full py-1.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg mt-2"
                  >
                    طباعة بطاقة الرف
                  </button>
                </div>
              </div>
            ) : scannedResult ? (
              <div className="p-6 bg-slate-950 rounded-xl text-center space-y-2 text-xs">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <div className="font-bold text-white">لم يتم العثور على صنف بالرمز:</div>
                <div className="font-mono text-amber-400">{scannedResult}</div>
                <p className="text-slate-400 text-[11px]">تأكد من إدخال الرمز الصحيح أو أضفه إلى المخزون أولاً.</p>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                قم بمسح أي باركود أو إدخال SKU لعرض بطاقة الصنف الفورية هنا.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
