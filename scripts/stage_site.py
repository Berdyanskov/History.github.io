"""Stage deployment with content-addressed JS/CSS to prevent mixed cached releases."""
from pathlib import Path
import hashlib
import re
import shutil
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '_site'
OUT.mkdir(exist_ok=True)
html = (ROOT / 'index.html').read_text()
def fingerprint(match):
    filename = match.group(2)
    path = ROOT / filename
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    target = Path(filename).with_name(f'{path.stem}.{digest}{path.suffix}')
    dest = OUT / target
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path, dest)
    return f'{match.group(1)}="{target.as_posix()}"'
html = re.sub(r'(src|href)="([^"?]+\.(?:js|css))"', fingerprint, html)
(OUT / 'index.html').write_text(html)
for filename in ['favicon.svg', '.nojekyll']:
    shutil.copyfile(ROOT / filename, OUT / filename)
for dirname in ['assets', 'downloads']:
    shutil.copytree(ROOT / dirname, OUT / dirname, dirs_exist_ok=True)
print('Staged site with content-hashed script and style filenames.')
