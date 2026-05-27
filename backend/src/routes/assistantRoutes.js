const { Router } = require('express');
const multer = require('multer');
const { processVoiceQuery } = require('../controllers/assistantController');

const router = Router();
const upload = multer({ dest: 'uploads/audio/' });

router.post('/voice-query', upload.single('audio'), processVoiceQuery);

module.exports = router;
