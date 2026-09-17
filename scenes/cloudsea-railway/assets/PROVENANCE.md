# 场景素材制作记录

以下记录对应 0.1.1 的历史图集方案。从 0.1.2 起，当前场景改用程序自然场，不再加载这两张图集；文件仅保留作历史研究资料，不随当前运行时场景加载。

2026-09-17；用户已授权使用 imagegen 制作必要局部素材。工具：内置 image_gen，未调用外部 CLI/API。不是原视频截图，也不是整幅概念图背景。

- cloud-atlas.png：4 种中性灰度云形，1254×1254 RGBA；运行时按独立 UV 区域取样，统一映射阴影/中间调/高光。生成输出已检查透明通道。
- mountain-atlas.png：3 种灰度山岩/松树组合；运行时取样、着色、遮挡和重组。忽略极低 alpha 的边缘雾。
- 两张都是静态局部形状，不是几何法线或物理密度场。光照使用艺术化色阶与弱方向修正，不能实现任意角度真实重打光；轮廓和部分内部明暗方向固定。昼夜通过全场统一色阶、天空、日月及空气透视保持一致。
- 原始生成文件保存在 Codex generated_images；项目副本随离线包提供。正式发布前由项目所有者统一确定素材授权声明，当前不伪造第三方作者或素材许可。

## 云形完整提示词

Use case: stylized-concept. Production sprite atlas for a painterly cloud landscape animation. A single square RGBA image with TRUE transparent background. FOUR different isolated cumulus cloud formations arranged in an exact 2 by 2 grid, each entirely inside its own quadrant with generous transparent gutters and margin. Top left towering asymmetric cumulus; top right wide layered cloud bank; bottom left rounded cluster with scalloped smaller lobes; bottom right elongated low cloud bank. All are side view hand-painted animation background style, beautiful intricate irregular scalloped edges, large and medium cloud masses, subtle small edge detail, sculpted broad painted shading. GRAYSCALE ONLY: cream-white highlights rendered white, medium gray body, slate-gray underside, no color. Light from upper right. Flat painted tone transitions plus subtle brush texture, NOT photorealistic, not smooth plastic balls, not blurry airbrush. Entire outlines visible, opaque cloud interiors, true transparency outside. No sky, ground, shadows outside cloud, text, labels, grid lines, borders, glow, stars or scenery. These are reusable individual cloud shapes, not a scene or wallpaper. High resolution, square canvas.

## 山体完整提示词

Production game asset atlas, landscape 3:2 canvas, TRUE transparent RGBA background. Three isolated painterly rocky mountain islands arranged side by side with large transparent gutters, each mountain entirely within its third of the image. No background, no ground connecting them. Tall irregular rugged peaks with small windswept pine trees growing from ledges and tops, subtly different silhouettes: left broad asymmetric peak, center slender jagged summit, right low double peak. Each mountain base goes to the bottom of its own silhouette, no cloud or fog painted in. Neutral GRAYSCALE only, detailed hand-painted animation background art, broad slate gray shadows, medium gray planes and pale gray rock faces lit from upper right, deliberate facets and fine broken rock texture, clear natural branching pine silhouettes. Not photographic, no smooth low poly polygons, no cartoon triangles, no text, no grid, no border, no glow. Art asset for recombining into a poetic cloud valley.
