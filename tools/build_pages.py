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
    'title': '火車駕駛模擬｜花東線・阿里山小火車・台北捷運・江之電・京急・京葉線 3D 駕駛遊戲',
    'desc': '免安裝、瀏覽器直接玩的 3D 火車駕駛遊戲。開花東線區間車、阿里山小火車爬上祝山看日出，或開日本江之電沿著海岸到江之島。附新手教學，中英日三語。',
    'name': '火車駕駛模擬',
    'about': '''<section class="about">
    <h2>瀏覽器就能玩的火車駕駛模擬</h2>
    <p>從駕駛室的 3D 視角操作主控制器與煞車，把車頭停在月台的停車位置標上。免安裝，手機也能玩。</p>
    <ul>
      <li><b>台灣花東線</b>（花蓮 → 吉安 → 志學 → 平和 → 壽豐）：區間車穿過稻田，西邊就是中央山脈。附新手教學。</li>
      <li><b>阿里山林業鐵路祝山線</b>（阿里山 → 對高岳 → 祝山）：762 mm 窄軌登山鐵道，最陡 62‰，搭日出列車看雲海日出。</li>
      <li><b>台北捷運淡水信義線</b>（北投 → 關渡 → 紅樹林 → 淡水）：雙線區間，看關渡大橋、淡水河紅樹林與觀音山。</li>
      <li><b>京急本線</b>（品川 → 北品川 → 新馬場 → 青物橫丁 → 鮫洲 → 立會川）：紅色電車、八ツ山橋、北品川的平交道，在鮫洲等快特超車。</li>
      <li><b>JR 京葉線</b>（新木場 → 葛西臨海公園 → 舞濱 → 新浦安 → 市川鹽濱）：東京灣邊的高架雙線，看得到摩天輪和海。</li>
      <li><b>日本江之電</b>（稻村崎 → 七里濱 → 鎌倉高校前 → 腰越 → 江之島）：相模灣、富士山、江之島、鎌倉高校前平交道，以及腰越到江之島的路面電車區間。</li>
    </ul>
    <p>可以選晴天、黃昏、夜間或雨天，有行車音效、車內廣播與成就徽章。</p>
  </section>''',
  },
  'en': {
    'title': 'Train Driving Simulator | Drive Taiwan’s Hualien Line, Alishan Forest Railway, Taipei Metro and Japan’s Enoden',
    'desc': 'Free 3D cab-view train driving game in your browser. Drive a Hualien local train, climb to Zhushan on the Alishan Forest Railway at sunrise, or run the Enoden along the coast to Enoshima. Tutorial included.',
    'name': 'Train Driving Simulator',
    'about': '''<section class="about">
    <h2>A train driving simulator that runs in your browser</h2>
    <p>Drive from a 3D cab view: work the master controller and brake, and stop the front of the train right on the platform mark. No install needed, and it works on phones.</p>
    <ul>
      <li><b>Hualien Line, Taiwan</b> (Hualien → Ji’an → Zhixue → Pinghe → Shoufeng): a local EMU through rice paddies beside the Central Mountain Range. Includes a tutorial.</li>
      <li><b>Alishan Forest Railway, Zhushan Line</b> (Alishan → Duigaoyue → Zhushan): 762 mm narrow-gauge mountain railway, grades up to 62‰, and a sunrise train above a sea of clouds.</li>
      <li><b>Taipei Metro Tamsui Line</b> (Beitou → Guandu → Hongshulin → Tamsui): double track past the Guandu Bridge, the Tamsui River mangroves and Guanyin Mountain.</li>
      <li><b>Keikyū Main Line</b> (Shinagawa → Kita-shinagawa → Shimbamba → Aomono-yokochō → Samezu → Tachiaigawa): the red trains, the Yatsuyama bridge, the Kita-shinagawa crossings, and an express overtaking you at Samezu.</li>
      <li><b>JR Keiyō Line</b> (Shin-Kiba → Kasai-Rinkai-Kōen → Maihama → Shin-Urayasu → Ichikawashiohama): elevated double track along Tokyo Bay with the Ferris wheel and the sea.</li>
      <li><b>Enoden, Japan</b> (Inamuragasaki → Shichirigahama → Kamakura-Kōkōmae → Koshigoe → Enoshima): Sagami Bay, Mt Fuji, Enoshima, the famous Kamakura-Kōkōmae crossing and street running into Enoshima.</li>
    </ul>
    <p>Choose sunny, dusk, night or rain, with train sounds, onboard announcements and achievement badges.</p>
  </section>''',
  },
  'ja': {
    'title': '電車運転シミュレーター｜江ノ電・京急・京葉線・阿里山森林鉄道・台湾の電車をブラウザで運転',
    'desc': 'インストール不要、ブラウザで遊べる無料の3D電車運転ゲーム。江ノ電で稲村ヶ崎から江ノ島へ、阿里山森林鉄道でご来光の祝山へ、台湾・花東線の区間車も。運転台視点で停止位置ピタ止めと定時運転を目指そう。',
    'name': '電車運転シミュレーター',
    'about': '''<section class="about">
    <h2>ブラウザで遊べる電車運転シミュレーター</h2>
    <p>運転台からの3D視点でマスコンとブレーキを操作し、ホームの停止位置目標に先頭を合わせて止めるゲームです。インストール不要、スマホでも遊べます。</p>
    <ul>
      <li><b>京急本線</b>（品川 → 北品川 → 新馬場 → 青物横丁 → 鮫洲 → 立会川）：赤い電車、八ツ山橋、北品川の踏切、鮫洲での快特待避。</li>
      <li><b>JR京葉線</b>（新木場 → 葛西臨海公園 → 舞浜 → 新浦安 → 市川塩浜）：東京湾沿いの高架複線、観覧車と海の眺め。</li>
      <li><b>江ノ電</b>（稲村ヶ崎 → 七里ヶ浜 → 鎌倉高校前 → 腰越 → 江ノ島）：相模湾、富士山、江の島、鎌倉高校前の踏切、腰越〜江ノ島の併用軌道。</li>
      <li><b>阿里山森林鉄道 祝山線</b>（阿里山 → 対高岳 → 祝山）：軌間 762 mm の登山鉄道、最急 62‰。ご来光列車で雲海の日の出を。</li>
      <li><b>台北MRT 淡水信義線</b>（北投 → 関渡 → 紅樹林 → 淡水）：複線区間、関渡大橋や淡水河のマングローブ、観音山の眺め。</li>
      <li><b>台湾 花東線</b>（花蓮 → 吉安 → 志学 → 平和 → 寿豊）：区間車で田園と中央山脈のあいだを走ります。チュートリアル付き。</li>
    </ul>
    <p>晴れ・夕暮れ・夜・雨を選べて、走行音や車内放送、実績バッジもあります。</p>
  </section>''',
  },
}

