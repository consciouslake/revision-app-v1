# Recall App - Oracle Cloud Deployment Guide

This guide walks you through deploying the Recall application to an Oracle Cloud Infrastructure (OCI) Compute Instance.

## Prerequisites

1.  **Oracle Cloud Account** (Free Tier is sufficient).
2.  **SSH Key Pair** (for connecting to the VM).
3.  **GitHub Account** (to pull this repository).

## Step 1: Create a Compute Instance

1.  Log in to the **Oracle Cloud Console**.
2.  Go to **Compute** -> **Instances**.
3.  Click **Create Instance**.
4.  **Name:** `recall-app-server` (or any name).
5.  **Image & Shape:**
    *   **Image:** Canonical Ubuntu 22.04 (recommended) or Oracle Linux 8.
    *   **Shape:** `VM.Standard.A1.Flex` (Ampere / ARM) is great for performance in Free Tier. Standard AMD/Intel shapes work too.
6.  **Networking:**
    *   Create a new VCN or select existing one.
    *   Ensure **Assign a public IPv4 address** is selected.
7.  **Add SSH Keys:** Paste your public SSH key (`.pub` file content).
8.  Click **Create**.

## Step 2: Configure Security List (Open Ports)

1.  Click on your new instance name.
2.  Click on the **Subnet** link under "Primary VNIC".
3.  Click on the **Security List** (e.g., `Default Security List for...`).
4.  Click **Add Ingress Rules**.
5.  Add the following rules:
    *   **Source CIDR:** `0.0.0.0/0`
    *   **Destination Port Range:** `80, 443, 3000, 8000`
    *   **Protocol:** TCP
6.  Click **Add Ingress Rules**.

*(Note: You might also need to open ports in the VM's internal firewall later.)*

## Step 3: Connect to the Instance

Use your terminal (PowerShell or Bash) to SSH into the server:

```bash
ssh -i path/to/private/key ubuntu@<YOUR_INSTANCE_PUBLIC_IP>
# Note: User is 'opc' for Oracle Linux, 'ubuntu' for Ubuntu.
```

## Step 4: Install Docker & Git

Run these commands on the server:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Install Git
sudo apt install git -y

# Apply group changes (exit and log back in, or run this):
newgrp docker
```

## Step 5: Deploy the Application

```bash
# 1. Clone the repository
git clone https://github.com/consciouslake/revision-app-v1.git
cd revision-app-v1

# 2. Switch to the deployment branch
git checkout oracle-deploy

# 3. Create .env file for backend
# Copy your Gemini API Key here!
nano backend/.env
# Paste: GOOGLE_API_KEY=your_key_here
# Save (Ctrl+S) and Exit (Ctrl+X)

# 4. Create .env for frontend (optional if hardcoded in Dockerfile, but good practice)
nano frontend/.env
# Paste: NEXT_PUBLIC_API_URL=http://<YOUR_INSTANCE_PUBLIC_IP>:8000
```

## Step 6: Start the Application

```bash
# Build and run containers
docker-compose up -d --build
```

## Step 7: Data Migration (Optional)

Since the cloud instance starts empty, you might want to upload your local data.

**On your Local Machine (not the server):**
Use `scp` to copy your backup files.

```bash
# Upload Database
scp -i path/to/key backend/recall.db ubuntu@<IP>:~/revision-app-v1/backend/

# Upload PDFs (Recursive)
scp -r -i path/to/key backend/uploads ubuntu@<IP>:~/revision-app-v1/backend/
```

## Step 8: Access the App

Open your browser and visit: `http://<YOUR_INSTANCE_PUBLIC_IP>:3000`

---

## Troubleshooting

*   **Ports not working?** Check the internal firewall (iptables):
    ```bash
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
    sudo netfilter-persistent save
    ```
*   **Docker permission denied?** Ensure you ran `newgrp docker` or `sudousermod -aG docker $USER`.
