# Upstox GTT Wrapper

## Overview

This repository provides a custom implementation of **Good Till Trigger (GTT) orders** for the **Upstox trading platform**. It uses the **Upstox Live Feed Wrapper** to monitor live price updates via WebSockets and automate trade execution based on entry, exit, and stop-loss parameters.

## Prerequisites

1. **Redis** must be installed and running locally on the default port (`6379`).
2. You must have the **Upstox Live Feed Wrapper** service running locally.

## Setup and Execution

### Steps to Run Both Repositories Locally

1. **Start Redis**
   - Ensure Redis is installed and running on your machine:
     ```bash
     sudo apt update
     sudo apt install redis-server
     sudo systemctl start redis
     ```
   - Verify Redis is running:
     ```bash
     redis-cli ping
     ```
     Expected response: `PONG`.

2. **Run Upstox Live Feed Wrapper**
   - Clone and start the Upstox Live Feed Wrapper repository:
     ```bash
     git clone <live-feed-wrapper-repo-url>
     cd <live-feed-wrapper-folder>
     npm install
     npm run dev
     ```

3. **Run Upstox GTT Wrapper**
   - Clone and start this repository:
     ```bash
     git clone <this-repo-url>
     cd <this-repo-folder>
     npm install
     npm run dev
     ```

4. **Initialize Monitoring**
   - Make a POST request to `/monitor-init` with your Upstox `access_token`:
     ```bash
     curl -X POST http://localhost:3000/monitor-init \
     -H "Content-Type: application/json" \
     -d '{"access_token": "your_upstox_access_token"}'
     ```
   - Wait for **5 minutes** for the monitoring service to initialize.

5. **Place Orders**
   - Use the `/place-order` API to start placing orders.

## API Endpoints

### 1. Initialize Monitoring

**Endpoint**:  
`POST /monitor-init`  

**Request Body**:
```json
{
  "access_token": "string"
}
```
