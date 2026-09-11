# QuickCourt — Sports Court Booking Platform

A full-stack sports court booking engine built with React + Vite + Tailwind CSS on the frontend and Node.js + Express with an in-memory data store on the backend.

---

## Architecture

```
React + Vite + Tailwind CSS  (frontend)
         ↓
      API Service
         ↓
  Express REST API  (backend — port 4000)
         ↓
  In-Memory JS Store
```

---

## Getting Started

### 1. Backend

```bash
cd backend
npm install
npm start
```

Server starts at **http://localhost:4000**

Health check: `GET http://localhost:4000/api/health`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dev server starts at **http://localhost:5173**

The Vite dev server proxies all `/api` requests to the backend at port 4000.

---

## Project Structure

```
quick-court/
├── backend/
│   ├── data/            # In-memory JavaScript store
│   ├── routes/          # Express route modules
│   ├── controllers/     # Route handler logic
│   ├── middleware/      # Shared Express middleware
│   └── server.js        # Express app entry point
│
├── frontend/
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page-level components
│       ├── context/     # React context providers
│       ├── services/    # API service utilities
│       ├── data/        # Static frontend data/seeds
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
│
└── README.md
```

---

## Technology Stack

| Layer     | Technology                                |
|-----------|-------------------------------------------|
| Frontend  | React 18, Vite 5, Tailwind CSS 3, Lucide  |
| Backend   | Node.js 22, Express 4                     |
| Data      | In-memory JavaScript object (no DB)       |
| Routing   | React Router DOM v6                       |

> **Note:** No external database, Supabase, Firebase, or payment gateway is used. All data resets when the server restarts.