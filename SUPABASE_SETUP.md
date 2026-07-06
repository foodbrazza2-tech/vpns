# Supabase Full-Stack Setup

This project now uses Supabase as full stack for:
- Authentication
- Relational data (archives and documents metadata)
- File storage (archive bucket)

## 1) Configure environment variables
Create .env.local from .env.example and set:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_ARCHIVE_BUCKET=archives

## 2) Apply SQL schema
In Supabase dashboard:
1. Open SQL Editor
2. Run [supabase/schema.sql](supabase/schema.sql)

This creates:
- public.client_archives
- public.archive_documents
- storage bucket archives
- RLS policies for authenticated users

## 3) Verify auth users
The archive module expects authenticated users to access rows and storage.
Create users via Auth in Supabase dashboard or through the app sign-up flow.

## 4) Start app
Run:

```bash
npm install
npm run dev
```

Open the Documents section and test:
- Archive loading
- File upload
- Search and filtering

## 5) Production hardening
Before production, tighten RLS policies with tenant/user ownership rules.
Current policies are intentionally broad for fast onboarding.
