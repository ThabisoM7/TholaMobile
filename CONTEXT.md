# Thola Application Context Document

## 1. Vision & Objective
Thola is a mobile-first marketplace aimed at transforming township commerce. It provides a structured, secure, and intuitive platform bridging the gap between local vendors and consumers. By prioritizing a clean user interface, localized discovery (maps), and robust security, Thola empowers small businesses to reach a wider audience and users to easily access local goods and services.

## 2. Core Architecture
The platform is built on a **Modular Monolith** architecture for the backend to ensure straightforward deployments while maintaining clear boundaries between features. The system is split into two primary repositories/folders:

- **Frontend App**: Built with Expo (React Native). It is strictly a mobile application designed for both iOS and Android. It focuses heavily on performance on low-end devices and a dynamic, modern aesthetic.
- **Backend API**: A Node.js/Express server that acts as the single source of truth. It handles all business logic, database transactions, and third-party integrations.

## 3. Key Functional Domains

### Authentication & Authorization
- **Role-Based Access Control (RBAC)**: Supports multiple roles including `User`, `Vendor`, and `Admin`.
- **Security**: Utilizes JSON Web Tokens (JWT) for stateless session management, bcrypt for password hashing, and express-validator for robust input sanitization to prevent injection attacks.

### Vendor Discovery & Maps
- **Map Integration**: Utilizes `react-native-maps` to display vendor locations on an interactive map. 
- **Location Services**: `expo-location` is used to get the user's current location and provide localized vendor recommendations and distances.

### Profiles & Product Catalogue
- **Profile Management**: Users and Vendors can manage extended data such as bios, profile pictures, and location data.
- **Product Management**: Vendors can upload and manage product catalogues, utilizing `multer` on the backend for handling image uploads.

### Vendor KYC (Know Your Customer)
- **Smile ID Integration**: Implements identity verification protocols to establish a trustworthy ecosystem, ensuring vendors are verified before they can actively sell on the platform.

## 4. Design & UX Philosophy
- **Mobile-First Accessibility**: Interfaces are built with React Native Paper, focusing on clear typography, accessible touch targets, and a premium "wow" factor.
- **State Management**: Zustand is utilized for a lightweight, fast, and scalable global state without the boilerplate of Redux.
- **Navigation**: Expo Router enables a file-based routing system, mimicking the intuitive structure of web frameworks like Next.js, allowing for deep linking and a smooth user flow.

## 5. Upcoming & Experimental Features
- **AI-Powered Search (RAG)**: Integration with ChromaDB, SentenceTransformers, and OpenAI to build a Retrieval-Augmented Generation (RAG) system. This will provide users with an interactive, intelligent chat interface to inquire about vendor products and services seamlessly.
- **Enhanced Security**: Ongoing audits, rate limiting, and stricter payload validations as part of Thola's security engineering protocols.

## 6. Development Workflow
- **Version Control**: Monorepo style tracking. The root directory is the Git repository.
- **Database**: PostgreSQL managed via Prisma. Prisma schemas define the single source of truth for the data model.
