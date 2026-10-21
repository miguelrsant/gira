# junta head.html + js/*.js (em ordem) num único ../index.html
import os, glob
here = os.path.dirname(os.path.abspath(__file__))
head = open(os.path.join(here, 'head.html'), encoding='utf-8').read()
parts = []
for f in sorted(glob.glob(os.path.join(here, 'js', '*.js'))):
    parts.append('// ---- ' + os.path.basename(f) + ' ----\n' + open(f, encoding='utf-8').read())
html = head + '\n<script type="module">\n' + '\n'.join(parts) + '\n</script>\n'
open(os.path.join(here, '..', 'index.html'), 'w', encoding='utf-8').write(html)
print('built', len(html), 'bytes')
