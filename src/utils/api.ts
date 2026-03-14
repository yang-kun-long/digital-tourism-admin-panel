// CloudBase HTTP API 工具类
const ENV_ID = 'cultural-tourism-7fb138kf77a2cb2'
const REGION = 'ap-shanghai'

// 调用云函数
export const callFunction = async (name: string, data: any) => {
  const url = `https://${ENV_ID}.${REGION}.tcb-api.tencentcloudapi.com/web`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CloudBase-Action': 'functions.invokeFunction'
    },
    body: JSON.stringify({
      action: 'functions.invokeFunction',
      function_name: name,
      request_data: JSON.stringify(data)
    })
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()

  // 解析云函数返回结果
  if (result.code) {
    throw new Error(result.message || '调用失败')
  }

  return JSON.parse(result.data.response_data)
}

// 获取临时文件 URL
export const getTempFileURL = async (fileList: Array<{ fileID: string; maxAge: number }>) => {
  const url = `https://${ENV_ID}.${REGION}.tcb-api.tencentcloudapi.com/web`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CloudBase-Action': 'storage.batchGetDownloadUrl'
    },
    body: JSON.stringify({
      action: 'storage.batchGetDownloadUrl',
      file_list: fileList.map(f => ({
        fileid: f.fileID,
        max_age: f.maxAge
      }))
    })
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()

  if (result.code) {
    throw new Error(result.message || '获取文件URL失败')
  }

  return {
    fileList: result.data.download_list.map((item: any) => ({
      fileID: item.fileid,
      tempFileURL: item.download_url
    }))
  }
}
