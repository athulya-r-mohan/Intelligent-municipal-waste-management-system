# EcoPulse Backend - AWS Deployment & Docker Guide

This guide walks you through deploying the **EcoPulse Municipal Waste Management System Backend** on AWS using **Docker** and **PostgreSQL**.

---

## Architecture Overview

```
                                      AWS EC2 / Cloud VM
                   ┌────────────────────────────────────────────────────────┐
                   │                                                        │
                   │   ┌────────────────────────────────────────────────┐   │
                   │   │              ecopulse_backend                  │   │
                   │   │         (Django + Gunicorn + WhiteNoise)       │   │
Incoming Requests  │   │          Python 3.11 + YOLO (Ultralytics)      │   │
───────────────────┼──>│               Port 8000                        │   │
                   │   └──────────────────────┬─────────────────────────┘   │
                   │                          │ internal network            │
                   │                          ▼ (port 5432)                 │
                   │   ┌────────────────────────────────────────────────┐   │
                   │   │              ecopulse_postgres                 │   │
                   │   │             (PostgreSQL 16 Alpine)             │   │
                   │   │              Persistent Data Volume            │   │
                   │   └────────────────────────────────────────────────┘   │
                   │                                                        │
                   └────────────────────────────────────────────────────────┘
```

---

## Prerequisites (AWS EC2)

1. **Recommended Instance Type**:
   - **`t3.medium`** (2 vCPU, 4 GiB RAM) or **`t3.small`** (minimum 2 GiB RAM).
   - *Note: `ultralytics` / PyTorch model inference requires at least 1.5 - 2 GB of available RAM.*
2. **OS**:
   - **Ubuntu 22.04 LTS** / **Ubuntu 24.04 LTS** (or Amazon Linux 2023).
3. **Security Group Inbound Rules**:
   | Type | Protocol | Port | Source | Description |
   | :--- | :--- | :--- | :--- | :--- |
   | **SSH** | TCP | `22` | `My IP` | SSH Access |
   | **Custom TCP** | TCP | `8000` | `0.0.0.0/0` | Django Backend API |
   | **HTTP** *(Optional)* | TCP | `80` | `0.0.0.0/0` | Web Traffic |
   | **HTTPS** *(Optional)* | TCP | `443` | `0.0.0.0/0` | Secure SSL Traffic |

---

## Fast & Easy 1-Click Installation (`deploy_aws.sh`)

Once connected to your AWS EC2 instance via SSH:

### Step 1: Clone the Repository
```bash
git clone https://github.com/athulya-r-mohan/Intelligent-municipal-waste-management-system.git
cd Intelligent-municipal-waste-management-system
```

### Step 2: Make the script executable & Run
```bash
chmod +x deploy_aws.sh
./deploy_aws.sh
```

### What `deploy_aws.sh` does automatically:
1. Installs **Docker Engine** & **Docker Compose** (if not already installed).
2. Generates a secure, cryptographically random `SECRET_KEY` and PostgreSQL password.
3. Automatically sets up `.env` with the AWS instance public IP and database connection.
4. Builds the optimized backend container with system libraries for **OpenCV**, **Ultralytics (YOLO)**, and **PostgreSQL**.
5. Starts the **PostgreSQL 16** container with persistent volume data (`ecopulse_postgres_data`).
6. Runs database migrations (`python manage.py migrate`).
7. Collects static assets (`python manage.py collectstatic`) via WhiteNoise.
8. Launches **Gunicorn** on `0.0.0.0:8000`.

---

## Manual Deployment (Using Docker Compose)

If you prefer to run Docker Compose commands manually:

```bash
cd backend

# 1. Create environment file from template
cp .env.example .env

# 2. Build and start containers in the background
docker compose up -d --build

# 3. Check container logs
docker compose logs -f backend
```

---

## Helpful Operations & Management Commands

### 1. View Live Backend Logs
```bash
docker compose logs -f backend
```

### 2. View Database Logs
```bash
docker compose logs -f db
```

### 3. Create Django Superuser (Admin)
```bash
docker compose exec backend python manage.py createsuperuser
```

### 4. Seed Initial Data (Wards, Admin, Demo Pickups)
```bash
docker compose exec backend python seed_docker_db.py
```

### 5. Access Django Python Shell
```bash
docker compose exec backend python manage.py shell
```

### 6. Connect Directly to PostgreSQL Database Inside Docker
```bash
docker compose exec db psql -U ecopulse_user -d waste_management
```

### 7. Restart or Stop Containers
```bash
# Restart
docker compose restart

# Stop
docker compose down

# Stop and wipe database volume (WARNING: deletes all database records)
docker compose down -v
```

---

## Connecting the Frontend to the AWS Backend

In your frontend application:
Open `frontend/src/api/api.js` and set the `baseURL` to your AWS EC2 Public IP or custom domain:

```javascript
export const BASE_URL = "http://<YOUR_AWS_EC2_PUBLIC_IP>:8000";
export const API_BASE_URL = `${BASE_URL}/api`;

const API = axios.create({
    baseURL: API_BASE_URL
});

export default API;
```

---

## Adding a Custom Domain & SSL (`add_domain.sh`)

When you want to connect a custom domain (e.g., `api.ecopulse.org` or `backend.yourdomain.com`) and secure it with free Let's Encrypt SSL (HTTPS):

### Step 1: Point your DNS
In your DNS provider (Route 53, Cloudflare, GoDaddy, Namecheap):
- Create an **A Record** pointing `api.yourdomain.com` to your **AWS EC2 Public IP**.

### Step 2: Run `add_domain.sh`
On your AWS EC2 instance:
```bash
chmod +x add_domain.sh

# Interactive Wizard:
./add_domain.sh

# Or 1-line command with SSL:
./add_domain.sh -d api.ecopulse.org -f ecopulse.vercel.app --ssl -e admin@ecopulse.org
```

### What `add_domain.sh` does automatically:
1. Safely backs up `.env` to `.env.bak.<timestamp>`.
2. Appends your domain to `ALLOWED_HOSTS` in `.env`.
3. Adds `https://` and `http://` variants to `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS`.
4. Recreates the backend Docker container so Django applies the new configuration immediately.
5. *(Optional / Recommended)* Sets up **Nginx reverse proxy** (proxying port 80/443 to Gunicorn port 8000) and provisions an automated **Let's Encrypt SSL certificate** via Certbot.

---

## Continuous Deployment (CI/CD with GitHub Actions)

An automated deployment pipeline is configured in [`.github/workflows/deploy-backend.yml`](.github/workflows/deploy-backend.yml). Every time you push backend changes to the `main` branch, GitHub Actions automatically connects to your AWS EC2 instance, pulls the new code, rebuilds the container, and runs migrations without downtime.

### Required GitHub Secrets:
Go to **GitHub Repo** ➔ **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ **New repository secret**:

| Secret Name | Value | Example |
| :--- | :--- | :--- |
| `EC2_HOST` | Your EC2 Public IP or Domain | `ecopulse.femsphere.me` or `18.60.39.148` |
| `EC2_USER` | EC2 SSH username | `ubuntu` |
| `EC2_SSH_KEY` | Entire content of your `.pem` private key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `EC2_PORT` *(Optional)* | SSH port (defaults to 22) | `22` |


