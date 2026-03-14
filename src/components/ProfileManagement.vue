<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock, Edit } from '@element-plus/icons-vue'
import { callFunction } from '../utils/cloudbase'

interface AdminInfo {
  id: string
  username: string
  role: string
  createdAt: number
}

// 从 localStorage 获取管理员信息
const currentAdmin = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

const loading = ref(false)
const editDialogVisible = ref(false)
const passwordDialogVisible = ref(false)

const editForm = ref({
  username: ''
})

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 打开编辑用户名对话框
const openEditDialog = () => {
  if (!currentAdmin.value) return
  editForm.value.username = currentAdmin.value.username
  editDialogVisible.value = true
}

// 打开修改密码对话框
const openPasswordDialog = () => {
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  passwordDialogVisible.value = true
}

// 更新用户名
const updateUsername = async () => {
  if (!currentAdmin.value) return

  if (!editForm.value.username) {
    ElMessage.warning('请输入用户名')
    return
  }

  if (editForm.value.username === currentAdmin.value.username) {
    ElMessage.warning('用户名未修改')
    return
  }

  loading.value = true
  try {
    const response = await callFunction('updateMyProfile', {
      adminId: currentAdmin.value.id,
      username: editForm.value.username
    })

    if (response.success) {
      ElMessage.success(response.message)
      editDialogVisible.value = false

      // 更新本地存储
      const updatedAdmin = {
        ...currentAdmin.value,
        username: editForm.value.username
      }
      localStorage.setItem('adminInfo', JSON.stringify(updatedAdmin))
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('更新用户名失败:', error)
    ElMessage.error('更新失败')
  } finally {
    loading.value = false
  }
}

// 修改密码
const changePassword = async () => {
  if (!currentAdmin.value) return

  if (!passwordForm.value.oldPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    ElMessage.warning('请填写完整信息')
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    ElMessage.warning('新密码长度至少6位')
    return
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.warning('两次密码输入不一致')
    return
  }

  if (passwordForm.value.oldPassword === passwordForm.value.newPassword) {
    ElMessage.warning('新密码不能与旧密码相同')
    return
  }

  loading.value = true
  try {
    const response = await callFunction('changeMyPassword', {
      adminId: currentAdmin.value.id,
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })

    if (response.success) {
      ElMessage.success(response.message)
      passwordDialogVisible.value = false
      passwordForm.value = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    ElMessage.error('修改失败')
  } finally {
    loading.value = false
  }
}

// 格式化时间
const formatTime = (timestamp: number) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}
</script>

<template>
  <div class="profile-management" v-if="currentAdmin">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人信息</span>
        </div>
      </template>

      <div class="profile-header">
        <div class="avatar">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="#409EFF"/>
            <circle cx="50" cy="35" r="15" fill="white"/>
            <path d="M 25 70 Q 25 55 50 55 Q 75 55 75 70 L 75 100 L 25 100 Z" fill="white"/>
          </svg>
        </div>
        <div class="profile-info">
          <h2>{{ currentAdmin.username }}</h2>
          <el-tag :type="currentAdmin.role === 'super_admin' ? 'danger' : 'primary'" size="large">
            {{ currentAdmin.role === 'super_admin' ? '超级管理员' : '管理员' }}
          </el-tag>
        </div>
      </div>

      <el-descriptions :column="1" border class="profile-details">
        <el-descriptions-item label="用户名">
          <div class="info-row">
            <span>{{ currentAdmin.username }}</span>
            <el-button size="small" :icon="Edit" @click="openEditDialog">
              修改
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="角色">
          <el-tag :type="currentAdmin.role === 'super_admin' ? 'danger' : 'primary'">
            {{ currentAdmin.role === 'super_admin' ? '超级管理员' : '管理员' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="账户ID">
          {{ currentAdmin.id }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatTime(currentAdmin.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="actions">
        <el-button type="primary" :icon="Lock" @click="openPasswordDialog">
          修改密码
        </el-button>
      </div>
    </el-card>

    <!-- 修改用户名对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="修改用户名"
      width="400px"
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input
            v-model="editForm.username"
            :prefix-icon="User"
            placeholder="请输入新用户名"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="updateUsername" :loading="loading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="400px"
    >
      <el-form :model="passwordForm" label-width="100px">
        <el-form-item label="当前密码">
          <el-input
            v-model="passwordForm.oldPassword"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入当前密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="passwordForm.newPassword"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input
            v-model="passwordForm.confirmPassword"
            :prefix-icon="Lock"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="changePassword" :loading="loading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.profile-management {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 0;
  margin-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.avatar svg {
  width: 100%;
  height: 100%;
  display: block;
}

.profile-info {
  flex: 1;
}

.profile-info h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #303133;
}

.profile-details {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.actions {
  margin-top: 20px;
  text-align: center;
}
</style>
