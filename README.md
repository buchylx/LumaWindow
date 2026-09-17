# LumaWindow

A calm second screen for people who work all day.

为长时间工作的人，打开一扇安静的窗。项目当前处于第二阶段开发与自测，尚未发布正式版本。

## 当前原型

**2026-09-17：0.2.0 第二阶段测试版。** 重绘八节修长客车与蒸汽机车，重新设计昼夜配色，增加连续群山和按世界距离生成的云谷、开阔云海、高云山岛。保留水平远眺与分层视差。Mac 原生生命周期适配已加入，实机表现仍待测试；2019 Intel Mac 的 0.1.3 网页基础体验已获确认。见[第二阶段设计](docs/PHASE_2_DESIGN.md)和[Mac 测试说明](docs/MAC_TESTING.md)。

- 自然景物不再使用固定云山轮廓图集；运行中计算新的云团轮廓、色面、山脊和开阔区。
- 精细几何绘制的蒸汽机车、煤水车、八节修长客车；水平拱桥、栏杆、拱券与柔和蒸汽。
- 同行观察镜头：列车相对稳定，桥、山、云按不同深度后退；近景进入、局部遮挡并退出画面。
- 默认 30 分钟完整昼夜，可选 15/60 分钟或固定白天、暖霞、月夜；行进速度不改变昼夜速度。
- 云量、云形、取景、雾感、速度、色调；暂停、换种子、全屏、三档画质和诊断。
- Ambient／Focus／Relax 手动视觉预览；尚不是完整番茄钟，只有短测试音，没有正式配乐。
- Windows 0.2.0 测试包；2019 Intel Mac 网页基础体验正常，Mac 桌面版、低配功耗与最终审美认可仍待验证。当前以横屏为主。

## 开发

Node.js 24+、pnpm 11.18.0。桌面开发另需 Rust 和对应系统构建工具，见 [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)。

在仓库根目录逐条执行：

```powershell
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

网页地址通常为 `http://127.0.0.1:5173/`。运行时默认静音，测试声音仅播放一段低音量短音，不使用外部音乐。

```powershell
pnpm desktop:dev
pnpm desktop:build
```

Rust 必须位于 PATH。本机若刚安装且终端尚未更新，可在当前 PowerShell 会话设置：

```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
```

macOS 产物必须在 Mac 或 macOS 运行器构建。Windows 成功不能代替 macOS 验收。当前最低 macOS 11 配置是暂定构建门槛，并非所有该系统设备已验证。

## 自测

`pnpm test` 检查参数、像素预算、自动构图、活动时钟、种子和异步场景释放。

原生程序的 `--self-test` 模式执行 50 次场景重载，再记录 2 小时播放样本。日志只写入本机应用数据目录的 `validation.jsonl`，不上传。不能把程序自测等同于显示器拔插、锁屏或真实低配功耗验收。

原生 `--platform-test` 模式短暂切换测试窗口全屏、创建和关闭独立控制窗口，并验证暂停／恢复消息往返。结果写入本机 `platform-validation.jsonl`；不播放声音，不操作系统锁屏或睡眠。该探针不能替代真实设备交互验收。

Windows 探针还会最小化／恢复自己的测试窗口，检查原生事件是否暂停与恢复引擎。锁屏／睡眠桥接已接入 Windows；macOS 已接入睡眠、屏幕休眠、会话切换、最小化和窗口遮挡通知。Mac 实机锁屏与恢复行为仍需验证，不把编译通过等同于原生验收。

探针会把自己的窗口移到可用显示器和屏幕外，检查工作区尺寸与自动找回，然后恢复原位置。它不会更改系统显示器配置，也不等同于真实拔屏测试。

若支持 WEBGL_lose_context，探针还会触发自身画布的上下文丢失／恢复，验证场景重建；不会更改系统显卡设置。该测试可能短暂显示图形恢复提示。

快捷键：空格暂停／继续画面，F 全屏。设置面板可关闭；小窗口以覆盖面板显示。控制按钮空闲时淡出，移动鼠标重新显示。

## 文档

- [产品设计](docs/PRODUCT_DESIGN.md)
- [总体架构](docs/ARCHITECTURE.md)
- [第一阶段计划](docs/PHASE_1_DEVELOPMENT.md)
- [第二阶段设计](docs/PHASE_2_DESIGN.md)
- [第二阶段测试版移交](docs/validation/PHASE_2_HANDOFF.md)
- [第二阶段列车造型设计](docs/TRAIN_VISUAL_DESIGN.md)
- [第一阶段测试版移交与下载位置](docs/validation/PHASE_1_HANDOFF.md)
- [视觉方向](docs/VISUAL_DIRECTION.md)
- [实测记录](docs/validation/PHASE_1_RESULTS.md)
- [朋友设备测试说明](docs/validation/DEVICE_TEST_GUIDE.md)

## 素材与发布

当前运行时画面由程序几何与连续程序自然场绘制，统一着色并离线运行。两张 imagegen 局部灰度图集是已停用的历史方案，制作记录见 `scenes/cloudsea-railway/assets/PROVENANCE.md`。参考视频与截帧仅用于本地分析，不随应用打包。概念图记录在 `docs/concepts`，不作为整幅场景纹理。项目代码采用 [MIT 许可证](LICENSE)。概念图及历史生成素材的制作来源保留在项目文档中。参考视频、参考截帧、本地测试录像与构建缓存不提交到仓库。

## 开发验收录制

开发服务器的 `/review.html` 默认提供 **1 分钟昼夜快速验收**，也可选择正式30分钟周期，录制时长可选1/3/5/30分钟。它按有效播放时间计时，使用相同场景代码；此页面不是生产构建入口，不改变正式程序的30分钟默认值，不随安装包提供。长时间功耗/稳定性测试独立安排，不阻塞每次开发交付。


开发服务器 `/study.html` 提供固定种子、距离、五个时段与列车侧面放大检查；`/review.html` 用于真实渲染录制。需要直接保存录制文件时，先在根目录运行 `node scripts/record-sink.mjs`，再访问 `/review.html?localCapture=1`。接收器只监听本机，仅接受本项目 5173 端口来源，完成一次保存后退出；文件留在 `.local/recordings`，不会上传。
