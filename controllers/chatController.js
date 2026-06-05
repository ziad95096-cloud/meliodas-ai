import Chat from '../models/Chat.js';
import { streamGeminiResponse } from '../config/gemini.js';

export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch chats' });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.user.id });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    res.json(chat.messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

export const sendMessageStream = async (req, res) => {
  try {
    const { chatId, message } = req.body;
    let chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
    if (!chat) {
      chat = await Chat.create({ userId: req.user.id, messages: [] });
    }

    chat.messages.push({ role: 'user', content: message });
    await chat.save();

    const history = chat.messages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content,
    }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullAssistantReply = '';

    await streamGeminiResponse(history, message, (chunk) => {
      fullAssistantReply += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    chat.messages.push({ role: 'assistant', content: fullAssistantReply });
    await chat.save();

    res.write(`data: ${JSON.stringify({ done: true, chatId: chat._id })}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Streaming failed' });
  }
};

export const newChat = async (req, res) => {
  try {
    const chat = await Chat.create({ userId: req.user.id, title: 'New Chat' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create chat' });
  }
};