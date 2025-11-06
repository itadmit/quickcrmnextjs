# אינטגרציה עם Invoice4U

## סקירה כללית

מערכת ה-CRM משולבת עם [Invoice4U](https://www.invoice4u.co.il/) - מערכת להנפקת מסמכי חשבוניות ישראלית.
האינטגרציה כוללת **שני ממשקים נפרדים**:

### 📄 Documents API - הוצאת מסמכים
- **הצעת מחיר (InvoiceQuote)** - DocumentType: 7
- **חשבון עסקה (ProformaInvoice)** - DocumentType: 5  
- **חשבונית מס (Invoice)** - DocumentType: 1
- **חשבונית מס קבלה (InvoiceReceipt)** - DocumentType: 3

### 💳 Clearing APIs - ביצוע תשלומים
- **תשלומים רגילים (Regular Clearing)**
- **שמירת כרטיסי אשראי (Tokenization)**
- **חיוב עם טוקן שמור (Charge with Token)**
- **תשלומים חוזרים (Standing Orders)**
- **החזרות (Refunds)**
- **היסטוריית תשלומים (Clearing Logs)**

---

## 📄 Documents API - הוצאת מסמכים

### הגדרת האינטגרציה למסמכים

#### שלב 1: קבלת פרטי התחברות

1. היכנס לחשבון ה-Invoice4U שלך
2. השתמש באותם פרטי התחברות (אימייל וסיסמה) שבהם אתה נכנס למערכת

#### שלב 2: חיבור המערכת

1. עבור אל **הגדרות → אינטגרציות**
2. מצא את הכרטיס **"Invoice4U - הוצאת מסמכים"**
3. הזן את האימייל והסיסמה שלך
4. בחר האם להשתמש בסביבת ייצור או בדיקות:
   - ✅ **Production (מומלץ)**: `https://api.invoice4u.co.il`
   - ⚠️ **Staging (בדיקות)**: `https://apiqa.invoice4u.co.il`
5. לחץ על "התחבר ל-Invoice4U"

המערכת תבצע בדיקת תקינות של הנתונים ותחבר את החשבון.

### שימוש באינטגרציה למסמכים

#### הוצאת מסמך ללקוח

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

### קבצים חשובים - Documents API

```
lib/invoice4u.ts                                    # Client לחיבור ל-Documents API
app/api/integrations/invoice4u/route.ts            # ניהול הגדרות האינטגרציה למסמכים
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

### API Endpoints - Documents

#### POST /api/integrations/invoice4u
**חיבור/עדכון אינטגרציה למסמכים**

```json
{
  "email": "your-email@example.com",
  "password": "your-password",
  "name": "Invoice4U",
  "useProduction": true
}
```

#### GET /api/integrations/invoice4u
**בדיקת סטטוס אינטגרציה למסמכים**

#### DELETE /api/integrations/invoice4u
**ניתוק אינטגרציה למסמכים**

#### POST /api/integrations/invoice4u/documents
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

#### GET /api/integrations/invoice4u/documents
**קבלת רשימת מסמכים**

Query Parameters:
- `documentType`: quote | proforma | invoice | receipt

---

## 💳 Clearing APIs - ביצוע תשלומים

### סקירה כללית

Clearing APIs הוא ממשק נפרד מ-Documents API ומשמש לביצוע תשלומים דרך Invoice4U.
הממשק מאפשר:

- **תשלומים רגילים** - תשלום חד פעמי
- **Tokenization** - שמירת כרטיסי אשראי לשימוש חוזר
- **Charge with Token** - חיוב עם כרטיס שמור
- **Standing Orders** - תשלומים חוזרים (למשל חודשי)
- **Refunds** - החזרות כספיות
- **Clearing Logs** - היסטוריית תשלומים

### הגדרת האינטגרציה לתשלומים

#### שלב 1: קבלת API Key (מומלץ)

1. התחבר ל-[private.invoice4u.co.il](https://private.invoice4u.co.il)
2. לך ל-**Settings → Account Settings → API**
3. לחץ על **Generate API Key**
4. העתק את ה-API Key (מומלץ להשתמש ב-API Key במקום Email+Password)

**אלטרנטיבה**: ניתן להשתמש ב-Email + Password (כמו ב-Documents API)

#### שלב 2: חיבור המערכת

1. עבור אל **הגדרות → אינטגרציות**
2. מצא את הכרטיס **"Invoice4U - תשלומים (Clearing)"**
3. בחר אחת מהאפשרויות:
   - ✅ **API Key (מומלץ)**: הזן את ה-API Key שהתקבל
   - **Email + Password**: הזן את האימייל והסיסמה
4. בחר האם להשתמש בסביבת ייצור או בדיקות
5. לחץ על "התחבר ל-Invoice4U Clearing"

### שימוש באינטגרציה לתשלומים

#### ביצוע תשלום רגיל

```typescript
const response = await fetch('/api/integrations/invoice4u/clearing/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client_id_here',
    quoteId: 'quote_id_here', // אופציונלי
    amount: 1000,
    description: 'תשלום עבור שירות',
    paymentType: 'regular', // 'regular' | 'tokenize' | 'charge_with_token' | 'standing_order'
    returnUrl: 'https://your-domain.com/payment-success',
  }),
});

