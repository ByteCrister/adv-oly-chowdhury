"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
import { cn } from "@/lib/utils";
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
  triggerClassName?: string;
  isLoading?: boolean;
  renderItem?: (item: DropdownItem, isSelected: boolean) => React.ReactNode;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  isFlipped: boolean;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

const emptySubscribe = () => () => {};

function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
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
  triggerClassName = "",
  isLoading: externalLoading,
  renderItem,
}: ItemSelectProps) {
  const listboxId = React.useId();
  const mounted = useMounted();
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1);
  const [menuPosition, setMenuPosition] = React.useState<MenuPosition | null>(null);
  const [selectedItemState, setSelectedItemState] = React.useState<DropdownItem | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLDivElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const listboxRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

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

  // Find currently selected item (from allOptions or last remembered state)
  const selectedItem = React.useMemo(() => {
    if (!value) return null;
    return (
      allOptions.find((opt) => opt.id === value) ||
      (selectedItemState?.id === value ? selectedItemState : null)
    );
  }, [allOptions, value, selectedItemState]);

  // Active highlighted index (fallback to selected item or first item)
  const selectedIndex = React.useMemo(() => {
    return filteredOptions.findIndex((opt) => opt.id === value);
  }, [filteredOptions, value]);

  const activeHighlightedIndex =
    highlightedIndex >= 0
      ? highlightedIndex
      : selectedIndex >= 0
      ? selectedIndex
      : 0;

  // Calculate fixed viewport position for portal menu
  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger element has 0 width or height (e.g. unmounted/hidden)
    if (rect.width === 0 && rect.height === 0) return;

    // If the trigger has scrolled completely off screen, dismiss menu
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If not enough room below (less than 250px) and there's more room above, flip upwards
    const shouldFlip = spaceBelow < 250 && spaceAbove > spaceBelow;

    // Minimum width of 260px for readability, bounded by viewport width
    const menuWidth = Math.min(Math.max(rect.width, 260), viewportWidth - 24);

    // Keep menu within screen boundaries horizontally
    let left = rect.left;
    if (left + menuWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - menuWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    if (shouldFlip) {
      const availableHeight = Math.max(140, Math.min(360, spaceAbove - 16));
      setMenuPosition({
        bottom: viewportHeight - rect.top + 6,
        left,
        width: menuWidth,
        maxHeight: availableHeight,
        isFlipped: true,
      });
    } else {
      const availableHeight = Math.max(140, Math.min(360, spaceBelow - 16));
      setMenuPosition({
        top: rect.bottom + 6,
        left,
        width: menuWidth,
        maxHeight: availableHeight,
        isFlipped: false,
      });
    }
  }, []);

  // Update position on render when open
  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Sync position on scroll (capture across all scrollable containers) and window resize
  React.useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close helper that cleans up search and highlight state
  const handleClose = React.useCallback(() => {
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  }, []);

  // Close on outside click (checks both trigger/container and portal menu)
  React.useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        handleClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Handle escape key
  React.useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Focus search input when opened
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll active item into view when navigating with arrow keys
  React.useEffect(() => {
    if (activeHighlightedIndex >= 0 && listboxRef.current) {
      const optionElements = listboxRef.current.querySelectorAll<HTMLElement>('[role="option"]');
      const activeElement = optionElements[activeHighlightedIndex];
      if (activeElement && typeof activeElement.scrollIntoView === "function") {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeHighlightedIndex]);

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      setIsOpen(true);
    } else {
      handleClose();
    }
  };

  const handleSelect = React.useCallback(
    (item: DropdownItem) => {
      setSelectedItemState(item);
      onChange(item.id, item);
      setIsOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemState(null);
    onChange("", null);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      handleToggleOpen();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        activeHighlightedIndex >= 0 &&
        activeHighlightedIndex < filteredOptions.length
      ) {
        handleSelect(filteredOptions[activeHighlightedIndex]);
      }
    }
  };

  // Determine if a custom height (e.g. h-8, h-9.5) was passed in className
  const hasCustomHeight = Boolean(
    (className && /\bh-(?:8|9|10|11|12|\d+(\.\d+)?|\[.+?\])\b/.test(className)) ||
    (triggerClassName && /\bh-(?:8|9|10|11|12|\d+(\.\d+)?|\[.+?\])\b/.test(triggerClassName))
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", label ? "space-y-1.5" : "", className)}
    >
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
        ref={triggerRef}
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggleOpen}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "w-full px-3 py-1.5 rounded-xl border bg-background/80 dark:bg-card/60 flex items-center justify-between gap-2 text-xs transition-all cursor-pointer select-none",
          hasCustomHeight ? "h-full min-h-0" : "min-h-[38px]",
          className?.includes("rounded-") && "rounded-[inherit]",
          disabled ? "opacity-50 cursor-not-allowed bg-muted/40" : "hover:border-gold-500/50",
          error
            ? "border-destructive focus:ring-destructive/30"
            : isOpen
            ? "border-gold-500 ring-2 ring-gold-500/20 shadow-sm"
            : "border-input",
          triggerClassName
        )}
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
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen && "rotate-180 text-foreground"
            )}
          />
        </div>
      </div>

      {name && <input type="hidden" name={name} value={value} />}

      {/* Portal Dropdown Menu Panel: rendered directly to document.body with z-[9999] */}
      {mounted && isOpen && menuPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="presentation"
          style={{
            position: "fixed",
            left: `${menuPosition.left}px`,
            ...(menuPosition.top !== undefined
              ? { top: `${menuPosition.top}px` }
              : { bottom: `${menuPosition.bottom}px` }),
            width: `${menuPosition.width}px`,
            maxHeight: `${menuPosition.maxHeight}px`,
            zIndex: 9999,
          }}
          className={cn(
            "flex flex-col rounded-2xl border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden text-foreground",
            menuPosition.isFlipped
              ? "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150"
              : "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
          )}
        >
          {/* Search Box */}
          <div className="p-2.5 border-b border-border/50 bg-background/50 relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-input/60 bg-background/90 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setHighlightedIndex(0);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            className="flex-1 overflow-y-auto p-1.5 space-y-0.5 min-h-[60px]"
          >
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
              filteredOptions.map((item, index) => {
                const isSelected = item.id === value;
                const isHighlighted = index === activeHighlightedIndex;

                if (renderItem) {
                  return (
                    <div
                      key={item.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setHighlightedIndex(index)}
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
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 text-xs transition-colors cursor-pointer select-none",
                      isSelected
                        ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 font-semibold"
                        : isHighlighted
                        ? "bg-muted/80 text-foreground"
                        : "hover:bg-muted/70 text-foreground"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate">{item.name}</span>
                        {item.subText && (
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded text-[10px] font-mono shrink-0 border",
                              isSelected
                                ? "border-gold-500/30 bg-gold-500/10 text-gold-600 dark:text-gold-300"
                                : "border-border/60 bg-muted/60 text-muted-foreground"
                            )}
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
        </div>,
        document.body
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
