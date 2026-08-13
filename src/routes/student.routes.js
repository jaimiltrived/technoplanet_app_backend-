import { Router } from 'express';
import { getDashboard, getNotifications, getScores, getScoreByEvent, getRankByEvent, getLeaderboardByEvent } from '../controllers/student-features.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Apply auth check to all routes in student domain
router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/notifications', getNotifications);
router.get('/scores', getScores);
router.get('/scores/:eventId', getScoreByEvent);
router.get('/rank/:eventId', getRankByEvent);
router.get('/leaderboard/:eventId', getLeaderboardByEvent);

export default router;
