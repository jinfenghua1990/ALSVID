# FC1 3D 商品选配接入记录（2026-10-19）

## 当前资产

- 已找回旧项目资料中的外观核对模型 `ALSVID_FC1_unfolded_review_v10.glb`。
- 文件大小 **35,176,248 bytes**；SHA-256：`f50782dd70679eae4e1fdef342697a25fc7a7c4be07bfe58fdc0a8d9d4dae6d9`。
- V10 是按素材近似重建的**展开状态外观审阅模型**，不属于实测、验收后的量产 CAD；折叠动态与结构/隐蔽件没有验证。
- 模型目前位于 ChatGPT 项目素材 Library，并 **未通过本仓库、Cloud Run 或 R2 发布为可供浏览器下载的地址**；不得把模型找到误当成网站 3D 已上线。

## 网页代码接入

- 组件：`apps/web/app/_components/product/fc1-three-d-viewer.tsx` 和 `fc1-colour-configurator.tsx`。
- 网页优先使用 `NEXT_PUBLIC_FC1_3D_MODEL_URL` 指定的公开 GLB URL（建议放在 ALSVID 独立 R2 bucket）；没有配置时使用 `/products/fc1/ALSVID_FC1_unfolded_review_v10.glb`。
- 客户端先对 URL 发出一次小型 HEAD 检查；**只有确认可访问的 3D 文件**，才展示「实拍 | 3D 查看」切换。否则保留此前真实 FC1 图片和现有颜色模拟功能，不在页面假装能旋转。
- 用户主动进入 3D 时，才懒加载固定版本的 `<model-viewer>` 和模型文件（避免每位访客自动下载 35 MB）。
- 真正 GLB 支持拖拽旋转、触屏移动和缩放。保持单独的真实实拍视图及出错回退。
- 颜色偏好选择与原有记录接口不变；模型仅修改 V10 命名为 `Deep satin metallic blue` 的涂装材质，**绝不染色轮胎、刹车、座垫、传动等黑色和棕色组件**。此处为审阅色模拟，不能代表量产车型。
- 3D 审阅稿会明确标注「非实车验收，产品结构以实拍为准」；不得与独立静态产品图混为一谈。

## 二进制文件上线的未完成条件

1. 将 Library 中的 `ALSVID_FC1_unfolded_review_v10.glb` 上传到 ALSVID 的 R2，校验上述 SHA-256。不要上传替代车型的网上免费 3D 模型。
2. 对网页使用的 public URL 配置 `Content-Type: model/gltf-binary`、允许 `GET`/`HEAD`、CORS 允许官网域名（以及当前临时域名）。
3. 在 Web 构建时设置 `NEXT_PUBLIC_FC1_3D_MODEL_URL` 并重新部署；或将 GLB 放进 Web public 路径以使用默认 URL。
4. 实际审阅 V10 的结构比例；未经确认前仅标为 3D 外观核对稿，不用于宣称最终结构和功能。真正折叠动画需有单独验收的模型和关键帧，当前不伪造。
5. 用浏览器实测 GLB 载入、旋转、颜色切换、手机触控与失败回退；之后才能标记「3D 已上线」。

当前 PR 交付的是**真实 3D 渲染组件和素材发布后自动显现的接入逻辑**，不是已经发布了 GLB 文件。
