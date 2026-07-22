# 双向同步冲突：halo:post-yq6gvltm

解决下面的冲突标记后，把最终版本写回文章文件并删除此文件。

---
haloId: "post-yq6gvltm"
author: "eH"
source: "GitHub"
title: "KDraw 互操作性研究记录：从 Java 运行时分析到 GFont 与 G-code 重建"
slug: "kdraw-java-native-gfont-interoperability-record"
description: "记录对本地 KDraw 环境进行 Java 运行时观察、JNA 边界分析、GFont 格式解析、独立兼容实现和 G-code 可视化验收的过程，重点讨论方法、数据布局和工程验证。"
pubDate: "2026-07-22T08:17:30.409184064Z"
<<<<<<< github.md
updatedDate: "2026-07-22T08:22:18.707489320Z"
=======
updatedDate: "2026-07-22T08:22:57.802206329Z"
>>>>>>> halo.md
cover: "https://blog.ehzsy.space/article-assets/kdraw-interoperability-cover.png"
categories: ["技术杂谈","嵌入式"]
tags: ["教程","Linux"]
pinned: false
haloUrl: "https://dxlab.ehzsy.space/archives/kdraw-java-native-gfont-interoperability-record"
---

本文整理一次针对本地 KDraw 安装环境的互操作性研究。目标不是发布原软件、破解授权或复制专有实现，而是回答三个工程问题：Java 应用如何跨过 JNA 调用本地库、`.gfont` 如何表达字形路径、以及能否用独立实现把合法持有的字体数据转换成可验证的 G-code。

研究代码和可公开的独立工具位于：

```text
https://github.com/zsyeh/arthas-kdraw
```

仓库不应包含原厂 JAR、原厂 native 二进制、授权信息或其他不可再分发产物。复现实验前，也应确认自己拥有分析目标和字体文件的合法使用权。

## 一、研究路径

整个过程分成五层：

```text
Java 运行时观察
      ↓
类与调用关系恢复
      ↓
JNA / native ABI 识别
      ↓
GFont 容器和字形格式解析
      ↓
独立 G-code 生成与可视化验收
```

最终形成的公开工具包括：

```text
scripts/gfont_to_gcode.py
scripts/gfont_text_to_gcode.py
scripts/decrypt_chinese_gfont_to_gcode.py
scripts/render_gcode_preview.py
scripts/analyze_callchains.py
native_rewrite/
run_acceptance.sh
```

## 二、为什么只做静态反编译不够

安装包的启动配置表明，应用通过 jpackage launcher 启动，并在 JVM 启动阶段加载额外 native agent。部分 class 在磁盘状态下并不适合直接进行常规静态分析，因此研究过程转向运行时：只在本机进程中观察已经由 JVM 正常装载的类。

使用 Arthas 时，关键不是机械地 dump 全部内容，而是先确认：

1. 实际应用进程；
2. 负责业务类的 ClassLoader；
3. 已经加载和尚未触发加载的类；
4. Java bridge 与 native 库的边界；
5. 导出结果是否仍然具有标准 class magic。

标准 Java class 文件头应为：

```text
CA FE BA BE
```

需要特别注意 JAR 的资源条目编码。把整个归档 `unzip` 后再普通 `zip`，可能破坏原有 central directory 中的特殊文件名。研究中采用“保留资源归档，只更新经过授权分析的 class 条目”的方式，避免因为归档工具差异产生假故障。原始和导出的专有 JAR 均不作为博客附件发布。

## 三、定位 Java 到 native 的边界

应用通过 JNA 声明 native bridge。研究重点不是复刻内部算法，而是确认公开可观察的 ABI：参数类型、返回指针、结果长度和内存释放责任。

一类典型接口返回 `Pointer`。Java 侧协议表现为：

```text
offset 0: 32-bit result length
offset 4: result int array
```

调用方读取长度后再取数组，最后必须调用 `freeMemory`。这条规则非常重要：如果 ctypes 或自写 bridge 忘记释放 native 分配的内存，批量处理字体时会持续泄漏；如果误判长度单位，则可能越界读取。

另一类图像与路径接口涉及：

- 阈值计算；
- 二值化；
- 骨架细化；
- 路径追踪；
- Ramer–Douglas–Peucker 简化；
- squiggle 路径生成。

独立兼容实现采用 Otsu 阈值、Zhang–Suen 细化、简单路径跟踪与 RDP 简化。这是基于公开算法重新实现相同类型的功能，并非原厂本地库的逐位复刻。

## 四、GFont 是什么

`.gfont` 可以被 ZIP API 定位到 central directory，但文件头前还包含自己的版本元数据。解析器首先读取：

```text
文件前 4 字节：big-endian int，表示 GFont version
```

字形 entry 命名随版本变化：

```text
version < 3  : 使用原始字符名
version >= 3 : 使用 Java UTF-16 code unit 的十进制形式
```

例如：

```text
A    -> 65
竖   -> 31446
中文 -> 20013_25991
```

这样做时不能简单使用 Python Unicode code point 代替 Java UTF-16 code unit。BMP 外字符需要正确处理代理对，否则 entry 名会不匹配。

