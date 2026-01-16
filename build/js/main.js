document.addEventListener('DOMContentLoaded', () => {

  const checkEditMode = document.querySelector('.bx-panel-toggle-on') ?? null;

  /**
   * Подключение ScrollTrigger
   * Подключение SplitText
   */
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /**
   * Инициализация Lenis
   */
  const lenis = new Lenis({
    anchors: {
      offset: -60,
    },
  });

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  class BottomPopup {
    constructor(popupEl, lenis) {
      if (!popupEl) return;

      this.popup = popupEl;
      this.lenis = lenis;

      this.head = popupEl.querySelector('[data-popup-head]');
      this.startY = 0;
      this.lastY = 0;
      this.isDragging = false;
      this.startTime = 0;

      this.head.addEventListener('touchstart', this.onStart.bind(this), { passive: true });
      this.head.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
      this.head.addEventListener('touchend', this.onEnd.bind(this));
    }

    isOpen() {
      return this.popup?.dataset?.open === 'true';
    }

    open() {
      if (!this.popup || this.isOpen()) return;

      BottomPopup.closeAll();

      this.popupHeight = this.popup.offsetHeight;
      this.popup.style.transition = 'transform 0.3s ease-out';
      this.popup.style.transform = 'translateY(0)';
      this.popup.dataset.open = 'true';

      if (this.lenis) this.lenis.stop();
      else document.body.style.overflow = 'hidden';
    }

    close(duration = 0.3) {
      if (!this.popup || !this.isOpen()) return;

      this.popup.style.transition = `transform ${duration}s cubic-bezier(0.25,0.8,0.25,1)`;
      this.popup.style.transform = 'translateY(100%)';
      this.popup.dataset.open = 'false';

      if (this.lenis) this.lenis.start();
      else document.body.style.overflow = '';
    }

    toggle() {
      if (this.isOpen()) this.close();
      else this.open();
    }

    onStart(e) {
      this.startY = e.touches[0].clientY;
      this.lastY = this.startY;
      this.startTime = Date.now();
      this.isDragging = true;

      this.popup.style.transition = 'none';
    }

    onMove(e) {
      if (!this.isDragging) return;

      const y = e.touches[0].clientY;
      let delta = y - this.startY;

      if (delta < 0) delta = 0;

      const resistance =
        delta > 120 ? 120 + (delta - 120) * 0.35 : delta;

      this.popup.style.transform = `translateY(${resistance}px)`;
      this.lastY = y;

      e.preventDefault();
    }

    onEnd() {
      if (!this.isDragging) return;

      const delta = this.lastY - this.startY;
      const velocity = delta / Math.max(Date.now() - this.startTime, 1);

      const shouldClose =
        delta > this.popup.offsetHeight * 0.3 ||
        velocity > 0.6;

      this.popup.style.transition =
        'transform 0.35s cubic-bezier(0.25, 1, 0.3, 1)';

      if (shouldClose) {
        this.close();
      } else {
        this.popup.style.transform = 'translateY(0)';
      }

      this.isDragging = false;
    }

    static register(key, instance) {
      if (!BottomPopup.instances) BottomPopup.instances = {};
      BottomPopup.instances[key] = instance;
    }

    static get(key) {
      return BottomPopup.instances ? BottomPopup.instances[key] : null;
    }

    static closeAll() {
      if (!BottomPopup.instances) return;
      Object.values(BottomPopup.instances).forEach(popup => popup.close());
    }

    static getOpen() {
      if (!BottomPopup.instances) return null;
      return Object.values(BottomPopup.instances).find(p => p.isOpen()) || null;
    }
  }

  // --- Инициализация попапов ---
  const popups = {
    menu: new BottomPopup(document.getElementById('menu'), window.lenis),
    dish: new BottomPopup(document.getElementById('dish'), window.lenis),
    filter: new BottomPopup(document.getElementById('filter'), window.lenis),
    branch: new BottomPopup(document.getElementById('branch'), window.lenis),
    reviews: new BottomPopup(document.getElementById('reviews'), window.lenis),
    reviewsWrite: new BottomPopup(document.getElementById('reviewsWrite'), window.lenis)
  };

  for (let key in popups) {
    BottomPopup.register(key, popups[key]);
  }

  // --- Привязка кнопок с toggle ---
  document.querySelectorAll('[data-popup-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.popupTarget;
      const popup = BottomPopup.get(target);
      if (!popup) return;
      popup.toggle();
    });
  });

});