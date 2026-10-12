import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  Building,
  Save,
  CheckCircle,
  AlertTriangle,
  X,
  ShieldCheck,
} from 'lucide-react';
import { db } from '../services/db';
import { CompanySettings } from '../types';

interface BackupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReloadApp: () => void;
}

export const BackupSettingsModal: React.FC<BackupSettingsModalProps> = ({
  isOpen,
  onClose,
  onReloadApp,
}) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      db.getById<CompanySettings>('settings', 'company_settings').then(setSettings);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportBackup = async () => {
    try {
      const jsonBackup = await db.exportFullBackup();
      const blob = new Blob([jsonBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mizan-ultra-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setStatusMsg({ text: 'تم تصدير النسخة الاحتياطية بنجاح مع حساب رمز التحقق Checksum.' });
    } catch (err: any) {
      setStatusMsg({ text: `فشل التصدير: ${err.message}`, isError: true });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await db.importFullBackup(text);
        if (res.success) {
          setStatusMsg({ text: res.message });
          onReloadApp();
        } else {
          setStatusMsg({ text: res.message, isError: true });
        }
      } catch (err: any) {
        setStatusMsg({ text: `خطأ في قراءة الملف: ${err.message}`, isError: true });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDemo = async () => {
    if (window.confirm('هل أنت متأكد من استعادة البيانات التجريبية الأولية؟')) {
      await db.resetToDemo();
      setStatusMsg({ text: 'تمت استعادة البيانات التجريبية بنجاح.' });
      onReloadApp();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    await db.put('settings', { id: 'company_settings', ...settings });
    setStatusMsg({ text: 'تم حفظ إعدادات الشركة بنجاح.' });
    onReloadApp();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">النسخ الاحتياطي وإعدادات الشركة</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMsg.isError
                ? 'bg-rose-950 border border-rose-800 text-rose-300'
                : 'bg-emerald-950 border border-emerald-800 text-emerald-300'
            }`}
          >
            {statusMsg.isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Backup Operations */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>النسخ الاحتياطي والاستعادة المشفرة (IndexedDB)</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            احفظ نسخة كاملة من دفاتر اليومية، الفواتير، المخزون، والعملاء في ملف JSON محمي برمز Checksum.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>تصدير نسخة كاملة</span>
            </button>

            <label className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>{importing ? 'جاري الاستيراد...' : 'استيراد نسخة ملف'}</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={handleResetToDemo}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-semibold rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة البيانات التجريبية الأولية</span>
            </button>
          </div>
        </div>

        {/* Company Settings Form */}
        {settings && (
          <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
            <h3 className="font-bold text-white pt-2 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-amber-400" />
              <span>بيانات المنشأة والهوية الرسمية للفواتير</span>
            </h3>

            <div>
              <label className="block text-slate-400 mb-1">الاسم التجاري للمنشأة</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">الرقم الضريبي</label>
                <input
                  type="text"
                  value={settings.taxNumber}
                  onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">العنوان الرسمي للمحل أو الفرع</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl"
              >
                حفظ التعديلات
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
