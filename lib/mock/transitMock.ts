/**
 * ODsay API 한도 보호용 Mock Data
 * V-01~V-03 실제 API 응답 필드명과 100% 동일한 구조
 */

// ─────────────────────────────────────────────
// 버스 실시간 도착 Mock (realtimeStation 응답)
// ─────────────────────────────────────────────
export const mockBusArrival = {
  result: {
    real: [
      {
        routeNm: "470",
        stationNm: "사당역2번출구",
        arrival1: {
          arrivalSec: 240,   // 4분
          leftStation: 3,
          arrivalMsg: "3정류장 전",
        },
        arrival2: {
          arrivalSec: 780,   // 13분
          leftStation: 9,
          arrivalMsg: "9정류장 전",
        },
      },
      {
        routeNm: "472",
        stationNm: "사당역2번출구",
        arrival1: {
          arrivalSec: 120,
          leftStation: 1,
          arrivalMsg: "1정류장 전",
        },
        arrival2: {
          arrivalSec: 600,
          leftStation: 7,
          arrivalMsg: "7정류장 전",
        },
      },
    ],
  },
}

// ─────────────────────────────────────────────
// 지하철 실시간 도착 Mock (realtimeSubwayStation 응답)
// ─────────────────────────────────────────────
export const mockSubwayArrival = {
  result: {
    real: [
      {
        laneName: "4호선",
        stationName: "사당",
        lane: [
          {
            directionNm: "당고개 방면",
            arrivalInfo: [
              {
                arrivalSec: 334,        // 약 5.5분
                leftStationCnt: 4,
                arrivalMsg: "4역 전",
              },
              {
                arrivalSec: 934,        // 약 15.5분
                leftStationCnt: 11,
                arrivalMsg: "11역 전",
              },
            ],
          },
          {
            directionNm: "오이도 방면",
            arrivalInfo: [
              {
                arrivalSec: 180,
                leftStationCnt: 2,
                arrivalMsg: "2역 전",
              },
            ],
          },
        ],
      },
    ],
  },
}

// ─────────────────────────────────────────────
// ODsay 경로 탐색 캐시 Mock (searchPubTransPathT path[0] 구조)
// ─────────────────────────────────────────────
export const mockOdsayRouteCache = {
  pathType: 1,
  info: {
    totalTime: 40,        // 총 소요 시간 (분) — 타이머 계산용
    payment: 1250,
    busTransitCount: 0,
    subwayTransitCount: 1,
    firstStartStation: "사당",
    lastEndStation: "강남",
  },
  subPath: [
    {
      trafficType: 3,     // 도보
      distance: 450,
      sectionTime: 6,
      startName: "집",
      endName: "사당역",
    },
    {
      trafficType: 1,     // 지하철
      distance: 12000,
      sectionTime: 28,
      startID: 429,
      startName: "사당",
      startArsID: "22429",
      endName: "강남",
      lane: [
        {
          name: "수도권 4호선",
          subwayCode: 4,
        },
      ],
    },
    {
      trafficType: 3,     // 도보
      distance: 380,
      sectionTime: 5,
      startName: "강남역",
      endName: "목적지",
    },
  ],
}

// ─────────────────────────────────────────────
// 스케줄 레코드 Mock (schedules 테이블 레코드 형태)
// ─────────────────────────────────────────────
export const mockSchedule = {
  id: "mock-schedule-id-001",
  user_id: "mock-user-id-001",
  day: "monday" as const,
  is_active: true,
  workplace_name: "강남 사무소",
  workplace_address: "서울 강남구 테헤란로 152",
  workplace_lat: 37.4979,
  workplace_lng: 127.0276,
  arrival_time: "09:00",
  // 지하철 경로 예시
  commute_traffic_type: 1,
  commute_ars_id: "22429",
  commute_bus_no: null,
  commute_station_name: "사당",
  commute_subway_line: "수도권 4호선",
  commute_stop_id: "429",
  commute_stop_name: "사당",
  commute_route_id: null,
  odsay_route_cache: mockOdsayRouteCache,
  route_cached_at: new Date().toISOString(),
  // 퇴근 경로 (버스 예시)
  return_traffic_type: 2,
  return_ars_id: null,
  return_bus_no: "470",
  return_station_name: null,
  return_subway_line: null,
  return_stop_id: "165600",
  return_stop_name: "강남역",
  return_route_id: null,
  return_odsay_cache: null,
  return_route_cached_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockUserSettings = {
  id: "mock-settings-id-001",
  user_id: "mock-user-id-001",
  home_address: "서울 동작구 사당동 123",
  home_lat: 37.4767,
  home_lng: 126.9816,
  buffer_minutes: 5,
  commute_start_hour: 5,
  commute_end_hour: 12,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
