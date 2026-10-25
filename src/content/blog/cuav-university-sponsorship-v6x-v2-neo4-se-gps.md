---
author: "eH"
source: "GitHub"
title: "不只是一场比赛：CUAV 高校赞助与我们的无人机实践"
slug: "cuav-university-sponsorship-v6x-v2-neo4-se-gps"
description: "山东理工大学电子爱好者协会的无人机备赛回顾：CUAV V6X V2、NEO 4 SE GPS 开箱与装机、室内验证、竞赛遗憾复盘和自购 X7+ 后的继续探索。附团队影像与产品使用报告。"
pubDate: "2026-09-08T17:20:00+08:00"
updatedDate: "2026-10-25T20:28:00+08:00"
cover: "https://blog.ehzsy.site/article-assets/cuav-sponsorship-2026/05-team-cuav.jpg"
categories: ["飞控", "恰饭"]
tags: ["CUAV", "雷迅创新", "APM", "PX4", "V6X V2", "NEO 4 SE GPS", "X7+", "无人机", "视觉定位", "电子设计竞赛"]
pinned: false
---

电赛告一段落，实验室里那些反复调代码、焊板子、拆装机体的日子，却没有随比赛一起结束。我们曾对模拟测试充满期待，也经历了成绩出来后的失落。回头看，这段经历并不圆满，但值得认真留下一份记录。

这篇文章是山东理工大学电子爱好者协会的阶段性实践回顾，也想郑重感谢广州雷迅创新科技股份有限公司 CUAV 对学生团队的支持。从赞助设备到后续自购升级，设备给了我们继续试错的条件；而竞赛中的遗憾，也提醒我们：把系统做好，不止是让飞机飞起来。

> **赞助说明**：本次高校赞助物资包括 V6X V2 飞控、NEO 4 SE GPS 及品牌物资；文中 X7+ 飞控为团队后续自费购入。本文保留备赛经历与个人使用感受，不将室内飞行画面作为 GNSS 定位精度或硬件性能对比的依据。

<figure>
  <a href="/article-assets/cuav-sponsorship-2026/05-team-cuav.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/05-team-cuav.jpg" alt="山东理工大学电子爱好者协会成员手持 CUAV 高校赞助旗帜合影" width="1707" height="1280" loading="eager" fetchpriority="high" /></a>
  <figcaption>一起备赛、一起调试的伙伴，也一起记下这份支持。</figcaption>
</figure>

## 从一次赞助申请说起

备赛初期，硬件经费一直是绕不开的问题。飞控、定位模块和整机调试投入叠加起来，对学生社团而言并不是一笔小开销。我们抱着试一试的心态提交了 CUAV 高校赞助申请，随后收到了回复和物资支持。

拆开快递时，实验室里的同学围过来看产品、核对型号，那份惊喜至今还记得。申请与对接过程中的耐心沟通，让我们感受到，这份支持不只是寄来一套设备，也是给还在摸索的学生一次接触专业硬件、把想法做成实物的机会。

在当时的沟通中，我们也了解到面向高校学生的教育优惠与技术社团支持。相关申请条件、折扣与支持方式，应以 CUAV 当期官方说明为准。对我们来说，这些实实在在的支持，减轻了团队的备赛压力。

## 开箱：先把每一件物资记录清楚

物资到达后，我们先记录外包装、型号和配件，再安排安装与调试。飞控、GPS 和品牌物资分别归档，也为阶段反馈保留原始影像。CUAV 品牌 T 恤等物资，则一并用于团队活动和赞助素材拍摄。

<figure>
  <a href="/article-assets/cuav-sponsorship-2026/01-cuav-materials.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/01-cuav-materials.jpg" alt="CUAV 高校赞助物资，包括飞控、GPS 包装与品牌物资" width="1600" height="900" loading="lazy" /></a>
  <figcaption>赞助物资到达：先清点，再进入装机和测试。</figcaption>
</figure>

### V6X V2：飞行控制链路的核心

V6X V2 在项目中承担飞行控制核心的角色，用于姿态稳定、控制指令执行和飞行过程管理。围绕这块飞控，我们继续推进硬件接入、整机调试与任务验证，而不是把开箱当作项目的终点。

<figure>
  <a href="/article-assets/cuav-sponsorship-2026/02-v6x-v2-flight-controller.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/02-v6x-v2-flight-controller.jpg" alt="CUAV V6X V2 飞控的产品开箱与型号记录" width="1600" height="900" loading="lazy" /></a>
  <figcaption>V6X V2 飞控开箱记录。</figcaption>
</figure>

### NEO 4 SE GPS：为室外任务准备定位链路

NEO 4 SE GPS 的开箱与外观也做了单独记录。它在项目方案中面向室外开阔场景的位置获取、导航与返航链路验证。

