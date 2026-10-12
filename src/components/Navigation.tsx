import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Package,
  Camera,
  Box,
  Megaphone,
  QrCode,
  Users,
  BookOpen,
  BarChart3,
} from 'lucide-react';

export type TabKey =
  | 'dashboard'
  | 'invoicing'
  | 'inventory'
  | 'product_studio'
  | 'threed'
  | 'ad_studio'
  | 'smart_scan'
  | 'parties'
  | 'journal'
  | 'reports';

interface NavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { key: 'dashboard' as TabKey, label: 'لوحة التحكم', icon: LayoutDashboard },
    { key: 'invoicing' as TabKey, label: 'الفواتير ونقاط البيع', icon: Receipt },
    { key: 'inventory' as TabKey, label: 'المخزون والأصناف', icon: Package },
    { key: 'product_studio' as TabKey, label: 'استوديو الكتالوج', icon: Camera },
    { key: 'threed' as TabKey, label: 'العرض 3D', icon: Box },
    { key: 'ad_studio' as TabKey, label: 'استوديو الإعلانات', icon: Megaphone },
    { key: 'smart_scan' as TabKey, label: 'الماسح والباركود', icon: QrCode },
    { key: 'parties' as TabKey, label: 'العملاء والموردون', icon: Users },
    { key: 'journal' as TabKey, label: 'اليومية والحسابات', icon: BookOpen },
    { key: 'reports' as TabKey, label: 'التقارير والقوائم', icon: BarChart3 },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-16 z-30 overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 space-x-reverse min-w-max py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
