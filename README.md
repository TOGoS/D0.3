# D0.3

Yet another browser/JavaScript implementation of [Dungeon](http://www.nuke24.net/dlog/Dungeon.html).

Goal is to recreate Dungeon pretty much as it was, for historical reasons.

- [X] 3x3 tile rooms
- [X] 1 or 2-way portals between rooms
- [X] Keys
- [ ] Doors between rooms which may or not be locked, and may or not be see-through
- [X] Thin walls between rooms (i.e. you don't need a full 'block')
- [ ] Text-based dungeon description
  - Including bitmaps, I suppose
- [ ] Stairs or ladders
- [ ] Background items with explicit Z ordering

Once that is done, I can go nuts and make other things,
but the point is to stick pretty close to the original.

Features beyond orignal that might be nice:

- [ ] Sound effects
- [ ] Ambient sounds/music?
- [ ] Pits in floor
- [ ] 2.5D rendering???
- [ ] Random maze generation?

## Implementation Philosophy

Having to install a bunch of tooling and learn the build tools kills things for me.

Therefore I'm keeping this as build-step-free as possible.

VS Code can do perfectly cromulent TypeScript-style type checking on JavaScript source
right out of the box, so I'm using that.

I've been letting CoPilot autocomplete some of the more tedious bits for me,
but not letting it do any real architecture/design work, since that always
ends up costing more time than it saves.
