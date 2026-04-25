## 13. Netlify Secrets Scanning Build Failure
**Symptoms:**
- Netlify build failed with: `Secrets scanning found 1 instance(s) of secrets in build output or repo code.`
- Secret env var `VITE_CLOUDINARY_UPLOAD_PRESET`'s value (`RelaySignal`) was detected in 18+ files across the repo.

**Root Cause:**
- The Cloudinary upload preset was set to `RelaySignal`, which is also the project name.
- Netlify's secret scanner flags any occurrence of a secret's value in source files as a leak.
- Since "RelaySignal" appears throughout the codebase (App title, headers, file names, etc.), the scanner falsely identified every occurrence as a secret exposure.

**Solution:**
- Removed unused Cloudinary environment variables (`VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`) from `.env`.
- Cloudinary was not actually used anywhere in the application code, so these variables were unnecessary.
- Build now passes Netlify secrets scanning successfully.

## 8. Android Browser Login Loop (The FIRST-PARTY PROXY Fix)
**Symptoms:** 
- Users on Android Chrome experience a persistent login loop despite session management fixes.
**Root Cause:** 
- **Storage Partitioning**: Chrome on Android blocks "Third-Party Cookies". Since the app was on `netlify.app` and auth was on `firebaseapp.com`, the browser partitioned the auth state, making it invisible to the app upon return.
**Solution:** 
- **Netlify Proxy**: Created `public/_redirects` to proxy `/__/auth/` internally.
- **AuthDomain Masking**: Updated `firebase.ts` to use `relaysignal.netlify.app` as the `authDomain`. This forces the browser to treat the auth process as "First-Party", bypassing the security blocks entirely.

## 9. Telegram Connection Timeout
**Symptoms:** 
- Frontend polling for `telegram_chat_id` reaches 2-minute limit without linking.
**Root Cause:** 
- Webhook URL was not always registered with Telegram's servers after deployment.
- 2 minutes was occasionally insufficient for cold-starts/network delays.
**Solution:** 
- Implemented an automatic `registerWebhook` backend action that is triggered every time a user clicks "Connect Telegram".
- Increased polling timeout to 3 minutes (60 attempts).

## 10. Frontend Robustness & Professional UI Hardening
**Symptoms:**
- Repeated clicks could trigger duplicate actions in Task Editor and Admin actions.
- Validation errors were either silent or shown as browser alerts instead of inline feedback.
- Auth form accepted unnormalized inputs, causing inconsistent UX.

**Root Cause:**
- Missing loading/action locks and limited client-side validation.
- Inconsistent feedback patterns (`alert` vs inline UI states).

**Solution:**
- Added guarded loading states (`isSaving`, `isDispatching`) to prevent duplicate submits.
- Added stronger client-side validation for task title, due date, poll constraints, and auth fields.
- Replaced transient alert-style feedback in admin flows with persistent inline success/error banners.
- Added safer disabled states on action buttons while async operations are in progress.

## 11. App Parse Failure in Login Flow
**Symptoms:**
- Test/build pipeline failed with a parse error near `finally` in `src/App.tsx`.

**Root Cause:**
- `finally` block existed without a matching `try` in `handleLogin`.

**Solution:**
- Wrapped login async logic in a proper `try/finally`.
- Ensured `processingLogins` cleanup always runs even on request failure.

## 12. Auth Mock Drift Broke Tests
**Symptoms:**
- Vitest failed with: `No "getRedirectResult" export is defined on the "firebase/auth" mock`.

**Root Cause:**
- `Auth.tsx` uses `getRedirectResult`, but tests mocked only `onAuthStateChanged`.

**Solution:**
- Updated `src/__tests__/App.test.tsx` Firebase auth mock to include missing exports used by the component (`getRedirectResult`, redirect/auth helpers).
- Re-ran test suite: all tests passing.
**Symptoms:** 
- Deployment logs showed `Command failed with exit code 2: npm run build`. 
- `tsc` reported property missing errors on `Task` interface.
**Solution:** Restored missing properties to `Task` interface in `src/App.tsx`.

## 2. API "Unauthorized: Invalid token"
**Symptoms:** "Failed to save task" alert on production.
**Root Cause:** Multiline JSON parsing issues in the environment variables.
**Solution:** Implemented robust JSON parsing in `netlify/functions/api.ts`.

## 3. Telegram Linkage Timeout
**Symptoms:** Infinite loading when connecting to bot.
**Solution:** Fixed backend initialization crash (Error #2) and verified webhook logic.

## 4. Initial Login Dashboard Race Condition
**Symptoms:** Blank dashboard on first login.
**Solution:** Passed `overrideUserId` to `fetchTasks` in the login flow.

## 5. Firebase Auth-Domain Configuration Missing
**Symptoms:** `auth/auth-domain-config-required` error.
**Solution:** Added `VITE_FIREBASE_AUTH_DOMAIN` to client config and Netlify.

## 6. Truncated Service Account Variable
**Symptoms:** `app/no-app` error and JSON syntax error at position 1.
**Solution:** Added truncation detection and auto-fallback to `VITE_FIREBASE_PROJECT_ID` initialization.

## 7. Hanging Telegram Redirect
**Symptoms:** Clicking "Connect Telegram" took a long time to open or hung on a web redirect.
**Root Cause:** `t.me` redirects rely on browser protocols that can be slow or fail on some devices.
**Solution:** Updated `App.tsx` to use the **`tg://` direct protocol** for instant app launching, with a 1-second `t.me` fallback for web clients.
