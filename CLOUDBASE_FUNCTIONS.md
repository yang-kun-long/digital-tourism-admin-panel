# 用户内容管理 - 云函数说明

本文档说明了用户内容管理功能所需的 CloudBase 云函数。

## 需要添加的云函数

### 1. getUserTemplates - 获取用户模板列表

**功能**: 获取用户上传的模板列表，支持筛选和分页

**参数**:
```javascript
{
  adminId: string,        // 管理员 ID
  category?: string,      // 分类筛选（可选）
  status?: string,        // 审核状态筛选：pending/approved/rejected（可选）
  keyword?: string,       // 关键词搜索（可选）
  page: number,          // 页码
  pageSize: number       // 每页数量
}
```

**返回**:
```javascript
{
  success: boolean,
  message: string,
  data: [
    {
      _id: string,
      name: string,
      description: string,
      category: string,
      cover: string,
      tags: string[],
      isOfficial: false,
      creatorId: string,
      creatorName: string,
      status: string,        // pending/approved/rejected
      likeCount: number,
      favoriteCount: number,
      photoSetCount: number,
      viewCount: number,
      createTime: Date,
      updateTime: Date
    }
  ],
  total: number
}
```

**实现要点**:
- 查询 `templates` 集合，条件 `isOfficial: false`
- 支持按 category、status、keyword 筛选
- keyword 搜索 name、description、creatorName 字段
- 按 createTime 降序排序
- 返回分页数据和总数

---

### 2. getUserPhotos - 获取用户照片列表

**功能**: 获取用户上传的照片列表，支持筛选和分页

**参数**:
```javascript
{
  adminId: string,        // 管理员 ID
  templateId?: string,    // 所属模板 ID（可选）
  status?: string,        // 审核状态筛选（可选）
  isOfficial?: boolean,   // 是否官方照片（可选）
  keyword?: string,       // 关键词搜索（可选）
  page: number,
  pageSize: number
}
```

**返回**:
```javascript
{
  success: boolean,
  message: string,
  data: [
    {
      _id: string,
      photoName: string,
      photoUrl: string,
      templateId: string,
      templateName: string,
      uploaderName: string,
      userName: string,
      isOfficial: boolean,
      status: string,
      contentCheckStatus: string,  // 内容审核状态
      checkStatus: string,
      checkTime: Date,
      likeCount: number,
      favoriteCount: number,
      viewCount: number,
      createTime: Date,
      sourcePhotoSetTitle: string
    }
  ],
  total: number
}
```

**实现要点**:
- 查询 `photos` 集合
- 支持按 templateId、status、isOfficial、keyword 筛选
- 关联查询 templates 集合获取 templateName
- 按 createTime 降序排序

---

### 3. reviewUserTemplate - 审核用户模板

**功能**: 通过或拒绝用户模板审核

**参数**:
```javascript
{
  adminId: string,
  templateId: string,
  action: 'approve' | 'reject',
  reason?: string         // 拒绝原因（action 为 reject 时必填）
}
```

**返回**:
```javascript
{
  success: boolean,
  message: string
}
```

**实现要点**:
- 验证管理员权限
- 更新模板的 status 字段
- 如果是拒绝，记录拒绝原因到 rejectReason 字段
- 记录审核人和审核时间

---

### 4. reviewUserPhoto - 审核用户照片

**功能**: 通过或拒绝用户照片审核

**参数**:
```javascript
{
  adminId: string,
  photoId: string,
  action: 'approve' | 'reject',
  reason?: string
}
```

**返回**:
```javascript
{
  success: boolean,
  message: string
}
```

**实现要点**:
- 验证管理员权限
- 更新照片的 status 字段
- 记录拒绝原因、审核人和审核时间

---

### 5. deleteUserTemplate - 删除用户模板

**功能**: 删除用户上传的模板

**参数**:
```javascript
{
  adminId: string,
  templateId: string
}
```

**返回**:
```javascript
{
  success: boolean,
  message: string
}
```

**实现要点**:
- 验证管理员权限
- 删除模板记录
- 可选：同时删除该模板下的所有照片

