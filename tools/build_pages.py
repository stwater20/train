# -*- coding: utf-8 -*-
"""產生各語言的入口頁：/（中文）、/en/、/ja/，以及 sitemap.xml。

index.html 是唯一的原始檔；這支程式只改 <!--SEO-->、<!--ABOUT-->、<!--FORCE--> 標記之間的內容，
en/ 與 ja/ 底下的頁面會把 css/、js/ 路徑改成 ../。改完 index.html 之後執行：

    python3 tools/build_pages.py
"""
import io, json, os, re, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://train.sectools.tw'
PATHS = {'zh': '/', 'en': '/en/', 'ja': '/ja/'}
HTML_LANG = {'zh': 'zh-Hant', 'en': 'en', 'ja': 'ja'}
OG_LOCALE = {'zh': 'zh_TW', 'en': 'en_US', 'ja': 'ja_JP'}
OG_IMAGE = SITE + '/og.jpg'

TEXT = {
  'zh': {
    'title': '火車駕駛模擬｜花東線・阿里山小火車・江之電 3D 駕駛遊戲',
    'desc': '免安裝、瀏覽器直接玩的 3D 火車駕駛遊戲。開花東線區間車、阿里山小火車爬上祝山看日出，或開日本江之電沿著海岸到江之島。附新手教學，中英日三語。',
    'name': '火車駕駛模擬',
    'about': '''<section class="about">
    <h2>瀏覽器就能玩的火車駕駛模擬</h2>
    <p>從駕駛室的 3D 視角操作主控制器與煞車，把車頭停在月台的停車位置標上。免安裝，手機也能玩。</p>
    <ul>
      <li><b>台灣花東線</b>（花蓮 → 吉安 → 志學 → 平和 → 壽豐）：區間車穿過稻田，西邊就是中央山脈。附新手教學。</li>
      <li><b>阿里山林業鐵路祝山線</b>（阿里山 → 對高岳 → 祝山）：762 mm 窄軌登山鐵道，最陡 62‰，搭日出列車看雲海日出。</li>
      <li><b>日本江之電</b>（稻村崎 → 七里濱 → 鎌倉高校前 → 腰越 → 江之島）：相模灣、富士山、江之島、鎌倉高校前平交道，以及腰越到江之島的路面電車區間。</li>
    </ul>
    <p>可以選晴天、黃昏、夜間或雨天，有行車音效、車內廣播與成就徽章。</p>
  </section>''',
  },
  'en': {
    'title': 'Train Driving Simulator | Drive Taiwan’s Hualien Line, the Alishan Forest Railway and Japan’s Enoden',
    'desc': 'Free 3D cab-view train driving game in your browser. Drive a Hualien local train, climb to Zhushan on the Alishan Forest Railway at sunrise, or run the Enoden along the coast to Enoshima. Tutorial included.',
    'name': 'Train Driving Simulator',
    'about': '''<section class="about">
    <h2>A train driving simulator that runs in your browser</h2>
    <p>Drive from a 3D cab view: work the master controller and brake, and stop the front of the train right on the platform mark. No install needed, and it works on phones.</p>
    <ul>
      <li><b>Hualien Line, Taiwan</b> (Hualien → Ji’an → Zhixue → Pinghe → Shoufeng): a local EMU through rice paddies beside the Central Mountain Range. Includes a tutorial.</li>
      <li><b>Alishan Forest Railway, Zhushan Line</b> (Alishan → Duigaoyue → Zhushan): 762 mm narrow-gauge mountain railway, grades up to 62‰, and a sunrise train above a sea of clouds.</li>
      <li><b>Enoden, Japan</b> (Inamuragasaki → Shichirigahama → Kamakura-Kōkōmae → Koshigoe → Enoshima): Sagami Bay, Mt Fuji, Enoshima, the famous Kamakura-Kōkōmae crossing and street running into Enoshima.</li>
    </ul>
    <p>Choose sunny, dusk, night or rain, with train sounds, onboard announcements and achievement badges.</p>
  </section>''',
  },
  'ja': {
    'title': '電車運転シミュレーター｜江ノ電・阿里山森林鉄道・台湾の電車をブラウザで運転',
    'desc': 'インストール不要、ブラウザで遊べる無料の3D電車運転ゲーム。江ノ電で稲村ヶ崎から江ノ島へ、阿里山森林鉄道でご来光の祝山へ、台湾・花東線の区間車も。運転台視点で停止位置ピタ止めと定時運転を目指そう。',
    'name': '電車運転シミュレーター',
    'about': '''<section class="about">
    <h2>ブラウザで遊べる電車運転シミュレーター</h2>
    <p>運転台からの3D視点でマスコンとブレーキを操作し、ホームの停止位置目標に先頭を合わせて止めるゲームです。インストール不要、スマホでも遊べます。</p>
    <ul>
      <li><b>江ノ電</b>（稲村ヶ崎 → 七里ヶ浜 → 鎌倉高校前 → 腰越 → 江ノ島）：相模湾、富士山、江の島、鎌倉高校前の踏切、腰越〜江ノ島の併用軌道。</li>
      <li><b>阿里山森林鉄道 祝山線</b>（阿里山 → 対高岳 → 祝山）：軌間 762 mm の登山鉄道、最急 62‰。ご来光列車で雲海の日の出を。</li>
      <li><b>台湾 花東線</b>（花蓮 → 吉安 → 志学 → 平和 → 寿豊）：区間車で田園と中央山脈のあいだを走ります。チュートリアル付き。</li>
    </ul>
    <p>晴れ・夕暮れ・夜・雨を選べて、走行音や車内放送、実績バッジもあります。</p>
  </section>''',
  },
}

