// 학교급별 교과 기록 규칙. 클라이언트와 서버(api/)가 함께 쓰므로 import 없이 순수 함수만 둔다.

export type SchoolLevel = 'elementary' | 'middle' | 'high';
export type MiddleSemesterMode = 'general' | 'free';

export interface RecordPolicy {
  level: SchoolLevel;
  label: string;
  /** NEIS 입력 바이트 상한. 초등은 학교별 규정이라 고정 상한을 두지 않는다. */
  maxBytes: number | null;
  /** 기본 학생 수(마지막 사용값이 없을 때). */
  defaultStudentCount: number;
  /** 교사 작업 흐름 안내 문구. */
  workflowHint: string;
  /** 학생별 한 줄 활동 메모를 기본으로 펼칠지. */
  emphasizeActivityNote: boolean;
}

export const RECORD_POLICIES: Record<SchoolLevel, RecordPolicy> = {
  elementary: {
    level: 'elementary',
    label: '초등학교',
    maxBytes: null,
    defaultStudentCount: 5,
    workflowHint: '과목을 하나씩 골라 반 학생 전체의 성취기준 기반 성장 서술을 만듭니다. 과목을 바꿔도 입력한 내용은 과목별로 보존됩니다.',
    emphasizeActivityNote: false,
  },
  middle: {
    level: 'middle',
    label: '중학교',
    maxBytes: 1500,
    defaultStudentCount: 5,
    workflowHint: '일반 학기는 특기할 근거가 있는 학생만 "기록 대상"으로 두고 생성합니다. 자유학기는 모든 학생을 기록합니다. 과목별 세특 500자(1,500바이트) 이내.',
    emphasizeActivityNote: true,
  },
  high: {
    level: 'high',
    label: '고등학교',
    maxBytes: 1500,
    defaultStudentCount: 5,
    workflowHint: '과목(분반) 수강 명단 기준으로 모든 학생의 과목별 세특을 작성합니다. 학생별 활동·탐구 메모가 있을수록 구체적인 초안이 나옵니다. 500자(1,500바이트) 이내.',
    emphasizeActivityNote: true,
  },
};

export const SCHOOL_LEVELS: SchoolLevel[] = ['elementary', 'middle', 'high'];

/** 학교알리미 학교 종류/학교명/파일명에서 학교급을 추정한다. 모르면 null(조용히 초등으로 대체하지 않는다). */
export function inferSchoolLevel(...hints: Array<string | undefined>): SchoolLevel | null {
  const text = hints.filter(Boolean).join(' ');
  if (/고등학교|고교|(^|[^가-힣])고(\d|[1-3]학년)/.test(text)) return 'high';
  if (/중학교|(^|[^가-힣])중(\d|[1-3]학년)/.test(text)) return 'middle';
  if (/초등학교|초등/.test(text)) return 'elementary';
  return null;
}

/** NEIS 입력 기준 바이트: 한글 등 비 ASCII 3바이트, 영문·숫자·공백 1바이트, 줄바꿈 1바이트. */
export function neisBytes(text: string): number {
  let bytes = 0;
  for (const ch of text.replace(/\r\n/g, '\n')) {
    bytes += (ch.codePointAt(0) ?? 0) <= 0x7f ? 1 : 3;
  }
  return bytes;
}

/** 해당 학교급·학기 유형에서 학생이 기본적으로 기록 대상인지. */
export function defaultIncluded(level: SchoolLevel, middleMode: MiddleSemesterMode): boolean {
  return !(level === 'middle' && middleMode === 'general');
}

/** 교사가 고르는 평어 분량 기본 선택지(공백 포함 글자 수). */
export const LENGTH_PRESETS = [200, 300, 400, 500];
export const DEFAULT_TARGET_CHARS = 300;
const MIN_TARGET_CHARS = 100;
/** 학교급별 최대 목표 분량: 중·고는 NEIS 1,500바이트(한글 약 500자), 초등은 학교 규정이 다양해 넉넉히. */
const MAX_TARGET_CHARS: Record<SchoolLevel, number> = { elementary: 700, middle: 500, high: 500 };

export function maxTargetChars(level: SchoolLevel): number {
  return MAX_TARGET_CHARS[level];
}

export function clampTargetChars(level: SchoolLevel, value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TARGET_CHARS;
  return Math.min(MAX_TARGET_CHARS[level], Math.max(MIN_TARGET_CHARS, n));
}

/** 목표 분량 → 허용 범위(목표의 85%~110%, 학교급 상한 이내). */
export function lengthRange(level: SchoolLevel, target: number): { min: number; max: number } {
  const t = clampTargetChars(level, target);
  return { min: Math.round(t * 0.85), max: Math.min(MAX_TARGET_CHARS[level], Math.round(t * 1.1)) };
}
