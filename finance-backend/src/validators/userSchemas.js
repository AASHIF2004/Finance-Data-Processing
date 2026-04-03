const { z } = require('zod');

const updateUserSchema = z.object({
  name:   z.string().min(2).max(100).optional(),
  email:  z.string().email().optional(),
  role:   z.enum(['viewer', 'analyst', 'admin']).optional(),
  status: z.enum(['active', 'inactive']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required'
});

module.exports = { updateUserSchema };