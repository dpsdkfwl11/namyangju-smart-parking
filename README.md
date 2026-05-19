# 남양주 스마트주정차

> 남양주시 스마트주정차 단속 관리 데스크톱 애플리케이션

[![Version](https://img.shields.io/badge/version-1.0.8-blue.svg)](https://github.com/dpsdkfwl11/namyangju-smart-parking/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey.svg)]()
[![Electron](https://img.shields.io/badge/Electron-30.5.1-47848F.svg)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)]()

---

## 프로젝트 소개

**남양주 스마트주정차**는 남양주시의 스마트주정차 단속 데이터를 관리·조회·통계분석하기 위한 Windows 전용 데스크톱 애플리케이션입니다.

- Electron 기반 — 별도의 서버·인터넷 연결 없이 로컬에서 완전히 동작
- SQLite 내장 데이터베이스로 단속 기록 및 CCTV 정보를 안전하게 저장
- 설치 경로: 사용자 AppData (관리자 권한 불필요)
- 자동 업데이트 — 앱 실행 시 GitHub Releases에서 최신 버전 자동 감지 및 설치

---

## 주요 기능

### 지도 탭
- Kakao Maps 기반 단속 지점 마커 시각화
- 단속 유형별 색상 구분: **고정형 CCTV** / **주행형 CCTV** / **시민신고**
- CCTV 위치 마커 표시 (운영 중 / 미운영 구분)
- 사각형 영역 선택 → 선택 영역 내 통계 즉시 계산
- 가변주차구역(Flexible Zone) 레이어 오버레이
- 버스전용차로(Bus Lane) 레이어 오버레이
- 지도 초기화 시 선택 영역 통계도 함께 초기화
- Excel 단속자료 직접 업로드 → 지도에 마커 표시
  - 고정형·주행형·시민신고가 **혼재된 파일**도 유형별로 정확히 처리

### 대시보드
- CCTV 현황: 전체 / 운영 중 / 미운영 대수
- 단속 통계: 전체 건수, 유형별(고정형/주행형/시민신고) 분류
- TOP 5 단속 지역 (읍면동 기준)
- 월별 단속 건수 추이 차트 (Chart.js)

### 통계 / 리포트
- 기간별 단속 통계 조회 및 차트
- **빠른 날짜 선택**: 1개월 / 3개월 / 6개월 / −1년 / +1년 버튼
- 한국 시간대(UTC+9) 기준 정확한 날짜 계산
- PDF 리포트 저장 (지도 캡처 포함)

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
- **데이터**: CCTV / 단속 DB 초기화
- **패치노트**: 버전별 업데이트 내역 열람
- **정보**: 앱 버전·Electron·Node.js 버전, DB 경로 확인, **수동 업데이트 확인**, **로그 폴더 열기**

### 자동 업데이트
- 앱 실행 후 2초 뒤 GitHub Releases 자동 체크
- 새 버전 발견 시 우하단 플로팅 카드로 알림
- 다운로드 진행률 표시
- 설정 > 정보 탭에서 **수동 업데이트 확인** 가능 (15초 타임아웃 적용)
- 앱 종료 시 자동 설치 (`autoInstallOnAppQuit`)

### 패치노트 알림
- 로그인 직후 최신 버전 패치노트 모달 표시
- "다시 확인하지 않기" 체크 시 해당 버전 알림 비활성화
- 설정 > 패치노트 탭에서 전체 버전 이력 열람

### 안정성 기능
- **창 상태 복원**: 앱 종료 시 창 크기·위치·최대화 상태 저장, 재시작 시 복원 (연결 해제된 모니터 방어 포함)
- **탭 상태 복원**: 마지막으로 열었던 탭 기억 및 복원
- **앱 로그 파일**: `userData/logs/app-YYYY-MM-DD.log` 일별 로그, 30일 자동 삭제
- **전역 오류 캐치**: `uncaughtException` / `unhandledRejection` 로그 기록

---

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | [Electron](https://www.electronjs.org/) | 30.5.1 |
| 데이터베이스 | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.10.0 |
| 차트 | [Chart.js](https://www.chartjs.org/) | 4.5.1 |
| 엑셀 | [xlsx (SheetJS)](https://sheetjs.com/) | 0.18.5 |
| 자동 업데이트 | [electron-updater](https://www.electron.build/auto-update) | 6.3.9 |
| 인증 | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 3.0.3 |
| 빌드 | [electron-builder](https://www.electron.build/) | 24.13.3 |
| 지도 | Kakao Maps JavaScript API | — |

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
├── namyangju-parking.db     # SQLite 데이터베이스 (CCTV, 단속 기록)
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

# 개발 모드 실행 (DevTools 자동 열림)
npm start -- --dev
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
│   │   └── handlers.js      # IPC 핸들러 등록 (CCTV CRUD, Excel, Stats, DB 등)
│   ├── db/
│   │   └── database.js      # SQLite DB 초기화 및 쿼리 (better-sqlite3)
│   ├── logger.js            # 일별 로그 파일 시스템 (30일 자동 삭제)
│   └── window-state.js      # 창 크기·위치·최대화 상태 저장/복원
│
├── renderer/
│   └── index.html           # 단일 파일 렌더러 (전체 UI — HTML/CSS/JS 통합)
│                            #  - 탭: 지도 / 대시보드 / 통계 / 리포트 / 데이터관리 / 설정
│                            #  - 모듈: MainTabs, SettingsUI, PatchNotes, SidebarUI
│
├── static/
│   └── js/modules/
│       └── auth.js          # 로그인/로그아웃 인증 모듈
│
└── data/                    # 번들 데이터 (빌드에 포함, DB 파일은 제외)
    ├── bus_lane.geojson             # 버스전용차로 레이어
    ├── flexible_zone.geojson        # 가변주차구역 레이어
    ├── 고정형 단속자료 24.01.01~12.31.xlsx
    ├── 주행형 단속자료 24.01.01~12.31.xlsx  (※ 파일명 확인 필요)
    ├── 시민신고 24.01.01~12.31.xlsx
    └── 종합 26.04.08~05.19.xlsx
```

---

## 번들 단속 데이터

앱에 포함되어 있는 기본 단속 자료입니다. "데이터 관리" 탭에서 가져오기하여 사용합니다.

| 파일 | 기간 | 유형 |
|------|------|------|
| 고정형 단속자료 24.01.01~12.31.xlsx | 2024년 전체 | 고정형 CCTV |
| 주행형 단속자료 | 2024년 전체 | 주행형 CCTV |
| 시민신고 24.01.01~12.31.xlsx | 2024년 전체 | 시민신고 |
| 종합 26.04.08~05.19.xlsx | 2026년 4~5월 | 혼합 |

---

## 업데이트 내역

| 버전 | 날짜 | 주요 변경사항 |
|------|------|--------------|
| **v1.0.8** | 2026-05-19 | 창 크기·위치 저장/복원, 탭 상태 복원, 수동 업데이트 확인 버튼, 앱 로그 파일 시스템, 혼재 단속파일 마커 처리 오류 수정 |
| v1.0.7 | 2026-05-19 | 시민신고 2024년도 데이터 추가, 지도 초기화 시 선택영역 통계 함께 초기화, CCTV 검색창 돋보기 아이콘 제거 |
| v1.0.6 | 2026-05-19 | 업데이트 알림 카드 디자인 개선 (우하단 플로팅 카드, 하드코딩 색상으로 가시성 향상) |
| v1.0.5 | 2026-05-19 | 업데이트 배너 타이밍 버그 수정 (캐시+replay 방식, did-finish-load 후 체크) |
| v1.0.4 | 2026-05-19 | 로그인 후 패치노트 배너 추가, 설정 탭 패치노트 섹션 추가 |
| v1.0.3 | 2026-05-19 | Program Files 설치 시 DB 오류 수정, DB·파일 경로를 userData로 이동 |
| v1.0.2 | 2026-05-18 | 통계/리포트 날짜 빠른 선택 버튼 추가 (1개월/3개월/6개월/±1년), UTC+9 날짜 계산 버그 수정 |
| v1.0.1 | 2026-05-17 | 자동 업데이트 기능 추가, 주행형 2024년도 데이터 추가 |
| v1.0.0 | 2026-05-16 | 최초 릴리스 — 지도·통계·리포트·데이터관리·CCTV 관리 |

전체 릴리스 내역은 [GitHub Releases](https://github.com/dpsdkfwl11/namyangju-smart-parking/releases)에서 확인하세요.

---

## 알려진 동작 특성

- **동일 버전 재배포 시 자동 업데이트 불가**: 버전 번호가 같으면 electron-updater가 업데이트로 인식하지 않음. 수정 사항이 있으면 반드시 버전을 올려서 배포해야 합니다.
- **asar 비활성화**: better-sqlite3 네이티브 모듈 호환성을 위해 `asar: false` 설정 사용 중.
- **혼재 파일 처리**: 고정형·주행형·시민신고가 하나의 Excel 파일에 섞여 있어도 행(Row) 단위로 유형을 판별하여 각각 처리합니다.

---

## 라이선스

ISC License © dpsdkfwl11
