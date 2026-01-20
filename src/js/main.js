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
      offset: -210,
    },
  });

  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  /**
   * Попапы
   */
  (function () {
    class BottomPopup {
      static stack = [];
      static BASE_Z = 600;

      constructor(popupEl, lenis) {
        if (!popupEl) return;

        this.popup = popupEl;
        this.lenis = lenis;

        this.head = popupEl.querySelector('[data-popup-head]');
        this.scrollEl = popupEl.querySelector('[data-popup-scroll]');

        this._historyAdded = false;
        this._ignorePopstate = false;

        this.startY = 0;
        this.lastY = 0;
        this.startTarget = null;
        this.isDragging = false;
        this.startTime = 0;

        // Drag events
        this.head.addEventListener('touchstart', this.onStart.bind(this), { passive: true });
        this.head.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
        this.head.addEventListener('touchend', this.onEnd.bind(this));

        if (this.scrollEl) {
          this.scrollEl.addEventListener('touchstart', this.onStart.bind(this), { passive: true });
          this.scrollEl.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
          this.scrollEl.addEventListener('touchend', this.onEnd.bind(this));
        }
      }

      isOpen() {
        return this.popup?.dataset?.open === 'true';
      }

      open() {
        if (!this.popup || this.isOpen()) return;

        const stack = BottomPopup.stack;
        const prev = stack[stack.length - 1];
        if (prev) prev.popup.classList.add('is-under');

        stack.push(this);

        this.popup.style.zIndex = BottomPopup.BASE_Z + stack.length;
        this.popup.style.transition = 'transform 0.3s ease-out';
        this.popup.style.transform = 'translateY(0)';
        this.popup.dataset.open = 'true';

        if (this.lenis && stack.length === 1) this.lenis.stop();
        document.documentElement.classList.add('popup-open');

        // --- history для back button ---
        if (!this._historyAdded) {
          history.pushState({ popup: true }, '');
          this._historyAdded = true;
        }
      }

      close(duration = 0.3) {
        if (!this.popup || !this.isOpen()) return;

        const stack = BottomPopup.stack;
        const isTop = stack[stack.length - 1] === this;

        if (!isTop) return; // закрываем только верхний

        stack.pop();

        this.popup.style.transition = `transform ${duration}s cubic-bezier(0.25,0.8,0.25,1)`;
        this.popup.style.transform = 'translateY(100%)';
        this.popup.dataset.open = 'false';

        const prev = stack[stack.length - 1];
        if (prev) prev.popup.classList.remove('is-under');

        if (stack.length === 0) {
          document.documentElement.classList.remove('popup-open');
          if (this.lenis) this.lenis.start();
        }

        // Сбрасываем флаги только если закрыли вручную
        if (!fromPopstate) {
          this._ignorePopstate = true;
        }
      }

      toggle() {
        if (this.isOpen()) this.close();
        else this.open();
      }

      // --- Перезапуск попапа сверху ---
      reopen() {
        const stack = BottomPopup.stack;
        const index = stack.indexOf(this);

        if (index === -1) return this.open();

        // Закрываем все верхние попапы
        for (let i = stack.length - 1; i > index; i--) stack[i].close(0);

        // Убираем текущий из стека, чтобы заново добавить
        stack.splice(index, 1);

        this.popup.style.transition = 'none';
        this.popup.style.transform = 'translateY(100%)';

        stack.push(this);
        this.popup.style.zIndex = BottomPopup.BASE_Z + stack.length;

        requestAnimationFrame(() => {
          this.popup.style.transition = 'transform 0.3s ease-out';
          this.popup.style.transform = 'translateY(0)';
          this.popup.dataset.open = 'true';
        });

        // Нижние попапы становятся is-under
        stack.forEach((p, i) => {
          if (p !== this) p.popup.classList.add('is-under');
          else p.popup.classList.remove('is-under');
        });

        if (this.lenis && stack.length === 1) this.lenis.stop();
      }

      // --- Toggle + Reopen для кнопок ---
      toggleOrReopen() {
        const stack = BottomPopup.stack;
        const index = stack.indexOf(this);

        if (index === -1) return this.open();

        const isTop = index === stack.length - 1;
        if (isTop) return this.close(); // верхний → закрыть

        return this.reopen(); // ниже → поднять сверху
      }

      // --- Drag/Swipe логика ---
      onStart(e) {
        this.startY = e.touches[0].clientY;
        this.lastY = this.startY;
        this.startTime = Date.now();
        this.isDragging = true;
        this.startTarget = e.target;

        this.popup.style.transition = 'none';
      }

      onMove(e) {
        if (!this.isDragging) return;

        const y = e.touches[0].clientY;
        let delta = y - this.startY;

        const isDraggingScrollContent = this.scrollEl && e.target.closest('[data-popup-scroll]');

        if (delta > 0) { // свайп вниз
          if (isDraggingScrollContent) {
            const scrollTop = this.scrollEl.scrollTop;
            const startedOnHeader = this.startTarget.closest('[data-popup-head]');
            if (scrollTop > 0 && !startedOnHeader) return; // обычный скролл
          }
        } else return; // свайп вверх не трогаем

        if (delta < 0) delta = 0;
        const resistance = delta > 120 ? 120 + (delta - 120) * 0.35 : delta;

        this.popup.style.transform = `translateY(${resistance}px)`;
        this.lastY = y;
        e.preventDefault();
      }

      onEnd() {
        if (!this.isDragging) return;

        const delta = this.lastY - this.startY;
        const velocity = delta / Math.max(Date.now() - this.startTime, 1);

        const shouldClose = delta > this.popup.offsetHeight * 0.3 || velocity > 0.6;

        if (shouldClose) this.close();
        else {
          this.popup.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.3, 1)';
          this.popup.style.transform = 'translateY(0)';
        }

        this.isDragging = false;
      }

      // --- Статические методы ---
      static register(key, instance) {
        if (!BottomPopup.instances) BottomPopup.instances = {};
        BottomPopup.instances[key] = instance;
      }

      static get(key) {
        return BottomPopup.instances ? BottomPopup.instances[key] : null;
      }

      static closeAll() {
        while (BottomPopup.stack.length) {
          BottomPopup.stack[BottomPopup.stack.length - 1].close(0);
        }
      }

      static getOpen() {
        if (!BottomPopup.instances) return null;
        return Object.values(BottomPopup.instances).find(p => p.isOpen()) || null;
      }
    }

    // --- Инициализация ---
    const popups = {
      menu: new BottomPopup(document.getElementById('menu'), window.lenis),
      dish: new BottomPopup(document.getElementById('dish'), window.lenis),
      filter: new BottomPopup(document.getElementById('filter'), window.lenis),
      branch: new BottomPopup(document.getElementById('branch'), window.lenis),
      reviews: new BottomPopup(document.getElementById('reviews'), window.lenis),
      reviewsWrite: new BottomPopup(document.getElementById('reviewsWrite'), window.lenis),
      rules: new BottomPopup(document.getElementById('rules'), window.lenis),
      loyalty: new BottomPopup(document.getElementById('loyalty'), window.lenis),
      catering: new BottomPopup(document.getElementById('catering'), window.lenis),
      seating: new BottomPopup(document.getElementById('seating'), window.lenis),
      slang: new BottomPopup(document.getElementById('slang'), window.lenis),
      contacts: new BottomPopup(document.getElementById('contacts'), window.lenis)
    };

    for (let key in popups) BottomPopup.register(key, popups[key]);

    // --- Привязка кнопок ---
    document.querySelectorAll('[data-popup-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.popupTarget;
        const popup = BottomPopup.get(target);
        if (!popup) return;

        popup.toggleOrReopen();
      });
    });

    // --- Back button support ---
    window.addEventListener('popstate', (e) => {
      const stack = BottomPopup.stack;
      if (stack.length === 0) return;

      const top = stack[stack.length - 1];

      // если мы сами закрываем попап, игнорируем popstate
      if (top._ignorePopstate) {
        top._ignorePopstate = false;
        return;
      }

      // закрываем верхний попап мгновенно
      top.close(0, true);
    });
  })();

  (() => {
    const wrapper = document.querySelector('.hero__items');
    const items = [...wrapper.querySelectorAll('.hero__item[data-id]')];
    const sections = [...document.querySelectorAll('section[id]')]; // секции с id

    // Мапа: data-id hero__item → сам элемент
    const itemMap = new Map(
      items.map(item => [item.dataset.id, item])
    );

    let activeId = null;

    const activateItem = (id) => {
      if (activeId === id) return;
      activeId = id;

      // Класс для активного hero__item
      items.forEach(i => i.classList.toggle('is-active', i.dataset.id === id));

      const item = itemMap.get(id);
      if (item) centerItem(item);
    };

    const centerItem = (item) => {
      const wrapRect = wrapper.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      const delta =
        itemRect.left -
        wrapRect.left -
        (wrapRect.width / 2 - itemRect.width / 2);

      wrapper.scrollBy({
        left: delta,
        behavior: 'smooth'
      });
    };

    // IntersectionObserver для секций
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const sectionId = entry.target.id; // берем id секции
          activateItem(sectionId);
        });
      },
      {
        rootMargin: '-30% 0px -70% 0px', // активируем, когда секция почти у верхней границы
        threshold: 0
      }
    );

    sections.forEach(section => observer.observe(section));
  })();

});