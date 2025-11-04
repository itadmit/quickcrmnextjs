# 🔍 מדריך דיבאג - Invoice4U Integration

## בעיה: "Invalid Invoice4U credentials"

### שלב 1: השתמש בכפתור "בדוק חיבור" 🔍

1. מלא את האימייל והסיסמה
2. בחר את הסביבה הנכונה (Production/Staging)
3. לחץ על **"🔍 בדוק חיבור"**
4. פתח את ה-Console (F12) וראה מה הלוגים אומרים

### שלב 2: בדוק את הלוגים

פתח את **Developer Tools** (F12) → **Console**

חפש הודעות כמו:
```
Testing Invoice4U credentials...
Invoice4U login error: ...
```

### שלב 3: סיבות נפוצות

#### ✅ הסיסמה שגויה
- נסה להתחבר ל-[Invoice4U](https://www.invoice4u.co.il) עם אותם פרטים
- אם לא עובד, אפס את הסיסמה

#### ✅ סביבה לא נכונה
- **Production**: עבור חשבון אמיתי
- **Staging**: עבור חשבון בדיקות

#### ✅ רווחים בשדות
- ודא שאין רווחים בהתחלה או בסוף של האימייל/סיסמה

### שלב 4: בדיקה בשרת

הרץ את הפרויקט עם לוגים:
```bash
npm run dev
```

שים לב להודעות:
```
=== Invoice4U Connection Test ===
Email: your@email.com
Use Production: true
WSDL: https://api.invoice4u.co.il/Services/ApiService.svc?singleWsdl
Attempting to login...
```

---

## איך להשתמש בכפתור "בדוק חיבור"

הכפתור הזה **לא שומר** את הנתונים, רק בודק אם ההתחברות עובדת.

### מה הוא עושה:
1. ✅ מתחבר ל-Invoice4U
2. ✅ מקבל Token
3. ✅ בודק שה-Token תקף
4. ✅ מחזיר תוצאה מפורטת

### תוצאות אפשריות:

#### ✅ הצלחה
```
"החיבור ל-Invoice4U תקין!"
```
**משמעות:** הפרטים נכונים! עכשיו אפשר ללחוץ על "התחבר"

#### ❌ כישלון
```
"פרטי ההתחברות לא תקינים"
```
**משמעות:** משהו לא בסדר. בדוק:
- האימייל והסיסמה
- הסביבה (Production/Staging)
- שהחשבון פעיל

---

## דוגמה לתהליך תקין

1. מילוי הפרטים:
```
אימייל: your.email@example.com
סיסמה: YourPassword123
✅ Production מסומן
```

2. לחיצה על "בדוק חיבור"
```
→ "בודק..."
→ "✅ החיבור תקין!"
```

3. לחיצה על "התחבר ל-Invoice4U"
```
→ "מתחבר..."
→ "הצלחה! החיבור ל-Invoice4U הושלם בהצלחה"
```

---

## נתקעת? 

ראה את [INVOICE4U_TROUBLESHOOTING.md](./INVOICE4U_TROUBLESHOOTING.md) למדריך מקיף.

