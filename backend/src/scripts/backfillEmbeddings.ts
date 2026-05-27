import { PrismaClient } from '@prisma/client';
import { ragService } from '../services/ragService';

const prisma = new PrismaClient();

async function backfillEmbeddings() {
  console.log('Starting embedding backfill process...');
  
  try {
    // 1. Fetch all products that don't have an embedding yet
    // Since 'embedding' is an Unsupported("vector") type, we can't select it directly in Prisma's fluent API easily
    // We'll select all products, or we can use a raw query to find ones where embedding is null
    const products: any[] = await prisma.$queryRaw`SELECT id, name, description, category FROM "Product" WHERE embedding IS NULL`;
    
    console.log(`Found ${products.length} products needing embeddings.`);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const textToEmbed = `${product.name}. ${product.description || ''} Category: ${product.category}`;
      
      console.log(`[${i + 1}/${products.length}] Generating embedding for: ${product.name}`);
      
      try {
        // Generate the 768-dimensional embedding from Gemini
        const embedding = await ragService.generateEmbedding(textToEmbed);
        
        // Update the product using a raw SQL query because of the pgvector type
        const embeddingStr = `[${embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
          embeddingStr,
          product.id
        );
        
        // Respect rate limits - wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`Failed to generate embedding for product ${product.id}`, err);
      }
    }

    console.log('Backfill process complete!');
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillEmbeddings();
