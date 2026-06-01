# 影子搬运工

一个基于影子间接推动机制的 HTML5 2D 解谜小游戏原型。

## 在线试玩

TODO: [游玩链接](https://navi-1218.github.io/shadow-mover/)

## 截图

![游戏截图](<img width="605" height="667" alt="image" src="https://github.com/user-attachments/assets/a9493386-7b46-4036-80dc-0a40933e71d3" />
)

TODO: 上传 GitHub Pages 后补充真实截图。

## 游戏简介

《影子搬运工》是一个使用 HTML5、JavaScript 和 Phaser 3 制作的 2D 网页小游戏原型。玩家不能直接推动箱子，只能通过影子来推动箱子，并将箱子移动到目标点。

项目保持轻量结构，不使用 TypeScript，不使用外部图片或音频素材，画面由简单几何图形绘制，适合初学者阅读、运行和继续修改。

## 核心玩法

- 玩家不能直接推箱子。
- 影子可以推箱子。
- 光源方向会影响影子位置。
- 用有限步数把箱子推到目标点。

## 操作方法

- 方向键：移动
- 触控按钮：移动
- Z：撤销一步
- R：重开当前关卡
- Space / Enter：开始游戏或进入下一关
- 数字键 1-5：选择关卡
- C：清除最佳记录

## 当前功能

- 开始界面
- 四方向光源
- 关卡选择
- 键盘与触控移动
- 玩家、影子、箱子、墙、目标点
- 影子推动箱子
- 玩家不能直接推动箱子
- 5 个逐步增加难度的关卡
- 每关步数限制
- 移动动画
- 撤销一步
- 本地最佳步数记录
- 清除最佳记录
- 简单死局提示
- 失败界面
- 单关通关步数提示
- 全部关卡完成界面

## 技术栈

- HTML5
- JavaScript
- Phaser 3
- Vite

## 本地运行方法

安装依赖：

```bash
npm install
```

启动本地开发服务器：

```bash
npm run dev
```

然后在浏览器中打开终端显示的本地地址。

## GitHub Pages 部署方法

1. 上传项目到 GitHub。
2. 打开仓库 Settings。
3. 进入 Pages。
4. Source 选择 Deploy from a branch。
5. Branch 选择 `main`。
6. Folder 选择 `/ (root)`。
7. 保存后等待部署完成。

## 项目结构

```text
.
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
└── src
    └── main.js
```

## 后续开发计划

- 更多关卡
- 更多箱子和目标点
- 可移动光源
- 更完整的动画
- 音效
- 关卡编辑器
- 移动端体验优化

## 版本说明

v0.4 原型版

- 增加四方向光源。
- 增加移动动画。
- 增加移动端触控按钮。
- 增加清除最佳记录功能。
- 优化 UI 文本与 README 展示内容。
