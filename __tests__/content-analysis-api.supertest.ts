import { testApiHandler } from 'next-test-api-route-handler';
import { describe, it, expect } from 'vitest';
import * as pagesHandler from '../pages/api/content-analysis';

describe('/api/content-analysis', () => {
  it('handles file uploads correctly', async () => {
    await testApiHandler({
      pagesHandler,
      test: async ({ fetch }) => {
        const formData = new FormData();
        formData.append('files', new File(['dummy pdf content'], 'test.pdf'));
        console.log('About to send fetch');
        let res;
        try {
          res = await fetch({
            method: 'POST',
            body: formData
          });
          console.log('Fetch returned, status:', res.status);
        } catch (err) {
          console.error('Fetch error:', err);
          throw err;
        }
        expect(res.status).toBe(200);
        let data;
        try {
          data = await res.json();
          console.log('Response JSON:', data);
        } catch (err) {
          console.error('JSON parse error:', err);
          throw err;
        }
        expect(data.summaries).toBeDefined();
        expect(data.keyPoints).toBeDefined();
        expect(data.downloadLinks).toBeDefined();
        expect(data.researchNotes).toBeDefined();
      }
    });
  }, 20000);
}); 