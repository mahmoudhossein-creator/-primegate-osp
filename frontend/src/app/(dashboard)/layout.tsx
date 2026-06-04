"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth";
import {
  LayoutDashboard, Users, FileCheck, CalendarDays,
  Package, Receipt, BarChart3, Settings, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/" as const,               icon: LayoutDashboard, label: "Dashboard" },
  { href: "/teams" as const,          icon: Users,           label: "Teams" },
  { href: "/work-orders" as const,    icon: FileCheck,       label: "Work Orders" },
  { href: "/daily-planning" as const, icon: CalendarDays,    label: "Daily Planning" },
  { href: "/expenses" as const,       icon: Receipt,         label: "Sites Expenses" },
  { href: "/materials" as const,      icon: Package,         label: "Materials" },
  { href: "/reports" as const,        icon: BarChart3,       label: "Reports" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrate, logout, user } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => { hydrate(); }, []);
  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated]);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <aside className="w-48 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center text-black font-bold text-xs">PG</div>
            <div>
              <div className="text-white text-xs font-semibold">Prime Gate</div>
              <div className="text-gray-500 text-[10px]">OSP System</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 px-4 py-2 text-xs transition-all border-l-2 ${
                  active
                    ? "text-amber-400 border-amber-400 bg-amber-500/10 font-medium"
                    : "text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-medium">
              {user?.name?.[0] ?? "U"}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-200 font-medium truncate">{user?.name}</div>
              <div className="text-[10px] text-gray-500 capitalize">{user?.role?.replace("_"," ")}</div>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-xs w-full transition-colors px-1">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
