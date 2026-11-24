# 放映群岛 · Play Islands

可开车探索的 3D 小游戏作品集。五座展馆连接到中央港口，每座都能打开对应游戏的实景宣传片。视频使用即梦样片原声。

[打开网站](https://daytianup.github.io/play-islands/)

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 8080 --directory dist
```

浏览器打开 http://localhost:8080 。页面使用本地 Three.js、字体和视频，可以离线运行本地服务器。

## 继续迭代

- 在 `dist/projects.js` 修改作品资料、片长和创作手记。视频与封面分别位于 `dist/media/<id>.mp4` 和 `dist/media/<id>.jpg`。
- 新增一个实体展馆时，在 `dist/terrain.js` 添加岛与木桥，在 `dist/exhibits.js` 建模，在 `dist/projects.js` 绑定同一个 ID 和坐标。
- `dist/world.js` 控制驾驶、陆地边界、镜头和热点。`dist/app.js` 管理片单、播放器、驾驶入口和本地观看记录。
- 推送到 `main` 会触发仓库的 GitHub Pages 工作流，成功后上述网址即更新。
- 部署内容是 `dist/`。静态服务器应支持 MP4 和字节范围请求。

Three.js 和 Archivo Black 的许可证在 `dist/lib/`。交互灵感来自 [Bruno Simon 的作品集](https://bruno-simon.com/)，岛屿、展馆及驾驶场景为本项目创作。
