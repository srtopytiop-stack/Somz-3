import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Scale,
  FolderTree,
  DollarSign,
  Search,
} from 'lucide-react';
import { db } from '../services/db';
import { accountingEngine } from '../services/accountingEngine';
import { JournalEntry, Account, AccountCategory, CurrencyCode } from '../types';

interface JournalViewProps {
  currency: CurrencyCode;
}

export const JournalView: React.FC<JournalViewProps> = ({ currency }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<'journal' | 'chart'>('journal');
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [search, setSearch] = useState('');

  // Manual Entry Form State
  interface EntryFormLine {
    accountId: string;
    debit: number;
    credit: number;
    description: string;
  }
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryNarration, setEntryNarration] = useState('');
  const [lines, setLines] = useState<EntryFormLine[]>([
    { accountId: '', debit: 0, credit: 0, description: '' },
    { accountId: '', debit: 0, credit: 0, description: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Account Form
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccNameAr, setNewAccNameAr] = useState('');
  const [newAccCategory, setNewAccCategory] = useState<AccountCategory>('expense');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const jes = await db.getAll<JournalEntry>('journalEntries');
    const accs = await db.getAll<Account>('accounts');
    setEntries(jes.reverse());
    setAccounts(accs);
  };

  const handleLineChange = (index: number, field: keyof EntryFormLine, val: any) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addLine = () => {
    setLines((prev) => [...prev, { accountId: '', debit: 0, credit: 0, description: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit as any) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit as any) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  const handlePostManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setErrorMessage('لا يمكن ترحيل القيد: مجموع المدين يجب أن يساوي تماماً مجموع الدائن!');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const validLines = lines.map((l) => {
        const acc = accounts.find((a) => a.id === l.accountId);
        return {
          accountId: l.accountId,
          accountCode: acc?.code || '',
          accountName: acc?.nameAr || '',
          debit: parseFloat(l.debit as any) || 0,
          credit: parseFloat(l.credit as any) || 0,
          currency,
          exchangeRate: 1,
          description: l.description || entryNarration,
        };
      });

      await accountingEngine.postJournalEntry({
        date: entryDate,
        referenceType: 'manual',
        narration: entryNarration || 'قيد يومية يدوي مرحل',
        lines: validLines,
      });

      setShowAddEntryModal(false);
      setEntryNarration('');
      setLines([
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' },
      ]);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode || !newAccNameAr) return;

    const newAcc: Account = {
      id: `acc_${newAccCode}`,
      code: newAccCode,
      nameAr: newAccNameAr,
      nameEn: newAccNameAr,
      category: newAccCategory,
      balance: 0,
      isSystem: false,
      currency: 'IQD',
    };

    await db.put('accounts', newAcc);
    setShowAddAccountModal(false);
    setNewAccCode('');
    setNewAccNameAr('');
    await loadData();
  };

  const categoryNames: Record<AccountCategory, string> = {
    asset: 'الأصول (الموجودات)',
    liability: 'الالتزامات (الخصوم)',
    equity: 'حقوق الملكية ورأس المال',
    revenue: 'الإيرادات والمبيعات',
    expense: 'المصروفات وتكلفة البضاعة',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">دفتر اليومية العامة ودليل الحسابات</h1>
          <p className="text-xs text-slate-400">نظام القيد المزدوج الإلزامي (Debit = Credit) وإدارة شجرة الحسابات</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('journal')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'journal' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              دفتر اليومية ({entries.length})
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'chart' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              دليل الحسابات ({accounts.length})
            </button>
          </div>

          {activeTab === 'journal' ? (
            <button
              onClick={() => setShowAddEntryModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>قيد محاسبي جديد</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حساب جديد</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'journal' ? (
        /* Journal Entries List */
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                    {entry.entryNumber}
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">{entry.narration}</h3>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      التاريخ: {entry.date} · المرجع: {entry.referenceType}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-white">
                    المجموع: {entry.totalDebit.toLocaleString()} {currency}
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded font-bold">
                    قيد مرحل متزن ✓
                  </span>
                </div>
              </div>

              {/* Journal Lines Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="text-slate-400 pb-1 text-[11px]">
                      <th className="py-1 px-2">رمز الحساب</th>
                      <th className="py-1 px-2">اسم الحساب</th>
                      <th className="py-1 px-2">البيان الفرعي</th>
                      <th className="py-1 px-2 text-left">مدين (Debit)</th>
                      <th className="py-1 px-2 text-left">دائن (Credit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {entry.lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-800/20">
                        <td className="py-2 px-2 font-mono text-slate-400">{line.accountCode}</td>
                        <td className="py-2 px-2 font-bold text-slate-200">{line.accountName}</td>
                        <td className="py-2 px-2 text-slate-400 text-[11px]">{line.description || '—'}</td>
                        <td className="py-2 px-2 text-left font-mono font-bold text-emerald-400">
                          {line.debit > 0 ? `${line.debit.toLocaleString()} ${currency}` : '—'}
                        </td>
                        <td className="py-2 px-2 text-left font-mono font-bold text-rose-400">
                          {line.credit > 0 ? `${line.credit.toLocaleString()} ${currency}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Chart of Accounts Grid */
        <div className="space-y-6">
          {(['asset', 'liability', 'equity', 'revenue', 'expense'] as AccountCategory[]).map((cat) => {
            const catAccounts = accounts.filter((a) => a.category === cat);
            const totalCategoryBalance = catAccounts.reduce((sum, a) => sum + a.balance, 0);

            return (
              <div key={cat} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-amber-400" />
                    <span>{categoryNames[cat]}</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    إجمالي الرصيد: {totalCategoryBalance.toLocaleString()} {currency}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">{acc.code}</span>
                          <span className="font-bold text-xs text-white">{acc.nameAr}</span>
                        </div>
                        {acc.description && (
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{acc.description}</div>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="font-mono font-black text-xs text-white">
                          {acc.balance.toLocaleString()}
                        </span>
                        <div className="text-[9px] text-slate-500">{currency}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MANUAL JOURNAL ENTRY MODAL */}
      {showAddEntryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <span>تسجيل قيد يومية يدوي متوازن (Double Entry)</span>
              </h2>
              <button onClick={() => setShowAddEntryModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handlePostManualEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">تاريخ القيد</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">البيان العام والشرح</label>
                  <input
                    type="text"
                    required
                    value={entryNarration}
                    onChange={(e) => setEntryNarration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                    placeholder="إثبات مصاريف إيجار نقداً..."
                  />
                </div>
              </div>

              {/* Lines list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-300">بنود وأطراف القيد (أطراف متوازنة)</span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-amber-400 hover:text-amber-300 font-bold text-xs"
                  >
                    + إضافة طرف آخر
                  </button>
                </div>

                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 items-center">
                    <div className="col-span-5">
                      <select
                        required
                        value={line.accountId}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-[11px]"
                      >
                        <option value="">-- اختر الحساب --</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="مدين (Debit)"
                        value={line.debit || ''}
                        onChange={(e) => handleLineChange(idx, 'debit', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-left font-mono font-bold text-emerald-400 text-[11px]"
                      />
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="دائن (Credit)"
                        value={line.credit || ''}
                        onChange={(e) => handleLineChange(idx, 'credit', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-left font-mono font-bold text-rose-400 text-[11px]"
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length <= 2}
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Debits vs Total Credits Balance Bar */}
              <div className="bg-slate-950 p-3 rounded-xl space-y-1.5 border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">إجمالي المدين:</span>
                  <span className="font-mono font-bold text-emerald-400">{totalDebit.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">إجمالي الدائن:</span>
                  <span className="font-mono font-bold text-rose-400">{totalCredit.toLocaleString()} {currency}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs font-bold">
                  <span>حالة الاتزان المحاسبي:</span>
                  {isBalanced ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      القيد متوازن تماماً (جاهز للترحيل)
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      غير متوازن! الفارق: {Math.abs(totalDebit - totalCredit).toLocaleString()} {currency}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !isBalanced}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-xl"
                >
                  {submitting ? 'جاري الترحيل...' : 'ترحيل القيد رسمياً إلى دفتر اليومية'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ACCOUNT MODAL */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">إضافة حساب جديد إلى الدليل</h2>
              <button onClick={() => setShowAddAccountModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">رمز الحساب (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 5060"
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم الحساب باللغة العربية *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مصاريف صيانة السيارات"
                  value={newAccNameAr}
                  onChange={(e) => setNewAccNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">التصنيف المحاسبي الرئيسي</label>
                <select
                  value={newAccCategory}
                  onChange={(e: any) => setNewAccCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="asset">أصل (Asset)</option>
                  <option value="liability">التزام (Liability)</option>
                  <option value="equity">حقوق ملكية (Equity)</option>
                  <option value="revenue">إيراد (Revenue)</option>
                  <option value="expense">مصروف (Expense)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl"
                >
                  حفظ الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