---

### 6. deleteUserPhoto - 删除用户照片

**功能**: 删除用户上传的照片

**参数**:
```javascript
{
  adminId: string,
  photoId: string
}
```

**返回**:
```javascript
{
  success: boolean,
  message: string
}
```

**实现要点**:
- 验证管理员权限
- 删除照片记录
- 可选：删除云存储中的图片文件

---

### 7. getUserContentStats - 获取用户内容统计

**功能**: 获取用户内容的统计数据

**参数**:
```javascript
{
  adminId: string
}
```

**返回**:
```javascript
{
  success: boolean,
  data: {
    totalTemplates: number,      // 用户模板总数
    totalPhotos: number,         // 用户照片总数
    pendingTemplates: number,    // 待审核模板数
    pendingPhotos: number        // 待审核照片数
  }
}
```

**实现要点**:
- 统计 templates 集合中 isOfficial: false 的记录数
- 统计 photos 集合中 isOfficial: false 的记录数
- 统计各自 status: 'pending' 的记录数

---

### 8. getAllTemplates - 获取所有模板（用于筛选）

**功能**: 获取所有模板列表（包括官方和用户模板），用于筛选下拉框

**参数**:
```javascript
{
  adminId: string
}
```

**返回**:
```javascript
{
  success: boolean,
  data: [
    {
      _id: string,
      name: string
    }
  ]
}
```

**实现要点**:
- 查询 templates 集合
- 只返回 _id 和 name 字段
- 按 name 排序

---

## 数据库字段说明

### templates 集合

需要确保包含以下字段：

```javascript
{
  _id: string,
  name: string,
  description: string,
  category: string,
  cover: string,
  tags: string[],
  isOfficial: boolean,        // 是否为官方模板
  creatorId: string,
  creatorName: string,
  status: string,             // pending/approved/rejected
  rejectReason?: string,      // 拒绝原因
  reviewerId?: string,        // 审核人 ID
  reviewerName?: string,      // 审核人姓名
  reviewTime?: Date,          // 审核时间
  sort: number,
  allowUserUpload: boolean,
  likeCount: number,
  favoriteCount: number,
  photoSetCount: number,
  viewCount: number,
  createTime: Date,
  updateTime: Date
}
```

### photos 集合

需要确保包含以下字段：

```javascript
{
  _id: string,
  photoName: string,
  photoUrl: string,
  templateId: string,
  uploaderName: string,
  userName: string,
  uploaderOpenId: string,
  uploaderAvatar: string,
  isOfficial: boolean,
  status: string,             // pending/approved/rejected
  contentCheckStatus: string, // passed/pending/failed
  checkStatus: string,
  checkMethod: string,
  checkTime: Date,
  rejectReason?: string,
  reviewerId?: string,
  reviewerName?: string,
  reviewTime?: Date,
  sortOrder: number,
  likeCount: number,
  favoriteCount: number,
  viewCount: number,
  createTime: Date,
  sourcePhotoSetId?: string,
  sourcePhotoSetTitle?: string
}
```

---

## 权限说明

所有云函数都需要验证管理员权限：

- `super_admin` - 完全访问权限
- `content_admin` - 内容管理权限
- `support_admin` - 支持管理权限（可查看和审核）

建议在每个云函数开始时添加权限验证：

```javascript
// 验证管理员权限
const admin = await db.collection('admins').doc(adminId).get()
if (!admin.data || !admin.data.length) {
  return { success: false, message: '管理员不存在' }
}

const allowedRoles = ['super_admin', 'content_admin', 'support_admin']
if (!allowedRoles.includes(admin.data[0].role)) {
  return { success: false, message: '权限不足' }
}
```

---

## 测试建议

1. 创建测试数据：在 templates 和 photos 集合中添加一些测试记录
2. 确保 isOfficial 字段正确设置（用户内容为 false）
3. 测试各种筛选条件和分页功能
4. 测试审核流程（通过/拒绝）
5. 测试删除功能
6. 验证权限控制是否正常工作
