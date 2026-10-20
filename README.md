# 时代留痕 · 中国近现代历史线上展厅

用于课程展示的静态博物馆网站。包含七组展品、主题筛选、文字搜索、展品详情、历史时间线及本地生成的分享二维码。适配手机；无需数据库、构建工具或第三方在线资源。

## 本地预览

在项目目录运行：

```bash
python -m http.server 4173
```

浏览器打开 http://localhost:4173 。本地预览中的二维码指向预定发布网址，只有网站上线后才可用于分享。

## GitHub Pages 发布

目标仓库：https://github.com/Berdyanskov/History.github.io

预定网址：https://berdyanskov.github.io/History.github.io/

1. 将代码推送到仓库的 `main` 分支。
2. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 打开 **Actions → Deploy exhibition to GitHub Pages**，如首次自动运行失败，在完成上一步后重新运行。
4. 部署成功后，打开上述网址，用页面的“分享展览”下载二维码。先用手机移动网络确认能打开，再放入课程海报或转发。

工作流仅发布网页与素材，不发布素材压缩包或开发文档。所有资源均用相对路径，可部署到项目子目录。

GitHub 官方说明：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 修改内容

- `assets/`：原始图片与文字，保留原样。
- `exhibits.js`：展品标题、分类、时间说明、导览摘要、思考题及阅读版文字。修改原始文字后，需要同步修改此文件。
- `index.html`：展厅结构、导言和页脚。
- `styles.css`：配色、布局及手机适配。
- `app.js`：筛选、搜索、详情与二维码。
- `.github/workflows/pages.yml`：自动部署配置。

详情链接示例：`#exhibit-1`。图片可在详情中打开完整原图。时间线区分事件年代、建筑年代与文献版本年代。中央文库材料的重复段落在阅读版中合并，原始文件保持不变。本站文字依据用户提供素材整理，未独立完成史料考证；上线前可补充图片出处、作者或馆藏来源信息。

二维码库：qrcode-generator 1.4.4，Copyright (c) 2009 Kazuhiko Arase，MIT License；代码存于 `vendor/`，不会将网址提交给第三方二维码服务。
