// Norwegian month name -> 0-11 index helper
export function norskMonthNameToIndex(name: string): number | null {
  if (!name) return null;
  const n = name.toLowerCase();
  const map: Record<string, number> = {
    januar: 0,
    februar: 1,
    mars: 2,
    april: 3,
    mai: 4,
    juni: 5,
    juli: 6,
    august: 7,
    september: 8,
    oktober: 9,
    november: 10,
    desember: 11,
  };
  return map[n] ?? null;
}

// Month index -> Norwegian month name
export function norskMonthIndexToName(idx: number): string {
  const list = [
    'Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'
  ];
  return list[((idx % 12) + 12) % 12];
}
