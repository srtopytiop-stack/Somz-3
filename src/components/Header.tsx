import React from 'react';
import {
  Scale,
  Palette,
  Terminal,
  HelpCircle,
  Database,
  Sparkles,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { THEMES } from '../themes/themeConfig';
import { ThemeId, CurrencyCode, CompanySettings } from '../types';

interface HeaderProps {
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
  currentCurrency: CurrencyCode;
  onCurrencyChange: (curr: CurrencyCode) => void;
  companySettings: CompanySettings | null;
  onOpenAssistant: () => void;
  onOpenDevAgent: () => void;
  onOpenBackupSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTheme,
  onThemeChange,
  currentCurrency,
  onCurrencyChange,
  companySettings,
  onOpenAssistant,
  onOpenDevAgent,
  onOpenBackupSettings,
}) => {
  const activeTheme = THEMES[currentTheme] || THEMES['business-classic'];

  return (
    <header className={`sticky top-0 z-40 transition-colors duration-200 ${activeTheme.headerClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">
                  {companySettings?.companyName || 'ميزان ألترا — MIZAN ULTRA'}
                </span>
                {companySettings?.isDemoData && (
                  <span className="text-[11px] font-medium text-amber-400 bg-amber-950/80 border border-amber-700/60 px-2 py-0.5 rounded">
                    بيانات تجريبية أولية
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>نظام محاسبي حر</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  بدون اتصال وسحابي مجاني
                </span>
              </div>
            </div>
          </div>

          {/* Controls & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency selector */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
              {(['IQD', 'USD', 'EUR'] as CurrencyCode[]).map((c) => (
                <button
                  key={c}
                  onClick={() => onCurrencyChange(c)}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    currentCurrency === c
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Theme switcher */}
            <div className="relative group">
              <button
                title="تغيير النمط والهوية التجارية"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                <Palette className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">{activeTheme.nameAr.split(' ')[0]}</span>
              </button>

              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 hidden group-hover:block z-50 max-h-96 overflow-y-auto">
                <div className="px-3 py-1 text-xs font-semibold text-slate-400 border-b border-slate-800 mb-1">
                  اختر الهوية والنمط التجاري (11 نمطاً)
                </div>
                {Object.values(THEMES).map((th) => (
                  <button
                    key={th.id}
                    onClick={() => onThemeChange(th.id)}
                    className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      currentTheme === th.id ? 'bg-slate-800/90 text-amber-400 font-bold' : 'text-slate-200'
                    }`}
                  >
                    <span>{th.nameAr}</span>
                    <span
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: th.primaryColor }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Dev Agent Button */}
            <button
              onClick={onOpenDevAgent}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-700/60 text-indigo-200 text-xs font-medium transition-colors"
              title="وكيل تطوير ميزان وإصلاح الكود واختباراته"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">وكيل التطوير</span>
            </button>

            {/* Assistant Button */}
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/70 border border-amber-700/50 text-amber-300 text-xs font-medium transition-colors"
              title="مساعد ميزان الذكي"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">مساعد ميزان</span>
            </button>

            {/* Backup & Settings Button */}
            <button
              onClick={onOpenBackupSettings}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
              title="النسخ الاحتياطي والإعدادات"
            >
              <Database className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
