import cloudbase from '@cloudbase/js-sdk'

// CloudBase 配置
const app = cloudbase.init({
  env: 'cultural-tourism-7fb138kf77a2cb2',
  region: 'ap-shanghai'
})

// 获取认证实例
export const auth = app.auth()

// 获取数据库实例
export const db = app.database()

// 获取云存储实例
export const storage = app.uploadFile.bind(app)

// 获取临时文件下载链接
export const getTempFileURL = app.getTempFileURL.bind(app)

// 上传文件到云存储
export const uploadFile = async (file: File, cloudPath?: string): Promise<{ fileID: string; downloadURL: string }> => {
  try {
    // 如果没有指定云路径，自动生成
    if (!cloudPath) {
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const ext = file.name.split('.').pop()
      cloudPath = `goods/${timestamp}_${randomStr}.${ext}`
    }

    console.log('[uploadFile] 开始上传文件:', file.name, '到', cloudPath)

    // 上传文件
    const result = await app.uploadFile({
      cloudPath,
      filePath: file as any
    })

    console.log('[uploadFile] 上传成功:', result)

    // 获取下载链接
    const tempUrlResult = await app.getTempFileURL({
      fileList: [result.fileID]
    })

    const downloadURL = tempUrlResult.fileList?.[0]?.tempFileURL || result.fileID

    return {
      fileID: result.fileID,
      downloadURL
    }
  } catch (error: any) {
    console.error('[uploadFile] 上传失败:', error)
    throw new Error(error?.message || '上传失败')
  }
}

// 压缩图片
const compressImage = async (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // 如果图片宽度超过最大宽度，按比例缩放
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法获取 canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // 转换为 base64，使用指定的质量
        const base64 = canvas.toDataURL('image/jpeg', quality)
        resolve(base64)
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

// 通过云函数上传文件（解决 CORS 问题）
export const uploadFileViaFunction = async (file: File, cloudPath?: string): Promise<{ fileID: string; downloadURL: string }> => {
  try {
    // 如果没有指定云路径，自动生成
    if (!cloudPath) {
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const ext = file.name.split('.').pop()
      cloudPath = `templates/${timestamp}_${randomStr}.${ext}`
    }

    console.log('[uploadFileViaFunction] 开始上传文件:', file.name, '到', cloudPath)

    // 压缩图片（最大宽度 1920px，质量 0.8）
    const base64 = await compressImage(file, 1920, 0.8)

    // 去掉 data:image/xxx;base64, 前缀
    const fileContent = base64.split(',')[1]

    if (!fileContent) {
      throw new Error('图片数据格式错误')
    }

    // 检查压缩后的大小
    const sizeInMB = (fileContent.length * 0.75) / (1024 * 1024) // base64 转字节约为 0.75 倍
    console.log('[uploadFileViaFunction] 压缩后大小:', sizeInMB.toFixed(2), 'MB')

    if (sizeInMB > 5) {
      throw new Error('图片过大，请选择更小的图片或降低分辨率')
    }

    // 调用云函数上传
    const result = await callFunction('uploadImage', {
      fileContent,
      cloudPath,
      contentType: file.type
    })

    if (result.success) {
      console.log('[uploadFileViaFunction] 上传成功:', result.fileID)
      return {
        fileID: result.fileID,
        downloadURL: result.downloadURL
      }
    } else {
      throw new Error(result.error || '上传失败')
    }
  } catch (error: any) {
    console.error('[uploadFileViaFunction] 上传失败:', error)
    throw new Error(error?.message || '上传失败')
  }
}

// 图片 URL 缓存
const imageUrlCache = new Map<string, { url: string; expireTime: number }>()

// 批量处理图片 URL
export const batchProcessImageUrls = async (urls: string[]): Promise<string[]> => {
  if (!urls || urls.length === 0) return []

  const cloudUrls: string[] = []
  const urlMap = new Map<number, string>()

  // 分类处理不同类型的 URL
  const results = await Promise.all(
    urls.map(async (url, index) => {
      if (!url) return ''

      // HTTP/HTTPS URL 直接返回
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      }

      // 云存储 URL
      if (url.startsWith('cloud://')) {
        // 检查缓存
        const cached = imageUrlCache.get(url)
        if (cached && cached.expireTime > Date.now()) {
          return cached.url
        }
        cloudUrls.push(url)
        urlMap.set(index, url)
        return null // 标记需要处理
      }

      // 小程序本地路径
      if (url.startsWith('/static/') || url.startsWith('/')) {
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23409EFF" width="400" height="400"/%3E%3Ctext fill="%23fff" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="20"%3E请上传云存储图片%3C/text%3E%3C/svg%3E'
      }

      return url
    })
  )

  // 批量获取云存储临时 URL
  if (cloudUrls.length > 0) {
    try {
      const result = await app.getTempFileURL({
        fileList: cloudUrls
      })

      if (result.fileList && result.fileList.length > 0) {
        result.fileList.forEach((file, idx) => {
          if (file.tempFileURL) {
            const originalUrl = cloudUrls[idx]
            if (!originalUrl) return

            // 缓存 URL（有效期 2 小时）
            imageUrlCache.set(originalUrl, {
              url: file.tempFileURL,
              expireTime: Date.now() + 2 * 60 * 60 * 1000
            })

            // 更新结果数组
            for (const [index, url] of urlMap.entries()) {
              if (url === originalUrl) {
                results[index] = file.tempFileURL
              }
            }
          }
        })
      }
    } catch (error) {
      console.error('[batchProcessImageUrls] 批量获取临时 URL 失败:', error)
    }
  }

  // 将 null 替换为错误占位图
  const finalResults = results.map(url =>
    url === null
      ? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23F56C6C" width="400" height="400"/%3E%3Ctext fill="%23fff" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="20"%3E图片加载失败%3C/text%3E%3C/svg%3E'
      : url
  )

  return finalResults
}

// 处理图片 URL（异步版本）
export const processImageUrl = async (url: string): Promise<string> => {
  const results = await batchProcessImageUrls([url])
  return results[0] || ''
}

// 处理图片 URL（同步版本，返回占位图或缓存的 URL）
export const processImageUrlSync = (url: string): string => {
  if (!url) return ''

  // 如果是完整的 HTTP/HTTPS URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // 如果是云存储路径，检查缓存
  if (url.startsWith('cloud://')) {
    const cached = imageUrlCache.get(url)
    if (cached && cached.expireTime > Date.now()) {
      return cached.url
    }
    // 返回加载中占位图（SVG Data URL）
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%2367C23A" width="400" height="400"/%3E%3Ctext fill="%23fff" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="20"%3E加载中...%3C/text%3E%3C/svg%3E'
  }

  // 如果是小程序本地路径
  if (url.startsWith('/static/') || url.startsWith('/')) {
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23409EFF" width="400" height="400"/%3E%3Ctext fill="%23fff" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="20"%3E请上传云存储图片%3C/text%3E%3C/svg%3E'
  }

  return url
}

// 登录函数
export const login = async () => {
  try {
    // 检查是否已登录
    const loginState = await auth.getLoginState()

    if (loginState) {
      return true
    }

    // 使用匿名登录
    await auth.signInAnonymously()
    return true
  } catch (error: any) {
    console.error('CloudBase 登录失败:', error?.message || error)
    return false
  }
}

// 调用云函数
export const callFunction = async (name: string, data: any) => {
  try {
    const res = await app.callFunction({
      name,
      data
    })
    return res.result
  } catch (error: any) {
    console.error(`云函数 ${name} 调用失败:`, error?.message || error)
    throw error
  }
}

export default app
