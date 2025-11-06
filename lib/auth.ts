import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "אימייל", type: "email" },
        password: { label: "סיסמה", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("נא למלא אימייל וסיסמה")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true }
        })

        if (!user) {
          throw new Error("משתמש לא נמצא")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("סיסמה שגויה")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company.name,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = user.role
        token.companyId = user.companyId
        token.companyName = user.companyName
      }
      
      // בדיקה שהמשתמש עדיין קיים בכל פעם ש-JWT מתעדכן
      if (token.id) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, email: true, name: true, role: true, companyId: true },
          })
          
          if (!existingUser) {
            // המשתמש נמחק - נחזיר null כדי להפסיק את ה-session
            return null as any
          }
          
          // עדכון הנתונים מה-DB
          token.id = existingUser.id
          token.name = existingUser.name
          token.role = existingUser.role
          token.companyId = existingUser.companyId
        } catch (error) {
          console.error('Error checking user in JWT callback:', error)
          return null as any
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // אם token הוא null, המשתמש נמחק - נחזיר session ריק
      if (!token || !token.id) {
        return null as any
      }
      
      // בדיקה נוספת שהמשתמש עדיין קיים
      try {
        const existingUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, email: true, name: true, role: true, companyId: true },
        })
        
        if (!existingUser) {
          // המשתמש נמחק - נחזיר null
          return null as any
        }
        
        if (session.user) {
          session.user.id = existingUser.id
          session.user.name = existingUser.name
          session.user.role = existingUser.role
          session.user.companyId = existingUser.companyId
          session.user.companyName = token.companyName as string
        }
      } catch (error) {
        console.error('Error checking user in session callback:', error)
        return null as any
      }
      
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}


