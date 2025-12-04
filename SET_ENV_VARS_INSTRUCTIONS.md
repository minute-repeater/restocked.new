# Setting Environment Variables - Step by Step

## Railway (Backend)

1. Go to: https://railway.app/
2. Select your project → **Backend service**
3. Click **Variables** tab
4. Click **+ New Variable** (add each one separately):

   **Variable 1:**
   - Key: `GOOGLE_CLIENT_ID`
   - Value: `<paste your Client ID from Google Cloud Console>`
   - Click **Add**

   **Variable 2:**
   - Key: `GOOGLE_CLIENT_SECRET`
   - Value: `<paste your Client Secret from Google Cloud Console>`
   - Click **Add**

   **Variable 3:**
   - Key: `GOOGLE_REDIRECT_URL`
   - Value: `https://restockednew-production.up.railway.app/auth/google/callback`
   - Click **Add**

5. Railway will automatically redeploy (watch the Deployments tab)

## Vercel (Frontend)

1. Go to: https://vercel.com/
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in:
   - **Key:** `VITE_GOOGLE_OAUTH_ENABLED`
   - **Value:** `true`
   - **Environments:** Select **Production**, **Preview**, **Development**
   - Click **Save**

6. Vercel will automatically redeploy (watch the Deployments tab)

## After Setting Variables

Wait for both deployments to complete, then we'll verify.
