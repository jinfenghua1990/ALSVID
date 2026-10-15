"""Generate the Next.js route files for every ALSVID admin design screen."""

from pathlib import Path

APP = Path(r"C:\Users\Gino\Documents\ALSVID\apps\web\app")

# (screen id, route folder, page title, theme)
ROUTES = [
    ("workbench", "admin", "工作台", None),
    ("product", "admin/product", "产品中心", None),
    ("orders", "admin/orders", "订单管理", None),
    ("production", "admin/production", "生产管理", None),
    ("inventory", "admin/inventory", "库存管理", None),
    ("dealers", "admin/dealers", "经销商中心", None),
    ("customers", "admin/customers", "客户/车主中心", None),
    ("after-sales", "admin/after-sales", "售后中心", None),
    ("supply", "admin/supply", "供应链中心", None),
    ("analytics", "admin/analytics", "数据总览", None),
    ("settings", "admin/settings", "角色与权限", None),
    ("order-detail", "admin/orders/detail", "订单详情", None),
    ("vin", "admin/production/vin", "VIN 管理", None),
    ("inventory-detail", "admin/inventory/detail", "库存详情", None),
    ("dealer-detail", "admin/dealers/detail", "经销商详情", None),
    ("customer-detail", "admin/customers/detail", "客户详情", None),
    ("vin-detail", "admin/production/vin-detail", "VIN 详情", None),
    ("supplier-detail", "admin/supply/supplier-detail", "供应商详情", None),
    ("workbench", "admin/workbench-v2", "工作台 V2 · 科技感版", "tech"),
    ("workbench", "admin/workbench-v3", "工作台 V3 · 深蓝版", "deepblue"),
]


def prefix_for(folder: str) -> str:
    return "../" * len(Path(folder).parts)


def page_source(screen_id: str, title: str, prefix: str, theme: str | None) -> str:
    theme_attr = f' theme="{theme}"' if theme else ""
    return (
        f'import AdminScreen from "{prefix}_design/renderer";\n'
        f'import {{ screenById }} from "{prefix}_design";\n\n'
        f'export const metadata = {{ title: "{title} · ALSVID" }};\n\n'
        f"export default function Page() {{\n"
        f'  return <AdminScreen screen={{screenById("{screen_id}")}}{theme_attr} />;\n'
        "}\n"
    )


created = []
for screen_id, folder, title, theme in ROUTES:
    directory = APP / folder
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / "page.tsx"
    target.write_text(
        page_source(screen_id, title, prefix_for(folder), theme), encoding="utf-8"
    )
    created.append(str(target))

print(f"created {len(created)} route files")
for item in created:
    print(" -", item)
