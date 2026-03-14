<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户模板管理</span>
          <el-button @click="loadTemplates">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filter-bar">
        <el-select v-model="filters.category" placeholder="分类" clearable style="width: 150px">
          <el-option label="景区主题" value="景区主题" />
          <el-option label="风格分类" value="风格分类" />
          <el-option label="场景打卡" value="场景打卡" />
        </el-select>

        <el-select v-model="filters.status" placeholder="审核状态" clearable style="width: 150px; margin-left: 10px">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>

        <el-input
          v-model="filters.keyword"
          placeholder="搜索模板名称或创建者"
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
      <el-table :data="processedTemplateList" v-loading="loading" stripe style="margin-top: 20px">
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.cover"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-teleported="true"
              :preview-src-list="[row.cover]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="120" />
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
        <el-table-column label="创建者" width="150">
          <template #default="{ row }">
            <div style="font-size: 12px">
              <div>{{ row.creatorName || '未知用户' }}</div>
              <div style="color: #909399; font-size: 11px">ID: {{ row.creatorId?.slice(0, 8) }}...</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags" :key="tag" size="small" style="margin-right: 5px">
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="统计" width="150">
          <template #default="{ row }">
            <div style="font-size: 12px">
              <div>照片集: {{ row.photoSetCount || 0 }}</div>
              <div>点赞: {{ row.likeCount || 0 }}</div>
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
      title="模板详情"
      width="800px"
    >
      <div v-if="currentTemplate" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ currentTemplate.name }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ currentTemplate.category }}</el-descriptions-item>
          <el-descriptions-item label="创建者">{{ currentTemplate.creatorName || '未知用户' }}</el-descriptions-item>
          <el-descriptions-item label="创建者ID">{{ currentTemplate.creatorId }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="getStatusType(currentTemplate.status)">
              {{ getStatusText(currentTemplate.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(currentTemplate.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentTemplate.description }}</el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">
            <el-tag v-for="tag in currentTemplate.tags" :key="tag" style="margin-right: 5px">
              {{ tag }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="封面图片" :span="2">
            <el-image
              :src="currentTemplate.cover"
              fit="contain"
              style="max-width: 300px; max-height: 300px"
              :preview-teleported="true"
              :preview-src-list="[currentTemplate.cover]"
            />
          </el-descriptions-item>
          <el-descriptions-item label="统计数据" :span="2">
            <div>
              <span style="margin-right: 20px">照片集: {{ currentTemplate.photoSetCount || 0 }}</span>
              <span style="margin-right: 20px">点赞: {{ currentTemplate.likeCount || 0 }}</span>
              <span style="margin-right: 20px">收藏: {{ currentTemplate.favoriteCount || 0 }}</span>
              <span>浏览: {{ currentTemplate.viewCount || 0 }}</span>
            </div>
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

interface Template {
  _id: string
  name: string
  description: string
  category: string
  cover: string
  tags: string[]
  isOfficial: boolean
  creatorId: string
  creatorName: string
  status: string
  likeCount: number
  favoriteCount: number
  photoSetCount: number
  viewCount: number
  sortOrder: number
  createTime: any
  updateTime: any
}

const templateList = ref<Template[]>([])
const loading = ref(false)
const submitting = ref(false)

const filters = ref({
  category: '',
  status: '',
  keyword: ''
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const detailVisible = ref(false)
const currentTemplate = ref<Template | null>(null)

const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectingTemplate = ref<Template | null>(null)

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 处理图片 URL 列表
const processedTemplateList = ref<Template[]>([])

// 监听模板列表变化，处理图片 URL
watch(templateList, async (newList) => {
  const processed = await Promise.all(
    newList.map(async (template) => ({
      ...template,
      cover: await processImageUrl(template.cover)
    }))
  )
  processedTemplateList.value = processed
}, { immediate: true })

// 加载模板列表
const loadTemplates = async () => {
  loading.value = true
  try {
    const response = await callFunction('getUserTemplates', {
      adminId: adminInfo.value?.id,
      category: filters.value.category || undefined,
      status: filters.value.status || undefined,
      keyword: filters.value.keyword || undefined,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    })

    if (response.success) {
      templateList.value = response.data
      pagination.value.total = response.total
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('加载模板列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadTemplates()
}

// 分页变化
const handleSizeChange = () => {
  pagination.value.page = 1
  loadTemplates()
}

const handlePageChange = () => {
  loadTemplates()
}

// 查看详情
const viewDetail = async (template: Template) => {
  currentTemplate.value = {
    ...template,
    cover: await processImageUrl(template.cover)
  }
  detailVisible.value = true
}

// 处理排序变化
const handleSortChange = async (template: Template) => {
  try {
    const response = await callFunction('updateUserTemplateSort', {
      adminId: adminInfo.value?.id,
      templateId: template._id,
      sortOrder: template.sortOrder
    })

    if (response.success) {
      ElMessage.success('排序已更新')
    } else {
      ElMessage.error(response.message)
      loadTemplates() // 恢复原值
    }
  } catch (error) {
    console.error('更新排序失败:', error)
    ElMessage.error('更新排序失败')
    loadTemplates() // 恢复原值
  }
}

// 通过审核
const handleApprove = async (template: Template) => {
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
      loadTemplates()
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
const handleReject = (template: Template) => {
  rejectingTemplate.value = template
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
    const response = await callFunction('reviewUserTemplate', {
      adminId: adminInfo.value?.id,
      templateId: rejectingTemplate.value?._id,
      action: 'reject',
      reason: rejectReason.value
    })

    if (response.success) {
      ElMessage.success('已拒绝')
      rejectDialogVisible.value = false
      loadTemplates()
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

// 删除模板
const handleDelete = async (template: Template) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板"${template.name}"吗？删除后不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await callFunction('deleteUserTemplate', {
      adminId: adminInfo.value?.id,
      templateId: template._id
    })

    if (response.success) {
      ElMessage.success('删除成功')
      loadTemplates()
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

// 格式化日期
const formatDate = (date: any) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

onMounted(() => {
  loadTemplates()
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
