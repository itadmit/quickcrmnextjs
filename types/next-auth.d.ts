import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    role: string
    companyId: string
    companyName: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      companyId: string
      companyName: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    name: string
    role: string
    companyId: string
    companyName: string
  }
}


