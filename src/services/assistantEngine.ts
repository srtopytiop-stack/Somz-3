/**
 * MIZAN ACCOUNTING ULTRA — Smart Offline Assistant Engine
 * Purely deterministic, 100% offline, explains accounting facts with proof
 */

import { db } from './db';
import { accountingEngine } from './accountingEngine';
import { Product, Party } from '../types';

export interface AssistantAnswer {
  text: string;
  category: 'explanation' | 'financial_diagnosis' | 'navigation' | 'accounting_faq';
  actionButton?: {
    label: string;
    targetTab: string;
  };
}

export class AssistantEngine {
  async ask(question: string): Promise<AssistantAnswer> {
    const q = question.trim().toLowerCase();

    // 1. Profit / Net Income diagnosis
    if (q.includes('ربح') || q.includes('ارباح') || q.includes('أرباح') || q.includes('profit')) {
      const income = await accountingEngine.getIncomeStatement();
      return {
        category: 'financial_diagnosis',
        text: `📊 ملخص تحليل الأرباح المحاسبي الدقيق:
• إجمالي إيرادات المبيعات: ${income.totalRevenue.toLocaleString()} د.ع
• تكلفة البضاعة المباعة (COGS): ${income.cogs.toLocaleString()} د.ع
• إجمالي هامش الربح الإجمالي: ${income.grossProfit.toLocaleString()} د.ع
• المصروفات التشغيلية والإدارية: ${income.totalExpenses.toLocaleString()} د.ع
════════════════════════════
🎯 صافي الربح الحقيقي: ${income.netProfit.toLocaleString()} د.ع

💡 تنبيه محاسبي: في نظام ميزان، لا يتم احتساب الأرباح من المبيعات وحدها بل يتم خصم تكلفة شراء الأصناف المباعة فعلاً والمصروفات، لحماية مشروعك من الأرباح الوهمية.`,
        actionButton: {
          label: 'عرض قائمة الدخل والتقارير المالية',
          targetTab: 'reports',
        },
      };
    }

    // 2. Low Stock / Inventory query
    if (q.includes('مخزون') || q.includes('بضاعة') || q.includes('نفاد') || q.includes('stock')) {
      const products = await db.getAll<Product>('products');
      const lowStock = products.filter((p) => p.currentStock <= p.minStockLevel);
      if (lowStock.length === 0) {
        return {
          category: 'financial_diagnosis',
          text: `✅ حالة المخزون ممتازة! جميع الأصناف البالغ عددها (${products.length}) تقع فوق حد إعادة الطلب الأدنى.`,
          actionButton: { label: 'فتح إدارة المخزون', targetTab: 'inventory' },
        };
      }
      const list = lowStock.map((p) => `• ${p.nameAr}: متبقي ${p.currentStock} ${p.unit} (الحد الأدنى: ${p.minStockLevel})`).join('\n');
      return {
        category: 'financial_diagnosis',
        text: `⚠️ تنبيه أصناف اقتربت من النفاد:\n${list}\n\nيُوصى بإصدار أمر شراء أو توريد لهذه الأصناف لتفادي توقف المبيعات.`,
        actionButton: { label: 'إدارة المخزون والتوريد', targetTab: 'inventory' },
      };
    }

    // 3. Debts / Receivables / Customers query
    if (q.includes('دين') || q.includes('ديون') || q.includes('عملاء') || q.includes('مستحق') || q.includes('debt')) {
      const parties = await db.getAll<Party>('parties');
      const debtors = parties.filter((p) => p.currentBalance > 0);
      const totalAR = debtors.reduce((sum, p) => sum + p.currentBalance, 0);

      const topDebtors = debtors
        .sort((a, b) => b.currentBalance - a.currentBalance)
        .slice(0, 5)
        .map((p) => `• ${p.name}: ${p.currentBalance.toLocaleString()} د.ع (هاتف: ${p.phone || 'غير مسجل'})`)
        .join('\n');

      return {
        category: 'financial_diagnosis',
        text: `💼 تقرير الديون المستحقة على العملاء:\n• إجمالي المبالغ المستحقة لنا: ${totalAR.toLocaleString()} د.ع\n• عدد العملاء المدينين: ${debtors.length}\n\nأعلى المدينين:\n${topDebtors || 'لا توجد ديون مستحقة'}`,
        actionButton: { label: 'كشوف حسابات العملاء وسندات القبض', targetTab: 'parties' },
      };
    }

    // 4. How to create invoice
    if (q.includes('فاتورة') || q.includes('بيع') || q.includes('شراء') || q.includes('invoice')) {
      return {
        category: 'navigation',
        text: `📝 خطوات إنشاء فاتورة في ميزان Ultra:
1. انتقل إلى قسم "الفواتير ونقاط البيع" من القائمة.
2. اختر نوع الفاتورة: مبيعات، مشتريات، أو مرتجع.
3. حدد العميل أو المورد (أو اتركه نقدياً).
4. أضف المنتجات والكميات بالضغط المباشر أو مسح الباركود بالكاميرا.
5. حدد طريقة الدفع (نقدي، بنكي، آجل، أو سداد جزئي).
6. اضغط "ترحيل وحفظ الفاتورة" — سيقوم النظام آلياً بتحديث المخزون وقيد اليومية المحاسبي المتوازن فوراً!`,
        actionButton: { label: 'الانتقال إلى شاشة الفواتير', targetTab: 'invoicing' },
      };
    }

    // 5. How to use 3D Studio
    if (q.includes('3d') || q.includes('ثلاثي') || q.includes('مجسم')) {
      return {
        category: 'navigation',
        text: `🎨 استوديو العرض ثلاثي الأبعاد (Mizan 3D Studio):
• يتيح لك معاينة المنتجات في فضاء 3D تفاعلي يعمل بالمتصفح.
• يمكنك تدوير المجسم بإصبعك على شاشة الهاتف أو بالماوس.
• ضبط خامات الإضاءة والمعدن والألوان.
• التقاط صورة فورية بدقة عالية واستخدامها في الكتالوج والإعلانات!`,
        actionButton: { label: 'فتح استوديو 3D', targetTab: 'threed' },
      };
    }

    // 6. How to create an Ad
    if (q.includes('اعلان') || q.includes('إعلان') || q.includes('بوستر') || q.includes('ستوري') || q.includes('ad')) {
      return {
        category: 'navigation',
        text: `📢 استوديو الإعلانات التجارية (Mizan Ad Studio):
• اختر أي منتج من الكتالوج لجلب سعره وصورته تلقائياً.
• اختر المقاس: بوست مربع (Instagram/Facebook)، ستوري عمودي، لافتة عريضة، أو بطاقة سعر.
• خصص شارة التخفيض، والسعر قبل وبعد الخصم، وبيانات التواصل.
• النظام يولد QR كود خاص بالمنتج تلقائياً على التصميم.
• حمّل التصميم كصورة عالية الدقة للطباعة أو النشر!`,
        actionButton: { label: 'فتح استوديو الإعلانات', targetTab: 'ad_studio' },
      };
    }

    // Default Fallback
    return {
      category: 'accounting_faq',
      text: `أهلاً بك في مساعد ميزان الذكي! 🌟
أنا مهيأ للإجابة عن استفساراتك حول:
• الأرباح وقائمة الدخل الحقيقية.
• المخزون والأصناف منخفضة الرصيد.
• ديون العملاء وكشوف الحسابات.
• إنشاء الفواتير وسندات القبض والصرف.
• استخدام استوديو 3D والكتالوج وتصميم الإعلانات.
• دليل الحسابات وميزان المراجعة.

ما الذي تود معرفته الآن؟`,
    };
  }
}

export const assistantEngine = new AssistantEngine();
