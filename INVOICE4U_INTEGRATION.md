# אינטגרציה עם Invoice4U

## סקירה כללית

מערכת ה-CRM משולבת עם [Invoice4U](https://www.invoice4u.co.il/) - מערכת להנפקת מסמכי חשבוניות ישראלית.
האינטגרציה מאפשרת להוציא מסמכים ישירות מהמערכת:

- **הצעת מחיר (InvoiceQuote)** - DocumentType: 7
- **חשבון עסקה (ProformaInvoice)** - DocumentType: 5  
- **חשבונית מס (Invoice)** - DocumentType: 1
- **חשבונית מס קבלה (InvoiceReceipt)** - DocumentType: 3

## הגדרת האינטגרציה

### שלב 1: קבלת פרטי התחברות

1. היכנס לחשבון ה-Invoice4U שלך
2. השתמש באותם פרטי התחברות (אימייל וסיסמה) שבהם אתה נכנס למערכת

### שלב 2: חיבור המערכת

1. עבור אל **הגדרות → אינטגרציות**
2. מצא את הכרטיס "Invoice4U - הוצאת מסמכים"
3. הזן את האימייל והסיסמה שלך
4. בחר האם להשתמש בסביבת ייצור או בדיקות:
   - ✅ **Production (מומלץ)**: `https://api.invoice4u.co.il`
   - ⚠️ **Staging (בדיקות)**: `https://apiqa.invoice4u.co.il`
5. לחץ על "התחבר ל-Invoice4U"

המערכת תבצע בדיקת תקינות של הנתונים ותחבר את החשבון.

## שימוש באינטגרציה

### הוצאת מסמך ללקוח

1. עבור לדף הלקוח הרצוי
2. לחץ על הכפתור **"הוצא מסמך Invoice4U"**
3. בחר את סוג המסמך:
   - הצעת מחיר
   - חשבון עסקה
   - חשבונית מס
   - חשבונית מס קבלה
4. הוסף פריטים:
   - שם הפריט
   - כמות
   - מחיר ליחידה
5. הוסף אימיילים נוספים (אופציונלי)
6. לחץ על "צור מסמך"

המסמך ייווצר ב-Invoice4U ויישלח אוטומטית:
- ללקוח (אם יש אימייל)
- למשתמש הנוכחי
- לאימיילים הנוספים שהוספת

## מבנה טכני

### ספריות

```bash
npm install soap
```

### קבצים חשובים

```
lib/invoice4u.ts                                    # Client לחיבור ל-API
app/api/integrations/invoice4u/route.ts            # ניהול הגדרות האינטגרציה
app/api/integrations/invoice4u/documents/route.ts  # יצירת מסמכים
components/dialogs/Invoice4UDialog.tsx             # ממשק להוצאת מסמכים
```

### Prisma Schema

```prisma
model Integration {
  id          String          @id @default(cuid())
  companyId   String
  company     Company         @relation(fields: [companyId], references: [id])
  type        IntegrationType // INVOICE4U
  name        String
  apiKey      String?         // Email
  apiSecret   String?         // Password
  config      Json?           // { useProduction: boolean }
  isActive    Boolean         @default(true)
  lastSyncAt  DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@unique([companyId, type])
}
```

## API Endpoints

### POST /api/integrations/invoice4u
**חיבור/עדכון אינטגרציה**

```json
{
  "email": "your-email@example.com",
  "password": "your-password",
  "name": "Invoice4U",
  "useProduction": true
}
```

### GET /api/integrations/invoice4u
**בדיקת סטטוס אינטגרציה**

### DELETE /api/integrations/invoice4u
**ניתוק אינטגרציה**

### POST /api/integrations/invoice4u/documents
**יצירת מסמך**

```json
{
  "clientId": "client_id_here",
  "documentType": "quote",
  "subject": "הצעת מחיר עבור לקוח X",
  "items": [
    {
      "name": "פיתוח אתר",
      "quantity": 1,
      "price": 5000
    }
  ],
  "customEmails": ["extra@example.com"]
}
```

### GET /api/integrations/invoice4u/documents
**קבלת רשימת מסמכים**

Query Parameters:
- `documentType`: quote | proforma | invoice | receipt

## התאמות אישיות

### שינוי אחוז מס

בקובץ `lib/invoice4u.ts`, שנה את `TaxPercentage`:

```typescript
TaxPercentage: 17,  // או 18, תלוי במדיניות המס הנוכחית
```

### הוספת שדות למסמך

ניתן להוסיף שדות נוספים בבקשת `CreateDocument`:

```typescript
{
  // ... שאר השדות
  Notes: "הערות נוספות",
  DiscountPercent: 10,
  PaymentTerms: 30,
}
```

## טיפול בשגיאות

### שגיאות נפוצות

1. **"Invalid Invoice4U credentials"**
   - בדוק שהאימייל והסיסמה נכונים
   - ודא שהחשבון פעיל ב-Invoice4U

2. **"Failed to create customer"**
   - הלקוח עשוי להיות כבר קיים במערכת
   - המערכת תנסה למצוא אותו לפי שם ואימייל

3. **"Failed to create document"**
   - בדוק שכל הפריטים מלאים
   - ודא שהמחירים חיוביים
   - בדוק שיש לפחות פריט אחד

## אבטחה

- הסיסמאות מוצפנות במסד הנתונים
- ה-API מוגן באימות NextAuth
- רק משתמשים מורשים יכולים להוציא מסמכים
- התקשורת עם Invoice4U מתבצעת דרך HTTPS

## תמיכה

במידה ויש בעיות עם האינטגרציה:
1. בדוק את הלוגים בקונסול
2. ודא שהחיבור לאינטרנט תקין
3. בדוק את [הדוקומנטציה של Invoice4U](https://invoice4uapi.docs.apiary.io/)
4. צור קשר עם תמיכת Invoice4U

## דוגמאות שימוש

### דוגמה 1: הוצאת הצעת מחיר

```typescript
const result = await fetch('/api/integrations/invoice4u/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client_123',
    documentType: 'quote',
    subject: 'הצעת מחיר - פיתוח אתר',
    items: [
      { name: 'עיצוב UI/UX', quantity: 1, price: 3000 },
      { name: 'פיתוח Frontend', quantity: 1, price: 5000 },
      { name: 'פיתוח Backend', quantity: 1, price: 4000 },
    ],
  }),
});
```

### דוגמה 2: חשבונית מס קבלה

```typescript
const result = await fetch('/api/integrations/invoice4u/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client_456',
    documentType: 'receipt',
    subject: 'חשבונית מס קבלה - פרויקט ABC',
    items: [
      { name: 'תשלום עבור פרויקט', quantity: 1, price: 12000 },
    ],
    customEmails: ['accounting@client.com'],
  }),
});
```

---

**נבנה על ידי**: צוות הפיתוח של QuickCRM  
**תאריך עדכון אחרון**: נובמבר 2025  
**גרסה**: 1.0.0

