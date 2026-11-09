(function(){
  var K = {pos:'maalim-pos', bm:'maalim-bm', theme:'maalim-theme', fs:'maalim-fs'};
  function get(k, d){ try{ var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } }
  function set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  var $ = function(s){ return document.querySelector(s); };
  var cover = $('#cover'), reader = $('#reader'), toc = $('#toc'), bmList = $('#bmList');
  var sidebar = $('#sidebar'), scrim = $('#scrim');

  /* ---------- Thème ---------- */
  function currentTheme(){
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toggleTheme(){
    var n = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try{ localStorage.setItem(K.theme, n); }catch(e){}
  }
  $('#themeBtn').onclick = toggleTheme; $('#coverTheme').onclick = toggleTheme;

  /* ---------- Taille du texte ---------- */
  var fs = parseInt(get(K.fs, 19), 10) || 19;
  function applyFs(){ document.documentElement.style.setProperty('--fs', fs + 'px'); try{ localStorage.setItem(K.fs, fs); }catch(e){} }
  $('#fsUp').onclick = function(){ fs = Math.min(26, fs + 1); applyFs(); };
  $('#fsDown').onclick = function(){ fs = Math.max(15, fs - 1); applyFs(); };

  /* ---------- Sommaire ---------- */
  var links = {};
  (window.TOC || []).forEach(function(c){
    var a = document.createElement('a'); a.href = '#' + c.id; a.textContent = c.t; a.className = 'lvl1'; toc.appendChild(a); links[c.id] = a;
    c.s.forEach(function(s){
      var b = document.createElement('a'); b.href = '#' + s.id; b.textContent = s.t; b.className = 'lvl2'; toc.appendChild(b); links[s.id] = b;
    });
  });
  toc.addEventListener('click', function(e){ if (e.target.tagName === 'A') closeSide(); });

  /* ---------- Onglets ---------- */
  document.querySelectorAll('.tab').forEach(function(t){
    t.onclick = function(){
      document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('active'); });
      t.classList.add('active');
      var bm = t.dataset.tab === 'bm';
      toc.hidden = bm; bmList.hidden = !bm;
    };
  });

  /* ---------- Menu mobile ---------- */
  function closeSide(){ sidebar.classList.remove('open'); scrim.classList.remove('open'); }
  $('#menuBtn').onclick = function(){ sidebar.classList.add('open'); scrim.classList.add('open'); };
  scrim.onclick = closeSide;

  /* ---------- Ouverture / accueil ---------- */
  function openReader(scrollTo){
    cover.hidden = true; reader.hidden = false;
    requestAnimationFrame(function(){
      if (typeof scrollTo === 'number') window.scrollTo({top: scrollTo, behavior: 'auto'});
      onScroll();
    });
  }
  $('#startBtn').onclick = function(){ openReader(0); };
  $('#homeBtn').onclick = function(){ savePos(); reader.hidden = true; cover.hidden = false; refreshResume(); closeSide(); };
  function refreshResume(){
    var p = get(K.pos, null);
    var b = $('#resumeBtn');
    if (p && p.y > 200){ b.hidden = false; $('#resumeInfo').textContent = '(' + (p.pct || 0) + ' % — ' + (p.title || '') + ')'; b.onclick = function(){ openReader(p.y); }; }
    else b.hidden = true;
  }
  refreshResume();

  /* ---------- Position courante, progression ---------- */
  var heads = Array.prototype.slice.call(document.querySelectorAll('section.chap, h3.sub'));
  var curTitle = '', curId = '';
  function currentHead(){
    var y = window.scrollY + 90, found = heads[0];
    for (var i = 0; i < heads.length; i++){ if (heads[i].getBoundingClientRect().top + window.scrollY <= y) found = heads[i]; else break; }
    return found;
  }
  function pct(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    return h > 0 ? Math.min(100, Math.round(window.scrollY / h * 100)) : 0;
  }
  var ticking = false, saveT;
  function onScroll(){
    if (reader.hidden) return;
    var p = pct();
    $('#progressBar').style.width = p + '%';
    $('#pctText').textContent = p + ' %';
    var h = currentHead();
    if (h){
      var chap = h.tagName === 'SECTION' ? h : h.closest('section');
      var t = h.dataset.title || '';
      curTitle = t; curId = h.id;
      $('#topTitle').textContent = h === chap ? t : (chap.dataset.title + ' — ' + t);
      Object.keys(links).forEach(function(k){ links[k].classList.remove('active'); });
      if (links[chap.id]) links[chap.id].classList.add('active');
      if (links[h.id]) links[h.id].classList.add('active');
    }
    clearTimeout(saveT); saveT = setTimeout(savePos, 400);
  }
  function savePos(){ if (!reader.hidden) set(K.pos, {y: Math.round(window.scrollY), pct: pct(), title: curTitle}); }
  window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(function(){ onScroll(); ticking = false; }); } }, {passive:true});
  window.addEventListener('beforeunload', savePos);

  /* ---------- Marque-pages ---------- */
  function toast(m){ var t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 1800); }
  function snippet(){
    var ps = document.querySelectorAll('.chap p, .chap h3');
    for (var i = 0; i < ps.length; i++){
      var r = ps[i].getBoundingClientRect();
      if (r.top > 70 && !ps[i].classList.contains('ar')) return ps[i].textContent.trim().slice(0, 80) + '…';
    }
    return '';
  }
  function renderBm(){
    var list = get(K.bm, []);
    $('#bmCount').textContent = list.length;
    bmList.innerHTML = '';
    if (!list.length){ bmList.innerHTML = '<p class="bm-empty">Aucun marque-page pour l\'instant. Touchez 🔖 en haut de l\'écran pour marquer l\'endroit où vous êtes.</p>'; return; }
    list.forEach(function(b, i){
      var row = document.createElement('div'); row.className = 'bm';
      var go = document.createElement('button'); go.className = 'go';
      go.innerHTML = '<span class="bm-t"></span><span class="bm-d"></span>';
      go.querySelector('.bm-t').textContent = b.title + ' (' + b.pct + ' %)';
      go.querySelector('.bm-d').textContent = b.snip;
      go.onclick = function(){ window.scrollTo({top: b.y, behavior: 'smooth'}); closeSide(); };
      var del = document.createElement('button'); del.className = 'del'; del.textContent = '✕'; del.title = 'Supprimer';
      del.onclick = function(){ var l = get(K.bm, []); l.splice(i, 1); set(K.bm, l); renderBm(); };
      row.appendChild(go); row.appendChild(del); bmList.appendChild(row);
    });
  }
  $('#bmAdd').onclick = function(){
    var l = get(K.bm, []);
    l.push({y: Math.round(window.scrollY), pct: pct(), title: curTitle || 'Marque-page', snip: snippet()});
    l.sort(function(a, b){ return a.y - b.y; });
    set(K.bm, l); renderBm(); toast('Marque-page ajouté');
  };
  renderBm();

  /* Liens internes : ouvrir le lecteur si nécessaire */
  if (location.hash && document.querySelector(location.hash)){ openReader(); setTimeout(function(){ document.querySelector(location.hash).scrollIntoView(); }, 50); }
})();
