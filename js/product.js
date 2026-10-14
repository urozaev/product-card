/**
 * Карточка товара: смена фасовки, количество, «В корзину», избранное, лайтбокс,
 * мобильная панель покупки.
 *
 * Данные фасовок лежат в data-атрибутах radio-кнопок — разметку отдаёт сервер
 * (в Django это обычный {% for %} по вариантам товара), JS только синхронизирует
 * вывод. Без JS форма всё равно работает: выбор фасовки отправится как name="pack".
 */

// Обычный скрипт с defer, а не type="module": модули блокируются при открытии файла
// через file://, а так страница работает и без локального сервера.
(() => {
  'use strict';

  const QTY_MIN = 1;
  const QTY_MAX = 99;
  const ADDED_STATE_MS = 2000;

  const rub = (value) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);

  const weightLabel = (grams) => (grams >= 1000 ? `${grams / 1000} кг` : `${grams} г`);

  function readPack(input) {
    const price = Number(input.dataset.price);
    const oldPrice = Number(input.dataset.oldPrice);
    const weight = Number(input.dataset.weight);

    return {
      sku: input.value,
      weight,
      price,
      oldPrice,
      discount: oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0,
    };
  }

  function initProduct(form) {
    const packInputs = [...form.querySelectorAll('input[name="pack"]')];
    const qtyInput = form.querySelector('input[name="qty"]');
    const priceBox = form.querySelector('.price');
    const fields = (name) => document.querySelectorAll(`[data-field="${name}"]`);

    // --- Фасовка ---

    function render(pack) {
      fields('price').forEach((el) => {
        el.textContent = rub(pack.price);
        if (el instanceof HTMLDataElement) el.value = pack.price.toFixed(2);
      });
      fields('sku').forEach((el) => (el.textContent = pack.sku));
      fields('weight').forEach((el) => (el.textContent = weightLabel(pack.weight)));

      const hasDiscount = pack.discount > 0;
      fields('old-price').forEach((el) => {
        el.textContent = rub(pack.oldPrice);
        el.parentElement.hidden = !hasDiscount;
      });
      fields('discount').forEach((el) => {
        el.textContent = `−${pack.discount}%`;
        el.hidden = !hasDiscount;
      });

      // Перезапуск анимации цены
      priceBox.classList.remove('is-updated');
      void priceBox.offsetWidth;
      priceBox.classList.add('is-updated');
    }

    function selectedPack() {
      const checked = packInputs.find((input) => input.checked) ?? packInputs[0];
      return readPack(checked);
    }

    form.addEventListener('change', (event) => {
      if (event.target.name !== 'pack') return;
      const pack = readPack(event.target);
      render(pack);

      // Выбранная фасовка в URL — ссылкой можно поделиться
      const url = new URL(location.href);
      url.searchParams.set('pack', pack.sku);
      history.replaceState(null, '', url);
    });

    // Восстановить фасовку из ?pack=01307
    const skuFromUrl = new URLSearchParams(location.search).get('pack');
    const initialInput = packInputs.find((input) => input.value === skuFromUrl);
    if (initialInput) {
      initialInput.checked = true;
      render(readPack(initialInput));
    }

    // --- Количество ---

    const stepButtons = form.querySelectorAll('[data-step]');

    function setQty(value) {
      const qty = Math.min(QTY_MAX, Math.max(QTY_MIN, Math.round(Number(value)) || QTY_MIN));
      qtyInput.value = String(qty);
      stepButtons.forEach((btn) => {
        const step = Number(btn.dataset.step);
        btn.disabled = (step < 0 && qty <= QTY_MIN) || (step > 0 && qty >= QTY_MAX);
      });
      return qty;
    }

    stepButtons.forEach((btn) =>
      btn.addEventListener('click', () => setQty(Number(qtyInput.value) + Number(btn.dataset.step))),
    );
    qtyInput.addEventListener('change', () => setQty(qtyInput.value));
    setQty(qtyInput.value);

    // --- В корзину (без реальной корзины: счётчик в шапке + подтверждение) ---

    const cartCount = document.querySelector('[data-cart-count]');
    const cartLink = cartCount?.closest('a');
    const addButtons = document.querySelectorAll('[data-add-to-cart]');
    const toast = document.querySelector('[data-toast]');
    let addedTimer;
    let toastTimer;

    function showAdded() {
      addButtons.forEach((btn) => {
        btn.classList.add('is-added');
        btn.querySelector('[data-label]').textContent = 'Добавлено';
        btn.querySelector('use').setAttribute('href', '#i-check');
      });

      clearTimeout(addedTimer);
      addedTimer = setTimeout(() => {
        addButtons.forEach((btn) => {
          btn.classList.remove('is-added');
          btn.querySelector('[data-label]').textContent = 'В корзину';
          btn.querySelector('use').setAttribute('href', '#i-cart');
        });
      }, ADDED_STATE_MS);
    }

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('is-visible'), ADDED_STATE_MS + 500);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const pack = selectedPack();
      const qty = setQty(qtyInput.value);

      if (cartCount) {
        cartCount.textContent = String(Number(cartCount.textContent) + qty);
        cartLink.classList.remove('is-bumped');
        void cartLink.offsetWidth;
        cartLink.classList.add('is-bumped');
      }

      showAdded();
      showToast(`Ананасовый улун, ${weightLabel(pack.weight)} × ${qty} — в корзине`);
    });
  }

  // --- Избранное ---

  function initFavorite(button) {
    button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!pressed));
    });
  }

  // --- Лайтбокс ---

  function initLightbox(dialog, openButton) {
    openButton.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('[data-lightbox-close]').addEventListener('click', () => dialog.close());

    // Клик по подложке закрывает окно
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  // --- Мобильная панель: видна, пока основные кнопки покупки вне экрана ---

  function initStickyBuy(panel, actions) {
    const observer = new IntersectionObserver(([entry]) => {
      // Цена и «В корзину» всегда под пальцем: и до блока покупки, и после него
      panel.classList.toggle('is-visible', !entry.isIntersecting);
    });
    observer.observe(actions);
  }

  const form = document.querySelector('[data-buy-form]');
  if (form) initProduct(form);

  const favorite = document.querySelector('[data-favorite]');
  if (favorite) initFavorite(favorite);

  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxOpen = document.querySelector('[data-lightbox-open]');
  if (lightbox && lightboxOpen) initLightbox(lightbox, lightboxOpen);

  const stickyBuy = document.querySelector('[data-sticky-buy]');
  const buyActions = document.querySelector('[data-buy-actions]');
  if (stickyBuy && buyActions) initStickyBuy(stickyBuy, buyActions);
})();
