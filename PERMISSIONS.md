# 权限方案说明

## 问题背景

管理后台需要对 `templates` 集合进行审批操作（通过、拒绝、删除），但数据库的安全规则限制了直接修改：

- **templates 集合**：只能修改自己创建的文档（`doc._openid == auth.uid`）
- **photoSets 集合**：只能操作自己的文档（`doc._openid == auth.openid`）

## 解决方案：云函数权限代理

采用**云函数方案**，既保证了安全性，又实现了管理功能：

### 方案优势

1. **保持数据库权限不变**
   - 用户数据受到保护
   - 普通用户无法修改他人的模板
   - 符合最小权限原则

2. **云函数作为权限代理**
   - 云函数运行在服务端，拥有完整的数据库权限
   - 在云函数内部验证管理员身份
   - 只有通过验证的管理员才能执行操作

3. **操作可追溯**
   - 记录操作者信息（approvedBy/rejectedBy）
   - 记录操作时间（approvedAt/rejectedAt）
   - 便于审计和问题追踪

## 实现细节

### 1. 云函数：manageTemplate

**位置**：`cloudfunctions/manageTemplate/index.js`

**功能**：
- 验证管理员身份和状态
- 执行审批操作（approve/reject/delete）
- 记录操作信息

**调用示例**：
```javascript
// 审批通过
await app.callFunction({
  name: 'manageTemplate',
  data: {
    adminId: adminInfo.value.id,
    action: 'approve',
    templateId: template._id
  }
})

// 拒绝模板
await app.callFunction({
  name: 'manageTemplate',
  data: {
    adminId: adminInfo.value.id,
    action: 'reject',
    templateId: template._id,
    rejectReason: '不符合规范'
  }
})

// 删除模板
await app.callFunction({
  name: 'manageTemplate',
  data: {
    adminId: adminInfo.value.id,
    action: 'delete',
    templateId: template._id
  }
})
```

### 2. 管理后台调用

**文件**：`admin-panel/src/App.vue`

**修改内容**：
- 将直接的数据库操作改为云函数调用
- 传递管理员 ID 进行权限验证
- 处理云函数返回结果

**修改前**：
```javascript
await db.collection('templates').doc(template._id).update({
  status: 'active',
  updateTime: Date.now()
})
```

**修改后**：
```javascript
const result = await app.callFunction({
  name: 'manageTemplate',
  data: {
    adminId: adminInfo.value?.id,
    action: 'approve',
    templateId: template._id
  }
})
```

### 3. 权限验证流程

```
用户操作
  ↓
前端调用云函数（传递 adminId）
  ↓
云函数验证管理员身份
  ├─ 检查管理员是否存在
  ├─ 检查账户状态（active/disabled）
  └─ 验证失败 → 返回错误
  ↓
验证通过 → 执行数据库操作
  ├─ 更新模板状态
  ├─ 记录操作者信息
  └─ 记录操作时间
  ↓
返回操作结果
```

## 数据库权限设置

### templates 集合

**当前权限**（保持不变）：
```json
{
  "read": "auth != null",
  "write": "doc._openid == auth.uid"
}
```

**说明**：
- 读取：需要登录
- 写入：只能修改自己创建的文档
- 管理员通过云函数绕过此限制

### photoSets 集合

**当前权限**（保持不变）：
```json
{
  "read": true,
  "create": "auth.openid != null",
  "update": "doc._openid == auth.openid",
  "delete": "doc._openid == auth.openid"
}
```

**说明**：
- 读取：所有人可读
- 创建：需要登录
- 更新/删除：只能操作自己的文档

## 部署状态

- ✅ **manageTemplate 云函数**：已部署（Active）
- ✅ **管理后台代码**：已更新
- ✅ **数据库权限**：保持原有设置

## 测试步骤

1. 访问管理后台：http://localhost:5173
2. 使用 admin/admin 登录
3. 尝试审批模板：
   - 点击"通过"按钮
   - 点击"拒绝"按钮（需输入原因）
   - 点击"删除"按钮
4. 检查操作结果：
   - 查看模板状态是否更新
   - 查看是否记录了操作者信息

## 安全性说明

1. **双重验证**
   - 前端：登录状态验证
   - 云函数：管理员身份验证

2. **权限隔离**
   - 普通用户：只能操作自己的数据
   - 管理员：通过云函数操作所有数据
   - 云函数：内部验证，防止伪造请求

3. **操作追溯**
   - 记录操作者 ID
   - 记录操作时间
   - 便于审计和问题排查

## 未来优化建议

1. **添加操作日志表**
   - 记录所有管理操作
   - 包含操作前后的数据快照
   - 支持操作回滚

2. **细化权限控制**
   - 区分审批权限和删除权限
   - 支持权限组和角色管理
   - 实现更细粒度的权限控制

3. **增强安全性**
   - 添加操作频率限制
   - 实现 IP 白名单
   - 添加操作二次确认（短信/邮件）
