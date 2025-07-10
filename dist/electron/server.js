"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
exports.stopServer = stopServer;
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const path_1 = require("path");
let app = null;
let server = null;
async function startServer(port = 3000) {
    try {
        const isDev = process.env.NODE_ENV === 'development';
        const nextAppDir = isDev ? process.cwd() : (0, path_1.join)(__dirname, '../..');
        // Initialize Next.js app
        app = (0, next_1.default)({
            dev: isDev,
            dir: nextAppDir,
            quiet: !isDev
        });
        const handle = app.getRequestHandler();
        await app.prepare();
        // Create HTTP server
        server = (0, http_1.createServer)(async (req, res) => {
            try {
                const parsedUrl = (0, url_1.parse)(req.url, true);
                await handle(req, res, parsedUrl);
            }
            catch (err) {
                console.error('Error occurred handling', req.url, err);
                res.statusCode = 500;
                res.end('Internal server error');
            }
        });
        // Start server
        await new Promise((resolve, reject) => {
            server.listen(port, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    console.log(`Next.js server ready on http://localhost:${port}`);
                    resolve();
                }
            });
        });
        return `http://localhost:${port}`;
    }
    catch (error) {
        console.error('Failed to start Next.js server:', error);
        throw error;
    }
}
async function stopServer() {
    if (server) {
        await new Promise((resolve) => {
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
