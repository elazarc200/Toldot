import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * Runs Playwright visual audit against a live map server.
 * Set MAP_VISUAL_PORT (default 3004) to a production server started via `npm run build && npm run start`.
 */
describe('map visual regression (Playwright)', () => {
  it('pins, labels, hover card, and detail panel are human-visible', () => {
    const port = process.env.MAP_VISUAL_PORT || '3004';
    const script = path.join(process.cwd(), 'scripts/visual-map-audit.cjs');
    let stdout = '';
    try {
      stdout = execFileSync(process.execPath, [script, port], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0' },
      });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; status?: number };
      throw new Error(
        `visual-map-audit failed (port ${port}):\n${e.stdout || ''}\n${e.stderr || ''}`,
      );
    }
    const summary = JSON.parse(stdout) as { checks: Record<string, boolean> };
    for (const [name, ok] of Object.entries(summary.checks)) {
      expect(ok, `visual check failed: ${name}`).toBe(true);
    }
  }, 120_000);
});
