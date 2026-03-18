# GYG 后台服务架构设计（面向后续智能体）

本文定义主 `app.py` 作为统一启动入口的设计方案，目标是：

1. 运行完整后台服务（管理后台 + GYG 对接接口）。
2. 有默认初始管理员账号密码。
3. 支持在服务器上通过命令修改密码。
4. 页面与业务按模块拆分，避免后续继续堆在 `app.py`。

## 1. 总体设计

- 技术栈：`FastAPI + SQLite`（后续可平滑切 MySQL/PostgreSQL）。
- 启动入口：`app.py` 仅负责组装应用，不写业务逻辑。
- 双通道：
  - 管理后台（我们自己管理用户、库存、订单查看）。
  - GYG Supplier API（供 GYG 调用）。

推荐 URL 分层：

- 管理端页面/接口：`/admin/*`
- 认证相关：`/auth/*`
- GYG 对接接口：`/gyg/*`（兼容旧路径时可再挂载 `/1/*`）
- 运维探针：`/health`

## 2. 主入口 `app.py` 职责（只保留编排）

`app.py` 只做四件事：

1. 创建 `FastAPI` 实例。
2. 加载配置（环境变量、密钥、数据库路径）。
3. 注册各模块路由（admin/auth/gyg/system）。
4. 生命周期钩子（启动初始化、关闭资源回收）。

不在 `app.py` 里写：

- 具体接口业务
- SQL 细节
- HTML 模板长字符串
- 认证算法实现

## 3. 推荐目录结构

```text
GYGAPI/
  app.py
  requirements.txt
  data/
  docs/
    BACKOFFICE_ARCHITECTURE.md
  src/
    core/
      config.py
      security.py
      db.py
      logging.py
    models/
      user.py
      order.py
      inventory.py
      reservation.py
    repositories/
      user_repo.py
      order_repo.py
      inventory_repo.py
    services/
      auth_service.py
      admin_service.py
      gyg_service.py
    api/
      deps.py
      auth_routes.py
      admin_routes.py
      gyg_routes.py
      system_routes.py
    templates/
      admin/
        index.html
        users.html
        inventory.html
```

## 4. 账号与密码策略

### 4.1 初始账号

首次启动时，如果数据库没有管理员账号，则自动创建：

- 用户名：`admin`
- 密码：从环境变量 `ADMIN_INIT_PASSWORD` 读取（没有则拒绝启动，避免弱默认密码）
- 角色：`super_admin`

密码存储要求：

- 仅存哈希（建议 `bcrypt`）
- 不明文存储
- 不写入日志

### 4.2 服务器命令改密

提供 CLI 脚本（建议 `scripts/admin_cli.py`）：

```bash
python -m scripts.admin_cli set-password --username admin
```

执行后交互输入新密码，两次确认，写入哈希。

也可支持非交互模式（便于自动化）：

```bash
python -m scripts.admin_cli set-password --username admin --password 'NewStrongPass'
```

建议同时提供：

```bash
python -m scripts.admin_cli create-admin --username xxx --password '***'
python -m scripts.admin_cli disable-user --username xxx
```

## 5. 认证与权限

- 管理后台：推荐 `Session/Cookie` 或 `JWT + HttpOnly Cookie`。
- GYG 接口：继续使用 `HTTP Basic Auth`（单独凭证，不与后台管理员共用）。
- 权限最少分两级：
  - `super_admin`：用户管理、系统配置、查看全部数据
  - `operator`：库存维护、订单查看

## 6. 管理后台模块拆分（页面与接口）

建议按功能模块拆：

1. 仪表盘模块（`/admin`）
2. 用户管理模块（`/admin/users`）
3. 库存日历模块（`/admin/inventory`）
4. 订单/请求日志模块（`/admin/orders`）
5. 系统配置模块（`/admin/settings`）

每个模块都遵循：

- 页面层：模板与前端资源
- API 层：路由与参数校验
- Service 层：业务编排
- Repository 层：数据库读写

## 7. GYG 对接接口设计

GYG 模块与后台模块解耦，单独在 `gyg_routes.py + gyg_service.py`：

- `GET /gyg/1/get-availabilities/`
- `POST /gyg/1/reserve/`
- `POST /gyg/1/cancel-reservation/`
- `POST /gyg/1/book/`
- `POST /gyg/1/cancel-booking/`
- `POST /gyg/1/notify/`
- `GET /gyg/1/products/{productId}/pricing-categories/`
- `GET /gyg/1/suppliers/{supplierId}/products/`
- `GET /gyg/1/products/{productId}/addons/`
- `GET /gyg/1/products/{productId}`

兼容策略：

- 为了兼容 GYG 现有回调，可临时保留 `/1/*` 路径。
- 内部统一转到同一 service 处理。

## 8. 数据表建议（在现有基础上扩展）

新增用户与权限相关表：

- `admin_users(id, username, password_hash, role, status, created_at, updated_at)`
- `admin_audit_logs(id, actor, action, target, detail_json, created_at)`

现有业务表继续保留：

- `orders`
- `calendar_slots`
- `reservations`
- `bookings`

## 9. 配置项约定

```env
APP_ENV=prod
APP_SECRET_KEY=xxx
STORAGE_PATH=./data/orders.sqlite3

ADMIN_INIT_PASSWORD=ChangeMeAtFirstBoot
SESSION_EXPIRE_MINUTES=720

GYG_BASIC_USER=gyg
GYG_BASIC_PASS=change-me
RESERVATION_HOLD_SECONDS=3600
```

说明：

- `ADMIN_INIT_PASSWORD` 仅用于初始化首个管理员，后续改密走 CLI。
- 生产环境必须替换 `APP_SECRET_KEY` 与所有默认密码。

## 10. 分阶段落地建议

1. 第一步：重构目录与路由拆分，`app.py` 只留编排。
2. 第二步：接入 `admin_users` 与登录态，实现后台登录。
3. 第三步：实现 `scripts/admin_cli.py` 改密与管理命令。
4. 第四步：把现有内联 HTML 页面迁移到 `templates/admin/*`。
5. 第五步：为 GYG 接口与库存流转补测试（最少覆盖 reserve/book/cancel）。

## 11. 给后续智能体的开发边界

- 新增业务时，优先改 `src/api/* + src/services/*`，不要把逻辑写回 `app.py`。
- 页面新增必须进入对应模块目录（`templates/admin/*`）。
- 涉及密码与凭证，只能走 `security.py` 与 CLI，不可直接操作明文字段。
- 修改 GYG 接口时，必须保持返回结构兼容现有调用方。

