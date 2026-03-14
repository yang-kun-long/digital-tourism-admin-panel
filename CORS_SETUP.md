# 云存储 CORS 配置指南

## 问题描述

管理后台上传图片时出现 CORS 跨域错误：
```
Access to XMLHttpRequest at 'https://xxx.cos.ap-shanghai.myqcloud.com/...'
from origin 'http://localhost:5173' has been blocked by CORS policy
```

## 解决方案

### 方案一：腾讯云控制台配置（推荐）

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)

2. 进入 **云开发 CloudBase** 控制台

3. 选择环境：`cultural-tourism-7fb138kf77a2cb2`

4. 点击左侧菜单 **云存储**

5. 点击 **权限设置** 或 **安全配置**

6. 找到 **跨域访问 CORS** 配置

7. 添加以下 CORS 规则：

```json
{
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://your-domain.com"
  ],
  "AllowedMethods": [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "HEAD"
  ],
  "AllowedHeaders": [
    "*"
  ],
  "ExposeHeaders": [
    "ETag",
    "Content-Length",
    "x-cos-request-id"
  ],
  "MaxAgeSeconds": 3600
}
```

8. 保存配置

### 方案二：使用云函数中转上传（备选）

如果无法配置 CORS，可以创建云函数来处理文件上传：

1. 创建云函数 `uploadImage`：

```javascript
// cloudfunctions/uploadImage/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: 'cultural-tourism-7fb138kf77a2cb2'
})

exports.main = async (event, context) => {
  const { fileContent, cloudPath, contentType } = event

  try {
    // 将 base64 转为 Buffer
    const buffer = Buffer.from(fileContent, 'base64')

    // 上传到云存储
    const result = await cloud.uploadFile({
      cloudPath,
      fileContent: buffer
    })

    // 获取临时下载链接
    const tempUrlResult = await cloud.getTempFileURL({
      fileList: [result.fileID]
    })

    return {
      success: true,
      fileID: result.fileID,
      downloadURL: tempUrlResult.fileList[0].tempFileURL
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

2. 修改前端上传代码：

```typescript
// 使用云函数上传
const handleCoverUpload = async (options: UploadRequestOptions) => {
  const file = options.file as File

  uploading.value = true
  try {
    // 读取文件为 base64
    const reader = new FileReader()
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    // 去掉 data:image/xxx;base64, 前缀
    const fileContent = base64.split(',')[1]

    // 生成云存储路径
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split('.').pop()
    const cloudPath = `templates/${timestamp}_${randomStr}.${ext}`

    // 调用云函数上传
    const result = await callFunction('uploadImage', {
      fileContent,
      cloudPath,
      contentType: file.type
    })

    if (result.success) {
      form.value.cover = result.fileID
      coverPreviewUrl.value = result.downloadURL
      ElMessage.success('上传成功')
    } else {
      throw new Error(result.error)
    }
  } catch (error: any) {
    console.error('上传失败:', error)
    ElMessage.error(error?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}
```

## 生产环境配置

部署到生产环境时，需要在 CORS 配置中添加生产域名：

```json
{
  "AllowedOrigins": [
    "https://admin.your-domain.com",
    "https://your-domain.com"
  ],
  ...
}
```

## 验证配置

配置完成后，刷新管理后台页面，重新尝试上传图片。如果配置正确，应该可以成功上传。

## 注意事项

1. 本地开发时使用 `http://localhost:5173`
2. 生产环境必须使用 HTTPS
3. 不要使用 `*` 作为 AllowedOrigins（安全风险）
4. MaxAgeSeconds 建议设置为 3600（1小时）
