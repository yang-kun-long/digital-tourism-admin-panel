export type AdminRole = 'super_admin' | 'content_admin' | 'support_admin'

export interface RoleConfig {
  value: AdminRole
  label: string
  description: string
}

export const roles: RoleConfig[] = [
  {
    value: 'super_admin',
    label: '超级管理员',
    description: '拥有所有权限，可管理系统设置和其他管理员'
  },
  {
    value: 'content_admin',
    label: '内容管理员',
    description: '负责官方内容上传和地点/产品管理'
  },
  {
    value: 'support_admin',
    label: '客服管理员',
    description: '负责举报处理和意见反馈处理'
  }
]

export function getRoleLabel(role: AdminRole): string {
  return roles.find(r => r.value === role)?.label || role
}