需要区分的是：**本次展示的室内飞行画面，不能证明当时启用了 GNSS 定位，也不能用于评价 GPS 定位精度。** 室外卫星状态、航迹与相关日志，仍需要单独测试和留存。

<figure>
  <a href="/article-assets/cuav-sponsorship-2026/03-neo4-se-gps.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/03-neo4-se-gps.jpg" alt="NEO 4 SE GPS 的产品包装与开箱记录" width="1600" height="900" loading="lazy" /></a>
  <figcaption>NEO 4 SE GPS 开箱记录；室内验证与室外 GNSS 测试分开说明。</figcaption>
</figure>

## 从桌面走向机体：安装与应用记录

开箱之后，才是把设备接入整套系统的工作。补充的安装照片记录了机体、飞控与顶部模块的相对位置，以及机架中的布置情况，补上了早期素材里“看到包装，却看不清装机状态”的缺口。

下面两张照片保留原始画幅，点击可打开大图查看细节。照片用于展示安装状态，不替代接线说明、参数配置或飞行日志。

<div class="cuav-gallery">
<figure>
  <a href="/article-assets/cuav-sponsorship-2026/06-installed-detail-1.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/06-installed-detail-1.jpg" alt="安装完成后的无人机近景一，可见顶部模块、机架和线缆布置" width="1920" height="1440" loading="lazy" /></a>
  <figcaption>安装完成后的机体特写（一）。</figcaption>
</figure>
<figure>
  <a href="/article-assets/cuav-sponsorship-2026/07-installed-detail-2.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/07-installed-detail-2.jpg" alt="安装完成后的无人机近景二，可见机体中央飞控及顶部模块" width="1920" height="1440" loading="lazy" /></a>
  <figcaption>安装完成后的机体特写（二）。</figcaption>
</figure>
</div>

### 室内视觉目标与基础飞行验证

我们的项目围绕“多旋翼无人机视觉目标定位与飞行控制验证”展开：在室内布置多组视觉标志，开展起飞、悬停、近距离机动和目标区域飞行验证，检查飞行控制链路与视觉感知任务之间的协同。

原始应用素材记录了飞行器起飞、悬停和多位置机动的过程。这里保留相应的静态画面，不嵌入视频。没有同步展示飞控日志与量化测试记录，因此不据此给出控制精度、成功率等数值结论。

<figure>
  <a href="/article-assets/cuav-sponsorship-2026/04-indoor-flight-test.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/04-indoor-flight-test.jpg" alt="室内布置视觉标志的多旋翼无人机飞行验证场景" width="1280" height="720" loading="lazy" /></a>
  <figcaption>室内视觉目标场景：从开箱与装机，走到实际飞行验证。</figcaption>
</figure>

## 比赛留下的遗憾，也要认真复盘

备赛时，我们围绕自主航线、定点悬停等任务进行了反复练习。几次模拟测试的完成情况让大家很有信心，也因此对正式比赛有过很高的期待。

但最终成绩并不理想。复盘时，我们记下了一个不该忽略的问题：**没有注意到安装硬件开关的要求。** 对做技术的人来说，很容易把注意力全部放在算法、控制和调参上，却漏掉规则与交付条件中的关键一项。这份遗憾不能只归结为临场发挥，也不能靠设备升级来弥补。

那段时间，大家确实低落过，觉得辜负了长时间的准备。但这次经历也让我们明白：规则核对、硬件要求、整机检查和任务测试，应该放在同一张清单上。模拟测试做得好，并不意味着参赛准备已经完整。

此前一届参赛时，团队也使用过 CUAV 飞控，经历了从省赛到国赛并获得国家级奖项的过程。那段使用经历，是我们这次继续选择 CUAV 的重要原因。两次经历放在一起，更让我们明白：设备提供基础，团队仍要对规则理解和系统完整性负责。

## 自购 X7+：比赛结束，探索没有停止

赛后，我们自费购入了一块 CUAV X7+ 飞控，希望继续尝试新功能，也为下一届成员的学习和备赛留下一套可持续使用的设备。**这块 X7+ 不属于本次 V6X V2 与 NEO 4 SE GPS 的赞助清单。**

在后续调试中，我们继续练习机动、悬停和新功能，也尝试从基础调参走向更深入的二次开发。新设备带来了探索的热情，但主观上的“更顺手”，不能直接等同于算力、姿态稳定性或悬停精度的量化提升；不同硬件、参数和整机配置之间的差异，还需要规范测试才能说明。

对我们而言，升级设备的意义，是把试验继续做下去：让新成员有机会入门，让熟悉基础调参的同学继续探索控制算法与系统开发，也把踩过的坑记录下来。

