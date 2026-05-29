# Thola Marketplace App (V1)

Thola is a mobile-first, full-stack township commerce platform designed to connect users with local vendors. It features robust role-based authentication, a map interface for discovering local vendors, product catalog management, and seamless integration for vendor KYC.

## 🚀 Tech Stack

### Frontend (Mobile App)
- **Framework**: React Native with [Expo](https://expo.dev/) (Expo Router for navigation)
- **UI & Styling**: React Native Paper
- **State Management**: Zustand
- **Forms & Validation**: React Hook Form
- **Maps**: Mapbox (@rnmapbox/maps)
- **Hardware Integration**: Expo Camera, Expo Location, Expo Image Picker

### Backend (REST API)
- **Server**: Node.js with Express.js
- **Database ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens) & bcrypt
- **File Handling**: Multer
- **Validation**: express-validator
- **AI & NLP**: Google Gemini API (Intent Extraction, Embeddings) & Lelapa AI (African Language ASR & Translation)

## 📂 Project Structure

```text
TholaaAppv1/
├── frontend/             # Expo React Native App
│   ├── src/              # Application source code
│   ├── assets/           # Static assets (images, fonts)
│   ├── app.config.js     # Expo configuration
│   └── package.json      # Frontend dependencies
├── backend/              # Express API Server
│   ├── src/              # Server source code (controllers, routes, etc.)
│   ├── prisma/           # Prisma schema and migrations
│   └── package.json      # Backend dependencies
├── .gitignore            # Root gitignore
└── README.md             # This file
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- PostgreSQL (or your configured database for Prisma)
- Expo Go app on your physical device (or an iOS/Android emulator)

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Set up your `.env` file based on `.env.example` (Database URL, JWT Secret, etc.)
4. Run Prisma migrations: `npx prisma db push` (or `npx prisma migrate dev`)
5. Start the development server: `npm run dev`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Set up your `.env` file with your API URL.
4. Start the Expo development server: `npm start`
5. Scan the QR code with the Expo Go app on your phone, or press `i` / `a` to open in an emulator.

## 🆕 Version 1.5.0 - Vendor Events & Promotions System (Latest Release)

Version `v1.5.0` introduces a complete, high-fidelity township marketing feed and timeline system inside Thola, enabling vendors to share updates and widescreen promotional deal flyers:

- **📣 Events & Promotions Relational Database Integration**: Engineered the database migration (`schema.prisma`) mapping the `VendorPromotion` table to parent `Vendor` records in Supabase Postgres, supporting cascade deletions.
- **💻 Authenticated Route Guards**: Created private write routes (authenticated POST and DELETE methods) locked securely to authorized `VENDOR` accounts, alongside public feed resolving controllers.
- **🎨 Merchant Events Dashboard Console (`manage-business.tsx`)**: Created a dedicated launcher card to open the Promotions Workspace, featuring a dashed landscape flyer asset picker, uploader flows, and real-time deletion safety prompts.
- **🛒 Segmented Dual-Panel Customer View (`vendor/[id].tsx`)**: Engineered a premium, spring-loaded icon segmented button tab bar dividing details into:
  1. **Products listings (🛒)**: The catalog card grid.
  2. **Deals & News feed (📣)**: A social-style chronological timeline feed presenting merchant announcement cards and widescreen special deal flyers.
- **🛡️ DevSecOps Security Blueprint**: Established a production security logging, monitoring, and source-code analysis checklist mapped against OWASP Mobile and Web Top 10 guidelines.

## 🗺️ Version 1.5.2 - Mapbox Native Integration (Latest Release)

Version `v1.5.2` transitions the app from `react-native-maps` to `@rnmapbox/maps` to provide a highly customized, native Mapbox experience.
- **Removed Expo Go Limitations**: Transitioned the frontend project from Expo Go to an EAS Development Client to support custom native modules.
- **Custom Mapbox Styling**: Integrated custom Mapbox styles across the platform (`map.tsx`, `vendor-registration.tsx`, `manage-business.tsx`).
- **Security & Build Integrity**: Abstracted Mapbox API Keys (Public and Secret Download Tokens) to environment variables, securing the EAS build pipeline and removing hardcoded secrets from source control.
- **Appetize.io Testing Pipeline**: Configured `eas.json` with simulator flags to support QA testing of both Android APKs and iOS `.tar.gz` Simulator builds on Appetize.io without requiring local emulators.

## 🤖 Version 1.6.0 - Multilingual AI Voice Assistant (Latest Release)

Version `v1.6.0` introduces a powerful AI-driven voice assistant tailored for South African users, breaking down language barriers in local commerce:

- **🌍 African Language Support (Lelapa AI)**: Integrated Lelapa AI for highly accurate audio transcription (ASR) of local languages and seamless text translation.
- **🧠 Intelligent Intent Extraction & RAG (Google Gemini)**: Leveraged Google Gemini (`gemini-2.5-flash` and `gemini-embedding-2`) to extract structured search intent (category, price, location) from natural language queries and generate vector embeddings.
- **🗣️ Voice-First Search**: Users can now search for vendors and products using natural voice queries in their native language (e.g., Zulu, Xhosa, English), with the system generating context-aware, translated conversational responses.
