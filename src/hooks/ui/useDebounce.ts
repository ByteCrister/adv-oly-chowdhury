import * as React from "react";
import debounce, { type DebouncedFunction, type Options } from "debounce";

export type DebounceOptions = Options;
export type { DebouncedFunction };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any;

/**
 * Custom hook that creates a stable debounced callback using the `debounce` package.
 * Keeps the latest callback in a ref to avoid stale closures while maintaining a stable debounced function reference.
 * Automatically clears pending timers on component unmount.
 *
 * @param callback The function to debounce.
 * @param wait Delay in milliseconds (default: 300).
 * @param options Optional debounce configuration (e.g. `{ immediate: true }`).
 */
export function useDebounceCallback<F extends AnyFunction>(
  callback: F,
  wait: number = 300,
  options?: DebounceOptions
): DebouncedFunction<F> {
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = React.useMemo(() => {
    const fn = ((...args: Parameters<F>) => {
      return callbackRef.current(...args);
    }) as F;

    // The debounced function is invoked in event handlers/effects, not during render.
    // eslint-disable-next-line react-hooks/refs
    return debounce(fn, wait, options);
  }, [wait, options]);

  React.useEffect(() => {
    return () => {
      debounced.clear();
    };
  }, [debounced]);

  return debounced;
}

/**
 * Custom hook that debounces a rapidly changing value (e.g. search query).
 *
 * @param value The value to debounce.
 * @param wait Delay in milliseconds (default: 300).
 * @param options Optional debounce configuration.
 */
export function useDebounceValue<T>(
  value: T,
  wait: number = 300,
  options?: DebounceOptions
): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  const debouncedSetter = useDebounceCallback(
    (nextVal: T) => {
      setDebouncedValue(nextVal);
    },
    wait,
    options
  );

  React.useEffect(() => {
    debouncedSetter(value);
  }, [value, debouncedSetter]);

  return debouncedValue;
}

/**
 * Default alias: `useDebounce` as `useDebounceValue` for convenience,
 * while also exposing `useDebounceCallback`.
 */
export const useDebounce = useDebounceValue;
export default useDebounce;
