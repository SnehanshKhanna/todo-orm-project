import React from "react";
import { FilterType } from "../api";

interface Props {
  current: FilterType;
  onChange: (f: FilterType) => void;
}

export function FilterTabs({ current, onChange }: Props) {
  const tabs: FilterType[] = ["all", "active", "completed"];

  return (
    <div className="filter-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={current === tab ? "active" : ""}
          onClick={() => onChange(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );
}
