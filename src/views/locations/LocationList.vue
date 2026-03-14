<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>地点管理</span>
          <div>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              创建地点
            </el-button>
            <el-button @click="loadLocations">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filter-bar">
        <el-select v-model="filters.type" placeholder="地点类型" clearable style="width: 150px">
          <el-option label="景点" value="scenic" />
          <el-option label="酒店" value="hotel" />
          <el-option label="美食" value="food" />
          <el-option label="休闲" value="leisure" />
        </el-select>

        <el-select v-model="filters.status" placeholder="状态" style="width: 150px; margin-left: 10px">
          <el-option label="启用" value="active" />
          <el-option label="禁用" value="inactive" />
        </el-select>

        <el-input
          v-model="filters.keyword"
          placeholder="搜索地点名称"
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
      <el-table :data="processedLocationList" v-loading="loading" stripe style="margin-top: 20px">
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.coverImage"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-teleported="true" :preview-src-list="[row.coverImage]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="地点名称" min-width="150" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeLabel(row.type) }}
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
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags?.slice(0, 3)" :key="tag" size="small" style="margin-right: 5px">
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="推荐" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isFeatured" type="warning" size="small">推荐</el-tag>
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
              <div>打卡: {{ row.checkInCount || 0 }}</div>
              <div>评分: {{ row.rating || 0 }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="viewDetail(row)">
              查看
            </el-button>
            <el-button size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">
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
      :title="isEdit ? '编辑地点' : '创建地点'"
      width="800px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="地点名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入地点名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="地点类型" prop="type">
              <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
                <el-option label="景点" value="scenic" />
                <el-option label="酒店" value="hotel" />
                <el-option label="美食" value="food" />
                <el-option label="休闲" value="leisure" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="地点描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入地点描述"
          />
        </el-form-item>

        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入详细地址" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="纬度">
              <el-input-number v-model="form.latitude" :precision="6" :step="0.000001" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经度">
              <el-input-number v-model="form.longitude" :precision="6" :step="0.000001" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="封面图片" prop="coverImage">
          <el-upload
            class="cover-uploader"
            :show-file-list="false"
            :before-upload="beforeCoverUpload"
            :http-request="handleCoverSelect"
            accept="image/*"
          >
            <el-image
              v-if="coverPreviewUrl || form.coverImage"
              :src="coverPreviewUrl || processImageUrlSync(form.coverImage)"
              fit="cover"
              style="width: 150px; height: 150px; border-radius: 4px; cursor: pointer"
            />
            <div v-else class="upload-placeholder">
              <el-icon class="upload-icon"><Plus /></el-icon>
              <div class="upload-text">上传封面</div>
            </div>
          </el-upload>
          <div class="upload-tip">建议尺寸: 750x750px，支持 JPG、PNG 格式，大小不超过 10MB</div>
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

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="营业时间">
              <el-input v-model="form.openTime" placeholder="如：08:00-18:00" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="form.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            数值越小越靠前，为0时采用热度算法自动排序
          </div>
        </el-form-item>

        <el-form-item label="是否推荐">
          <el-switch v-model="form.isFeatured" />
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            推荐地点会在小程序首页的 Bento Box 中展示
          </div>
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

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="地点详情" width="800px">
      <el-descriptions :column="2" border v-if="currentLocation">
        <el-descriptions-item label="地点名称" :span="2">
          {{ currentLocation.name }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="getTypeTagType(currentLocation.type)">
            {{ getTypeLabel(currentLocation.type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentLocation.status === 'active' ? 'success' : 'info'">
            {{ currentLocation.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="地址" :span="2">
          {{ currentLocation.address }}
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">
          {{ currentLocation.description }}
        </el-descriptions-item>
        <el-descriptions-item label="营业时间">
          {{ currentLocation.openTime || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ currentLocation.phone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="经纬度" :span="2">
          {{ currentLocation.latitude }}, {{ currentLocation.longitude }}
        </el-descriptions-item>
        <el-descriptions-item label="标签" :span="2">
          <el-tag v-for="tag in currentLocation.tags" :key="tag" size="small" style="margin-right: 5px">
            {{ tag }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="打卡数">
          {{ currentLocation.checkInCount || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="浏览数">
          {{ currentLocation.viewCount || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="评分">
          {{ currentLocation.rating || 0 }} ({{ currentLocation.ratingCount || 0 }}人评价)
        </el-descriptions-item>
        <el-descriptions-item label="是否推荐">
          <el-tag v-if="currentLocation.isFeatured" type="warning">推荐</el-tag>
          <span v-else>否</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadRequestOptions } from 'element-plus'
import { Refresh, Search, Plus, QuestionFilled } from '@element-plus/icons-vue'
import { callFunction, processImageUrl, processImageUrlSync, uploadFileViaFunction } from '@/utils/cloudbase'

interface Location {
  _id: string
  name: string
  description: string
  type: string
  category: string
  address: string
  latitude: number
  longitude: number
  coverImage: string
  images: string[]
  tags: string[]
  openTime: string
  phone: string
  sortOrder: number
  isFeatured: boolean
  featuredOrder: number
  isHot: boolean
  status: string
  rating: number
  ratingCount: number
  checkInCount: number
  viewCount: number
  favoriteCount: number
}

const locationList = ref<Location[]>([])
const loading = ref(false)
const submitting = ref(false)

const filters = ref({
  type: '',
  status: 'active',
  keyword: ''
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const currentLocation = ref<Location | null>(null)

const form = ref({
  _id: '',
  name: '',
  description: '',
  type: '',
  category: '',
  address: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  coverImage: '',
  tags: [] as string[],
  openTime: '',
  phone: '',
  sortOrder: 0,
  isFeatured: false,
  featuredOrder: 999,
  status: 'active'
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入地点名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入地点描述', trigger: 'blur' }],
  type: [{ required: true, message: '请选择地点类型', trigger: 'change' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
  coverImage: [{ required: true, message: '请输入封面图片URL', trigger: 'blur' }]
}

const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref()

// 上传相关
const selectedCoverFile = ref<File | null>(null)
const coverPreviewUrl = ref('')

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 处理图片 URL 列表
const processedLocationList = ref<Location[]>([])

// 监听地点列表变化，处理图片 URL
watch(locationList, async (newList) => {
  const processed = await Promise.all(
    newList.map(async (location) => ({
      ...location,
      coverImage: await processImageUrl(location.coverImage),
      images: location.images ? await Promise.all(location.images.map(img => processImageUrl(img))) : []
    }))
  )
  processedLocationList.value = processed
}, { immediate: true })

// 加载地点列表
const loadLocations = async () => {
  loading.value = true
  try {
    const response = await callFunction('getLocations', {
      adminId: adminInfo.value?.id,
      type: filters.value.type || undefined,
      status: filters.value.status,
      keyword: filters.value.keyword || undefined,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    })

    if (response.success) {
      locationList.value = response.data
      pagination.value.total = response.total
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('加载地点列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadLocations()
}

// 分页变化
const handleSizeChange = () => {
  pagination.value.page = 1
  loadLocations()
}

const handlePageChange = () => {
  loadLocations()
}

// 打开创建对话框
const openCreateDialog = () => {
  isEdit.value = false
  form.value = {
    _id: '',
    name: '',
    description: '',
    type: '',
    category: '',
    address: '',
    latitude: undefined,
    longitude: undefined,
    coverImage: '',
    tags: [],
    openTime: '',
    phone: '',
    sortOrder: 0,
    isFeatured: false,
    featuredOrder: 999,
    status: 'active'
  }
  selectedCoverFile.value = null
  coverPreviewUrl.value = ''
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = async (location: Location) => {
  isEdit.value = true
  form.value = {
    _id: location._id,
    name: location.name,
    description: location.description,
    type: location.type,
    category: location.category,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    coverImage: location.coverImage,
    tags: [...location.tags],
    openTime: location.openTime,
    phone: location.phone,
    sortOrder: location.sortOrder || 0,
    isFeatured: location.isFeatured,
    featuredOrder: location.featuredOrder,
    status: location.status
  }

  // 加载封面预览
  selectedCoverFile.value = null
  if (location.coverImage) {
    coverPreviewUrl.value = await processImageUrl(location.coverImage)
  } else {
    coverPreviewUrl.value = ''
  }

  dialogVisible.value = true
}

// 封面上传前校验
const beforeCoverUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB')
    return false
  }
  return true
}

// 处理封面选择（不立即上传）
const handleCoverSelect = async (options: UploadRequestOptions) => {
  const file = options.file as File

  // 保存文件对象
  selectedCoverFile.value = file

  // 生成本地预览 URL
  const reader = new FileReader()
  reader.onload = (e) => {
    coverPreviewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  ElMessage.success('封面已选择，点击确定后将上传')
}

// 查看详情
const viewDetail = (location: Location) => {
  currentLocation.value = location
  detailDialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      let coverFileID = form.value.coverImage

      // 如果有新选择的封面，先上传
      if (selectedCoverFile.value) {
        ElMessage.info('正在上传封面...')

        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const ext = selectedCoverFile.value.name.split('.').pop()
        const cloudPath = `locations/${timestamp}_${randomStr}.${ext}`

        const result = await uploadFileViaFunction(selectedCoverFile.value, cloudPath)
        coverFileID = result.fileID
      }

      const functionName = isEdit.value ? 'updateLocation' : 'createLocation'
      const params: any = {
        adminId: adminInfo.value?.id,
        name: form.value.name,
        description: form.value.description,
        type: form.value.type,
        category: form.value.category,
        address: form.value.address,
        latitude: form.value.latitude,
        longitude: form.value.longitude,
        coverImage: coverFileID,
        tags: form.value.tags,
        openTime: form.value.openTime,
        phone: form.value.phone,
        sortOrder: form.value.sortOrder,
        isFeatured: form.value.isFeatured,
        featuredOrder: form.value.featuredOrder
      }

      if (isEdit.value) {
        params.locationId = form.value._id
        params.status = form.value.status
      }

      const response = await callFunction(functionName, params)

      if (response.success) {
        ElMessage.success(response.message)
        dialogVisible.value = false
        loadLocations()
      } else {
        ElMessage.error(response.message)
      }
    } catch (error) {
      console.error('提交失败:', error)
      ElMessage.error('提交失败')
    } finally {
      submitting.value = false
    }
  })
}

// 删除地点
const handleDelete = async (location: Location) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除地点"${location.name}"吗？删除后不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await callFunction('deleteLocation', {
      adminId: adminInfo.value?.id,
      locationId: location._id
    })

    if (response.success) {
      ElMessage.success(response.message)
      loadLocations()
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
const handleSortChange = async (location: Location) => {
  try {
    const response = await callFunction('updateLocation', {
      adminId: adminInfo.value?.id,
      locationId: location._id,
      sortOrder: location.sortOrder
    })

    if (response.success) {
      ElMessage.success('排序已更新')
    } else {
      ElMessage.error(response.message)
      loadLocations() // 恢复原值
    }
  } catch (error) {
    console.error('更新排序失败:', error)
    ElMessage.error('更新排序失败')
    loadLocations() // 恢复原值
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

// 获取类型标签
const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    scenic: '景点',
    hotel: '酒店',
    food: '美食',
    leisure: '休闲'
  }
  return map[type] || type
}

const getTypeTagType = (type: string) => {
  const map: Record<string, any> = {
    scenic: 'success',
    hotel: 'warning',
    food: 'danger',
    leisure: 'primary'
  }
  return map[type] || 'info'
}

onMounted(() => {
  loadLocations()
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

.cover-uploader {
  width: 150px;
  height: 150px;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s;
}

.cover-uploader:hover {
  border-color: #409eff;
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.upload-text {
  font-size: 14px;
}

.upload-tip {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
</style>
