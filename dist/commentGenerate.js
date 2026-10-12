import { RECORD_POLICIES, clampTargetChars, lengthRange } from './recordPolicy.js';
const MAX_STANDARDS = 8;
const MAX_FIELD_CHARS = 600;
const ACHIEVEMENT_LEVELS = ['상', '중', '하', '노력 요함'];
export function validateCommentRequest(body) {
    const level = body.schoolLevel;
    if (level !== 'elementary' && level !== 'middle' && level !== 'high')
        throw new Error('학교급을 선택해주세요.');
    const standards = Array.isArray(body.standards) ? body.standards : [];
    if (standards.length === 0)
        throw new Error('성취기준을 1개 이상 선택해주세요.');
    if (standards.length > MAX_STANDARDS)
        throw new Error(`성취기준은 학생당 최대 ${MAX_STANDARDS}개까지 선택할 수 있습니다.`);
    const cut = (value) => String(value ?? '').trim().slice(0, MAX_FIELD_CHARS);
    const cleaned = standards.map((s) => ({
        text: cut(s.text),
        achievementLevel: cut(s.achievementLevel),
        attitude: cut(s.attitude),
        generationFocus: cut(s.generationFocus),
        additionalInfo: cut(s.additionalInfo),
    }));
    if (cleaned.some((s) => !s.text))
        throw new Error('성취기준 내용이 비어 있습니다.');
    if (cleaned.some((s) => !ACHIEVEMENT_LEVELS.includes(s.achievementLevel))) {
        throw new Error('모든 성취기준의 성취 수준을 선택해주세요.');
    }
    return {
        schoolLevel: level,
        middleMode: body.middleMode === 'free' ? 'free' : 'general',
        subject: cut(body.subject),
        standards: cleaned,
        activityNote: cut(body.activityNote),
        targetChars: clampTargetChars(level, body.targetChars),
    };
}
const COMMON_RULES = `- 입력에 있는 근거만 씁니다. 입력에 없는 활동·발표·역할·태도·성장·수상·진로는 절대 지어내지 않습니다.
- '태도'가 비어 있으면 태도·참여·성실성 표현을 쓰지 않습니다.
- 학생 이름, 성적·점수·석차·등급, 사교육·교외 활동, 부모 정보는 쓰지 않습니다.
- 문장은 '~함', '~임', '~음', '~보임', '~할 수 있음' 같은 명사형으로 끝냅니다.
- 한 문단으로 쓰고 줄바꿈·글머리표·따옴표를 쓰지 않습니다.
- 부족한 점은 부정적으로 단정하지 않고 발전 가능성으로 씁니다. 성취 수준 '하'·'노력 요함'이거나 태도가 '미흡함'이면 '현재 할 수 있는 것 → 보완하면 좋을 점 → 꾸준히 연습하면 더 성장할 것으로 기대됨' 순서로 씁니다.
- '못함', '부족함', '소극적임', '미흡함' 같은 부정 단정 표현은 쓰지 않고 '~하면 더 나아질 것으로 기대됨', '~을 키워 가는 중임'처럼 바꿔 씁니다.
- 결과 문장만 출력합니다.`;
function lengthRule(request) {
    const { min, max } = lengthRange(request.schoolLevel, request.targetChars);
    return `공백 포함 ${min}자 이상 ${max}자 이하(목표 약 ${request.targetChars}자)로 씁니다. 분량이 모자라면 입력에 없는 활동을 지어내지 말고, 성취기준의 개념·방법·적용을 더 구체적으로 풀어 씁니다.`;
}
function levelRules(request) {
    const LENGTH_RULE = lengthRule(request);
    switch (request.schoolLevel) {
        case 'elementary':
            return `초등학교 교과학습발달상황 평어입니다.
- 선택한 성취기준마다 2~3문장으로, 성취기준의 핵심 내용을 학생이 무엇을 이해하고 어떤 방법으로 할 수 있는지 구체적으로 풀어 씁니다.
- 쉬운 우리말로, 성취 수준에 맞는 도달 정도를 드러냅니다.
- ${LENGTH_RULE}
- 예시: 생활 주변에서 삼각형, 사각형, 원 모양을 찾아 특징을 설명함. 받아올림이 있는 두 자리 수의 덧셈 방법을 익혀 문제를 바르게 해결함.`;
        case 'middle':
            return `중학교 ${request.middleMode === 'free' ? '자유학기' : '일반 학기'} 과목별 세부능력 및 특기사항입니다.
- ${request.middleMode === 'free'
                ? '자유학기는 성취도 대신 수업 참여 과정과 성장 중심으로 서술합니다.'
                : '특기할 만한 학습 과정·결과를 성취기준과 연결해 구체적으로 서술합니다.'}
- 활동 메모가 있으면 그 활동을 중심 사례로 삼아 무엇을 했고 무엇을 할 수 있게 되었는지 씁니다.
- ${LENGTH_RULE}`;
        case 'high':
            return `고등학교 과목별 세부능력 및 특기사항입니다.
- 활동 메모(탐구·수행평가·발표 등)가 있으면 그것을 중심 사례로, 성취기준과 연결해 탐구 과정 → 사용한 개념·방법 → 드러난 역량 순으로 구체적으로 씁니다.
- 활동 메모가 없으면 성취기준 도달 정도를 개념·방법 수준까지 구체적으로 서술하되 구체적 활동을 만들어내지 않습니다.
- ${LENGTH_RULE}`;
    }
}
function buildUserPrompt(request) {
    const standards = request.standards.map((s, i) => [
        `성취기준 ${i + 1}: ${s.text}`,
        `- 성취 수준: ${s.achievementLevel}`,
        `- 태도: ${s.attitude || '(입력 없음)'}`,
        `- 생성 중심: ${s.generationFocus || '성취 수준 중심'}`,
        `- 교사 메모: ${s.additionalInfo || '(없음)'}`,
    ].join('\n')).join('\n\n');
    return `과목: ${request.subject || '(미지정)'}
학생 활동 메모: ${request.activityNote || '(없음)'}

${standards}`;
}
export function buildCommentMessages(request) {
    const policy = RECORD_POLICIES[request.schoolLevel];
    const system = `당신은 한국 ${policy.label} 교사의 생활기록부 교과 기록 초안 작성을 돕습니다. 초안은 교사가 검토·수정합니다.\n\n${levelRules(request)}\n\n공통 규칙:\n${COMMON_RULES}`;
    const user = buildUserPrompt(request);
    return { system, user };
}
