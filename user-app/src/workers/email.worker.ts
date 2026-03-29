import { Job, Worker } from 'bullmq';
import { logger } from '../logger.js';
import type { WelcomeEmailData } from '../queues/email.queue.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

const emailWorker = new Worker(
  'email',
  async (job: Job<WelcomeEmailData>) => {
    logger.debug(
      { jobId: job.id, jobName: job.name },
      'Email worker picked up job',
    );

    if (job.name === 'welcome-email') {
      const { name, email } = job.data;

      // TODO: Replace with actual email sending logic
      logger.info({ jobId: job.id, email, name }, 'Sending welcome email');
    }
  },
  { connection },
);

emailWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Email worker job completed');
});

emailWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'Email worker job failed');
});

export { emailWorker };
