<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑' : '创建' }}官方模板</span>
          <el-button @click="goBack">返回</el-button>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" style="max-width: 800px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>

        <el-form-item label="模板分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="景区主题" value="景区主题" />
            <el-option label="风格分类" value="风格分类" />
            <el-option label="场景打卡" value="场景打卡" />
          </el-select>
        </el-form-item>

        <el-form-item label="封面图片" prop="cover">
          <el-upload
            class="cover-uploader"
            :show-file-list="false"
            :before-upload="beforeCoverUpload"
            :http-request="handleCoverUpload"
            accept="image/*"
          >
            <el-image
              v-if="form.cover"
              :src="coverPreviewUrl"
              fit="cover"
              class="cover-image"
            />
            <div v-else class="upload-placeholder">
              <el-icon class="upload-icon"><Plus /></el-icon>
              <div class="upload-text">上传封面</div>
            </div>
          </el-upload>
          <div class="upload-tip">建议尺寸: 750x1000px，支持 JPG、PNG 格式，大小不超过 10MB</div>
        </el-form-item>

        <el-form-item label="模板标签">
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

        <el-form-item label="排序权重">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
          <span style="margin-left: 10px; color: #909399; font-size: 12px">数值越小越靠前</span>
        </el-form-item>

        <el-form-item label="状态" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio value="active">上架</el-radio>
            <el-radio value="inactive">下架</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存' : '创建' }}
          </el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules, type UploadRequestOptions } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { uploadFileViaFunction, processImageUrl, db } from '@/utils/cloudbase'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)

const formRef = ref<FormInstance>()
const submitting = ref(false)
const uploading = ref(false)
const selectedFile = ref<File | null>(null)

const form = ref({
  _id: '',
  name: '',
  category: '',
  cover: '',
  tags: [] as string[],
  sort: 0,
  status: 'active',
  viewCount: 0,
  likeCount: 0,
  favoriteCount: 0,
  photoSetCount: 0
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择模板分类', trigger: 'change' }],
  cover: [{ required: true, message: '请上传封面图片', trigger: 'change' }]
}

const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref()

const coverPreviewUrl = ref('')

const adminInfo = computed(() => {
  const saved = localStorage.getItem('adminInfo')
  return saved ? JSON.parse(saved) : null
})

// 加载模板数据
const loadTemplate = async () => {
  if (!isEdit.value) return

  try {
    const result = await db.collection('templates')
      .doc(route.params.id as string)
      .get()

    if (result.data && result.data.length > 0) {
      const template = result.data[0]
      form.value = {
        _id: template._id,
        name: template.name,
        category: template.category,
        cover: template.cover,
        tags: template.tags || [],
        sort: template.sort || 0,
        status: template.status || 'active',
        viewCount: template.viewCount || 0,
        likeCount: template.likeCount || 0,
        favoriteCount: template.favoriteCount || 0,
        photoSetCount: template.photoSetCount || 0
      }

      // 加载封面预览
      if (form.value.cover) {
        coverPreviewUrl.value = await processImageUrl(form.value.cover)
      }
    } else {
      ElMessage.error('模板不存在')
      goBack()
    }
  } catch (error) {
    console.error('加载模板失败:', error)
    ElMessage.error('加载失败')
  }
}

// 上传前校验
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
const handleCoverUpload = async (options: UploadRequestOptions) => {
  const file = options.file as File

  // 保存文件对象
  selectedFile.value = file

  // 生成本地预览 URL
  const reader = new FileReader()
  reader.onload = (e) => {
    coverPreviewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  ElMessage.success('图片已选择，点击确定后将上传')
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

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    if (!adminInfo.value) {
      ElMessage.error('请先登录')
      return
    }

    // 检查是否需要上传新图片
    if (selectedFile.value && !form.value.cover) {
      ElMessage.error('请等待图片上传完成')
      return
    }

    submitting.value = true
    try {
      let coverFileID = form.value.cover

      // 如果有新选择的图片，先上传
      if (selectedFile.value) {
        uploading.value = true
        ElMessage.info('正在上传图片...')

        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const ext = selectedFile.value.name.split('.').pop()
        const cloudPath = `templates/${timestamp}_${randomStr}.${ext}`

        const result = await uploadFileViaFunction(selectedFile.value, cloudPath)
        coverFileID = result.fileID

        uploading.value = false
      }

      const data = {
        name: form.value.name,
        category: form.value.category,
        cover: coverFileID,
        tags: form.value.tags,
        sort: form.value.sort,
        status: form.value.status,
        updateTime: new Date()
      }

      if (isEdit.value) {
        // 更新模板
        await db.collection('templates')
          .doc(form.value._id)
          .update({
            data
          })
        ElMessage.success('更新成功')
      } else {
        // 创建模板
        await db.collection('templates').add({
          data: {
            ...data,
            creatorId: adminInfo.value.id,
            creatorName: adminInfo.value.username,
            viewCount: 0,
            likeCount: 0,
            favoriteCount: 0,
            photoSetCount: 0,
            createTime: new Date()
          }
        })
        ElMessage.success('创建成功')
      }

      goBack()
    } catch (error: any) {
      console.error('提交失败:', error)
      ElMessage.error(error?.message || '提交失败')
    } finally {
      submitting.value = false
      uploading.value = false
    }
  })
}

// 返回列表
const goBack = () => {
  router.push('/official-content/templates')
}

onMounted(() => {
  loadTemplate()
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

.cover-uploader {
  width: 200px;
  height: 266px;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s;
}

.cover-uploader:hover {
  border-color: #409eff;
}

.cover-image {
  width: 100%;
  height: 100%;
  display: block;
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
