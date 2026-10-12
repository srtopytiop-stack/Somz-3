# نموذج وهيكل البيانات — DATA MODEL SCHEMA
**نظام ميزان المحاسبي الشامل — MIZAN ACCOUNTING ULTRA**

---

## 1. جداول التخزين المحلي في IndexedDB (Store Names)

1. `accounts`:
   - `id`: المفتاح الفريد (e.g. `acc_1010`)
   - `code`: رقم الحساب في الشجرة (e.g. `1010`)
   - `nameAr`: الاسم العربي
   - `nameEn`: الاسم الإنجليزي
   - `category`: `asset | liability | equity | revenue | expense`
   - `balance`: الرصيد التراكمي
   - `currency`: العملة

2. `journalEntries`:
   - `id`: المعرف الفريد
   - `entryNumber`: رقم القيد التسلسلي (e.g. `JE-2026-0001`)
   - `date`: تاريخ القيد YYYY-MM-DD
   - `referenceType`: نوع المستند المنشئ
   - `lines`: مصفوفة سطور القيد (الحساب، المدين، الدائن)
   - `totalDebit`: إجمالي المدين
   - `totalCredit`: إجمالي الدائن
   - `isPosted`: حالة الترحيل

3. `invoices`:
   - `id`, `invoiceNumber`, `type`, `status`, `date`, `dueDate`
   - `partyId`, `partyName`, `partyPhone`
   - `items`: مصفوفة البنود والكميات والأسعار والتكلفة
   - `subtotal`, `totalDiscount`, `taxTotal`, `grandTotal`
   - `paidAmount`, `remainingAmount`, `paymentMethod`
   - `postedJournalEntryId`: رقم القيد المحاسبي المرتبط

4. `products`:
   - `id`, `sku`, `barcode`, `nameAr`, `nameEn`, `categoryId`
   - `purchasePrice`, `sellingPrice`, `costPrice`, `currentStock`, `minStockLevel`, `unit`
   - `images`: مصفوفة الصور
   - `model3dType`: شكل المجسم ثلاثي الأبعاد
   - `model3dColor`: لون خامة المجسم

5. `stockMovements`:
   - `id`, `date`, `productId`, `sku`, `type`, `quantity`, `unitCost`, `totalCost`, `balanceAfter`

6. `parties` (العملاء والموردون):
   - `id`, `type`, `name`, `phone`, `email`, `address`, `currentBalance`, `creditLimit`

7. `paymentReceipts` (سندات القبض والصرف):
   - `id`, `receiptNumber`, `type`, `partyId`, `partyName`, `accountId`, `amount`, `date`

8. `campaigns`:
   - `id`, `name`, `startDate`, `endDate`, `budget`, `actualCost`

9. `settings`:
   - `company_settings`: بيانات المنشأة، العملات، النمط البصري
