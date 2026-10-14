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
let U = 1
function setUnit() {
  U = root.clientWidth / (desktopMQ.matches ? 1440 : 390)
  root.style.setProperty('--u', U + 'px')
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
  if (!el.dataset.text) el.dataset.text = el.textContent.trim().replace(/\s*\n\s*/g, ' ')
  const parts = el.dataset.text.split(/[ \t\n]+/)
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
  const lines = rows.map(row => {
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
  return { lines, words }
}

/* ---------- reveal registry ---------- */
// Each entry: { el, type, parts, done }
const reveals = []

function prepare(el, type) {
  const r = { el, type, parts: null, done: false }
  switch (type) {
    case 'chars':
      r.parts = splitChars(el)
      gsap.set(r.parts, { yPercent: 110 })
      break
    case 'words':
      r.parts = splitWords(el)
      gsap.set(r.parts, { yPercent: 118 })
      break
    case 'lines':
      r.parts = splitLines(el, el.hasAttribute('data-fill') ? 'wd-fill' : '').lines
      gsap.set(r.parts, { yPercent: 118 })
      break
    case 'fade-lines':
      r.parts = splitLines(el).lines
      gsap.set(r.parts, { opacity: 0 })
      break
    case 'stagger-fade':
      r.parts = [...el.children]
      gsap.set(r.parts, { opacity: 0, y: 6 })
      break
    case 'lines-list':
      r.parts = [...el.children].map(li => {
        li.innerHTML = `<span class="line-mask"><span class="line-inner">${li.innerHTML}</span></span>`
        return $('.line-inner', li)
      })
      gsap.set(r.parts, { yPercent: 118 })
      break
    case 'img':
      gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)', y: 90 * U })
      gsap.set($('img', el), { scale: 1.25, transformOrigin: '50% 100%' })
      break
    case 'rule':
      gsap.set(el, { scaleX: 0 })
      break
    case 'btn':
      gsap.set(el, { clipPath: 'inset(0% 50% 0% 50%)' })
      break
    case 'avatar':
      gsap.set(el, { scale: 0 })
      break
    case 'thumbs':
      r.parts = [...el.children]
      gsap.set(r.parts, { clipPath: 'inset(0% 0% 100% 0%)' })
      break
    case 'track':
      r.parts = [...el.children]
      gsap.set(r.parts, { y: 70 * U })
      gsap.set(r.parts.map(p => p.querySelector('.t-fig') || p), { clipPath: 'inset(0% 0% 100% 0%)' })
      break
    case 'card':
      r.parts = [$('.card-media', el), $('.card-cap', el)]
      gsap.set(r.parts[0], { clipPath: 'inset(0% 0% 100% 0%)', y: 80 * U })
      gsap.set($$('.slide', el), { scale: 1.2, transformOrigin: '50% 0%' })
      gsap.set(r.parts[1], { opacity: 0 })
      break
    case 'steps':
      r.parts = ['.step-a', '.step-b', '.step-c'].map(s => $(s, el))
      gsap.set(r.parts, { clipPath: 'inset(100% 0% 0% 0%)', y: 140 * U })
      gsap.set(r.parts.map(p => $('.win-inner', p)), { scale: 1.18, transformOrigin: '50% 100%' })
      break
  }
  reveals.push(r)
  return r
}

function play(r) {
  if (r.done) return
  r.done = true
  const { el, type, parts } = r
  const E = 'expo.out'
  switch (type) {
    case 'chars':
      gsap.to(parts, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.075 })
      break
    case 'words':
      gsap.to(parts, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.07 })
      break
    case 'lines':
      gsap.to(parts, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.09 })
      break
    case 'fade-lines':
      gsap.to(parts, { opacity: 1, duration: 0.9, ease: 'power2.out', stagger: 0.09, delay: 0.15 })
      break
    case 'stagger-fade':
      gsap.to(parts, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08, delay: 0.1 })
      break
    case 'lines-list':
      gsap.to(parts, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.07 })
      break
    case 'img':
      gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.5, ease: E })
      gsap.to($('img', el), { scale: 1, duration: 1.8, ease: E })
      break
    case 'rule':
      gsap.to(el, { scaleX: 1, duration: 1.4, ease: 'power3.inOut' })
      break
    case 'btn':
      gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power3.inOut', delay: 0.2, clearProps: 'clipPath' })
      break
    case 'avatar':
      gsap.to(el, { scale: 1, duration: 1, ease: 'power3.out' })
      break
    case 'thumbs':
      gsap.to(parts, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut', stagger: 0.1, delay: 0.2 })
      break
    case 'track':
      parts.forEach((p, i) => {
        const fig = p.querySelector('.t-fig') || p
        gsap.to(p, { y: 0, duration: 1.3, ease: E, delay: i * 0.07 })
        gsap.to(fig, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: E, delay: i * 0.07, clearProps: 'clipPath' })
      })
      break
    case 'card': {
      const i = $$('.card').indexOf(el)
      gsap.to(parts[0], { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.4, ease: E, delay: i * 0.12, clearProps: 'clipPath' })
      gsap.to($$('.slide', el), { scale: 1, duration: 1.8, ease: E, delay: i * 0.12 })
      gsap.to(parts[1], { opacity: 1, duration: 0.8, delay: 0.5 + i * 0.12 })
      break
    }
    case 'steps':
      gsap.to(parts, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.6, ease: E, stagger: 0.16 })
      gsap.to(parts.map(p => $('.win-inner', p)), { scale: 1, duration: 2, ease: E, stagger: 0.16 })
      break
  }
}

