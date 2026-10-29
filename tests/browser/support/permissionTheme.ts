import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

export async function expectInlineActions(rows: Locator): Promise<void> {
  expect(await rows.count()).toBeGreaterThan(0)
  for (const row of await rows.all()) {
    const boxes = []
    for (const name of ['新增', '编辑', '删除']) {
      const button = row.getByRole('button', { name, exact: true })
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      if (!box) throw new Error(`权限行缺少${name}按钮布局`)
      expect(box.width).toBeGreaterThan(0)
      expect(box.height).toBeGreaterThan(0)
      boxes.push(box)
    }
    const centers = boxes.map((box) => box.y + box.height / 2)
    expect(
      Math.max(...centers) - Math.min(...centers),
      '每行操作按钮应水平对齐',
    ).toBeLessThanOrEqual(2)
    expect(boxes[0].x + boxes[0].width).toBeLessThanOrEqual(boxes[1].x)
    expect(boxes[1].x + boxes[1].width).toBeLessThanOrEqual(boxes[2].x)
  }
}

export async function expectReadableSurface(target: Locator, label: string): Promise<void> {
  await expect(target, label).toBeVisible()
  await expect
    .poll(
      async () => {
        const colors = await target.evaluate((element) => {
          const canvas = document.createElement('canvas')
          canvas.width = 1
          canvas.height = 1
          const painter = canvas.getContext('2d', { willReadFrequently: true })
          if (!painter) throw new Error('无法读取浏览器颜色')
          function rgba(color: string): number[] {
            if (!painter) throw new Error('颜色画布不可用')
            if (!CSS.supports('color', color)) throw new Error(`不支持的计算颜色：${color}`)
            painter.clearRect(0, 0, 1, 1)
            painter.fillStyle = color
            painter.fillRect(0, 0, 1, 1)
            return Array.from(painter.getImageData(0, 0, 1, 1).data)
          }
          function composite(top: number[], bottom: number[]): number[] {
            const alpha = top[3] / 255
            return top.slice(0, 3).map((channel, index) => {
              return channel * alpha + bottom[index] * (1 - alpha)
            })
          }
          function luminance(color: number[]): number {
            const linear = color.map((channel) => {
              const normalized = channel / 255
              return normalized <= 0.04045
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4
            })
            return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
          }
          const ancestors: Element[] = []
          for (let node: Element | null = element; node; node = node.parentElement) {
            ancestors.unshift(node)
          }
          // 先合成祖先底色，再合成半透明文字，避免只检查 CSS 变量声明。
          let background = [255, 255, 255]
          let stable = true
          for (const ancestor of ancestors) {
            const style = getComputedStyle(ancestor)
            if (style.backgroundImage !== 'none') {
              throw new Error('颜色采样遇到图片背景，不能推断对比度')
            }
            if (Number(style.opacity) !== 1) stable = false
            background = composite(rgba(style.backgroundColor), background)
          }
          if (!stable) return null
          const foreground = composite(rgba(getComputedStyle(element).color), background)
          const backgroundLuminance = luminance(background)
          const foregroundLuminance = luminance(foreground)
          return {
            background,
            foreground,
            backgroundLuminance,
            contrast:
              (Math.max(backgroundLuminance, foregroundLuminance) + 0.05) /
              (Math.min(backgroundLuminance, foregroundLuminance) + 0.05),
          }
        })
        if (colors === null) {
          return { readable: false, darkBackground: false, measured: '过渡中' }
        }
        return {
          readable: colors.contrast >= 4.5,
          darkBackground: colors.backgroundLuminance < 0.5,
          measured: JSON.stringify(colors),
        }
      },
      { message: `${label} 应使用暗色底，实际文字对比度至少为 4.5` },
    )
    .toMatchObject({ readable: true, darkBackground: true })
}

export async function settleAppearance(page: Page): Promise<void> {
  await expect(page.locator('.el-loading-mask:visible')).toHaveCount(0)
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  // 等实际有限动画结束，避免把主题颜色过渡的中间帧当成最终白底。
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((animation) => {
            const end = animation.effect?.getComputedTiming().endTime
            return (
              animation.playState === 'running' && typeof end === 'number' && Number.isFinite(end)
            )
          }).length,
      ),
    )
    .toBe(0)
}

export async function screenshot(page: Page, info: TestInfo, name: string): Promise<void> {
  await settleAppearance(page)
  const path = info.outputPath(`${name}.jpg`)
  await page.screenshot({ path, type: 'jpeg', quality: 85, animations: 'disabled' })
  await info.attach(name, { path, contentType: 'image/jpeg' })
}
