import { AppError } from '../utils/customErrors.js';
import { ZodError } from 'zod';

const errorHandler = (
  err,
  req,
  res,
  next
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Handle Zod Validation Error
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // Handle Prisma Known Errors (like P2002 for unique constraint)
  else if (err.code && err.code.startsWith('P')) {
    const prismaErr = err;
    if (prismaErr.code === 'P2002') {
      statusCode = 409;
      const targets = prismaErr.meta?.target || 'field';
      message = `Conflict: A record with this unique value for ${targets} already exists.`;
    } else if (prismaErr.code === 'P2025') {
      statusCode = 404;
      message = prismaErr.meta?.cause || 'Record not found.';
    } else if (prismaErr.code === 'P2003') {
      statusCode = 400;
      message = `Foreign key constraint failed on ${prismaErr.meta?.field_name || 'relation'}.`;
    } else {
      statusCode = 400;
      message = 'Database Operation Error';
      details = prismaErr.message;
    }
  } else {
    // Log unexpected errors
    console.error('Unhandled Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

export {
  errorHandler
};
