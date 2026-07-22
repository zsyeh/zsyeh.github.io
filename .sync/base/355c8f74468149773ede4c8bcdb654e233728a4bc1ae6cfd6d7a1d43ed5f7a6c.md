---
haloId: "post-2kfhmtlh"
author: "eH"
source: "GitHub"
title: "SmartZynq XC7Z020 实战记录：在 PL 中实现 HackCPU，并从 TF 卡启动"
slug: "smartzynq-zynq020-pl-hackcpu-build-record"
description: "记录在 SmartZynq SL XC7Z020CLG484-1 上完成 HackCPU、AXI4-Lite、UART、LED、HDMI HUD 与 BOOT.BIN 命令行构建的全过程，以及裁剪版 Vitis、JTAG 和视频输出中的真实问题。"
pubDate: "2026-07-22T08:17:31.131550353Z"
updatedDate: "2026-07-22T08:23:20.430463377Z"
cover: "https://blog.ehzsy.space/article-assets/smartzynq-hackcpu-fpga-cover.png"
categories: ["FPGA","嵌入式"]
tags: ["教程","mmcm","axi","zynq"]
pinned: false
haloUrl: "https://dxlab.ehzsy.space/archives/smartzynq-zynq020-pl-hackcpu-build-record"
---

这是一份完整的工程记录：目标不是在 Zynq 的 ARM 核上模拟一颗 CPU，而是在 **XC7Z020 的 PL 中真正实现 HackCPU**；PS 只承担程序装载、串口输出和辅助控制。最终产物包含 bitstream、XSA、裸机程序、FSBL 和可直接放入 TF 卡的 `BOOT.BIN`。

项目目录：

```text
/home/eh/Xilinx/hackcpu_zynq
```

目标板卡为 SmartZynq SL，器件型号：

```text
XC7Z020CLG484-1
```

## 一、最终架构

```text
              Zynq Processing System
              ┌─────────────────────┐
TF / SDIO ───▶│ FSBL + bare-metal   │
              │ demo application    │
              └─────────┬───────────┘
                        │ M_AXI_GP0
                        ▼
                 AXI SmartConnect
                   ┌────┴─────┐
                   ▼          ▼
             AXI UARTLite   HackCPU AXI IP
                   │          │
                 CH340     Hack CPU Core
                              │
                  ┌───────────┼───────────┐
                  ▼           ▼           ▼
               2 × LED      debug bus    HDMI HUD
```

设计边界很明确：

- Hack 指令执行、A/D/PC 寄存器、ROM、RAM 和 ALU 全在 PL；
- PS 通过 AXI4-Lite 写入程序、复位、单步或启动 CPU；
- UARTLite 通过板载 CH340 输出测试结果；
- PL 直接读取调试总线，在 HDMI 上显示 A、D、PC、IR 和 RAM[0]；
- SD 启动负责按顺序装载 FSBL、bitstream 和应用程序。

## 二、工具链调查：Vivado 在，但 Vitis 并不完整

机器上安装了 Vivado 2024.1 和 Vitis HLS 2024.1。最初看起来 `bootgen`、`xsdb`、`hsi` 都存在，似乎具备完整软件流；实际验证后发现新版 `platform/domain/app` 路径依赖的 `scw` 本地库没有正确进入运行环境。

即使手动加入：

```text
Vivado/2024.1/xsct-trim/lib/lnx64.o/libxv_scw.so
```

`xsdb` 仍会遇到 protobuf 冲突。这说明“随 Vivado 附带的 Vitis 组件”能提供部分命令，却不适合作为可靠交付链。

最终采用更可控的组合：

```text
Vivado TCL
  + HSI 旧式软件生成接口
  + arm-none-eabi-gcc
  + bootgen
```

另外，Vivado 在当前 Linux 上缺少 `libtinfo.so.5`。兼容库处理完成后，批处理 TCL 才能正常启动。这个问题属于宿主运行环境，不是 RTL 或工程配置错误。

## 三、HackCPU 的 PL 实现

核心采用经典 16 位 Hack 指令模型。A 指令直接装载 A 寄存器；C 指令控制 ALU、目标寄存器和跳转。

ALU 的数据通路可概括为：

```verilog
wire [15:0] x1 = zx ? 16'h0000 : x;
wire [15:0] x2 = nx ? ~x1 : x1;
wire [15:0] y1 = zy ? 16'h0000 : y;
wire [15:0] y2 = ny ? ~y1 : y1;
wire [15:0] f1 = f ? (x2 + y2) : (x2 & y2);
wire [15:0] f2 = no ? ~f1 : f1;
```

CPU 内部使用 256 × 16 bit ROM 和 256 × 16 bit RAM 作为演示存储空间，同时导出：

```text
dbg_a
dbg_d
dbg_pc
dbg_ir
dbg_ram0
```

这些信号既可以从 AXI 读取，也直接送入 HDMI 显示模块，因此观察调试状态不需要 PS 参与每一帧刷新。

## 四、AXI4-Lite 寄存器设计

HackCPU 被封装成一个 AXI4-Lite 从设备。寄存器表如下：

| 偏移 | 方向 | 用途 |
| --- | --- | --- |
| `0x00` | R/W | run、reset、step 控制 |
| `0x04` | R/W | ROM 写地址 |
| `0x08` | R/W | ROM 写数据并触发写入 |
| `0x0C` | R/W | RAM 地址 |
| `0x10` | R/W | RAM 数据 |
| `0x14` | R | A 寄存器 |
| `0x18` | R | D 寄存器 |
| `0x1C` | R | PC |
| `0x20` | R | 当前指令 IR |
| `0x24` | R | RAM[0] |
| `0x28` | R | LED 状态 |

