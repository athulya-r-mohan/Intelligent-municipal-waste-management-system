/**
 * Universal table sorting helper
 * Handles natural string sorting, numeric comparison, and date comparison.
 */

/**
 * Cycle through sort directions:
 * 1st click: 'desc' (Newest / Largest -> icon ↓)
 * 2nd click: 'asc'  (Oldest / Smallest -> icon ↑)
 * 3rd click: null   (Default/Natural order -> icon ⇅)
 */
export const getNextSortDirection = (currentKey, targetKey, currentDir) => {
  if (currentKey !== targetKey || !currentDir) {
    return "desc";
  }
  if (currentDir === "desc") return "asc";
  if (currentDir === "asc") return null;
  return "desc";
};

/**
 * Clean & parse a value for comparison
 */
const parseComparableValue = (val) => {
  if (val === null || val === undefined) return "";

  if (val instanceof Date) {
    return val.getTime();
  }

  if (typeof val === "number") return val;

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return "";

    // Check if it's a date string (e.g. "2026-09-08", "2026-09-08T12:00:00Z", "Sep 8, 2026", "08/09/2026")
    const isDatePattern =
      /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(trimmed) ||
      /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(trimmed) ||
      /^[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}/i.test(trimmed) ||
      /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}/i.test(trimmed) ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed);

    if (isDatePattern) {
      const parsedDate = Date.parse(trimmed);
      if (!isNaN(parsedDate)) {
        return parsedDate;
      }
    }

    // Check if it's a numeric string (e.g. "123", "₹50.00", "12.5 kg", "#42")
    const cleanNum = trimmed.replace(/^[^\d.-]+/, "").replace(/[^\d.-]+$/, "");
    if (cleanNum && !isNaN(Number(cleanNum))) {
      return Number(cleanNum);
    }

    return trimmed.toLowerCase();
  }

  return val;
};

/**
 * Sorts an array of objects based on sortKey, sortDir, and optional value accessor.
 */
export const sortTableData = (data, sortKey, sortDir, customGetters = {}) => {
  if (!Array.isArray(data)) return [];
  if (!sortKey || !sortDir) return [...data];

  const getter = customGetters[sortKey] || ((item) => item?.[sortKey]);

  return [...data].sort((a, b) => {
    const rawA = getter(a);
    const rawB = getter(b);

    const valA = parseComparableValue(rawA);
    const valB = parseComparableValue(rawB);

    // Empty / null values always go to the bottom regardless of sortDir
    const aEmpty = valA === "" || valA === null || valA === undefined;
    const bEmpty = valB === "" || valB === null || valB === undefined;

    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    let comparison = 0;

    if (typeof valA === "number" && typeof valB === "number") {
      comparison = valA - valB;
    } else if (typeof valA === "string" && typeof valB === "string") {
      comparison = valA.localeCompare(valB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    } else {
      comparison = String(valA).localeCompare(String(valB), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    return sortDir === "desc" ? -comparison : comparison;
  });
};
