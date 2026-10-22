# ALSVID 商品类型与首页产品 ID 绑定（2026-10-22）

状态：本文件随功能 PR 验证；不代表支付、商品审核或第三方仓库已完成。关联 Admin 总任务 #212、产品实际发布待办与 3PL/WMS #295。

## 1. 商品层级与产品类型

`商品 ID = product.models.id`，独立于具体 SKU；颜色、版本和市场继续由 `Variant + SKU` 表示。同一 Model ID 下可以有多个 SKU。技术平台 FC / CT / FT / GT 仅用于整车，不是商品类型。

商品类型采用可识别的初始分类：
- `BIKE`：整车（要求绑定 FC/CT/FT/GT 技术平台）
- `ACCESSORY`：可销售的选配件（没有自行车技术平台）
- `SERVICE_PART`：可销售的维修零件（没有自行车技术平台）

目前通过 Product 域的 `product.product_types` 类型资料表和 `product.models.product_type_code` 分类字段实现；现存商品默认 BIKE 并保留原 UUID。非整车商品也用相同的 Model → Variant → SKU 流程；工程零件 `engineering.parts` 的物料身份不等于销售 SKU，后续建立有审核的关联。暂不允许随意改旧商品类型破坏 BOM/工程关系；后续需版本迁移流程。初始类型由迁移预置，不暗示可在 UI 任意添加自定义类型。

## 2. 首页自动关联与人工覆盖

首页绑定不是“只要型号名称差不多就自动上架”。自动关联：仅当 Product 内存在 `status=ACTIVE` 且 `product_type_code=BIKE`、`code` 与首页确定型号一致时，解析并附加真实 Model ID：
- `FC1_HERO` → `FC1`
- `FC1_FEATURED` → `FC1`
- `FC2_LAUNCH` → `FC2`

Admin 通过「产品中心 → 首页产品 ID 绑定」修改每个位置的 `AUTO / MANUAL`，`MANUAL` 必须选择已存在、已启用且与该展示位置型号代码完全一致的 Model ID；`AUTO` 不保存手动 ID。修改采用 `product.write` 权限、版本冲突检查、审计日志，不能覆盖他人更新。

WWW 通过独立的只读公共投影获得 `{slot,modelId,modelCode}`。页面只将此真实 ID 附加到相应展示区块的 `data-product-model-id`，原有图片、文字、详情路径不受影响；没有找到合格商品或 API 不可用时不虚构绑定，仍按当前预览正常显示。公开接口不返回其他后台商品信息、价格、权限、邮箱、仓储或授权状态。

**重要：ACTIVE 仅说明 Product 内部状态，并不等于官网商品审核发布。绑定商品 ID 不会自动上架、更新素材、显示库存、发起支付、发券或改变订单。** 正式商品发布及配件兼容判定属于后续独立审核闭环。

## 3. 交付及剩余范围

- Product 类型分类、Model API、Admin 选择和筛选：本 PR。
- 首页上述 3 个固定位置读取、手动/自动绑定：本 PR。
- 官网 FC1/FC2 页面由绑定 ID 驱动商品素材/技术参数/购物车、首页其他展示区、商品审核发布、配件适配、支付与 WMS/3PL 接口：**尚未完成**，继续在 Admin #212、3PL #295 和商品发布任务单独验收。
- 生产数据库迁移 `0034_product_types_homepage_bindings.sql` 必须走包含 API/数据库迁移的正式整体发布流程；**Web-only 发布不能替代 API 和迁移，不能在缺少新表时宣称首页 ID 已上线。**
