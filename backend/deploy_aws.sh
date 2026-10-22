#!/usr/bin/env bash
# ==============================================================================
# EcoPulse - AWS Automated Deployment Script
# Supports: Ubuntu 20.04/22.04/24.04, Debian 11/12, Amazon Linux 2023
# Usage:
#   chmod +x deploy_aws.sh
#   ./deploy_aws.sh
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "=================================================================="
echo "      ECOPULSE BACKEND - AWS FAST DOCKER DEPLOYMENT"
echo "=================================================================="
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo -e "${BLUE}[*] Working directory:${NC} $SCRIPT_DIR"

echo -e "\n${BLUE}[1/5] Checking Docker & Docker Compose installation...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[!] Docker not found. Installing Docker Engine...${NC}"

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        OS="unknown"
    fi

    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        echo -e "${YELLOW}[*] Updating apt repositories...${NC}"
        sudo apt-get update -y
        sudo apt-get install -y ca-certificates curl gnupg lsb-release

        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
        sudo chmod a+r /etc/apt/keyrings/docker.gpg

        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
          sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

        sudo apt-get update -y
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    elif [ "$OS" = "almalinux" ] || [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        echo -e "${YELLOW}[*] Installing Docker for RedHat/Amazon Linux...${NC}"
        sudo dnf install -y docker
        sudo systemctl enable --now docker
        
        DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
        sudo mkdir -p $DOCKER_CONFIG/cli-plugins
        sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) -o $DOCKER_CONFIG/cli-plugins/docker-compose
        sudo chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
    else
        echo -e "${YELLOW}[*] Installing Docker using standard convenience script...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm -f get-docker.sh
    fi

    sudo systemctl enable docker || true
    sudo systemctl start docker || true

    if [ "$USER" != "root" ]; then
        sudo usermod -aG docker "$USER" || true
    fi
else
    echo -e "${GREEN}[OK] Docker is already installed: $(docker --version)${NC}"
fi

if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}[ERROR] Neither 'docker compose' nor 'docker-compose' found.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Using compose command:${NC} $DOCKER_COMPOSE"

echo -e "\n${BLUE}[2/5] Setting up environment configuration (.env)...${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}[*] Generating secure production .env configuration...${NC}"
    
    GEN_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))" 2>/dev/null || openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | head -c 50)
    GEN_DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))" 2>/dev/null || openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

    PUBLIC_IP=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s --connect-timeout 2 https://ifconfig.me 2>/dev/null || echo "*")

    cat <<EOF > .env
# Auto-generated Production Environment Configuration
SECRET_KEY=${GEN_SECRET_KEY}
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,${PUBLIC_IP},*

PORT=8000

# PostgreSQL Configuration
DB_NAME=waste_management
DB_USER=ecopulse_user
DB_PASSWORD=${GEN_DB_PASSWORD}
DB_HOST=db
DB_PORT=5432
DB_SSL_REQUIRE=False

# CORS and CSRF
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://ecopulse-nine-pi.vercel.app,http://${PUBLIC_IP}:5173,http://${PUBLIC_IP}:8000
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://ecopulse-nine-pi.vercel.app,http://${PUBLIC_IP}:8000

# Gunicorn Workers
GUNICORN_WORKERS=3
GUNICORN_THREADS=2
GUNICORN_TIMEOUT=120
EOF
    echo -e "${GREEN}[OK] Created .env with random secure SECRET_KEY and DB_PASSWORD.${NC}"
else
    echo -e "${GREEN}[OK] Existing .env file detected.${NC}"
fi

echo -e "\n${BLUE}[3/5] Building and launching Docker containers...${NC}"

sudo $DOCKER_COMPOSE down --remove-orphans || true
sudo $DOCKER_COMPOSE build --pull
sudo $DOCKER_COMPOSE up -d

echo -e "${GREEN}[OK] Containers started.${NC}"

echo -e "\n${BLUE}[4/5] Verifying database connectivity and container health...${NC}"

MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if sudo $DOCKER_COMPOSE ps | grep -q "ecopulse_backend.*Up"; then
        echo -e "${GREEN}[OK] ecopulse_backend container is running!${NC}"
        break
    fi
    sleep 2
    WAITED=$((WAITED+2))
    echo -n "."
done

echo -e "\n${BLUE}[5/5] Deployment verification...${NC}"

sudo $DOCKER_COMPOSE ps

PUBLIC_IP=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s --connect-timeout 2 https://ifconfig.me 2>/dev/null || echo "<YOUR_AWS_PUBLIC_IP>")

echo -e "${GREEN}"
echo "=================================================================="
echo "          ECOPULSE BACKEND IS SUCCESSFULLY DEPLOYED!"
echo "=================================================================="
echo -e "${NC}"
echo -e "API Base URL:     ${CYAN}http://${PUBLIC_IP}:8000/api/${NC}"
echo -e "Admin Panel:      ${CYAN}http://${PUBLIC_IP}:8000/admin/${NC}"
echo -e "Swagger/Docs:     ${CYAN}http://${PUBLIC_IP}:8000/api/waste/${NC}"
echo ""
echo -e "${YELLOW}Useful Management Commands:${NC}"
echo -e "  View Live Logs:       ${PURPLE}sudo $DOCKER_COMPOSE logs -f backend${NC}"
echo -e "  Create Superuser:     ${PURPLE}sudo $DOCKER_COMPOSE exec backend python manage.py createsuperuser${NC}"
echo -e "  Restart Containers:   ${PURPLE}sudo $DOCKER_COMPOSE restart${NC}"
echo -e "  Stop Containers:      ${PURPLE}sudo $DOCKER_COMPOSE down${NC}"
echo ""
echo -e "${YELLOW}AWS EC2 Security Group Checklist:${NC}"
echo -e "  Ensure your EC2 Security Group has an inbound rule allowing:"
echo -e "  - Type: Custom TCP"
echo -e "  - Port: ${GREEN}8000${NC}"
echo -e "  - Source: ${GREEN}0.0.0.0/0${NC} (Anywhere)"
echo "=================================================================="
