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
  const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);

  const lenis = new Lenis({
    smooth: !isIOS,     // ❗ iOS — только native scroll
    lerp: 0.1,
    wheelMultiplier: 1,
    touchMultiplier: 1,
    anchors: false,     // ❗ anchors на iOS ломают viewport
  });

  window.lenis = lenis;

  if (!isIOS) {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  /**
   * Смена верхней границы крепления блоков при смене позции якоря Lenis
   */
  // (function syncLenisAnchorOffset() {
  //   const html = document.documentElement;

  //   let lastOffset = -100;

  //   function updateOffset() {
  //     const hasHeaderOut = html.classList.contains('header-out');
  //     const nextOffset = hasHeaderOut ? -165 : -100;

  //     if (nextOffset === lastOffset) return;

  //     lastOffset = nextOffset;
  //     lenis.options.anchors.offset = nextOffset;
  //   }

  //   // начальное состояние
  //   updateOffset();

  //   // следим за изменением класса html
  //   const observer = new MutationObserver(updateOffset);
  //   observer.observe(html, {
  //     attributes: true,
  //     attributeFilter: ['class'],
  //   });
  // })();

  // iOS Safari safe

  /**
   * Управляет поведением хедера
   */
  (function headerFunc() {
    const html = document.documentElement;
    const header = document.getElementById('header');
    const firstSection = document.querySelector('section');
    let lastScrollTop = 1;
    const scrollPosition = () => window.pageYOffset || document.documentElement.scrollTop;

    window.addEventListener('scroll', () => {
      if (scrollPosition() > lastScrollTop && scrollPosition() > firstSection.offsetHeight) {
        html.classList.add('header-out');
      } else {
        html.classList.remove('header-out');
      }
      lastScrollTop = scrollPosition();
    })
  })();

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

      static scrollY = 0;

      // --- Запуск попапа ---
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

        if (this.lenis && stack.length === 1 && !this.lenis.isStopped) {
          this.lenis.stop();
        }
        BottomPopup.scrollY = window.lenis
          ? window.lenis.scroll
          : window.scrollY;

        document.documentElement.classList.add('popup-open');

        // --- history для back button ---
        if (!this._historyAdded) {
          history.pushState({ popup: true }, '');
          this._historyAdded = true;
        }
      }

      // --- Закрытие попапа ---
      close(duration = 0.3, fromPopstate = false) {
        if (!this.popup || !this.isOpen()) return;

        const stack = BottomPopup.stack;
        const isTop = stack[stack.length - 1] === this;
        if (!isTop) return;

        stack.pop();

        this.popup.style.transition =
          `transform ${duration}s cubic-bezier(0.25,0.8,0.25,1)`;
        this.popup.style.transform = 'translateY(100%)';
        this.popup.dataset.open = 'false';

        const prev = stack[stack.length - 1];
        if (prev) prev.popup.classList.remove('is-under');

        if (stack.length === 0) {
          const scrollY = BottomPopup.scrollY;

          requestAnimationFrame(() => {
            if (window.lenis) window.lenis.scrollTo(scrollY, { immediate: true });
            else window.scrollTo(0, scrollY);

            document.documentElement.classList.remove('popup-open');

            if (!isIOS && this.lenis && this.lenis.isStopped) {
              this.lenis.start();
            }
          });
        }

        // важно: флаг только при НЕ popstate
        if (!fromPopstate) {
          this._ignorePopstate = true;
        }
      }

      // --- Закрытие попапа повторным нажатием ---
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

        if (
          this.lenis &&
          stack.length === 1 &&
          !this.lenis.isStopped
        ) {
          this.lenis.stop();
        }
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
            if (scrollTop > 0 && !startedOnHeader) {
              this.lastY = y; // фиксируем последнее положение
              return; // прокручиваем контент, не трогаем попап
            }
          }
        } else return; // свайп вверх не трогаем

        if (delta < 0) delta = 0;
        const resistance = delta > 120 ? 120 + (delta - 120) * 0.35 : delta;

        this.popup.style.transform = `translateY(${resistance / 10}rem)`;
        this.lastY = y;

        // --- полностью убрано preventDefault ---
        // passive:true в слушателях позволяет iOS корректно scroll bounce
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
      contacts: new BottomPopup(document.getElementById('contacts'), window.lenis),
      offers: new BottomPopup(document.getElementById('offers'), window.lenis),
      offersInner: new BottomPopup(document.getElementById('offersInner'), window.lenis),
      shares: new BottomPopup(document.getElementById('shares'), window.lenis),
      profile: new BottomPopup(document.getElementById('profile'), window.lenis),
      profileCard: new BottomPopup(document.getElementById('profileCard'), window.lenis),
      profileDetails: new BottomPopup(document.getElementById('profileDetails'), window.lenis),
      reg: new BottomPopup(document.getElementById('reg'), window.lenis),
      regCode: new BottomPopup(document.getElementById('regCode'), window.lenis),
      cards: new BottomPopup(document.getElementById('cards'), window.lenis),
      cardsAdd: new BottomPopup(document.getElementById('cardsAdd'), window.lenis),
      branchSelect: new BottomPopup(document.getElementById('branchSelect'), window.lenis),
      addressAdd: new BottomPopup(document.getElementById('addressAdd'), window.lenis),
      addressEdit: new BottomPopup(document.getElementById('addressEdit'), window.lenis),
      afisha: new BottomPopup(document.getElementById('afisha'), window.lenis),
      favorite: new BottomPopup(document.getElementById('favorite'), window.lenis),
      search: new BottomPopup(document.getElementById('search'), window.lenis)
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
      if (!top || !top.isOpen()) return;

      // если мы сами закрываем попап, игнорируем popstate
      if (top._ignorePopstate) {
        top._ignorePopstate = false;
        return;
      }

      // закрываем верхний попап мгновенно
      top.close(0, true);
    });
  })();

  /**
   * Меняет класс у тега html на login
   */
  (() => {
    const loginBtn = document.querySelector('[data-log="login"]');
    const logoutBtn = document.querySelector('[data-log="logout"]');

    if (loginBtn || logoutBtn) {
      loginBtn.addEventListener('click', () => {
        document.documentElement.classList.remove('logout');
        document.documentElement.classList.add(loginBtn.dataset.log);
      })
      logoutBtn.addEventListener('click', () => {
        document.documentElement.classList.remove('login');
        document.documentElement.classList.add(logoutBtn.dataset.log);
      })
    }
  })();

  /**
   * Шагово меняем фокус у инпута при вводе кода при регистрации
   */
  (() => {
    const regCode = document.getElementById('regCode');
    if (!regCode) return;

    const inputs = regCode.querySelectorAll('.form-code');
    const btn = regCode.querySelector('.btn');

    // Функция для проверки, все ли поля заполнены
    const checkInputs = () => {
      const allFilled = Array.from(inputs).every(input => input.value.length > 0);
      btn.disabled = !allFilled;
    };

    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        // Ограничиваем ввод только одной цифрой (на случай ошибок или автозаполнения)
        if (e.target.value.length > 1) {
          e.target.value = e.target.value.slice(-1);
        }

        if (e.target.value) {
          if (index < inputs.length - 1) {
            inputs[index + 1].focus();
          } else {
            btn.focus();
          }
        }

        checkInputs(); // Проверяем состояние кнопки при каждом вводе
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          inputs[index - 1].focus();
        }
        // Вызываем проверку после нажатия клавиши (с небольшой задержкой, чтобы значение обновилось)
        setTimeout(checkInputs, 0);
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').trim().slice(0, inputs.length);
        if (data) {
          data.split('').forEach((char, i) => {
            if (inputs[i]) inputs[i].value = char;
          });

          if (data.length === inputs.length) {
            btn.focus();
          } else {
            inputs[data.length].focus();
          }
        }
        checkInputs(); // Проверяем состояние после вставки
      });
    });

    // Инициализация: проверяем состояние кнопки при загрузке (если поля вдруг предзаполнены)
    checkInputs();
  })();

  /**
   * Навигация по layout__nav внутри layout
   * 
   * Универсальная навигация по layout__nav для вертикальных и горизонтальных layout
   * - Вертикальные layout: прокрутка страницы с помощью Lenis или window.scrollTo
   * - Горизонтальные layout (layout--carousel): прокрутка контейнера layout__items по горизонтали
   */
  (function () {
    const OFFSET_REM = 26;

    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('.layout__nav-item');
      if (!navBtn) return;

      const layout = navBtn.closest('.layout');
      if (!layout) return;

      const nav = layout.querySelector('.layout__nav');
      if (!nav) return;

      const navItems = nav.querySelectorAll('.layout__nav-item');
      const targetKey = navBtn.dataset.nav;

      const cards = layout.querySelectorAll('.card[data-dish]');
      if (!cards.length) return;

      const isCarousel = layout.classList.contains('layout--carousel');

      if (isCarousel) {
        // Горизонтальный scroll
        const container = layout.querySelector('.layout__items');
        const targetCard = Array.from(cards).find(card => card.dataset.dish === targetKey);
        if (!targetCard) return;

        const cardLeft = targetCard.offsetLeft;
        const cardWidth = targetCard.offsetWidth;
        const containerWidth = container.clientWidth;

        const scrollTarget = cardLeft - (containerWidth / 2 - cardWidth / 2);

        container.scrollTo({
          left: scrollTarget,
          behavior: 'smooth'
        });
      } else {
        // Вертикальный scroll
        const targetCard = Array.from(cards).find(card => card.dataset.dish === targetKey);
        if (!targetCard) return;

        // offset в rem переводим в px для JS
        const offsetPx = OFFSET_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);

        const cardTop = targetCard.getBoundingClientRect().top + window.scrollY - offsetPx;

        if (lenis && lenis.scrollTo) {
          lenis.scrollTo(cardTop, {
            duration: 1.1,
            easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
          });
        } else {
          window.scrollTo({ top: cardTop, behavior: 'smooth' });
        }
      }

      navItems.forEach(btn => btn.classList.remove('active'));
      navBtn.classList.add('active');
    });

    const layouts = document.querySelectorAll('.layout');

    layouts.forEach(layout => {
      const nav = layout.querySelector('.layout__nav');
      if (!nav) return;

      const navItems = nav.querySelectorAll('.layout__nav-item');
      const cards = layout.querySelectorAll('.card[data-dish]');
      if (!cards.length) return;

      const isCarousel = layout.classList.contains('layout--carousel');

      const updateActiveNav = () => {
        let currentCard = null;

        if (isCarousel) {
          const container = layout.querySelector('.layout__items');
          const scrollPos = container.scrollLeft + container.clientWidth / 2;

          for (const card of cards) {
            const cardLeft = card.offsetLeft;
            const cardRight = cardLeft + card.offsetWidth;

            if (scrollPos >= cardLeft && scrollPos <= cardRight) {
              currentCard = card;
              break;
            }
          }
        } else {
          const offsetPx = OFFSET_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);
          const scrollPos = window.scrollY + offsetPx;

          for (const card of cards) {
            const cardTop = card.getBoundingClientRect().top + window.scrollY;
            if (scrollPos >= cardTop) {
              currentCard = card;
            } else {
              break;
            }
          }
        }

        if (!currentCard) return;

        const targetKey = currentCard.dataset.dish;

        navItems.forEach(btn => {
          const isActive = btn.dataset.nav === targetKey;
          btn.classList.toggle('active', isActive);

          if (isActive) {
            const btnLeft = btn.offsetLeft;
            const btnRight = btnLeft + btn.offsetWidth;
            const navScrollLeft = nav.scrollLeft;
            const navRightEdge = navScrollLeft + nav.clientWidth;

            if (btnLeft < navScrollLeft || btnRight > navRightEdge) {
              nav.scrollTo({
                left: btnLeft - nav.clientWidth / 2 + btn.offsetWidth / 2,
                behavior: 'smooth'
              });
            }
          }
        });
      };

      if (isCarousel) {
        const container = layout.querySelector('.layout__items');
        container.addEventListener('scroll', updateActiveNav);
      } else {
        window.addEventListener('scroll', updateActiveNav);
        if (lenis && lenis.on) {
          lenis.on('scroll', updateActiveNav);
        }
      }

      updateActiveNav();
    });
  })();

  /**
   * Присваиваем класс у заполненного инпута
   */
  const form = document.querySelector('form');
  if (form) {
    const inputElements = document.querySelectorAll('.form-input');
    const textareaElements = document.querySelectorAll('.form-textarea');
    const className = 'filled';

    inputElements.forEach(element => {
      element.addEventListener('input', function () {
        if (this.value.trim() !== '') {
          element.classList.add(className);
        } else {
          element.classList.remove(className);
        }
      });
    });

    textareaElements.forEach(element => {
      element.addEventListener('input', function () {
        if (this.value.trim() !== '') {
          element.classList.add(className);
        } else {
          element.classList.remove(className);
        }
      });
    });
  }

  /**
   * Инициализация swiper
   */
  if (document.querySelector('.swiper')) {

    const swiper = new Swiper(".nav__slider", {
      slidesPerGroup: 1,
      slidesPerView: 'auto',
      spaceBetween: 8,
      grabCursor: true,

      speed: 180,
      touchRatio: 1.6,
      resistanceRatio: 0.65,

      centeredSlides: false,
      centeredSlidesBounds: true,
      centerInsufficientSlides: true,
      slidesOffsetBefore: 0,
      slidesOffsetAfter: 0,
      loop: false,
      simulateTouch: true,
      watchOverflow: true,

      direction: 'horizontal',
      touchStartPreventDefault: true,
      touchMoveStopPropagation: true,
      threshold: 8,
      touchAngle: 25, // ключевой параметр

      freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 0.85, // меньше инерции
        momentumVelocityRatio: 1,
        momentumBounce: false, // убрать bounce
        sticky: false // убрать залипание
      },

      mousewheel: {
        forceToAxis: true,
        sensitivity: 1,
        releaseOnEdges: true
      },
    });

    swiper.on('touchStart', () => {
      if (window.lenis && !window.lenis.isStopped) {
        window.lenis.stop();
      }
    });

    swiper.on('touchEnd', () => {
      if (window.lenis && window.lenis.isStopped) {
        window.lenis.start();
      }
    });

  }

  /**
   * Поведение навигации nav
   */
  (() => {
    const sliderEl = document.querySelector('.nav__slider');
    if (!sliderEl || !window.lenis) return;

    const swiper = sliderEl.swiper;
    if (!swiper) return;

    const items = [...sliderEl.querySelectorAll('.nav__item[data-id]')];
    const sections = items
      .map(i => document.getElementById(i.dataset.id))
      .filter(Boolean);

    const itemMap = new Map(items.map(i => [i.dataset.id, i]));

    let activeId = null;
    let isAutoSliding = false;
    let isClickActivation = false;

    /* =======================
       Активный пункт
    ======================= */
    function setActive(id) {
      if (activeId === id) return;
      activeId = id;

      for (const item of items) {
        if (item.dataset.id === id) item.classList.add('is-active');
        else item.classList.remove('is-active');
      }

      const item = itemMap.get(id);
      if (item) ensureVisible(item);
    }

    /* =======================
       Центрирование слайда
    ======================= */
    function ensureVisible(item) {
      // кликом НИКОГДА не двигаем swiper
      if (isClickActivation) return;

      const slide = item.closest('.swiper-slide');
      if (!slide) return;

      const slideIndex = swiper.slides.indexOf(slide);
      if (slideIndex === -1) return;

      const maxIndex = swiper.slides.length - 1;

      // жёсткий лок крайних
      if (slideIndex === 0 || slideIndex === maxIndex) {
        return;
      }

      const slideRect = slide.getBoundingClientRect();
      const wrapRect = swiper.el.getBoundingClientRect();

      // если уже виден — ничего не делаем
      if (
        slideRect.left >= wrapRect.left &&
        slideRect.right <= wrapRect.right
      ) {
        return;
      }

      const currentTranslate = swiper.getTranslate();

      const targetTranslate =
        currentTranslate -
        (
          slideRect.left -
          wrapRect.left -
          (wrapRect.width / 2 - slideRect.width / 2)
        );

      // ограничиваем translate, чтобы не уехать за края
      const minTranslate = swiper.maxTranslate();
      const maxTranslate = swiper.minTranslate();

      const clampedTranslate = Math.max(
        minTranslate,
        Math.min(maxTranslate, targetTranslate)
      );

      isAutoSliding = true;

      swiper.setTransition(220);
      swiper.setTranslate(clampedTranslate);

      setTimeout(() => {
        swiper.setTransition(0);
        isAutoSliding = false;
      }, 230);
    }

    /* =======================
       Клик по навигации
    ======================= */
    items.forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();

        isClickActivation = true;

        const id = item.dataset.id;
        const section = document.getElementById(id);
        if (!section) return;

        setActive(id);

        window.lenis.scrollTo(section, {
          offset: -100,
          duration: 1.1,
          easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });

        requestAnimationFrame(() => {
          isClickActivation = false;
        });
      });
    });

    /* =======================
       IntersectionObserver
       30% viewport
    ======================= */
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          setActive(entry.target.id);
        });
      },
      {
        threshold: 0.3
      }
    );

    sections.forEach(sec => observer.observe(sec));

    /* =======================
       Прерывание автоскролла
       при касании
    ======================= */
    swiper.on('touchStart', () => {
      if (isAutoSliding) {
        swiper.setTransition(0);
        isAutoSliding = false;
      }
    });

    swiper.on('touchStart', () => {
      if (isAutoSliding) {
        swiper.setTransition(0);
        isAutoSliding = false;
      }
    });

  })();

});