import { MobileNav, Sidebar } from "@/components/Sidebar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex flex-1 flex-col px-3 py-3 pb-24 md:px-5 md:py-4 md:pb-4">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
