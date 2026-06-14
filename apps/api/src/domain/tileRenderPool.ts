import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import * as os from 'node:os';
import type { TerrainSource } from './terrainRender.js';

const POOL_SIZE = Math.min(3, Math.max(1, os.cpus().length - 1));

interface PendingTask {
  msg: object;
  resolve: (buf: Buffer) => void;
  reject: (err: Error) => void;
}

let workers: Worker[] = [];
let workerBusy: boolean[] = [];
let currentVersion = '';
let taskQueue: PendingTask[] = [];
let nextId = 1;
const pending = new Map<number, { resolve: (buf: Buffer) => void; reject: (err: Error) => void }>();

function spawnWorker(src: TerrainSource): Worker {
  const workerPath = path.join(__dirname, 'tileRenderWorker.js');
  const w = new Worker(workerPath, { workerData: src });
  w.on('message', (msg: { id: number; buf?: Buffer; err?: string }) => {
    const task = pending.get(msg.id);
    if (!task) return;
    pending.delete(msg.id);

    const wi = workers.indexOf(w);
    workerBusy[wi] = false;
    if (msg.err) {
      task.reject(new Error(msg.err));
    } else {
      task.resolve(Buffer.from(msg.buf!));
    }
    drainQueue();
  });
  w.on('error', (err) => {
    // On fatal worker error, reject all tasks assigned to it and remove from pool
    const wi = workers.indexOf(w);
    if (wi >= 0) {
      workers.splice(wi, 1);
      workerBusy.splice(wi, 1);
    }
    for (const [id, t] of pending) {
      pending.delete(id);
      t.reject(err);
    }
    drainQueue();
  });
  return w;
}

function drainQueue() {
  while (taskQueue.length > 0) {
    const wi = workerBusy.indexOf(false);
    if (wi < 0) break;
    const task = taskQueue.shift()!;
    workerBusy[wi] = true;
    const id = nextId++;
    pending.set(id, { resolve: task.resolve, reject: task.reject });
    workers[wi].postMessage({ id, ...(task.msg as object) });
  }
}

export function ensurePool(src: TerrainSource): void {
  if (src.version === currentVersion && workers.length === POOL_SIZE) return;
  // Terminate existing workers (fire-and-forget; new workers are independent)
  for (const w of workers) w.terminate().catch(() => {});
  workers = [];
  workerBusy = [];
  pending.clear();
  taskQueue = [];
  currentVersion = src.version;
  for (let i = 0; i < POOL_SIZE; i++) {
    workers.push(spawnWorker(src));
    workerBusy.push(false);
  }
}

function dispatch(msg: object): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    taskQueue.push({ msg, resolve, reject });
    drainQueue();
  });
}

export function renderTile(z: number, x: number, y: number): Promise<Buffer> {
  return dispatch({ kind: 'tile', z, x, y });
}

export function renderOverview(variant: string): Promise<Buffer> {
  return dispatch({ kind: 'overview', variant });
}

export async function disposePool(): Promise<void> {
  const ws = workers.slice();
  workers = [];
  workerBusy = [];
  currentVersion = '';
  pending.clear();
  taskQueue = [];
  await Promise.all(ws.map(w => w.terminate().catch(() => {})));
}
