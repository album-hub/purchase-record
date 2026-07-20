# Fansign Manager V6.0

## Dashboard
- Rebuilt the home dashboard with a Notion × Spotify × iOS visual direction.
- Added time-aware greeting, date, live order summary, clearer hierarchy, and responsive quick actions.
- Preserved every existing dashboard statistic and action.
- Updated cards, navigation, modals, colors, spacing, and responsive behavior with a soft lavender design system.

## Music system
- Added a fixed, collapsible mini player with cover, title, artist, previous, play/pause, next, progress, and volume controls.
- Added an expandable music library and recently played list.
- Added list loop, single-track loop, and shuffle playback modes.
- Added autoplay preference with browser-policy fallback messaging.
- Persisted volume, mode, selected track, progress, autoplay, collapsed state, and recent tracks in a separate LocalStorage key.
- Added `js/music-player.js` as an isolated module.
- Added `assets/music.json` as the only music catalog source.

## Compatibility
- Kept the existing order LocalStorage key and schema unchanged.
- No Theme Store, remote theme downloader, Welcome Voice, or pack installer was added.

## Sunrise UI
- Added a shared black, rose-gold and sunrise visual system across Home, Channel Orders, Buyer Orders, Search, Settings, dialogs and the music library.
- Added a responsive six-member artwork rail in the order Sowon, Yerin, Eunha, Yuju, SinB and Umji.
- Bundled the six user-provided GFRIEND C:ON portraits as the Sunrise Theme defaults while preserving the in-app replacement controls.
- Added `assets/theme/sunrise/theme.json` as the source of truth for logo, background, member artwork, default music cover and color tokens.
- Added `js/theme-loader.js` with theme-token application and future folder-based theme activation.
- Added per-member image replacement, immediate preview and reset controls in Settings.
- Stored resized custom member images as WebP Blobs in IndexedDB instead of embedding Base64 in source code or order data.
- Made the music player default to collapsed on first use at phone widths while preserving explicit user preference.
