<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>商品管理</span>
          <div>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              创建商品
            </el-button>
            <el-button @click="loadGoods">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filter-bar">
        <el-select v-model="filters.category" placeholder="商品分类" clearable style="width: 150px">
          <el-option label="土特产" value="土特产" />
          <el-option label="文创产品" value="文创产品" />
          <el-option label="纪念品" value="纪念品" />
          <el-option label="其他" value="其他" />
        </el-select>

        <el-select v-model="filters.status" placeholder="状态" style="width: 150px; margin-left: 10px">
          <el-option label="上架" value="active" />
          <el-option label="下架" value="inactive" />
        </el-select>

        <el-input
          v-model="filters.keyword"
          placeholder="搜索商品名称"
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
      <el-table :data="processedGoodsList" v-loading="loading" stripe style="margin-top: 20px">
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
        <el-table-column prop="name" label="商品名称" min-width="150" />
        <el-table-column prop="category" label="分类" width="120" />
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
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags?.slice(0, 3)" :key="tag" size="small" style="margin-right: 5px">
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="推荐" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isRecommend" type="warning" size="small">推荐</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '上架' : '下架' }}
            </el-tag>
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
      :title="isEdit ? '编辑商品' : '创建商品'"
      width="800px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="商品名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入商品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="商品分类" prop="category">
              <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
                <el-option label="土特产" value="土特产" />
                <el-option label="文创产品" value="文创产品" />
                <el-option label="纪念品" value="纪念品" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入商品描述"
          />
        </el-form-item>

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

        <el-form-item label="商品图片">
          <div class="image-list">
            <div v-for="(img, index) in imagePreviewList" :key="index" class="image-item">
              <el-image
                :src="img.url"
                fit="cover"
                style="width: 100px; height: 100px; border-radius: 4px"
                :preview-teleported="true" :preview-src-list="imagePreviewList.map(i => i.url)"
              />
              <el-button
                size="small"
                type="danger"
                circle
                @click="removeImage(index)"
                style="position: absolute; top: -8px; right: -8px"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
            <el-upload
              class="image-add"
              :show-file-list="false"
              :before-upload="beforeImageUpload"
              :http-request="handleImageSelect"
              accept="image/*"
              multiple
            >
              <el-icon><Plus /></el-icon>
              <div>添加图片</div>
            </el-upload>
          </div>
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

        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            数值越小越靠前，为0时采用热度算法自动排序
          </div>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="是否推荐">
              <el-switch v-model="form.isRecommend" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="推荐排序" v-if="form.isRecommend">
              <el-input-number v-model="form.recommendOrder" :min="0" :max="9999" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="状态" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio value="active">上架</el-radio>
            <el-radio value="inactive">下架</el-radio>
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
    <el-dialog v-model="detailDialogVisible" title="商品详情" width="800px">
      <el-descriptions :column="2" border v-if="currentGoods">
        <el-descriptions-item label="商品名称" :span="2">
          {{ currentGoods.name }}
        </el-descriptions-item>
        <el-descriptions-item label="分类">
          {{ currentGoods.category }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentGoods.status === 'active' ? 'success' : 'info'">
            {{ currentGoods.status === 'active' ? '上架' : '下架' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">
          {{ currentGoods.description }}
        </el-descriptions-item>
        <el-descriptions-item label="标签" :span="2">
          <el-tag v-for="tag in currentGoods.tags" :key="tag" size="small" style="margin-right: 5px">
            {{ tag }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="排序">
          {{ currentGoods.sortOrder || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="是否推荐">
          <el-tag v-if="currentGoods.isRecommend" type="warning">推荐</el-tag>
          <span v-else>否</span>
        </el-descriptions-item>
        <el-descriptions-item label="推荐排序" v-if="currentGoods.isRecommend">
          {{ currentGoods.recommendOrder }}
        </el-descriptions-item>
        <el-descriptions-item label="商品图片" :span="2">
          <div class="detail-image-list">
            <el-image
              v-for="(img, index) in currentGoods.images"
              :key="index"
              :src="img"
              fit="cover"
              style="width: 120px; height: 120px; margin-right: 10px; margin-bottom: 10px; border-radius: 4px"
              :preview-teleported="true" :preview-src-list="currentGoods.images"
            />
          </div>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadRequestOptions } from 'element-plus'
import { Refresh, Search, Plus, Close, QuestionFilled } from '@element-plus/icons-vue'
import { callFunction, batchProcessImageUrls, processImageUrlSync, uploadFileViaFunction } from '@/utils/cloudbase'

interface Goods {
  _id: string
  name: string
  description: string
  category: string
  coverImage: string
  images: string[]
  tags: string[]
  sortOrder: number
  isRecommend: boolean
  recommendOrder: number
  status: string
  shareCount: number
  copyCount: number
}

const goodsList = ref<Goods[]>([])
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
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const currentGoods = ref<Goods | null>(null)

const form = ref({
  _id: '',
  name: '',
  description: '',
  category: '',
  coverImage: '',
  images: [] as string[],
  tags: [] as string[],
  sortOrder: 0,
  isRecommend: false,
  recommendOrder: 0,
  status: 'active'
})

const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref()

const imageInputVisible = ref(false)
const imageInputValue = ref('')

// 上传相关
const selectedCoverFile = ref<File | null>(null)
const coverPreviewUrl = ref('')
const imagePreviewList = ref<Array<{ file: File | null; url: string; isExisting: boolean }>>([])

const validateCoverImage = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value || selectedCoverFile.value) {
    callback()
    return
  }
  callback(new Error('请上传封面图片'))
}

const rules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入商品描述', trigger: 'blur' }],
  category: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  coverImage: [{ validator: validateCoverImage, trigger: 'change' }]
}

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 处理图片 URL 列表
const processedGoodsList = ref<Goods[]>([])

// 监听商品列表变化，处理图片 URL
watch(goodsList, async (newList) => {
  if (!newList || newList.length === 0) {
    processedGoodsList.value = []
    return
  }

  // 收集所有需要处理的图片 URL
  const allUrls: string[] = []
  const urlIndexMap: Array<{ goodsIndex: number; type: 'cover' | 'image'; imageIndex?: number }> = []

  newList.forEach((goods, goodsIndex) => {
    // 封面图
    if (goods.coverImage) {
      urlIndexMap.push({ goodsIndex, type: 'cover' })
      allUrls.push(goods.coverImage)
    }

    // 商品图片
    if (goods.images && Array.isArray(goods.images)) {
      goods.images.forEach((img, imageIndex) => {
        if (img) {
          urlIndexMap.push({ goodsIndex, type: 'image', imageIndex })
          allUrls.push(img)
        }
      })
    }
  })

  // 批量处理所有 URL
  const processedUrls = await batchProcessImageUrls(allUrls)

  // 构建处理后的商品列表
  const processed = newList.map(goods => ({
    ...goods,
    coverImage: goods.coverImage || '',
    images: goods.images || []
  }))

  // 将处理后的 URL 填回对应位置
  processedUrls.forEach((url, index) => {
    const mapping = urlIndexMap[index]
    if (!mapping) return

    const goods = processed[mapping.goodsIndex]
    if (!goods) return

    if (mapping.type === 'cover') {
      goods.coverImage = url
    } else if (mapping.type === 'image' && mapping.imageIndex !== undefined) {
      goods.images[mapping.imageIndex] = url
    }
  })

  processedGoodsList.value = processed
}, { immediate: true })

// 加载商品列表
const loadGoods = async () => {
  loading.value = true
  try {
    const response = await callFunction('getGoods', {
      adminId: adminInfo.value?.id,
      category: filters.value.category || undefined,
      status: filters.value.status,
      keyword: filters.value.keyword || undefined,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    })

    if (response.success) {
      goodsList.value = response.data
      pagination.value.total = response.total
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('加载商品列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadGoods()
}

// 分页变化
const handleSizeChange = () => {
  pagination.value.page = 1
  loadGoods()
}

const handlePageChange = () => {
  loadGoods()
}

// 打开创建对话框
const openCreateDialog = () => {
  isEdit.value = false
  form.value = {
    _id: '',
    name: '',
    description: '',
    category: '',
    coverImage: '',
    images: [],
    tags: [],
    sortOrder: 0,
    isRecommend: false,
    recommendOrder: 0,
    status: 'active'
  }
  selectedCoverFile.value = null
  coverPreviewUrl.value = ''
  imagePreviewList.value = []
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = async (goods: Goods) => {
  isEdit.value = true
  form.value = {
    _id: goods._id,
    name: goods.name,
    description: goods.description,
    category: goods.category,
    coverImage: goods.coverImage,
    images: [...goods.images],
    tags: [...goods.tags],
    sortOrder: goods.sortOrder,
    isRecommend: goods.isRecommend,
    recommendOrder: goods.recommendOrder,
    status: goods.status
  }

  // 加载封面预览
  selectedCoverFile.value = null
  if (goods.coverImage) {
    coverPreviewUrl.value = await processImageUrlSync(goods.coverImage)
  } else {
    coverPreviewUrl.value = ''
  }

  // 加载商品图片预览列表
  imagePreviewList.value = goods.images.map(url => ({
    file: null,
    url: processImageUrlSync(url),
    isExisting: true
  }))

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
  formRef.value?.clearValidate('coverImage')

  // 生成本地预览 URL
  const reader = new FileReader()
  reader.onload = (e) => {
    coverPreviewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  ElMessage.success('封面已选择，点击确定后将上传')
}

// 商品图片上传前校验
const beforeImageUpload = (file: File) => {
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

// 处理商品图片选择（不立即上传）
const handleImageSelect = async (options: UploadRequestOptions) => {
  const file = options.file as File

  // 生成本地预览 URL
  const reader = new FileReader()
  reader.onload = (e) => {
    const url = e.target?.result as string
    imagePreviewList.value.push({
      file,
      url,
      isExisting: false
    })
  }
  reader.readAsDataURL(file)

  ElMessage.success('图片已选择，点击确定后将上传')
}

// 查看详情
const viewDetail = (goods: Goods) => {
  currentGoods.value = goods
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
        const cloudPath = `goods/cover/${timestamp}_${randomStr}.${ext}`

        const result = await uploadFileViaFunction(selectedCoverFile.value, cloudPath)
        coverFileID = result.fileID
      }

      // 上传新选择的商品图片
      const imageFileIDs: string[] = []
      const newImages = imagePreviewList.value.filter(i => !i.isExisting && i.file)

      if (newImages.length > 0) {
        ElMessage.info(`正在上传 ${newImages.length} 张图片...`)

        for (let i = 0; i < newImages.length; i++) {
          const img = newImages[i]
          if (img && img.file) {
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(2, 8)
            const ext = img.file.name.split('.').pop()
            const cloudPath = `goods/images/${timestamp}_${randomStr}.${ext}`

            const result = await uploadFileViaFunction(img.file, cloudPath)
            imageFileIDs.push(result.fileID)
          }
        }
      }

      // 合并已有图片和新上传的图片
      const existingImages = imagePreviewList.value
        .filter(i => i.isExisting)
        .map((_, index) => form.value.images[index])
        .filter(Boolean)

      const allImages = [...existingImages, ...imageFileIDs]

      const functionName = isEdit.value ? 'updateGoods' : 'createGoods'
      const params: any = {
        adminId: adminInfo.value?.id,
        name: form.value.name,
        description: form.value.description,
        category: form.value.category,
        coverImage: coverFileID,
        images: allImages,
        tags: form.value.tags,
        sortOrder: form.value.sortOrder,
        isRecommend: form.value.isRecommend,
        recommendOrder: form.value.recommendOrder
      }

      if (isEdit.value) {
        params.goodsId = form.value._id
        params.status = form.value.status
      }

      const response = await callFunction(functionName, params)

      if (response.success) {
        ElMessage.success(response.message)
        dialogVisible.value = false
        loadGoods()
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

// 删除商品
const handleDelete = async (goods: Goods) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品"${goods.name}"吗？删除后不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await callFunction('deleteGoods', {
      adminId: adminInfo.value?.id,
      goodsId: goods._id
    })

    if (response.success) {
      ElMessage.success(response.message)
      loadGoods()
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
const handleSortChange = async (goods: Goods) => {
  try {
    const response = await callFunction('updateGoods', {
      adminId: adminInfo.value?.id,
      goodsId: goods._id,
      sortOrder: goods.sortOrder
    })

    if (response.success) {
      ElMessage.success('排序已更新')
    } else {
      ElMessage.error(response.message)
      loadGoods() // 恢复原值
    }
  } catch (error) {
    console.error('更新排序失败:', error)
    ElMessage.error('更新排序失败')
    loadGoods() // 恢复原值
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

// 图片相关
const removeImage = (index: number) => {
  imagePreviewList.value.splice(index, 1)
  // 同时从 form.images 中删除对应的已有图片
  if (index < form.value.images.length) {
    form.value.images.splice(index, 1)
  }
}

onMounted(() => {
  loadGoods()
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
  gap: 10px;
}

.image-item {
  position: relative;
  width: 100px;
  height: 100px;
}

.image-add {
  width: 100px;
  height: 100px;
  border: 2px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #8c939d;
  transition: all 0.3s;
}

.image-add:hover {
  border-color: #409eff;
  color: #409eff;
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

.detail-image-list {
  display: flex;
  flex-wrap: wrap;
}
</style>
