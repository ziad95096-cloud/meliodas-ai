import express from 'express';
import { protect } from '../middleware/auth.js';
import { getChats, getChatMessages, sendMessageStream, newChat } from '../controllers/chatController.js';

const router = express.Router();

router.use(protect);

router.get('/chats', getChats);
router.post('/new', newChat);
router.get('/chats/:chatId', getChatMessages);
router.post('/stream', sendMessageStream);

export default router;