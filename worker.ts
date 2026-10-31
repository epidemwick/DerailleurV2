import { onRequest } from './functions/api/[[route]]';

export interface WorkerEnv {
  ADMIN_PASSWORD?: string;
  ADMIN_PASSWORD_HASH?: string;
  EPIDOS_KV?: {
    get(key: string, type?: 'json' | 'text'): Promise<any>;
    put(key: string, value: string): Promise<void>;
  };
  AI?: {
    run(model: string, input: any): Promise<any>;
  };
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    // Route all /api/* requests to our ePidOS backend handler
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return onRequest({
        request,
        env,
        params: {}
      });
    }

    // Serve static frontend assets built into ./dist
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
