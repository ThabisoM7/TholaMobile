import { Router } from 'express';
import multer from 'multer';
import { processVoiceQuery } from '../controllers/assistantController';

const router = Router();

// Configure multer for temporary audio file storage
const upload = multer({ dest: 'uploads/audio/' });

// Route for processing voice RAG queries
router.post('/voice-query', upload.single('audio'), processVoiceQuery);

export default router;
