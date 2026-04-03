const { z } = require('zod');

const createRecordSchema = z.object({
  amount:   z.number().positive(),
  type:     z.enum(['income', 'expense']),
  category: z.string().min(1).max(100),
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes:    z.string().max(500).optional()
});

const updateRecordSchema = createRecordSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

const filterRecordSchema = z.object({
  type:       z.enum(['income', 'expense']).optional(),
  category:   z.string().optional(),
  date_from:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
  sort_by:    z.enum(['date', 'amount', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

module.exports = { createRecordSchema, updateRecordSchema, filterRecordSchema };