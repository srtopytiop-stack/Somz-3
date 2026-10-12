import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Receipt,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { db } from '../services/db';
import { accountingEngine } from '../services/accountingEngine';
import { Party, PaymentReceipt, Account, CurrencyCode } from '../types';

interface PartiesViewProps {
  currency: CurrencyCode;
}

export const PartiesView: React.FC<PartiesViewProps> = ({ currency }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers' | 'receipts'>('customers');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Party | null>(null);

  // New Party Form
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState(0);

  // Payment Form
  const [paymentType, setPaymentType] = useState<'receipt' | 'payment'>('receipt');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const pts = await db.getAll<Party>('parties');
    const rcts = await db.getAll<PaymentReceipt>('paymentReceipts');
    const accs = await db.getAll<Account>('accounts');
    setParties(pts);
    setReceipts(rcts.reverse());
    setAccounts(accs);
    const defaultCash = accs.find((a) => a.code === '1010');
    if (defaultCash) setSelectedAccountId(defaultCash.id);
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newParty: Party = {
      id: `party_${Date.now()}`,
      type: partyType,
      name,
      phone,
      email,
      address,
      creditLimit,
      currentBalance: 0,
      createdAt: new Date().toISOString(),
    };

    await db.put('parties', newParty);
    setShowAddPartyModal(false);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCreditLimit(0);
    await loadData();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal || paymentAmount <= 0 || !selectedAccountId) return;

    setSubmitting(true);
    try {
      await accountingEngine.recordPayment({
        type: paymentType,
        partyId: showPaymentModal.id,
        partyName: showPaymentModal.name,
        accountId: selectedAccountId,
        date: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        notes: paymentNotes || `سداد لحساب ${showPaymentModal.name}`,
      });

      setShowPaymentModal(null);
      setPaymentAmount(0);
      setPaymentNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredParties = parties.filter((p) => {
    const matchType =
      activeTab === 'customers' ? p.type === 'customer' || p.type === 'both' : p.type === 'supplier' || p.type === 'both';
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone && p.phone.includes(search));
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">العملاء، الموردون وسندات القبض والصرف</h1>
          <p className="text-xs text-slate-400">متابعة الديون المستحقة، كشوف الحسابات وسداد الفواتير</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'customers' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              العملاء والمدينون
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'suppliers' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              الموردون والدائنون
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'receipts' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              أرشيف السندات ({receipts.length})
            </button>
          </div>

          <button
            onClick={() => setShowAddPartyModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طرف جديد</span>
          </button>
        </div>
      </div>

      {activeTab !== 'receipts' ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم العميل أو المورد أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pr-9 pl-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Parties List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <th className="py-3 px-3">الاسم التجاري</th>
                    <th className="py-3 px-3">الهاتف</th>
                    <th className="py-3 px-3">العنوان</th>
                    <th className="py-3 px-3">الرصيد المحاسبي الحالي</th>
                    <th className="py-3 px-3">سقف الائتمان</th>
                    <th className="py-3 px-3 text-center">إجراء سند فوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredParties.map((p) => {
                    const isOwedToUs = p.currentBalance > 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{p.name}</div>
                          {p.email && <div className="text-[10px] text-slate-500">{p.email}</div>}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-mono">{p.phone || '—'}</td>
                        <td className="py-3 px-3 text-slate-400">{p.address || '—'}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-bold ${
                              isOwedToUs
                                ? 'text-amber-400'
                                : p.currentBalance < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {Math.abs(p.currentBalance).toLocaleString()} {currency}
                            {isOwedToUs ? ' (مدين لنا)' : p.currentBalance < 0 ? ' (دائن علينا)' : ' (خالص)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {p.creditLimit ? `${p.creditLimit.toLocaleString()} ${currency}` : 'غير محدد'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setShowPaymentModal(p);
                              setPaymentType(p.type === 'customer' ? 'receipt' : 'payment');
                              setPaymentAmount(Math.abs(p.currentBalance));
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium text-[11px] transition-colors"
                          >
                            {p.type === 'customer' ? 'سند قبض نقدية' : 'سند صرف نقدية'}
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
        /* Receipts and Vouchers Archive */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white">سجل سندات القبض والصرف المحاسبية</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 pb-2">
                  <th className="py-2.5 px-3">رقم السند</th>
                  <th className="py-2.5 px-3">النوع</th>
                  <th className="py-2.5 px-3">الطرف المستفيد / المسدد</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">المبلغ</th>
                  <th className="py-2.5 px-3">البيان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-medium text-amber-400">{r.receiptNumber}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.type === 'receipt'
                            ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800'
                            : 'text-rose-400 bg-rose-950/80 border border-rose-800'
                        }`}
                      >
                        {r.type === 'receipt' ? 'سند قبض' : 'سند صرف'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">{r.partyName}</td>
                    <td className="py-3 px-3 text-slate-400">{r.date}</td>
                    <td className="py-3 px-3 font-black text-white">
                      {r.amount.toLocaleString()} {currency}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE PARTY MODAL */}
      {showAddPartyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">إضافة عميل أو مورد جديد</h2>
              <button onClick={() => setShowAddPartyModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateParty} className="space-y-3 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPartyType('customer')}
                  className={`flex-1 py-1.5 rounded-xl border font-bold ${
                    partyType === 'customer'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  عميل (مشتري)
                </button>
                <button
                  type="button"
                  onClick={() => setPartyType('supplier')}
                  className={`flex-1 py-1.5 rounded-xl border font-bold ${
                    partyType === 'supplier'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  مورد (بائع)
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الاسم التجاري أو الشخصي *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  placeholder="مثال: شركة الفرات للتوزيع"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    placeholder="0770..."
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">العنوان أو المدينة</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  placeholder="بغداد، البصرة..."
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl"
                >
                  حفظ البيانات
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT RECEIPT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">
                  {paymentType === 'receipt' ? 'سند قبض نقدية' : 'سند صرف نقدية'}
                </h2>
                <p className="text-xs text-amber-400">{showPaymentModal.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">المبلغ المراد سداده *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold text-amber-400 text-base"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الحساب النقدي أو البنكي</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  {accounts
                    .filter((a) => a.code === '1010' || a.code === '1020')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nameAr} (رصيده: {a.balance.toLocaleString()} د.ع)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">البيان والملاحظات</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  placeholder="دفعة من حساب فاتورة..."
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl"
                >
                  {submitting ? 'جاري الترحيل...' : 'ترحيل السند والقيد المحاسبي'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(null)}
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