PS 端应用程序写入下面的 Hack 程序：

```text
@2
D=A
@3
D=D+A
@0
M=D
(END)
@END
0;JMP
```

预期最终结果为 `RAM[0] = 5`。LED 使用 `RAM[0][1:0]`，因此不依赖额外控制寄存器就能直观看到执行结果。

## 五、Block Design 与板级连接

Block Design 包含：

- `processing_system7`；
- `proc_sys_reset`；
- `SmartConnect`，两个主输出；
- `AXI UARTLite`，115200 baud；
- 自定义 `hackcpu_axi` IP；
- 直接作为 module reference 加入的 `hdmi_hud`。

PS 的 `FCLK_CLK0` 设为 50 MHz，同时驱动 AXI、HackCPU 和 HDMI 模块的输入时钟。SD0 使用 MIO 40–45，CD 使用 MIO 46。目标是 TF 卡启动，因此构建期间移除了会造成互斥配置问题的 QSPI 设置。

一次典型错误是只连接外设 AXI 时钟，却忘记：

```text
M_AXI_GP0_ACLK
S_AXI_GP0_ACLK
```

Vivado 会在 BD 校验阶段阻止继续生成 wrapper。两者接入同一个 `FCLK_CLK0` 后，地址分配与 wrapper 生成才能完成。

## 六、PL 侧 HDMI HUD

显示目标是一个低分辨率工程监视器，而不是桌面级 GUI：

- 640 × 480 时序；
- 动态几何背景；
- 五行十六进制调试值；
- A、D、PC、IR、RAM[0]；
- LED 状态条。

50 MHz 输入经 MMCM 产生像素时钟与 5 倍串行时钟，RGB 进入 TMDS encoder，再由 OSERDESE2 串行化。字符部分没有使用字体 ROM，而是用七段式几何笔画绘制十六进制数字，节省了初始化资源，也便于直接综合。

这里保留一个真实边界：板厂参考约束只约束 HDMI 的 P 侧端口，属于简化的 DVI/电阻网络方案，兼容性不如标准差分 PHY。bitstream 已经成功生成，但部分显示器可能无法锁定信号。

最终写 bitstream 时仍有 6 条 `OSERDESE2 TRISTATE_WIDTH` 警告和一条 SmartConnect 无负载网络警告；DRC 为 0 Error。它们没有阻止本次构建，但后续若要长期维护，应继续清理原语三态参数。

## 七、从 XSA 到 BOOT.BIN

硬件构建入口：

```bash
vivado -mode batch -source tcl/create_project.tcl
```

脚本完成自定义 IP 打包、BD 生成、wrapper、综合、实现、bitstream 与 XSA 导出。

软件侧使用 HSI 生成 FSBL 和空应用模板：

```tcl
hsi::open_hw_design $xsa_path
hsi::create_sw_design fsbl_sw -proc ps7_cortexa9_0 \
  -app zynq_fsbl -os standalone
hsi::generate_app -dir $fsbl_dir -sw fsbl_sw -app zynq_fsbl
```

随后用 `arm-none-eabi-gcc` 编译 BSP、FSBL 和 demo。Boot Image Format 为：

```text
the_ROM_image:
{
  [bootloader]fsbl.elf
  hackcpu_zynq.bit
  hackcpu_demo.elf
}
```

最后执行：

```bash
bootgen -arch zynq -image boot.bif -o BOOT.BIN -w
```

成功产物：

```text
BOOT.BIN          约 4.0 MiB
hackcpu_zynq.bit  约 3.9 MiB
hackcpu_zynq.xsa  约 687 KiB
```

实现后的 setup WNS 为 `2.767 ns`，hold WHS 为 `0.029 ns`，满足时序。

## 八、TF 卡与启动验证

TF 卡被重建为单分区 FAT32，卷标：

```text
ZYNQBOOT
```

只需把 `BOOT.BIN` 放到根目录，将板卡拨码切换到 SD boot 后上电。预期 UART 输出：

```text
SmartZynq SL hackcpu demo
hackcpu base: 0x40000000
RAM[0]=5
A=6 D=5 PC=6 IR=0xEA87 RAM0=5 LED=1
PASS: 2 + 3 = 5
```

实际联调时，主机看到了 FT232H/Digilent 相关 USB 设备，但 `hw_server` 和 `xsdb` 无法枚举 JTAG TAP。排查过 udev 规则和 `ftdi_sio` 抢占后，仍不能把它当作标准 Xilinx 下载线使用。因此最终交付以 SD boot 为主，而不是把可重复构建建立在特定 JTAG 线缆上。

## 九、这次工程最重要的经验

1. **先验证工具能力，不要根据安装目录判断 Vitis 是否完整。** 命令存在不代表整条 platform 流可用。
2. **PL 与 PS 的职责要在架构阶段锁死。** 本项目始终坚持 HackCPU 在 PL，PS 只辅助。
3. **先跑通最小 PS + AXI + IP，再加 HDMI。** 否则很难区分板级配置、AXI、RTL 和视频链路问题。
4. **把 GUI 操作变成 TCL 和 shell。** 可重复生成的 XSA、bitstream 与 BOOT.BIN 比“某次 GUI 点成功”更有价值。
5. **记录未关闭的问题。** HDMI 电气兼容和 OSERDES 警告仍是后续任务，不应因为成功生成文件就被隐藏。

这次记录的真正成果不是一个 2 + 3 的演示，而是一条在不完整 Vitis 环境中仍可复现的 Zynq 裸机交付链：RTL、AXI、板级约束、软件生成、GNU 编译和 SD 启动全部能够通过脚本重新构建。
