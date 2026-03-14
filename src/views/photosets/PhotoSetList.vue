<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>官方照片管理</span>
          <div>
            <el-button type="primary" @click="openUploadDialog">
              <el-icon><Plus /></el-icon>
              上传照片
            </el-button>
            <el-button @click="loadPhotos">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filter-bar">
        <el-select v-model="filters.templateId" placeholder="所属模板" clearable style="width: 200px">
          <el-option
            v-for="template in templateOptions"
            :key="template._id"
            :label="template.name"
            :value="template._id"
          />
        </el-select>

        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 150px; margin-left: 10px">
          <el-option label="已通过" value="approved" />
          <el-option label="待审核" value="pending" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>

        <el-input
          v-model="filters.keyword"
          placeholder="搜索照片名称"
          clearable
          style="width: 200px; margin-left: 10px"
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
        <el-table-column label="照片名称" min-width="150">
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
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="统计" width="150">
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
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">
              编辑
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

    <!-- 上传/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑照片' : '上传照片'"
      width="600px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="照片名称" prop="photoName">
          <el-input v-model="form.photoName" placeholder="请输入照片名称" />
        </el-form-item>
        <el-form-item label="所属模板" prop="templateId">
          <el-select v-model="form.templateId" placeholder="请选择模板" style="width: 100%">
            <el-option
              v-for="template in templateOptions"
              :key="template._id"
              :label="template.name"
              :value="template._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="照片" prop="photoUrl" v-if="!isEdit">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handlePhotoChange"
            accept="image/*"
          >
            <el-button size="small" type="primary">选择图片</el-button>
          </el-upload>
          <div v-if="photoPreviewUrl" style="margin-top: 10px; position: relative; display: inline-block;">
            <el-image
              :src="photoPreviewUrl"
              fit="cover"
              style="width: 200px; height: 200px; border-radius: 4px"
            />
            <el-button
              size="small"
              type="danger"
              circle
              @click="photoPreviewUrl = ''; selectedPhotoFile = null"
              style="position: absolute; top: 5px; right: 5px;"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <div v-if="uploadingPhoto" style="margin-top: 10px;">
            <el-progress :percentage="uploadProgress" />
            <span style="margin-left: 10px; color: #909399; font-size: 12px;">上传中...</span>
          </div>
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            数值越小越靠前，为0时采用热度算法自动排序
          </div>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="approved">已通过</el-radio>
            <el-radio value="pending">待审核</el-radio>
            <el-radio value="rejected">已拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Refresh, Search, Plus, Close, QuestionFilled } from '@element-plus/icons-vue'
import { callFunction, processImageUrl, uploadFileViaFunction } from '@/utils/cloudbase'

interface Photo {
  _id: string
  photoName?: string
  photoUrl: string
  templateId: string
  templateName?: string
  status: string
  sortOrder: number
  likeCount: number
  viewCount: number
  createTime: any
  sourcePhotoSetTitle?: string
  isOfficial: boolean
}

interface Template {
  _id: string
  name: string
}

const photoList = ref<Photo[]>([])
const templateOptions = ref<Template[]>([])
const loading = ref(false)
const submitting = ref(false)

const filters = ref({
  templateId: '',
  status: 'approved',
  keyword: ''
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()

const form = ref({
  _id: '',
  photoName: '',
  templateId: '',
  photoUrl: '',
  sortOrder: 0,
  status: 'approved'
})

const rules: FormRules = {
  photoName: [{ required: true, message: '请输入照片名称', trigger: 'blur' }],
  templateId: [{ required: true, message: '请选择所属模板', trigger: 'change' }],
  photoUrl: [{ required: true, message: '请上传照片', trigger: 'blur' }]
}

const uploadingPhoto = ref(false)
const uploadProgress = ref(0)
const photoPreviewUrl = ref('')
const selectedPhotoFile = ref<File | null>(null)

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

// 加载模板选项
const loadTemplateOptions = async () => {
  try {
    const response = await callFunction('getAllTemplates', {
      adminId: adminInfo.value?.id
    })

    if (response.success) {
      templateOptions.value = response.data
    }
  } catch (error) {
    console.error('加载模板选项失败:', error)
  }
}

// 加载照片列表
const loadPhotos = async () => {
  loading.value = true
  try {
    const response = await callFunction('getOfficialPhotos', {
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

// 打开上传对话框
const openUploadDialog = () => {
  isEdit.value = false
  form.value = {
    _id: '',
    photoName: '',
    templateId: '',
    photoUrl: '',
    sortOrder: 0,
    status: 'approved'
  }
  photoPreviewUrl.value = ''
  selectedPhotoFile.value = null
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = async (photo: Photo) => {
  isEdit.value = true
  form.value = {
    _id: photo._id,
    photoName: photo.photoName || photo.sourcePhotoSetTitle || '',
    templateId: photo.templateId,
    photoUrl: photo.photoUrl,
    sortOrder: photo.sortOrder,
    status: photo.status
  }
  dialogVisible.value = true
}

// 处理照片选择
const handlePhotoChange = async (file: any) => {
  if (!file || !file.raw) return

  const rawFile = file.raw as File
  const isImage = rawFile.type.startsWith('image/')
  const isLt10M = rawFile.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB')
    return
  }

  selectedPhotoFile.value = rawFile

  // 生成本地预览 URL
  const reader = new FileReader()
  reader.onload = (e) => {
    photoPreviewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(rawFile)

  ElMessage.success('图片已选择，点击确定后将上传')
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      let photoUrl = form.value.photoUrl

      // 如果有新选择的图片，先上传
      if (selectedPhotoFile.value) {
        uploadingPhoto.value = true
        ElMessage.info('正在上传图片...')

        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const ext = selectedPhotoFile.value.name.split('.').pop()
        const cloudPath = `photos/official/${timestamp}_${randomStr}.${ext}`

        const result = await uploadFileViaFunction(selectedPhotoFile.value, cloudPath)
        photoUrl = result.fileID

        uploadingPhoto.value = false
      }

      const functionName = isEdit.value ? 'updateOfficialPhoto' : 'createOfficialPhoto'
      const params: any = {
        adminId: adminInfo.value?.id,
        photoName: form.value.photoName,
        templateId: form.value.templateId,
        photoUrl: photoUrl,
        sortOrder: form.value.sortOrder,
        status: form.value.status
      }

      if (isEdit.value) {
        params.photoId = form.value._id
      }

      const response = await callFunction(functionName, params)

      if (response.success) {
        ElMessage.success(response.message)
        dialogVisible.value = false
        loadPhotos()
      } else {
        ElMessage.error(response.message)
      }
    } catch (error) {
      console.error('提交失败:', error)
      ElMessage.error('提交失败')
    } finally {
      submitting.value = false
      uploadingPhoto.value = false
    }
  })
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

    const response = await callFunction('deleteOfficialPhoto', {
      adminId: adminInfo.value?.id,
      photoId: photo._id
    })

    if (response.success) {
      ElMessage.success(response.message)
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

// 处理排序变化
const handleSortChange = async (photo: Photo) => {
  try {
    const response = await callFunction('updateOfficialPhoto', {
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

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    approved: 'success',
    pending: 'warning',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    approved: '已通过',
    pending: '待审核',
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
  loadTemplateOptions()
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
</style>
