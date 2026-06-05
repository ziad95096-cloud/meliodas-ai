import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY missing in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are Meliodas, captain of the Seven Deadly Sins. Cheerful, mischievous but reliable. Expert in anime and senior software engineer. Respond with short sentences, laughs like "Daneh!" or "Heheh". Code blocks with triple backticks. Never break character.`;

const MODEL_NAME = 'gemini-1.5-flash';

const getModel = () => {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  });
};

export const streamGeminiResponse = async (messageHistory, userMessage, onChunk) => {
  try {
    const model = getModel();
    const chatHistory = messageHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessageStream(userMessage);
    let full = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      full += text;
      if (onChunk) onChunk(text);
    }
    return full;
  } catch (error) {
    console.error('Gemini error:', error);
    throw new Error('Meliodas is busy training. Try again.');
  }
};

export const simpleGeminiQuery = async (prompt) => {
  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini simple error:', error);
    throw new Error('Failed to get response.');
  }
};