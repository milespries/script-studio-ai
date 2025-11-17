# Script Studio AI

Script Studio AI is an AI-powered script generator and editor designed to make the editing process fast, precise, and enjoyable. Traditional AI chat tools regenerate entire scripts when you only want small edits, forcing constant copy/paste fixes. This app solves that by letting users highlight any section and have AI rewrite only that part while keeping the rest untouched.

## MVP Status

The current MVP includes:

- Script generation from a prompt and duration (1–5 minutes)
- Highlight any portion of the script and request a targeted rewrite
- Backend returns only the rewritten portion and the frontend splices it back in
- Undo functionality for the most recent AI edit
- Local storage persistence for the active script
- Responsive UI using TanStack Router and Tailwind CSS
- Backend API (TypeScript + Express) with `/generate` and `/edit`
- Frontend and backend containerized with Docker
- Manual deployment of both services to Google Cloud Run using Cloud Build

## Technology Stack

- **Frontend:** React, TypeScript, TanStack Router, Tailwind CSS, Vite  
- **Backend:** Node.js, Express, TypeScript  
- **AI Integration:** OpenRouter (LLM API)  
- **Containerization:** Docker, Docker Compose  
- **Cloud Hosting:** Google Cloud Run (manual Cloud Build triggers)  
- **Version Control:** Git + GitHub  

## Running the Project Locally (Docker)

Prerequisites:
- Docker
- Docker Compose

Steps:

1. Clone the repository:
   - `git clone https://github.com/milespries/script-studio-ai.git`
   - `cd script-studio-ai`

2. Create a `.env` file in the project root (or copy `.env.example`) with:
   - `OPENROUTER_API_KEY=your_key_here`
   - `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
   - `OPENROUTER_MODEL=openai/gpt-4.1`

3. Build and start the services:
   - `docker compose up --build`

4. Open in your browser:
   - Frontend: http://localhost:3000  
   - Backend: http://localhost:8080  

## Running Without Docker (Development)

### Backend
1. `cd backend`
2. `npm install`
3. Ensure the root `.env` is configured as described above
4. `npm run dev`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open the local Vite dev server URL (usually http://localhost:3000)

## Deployment (Google Cloud Run)

### Backend
- Deployed manually via Cloud Build using `cloudbuild-backend.yaml`
- Builds the backend image and deploys it to a Cloud Run service  
- Environment variables (`OPENROUTER_API_KEY`, etc.) are set directly in the Cloud Run service configuration (not at build time)
- After deployment, the backend receives a public HTTPS URL

### Frontend
- Deployed manually via Cloud Build using `cloudbuild-frontend.yaml`
- The backend URL is baked into the frontend at build time using the `VITE_API_URL` build arg
- Cloud Run hosts the static frontend, and it communicates with the backend over HTTPS

### Notes
- This MVP uses **manual deployment triggers**, not CI/CD automation
- The frontend must be rebuilt each time the backend URL changes

## AI Tool Usage

AI tools were used to assist with:

- Designing the API contract for `/generate` and `/edit`
- Selection-based editing logic and safely replacing text by index
- React/TanStack Router structure and Tailwind layout decisions
- Dockerfiles, docker-compose, and Cloud Build YAML drafts
- Debugging type issues, deployment errors, and environment variable handling

## Next Steps

Planned improvements:

- Script management (naming, history, multiple saved scripts)
- More editing options (tone adjustments, presets, formatting modes)
- Full CI/CD automation with GitHub Actions
- Additional UI polish and improved mobile layout
- Multi-step script creation flow and onboarding
