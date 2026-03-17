# NCERT Question Generator

AI-powered question generator for NCERT content using Gemini API, hosted on Netlify.

---

## 🚀 Deploy to Netlify (Step by Step)

### Step 1 — Get a FREE Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key — looks like: `AIzaSy...`

---

### Step 2 — Upload this project to GitHub

1. Go to https://github.com and create a free account if you don't have one
2. Click **"New repository"** → name it `ncert-question-generator` → click **Create**
3. Upload all these files by clicking **"uploading an existing file"**:
   - `package.json`
   - `vite.config.js`
   - `netlify.toml`
   - `index.html`
   - `src/main.jsx`
   - `src/App.jsx`
   - `netlify/functions/generate.js`

---

### Step 3 — Deploy on Netlify

1. Go to https://netlify.com and sign up (free)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** → select your `ncert-question-generator` repo
4. Build settings will auto-fill from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **"Deploy site"**

---

### Step 4 — Add your Gemini API Key

1. In Netlify dashboard → go to your site
2. Click **Site configuration** → **Environment variables**
3. Click **"Add a variable"**
4. Key: `GEMINI_API_KEY`
5. Value: paste your key from Step 1
6. Click **Save**
7. Go to **Deploys** → click **"Trigger deploy"** → **Deploy site**

---

### Step 5 — Done! 🎉

Your app is live at `https://your-site-name.netlify.app`

---

## 📁 Project Structure

```
ncert-question-generator/
├── index.html                    # HTML entry point
├── package.json                  # Dependencies
├── vite.config.js                # Vite bundler config
├── netlify.toml                  # Netlify build + routing config
├── src/
│   ├── main.jsx                  # React entry
│   └── App.jsx                   # Main app UI
└── netlify/
    └── functions/
        └── generate.js           # Serverless function (calls Gemini API securely)
```

## 🔒 How the API key stays secret

The Gemini API key is stored as a **Netlify environment variable** — it never touches your frontend code. The `netlify/functions/generate.js` file runs as a serverless function on Netlify's servers and calls Gemini on your behalf.

## 🆓 Gemini Free Tier Limits

- 15 requests per minute
- 1,500 requests per day
- Completely free, no credit card needed
