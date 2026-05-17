# 📋 Thola App - Session Changelog & Architectural Summary

This document serves as a comprehensive developer log tracking the major features, database modifications, and client-server sync architectures implemented during this pairing session.

---

## 🌟 Major Features Added

### 1. 📍 Smart Places Autocomplete & Geocoding Autopopulator
*   **Photon Komoot Engine**: Integrated Photon (a high-performance, open-source geocoding autocomplete engine built on OpenStreetMap) to handle location searching. This replaced the public Nominatim instance, yielding **blazing-fast response times** and removing standard rate limits.
*   **Typing Debounce Protection**: Added a custom `400ms` keystroke debounce hook inside the search triggers. This prevents rapid query hammering, saving device battery and preventing API rate blocks (`HTTP 429 Too Many Requests`).
*   **South African Bounding Box Focus**: Anchored suggestions inside South African coordinates (`bbox=16.45,-34.83,32.89,-22.12`) to prioritize local suburbs, streets, and townships (e.g., Menlyn, Hatfield, Soweto, Tembisa).
*   **Auto-Population**: Selecting any autocomplete suggestion automatically:
    1.  Flies the map region to the location.
    2.  Sets the draggable marker pin.
    3.  Auto-fills the **Township** and **Detailed Street Address** fields in the vendor forms.

### 2. 💼 Premium "Manage Business" Launcher Dashboard
*   **Dual Option Menu Interface**: Transformed the inventory page into a master dashboard launcher with two visually rich card menu items:
    1.  **Edit Business Profile**: Location, phone number, category, description, and brand graphics.
    2.  **View Inventory / Catalog**: Stock toggling and product listings.
*   **Live Brand Hero Visualizer**: Displays a gorgeous fullscreen wide **Business Cover Banner** and a floating circular **Logo** at the top of the launcher menu as soon as the vendor uploads them, providing instant brand gratification.
*   **Adaptive Dark Theme Support**: Standardized deep charcoals, slate backgrounds, and custom borders using `react-native-paper`'s `useTheme()` tokens to ensure the entire portal looks stunning in Dark Mode.

### 3. 🖼️ Dual Brand Assets Upload System & Supabase Integration
*   **Multi-Image Selection**: Linked Expo Image Picker to pick square logos and widescreen `16:9` banners.
*   **Bucket Casing Mismatch Protection**: Programmed self-healing fallback loops in the client Supabase client to dynamically match, generate, or hook into the capital **`Products`** bucket (avoiding dashboard/database capital 'P' case mismatches).
*   **Direct Asset Streaming**: Successfully streams and saves logo and banner URLs directly inside the PostgreSQL records.

### 4. 🗃️ Real-time Map & Dashboard Navigation Cache Healing
*   **Map Navigation Focus Refetching**: Added `useFocusEffect` and `useCallback` on the consumer Map page (`map.tsx`). As soon as a vendor updates their shop coordinates and goes back to the Map page, it instantly pulls the updated list from the server without requiring an app reboot!
*   **Vendor Dashboard Deletion Sync**: Added `useFocusEffect` and `useCallback` on the `vendor-dashboard.tsx` page. As soon as a vendor deletes a product inside the product catalog and goes back, the dashboard's product list instantly syncs and hides the deleted items!
*   **Defensive Coordinate Parsing**: Rewrote the backend updates to parse incoming client geodata using float checks, protecting database column types from validation errors.

---

## 🗂️ Modified Files & Structural Changes

### 📂 Frontend Updates (`/frontend`)

#### 1. [`manage-business.tsx`](file:///c:/Users/LAPTOPONE/Downloads/TholaApp1/frontend/src/app/%28main%29/manage-business.tsx)
*   **Role**: Unified Vendor Management Panel.
*   **Edits**: Expanded into a three-state router (`'menu'`, `'profile'`, `'inventory'`). Integrated the Photon autocomplete overlay, debounced inputs, map pin confirmation, cover banner pickers, and light/dark mode palettes.

#### 2. [`vendor-registration.tsx`](file:///c:/Users/LAPTOPONE/Downloads/TholaApp1/frontend/src/app/%28main%29/vendor-registration.tsx)
*   **Role**: Initial Vendor Registration Screen.
*   **Edits**: Resolved critical React Native crash reference errors (missing hooks/views). Integrated the Photon autocomplete geocoder, coordinate markers, and automatic township/suburb parser.

#### 3. [`map.tsx`](file:///c:/Users/LAPTOPONE/Downloads/TholaApp1/frontend/src/app/%28main%29/map.tsx)
*   **Role**: Consumer Map Screen.
*   **Edits**: Converted the vendor fetch from a mount-only `useEffect` to a reactive `useFocusEffect`. The screen now automatically updates pins when focused.

#### 4. [`vendor-dashboard.tsx`](file:///c:/Users/LAPTOPONE/Downloads/TholaApp1/frontend/src/app/%28main%29/vendor-dashboard.tsx)
*   **Role**: Vendor Dashboard Screen.
*   **Edits**: Replaced mount-only `useEffect` with a reactive `useFocusEffect` to dynamically refetch products when returning from the business inventory manager, ensuring deleted products are instantly removed from view.

#### 5. [`supabase.ts`](file:///c:/Users/LAPTOPONE/Downloads/TholaApp1/frontend/src/api/supabase.ts)
*   **Role**: Media Upload Interface.
*   **Edits**: Set the default bucket string strictly to `'Products'` (matching Supabase dashboard) and added self-healing bucket creations.

---

### 📂 Backend Updates (`/backend`)

#### 1. [`schema.prisma`](file:///c:/Users/LAPTOPONE/Downloads/TholaApp1/backend/prisma/schema.prisma)
*   **Role**: Database Model Definition.
*   **Edits**: Appended `banner_url String?` to the `Vendor` model:
    ```prisma
    model Vendor {
      id                   String    @id @default(uuid())
      business_name        String
      business_description String
      category             String
      phone_number         String
      township             String
      address              String
      latitude             Float
      longitude            Float
      logo_url             String?
      banner_url           String?   // <-- Added field
      ...
    }
    ```

#### 2. [`vendorController.js`](file:///c:/Users/LAPTOPONE/Downloads/TholaApp1/backend/src/controllers/vendorController.js)
*   **Role**: Vendor API Controller.
*   **Edits**: 
    *   Updated `registerBusiness` to destructure and save `banner_url` to the database.
    *   Upgraded `updateVendor` with safe parseFloat parsing for geodata:
        ```javascript
        const updateData = { ...req.body };
        if (updateData.latitude !== undefined) {
          updateData.latitude = parseFloat(updateData.latitude);
        }
        if (updateData.longitude !== undefined) {
          updateData.longitude = parseFloat(updateData.longitude);
        }
        ```

---

## 🛠️ Development & Deployment Reference

### Database Migrations
To push schema changes directly to the remote Supabase database during development without locking or dropping schemas, run:
```bash
npx prisma db push
```

### Server Execution
To run both client and API in local development:
*   **Backend API** (Port `5000`):
    ```bash
    npm run dev
    ```
*   **Frontend Expo Bundler** (Port `8081`):
    ```bash
    npx expo start --go --lan
    ```

---

*Log finalized on May 17, 2026.*
