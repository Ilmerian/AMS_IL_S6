# **WatchWithMe — Real-Time Collaborative Video Rooms**

WatchWithMe is a real-time web platform that allows multiple users to watch YouTube videos together, chat instantly, and collaboratively manage playlists inside shared rooms.

The application is built with **React + Vite** on the frontend and relies entirely on **Supabase** for backend services, including authentication, database management, realtime synchronization, and security (Row-Level Security).

This project is an **academic, non-commercial prototype** developed as part of the **AMS course at Avignon Université**.  
It demonstrates the design and implementation of a complete modern web application using **Supabase as a Backend-as-a-Service (BaaS)**, featuring realtime interactions, role-based access control, moderation mechanisms, and a fully responsive user interface (desktop & mobile).

---

## **Main Features**

### 🎬 Watch Together (Realtime Sync)

* Shared YouTube embed player
* Realtime play / pause / seek synchronization across all users
* Leader-based playback control (single controller at a time)
* Automatic leader release and takeover when users join or leave
* Current playback state stored and synchronized via Supabase
* Automatic handling of next / previous videos in the playlist

---

### 💬 Realtime Chat

* Instant message delivery using **Supabase Realtime**
* Smooth auto-scroll behavior
* Sender identification and visual highlighting
* Persistent chat history stored in **PostgreSQL**
* Row-Level Security (RLS) enforcing room-based message access
* Moderation actions (kick / ban) reflected in realtime

---

### 📋 Collaborative Playlist

* Add videos using **any YouTube URL**
* Automatic YouTube ID extraction and validation
* Playlist reordering (drag & drop)
* Video removal restricted to owner / manager roles
* Persistent playlist storage in Supabase
* Automatic synchronization of the currently selected video

---

### 🔐 Authentication & Access

* Email / password registration and login via Supabase Auth
* Password reset and update flows
* Persistent user sessions
* Protected routes on the frontend
* Guest access with limited permissions
* Upgrade banner encouraging account creation for guests

---

### 🏠 Room System

* Room creation and deletion
* Public and private rooms
* Password-protected rooms
* Optional **PIN protection** for sensitive actions
* Owner / manager / member role hierarchy
* Automatic room data refresh and synchronization
* Dedicated room listing page

---

### 🛡️ Moderation & Safety

* Role-based moderation interface
* Promote / demote members
* Kick or ban users from rooms
* Dedicated banned users list with unban action
* Automatic ownership transfer when the owner leaves
* All moderation rules enforced at the database level using Supabase RLS

---

### 📱 Responsive UI

* Fully responsive layout (desktop & mobile)
* Adaptive sidebar (playlist / chat / history / moderation)
* Mobile-friendly buttons, dialogs, and forms
* Touch-friendly lists and menus
* Dark theme by default
* UI built with **Material UI (MUI)**

---

## **Project Structure (Frontend)**

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
│   ├─ useVideoSync.js
│   └─ ...
│
├─ services/
│   ├─ AuthService.js
│   ├─ RoomService.js
│   ├─ PlaylistService.js
│   ├─ RoleService.js
│   ├─ ChatService.js
│   ├─ RealtimeService.js
│   ├─ AccessService.js
│   └─ ...
│
├─ repositories/
│   ├─ BanRepository.js
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

````

---

## **Technologies**

### Frontend

* React 19
* Vite 7
* Material UI (MUI)
* React Router
* ESLint
* YouTube Embed Player
* Vanilla CSS

### Backend (Supabase)

* PostgreSQL
* Supabase Realtime (chat, presence, room updates)
* Supabase Auth (email/password)
* Row-Level Security (RLS)
* Database policies for rooms, roles, chat, and playlists
* Supabase JavaScript Client

---

## **Role Model (Owner / Manager / Member)**

| Action                  | Owner | Manager | Member |
|-------------------------|:-----:|:-------:|:------:|
| Join room               | ✔     | ✔       | ✔      |
| View playlist           | ✔     | ✔       | ✔      |
| Add video               | ✔     | ✔       | ✔      |
| Remove video            | ✔     | ✔       | ✖      |
| Reorder playlist        | ✔     | ✔       | ✔      |
| Delete room             | ✔     | ✖       | ✖      |
| Set room password / PIN | ✔     | ✖       | ✖      |
| Manage roles            | ✔     | ✖       | ✖      |
| Moderate users          | ✔     | ✔       | ✖      |

> All permissions are strictly enforced on the backend using **Supabase Row-Level Security (RLS)**.  
> The frontend mirrors these rules via `AccessService`.

---

## **Getting Started**

### 1. Install dependencies

```bash
npm install
````

---

### 2. Environment variables

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### 3. Start development server

```bash
npm run dev
```

---

## **Production Build**

```bash
npm run build
```

Deploy the `dist/` folder to any static hosting provider
(Vercel or Netlify recommended).

---

## **Available Commands**

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Build for production     |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |

---

## **Development Notes**

* All data fetching and mutations go through `services/` and `repositories/`
* Realtime logic is handled in:

  * `useRoom`
  * `usePlaylistForRoom`
  * `useVideoSync`
  * `ChatBox`
* Authentication state is managed globally via `AuthProvider`
* Room data is refreshed automatically when the browser tab regains focus
* Mobile responsiveness is achieved using MUI breakpoints and adaptive layouts

---

## **License**

MIT License.

This project is provided **for educational purposes only**
and is not intended for commercial use.
