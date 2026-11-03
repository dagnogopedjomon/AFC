"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRichText = sanitizeRichText;
exports.richTextToPlain = richTextToPlain;
const ALLOWED = new Set([
    'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
    'strong', 'em', 'a', 'img', 'blockquote', 'br', 'hr',
]);
const VOID_TAGS = new Set(['img', 'br', 'hr']);
const STRIPPED = new Set([
    'script', 'style', 'iframe', 'object', 'embed', 'template', 'svg', 'math', 'noscript',
]);
const EQUIVALENTS = {
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
const ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', deg: '°', euro: '€',
    times: '×', copy: '©', eacute: 'é', egrave: 'è', ecirc: 'ê',
    agrave: 'à', acirc: 'â', ccedil: 'ç', ugrave: 'ù', ucirc: 'û', ocirc: 'ô', icirc: 'î',
};
function decodeEntities(value) {
    return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
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
function escapeText(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function escapeAttribute(value) {
    return escapeText(value).replace(/"/g, '&quot;');
}
function safeUrl(value) {
    const url = decodeEntities((value ?? '').trim()).replace(/[\u0000-\u001f\u007f]/g, '');
    return /^(https?:\/\/|mailto:|\/|#)/i.test(url) ? url : '';
}
function readAttributes(raw) {
    const attrs = {};
    const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
    let match;
    while ((match = pattern.exec(raw)) !== null) {
        const value = match[2] ?? '';
        const unquoted = /^["']/.test(value) ? value.slice(1, -1) : value;
        attrs[match[1].toLowerCase()] = unquoted;
    }
    return attrs;
}
function openTag(tag, attrs) {
    if (tag === 'a') {
        const href = safeUrl(attrs.href);
        if (!href)
            return '<a>';
        const external = /^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${escapeAttribute(href)}"${external}>`;
    }
    if (tag === 'img') {
        const src = safeUrl(attrs.src);
        if (!src)
            return '';
        const alt = escapeAttribute(decodeEntities(attrs.alt ?? ''));
        return `<img src="${escapeAttribute(src)}" alt="${alt}" loading="lazy">`;
    }
    return `<${tag}>`;
}
function keptTag(name) {
    const tag = EQUIVALENTS[name] ?? name;
    return ALLOWED.has(tag) ? tag : null;
}
function sanitizeRichText(input) {
    const source = input ?? '';
    const out = [];
    const open = [];
    let stripping = 0;
    let index = 0;
    const token = /<!--[\s\S]*?-->|<![^>]*>|<\?[\s\S]*?\?>|<\s*\/\s*([a-zA-Z][^\s/>]*)[^>]*>|<\s*([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
    let match;
    while ((match = token.exec(source)) !== null) {
        if (match.index > index) {
            const text = source.slice(index, match.index);
            if (!stripping)
                out.push(escapeText(decodeEntities(text)));
        }
        index = match.index + match[0].length;
        const closing = match[1]?.toLowerCase();
        const opening = match[2]?.toLowerCase();
        if (closing) {
            if (STRIPPED.has(closing)) {
                stripping = Math.max(0, stripping - 1);
                continue;
            }
            if (stripping)
                continue;
            const tag = keptTag(closing);
            if (tag && !VOID_TAGS.has(tag)) {
                const depth = open.lastIndexOf(tag);
                if (depth !== -1) {
                    while (open.length > depth)
                        out.push(`</${open.pop()}>`);
                }
            }
            continue;
        }
        if (opening) {
            if (STRIPPED.has(opening)) {
                if (!/\/\s*$/.test(match[3] ?? ''))
                    stripping += 1;
                continue;
            }
            if (stripping)
                continue;
            const tag = keptTag(opening);
            if (!tag)
                continue;
            const attrs = readAttributes(match[3] ?? '');
            if ((tag === 'p' || tag === 'li') && open[open.length - 1] === tag) {
                out.push(`</${open.pop()}>`);
            }
            const html = openTag(tag, attrs);
            if (!html)
                continue;
            out.push(html);
            if (!VOID_TAGS.has(tag))
                open.push(tag);
            continue;
        }
    }
    if (index < source.length && !stripping) {
        out.push(escapeText(decodeEntities(source.slice(index))));
    }
    while (open.length)
        out.push(`</${open.pop()}>`);
    return out.join('').replace(/<p>\s*<\/p>/g, '').trim();
}
function richTextToPlain(html) {
    return decodeEntities((html ?? '').replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}
//# sourceMappingURL=sanitize-html.js.map