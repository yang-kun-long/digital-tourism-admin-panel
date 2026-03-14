<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户照片管理</span>
          <el-button @click="loadPhotos">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filter-bar">
        <el-select v-model="filters.templateId" placeholder="所属模板" clearable style="width: 200px">
          <el-option
            v-for="template in templates"
            :key="template._id"
            :label="template.name"
            :value="template._id"
          />
        </el-select>

        <el-select v-model="filters.status" placeholder="审核状态" clearable style="width: 150px; margin-left: 10px">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>

        <el-input
          v-model="filters.keyword"
          placeholder="搜索照片名称或上传者"
          clearable
          style="width: 250px; margin-left: 10px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button type="primary" @click="handleSearch" style="margin-left: 10px">
          查询
        </el-button>
      </div>

      <!-- 数据表格 -->
      <el-table :data="processedPhotoList" v-loading="loading" stripe style="margin-top: 20px">
        <el-table-column label="照片" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.photoUrl"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-teleported="true"
              :preview-src-list="[row.photoUrl]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="photoName" label="照片名称" min-width="150">
          <template #default="{ row }">
            {{ row.photoName || row.sourcePhotoSetTitle || '未命名' }}
          </template>
        </el-table-column>
        <el-table-column label="所属模板" width="150">
          <template #default="{ row }">
            {{ row.templateName || '未知模板' }}
          </template>
        </el-table-column>
        <el-table-column label="排序" width="180">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-input-number
                v-model="row.sortOrder"
                :min="0"
                :max="9999"
                size="small"
                @change="handleSortChange(row)"
                style="width: 100px"
              />
              <el-tooltip content="数值越小越靠前" placement="top">
                <el-icon style="color: #909399; cursor: help;">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="上传者" width="150">
          <template #default="{ row }">
            <div style="font-size: 12px">
              <div>{{ row.uploaderName || row.userName || '未知用户' }}</div>
              <div style="color: #909399; font-size: 11px">
                {{ row.isOfficial ? '官方' : '用户' }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容审核" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.contentCheckStatus === 'passed' || row.checkStatus === 'passed' ? 'success' : 'warning'"
              size="small"
            >
              {{ getCheckStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="统计" width="120">
          <template #default="{ row }">
            <div style="font-size: 12px">
              <div>点赞: {{ row.likeCount || 0 }}</div>
              <div>浏览: {{ row.viewCount || 0 }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">
              查看
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              type="success"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              type="warning"
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="照片详情"
      width="800px"
    >
      <div v-if="currentPhoto" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="照片名称">
            {{ currentPhoto.photoName || currentPhoto.sourcePhotoSetTitle || '未命名' }}
          </el-descriptions-item>
          <el-descriptions-item label="所属模板">
            {{ currentPhoto.templateName || '未知模板' }}
          </el-descriptions-item>
          <el-descriptions-item label="上传者">
            {{ currentPhoto.uploaderName || currentPhoto.userName || '未知用户' }}
          </el-descriptions-item>
          <el-descriptions-item label="照片类型">
            <el-tag :type="currentPhoto.isOfficial ? 'success' : 'primary'">
              {{ currentPhoto.isOfficial ? '官方照片' : '用户照片' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="getStatusType(currentPhoto.status)">
              {{ getStatusText(currentPhoto.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="内容审核">
            <el-tag
              :type="currentPhoto.contentCheckStatus === 'passed' || currentPhoto.checkStatus === 'passed' ? 'success' : 'warning'"
            >
              {{ getCheckStatusText(currentPhoto) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(currentPhoto.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="审核时间" v-if="currentPhoto.checkTime">
            {{ formatDate(currentPhoto.checkTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="统计数据" :span="2">
            <div>
              <span style="margin-right: 20px">点赞: {{ currentPhoto.likeCount || 0 }}</span>
              <span style="margin-right: 20px">收藏: {{ currentPhoto.favoriteCount || 0 }}</span>
              <span>浏览: {{ currentPhoto.viewCount || 0 }}</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="照片预览" :span="2">
            <el-image
              :src="currentPhoto.photoUrl"
              fit="contain"
              style="max-width: 100%; max-height: 500px"
              :preview-teleported="true"
              :preview-src-list="[currentPhoto.photoUrl]"
            />
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

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
      />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmReject" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, QuestionFilled } from '@element-plus/icons-vue'
import { callFunction, processImageUrl } from '@/utils/cloudbase'

interface Photo {
  _id: string
  photoName?: string
  photoUrl: string
  templateId: string
  templateName?: string
  uploaderName?: string
  userName?: string
  isOfficial: boolean
  status: string
  contentCheckStatus?: string
  checkStatus?: string
  checkTime?: any
  likeCount: number
  favoriteCount: number
  sortOrder: number
  viewCount: number
  createTime: any
  sourcePhotoSetTitle?: string
}

interface Template {
  _id: string
  name: string
}

const photoList = ref<Photo[]>([])
const templates = ref<Template[]>([])
const loading = ref(false)
const submitting = ref(false)

const filters = ref({
  templateId: '',
  status: '',
  keyword: ''
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const detailVisible = ref(false)
const currentPhoto = ref<Photo | null>(null)

const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectingPhoto = ref<Photo | null>(null)

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 处理图片 URL 列表
const processedPhotoList = ref<Photo[]>([])

// 监听照片列表变化，处理图片 URL
watch(photoList, async (newList) => {
  const processed = await Promise.all(
    newList.map(async (photo) => ({
      ...photo,
      photoUrl: await processImageUrl(photo.photoUrl)
    }))
  )
  processedPhotoList.value = processed
}, { immediate: true })

// 加载模板列表（用于筛选）
const loadTemplates = async () => {
  try {
    const response = await callFunction('getAllTemplates', {
      adminId: adminInfo.value?.id
    })

    if (response.success) {
      templates.value = response.data
    }
  } catch (error) {
    console.error('加载模板列表失败:', error)
  }
}

// 加载照片列表
const loadPhotos = async () => {
  loading.value = true
  try {
    const response = await callFunction('getUserPhotos', {
      adminId: adminInfo.value?.id,
      templateId: filters.value.templateId || undefined,
      status: filters.value.status || undefined,
      keyword: filters.value.keyword || undefined,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    })

    if (response.success) {
      photoList.value = response.data
      pagination.value.total = response.total
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('加载照片列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadPhotos()
}

// 分页变化
const handleSizeChange = () => {
  pagination.value.page = 1
  loadPhotos()
}

const handlePageChange = () => {
  loadPhotos()
}

// 查看详情
const viewDetail = async (photo: Photo) => {
  currentPhoto.value = {
    ...photo,
    photoUrl: await processImageUrl(photo.photoUrl)
  }
  detailVisible.value = true
}

// 处理排序变化
const handleSortChange = async (photo: Photo) => {
  try {
    const response = await callFunction('updateUserPhotoSort', {
      adminId: adminInfo.value?.id,
      photoId: photo._id,
      sortOrder: photo.sortOrder
    })

    if (response.success) {
      ElMessage.success('排序已更新')
    } else {
      ElMessage.error(response.message)
      loadPhotos() // 恢复原值
    }
  } catch (error) {
    console.error('更新排序失败:', error)
    ElMessage.error('更新排序失败')
    loadPhotos() // 恢复原值
  }
}

// 通过审核
const handleApprove = async (photo: Photo) => {
  try {
    await ElMessageBox.confirm(
      `确定要通过照片"${photo.photoName || photo.sourcePhotoSetTitle || '未命名'}"的审核吗？`,
      '确认通过',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )

    const response = await callFunction('reviewUserPhoto', {
      adminId: adminInfo.value?.id,
      photoId: photo._id,
      action: 'approve'
    })

    if (response.success) {
      ElMessage.success('审核通过')
      loadPhotos()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审核失败:', error)
      ElMessage.error('审核失败')
    }
  }
}

// 拒绝审核
const handleReject = (photo: Photo) => {
  rejectingPhoto.value = photo
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }

  submitting.value = true
  try {
    const response = await callFunction('reviewUserPhoto', {
      adminId: adminInfo.value?.id,
      photoId: rejectingPhoto.value?._id,
      action: 'reject',
      reason: rejectReason.value
    })

    if (response.success) {
      ElMessage.success('已拒绝')
      rejectDialogVisible.value = false
      loadPhotos()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('拒绝失败:', error)
    ElMessage.error('拒绝失败')
  } finally {
    submitting.value = false
  }
}

// 删除照片
const handleDelete = async (photo: Photo) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除照片"${photo.photoName || photo.sourcePhotoSetTitle || '未命名'}"吗？删除后不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await callFunction('deleteUserPhoto', {
      adminId: adminInfo.value?.id,
      photoId: photo._id
    })

    if (response.success) {
      ElMessage.success('删除成功')
      loadPhotos()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return textMap[status] || status
}

// 获取内容审核状态文本
const getCheckStatusText = (photo: Photo) => {
  const status = photo.contentCheckStatus || photo.checkStatus
  const textMap: Record<string, string> = {
    passed: '已通过',
    pending: '审核中',
    failed: '未通过'
  }
  return textMap[status || ''] || '未知'
}

// 格式化日期
const formatDate = (date: any) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

onMounted(() => {
  loadTemplates()
  loadPhotos()
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

.filter-bar {
  display: flex;
  align-items: center;
}

.detail-content {
  max-height: 600px;
  overflow-y: auto;
}
</style>
