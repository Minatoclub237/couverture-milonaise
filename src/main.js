import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

const root = document.documentElement
const $ = (s, c = document) => c.querySelector(s)
const $$ = (s, c = document) => [...c.querySelectorAll(s)]
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const desktopMQ = matchMedia('(min-width: 900px)')

/* 1 unit = 1 px of the 1440-wide reference frame (390 on mobile) */
let U = 1, HU = 1
function setUnit() {
  U = root.clientWidth / (desktopMQ.matches ? 1440 : 390)
  HU = desktopMQ.matches ? Math.min(U, window.innerHeight / 960) : U // the hero fits the frame in height too
  root.style.setProperty('--u', U + 'px')
  root.style.setProperty('--hu', HU + 'px')
}
setUnit()

/* ---------- text splitting ---------- */
function splitChars(el) {
  const text = el.textContent.trim()
  el.textContent = ''
  const mask = document.createElement('span')
  mask.className = 'mask'
  mask.setAttribute('aria-hidden', 'true')
  for (const c of text) {
    const s = document.createElement('span')
    s.className = 'ch'
    s.textContent = c === ' ' ? ' ' : c
    mask.appendChild(s)
  }
  el.appendChild(mask)
  return [...mask.children]
}

// Keeps authored <br> line breaks.
function splitWords(el) {
  const rows = el.innerHTML.split(/<br\s*\/?>/i).map(h => {
    const t = document.createElement('span')
    t.innerHTML = h
    return t.textContent.trim().split(/[ \t\n]+/).filter(Boolean)
  })
  el.textContent = ''
  const out = []
  rows.forEach((words, r) => {
    if (r > 0) el.appendChild(document.createElement('br'))
    words.forEach((w, i) => {
      const m = document.createElement('span')
      m.className = 'mask'
      const s = document.createElement('span')
      s.className = 'wd'
      s.textContent = w
      m.appendChild(s)
      el.appendChild(m)
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '))
      out.push(s)
    })
  })
  return out
}

// Groups words into masked lines by their rendered position.
function splitLines(el, wordClass = '') {
  const parts = el.textContent.trim().replace(/\s*\n\s*/g, ' ').split(/[ \t\n]+/)
  el.textContent = ''
  const words = parts.map((p, i) => {
    const s = document.createElement('span')
    s.className = ('w ' + wordClass).trim()
    s.textContent = p
    el.appendChild(s)
    if (i < parts.length - 1) el.appendChild(document.createTextNode(' '))
    return s
  })
  const rows = []
  let top = null
  words.forEach(w => {
    const t = w.offsetTop
    if (top === null || Math.abs(t - top) > 3) { rows.push([]); top = t }
    rows.at(-1).push(w)
  })
  el.textContent = ''
  return rows.map(row => {
    const mask = document.createElement('span')
    mask.className = 'line-mask'
    const inner = document.createElement('span')
    inner.className = 'line-inner'
    row.forEach((w, i) => {
      inner.appendChild(w)
      if (i < row.length - 1) inner.appendChild(document.createTextNode(' '))
    })
    mask.appendChild(inner)
    el.appendChild(mask)
    return inner
  })
}

/* ---------- scroll-scrubbed reveals ----------
   Every reveal is tied to the scroll position: it builds while scrolling down
   and un-builds the same way while scrolling back up. */
const RANGE = {
  chars: ['top 88%', 'top 38%'],
  words: ['top 92%', 'top 48%'],
  lines: ['top 94%', 'top 52%'],
  'fade-lines': ['top 96%', 'top 62%'],
  'stagger-fade': ['top 97%', 'top 64%'],
  'lines-list': ['top 97%', 'top 58%'],
  img: ['top 98%', 'top 40%'],
  rule: ['top 96%', 'top 62%'],
  btn: ['top 96%', 'top 68%'],
  avatar: ['top 96%', 'top 62%'],
  thumbs: ['top 99%', 'top 66%'],
  track: ['top 100%', 'top 56%'],
  card: ['top 99%', 'top 46%'],
  steps: ['top 92%', 'top 8%'],
}

// Elements whose own box is clipped, scaled or shifted are measured through their parent.
const VIA_PARENT = ['img', 'btn', 'rule', 'avatar']

