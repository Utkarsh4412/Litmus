import { act } from 'react';
import { vi } from 'vitest';

/** Retry a DOM/query condition while allowing React's scheduled work to commit. */
export async function waitForRendered(check: () => boolean) {
  await vi.waitFor(async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    if (!check()) throw new Error('Rendered condition not ready');
  }, { timeout: 3000, interval: 20 });
}
