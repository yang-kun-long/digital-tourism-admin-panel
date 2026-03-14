import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './style.css'
import './styles/global.css'
import App from './App.vue'
import router from './router'
import { watchImageViewer, debugZIndex } from './utils/debugZIndex'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(router)
app.mount('#app')

// 启动 z-index 调试
console.log('启动 z-index 调试工具')
watchImageViewer()

// 页面加载后立即检查一次
setTimeout(() => {
  console.log('页面加载完成，检查当前状态')
  debugZIndex()
}, 1000)
