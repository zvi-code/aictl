import{m as e}from"./index-0APVtqay.js";import{I as i}from"./Icon-1my9WQDm.js";import{i as n}from"./platform-F0jTv3XI.js";function s(){return`Set capture = "full" under [storage] in ${n()?"%APPDATA%\\aictl\\config.toml":"~/.config/aictl/config.toml"}. It applies to new sessions.`}function c(t){return(t==null?void 0:t.content_retained)===!1}function o(t){return t&&t!=="full"?`Text not retained: capture=${t}`:t==="full"?"Text not retained for this session":"Text not retained: capture mode is not full"}function f({mode:t}){return e`<div class="panel-state panel-state--withheld" role="status">
    <${i} name="file-text" size="14"/>
    <div>
      <div class="panel-state__title">${o(t)}</div>
      <div class="panel-state__hint">Prompts and replies for this session were not stored. Counts, timing, models and tool calls are still shown.</div>
      <code class="panel-state__fix">${s()}</code>
    </div>
  </div>`}export{f as T,s as c,c as t};
