import type { AdminRole } from './roles'

export interface MenuItem {
  path: string
  name: string
  icon: string
  roles: AdminRole[]
  children?: MenuItem[]
}

export const menuConfig: MenuItem[] = [
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
    roles: ['super_admin', 'support_admin']
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
      {
        path: '/templates',
        name: '官方模板',
        icon: 'Document',
        roles: ['super_admin', 'content_admin']
      },
      {
        path: '/photosets',
        name: '官方照片',
        icon: 'Picture',
        roles: ['super_admin', 'content_admin']
      },
      {
        path: '/locations',
        name: '地点管理',
        icon: 'Location',
        roles: ['super_admin', 'content_admin']
      },
      {
        path: '/goods',
        name: '商品管理',
        icon: 'ShoppingCart',
        roles: ['super_admin', 'content_admin']
      },
      {
        path: '/albums',
        name: '旅拍相册',
        icon: 'Camera',
        roles: ['super_admin', 'content_admin']
      }
    ]
  },
  {
    path: '/user-content',
    name: '用户内容',
    icon: 'User',
    roles: ['super_admin', 'content_admin', 'support_admin'],
    children: [
      {
        path: '/user-content',
        name: '内容概览',
        icon: 'DataAnalysis',
        roles: ['super_admin', 'content_admin', 'support_admin']
      },
      {
        path: '/user-content/templates',
        name: '用户模板',
        icon: 'Document',
        roles: ['super_admin', 'content_admin', 'support_admin']
      },
      {
        path: '/user-content/photos',
        name: '用户照片',
        icon: 'Picture',
        roles: ['super_admin', 'content_admin', 'support_admin']
      }
    ]
  },
  {
    path: '/system',
    name: '系统管理',
    icon: 'Setting',
    roles: ['super_admin'],
    children: [
      {
        path: '/system/admins',
        name: '管理员管理',
        icon: 'User',
        roles: ['super_admin']
      },
      {
        path: '/system/settings',
        name: '系统设置',
        icon: 'Tools',
        roles: ['super_admin']
      }
    ]
  },
  {
    path: '/profile',
    name: '个人信息',
    icon: 'User',
    roles: ['super_admin', 'content_admin', 'support_admin']
  }
]

export function hasPermission(userRole: AdminRole, requiredRoles: AdminRole[]): boolean {
  return requiredRoles.includes(userRole)
}

export function getVisibleMenus(userRole: AdminRole): MenuItem[] {
  return menuConfig.filter(menu => {
    if (!hasPermission(userRole, menu.roles)) {
      return false
    }
    if (menu.children) {
      menu.children = menu.children.filter(child => hasPermission(userRole, child.roles))
    }
    return true
  })
}
