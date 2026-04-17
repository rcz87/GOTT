# Frontend

Folder ini akan berisi web application GOTT Protocol.

## Status: **Planning Phase**

Frontend akan di-implement di Phase 3 roadmap (Month 3-4).

## Technology Stack (Planned)

- **Framework:** Next.js 14 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Web3:** Wagmi + viem
- **Wallet Connect:** RainbowKit
- **State:** Zustand atau TanStack Query
- **i18n:** next-intl (Indonesian primary)
- **Analytics:** Posthog atau Plausible
- **Deployment:** Vercel

## Features (Planned)

### Core Pages
- [ ] Landing page
- [ ] Scan wallet
- [ ] Cleanup interface
- [ ] Rewards dashboard
- [ ] DAO governance
- [ ] Leaderboard
- [ ] Documentation

### Key Features
- [ ] Multi-wallet support (MetaMask, Trust, SafePal, etc)
- [ ] Bahasa Indonesia primary, English secondary
- [ ] Dark/light mode
- [ ] Mobile responsive (PWA)
- [ ] Real-time transaction tracking
- [ ] Scam warnings + education
- [ ] Gasless approvals (EIP-2612 Permit)

## Design Philosophy

- **Simple:** 3-click cleanup flow
- **Safe:** Clear warnings, no surprises
- **Local:** Indonesian UX standards
- **Fast:** Optimized performance
- **Accessible:** WCAG 2.1 AA compliance target

## Getting Started (When Development Starts)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Test
npm run test
```

## Design System

Design tokens akan di-extract di `frontend/design-system/`:
- Colors (brand + semantic)
- Typography (scale + weights)
- Spacing (8px grid)
- Components (shadcn/ui based)
- Animations (Framer Motion)

## Deployment

- **Staging:** staging.gott.finance (TBD)
- **Production:** gott.finance (TBD)
- **Preview:** Vercel preview per PR
