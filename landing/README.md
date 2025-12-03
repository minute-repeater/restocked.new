# Restocked.now Landing Page

Public marketing/landing website for Restocked.now - a product tracking and alert service.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to see the landing page.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
landing/
├── src/
│   ├── components/      # Reusable components (Navbar, etc.)
│   ├── sections/       # Page sections (Hero, Features, etc.)
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── index.html          # HTML template
└── package.json        # Dependencies
```

## 🎨 Styling

- **TailwindCSS** for utility-first styling
- Matches dashboard color scheme (HSL-based design system with blue primary)
- Uses CSS custom properties for consistent theming
- Fully responsive (mobile-first design)
- Accessible and SEO-optimized
- Smooth scroll behavior for better UX

## 🔗 Integration

The landing page links to:
- `/register` - Sign up page (points to dashboard registration)
- `/login` - Sign in page (points to dashboard login)

All CTAs throughout the site link to `/register` for signups. The navbar includes both Sign In (`/login`) and Get Started (`/register`) buttons.

To update these links, search for `/register` and `/login` in:
- `src/components/Navbar.tsx`
- `src/sections/Hero.tsx`
- `src/sections/HowItWorks.tsx`
- `src/sections/Pricing.tsx`

## 📦 Deployment

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts

### Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Follow prompts

### Static Hosting

1. Build: `npm run build`
2. Upload `dist/` folder to your hosting service
3. Configure redirects for SPA routing (if needed)

## 🎯 Features

- ✅ Fully responsive design
- ✅ SEO-optimized meta tags
- ✅ Fast loading (optimized bundle)
- ✅ Accessible (ARIA labels, semantic HTML)
- ✅ Modern, clean design
- ✅ Conversion-focused CTAs

## 📝 Customization

### Update Colors

Edit `tailwind.config.js` to change the color scheme.

### Update Content

Edit the section components in `src/sections/` to update copy, features, testimonials, etc.

### Update Links

Search for `/register` and `/login` and update to your actual URLs.

## 🔍 SEO

The page includes:
- Meta tags (title, description, keywords)
- Open Graph tags (Facebook)
- Twitter Card tags
- Semantic HTML structure
- Fast loading times

## 📱 Mobile Optimization

- Responsive breakpoints (sm, md, lg)
- Touch-friendly tap targets
- Mobile-optimized navigation
- Optimized images and assets

## 🛠️ Tech Stack

- **Vite** - Build tool
- **React 19** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Lucide React** - Icons

## 📄 License

MIT

