"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, TrendingUp, FolderKanban, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function Header({ user }: { user: any }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/clients", label: "לקוחות", icon: Users },
    { href: "/leads", label: "לידים", icon: TrendingUp },
    { href: "/projects", label: "פרויקטים", icon: FolderKanban },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold text-[#00c875]">
              CRM
            </Link>
            <nav className="flex items-center gap-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-[#00c875] text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              התנתק
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

