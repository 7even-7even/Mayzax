/**
 * BullMQ queue factory with graceful fallback to node-cron when Redis is unavailable.
 *
 * The reminder system uses named jobs. If REDIS_URL is configured we use BullMQ
 * (durable, survives restarts); otherwise we fall back to an in-process
 * node-cron scheduler that is best-effort and resets on restart (dev mode).
 */
import { env } from '@/config/env';
import { logger } from './logger';

export type JobHandler<T = unknown> = (payload: T) => Promise<void>;

interface QueueBackend {
  add<T>(name: string, data: T, opts?: { delay?: number }): Promise<void>;
  process<T>(name: string, handler: JobHandler<T>): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

class BullMQBackend implements QueueBackend {
  private connection: any;
  private queues: Map<string, any> = new Map();
  private workers: Map<string, any> = new Map();

  async start() {
    const { Queue, Worker } = await import('bullmq');
    const Redis = (await import('ioredis')) as any;
    const RedisCtor = Redis.default ?? Redis;
    const url = env.REDIS_URL!;
    this.connection = new RedisCtor(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    if (typeof this.connection.on === 'function') {
      this.connection.on('error', (err: Error) => {
        logger.error({ err }, 'Redis connection error');
      });
    }
    logger.info({ backend: 'bullmq' }, 'Queue subsystem initialized (BullMQ + Redis)');
    // Expose constructors for add/process
    (this as any)._Queue = Queue;
    (this as any)._Worker = Worker;
  }

  async add<T>(name: string, data: T, opts?: { delay?: number }) {
    const Queue = (this as any)._Queue;
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: this.connection, defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 500 } });
      this.queues.set(name, queue);
    }
    await queue.add(name, data ?? {}, opts ?? {});
  }

  async process<T>(name: string, handler: JobHandler<T>) {
    const Worker = (this as any)._Worker;
    if (this.workers.has(name)) return;
    const worker = new Worker(
      name,
      async (job: any) => {
        try {
          await handler(job.data as T);
        } catch (err) {
          logger.error({ err, jobName: name, jobId: job.id }, 'Job handler failed');
          throw err;
        }
      },
      { connection: this.connection, concurrency: 4 },
    );
    this.workers.set(name, worker);
  }

  async stop() {
    for (const w of this.workers.values()) {
      try { await w.close(); } catch { /* ignore */ }
    }
    for (const q of this.queues.values()) {
      try { await q.close(); } catch { /* ignore */ }
    }
    try { this.connection?.disconnect?.(); } catch { /* ignore */ }
  }
}

class NodeCronBackend implements QueueBackend {
  private handlers: Map<string, JobHandler<any>> = new Map();
  private scheduled: any[] = [];

  async start() {
    logger.warn({ backend: 'node-cron' }, 'REDIS_URL not set — using in-memory node-cron scheduler (dev only)');
  }

  async add<T>(name: string, data: T, opts?: { delay?: number }) {
    const run = () => {
      const h = this.handlers.get(name);
      if (h) h(data).catch((e) => logger.error({ err: e, jobName: name }, 'Scheduled job failed (node-cron)'));
    };
    if (opts?.delay && opts.delay > 0) {
      const t = setTimeout(run, opts.delay);
      if (typeof t.unref === 'function') t.unref();
      this.scheduled.push(t);
    } else {
      run();
    }
  }

  async process<T>(name: string, handler: JobHandler<T>) {
    this.handlers.set(name, handler);
  }

  async stop() {
    for (const t of this.scheduled) clearTimeout(t);
    this.scheduled = [];
  }
}

let backend: QueueBackend | null = null;

export async function getQueue(): Promise<QueueBackend> {
  if (backend) return backend;
  if (env.REDIS_URL) {
    backend = new BullMQBackend();
  } else {
    backend = new NodeCronBackend();
  }
  await backend.start();
  return backend;
}

export async function enqueue<T>(name: string, data: T, opts?: { delay?: number }) {
  const q = await getQueue();
  await q.add(name, data, opts);
}

export async function registerProcessor<T>(name: string, handler: JobHandler<T>) {
  const q = await getQueue();
  q.process(name, handler);
}

export async function stopQueue() {
  if (backend) {
    await backend.stop();
    backend = null;
  }
}

// Known job names (centralized to avoid typos)
export const Jobs = {
  BreakReminder: 'reminder:break',
  ShiftEndReminder: 'reminder:shift-end',
  DispatchNotification: 'notification:dispatch',
  RollupAttendanceDay: 'attendance:rollup-day',
  RollupAllToday: 'attendance:rollup-all',
} as const;
