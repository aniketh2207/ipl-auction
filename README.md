# 🏏 Real-time IPL Auction Simulator

A fully functional, multiplayer IPL Auction simulator built with **Vue 3, Node.js, and Socket.io**.
This project allows players to create custom rooms, join as team owners, and participate in a live, real-time auction with authentic IPL rules (Set-by-set order, bid increments, and squad limits).

---

## ✨ Features
- **Real-Time Multiplayer**: Built on Socket.io for instantaneous bid updates.
- **Set-by-Set Auction**: Correct player order conforming to actual IPL structure (Marquee, Uncapped Batters, etc.).
- **Smart Bidding**: Automatic bid increment calculation based on IPL slabs (e.g. +5L below 1Cr, +20L above).
- **Automated Auctioneer**: The app runs the timer and governs the rules automatically.
- **Skip Voting**: Democratic voting system to skip players if no one bids.
- **Accelerated Round**: Unsold players can be brought back at the end of the main auction.
- **Squad Validation**: Enforces max 25 squad size, max 8 overseas players, and ensures teams do not overspend their purse.
- **Premium Design**: Dark, glassmorphism UI with real-time CSS animations for SOLD/UNSOLD events. 

---

## 🛠️ Tech Stack
| Tier | Technology |
|---|---|
| **Frontend** | Vue 3, Vite, Pinia, Vue Router |
| **Backend** | Node.js, Express, Socket.io |
| **Data Processing** | Python, pandas (for cleaning original CSV data) |

---

## 🚀 Running Locally

### 1. Start the Backend server (Terminal 1)
```bash
cd server
npm install
npm start
```
*Runs on `localhost:3000`*

### 2. Start the Frontend client (Terminal 2)
```bash
cd client
npm install
npm run dev
```
*Runs on `localhost:5173`*

Open `http://localhost:5173` in multiple browser tabs to simulate different users joining the same room.

---

## 🗃️ Data Pipeline
Original player data originated from an IPL 2026 mock auction CSV.
The data is cleaned by the `scripts/prepare_data.py` pipeline to drop extra rows, properly format names and prices, and standardize the dataset into `data/players.json`.

---

## 🌐 Deployment
To deploy this project:
1. Push this repository to **GitHub**.
2. **Backend**: Deploy the `server` folder to **Render** as a Web Service.
   - Render supports WebSockets on their free tier natively.
3. **Frontend**: Deploy the `client` folder to **Vercel** or **Netlify**.
   - Make sure to add an environment variable `VITE_SERVER_URL` pointing to your deployed Render backend link.
