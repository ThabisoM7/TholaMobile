const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

class RagService {
  async extractIntent(query) {
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

      return JSON.parse(responseContent);
    } catch (error) {
      console.error('LLM Intent Extraction Error:', error);
      return {
        targetCategory: null,
        maxPrice: null,
        needsLocation: true,
        searchQuery: query,
      };
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: text,
        config: {
          outputDimensionality: 768
        }
      });
      
      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) throw new Error('No embedding values returned');
      
      return embedding;
    } catch (error) {
      console.error('Embedding Generation Error:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async generateResponse(query, results, languageCode = 'eng') {
    const prompt = `
      You are Thola's helpful voice assistant. The user asked: "${query}".
      Here are the search results from the database: ${JSON.stringify(results)}.
      Generate a friendly, concise, and helpful response summarizing the best options. 
      Keep it short as it will be spoken back to the user via Text-to-Speech.
      IMPORTANT: You MUST write your final response fluently in the language corresponding to this ISO code: '${languageCode}' (e.g. 'zul' = Zulu, 'eng' = English, 'xho' = Xhosa).
      If the language is Zulu, make sure the grammar and phrasing are perfectly natural Zulu, even when mentioning English business names.
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

module.exports = {
  ragService: new RagService()
};
