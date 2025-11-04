# Quick crm - מערכת CRM מתקדמת בעברית

מערכת CRM מלאה ומתקדמת עם תמיכה מלאה ב-RTL ובעברית, בעיצוב Prodify, מבוססת על Next.js 14, TypeScript, Prisma ו-PostgreSQL.

## ✨ תכונות עיקריות

### ✨ ניהול לידים
- טבלת לידים עם חיפוש וסינון מתקדם
- Pipeline Kanban לניהול לידים חזותי
- המרה אוטומטית של לידים ללקוחות
- מעקב אחר מקורות לידים

### 👥 ניהול לקוחות
- כרטיס לקוח מרכזי עם כל המידע
- ניהול פרויקטים תחת כל לקוח
- מעקב אחר משימות ותקציבים
- ציר זמן מלא של פעילות

### 📋 ניהול משימות
- לוח Kanban למשימות
- הקצאת משימות לחברי צוות
- מעקב אחר דדליינים ועדיפויות
- משימות קשורות ללידים/לקוחות/פרויקטים

### 📊 דשבורד ודוחות
- KPI Cards עם מידע בזמן אמת
- גרפים ותרשימים אינטראקטיביים
- מעקב אחר יעדים והתקדמות
- דוחות צפי מול ביצוע
- ניתוח מקורות לידים ויחס המרה

### 📅 לוח שנה ופגישות
- לוח שנה חודשי מלא
- ניהול פגישות (וידאו/פרונטלי/טלפון)
- תזכורות לפגישות קרובות
- סנכרון עם Google Meet/Zoom

### 🔔 מערכת התראות
- התראות חכמות למשימות חדשות
- תזכורות לפגישות מתקרבות
- עדכונים על לידים חדשים
- התראות על מסמכים והצעות מחיר

### 🎯 קיטי משימות מוכנים
- Onboarding לקוח חדש
- פרויקט בניית אתר
- קמפיין שיווקי
- יישום מערכת CRM
- אפשרות להוסיף משימות ידנית

### 🔐 אבטחה והרשאות
- מערכת הרשאות מתקדמת (SUPER_ADMIN, ADMIN, MANAGER, USER)
- NextAuth לאימות משתמשים
- הפרדה מלאה בין חברות (Multi-tenant)

### 🔗 אינטגרציות
- Webhooks לקליטת לידים
- API Keys לכל חברה
- לוגים מפורטים של webhooks
- אוטומציות מבוססות טריגרים

## טכנולוגיות

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS עם תמיכה מלאה ב-RTL
- **Icons**: Lucide React
- **Font**: Noto Sans Hebrew

## התקנה והרצה

### דרישות מקדימות
- Node.js 18 ומעלה
- Docker & Docker Compose
- npm או yarn

### התקנה

1. שכפל את הפרויקט:
\`\`\`bash
git clone <repository-url>
cd quickcrmnextjs
\`\`\`

2. התקן תלויות:
\`\`\`bash
npm install
\`\`\`

3. צור קובץ `.env`:
\`\`\`bash
cp .env.example .env
\`\`\`

4. ערוך את `.env` עם הפרטים שלך:
\`\`\`env
DATABASE_URL="postgresql://crm_user:crm_pass@localhost:5432/crm_db?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
SUPER_ADMIN_EMAIL="itadmit@gmail.com"
SUPER_ADMIN_PASSWORD="115599"
\`\`\`

### הרצה עם Docker

1. הרם את המערכת:
\`\`\`bash
docker-compose up -d
\`\`\`

2. הרץ migrations:
\`\`\`bash
npx prisma migrate dev
\`\`\`

3. פתח בדפדפן: http://localhost:3000

### הרצה בסביבת פיתוח (ללא Docker)

1. הרץ PostgreSQL מקומי או השתמש ב-database מרוחק

2. הרץ migrations:
\`\`\`bash
npx prisma migrate dev
\`\`\`

3. הרץ את שרת הפיתוח:
\`\`\`bash
npm run dev
\`\`\`

4. פתח בדפדפן: http://localhost:3000

## 🎨 עיצוב

המערכת מעוצבת בדיוק כמו Prodify:
- **רקע:** `#f7f9fe` (כחול בהיר)
- **גרדיאנט אלכסוני:** `#6f65e2` → `#b965e2` (סגול)
- **גרדיאנט אופקי:** `#93f0e1` → `#6374c5` (טורקיז-כחול)
- **לוגו:** פונט Pacifico - "Quick crm"
- **תוכן:** ממורכז עם max-width של 1280px
- **פונט:** Noto Sans Hebrew לעברית

## 🔄 זרימת עבודה

### ליד → לקוח → פרויקט → משימות

1. **ליד נכנס** (מטופס/פייסבוק/Webhook)
2. **טיפול בליד** - Pipeline Kanban עם שלבים
3. **המרה ללקוח** - בלחיצת כפתור
4. **יצירת פרויקט** - פרויקט מהיר או מלא
5. **הוספת משימות** - קיט מוכן או ידני
6. **ניהול ומעקב** - Kanban, לוח שנה, דוחות

## מבנה הפרויקט

\`\`\`
quickcrmnextjs/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── auth/            # Authentication endpoints
│   │   └── webhooks/        # Webhook handlers
│   ├── dashboard/           # דשבורד ראשי
│   ├── leads/               # ניהול לידים
│   ├── clients/             # ניהול לקוחות
│   ├── tasks/               # ניהול משימות
│   ├── login/               # התחברות
│   └── register/            # הרשמה
├── components/              # React Components
│   ├── ui/                  # shadcn/ui components
│   ├── AppLayout.tsx        # Layout ראשי
│   ├── Sidebar.tsx          # תפריט צד
│   └── Header.tsx           # כותרת עליונה
├── lib/                     # Utilities
│   ├── prisma.ts           # Prisma client
│   ├── auth.ts             # NextAuth config
│   └── utils.ts            # Helper functions
├── prisma/                  # Prisma schema & migrations
│   └── schema.prisma       # Database schema
├── public/                  # Static files
└── types/                   # TypeScript types
\`\`\`

## משתמש ראשון (Super Admin)

בהרשמה הראשונה עם האימייל `itadmit@gmail.com`, המשתמש יהפוך אוטומטית ל-SUPER_ADMIN עם גישה מלאה למערכת.

**פרטי התחברות ברירת מחדל:**
- אימייל: itadmit@gmail.com
- סיסמה: 115599

## תכונות נוספות שיתווספו

- [ ] דו-כיווני Email (Gmail API)
- [ ] אינטגרציה עם WhatsApp Business
- [ ] מערכת תשלומים (Stripe/PayPlus)
- [ ] דוחות מתקדמים יותר
- [ ] ייצוא ל-PDF
- [ ] אוטומציות מתקדמות
- [ ] מערכת הודעות פנימית
- [ ] תמיכה במספר שפות

## רישיון

MIT License

## תמיכה

לשאלות ותמיכה, צור קשר ב-itadmit@gmail.com


