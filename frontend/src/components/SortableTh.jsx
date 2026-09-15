import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

/**
 * Reusable Sortable Table Header Component.
 * Displays column header with interactive ⇅, ↑, ↓ sorting icons.
 */
export default function SortableTh({
  columnKey,
  currentSortKey,
  currentSortDir,
  onSort,
  children,
  align = "left",
  disabled = false,
  style = {},
  className = "",
  ...props
}) {
  if (disabled || !columnKey || !onSort) {
    return (
      <th
        style={{
          textAlign: align,
          ...style,
        }}
        className={className}
        {...props}
      >
        {children}
      </th>
    );
  }

  const isCurrent = currentSortKey === columnKey;
  const isAsc = isCurrent && currentSortDir === "asc";
  const isDesc = isCurrent && currentSortDir === "desc";

  const getTitle = () => {
    if (!isCurrent || !currentSortDir) return "Click to sort: Newest first";
    if (isDesc) return "Click to sort: Oldest first";
    return "Click to reset to default order";
  };

  return (
    <th
      style={{
        textAlign: align,
        cursor: "pointer",
        userSelect: "none",
        transition: "background 0.15s ease",
        ...style,
      }}
      className={className}
      onClick={() => onSort(columnKey)}
      title={getTitle()}
      {...props}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          justifyContent:
            align === "right"
              ? "flex-end"
              : align === "center"
              ? "center"
              : "flex-start",
          width: "100%",
        }}
      >
        <span>{children}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            verticalAlign: "middle",
            lineHeight: 1,
          }}
        >
          {isAsc ? (
            <ArrowUp size={13} strokeWidth={2.4} style={{ color: "#1fa35a" }} />
          ) : isDesc ? (
            <ArrowDown size={13} strokeWidth={2.4} style={{ color: "#1fa35a" }} />
          ) : (
            <ArrowUpDown size={13} strokeWidth={1.8} style={{ opacity: 0.45 }} />
          )}
        </span>
      </div>
    </th>
  );
}
