const { z } = require('zod');

const registerSchema = z.object({
  name:  z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['viewer', 'analyst', 'admin']).optional()
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1)
});

module.exports = { registerSchema, loginSchema, refreshSchema };