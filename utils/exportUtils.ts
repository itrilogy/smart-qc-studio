/**
 * 将 SVG 元素转换为 PNG DataURL
 */
export async function svgToDataURL(
  svgElement: SVGSVGElement,
  options?: {
    width?: number;
    height?: number;
    pixelRatio?: number;
    backgroundColor?: string;
    padding?: number;
  }
): Promise<string> {
  const {
    pixelRatio = 3,
    backgroundColor = '#ffffff',
    padding = 20
  } = options || {};

  // 克隆 SVG 以免修改原始 DOM
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  
  // 获取原始尺寸或 viewBox 尺寸
  const vBox = svgElement.viewBox?.baseVal || { x: 0, y: 0, width: 800, height: 600 };
  const bbox = svgElement.getBBox?.() || { x: 0, y: 0, width: 800, height: 600 };
  
  const width = options?.width || vBox.width || bbox.width || 800;
  const height = options?.height || vBox.height || bbox.height || 600;

  // 增加安全边距
  const exportWidth = width + padding * 2;
  const exportHeight = height + padding * 2;

  clone.setAttribute('width', exportWidth.toString());
  clone.setAttribute('height', exportHeight.toString());
  clone.setAttribute('viewBox', `${(vBox.x || bbox.x) - padding} ${(vBox.y || bbox.y) - padding} ${exportWidth} ${exportHeight}`);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // 处理内联样式 (如果需要)
  const svgData = new XMLSerializer().serializeToString(clone);
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = exportWidth * pixelRatio;
      canvas.height = exportHeight * pixelRatio;
      
      ctx.scale(pixelRatio, pixelRatio);
      
      // 绘制背景
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, exportWidth, exportHeight);
      }
      
      ctx.drawImage(img, 0, 0);
      
      const dataURL = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
      resolve(dataURL);
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}
