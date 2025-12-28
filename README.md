<div align="center">

# 🌟 TrueVibe

**Authentic Social Media with AI-Powered Trust Scores**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/baigcoder/TrueVibe)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-success.svg)](https://true-vibe.vercel.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**[🚀 Live Demo](https://true-vibe.vercel.app/)** • **[📖 Documentation](#documentation)** • **[🤝 Contributing](#contributing)**

</div>

---

## 🎯 Overview

**TrueVibe** is a next-generation social media platform that combats misinformation and promotes authentic content sharing. Built with cutting-edge technologies, it leverages AI-powered trust scoring to help users identify credible posts and trustworthy creators in real-time.

### ✨ Why TrueVibe?

In an era of deepfakes and misinformation, TrueVibe stands out by:
- 🛡️ **Verifying Content Authenticity** with AI-driven trust scores
- 🎨 **Premium Gen-Z Aesthetic** with smooth animations and dark mode
- ⚡ **Real-Time Everything** - chat, notifications, and live interactions
- 🎯 **Privacy-First Approach** with end-to-end encryption
- 📊 **Detailed Analytics** for creators and users

---

## 🎥 Demo & Screenshots

**🌐 Live Application:** [https://true-vibe.vercel.app/](https://true-vibe.vercel.app/)

> Add screenshots here to showcase your platform's features

---

## 🚀 Key Features

### 🛡️ AI-Powered Trust Scores
Advanced deepfake detection and content authenticity verification using TensorFlow models. Each post gets a real-time trust score to help users identify credible content.

### 📱 TikTok-Style Shorts
Vertical video feed with smooth scrolling, built-in camera, filters, and engagement analytics. Perfect for short-form content creation.

### 💬 Real-Time Communication
- **Direct Messages** with typing indicators and read receipts
- **Group Chats** with media sharing and reactions
- **Discord-Style Servers** with channels and roles
- **Voice Rooms** with stage management and live audio spaces

### 🎮 Gamification & Achievements
Earn badges, level up, and climb leaderboards through authentic engagement. Complete challenges and showcase your credibility.

### 📊 Advanced Analytics
Comprehensive dashboard with:
- Engagement metrics and growth trends
- Trust score history and insights
- Audience demographics
- Content performance analytics

### 🔔 Smart Notifications
Firebase Cloud Messaging integration for:
- Real-time push notifications
- In-app notification center
- Customizable notification preferences

### 🎨 Modern UI/UX
- Premium Gen-Z aesthetic with glassmorphism
- Smooth Framer Motion animations
- Full dark mode support
- Mobile-first responsive design

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI Framework |
| **TypeScript** | 5.9.3 | Type Safety |
| **TanStack Router** | 1.141.6 | Type-safe routing |
| **TanStack Query** | 5.90.12 | Server state management |
| **Tailwind CSS** | 3.4.19 | Utility-first styling |
| **Framer Motion** | 12.23.26 | Animations |
| **Shadcn UI** | Latest | Component library |
| **Socket.IO Client** | 4.8.0 | Real-time communication |
| **Supabase** | 2.88.0 | Authentication & storage |
| **Firebase** | 12.7.0 | Push notifications |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express** | Latest | Web framework |
| **MongoDB** | 7+ | Database |
| **Mongoose** | Latest | ODM |
| **Socket.IO** | Latest | WebSocket server |
| **Redis** | Latest | Caching & sessions |
| **Cloudinary** | Latest | Media storage |

### AI & ML
| Technology | Purpose |
|------------|---------|
| **Python FastAPI** | AI microservice |
| **TensorFlow** | Deepfake detection |
| **PyTorch** | Content analysis |
| **Custom Trust Engine** | Authenticity scoring |

### DevOps & Tools
- **Vite** - Fast build tool
- **Vercel** - Frontend hosting
- **Railway** - Backend hosting
- **Docker** - Containerization
- **ESLint** - Code linting
- **Git** - Version control

---

## 📂 Project Structure

```
TrueVibe/
├── src/                        # Frontend source code
│   ├── api/                    # API hooks and client
│   ├── components/             # Reusable UI components
│   │   ├── calls/              # Video/audio call components
│   │   ├── chat/               # Chat UI components
│   │   ├── modals/             # Modal dialogs
│   │   ├── shared/             # Shared components
│   │   └── ui/                 # Base UI components
│   ├── context/                # React contexts
│   │   ├── AuthContext.tsx     # Authentication state
│   │   ├── CallContext.tsx     # Call management
│   │   ├── RealtimeContext.tsx # Real-time events
│   │   └── VoiceRoomContext.tsx # Voice room state
│   ├── hooks/                  # Custom React hooks
│   ├── layouts/                # Page layouts
│   ├── lib/                    # Utilities and helpers
│   ├── pages/                  # Page components
│   └── routes/                 # TanStack Router definitions
├── server/                     # Backend source code
│   ├── src/
│   │   ├── modules/            # Feature modules
│   │   │   ├── auth/           # Authentication
│   │   │   ├── posts/          # Post management
│   │   │   ├── users/          # User management
│   │   │   ├── chat/           # Chat & messaging
│   │   │   ├── shorts/         # Short videos
│   │   │   ├── stories/        # Stories feature
│   │   │   ├── gamification/   # Achievements & badges
│   │   │   └── notifications/  # Push notifications
│   │   ├── shared/             # Shared utilities
│   │   ├── socket/             # Socket.IO handlers
│   │   └── config/             # Configuration
│   └── ai-service/             # Python AI microservice
├── public/                     # Static assets
└── docs/                       # Documentation
```

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **MongoDB** 7 or higher
- **Python** 3.10 or higher (for AI services)
- **Redis** (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/baigcoder/TrueVibe.git
   cd TrueVibe
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Set up environment variables**

   Create `.env` files in both root and server directories:

   **Frontend `.env`:**
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   ```

   **Backend `server/.env`:**
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/truevibe
   REDIS_URL=redis://localhost:6379
   JWT_ACCESS_SECRET=your_access_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   FRONTEND_URL=http://localhost:5173
   ```

5. **Run the application**

   Terminal 1 - Frontend:
   ```bash
   npm run dev
   ```

   Terminal 2 - Backend:
   ```bash
   cd server
   npm run dev
   ```

   Terminal 3 - AI Service (optional):
   ```bash
   cd server/ai-service
   pip install -r requirements.txt
   python main.py
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - AI Service: http://localhost:8000

---

## 🚢 Deployment

### Frontend (Vercel)

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy:**
   ```bash
   vercel deploy --prod
   ```

### Backend (Railway/Render)

1. **Create a new project** on Railway or Render
2. **Connect your GitHub repository**
3. **Set environment variables**
4. **Build Command:** `npm run build`
5. **Start Command:** `npm start`

### Database (MongoDB Atlas)

1. **Create a cluster** on MongoDB Atlas
2. **Get connection string** and update `MONGODB_URI`
3. **Configure IP whitelist** for your backend

---

## 📚 Documentation

### API Endpoints

```
Authentication
├── POST   /api/auth/register     # Register new user
├── POST   /api/auth/login        # Login user
├── POST   /api/auth/logout       # Logout user
└── POST   /api/auth/refresh      # Refresh access token

Posts
├── GET    /api/posts             # Get all posts
├── POST   /api/posts             # Create new post
├── GET    /api/posts/:id         # Get post by ID
├── PUT    /api/posts/:id         # Update post
└── DELETE /api/posts/:id         # Delete post

Chat
├── GET    /api/chat/conversations # Get user conversations
├── POST   /api/chat/messages      # Send message
└── GET    /api/chat/messages/:id  # Get conversation messages

(See full API documentation for complete endpoint list)
```

### Socket Events

```javascript
// Client -> Server
socket.emit('join_room', { roomId });
socket.emit('send_message', { roomId, message });
socket.emit('typing', { roomId, isTyping });

// Server -> Client
socket.on('new_message', (message) => {});
socket.on('user_joined', (user) => {});
socket.on('user_left', (user) => {});
```

---

## 🎯 Performance

- ⚡ **Code Splitting** - Lazy-loaded routes for faster initial load
- 📦 **Vendor Chunking** - Optimized caching strategy
- 🔒 **Security Headers** - HSTS, CSP, and frame protection
- 📱 **Mobile-First** - Fully responsive, touch-optimized design
- 🚀 **CDN** - Static assets served via Vercel Edge Network

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 🐛 Issues & Bugs

Found a bug? Please [open an issue](https://github.com/baigcoder/TrueVibe/issues) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

Built with ❤️ by the **TrueVibe Team**

- **Developer:** [baigcoder](https://github.com/baigcoder)

---

## 🙏 Acknowledgments

- Icons by [Lucide Icons](https://lucide.dev/)
- UI Components by [Shadcn/ui](https://ui.shadcn.com/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
- Hosting by [Vercel](https://vercel.com/)

---

## 📞 Contact & Support

- **Live Demo:** [true-vibe.vercel.app](https://true-vibe.vercel.app/)
- **GitHub:** [github.com/baigcoder/TrueVibe](https://github.com/baigcoder/TrueVibe)
- **Issues:** [Report a bug](https://github.com/baigcoder/TrueVibe/issues)

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

Made with 💙 by the TrueVibe Team | © 2025

</div>