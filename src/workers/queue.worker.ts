import { openQueue, claim, commit, fail } from '../core/queue';
let running = false;
let stopped = false;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
self.onmessage = async (message: MessageEvent) => {
  if (message.data.type !== 'start' || running) return;
  running = true;
  try {
    const db = await openQueue();
    // Three independent claim loops share atomic database transactions.
    const lane = async () => {
      while (!stopped) {
        const job = await claim(db);
        if (!job) {
          await pause(180);
          continue;
        }
        self.postMessage({ type: 'claimed', id: job.id, attempt: job.attempts });
        await pause(35 + (job.amount % 65));
        if (job.attempts <= job.failUntil) await fail(db, job.id, job.token);
        else await commit(db, job.id, job.token);
        self.postMessage({ type: 'changed' });
      }
    };
    await Promise.all([lane(), lane(), lane()]);
  } catch (error) {
    stopped = true;
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Worker failed.',
    });
  }
};
