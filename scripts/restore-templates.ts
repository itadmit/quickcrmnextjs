// סקריפט לשחזור תבניות שנמחקו בטעות
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function restoreTemplates() {
  try {
    console.log('🔄 מחפש תבניות לשחזור...\n')

    // מוצא את כל ההצעות עם מספר TEMPLATE- אבל isTemplate = false
    const potentialTemplates = await prisma.quote.findMany({
      where: {
        quoteNumber: {
          startsWith: 'TEMPLATE-'
        },
        isTemplate: false
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

    if (potentialTemplates.length === 0) {
      console.log('❌ לא נמצאו תבניות לשחזור')
      await prisma.$disconnect()
      return
    }

    console.log(`📋 נמצאו ${potentialTemplates.length} תבניות לשחזור:\n`)

    // מציג את התבניות
    potentialTemplates.forEach((quote, index) => {
      console.log(`${index + 1}. ${quote.title}`)
      console.log(`   ID: ${quote.id}`)
      console.log(`   מספר: ${quote.quoteNumber}`)
      console.log(`   נוצר: ${quote.createdAt}`)
      console.log(`   פריטים: ${quote.items.length}`)
      console.log('')
    })

    // משחזר את התבניות
    console.log('💾 משחזר תבניות...\n')
    
    for (const quote of potentialTemplates) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { isTemplate: true }
      })
      console.log(`✅ שוחזר: ${quote.title}`)
    }

    console.log(`\n✅ שוחזרו ${potentialTemplates.length} תבניות בהצלחה!`)

  } catch (error) {
    console.error('❌ שגיאה:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// להסיר את ההערה כדי להריץ את השחזור
// restoreTemplates()

console.log('⚠️  זהו סקריפט לשחזור תבניות')
console.log('📝 כדי להריץ אותו, הסר את ההערה בשורה האחרונה של הקובץ')
console.log('💡 מומלץ להריץ קודם את check-templates.ts כדי לראות מה יש לשחזר')

