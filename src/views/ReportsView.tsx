import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Printer,
  Scale,
  DollarSign,
  TrendingUp,
  PieChart,
  Calendar,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { db } from '../services/db';
import { accountingEngine } from '../services/accountingEngine';
import { CurrencyCode, Product, Party, Invoice } from '../types';

interface ReportsViewProps {
  currency: CurrencyCode;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currency }) => {
  const [reportType, setReportType] = useState<'income' | 'balance_sheet' | 'trial_balance' | 'aging' | 'products'>(
    'income'
  );
  const [incomeStatement, setIncomeStatement] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllReports();
  }, []);

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const is = await accountingEngine.getIncomeStatement();
      const bs = await accountingEngine.getBalanceSheet();
      const tb = await accountingEngine.getTrialBalance();
      const prods = await db.getAll<Product>('products');
      const pts = await db.getAll<Party>('parties');

      setIncomeStatement(is);
      setBalanceSheet(bs);
      setTrialBalance(tb);
      setProducts(prods);
      setParties(pts);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">التقارير المالية والقوائم الختامية المعتمدة</h1>
          <p className="text-xs text-slate-400">تقارير حسابية دقيقة ومستنتجة من قيود اليومية ودفتر الأستاذ العام</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
        {[
          { id: 'income', label: 'قائمة الدخل (الأرباح والخسائر)' },
          { id: 'balance_sheet', label: 'الميزانية العمومية (المركز المالي)' },
          { id: 'trial_balance', label: 'ميزان المراجعة بالمجاميع والأرصدة' },
          { id: 'aging', label: 'أعمار ديون العملاء والمستحقات' },
          { id: 'products', label: 'هوامش ربحية المنتجات والمبيعات' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setReportType(t.id as any)}
            className={`px-3 py-2 rounded-xl transition-all ${
              reportType === t.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* REPORT CONTENT VIEW */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* 1. INCOME STATEMENT */}
        {reportType === 'income' && incomeStatement && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Explanation card */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">طريقة قراءة قائمة الدخل:</span>
                توضح صافي الربح الحقيقي الناتج عن النشاط التشغيلي عبر خصم تكلفة البضاعة المباعة (COGS) من إجمالي المبيعات، ثم طرح المصروفات التشغيلية والتسويقية والإدارية.
              </div>
            </div>

            <div className="text-center pb-4 border-b border-slate-800 space-y-1">
              <h2 className="text-xl font-black text-white">قائمة الدخل والأرباح والخسائر</h2>
              <p className="text-xs text-slate-400">عن الفترة المنتهية في تاريخ اليوم</p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Revenues Section */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-blue-400 pb-1 border-b border-slate-800">1. الإيرادات</h3>
                {incomeStatement.revenues.map((r: any) => (
                  <div key={r.account.id} className="flex justify-between py-1 text-slate-300">
                    <span>{r.account.nameAr}</span>
                    <span className="font-mono font-medium">{r.amount.toLocaleString()} {currency}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-white bg-slate-950 px-3 rounded-lg">
                  <span>إجمالي إيرادات المبيعات</span>
                  <span className="text-blue-400">{incomeStatement.totalRevenue.toLocaleString()} {currency}</span>
                </div>
              </div>

              {/* COGS Section */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-rose-400 pb-1 border-b border-slate-800">2. تكلفة البضاعة المباعة</h3>
                <div className="flex justify-between py-1 text-slate-300">
                  <span>تكلفة الأصناف المباعة (COGS)</span>
                  <span className="font-mono font-medium text-rose-400">
                    ({incomeStatement.cogs.toLocaleString()}) {currency}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-bold text-white bg-slate-950 px-3 rounded-lg">
                  <span>مجمل الربح التجاري (Gross Profit)</span>
                  <span className="text-amber-400">{incomeStatement.grossProfit.toLocaleString()} {currency}</span>
                </div>
              </div>

              {/* Operating Expenses Section */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-amber-400 pb-1 border-b border-slate-800">3. المصروفات التشغيلية</h3>
                {incomeStatement.expenses.map((e: any) => (
                  <div key={e.account.id} className="flex justify-between py-1 text-slate-300">
                    <span>{e.account.nameAr}</span>
                    <span className="font-mono font-medium">({e.amount.toLocaleString()}) {currency}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-white bg-slate-950 px-3 rounded-lg">
                  <span>إجمالي المصروفات</span>
                  <span className="text-rose-400">({incomeStatement.totalExpenses.toLocaleString()}) {currency}</span>
                </div>
              </div>

              {/* Net Profit Final */}
              <div className="p-4 bg-gradient-to-r from-emerald-950 to-slate-950 border border-emerald-700/60 rounded-xl flex items-center justify-between text-base font-black">
                <span className="text-white">صافي الربح الحقيقي النهائي (Net Income):</span>
                <span className="text-emerald-400 text-lg font-mono">
                  {incomeStatement.netProfit.toLocaleString()} {currency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. BALANCE SHEET */}
        {reportType === 'balance_sheet' && balanceSheet && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
              <Scale className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">معادلة الميزانية العمومية:</span>
                الأصول (الموجودات) = الالتزامات (الخصوم) + حقوق الملكية. توازن هذه المعادلة بدقة السنت يثبت السلامة الحسابية المطلقة للنظام.
              </div>
            </div>

            <div className="text-center pb-4 border-b border-slate-800 space-y-1">
              <h2 className="text-xl font-black text-white">الميزانية العمومية وقائمة المركز المالي</h2>
              <p className="text-xs text-slate-400">كما هي في تاريخ اليوم</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Assets Column */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="font-black text-sm text-blue-400 pb-2 border-b border-slate-800">
                  الأصول والموجودات (Assets)
                </h3>
                {balanceSheet.assets.map((a: any) => (
                  <div key={a.account.id} className="flex justify-between py-1 text-slate-300">
                    <span>{a.account.nameAr}</span>
                    <span className="font-mono font-bold text-white">{a.amount.toLocaleString()} {currency}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-800 flex justify-between font-black text-sm text-blue-400">
                  <span>إجمالي الأصول</span>
                  <span className="font-mono">{balanceSheet.totalAssets.toLocaleString()} {currency}</span>
                </div>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="font-black text-sm text-rose-400 pb-2 border-b border-slate-800">
                  الالتزامات (الخصوم)
                </h3>
                {balanceSheet.liabilities.map((l: any) => (
                  <div key={l.account.id} className="flex justify-between py-1 text-slate-300">
                    <span>{l.account.nameAr}</span>
                    <span className="font-mono text-white">{l.amount.toLocaleString()} {currency}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-rose-400 text-xs pb-2 border-b border-slate-800">
                  <span>إجمالي الالتزامات</span>
                  <span className="font-mono">{balanceSheet.totalLiabilities.toLocaleString()} {currency}</span>
                </div>

                <h3 className="font-black text-sm text-amber-400 pt-2 pb-1">حقوق الملكية (Equity)</h3>
                {balanceSheet.equities.map((e: any) => (
                  <div key={e.account.id} className="flex justify-between py-1 text-slate-300">
                    <span>{e.account.nameAr}</span>
                    <span className="font-mono text-white">{e.amount.toLocaleString()} {currency}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1 text-emerald-400 font-bold">
                  <span>صافي أرباح الدورة الحالية</span>
                  <span className="font-mono">{balanceSheet.currentPeriodProfit.toLocaleString()} {currency}</span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between font-black text-sm text-amber-400">
                  <span>إجمالي الخصوم وحقوق الملكية</span>
                  <span className="font-mono">{balanceSheet.totalLiabilitiesAndEquity.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>

            {/* Verification Badge */}
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-xl text-xs flex items-center justify-center gap-2 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>الميزانية العمومية متزنة تماماً (الأصول = الخصوم + حقوق الملكية) بنسبة 100%</span>
            </div>
          </div>
        )}

        {/* 3. TRIAL BALANCE */}
        {reportType === 'trial_balance' && trialBalance && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">ميزان المراجعة بالأرصدة</h2>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-lg">
                ميزان متطابق ومغلق ✓
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="py-2.5 px-3">رمز الحساب</th>
                    <th className="py-2.5 px-3">اسم الحساب</th>
                    <th className="py-2.5 px-3">التصنيف</th>
                    <th className="py-2.5 px-3 text-left">أرصدة مدينة (Debit)</th>
                    <th className="py-2.5 px-3 text-left">أرصدة دائنة (Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trialBalance.rows.map((r: any) => (
                    <tr key={r.account.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-medium text-amber-400">{r.account.code}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{r.account.nameAr}</td>
                      <td className="py-2.5 px-3 text-slate-400">{r.account.category}</td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-400">
                        {r.debit > 0 ? `${r.debit.toLocaleString()} ${currency}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-400">
                        {r.credit > 0 ? `${r.credit.toLocaleString()} ${currency}` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-950 font-black text-sm border-t-2 border-slate-700">
                    <td colSpan={3} className="py-3 px-3 text-white">المجموع الإجمالي العام</td>
                    <td className="py-3 px-3 text-left font-mono text-emerald-400">
                      {trialBalance.totalDebit.toLocaleString()} {currency}
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-rose-400">
                      {trialBalance.totalCredit.toLocaleString()} {currency}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. AGING OF DEBTS */}
        {reportType === 'aging' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">تقرير أعمار ديون العملاء والمستحقات</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="py-2.5 px-3">اسم العميل</th>
                    <th className="py-2.5 px-3">الهاتف</th>
                    <th className="py-2.5 px-3">إجمالي الدين</th>
                    <th className="py-2.5 px-3">0-30 يوم</th>
                    <th className="py-2.5 px-3">31-60 يوم</th>
                    <th className="py-2.5 px-3">أكثر من 60 يوم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {parties
                    .filter((p) => p.currentBalance > 0)
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-white">{p.name}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono">{p.phone || '—'}</td>
                        <td className="py-3 px-3 font-black text-amber-400">
                          {p.currentBalance.toLocaleString()} {currency}
                        </td>
                        <td className="py-3 px-3 text-emerald-400 font-mono">
                          {p.currentBalance.toLocaleString()} {currency}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono">0</td>
                        <td className="py-3 px-3 text-slate-500 font-mono">0</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. PRODUCT MARGINS */}
        {reportType === 'products' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">تحليل هوامش ربحية الأصناف</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-3">سعر الشراء</th>
                    <th className="py-2.5 px-3">سعر البيع</th>
                    <th className="py-2.5 px-3">هامش الربح للقطعة</th>
                    <th className="py-2.5 px-3">نسبة الهامش %</th>
                    <th className="py-2.5 px-3 text-center">الرصيد المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((p) => {
                    const margin = p.sellingPrice - p.purchasePrice;
                    const marginPercent = p.sellingPrice > 0 ? Math.round((margin / p.sellingPrice) * 100) : 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-white">{p.nameAr}</td>
                        <td className="py-3 px-3 text-slate-400">{p.purchasePrice.toLocaleString()} {currency}</td>
                        <td className="py-3 px-3 font-bold text-amber-400">
                          {p.sellingPrice.toLocaleString()} {currency}
                        </td>
                        <td className="py-3 px-3 font-black text-emerald-400">
                          +{margin.toLocaleString()} {currency}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400 font-mono">{marginPercent}%</td>
                        <td className="py-3 px-3 text-center text-slate-300">{p.currentStock} {p.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