def seo_block(lang):
    t = TEXT[lang]
    url = SITE + PATHS[lang]
    alts = '\n'.join(f'<link rel="alternate" hreflang="{HTML_LANG[l]}" href="{SITE+PATHS[l]}">' for l in PATHS)
    ld = {
        '@context': 'https://schema.org', '@type': 'VideoGame', 'name': t['name'], 'url': url,
        'description': t['desc'], 'inLanguage': HTML_LANG[lang], 'image': OG_IMAGE,
        'genre': 'Simulation', 'gamePlatform': 'Web browser', 'applicationCategory': 'Game', 'operatingSystem': 'Any',
        'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'},
        'publisher': {'@type': 'Organization', 'name': 'SecTools.tw', 'url': 'https://sectools.tw/'},
    }
    return f'''<!--SEO-->
<title>{t['title']}</title>
<meta name="description" content="{t['desc']}">
<link rel="canonical" href="{url}">
{alts}
<link rel="alternate" hreflang="x-default" href="{SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SecTools.tw">
<meta property="og:title" content="{t['title']}">
<meta property="og:description" content="{t['desc']}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:locale" content="{OG_LOCALE[lang]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t['title']}">
<meta name="twitter:description" content="{t['desc']}">
<meta name="twitter:image" content="{OG_IMAGE}">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<!--/SEO-->'''

def between(s, tag, body):
    return re.sub(rf'<!--{tag}-->.*?<!--/{tag}-->', lambda m: body, s, flags=re.S)

def main():
    src = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    for lang in ('zh', 'en', 'ja'):
        s = src
        s = re.sub(r'<html lang="[^"]*">', f'<html lang="{HTML_LANG[lang]}">', s, count=1)
        s = between(s, 'SEO', seo_block(lang))
        s = between(s, 'ABOUT', '<!--ABOUT-->\n  ' + TEXT[lang]['about'] + '\n  <!--/ABOUT-->')
        force = '' if lang == 'zh' else f'<script>window.FORCE_LANG="{lang}";</script>\n'
        s = re.sub(r'<!--FORCE-->\n(?:<script>window\.FORCE_LANG=.*?</script>\n)?', '<!--FORCE-->\n' + force, s)
        if lang == 'zh':
            io.open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(s)
        else:
            s = re.sub(r'(href|src)="(css|js)/', r'\1="../\2/', s)
            os.makedirs(os.path.join(ROOT, lang), exist_ok=True)
            io.open(os.path.join(ROOT, lang, 'index.html'), 'w', encoding='utf-8').write(s)
    today = datetime.date.today().isoformat()
    links = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{HTML_LANG[l]}" href="{SITE+PATHS[l]}"/>' for l in PATHS)
    urls = ''.join(f'''
  <url>
    <loc>{SITE+PATHS[l]}</loc>
    <lastmod>{today}</lastmod>{links}
  </url>''' for l in PATHS)
    io.open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">{urls}\n</urlset>\n')
    io.open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
    print('built /, /en/, /ja/, sitemap.xml, robots.txt')

if __name__ == '__main__':
    main()
