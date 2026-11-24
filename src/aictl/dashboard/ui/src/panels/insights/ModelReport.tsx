import { For, Show, untrack } from 'solid-js'
import { fmtN, fmtNum, fmtRate, fmtUsdEach } from '../../design/format'
import type { Field } from '../../ui/tableModel'
import type { PanelContext } from '../types'
import { BarGrid } from './charts/BarGrid'
import { ColourBy, colourByState } from './charts/ColourBy'
import { Scatter } from './charts/Scatter'
import { InsightCard, numberField, textField, type CardProps } from './InsightCard'
import { money, NOT_REPORTED, plural, toolLabel, type Label } from './insightsModel'
import {
  datesText, modelColumns, modelGridRows, MODELS_LINE, modelsSplit, notReportedText, perRequest, scatterPoints, thoughtText,
  TOKEN_FILLS, tokensEach, type ModelBody, type ModelFigures, type ModelTool, type TokenPart,
} from './modelReportModel'
import { RepoLegend } from './RepoLegend'
import { hasOther } from './repoSplit'
import styles from './ModelReport.module.css'
import shared from './Insights.module.css'

/** Copilot sessions read only from the session store, and other calls the card counts per tool but gives to no model. */
function toolFooter(tool: ModelTool) {
  const parts = [
    tool.no_model ? `${plural(tool.no_model, 'request')} with no model` : '',
    tool.store_calls ? `${plural(tool.store_calls, 'call')} in ${plural(tool.store_sessions ?? 0, 'session')} read from the ` +
      'session store: shell commands only, not attributed' : '',
    tool.unsplit_calls ? `${plural(tool.unsplit_calls, 'call')} in ${plural(tool.unsplit_sessions ?? 0, 'session')} whose ` +
      'subagent calls carry no agent: not attributed' : '',
    tool.unattributed ? `${plural(tool.unattributed, 'call')} with no request or no model before them` : '',
    tool.call_only_sessions ? `${plural(tool.call_only_sessions, 'session')} with calls and no request` : '',
  ]
  return parts.filter(Boolean).join(' · ')
}

/** The colours of the token kinds, shown while the bars are coloured by token kind. */
const TOKEN_LEGEND: [TokenPart['id'], string][] = [['input', 'Input not from cache'], ['write', 'Cache write'], ['read', 'Cache read'],
  ['prompt', 'Whole prompt (no cache split)'], ['output', 'Output']]

/** Per tool: a grid of its models' measures (each column on its own linear scale from 0, every value written) and,
 * beside it, a scatter of cost per priced request against failure share. One switch colours the bars by token kind or
 * by repository; one legend at a time. */
function ModelCharts(props: { body: ModelBody; label: Label; ctx: PanelContext }) {
  const [mode, setMode] = colourByState(untrack(() => props.ctx))
  const split = () => modelsSplit(props.body)
  const shown = () => split() ? mode() : 'own'
  const models = () => props.body.tools.flatMap(tool => tool.models)
  return <div class={styles.view}>
    <div class={styles.controls}>
      <Show when={split()}><ColourBy own="Token kind" value={mode()} onChange={setMode} /></Show>
      <Show when={shown() === 'repo'} fallback={<ul class={shared.legend} aria-label="Token kinds: colours of the token bars" data-token-legend>
        <For each={TOKEN_LEGEND}>{([id, text]) => <li><span class={shared.swatch} style={{ background: TOKEN_FILLS[id] }} />{text}</li>}</For>
      </ul>}>
        <RepoLegend split={props.body} other={hasOther(models())} />
      </Show>
    </div>
    <For each={props.body.tools.filter(tool => tool.models.length)}>{tool => {
      const name = () => props.label(tool.tool)
      return <section class={styles.tool} data-tool={tool.tool}>
        <h3>{name()}<small>{plural(tool.requests, 'request')}{tool.sessions == null ? '' : ` · ${plural(tool.sessions, 'session')}`}
          {' '}· {plural(tool.models.length, 'model')} compared</small></h3>
        <div class={styles.charts}>
          <div class={styles.grid}>
            <BarGrid name={`models-${tool.tool}`} label={`${name()}: requests, cost, failure share, tokens and thinking per model`}
              head="Model" columns={modelColumns(tool)} rows={modelGridRows(tool, name(), shown(), props.body.repo_order)} />
          </div>
          <Show when={scatterPoints(tool, name()).length >= 2}>
            <div class={styles.scatter}>
              <Scatter name={`models-${tool.tool}`} title="Cost per priced request against failure share"
                x={{ label: 'cost per priced request, $ at list price', format: fmtUsdEach }}
                y={{ label: 'tool calls marked failed', format: fmtRate }} points={scatterPoints(tool, name())}
                note="One dot per model with both figures; hollow: the failure share is a floor." />
            </div>
          </Show>
        </div>
        <Show when={toolFooter(tool)}>{text => <p class={styles.footer} data-footer>{text()}</p>}</Show>
      </section>
    }}</For>
    <Show when={notReportedText(props.body, props.label)}>{text => <p class={shared.note} data-not-reported>Not reported: {text()}.</p>}</Show>
  </div>
}

