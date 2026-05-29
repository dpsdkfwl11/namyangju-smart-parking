# 지도탭 단속 데이터 분석 툴 — 설계 계획서

> **전제**: 사용자가 Excel을 수동 업로드 → `enforcement` DB에 적재 → 지도에 마커 표시  
> **목표**: 이미 지도에 찍힌 마커 데이터를 분석하여 핫스팟 식별 + 네비게이션 알림 데이터 생성

---

## 현재 데이터 구조 (변경 없음)

```sql
-- 기존 enforcement 테이블 (수정 불필요)
단속일시   TEXT   -- "2024-04-12 14:09:31"
단속동     TEXT   -- "다산1동"
단속장소   TEXT   -- "다산중앙로 82번길"
단속구분   TEXT   -- "주행형CCTV" | "고정형CCTV" | "시민신고"
위반법규   TEXT   -- "횡단보도 정차·주차"
단속특별지역 TEXT
gps_x     REAL   -- 위도  37.6523
gps_y     REAL   -- 경도 127.2134
source_file TEXT
```

---

## Phase 1 — 분석 쿼리 엔진 (백엔드)

> **목적**: 기존 `enforcement` 테이블을 분석하는 SQL 쿼리 추가  
> **위치**: `src/ipc/handlers.js` 에 핸들러 추가  
> **신규 테이블 없음** — 쿼리만 추가

### 1-1. 핫스팟 격자 집계 쿼리

지도에 표시된 마커를 **200m 격자**로 묶어 밀집도 계산

```sql
-- 핸들러: analysis:getHotspots
SELECT
  ROUND(gps_x / 0.0018) AS grid_lat,   -- 위도 격자 (약 200m 단위)
  ROUND(gps_y / 0.0022) AS grid_lng,   -- 경도 격자 (약 200m 단위)
  AVG(gps_x)            AS center_lat,
  AVG(gps_y)            AS center_lng,
  COUNT(*)              AS total,
  COUNT(CASE WHEN 단속일시 >= DATE('now','-3 months') THEN 1 END) AS recent_3m,
  COUNT(CASE WHEN 단속일시 >= DATE('now','-12 months') THEN 1 END) AS recent_12m
FROM enforcement
WHERE gps_x IS NOT NULL AND gps_y IS NOT NULL
  AND gps_x BETWEEN 37.4 AND 38.0        -- 남양주시 범위 필터
  AND gps_y BETWEEN 126.8 AND 127.7
  [날짜·단속구분 필터 조건 동적 조합]
GROUP BY grid_lat, grid_lng
HAVING total >= 3                         -- 최소 3건 이상만
ORDER BY total DESC
```

**위험도 등급** (JavaScript에서 산출):

| 등급 | 기준 (월 평균 건수) | 색상 |
|------|-------------------|------|
| 🔴 상시단속 | 20건 이상 | `#ef4444` |
| 🟠 고위험 | 10~19건 | `#f97316` |
| 🟡 주의 | 3~9건 | `#eab308` |
| 🟢 보통 | 1~2건 | `#22c55e` |

### 1-2. 시간대 패턴 쿼리

```sql
-- 핸들러: analysis:getTimePattern  (특정 격자 또는 전체)
SELECT
  CAST(SUBSTR(단속일시, 12, 2) AS INTEGER) AS hour,
  COUNT(*) AS cnt
FROM enforcement
WHERE gps_x IS NOT NULL
  [격자 범위 / 날짜 / 구분 필터]
GROUP BY hour
ORDER BY hour
```

```sql
-- 요일별 (0=일, 1=월, ... 6=토)
SELECT
  STRFTIME('%w', 단속일시) AS weekday,
  COUNT(*) AS cnt
FROM enforcement
GROUP BY weekday
```

### 1-3. 네비게이션 알림 메시지 자동 생성 로직

```javascript
// 핸들러: analysis:generateNavMessage
function buildNavMessage(hotspot) {
  const { total, recent_3m, monthly_avg, peak_hour, peak_days, violation_top } = hotspot;

  if (monthly_avg >= 20)
    return `해당 구역은 상시 단속 구간으로 최근 3개월간 ${recent_3m}건이 단속된 지역입니다. 불법 주차 대신 인근 주차장을 이용해 주세요.`;

  if (peak_hour)
    return `이 구역은 ${peak_hour} 집중 단속 구간입니다. (최근 ${recent_3m}건 단속)`;

  return `단속 이력이 있는 구역입니다. 누적 ${total}건 단속.`;
}
```

---

## Phase 2 — 지도탭 분석 UI

> **목적**: 기존 지도탭에 "분석 모드"를 추가.  
> 기존 마커 레이어는 그대로 유지하고, 분석 오버레이를 덧씌우는 방식

### 2-1. 사이드바에 분석 버튼 추가

기존 레이어 목록 하단에 구분선 후 추가:

```
─────────────── 분석 ───────────────
[🔥 단속 열지도]        ← 히트맵 오버레이
[📊 핫스팟 분석]        ← 핫스팟 원 + 클릭 팝업
```

