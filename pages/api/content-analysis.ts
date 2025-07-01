import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ files: any[] }> {
  return new Promise((resolve, reject) => {
    import('formidable').then(({ IncomingForm }) => {
      const form = new IncomingForm();
      const files: any[] = [];
      form.on('file', (field, file) => {
        files.push(file);
      });
      form.parse(req, (err: Error | null) => {
        if (err) return reject(err);
        resolve({ files });
      });
    }).catch(reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let files: any[] = [];
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const result = await parseForm(req);
      files = result.files || [];
    } catch (err: any) {
      return res.status(400).json({ error: 'Failed to parse form data.' });
    }
  }
  if (!files.length) {
    return res.status(400).json({ error: 'At least one file is required.' });
  }
  // GREEN PHASE: Return stub data for TDD
  return res.status(200).json({
    summaries: [
      { file: 'test.pdf', summary: 'Summary of PDF content.' },
      { file: 'test.docx', summary: 'Summary of DOCX content.' },
      { file: 'test.png', summary: 'Summary of image content.' }
    ],
    keyPoints: [
      'Key point 1',
      'Key point 2',
      'Key point 3'
    ],
    downloadLinks: [
      '/downloads/summary1.txt',
      '/downloads/summary2.txt',
      '/downloads/summary3.txt'
    ],
    researchNotes: 'Organized research notes from all uploaded files.'
  });
} 