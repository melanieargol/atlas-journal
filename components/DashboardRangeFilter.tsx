import Link from "next/link";

import type { TimeRange } from "@/types/journal";

const options: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" }
];

export function DashboardRangeFilter({ activeRange, basePath = "/dashboard" }: { activeRange: TimeRange; basePath?: string }) {
  return (
    <section className="panel filter-panel">
      <div className="section-head compact-head">
        <div>
          <p className="section-label">Time range</p>
          <h2>Filter the trend window</h2>
        </div>
      </div>

      <div className="filter-row">
        {options.map((option) => (
          <Link
            key={option.value}
            href={`${basePath}?range=${option.value}`}
            className={option.value === activeRange ? "filter-chip filter-chip-active" : "filter-chip"}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
