import { z } from 'zod';

/**
 * Express middleware factory for Zod validation.
 * Validates req.body, req.params, and/or req.query against provided schemas.
 *
 * @param {{ body?: z.ZodSchema, params?: z.ZodSchema, query?: z.ZodSchema }} schemas
 * @returns {import('express').RequestHandler}
 *
 * Usage:
 *   router.post('/events', validate({ body: createEventSchema }), createEvent);
 *   router.get('/events/:id', validate({ params: cuidParamSchema }), getEvent);
 */
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    next();
  } catch (error) {
    // ZodError will be caught by the global errorHandler
    next(error);
  }
};

export { validate };
