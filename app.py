from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import JSONResponse
import json
import os
import secrets
import sqlite3
import time
from typing import Optional

APP_NAME = "gyg-webhook-receiver"

GYG_BASIC_USER = os.getenv("GYG_BASIC_USER", "gyg")
GYG_BASIC_PASS = os.getenv("GYG_BASIC_PASS", "change-me")
STORAGE_PATH = os.getenv("STORAGE_PATH", "./data/orders.sqlite3")

security = HTTPBasic()
app = FastAPI(title=APP_NAME)


def _ensure_db():
    os.makedirs(os.path.dirname(STORAGE_PATH), exist_ok=True)
    conn = sqlite3.connect(STORAGE_PATH, check_same_thread=False)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            received_at INTEGER NOT NULL,
            path TEXT NOT NULL,
            method TEXT NOT NULL DEFAULT 'POST',
            headers_json TEXT NOT NULL,
            body_text TEXT NOT NULL
        )
        """
    )
    # Lightweight migration for existing DBs
    cur = conn.execute("PRAGMA table_info(orders)")
    cols = {row[1] for row in cur.fetchall()}
    if "method" not in cols:
        conn.execute("ALTER TABLE orders ADD COLUMN method TEXT NOT NULL DEFAULT 'POST'")
    conn.commit()
    return conn


DB = _ensure_db()


def _check_basic_auth(credentials: HTTPBasicCredentials):
    user_ok = secrets.compare_digest(credentials.username, GYG_BASIC_USER)
    pass_ok = secrets.compare_digest(credentials.password, GYG_BASIC_PASS)
    if not (user_ok and pass_ok):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Basic"},
        )


@app.get("/health")
def health():
    return {"status": "ok", "service": APP_NAME}


async def _store_request(request: Request):
    body_bytes = await request.body()
    try:
        body_text = body_bytes.decode("utf-8", errors="replace")
    except Exception:
        body_text = ""

    headers_dict = {k: v for k, v in request.headers.items()}
    headers_json = json.dumps(headers_dict, ensure_ascii=True)

    received_at = int(time.time())
    cur = DB.cursor()
    cur.execute(
        "INSERT INTO orders (received_at, path, method, headers_json, body_text) VALUES (?, ?, ?, ?, ?)",
        (received_at, str(request.url.path), request.method, headers_json, body_text),
    )
    DB.commit()
    return cur.lastrowid


async def _handle_supplier_endpoint(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)

    order_id = await _store_request(request)

    # Placeholder ACK. Adjust to match GYG's required schema once confirmed.
    return JSONResponse({"status": "ok", "id": order_id})


@app.get("/1/get-availabilities/")
async def get_availabilities(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {"data": {"availabilities": []}}


@app.post("/1/reserve/")
async def post_reserve(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {
        "data": {
            "reservationReference": "res-placeholder",
            "reservationExpiration": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    }


@app.post("/1/cancel-reservation/")
async def post_cancel_reservation(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {"data": {}}


@app.post("/1/book/")
async def post_book(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {"data": {"bookingReference": "bk-placeholder", "tickets": []}}


@app.post("/1/cancel-booking/")
async def post_cancel_booking(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {"data": {}}


@app.post("/1/notify/")
async def post_notify(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {"data": {}}


@app.get("/1/products/{productId}/pricing-categories/")
async def get_pricing_categories(
    productId: str, request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {"data": {"pricingCategories": []}}


@app.get("/1/suppliers/{supplierId}/products/")
async def get_supplier_products(
    supplierId: str, request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {"data": {"supplierId": supplierId, "products": []}}


@app.get("/1/products/{productId}/addons/")
async def get_addons(
    productId: str, request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {"data": {"addons": []}}


@app.get("/1/products/{productId}")
async def get_product_details(
    productId: str, request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    _check_basic_auth(credentials)
    await _store_request(request)
    return {
        "data": {
            "supplierId": "supplier-placeholder",
            "productTitle": "placeholder product",
            "destinationLocation": {"city": "Berlin", "country": "DEU"},
        }
    }


@app.get("/orders")
def list_orders(request: Request, limit: int = 50, offset: int = 0):
    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    cur = DB.cursor()
    cur.execute(
        "SELECT id, received_at, path, method FROM orders ORDER BY id DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    rows = cur.fetchall()
    items = [
        {"id": r[0], "received_at": r[1], "path": r[2], "method": r[3]}
        for r in rows
    ]
    return {"items": items, "limit": limit, "offset": offset}


@app.get("/orders/{order_id}")
def get_order(order_id: int, request: Request):
    cur = DB.cursor()
    cur.execute(
        "SELECT id, received_at, path, method, headers_json, body_text FROM orders WHERE id = ?",
        (order_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")

    return {
        "id": row[0],
        "received_at": row[1],
        "path": row[2],
        "method": row[3],
        "headers": json.loads(row[4]),
        "body": row[5],
    }
