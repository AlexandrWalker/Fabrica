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

  const burgerBtn = document.getElementById('burger-btn');

  burgerBtn.addEventListener('click', function () {

    document.documentElement.classList.toggle('menu--open');
  });


  class BottomPopup {
    constructor(popupEl, lenisInstance) {
      this.popup = popupEl;
      this.header = popupEl.querySelector('.popup__header');
      this.lenis = lenisInstance;

      this.startY = 0;
      this.currentY = 0;
      this.lastY = 0;
      this.startTime = 0;
      this.isDragging = false;
      this.popupHeight = this.popup.offsetHeight;

      this.bind();
    }

    bind() {
      this.header.addEventListener('touchstart', this.onStart.bind(this), { passive: false });
      this.header.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
      this.header.addEventListener('touchend', this.onEnd.bind(this));
    }

    open() {
      this.popup.style.transition = 'transform 0.3s ease-out';
      this.popup.style.transform = 'translateY(0)';
      this.blockScroll();
    }

    close() {
      this.popup.style.transition = 'transform 0.3s ease-out';
      this.popup.style.transform = 'translateY(100%)';
      this.unblockScroll();
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

      this.currentY = e.touches[0].clientY;
      let delta = this.currentY - this.startY;

      if (delta < 0) delta = 0;

      this.popup.style.transform = `translateY(${delta}px)`;
      this.lastY = this.currentY;

      e.preventDefault();
    }

    onEnd() {
      if (!this.isDragging) return;

      this.isDragging = false;

      const delta = this.currentY - this.startY;
      const time = Date.now() - this.startTime;
      const velocity = delta / time;

      const shouldClose =
        delta > this.popupHeight * 0.25 || velocity > 0.5;

      this.popup.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

      if (shouldClose) {
        this.close();
      } else {
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

});