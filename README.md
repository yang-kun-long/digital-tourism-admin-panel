# 数字文旅管理后台

这是数字文旅项目的管理后台，用于审批用户创建的模板。

## 项目架构

### 技术栈
- **前端框架**: Vue 3 + TypeScript
- **UI 组件库**: Element Plus
- **构建工具**: Vite
- **后端服务**: CloudBase (腾讯云开发)

### 部署信息

**生产环境访问地址**：
- https://cultural-tourism-7fb138kf77a2cb2-1400488372.tcloudbaseapp.com/admin/

**注意**：首次访问或更新后，CDN 可能需要几分钟缓存刷新时间。

### CloudBase 资源

**环境ID**: `cultural-tourism-7fb138kf77a2cb2`

**使用的集合**:
- `templates` - 创意模板集合
- `admins` - 管理员账户集合

**云函数**:
- `adminLogin` - 管理员登录验证
- `createAdmin` - 创建管理员账户（仅超级管理员可用）
- `manageTemplate` - 管理模板（审批、拒绝、删除）

**权限说明**:
- 管理后台使用数据库存储的管理员账户进行身份验证
- 超级管理员可以创建新的管理员账户
- 所有管理员都可以审批模板
- **重要**：模板的审批操作通过云函数 `manageTemplate` 进行，云函数内部验证管理员权限，确保安全性
- 数据库权限保持原有设置，保护用户数据不被直接修改

## 功能模块

### 管理员登录系统

**登录流程**:
1. 用户在登录页面输入用户名和密码
2. 前端调用 `adminLogin` 云函数进行验证
3. 云函数验证用户名和密码（MD5 哈希）
4. 验证成功后返回管理员信息
5. 前端保存登录状态到 localStorage
6. 跳转到模板审批页面

**默认账户**:
- 用户名：`admin`
- 密码：`admin`
- 角色：超级管理员

**安全特性**:
- 密码使用 MD5 哈希存储
- 账户状态检查（active/disabled）
- 登录状态持久化
- 自动登录恢复

### 模板审批管理

**主要功能**:
1. ✅ 查看待审核模板列表
2. ✅ 查看模板详情（封面、名称、描述、分类、标签、创建者等）
3. ✅ 审批通过（将状态改为 `active`）
4. ✅ 审批拒绝（将状态改为 `rejected`，并记录拒绝原因）
5. ✅ 删除模板
6. ✅ 刷新列表

**审批流程**:
```
用户创建模板 (status: pending)
    ↓
管理员审核
    ↓
通过 (status: active) / 拒绝 (status: rejected)
```

## 开发说明

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

访问: http://localhost:5173

### 构建生产版本

```bash
npm run build
```

构建产物位于 `dist/` 目录。

### 部署到 CloudBase

构建完成后，使用 CloudBase CLI 或 MCP 工具部署：

```bash
# 使用 MCP 工具部署
# 已部署到: /admin 路径
```

**生产环境地址**：https://cultural-tourism-7fb138kf77a2cb2-1400488372.tcloudbaseapp.com/admin/

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
admin-panel/
├── src/
│   ├── components/
│   │   └── Login.vue          # 登录页面组件
│   ├── App.vue                # 主应用组件（模板审批页面）
│   ├── main.ts                # 应用入口
│   ├── style.css              # 全局样式
│   └── utils/
│       └── cloudbase.ts       # CloudBase 配置和初始化
├── public/                    # 静态资源
├── index.html                 # HTML 模板
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript 配置
├── vite.config.ts             # Vite 配置
├── README.md                  # 项目文档
└── DEPLOYMENT.md              # 部署文档
```

## 云函数

### adminLogin - 管理员登录验证

**位置**: `digital-travel/cloudfunctions/adminLogin/`

**功能**:
- 验证用户名和密码
- 检查账户状态
- 更新最后登录时间
- 返回管理员信息

**部署状态**: ✅ 已部署（Active）

### manageTemplate - 管理模板

**位置**: `digital-travel/cloudfunctions/manageTemplate/`

**功能**:
- 审批通过模板（action: approve）
- 拒绝模板（action: reject）
- 删除模板（action: delete）
- 验证管理员权限
- 记录操作者和操作时间

**部署状态**: ✅ 已部署（Active）

**使用方法**:
```javascript
// 审批通过
const result = await app.callFunction({
  name: 'manageTemplate',
  data: {
    adminId: '管理员ID',
    action: 'approve',
    templateId: '模板ID'
  }
})

// 拒绝模板
const result = await app.callFunction({
  name: 'manageTemplate',
  data: {
    adminId: '管理员ID',
    action: 'reject',
    templateId: '模板ID',
    rejectReason: '拒绝原因'
  }
})

