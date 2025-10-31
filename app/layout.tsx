import "./globals.css";
import { Noto_Sans_Hebrew, Pacifico } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";

const noto = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  weight: ["300", "400", "500", "700", "900"],
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pacifico",
});

export const metadata = {
  title: "CRM SaaS",
  description: "מערכת CRM מתקדמת",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${noto.className} ${pacifico.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

