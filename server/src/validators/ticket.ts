import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z
    .string({ required_error: 'subject is required' })
    .trim()
    .min(1, 'subject is required')
    .max(200, 'subject must be at most 200 characters'),
  customer: z
    .string({ required_error: 'customer is required' })
    .trim()
    .min(1, 'customer is required')
    .max(100, 'customer must be at most 100 characters'),
  description: z
    .string({ required_error: 'description is required' })
    .trim()
    .min(1, 'description is required')
    .max(5000, 'description must be at most 5000 characters'),
  priority: z
    .enum(['Low', 'Medium', 'High', 'Urgent'])
    .optional()
    .default('Medium'),
  assignee_id: z.number().int().positive().nullable().optional(),
});

export const updateTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, 'subject cannot be empty')
    .max(200, 'subject must be at most 200 characters')
    .optional(),
  customer: z
    .string()
    .trim()
    .min(1, 'customer cannot be empty')
    .max(100, 'customer must be at most 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, 'description cannot be empty')
    .max(5000, 'description must be at most 5000 characters')
    .optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  status: z
    .enum(['Open', 'In Progress', 'Waiting on Customer', 'Resolved'])
    .optional(),
  assignee_id: z.number().int().positive().nullable().optional(),
});

export const createEntrySchema = z.object({
  type: z.enum(['reply', 'note']),
  content: z
    .string({ required_error: 'content is required' })
    .trim()
    .min(1, 'content is required')
    .max(10000, 'content must be at most 10000 characters'),
  author: z
    .string({ required_error: 'author is required' })
    .trim()
    .min(1, 'author is required')
    .max(100, 'author must be at most 100 characters'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateEntryInput = z.infer<typeof createEntrySchema>;

