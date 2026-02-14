# ICF Hub - PRD

## Problem Statement
User with 10 years ICF construction experience wants a platform to generate revenue. Chose: ICF Education & Marketing Hub with both-sides marketplace model, AI features, and modern/bold design.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + MongoDB (port 8001, /api prefix)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (emergentintegrations)
- **Auth**: JWT-based contractor authentication
- **Design**: "Architectural Brutalist" - Clash Display + Manrope, International Orange (#FF4F00)

## User Personas
1. **Homeowner/Builder**: Wants ICF info, cost estimates, contractor connections
2. **ICF Contractor**: Wants leads, visibility, business growth

## Core Requirements
- Landing page with ICF benefits, stats, testimonials, CTAs
- AI chatbot for ICF questions and cost estimates
- Lead capture form for homeowners
- Contractor directory with profiles
- Contractor authentication and dashboard
- Pricing/subscription tiers
- Educational content (About ICF page)

## What's Been Implemented (Feb 14, 2026)
- Full landing page with hero, stats bar, benefits bento grid, how it works, testimonials, CTA
- About ICF education page with comparison table, FAQ, images
- Contractor registration and login (JWT auth)
- Contractor dashboard with leads management and profile editing
- Contractor directory with search
- Lead capture form (Get Quote) with project brief fields
- AI chat widget (GPT-5.2 powered) on all pages
- Pricing page with 3 tiers (Starter, Pro, Enterprise)
- Responsive navbar and footer
- Contact form API

## Prioritized Backlog
### P0
- Stripe payment integration for contractor subscriptions
- Email notifications when new leads arrive

### P1
- Contractor portfolio/gallery feature
- Lead assignment logic (match leads to contractors by location)
- Admin dashboard for platform management

### P2
- Blog/content management for SEO
- Contractor reviews and ratings
- SMS notifications via Twilio
- Advanced analytics for contractors

## Next Tasks
1. Integrate Stripe for subscription payments
2. Add email notification system (SendGrid/Resend)
3. Implement lead-to-contractor matching algorithm
4. Add contractor rating/review system
5. Build admin panel for platform management
