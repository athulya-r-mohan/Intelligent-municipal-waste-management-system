#!/usr/bin/env bash
# ==============================================================================
# EcoPulse - Add Custom Domain & SSL to Backend
# Supports: Ubuntu 20.04/22.04/24.04, Debian 11/12, Amazon Linux 2023, RedHat
#
# Usage:
#   chmod +x add_domain.sh
#   ./add_domain.sh [domain] [flags]
#
# Examples:
#   ./add_domain.sh api.ecopulse.org
#   ./add_domain.sh api.ecopulse.org --frontend app.ecopulse.org --ssl
#   ./add_domain.sh (Interactive Wizard)
# ==============================================================================

set -e

# Terminal Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "=================================================================="
echo "         ECOPULSE BACKEND - CONFIGURE CUSTOM DOMAIN"
echo "=================================================================="
echo -e "${NC}"

# ------------------------------------------------------------------------------
# 1. Directory Detection
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/backend" ]; then
    PROJECT_ROOT="$SCRIPT_DIR"
    BACKEND_DIR="$SCRIPT_DIR/backend"
else
    PROJECT_ROOT="$SCRIPT_DIR/.."
    BACKEND_DIR="$SCRIPT_DIR"
fi

for arg in "$@"; do
    if [ "$arg" = "-h" ] || [ "$arg" = "--help" ]; then
        echo -e "${BOLD}Usage:${NC} ./add_domain.sh [domain] [options]"
        echo ""
        echo -e "${BOLD}Options:${NC}"
        echo "  -d, --domain <domain>        Backend API domain (e.g. api.ecopulse.org)"
        echo "  -f, --frontend <domain>      Frontend domain to allow in CORS/CSRF (e.g. app.ecopulse.org)"
        echo "  -s, --ssl                    Configure Nginx reverse proxy + Let's Encrypt SSL (HTTPS: 443)"
        echo "  -e, --email <email>          Email address for Let's Encrypt SSL renewal notices"
        echo "  --no-ssl                     Skip Nginx / SSL configuration (only update Django .env)"
        echo "  -h, --help                   Show this help message"
        echo ""
        echo -e "${BOLD}Examples:${NC}"
        echo "  ./add_domain.sh api.ecopulse.org"
        echo "  ./add_domain.sh -d api.ecopulse.org -f ecopulse.vercel.app --ssl -e admin@ecopulse.org"
        exit 0
    fi
done

cd "$BACKEND_DIR"
ENV_FILE="$BACKEND_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        echo -e "${YELLOW}[!] .env not found. Creating from .env.example...${NC}"
        cp "$BACKEND_DIR/.env.example" "$ENV_FILE"
    else
        echo -e "${RED}[ERROR] Neither .env nor .env.example found in $BACKEND_DIR.${NC}"
        exit 1
    fi
fi


# ------------------------------------------------------------------------------
# 2. Command Line Arguments Parsing
# ------------------------------------------------------------------------------
BACKEND_DOMAIN=""
FRONTEND_DOMAIN=""
SETUP_SSL="auto"
ADMIN_EMAIL=""

print_help() {
    echo -e "${BOLD}Usage:${NC} ./add_domain.sh [domain] [options]"
    echo ""
    echo -e "${BOLD}Options:${NC}"
    echo "  -d, --domain <domain>        Backend API domain (e.g. api.ecopulse.org)"
    echo "  -f, --frontend <domain>      Frontend domain to allow in CORS/CSRF (e.g. app.ecopulse.org)"
    echo "  -s, --ssl                    Configure Nginx reverse proxy + Let's Encrypt SSL (HTTPS: 443)"
    echo "  -e, --email <email>          Email address for Let's Encrypt SSL renewal notices"
    echo "  --no-ssl                     Skip Nginx / SSL configuration (only update Django .env)"
    echo "  -h, --help                   Show this help message"
    echo ""
    echo -e "${BOLD}Examples:${NC}"
    echo "  ./add_domain.sh api.ecopulse.org"
    echo "  ./add_domain.sh -d api.ecopulse.org -f ecopulse.vercel.app --ssl -e admin@ecopulse.org"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            print_help
            ;;
        -d|--domain)
            BACKEND_DOMAIN="$2"
            shift 2
            ;;
        -f|--frontend)
            FRONTEND_DOMAIN="$2"
            shift 2
            ;;
        -s|--ssl)
            SETUP_SSL="yes"
            shift
            ;;
        --no-ssl)
            SETUP_SSL="no"
            shift
            ;;
        -e|--email)
            ADMIN_EMAIL="$2"
            shift 2
            ;;
        *)
            if [ -z "$BACKEND_DOMAIN" ]; then
                BACKEND_DOMAIN="$1"
            elif [ -z "$FRONTEND_DOMAIN" ]; then
                FRONTEND_DOMAIN="$1"
            fi
            shift
            ;;
    esac
