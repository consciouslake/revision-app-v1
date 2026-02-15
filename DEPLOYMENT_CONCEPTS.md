# Deployment Concepts & Architecture Guide

This document explains the **"Why"** and **"How"** of your recent deployment. It bridges the gap between running code on your laptop and serving it to the world from a Cloud Server.

---

## 1. The Big Picture: From Local to Cloud

When you run the app on your laptop (`localhost`), you are the only one who can see it. To make it accessible to anyone with an internet connection, we moved it to a **Cloud Server**.

### The Flow of Data
1.  **You (User)**: Write code -> Push to **GitHub**.
2.  **Cloud Server (Oracle VM)**: Download (Pull) code from **GitHub**.
3.  **Docker**: Builds the code into "Containers".
4.  **Internet**: Users visit your **Public IP**.
5.  **Firewall**: Checks if the user is allowed (Port 3000).
6.  **App**: Responds with the Revision Tracker interface.

---

## 2. Infrastructure: Oracle Cloud

We used **Oracle Cloud Infrastructure (OCI)**. Here are the components we touched:

### **Compute Instance (The Virtual Machine)**
*   **What it is:** A "slice" of a massive physical server in Oracle's data center. It acts exactly like a remote computer running Ubuntu Linux.
*   **Your Config:**
    *   **AMD E2.1 Micro:** A very small slice (1 CPU, 1GB RAM).
    *   **ARM A1 Flex:** A larger slice (4 CPUs, 24GB RAM).
*   **Why we chose it:** It's "Always Free," meaning you can run this server 24/7/365 without paying a cent.

### **Networking (VCN & Subnet)**
*   **VCN (Virtual Cloud Network):** Your private slice of the cloud network. It isolates your resources from other customers.
*   **Subnet:** A specific neighborhood within that network where your VM lives.
*   **Public IP:** The unique address (like `140.245.249.65`) that identifies your server on the public internet. Without this, no one outside the private network could reach it.

### **The Firewall (Security Lists & iptables)**
Security is tight by default. We had to open "Ports" (digital doors) to let traffic in.
*   **Port 22 (SSH):** The maintenance door. Only you (with the Key) can enter.
*   **Port 80/443 (HTTP/HTTPS):** Standard web traffic.
*   **Port 3000:** The customized door for your Frontend app.
*   **Port 8000:** The customized door for your Backend app.
*   **Why two firewalls?**
    1.  **Oracle Security List:** The gate at the edge of the data center network.
    2.  **iptables (Ubuntu Firewall):** The gate on the server itself. Both must be open for data to flow.

### **Swap Memory (The "Crash" Fix)**
*   **The Problem:** Your AMD instance has only 1GB of RAM. Building the app (compiling TypeScript/next.js) requires ~2GB+. The server would run out of memory and kill the process (Crash).
*   **The Solution (Swap File):** We reserved 4GB of **Hard Drive** space and told Linux, *"If you run out of RAM, use this slow hard drive space as emergency RAM."*
*   **Result:** The build is slower, but it doesn't crash.

---

## 3. Access: SSH & Keys

### **SSH (Secure Shell)**
This is the protocol used to control a remote computer safely. It's like using TeamViewer or Remote Desktop, but text-only and encrypted.

### **SSH Keys (The Login Method)**
Instead of a password (which can be guessed), we use a **Key Pair**:
1.  **Private Key (`.key` on your laptop):** This is your secret ID card. **Never share this.**
2.  **Public Key (`.pub` on the server):** This is the lock. You placed this on the server when you created it.
*   **Why the Permission Error?**
    *   SSH is paranoid. If your Private Key file is readable by "Everyone" on Windows, SSH thinks a hacker might have copied it, so it refuses to use it.
    *   **`icacls` Command:** We used this to strip away all permissions except for your specific User, making the key "secure" in SSH's eyes.

---

## 4. Application: Docker vs. Traditional

### **Traditional Deployment (The Hard Way)**
You would manually log into the server and:
1.  Install Python 3.10.
2.  Install Node.js 18.
3.  Install specific libraries (`pip install...`, `npm install...`).
4.  Configure background services manually.
*   **Risks:** Updates to the server OS might break your app. Different versions of Python might conflict. It "works on my machine" but not the server.

### **Docker Deployment (The Smart Way)**
We used **Docker**, which packages your app into **Containers**.
*   **Image:** A read-only "blueprint" that contains the **exact** OS, Python version, Node version, and code your app needs. It is identical on your laptop and the cloud.
*   **Container:** The running instance of that blueprint.
*   **Docker Compose:** A "Conductor" file (`docker-compose.yml`) that says: *"Hey Docker, please spin up one container for the Backend and one for the Frontend, and connect them together."*

### **Why Docker on Oracle Cloud?**
1.  **Isolation:** The app runs in its own bubble. It doesn't care if the server is Ubuntu, CentOS, or Fedora.
2.  **Consistency:** If it runs in Docker on Windows, it runs in Docker on Linux.
3.  **Cleanliness:** If you mess up, you just delete the container and start fresh. You don't break the server OS.

---

## 5. Deployment Lifecycle

Here is exactly what happened when you ran `sudo docker-compose up -d --build`:

1.  **--build**:
    *   Docker read `frontend/Dockerfile`. It downloaded a tiny Node.js Linux image, copied your code, ran `npm run build` (creating the production website), and saved this as a new Image.
    *   Docker read `backend/Dockerfile`. It downloaded a Python image, installed `requirements.txt`, and saved this as a new Image.
2.  **up**:
    *   Docker started both containers.
    *   It mounted your **Volumes** (`./backend/recall.db` mapped to the container internal path). This ensures that even if you delete the container, your Database file stays on the host server disk.
3.  **-d (Detached)**:
    *   It runs in the background. You can close your SSH window, and the app keeps running.

## Summary

You successfully built a **modern, cloud-native deployment pipeline**. You claimed a physical resource (VM), secured it (SSH/Firewall), optimized it (Swap), and deployed a portable application (Docker) that is resilient and persistent.
