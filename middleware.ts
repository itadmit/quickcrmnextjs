export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/clients/:path*",
    "/tasks/:path*",
    "/projects/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/automations/:path*",
    "/inbox/:path*",
    "/calendar/:path*",
    "/ai/:path*",
  ]
}


