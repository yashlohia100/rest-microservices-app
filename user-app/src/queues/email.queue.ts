import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

const emailQueue = new Queue('email', { connection });

interface WelcomeEmailData {
  userId: string;
  name: string;
  email: string;
}

async function addWelcomeEmailJob(data: WelcomeEmailData) {
  await emailQueue.add('welcome-email', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export { emailQueue, addWelcomeEmailJob };
export type { WelcomeEmailData };
