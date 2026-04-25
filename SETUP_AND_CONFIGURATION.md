# Setup and Configuration Guide

## Technical Prerequisites
- **Node.js**: 18.x or higher (Tested on Node 24 with --no-warnings)
- **Firebase Account**: For Auth and Cloud Sync
- **Browser**: Modern browser with `Notification Triggers API` support (Chrome/Edge recommended)

## Installation Steps
1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Create a `.env` file in the root directory with the following variables:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Development and Testing
1. **Run in Development Mode**:
   ```bash
   npm run dev
   ```
2. **Test Production Build Locally**:
   Run the provided `start-test-server.bat` file. This will:
   - Build the project
   - Serve it using a local server
   - Open your default browser to `http://localhost:4173`

## Key Libraries Added
- `firebase`: For authentication and cloud database sync.
- `react-quill`: For rich text task descriptions.
- `lucide-react`: For modern iconography.
- `tailwind-css`: For responsive, premium UI.

## Troubleshooting
- **Offline Notifications**: Ensure you grant notification permissions when prompted. The browser must support the experimental Notification Triggers API for notifications to work when the browser/tab is closed.
- **Node.js 24 Error**: If you see "error:0308010C:digital envelope routines::unsupported", the project is already configured to use `set NODE_OPTIONS=--openssl-legacy-provider` in the batch file.