## 五、字形 entry 的二进制布局

字形头随版本不同：

```text
version <= 7:
  readChar()     // 2 字节 UTF-16

version >= 8:
  readUTF()      // Java modified UTF-8

version >= 9:
  readFloat()    // advance / width
```

后续由若干路径块构成：

```text
readInt()               float_count
readFloat() × count     coordinates
readInt()               command_count
readByte() × count      commands
```

已观察到的路径命令：

| 值 | 含义 | 消耗坐标 |
| --- | --- | --- |
| `0` | moveTo | 2 个 float |
| `1` | lineTo | 2 个 float |
| `2` | cubicTo | 6 个 float |

一个重要踩坑是：新版英文 Hershey 字体常见 version 9，而中文字体大量使用 version 5、6、7。如果无条件按 version 9 多读一个 advance，中文 entry 会在路径区错位，最终表现为 EOF 或完全错误的坐标。

## 六、从字形路径生成 G-code

转换器把每个 glyph 的 path command 变成刀具轨迹：

```text
moveTo  -> 抬刀后快速移动
lineTo  -> 落刀后直线插补
cubicTo -> 将三次 Bézier 自适应采样为折线
```

典型输出结构：

```text
G21
G90
G0 Z5.000
G0 X10.000 Y10.000
G1 Z-1.000 F200
G1 X12.500 Y14.000 F600
G0 Z5.000
M2
```

实际刀具参数必须由使用者根据材料、主轴和机床重新确认。博客中的数值只用于软件路径验证，不能直接视为生产加工参数。

## 七、横排、居中与竖排

排版器支持：

- 自定义页面宽高；
- A4、A3 等页面预设；
- 字号、字符间距和行距；
- 左、中、右对齐；
- 横排与竖排；
- 安全边距；
- 多行文本。

布局过程先测量 glyph advance 和边界，再确定每行或每列的原点，最后将局部字形坐标变换到页面坐标。竖排不是简单交换 X/Y：还需要重新定义列推进方向、字符中心和行间距。

当字体不包含某个字符时，工具会先做 coverage 检查，并输出缺失列表，而不是静默生成空白。这对中文字体尤其关键，因为同名字体的不同版本未必包含相同字符集。

## 八、独立兼容库

`native_rewrite/` 中有两组 C/C++ 兼容实现，用于验证 Java/Python 与 native ABI 的理解：

```text
libDrawsoftEncrypt_compat.so
libkenjoycnc_compat.so
```

它们的设计原则是：

1. 导出测试环境需要的相同函数签名；
2. 遵循已观察到的返回内存布局；
3. 为路径与图像功能使用公开算法；
4. 只服务于互操作性和测试；
5. 不复制或分发原厂实现。

smoke test 会检查内存协议、round-trip、阈值、路径数组和 RDP 结果长度。任何调用 native 返回指针的路径都必须同时覆盖释放测试。

## 九、一键验收

公开仓库提供：

```bash
./run_acceptance.sh
```

验收流程包括：

1. Python 语法检查；
2. 编译独立 native 兼容库；
3. 执行 ABI smoke test；
4. 检查输入文本的字形覆盖率；
5. 生成横排与竖排 G-code；
6. 导出本次使用的字形 JSON；
7. 渲染 HTML/SVG 预览。

主要输出：

```text
output/acceptance/acceptance_center.gcode
output/acceptance/acceptance_vertical.gcode
output/acceptance/decoded_glyphs.json
output/acceptance/acceptance_center.svg
output/acceptance/acceptance_vertical.svg
```

预览器不控制机床，只解释 G0/G1 路径并绘制矢量图。它可以在真正加工前发现空字形、坐标翻转、页面越界、抬刀遗漏和竖排方向错误。

## 十、典型排错记录

### 中文解析到一半 EOF

先检查 GFont version。version 5–7 不包含 version 9 的 advance 字段，多读 4 字节会破坏后续所有边界。

### 生成成功但预览空白

检查字形覆盖率、页面范围、坐标缩放和 Z 安全高度；同时确认预览器识别的是当前生成器使用的 G0/G1 方言。

### 部分字符消失

不要用字体文件名推测覆盖范围。直接枚举 ZIP entry，并用 Java UTF-16 命名规则计算目标字符 entry。

### native 测试跑久后内存持续增长

逐个检查返回 `Pointer` 的接口是否在异常路径和正常路径上都调用了对应的 `freeMemory`。

### 归档能打开但 `jar tf` 失败

检查 central directory 文件名编码。不要无条件使用 unzip/zip 重建包含特殊资源名的归档。

## 十一、结论

这次研究最有价值的不是某一个 dump 文件，而是一套可复核的方法：

```text
先从运行时确定真实边界
再用静态调用关系缩小范围
明确 native ABI 与内存所有权
按版本解析容器和字形
最后用独立实现与可视化输出验收
```

对于跨 Java、native、二进制字体和 CNC 路径的系统，任何一层“看起来能运行”都不足以证明正确。只有格式解析、ABI、排版、G-code 和可视化结果全部闭环，才算完成了可维护的互操作性工程。
