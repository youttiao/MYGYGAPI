# OPS Minimal System for GetYourGuide Integrator (Supplier-side)

独立最小系统（SQLite 版本），用于对接 GYG Supplier Integrator API。

## 你当前部署域名
生产对外基地址使用：
- `https://ops.totripchina.com`

GYG 在 Integrator Portal 中应配置到该域名下的 supplier endpoints（例如 `https://ops.totripchina.com/1/get-availabilities/`）。

## 技术栈
- Node.js 20 + TypeScript
- Fastify + zod + OpenAPI (`/docs`, `/openapi.json`)
- Prisma + SQLite
- Vitest

## 文档与假设
- 端点与假设：`docs/gyg/assumptions.md`
- curl 示例：`docs/gyg/curl-examples.md`
- Postman：`docs/gyg/postman/GYG-OPS-Min.postman_collection.json`

## 环境变量
复制 `.env.example` 到 `.env`：
- `DATABASE_URL`（默认 `file:./dev.db`）
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASS`
- `ADMIN_TOKEN`
- `PORT`
- `HOST`
- `GYG_API_BASE_URL`（默认 `https://supplier-api.getyourguide.com/sandbox`）
- `GYG_API_USER`
- `GYG_API_PASS`

## 本地启动（不使用 docker）
```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

## Docker 启动
```bash
docker compose up -d --build
```

容器内会自动执行：
- `npx prisma db push`
- `node dist/server.js`

## OpenAPI
- `GET /docs`
- `GET /openapi.json`

## Admin API
Header: `x-admin-token: <ADMIN_TOKEN>`
- `GET /` 商品管理首页（商品列表、创建、跳转日历）
- `GET /products/:id/calendar` 单商品日历管理页面
- `GET /gyg-bookings` GYG bookings 管理页面
- `GET /admin/products`
- `GET /admin/products/:id`
- `GET /admin/products/:id/availability`
- `POST /admin/products`
- `POST /admin/products/:id/availability`
- `POST /admin/products/:id/push-notify-availability-update`（Supplier -> GYG）
- `GET /admin/bookings`

## GYG Supplier API（按文档路径）
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

鉴权：HTTP Basic Auth（`BASIC_AUTH_USER` / `BASIC_AUTH_PASS`）。

## 幂等策略
- reserve: `gygBookingReference` 唯一
- book: `gygBookingReference` 唯一
- cancel-reservation/cancel-booking: 重复调用返回成功空对象

## 测试
```bash
npm test
```

## 快速验证顺序
见：`docs/gyg/curl-examples.md`
1. 创建产品（admin）
2. 查询 availability
3. reserve
4. book
5. 重复 book 验证幂等
6. cancel booking
7. admin 查询 booking
