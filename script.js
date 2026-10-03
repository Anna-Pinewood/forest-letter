(() => {
  'use strict';
  const chapters = [
    { title: 'ГЛАВА ПЕРВАЯ', heading: 'О том, что ты', plate: 'Илл. I', caption: 'Гриб-трудовiк', image: 'mushrooms.jpg', alt: 'Мухоморы среди мха, папоротников и осенних листьев.', lines: ['мягкий и терпеливый человек', 'обладаешь спокойным темпераментом'] },
    { title: 'ГЛАВА ВТОРАЯ', heading: 'О том, что ты', plate: 'Илл. II', caption: 'Варху́шки', image: 'chanterelles.jpg', alt: 'Золотистые лисички среди папоротников и дубовых листьев.', lines: ['можешь сидеть и сконцентрированно работать ЧАСАМИ', 'красивый и с блестящими волосами'] },
    { title: 'ГЛАВА ТРЕТЬЯ', heading: 'О том, что', plate: 'Илл. III', caption: 'Споры', image: 'brackets.jpg', alt: 'Веерообразные древесные грибы с разноцветными кольцами на мшистом пне.', lines: ['ты обладаешь приятным голосом', 'лес на твоей стороне'] },
    { title: 'ПОСЛЕДНЯЯ СТРАНИЦА', heading: '', plate: 'Таблица IV', caption: 'Med bästa hälsningar', image: 'porcini.jpg', alt: 'Боровики с каштановыми шляпками среди мха и золотых листьев.', ending: true, lines: ['грибы наблюдали за тобой год и желают тебе счастья'] },
  ];
  // Load the other plates before their pages turn, including when opened offline.
  chapters.forEach(chapter => { const image = new Image(); image.src = 'assets/' + chapter.image; });
  const $ = id => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const book = $('book');
  let current = 0, opened = false, paused = reducedMotion.matches, turning = false, finished = false;
  let elapsed = 0, lastTime = 0, frame = 0, generation = 0;
  const firstReveal = 650, secondReveal = 3600, pageDuration = 10100;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  function renderPage(index) {
    current = index;
    const chapter = chapters[index];
    book.dataset.page = index;
    $('chapterLabel').textContent = chapter.title;
    $('pageHeading').textContent = chapter.heading;
    $('pageHeading').hidden = !chapter.heading;
    const art = 'url("assets/' + chapter.image + '")';
    const rightPage = document.querySelector('.spread .page-right');
    rightPage.style.setProperty('--page-art', art);
    rightPage.classList.toggle('closing-page', Boolean(chapter.ending));
    $('botanical').src = 'assets/' + chapter.image;
    $('botanical').alt = chapter.alt;
    $('plateNumber').textContent = chapter.plate;
    $('plateCaption').textContent = chapter.caption;
    $('leftNumber').textContent = 2 + index * 2;
    $('rightNumber').textContent = 3 + index * 2;
    $('words').replaceChildren(...chapter.lines.map((text, i) => {
      const paragraph = document.createElement('p');
      paragraph.className = 'phrase' + (index === 2 && i === 1 ? ' finale' : '') + (chapter.ending ? ' wish' : '');
      paragraph.dataset.text = text;
      return paragraph;
    }));
    elapsed = 0;
    finished = false;
    if (reducedMotion.matches) reveal(2);
    updateControls();
  }

  function reveal(count) {
    [...$('words').children].slice(0, count).forEach(line => {
      if (!line.classList.contains('visible')) {
        line.textContent = line.dataset.text;
        // Separate DOM insertion from the transition for a gentle text reveal.
        line.getBoundingClientRect();
        line.classList.add('visible');
      }
    });
  }

  function updateControls() {
    $('previous').disabled = current === 0 || turning;
    $('next').disabled = current === chapters.length - 1 || turning;
    document.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
      dot.disabled = turning;
      if (i === current) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    $('pause').innerHTML = paused ? '▷ <span>Продолжить</span>' : 'Ⅱ <span>Пауза</span>';
    $('pause').setAttribute('aria-label', paused ? 'Продолжить историю' : 'Приостановить историю');
    $('pause').disabled = finished;
    $('hint').textContent = finished ? 'теперь ты знаешь, о чём шепчется лес' : paused ? 'можно никуда не торопиться' : 'страницы перелистываются сами';
  }

  function startClock() {
    cancelAnimationFrame(frame);
    lastTime = performance.now();
    function tick(now) {
      const delta = Math.min(now - lastTime, 100);
      lastTime = now;
      if (opened && !paused && !turning && !finished && !document.hidden) {
        elapsed += delta;
        if (elapsed >= firstReveal) reveal(1);
        if (elapsed >= secondReveal) reveal(2);
        if (elapsed >= pageDuration) {
          if (current < chapters.length - 1) void goTo(current + 1);
          else { finished = true; updateControls(); }
        }
      }
      if (opened) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }

  async function openBook() {
    if (opened) return;
    const token = ++generation;
    opened = true;
    turning = true;
    renderPage(0);
    book.classList.add('open');
    $('spread').inert = false;
    $('cover').tabIndex = -1;
    $('openButton').hidden = true;
    $('readingControls').hidden = false;
    $('pause').focus({ preventScroll: true });
    await delay(reducedMotion.matches ? 0 : 1700);
    if (token !== generation) return;
    turning = false;
    updateControls();
    startClock();
  }

  async function goTo(index) {
    if (!opened || turning || index === current || index < 0 || index >= chapters.length) return;
    turning = true;
    const token = generation;
    updateControls();
    const leaf = $('turningLeaf');
    leaf.querySelector('.leaf-back').style.setProperty('--page-art', 'url("assets/' + chapters[index].image + '")');
    if (!reducedMotion.matches) {
      const copy = document.querySelector('.spread .page-right').cloneNode(true);
      copy.removeAttribute('aria-label');
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      copy.querySelectorAll('[aria-live]').forEach(node => node.removeAttribute('aria-live'));
      leaf.querySelector('.leaf-front').replaceChildren(copy);
      leaf.classList.add('turn');
      await delay(420);
      if (token !== generation) return;
    }
    renderPage(index);
    if (!reducedMotion.matches) await delay(900);
    if (token !== generation) return;
    leaf.classList.remove('turn');
    turning = false;
    // Manual navigation while paused should still reveal the selected page.
    if (paused) reveal(2);
    updateControls();
  }

  function replay() {
    ++generation;
    cancelAnimationFrame(frame);
    opened = false;
    turning = false;
    finished = false;
    paused = reducedMotion.matches;
    elapsed = 0;
    $('turningLeaf').classList.remove('turn');
    book.classList.remove('open');
    $('spread').inert = true;
    $('cover').tabIndex = 0;
    $('openButton').hidden = false;
    $('readingControls').hidden = true;
    $('hint').textContent = 'некоторые секреты лес рассказывает шёпотом';
    $('openButton').focus({ preventScroll: true });
  }

  $('cover').addEventListener('click', openBook);
  $('openButton').addEventListener('click', openBook);
  $('previous').addEventListener('click', () => goTo(current - 1));
  $('next').addEventListener('click', () => goTo(current + 1));
  $('replay').addEventListener('click', replay);
  document.querySelectorAll('.dot').forEach(dot => dot.addEventListener('click', () => goTo(Number(dot.dataset.page))));
  $('pause').addEventListener('click', () => { paused = !paused; updateControls(); });
  document.addEventListener('keydown', event => {
    if (!opened || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); void goTo(current + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); void goTo(current - 1); }
    if (event.code === 'Space' && event.target === document.body && !finished) { event.preventDefault(); paused = !paused; updateControls(); }
    if (event.key === 'Escape') replay();
  });
  let touchStart = null;
  $('spread').addEventListener('touchstart', event => { touchStart = event.touches[0].clientX; }, { passive: true });
  $('spread').addEventListener('touchend', event => {
    if (touchStart === null) return;
    const dx = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(dx) > 65) void goTo(current + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });

  // Deterministic ambient animation, independent from the reading controls.
  const canvas = $('particles');
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, ambientFrame = 0, previousTime = 0;
  let seed = 427;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const motes = Array.from({ length: 28 }, (_, i) => ({ x: random(), y: random(), radius: 1 + random() * 1.7, phase: random() * Math.PI * 2, speed: .005 + random() * .012, leaf: i < 8, rotation: random() * 6, color: ['#b8a16d', '#ad8050', '#98764b', '#c0af7b'][i % 4] }));
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw(now) {
    const dt = Math.min((now - previousTime) / 1000 || 0, .05);
    previousTime = now;
    ctx.clearRect(0, 0, width, height);
    for (const mote of motes) {
      mote.y += mote.speed * dt;
      mote.x += Math.sin(now * .0002 + mote.phase) * .002 * dt;
      if (mote.y > 1.03) { mote.y = -.03; mote.x = random(); }
      const x = mote.x * width + Math.sin(now * .0004 + mote.phase) * 22;
      const y = mote.y * height;
      // Keep the words clear; the leaves mostly drift around the book.
      const central = x > width * .2 && x < width * .8 && y > height * .17 && y < height * .82;
      ctx.save(); ctx.translate(x, y);
      ctx.globalAlpha = central ? .12 : (mote.leaf ? .5 : .32 + Math.sin(now * .001 + mote.phase) * .2);
      ctx.fillStyle = mote.color;
      if (mote.leaf) {
        ctx.rotate(mote.rotation + Math.sin(now * .0005 + mote.phase));
        ctx.scale(.6 + Math.abs(Math.sin(now * .0003 + mote.phase)) * .4, 1);
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.bezierCurveTo(9, -2, 7, 6, 0, 9); ctx.bezierCurveTo(-6, 3, -6, -3, 0, -8); ctx.fill();
        ctx.strokeStyle = '#594b2b'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 10); ctx.stroke();
      } else {
        ctx.shadowBlur = 7; ctx.shadowColor = '#e5ca83';
        ctx.beginPath(); ctx.arc(0, 0, mote.radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ambientFrame = requestAnimationFrame(draw);
  }
  function ambient() {
    cancelAnimationFrame(ambientFrame);
    if (!reducedMotion.matches && !document.hidden) { previousTime = performance.now(); ambientFrame = requestAnimationFrame(draw); }
    else ctx.clearRect(0, 0, width, height);
  }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', ambient);
  reducedMotion.addEventListener('change', () => { ambient(); if (reducedMotion.matches && opened) { paused = true; reveal(2); updateControls(); } });
  resize(); ambient();

  // Capture-friendly entry point: ?autoplay=1 opens the book after a short cover shot.
  if (new URLSearchParams(window.location.search).get('autoplay') === '1') setTimeout(openBook, 2000);
})();
