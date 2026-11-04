/**
 * Fixed-window, in-memory rate limiter. Good enough for local development and a single
 * server process; serverless deployments need a shared store or platform-level limits.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: {
  limit: number;
  windowMs: number;
  now?: () => number;
}) {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    /** Records one request for `key` and returns whether it is allowed. */
    allow(key: string): boolean {
      const time = now();
      const current = windows.get(key);
      if (!current || time - current.start >= windowMs) {
        if (windows.size > 10_000) windows.clear(); // bound memory
        windows.set(key, { start: time, count: 1 });
        return true;
      }
      current.count++;
      return current.count <= limit;
    },
  };
}
