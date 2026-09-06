# 셋업 가이드 (사용자가 직접 해야 하는 단계)

이 문서의 단계들은 계정 생성/결제/약관 동의가 필요해서 Claude가 대신 할 수 없는
부분입니다. 순서대로 진행하면 됩니다.

## 0. 지금까지 만들어진 것

- Astro 정적 사이트 (홈, 글 상세, About/Contact/Privacy/Affiliate Disclosure)
- 실제 아마존 상품 3개 토픽 분량의 콘텐츠 자동생성 파이프라인
- 예시 글 1편 (`src/content/posts/orthopedic-dog-beds-senior-guide.md`) — 실제
  아마존 상품 데이터로 작성, QA 게이트 통과 확인 완료, 지금 바로 배포 가능한 상태
- QA 게이트 + GitHub Actions 자동 발행 워크플로

## 1. `site.config.json` 채우기

`site.config.json` 파일을 열어서:

- `siteName`: 원하는 사이트 이름으로 변경 (지금은 "Senior Paws Guide" placeholder)
- `siteUrl`: 실제 도메인 구매 후 `https://내도메인.com` 으로 변경
- `amazonAssociateTag`: 아래 4번에서 발급받는 실제 어소시에이트 태그로 변경
- `contactEmail`: 실제로 받을 수 있는 이메일 주소로 변경

## 2. GitHub 저장소 만들기 (무료)

1. [github.com](https://github.com) 가입 (아직 없다면)
2. 새 저장소 생성 (public/private 상관없음)
3. 이 프로젝트 폴더에서:
   ```bash
   git remote add origin https://github.com/<본인아이디>/<저장소이름>.git
   git add -A
   git commit -m "Initial site scaffold"
   git push -u origin main
   ```

## 3. Anthropic API 키 발급 (콘텐츠 생성용, 유료·종량제)

1. [console.anthropic.com](https://console.anthropic.com) 가입
2. 결제수단 등록 (API 사용량만큼 과금 — Claude Code 구독과는 별개 요금)
3. API 키 발급
4. 로컬에서 테스트하려면 `.env.example`을 `.env`로 복사하고 키를 붙여넣기
   (`.env`는 `.gitignore`에 이미 등록되어 있어 실수로 커밋되지 않음)
5. GitHub 저장소 → Settings → Secrets and variables → Actions →
   `ANTHROPIC_API_KEY` 라는 이름으로 같은 키 등록 (자동화가 이걸 사용함)

## 4. 아마존 어소시에이트 가입

1. [affiliate-program.amazon.com](https://affiliate-program.amazon.com) 가입
2. 심사에는 보통 실제 운영중인 사이트(콘텐츠 몇 개 + 위 About/Contact/Privacy
   페이지)가 있어야 유리함 — 3번, 5번을 먼저 끝내고 사이트를 배포한 뒤 신청 추천
3. 승인되면 발급되는 태그(예: `yourtag-20`)를 `site.config.json`의
   `amazonAssociateTag`에 반영
4. **주의**: 승인 후 180일 안에 최소 3건의 판매가 없으면 계정이 닫힐 수 있음 —
   완전 방치하면 안 됨

## 5. Cloudflare Pages로 배포 (무료 호스팅)

1. [dash.cloudflare.com](https://dash.cloudflare.com) 가입
2. Workers & Pages → Create → Pages → GitHub 저장소 연결
3. 빌드 설정: Framework preset `Astro`, Build command `npm run build`,
   Build output directory `dist`
4. 배포 완료 후 임시 URL(`*.pages.dev`)로 먼저 확인

## 6. 도메인 구매 + 연결

1. Namecheap 등에서 도메인 구매 (연 $10~15)
2. Cloudflare Pages 프로젝트 → Custom domains → 구매한 도메인 추가
3. 도메인 등록업체에서 안내하는 대로 네임서버/DNS 레코드 설정
4. 연결 후 `site.config.json`의 `siteUrl`과 `public/robots.txt`의
   Sitemap 주소를 실제 도메인으로 업데이트

## 7. 구글 애드센스 신청

콘텐츠가 최소 15~20편 쌓인 뒤 진행 추천 (지난번 저품질 반려 이력이 있으니 서두르지
않는 게 유리함):

1. [google.com/adsense](https://www.google.com/adsense) 가입
2. 사이트 추가 후 발급되는 코드를 사이트에 삽입 (별도로 안내 요청하면 컴포넌트로
   추가해드릴 수 있음)
3. 심사 대기 (수일~수주)

## 8. Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console)
2. 도메인 소유권 인증 (Cloudflare DNS에 TXT 레코드 추가, 무료)
3. sitemap 제출: `https://내도메인.com/sitemap-index.xml`

## 진행하면서 궁금한 점

각 단계에서 화면이 이상하거나 에러가 나면 스크린샷/에러 메시지 붙여서 물어보면
바로 도와드릴 수 있어요.