type Row = Record<string, unknown>

const tokenCell = (id: string, label: string): Field<Row> => ({
  id, label, numeric: true,
  read: row => typeof row[id] === 'number' || typeof row[id] === 'string' ? row[id] as number | string
    : row.split === false ? 'cache split not reported' : undefined,
  format: value => typeof value === 'number' ? fmtN(value) : String(value),
})

function figureRow(id: string, kind: string, tool: string, name: string, row: ModelFigures, extra: Row): Row {
  return {
    id, kind, tool, model: name, dates: datesText(row), requests: row.requests, sessions: row.sessions, priced: row.priced,
    cost: row.cost_per_request ?? undefined, split: row.cache_reported > 0,
    input: row.input_per_request ?? undefined,
    // Copilot in VS Code splits the cached prompt but never reports cache writes: not reported, never 0.
    write: row.cache_write_per_request ?? (row.cache_reported > 0 && !row.cache_write_reported ? NOT_REPORTED : undefined),
    read: row.cache_read_per_request ?? undefined, output: row.output_per_request ?? undefined,
    prompt: row.unsplit_prompt_per_request ?? undefined,
    calls: row.calls ?? undefined, failures: row.failures ?? undefined,
    rate: row.failure_share == null ? undefined : `${row.at_least ? 'at least ' : ''}${fmtRate(row.failure_share)}`,
    refused: row.refused ?? undefined, unknown: row.exit_unknown ?? undefined,
    thought: thoughtText(row) || NOT_REPORTED, ...extra,
  }
}

function tableRows(body: ModelBody, label: Label): Row[] {
  return body.tools.flatMap(tool => [
    ...tool.models.flatMap(model => [
      figureRow(`${tool.tool}:${model.model}`, 'model', label(tool.tool), model.model, model, {
        with_calls: model.calls == null ? 'calls not recorded' : `${fmtNum(model.call_sessions)} / ${fmtNum(model.recorded_sessions)}`,
        failing: model.failing.map(item => `${item.tool_name} ${fmtNum(item.failures)}`).join(', '),
        efforts: model.efforts.map(effort => effort.effort).join(', '),
      }),
      ...model.efforts.map(effort => figureRow(`${tool.tool}:${model.model}:${effort.effort}`, 'effort', label(tool.tool),
        `${model.model} · ${effort.effort}`, effort, { with_calls: '', failing: '', efforts: '' })),
    ]),
    {
      id: `${tool.tool}:total`, kind: 'tool total', tool: label(tool.tool), model: '', requests: tool.requests,
      sessions: tool.sessions, priced: tool.priced, calls: tool.calls ?? undefined, failures: tool.failures ?? undefined,
      refused: tool.refused ?? undefined, unknown: tool.exit_unknown ?? undefined, failing: toolFooter(tool),
    },
  ])
}

