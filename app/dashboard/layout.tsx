"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookmarkCheck, Settings, LucideIcon } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

// Easily add, remove, or reorder navigation links here in the future
const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Follow-ups",
    href: "/dashboard/follow-ups",
    icon: Users,
  },
  // Example of how easy it is to add a new item later:
  // {
  //   name: "Saved Properties",
  //   href: "/dashboard/saved",
  //   icon: BookmarkCheck,
  // },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r bg-card/50 backdrop-blur-sm hidden md:flex flex-col p-6 space-y-6">
        <div className="flex items-center gap-2 font-bold text-lg px-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs">
            AI
          </div>
          <span>CRM Dashboard</span>
        </div>
        
        <nav className="flex flex-col space-y-1">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            // Check if active (supports exact matches or nested subpages if needed)
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <IconComponent className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}