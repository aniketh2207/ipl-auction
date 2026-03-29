# 🏏 IPL Auction Simulator

A real-time multiplayer IPL mega-auction simulator built with **Vue 3**, **Node.js**, and **Socket.IO**.

## Features

- **Real-time bidding** — multiple teams bid live with countdown timer
- **Complete IPL rules** — 25-player squads, 8 overseas limit, purse management, bid slabs
- **Customizable sets** — room host can choose which player categories to auction
- **Bid withdrawal** — teams can withdraw from bidding; auto-sell when all non-bidders withdraw
- **Accelerated round** — unsold players get a second chance at reduced base prices
- **Live squad view** — see your purchased team during the auction
- **Mobile responsive** — works on phones and tablets

## Quick Start (Local)

```bash
# Install dependencies
npm install --prefix server
npm install --prefix client

# Start the server (port 3000)
cd server && npm start

# In another terminal — start the client (port 5173)
cd client && npm run dev
```

Open `http://localhost:5173`, create a room, and share the code!

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vue 3, Pinia, Vue Router, Vite |
| Backend | Node.js, Express, Socket.IO |
| Data | Static JSON (369 IPL players) |

## Deployment

- **Frontend** → Deploy to [Vercel](https://vercel.com) (set `VITE_SERVER_URL` env var)
- **Backend** → Deploy to [Render](https://render.com) (set `CLIENT_URL` env var)

See `.env.example` files in `server/` and `client/` for required environment variables.

## License

MIT
