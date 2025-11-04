# 🤖 מערכת האוטומציה - מדריך שלם

## סקירה כללית

מערכת האוטומציה של QuickCRM מאפשרת לך ליצור תהליכים אוטומטיים שמגיבים לאירועים במערכת ומבצעים פעולות מותאמות אישית.

## ✨ תכונות עיקריות

### 1. **Triggers (טריגרים)** - מה מפעיל את האוטומציה?

- **ליד חדש נוצר** (`lead_created`) - כאשר נוסף ליד חדש למערכת
- **סטטוס ליד השתנה** (`lead_status_changed`) - כאשר הליד עבר לשלב אחר
- **משימה חדשה נוצרה** (`task_created`) - כאשר נוצרה משימה חדשה
- **משימה הושלמה** (`task_completed`) - כאשר משימה סומנה כבוצעה
- **פגישה נקבעה** (`meeting_scheduled`) - כאשר נקבעה פגישה חדשה
- **לקוח חדש נוסף** (`client_added`) - כאשר נוסף לקוח חדש

### 2. **Conditions (תנאים)** - מתי להריץ?

תנאים מאפשרים לך לסנן מתי האוטומציה תרוץ:

- **שווה ל-** (`equals`) - ערך זהה בדיוק
- **לא שווה ל-** (`not_equals`) - ערך שונה
- **מכיל** (`contains`) - טקסט מכיל מחרוזת מסוימת
- **גדול מ-** (`greater_than`) - מספרים
- **קטן מ-** (`less_than`) - מספרים

**דוגמאות לתנאים:**
```json
{
  "field": "source",
  "operator": "equals",
  "value": "אתר"
}

{
  "field": "status",
  "operator": "not_equals",
  "value": "NEW"
}
```

### 3. **Actions (פעולות)** - מה לעשות?

#### 📧 שלח אימייל (`send_email`)
שלח אימייל אוטומטי באמצעות תבנית:
```json
{
  "type": "send_email",
  "params": {
    "emailTemplateId": "template-id-here"
  }
}
```

#### ✅ צור משימה (`create_task`)
צור משימה חדשה אוטומטית:
```json
{
  "type": "create_task",
  "params": {
    "taskTitle": "עקוב אחרי {{name}}",
    "taskDescription": "ליד חדש מ-{{source}}",
    "taskPriority": "high"
  }
}
```

**משתנים זמינים:** ניתן להשתמש ב-`{{field_name}}` לשליפת נתונים מהאירוע.

#### 🔔 שלח התראה (`send_notification`)
שלח התראה למשתמש:
```json
{
  "type": "send_notification",
  "params": {
    "notificationMessage": "ליד חדש נוצר: {{name}}"
  }
}
```

#### 📝 עדכן סטטוס (`update_status`)
עדכן את סטטוס הישות:
```json
{
  "type": "update_status",
  "params": {
    "statusValue": "CONTACTED"
  }
}
```

#### 🏷️ הוסף תג (`add_tag`)
הוסף תג לליד:
```json
{
  "type": "add_tag",
  "params": {
    "tagName": "VIP"
  }
}
```

## 🛠️ איך להשתמש במערכת?

### יצירת אוטומציה חדשה

1. עבור לדף **אוטומציות** (`/automations`)
2. לחץ על **"צור אוטומציה חדשה"**
3. מלא את הפרטים:
   - **שם האוטומציה** - שם תיאורי
   - **תיאור** (אופציונלי) - הסבר מה האוטומציה עושה
4. **בחר טריגר** - מה יפעיל את האוטומציה
5. **בחר פעולה** - מה לעשות כשהאוטומציה תרוץ
6. שמור והפעל!

### הרצת אוטומציה ידנית

כדי לבדוק אוטומציה לפני שהיא תרוץ אוטומטית:

1. בעמוד האוטומציות, לחץ על **⋮** ליד האוטומציה
2. בחר **"הרץ עכשיו"**
3. המערכת תריץ את האוטומציה עם נתוני בדיקה

