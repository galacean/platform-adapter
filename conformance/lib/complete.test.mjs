import { describe, it, expect } from "vitest";
import { incompleteRun } from "./complete.mjs";

const result = (id) => ({ id, status: "pass" });

describe("incompleteRun", () => {
  it("accepts one result per announced case", () => {
    expect(incompleteRun(["a", "b"], [result("b"), result("a")])).toBeUndefined();
  });

  it("reports a case without a result", () => {
    expect(incompleteRun(["a", "b"], [result("a")])).toContain("没有结果：b");
  });

  it("reports a case with two results", () => {
    expect(incompleteRun(["a"], [result("a"), result("a")])).toContain("结果多于一条：a");
  });

  it("reports a result nobody announced", () => {
    expect(incompleteRun(["a"], [result("a"), result("x")])).toContain("不在清单里的结果：x");
  });

  it("reports a case id that two cases share", () => {
    expect(incompleteRun(["a", "a"], [result("a"), result("a")])).toContain("用例编号重复：a");
  });

  it("reports a game that announced nothing", () => {
    expect(incompleteRun(undefined, [])).toContain("没有上报用例清单");
  });
});
