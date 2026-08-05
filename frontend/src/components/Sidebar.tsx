"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Database,
  BrainCircuit,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSettings?: () => void;
}

export function Sidebar({ activeTab, onSelectTab, onOpenSettings }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(true);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, targetId: "dashboard-hero" },
    { id: "preview", label: "Datasets", icon: Database, targetId: "data-preview" },
    { id: "analysis", label: "AI Analysis", icon: BrainCircuit, targetId: "ai-insights" },
    { id: "charts", label: "Plotly Charts", icon: BarChart3, targetId: "plotly-charts" },
    { id: "reports", label: "Quality Reports", icon: FileText, targetId: "health-score-index" },
    { id: "settings", label: "Settings", icon: Settings, isSettings: true },
  ];

  const handleItemClick = (item: (typeof menuItems)[0]) => {
    onSelectTab(item.id);

    if (item.isSettings) {
      if (onOpenSettings) onOpenSettings();
      return;
    }

    if (item.targetId) {
      const el = document.getElementById(item.targetId);
      if (el) {
        const navbarOffset = 100;
        const elementPosition = el.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - navbarOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 200 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="hidden md:flex flex-col fixed left-4 top-24 bottom-6 z-30 bg-[#131B2E]/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-white/[0.08]"
    >
      {/* Collapse Toggle */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 font-semibold shadow-sm"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs truncate font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapsed Indicator dot */}
      {collapsed && (
        <div className="flex justify-center pt-2 border-t border-white/[0.06]">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" title="System Active" />
        </div>
      )}
    </motion.aside>
  );
}
