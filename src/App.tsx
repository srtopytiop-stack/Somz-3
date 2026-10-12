/**
 * MIZAN ACCOUNTING ULTRA — Main Application Container
 * World-Class Free Business Platform · Double Entry Kernel · 3D WebGL · Offline-First
 */

import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { THEMES } from './themes/themeConfig';
import { ThemeId, CurrencyCode, CompanySettings } from './types';
import { Header } from './components/Header';
import { Navigation, TabKey } from './components/Navigation';
import { DashboardView } from './views/DashboardView';
import { InvoicingView } from './views/InvoicingView';
import { InventoryView } from './views/InventoryView';
import { ProductStudioView } from './views/ProductStudioView';
import { ThreeDStudioView } from './views/ThreeDStudioView';
import { AdStudioView } from './views/AdStudioView';
import { SmartScanView } from './views/SmartScanView';
import { PartiesView } from './views/PartiesView';
import { JournalView } from './views/JournalView';
import { ReportsView } from './views/ReportsView';
import { AssistantModal } from './components/AssistantModal';
import { DevAgentModal } from './components/DevAgentModal';
import { BackupSettingsModal } from './components/BackupSettingsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('business-classic');
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>('IQD');
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  // Modals
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isDevAgentOpen, setIsDevAgentOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await db.init();
    const settings = await db.getById<CompanySettings>('settings', 'company_settings');
    if (settings) {
      setCompanySettings(settings);
      if (settings.themeId) setCurrentTheme(settings.themeId);
      if (settings.baseCurrency) setCurrentCurrency(settings.baseCurrency);
    }
    setIsReady(true);
  };

  const handleThemeChange = async (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    if (companySettings) {
      const updated = { ...companySettings, themeId };
      setCompanySettings(updated);
      await db.put('settings', { id: 'company_settings', ...updated });
    }
  };

  const handleCurrencyChange = async (curr: CurrencyCode) => {
    setCurrentCurrency(curr);
  };

  const activeThemeConfig = THEMES[currentTheme] || THEMES['business-classic'];

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl animate-bounce shadow-xl shadow-amber-500/20">
          ⚖
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white">نظام ميزان المحاسبي الشامل — MIZAN ULTRA</h2>
          <p className="text-xs text-slate-400">جاري تهيئة النواة المحاسبية والمخزن المحلي الآمن...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${activeThemeConfig.bgClass}`}
      style={{ fontFamily: activeThemeConfig.fontFamily }}
    >
      {/* Global Header */}
      <Header
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        currentCurrency={currentCurrency}
        onCurrencyChange={handleCurrencyChange}
        companySettings={companySettings}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenDevAgent={() => setIsDevAgentOpen(true)}
        onOpenBackupSettings={() => setIsBackupOpen(true)}
      />

      {/* Main Navigation Bar */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView onNavigate={setActiveTab} currency={currentCurrency} />
        )}
        {activeTab === 'invoicing' && <InvoicingView currency={currentCurrency} />}
        {activeTab === 'inventory' && <InventoryView currency={currentCurrency} />}
        {activeTab === 'product_studio' && <ProductStudioView />}
        {activeTab === 'threed' && <ThreeDStudioView />}
        {activeTab === 'ad_studio' && <AdStudioView currency={currentCurrency} />}
        {activeTab === 'smart_scan' && <SmartScanView currency={currentCurrency} />}
        {activeTab === 'parties' && <PartiesView currency={currentCurrency} />}
        {activeTab === 'journal' && <JournalView currency={currentCurrency} />}
        {activeTab === 'reports' && <ReportsView currency={currentCurrency} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MIZAN ACCOUNTING ULTRA © 2026 — نظام محاسبي متكامل وحر</span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>تخزين مشفر في IndexedDB</span>
            <span aria-hidden="true">·</span>
            <span>نواة قيد مزدوج صلبة</span>
            <span aria-hidden="true">·</span>
            <span>استوديو 3D WebGL</span>
          </div>
        </div>
      </footer>

      {/* Floating Assistant, Dev Agent, and Backup Modals */}
      <AssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onNavigate={setActiveTab}
      />
      <DevAgentModal isOpen={isDevAgentOpen} onClose={() => setIsDevAgentOpen(false)} />
      <BackupSettingsModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onReloadApp={initApp}
      />
    </div>
  );
}
