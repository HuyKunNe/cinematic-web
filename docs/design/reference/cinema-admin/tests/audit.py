"""Static HTML/CSS/assets audit. Run after node tests/verify.cjs."""
from pathlib import Path
from lxml import html, etree
import re, json, importlib.util
root=Path(__file__).resolve().parent.parent
checks=0
for p in (root/'tests/rendered').glob('*.html'):
    parser=html.HTMLParser()
    dom=html.fromstring(p.read_text(),parser=parser)
    ids=dom.xpath('//@id')
    assert len(ids)==len(set(ids)), f'Duplicate DOM IDs in {p.name}'
    for el in dom.xpath('//button'):
        assert el.text_content().strip() or el.get('aria-label'), f'Unnamed button {p.name}: {html.tostring(el)}'
        checks+=1
    for el in dom.xpath('//img'):
        assert 'alt' in el.attrib, f'Missing alt: {p.name}'
        if el.get('src','').startswith('assets/'):
            assert (root/el.get('src')).is_file(), f'Missing image {el.get("src")}'
        checks+=1
    for el in dom.xpath('//input|//select|//textarea'):
        label=el.get('aria-label') or el.xpath('ancestor::label') or el.get('type') in ('hidden','submit')
        assert label, f'Unlabeled field {p.name}: {html.tostring(el)}'
        checks+=1
    assert not dom.xpath('//form//form'), f'Nested forms in {p.name}'
    checks+=2
main=html.fromstring((root/'index.html').read_text())
for href in main.xpath('//script/@src|//link/@href'):
    assert (root/href).is_file(),f'Missing dependency: {href}'
    checks+=1
source=(root/'assets/js/app.js').read_text()
for page in ['dashboard','movies','cinemas','rooms','shows','pricing','orders','payments','checkin','products','promotions','customers','staff','reports','settings','logs']:
    assert f'function {page}(' in source, f'Missing implementation {page}'
    checks+=1
for p in (root/'assets/images').glob('*.svg'):
    etree.fromstring(p.read_bytes());checks+=1
css=(root/'assets/css/styles.css').read_text()
assert '@import' not in css and 'https://' not in css, 'External stylesheet dependency'
assert 'fetch(' not in source and 'type="module"' not in (root/'index.html').read_text(), 'Direct-file launch should not require fetch/module loading'
if importlib.util.find_spec('tinycss2'):
    import tinycss2
    errors=[r for r in tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True) if r.type=='error']
    assert not errors, errors
    checks+=1
print(json.dumps({'status':'PASS','static_checks':checks,'offline_assets':len(list((root/'assets/images').glob('*.svg')))},indent=2))
