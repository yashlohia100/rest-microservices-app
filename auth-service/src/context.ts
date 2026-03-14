import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  requestId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

function setContext(data: RequestContext, callback: () => void) {
  asyncLocalStorage.run(data, callback);
}

function getContext() {
  return asyncLocalStorage.getStore();
}

export { getContext, setContext };
export type { RequestContext };