// 删除模板
const result = await app.callFunction({
  name: 'manageTemplate',
  data: {
    adminId: '管理员ID',
    action: 'delete',
    templateId: '模板ID'
  }
})
```

**安全特性**:
- 云函数内部验证管理员身份和状态
- 绕过客户端数据库权限限制
- 记录操作者信息（approvedBy/rejectedBy）
- 记录操作时间（approvedAt/rejectedAt）

## 核心代码说明

### CloudBase 配置 (`src/utils/cloudbase.ts`)

```typescript
import cloudbase from '@cloudbase/js-sdk'

const app = cloudbase.init({
  env: 'cultural-tourism-7fb138kf77a2cb2'
})

export const db = app.database()
export const getTempFileURL = app.getTempFileURL.bind(app)
```

### 主要功能实现

#### 1. 加载待审核模板

```typescript
const loadPendingTemplates = async () => {
  const res = await db.collection('templates')
    .where({ status: 'pending' })
    .orderBy('createTime', 'desc')
    .get()

  templates.value = res.data

  // 获取封面图片临时链接
  const fileList = templates.value.map(t => ({
    fileID: t.cover,
    maxAge: 3600
  }))
  const urlRes = await getTempFileURL({ fileList })
}
```

#### 2. 审批通过

```typescript
const approveTemplate = async (template: Template) => {
  await db.collection('templates').doc(template._id).update({
    status: 'active',
    updateTime: Date.now()
  })
}
```

#### 3. 审批拒绝

```typescript
const rejectTemplate = async (template: Template) => {
  await db.collection('templates').doc(template._id).update({
    status: 'rejected',
    rejectReason: reason,
    updateTime: Date.now()
  })
}
```

#### 4. 删除模板

```typescript
const deleteTemplate = async (template: Template) => {
  await db.collection('templates').doc(template._id).remove()
}
```

## 数据库字段说明

### templates 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 模板ID |
| name | string | 模板名称 |
| description | string | 模板描述 |
| category | string | 分类（景区主题/风格分类/场景打卡） |
| tags | string[] | 标签数组 |
| cover | string | 封面图片（云存储路径） |
| isOfficial | boolean | 是否官方模板 |
| status | string | 状态（pending/active/rejected） |
| likeCount | number | 点赞数 |
| photoSetCount | number | 相册数量 |
| creatorId | string | 创建者ID |
| creatorName | string | 创建者名称 |
| createTime | number | 创建时间（时间戳） |
| updateTime | number | 更新时间（时间戳） |
| rejectReason | string | 拒绝原因（仅在status为rejected时存在） |

### admins 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 管理员ID |
| username | string | 用户名（唯一） |
| password | string | 密码（MD5 哈希） |
| role | string | 角色（super_admin/admin） |
| status | string | 状态（active/disabled） |
| createdAt | number | 创建时间（时间戳） |
| createdBy | string | 创建者ID（仅普通管理员有此字段） |
| lastLoginTime | number | 最后登录时间（时间戳） |

## 状态说明

- `pending`: 待审核（用户刚创建的模板）
- `active`: 已通过（审核通过，在小程序中可见）
- `rejected`: 已拒绝（审核未通过）

## 控制台链接

- **CloudBase 控制台**: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2
- **templates 集合**: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/db/doc/collection/templates
- **admins 集合**: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/db/doc/collection/admins
- **adminLogin 云函数**: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/scf/detail?id=adminLogin&NameSpace=cultural-tourism-7fb138kf77a2cb2
- **createAdmin 云函数**: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/scf/detail?id=createAdmin&NameSpace=cultural-tourism-7fb138kf77a2cb2
- **manageTemplate 云函数**: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/scf/detail?id=manageTemplate&NameSpace=cultural-tourism-7fb138kf77a2cb2

## 注意事项

1. **登录验证**: 使用云函数进行登录验证，密码使用 MD5 哈希
2. **权限管理**: 超级管理员可以创建新的管理员账户
3. **图片加载**: 封面图片使用临时链接，有效期1小时
4. **实时更新**: 审批操作后会自动刷新列表
5. **确认操作**: 所有重要操作（通过、拒绝、删除）都需要二次确认
6. **登录状态**: 登录状态保存在 localStorage，刷新页面后自动恢复

## 后续优化建议

1. **管理员管理界面**: 添加管理员管理页面，超级管理员可以创建、禁用、启用管理员
2. **密码安全**: 使用更安全的密码哈希算法（如 bcrypt）
3. **登录安全**: 添加登录失败次数限制、验证码功能
4. **会话管理**: 实现 JWT 或 Session 管理
5. **批量操作**: 支持批量审批模板
6. **审批历史**: 记录审批操作日志
7. **数据统计**: 添加审批数据统计图表
8. **搜索筛选**: 添加模板搜索和筛选功能
9. **权限细化**: 区分不同管理员的操作权限

## 维护说明

- 项目使用 Vue 3 Composition API
- 所有异步操作都有错误处理
- UI 使用 Element Plus 组件库
- 响应式设计，支持移动端访问
