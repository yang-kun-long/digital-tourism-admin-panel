# 后台管理系统重构方案

## 一、重构目标

### 移除功能
- ❌ 模板审核（改为接口自动审核）
- ❌ 照片集审核（改为接口自动审核）

### 新增功能
- ✅ 举报处理系统
- ✅ 官方照片集上传
- ✅ 官方模板上传
- ✅ 地点管理
- ✅ 产品管理
- ✅ 意见反馈处理

### 架构升级
- ✅ 引入 Vue Router 实现真正的路由系统
- ✅ 实现基于角色的访问控制（RBAC）
- ✅ 模块化的权限管理
- ✅ 侧边栏导航 + 面包屑导航

---

## 二、角色权限设计

### 2.1 角色定义

| 角色代码 | 角色名称 | 权限范围 |
|---------|---------|---------|
| `super_admin` | 超级管理员 | 所有功能 |
| `content_admin` | 内容管理员 | 官方内容上传、地点/产品管理 |
| `support_admin` | 客服管理员 | 举报处理、意见反馈处理 |

### 2.2 权限矩阵

| 功能模块 | super_admin | content_admin | support_admin |
|---------|-------------|---------------|---------------|
| 仪表盘 | ✅ | ✅ | ✅ |
| 举报处理 | ✅ | ❌ | ✅ |
| 意见反馈处理 | ✅ | ❌ | ✅ |
| 官方模板上传 | ✅ | ✅ | ❌ |
| 官方照片集上传 | ✅ | ✅ | ❌ |
| 地点管理 | ✅ | ✅ | ❌ |
| 产品管理 | ✅ | ✅ | ❌ |
| 管理员管理 | ✅ | ❌ | ❌ |
| 系统设置 | ✅ | ❌ | ❌ |
| 个人信息 | ✅ | ✅ | ✅ |

---

## 三、路由架构设计

### 3.1 路由结构

```
/admin/
├─ /login                              # 登录页
├─ /                                   # 重定向到 /dashboard
├─ /dashboard                          # 仪表盘（首页）
│
├─ /reports                            # 举报处理（客服管理员）
│  ├─ /reports/templates               # 模板举报列表
│  ├─ /reports/photosets               # 照片集举报列表
│  └─ /reports/users                   # 用户举报列表
│
├─ /feedback                           # 意见反馈处理（客服管理员）
│  ├─ /feedback/list                   # 反馈列表
│  └─ /feedback/detail/:id             # 反馈详情
│
├─ /official-content                   # 官方内容管理（内容管理员）
│  ├─ /official-content/templates      # 官方模板
│  │  ├─ /list                         # 模板列表
│  │  ├─ /create                       # 创建模板
│  │  └─ /edit/:id                     # 编辑模板
│  ├─ /official-content/photosets      # 官方照片集
│  │  ├─ /list                         # 照片集列表
│  │  ├─ /create                       # 创建照片集
│  │  └─ /edit/:id                     # 编辑照片集
│  ├─ /official-content/locations      # 地点管理
│  │  ├─ /list                         # 地点列表
│  │  ├─ /create                       # 创建地点
│  │  └─ /edit/:id                     # 编辑地点
│  └─ /official-content/products       # 产品管理
│     ├─ /list                          # 产品列表
│     ├─ /create                        # 创建产品
│     └─ /edit/:id                      # 编辑产品
│
├─ /system                             # 系统管理（超级管理员）
│  ├─ /system/admins                   # 管理员管理
│  └─ /system/settings                 # 系统设置
│
└─ /profile                            # 个人信息（所有角色）
   ├─ /profile/info                    # 基本信息
   └─ /profile/password                # 修改密码
```

### 3.2 路由守卫

```typescript
// router/index.ts
router.beforeEach((to, from, next) => {
  const adminInfo = getAdminInfo()

  // 1. 未登录，跳转到登录页
  if (!adminInfo && to.path !== '/login') {
    return next('/login')
  }

  // 2. 已登录访问登录页，跳转到首页
  if (adminInfo && to.path === '/login') {
    return next('/dashboard')
  }

  // 3. 权限检查
  const requiredRole = to.meta.requiredRole
  if (requiredRole && !hasPermission(adminInfo.role, requiredRole)) {
    ElMessage.error('权限不足')
    return next('/dashboard')
  }

  next()
})
```

---

## 四、UI 布局设计

### 4.1 整体布局

