export function formatUnit(value: string | number): string {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  // Matches pure numbers in strings (e.g., "100") and adds px
  if (/^\d+(\.\d+)?$/.test(value)) {
    return `${value}px`;
  }
  return value;
}

export function applyBaseStyles(el: HTMLElement, data: any) {
  el.style.position = data.position || 'absolute';
  el.style.left = formatUnit(data.x);
  el.style.top = formatUnit(data.y);
  el.style.width = formatUnit(data.width);
  el.style.height = formatUnit(data.height);
  el.style.transform = `rotate(${data.rotation}deg)`;
  el.style.opacity = data.opacity.toString();
  el.style.zIndex = data.zIndex.toString();
  el.style.visibility = data.visible ? 'visible' : 'hidden';
  el.setAttribute('data-id', data.id);
  el.setAttribute('data-type', data.type);

  if (data.className) {
    el.classList.add(...data.className.split(' ').filter(Boolean));
  }

  if (data.style) {
    Object.assign(el.style, data.style);
  }
}
