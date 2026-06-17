const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { processIngestJob } = require('./dataIngestion');
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker('ingestion', processIngestJob, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} completed with result:`, job.returnvalue);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log('Worker started, waiting for jobs...');


