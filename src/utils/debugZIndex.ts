// Z-index 调试工具

export const debugZIndex = () => {
  console.log('=== Z-Index 调试开始 ===')

  // 检查图片预览组件
  const imageViewer = document.querySelector('.el-image-viewer__wrapper')
  if (imageViewer) {
    const computed = window.getComputedStyle(imageViewer)
    const parent = imageViewer.parentElement
    console.log('图片预览组件 (.el-image-viewer__wrapper):', {
      zIndex: computed.zIndex,
      position: computed.position,
      parentTag: parent?.tagName
    })
  }

  // 检查遮罩层
  const mask = document.querySelector('.el-image-viewer__mask')
  if (mask) {
    const computed = window.getComputedStyle(mask)
    const parent = mask.parentElement
    console.log('遮罩层 (.el-image-viewer__mask):', {
      zIndex: computed.zIndex,
      position: computed.position,
      opacity: computed.opacity,
      backgroundColor: computed.backgroundColor,
      parentTag: parent?.tagName,
      parentClass: parent?.className
    })
  }

  // 检查画布
  const canvas = document.querySelector('.el-image-viewer__canvas')
  if (canvas) {
    const computed = window.getComputedStyle(canvas)
    console.log('画布 (.el-image-viewer__canvas):', {
      zIndex: computed.zIndex,
      position: computed.position,
      opacity: computed.opacity
    })
  }

  // 检查图片
  const img = document.querySelector('.el-image-viewer__img')
  if (img) {
    const computed = window.getComputedStyle(img)
    console.log('图片 (.el-image-viewer__img):', {
      zIndex: computed.zIndex,
      position: computed.position,
      opacity: computed.opacity
    })
  }

  // 检查中心点的元素堆叠
  if (imageViewer) {
    const viewerRect = imageViewer.getBoundingClientRect()
    const centerX = viewerRect.left + viewerRect.width / 2
    const centerY = viewerRect.top + viewerRect.height / 2
    const elementsAtPoint = document.elementsFromPoint(centerX, centerY)

    console.log('图片预览中心点的元素堆叠（从上到下）:')
    elementsAtPoint.slice(0, 15).forEach((el, index) => {
      const computed = window.getComputedStyle(el)
      console.log(`  ${index}: ${el.tagName}.${el.className.split(' ')[0]} - z-index: ${computed.zIndex}, opacity: ${computed.opacity}, bg: ${computed.backgroundColor}`)
    })
  }

  console.log('=== Z-Index 调试结束 ===')
}

// 监听图片预览打开
export const watchImageViewer = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (node.classList.contains('el-image-viewer__wrapper') ||
              node.querySelector('.el-image-viewer__wrapper')) {
            console.log('检测到图片预览打开')
            setTimeout(() => {
              debugZIndex()
            }, 100)
          }
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  console.log('图片预览监听已启动')
}
