import { richTextToPlain, sanitizeRichText } from './sanitize-html';

describe('sanitizeRichText', () => {
  it('garde la mise en forme prévue', () => {
    expect(sanitizeRichText('<h2>Titre</h2><p>Un <strong>mot</strong> et <em>un autre</em>.</p>'))
      .toBe('<h2>Titre</h2><p>Un <strong>mot</strong> et <em>un autre</em>.</p>');
    expect(sanitizeRichText('<ul><li>un</li><li>deux</li></ul>')).toBe('<ul><li>un</li><li>deux</li></ul>');
    expect(sanitizeRichText('<blockquote><p>Cité</p></blockquote>')).toBe('<blockquote><p>Cité</p></blockquote>');
  });

  it('ramène les balises de l’éditeur sur celles qui sont gardées', () => {
    expect(sanitizeRichText('<div>Texte</div>')).toBe('<p>Texte</p>');
    expect(sanitizeRichText('<b>gras</b> <i>italique</i>')).toBe('<strong>gras</strong> <em>italique</em>');
    expect(sanitizeRichText('<h1>Un seul h1 par page</h1>')).toBe('<h2>Un seul h1 par page</h2>');
  });

  it('retire les scripts avec leur contenu', () => {
    expect(sanitizeRichText('<p>avant</p><script>alert(1)</script><p>après</p>'))
      .toBe('<p>avant</p><p>après</p>');
    expect(sanitizeRichText('<style>body{display:none}</style>texte')).toBe('texte');
    expect(sanitizeRichText('<iframe src="https://ailleurs"><p>caché</p></iframe>')).toBe('');
    expect(sanitizeRichText('<script>var a = "</p>";</script>ok')).toBe('ok');
  });

  it('ne laisse passer aucun attribut non prévu', () => {
    expect(sanitizeRichText('<p onclick="alert(1)">texte</p>')).toBe('<p>texte</p>');
    expect(sanitizeRichText('<p style="position:fixed">texte</p>')).toBe('<p>texte</p>');
    expect(sanitizeRichText('<img src="/a.jpg" onerror="alert(1)">'))
      .toBe('<img src="/a.jpg" alt="" loading="lazy">');
  });

  it('refuse les adresses qui ne sont pas des liens', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">clic</a>')).toBe('<a>clic</a>');
    expect(sanitizeRichText('<a href="java&#115;cript:alert(1)">clic</a>')).toBe('<a>clic</a>');
    expect(sanitizeRichText('<a href="data:text/html,<script>">clic</a>')).toBe('<a>clic</a>');
    expect(sanitizeRichText('<img src="javascript:alert(1)">')).toBe('');
  });

  it('garde les liens légitimes et marque les liens sortants', () => {
    expect(sanitizeRichText('<a href="https://exemple.ci">dehors</a>'))
      .toBe('<a href="https://exemple.ci" target="_blank" rel="noopener">dehors</a>');
    expect(sanitizeRichText('<a href="/documents/">dedans</a>')).toBe('<a href="/documents/">dedans</a>');
    expect(sanitizeRichText('<a href="mailto:bureau@exemple.ci">écrire</a>'))
      .toBe('<a href="mailto:bureau@exemple.ci">écrire</a>');
  });

  it('échappe le texte, y compris déguisé en balise', () => {
    expect(sanitizeRichText('<p>5 < 7 & 8 > 6</p>')).toBe('<p>5 &lt; 7 &amp; 8 &gt; 6</p>');
    expect(sanitizeRichText('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'))
      .toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('conserve les caractères accentués venus des entités', () => {
    expect(sanitizeRichText('<p>caf&eacute; &agrave; 10&nbsp;h &hellip;</p>'))
      .toBe('<p>café à 10 h …</p>');
  });

  it('referme ce qui est resté ouvert et ignore les fermetures en trop', () => {
    expect(sanitizeRichText('<p>sans fin')).toBe('<p>sans fin</p>');
    expect(sanitizeRichText('texte</p></div>')).toBe('texte');
    expect(sanitizeRichText('<ul><li>un<li>deux</ul>')).toBe('<ul><li>un</li><li>deux</li></ul>');
  });

  it('retire les commentaires et les restes de traitement de texte', () => {
    expect(sanitizeRichText('<!-- caché --><p>visible</p>')).toBe('<p>visible</p>');
    expect(sanitizeRichText('<!DOCTYPE html><p>visible</p>')).toBe('<p>visible</p>');
    expect(sanitizeRichText('<p></p><p>  </p><p>vrai</p>')).toBe('<p>vrai</p>');
  });

  it('accepte le vide', () => {
    expect(sanitizeRichText('')).toBe('');
    expect(sanitizeRichText(null)).toBe('');
    expect(sanitizeRichText(undefined)).toBe('');
  });
});

describe('richTextToPlain', () => {
  it('rend le texte seul', () => {
    expect(richTextToPlain('<h2>Titre</h2><p>Un <strong>mot</strong>.</p>')).toBe('Titre Un mot .');
    expect(richTextToPlain('<p>caf&eacute;</p>')).toBe('café');
    expect(richTextToPlain(null)).toBe('');
  });
});
