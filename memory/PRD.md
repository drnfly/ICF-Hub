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
- Contractor dashboard with leads management, profile editing, notifications
- Contractor directory with search
- Lead capture form (Get Quote) with project brief fields
- AI chat widget (GPT-5.2 powered) on all pages
- Pricing page with 3 tiers (Starter, Pro, Enterprise)
- Responsive navbar with notification bell and footer
- Contact form API
- **AI Content Generator Agent** — creates SEO-optimized social media posts for Facebook, Instagram, LinkedIn, X, TikTok
- **AI Campaign Manager Agent** — creates multi-platform marketing campaigns with AI content calendars
- **AI Lead Scoring Agent** — scores leads with grade, urgency, estimated value, recommended actions
- **Content Calendar** — Monthly visual calendar view to schedule, manage, and publish social media posts
- **Auto-Scheduling** — Schedule individual or bulk posts from content generator, publish from calendar
- **Analytics Dashboard** — Real-time charts: lead pipeline, leads over time, content by platform, campaign status, scheduled post stats (recharts)
- **Notification System** — In-app notifications triggered on new leads and post publishing, with unread count badge, mark read/all read
- **Connect Social Media** — Settings page to link Facebook, Instagram, LinkedIn, X/Twitter, TikTok accounts with API tokens. Connection summary dashboard. Calendar shows auto-post status per platform. Publish flow checks connected accounts.

## What's Been Implemented (Mar 2026)
- Stabilized AI intake assistant by fixing logger initialization order, moving vision import to top-level, and switching intake chat + vision to GPT-5.2.

## Prioritized Backlog
### P0
- HubSpot OAuth redirect reliability (requires user to update Redirect URL and confirm callback)
- Implement real social media API posting (Facebook Graph, LinkedIn, X APIs) using stored tokens
- Real email notifications via SendGrid/Resend (currently in-app only)

### P1
- Contractor portfolio/gallery feature
- Lead-to-contractor matching algorithm by location
- Admin dashboard for platform management
- Blog/CMS for SEO content

### P2
- Contractor reviews and ratings
- SMS notifications via Twilio
- A/B testing for social media content
- White-label options for contractors
