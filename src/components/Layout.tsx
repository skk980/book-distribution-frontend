// src/components/Layout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800">
        <Sidebar onNavigate={() => {}} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative z-50 w-72 max-w-[80%] bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
              <span className="text-lg font-semibold tracking-tight">
                Book Distribution
              </span>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-200 text-sm"
                onClick={() => setMobileSidebarOpen(false)}
              >
                ✕
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {/* All routed pages will render here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
