import React from "react";
import SideNavBar from "@/components/layout/SideNavBar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      <SideNavBar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 