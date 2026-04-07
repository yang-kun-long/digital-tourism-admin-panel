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
              style="width: 60px; height: 60px; border-radius: 4px; cursor: pointer"
              :preview-teleported="true" :preview-src-list="[row.cover]"
              @click="openDetailDialog(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" min-width="150">
          <template #default="{ row }">
            <span style="cursor: pointer; color: #409EFF" @click="openDetailDialog(row)">
              {{ row.name }}
            </span>
          </template>
        </el-table-column>
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
              @click="console.log('点击删除按钮', row); handleDelete(row)"
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
            <el-button size="small" type="primary">选择封面</el-button>
          </el-upload>
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            封面将作为模板的第一张照片
          </div>
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
        <el-form-item label="模板照片" v-if="!isEdit">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handlePhotosChange"
            accept="image/*"
            multiple
          >
            <el-button size="small">选择照片（可多选）</el-button>
          </el-upload>
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            封面已作为第一张照片，此处可继续添加其他照片（最多8张）
          </div>
          <div v-if="selectedPhotoFiles.length > 0" style="margin-top: 10px;">
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              <div
                v-for="(url, index) in photoPreviewUrls"
                :key="index"
                style="position: relative; display: inline-block;"
              >
                <el-image
                  :src="url"
                  fit="cover"
                  style="width: 100px; height: 100px; border-radius: 4px"
                />
                <el-button
                  size="small"
                  type="danger"
                  circle
                  @click="removePhoto(index)"
                  style="position: absolute; top: 5px; right: 5px;"
                >
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </div>
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

    <!-- 模板详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="detailTemplate?.name"
      width="900px"
    >
      <div v-if="detailTemplate" style="max-height: 70vh; overflow-y: auto;">
        <!-- 基本信息 -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; gap: 20px; margin-bottom: 15px;">
            <div style="flex: 1;">
              <div style="color: #909399; font-size: 12px; margin-bottom: 5px;">分类</div>
              <el-tag>{{ detailTemplate.category }}</el-tag>
            </div>
            <div style="flex: 1;">
              <div style="color: #909399; font-size: 12px; margin-bottom: 5px;">状态</div>
              <el-tag :type="detailTemplate.status === 'active' ? 'success' : 'info'">
                {{ detailTemplate.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </div>
            <div style="flex: 1;">
              <div style="color: #909399; font-size: 12px; margin-bottom: 5px;">允许用户上传</div>
              <el-tag :type="detailTemplate.allowUserUpload ? 'success' : 'info'">
                {{ detailTemplate.allowUserUpload ? '是' : '否' }}
              </el-tag>
            </div>
          </div>

          <div style="margin-bottom: 15px;">
            <div style="color: #909399; font-size: 12px; margin-bottom: 5px;">描述</div>
            <div>{{ detailTemplate.description }}</div>
          </div>

          <div style="margin-bottom: 15px;">
            <div style="color: #909399; font-size: 12px; margin-bottom: 5px;">标签</div>
            <el-tag v-for="tag in detailTemplate.tags" :key="tag" style="margin-right: 5px">
              {{ tag }}
            </el-tag>
          </div>

          <div style="display: flex; gap: 20px;">
            <div>
              <div style="color: #909399; font-size: 12px;">照片数</div>
              <div style="font-size: 20px; font-weight: bold;">{{ detailTemplate.photoSetCount || 0 }}</div>
            </div>
            <div>
              <div style="color: #909399; font-size: 12px;">点赞数</div>
              <div style="font-size: 20px; font-weight: bold;">{{ detailTemplate.likeCount || 0 }}</div>
            </div>
            <div>
              <div style="color: #909399; font-size: 12px;">收藏数</div>
              <div style="font-size: 20px; font-weight: bold;">{{ detailTemplate.favoriteCount || 0 }}</div>
            </div>
            <div>
              <div style="color: #909399; font-size: 12px;">浏览数</div>
              <div style="font-size: 20px; font-weight: bold;">{{ detailTemplate.viewCount || 0 }}</div>
            </div>
          </div>
        </div>

        <!-- 照片列表 -->
        <el-divider />
        <div>
          <div style="color: #303133; font-size: 16px; font-weight: bold; margin-bottom: 15px;">
            模板照片
          </div>
          <div v-loading="loadingPhotos">
            <div v-if="detailPhotos.length === 0" style="text-align: center; color: #909399; padding: 40px 0;">
              暂无照片
            </div>
            <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
              <div
                v-for="photo in detailPhotos"
                :key="photo._id"
                style="position: relative; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
              >
                <el-image
                  :src="photo.thumbnailUrl || photo.photoUrl"
                  fit="cover"
                  style="width: 100%; height: 200px; cursor: pointer;"
                  :preview-src-list="[photo.photoUrl]"
                  :preview-teleported="true"
                />
                <div style="padding: 10px; background: white;">
                  <div style="font-size: 14px; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ photo.photoName || '未命名' }}
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #909399;">
                    <span>❤️ {{ photo.likeCount || 0 }}</span>
                    <span>👁️ {{ photo.viewCount || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="detailDialogVisible = false; detailTemplate && openEditDialog(detailTemplate)">
          编辑模板
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Refresh, Search, Plus, QuestionFilled } from '@element-plus/icons-vue'
import { callFunction, processImageUrl, processImageUrlSync, uploadPhotoWithThumbnail, batchProcessImageUrls } from '@/utils/cloudbase'

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

interface Photo {
  _id: string
  photoName?: string
  photoUrl: string
  thumbnailUrl?: string
  templateId: string
  likeCount: number
  viewCount: number
  sortOrder: number
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
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref()

const uploadingCover = ref(false)
const uploadProgress = ref(0)
const coverPreviewUrl = ref('')
const selectedCoverFile = ref<File | null>(null)

// 模板照片相关
const selectedPhotoFiles = ref<File[]>([])
const photoPreviewUrls = ref<string[]>([])

// 详情对话框相关
const detailDialogVisible = ref(false)
const detailTemplate = ref<Template | null>(null)
const detailPhotos = ref<Photo[]>([])
const loadingPhotos = ref(false)

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
  selectedPhotoFiles.value = []
  photoPreviewUrls.value = []
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

  ElMessage.success('封面已选择，点击确定后将上传')
}

// 处理模板照片选择
const handlePhotosChange = async (file: any) => {
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

  // 检查数量限制（封面已占1张，最多再加8张）
  if (selectedPhotoFiles.value.length >= 8) {
    ElMessage.error('封面已作为第一张照片，最多再添加8张')
    return
  }

  // 添加到文件列表
  selectedPhotoFiles.value.push(rawFile)

  // 生成本地预览 URL
  const reader = new FileReader()
  reader.onload = (e) => {
    photoPreviewUrls.value.push(e.target?.result as string)
  }
  reader.readAsDataURL(rawFile)
}

// 删除照片
const removePhoto = (index: number) => {
  selectedPhotoFiles.value.splice(index, 1)
  photoPreviewUrls.value.splice(index, 1)
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    // 创建模板时必须选择封面图片
    if (!isEdit.value && !selectedCoverFile.value && !form.value.cover) {
      ElMessage.error('请选择封面图片')
      return
    }

    submitting.value = true
    try {
      let coverFileID = form.value.cover

      // 如果有新选择的图片，先上传
      if (selectedCoverFile.value) {
        uploadingCover.value = true
        ElMessage.info('正在上传图片...')

        // 上传缩略图和原图
        const uploadResult = await uploadPhotoWithThumbnail(selectedCoverFile.value, 'templates')
        coverFileID = uploadResult.originalFileID

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
        const newTemplateId = response.data?._id || response.data?.id || response.templateId

        // 创建模板时，上传封面和其他照片
        if (!isEdit.value && newTemplateId) {
          try {
            let photoIndex = 1

            // 1. 上传封面作为第一张照片
            if (selectedCoverFile.value) {
              ElMessage.info('正在上传封面照片...')
              const coverPhotoResult = await uploadPhotoWithThumbnail(selectedCoverFile.value, 'photos/official')
              await callFunction('createOfficialPhoto', {
                adminId: adminInfo.value?.id,
                photoName: `${form.value.name}-封面`,
                templateId: newTemplateId,
                photoUrl: coverPhotoResult.originalFileID,
                thumbnailUrl: coverPhotoResult.thumbnailFileID,
                sortOrder: photoIndex++,
                status: 'approved'
              })
            }

            // 2. 批量上传其他照片
            if (selectedPhotoFiles.value.length > 0) {
              ElMessage.info(`正在上传 ${selectedPhotoFiles.value.length} 张照片...`)
              for (let i = 0; i < selectedPhotoFiles.value.length; i++) {
                const file = selectedPhotoFiles.value[i]
                if (!file) continue
                const photoResult = await uploadPhotoWithThumbnail(file, 'photos/official')
                const photoName = file.name.replace(/\.[^/.]+$/, '')
                await callFunction('createOfficialPhoto', {
                  adminId: adminInfo.value?.id,
                  photoName,
                  templateId: newTemplateId,
                  photoUrl: photoResult.originalFileID,
                  thumbnailUrl: photoResult.thumbnailFileID,
                  sortOrder: photoIndex++,
                  status: 'approved'
                })
              }
            }
          } catch (e) {
            console.warn('照片上传失败:', e)
            ElMessage.warning('模板创建成功，但部分照片上传失败')
          }
        }

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

// 打开详情对话框
const openDetailDialog = async (template: Template) => {
  detailTemplate.value = template
  detailDialogVisible.value = true
  detailPhotos.value = []

  // 加载模板照片
  loadingPhotos.value = true
  try {
    const response = await callFunction('getOfficialPhotos', {
      adminId: adminInfo.value?.id,
      templateId: template._id,
      page: 1,
      pageSize: 100
    })

    if (response.success) {
      // 处理照片 URL
      const photos = response.data || []
      const photoUrls = photos.map((p: Photo) => p.photoUrl)
      const thumbnailUrls = photos.map((p: Photo) => p.thumbnailUrl || p.photoUrl)

      const processedPhotoUrls = await batchProcessImageUrls(photoUrls)
      const processedThumbnailUrls = await batchProcessImageUrls(thumbnailUrls)

      detailPhotos.value = photos.map((photo: Photo, index: number) => ({
        ...photo,
        photoUrl: processedPhotoUrls[index],
        thumbnailUrl: processedThumbnailUrls[index]
      }))
    } else {
      ElMessage.error('加载照片失败')
    }
  } catch (error) {
    console.error('加载照片失败:', error)
    ElMessage.error('加载照片失败')
  } finally {
    loadingPhotos.value = false
  }
}

// 删除模板
const handleDelete = async (template: Template) => {
  console.log('开始删除模板:', template.name, template._id)
  try {
    const photoCountMsg = template.photoSetCount > 0
      ? `\n该模板下有 ${template.photoSetCount} 张照片，将一并删除。`
      : ''

    await ElMessageBox.confirm(
      `确定要删除模板"${template.name}"吗？${photoCountMsg}\n删除后不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    console.log('用户确认删除，准备调用云函数')
    console.log('adminInfo:', adminInfo.value)

    const response = await callFunction('deleteOfficialTemplate', {
      adminId: adminInfo.value?.id,
      templateId: template._id
    })

    console.log('删除模板响应:', response)

    if (response.success) {
      ElMessage.success(response.message)
      loadTemplates()
    } else {
      ElMessage.error(response.message || '删除失败')
      console.error('删除失败，响应:', response)
    }
  } catch (error) {
    console.log('捕获到错误:', error)
    if (error !== 'cancel') {
      console.error('删除失败，错误:', error)
      ElMessage.error(`删除失败: ${error}`)
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