const { clearingUrl } = await response.json();
// הצג את clearingUrl ב-iframe או redirect למשתמש
```

#### שמירת כרטיס אשראי (Tokenization)

```typescript
const response = await fetch('/api/integrations/invoice4u/clearing/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client_id_here',
    amount: 1000,
    paymentType: 'tokenize', // שמירת טוקן ללא חיוב מיידי
    returnUrl: 'https://your-domain.com/payment-success',
  }),
});
```

#### חיוב עם טוקן שמור

```typescript
const response = await fetch('/api/integrations/invoice4u/clearing/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client_id_here',
    amount: 500,
    paymentType: 'charge_with_token', // חיוב עם טוקן קיים
    customerId: 12345, // ID הלקוח ב-Invoice4U שיש לו טוקן שמור
  }),
});
```

#### תשלומים חוזרים (Standing Order)

```typescript
const response = await fetch('/api/integrations/invoice4u/clearing/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client_id_here',
    amount: 1000,
    paymentType: 'standing_order',
    standingOrderDuration: 12, // מספר חודשים (12 = שנה)
    standingOrderCallbackUrl: 'https://your-domain.com/webhook/standing-order',
    returnUrl: 'https://your-domain.com/payment-success',
  }),
});
```

#### קבלת היסטוריית תשלומים

```typescript
// לפי Payment ID
const response = await fetch('/api/integrations/invoice4u/clearing/logs?paymentId=PAYMENT_123');

// לפי Clearing Log ID
const response = await fetch('/api/integrations/invoice4u/clearing/logs?clearingLogId=12345');
```

### API Endpoints - Clearing

#### POST /api/integrations/invoice4u/clearing
**חיבור/עדכון אינטגרציה לתשלומים**

```json
{
  "apiKey": "your-api-key-here",  // מומלץ
  // או
  "email": "your-email@example.com",
  "password": "your-password",
  "useProduction": true
}
```

#### GET /api/integrations/invoice4u/clearing
**בדיקת סטטוס אינטגרציה לתשלומים**

#### DELETE /api/integrations/invoice4u/clearing
**ניתוק אינטגרציה לתשלומים**

#### POST /api/integrations/invoice4u/clearing/process
**ביצוע תשלום**

```json
{
  "clientId": "client_id_here",
  "quoteId": "quote_id_here",
  "amount": 1000,
  "description": "תשלום עבור שירות",
  "paymentType": "regular",
  "returnUrl": "https://your-domain.com/success",
  "isAutoCreateCustomer": true,
  "createDocument": false
}
```

#### GET /api/integrations/invoice4u/clearing/logs
**קבלת היסטוריית תשלומים**

Query Parameters:
- `paymentId`: מזהה תשלום
- `clearingLogId`: מזהה clearing log

### קבצים חשובים - Clearing APIs

```
lib/invoice4u-clearing.ts                          # Client לחיבור ל-Clearing APIs
app/api/integrations/invoice4u/clearing/route.ts   # ניהול הגדרות Clearing
app/api/integrations/invoice4u/clearing/process/route.ts  # ביצוע תשלומים
app/api/integrations/invoice4u/clearing/logs/route.ts     # היסטוריית תשלומים
```

### סוגי תשלום (Payment Types)

| סוג | ערך | תיאור |
|-----|-----|-------|
| `regular` | ClearingType.Regular | תשלום רגיל חד פעמי |
| `tokenize` | AddToken=true | שמירת טוקן ללא חיוב |
| `tokenize_and_charge` | AddTokenAndCharge=true | שמירת טוקן וחיוב מיידי |
| `charge_with_token` | ChargeWithToken=true | חיוב עם טוקן קיים |
| `standing_order` | IsStandingOrderClearance=true | תשלומים חוזרים |

### טיפול בשגיאות - Clearing

שגיאות נפוצות:

1. **"EmptyObjectInRequest" (146)**
   - הבקשה ריקה
   - ודא ששולחים את כל הפרמטרים הנדרשים

2. **"ApiKeyNotInCorrectFormat" (303)**
   - API Key לא תקין
   - בדוק את הפורמט של ה-API Key

3. **"UnauthorizedUser" (80)**
   - משתמש לא מורשה
   - בדוק את פרטי ההתחברות

4. **"CustomerNotFound" (136)**
   - לקוח לא נמצא
   - השתמש ב-`isAutoCreateCustomer: true` ליצירה אוטומטית

5. **"ApiTokenizationNotApprovedInClearingTerminal" (309)**
   - Tokenization לא מאושר בטרמינל
   - יש לאשר את Tokenization בהגדרות Invoice4U

6. **"ApiStandingOrderNotApprovedInClearingTerminal" (310)**
   - Standing Order לא מאושר
   - יש לאשר את Standing Orders בהגדרות Invoice4U

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

### דוגמאות שימוש - Documents

#### דוגמה 1: הוצאת הצעת מחיר

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

#### דוגמה 2: חשבונית מס קבלה

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

## הבדלים בין Documents API ל-Clearing APIs

| Documents API | Clearing APIs |
|---------------|---------------|
| יצירת מסמכים (חשבוניות) | ביצוע תשלומים |
| Email + Password | API Key (מומלץ) או Email + Password |
| SOAP/WSDL | SOAP/WSDL |
| `CreateDocument`, `CreateCustomer` | `ProcessApiRequestV2`, `GetClearingLogById` |
| `/api/integrations/invoice4u/documents` | `/api/integrations/invoice4u/clearing/process` |

**חשוב**: שתי האינטגרציות נפרדות ויכולות לעבוד במקביל. ניתן להשתמש ב-Documents API למסמכים וב-Clearing APIs לתשלומים.

---

**נבנה על ידי**: צוות הפיתוח של QuickCRM  
**תאריך עדכון אחרון**: נובמבר 2025  
**גרסה**: 2.0.0 (כולל Clearing APIs)