<figure class="cuav-portrait">
  <a href="/article-assets/cuav-sponsorship-2026/08-self-funded-x7-plus.png" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/08-self-funded-x7-plus.png" alt="团队自费购入的 CUAV X7+ 飞控在无人机机架中的安装近景" width="1792" height="2388" loading="lazy" /></a>
  <figcaption>后续自费购入的 X7+：继续调试，也留给下一届成员继续探索。</figcaption>
</figure>

## 留给团队的一组影像

一张张整机照片背后，是不同阶段的搭建、拆装与调试。我们把这批素材一并保留下来，既记录设备，也记录社团的实践积累。

<div class="cuav-gallery">
<figure>
  <a href="/article-assets/cuav-sponsorship-2026/09-uav-cuav.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/09-uav-cuav.jpg" alt="团队成员手持 CUAV 高校赞助旗帜，与实验室无人机合影" width="1920" height="1440" loading="lazy" /></a>
  <figcaption>团队成员、赞助旗帜与实验室整机合影。</figcaption>
</figure>
<figure>
  <a href="/article-assets/cuav-sponsorship-2026/10-uav-with-cuav.png" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/10-uav-with-cuav.png" alt="CUAV 高校赞助旗帜与多架无人机、遥控器的实验室全景" width="2394" height="1796" loading="lazy" /></a>
  <figcaption>实验室平台与 CUAV 赞助物资全景。</figcaption>
</figure>
<figure>
  <a href="/article-assets/cuav-sponsorship-2026/11-aircraft-display-1.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/11-aircraft-display-1.jpg" alt="实验室中多架无人机与地面设备的纵向展示" width="1440" height="1920" loading="lazy" /></a>
  <figcaption>无人机展示（一）：保留原始纵向画幅。</figcaption>
</figure>
<figure>
  <a href="/article-assets/cuav-sponsorship-2026/12-aircraft-display-2.jpg" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/12-aircraft-display-2.jpg" alt="实验室中多架无人机及遥控器的横向展示" width="1920" height="1440" loading="lazy" /></a>
  <figcaption>无人机展示（二）：整机与地面设备。</figcaption>
</figure>
</div>

<figure class="cuav-portrait">
  <a href="/article-assets/cuav-sponsorship-2026/13-aircraft-lineup.png" target="_blank" rel="noopener"><img src="/article-assets/cuav-sponsorship-2026/13-aircraft-lineup.png" alt="沿实验室通道排列的部分无人机平台" width="1792" height="2388" loading="lazy" /></a>
  <figcaption>部分无人机平台：把实践积累留下来，让下一届不必从零开始。</figcaption>
</figure>

## 阶段记录与后续计划

这一阶段，我们留下了物资到达、产品开箱、机体安装、室内应用和团队展示的影像。2026 年 9 月 8 日整理的产品使用报告，记录了当时的材料与证据边界；本次更新又补入安装特写和团队照片。报告中提到的“补拍安装与团队素材”，已有了相应图片，但参数页面、飞行日志和室外 GNSS 验证仍不能由照片代替。

接下来，希望把这份记录继续补完整：

- 把竞赛规则、硬件开关等要求纳入备赛检查清单，避免只顾调试、遗漏交付条件。
- 补齐接线说明、地面站参数页面与飞行日志，让调试过程可追溯。
- 在合适的室外开阔环境中，单独记录卫星状态、定位结果、航迹与返航链路测试。
- 继续整理飞控开发、调参和二次开发经验，留给协会成员，也分享给同样在做无人机的同学。

后续飞行测试仍将以安全为前提，遵守当地要求，并注意场地与第三方权益。

### 报告与原始文稿

<div class="cuav-attachments">
  <a href="/article-assets/cuav-sponsorship-2026/cuav-product-use-report.pdf" target="_blank" rel="noopener"><strong>产品使用报告 · PDF ↗</strong><span>2 页 · 2026 年 9 月 8 日的阶段记录，保留原始版本。</span></a>
  <a href="/article-assets/cuav-sponsorship-2026/original-post-draft.md" download><strong>原始推文草稿 · Markdown ↓</strong><span>未经本次润色的原稿，供对照阅读；正文已区分个人感受与量化结论。</span></a>
</div>

## 感谢支持，也期待下一次出发

学生时代做技术，常常要在有限经费、时间和经验之间反复取舍。幸运的是，我们遇到了愿意支持学生团队的伙伴，也有一群愿意继续动手、继续试错的同学。协会里的学弟学妹，也在这些设备与实践中逐渐找到了自己感兴趣的方向。

感谢 CUAV 雷迅创新对山东理工大学电子爱好者协会的信任与支持。一次比赛的成绩没有概括全部收获，遗憾也不该成为停止探索的理由。我们会把这次的教训带进下一轮准备，把设备继续用起来，把经验认真留下来。

下一次出发，希望不仅飞得起来，也准备得更完整。