done

# ------------------------------------------------------------------------------
# 3. Interactive Prompts (if not provided via CLI flags)
# ------------------------------------------------------------------------------
if [ -z "$BACKEND_DOMAIN" ]; then
    echo -e "${YELLOW}Please enter the domain for your Django backend API:${NC}"
    read -rp "  Backend Domain (e.g., api.ecopulse.org or backend.yourdomain.com): " BACKEND_DOMAIN
fi

# Clean backend domain (remove http://, https://, trailing slash, port)
BACKEND_DOMAIN=$(echo "$BACKEND_DOMAIN" | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:[0-9]*$||' | tr -d ' ')

if [ -z "$BACKEND_DOMAIN" ]; then
    echo -e "${RED}[ERROR] Backend domain cannot be empty.${NC}"
    exit 1
fi

if [ -z "$FRONTEND_DOMAIN" ]; then
    echo ""
    echo -e "${YELLOW}Optional: Enter frontend domain/origin that calls this backend (leave empty to skip):${NC}"
    read -rp "  Frontend Domain (e.g., ecopulse.vercel.app or myapp.com): " FRONTEND_DOMAIN
fi

FRONTEND_DOMAIN=$(echo "$FRONTEND_DOMAIN" | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:[0-9]*$||' | tr -d ' ')

if [ "$SETUP_SSL" = "auto" ]; then
    echo ""
    echo -e "${YELLOW}Would you like to automatically configure Nginx reverse proxy and Let's Encrypt SSL (HTTPS)?${NC}"
    echo -e "  ${BLUE}1)${NC} Yes, set up Nginx reverse proxy + SSL on port 80/443 (Recommended for production)"
    echo -e "  ${BLUE}2)${NC} No, only configure Django .env (Django runs on port 8000 directly)"
    read -rp "  Select [1/2] (Default: 1): " SSL_CHOICE
    if [ "$SSL_CHOICE" = "2" ]; then
        SETUP_SSL="no"
    else
        SETUP_SSL="yes"
    fi
fi

if [ "$SETUP_SSL" = "yes" ] && [ -z "$ADMIN_EMAIL" ]; then
    read -rp "Enter admin email for Let's Encrypt SSL certificate alerts: " ADMIN_EMAIL
fi

# ------------------------------------------------------------------------------
# 4. Helper Function: Safely Update or Append Key-Value in .env
# ------------------------------------------------------------------------------
add_items_to_env_list() {
    local KEY="$1"
    local NEW_ITEMS="$2" # comma-separated items
    
    # Read existing value if key exists
    local EXISTING_VAL=""
    if grep -q "^${KEY}=" "$ENV_FILE"; then
        EXISTING_VAL=$(grep "^${KEY}=" "$ENV_FILE" | head -n 1 | cut -d'=' -f2-)
    fi

    # Combine items uniquely
    IFS=',' read -ra ADDS <<< "$NEW_ITEMS"
    local COMBINED="$EXISTING_VAL"

    for item in "${ADDS[@]}"; do
        item=$(echo "$item" | tr -d ' ')
        [ -z "$item" ] && continue
        
        # Check if already present in comma-separated list
        if [[ ",$COMBINED," != *",$item,"* ]]; then
            if [ -z "$COMBINED" ]; then
                COMBINED="$item"
            else
                COMBINED="${COMBINED},${item}"
            fi
        fi
    done

    # Write back to .env
    if grep -q "^${KEY}=" "$ENV_FILE"; then
        python3 -c "
import sys
key = '$KEY'
new_val = '$COMBINED'
path = '$ENV_FILE'
with open(path, 'r') as f:
    lines = f.readlines()
with open(path, 'w') as f:
    for line in lines:
        if line.startswith(key + '='):
            f.write(f'{key}={new_val}\n')
        else:
            f.write(line)
" 2>/dev/null || sed -i "s|^${KEY}=.*|${KEY}=${COMBINED}|" "$ENV_FILE"
    else
        echo "${KEY}=${COMBINED}" >> "$ENV_FILE"
    fi
}

# ------------------------------------------------------------------------------
# 5. Backup and Update .env
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[1/4] Updating backend environment configuration (.env)...${NC}"

BACKUP_FILE="${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo -e "${GREEN}[OK] Backup created at:${NC} $(basename "$BACKUP_FILE")"

# 1. ALLOWED_HOSTS (hostnames without http://)
HOSTS_TO_ADD="$BACKEND_DOMAIN"
# Add wildcard subdomain if it is a 2-part root domain (e.g. example.com -> .example.com)
if [[ "$BACKEND_DOMAIN" =~ ^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$ ]]; then
    HOSTS_TO_ADD="$HOSTS_TO_ADD,.$BACKEND_DOMAIN"
fi
add_items_to_env_list "ALLOWED_HOSTS" "$HOSTS_TO_ADD"

# 2. CSRF_TRUSTED_ORIGINS (requires protocol: https:// and http://)
CSRF_TO_ADD="https://${BACKEND_DOMAIN},http://${BACKEND_DOMAIN},http://${BACKEND_DOMAIN}:8000"
if [ -n "$FRONTEND_DOMAIN" ]; then
    CSRF_TO_ADD="${CSRF_TO_ADD},https://${FRONTEND_DOMAIN},http://${FRONTEND_DOMAIN}"
fi
add_items_to_env_list "CSRF_TRUSTED_ORIGINS" "$CSRF_TO_ADD"

# 3. CORS_ALLOWED_ORIGINS
CORS_TO_ADD="https://${BACKEND_DOMAIN},http://${BACKEND_DOMAIN},http://${BACKEND_DOMAIN}:8000"
if [ -n "$FRONTEND_DOMAIN" ]; then
    CORS_TO_ADD="${CORS_TO_ADD},https://${FRONTEND_DOMAIN},http://${FRONTEND_DOMAIN}"
fi
add_items_to_env_list "CORS_ALLOWED_ORIGINS" "$CORS_TO_ADD"

echo -e "${GREEN}[OK] .env updated successfully:${NC}"
echo -e "  ALLOWED_HOSTS:        ${CYAN}$(grep '^ALLOWED_HOSTS=' "$ENV_FILE" | cut -d'=' -f2-)${NC}"
echo -e "  CSRF_TRUSTED_ORIGINS: ${CYAN}$(grep '^CSRF_TRUSTED_ORIGINS=' "$ENV_FILE" | cut -d'=' -f2-)${NC}"
echo -e "  CORS_ALLOWED_ORIGINS: ${CYAN}$(grep '^CORS_ALLOWED_ORIGINS=' "$ENV_FILE" | cut -d'=' -f2-)${NC}"

# ------------------------------------------------------------------------------
# 6. Restart Docker Container (Backend)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[2/4] Restarting Django backend container to apply new domains...${NC}"

if command -v docker &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    else
        DOCKER_COMPOSE=""
    fi

    if [ -n "$DOCKER_COMPOSE" ]; then
        if sudo $DOCKER_COMPOSE ps -q backend &> /dev/null; then
            echo -e "${YELLOW}[*] Recreating backend container with updated .env...${NC}"
            sudo $DOCKER_COMPOSE up -d backend
            echo -e "${GREEN}[OK] ecopulse_backend restarted.${NC}"
        else
            echo -e "${YELLOW}[i] Docker containers are not currently running. Start them with: sudo $DOCKER_COMPOSE up -d${NC}"
        fi
    fi
else
    echo -e "${YELLOW}[!] Docker command not found on host. Skipping container restart.${NC}"
fi

# ------------------------------------------------------------------------------
# 7. Optional Nginx & Certbot SSL Configuration
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[3/4] Web Server & SSL Configuration...${NC}"

if [ "$SETUP_SSL" = "yes" ]; then
    echo -e "${YELLOW}[*] Configuring Nginx reverse proxy for: ${BOLD}$BACKEND_DOMAIN${NC}"

    # Install Nginx and Certbot if not installed
    if ! command -v nginx &> /dev/null; then
        echo -e "${YELLOW}[*] Installing Nginx...${NC}"
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -y
            sudo apt-get install -y nginx certbot python3-certbot-nginx
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y nginx certbot python3-certbot-nginx
        fi
        sudo systemctl enable --now nginx || true
    fi

    # Create Nginx site configuration
    NGINX_CONF="/etc/nginx/sites-available/$BACKEND_DOMAIN"
    NGINX_ENABLED="/etc/nginx/sites-enabled/$BACKEND_DOMAIN"
    
    # Fallback for systems without sites-available (e.g., RedHat/Amazon Linux)
    if [ ! -d "/etc/nginx/sites-available" ]; then
        sudo mkdir -p /etc/nginx/conf.d
        NGINX_CONF="/etc/nginx/conf.d/${BACKEND_DOMAIN}.conf"
        NGINX_ENABLED=""
    fi

    echo -e "${YELLOW}[*] Writing Nginx configuration to $NGINX_CONF...${NC}"

    sudo bash -c "cat << 'EOF' > '$NGINX_CONF'
server {
    listen 80;
    listen [::]:80;
    server_name $BACKEND_DOMAIN;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";

        proxy_connect_timeout 120s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
EOF"

    # Replace variable in nginx conf
    sudo sed -i "s/\$BACKEND_DOMAIN/$BACKEND_DOMAIN/g" "$NGINX_CONF"

    # Enable site if using sites-enabled
    if [ -n "$NGINX_ENABLED" ]; then
        sudo mkdir -p /etc/nginx/sites-enabled
        sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
    fi

    # Test Nginx configuration
    echo -e "${YELLOW}[*] Testing Nginx configuration...${NC}"
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo -e "${GREEN}[OK] Nginx reverse proxy enabled.${NC}"

        # Run Certbot if requested and available
        if command -v certbot &> /dev/null; then
            echo -e "${YELLOW}[*] Requesting Let's Encrypt SSL certificate for $BACKEND_DOMAIN...${NC}"
            CERTBOT_CMD="sudo certbot --nginx -d $BACKEND_DOMAIN --non-interactive --agree-tos --redirect"
            if [ -n "$ADMIN_EMAIL" ]; then
                CERTBOT_CMD="$CERTBOT_CMD -m $ADMIN_EMAIL"
            else
                CERTBOT_CMD="$CERTBOT_CMD --register-unsafely-without-email"
            fi

            if $CERTBOT_CMD; then
                echo -e "${GREEN}[OK] Free SSL certificate installed successfully with automatic renewal!${NC}"
                FINAL_PROTO="https"
                FINAL_PORT=""
            else
                echo -e "${YELLOW}[!] Certbot DNS check failed or DNS not yet propagated.${NC}"
                echo -e "${YELLOW}    Make sure your DNS A-record points '$BACKEND_DOMAIN' to this server's public IP.${NC}"
                echo -e "${YELLOW}    You can run Certbot later with: sudo certbot --nginx -d $BACKEND_DOMAIN${NC}"
                FINAL_PROTO="http"
                FINAL_PORT=""
            fi
        else
            echo -e "${YELLOW}[!] Certbot not found. Reverse proxy is running on HTTP (port 80).${NC}"
            FINAL_PROTO="http"
            FINAL_PORT=""
        fi
    else
        echo -e "${RED}[!] Nginx configuration syntax check failed. Please check $NGINX_CONF.${NC}"
        FINAL_PROTO="http"
        FINAL_PORT=":8000"
    fi
else
    echo -e "${YELLOW}[i] Skipping Nginx/SSL setup as requested.${NC}"
    FINAL_PROTO="http"
    FINAL_PORT=":8000"
fi

# ------------------------------------------------------------------------------
# 8. Summary & Next Steps
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[4/4] Verification & Summary${NC}"

if [ "$FINAL_PROTO" = "https" ]; then
    API_URL="https://${BACKEND_DOMAIN}/api/"
    ADMIN_URL="https://${BACKEND_DOMAIN}/admin/"
elif [ "$FINAL_PORT" = "" ]; then
    API_URL="http://${BACKEND_DOMAIN}/api/"
    ADMIN_URL="http://${BACKEND_DOMAIN}/admin/"
else
    API_URL="http://${BACKEND_DOMAIN}:8000/api/"
    ADMIN_URL="http://${BACKEND_DOMAIN}:8000/admin/"
fi

echo -e "${GREEN}${BOLD}"
echo "=================================================================="
echo "          DOMAIN ADDED SUCCESSFULLY TO BACKEND!"
echo "=================================================================="
echo -e "${NC}"
echo -e "Configured Domain:  ${BOLD}${CYAN}$BACKEND_DOMAIN${NC}"
echo -e "API Base URL:       ${CYAN}$API_URL${NC}"
echo -e "Admin Panel URL:    ${CYAN}$ADMIN_URL${NC}"
if [ -n "$FRONTEND_DOMAIN" ]; then
echo -e "Allowed Frontend:   ${CYAN}$FRONTEND_DOMAIN${NC}"
fi
echo ""
echo -e "${YELLOW}${BOLD}Frontend Integration:${NC}"
echo -e "Update your frontend environment variable or ${PURPLE}frontend/src/api/api.js${NC}:"
echo -e "  ${BOLD}VITE_API_BASE_URL=${CYAN}${API_URL%/api/}${NC}"
echo ""
echo -e "${YELLOW}${BOLD}AWS Security Group Checklist:${NC}"
if [ "$SETUP_SSL" = "yes" ]; then
echo -e "  - Port ${GREEN}80 (HTTP)${NC}      -> Source: 0.0.0.0/0"
echo -e "  - Port ${GREEN}443 (HTTPS)${NC}    -> Source: 0.0.0.0/0"
fi
echo -e "  - Port ${GREEN}8000 (Direct)${NC}   -> Source: 0.0.0.0/0"
echo "=================================================================="
