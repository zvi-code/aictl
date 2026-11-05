const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/HiddenContextPanel-DEAAqNqF.js","assets/useAsyncResource-rXacruJh.js","assets/TabLive-BHm8A7zC.js","assets/DataTable-B_4TLAy6.js","assets/TabBudget-Dt7MriFm.js","assets/models-DHnW0Za4.js","assets/TabAnalytics-Pni81ow4.js","assets/echarts-BbyLWlSf.js","assets/TabExplorer-DdH_l6XX.js"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&l(i)}).observe(document,{childList:!0,subtree:!0});function n(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function l(s){if(s.ep)return;s.ep=!0;const o=n(s);fetch(s.href,o)}})();var ys,oe,Oa,dn,ji,Ra,Ia,Na,jo,yo,bo,za,as={},cs=[],Gu=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,Hl=Array.isArray;function en(e,t){for(var n in t)e[n]=t[n];return e}function Wo(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function mn(e,t,n){var l,s,o,i={};for(o in t)o=="key"?l=t[o]:o=="ref"?s=t[o]:i[o]=t[o];if(arguments.length>2&&(i.children=arguments.length>3?ys.call(arguments,2):n),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)i[o]===void 0&&(i[o]=e.defaultProps[o]);return os(e,i,l,s,null)}function os(e,t,n,l,s){var o={type:e,props:t,key:n,ref:l,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:s??++Oa,__i:-1,__u:0};return s==null&&oe.vnode!=null&&oe.vnode(o),o}function _n(e){return e.children}function Yt(e,t){this.props=e,this.context=t}function rl(e,t){if(t==null)return e.__?rl(e.__,e.__i+1):null;for(var n;t<e.__k.length;t++)if((n=e.__k[t])!=null&&n.__e!=null)return n.__e;return typeof e.type=="function"?rl(e):null}function Yu(e){if(e.__P&&e.__d){var t=e.__v,n=t.__e,l=[],s=[],o=en({},t);o.__v=t.__v+1,oe.vnode&&oe.vnode(o),qo(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[n]:null,l,n??rl(t),!!(32&t.__u),s),o.__v=t.__v,o.__.__k[o.__i]=o,Ua(l,o,s),t.__e=t.__=null,o.__e!=n&&Va(o)}}function Va(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),Va(e)}function $o(e){(!e.__d&&(e.__d=!0)&&dn.push(e)&&!us.__r++||ji!=oe.debounceRendering)&&((ji=oe.debounceRendering)||Ra)(us)}function us(){try{for(var e,t=1;dn.length;)dn.length>t&&dn.sort(Ia),e=dn.shift(),t=dn.length,Yu(e)}finally{dn.length=us.__r=0}}function Fa(e,t,n,l,s,o,i,r,a,u,p){var d,m,v,w,A,k,M,b=l&&l.__k||cs,x=t.length;for(a=Ju(n,t,b,a,x),d=0;d<x;d++)(v=n.__k[d])!=null&&(m=v.__i!=-1&&b[v.__i]||as,v.__i=d,k=qo(e,v,m,s,o,i,r,a,u,p),w=v.__e,v.ref&&m.ref!=v.ref&&(m.ref&&Ko(m.ref,null,v),p.push(v.ref,v.__c||w,v)),A==null&&w!=null&&(A=w),(M=!!(4&v.__u))||m.__k===v.__k?a=Ha(v,a,e,M):typeof v.type=="function"&&k!==void 0?a=k:w&&(a=w.nextSibling),v.__u&=-7);return n.__e=A,a}function Ju(e,t,n,l,s){var o,i,r,a,u,p=n.length,d=p,m=0;for(e.__k=new Array(s),o=0;o<s;o++)(i=t[o])!=null&&typeof i!="boolean"&&typeof i!="function"?(typeof i=="string"||typeof i=="number"||typeof i=="bigint"||i.constructor==String?i=e.__k[o]=os(null,i,null,null,null):Hl(i)?i=e.__k[o]=os(_n,{children:i},null,null,null):i.constructor===void 0&&i.__b>0?i=e.__k[o]=os(i.type,i.props,i.key,i.ref?i.ref:null,i.__v):e.__k[o]=i,a=o+m,i.__=e,i.__b=e.__b+1,r=null,(u=i.__i=Zu(i,n,a,d))!=-1&&(d--,(r=n[u])&&(r.__u|=2)),r==null||r.__v==null?(u==-1&&(s>p?m--:s<p&&m++),typeof i.type!="function"&&(i.__u|=4)):u!=a&&(u==a-1?m--:u==a+1?m++:(u>a?m--:m++,i.__u|=4))):e.__k[o]=null;if(d)for(o=0;o<p;o++)(r=n[o])!=null&&!(2&r.__u)&&(r.__e==l&&(l=rl(r)),ja(r,r));return l}function Ha(e,t,n,l){var s,o;if(typeof e.type=="function"){for(s=e.__k,o=0;s&&o<s.length;o++)s[o]&&(s[o].__=e,t=Ha(s[o],t,n,l));return t}e.__e!=t&&(l&&(t&&e.type&&!t.parentNode&&(t=rl(e)),n.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function Pl(e,t){return t=t||[],e==null||typeof e=="boolean"||(Hl(e)?e.some(function(n){Pl(n,t)}):t.push(e)),t}function Zu(e,t,n,l){var s,o,i,r=e.key,a=e.type,u=t[n],p=u!=null&&(2&u.__u)==0;if(u===null&&r==null||p&&r==u.key&&a==u.type)return n;if(l>(p?1:0)){for(s=n-1,o=n+1;s>=0||o<t.length;)if((u=t[i=s>=0?s--:o++])!=null&&!(2&u.__u)&&r==u.key&&a==u.type)return i}return-1}function Wi(e,t,n){t[0]=="-"?e.setProperty(t,n??""):e[t]=n==null?"":typeof n!="number"||Gu.test(t)?n:n+"px"}function Ql(e,t,n,l,s){var o,i;e:if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof l=="string"&&(e.style.cssText=l=""),l)for(t in l)n&&t in n||Wi(e.style,t,"");if(n)for(t in n)l&&n[t]==l[t]||Wi(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace(Na,"$1")),i=t.toLowerCase(),t=i in e||t=="onFocusOut"||t=="onFocusIn"?i.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=n,n?l?n.u=l.u:(n.u=jo,e.addEventListener(t,o?bo:yo,o)):e.removeEventListener(t,o?bo:yo,o);else{if(s=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n))}}function qi(e){return function(t){if(this.l){var n=this.l[t.type+e];if(t.t==null)t.t=jo++;else if(t.t<n.u)return;return n(oe.event?oe.event(t):t)}}}function qo(e,t,n,l,s,o,i,r,a,u){var p,d,m,v,w,A,k,M,b,x,C,S,T,L,D,N=t.type;if(t.constructor!==void 0)return null;128&n.__u&&(a=!!(32&n.__u),o=[r=t.__e=n.__e]),(p=oe.__b)&&p(t);e:if(typeof N=="function")try{if(M=t.props,b=N.prototype&&N.prototype.render,x=(p=N.contextType)&&l[p.__c],C=p?x?x.props.value:p.__:l,n.__c?k=(d=t.__c=n.__c).__=d.__E:(b?t.__c=d=new N(M,C):(t.__c=d=new Yt(M,C),d.constructor=N,d.render=Xu),x&&x.sub(d),d.state||(d.state={}),d.__n=l,m=d.__d=!0,d.__h=[],d._sb=[]),b&&d.__s==null&&(d.__s=d.state),b&&N.getDerivedStateFromProps!=null&&(d.__s==d.state&&(d.__s=en({},d.__s)),en(d.__s,N.getDerivedStateFromProps(M,d.__s))),v=d.props,w=d.state,d.__v=t,m)b&&N.getDerivedStateFromProps==null&&d.componentWillMount!=null&&d.componentWillMount(),b&&d.componentDidMount!=null&&d.__h.push(d.componentDidMount);else{if(b&&N.getDerivedStateFromProps==null&&M!==v&&d.componentWillReceiveProps!=null&&d.componentWillReceiveProps(M,C),t.__v==n.__v||!d.__e&&d.shouldComponentUpdate!=null&&d.shouldComponentUpdate(M,d.__s,C)===!1){t.__v!=n.__v&&(d.props=M,d.state=d.__s,d.__d=!1),t.__e=n.__e,t.__k=n.__k,t.__k.some(function(I){I&&(I.__=t)}),cs.push.apply(d.__h,d._sb),d._sb=[],d.__h.length&&i.push(d);break e}d.componentWillUpdate!=null&&d.componentWillUpdate(M,d.__s,C),b&&d.componentDidUpdate!=null&&d.__h.push(function(){d.componentDidUpdate(v,w,A)})}if(d.context=C,d.props=M,d.__P=e,d.__e=!1,S=oe.__r,T=0,b)d.state=d.__s,d.__d=!1,S&&S(t),p=d.render(d.props,d.state,d.context),cs.push.apply(d.__h,d._sb),d._sb=[];else do d.__d=!1,S&&S(t),p=d.render(d.props,d.state,d.context),d.state=d.__s;while(d.__d&&++T<25);d.state=d.__s,d.getChildContext!=null&&(l=en(en({},l),d.getChildContext())),b&&!m&&d.getSnapshotBeforeUpdate!=null&&(A=d.getSnapshotBeforeUpdate(v,w)),L=p!=null&&p.type===_n&&p.key==null?Ba(p.props.children):p,r=Fa(e,Hl(L)?L:[L],t,n,l,s,o,i,r,a,u),d.base=t.__e,t.__u&=-161,d.__h.length&&i.push(d),k&&(d.__E=d.__=null)}catch(I){if(t.__v=null,a||o!=null)if(I.then){for(t.__u|=a?160:128;r&&r.nodeType==8&&r.nextSibling;)r=r.nextSibling;o[o.indexOf(r)]=null,t.__e=r}else{for(D=o.length;D--;)Wo(o[D]);wo(t)}else t.__e=n.__e,t.__k=n.__k,I.then||wo(t);oe.__e(I,t,n)}else o==null&&t.__v==n.__v?(t.__k=n.__k,t.__e=n.__e):r=t.__e=Qu(n.__e,t,n,l,s,o,i,a,u);return(p=oe.diffed)&&p(t),128&t.__u?void 0:r}function wo(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(wo))}function Ua(e,t,n){for(var l=0;l<n.length;l++)Ko(n[l],n[++l],n[++l]);oe.__c&&oe.__c(t,e),e.some(function(s){try{e=s.__h,s.__h=[],e.some(function(o){o.call(s)})}catch(o){oe.__e(o,s.__v)}})}function Ba(e){return typeof e!="object"||e==null||e.__b>0?e:Hl(e)?e.map(Ba):en({},e)}function Qu(e,t,n,l,s,o,i,r,a){var u,p,d,m,v,w,A,k=n.props||as,M=t.props,b=t.type;if(b=="svg"?s="http://www.w3.org/2000/svg":b=="math"?s="http://www.w3.org/1998/Math/MathML":s||(s="http://www.w3.org/1999/xhtml"),o!=null){for(u=0;u<o.length;u++)if((v=o[u])&&"setAttribute"in v==!!b&&(b?v.localName==b:v.nodeType==3)){e=v,o[u]=null;break}}if(e==null){if(b==null)return document.createTextNode(M);e=document.createElementNS(s,b,M.is&&M),r&&(oe.__m&&oe.__m(t,o),r=!1),o=null}if(b==null)k===M||r&&e.data==M||(e.data=M);else{if(o=o&&ys.call(e.childNodes),!r&&o!=null)for(k={},u=0;u<e.attributes.length;u++)k[(v=e.attributes[u]).name]=v.value;for(u in k)v=k[u],u=="dangerouslySetInnerHTML"?d=v:u=="children"||u in M||u=="value"&&"defaultValue"in M||u=="checked"&&"defaultChecked"in M||Ql(e,u,null,v,s);for(u in M)v=M[u],u=="children"?m=v:u=="dangerouslySetInnerHTML"?p=v:u=="value"?w=v:u=="checked"?A=v:r&&typeof v!="function"||k[u]===v||Ql(e,u,v,k[u],s);if(p)r||d&&(p.__html==d.__html||p.__html==e.innerHTML)||(e.innerHTML=p.__html),t.__k=[];else if(d&&(e.innerHTML=""),Fa(t.type=="template"?e.content:e,Hl(m)?m:[m],t,n,l,b=="foreignObject"?"http://www.w3.org/1999/xhtml":s,o,i,o?o[0]:n.__k&&rl(n,0),r,a),o!=null)for(u=o.length;u--;)Wo(o[u]);r||(u="value",b=="progress"&&w==null?e.removeAttribute("value"):w!=null&&(w!==e[u]||b=="progress"&&!w||b=="option"&&w!=k[u])&&Ql(e,u,w,k[u],s),u="checked",A!=null&&A!=e[u]&&Ql(e,u,A,k[u],s))}return e}function Ko(e,t,n){try{if(typeof e=="function"){var l=typeof e.__u=="function";l&&e.__u(),l&&t==null||(e.__u=e(t))}else e.current=t}catch(s){oe.__e(s,n)}}function ja(e,t,n){var l,s;if(oe.unmount&&oe.unmount(e),(l=e.ref)&&(l.current&&l.current!=e.__e||Ko(l,null,t)),(l=e.__c)!=null){if(l.componentWillUnmount)try{l.componentWillUnmount()}catch(o){oe.__e(o,t)}l.base=l.__P=null}if(l=e.__k)for(s=0;s<l.length;s++)l[s]&&ja(l[s],t,n||typeof e.type!="function");n||Wo(e.__e),e.__c=e.__=e.__e=void 0}function Xu(e,t,n){return this.constructor(e,n)}function ed(e,t,n){var l,s,o,i;t==document&&(t=document.documentElement),oe.__&&oe.__(e,t),s=(l=!1)?null:t.__k,o=[],i=[],qo(t,e=t.__k=mn(_n,null,[e]),s||as,as,t.namespaceURI,s?null:t.firstChild?ys.call(t.childNodes):null,o,s?s.__e:t.firstChild,l,i),Ua(o,e,i)}function Wa(e){function t(n){var l,s;return this.getChildContext||(l=new Set,(s={})[t.__c]=this,this.getChildContext=function(){return s},this.componentWillUnmount=function(){l=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&l.forEach(function(i){i.__e=!0,$o(i)})},this.sub=function(o){l.add(o);var i=o.componentWillUnmount;o.componentWillUnmount=function(){l&&l.delete(o),i&&i.call(o)}}),n.children}return t.__c="__cC"+za++,t.__=e,t.Provider=t.__l=(t.Consumer=function(n,l){return n.children(l)}).contextType=t,t}ys=cs.slice,oe={__e:function(e,t,n,l){for(var s,o,i;t=t.__;)if((s=t.__c)&&!s.__)try{if((o=s.constructor)&&o.getDerivedStateFromError!=null&&(s.setState(o.getDerivedStateFromError(e)),i=s.__d),s.componentDidCatch!=null&&(s.componentDidCatch(e,l||{}),i=s.__d),i)return s.__E=s}catch(r){e=r}throw e}},Oa=0,Yt.prototype.setState=function(e,t){var n;n=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=en({},this.state),typeof e=="function"&&(e=e(en({},n),this.props)),e&&en(n,e),e!=null&&this.__v&&(t&&this._sb.push(t),$o(this))},Yt.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),$o(this))},Yt.prototype.render=_n,dn=[],Ra=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,Ia=function(e,t){return e.__v.__b-t.__v.__b},us.__r=0,Na=/(PointerCapture)$|Capture$/i,jo=0,yo=qi(!1),bo=qi(!0),za=0;var qa=function(e,t,n,l){var s;t[0]=0;for(var o=1;o<t.length;o++){var i=t[o++],r=t[o]?(t[0]|=i?1:2,n[t[o++]]):t[++o];i===3?l[0]=r:i===4?l[1]=Object.assign(l[1]||{},r):i===5?(l[1]=l[1]||{})[t[++o]]=r:i===6?l[1][t[++o]]+=r+"":i?(s=e.apply(r,qa(e,r,n,["",null])),l.push(s),r[0]?t[0]|=2:(t[o-2]=0,t[o]=s)):l.push(r)}return l},Ki=new Map;function td(e){var t=Ki.get(this);return t||(t=new Map,Ki.set(this,t)),(t=qa(this,t.get(e)||(t.set(e,t=function(n){for(var l,s,o=1,i="",r="",a=[0],u=function(m){o===1&&(m||(i=i.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?a.push(0,m,i):o===3&&(m||i)?(a.push(3,m,i),o=2):o===2&&i==="..."&&m?a.push(4,m,0):o===2&&i&&!m?a.push(5,0,!0,i):o>=5&&((i||!m&&o===5)&&(a.push(o,0,i,s),o=6),m&&(a.push(o,m,0,s),o=6)),i=""},p=0;p<n.length;p++){p&&(o===1&&u(),u(p));for(var d=0;d<n[p].length;d++)l=n[p][d],o===1?l==="<"?(u(),a=[a],o=3):i+=l:o===4?i==="--"&&l===">"?(o=1,i=""):i=l+i[0]:r?l===r?r="":i+=l:l==='"'||l==="'"?r=l:l===">"?(u(),o=1):o&&(l==="="?(o=5,s=i,i=""):l==="/"&&(o<5||n[p][d+1]===">")?(u(),o===3&&(a=a[0]),o=a,(a=a[0]).push(2,0,o),o=0):l===" "||l==="	"||l===`
`||l==="\r"?(u(),o=2):i+=l),o===3&&i==="!--"&&(o=4,a=a[0])}return u(),a}(e)),t),arguments,[])).length>1?t:t[0]}var g=td.bind(mn);const nd="modulepreload",ld=function(e){return"/"+e},Gi={},dt=function(t,n,l){let s=Promise.resolve();if(n&&n.length>0){document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),r=(i==null?void 0:i.nonce)||(i==null?void 0:i.getAttribute("nonce"));s=Promise.allSettled(n.map(a=>{if(a=ld(a),a in Gi)return;Gi[a]=!0;const u=a.endsWith(".css"),p=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${a}"]${p}`))return;const d=document.createElement("link");if(d.rel=u?"stylesheet":nd,u||(d.as="script"),d.crossOrigin="",d.href=a,r&&d.setAttribute("nonce",r),document.head.appendChild(d),u)return new Promise((m,v)=>{d.addEventListener("load",m),d.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${a}`)))})}))}function o(i){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=i,window.dispatchEvent(r),!r.defaultPrevented)throw i}return s.then(i=>{for(const r of i||[])r.status==="rejected"&&o(r.reason);return t().catch(o)})};var Dn,Le,no,Yi,Ol=0,Ka=[],Fe=oe,Ji=Fe.__b,Zi=Fe.__r,Qi=Fe.diffed,Xi=Fe.__c,er=Fe.unmount,tr=Fe.__;function Ul(e,t){Fe.__h&&Fe.__h(Le,e,Ol||t),Ol=0;var n=Le.__H||(Le.__H={__:[],__h:[]});return e>=n.__.length&&n.__.push({}),n.__[e]}function Q(e){return Ol=1,sd(Ya,e)}function sd(e,t,n){var l=Ul(Dn++,2);if(l.t=e,!l.__c&&(l.__=[n?n(t):Ya(void 0,t),function(r){var a=l.__N?l.__N[0]:l.__[0],u=l.t(a,r);a!==u&&(l.__N=[u,l.__[1]],l.__c.setState({}))}],l.__c=Le,!Le.__f)){var s=function(r,a,u){if(!l.__c.__H)return!0;var p=l.__c.__H.__.filter(function(m){return m.__c});if(p.every(function(m){return!m.__N}))return!o||o.call(this,r,a,u);var d=l.__c.props!==r;return p.some(function(m){if(m.__N){var v=m.__[0];m.__=m.__N,m.__N=void 0,v!==m.__[0]&&(d=!0)}}),o&&o.call(this,r,a,u)||d};Le.__f=!0;var o=Le.shouldComponentUpdate,i=Le.componentWillUpdate;Le.componentWillUpdate=function(r,a,u){if(this.__e){var p=o;o=void 0,s(r,a,u),o=p}i&&i.call(this,r,a,u)},Le.shouldComponentUpdate=s}return l.__N||l.__}function ce(e,t){var n=Ul(Dn++,3);!Fe.__s&&Ga(n.__H,t)&&(n.__=e,n.u=t,Le.__H.__h.push(n))}function ee(e){return Ol=5,De(function(){return{current:e}},[])}function De(e,t){var n=Ul(Dn++,7);return Ga(n.__H,t)&&(n.__=e(),n.__H=t,n.__h=e),n.__}function se(e,t){return Ol=8,De(function(){return e},t)}function bs(e){var t=Le.context[e.__c],n=Ul(Dn++,9);return n.c=e,t?(n.__==null&&(n.__=!0,t.sub(Le)),t.props.value):e.__}function od(){var e=Ul(Dn++,11);if(!e.__){for(var t=Le.__v;t!==null&&!t.__m&&t.__!==null;)t=t.__;var n=t.__m||(t.__m=[0,0]);e.__="P"+n[0]+"-"+n[1]++}return e.__}function id(){for(var e;e=Ka.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(is),t.__h.some(ko),t.__h=[]}catch(n){t.__h=[],Fe.__e(n,e.__v)}}}Fe.__b=function(e){Le=null,Ji&&Ji(e)},Fe.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),tr&&tr(e,t)},Fe.__r=function(e){Zi&&Zi(e),Dn=0;var t=(Le=e.__c).__H;t&&(no===Le?(t.__h=[],Le.__h=[],t.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(t.__h.some(is),t.__h.some(ko),t.__h=[],Dn=0)),no=Le},Fe.diffed=function(e){Qi&&Qi(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(Ka.push(t)!==1&&Yi===Fe.requestAnimationFrame||((Yi=Fe.requestAnimationFrame)||rd)(id)),t.__H.__.some(function(n){n.u&&(n.__H=n.u),n.u=void 0})),no=Le=null},Fe.__c=function(e,t){t.some(function(n){try{n.__h.some(is),n.__h=n.__h.filter(function(l){return!l.__||ko(l)})}catch(l){t.some(function(s){s.__h&&(s.__h=[])}),t=[],Fe.__e(l,n.__v)}}),Xi&&Xi(e,t)},Fe.unmount=function(e){er&&er(e);var t,n=e.__c;n&&n.__H&&(n.__H.__.some(function(l){try{is(l)}catch(s){t=s}}),n.__H=void 0,t&&Fe.__e(t,n.__v))};var nr=typeof requestAnimationFrame=="function";function rd(e){var t,n=function(){clearTimeout(l),nr&&cancelAnimationFrame(t),setTimeout(e)},l=setTimeout(n,35);nr&&(t=requestAnimationFrame(n))}function is(e){var t=Le,n=e.__c;typeof n=="function"&&(e.__c=void 0,n()),Le=t}function ko(e){var t=Le;e.__c=e.__(),Le=t}function Ga(e,t){return!e||e.length!==t.length||t.some(function(n,l){return n!==e[l]})}function Ya(e,t){return typeof t=="function"?t(e):t}function ad(e,t){for(var n in t)e[n]=t[n];return e}function lr(e,t){for(var n in e)if(n!=="__source"&&!(n in t))return!0;for(var l in t)if(l!=="__source"&&e[l]!==t[l])return!0;return!1}function sr(e,t){this.props=e,this.context=t}(sr.prototype=new Yt).isPureReactComponent=!0,sr.prototype.shouldComponentUpdate=function(e,t){return lr(this.props,e)||lr(this.state,t)};var or=oe.__b;oe.__b=function(e){e.type&&e.type.__f&&e.ref&&(e.props.ref=e.ref,e.ref=null),or&&or(e)};var cd=oe.__e;oe.__e=function(e,t,n,l){if(e.then){for(var s,o=t;o=o.__;)if((s=o.__c)&&s.__c)return t.__e==null&&(t.__e=n.__e,t.__k=n.__k),s.__c(e,t)}cd(e,t,n,l)};var ir=oe.unmount;function Ja(e,t,n){return e&&(e.__c&&e.__c.__H&&(e.__c.__H.__.forEach(function(l){typeof l.__c=="function"&&l.__c()}),e.__c.__H=null),(e=ad({},e)).__c!=null&&(e.__c.__P===n&&(e.__c.__P=t),e.__c.__e=!0,e.__c=null),e.__k=e.__k&&e.__k.map(function(l){return Ja(l,t,n)})),e}function Za(e,t,n){return e&&n&&(e.__v=null,e.__k=e.__k&&e.__k.map(function(l){return Za(l,t,n)}),e.__c&&e.__c.__P===t&&(e.__e&&n.appendChild(e.__e),e.__c.__e=!0,e.__c.__P=n)),e}function An(){this.__u=0,this.o=null,this.__b=null}function Qa(e){var t=e.__&&e.__.__c;return t&&t.__a&&t.__a(e)}function ft(e){var t,n,l,s=null;function o(i){if(t||(t=e()).then(function(r){r&&(s=r.default||r),l=!0},function(r){n=r,l=!0}),n)throw n;if(!l)throw t;return s?mn(s,i):null}return o.displayName="Lazy",o.__f=!0,o}function Xl(){this.i=null,this.l=null}oe.unmount=function(e){var t=e.__c;t&&(t.__z=!0),t&&t.__R&&t.__R(),t&&32&e.__u&&(e.type=null),ir&&ir(e)},(An.prototype=new Yt).__c=function(e,t){var n=t.__c,l=this;l.o==null&&(l.o=[]),l.o.push(n);var s=Qa(l.__v),o=!1,i=function(){o||l.__z||(o=!0,n.__R=null,s?s(a):a())};n.__R=i;var r=n.__P;n.__P=null;var a=function(){if(!--l.__u){if(l.state.__a){var u=l.state.__a;l.__v.__k[0]=Za(u,u.__c.__P,u.__c.__O)}var p;for(l.setState({__a:l.__b=null});p=l.o.pop();)p.__P=r,p.forceUpdate()}};l.__u++||32&t.__u||l.setState({__a:l.__b=l.__v.__k[0]}),e.then(i,i)},An.prototype.componentWillUnmount=function(){this.o=[]},An.prototype.render=function(e,t){if(this.__b){if(this.__v.__k){var n=document.createElement("div"),l=this.__v.__k[0].__c;this.__v.__k[0]=Ja(this.__b,n,l.__O=l.__P)}this.__b=null}var s=t.__a&&mn(_n,null,e.fallback);return s&&(s.__u&=-33),[mn(_n,null,t.__a?null:e.children),s]};var rr=function(e,t,n){if(++n[1]===n[0]&&e.l.delete(t),e.props.revealOrder&&(e.props.revealOrder[0]!=="t"||!e.l.size))for(n=e.i;n;){for(;n.length>3;)n.pop()();if(n[1]<n[0])break;e.i=n=n[2]}};(Xl.prototype=new Yt).__a=function(e){var t=this,n=Qa(t.__v),l=t.l.get(e);return l[0]++,function(s){var o=function(){t.props.revealOrder?(l.push(s),rr(t,e,l)):s()};n?n(o):o()}},Xl.prototype.render=function(e){this.i=null,this.l=new Map;var t=Pl(e.children);e.revealOrder&&e.revealOrder[0]==="b"&&t.reverse();for(var n=t.length;n--;)this.l.set(t[n],this.i=[1,0,this.i]);return e.children},Xl.prototype.componentDidUpdate=Xl.prototype.componentDidMount=function(){var e=this;this.l.forEach(function(t,n){rr(e,n,t)})};var ud=typeof Symbol<"u"&&Symbol.for&&Symbol.for("react.element")||60103,dd=/^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/,fd=/^on(Ani|Tra|Tou|BeforeInp|Compo)/,pd=/[A-Z0-9]/g,hd=typeof document<"u",md=function(e){return(typeof Symbol<"u"&&typeof Symbol()=="symbol"?/fil|che|rad/:/fil|che|ra/).test(e)};Yt.prototype.isReactComponent=!0,["componentWillMount","componentWillReceiveProps","componentWillUpdate"].forEach(function(e){Object.defineProperty(Yt.prototype,e,{configurable:!0,get:function(){return this["UNSAFE_"+e]},set:function(t){Object.defineProperty(this,e,{configurable:!0,writable:!0,value:t})}})});var ar=oe.event;oe.event=function(e){return ar&&(e=ar(e)),e.persist=function(){},e.isPropagationStopped=function(){return this.cancelBubble},e.isDefaultPrevented=function(){return this.defaultPrevented},e.nativeEvent=e};var _d={configurable:!0,get:function(){return this.class}},cr=oe.vnode;oe.vnode=function(e){typeof e.type=="string"&&function(t){var n=t.props,l=t.type,s={},o=l.indexOf("-")==-1;for(var i in n){var r=n[i];if(!(i==="value"&&"defaultValue"in n&&r==null||hd&&i==="children"&&l==="noscript"||i==="class"||i==="className")){var a=i.toLowerCase();i==="defaultValue"&&"value"in n&&n.value==null?i="value":i==="download"&&r===!0?r="":a==="translate"&&r==="no"?r=!1:a[0]==="o"&&a[1]==="n"?a==="ondoubleclick"?i="ondblclick":a!=="onchange"||l!=="input"&&l!=="textarea"||md(n.type)?a==="onfocus"?i="onfocusin":a==="onblur"?i="onfocusout":fd.test(i)&&(i=a):a=i="oninput":o&&dd.test(i)?i=i.replace(pd,"-$&").toLowerCase():r===null&&(r=void 0),a==="oninput"&&s[i=a]&&(i="oninputCapture"),s[i]=r}}l=="select"&&(s.multiple&&Array.isArray(s.value)&&(s.value=Pl(n.children).forEach(function(u){u.props.selected=s.value.indexOf(u.props.value)!=-1})),s.defaultValue!=null&&(s.value=Pl(n.children).forEach(function(u){u.props.selected=s.multiple?s.defaultValue.indexOf(u.props.value)!=-1:s.defaultValue==u.props.value}))),n.class&&!n.className?(s.class=n.class,Object.defineProperty(s,"className",_d)):n.className&&(s.class=s.className=n.className),t.props=s}(e),e.$$typeof=ud,cr&&cr(e)};var ur=oe.__r;oe.__r=function(e){ur&&ur(e),e.__c};var dr=oe.diffed;oe.diffed=function(e){dr&&dr(e);var t=e.props,n=e.__e;n!=null&&e.type==="textarea"&&"value"in t&&t.value!==n.value&&(n.value=t.value==null?"":t.value)};const Rl=Wa(null);function vd(e){const t=String(e||"");return/^[A-Za-z]:([\\/]|$)/.test(t)||t.startsWith("\\\\")||t.includes("\\")&&!t.includes("/")}function Xa(e){return vd(e)?"\\":"/"}function ec(e){return String(e||"").split(/[\\/]+/).filter(Boolean)}function tc(e){const t=String(e||"");if(!t)return"";const n=ec(t);if(!n.length)return t;const l=n[n.length-1];return n.length===1&&/^[A-Za-z]:$/.test(l)?l+"\\":l}function m_(e,t=2){const n=String(e||"");if(!n)return"";const l=Xa(n),s=ec(n);return s.length<=t?n:"…"+l+s.slice(-t).join(l)}let gd="";function Il(e){return gd+e}async function ie(e,t=void 0){const n=await(t===void 0?fetch(Il(e)):fetch(Il(e),t));if(!n.ok){let l="";try{const o=await n.text();if(o)try{l=JSON.parse(o).error||o}catch{l=o}}catch{}const s=new Error(`HTTP ${n.status} ${e}`+(l?`: ${String(l).slice(0,200)}`:""));throw s.status=n.status,s}return n.json()}async function yd(){return ie("/api/snapshot")}async function So(e={}){let t="/api/history";const n=[];return e.range&&n.push("range="+e.range),e.since!=null&&n.push("since="+e.since),e.until!=null&&n.push("until="+e.until),e.tool&&n.push("tool="+encodeURIComponent(e.tool)),n.length&&(t+="?"+n.join("&")),ie(t)}async function bd(e={}){let t="/api/events";const n=[];return e.tool&&n.push("tool="+encodeURIComponent(e.tool)),e.since!=null&&n.push("since="+e.since),e.until!=null&&n.push("until="+e.until),e.sessionId&&n.push("session_id="+encodeURIComponent(e.sessionId)),e.limit&&n.push("limit="+e.limit),n.length&&(t+="?"+n.join("&")),ie(t)}async function __(e={}){let t="/api/sessions";const n=[];return e.tool&&n.push("tool="+encodeURIComponent(e.tool)),e.active!=null&&n.push("active="+e.active),e.limit&&n.push("limit="+e.limit),n.length&&(t+="?"+n.join("&")),ie(t)}async function Go(e,t,n){const l=(Array.isArray(e)?e:[e]).filter(r=>r!=null&&r!=="");let s,o=!1,i=null;for(const r of l)try{const a=await t(r);if(n(a))return a;o||(s=a,o=!0)}catch(a){i===null&&(i=a)}if(o)return s;throw i??new Error("no session id to fetch")}async function v_(e,t,n){return Go(e,l=>ie(`/api/session-flow?session_id=${encodeURIComponent(l)}&since=${t}&until=${n}`),l=>{var s;return(((s=l==null?void 0:l.turns)==null?void 0:s.length)??0)>0})}let nc=0;async function g_(e,t={}){let n="/api/session-timeline";const l=[];t.since!=null&&l.push("since="+t.since),t.until!=null&&l.push("until="+t.until),l.length&&(n+="?"+l.join("&"));const s=await ie(n),o=Array.isArray(s)?s:Array.isArray(s==null?void 0:s.sessions)?s.sessions:[],i=Array.isArray(s)?0:Number(s==null?void 0:s.filtered_count)||0;nc=i;try{o.filtered_count=i}catch{}return o}function y_(){return nc}async function b_(e,t,n=30,l=20){return ie(`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=${n}&limit=${l}`)}async function $_(e,t={}){let n="/api/events?session_id="+encodeURIComponent(e);return t.since!=null&&(n+="&since="+t.since),t.until!=null&&(n+="&until="+t.until),t.limit!=null&&(n+="&limit="+t.limit),ie(n)}async function w_(e,t={}){let n="/api/samples?metric="+encodeURIComponent(e);if(t.since!=null&&(n+="&since="+t.since),t.limit!=null&&(n+="&limit="+t.limit),t.tags)for(const[l,s]of Object.entries(t.tags))s!=null&&(n+="&tag."+encodeURIComponent(l)+"="+encodeURIComponent(s));return ie(n)}async function k_(e){return ie("/api/session-subprocesses?session_id="+encodeURIComponent(e))}async function S_(e){return ie("/api/session-mcp-usage?session_id="+encodeURIComponent(e))}async function x_(e){return ie("/api/session-cost-by-model?session_id="+encodeURIComponent(e))}async function M_(e){return ie("/api/session-processes?session_id="+encodeURIComponent(e))}async function C_(e){return Go(e,t=>ie("/api/session-tool-calls?session_id="+encodeURIComponent(t)),t=>{var n;return(((n=t==null?void 0:t.calls)==null?void 0:n.length)??0)>0})}async function E_(e){return ie("/api/session-stats?session_id="+encodeURIComponent(e))}async function T_(e){return ie("/api/session-commits?session_id="+encodeURIComponent(e))}async function A_(e,t=200){return ie("/api/session-messages?session_id="+encodeURIComponent(e)+"&limit="+t)}async function L_(e){return ie("/api/session-memory-diff?session_id="+encodeURIComponent(e))}async function D_(e){return Go(e,t=>ie("/api/transcript/"+encodeURIComponent(t)),t=>{var n;return(((n=t==null?void 0:t.turns)==null?void 0:n.length)??0)>0})}async function P_(e,t={}){return ie(e,t)}async function $d({since:e,until:t}={}){const n=new URLSearchParams;e!=null&&n.set("since",String(e)),t!=null&&n.set("until",String(t));const l=n.toString();return ie("/api/usage"+(l?"?"+l:""))}async function O_(e=7){return ie("/api/project-costs?days="+e)}async function R_(e,t=100,n=null){const l=new URLSearchParams({since:String(e),limit:String(t)});return n&&l.set("session_id",n),ie(`/api/api-calls?${l.toString()}`)}async function I_(){return ie("/api/budget")}async function wd(e,t={}){return fetch(Il("/api/file?path="+encodeURIComponent(e)),{headers:t})}async function kd(e,t){return fetch(Il("/api/files/history?path="+encodeURIComponent(e)+"&ts="+t))}async function N_(){return ie("/api/samples?list=1")}async function z_(e,t){return ie("/api/samples?series="+encodeURIComponent(e)+"&since="+t)}async function V_(e,t){return ie("/api/samples?metric="+encodeURIComponent(e)+"&since="+t)}async function lc(){return ie("/api/otel-status")}async function Sd(){return ie("/api/ingesters")}async function sc(){return ie("/api/self-status")}async function xd(){return ie("/api/effective-models")}async function Md(){return ie("/api/hooks-status")}async function oc(e={}){let t="/api/data-quality";const n=[];return e.status&&n.push("status="+encodeURIComponent(e.status)),e.kind&&n.push("kind="+encodeURIComponent(e.kind)),e.component&&n.push("component="+encodeURIComponent(e.component)),e.limit&&n.push("limit="+e.limit),n.length&&(t+="?"+n.join("&")),ie(t)}async function F_(e){return ie("/api/tool-config/"+encodeURIComponent(e))}async function H_(e,t){return ie("/api/tool-config/"+encodeURIComponent(e),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})}async function U_(e,t="TERM"){return ie("/api/session-kill",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:e,confirm:!0,signal:t})})}let lo=null;async function Cd(){return lo||(lo=ie("/api/datapoints")),lo}function Ed(){return Il("/api/stream")}const el=window.COLORS??{},B_=window.VENDOR_LABELS??{},j_=window.VENDOR_COLORS??{},W_=window.HOST_LABELS??{},q_=window.TOOL_RELATIONSHIPS??{},Td={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},ic=["auto","dark","light","editorial"],K_=5,Zn=15,G_={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},Y_=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],J_={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},Z_=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],fr=new Map,Ad=6e4;function rc(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function $s(e,t,n,l=1){for(let s=t.length-1;s>=0;s--){const[o,i]=t[s],r=e/o;if(r>=l)return rc(r)+i}return Math.round(e)+n}const Ld=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],Dd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],Pd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function _t(e){return $s(e,Dd,"")}function Q_(e){return $s(e,Pd,"")}function Jt(e){return $s(e,Ld,"B")}function xo(e){return!e||e<=0?"0B/s":$s(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function al(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function ll(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function pr(e,t){if(!e)return t;if(typeof e=="string"&&e.startsWith("var(")){const n=e.slice(4,-1).trim();return(typeof document<"u"?getComputedStyle(document.documentElement).getPropertyValue(n).trim():"")||t}return e}function Od(e){return pr(e,"")||pr("var(--fg2)","")||void 0}function X_(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function ev(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Yo(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const n=Math.floor(t/60);return n<60?n+"m "+t%60+"s":Math.floor(n/60)+"h "+n%60+"m"}function tv(e){if(e==null||isNaN(e)||e<=0)return"";if(e<1e3)return Math.round(e)+"ms";const t=e/1e3;if(t<10)return t.toFixed(1).replace(/\.0$/,"")+"s";const n=Math.round(t);if(n<60)return n+"s";const l=Math.floor(n/60);return l<60?l+"m "+n%60+"s":Math.floor(l/60)+"h "+l%60+"m"}function nv(e){return e?new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):""}function lv(e){return e?new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function sv(e){if(!e)return"";const t=String(e).split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:String(e).slice(-6)}function ov(e){return e?e.replace("claude-","").replace("gpt-","").replace(/-\d{8}$/,""):""}const hr=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"];function iv(e){if(!e)return"var(--fg2)";let t=0;for(let n=0;n<e.length;n++)t=t*31+e.charCodeAt(n)&65535;return hr[t%hr.length]}function Rd(e){return el[e]||"var(--fg2)"}function ds(e){return e&&e.replace(/\\/g,"/")}function so(e,t){const n=ds(e),l=ds(t);return n.startsWith(l+"/")?"project":n.includes("/.claude/projects/")?"shadow":n.includes("/.claude/")||n.includes("/.config/")||n.includes("/Library/")||n.includes("/AppData/")||n.includes("/.copilot/")||n.includes("/.vscode/")?"global":"external"}function Id(e,t){const n=ds(e),l=ds(t),s=Xa(e);if(n.startsWith(l+"/")){const r=n.slice(l.length+1),a=r.split("/");return a.pop(),a.length?a.join(s):"(root)"}const o=n.split("/");o.pop();const i=s==="/"?"~/":"";for(let r=o.length-1;r>=0;r--)if(o[r].startsWith(".")&&o[r].length>1&&o[r]!==".."||o[r]==="Library"||o[r]==="AppData")return i+o.slice(r).join(s);return o.slice(-2).join(s)}function rv(e,t){const n={};e.forEach(s=>{const o=so(s.path,t),i=Id(s.path,t),r=o==="project"?i:o+": "+i;(n[r]=n[r]||[]).push(s)});const l={project:0,global:1,shadow:2,external:3};return Object.entries(n).sort((s,o)=>{const i=s[1][0]?so(s[1][0].path,t):"z",r=o[1][0]?so(o[1][0].path,t):"z";return(l[i]||9)-(l[r]||9)})}function Nd(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let n=2;n<e.length;n++)t.push((e[n-2]+e[n-1]+e[n])/3);return t}async function zd(e){const t=fr.get(e);if(t&&Date.now()-t.ts<Ad)return t.content;const n={};t&&t.etag&&(n["If-None-Match"]=t.etag);const l=await wd(e,n);if(l.status===304&&t)return t.ts=Date.now(),t.content;if(!l.ok)throw new Error(l.statusText);const s=await l.text(),o=l.headers.get("ETag")||null;return fr.set(e,{content:s,ts:Date.now(),etag:o}),s}async function Vd(e,t){const n=await kd(e,t);if(n.status===404)throw new Error("No content at that timestamp");if(!n.ok)throw new Error(n.statusText);return n.text()}function es(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function av(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function oo(e,t,n,l){if(e==null||e==="")return"";let s=typeof e=="number"?e:parseFloat(e)||0;l&&(s*=l);let o;switch(t){case"size":o=Jt(s);break;case"rate":o=xo(s);break;case"kilo":o=_t(s);break;case"percent":o=al(s);break;case"pct":o=al(s);break;case"raw":default:o=Number.isInteger(s)?String(s):rc(s)}return n?o+n:o}function mr(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const _r=200,vr=80,Fd=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Hd(e,t){if(!e)return t;const n=Object.fromEntries((t.tools||[]).map(l=>[l.tool,l]));return{...e,...t,tools:e.tools.map(l=>{const s=n[l.tool];return s?{...l,live:s.live,vendor:s.vendor||l.vendor,host:s.host||l.host}:l})}}function Ud(e,t){var l,s,o,i;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>_r)for(const r of Fd)e[r]=e[r].slice(-_r);const n=e.by_tool||{};for(const r of t.tools||[]){if(r.tool==="aictl")continue;const a=((l=r.live)==null?void 0:l.cpu_percent)||0,u=((s=r.live)==null?void 0:s.mem_mb)||0,p=r.tokens||0,d=(((o=r.live)==null?void 0:o.outbound_rate_bps)||0)+(((i=r.live)==null?void 0:i.inbound_rate_bps)||0);n[r.tool]||(n[r.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const m=n[r.tool];if(m.ts.push(t.timestamp),m.cpu.push(Math.round(a*10)/10),m.mem_mb.push(Math.round(u*10)/10),m.tokens.push(p),m.traffic.push(Math.round(d*100)/100),m.ts.length>vr)for(const v of Object.keys(m))m[v]=m[v].slice(-vr)}return{...e,by_tool:n}}const Bd=15,jd=5;function ac(e){return(e==null?void 0:e.session_id)??(e==null?void 0:e.id)??null}const gr=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;function Wd(e){return Array.isArray(e==null?void 0:e.alt_session_ids)?e.alt_session_ids:[]}function Mo(e){const t=[];for(const n of[ac(e),...Wd(e)])n!=null&&n!==""&&!t.includes(n)&&t.push(n);return t}function cv(e,t){if(t!=null)return(e||[]).find(n=>Mo(n).includes(t))}function yr(e){return Math.max((e==null?void 0:e.ended_at)||0,(e==null?void 0:e.started_at)||0,(e==null?void 0:e.last_activity)||0)}function br(e){return e!=null&&e.duration_s?e.duration_s:e!=null&&e.ended_at&&(e!=null&&e.started_at)?e.ended_at-e.started_at:null}function $r(e,t){const[n,l]=yr(t)>yr(e)?[t,e]:[e,t],s={...n};for(const i of["input_tokens","output_tokens","exact_input_tokens","exact_output_tokens","files_modified"]){const r=(l==null?void 0:l[i])||0;r>(s[i]||0)&&(s[i]=r)}for(const i of Object.keys(l||{}))s[i]==null&&l[i]!=null&&(s[i]=l[i]);const o=[];for(const i of[...Mo(n),...Mo(l)])o.includes(i)||o.push(i);if(o.length>1){const i=gr.test(String(o[0]))?o[0]:o.find(r=>gr.test(String(r)))??o[0];s.session_id=i,s.id!=null&&(s.id=i),s.alt_session_ids=o.filter(r=>r!==i)}return s}function qd(e,t){if(!(e!=null&&e.tool)||e.tool!==(t==null?void 0:t.tool)||e.started_at==null||t.started_at==null||Math.abs(e.started_at-t.started_at)>Bd)return!1;const n=br(e),l=br(t);return n==null&&l==null?!0:n==null||l==null?!1:Math.abs(n-l)<=jd}function uv(e){if(!Array.isArray(e))return[];if(e.length<2)return e.slice();const t=new Map,n=[];for(const s of e){if(!s)continue;const o=ac(s);if(o!=null&&t.has(o)){const i=t.get(o);n[i]=$r(n[i],s)}else o!=null&&t.set(o,n.length),n.push(s)}const l=[];for(const s of n){const o=l.findIndex(i=>qd(i,s));o>=0?l[o]=$r(l[o],s):l.push(s)}return l}function Kd(e,t,n={}){const{onConnect:l,onDisconnect:s,initialRetryMs:o=1e3,maxRetryMs:i=3e4,EventSourceClass:r=typeof EventSource<"u"?EventSource:null}=n,[a,u]=Q(!1),p=ee(null),d=ee(!1),m=ee(o),v=ee(t);v.current=t;const w=ee(l);w.current=l;const A=ee(s);A.current=s,ce(()=>{if(!r||!e)return;d.current=!1,m.current=o;function M(){if(d.current)return;const b=new r(e);p.current=b,b.onopen=()=>{var x;u(!0),m.current=o,(x=w.current)==null||x.call(w)},b.onmessage=x=>{try{const C=JSON.parse(x.data);v.current(C)}catch{}},b.onerror=()=>{var x;u(!1),(x=A.current)==null||x.call(A),b.close(),d.current||(setTimeout(M,m.current),m.current=Math.min(m.current*2,i))}}return M(),()=>{var b;d.current=!0,(b=p.current)==null||b.close(),u(!1)}},[e,r,o,i]);const k=se(()=>{var M;d.current=!0,(M=p.current)==null||M.close(),u(!1)},[]);return{connected:a,close:k}}const Gd=720;function Yd(e={}){const{EventSourceClass:t,refreshMs:n=3e4,applyMs:l=1e3}=e,[s,o]=Q(null),[i,r]=Q(null),[a,u]=Q(null),p=ee(!1),d=se(()=>p.current?Promise.resolve():(p.current=!0,yd().then(b=>{o(b),u(Date.now())}).catch(()=>{}).finally(()=>{p.current=!1})),[]);ce(()=>{d(),So().then(r).catch(()=>{})},[d]);const m=ee([]),v=ee(0),w=ee(null),A=se(()=>{w.current&&(clearTimeout(w.current),w.current=null);const b=m.current;if(!b.length)return;m.current=[],v.current=Date.now();const x=b[b.length-1];o(C=>C&&Hd(C,x)),r(C=>b.reduce(Ud,C)),u(Date.now())},[]),k=se(b=>{if(m.current.push(b),m.current.length>Gd&&m.current.shift(),typeof document<"u"&&document.hidden)return;const x=l-(Date.now()-v.current);x<=0?A():w.current||(w.current=setTimeout(A,x))},[l,A]);ce(()=>{const b=()=>{document.hidden||A()};return document.addEventListener("visibilitychange",b),()=>{document.removeEventListener("visibilitychange",b),w.current&&clearTimeout(w.current)}},[A]);const{connected:M}=Kd(Ed(),k,t?{EventSourceClass:t}:{});return ce(()=>{if(!n)return;const b=setInterval(()=>{document.hidden||d()},n);return()=>clearInterval(b)},[d,n]),{snapshot:s,history:i,connected:M,lastUpdateAt:a,refresh:d,setHistory:r}}function tl(e,t=[],{pollMs:n=0}={}){const[l,s]=Q({data:null,error:null,loading:!0,updatedAt:null}),o=ee(e);o.current=e;const i=ee(0),r=se(()=>{const a=++i.current;return s(u=>({...u,loading:!0})),Promise.resolve().then(()=>o.current()).then(u=>{a===i.current&&s({data:u,error:null,loading:!1,updatedAt:Date.now()})}).catch(u=>{a===i.current&&s(p=>({...p,error:u,loading:!1}))})},[]);return ce(()=>{if(r(),!n)return()=>{i.current++};const a=setInterval(()=>{document.hidden||r()},n);return()=>{clearInterval(a),i.current++}},[r,n,...t]),{...l,reload:r}}const Jd={dashboard:"overview",sessions:"explorer","session-explorer":"explorer",processes:"procs",context:"memory","ai-context":"memory",monitor:"live","events-stats":"events",token_budget:"budget",configuration:"config"};function wr(e,t){if(!e)return null;const n=Jd[e]||e;return t.includes(n)?n:null}function Zd(e){const t=new URLSearchParams(e||""),n={};if(t.has("tab")&&(n.tab=t.get("tab")),t.has("range")){const l=t.get("range");if(l==="custom"){const s=Number(t.get("since")),o=Number(t.get("until"));s>0&&o>s&&(n.range={id:l,since:s,until:o})}else n.range={id:l}}if(t.has("tools")){const l=t.get("tools");n.tools=l?l.split(",").filter(Boolean):[]}return n}function Qd(e,t){const n=new URLSearchParams(e||"");for(const[s,o]of Object.entries(t))o==null?n.delete(s):n.set(s,String(o));const l=n.toString().replace(/%2C/g,",");return l?"?"+l:""}function Xd(e){return!e||e.id==="live"?{range:null,since:null,until:null}:e.id==="custom"?{range:"custom",since:Math.floor(e.since),until:Math.floor(e.until)}:{range:e.id,since:null,until:null}}function ef(e){return{tools:e==null?null:e.join(",")}}function tf(e,t="overview"){return{tab:e===t?null:e}}function cc(){return typeof window<"u"?window.location:null}function Jo(e,{push:t=!1}={}){const n=cc();if(!n||typeof history>"u")return;const l=Qd(n.search,e);if(l===n.search)return;const s=n.pathname+l+n.hash;try{t?history.pushState(null,"",s):history.replaceState(null,"",s)}catch{}}function Zo(){const e=cc();return Zd(e?e.search:"")}const Nl=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],ws=Object.fromEntries(Nl.map(e=>[e.id,e.seconds])),uc="aictl-pref-range";function nf(){try{const e=localStorage.getItem(uc),t=e!=null?JSON.parse(e):"live";return ws[t]?t:"live"}catch{return"live"}}function lf(e){try{localStorage.setItem(uc,JSON.stringify(e))}catch{}}function Co(e){const t=ws[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}}function sf(){const e=Zo().range;return(e==null?void 0:e.id)==="custom"?e:e&&ws[e.id]?Co(e.id):Co(nf())}function of(){const[e,t]=Q(sf);ce(()=>{Jo(Xd(e))},[e]);const n=se(o=>{t(Co(o)),lf(o)},[]),l=se((o,i)=>{t({id:"custom",since:o,until:i})},[]),s=se(o=>{typeof o=="string"?n(o):o&&typeof o=="object"&&t(o)},[n]);return{range:e,setRange:s,setPreset:n,setCustom:l,presets:Nl}}const dc="aictl-pref-tool_filter";function rf(){const e=Zo().tools;if(e!==void 0)return e;try{const t=localStorage.getItem(dc);return t!=null?JSON.parse(t):null}catch{return null}}function kr(e){try{localStorage.setItem(dc,JSON.stringify(e))}catch{}Jo(ef(e))}function af(e=[]){const[t,n]=Q(rf),l=se(o=>{n(o),kr(o)},[]),s=se(o=>{n(i=>{let r;return i===null?r=e.filter(a=>a!==o):i.includes(o)?r=i.filter(a=>a!==o):(r=[...i,o],r.length>=e.length&&(r=null)),kr(r),r})},[e]);return{selectedTools:t,setTools:l,toggleTool:s,allTools:e}}const Al={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files",iconName:"file-text"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens",iconName:"coins"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",iconName:"cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb",iconName:"server"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],navGroups:[{id:"monitor",label:"Monitor"},{id:"work",label:"Sessions"},{id:"spend",label:"Spend"},{id:"setup",label:"Setup"}],tabs:[{id:"overview",group:"monitor",label:"Overview",iconName:"layout-dashboard",key:"1"},{id:"hidden",group:"monitor",label:"Hidden context",iconName:"eye-off",key:"h"},{id:"live",group:"monitor",label:"Live",iconName:"radio",key:"2"},{id:"procs",group:"monitor",label:"Processes",iconName:"cpu",key:"3"},{id:"events",group:"monitor",label:"Events",iconName:"activity",key:"4"},{id:"explorer",group:"work",label:"Explorer",iconName:"search",key:"5"},{id:"agents",group:"work",label:"Agents",iconName:"bot",key:"6"},{id:"prompts",group:"work",label:"Prompts",iconName:"pen",key:"7"},{id:"budget",group:"spend",label:"Budget",iconName:"coins",key:"8"},{id:"analytics",group:"spend",label:"Analytics",iconName:"bar-chart-3",key:"9"},{id:"memory",group:"setup",label:"AI context",iconName:"brain",key:"0"},{id:"config",group:"setup",label:"Configuration",iconName:"settings",key:"-"}]},fc="aictl-pref-active_tab",fs=Al.tabs,nl=fs.map(e=>e.id);var Pa;const Eo=((Pa=fs[0])==null?void 0:Pa.id)||"overview";function Sr(){const e=wr(Zo().tab,nl);if(e)return e;try{const t=localStorage.getItem(fc);return wr(t!=null?JSON.parse(t):null,nl)||Eo}catch{return Eo}}function Qo(e){if(!e)return!1;const t=e.tagName;return t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||e.isContentEditable}function cf(){const[e,t]=Q(Sr),n=ee(e);n.current=e;const l=se(s=>{t(s),Jo(tf(s,Eo),{push:!0});try{localStorage.setItem(fc,JSON.stringify(s))}catch{}},[]);return ce(()=>{const s=()=>t(Sr());return window.addEventListener("popstate",s),()=>window.removeEventListener("popstate",s)},[]),ce(()=>{const s=o=>{if(Qo(o.target)||o.metaKey||o.ctrlKey||o.altKey)return;if(o.key==="["||o.key==="]"){const r=o.key==="]"?1:-1,a=nl.indexOf(n.current);l(nl[(a+r+nl.length)%nl.length]);return}const i=fs.find(r=>r.key&&r.key===o.key);i&&l(i.id)};return document.addEventListener("keydown",s),()=>document.removeEventListener("keydown",s)},[l]),{activeTab:e,setActiveTab:l,tabs:fs}}const pc="aictl-theme",hc=new Set(ic),io=["auto","dark","light"],uf="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600&display=swap";function df(){if(document.getElementById("aictl-editorial-fonts"))return;const e=document.createElement("link");e.id="aictl-editorial-fonts",e.rel="stylesheet",e.href=uf,document.head.appendChild(e)}function ff(){try{const e=localStorage.getItem(pc);return hc.has(e)?e:"auto"}catch{return"auto"}}function pf(){const[e,t]=Q(ff);ce(()=>{document.documentElement.setAttribute("data-theme",e),e==="editorial"&&df();try{localStorage.setItem(pc,e)}catch{}},[e]);const n=se(s=>{hc.has(s)&&t(s)},[]),l=se(()=>{t(s=>io[(io.indexOf(s)+1)%io.length])},[]);return{theme:e,setTheme:n,cycleTheme:l,themes:ic}}const mc=["compact","normal","spacious"],_c="aictl-density",vc=new Set(mc);function hf(){try{const e=localStorage.getItem(_c);return vc.has(e)?e:"normal"}catch{return"normal"}}function mf(){const[e,t]=Q(hf);ce(()=>{document.documentElement.setAttribute("data-density",e);try{localStorage.setItem(_c,e)}catch{}},[e]);const n=se(l=>{vc.has(l)&&t(l)},[]);return{density:e,setDensity:n,densities:mc}}const gc="aictl-views-v1";function xr(){try{const e=localStorage.getItem(gc),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}function Mr(e){try{localStorage.setItem(gc,JSON.stringify(e))}catch{}}function Cr(e){try{const t=JSON.stringify({tab:e.tab,range:e.range,tools:Array.isArray(e.tools)?[...e.tools].sort():e.tools,density:e.density,theme:e.theme});let n=5381;for(let l=0;l<t.length;l++)n=(n<<5)+n+t.charCodeAt(l)|0;return String(n)}catch{return""}}function _f(){return"v_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}function vf(e,t){const[n,l]=Q(xr);ce(()=>{if(!(typeof window>"u"))try{const p=new URLSearchParams(window.location.search).get("view");if(!p)return;const d=xr().find(m=>m.id===p);d&&t&&t(d)}catch{}},[]);const s=se(u=>{const p=(u||"").trim();if(!p)return null;const d={id:_f(),name:p,tab:e.tab,range:e.range,tools:e.tools,density:e.density,theme:e.theme,createdAt:Date.now()};return l(m=>{const v=[...m,d];return Mr(v),v}),d},[e]),o=se(u=>{l(p=>{const d=p.filter(m=>m.id!==u);return Mr(d),d})},[]),i=se(u=>{const p=n.find(d=>d.id===u);if(!p)return!1;t&&t(p);try{const d=new URL(window.location.href);d.searchParams.set("view",u),window.history.replaceState({},"",d.toString())}catch{}return!0},[n,t]),r=De(()=>Cr(e),[e]),a=De(()=>n.find(u=>Cr({tab:u.tab,range:u.range,tools:u.tools,density:u.density,theme:u.theme})===r)||null,[n,r]);return{views:n,saveView:s,deleteView:o,applyView:i,currentHash:r,matchingView:a}}const yc="aictl-cmdpalette-lru-v1",bc=5;function gf(){try{const e=localStorage.getItem(yc),t=e?JSON.parse(e):[];return Array.isArray(t)?t.slice(0,bc):[]}catch{return[]}}function yf(e){try{localStorage.setItem(yc,JSON.stringify(e))}catch{}}function bf(){const[e,t]=Q(!1),[n,l]=Q(gf),s=se(()=>t(!0),[]),o=se(()=>t(!1),[]),i=se(()=>t(a=>!a),[]),r=se(a=>{a&&l(u=>{const p=[a,...u.filter(d=>d!==a)].slice(0,bc);return yf(p),p})},[]);return ce(()=>{const a=u=>{(u.metaKey||u.ctrlKey)&&(u.key==="k"||u.key==="K")&&(u.preventDefault(),t(d=>!d))};return document.addEventListener("keydown",a),()=>document.removeEventListener("keydown",a)},[]),{isOpen:e,open:s,close:o,toggle:i,lru:n,recordUse:r}}const $f="sr-only",wf="aictl-a11y-live",kf="aictl-a11y-live-assertive";function Sf(e,t){if(typeof document>"u")return null;let n=document.getElementById(e);return n||(n=document.createElement("div"),n.id=e,n.setAttribute("role","status"),n.setAttribute("aria-live",t),n.setAttribute("aria-atomic","true"),n.className=$f,document.body.appendChild(n)),n}function Er(e,t="polite"){if(!e)return;const l=Sf(t==="assertive"?kf:wf,t);l&&(l.textContent="",setTimeout(()=>{l.textContent=e},16))}let zl=null,$c=null;if(typeof document<"u"){document.addEventListener("aictl:select-session",t=>{var n;zl=(n=t==null?void 0:t.detail)!=null&&n.sessionId?t.detail:null});const e=new URLSearchParams(window.location.search).get("session");e&&(zl={sessionId:e,tool:null})}function dv(){const e=zl||$c;return zl=null,e}function fv(){zl=null}function pv(e,t){$c=e?{sessionId:e,tool:t||null}:null}const ks=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-desktop","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]),xf={any:"Unattributed","claude-code":"Claude Code","claude-desktop":"Claude Desktop","codex-cli":"Codex CLI","gemini-cli":"Gemini CLI","copilot-cli":"Copilot CLI","copilot-desktop":"Copilot Desktop","copilot-vscode":"Copilot VS Code",copilot365:"Microsoft 365 Copilot"};function Vl(e,t){var n,l;return((l=(n=t==null?void 0:t.tools)==null?void 0:n.find(s=>s.tool===e))==null?void 0:l.label)||xf[e]||e}function Mf(e){var n,l;const t=e.live||{};return[t.session_count||0,(e.processes||[]).length,(((n=t.token_estimate)==null?void 0:n.input_tokens)||0)+(((l=t.token_estimate)==null?void 0:l.output_tokens)||0)]}function wc(e){return e.map(t=>[Mf(t),t]).sort(([t,n],[l,s])=>l[0]-t[0]||l[1]-t[1]||l[2]-t[2]||String(n.label||n.tool).localeCompare(String(s.label||s.tool))).map(([,t])=>t)}function hv(e){const t=new Map;for(const n of e)t.set(n.tool,(t.get(n.tool)||0)+1);return[...t.keys()].sort((n,l)=>t.get(l)-t.get(n)||n.localeCompare(l))}const kc=new Set(["copilot365"]);function Cf(e,t){var l,s,o;if(!e||(l=e.live)!=null&&l.session_count)return!1;const n=(o=(s=t==null?void 0:t.tool_configs)==null?void 0:s.find(i=>i.tool===e.tool))==null?void 0:o.local_data;return n&&Object.keys(n).length?Object.values(n).every(i=>!i):kc.has(e.tool)&&!(e.files||[]).length&&!(e.processes||[]).length}function sl(e,t){return t!=null&&t.length?t.every(n=>{var s;const l=(s=e==null?void 0:e.tools)==null?void 0:s.find(o=>o.tool===n);return l?Cf(l,e):kc.has(n)}):!1}const Ef="Estimated from token counts and list prices. Not a billed amount.";function Tf(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/mac|iphone|ipad/i.test(e)}function mv(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/win/i.test(e)&&!/darwin/i.test(e)}function Sc(){return Tf()?"⌘K":"Ctrl+K"}/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xc=(...e)=>e.filter((t,n,l)=>!!t&&t.trim()!==""&&l.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tr=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Af=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,n,l)=>l?l.toUpperCase():n.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ar=e=>{const t=Af(e);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Lf={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Df=Wa({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),Pf=()=>bs(Df);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Of=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rf=({color:e,size:t,strokeWidth:n,absoluteStrokeWidth:l,children:s,iconNode:o,class:i="",...r})=>{const{size:a=24,strokeWidth:u=2,absoluteStrokeWidth:p=!1,color:d="currentColor",class:m=""}=Pf()??{},v=l??p?Number(n??u)*24/Number(t??a):n??u;return mn("svg",{...Lf,width:t??a??24,height:t??a??24,stroke:e??d,"stroke-width":v,class:xc("lucide",m,i),...!s&&!Of(r)&&{"aria-hidden":"true"},...r},[...o.map(([w,A])=>mn(w,A)),...Pl(s)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=(e,t)=>{const n=({class:l="",className:s="",children:o,...i})=>mn(Rf,{...i,iconNode:t,class:xc(`lucide-${Tr(Ar(e))}`,`lucide-${Tr(e)}`,l,s)},o);return n.displayName=Ar(e),n};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const If=J("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nf=J("archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zf=J("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vf=J("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ff=J("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hf=J("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uf=J("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bf=J("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jf=J("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wf=J("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qf=J("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kf=J("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gf=J("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yf=J("coins",[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jf=J("command",[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3",key:"11bfej"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zf=J("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qf=J("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xf=J("file-pen",[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ep=J("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tp=J("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const np=J("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lp=J("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sp=J("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const op=J("grid-3x3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ip=J("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rp=J("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ap=J("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cp=J("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const up=J("menu",[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dp=J("message-square",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fp=J("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pp=J("package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hp=J("pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mp=J("plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _p=J("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vp=J("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gp=J("save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mc=J("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yp=J("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bp=J("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $p=J("sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wp=J("trash-2",[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kp=J("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sp=J("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xp=J("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mp=J("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cp=J("webhook",[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ep=J("wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tp=J("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ap=J("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Lp={activity:If,"alert-triangle":kp,filter:np,"eye-off":Qf,archive:Nf,banknote:zf,"bar-chart-3":Bf,"book-open":Vf,bot:Ff,brain:Uf,"brain-circuit":Hf,"chevron-down":Wf,"chevron-right":qf,"clipboard-list":Kf,clock:Gf,coins:Yf,cpu:Zf,"file-pen":Xf,"file-text":ep,folder:tp,"git-branch":lp,globe:sp,"grid-3x3":op,layers:rp,"layout-dashboard":ip,"line-chart":jf,lock:ap,mail:cp,"message-square":dp,moon:fp,package:pp,pen:hp,plug:mp,radio:_p,"refresh-cw":vp,search:Mc,server:yp,settings:bp,sun:$p,user:Sp,users:xp,wallet:Mp,webhook:Cp,wrench:Ep,x:Tp,zap:Ap};function Zt({name:e,size:t="1em",strokeWidth:n=2,...l}){if(!e)return null;const s=Lp[String(e)];return s?g`<${s} size=${t} strokeWidth=${n} aria-hidden="true" ...${l} />`:g`<span aria-hidden="true" ...${l}>${e}</span>`}function Dp({tool:e,tools:t}){const n=(t||[e]).filter(Boolean).map(l=>l.label||l.tool).join(", ");return g`<div class="panel-state panel-state--withheld" role="status">
    <${Zt} name="radio" size="14"/>
    <div>
      <div class="panel-state__title">Not available from this machine</div>
      <div class="panel-state__hint">${n} runs in the vendor's cloud, so it leaves no local sessions, processes, tokens or files for aictl to read. Its activity is visible only in the vendor's admin reports.</div>
    </div>
  </div>`}function Pp({enabledTools:e,what:t}){return e==null?null:g`<div class="panel-state panel-state--note" role="note">
    <${Zt} name="filter" size="12"/>
    <span>${t} cover all tools: the tool filter does not apply, because these figures have no per-tool split.</span>
  </div>`}const Op=new Set(["overview","live","procs","events","explorer"]),Rp=3e4;function Ip(e,t,{activeTab:n,now:l=Date.now()}){var r;const s={value:t,at:l,tab:n};return!e||Op.has(n)||e.tab!==n||!!!((r=e.value)!=null&&r.snap)&&t.snap||!(e.value.enabledTools===t.enabledTools&&e.value.globalRange===t.globalRange&&e.value.openViewer===t.openViewer&&e.value.recentFiles===t.recentFiles)||l-e.at>=Rp?s:e}function Np({path:e,at:t,onClose:n}){const{snap:l}=bs(Rl),[s,o]=Q(null),[i,r]=Q(!1),[a,u]=Q(null),p=ee(null),d=ee(null),[m,v]=Q(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),w=ee(!1),A=ee(0),k=ee(0),M=se(L=>{w.current=!0,A.current=L.clientX,k.current=m,L.preventDefault()},[m]);if(ce(()=>{const L=N=>{if(!w.current)return;const I=A.current-N.clientX,O=window.innerWidth,Y=Math.min(90,Math.max(20,k.current+I/O*100));v(Y)},D=()=>{if(w.current){w.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(m)))}catch{}}};return window.addEventListener("mousemove",L),window.addEventListener("mouseup",D),()=>{window.removeEventListener("mousemove",L),window.removeEventListener("mouseup",D)}},[m]),ce(()=>{if(!e)return;d.current=document.activeElement;const L=setTimeout(()=>{var I;const N=(I=p.current)==null?void 0:I.querySelector("button");N&&N.focus()},50),D=N=>{if(N.key!=="Tab"||!p.current)return;const I=p.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!I.length)return;const O=I[0],Y=I[I.length-1];N.shiftKey&&document.activeElement===O?(N.preventDefault(),Y.focus()):!N.shiftKey&&document.activeElement===Y&&(N.preventDefault(),O.focus())};return document.addEventListener("keydown",D),()=>{clearTimeout(L),document.removeEventListener("keydown",D),d.current&&d.current.focus&&d.current.focus()}},[e]),ce(()=>{if(!e)return;r(!1),u(null),o(null),(t?Vd(e,t):zd(e)).then(o).catch(D=>u(D.message))},[e,t]),!e)return null;const b=De(()=>{if(!l)return"";for(const L of l.tools)for(const D of L.files)if(D.path===e)return(D.kind||"")+" | "+Jt(D.size)+" | ~"+_t(D.tokens)+"tok | scope:"+(D.scope||"?")+" | sent_to_llm:"+(D.sent_to_llm||"?")+" | loaded:"+(D.loaded_when||"?");for(const L of l.agent_memory)if(L.file===e)return L.source+" | "+L.profile+" | "+L.tokens+"tok | "+L.lines+"ln";return""},[l,e]),x=s?s.split(`
`):[],C=x.length,S=C>Zn*2,T=(L,D)=>L.map((N,I)=>g`<div class="fv-line"><span class="fv-ln">${D+I}</span><span class="fv-code">${ll(N)||" "}</span></div>`);return g`<div class="fv" ref=${p} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+m+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${M}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      ${t&&g`<span class="badge text-xs mono" style="background:var(--bg2);color:var(--fg2);margin-left:var(--sp-2)"
        title=${"Historical content at unix ts "+t}>@ ${new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>`}
      <button onClick=${n} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${b}</div>
    <div class="fv-body">
      ${a?g`<p class="text-red" style="padding:var(--sp-10)">${a}</p>`:s?!S||i?g`<div class="fv-lines">${T(x,1)}</div>`:g`<div class="fv-lines">${T(x.slice(0,Zn),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>r(!0)}>\u25BC ${C-Zn*2} more lines \u25BC</div>
            <div class="fv-lines">${T(x.slice(-Zn),C-Zn+1)}</div>`:g`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${C} lines${S&&!i?" (showing "+Zn*2+" of "+C+")":""}</span>
      ${S&&g`<button onClick=${()=>r(!i)}>${i?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function fn({variant:e="secondary",size:t="md",loading:n=!1,disabled:l=!1,type:s="button",onClick:o,class:i,className:r,children:a,...u}){const p=["aictl-ui-btn",`aictl-ui-btn--${e}`,t==="sm"?"aictl-ui-btn--sm":null,i,r].filter(Boolean).join(" "),d=l||n;return g`<button
    type=${s}
    class=${p}
    disabled=${d}
    aria-busy=${n?"true":null}
    onClick=${d?void 0:o}
    ...${u}
  >${n?g`<span class="aictl-ui-btn__spinner" aria-hidden="true"></span>`:null}${a}</button>`}function Lr({variant:e="neutral",size:t="sm",dot:n=!1,class:l,className:s,children:o,...i}){const r=["aictl-ui-badge",`aictl-ui-badge--${e}`,t==="md"?"aictl-ui-badge--md":null,l,s].filter(Boolean).join(" ");return g`<span class=${r} ...${i}>
    ${n?g`<span class="aictl-ui-badge__dot" aria-hidden="true"></span>`:null}
    ${o}
  </span>`}function zp(e,t,n){let s=0,o=0;switch(n){case"top":s=e.top-t.height-6,o=e.left+(e.width-t.width)/2;break;case"bottom":s=e.bottom+6,o=e.left+(e.width-t.width)/2;break;case"left":s=e.top+(e.height-t.height)/2,o=e.left-t.width-6;break;case"right":default:s=e.top+(e.height-t.height)/2,o=e.right+6;break}const i=window.innerWidth,r=window.innerHeight;return o=Math.max(4,Math.min(o,i-t.width-4)),s=Math.max(4,Math.min(s,r-t.height-4)),{top:s,left:o}}function Dr({content:e,placement:t="top",open:n,onOpenChange:l,children:s,class:o,className:i,...r}){const[a,u]=Q(!1),p=n!==void 0?n:a,d=se(C=>{n===void 0&&u(C),l&&l(C)},[n,l]),m=ee(null),v=ee(null),w=od(),[A,k]=Q({top:-9999,left:-9999});ce(()=>{if(!p)return;const C=m.current,S=v.current;if(!C||!S)return;const T=()=>k(zp(C.getBoundingClientRect(),S.getBoundingClientRect(),t));return T(),window.addEventListener("scroll",T,!0),window.addEventListener("resize",T),()=>{window.removeEventListener("scroll",T,!0),window.removeEventListener("resize",T)}},[p,t,e]);const M=()=>d(!0),b=()=>d(!1),x=["aictl-ui-tooltip-wrap",o,i].filter(Boolean).join(" ");return g`<span
    ref=${m}
    class=${x}
    onMouseEnter=${M}
    onMouseLeave=${b}
    onFocusIn=${M}
    onFocusOut=${b}
    aria-describedby=${p?w:null}
    ...${r}
  >
    ${s}
    ${p?g`<span
      ref=${v}
      id=${w}
      role="tooltip"
      class="aictl-ui-tooltip"
      style=${`top:${A.top}px;left:${A.left}px`}
    >${e}</span>`:null}
  </span>`}function Vp(e,t,n){let s=0,o=0;switch(n){case"top":s=e.top-t.height-6,o=e.left;break;case"left":s=e.top,o=e.left-t.width-6;break;case"right":s=e.top,o=e.right+6;break;case"bottom":default:s=e.bottom+6,o=e.left;break}const i=window.innerWidth,r=window.innerHeight;return o=Math.max(4,Math.min(o,i-t.width-4)),s=Math.max(4,Math.min(s,r-t.height-4)),{top:s,left:o}}const Pr='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function ps({trigger:e,placement:t="bottom",open:n,onOpenChange:l,children:s,class:o,className:i,...r}){const[a,u]=Q(!1),p=n!==void 0?n:a,d=se(b=>{n===void 0&&u(b),l&&l(b)},[n,l]),m=ee(null),v=ee(null),[w,A]=Q({top:-9999,left:-9999});ce(()=>{if(!p)return;const b=m.current,x=v.current;if(!b||!x)return;const C=()=>A(Vp(b.getBoundingClientRect(),x.getBoundingClientRect(),t));C();const S=D=>{!x.contains(D.target)&&!b.contains(D.target)&&d(!1)},T=D=>{if(D.key==="Escape"){d(!1),b.focus&&b.focus();return}if(D.key==="Tab"){const N=x.querySelectorAll(Pr);if(!N.length)return;const I=N[0],O=N[N.length-1];D.shiftKey&&document.activeElement===I?(D.preventDefault(),O.focus()):!D.shiftKey&&document.activeElement===O&&(D.preventDefault(),I.focus())}};document.addEventListener("mousedown",S),document.addEventListener("keydown",T),window.addEventListener("resize",C);const L=x.querySelector(Pr);return L?L.focus():x.focus(),()=>{document.removeEventListener("mousedown",S),document.removeEventListener("keydown",T),window.removeEventListener("resize",C)}},[p,t,d]);const k=b=>{b.stopPropagation(),d(!p)},M=["aictl-ui-popover",o,i].filter(Boolean).join(" ");return g`<span style="display:inline-flex;position:relative" ...${r}>
    <span ref=${m} onClick=${k}>${e}</span>
    ${p?g`<div
      ref=${v}
      class=${M}
      role="dialog"
      tabindex="-1"
      style=${`top:${w.top}px;left:${w.left}px`}
    >${s}</div>`:null}
  </span>`}const Or='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function cl({open:e,onClose:t,ariaLabel:n,labelledBy:l,children:s,closeOnBackdrop:o=!0,class:i,className:r,...a}){const u=ee(null),p=ee(null),d=se(()=>{t&&t()},[t]);if(ce(()=>{if(!e)return;p.current=document.activeElement;const w=u.current;if(!w)return;(w.querySelector(Or)||w).focus();const k=M=>{if(M.key==="Escape"){M.stopPropagation(),d();return}if(M.key==="Tab"){const b=w.querySelectorAll(Or);if(!b.length){M.preventDefault();return}const x=b[0],C=b[b.length-1];M.shiftKey&&document.activeElement===x?(M.preventDefault(),C.focus()):!M.shiftKey&&document.activeElement===C&&(M.preventDefault(),x.focus())}};return document.addEventListener("keydown",k),()=>{document.removeEventListener("keydown",k),p.current&&p.current.focus&&p.current.focus()}},[e,d]),!e)return null;const m=w=>{o&&w.target===w.currentTarget&&d()},v=["aictl-ui-dialog",i,r].filter(Boolean).join(" ");return g`<div class="aictl-ui-dialog-backdrop" onMouseDown=${m}>
    <div
      ref=${u}
      class=${v}
      role="dialog"
      aria-modal="true"
      aria-label=${n||null}
      aria-labelledby=${l||null}
      tabindex="-1"
      ...${a}
    >${s}</div>
  </div>`}function Fp({options:e=[],value:t,onChange:n,ariaLabel:l,class:s,className:o,...i}){const r=["aictl-ui-segmented",s,o].filter(Boolean).join(" "),a=ee([]),u=p=>{var v;if(!e.length)return;const d=Math.max(0,e.findIndex(w=>w.value===t));let m=null;p.key==="ArrowRight"||p.key==="ArrowDown"?m=(d+1)%e.length:p.key==="ArrowLeft"||p.key==="ArrowUp"?m=(d-1+e.length)%e.length:p.key==="Home"?m=0:p.key==="End"&&(m=e.length-1),m!=null&&(p.preventDefault(),n&&n(e[m].value),(v=a.current[m])==null||v.focus())};return g`<div
    class=${r}
    role="radiogroup"
    aria-label=${l||null}
    ...${i}
  >${e.map((p,d)=>{const m=p.value===t;return g`<button
      key=${p.value}
      ref=${v=>{a.current[d]=v}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${m?"true":"false"}
      tabindex=${m?"0":"-1"}
      onClick=${()=>n&&n(p.value)}
      onKeyDown=${u}
    >${p.icon?g`<${Zt} name=${p.icon} size="0.9em"/>`:null}${p.label}</button>`})}</div>`}function ot({class:e,className:t,children:n,...l}){const s=["aictl-ui-kbd",e,t].filter(Boolean).join(" ");return g`<kbd class=${s} ...${l}>${n}</kbd>`}function Cc({icon:e,title:t,description:n,action:l,source:s,class:o,className:i,...r}){const a=["aictl-ui-empty",o,i].filter(Boolean).join(" ");return g`<div class=${a} role="status" ...${r}>
    ${e?g`<div class="aictl-ui-empty__icon">
      ${typeof e=="string"?g`<${Zt} name=${e} size="32"/>`:e}
    </div>`:null}
    ${t?g`<div class="aictl-ui-empty__title">${t}</div>`:null}
    ${n?g`<div class="aictl-ui-empty__desc">${n}</div>`:null}
    ${l?g`<div>${l}</div>`:null}
    ${s?g`<div class="aictl-ui-empty__source" title="Data source for this view">${s}</div>`:null}
  </div>`}function ol({height:e="1em",width:t="100%",radius:n="4px",count:l=1,class:s,className:o,style:i,...r}){const a=["aictl-ui-skel",s,o].filter(Boolean).join(" "),u={height:e,width:t,borderRadius:n};if(l<=1)return g`<span class=${a} style=${{...u,...i||{}}} aria-hidden="true" ...${r}></span>`;const p=[];for(let d=0;d<l;d++)p.push(d);return g`<span style="display:flex;flex-direction:column;gap:var(--sp-2)" aria-hidden="true" ...${r}>
    ${p.map(d=>g`<span key=${d} class=${a} style=${{...u,...i||{}}}></span>`)}
  </span>`}const Hp=window.TOOL_VENDORS??{},Up={"claude-code":"anthropic","claude-desktop":"anthropic","claude-mcp-memory":"anthropic",copilot:"github","copilot-vscode":"github","copilot-cli":"github","copilot-desktop":"github","copilot-jetbrains":"github","copilot-vs":"github",copilot365:"microsoft","codex-cli":"openai","chatgpt-desktop":"openai","chatgpt-lencx":"openai",gemini:"google","gemini-cli":"google",cursor:"cursor-inc",windsurf:"codeium",openclaw:"community",vscode:"microsoft"},Rr={anthropic:'<path d="M12 4.5V19.5"/><path d="M4.5 12H19.5"/><path d="M6.7 6.7 17.3 17.3"/><path d="M17.3 6.7 6.7 17.3"/>',github:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',microsoft:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',openai:'<path d="M12 3.2 19.6 7.6V16.4L12 20.8 4.4 16.4V7.6Z" fill="none"/>',google:'<path d="M12 3.2C12 8 16 12 20.8 12C16 12 12 16 12 20.8C12 16 8 12 3.2 12C8 12 12 8 12 3.2Z" stroke="none" fill="currentColor"/>',"cursor-inc":'<path d="M6 3.5 6 18 10 14 12.6 19.5 15 18.4 12.4 13 18 13Z" fill="none" stroke-linejoin="round"/>',codeium:'<path d="M11.5 4 16 12.5H11.5Z" stroke="none" fill="currentColor"/><path d="M4 16C7 12.5 9.5 12.5 12 16 14.5 19.5 17 19.5 20 16" fill="none" stroke-linecap="round"/>',community:'<path d="M17 4.5C10 5.5 5.5 9.5 5.5 13.5 5.5 17 8 19.5 11.5 19.5" fill="none" stroke-linecap="round"/><path d="M17 4.5 13.5 6M17 4.5 18.8 7.8" stroke-linecap="round"/>',_fallback:'<circle cx="12" cy="12" r="4.5" stroke="none" fill="currentColor"/>'};function Bp(e){return Hp[e]||Up[e]||""}function Ss({tool:e,size:t="1em",strokeWidth:n=2,...l}){const s=Bp(e),o=Rr[s]||Rr._fallback,i=el[e]||"var(--fg2)";return g`<svg class="tool-ico" viewBox="0 0 24 24" width=${t} height=${t}
    fill="none" stroke="currentColor" stroke-width=${n} stroke-linecap="round"
    style=${"color:"+i} aria-hidden="true" ...${l}
    dangerouslySetInnerHTML=${{__html:o}}></svg>`}const To=new Set;let jp=0;const ro=3,Wp=5e3;function Ec(e){To.forEach(t=>{try{t(e)}catch{}})}function qp(e){return To.add(e),()=>To.delete(e)}function ao(e,t,n={}){const l=++jp;return Ec({type:"add",toast:{id:l,variant:e,message:t,ttl:n.ttl||Wp}}),l}function Tc(e){Ec({type:"remove",id:e})}const Ao={success:(e,t)=>ao("success",e,t),error:(e,t)=>ao("error",e,t),info:(e,t)=>ao("info",e,t),dismiss:Tc};function Kp(){const[e,t]=Q([]),n=ee(new Map);ce(()=>{const o=n.current,i=a=>{const u=o.get(a);u!=null&&u.tid&&clearTimeout(u.tid),o.delete(a)},r=qp(a=>{if(a.type==="add"){t(p=>{const d=[...p,a.toast];return d.length>ro?(d.slice(0,d.length-ro).forEach(m=>i(m.id)),d.slice(d.length-ro)):d});const u=setTimeout(()=>{t(p=>p.filter(d=>d.id!==a.toast.id)),o.delete(a.toast.id)},a.toast.ttl);o.set(a.toast.id,{tid:u,expiresAt:Date.now()+a.toast.ttl,remaining:null})}else a.type==="remove"&&(i(a.id),t(u=>u.filter(p=>p.id!==a.id)))});return()=>{r(),o.forEach(a=>{a.tid&&clearTimeout(a.tid)}),o.clear()}},[]);const l=se(o=>{const r=n.current.get(o);!r||r.tid==null||(clearTimeout(r.tid),r.tid=null,r.remaining=Math.max(500,r.expiresAt-Date.now()))},[]),s=se(o=>{const i=n.current,r=i.get(o);if(!r||r.tid!=null)return;const a=r.remaining??500;r.expiresAt=Date.now()+a,r.remaining=null,r.tid=setTimeout(()=>{t(u=>u.filter(p=>p.id!==o)),i.delete(o)},a)},[]);return e.length?g`<div class="aictl-ui-toast-stack" role="region" aria-label="Notifications">
    ${e.map(o=>g`<div
      key=${o.id}
      class=${`aictl-ui-toast aictl-ui-toast--${o.variant}`}
      role=${o.variant==="error"?"alert":"status"}
      onMouseEnter=${()=>l(o.id)}
      onMouseLeave=${()=>s(o.id)}
      onFocusIn=${()=>l(o.id)}
      onFocusOut=${()=>s(o.id)}
    >
      <span class="aictl-ui-toast__msg">${o.message}</span>
      <button type="button" class="aictl-ui-toast__dismiss"
        aria-label="Dismiss notification"
        onClick=${()=>Tc(o.id)}>×</button>
    </div>`)}
  </div>`:null}const Gp={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"},Yp={error:"var(--red)",warning:"var(--orange)"},Ir=20;function Nr(){var k,M,b,x,C;const{snap:e}=bs(Rl),[t,n]=Q(null),[l,s]=Q(null),[o,i]=Q(null),[r,a]=Q(null);ce(()=>{let S=!0;const T=()=>{lc().then(D=>{S&&n(D)}).catch(()=>{}),sc().then(D=>{S&&s(D)}).catch(()=>{}),oc({limit:Ir}).then(D=>{S&&i(Array.isArray(D==null?void 0:D.items)?D.items:[])}).catch(()=>{}),Sd().then(D=>{S&&a(Array.isArray(D==null?void 0:D.ingesters)?D.ingesters:[])}).catch(()=>{})};T();const L=setInterval(T,15e3);return()=>{S=!1,clearInterval(L)}},[]);const u=De(()=>{if(!e)return[];const S=e.tool_telemetry||[];return e.tools.filter(T=>T.tool!=="aictl"&&T.tool!=="any").map(T=>{var Y,U,G,B,W;const L=S.find(j=>j.tool===T.tool),D=T.live||{},N=D.last_seen_at||0,I=N>0?Math.floor(Date.now()/1e3-N):-1,O=I>3600||I<0;return{tool:T.tool,label:T.label,source:(L==null?void 0:L.source)||(D.session_count?"live-monitor":"discovery"),confidence:(L==null?void 0:L.confidence)||((Y=D.token_estimate)==null?void 0:Y.confidence)||0,inputTokens:(L==null?void 0:L.input_tokens)||0,outputTokens:(L==null?void 0:L.output_tokens)||0,cost:(L==null?void 0:L.cost_usd)??null,sessions:(L==null?void 0:L.total_sessions)||D.session_count||0,errors:((U=L==null?void 0:L.errors)==null?void 0:U.length)||0,lastError:((G=L==null?void 0:L.errors)==null?void 0:G[0])||null,lastSeen:I,stale:O,fileCount:T.files.length,procCount:T.processes.length,hasLive:!!T.live,hasOtel:!!((W=(B=D.sources||[]).includes)!=null&&W.call(B,"otel"))}}).sort((T,L)=>L.inputTokens+L.outputTokens-(T.inputTokens+T.outputTokens))},[e]),p=De(()=>{var S;return(S=e==null?void 0:e.live_monitor)!=null&&S.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([T,L])=>({name:T,status:L.status||"unknown",mode:L.mode||"",detail:L.detail||""})):[]},[e]);if(!e)return null;const d=u.length,m=u.filter(S=>S.inputTokens+S.outputTokens>0).length,v=u.filter(S=>S.hasLive).length,w=u.filter(S=>S.stale&&S.hasLive).length,A=u.reduce((S,T)=>S+T.errors,0);return g`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--on-status)">${m}/${d} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--on-status)">${v} live</span>
      ${w>0?g`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--on-status)">${w} stale</span>`:null}
      ${A>0?g`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--on-status)">${A} errors</span>`:null}
      ${t!=null&&t.active?g`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--on-status)">OTel active</span>`:g`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${l?g`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">aictl Monitor Service <span class="text-muted text-xs">(self)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">CPU</div>
          <div class="metric-chip-value">${al(l.cpu_percent||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Memory (RSS)</div>
          <div class="metric-chip-value">${Jt(l.memory_rss_bytes||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Size</div>
          <div class="metric-chip-value">${Jt(((k=l.db)==null?void 0:k.file_size_bytes)||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Uptime</div>
          <div class="metric-chip-value">${Yo(l.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${l.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${_t((((M=l.db)==null?void 0:M.metrics_count)||0)+(((b=l.db)==null?void 0:b.tool_metrics_count)||0)+(((x=l.db)==null?void 0:x.events_count)||0)+(((C=l.db)==null?void 0:C.samples_count)||0))}</div>
        </div>
      </div>
      ${l.sink?g`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Emitted</div>
          <div class="metric-chip-value">${_t(l.sink.total_emitted||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Flushed</div>
          <div class="metric-chip-value">${_t(l.sink.total_flushed||0)}</div>
        </div>
        <div class="metric-chip" style="${(l.sink.total_dropped||0)>0?"background:rgba(248,113,113,0.15);border:1px solid var(--red)":""}">
          <div class="metric-chip-label" style="${(l.sink.total_dropped||0)>0?"color:var(--red);font-weight:600":"color:var(--fg2)"}">Dropped</div>
          <div class="metric-chip-value" style="${(l.sink.total_dropped||0)>0?"color:var(--red)":""}">${_t(l.sink.total_dropped||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Tracked</div>
          <div class="metric-chip-value">${_t(l.sink.metrics_tracked||0)}</div>
        </div>
      </div>
      ${l.sink.is_flooding?g`<div role="alert" style="margin-top:var(--sp-2);padding:var(--sp-2) var(--sp-3);background:rgba(248,113,113,0.15);border:1px solid var(--red);border-radius:4px;color:var(--red);font-size:var(--fs-xs);font-weight:600">
        DATA LOSS: Flood protection active \u2014 dropping samples (>${l.sink.total_dropped} lost)
      </div>`:null}`:null}
      <div class="text-xs text-muted" style="margin-top:var(--sp-1)">
        PID ${l.pid} \u00b7 These metrics are about the aictl monitoring service itself, not the AI tools it monitors.
      </div>
    </div>`:null}

    <!-- OTel receiver stats -->
    ${t?g`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">OTel Receiver</div>
      <div class="flex-row gap-md flex-wrap">
        <span>Metrics: <strong>${t.metrics_received||0}</strong></span>
        <span>Events: <strong>${t.events_received||0}</strong></span>
        <span>API calls: <strong>${t.api_calls_total||0}</strong></span>
        ${t.api_errors_total>0?g`<span class="text-red">Errors: <strong>${t.api_errors_total}</strong></span>`:null}
        ${t.errors>0?g`<span class="text-orange">Parse errors: <strong>${t.errors}</strong></span>`:null}
        ${t.dropped>0?g`<span class="text-orange" title="malformed attributes / data points skipped during parsing">Dropped: <strong>${t.dropped}</strong></span>`:null}
        ${t.last_receive_at>0?g`<span class="text-muted">Last: ${es(t.last_receive_at)}</span>`:null}
      </div>
    </div>`:null}

    <!-- Local-store ingesters (copilot / cursor / vscode chat pollers) -->
    ${r!=null?g`<div class="mb-md" data-dp="overview.collector_health.ingesters">
      <div class="es-section-title">Ingesters</div>
      ${r.length===0?g`<div class="text-xs text-muted">No ingesters running</div>`:r.map(S=>{const T=S.last_poll_ts?es(S.last_poll_ts):"never polled";return g`<div key=${S.name}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span aria-hidden="true"
                title=${S.source_exists?"source present":"source missing"}
                style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${S.source_exists?"var(--green)":"var(--fg2)"}"></span>
              <span class="mono text-xs" style="min-width:170px" title=${S.source_path||""}>${ll(S.name)}</span>
              <span class="sr-only">${S.source_exists?"source present":"source missing"}</span>
              <span class="text-xs text-muted" title="last poll" style="min-width:80px">${T}</span>
              <span class="text-xs" style="margin-left:auto"
                title="rows inserted on the last poll">+${S.last_poll_inserted||0} rows</span>
              ${S.rows_ingested_total!=null?g`<span class="text-xs text-muted" title="cumulative rows ingested">${_t(S.rows_ingested_total)} total</span>`:null}
            </div>`})}
    </div>`:null}

    <!-- Per-tool health table -->
    <div class="mb-md">
      <div class="es-section-title">Per-Tool Status</div>
      <div style="overflow-x:auto">
        <table role="table" class="text-sm" style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2)">Tool</th>
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2)">Source</th>
            <th style="text-align:center;padding:var(--sp-1) var(--sp-2)">Conf</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Input tok</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Output tok</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Sessions</th>
            <th style="text-align:center;padding:var(--sp-1) var(--sp-2)">Errors</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Last seen</th>
            <th style="text-align:right;padding:var(--sp-1) var(--sp-2)">Files</th>
          </tr></thead>
          <tbody>${u.map(S=>{var T;return g`<tr key=${S.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${S.stale&&!S.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <${Ss} tool=${S.tool} size="1em"/>
              ${ll(S.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${S.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${S.confidence>=.9?"var(--green)":S.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${S.confidence>0?al(S.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.inputTokens?_t(S.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.outputTokens?_t(S.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${S.errors>0?g`<span class="text-red" title=${((T=S.lastError)==null?void 0:T.message)||""}>${S.errors}</span>`:g`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${S.lastSeen>=0?g`<span style="color:${S.stale?"var(--orange)":"var(--fg2)"}">${es(Date.now()/1e3-S.lastSeen)}</span>`:g`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Data-quality events (sink flood-protection, ingester failures, …) -->
    ${o!=null?g`<div class="mb-md" data-dp="overview.collector_health.data_quality">
      <div class="es-section-title">Data Quality</div>
      ${o.length===0?g`<div class="text-xs text-muted">No data-quality events</div>`:o.slice(0,Ir).map((S,T)=>{const L=Yp[S.severity]||"var(--fg2)",D=[S.component,S.source].filter(Boolean).join(" · ");return g`<div key=${(S.component||"")+":"+(S.source||"")+":"+T}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span class="badge" style="background:${L};color:var(--on-status);font-size:var(--fs-2xs)">
                ${S.severity||S.status||"info"}</span>
              <span class="mono text-xs" style="white-space:nowrap" title=${"kind: "+(S.kind||"—")+" · status: "+(S.status||"—")+(S.count?" · seen "+S.count+"x":"")}>${D||"—"}</span>
              <span class="text-xs" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                title=${S.message||""}>${S.message||"—"}</span>
              <span class="text-xs text-muted" style="white-space:nowrap">${es(S.updated_at)}</span>
            </div>`})}
    </div>`:null}

    <!-- Collector pipeline status -->
    ${p.length>0?g`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${p.map(S=>g`<div key=${S.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${Gp[S.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${S.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${S.status}</span>
          </div>
          ${S.detail?g`<div class="text-xs text-muted" style="margin-top:2px">${ll(S.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let co=null;function Jp(){return co?Promise.resolve(co):Cd().then(e=>{const t={};for(const n of e||[])t[n.key]=n;return co=t,t}).catch(()=>({}))}function Zp(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),n=t.match(/^[^.!?]+[.!?]/);return n?n[0].trim():t.slice(0,120)}const Qp={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},Xp={raw:"raw",deduced:"deduced",aggregated:"agg"};function eh(){const[e,t]=Q(null),[n,l]=Q({x:0,y:0}),[s,o]=Q(!1),i=ee(null),r=ee(null),a=se(k=>{const M=k.getAttribute("data-dp");M&&Jp().then(b=>{const x=b[M];if(!x)return;const C=k.getBoundingClientRect();l({x:C.left,y:C.bottom+4}),t(x),o(!1)})},[]),u=se(()=>{r.current=setTimeout(()=>{t(null),o(!1)},120)},[]),p=se(()=>{r.current&&(clearTimeout(r.current),r.current=null)},[]);if(ce(()=>{function k(x){const C=x.target.closest("[data-dp]");C&&(p(),a(C))}function M(x){x.target.closest("[data-dp]")&&u()}function b(x){x.target.closest("[data-dp]")&&e&&(x.preventDefault(),o(S=>!S))}return document.addEventListener("mouseover",k,!0),document.addEventListener("mouseout",M,!0),document.addEventListener("click",b,!0),document.addEventListener("focusin",k,!0),document.addEventListener("focusout",M,!0),()=>{document.removeEventListener("mouseover",k,!0),document.removeEventListener("mouseout",M,!0),document.removeEventListener("click",b,!0),document.removeEventListener("focusin",k,!0),document.removeEventListener("focusout",M,!0)}},[a,u,p,e]),!e)return null;const m=Math.min(n.x,window.innerWidth-320-8),v=Math.min(n.y,window.innerHeight-180),w=Xp[e.source_type]||e.source_type,A=Qp[e.unit]||e.unit;return g`<div class="dp-tooltip" ref=${i}
    style=${"left:"+m+"px;top:"+v+"px"}
    onMouseEnter=${p} onMouseLeave=${u}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${w}</span>
      ${A&&g`<span class="dp-tooltip-unit">${A}</span>`}
    </div>
    <div class="dp-tooltip-body">${Zp(e.explanation)}</div>
    ${s&&g`<div class="dp-tooltip-detail">
      <div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Source</div>
        <div>${e.source_static||e.source||"—"}</div>
      </div>
      ${e.source_dynamic&&g`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Live provenance</div>
        <div>${typeof e.source_dynamic=="string"?e.source_dynamic:JSON.stringify(e.source_dynamic)}</div>
      </div>`}
      ${e.query&&g`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Query</div>
        <code class="dp-tooltip-code">${e.query}</code>
      </div>`}
      ${e.otel_metric&&g`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">OTel metric</div>
        <code>${e.otel_metric}</code>
      </div>`}
    </div>`}
    ${!s&&g`<div class="dp-tooltip-hint">click for details</div>`}
  </div>`}class zr extends Yt{constructor(t){super(t),this.state={hasError:!1,error:null}}static getDerivedStateFromError(t){return{hasError:!0,error:t}}componentDidCatch(t,n){console.error("Dashboard error:",t,n);try{Ao.error("Something went wrong in this view")}catch{}}render(){var t;if(this.state.hasError){const n=((t=this.state.error)==null?void 0:t.message)||"Unknown error";return g`<div role="alert">
        <${Cc}
          icon="alert-triangle"
          title="Something went wrong"
          description=${n}
          action=${g`<${fn} variant="primary" onClick=${()=>this.setState({hasError:!1,error:null})}>Retry</${fn}>`}
        />
      </div>`}return this.props.children}}const th=!0,We="u-",nh="uplot",lh=We+"hz",sh=We+"vt",oh=We+"title",ih=We+"wrap",rh=We+"under",ah=We+"over",ch=We+"axis",Tn=We+"off",uh=We+"select",dh=We+"cursor-x",fh=We+"cursor-y",ph=We+"cursor-pt",hh=We+"legend",mh=We+"live",_h=We+"inline",vh=We+"series",gh=We+"marker",Vr=We+"label",yh=We+"value",Cl="width",El="height",Sl="top",Fr="bottom",Qn="left",uo="right",Xo="#000",Hr=Xo+"0",fo="mousemove",Ur="mousedown",po="mouseup",Br="mouseenter",jr="mouseleave",Wr="dblclick",bh="resize",$h="scroll",qr="change",hs="dppxchange",ei="--",hl=typeof window<"u",Lo=hl?document:null,il=hl?window:null,wh=hl?navigator:null;let _e,ts;function Do(){let e=devicePixelRatio;_e!=e&&(_e=e,ts&&Oo(qr,ts,Do),ts=matchMedia(`(min-resolution: ${_e-.001}dppx) and (max-resolution: ${_e+.001}dppx)`),Ln(qr,ts,Do),il.dispatchEvent(new CustomEvent(hs)))}function $t(e,t){if(t!=null){let n=e.classList;!n.contains(t)&&n.add(t)}}function Po(e,t){let n=e.classList;n.contains(t)&&n.remove(t)}function Te(e,t,n){e.style[t]=n+"px"}function zt(e,t,n,l){let s=Lo.createElement(e);return t!=null&&$t(s,t),n!=null&&n.insertBefore(s,l),s}function Lt(e,t){return zt("div",e,t)}const Kr=new WeakMap;function Gt(e,t,n,l,s){let o="translate("+t+"px,"+n+"px)",i=Kr.get(e);o!=i&&(e.style.transform=o,Kr.set(e,o),t<0||n<0||t>l||n>s?$t(e,Tn):Po(e,Tn))}const Gr=new WeakMap;function Yr(e,t,n){let l=t+n,s=Gr.get(e);l!=s&&(Gr.set(e,l),e.style.background=t,e.style.borderColor=n)}const Jr=new WeakMap;function Zr(e,t,n,l){let s=t+""+n,o=Jr.get(e);s!=o&&(Jr.set(e,s),e.style.height=n+"px",e.style.width=t+"px",e.style.marginLeft=l?-t/2+"px":0,e.style.marginTop=l?-n/2+"px":0)}const ti={passive:!0},kh={...ti,capture:!0};function Ln(e,t,n,l){t.addEventListener(e,n,l?kh:ti)}function Oo(e,t,n,l){t.removeEventListener(e,n,ti)}hl&&Do();function Vt(e,t,n,l){let s;n=n||0,l=l||t.length-1;let o=l<=2147483647;for(;l-n>1;)s=o?n+l>>1:wt((n+l)/2),t[s]<e?n=s:l=s;return e-t[n]<=t[l]-e?n:l}function Ac(e){return(n,l,s)=>{let o=-1,i=-1;for(let r=l;r<=s;r++)if(e(n[r])){o=r;break}for(let r=s;r>=l;r--)if(e(n[r])){i=r;break}return[o,i]}}const Lc=e=>e!=null,Dc=e=>e!=null&&e>0,xs=Ac(Lc),Sh=Ac(Dc);function xh(e,t,n,l=0,s=!1){let o=s?Sh:xs,i=s?Dc:Lc;[t,n]=o(e,t,n);let r=e[t],a=e[t];if(t>-1)if(l==1)r=e[t],a=e[n];else if(l==-1)r=e[n],a=e[t];else for(let u=t;u<=n;u++){let p=e[u];i(p)&&(p<r?r=p:p>a&&(a=p))}return[r??$e,a??-$e]}function Ms(e,t,n,l){let s=ea(e),o=ea(t);e==t&&(s==-1?(e*=n,t/=n):(e/=n,t*=n));let i=n==10?tn:Pc,r=s==1?wt:Dt,a=o==1?Dt:wt,u=r(i(je(e))),p=a(i(je(t))),d=ul(n,u),m=ul(n,p);return n==10&&(u<0&&(d=we(d,-u)),p<0&&(m=we(m,-p))),l||n==2?(e=d*s,t=m*o):(e=Nc(e,d),t=Cs(t,m)),[e,t]}function ni(e,t,n,l){let s=Ms(e,t,n,l);return e==0&&(s[0]=0),t==0&&(s[1]=0),s}const li=.1,Qr={mode:3,pad:li},Ll={pad:0,soft:null,mode:0},Mh={min:Ll,max:Ll};function ms(e,t,n,l){return Es(n)?Xr(e,t,n):(Ll.pad=n,Ll.soft=l?0:null,Ll.mode=l?3:0,Xr(e,t,Mh))}function he(e,t){return e??t}function Ch(e,t,n){for(t=he(t,0),n=he(n,e.length-1);t<=n;){if(e[t]!=null)return!0;t++}return!1}function Xr(e,t,n){let l=n.min,s=n.max,o=he(l.pad,0),i=he(s.pad,0),r=he(l.hard,-$e),a=he(s.hard,$e),u=he(l.soft,$e),p=he(s.soft,-$e),d=he(l.mode,0),m=he(s.mode,0),v=t-e,w=tn(v),A=ut(je(e),je(t)),k=tn(A),M=je(k-w);(v<1e-24||M>10)&&(v=0,(e==0||t==0)&&(v=1e-24,d==2&&u!=$e&&(o=0),m==2&&p!=-$e&&(i=0)));let b=v||A||1e3,x=tn(b),C=ul(10,wt(x)),S=b*(v==0?e==0?.1:1:o),T=we(Nc(e-S,C/10),24),L=e>=u&&(d==1||d==3&&T<=u||d==2&&T>=u)?u:$e,D=ut(r,T<L&&e>=L?L:Ft(L,T)),N=b*(v==0?t==0?.1:1:i),I=we(Cs(t+N,C/10),24),O=t<=p&&(m==1||m==3&&I>=p||m==2&&I<=p)?p:-$e,Y=Ft(a,I>O&&t<=O?O:ut(O,I));return D==Y&&D==0&&(Y=100),[D,Y]}const Eh=new Intl.NumberFormat(hl?wh.language:"en-US"),si=e=>Eh.format(e),kt=Math,rs=kt.PI,je=kt.abs,wt=kt.floor,Be=kt.round,Dt=kt.ceil,Ft=kt.min,ut=kt.max,ul=kt.pow,ea=kt.sign,tn=kt.log10,Pc=kt.log2,Th=(e,t=1)=>kt.sinh(e)*t,ho=(e,t=1)=>kt.asinh(e/t),$e=1/0;function ta(e){return(tn((e^e>>31)-(e>>31))|0)+1}function Ro(e,t,n){return Ft(ut(e,t),n)}function Oc(e){return typeof e=="function"}function ae(e){return Oc(e)?e:()=>e}const Ah=()=>{},Rc=e=>e,Ic=(e,t)=>t,Lh=e=>null,na=e=>!0,la=(e,t)=>e==t,Dh=/\.\d*?(?=9{6,}|0{6,})/gm,Pn=e=>{if(Vc(e)||vn.has(e))return e;const t=`${e}`,n=t.match(Dh);if(n==null)return e;let l=n[0].length-1;if(t.indexOf("e-")!=-1){let[s,o]=t.split("e");return+`${Pn(s)}e${o}`}return we(e,l)};function Cn(e,t){return Pn(we(Pn(e/t))*t)}function Cs(e,t){return Pn(Dt(Pn(e/t))*t)}function Nc(e,t){return Pn(wt(Pn(e/t))*t)}function we(e,t=0){if(Vc(e))return e;let n=10**t,l=e*n*(1+Number.EPSILON);return Be(l)/n}const vn=new Map;function zc(e){return((""+e).split(".")[1]||"").length}function Fl(e,t,n,l){let s=[],o=l.map(zc);for(let i=t;i<n;i++){let r=je(i),a=we(ul(e,i),r);for(let u=0;u<l.length;u++){let p=e==10?+`${l[u]}e${i}`:l[u]*a,d=(i>=0?0:r)+(i>=o[u]?0:o[u]),m=e==10?p:we(p,d);s.push(m),vn.set(m,d)}}return s}const Dl={},oi=[],dl=[null,null],pn=Array.isArray,Vc=Number.isInteger,Ph=e=>e===void 0;function sa(e){return typeof e=="string"}function Es(e){let t=!1;if(e!=null){let n=e.constructor;t=n==null||n==Object}return t}function Oh(e){return e!=null&&typeof e=="object"}const Rh=Object.getPrototypeOf(Uint8Array),Fc="__proto__";function fl(e,t=Es){let n;if(pn(e)){let l=e.find(s=>s!=null);if(pn(l)||t(l)){n=Array(e.length);for(let s=0;s<e.length;s++)n[s]=fl(e[s],t)}else n=e.slice()}else if(e instanceof Rh)n=e.slice();else if(t(e)){n={};for(let l in e)l!=Fc&&(n[l]=fl(e[l],t))}else n=e;return n}function He(e){let t=arguments;for(let n=1;n<t.length;n++){let l=t[n];for(let s in l)s!=Fc&&(Es(e[s])?He(e[s],fl(l[s])):e[s]=fl(l[s]))}return e}const Ih=0,Nh=1,zh=2;function Vh(e,t,n){for(let l=0,s,o=-1;l<t.length;l++){let i=t[l];if(i>o){for(s=i-1;s>=0&&e[s]==null;)e[s--]=null;for(s=i+1;s<n&&e[s]==null;)e[o=s++]=null}}}function Fh(e,t){if(Bh(e)){let i=e[0].slice();for(let r=1;r<e.length;r++)i.push(...e[r].slice(1));return jh(i[0])||(i=Uh(i)),i}let n=new Set;for(let i=0;i<e.length;i++){let a=e[i][0],u=a.length;for(let p=0;p<u;p++)n.add(a[p])}let l=[Array.from(n).sort((i,r)=>i-r)],s=l[0].length,o=new Map;for(let i=0;i<s;i++)o.set(l[0][i],i);for(let i=0;i<e.length;i++){let r=e[i],a=r[0];for(let u=1;u<r.length;u++){let p=r[u],d=Array(s).fill(void 0),m=t?t[i][u]:Nh,v=[];for(let w=0;w<p.length;w++){let A=p[w],k=o.get(a[w]);A===null?m!=Ih&&(d[k]=A,m==zh&&v.push(k)):d[k]=A}Vh(d,v,s),l.push(d)}}return l}const Hh=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function Uh(e){let t=e[0],n=t.length,l=Array(n);for(let o=0;o<l.length;o++)l[o]=o;l.sort((o,i)=>t[o]-t[i]);let s=[];for(let o=0;o<e.length;o++){let i=e[o],r=Array(n);for(let a=0;a<n;a++)r[a]=i[l[a]];s.push(r)}return s}function Bh(e){let t=e[0][0],n=t.length;for(let l=1;l<e.length;l++){let s=e[l][0];if(s.length!=n)return!1;if(s!=t){for(let o=0;o<n;o++)if(s[o]!=t[o])return!1}}return!0}function jh(e,t=100){const n=e.length;if(n<=1)return!0;let l=0,s=n-1;for(;l<=s&&e[l]==null;)l++;for(;s>=l&&e[s]==null;)s--;if(s<=l)return!0;const o=ut(1,wt((s-l+1)/t));for(let i=e[l],r=l+o;r<=s;r+=o){const a=e[r];if(a!=null){if(a<=i)return!1;i=a}}return!0}const Hc=["January","February","March","April","May","June","July","August","September","October","November","December"],Uc=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function Bc(e){return e.slice(0,3)}const Wh=Uc.map(Bc),qh=Hc.map(Bc),Kh={MMMM:Hc,MMM:qh,WWWW:Uc,WWW:Wh};function xl(e){return(e<10?"0":"")+e}function Gh(e){return(e<10?"00":e<100?"0":"")+e}const Yh={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>xl(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>xl(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>xl(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>xl(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>xl(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Gh(e.getMilliseconds())};function ii(e,t){t=t||Kh;let n=[],l=/\{([a-z]+)\}|[^{]+/gi,s;for(;s=l.exec(e);)n.push(s[0][0]=="{"?Yh[s[1]]:s[0]);return o=>{let i="";for(let r=0;r<n.length;r++)i+=typeof n[r]=="string"?n[r]:n[r](o,t);return i}}const Jh=new Intl.DateTimeFormat().resolvedOptions().timeZone;function Zh(e,t){let n;return t=="UTC"||t=="Etc/UTC"?n=new Date(+e+e.getTimezoneOffset()*6e4):t==Jh?n=e:(n=new Date(e.toLocaleString("en-US",{timeZone:t})),n.setMilliseconds(e.getMilliseconds())),n}const jc=e=>e%1==0,_s=[1,2,2.5,5],Qh=Fl(10,-32,0,_s),Wc=Fl(10,0,32,_s),Xh=Wc.filter(jc),En=Qh.concat(Wc),ri=`
`,qc="{YYYY}",oa=ri+qc,Kc="{M}/{D}",Tl=ri+Kc,ns=Tl+"/{YY}",Gc="{aa}",e0="{h}:{mm}",Xn=e0+Gc,ia=ri+Xn,ra=":{ss}",ge=null;function Yc(e){let t=e*1e3,n=t*60,l=n*60,s=l*24,o=s*30,i=s*365,a=(e==1?Fl(10,0,3,_s).filter(jc):Fl(10,-3,0,_s)).concat([t,t*5,t*10,t*15,t*30,n,n*5,n*10,n*15,n*30,l,l*2,l*3,l*4,l*6,l*8,l*12,s,s*2,s*3,s*4,s*5,s*6,s*7,s*8,s*9,s*10,s*15,o,o*2,o*3,o*4,o*6,i,i*2,i*5,i*10,i*25,i*50,i*100]);const u=[[i,qc,ge,ge,ge,ge,ge,ge,1],[s*28,"{MMM}",oa,ge,ge,ge,ge,ge,1],[s,Kc,oa,ge,ge,ge,ge,ge,1],[l,"{h}"+Gc,ns,ge,Tl,ge,ge,ge,1],[n,Xn,ns,ge,Tl,ge,ge,ge,1],[t,ra,ns+" "+Xn,ge,Tl+" "+Xn,ge,ia,ge,1],[e,ra+".{fff}",ns+" "+Xn,ge,Tl+" "+Xn,ge,ia,ge,1]];function p(d){return(m,v,w,A,k,M)=>{let b=[],x=k>=i,C=k>=o&&k<i,S=d(w),T=we(S*e,3),L=mo(S.getFullYear(),x?0:S.getMonth(),C||x?1:S.getDate()),D=we(L*e,3);if(C||x){let N=C?k/o:0,I=x?k/i:0,O=T==D?T:we(mo(L.getFullYear()+I,L.getMonth()+N,1)*e,3),Y=new Date(Be(O/e)),U=Y.getFullYear(),G=Y.getMonth();for(let B=0;O<=A;B++){let W=mo(U+I*B,G+N*B,1),j=W-d(we(W*e,3));O=we((+W+j)*e,3),O<=A&&b.push(O)}}else{let N=k>=s?s:k,I=wt(w)-wt(T),O=D+I+Cs(T-D,N);b.push(O);let Y=d(O),U=Y.getHours()+Y.getMinutes()/n+Y.getSeconds()/l,G=k/l,B=m.axes[v]._space,W=M/B;for(;O=we(O+k,e==1?0:3),!(O>A);)if(G>1){let j=wt(we(U+G,6))%24,de=d(O).getHours()-j;de>1&&(de=-1),O-=de*l,U=(U+G)%24;let fe=b[b.length-1];we((O-fe)/k,3)*W>=.7&&b.push(O)}else b.push(O)}return b}}return[a,u,p]}const[t0,n0,l0]=Yc(1),[s0,o0,i0]=Yc(.001);Fl(2,-53,53,[1]);function aa(e,t){return e.map(n=>n.map((l,s)=>s==0||s==8||l==null?l:t(s==1||n[8]==0?l:n[1]+l)))}function ca(e,t){return(n,l,s,o,i)=>{let r=t.find(w=>i>=w[0])||t[t.length-1],a,u,p,d,m,v;return l.map(w=>{let A=e(w),k=A.getFullYear(),M=A.getMonth(),b=A.getDate(),x=A.getHours(),C=A.getMinutes(),S=A.getSeconds(),T=k!=a&&r[2]||M!=u&&r[3]||b!=p&&r[4]||x!=d&&r[5]||C!=m&&r[6]||S!=v&&r[7]||r[1];return a=k,u=M,p=b,d=x,m=C,v=S,T(A)})}}function r0(e,t){let n=ii(t);return(l,s,o,i,r)=>s.map(a=>n(e(a)))}function mo(e,t,n){return new Date(e,t,n)}function ua(e,t){return t(e)}const a0="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function da(e,t){return(n,l,s,o)=>o==null?ei:t(e(l))}function c0(e,t){let n=e.series[t];return n.width?n.stroke(e,t):n.points.width?n.points.stroke(e,t):null}function u0(e,t){return e.series[t].fill(e,t)}const d0={show:!0,live:!0,isolate:!1,mount:Ah,markers:{show:!0,width:2,stroke:c0,fill:u0,dash:"solid"},idx:null,idxs:null,values:[]};function f0(e,t){let n=e.cursor.points,l=Lt(),s=n.size(e,t);Te(l,Cl,s),Te(l,El,s);let o=s/-2;Te(l,"marginLeft",o),Te(l,"marginTop",o);let i=n.width(e,t,s);return i&&Te(l,"borderWidth",i),l}function p0(e,t){let n=e.series[t].points;return n._fill||n._stroke}function h0(e,t){let n=e.series[t].points;return n._stroke||n._fill}function m0(e,t){return e.series[t].points.size}const _o=[0,0];function _0(e,t,n){return _o[0]=t,_o[1]=n,_o}function ls(e,t,n,l=!0){return s=>{s.button==0&&(!l||s.target==t)&&n(s)}}function vo(e,t,n,l=!0){return s=>{(!l||s.target==t)&&n(s)}}const v0={show:!0,x:!0,y:!0,lock:!1,move:_0,points:{one:!1,show:f0,size:m0,width:0,stroke:h0,fill:p0},bind:{mousedown:ls,mouseup:ls,click:ls,dblclick:ls,mousemove:vo,mouseleave:vo,mouseenter:vo},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,n,l,s)=>l-s,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},Jc={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},ai=He({},Jc,{filter:Ic}),Zc=He({},ai,{size:10}),Qc=He({},Jc,{show:!1}),ci='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',Xc="bold "+ci,eu=1.5,fa={show:!0,scale:"x",stroke:Xo,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Xc,side:2,grid:ai,ticks:Zc,border:Qc,font:ci,lineGap:eu,rotate:0},g0="Value",y0="Time",pa={show:!0,scale:"x",auto:!1,sorted:1,min:$e,max:-$e,idxs:[]};function b0(e,t,n,l,s){return t.map(o=>o==null?"":si(o))}function $0(e,t,n,l,s,o,i){let r=[],a=vn.get(s)||0;n=i?n:we(Cs(n,s),a);for(let u=n;u<=l;u=we(u+s,a))r.push(Object.is(u,-0)?0:u);return r}function Io(e,t,n,l,s,o,i){const r=[],a=e.scales[e.axes[t].scale].log,u=a==10?tn:Pc,p=wt(u(n));s=ul(a,p),a==10&&(s=En[Vt(s,En)]);let d=n,m=s*a;a==10&&(m=En[Vt(m,En)]);do r.push(d),d=d+s,a==10&&!vn.has(d)&&(d=we(d,vn.get(s))),d>=m&&(s=d,m=s*a,a==10&&(m=En[Vt(m,En)]));while(d<=l);return r}function w0(e,t,n,l,s,o,i){let a=e.scales[e.axes[t].scale].asinh,u=l>a?Io(e,t,ut(a,n),l,s):[a],p=l>=0&&n<=0?[0]:[];return(n<-a?Io(e,t,ut(a,-l),-n,s):[a]).reverse().map(m=>-m).concat(p,u)}const tu=/./,k0=/[12357]/,S0=/[125]/,ha=/1/,No=(e,t,n,l)=>e.map((s,o)=>t==4&&s==0||o%l==0&&n.test(s.toExponential()[s<0?1:0])?s:null);function x0(e,t,n,l,s){let o=e.axes[n],i=o.scale,r=e.scales[i],a=e.valToPos,u=o._space,p=a(10,i),d=a(9,i)-p>=u?tu:a(7,i)-p>=u?k0:a(5,i)-p>=u?S0:ha;if(d==ha){let m=je(a(1,i)-p);if(m<u)return No(t.slice().reverse(),r.distr,d,Dt(u/m)).reverse()}return No(t,r.distr,d,1)}function M0(e,t,n,l,s){let o=e.axes[n],i=o.scale,r=o._space,a=e.valToPos,u=je(a(1,i)-a(2,i));return u<r?No(t.slice().reverse(),3,tu,Dt(r/u)).reverse():t}function C0(e,t,n,l){return l==null?ei:t==null?"":si(t)}const ma={show:!0,scale:"y",stroke:Xo,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Xc,side:3,grid:ai,ticks:Zc,border:Qc,font:ci,lineGap:eu,rotate:0};function E0(e,t){let n=3+(e||1)*2;return we(n*t,3)}function T0(e,t){let{scale:n,idxs:l}=e.series[0],s=e._data[0],o=e.valToPos(s[l[0]],n,!0),i=e.valToPos(s[l[1]],n,!0),r=je(i-o),a=e.series[t],u=r/(a.points.space*_e);return l[1]-l[0]<=u}const _a={scale:null,auto:!0,sorted:0,min:$e,max:-$e},nu=(e,t,n,l,s)=>s,va={show:!0,auto:!0,sorted:0,gaps:nu,alpha:1,facets:[He({},_a,{scale:"x"}),He({},_a,{scale:"y"})]},ga={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:nu,alpha:1,points:{show:T0,filter:null},values:null,min:$e,max:-$e,idxs:[],path:null,clip:null};function A0(e,t,n,l,s){return n/10}const lu={time:th,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},L0=He({},lu,{time:!1,ori:1}),ya={};function su(e,t){let n=ya[e];return n||(n={key:e,plots:[],sub(l){n.plots.push(l)},unsub(l){n.plots=n.plots.filter(s=>s!=l)},pub(l,s,o,i,r,a,u){for(let p=0;p<n.plots.length;p++)n.plots[p]!=s&&n.plots[p].pub(l,s,o,i,r,a,u)}},e!=null&&(ya[e]=n)),n}const pl=1,zo=2;function On(e,t,n){const l=e.mode,s=e.series[t],o=l==2?e._data[t]:e._data,i=e.scales,r=e.bbox;let a=o[0],u=l==2?o[1]:o[t],p=l==2?i[s.facets[0].scale]:i[e.series[0].scale],d=l==2?i[s.facets[1].scale]:i[s.scale],m=r.left,v=r.top,w=r.width,A=r.height,k=e.valToPosH,M=e.valToPosV;return p.ori==0?n(s,a,u,p,d,k,M,m,v,w,A,As,ml,Ds,iu,au):n(s,a,u,p,d,M,k,v,m,A,w,Ls,_l,fi,ru,cu)}function ui(e,t){let n=0,l=0,s=he(e.bands,oi);for(let o=0;o<s.length;o++){let i=s[o];i.series[0]==t?n=i.dir:i.series[1]==t&&(i.dir==1?l|=1:l|=2)}return[n,l==1?-1:l==2?1:l==3?2:0]}function D0(e,t,n,l,s){let o=e.mode,i=e.series[t],r=o==2?i.facets[1].scale:i.scale,a=e.scales[r];return s==-1?a.min:s==1?a.max:a.distr==3?a.dir==1?a.min:a.max:0}function nn(e,t,n,l,s,o){return On(e,t,(i,r,a,u,p,d,m,v,w,A,k)=>{let M=i.pxRound;const b=u.dir*(u.ori==0?1:-1),x=u.ori==0?ml:_l;let C,S;b==1?(C=n,S=l):(C=l,S=n);let T=M(d(r[C],u,A,v)),L=M(m(a[C],p,k,w)),D=M(d(r[S],u,A,v)),N=M(m(o==1?p.max:p.min,p,k,w)),I=new Path2D(s);return x(I,D,N),x(I,T,N),x(I,T,L),I})}function Ts(e,t,n,l,s,o){let i=null;if(e.length>0){i=new Path2D;const r=t==0?Ds:fi;let a=n;for(let d=0;d<e.length;d++){let m=e[d];if(m[1]>m[0]){let v=m[0]-a;v>0&&r(i,a,l,v,l+o),a=m[1]}}let u=n+s-a,p=10;u>0&&r(i,a,l-p/2,u,l+o+p)}return i}function P0(e,t,n){let l=e[e.length-1];l&&l[0]==t?l[1]=n:e.push([t,n])}function di(e,t,n,l,s,o,i){let r=[],a=e.length;for(let u=s==1?n:l;u>=n&&u<=l;u+=s)if(t[u]===null){let d=u,m=u;if(s==1)for(;++u<=l&&t[u]===null;)m=u;else for(;--u>=n&&t[u]===null;)m=u;let v=o(e[d]),w=m==d?v:o(e[m]),A=d-s;v=i<=0&&A>=0&&A<a?o(e[A]):v;let M=m+s;w=i>=0&&M>=0&&M<a?o(e[M]):w,w>=v&&r.push([v,w])}return r}function ba(e){return e==0?Rc:e==1?Be:t=>Cn(t,e)}function ou(e){let t=e==0?As:Ls,n=e==0?(s,o,i,r,a,u)=>{s.arcTo(o,i,r,a,u)}:(s,o,i,r,a,u)=>{s.arcTo(i,o,a,r,u)},l=e==0?(s,o,i,r,a)=>{s.rect(o,i,r,a)}:(s,o,i,r,a)=>{s.rect(i,o,a,r)};return(s,o,i,r,a,u=0,p=0)=>{u==0&&p==0?l(s,o,i,r,a):(u=Ft(u,r/2,a/2),p=Ft(p,r/2,a/2),t(s,o+u,i),n(s,o+r,i,o+r,i+a,u),n(s,o+r,i+a,o,i+a,p),n(s,o,i+a,o,i,p),n(s,o,i,o+r,i,u),s.closePath())}}const As=(e,t,n)=>{e.moveTo(t,n)},Ls=(e,t,n)=>{e.moveTo(n,t)},ml=(e,t,n)=>{e.lineTo(t,n)},_l=(e,t,n)=>{e.lineTo(n,t)},Ds=ou(0),fi=ou(1),iu=(e,t,n,l,s,o)=>{e.arc(t,n,l,s,o)},ru=(e,t,n,l,s,o)=>{e.arc(n,t,l,s,o)},au=(e,t,n,l,s,o,i)=>{e.bezierCurveTo(t,n,l,s,o,i)},cu=(e,t,n,l,s,o,i)=>{e.bezierCurveTo(n,t,s,l,i,o)};function uu(e){return(t,n,l,s,o)=>On(t,n,(i,r,a,u,p,d,m,v,w,A,k)=>{let{pxRound:M,points:b}=i,x,C;u.ori==0?(x=As,C=iu):(x=Ls,C=ru);const S=we(b.width*_e,3);let T=(b.size-b.width)/2*_e,L=we(T*2,3),D=new Path2D,N=new Path2D,{left:I,top:O,width:Y,height:U}=t.bbox;Ds(N,I-L,O-L,Y+L*2,U+L*2);const G=B=>{if(a[B]!=null){let W=M(d(r[B],u,A,v)),j=M(m(a[B],p,k,w));x(D,W+T,j),C(D,W,j,T,0,rs*2)}};if(o)o.forEach(G);else for(let B=l;B<=s;B++)G(B);return{stroke:S>0?D:null,fill:D,clip:N,flags:pl|zo}})}function du(e){return(t,n,l,s,o,i)=>{l!=s&&(o!=l&&i!=l&&e(t,n,l),o!=s&&i!=s&&e(t,n,s),e(t,n,i))}}const O0=du(ml),R0=du(_l);function fu(e){const t=he(e==null?void 0:e.alignGaps,0);return(n,l,s,o)=>On(n,l,(i,r,a,u,p,d,m,v,w,A,k)=>{[s,o]=xs(a,s,o);let M=i.pxRound,b=U=>M(d(U,u,A,v)),x=U=>M(m(U,p,k,w)),C,S;u.ori==0?(C=ml,S=O0):(C=_l,S=R0);const T=u.dir*(u.ori==0?1:-1),L={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:pl},D=L.stroke;let N=!1;if(o-s>=A*4){let U=q=>n.posToVal(q,u.key,!0),G=null,B=null,W,j,tt,ve=b(r[T==1?s:o]),de=b(r[s]),fe=b(r[o]),te=U(T==1?de+1:fe-1);for(let q=T==1?s:o;q>=s&&q<=o;q+=T){let Re=r[q],ke=(T==1?Re<te:Re>te)?ve:b(Re),ue=a[q];ke==ve?ue!=null?(j=ue,G==null?(C(D,ke,x(j)),W=G=B=j):j<G?G=j:j>B&&(B=j)):ue===null&&(N=!0):(G!=null&&S(D,ve,x(G),x(B),x(W),x(j)),ue!=null?(j=ue,C(D,ke,x(j)),G=B=W=j):(G=B=null,ue===null&&(N=!0)),ve=ke,te=U(ve+T))}G!=null&&G!=B&&tt!=ve&&S(D,ve,x(G),x(B),x(W),x(j))}else for(let U=T==1?s:o;U>=s&&U<=o;U+=T){let G=a[U];G===null?N=!0:G!=null&&C(D,b(r[U]),x(G))}let[O,Y]=ui(n,l);if(i.fill!=null||O!=0){let U=L.fill=new Path2D(D),G=i.fillTo(n,l,i.min,i.max,O),B=x(G),W=b(r[s]),j=b(r[o]);T==-1&&([j,W]=[W,j]),C(U,j,B),C(U,W,B)}if(!i.spanGaps){let U=[];N&&U.push(...di(r,a,s,o,T,b,t)),L.gaps=U=i.gaps(n,l,s,o,U),L.clip=Ts(U,u.ori,v,w,A,k)}return Y!=0&&(L.band=Y==2?[nn(n,l,s,o,D,-1),nn(n,l,s,o,D,1)]:nn(n,l,s,o,D,Y)),L})}function I0(e){const t=he(e.align,1),n=he(e.ascDesc,!1),l=he(e.alignGaps,0),s=he(e.extend,!1);return(o,i,r,a)=>On(o,i,(u,p,d,m,v,w,A,k,M,b,x)=>{[r,a]=xs(d,r,a);let C=u.pxRound,{left:S,width:T}=o.bbox,L=de=>C(w(de,m,b,k)),D=de=>C(A(de,v,x,M)),N=m.ori==0?ml:_l;const I={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:pl},O=I.stroke,Y=m.dir*(m.ori==0?1:-1);let U=D(d[Y==1?r:a]),G=L(p[Y==1?r:a]),B=G,W=G;s&&t==-1&&(W=S,N(O,W,U)),N(O,G,U);for(let de=Y==1?r:a;de>=r&&de<=a;de+=Y){let fe=d[de];if(fe==null)continue;let te=L(p[de]),q=D(fe);t==1?N(O,te,U):N(O,B,q),N(O,te,q),U=q,B=te}let j=B;s&&t==1&&(j=S+T,N(O,j,U));let[tt,ve]=ui(o,i);if(u.fill!=null||tt!=0){let de=I.fill=new Path2D(O),fe=u.fillTo(o,i,u.min,u.max,tt),te=D(fe);N(de,j,te),N(de,W,te)}if(!u.spanGaps){let de=[];de.push(...di(p,d,r,a,Y,L,l));let fe=u.width*_e/2,te=n||t==1?fe:-fe,q=n||t==-1?-fe:fe;de.forEach(Re=>{Re[0]+=te,Re[1]+=q}),I.gaps=de=u.gaps(o,i,r,a,de),I.clip=Ts(de,m.ori,k,M,b,x)}return ve!=0&&(I.band=ve==2?[nn(o,i,r,a,O,-1),nn(o,i,r,a,O,1)]:nn(o,i,r,a,O,ve)),I})}function $a(e,t,n,l,s,o,i=$e){if(e.length>1){let r=null;for(let a=0,u=1/0;a<e.length;a++)if(t[a]!==void 0){if(r!=null){let p=je(e[a]-e[r]);p<u&&(u=p,i=je(n(e[a],l,s,o)-n(e[r],l,s,o)))}r=a}}return i}function N0(e){e=e||Dl;const t=he(e.size,[.6,$e,1]),n=e.align||0,l=e.gap||0;let s=e.radius;s=s==null?[0,0]:typeof s=="number"?[s,0]:s;const o=ae(s),i=1-t[0],r=he(t[1],$e),a=he(t[2],1),u=he(e.disp,Dl),p=he(e.each,v=>{}),{fill:d,stroke:m}=u;return(v,w,A,k)=>On(v,w,(M,b,x,C,S,T,L,D,N,I,O)=>{let Y=M.pxRound,U=n,G=l*_e,B=r*_e,W=a*_e,j,tt;C.ori==0?[j,tt]=o(v,w):[tt,j]=o(v,w);const ve=C.dir*(C.ori==0?1:-1);let de=C.ori==0?Ds:fi,fe=C.ori==0?p:(F,xe,Ue,Rn,yn,Ut,bn)=>{p(F,xe,Ue,yn,Rn,bn,Ut)},te=he(v.bands,oi).find(F=>F.series[0]==w),q=te!=null?te.dir:0,Re=M.fillTo(v,w,M.min,M.max,q),Qe=Y(L(Re,S,O,N)),ke,ue,pt,Ie=I,Se=Y(M.width*_e),St=!1,Pt=null,nt=null,Ht=null,Qt=null;d!=null&&(Se==0||m!=null)&&(St=!0,Pt=d.values(v,w,A,k),nt=new Map,new Set(Pt).forEach(F=>{F!=null&&nt.set(F,new Path2D)}),Se>0&&(Ht=m.values(v,w,A,k),Qt=new Map,new Set(Ht).forEach(F=>{F!=null&&Qt.set(F,new Path2D)})));let{x0:ln,size:sn}=u;if(ln!=null&&sn!=null){U=1,b=ln.values(v,w,A,k),ln.unit==2&&(b=b.map(Ue=>v.posToVal(D+Ue*I,C.key,!0)));let F=sn.values(v,w,A,k);sn.unit==2?ue=F[0]*I:ue=T(F[0],C,I,D)-T(0,C,I,D),Ie=$a(b,x,T,C,I,D,Ie),pt=Ie-ue+G}else Ie=$a(b,x,T,C,I,D,Ie),pt=Ie*i+G,ue=Ie-pt;pt<1&&(pt=0),Se>=ue/2&&(Se=0),pt<5&&(Y=Rc);let le=pt>0,Ne=Ie-pt-(le?Se:0);ue=Y(Ro(Ne,W,B)),ke=(U==0?ue/2:U==ve?0:ue)-U*ve*((U==0?G/2:0)+(le?Se/2:0));const ze={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},lt=St?null:new Path2D;let xt=null;if(te!=null)xt=v.data[te.series[1]];else{let{y0:F,y1:xe}=u;F!=null&&xe!=null&&(x=xe.values(v,w,A,k),xt=F.values(v,w,A,k))}let gn=j*ue,ne=tt*ue;for(let F=ve==1?A:k;F>=A&&F<=k;F+=ve){let xe=x[F];if(xe==null)continue;if(xt!=null){let ht=xt[F]??0;if(xe-ht==0)continue;Qe=L(ht,S,O,N)}let Ue=C.distr!=2||u!=null?b[F]:F,Rn=T(Ue,C,I,D),yn=L(he(xe,Re),S,O,N),Ut=Y(Rn-ke),bn=Y(ut(yn,Qe)),vt=Y(Ft(yn,Qe)),Mt=bn-vt;if(xe!=null){let ht=xe<0?ne:gn,Ot=xe<0?gn:ne;St?(Se>0&&Ht[F]!=null&&de(Qt.get(Ht[F]),Ut,vt+wt(Se/2),ue,ut(0,Mt-Se),ht,Ot),Pt[F]!=null&&de(nt.get(Pt[F]),Ut,vt+wt(Se/2),ue,ut(0,Mt-Se),ht,Ot)):de(lt,Ut,vt+wt(Se/2),ue,ut(0,Mt-Se),ht,Ot),fe(v,w,F,Ut-Se/2,vt,ue+Se,Mt)}}return Se>0?ze.stroke=St?Qt:lt:St||(ze._fill=M.width==0?M._fill:M._stroke??M._fill,ze.width=0),ze.fill=St?nt:lt,ze})}function z0(e,t){const n=he(t==null?void 0:t.alignGaps,0);return(l,s,o,i)=>On(l,s,(r,a,u,p,d,m,v,w,A,k,M)=>{[o,i]=xs(u,o,i);let b=r.pxRound,x=j=>b(m(j,p,k,w)),C=j=>b(v(j,d,M,A)),S,T,L;p.ori==0?(S=As,L=ml,T=au):(S=Ls,L=_l,T=cu);const D=p.dir*(p.ori==0?1:-1);let N=x(a[D==1?o:i]),I=N,O=[],Y=[];for(let j=D==1?o:i;j>=o&&j<=i;j+=D)if(u[j]!=null){let ve=a[j],de=x(ve);O.push(I=de),Y.push(C(u[j]))}const U={stroke:e(O,Y,S,L,T,b),fill:null,clip:null,band:null,gaps:null,flags:pl},G=U.stroke;let[B,W]=ui(l,s);if(r.fill!=null||B!=0){let j=U.fill=new Path2D(G),tt=r.fillTo(l,s,r.min,r.max,B),ve=C(tt);L(j,I,ve),L(j,N,ve)}if(!r.spanGaps){let j=[];j.push(...di(a,u,o,i,D,x,n)),U.gaps=j=r.gaps(l,s,o,i,j),U.clip=Ts(j,p.ori,w,A,k,M)}return W!=0&&(U.band=W==2?[nn(l,s,o,i,G,-1),nn(l,s,o,i,G,1)]:nn(l,s,o,i,G,W)),U})}function V0(e){return z0(F0,e)}function F0(e,t,n,l,s,o){const i=e.length;if(i<2)return null;const r=new Path2D;if(n(r,e[0],t[0]),i==2)l(r,e[1],t[1]);else{let a=Array(i),u=Array(i-1),p=Array(i-1),d=Array(i-1);for(let m=0;m<i-1;m++)p[m]=t[m+1]-t[m],d[m]=e[m+1]-e[m],u[m]=p[m]/d[m];a[0]=u[0];for(let m=1;m<i-1;m++)u[m]===0||u[m-1]===0||u[m-1]>0!=u[m]>0?a[m]=0:(a[m]=3*(d[m-1]+d[m])/((2*d[m]+d[m-1])/u[m-1]+(d[m]+2*d[m-1])/u[m]),isFinite(a[m])||(a[m]=0));a[i-1]=u[i-2];for(let m=0;m<i-1;m++)s(r,e[m]+d[m]/3,t[m]+a[m]*d[m]/3,e[m+1]-d[m]/3,t[m+1]-a[m+1]*d[m]/3,e[m+1],t[m+1])}return r}const Vo=new Set;function wa(){for(let e of Vo)e.syncRect(!0)}hl&&(Ln(bh,il,wa),Ln($h,il,wa,!0),Ln(hs,il,()=>{it.pxRatio=_e}));const H0=fu(),U0=uu();function ka(e,t,n,l){return(l?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,i)=>Fo(o,i,t,n))}function B0(e,t){return e.map((n,l)=>l==0?{}:He({},t,n))}function Fo(e,t,n,l){return He({},t==0?n:l,e)}function pu(e,t,n){return t==null?dl:[t,n]}const j0=pu;function W0(e,t,n){return t==null?dl:ms(t,n,li,!0)}function hu(e,t,n,l){return t==null?dl:Ms(t,n,e.scales[l].log,!1)}const q0=hu;function mu(e,t,n,l){return t==null?dl:ni(t,n,e.scales[l].log,!1)}const K0=mu;function G0(e,t,n,l,s){let o=ut(ta(e),ta(t)),i=t-e,r=Vt(s/l*i,n);do{let a=n[r],u=l*a/i;if(u>=s&&o+(a<5?vn.get(a):0)<=17)return[a,u]}while(++r<n.length);return[0,0]}function Sa(e){let t,n;return e=e.replace(/(\d+)px/,(l,s)=>(t=Be((n=+s)*_e))+"px"),[e,t,n]}function Y0(e){e.show&&[e.font,e.labelFont].forEach(t=>{let n=we(t[2]*_e,1);t[0]=t[0].replace(/[0-9.]+px/,n+"px"),t[1]=n})}function it(e,t,n){const l={mode:he(e.mode,1)},s=l.mode;function o(c,f,h,_){let y=f.valToPct(c);return _+h*(f.dir==-1?1-y:y)}function i(c,f,h,_){let y=f.valToPct(c);return _+h*(f.dir==-1?y:1-y)}function r(c,f,h,_){return f.ori==0?o(c,f,h,_):i(c,f,h,_)}l.valToPosH=o,l.valToPosV=i;let a=!1;l.status=0;const u=l.root=Lt(nh);if(e.id!=null&&(u.id=e.id),$t(u,e.class),e.title){let c=Lt(oh,u);c.textContent=e.title}const p=zt("canvas"),d=l.ctx=p.getContext("2d"),m=Lt(ih,u);Ln("click",m,c=>{c.target===w&&(Me!=qn||Ae!=Kn)&&et.click(l,c)},!0);const v=l.under=Lt(rh,m);m.appendChild(p);const w=l.over=Lt(ah,m);e=fl(e);const A=+he(e.pxAlign,1),k=ba(A);(e.plugins||[]).forEach(c=>{c.opts&&(e=c.opts(l,e)||e)});const M=e.ms||.001,b=l.series=s==1?ka(e.series||[],pa,ga,!1):B0(e.series||[null],va),x=l.axes=ka(e.axes||[],fa,ma,!0),C=l.scales={},S=l.bands=e.bands||[];S.forEach(c=>{c.fill=ae(c.fill||null),c.dir=he(c.dir,-1)});const T=s==2?b[1].facets[0].scale:b[0].scale,L={axes:Pu,series:Eu},D=(e.drawOrder||["axes","series"]).map(c=>L[c]);function N(c){const f=c.distr==3?h=>tn(h>0?h:c.clamp(l,h,c.min,c.max,c.key)):c.distr==4?h=>ho(h,c.asinh):c.distr==100?h=>c.fwd(h):h=>h;return h=>{let _=f(h),{_min:y,_max:$}=c,E=$-y;return(_-y)/E}}function I(c){let f=C[c];if(f==null){let h=(e.scales||Dl)[c]||Dl;if(h.from!=null){I(h.from);let _=He({},C[h.from],h,{key:c});_.valToPct=N(_),C[c]=_}else{f=C[c]=He({},c==T?lu:L0,h),f.key=c;let _=f.time,y=f.range,$=pn(y);if((c!=T||s==2&&!_)&&($&&(y[0]==null||y[1]==null)&&(y={min:y[0]==null?Qr:{mode:1,hard:y[0],soft:y[0]},max:y[1]==null?Qr:{mode:1,hard:y[1],soft:y[1]}},$=!1),!$&&Es(y))){let E=y;y=(P,R,z)=>R==null?dl:ms(R,z,E)}f.range=ae(y||(_?j0:c==T?f.distr==3?q0:f.distr==4?K0:pu:f.distr==3?hu:f.distr==4?mu:W0)),f.auto=ae($?!1:f.auto),f.clamp=ae(f.clamp||A0),f._min=f._max=null,f.valToPct=N(f)}}}I("x"),I("y"),s==1&&b.forEach(c=>{I(c.scale)}),x.forEach(c=>{I(c.scale)});for(let c in e.scales)I(c);const O=C[T],Y=O.distr;let U,G;O.ori==0?($t(u,lh),U=o,G=i):($t(u,sh),U=i,G=o);const B={};for(let c in C){let f=C[c];(f.min!=null||f.max!=null)&&(B[c]={min:f.min,max:f.max},f.min=f.max=null)}const W=e.tzDate||(c=>new Date(Be(c/M))),j=e.fmtDate||ii,tt=M==1?l0(W):i0(W),ve=ca(W,aa(M==1?n0:o0,j)),de=da(W,ua(a0,j)),fe=[],te=l.legend=He({},d0,e.legend),q=l.cursor=He({},v0,{drag:{y:s==2}},e.cursor),Re=te.show,Qe=q.show,ke=te.markers;te.idxs=fe,ke.width=ae(ke.width),ke.dash=ae(ke.dash),ke.stroke=ae(ke.stroke),ke.fill=ae(ke.fill);let ue,pt,Ie,Se=[],St=[],Pt,nt=!1,Ht={};if(te.live){const c=b[1]?b[1].values:null;nt=c!=null,Pt=nt?c(l,1,0):{_:0};for(let f in Pt)Ht[f]=ei}if(Re)if(ue=zt("table",hh,u),Ie=zt("tbody",null,ue),te.mount(l,ue),nt){pt=zt("thead",null,ue,Ie);let c=zt("tr",null,pt);zt("th",null,c);for(var Qt in Pt)zt("th",Vr,c).textContent=Qt}else $t(ue,_h),te.live&&$t(ue,mh);const ln={show:!0},sn={show:!1};function le(c,f){if(f==0&&(nt||!te.live||s==2))return dl;let h=[],_=zt("tr",vh,Ie,Ie.childNodes[f]);$t(_,c.class),c.show||$t(_,Tn);let y=zt("th",null,_);if(ke.show){let P=Lt(gh,y);if(f>0){let R=ke.width(l,f);R&&(P.style.border=R+"px "+ke.dash(l,f)+" "+ke.stroke(l,f)),P.style.background=ke.fill(l,f)}}let $=Lt(Vr,y);c.label instanceof HTMLElement?$.appendChild(c.label):$.textContent=c.label,f>0&&(ke.show||($.style.color=c.width>0?ke.stroke(l,f):ke.fill(l,f)),ze("click",y,P=>{if(q._lock)return;wn(P);let R=b.indexOf(c);if((P.ctrlKey||P.metaKey)!=te.isolate){let z=b.some((V,H)=>H>0&&H!=R&&V.show);b.forEach((V,H)=>{H>0&&jt(H,z?H==R?ln:sn:ln,!0,Ve.setSeries)})}else jt(R,{show:!c.show},!0,Ve.setSeries)},!1),Nn&&ze(Br,y,P=>{q._lock||(wn(P),jt(b.indexOf(c),Yn,!0,Ve.setSeries))},!1));for(var E in Pt){let P=zt("td",yh,_);P.textContent="--",h.push(P)}return[_,h]}const Ne=new Map;function ze(c,f,h,_=!0){const y=Ne.get(f)||{},$=q.bind[c](l,f,h,_);$&&(Ln(c,f,y[c]=$),Ne.set(f,y))}function lt(c,f,h){const _=Ne.get(f)||{};for(let y in _)(c==null||y==c)&&(Oo(y,f,_[y]),delete _[y]);c==null&&Ne.delete(f)}let xt=0,gn=0,ne=0,F=0,xe=0,Ue=0,Rn=xe,yn=Ue,Ut=ne,bn=F,vt=0,Mt=0,ht=0,Ot=0;l.bbox={};let Ps=!1,Bl=!1,In=!1,$n=!1,jl=!1,Ct=!1;function Os(c,f,h){(h||c!=l.width||f!=l.height)&&hi(c,f),Un(!1),In=!0,Bl=!0,Bn()}function hi(c,f){l.width=xt=ne=c,l.height=gn=F=f,xe=Ue=0,$u(),wu();let h=l.bbox;vt=h.left=Cn(xe*_e,.5),Mt=h.top=Cn(Ue*_e,.5),ht=h.width=Cn(ne*_e,.5),Ot=h.height=Cn(F*_e,.5)}const gu=3;function yu(){let c=!1,f=0;for(;!c;){f++;let h=Lu(f),_=Du(f);c=f==gu||h&&_,c||(hi(l.width,l.height),Bl=!0)}}function bu({width:c,height:f}){Os(c,f)}l.setSize=bu;function $u(){let c=!1,f=!1,h=!1,_=!1;x.forEach((y,$)=>{if(y.show&&y._show){let{side:E,_size:P}=y,R=E%2,z=y.label!=null?y.labelSize:0,V=P+z;V>0&&(R?(ne-=V,E==3?(xe+=V,_=!0):h=!0):(F-=V,E==0?(Ue+=V,c=!0):f=!0))}}),kn[0]=c,kn[1]=h,kn[2]=f,kn[3]=_,ne-=on[1]+on[3],xe+=on[3],F-=on[2]+on[0],Ue+=on[0]}function wu(){let c=xe+ne,f=Ue+F,h=xe,_=Ue;function y($,E){switch($){case 1:return c+=E,c-E;case 2:return f+=E,f-E;case 3:return h-=E,h+E;case 0:return _-=E,_+E}}x.forEach(($,E)=>{if($.show&&$._show){let P=$.side;$._pos=y(P,$._size),$.label!=null&&($._lpos=y(P,$.labelSize))}})}if(q.dataIdx==null){let c=q.hover,f=c.skip=new Set(c.skip??[]);f.add(void 0);let h=c.prox=ae(c.prox),_=c.bias??(c.bias=0);q.dataIdx=(y,$,E,P)=>{if($==0)return E;let R=E,z=h(y,$,E,P)??$e,V=z>=0&&z<$e,H=O.ori==0?ne:F,X=q.left,me=t[0],pe=t[$];if(f.has(pe[E])){R=null;let re=null,Z=null,K;if(_==0||_==-1)for(K=E;re==null&&K-- >0;)f.has(pe[K])||(re=K);if(_==0||_==1)for(K=E;Z==null&&K++<pe.length;)f.has(pe[K])||(Z=K);if(re!=null||Z!=null)if(V){let Ee=re==null?-1/0:U(me[re],O,H,0),Pe=Z==null?1/0:U(me[Z],O,H,0),Ze=X-Ee,ye=Pe-X;Ze<=ye?Ze<=z&&(R=re):ye<=z&&(R=Z)}else R=Z==null?re:re==null?Z:E-re<=Z-E?re:Z}else V&&je(X-U(me[E],O,H,0))>z&&(R=null);return R}}const wn=c=>{q.event=c};q.idxs=fe,q._lock=!1;let st=q.points;st.show=ae(st.show),st.size=ae(st.size),st.stroke=ae(st.stroke),st.width=ae(st.width),st.fill=ae(st.fill);const Bt=l.focus=He({},e.focus||{alpha:.3},q.focus),Nn=Bt.prox>=0,zn=Nn&&st.one;let Et=[],Vn=[],Fn=[];function mi(c,f){let h=st.show(l,f);if(h instanceof HTMLElement)return $t(h,ph),$t(h,c.class),Gt(h,-10,-10,ne,F),w.insertBefore(h,Et[f]),h}function _i(c,f){if(s==1||f>0){let h=s==1&&C[c.scale].time,_=c.value;c.value=h?sa(_)?da(W,ua(_,j)):_||de:_||C0,c.label=c.label||(h?y0:g0)}if(zn||f>0){c.width=c.width==null?1:c.width,c.paths=c.paths||H0||Lh,c.fillTo=ae(c.fillTo||D0),c.pxAlign=+he(c.pxAlign,A),c.pxRound=ba(c.pxAlign),c.stroke=ae(c.stroke||null),c.fill=ae(c.fill||null),c._stroke=c._fill=c._paths=c._focus=null;let h=E0(ut(1,c.width),1),_=c.points=He({},{size:h,width:ut(1,h*.2),stroke:c.stroke,space:h*2,paths:U0,_stroke:null,_fill:null},c.points);_.show=ae(_.show),_.filter=ae(_.filter),_.fill=ae(_.fill),_.stroke=ae(_.stroke),_.paths=ae(_.paths),_.pxAlign=c.pxAlign}if(Re){let h=le(c,f);Se.splice(f,0,h[0]),St.splice(f,0,h[1]),te.values.push(null)}if(Qe){fe.splice(f,0,null);let h=null;zn?f==0&&(h=mi(c,f)):f>0&&(h=mi(c,f)),Et.splice(f,0,h),Vn.splice(f,0,0),Fn.splice(f,0,0)}Je("addSeries",f)}function ku(c,f){f=f??b.length,c=s==1?Fo(c,f,pa,ga):Fo(c,f,{},va),b.splice(f,0,c),_i(b[f],f)}l.addSeries=ku;function Su(c){if(b.splice(c,1),Re){te.values.splice(c,1),St.splice(c,1);let f=Se.splice(c,1)[0];lt(null,f.firstChild),f.remove()}Qe&&(fe.splice(c,1),Et.splice(c,1)[0].remove(),Vn.splice(c,1),Fn.splice(c,1)),Je("delSeries",c)}l.delSeries=Su;const kn=[!1,!1,!1,!1];function xu(c,f){if(c._show=c.show,c.show){let h=c.side%2,_=C[c.scale];_==null&&(c.scale=h?b[1].scale:T,_=C[c.scale]);let y=_.time;c.size=ae(c.size),c.space=ae(c.space),c.rotate=ae(c.rotate),pn(c.incrs)&&c.incrs.forEach(E=>{!vn.has(E)&&vn.set(E,zc(E))}),c.incrs=ae(c.incrs||(_.distr==2?Xh:y?M==1?t0:s0:En)),c.splits=ae(c.splits||(y&&_.distr==1?tt:_.distr==3?Io:_.distr==4?w0:$0)),c.stroke=ae(c.stroke),c.grid.stroke=ae(c.grid.stroke),c.ticks.stroke=ae(c.ticks.stroke),c.border.stroke=ae(c.border.stroke);let $=c.values;c.values=pn($)&&!pn($[0])?ae($):y?pn($)?ca(W,aa($,j)):sa($)?r0(W,$):$||ve:$||b0,c.filter=ae(c.filter||(_.distr>=3&&_.log==10?x0:_.distr==3&&_.log==2?M0:Ic)),c.font=Sa(c.font),c.labelFont=Sa(c.labelFont),c._size=c.size(l,null,f,0),c._space=c._rotate=c._incrs=c._found=c._splits=c._values=null,c._size>0&&(kn[f]=!0,c._el=Lt(ch,m))}}function vl(c,f,h,_){let[y,$,E,P]=h,R=f%2,z=0;return R==0&&(P||$)&&(z=f==0&&!y||f==2&&!E?Be(fa.size/3):0),R==1&&(y||E)&&(z=f==1&&!$||f==3&&!P?Be(ma.size/2):0),z}const vi=l.padding=(e.padding||[vl,vl,vl,vl]).map(c=>ae(he(c,vl))),on=l._padding=vi.map((c,f)=>c(l,f,kn,0));let Xe,qe=null,Ke=null;const Wl=s==1?b[0].idxs:null;let Rt=null,gl=!1;function gi(c,f){if(t=c??[],l.data=l._data=t,s==2){Xe=0;for(let h=1;h<b.length;h++)Xe+=t[h][0].length}else{t.length==0&&(l.data=l._data=t=[[]]),Rt=t[0],Xe=Rt.length;let h=t;if(Y==2){h=t.slice();let _=h[0]=Array(Xe);for(let y=0;y<Xe;y++)_[y]=y}l._data=t=h}if(Un(!0),Je("setData"),Y==2&&(In=!0),f!==!1){let h=O;h.auto(l,gl)?Rs():an(T,h.min,h.max),$n=$n||q.left>=0,Ct=!0,Bn()}}l.setData=gi;function Rs(){gl=!0;let c,f;s==1&&(Xe>0?(qe=Wl[0]=0,Ke=Wl[1]=Xe-1,c=t[0][qe],f=t[0][Ke],Y==2?(c=qe,f=Ke):c==f&&(Y==3?[c,f]=Ms(c,c,O.log,!1):Y==4?[c,f]=ni(c,c,O.log,!1):O.time?f=c+Be(86400/M):[c,f]=ms(c,f,li,!0))):(qe=Wl[0]=c=null,Ke=Wl[1]=f=null)),an(T,c,f)}let ql,Hn,Is,Ns,zs,Vs,Fs,Hs,Us,mt;function yi(c,f,h,_,y,$){c??(c=Hr),h??(h=oi),_??(_="butt"),y??(y=Hr),$??($="round"),c!=ql&&(d.strokeStyle=ql=c),y!=Hn&&(d.fillStyle=Hn=y),f!=Is&&(d.lineWidth=Is=f),$!=zs&&(d.lineJoin=zs=$),_!=Vs&&(d.lineCap=Vs=_),h!=Ns&&d.setLineDash(Ns=h)}function bi(c,f,h,_){f!=Hn&&(d.fillStyle=Hn=f),c!=Fs&&(d.font=Fs=c),h!=Hs&&(d.textAlign=Hs=h),_!=Us&&(d.textBaseline=Us=_)}function Bs(c,f,h,_,y=0){if(_.length>0&&c.auto(l,gl)&&(f==null||f.min==null)){let $=he(qe,0),E=he(Ke,_.length-1),P=h.min==null?xh(_,$,E,y,c.distr==3):[h.min,h.max];c.min=Ft(c.min,h.min=P[0]),c.max=ut(c.max,h.max=P[1])}}const $i={min:null,max:null};function Mu(){for(let _ in C){let y=C[_];B[_]==null&&(y.min==null||B[T]!=null&&y.auto(l,gl))&&(B[_]=$i)}for(let _ in C){let y=C[_];B[_]==null&&y.from!=null&&B[y.from]!=null&&(B[_]=$i)}B[T]!=null&&Un(!0);let c={};for(let _ in B){let y=B[_];if(y!=null){let $=c[_]=fl(C[_],Oh);if(y.min!=null)He($,y);else if(_!=T||s==2)if(Xe==0&&$.from==null){let E=$.range(l,null,null,_);$.min=E[0],$.max=E[1]}else $.min=$e,$.max=-$e}}if(Xe>0){b.forEach((_,y)=>{if(s==1){let $=_.scale,E=B[$];if(E==null)return;let P=c[$];if(y==0){let R=P.range(l,P.min,P.max,$);P.min=R[0],P.max=R[1],qe=Vt(P.min,t[0]),Ke=Vt(P.max,t[0]),Ke-qe>1&&(t[0][qe]<P.min&&qe++,t[0][Ke]>P.max&&Ke--),_.min=Rt[qe],_.max=Rt[Ke]}else _.show&&_.auto&&Bs(P,E,_,t[y],_.sorted);_.idxs[0]=qe,_.idxs[1]=Ke}else if(y>0&&_.show&&_.auto){let[$,E]=_.facets,P=$.scale,R=E.scale,[z,V]=t[y],H=c[P],X=c[R];H!=null&&Bs(H,B[P],$,z,$.sorted),X!=null&&Bs(X,B[R],E,V,E.sorted),_.min=E.min,_.max=E.max}});for(let _ in c){let y=c[_],$=B[_];if(y.from==null&&($==null||$.min==null)){let E=y.range(l,y.min==$e?null:y.min,y.max==-$e?null:y.max,_);y.min=E[0],y.max=E[1]}}}for(let _ in c){let y=c[_];if(y.from!=null){let $=c[y.from];if($.min==null)y.min=y.max=null;else{let E=y.range(l,$.min,$.max,_);y.min=E[0],y.max=E[1]}}}let f={},h=!1;for(let _ in c){let y=c[_],$=C[_];if($.min!=y.min||$.max!=y.max){$.min=y.min,$.max=y.max;let E=$.distr;$._min=E==3?tn($.min):E==4?ho($.min,$.asinh):E==100?$.fwd($.min):$.min,$._max=E==3?tn($.max):E==4?ho($.max,$.asinh):E==100?$.fwd($.max):$.max,f[_]=h=!0}}if(h){b.forEach((_,y)=>{s==2?y>0&&f.y&&(_._paths=null):f[_.scale]&&(_._paths=null)});for(let _ in f)In=!0,Je("setScale",_);Qe&&q.left>=0&&($n=Ct=!0)}for(let _ in B)B[_]=null}function Cu(c){let f=Ro(qe-1,0,Xe-1),h=Ro(Ke+1,0,Xe-1);for(;c[f]==null&&f>0;)f--;for(;c[h]==null&&h<Xe-1;)h++;return[f,h]}function Eu(){if(Xe>0){let c=b.some(f=>f._focus)&&mt!=Bt.alpha;c&&(d.globalAlpha=mt=Bt.alpha),b.forEach((f,h)=>{if(h>0&&f.show&&(wi(h,!1),wi(h,!0),f._paths==null)){let _=mt;mt!=f.alpha&&(d.globalAlpha=mt=f.alpha);let y=s==2?[0,t[h][0].length-1]:Cu(t[h]);f._paths=f.paths(l,h,y[0],y[1]),mt!=_&&(d.globalAlpha=mt=_)}}),b.forEach((f,h)=>{if(h>0&&f.show){let _=mt;mt!=f.alpha&&(d.globalAlpha=mt=f.alpha),f._paths!=null&&ki(h,!1);{let y=f._paths!=null?f._paths.gaps:null,$=f.points.show(l,h,qe,Ke,y),E=f.points.filter(l,h,$,y);($||E)&&(f.points._paths=f.points.paths(l,h,qe,Ke,E),ki(h,!0))}mt!=_&&(d.globalAlpha=mt=_),Je("drawSeries",h)}}),c&&(d.globalAlpha=mt=1)}}function wi(c,f){let h=f?b[c].points:b[c];h._stroke=h.stroke(l,c),h._fill=h.fill(l,c)}function ki(c,f){let h=f?b[c].points:b[c],{stroke:_,fill:y,clip:$,flags:E,_stroke:P=h._stroke,_fill:R=h._fill,_width:z=h.width}=h._paths;z=we(z*_e,3);let V=null,H=z%2/2;f&&R==null&&(R=z>0?"#fff":P);let X=h.pxAlign==1&&H>0;if(X&&d.translate(H,H),!f){let me=vt-z/2,pe=Mt-z/2,re=ht+z,Z=Ot+z;V=new Path2D,V.rect(me,pe,re,Z)}f?js(P,z,h.dash,h.cap,R,_,y,E,$):Tu(c,P,z,h.dash,h.cap,R,_,y,E,V,$),X&&d.translate(-H,-H)}function Tu(c,f,h,_,y,$,E,P,R,z,V){let H=!1;R!=0&&S.forEach((X,me)=>{if(X.series[0]==c){let pe=b[X.series[1]],re=t[X.series[1]],Z=(pe._paths||Dl).band;pn(Z)&&(Z=X.dir==1?Z[0]:Z[1]);let K,Ee=null;pe.show&&Z&&Ch(re,qe,Ke)?(Ee=X.fill(l,me)||$,K=pe._paths.clip):Z=null,js(f,h,_,y,Ee,E,P,R,z,V,K,Z),H=!0}}),H||js(f,h,_,y,$,E,P,R,z,V)}const Si=pl|zo;function js(c,f,h,_,y,$,E,P,R,z,V,H){yi(c,f,h,_,y),(R||z||H)&&(d.save(),R&&d.clip(R),z&&d.clip(z)),H?(P&Si)==Si?(d.clip(H),V&&d.clip(V),Gl(y,E),Kl(c,$,f)):P&zo?(Gl(y,E),d.clip(H),Kl(c,$,f)):P&pl&&(d.save(),d.clip(H),V&&d.clip(V),Gl(y,E),d.restore(),Kl(c,$,f)):(Gl(y,E),Kl(c,$,f)),(R||z||H)&&d.restore()}function Kl(c,f,h){h>0&&(f instanceof Map?f.forEach((_,y)=>{d.strokeStyle=ql=y,d.stroke(_)}):f!=null&&c&&d.stroke(f))}function Gl(c,f){f instanceof Map?f.forEach((h,_)=>{d.fillStyle=Hn=_,d.fill(h)}):f!=null&&c&&d.fill(f)}function Au(c,f,h,_){let y=x[c],$;if(_<=0)$=[0,0];else{let E=y._space=y.space(l,c,f,h,_),P=y._incrs=y.incrs(l,c,f,h,_,E);$=G0(f,h,P,_,E)}return y._found=$}function Ws(c,f,h,_,y,$,E,P,R,z){let V=E%2/2;A==1&&d.translate(V,V),yi(P,E,R,z,P),d.beginPath();let H,X,me,pe,re=y+(_==0||_==3?-$:$);h==0?(X=y,pe=re):(H=y,me=re);for(let Z=0;Z<c.length;Z++)f[Z]!=null&&(h==0?H=me=c[Z]:X=pe=c[Z],d.moveTo(H,X),d.lineTo(me,pe));d.stroke(),A==1&&d.translate(-V,-V)}function Lu(c){let f=!0;return x.forEach((h,_)=>{if(!h.show)return;let y=C[h.scale];if(y.min==null){h._show&&(f=!1,h._show=!1,Un(!1));return}else h._show||(f=!1,h._show=!0,Un(!1));let $=h.side,E=$%2,{min:P,max:R}=y,[z,V]=Au(_,P,R,E==0?ne:F);if(V==0)return;let H=y.distr==2,X=h._splits=h.splits(l,_,P,R,z,V,H),me=y.distr==2?X.map(K=>Rt[K]):X,pe=y.distr==2?Rt[X[1]]-Rt[X[0]]:z,re=h._values=h.values(l,h.filter(l,me,_,V,pe),_,V,pe);h._rotate=$==2?h.rotate(l,re,_,V):0;let Z=h._size;h._size=Dt(h.size(l,re,_,c)),Z!=null&&h._size!=Z&&(f=!1)}),f}function Du(c){let f=!0;return vi.forEach((h,_)=>{let y=h(l,_,kn,c);y!=on[_]&&(f=!1),on[_]=y}),f}function Pu(){for(let c=0;c<x.length;c++){let f=x[c];if(!f.show||!f._show)continue;let h=f.side,_=h%2,y,$,E=f.stroke(l,c),P=h==0||h==3?-1:1,[R,z]=f._found;if(f.label!=null){let at=f.labelGap*P,bt=Be((f._lpos+at)*_e);bi(f.labelFont[0],E,"center",h==2?Sl:Fr),d.save(),_==1?(y=$=0,d.translate(bt,Be(Mt+Ot/2)),d.rotate((h==3?-rs:rs)/2)):(y=Be(vt+ht/2),$=bt);let Mn=Oc(f.label)?f.label(l,c,R,z):f.label;d.fillText(Mn,y,$),d.restore()}if(z==0)continue;let V=C[f.scale],H=_==0?ht:Ot,X=_==0?vt:Mt,me=f._splits,pe=V.distr==2?me.map(at=>Rt[at]):me,re=V.distr==2?Rt[me[1]]-Rt[me[0]]:R,Z=f.ticks,K=f.border,Ee=Z.show?Z.size:0,Pe=Be(Ee*_e),Ze=Be((f.alignTo==2?f._size-Ee-f.gap:f.gap)*_e),ye=f._rotate*-rs/180,Oe=k(f._pos*_e),gt=(Pe+Ze)*P,rt=Oe+gt;$=_==0?rt:0,y=_==1?rt:0;let Tt=f.font[0],It=f.align==1?Qn:f.align==2?uo:ye>0?Qn:ye<0?uo:_==0?"center":h==3?uo:Qn,qt=ye||_==1?"middle":h==2?Sl:Fr;bi(Tt,E,It,qt);let yt=f.font[1]*f.lineGap,At=me.map(at=>k(r(at,V,H,X))),Nt=f._values;for(let at=0;at<Nt.length;at++){let bt=Nt[at];if(bt!=null){_==0?y=At[at]:$=At[at],bt=""+bt;let Mn=bt.indexOf(`
`)==-1?[bt]:bt.split(/\n/gm);for(let ct=0;ct<Mn.length;ct++){let Bi=Mn[ct];ye?(d.save(),d.translate(y,$+ct*yt),d.rotate(ye),d.fillText(Bi,0,0),d.restore()):d.fillText(Bi,y,$+ct*yt)}}}Z.show&&Ws(At,Z.filter(l,pe,c,z,re),_,h,Oe,Pe,we(Z.width*_e,3),Z.stroke(l,c),Z.dash,Z.cap);let Kt=f.grid;Kt.show&&Ws(At,Kt.filter(l,pe,c,z,re),_,_==0?2:1,_==0?Mt:vt,_==0?Ot:ht,we(Kt.width*_e,3),Kt.stroke(l,c),Kt.dash,Kt.cap),K.show&&Ws([Oe],[1],_==0?1:0,_==0?1:2,_==1?Mt:vt,_==1?Ot:ht,we(K.width*_e,3),K.stroke(l,c),K.dash,K.cap)}Je("drawAxes")}function Un(c){b.forEach((f,h)=>{h>0&&(f._paths=null,c&&(s==1?(f.min=null,f.max=null):f.facets.forEach(_=>{_.min=null,_.max=null})))})}let Yl=!1,qs=!1,yl=[];function Ou(){qs=!1;for(let c=0;c<yl.length;c++)Je(...yl[c]);yl.length=0}function Bn(){Yl||(Hh(xi),Yl=!0)}function Ru(c,f=!1){Yl=!0,qs=f,c(l),xi(),f&&yl.length>0&&queueMicrotask(Ou)}l.batch=Ru;function xi(){if(Ps&&(Mu(),Ps=!1),In&&(yu(),In=!1),Bl){if(Te(v,Qn,xe),Te(v,Sl,Ue),Te(v,Cl,ne),Te(v,El,F),Te(w,Qn,xe),Te(w,Sl,Ue),Te(w,Cl,ne),Te(w,El,F),Te(m,Cl,xt),Te(m,El,gn),p.width=Be(xt*_e),p.height=Be(gn*_e),x.forEach(({_el:c,_show:f,_size:h,_pos:_,side:y})=>{if(c!=null)if(f){let $=y===3||y===0?h:0,E=y%2==1;Te(c,E?"left":"top",_-$),Te(c,E?"width":"height",h),Te(c,E?"top":"left",E?Ue:xe),Te(c,E?"height":"width",E?F:ne),Po(c,Tn)}else $t(c,Tn)}),ql=Hn=Is=zs=Vs=Fs=Hs=Us=Ns=null,mt=1,wl(!0),xe!=Rn||Ue!=yn||ne!=Ut||F!=bn){Un(!1);let c=ne/Ut,f=F/bn;if(Qe&&!$n&&q.left>=0){q.left*=c,q.top*=f,jn&&Gt(jn,Be(q.left),0,ne,F),Wn&&Gt(Wn,0,Be(q.top),ne,F);for(let h=0;h<Et.length;h++){let _=Et[h];_!=null&&(Vn[h]*=c,Fn[h]*=f,Gt(_,Dt(Vn[h]),Dt(Fn[h]),ne,F))}}if(Ce.show&&!jl&&Ce.left>=0&&Ce.width>0){Ce.left*=c,Ce.width*=c,Ce.top*=f,Ce.height*=f;for(let h in Qs)Te(Gn,h,Ce[h])}Rn=xe,yn=Ue,Ut=ne,bn=F}Je("setSize"),Bl=!1}xt>0&&gn>0&&(d.clearRect(0,0,p.width,p.height),Je("drawClear"),D.forEach(c=>c()),Je("draw")),Ce.show&&jl&&(Jl(Ce),jl=!1),Qe&&$n&&(xn(null,!0,!1),$n=!1),te.show&&te.live&&Ct&&(Js(),Ct=!1),a||(a=!0,l.status=1,Je("ready")),gl=!1,Yl=!1}l.redraw=(c,f)=>{In=f||!1,c!==!1?an(T,O.min,O.max):Bn()};function Ks(c,f){let h=C[c];if(h.from==null){if(Xe==0){let _=h.range(l,f.min,f.max,c);f.min=_[0],f.max=_[1]}if(f.min>f.max){let _=f.min;f.min=f.max,f.max=_}if(Xe>1&&f.min!=null&&f.max!=null&&f.max-f.min<1e-16)return;c==T&&h.distr==2&&Xe>0&&(f.min=Vt(f.min,t[0]),f.max=Vt(f.max,t[0]),f.min==f.max&&f.max++),B[c]=f,Ps=!0,Bn()}}l.setScale=Ks;let Gs,Ys,jn,Wn,Mi,Ci,qn,Kn,Ei,Ti,Me,Ae,rn=!1;const et=q.drag;let Ge=et.x,Ye=et.y;Qe&&(q.x&&(Gs=Lt(dh,w)),q.y&&(Ys=Lt(fh,w)),O.ori==0?(jn=Gs,Wn=Ys):(jn=Ys,Wn=Gs),Me=q.left,Ae=q.top);const Ce=l.select=He({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Gn=Ce.show?Lt(uh,Ce.over?w:v):null;function Jl(c,f){if(Ce.show){for(let h in c)Ce[h]=c[h],h in Qs&&Te(Gn,h,c[h]);f!==!1&&Je("setSelect")}}l.setSelect=Jl;function Iu(c){if(b[c].show)Re&&Po(Se[c],Tn);else if(Re&&$t(Se[c],Tn),Qe){let h=zn?Et[0]:Et[c];h!=null&&Gt(h,-10,-10,ne,F)}}function an(c,f,h){Ks(c,{min:f,max:h})}function jt(c,f,h,_){f.focus!=null&&Hu(c),f.show!=null&&b.forEach((y,$)=>{$>0&&(c==$||c==null)&&(y.show=f.show,Iu($),s==2?(an(y.facets[0].scale,null,null),an(y.facets[1].scale,null,null)):an(y.scale,null,null),Bn())}),h!==!1&&Je("setSeries",c,f),_&&kl("setSeries",l,c,f)}l.setSeries=jt;function Nu(c,f){He(S[c],f)}function zu(c,f){c.fill=ae(c.fill||null),c.dir=he(c.dir,-1),f=f??S.length,S.splice(f,0,c)}function Vu(c){c==null?S.length=0:S.splice(c,1)}l.addBand=zu,l.setBand=Nu,l.delBand=Vu;function Fu(c,f){b[c].alpha=f,Qe&&Et[c]!=null&&(Et[c].style.opacity=f),Re&&Se[c]&&(Se[c].style.opacity=f)}let Xt,cn,Sn;const Yn={focus:!0};function Hu(c){if(c!=Sn){let f=c==null,h=Bt.alpha!=1;b.forEach((_,y)=>{if(s==1||y>0){let $=f||y==0||y==c;_._focus=f?null:$,h&&Fu(y,$?1:Bt.alpha)}}),Sn=c,h&&Bn()}}Re&&Nn&&ze(jr,ue,c=>{q._lock||(wn(c),Sn!=null&&jt(null,Yn,!0,Ve.setSeries))});function Wt(c,f,h){let _=C[f];h&&(c=c/_e-(_.ori==1?Ue:xe));let y=ne;_.ori==1&&(y=F,c=y-c),_.dir==-1&&(c=y-c);let $=_._min,E=_._max,P=c/y,R=$+(E-$)*P,z=_.distr;return z==3?ul(10,R):z==4?Th(R,_.asinh):z==100?_.bwd(R):R}function Uu(c,f){let h=Wt(c,T,f);return Vt(h,t[0],qe,Ke)}l.valToIdx=c=>Vt(c,t[0]),l.posToIdx=Uu,l.posToVal=Wt,l.valToPos=(c,f,h)=>C[f].ori==0?o(c,C[f],h?ht:ne,h?vt:0):i(c,C[f],h?Ot:F,h?Mt:0),l.setCursor=(c,f,h)=>{Me=c.left,Ae=c.top,xn(null,f,h)};function Ai(c,f){Te(Gn,Qn,Ce.left=c),Te(Gn,Cl,Ce.width=f)}function Li(c,f){Te(Gn,Sl,Ce.top=c),Te(Gn,El,Ce.height=f)}let bl=O.ori==0?Ai:Li,$l=O.ori==1?Ai:Li;function Bu(){if(Re&&te.live)for(let c=s==2?1:0;c<b.length;c++){if(c==0&&nt)continue;let f=te.values[c],h=0;for(let _ in f)St[c][h++].firstChild.nodeValue=f[_]}}function Js(c,f){if(c!=null&&(c.idxs?c.idxs.forEach((h,_)=>{fe[_]=h}):Ph(c.idx)||fe.fill(c.idx),te.idx=fe[0]),Re&&te.live){for(let h=0;h<b.length;h++)(h>0||s==1&&!nt)&&ju(h,fe[h]);Bu()}Ct=!1,f!==!1&&Je("setLegend")}l.setLegend=Js;function ju(c,f){let h=b[c],_=c==0&&Y==2?Rt:t[c],y;nt?y=h.values(l,c,f)??Ht:(y=h.value(l,f==null?null:_[f],c,f),y=y==null?Ht:{_:y}),te.values[c]=y}function xn(c,f,h){Ei=Me,Ti=Ae,[Me,Ae]=q.move(l,Me,Ae),q.left=Me,q.top=Ae,Qe&&(jn&&Gt(jn,Be(Me),0,ne,F),Wn&&Gt(Wn,0,Be(Ae),ne,F));let _,y=qe>Ke;Xt=$e,cn=null;let $=O.ori==0?ne:F,E=O.ori==1?ne:F;if(Me<0||Xe==0||y){_=q.idx=null;for(let P=0;P<b.length;P++){let R=Et[P];R!=null&&Gt(R,-10,-10,ne,F)}Nn&&jt(null,Yn,!0,c==null&&Ve.setSeries),te.live&&(fe.fill(_),Ct=!0)}else{let P,R,z;s==1&&(P=O.ori==0?Me:Ae,R=Wt(P,T),_=q.idx=Vt(R,t[0],qe,Ke),z=U(t[0][_],O,$,0));let V=-10,H=-10,X=0,me=0,pe=!0,re="",Z="";for(let K=s==2?1:0;K<b.length;K++){let Ee=b[K],Pe=fe[K],Ze=Pe==null?null:s==1?t[K][Pe]:t[K][1][Pe],ye=q.dataIdx(l,K,_,R),Oe=ye==null?null:s==1?t[K][ye]:t[K][1][ye];if(Ct=Ct||Oe!=Ze||ye!=Pe,fe[K]=ye,K>0&&Ee.show){let gt=ye==null?-10:ye==_?z:U(s==1?t[0][ye]:t[K][0][ye],O,$,0),rt=Oe==null?-10:G(Oe,s==1?C[Ee.scale]:C[Ee.facets[1].scale],E,0);if(Nn&&Oe!=null){let Tt=O.ori==1?Me:Ae,It=je(Bt.dist(l,K,ye,rt,Tt));if(It<Xt){let qt=Bt.bias;if(qt!=0){let yt=Wt(Tt,Ee.scale),At=Oe>=0?1:-1,Nt=yt>=0?1:-1;Nt==At&&(Nt==1?qt==1?Oe>=yt:Oe<=yt:qt==1?Oe<=yt:Oe>=yt)&&(Xt=It,cn=K)}else Xt=It,cn=K}}if(Ct||zn){let Tt,It;O.ori==0?(Tt=gt,It=rt):(Tt=rt,It=gt);let qt,yt,At,Nt,Kt,at,bt=!0,Mn=st.bbox;if(Mn!=null){bt=!1;let ct=Mn(l,K);At=ct.left,Nt=ct.top,qt=ct.width,yt=ct.height}else At=Tt,Nt=It,qt=yt=st.size(l,K);if(at=st.fill(l,K),Kt=st.stroke(l,K),zn)K==cn&&Xt<=Bt.prox&&(V=At,H=Nt,X=qt,me=yt,pe=bt,re=at,Z=Kt);else{let ct=Et[K];ct!=null&&(Vn[K]=At,Fn[K]=Nt,Zr(ct,qt,yt,bt),Yr(ct,at,Kt),Gt(ct,Dt(At),Dt(Nt),ne,F))}}}}if(zn){let K=Bt.prox,Ee=Sn==null?Xt<=K:Xt>K||cn!=Sn;if(Ct||Ee){let Pe=Et[0];Pe!=null&&(Vn[0]=V,Fn[0]=H,Zr(Pe,X,me,pe),Yr(Pe,re,Z),Gt(Pe,Dt(V),Dt(H),ne,F))}}}if(Ce.show&&rn)if(c!=null){let[P,R]=Ve.scales,[z,V]=Ve.match,[H,X]=c.cursor.sync.scales,me=c.cursor.drag;if(Ge=me._x,Ye=me._y,Ge||Ye){let{left:pe,top:re,width:Z,height:K}=c.select,Ee=c.scales[H].ori,Pe=c.posToVal,Ze,ye,Oe,gt,rt,Tt=P!=null&&z(P,H),It=R!=null&&V(R,X);Tt&&Ge?(Ee==0?(Ze=pe,ye=Z):(Ze=re,ye=K),Oe=C[P],gt=U(Pe(Ze,H),Oe,$,0),rt=U(Pe(Ze+ye,H),Oe,$,0),bl(Ft(gt,rt),je(rt-gt))):bl(0,$),It&&Ye?(Ee==1?(Ze=pe,ye=Z):(Ze=re,ye=K),Oe=C[R],gt=G(Pe(Ze,X),Oe,E,0),rt=G(Pe(Ze+ye,X),Oe,E,0),$l(Ft(gt,rt),je(rt-gt))):$l(0,E)}else Xs()}else{let P=je(Ei-Mi),R=je(Ti-Ci);if(O.ori==1){let X=P;P=R,R=X}Ge=et.x&&P>=et.dist,Ye=et.y&&R>=et.dist;let z=et.uni;z!=null?Ge&&Ye&&(Ge=P>=z,Ye=R>=z,!Ge&&!Ye&&(R>P?Ye=!0:Ge=!0)):et.x&&et.y&&(Ge||Ye)&&(Ge=Ye=!0);let V,H;Ge&&(O.ori==0?(V=qn,H=Me):(V=Kn,H=Ae),bl(Ft(V,H),je(H-V)),Ye||$l(0,E)),Ye&&(O.ori==1?(V=qn,H=Me):(V=Kn,H=Ae),$l(Ft(V,H),je(H-V)),Ge||bl(0,$)),!Ge&&!Ye&&(bl(0,0),$l(0,0))}if(et._x=Ge,et._y=Ye,c==null){if(h){if(Ui!=null){let[P,R]=Ve.scales;Ve.values[0]=P!=null?Wt(O.ori==0?Me:Ae,P):null,Ve.values[1]=R!=null?Wt(O.ori==1?Me:Ae,R):null}kl(fo,l,Me,Ae,ne,F,_)}if(Nn){let P=h&&Ve.setSeries,R=Bt.prox;Sn==null?Xt<=R&&jt(cn,Yn,!0,P):Xt>R?jt(null,Yn,!0,P):cn!=Sn&&jt(cn,Yn,!0,P)}}Ct&&(te.idx=_,Js()),f!==!1&&Je("setCursor")}let un=null;Object.defineProperty(l,"rect",{get(){return un==null&&wl(!1),un}});function wl(c=!1){c?un=null:(un=w.getBoundingClientRect(),Je("syncRect",un))}function Di(c,f,h,_,y,$,E){q._lock||rn&&c!=null&&c.movementX==0&&c.movementY==0||(Zs(c,f,h,_,y,$,E,!1,c!=null),c!=null?xn(null,!0,!0):xn(f,!0,!1))}function Zs(c,f,h,_,y,$,E,P,R){if(un==null&&wl(!1),wn(c),c!=null)h=c.clientX-un.left,_=c.clientY-un.top;else{if(h<0||_<0){Me=-10,Ae=-10;return}let[z,V]=Ve.scales,H=f.cursor.sync,[X,me]=H.values,[pe,re]=H.scales,[Z,K]=Ve.match,Ee=f.axes[0].side%2==1,Pe=O.ori==0?ne:F,Ze=O.ori==1?ne:F,ye=Ee?$:y,Oe=Ee?y:$,gt=Ee?_:h,rt=Ee?h:_;if(pe!=null?h=Z(z,pe)?r(X,C[z],Pe,0):-10:h=Pe*(gt/ye),re!=null?_=K(V,re)?r(me,C[V],Ze,0):-10:_=Ze*(rt/Oe),O.ori==1){let Tt=h;h=_,_=Tt}}R&&(f==null||f.cursor.event.type==fo)&&((h<=1||h>=ne-1)&&(h=Cn(h,ne)),(_<=1||_>=F-1)&&(_=Cn(_,F))),P?(Mi=h,Ci=_,[qn,Kn]=q.move(l,h,_)):(Me=h,Ae=_)}const Qs={width:0,height:0,left:0,top:0};function Xs(){Jl(Qs,!1)}let Pi,Oi,Ri,Ii;function Ni(c,f,h,_,y,$,E){rn=!0,Ge=Ye=et._x=et._y=!1,Zs(c,f,h,_,y,$,E,!0,!1),c!=null&&(ze(po,Lo,zi,!1),kl(Ur,l,qn,Kn,ne,F,null));let{left:P,top:R,width:z,height:V}=Ce;Pi=P,Oi=R,Ri=z,Ii=V}function zi(c,f,h,_,y,$,E){rn=et._x=et._y=!1,Zs(c,f,h,_,y,$,E,!1,!0);let{left:P,top:R,width:z,height:V}=Ce,H=z>0||V>0,X=Pi!=P||Oi!=R||Ri!=z||Ii!=V;if(H&&X&&Jl(Ce),et.setScale&&H&&X){let me=P,pe=z,re=R,Z=V;if(O.ori==1&&(me=R,pe=V,re=P,Z=z),Ge&&an(T,Wt(me,T),Wt(me+pe,T)),Ye)for(let K in C){let Ee=C[K];K!=T&&Ee.from==null&&Ee.min!=$e&&an(K,Wt(re+Z,K),Wt(re,K))}Xs()}else q.lock&&(q._lock=!q._lock,xn(f,!0,c!=null));c!=null&&(lt(po,Lo),kl(po,l,Me,Ae,ne,F,null))}function Wu(c,f,h,_,y,$,E){if(q._lock)return;wn(c);let P=rn;if(rn){let R=!0,z=!0,V=10,H,X;O.ori==0?(H=Ge,X=Ye):(H=Ye,X=Ge),H&&X&&(R=Me<=V||Me>=ne-V,z=Ae<=V||Ae>=F-V),H&&R&&(Me=Me<qn?0:ne),X&&z&&(Ae=Ae<Kn?0:F),xn(null,!0,!0),rn=!1}Me=-10,Ae=-10,fe.fill(null),xn(null,!0,!0),P&&(rn=P)}function Vi(c,f,h,_,y,$,E){q._lock||(wn(c),Rs(),Xs(),c!=null&&kl(Wr,l,Me,Ae,ne,F,null))}function Fi(){x.forEach(Y0),Os(l.width,l.height,!0)}Ln(hs,il,Fi);const Jn={};Jn.mousedown=Ni,Jn.mousemove=Di,Jn.mouseup=zi,Jn.dblclick=Vi,Jn.setSeries=(c,f,h,_)=>{let y=Ve.match[2];h=y(l,f,h),h!=-1&&jt(h,_,!0,!1)},Qe&&(ze(Ur,w,Ni),ze(fo,w,Di),ze(Br,w,c=>{wn(c),wl(!1)}),ze(jr,w,Wu),ze(Wr,w,Vi),Vo.add(l),l.syncRect=wl);const Zl=l.hooks=e.hooks||{};function Je(c,f,h){qs?yl.push([c,f,h]):c in Zl&&Zl[c].forEach(_=>{_.call(null,l,f,h)})}(e.plugins||[]).forEach(c=>{for(let f in c.hooks)Zl[f]=(Zl[f]||[]).concat(c.hooks[f])});const Hi=(c,f,h)=>h,Ve=He({key:null,setSeries:!1,filters:{pub:na,sub:na},scales:[T,b[1]?b[1].scale:null],match:[la,la,Hi],values:[null,null]},q.sync);Ve.match.length==2&&Ve.match.push(Hi),q.sync=Ve;const Ui=Ve.key,eo=su(Ui);function kl(c,f,h,_,y,$,E){Ve.filters.pub(c,f,h,_,y,$,E)&&eo.pub(c,f,h,_,y,$,E)}eo.sub(l);function qu(c,f,h,_,y,$,E){Ve.filters.sub(c,f,h,_,y,$,E)&&Jn[c](null,f,h,_,y,$,E)}l.pub=qu;function Ku(){eo.unsub(l),Vo.delete(l),Ne.clear(),Oo(hs,il,Fi),u.remove(),ue==null||ue.remove(),Je("destroy")}l.destroy=Ku;function to(){Je("init",e,t),gi(t||e.data,!1),B[T]?Ks(T,B[T]):Rs(),jl=Ce.show&&(Ce.width>0||Ce.height>0),$n=Ct=!0,Os(e.width,e.height)}return b.forEach(_i),x.forEach(xu),n?n instanceof HTMLElement?(n.appendChild(u),to()):n(l,to):to(),l}it.assign=He;it.fmtNum=si;it.rangeNum=ms;it.rangeLog=Ms;it.rangeAsinh=ni;it.orient=On;it.pxRatio=_e;it.join=Fh;it.fmtDate=ii,it.tzDate=Zh;it.sync=su;{it.addGap=P0,it.clipGaps=Ts;let e=it.paths={points:uu};e.linear=fu,e.stepped=I0,e.bars=N0,e.spline=V0}function J0(e){let t;return{hooks:{init(n){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",n.over.appendChild(t)},setCursor(n){const l=n.cursor.idx;if(l==null||!n.data[1]||n.data[1][l]==null){t.style.display="none";return}const s=n.data[0][l],o=n.data[1][l],i=new Date(s*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):_t(o)}</b> ${i}`;const r=Math.round(n.valToPos(s,"x"));t.style.left=Math.min(r,n.over.clientWidth-80)+"px",t.style.display=""}}}}function Z0(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const n=document.createElement("span");n.style.color=e,document.body.appendChild(n);const l=getComputedStyle(n).color;n.remove();const s=l.match(/[\d.]+/g);return s&&s.length>=3?`rgba(${s[0]},${s[1]},${s[2]},${t})`:`rgba(100,100,100,${t})`}function Q0({data:e,color:t,smooth:n,height:l,yMax:s,fmtVal:o,ariaLabel:i,ariaHidden:r}){const a=ee(null),u=ee(null),p=l||55;return ce(()=>{if(!a.current||!e||e[0].length<2)return;const d=n?Nd(e[1]):e[1],m=[e[0],d];if(u.current){u.current.setData(m);return}const v=s?(A,k,M)=>[0,Math.max(s,M*1.05)]:(A,k,M)=>[Math.max(0,k*.9),M*1.1],w={width:a.current.clientWidth||200,height:p,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:v}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:Od(t),width:1.5,fill:Z0(t,.09)}],plugins:[J0(o)]};return u.current=new it(w,m,a.current),()=>{u.current&&(u.current.destroy(),u.current=null)}},[e,t,n]),ce(()=>{if(!u.current||!a.current)return;const d=new ResizeObserver(()=>{u.current&&a.current&&u.current.setSize({width:a.current.clientWidth,height:p})});return d.observe(a.current),()=>d.disconnect()},[]),g`<div class="chart-wrap"
    role=${r?null:"img"}
    aria-hidden=${r?"true":null}
    aria-label=${r?null:i||"Sparkline chart"}
    style=${"height:"+p+"px"} ref=${a}></div>`}function X0(e){if(!e||!e[1])return null;const t=e[1].filter(s=>s!=null&&!isNaN(s));if(t.length<2)return null;const n=t[0],l=t[t.length-1];if(n>0){const s=(l-n)/n*100;return Math.abs(s)<1?null:{dir:s>0?"▲":"▼",pct:Math.round(Math.abs(s))}}return l>0?{dir:"▲",pct:null}:null}function em({label:e,value:t,valColor:n,data:l,chartColor:s,smooth:o,refLines:i,yMax:r,dp:a,iconName:u}){const p=De(()=>{if(!l||!l[1]||l[1].length<2)return[];const m=r?Math.max(r,l[1].reduce((v,w)=>Math.max(v,w),0)*1.05):l[1].reduce((v,w)=>Math.max(v,w),0)*1.1;return(i||[]).map(v=>{if(m<=0)return null;const w=(1-v.value/m)*100;return w>=0&&w<=95?{...v,pct:w}:null}).filter(Boolean)},[l,i,r]),d=De(()=>X0(l),[l]);return g`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${a?{"data-dp":a}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${u?g`<${Zt} name=${u} size="0.85em"/> `:""}${e}</span>
      <span class="chart-val-group">
        ${d?g`<span class="chart-trend" aria-hidden="true">${d.dir}${d.pct!=null?" "+d.pct+"%":""}</span>`:""}
        <span class="chart-val" style=${n?"color:"+n:null} aria-live="polite" aria-atomic="true">${t}</span>
      </span>
    </div>
    <div style="position:relative">
      ${p.map((m,v)=>g`<${_n} key=${m.label??v}>
          <div class="chart-ref-line" style=${"top:"+m.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+m.pct+"% - 8px)"}>${m.label}</div>
        </${_n}>`)}
      ${l&&l[0].length>=2?g`<${Q0} data=${l} color=${s||"var(--accent)"} smooth=${o} yMax=${r} ariaHidden=${!0}/>`:g`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:var(--fs-base)">collecting...</div>`}
    </div>
  </div>`}function tm({pct:e,direction:t,inverse:n=!1,compareLabel:l}){if(e==null||t==null)return null;const s=t==="flat"||e===0,o=s?"•":t==="up"?"▲":"▼";let i="neutral";s||(i=(n?t==="down":t==="up")?"success":"danger");const r=Number.isFinite(e)?Math.abs(e).toFixed(Math.abs(e)>=10?0:1):"0",a=g`<${Lr} variant=${i} size="sm"
    aria-label=${"Delta: "+o+" "+r+"%"+(l?" vs "+l:"")}
  >${o} ${r}%</${Lr}>`;return l?g`<${Dr} content=${"vs. "+l}>${a}</${Dr}>`:a}function Ho({label:e,value:t,accent:n,dp:l,sm:s,delta:o,deltaInverse:i}){const r=ee(t),[a,u]=Q(!1);return ce(()=>{r.current!==t&&(u(!0),setTimeout(()=>u(!1),500)),r.current=t},[t]),g`<div class=${"metric"+(s?" metric--sm":"")} aria-label="${e}: ${t}" ...${l?{"data-dp":l}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(n?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
    ${o?g`<div class="metric-delta"><${tm}
      pct=${o.pct} direction=${o.direction}
      inverse=${i} compareLabel=${o.compareLabel}/></div>`:null}
  </div>`}function xa({snap:e,mode:t}){if(!e)return null;const n=!t||t==="files",l=!t||t==="traffic",s=e.tools.filter(u=>{var p;return u.tool!=="aictl"&&((p=u.files)==null?void 0:p.length)}),o=s.reduce((u,p)=>u+p.files.length,0)||1,i=u=>(Number(u.live.outbound_rate_bps)||0)+(Number(u.live.inbound_rate_bps)||0),r=e.tools.filter(u=>u.tool!=="aictl"&&u.live&&i(u)>0),a=r.reduce((u,p)=>u+i(p),0)||1;return g`
    ${n&&s.length>0&&g`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+s.map(u=>u.label+" "+u.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${s.map(u=>g`
        <div class="rbar-seg" style=${"width:"+(u.files.length/o*100).toFixed(1)+"%;background:"+(el[u.tool]||"var(--fg2)")}
          title="${u.label}: ${u.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${s.map(u=>g`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(el[u.tool]||"var(--fg2)")}></span>
          ${u.label} <span class="text-muted">${u.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${l&&g`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(r.length?r.map(u=>u.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${r.length===0?" — no active traffic":""}</div>
      <div class="rbar">${r.map(u=>{const p=i(u);return g`<div class="rbar-seg" style=${"width:"+(p/a*100).toFixed(1)+"%;background:"+(el[u.tool]||"var(--fg2)")}
          title="${u.label}: ${xo(p)}"></div>`})}
      </div>
      <div class="rbar-legend">${r.map(u=>{const p=i(u);return g`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(el[u.tool]||"var(--fg2)")}></span>
          ${u.label} <span class="text-muted">${xo(p)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!s.length&&!r.length&&g`<div class="empty-state">
      No AI tool resources found yet.
      <small class="empty-state-source">/api/snapshot · tools[].files · tools[].live</small>
    </div>`}`}const nm=18e4;function lm({loading:e,error:t,data:n,isEmpty:l,updatedAt:s,staleMs:o=nm,now:i=Date.now()}){return n!=null?l&&l(n)?t?"error":"empty":t||s&&i-s>o?"stale":"ready":t?"error":e?"loading":"empty"}function sm(e){return e&&(typeof e=="string"?e:e.message)||"The request failed."}function hn({status:e,error:t,updatedAt:n,onRetry:l,emptyTitle:s="No data",emptyHint:o,emptyFix:i,skeletonHeight:r="72px",label:a,children:u}){if(e==="loading")return g`<div class="panel-state panel-state--loading" role="status" aria-busy="true"
      aria-label=${"Loading "+(a||"panel")}>
      <${ol} height=${r} radius="var(--radius-sm)"/>
    </div>`;if(e==="error")return g`<div class="panel-state panel-state--error" role="alert">
      <${Zt} name="alert-triangle" size="14"/>
      <div>
        <div class="panel-state__title">Could not load ${a||"this panel"}</div>
        <div class="panel-state__hint">${sm(t)}</div>
      </div>
      ${l&&g`<button type="button" class="range-btn" onClick=${l}>Retry</button>`}
    </div>`;if(e==="empty")return g`<div class="panel-state panel-state--empty" role="status">
      <div class="panel-state__title">${s}</div>
      ${o&&g`<div class="panel-state__hint">${o}</div>`}
      ${i&&g`<code class="panel-state__fix">${i}</code>`}
    </div>`;const p=n?Math.max(0,Math.round((Date.now()-n)/1e3)):null;return g`
    ${e==="stale"&&g`<div class="panel-state panel-state--stale" role="status">
      <${Zt} name="clock" size="12"/>
      <span>${t?"Refresh failed. ":""}Showing data from ${p!=null?Yo(p)+" ago":"an earlier fetch"}.</span>
      ${l&&g`<button type="button" class="panel-state__retry" onClick=${l}>Retry</button>`}
    </div>`}
    ${u}`}function om({perCore:e}){if(!e||!e.length)return null;const t=100;return g`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((n,l)=>{const s=Math.max(1,n/t*100),o=n>80?"var(--red)":n>50?"var(--orange)":n>20?"var(--green)":"var(--fg2)";return g`<div key=${l} title=${"Core "+l+": "+al(n)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+s+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function im({mcpDetail:e}){return e!=null&&e.length?g`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{const n=Td[t.status]||"var(--fg3)";return g`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${n}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ll(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${Rd(t.tool)};white-space:nowrap;flex-shrink:0">${ll(t.tool)}</span>
      </div>`})}
  </div>`:g`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`}function rm({label:e,value:t,mcpDetail:n}){const[l,s]=Q(!1);return g`<div style="position:relative;cursor:default"
    tabindex="0"
    onMouseEnter=${()=>s(!0)} onMouseLeave=${()=>s(!1)}
    onFocusIn=${()=>s(!0)} onFocusOut=${()=>s(!1)}>
    <${Ho} label=${e} value=${t} sm=${!0}/>
    ${l&&g`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      <${im} mcpDetail=${n}/>
    </div>`}
  </div>`}function am({snap:e,history:t}){const[n,l]=Q(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),s=se(()=>{l(a=>{const u=!a;try{localStorage.setItem("aictl-header-expanded",String(u))}catch{}return u})},[]),o=a=>t!=null&&t.ts&&t.ts.length>=2?[t.ts,t[a]]:null,i=(e==null?void 0:e.cpu_cores)||1,r={cores:i};return g`
    <div class="grid-sparklines">
      ${Al.sparklines.map(a=>{const u=e?e["total_"+a.field]??e[a.field]??"":"",p=oo(u,a.format,a.suffix,a.multiply),d=a.yMaxExpr?mr(a.yMaxExpr,r):void 0,m=(a.refLines||[]).map(v=>({value:mr(v.valueExpr,r),label:(v.label||"").replace("{cores}",i)})).filter(v=>v.value!=null);return g`<${em} key=${a.field} label=${a.label} value=${p}
          data=${o(a.field)} chartColor=${a.color||"var(--accent)"}
          smooth=${!!a.smooth} refLines=${m.length?m:void 0}
          yMax=${d} dp=${a.dp} iconName=${a.iconName}/>`})}
    </div>

    <div class=${n?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>
      <div class="mb-sm header-top-row">
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${om} perCore=${(e==null?void 0:e.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${xa} snap=${e} mode="traffic"/></div>
        </div>
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${Al.liveMetrics.map(a=>{const u=e?e[a.field]??"":"",p=oo(u,a.format,a.suffix,a.multiply);return g`<${Ho} key=${a.field} label=${a.label} value=${p}
                accent=${!!a.accent} dp=${a.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div class="grid-inventory">
          ${Al.inventory.map(a=>{const u=e?e[a.field]??"":"",p=oo(u,a.format,a.suffix,a.multiply);return a.field==="total_mcp_servers"?g`<${rm} key=${a.field} label=${a.label} value=${p}
                mcpDetail=${(e==null?void 0:e.mcp_detail)||[]}/>`:g`<${Ho} key=${a.field} label=${a.label} value=${p}
              accent=${!!a.accent} dp=${a.dp} sm=${!0}/>`})}
        </div>
      </div>
      <div class="mb-sm"><${xa} snap=${e} mode="files"/></div>
    </div>
    <button class="header-toggle" onClick=${s} aria-label="Toggle details"
      aria-expanded=${n}>
      <span aria-hidden="true">${n?"▲":"▼"}</span> ${n?"less":"more"}
    </button>
  `}const Ma={error:0,warn:1,info:2};function Ca(e,t){if(e==="claude-code")return`aictl hooks install --port ${t}`;const n=["copilot","gemini","codex"].find(l=>String(e).startsWith(l));return`aictl enable${n?" --tool "+n:""} --port ${t}`}function Ea(e){return String(e||"").split("-")[0]}function cm(e,t){var o,i,r;if(!(e!=null&&e.tools))return[];const n=[],l=e.server_port,s=t?new Set([...t].map(Ea)):null;for(const a of Object.values(e.tools))if(a.status==="missing"){if(s&&!s.has(Ea(a.tool)))continue;const u=Ca(a.tool,l);n.push({id:"hooks:"+a.tool,level:"warn",title:`${a.tool}: hooks not installed`,detail:"No per-tool-call events, so the tool, skill and subagent panels stay empty.",fix:u})}else if(a.status==="disabled"){const u=((o=(a.sources||[]).find(p=>p.host_reason&&!p.host_enabled))==null?void 0:o.host_reason)||"The host tool has hooks turned off.";n.push({id:"hooks:"+a.tool,level:"warn",title:`${a.tool}: hooks disabled by host`,detail:u,fix:u.startsWith("chat.hookFilesLocations")?`Set ${u.replace(/ is false$/,"")} to true in VS Code settings`:null})}else if(a.status==="misconfigured"||a.status==="fail"){const u=(i=a.warnings)==null?void 0:i[0],p=((r=a.warnings)==null?void 0:r.length)>1?`, +${a.warnings.length-1} more`:"";n.push({id:"hooks:"+a.tool,level:"error",title:`${a.tool}: hooks misconfigured`,detail:u?`${u.message} (${u.path}${p})`:"Hook checks failed.",fix:Ca(a.tool,l)})}return e.total_configured>0&&e.total_fired_24h===0&&n.length===0&&n.push({id:"hooks:silent",level:"warn",title:`${e.total_configured} hooks configured, 0 fired in 24 h`,detail:"Hooks are installed but no event has reached this dashboard.",fix:null}),n}function um(e){const t=[];for(const n of(e==null?void 0:e.items)||[])n.status==="ok"||n.severity==="info"||n.status!=="source_missing"&&t.push({id:"quality:"+n.component,level:n.severity==="error"?"error":"warn",title:`${n.component}: ${n.status}`,detail:n.message+(n.source?` (${n.source})`:""),fix:null});return t}function dm({connected:e,snapAgeS:t,hooks:n,quality:l,otelActive:s,alerts:o=[],storage:i=null,hiddenContext:r,runningTools:a=null}){const u=[];(r==null?void 0:r.count)>0?u.push({id:"hidden-context",level:"warn",tab:"hidden",title:`${r.count} unseen context source${r.count===1?"":"s"} found`,detail:r.detail||"Text reaches a model without appearing in its visible configuration.",fix:null}):r===null&&u.push({id:"hidden-context",level:"info",tab:"hidden",title:"Hidden context not checked",detail:"No detector has reported for this build.",fix:null}),i!=null&&i.degraded?u.push({id:"storage",level:"error",title:"Storage degraded: capture is being reduced",detail:`${vs(i)}. New data may lose text or be dropped until disk use is under budget.`,fix:null}):(i==null?void 0:i.pct)>=90&&u.push({id:"storage",level:"warn",title:`Storage at ${i.pct}% of budget`,detail:vs(i),fix:null}),e===!1?u.push({id:"sse",level:"error",title:"Live stream disconnected",detail:"Figures show the last received values. Retrying automatically.",fix:"aictl daemon serve"}):t!=null&&t>60&&u.push({id:"stale",level:"warn",title:`Snapshot is ${Math.round(t)} s old`,detail:"The stream is connected but the collector stopped publishing.",fix:"aictl doctor"});for(const p of o)u.push({id:"alert:"+p.msg,level:p.level==="red"?"error":"warn",title:p.msg,detail:"The Processes tab lists the affected PIDs.",fix:null,tab:"procs"});return u.push(...cm(n,a),...um(l)),s===!1&&u.push({id:"otel",level:"info",title:"OTel receiver has no data",detail:"Exact token and cost figures need it. Estimates are used until then.",fix:"aictl otel enable"}),u.sort((p,d)=>Ma[p.level]-Ma[d.level])}function pi(e){var l;if(!e)return null;const t=e.storage_bytes??((l=e.db)==null?void 0:l.file_size_bytes)??null,n=e.storage_budget_bytes||null;return{mode:e.capture_mode||null,used:t,budget:n,pct:t!=null&&n?Math.round(t/n*100):null,degraded:!!e.storage_degraded}}function vs(e){if(!e||e.used==null)return"Disk use not reported";const t=Jt(e.used);return e.budget?`${t} of ${Jt(e.budget)} (${e.pct}%)`:`${t}, no budget set`}function fm(e,t){return((e==null?void 0:e.sessions)||[]).filter(l=>l.tool&&(t==null||t.includes(l.tool))).sort((l,s)=>(s.cpu_percent||0)-(l.cpu_percent||0)||(s.last_seen_at||0)-(l.last_seen_at||0))}function pm(e){return/^[^:]+:\d+:\d+$/.test((e==null?void 0:e.session_id)||"")}function hm(e){const t=e.filter(pm).length,n=e.length-t,l=new Set(e.map(r=>r.tool)).size,s=`process tree${t===1?"":"s"}`,o=`session${n===1?"":"s"}`;return`${t&&n?`${n} ${o} and ${t} ${s}`:t?s:o} in ${l} tool${l===1?"":"s"}`}function mm(e){let t=0;const n=l=>{for(const s of l||[])t+=s.mem_mb||0,n(s.children)};return n(e.process_tree),t}const _u="No price is known for this usage.";function Uo(e,t=2){return"$"+Number(e).toLocaleString(void 0,{minimumFractionDigits:t,maximumFractionDigits:t})}function Ta(e){return Number(e).toLocaleString(void 0,{maximumFractionDigits:2})}function vu(e){return String(e||"").replace(/_/g," ").replace(/^ai\b/i,"AI")}function _m(e,t=2){const n=(e==null?void 0:e.cost_reason)||"";if(e!=null&&e.billing_unit&&e.billing_amount!==null&&e.billing_amount!==void 0){const l=[];return e.premium_requests&&l.push(Ta(e.premium_requests)+" premium requests"),e.estimated_list_usd!==null&&e.estimated_list_usd!==void 0&&l.push("est. "+Uo(e.estimated_list_usd,t)+" at list price"),{main:Ta(e.billing_amount)+" "+vu(e.billing_unit),sub:l.join(", "),title:n,kind:"billing"}}return(e==null?void 0:e.cost_usd)===null||(e==null?void 0:e.cost_usd)===void 0?{main:"n/a",sub:"",title:n||_u,kind:"none"}:{main:Uo(e.cost_usd,t),sub:"est.",title:n||"Estimated from token counts and list prices. Not a billed amount.",kind:"estimate"}}function vm({row:e,digits:t=2,showSub:n=!0}){const l=_m(e,t);return g`<span class=${"cost-value cost-value--"+l.kind} title=${l.title}>${l.main}${n&&l.sub?g` <small class="cost-value__sub">${l.sub}</small>`:null}</span>`}function gm(e,t){const n=((e==null?void 0:e.tools)||[]).filter(a=>t==null||t.includes(a.tool)).filter(a=>a.counted_in_totals!==!1),l=new Map;let s=0,o=null,i=0;const r=new Set;for(const a of n){if(a.billing_unit&&a.billing_amount!==null&&a.billing_amount!==void 0){l.set(a.billing_unit,(l.get(a.billing_unit)||0)+a.billing_amount),s+=a.premium_requests||0;continue}if(a.cost_usd===null||a.cost_usd===void 0){i+=1,a.cost_reason&&r.add(a.cost_reason);continue}o=(o||0)+a.cost_usd}return{rows:n.slice().sort((a,u)=>(u.total_tokens||0)-(a.total_tokens||0)),billed:[...l.entries()].map(([a,u])=>({unit:a,amount:u})),premium:s,listUsd:o,unpriced:i,unpricedReason:[...r].join(" "),tokens:n.reduce((a,u)=>a+(u.total_tokens||0),0),sessions:n.reduce((a,u)=>a+(u.sessions||0),0)}}function _v(e){var l;const t=(e||[]).filter(s=>s.cost_usd!==null&&s.cost_usd!==void 0);if(!t.length)return{cost_usd:null,cost_reason:(l=e==null?void 0:e.find(s=>s.cost_reason))==null?void 0:l.cost_reason};const n=e.length-t.length;return{cost_usd:t.reduce((s,o)=>s+o.cost_usd,0),cost_reason:n?`${n} of ${e.length} rows have no known price and are not included.`:""}}const gs=Object.assign({"./HiddenContextPanel.js":()=>dt(()=>import("./HiddenContextPanel-DEAAqNqF.js"),__vite__mapDeps([0,1]))})["./HiddenContextPanel.js"],Aa=gs?ft(gs):null;async function ym(){if(!gs)return null;const e=await gs();if(e.getHiddenContextSummary)return e.getHiddenContextSummary();try{return bm(await ie("/api/context-audit"))}catch{return null}}function bm(e){if(!(e!=null&&e.counts))return null;const t=["high","medium","low"].filter(n=>e.counts[n]).map(n=>`${e.counts[n]} ${n}`);return{count:["high","medium","low"].reduce((n,l)=>n+(e.counts[l]||0),0),detail:t.length?`Findings by severity: ${t.join(", ")}.`:""}}function $m(){return Aa?g`<${An} fallback=${g`<${hn} status="loading" label="hidden context"/>`}>
    <${Aa}/>
  </${An}>`:g`<section class="now-panel" data-slot="hidden-context" aria-label="Hidden context">
      <${hn} status="empty" emptyTitle="Hidden context detection is not in this build"
        emptyHint="This view lists prompts and context sources that reach a model without appearing in its visible configuration. Rebuild the dashboard once the detector ships."/>
    </section>`}const La=8;function wm({snap:e,enabledTools:t,onOpenSession:n,onShowAll:l}){const s=De(()=>fm(e,t),[e,t]);return g`<section class="now-panel now-panel--running" aria-labelledby="now-running">
    <header class="now-panel__head">
      <h2 id="now-running">Running now</h2>
      ${!sl(e,t)&&g`<span class="now-panel__figure">${s.length}</span>
      <span class="now-panel__sub">${hm(s)}</span>`}
    </header>
    ${s.length===0?g`<${hn} status="empty" label="running sessions"
          emptyTitle=${sl(e,t)?"Not available from this machine":t?"No sessions for the selected tools":"No live sessions"}
          emptyHint=${sl(e,t)?"The selected tool runs in the vendor's cloud and has no local sessions.":t?"Widen the tool filter, or start a session in one of the selected tools.":"Start an AI coding tool. Sessions appear here within one sample interval."}/>`:g`<div class="now-table-wrap"><table class="now-table">
          <thead><tr>
            <th scope="col">Tool</th><th scope="col">Project</th>
            <th scope="col" class="num">Age</th><th scope="col" class="num">CPU</th>
            <th scope="col" class="num">RAM</th><th scope="col" class="num">Tokens</th>
          </tr></thead>
          <tbody>
            ${s.slice(0,La).map(o=>{const i=(o.exact_input_tokens||0)+(o.exact_output_tokens||0),r=mm(o);return g`<tr key=${o.session_id}>
                <td class="now-table__tool"><${Ss} tool=${o.tool} size="1em"/> ${o.label||Vl(o.tool,e)}</td>
                <td class="now-table__project">
                  <button type="button" class="now-link" title=${(o.project||"no project")+`
`+o.session_id}
                    onClick=${()=>n(o.session_id,o.tool)}>${tc(o.project)||"no project"}</button>
                </td>
                <td class="num">${Yo(o.duration_s||0)}</td>
                <td class="num">${al(o.cpu_percent||0)}</td>
                <td class="num">${r?Jt(r*1048576):"-"}</td>
                <td class="num" title=${i?i.toLocaleString()+" exact tokens":"No exact token data for this session"}>${i?_t(i):"-"}</td>
              </tr>`})}
          </tbody>
        </table></div>
        ${s.length>La&&g`<button type="button" class="now-link now-panel__more" onClick=${l}>
          Show all ${s.length} sessions</button>`}`}
  </section>`}function km({onOpenBudget:e,cloudScope:t,enabledTools:n,snap:l}){const s=tl(()=>$d({since:Date.now()/1e3-86400}),[],{pollMs:6e4}),o=De(()=>gm(s.data,n),[s.data,n]),i=lm({...s,data:s.data?o.rows:null,isEmpty:a=>!a.length});if(t)return g`<section class="now-panel" aria-labelledby="now-cost">
      <header class="now-panel__head"><h2 id="now-cost">Cost, last 24 h</h2></header>
      <${hn} status="empty" emptyTitle="Not available from this machine"
        emptyHint="The selected tool is billed and metered in the vendor's cloud, so no local token counts exist to estimate from."/>
    </section>`;const r=o.billed.length>0||o.listUsd!==null;return g`<section class="now-panel" aria-labelledby="now-cost">
    <header class="now-panel__head">
      <h2 id="now-cost">Cost, last 24 h</h2>
      ${s.data&&o.billed.map(a=>g`<span key=${a.unit} class="now-panel__figure">${a.amount.toLocaleString(void 0,{maximumFractionDigits:2})}<small class="now-panel__unit"> ${vu(a.unit)}</small></span>`)}
      ${s.data&&o.listUsd!==null&&g`<span class="now-panel__figure" title=${Ef}>${Uo(o.listUsd)}<small class="now-panel__unit"> est.</small></span>`}
      ${s.data&&!r&&o.rows.length>0&&g`<span class="now-panel__figure" title=${o.unpricedReason||_u}>n/a</span>`}
    </header>
    <${hn} status=${i} error=${s.error} updatedAt=${s.updatedAt} onRetry=${s.reload}
      label="cost" emptyTitle=${n?"No recorded usage for the selected tools in the last 24 h":"No recorded usage in the last 24 h"}
      emptyHint="Usage comes from per-request telemetry. Turn on the OTel receiver if a tool is running but nothing shows."
      emptyFix="aictl otel enable">
      <div class="now-panel__sub">${_t(o.tokens)} tokens, ${o.sessions} sessions${o.listUsd!==null?". Dollar figures are list-price estimates, not billed amounts.":""}${o.unpriced?` ${o.unpriced} tool${o.unpriced===1?" has":"s have"} no known price.`:""}</div>
      <table class="now-table now-table--plain">
        <tbody>${o.rows.slice(0,5).map(a=>g`<tr key=${a.tool}>
          <td class="now-table__project" title=${(a.tokens_source||[]).length?"Tokens from "+a.tokens_source.join(", ")+(a.tokens_quality?" ("+a.tokens_quality+")":""):a.tokens_reason||""}><${Ss} tool=${a.tool} size="1em"/> ${Vl(a.tool,l)}</td>
          <td class="num">${_t(a.total_tokens||0)}</td>
          <td class="num"><${vm} row=${a}/></td>
        </tr>`)}</tbody>
      </table>
      <button type="button" class="now-link now-panel__more" onClick=${e}>Open budget</button>
    </${hn}>
  </section>`}function Sm({command:e}){const[t,n]=Q(!1);if(!e)return null;const l=e.startsWith("aictl ");return g`<div class="now-issue__fix">
    <code>${e}</code>
    ${l&&g`<button type="button" class="now-link" onClick=${()=>{var o;try{(o=navigator.clipboard)==null||o.writeText(e),n(!0),setTimeout(()=>n(!1),1500)}catch{}}}
      aria-label=${"Copy command: "+e}>${t?"Copied":"Copy"}</button>`}
  </div>`}function xm({selfStatus:e}){const t=pi(e);return t?g`<div class=${"now-storage"+(t.degraded?" is-degraded":"")}>
    <span>Capture <strong>${t.mode||"not reported"}</strong></span>
    <span>Disk <strong>${vs(t)}</strong></span>
    ${t.pct!=null&&g`<div class="now-storage__bar" role="meter" aria-label="Disk use against budget"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.min(t.pct,100)}>
      <span class=${t.pct>=90?"is-high":""} style=${{width:Math.min(t.pct,100)+"%"}}></span>
    </div>`}
  </div>`:null}function Mm({models:e}){const t=Object.values(e&&!e.error?e:{}).filter(l=>{var s;return l.value||((s=l.conflicts)==null?void 0:s.length)});if(!t.length)return null;const n=new Map;for(const l of t){const s=JSON.stringify([l.value,l.source,l.line,l.conflicts]);n.has(s)?n.get(s).labels.push(Vl(l.tool)):n.set(s,{...l,labels:[Vl(l.tool)]})}return g`<div class="now-models" data-testid="now-models">
    ${[...n.values()].map(l=>g`<div key=${l.tool} class="now-models__row">
      <span>${l.labels.join(", ")} model <strong>${l.value||"no pin"}</strong></span>
      ${l.source&&g`<span class="now-models__source" title=${l.why_in_effect}>
        ${l.line?`${l.source}:${l.line}`:l.source}${l.in_project?"":" (not in this project, still in effect)"}
      </span>`}
      ${(l.conflicts||[]).map(s=>g`<span key=${s.requested_at} class="now-models__conflict" data-testid="now-model-conflict">
        Conflict: ${s.requested.join(", ")} requested at ${s.requested_at}, ${s.pinned} is pinned
      </span>`)}
    </div>`)}
  </div>`}function Cm({snap:e,connected:t,otelActive:n,alerts:l,selfStatus:s,onOpenTab:o}){const i=tl(()=>xd(),[],{pollMs:6e4}),r=tl(()=>Md(),[],{pollMs:6e4}),a=tl(()=>oc(),[],{pollMs:6e4}),u=tl(ym,[],{pollMs:6e4}),p=e!=null&&e.timestamp?Date.now()/1e3-e.timestamp:null,d=De(()=>pi(s),[s]),m=u.updatedAt?u.data:void 0,v=De(()=>new Set(((e==null?void 0:e.sessions)||[]).map(x=>x.tool)),[e]),w=De(()=>dm({connected:t,snapAgeS:p,hooks:r.data,quality:a.data,otelActive:n,alerts:l,storage:d,runningTools:v,hiddenContext:m}),[t,p,r.data,a.data,n,l,d,v,m]),A=w.filter(x=>x.level==="error").length,k=w.filter(x=>x.level==="warn").length,M=r.loading&&!r.data&&a.loading&&!a.data,b=M?"...":A+k;return g`<section class="now-panel now-panel--health" aria-labelledby="now-health">
    <header class="now-panel__head">
      <h2 id="now-health">Needs attention</h2>
      <span class=${"now-panel__figure"+(A?" is-error":k?" is-warn":" is-ok")}>${b}</span>
      <span class="now-panel__sub">${A} error${A===1?"":"s"}, ${k} warning${k===1?"":"s"}</span>
    </header>
    <${xm} selfStatus=${s}/>
    <${Mm} models=${i.data}/>
    ${r.error&&!r.data&&g`<${hn} status="error" error=${r.error}
      onRetry=${r.reload} label="hook status"/>`}
    ${w.length===0&&!M&&!r.error?g`<${hn} status="empty" emptyTitle="All collectors and hooks are healthy"
          emptyHint="Hook delivery, data quality and the live stream all report OK."/>`:g`<ul class="now-issues">
          ${w.slice(0,7).map(x=>g`<li key=${x.id} class=${"now-issue now-issue--"+x.level}>
            <span class="now-issue__level">${x.level==="error"?"Error":x.level==="warn"?"Warn":"Info"}</span>
            <div class="now-issue__body">
              <div class="now-issue__title">${x.tab?g`<button type="button" class="now-link" onClick=${()=>o(x.tab)}>${x.title}</button>`:x.title}</div>
              <div class="now-issue__detail">${x.detail}</div>
              <${Sm} command=${x.fix}/>
            </div>
          </li>`)}
          ${w.length>7&&g`<li class="now-panel__sub">${w.length-7} more in Monitoring health below.</li>`}
        </ul>`}
  </section>`}function Em({snap:e,enabledTools:t,connected:n,otelActive:l,alerts:s,selfStatus:o,onOpenSession:i,onOpenTab:r}){return g`<div class="now-grid">
    <${wm} snap=${e} enabledTools=${t}
      onOpenSession=${i} onShowAll=${()=>r("live")}/>
    <${km} onOpenBudget=${()=>r("budget")} cloudScope=${sl(e,t)} enabledTools=${t} snap=${e}/>
    <${Cm} snap=${e} connected=${n} otelActive=${l}
      alerts=${s} selfStatus=${o} onOpenTab=${r}/>
  </div>`}function ss(e){const t=new Date(e*1e3),n=t.getTimezoneOffset();return new Date(t.getTime()-n*6e4).toISOString().slice(0,16)}function Tm({globalRange:e,onPreset:t,onApplyCustom:n}){const[l,s]=Q(!1),[o,i]=Q(""),r=ee(null),a=ee(null),u=se(()=>{s(!0),i(""),requestAnimationFrame(()=>{if(!(!r.current||!a.current))if(e.until!=null)r.current.value=ss(e.since),a.current.value=ss(e.until);else{const d=Nl.find(w=>w.id===e.id),m=Date.now()/1e3,v=(d==null?void 0:d.seconds)||86400;r.current.value=ss(m-v),a.current.value=ss(m)}})},[e]),p=se(()=>{var A,k;const d=(A=r.current)==null?void 0:A.value,m=(k=a.current)==null?void 0:k.value;if(!d||!m){i("Enter both a start and an end time.");return}const v=new Date(d).getTime()/1e3,w=new Date(m).getTime()/1e3;if(!Number.isFinite(v)||!Number.isFinite(w)){i("Invalid date/time value.");return}if(w<=v){i("End time must be after start time.");return}i(""),n(v,w),s(!1)},[n]);return g`<div class="global-range-bar">
    <div class="range-bar" role="group" aria-label="Time range">
      ${Nl.map(d=>g`<button key=${d.id}
        class=${e.id===d.id&&!l?"range-btn active":"range-btn"}
        aria-pressed=${e.id===d.id&&!l?"true":"false"}
        onClick=${()=>{t(d.id),s(!1),i("")}}>${d.label}</button>`)}
      <button class=${l||e.id==="custom"?"range-btn active":"range-btn"}
        onClick=${u}>Custom</button>
    </div>
    ${l&&g`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${r} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${a} /></label>
      <button class="range-btn active" onClick=${p} style="font-weight:600">Apply</button>
      <span class="error-state" aria-live="polite"
        style="padding:0 var(--sp-2);font-size:var(--fs-xs)">${o}</span>
    </div>`}
  </div>`}function Am(e,t){const n=e.filter(s=>ks.has(s.tool));if(t==null)return`All tools (${n.length})`;const l=n.filter(s=>t.includes(s.tool)).map(s=>s.label);return l.length===0?"No tools":l.length<=2?l.join(", "):`${l[0]} +${l.length-1}`}function Lm({snap:e,enabledTools:t,onToggle:n,onSetAll:l}){if(!e)return null;const s=wc(e.tools.filter(a=>!a.meta));if(!s.length)return null;const o=t===null,i=Am(s,t),r=g`<button type="button" class=${"hdr-btn tool-filter-trigger"+(o?"":" is-filtered")}
    aria-label=${"Tool filter: "+i}>
    <${Zt} name="filter" size="12"/> ${i}
  </button>`;return g`<${ps} trigger=${r} placement="bottom">
    <div class="tool-filter-bar" role="group" aria-label="Filter every panel by tool">
      <label class="tool-filter-item">
        <input type="checkbox" checked=${o}
          onChange=${()=>l(o?[]:null)} />
        <span>All tools</span>
      </label>
      <hr class="hdr-views-sep"/>
      ${s.map(a=>{const u=ks.has(a.tool),p=t===null||t.includes(a.tool);return g`<label key=${a.tool}
          class=${"tool-filter-item"+(u?"":" tool-unverified")}
          title=${u?"":"Discovery only: this tool is not verified yet, so it cannot be filtered"}>
          <input type="checkbox" checked=${p} disabled=${!u}
            onChange=${()=>u&&n(a.tool)} />
          <${Ss} tool=${a.tool} size="1em"/>
          <span>${a.label}</span>
        </label>`})}
    </div>
  </${ps}>`}const Dm=30;function Pm({timestamp:e}){const[,t]=Q(0);if(ce(()=>{const s=setInterval(()=>t(o=>o+1),5e3);return()=>clearInterval(s)},[]),!e)return null;const n=Math.max(0,Math.floor(Date.now()/1e3-e)),l=n>Dm;return g`<span class=${"conn "+(l?"stale":"ok")} role="status" aria-live="polite"
    title=${"Last data snapshot received "+n+"s ago"+(l?" — the refresh loop may be stalled":"")}>
    ● ${l?"stale "+n+"s":n+"s"}
    <span class="sr-only">${l?" — data is stale":" — data age"}</span>
  </span>`}function Om({selfStatus:e}){const t=pi(e);if(!t||t.used==null&&!t.mode)return null;const n=t.degraded?"err":t.pct>=90?"stale":"off";return g`<span class=${"conn hdr-desktop-only "+n} title=${"Disk: "+vs(t)}>
    ${t.mode?"capture="+t.mode+" ":""}${t.used!=null?Jt(t.used):""}${t.budget?" / "+Jt(t.budget):""}
  </span>`}function Rm({searchRef:e,searchQuery:t,onSearchChange:n,theme:l,cycleTheme:s,density:o,setDensity:i,otelActive:r,connected:a,selfStatus:u,globalRange:p,onPreset:d,onApplyCustom:m,snap:v,enabledTools:w,onToggleTool:A,onSetAllTools:k,views:M=[],matchingView:b=null,onApplyView:x,onDeleteView:C,onSaveView:S,onOpenPalette:T}){const[L,D]=Q(!1),[N,I]=Q(!1),[O,Y]=Q(""),U=se(()=>{const W=O.trim();W&&(S&&S(W),Y(""),I(!1))},[O,S]),G=[{value:"compact",label:"Compact"},{value:"normal",label:"Normal"},{value:"spacious",label:"Spacious"}],B=g`<button class="hdr-btn" type="button"
    aria-label="Saved views" title="Saved views">
    Views${b?": "+b.name:""} ▾
  </button>`;return g`<header role="banner">
    <h1>aictl</h1>
    <div class="hdr-scope" role="group" aria-label="Scope for every panel">
      <${Tm} globalRange=${p}
        onPreset=${d} onApplyCustom=${m}/>
      <${Lm} snap=${v} enabledTools=${w}
        onToggle=${A} onSetAll=${k}/>
    </div>
    <div class="hdr-right">
      <!-- Mobile overflow toggle -->
      <button class="hdr-btn hdr-mobile-only" type="button" aria-label="Menu"
        aria-expanded=${L?"true":"false"}
        onClick=${()=>D(W=>!W)}>
        <${up} size="16" aria-hidden="true"/>
      </button>

      <input type="text" ref=${e} class="search-box hdr-desktop-only"
        placeholder="Filter... ( / )" aria-label="Filter tools"
        value=${t} onInput=${W=>n(W.target.value)}/>

      <!-- Command palette trigger -->
      <button class="hdr-cmdk" type="button"
        onClick=${T}>
        <${Jf} size="14" aria-hidden="true"/>
        <span class="hdr-desktop-only">Commands</span>
        <${ot} class="hdr-desktop-only" aria-hidden="true">${Sc()}</${ot}>
        <span class="sr-only">open command palette</span>
      </button>

      <!-- Views dropdown -->
      <${ps} trigger=${B} placement="bottom" class="hdr-desktop-only">
        <div class="hdr-views-menu" role="group" aria-label="Saved views">
          ${M.length===0?g`<div class="hdr-views-empty text-muted">No saved views</div>`:M.map(W=>g`<div key=${W.id} class="hdr-views-row">
                <button class="hdr-views-apply" type="button"
                  onClick=${()=>x&&x(W.id)}
                  aria-label=${"Apply view "+W.name}>${W.name}</button>
                <button class="hdr-views-del" type="button"
                  aria-label=${"Delete view "+W.name}
                  onClick=${()=>C&&C(W.id)}>
                  <${wp} size="12" aria-hidden="true"/>
                </button>
              </div>`)}
          <hr class="hdr-views-sep"/>
          <${fn} variant="ghost" size="sm"
            onClick=${()=>I(!0)}>
            <${gp} size="12" aria-hidden="true"/> Save current view…
          </${fn}>
        </div>
      </${ps}>

      <!-- Theme toggle -->
      <button class="theme-btn" type="button" onClick=${s}
        aria-label=${"Toggle theme: "+l} title=${"Theme: "+l}>
        <${Zt} name=${l==="light"?"sun":l==="editorial"?"pen":"moon"} size="16"/>
      </button>

      ${r?g`<span class="conn ok" title="OTel receiver active">OTel</span>`:g`<span class="conn off" title="OTel receiver inactive — enable with: aictl otel enable">OTel off</span>`}
      <${Om} selfStatus=${u}/>
      <${Pm} timestamp=${v==null?void 0:v.timestamp}/>
      <span class=${"conn "+(a?"ok":"err")} role="status" aria-live="polite">
        ${a?"live":"reconnecting..."}
        <span class="sr-only">${a?" — connected":" — connection lost, reconnecting"}</span>
      </span>
    </div>

    ${L&&g`<div class="hdr-mobile-overflow hdr-mobile-only">
      <input type="text" class="search-box" placeholder="Filter..."
        aria-label="Filter tools"
        value=${t} onInput=${W=>n(W.target.value)}/>
      <${Fp}
        ariaLabel="Density"
        value=${o}
        options=${G}
        onChange=${i}/>
    </div>`}

    ${N&&g`<${cl} open=${!0}
      onClose=${()=>I(!1)} ariaLabel="Save view">
      <h3 style="margin-bottom:var(--sp-5)">Save current view</h3>
      <input type="text" class="search-box" style="width:100%"
        placeholder="View name" value=${O}
        onInput=${W=>Y(W.target.value)}
        onKeyDown=${W=>W.key==="Enter"&&U()}
        autoFocus=${!0}/>
      <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-6);justify-content:flex-end">
        <${fn} variant="ghost" onClick=${()=>I(!1)}>Cancel</${fn}>
        <${fn} variant="primary" onClick=${U}>Save</${fn}>
      </div>
    </${cl}>`}
  </header>`}const Da=[{id:"overview",label:"Dashboard",sub:"live event stream"},{id:"explorer",label:"Sessions",sub:"history & traces"},{id:"agents",label:"Agents",sub:"instrumentation"},{id:"prompts",label:"Prompts",sub:"library & workflows"}];function Im(){const e=new Date,t=String(e.getMonth()+1).padStart(2,"0"),n=e.toLocaleDateString("en-CA");return`The aictl daily · vol. ${t} · ${n}`}function Nm({activeTab:e,setActiveTab:t}){const n=bs(Rl),l=n==null?void 0:n.snap,s=De(()=>{var a;let r=0;for(const u of(l==null?void 0:l.tools)||[])for(const p of((a=u.live)==null?void 0:a.sessions)||[])p.active!==!1&&r++;return r},[l]),o=Da.find(r=>r.id===e),i=s>0?`Live · ${s} session${s!==1?"s":""}`:"Live";return g`<div class="cmasthead">
    <div class="cmasthead-top">
      <div class="cmasthead-identity">
        <div class="cmasthead-kicker">${Im()}</div>
        <div class="cmasthead-headline">
          <span class="cmasthead-title">aictl</span>
          <span class="cmasthead-subtitle">a live record of every agent on this machine</span>
        </div>
      </div>
      <div class="cmasthead-live" role="status" aria-live="polite" aria-label="Live status">
        <span class="cmasthead-live-dot" aria-hidden="true"></span>
        ${i}
      </div>
    </div>
    <nav class="cmasthead-tabs" role="navigation" aria-label="Editorial tabs">
      ${Da.map(r=>g`<button
        key=${r.id}
        type="button"
        class=${"cmasthead-tab"+(e===r.id?" is-active":"")}
        onClick=${()=>t(r.id)}
        aria-current=${e===r.id?"page":null}
      >${r.label}</button>`)}
      <span class="cmasthead-tabs-sub" aria-hidden="true">
        ${(o==null?void 0:o.sub)??""}
      </span>
    </nav>
  </div>`}function zm({tabs:e,activeTab:t,setActiveTab:n}){const l=ee(null);return ce(()=>{var o,i;const s=(o=l.current)==null?void 0:o.querySelector('[aria-current="page"]');(i=s==null?void 0:s.scrollIntoView)==null||i.call(s,{block:"nearest",inline:"nearest"})},[t]),g`<nav class="tab-nav" ref=${l} aria-label="Dashboard sections">
    ${Al.navGroups.map(s=>g`<div key=${s.id} class="tab-group" role="group" aria-labelledby=${"nav-"+s.id}>
      <div class="tab-group__label" id=${"nav-"+s.id}>${s.label}</div>
      ${e.filter(o=>o.group===s.id).map(o=>g`<button key=${o.id} type="button" class="tab-btn"
        aria-current=${t===o.id?"page":null}
        aria-keyshortcuts=${o.key||null}
        onClick=${()=>n(o.id)}>
        <span class="tab-btn-icon"><${Zt} name=${o.iconName} size="14"/></span>
        <span class="tab-btn__label">${o.label}</span>
        ${o.key&&g`<kbd class="tab-btn__key" aria-hidden="true">${o.key}</kbd>`}
      </button>`)}
    </div>`)}
  </nav>`}function Vm(e,t){if(!t)return 1;const n=t.toLowerCase(),l=(e.label||"").toLowerCase(),s=(e.group||"").toLowerCase();if(l.startsWith(n))return 1e3-l.length;if(l.includes(n))return 500-l.indexOf(n);if(s.startsWith(n))return 300;if(s.includes(n))return 150;let o=0;for(const i of l)if(i===n[o]&&o++,o===n.length)break;return o===n.length?50:0}function Fm({commands:e=[],isOpen:t,onClose:n,lru:l=[],onRun:s}){const[o,i]=Q(""),[r,a]=Q(0),u=ee(null),p=ee(null);ce(()=>{t&&(i(""),a(0))},[t]),ce(()=>{t&&u.current&&u.current.focus()},[t]);const d=De(()=>{if(!o){const k=new Map(e.map(x=>[x.id,x])),M=l.map(x=>k.get(x)).filter(Boolean),b=e.filter(x=>!l.includes(x.id));return[...M,...b]}return e.map(k=>({c:k,s:Vm(k,o)})).filter(k=>k.s>0).sort((k,M)=>M.s-k.s).map(k=>k.c)},[e,o,l]);ce(()=>{a(0)},[o]);const m=se(k=>{if(k){s&&s(k);try{k.action&&k.action()}catch(M){console.error("Command failed:",M)}n&&n()}},[s,n]),v=se(k=>{k.key==="ArrowDown"?(k.preventDefault(),a(M=>Math.min(M+1,d.length-1))):k.key==="ArrowUp"?(k.preventDefault(),a(M=>Math.max(M-1,0))):k.key==="Enter"&&(k.preventDefault(),m(d[r]))},[d,r,m]);ce(()=>{if(!p.current)return;const k=p.current.querySelector(`[data-cmd-idx="${r}"]`);k&&k.scrollIntoView&&k.scrollIntoView({block:"nearest"})},[r]);const w=De(()=>{const k=[],M=new Map;return d.forEach(b=>{const x=b.group||"Commands";M.has(x)||(M.set(x,k.length),k.push({group:x,items:[]})),k[M.get(x)].items.push(b)}),k},[d]);let A=-1;return g`<${cl} open=${t} onClose=${n} ariaLabel="Command palette" class="cmdk-dialog">
    <div class="cmdk">
      <div class="cmdk-input-row">
        <${Mc} size="16" aria-hidden="true"/>
        <input
          ref=${u}
          type="text"
          class="cmdk-input"
          placeholder="Type a command or search…"
          value=${o}
          onInput=${k=>i(k.target.value)}
          onKeyDown=${v}
          aria-label="Search commands"
          aria-controls="cmdk-list"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-activedescendant=${d.length?"cmdk-opt-"+r:null}
        />
        <${ot}>Esc</${ot}>
      </div>
      <div id="cmdk-list" class="cmdk-list" role="listbox" ref=${p}>
        ${d.length===0?g`<${Cc} icon="search" title="No commands"
              description=${o?'No commands match "'+o+'"':"Start typing…"}/>`:w.map(k=>g`<div key=${k.group} class="cmdk-group" role="group" aria-label=${k.group}>
              <div class="cmdk-group-label" aria-hidden="true">${k.group}</div>
              ${k.items.map(M=>{A+=1;const b=A,x=b===r;return g`<button key=${M.id}
                  type="button"
                  id=${"cmdk-opt-"+b}
                  class=${"cmdk-item"+(x?" cmdk-item--active":"")}
                  role="option"
                  aria-selected=${x?"true":"false"}
                  data-cmd-idx=${b}
                  onMouseEnter=${()=>a(b)}
                  onClick=${()=>m(M)}
                >
                  <span class="cmdk-item__label">${M.label}</span>
                  ${M.shortcut?g`<${ot}>${M.shortcut}</${ot}>`:null}
                </button>`})}
            </div>`)}
      </div>
      <div class="cmdk-foot">
        <${ot}>↑</${ot}><${ot}>↓</${ot}> navigate
        · <${ot}>↵</${ot}> run
        · <${ot}>Esc</${ot}> close
      </div>
    </div>
  </${cl}>`}function Hm({target:e="#main-content",label:t="Skip to main content"}){return g`<a href=${e} class="skip-link">${t}</a>`}function go(e,t){try{const n=localStorage.getItem("aictl-pref-"+e);return n!=null?JSON.parse(n):t}catch{return t}}const Um={live:3600,"1h":3600,"6h":21600,"24h":86400,"7d":604800};go("active_tab","overview"),(()=>{const e=go("range","live"),t=Um[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),go("tool_filter",null);const Bm=ft(()=>dt(()=>import("./TabOverview-D-u2Plbl.js"),[])),jm=ft(()=>dt(()=>import("./TabMemory-a_3PARWC.js"),[])),Wm=ft(()=>dt(()=>import("./ContextMap-C2HDHOyL.js"),[])),qm=ft(()=>dt(()=>import("./TabLive-BHm8A7zC.js"),__vite__mapDeps([2,3]))),Km=ft(()=>dt(()=>import("./TabEventsStats-CFAaIOkR.js"),[])),Gm=ft(()=>dt(()=>import("./TabBudget-Dt7MriFm.js"),__vite__mapDeps([4,3,5]))),Ym=ft(()=>dt(()=>import("./TabAnalytics-Pni81ow4.js"),__vite__mapDeps([6,7]))),Jm=ft(()=>dt(()=>import("./TabExplorer-DdH_l6XX.js"),__vite__mapDeps([8,1,5]))),Zm=ft(()=>dt(()=>import("./TabToolConfig-BqlDcd_d.js"),[])),Qm=ft(()=>dt(()=>import("./TabProjectEnv-CtcRRCeV.js"),[])),Xm=ft(()=>dt(()=>import("./CAgentsTab-C2tg4a6V.js"),[])),e_=ft(()=>dt(()=>import("./CDashboardTab-CpbSf27M.js"),[])),t_=ft(()=>dt(()=>import("./CPromptsTab--U7ntNvi.js"),[])),n_=ft(()=>dt(()=>import("./CSessionsTab-CzMlzew1.js"),[])),l_=new Set(["live","procs","events","explorer","budget","analytics","memory"]),s_=()=>g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading view">
  <${ol} height="120px" radius="var(--radius-sm)"/>
  <${ol} height="200px" radius="var(--radius-sm)"/>
</div>`,be=({tabName:e,children:t})=>g`<${zr} key=${e}><${An} fallback=${g`<${s_}/>`}>${t}</${An}></${zr}>`;function o_(e,t){const n=ee({});ce(()=>{const l=t.current;if(!l)return;const s=n.current[e]||0;l.scrollTop=s;let o=!1;const i=s?[150,500,1200].map(u=>setTimeout(()=>{o||(l.scrollTop=s)},u)):[],r=()=>{o=!0},a=()=>{n.current[e]=l.scrollTop};return l.addEventListener("wheel",r,{passive:!0,once:!0}),l.addEventListener("touchstart",r,{passive:!0,once:!0}),l.addEventListener("scroll",a,{passive:!0}),()=>{i.forEach(clearTimeout),l.removeEventListener("wheel",r),l.removeEventListener("touchstart",r),l.removeEventListener("scroll",a)}},[e,t])}function i_(e,t){ce(()=>{const n=l=>{var s;l.key==="Escape"&&t(null),l.key==="/"&&!Qo(l.target)&&(l.preventDefault(),(s=e.current)==null||s.focus())};return document.addEventListener("keydown",n),()=>document.removeEventListener("keydown",n)},[e,t])}function r_(){const[e,t]=Q(!1);return ce(()=>{let n=!0;const l=()=>lc().then(o=>{n&&t(o.active||!1)}).catch(()=>{n&&t(!1)});l();const s=setInterval(l,3e4);return()=>{n=!1,clearInterval(s)}},[]),e}function a_(e){const[t,n]=Q(null),[l,s]=Q([]);return ce(()=>{const{id:o,since:i,until:r}=e;o==="live"?n(null):o!=="custom"?So({range:o}).then(n).catch(()=>{}):So({since:i,until:r}).then(n).catch(()=>{}),bd({since:i,until:r}).then(s).catch(()=>{})},[e]),{dbHistory:t,events:l}}function c_(e){const t=ee(!1),n=ee(e);ce(()=>{if(e&&!t.current){t.current=!0,n.current=e;return}e!==n.current&&(e?(Ao.success("Reconnected"),Er("Connection restored")):t.current&&(Ao.error("Disconnected. Retrying…"),Er("Connection lost, retrying","assertive")),n.current=e)},[e])}function u_(e){var i;if(!e)return[];const t=[];let n=0,l=0,s=0,o=0;for(const r of e.tools||[])for(const a of r.processes||[]){const u=parseFloat(a.mem_mb)||0,p=(a.process_type||"").toLowerCase();(p==="subagent"||p==="agent")&&(n+=u),p==="mcp-server"&&a.zombie_risk&&a.zombie_risk!=="none"&&l++,(p==="browser"||(a.name||"").toLowerCase().includes("headless"))&&s++,(i=a.anomalies)!=null&&i.length&&(o+=a.anomalies.length)}return n>2048&&t.push({level:"red",msg:`Subagent memory: ${Jt(n*1048576)} (>2GB) — consider cleanup`}),l>0&&t.push({level:"orange",msg:`${l} MCP server(s) with dead parent — may be orphaned`}),s>0&&t.push({level:"yellow",msg:`${s} headless browser process(es) detected — check for leaks`}),o>5&&t.push({level:"orange",msg:`${o} process anomalies detected`}),t}function Ml(e,t){return!Array.isArray(e)||t===null?e:e.filter(n=>!n.tool||t.includes(n.tool))}function d_(e,t,n){if(!e)return e;let l=e.tools.filter(s=>ks.has(s.tool)||s.tool==="aictl");if(t!==null&&(l=l.filter(s=>t.includes(s.tool)||s.tool==="aictl")),n){const s=n.toLowerCase();l=l.filter(o=>o.label.toLowerCase().includes(s)||o.tool.toLowerCase().includes(s)||o.vendor&&o.vendor.toLowerCase().includes(s)||(o.files||[]).some(i=>i.path.toLowerCase().includes(s))||(o.processes||[]).some(i=>(i.name||"").toLowerCase().includes(s)||(i.cmdline||"").toLowerCase().includes(s))||o.live&&((o.live.workspaces||[]).some(i=>i.toLowerCase().includes(s))||(o.live.sources||[]).some(i=>i.toLowerCase().includes(s))))}return{...e,tools:wc(l),sessions:Ml(e.sessions,t),tool_telemetry:Ml(e.tool_telemetry,t),mcp_detail:Ml(e.mcp_detail,t),events:Ml(e.events,t),agent_memory:Ml(e.agent_memory,t)}}function Bo(e,t){try{document.dispatchEvent(new CustomEvent("aictl:select-session",{detail:{sessionId:e,tool:t}}))}catch{}}function f_({tabs:e,setActiveTab:t,setPreset:n,presets:l,allTools:s,toggleTool:o,setTheme:i,setDensity:r,views:a,applyView:u,snap:p,onShowShortcuts:d}){const m=[];e.forEach(v=>m.push({id:"tab:"+v.id,group:"Jump to tab",label:v.label,shortcut:v.key,action:()=>t(v.id)})),l.forEach(v=>m.push({id:"range:"+v.id,group:"Range",label:"Set range: "+v.label,action:()=>n(v.id)})),(s||[]).forEach(v=>m.push({id:"filter:"+v,group:"Filter",label:"Toggle tool: "+v,action:()=>o(v)}));for(const v of((p==null?void 0:p.sessions)||[]).slice(0,40)){if(!v.session_id)continue;const w=tc(v.project)||"no project";m.push({id:"session:"+v.session_id,group:"Session",label:"Open session: "+w+" ("+(v.label||v.tool)+")",action:()=>{t("explorer"),Bo(v.session_id,v.tool)}})}return a.forEach(v=>m.push({id:"view:"+v.id,group:"View",label:"Apply view: "+v.name,action:()=>u(v.id)})),["auto","dark","light","editorial"].forEach(v=>m.push({id:"theme:"+v,group:"Appearance",label:"Theme: "+v,action:()=>i(v)})),["compact","normal","spacious"].forEach(v=>m.push({id:"density:"+v,group:"Appearance",label:"Density: "+v,action:()=>r(v)})),m.push({id:"help:shortcuts",group:"Shortcuts",label:"Keyboard shortcuts",action:()=>{d&&d()}}),m}function p_({open:e,onClose:t,tabs:n}){if(!e)return null;const l=[...n.map(s=>[s.label,s.key]),["Previous / next view","[ ]"],["Command palette",Sc()],["Focus filter","/"],["This list","?"],["Close panels","Esc"]];return g`<${cl} open=${!0} onClose=${t} ariaLabel="Keyboard shortcuts">
    <h3 style="margin-bottom:var(--sp-5)">Keyboard shortcuts</h3>
    <ul style="list-style:none;margin:0;padding:0;min-width:220px">
      ${l.map(([s,o])=>g`<li key=${s}
        style="display:flex;justify-content:space-between;align-items:center;gap:var(--sp-6);padding:var(--sp-1) 0">
        <span>${s}</span><${ot}>${o}</${ot}>
      </li>`)}
    </ul>
  </${cl}>`}function h_(){var sn;const{snapshot:e,history:t,connected:n}=Yd(),{range:l,setPreset:s,setCustom:o,setRange:i}=of(),{activeTab:r,setActiveTab:a,tabs:u}=cf(),{theme:p,setTheme:d,cycleTheme:m}=pf(),{density:v,setDensity:w}=mf(),A=De(()=>e?e.tools.filter(le=>le.tool!=="aictl"&&le.tool!=="any"&&ks.has(le.tool)).map(le=>le.tool):[],[e]),{selectedTools:k,toggleTool:M,setTools:b}=af(A),[x,C]=Q(""),[S,T]=Q(null),L=ee(null);i_(L,T),c_(n);const D=r_(),{data:N}=tl(()=>sc(),[],{pollMs:6e4}),{dbHistory:I,events:O}=a_(l),Y=De(()=>({tab:r,range:l,tools:k,density:v,theme:p}),[r,l,k,v,p]),U=se(le=>{le.tab&&a(le.tab),le.range&&i(le.range),le.tools!==void 0&&b(le.tools),le.density&&w(le.density),le.theme&&d(le.theme)},[a,i,b,w,d]),{views:G,saveView:B,deleteView:W,applyView:j,matchingView:tt}=vf(Y,U),ve=bf(),[de,fe]=Q(!1),te=se(()=>fe(!0),[]);ce(()=>{const le=Ne=>{Ne.key==="?"&&!Qo(Ne.target)&&fe(ze=>!ze)};return document.addEventListener("keydown",le),()=>document.removeEventListener("keydown",le)},[]);const q=ee(null);o_(r,q);const Re=se((le,Ne)=>{a("explorer"),Bo(le,Ne)},[a]),Qe=De(()=>f_({tabs:u,setActiveTab:a,setPreset:s,presets:Nl,allTools:A,toggleTool:M,setTheme:d,setDensity:w,views:G,applyView:j,snap:e,onShowShortcuts:te}),[u,a,s,A,M,d,w,G,j,e,te]),ke=l.id==="live"?t:I||t,ue=l.until?l.until-l.since:ws[l.id]||3600,pt=se((le,Ne={})=>{if(!le)return T(null);T({path:le,at:Ne.at??null})},[]),Ie=De(()=>d_(e,k,x),[e,k,x]),Se=De(()=>{var ze;const le=Date.now()/1e3-300,Ne=new Map;for(const lt of O)if(lt.kind==="file_modified"&&lt.ts>=le&&((ze=lt.detail)!=null&&ze.path)){const xt=Ne.get(lt.detail.path);(!xt||lt.ts>xt.ts)&&Ne.set(lt.detail.path,{ts:lt.ts,growth:lt.detail.growth_bytes||0,tool:lt.tool})}return Ne},[O]),St=De(()=>({snap:Ie,history:t,openViewer:pt,recentFiles:Se,globalRange:l,rangeSeconds:ue,enabledTools:k}),[Ie,t,pt,Se,l,ue,k]),Pt=De(()=>u_(Ie),[Ie]),nt=ee(null);nt.current=Ip(nt.current,St,{activeTab:r});const Ht=nt.current.value,Qt={overview:()=>p==="editorial"?g`<${be} tabName="overview">
          <${e_}/>
          <div class="mb-lg" style="margin-top:var(--sp-6)">
            <div class="c-overline" style="margin-bottom:var(--sp-3)">Monitoring</div>
            <${Nr}/>
          </div>
        </${be}>`:g`<${be} tabName="overview">
          <${Em} snap=${Ie} enabledTools=${k}
            connected=${n} otelActive=${D} alerts=${Pt} selfStatus=${N}
            onOpenSession=${Re} onOpenTab=${a}/>
          ${!sl(e,k)&&g`<${Pp} enabledTools=${k} what="The charts and totals below"/><${am} snap=${Ie} history=${ke}/>`}
          <div class="mb-lg"><${Nr}/></div>
        </${be}>`,hidden:()=>g`<${be} tabName="hidden"><${$m}/></${be}>`,procs:()=>g`<${be} tabName="procs"><div class="mb-lg"><${Bm}/></div></${be}>`,memory:()=>g`<${be} tabName="memory"><div class="mb-lg"><${Wm}/></div><div class="mb-lg"><${jm}/></div></${be}>`,live:()=>g`<${be} tabName="live"><div class="mb-lg"><${qm}/></div></${be}>`,events:()=>g`<${be} tabName="events"><div class="mb-lg"><${Km} key=${"events-"+r}/></div></${be}>`,budget:()=>g`<${be} tabName="budget"><div class="mb-lg"><${Gm} key=${"budget-"+r}/></div></${be}>`,analytics:()=>g`<${be} tabName="analytics"><div class="mb-lg"><${Ym} key=${"analytics-"+r}/></div></${be}>`,explorer:()=>p==="editorial"?g`<${be} tabName="explorer"><${n_}
          onInspect=${(le,Ne)=>{a("explorer"),Bo(le,Ne),d("auto")}}
        /></${be}>`:g`<${be} tabName="explorer"><div class="mb-lg"><${Jm} key=${"explorer-"+r}/></div></${be}>`,config:()=>g`<${be} tabName="config">
      <div class="mb-lg"><${Zm}/></div>
      <div class="mb-lg"><${Qm} snap=${e}/></div>
    </${be}>`,agents:()=>g`<${be} tabName="agents"><${Xm}
      onViewSessions=${()=>a("explorer")}
      onViewConfig=${()=>a("config")}/></${be}>`,prompts:()=>g`<${be} tabName="prompts"><${t_}/></${be}>`},ln=e!=null;return g`<${Rl.Provider} value=${Ht}>
    <div class="main-wrap">
      <${Hm}/>
      <${Rm}
        searchRef=${L} searchQuery=${x} onSearchChange=${C}
        theme=${p} cycleTheme=${m}
        density=${v} setDensity=${w}
        otelActive=${D} connected=${n} selfStatus=${N}
        globalRange=${l} onPreset=${s} onApplyCustom=${o}
        snap=${e} enabledTools=${k}
        onToggleTool=${M} onSetAllTools=${b}
        views=${G} matchingView=${tt}
        onApplyView=${j} onDeleteView=${W} onSaveView=${B}
        onOpenPalette=${ve.open}
      />
      ${p==="editorial"&&g`<${Nm}
        activeTab=${r} setActiveTab=${a}
      />`}
      <div class="shell-body">
        <${zm} tabs=${u} activeTab=${r} setActiveTab=${a}/>
        <main class="main" id="main-content" tabindex="0" ref=${q}>
          <div class="main-view" aria-label=${(sn=u.find(le=>le.id===r))==null?void 0:sn.label}>
            ${ln?l_.has(r)&&sl(e,k)?g`<${Dp} tools=${k.map(le=>({tool:le,label:Vl(le,e)}))}/>`:Qt[r]?Qt[r]():g`<p class="text-muted">Unknown tab "${r}"</p>`:g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading dashboard">
                  <${ol} height="120px" radius="var(--radius-sm)"/>
                  <${ol} height="60px"  radius="var(--radius-sm)"/>
                  <${ol} height="200px" radius="var(--radius-sm)"/>
                </div>`}
          </div>
        </main>
      </div>
    </div>
    <${Np} path=${(S==null?void 0:S.path)??(typeof S=="string"?S:null)}
      at=${typeof S=="object"?S==null?void 0:S.at:null}
      onClose=${()=>T(null)}/>
    <${eh}/>
    <${Fm} commands=${Qe}
      isOpen=${ve.isOpen} onClose=${ve.close}
      lru=${ve.lru} onRun=${le=>ve.recordUse(le.id)}/>
    <${p_} open=${de}
      onClose=${()=>fe(!1)} tabs=${u}/>
    <${Kp}/>
  </${Rl.Provider}>`}ed(g`<${h_}/>`,document.getElementById("app"));export{V_ as $,ee as A,ds as B,vm as C,bd as D,Dp as E,_n as F,Z_ as G,W_ as H,Zt as I,Ef as J,J_ as K,tl as L,G_ as M,I_ as N,lm as O,hn as P,_v as Q,Q0 as R,Rl as S,De as T,Vl as U,B_ as V,ol as W,Cc as X,pr as Y,N_ as Z,z_ as _,Jt as a,ev as a0,P_ as a1,Pp as a2,m_ as a3,g_ as a4,uv as a5,hv as a6,cv as a7,Yo as a8,mv as a9,$_ as aA,w_ as aB,T_ as aC,dv as aD,Jo as aE,fv as aF,pv as aG,y_ as aH,Md as aI,F_ as aJ,cl as aK,H_ as aL,Ao as aM,tc as aN,wd as aO,A_ as aa,lv as ab,L_ as ac,k_ as ad,__ as ae,E_ as af,R_ as ag,O_ as ah,b_ as ai,S_ as aj,x_ as ak,_m as al,M_ as am,C_ as an,U_ as ao,ie as ap,Rd as aq,Mo as ar,nv as as,sv as at,iv as au,tv as av,ov as aw,v_ as ax,D_ as ay,sc as az,_t as b,zd as c,Q as d,ll as e,al as f,rv as g,es as h,K_ as i,Q_ as j,xo as k,X_ as l,g as m,el as n,Y_ as o,Ss as p,se as q,Od as r,av as s,Cf as t,q_ as u,j_ as v,So as w,bs as x,ce as y,em as z};
