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
    activeColor: "var(--success)",
    activeBg: "rgba(42,245,152,0.15)",
  },
  {
    value: "medium",
    label: "Medium",
    icon: BatteryIcon,
    activeColor: "var(--warning)",
    activeBg: "rgba(245,165,36,0.15)",
  },
  {
    value: "low",
    label: "Low",
    icon: MoonIcon,
    activeColor: "var(--text-secondary)",
    activeBg: "rgba(160,160,171,0.12)",
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
      className={className}
      style={{
        display: "flex",
        padding: "4px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
      }}
    >
      {levels.map(({ value, label, icon: Icon, activeColor, activeBg }) => {
        const isActive = selected === value;
        return (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              minHeight: "44px",
              borderRadius: "8px",
              padding: "12px 0",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              /* P1-04: smooth transition on bg and color */
              transition: "background 200ms cubic-bezier(0.16,1,0.3,1), color 200ms cubic-bezier(0.16,1,0.3,1)",
              background: isActive ? activeBg : "transparent",
              color: isActive ? activeColor : "var(--text-secondary)",
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
