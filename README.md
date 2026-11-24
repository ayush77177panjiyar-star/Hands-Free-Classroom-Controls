# Hands-Free Classroom Controls 🖐️🎓

An intelligent, next-generation educational web application enabling students to navigate, answer questions, interact with diagrams, and participate in digital classroom lessons through ordinary webcam hand gestures instead of a mouse.

---

## 🌟 Key Features

- **Gesture-Driven Classroom Interaction**: Navigate lesson slides, select multiple-choice answers, and interact with drag-and-drop diagrams hands-free.
- **Guided Hand Calibration**: Personalized hand preference (left/right), resting zone setup, movement sensitivity, and smoothing calibration.
- **Virtual Gesture Cursor**: Smooth on-screen cursor with dwell-time circular progress timer for natural touchless clicking.
- **Real-Time Telemetry & Analytics**: Visual charts showing recognition accuracy, latency, and accidental activation prevention metrics.
- **Dual Student A/B Testing**: Side-by-side performance benchmarks comparing different students or calibration profiles.
- **Robust Python FastAPI Backend**: Production-grade async backend with Pydantic v2 validation and health monitoring.
- **Vercel Serverless Ready**: Configured for unified frontend SPA and backend API serverless deployment.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (Dark navy SaaS theme with subtle blue/violet gradients)
- **Routing**: React Router DOM v6
- **Icons**: Lucide React
- **Data Visualization**: Recharts

### Backend
- **Framework**: Python 3.12+ / FastAPI
- **Validation**: Pydantic v2 / Pydantic Settings
- **Async Server**: Uvicorn
- **Mathematical Utilities**: NumPy

### Deployment & CI/CD
- **Platform**: Vercel Serverless (`vercel.json` + `api/index.py`)
- **Repository**: GitHub

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.12+ (or `uv`)

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### 3. Backend Setup
```bash
# Create virtual environment and install dependencies
uv venv .venv
# On Windows:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

uv pip install -r backend/requirements.txt

# Run the FastAPI server
uvicorn backend.app.main:app --reload --port 8000
```
Interactive Swagger API documentation will be available at `http://localhost:8000/api/v1/docs`.

---

## 📂 Project Structure

```
Hands-Free-Classroom-Controls/
├── api/
│   └── index.py                      # Vercel Serverless Python entrypoint
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI initialization & middlewares
│   │   ├── core/config.py            # Pydantic Settings & environment config
│   │   ├── schemas/                  # Pydantic data models
│   │   ├── services/                 # Business logic & calibration store
│   │   ├── utils/                    # Common response wrappers
│   │   └── api/v1/                   # REST API routes
│   └── requirements.txt
├── src/
│   ├── components/                   # Reusable UI components
│   ├── pages/                        # 6 Core SaaS Pages
│   ├── hooks/                        # Custom React hooks (Webcam, Cursor, Storage)
│   ├── services/                     # Backend API client
│   ├── App.jsx                       # Routing & App layout
│   └── main.jsx
├── vercel.json                       # Vercel deployment configuration
└── package.json
```

---

## 📄 License
MIT License. Built with ❤️ for accessible, intelligent digital education.
