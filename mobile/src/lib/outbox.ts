import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Write queue for the workout session: the UI updates first, writes go out in order and survive a dead signal (gyms).
// Ops are dropped only when the server rejects them (error code); network failures stay queued and retry on the next flush.
type Op = { table: string; row: Record<string, unknown> } | { table: string; id: string; patch: Record<string, unknown> };
const KEY = 'outbox';
let queue: Op[] | null = null;
let running: Promise<void> | null = null;

export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const v = (Math.random() * 16) | 0;
    return (ch === 'x' ? v : (v & 3) | 8).toString(16);
  });

async function load() {
  if (!queue) queue = JSON.parse((await AsyncStorage.getItem(KEY).catch(() => null)) ?? '[]');
  return queue!;
}
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(queue)).catch(() => {});

export function flush(): Promise<void> {
  running ??= (async () => {
    try {
      const q = await load();
      while (q.length) {
        const op = q[0];
        const { error } = 'row' in op
          ? await supabase.from(op.table).insert(op.row)
          : await supabase.from(op.table).update(op.patch).eq('id', op.id);
        if (error && !error.code) break; // no code = network failure, try again later
        q.shift(); // done, or rejected for good (e.g. 23505 = already inserted)
        await save();
      }
    } finally { running = null; }
  })();
  return running;
}

export async function enqueue(op: Op) {
  (await load()).push(op);
  await save();
  flush();
}
