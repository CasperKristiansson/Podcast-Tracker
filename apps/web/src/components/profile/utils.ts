export const navigateToShow = (showId: string): void => {
  if (!showId) return;
  if (typeof window === "undefined") return;
  const encodedId = encodeURIComponent(showId);
  window.location.href = `/show?id=${encodedId}`;
};
