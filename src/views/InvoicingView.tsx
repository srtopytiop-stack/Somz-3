import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  Search,
  ShoppingCart,
  User,
  CreditCard,
  QrCode,
  DollarSign,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { db } from '../services/db';
import { accountingEngine } from '../services/accountingEngine';
import { QRCodeGenerator } from '../services/barcodeEngine';
import { Product, Invoice, Party, InvoiceType, PaymentMethod, CurrencyCode } from '../types';

interface InvoicingViewProps {
  currency: CurrencyCode;
}

export const InvoicingView: React.FC<InvoicingViewProps> = ({ currency }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Form states
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('sale');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [partyName, setPartyName] = useState<string>('عميل نقدي عام');
  const [partyPhone, setPartyPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  interface CartItem {
    product: Product;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxPercent: number;
  }
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const invs = await db.getAll<Invoice>('invoices');
    const prods = await db.getAll<Product>('products');
    const pts = await db.getAll<Party>('parties');
    setInvoices(invs.reverse());
    setProducts(prods);
    setParties(pts);
  };

  const handleSelectParty = (pId: string) => {
    setSelectedPartyId(pId);
    const p = parties.find((item) => item.id === pId);
    if (p) {
      setPartyName(p.name);
      setPartyPhone(p.phone || '');
    } else {
      setPartyName('عميل نقدي عام');
      setPartyPhone('');
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: invoiceType === 'sale' ? product.sellingPrice : product.purchasePrice,
          discountPercent: 0,
          taxPercent: 0,
        },
      ];
    });
  };

  const updateCartItem = (productId: string, field: keyof CartItem, val: number) => {
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, [field]: Math.max(0, val) } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalDiscount = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.discountPercent / 100),
    0
  );
  const totalTax = cart.reduce((sum, item) => {
    const afterDisc = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
    return sum + afterDisc * (item.taxPercent / 100);
  }, 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

  const handlePostInvoice = async () => {
    if (cart.length === 0) {
      setErrorMessage('يجب إضافة منتج واحد على الأقل إلى الفاتورة');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const itemsToPost = cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.nameAr,
        sku: c.product.sku,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        costPrice: c.product.costPrice || c.product.purchasePrice,
        discountPercent: c.discountPercent,
        taxPercent: c.taxPercent,
        unit: c.product.unit,
      }));

      const paid =
        paymentMethod === 'partial'
          ? parseFloat(paidAmountInput) || 0
          : paymentMethod === 'cash' || paymentMethod === 'bank'
          ? grandTotal
          : 0;

      const result = await accountingEngine.postInvoice({
        type: invoiceType,
        date: new Date().toISOString().split('T')[0],
        partyId: selectedPartyId || undefined,
        partyName: partyName || 'عميل نقدي عام',
        partyPhone,
        currency,
        items: itemsToPost,
        paymentMethod,
        paidAmount: paid,
        notes,
      });

      setSuccessMessage(`تم ترحيل الفاتورة بنجاح برقم: ${result.invoice.invoiceNumber}`);
      setCart([]);
      setIsCreating(false);
      setViewInvoice(result.invoice);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل ترحيل الفاتورة');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (filterType === 'all') return true;
    if (filterType === 'sale') return inv.type === 'sale';
    if (filterType === 'purchase') return inv.type === 'purchase';
    if (filterType === 'unpaid') return inv.status === 'partially_paid' || inv.status === 'posted';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-950/80 border border-rose-700/60 text-rose-300 rounded-xl text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">إدارة الفواتير ونقاط البيع السريعة</h1>
          <p className="text-xs text-slate-400">إنشاء وترحيل فواتير المبيعات والمشتريات مع القيد المحاسبي المزدوج</p>
        </div>

        {!isCreating && (
          <button
            onClick={() => {
              setIsCreating(true);
              setViewInvoice(null);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>فاتورة جديدة (نقطة بيع)</span>
          </button>
        )}
      </div>

      {/* CREATION FORM / POS INTERFACE */}
      {isCreating ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center: Product Picker & Catalog */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">اختر الأصناف للإضافة إلى الفاتورة</span>
                <span className="text-xs text-amber-400 font-medium">{products.length} صنف متاح بالمخزن</span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، SKU أو الباركود..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pr-9 pl-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto p-1">
                {products
                  .filter(
                    (p) =>
                      p.nameAr.toLowerCase().includes(productSearch.toLowerCase()) ||
                      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
                      (p.barcode && p.barcode.includes(productSearch))
                  )
                  .map((p) => {
                    const price = invoiceType === 'sale' ? p.sellingPrice : p.purchasePrice;
                    const isLow = p.currentStock <= p.minStockLevel;
                    return (
                      <div
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 p-2.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono text-slate-400">{p.sku}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                p.currentStock <= 0
                                  ? 'bg-rose-950 text-rose-400'
                                  : isLow
                                  ? 'bg-amber-950 text-amber-400'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              مخزون: {p.currentStock}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white line-clamp-2 leading-relaxed">
                            {p.nameAr}
                          </h4>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                          <span className="text-xs font-black text-amber-400">
                            {price.toLocaleString()} {currency}
                          </span>
                          <span className="w-5 h-5 rounded-full bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors">
                            +
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right: Cart, Customer & Final Posting */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
              {/* Type Switcher */}
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setInvoiceType('sale')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors ${
                    invoiceType === 'sale' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  فاتورة مبيعات
                </button>
                <button
                  onClick={() => setInvoiceType('purchase')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors ${
                    invoiceType === 'purchase' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  فاتورة مشتريات
                </button>
              </div>

              {/* Party selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  {invoiceType === 'sale' ? 'العميل أو المشتري' : 'المورد أو البائع'}
                </label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => handleSelectParty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">عميل نقدي عام (بدون حساب آجل)</option>
                  {parties.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} (رصيد حالي: {pt.currentBalance.toLocaleString()} د.ع)
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    سلة الفاتورة فارغة. انقر على الأصناف لإضافتها.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white line-clamp-1">{item.product.nameAr}</span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">الكمية</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateCartItem(item.product.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-center font-bold text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">السعر</span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateCartItem(item.product.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-center font-bold text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">الخصم %</span>
                          <input
                            type="number"
                            value={item.discountPercent}
                            onChange={(e) => updateCartItem(item.product.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-center font-bold text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300 block">طريقة السداد</span>
                <div className="grid grid-cols-4 gap-1 text-[11px] font-medium">
                  {(['cash', 'bank', 'credit', 'partial'] as PaymentMethod[]).map((pm) => (
                    <button
                      key={pm}
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-1.5 rounded-lg border text-center transition-colors ${
                        paymentMethod === pm
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                          : 'border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pm === 'cash' ? 'نقدي' : pm === 'bank' ? 'بنكي' : pm === 'credit' ? 'آجل' : 'جزئي'}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'partial' && (
                  <div className="pt-2">
                    <label className="text-[10px] text-slate-400 block mb-1">المبلغ المسدد مقدماً الآن</label>
                    <input
                      type="number"
                      placeholder={`مثال: ${(grandTotal / 2).toFixed(0)}`}
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-950 p-3 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>المجموع الفرعي</span>
                  <span>{subtotal.toLocaleString()} {currency}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>إجمالي الخصم</span>
                    <span>- {totalDiscount.toLocaleString()} {currency}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base text-white pt-2 border-t border-slate-800">
                  <span>الإجمالي النهائي</span>
                  <span className="text-amber-400">{grandTotal.toLocaleString()} {currency}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handlePostInvoice}
                  disabled={submitting || cart.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? 'جاري الترحيل...' : 'ترحيل وحفظ الفاتورة مع القيد'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* PRINTABLE RECEIPT MODAL */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>فاتورة مرحلة ومحفوظة محاسبياً</span>
              </div>
              <button onClick={() => setViewInvoice(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Printable Area */}
            <div id="printable-receipt" className="bg-white text-slate-950 p-6 rounded-xl space-y-4 text-xs font-sans">
              <div className="text-center space-y-1 border-b pb-3 border-slate-200">
                <h2 className="text-lg font-black tracking-tight">مجموعة ميزان التجارية الحديثة</h2>
                <p className="text-[11px] text-slate-600">فاتورة ضريبية مبسطة / إيصال مبيعات</p>
                <p className="text-[10px] text-slate-500">رقم الفاتورة: {viewInvoice.invoiceNumber}</p>
                <p className="text-[10px] text-slate-500">التاريخ: {viewInvoice.date}</p>
              </div>

              <div className="flex justify-between text-[11px] border-b pb-2 border-slate-200">
                <div>
                  <span className="text-slate-500 block">العميل:</span>
                  <span className="font-bold">{viewInvoice.partyName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">طريقة الدفع:</span>
                  <span className="font-bold">
                    {viewInvoice.paymentMethod === 'cash' ? 'نقدي' : viewInvoice.paymentMethod === 'bank' ? 'بنكي' : 'آجل'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-1">الصنف</th>
                    <th className="py-1 text-center">الكمية</th>
                    <th className="py-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewInvoice.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-1.5 font-medium">{it.productName}</td>
                      <td className="py-1.5 text-center">{it.quantity}</td>
                      <td className="py-1.5 text-left font-bold">{it.total.toLocaleString()} د.ع</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between font-black text-sm">
                  <span>الإجمالي الكلي:</span>
                  <span>{viewInvoice.grandTotal.toLocaleString()} د.ع</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>المدفوع:</span>
                  <span>{viewInvoice.paidAmount.toLocaleString()} د.ع</span>
                </div>
                {viewInvoice.remainingAmount > 0 && (
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>المتبقي الآجل:</span>
                    <span>{viewInvoice.remainingAmount.toLocaleString()} د.ع</span>
                  </div>
                )}
              </div>

              {/* Local QR Code */}
              <div className="pt-3 border-t border-slate-200 flex flex-col items-center justify-center space-y-1">
                <div
                  dangerouslySetInnerHTML={{
                    __html: QRCodeGenerator.generateSVG(
                      `MIZAN-INVOICE:${viewInvoice.invoiceNumber}|TOTAL:${viewInvoice.grandTotal}`,
                      { size: 90 }
                    ),
                  }}
                />
                <span className="text-[9px] text-slate-500">رمز التحقق المالي المشفر محلياً</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإيصال الفوري</span>
              </button>
              <button
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICES LIST & ARCHIVE */}
      {!isCreating && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white">سجل وأرشيف الفواتير المعتمدة</h2>

            {/* Filter buttons */}
            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl text-xs font-medium">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'sale', label: 'المبيعات' },
                { id: 'purchase', label: 'المشتريات' },
                { id: 'unpaid', label: 'غير المسددة' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    filterType === f.id ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 pb-2">
                  <th className="py-2 px-3">رقم الفاتورة</th>
                  <th className="py-2 px-3">النوع</th>
                  <th className="py-2 px-3">الطرف</th>
                  <th className="py-2 px-3">التاريخ</th>
                  <th className="py-2 px-3">الإجمالي</th>
                  <th className="py-2 px-3">المتبقي</th>
                  <th className="py-2 px-3">الحالة</th>
                  <th className="py-2 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-amber-400">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3">
                      <span className="text-slate-300">
                        {inv.type === 'sale' ? 'مبيعات' : 'مشتريات'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-white">{inv.partyName}</td>
                    <td className="py-3 px-3 text-slate-400">{inv.date}</td>
                    <td className="py-3 px-3 font-bold text-white">{inv.grandTotal.toLocaleString()} {currency}</td>
                    <td className="py-3 px-3 text-rose-400 font-medium">
                      {inv.remainingAmount > 0 ? `${inv.remainingAmount.toLocaleString()} ${currency}` : '0'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          inv.status === 'paid'
                            ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/60'
                            : inv.status === 'partially_paid'
                            ? 'text-amber-400 bg-amber-950/80 border border-amber-800/60'
                            : 'text-blue-400 bg-blue-950/80 border border-blue-800/60'
                        }`}
                      >
                        {inv.status === 'paid' ? 'مسددة' : inv.status === 'partially_paid' ? 'مسددة جزئياً' : 'آجلة'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setViewInvoice(inv)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        معاينة وطباعة
                      </button>
                    </td>
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
