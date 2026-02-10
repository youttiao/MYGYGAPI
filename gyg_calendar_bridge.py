from datetime import UTC, datetime
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import json
import os
import secrets
import sqlite3
import threading
import time
from typing import Any

APP_NAME = "gyg-inventory-bridge"

GYG_BASIC_USER = os.getenv("GYG_BASIC_USER", "gyg")
GYG_BASIC_PASS = os.getenv("GYG_BASIC_PASS", "change-me")
STORAGE_PATH = os.getenv("STORAGE_PATH", "./data/orders.sqlite3")
RESERVATION_HOLD_SECONDS = max(900, int(os.getenv("RESERVATION_HOLD_SECONDS", "3600")))

security = HTTPBasic()
app = FastAPI(title=APP_NAME)


# A single process-safe DB connection + lock is enough for this minimal service.
DB_LOCK = threading.Lock()


def _ensure_db() -> sqlite3.Connection:
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

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS calendar_slots (
            product_id TEXT NOT NULL,
            date_time TEXT NOT NULL,
            vacancies INTEGER NOT NULL,
            cutoff_seconds INTEGER NOT NULL DEFAULT 0,
            currency TEXT,
            prices_json TEXT,
            opening_times_json TEXT,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY(product_id, date_time)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reservations (
            reservation_reference TEXT PRIMARY KEY,
            gyg_booking_reference TEXT NOT NULL,
            product_id TEXT NOT NULL,
            date_time TEXT NOT NULL,
            units INTEGER NOT NULL,
            booking_items_json TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS bookings (
            booking_reference TEXT PRIMARY KEY,
            gyg_booking_reference TEXT UNIQUE NOT NULL,
            product_id TEXT NOT NULL,
            date_time TEXT NOT NULL,
            units INTEGER NOT NULL,
            booking_items_json TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
        """
    )

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reservations_gyg_ref ON reservations (gyg_booking_reference)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_bookings_gyg_ref ON bookings (gyg_booking_reference)"
    )

    cur = conn.execute("PRAGMA table_info(orders)")
    cols = {row[1] for row in cur.fetchall()}
    if "method" not in cols:
        conn.execute("ALTER TABLE orders ADD COLUMN method TEXT NOT NULL DEFAULT 'POST'")

    conn.commit()
    return conn


DB = _ensure_db()


def _check_basic_auth(credentials: HTTPBasicCredentials) -> None:
    user_ok = secrets.compare_digest(credentials.username, GYG_BASIC_USER)
    pass_ok = secrets.compare_digest(credentials.password, GYG_BASIC_PASS)
    if not (user_ok and pass_ok):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Basic"},
        )


def _iso_to_dt(value: str) -> datetime:
    if not isinstance(value, str):
        raise ValueError("invalid datetime")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _epoch_to_iso(ts: int) -> str:
    return datetime.fromtimestamp(ts, tz=UTC).isoformat().replace("+00:00", "Z")


def _error_response(error_code: str, error_message: str) -> JSONResponse:
    return JSONResponse(
        status_code=200,
        content={"errorCode": error_code, "errorMessage": error_message},
    )


async def _store_request(request: Request) -> int:
    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8", errors="replace")
    headers_json = json.dumps(dict(request.headers), ensure_ascii=True)
    now_ts = int(time.time())

    with DB_LOCK:
        cur = DB.cursor()
        cur.execute(
            "INSERT INTO orders (received_at, path, method, headers_json, body_text) VALUES (?, ?, ?, ?, ?)",
            (now_ts, str(request.url.path), request.method, headers_json, body_text),
        )
        DB.commit()
        return int(cur.lastrowid)


async def _json_body(request: Request) -> dict[str, Any]:
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=200, detail="Invalid JSON")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=200, detail="Invalid payload")
    return payload


def _units_from_booking_items(booking_items: Any) -> int:
    if not isinstance(booking_items, list) or not booking_items:
        raise ValueError("bookingItems must be a non-empty array")

    total_units = 0
    for item in booking_items:
        if not isinstance(item, dict):
            raise ValueError("bookingItems must be objects")
        category = str(item.get("category", "")).upper()
        count = item.get("count")
        if not isinstance(count, int) or count < 1:
            raise ValueError("bookingItems[].count must be integer >= 1")
        if category == "GROUP":
            total_units += count
        else:
            total_units += count

    return total_units


def _parse_supplier_payload(payload: dict[str, Any]) -> tuple[dict[str, Any], str, str, Any]:
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ValueError("missing data object")

    product_id = data.get("productId")
    date_time = data.get("dateTime")
    booking_items = data.get("bookingItems")

    if not isinstance(product_id, str) or not product_id.strip():
        raise ValueError("missing productId")
    if not isinstance(date_time, str) or not date_time.strip():
        raise ValueError("missing dateTime")
    if booking_items is None:
        raise ValueError("missing bookingItems")

    _iso_to_dt(date_time)
    return data, product_id, date_time, booking_items


def _collect_prices(data: dict[str, Any]) -> tuple[str | None, str | None]:
    currency = data.get("currency")
    prices_by_category = data.get("pricesByCategory")

    currency_value = currency if isinstance(currency, str) and currency else None
    prices_json = None
    if isinstance(prices_by_category, dict):
        prices_json = json.dumps(prices_by_category, ensure_ascii=True)
    return currency_value, prices_json


@app.get("/", response_class=HTMLResponse)
def admin_page() -> str:
    return """
<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />
  <title>GYG Calendar Admin</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; background: #f7f8fa; color: #111; }
    .card { background: #fff; border: 1px solid #d7dbe2; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    h1 { margin: 0 0 16px; font-size: 24px; }
    input, button { padding: 8px 10px; border: 1px solid #c8ced8; border-radius: 8px; font-size: 14px; }
    button { background: #111827; color: #fff; border: 0; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #eceff4; padding: 8px; font-size: 13px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; }
    .muted { color: #5b6472; font-size: 13px; }
  </style>
</head>
<body>
  <h1>GYG Calendar Admin</h1>
  <div class=\"card\">
    <div class=\"row\">
      <input id=\"productId\" placeholder=\"productId (e.g. prod123)\" />
      <input id=\"dateTime\" placeholder=\"dateTime (ISO8601)\" value=\"2026-02-15T10:00:00+00:00\" />
      <input id=\"vacancies\" type=\"number\" min=\"0\" placeholder=\"vacancies\" value=\"10\" />
      <button onclick=\"upsertSlot()\">Save Slot</button>
      <button onclick=\"loadSlots()\">Refresh</button>
    </div>
    <p class=\"muted\">这个页面用于维护你给 GYG 的库存源（productId + dateTime + vacancies）。</p>
  </div>

  <div class=\"card\">
    <table>
      <thead>
        <tr><th>productId</th><th>dateTime</th><th>vacancies</th><th>updated</th><th></th></tr>
      </thead>
      <tbody id=\"rows\"></tbody>
    </table>
  </div>

  <script>
    async function loadSlots() {
      const res = await fetch('/admin/calendar');
      const data = await res.json();
      const tbody = document.getElementById('rows');
      tbody.innerHTML = '';
      for (const slot of data.items) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${slot.productId}</td><td>${slot.dateTime}</td><td>${slot.vacancies}</td><td>${slot.updatedAt}</td><td><button onclick=\"delSlot('${slot.productId}','${slot.dateTime}')\">Delete</button></td>`;
        tbody.appendChild(tr);
      }
    }

    async function upsertSlot() {
      const payload = {
        productId: document.getElementById('productId').value.trim(),
        dateTime: document.getElementById('dateTime').value.trim(),
        vacancies: Number(document.getElementById('vacancies').value)
      };
      const res = await fetch('/admin/calendar/slot', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (!res.ok) alert('save failed');
      await loadSlots();
    }

    async function delSlot(productId, dateTime) {
      const qs = new URLSearchParams({productId, dateTime});
      const res = await fetch('/admin/calendar/slot?' + qs.toString(), { method: 'DELETE' });
      if (!res.ok) alert('delete failed');
      await loadSlots();
    }

    loadSlots();
  </script>
</body>
</html>
    """


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": APP_NAME}


@app.get("/admin/calendar")
def admin_calendar() -> dict[str, Any]:
    with DB_LOCK:
        cur = DB.execute(
            "SELECT product_id, date_time, vacancies, updated_at FROM calendar_slots ORDER BY date_time ASC"
        )
        rows = cur.fetchall()

    items = [
        {
            "productId": row[0],
            "dateTime": row[1],
            "vacancies": row[2],
            "updatedAt": _epoch_to_iso(row[3]),
        }
        for row in rows
    ]
    return {"items": items}


@app.post("/admin/calendar/slot")
async def admin_upsert_slot(request: Request) -> dict[str, str]:
    payload = await _json_body(request)
    product_id = payload.get("productId")
    date_time = payload.get("dateTime")
    vacancies = payload.get("vacancies")
    cutoff_seconds = payload.get("cutoffSeconds", 0)

    if not isinstance(product_id, str) or not product_id.strip():
        raise HTTPException(status_code=400, detail="invalid productId")
    if not isinstance(date_time, str) or not date_time.strip():
        raise HTTPException(status_code=400, detail="invalid dateTime")
    if not isinstance(vacancies, int) or vacancies < 0:
        raise HTTPException(status_code=400, detail="invalid vacancies")
    if not isinstance(cutoff_seconds, int) or cutoff_seconds < 0:
        raise HTTPException(status_code=400, detail="invalid cutoffSeconds")

    _iso_to_dt(date_time)
    now_ts = int(time.time())

    with DB_LOCK:
        DB.execute(
            """
            INSERT INTO calendar_slots (
                product_id, date_time, vacancies, cutoff_seconds,
                currency, prices_json, opening_times_json, updated_at
            ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)
            ON CONFLICT(product_id, date_time)
            DO UPDATE SET vacancies=excluded.vacancies, cutoff_seconds=excluded.cutoff_seconds, updated_at=excluded.updated_at
            """,
            (product_id, date_time, vacancies, cutoff_seconds, now_ts),
        )
        DB.commit()

    return {"status": "ok"}


@app.delete("/admin/calendar/slot")
def admin_delete_slot(productId: str = Query(...), dateTime: str = Query(...)) -> dict[str, str]:
    _iso_to_dt(dateTime)
    with DB_LOCK:
        DB.execute(
            "DELETE FROM calendar_slots WHERE product_id = ? AND date_time = ?",
            (productId, dateTime),
        )
        DB.commit()
    return {"status": "ok"}


@app.get("/1/get-availabilities/")
async def get_availabilities(
    request: Request,
    productId: str,
    fromDateTime: str,
    toDateTime: str,
    credentials: HTTPBasicCredentials = Depends(security),
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)

    try:
        start = _iso_to_dt(fromDateTime)
        end = _iso_to_dt(toDateTime)
    except Exception:
        return _error_response("VALIDATION_FAILURE", "Invalid date range")

    if end < start:
        return _error_response("VALIDATION_FAILURE", "toDateTime must be >= fromDateTime")

    with DB_LOCK:
        cur = DB.execute(
            """
            SELECT date_time, vacancies, cutoff_seconds, currency, prices_json, opening_times_json
            FROM calendar_slots
            WHERE product_id = ?
            ORDER BY date_time ASC
            """,
            (productId,),
        )
        rows = cur.fetchall()

    availabilities: list[dict[str, Any]] = []
    for row in rows:
        dt_value = row[0]
        try:
            dt_obj = _iso_to_dt(dt_value)
        except Exception:
            continue
        if dt_obj < start or dt_obj > end:
            continue

        item: dict[str, Any] = {
            "dateTime": dt_value,
            "productId": productId,
            "cutoffSeconds": max(0, int(row[2] or 0)),
            "vacancies": max(0, int(row[1])),
        }
        if row[5]:
            item["openingTimes"] = json.loads(row[5])
        if row[3] and row[4]:
            item["currency"] = row[3]
            item["pricesByCategory"] = json.loads(row[4])

        availabilities.append(item)

    return JSONResponse({"data": {"availabilities": availabilities}})


@app.post("/1/reserve/")
async def post_reserve(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)

    try:
        payload = await _json_body(request)
        data, product_id, date_time, booking_items = _parse_supplier_payload(payload)
        units = _units_from_booking_items(booking_items)
        gyg_booking_reference = str(data.get("gygBookingReference", "")).strip()
        if not gyg_booking_reference:
            raise ValueError("missing gygBookingReference")
    except ValueError as e:
        return _error_response("VALIDATION_FAILURE", str(e))

    reservation_reference = f"res-{secrets.token_hex(8)}"
    now_ts = int(time.time())
    expires_at = now_ts + RESERVATION_HOLD_SECONDS

    with DB_LOCK:
        try:
            DB.execute("BEGIN IMMEDIATE")

            slot = DB.execute(
                "SELECT vacancies FROM calendar_slots WHERE product_id = ? AND date_time = ?",
                (product_id, date_time),
            ).fetchone()

            if not slot or int(slot[0]) < units:
                DB.execute("ROLLBACK")
                return _error_response(
                    "NO_AVAILABILITY",
                    "Requested timeslot is not available",
                )

            DB.execute(
                "UPDATE calendar_slots SET vacancies = vacancies - ?, updated_at = ? WHERE product_id = ? AND date_time = ?",
                (units, now_ts, product_id, date_time),
            )

            DB.execute(
                """
                INSERT INTO reservations (
                    reservation_reference,
                    gyg_booking_reference,
                    product_id,
                    date_time,
                    units,
                    booking_items_json,
                    expires_at,
                    status,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                """,
                (
                    reservation_reference,
                    gyg_booking_reference,
                    product_id,
                    date_time,
                    units,
                    json.dumps(booking_items, ensure_ascii=True),
                    expires_at,
                    now_ts,
                ),
            )

            DB.commit()
        except Exception:
            DB.execute("ROLLBACK")
            return _error_response("INTERNAL_SYSTEM_FAILURE", "Reserve failed")

    return JSONResponse(
        {
            "data": {
                "reservationReference": reservation_reference,
                "reservationExpiration": _epoch_to_iso(expires_at),
            }
        }
    )


@app.post("/1/cancel-reservation/")
async def post_cancel_reservation(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)

    payload = await _json_body(request)
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        return _error_response("VALIDATION_FAILURE", "missing data object")

    reservation_reference = str(data.get("reservationReference", "")).strip()
    gyg_booking_reference = str(data.get("gygBookingReference", "")).strip()

    if not reservation_reference or not gyg_booking_reference:
        return _error_response(
            "VALIDATION_FAILURE", "reservationReference and gygBookingReference are required"
        )

    now_ts = int(time.time())

    with DB_LOCK:
        try:
            DB.execute("BEGIN IMMEDIATE")
            row = DB.execute(
                """
                SELECT gyg_booking_reference, product_id, date_time, units, status
                FROM reservations
                WHERE reservation_reference = ?
                """,
                (reservation_reference,),
            ).fetchone()

            if not row:
                DB.execute("ROLLBACK")
                return _error_response("INVALID_RESERVATION", "Reservation not found")

            if row[0] != gyg_booking_reference or row[4] != "ACTIVE":
                DB.execute("ROLLBACK")
                return _error_response("INVALID_RESERVATION", "Reservation not active")

            DB.execute(
                "UPDATE reservations SET status = 'CANCELLED' WHERE reservation_reference = ?",
                (reservation_reference,),
            )
            DB.execute(
                "UPDATE calendar_slots SET vacancies = vacancies + ?, updated_at = ? WHERE product_id = ? AND date_time = ?",
                (int(row[3]), now_ts, row[1], row[2]),
            )

            DB.commit()
        except Exception:
            DB.execute("ROLLBACK")
            return _error_response("INTERNAL_SYSTEM_FAILURE", "Cancel reservation failed")

    return JSONResponse({"data": {}})


@app.post("/1/book/")
async def post_book(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)

    try:
        payload = await _json_body(request)
        data, product_id, date_time, booking_items = _parse_supplier_payload(payload)
        _units_from_booking_items(booking_items)
    except ValueError as e:
        return _error_response("VALIDATION_FAILURE", str(e))

    reservation_reference = str(data.get("reservationReference", "")).strip()
    gyg_booking_reference = str(data.get("gygBookingReference", "")).strip()

    if not reservation_reference or not gyg_booking_reference:
        return _error_response(
            "VALIDATION_FAILURE", "reservationReference and gygBookingReference are required"
        )

    now_ts = int(time.time())

    with DB_LOCK:
        try:
            DB.execute("BEGIN IMMEDIATE")

            existing_booking = DB.execute(
                "SELECT booking_reference, status FROM bookings WHERE gyg_booking_reference = ?",
                (gyg_booking_reference,),
            ).fetchone()
            if existing_booking and existing_booking[1] == "ACTIVE":
                DB.execute("COMMIT")
                return JSONResponse(
                    {
                        "data": {
                            "bookingReference": existing_booking[0],
                            "tickets": [
                                {
                                    "category": "COLLECTIVE",
                                    "ticketCode": f"{existing_booking[0]}-1",
                                    "ticketCodeType": "QR_CODE",
                                }
                            ],
                        }
                    }
                )

            reservation = DB.execute(
                """
                SELECT gyg_booking_reference, product_id, date_time, units, status, expires_at
                FROM reservations
                WHERE reservation_reference = ?
                """,
                (reservation_reference,),
            ).fetchone()

            if not reservation:
                DB.execute("ROLLBACK")
                return _error_response("INVALID_RESERVATION", "Reservation not found")

            if reservation[0] != gyg_booking_reference:
                DB.execute("ROLLBACK")
                return _error_response("INVALID_RESERVATION", "Reservation mismatch")

            if reservation[4] != "ACTIVE":
                DB.execute("ROLLBACK")
                return _error_response("INVALID_RESERVATION", "Reservation not active")

            if now_ts > int(reservation[5]):
                DB.execute(
                    "UPDATE reservations SET status = 'EXPIRED' WHERE reservation_reference = ?",
                    (reservation_reference,),
                )
                DB.execute(
                    "UPDATE calendar_slots SET vacancies = vacancies + ?, updated_at = ? WHERE product_id = ? AND date_time = ?",
                    (int(reservation[3]), now_ts, reservation[1], reservation[2]),
                )
                DB.commit()
                return _error_response("INVALID_RESERVATION", "Reservation expired")

            if reservation[1] != product_id or reservation[2] != date_time:
                DB.execute("ROLLBACK")
                return _error_response("INVALID_RESERVATION", "Reservation does not match product/date")

            booking_reference = f"bk-{secrets.token_hex(8)}"

            DB.execute(
                """
                INSERT INTO bookings (
                    booking_reference,
                    gyg_booking_reference,
                    product_id,
                    date_time,
                    units,
                    booking_items_json,
                    status,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                """,
                (
                    booking_reference,
                    gyg_booking_reference,
                    product_id,
                    date_time,
                    int(reservation[3]),
                    json.dumps(booking_items, ensure_ascii=True),
                    now_ts,
                ),
            )
            DB.execute(
                "UPDATE reservations SET status = 'BOOKED' WHERE reservation_reference = ?",
                (reservation_reference,),
            )

            DB.commit()
        except sqlite3.IntegrityError:
            DB.execute("ROLLBACK")
            return _error_response("INTERNAL_SYSTEM_FAILURE", "Booking already exists")
        except Exception:
            DB.execute("ROLLBACK")
            return _error_response("INTERNAL_SYSTEM_FAILURE", "Booking failed")

    return JSONResponse(
        {
            "data": {
                "bookingReference": booking_reference,
                "tickets": [
                    {
                        "category": "COLLECTIVE",
                        "ticketCode": f"{booking_reference}-1",
                        "ticketCodeType": "QR_CODE",
                    }
                ],
            }
        }
    )


@app.post("/1/cancel-booking/")
async def post_cancel_booking(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)

    payload = await _json_body(request)
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        return _error_response("VALIDATION_FAILURE", "missing data object")

    booking_reference = str(data.get("bookingReference", "")).strip()
    gyg_booking_reference = str(data.get("gygBookingReference", "")).strip()
    product_id = str(data.get("productId", "")).strip()

    if not booking_reference or not gyg_booking_reference or not product_id:
        return _error_response(
            "VALIDATION_FAILURE",
            "bookingReference, gygBookingReference and productId are required",
        )

    now_ts = int(time.time())

    with DB_LOCK:
        try:
            DB.execute("BEGIN IMMEDIATE")
            booking = DB.execute(
                """
                SELECT gyg_booking_reference, product_id, date_time, units, status
                FROM bookings
                WHERE booking_reference = ?
                """,
                (booking_reference,),
            ).fetchone()

            if not booking:
                DB.execute("ROLLBACK")
                return _error_response("INVALID_BOOKING", "Booking not found")

            if booking[0] != gyg_booking_reference or booking[1] != product_id:
                DB.execute("ROLLBACK")
                return _error_response("INVALID_BOOKING", "Booking mismatch")

            if booking[4] == "CANCELED":
                DB.execute("ROLLBACK")
                return _error_response("BOOKING_ALREADY_CANCELED", "Booking already canceled")

            activity_dt = _iso_to_dt(str(booking[2]))
            if datetime.now(tz=UTC) > activity_dt.astimezone(UTC):
                DB.execute("ROLLBACK")
                return _error_response("BOOKING_IN_PAST", "Booking is in the past")

            DB.execute(
                "UPDATE bookings SET status = 'CANCELED' WHERE booking_reference = ?",
                (booking_reference,),
            )
            DB.execute(
                "UPDATE calendar_slots SET vacancies = vacancies + ?, updated_at = ? WHERE product_id = ? AND date_time = ?",
                (int(booking[3]), now_ts, booking[1], booking[2]),
            )

            DB.commit()
        except Exception:
            DB.execute("ROLLBACK")
            return _error_response("INTERNAL_SYSTEM_FAILURE", "Cancel booking failed")

    return JSONResponse({"data": {}})


@app.post("/1/notify/")
async def post_notify(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)
    return JSONResponse({"data": {}})


@app.get("/1/products/{productId}/pricing-categories/")
async def get_pricing_categories(
    productId: str, request: Request, credentials: HTTPBasicCredentials = Depends(security)
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)

    return JSONResponse(
        {
            "data": {
                "pricingCategories": [
                    {
                        "category": "ADULT",
                        "minTicketAmount": 1,
                        "maxTicketAmount": 999,
                        "bookingCategory": "STANDARD",
                    }
                ]
            }
        }
    )


@app.get("/1/suppliers/{supplierId}/products/")
async def get_supplier_products(
    supplierId: str, request: Request, credentials: HTTPBasicCredentials = Depends(security)
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)

    with DB_LOCK:
        cur = DB.execute(
            "SELECT DISTINCT product_id FROM calendar_slots ORDER BY product_id ASC"
        )
        products = [
            {"productId": row[0], "productTitle": row[0]} for row in cur.fetchall()
        ]

    return JSONResponse(
        {
            "data": {
                "supplierId": supplierId,
                "supplierName": "Local Supplier",
                "products": products,
            }
        }
    )


@app.get("/1/products/{productId}/addons/")
async def get_addons(
    productId: str, request: Request, credentials: HTTPBasicCredentials = Depends(security)
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)
    return JSONResponse({"data": {"addons": []}})


@app.get("/1/products/{productId}")
async def get_product_details(
    productId: str, request: Request, credentials: HTTPBasicCredentials = Depends(security)
) -> JSONResponse:
    _check_basic_auth(credentials)
    await _store_request(request)

    return JSONResponse(
        {
            "data": {
                "supplierId": "local-supplier",
                "productTitle": productId,
                "productDescription": "Managed by local calendar service",
                "destinationLocation": {"city": "Shanghai", "country": "CHN"},
                "configuration": {"participantsConfiguration": {"min": 1, "max": 999}},
            }
        }
    )


@app.get("/orders")
def list_orders(limit: int = 50, offset: int = 0) -> dict[str, Any]:
    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    with DB_LOCK:
        cur = DB.execute(
            "SELECT id, received_at, path, method FROM orders ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        rows = cur.fetchall()

    items = [
        {"id": row[0], "received_at": row[1], "path": row[2], "method": row[3]}
        for row in rows
    ]
    return {"items": items, "limit": limit, "offset": offset}


@app.get("/orders/{order_id}")
def get_order(order_id: int) -> dict[str, Any]:
    with DB_LOCK:
        row = DB.execute(
            "SELECT id, received_at, path, method, headers_json, body_text FROM orders WHERE id = ?",
            (order_id,),
        ).fetchone()

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