ROUTE_KEYS = ['hualien', 'alishan', 'enoden', 'tamsui', 'keiyo', 'keikyu']
ROUTE_TEXT = {
  'zh': {
    'hualien': ('花東線區間車駕駛模擬｜花蓮到壽豐 3D 火車駕駛遊戲', '開臺鐵區間車從花蓮到壽豐，停吉安、志學、平和，學會看限速、號誌與進站停車。附新手教學，免安裝、瀏覽器直接玩。', '花東線'),
    'alishan': ('阿里山小火車駕駛模擬｜祝山線日出列車 3D 遊戲', '駕駛阿里山林業鐵路祝山線，從阿里山爬到海拔 2,451 公尺的祝山，搭日出列車看雲海與玉山日出，還能解鎖蒸汽機車 SL-31。', '阿里山小火車'),
    'tamsui':  ('台北捷運淡水信義線駕駛模擬｜北投到淡水 3D 捷運遊戲', '用手動駕駛模式開台北捷運，從北投到淡水，沿途看關渡平原、紅色的關渡大橋、淡水河紅樹林與觀音山，雙線區間對向列車呼嘯而過。', '捷運淡水線'),
    'keikyu':  ('京急線駕駛模擬｜品川到立會川・紅色電車 3D 遊戲', '開京急本線的紅色電車從品川出發，經過八ツ山橋、北品川的平交道與品川宿，在鮫洲等快特超車，到立會川換手。還能解鎖會唱歌的 2100 形。', '京急線'),
    'keiyo':   ('JR 京葉線駕駛模擬｜新木場到舞濱・東京灣高架 3D 電車遊戲', '開 JR 京葉線 E233 系從新木場出發，沿著東京灣的高架雙線，經過葛西臨海公園的摩天輪、舞濱與新浦安，到市川鹽濱換手。', 'JR 京葉線'),
    'enoden':  ('江之電駕駛模擬｜鎌倉高校前・江之島 3D 電車遊戲', '開日本江之電從稻村崎到江之島，沿著相模灣海岸，經過《灌籃高手》的鎌倉高校前平交道與路面電車區間，遠方就是富士山。', '江之電'),
  },
  'en': {
    'hualien': ('Hualien Line Train Simulator | Drive a Taiwan Railway local train', 'Drive a Taiwan Railway local train from Hualien to Shoufeng, calling at Ji’an, Zhixue and Pinghe. Learn speed limits, signals and precise station stops. Free in your browser, tutorial included.', 'Hualien Line'),
    'alishan': ('Alishan Forest Railway Simulator | Sunrise train to Zhushan', 'Drive the Alishan Forest Railway Zhushan Line up to Zhushan at 2,451 m, the highest station in Taiwan, and watch the sunrise over a sea of clouds. Unlock the SL-31 steam locomotive.', 'Alishan Forest Railway'),
    'tamsui':  ('Taipei Metro Simulator | Drive the Tamsui Line from Beitou to Tamsui', 'Drive a Taipei Metro train in manual mode from Beitou to Tamsui, past the Guandu plain, the red Guandu Bridge, the mangroves of the Tamsui River and Guanyin Mountain.', 'Taipei Metro Tamsui Line'),
    'keikyu':  ('Keikyū Line Simulator | Drive the red train from Shinagawa', 'Drive a red Keikyū train from Shinagawa over the Yatsuyama bridge, through the Kita-shinagawa crossings and old Shinagawa-juku, wait at Samezu for an express to overtake, and hand over at Tachiaigawa. Unlock the singing 2100 series.', 'Keikyū Line'),
    'keiyo':   ('JR Keiyō Line Simulator | Drive along Tokyo Bay from Shin-Kiba to Maihama', 'Drive a JR Keiyō Line E233 on elevated double track along Tokyo Bay, past the Kasai Rinkai Park Ferris wheel, Maihama and Shin-Urayasu to Ichikawashiohama.', 'JR Keiyō Line'),
    'enoden':  ('Enoden Train Simulator | Drive along the Kamakura coast to Enoshima', 'Drive Japan’s Enoden from Inamuragasaki to Enoshima along Sagami Bay, past the famous Kamakura-Kōkōmae crossing and through the street-running section, with Mt Fuji ahead.', 'Enoden'),
  },
  'ja': {
    'hualien': ('台湾・花東線 運転シミュレーター｜台湾鉄道の区間車を運転', '台湾鉄道の区間車で花蓮から寿豊まで。吉安・志学・平和に停車しながら、速度制限・信号・停止位置ピタ止めを学べます。インストール不要の無料ブラウザゲーム。', '台湾・花東線'),
    'alishan': ('阿里山森林鉄道 運転シミュレーター｜祝山線ご来光列車', '阿里山森林鉄道 祝山線を運転して、台湾最高所の祝山駅（標高 2,451 m）へ。ご来光列車で雲海と玉山の日の出を。蒸気機関車 SL-31 も解除できます。', '阿里山森林鉄道'),
    'tamsui':  ('台北MRT 淡水線 運転シミュレーター｜北投から淡水へ', '台北MRT淡水信義線を手動運転で北投から淡水へ。関渡平原、赤い関渡大橋、淡水河のマングローブ、観音山の眺め。インストール不要の無料ブラウザゲーム。', '台北MRT淡水線'),
    'keikyu':  ('京急線 運転シミュレーター｜品川から赤い電車をブラウザで運転', '京急本線の赤い電車で品川を出発し、八ツ山橋、北品川の踏切と品川宿を抜け、鮫洲で快特の通過待ち、立会川で乗務員交代。歌う電車2100形も解除できます。無料ブラウザゲーム。', '京急線'),
    'keiyo':   ('京葉線 運転シミュレーター｜新木場から舞浜・東京湾沿いの高架をブラウザで運転', 'JR京葉線のE233系で新木場から東京湾沿いの高架複線を走り、葛西臨海公園の観覧車、舞浜、新浦安を経て市川塩浜まで。インストール不要の無料ブラウザゲーム。', 'JR京葉線'),
    'enoden':  ('江ノ電 運転シミュレーター｜鎌倉高校前・江ノ島までブラウザで運転', '江ノ電を稲村ヶ崎から江ノ島まで運転。相模湾の海沿い、鎌倉高校前の踏切、腰越〜江ノ島の併用軌道、富士山と江の島の眺め。インストール不要の無料ブラウザゲーム。', '江ノ電'),
  },
}
NAV_LABEL = {'zh': '所有路線', 'en': 'All routes', 'ja': 'すべての路線'}

