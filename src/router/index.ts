import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'

// 布局组件
import MainLayout from '@/layouts/MainLayout.vue'
import LoginLayout from '@/layouts/LoginLayout.vue'

// 页面组件
import Login from '@/components/Login.vue'
import Dashboard from '@/views/Dashboard.vue'

// 举报处理
import ReportList from '@/views/reports/ReportList.vue'

// 意见反馈
import FeedbackList from '@/views/feedback/FeedbackList.vue'
import FeedbackDetail from '@/views/feedback/FeedbackDetail.vue'

// 官方内容管理
import TemplateList from '@/views/templates/TemplateList.vue'
import PhotoSetList from '@/views/photosets/PhotoSetList.vue'
import LocationList from '@/views/locations/LocationList.vue'
import GoodsList from '@/views/goods/GoodsList.vue'

// 用户内容管理
import UserContentDashboard from '@/views/user-content/UserContentDashboard.vue'
import UserTemplateList from '@/views/user-content/UserTemplateList.vue'
import UserPhotoList from '@/views/user-content/UserPhotoList.vue'

// 官方内容管理 - 新版
import OfficialTemplateList from '@/views/official-content/templates/TemplateList.vue'
import OfficialTemplateForm from '@/views/official-content/templates/TemplateForm.vue'

// 系统管理
import AdminManagement from '@/components/AdminManagement.vue'
import SystemSettings from '@/views/system/SystemSettings.vue'

// 旅拍相册管理
import AlbumList from '@/views/albums/AlbumList.vue'

// 个人信息
import ProfileManagement from '@/components/ProfileManagement.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: LoginLayout,
    children: [
      {
        path: '',
        name: 'Login',
        component: Login,
        meta: { title: '登录' }
      }
    ]
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: {
          title: '仪表盘',
          icon: 'DataAnalysis',
          roles: ['super_admin', 'content_admin', 'support_admin']
        }
      },
      // 举报处理
      {
        path: 'reports',
        name: 'Reports',
        component: ReportList,
        meta: {
          title: '举报处理',
          icon: 'Warning',
          roles: ['super_admin', 'support_admin']
        }
      },
      // 意见反馈
      {
        path: 'feedback',
        name: 'Feedback',
        component: FeedbackList,
        meta: {
          title: '意见反馈',
          icon: 'ChatDotRound',
          roles: ['super_admin', 'support_admin']
        }
      },
      {
        path: 'feedback/:id',
        name: 'FeedbackDetail',
        component: FeedbackDetail,
        meta: {
          title: '反馈详情',
          roles: ['super_admin', 'support_admin'],
          hidden: true
        }
      },
      // 官方内容管理 - 模板
      {
        path: 'templates',
        name: 'Templates',
        component: TemplateList,
        meta: {
          title: '官方模板',
          icon: 'Files',
          roles: ['super_admin', 'content_admin']
        }
      },
      // 官方内容管理 - 照片
      {
        path: 'photosets',
        name: 'PhotoSets',
        component: PhotoSetList,
        meta: {
          title: '官方照片',
          icon: 'Picture',
          roles: ['super_admin', 'content_admin']
        }
      },
      // 官方内容管理 - 地点
      {
        path: 'locations',
        name: 'Locations',
        component: LocationList,
        meta: {
          title: '地点管理',
          icon: 'Location',
          roles: ['super_admin', 'content_admin']
        }
      },
      // 官方内容管理 - 商品
      {
        path: 'goods',
        name: 'Goods',
        component: GoodsList,
        meta: {
          title: '商品管理',
          icon: 'ShoppingCart',
          roles: ['super_admin', 'content_admin']
        }
      },
      // 用户内容管理 - 仪表盘
      {
        path: 'user-content',
        name: 'UserContent',
        component: UserContentDashboard,
        meta: {
          title: '用户内容管理',
          icon: 'User',
          roles: ['super_admin', 'content_admin', 'support_admin']
        }
      },
      // 用户内容管理 - 用户模板
      {
        path: 'user-content/templates',
        name: 'UserTemplates',
        component: UserTemplateList,
        meta: {
          title: '用户模板',
          icon: 'Document',
          roles: ['super_admin', 'content_admin', 'support_admin']
        }
      },
      // 用户内容管理 - 用户照片
      {
        path: 'user-content/photos',
        name: 'UserPhotos',
        component: UserPhotoList,
        meta: {
          title: '用户照片',
          icon: 'Picture',
          roles: ['super_admin', 'content_admin', 'support_admin']
        }
      },
      // 官方内容管理 - 新版模板管理
      {
        path: 'official-content/templates',
        name: 'OfficialTemplates',
        component: OfficialTemplateList,
        meta: {
          title: '官方模板管理',
          icon: 'Files',
          roles: ['super_admin', 'content_admin']
        }
      },
      {
        path: 'official-content/templates/create',
        name: 'OfficialTemplateCreate',
        component: OfficialTemplateForm,
        meta: {
          title: '创建官方模板',
          roles: ['super_admin', 'content_admin'],
          hidden: true
        }
      },
      {
        path: 'official-content/templates/edit/:id',
        name: 'OfficialTemplateEdit',
        component: OfficialTemplateForm,
        meta: {
          title: '编辑官方模板',
          roles: ['super_admin', 'content_admin'],
          hidden: true
        }
      },
      // 系统管理
      {
        path: 'system/admins',
        name: 'AdminManagement',
        component: AdminManagement,
        meta: {
          title: '管理员管理',
          icon: 'Setting',
          roles: ['super_admin']
        }
      },
      {
        path: 'system/settings',
        name: 'SystemSettings',
        component: SystemSettings,
        meta: {
          title: '系统设置',
          icon: 'Tools',
          roles: ['super_admin']
        }
      },
      // 旅拍相册管理
      {
        path: 'albums',
        name: 'Albums',
        component: AlbumList,
        meta: {
          title: '旅拍相册',
          icon: 'Camera',
          roles: ['super_admin', 'content_admin']
        }
      },
      // 个人信息
      {
        path: 'profile',
        name: 'Profile',
        component: ProfileManagement,
        meta: {
          title: '个人信息',
          icon: 'User',
          roles: ['super_admin', 'content_admin', 'support_admin']
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const adminInfo = localStorage.getItem('adminInfo')
  const admin = adminInfo ? JSON.parse(adminInfo) : null

  // 未登录，跳转到登录页
  if (!admin && to.path !== '/login') {
    return next('/login')
  }

  // 已登录访问登录页，跳转到首页
  if (admin && to.path === '/login') {
    return next('/dashboard')
  }

  // 权限检查
  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles && admin) {
    if (!requiredRoles.includes(admin.role)) {
      ElMessage.error('权限不足')
      return next('/dashboard')
    }
  }

  next()
})

export default router
