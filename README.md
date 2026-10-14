# Teaboom.ru — карточка товара «Ананасовый улун»

**Демо:** https://urozaev.github.io/product-card/

## Запуск

Сборка не нужна: скомпилированный CSS лежит в репозитории, достаточно открыть `index.html`
. Для правок стилей:

```bash
npm install      # только если нужно править SCSS
npm run dev      # sass --watch: scss/ → css/main.css
npm run build    # минифицированная сборка
npm start        # локальный сервер (npx serve)
```

## Структура

```
index.html
css/main.css               — собранный CSS
scss/
  main.scss                — точка входа
  _tokens.scss             — CSS-переменные (палитра, типографика, отступы), брейкпоинты, миксины
  _base.scss               — reset и базовые стили
  components/              — по файлу на БЭМ-блок: header, breadcrumbs, product, packs, buy, about, overlays
js/product.js              — логика карточки
img/                       — фото в AVIF/WebP/JPEG (480/720/970) и логотип
```

Изображения и тексты взяты с [teaboom.ru](https://teaboom.ru/product/ananasovij-ulun).
