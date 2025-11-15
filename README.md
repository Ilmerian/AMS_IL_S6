# **WorldWatchMe — Real-Time Collaborative Video Rooms**

WorldWatchMe is a real-time platform that allows multiple users to watch YouTube videos together, chat instantly, and manage collaborative playlists inside shared rooms.
The frontend is built using **React + Vite**, while backend functionality (authentication, realtime events, storage, and database) is powered by **Supabase**.

This project demonstrates a fully implemented modern web application with real-time syncing, secure access control, playlist collaboration, and responsive UI.

---

## **Main Features**

### Watch Together

* Play/pause synchronized for all users
* Shared YouTube player based on embed
* Current playing video stored in Supabase
* Realtime sync of currently selected video

### Realtime Chat

* Messages broadcast instantly using Realtime API
* Smooth auto-scroll behavior
* Sender highlighting
* History stored in PostgreSQL
* RLS-secured message visibility per room

### Collaborative Playlist

* Add videos using any YouTube URL
* Remove items (owner or manager only)
* Reorder playlist via drag & drop
* Persistent playlist stored in Supabase
* Current video automatically updates when played

### Authentication

* Email/password registration and login
* Reset password
* Update password
* Persistent Supabase session
* Protected routes on frontend (`<Protected />`)

### Room System
* Create & delete rooms
* Public and private rooms
* Room password protection
* Owner & manager role system
* Automatic synchronization of room info
* Full room list page

### Polished UI
* Material UI
* Clean layout structure
* Responsive design
* Dark theme by default

---

# **Project Structure (Frontend)**

```
src/
│
├─ App.jsx
├─ App.css
│
├─ context/
│   ├─ auth.jsx
│   └─ AuthProvider.jsx
│
├─ hooks/
│   ├─ useRoom.js
│   ├─ usePlaylistForRoom.js
│   └─ ...
│
├─ services/
│   ├─ AuthService.js
│   ├─ RoomService.js
│   ├─ PlaylistService.js
│   ├─ ChatService.js
│   ├─ RealtimeService.js
│   ├─ AccessService.js
│   └─ ...
│
├─ components/
│   ├─ Header.jsx
│   ├─ Footer.jsx
│   ├─ ChatBox.jsx
│   ├─ PlaylistPanel.jsx
│   ├─ VideoPlayerShell.jsx
│   ├─ GuestUpgradeBanner.jsx
│   └─ ...
│
├─ layouts/
│   ├─ MainLayout.jsx
│   └─ AuthLayout.jsx
│
└─ pages/
    ├─ Home.jsx
    ├─ Login.jsx
    ├─ Register.jsx
    ├─ Rooms.jsx
    ├─ Room.jsx
    ├─ RoomCreate.jsx
    ├─ ResetPassword.jsx
    ├─ UpdatePassword.jsx
    └─ NotFound.jsx
```

---

# **Technologies**

### **Frontend**

* React 19
* Vite 7
* Material UI (MUI)
* React Router
* ESLint
* YouTube Embed Player
* Vanilla CSS

### **Backend (Supabase)**

* PostgreSQL
* Realtime (for chat + room updates)
* Auth (email/password)
* Row-Level Security (RLS)
* Policies for rooms, roles, chat, playlists
* Supabase JS Client

---

# **Role Model (Owner / Manager / Member)**

| Action            | Owner | Manager | Member |
| ----------------- | ----- | ------- | ------ |
| Join room         | ✔     | ✔       | ✔      |
| View playlist     | ✔     | ✔       | ✔      |
| Add video         | ✔     | ✔       | ✔      |
| Remove video      | ✔     | ✔       | ✖      |
| Reorder playlist  | ✔     | ✔       | ✔      |
| Delete room       | ✔     | ✖       | ✖      |
| Set room password | ✔     | ✖       | ✖      |
| Manage roles      | ✔     | ✖       | ✖      |

RLS policies enforce this on the backend.
AccessService mirrors this logic on frontend.

---

# Getting Started

## 1. Install dependencies

```bash
npm install
```

## 2. Environment variables

Create `.env`:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
```

## 3. Start dev server

```bash
npm run dev
```

---

# Production Build

```bash
npm run build
```

Deploy `dist/` to any static host (Vercel recommended).

---

# Commands

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start dev server         |
| `npm run build`   | Build for production     |
| `npm run preview` | Preview production build |
| `npm run lint`    | Lint project             |

---

# Development Notes

* All data-fetching and mutations pass through `services/`.
* Realtime events trigger UI updates in `useRoom`, `usePlaylistForRoom`, and `ChatBox`.
* All auth state is managed globally through `AuthProvider`.
* Rooms auto-refresh when browser tab becomes visible again.
* MUI components are used extensively for clean UI.

---

# License

MIT License.

