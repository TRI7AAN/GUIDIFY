# GUIDIFY Frontend

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your API and Supabase keys.
3. `npm run dev`

## Environment Variables

- `VITE_REACT_APP_API_URL` (e.g. http://localhost:8000)
- `VITE_REACT_APP_SUPABASE_URL`
- `VITE_REACT_APP_SUPABASE_ANON_KEY`

## Features

- Deep-space-blue glassmorphism UI, neon highlights
- Supabase Auth (email, Google)
- Resume upload & parsing
- AI-powered interview bot
- Stats & charts
- Responsive, accessible

## Demo Checklist

- [ ] Signup/Login works
- [ ] Dashboard loads user data
- [ ] Resume upload parses and previews content
- [ ] Interview bot Q→A→feedback cycle
- [ ] Add Course/Job/Org forms create backend resources
- [ ] Charts render with backend data
- [ ] Responsive and accessible

## Deployment

- Deploy to Vercel/Netlify. Set env vars in project settings.
- Ensure backend CORS allows frontend origin.
