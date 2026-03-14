<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { callFunction, login } from '../utils/cloudbase'

interface LoginForm {
  username: string
  password: string
}

const emit = defineEmits<{
  (e: 'login-success', adminInfo: any): void
}>()

const loginForm = ref<LoginForm>({
  username: '',
  password: ''
})

const loading = ref(false)

// 组件挂载时初始化 CloudBase
onMounted(async () => {
  try {
    await login()
  } catch (error) {
    console.error('CloudBase 初始化失败:', error)
  }
})

// 登录处理
const handleLogin = async () => {
  // 表单验证
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    // 使用 HTTP API 调用云函数进行登录验证
    const response = await callFunction('adminLogin', {
      username: loginForm.value.username,
      password: loginForm.value.password
    })

    if (response.success) {
      ElMessage.success(response.message)

      // 保存管理员信息到 localStorage
      localStorage.setItem('adminInfo', JSON.stringify(response.data))

      // 触发登录成功事件
      emit('login-success', response.data)
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 回车登录
const handleKeyup = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin()
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>数字文旅管理后台</h1>
        <p>模板审批管理系统</p>
      </div>

      <el-form class="login-form" @keyup.enter="handleKeyup">
        <el-form-item>
          <el-input
            v-model="loginForm.username"
            :prefix-icon="User"
            placeholder="请输入用户名"
            size="large"
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="loginForm.password"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p>默认账户：admin / admin</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #303133;
  font-weight: 600;
}

.login-header p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.login-form {
  margin-top: 30px;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

.login-footer {
  margin-top: 20px;
  text-align: center;
}

.login-footer p {
  margin: 0;
  font-size: 12px;
  color: #c0c4cc;
}
</style>
