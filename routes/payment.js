import express from 'express';
import { protect } from '../middleware/auth.js';
import { createCheckoutSession, handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;