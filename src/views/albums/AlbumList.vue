<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>旅拍相册管理</span>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            新建相册
          </el-button>
        </div>
      </template>

      <el-table :data="albumList" v-loading="loading" stripe style="margin-top: 10px">
        <!-- 封面 -->
        <el-table-column label="封面" width="90">
          <template #default="{ row }">
            <el-image
              v-if="row.coverUrl"
              :src="row.coverUrl"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-teleported="true"
              :preview-src-list="[row.coverUrl]"
            />
            <div v-else style="width:60px;height:60px;background:#f5f7fa;border-radius:4px;display:flex;align-items:center;justify-content:center;">
              <el-icon style="color:#c0c4cc"><Picture /></el-icon>
            </div>
          </template>
        </el-table-column>

        <!-- 相册名称 -->
        <el-table-column prop="title" label="相册名称" min-width="150" />

        <!-- albumId -->
        <el-table-column label="Album ID" min-width="220">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-family:monospace;font-size:12px;color:#606266;">{{ row.albumId || '未生成' }}</span>
              <el-button
                v-if="row.albumId"
                size="small"
                text
                :icon="CopyDocument"
                @click="copyAlbumId(row.albumId)"
                style="padding:2px;"
              />
            </div>
          </template>
        </el-table-column>

        <!-- 地点 -->
        <el-table-column prop="locationName" label="地点" width="130" show-overflow-tooltip />

        <!-- 照片数 -->
        <el-table-column label="照片数" width="80" align="center">
          <template #default="{ row }">
            {{ row.photos?.length || 0 }}
          </template>
        </el-table-column>

        <!-- 状态 -->
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 创建时间 -->
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="handleGenQrCode(row)">
              <el-icon><Crop /></el-icon>
              生成二维码
            </el-button>
            <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑相册' : '新建相册'"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="相册名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入相册名称" />
        </el-form-item>

        <el-form-item label="地点名称">
          <el-input v-model="form.locationName" placeholder="如：峨眉山、张家界" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="相册简介（可选）" />
        </el-form-item>

        <el-form-item label="相册照片" prop="photos">
          <div class="photo-upload-area">
            <!-- 已选照片预览 -->
            <div
              v-for="(item, index) in photoItems"
              :key="index"
              class="photo-thumb"
            >
              <el-image :src="item.previewUrl" fit="cover" style="width:100%;height:100%;border-radius:4px;" />
              <div class="photo-thumb-remove" @click="removePhoto(index)">
                <el-icon><Close /></el-icon>
              </div>
            </div>

            <!-- 上传按钮 -->
            <el-upload
              :show-file-list="false"
              :before-upload="() => false"
              :on-change="handlePhotoChange"
              accept="image/*"
              multiple
            >
              <div class="upload-trigger">
                <el-icon style="font-size:24px;color:#c0c4cc"><Plus /></el-icon>
                <div style="font-size:12px;color:#909399;margin-top:4px;">添加照片</div>
              </div>
            </el-upload>
          </div>
          <div style="color:#909399;font-size:12px;margin-top:6px;">
            支持 JPG、PNG，建议每张不超过 10MB
          </div>
        </el-form-item>

        <el-form-item label="状态" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 二维码对话框 -->
    <el-dialog v-model="qrDialogVisible" title="相册二维码" width="360px" align-center>
      <div style="text-align:center;padding:10px 0;">
        <div v-if="qrLoading" style="padding:60px 0;">
          <el-icon class="is-loading" style="font-size:32px;color:#409eff"><Loading /></el-icon>
          <div style="margin-top:12px;color:#909399;">生成中...</div>
        </div>
        <template v-else-if="qrUrl">
          <div style="margin-bottom:12px;color:#606266;font-size:13px;">
            相册：<strong>{{ currentAlbum?.title }}</strong>
          </div>
          <div style="font-size:12px;color:#909399;margin-bottom:16px;font-family:monospace;">
            {{ currentAlbum?._id }}
          </div>
          <img :src="qrUrl" alt="二维码" style="width:220px;height:220px;border:1px solid #ebeef5;border-radius:8px;" />
          <div style="margin-top:16px;">
            <el-button type="primary" @click="downloadQrCode">下载二维码</el-button>
          </div>
        </template>
        <el-alert v-else-if="qrError" :title="qrError" type="error" :closable="false" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadFile } from 'element-plus'
