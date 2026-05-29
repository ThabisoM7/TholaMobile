# AI Voice Assistant Implementation Context

This document provides a detailed, step-by-step walkthrough of how the Multilingual AI Voice Assistant feature was implemented in Thola. It is designed to help other developers understand the architecture, data flow, and services involved.

## Overview

The feature allows users to search for local township products and vendors using natural voice commands in their native languages (e.g., Zulu, Xhosa). The app transcribes the voice, translates it, extracts intent, searches the database using vector embeddings and geospatial data, and returns a natural language response along with the product listings.

### Core Technologies Used:
1. **Frontend**: React Native, Expo AV.
2. **Backend**: Node.js, Express, Prisma, PostgreSQL (with `pgvector` and PostGIS).
3. **AI Services**:
   - **Lelapa AI**: Used for African language Automatic Speech Recognition (ASR) and text translation.
   - **Google Gemini**: Used for Intent Extraction, Vector Embeddings, and Response Generation (RAG).

---

## 1. Frontend: Voice Capture and Transmission

### Components Involved:
- **`VoiceAssistantModal.tsx`**: The UI modal where the user interacts with the voice feature.
- **`audioService.ts`**: A dedicated service handling all device audio capabilities.

### Step-by-Step Flow:
1. **User Interaction**: The user opens the `VoiceAssistantModal`, selects their native language (e.g., Zulu), and holds the record button.
2. **Recording Setup (`audioService.ts`)**: 
   - Requests microphone permissions via `Audio.requestPermissionsAsync()`.
   - Sets the audio mode to allow recording, customized for platform-specific formats (AAC for Android, WAV for iOS).
   - Records the user's voice and saves it as a local file URI.
3. **Transmission**: Once recording stops, the `audioService.sendVoiceQuery` function packages the audio URI into a `FormData` object. It includes the `language` code, user's `lat`, and `lng`.
4. **API Call**: Sends a `POST` request to the backend at `/api/assistant/voice-query`.

---

## 2. Backend: The Processing Pipeline

The core logic resides in `assistantController.js` under the `processVoiceQuery` handler.

### Step-by-Step Flow:

#### Step 2.1: Transcription (Speech-to-Text)
The backend receives the multipart form data (handled by Multer). It calls the `lelapaService.transcribeAudio` method.
- **Action**: Sends the audio file to the Lelapa AI `/transcribe/sync` API.
- **Result**: Returns the transcribed text in the user's native language (`nativeText`).

#### Step 2.2: Translation
To process the query effectively with LLMs and perform searches, we translate the text to English.
- **Action**: Calls `lelapaService.translateText` using Lelapa's translation endpoint.
- **Result**: Returns an `englishQuery`.

#### Step 2.3: Intent Extraction
We need structured data from the unstructured text to query our database accurately.
- **Action**: Calls `ragService.extractIntent` which prompts **Gemini 2.5 Flash** to act as a data extractor.
- **Prompt Logic**: It asks the LLM to return a strictly formatted JSON object containing:
  - `targetCategory` (e.g., "food")
  - `maxPrice` (e.g., 50)
  - `needsLocation` (boolean, if they said "near me")
  - `searchQuery` (e.g., "vetkoek")
- **Result**: An `intent` object.

#### Step 2.4: Vector Embedding Generation
To perform a semantic search, we convert the core item they are looking for into a vector.
- **Action**: Calls `ragService.generateEmbedding` using the `gemini-embedding-2` model on the extracted `searchQuery`.
- **Result**: A 768-dimensional float array (`embeddingVector`).

#### Step 2.5: Hybrid Database Query Construction
The controller dynamically constructs a raw SQL query against the PostgreSQL database. This is a **hybrid search** combining spatial filters, exact match filters, and semantic vector similarity.
- **Filters Applied**:
  - **Distance**: If `needsLocation` is true, it uses PostGIS `ST_DistanceSphere` to limit results to within 5000 meters of the user's coordinates.
  - **Price**: Hard filter `WHERE p.price <= maxPrice`.
  - **Category**: Case-insensitive ILIKE match.
- **Sorting**: 
  - If an embedding was generated, it sorts using the `pgvector` cosine distance operator: `ORDER BY p.embedding <=> vector`.
  - Alternatively, it sorts by spatial distance.
- **Result**: Retrieves the top 5 matching `Product` records and their associated `Vendor` details.

#### Step 2.6: RAG Response Generation
We generate a personalized response based on the search results.
- **Action**: Calls `ragService.generateResponse`.
- **Prompt Logic**: Gemini 2.5 Flash is fed the original `englishQuery` and the JSON-stringified database `searchResults`. It is instructed to generate a concise, friendly summary of the options.
- **Crucial Rule**: The prompt strictly enforces that the LLM must generate the final response in the ISO language code initially provided by the user (`sourceLang`).
- **Result**: `nativeResponse` (a conversational response in Zulu, Xhosa, etc.).

#### Step 2.7: Text-to-Speech (TTS)
The final step is converting the conversational response back into audio.
- **Action**: Calls `lelapaService.textToSpeech`. *(Note: This is currently mocked in the service pending official Lelapa v1 TTS support, but the architecture is in place).*
- **Result**: An `audioUrl`.

---

## 3. Frontend: Delivery and Playback

1. The backend returns a JSON payload containing:
   - The query breakdown (`nativeText`, `englishQuery`, `intent`).
   - The response data (`text`, `audioUrl`).
   - The actual product listings (`results`).
2. The `VoiceAssistantModal` updates its state to display the text response and the product cards.
3. Automatically triggers `audioService.playAudio(data.response.audioUrl)` so the user hears the assistant speak back to them.

## Summary of File Responsibilities

- **`frontend/src/services/audioService.ts`**: Microphone access, platform-specific audio configuration, REST API formatting.
- **`backend/src/controllers/assistantController.js`**: Orchestrates the entire pipeline (STT -> Translate -> Intent -> Embed -> Hybrid DB Search -> LLM Gen -> TTS).
- **`backend/src/services/lelapaService.js`**: Axios wrapper for Lelapa API (ASR, Translation, TTS).
- **`backend/src/services/ragService.js`**: Wrapper for Google GenAI SDK (`@google/genai`), handles structured JSON extraction, embeddings, and prompt engineering for localized RAG.
