<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>意见反馈</span>
          <el-button type="primary" @click="loadFeedback">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filter-bar">
        <el-select v-model="filters.type" placeholder="反馈类型" clearable style="width: 150px">
          <el-option label="功能异常" value="bug" />
          <el-option label="功能建议" value="suggestion" />
          <el-option label="内容问题" value="content" />
          <el-option label="其他问题" value="other" />
        </el-select>

        <el-select v-model="filters.status" placeholder="处理状态" style="width: 150px; margin-left: 10px">
          <el-option label="待处理" value="pending" />
          <el-option label="处理中" value="processing" />
          <el-option label="已解决" value="resolved" />
          <el-option label="已关闭" value="closed" />
        </el-select>

        <el-select v-model="filters.priority" placeholder="优先级" clearable style="width: 150px; margin-left: 10px">
          <el-option label="低" value="low" />
          <el-option label="中" value="medium" />
          <el-option label="高" value="high" />
        </el-select>

        <el-button type="primary" @click="handleSearch" style="margin-left: 10px">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>

      <!-- 数据表格 -->
      <el-table :data="feedbackList" v-loading="loading" stripe style="margin-top: 20px">
        <el-table-column label="反馈类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="反馈内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="userName" label="反馈人" width="120" />
        <el-table-column label="优先级" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.priority" :type="getPriorityTagType(row.priority)" size="small">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="反馈时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理人" width="120">
          <template #default="{ row }">
            {{ row.handlerName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              @click="viewDetail(row)"
            >
              查看详情
            </el-button>
            <el-button
              v-if="row.status !== 'closed'"
              size="small"
              @click="openHandleDialog(row)"
            >
              处理
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

    <!-- 处理反馈对话框 -->
    <el-dialog
      v-model="handleDialogVisible"
      title="处理反馈"
      width="600px"
    >
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="反馈类型">
          <el-tag :type="getTypeTagType(currentFeedback?.type)">
            {{ getTypeLabel(currentFeedback?.type) }}
          </el-tag>
        </el-form-item>
        <el-form-item label="反馈内容">
          <div style="white-space: pre-wrap">{{ currentFeedback?.content }}</div>
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="handleForm.priority">
            <el-radio value="low">低</el-radio>
            <el-radio value="medium">中</el-radio>
            <el-radio value="high">高</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-radio-group v-model="handleForm.status">
            <el-radio value="processing">处理中</el-radio>
            <el-radio value="resolved">已解决</el-radio>
            <el-radio value="closed">已关闭</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="回复内容">
          <el-input
            v-model="handleForm.reply"
            type="textarea"
            :rows="4"
            placeholder="请输入回复内容（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="反馈详情"
      width="700px"
    >
      <el-descriptions :column="1" border v-if="currentFeedback">
        <el-descriptions-item label="反馈类型">
          <el-tag :type="getTypeTagType(currentFeedback.type)">
            {{ getTypeLabel(currentFeedback.type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="反馈内容">
          <div style="white-space: pre-wrap">{{ currentFeedback.content }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="反馈图片" v-if="currentFeedback.images && currentFeedback.images.length > 0">
          <div class="image-list">
            <el-image
              v-for="(img, index) in currentFeedback.images"
              :key="index"
              :src="img"
              :preview-src-list="currentFeedback.images"
              fit="cover"
              style="width: 100px; height: 100px; margin-right: 10px"
            />
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="联系方式" v-if="currentFeedback.contact">
          {{ currentFeedback.contact }}
        </el-descriptions-item>
        <el-descriptions-item label="反馈人">
          {{ currentFeedback.userName }}
        </el-descriptions-item>
        <el-descriptions-item label="反馈时间">
          {{ formatTime(currentFeedback.createTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="优先级">
          <el-tag v-if="currentFeedback.priority" :type="getPriorityTagType(currentFeedback.priority)">
            {{ getPriorityLabel(currentFeedback.priority) }}
          </el-tag>
          <span v-else>未设置</span>
        </el-descriptions-item>
        <el-descriptions-item label="处理状态">
          <el-tag :type="getStatusTagType(currentFeedback.status)">
            {{ getStatusLabel(currentFeedback.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="处理人" v-if="currentFeedback.handlerName">
          {{ currentFeedback.handlerName }}
        </el-descriptions-item>
        <el-descriptions-item label="回复内容" v-if="currentFeedback.reply">
          <div style="white-space: pre-wrap">{{ currentFeedback.reply }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="处理时间" v-if="currentFeedback.handleTime">
          {{ formatTime(currentFeedback.handleTime) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { callFunction } from '@/utils/cloudbase'

interface Feedback {
  _id: string
  userId: string
  userName: string
  type: string
  content: string
  images?: string[]
  contact?: string
  status: string
  priority?: string
  handlerId?: string
  handlerName?: string
  reply?: string
  handleTime?: any
  createTime: any
  updateTime: any
}

const feedbackList = ref<Feedback[]>([])
const loading = ref(false)
const submitting = ref(false)

const filters = ref({
  type: '',
  status: 'pending',
  priority: ''
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const handleDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentFeedback = ref<Feedback | null>(null)

const handleForm = ref({
  status: 'processing',
  reply: '',
  priority: 'medium'
})

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 加载反馈列表
const loadFeedback = async () => {
  loading.value = true
  try {
    const response = await callFunction('getFeedback', {
      adminId: adminInfo.value?.id,
      type: filters.value.type || undefined,
      status: filters.value.status,
      priority: filters.value.priority || undefined,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    })

    if (response.success) {
      feedbackList.value = response.data
      pagination.value.total = response.total
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('加载反馈列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadFeedback()
}

// 分页变化
const handleSizeChange = () => {
  pagination.value.page = 1
  loadFeedback()
}

const handlePageChange = () => {
  loadFeedback()
}

// 打开处理对话框
const openHandleDialog = (feedback: Feedback) => {
  currentFeedback.value = feedback
  handleForm.value = {
    status: feedback.status === 'pending' ? 'processing' : feedback.status,
    reply: feedback.reply || '',
    priority: feedback.priority || 'medium'
  }
  handleDialogVisible.value = true
}

// 提交处理
const handleSubmit = async () => {
  submitting.value = true
  try {
    const response = await callFunction('handleFeedback', {
      adminId: adminInfo.value?.id,
      feedbackId: currentFeedback.value?._id,
      status: handleForm.value.status,
      reply: handleForm.value.reply.trim() || undefined,
      priority: handleForm.value.priority
    })

    if (response.success) {
      ElMessage.success(response.message)
      handleDialogVisible.value = false
      loadFeedback()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('处理反馈失败:', error)
    ElMessage.error('处理失败')
  } finally {
    submitting.value = false
  }
}

// 查看详情
const viewDetail = (feedback: Feedback) => {
  currentFeedback.value = feedback
  detailDialogVisible.value = true
}

// 获取类型标签
const getTypeLabel = (type?: string) => {
  const map: Record<string, string> = {
    bug: '功能异常',
    suggestion: '功能建议',
    content: '内容问题',
    other: '其他问题'
  }
  return map[type || ''] || type
}

const getTypeTagType = (type?: string) => {
  const map: Record<string, any> = {
    bug: 'danger',
    suggestion: 'success',
    content: 'warning',
    other: 'info'
  }
  return map[type || ''] || 'info'
}

// 获取优先级标签
const getPriorityLabel = (priority: string) => {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return map[priority] || priority
}

const getPriorityTagType = (priority: string) => {
  const map: Record<string, any> = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  }
  return map[priority] || 'info'
}

// 获取状态标签
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  }
  return map[status] || status
}

const getStatusTagType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info'
  }
  return map[status] || 'info'
}

// 格式化时间
const formatTime = (time: any) => {
  if (!time) return '-'
  const date = time.$date ? new Date(time.$date) : new Date(time)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadFeedback()
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

.image-list {
  display: flex;
  flex-wrap: wrap;
}
</style>
