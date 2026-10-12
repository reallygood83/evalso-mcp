export function matchesStandardInPlan(plan: string, id: string, text: string): boolean {
  const index = plan.indexOf(id);
  if (index < 0) return false;
  const fragment = plan.slice(index + id.length, index + id.length + 1200);
  const cellEnd = fragment.indexOf('</td>');
  const cell = cellEnd >= 0 ? fragment.slice(0, cellEnd) : fragment.split(/\n\s*\n/)[0];
  const nextCode = cell.search(/\[[0-9]+[가-힣A-Za-z][^\]]{2,20}\]/);
  const standard = nextCode >= 0 ? cell.slice(0, nextCode) : cell;
  const compact = (value: string) => value.replace(/<[^>]*>/g, '').replace(/\s/g, '');
  return compact(standard) === compact(text);
}
