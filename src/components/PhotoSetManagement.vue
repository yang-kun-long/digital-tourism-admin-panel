<template>
  <div class="photoset-management">
    <div class="header">
      <h2>照片集审核</h2>
      <el-button @click="loadPhotoSets" :loading="loading" type="primary">
        刷新列表
      </el-button>
    </div>

    <div v-if="loading && photoSets.length === 0" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="photoSets.length === 0" class="empty">
      <el-empty description="暂无待审核的照片集" />
    </div>

    <div v-else class="photoset-list">
      <el-card
        v-for="photoSet in photoSets"
        :key="photoSet._id"
        class="photoset-card"
        shadow="hover"
      >
        <div class="photoset-content">
          <!-- 封面图 -->
          <div class="cover-section">
            <el-image
              :src="photoSet.coverUrl"
              fit="cover"
              class="cover-image"
              :preview-src-list="photoSet.photoUrls"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                  <span>加载失败</span>
                </div>
              </template>
            </el-image>
            <div class="photo-count">
              <el-icon><Picture /></el-icon>
              <span>{{ photoSet.photos?.length || 0 }} 张</span>
            </div>
          </div>

          <!-- 照片集信息 -->
          <div class="info-section">
            <h3 class="title">{{ photoSet.title }}</h3>
            <p class="description">{{ photoSet.description }}</p>

            <div class="meta-info">
              <div class="meta-item">
                <el-icon><User /></el-icon>
                <span>{{ photoSet.userName || '匿名用户' }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatTime(photoSet.createTime) }}</span>
              </div>
              <div class="meta-item">
                <el-icon><View /></el-icon>
                <span>{{ photoSet.viewCount || 0 }} 次浏览</span>
              </div>
              <div class="meta-item">
                <el-icon><Star /></el-icon>
                <span>{{ photoSet.likeCount || 0 }} 点赞</span>
              </div>
            </div>

            <div class="template-info" v-if="photoSet.templateName">
              <el-tag type="info" size="small">
                所属模板：{{ photoSet.templateName }}
              </el-tag>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-section">
            <el-button
              type="success"
              :icon="Check"
              @click="handleApprove(photoSet)"
              :loading="photoSet.approving"
            >
              通过
            </el-button>
            <el-button
              type="warning"
              :icon="Close"
              @click="handleReject(photoSet)"
              :loading="photoSet.rejecting"
            >
              拒绝
            </el-button>
            <el-button
              type="danger"
              :icon="Delete"
              @click="handleDelete(photoSet)"
              :loading="photoSet.deleting"
            >
              删除
            </el-button>
            <el-button
              type="info"
              :icon="View"
              @click="handlePreview(photoSet)"
            >
              预览
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 拒绝原因对话框 -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="拒绝原因"
      width="500px"
    >
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="4"
        placeholder="请输入拒绝原因"
        maxlength="200"
        show-word-limit
      />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmReject" :loading="rejecting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 照片预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="照片预览"
      width="80%"
      :fullscreen="false"
    >
      <div v-if="currentPhotoSet" class="preview-content">
        <h3>{{ currentPhotoSet.title }}</h3>
        <p class="preview-description">{{ currentPhotoSet.description }}</p>
        <el-carousel
          :interval="5000"
          arrow="always"
          height="500px"
          v-if="currentPhotoSet.photoUrls && currentPhotoSet.photoUrls.length > 0"
        >
          <el-carousel-item
            v-for="(url, index) in currentPhotoSet.photoUrls"
            :key="index"
          >
            <el-image
              :src="url"
              fit="contain"
              style="width: 100%; height: 100%"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                  <span>加载失败</span>
                </div>
              </template>
            </el-image>
          </el-carousel-item>
        </el-carousel>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction, getTempFileURL } from '../utils/cloudbase'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Check,
  Close,
  Delete,
  View,
  Loading,
  Picture,
  User,
  Calendar,
  Star
} from '@element-plus/icons-vue'

interface PhotoSet {
  _id: string
  templateId: string
  templateName?: string
  title: string
  description: string
  photos: string[]
  photoUrls?: string[]
  coverPhoto: string
  coverUrl?: string
  userId: string
  userName: string
  userAvatar: string
  isOfficial: boolean
  status: string
  viewCount: number
  likeCount: number
  createTime: any
  updateTime: any
  approving?: boolean
  rejecting?: boolean
  deleting?: boolean
}

interface AdminInfo {
  id: string
  username: string
  role: string
}

const props = defineProps<{
  adminInfo: AdminInfo
}>()

const photoSets = ref<PhotoSet[]>([])
const loading = ref(false)
const rejectDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const rejectReason = ref('')
const rejecting = ref(false)
const currentPhotoSet = ref<PhotoSet | null>(null)