### 2-2. 히트맵 오버레이 (`ol.layer.Heatmap`)

- 기존 클러스터 마커 레이어 위에 반투명 히트맵 레이어 추가
- `weight` = 격자별 `monthly_avg`를 0~1로 정규화
- 색상 그라디언트: 파랑(희박) → 초록 → 노랑 → 빨강(밀집)
- 줌 레벨 따라 `blur` / `radius` 자동 조정

```javascript
class HeatmapManager {
  constructor(app) { ... }
  async show() {
    const hotspots = await window.electronAPI.analysis.getHotspots(this.currentFilter);
    // enforcement 포인트 전체를 heatmap source에 추가
    // weight = monthly_avg 정규화
  }
}
```

### 2-3. 핫스팟 분석 오버레이

각 격자를 **위험도별 색상 원**으로 표시 (클러스터 마커와 병존):

```
🔴 빨간 원  — 상시단속 (반경 200m)
🟠 주황 원  — 고위험
🟡 노란 원  — 주의
```

원 클릭 시 **분석 팝업** 표시:

```
┌─────────────────────────────────────┐
│ 🔴 상시단속구간                      │
│ 다산1동 다산중앙로 일대               │
├─────────────────────────────────────┤
│ 누적 단속      1,247건               │
│ 최근 3개월        98건               │
│ 월 평균           41건/월            │
├─────────────────────────────────────┤
│ 주요 단속시간   08~10시              │
│ 주요 요일       월~금 (평일 87%)     │
│ 주요 위반       횡단보도 정차·주차    │
├─────────────────────────────────────┤
│ ▁▂▅▇██▅▃▂▁  (시간대별 미니 바차트)  │
├─────────────────────────────────────┤
│ 💬 네비 알림 메시지:                 │
│ "해당 구역은 상시 단속 구간으로      │
│  최근 3개월간 98건이 단속된          │
│  지역입니다. 주차장을 이용하세요."   │
│                          [복사]     │
└─────────────────────────────────────┘
```

### 2-4. 필터 패널

분석 버튼 활성화 시 지도 우측에 플로팅 패널:

```
┌──────────────────────────────┐
│  📊 분석 필터                 │
├──────────────────────────────┤
│  기간   ●전체 ○1년 ○3개월    │
│  구분   ☑주행형 ☑고정형      │
│         ☑시민신고            │
│  시간대 [00시] ────● [23시]  │
│  요일   [월][화][수][목][금] │
│         [토][일]             │
│  등급   ●전체 ○상시단속만    │
│                              │
│  [분석 실행]  [초기화]       │
└──────────────────────────────┘
```

---

## Phase 3 — 네비게이션 데이터 내보내기

> **목적**: 분석 결과를 네비게이션 업체 제출용 포맷으로 내보내기  
> **위치**: 설정탭 → 데이터 관리 or 지도탭 분석 팝업 내 버튼

### 3-1. GeoJSON 내보내기

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "source": "남양주시 스마트주정차",
    "generated_at": "2026-05-22",
    "total_zones": 142
  },
  "features": [{
    "type": "Feature",
    "geometry": { "type": "Point", "coordinates": [127.2134, 37.6523] },
    "properties": {
      "id": "NMY-001",
      "risk_level": "critical",
      "total_count": 1247,
      "recent_3m": 98,
      "monthly_avg": 41,
      "radius_m": 200,
      "peak_hours": "08-10",
      "peak_days": "weekday",
      "violation": "횡단보도 정차·주차",
      "alert_message": "해당 구역은 상시 단속 구간으로 최근 3개월간 98건이 단속된 지역입니다. 불법 주차 대신 주차장을 이용해 주세요."
    }
  }]
}
```

### 3-2. 내보내기 UI

지도탭 분석 패널 하단 or 설정탭:

```
[📤 네비게이션 데이터 내보내기]
  ├─ GeoJSON  (네이버지도·Tmap 제출용)
  └─ CSV      (카카오맵·범용)

등급 선택: ●전체  ○상시단속+고위험  ○상시단속만
```

---

## 페이즈별 요약

| 페이즈 | 작업 | 변경 파일 | 난이도 |
|--------|------|-----------|--------|
| **Phase 1** | 분석 쿼리 IPC 핸들러 3개 추가 | `handlers.js`, `preload.js` | ★★☆☆☆ |
| **Phase 2** | 지도탭 히트맵 + 핫스팟 오버레이 UI | `index.html` | ★★★★☆ |
| **Phase 3** | GeoJSON/CSV 내보내기 | `handlers.js`, `index.html` | ★★☆☆☆ |

> **기존 코드 영향 없음**: 현재 마커·클러스터 레이어, 대시보드, DB 구조 모두 그대로 유지.  
> 분석 기능은 새 레이어 + 새 핸들러로 완전히 독립 추가됨.

---

*작성일: 2026-05-22*
