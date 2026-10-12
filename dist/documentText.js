import { parse } from 'kordoc';
import { extractEvaluationSections } from './schoolinfo.js';
const MIN_USEFUL_MARKDOWN_LENGTH = 200;
export function needsOcrFromMarkdown(markdown) {
    const readable = markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/<[^>]*>/g, '').replace(/\s/g, '');
    return readable.length < MIN_USEFUL_MARKDOWN_LENGTH;
}
export async function documentToText(buffer) {
    const parsed = await parse(buffer);
    const markdown = parsed.success ? parsed.markdown ?? '' : '';
    const warnings = parsed.success ? [] : ['문서를 글자로 바꾸지 못했습니다.'];
    const needsOcr = needsOcrFromMarkdown(markdown);
    const sections = extractEvaluationSections(markdown);
    return {
        text: sections.length > 0 ? sections.join('\n\n') : markdown,
        fileType: parsed.fileType ?? 'unknown',
        needsOcr,
        warnings,
    };
}
