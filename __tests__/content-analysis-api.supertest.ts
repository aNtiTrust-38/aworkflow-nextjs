import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import handler from '../pages/api/content-analysis';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

describe('/api/content-analysis endpoint (supertest)', () => {
  it('returns summaries, key points, download links, and research notes for uploaded files', async () => {
    // Create a test server for the handler
    const server = createServer((req, res) => handler(req as any, res as any));
    const request = supertest(server);
    // Use a real file from the filesystem (or create a dummy buffer)
    const pdfPath = path.join(__dirname, 'fixtures', 'test.pdf');
    const pdfBuffer = fs.existsSync(pdfPath) ? fs.readFileSync(pdfPath) : Buffer.from('dummy pdf content');
    const res = await request
      .post('/api/content-analysis')
      .attach('files', pdfBuffer, 'test.pdf');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.summaries)).toBe(true);
    expect(Array.isArray(res.body.keyPoints)).toBe(true);
    expect(Array.isArray(res.body.downloadLinks)).toBe(true);
    expect(typeof res.body.researchNotes).toBe('string');
    expect(res.body.summaries.length).toBeGreaterThan(0);
    expect(res.body.keyPoints.length).toBeGreaterThan(0);
    expect(res.body.downloadLinks.length).toBeGreaterThan(0);
    expect(res.body.researchNotes.length).toBeGreaterThan(0);
    server.close();
  });
}); 