<template>
  <div class="qrcode-test">
    <el-card title="二维码生成测试">
      <template #header>
        <span>生成电子相册小程序码</span>
      </template>

      <el-form :model="form" label-width="100px" style="max-width: 500px">
        <el-form-item label="订单号">
          <el-input v-model="form.orderId" placeholder="请输入订单号" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleGenerate">
            生成二维码
          </el-button>
          <el-button v-if="qrcodeUrl" @click="handleDownload">下载图片</el-button>
          <el-button v-if="qrcodeUrl" type="danger" plain @click="qrcodeUrl = ''">清除</el-button>
        </el-form-item>
      </el-form>

      <!-- 结果展示 -->
      <div v-if="qrcodeUrl" class="result">
        <p class="result-label">生成结果：</p>
        <img :src="qrcodeUrl" alt="小程序码" class="qrcode-img" />
      </div>

      <!-- 错误信息 -->
      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" style="margin-top: 16px" />

      <!-- 调试信息 -->
      <div v-if="debugInfo" style="margin-top: 16px">
        <p style="color: #909399; font-size: 13px; margin-bottom: 8px">调试信息：</p>
        <pre style="background: #f5f7fa; padding: 12px; border-radius: 4px; font-size: 12px; overflow: auto; max-height: 300px">{{ debugInfo }}</pre>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { callFunction } from '@/utils/cloudbase'

const form = ref({ orderId: '' })
const loading = ref(false)
const qrcodeUrl = ref('')
const errorMsg = ref('')
const debugInfo = ref('')

const handleGenerate = async () => {
  if (!form.value.orderId.trim()) {
    ElMessage.warning('请输入订单号')
    return
  }

  loading.value = true
  errorMsg.value = ''
  qrcodeUrl.value = ''
  debugInfo.value = ''

  try {
    const res = await callFunction('generateAlbumQRCode', {
      orderId: form.value.orderId.trim()
    })

    debugInfo.value = JSON.stringify(res, null, 2)

    if (res.success && res.buffer) {
      const uint8Array = new Uint8Array(res.buffer.data ?? res.buffer)
      const blob = new Blob([uint8Array], { type: res.contentType || 'image/png' })
      qrcodeUrl.value = URL.createObjectURL(blob)
      ElMessage.success('生成成功')
    } else {
      errorMsg.value = res.message || '生成失败'
    }
  } catch (e: any) {
    errorMsg.value = e.message || '调用云函数失败'
    debugInfo.value = JSON.stringify({ error: e.message, stack: e.stack }, null, 2)
  } finally {
    loading.value = false
  }
}

const handleDownload = () => {
  const a = document.createElement('a')
  a.href = qrcodeUrl.value
  a.download = `qrcode_${form.value.orderId}.png`
  a.click()
}
</script>

<style scoped>
.qrcode-test {
  padding: 20px;
}
.result {
  margin-top: 20px;
}
.result-label {
  color: #606266;
  margin-bottom: 12px;
}
.qrcode-img {
  width: 200px;
  height: 200px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  display: block;
}
</style>
