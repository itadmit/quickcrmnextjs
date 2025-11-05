// סקריפט לבדיקת תבניות שהיו נמחקות או לא מוצגות
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTemplates() {
  try {
    console.log('🔍 בודק תבניות ב-database...\n')

    // מקבל את כל התבניות (גם אם isTemplate נמחק בטעות)
    const allQuotes = await prisma.quote.findMany({
      where: {
        quoteNumber: {
          startsWith: 'TEMPLATE-'
        }
      },
      include: {
        items: {
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 נמצאו ${allQuotes.length} הצעות מחיר עם מספר TEMPLATE-\n`)

    // בודק תבניות עם isTemplate = true
    const templates = allQuotes.filter(q => q.isTemplate)
    console.log(`✅ תבניות פעילות (isTemplate=true): ${templates.length}`)
    
    // בודק תבניות עם isTemplate = false (אולי נמחקו בטעות)
    const potentialTemplates = allQuotes.filter(q => !q.isTemplate)
    console.log(`⚠️  תבניות פוטנציאליות (isTemplate=false): ${potentialTemplates.length}\n`)

    if (potentialTemplates.length > 0) {
      console.log('📋 תבניות שכנראה נמחקו בטעות:\n')
      potentialTemplates.forEach((quote, index) => {
        console.log(`${index + 1}. ${quote.title}`)
        console.log(`   ID: ${quote.id}`)
        console.log(`   מספר: ${quote.quoteNumber}`)
        console.log(`   נוצר: ${quote.createdAt}`)
        console.log(`   פריטים: ${quote.items.length}`)
        console.log('')
      })

      console.log('\n💡 אפשר לשחזר אותן על ידי עדכון isTemplate ל-true:')
      console.log('   await prisma.quote.update({ where: { id: "..." }, data: { isTemplate: true } })')
    }

    // מחפש תבניות שנמחקו לאחרונה
    const recentDeleted = await prisma.quote.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 ימים אחרונים
        },
        quoteNumber: {
          startsWith: 'TEMPLATE-'
        }
      },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (recentDeleted.length > 0) {
      console.log(`\n📅 תבניות שנוצרו לאחרונה (7 ימים): ${recentDeleted.length}`)
    }

  } catch (error) {
    console.error('❌ שגיאה:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTemplates()

