# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 重要说明 / Important Note

**本项目全程使用中文回答。** 在与用户交流时，请始终使用中文进行回复、解释和讨论。代码注释和文档也应使用中文。

**Always respond in Chinese for this project.** Use Chinese for all communication, explanations, and discussions with users. Code comments and documentation should also be in Chinese.

## Project Overview

This is a Vue 3 admin panel for a digital cultural tourism platform (数字文旅管理后台). The admin panel manages user-generated templates, official content, reports, and feedback. It uses Tencent CloudBase as the backend service.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production (includes TypeScript type checking)
npm run build

# Preview production build
npm run preview

# Type check only
vue-tsc -b
```

## Tech Stack

- **Frontend**: Vue 3 (Composition API) + TypeScript
- **UI Library**: Element Plus
- **Build Tool**: Vite
- **Router**: Vue Router (web history mode, base: `/admin/`)
- **Backend**: CloudBase (Tencent Cloud)
- **State Management**: localStorage for auth, reactive refs for component state

## Architecture

### Role-Based Access Control

Three admin roles with different permissions:
- `super_admin` - Full access to all features including system management
- `content_admin` - Manages official content (templates, photo sets, locations, goods)
- `support_admin` - Handles reports and feedback

Role configuration: `src/config/roles.ts`
Menu configuration: `src/config/menu.ts`

### Authentication Flow

1. User logs in via `src/components/Login.vue`
2. Calls CloudBase function `adminLogin` with username/password
3. Admin info stored in localStorage as `adminInfo`
4. Router guard (`src/router/index.ts`) checks auth and role permissions
5. Menu items filtered based on user role

### CloudBase Integration

**Environment**: `cultural-tourism-7fb138kf77a2cb2` (ap-shanghai region)

**Key Collections**:
- `templates` - User and official templates
- `admins` - Admin accounts
- `reports` - User reports
- `feedback` - User feedback
- `locations` - Tourist locations
- `goods` - Products/merchandise
- `photosets` - Photo collections

**Cloud Functions**:
- `adminLogin` - Admin authentication
- `createAdmin` - Create new admin accounts (super_admin only)
- `manageTemplate` - Approve/reject/delete templates
- `uploadImage` - Upload images (avoids CORS issues)

**CloudBase Utils** (`src/utils/cloudbase.ts`):
- `db` - Database instance
- `auth` - Authentication instance
- `callFunction(name, data)` - Call cloud functions
- `uploadFileViaFunction(file, cloudPath)` - Upload files via cloud function
- `batchProcessImageUrls(urls)` - Convert cloud:// URLs to temp URLs with caching
- `processImageUrl(url)` - Process single image URL

### Image Handling

Images are stored in CloudBase storage with `cloud://` URLs. The admin panel:
1. Converts `cloud://` URLs to temporary HTTPS URLs via `getTempFileURL()`
2. Caches temp URLs for 2 hours to reduce API calls
3. Uses placeholder SVG images for loading/error states
4. Compresses images before upload (max 1920px width, 0.8 quality)

### Router Structure

- `/login` - Login page (LoginLayout)
- `/` - Main app (MainLayout)
  - `/dashboard` - Dashboard with statistics
  - `/reports` - Report management
  - `/feedback` - Feedback management
  - `/templates` - Official template management
  - `/photosets` - Photo set management
  - `/locations` - Location management
  - `/goods` - Product management
  - `/system/admins` - Admin management (super_admin only)
  - `/system/settings` - System settings (super_admin only)
  - `/profile` - User profile

All routes except `/login` require authentication. Routes have role-based access control via `meta.roles`.

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Login.vue       # Login form
│   ├── AdminManagement.vue
│   └── ProfileManagement.vue
├── views/              # Page components by feature
│   ├── Dashboard.vue
│   ├── reports/
│   ├── feedback/
│   ├── templates/
│   ├── photosets/
│   ├── locations/
│   ├── goods/
│   ├── official-content/  # New official content management
│   └── system/
├── layouts/            # Layout wrappers
│   ├── MainLayout.vue  # Main app layout with sidebar
│   └── LoginLayout.vue # Login page layout
├── router/
│   └── index.ts        # Router config with auth guards
├── config/
│   ├── roles.ts        # Role definitions
│   └── menu.ts         # Menu configuration
├── utils/
│   ├── cloudbase.ts    # CloudBase initialization and helpers
│   ├── api.ts          # API utilities
│   └── debugZIndex.ts  # Z-index debugging tool
└── styles/
    └── global.css      # Global styles
```

## Key Patterns

### Component Data Fetching

Most views follow this pattern:
```typescript
const loading = ref(false)
const data = ref([])

const loadData = async () => {
  loading.value = true
  try {
    const res = await db.collection('collectionName')
      .where({ /* filters */ })
      .orderBy('createTime', 'desc')
      .get()
    data.value = res.data

    // Process image URLs if needed
    await processImages()
  } catch (error) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
```

### Cloud Function Calls

```typescript
import { callFunction } from '@/utils/cloudbase'

const result = await callFunction('functionName', {
  param1: value1,
  param2: value2
})
```

### Image Upload

```typescript
import { uploadFileViaFunction } from '@/utils/cloudbase'

const handleUpload = async (file: File) => {
  try {
    const { fileID, downloadURL } = await uploadFileViaFunction(file)
    // Use fileID for storage, downloadURL for preview
  } catch (error) {
    ElMessage.error('上传失败')
  }
}
```

### Role Permission Check

```typescript
import { hasPermission } from '@/config/menu'

const admin = JSON.parse(localStorage.getItem('adminInfo') || '{}')
if (hasPermission(admin.role, ['super_admin'])) {
  // Show admin-only features
}
```

## Important Notes

- **Path Alias**: `@` is aliased to `./src` in vite.config.ts
- **Base Path**: App is deployed at `/admin/` path, configured in router and vite config
- **Authentication**: Admin info stored in localStorage, no JWT/session tokens
- **Image Caching**: Temp URLs cached for 2 hours to reduce CloudBase API calls
- **TypeScript**: Strict mode enabled, all components use `<script setup lang="ts">`
- **Element Plus**: All icons auto-registered in main.ts
- **CORS**: File uploads use cloud function to avoid CORS issues with CloudBase storage

## Common Tasks

### Adding a New Admin Page

1. Create view component in `src/views/[feature]/`
2. Add route in `src/router/index.ts` with appropriate `meta.roles`
3. Add menu item in `src/config/menu.ts` if needed
4. Implement data fetching using CloudBase `db` instance

### Adding a New Cloud Function Call

1. Define function parameters interface
2. Use `callFunction(name, data)` from `@/utils/cloudbase`
3. Handle errors with try/catch and ElMessage

### Working with Images

1. Use `uploadFileViaFunction()` for uploads (handles compression and CORS)
2. Use `batchProcessImageUrls()` for displaying multiple images
3. Use `processImageUrl()` for single image display
4. Store `cloud://` URLs in database, convert to temp URLs in UI

## Deployment

Production URL: https://cultural-tourism-7fb138kf77a2cb2-1400488372.tcloudbaseapp.com/admin/

Build output goes to `dist/` directory. Deploy using CloudBase CLI or MCP tools to the `/admin` path.
