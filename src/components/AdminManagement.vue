<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Lock, User } from '@element-plus/icons-vue'
import { callFunction } from '../utils/cloudbase'
import { getRoleLabel } from '../config/roles'

interface Admin {
  _id: string
  username: string
  displayName?: string
  role: 'super_admin' | 'content_admin' | 'support_admin'
  status: 'active' | 'disabled'
  createdAt: number
  lastLoginAt?: number
}

interface AdminInfo {
  id: string
  username: string
  role: string
}

// 从 localStorage 获取当前管理员信息
const currentAdmin = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

const admins = ref<Admin[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogType = ref<'create' | 'edit' | 'password'>('create')
const currentEditAdmin = ref<Admin | null>(null)

const adminForm = ref({
  username: '',
  password: '',
  displayName: '',
  role: 'content_admin' as 'content_admin' | 'support_admin' | 'super_admin'
})

const passwordForm = ref({
  adminId: '',
  newPassword: '',
  confirmPassword: ''
})

// 检查是否为超级管理员
const isSuperAdmin = computed(() => currentAdmin.value?.role === 'super_admin')

// 加载管理员列表
const loadAdmins = async () => {
  if (!isSuperAdmin.value || !currentAdmin.value) {
    ElMessage.error('权限不足')
    return
  }

  loading.value = true
  try {
    const response = await callFunction('listAdmins', {
      adminId: currentAdmin.value.id
    })

    if (response.success) {
      admins.value = response.data
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('加载管理员列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 打开创建对话框
const openCreateDialog = () => {
  dialogType.value = 'create'
  adminForm.value = {
    username: '',
    password: '',
    displayName: '',
    role: 'content_admin'
  }
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = (admin: Admin) => {
  dialogType.value = 'edit'
  currentEditAdmin.value = admin
  adminForm.value = {
    username: admin.username,
    password: '',
    displayName: admin.displayName || '',
    role: admin.role
  }
  dialogVisible.value = true
}

// 打开修改密码对话框
const openPasswordDialog = (admin: Admin) => {
  dialogType.value = 'password'
  passwordForm.value = {
    adminId: admin._id,
    newPassword: '',
    confirmPassword: ''
  }
  dialogVisible.value = true
}

// 创建管理员
const createAdmin = async () => {
  if (!currentAdmin.value) {
    ElMessage.error('未登录')
    return
  }

  if (!adminForm.value.username || !adminForm.value.password) {
    ElMessage.warning('请填写完整信息')
    return
  }

  if (adminForm.value.password.length < 6) {
    ElMessage.warning('密码长度至少6位')
    return
  }

  loading.value = true
  try {
    const response = await callFunction('createAdmin', {
      callerId: currentAdmin.value.id,
      username: adminForm.value.username,
      password: adminForm.value.password,
      role: adminForm.value.role,
      displayName: adminForm.value.displayName
    })

    if (response.success) {
      ElMessage.success(response.message)
      dialogVisible.value = false
      await loadAdmins()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('创建管理员失败:', error)
    ElMessage.error('创建失败')
  } finally {
    loading.value = false
  }
}

// 更新管理员信息
const updateAdmin = async () => {
  if (!currentAdmin.value || !currentEditAdmin.value) return

  if (!adminForm.value.username) {
    ElMessage.warning('请填写用户名')
    return
  }

  loading.value = true
  try {
    const response = await callFunction('updateAdmin', {
      callerId: currentAdmin.value.id,
      adminId: currentEditAdmin.value._id,
      username: adminForm.value.username,
      role: adminForm.value.role
    })

    if (response.success) {
      ElMessage.success(response.message)
      dialogVisible.value = false
      await loadAdmins()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('更新管理员失败:', error)
    ElMessage.error('更新失败')
  } finally {
    loading.value = false
  }
}

// 修改密码
const changePassword = async () => {
  if (!currentAdmin.value) return

  if (!passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    ElMessage.warning('请填写完整信息')
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    ElMessage.warning('密码长度至少6位')
    return
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.warning('两次密码输入不一致')
    return
  }

  loading.value = true
  try {
    const response = await callFunction('changeAdminPassword', {
      callerId: currentAdmin.value.id,
      adminId: passwordForm.value.adminId,
      newPassword: passwordForm.value.newPassword
    })

    if (response.success) {
      ElMessage.success(response.message)
      dialogVisible.value = false
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

// 切换管理员状态
const toggleAdminStatus = async (admin: Admin) => {
  if (!currentAdmin.value) return

  const action = admin.status === 'active' ? '禁用' : '启用'

  try {
    await ElMessageBox.confirm(
      `确定要${action}管理员"${admin.username}"吗？`,
      `确认${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    const response = await callFunction('toggleAdminStatus', {
      callerId: currentAdmin.value.id,
      adminId: admin._id
    })

    if (response.success) {
      ElMessage.success(response.message)
      await loadAdmins()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('切换状态失败:', error)
      ElMessage.error('操作失败')
    }
  } finally {
    loading.value = false
  }
}

// 删除管理员
const deleteAdmin = async (admin: Admin) => {
  if (!currentAdmin.value) return

  try {
    await ElMessageBox.confirm(
      `确定要删除管理员"${admin.username}"吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )

    loading.value = true
    const response = await callFunction('deleteAdmin', {
      callerId: currentAdmin.value.id,
      adminId: admin._id
    })

    if (response.success) {
      ElMessage.success(response.message)
      await loadAdmins()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除管理员失败:', error)
      ElMessage.error('删除失败')
    }
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

// 提交表单
const handleSubmit = () => {
  if (dialogType.value === 'create') {
    createAdmin()
  } else if (dialogType.value === 'edit') {
    updateAdmin()
  } else if (dialogType.value === 'password') {
    changePassword()
  }
}

onMounted(() => {
  if (isSuperAdmin.value) {
    loadAdmins()
  }
})
</script>

<template>
  <div class="admin-management">
    <div v-if="!isSuperAdmin" class="no-permission">
      <el-empty description="权限不足，只有超级管理员可以访问此页面" />
    </div>

    <div v-else>
      <div class="header">
        <h2>管理员管理</h2>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">
          创建管理员
        </el-button>
      </div>

      <el-table :data="admins" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="displayName" label="显示名称" width="150" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.role === 'super_admin' ? 'danger' : row.role === 'content_admin' ? 'success' : 'warning'"
            >
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '正常' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="180">
          <template #default="{ row }">
            {{ formatTime(row.lastLoginAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              :icon="Edit"
              @click="openEditDialog(row)"
              :disabled="row._id === currentAdmin?.id"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              :icon="Lock"
              @click="openPasswordDialog(row)"
            >
              改密
            </el-button>
            <el-button
              size="small"
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="toggleAdminStatus(row)"
              :disabled="row._id === currentAdmin?.id"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              :icon="Delete"
              @click="deleteAdmin(row)"
              :disabled="row._id === currentAdmin?.id || row.role === 'super_admin'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? '创建管理员' : dialogType === 'edit' ? '编辑管理员' : '修改密码'"
      width="500px"
    >
      <el-form
        v-if="dialogType !== 'password'"
        :model="adminForm"
        label-width="80px"
      >
        <el-form-item label="用户名">
          <el-input
            v-model="adminForm.username"
            :prefix-icon="User"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input
            v-model="adminForm.displayName"
            placeholder="请输入显示名称（可选）"
          />
        </el-form-item>
        <el-form-item v-if="dialogType === 'create'" label="密码">
          <el-input
            v-model="adminForm.password"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="adminForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option value="super_admin" label="超级管理员">
              <span style="float: left">超级管理员</span>
              <span style="float: right; color: #8492a6; font-size: 13px">所有权限</span>
            </el-option>
            <el-option value="content_admin" label="内容管理员">
              <span style="float: left">内容管理员</span>
              <span style="float: right; color: #8492a6; font-size: 13px">官方内容管理</span>
            </el-option>
            <el-option value="support_admin" label="客服管理员">
              <span style="float: left">客服管理员</span>
              <span style="float: right; color: #8492a6; font-size: 13px">举报和反馈处理</span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <el-form v-else :model="passwordForm" label-width="100px">
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-management {
  padding: 20px;
}

.no-permission {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}
</style>
