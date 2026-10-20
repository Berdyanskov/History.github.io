"""Build a fully self-contained classroom edition without network dependencies."""
from pathlib import Path
import base64, json, re, zipfile
ROOT = Path(__file__).resolve().parents[1]
def uri(path, mime):
    return 'data:' + mime + ';base64,' + base64.b64encode((ROOT / path).read_bytes()).decode('ascii')
data = json.loads((ROOT / 'exhibits.js').read_text().removeprefix('window.EXHIBITS = ').rstrip(';\n'))
for e in data:
    e['image'] = uri(e['image'], 'image/jpeg' if e['image'].endswith('.jpg') else 'image/png')
    e['source'] = uri(e['source'], 'text/plain;charset=utf-8')
html = (ROOT / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + (ROOT / 'styles.css').read_text() + '</style>')
html = html.replace('href="favicon.svg"', 'href="' + uri('favicon.svg', 'image/svg+xml') + '"')
# The inline scripts are appended at the end so the DOM is ready, just like defer.
scripts = re.findall(r'<script defer src="([^"]+)"></script>', html)
html = re.sub(r'<script defer src="[^"]+"></script>', '', html)
inline = ['<script>window.MUSEUM_OFFLINE=true;</script>']
for filename in scripts:
    code = 'window.EXHIBITS = ' + json.dumps(data, ensure_ascii=False) + ';' if filename == 'exhibits.js' else (ROOT / filename).read_text()
    inline.append('<script>' + code.replace('</script', '<\\/script') + '</script>')
html = html.replace('</body>', '\n'.join(inline) + '</body>')
output = ROOT / 'downloads'
output.mkdir(exist_ok=True)
help_text = '''家乡的物件 · 近现代史记忆博物馆

1. 解压整个压缩包，使用 Chrome / Edge / Firefox / Safari 打开 index.html。
2. 不需要安装软件、启动服务器或连接网络。图片、程序与文物介绍全部内嵌。
3. 点击“走近家乡的近现代史记忆”开始参观。左右方向键翻篇，F 键全屏，M 键目录。
4. 点击文物图片查看介绍；滚轮、双指、加减按钮缩放；拖动平移；Esc 返回。
5. 若设备不支持 WebGL 2，将自动进入图文模式。右上角帮助可切换流畅模式或减少动画。
6. 分享二维码指向在线版，需要网络访问。

在线展厅：https://berdyanskov.github.io/History.github.io/
文物照片和中文说明来自课程提供的 assets 素材，原图未修改。三维馆舍为虚拟策展空间。
第三方库许可证见 LICENSES 目录。
'''
with zipfile.ZipFile(output / 'hometown-museum.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('index.html', html)
    z.writestr('课堂使用说明.txt', help_text)
    for filename in ['vendor/three.LICENSE', 'vendor/qrcode.LICENSE']:
        z.write(ROOT / filename, 'LICENSES/' + Path(filename).name)
print(f'Built {output / "hometown-museum.zip"} ({(output / "hometown-museum.zip").stat().st_size / 1024 / 1024:.2f} MiB)')
