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
      this.popup = popupEl;
      this.header = popupEl.querySelector('[data-popup-head="popupHead"]');
      this.lenis = lenisInstance;

      this.startY = 0;
      this.currentY = 0;
      this.lastY = 0;
      this.startTime = 0;
      this.isDragging = false;
      this.popupHeight = 0;

      this.bind();
    }

    bind() {
      this.header.addEventListener('touchstart', this.onStart.bind(this), { passive: false });
      this.header.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
      this.header.addEventListener('touchend', this.onEnd.bind(this));
    }

    isOpen() {
      return document.documentElement.classList.contains('menu--open');
    }

    open() {
      if (this.isOpen()) return;
      this.popupHeight = this.popup.offsetHeight;
      this.popup.style.transition = 'transform 0.3s ease-out';
      this.popup.style.transform = 'translateY(0)';
      document.documentElement.classList.add('menu--open');
      this.blockScroll();
    }

    close(duration = 0.3) {
      if (!this.isOpen()) return;
      this.popup.style.transition = `transform ${duration}s cubic-bezier(0.25, 0.8, 0.25, 1)`;
      this.popup.style.transform = 'translateY(100%)';
      document.documentElement.classList.remove('menu--open');
      this.unblockScroll();
    }

    toggle() {
      if (this.isOpen()) {
        this.close();
      } else {
        this.open();
      }
    }

    onStart(e) {
      this.isDragging = true;
      this.startY = e.touches[0].clientY;
      this.lastY = this.startY;
      this.startTime = Date.now();
      this.popup.style.transition = 'none';
    }

    onMove(e) {
      if (!this.isDragging) return;

      const touchY = e.touches[0].clientY;
      let delta = touchY - this.startY;
      if (delta < 0) delta = 0;

      this.popup.style.transform = `translateY(${delta}px)`;
      this.lastY = touchY;

      e.preventDefault();
    }

    onEnd() {
      if (!this.isDragging) return;
      this.isDragging = false;

      const endY = this.lastY || this.startY;
      const delta = endY - this.startY;
      const time = Math.max(Date.now() - this.startTime, 1);
      const velocity = delta / time; // px/ms

      const shouldClose = delta > this.popupHeight * 0.25 || velocity > 0.5;

      if (shouldClose) {
        // Чем выше скорость, тем быстрее закрытие (0.1..0.3s)
        let duration = Math.max(0.1, Math.min(0.3, 0.3 - velocity));
        this.close(duration);
      } else {
        // Возврат с анимацией
        this.popup.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        this.popup.style.transform = 'translateY(0)';
      }
    }

    blockScroll() {
      if (this.lenis) {
        this.lenis.stop();
      } else {
        document.body.style.overflow = 'hidden';
      }
    }

    unblockScroll() {
      if (this.lenis) {
        this.lenis.start();
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  // Инициализация
  const popup1 = new BottomPopup(
    document.getElementById('menu'),
    window.lenis
  );

  const burgerBtn = document.getElementById('burger-btn');

  burgerBtn.addEventListener('click', function () {
    popup1.toggle();
  });

});