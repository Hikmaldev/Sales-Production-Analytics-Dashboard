import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  DEFAULT_PRESET,
  computePresetRange,
  isDateRangePreset,
} from "../lib/date-range";
import type { DateRangePreset } from "../lib/date-range";

// The filter state that every chart, summary card, and export shares
// (PRD section 10.5, rule 2). It is kept for the whole session, so filters
// survive navigating to Admin and back, and a page refresh.
export interface DashboardFilters {
  preset: DateRangePreset;
  start: string;
  end: string;
  branchId: number | null;
  categoryId: number | null;
}

interface FilterSelection {
  preset: DateRangePreset;
  branchId: number | null;
  categoryId: number | null;
}

interface FiltersContextValue {
  filters: DashboardFilters;
  setPreset: (preset: DateRangePreset) => void;
  setBranchId: (branchId: number | null) => void;
  setCategoryId: (categoryId: number | null) => void;
  clearFilters: () => void;
}

const STORAGE_KEY = "sales-analytics.dashboard-filters";

const DEFAULT_SELECTION: FilterSelection = {
  preset: DEFAULT_PRESET,
  branchId: null,
  categoryId: null,
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

function readStoredSelection(): FilterSelection {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTION;

    const parsed = JSON.parse(raw) as Partial<FilterSelection>;
    return {
      preset: isDateRangePreset(parsed.preset) ? parsed.preset : DEFAULT_PRESET,
      branchId: typeof parsed.branchId === "number" ? parsed.branchId : null,
      categoryId:
        typeof parsed.categoryId === "number" ? parsed.categoryId : null,
    };
  } catch {
    return DEFAULT_SELECTION;
  }
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] =
    useState<FilterSelection>(readStoredSelection);

  const update = useCallback((patch: Partial<FilterSelection>) => {
    setSelection((previous) => {
      const next = { ...previous, ...patch };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Session storage can be unavailable; filters still work in memory.
      }
      return next;
    });
  }, []);

  const value = useMemo<FiltersContextValue>(() => {
    const { start, end } = computePresetRange(selection.preset);
    return {
      filters: { ...selection, start, end },
      setPreset: (preset) => update({ preset }),
      setBranchId: (branchId) => update({ branchId }),
      setCategoryId: (categoryId) => update({ categoryId }),
      clearFilters: () =>
        update({ preset: DEFAULT_PRESET, branchId: null, categoryId: null }),
    };
  }, [selection, update]);

  return (
    <FiltersContext.Provider value={value}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useDashboardFilters(): FiltersContextValue {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useDashboardFilters must be used within FiltersProvider.");
  }
  return context;
}