export default function ModelReport(props: CardProps) {
  const ctx = untrack(() => props.ctx)
  const label: Label = tool => ctx.board('tool_labels')?.[tool] ?? toolLabel(tool)
  return <InsightCard<ModelBody> {...props} card="models" tab="flow"
    finding={body => body.tools.some(tool => tool.requests) ? MODELS_LINE : 'No model request in this period.'}
    visual={body => <ModelCharts body={body} label={label} ctx={ctx} />}
    note={'Requests count in the period their time falls in; each tool call is attributed to the request just before it in ' +
      'the same session and agent (it agrees with Claude Code\'s stored link and Copilot\'s turn model in almost every case; in ' +
      'Copilot in VS Code a chat-title model can take a few calls). Model names are ' +
      'folded: lower case, no provider prefix, no date or context suffix, Claude version dots as dashes; in Copilot in VS Code ' +
      'a picker suffix on a Claude name is its effort. Cost is list price at ingest, not a bill; a request with no known price, ' +
      'including a VS Code request without the cached-prompt split and a cost stored as 0, is left out and shown as not priced. ' +
      'Copilot in VS Code does not report cache writes, so its cost prices them as plain input and is a lower bound, and its ' +
      'cache write per request is not reported. ' +
      'Tokens per request are averaged over the requests that report the cache split; otherwise the whole prompt per request ' +
      'is shown. A per-request figure needs 20 requests; a failure share needs 100 calls in 3 sessions. Failed means marked ' +
      'failed by the tool, which includes commands that ran and exited non-zero (a failing test, a search that found nothing) ' +
      'and changes between tool versions; refused calls are counted apart. Copilot shell commands without an exit code (Copilot ' +
      'CLI and the Copilot app before November 2026; VS Code\'s terminal unless its output names the code, and on Windows ' +
      'PowerShell without shell integration may report none) count as failed only when the tool said so, so their shares are ' +
      'lower bounds, written "at least" when 5% or more of the calls are such commands. VS Code\'s Claude-style Bash tool ' +
      'records no exit code. Copilot sessions read only from the session store record shell commands only: they are counted ' +
      'per tool and left out of the shares, and a model shows in how many of its sessions calls were recorded. Thinking time ' +
      'comes only from Claude Code, reasoning tokens only from Copilot CLI and the Copilot app, effort only where recorded; ' +
      'Codex CLI records no model. Sessions are estimated. Helper models (a title or summary model) appear as models and are ' +
      'tagged when they make 2 or fewer requests per session and no tool call. Each model got its own tasks, tools, tool ' +
      'versions and period: this is a description of the work recorded here, not a controlled comparison. ' +
      'Each column of a tool\'s grid has its own linear scale from 0 to its largest value. Coloured by repository, a bar\'s ' +
      'segments are the repositories\' parts (the 8 with the highest list-price cost in rank order, every other one grey): ' +
      'requests are counted; a per-request figure or the failure share is the repository\'s sum divided by the model\'s whole ' +
      'count, so the segments add up to the bar. The thinking-time median and the figures per effort are not split. The ' +
      'scatter draws each model that has both a cost per priced request and a failure share; a hollow dot is a floor.'}
    table={{
      label: 'Model report by tool and model',
      rows: body => tableRows(body, label),
      fields: [textField('tool', 'Tool'), textField('kind', 'Row'), textField('model', 'Model'), textField('dates', 'Dates used'),
        numberField('requests', 'Requests', fmtNum), numberField('sessions', 'Sessions', fmtNum), numberField('priced', 'Priced', fmtNum),
        numberField('cost', '$ per priced request', value => perRequest(value)),
        tokenCell('input', 'Input not from cache per request'), tokenCell('write', 'Cache write per request'),
        tokenCell('read', 'Cache read per request'), numberField('output', 'Output per request', value => tokensEach(value)),
        numberField('prompt', 'Whole prompt per request (no cache split)', value => tokensEach(value)),
        numberField('calls', 'Calls', fmtNum), numberField('failures', 'Failed', fmtNum), textField('rate', 'Failure share'),
        numberField('refused', 'Refused', fmtNum), numberField('unknown', 'Exit unknown', fmtNum),
        textField('with_calls', 'Sessions with calls / recorded'), textField('failing', 'Most failing tool names; tool notes'),
        textField('thought', 'Median thinking or reasoning tokens per request'), textField('efforts', 'Efforts')],
    }}
    sessionFields={[textField('tool', 'Tool', row => label(String(row.tool ?? ''))),
      textField('model', 'Main model', row => String(row.model ?? NOT_REPORTED)),
      numberField('models', 'Models', fmtNum), numberField('requests', 'Requests', fmtNum),
      numberField('calls', 'Calls', fmtNum), numberField('failures', 'Failed calls', fmtNum),
      numberField('refused', 'Refused calls', fmtNum),
      { id: 'cost_usd', label: 'Cost (list price)', numeric: true,
        read: row => typeof row.cost_usd === 'number' ? row.cost_usd : 'not priced',
        format: value => typeof value === 'number' ? money(value) : String(value) }]} />
}