```
┌─────────────────────────────────────────────────────┐
│  顶部导航栏 (Header)                                │
│  Logo | 系统名称              用户信息 | 退出登录   │
├──────────┬──────────────────────────────────────────┤
│          │  面包屑导航 (Breadcrumb)                 │
│          │  首页 > 举报处理 > 模板举报              │
│  侧边栏  ├──────────────────────────────────────────┤
│  导航    │                                          │
│  (Aside) │                                          │
│          │         主内容区域 (Main)                │
│  - 仪表盘│                                          │
│  - 举报处理│                                        │
│  - 反馈处理│                                        │
│  - 官方内容│                                        │
│  - 系统管理│                                        │
│  - 个人信息│                                        │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### 4.2 侧边栏菜单配置

```typescript
// config/menu.ts
export const menuConfig = [
  {
    path: '/dashboard',
    name: '仪表盘',
    icon: 'DataAnalysis',
    roles: ['super_admin', 'content_admin', 'support_admin']
  },
  {
    path: '/reports',
    name: '举报处理',
    icon: 'Warning',
    roles: ['super_admin', 'support_admin'],
    children: [
      { path: '/reports/templates', name: '模板举报' },
      { path: '/reports/photosets', name: '照片集举报' },
      { path: '/reports/users', name: '用户举报' }
    ]
  },
  {
    path: '/feedback',
    name: '意见反馈',
    icon: 'ChatDotRound',
    roles: ['super_admin', 'support_admin']
  },
  {
    path: '/official-content',
    name: '官方内容',
    icon: 'Files',
    roles: ['super_admin', 'content_admin'],
    children: [
      { path: '/official-content/templates', name: '官方模板' },
      { path: '/official-content/photosets', name: '官方照片集' },
      { path: '/official-content/locations', name: '地点管理' },
      { path: '/official-content/products', name: '产品管理' }
    ]
  },
  {
    path: '/system',
    name: '系统管理',
    icon: 'Setting',
    roles: ['super_admin'],
    children: [
      { path: '/system/admins', name: '管理员管理' },
      { path: '/system/settings', name: '系统设置' }
    ]
  },
  {
    path: '/profile',
    name: '个人信息',
    icon: 'User',
    roles: ['super_admin', 'content_admin', 'support_admin']
  }
]
```

---

## 五、数据库设计

### 5.1 新增集合

#### reports（举报记录）

```typescript
{
  _id: string
  type: 'template' | 'photoset' | 'user'  // 举报类型
  targetId: string                         // 被举报对象ID
  targetInfo: {                            // 被举报对象信息快照
    name: string
    cover?: string
    creator?: string
  }
  reporterId: string                       // 举报人ID
  reporterInfo: {
    nickname: string
    avatar: string
  }
  reason: string                           // 举报原因
  description: string                      // 详细描述
  status: 'pending' | 'processing' | 'resolved' | 'rejected'
  handlerId?: string                       // 处理人ID
  handlerName?: string                     // 处理人姓名
  handleResult?: string                    // 处理结果
  handleTime?: number                      // 处理时间
  createTime: number
  updateTime: number
}
```

#### feedback（意见反馈）

```typescript
{
  _id: string
  userId: string                           // 用户ID
  userInfo: {
    nickname: string
    avatar: string
  }
  type: 'bug' | 'feature' | 'complaint' | 'other'  // 反馈类型
  title: string                            // 标题
  content: string                          // 内容
  images?: string[]                        // 截图
  contact?: string                         // 联系方式
  status: 'pending' | 'processing' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'      // 优先级
  handlerId?: string                       // 处理人ID
  handlerName?: string                     // 处理人姓名
  reply?: string                           // 回复内容
  handleTime?: number                      // 处理时间
  createTime: number
  updateTime: number
}
```

#### locations（地点）

```typescript
{
  _id: string
  name: string                             // 地点名称
  category: 'scenic' | 'hotel' | 'restaurant' | 'entertainment'
  description: string                      // 描述
  address: string                          // 地址
  location: {                              // 地理位置
    latitude: number
    longitude: number
  }
  images: string[]                         // 图片
  cover: string                            // 封面图
  tags: string[]                           // 标签
  rating: number                           // 评分
  price?: string                           // 价格区间
  openTime?: string                        // 营业时间
  phone?: string                           // 联系电话
  facilities?: string[]                    // 设施
  isOfficial: true                         // 官方标记
  status: 'active' | 'inactive'
  viewCount: number
  favoriteCount: number
  creatorId: string                        // 创建管理员ID
  creatorName: string
  createTime: number
  updateTime: number
}
```

#### products（产品）

```typescript
{
  _id: string
  name: string                             // 产品名称
  category: string                         // 分类
  description: string                      // 描述
  images: string[]                         // 图片
  cover: string                            // 封面图
  price: number                            // 价格（分）
  originalPrice?: number                   // 原价
  stock: number                            // 库存
  sales: number                            // 销量
  tags: string[]                           // 标签
  specifications?: {                       // 规格
    name: string
    value: string
  }[]
  isOfficial: true                         // 官方标记
  status: 'active' | 'inactive' | 'soldout'
  creatorId: string                        // 创建管理员ID
  creatorName: string
  createTime: number
  updateTime: number
}
```

### 5.2 修改现有集合

#### admins（管理员）- 新增角色字段

```typescript
{
  _id: string
  username: string
  password: string                         // MD5 哈希
  role: 'super_admin' | 'content_admin' | 'support_admin'  // 新增角色
  realName?: string                        // 真实姓名
  email?: string                           // 邮箱
  phone?: string                           // 手机号
  status: 'active' | 'disabled'
  lastLoginAt?: number
  lastLoginIp?: string
  createdAt: number
  updatedAt: number
}
```

---

## 六、云函数设计

### 6.1 举报处理相关

```typescript
// getReports - 获取举报列表
{
  adminId: string
  type?: 'template' | 'photoset' | 'user'
  status?: 'pending' | 'processing' | 'resolved' | 'rejected'
  page: number
  pageSize: number
}

