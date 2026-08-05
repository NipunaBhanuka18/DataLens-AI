"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Command,
  Bell,
  CheckCircle2,
  Cpu,
  Zap,
  Activity,
  FileText,
} from "lucide-react";

interface NavbarProps {
  onOpenCommandPalette: () => void;
  activeFilename?: string;
}

export function Navbar({ onOpenCommandPalette, activeFilename }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAgentStatus, setShowAgentStatus] = useState(false);

  const notifications = [
    { id: 1, title: "Polars Zero-Copy Engine active", time: "Just now", icon: Zap, color: "text-[#22C55E]" },
    { id: 2, title: "Deep ML Readiness Heuristics computed", time: "1 min ago", icon: CheckCircle2, color: "text-[#06B6D4]" },
    { id: 3, title: "LangGraph 5-Agent Workflow complete", time: "2 mins ago", icon: Cpu, color: "text-[#A855F7]" },
  ];

  return (
    <header className="sticky top-4 z-40 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="dark-glass-nav px-5 h-14 flex items-center justify-between shadow-2xl relative">
        {/* Brand Header */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#166534] to-[#22C55E] flex items-center justify-center shadow-md shadow-[#22C55E]/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-white text-base tracking-tight">DataLens AI</h1>
            {activeFilename && (
              <>
                <span className="text-slate-600">/</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-300 font-medium px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] truncate max-w-[180px]">
                  <FileText className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="truncate">{activeFilename}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Clean Center Search & Command Bar */}
        <div className="flex-1 max-w-md mx-6">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-slate-400 hover:text-white text-xs font-medium border border-white/[0.08] hover:border-[#22C55E]/40 transition shadow-sm group"
          >
            <div className="flex items-center gap-2.5">
              <Command className="w-3.5 h-3.5 text-[#22C55E] group-hover:scale-110 transition-transform" />
              <span className="text-slate-300 font-normal">Search commands or generate chart...</span>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] bg-[#0B0F19] border border-white/[0.12] px-2 py-0.5 rounded-md font-mono text-slate-300 font-semibold shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right System Status & Notifications */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Interactive Notification Bell Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowAgentStatus(false);
              }}
              title="Pipeline System Activity"
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            >
              <Bell className="w-4 h-4 text-[#22C55E]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 bg-[#131B2E] border border-white/[0.12] rounded-2xl p-4 shadow-2xl z-50"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#22C55E]" /> System Logs & Activity
                    </h4>
                    <span className="text-[10px] bg-[#22C55E]/15 text-[#22C55E] px-2 py-0.5 rounded-full font-bold">
                      Live
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {notifications.map((n) => {
                      const IconComp = n.icon;
                      return (
                        <div key={n.id} className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <IconComp className={`w-4 h-4 ${n.color} shrink-0 mt-0.5`} />
                          <div>
                            <p className="text-xs text-slate-200 font-medium leading-snug">{n.title}</p>
                            <span className="text-[10px] text-slate-400">{n.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive AI Agent Copilot Avatar Status */}
          <div className="relative">
            <button
              onClick={() => {
                setShowAgentStatus(!showAgentStatus);
                setShowNotifications(false);
              }}
              title="Copilot System Health Status"
              className="w-7 h-7 rounded-full bg-[#166534]/40 border border-[#22C55E]/50 flex items-center justify-center text-[#22C55E] text-xs font-bold shadow-xs hover:scale-105 transition"
            >
              AI
            </button>

            <AnimatePresence>
              {showAgentStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-[#131B2E] border border-white/[0.12] rounded-2xl p-4 shadow-2xl z-50"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08] mb-3">
                    <Activity className="w-4 h-4 text-[#22C55E]" />
                    <div>
                      <h4 className="text-xs font-bold text-white">AI Data Science Copilot</h4>
                      <span className="text-[10px] text-[#22C55E] font-bold">● Status: 100% Operational</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/[0.04]">
                      <span className="text-slate-400">LLM Model:</span>
                      <span className="text-slate-200 font-semibold">Gemini Pro / LangChain</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]">
                      <span className="text-slate-400">Math Engine:</span>
                      <span className="text-slate-200 font-semibold">Polars + Scikit-Learn</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]">
                      <span className="text-slate-400">Workflow Nodes:</span>
                      <span className="text-slate-200 font-semibold">5 Active Agents</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Avg API Latency:</span>
                      <span className="text-[#22C55E] font-bold">120 ms</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
