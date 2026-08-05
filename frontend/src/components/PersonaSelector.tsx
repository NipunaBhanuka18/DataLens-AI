"use client";

import React from "react";
import { Briefcase, Flame, UserCheck } from "lucide-react";

export type AIPersona = "professional" | "roast" | "executive";

interface PersonaSelectorProps {
  currentPersona: AIPersona;
  onSelectPersona: (persona: AIPersona) => void;
  disabled?: boolean;
}

export function PersonaSelector({
  currentPersona,
  onSelectPersona,
  disabled = false,
}: PersonaSelectorProps) {
  const personas: { id: AIPersona; label: string; icon: any; color: string }[] = [
    { id: "professional", label: "Professional", icon: Briefcase, color: "text-[#22C55E]" },
    { id: "roast", label: "Roast Mode", icon: Flame, color: "text-rose-400" },
    { id: "executive", label: "Executive", icon: UserCheck, color: "text-[#38BDF8]" },
  ];

  return (
    <div className="inline-flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08]">
      {personas.map((p) => {
        const Icon = p.icon;
        const isActive = currentPersona === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelectPersona(p.id)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isActive
                ? "bg-[#131B2E] text-white shadow-md border border-white/[0.12]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? p.color : "text-slate-500"}`} />
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