// handleReport - 处理举报
{
  adminId: string
  reportId: string
  action: 'accept' | 'reject'
  result: string
}

// deleteReportedContent - 删除被举报内容
{
  adminId: string
  reportId: string
  type: 'template' | 'photoset' | 'user'
  targetId: string
}
```

### 6.2 意见反馈相关

```typescript
// getFeedback - 获取反馈列表
{
  adminId: string
  type?: 'bug' | 'feature' | 'complaint' | 'other'
  status?: 'pending' | 'processing' | 'resolved' | 'closed'
  page: number
  pageSize: number
}

// handleFeedback - 处理反馈
{
  adminId: string
  feedbackId: string
  status: 'processing' | 'resolved' | 'closed'
  reply: string
}
```

### 6.3 官方内容管理相关

```typescript
// createOfficialTemplate - 创建官方模板
{
  adminId: string
  name: string
  description: string
  category: string
  tags: string[]
  cover: string
}

// createOfficialPhotoSet - 创建官方照片集
{
  adminId: string
  templateId: string
  title: string
  description: string
  photos: string[]
  coverPhoto: string
}

// manageLocation - 地点管理
{
  adminId: string
  action: 'create' | 'update' | 'delete'
  locationId?: string
  data?: LocationData
}

// manageProduct - 产品管理
{
  adminId: string
  action: 'create' | 'update' | 'delete'
  productId?: string
  data?: ProductData
}
```

---

## 七、实施步骤

### Phase 1: 基础架构升级（1-2天）

1. ✅ 安装 Vue Router
   ```bash
   npm install vue-router@4
   ```

2. ✅ 创建路由配置文件
   - `src/router/index.ts`
   - `src/router/routes.ts`
   - `src/router/guards.ts`

3. ✅ 创建布局组件
   - `src/layouts/MainLayout.vue` - 主布局（侧边栏+内容区）
   - `src/layouts/LoginLayout.vue` - 登录布局

4. ✅ 创建通用组件
   - `src/components/Sidebar.vue` - 侧边栏导航
   - `src/components/Header.vue` - 顶部导航栏
   - `src/components/Breadcrumb.vue` - 面包屑导航

### Phase 2: 权限系统重构（1天）

1. ✅ 更新权限配置
   - `src/config/roles.ts` - 角色定义
   - `src/config/permissions.ts` - 权限矩阵
   - `src/utils/permission.ts` - 权限检查工具

2. ✅ 实现路由守卫
   - 登录状态检查
   - 角色权限验证
   - 动态菜单生成

### Phase 3: 举报处理模块（2-3天）

1. ✅ 创建页面组件
   - `src/views/reports/TemplateReports.vue`
   - `src/views/reports/PhotoSetReports.vue`
   - `src/views/reports/UserReports.vue`

2. ✅ 开发云函数
   - `getReports`
   - `handleReport`
   - `deleteReportedContent`

3. ✅ 数据库设计
   - 创建 `reports` 集合
   - 设置索引和权限

### Phase 4: 意见反馈模块（1-2天）

1. ✅ 创建页面组件
   - `src/views/feedback/FeedbackList.vue`
   - `src/views/feedback/FeedbackDetail.vue`

2. ✅ 开发云函数
   - `getFeedback`
   - `handleFeedback`

3. ✅ 数据库设计
   - 创建 `feedback` 集合

### Phase 5: 官方内容管理模块（3-4天）

1. ✅ 官方模板管理
   - `src/views/official-content/templates/TemplateList.vue`
   - `src/views/official-content/templates/TemplateForm.vue`
   - 云函数：`createOfficialTemplate`, `updateOfficialTemplate`

2. ✅ 官方照片集管理
   - `src/views/official-content/photosets/PhotoSetList.vue`
   - `src/views/official-content/photosets/PhotoSetForm.vue`
   - 云函数：`createOfficialPhotoSet`, `updateOfficialPhotoSet`

3. ✅ 地点管理
   - `src/views/official-content/locations/LocationList.vue`
   - `src/views/official-content/locations/LocationForm.vue`
   - 云函数：`manageLocation`
   - 数据库：创建 `locations` 集合

4. ✅ 产品管理
   - `src/views/official-content/products/ProductList.vue`
   - `src/views/official-content/products/ProductForm.vue`
   - 云函数：`manageProduct`
   - 数据库：创建 `products` 集合

### Phase 6: 系统管理优化（1天）

1. ✅ 管理员管理升级
   - 支持新的角色类型
   - 角色权限说明

2. ✅ 仪表盘开发
   - `src/views/Dashboard.vue`
   - 数据统计展示

### Phase 7: 移除旧功能（0.5天）

1. ✅ 删除审核相关代码
   - 移除 `PhotoSetManagement.vue`
   - 从 `App.vue` 移除模板审批逻辑
   - 删除相关云函数调用

2. ✅ 更新文档
   - 更新 README.md
   - 更新 PERMISSIONS.md

### Phase 8: 测试与部署（1-2天）

1. ✅ 功能测试
   - 各角色权限测试
   - 路由跳转测试
   - 数据操作测试

2. ✅ 部署上线
   - 构建生产版本
   - 部署到 CloudBase
   - 数据库迁移

---

## 八、技术要点

### 8.1 Vue Router 集成

```typescript
// main.ts
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import routes from './router/routes'

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
```

### 8.2 权限指令

```typescript
// directives/permission.ts
export const permission = {
  mounted(el: HTMLElement, binding: any) {
    const { value } = binding
    const adminInfo = getAdminInfo()

    if (!hasPermission(adminInfo.role, value)) {
      el.style.display = 'none'
    }
  }
}

