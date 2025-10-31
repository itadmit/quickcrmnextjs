"use client";

import Header from "./Header";

export default function AppLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

