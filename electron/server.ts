import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { join } from 'path';

let app: any = null;
let server: any = null;

export async function startServer(port: number = 3000): Promise<string> {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const nextAppDir = isDev ? process.cwd() : join(__dirname, '../..');
    
    // Initialize Next.js app
    app = next({
      dev: isDev,
      dir: nextAppDir,
      quiet: !isDev
    });

    const handle = app.getRequestHandler();
    await app.prepare();

    // Create HTTP server
    server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('Internal server error');
      }
    });

    // Start server
    await new Promise<void>((resolve, reject) => {
      server.listen(port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Next.js server ready on http://localhost:${port}`);
          resolve();
        }
      });
    });

    return `http://localhost:${port}`;
  } catch (error) {
    console.error('Failed to start Next.js server:', error);
    throw error;
  }
}

export async function stopServer(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('Next.js server stopped');
        resolve();
      });
    });
    server = null;
  }
  
  if (app) {
    await app.close();
    app = null;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await stopServer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await stopServer();
  process.exit(0);
});