def page_path(lang, route=None):
    return ('/' if lang == 'zh' else f'/{lang}/') + (f'{route}/' if route else '')

def nav_html(lang):
    items = ''.join(f'<li><a href="{page_path(lang, r)}">{ROUTE_TEXT[lang][r][2]}</a></li>' for r in ROUTE_KEYS)
    langs = ''.join(f'<li><a href="{page_path(l)}" hreflang="{HTML_LANG[l]}">{n}</a></li>' for l, n in (('zh','中文'),('en','English'),('ja','日本語')))
    return f'<nav class="seolinks" aria-label="{NAV_LABEL[lang]}"><ul>{items}</ul><ul>{langs}</ul></nav>'

def seo_block(lang, route=None):
    t = dict(TEXT[lang])
    if route: t['title'], t['desc'], t['name'] = ROUTE_TEXT[lang][route][0], ROUTE_TEXT[lang][route][1], ROUTE_TEXT[lang][route][0].split('｜')[0].split(' | ')[0]
    url = SITE + page_path(lang, route)
    alts = '\n'.join(f'<link rel="alternate" hreflang="{HTML_LANG[l]}" href="{SITE+page_path(l, route)}">' for l in PATHS)
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
<link rel="alternate" hreflang="x-default" href="{SITE+page_path('zh', route)}">
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
    pages = []
    for lang in ('zh', 'en', 'ja'):
        for route in [None] + ROUTE_KEYS:
            s = src
            s = re.sub(r'<html lang="[^"]*">', f'<html lang="{HTML_LANG[lang]}">', s, count=1)
            s = between(s, 'SEO', seo_block(lang, route))
            s = between(s, 'ABOUT', '<!--ABOUT-->\n  ' + TEXT[lang]['about'] + '\n  ' + nav_html(lang) + '\n  <!--/ABOUT-->')
            force = ''
            if lang != 'zh': force += f'<script>window.FORCE_LANG="{lang}";</script>\n'
            if route: force += f'<script>window.FORCE_ROUTE="{route}";</script>\n'
            s = re.sub(r'<!--FORCE-->\n(?:<script>window\.FORCE_[A-Z]+=.*?</script>\n)*', lambda m: '<!--FORCE-->\n' + force, s)
            path = page_path(lang, route)
            depth = path.strip('/').count('/') + 1 if path != '/' else 0
            if depth:
                s = re.sub(r'(href|src)="(css|js)/', lambda m: f'{m.group(1)}="' + '../' * depth + m.group(2) + '/', s)
            out = os.path.join(ROOT, path.strip('/'), 'index.html') if depth else os.path.join(ROOT, 'index.html')
            os.makedirs(os.path.dirname(out), exist_ok=True)
            if not depth: src_out = s
            io.open(out, 'w', encoding='utf-8').write(s)
            pages.append(route)
    today = datetime.date.today().isoformat()
    urls = ''
    for route in [None] + ROUTE_KEYS:
        links = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{HTML_LANG[l]}" href="{SITE+page_path(l, route)}"/>' for l in PATHS)
        for l in PATHS:
            urls += f'\n  <url>\n    <loc>{SITE+page_path(l, route)}</loc>\n    <lastmod>{today}</lastmod>{links}\n  </url>'
    io.open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">{urls}\n</urlset>\n')
    io.open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
    print(f'built {len(pages)} pages, sitemap.xml, robots.txt')

if __name__ == '__main__':
    main()
