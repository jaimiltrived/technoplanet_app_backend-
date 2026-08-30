import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { UnauthorizedError, ForbiddenError } from '../utils/customErrors.js';

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Access token is missing or invalid'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'supersecretkey_rku_technoplanet_2026_dev',
      { algorithms: ['HS256'] }
    );

    // Verify user still exists and is not blocked
    let user = null;
    if (decoded.role === 'STUDENT') {
      user = await prisma.student.findUnique({
        where: { id: decoded.id },
        select: { id: true, blocked: true, blockedReason: true }
      });
    } else {
      user = await prisma.staff.findUnique({
        where: { id: decoded.id },
        select: { id: true, blocked: true, blockedReason: true }
      });
    }

    if (!user) {
      return next(new UnauthorizedError('User account no longer exists'));
    }

    if (user.blocked) {
      return next(new ForbiddenError(`Your account has been blocked: ${user.blockedReason || 'No reason provided'}`));
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return next(error);
    }
    return next(new UnauthorizedError('Invalid or expired access token'));
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};

export {
  authenticate,
  authorize
};
