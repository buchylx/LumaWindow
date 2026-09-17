# Mac 实机测试 · 0.2.0

测试设备：2019 年 16 英寸 MacBook Pro，Intel，用户报告 macOS 26.6。

本轮提供网页测试包和完整构建源码包；[CI](https://github.com/buchylx/LumaWindow/actions/runs/35213299038) 已分别通过 Intel 与 Apple Silicon 原生编译。2026-09-17 用户反馈：上述 Mac 的 **0.1.3** 网页版基础体验正常；此反馈不能自动延用为 0.2.0 已验收。浏览器种类、持续功耗和长时间稳定性尚未单独记录；原生桌面包待用户后续测试。网页体验通过不代替桌面版的副屏、全屏和生命周期验收。

## 1. 最快体验：网页测试包

1. 从交付目录取 `LumaWindow-web-0.2.0.zip`，传到 Mac 并解压。
2. 安装 [Node.js 24 LTS](https://nodejs.org/en/download) 的 macOS 安装包。命令行 `node -p process.arch` 在这台 Intel Mac 上应输出 `x64`。已装 Node 24 的可跳过。
3. 打开“终端”，输入 `cd `（末尾有空格），将解压后的 `LumaWindow-web-0.2.0` 文件夹拖进终端，回车。
4. 执行：

```bash
node serve-web.mjs
```

5. 在 Safari 打开 **http://127.0.0.1:4173/**，拖到副屏，再点程序内的全屏按钮。不要直接双击 `index.html`。

无需安装项目依赖；服务仅监听本机，关闭时在终端按 Control+C。若提示端口占用，先关掉之前启动的同一预览服务再试。需要重测时重新运行上面的命令。

网页可检查 WebGL 画面和参数；独立控制窗口、屏幕选择等桌面功能需用下面的 `.app`。Safari 的结果也不能完全代替 Tauri 使用的 WKWebView。

## 2. 桌面版：在 Mac 本机编译

[Tauri 的 macOS 应用需在 Mac 构建](https://v2.tauri.app/distribute/macos-application-bundle/)。此处生成本机测试 `.app`，不要求先购买 Apple 开发者账号；正式对外分发的签名、公证另行处理。

### 首次准备

除上面的 Node.js 24 外，按 [Tauri 官方前置要求](https://v2.tauri.app/start/prerequisites/) 安装命令行工具与 Rust。仅桌面构建可使用 Xcode Command Line Tools：

```bash
xcode-select --install
```

按系统提示完成安装，然后安装 Rust：

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

接受默认的 stable 工具链后，关闭并重新打开终端，确认：

```bash
node --version
cargo --version
xcode-select -p
```

Node 应为 v24 或更新版本；Rust 使用当前 stable。无需另外全局安装 pnpm，构建脚本会使用固定的 pnpm 11.18.0。首次安装依赖需要网络和一定磁盘空间，后续编译使用缓存。

### 构建并打开

1. 将 `LumaWindow-source-0.2.0.zip` 传到 Mac 并解压。
2. 终端 `cd ` 后拖入解压的 **LumaWindow** 文件夹，回车。
3. 执行：

```bash
bash scripts/test-mac.sh
```

成功后脚本自动打开应用，产物位置：

```text
LumaWindow/.local/mac-build/release/bundle/macos/LumaWindow.app
```

可将 `.app` 复制到“应用程序”文件夹，以后双击启动，不需要一直运行终端。重新构建前先退出旧版。Intel Mac 会构建 Intel 版本，不要在这台电脑上选择 ARM 目标。

失败时提供终端最后的错误和 `LumaWindow/.local/mac-build.log`。Finder 默认隐藏 `.local`，可按 Command+Shift+. 显示隐藏文件。不要通过关闭系统安全功能来处理失败；先根据具体错误定位。

## 3. 第一轮检查：约 5 分钟

先选“平衡”画质，分别体验白天、暖霞和月夜预设。完整一分钟昼夜回归可运行下文的 `--quick-test`；普通设置面板提供 15/30/60 分钟周期。

| 检查 | 预期 |
| --- | --- |
| 默认运行 | 前景云、山后退最快，桥次之，远景更慢；遮挡关系与速度一致 |
| 速度拉到 0 | 列车与沿途景物停止推进；高空薄云仍缓慢移动，昼夜继续 |
| 暂停画面 | 行进、薄云、蒸汽与昼夜均停止；继续后平滑恢复 |
| 白天、月夜分别把雾感从 0 拉到 1 | 远山远云明显淡入空气色；近景保持较深轮廓，列车仍可辨识 |
| 自动昼夜（或下文 1 分钟快速测试） | 日夜转换连续，无黑屏、亮度跳变或整片色块闪烁 |
| 改窗口大小、进入/退出全屏 | 画面随窗口调整，无拉伸、裁切列车或残留黑边 |
| 桌面版移到副屏、使用控制窗口 | 场景正常显示；修改参数、暂停/恢复消息能到达场景窗口 |

然后恢复默认 **30 分钟**昼夜周期，正常工作时观察 10–15 分钟。选择“省电”再次比较流畅度和风扇；验收性能请使用本次 Release `.app`，不要使用开发服务器或 `desktop:dev`。

打开“活动监视器”，同时关注 LumaWindow 和相关 WebKit 内容/渲染进程，记录 CPU、内存、能耗与风扇声音。尽量保持相同亮度、显示器连接和电源状态，先记应用退出时的基线再比较；一次瞬时读数不足以证明长期功耗合格。

### 可选：自动短回归

退出普通应用，在源码根目录执行：

```bash
.local/mac-build/release/bundle/macos/LumaWindow.app/Contents/MacOS/lumawindow --quick-test
```

保持测试窗口可见。约 80–100 秒，执行 50 次场景重载、独立风速/暂停检查，再跑一轮 1 分钟昼夜。完成后关闭窗口。日志通常位于：

```text
~/Library/Application Support/app.lumawindow.desktop/validation.jsonl
```

查看本次启动后的 `motion-check`、`quick-complete`，遇到 `failed` 请提供该条及附近记录。该文件会追加历史结果，不要将旧记录当成本次通过。不要误用 `--self-test`，它是两小时长测。

## 4. 本次 Mac 测试的已知边界

- 已接入 macOS 官方的系统睡眠、屏幕休眠、用户会话切换、窗口最小化、遮挡与屏幕变化通知。多种暂停原因重叠时，只有全部解除才恢复；切到另一块屏幕工作不应暂停仍然可见的场景。编译通过不代表已实机验证。请分别测试最小化、完全遮挡、锁屏、合盖/唤醒；记录恢复后是否平滑、手动暂停是否仍然保留。锁屏可能经屏幕休眠或遮挡通知反映，不能仅凭会话切换通知假定所有系统版本都覆盖锁屏。
- 尚未在该 Mac 测量持续功耗和显存，也未验证 2014 年机型。项目中的 macOS 11 最低系统配置只是暂定门槛，不是实测兼容承诺。此次 Node 24 构建工具自身要求 macOS 13.5+，见 [Node 24 官方平台说明](https://github.com/nodejs/node/blob/v24.x/BUILDING.md)。
- 此次包含列车重绘、五时段色彩、连续山脉和沿途组合生成；稀疏飞鸟未纳入本轮。Focus 当前仍是手动阶段预览，未实现完整番茄钟和正式 BGM。

## 5. 反馈给我的信息

```text
Mac：2019 / 16 英寸 / Intel
macOS：26.6（或“关于本机”中显示的完整版本）
测试：Safari 网页 / Release .app
屏幕：内置或外接、分辨率、是否全屏
画质：平衡 / 省电；运行时长：
活动监视器：CPU / 内存 / 能耗（含相关 WebKit 进程）
风扇：安静 / 略有声音 / 明显加速
画面：昼夜、雾感、速度、暂停是否正常
问题截图或构建日志：
```


### Mac 生命周期接口依据

采用 [NSWindow 遮挡状态](https://developer.apple.com/documentation/appkit/nswindow/occlusionstate-swift.property)、[屏幕休眠通知](https://developer.apple.com/documentation/appkit/nsworkspace/screensdidsleepnotification)与[会话切换通知](https://developer.apple.com/documentation/appkit/nsworkspace/sessiondidresignactivenotification)。这些通知的编译接入与实际锁屏/多屏体验分开验收。
