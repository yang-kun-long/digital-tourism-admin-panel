<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>举报处理</span>
          <el-button type="primary" @click="loadReports">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filter-bar">
        <el-select v-model="filters.targetType" placeholder="举报类型" clearable style="width: 150px">
          <el-option label="照片集" value="photoset" />
          <el-option label="商品评论" value="review_goods" />
          <el-option label="地点评论" value="review_location" />
          <el-option label="模板" value="template" />
        </el-select>

        <el-select v-model="filters.status" placeholder="处理状态" style="width: 150px; margin-left: 10px">
          <el-option label="待处理" value="pending" />
          <el-option label="处理中" value="processing" />
          <el-option label="已处理" value="resolved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>

        <el-button type="primary" @click="handleSearch" style="margin-left: 10px">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>

      <!-- 数据表格 -->
      <el-table :data="reports" v-loading="loading" stripe style="margin-top: 20px">
        <el-table-column prop="targetName" label="被举报内容" width="200" />
        <el-table-column label="举报类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.targetType)">
              {{ getTypeLabel(row.targetType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="举报原因" width="120" />
        <el-table-column prop="reporterName" label="举报人" width="120" />
        <el-table-column label="举报时间" width="180">
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
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              type="primary"
              @click="openHandleDialog(row)"
            >
              处理
            </el-button>
            <el-button
              size="small"
              @click="viewDetail(row)"
            >
              查看举报
            </el-button>
            <el-button
              v-if="row.targetType === 'photoset' || row.targetType === 'template'"
              size="small"
              type="success"
              @click="viewTargetContent(row)"
            >
              查看内容
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

    <!-- 处理举报对话框 -->
    <el-dialog
      v-model="handleDialogVisible"
      title="处理举报"
      width="600px"
    >
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="被举报内容">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span>{{ currentReport?.targetName }}</span>
            <el-button
              size="small"
              type="primary"
              link
              @click="viewTargetDetail"
              v-if="currentReport?.targetType === 'photoset' || currentReport?.targetType === 'template'"
            >
              查看详情
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="举报类型">
          <el-tag :type="getTypeTagType(currentReport?.targetType || '')">
            {{ getTypeLabel(currentReport?.targetType || '') }}
          </el-tag>
        </el-form-item>
        <el-form-item label="举报原因">
          <span>{{ currentReport?.reason }}</span>
        </el-form-item>

        <!-- 照片集举报的处理选项 -->
        <template v-if="currentReport?.targetType === 'photoset'">
          <el-form-item label="处理方式">
            <el-radio-group v-model="handleForm.action">
              <el-radio value="delete">删除照片集</el-radio>
              <el-radio value="hide">隐藏照片集</el-radio>
              <el-radio value="warning">警告用户</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-alert
            title="删除：永久删除该照片集；隐藏：照片集不再显示但保留数据；警告：向用户发送警告通知"
            type="info"
            :closable="false"
            style="margin-bottom: 15px"
          />
        </template>

        <!-- 评论举报的处理选项 -->
        <template v-if="currentReport?.targetType === 'review_goods' || currentReport?.targetType === 'review_location'">
          <el-form-item label="处理方式">
            <el-radio-group v-model="handleForm.action">
              <el-radio value="delete">删除评论</el-radio>
              <el-radio value="hide">隐藏评论</el-radio>
              <el-radio value="warning">警告用户</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-alert
            title="删除：永久删除该评论；隐藏：评论不再显示但保留数据；警告：向用户发送警告通知"
            type="info"
            :closable="false"
            style="margin-bottom: 15px"
          />
        </template>

        <!-- 模板举报的处理选项 -->
        <template v-if="currentReport?.targetType === 'template'">
          <el-form-item label="处理方式">
            <el-radio-group v-model="handleForm.action">
              <el-radio value="delete">删除模板</el-radio>
              <el-radio value="disable">禁用模板</el-radio>
              <el-radio value="warning">警告创建者</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-alert
            title="删除：永久删除该模板；禁用：模板不再可用但保留数据；警告：向创建者发送警告通知"
            type="info"
            :closable="false"
            style="margin-bottom: 15px"
          />
        </template>

        <el-form-item label="处理说明">
          <el-input
            v-model="handleForm.result"
            type="textarea"
            :rows="4"
            placeholder="请输入处理说明，将通知给举报人和被举报人"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleReject">驳回举报</el-button>
        <el-button type="primary" @click="handleAccept" :loading="submitting">
          确认处理
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="举报详情"
      width="600px"
    >
      <el-descriptions :column="1" border v-if="currentReport">
        <el-descriptions-item label="被举报内容">
          {{ currentReport.targetName }}
        </el-descriptions-item>
        <el-descriptions-item label="举报类型">
          <el-tag :type="getTypeTagType(currentReport.targetType)">
            {{ getTypeLabel(currentReport.targetType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="举报原因">
          {{ currentReport.reason }}
        </el-descriptions-item>
        <el-descriptions-item label="举报人">
          {{ currentReport.reporterName }}
        </el-descriptions-item>
        <el-descriptions-item label="举报时间">
          {{ formatTime(currentReport.createTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="处理状态">
          <el-tag :type="getStatusTagType(currentReport.status)">
            {{ getStatusLabel(currentReport.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="处理人" v-if="currentReport.handlerName">
          {{ currentReport.handlerName }}
        </el-descriptions-item>
        <el-descriptions-item label="处理结果" v-if="currentReport.handleResult">
          {{ currentReport.handleResult }}
        </el-descriptions-item>
        <el-descriptions-item label="处理时间" v-if="currentReport.handleTime">
          {{ formatTime(currentReport.handleTime) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 被举报内容详情对话框 - 照片集 -->
    <el-dialog
      v-model="targetDetailDialogVisible"
      :title="`${getTypeLabel(currentReport?.targetType || '')}详情`"
      width="800px"
    >
      <div v-if="targetDetail && currentReport?.targetType === 'photoset'" v-loading="loadingDetail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题" :span="2">
            {{ targetDetail.title }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ targetDetail.description }}
          </el-descriptions-item>
          <el-descriptions-item label="创建者">
            {{ targetDetail.userName }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(targetDetail.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="浏览数">
            {{ targetDetail.viewCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="点赞数">
            {{ targetDetail.likeCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="照片列表" :span="2">
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
              <el-image
                v-for="(photo, index) in targetDetail.photos"
                :key="index"
                :src="photo"
                fit="cover"
                style="width: 120px; height: 120px; border-radius: 4px;"
                :preview-teleported="true" :preview-src-list="targetDetail.photos"
              />
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div v-if="targetDetail && currentReport?.targetType === 'template'" v-loading="loadingDetail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称" :span="2">
            {{ targetDetail.name }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ targetDetail.description }}
          </el-descriptions-item>
          <el-descriptions-item label="分类">
            {{ targetDetail.category }}
          </el-descriptions-item>
          <el-descriptions-item label="创建者">
            {{ targetDetail.creatorName }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(targetDetail.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="使用次数">
            {{ targetDetail.photoSetCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="点赞数">
            {{ targetDetail.likeCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="收藏数">
            {{ targetDetail.favoriteCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">
            <el-tag v-for="tag in targetDetail.tags" :key="tag" size="small" style="margin-right: 5px;">
              {{ tag }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="封面图片" :span="2">
            <el-image
              :src="targetDetail.cover"
              fit="cover"
              style="width: 200px; height: 200px; border-radius: 4px; margin-top: 10px;"
              :preview-teleported="true" :preview-src-list="[targetDetail.cover]"
            />
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { callFunction, db, batchProcessImageUrls } from '@/utils/cloudbase'

interface Report {
  _id: string
  targetId: string
  targetType: string
  targetName: string
  reason: string
  reporterOpenId: string
  reporterName: string
  status: string
  handlerId?: string
  handlerName?: string
  handleResult?: string
  handleTime?: any
  createTime: any
}

const reports = ref<Report[]>([])
const loading = ref(false)
const submitting = ref(false)
const loadingDetail = ref(false)

const filters = ref({
  targetType: '',
  status: 'pending'
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const handleDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const targetDetailDialogVisible = ref(false)
const currentReport = ref<Report | null>(null)
const targetDetail = ref<any>(null)

const handleForm = ref({
  action: 'delete',
  result: ''
})

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 加载举报列表
const loadReports = async () => {
  loading.value = true
  try {
    const response = await callFunction('getReports', {
      adminId: adminInfo.value?.id,
      targetType: filters.value.targetType || undefined,
      status: filters.value.status,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    })

    if (response.success) {
      reports.value = response.data
      pagination.value.total = response.total
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('加载举报列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadReports()
}

// 分页变化
const handleSizeChange = () => {
  pagination.value.page = 1
  loadReports()
}

const handlePageChange = () => {
  loadReports()
}

// 打开处理对话框
const openHandleDialog = (report: Report) => {
  currentReport.value = report
  // 根据举报类型设置默认处理方式
  let defaultAction = 'delete'
  if (report.targetType === 'photoset' || report.targetType === 'review_goods' || report.targetType === 'review_location') {
    defaultAction = 'delete'
  } else if (report.targetType === 'template') {
    defaultAction = 'disable'
  }

  handleForm.value = {
    action: defaultAction,
    result: ''
  }
  handleDialogVisible.value = true
}

// 接受举报
const handleAccept = async () => {
  if (!handleForm.value.result.trim()) {
    ElMessage.warning('请输入处理说明')
    return
  }

  submitting.value = true
  try {
    const response = await callFunction('handleReport', {
      adminId: adminInfo.value?.id,
      reportId: currentReport.value?._id,
      action: handleForm.value.action,
      result: handleForm.value.result,
      targetType: currentReport.value?.targetType
    })

    if (response.success) {
      ElMessage.success(response.message)
      handleDialogVisible.value = false
      loadReports()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('处理举报失败:', error)
    ElMessage.error('处理失败')
  } finally {
    submitting.value = false
  }
}

// 驳回举报
const handleReject = async () => {
  if (!handleForm.value.result.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  try {
    await ElMessageBox.confirm('确定要驳回此举报吗？', '确认驳回', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    submitting.value = true
    const response = await callFunction('handleReport', {
      adminId: adminInfo.value?.id,
      reportId: currentReport.value?._id,
      action: 'reject',
      result: handleForm.value.result,
      targetType: currentReport.value?.targetType
    })

    if (response.success) {
      ElMessage.success(response.message)
      handleDialogVisible.value = false
      loadReports()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('驳回举报失败:', error)
      ElMessage.error('操作失败')
    }
  } finally {
    submitting.value = false
  }
}

// 查看详情
const viewDetail = (report: Report) => {
  currentReport.value = report
  detailDialogVisible.value = true
}

// 查看被举报内容详情
const viewTargetDetail = async () => {
  if (!currentReport.value) return

  loadingDetail.value = true
  targetDetail.value = null

  try {
    let collectionName = ''

    // 根据举报类型确定集合名称
    if (currentReport.value.targetType === 'photoset') {
      collectionName = 'photoSets'
    } else if (currentReport.value.targetType === 'template') {
      collectionName = 'templates'
    }

    if (collectionName) {
      // 直接查询数据库
      const result = await db.collection(collectionName)
        .doc(currentReport.value.targetId)
        .get()

      if (result.data && result.data.length > 0) {
        const data = result.data[0]

        // 处理图片 URL
        if (currentReport.value.targetType === 'photoset' && data.photos) {
          const allUrls = [data.coverPhoto, ...data.photos].filter(Boolean)
          const processedUrls = await batchProcessImageUrls(allUrls)
          data.coverPhoto = processedUrls[0]
          data.photos = processedUrls.slice(1)
        } else if (currentReport.value.targetType === 'template' && data.cover) {
          const processedUrls = await batchProcessImageUrls([data.cover])
          data.cover = processedUrls[0]
        }

        targetDetail.value = data
        targetDetailDialogVisible.value = true
      } else {
        ElMessage.error('内容不存在或已被删除')
      }
    }
  } catch (error) {
    console.error('获取被举报内容详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    loadingDetail.value = false
  }
}

// 从表格直接查看被举报内容
const viewTargetContent = async (report: Report) => {
  currentReport.value = report
  await viewTargetDetail()
}

// 获取类型标签
const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    photoset: '照片集',
    review_goods: '商品评论',
    review_location: '地点评论',
    template: '模板'
  }
  return map[type] || type
}

const getTypeTagType = (type: string) => {
  const map: Record<string, any> = {
    photoset: 'primary',
    review_goods: 'success',
    review_location: 'warning',
    template: 'danger'
  }
  return map[type] || 'info'
}

// 获取状态标签
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已处理',
    rejected: '已驳回'
  }
  return map[status] || status
}

const getStatusTagType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    rejected: 'info'
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
  loadReports()
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
</style>
