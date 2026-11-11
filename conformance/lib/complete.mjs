// Whether a finished run reported every case it announced.

/**
 * @param ids the case ids the game announced when it started
 * @param results the results the game reported
 * @returns what is wrong, or undefined when every announced case has exactly one result
 */
export function incompleteRun(ids, results) {
  if (!Array.isArray(ids)) return "游戏没有上报用例清单，无法确认结果是否完整";
  const count = new Map();
  for (const { id } of results) count.set(id, (count.get(id) ?? 0) + 1);
  const problems = [];
  const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicated.length) problems.push(`用例编号重复：${[...new Set(duplicated)].join(", ")}`);
  const missing = ids.filter((id) => !count.has(id));
  if (missing.length) problems.push(`没有结果：${missing.join(", ")}`);
  const repeated = [...count].filter(([id, n]) => n > ids.filter((other) => other === id).length).map(([id]) => id);
  if (repeated.length) problems.push(`结果多于一条：${repeated.join(", ")}`);
  const unknown = [...count.keys()].filter((id) => !ids.includes(id));
  if (unknown.length) problems.push(`不在清单里的结果：${unknown.join(", ")}`);
  return problems.length ? problems.join("；") : undefined;
}
