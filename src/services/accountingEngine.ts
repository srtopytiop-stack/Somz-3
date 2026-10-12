/**
 * MIZAN ACCOUNTING ULTRA — Core Financial Double-Entry Accounting Kernel
 * Strict Double Entry (Debit = Credit) · Safe Decimal Rounding · Idempotent Posting
 */

import { db } from './db';
import {
  Account,
  JournalEntry,
  JournalLine,
  Invoice,
  InvoiceItem,
  InvoiceType,
  PaymentMethod,
  PaymentReceipt,
  Party,
  Product,
  StockMovement,
  CurrencyCode,
} from '../types';

export class AccountingIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountingIntegrityError';
  }
}

// Precision helper to avoid IEEE 754 float drift
export function roundMoney(amount: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export class AccountingEngine {
  /**
   * Post a balanced manual or automated journal entry
   */
  async postJournalEntry(params: {
    entryNumber?: string;
    date: string;
    referenceType: JournalEntry['referenceType'];
    referenceId?: string;
    narration: string;
    lines: Omit<JournalLine, 'id'>[];
  }): Promise<JournalEntry> {
    const accounts = await db.getAll<Account>('accounts');
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    let totalDebit = 0;
    let totalCredit = 0;

    const formattedLines: JournalLine[] = params.lines.map((line, idx) => {
      const debit = roundMoney(line.debit);
      const credit = roundMoney(line.credit);
      totalDebit += debit;
      totalCredit += credit;

      const acc = accountMap.get(line.accountId);
      return {
        id: `line_${Date.now()}_${idx}`,
        accountId: line.accountId,
        accountCode: line.accountCode || acc?.code || '',
        accountName: line.accountName || acc?.nameAr || '',
        debit,
        credit,
        currency: line.currency || 'IQD',
        exchangeRate: line.exchangeRate || 1,
        description: line.description || '',
      };
    });

    totalDebit = roundMoney(totalDebit);
    totalCredit = roundMoney(totalCredit);

    // CRITICAL ACCOUNTING RULE: Debit must strictly equal Credit
    const difference = Math.abs(totalDebit - totalCredit);
    if (difference > 0.001) {
      throw new AccountingIntegrityError(
        `فشل ترحيل القيد: القيد غير متوازن! مجموع المدين (${totalDebit}) لا يساوي مجموع الدائن (${totalCredit})، بفارق (${difference}).`
      );
    }

    const entryNumber =
      params.entryNumber ||
      `JE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const entry: JournalEntry = {
      id: `je_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entryNumber,
      date: params.date,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      narration: params.narration,
      lines: formattedLines,
      totalDebit,
      totalCredit,
      isPosted: true,
      createdAt: new Date().toISOString(),
    };

    // Save journal entry
    await db.put('journalEntries', entry);

    // Update account balances
    for (const line of formattedLines) {
      const acc = accountMap.get(line.accountId);
      if (acc) {
        // In accounting: Assets & Expenses increase on Debit, decrease on Credit.
        // Liabilities, Equity & Revenues increase on Credit, decrease on Debit.
        if (acc.category === 'asset' || acc.category === 'expense') {
          acc.balance = roundMoney(acc.balance + line.debit - line.credit);
        } else {
          acc.balance = roundMoney(acc.balance + line.credit - line.debit);
        }
        await db.put('accounts', acc);
      }
    }

    return entry;
  }

  /**
   * Post Sales, Purchases, or Returns Invoices with synchronized inventory & ledger
   */
  async postInvoice(params: {
    type: InvoiceType;
    date: string;
    dueDate?: string;
    partyId?: string;
    partyName: string;
    partyPhone?: string;
    currency?: CurrencyCode;
    exchangeRate?: number;
    items: Omit<InvoiceItem, 'id' | 'total' | 'discountAmount' | 'taxAmount'>[];
    paymentMethod: PaymentMethod;
    paidAmount?: number;
    notes?: string;
  }): Promise<{ invoice: Invoice; journalEntry: JournalEntry }> {
    const currency = params.currency || 'IQD';
    const rate = params.exchangeRate || 1;

    const accounts = await db.getAll<Account>('accounts');
    const cashAcc = accounts.find((a) => a.code === '1010');
    const bankAcc = accounts.find((a) => a.code === '1020');
    const arAcc = accounts.find((a) => a.code === '1030'); // Accounts Receivable
    const apAcc = accounts.find((a) => a.code === '2010'); // Accounts Payable
    const inventoryAcc = accounts.find((a) => a.code === '1040');
    const salesAcc = accounts.find((a) => a.code === '4010');
    const cogsAcc = accounts.find((a) => a.code === '5010');
    const taxAcc = accounts.find((a) => a.code === '2020');

    if (!cashAcc || !inventoryAcc || !salesAcc || !cogsAcc) {
      throw new Error('الحسابات الأساسية في دليل الحسابات غير مكتملة.');
    }

    // Process line items & stock validation
    let subtotal = 0;
    let totalDiscount = 0;
    let taxTotal = 0;
    let totalCostOfItems = 0;

    const processedItems: InvoiceItem[] = [];

    for (const it of params.items) {
      const lineSub = roundMoney(it.quantity * it.unitPrice);
      const discount = roundMoney(lineSub * (it.discountPercent / 100));
      const lineAfterDisc = lineSub - discount;
      const tax = roundMoney(lineAfterDisc * (it.taxPercent / 100));
      const total = roundMoney(lineAfterDisc + tax);

      subtotal += lineSub;
      totalDiscount += discount;
      taxTotal += tax;

      // Product cost lookup
      let unitCost = it.costPrice;
      const product = await db.getById<Product>('products', it.productId);
      if (product) {
        unitCost = product.costPrice || product.purchasePrice || unitCost;
      }
      totalCostOfItems += roundMoney(it.quantity * unitCost);

      processedItems.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...it,
        costPrice: unitCost,
        discountAmount: discount,
        taxAmount: tax,
        total,
      });
    }

    subtotal = roundMoney(subtotal);
    totalDiscount = roundMoney(totalDiscount);
    taxTotal = roundMoney(taxTotal);
    const grandTotal = roundMoney(subtotal - totalDiscount + taxTotal);

    let paidAmount = 0;
    if (params.paymentMethod === 'cash' || params.paymentMethod === 'bank') {
      paidAmount = grandTotal;
    } else if (params.paymentMethod === 'partial') {
      paidAmount = roundMoney(Math.min(params.paidAmount || 0, grandTotal));
    } else if (params.paymentMethod === 'credit') {
      paidAmount = 0;
    }
    const remainingAmount = roundMoney(grandTotal - paidAmount);

    const prefix = params.type === 'sale' ? 'INV' : params.type === 'purchase' ? 'PUR' : params.type === 'return_sale' ? 'RS' : 'RP';
    const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Build balanced double-entry lines
    const journalLines: Omit<JournalLine, 'id'>[] = [];

    if (params.type === 'sale') {
      // 1. Cash / Bank portion received
      if (paidAmount > 0) {
        const depositAcc = params.paymentMethod === 'bank' ? bankAcc! : cashAcc;
        journalLines.push({
          accountId: depositAcc.id,
          accountCode: depositAcc.code,
          accountName: depositAcc.nameAr,
          debit: paidAmount,
          credit: 0,
          currency,
          exchangeRate: rate,
          description: `دفعة نقدية مسددة للفاتورة ${invoiceNumber}`,
        });
      }

      // 2. Remaining portion to Accounts Receivable (العملاء)
      if (remainingAmount > 0 && arAcc) {
        journalLines.push({
          accountId: arAcc.id,
          accountCode: arAcc.code,
          accountName: arAcc.nameAr,
          debit: remainingAmount,
          credit: 0,
          currency,
          exchangeRate: rate,
          description: `المتبقي الآجل على ذمة العميل: ${params.partyName}`,
        });
      }

      // 3. Sales Revenue (Credited with Net Sales before tax)
      const netSalesRevenue = roundMoney(subtotal - totalDiscount);
      journalLines.push({
        accountId: salesAcc.id,
        accountCode: salesAcc.code,
        accountName: salesAcc.nameAr,
        debit: 0,
        credit: netSalesRevenue,
        currency,
        exchangeRate: rate,
        description: `إيرادات مبيعات الفاتورة ${invoiceNumber}`,
      });

      // 4. Sales Tax Payable (Credit)
      if (taxTotal > 0 && taxAcc) {
        journalLines.push({
          accountId: taxAcc.id,
          accountCode: taxAcc.code,
          accountName: taxAcc.nameAr,
          debit: 0,
          credit: taxTotal,
          currency,
          exchangeRate: rate,
          description: `ضريبة مبيعات مستحقة للفاتورة ${invoiceNumber}`,
        });
      }

      // 5. Cost of Goods Sold & Inventory deduction (Debit COGS, Credit Inventory)
      if (totalCostOfItems > 0) {
        journalLines.push({
          accountId: cogsAcc.id,
          accountCode: cogsAcc.code,
          accountName: cogsAcc.nameAr,
          debit: totalCostOfItems,
          credit: 0,
          currency,
          exchangeRate: rate,
          description: `تكلفة البضاعة المباعة للفاتورة ${invoiceNumber}`,
        });
        journalLines.push({
          accountId: inventoryAcc.id,
          accountCode: inventoryAcc.code,
          accountName: inventoryAcc.nameAr,
          debit: 0,
          credit: totalCostOfItems,
          currency,
          exchangeRate: rate,
          description: `صرف مخزون البضاعة المباعة للفاتورة ${invoiceNumber}`,
        });
      }
    } else if (params.type === 'purchase') {
      // Purchases: Debit Inventory, Credit Cash / Accounts Payable
      journalLines.push({
        accountId: inventoryAcc.id,
        accountCode: inventoryAcc.code,
        accountName: inventoryAcc.nameAr,
        debit: grandTotal,
        credit: 0,
        currency,
        exchangeRate: rate,
        description: `إدخال مشتريات بضاعة للمخزن فاتورة ${invoiceNumber}`,
      });

      if (paidAmount > 0) {
        const sourceAcc = params.paymentMethod === 'bank' ? bankAcc! : cashAcc;
        journalLines.push({
          accountId: sourceAcc.id,
          accountCode: sourceAcc.code,
          accountName: sourceAcc.nameAr,
          debit: 0,
          credit: paidAmount,
          currency,
          exchangeRate: rate,
          description: `سداد قيمة مشتريات نقداً للفاتورة ${invoiceNumber}`,
        });
      }

      if (remainingAmount > 0 && apAcc) {
        journalLines.push({
          accountId: apAcc.id,
          accountCode: apAcc.code,
          accountName: apAcc.nameAr,
          debit: 0,
          credit: remainingAmount,
          currency,
          exchangeRate: rate,
          description: `المتبقي المستحق للمورد: ${params.partyName}`,
        });
      }
    }

    // Post balanced journal entry
    const journalEntry = await this.postJournalEntry({
      date: params.date,
      referenceType: params.type === 'sale' ? 'invoice_sale' : 'invoice_purchase',
      referenceId: invoiceId,
      narration: `تسجيل وترحيل ${params.type === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'} رقم ${invoiceNumber} للطرف ${params.partyName}`,
      lines: journalLines,
    });

    const invoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      type: params.type,
      status: remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'posted',
      date: params.date,
      dueDate: params.dueDate,
      partyId: params.partyId,
      partyName: params.partyName,
      partyPhone: params.partyPhone,
      currency,
      exchangeRate: rate,
      items: processedItems,
      subtotal,
      totalDiscount,
      taxTotal,
      grandTotal,
      paidAmount,
      remainingAmount,
      paymentMethod: params.paymentMethod,
      notes: params.notes,
      postedJournalEntryId: journalEntry.id,
      createdAt: new Date().toISOString(),
    };

    await db.put('invoices', invoice);

    // Update product stock and log movements
    for (const it of processedItems) {
      const product = await db.getById<Product>('products', it.productId);
      if (product) {
        const stockDelta = params.type === 'sale' ? -it.quantity : it.quantity;
        const newBalance = product.currentStock + stockDelta;
        product.currentStock = newBalance;
        product.updatedAt = new Date().toISOString();
        await db.put('products', product);

        const movement: StockMovement = {
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          date: params.date,
          productId: it.productId,
          productName: it.productName,
          sku: it.sku,
          type: params.type === 'sale' ? 'sale' : 'purchase',
          quantity: stockDelta,
          unitCost: it.costPrice,
          totalCost: roundMoney(it.quantity * it.costPrice),
          balanceAfter: newBalance,
          referenceType: params.type === 'sale' ? 'invoice_sale' : 'invoice_purchase',
          referenceId: invoiceId,
          notes: `${params.type === 'sale' ? 'صرف مبيعات' : 'توريد مشتريات'} فاتورة ${invoiceNumber}`,
        };
        await db.put('stockMovements', movement);
      }
    }

    // Update customer / supplier balance if partyId provided
    if (params.partyId && remainingAmount !== 0) {
      const party = await db.getById<Party>('parties', params.partyId);
      if (party) {
        if (params.type === 'sale') {
          party.currentBalance = roundMoney(party.currentBalance + remainingAmount);
        } else if (params.type === 'purchase') {
          party.currentBalance = roundMoney(party.currentBalance - remainingAmount);
        }
        await db.put('parties', party);
      }
    }

    return { invoice, journalEntry };
  }

  /**
   * Record customer payment or supplier payment voucher
   */
  async recordPayment(params: {
    type: 'receipt' | 'payment';
    partyId?: string;
    partyName: string;
    accountId: string; // Cash or Bank ID
    date: string;
    amount: number;
    relatedInvoiceId?: string;
    notes?: string;
  }): Promise<PaymentReceipt> {
    const amount = roundMoney(params.amount);
    if (amount <= 0) throw new Error('مبلغ السند يجب أن يكون أكبر من الصفر');

    const accounts = await db.getAll<Account>('accounts');
    const selectedAcc = accounts.find((a) => a.id === params.accountId);
    const arAcc = accounts.find((a) => a.code === '1030');
    const apAcc = accounts.find((a) => a.code === '2010');

    if (!selectedAcc) throw new Error('الحساب النقدي أو البنكي غير موجود');

    const receiptNumber = `${params.type === 'receipt' ? 'RCT' : 'PAY'}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const receiptId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const journalLines: Omit<JournalLine, 'id'>[] = [];

    if (params.type === 'receipt') {
      // Cash/Bank Debit, AR Credit
      journalLines.push({
        accountId: selectedAcc.id,
        accountCode: selectedAcc.code,
        accountName: selectedAcc.nameAr,
        debit: amount,
        credit: 0,
        currency: 'IQD',
        exchangeRate: 1,
        description: `سند قبض نقدية من ${params.partyName} رقم ${receiptNumber}`,
      });
      journalLines.push({
        accountId: arAcc!.id,
        accountCode: arAcc!.code,
        accountName: arAcc!.nameAr,
        debit: 0,
        credit: amount,
        currency: 'IQD',
        exchangeRate: 1,
        description: `تسديد من حساب العميل ${params.partyName}`,
      });
    } else {
      // AP Debit, Cash/Bank Credit
      journalLines.push({
        accountId: apAcc!.id,
        accountCode: apAcc!.code,
        accountName: apAcc!.nameAr,
        debit: amount,
        credit: 0,
        currency: 'IQD',
        exchangeRate: 1,
        description: `سداد لمستحقات المورد ${params.partyName}`,
      });
      journalLines.push({
        accountId: selectedAcc.id,
        accountCode: selectedAcc.code,
        accountName: selectedAcc.nameAr,
        debit: 0,
        credit: amount,
        currency: 'IQD',
        exchangeRate: 1,
        description: `صرف نقدي من ${selectedAcc.nameAr} بسند رقم ${receiptNumber}`,
      });
    }

    const journalEntry = await this.postJournalEntry({
      date: params.date,
      referenceType: params.type === 'receipt' ? 'payment_receipt' : 'payment_voucher',
      referenceId: receiptId,
      narration: `إثبات ${params.type === 'receipt' ? 'سند قبض' : 'سند صرف'} رقم ${receiptNumber} لصالح ${params.partyName}`,
      lines: journalLines,
    });

    const receipt: PaymentReceipt = {
      id: receiptId,
      receiptNumber,
      type: params.type,
      partyId: params.partyId,
      partyName: params.partyName,
      accountId: selectedAcc.id,
      date: params.date,
      amount,
      currency: 'IQD',
      exchangeRate: 1,
      relatedInvoiceId: params.relatedInvoiceId,
      paymentMethod: selectedAcc.code === '1020' ? 'bank' : 'cash',
      notes: params.notes,
      createdAt: new Date().toISOString(),
      journalEntryId: journalEntry.id,
    };

    await db.put('paymentReceipts', receipt);

    // Update Party Balance
    if (params.partyId) {
      const party = await db.getById<Party>('parties', params.partyId);
      if (party) {
        if (params.type === 'receipt') {
          party.currentBalance = roundMoney(party.currentBalance - amount);
        } else {
          party.currentBalance = roundMoney(party.currentBalance + amount);
        }
        await db.put('parties', party);
      }
    }

    // Update Invoice if linked
    if (params.relatedInvoiceId) {
      const invoice = await db.getById<Invoice>('invoices', params.relatedInvoiceId);
      if (invoice) {
        invoice.paidAmount = roundMoney(invoice.paidAmount + amount);
        invoice.remainingAmount = roundMoney(Math.max(0, invoice.grandTotal - invoice.paidAmount));
        invoice.status = invoice.remainingAmount === 0 ? 'paid' : 'partially_paid';
        await db.put('invoices', invoice);
      }
    }

    return receipt;
  }

  // --- Financial Statements & Reports ---

  /**
   * Trial Balance (ميزان المراجعة)
   */
  async getTrialBalance(): Promise<{
    rows: { account: Account; debit: number; credit: number }[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  }> {
    const accounts = await db.getAll<Account>('accounts');
    const rows = accounts.map((acc) => {
      let debit = 0;
      let credit = 0;
      if (acc.category === 'asset' || acc.category === 'expense') {
        if (acc.balance >= 0) debit = acc.balance;
        else credit = Math.abs(acc.balance);
      } else {
        if (acc.balance >= 0) credit = acc.balance;
        else debit = Math.abs(acc.balance);
      }
      return { account: acc, debit: roundMoney(debit), credit: roundMoney(credit) };
    });

    const totalDebit = roundMoney(rows.reduce((sum, r) => sum + r.debit, 0));
    const totalCredit = roundMoney(rows.reduce((sum, r) => sum + r.credit, 0));

    return {
      rows,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }

  /**
   * Income Statement (قائمة الدخل والأرباح والخسائر)
   */
  async getIncomeStatement(): Promise<{
    revenues: { account: Account; amount: number }[];
    totalRevenue: number;
    cogs: number;
    grossProfit: number;
    expenses: { account: Account; amount: number }[];
    totalExpenses: number;
    netProfit: number;
  }> {
    const accounts = await db.getAll<Account>('accounts');
    const revAccounts = accounts.filter((a) => a.category === 'revenue');
    const expAccounts = accounts.filter((a) => a.category === 'expense' && a.code !== '5010');
    const cogsAccount = accounts.find((a) => a.code === '5010');

    const revenues = revAccounts.map((a) => ({ account: a, amount: Math.max(0, a.balance) }));
    const totalRevenue = roundMoney(revenues.reduce((s, r) => s + r.amount, 0));

    const cogs = roundMoney(cogsAccount ? Math.max(0, cogsAccount.balance) : 0);
    const grossProfit = roundMoney(totalRevenue - cogs);

    const expenses = expAccounts.map((a) => ({ account: a, amount: Math.max(0, a.balance) }));
    const totalExpenses = roundMoney(expenses.reduce((s, e) => s + e.amount, 0));

    const netProfit = roundMoney(grossProfit - totalExpenses);

    return {
      revenues,
      totalRevenue,
      cogs,
      grossProfit,
      expenses,
      totalExpenses,
      netProfit,
    };
  }

  /**
   * Balance Sheet (الميزانية العمومية)
   */
  async getBalanceSheet(): Promise<{
    assets: { account: Account; amount: number }[];
    totalAssets: number;
    liabilities: { account: Account; amount: number }[];
    totalLiabilities: number;
    equities: { account: Account; amount: number }[];
    currentPeriodProfit: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
  }> {
    const accounts = await db.getAll<Account>('accounts');
    const income = await this.getIncomeStatement();

    const assetAccs = accounts.filter((a) => a.category === 'asset');
    const liabAccs = accounts.filter((a) => a.category === 'liability');
    const eqAccs = accounts.filter((a) => a.category === 'equity');

    const assets = assetAccs.map((a) => ({ account: a, amount: a.balance }));
    const totalAssets = roundMoney(assets.reduce((s, a) => s + a.amount, 0));

    const liabilities = liabAccs.map((a) => ({ account: a, amount: a.balance }));
    const totalLiabilities = roundMoney(liabilities.reduce((s, l) => s + l.amount, 0));

    const equities = eqAccs.map((a) => ({ account: a, amount: a.balance }));
    const totalBaseEquity = roundMoney(equities.reduce((s, e) => s + e.amount, 0));

    // Equity includes net profit of the current period
    const totalEquity = roundMoney(totalBaseEquity + income.netProfit);
    const totalLiabilitiesAndEquity = roundMoney(totalLiabilities + totalEquity);

    return {
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equities,
      currentPeriodProfit: income.netProfit,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
    };
  }
}

export const accountingEngine = new AccountingEngine();
