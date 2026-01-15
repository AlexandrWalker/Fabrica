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
    constructor(popupEl, lenisInstance) {
      if (!popupEl) return;
      this.popup = popupEl;
      this.lenis = lenisInstance;

      this.startY = 0;
      this.lastY = 0;
      this.startTime = 0;
      this.isDragging = false;
      this.popupHeight = 0;
      this.activePopup = null;
      this.scrollable = null;

      document.addEventListener('touchstart', this.onStart.bind(this), { passive: false });
      document.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
      document.addEventListener('touchend', this.onEnd.bind(this));
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
      const openPopup = BottomPopup.getOpen();
      if (!openPopup) return;

      this.activePopup = openPopup.popup;
      this.scrollable = this.activePopup.querySelector('[data-popup-scroll]');

      const canSwipe = !this.scrollable || this.scrollable.scrollTop === 0;
      this.isDragging = canSwipe;

      this.startY = e.touches[0].clientY;
      this.lastY = this.startY;
      this.startTime = Date.now();
      if (this.activePopup) this.activePopup.style.transition = 'none';
    }

    onMove(e) {
      if (!this.activePopup) return;
      const touchY = e.touches[0].clientY;
      let delta = touchY - this.startY;

      // Скролл внутри
      if (this.scrollable) {
        const atTop = this.scrollable.scrollTop === 0;
        const atBottom = this.scrollable.scrollHeight - this.scrollable.scrollTop === this.scrollable.clientHeight;

        if ((delta > 0 && !atTop) || (delta < 0 && !atBottom)) {
          this.isDragging = false;
          return; // скроллим контент, не попап
        }
      }

      if (!this.isDragging) return;

      if (delta < 0) delta = 0;

      // добавляем "резиновость" при маленьком смещении
      const resistance = delta > 100 ? 100 + (delta - 100) * 0.5 : delta;
      this.activePopup.style.transform = `translateY(${resistance}px)`;
      this.lastY = touchY;

      e.preventDefault();
    }

    onEnd() {
      if (!this.isDragging || !this.activePopup) return;
      this.isDragging = false;

      const delta = (this.lastY || this.startY) - this.startY;
      const time = Math.max(Date.now() - this.startTime, 1);
      const velocity = delta / time; // px/ms

      // инерционный расчёт: учитываем текущую позицию + скорость
      const predicted = delta + velocity * 150; // множитель для инерции

      const shouldClose = predicted > this.activePopup.offsetHeight * 0.25 || velocity > 0.5;

      if (shouldClose) {
        // быстрее закрытие при быстром flick
        let duration = Math.max(0.05, Math.min(0.25, 0.25 - velocity));
        this.close(duration);
      } else {
        // возвращаем на место с плавной анимацией
        this.activePopup.style.transition = 'transform 0.3s cubic-bezier(0.25,0.8,0.25,1)';
        this.activePopup.style.transform = 'translateY(0)';
      }
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