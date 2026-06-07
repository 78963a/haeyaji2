/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TagCreatedWhen, TagNature, TagTool, TagDuration, TagCategory } from './types';

export const TAG_CREATED_WHEN_MAP: Record<TagCreatedWhen, { label: string; desc: string; color: string; bg: string }> = {
  today: { label: '오늘', desc: '오늘 처음 생각남', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  week: { label: '일주일 이내', desc: '슬슬 미루기 시작한', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
  week_plus: { label: '일주일 이상 묵힘', desc: '적어도 일주일 지남', color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-80 border-indigo-200' },
  month: { label: '한달 전쯤', desc: '한 달 정도 묵혀둔 일', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  year_under: { label: '일년 미만', desc: '일 년은 아직 안 됨', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-850' },
  year_plus: { label: '일년 이상 묵힘', desc: '일 년이 넘어가버린 일', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 border-red-200' },
  distant: { label: '먼 기억 속 옛날', desc: '먼지 쌓인 아득한 기억', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' }
};

export const TAG_NATURE_MAP: Record<TagNature, { label: string; desc: string; icon: string; color: string; bg: string }> = {
  one_off: { label: '단판 승부', desc: '한 번 하면 끝나는 일', icon: '🎯', color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900' },
  recurring: { label: '꾸준히 할 일', desc: '주기적인 반복이 필요', icon: '🔄', color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900' },
  long_term: { label: '장기 프로젝트', desc: '쪼개어 할 큰 작업', icon: '📐', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900' }
};

export const TAG_TOOL_MAP: Record<TagTool, { label: string; icon: string; bg: string; border: string }> = {
  computer: { label: '컴퓨터/스마트폰', icon: '💻', bg: 'bg-zinc-100 dark:bg-zinc-800/80', border: 'border-zinc-200 dark:border-zinc-700' },
  housework: { label: '집안 수수방관', icon: '🧹', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-100 dark:border-orange-900/40' },
  outdoor: { label: '외출 필요', icon: '👟', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-900/40' }
};

export const TAG_DURATION_MAP: Record<TagDuration, { label: string; desc: string; bg: string; color: string }> = {
  under_10m: { label: '10분 이내', desc: '마음만 먹으면 금방!', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', color: 'emerald' },
  under_1h: { label: '한시간 이내', desc: '집중 한 판이면 끝!', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300', color: 'indigo' },
  under_1d: { label: '하루 종일', desc: '오늘 하루 잡고 해야함', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', color: 'amber' },
  more: { label: '며칠 더 걸림', desc: '크게 호흡을 잡는 일', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300', color: 'rose' }
};

export const CHEER_MESSAGES = [
  "해야지 해야지 해놓고 아직도 침대 위에 계신가요? 지금 5분만 하면 맘 편히 누울 수 있습니다!",
  "언젠간 해야 할 일이라면, 지금 해치우고 두 다리 쭉 뻗는 게 완전 뇌 건강에 좋습니다! 😉",
  "완벽하게 하려고 미루는 거래요. 그냥 개판으로 시작해보는 건 어떨까요? 시작하면 멋지게 완성됩니다!",
  "그 일 생각할 때마다 가슴 한 켠이 묵직했죠? 지금 시작해서 그 돌덩이를 당장 굴려버려요!",
  "오늘 안 하면 일주일 뒤에 똑같은 생각으로 한숨 쉬고 있을걸요? 오늘 끝장내봅시다!",
  "집중력 타이머 시작! 그냥 눈 감고 손가락 움직여보세요. 몸보다 뇌가 먼저 따라옵니다.",
  "미루기 끝판왕이었던 당신, 오늘 비로소 실천가로 재탄생하는 날입니다!!",
  "기록상 당신은 이 일을 가장 오랫동안 머리로만 시뮬레이션했습니다. 이제 현실로 소환해보죠!",
  "컴퓨터 켜기, 양말 신기... 딱 첫걸음만 떼요. 진짜 그 다음은 엄청나게 쉽습니다!"
];

export const SAMPLE_TASKS = [
  {
    id: 'sample-1',
    title: '미뤄둔 치과 정기 검진 예약하기',
    description: '작년부터 어금니 조금 찌릿했는데 무서워서 미룸. 전화 한 통이면 끝나는 건데 바쁘다는 핑계로 벌써 6달 넘음.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(), // 180 days ago
    status: 'pending' as const,
    timeSpent: 0,
    tags: {
      createdWhen: 'year_under' as const,
      nature: 'one_off' as const,
      tool: 'outdoor' as const,
      duration: 'under_10m' as const
    },
    subtasks: [
      { id: 'sub-1', title: '근처 과잉진료 없는 치과 후기 검색 (3곳)', completed: false },
      { id: 'sub-2', title: '목요일 평일 오후 시간 예약 전화 걸기', completed: false }
    ],
    cheersCount: 0
  },
  {
    id: 'sample-2',
    title: '겨울옷 드라이클리닝 & 옷장 정리',
    description: '봄이 오고 초여름이 되었는데도 옷장에 겨울 패딩이랑 코트 가득차있음. 언제 세탁소 가야지 해놓고 가방에 담아만 둔지 3달차.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(), // 90 days ago
    status: 'pending' as const,
    timeSpent: 0,
    tags: {
      createdWhen: 'month' as const,
      nature: 'one_off' as const,
      tool: 'housework' as const,
      duration: 'under_1h' as const
    },
    subtasks: [
      { id: 'sub-3', title: '패딩, 코트 분류해서 리빙박스/세탁가방 담기', completed: false },
      { id: 'sub-4', title: '모바일 세탁 수거 신청 또는 세탁소 맡기기', completed: false },
      { id: 'sub-5', title: '봄여름 얇은 옷 옷장에 걸기', completed: false }
    ],
    cheersCount: 0
  },
  {
    id: 'sample-3',
    title: '깃허브 오랫동안 안 만진 개인 프로젝트 정리',
    description: '어쩌다 보니 2년 전 커밋에서 멈춰버린 레포지토리. 리드미 고치고 완성하겠다고 다짐만 한 지 오랜 세월 지남.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 400).toISOString(), // > 1 year ago
    status: 'pending' as const,
    timeSpent: 0,
    tags: {
      createdWhen: 'year_plus' as const,
      nature: 'long_term' as const,
      tool: 'computer' as const,
      duration: 'more' as const
    },
    subtasks: [
      { id: 'sub-6', title: '로컬 코드 클론하고 최신 라이브러리 빌드 에러 잡기', completed: false },
      { id: 'sub-7', title: '필수 핵심 기능 작동 테스트', completed: false },
      { id: 'sub-8', title: '리드미(README)에 설명 및 실행 방법 추가하기', completed: false }
    ],
    cheersCount: 0
  }
];

export const DEFAULT_TAG_CATEGORIES: TagCategory[] = [
  {
    id: 'createdWhen',
    label: '발생 시점 (시점)',
    isDefault: true,
    options: [
      { value: 'today', label: '오늘', desc: '오늘 처음 생각남' },
      { value: 'week', label: '이번 주', desc: '슬슬 미루기 시작한' },
      { value: 'week_plus', label: '일주일 이상', desc: '적어도 일주일 지남' },
      { value: 'month', label: '한달 쯤', desc: '한 달 정도 묵혀둔 일' },
      { value: 'year_under', label: '일년 미만', desc: '일 년은 아직 안 됨' },
      { value: 'year_plus', label: '일년 이상', desc: '일 년이 넘어가버린 일' },
      { value: 'distant', label: '먼 기억 속 옛날', desc: '먼지 쌓인 아득한 기억' }
    ]
  },
  {
    id: 'nature',
    label: '작업의 주기/성격 (성격)',
    isDefault: true,
    options: [
      { value: 'one_off', label: '단판 승부', icon: '🎯', desc: '한 번 하면 끝나는 일' },
      { value: 'recurring', label: '꾸준히 할 일', icon: '🔄', desc: '주기적인 반복이 필요' },
      { value: 'long_term', label: '장기 프로젝트', icon: '📐', desc: '쪼개어 할 큰 작업' }
    ]
  },
  {
    id: 'tool',
    label: '필요한 도구/상황 (도구)',
    isDefault: true,
    options: [
      { value: 'computer', label: '컴퓨터/스마트폰', icon: '💻' },
      { value: 'housework', label: '집안', icon: '🧹' },
      { value: 'outdoor', label: '외출 필요', icon: '👟' }
    ]
  },
  {
    id: 'duration',
    label: '예상 실천시간 (시간)',
    isDefault: true,
    options: [
      { value: 'under_10m', label: '10분 이내', desc: '마음만 먹으면 금방!' },
      { value: 'under_1h', label: '한시간 이내', desc: '집중 한 판이면 끝!' },
      { value: 'under_1d', label: '하루 종일', desc: '오늘 하루 잡고 해야함' },
      { value: 'more', label: '며칠 더 걸림', desc: '크게 호흡을 잡는 일' }
    ]
  }
];
