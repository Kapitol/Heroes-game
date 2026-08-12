// The founding, told once before the first run.
//
// Nine painted panels from `art/Story/`, each with a blank cartouche built into
// the bottom of the picture, and the copy from `LORE.md` set into it. It plays
// on a player's first launch, is skippable at any point, and never plays again
// unless asked for.
//
// **The panels carry their own caption box, so the text is positioned against
// the picture rather than against the screen.** Each image reserves the bottom
// fifth of itself for the words; a caption laid out in a bar under the image
// would leave that box empty and the game would look like it had lost its
// script. The image is fitted, its drawn rectangle is measured, and the type
// sits inside that rectangle — which is why this is a wrapper sized to the
// panel's aspect rather than the more obvious full-bleed background.
//
// **A panel that fails to load is dropped rather than shown.** `panel 1.png`
// arrived as a 167-byte proxy error and would otherwise have opened the game
// with a broken-image icon; when it is re-exported it joins the sequence with
// no code change. The same rule covers a half-finished panel added later.

const SEEN = 'cryptheroes.intro';

/**
 * The script. One entry per panel, in order.
 *
 * The words are `LORE.md` cut to what a picture can carry — a caption is read
 * in the four seconds someone looks at the art, so each is one or two
 * sentences and the shape of the whole is a story rather than a summary.
 */
const PANELS = [
  { src: 'art/Story/panel 1.png',
    text: 'His parishioners were changing. A priest saw it first in the small things, and named it evil.' },
  { src: 'art/Story/panel 2.png',
    text: 'He raised the cross against it and read the old rites over them. Nothing he did touched it.' },
  { src: 'art/Story/panel 3.png',
    text: 'When the rites failed, he was left with his own helplessness — and with the length of a night to fill.' },
  { src: 'art/Story/panel 4.png',
    text: 'So he asked for help from beyond the living realm, and something answered.' },
  { src: 'art/Story/panel 5.png',
    text: 'He did not notice the turning. The thing he had been casting out was now the thing casting.' },
  { src: 'art/Story/panel 6.png',
    text: 'An angelic presence broke the connection — but the power stayed. Knowing at last what he was, he went to the old manuscripts.' },
  { src: 'art/Story/panel 7.png',
    text: 'He came out of them a Paladin, holding light in one hand and darkness in the other.' },
  { src: 'art/Story/panel 8.png',
    text: 'With both, he undid what he had done to them. Each one rose changed — warrior, mage, paladin, priest.' },
  { src: 'art/Story/panel 9.png',
    text: 'They took a name and became an order. Then the portals opened, and the order started sending them through.' },
];

let node = null;

/** Whether the founding has already been told on this machine. */
export const seen = () => localStorage.getItem(SEEN) === '1';

/**
 * Play it, then call `done`.
 *
 * Advancing is a click anywhere, `→`, space or enter; leaving is `Esc` or the
 * skip control. Both routes mark it seen: a player who skips has decided they
 * do not want it, and showing it again next launch would be arguing.
 */
export function play(done) {
  const finish = () => {
    localStorage.setItem(SEEN, '1');
    window.removeEventListener('keydown', onKey);
    if (node) node.remove();
    node = null;
    done();
  };

  // Loaded before anything is shown. A panel that pops in a beat after its
  // caption reads as a bug, and the whole set is a few megabytes decoded once.
  const shots = [];
  let pending = PANELS.length;
  const ready = () => {
    if (--pending > 0) return;
    if (!shots.length) return finish();     // nothing decoded — say nothing
    shots.sort((a, b) => a.i - b.i);
    show();
  };
  PANELS.forEach((p, i) => {
    const img = new Image();
    img.onload = () => { shots.push({ ...p, img, i }); ready(); };
    img.onerror = ready;                    // a broken panel is simply not told
    img.src = p.src;
  });

  let at = 0;
  const next = () => { at += 1; at >= shots.length ? finish() : show(); };
  const onKey = (e) => {
    if (e.key === 'Escape') finish();
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') next();
    else return;
    e.preventDefault();
  };

  function show() {
    if (!node) {
      node = document.createElement('div');
      node.id = 'intro';
      node.innerHTML = `
        <div class="introPlate">
          <img class="introArt" alt="">
          <p class="introText"></p>
        </div>
        <div class="introBar">
          <span class="introDots"></span>
          <button class="introSkip" type="button">Skip</button>
        </div>`;
      document.body.appendChild(node);
      node.addEventListener('click', (e) => {
        if (e.target.closest('.introSkip')) finish(); else next();
      });
      window.addEventListener('keydown', onKey);
    }

    const s = shots[at];
    const plate = node.querySelector('.introPlate');
    // The plate takes the panel's own aspect, so the caption box painted into
    // the picture and the caption element land on the same rectangle whatever
    // the shape of the panel — and these run both portrait and landscape.
    plate.style.aspectRatio = `${s.img.naturalWidth} / ${s.img.naturalHeight}`;
    node.querySelector('.introArt').src = s.src;
    node.querySelector('.introText').textContent = s.text;
    node.querySelector('.introDots').textContent =
      shots.map((_, i) => (i === at ? '◆' : '◇')).join(' ');
  }
}
