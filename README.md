# 남양주 스마트주정차

> 남양주시 스마트주정차 단속 관리 데스크톱 애플리케이션

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/dpsdkfwl11/namyangju-smart-parking/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey.svg)]()
[![Electron](https://img.shields.io/badge/Electron-30.0.0-47848F.svg)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)]()

---

## 프로젝트 소개

**남양주 스마트주정차**는 남양주시의 스마트주정차 단속 데이터를 관리·조회·통계분석하기 위한 Windows 전용 데스크톱 애플리케이션입니다.

- Electron 기반 — 별도의 서버·인터넷 연결 없이 로컬에서 완전히 동작
- SQLite 내장 데이터베이스로 단속 기록 및 CCTV 정보를 안전하게 저장
- 설치 시 관리자 권한 불필요 (사용자 AppData에 설치)
- 자동 업데이트 — 앱 실행 시 GitHub Releases에서 최신 버전 자동 감지 및 설치

---

## 주요 기능

### 지도 탭

- **국토교통부 V-World 지도** (OpenLayers 기반) — 일반·화이트·다크·위성·하이브리드 배경지도 선택
- 단속 유형별 마커 시각화: **고정형 CCTV** / **주행형 CCTV** / **시민신고**
- CCTV 위치 마커 표시 (운영 중 / 미운영 구분)
- **레이어 토글**
  - 탄력운영구간 (GeoJSON, 파란색 폴리곤)
  - 어린이보호구역 (공공데이터포털 API 실시간 연동, EPSG:5181 좌표 변환)
  - 공영주차장 (번들 CSV 데이터, 파란 P 마커)
  - 버스전용차로 (GeoJSON)
  - 읍면동 경계 / 외곽 마스크
- **영역 선택 통계** — 자유형·원형·사각형 3가지 방식으로 영역 지정 후 해당 영역 내 단속 통계 즉시 계산
  - 영역 내 CSV 내보내기
  - 영역 선택 리포트 PDF 출력
- Excel 단속자료 직접 업로드 → 지도에 마커 표시
  - 고정형·주행형·시민신고가 **혼재된 파일**도 행 단위로 유형 판별하여 정확히 처리
- V-World 주소 API 기반 지오코딩 (시민신고 주소 → 좌표 변환)
- 지도 내 장소 검색 (V-World 검색 API)

### 지도 탭 — 단속 분석 도구 *(v1.0.9 신규)*

사이드바 **"분석 도구"** 섹션에서 수동 업로드한 마커 데이터를 실시간으로 분석합니다.  
DB 단속 데이터와 무관하게, **현재 지도에 표시된 마커만** 대상으로 동작합니다.

#### 단속 열지도
- 업로드된 마커를 밀도 기반 색상 원으로 오버레이 (위험등급별 빨강→초록)
- 월 평균 건수에 비례한 원 크기·불투명도

#### 핫스팟 분석 패널
- **DBSCAN 클러스터링** — 200m 격자 대신 Haversine 거리(eps=250m) 기반으로 인접 마커를 자연스럽게 병합
  - 격자 경계에서 분리되던 핫스팟이 올바르게 하나의 군집으로 통합됨
  - DBSCAN 실패 시 기존 격자 방식으로 자동 폴백
- **이상감지 배지** — 각 핫스팟에 자동 태그 표시
  - `⚡ 이상` — Z-score > 2.5: 전체 구간 대비 통계적 이상치
  - `📈 급증` — 최근 3개월이 직전 분기 평균의 2배 이상 급증
- 위험등급별 요약: 🔴 상시단속 / 🟠 고위험 / 🟡 주의 / 🟢 보통
- 등급 필터 (전체 / 상시+고위험 / 상시만)
- 항목 클릭 시 해당 위치로 지도 이동

#### 네비게이션 데이터 내보내기
- **GeoJSON 내보내기** — 네이버지도·Tmap 제출용 (위치·위험등급·알림메시지 포함)
- **CSV 내보내기** — 카카오맵·범용 (BOM 포함 UTF-8)
- 등급 필터와 연동하여 선택한 등급만 내보내기 가능

### 대시보드

- CCTV 현황: 전체 / 운영 중 / 미운영 대수
- 단속 현황: 전체 건수, 유형별 (고정형 / 주행형 / 시민신고) 분류
- TOP 5 단속 지역 (읍면동 기준, 16개 법정동 + 기타로 정규화)
- 월별 단속 건수 추이 차트 (Chart.js)

### 통계 / 리포트

- 기간별 단속 통계 조회 및 차트 (읍면동별, 단속구분별, 위반법규별)
- **빠른 날짜 선택**: 1개월 / 3개월 / 6개월 / −1년 / +1년 버튼
- 한국 시간대(UTC+9) 기준 정확한 날짜 계산
- A4 비율 단속 현황 보고서 미리보기 (html2canvas 기반)
- PDF 저장 / 인쇄

### 데이터 관리

- Excel 파일 스캔 및 가져오기 (번들 데이터 + 사용자 추가 파일 통합 조회)
- CCTV 데이터 Excel 내보내기
- 단속 데이터 Excel 내보내기

### CCTV 관리

- CCTV 목록 조회 / 추가 / 수정 / 삭제
- 운영 상태 관리

### 설정

- **테마**: 다크 / 라이트 모드 전환
- **비밀번호 변경**: bcryptjs 해시 처리
- **지도**: 기본 배경지도, 초기 위치·줌, 클러스터 기본값 설정
- **알림**: 가져오기 완료·오류 알림 토스트 설정
- **데이터**: CCTV / 단속 DB 초기화
- **패치노트**: 버전별 업데이트 내역 열람
- **정보**: 앱 버전·Electron·Node.js 버전, DB 경로 확인, **수동 업데이트 확인**, **로그 폴더 열기**

### 자동 업데이트

- 앱 실행 후 2초 뒤 GitHub Releases 자동 체크
- 새 버전 발견 시 우하단 플로팅 카드로 알림 및 다운로드 진행률 표시
- 설정 > 정보 탭에서 **수동 업데이트 확인** 가능 (15초 타임아웃 적용)
- 앱 종료 시 자동 설치 (`autoInstallOnAppQuit`)

### 안정성 기능

- **창 상태 복원**: 앱 종료 시 창 크기·위치·최대화 상태 저장, 재시작 시 복원 (연결 해제된 모니터 방어 포함)
- **탭 상태 복원**: 마지막으로 열었던 탭 기억 및 복원
- **앱 로그 파일**: `userData/logs/app-YYYY-MM-DD.log` 일별 로그, 30일 자동 삭제
- **전역 오류 캐치**: `uncaughtException` / `unhandledRejection` 로그 기록
- **분석 폴백**: DBSCAN·이상감지 실패 시 기존 격자 방식으로 자동 복구

---

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | [Electron](https://www.electronjs.org/) | 30.0.0 |
| 지도 | [국토교통부 V-World](https://www.vworld.kr/) (OpenLayers 내장) | 2.0 |
| 데이터베이스 | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.10.0 |
| 차트 | [Chart.js](https://www.chartjs.org/) | 4.5.1 |
| PDF 캡처 | [html2canvas](https://html2canvas.hertzen.com/) | 1.4.1 |
| 엑셀 | [xlsx (SheetJS)](https://sheetjs.com/) | 0.18.5 |
| 자동 업데이트 | [electron-updater](https://www.electron.build/auto-update) | 6.3.9 |
| 인증 | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 3.0.3 |
| 빌드 | [electron-builder](https://www.electron.build/) | 24.13.3 |

**클러스터링 / 분석 알고리즘** (외부 라이브러리 없음, 순수 JS 내장 구현)

| 알고리즘 | 용도 |
|---------|------|
| DBSCAN (Haversine 거리) | 핫스팟 격자 병합 — 인접 200m 셀을 자연스러운 군집으로 통합 |
| Z-score 이상감지 | 전체 핫스팟 중 통계적 이상치 탐지 |
| 추세 비율 (최근 3개월 vs 직전 분기) | 단속 급증 구간 자동 감지 |

**외부 API**

| API | 용도 |
|-----|------|
| V-World 지도 API (`map.vworld.kr`) | 지도 렌더링 (OpenLayers 래퍼) |
| V-World 주소 API (`api.vworld.kr/req/address`) | 시민신고 주소 → 좌표 지오코딩 |
| V-World 검색 API (`api.vworld.kr/req/search`) | 지도 내 장소 검색 |
| 공공데이터포털 API (`apis.data.go.kr/1320000/safetyzonedtlinfo/getdtllist`) | 어린이보호구역 실시간 조회 (EPSG:5181 좌표 변환) |

**보안 설정**

- `contextIsolation: true` — 렌더러와 Node.js 컨텍스트 완전 분리
- `nodeIntegration: false` — 렌더러에서 Node.js 직접 접근 차단
- `webSecurity: true` — 기본 웹 보안 정책 유지
- `contextBridge` — 허용된 IPC 채널만 렌더러에 노출

---

## 설치 방법 (일반 사용자)

1. [Releases 페이지](https://github.com/dpsdkfwl11/namyangju-smart-parking/releases/latest)에서 최신 설치 파일(`.exe`) 다운로드
2. 설치 파일 실행 → 설치 경로 선택 후 완료
3. 바탕화면 또는 시작 메뉴의 **남양주 스마트주정차** 바로가기로 실행

> Windows x64 환경에서만 동작합니다.  
> 설치 시 관리자 권한이 필요하지 않습니다 (사용자 AppData에 설치).

---

## 앱 데이터 저장 위치

앱 실행 시 사용되는 데이터는 아래 경로에 저장됩니다.  
설치 파일을 제거해도 이 폴더는 유지됩니다 (데이터 초기화가 필요한 경우 수동 삭제).

```
%APPDATA%\namyangju-smart-parking\
├── data\
│   └── app.db               # SQLite 데이터베이스 (CCTV, 단속 기록)
├── window-state.json        # 창 크기·위치·최대화 상태
└── logs\
    └── app-YYYY-MM-DD.log   # 일별 앱 로그 (30일 경과 시 자동 삭제)
```

---

## 개발 환경 설정

### 사전 요구사항

- [Node.js](https://nodejs.org/) 18 이상
- Windows OS (빌드 및 실행)

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/dpsdkfwl11/namyangju-smart-parking.git
cd namyangju-smart-parking

# 의존성 설치
npm install

# better-sqlite3 네이티브 모듈 Electron 버전에 맞게 재빌드
npm run rebuild

# 개발 모드 실행
npm start
```

### 빌드 및 배포

```bash
# Windows x64 설치 파일 생성 (dist/ 폴더에 출력)
npm run build

# 빌드 후 GitHub Releases에 자동 배포 (GH_TOKEN 환경변수 필요)
$env:GH_TOKEN = "your_github_token"
npm run release
```

> GitHub Personal Access Token은 `repo` 권한이 필요합니다.

---

## 프로젝트 구조

```
namyangju-smart-parking/
├── main.js                  # Electron 메인 프로세스
│                            #  - BrowserWindow 생성 및 창 상태 복원
│                            #  - IPC 채널 등록 (updater, logger, shell 등)
│                            #  - 자동 업데이트 (electron-updater)
│                            #  - 전역 오류 캐치 및 로그
├── preload.js               # Preload 스크립트 — contextBridge IPC 브릿지
├── package.json             # 프로젝트 설정, 의존성, electron-builder 설정
├── icon.ico / icon.png      # 앱 아이콘
│
├── src/
│   ├── ipc/
│   │   └── handlers.js      # IPC 핸들러 (CCTV CRUD, Excel, Stats, 분석, 내보내기)
│   ├── db/
│   │   └── database.js      # SQLite DB 초기화 및 쿼리 (better-sqlite3)
│   ├── logger.js            # 일별 로그 파일 시스템 (30일 자동 삭제)
│   └── window-state.js      # 창 크기·위치·최대화 상태 저장/복원
│
├── renderer/
│   └── index.html           # 단일 파일 렌더러 (전체 UI — HTML/CSS/JS 통합)
│                            #  - 탭: 지도 / 대시보드 / 통계 / 리포트 / 데이터관리 / 설정
│                            #  - 레이어: CCTV, 탄력운영구간, 어린이보호구역, 공영주차장, 버스전용차로
│                            #  - 분석: AnalysisManager (DBSCAN + Z-score + 내보내기)
│
├── static/
│   └── js/modules/
│       └── auth.js          # 로그인/로그아웃 인증 모듈
│
└── data/                    # 번들 단속 데이터 및 GeoJSON (DB 파일은 빌드 제외)
    ├── bus_lane.geojson
    ├── flexible_zone.geojson
    ├── 경기도_남양주시_주차장정보_20260311.csv
    ├── 고정형 단속자료 24.01.01~12.31.xlsx
    ├── 고정형 단속자료 25.01.01~12.31.xlsx
    ├── 시민신고 24.01.01~12.31.xlsx
    ├── 시민신고 25.01.01~12.31.xlsx
    ├── 주행형 단속자료 24.01.01~12.31.xlsx
    └── 주행형 단속자료 25.01.01~12.31.xlsx
```

---

## 번들 단속 데이터

앱에 포함되어 있는 기본 단속 자료입니다. "데이터 관리" 탭에서 가져오기하여 사용합니다.

| 유형 | 포함 기간 |
|------|----------|
| 고정형 CCTV | 2024년 전체 · 2025년 전체 |
| 주행형 CCTV | 2024년 전체 · 2025년 전체 |
| 시민신고 | 2024년 전체 · 2025년 전체 |
| 공영주차장 | 2026년 3월 기준 (경기도 남양주시) |

---

## 업데이트 내역

| 버전 | 날짜 | 주요 변경사항 |
|------|------|--------------|
| **v1.0.9** | 2026-05-29 | 공영주차장 레이어 추가, 어린이보호구역 API 공공데이터포털로 교체(EPSG:5181 좌표 변환), 탄력운영구간 색상 파란색 변경, **단속 분석 도구 신규** (열지도·핫스팟 패널·GeoJSON/CSV 내보내기), **DBSCAN 클러스터링** 적용, **Z-score 이상감지** 배지 |
| v1.0.8 | 2026-05-19 | 창 크기·위치 저장/복원, 탭 상태 복원, 수동 업데이트 확인 버튼, 앱 로그 파일 시스템, 혼재 단속파일 마커 처리 오류 수정 |
| v1.0.7 | 2026-05-19 | 시민신고 2024년도 데이터 추가, 지도 초기화 시 선택영역 통계 함께 초기화 |
| v1.0.6 | 2026-05-19 | 업데이트 알림 카드 디자인 개선 (우하단 플로팅 카드) |
| v1.0.5 | 2026-05-19 | 업데이트 배너 타이밍 버그 수정 |
| v1.0.4 | 2026-05-19 | 로그인 후 패치노트 배너 추가, 설정 탭 패치노트 섹션 추가 |
| v1.0.3 | 2026-05-19 | Program Files 설치 시 DB 오류 수정, DB·파일 경로를 userData로 이동 |
| v1.0.2 | 2026-05-18 | 통계/리포트 날짜 빠른 선택 버튼 추가, UTC+9 날짜 계산 버그 수정 |
| v1.0.1 | 2026-05-17 | 자동 업데이트 기능 추가 |
| v1.0.0 | 2026-05-16 | 최초 릴리스 |

전체 릴리스 내역은 [GitHub Releases](https://github.com/dpsdkfwl11/namyangju-smart-parking/releases)에서 확인하세요.

---

## 알려진 동작 특성

- **동일 버전 재배포 시 자동 업데이트 불가**: 버전 번호가 같으면 electron-updater가 업데이트로 인식하지 않음. 수정 사항이 있으면 반드시 버전을 올려서 배포해야 합니다.
- **asar 비활성화**: better-sqlite3 네이티브 모듈 호환성을 위해 `asar: false` 설정 사용 중.
- **혼재 파일 처리**: 고정형·주행형·시민신고가 하나의 Excel 파일에 섞여 있어도 행(Row) 단위로 유형을 판별하여 각각 처리합니다.
- **어린이보호구역**: 공공데이터포털 API 실시간 호출 — 인터넷 연결이 필요하며, 남양주시(시군구코드 41360) 데이터를 가져옵니다. 좌표는 EPSG:5181(한국 TM) → WGS84로 변환합니다.
- **분석 도구**: DB 단속 데이터가 아닌 지도탭에서 수동 업로드한 마커만 분석합니다. 파일 업로드 후 사용하세요.

---

## 라이선스

ISC License © dpsdkfwl11
