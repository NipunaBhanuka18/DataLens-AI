"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Cpu, Palette, Sliders, ShieldCheck, Check } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [theme, setTheme] = useState("emerald");
  const [samplingCap, setSamplingCap] = useState("50000");
  const [defaultPersona, setDefaultPersona] = useState("professional");
  const [autoScroll, setAutoScroll] = useState(true);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#131B2E] border border-white/[0.12] w-full max-w-lg rounded-2xl shadow-2xl p-6 relative overflow-hidden"
        >
          {/* Top Glow Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#22C55E] via-[#06B6D4] to-[#A855F7]" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Platform Settings</h3>
                <p className="text-xs text-slate-400">Configure DataLens AI Copilot preferences & engine behavior</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Settings Options Body */}
          <div className="space-y-5">
            {/* 1. Theme Palette */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-2">
                <Palette className="w-4 h-4 text-[#22C55E]" /> Theme Accent Palette
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "emerald", label: "Emerald Dark", color: "#22C55E" },
                  { id: "cyan", label: "Cyan Cyber", color: "#06B6D4" },
                  { id: "amber", label: "Amber Gold", color: "#F59E0B" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition ${
                      theme === t.id
                        ? "bg-white/[0.08] text-white border-[#22C55E]"
                        : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span>{t.label}</span>
                    </div>
                    {theme === t.id && <Check className="w-3.5 h-3.5 text-[#22C55E]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Polars Max Sampling Cap */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-2">
                <Cpu className="w-4 h-4 text-[#06B6D4]" /> Polars ML Readiness Sampling Cap
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "25000", label: "25k Rows (Fastest)" },
                  { value: "50000", label: "50k Rows (Default)" },
                  { value: "100000", label: "100k Rows (Deep)" },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSamplingCap(s.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition ${
                      samplingCap === s.value
                        ? "bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/40 font-bold"
                        : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.06]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Default AI Persona */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-2">
                <Sliders className="w-4 h-4 text-[#A855F7]" /> Default Copilot Persona
              </label>
              <select
                value={defaultPersona}
                onChange={(e) => setDefaultPersona(e.target.value)}
                className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
              >
                <option value="professional">Professional (Scientific & Objective)</option>
                <option value="executive">Executive (Strategic C-Suite Briefing)</option>
                <option value="roast">Roast Mode (Witty & Brutal Sarcasm)</option>
              </select>
            </div>

            {/* 4. Auto-Scroll Navigation Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                <div>
                  <p className="text-xs font-bold text-white">Scroll Spy & Auto Focus</p>
                  <p className="text-[10px] text-slate-400">Sync left sidebar highlighting automatically during viewport scroll</p>
                </div>
              </div>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                  autoScroll ? "bg-[#22C55E]" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    autoScroll ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* 5. Engine Status Footer */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
              <span>Backend API Status: <span className="text-[#22C55E] font-bold">● Operational</span></span>
              <span>FastAPI + Polars v1.21</span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="mt-6 pt-4 border-t border-white/[0.08] flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#16a34a] text-xs font-bold text-slate-950 transition shadow-lg shadow-[#22C55E]/20"
            >
              Save Preferences
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
