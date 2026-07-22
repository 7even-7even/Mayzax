# Mayzax CRM Chrome Extension — Verification Engine

Production-ready Chrome Extension (Manifest V3) that integrates with Mayzax CRM to verify candidate job applications in real-time.

## Features
- **Multi-Strategy Detection**: Leverages page title, URL routing patterns, headings, success banners, aria live-regions, button status, and toast/notification components to detect confirmation.
- **Weighted Confidence Scoring**: Computes a confidence value from 0 to 100 based on matches. Passes confirmation data only if score >= 50.
- **Privacy & Security first**: Evaluates patterns locally in the browser tab. Collects no PII (resumes, inputs, cookies, or auth tokens).
- **Auto-evicting Storage cache**: Keeps a maximum of 100 entries. Cached items expire automatically after 24 hours.

## Directory Structure
- `src/manifest.ts`: Manifest definition (V3) consumed by the bundler.
- `src/types/`: TypeScript definitions.
- `src/rules/`: Individual modular evaluation logic classes (SOLID).
- `src/detectors/`: Subclasses for the 20+ supported portals (LinkedIn, Lever, Greenhouse, etc.).
- `src/storage/`: Local cache storage adapter wrapping Chrome storage api.
- `src/popup/`: Chrome extension action popup view (React).

---

## Installation & Setup Instructions

### 1. Build the Extension
Ensure you are in the extension directory:
```bash
cd extension
npm install
npm run build
```
This produces a compiled, production-ready bundle inside the `extension/dist` directory.

### 2. Load the Extension into Chrome
1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the `extension/dist` folder on your disk.

---

## Testing & Verification Workflow

1. Open any Greenhouse or Lever job portal confirmation page (e.g. submitting a test application or landing on a `/confirmation` routing path).
2. Click the extension icon in the toolbar. The popup should show a green badge indicating success status, along with the extracted company and job title metadata.
3. Open the Mayzax CRM web interface.
4. Open the "Log Job Application" form.
5. Paste the confirmation page URL into the **Job Posting Link** field.
6. The frontend queries the extension. A green badge saying **"Verified via Chrome Extension"** will appear beneath the link, and the form will automatically populate the extracted company name and job title fields.
7. Click **Submit Application**. The application is logged in the backend with `verified = true` and `verificationMethod = "Browser Extension"`.
