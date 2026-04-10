"use client";

import { useState } from "react";
import { ZapIcon, BatteryIcon, MoonIcon } from "./icons";

type EnergyLevel = "high" | "medium" | "low";

interface EnergySelectorProps {
  defaultValue?: EnergyLevel;
  onChange?: (level: EnergyLevel) => void;
  className?: string;
}

const levels: { value: EnergyLevel; label: string; icon: typeof ZapIcon; activeColor: string }[] = [
  {
    value: "high",
    label: "High",
    icon: ZapIcon,
    activeColor: "bg-green-500/20 text-green-400 border-green-500/40",
  },
  {
    value: "medium",
    label: "Medium",
    icon: BatteryIcon,
    activeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  },
  {
    value: "low",
    label: "Low",
    icon: MoonIcon,
    activeColor: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
  },
];

export function EnergySelector({
  defaultValue,
  onChange,
  className = "",
}: EnergySelectorProps) {
  const [selected, setSelected] = useState<EnergyLevel | undefined>(defaultValue);

  const handleSelect = (level: EnergyLevel) => {
    setSelected(level);
    onChange?.(level);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {levels.map(({ value, label, icon: Icon, activeColor }) => (
        <button
          key={value}
          onClick={() => handleSelect(value)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
            selected === value
              ? activeColor
              : "border-[var(--atlas-border)] text-[var(--atlas-muted)] hover:border-[var(--atlas-muted)]"
          }`}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}
