# StockCheck Frontend Dashboard

A modern React dashboard for tracking product prices and stock availability.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **React Router v6** - Client-side routing
- **TailwindCSS** - Styling
- **shadcn/ui** - UI component library
- **Zustand** - Global state management
- **React Query** - Server state management and caching
- **Axios** - HTTP client
- **Chart.js** - Data visualization

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
VITE_API_BASE_URL=http://localhost:3000
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client functions
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── trackedItems.ts
│   │   └── history.ts
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── Navbar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── lib/             # Utilities
│   │   ├── apiClient.ts
│   │   └── utils.ts
│   ├── pages/           # Page components
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ProductDetails.tsx
│   │   └── ProductHistory.tsx
│   ├── store/           # Zustand stores
│   │   └── authStore.ts
│   ├── types/           # TypeScript types
│   │   └── api.ts
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/
└── package.json
```

## Features

### Authentication
- User registration and login
- JWT token storage in localStorage
- Protected routes
- Automatic token refresh on API calls

### Dashboard
- View all tracked items
- Add products by URL
- Group items by product
- Remove items from watchlist
- View product details

### Product Details
- View product information
- See all variants
- Track entire product or specific variants
- View variant history

### History View
- Price history chart (Line chart)
- Stock history chart (Bar chart)
- Raw data tables
- Filter by date range

## API Integration

The frontend connects to the backend API at `VITE_API_BASE_URL`. All API calls include authentication headers automatically via Axios interceptors.

### Endpoints Used

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /me/tracked-items` - Get tracked items
- `POST /me/tracked-items` - Add tracked item
- `DELETE /me/tracked-items/:id` - Remove tracked item
- `POST /products` - Create/fetch product by URL
- `GET /products/:id` - Get product details
- `GET /variants/:id` - Get variant with history

## Development

### Running Locally

1. Ensure backend is running on `http://localhost:3000`
2. Start frontend dev server:
```bash
npm run dev
```
3. Open `http://localhost:5173` in browser

### Environment Variables

- `VITE_API_BASE_URL` - Backend API URL (default: `http://localhost:3000`)

## Building

```bash
npm run build
```

Output will be in `dist/` directory, ready for deployment.

## Deployment

The built files in `dist/` can be served by any static file server:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Nginx
- Apache

Make sure to set `VITE_API_BASE_URL` to your production API URL.