### צפייה בלוגים

לצפות בהיסטוריית הרצות האוטומציה:

```bash
GET /api/automations/{automation-id}/logs
```

פרמטרים:
- `limit` - מספר לוגים (ברירת מחדל: 50)
- `status` - `success` או `failed`

## 📋 דוגמאות לאוטומציות

### דוגמה 1: ליד חדש → צור משימה

**תיאור:** כאשר נוצר ליד חדש מהאתר, צור משימה לעקוב אחריו תוך 24 שעות.

```json
{
  "name": "עקוב אחרי לידים מהאתר",
  "trigger": {
    "type": "lead_created"
  },
  "conditions": [
    {
      "field": "source",
      "operator": "equals",
      "value": "אתר"
    }
  ],
  "actions": [
    {
      "type": "create_task",
      "params": {
        "taskTitle": "עקוב אחרי {{name}}",
        "taskDescription": "ליד חדש מהאתר - {{email}}",
        "taskPriority": "high"
      }
    },
    {
      "type": "send_notification",
      "params": {
        "notificationMessage": "ליד חדש מהאתר: {{name}}"
      }
    }
  ]
}
```

### דוגמה 2: משימה הושלמה → שלח אימייל

**תיאור:** כאשר משימה הושלמה, שלח אימייל תודה ללקוח.

```json
{
  "name": "שלח תודה אחרי השלמת משימה",
  "trigger": {
    "type": "task_completed"
  },
  "actions": [
    {
      "type": "send_email",
      "params": {
        "emailTemplateId": "thank-you-template"
      }
    }
  ]
}
```

### דוגמה 3: סטטוס ליד השתנה → הוסף תג

**תיאור:** כאשר ליד עבר לשלב "הצעת מחיר", הוסף תג "בתהליך".

```json
{
  "name": "תייג לידים בתהליך",
  "trigger": {
    "type": "lead_status_changed"
  },
  "conditions": [
    {
      "field": "newStatus",
      "operator": "equals",
      "value": "PROPOSAL"
    }
  ],
  "actions": [
    {
      "type": "add_tag",
      "params": {
        "tagName": "בתהליך"
      }
    }
  ]
}
```

## 🔧 טכנולוגיות

### Backend (Automation Engine)

**קובץ:** `lib/automation-engine.ts`

**מרכיבים עיקריים:**

1. **AutomationEngine** - המנוע המרכזי
   - `processTrigger()` - מעבד אירוע טריגר
   - `executeAutomation()` - מריץ אוטומציה ספציפית
   - `checkConditions()` - בודק תנאים
   - `executeAction()` - מבצע פעולה

2. **triggerAutomation()** - פונקציה עזר להפעלת אוטומציות
   - נקראת מכל נקודות ההפעלה במערכת

### Integration Points (נקודות אינטגרציה)

האוטומציות משולבות באופן אוטומטי ב:

1. **Leads API** (`app/api/leads/route.ts`)
   - `POST` - ליד חדש → `lead_created`
   - `PATCH` - שינוי סטטוס → `lead_status_changed`

2. **Tasks API** (`app/api/tasks/route.ts`)
   - `POST` - משימה חדשה → `task_created`
   - `PATCH` - השלמת משימה → `task_completed`

3. **Clients API** (`app/api/clients/route.ts`)
   - `POST` - לקוח חדש → `client_added`

4. **Calendar API** (`app/api/calendar/route.ts`)
   - `POST` - פגישה חדשה → `meeting_scheduled`

### Frontend

**קובץ:** `app/automations/page.tsx`

