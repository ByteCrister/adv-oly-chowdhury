"use client";

import * as React from "react";
import {
  Search,
  ChevronDown,
  X,
  Check,
  Loader2,
  Calendar,
} from "lucide-react";
import { useDropdownQuery } from "@/hooks/dropdowns";
import { useDebounce } from "@/hooks/ui";
import type { DropdownItem } from "@/types/dropdown.types";
import type { DropdownType } from "@/const/dropdown.const";

export interface ItemSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string, item?: DropdownItem | null) => void;
  /**
   * If provided, automatically fetches items using the unified dropdown API.
   */
  type?: DropdownType;
  filterParams?: {
    clientId?: string;
    courtId?: string;
  };
  /**
   * Direct options array (can be used with or without `type`).
   */
  options?: DropdownItem[];
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  className?: string;
  isLoading?: boolean;
  renderItem?: (item: DropdownItem, isSelected: boolean) => React.ReactNode;
}

export function ItemSelect({
  id,
  name,
  value,
  onChange,
  type,
  filterParams,
  options: externalOptions,
  label,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No matching items found.",
  error,
  helperText,
  disabled = false,
  required = false,
  clearable = true,
  className = "",
  isLoading: externalLoading,
  renderItem,
}: ItemSelectProps) {
  const listboxId = React.useId();
  const [isOpen, setIsOpen] = React.useState(false);
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  // Reset search term during render when closing
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setSearchTerm("");
    }
  }

  // Fetch options if type is provided
  const queryEnabled = Boolean(type);
  const { data: apiData, isLoading: queryLoading } = useDropdownQuery(
    {
      type: type!,
      clientId: filterParams?.clientId,
      courtId: filterParams?.courtId,
      search: debouncedSearchTerm.trim() || undefined,
    },
    {
      enabled: queryEnabled,
    }
  );

  const isLoading = externalLoading || (queryEnabled && queryLoading);

  // Combine external options and API options
  const allOptions = React.useMemo(() => {
    const list: DropdownItem[] = [];
    const seen = new Set<string>();

    if (apiData?.items) {
      for (const item of apiData.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      }
    }

    if (externalOptions) {
      for (const item of externalOptions) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      }
    }

    return list;
  }, [apiData, externalOptions]);

  // Client-side filtering when externalOptions are provided or as a secondary pass
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return allOptions;
    const term = searchTerm.toLowerCase().trim();
    return allOptions.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(term);
      const subMatch = item.subText?.toLowerCase().includes(term);
      return nameMatch || subMatch;
    });
  }, [allOptions, searchTerm]);

  // Find currently selected item
  const selectedItem = React.useMemo(() => {
    return allOptions.find((opt) => opt.id === value) || null;
  }, [allOptions, value]);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when opened
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelect = (item: DropdownItem) => {
    onChange(item.id, item);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", null);
  };

  return (
    <div ref={containerRef} className={`space-y-1.5 relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-foreground flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-destructive">*</span>}
          </span>
          {selectedItem?.subText && (
            <span className="text-[10px] text-muted-foreground font-normal truncate max-w-[200px]">
              {selectedItem.subText}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full min-h-[42px] px-3 py-2 rounded-xl border bg-background/80 dark:bg-card/60 flex items-center justify-between gap-2 text-xs transition-all cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed bg-muted/40" : "hover:border-gold-500/50"
        } ${
          error
            ? "border-destructive focus:ring-destructive/30"
            : isOpen
            ? "border-gold-500 ring-2 ring-gold-500/20 shadow-sm"
            : "border-input"
        }`}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {selectedItem ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-foreground truncate">
                {selectedItem.name}
              </span>
              {selectedItem.subText && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-muted text-muted-foreground shrink-0 border border-border/40">
                  {selectedItem.subText}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground/80 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-500" />}

          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-foreground" : ""
            }`}
          />
        </div>
      </div>

      {name && <input type="hidden" name={name} value={value} />}

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="p-2.5 border-b border-border/50 bg-background/50 relative">
            <Search className="w-3.5 h-3.5 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-input/60 bg-background/90 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div id={listboxId} role="listbox" className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {isLoading && filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
                <span>Loading options...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/80">{emptyMessage}</p>
                {searchTerm && (
                  <p className="text-[11px] text-muted-foreground/70">
                    No results for &ldquo;{searchTerm}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              filteredOptions.map((item) => {
                const isSelected = item.id === value;

                if (renderItem) {
                  return (
                    <div
                      key={item.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      className="cursor-pointer"
                    >
                      {renderItem(item, isSelected)}
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 text-xs transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 font-semibold"
                        : "hover:bg-muted/70 text-foreground"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate">{item.name}</span>
                        {item.subText && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono shrink-0 border ${
                              isSelected
                                ? "border-gold-500/30 bg-gold-500/10 text-gold-600 dark:text-gold-300"
                                : "border-border/60 bg-muted/60 text-muted-foreground"
                            }`}
                          >
                            {item.subText}
                          </span>
                        )}
                      </div>

                      {item.date && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground/60" />
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-gold-600 dark:text-gold-400 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Error or Helper Message */}
      {error ? (
        <p className="text-[11px] text-destructive font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

export default ItemSelect;