function reveal(el, type) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  switch (type) {
    case 'chars': {
      const p = splitChars(el)
      tl.fromTo(p, { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.09 })
      break
    }
    case 'words': {
      const p = splitWords(el)
      tl.fromTo(p, { yPercent: 118 }, { yPercent: 0, duration: 1, stagger: 0.08 })
      break
    }
    case 'lines': {
      const p = splitLines(el, el.hasAttribute('data-fill') ? 'wd-fill' : '')
      tl.fromTo(p, { yPercent: 118 }, { yPercent: 0, duration: 1, stagger: 0.12 })
      break
    }
    case 'fade-lines': {
      const p = splitLines(el)
      tl.fromTo(p, { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0, duration: 1, stagger: 0.14, ease: 'power2.out' })
      break
    }
    case 'stagger-fade':
      tl.fromTo([...el.children], { opacity: 0, y: 10 * U }, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: 'power2.out' })
      break
    case 'lines-list': {
      const p = [...el.children].map(li => {
        li.innerHTML = `<span class="line-mask"><span class="line-inner">${li.innerHTML}</span></span>`
        return $('.line-inner', li)
      })
      tl.fromTo(p, { yPercent: 118 }, { yPercent: 0, duration: 1, stagger: 0.1 })
      break
    }
    case 'img':
      tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)', y: 110 * U }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1, ease: 'power2.out' })
        .fromTo($('img', el), { scale: 1.4, transformOrigin: '50% 100%' }, { scale: 1.12, duration: 1, ease: 'power2.out' }, 0)
      break
    case 'rule':
      tl.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power2.inOut' })
      break
    case 'btn':
      tl.fromTo(el, { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' })
      break
    case 'avatar':
      tl.fromTo(el, { scale: 0, rotate: -25 }, { scale: 1, rotate: 0, duration: 1 })
      break
    case 'thumbs':
      tl.fromTo([...el.children], { clipPath: 'inset(0% 0% 100% 0%)', y: 30 * U }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1, stagger: 0.15, ease: 'power2.inOut' })
      break
    case 'track':
      ;[...el.children].forEach((p, i) => {
        const fig = p.querySelector('.t-fig') || p
        tl.fromTo(p, { y: 90 * U }, { y: 0, duration: 1 }, i * 0.08)
          .fromTo(fig, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, i * 0.08)
      })
      break
    case 'card': {
      const media = $('.card-media', el)
      tl.fromTo(media, { clipPath: 'inset(0% 0% 100% 0%)', y: 120 * U }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1, ease: 'power2.out' })
        .fromTo($('.card-cap', el), { opacity: 0, y: 12 * U }, { opacity: 1, y: 0, duration: 0.5 }, 0.55)
      const slides = $$('.slide', el)
      if (slides.length) tl.fromTo(slides, { scale: 1.3, transformOrigin: '50% 0%' }, { scale: 1, duration: 1, ease: 'power2.out' }, 0)
      break
    }
    case 'steps': {
      const wins = ['.step-a', '.step-b', '.step-c'].map(s => $(s, el))
      tl.fromTo(wins, { clipPath: 'inset(100% 0% 0% 0%)', y: 160 * U }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1, stagger: 0.22, ease: 'power2.out' })
        .fromTo(wins.map(w => $('.win-inner', w)), { scale: 1.3, transformOrigin: '50% 100%' }, { scale: 1.08, duration: 1.44, ease: 'power2.out' }, 0)
      break
    }
  }
  const [start, end] = RANGE[type]
  ScrollTrigger.create({
    trigger: VIA_PARENT.includes(type) ? el.parentElement : el,
    start, end,
    scrub: 0.8,
    animation: tl,
  })
}

/* Gentle depth: large photos drift inside their frames for the whole time they are on screen. */
function parallax() {
  gsap.fromTo('.about .win-inner img', { yPercent: -4 }, {
    yPercent: 4, ease: 'none',
    scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true },
  })
  gsap.fromTo('.footer-inner', { yPercent: -18 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  })
}

/* ---------- hero: 3D shutters opened, then closed, by the scroll ----------
   Frame 0: two closed shutters breathe in depth. Scrolling swings them in and flips
   their slats open one by one (the photo appears slice by slice) while TOITURES is
   laid letter by letter like tiles. Then the copy recedes, the small shutter flies
   past the camera, the tall one grows to full screen and flips shut to green,
   its slat backs assembling the 3D logo photo: a film title card. */
let heroTrigger = null, heroOpenEnd = () => window.innerHeight
const HERO_AR = 1328 / 1920
const END_AR = 2870 / 1472, END_AR_PORTRAIT = 1080 / 2160
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerpRect = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t })

