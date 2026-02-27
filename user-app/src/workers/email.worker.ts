import { Worker, Job } from 'bullmq';
import type { WelcomeEmailData } from '../queues/email.queue.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

const emailWorker = new Worker(
  'email',
  async (job: Job<WelcomeEmailData>) => {
    if (job.name === 'welcome-email') {
      const { name, email } = job.data;

      // TODO: Replace with actual email sending logic
      console.log(`[Email Worker] Sending welcome email to ${name} <${email}>`);
    }
  },
  { connection },
);

emailWorker.on('completed', (job) => {
  console.log(`[Email Worker] Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Email Worker] Job ${job?.id} failed:`, err.message);
});

export { emailWorker };
