// Compare the section entry point, not the table or an individual chart. Panels above
// the anchor can finish mounting after the first scroll, especially on a cold capture.
export async function agentsFrame(page) {
  const section = page.locator('#sec-agents');
  await section.evaluate(node => node.scrollIntoView({ block: 'start' }));
  await section.locator('#p-agentActivity canvas').waitFor();
  await section.locator('#p-agentsT tbody tr[data-row-id]').first().waitFor({ state: 'attached' });
  await section.evaluate(async node => {
    await document.fonts.ready;
    let settled = 0;
    for (let frame = 0; frame < 120; frame++) {
      if (Math.abs(node.getBoundingClientRect().top - parseFloat(getComputedStyle(node).scrollMarginTop)) > 1) {
        node.scrollIntoView({ block: 'start' });
        settled = 0;
      } else if (++settled === 5) return;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    throw new Error('The Agents section did not settle at its anchor.');
  });
}
