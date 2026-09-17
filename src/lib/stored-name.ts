"use client";

/**
 * The display name, kept in localStorage and read through an external store.
 *
 * Reading it in an effect and calling setState would be a cascading render;
 * `useSyncExternalStore` gives React a server snapshot to hydrate against and a
 * subscription for afterwards, which is exactly what this is.
 */
const KEY = "quorum:name";
const listeners = new Set<() => void>();

let cached: string | null | undefined;

export const subscribeName = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const readName = (): string | null => {
    if (cached === undefined) {
        try {
            cached = window.localStorage.getItem(KEY);
        } catch {
            // Private windows can refuse storage; the room still works without it.
            cached = null;
        }
    }
    return cached;
};

/** What the server renders: nobody is named until the browser says so. */
export const readServerName = (): string | null => null;

export const writeName = (value: string) => {
    cached = value;
    try {
        window.localStorage.setItem(KEY, value);
    } catch {
        // Ignored for the same reason as above.
    }
    for (const listener of listeners) listener();
};
