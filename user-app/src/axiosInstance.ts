import axios from 'axios';
import { getContext } from './context.js';

const axiosInstance = axios.create();

axiosInstance.interceptors.request.use((config) => {
  const ctx = getContext();
  if (ctx?.requestId) {
    config.headers['x-request-id'] = ctx.requestId;
  }
  return config;
});

export { axiosInstance };
