import { createMemo, For, Show } from 'solid-js'
import { Dynamic, type JSX } from '@solidjs/web'
import { CodeView } from './CodeView'
import { parseMarkdown, type Block, type Inline } from './markdownModel'
import styles from './Markdown.module.css'

function inlineNode(node: Inline): JSX.Element {
  if (typeof node === 'string') return node
  if (node.tag === 'br') return <br />
  if (node.tag === 'image') return <span class={styles.image}>{`image: ${node.label} (${node.url})`}</span>
  if (node.tag === 'a') return <a href={node.href} target="_blank" rel="noopener noreferrer"><For each={node.children}>{inlineNode}</For></a>
  return <Dynamic component={node.tag}><For each={node.children}>{inlineNode}</For></Dynamic>
}

const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
function blockNode(node: Block, headingOffset: number): JSX.Element {
  switch (node.type) {
    case 'p': return <p><For each={node.text}>{inlineNode}</For></p>
    case 'heading': return <Dynamic component={headings[Math.min(5, (node.level ?? 1) - 1 + headingOffset)]}>
      <For each={node.text}>{inlineNode}</For>
    </Dynamic>
    case 'hr': return <hr />
    case 'code': return <CodeView text={node.text} language={node.language} />
    case 'quote': return <blockquote><For each={node.blocks}>{block => blockNode(block, headingOffset)}</For></blockquote>
    case 'list': return <Dynamic component={node.ordered ? 'ol' : 'ul'}>
      <For each={node.items}>{item => <li>
        {item.task !== undefined && <span class={styles.task} role="img" aria-label={item.task ? 'Done' : 'Not done'}>{item.task ? '☑' : '☐'}</span>}
        <For each={item.blocks}>{block => blockNode(block, headingOffset)}</For>
      </li>}</For>
    </Dynamic>
    case 'table': return <div class={styles.scroll} role="region" aria-label="Markdown table" tabindex={0}><table>
      <thead><tr><For each={node.head}>{(cell, index) =>
        <th scope="col" style={{ 'text-align': node.align[index()] }}><For each={cell}>{inlineNode}</For></th>
      }</For></tr></thead>
      <tbody><For each={node.rows}>{row => <tr><For each={row}>{(cell, index) =>
        <td style={{ 'text-align': node.align[index()] }}><For each={cell}>{inlineNode}</For></td>
      }</For></tr>}</For></tbody>
    </table></div>
  }
}

export function Markdown(props: { text?: string | null; headingOffset?: 0 | 1 | 2 | 3 | 4 | 5 }) {
  const doc = createMemo(() => parseMarkdown(props.text))
  return <div class={styles.markdown}>
    <Show when={doc().front.length}>
      <div class={styles.scroll} role="region" aria-label="Front matter" tabindex={0}><table>
        <caption>Front matter</caption>
        <tbody><For each={doc().front}>{([name, value]) => <tr><th scope="row">{name}</th><td>{value}</td></tr>}</For></tbody>
      </table></div>
    </Show>
    <For each={doc().blocks}>{block => <>{blockNode(block, props.headingOffset ?? 0)}</>}</For>
  </div>
}
