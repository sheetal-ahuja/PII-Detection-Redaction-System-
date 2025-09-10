# PII Detection & Redaction System 🔒

A comprehensive web application for detecting and redacting Personally Identifiable Information (PII) from documents and text. Built with modern web technologies and AI-powered NER models.

## 🚀 Features

### Core Functionality
- **Multi-format Document Processing**: Supports PDF, DOCX, TXT, and image files
- **Advanced PII Detection**: Uses AI-powered Named Entity Recognition (NER) to detect:
  - Names and person entities
  - Email addresses
  - Phone numbers
  - Social Security Numbers (SSN)
  - Credit card numbers
  - Addresses and locations
  - Driver's license numbers
  - Passport numbers
  - Bank account numbers
  - Employee IDs
  - Dates of birth
- **Smart Redaction**: Automatically replaces detected PII with anonymized tokens (e.g., [NAME_1], [EMAIL_1])
- **Multiple Export Formats**: Export results as TXT, JSON, CSV, or PDF
- **Real-time Processing**: Live preview of detection and redaction results

### Technical Features
- **OCR Processing**: Extract text from scanned documents and images using Tesseract.js
- **Confidence Scoring**: Each detected entity includes confidence levels (High/Medium/Low)
- **Batch Processing**: Handle multiple documents simultaneously
- **Secure Backend**: Supabase integration with Row Level Security (RLS)
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful and accessible UI components
- **React Query** - Server state management
- **React Router** - Client-side routing

### Backend & AI
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL database
  - Authentication
  - Edge Functions
  - Real-time subscriptions
- **Hugging Face Transformers** - In-browser NER models
- **Tesseract.js** - OCR processing
- **PDF.js** - PDF parsing and rendering

### Document Processing
- **Mammoth.js** - DOCX to HTML conversion
- **jsPDF** - PDF generation for exports
- **File API** - Modern file handling

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Supabase account** (for backend services)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

The project uses Supabase for backend services. The configuration is already set up in `src/integrations/supabase/client.ts` with the project credentials.

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components (sidebar, etc.)
│   ├── Dashboard.tsx    # Main dashboard interface
│   ├── FileUpload.tsx   # File upload component
│   ├── PIIResults.tsx   # Results display
│   └── ExportManager.tsx # Export functionality
├── hooks/               # Custom React hooks
├── integrations/        # External service integrations
│   └── supabase/       # Supabase client and types
├── pages/              # Route pages
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── ner.ts          # Named Entity Recognition
│   └── ocrProcessor.ts # OCR processing
└── main.tsx            # Application entry point

supabase/
├── functions/          # Edge Functions
│   ├── process-pii/    # PII processing endpoint
│   ├── upload-document/ # Document upload handler
│   └── export-results/ # Export functionality
└── config.toml         # Supabase configuration
```

## 💡 Usage

### 1. Upload Documents
- Drag and drop files or click to select
- Supported formats: PDF, DOCX, TXT, JPG, PNG
- Files are processed automatically

### 2. Review Detection Results
- View detected PII entities with confidence scores
- Entities are categorized by risk level (High/Medium/Low)
- Preview redacted text in real-time

### 3. Export Results
- Choose from multiple export formats:
  - **TXT**: Plain text with redacted content
  - **JSON**: Structured data with all detection metadata
  - **CSV**: Tabular format for analysis
  - **PDF**: Professional document format

### 4. Manage Processing History
- View previously processed documents
- Re-export results in different formats
- Track processing statistics

## 🔧 Configuration

### NER Model Configuration
The system uses Hugging Face's transformer models for entity detection. You can modify the model settings in `src/utils/ner.ts`:

```typescript
const MODEL_NAME = 'Xenova/bert-base-NER';
```

### Redaction Patterns
Custom regex patterns for PII detection can be modified in the processing utilities.

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Secure File Handling**: Files are processed securely without permanent storage
- **Data Privacy**: No sensitive data is logged or stored unnecessarily
- **HTTPS Only**: All communications are encrypted

## 🚀 Deployment

### Deploy to Lovable (Recommended)
1. Open your project in Lovable
2. Click the "Publish" button
3. Your app will be deployed with a lovable.app domain

### Custom Domain
Connect your own domain through Project > Settings > Domains in Lovable.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Commit: `git commit -m 'Add new feature'`
5. Push: `git push origin feature/new-feature`
6. Submit a pull request

## 📝 API Documentation

### Edge Functions

#### `/process-pii`
Process text or document content for PII detection.

#### `/upload-document`
Handle file uploads and convert to processable text.

#### `/export-results`
Generate and download export files in various formats.

## 🔍 Troubleshooting

### Common Issues

1. **NER Model Loading**: First-time model download may take a few minutes
2. **Large Files**: PDF processing may be slower for large documents
3. **Browser Compatibility**: Ensure you're using a modern browser with WebAssembly support

### Performance Tips

- Process smaller batches for better performance
- Use modern browsers for optimal NER model performance
- Ensure stable internet connection for model downloads

## 📄 License

This project is built with Lovable and follows standard web development practices.

## 🆘 Support

For issues and questions:
- Check the Lovable documentation: https://docs.lovable.dev/
- Join the Lovable Discord community
- Review console logs for debugging information

---

Built with ❤️ using Lovable, React, and modern web technologies.