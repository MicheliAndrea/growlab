"use client";

import * as React from "react";

const storagePrefix = "growlab:";

export function usePersistentStringState(key: string, defaultValue: string) {
  const storageKey = `${storagePrefix}${key}`;
  const hydratedRef = React.useRef(false);
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    const storedValue = window.localStorage.getItem(storageKey);

    hydratedRef.current = true;
    if (storedValue !== null) {
      setValue(storedValue);
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    if (value === defaultValue) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, value);
  }, [defaultValue, storageKey, value]);

  return [value, setValue] as const;
}
