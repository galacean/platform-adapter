// Uses Web API globals the way an ordinary browser library would.
export function probe() {
  return {
    innerWidth: window.innerWidth,
    createElement: typeof document.createElement === "function",
    requestAnimationFrame: typeof requestAnimationFrame === "function"
  };
}
