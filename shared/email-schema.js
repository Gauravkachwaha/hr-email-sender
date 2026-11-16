import { z } from 'zod';
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export const emailSchema = z.object({
  recipient: z.string().max(254).regex(/^[^\r\n,;]+$/, 'Enter one email address.').pipe(z.email('Enter a valid email address.')),
  subject: z.string().regex(/^[^\r\n]*$/, 'Subject must be a single line.').trim().min(1, 'Enter a subject.').max(200),
  content: z.string().min(1).max(20000).refine(value => value.trim().length > 0, 'Enter email content.'),
}).strict();
