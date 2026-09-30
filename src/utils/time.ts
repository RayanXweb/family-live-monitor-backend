export const now = (): Date => new Date();
export const addSeconds = (d: Date, s: number): Date => new Date(d.getTime() + s * 1000);
export const isExpired = (d: Date | null | undefined, ref: Date = new Date()): boolean =>
  !!d && d.getTime() <= ref.getTime();
