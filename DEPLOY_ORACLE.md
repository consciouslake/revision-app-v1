# Recall App - Oracle Cloud Deployment Guide (The "Master Guide")

This comprehensive guide covers everything needed to deploy the Recall application to Oracle Cloud's Always Free tier, including specific fixes for Windows users and troubleshooting steps for "Out of Capacity" errors.

## Prerequisites

1.  **Oracle Cloud Account** (Free Tier).
2.  **SSH Key Pair** (Saved on your computer).
3.  **GitHub Account** (Repository accessible).

---

## Part 1: Create the Instance (Virtual Machine)

1.  Log in to **Oracle Cloud Console** -> **Compute** -> **Instances**.
2.  Click **Create Instance**.
3.  **Name:** `recall-app-server`.
4.  **Image:** **Canonical Ubuntu 22.04** (Recommended).
5.  **Shape:**
    *   **Ideal:** **Ampere (ARM) VM.Standard.A1.Flex** (4 OCPUs, 24GB RAM).
    *   **Fallback (if "Out of Capacity"):** **AMD VM.Standard.E2.1.Micro** (1 OCPU, 1GB RAM).
6.  **Networking:** Ensure **"Assign a public IPv4 address"** is selected.
7.  **SSH Keys:** Upload or paste your Public Key (`.pub` file).
8.  Click **Create**.

> **Note:** If you use the **AMD** instance (1GB RAM), you **MUST** follow the "Swap File" step below, or the server will crash.

---

## Part 2: Connect via SSH (Windows Fixes Included)

### 1. Fix Key Permissions (Windows Only)
SSH will reject keys with "too open" permissions. Run these **PowerShell** commands to fix your key file:

```powershell
# Remove "OWNER RIGHTS" generic permission (Common blocker)
icacls "C:\Path\To\Your.key" /remove "OWNER RIGHTS"

# Reset to strictly your user (If the above isn't enough)
icacls "C:\Path\To\Your.key" /c /t /inheritance:d
icacls "C:\Path\To\Your.key" /c /t /grant:r "$($env:USERNAME):F"
icacls "C:\Path\To\Your.key" /c /t /remove:g "Authenticated Users"
icacls "C:\Path\To\Your.key" /c /t /remove:g "Users"
icacls "C:\Path\To\Your.key" /c /t /remove:g "Everyone"
```

### 2. Connect
```bash
ssh -i "C:\Path\To\Your.key" ubuntu@<YOUR_PUBLIC_IP>
```
*(If `ubuntu` fails, try `opc` if you chose Oracle Linux).*

---

## Part 3: Essential Server Setup

### 1. Create Swap File (CRITICAL for AMD Instance)
If you are on the 1GB RAM AMD instance, run this immediately:

```bash
# Create 4GB Swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
# (You should see 'Swap: 4.0Gi')
```

### 2. Install Docker & Git
```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io docker-compose git -y

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (so you don't need sudo for docker)
sudo usermod -aG docker $USER
newgrp docker
```

---

## Part 4: Deploy Configuration

### 1. Clone & Checkout
```bash
git clone https://github.com/consciouslake/revision-app-v1.git
cd revision-app-v1

# Switch to deployment branch
git fetch --all
git checkout oracle-deploy
git pull origin oracle-deploy
```

### 2. Configure Environment Variables
You need two `.env` files.

**Backend (.env):**
```bash
nano backend/.env
```
粘贴 these content:
```ini
GOOGLE_API_KEY=your_actual_api_key_here
chroma_db_impl=duckdb+parquet
PERSIST_DIRECTORY=/chroma/db
```
*(Save: Ctrl+X, Y, Enter)*

**Frontend (.env):**
```bash
nano frontend/.env
```
Paste these content:
```ini
NEXT_PUBLIC_API_URL=http://<YOUR_PUBLIC_IP>:8000
```
*(Save: Ctrl+X, Y, Enter)*

---

## Part 5: Firewall Configuration (The "Connection Timeout" Fix)

You must open ports **3000** (Frontend) and **8000** (Backend) in **TWO** places.

### 1. Oracle Cloud Console (Security List)
1.  Go to **Instance Details** -> **Subnet** -> **Security List**.
2.  **Add Ingress Rules**:
    *   **Source:** `0.0.0.0/0`
    *   **Protocol:** TCP
    *   **Ports:** `3000, 8000, 80, 443`

### 2. Ubuntu Firewall (Inside SSH)
Run these commands on the server:

```bash
# Flush default strict rules (Optional but helps)
sudo iptables -F

# Allow Ports
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT

# Save Persistence
sudo netfilter-persistent save
```

---

## Part 6: Start the Application

```bash
# Build and Run
sudo docker-compose up -d --build
```

**Access your app:** `http://<YOUR_PUBLIC_IP>:3000`

---

## Part 7: Data Maintenance

### Backup Data (Download to Local)
Run this on your **Local Computer** to save your DBs:
```bash
scp -r -i "path/to/key" ubuntu@<IP>:~/revision-app-v1/backend/recall.db ./backup/
scp -r -i "path/to/key" ubuntu@<IP>:~/revision-app-v1/backend/chroma_db ./backup/
```
