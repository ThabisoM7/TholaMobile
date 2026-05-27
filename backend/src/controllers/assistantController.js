const { lelapaService } = require('../services/lelapaService');
const { ragService } = require('../services/ragService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const processVoiceQuery = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const sourceLang = req.body.language || 'zul';
    const userLat = parseFloat(req.body.lat);
    const userLng = parseFloat(req.body.lng);

    const nativeText = await lelapaService.transcribeAudio(file.path);
    if (!nativeText) {
      return res.status(400).json({ error: 'Could not transcribe audio' });
    }

    const englishQuery = await lelapaService.translateText(nativeText, sourceLang, 'eng');
    const intent = await ragService.extractIntent(englishQuery);

    let embeddingVector = null;
    if (intent.searchQuery) {
      embeddingVector = await ragService.generateEmbedding(intent.searchQuery);
    }
    
    const maxDist = 5000;
    let sqlQuery = `
      SELECT p.id, p.name, p.price, p.description, v.business_name, 
             v.address, ST_DistanceSphere(ST_MakePoint($1, $2), ST_MakePoint(v.longitude, v.latitude)) as distance
      FROM "Product" p
      JOIN "Vendor" v ON p.vendor_id = v.id
      WHERE 1=1
    `;
    const params = [userLng, userLat];
    let paramIndex = 3;

    if (intent.needsLocation && !isNaN(userLat) && !isNaN(userLng)) {
      sqlQuery += ` AND ST_DistanceSphere(ST_MakePoint($1, $2), ST_MakePoint(v.longitude, v.latitude)) <= ${maxDist}`;
    }

    if (intent.maxPrice) {
      sqlQuery += ` AND p.price <= $${paramIndex}`;
      params.push(intent.maxPrice);
      paramIndex++;
    }

    if (intent.targetCategory) {
      sqlQuery += ` AND p.category ILIKE $${paramIndex}`;
      params.push(`%${intent.targetCategory}%`);
      paramIndex++;
    }

    if (embeddingVector) {
      const embeddingStr = `[${embeddingVector.join(',')}]`;
      sqlQuery += ` ORDER BY p.embedding <=> $${paramIndex}::vector LIMIT 5;`;
      params.push(embeddingStr);
    } else if (intent.needsLocation && !isNaN(userLat) && !isNaN(userLng)) {
      sqlQuery += ` ORDER BY distance ASC LIMIT 5;`;
    } else {
      sqlQuery += ` LIMIT 5;`;
    }

    const searchResults = await prisma.$queryRawUnsafe(sqlQuery, ...params);

    const englishResponse = await ragService.generateResponse(englishQuery, searchResults);
    const nativeResponse = await lelapaService.translateText(englishResponse, 'eng', sourceLang);
    const audioUrl = await lelapaService.textToSpeech(nativeResponse, sourceLang);

    res.status(200).json({
      success: true,
      query: {
        native: nativeText,
        english: englishQuery,
        intent
      },
      response: {
        text: nativeResponse,
        englishText: englishResponse,
        audioUrl
      },
      results: searchResults
    });

    } catch (error) {
      console.error('Error processing voice query:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
};

module.exports = {
  processVoiceQuery
};
