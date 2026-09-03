# -*- coding: utf-8 -*-
import re,html,sys,os
SP=os.path.join(os.path.dirname(os.path.abspath(__file__)),'atcache')
def text(pg):
    s=open(os.path.join(SP,'at%s.html'%pg),encoding='utf-8',errors='replace').read()
    i=s.find('wikibody'); j=s.find('id="tag',i)
    b=s[i:j if j>i else i+80000]
    b=re.sub(r'(?s)<(script|style).*?</\1>',' ',b)
    b=re.sub(r'<br[^>]*>','\n',b)
    b=re.sub(r'</t[dh]>','\n',b); b=re.sub(r'</tr>','\n',b)
    b=re.sub(r'(?s)<[^>]+>','\n',b); b=html.unescape(b)
    b=re.sub(r'[ ]+',' ',b)
    L=[l.strip() for l in b.split('\n')]
    return [l for l in L if l and 'ref error' not in l and 'wikibody' not in l]
if __name__=='__main__':
    for pg in sys.argv[1:]:
        print('===== page',pg,'=====')
        print('\n'.join(text(pg)[:50]))
