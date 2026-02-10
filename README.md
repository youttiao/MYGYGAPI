# GYG Inventory Bridge

这个仓库现在有两个入口：

- `app.py`：原有主应用（轻量占位版）
- `gyg_calendar_bridge.py`：你要的独立库存/日历桥接服务（建议单独运行这个）

## 独立服务已实现能力（`gyg_calendar_bridge.py`）

- GYG Supplier 端点（HTTP Basic Auth）
  - `GET /1/get-availabilities/`
  - `POST /1/reserve/`
  - `POST /1/cancel-reservation/`
  - `POST /1/book/`
  - `POST /1/cancel-booking/`
  - `POST /1/notify/`
  - `GET /1/products/{productId}/pricing-categories/`
  - `GET /1/suppliers/{supplierId}/products/`
  - `GET /1/products/{productId}/addons/`
  - `GET /1/products/{productId}`

- 管理日历
  - Web 页面：`GET /`
  - 列表：`GET /admin/calendar`
  - 新增/更新：`POST /admin/calendar/slot`
  - 删除：`DELETE /admin/calendar/slot?productId=...&dateTime=...`

- 观测和排障
  - `GET /orders`
  - `GET /orders/{id}`
  - `GET /health`

## 本地运行（独立服务）

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export GYG_BASIC_USER="your-gyg-user"
export GYG_BASIC_PASS="your-gyg-pass"
export RESERVATION_HOLD_SECONDS="3600"

uvicorn gyg_calendar_bridge:app --host 0.0.0.0 --port 8123
```

打开管理页：`http://127.0.0.1:8123/`

## 对接逻辑（独立服务）

- `get-availabilities`：从本地日历返回指定产品、时间范围内库存
- `reserve`：校验库存并扣减，生成 reservation
- `book`：校验 reservation 后确认订单
- `cancel-reservation` / `cancel-booking`：回补库存

错误按 GYG 习惯返回 `200` + `errorCode/errorMessage`（例如 `NO_AVAILABILITY`、`INVALID_RESERVATION`）。

## 环境变量

- `GYG_BASIC_USER`：GYG 调你接口的 Basic 用户名
- `GYG_BASIC_PASS`：GYG 调你接口的 Basic 密码
- `STORAGE_PATH`：SQLite 路径（默认 `./data/orders.sqlite3`）
- `RESERVATION_HOLD_SECONDS`：reservation 过期秒数（最小 900）

## 官方文档参考

- Overview: https://integrator.getyourguide.com/documentation/overview
- Supplier-side OpenAPI: https://integrator.getyourguide.com/assets/api_documentation/supplier-api-supplier-endpoints.yaml
- GYG-side OpenAPI: https://integrator.getyourguide.com/assets/api_documentation/supplier-api-gyg-endpoints.yaml
