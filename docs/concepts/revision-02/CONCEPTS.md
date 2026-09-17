# 云海列车：第二轮视觉概念

状态：2026-09-17 用户已选定 A 为整体视觉目标，C 为夜景参考。列车改为古典蒸汽列车，偶尔冒出柔和蒸汽；增加约 30 分钟完整昼夜循环。当前只开发横屏，竖屏延后。使用内置 image_gen，基于用户提供的四张参考图生成。

这三张是静态美术目标，不是程序运行截图，也不代表低功耗动态实现已经达到同等效果。旧 concept 保留供比较。

- A-warm-cloud-valley.png：暖霞云谷，强调珊瑚暖色、紫灰云影、山岛和丰富纵深。
- B-open-sky-sea.png：开阔天海，强调天空留白、浅色云海、斜向铁路与轻盈感。
- C-moonlit-mountains.png：月下远山，强调靛蓝、银紫云层与小面积暖窗灯。

最终选择：整体遵循 A 的云层塑造、色彩、山岛和构图密度；B 保留为探索稿，不再作为默认留白标准。C 提供夜景色彩与氛围，夜景沿用同一世界，不切换整张背景。后续竖屏需要专属设计，本轮不做。具体动态方案见 ../../VISUAL_DIRECTION.md 与 ../../PHASE_1_DEVELOPMENT.md。

## 完整生成提示词

### A

Use case: stylized-concept. Create concept A for LumaWindow, a calm ambient second screen: 'Warm cloud valley'. Use the four user-provided railway cloud landscape images as visual references, especially image2's painterly layered clouds and image1's warm light, but create an original composition. Single full bleed 16:9 landscape illustration, no labels, no text or UI. A tiny elegant dark teal passenger train with warm cream windows crosses a slender stone arch viaduct gently curving through the lower middle of an immense cloud valley. Layered monumental apricot cumulus towers on left, open pale blue sky and a softly illuminated faraway peach horizon to right; muted lavender cloud shadows, creamy irregular lit rims, distant blue mountain islands with sparse pines. Rich hand-painted animation background, controlled crisp scalloped silhouettes and broad painted shading, beautiful depth through 6 distinct overlapping planes. Train modest, about one quarter frame width, clouds are the subject. Quiet, harmonious, poetic, unhurried, enough negative space for all-day viewing. No photorealism, no bloom, no rays, lens flare, sparkling particles, excessive saturation, floating architecture or fantasy ornament. Visually designed for layered 2.5D procedural animation, not noisy volumetric spectacle.

### B

Use case: stylized-concept. Create concept B for LumaWindow, a calm ambient second screen: 'Open sky sea'. Four user railway cloud images are mood and craft references, especially the depth of image3 and refined cloud painting of image2. New original composition, single full bleed 16:9 landscape, no text UI labels. A small midnight-blue passenger train with soft amber windows on an elegant thin arched viaduct travels diagonally from lower right toward middle left into an immense tranquil pale turquoise cloud sea. Bridge occupies little visual weight. Vast clear powder-blue sky occupies upper half; lower half long soft cream and dusty rose cloud shelves interleaved with distant blue mountain silhouettes, one large sculptural cumulus formation at right edge, a small dark pine-covered mountain shoulder in lower left. Late afternoon diffuse golden lighting, restrained ivory, celadon blue, peach, lilac palette. Painterly animation background with intentional flat shaded color areas and intricate yet quiet cloud silhouettes, readable foreground/middle/distant layers. Composition noticeably more airy and open than warm cloud valley, not the same picture recolored. No photorealism, no glitter, stars, lens flare, light shafts, bloom, excessive detail or grandiose spectacle. Poetic, spacious, low contrast overall but strong depth, credible target for lightweight layered 2.5D animation.

### C

Use case: stylized-concept. Create concept C for LumaWindow, a calm ambient second screen: 'Moonlit distant mountains'. Use the four user reference railway images for painterly craftsmanship, especially image4, but compose an original landscape. Single full bleed 16:9 illustration no text labels UI. Deep indigo mountain silhouettes climb along left edge, receding into blue-violet ridges across a sea of lavender and silver cloud banks. A modest softly luminous ivory moon, much smaller than the reference giant moon, in open upper right sky, partly crossed by a wispy cloud. An elegant small dark passenger train with a thin rhythm of warm amber windows crosses a slender stone arched bridge in lower middle, seen mostly side on. A few dark pine silhouettes anchor bottom corners, ample quiet blue sky. Moonlight only gently edges the cloud tops, avoid bright glare. Cloud shapes rich and painterly with sculpted scalloped outlines, large calm shaded masses, fine accents only at selected edges, clear six-layer depth. Main feeling: sheltered, peaceful, wistful night journey, not spectacular fantasy. Only very sparse tiny steady stars, no twinkles, no particles, bloom, flares, neon, photographic rendering. Design feasible as hand-painted-style layered 2.5D world with procedural variation.
