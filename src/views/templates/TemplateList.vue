<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>官方模板管理</span>
          <div>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              创建模板
            </el-button>
            <el-button @click="loadTemplates">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filter-bar">
        <el-select v-model="filters.category" placeholder="分类" clearable style="width: 150px">
          <el-option label="景区主题" value="景区主题" />
          <el-option label="风格分类" value="风格分类" />
          <el-option label="场景打卡" value="场景打卡" />
        </el-select>

        <el-select v-model="filters.status" placeholder="状态" style="width: 150px; margin-left: 10px">
          <el-option label="启用" value="active" />
          <el-option label="禁用" value="inactive" />
        </el-select>

        <el-input
          v-model="filters.keyword"
          placeholder="搜索模板名称"
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
      <el-table :data="processedTemplateList" v-loading="loading" stripe style="margin-top: 20px">
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.cover"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-teleported="true" :preview-src-list="[row.cover]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags" :key="tag" size="small" style="margin-right: 5px">
              {{ tag }}
            </el-tag>
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
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
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

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模板' : '创建模板'"
      width="700px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
          />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="景区主题" value="景区主题" />
            <el-option label="风格分类" value="风格分类" />
            <el-option label="场景打卡" value="场景打卡" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面图片" prop="cover">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleCoverChange"
            accept="image/*"
          >
            <el-button size="small" type="primary">选择图片</el-button>
          </el-upload>
          <div v-if="form.cover || coverPreviewUrl" style="margin-top: 10px; position: relative; display: inline-block;">
            <el-image
              :src="coverPreviewUrl || processImageUrlSync(form.cover)"
              fit="cover"
              style="width: 150px; height: 150px; border-radius: 4px"
            />
            <el-button
              size="small"
              type="danger"
              circle
              @click="form.cover = ''; coverPreviewUrl = ''; selectedCoverFile = null"
              style="position: absolute; top: 5px; right: 5px;"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <div v-if="uploadingCover" style="margin-top: 10px;">
            <el-progress :percentage="uploadProgress" />
            <span style="margin-left: 10px; color: #909399; font-size: 12px;">上传中...</span>
          </div>
        </el-form-item>
        <el-form-item label="标签">
          <el-tag
            v-for="tag in form.tags"
            :key="tag"
            closable
            @close="removeTag(tag)"
            style="margin-right: 10px"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="tagInputVisible"
            ref="tagInputRef"
            v-model="tagInputValue"
            size="small"
            style="width: 100px"
            @keyup.enter="handleTagInputConfirm"
            @blur="handleTagInputConfirm"
          />
          <el-button v-else size="small" @click="showTagInput">
            + 添加标签
          </el-button>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            数值越小越靠前，为0时采用热度算法自动排序
          </div>
        </el-form-item>
        <el-form-item label="允许用户上传">
          <el-switch v-model="form.allowUserUpload" />
        </el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
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
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Refresh, Search, Plus, QuestionFilled } from '@element-plus/icons-vue'
import { callFunction, processImageUrl, processImageUrlSync, uploadFileViaFunction } from '@/utils/cloudbase'

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
  sortOrder: number
  allowUserUpload: boolean
  likeCount: number
  favoriteCount: number
  photoSetCount: number
  viewCount: number
  createTime: any
  updateTime: any
}

const templateList = ref<Template[]>([])
const loading = ref(false)
const submitting = ref(false)

const filters = ref({
  category: '',
  status: 'active',
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
  name: '',
  description: '',
  category: '',
  cover: '',
  tags: [] as string[],
  sortOrder: 0,
  allowUserUpload: true,
  status: 'active'
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入模板描述', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  cover: [{ required: true, message: '请输入封面图片URL', trigger: 'blur' }]
}

const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref()

const uploadingCover = ref(false)
const uploadProgress = ref(0)
const coverPreviewUrl = ref('')
const selectedCoverFile = ref<File | null>(null)

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
    const response = await callFunction('getOfficialTemplates', {
      adminId: adminInfo.value?.id,
      category: filters.value.category || undefined,
      status: filters.value.status,
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

// 打开创建对话框
const openCreateDialog = () => {
  isEdit.value = false
  form.value = {
    _id: '',
    name: '',
    description: '',
    category: '',
    cover: '',
    tags: [],
    sortOrder: 0,
    allowUserUpload: true,
    status: 'active'
  }
  coverPreviewUrl.value = ''
  selectedCoverFile.value = null
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = async (template: Template) => {
  isEdit.value = true
  form.value = {
    _id: template._id,
    name: template.name,
    description: template.description,
    category: template.category,
    cover: template.cover,
    tags: [...template.tags],
    sortOrder: template.sortOrder,
    allowUserUpload: template.allowUserUpload,
    status: template.status
  }

  // 加载封面预览
  if (template.cover) {
    coverPreviewUrl.value = await processImageUrl(template.cover)
  }

  selectedCoverFile.value = null
  dialogVisible.value = true
}

// 处理封面图片选择（不立即上传）
const handleCoverChange = async (file: any) => {
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

  // 保存文件对象
  selectedCoverFile.value = rawFile

  // 生成本地预览 URL
  const reader = new FileReader()
  reader.onload = (e) => {
    coverPreviewUrl.value = e.target?.result as string
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
      let coverFileID = form.value.cover

      // 如果有新选择的图片，先上传
      if (selectedCoverFile.value) {
        uploadingCover.value = true
        ElMessage.info('正在上传图片...')

        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const ext = selectedCoverFile.value.name.split('.').pop()
        const cloudPath = `templates/${timestamp}_${randomStr}.${ext}`

        const result = await uploadFileViaFunction(selectedCoverFile.value, cloudPath)
        coverFileID = result.fileID

        uploadingCover.value = false
      }

      const functionName = isEdit.value ? 'updateOfficialTemplate' : 'createOfficialTemplate'
      const params: any = {
        adminId: adminInfo.value?.id,
        name: form.value.name,
        description: form.value.description,
        category: form.value.category,
        cover: coverFileID,
        tags: form.value.tags,
        sortOrder: form.value.sortOrder,
        allowUserUpload: form.value.allowUserUpload
      }

      if (isEdit.value) {
        params.templateId = form.value._id
        params.status = form.value.status
      }

      const response = await callFunction(functionName, params)

      if (response.success) {
        ElMessage.success(response.message)
        dialogVisible.value = false
        loadTemplates()
      } else {
        ElMessage.error(response.message)
      }
    } catch (error) {
      console.error('提交失败:', error)
      ElMessage.error('提交失败')
    } finally {
      submitting.value = false
      uploadingCover.value = false
    }
  })
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

    const response = await callFunction('deleteOfficialTemplate', {
      adminId: adminInfo.value?.id,
      templateId: template._id
    })

    if (response.success) {
      ElMessage.success(response.message)
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

// 处理排序变化
const handleSortChange = async (template: Template) => {
  try {
    const response = await callFunction('updateOfficialTemplate', {
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

// 标签相关
const removeTag = (tag: string) => {
  form.value.tags = form.value.tags.filter(t => t !== tag)
}

const showTagInput = () => {
  tagInputVisible.value = true
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

const handleTagInputConfirm = () => {
  if (tagInputValue.value && !form.value.tags.includes(tagInputValue.value)) {
    form.value.tags.push(tagInputValue.value)
  }
  tagInputVisible.value = false
  tagInputValue.value = ''
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
</style>
