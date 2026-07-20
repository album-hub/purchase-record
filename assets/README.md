# Fansign Manager music assets

`music.json` is the only music catalog used by the player. Put MP3 files in
`assets/music/` and cover images in `assets/cover/`, then add entries like this:

```json
[
  {
    "id": "gfriend-track-01",
    "title": "Song title",
    "artist": "Artist name",
    "album": "Album name",
    "file": "music/song-file.mp3",
    "cover": "cover/cover-file.jpg"
  }
]
```

The optional `group` or `pack` field can be added later for music-pack grouping.
