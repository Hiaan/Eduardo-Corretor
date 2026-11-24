/* Landing page — comportamento.
 * Todos os dados vêm de window.CONFIG (js/config.js). */
(function () {
  'use strict';

  var CONFIG = window.CONFIG || {};
  var STORAGE_PERFIL = 'lp_perfil';
  var STORAGE_COOKIE = 'lp_cookie_consent';
  var PERFIS = ['empresario', 'gestor'];

  /* ---------- utilidades ---------- */

  // Um campo está "preenchido" se não estiver vazio nem ainda entre colchetes.
  function isSet(value) {
    if (typeof value !== 'string') return value != null && value !== false;
    var v = value.trim();
    return v !== '' && !/\[[^\]]*\]/.test(v);
  }
  function cfg(key) { return isSet(CONFIG[key]) ? String(CONFIG[key]).trim() : ''; }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* navegação privada: segue sem salvar */ }
    return null;
  }
  function precoNumero() {
    var n = cfg('preco').replace(/[^\d,]/g, '').replace(',', '.');
    return n ? parseFloat(n) : undefined;
  }

  /* ---------- 1. preencher a página a partir do CONFIG ---------- */

  function preencher() {
    $all('[data-cfg]').forEach(function (el) {
      var val = cfg(el.getAttribute('data-cfg'));
      if (val) el.textContent = val;
    });
    $all('[data-cfg-hide]').forEach(function (el) {
      if (!cfg(el.getAttribute('data-cfg-hide'))) el.hidden = true;
    });
    $all('[data-cfg-show-if-missing]').forEach(function (el) {
      if (cfg(el.getAttribute('data-cfg-show-if-missing'))) el.hidden = true;
    });
    $all('[data-cfg-src]').forEach(function (el) {
      var val = cfg(el.getAttribute('data-cfg-src'));
      if (val && el.getAttribute('src') !== val) el.setAttribute('src', val);
    });

    var arroba = cfg('arroba').replace(/^@/, '');
    $all('[data-cfg-instagram]').forEach(function (el) {
      if (arroba) el.href = 'https://www.instagram.com/' + encodeURIComponent(arroba) + '/';
    });

    var whats = cfg('whatsapp').replace(/\D/g, '');
    $all('[data-whatsapp]').forEach(function (el) {
      if (!whats) { el.hidden = true; return; }
      var nome = cfg('nomeCurso');
      var msg = 'Olá, ' + (cfg('instrutor') || '') + '! Tenho uma dúvida sobre o curso' + (nome ? ' ' + nome : '') + '.';
      el.href = 'https://wa.me/' + whats + '?text=' + encodeURIComponent(msg);
    });

    $all('[data-ano]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

    var nomeCurso = cfg('nomeCurso');
    if (nomeCurso && document.body.hasAttribute('data-perfil-ativo')) {
      document.title = nomeCurso + ' | ' + (cfg('instrutor') || 'Curso de tráfego pago');
    }
  }

  /* ---------- 2. vídeo opcional no hero ---------- */

  function videoHero() {
    var url = cfg('videoHero');
    var frame = document.getElementById('hero-media');
    if (!url || !frame) return;
    var m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    if (!m) return;
    frame.classList.add('media-frame--video');
    frame.parentElement.parentElement.classList.add('hero__grid--video');
    frame.innerHTML = '';
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0';
    iframe.title = 'Vídeo de apresentação do curso';
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    frame.appendChild(iframe);
  }

  /* ---------- 3. bônus ---------- */

  function bonus() {
    var section = document.getElementById('bonus');
    var lista = document.getElementById('bonus-lista');
    var itens = (Array.isArray(CONFIG.bonus) ? CONFIG.bonus : []).filter(function (b) {
      return b && isSet(b.titulo);
    });

    var resumo = document.querySelector('[data-bonus-resumo]');
    if (resumo && itens.length) {
      resumo.hidden = false;
      resumo.querySelector('[data-bonus-resumo-texto]').textContent =
        'Bônus: ' + itens.map(function (b) { return b.titulo.trim(); }).join(', ');
    }

    if (!section || !lista || !itens.length) return;
    itens.forEach(function (b, i) {
      var li = document.createElement('li');
      li.className = 'bonus reveal';
      li.innerHTML =
        '<span class="icon-badge" aria-hidden="true"><svg><use href="#i-gift"/></svg></span>' +
        '<div><span class="bonus__tag"></span><h3></h3><p></p></div>';
      li.querySelector('.bonus__tag').textContent = 'Bônus ' + (i + 1);
      li.querySelector('h3').textContent = b.titulo.trim();
      var p = li.querySelector('p');
      if (isSet(b.descricao)) p.textContent = b.descricao.trim(); else p.remove();
      lista.appendChild(li);
    });
    section.hidden = false;
  }

  /* ---------- 4. seletor de público ---------- */

  function aplicarPerfil(perfil, salvar) {
    if (PERFIS.indexOf(perfil) === -1) perfil = 'empresario';
    document.body.setAttribute('data-perfil-ativo', perfil);
    $all('[data-perfil]').forEach(function (el) {
      el.hidden = el.getAttribute('data-perfil') !== perfil;
    });
    $all('[data-set-perfil]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-set-perfil') === perfil));
    });
    if (salvar) store(STORAGE_PERFIL, perfil);
    // elementos que surgiram agora entram já visíveis
    $all('[data-perfil="' + perfil + '"] .reveal, [data-perfil="' + perfil + '"].reveal').forEach(function (el) {
      el.classList.add('is-in');
    });
  }

  function perfil() {
    if (!document.querySelector('[data-set-perfil]')) return;
    var params = new URLSearchParams(window.location.search);
    var daUrl = (params.get('perfil') || '').toLowerCase();
    if (PERFIS.indexOf(daUrl) !== -1) {
      aplicarPerfil(daUrl, true);
    } else {
      aplicarPerfil(store(STORAGE_PERFIL) || 'empresario', false);
    }
    $all('[data-set-perfil]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        aplicarPerfil(btn.getAttribute('data-set-perfil'), true);
      });
    });
  }

  /* ---------- 5. botões de compra ---------- */

  function urlCheckout() {
    var base = cfg('linkCheckout');
    if (!base) return '';
    var url;
    try { url = new URL(base, window.location.href); } catch (e) { return ''; }
    // Repassa UTMs e demais parâmetros de rastreamento da página (menos "perfil").
    new URLSearchParams(window.location.search).forEach(function (value, key) {
      if (key === 'perfil') return;
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
    return url.toString();
  }

  function botoesCompra() {
    var href = urlCheckout();
    if (!href) {
      console.warn('[landing] CONFIG.linkCheckout não preenchido: os botões de compra levam à seção de oferta.');
    }
    $all('.js-buy').forEach(function (a) {
      if (href) {
        a.href = href;
        a.setAttribute('rel', 'noopener');
      }
      a.addEventListener('click', function () { track('checkout'); });
    });
  }

  /* ---------- 6. CTA fixo no celular ---------- */

  function stickyCta() {
    var bar = document.getElementById('sticky-cta');
    var hero = document.getElementById('hero');
    if (!bar || !hero || !('IntersectionObserver' in window)) return;
    var link = bar.querySelector('a');
    new IntersectionObserver(function (entries) {
      var fora = !entries[0].isIntersecting;
      bar.classList.toggle('is-visible', fora);
      bar.setAttribute('aria-hidden', String(!fora));
      if (link) link.tabIndex = fora ? 0 : -1;
      document.body.classList.toggle('has-sticky', fora);
    }, { threshold: 0 }).observe(hero);
  }

  /* ---------- 7. animação ao rolar ---------- */

  function reveal() {
    var els = $all('.reveal');
    var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduz || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 8. cookies + rastreamento ---------- */

  var trackingLoaded = false;

  function temRastreamento() { return !!(cfg('pixelMetaId') || cfg('googleTagId')); }

  function carregarRastreamento() {
    if (trackingLoaded || !temRastreamento()) return;
    trackingLoaded = true;

    var pixel = cfg('pixelMetaId');
    if (pixel) {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', pixel);
      window.fbq('track', 'PageView');
    }

    var gtagId = cfg('googleTagId');
    if (gtagId) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gtagId);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', gtagId); // envia o page_view
    }
  }

  function track(evento) {
    if (!trackingLoaded || evento !== 'checkout') return;
    var valor = precoNumero();
    if (window.fbq) window.fbq('track', 'InitiateCheckout', valor ? { value: valor, currency: 'BRL' } : {});
    if (window.gtag) window.gtag('event', 'begin_checkout', { value: valor, currency: 'BRL', transport_type: 'beacon' });
  }

  function cookies() {
    var banner = document.getElementById('cookie');
    var reabrir = document.querySelector('[data-cookie-reopen]');
    if (!temRastreamento()) return; // nada a consentir: não mostra o aviso

    function abrir() { banner.hidden = false; document.body.classList.add('cookie-open'); }
    function fechar() { banner.hidden = true; document.body.classList.remove('cookie-open'); }

    var escolha = store(STORAGE_COOKIE);
    if (escolha === 'aceito') carregarRastreamento();
    else if (escolha !== 'recusado' && banner) abrir();

    if (banner) {
      $all('[data-cookie]', banner).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var aceitou = btn.getAttribute('data-cookie') === 'aceitar';
          store(STORAGE_COOKIE, aceitou ? 'aceito' : 'recusado');
          fechar();
          if (aceitou) carregarRastreamento();
        });
      });
    }
    if (reabrir && banner) {
      reabrir.hidden = false;
      reabrir.addEventListener('click', abrir);
    }
  }

  /* ---------- início ---------- */

  function init() {
    preencher();
    videoHero();
    bonus();
    perfil();
    botoesCompra();
    stickyCta();
    reveal();
    cookies();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