function hero() {
  const heroEl = $('.hero'), media = $('.hero-media'), tilt = $('.hero-tilt')
  const chars = splitChars($('.hero-title'))
  const lines = splitLines($('.hero-text'))

  const panels = $$('.panel').map((el, pi) => {
    const n = +el.dataset.slats
    const slats = []
    for (let k = 0; k < n; k++) {
      const s = document.createElement('div')
      s.className = 'slat'
      s.innerHTML = '<div class="slat-face slat-front"><div class="slat-img"></div></div>'
        + '<div class="slat-face slat-back">' + (pi === 0 ? '<div class="slat-bimg"></div>' : '') + '</div>'
      el.appendChild(s)
      slats.push({ el: s, img: $('.slat-img', s), bimg: $('.slat-bimg', s), k })
    }
    el.classList.add('is-built')
    return { el, n, slats, r0: null, fromRight: pi === 0 }
  })
  const [A, B] = panels

  const st = { open: 0, sep: 0, fly: 0, exit: 0, close: 0, zoom: 0 }
  let M, V
  const layout = () => {
    panels.forEach(p => { p.el.style.left = p.el.style.top = p.el.style.width = p.el.style.height = '' })
    M = { x: media.offsetLeft, y: media.offsetTop, w: media.offsetWidth, h: media.offsetHeight }
    V = { x: -M.x, y: -M.y, w: root.clientWidth, h: window.innerHeight } // the viewport, in media coordinates
    panels.forEach(p => { p.r0 = { x: p.el.offsetLeft, y: p.el.offsetTop, w: p.el.offsetWidth, h: p.el.offsetHeight } })
    A.el.classList.toggle('is-portrait', V.w / V.h < 1.15) // a tall screen would crop the wide title card through the logo
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
  const t0 = performance.now()
  const render = () => {
    const time = (performance.now() - t0) / 1000
    const e = inOut(clamp01(st.exit))
    const k = 1 - e
    mouse.x += (mouse.tx - mouse.x) * 0.06
    mouse.y += (mouse.ty - mouse.y) * 0.06
    tilt.style.transform = `rotateX(${(-mouse.y * 5 * k).toFixed(3)}deg) rotateY(${(mouse.x * 7 * k).toFixed(3)}deg)`

    // the photo frame grows with the tall panel so the image stays continuous
    const F = lerpRect({ x: 0, y: 0, w: M.w, h: M.h }, V, e)
    const cw = Math.max(F.w, F.h * HERO_AR), ch = cw / HERO_AR
    const ix = F.x + (F.w - cw) / 2, iy = F.y + (F.h - ch) / 2

    const o = inOut(clamp01(st.open))
    const rA = lerpRect(A.r0, V, e)
    A.el.style.left = rA.x + 'px'; A.el.style.top = rA.y + 'px'
    A.el.style.width = rA.w + 'px'; A.el.style.height = rA.h + 'px'
    A.el.style.transform = `translateZ(${(-380 * (1 - o) - 50 * st.sep * k).toFixed(1)}px) rotateY(${(-26 * (1 - o)).toFixed(2)}deg) scale(${(1 + 0.06 * st.zoom).toFixed(4)})`
    // title-card image, cover-fitted in the tall panel
    const ear = A.el.classList.contains('is-portrait') ? END_AR_PORTRAIT : END_AR
    const ecw = Math.max(rA.w, rA.h * ear), ech = ecw / ear
    const ex = (rA.w - ecw) / 2, ey = (rA.h - ech) / 2
    A.el.classList.toggle('is-closing', st.close > 0.001)
    const fly = inOut(clamp01(st.fly))
    B.el.style.transform = `translate3d(${(-180 * fly).toFixed(1)}px,0,${(-380 * (1 - o) + 80 * st.sep + 560 * fly).toFixed(1)}px) rotateY(${(-20 * (1 - o) + 28 * fly).toFixed(2)}deg)`
    B.el.style.opacity = 1 - fly
    B.el.style.visibility = fly > 0.995 ? 'hidden' : ''

    const idle = 1 - clamp01(st.open * 3)
    panels.forEach((p, pi) => {
      const r = p === A ? rA : p.r0
      const sw = r.w / p.n
      p.slats.forEach(s => {
        const order = (p.fromRight ? p.n - 1 - s.k : s.k) / (p.n - 1)
        const lo = inOut(clamp01((st.open - order * 0.45) / 0.55))
        const lc = p === A ? inOut(clamp01((st.close - (s.k / (p.n - 1)) * 0.45) / 0.55)) : 0
        const ang = 180 * (1 - lo) - 180 * lc + Math.sin(time * 1.5 + s.k * 0.75 + pi * 1.7) * 8 * idle
        const z = Math.sin(lo * Math.PI) * 60 + Math.sin(lc * Math.PI) * 90
        const x = s.k * sw
        s.el.style.left = x + 'px'
        s.el.style.width = sw + 1.5 + 'px' // overlap hides hairline seams between blades
        s.el.style.transform = `translateZ(${z.toFixed(1)}px) rotateY(${ang.toFixed(2)}deg)`
        s.el.style.setProperty('--shade', (Math.abs(Math.sin(ang * Math.PI / 180)) * 0.5).toFixed(3))
        s.img.style.cssText = `left:${(ix - r.x - x).toFixed(1)}px;top:${(iy - r.y).toFixed(1)}px;width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px`
        if (s.bimg) s.bimg.style.cssText = `left:${(ex - x).toFixed(1)}px;top:${ey.toFixed(1)}px;width:${ecw.toFixed(1)}px;height:${ech.toFixed(1)}px`
      })
    })
  }

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hero', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 3.3),
      pin: true, scrub: 1, refreshPriority: 6, invalidateOnRefresh: true,
    },
  })
  tl.to('.scroll-hint', { opacity: 0, y: 12, duration: 0.2 }, 0)
    .to(st, { open: 1, duration: 1.15 }, 0)
    .fromTo($$('.nav-links li'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.07 }, 0.1)
    .fromTo(chars, { rotationX: 95, z: -120, opacity: 0, transformOrigin: '50% 100%' }, { rotationX: 0, z: 0, opacity: 1, duration: 0.7, stagger: 0.07, ease: 'back.out(1.3)' }, 0.2)
    .fromTo(['.hero-label', '.hero-loc'], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 }, 0.45)
    .fromTo(lines, { yPercent: 118 }, { yPercent: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.75)
    .fromTo('.hero-btn', { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, ease: 'power2.inOut' }, 1.05)
    .fromTo('.hero-trust p', { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.1 }, 1.2)
    .to(st, { sep: 1, duration: 0.5, ease: 'sine.inOut' }, 1.1)
    .addLabel('exit', 2)
    .to(chars, { rotationX: -90, z: 60, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power2.in' }, 'exit')
    .to(['.hero-label', '.hero-loc', '.hero-text', '.hero-cta'], { z: -300, opacity: 0, duration: 0.5, stagger: 0.04, ease: 'power2.in' }, 'exit')
    .to('.nav', { opacity: 0, y: -16, duration: 0.35 }, 'exit')
    .to(st, { fly: 1, duration: 0.6 }, 'exit')
    .to(st, { exit: 1, duration: 0.9 }, 'exit+=0.15')
    .to(st, { close: 1, duration: 0.9 }, 'exit+=1.15')
    .to(st, { zoom: 1, duration: 1.1, ease: 'sine.out' }, 'exit+=1.6') // slow push-in on the title card
  heroTrigger = tl.scrollTrigger
  heroOpenEnd = () => heroTrigger.start + ((tl.labels.exit - 0.2) / tl.duration()) * (heroTrigger.end - heroTrigger.start)

  layout()
  render()
  ScrollTrigger.addEventListener('refresh', () => { layout(); render() })
  gsap.ticker.add(() => { if (window.scrollY <= heroTrigger.end + window.innerHeight) render() })
  if (desktopMQ.matches) {
    heroEl.addEventListener('pointermove', ev => {
      mouse.tx = (ev.clientX / window.innerWidth - 0.5) * 2
      mouse.ty = (ev.clientY / window.innerHeight - 0.5) * 2
    })
    heroEl.addEventListener('pointerleave', () => { mouse.tx = mouse.ty = 0 })
  }
}

/* ---------- quick-access bar: hidden while scrolling down, back on the way up ---------- */
function quickBar() {
  const bar = $('.bar'), fab = $('.fab-call')
  let shown = false
  const show = v => {
    if (v === shown) return
    shown = v
    gsap.to(bar, { yPercent: v ? 0 : -110, duration: 0.5, ease: 'power3.out', overwrite: true })
  }
  gsap.set(bar, { yPercent: -110, y: 0 })
  bar.style.transform = ''
  ScrollTrigger.create({
    start: () => heroTrigger.end + 10, end: 'max',
    onUpdate: self => show(self.direction < 0),
    onToggle: self => { if (!self.isActive) show(false); fab.classList.toggle('is-on', self.isActive) },
  })
}

/* ---------- sur le chantier: a tilted wall of live job-site videos; the scroll pulls six
   of them out into a 3D reel the visitor flips through, the rest scatter past the camera ---------- */
function reelsScene() {
  const world = $('.reels-world'), veil = $('.reels-veil'), head = $('.reels-head'), hud = $('.reels-hud'), bar = $('.reels-bar i')
  const words = splitWords($('.reels-title'))
  const strips = $$('.reels-hud .roll-strip')
  const cards = $$('.reel').map((el, i) => ({
    el, i, v: $('video', el), chip: $('.reel-chip', el), on: false,
    j: el.dataset.cover === undefined ? -1 : +el.dataset.cover,
  }))
  const N = cards.filter(c => c.j >= 0).length
  const st = { drift: 0, g: 0, fly: 0, hud: 0, idx: 0 }
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
  let L, active = -1, near = false, loaded = false

  const layout = () => {
    const vw = root.clientWidth, vh = window.innerHeight, desk = desktopMQ.matches
    const cols = desk ? 4 : 3
    const cw = desk ? 236 * HU : vw * 0.3, ch = cw * 16 / 9
    const big = (desk ? 0.78 : 0.5) * vh / ch
    const hw = cw * big / 2
    L = {
      desk, cols, rows: Math.ceil(cards.length / cols), cw, ch, gap: desk ? 26 * HU : 10, big, hw,
      x0: desk ? vw * 0.06 : 0, y0: desk ? 0 : -vh * 0.1,
      peek: hw + cw * big * (desk ? 0.24 : 0.12), step: desk ? 150 * HU : 24,
    }
    cards.forEach(c => Object.assign(c.el.style, { width: cw + 'px', height: ch + 'px', marginLeft: -cw / 2 + 'px', marginTop: -ch / 2 + 'px' }))
  }

  // the wall: alternate columns drift up and down, half a card apart
  const wallPos = c => {
    const col = c.i % L.cols, row = Math.floor(c.i / L.cols), dir = col % 2 ? 1 : -1
    return {
      x: (col - (L.cols - 1) / 2) * (L.cw + L.gap),
      y: (row - (L.rows - 1) / 2) * (L.ch + L.gap) + (col % 2 ? (L.ch + L.gap) / 2 : 0) + dir * (st.drift - 0.5) * L.ch * 0.9,
      z: 0, ry: 0, s: 1, o: 1, py: dir * (st.drift - 0.5) * -12, px: 0,
    }
  }
  // the reel: upcoming clips stack to the right in depth, played ones slide out left
  const coverPos = d => {
    const a = Math.abs(d), n = Math.min(a, 1), far = Math.max(0, d - 1)
    if (d >= 0) return {
      x: L.x0 + n * L.peek + far * L.step, y: L.y0, z: -n * 260 - far * 140,
      ry: -n * 30, s: L.big * (1 - 0.32 * n - 0.06 * far), o: clamp01(3.4 - d), py: 0, px: -Math.min(d, 1.5) * 8,
    }
    return { x: L.x0 + d * L.hw * 2.6, y: L.y0, z: -n * 120, ry: n * 24, s: L.big * (1 - 0.12 * n), o: clamp01(1 - a * 1.7), py: 0, px: n * 8 }
  }

  const load = () => {
    if (loaded) return
    loaded = true
    cards.forEach(c => { c.v.preload = 'auto'; c.v.src = c.v.dataset.src })
  }

  const render = () => {
    mouse.x += (mouse.tx - mouse.x) * 0.06
    mouse.y += (mouse.ty - mouse.y) * 0.06
    const e = inOut(clamp01(st.g)), k = 1 - e
    world.style.transform = `translate3d(0, ${(6 * k).toFixed(2)}vh, ${(-150 * k).toFixed(1)}px) rotateX(${(24 * k - mouse.y * 3 * e).toFixed(2)}deg) rotateY(${(mouse.x * 5 * e).toFixed(2)}deg) rotateZ(${(-12 * k).toFixed(2)}deg) scale(${(1.3 - 0.3 * e).toFixed(4)})`
    veil.style.opacity = (1 - 0.7 * e).toFixed(3)
    const f = inOut(clamp01(st.fly))
    head.style.opacity = (1 - f).toFixed(3)
    head.style.transform = `scale(${(1 + 1.6 * f).toFixed(4)})`
    hud.style.opacity = st.hud.toFixed(3)
    bar.style.transform = `scaleX(${(st.idx / (N - 1)).toFixed(4)})`
    const idxR = Math.round(st.idx)
    if (idxR !== active) {
      active = idxR
      strips.forEach(s => gsap.to(s, { yPercent: -idxR * 100 / N, duration: 0.6, ease: 'power3.out', overwrite: true }))
    }

    cards.forEach(c => {
      const w = wallPos(c)
      let p
      if (c.j >= 0) {
        const cv = coverPos(c.j - st.idx)
        p = {}
        for (const key in w) p[key] = w[key] + (cv[key] - w[key]) * e
      } else {
        const sc = inOut(clamp01(st.g * 1.25)) // the others fly apart, past the camera
        p = { ...w, x: w.x * (1 + 1.6 * sc), y: w.y * (1 + 1.1 * sc), z: 900 * sc, o: 1 - clamp01(sc * 1.4) }
      }
      c.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, ${p.z.toFixed(1)}px) rotateY(${p.ry.toFixed(2)}deg) scale(${p.s.toFixed(4)})`
      c.el.style.opacity = p.o.toFixed(3)
      c.el.style.visibility = p.o < 0.01 ? 'hidden' : ''
      c.v.style.transform = `translate3d(${p.px.toFixed(2)}%, ${p.py.toFixed(2)}%, 0) scale(1.18)` // parallax inside the frame
      const d = c.j >= 0 ? Math.abs(c.j - st.idx) : 9
      c.chip.style.opacity = (e * (1 - Math.min(d, 1))).toFixed(3)
      c.chip.style.transform = `scale(${(1 / p.s).toFixed(4)})` // the card is scaled up: keep the tag at its real size
      const want = near && p.o > 0.05 && (e < 0.5 || d < 1.6)
      if (want !== c.on) {
        c.on = want
        if (want) c.v.play().catch(() => {})
        else c.v.pause()
      }
    })
  }

  layout()
  const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: render })
  tl.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' }, 0)
    .fromTo('.reels-head .kicker', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0)
    .to(st, { drift: 1, duration: 2.4 }, 0)
    .to(st, { fly: 1, duration: 0.5 }, 1.1)
    .to(st, { g: 1, duration: 1.1 }, 1.2)
    .to(st, { hud: 1, duration: 0.3 }, 2.1)
    .to(st, { idx: N - 1, duration: 3.8 }, 2.4)
    .to({}, { duration: 0.3 })
  const pinST = ScrollTrigger.create({
    animation: tl, trigger: '.reels', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 4.4),
    pin: true, scrub: 1, refreshPriority: 5.5, invalidateOnRefresh: true,
  })
  // videos only download and play while the pinned scene is around the viewport
  ScrollTrigger.create({
    start: () => pinST.start - window.innerHeight * 1.8, end: () => pinST.end + window.innerHeight,
    onToggle: self => { near = self.isActive; if (near) load(); render() },
  })
  render()
  ScrollTrigger.addEventListener('refresh', () => { layout(); render() })
  gsap.ticker.add(() => { if (near) render() })
  if (desktopMQ.matches) {
    $('.reels-stage').addEventListener('pointermove', ev => {
      mouse.tx = (ev.clientX / window.innerWidth - 0.5) * 2
      mouse.ty = (ev.clientY / window.innerHeight - 0.5) * 2
    })
  }
}

/* ---------- services: pinned horizontal strip ---------- */
// Pin start offset keeps the strip (and its hover caption) inside short viewports.
function pinOffset(top, bottom) {
  const vh = window.innerHeight
  return Math.max(0, Math.min(bottom * U - vh, top * U))
}

function servicesStrip() {
  const track = $('.track')
  const dist = () => Math.max(0, track.scrollWidth - root.clientWidth)
  const stripTween = gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.services',
      start: () => `top+=${desktopMQ.matches ? pinOffset(146, 880) : 0} top`,
      end: () => '+=' + dist(),
      pin: true,
      scrub: 0.8,
      refreshPriority: 5,
      invalidateOnRefresh: true,
    },
  })

  // Hover: the photo opens wider and taller, the caption slides in underneath
  $$('.t-img').forEach(item => {
    const fig = $('.t-fig', item), cap = $('.t-cap', item)
    gsap.set(cap, { y: 10 })
    if (!desktopMQ.matches) {
      // touch: the caption slides in as the photo reaches the middle of the screen
      gsap.fromTo(cap, { opacity: 0, y: 14 }, {
        opacity: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: item, containerAnimation: stripTween, start: 'left 85%', end: 'left 45%', scrub: 0.6 },
      })
    }
    item.addEventListener('mouseenter', () => {
      if (!desktopMQ.matches) return
      gsap.to(fig, { left: -14 * U, right: -14 * U, bottom: -73 * U, duration: 0.75, ease: 'power3.out', overwrite: 'auto' })
      gsap.to(cap, { opacity: 1, y: 0, duration: 0.6, delay: 0.12, ease: 'power3.out', overwrite: 'auto' })
    })
    item.addEventListener('mouseleave', () => {
      gsap.to(fig, { left: 0, right: 0, bottom: 0, duration: 0.7, ease: 'power3.inOut', overwrite: 'auto' })
      gsap.to(cap, { opacity: 0, y: 10, duration: 0.35, overwrite: 'auto' })
    })
  })
}

/* ---------- testimonial: scroll fills the quote word by word ---------- */
function quoteFill() {
  const words = $$('.quote .wd-fill')
  gsap.fromTo(words, { color: '#a2a2a2' }, {
    color: '#0b0b0b',
    ease: 'none',
    stagger: 0.12,
    duration: 0.25,
    scrollTrigger: desktopMQ.matches
      ? { trigger: '.review', start: () => `top+=${pinOffset(166, 905)} top`, end: () => '+=' + Math.round(window.innerHeight * 0.9), pin: true, scrub: 0.6, refreshPriority: 1, invalidateOnRefresh: true }
      : { trigger: '.quote', start: 'top 70%', end: 'bottom 45%', scrub: 0.6 },
  })
}

/* ---------- portfolio cards: hover panel + slider ---------- */
function cards() {
  $$('.card').forEach(card => {
    const media = $('.card-media', card)
    const panel = $('.card-panel', card)
    const slides = $$('.slide', card)
    const idx = $('.pager-i', card)
    if (!slides.length) return
    $('.pager-n', card).textContent = slides.length
    let i = 0, busy = false

    if (desktopMQ.matches && !reduce) gsap.set(panel, { yPercent: 101 })
    else if (!reduce) {
      // touch: no hover, so the black panel slides up with the scroll instead
      gsap.fromTo(panel, { yPercent: 101 }, { yPercent: 0, ease: 'power2.out', scrollTrigger: { trigger: media, start: 'top 75%', end: 'top 30%', scrub: 0.6 } })
    }
    media.addEventListener('mouseenter', () => desktopMQ.matches && gsap.to(panel, { yPercent: 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto' }))
    media.addEventListener('mouseleave', () => desktopMQ.matches && gsap.to(panel, { yPercent: 101, duration: 0.6, ease: 'power3.inOut', overwrite: 'auto' }))

    const go = dir => {
      if (busy) return
      busy = true
      const next = (i + dir + slides.length) % slides.length
      const cur = slides[i], nx = slides[next]
      nx.classList.add('is-current')
      gsap.set(cur, { zIndex: 1 })
      gsap.set(nx, { zIndex: 2, scale: 1, clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)', xPercent: dir > 0 ? 14 : -14 })
      gsap.to(nx, { clipPath: 'inset(0% 0% 0% 0%)', xPercent: 0, duration: 1.05, ease: 'power3.inOut' })
      gsap.to(cur, {
        xPercent: dir > 0 ? -14 : 14, duration: 1.05, ease: 'power3.inOut',
        onComplete: () => { cur.classList.remove('is-current'); gsap.set(cur, { xPercent: 0, zIndex: 0 }); busy = false },
      })
      idx.textContent = next + 1
      i = next
    }
    $('.arrow-next', card).addEventListener('click', () => go(1))
    $('.arrow-prev', card).addEventListener('click', () => go(-1))
  })
}

/* ---------- pourquoi nous: camera flight between floating photo cards ---------- */
function whyFlight() {
  const stage = $('.why-stage'), world = $('.why-world'), ghost = $('.why-ghost'), strip = $('.why-strip')
  const cards = $$('.why-card').map((el, i) => ({ el, img: $('img', el), i }))
  const N = cards.length
  const D = 1500, D0 = 700 // depth gap between cards, depth of the first card
  const XS = [-0.23, 0.22, -0.2, 0.21, 0], YS = [-0.03, 0.04, 0.01, -0.04, 0.02]
  const total = D0 + (N - 1) * D // the last card lands on the screen plane
  const state = { z: 0 }
  let active = -1

  const layout = () => {
    const vw = root.clientWidth, vh = window.innerHeight
    const k = desktopMQ.matches ? 1 : 0.55 // narrower spread on phones
    cards.forEach(c => {
      c.z = -(D0 + c.i * D)
      gsap.set(c.el, { x: XS[c.i] * vw * k, y: YS[c.i] * vh, z: c.z, rotateY: -XS[c.i] * 34, xPercent: -50, yPercent: -55 })
    })
  }

  const render = () => {
    const p = state.z / total
    // camera pan: move the vanishing point rather than rotating the world (deep cards would swing off-screen)
    gsap.set(world, { z: state.z })
    stage.style.perspectiveOrigin = `${50 + Math.sin(p * Math.PI * 2) * 7}% ${46 - Math.sin(p * Math.PI) * 4}%`
    gsap.set(ghost, { scale: 0.85 + p * 0.5, opacity: 1 - p * 0.75 })
    cards.forEach(c => {
      const vz = state.z + c.z // depth as seen by the camera
      const fadeIn = gsap.utils.clamp(0, 1, (vz + 2.6 * D) / (0.8 * D))
      const fadeOut = gsap.utils.clamp(0, 1, 1 - (vz - 260) / 520)
      const o = Math.min(fadeIn, fadeOut)
      gsap.set(c.el, { opacity: o, visibility: o > 0.01 ? 'visible' : 'hidden' })
      gsap.set(c.img, { yPercent: gsap.utils.clamp(-1, 1, vz / D) * -5 })
    })
    const idx = gsap.utils.clamp(0, N - 1, Math.round((state.z - D0) / D))
    if (idx !== active) {
      active = idx
      gsap.to(strip, { yPercent: -idx * 20, duration: 0.6, ease: 'power3.out', overwrite: true })
    }
  }

  layout()
  render()
  ScrollTrigger.addEventListener('refreshInit', () => { layout() })
  gsap.to(state, {
    z: total, ease: 'none', onUpdate: render,
    scrollTrigger: {
      trigger: '.why', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * N * 0.85),
      pin: true, scrub: 1, refreshPriority: 4, invalidateOnRefresh: true, onRefresh: render,
    },
  })
}

/* ---------- zone: map drawn by the scroll ---------- */
const HOME = [49.1788, 3.1289]
// Order and names as on the client's previous site
const TOWNS = [
  ['Compiègne', 49.4179, 2.8261], ['Soissons', 49.3817, 3.3236], ['Fère-en-Tardenois', 49.2, 3.5167],
  ['Château-Thierry', 49.0464, 3.4031], ['Crépy-en-Valois', 49.2344, 2.8889], ['Villers-Cotterêts', 49.2533, 3.0906],
  ['La Ferté-sous-Jouarre', 48.95, 3.1278], ['Braine', 49.3428, 3.5328], ['Charly-sur-Marne', 48.9775, 3.2842],
  ['Meaux', 48.9606, 2.8786], ['Ermenonville', 49.1269, 2.6953],
]
const KM = 100 / 46 // svg units per kilometre

/* The map is a physical plate in 3D: the camera starts straight above the workshop,
   pulls back and tilts it, the rings ripple out, then the plate orbits while each
   town rises as a pin whose label always faces the camera. */
function zone() {
  const svg = $('.map'), pinsBox = $('.zone-pins'), list = $('.zone-towns'), num = $('.zone-num')
  const NS = 'http://www.w3.org/2000/svg'
  const add = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag)
    for (const k in attrs) e.setAttribute(k, attrs[k])
    parent.appendChild(e)
    return e
  }
  const kx = 111.32 * Math.cos(HOME[0] * Math.PI / 180), ky = 110.57

  const rings = [10, 20, 30, 40].map(km => add('circle', { class: 'ring', cx: 0, cy: 0, r: km * KM }))
  const pts = []
  for (let k = 0; k < 90; k++) {
    const a = (k / 90) * Math.PI * 2
    const km = 40 + 3.2 * Math.sin(3 * a + 0.6) + 2.2 * Math.sin(5 * a + 1.3) + 1.2 * Math.sin(8 * a + 2)
    pts.push([Math.cos(a) * km * KM, Math.sin(a) * km * KM])
  }
  const blob = add('path', { class: 'blob', d: 'M' + pts.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L') + 'Z' })

  const makePin = (name, x, y, h, home = false) => {
    const pin = document.createElement('div')
    pin.className = 'pin' + (home ? ' pin--home' : '')
    pin.style.left = (x + 100) / 2 + '%'
    pin.style.top = (y + 100) / 2 + '%'
    pin.innerHTML = `<span class="pin-dot"></span><div class="pin-b" style="--h:calc(var(--u) * ${h})"><span class="pin-label">${name}</span><span class="pin-stem"></span></div>`
    pinsBox.appendChild(pin)
    return { b: $('.pin-b', pin), stem: $('.pin-stem', pin), label: $('.pin-label', pin), dot: $('.pin-dot', pin) }
  }

  const towns = TOWNS.map(([name, lat, lon]) => {
    const x = (lon - HOME[1]) * kx * KM, y = -(lat - HOME[0]) * ky * KM
    const ray = add('line', { class: 'ray', x1: 0, y1: 0, x2: x.toFixed(2), y2: y.toFixed(2) })
    const li = document.createElement('li')
    li.textContent = name
    list.appendChild(li)
    return { name, x, y, dist: Math.hypot(x, y), ray }
  })
  // alternate pin heights by horizontal order so neighbouring labels never collide
  towns.slice().sort((a, b) => a.x - b.x).forEach((t, i) => { Object.assign(t, makePin(t.name, t.x, t.y, i % 2 ? 150 : 82)) })
  add('circle', { class: 'home-pulse', cx: 0, cy: 0, r: 2.4 })
  add('circle', { class: 'home', cx: 0, cy: 0, r: 2.4 })
  const home = makePin('La Ferté-Milon', 0, 0, desktopMQ.matches ? 230 : 150, true)

  const boards = [home.b, ...towns.map(t => t.b)]
  gsap.set(boards, { xPercent: -50 })
  const state = { tilt: 0, spin: 0, scale: 1.9, min: 0 }
  const render = () => {
    gsap.set('.zone-tilt', { rotationX: state.tilt, scale: state.scale })
    gsap.set('.zone-plate', { rotation: state.spin })
    gsap.set(boards, { rotation: -state.spin, rotationX: -state.tilt }) // billboards face the camera
    num.textContent = String(Math.round(state.min)).padStart(2, '0')
  }

  // Label solver: put the camera in its final position, then give every pin the
  // shortest stem whose label clears the labels already placed (screen space).
  Object.assign(state, { tilt: 56, spin: -46, scale: 1, min: 60 })
  render()
  const placed = [home.label.getBoundingClientRect()]
  const hit = (r, o) => !(r.right + 8 < o.left || r.left - 8 > o.right || r.bottom + 6 < o.top || r.top - 6 > o.bottom)
  towns.slice().sort((a, b) => a.dist - b.dist).forEach(t => {
    let rect
    for (const h of desktopMQ.matches ? [70, 110, 150, 190, 230, 270] : [40, 64, 88, 112, 136]) {
      t.b.style.setProperty('--h', `calc(var(--u) * ${h})`)
      rect = t.label.getBoundingClientRect()
      if (!placed.some(o => hit(rect, o))) break
    }
    placed.push(rect)
  })
  if (reduce) return
  Object.assign(state, { tilt: 0, spin: 0, scale: 1.9, min: 0 })
  render()

  const tl = gsap.timeline({ defaults: { ease: 'power2.out' }, onUpdate: render })
  tl.to(state, { scale: 1, tilt: 56, duration: 1.1, ease: 'power2.inOut' }, 0)
    .to(state, { spin: -14, duration: 1.1, ease: 'power1.inOut' }, 0)
    .to(state, { spin: -46, duration: 2, ease: 'none' }, 1.1)
    .to(state, { min: 60, duration: 1.5, ease: 'power1.inOut' }, 0)
  rings.forEach((r, i) => {
    const L = r.getTotalLength()
    tl.fromTo(r, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.55, ease: 'power1.inOut' }, 0.15 + i * 0.18)
  })
  const BL = blob.getTotalLength()
  tl.fromTo(blob, { strokeDasharray: BL, strokeDashoffset: BL, fillOpacity: 0 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power1.inOut' }, 0.7)
    .to(blob, { fillOpacity: 0.14, duration: 0.4 }, 1.35)
    .fromTo(home.stem, { scaleY: 0 }, { scaleY: 1, duration: 0.3, ease: 'back.out(2)' }, 0.25)
    .fromTo(home.label, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25 }, 0.4)
  towns.slice().sort((a, b) => a.dist - b.dist).forEach((t, i) => {
    const at = 1.2 + i * 0.14
    const L = t.ray.getTotalLength()
    tl.fromTo(t.ray, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.25 }, at)
      .fromTo(t.dot, { scale: 0 }, { scale: 1, duration: 0.15, ease: 'back.out(3)' }, at + 0.18)
      .fromTo(t.stem, { scaleY: 0 }, { scaleY: 1, duration: 0.3, ease: 'back.out(1.6)' }, at + 0.2)
      .fromTo(t.label, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.22 }, at + 0.32)
  })
  tl.to({}, { duration: 0.35 })
  render()

  ScrollTrigger.create({
    animation: tl, trigger: '.zone', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 2.3),
    pin: true, scrub: 1, refreshPriority: 3, invalidateOnRefresh: true,
  })
}

/* ---------- de A à Z: a face-down deck stands up, fans out and flips ---------- */
function azDeck() {
  const cards = $$('.az-card')
  const flips = cards.map(c => $('.az-flip', c))
  const mid = (cards.length - 1) / 2
  const desk = () => desktopMQ.matches
  const tilt = [-4, 3, -2, 5, -1]

  const tl = gsap.timeline()
  tl.fromTo(cards,
    { x: i => (i - mid) * 3, y: () => 110 * U, z: i => i * 6, rotateX: 66, rotateY: 0, rotateZ: i => tilt[i], scale: 0.8 },
    { y: 0, rotateX: 0, rotateZ: 0, scale: 1, duration: 1, ease: 'power2.inOut', stagger: 0.04 })
    .to(cards, {
      // desktop: a fan held in the hand; phone: dealt down the table in a vertical spread
      x: i => (desk() ? (i - mid) * 262 : (i % 2 ? 18 : -18)) * U,
      y: i => (desk() ? Math.abs(i - mid) * 26 : (i - mid) * 112) * U,
      z: i => (desk() ? -Math.abs(i - mid) * 40 : 0),
      rotateZ: i => (desk() ? (i - mid) * 7 : (i % 2 ? 3 : -3)),
      rotateY: i => (desk() ? (i - mid) * -6 : 0),
      duration: 1.2, ease: 'power3.inOut', stagger: { each: 0.06, from: 'center' },
    }, 1)
    .fromTo(flips, { rotateY: 180 }, { rotateY: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.14 }, 1.5)
    .to({}, { duration: 0.4 })

  ScrollTrigger.create({
    animation: tl, trigger: '.az', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 2.4),
    pin: true, scrub: 1, refreshPriority: 2, invalidateOnRefresh: true,
  })
}

/* ---------- smooth scroll ---------- */
function smoothScroll() {
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(t => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href')
    if (id.length < 2) return
    const target = $(id)
    if (!target) return
    e.preventDefault()
    lenis.scrollTo(target, { duration: 1.6 })
  }))
  // "Faites défiler" opens the shutters and stops on the finished hero, before the exit
  $('.scroll-hint').addEventListener('click', () => lenis.scrollTo(heroOpenEnd(), { duration: 2.4 }))
}

/* ---------- boot ---------- */
async function boot() {
  await document.fonts.ready

  if (reduce) {
    root.classList.add('is-ready')
    zone()
    cards()
    return
  }

  hero()
  quickBar()
  reelsScene()
  zone()
  $$('[data-split]').forEach(el => { if (!el.closest('.hero')) reveal(el, el.dataset.split) })
  $$('[data-reveal]').forEach(el => reveal(el, el.dataset.reveal))
  servicesStrip()
  quoteFill()
  whyFlight()
  azDeck()
  parallax()
  cards()
  smoothScroll()

  root.classList.add('is-ready')
  ScrollTrigger.refresh()

  // Desktop and mobile use different layouts: rebuild from scratch when crossing the breakpoint.
  desktopMQ.addEventListener('change', () => location.reload())
  window.addEventListener('resize', setUnit)
}

boot()
