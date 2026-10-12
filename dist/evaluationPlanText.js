import { downloadEvaluationFile, listEvaluationDocuments, SchoolInfoError } from './schoolinfo.js';
import { documentToText } from './documentText.js';
export async function fetchEvaluationPlanText(input) {
    const { documents, downloadParams, year } = await listEvaluationDocuments(input.school, input.year, input.semester);
    const selected = input.fileSeq
        ? documents.find((document) => document.seq === input.fileSeq)
        : documents[0];
    if (!selected) {
        throw new SchoolInfoError('선택한 평가계획 문서를 찾을 수 없습니다.', 404);
    }
    const { buffer, filename } = await downloadEvaluationFile(downloadParams, selected.seq);
    const doc = await documentToText(buffer);
    return {
        text: doc.text,
        needsOcr: doc.needsOcr,
        source: {
            type: 'schoolinfo',
            schoolName: input.school.name,
            schoolCode: input.school.schoolCode,
            shlIdfCd: input.school.shlIdfCd,
            sido: input.school.sido,
            sgg: input.school.sgg,
            kind: input.school.kind,
            address: input.school.address,
            year,
            semester: input.semester,
            documentTitle: selected.title,
            fileName: filename || selected.filename,
            fileSeq: selected.seq,
            fileType: doc.fileType,
            needsOcr: doc.needsOcr,
            warnings: doc.warnings,
        },
    };
}
