/* ═══════════════════════════════════════════════════════
   CareHQ Landing — Main JavaScript
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // Supabase config
  var SUPABASE_URL = 'https://qmxxbbzrcilqrtxwaaub.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteHhiYnpyY2lscXJ0eHdhYXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODEyNTcsImV4cCI6MjA5MDQ1NzI1N30._TW7QtrOe0i-deyoPfjP1ySweGGUozwqIxPVxrUkvko';

  /* ── Scroll-reveal with Intersection Observer ────── */
  var revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    revealElements.forEach(function (el) { observer.observe(el); });
  } else {
    revealElements.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ── Navbar scroll state ─────────────────────────── */
  var nav = document.getElementById('nav');

  function onScroll() {
    if ((window.scrollY || window.pageYOffset) > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile menu toggle ────────────────────────── */
  var menuBtn = document.getElementById('nav-menu');
  var navLinks = document.getElementById('nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function () {
      menuBtn.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menuBtn.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  /* ── App banner dismiss ────────────────────────── */
  var banner = document.getElementById('app-banner');
  var bannerClose = document.getElementById('banner-close');

  if (bannerClose && banner) {
    // Check if previously dismissed
    if (localStorage.getItem('carehq_banner_dismissed') === '1') {
      banner.classList.add('hidden');
    }

    bannerClose.addEventListener('click', function () {
      banner.classList.add('hidden');
      localStorage.setItem('carehq_banner_dismissed', '1');
    });
  }

  /* ── Toast helper ────────────────────────────────── */
  var toast = document.getElementById('toast');
  var toastTimeout;

  function showToast() {
    clearTimeout(toastTimeout);
    toast.classList.add('show');
    toastTimeout = setTimeout(function () {
      toast.classList.remove('show');
    }, 4000);
  }

  /* ── Waitlist form handler (Supabase) ─────────── */
  window.handleWaitlist = function (event, form) {
    event.preventDefault();

    var emailInput = form.querySelector('input[name="email"]');
    var submitBtn = form.querySelector('button[type="submit"]');
    var email = emailInput.value.trim();

    if (!email) return false;

    // Disable button during submission
    submitBtn.disabled = true;

    // Insert into Supabase waitlist table via REST API
    fetch(SUPABASE_URL + '/rest/v1/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ email: email, source: 'landing' })
    })
      .then(function (response) {
        if (response.ok || response.status === 409) {
          // 409 = duplicate email, still show success
          emailInput.value = '';
          showToast();
        } else {
          return response.json().then(function (err) {
            // Handle unique constraint violation (duplicate email)
            if (err.code === '23505') {
              emailInput.value = '';
              showToast();
            } else {
              console.error('Waitlist error:', err);
              alert('Something went wrong. Please try again.');
            }
          });
        }
      })
      .catch(function () {
        // Fallback: store locally if network fails
        try {
          var existing = JSON.parse(localStorage.getItem('carehq_waitlist') || '[]');
          if (existing.indexOf(email) === -1) {
            existing.push(email);
            localStorage.setItem('carehq_waitlist', JSON.stringify(existing));
          }
        } catch (e) { /* silent */ }
        emailInput.value = '';
        showToast();
      })
      .finally(function () {
        submitBtn.disabled = false;
      });

    return false;
  };

  /* ── Smooth scroll for anchor links ──────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;

      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var navHeight = nav.offsetHeight;
        var targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;

        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });
})();
