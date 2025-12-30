const DEMO_MODE_KEY = "podcastTracker:demoMode";

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const isDemoMode = (): boolean => {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  return storage.getItem(DEMO_MODE_KEY) === "1";
};

export const enableDemoMode = (): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(DEMO_MODE_KEY, "1");
};

export const disableDemoMode = (): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(DEMO_MODE_KEY);
};
