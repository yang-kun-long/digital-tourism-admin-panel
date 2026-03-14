<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>官方模板管理</span>
          <div>
            <el-button type="primary" @click="$router.push('/official-content/templates/create')">
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
        <el-select v-model="filters.category" placeholder="模板分类" clearable style="width: 150px">
          <el-option label="景区主题" value="景区主题" />
          <el-option label="风格分类" value="风格分类" />
          <el-option label="场景打卡" value="场景打卡" />
        </el-select>

        <el-select v-model="filters.status" placeholder="状态" style="width: 150px; margin-left: 10px">
          <el-option label="上架" value="active" />
          <el-option label="下架" value="inactive" />
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
        <el-table-column label="封面" width="120">
          <template #default="{ row }">
            <el-image
              :src="row.coverImage"
              fit="cover"
              style="width: 80px; height: 106px; border-radius: 4px"
              :preview-teleported="true"
              :preview-src-list="[row.coverImage]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" min-width="150" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags?.slice(0, 3)" :key="tag" size="small" style="margin-right: 5px">
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="数据统计" width="200">
          <template #default="{ row }">
            <div style="font-size: 12px; line-height: 1.8">
              <div>浏览: {{ row.viewCount || 0 }}</div>
              <div>点赞: {{ row.likeCount || 0 }}</div>
              <div>收藏: {{ row.favoriteCount || 0 }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleEdit(row)">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { db, batchProcessImageUrls } from '@/utils/cloudbase'

interface Template {
  _id: string
  name: string
  category: string
  cover: string
  coverImage?: string
  tags: string[]
  sort: number
  status: string
  viewCount: number
  likeCount: number
  favoriteCount: number
  photoSetCount: number
  createTime: Date
  creatorId: string
  creatorName: string
}

const router = useRouter()
const templateList = ref<Template[]>([])
const processedTemplateList = ref<Template[]>([])
const loading = ref(false)

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

// 监听模板列表变化，处理图片 URL
watch(templateList, async (newList) => {
  if (!newList || newList.length === 0) {
    processedTemplateList.value = []
    return
  }

  // 收集所有封面图片 URL
  const coverUrls = newList.map(t => t.cover).filter(Boolean)

  // 批量处理 URL
  const processedUrls = await batchProcessImageUrls(coverUrls)

  // 构建处理后的模板列表
  processedTemplateList.value = newList.map((template, index) => ({
    ...template,
    coverImage: processedUrls[index] || template.cover
  }))
}, { immediate: true })

// 加载模板列表
const loadTemplates = async () => {
  loading.value = true
  try {
    const _ = db.command

    // 构建查询条件
    let query: any = {}

    if (filters.value.category) {
      query.category = filters.value.category
    }

    if (filters.value.status) {
      query.status = filters.value.status
    }

    if (filters.value.keyword) {
      query.name = db.RegExp({
        regexp: filters.value.keyword,
        options: 'i'
      })
    }

    // 查询总数
    const countResult = await db.collection('templates')
      .where(query)
      .count()

    pagination.value.total = countResult.total

    // 查询数据
    const result = await db.collection('templates')
      .where(query)
      .orderBy('sort', 'asc')
      .orderBy('createTime', 'desc')
      .skip((pagination.value.page - 1) * pagination.value.pageSize)
      .limit(pagination.value.pageSize)
      .get()

    templateList.value = result.data as Template[]
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

// 编辑模板
const handleEdit = (template: Template) => {
  router.push(`/official-content/templates/edit/${template._id}`)
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

    await db.collection('templates')
      .doc(template._id)
      .remove()

    ElMessage.success('删除成功')
    loadTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 格式化日期
const formatDate = (date: Date | string) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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