// 加载待审核照片集
const loadPhotoSets = async () => {
  loading.value = true
  try {
    const response = await callFunction('getPhotoSets', {
      adminId: props.adminInfo.id
    })

    if (!response.success) {
      throw new Error(response.message)
    }

    photoSets.value = response.data

    // 获取封面图片临时链接
    if (photoSets.value.length > 0) {
      const fileList = photoSets.value.map(ps => ({
        fileID: ps.coverPhoto,
        maxAge: 3600
      }))

      const urlRes = await getTempFileURL({ fileList })
      if (urlRes.fileList && urlRes.fileList.length > 0) {
        photoSets.value.forEach((ps, index) => {
          if (urlRes.fileList && urlRes.fileList[index]) {
            ps.coverUrl = urlRes.fileList[index].tempFileURL
          }
        })
      }

      // 获取所有照片的临时链接
      for (const ps of photoSets.value) {
        if (ps.photos && ps.photos.length > 0) {
          const photoFileList = ps.photos.map(photo => ({
            fileID: photo,
            maxAge: 3600
          }))
          const photoUrlRes = await getTempFileURL({ fileList: photoFileList })
          if (photoUrlRes.fileList && photoUrlRes.fileList.length > 0) {
            ps.photoUrls = photoUrlRes.fileList.map(f => f.tempFileURL)
          }
        }
      }

      // 获取照片集关联的模板信息
      const templateIds = [...new Set(photoSets.value.map(ps => ps.templateId).filter(Boolean))]

      if (templateIds.length > 0) {
        try {
          // 直接从数据库查询模板信息
          const db = (await import('../utils/cloudbase')).db
          const _ = db.command

          const templateRes = await db.collection('templates')
            .where({
              _id: _.in(templateIds)
            })
            .field({
              _id: true,
              name: true
            })
            .get()

          if (templateRes.data && templateRes.data.length > 0) {
            const templatesMap = new Map(templateRes.data.map((t: any) => [t._id, t.name]))

            // 为每个照片集设置模板名称
            photoSets.value.forEach(ps => {
              if (ps.templateId && templatesMap.has(ps.templateId)) {
                ps.templateName = templatesMap.get(ps.templateId)
              }
            })
          }
        } catch (error) {
          console.error('获取模板名称失败:', error)
        }
      }
    }
  } catch (error: any) {
    console.error('加载照片集失败:', error)
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 格式化时间
const formatTime = (time: any) => {
  if (!time) return '未知时间'

  let date: Date
  if (time.$date) {
    date = new Date(time.$date)
  } else if (typeof time === 'number') {
    date = new Date(time)
  } else if (typeof time === 'string') {
    date = new Date(time)
  } else {
    return '未知时间'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 审批通过
const handleApprove = async (photoSet: PhotoSet) => {
  try {
    await ElMessageBox.confirm(
      `确定要通过照片集"${photoSet.title}"吗？`,
      '确认审批',
      {
        confirmButtonText: '通过',
        cancelButtonText: '取消',
        type: 'success'
      }
    )

    photoSet.approving = true

    const response = await callFunction('managePhotoSet', {
      adminId: props.adminInfo.id,
      action: 'approve',
      photoSetId: photoSet._id
    })

    if (!response.success) {
      throw new Error(response.message)
    }

    ElMessage.success('审批通过')
    await loadPhotoSets()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('审批失败:', error)
      ElMessage.error(error.message || '审批失败')
    }
  } finally {
    photoSet.approving = false
  }
}

// 拒绝照片集
const handleReject = (photoSet: PhotoSet) => {
  currentPhotoSet.value = photoSet
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

// 确认拒绝
const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }

  if (!currentPhotoSet.value) return

  rejecting.value = true
  try {
    const response = await callFunction('managePhotoSet', {
      adminId: props.adminInfo.id,
      action: 'reject',
      photoSetId: currentPhotoSet.value._id,
      rejectReason: rejectReason.value.trim()
    })

    if (!response.success) {
      throw new Error(response.message)
    }

    ElMessage.success('已拒绝')
    rejectDialogVisible.value = false
    await loadPhotoSets()
  } catch (error: any) {
    console.error('拒绝失败:', error)
    ElMessage.error(error.message || '拒绝失败')
  } finally {
    rejecting.value = false
  }
}

// 删除照片集
const handleDelete = async (photoSet: PhotoSet) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除照片集"${photoSet.title}"吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )

    photoSet.deleting = true

    const response = await callFunction('managePhotoSet', {
      adminId: props.adminInfo.id,
      action: 'delete',
      photoSetId: photoSet._id
    })

    if (!response.success) {
      throw new Error(response.message)
    }

    ElMessage.success('删除成功')
    await loadPhotoSets()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  } finally {
    photoSet.deleting = false
  }
}

// 预览照片集
const handlePreview = (photoSet: PhotoSet) => {
  currentPhotoSet.value = photoSet
  previewDialogVisible.value = true
}

onMounted(() => {
  loadPhotoSets()
})
</script>

<style scoped>
.photoset-management {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.loading .el-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.photoset-list {
  display: grid;
  gap: 20px;
}

.photoset-card {
  transition: all 0.3s;
}

.photoset-card:hover {
  transform: translateY(-2px);
}

.photoset-content {
  display: grid;
  grid-template-columns: 200px 1fr auto;
  gap: 20px;
  align-items: start;
}

.cover-section {
  position: relative;
}

.cover-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
}

.photo-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-section {
  flex: 1;
}

.title {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.description {
  margin: 0 0 15px 0;
  color: #666;
  line-height: 1.6;
}

.meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 10px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #999;
  font-size: 14px;
}

.template-info {
  margin-top: 10px;
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-section .el-button {
  width: 100px;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  background: #f5f5f5;
}

.image-error .el-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.preview-content {
  padding: 20px;
}

.preview-content h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #333;
}

.preview-description {
  margin: 0 0 20px 0;
  color: #666;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .photoset-content {
    grid-template-columns: 1fr;
  }

  .action-section {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .action-section .el-button {
    flex: 1;
    min-width: 80px;
  }
}
</style>
