# Deployment Guide

This guide explains how to host the **Attendease** application on [Vercel](https://vercel.com).

## Prerequisites

1.  A [Vercel Account](https://vercel.com/signup).
2.  The project pushed to a Git repository (GitHub, GitLab, or Bitbucket).
3.  Your Environment Variables ready.

## Environment Variables

You will need to configure the following environment variables in your Vercel project settings:

| Variable Name | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anonymous Key |
| `GEMINI_API_KEY` | Your Google Gemini API Key |

## Deploying via Vercel Dashboard (Recommended)

1.  **Push your code** to your Git provider (e.g., GitHub).
2.  Log in to your **Vercel Dashboard**.
3.  Click **"Add New..."** -> **"Project"**.
4.  Import your **Attendease** repository.
5.  In the **"Configure Project"** screen:
    *   **Framework Preset**: It should automatically detect `Vite`.
    *   **Root Directory**: Leave as `./`.
    *   **Environment Variables**: Expand this section and add the three variables listed above.
6.  Click **"Deploy"**.

Vercel will build your project and provide you with a live URL.

## Deploying via Vercel CLI

If you prefer the command line:

1.  Install Vercel CLI: `npm i -g vercel`
2.  Run `vercel` in the project root.
3.  Follow the prompts to link the project.
4.  When asked about settings, you can accept the defaults.
5.  To set environment variables via CLI:
    ```bash
    vercel env add VITE_SUPABASE_URL
    vercel env add VITE_SUPABASE_ANON_KEY
    vercel env add GEMINI_API_KEY
    ```
6.  Redeploy with `vercel --prod`.
