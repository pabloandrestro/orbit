(function(){
  "use strict";

  var gel = document.getElementById('heroGel');
  var image = document.getElementById('heroGelImage');
  var noise = document.getElementById('heroGelNoise');
  var displace = document.getElementById('heroGelDisplace');
  if (!gel || !image) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dragging = false;
  var pointerId = null;
  var startX = 0;
  var startY = 0;
  var targetX = 0;
  var targetY = 0;
  var x = 0;
  var y = 0;
  var vx = 0;
  var vy = 0;
  var impulse = 0;
  var raf = 0;
  var lastTime = 0;

  function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }

  function updateTarget(e){
    var rect = gel.getBoundingClientRect();
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    targetX = clamp(dx / (rect.width * 0.34), -1, 1);
    targetY = clamp(dy / (rect.height * 0.34), -1, 1);
  }

  function paint(){
    var pull = Math.min(1, Math.hypot(x, y));
    var speed = Math.min(1, Math.hypot(vx, vy) * .055);
    var angle = Math.atan2(y, x) * 180 / Math.PI;
    var stretch = pull * .24 + speed * .055;
    var squash = pull * .095 + speed * .035;
    var tx = x * 18;
    var ty = y * 15;
    var wobble = clamp((vx * y - vy * x) * 1.55, -5.5, 5.5);
    var originX = 50 - x * 27;
    var originY = 50 - y * 24;

    image.style.transformOrigin = originX.toFixed(2) + '% ' + originY.toFixed(2) + '%';
    image.style.transform =
      'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) ' +
      'rotate(' + wobble.toFixed(2) + 'deg) ' +
      'rotate(' + angle.toFixed(2) + 'deg) ' +
      'scale(' + (1 + stretch).toFixed(4) + ',' + (1 - squash).toFixed(4) + ') ' +
      'rotate(' + (-angle).toFixed(2) + 'deg)';

    gel.style.setProperty('--gel-x', x.toFixed(4));
    gel.style.setProperty('--gel-y', y.toFixed(4));
    gel.style.setProperty('--gel-speed', speed.toFixed(4));
    gel.style.setProperty('--pull', pull.toFixed(4));

    if (displace){
      displace.setAttribute('scale', (pull * 8 + speed * 7 + impulse * 4).toFixed(2));
    }
    if (noise){
      var fx = .008 + speed * .0025 + impulse * .0015;
      var fy = .012 + pull * .002 + impulse * .001;
      noise.setAttribute('baseFrequency', fx.toFixed(4) + ' ' + fy.toFixed(4));
    }
  }

  function tick(time){
    if (!lastTime) lastTime = time;
    var dt = Math.min(32, time - lastTime) / 16.6667;
    lastTime = time;

    var stiffness = dragging ? .18 : .105;
    var damping = dragging ? .72 : .79;
    vx = (vx + (targetX - x) * stiffness * dt) * Math.pow(damping, dt);
    vy = (vy + (targetY - y) * stiffness * dt) * Math.pow(damping, dt);
    x += vx * dt;
    y += vy * dt;
    impulse *= Math.pow(.90, dt);

    paint();

    var moving = dragging || Math.abs(x) + Math.abs(y) + Math.abs(vx) + Math.abs(vy) + impulse > .0025;
    if (moving){
      raf = requestAnimationFrame(tick);
    } else {
      x = y = vx = vy = impulse = 0;
      targetX = targetY = 0;
      paint();
      lastTime = 0;
      raf = 0;
    }
  }

  function ensureAnimation(){
    if (!raf){
      lastTime = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  function begin(e){
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    targetX = x;
    targetY = y;
    impulse = Math.max(impulse, .18);
    gel.classList.add('is-grabbing');
    gel.setPointerCapture && gel.setPointerCapture(pointerId);
    updateTarget(e);
    ensureAnimation();
    e.preventDefault();
  }

  function move(e){
    if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
    updateTarget(e);
    ensureAnimation();
    e.preventDefault();
  }

  function end(e){
    if (!dragging) return;
    if (e && pointerId !== null && e.pointerId !== undefined && e.pointerId !== pointerId) return;
    dragging = false;
    gel.classList.remove('is-grabbing');
    if (gel.releasePointerCapture && pointerId !== null){
      try { gel.releasePointerCapture(pointerId); } catch (_) {}
    }
    pointerId = null;
    targetX = 0;
    targetY = 0;
    impulse = reduceMotion ? 0 : .72;
    ensureAnimation();
  }

  gel.addEventListener('pointerdown', begin);
  gel.addEventListener('pointermove', move);
  gel.addEventListener('pointerup', end);
  gel.addEventListener('pointercancel', end);
  gel.addEventListener('lostpointercapture', function(){ if (dragging) end(); });

  gel.addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      targetX = reduceMotion ? 0 : .16;
      targetY = reduceMotion ? 0 : -.11;
      impulse = reduceMotion ? 0 : .95;
      ensureAnimation();
      window.setTimeout(function(){
        targetX = 0;
        targetY = 0;
        ensureAnimation();
      }, reduceMotion ? 0 : 95);
    }
  });

  paint();
})();


(function(){
  "use strict";
  var nav = document.querySelector('.hud__nav');
  if (!nav) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var targets = links.map(function(link){
    return document.querySelector(link.getAttribute('href'));
  }).filter(Boolean);

  function select(id){
    links.forEach(function(link){
      if (link.getAttribute('href') === '#' + id){
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if ('IntersectionObserver' in window){
    var visible = new Map();
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){ visible.set(entry.target.id, entry.intersectionRatio); });
      var best = null;
      var score = 0;
      visible.forEach(function(ratio, id){
        if (ratio > score){ score = ratio; best = id; }
      });
      if (best) select(best);
    }, { rootMargin:'-18% 0px -62% 0px', threshold:[0,.08,.2,.4,.7] });
    targets.forEach(function(target){ observer.observe(target); });
  }

  links.forEach(function(link){
    link.addEventListener('click', function(){
      select((link.getAttribute('href') || '#top').slice(1) || 'top');
    });
  });
})();
