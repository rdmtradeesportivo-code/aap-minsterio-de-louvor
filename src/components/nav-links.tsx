"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Music4, CalendarDays, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/dashboard/repertorio", label: "Repertório", icon: Music4 },
  { href: "/dashboard/cultos", label: "Cultos", icon: CalendarDays },
  { href: "/dashboard/equipe", label: "Equipe", icon: Users },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {links.map((link) => {
        const isActive =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-violet-50 text-violet-700"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <link.icon className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
