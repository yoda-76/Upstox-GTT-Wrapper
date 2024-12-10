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



**Description:**
Starts monitoring for instruments linked to the provided access_token.

### 2. Place Order
**Endpoint**: 
`POST /place-order`

**Request Body**:
```json
{
  "access_token": "string",
  "orderDetails": {
    "broker": "ZERODHA" | "UPSTOX",
    "baseInstrument": "string",
    "instrumentType": "FUT" | "OPT" | "EQ",
    "expiry": "string | null",
    "strike": "number | null",
    "optionType": "CE" | "PE" | null,
    "exchange": "NSE" | "BSE",
    "qty": "number",
    "entryPrice": "number",
    "exitPrice": "number",
    "entryRange": "[number, number] | null",
    "exitRange": "[number, number] | null",
    "stopLoss": "number",
    "orderType": "LIMIT" | "MARKET" | "SL" | "SL-M",
    "side": "BUY" | "SELL",
    "productType": "I" | "D"
  }
}
```

**Description:**
Places an order with the provided details.

### 3. Cancel Order
**Endpoint**: 
`POST /cancel-order`

**Request Body**:
```json
{
  "access_token": "string",
  "order_id": "string"
}
```
**Description:**
Cancels an order by order_id.

### Example Workflow
**Start Monitoring:**

```bash
curl -X POST http://localhost:3000/monitor-init \
-H "Content-Type: application/json" \
-d '{"access_token": "your_upstox_access_token"}'
```
**Place an Order:**

```bash
curl -X POST http://localhost:3000/place-order \
-H "Content-Type: application/json" \
-d '{
  "access_token": "your_access_token",
  "orderDetails": {
    "broker": "UPSTOX",
    "baseInstrument": "RELIANCE",
    "instrumentType": "EQ",
    "expiry": null,
    "strike": null,
    "optionType": null,
    "exchange": "NSE",
    "qty": 100,
    "entryPrice": 2500,
    "exitPrice": 2600,
    "entryRange": null,
    "exitRange": null,
    "stopLoss": 2450,
    "orderType": "LIMIT",
    "side": "BUY",
    "productType": "I"
  }
}'
```
**Cancel an Order:**

```bash
curl -X POST http://localhost:3000/cancel-order \
-H "Content-Type: application/json" \
-d '{
  "access_token": "your_access_token",
  "order_id": "order_id_here"
}'
```

### How It Works
**Live Feed:** The Upstox Live Feed Wrapper service handles the WebSocket connection to fetch real-time LTP data.
Order Monitoring: This service monitors the LTP and triggers trades based on predefined entry price, exit price, and stop-loss levels.
**API Usage:** Use REST APIs to initialize monitoring, place orders, and cancel orders.
**Limitations**
WebSocket Dependency: The system relies on uninterrupted WebSocket connectivity via the Upstox Live Feed Wrapper.
Initialization Delay: Monitoring initialization takes approximately 5 minutes.
License
