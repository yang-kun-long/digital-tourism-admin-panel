# 图片存储使用指南

## 问题说明

后台管理系统中的图片显示失败，原因是数据库中存储的是小程序本地路径（如 `/static/goods/coffee.svg`），这些路径在 Web 后台管理系统中无法访问。

## 解决方案

### 方案1：使用云存储（推荐）

1. **上传图片到云存储**
   - 访问 CloudBase 控制台：https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/storage
   - 上传图片文件到云存储
   - 获取云存储文件 ID（格式：`cloud://xxx.xxx/path/to/image.jpg`）

2. **在后台管理系统中使用云存储 URL**
   - 创建/编辑商品、模板、地点时，使用云存储 URL
   - 支持的格式：
     - `cloud://xxx.xxx/path/to/image.jpg` （云存储 fileID）
     - `https://example.com/image.jpg` （完整 HTTP/HTTPS URL）

### 方案2：使用外部图片链接

直接使用完整的 HTTP/HTTPS 图片链接：
```
https://example.com/images/product.jpg
```

## 当前处理逻辑

系统已添加图片 URL 处理函数 `processImageUrl`：

- **完整 HTTP/HTTPS URL**：直接显示
- **云存储路径（cloud://）**：转换为临时访问 URL
- **小程序本地路径（/static/）**：显示占位图，提示上传云存储图片

## 使用建议

1. **新建内容**：使用云存储 URL 或完整 HTTP/HTTPS 链接
2. **已有内容**：逐步迁移到云存储
3. **小程序端**：可以继续使用本地路径，不受影响

## 云存储管理

- **控制台地址**：https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/storage
- **环境ID**：cultural-tourism-7fb138kf77a2cb2
- **区域**：ap-shanghai

## 注意事项

- 云存储文件需要配置适当的访问权限
- 建议使用 CDN 加速图片访问
- 定期清理不再使用的图片文件
