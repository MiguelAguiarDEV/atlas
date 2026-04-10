"use client";

import { useState } from "react";
import { ZapIcon, BatteryIcon, MoonIcon } from "./icons";

type EnergyLevel = "high" | "medium" | "low";

interface EnergySelectorProps {
  defaultValue?: EnergyLevel;
  onChange?: (level: EnergyLevel) => void;
  className?: string;
}

const levels: {
  value: EnergyLevel;
  label: string;
  icon: typeof ZapIcon;
  activeColor: string;
  activeBg: string;
}[] = [
  {
    value: "high",
    label: "High",
    icon: ZapIcon,
    activeColor: "text-green-400",
    activeBg: "bg-green-500/15",
  },
  {
    value: "medium",
    label: "Medium",
    icon: BatteryIcon,
    activeColor: "text-yellow-400",
    activeBg: "bg-yellow-500/15",
  },
  {
    value: "low",
    label: "Low",
    icon: MoonIcon,
    activeColor: "text-zinc-400",
    activeBg: "bg-zinc-500/15",
  },
];

export function EnergySelector({
  defaultValue,
  onChange,
  className = "",
}: EnergySelectorProps) {
  const [selected, setSelected] = useState<EnergyLevel | undefined>(
    defaultValue
  );

  const handleSelect = (level: EnergyLevel) => {
    setSelected(level);
    onChange?.(level);
  };

  return (
    <div
      className={`flex rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] p-1 ${className}`}
      style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)" }}
    >
      {levels.map(({ value, label, icon: Icon, activeColor, activeBg }) => {
        const isActive = selected === value;
        return (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            style={{ minHeight: "44px" }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${
              isActive
                ? `${activeBg} ${activeColor}`
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)]"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
