# TrueVibe

**Authentic Social Media with Trust Scores**  
A next-generation social platform that prioritizes genuine content and real connections.

---

## Overview

TrueVibe is a full-stack social media platform designed to combat misinformation and promote authentic content sharing. It features an AI-powered trust scoring system that evaluates content authenticity, helping users identify credible posts and trustworthy creators.

---

## Key Features

### Trust Scores
AI-driven content authenticity verification.

### Shorts
TikTok-style vertical video feed.

### Real-time Chat
Direct messages, group chats, and Discord-style servers.

### Voice Rooms
Live audio spaces with stage management.

### Analytics
Detailed engagement and trust metrics.

### Push Notifications
Firebase-powered real-time alerts.

### Modern UI
Premium Gen-Z aesthetic with dark mode support.

---

## Tech Stack

### Frontend
- React 19 with TypeScript
- TanStack Router for type-safe file-based routing
- TanStack Query for server state management and caching
- Tailwind CSS for utility-first styling
- Framer Motion for animations
- Shadcn UI for component library
- Socket.IO Client for real-time communication

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.IO for WebSocket communication
- Supabase Auth for authentication and OAuth
- Firebase for push notifications
- Cloudinary or Supabase Storage for media hosting

### AI Services
- Python with FastAPI for AI microservices
- TensorFlow or PyTorch for content authenticity models
- Custom Trust Score Engine for verification algorithms

---

## Project Structure

```text
TrueVibe/
├── src/
│   ├── api/                # API hooks and client
│   ├── components/         # Reusable UI components
│   ├── context/            # React contexts (Auth, Socket, Call)
│   ├── hooks/              # Custom hooks
│   ├── layouts/            # App and auth layouts
│   ├── lib/                # Utilities and helpers
│   ├── pages/              # Page components
│   └── routes/             # TanStack Router definitions
├── server/
│   ├── src/
│   │   ├── modules/        # Feature modules (posts, users, chat)
│   │   ├── shared/         # Shared utilities and middleware
│   │   └── config/         # Configuration files
│   └── ai-service/         # Python AI microservice
└── public/                 # Static assets





Getting Started
Prerequisites

Node.js 18 or higher

MongoDB 7 or higher

Python 3.10 or higher (for AI services)

Installation
Clone the repository
git clone https://github.com/yourusername/truevibe.git
cd truevibe

Install frontend dependencies
npm install

Install backend dependencies
cd server
npm install

Configure environment variables

Root directory

cp .env.example .env


Server directory

cd server
cp .env.example .env

Running the Application
Frontend
npm run dev

Backend
cd server
npm run dev

Environment Variables
Frontend (.env)
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

Backend (server/.env)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/truevibe
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

Deployment
Frontend (Vercel)
vercel deploy --prod

Backend (Railway or Render)

Build Command: npm run build

Start Command: npm start

Performance

Code splitting with lazy-loaded routes

Vendor chunk optimization for caching

Security headers including HSTS, CSP, and frame protection

Fully responsive, mobile-first design

License

This project is part of a Final Year Project and is intended for educational purposes.

Team

Built by the TrueVibe Team

TrueVibe
Social Media Verified


---

### If you want next:
- A **short GitHub description**
- A **portfolio version**
- A **Vercel landing page copy**
- A **technical architecture README**

Just tell me what you want to optimize next.