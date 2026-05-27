import { Request, Response } from 'express';
import { lelapaService } from '../services/lelapaService';
import { ragService } from '../services/ragService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const processVoiceQuery = async (req: Request, res: Response) => {
  try {
    const file = req.file; // Assuming multer handles the upload
    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const sourceLang = req.body.language || 'zul'; // 'zul' for isiZulu or 'tsn' for Setswana
    const userLat = parseFloat(req.body.lat);
    const userLng = parseFloat(req.body.lng);

    // 1. ASR: Speech to Native Text
    const nativeText = await lelapaService.transcribeAudio(file.path);
    if (!nativeText) {
      return res.status(400).json({ error: 'Could not transcribe audio' });
    }

    // 2. Translate Native to English
    const englishQuery = await lelapaService.translateText(nativeText, sourceLang, 'eng');

    // 3. Extract Intent & Parameters
    const intent = await ragService.extractIntent(englishQuery);

    // 4. Generate Embedding for vector search
    let embeddingVector: number[] | null = null;
    if (intent.searchQuery) {
      embeddingVector = await ragService.generateEmbedding(intent.searchQuery);
    }

    // 5. Query Database (Supabase pgvector + PostGIS)
    // We construct a raw SQL query since Prisma's fluent API doesn't fully support PostGIS spatial combinations
    // with pgvector similarity out of the box in a single unified findMany.
    
    const maxDist = 5000; // 5km radius, typical for local township discovery
    
    // Base SQL using PostGIS ST_DistanceSphere for geospatial filtering
    let sqlQuery = `
      SELECT p.id, p.name, p.price, p.description, v.business_name, 
             v.address, ST_DistanceSphere(ST_MakePoint($1, $2), ST_MakePoint(v.longitude, v.latitude)) as distance
      FROM "Product" p
      JOIN "Vendor" v ON p.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [userLng, userLat];
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

    // Vector Similarity Search using pgvector (<=> operator for cosine distance)
    if (embeddingVector) {
      // Cast the embedding vector to a string format accepted by pgvector
      const embeddingStr = \`[\${embeddingVector.join(',')}]\`;
      sqlQuery += ` ORDER BY p.embedding <=> $${paramIndex}::vector LIMIT 5;`;
      params.push(embeddingStr);
    } else if (intent.needsLocation && !isNaN(userLat) && !isNaN(userLng)) {
      sqlQuery += ` ORDER BY distance ASC LIMIT 5;`;
    } else {
      sqlQuery += ` LIMIT 5;`;
    }

    const searchResults = await prisma.$queryRawUnsafe(sqlQuery, ...params);

    // 6. LLM Response Generation (English)
    const englishResponse = await ragService.generateResponse(englishQuery, searchResults as any[]);

    // 7. Translate English Response to Native
    const nativeResponse = await lelapaService.translateText(englishResponse, 'eng', sourceLang);

    // 8. Text to Speech (TTS) Native
    const audioUrl = await lelapaService.textToSpeech(nativeResponse, sourceLang);

    // Return the result
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
    console.error('Assistant Controller Error:', error);
    res.status(500).json({ error: 'Internal Server Error while processing voice query' });
  }
};