**תכונות:**
- רשימת אוטומציות
- סטטיסטיקות (סה"כ, פעילות, מושהות)
- הפעלה/השהיה
- הרצה ידנית
- מחיקה

**קובץ:** `components/dialogs/NewAutomationDialog.tsx`

**תכונות:**
- טופס רב-שלבי (3 שלבים)
- בחירת טריגר ופעולה ויזואלית
- תצוגת preview
- שדות דינמיים לפי סוג הפעולה

## 🔒 אבטחה

- כל הבקשות דורשות authentication
- האוטומציות פועלות רק על נתונים של החברה של המשתמש
- Logging מלא של כל ההרצות

## 🚀 שימוש מתקדם

### הוספת טריגר חדש

1. הוסף את הטריגר ל-`TriggerType` ב-`automation-engine.ts`:
```typescript
export type TriggerType = 
  | 'lead_created'
  | 'your_new_trigger'
```

2. הוסף אינטגרציה ב-API route הרלוונטי:
```typescript
await triggerAutomation(
  'your_new_trigger',
  entityId,
  'entity_type',
  data,
  userId,
  companyId
)
```

3. הוסף תווית בעברית ב-`getTriggerLabel()` בעמוד האוטומציות

### הוספת פעולה חדשה

1. הוסף את הפעולה ל-`ActionType` ב-`automation-engine.ts`:
```typescript
export type ActionType =
  | 'send_email'
  | 'your_new_action'
```

2. הוסף מטפל ב-`executeAction()`:
```typescript
case 'your_new_action':
  await this.yourNewAction(action, triggerData, automation)
  break
```

3. מימוש הפעולה:
```typescript
private static async yourNewAction(
  action: AutomationAction,
  triggerData: TriggerData,
  automation: any
): Promise<void> {
  // Your implementation here
}
```

4. הוסף ב-UI (`NewAutomationDialog.tsx`)

## 📊 Monitoring & Debugging

### לוגים

כל הרצת אוטומציה נשמרת ב-`AutomationLog`:
- `status` - success/failed
- `triggerData` - הנתונים שהפעילו את האוטומציה
- `errorMessage` - שגיאה אם הייתה

### Console Logs

המערכת כוללת logging מפורט:
```
🔔 Processing trigger: lead_created for entity: abc123
Found 2 active automations for trigger: lead_created
🤖 Executing automation: עקוב אחרי לידים (xyz789)
✅ Conditions met for automation: עקוב אחרי לידים
🎬 Executing action: create_task
✅ Created task: עקוב אחרי John Doe (task-123)
✨ Successfully executed automation: עקוב אחרי לידים
```

## 🎯 Best Practices

1. **שמות תיאוריים** - תן לאוטומציות שמות שמסבירים מה הן עושות
2. **השתמש בתנאים** - כדי לא להריץ אוטומציות על כל דבר
3. **בדוק לפני הפעלה** - השתמש ב-"הרץ עכשיו" לבדיקה
4. **צפה בלוגים** - בדוק שהאוטומציות עובדות כמו שצריך
5. **התחל פשוט** - צור אוטומציות פשוטות בהתחלה

## 🐛 פתרון בעיות

### האוטומציה לא רצה

1. בדוק שהיא **פעילה** (סטטוס ירוק)
2. בדוק שהתנאים מתקיימים
3. צפה בלוגים ב-console
4. נסה להריץ ידנית עם "הרץ עכשיו"

### שגיאות בלוגים

1. בדוק את ה-`errorMessage` בלוג
2. וודא שהפרמטרים של הפעולה נכונים
3. בדוק שיש לך הרשאות מתאימות

## 📈 תכניות עתידיות

- [ ] עריכת אוטומציות קיימות
- [ ] תנאים מורכבים (AND/OR)
- [ ] פעולות מרובות בעדיפויות
- [ ] דיווחים וסטטיסטיקות מתקדמות
- [ ] שילוב עם שירותים חיצוניים (Zapier, Webhooks)
- [ ] תזמון (Scheduling) - הרצה בזמן מסוים

---

**נוצר בתאריך:** נובמבר 2025  
**גרסה:** 1.0.0  
**תמיכה:** במקרה של בעיות, פנה למפתח המערכת