// 使用
<el-button v-permission="['super_admin']">删除</el-button>
```

### 8.3 动态菜单生成

```typescript
// composables/useMenu.ts
export function useMenu() {
  const adminInfo = getAdminInfo()

  const visibleMenus = computed(() => {
    return menuConfig.filter(menu =>
      menu.roles.includes(adminInfo.role)
    )
  })

  return { visibleMenus }
}
```

---

## 九、预期效果

### 9.1 用户体验提升

- ✅ 清晰的模块划分，功能一目了然
- ✅ 侧边栏导航，快速切换功能
- ✅ 面包屑导航，明确当前位置
- ✅ 权限控制，只显示可访问的功能

### 9.2 开发维护优势

- ✅ 模块化设计，易于扩展新功能
- ✅ 路由化管理，支持深度链接
- ✅ 权限集中管理，易于调整
- ✅ 代码结构清晰，降低维护成本

### 9.3 安全性增强

- ✅ 前端路由守卫 + 后端权限验证
- ✅ 细粒度的角色权限控制
- ✅ 操作日志记录
- ✅ 敏感操作二次确认

---

## 十、后续优化方向

1. **操作日志系统**
   - 记录所有管理员操作
   - 支持日志查询和审计

2. **数据统计分析**
   - 举报处理效率统计
   - 反馈处理时效分析
   - 内容发布数据统计

3. **通知系统**
   - 新举报实时通知
   - 紧急反馈提醒
   - 系统公告发布

4. **批量操作**
   - 批量处理举报
   - 批量上传内容
   - 批量导入地点/产品

5. **移动端适配**
   - 响应式布局优化
   - 移动端专用界面

---

## 十一、风险评估

| 风险项 | 影响 | 应对措施 |
|-------|------|---------|
| 数据迁移 | 中 | 编写迁移脚本，先在测试环境验证 |
| 权限混乱 | 高 | 详细的权限测试，逐步上线 |
| 用户习惯 | 低 | 提供操作指南，保持界面直观 |
| 性能问题 | 中 | 分页加载，图片懒加载，缓存优化 |

---

## 十二、总结

本次重构将后台管理系统从**单一审核工具**升级为**多角色、多功能的综合管理平台**，通过引入 Vue Router 和 RBAC 权限系统，实现了：

1. **功能模块化** - 清晰的功能划分，易于维护和扩展
2. **权限精细化** - 不同角色只能访问授权的功能
3. **用户体验优化** - 侧边栏导航、面包屑、深度链接支持
4. **架构现代化** - 符合现代 Web 应用的最佳实践

预计总开发时间：**10-15 个工作日**
