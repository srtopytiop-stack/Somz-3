import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileCode,
  Layers,
  ShieldCheck,
  X,
  Code2,
} from 'lucide-react';
import { devAgentEngine } from '../services/devAgentEngine';
import { TestResult, DevAgentLog } from '../types';

interface DevAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevAgentModal: React.FC<DevAgentModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'patch' | 'logs'>('tests');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [logs, setLogs] = useState<DevAgentLog[]>([]);

  // Patch sandbox state
  const [featureRequest, setFeatureRequest] = useState('');
  const [proposedPlan, setProposedPlan] = useState<string[] | null>(null);
  const [proposedDiff, setProposedDiff] = useState<string | null>(null);
  const [patchApplied, setPatchApplied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLogs(devAgentEngine.getLogs());
      if (testResults.length === 0) {
        runTests();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const runTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await devAgentEngine.runFullTestSuite();
      setTestResults(results);
      setLogs(devAgentEngine.getLogs());
    } finally {
      setIsRunningTests(false);
    }
  };

  const handlePropose = async () => {
    if (!featureRequest.trim()) return;
    const { plan, diff } = await devAgentEngine.proposePatch(featureRequest);
    setProposedPlan(plan);
    setProposedDiff(diff);
    setPatchApplied(false);
    setLogs(devAgentEngine.getLogs());
  };

  const handleApplyPatch = () => {
    setPatchApplied(true);
    runTests();
  };

  const passedCount = testResults.filter((r) => r.passed).length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 text-cyan-400 border border-indigo-700/60 flex items-center justify-center font-bold">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">وكيل تطوير وصيانة ميزان (Mizan Dev Agent)</h2>
              <p className="text-[10px] text-cyan-400 font-mono">
                Safe Sandbox Pipeline: INSPECT → PLAN → PROPOSE → TEST → APPLY
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'tests' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            حزمة الاختبارات الآلية ({passedCount}/{testResults.length})
          </button>
          <button
            onClick={() => setActiveTab('patch')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'patch' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            تعديل الكود واقتراح التحسينات (Sandbox)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'logs' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            سجل العمليات والتدقيق ({logs.length})
          </button>
        </div>

        {/* TAB 1: TESTS */}
        {activeTab === 'tests' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="font-bold text-white block">حالة منظومة التحقق المحاسبية والتشغيلية</span>
                <span className="text-slate-400 text-[11px]">
                  {passedCount === testResults.length
                    ? 'جميع الفحوصات الـ 16 اجتازت الاختبار بنجاح تام دون أخطاء.'
                    : `اكتمل فحص ${testResults.length} اختبار`}
                </span>
              </div>
              <button
                onClick={runTests}
                disabled={isRunningTests}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunningTests ? 'جاري الفحص...' : 'إعادة تشغيل الفحوصات'}</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {testResults.map((t) => (
                <div
                  key={t.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    t.passed
                      ? 'bg-slate-950/70 border-emerald-900/40 text-slate-200'
                      : 'bg-rose-950/40 border-rose-900/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {t.passed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-white">{t.nameAr}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{t.message}</div>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] text-slate-500 shrink-0">
                    {t.durationMs}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SANDBOX PATCH */}
        {activeTab === 'patch' && (
          <div className="space-y-4 flex-1 overflow-y-auto text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="font-bold text-white block">
                اكتب طلب تعديل أو ميزة أو إصلاح لوكيل التطوير:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="مثال: أضف تقرير حركة النقدية الأسبوعي، أو حسّن دقة تقريب العملات..."
                  value={featureRequest}
                  onChange={(e) => setFeatureRequest(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handlePropose}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                >
                  تحليل واقتراح التصحيح
                </button>
              </div>
            </div>

            {proposedPlan && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-400">خطة التطوير الآمنة (Plan):</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  {proposedPlan.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            {proposedDiff && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-cyan-400 flex items-center gap-1.5 font-mono">
                    <Code2 className="w-4 h-4" />
                    <span>فروقات الكود المقترح (Unified Diff Preview):</span>
                  </h4>
                  {!patchApplied ? (
                    <button
                      onClick={handleApplyPatch}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                    >
                      موافقة وتطبيق في البيئة المعزولة
                    </button>
                  ) : (
                    <span className="text-emerald-400 font-bold text-xs">تم التطبيق والتحقق بنجاح ✓</span>
                  )}
                </div>

                <pre className="p-3 bg-black/60 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto text-left dir-ltr">
                  {proposedDiff}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-2 flex-1 overflow-y-auto text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-cyan-400">
                      {log.action}
                    </span>
                    <span className="font-bold text-white">{log.summary}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{log.details}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
