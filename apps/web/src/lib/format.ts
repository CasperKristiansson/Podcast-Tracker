export const formatNumber = (value: number): string =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0
  );

export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (hrs === 0 && secs > 0) parts.push(`${secs}s`);
  return parts.join(" ") || "0s";
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    const formatter = new Intl.RelativeTimeFormat(undefined, {
      numeric: "auto",
    });
    const now = Date.now();
    const target = new Date(iso).getTime();
    const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));
    return formatter.format(diffDays, "day");
  } catch {
    return iso;
  }
};