/* ---------- hero intro ---------- */
function intro(heroChars, heroLines) {
  const tl = gsap.timeline({ delay: 0.1 })
  const winA = $('.hero .win-a'), winB = $('.hero .win-b')
  tl.fromTo(winA, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power2.out' }, 0)
    .fromTo($('.win-inner', winA), { yPercent: -16 }, { yPercent: 0, duration: 1.8, ease: 'power2.out' }, 0)
    .fromTo(winB, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power2.out' }, 0.12)
    .fromTo($('.win-inner', winB), { yPercent: 12 }, { yPercent: 0, duration: 1.8, ease: 'power2.out' }, 0.12)
    .fromTo(['.nav .logo-mark', ...$$('.nav .logo-w'), ...$$('.nav-links li'), '.nav-contact'],
      { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.out', stagger: 0.1 }, 0.1)
    .to(heroChars, { yPercent: 0, duration: 1.15, ease: 'power4.out', stagger: 0.085 }, 0.15)
    .fromTo(['.hero-label', '.hero-loc'], { opacity: 0 }, { opacity: 1, duration: 0.9, stagger: 0.12 }, 0.45)
    .to(heroLines, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.1 }, 0.7)
    .fromTo('.hero-btn', { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.inOut', clearProps: 'clipPath' }, 0.95)
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
  gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.services',
      start: () => `top+=${desktopMQ.matches ? pinOffset(146, 880) : 0} top`,
      end: () => '+=' + dist(),
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  })

  // Hover: the photo opens wider and taller, the caption slides in underneath
  $$('.t-img').forEach(item => {
    const fig = $('.t-fig', item), cap = $('.t-cap', item)
    gsap.set(cap, { y: 10 })
    item.addEventListener('mouseenter', () => {
      if (!desktopMQ.matches) return
      gsap.to(fig, { left: -28 * U, right: -28 * U, bottom: -73 * U, duration: 0.75, ease: 'power3.out', overwrite: 'auto' })
      gsap.to(cap, { opacity: 1, y: 0, duration: 0.6, delay: 0.12, ease: 'power3.out', overwrite: 'auto' })
    })
    item.addEventListener('mouseleave', () => {
      gsap.to(fig, { left: 0, right: 0, bottom: 0, duration: 0.7, ease: 'power3.inOut', overwrite: 'auto' })
      gsap.to(cap, { opacity: 0, y: 10, duration: 0.35, overwrite: 'auto' })
    })
  })
}

/* ---------- testimonial: scroll fills the quote word by word ---------- */
let fillTrigger = null
function quoteFill() {
  fillTrigger?.scrollTrigger?.kill()
  fillTrigger?.kill()
  const words = $$('.quote .wd-fill')
  gsap.set(words, { color: '#a2a2a2' })
  const desk = desktopMQ.matches
  fillTrigger = gsap.to(words, {
    color: '#0b0b0b',
    ease: 'none',
    stagger: 0.12,
    duration: 0.25,
    scrollTrigger: desk
      ? { trigger: '.review', start: () => `top+=${pinOffset(166, 905)} top`, end: () => '+=' + Math.round(window.innerHeight * 0.9), pin: true, scrub: 0.6, invalidateOnRefresh: true }
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
    let i = 0, busy = false

    if (desktopMQ.matches && !reduce) gsap.set(panel, { yPercent: 101 })
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
}

/* ---------- boot ---------- */
async function boot() {
  await document.fonts.ready

  if (reduce) {
    root.classList.add('is-ready')
    cards()
    return
  }

  const hero = $('.hero')
  const heroTitle = prepare($('.hero-title'), 'chars')
  const heroText = prepare($('.hero-text'), 'lines')
  heroTitle.done = heroText.done = true

  $$('[data-split]').forEach(el => { if (!hero.contains(el)) prepare(el, el.dataset.split) })
  $$('[data-reveal]').forEach(el => prepare(el, el.dataset.reveal))

  root.classList.add('is-ready')
  intro(heroTitle.parts, heroText.parts)

  // Elements hidden by their own clip-path / scale(0) never report an intersection,
  // so those are watched through their parent.
  const watched = new Map()
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return
      watched.get(en.target).forEach(play)
      io.unobserve(en.target)
    })
  }, { threshold: 0.12 })
  reveals.filter(r => !r.done).forEach(r => {
    const target = ['img', 'btn', 'rule', 'avatar'].includes(r.type) ? r.el.parentElement : r.el
    if (!watched.has(target)) { watched.set(target, []); io.observe(target) }
    watched.get(target).push(r)
  })

  smoothScroll()
  servicesStrip()
  cards()
  quoteFill()

  gsap.fromTo('.footer-inner', { yPercent: -32 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  })

  // Re-measure line splits when the width changes (height-only changes are ignored).
  let lastW = root.clientWidth, t
  window.addEventListener('resize', () => {
    if (root.clientWidth === lastW) return
    lastW = root.clientWidth
    setUnit()
    clearTimeout(t)
    t = setTimeout(() => {
      reveals.filter(r => r.type === 'lines' || r.type === 'fade-lines').forEach(r => {
        const fill = r.el.hasAttribute('data-fill')
        r.parts = splitLines(r.el, fill ? 'wd-fill' : '').lines
        if (r.type === 'lines') gsap.set(r.parts, { yPercent: r.done ? 0 : 118 })
        else gsap.set(r.parts, { opacity: r.done ? 1 : 0 })
      })
      quoteFill()
      ScrollTrigger.refresh()
    }, 180)
  })
}

boot()
