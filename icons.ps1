# 아이콘 모음을 다시 만든다.
#
#   PS> .\icons.ps1
#
# 언제 실행하나
#   · 새 아이콘을 쓰기 시작했을 때 — 먼저 원하는 자리에 그냥 이렇게 써 두고 실행하면 된다.
#       <svg class="icon" aria-hidden="true"><use href="#i-search"/></svg>
#     스크립트가 페이지를 훑어 "#i-이름" 을 모두 찾아, 없는 것은 내려받아 모음에 넣는다.
#   · 굵기를 바꾸고 싶을 때 — 아래 $Weight 만 고치고 실행한다.
#
# 아이콘 이름은 Material Symbols 의 이름 그대로다. 어떤 이름이 있는지는
# https://fonts.google.com/icons 에서 찾는다(Style 을 Material Icons + Rounded 로 두고 볼 것).

# 어떤 그림체를 쓸지 고른다.
#   symbols — Material Symbols Rounded. 굵기($Weight)를 고를 수 있는 새 세대다.
#   icons   — Material Icons Round. 구글이 오래 쓰던 둥근 그림체로, 획이 굵고 꽉 차 있다.
#             굵기 선택이 없으므로 $Weight 는 무시된다.
$Style  = 'icons'                   # symbols 또는 icons
$Weight = 300                      # 100 200 300 400 500 600 700 중 하나(symbols 일 때만)
$Pages  = 'index.html', 'sian.html'
$Scan   = 'index.html', 'sian.html', 'layout.js'

# 이름을 변수로 넘겨 쓰는 자리가 있어서, 훑기만 해서는 안 걸리는 아이콘들이다.
# layout.js 의 사이드바 메뉴(NAV)와 확인 모달(CONFIRM_ICONS), 그리고 index.html 의
# 보기 전환 버튼(setAttribute 로 href 를 갈아 끼우는 grid_view)이 여기에 해당한다.
$Extra = 'dashboard', 'badge', 'help', 'delete', 'priority_high', 'check', 'grid_view'

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# ── 1. 필요한 아이콘 이름 모으기 ──────────────────────────────
$names = [System.Collections.Generic.HashSet[string]]::new()
foreach ($n in $Extra) { [void]$names.Add($n) }
foreach ($file in $Scan) {
  $text = Get-Content $file -Raw
  foreach ($m in [regex]::Matches($text, 'href="#i-([a-z0-9_]+)"')) {
    [void]$names.Add($m.Groups[1].Value)
  }
}
$names = $names | Sort-Object
Write-Host "아이콘 $($names.Count) 개 · 그림체 $Style$(if ($Style -eq 'symbols') { " · 굵기 $Weight" })"

# ── 2. 원본 내려받아 path 만 뽑기 ─────────────────────────────
# Symbols 는 구글 저장소에서, Icons(구형 Round)는 이름만으로 바로 찾을 수 있는
# @material-icons/svg 패키지에서 가져온다(구글 저장소의 구형 아이콘은 경로에 분류명이 끼어 있다).
$symbolsBase = 'https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web'
$iconsBase   = 'https://cdn.jsdelivr.net/npm/@material-icons/svg/svg'
# 두 그림체는 좌표계가 다르다 — 이 값이 symbol 의 viewBox 가 된다.
$viewBox = if ($Style -eq 'icons') { '0 0 24 24' } else { '0 -960 960 960' }
$paths = [ordered]@{}
foreach ($name in $names) {
  if ($Style -eq 'icons') {
    $url = "$iconsBase/$name/round.svg"
  } else {
    # 굵기 400 은 파일 이름에 굵기가 안 붙는다(구글 저장소가 그렇게 둔다).
    $suffix = if ($Weight -eq 400) { '24px' } else { "wght${Weight}_24px" }
    $url = "$symbolsBase/$name/materialsymbolsrounded/${name}_${suffix}.svg"
  }
  try {
    $svg = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
  } catch {
    Write-Host "  건너뜀 $name — 그런 이름이나 굵기가 없다 ($url)" -ForegroundColor Yellow
    continue
  }
  $d = [regex]::Match($svg, '<path d="([^"]*)"').Groups[1].Value
  if (-not $d) { Write-Host "  건너뜀 $name — path 를 못 찾았다" -ForegroundColor Yellow; continue }
  $paths[$name] = $d
}

# ── 3. 모음 만들어 각 페이지의 표시 사이에 끼우기 ─────────────
$lines = @(
  '<!-- 아이콘 모음. 화면에는 안 보이고, 아래 <use href="#i-이름"> 이 여기서 모양을 가져다 쓴다.'
  $(if ($Style -eq 'icons') { "     Material Icons Round · 24px 원본을 그대로 뽑아 왔다. 왜 폰트가 아니라" } else { "     Material Symbols Rounded · 굵기 $Weight · 24px 원본을 그대로 뽑아 왔다. 왜 폰트가 아니라" })
  '     그림인지는 style2.css 의 .icon 설명을 볼 것. 이 블록은 icons.ps1 이 만든다. -->'
  '<svg class="icon-sprite" aria-hidden="true"><defs>'
)
foreach ($name in $paths.Keys) {
  $lines += "<symbol id=`"i-$name`" viewBox=`"$viewBox`"><path d=`"$($paths[$name])`"/></symbol>"
}
$lines += '</defs></svg>'
$sprite = $lines -join "`n"

$utf8 = [System.Text.UTF8Encoding]::new($false)   # BOM 없이 쓴다
foreach ($file in $Pages) {
  $text = [System.IO.File]::ReadAllText((Resolve-Path $file).Path, $utf8)
  $pattern = '(?s)(<!-- icons:start[^>]*-->\r?\n).*?(<!-- icons:end -->)'
  if ($text -notmatch $pattern) { Write-Host "  표시를 못 찾음: $file" -ForegroundColor Red; continue }
  $text = [regex]::Replace($text, $pattern, { param($m) $m.Groups[1].Value + $sprite + "`n" + $m.Groups[2].Value })
  [System.IO.File]::WriteAllText((Resolve-Path $file).Path, $text, $utf8)
  Write-Host "  넣음 $file"
}
Write-Host '끝. 브라우저에서 확인하세요.'
