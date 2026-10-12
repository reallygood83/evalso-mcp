import iconv from 'iconv-lite';
const BASE = 'https://www.schoolinfo.go.kr';
const NAME_SEARCH_URL = `${BASE}/ei/ss/pneiss_a04_s0/getSchoolList.do`;
const DISCLOSURE_URL = `${BASE}/ei/ss/pneiss_a03_s0.do`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const FETCH_TIMEOUT_MS = 20_000;
const MAX_SEARCH_BYTES = 4_000_000;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['hwp', 'hwpx', 'hwpml', 'pdf', 'docx']);
const EVAL_ITEM = {
    GS_HANGMOK_CD: '43',
    GS_HANGMOK_NO: '4-가',
    GS_HANGMOK_NM: '교과별(학년별) 교수ㆍ학습 및 평가계획에 관한 사항',
    GS_BURYU_CD: 'JG110',
    JG_BURYU_CD: 'JG040',
    JG_HANGMOK_CD: '14',
    JG_GUBUN: '1',
};
export class SchoolInfoError extends Error {
    status;
    details;
    constructor(message, status = 500, details) {
        super(message);
        this.name = 'SchoolInfoError';
        this.status = status;
        this.details = details;
    }
}
export async function readJsonBody(req) {
    if (typeof req.body === 'string') {
        return JSON.parse(req.body);
    }
    return (req.body ?? {});
}
export function sendError(res, error) {
    if (error instanceof SchoolInfoError) {
        res.status(error.status).json({ error: error.message, details: error.details });
        return;
    }
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    res.status(500).json({ error: message });
}
export async function searchSchoolsByName(query, limit = 30) {
    const word = query.trim().slice(0, 40);
    if (word.length < 2)
        return [];
    const response = await fetchWithTimeout(NAME_SEARCH_URL, {
        method: 'POST',
        headers: {
            'User-Agent': USER_AGENT,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Referer: DISCLOSURE_URL,
        },
        body: new URLSearchParams({ SEARCH_WORD: word }),
    }, FETCH_TIMEOUT_MS);
    if (!response.ok) {
        throw new SchoolInfoError(`학교명 검색 실패: HTTP ${response.status}`, 502);
    }
    const buffer = await limitedArrayBuffer(response, MAX_SEARCH_BYTES, '학교명 검색 응답이 너무 큽니다.');
    let rows;
    try {
        rows = JSON.parse(Buffer.from(buffer).toString('utf-8'));
    }
    catch {
        throw new SchoolInfoError('학교명 검색 응답을 해석할 수 없습니다.', 502);
    }
    if (!Array.isArray(rows))
        return [];
    return rows
        .filter((row) => row?.SHL_NM && row?.SHL_IDF_CD)
        .slice(0, Math.min(Math.max(limit, 1), 30))
        .map((row) => {
        const name = String(row.SHL_NM);
        const sido = String(row.USER_DFN_CODE_VALUE_01 ?? row.LCTN_NM ?? '');
        const sgg = String(row.USER_DFN_CODE_VALUE_02 ?? '') || sido;
        const kind = resolveSchoolKind(row, name);
        const shlIdfCd = String(row.SHL_IDF_CD);
        return {
            id: shlIdfCd,
            name,
            shlIdfCd,
            schoolCode: String(row.SHL_CD ?? ''),
            sido,
            sgg,
            kind,
            foundation: String(row.FOND_SC_NM ?? ''),
            address: String(row.FULL_ADDR ?? ''),
        };
    })
        .filter((school) => school.sido);
}
export async function listEvaluationDocuments(school, requestedYear, semester) {
    assertSchoolForEvaluation(school);
    const thisYear = new Date().getFullYear();
    const candidates = requestedYear ? [requestedYear] : [thisYear, thisYear - 1];
    for (const year of candidates) {
        let { files, downloadParams, rounds } = await fetchEvaluationFiles(school, year);
        if (files.length && semester !== undefined) {
            const ofYear = rounds.filter((round) => round.year === year).sort((a, b) => a.chasu - b.chasu);
            const target = semester === 1 ? ofYear[0] : ofYear.length > 1 ? ofYear[ofYear.length - 1] : undefined;
            if (!target) {
                throw new SchoolInfoError(`${year}년 ${semester}학기 평가계획 제출 회차를 확인할 수 없습니다.`, 404);
            }
            if (downloadParams.JG_CHASU !== String(target.chasu)) {
                ({ files, downloadParams, rounds } = await fetchEvaluationFiles(school, year, target.chasu));
            }
            downloadParams.JG_CHASU = String(target.chasu);
        }
        const documents = files
            .filter((file) => isAllowedDocument(file.filename))
            .sort((a, b) => evaluationFileScore(a.filename) - evaluationFileScore(b.filename))
            .map((file) => toEvaluationPlanDocument(file));
        if (documents.length > 0) {
            return { documents, downloadParams, year };
        }
    }
    throw new SchoolInfoError(`${candidates.join(', ')}년도 평가계획 첨부파일을 찾지 못했습니다.`, 404);
}
async function fetchEvaluationFiles(school, year, chasu) {
    const body = new URLSearchParams({
        ...EVAL_ITEM,
        HG_NM: school.name,
        SHL_IDF_CD: school.shlIdfCd,
        GS_TYPE: 'Y',
        JG_YEAR: String(year),
        SORT: 'BR',
        CHOSEN_JG_YEAR: String(year),
        PRE_JG_YEAR: String(year),
        LOAD_TYPE: 'single',
    });
    if (chasu !== undefined)
        body.set('JG_CHASU', String(chasu));
    const response = await fetchWithTimeout(`${BASE}/ei/pp/Pneipp_b43_s0p.do`, {
        method: 'POST',
        headers: {
            'User-Agent': USER_AGENT,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: `${BASE}/ei/ss/Pneiss_b01_s0.do`,
        },
        body,
    });
    if (!response.ok) {
        throw new SchoolInfoError(`평가계획 항목 조회 실패: HTTP ${response.status}`, 502);
    }
    const buffer = await limitedArrayBuffer(response, MAX_DOWNLOAD_BYTES, '평가계획 목록 응답이 너무 큽니다.');
    const html = iconv.decode(Buffer.from(buffer), 'euc-kr');
    const downloadParams = parseDownloadParams(html, school.shlIdfCd, year);
    if (chasu !== undefined)
        downloadParams.JG_CHASU = String(chasu);
    return { files: parseFileList(html), downloadParams, rounds: parseSubmissionRounds(html) };
}
function parseSubmissionRounds(html) {
    const select = html.match(/<select\b[^>]*\bid=["']select_trans_dt["'][^>]*>([\s\S]*?)<\/select>/i);
    if (!select)
        return [];
    return [...select[1].matchAll(/<option\b[^>]*\bvalue=["'](\d{4})(\d+)["'][^>]*>/gi)]
        .map((match) => ({ year: Number(match[1]), chasu: Number(match[2]) }));
}
export async function downloadEvaluationFile(downloadParams, seq) {
    if (!/^\d+$/.test(seq)) {
        throw new SchoolInfoError('잘못된 파일 식별자입니다.', 400);
    }
    const query = new URLSearchParams({ ...downloadParams, FILE_SEQ: seq });
    const response = await fetchWithTimeout(`${BASE}/servlets/EiFileDownLoad.do?${query}`, {
        headers: {
            'User-Agent': USER_AGENT,
            Referer: `${BASE}/ei/pp/Pneipp_b43_s0p.do`,
        },
    });
    if (!response.ok) {
        throw new SchoolInfoError(`평가계획 파일 다운로드 실패: HTTP ${response.status}`, 502);
    }
    const buffer = await limitedArrayBuffer(response, MAX_DOWNLOAD_BYTES, '평가계획 파일이 너무 큽니다.');
    return { buffer, filename: readFilename(response.headers.get('content-disposition'), seq) };
}
async function fetchWithTimeout(url, init = {}, timeout = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new SchoolInfoError('학교알리미 응답 시간이 초과되었습니다.', 504);
        }
        throw error;
    }
    finally {
        clearTimeout(timer);
    }
}
async function limitedArrayBuffer(response, maxBytes, tooLargeMessage) {
    const contentLength = Number(response.headers.get('content-length') ?? '0');
    if (contentLength > maxBytes) {
        throw new SchoolInfoError(tooLargeMessage, 413);
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
        throw new SchoolInfoError(tooLargeMessage, 413);
    }
    return buffer;
}
function parseFileList(html) {
    const files = [];
    const seen = new Set();
    const re = /onclick=["'][^"']*getEiFile43\(\s*['"]?(\d+)['"]?\s*\)[^"']*["'][^>]*>\s*([^<]*?\.(?:hwpx|hwp|hwpml|pdf|docx))\s*(?:\(\s*([\d.,]+)\s*([KM]B)\s*\))?/gi;
    let match;
    while ((match = re.exec(html))) {
        if (seen.has(match[1]))
            continue;
        seen.add(match[1]);
        files.push({ seq: match[1], filename: match[2].trim(), sizeKB: toKB(match[3], match[4]) });
    }
    if (files.length > 0)
        return files;
    const seqs = [...html.matchAll(/getEiFile43\(\s*['"]?(\d+)['"]?\s*\)/g)].map((item) => item[1]);
    const names = [...html.matchAll(/([^>\s][^<>]*?\.(?:hwpx|hwp|hwpml|pdf|docx))\s*(?:\(\s*([\d.,]+)\s*([KM]B)\s*\))?/gi)];
    if (seqs.length === names.length) {
        return seqs.map((seq, index) => ({
            seq,
            filename: names[index][1].trim(),
            sizeKB: toKB(names[index][2], names[index][3]),
        }));
    }
    return seqs.map((seq) => ({ seq, filename: `첨부파일_${seq}` }));
}
function parseDownloadParams(html, shlIdfCd, year) {
    const params = {};
    const formIndex = html.indexOf('eiFileDownForm');
    let segment = html;
    if (formIndex >= 0) {
        const formEnd = html.indexOf('</form>', formIndex);
        segment = html.slice(formIndex, formEnd >= 0 ? formEnd : formIndex + 4096);
    }
    const re = /name="([A-Za-z_][A-Za-z0-9_]*)"[^>]*?value="([^"]*)"/g;
    let match;
    while ((match = re.exec(segment))) {
        if (!(match[1] in params) && /^[\w.\-]*$/.test(match[2])) {
            params[match[1]] = match[2];
        }
    }
    params.SHL_IDF_CD ??= shlIdfCd;
    params.JG_BURYU_CD ??= EVAL_ITEM.JG_BURYU_CD;
    params.JG_HANGMOK_CD ??= EVAL_ITEM.JG_HANGMOK_CD;
    params.JG_GUBUN ??= EVAL_ITEM.JG_GUBUN;
    params.JG_YEAR ??= String(year);
    params.JG_CHASU ??= '1';
    params.PRE_JG_YEAR ??= String(year);
    return params;
}
function toEvaluationPlanDocument(file) {
    const extension = extensionOf(file.filename);
    return {
        id: file.seq,
        seq: file.seq,
        filename: file.filename,
        title: file.filename.replace(/\.[^.]+$/, ''),
        extension,
        sizeKB: file.sizeKB,
    };
}
function resolveSchoolKind(row, name) {
    const code = String(row.SCHUL_KIND ?? row.SHL_CRSE_SC_CD ?? '');
    const codeMap = {
        '02': '초등학교',
        '03': '중학교',
        '04': '고등학교',
    };
    if (codeMap[code])
        return codeMap[code];
    if (name.endsWith('초등학교'))
        return '초등학교';
    if (name.endsWith('중학교'))
        return '중학교';
    if (name.endsWith('고등학교'))
        return '고등학교';
    return String(row.SCHUL_CRSE_SC_VALUE_NM ?? '');
}
function assertSchoolForEvaluation(school) {
    if (!school?.name || !school?.shlIdfCd) {
        throw new SchoolInfoError('학교명과 학교고유식별코드가 필요합니다.', 400);
    }
}
function isAllowedDocument(filename) {
    return ALLOWED_EXTENSIONS.has(extensionOf(filename));
}
function extensionOf(filename) {
    return filename.split('.').pop()?.toLowerCase() ?? '';
}
function evaluationFileScore(filename) {
    if (/교수.?학습|평가\s*계획|평가\s*운영|수행평가/.test(filename))
        return 0;
    if (/학업성적관리/.test(filename))
        return 2;
    return 1;
}
function toKB(num, unit) {
    if (!num)
        return undefined;
    const parsed = Number.parseFloat(num.replace(/,/g, ''));
    if (!Number.isFinite(parsed))
        return undefined;
    return /MB/i.test(unit ?? '') ? Math.round(parsed * 1024) : parsed;
}
function readFilename(contentDisposition, seq) {
    const fallback = `evaluation_${seq}`;
    if (!contentDisposition)
        return fallback;
    const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
    if (!match)
        return fallback;
    try {
        return decodeURIComponent(match[1].trim());
    }
    catch {
        return match[1].trim();
    }
}
export function extractEvaluationSections(markdown) {
    const keywords = ['수행평가', '평가기준', '평가요소', '평가방법', '평가영역', '반영비율', '평가시기', '성취기준', '지필', '정기시험'];
    return markdown
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        // 개수 제한 없음: 예전 80블록 제한은 중·고 문서 성취기준의 70~80%를 잘라냈다.
        .filter((block) => block && keywords.some((keyword) => block.includes(keyword)));
}
