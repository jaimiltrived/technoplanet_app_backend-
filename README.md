# RKU Technoplanet Backend API

Backend API for RKU Technoplanet App, deployed at `https://api.techno.rku.ac.in/`.

---

## ⚡ Automated Universal CI/CD Deployment Setup

This project is configured so that **any server** (VPS, Linux VM, Ubuntu, cloud server, or container instance) can accept and execute automatic CI/CD deployments seamlessly whenever code is pushed to GitHub.

---

## 🤖 3 Automatic Deployment Methods

Choose whichever deployment method matches your server environment:

### Method 1: Automatic GitHub Actions Deployment (Recommended)

When you push code to `main`, GitHub Actions automatically tests, builds, and deploys to your server using **SSH**:

1. Add your server secrets in GitHub (**Settings > Secrets and variables > Actions**):
   - `SERVER_HOST`: `api.techno.rku.ac.in` (or server IP)
   - `SERVER_USER`: `root` or your SSH username
   - `SERVER_SSH_KEY`: Your SSH private key
   - `TARGET_DIR`: `/var/www/rku-backend` (path to app on server)

Whenever you push to `main`, GitHub Actions automatically connects to your server and executes `bash scripts/deploy-server.sh`.

---

### Method 2: Automatic Webhook Auto-Deploy Listener

If you don't want to manage SSH keys, you can run the built-in webhook listener on your server:

1. On your server, run the webhook listener (e.g. via PM2):
   ```bash
   pm2 start scripts/webhook-listener.js --name rku-auto-deploy
   ```
2. In your GitHub repository (**Settings > Webhooks > Add webhook**):
   - **Payload URL**: `https://api.techno.rku.ac.in/deploy-webhook` (or `http://YOUR_SERVER_IP:9000/deploy-webhook`)
   - **Content type**: `application/json`
   - **Trigger**: Push events

Whenever a `git push` happens, GitHub calls the webhook and your server automatically updates itself!

---

### Method 3: One-Command Manual/Scripted Deploy on Any Server

On any server where the project is cloned, you can run a single command to automatically pull latest code, run Prisma migrations, build client, and reload PM2 / Docker:

```bash
npm run deploy
```
*Or directly execute:*
```bash
bash scripts/deploy-server.sh
```

---

## 🛠️ Local Development & Commands

- **Start Production Server**: `npm start`
- **Start Development Server**: `npm run dev`
- **Run Automated Tests**: `npm test`
- **Run Code Syntax Check**: `npm run lint`
- **Run Server Auto-Deploy**: `npm run deploy`
- **Start Webhook Listener**: `npm run webhook:start`
- **Generate Prisma Client**: `npm run prisma:generate`
- **Apply Database Migrations**: `npm run prisma:migrate`

---



```bash
# Run API and MySQL using Docker Compose
docker-compose up -d --build
```
