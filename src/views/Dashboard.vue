<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <!-- 数据统计卡片 -->
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#1890ff"><Warning /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingReports }}</div>
              <div class="stat-label">待处理举报</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#52c41a"><ChatDotRound /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingFeedback }}</div>
              <div class="stat-label">待处理反馈</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#faad14"><Document /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalTemplates }}</div>
              <div class="stat-label">官方模板</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#f5222d"><Location /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalLocations }}</div>
              <div class="stat-label">地点数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button
              v-if="hasPermission(['super_admin', 'support_admin'])"
              type="primary"
              @click="router.push('/reports')"
            >
              <el-icon><Warning /></el-icon>
              处理举报
            </el-button>
            <el-button
              v-if="hasPermission(['super_admin', 'support_admin'])"
              type="success"
              @click="router.push('/feedback')"
            >
              <el-icon><ChatDotRound /></el-icon>
              处理反馈
            </el-button>
            <el-button
              v-if="hasPermission(['super_admin', 'content_admin'])"
              type="warning"
              @click="router.push('/templates')"
            >
              <el-icon><Document /></el-icon>
              管理模板
            </el-button>
            <el-button
              v-if="hasPermission(['super_admin', 'content_admin'])"
              type="info"
              @click="router.push('/locations')"
            >
              <el-icon><Location /></el-icon>
              管理地点
            </el-button>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>系统信息</span>
            </div>
          </template>
          <div class="system-info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="当前角色">
                <el-tag :type="getRoleType(adminInfo?.role)">
                  {{ getRoleLabel(adminInfo?.role) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="登录账号">
                {{ adminInfo?.username }}
              </el-descriptions-item>
              <el-descriptions-item label="最后登录">
                {{ formatTime(adminInfo?.lastLoginTime) }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近活动 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近活动</span>
            </div>
          </template>
          <el-empty v-if="recentActivities.length === 0" description="暂无活动记录" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="activity in recentActivities"
              :key="activity.id"
              :timestamp="activity.time"
              placement="top"
            >
              {{ activity.content }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Warning, ChatDotRound, Document, Location, Plus } from '@element-plus/icons-vue'
import { getRoleLabel } from '@/config/roles'
import type { AdminRole } from '@/config/roles'
import { db } from '@/utils/cloudbase'
import { ElMessage } from 'element-plus'

const router = useRouter()

const stats = ref({
  pendingReports: 0,
  pendingFeedback: 0,
  totalTemplates: 0,
  totalLocations: 0
})

const recentActivities = ref<Array<{ id: string; time: string; content: string }>>([])

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 权限检查
const hasPermission = (roles: AdminRole[]) => {
  return adminInfo.value && roles.includes(adminInfo.value.role)
}

// 获取角色标签类型
const getRoleType = (role?: AdminRole) => {
  switch (role) {
    case 'super_admin':
      return 'danger'
    case 'content_admin':
      return 'success'
    case 'support_admin':
      return 'warning'
    default:
      return 'info'
  }
}

// 格式化时间
const formatTime = (timestamp?: number) => {
  if (!timestamp) return '未知'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 加载统计数据
const loadStats = async () => {
  try {
    // 查询待处理举报数量
    const pendingReportsRes = await db.collection('reports')
      .where({ status: 'pending' })
      .count()

    // 查询待处理反馈数量
    const pendingFeedbackRes = await db.collection('feedback')
      .where({ status: 'pending' })
      .count()

    // 查询官方模板数量
    const templatesRes = await db.collection('templates')
      .where({ isOfficial: true })
      .count()

    // 查询地点数量
    const locationsRes = await db.collection('locations')
      .count()

    stats.value = {
      pendingReports: pendingReportsRes.total,
      pendingFeedback: pendingFeedbackRes.total,
      totalTemplates: templatesRes.total,
      totalLocations: locationsRes.total
    }

    // 加载最近活动
    await loadRecentActivities()
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

// 加载最近活动
const loadRecentActivities = async () => {
  try {
    const activities: Array<{ id: string; time: string; content: string }> = []

    // 获取最近的举报
    const reportsRes = await db.collection('reports')
      .orderBy('createTime', 'desc')
      .limit(3)
      .get()

    reportsRes.data.forEach((report: any) => {
      activities.push({
        id: report._id,
        time: new Date(report.createTime).toLocaleString('zh-CN'),
        content: `收到新举报：${report.reason || '违规内容'}`
      })
    })

    // 获取最近的反馈
    const feedbackRes = await db.collection('feedback')
      .orderBy('createTime', 'desc')
      .limit(3)
      .get()

    feedbackRes.data.forEach((feedback: any) => {
      activities.push({
        id: feedback._id,
        time: new Date(feedback.createTime).toLocaleString('zh-CN'),
        content: `收到新反馈：${feedback.content?.substring(0, 20) || '用户反馈'}...`
      })
    })

    // 按时间排序并取前5条
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    recentActivities.value = activities.slice(0, 5)
  } catch (error) {
    console.error('加载最近活动失败:', error)
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 48px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.system-info {
  padding: 8px 0;
}
</style>
