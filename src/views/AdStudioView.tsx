import React, { useState, useRef, useEffect } from 'react';
import {
  Megaphone,
  Download,
  Share2,
  Tag,
  Sparkles,
  Palette,
  QrCode,
  DollarSign,
  TrendingUp,
  Layout,
  Plus,
} from 'lucide-react';
import { db } from '../services/db';
import { Product, CurrencyCode, MarketingCampaign } from '../types';
import { QRCodeGenerator } from '../services/barcodeEngine';

interface AdStudioViewProps {
  currency: CurrencyCode;
}

export const AdStudioView: React.FC<AdStudioViewProps> = ({ currency }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [format, setFormat] = useState<'square' | 'story' | 'banner'>('square');
  const [headline, setHeadline] = useState('عرض الموسم الخاص — لفترة محدودة!');
  const [subheadline, setSubheadline] = useState('أفضل جودة وضمان حقيقي مع شحن فوري لكافة المحافظات');
  const [originalPrice, setOriginalPrice] = useState<number>(220000);
  const [salePrice, setSalePrice] = useState<number>(185000);
  const [contactText, setContactText] = useState('للطلب والاستفسار: 0770 123 4567 | بغداد، الكرادة');
  const [badgeText, setBadgeText] = useState('خصم 20% لفترة محدودة');
  const [gradientTheme, setGradientTheme] = useState<'gold' | 'neon' | 'red' | 'dark' | 'emerald'>('gold');

  // Campaign management tab
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [activeTab, setActiveTab] = useState<'designer' | 'campaigns'>('designer');

  const adCanvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadProductsAndCampaigns();
  }, []);

  const loadProductsAndCampaigns = async () => {
    const prods = await db.getAll<Product>('products');
    const camps = await db.getAll<MarketingCampaign>('campaigns');
    setProducts(prods);
    setCampaigns(camps);

    if (prods.length > 0) {
      setSelectedProductId(prods[0].id);
      setOriginalPrice(Math.round(prods[0].sellingPrice * 1.25));
      setSalePrice(prods[0].sellingPrice);
    }
  };

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const p = products.find((item) => item.id === prodId);
    if (p) {
      setOriginalPrice(Math.round(p.sellingPrice * 1.25));
      setSalePrice(p.sellingPrice);
      setHeadline(`عرض خاص على: ${p.nameAr}`);
    }
  };

  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const getGradientStyles = () => {
    switch (gradientTheme) {
      case 'gold':
        return 'from-amber-950 via-slate-950 to-stone-900 border-amber-600/40 text-amber-100';
      case 'neon':
        return 'from-indigo-950 via-slate-950 to-cyan-950 border-cyan-500/40 text-cyan-100';
      case 'red':
        return 'from-rose-950 via-neutral-950 to-red-950 border-rose-600/40 text-rose-100';
      case 'emerald':
        return 'from-emerald-950 via-slate-950 to-teal-950 border-emerald-600/40 text-emerald-100';
      default:
        return 'from-slate-950 via-zinc-900 to-black border-slate-700/50 text-slate-100';
    }
  };

  const discountPercent =
    originalPrice > salePrice ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">استوديو الإعلانات والتسويق التجاري (Mizan Ad Studio)</h1>
          <p className="text-xs text-slate-400">تصميم بوسترات احترافية، شارات الخصومات، كود QR وحساب العائد على الحملات</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('designer')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'designer' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              مصمم الإعلانات
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'campaigns' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              سجل الحملات والميزانية
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'designer' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Ad Live Preview Viewport */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div
              ref={adCanvasRef}
              className={`w-full max-w-[440px] rounded-2xl p-6 border shadow-2xl bg-gradient-to-br transition-all flex flex-col justify-between overflow-hidden relative ${getGradientStyles()} ${
                format === 'square'
                  ? 'aspect-square'
                  : format === 'story'
                  ? 'aspect-[9/16] max-w-[360px]'
                  : 'aspect-[16/9]'
              }`}
            >
              {/* Header Store Brand */}
              <div className="flex items-center justify-between z-10">
                <div>
                  <span className="font-black text-xs tracking-wider uppercase text-amber-400">
                    مجموعة ميزان التجارية
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono">MIZAN ULTRA EXCLUSIVE</div>
                </div>
                {discountPercent > 0 && (
                  <div className="bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-lg shadow-rose-600/30">
                    وفر {discountPercent}%
                  </div>
                )}
              </div>

              {/* Main Product Showcase Center */}
              <div className="my-auto py-3 space-y-3 text-center z-10 flex flex-col items-center">
                {currentProduct?.images?.[0] && (
                  <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-black/40">
                    <img
                      src={currentProduct.images[0]}
                      alt={currentProduct.nameAr}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[10px] font-semibold tracking-wide text-amber-400 uppercase">
                    {badgeText}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                    {headline}
                  </h3>
                  <p className="text-[11px] text-slate-300 max-w-xs mx-auto line-clamp-2">
                    {subheadline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline justify-center gap-3 pt-1">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">
                    {salePrice.toLocaleString()} {currency}
                  </span>
                  {originalPrice > salePrice && (
                    <span className="text-xs line-through text-slate-400">
                      {originalPrice.toLocaleString()} {currency}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer with QR Code & Contact */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between z-10">
                <div className="space-y-0.5 text-right">
                  <div className="text-[10px] font-bold text-white">{contactText}</div>
                  <div className="text-[9px] text-slate-400">امسح رمز الاستجابة السريعة للتفاصيل الفورية</div>
                </div>

                <div
                  className="bg-white p-1 rounded-lg shrink-0 shadow-md"
                  dangerouslySetInnerHTML={{
                    __html: QRCodeGenerator.generateSVG(
                      `MIZAN-OFFER:${currentProduct?.sku || 'OFFER'}|SALE:${salePrice}`,
                      { size: 52 }
                    ),
                  }}
                />
              </div>
            </div>

            {/* Quick Export toolbar */}
            <div className="flex items-center gap-2.5 mt-5">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>طباعة / تصدير التصميم (PDF/PNG)</span>
              </button>
            </div>
          </div>

          {/* Ad Customization Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 text-xs">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>تخصيص عناصر الإعلان والمحتوى</span>
              </h3>

              {/* Select product */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">اختر المنتج المعلن عنه</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} ({p.sellingPrice.toLocaleString()} {currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Format / Aspect ratio */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">مقاس وحجم التصميم</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'square', label: 'مربع (1:1)' },
                    { id: 'story', label: 'ستوري (9:16)' },
                    { id: 'banner', label: 'عرضي (16:9)' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id as any)}
                      className={`py-1.5 rounded-xl border text-center font-medium transition-colors ${
                        format === fmt.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                          : 'border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background gradient theme */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">النمط اللوني والخلفية</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: 'gold', label: 'ذهبي' },
                    { id: 'neon', label: 'نيوني' },
                    { id: 'red', label: 'عروض' },
                    { id: 'emerald', label: 'طبيعي' },
                    { id: 'dark', label: 'داكن' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGradientTheme(g.id as any)}
                      className={`py-1 rounded-lg border text-[10px] transition-colors ${
                        gradientTheme === g.id
                          ? 'bg-amber-500/30 border-amber-500 text-amber-300 font-bold'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">العنوان الإعلاني البارز</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>

              {/* Subheadline */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">الوصف والمزايا</label>
                <input
                  type="text"
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>

              {/* Price Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">السعر الأصلي (قبل)</label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white line-through text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">سعر العرض (بعد)</label>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold text-amber-400"
                  />
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">بيانات التواصل والمتجر</label>
                <input
                  type="text"
                  value={contactText}
                  onChange={(e) => setContactText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Campaigns ROI Tracker */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">تتبع الحملات التسويقية والإنفاق الإعلاني</h2>
            <button
              onClick={async () => {
                const newCamp: MarketingCampaign = {
                  id: `camp_${Date.now()}`,
                  name: `حملة عروض الخريف ${new Date().getFullYear()}`,
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: '2026-11-15',
                  productIds: products.slice(0, 2).map((p) => p.id),
                  budget: 250000,
                  actualCost: 180000,
                  notes: 'إعلانات ممولة على وسائل التواصل الاجتماعي والمطبوعات',
                };
                await db.put('campaigns', newCamp);
                loadProductsAndCampaigns();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل حملة جديدة</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 pb-2">
                  <th className="py-2.5 px-3">اسم الحملة</th>
                  <th className="py-2.5 px-3">تاريخ البدء</th>
                  <th className="py-2.5 px-3">الميزانية المرصودة</th>
                  <th className="py-2.5 px-3">التكلفة الفعلية</th>
                  <th className="py-2.5 px-3">الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-white">{c.name}</td>
                    <td className="py-3 px-3 text-slate-400">{c.startDate}</td>
                    <td className="py-3 px-3 text-slate-300">{c.budget.toLocaleString()} {currency}</td>
                    <td className="py-3 px-3 font-bold text-amber-400">{c.actualCost.toLocaleString()} {currency}</td>
                    <td className="py-3 px-3 text-slate-400">{c.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
