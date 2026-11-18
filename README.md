# 拖拉机 · 巨大化播种规划器

在线使用：https://xiaohui112.github.io/tractor-farm-planner/

纯静态网站。通过 Lua 5.1 WebAssembly 和 Web Worker 在浏览器中执行 Mod 原始 Lua 快照，无计算后端。支持巨大化·模版和巨大化·最优两种策略，展示库存使用、逐格布局、校验与分阶段耗时。

当前快照：Mod 0.5.24。来源与模块 SHA-256 可在网页的来源窗口查看。游戏资源版权归 Klei Entertainment；Lua 运行时许可证见 runtime/LUA-LICENSE.txt。

本仓库仅包含部署所需的网站文件。更新时同步整套静态资源，避免混用不同版本的运行时、适配器和 Lua 快照。

本地预览：`python3 -m http.server 8000 --bind 127.0.0.1`，然后打开 http://127.0.0.1:8000/ 。
