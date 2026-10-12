/**
 * MIZAN ACCOUNTING ULTRA — Comprehensive Type Definitions
 */

export type CurrencyCode = 'IQD' | 'USD' | 'EUR';

export interface CurrencySetting {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateAgainstBase: number; // 1 Base (IQD) = rate * Currency
  decimalPlaces: number;
}

export type AccountCategory = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  code: string; // e.g. "1010"
  nameAr: string;
  nameEn: string;
  category: AccountCategory;
  parentCode?: string;
  balance: number; // computed from posted entries in base currency
  isSystem: boolean;
  currency: CurrencyCode;
  description?: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  currency: CurrencyCode;
  exchangeRate: number; // rate against base at posting time
  description?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string; // ISO format YYYY-MM-DD
  referenceType: 'manual' | 'invoice_sale' | 'invoice_purchase' | 'invoice_return_sale' | 'invoice_return_purchase' | 'payment_receipt' | 'payment_voucher' | 'inventory_adjustment';
  referenceId?: string;
  narration: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isPosted: boolean;
  createdAt: string;
}

export type InvoiceType = 'sale' | 'purchase' | 'return_sale' | 'return_purchase' | 'quotation';
export type InvoiceStatus = 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank' | 'credit' | 'partial';

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number; // historical cost
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  unit: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  date: string;
  dueDate?: string;
  partyId?: string; // Customer or Supplier ID
  partyName: string;
  partyPhone?: string;
  currency: CurrencyCode;
  exchangeRate: number;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  postedJournalEntryId?: string;
  createdAt: string;
  idempotencyToken?: string;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  type: 'receipt' | 'payment'; // receipt = قبض, payment = صرف
  partyId?: string;
  partyName: string;
  accountId: string; // Cash or Bank account
  date: string;
  amount: number;
  currency: CurrencyCode;
  exchangeRate: number;
  relatedInvoiceId?: string;
  paymentMethod: 'cash' | 'bank';
  notes?: string;
  createdAt: string;
  journalEntryId?: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "أزرق / XL"
  sku: string;
  additionalPrice: number;
  stockQuantity: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  categoryId: string;
  categoryName: string;
  brand?: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  costPrice: number; // weighted average cost
  currentStock: number;
  minStockLevel: number; // reorder point
  unit: string; // 'قطعة' | 'علبة' | 'كغ' | 'متر'
  images: string[]; // base64 or URL
  model3dType?: 'box' | 'cylinder' | 'bottle' | 'can' | 'device' | 'spherical';
  model3dColor?: string;
  variants?: ProductVariant[];
  customFields?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'opening' | 'purchase' | 'sale' | 'return_in' | 'return_out' | 'adjustment_plus' | 'adjustment_minus' | 'damage';

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockMovementType;
  quantity: number; // positive or negative
  unitCost: number;
  totalCost: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export interface Party {
  id: string;
  type: 'customer' | 'supplier' | 'both';
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  creditLimit?: number;
  currentBalance: number; // positive = they owe us (Receivable), negative = we owe them (Payable)
  notes?: string;
  createdAt: string;
}

export type ThemeId = 
  | 'business-classic'
  | 'japanese-minimal'
  | 'east-asian-retail'
  | 'chinese-promo'
  | 'anime-original'
  | 'luxury-boutique'
  | 'industrial-pro'
  | 'fresh-market'
  | 'fashion-studio'
  | 'tech-neon'
  | 'corporate-analytics';

export interface ThemeConfig {
  id: ThemeId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  primaryColor: string;
  accentColor: string;
  bgClass: string;
  cardClass: string;
  borderClass: string;
  headerClass: string;
  textClass: string;
  badgeStyle: string;
  fontFamily: string;
}

export interface CompanySettings {
  companyName: string;
  tradeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxNumber: string;
  logoUrl?: string;
  baseCurrency: CurrencyCode;
  currencies: CurrencySetting[];
  defaultTaxRate: number; // e.g. 0% or 15%
  themeId: ThemeId;
  isDemoData: boolean;
}

export interface AdDesign {
  id: string;
  title: string;
  productId?: string;
  format: 'square' | 'story' | 'banner' | 'tag';
  templateId: string;
  headline: string;
  subheadline: string;
  originalPrice?: number;
  salePrice: number;
  discountBadge?: string;
  contactInfo: string;
  productImage?: string;
  bgGradient: string;
  qrData?: string;
  createdAt: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  productIds: string[];
  budget: number;
  actualCost: number;
  notes?: string;
}

export interface TestResult {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'accounting' | 'inventory' | 'storage' | 'security' | 'dev_agent';
  passed: boolean;
  message: string;
  durationMs: number;
  details?: string;
}

export interface DevAgentLog {
  id: string;
  timestamp: string;
  action: 'INSPECT' | 'PLAN' | 'PROPOSE' | 'PATCH' | 'TEST' | 'VERIFY' | 'APPLY' | 'ROLLBACK';
  summary: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}
