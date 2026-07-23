"use client";

import React from "react";
import {
  LayoutDashboard,
  Utensils,
  ClipboardList,
  Store,
  Settings,
  LogOut,
  Bell,
  User,
  ChevronDown,
  Menu,
  X,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, desc: "Overview & Analytics" },
    { name: "Menu Management", href: "/admin/menu", icon: Utensils, desc: "Configure master categories & menu items" },
    { name: "Branch Menu Control", href: "/admin/menu-matrix", icon: SlidersHorizontal, desc: "Control menu availability per branch location" },
    { name: "Orders", href: "/admin/orders", icon: ClipboardList, desc: "Live restaurant order management" },
    { name: "Branches", href: "/admin/branches", icon: Store, desc: "Manage multi-unit branch locations" },
    { name: "Settings", href: "/admin/settings", icon: Settings, desc: "System configuration & preferences" },
  ];

  // Match longest route first so /admin/menu-matrix isn't mis-matched by /admin/menu
  const sortedItems = [...navItems].sort((a, b) => b.href.length - a.href.length);
  const currentTab =
    sortedItems.find((item) =>
      item.href === "/admin/menu"
        ? pathname === "/admin/menu" || pathname === "/"
        : pathname.startsWith(item.href)
    ) || navItems[1];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F5F4F1] flex font-sans antialiased text-neutral-900 select-none">
      {/* ── SIDEBAR (Desktop) ── */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-dark text-white flex-shrink-0 border-r border-neutral-800">
        {/* Header/Logo */}
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-neutral-800 bg-[#161412]">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center font-bold text-white text-base shadow-lg shadow-brand-primary/20">
            CN
          </div>
          <div>
            <h1 className="text-[12px] font-800 tracking-wide uppercase leading-tight text-neutral-200">
              Cyber Nest
            </h1>
            <p className="text-[9px] font-600 text-brand-primary uppercase tracking-wider leading-none">
              RMS Admin
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.name === currentTab.name;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={
                  item.href === "/admin/menu" && pathname === "/"
                    ? "/"
                    : item.href
                }
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-600 transition-all cursor-pointer ${
                  active
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/25"
                    : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                }`}
              >
                <Icon
                  size={15}
                  className={active ? "text-white" : "text-neutral-400"}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer profile info / logout */}
        <div className="p-4 border-t border-neutral-800 bg-[#161412]">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center font-700 text-white text-[11px]">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-700 text-neutral-200 truncate leading-tight">
                Yogesh Kumar
              </p>
              <p className="text-[8px] font-600 text-neutral-500 truncate leading-none mt-0.5">
                superadmin@rms.com
              </p>
            </div>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-brand-primary hover:bg-neutral-800 transition-all cursor-pointer">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── TOPBAR ── */}
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-all cursor-pointer"
            >
              <Menu size={18} />
            </button>
            <div className="hidden md:block">
              <h2 className="text-[13px] font-700 text-neutral-800">
                {currentTab.name}
              </h2>
              <p className="text-[9px] font-500 text-neutral-400 mt-0.5">
                {currentTab.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-all cursor-pointer">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-primary rounded-full" />
            </button>

            <span className="w-px h-6 bg-neutral-200" />

            {/* Profile Dropdown */}
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity">
              <div className="w-7.5 h-7.5 bg-orange-100 text-brand-primary rounded-lg flex items-center justify-center font-700 text-[10px]">
                YK
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[10px] font-700 text-neutral-800 leading-tight">
                  Yogesh Kumar
                </p>
                <p className="text-[8px] font-600 text-neutral-400 uppercase tracking-wide leading-none mt-0.5">
                  Brand Manager
                </p>
              </div>
              <ChevronDown size={11} className="text-neutral-400" />
            </div>
          </div>
        </header>

        {/* ── INNER VIEW CONTAINER ── */}
        <main className="flex-1 overflow-y-auto p-6 min-h-0">{children}</main>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer body */}
          <div className="relative w-64 bg-brand-dark text-white flex flex-col animate-drawer-slide-in">
            <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-800 bg-[#161412]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center font-bold text-white text-base shadow-lg">
                  CN
                </div>
                <div>
                  <h1 className="text-[12px] font-800 tracking-wide uppercase leading-tight">
                    Cyber Nest
                  </h1>
                  <p className="text-[9px] font-600 text-brand-primary uppercase tracking-wider leading-none">
                    RMS Admin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active =
                  pathname.startsWith(item.href) ||
                  (item.name === "Menu Management" && pathname === "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-600 transition-all cursor-pointer ${
                      active
                        ? "bg-brand-primary text-white"
                        : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                    }`}
                  >
                    <Icon size={15} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
