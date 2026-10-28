/**
 * Assainissement du texte enrichi (cahier des charges, sections 6 et 9).
 *
 * Le corps d'un article est saisi dans un éditeur du navigateur : on reçoit donc
 * du HTML, qu'il faut nettoyer avant de l'enregistrer. Le principe retenu est
 * celui du générateur du site public (site-public/contenu.py) : on ne filtre pas
 * les attributs reçus, on **réécrit** chaque balise gardée à partir de zéro. Un
 * gestionnaire d'événement, un style ou un attribut inattendu ne peut donc pas
 * traverser le nettoyage, puisque rien de ce qui entre n'est recopié tel quel.
 *
 * Le texte, lui, est systématiquement échappé. Les balises inconnues perdent
 * leur balisage mais gardent leur texte ; celles qui portent du code
 * (script, style, iframe…) sont retirées avec leur contenu.
 */

/** Les seules balises qui ressortent du nettoyage. */
const ALLOWED = new Set([
  'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
  'strong', 'em', 'a', 'img', 'blockquote', 'br', 'hr',
]);

/** Balises sans fermeture. */
const VOID_TAGS = new Set(['img', 'br', 'hr']);

/** Retirées avec tout ce qu'elles contiennent. */
const STRIPPED = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'template', 'svg', 'math', 'noscript',
]);

/**
 * Équivalences : un éditeur de navigateur produit <b>, <i> ou <div>, et un
 * copier-coller apporte des <h1>. On les ramène sur les balises gardées plutôt
 * que de perdre la mise en forme.
 */
const EQUIVALENTS: Record<string, string> = {
  b: 'strong',
  i: 'em',
  u: 'em',
  h1: 'h2',
  h5: 'h4',
  h6: 'h4',
  div: 'p',
  section: 'p',
  article: 'p',
};

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', deg: '°', euro: '€',
  times: '×', copy: '©', eacute: 'é', egrave: 'è', ecirc: 'ê',
  agrave: 'à', acirc: 'â', ccedil: 'ç', ugrave: 'ù', ucirc: 'û', ocirc: 'ô', icirc: 'î',
};

/** Décodage avant contrôle : « java&#115;cript: » ne doit pas passer pour une adresse. */
function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;');
}

/** Seules les adresses manifestement inoffensives sont gardées. */
function safeUrl(value: string | undefined): string {
  const url = decodeEntities((value ?? '').trim()).replace(/[\u0000-\u001f\u007f]/g, '');
  return /^(https?:\/\/|mailto:|\/|#)/i.test(url) ? url : '';
}

/** Attributs d'une balise ouvrante, sans jamais interpréter leur valeur. */
function readAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    const value = match[2] ?? '';
    const unquoted = /^["']/.test(value) ? value.slice(1, -1) : value;
    attrs[match[1].toLowerCase()] = unquoted;
  }
  return attrs;
}

/** Balise ouvrante réécrite : seuls les attributs prévus, avec des valeurs contrôlées. */
function openTag(tag: string, attrs: Record<string, string>): string {
  if (tag === 'a') {
    const href = safeUrl(attrs.href);
    if (!href) return '<a>';
    const external = /^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${escapeAttribute(href)}"${external}>`;
  }
  if (tag === 'img') {
    const src = safeUrl(attrs.src);
    if (!src) return '';
    const alt = escapeAttribute(decodeEntities(attrs.alt ?? ''));
    return `<img src="${escapeAttribute(src)}" alt="${alt}" loading="lazy">`;
  }
  return `<${tag}>`;
}

/** Nom de balise normalisé, ou null si elle ne ressort pas du nettoyage. */
function keptTag(name: string): string | null {
  const tag = EQUIVALENTS[name] ?? name;
  return ALLOWED.has(tag) ? tag : null;
}

/**
 * Nettoie du texte enrichi et renvoie du HTML sûr à enregistrer.
 * Les balises ouvertes et non fermées le sont à la fin.
 */
export function sanitizeRichText(input: string | null | undefined): string {
  const source = input ?? '';
  const out: string[] = [];
  const open: string[] = [];
  let stripping = 0;
  let index = 0;

  const token = /<!--[\s\S]*?-->|<![^>]*>|<\?[\s\S]*?\?>|<\s*\/\s*([a-zA-Z][^\s/>]*)[^>]*>|<\s*([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let match: RegExpExecArray | null;

  while ((match = token.exec(source)) !== null) {
    if (match.index > index) {
      const text = source.slice(index, match.index);
      if (!stripping) out.push(escapeText(decodeEntities(text)));
    }
    index = match.index + match[0].length;

    const closing = match[1]?.toLowerCase();
    const opening = match[2]?.toLowerCase();

    if (closing) {
      if (STRIPPED.has(closing)) {
        stripping = Math.max(0, stripping - 1);
        continue;
      }
      if (stripping) continue;
      const tag = keptTag(closing);
      // On ne ferme que ce qui est réellement ouvert, et on referme au passage
      // ce qui est resté ouvert à l'intérieur.
      if (tag && !VOID_TAGS.has(tag)) {
        const depth = open.lastIndexOf(tag);
        if (depth !== -1) {
          while (open.length > depth) out.push(`</${open.pop()}>`);
        }
      }
      continue;
    }

    if (opening) {
      if (STRIPPED.has(opening)) {
        // <script/> se ferme tout seul : rien à ignorer ensuite.
        if (!/\/\s*$/.test(match[3] ?? '')) stripping += 1;
        continue;
      }
      if (stripping) continue;
      const tag = keptTag(opening);
      if (!tag) continue;
      const attrs = readAttributes(match[3] ?? '');
      // Un paragraphe ne contient pas un paragraphe : on ferme le précédent.
      if ((tag === 'p' || tag === 'li') && open[open.length - 1] === tag) {
        out.push(`</${open.pop()}>`);
      }
      const html = openTag(tag, attrs);
      if (!html) continue;
      out.push(html);
      if (!VOID_TAGS.has(tag)) open.push(tag);
      continue;
    }
    // Commentaire, doctype ou instruction de traitement : rien à garder.
  }

  if (index < source.length && !stripping) {
    out.push(escapeText(decodeEntities(source.slice(index))));
  }
  while (open.length) out.push(`</${open.pop()}>`);

  return out.join('').replace(/<p>\s*<\/p>/g, '').trim();
}

/** Texte brut tiré du corps, pour calculer un extrait ou un temps de lecture. */
export function richTextToPlain(html: string | null | undefined): string {
  return decodeEntities((html ?? '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}
