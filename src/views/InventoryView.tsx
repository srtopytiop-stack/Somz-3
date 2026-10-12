import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  Search,
  ArrowUpDown,
  History,
  QrCode,
  Tag,
  Boxes,
  CheckCircle,
} from 'lucide-react';
import { db } from '../services/db';
import { Product, StockMovement, CurrencyCode, StockMovementType } from '../types';
import { QRCodeGenerator, Barcode1DGenerator } from '../services/barcodeEngine';

interface InventoryViewProps {
  currency: CurrencyCode;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ currency }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'movements'>('products');
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState<Product | null>(null);

  // New product form state
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [sku, setSku] = useState('');
  const [categoryName, setCategoryName] = useState('عام');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [minStockLevel, setMinStockLevel] = useState(5);
  const [unit, setUnit] = useState('قطعة');
  const [model3dType, setModel3dType] = useState<'box' | 'cylinder' | 'bottle' | 'can' | 'device'>('cylinder');
  const [model3dColor, setModel3dColor] = useState('#d4af37');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const prods = await db.getAll<Product>('products');
    const movs = await db.getAll<StockMovement>('stockMovements');
    setProducts(prods);
    setMovements(movs.reverse());
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !sku) return;

    const newProd: Product = {
      id: selectedProduct?.id || `prod_${Date.now()}`,
      sku,
      barcode: `628${Math.floor(100000000 + Math.random() * 900000000)}`,
      nameAr,
      nameEn,
      categoryId: 'cat_' + categoryName,
      categoryName,
      purchasePrice,
      sellingPrice,
      costPrice: purchasePrice,
      currentStock,
      minStockLevel,
      unit,
      images: selectedProduct?.images || [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      ],
      model3dType,
      model3dColor,
      createdAt: selectedProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.put('products', newProd);

    // If new product with initial stock, log opening movement
    if (!selectedProduct && currentStock > 0) {
      await db.put('stockMovements', {
        id: `mov_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        productId: newProd.id,
        productName: newProd.nameAr,
        sku: newProd.sku,
        type: 'opening',
        quantity: currentStock,
        unitCost: purchasePrice,
        totalCost: currentStock * purchasePrice,
        balanceAfter: currentStock,
        notes: 'رصيد مخزون افتتاحي عند إضافة الصنف',
      });
    }

    setShowAddModal(false);
    setSelectedProduct(null);
    resetForm();
    await loadData();
  };

  const resetForm = () => {
    setNameAr('');
    setNameEn('');
    setSku('');
    setCategoryName('عام');
    setPurchasePrice(0);
    setSellingPrice(0);
    setCurrentStock(0);
    setMinStockLevel(5);
    setUnit('قطعة');
    setModel3dType('cylinder');
    setModel3dColor('#d4af37');
  };

  const handleQuickAdjust = async (prod: Product, delta: number, type: StockMovementType) => {
    const newStock = Math.max(0, prod.currentStock + delta);
    prod.currentStock = newStock;
    prod.updatedAt = new Date().toISOString();
    await db.put('products', prod);

    await db.put('stockMovements', {
      id: `mov_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      productId: prod.id,
      productName: prod.nameAr,
      sku: prod.sku,
      type,
      quantity: delta,
      unitCost: prod.costPrice || prod.purchasePrice,
      totalCost: Math.abs(delta) * (prod.costPrice || prod.purchasePrice),
      balanceAfter: newStock,
      notes: `تسوية سريعة (${type === 'adjustment_plus' ? 'إضافة' : 'إنقاص / تلف'})`,
    });

    await loadData();
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.nameAr.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(search.toLowerCase());
    if (filterLowStock) {
      return matchSearch && p.currentStock <= p.minStockLevel;
    }
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">إدارة المخزون والمنتجات المتطورة</h1>
          <p className="text-xs text-slate-400">تتبع حركات الوارد والمنصرف، حد إعادة الطلب وتوليد الباركود</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'products' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              الأصناف ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'movements' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              سجل الحركات ({movements.length})
            </button>
          </div>

          <button
            onClick={() => {
              resetForm();
              setSelectedProduct(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>صنف جديد</span>
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم، SKU، أو الفئة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pr-9 pl-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                filterLowStock
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>أصناف منخفضة المخزون فقط</span>
            </button>
          </div>

          {/* Products Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="py-3 px-3">الرمز SKU</th>
                    <th className="py-3 px-3">اسم الصنف</th>
                    <th className="py-3 px-3">الفئة</th>
                    <th className="py-3 px-3">سعر الشراء</th>
                    <th className="py-3 px-3">سعر البيع</th>
                    <th className="py-3 px-3 text-center">الرصيد المتاح</th>
                    <th className="py-3 px-3 text-center">حد الطلب</th>
                    <th className="py-3 px-3 text-center">تسوية سريعة</th>
                    <th className="py-3 px-3 text-center">الباركود</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProducts.map((p) => {
                    const isLow = p.currentStock <= p.minStockLevel;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-slate-300">{p.sku}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{p.nameAr}</div>
                          {p.nameEn && <div className="text-[10px] text-slate-500">{p.nameEn}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                            {p.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {p.purchasePrice.toLocaleString()} {currency}
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-400">
                          {p.sellingPrice.toLocaleString()} {currency}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              p.currentStock <= 0
                                ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                                : isLow
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/60 animate-pulse'
                                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            }`}
                          >
                            {p.currentStock} {p.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">{p.minStockLevel}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleQuickAdjust(p, 1, 'adjustment_plus')}
                              title="إضافة 1 قطعة للمخزن"
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(p, -1, 'adjustment_minus')}
                              title="خصم 1 قطعة من المخزن"
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                            >
                              -
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setShowBarcodeModal(p)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                            title="عرض وطباعة الباركود و QR"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Stock Movements Ledger */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white">سجل ودفتر حركات المخزون التفصيلي</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 pb-2">
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">الصنف</th>
                  <th className="py-2.5 px-3">نوع الحركة</th>
                  <th className="py-2.5 px-3 text-center">الكمية</th>
                  <th className="py-2.5 px-3">تكلفة الوحدة</th>
                  <th className="py-2.5 px-3 text-center">الرصيد بعد الحركة</th>
                  <th className="py-2.5 px-3">البيان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 text-slate-400">{m.date}</td>
                    <td className="py-3 px-3 font-bold text-white">{m.productName}</td>
                    <td className="py-3 px-3">
                      <span className="text-slate-300">
                        {m.type === 'sale'
                          ? 'مبيعات'
                          : m.type === 'purchase'
                          ? 'مشتريات'
                          : m.type === 'opening'
                          ? 'افتتاحي'
                          : 'تسوية'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={m.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{m.unitCost.toLocaleString()} {currency}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-400">{m.balanceAfter}</td>
                    <td className="py-3 px-3 text-slate-400">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD/EDIT PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">إضافة صنف جديد إلى المخزون</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم الصنف باللغة العربية *</label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  placeholder="مثال: ساعة رويال أوتوماتيكية"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الرمز التعريفي الفريد SKU *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                    placeholder="مثال: MIZ-001"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الفئة / التصنيف</label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                    placeholder="ساعات، عطور، إلكترونيات..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">سعر الشراء والتكلفة</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">سعر البيع الافتراضي</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الكمية الافتتاحية</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">حد إعادة الطلب</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">وحدة القياس</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="قطعة">قطعة</option>
                    <option value="علبة">علبة</option>
                    <option value="زجاجة">زجاجة</option>
                    <option value="كغ">كغ</option>
                    <option value="متر">متر</option>
                    <option value="كيس">كيس</option>
                  </select>
                </div>
              </div>

              {/* 3D Model Configuration */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-slate-300 font-bold block">إعدادات المجسم 3D التفاعلي للمنتج</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">شكل المجسم الهندسي</label>
                    <select
                      value={model3dType}
                      onChange={(e: any) => setModel3dType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                    >
                      <option value="cylinder">أسطواني (ساعة / علبة)</option>
                      <option value="bottle">زجاجة (عطر / مشروب)</option>
                      <option value="box">صندوق / علبة كرتون</option>
                      <option value="can">علبة معدنية / كانز</option>
                      <option value="device">جهاز تقني / سماعة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">لون خامة المجسم</label>
                    <input
                      type="color"
                      value={model3dColor}
                      onChange={(e) => setModel3dColor(e.target.value)}
                      className="w-full h-8 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl"
                >
                  حفظ الصنف في المخزون
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE & QR MODAL */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">ملصق الباركود و QR للصنف</h3>
              <button onClick={() => setShowBarcodeModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="bg-white text-slate-950 p-4 rounded-xl space-y-3">
              <div className="font-black text-xs">{showBarcodeModal.nameAr}</div>
              <div className="text-[10px] font-mono text-slate-600">SKU: {showBarcodeModal.sku}</div>

              {/* 1D Barcode */}
              <div
                dangerouslySetInnerHTML={{
                  __html: Barcode1DGenerator.generateSVG(showBarcodeModal.sku, { width: 220, height: 60 }),
                }}
              />

              {/* QR Code */}
              <div
                className="flex justify-center"
                dangerouslySetInnerHTML={{
                  __html: QRCodeGenerator.generateSVG(
                    `MIZAN-PRODUCT:${showBarcodeModal.sku}|PRICE:${showBarcodeModal.sellingPrice}`,
                    { size: 100 }
                  ),
                }}
              />

              <div className="font-black text-sm text-slate-950 pt-1 border-t border-slate-200">
                {showBarcodeModal.sellingPrice.toLocaleString()} {currency}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                طباعة الملصق
              </button>
              <button
                onClick={() => setShowBarcodeModal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
