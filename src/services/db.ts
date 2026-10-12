/**
 * MIZAN ACCOUNTING ULTRA — High Performance IndexedDB Engine
 * Zero external servers, fully offline-first, schema migration v1.0
 */

import {
  Account,
  JournalEntry,
  Invoice,
  Product,
  StockMovement,
  Party,
  PaymentReceipt,
  AdDesign,
  MarketingCampaign,
  CompanySettings,
  AuditLog,
} from '../types';

const DB_NAME = 'mizan_accounting_ultra_db';
const DB_VERSION = 1;

export class DatabaseEngine {
  private db: IDBDatabase | null = null;
  private isMemoryFallback = false;
  private memoryStore: Record<string, any[]> = {};

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      try {
        if (typeof indexedDB === 'undefined') {
          console.warn('[MizanDB] IndexedDB not available, using in-memory store');
          this.isMemoryFallback = true;
          this.seedInitialDataIfEmpty().then(resolve);
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
          console.error('[MizanDB] Open failed, falling back to memory', event);
          this.isMemoryFallback = true;
          this.seedInitialDataIfEmpty().then(resolve);
        };

        request.onsuccess = async () => {
          this.db = request.result;
          await this.seedInitialDataIfEmpty();
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          const stores = [
            { name: 'accounts', key: 'id', indexes: ['code', 'category'] },
            { name: 'journalEntries', key: 'id', indexes: ['entryNumber', 'date', 'referenceType'] },
            { name: 'invoices', key: 'id', indexes: ['invoiceNumber', 'type', 'date', 'partyId'] },
            { name: 'products', key: 'id', indexes: ['sku', 'barcode', 'categoryId'] },
            { name: 'stockMovements', key: 'id', indexes: ['productId', 'date'] },
            { name: 'parties', key: 'id', indexes: ['name', 'type'] },
            { name: 'paymentReceipts', key: 'id', indexes: ['receiptNumber', 'date'] },
            { name: 'adDesigns', key: 'id', indexes: ['productId'] },
            { name: 'campaigns', key: 'id', indexes: ['startDate'] },
            { name: 'settings', key: 'id', indexes: [] },
            { name: 'auditLogs', key: 'id', indexes: ['timestamp'] },
          ];

          for (const s of stores) {
            if (!db.objectStoreNames.contains(s.name)) {
              const store = db.createObjectStore(s.name, { keyPath: s.key });
              for (const idx of s.indexes) {
                store.createIndex(idx, idx, { unique: false });
              }
            }
          }
        };
      } catch (err) {
        console.error('[MizanDB] Init catch, falling back to memory', err);
        this.isMemoryFallback = true;
        this.seedInitialDataIfEmpty().then(resolve);
      }
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db || this.isMemoryFallback) {
      throw new Error('Memory fallback');
    }
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    await this.init();
    if (this.isMemoryFallback) {
      return (this.memoryStore[storeName] || []) as T[];
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve((this.memoryStore[storeName] || []) as T[]);
      }
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    await this.init();
    if (this.isMemoryFallback) {
      const items = this.memoryStore[storeName] || [];
      return (items.find((i: any) => i.id === id) as T) || null;
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result ? (req.result as T) : null);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve(null);
      }
    });
  }

  async put<T extends { id: string }>(storeName: string, item: T): Promise<T> {
    await this.init();
    if (this.isMemoryFallback) {
      if (!this.memoryStore[storeName]) this.memoryStore[storeName] = [];
      const idx = this.memoryStore[storeName].findIndex((i: any) => i.id === item.id);
      if (idx >= 0) {
        this.memoryStore[storeName][idx] = item;
      } else {
        this.memoryStore[storeName].push(item);
      }
      return item;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve(item);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    await this.init();
    if (this.isMemoryFallback) {
      if (this.memoryStore[storeName]) {
        this.memoryStore[storeName] = this.memoryStore[storeName].filter((i: any) => i.id !== id);
      }
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async clearStore(storeName: string): Promise<void> {
    await this.init();
    if (this.isMemoryFallback) {
      this.memoryStore[storeName] = [];
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- Seed Initial Real State ---
  private async seedInitialDataIfEmpty(): Promise<void> {
    const existingAccounts = await this.getAll<Account>('accounts');
    if (existingAccounts.length > 0) return;

    console.log('[MizanDB] Seeding comprehensive initial ledger, chart of accounts, and catalogue...');

    // 1. Chart of Accounts
    const defaultAccounts: Account[] = [
      { id: 'acc_1010', code: '1010', nameAr: 'الصندوق النقدي الرئيسي', nameEn: 'Main Cash Box', category: 'asset', balance: 5000000, isSystem: true, currency: 'IQD', description: 'النقدية المتوفرة في الخزينة' },
      { id: 'acc_1020', code: '1020', nameAr: 'الحساب البنكي (مصرف بغداد)', nameEn: 'Bank Account', category: 'asset', balance: 12500000, isSystem: true, currency: 'IQD', description: 'الرصيد في الحساب البنكي التجاري' },
      { id: 'acc_1030', code: '1030', nameAr: 'العملاء والمدينون', nameEn: 'Accounts Receivable', category: 'asset', balance: 850000, isSystem: true, currency: 'IQD', description: 'ديون العملاء المستحقة للشركة' },
      { id: 'acc_1040', code: '1040', nameAr: 'المخزون السلعي (البضاعة)', nameEn: 'Merchandise Inventory', category: 'asset', balance: 7425000, isSystem: true, currency: 'IQD', description: 'قيمة البضاعة المخزنة وفق التكلفة' },
      { id: 'acc_2010', code: '2010', nameAr: 'الموردون والدائنون', nameEn: 'Accounts Payable', category: 'liability', balance: 1200000, isSystem: true, currency: 'IQD', description: 'المستحقات الواجب دفعها للموردين' },
      { id: 'acc_2020', code: '2020', nameAr: 'ضريبة المبيعات المستحقة', nameEn: 'Sales Tax Payable', category: 'liability', balance: 0, isSystem: true, currency: 'IQD', description: 'الضرائب المحصلة الواجبة السداد' },
      { id: 'acc_3010', code: '3010', nameAr: 'رأس المال التشغيلي', nameEn: 'Owner Capital', category: 'equity', balance: 22000000, isSystem: true, currency: 'IQD', description: 'رأس مال الشركة التأسيسي' },
      { id: 'acc_3020', code: '3020', nameAr: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', category: 'equity', balance: 2575000, isSystem: true, currency: 'IQD', description: 'أرباح الدورات المحاسبية السابقة' },
      { id: 'acc_4010', code: '4010', nameAr: 'إيرادات المبيعات', nameEn: 'Sales Revenue', category: 'revenue', balance: 2850000, isSystem: true, currency: 'IQD', description: 'إجمالي المبيعات المحققة' },
      { id: 'acc_5010', code: '5010', nameAr: 'تكلفة البضاعة المباعة (COGS)', nameEn: 'Cost of Goods Sold', category: 'expense', balance: 1850000, isSystem: true, currency: 'IQD', description: 'تكلفة الأصناف التي تم بيعها فعلاً' },
      { id: 'acc_5020', code: '5020', nameAr: 'مصروفات الإيجار والكهرباء', nameEn: 'Rent & Utilities', category: 'expense', balance: 450000, isSystem: true, currency: 'IQD', description: 'إيجار المحل والكهرباء والماء' },
      { id: 'acc_5030', code: '5030', nameAr: 'مصروفات الدعاية والإعلان', nameEn: 'Advertising Expense', category: 'expense', balance: 180000, isSystem: true, currency: 'IQD', description: 'تكاليف الحملات التسويقية والبوسترات' },
      { id: 'acc_5040', code: '5040', nameAr: 'خصومات المبيعات الممنوحة', nameEn: 'Sales Discounts Allowed', category: 'expense', balance: 45000, isSystem: true, currency: 'IQD', description: 'الخصومات الممنوحة للعملاء' },
    ];

    for (const a of defaultAccounts) {
      await this.put('accounts', a);
    }

    // 2. Default Company Settings
    const defaultSettings: CompanySettings = {
      companyName: 'مجموعة ميزان التجارية الحديثة',
      tradeName: 'Mizan Ultra Stores',
      tagline: 'أنظمة إدارة الأعمال، المحاسبة الدقيقة والكتالوج البصري',
      address: 'بغداد — الكرادة، شارع الصناعة، العراق',
      phone: '+964 770 123 4567',
      email: 'info@mizan-ultra.iq',
      taxNumber: 'IQ-9874521',
      baseCurrency: 'IQD',
      currencies: [
        { code: 'IQD', symbol: 'د.ع', name: 'دينار عراقي', rateAgainstBase: 1, decimalPlaces: 0 },
        { code: 'USD', symbol: '$', name: 'دولار أمريكي', rateAgainstBase: 0.000653, decimalPlaces: 2 },
        { code: 'EUR', symbol: '€', name: 'يورو', rateAgainstBase: 0.000606, decimalPlaces: 2 },
      ],
      defaultTaxRate: 0,
      themeId: 'business-classic',
      isDemoData: true,
    };
    await this.put('settings', { id: 'company_settings', ...defaultSettings });

    // 3. Products
    const sampleProducts: Product[] = [
      {
        id: 'prod_1',
        sku: 'MIZ-WATCH-01',
        barcode: '628100234001',
        nameAr: 'ساعة أوتوماتيكية فاخرة — رويال تيتانيوم',
        nameEn: 'Royal Titanium Automatic Watch',
        categoryId: 'luxury',
        categoryName: 'الساعات والمجوهرات',
        brand: 'Mizan Chrono',
        description: 'ساعة كرونوغراف أوتوماتيكية مقاومة للماء مع زجاج سافير وعقارب مضيئة.',
        purchasePrice: 120000,
        sellingPrice: 185000,
        costPrice: 120000,
        currentStock: 24,
        minStockLevel: 5,
        unit: 'قطعة',
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'],
        model3dType: 'cylinder',
        model3dColor: '#d4af37',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prod_2',
        sku: 'MIZ-PERF-02',
        barcode: '628100234002',
        nameAr: 'عطر العود الملكي المقطر 100 مل',
        nameEn: 'Royal Oud Parfum Intense 100ml',
        categoryId: 'perfumes',
        categoryName: 'العطور ومستحضرات التجميل',
        brand: 'Mizan Fragrance',
        description: 'عطر شرقي فاخر من خشب العود المعتق مع نفحات العنبر والمسك الأبيض.',
        purchasePrice: 45000,
        sellingPrice: 75000,
        costPrice: 45000,
        currentStock: 48,
        minStockLevel: 10,
        unit: 'زجاجة',
        images: ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80'],
        model3dType: 'bottle',
        model3dColor: '#b8860b',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prod_3',
        sku: 'MIZ-HEADSET-03',
        barcode: '628100234003',
        nameAr: 'سماعات رأس لاسلكية هاي فاي مانعة للضوضاء',
        nameEn: 'Mizan Studio Pro Wireless ANC Headphones',
        categoryId: 'electronics',
        categoryName: 'إلكترونيات وتقنية',
        brand: 'Mizan Sound',
        description: 'سماعات إلغاء ضوضاء نشطة محيطية مع بطارية تدوم 40 ساعة وبلوتوث 5.3.',
        purchasePrice: 65000,
        sellingPrice: 110000,
        costPrice: 65000,
        currentStock: 18,
        minStockLevel: 4,
        unit: 'قطعة',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'],
        model3dType: 'device',
        model3dColor: '#1e293b',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prod_4',
        sku: 'MIZ-COFFEE-04',
        barcode: '628100234004',
        nameAr: 'بن قهوة يمنية فاخرة مختصة (حراز) 1 كغ',
        nameEn: 'Single Origin Specialty Coffee 1kg',
        categoryId: 'food',
        categoryName: 'الأغذية والمشروبات',
        brand: 'Mizan Roast',
        description: 'حبوب بن مجففة طبيعياً بنكهات التوت والشوكولاتة الداكنة، تحميص متوسط.',
        purchasePrice: 28000,
        sellingPrice: 42000,
        costPrice: 28000,
        currentStock: 3, // Low stock to demonstrate alert
        minStockLevel: 8,
        unit: 'كيس',
        images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80'],
        model3dType: 'can',
        model3dColor: '#78350f',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const p of sampleProducts) {
      await this.put('products', p);
    }

    // 4. Sample Parties (Customers and Suppliers)
    const sampleParties: Party[] = [
      {
        id: 'party_cust_1',
        type: 'customer',
        name: 'مؤسسة النور للتجارة الحديثة',
        phone: '+964 780 987 6543',
        email: 'alnoor@example.iq',
        address: 'بغداد — المنصور',
        creditLimit: 5000000,
        currentBalance: 850000, // owes us
        createdAt: new Date().toISOString(),
      },
      {
        id: 'party_cust_2',
        type: 'customer',
        name: 'أحمد التميمي (عميل نقدي)',
        phone: '+964 771 456 7890',
        currentBalance: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'party_supp_1',
        type: 'supplier',
        name: 'شركة دجلة للاستيراد والتوزيع',
        phone: '+964 750 112 2334',
        email: 'dijla.import@example.iq',
        address: 'البصرة — شارع الجزائر',
        currentBalance: -1200000, // we owe them
        createdAt: new Date().toISOString(),
      },
    ];

    for (const pt of sampleParties) {
      await this.put('parties', pt);
    }

    // 5. Sample balanced journal entry for opening balance
    const openingEntry: JournalEntry = {
      id: 'entry_open_01',
      entryNumber: 'JE-2026-0001',
      date: '2026-10-01',
      referenceType: 'manual',
      narration: 'قيد الافتتاح وإثبات الأرصدة التأسيسية المتوازنة',
      lines: [
        { id: 'l1', accountId: 'acc_1010', accountCode: '1010', accountName: 'الصندوق النقدي الرئيسي', debit: 5000000, credit: 0, currency: 'IQD', exchangeRate: 1 },
        { id: 'l2', accountId: 'acc_1020', accountCode: '1020', accountName: 'الحساب البنكي (مصرف بغداد)', debit: 12500000, credit: 0, currency: 'IQD', exchangeRate: 1 },
        { id: 'l3', accountId: 'acc_1030', accountCode: '1030', accountName: 'العملاء والمدينون', debit: 850000, credit: 0, currency: 'IQD', exchangeRate: 1 },
        { id: 'l4', accountId: 'acc_1040', accountCode: '1040', accountName: 'المخزون السلعي (البضاعة)', debit: 7425000, credit: 0, currency: 'IQD', exchangeRate: 1 },
        { id: 'l5', accountId: 'acc_2010', accountCode: '2010', accountName: 'الموردون والدائنون', debit: 0, credit: 1200000, currency: 'IQD', exchangeRate: 1 },
        { id: 'l6', accountId: 'acc_3010', accountCode: '3010', accountName: 'رأس المال التشغيلي', debit: 0, credit: 22000000, currency: 'IQD', exchangeRate: 1 },
        { id: 'l7', accountId: 'acc_3020', accountCode: '3020', accountName: 'الأرباح المحتجزة', debit: 0, credit: 2575000, currency: 'IQD', exchangeRate: 1 },
      ],
      totalDebit: 25775000,
      totalCredit: 25775000,
      isPosted: true,
      createdAt: '2026-10-01T08:00:00Z',
    };
    await this.put('journalEntries', openingEntry);

    // 6. Sample Initial Invoice
    const sampleInvoice: Invoice = {
      id: 'inv_sale_001',
      invoiceNumber: 'INV-2026-0001',
      type: 'sale',
      status: 'posted',
      date: '2026-10-10',
      partyId: 'party_cust_1',
      partyName: 'مؤسسة النور للتجارة الحديثة',
      partyPhone: '+964 780 987 6543',
      currency: 'IQD',
      exchangeRate: 1,
      items: [
        {
          id: 'item_1',
          productId: 'prod_1',
          productName: 'ساعة أوتوماتيكية فاخرة — رويال تيتانيوم',
          sku: 'MIZ-WATCH-01',
          quantity: 2,
          unitPrice: 185000,
          costPrice: 120000,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          total: 370000,
          unit: 'قطعة',
        },
        {
          id: 'item_2',
          productId: 'prod_2',
          productName: 'عطر العود الملكي المقطر 100 مل',
          sku: 'MIZ-PERF-02',
          quantity: 3,
          unitPrice: 75000,
          costPrice: 45000,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          total: 225000,
          unit: 'زجاجة',
        },
      ],
      subtotal: 595000,
      totalDiscount: 0,
      taxTotal: 0,
      grandTotal: 595000,
      paidAmount: 200000,
      remainingAmount: 395000,
      paymentMethod: 'partial',
      notes: 'تم تسليم البضاعة مع إيصال تسديد دفعة أولى نقداً',
      postedJournalEntryId: 'entry_sale_001',
      createdAt: '2026-10-10T11:30:00Z',
    };
    await this.put('invoices', sampleInvoice);

    // Balanced journal entry for sample invoice
    // Debit Cash (paidAmount): 200,000
    // Debit AR (remainingAmount): 395,000
    // Credit Sales: 595,000
    // Debit COGS (2*120000 + 3*45000 = 375,000)
    // Credit Inventory: 375,000
    // Total Debits: 595,000 + 375,000 = 970,000 | Total Credits: 595,000 + 375,000 = 970,000
    const sampleInvoiceEntry: JournalEntry = {
      id: 'entry_sale_001',
      entryNumber: 'JE-2026-0002',
      date: '2026-10-10',
      referenceType: 'invoice_sale',
      referenceId: 'inv_sale_001',
      narration: 'إثبات مبيعات الفاتورة رقم INV-2026-0001 وتكلفة البضاعة المباعة',
      lines: [
        { id: 'sl1', accountId: 'acc_1010', accountCode: '1010', accountName: 'الصندوق النقدي الرئيسي', debit: 200000, credit: 0, currency: 'IQD', exchangeRate: 1 },
        { id: 'sl2', accountId: 'acc_1030', accountCode: '1030', accountName: 'العملاء والمدينون', debit: 395000, credit: 0, currency: 'IQD', exchangeRate: 1 },
        { id: 'sl3', accountId: 'acc_4010', accountCode: '4010', accountName: 'إيرادات المبيعات', debit: 0, credit: 595000, currency: 'IQD', exchangeRate: 1 },
        { id: 'sl4', accountId: 'acc_5010', accountCode: '5010', accountName: 'تكلفة البضاعة المباعة (COGS)', debit: 375000, credit: 0, currency: 'IQD', exchangeRate: 1 },
        { id: 'sl5', accountId: 'acc_1040', accountCode: '1040', accountName: 'المخزون السلعي (البضاعة)', debit: 0, credit: 375000, currency: 'IQD', exchangeRate: 1 },
      ],
      totalDebit: 970000,
      totalCredit: 970000,
      isPosted: true,
      createdAt: '2026-10-10T11:30:00Z',
    };
    await this.put('journalEntries', sampleInvoiceEntry);

    // Stock movements for the invoice
    await this.put('stockMovements', {
      id: 'mov_1',
      date: '2026-10-10',
      productId: 'prod_1',
      productName: 'ساعة أوتوماتيكية فاخرة — رويال تيتانيوم',
      sku: 'MIZ-WATCH-01',
      type: 'sale',
      quantity: -2,
      unitCost: 120000,
      totalCost: 240000,
      balanceAfter: 24,
      referenceType: 'invoice_sale',
      referenceId: 'inv_sale_001',
      notes: 'صرف بضاعة بموجب فاتورة مبيعات',
    });
    await this.put('stockMovements', {
      id: 'mov_2',
      date: '2026-10-10',
      productId: 'prod_2',
      productName: 'عطر العود الملكي المقطر 100 مل',
      sku: 'MIZ-PERF-02',
      type: 'sale',
      quantity: -3,
      unitCost: 45000,
      totalCost: 135000,
      balanceAfter: 48,
      referenceType: 'invoice_sale',
      referenceId: 'inv_sale_001',
      notes: 'صرف بضاعة بموجب فاتورة مبيعات',
    });

    console.log('[MizanDB] Initial balanced ledger successfully seeded.');
  }

  // --- Export Full Backup ---
  async exportFullBackup(): Promise<string> {
    const stores = ['accounts', 'journalEntries', 'invoices', 'products', 'stockMovements', 'parties', 'paymentReceipts', 'adDesigns', 'campaigns', 'settings', 'auditLogs'];
    const backupObj: Record<string, any> = {
      app: 'MIZAN_ACCOUNTING_ULTRA',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      stores: {},
    };

    for (const s of stores) {
      backupObj.stores[s] = await this.getAll(s);
    }

    // Compute simple checksum
    const jsonStr = JSON.stringify(backupObj, null, 2);
    let hash = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      hash = (hash << 5) - hash + jsonStr.charCodeAt(i);
      hash |= 0;
    }
    backupObj.checksum = Math.abs(hash).toString(16);

    return JSON.stringify(backupObj, null, 2);
  }

  // --- Import Backup with Verification ---
  async importFullBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = JSON.parse(jsonString);
      if (data.app !== 'MIZAN_ACCOUNTING_ULTRA') {
        return { success: false, message: 'الملف غير صالح أو لا ينتمي إلى MIZAN ACCOUNTING ULTRA' };
      }
      if (!data.stores || typeof data.stores !== 'object') {
        return { success: false, message: 'بنية ملف النسخة الاحتياطية تالفة أو ناقصة' };
      }

      // Check ledger balance in backup before restoring
      const journalEntries: JournalEntry[] = data.stores.journalEntries || [];
      for (const entry of journalEntries) {
        if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.001) {
          return { success: false, message: `فشل الاستيراد: القيد رقم ${entry.entryNumber} غير متوازن في ملف النسخة الاحتياطية!` };
        }
      }

      // Restore each store
      for (const storeName of Object.keys(data.stores)) {
        await this.clearStore(storeName);
        const items = data.stores[storeName];
        if (Array.isArray(items)) {
          for (const item of items) {
            await this.put(storeName, item);
          }
        }
      }

      return { success: true, message: `تمت استعادة النسخة الاحتياطية بنجاح (${journalEntries.length} قيد محاسبي و${data.stores.invoices?.length || 0} فاتورة)` };
    } catch (err: any) {
      return { success: false, message: `خطأ أثناء قراءة الملف: ${err.message}` };
    }
  }

  // --- Reset All Data ---
  async resetToEmpty(): Promise<void> {
    const stores = ['accounts', 'journalEntries', 'invoices', 'products', 'stockMovements', 'parties', 'paymentReceipts', 'adDesigns', 'campaigns', 'auditLogs'];
    for (const s of stores) {
      await this.clearStore(s);
    }
  }

  // --- Reset to Demo Data ---
  async resetToDemo(): Promise<void> {
    await this.resetToEmpty();
    await this.seedInitialDataIfEmpty();
  }
}

export const db = new DatabaseEngine();
