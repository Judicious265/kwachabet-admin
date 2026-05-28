# Kwacha Bet — Admin Dashboard

Enterprise-level admin panel for the Kwacha Bet sports betting platform.

## Pages

| Page | Path | Description |
|------|------|-------------|
| Login | `/login` | Admin authentication |
| Dashboard | `/` | Overview stats, charts, live activity |
| Customers | `/customers` | User management, suspend, view profiles |
| Bet Monitor | `/bets` | All bets, live feed, settlement |
| Payments | `/payments` | Withdrawals approval, transactions |
| Fraud & Risk | `/fraud` | Fraud flags, high risk users |
| Sports & Odds | `/sports` | Events, odds editing, local matches |
| Tax Reports | `/tax` | Withholding tax tracking and PDF export |
| Reports | `/reports` | PDF/CSV exports for all data |
| Admin Team | `/admins` | Team management, roles, audit log |
| Settings | `/settings` | Platform config, bonus campaigns, security |

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in your backend URL
npm run dev
# Opens on http://localhost:3001
```

## Deploy to Vercel

1. Push this folder to a new GitHub repo called `kwachabet-admin`
2. Go to vercel.com → New Project → Import repo
3. Set Root Directory if needed
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = https://kwachabet-backend.onrender.com/api/v1
   - `NEXT_PUBLIC_WS_URL`  = wss://kwachabet-backend.onrender.com/ws/odds
5. Deploy

## How to Access Admin Panel

1. Register a normal account on the main Kwacha Bet site
2. Visit: `https://kwachabet-backend.onrender.com/webhooks/make-admin?phone=+265XXXXXXXXX`
3. Log in at your admin Vercel URL with the same credentials
