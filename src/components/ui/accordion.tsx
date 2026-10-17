"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface AccordionContextValue {
  expandedItems: string[];
  toggleItem: (value: string) => void;
  type: "single" | "multiple";
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion");
  }
  return context;
}

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
}

export function Accordion({
  type = "single",
  collapsible = true,
  value: controlledValue,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: AccordionProps) {
  const isControlled = controlledValue !== undefined;

  const [internalExpanded, setInternalExpanded] = React.useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const expandedItems = React.useMemo(() => {
    if (isControlled) {
      if (!controlledValue) return [];
      return Array.isArray(controlledValue) ? controlledValue : [controlledValue];
    }
    return internalExpanded;
  }, [isControlled, controlledValue, internalExpanded]);

  const toggleItem = React.useCallback(
    (itemValue: string) => {
      let nextExpanded: string[];

      if (type === "single") {
        const isCurrentOpen = expandedItems.includes(itemValue);
        if (isCurrentOpen) {
          nextExpanded = collapsible ? [] : [itemValue];
        } else {
          nextExpanded = [itemValue];
        }
      } else {
        const isCurrentOpen = expandedItems.includes(itemValue);
        if (isCurrentOpen) {
          nextExpanded = expandedItems.filter((v) => v !== itemValue);
        } else {
          nextExpanded = [...expandedItems, itemValue];
        }
      }

      if (!isControlled) {
        setInternalExpanded(nextExpanded);
      }

      if (onValueChange) {
        onValueChange(type === "single" ? (nextExpanded[0] || "") : nextExpanded);
      }
    },
    [type, collapsible, expandedItems, isControlled, onValueChange]
  );

  return (
    <AccordionContext.Provider value={{ expandedItems, toggleItem, type }}>
      <div className={cn("space-y-3", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
  id: string;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children, ...props }, ref) => {
    const { expandedItems } = useAccordionContext();
    const isOpen = expandedItems.includes(value);
    const id = React.useId();

    return (
      <AccordionItemContext.Provider value={{ value, isOpen, id }}>
        <div
          ref={ref}
          data-state={isOpen ? "open" : "closed"}
          className={cn(
            "rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md overflow-hidden transition-all duration-200 shadow-sm",
            isOpen && "border-gold-500/30 dark:border-gold-500/30 shadow-md",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

export interface AccordionTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  showChevron?: boolean;
}

export const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(({ className, children, showChevron = true, onClick, ...props }, ref) => {
  const { toggleItem } = useAccordionContext();
  const itemContext = React.useContext(AccordionItemContext);
  if (!itemContext) {
    throw new Error("AccordionTrigger must be used within an AccordionItem");
  }

  const { value, isOpen, id } = itemContext;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    toggleItem(value);
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      id={`accordion-trigger-${id}`}
      aria-controls={`accordion-content-${id}`}
      aria-expanded={isOpen}
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-between p-4 sm:p-5 text-left text-sm font-medium transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 cursor-pointer",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0 pr-3">{children}</div>
      {showChevron && (
        <div
          className={cn(
            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-border/60 bg-background/50 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-gold-500 border-gold-500/30 bg-gold-500/10"
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </div>
      )}
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

export type AccordionContentProps = React.HTMLAttributes<HTMLDivElement>;

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(({ className, children, ...props }, ref) => {
  const itemContext = React.useContext(AccordionItemContext);
  if (!itemContext) {
    throw new Error("AccordionContent must be used within an AccordionItem");
  }

  const { isOpen, id } = itemContext;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          id={`accordion-content-${id}`}
          role="region"
          aria-labelledby={`accordion-trigger-${id}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div
            ref={ref}
            className={cn(
              "px-4 sm:px-6 pb-5 pt-2 border-t border-border/50 text-xs text-muted-foreground",
              className
            )}
            {...props}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
AccordionContent.displayName = "AccordionContent";
