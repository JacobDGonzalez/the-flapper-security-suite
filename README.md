# Installing Node.js and Setting Up the Project

This guide explains how to install Node.js on your system and then install Node dependencies in both the **root** directory and the **API** directory for this project.[file:5]

> Note: Use the **LTS** (Long-Term Support) version of Node.js for best stability.[web:11]

---

## 1. Install Node.js on Your System

### 1.1 Windows

1. Go to https://nodejs.org and download the **Windows Installer (LTS)** `.msi`.[web:13]
2. Run the installer, accept the license, keep the default options (ensure **npm** is selected), and complete the setup.[web:17]
3. Close and reopen Command Prompt or PowerShell.
4. Verify the installation:
   ```bash
   node -v
   npm -v
1.2 macOS
Go to https://nodejs.org and download the macOS Installer (LTS) .pkg.[web:13][web:21]

Run the installer, accept the license, and complete the setup using the default options.[web:21]

Open the Terminal app.

Verify the installation:

bash
node -v
npm -v
1.3 Linux (Ubuntu/Debian example)
Update your package index:

bash
sudo apt update
Install Node.js and npm:

bash
sudo apt install -y nodejs npm
```[web:16]
Verify the installation:

bash
node -v
npm -v
2. Project Structure Overview
Your project is a Vite + React + TypeScript app with a package.json in the root directory.[file:5][file:8]

Typical structure (simplified):

text
project-root/
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  src/
    App.tsx
    index.tsx
  api/           # (API directory – create this if it does not exist)
    package.json # (API’s own dependencies and scripts)
The root directory hosts the front‑end app (Vite/React/TypeScript).[file:5][file:8]
The api directory hosts the backend/API (Node server).

3. Install Node Dependencies in the Root Directory
Open a terminal/command prompt.

Navigate to the project root (where package.json is located).[file:5]

bash
cd /path/to/your/project-root
Install Node dependencies (this uses the root package.json).[file:5]

bash
npm install
To start the development server (Vite on port 3000 by default):[file:5][file:8]

bash
npm run dev
4. Install Node Dependencies in the API Directory
These steps assume you have an api folder containing its own package.json. If it does not exist yet, you or your backend dev will need to initialize it with npm init -y first.

From the project root, navigate into the API directory:

bash
cd api
Install the API dependencies (using the api/package.json):

bash
npm install
If your API has a start script defined (for example "start": "node server.js"), run:

bash
npm run start
5. Running Frontend and API Together
In one terminal, from the root:

bash
npm run dev
In another terminal, from the api directory:

bash
cd /path/to/your/project-root/api
npm run start
The frontend (Vite) will run on port 3000, and your API is typically configured to run on another port (for example 3001) and is consumed via fetch calls in the React app.[file:1][file:8]