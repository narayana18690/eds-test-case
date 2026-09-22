import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Extracts the first link href from a cell, if present.
 * @param {Element} cell A block cell
 * @returns {string} The href, or empty string when no link is authored
 */
function getHref(cell) {
  const link = cell?.querySelector('a[href]');
  return link ? link.getAttribute('href') : '';
}

/**
 * Builds an optimized picture from a cell's image, preserving its media hint.
 * Works whether the platform delivered a `<picture>` or a bare `<img>`.
 * @param {Element} cell A block cell that may contain an image
 * @param {string} media The media query the picture should apply to
 * @returns {Element|null} An optimized picture, or null when no image is found
 */
function optimize(cell, media) {
  const img = cell?.querySelector('img');
  if (!img) return null;
  const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '2000' }]);
  const source = optimized.querySelector('source');
  if (source && media) source.setAttribute('media', media);
  return optimized;
}

/**
 * Decorates the banner carousel block.
 * Each row is a slide with: desktop image, mobile image, and a redirect link.
 * @param {Element} block The banner-carousel block
 */
export default function decorate(block) {
  const slides = [...block.children].map((row) => {
    const [desktopCell, mobileCell, linkCell] = row.children;
    const href = getHref(linkCell);

    const desktopPic = optimize(desktopCell, '(width >= 768px)');
    const mobilePic = optimize(mobileCell, '(width < 768px)');

    const slide = document.createElement('div');
    slide.className = 'banner-carousel-slide';

    const media = document.createElement('div');
    media.className = 'banner-carousel-media';
    if (desktopPic) {
      desktopPic.classList.add('banner-carousel-desktop');
      media.append(desktopPic);
    }
    if (mobilePic) {
      mobilePic.classList.add('banner-carousel-mobile');
      media.append(mobilePic);
    }

    if (href) {
      const link = document.createElement('a');
      link.className = 'banner-carousel-link';
      link.href = href;
      const alt = desktopPic?.querySelector('img')?.alt
        || mobilePic?.querySelector('img')?.alt || '';
      link.setAttribute('aria-label', alt || 'Banner');
      link.append(media);
      slide.append(link);
    } else {
      slide.append(media);
    }

    return slide;
  }).filter((slide) => slide.querySelector('picture'));

  const track = document.createElement('div');
  track.className = 'banner-carousel-track';
  track.append(...slides);

  block.replaceChildren(track);

  // Single slide: no carousel controls needed.
  if (slides.length <= 1) return;

  block.classList.add('banner-carousel-multi');

  let current = 0;
  let dots = [];

  // Navigation dots
  const nav = document.createElement('div');
  nav.className = 'banner-carousel-dots';
  nav.setAttribute('role', 'tablist');

  const goTo = (index) => {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
      dot.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
  };

  dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'banner-carousel-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    nav.append(dot);
    return dot;
  });

  // Prev/next arrows
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'banner-carousel-arrow banner-carousel-prev';
  prev.setAttribute('aria-label', 'Previous slide');
  prev.addEventListener('click', () => goTo(current - 1));

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'banner-carousel-arrow banner-carousel-next';
  next.setAttribute('aria-label', 'Next slide');
  next.addEventListener('click', () => goTo(current + 1));

  block.append(prev, next, nav);
  goTo(0);

  // Auto-advance, paused on hover.
  let timer = setInterval(() => goTo(current + 1), 5000);
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { if (!timer) timer = setInterval(() => goTo(current + 1), 5000); };
  block.addEventListener('mouseenter', stop);
  block.addEventListener('mouseleave', start);
}
