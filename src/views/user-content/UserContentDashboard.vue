<template>
  <div class="page-container">
    <el-row :gutter="20">
      <!-- 统计卡片 -->
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #409EFF">
              <el-icon :size="30"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalTemplates }}</div>
              <div class="stat-label">用户模板总数</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #67C23A">
              <el-icon :size="30"><Picture /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalPhotos }}</div>
              <div class="stat-label">用户照片总数</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #E6A23C">
              <el-icon :size="30"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingTemplates }}</div>
              <div class="stat-label">待审核模板</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #F56C6C">
              <el-icon :size="30"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingPhotos }}</div>
              <div class="stat-label">待审核照片</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷入口 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <span>快捷入口</span>
      </template>
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="quick-link" @click="goToUserTemplates">
            <el-icon :size="40" color="#409EFF"><Document /></el-icon>
            <div class="quick-link-content">
              <div class="quick-link-title">用户模板管理</div>
              <div class="quick-link-desc">查看和审核用户上传的模板</div>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="quick-link" @click="goToUserPhotos">
            <el-icon :size="40" color="#67C23A"><Picture /></el-icon>
            <div class="quick-link-content">
              <div class="quick-link-title">用户照片管理</div>
              <div class="quick-link-desc">查看和审核用户上传的照片</div>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 最近待审核内容 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>最近待审核内容</span>
          <el-button @click="loadPendingContent">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="待审核模板" name="templates">
          <el-table :data="pendingTemplates" v-loading="loading" stripe>
            <el-table-column label="封面" width="80">
              <template #default="{ row }">
                <el-image
                  :src="row.cover"
                  fit="cover"
                  style="width: 50px; height: 50px; border-radius: 4px"
                />
              </template>
            </el-table-column>
            <el-table-column prop="name" label="模板名称" min-width="150" />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column label="创建者" width="120">
              <template #default="{ row }">
                {{ row.creatorName || '未知用户' }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.createTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="success" @click="approveTemplate(row)">
                  通过
                </el-button>
                <el-button size="small" type="warning" @click="rejectTemplate(row)">
                  拒绝
                </el-button>
                <el-button size="small" @click="goToTemplateDetail(row)">
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="待审核照片" name="photos">
          <el-table :data="pendingPhotos" v-loading="loading" stripe>
            <el-table-column label="照片" width="80">
              <template #default="{ row }">
                <el-image
                  :src="row.photoUrl"
                  fit="cover"
                  style="width: 50px; height: 50px; border-radius: 4px"
                />
              </template>
            </el-table-column>
            <el-table-column label="照片名称" min-width="150">
              <template #default="{ row }">
                {{ row.photoName || row.sourcePhotoSetTitle || '未命名' }}
              </template>
            </el-table-column>
            <el-table-column label="所属模板" width="120">
              <template #default="{ row }">
                {{ row.templateName || '未知模板' }}
              </template>
            </el-table-column>
            <el-table-column label="上传者" width="120">
              <template #default="{ row }">
                {{ row.uploaderName || row.userName || '未知用户' }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.createTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="success" @click="approvePhoto(row)">
                  通过
                </el-button>
                <el-button size="small" type="warning" @click="rejectPhoto(row)">
                  拒绝
                </el-button>
                <el-button size="small" @click="goToPhotoDetail(row)">
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Picture, Clock, Refresh, ArrowRight } from '@element-plus/icons-vue'
import { callFunction, processImageUrl } from '@/utils/cloudbase'

interface Template {
  _id: string
  name: string
  category: string
  cover: string
  creatorName: string
  createTime: any
}

interface Photo {
  _id: string
  photoName?: string
  photoUrl: string
  templateName?: string
  uploaderName?: string
  userName?: string
  createTime: any
  sourcePhotoSetTitle?: string
}

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('templates')

const stats = ref({
  totalTemplates: 0,
  totalPhotos: 0,
  pendingTemplates: 0,
  pendingPhotos: 0
})

const pendingTemplates = ref<Template[]>([])
const pendingPhotos = ref<Photo[]>([])

const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectingItem = ref<any>(null)
const rejectingType = ref<'template' | 'photo'>('template')

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await callFunction('getUserContentStats', {
      adminId: adminInfo.value?.id
    })

    if (response.success) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 加载待审核内容
const loadPendingContent = async () => {
  loading.value = true
  try {
    // 加载待审核模板
    const templatesResponse = await callFunction('getUserTemplates', {
      adminId: adminInfo.value?.id,
      status: 'pending',
      page: 1,
      pageSize: 10
    })

    if (templatesResponse.success) {
      const templates = templatesResponse.data
      pendingTemplates.value = await Promise.all(
        templates.map(async (t: Template) => ({
          ...t,
          cover: await processImageUrl(t.cover)
        }))
      )
    }

    // 加载待审核照片
    const photosResponse = await callFunction('getUserPhotos', {
      adminId: adminInfo.value?.id,
      status: 'pending',
      page: 1,
      pageSize: 10
    })

    if (photosResponse.success) {
      const photos = photosResponse.data
      pendingPhotos.value = await Promise.all(
        photos.map(async (p: Photo) => ({
          ...p,
          photoUrl: await processImageUrl(p.photoUrl)
        }))
      )
    }
  } catch (error) {
    console.error('加载待审核内容失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 通过模板审核
const approveTemplate = async (template: Template) => {
  try {
    await ElMessageBox.confirm(
      `确定要通过模板"${template.name}"的审核吗？`,
      '确认通过',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )

    const response = await callFunction('reviewUserTemplate', {
      adminId: adminInfo.value?.id,
      templateId: template._id,
      action: 'approve'
    })

    if (response.success) {
      ElMessage.success('审核通过')
      loadStats()
      loadPendingContent()
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

// 拒绝模板审核
const rejectTemplate = (template: Template) => {
  rejectingItem.value = template
  rejectingType.value = 'template'
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

// 通过照片审核
const approvePhoto = async (photo: Photo) => {
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
      loadStats()
      loadPendingContent()
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

// 拒绝照片审核
const rejectPhoto = (photo: Photo) => {
  rejectingItem.value = photo
  rejectingType.value = 'photo'
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

// 确认拒绝
const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }

  submitting.value = true
  try {
    const functionName = rejectingType.value === 'template'
      ? 'reviewUserTemplate'
      : 'reviewUserPhoto'

    const idKey = rejectingType.value === 'template'
      ? 'templateId'
      : 'photoId'

    const response = await callFunction(functionName, {
      adminId: adminInfo.value?.id,
      [idKey]: rejectingItem.value._id,
      action: 'reject',
      reason: rejectReason.value
    })

    if (response.success) {
      ElMessage.success('已拒绝')
      rejectDialogVisible.value = false
      loadStats()
      loadPendingContent()
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

// 导航到用户模板管理
const goToUserTemplates = () => {
  router.push('/user-content/templates')
}

// 导航到用户照片管理
const goToUserPhotos = () => {
  router.push('/user-content/photos')
}

// 导航到模板详情
const goToTemplateDetail = (_template: Template) => {
  router.push('/user-content/templates')
}

// 导航到照片详情
const goToPhotoDetail = (_photo: Photo) => {
  router.push('/user-content/photos')
}

// 格式化日期
const formatDate = (date: any) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

onMounted(() => {
  loadStats()
  loadPendingContent()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-link:hover {
  border-color: #409EFF;
  background: #ECF5FF;
  transform: translateX(5px);
}

.quick-link-content {
  flex: 1;
}

.quick-link-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.quick-link-desc {
  font-size: 14px;
  color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
