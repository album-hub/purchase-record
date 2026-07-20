# Fansign Manager Theme resources

The active theme is loaded from `assets/theme/<theme-id>/theme.json` by
`js/theme-loader.js`. Sunrise is the only completed theme in V6.

## Sunrise folders

```text
assets/theme/sunrise/
├── theme.json
├── background/
├── icons/
├── members/
└── music/
```

`theme.json` is the source of truth for the logo, background, member artwork,
default music cover and color tokens. Do not hard-code these assets in HTML or
CSS.

## Replacing the six default images

The safest option is **Settings → Sunrise 主題與人物圖片 → 更換**. Uploaded
images are resized to a maximum edge of 1800 px, encoded as WebP and stored as
Blobs in IndexedDB. They are not written into the order LocalStorage schema.

The bundled placeholders are:

- `members/sowon.svg`
- `members/yerin.svg`
- `members/eunha.svg`
- `members/yuju.svg`
- `members/sinb.svg`
- `members/umji.svg`

To make real images the project defaults, add local image files to `members/`
and update the six paths in `theme.json`.

## Adding another theme later

Add a sibling folder such as `assets/theme/midnight/theme.json` with the same
contract. The loader can activate it without changing core UI code:

```js
FansignTheme.activate("midnight")
```

V6 intentionally does not include a theme store or theme download UI.
