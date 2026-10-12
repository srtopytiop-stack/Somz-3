import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingBag,
  CreditCard,
  Camera,
  Megaphone,
} from 'lucide-react';
import { db } from '../services/db';
import { accountingEngine } from '../services/accountingEngine';
import { Product, Invoice, Party, CurrencyCode } from '../types';
import { TabKey } from '../components/Navigation';

interface DashboardViewProps {
  onNavigate: (tab: TabKey) => void;
  currency: CurrencyCode;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, currency }) => {
  const [financials, setFinancials] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const is = await accountingEngine.getIncomeStatement();
      const bs = await accountingEngine.getBalanceSheet();
      const prods = await db.getAll<Product>('products');
      const invs = await db.getAll<Invoice>('invoices');

      setFinancials(is);
      setBalanceSheet(bs);
      setProducts(prods);
      setRecentInvoices(invs.slice(-6).reverse());
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStockLevel);
  const totalInventoryValue = products.reduce((sum, p) => sum + p.currentStock * (p.costPrice || p.purchasePrice), 0);

  // Cash & Bank balance lookup from Balance Sheet assets
  const cashAccounts = balanceSheet?.assets.filter((a: any) => a.account.code === '1010' || a.account.code === '1020') || [];
  const totalLiquidCash = cashAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);

  // Accounts Receivable (AR)
  const arAcc = balanceSheet?.assets.find((a: any) => a.account.code === '1030');
  const totalReceivables = arAcc ? arAcc.amount : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            لوحة الإدارة والنشاط المالي
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            ملخص فوري ودقيق لحركة الصندوق، المبيعات، الأرباح الحقيقية ومخزون البضاعة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('invoicing')}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>فاتورة مبيعات جديدة</span>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span>إضافة صنف</span>
          </button>
          <button
            onClick={() => onNavigate('product_studio')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>استوديو الصور</span>
          </button>
          <button
            onClick={() => onNavigate('ad_studio')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Megaphone className="w-4 h-4 text-purple-400" />
            <span>تصميم إعلان</span>
          </button>
        </div>
      </div>

      {/* Critical Reorder Alert if low stock exists */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-200">
              تنبيه حرج: توجد أصناف أوشكت على النفاد ({lowStockProducts.length} صنف)
            </h3>
            <p className="text-xs text-amber-300/80 mt-1">
              الأصناف التالية بلغت أو نزلت عن حد إعادة الطلب: {lowStockProducts.map((p) => `${p.nameAr} (متبقي ${p.currentStock})`).join('، ')}.
            </p>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 underline shrink-0"
          >
            إدارة المخزون
          </button>
        </div>
      )}

      {/* 6 Key Financial Metric Cards (True Double Entry Derived) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Sales Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>إجمالي المبيعات</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg md:text-xl font-black text-white">
            {(financials?.totalRevenue || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">{currency} (إيرادات مرحلة)</div>
        </div>

        {/* Cost of Goods Sold */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>تكلفة المباع (COGS)</span>
            <ShoppingBag className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg md:text-xl font-black text-rose-400">
            {(financials?.cogs || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">{currency} (تكلفة البضاعة)</div>
        </div>

        {/* Real Net Profit */}
        <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-4 space-y-1 bg-gradient-to-br from-emerald-950/20 to-slate-900">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>صافي الربح الحقيقي</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg md:text-xl font-black text-emerald-400">
            {(financials?.netProfit || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-300/70">{currency} (بعد خصم التكلفة)</div>
        </div>

        {/* Liquid Cash & Bank */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>السيولة (صندوق + بنك)</span>
            <CreditCard className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg md:text-xl font-black text-white">
            {totalLiquidCash.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">{currency} (نقدية متوفرة)</div>
        </div>

        {/* Inventory Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>قيمة المخزون (بالتكلفة)</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg md:text-xl font-black text-white">
            {totalInventoryValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">{currency} ({products.length} صنف مسجل)</div>
        </div>

        {/* Accounts Receivable */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ديون العملاء (الآجل)</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg md:text-xl font-black text-purple-300">
            {totalReceivables.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">{currency} (مستحقات واجبة التحصيل)</div>
        </div>
      </div>

      {/* Visual Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Breakdown Graphic */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">تحليل التدفق المالي والأرباح</h2>
              <p className="text-xs text-slate-400">المبيعات مقابل تكلفة البضاعة والمصروفات</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              عرض التقارير التفصيلية ←
            </button>
          </div>

          {/* Graphical Proportional Bars */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">إجمالي المبيعات المحققة</span>
                <span className="font-bold text-white">{(financials?.totalRevenue || 0).toLocaleString()} {currency}</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">تكلفة البضاعة المباعة (COGS)</span>
                <span className="font-bold text-rose-400">
                  {(financials?.cogs || 0).toLocaleString()} {currency} (
                  {financials?.totalRevenue ? Math.round((financials.cogs / financials.totalRevenue) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{
                    width: `${financials?.totalRevenue ? Math.min(100, Math.round((financials.cogs / financials.totalRevenue) * 100)) : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">المصروفات العامة والتشغيلية</span>
                <span className="font-bold text-amber-400">
                  {(financials?.totalExpenses || 0).toLocaleString()} {currency}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${financials?.totalRevenue ? Math.min(100, Math.round((financials.totalExpenses / financials.totalRevenue) * 100)) : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 font-bold">صافي الربح النهائي الصافي</span>
                <span className="font-bold text-emerald-400">
                  {(financials?.netProfit || 0).toLocaleString()} {currency}
                </span>
              </div>
              <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${financials?.totalRevenue ? Math.max(5, Math.min(100, Math.round((financials.netProfit / financials.totalRevenue) * 100))) : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights & Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white">ضمانات الدقة في ميزان Ultra</h2>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                ✓
              </div>
              <div>
                <span className="font-bold text-white block">قيد مزدوج متوازن إلزامي</span>
                لا يمكن ترحيل أي فاتورة أو حركة مالية دون تساوي المدين والدائن بدقة السنت.
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                ✓
              </div>
              <div>
                <span className="font-bold text-white block">ربط المخزون التلقائي</span>
                صرف البضاعة يولد قيد تكلفة مباعة (COGS) ويقلص أصل المخزون السلعي فورياً.
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                ✓
              </div>
              <div>
                <span className="font-bold text-white block">تخزين محلي مجاني 100%</span>
                جميع البيانات محفوظة بأمان داخل جهازك في IndexedDB مع إمكانية التصدير والاستعادة التامة.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">آخر الفواتير والمستندات المسجلة</h2>
          <button
            onClick={() => onNavigate('invoicing')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
          >
            عرض جميع الفواتير ←
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            لا توجد فواتير مسجلة بعد. أنشئ أول فاتورة مبيعات الآن!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 pb-2">
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">النوع</th>
                  <th className="py-2.5 px-3">الطرف / العميل</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-amber-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-300">
                        {inv.type === 'sale' ? 'مبيعات' : inv.type === 'purchase' ? 'مشتريات' : 'مرتجع'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-white font-medium">{inv.partyName}</td>
                    <td className="py-3 px-3 text-slate-400">{inv.date}</td>
                    <td className="py-3 px-3 font-bold text-white">
                      {inv.grandTotal.toLocaleString()} {currency}
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
                        {inv.status === 'paid' ? 'مسددة بالكامل' : inv.status === 'partially_paid' ? 'مسددة جزئياً' : 'مرحلة بالآجل'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
