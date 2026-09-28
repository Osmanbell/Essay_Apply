# Agentic AI Job Navigator 🚀

An advanced, AI-powered job search and application platform designed to automate the career growth process. This application leverages the Gemini 3.1 Pro API to analyze CVs, fetch real-time job listings, and generate highly tailored resumes and cover letters.

## 🌟 Key Features

- **AI CV Analysis**: World-class extraction of skills, experience, and career levels using Gemini 3.1 Pro.
- **International Standard Evaluation**: Evaluates CVs against US, UK, and Global Tech hiring benchmarks with a professional ATS score.
- **Real-Time Global Job Feed**: A sticky ticker fetching live job openings from across the web using Google Search integration.
- **AI-Powered Job Matching**: Calculates compatibility scores between your profile and real job listings.
- **Tailored Document Generation**: Generates human-like, ATS-optimized resumes and cover letters tailored to specific job descriptions.
- **Word Document (.docx) Export**: Download optimized CVs and tailored application documents directly as Word files.
- **Automated Application Tracking**: A comprehensive dashboard to manage sent applications, view generated documents, and track match accuracy.
- **Secure Authentication**: Google Login integration via Firebase Authentication.

---

## 🛠️ Technologies & Resources

### Frontend
- **React 19 & Vite**: Modern, fast, and responsive UI framework.
- **Tailwind CSS**: Utility-first styling for a polished, production-grade interface.
- **Lucide React**: High-quality, consistent icon set.
- **Motion (Framer Motion)**: Smooth animations and transitions.

### Backend & AI
- **Gemini 3.1 Pro & Flash**: Powering CV analysis, job searching, and content generation.
- **Firebase (Firestore & Auth)**: Real-time database and secure user authentication.
- **Azure AI Search (Integration Ready)**: Designed for advanced semantic and vector-based job searching.
- **Azure Functions (Integration Ready)**: Microservices for automated job aggregation and the "Auto-Apply" backend.
- **Express (Node.js)**: Custom server handling Vite middleware and API routing.

### Libraries
- **@google/genai**: Official SDK for interacting with Gemini models.
- **docx**: Programmatic generation of Microsoft Word documents.
- **file-saver**: Client-side file saving for downloads.
- **react-paystack**: Integration for subscription payments (Ready for production keys).

---

## 📂 Project Structure

```text
├── .env.example                # Template for required environment variables
├── firebase-applet-config.json # Firebase project configuration
├── firebase-blueprint.json     # IR for Firestore data structures
├── firestore.rules             # Secure Firestore access control rules
├── metadata.json               # App name, description, and permissions
├── package.json                # Project dependencies and scripts
├── server.ts                   # Express server entry point (Vite middleware)
├── src/
│   ├── App.tsx                 # Main application component and routing
│   ├── AuthContext.tsx         # Auth state and profile management
│   ├── firebase.ts             # Firebase SDK initialization
│   ├── main.tsx                # React entry point
│   ├── index.css               # Global styles (Tailwind)
│   ├── types/
│   │   └── index.ts            # Global TypeScript interfaces
│   ├── services/
│   │   ├── geminiService.ts    # Core AI logic and API interactions
│   │   └── azureService.ts     # Azure AI Search & Functions integration
│   └── components/
│       ├── CVUpload.tsx        # CV upload, analysis, and evaluation
│       ├── Dashboard.tsx       # User stats and application tracking
│       ├── JobFeed.tsx         # Real-time job search and matching
│       ├── JobCard.tsx         # Individual job listing UI
│       ├── JobDetails.tsx      # Detailed job view and AI actions
│       ├── JobTicker.tsx       # Global sticky job feed
│       ├── ProfileSetup.tsx    # Comprehensive user profile onboarding
│       ├── Subscription.tsx    # Tiered pricing and payment UI
│       └── Navbar.tsx          # Main navigation component
```

---

## 🚀 Development & Setup

### Environment Variables
The application requires several environment variables for full functionality. These should be set in the environment or via the platform settings.

**Core:**
- `GEMINI_API_KEY`: Required for all AI features.

**Azure (Optional/Advanced):**
- `AZURE_SEARCH_ENDPOINT`: Endpoint for Azure AI Search.
- `AZURE_SEARCH_KEY`: API Key for Azure AI Search.
- `AZURE_SEARCH_INDEX`: Target index for job listings.
- `AZURE_FUNCTIONS_BASE_URL`: Base URL for Azure Function microservices.

**Payments:**
- `VITE_PAYSTACK_PUBLIC_KEY`: Your Paystack Public Key (pk_live_... or pk_test_...). (Defaults to your live key if not set).

### Firebase Configuration
The application uses Firebase for data persistence. The configuration is stored in `firebase-applet-config.json`. Firestore security rules are defined in `firestore.rules` to ensure user data privacy (PII protection).

### AI Service Logic (`geminiService.ts`)
- **`analyzeCV`**: Uses `gemini-3.1-pro-preview` for high-accuracy parsing.
- **`evaluateAndCorrectCV`**: Provides international standard critiques.
- **`searchJobs`**: Leverages `googleSearch` tool to find real-world listings.
- **`generateDocx`**: Converts AI output into downloadable Word files.

### Azure Integration (`azureService.ts`)
The application is architected to support enterprise-grade search and automation via Azure:
- **Semantic Search**: `AzureService.searchJobs` is ready to perform vector-based matching between CV profiles and job indexes.
- **Microservices**: `AzureService.triggerFunction` provides a bridge to Azure Functions for heavy-duty background tasks like "Auto-Apply" automation.

---

## 🛡️ Security & Standards
- **PII Protection**: User profiles and applications are restricted to the document owner via Firestore rules.
- **ATS Optimization**: AI prompts are specifically designed to meet modern Applicant Tracking System requirements.
- **International Benchmarking**: Evaluation logic covers US (achievement-based), UK (clarity-based), and Global Tech (keyword-based) standards.

---

## 📜 License
This project is developed as a production-ready AI application. All rights reserved.
