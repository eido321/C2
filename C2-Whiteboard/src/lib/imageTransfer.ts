import {createBlock} from './blockDefaults';
import {readFileAsDataUrl} from './io';

export function transferredImages(data: DataTransfer): (File | string)[] {
  const files = Array.from(data.files).filter(file => file.type.startsWith('image/'));
  if (files.length) return files;
  const template = document.createElement('template');
  template.innerHTML = data.getData('text/html');
  const src = template.content.querySelector('img')?.getAttribute('src') ??
    data.getData('text/uri-list').split(/\r?\n/).find(line => line && !line.startsWith('#'));
  return src && /^(https?:\/\/|data:image\/)/i.test(src) ? [src] : [];
}

export async function imageBlock(source: File | string, x: number, y: number) {
  let src = typeof source === 'string' ? source : await readFileAsDataUrl(source);
  const image = new Image();
  image.src = src;
  await image.decode();
  if (source instanceof File && src.length > 900000) {
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth*scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight*scale));
    canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);
    src = canvas.toDataURL('image/webp',0.85);
  }
  const scale = Math.min(1,360/Math.max(image.naturalWidth,image.naturalHeight));
  const width = Math.max(1,Math.round(image.naturalWidth*scale));
  const height = Math.max(1,Math.round(image.naturalHeight*scale));
  const block = createBlock('image', Math.round(x-width/2), Math.round(y-height/2));
  return {...block,type:'image' as const,width,height,content:{src,alt:source instanceof File ? source.name : 'Image',fit:'contain' as const}};
}
