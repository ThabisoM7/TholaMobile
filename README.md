# Thola Marketplace App (V1)

Thola is a mobile-first, full-stack township commerce platform designed to connect users with local vendors. It features robust role-based authentication, a map interface for discovering local vendors, product catalog management, and seamless integration for vendor KYC.

## 🚀 Tech Stack

### Frontend (Mobile App)
- **Framework**: React Native with [Expo](https://expo.dev/) (Expo Router for navigation)
- **UI & Styling**: React Native Paper
- **State Management**: Zustand
- **Forms & Validation**: React Hook Form
- **Maps**: React Native Maps
- **Hardware Integration**: Expo Camera, Expo Location, Expo Image Picker

### Backend (REST API)
- **Server**: Node.js with Express.js
- **Database ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens) & bcrypt
- **File Handling**: Multer
- **Validation**: express-validator

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

## 🆕 Version 1.2.5 - Vendor Console & Location Autocomplete Upgrades

Version `v1.2.5` introduces a massive, premium overhaul to the vendor management portal, search autocomplete geocoding, and client-server synchronization:

- **📍 Photon Autocomplete Search Pinner**: Replaced legacy OSM geocoding with a blazing-fast, debounced Photon Komoot geocoding system, preventing rate-limiting blocks and auto-populating townships/street addresses inside forms.
- **💼 Dual-Option Launcher Console**: Re-engineered the "Manage Business" page into a sleek master dashboard launcher dividing operations into **Edit Business Profile** and **View Inventory / Catalog**.
- **🖼️ Brand Assets (Logos & Covers)**: Enabled logo and 16:9 widescreen cover banner picks and uploads directly to Supabase storage, with direct Prisma DB integration.
- **🗃️ Real-Time Navigation Focus Invalidation**: Swapped static page-load mounts with reactive `useFocusEffect` listeners on both the consumer **Map Page** and **Vendor Dashboard**, instantly rendering updates (like coordinates or deleted products) in real-time.

## 🏷️ Versioning

- **v1.0.0**: Clean initial release state.
- **v1.2.0**: Core vendor portal modifications.
- **v1.2.5** (Current): Vendor dashboard menu, Photon geocoding autocomplete, Supabase brand asset uploading, and navigation sync.

