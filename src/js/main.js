document.addEventListener('DOMContentLoaded', () => {

  let vhRAF = null;

  function setVh() {
    if (vhRAF) cancelAnimationFrame(vhRAF);

    vhRAF = requestAnimationFrame(() => {
      const height = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;

      const vh = height * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
  }

  setVh();
  window.addEventListener('resize', setVh);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVh);
    window.visualViewport.addEventListener('scroll', setVh);
  }

  if (window.visualViewport) {
    const onViewportChange = () => {
      isViewportChanging = true;

      // временно стопаем Lenis, чтобы он не пересчитывал scroll
      if (window.lenis && !window.lenis.isStopped) {
        window.lenis.stop();
      }

      if (viewportRAF) cancelAnimationFrame(viewportRAF);

      viewportRAF = requestAnimationFrame(() => {
        isViewportChanging = false;

        // обновляем размеры
        setVh();

        // возобновляем Lenis ТОЛЬКО если нет popup
        if (
          window.lenis &&
          window.lenis.isStopped &&
          !document.documentElement.classList.contains('popup-open')
        ) {
          window.lenis.start();
        }
      });
    };

    visualViewport.addEventListener('resize', onViewportChange);
    visualViewport.addEventListener('scroll', onViewportChange);
  }

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

  window.lenis = lenis;

  let isViewportChanging = false;
  let viewportRAF = null;

  function raf(time) {
    if (!isViewportChanging) {
      lenis.raf(time);
    }
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  lenis.on('scroll', () => {
    if (document.documentElement.classList.contains('popup-open')) {
      lenis.stop();
    }
  });

  // iOS Safari safe
  const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);

  function lockLenisDuringPopup() {
    if (!isIOS) return;

    const update = () => {
      if (document.documentElement.classList.contains('popup-open')) {
        // полностью блокируем Lenis
        if (window.lenis && !window.lenis.isStopped) window.lenis.stop();
      } else {
        if (window.lenis && window.lenis.isStopped) window.lenis.start();
      }
    };

    // слушаем visualViewport
    if (window.visualViewport) {
      visualViewport.addEventListener('resize', () => {
        if (viewportRAF) cancelAnimationFrame(viewportRAF);
        viewportRAF = requestAnimationFrame(update);
      });
      visualViewport.addEventListener('scroll', () => {
        if (viewportRAF) cancelAnimationFrame(viewportRAF);
        viewportRAF = requestAnimationFrame(update);
      });
    }

    // на случай, если popup открыли/закрыли без resize
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  lockLenisDuringPopup();

  (function () {
    if (!window.visualViewport) return;

    let activeScroll = null;
    let basePadding = 0;

    function updateKeyboardOffset() {
      if (!activeScroll) return;

      const vv = window.visualViewport;
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      );

      activeScroll.style.paddingBottom =
        basePadding + keyboardHeight + 'px';
    }

    function scrollInputIntoView(input) {
      const scroll = input.closest('[data-popup-scroll]');
      if (!scroll) return;

      // абсолютная позиция input внутри scroll
      const inputRect = input.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();

      // верхний оффсет, с учётом клавиатуры
      const vv = window.visualViewport;
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      );

      // высота видимой области scroll
      const visibleHeight = scroll.clientHeight - keyboardHeight;

      // если input не полностью виден — скроллим
      const offsetTop = inputRect.top - scrollRect.top + scroll.scrollTop;

      if (offsetTop < scroll.scrollTop) {
        scroll.scrollTo({ top: offsetTop, behavior: 'smooth' });
      } else if (offsetTop + inputRect.height > scroll.scrollTop + visibleHeight) {
        scroll.scrollTo({
          top: offsetTop - visibleHeight + inputRect.height,
          behavior: 'smooth',
        });
      }
    }

    document.addEventListener('focusin', (e) => {
      const input = e.target.closest('input, textarea, [contenteditable]');
      if (!input) return;

      const scroll = input.closest('[data-popup-scroll]');
      if (!scroll) return;

      activeScroll = scroll;
      basePadding = parseFloat(getComputedStyle(scroll).paddingBottom) || 0;

      updateKeyboardOffset();
      scrollInputIntoView(input);

      visualViewport.addEventListener('resize', updateKeyboardOffset);
      visualViewport.addEventListener('scroll', updateKeyboardOffset);
    });

    document.addEventListener('focusout', () => {
      if (!activeScroll) return;

      activeScroll.style.paddingBottom = basePadding + 'px';

      visualViewport.removeEventListener('resize', updateKeyboardOffset);
      visualViewport.removeEventListener('scroll', updateKeyboardOffset);

      activeScroll = null;
    });
  })();

  // (function () {
  //   if (!window.visualViewport) return;

  //   const POPUP_SELECTOR =
  //     '.popup[data-open="true"]:not(.is-under)';

  //   let keyboardOpened = false;

  //   function updatePopupHeight() {
  //     const vv = window.visualViewport;

  //     const keyboardVisible =
  //       vv.height + vv.offsetTop < window.innerHeight - 10;

  //     if (keyboardVisible === keyboardOpened) return;
  //     keyboardOpened = keyboardVisible;

  //     document.querySelectorAll(POPUP_SELECTOR).forEach((popup) => {
  //       if (keyboardVisible) {
  //         popup.style.height = 'calc(var(--vh) * 100)';
  //       } else {
  //         popup.style.height =
  //           'calc(var(--vh) * 100 - var(--wrapper-padding))';
  //       }
  //     });
  //   }

  //   visualViewport.addEventListener('resize', updatePopupHeight);
  // })();

  // document.addEventListener('popup:close', (e) => {
  //   const popup = e.target.closest('.popup');
  //   if (!popup) return;

  //   popup.style.height = '';
  // });

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
        BottomPopup.scrollY = window.scrollY;

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

          if (window.lenis) {
            window.lenis.scrollTo(scrollY, { immediate: true });
          } else {
            window.scrollTo(0, scrollY);
          }

          requestAnimationFrame(() => {
            document.documentElement.classList.remove('popup-open');
          });

          if (
            this.lenis &&
            this.lenis.isStopped &&
            !isViewportChanging
          ) {
            this.lenis.start();
          }

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
            if (scrollTop > 0 && !startedOnHeader) return; // обычный скролл
          }
        } else return; // свайп вверх не трогаем

        if (delta < 0) delta = 0;
        const resistance = delta > 120 ? 120 + (delta - 120) * 0.35 : delta;

        this.popup.style.transform = `translateY(${resistance}px)`;
        this.lastY = y;

        if (!isIOS && e.cancelable) {
          e.preventDefault();
        }
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
      favorite: new BottomPopup(document.getElementById('favorite'), window.lenis)
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

  /**
   * Фиксация главной навигации страницы
   */
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

  /**
   * Меняет класс у тега html на login
   */
  (() => {
    const loginBtn = document.querySelector('[data-log="login"]');
    const logoutBtn = document.querySelector('[data-log="logout"]');

    loginBtn.addEventListener('click', () => {
      document.documentElement.classList.remove('logout');
      document.documentElement.classList.add(loginBtn.dataset.log);
    })

    logoutBtn.addEventListener('click', () => {
      document.documentElement.classList.remove('login');
      document.documentElement.classList.add(logoutBtn.dataset.log);
    })
  })();

  /**
   * Шагово меняем фокус у инпута при вводе кода при регистрации
   */
  (() => {
    const regCode = document.getElementById('regCode');
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
 * Универсальная навигация по layout__nav для вертикальных и горизонтальных layout
 * - Вертикальные layout: прокрутка страницы с помощью Lenis или window.scrollTo
 * - Горизонтальные layout (layout--carousel): прокрутка контейнера layout__items по горизонтали
 */
  // (function () {
  //   /**
  //    * Обработчик клика по кнопкам навигации
  //    */
  //   document.addEventListener('click', (e) => {
  //     const navBtn = e.target.closest('.layout__nav-item');
  //     if (!navBtn) return; // Если клик не по кнопке nav — игнорируем

  //     const layout = navBtn.closest('.layout');
  //     if (!layout) return;

  //     const nav = layout.querySelector('.layout__nav');
  //     if (!nav) return;

  //     const navItems = nav.querySelectorAll('.layout__nav-item');
  //     const targetKey = navBtn.dataset.nav;

  //     // Все карточки внутри layout с data-dish
  //     const cards = layout.querySelectorAll('.card[data-dish]');
  //     if (!cards.length) return;

  //     const isCarousel = layout.classList.contains('layout--carousel');

  //     if (isCarousel) {
  //       // --- Горизонтальная прокрутка (carousel) ---
  //       const container = layout.querySelector('.layout__items');
  //       const targetCard = Array.from(cards).find(card => card.dataset.dish === targetKey);
  //       if (!targetCard) return;

  //       // Вычисляем положение карточки относительно контейнера
  //       const cardLeft = targetCard.offsetLeft;
  //       const cardWidth = targetCard.offsetWidth;
  //       const containerWidth = container.clientWidth;

  //       // Прокручиваем так, чтобы карточка оказалась по центру
  //       const scrollTarget = cardLeft - (containerWidth / 2 - cardWidth / 2);

  //       container.scrollTo({
  //         left: scrollTarget,
  //         behavior: 'smooth'
  //       });
  //     } else {
  //       // --- Вертикальная прокрутка ---
  //       const targetCard = Array.from(cards).find(card => card.dataset.dish === targetKey);
  //       if (!targetCard) return;

  //       // Позиция относительно документа, с учётом offset (например, шапка)
  //       const cardTop = targetCard.getBoundingClientRect().top + window.scrollY - 260;

  //       if (lenis && lenis.scrollTo) {
  //         lenis.scrollTo(cardTop, {
  //           duration: 1.1,
  //           easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
  //         });
  //       } else {
  //         window.scrollTo({ top: cardTop, behavior: 'smooth' });
  //       }
  //     }

  //     // --- Подсветка активной кнопки ---
  //     navItems.forEach(btn => btn.classList.remove('active'));
  //     navBtn.classList.add('active');
  //   });

  //   /**
  //    * Автоматическое обновление active кнопки при скролле
  //    */
  //   const layouts = document.querySelectorAll('.layout');

  //   layouts.forEach(layout => {
  //     const nav = layout.querySelector('.layout__nav');
  //     if (!nav) return;

  //     const navItems = nav.querySelectorAll('.layout__nav-item');
  //     const cards = layout.querySelectorAll('.card[data-dish]');
  //     if (!cards.length) return;

  //     const isCarousel = layout.classList.contains('layout--carousel');

  //     const updateActiveNav = () => {
  //       let currentCard = null;

  //       if (isCarousel) {
  //         // --- Горизонтальный scroll ---
  //         const container = layout.querySelector('.layout__items');
  //         const scrollPos = container.scrollLeft + container.clientWidth / 2; // центр контейнера

  //         // Находим карточку, которая находится в центре видимой области
  //         for (const card of cards) {
  //           const cardLeft = card.offsetLeft;
  //           const cardRight = cardLeft + card.offsetWidth;

  //           if (scrollPos >= cardLeft && scrollPos <= cardRight) {
  //             currentCard = card;
  //             break;
  //           }
  //         }
  //       } else {
  //         // --- Вертикальный scroll ---
  //         const scrollPos = window.scrollY + 260; // offset от шапки

  //         // Последняя карточка, которая прошла offset
  //         for (const card of cards) {
  //           const cardTop = card.getBoundingClientRect().top + window.scrollY;
  //           if (scrollPos >= cardTop) {
  //             currentCard = card;
  //           } else {
  //             break;
  //           }
  //         }
  //       }

  //       if (!currentCard) return;

  //       const targetKey = currentCard.dataset.dish;

  //       // Обновляем активную кнопку
  //       navItems.forEach(btn => {
  //         const isActive = btn.dataset.nav === targetKey;
  //         btn.classList.toggle('active', isActive);

  //         // Горизонтальная прокрутка nav, чтобы активная кнопка была видна
  //         if (isActive) {
  //           const btnLeft = btn.offsetLeft;
  //           const btnRight = btnLeft + btn.offsetWidth;
  //           const navScrollLeft = nav.scrollLeft;
  //           const navRightEdge = navScrollLeft + nav.clientWidth;

  //           if (btnLeft < navScrollLeft || btnRight > navRightEdge) {
  //             nav.scrollTo({
  //               left: btnLeft - nav.clientWidth / 2 + btn.offsetWidth / 2,
  //               behavior: 'smooth'
  //             });
  //           }
  //         }
  //       });
  //     };

  //     // --- Подписка на события scroll ---
  //     if (isCarousel) {
  //       // Горизонтальный контейнер скроллит сам
  //       const container = layout.querySelector('.layout__items');
  //       container.addEventListener('scroll', updateActiveNav);
  //     } else {
  //       // Вертикальная прокрутка страницы
  //       window.addEventListener('scroll', updateActiveNav);
  //       if (lenis && lenis.on) {
  //         lenis.on('scroll', updateActiveNav);
  //       }
  //     }

  //     // --- Установка active при загрузке страницы ---
  //     updateActiveNav();
  //   });
  // })();
  console.log(window.lenis);

});