import { Plus, CopyDocument, Crop, Picture, Close, Loading } from '@element-plus/icons-vue'
import { callFunction, uploadFileViaFunction, processImageUrl, batchProcessImageUrls } from '@/utils/cloudbase'

interface Album {
  _id: string
  albumId?: string       // 12 位相册ID
  title: string
  locationName: string
  description: string
  photos: string[]       // cloud:// fileID 数组
  coverPhoto: string     // cloud:// fileID
  coverUrl?: string      // 转换后的临时 URL（仅前端用）
  status: 'active' | 'inactive'
  createTime: any
}

interface PhotoItem {
  fileID?: string        // 已上传的 cloud:// fileID（编辑时已有照片）
  file?: File            // 待上传的本地文件
  previewUrl: string     // 预览用 URL
}

const albumList = ref<Album[]>([])
const loading = ref(false)
const submitting = ref(false)

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()

const form = ref({
  _id: '',
  title: '',
  locationName: '',
  description: '',
  status: 'active' as 'active' | 'inactive'
})

// 照片列表（兼容已有图片和待上传图片）
const photoItems = ref<PhotoItem[]>([])

const rules: FormRules = {
  title: [{ required: true, message: '请输入相册名称', trigger: 'blur' }],
  photos: [
    {
      validator: (_rule, _value, callback) => {
        if (photoItems.value.length === 0) {
          callback(new Error('请至少添加一张照片'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 二维码相关
const qrDialogVisible = ref(false)
const qrLoading = ref(false)
const qrUrl = ref('')
const qrError = ref('')
const currentAlbum = ref<Album | null>(null)

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 加载相册列表
const loadAlbums = async () => {
  loading.value = true
  try {
    const res = await callFunction('getAdminAlbums', { adminId: adminInfo.value?.id })
    if (!res.success) {
      ElMessage.error(res.message || '加载失败')
      return
    }

    const list: Album[] = res.data
    const coverFileIDs = list.map((a: Album) => a.coverPhoto).filter(Boolean) as string[]
    const tempUrls = await batchProcessImageUrls(coverFileIDs)
    const urlMap: Record<string, string> = {}
    coverFileIDs.forEach((id: string, i: number) => {
      const url = tempUrls[i]
      if (url) urlMap[id] = url
    })

    albumList.value = list.map((a: Album) => ({
      ...a,
      coverUrl: urlMap[a.coverPhoto] || ''
    }))
  } catch (error) {
    console.error('加载相册失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 打开创建对话框
const openCreateDialog = () => {
  isEdit.value = false
  form.value = { _id: '', title: '', locationName: '', description: '', status: 'active' }
  photoItems.value = []
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = async (album: Album) => {
  isEdit.value = true
  form.value = {
    _id: album._id,
    title: album.title,
    locationName: album.locationName || '',
    description: album.description || '',
    status: album.status || 'active'
  }

  // 加载已有照片预览
  const items: PhotoItem[] = []
  if (album.photos?.length) {
    for (const fileID of album.photos) {
      const url = await processImageUrl(fileID)
      items.push({ fileID, previewUrl: url })
    }
  }
  photoItems.value = items
  dialogVisible.value = true
}

// 处理照片选择
const handlePhotoChange = (uploadFile: UploadFile) => {
  const file = uploadFile.raw
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件')
    return
  }
  if (file.size / 1024 / 1024 > 10) {
    ElMessage.error('图片不能超过 10MB')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    photoItems.value.push({
      file,
      previewUrl: e.target?.result as string
    })
  }
  reader.readAsDataURL(file)
}

// 移除照片
const removePhoto = (index: number) => {
  photoItems.value.splice(index, 1)
}

// 提交表单
const handleSubmit = async () => {
  await formRef.value?.validate(async (valid) => {
    if (!valid) return
    if (photoItems.value.length === 0) {
      ElMessage.warning('请至少添加一张照片')
      return
    }

    submitting.value = true
    try {
      // 上传新选择的照片
      const finalFileIDs: string[] = []

      for (let i = 0; i < photoItems.value.length; i++) {
        const item = photoItems.value[i]
        if (!item) continue

        if (item.fileID) {
          // 已有照片，直接保留 fileID
          finalFileIDs.push(item.fileID)
        } else if (item.file) {
          // 新照片，上传
          ElMessage.info(`正在上传第 ${i + 1} / ${photoItems.value.length} 张...`)
          const timestamp = Date.now()
          const ext = item.file.name.split('.').pop() || 'jpg'
          const cloudPath = `albums/${timestamp}_${Math.random().toString(36).slice(2, 8)}.${ext}`
          const result = await uploadFileViaFunction(item.file, cloudPath)
          finalFileIDs.push(result.fileID)
        }
      }

      const finalData = {
        title: form.value.title,
        locationName: form.value.locationName,
        description: form.value.description,
        photos: finalFileIDs,
        coverPhoto: finalFileIDs[0],
        totalCount: finalFileIDs.length
      }

      if (isEdit.value) {
        const res = await callFunction('updateAlbum', {
          adminId: adminInfo.value?.id,
          albumId: form.value._id,
          title: finalData.title,
          locationName: finalData.locationName,
          description: finalData.description,
          photos: finalFileIDs,
          status: form.value.status
        })
        if (!res.success) throw new Error(res.message)
        ElMessage.success('保存成功')
      } else {
        const res = await callFunction('createAlbum', {
          adminId: adminInfo.value?.id,
          title: finalData.title,
          locationName: finalData.locationName,
          description: finalData.description,
          photos: finalFileIDs
        })
        if (!res.success) throw new Error(res.message)
        ElMessage.success('创建成功')
      }

      dialogVisible.value = false
      loadAlbums()
    } catch (error) {
      console.error('提交失败:', error)
      ElMessage.error('提交失败')
    } finally {
      submitting.value = false
    }
  })
}

// 删除相册
const handleDelete = async (album: Album) => {
  await ElMessageBox.confirm(
    `确定要删除相册「${album.title}」吗？`,
    '确认删除',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  )
  try {
    const res = await callFunction('deleteAlbum', {
      adminId: adminInfo.value?.id,
      albumId: album._id
    })
    if (!res.success) throw new Error(res.message)
    ElMessage.success('删除成功')
    loadAlbums()
  } catch (e: any) {
    ElMessage.error(e.message || '删除失败')
  }
}

// 生成二维码
const handleGenQrCode = async (album: Album) => {
  currentAlbum.value = album
  qrUrl.value = ''
  qrError.value = ''
  qrLoading.value = true
  qrDialogVisible.value = true

  try {
    const res = await callFunction('generateAlbumQRCode', {
      albumId: album.albumId
    })
    console.log('generateAlbumQRCode 返回:', res)
    if (res.success && res.buffer) {
      const uint8Array = new Uint8Array(res.buffer.data ?? res.buffer)
      const blob = new Blob([uint8Array], { type: res.contentType || 'image/png' })
      qrUrl.value = URL.createObjectURL(blob)
    } else {
      qrError.value = res.message || '生成失败'
      console.error('生成二维码失败:', res)
    }
  } catch (e: any) {
    qrError.value = e.message || '调用云函数失败'
    console.error('调用云函数异常:', e)
  } finally {
    qrLoading.value = false
  }
}

// 下载二维码
const downloadQrCode = () => {
  const a = document.createElement('a')
  a.href = qrUrl.value
  a.download = `qrcode_${currentAlbum.value?._id}.png`
  a.click()
}

// 复制 albumId
const copyAlbumId = (id: string) => {
  navigator.clipboard.writeText(id).then(() => {
    ElMessage.success('已复制')
  })
}

// 格式化时间
const formatTime = (time: any) => {
  if (!time) return '-'
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadAlbums()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.photo-upload-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photo-thumb {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: visible;
  flex-shrink: 0;
}

.photo-thumb-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  background: #f56c6c;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 11px;
  z-index: 10;
}

.upload-trigger {
  width: 80px;
  height: 80px;
  border: 2px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-trigger:hover {
  border-color: #409eff;
}
</style>
