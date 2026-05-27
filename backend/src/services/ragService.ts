import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export interface IntentExtraction {
  targetCategory: string | null;
  maxPrice: number | null;
  needsLocation: boolean;
  searchQuery: string | null;
}

export class RagService {
  /**
   * Extract intent from the translated English query.
   * For example: "Vendor selling food for under R100" -> { targetCategory: "food", maxPrice: 100, ... }
   */
  async extractIntent(query: string): Promise<IntentExtraction> {
    const prompt = `
      You are an AI assistant for a local vendor marketplace called Thola.
      Extract the user's intent from the following query. Return ONLY a JSON object with the following keys:
      - "targetCategory": The category of products they are looking for (e.g., "food", "clothing", "services"), or null if not specified.
      - "maxPrice": The maximum price in Rands (ZAR) they are willing to pay, as a number, or null if not specified.
      - "needsLocation": boolean, true if the user mentions "nearest", "nearby", "close to me", or asks for locations.
      - "searchQuery": A specific item they are looking for (e.g., "vetkoek", "shoes"), or null if general.

      Query: "${query}"
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseContent = response.text;
      if (!responseContent) throw new Error("No content from LLM");

      return JSON.parse(responseContent) as IntentExtraction;
    } catch (error) {
      console.error('LLM Intent Extraction Error:', error);
      // Fallback
      return {
        targetCategory: null,
        maxPrice: null,
        needsLocation: true, // safe default
        searchQuery: query,
      };
    }
  }

  /**
   * Generate an embedding vector for a given text using Gemini's embedding model.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });
      
      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) throw new Error('No embedding values returned');
      
      return embedding;
    } catch (error) {
      console.error('Embedding Generation Error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate a conversational response based on the search results.
   */
  async generateResponse(query: string, results: any[]): Promise<string> {
    const prompt = `
      You are Thola's helpful voice assistant. The user asked: "${query}".
      Here are the search results from the database: ${JSON.stringify(results)}.
      Generate a friendly, concise, and helpful response summarizing the best options. 
      Keep it short as it will be spoken back to the user via Text-to-Speech.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "I couldn't find anything matching your request right now.";
    } catch (error) {
      console.error('LLM Response Generation Error:', error);
      return "I'm having trouble processing your request at the moment. Please try again later.";
    }
  }
}

export const ragService = new RagService();
