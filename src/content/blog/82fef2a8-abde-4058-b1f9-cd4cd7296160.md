---
haloId: "82fef2a8-abde-4058-b1f9-cd4cd7296160"
author: "YangLuoNou"
source: "Halo"
title: "[番外]启动rosrealsenses左右红外相机流"
slug: "3089d979-524d-466c-882e-0e174ea5aa55"
description: "法一： launch文件内添加 <arg name=\"enable_infra1\" default=\"true\"/>\n<arg name=\"enable_infra2\" default=\"true\"/>\n 法二； 添加运行参数： roslaunch realsense2_camera rs_came"
pubDate: "2025-11-29T16:19:03.060386019Z"
updatedDate: "2025-11-29T16:27:51.082852526Z"
cover: "/halo-assets/image-RowL.png"
categories: ["飞控"]
tags: ["定点","番外"]
pinned: false
haloUrl: "https://dxlab.ehzsy.space/archives/3089d979-524d-466c-882e-0e174ea5aa55"
---

## 法一：
launch文件内添加  
```xml
<arg name="enable_infra1" default="true"/>
<arg name="enable_infra2" default="true"/>
```
## 法二；
添加运行参数：  
```bash
roslaunch realsense2_camera rs_camera.launch enable_infra1:=true enable_infra2:=true
```
