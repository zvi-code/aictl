const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/HiddenContextPanel-DfAQ9Mzn.js","assets/useAsyncResource-BR7i4AIx.js","assets/TabLive-CtAR_uvO.js","assets/DataTable-NFc-wBKv.js","assets/TabBudget-A4BnpfwQ.js","assets/models-DHnW0Za4.js","assets/TabAnalytics-_xp_mUvu.js","assets/echarts-BbyLWlSf.js","assets/TabExplorer-DG5r_FFv.js"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))s(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function n(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(l){if(l.ep)return;l.ep=!0;const o=n(l);fetch(l.href,o)}})();var Sl,le,Fa,pn,Gi,Ua,Ha,ja,Ko,ko,So,Ba,pl={},hl=[],td=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,Bs=Array.isArray;function sn(e,t){for(var n in t)e[n]=t[n];return e}function Go(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function vn(e,t,n){var s,l,o,i={};for(o in t)o=="key"?s=t[o]:o=="ref"?l=t[o]:i[o]=t[o];if(arguments.length>2&&(i.children=arguments.length>3?Sl.call(arguments,2):n),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)i[o]===void 0&&(i[o]=e.defaultProps[o]);return ul(e,i,s,l,null)}function ul(e,t,n,s,l){var o={type:e,props:t,key:n,ref:s,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:l??++Fa,__i:-1,__u:0};return l==null&&le.vnode!=null&&le.vnode(o),o}function gn(e){return e.children}function Xt(e,t){this.props=e,this.context=t}function us(e,t){if(t==null)return e.__?us(e.__,e.__i+1):null;for(var n;t<e.__k.length;t++)if((n=e.__k[t])!=null&&n.__e!=null)return n.__e;return typeof e.type=="function"?us(e):null}function nd(e){if(e.__P&&e.__d){var t=e.__v,n=t.__e,s=[],l=[],o=sn({},t);o.__v=t.__v+1,le.vnode&&le.vnode(o),Yo(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[n]:null,s,n??us(t),!!(32&t.__u),l),o.__v=t.__v,o.__.__k[o.__i]=o,Ga(s,o,l),t.__e=t.__=null,o.__e!=n&&Wa(o)}}function Wa(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),Wa(e)}function xo(e){(!e.__d&&(e.__d=!0)&&pn.push(e)&&!ml.__r++||Gi!=le.debounceRendering)&&((Gi=le.debounceRendering)||Ua)(ml)}function ml(){try{for(var e,t=1;pn.length;)pn.length>t&&pn.sort(Ha),e=pn.shift(),t=pn.length,nd(e)}finally{pn.length=ml.__r=0}}function qa(e,t,n,s,l,o,i,r,a,c,p){var d,h,v,$,T,w,x,b=s&&s.__k||hl,C=t.length;for(a=sd(n,t,b,a,C),d=0;d<C;d++)(v=n.__k[d])!=null&&(h=v.__i!=-1&&b[v.__i]||pl,v.__i=d,w=Yo(e,v,h,l,o,i,r,a,c,p),$=v.__e,v.ref&&h.ref!=v.ref&&(h.ref&&Jo(h.ref,null,v),p.push(v.ref,v.__c||$,v)),T==null&&$!=null&&(T=$),(x=!!(4&v.__u))||h.__k===v.__k?a=Ka(v,a,e,x):typeof v.type=="function"&&w!==void 0?a=w:$&&(a=$.nextSibling),v.__u&=-7);return n.__e=T,a}function sd(e,t,n,s,l){var o,i,r,a,c,p=n.length,d=p,h=0;for(e.__k=new Array(l),o=0;o<l;o++)(i=t[o])!=null&&typeof i!="boolean"&&typeof i!="function"?(typeof i=="string"||typeof i=="number"||typeof i=="bigint"||i.constructor==String?i=e.__k[o]=ul(null,i,null,null,null):Bs(i)?i=e.__k[o]=ul(gn,{children:i},null,null,null):i.constructor===void 0&&i.__b>0?i=e.__k[o]=ul(i.type,i.props,i.key,i.ref?i.ref:null,i.__v):e.__k[o]=i,a=o+h,i.__=e,i.__b=e.__b+1,r=null,(c=i.__i=ld(i,n,a,d))!=-1&&(d--,(r=n[c])&&(r.__u|=2)),r==null||r.__v==null?(c==-1&&(l>p?h--:l<p&&h++),typeof i.type!="function"&&(i.__u|=4)):c!=a&&(c==a-1?h--:c==a+1?h++:(c>a?h--:h++,i.__u|=4))):e.__k[o]=null;if(d)for(o=0;o<p;o++)(r=n[o])!=null&&!(2&r.__u)&&(r.__e==s&&(s=us(r)),Ja(r,r));return s}function Ka(e,t,n,s){var l,o;if(typeof e.type=="function"){for(l=e.__k,o=0;l&&o<l.length;o++)l[o]&&(l[o].__=e,t=Ka(l[o],t,n,s));return t}e.__e!=t&&(s&&(t&&e.type&&!t.parentNode&&(t=us(e)),n.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function Is(e,t){return t=t||[],e==null||typeof e=="boolean"||(Bs(e)?e.some(function(n){Is(n,t)}):t.push(e)),t}function ld(e,t,n,s){var l,o,i,r=e.key,a=e.type,c=t[n],p=c!=null&&(2&c.__u)==0;if(c===null&&r==null||p&&r==c.key&&a==c.type)return n;if(s>(p?1:0)){for(l=n-1,o=n+1;l>=0||o<t.length;)if((c=t[i=l>=0?l--:o++])!=null&&!(2&c.__u)&&r==c.key&&a==c.type)return i}return-1}function Yi(e,t,n){t[0]=="-"?e.setProperty(t,n??""):e[t]=n==null?"":typeof n!="number"||td.test(t)?n:n+"px"}function nl(e,t,n,s,l){var o,i;e:if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof s=="string"&&(e.style.cssText=s=""),s)for(t in s)n&&t in n||Yi(e.style,t,"");if(n)for(t in n)s&&n[t]==s[t]||Yi(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace(ja,"$1")),i=t.toLowerCase(),t=i in e||t=="onFocusOut"||t=="onFocusIn"?i.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=n,n?s?n.u=s.u:(n.u=Ko,e.addEventListener(t,o?So:ko,o)):e.removeEventListener(t,o?So:ko,o);else{if(l=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n))}}function Ji(e){return function(t){if(this.l){var n=this.l[t.type+e];if(t.t==null)t.t=Ko++;else if(t.t<n.u)return;return n(le.event?le.event(t):t)}}}function Yo(e,t,n,s,l,o,i,r,a,c){var p,d,h,v,$,T,w,x,b,C,M,S,E,L,D,z=t.type;if(t.constructor!==void 0)return null;128&n.__u&&(a=!!(32&n.__u),o=[r=t.__e=n.__e]),(p=le.__b)&&p(t);e:if(typeof z=="function")try{if(x=t.props,b=z.prototype&&z.prototype.render,C=(p=z.contextType)&&s[p.__c],M=p?C?C.props.value:p.__:s,n.__c?w=(d=t.__c=n.__c).__=d.__E:(b?t.__c=d=new z(x,M):(t.__c=d=new Xt(x,M),d.constructor=z,d.render=id),C&&C.sub(d),d.state||(d.state={}),d.__n=s,h=d.__d=!0,d.__h=[],d._sb=[]),b&&d.__s==null&&(d.__s=d.state),b&&z.getDerivedStateFromProps!=null&&(d.__s==d.state&&(d.__s=sn({},d.__s)),sn(d.__s,z.getDerivedStateFromProps(x,d.__s))),v=d.props,$=d.state,d.__v=t,h)b&&z.getDerivedStateFromProps==null&&d.componentWillMount!=null&&d.componentWillMount(),b&&d.componentDidMount!=null&&d.__h.push(d.componentDidMount);else{if(b&&z.getDerivedStateFromProps==null&&x!==v&&d.componentWillReceiveProps!=null&&d.componentWillReceiveProps(x,M),t.__v==n.__v||!d.__e&&d.shouldComponentUpdate!=null&&d.shouldComponentUpdate(x,d.__s,M)===!1){t.__v!=n.__v&&(d.props=x,d.state=d.__s,d.__d=!1),t.__e=n.__e,t.__k=n.__k,t.__k.some(function(I){I&&(I.__=t)}),hl.push.apply(d.__h,d._sb),d._sb=[],d.__h.length&&i.push(d);break e}d.componentWillUpdate!=null&&d.componentWillUpdate(x,d.__s,M),b&&d.componentDidUpdate!=null&&d.__h.push(function(){d.componentDidUpdate(v,$,T)})}if(d.context=M,d.props=x,d.__P=e,d.__e=!1,S=le.__r,E=0,b)d.state=d.__s,d.__d=!1,S&&S(t),p=d.render(d.props,d.state,d.context),hl.push.apply(d.__h,d._sb),d._sb=[];else do d.__d=!1,S&&S(t),p=d.render(d.props,d.state,d.context),d.state=d.__s;while(d.__d&&++E<25);d.state=d.__s,d.getChildContext!=null&&(s=sn(sn({},s),d.getChildContext())),b&&!h&&d.getSnapshotBeforeUpdate!=null&&(T=d.getSnapshotBeforeUpdate(v,$)),L=p!=null&&p.type===gn&&p.key==null?Ya(p.props.children):p,r=qa(e,Bs(L)?L:[L],t,n,s,l,o,i,r,a,c),d.base=t.__e,t.__u&=-161,d.__h.length&&i.push(d),w&&(d.__E=d.__=null)}catch(I){if(t.__v=null,a||o!=null)if(I.then){for(t.__u|=a?160:128;r&&r.nodeType==8&&r.nextSibling;)r=r.nextSibling;o[o.indexOf(r)]=null,t.__e=r}else{for(D=o.length;D--;)Go(o[D]);Mo(t)}else t.__e=n.__e,t.__k=n.__k,I.then||Mo(t);le.__e(I,t,n)}else o==null&&t.__v==n.__v?(t.__k=n.__k,t.__e=n.__e):r=t.__e=od(n.__e,t,n,s,l,o,i,a,c);return(p=le.diffed)&&p(t),128&t.__u?void 0:r}function Mo(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(Mo))}function Ga(e,t,n){for(var s=0;s<n.length;s++)Jo(n[s],n[++s],n[++s]);le.__c&&le.__c(t,e),e.some(function(l){try{e=l.__h,l.__h=[],e.some(function(o){o.call(l)})}catch(o){le.__e(o,l.__v)}})}function Ya(e){return typeof e!="object"||e==null||e.__b>0?e:Bs(e)?e.map(Ya):sn({},e)}function od(e,t,n,s,l,o,i,r,a){var c,p,d,h,v,$,T,w=n.props||pl,x=t.props,b=t.type;if(b=="svg"?l="http://www.w3.org/2000/svg":b=="math"?l="http://www.w3.org/1998/Math/MathML":l||(l="http://www.w3.org/1999/xhtml"),o!=null){for(c=0;c<o.length;c++)if((v=o[c])&&"setAttribute"in v==!!b&&(b?v.localName==b:v.nodeType==3)){e=v,o[c]=null;break}}if(e==null){if(b==null)return document.createTextNode(x);e=document.createElementNS(l,b,x.is&&x),r&&(le.__m&&le.__m(t,o),r=!1),o=null}if(b==null)w===x||r&&e.data==x||(e.data=x);else{if(o=o&&Sl.call(e.childNodes),!r&&o!=null)for(w={},c=0;c<e.attributes.length;c++)w[(v=e.attributes[c]).name]=v.value;for(c in w)v=w[c],c=="dangerouslySetInnerHTML"?d=v:c=="children"||c in x||c=="value"&&"defaultValue"in x||c=="checked"&&"defaultChecked"in x||nl(e,c,null,v,l);for(c in x)v=x[c],c=="children"?h=v:c=="dangerouslySetInnerHTML"?p=v:c=="value"?$=v:c=="checked"?T=v:r&&typeof v!="function"||w[c]===v||nl(e,c,v,w[c],l);if(p)r||d&&(p.__html==d.__html||p.__html==e.innerHTML)||(e.innerHTML=p.__html),t.__k=[];else if(d&&(e.innerHTML=""),qa(t.type=="template"?e.content:e,Bs(h)?h:[h],t,n,s,b=="foreignObject"?"http://www.w3.org/1999/xhtml":l,o,i,o?o[0]:n.__k&&us(n,0),r,a),o!=null)for(c=o.length;c--;)Go(o[c]);r||(c="value",b=="progress"&&$==null?e.removeAttribute("value"):$!=null&&($!==e[c]||b=="progress"&&!$||b=="option"&&$!=w[c])&&nl(e,c,$,w[c],l),c="checked",T!=null&&T!=e[c]&&nl(e,c,T,w[c],l))}return e}function Jo(e,t,n){try{if(typeof e=="function"){var s=typeof e.__u=="function";s&&e.__u(),s&&t==null||(e.__u=e(t))}else e.current=t}catch(l){le.__e(l,n)}}function Ja(e,t,n){var s,l;if(le.unmount&&le.unmount(e),(s=e.ref)&&(s.current&&s.current!=e.__e||Jo(s,null,t)),(s=e.__c)!=null){if(s.componentWillUnmount)try{s.componentWillUnmount()}catch(o){le.__e(o,t)}s.base=s.__P=null}if(s=e.__k)for(l=0;l<s.length;l++)s[l]&&Ja(s[l],t,n||typeof e.type!="function");n||Go(e.__e),e.__c=e.__=e.__e=void 0}function id(e,t,n){return this.constructor(e,n)}function rd(e,t,n){var s,l,o,i;t==document&&(t=document.documentElement),le.__&&le.__(e,t),l=(s=!1)?null:t.__k,o=[],i=[],Yo(t,e=t.__k=vn(gn,null,[e]),l||pl,pl,t.namespaceURI,l?null:t.firstChild?Sl.call(t.childNodes):null,o,l?l.__e:t.firstChild,s,i),Ga(o,e,i)}function Za(e){function t(n){var s,l;return this.getChildContext||(s=new Set,(l={})[t.__c]=this,this.getChildContext=function(){return l},this.componentWillUnmount=function(){s=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&s.forEach(function(i){i.__e=!0,xo(i)})},this.sub=function(o){s.add(o);var i=o.componentWillUnmount;o.componentWillUnmount=function(){s&&s.delete(o),i&&i.call(o)}}),n.children}return t.__c="__cC"+Ba++,t.__=e,t.Provider=t.__l=(t.Consumer=function(n,s){return n.children(s)}).contextType=t,t}Sl=hl.slice,le={__e:function(e,t,n,s){for(var l,o,i;t=t.__;)if((l=t.__c)&&!l.__)try{if((o=l.constructor)&&o.getDerivedStateFromError!=null&&(l.setState(o.getDerivedStateFromError(e)),i=l.__d),l.componentDidCatch!=null&&(l.componentDidCatch(e,s||{}),i=l.__d),i)return l.__E=l}catch(r){e=r}throw e}},Fa=0,Xt.prototype.setState=function(e,t){var n;n=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=sn({},this.state),typeof e=="function"&&(e=e(sn({},n),this.props)),e&&sn(n,e),e!=null&&this.__v&&(t&&this._sb.push(t),xo(this))},Xt.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),xo(this))},Xt.prototype.render=gn,pn=[],Ua=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,Ha=function(e,t){return e.__v.__b-t.__v.__b},ml.__r=0,ja=/(PointerCapture)$|Capture$/i,Ko=0,ko=Ji(!1),So=Ji(!0),Ba=0;var Qa=function(e,t,n,s){var l;t[0]=0;for(var o=1;o<t.length;o++){var i=t[o++],r=t[o]?(t[0]|=i?1:2,n[t[o++]]):t[++o];i===3?s[0]=r:i===4?s[1]=Object.assign(s[1]||{},r):i===5?(s[1]=s[1]||{})[t[++o]]=r:i===6?s[1][t[++o]]+=r+"":i?(l=e.apply(r,Qa(e,r,n,["",null])),s.push(l),r[0]?t[0]|=2:(t[o-2]=0,t[o]=l)):s.push(r)}return s},Zi=new Map;function ad(e){var t=Zi.get(this);return t||(t=new Map,Zi.set(this,t)),(t=Qa(this,t.get(e)||(t.set(e,t=function(n){for(var s,l,o=1,i="",r="",a=[0],c=function(h){o===1&&(h||(i=i.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?a.push(0,h,i):o===3&&(h||i)?(a.push(3,h,i),o=2):o===2&&i==="..."&&h?a.push(4,h,0):o===2&&i&&!h?a.push(5,0,!0,i):o>=5&&((i||!h&&o===5)&&(a.push(o,0,i,l),o=6),h&&(a.push(o,h,0,l),o=6)),i=""},p=0;p<n.length;p++){p&&(o===1&&c(),c(p));for(var d=0;d<n[p].length;d++)s=n[p][d],o===1?s==="<"?(c(),a=[a],o=3):i+=s:o===4?i==="--"&&s===">"?(o=1,i=""):i=s+i[0]:r?s===r?r="":i+=s:s==='"'||s==="'"?r=s:s===">"?(c(),o=1):o&&(s==="="?(o=5,l=i,i=""):s==="/"&&(o<5||n[p][d+1]===">")?(c(),o===3&&(a=a[0]),o=a,(a=a[0]).push(2,0,o),o=0):s===" "||s==="	"||s===`
`||s==="\r"?(c(),o=2):i+=s),o===3&&i==="!--"&&(o=4,a=a[0])}return c(),a}(e)),t),arguments,[])).length>1?t:t[0]}var g=ad.bind(vn);const cd="modulepreload",ud=function(e){return"/"+e},Qi={},ft=function(t,n,s){let l=Promise.resolve();if(n&&n.length>0){document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),r=(i==null?void 0:i.nonce)||(i==null?void 0:i.getAttribute("nonce"));l=Promise.allSettled(n.map(a=>{if(a=ud(a),a in Qi)return;Qi[a]=!0;const c=a.endsWith(".css"),p=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${a}"]${p}`))return;const d=document.createElement("link");if(d.rel=c?"stylesheet":cd,c||(d.as="script"),d.crossOrigin="",d.href=a,r&&d.setAttribute("nonce",r),document.head.appendChild(d),c)return new Promise((h,v)=>{d.addEventListener("load",h),d.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${a}`)))})}))}function o(i){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=i,window.dispatchEvent(r),!r.defaultPrevented)throw i}return l.then(i=>{for(const r of i||[])r.status==="rejected"&&o(r.reason);return t().catch(o)})};var Rn,De,io,Xi,Ns=0,Xa=[],Fe=le,er=Fe.__b,tr=Fe.__r,nr=Fe.diffed,sr=Fe.__c,lr=Fe.unmount,or=Fe.__;function Ws(e,t){Fe.__h&&Fe.__h(De,e,Ns||t),Ns=0;var n=De.__H||(De.__H={__:[],__h:[]});return e>=n.__.length&&n.__.push({}),n.__[e]}function X(e){return Ns=1,dd(tc,e)}function dd(e,t,n){var s=Ws(Rn++,2);if(s.t=e,!s.__c&&(s.__=[n?n(t):tc(void 0,t),function(r){var a=s.__N?s.__N[0]:s.__[0],c=s.t(a,r);a!==c&&(s.__N=[c,s.__[1]],s.__c.setState({}))}],s.__c=De,!De.__f)){var l=function(r,a,c){if(!s.__c.__H)return!0;var p=s.__c.__H.__.filter(function(h){return h.__c});if(p.every(function(h){return!h.__N}))return!o||o.call(this,r,a,c);var d=s.__c.props!==r;return p.some(function(h){if(h.__N){var v=h.__[0];h.__=h.__N,h.__N=void 0,v!==h.__[0]&&(d=!0)}}),o&&o.call(this,r,a,c)||d};De.__f=!0;var o=De.shouldComponentUpdate,i=De.componentWillUpdate;De.componentWillUpdate=function(r,a,c){if(this.__e){var p=o;o=void 0,l(r,a,c),o=p}i&&i.call(this,r,a,c)},De.shouldComponentUpdate=l}return s.__N||s.__}function ae(e,t){var n=Ws(Rn++,3);!Fe.__s&&ec(n.__H,t)&&(n.__=e,n.u=t,De.__H.__h.push(n))}function J(e){return Ns=5,Me(function(){return{current:e}},[])}function Me(e,t){var n=Ws(Rn++,7);return ec(n.__H,t)&&(n.__=e(),n.__H=t,n.__h=e),n.__}function se(e,t){return Ns=8,Me(function(){return e},t)}function xl(e){var t=De.context[e.__c],n=Ws(Rn++,9);return n.c=e,t?(n.__==null&&(n.__=!0,t.sub(De)),t.props.value):e.__}function fd(){var e=Ws(Rn++,11);if(!e.__){for(var t=De.__v;t!==null&&!t.__m&&t.__!==null;)t=t.__;var n=t.__m||(t.__m=[0,0]);e.__="P"+n[0]+"-"+n[1]++}return e.__}function pd(){for(var e;e=Xa.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(dl),t.__h.some(Co),t.__h=[]}catch(n){t.__h=[],Fe.__e(n,e.__v)}}}Fe.__b=function(e){De=null,er&&er(e)},Fe.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),or&&or(e,t)},Fe.__r=function(e){tr&&tr(e),Rn=0;var t=(De=e.__c).__H;t&&(io===De?(t.__h=[],De.__h=[],t.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(t.__h.some(dl),t.__h.some(Co),t.__h=[],Rn=0)),io=De},Fe.diffed=function(e){nr&&nr(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(Xa.push(t)!==1&&Xi===Fe.requestAnimationFrame||((Xi=Fe.requestAnimationFrame)||hd)(pd)),t.__H.__.some(function(n){n.u&&(n.__H=n.u),n.u=void 0})),io=De=null},Fe.__c=function(e,t){t.some(function(n){try{n.__h.some(dl),n.__h=n.__h.filter(function(s){return!s.__||Co(s)})}catch(s){t.some(function(l){l.__h&&(l.__h=[])}),t=[],Fe.__e(s,n.__v)}}),sr&&sr(e,t)},Fe.unmount=function(e){lr&&lr(e);var t,n=e.__c;n&&n.__H&&(n.__H.__.some(function(s){try{dl(s)}catch(l){t=l}}),n.__H=void 0,t&&Fe.__e(t,n.__v))};var ir=typeof requestAnimationFrame=="function";function hd(e){var t,n=function(){clearTimeout(s),ir&&cancelAnimationFrame(t),setTimeout(e)},s=setTimeout(n,35);ir&&(t=requestAnimationFrame(n))}function dl(e){var t=De,n=e.__c;typeof n=="function"&&(e.__c=void 0,n()),De=t}function Co(e){var t=De;e.__c=e.__(),De=t}function ec(e,t){return!e||e.length!==t.length||t.some(function(n,s){return n!==e[s]})}function tc(e,t){return typeof t=="function"?t(e):t}function md(e,t){for(var n in t)e[n]=t[n];return e}function rr(e,t){for(var n in e)if(n!=="__source"&&!(n in t))return!0;for(var s in t)if(s!=="__source"&&e[s]!==t[s])return!0;return!1}function ar(e,t){this.props=e,this.context=t}(ar.prototype=new Xt).isPureReactComponent=!0,ar.prototype.shouldComponentUpdate=function(e,t){return rr(this.props,e)||rr(this.state,t)};var cr=le.__b;le.__b=function(e){e.type&&e.type.__f&&e.ref&&(e.props.ref=e.ref,e.ref=null),cr&&cr(e)};var _d=le.__e;le.__e=function(e,t,n,s){if(e.then){for(var l,o=t;o=o.__;)if((l=o.__c)&&l.__c)return t.__e==null&&(t.__e=n.__e,t.__k=n.__k),l.__c(e,t)}_d(e,t,n,s)};var ur=le.unmount;function nc(e,t,n){return e&&(e.__c&&e.__c.__H&&(e.__c.__H.__.forEach(function(s){typeof s.__c=="function"&&s.__c()}),e.__c.__H=null),(e=md({},e)).__c!=null&&(e.__c.__P===n&&(e.__c.__P=t),e.__c.__e=!0,e.__c=null),e.__k=e.__k&&e.__k.map(function(s){return nc(s,t,n)})),e}function sc(e,t,n){return e&&n&&(e.__v=null,e.__k=e.__k&&e.__k.map(function(s){return sc(s,t,n)}),e.__c&&e.__c.__P===t&&(e.__e&&n.appendChild(e.__e),e.__c.__e=!0,e.__c.__P=n)),e}function Dn(){this.__u=0,this.o=null,this.__b=null}function lc(e){var t=e.__&&e.__.__c;return t&&t.__a&&t.__a(e)}function pt(e){var t,n,s,l=null;function o(i){if(t||(t=e()).then(function(r){r&&(l=r.default||r),s=!0},function(r){n=r,s=!0}),n)throw n;if(!s)throw t;return l?vn(l,i):null}return o.displayName="Lazy",o.__f=!0,o}function sl(){this.i=null,this.l=null}le.unmount=function(e){var t=e.__c;t&&(t.__z=!0),t&&t.__R&&t.__R(),t&&32&e.__u&&(e.type=null),ur&&ur(e)},(Dn.prototype=new Xt).__c=function(e,t){var n=t.__c,s=this;s.o==null&&(s.o=[]),s.o.push(n);var l=lc(s.__v),o=!1,i=function(){o||s.__z||(o=!0,n.__R=null,l?l(a):a())};n.__R=i;var r=n.__P;n.__P=null;var a=function(){if(!--s.__u){if(s.state.__a){var c=s.state.__a;s.__v.__k[0]=sc(c,c.__c.__P,c.__c.__O)}var p;for(s.setState({__a:s.__b=null});p=s.o.pop();)p.__P=r,p.forceUpdate()}};s.__u++||32&t.__u||s.setState({__a:s.__b=s.__v.__k[0]}),e.then(i,i)},Dn.prototype.componentWillUnmount=function(){this.o=[]},Dn.prototype.render=function(e,t){if(this.__b){if(this.__v.__k){var n=document.createElement("div"),s=this.__v.__k[0].__c;this.__v.__k[0]=nc(this.__b,n,s.__O=s.__P)}this.__b=null}var l=t.__a&&vn(gn,null,e.fallback);return l&&(l.__u&=-33),[vn(gn,null,t.__a?null:e.children),l]};var dr=function(e,t,n){if(++n[1]===n[0]&&e.l.delete(t),e.props.revealOrder&&(e.props.revealOrder[0]!=="t"||!e.l.size))for(n=e.i;n;){for(;n.length>3;)n.pop()();if(n[1]<n[0])break;e.i=n=n[2]}};(sl.prototype=new Xt).__a=function(e){var t=this,n=lc(t.__v),s=t.l.get(e);return s[0]++,function(l){var o=function(){t.props.revealOrder?(s.push(l),dr(t,e,s)):l()};n?n(o):o()}},sl.prototype.render=function(e){this.i=null,this.l=new Map;var t=Is(e.children);e.revealOrder&&e.revealOrder[0]==="b"&&t.reverse();for(var n=t.length;n--;)this.l.set(t[n],this.i=[1,0,this.i]);return e.children},sl.prototype.componentDidUpdate=sl.prototype.componentDidMount=function(){var e=this;this.l.forEach(function(t,n){dr(e,n,t)})};var vd=typeof Symbol<"u"&&Symbol.for&&Symbol.for("react.element")||60103,gd=/^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/,yd=/^on(Ani|Tra|Tou|BeforeInp|Compo)/,bd=/[A-Z0-9]/g,$d=typeof document<"u",wd=function(e){return(typeof Symbol<"u"&&typeof Symbol()=="symbol"?/fil|che|rad/:/fil|che|ra/).test(e)};Xt.prototype.isReactComponent=!0,["componentWillMount","componentWillReceiveProps","componentWillUpdate"].forEach(function(e){Object.defineProperty(Xt.prototype,e,{configurable:!0,get:function(){return this["UNSAFE_"+e]},set:function(t){Object.defineProperty(this,e,{configurable:!0,writable:!0,value:t})}})});var fr=le.event;le.event=function(e){return fr&&(e=fr(e)),e.persist=function(){},e.isPropagationStopped=function(){return this.cancelBubble},e.isDefaultPrevented=function(){return this.defaultPrevented},e.nativeEvent=e};var kd={configurable:!0,get:function(){return this.class}},pr=le.vnode;le.vnode=function(e){typeof e.type=="string"&&function(t){var n=t.props,s=t.type,l={},o=s.indexOf("-")==-1;for(var i in n){var r=n[i];if(!(i==="value"&&"defaultValue"in n&&r==null||$d&&i==="children"&&s==="noscript"||i==="class"||i==="className")){var a=i.toLowerCase();i==="defaultValue"&&"value"in n&&n.value==null?i="value":i==="download"&&r===!0?r="":a==="translate"&&r==="no"?r=!1:a[0]==="o"&&a[1]==="n"?a==="ondoubleclick"?i="ondblclick":a!=="onchange"||s!=="input"&&s!=="textarea"||wd(n.type)?a==="onfocus"?i="onfocusin":a==="onblur"?i="onfocusout":yd.test(i)&&(i=a):a=i="oninput":o&&gd.test(i)?i=i.replace(bd,"-$&").toLowerCase():r===null&&(r=void 0),a==="oninput"&&l[i=a]&&(i="oninputCapture"),l[i]=r}}s=="select"&&(l.multiple&&Array.isArray(l.value)&&(l.value=Is(n.children).forEach(function(c){c.props.selected=l.value.indexOf(c.props.value)!=-1})),l.defaultValue!=null&&(l.value=Is(n.children).forEach(function(c){c.props.selected=l.multiple?l.defaultValue.indexOf(c.props.value)!=-1:l.defaultValue==c.props.value}))),n.class&&!n.className?(l.class=n.class,Object.defineProperty(l,"className",kd)):n.className&&(l.class=l.className=n.className),t.props=l}(e),e.$$typeof=vd,pr&&pr(e)};var hr=le.__r;le.__r=function(e){hr&&hr(e),e.__c};var mr=le.diffed;le.diffed=function(e){mr&&mr(e);var t=e.props,n=e.__e;n!=null&&e.type==="textarea"&&"value"in t&&t.value!==n.value&&(n.value=t.value==null?"":t.value)};const zs=Za(null);function Sd(e){const t=String(e||"");return/^[A-Za-z]:([\\/]|$)/.test(t)||t.startsWith("\\\\")||t.includes("\\")&&!t.includes("/")}function oc(e){return Sd(e)?"\\":"/"}function ic(e){return String(e||"").split(/[\\/]+/).filter(Boolean)}function rc(e){const t=String(e||"");if(!t)return"";const n=ic(t);if(!n.length)return t;const s=n[n.length-1];return n.length===1&&/^[A-Za-z]:$/.test(s)?s+"\\":s}function j_(e,t=2){const n=String(e||"");if(!n)return"";const s=oc(n),l=ic(n);return l.length<=t?n:"…"+s+l.slice(-t).join(s)}let xd="";function Vs(e){return xd+e}async function ie(e,t=void 0){const n=await(t===void 0?fetch(Vs(e)):fetch(Vs(e),t));if(!n.ok){let s="";try{const o=await n.text();if(o)try{s=JSON.parse(o).error||o}catch{s=o}}catch{}const l=new Error(`HTTP ${n.status} ${e}`+(s?`: ${String(s).slice(0,200)}`:""));throw l.status=n.status,l}return n.json()}async function Md(){return ie("/api/snapshot")}async function Eo(e={}){let t="/api/history";const n=[];return e.range&&n.push("range="+e.range),e.since!=null&&n.push("since="+e.since),e.until!=null&&n.push("until="+e.until),e.tool&&n.push("tool="+encodeURIComponent(e.tool)),n.length&&(t+="?"+n.join("&")),ie(t)}async function Cd(e={}){let t="/api/events";const n=[];return e.tool&&n.push("tool="+encodeURIComponent(e.tool)),e.since!=null&&n.push("since="+e.since),e.until!=null&&n.push("until="+e.until),e.sessionId&&n.push("session_id="+encodeURIComponent(e.sessionId)),e.limit&&n.push("limit="+e.limit),n.length&&(t+="?"+n.join("&")),ie(t)}async function B_(e={}){let t="/api/sessions";const n=[];return e.tool&&n.push("tool="+encodeURIComponent(e.tool)),e.active!=null&&n.push("active="+e.active),e.limit&&n.push("limit="+e.limit),n.length&&(t+="?"+n.join("&")),ie(t)}async function Zo(e,t,n){const s=(Array.isArray(e)?e:[e]).filter(r=>r!=null&&r!=="");let l,o=!1,i=null;for(const r of s)try{const a=await t(r);if(n(a))return a;o||(l=a,o=!0)}catch(a){i===null&&(i=a)}if(o)return l;throw i??new Error("no session id to fetch")}async function W_(e,t,n){return Zo(e,s=>ie(`/api/session-flow?session_id=${encodeURIComponent(s)}&since=${t}&until=${n}`),s=>{var l;return(((l=s==null?void 0:s.turns)==null?void 0:l.length)??0)>0})}let ac=0;async function q_(e,t={}){let n="/api/session-timeline";const s=[];t.since!=null&&s.push("since="+t.since),t.until!=null&&s.push("until="+t.until),s.length&&(n+="?"+s.join("&"));const l=await ie(n),o=Array.isArray(l)?l:Array.isArray(l==null?void 0:l.sessions)?l.sessions:[],i=Array.isArray(l)?0:Number(l==null?void 0:l.filtered_count)||0;ac=i;try{o.filtered_count=i}catch{}return o}function K_(){return ac}async function G_(e,t,n=30,s=20){return ie(`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=${n}&limit=${s}`)}async function Y_(e,t={}){let n="/api/events?session_id="+encodeURIComponent(e);return t.since!=null&&(n+="&since="+t.since),t.until!=null&&(n+="&until="+t.until),t.limit!=null&&(n+="&limit="+t.limit),ie(n)}async function J_(e,t={}){let n="/api/samples?metric="+encodeURIComponent(e);if(t.since!=null&&(n+="&since="+t.since),t.limit!=null&&(n+="&limit="+t.limit),t.tags)for(const[s,l]of Object.entries(t.tags))l!=null&&(n+="&tag."+encodeURIComponent(s)+"="+encodeURIComponent(l));return ie(n)}async function Z_(e){return ie("/api/session-subprocesses?session_id="+encodeURIComponent(e))}async function Q_(e){return ie("/api/session-mcp-usage?session_id="+encodeURIComponent(e))}async function X_(e){return ie("/api/session-cost-by-model?session_id="+encodeURIComponent(e))}async function ev(e){return ie("/api/session-processes?session_id="+encodeURIComponent(e))}async function tv(e){return Zo(e,t=>ie("/api/session-tool-calls?session_id="+encodeURIComponent(t)),t=>{var n;return(((n=t==null?void 0:t.calls)==null?void 0:n.length)??0)>0})}async function nv(e){return ie("/api/session-stats?session_id="+encodeURIComponent(e))}async function sv(e){return ie("/api/session-commits?session_id="+encodeURIComponent(e))}async function lv(e,t=200){return ie("/api/session-messages?session_id="+encodeURIComponent(e)+"&limit="+t)}async function ov(e){return ie("/api/session-memory-diff?session_id="+encodeURIComponent(e))}async function iv(e){return Zo(e,t=>ie("/api/transcript/"+encodeURIComponent(t)),t=>{var n;return(((n=t==null?void 0:t.turns)==null?void 0:n.length)??0)>0})}async function rv(e,t={}){return ie(e,t)}async function Ed({since:e,until:t}={}){const n=new URLSearchParams;e!=null&&n.set("since",String(e)),t!=null&&n.set("until",String(t));const s=n.toString();return ie("/api/usage"+(s?"?"+s:""))}async function av(e=7){return ie("/api/project-costs?days="+e)}async function cv(e,t=100,n=null){const s=new URLSearchParams({since:String(e),limit:String(t)});return n&&s.set("session_id",n),ie(`/api/api-calls?${s.toString()}`)}async function uv(e=""){return ie("/api/budget"+(e?"?"+e:""))}async function Ad(e,t={}){return fetch(Vs("/api/file?path="+encodeURIComponent(e)),{headers:t})}async function Td(e,t){return fetch(Vs("/api/files/history?path="+encodeURIComponent(e)+"&ts="+t))}async function dv(){return ie("/api/samples?list=1")}async function fv(e,t){return ie("/api/samples?series="+encodeURIComponent(e)+"&since="+t)}async function pv(e,t){return ie("/api/samples?metric="+encodeURIComponent(e)+"&since="+t)}async function cc(){return ie("/api/otel-status")}async function Ld(){return ie("/api/ingesters")}async function uc(){return ie("/api/self-status")}async function Dd(){return ie("/api/effective-models")}async function Pd(){return ie("/api/hooks-status")}async function dc(e={}){let t="/api/data-quality";const n=[];return e.status&&n.push("status="+encodeURIComponent(e.status)),e.kind&&n.push("kind="+encodeURIComponent(e.kind)),e.component&&n.push("component="+encodeURIComponent(e.component)),e.limit&&n.push("limit="+e.limit),n.length&&(t+="?"+n.join("&")),ie(t)}async function hv(e){return ie("/api/tool-config/"+encodeURIComponent(e))}async function mv(e,t){return ie("/api/tool-config/"+encodeURIComponent(e),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})}async function _v(e,t="TERM"){return ie("/api/session-kill",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:e,confirm:!0,signal:t})})}let ro=null;async function Od(){return ro||(ro=ie("/api/datapoints")),ro}function Rd(){return Vs("/api/stream")}const ss=window.COLORS??{},vv=window.VENDOR_LABELS??{},gv=window.VENDOR_COLORS??{},yv=window.HOST_LABELS??{},bv=window.TOOL_RELATIONSHIPS??{},Id={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},fc=["auto","dark","light","editorial"],$v=5,es=15,wv={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},kv=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],Sv={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},xv=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],_r=new Map,Nd=6e4;function pc(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function Ml(e,t,n,s=1){for(let l=t.length-1;l>=0;l--){const[o,i]=t[l],r=e/o;if(r>=s)return pc(r)+i}return Math.round(e)+n}const zd=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],Vd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],Fd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function vt(e){return Ml(e,Vd,"")}function Mv(e){return Ml(e,Fd,"")}function Ht(e){return Ml(e,zd,"B")}function Ao(e){return!e||e<=0?"0B/s":Ml(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function Pn(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function is(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function vr(e,t){if(!e)return t;if(typeof e=="string"&&e.startsWith("var(")){const n=e.slice(4,-1).trim();return(typeof document<"u"?getComputedStyle(document.documentElement).getPropertyValue(n).trim():"")||t}return e}function Ud(e){return vr(e,"")||vr("var(--fg2)","")||void 0}function Cv(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function Ev(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Qo(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const n=Math.floor(t/60);return n<60?n+"m "+t%60+"s":Math.floor(n/60)+"h "+n%60+"m"}function Av(e){if(e==null||isNaN(e)||e<=0)return"";if(e<1e3)return Math.round(e)+"ms";const t=e/1e3;if(t<10)return t.toFixed(1).replace(/\.0$/,"")+"s";const n=Math.round(t);if(n<60)return n+"s";const s=Math.floor(n/60);return s<60?s+"m "+n%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Tv(e){return e?new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):""}function Lv(e){return e?new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function Dv(e){if(!e)return"";const t=String(e).split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:String(e).slice(-6)}function Pv(e){return e?e.replace("claude-","").replace("gpt-","").replace(/-\d{8}$/,""):""}const gr=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"];function Ov(e){if(!e)return"var(--fg2)";let t=0;for(let n=0;n<e.length;n++)t=t*31+e.charCodeAt(n)&65535;return gr[t%gr.length]}function Hd(e){return ss[e]||"var(--fg2)"}function _l(e){return e&&e.replace(/\\/g,"/")}function ao(e,t){const n=_l(e),s=_l(t);return n.startsWith(s+"/")?"project":n.includes("/.claude/projects/")?"shadow":n.includes("/.claude/")||n.includes("/.config/")||n.includes("/Library/")||n.includes("/AppData/")||n.includes("/.copilot/")||n.includes("/.vscode/")?"global":"external"}function jd(e,t){const n=_l(e),s=_l(t),l=oc(e);if(n.startsWith(s+"/")){const r=n.slice(s.length+1),a=r.split("/");return a.pop(),a.length?a.join(l):"(root)"}const o=n.split("/");o.pop();const i=l==="/"?"~/":"";for(let r=o.length-1;r>=0;r--)if(o[r].startsWith(".")&&o[r].length>1&&o[r]!==".."||o[r]==="Library"||o[r]==="AppData")return i+o.slice(r).join(l);return o.slice(-2).join(l)}function Rv(e,t){const n={};e.forEach(l=>{const o=ao(l.path,t),i=jd(l.path,t),r=o==="project"?i:o+": "+i;(n[r]=n[r]||[]).push(l)});const s={project:0,global:1,shadow:2,external:3};return Object.entries(n).sort((l,o)=>{const i=l[1][0]?ao(l[1][0].path,t):"z",r=o[1][0]?ao(o[1][0].path,t):"z";return(s[i]||9)-(s[r]||9)})}function Bd(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let n=2;n<e.length;n++)t.push((e[n-2]+e[n-1]+e[n])/3);return t}async function Wd(e){const t=_r.get(e);if(t&&Date.now()-t.ts<Nd)return t.content;const n={};t&&t.etag&&(n["If-None-Match"]=t.etag);const s=await Ad(e,n);if(s.status===304&&t)return t.ts=Date.now(),t.content;if(!s.ok)throw new Error(s.statusText);const l=await s.text(),o=s.headers.get("ETag")||null;return _r.set(e,{content:l,ts:Date.now(),etag:o}),l}async function qd(e,t){const n=await Td(e,t);if(n.status===404)throw new Error("No content at that timestamp");if(!n.ok)throw new Error(n.statusText);return n.text()}function ll(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function Iv(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function co(e,t,n,s){if(e==null||e==="")return"";let l=typeof e=="number"?e:parseFloat(e)||0;s&&(l*=s);let o;switch(t){case"size":o=Ht(l);break;case"rate":o=Ao(l);break;case"kilo":o=vt(l);break;case"percent":o=Pn(l);break;case"pct":o=Pn(l);break;case"raw":default:o=Number.isInteger(l)?String(l):pc(l)}return n?o+n:o}function yr(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const br=200,$r=80,Kd=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Gd(e,t){const n=Array.isArray(e)?e.slice():[],s=new Map(n.map((o,i)=>[o.session_id,i]));for(const o of t.upsert||[])s.has(o.session_id)?n[s.get(o.session_id)]=o:(s.set(o.session_id,n.length),n.push(o));for(const o of t.patch||[])s.has(o.session_id)&&(n[s.get(o.session_id)]={...n[s.get(o.session_id)],...o});const l=new Set(t.remove||[]);return l.size?n.filter(o=>!l.has(o.session_id)):n}function Yd(e,t){return Array.isArray(e==null?void 0:e.tools)?{...e,tools:e.tools.map(n=>"live"in n?(t[n.tool]=n.live,n):n.tool in t?{...n,live:t[n.tool]}:n)}:e}function Jd(e,t){if(!e)return t;const{sessions_delta:n,tools_rev:s,...l}=t,o=Object.fromEntries((t.tools||[]).map(r=>[r.tool,r])),i={...e,...l,tools:e.tools.map(r=>{const a=o[r.tool];return a?{...r,live:a.live,vendor:a.vendor||r.vendor,host:a.host||r.host}:r})};return n&&(i.sessions=Gd(e.sessions,n)),i}function Zd(e,t){var s,l,o,i;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>br)for(const r of Kd)e[r]=e[r].slice(-br);const n=e.by_tool||{};for(const r of t.tools||[]){if(r.tool==="aictl")continue;const a=((s=r.live)==null?void 0:s.cpu_percent)||0,c=((l=r.live)==null?void 0:l.mem_mb)||0,p=r.tokens||0,d=(((o=r.live)==null?void 0:o.outbound_rate_bps)||0)+(((i=r.live)==null?void 0:i.inbound_rate_bps)||0);n[r.tool]||(n[r.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const h=n[r.tool];if(h.ts.push(t.timestamp),h.cpu.push(Math.round(a*10)/10),h.mem_mb.push(Math.round(c*10)/10),h.tokens.push(p),h.traffic.push(Math.round(d*100)/100),h.ts.length>$r)for(const v of Object.keys(h))h[v]=h[v].slice(-$r)}return{...e,by_tool:n}}const Qd=15,Xd=5;function hc(e){return(e==null?void 0:e.session_id)??(e==null?void 0:e.id)??null}const wr=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;function ef(e){return Array.isArray(e==null?void 0:e.alt_session_ids)?e.alt_session_ids:[]}function To(e){const t=[];for(const n of[hc(e),...ef(e)])n!=null&&n!==""&&!t.includes(n)&&t.push(n);return t}function Nv(e,t){if(t!=null)return(e||[]).find(n=>To(n).includes(t))}function kr(e){return Math.max((e==null?void 0:e.ended_at)||0,(e==null?void 0:e.started_at)||0,(e==null?void 0:e.last_activity)||0)}function Sr(e){return e!=null&&e.duration_s?e.duration_s:e!=null&&e.ended_at&&(e!=null&&e.started_at)?e.ended_at-e.started_at:null}function xr(e,t){const[n,s]=kr(t)>kr(e)?[t,e]:[e,t],l={...n};for(const i of["input_tokens","output_tokens","exact_input_tokens","exact_output_tokens","files_modified"]){const r=(s==null?void 0:s[i])||0;r>(l[i]||0)&&(l[i]=r)}for(const i of Object.keys(s||{}))l[i]==null&&s[i]!=null&&(l[i]=s[i]);const o=[];for(const i of[...To(n),...To(s)])o.includes(i)||o.push(i);if(o.length>1){const i=wr.test(String(o[0]))?o[0]:o.find(r=>wr.test(String(r)))??o[0];l.session_id=i,l.id!=null&&(l.id=i),l.alt_session_ids=o.filter(r=>r!==i)}return l}function tf(e,t){if(!(e!=null&&e.tool)||e.tool!==(t==null?void 0:t.tool)||e.started_at==null||t.started_at==null||Math.abs(e.started_at-t.started_at)>Qd)return!1;const n=Sr(e),s=Sr(t);return n==null&&s==null?!0:n==null||s==null?!1:Math.abs(n-s)<=Xd}function zv(e){if(!Array.isArray(e))return[];if(e.length<2)return e.slice();const t=new Map,n=[];for(const l of e){if(!l)continue;const o=hc(l);if(o!=null&&t.has(o)){const i=t.get(o);n[i]=xr(n[i],l)}else o!=null&&t.set(o,n.length),n.push(l)}const s=[];for(const l of n){const o=s.findIndex(i=>tf(i,l));o>=0?s[o]=xr(s[o],l):s.push(l)}return s}const ut=e=>Number(e)||0;function nf(e){const t=((e==null?void 0:e.tools)||[]).filter(r=>r.tool!=="aictl"),n=r=>Array.isArray(r.files)?r.files:[],s=r=>t.reduce((a,c)=>a+r(c),0),l=r=>r.live||{},o=(e==null?void 0:e.agent_memory)||[],i=r=>{var a,c;return ut((a=l(r).token_estimate)==null?void 0:a.input_tokens)+ut((c=l(r).token_estimate)==null?void 0:c.output_tokens)};return{total_files:s(r=>Array.isArray(r.files)?r.files.length:ut(r.files_count)),total_tokens:s(r=>n(r).reduce((a,c)=>a+ut(c.tokens),0)),total_size:s(r=>n(r).reduce((a,c)=>a+ut(c.size),0)),total_processes:s(r=>Math.max(Array.isArray(r.processes)?r.processes.length:ut(r.processes_count),ut(l(r).pid_count))),total_cpu:Math.round(s(r=>l(r).cpu_percent?ut(l(r).cpu_percent):(r.processes||[]).reduce((a,c)=>a+ut(c.cpu_pct),0))*10)/10,total_mem_mb:Math.round(s(r=>(r.processes||[]).reduce((a,c)=>a+ut(c.mem_mb),0))*10)/10,total_mcp_servers:((e==null?void 0:e.mcp_detail)||[]).length,total_memory_tokens:o.reduce((r,a)=>r+ut(a.tokens),0),total_live_sessions:s(r=>ut(l(r).session_count)),total_live_estimated_tokens:s(i),total_live_outbound_rate_bps:Math.round(s(r=>ut(l(r).outbound_rate_bps))*100)/100,total_live_inbound_rate_bps:Math.round(s(r=>ut(l(r).inbound_rate_bps))*100)/100}}function sf(e,t){if(!e||!Array.isArray(t))return e;const n=e.by_tool||{},s=t.filter(i=>{var r,a;return(a=(r=n[i])==null?void 0:r.ts)==null?void 0:a.length}),l=[...new Set(s.flatMap(i=>n[i].ts))].sort((i,r)=>i-r),o=i=>l.map(r=>s.reduce((a,c)=>{var d;const p=n[c].ts.indexOf(r);return a+(p>=0?ut((d=n[c][i])==null?void 0:d[p]):0)},0));return{ts:l,cpu:o("cpu"),mem_mb:o("mem_mb"),tokens:o("tokens"),by_tool:n}}function lf(e,t,n={}){const{onConnect:s,onDisconnect:l,initialRetryMs:o=1e3,maxRetryMs:i=3e4,EventSourceClass:r=typeof EventSource<"u"?EventSource:null}=n,[a,c]=X(!1),p=J(null),d=J(!1),h=J(o),v=J(t);v.current=t;const $=J(s);$.current=s;const T=J(l);T.current=l,ae(()=>{if(!r||!e)return;d.current=!1,h.current=o;function x(){if(d.current)return;const b=new r(e);p.current=b,b.onopen=()=>{var C;c(!0),h.current=o,(C=$.current)==null||C.call($)},b.onmessage=C=>{try{const M=JSON.parse(C.data);v.current(M)}catch{}},b.onerror=()=>{var C;c(!1),(C=T.current)==null||C.call(T),b.close(),d.current||(setTimeout(x,h.current),h.current=Math.min(h.current*2,i))}}return x(),()=>{var b;d.current=!0,(b=p.current)==null||b.close(),c(!1)}},[e,r,o,i]);const w=se(()=>{var x;d.current=!0,(x=p.current)==null||x.close(),c(!1)},[]);return{connected:a,close:w}}const of=720;function rf(e={}){const{EventSourceClass:t,refreshMs:n=3e4,applyMs:s=1e3,stallMs:l=6e4,minRefetchGapMs:o=3e4,maxQueued:i=of}=e,[r,a]=X(null),[c,p]=X(null),[d,h]=X(null),v=J(!1),$=J(null),T=J(!1),w=J(0),x=J(Date.now()),b=J(()=>{}),C=J(null),M=J({}),S=J(!1),E=se(()=>v.current?Promise.resolve():(v.current=!0,w.current=Date.now(),Md().then(N=>{$.current=(N==null?void 0:N.tools_rev)||null,T.current=!0,a(N),h(Date.now()),b.current()}).catch(()=>{}).finally(()=>{v.current=!1})),[]),L=se(()=>{if(C.current||v.current)return;const N=Math.max(0,o-(Date.now()-w.current));C.current=setTimeout(()=>{C.current=null,E()},N)},[E,o]);ae(()=>{E(),Eo().then(p).catch(()=>{})},[E]);const D=J([]),z=J(0),I=J(null),P=se(()=>{I.current&&(clearTimeout(I.current),I.current=null);const N=D.current;!N.length||!T.current||(D.current=[],z.current=Date.now(),a(V=>V&&N.reduce((Ie,fe)=>Jd(Ie,fe),V)),p(V=>N.reduce(Zd,V)),h(Date.now()))},[]);b.current=P;const Y=se(N=>{x.current=Date.now();const V=Yd(N,M.current);if(D.current.push(V),D.current.length>i&&(D.current.shift(),S.current=!0),typeof document<"u"&&document.hidden)return;V.tools_rev&&$.current&&V.tools_rev!==$.current&&L();const Ie=s-(Date.now()-z.current);Ie<=0?P():I.current||(I.current=setTimeout(P,Ie))},[s,P,L,i]);ae(()=>{const N=()=>{document.hidden||(S.current&&(S.current=!1,E()),P())};return document.addEventListener("visibilitychange",N),()=>{document.removeEventListener("visibilitychange",N),I.current&&clearTimeout(I.current),C.current&&clearTimeout(C.current)}},[P,E]);const{connected:U}=lf(Rd(),Y,t?{EventSourceClass:t}:{}),K=J(U);K.current=U;const W=J(!1);return ae(()=>{U&&(W.current&&E(),W.current=!0)},[U,E]),ae(()=>{if(!n)return;const N=setInterval(()=>{if(document.hidden)return;(!T.current||!K.current||Date.now()-x.current>l)&&E()},n);return()=>clearInterval(N)},[E,n,l]),{snapshot:r,history:c,connected:U,lastUpdateAt:d,refresh:E,setHistory:p}}function ls(e,t=[],{pollMs:n=0}={}){const[s,l]=X({data:null,error:null,loading:!0,updatedAt:null}),o=J(e);o.current=e;const i=J(0),r=se(()=>{const a=++i.current;return l(c=>({...c,loading:!0})),Promise.resolve().then(()=>o.current()).then(c=>{a===i.current&&l({data:c,error:null,loading:!1,updatedAt:Date.now()})}).catch(c=>{a===i.current&&l(p=>({...p,error:c,loading:!1}))})},[]);return ae(()=>{if(r(),!n)return()=>{i.current++};const a=setInterval(()=>{document.hidden||r()},n);return()=>{clearInterval(a),i.current++}},[r,n,...t]),{...s,reload:r}}const af={dashboard:"overview",sessions:"explorer","session-explorer":"explorer",processes:"procs",context:"memory","ai-context":"memory",monitor:"live","events-stats":"events",token_budget:"budget",configuration:"config"};function Mr(e,t){if(!e)return null;const n=af[e]||e;return t.includes(n)?n:null}function cf(e){const t=new URLSearchParams(e||""),n={};if(t.has("tab")&&(n.tab=t.get("tab")),t.has("range")){const s=t.get("range");if(s==="custom"){const l=Number(t.get("since")),o=Number(t.get("until"));l>0&&o>l&&(n.range={id:s,since:l,until:o})}else n.range={id:s}}if(t.has("tools")){const s=t.get("tools");n.tools=s?s.split(",").filter(Boolean):[]}return n}function uf(e,t){const n=new URLSearchParams(e||"");for(const[l,o]of Object.entries(t))o==null?n.delete(l):n.set(l,String(o));const s=n.toString().replace(/%2C/g,",");return s?"?"+s:""}function df(e){return!e||e.id==="live"?{range:null,since:null,until:null}:e.id==="custom"?{range:"custom",since:Math.floor(e.since),until:Math.floor(e.until)}:{range:e.id,since:null,until:null}}function ff(e){return{tools:e==null?null:e.join(",")}}function pf(e,t="overview"){return{tab:e===t?null:e}}function mc(){return typeof window<"u"?window.location:null}function Xo(e,{push:t=!1}={}){const n=mc();if(!n||typeof history>"u")return;const s=uf(n.search,e);if(s===n.search)return;const l=n.pathname+s+n.hash;try{t?history.pushState(null,"",l):history.replaceState(null,"",l)}catch{}}function ei(){const e=mc();return cf(e?e.search:"")}const Fs=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],Cl=Object.fromEntries(Fs.map(e=>[e.id,e.seconds])),_c="aictl-pref-range";function hf(){try{const e=localStorage.getItem(_c),t=e!=null?JSON.parse(e):"live";return Cl[t]?t:"live"}catch{return"live"}}function mf(e){try{localStorage.setItem(_c,JSON.stringify(e))}catch{}}function Lo(e){const t=Cl[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}}function _f(){const e=ei().range;return(e==null?void 0:e.id)==="custom"?e:e&&Cl[e.id]?Lo(e.id):Lo(hf())}function vf(){const[e,t]=X(_f);ae(()=>{Xo(df(e))},[e]);const n=se(o=>{t(Lo(o)),mf(o)},[]),s=se((o,i)=>{t({id:"custom",since:o,until:i})},[]),l=se(o=>{typeof o=="string"?n(o):o&&typeof o=="object"&&t(o)},[n]);return{range:e,setRange:l,setPreset:n,setCustom:s,presets:Fs}}const vc="aictl-pref-tool_filter";function gf(){const e=ei().tools;if(e!==void 0)return e;try{const t=localStorage.getItem(vc);return t!=null?JSON.parse(t):null}catch{return null}}function Cr(e){try{localStorage.setItem(vc,JSON.stringify(e))}catch{}Xo(ff(e))}function yf(e=[]){const[t,n]=X(gf),s=se(o=>{n(o),Cr(o)},[]),l=se(o=>{n(i=>{let r;return i===null?r=e.filter(a=>a!==o):i.includes(o)?r=i.filter(a=>a!==o):(r=[...i,o],r.length>=e.length&&(r=null)),Cr(r),r})},[e]);return{selectedTools:t,setTools:s,toggleTool:l,allTools:e}}const Ps={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files",iconName:"file-text"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens",iconName:"coins"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",iconName:"cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb",iconName:"server"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],navGroups:[{id:"monitor",label:"Monitor"},{id:"work",label:"Sessions"},{id:"spend",label:"Spend"},{id:"setup",label:"Setup"}],tabs:[{id:"overview",group:"monitor",label:"Overview",iconName:"layout-dashboard",key:"1"},{id:"hidden",group:"monitor",label:"Hidden context",iconName:"eye-off",key:"h"},{id:"live",group:"monitor",label:"Live",iconName:"radio",key:"2"},{id:"procs",group:"monitor",label:"Processes",iconName:"cpu",key:"3"},{id:"events",group:"monitor",label:"Events",iconName:"activity",key:"4"},{id:"explorer",group:"work",label:"Explorer",iconName:"search",key:"5"},{id:"agents",group:"work",label:"Agents",iconName:"bot",key:"6"},{id:"prompts",group:"work",label:"Prompts",iconName:"pen",key:"7"},{id:"budget",group:"spend",label:"Budget",iconName:"coins",key:"8"},{id:"analytics",group:"spend",label:"Analytics",iconName:"bar-chart-3",key:"9"},{id:"memory",group:"setup",label:"AI context",iconName:"brain",key:"0"},{id:"config",group:"setup",label:"Configuration",iconName:"settings",key:"-"}]},gc="aictl-pref-active_tab",vl=Ps.tabs,os=vl.map(e=>e.id);var Va;const Do=((Va=vl[0])==null?void 0:Va.id)||"overview";function Er(){const e=Mr(ei().tab,os);if(e)return e;try{const t=localStorage.getItem(gc);return Mr(t!=null?JSON.parse(t):null,os)||Do}catch{return Do}}function ti(e){if(!e)return!1;const t=e.tagName;return t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||e.isContentEditable}function bf(){const[e,t]=X(Er),n=J(e);n.current=e;const s=se(l=>{t(l),Xo(pf(l,Do),{push:!0});try{localStorage.setItem(gc,JSON.stringify(l))}catch{}},[]);return ae(()=>{const l=()=>t(Er());return window.addEventListener("popstate",l),()=>window.removeEventListener("popstate",l)},[]),ae(()=>{const l=o=>{if(ti(o.target)||o.metaKey||o.ctrlKey||o.altKey)return;if(o.key==="["||o.key==="]"){const r=o.key==="]"?1:-1,a=os.indexOf(n.current);s(os[(a+r+os.length)%os.length]);return}const i=vl.find(r=>r.key&&r.key===o.key);i&&s(i.id)};return document.addEventListener("keydown",l),()=>document.removeEventListener("keydown",l)},[s]),{activeTab:e,setActiveTab:s,tabs:vl}}const yc="aictl-theme",bc=new Set(fc),uo=["auto","dark","light"],$f="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600&display=swap";function wf(){if(document.getElementById("aictl-editorial-fonts"))return;const e=document.createElement("link");e.id="aictl-editorial-fonts",e.rel="stylesheet",e.href=$f,document.head.appendChild(e)}function kf(){try{const e=localStorage.getItem(yc);return bc.has(e)?e:"auto"}catch{return"auto"}}function Sf(){const[e,t]=X(kf);ae(()=>{document.documentElement.setAttribute("data-theme",e),e==="editorial"&&wf();try{localStorage.setItem(yc,e)}catch{}},[e]);const n=se(l=>{bc.has(l)&&t(l)},[]),s=se(()=>{t(l=>uo[(uo.indexOf(l)+1)%uo.length])},[]);return{theme:e,setTheme:n,cycleTheme:s,themes:fc}}const $c=["compact","normal","spacious"],wc="aictl-density",kc=new Set($c);function xf(){try{const e=localStorage.getItem(wc);return kc.has(e)?e:"normal"}catch{return"normal"}}function Mf(){const[e,t]=X(xf);ae(()=>{document.documentElement.setAttribute("data-density",e);try{localStorage.setItem(wc,e)}catch{}},[e]);const n=se(s=>{kc.has(s)&&t(s)},[]);return{density:e,setDensity:n,densities:$c}}const Sc="aictl-views-v1";function Ar(){try{const e=localStorage.getItem(Sc),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}function Tr(e){try{localStorage.setItem(Sc,JSON.stringify(e))}catch{}}function Lr(e){try{const t=JSON.stringify({tab:e.tab,range:e.range,tools:Array.isArray(e.tools)?[...e.tools].sort():e.tools,density:e.density,theme:e.theme});let n=5381;for(let s=0;s<t.length;s++)n=(n<<5)+n+t.charCodeAt(s)|0;return String(n)}catch{return""}}function Cf(){return"v_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}function Ef(e,t){const[n,s]=X(Ar);ae(()=>{if(!(typeof window>"u"))try{const p=new URLSearchParams(window.location.search).get("view");if(!p)return;const d=Ar().find(h=>h.id===p);d&&t&&t(d)}catch{}},[]);const l=se(c=>{const p=(c||"").trim();if(!p)return null;const d={id:Cf(),name:p,tab:e.tab,range:e.range,tools:e.tools,density:e.density,theme:e.theme,createdAt:Date.now()};return s(h=>{const v=[...h,d];return Tr(v),v}),d},[e]),o=se(c=>{s(p=>{const d=p.filter(h=>h.id!==c);return Tr(d),d})},[]),i=se(c=>{const p=n.find(d=>d.id===c);if(!p)return!1;t&&t(p);try{const d=new URL(window.location.href);d.searchParams.set("view",c),window.history.replaceState({},"",d.toString())}catch{}return!0},[n,t]),r=Me(()=>Lr(e),[e]),a=Me(()=>n.find(c=>Lr({tab:c.tab,range:c.range,tools:c.tools,density:c.density,theme:c.theme})===r)||null,[n,r]);return{views:n,saveView:l,deleteView:o,applyView:i,currentHash:r,matchingView:a}}const xc="aictl-cmdpalette-lru-v1",Mc=5;function Af(){try{const e=localStorage.getItem(xc),t=e?JSON.parse(e):[];return Array.isArray(t)?t.slice(0,Mc):[]}catch{return[]}}function Tf(e){try{localStorage.setItem(xc,JSON.stringify(e))}catch{}}function Lf(){const[e,t]=X(!1),[n,s]=X(Af),l=se(()=>t(!0),[]),o=se(()=>t(!1),[]),i=se(()=>t(a=>!a),[]),r=se(a=>{a&&s(c=>{const p=[a,...c.filter(d=>d!==a)].slice(0,Mc);return Tf(p),p})},[]);return ae(()=>{const a=c=>{(c.metaKey||c.ctrlKey)&&(c.key==="k"||c.key==="K")&&(c.preventDefault(),t(d=>!d))};return document.addEventListener("keydown",a),()=>document.removeEventListener("keydown",a)},[]),{isOpen:e,open:l,close:o,toggle:i,lru:n,recordUse:r}}const Df="sr-only",Pf="aictl-a11y-live",Of="aictl-a11y-live-assertive";function Rf(e,t){if(typeof document>"u")return null;let n=document.getElementById(e);return n||(n=document.createElement("div"),n.id=e,n.setAttribute("role","status"),n.setAttribute("aria-live",t),n.setAttribute("aria-atomic","true"),n.className=Df,document.body.appendChild(n)),n}function Dr(e,t="polite"){if(!e)return;const s=Rf(t==="assertive"?Of:Pf,t);s&&(s.textContent="",setTimeout(()=>{s.textContent=e},16))}let Us=null,Cc=null;if(typeof document<"u"){document.addEventListener("aictl:select-session",t=>{var n;Us=(n=t==null?void 0:t.detail)!=null&&n.sessionId?t.detail:null});const e=new URLSearchParams(window.location.search).get("session");e&&(Us={sessionId:e,tool:null})}function Vv(){const e=Us||Cc;return Us=null,e}function Fv(){Us=null}function Uv(e,t){Cc=e?{sessionId:e,tool:t||null}:null}const qs=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-desktop","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]),If={any:"Unattributed","claude-code":"Claude Code","claude-desktop":"Claude Desktop","codex-cli":"Codex CLI","gemini-cli":"Gemini CLI","copilot-cli":"Copilot CLI","copilot-desktop":"Copilot Desktop","copilot-vscode":"Copilot VS Code",copilot365:"Microsoft 365 Copilot"};function ds(e,t){var n,s;return((s=(n=t==null?void 0:t.tools)==null?void 0:n.find(l=>l.tool===e))==null?void 0:s.label)||If[e]||e}function Nf(e){var n,s;const t=e.live||{};return[t.session_count||0,(e.processes||[]).length,(((n=t.token_estimate)==null?void 0:n.input_tokens)||0)+(((s=t.token_estimate)==null?void 0:s.output_tokens)||0)]}function Ec(e){return e.map(t=>[Nf(t),t]).sort(([t,n],[s,l])=>s[0]-t[0]||s[1]-t[1]||s[2]-t[2]||String(n.label||n.tool).localeCompare(String(l.label||l.tool))).map(([,t])=>t)}function Hv(e){const t=new Map;for(const n of e)t.set(n.tool,(t.get(n.tool)||0)+1);return[...t.keys()].sort((n,s)=>t.get(s)-t.get(n)||n.localeCompare(s))}const Ac=new Set(["copilot365"]);function zf(e,t){var s,l,o;if(!e||(s=e.live)!=null&&s.session_count)return!1;const n=(o=(l=t==null?void 0:t.tool_configs)==null?void 0:l.find(i=>i.tool===e.tool))==null?void 0:o.local_data;return n&&Object.keys(n).length?Object.values(n).every(i=>!i):Ac.has(e.tool)&&!(e.files||[]).length&&!(e.processes||[]).length}function rs(e,t){return t!=null&&t.length?t.every(n=>{var l;const s=(l=e==null?void 0:e.tools)==null?void 0:l.find(o=>o.tool===n);return s?zf(s,e):Ac.has(n)}):!1}const Vf="Estimated from token counts and list prices. Not a billed amount.";function Ff(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/mac|iphone|ipad/i.test(e)}function jv(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/win/i.test(e)&&!/darwin/i.test(e)}function Tc(){return Ff()?"⌘K":"Ctrl+K"}/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lc=(...e)=>e.filter((t,n,s)=>!!t&&t.trim()!==""&&s.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pr=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uf=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,n,s)=>s?s.toUpperCase():n.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Or=e=>{const t=Uf(e);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Hf={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jf=Za({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),Bf=()=>xl(jf);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wf=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qf=({color:e,size:t,strokeWidth:n,absoluteStrokeWidth:s,children:l,iconNode:o,class:i="",...r})=>{const{size:a=24,strokeWidth:c=2,absoluteStrokeWidth:p=!1,color:d="currentColor",class:h=""}=Bf()??{},v=s??p?Number(n??c)*24/Number(t??a):n??c;return vn("svg",{...Hf,width:t??a??24,height:t??a??24,stroke:e??d,"stroke-width":v,class:Lc("lucide",h,i),...!l&&!Wf(r)&&{"aria-hidden":"true"},...r},[...o.map(([$,T])=>vn($,T)),...Is(l)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=(e,t)=>{const n=({class:s="",className:l="",children:o,...i})=>vn(qf,{...i,iconNode:t,class:Lc(`lucide-${Pr(Or(e))}`,`lucide-${Pr(e)}`,s,l)},o);return n.displayName=Or(e),n};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kf=Z("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gf=Z("archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yf=Z("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jf=Z("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zf=Z("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qf=Z("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xf=Z("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ep=Z("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tp=Z("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const np=Z("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sp=Z("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lp=Z("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const op=Z("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ip=Z("coins",[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rp=Z("command",[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3",key:"11bfej"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ap=Z("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cp=Z("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const up=Z("file-pen",[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dp=Z("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fp=Z("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pp=Z("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hp=Z("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mp=Z("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _p=Z("grid-3x3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vp=Z("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gp=Z("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yp=Z("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bp=Z("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $p=Z("menu",[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wp=Z("message-square",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kp=Z("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sp=Z("package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xp=Z("pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mp=Z("plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cp=Z("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ep=Z("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ap=Z("save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dc=Z("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tp=Z("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lp=Z("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dp=Z("sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pp=Z("trash-2",[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Op=Z("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rp=Z("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ip=Z("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Np=Z("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zp=Z("webhook",[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vp=Z("wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fp=Z("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Up=Z("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Hp={activity:Kf,"alert-triangle":Op,filter:pp,"eye-off":cp,archive:Gf,banknote:Yf,"bar-chart-3":ep,"book-open":Jf,bot:Zf,brain:Xf,"brain-circuit":Qf,"chevron-down":np,"chevron-right":sp,"clipboard-list":lp,clock:op,coins:ip,cpu:ap,"file-pen":up,"file-text":dp,folder:fp,"git-branch":hp,globe:mp,"grid-3x3":_p,layers:gp,"layout-dashboard":vp,"line-chart":tp,lock:yp,mail:bp,"message-square":wp,moon:kp,package:Sp,pen:xp,plug:Mp,radio:Cp,"refresh-cw":Ep,search:Dc,server:Tp,settings:Lp,sun:Dp,user:Rp,users:Ip,wallet:Np,webhook:zp,wrench:Vp,x:Fp,zap:Up};function Bt({name:e,size:t="1em",strokeWidth:n=2,...s}){if(!e)return null;const l=Hp[String(e)];return l?g`<${l} size=${t} strokeWidth=${n} aria-hidden="true" ...${s} />`:g`<span aria-hidden="true" ...${s}>${e}</span>`}function jp({tool:e,tools:t}){const n=(t||[e]).filter(Boolean).map(s=>s.label||s.tool).join(", ");return g`<div class="panel-state panel-state--withheld" role="status">
    <${Bt} name="radio" size="14"/>
    <div>
      <div class="panel-state__title">Not available from this machine</div>
      <div class="panel-state__hint">${n} runs in the vendor's cloud, so it leaves no local sessions, processes, tokens or files for aictl to read. Its activity is visible only in the vendor's admin reports.</div>
    </div>
  </div>`}const Bp=new Set(["overview","live","procs","events","explorer"]),Wp=3e4;function qp(e,t,{activeTab:n,now:s=Date.now()}){var r;const l={value:t,at:s,tab:n};return!e||Bp.has(n)||e.tab!==n||!!!((r=e.value)!=null&&r.snap)&&t.snap||!(e.value.enabledTools===t.enabledTools&&e.value.globalRange===t.globalRange&&e.value.openViewer===t.openViewer&&e.value.recentFiles===t.recentFiles)||s-e.at>=Wp?l:e}const Pc=new Set(["aictl","vscode","project-env"]);function Hs(e){return Array.isArray(e)}function Kp(e){return Array.isArray(e)&&e.length===0}function jt(e,t){return!Array.isArray(t)||!e||Pc.has(e)?!0:t.includes(e)}const Gp={copilot:["copilot","copilot-vscode"]};function Yp(e,t){const n=Gp[e==null?void 0:e.tool];return!n||!Array.isArray(t)?jt(e==null?void 0:e.tool,t):n.some(s=>t.includes(s))}function Bv(e){return Array.isArray(e)?"tools="+[...new Set(e)].sort().map(encodeURIComponent).join(","):""}function Rr(e){return Array.isArray(e)?"only:"+[...new Set(e)].sort().join(","):"all"}function Wv(e,t){const n=e==null?void 0:e.selection;return Array.isArray(t)?!n||n.all_tools||!Array.isArray(n.tools)?!1:Rr(n.tools)===Rr(t):!n||n.all_tools===!0}function Jp(e,t,n="tool"){return!Array.isArray(e)||!Array.isArray(t)?e:e.filter(s=>jt(s==null?void 0:s[n],t))}const Zp=new Set(["","unknown","any"]);function qv(e,t,n=s=>s){let s=0,l=0;for(const[o,i]of Object.entries(e||{})){const r=Number(n(i))||0;Array.isArray(t)?Zp.has(o)?l+=r:jt(o,t)&&(s+=r):s+=r}return{total:s,hidden:l}}function Qp(e){return!!e&&!Pc.has(e)&&!qs.has(e)}function Cs(e,t="tool"){return Array.isArray(e)?e.reduce((n,s)=>n+(Qp(s==null?void 0:s[t])?1:0),0):0}function Kv(e,t){return t&&e.includes(t)?t:e[0]??null}const Xp=["copilot","copilot-vscode","copilot-cli","copilot-desktop","copilot-jetbrains","copilot-vs"],eh=[["claude-",["claude-code","claude-desktop"]],["copilot-",Xp],["codex-",["codex-cli"]],["gemini-",["gemini","gemini-cli"]],["windsurf-",["windsurf"]],["cursor-",["cursor"]]];function th(e){if(e!=null&&e.tool)return[e.tool];const t=String((e==null?void 0:e.source)||""),n=eh.find(([s])=>t.startsWith(s));return n?n[1]:null}function nh(e,t){if(!Array.isArray(t))return!0;const n=th(e);return!n||n.some(s=>t.includes(s))}function sh(e,t){return Array.isArray(e)?e.map(n=>ds(n,t)):[]}function lh({count:e}){return e?g`<div class="panel-state panel-state--note" role="note" data-testid="filter-hidden-note">
    <${Bt} name="filter" size="12"/>
    <span>${e} row${e===1?"":"s"} from unattributed or unverified tools ${e===1?"is":"are"} hidden while the tool filter is on. Choose All tools to see ${e===1?"it":"them"}.</span>
  </div>`:null}function oh({path:e,at:t,onClose:n}){const{snap:s}=xl(zs),[l,o]=X(null),[i,r]=X(!1),[a,c]=X(null),p=J(null),d=J(null),[h,v]=X(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),$=J(!1),T=J(0),w=J(0),x=se(L=>{$.current=!0,T.current=L.clientX,w.current=h,L.preventDefault()},[h]);if(ae(()=>{const L=z=>{if(!$.current)return;const I=T.current-z.clientX,P=window.innerWidth,Y=Math.min(90,Math.max(20,w.current+I/P*100));v(Y)},D=()=>{if($.current){$.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(h)))}catch{}}};return window.addEventListener("mousemove",L),window.addEventListener("mouseup",D),()=>{window.removeEventListener("mousemove",L),window.removeEventListener("mouseup",D)}},[h]),ae(()=>{if(!e)return;d.current=document.activeElement;const L=setTimeout(()=>{var I;const z=(I=p.current)==null?void 0:I.querySelector("button");z&&z.focus()},50),D=z=>{if(z.key!=="Tab"||!p.current)return;const I=p.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!I.length)return;const P=I[0],Y=I[I.length-1];z.shiftKey&&document.activeElement===P?(z.preventDefault(),Y.focus()):!z.shiftKey&&document.activeElement===Y&&(z.preventDefault(),P.focus())};return document.addEventListener("keydown",D),()=>{clearTimeout(L),document.removeEventListener("keydown",D),d.current&&d.current.focus&&d.current.focus()}},[e]),ae(()=>{if(!e)return;r(!1),c(null),o(null),(t?qd(e,t):Wd(e)).then(o).catch(D=>c(D.message))},[e,t]),!e)return null;const b=Me(()=>{if(!s)return"";for(const L of s.tools)for(const D of L.files)if(D.path===e)return(D.kind||"")+" | "+Ht(D.size)+" | ~"+vt(D.tokens)+"tok | scope:"+(D.scope||"?")+" | sent_to_llm:"+(D.sent_to_llm||"?")+" | loaded:"+(D.loaded_when||"?");for(const L of s.agent_memory)if(L.file===e)return L.source+" | "+L.profile+" | "+L.tokens+"tok | "+L.lines+"ln";return""},[s,e]),C=l?l.split(`
`):[],M=C.length,S=M>es*2,E=(L,D)=>L.map((z,I)=>g`<div class="fv-line"><span class="fv-ln">${D+I}</span><span class="fv-code">${is(z)||" "}</span></div>`);return g`<div class="fv" ref=${p} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+h+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${x}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      ${t&&g`<span class="badge text-xs mono" style="background:var(--bg2);color:var(--fg2);margin-left:var(--sp-2)"
        title=${"Historical content at unix ts "+t}>@ ${new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>`}
      <button onClick=${n} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${b}</div>
    <div class="fv-body">
      ${a?g`<p class="text-red" style="padding:var(--sp-10)">${a}</p>`:l?!S||i?g`<div class="fv-lines">${E(C,1)}</div>`:g`<div class="fv-lines">${E(C.slice(0,es),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>r(!0)}>\u25BC ${M-es*2} more lines \u25BC</div>
            <div class="fv-lines">${E(C.slice(-es),M-es+1)}</div>`:g`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${M} lines${S&&!i?" (showing "+es*2+" of "+M+")":""}</span>
      ${S&&g`<button onClick=${()=>r(!i)}>${i?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function hn({variant:e="secondary",size:t="md",loading:n=!1,disabled:s=!1,type:l="button",onClick:o,class:i,className:r,children:a,...c}){const p=["aictl-ui-btn",`aictl-ui-btn--${e}`,t==="sm"?"aictl-ui-btn--sm":null,i,r].filter(Boolean).join(" "),d=s||n;return g`<button
    type=${l}
    class=${p}
    disabled=${d}
    aria-busy=${n?"true":null}
    onClick=${d?void 0:o}
    ...${c}
  >${n?g`<span class="aictl-ui-btn__spinner" aria-hidden="true"></span>`:null}${a}</button>`}function Ir({variant:e="neutral",size:t="sm",dot:n=!1,class:s,className:l,children:o,...i}){const r=["aictl-ui-badge",`aictl-ui-badge--${e}`,t==="md"?"aictl-ui-badge--md":null,s,l].filter(Boolean).join(" ");return g`<span class=${r} ...${i}>
    ${n?g`<span class="aictl-ui-badge__dot" aria-hidden="true"></span>`:null}
    ${o}
  </span>`}function ih(e,t,n){let l=0,o=0;switch(n){case"top":l=e.top-t.height-6,o=e.left+(e.width-t.width)/2;break;case"bottom":l=e.bottom+6,o=e.left+(e.width-t.width)/2;break;case"left":l=e.top+(e.height-t.height)/2,o=e.left-t.width-6;break;case"right":default:l=e.top+(e.height-t.height)/2,o=e.right+6;break}const i=window.innerWidth,r=window.innerHeight;return o=Math.max(4,Math.min(o,i-t.width-4)),l=Math.max(4,Math.min(l,r-t.height-4)),{top:l,left:o}}function Nr({content:e,placement:t="top",open:n,onOpenChange:s,children:l,class:o,className:i,...r}){const[a,c]=X(!1),p=n!==void 0?n:a,d=se(M=>{n===void 0&&c(M),s&&s(M)},[n,s]),h=J(null),v=J(null),$=fd(),[T,w]=X({top:-9999,left:-9999});ae(()=>{if(!p)return;const M=h.current,S=v.current;if(!M||!S)return;const E=()=>w(ih(M.getBoundingClientRect(),S.getBoundingClientRect(),t));return E(),window.addEventListener("scroll",E,!0),window.addEventListener("resize",E),()=>{window.removeEventListener("scroll",E,!0),window.removeEventListener("resize",E)}},[p,t,e]);const x=()=>d(!0),b=()=>d(!1),C=["aictl-ui-tooltip-wrap",o,i].filter(Boolean).join(" ");return g`<span
    ref=${h}
    class=${C}
    onMouseEnter=${x}
    onMouseLeave=${b}
    onFocusIn=${x}
    onFocusOut=${b}
    aria-describedby=${p?$:null}
    ...${r}
  >
    ${l}
    ${p?g`<span
      ref=${v}
      id=${$}
      role="tooltip"
      class="aictl-ui-tooltip"
      style=${`top:${T.top}px;left:${T.left}px`}
    >${e}</span>`:null}
  </span>`}function rh(e,t,n){let l=0,o=0;switch(n){case"top":l=e.top-t.height-6,o=e.left;break;case"left":l=e.top,o=e.left-t.width-6;break;case"right":l=e.top,o=e.right+6;break;case"bottom":default:l=e.bottom+6,o=e.left;break}const i=window.innerWidth,r=window.innerHeight;return o=Math.max(4,Math.min(o,i-t.width-4)),l=Math.max(4,Math.min(l,r-t.height-4)),{top:l,left:o}}const zr='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function gl({trigger:e,placement:t="bottom",open:n,onOpenChange:s,children:l,class:o,className:i,...r}){const[a,c]=X(!1),p=n!==void 0?n:a,d=se(b=>{n===void 0&&c(b),s&&s(b)},[n,s]),h=J(null),v=J(null),[$,T]=X({top:-9999,left:-9999});ae(()=>{if(!p)return;const b=h.current,C=v.current;if(!b||!C)return;const M=()=>T(rh(b.getBoundingClientRect(),C.getBoundingClientRect(),t));M();const S=D=>{!C.contains(D.target)&&!b.contains(D.target)&&d(!1)},E=D=>{if(D.key==="Escape"){d(!1),b.focus&&b.focus();return}if(D.key==="Tab"){const z=C.querySelectorAll(zr);if(!z.length)return;const I=z[0],P=z[z.length-1];D.shiftKey&&document.activeElement===I?(D.preventDefault(),P.focus()):!D.shiftKey&&document.activeElement===P&&(D.preventDefault(),I.focus())}};document.addEventListener("mousedown",S),document.addEventListener("keydown",E),window.addEventListener("resize",M);const L=C.querySelector(zr);return L?L.focus():C.focus(),()=>{document.removeEventListener("mousedown",S),document.removeEventListener("keydown",E),window.removeEventListener("resize",M)}},[p,t,d]);const w=b=>{b.stopPropagation(),d(!p)},x=["aictl-ui-popover",o,i].filter(Boolean).join(" ");return g`<span style="display:inline-flex;position:relative" ...${r}>
    <span ref=${h} onClick=${w}>${e}</span>
    ${p?g`<div
      ref=${v}
      class=${x}
      role="dialog"
      tabindex="-1"
      style=${`top:${$.top}px;left:${$.left}px`}
    >${l}</div>`:null}
  </span>`}const Vr='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function fs({open:e,onClose:t,ariaLabel:n,labelledBy:s,children:l,closeOnBackdrop:o=!0,class:i,className:r,...a}){const c=J(null),p=J(null),d=se(()=>{t&&t()},[t]);if(ae(()=>{if(!e)return;p.current=document.activeElement;const $=c.current;if(!$)return;($.querySelector(Vr)||$).focus();const w=x=>{if(x.key==="Escape"){x.stopPropagation(),d();return}if(x.key==="Tab"){const b=$.querySelectorAll(Vr);if(!b.length){x.preventDefault();return}const C=b[0],M=b[b.length-1];x.shiftKey&&document.activeElement===C?(x.preventDefault(),M.focus()):!x.shiftKey&&document.activeElement===M&&(x.preventDefault(),C.focus())}};return document.addEventListener("keydown",w),()=>{document.removeEventListener("keydown",w),p.current&&p.current.focus&&p.current.focus()}},[e,d]),!e)return null;const h=$=>{o&&$.target===$.currentTarget&&d()},v=["aictl-ui-dialog",i,r].filter(Boolean).join(" ");return g`<div class="aictl-ui-dialog-backdrop" onMouseDown=${h}>
    <div
      ref=${c}
      class=${v}
      role="dialog"
      aria-modal="true"
      aria-label=${n||null}
      aria-labelledby=${s||null}
      tabindex="-1"
      ...${a}
    >${l}</div>
  </div>`}function ah({options:e=[],value:t,onChange:n,ariaLabel:s,class:l,className:o,...i}){const r=["aictl-ui-segmented",l,o].filter(Boolean).join(" "),a=J([]),c=p=>{var v;if(!e.length)return;const d=Math.max(0,e.findIndex($=>$.value===t));let h=null;p.key==="ArrowRight"||p.key==="ArrowDown"?h=(d+1)%e.length:p.key==="ArrowLeft"||p.key==="ArrowUp"?h=(d-1+e.length)%e.length:p.key==="Home"?h=0:p.key==="End"&&(h=e.length-1),h!=null&&(p.preventDefault(),n&&n(e[h].value),(v=a.current[h])==null||v.focus())};return g`<div
    class=${r}
    role="radiogroup"
    aria-label=${s||null}
    ...${i}
  >${e.map((p,d)=>{const h=p.value===t;return g`<button
      key=${p.value}
      ref=${v=>{a.current[d]=v}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${h?"true":"false"}
      tabindex=${h?"0":"-1"}
      onClick=${()=>n&&n(p.value)}
      onKeyDown=${c}
    >${p.icon?g`<${Bt} name=${p.icon} size="0.9em"/>`:null}${p.label}</button>`})}</div>`}function ot({class:e,className:t,children:n,...s}){const l=["aictl-ui-kbd",e,t].filter(Boolean).join(" ");return g`<kbd class=${l} ...${s}>${n}</kbd>`}function Oc({icon:e,title:t,description:n,action:s,source:l,class:o,className:i,...r}){const a=["aictl-ui-empty",o,i].filter(Boolean).join(" ");return g`<div class=${a} role="status" ...${r}>
    ${e?g`<div class="aictl-ui-empty__icon">
      ${typeof e=="string"?g`<${Bt} name=${e} size="32"/>`:e}
    </div>`:null}
    ${t?g`<div class="aictl-ui-empty__title">${t}</div>`:null}
    ${n?g`<div class="aictl-ui-empty__desc">${n}</div>`:null}
    ${s?g`<div>${s}</div>`:null}
    ${l?g`<div class="aictl-ui-empty__source" title="Data source for this view">${l}</div>`:null}
  </div>`}function as({height:e="1em",width:t="100%",radius:n="4px",count:s=1,class:l,className:o,style:i,...r}){const a=["aictl-ui-skel",l,o].filter(Boolean).join(" "),c={height:e,width:t,borderRadius:n};if(s<=1)return g`<span class=${a} style=${{...c,...i||{}}} aria-hidden="true" ...${r}></span>`;const p=[];for(let d=0;d<s;d++)p.push(d);return g`<span style="display:flex;flex-direction:column;gap:var(--sp-2)" aria-hidden="true" ...${r}>
    ${p.map(d=>g`<span key=${d} class=${a} style=${{...c,...i||{}}}></span>`)}
  </span>`}const ch=window.TOOL_VENDORS??{},uh={"claude-code":"anthropic","claude-desktop":"anthropic","claude-mcp-memory":"anthropic",copilot:"github","copilot-vscode":"github","copilot-cli":"github","copilot-desktop":"github","copilot-jetbrains":"github","copilot-vs":"github",copilot365:"microsoft","codex-cli":"openai","chatgpt-desktop":"openai","chatgpt-lencx":"openai",gemini:"google","gemini-cli":"google",cursor:"cursor-inc",windsurf:"codeium",openclaw:"community",vscode:"microsoft"},Fr={anthropic:'<path d="M12 4.5V19.5"/><path d="M4.5 12H19.5"/><path d="M6.7 6.7 17.3 17.3"/><path d="M17.3 6.7 6.7 17.3"/>',github:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',microsoft:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',openai:'<path d="M12 3.2 19.6 7.6V16.4L12 20.8 4.4 16.4V7.6Z" fill="none"/>',google:'<path d="M12 3.2C12 8 16 12 20.8 12C16 12 12 16 12 20.8C12 16 8 12 3.2 12C8 12 12 8 12 3.2Z" stroke="none" fill="currentColor"/>',"cursor-inc":'<path d="M6 3.5 6 18 10 14 12.6 19.5 15 18.4 12.4 13 18 13Z" fill="none" stroke-linejoin="round"/>',codeium:'<path d="M11.5 4 16 12.5H11.5Z" stroke="none" fill="currentColor"/><path d="M4 16C7 12.5 9.5 12.5 12 16 14.5 19.5 17 19.5 20 16" fill="none" stroke-linecap="round"/>',community:'<path d="M17 4.5C10 5.5 5.5 9.5 5.5 13.5 5.5 17 8 19.5 11.5 19.5" fill="none" stroke-linecap="round"/><path d="M17 4.5 13.5 6M17 4.5 18.8 7.8" stroke-linecap="round"/>',_fallback:'<circle cx="12" cy="12" r="4.5" stroke="none" fill="currentColor"/>'};function dh(e){return ch[e]||uh[e]||""}function El({tool:e,size:t="1em",strokeWidth:n=2,...s}){const l=dh(e),o=Fr[l]||Fr._fallback,i=ss[e]||"var(--fg2)";return g`<svg class="tool-ico" viewBox="0 0 24 24" width=${t} height=${t}
    fill="none" stroke="currentColor" stroke-width=${n} stroke-linecap="round"
    style=${"color:"+i} aria-hidden="true" ...${s}
    dangerouslySetInnerHTML=${{__html:o}}></svg>`}const Po=new Set;let fh=0;const fo=3,ph=5e3;function Rc(e){Po.forEach(t=>{try{t(e)}catch{}})}function hh(e){return Po.add(e),()=>Po.delete(e)}function po(e,t,n={}){const s=++fh;return Rc({type:"add",toast:{id:s,variant:e,message:t,ttl:n.ttl||ph}}),s}function Ic(e){Rc({type:"remove",id:e})}const Oo={success:(e,t)=>po("success",e,t),error:(e,t)=>po("error",e,t),info:(e,t)=>po("info",e,t),dismiss:Ic};function mh(){const[e,t]=X([]),n=J(new Map);ae(()=>{const o=n.current,i=a=>{const c=o.get(a);c!=null&&c.tid&&clearTimeout(c.tid),o.delete(a)},r=hh(a=>{if(a.type==="add"){t(p=>{const d=[...p,a.toast];return d.length>fo?(d.slice(0,d.length-fo).forEach(h=>i(h.id)),d.slice(d.length-fo)):d});const c=setTimeout(()=>{t(p=>p.filter(d=>d.id!==a.toast.id)),o.delete(a.toast.id)},a.toast.ttl);o.set(a.toast.id,{tid:c,expiresAt:Date.now()+a.toast.ttl,remaining:null})}else a.type==="remove"&&(i(a.id),t(c=>c.filter(p=>p.id!==a.id)))});return()=>{r(),o.forEach(a=>{a.tid&&clearTimeout(a.tid)}),o.clear()}},[]);const s=se(o=>{const r=n.current.get(o);!r||r.tid==null||(clearTimeout(r.tid),r.tid=null,r.remaining=Math.max(500,r.expiresAt-Date.now()))},[]),l=se(o=>{const i=n.current,r=i.get(o);if(!r||r.tid!=null)return;const a=r.remaining??500;r.expiresAt=Date.now()+a,r.remaining=null,r.tid=setTimeout(()=>{t(c=>c.filter(p=>p.id!==o)),i.delete(o)},a)},[]);return e.length?g`<div class="aictl-ui-toast-stack" role="region" aria-label="Notifications">
    ${e.map(o=>g`<div
      key=${o.id}
      class=${`aictl-ui-toast aictl-ui-toast--${o.variant}`}
      role=${o.variant==="error"?"alert":"status"}
      onMouseEnter=${()=>s(o.id)}
      onMouseLeave=${()=>l(o.id)}
      onFocusIn=${()=>s(o.id)}
      onFocusOut=${()=>l(o.id)}
    >
      <span class="aictl-ui-toast__msg">${o.message}</span>
      <button type="button" class="aictl-ui-toast__dismiss"
        aria-label="Dismiss notification"
        onClick=${()=>Ic(o.id)}>×</button>
    </div>`)}
  </div>`:null}const _h={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"},vh={error:"var(--red)",warning:"var(--orange)"},Ur=20;function Hr(e,t,n){const s=t==="cpu_percent"?"daemon_cpu_percent":"daemon_"+t,l=["daemon "+n(e[s]||0)];for(const o of e.children||[])l.push(o.name+" ("+o.pid+") "+n(o[t]||0));return l.join(" + ")}function jr(){var w,x,b,C,M;const{snap:e}=xl(zs),[t,n]=X(null),[s,l]=X(null),[o,i]=X(null),[r,a]=X(null);ae(()=>{let S=!0;const E=()=>{cc().then(D=>{S&&n(D)}).catch(()=>{}),uc().then(D=>{S&&l(D)}).catch(()=>{}),dc({limit:Ur}).then(D=>{S&&i(Array.isArray(D==null?void 0:D.items)?D.items:[])}).catch(()=>{}),Ld().then(D=>{S&&a(Array.isArray(D==null?void 0:D.ingesters)?D.ingesters:[])}).catch(()=>{})};E();const L=setInterval(E,15e3);return()=>{S=!1,clearInterval(L)}},[]);const c=Me(()=>{if(!e)return[];const S=e.tool_telemetry||[];return e.tools.filter(E=>E.tool!=="aictl"&&E.tool!=="any").map(E=>{var Y,U,K,W,N;const L=S.find(V=>V.tool===E.tool),D=E.live||{},z=D.last_seen_at||0,I=z>0?Math.floor(Date.now()/1e3-z):-1,P=I>3600||I<0;return{tool:E.tool,label:E.label,source:(L==null?void 0:L.source)||(D.session_count?"live-monitor":"discovery"),confidence:(L==null?void 0:L.confidence)||((Y=D.token_estimate)==null?void 0:Y.confidence)||0,inputTokens:(L==null?void 0:L.input_tokens)||0,outputTokens:(L==null?void 0:L.output_tokens)||0,cost:(L==null?void 0:L.cost_usd)??null,sessions:(L==null?void 0:L.total_sessions)||D.session_count||0,errors:((U=L==null?void 0:L.errors)==null?void 0:U.length)||0,lastError:((K=L==null?void 0:L.errors)==null?void 0:K[0])||null,lastSeen:I,stale:P,fileCount:E.files.length,procCount:E.processes.length,hasLive:!!E.live,hasOtel:!!((N=(W=D.sources||[]).includes)!=null&&N.call(W,"otel"))}}).sort((E,L)=>L.inputTokens+L.outputTokens-(E.inputTokens+E.outputTokens))},[e]),p=Me(()=>{var S;return(S=e==null?void 0:e.live_monitor)!=null&&S.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([E,L])=>({name:E,status:L.status||"unknown",mode:L.mode||"",detail:L.detail||""})):[]},[e]);if(!e)return null;const d=c.length,h=c.filter(S=>S.inputTokens+S.outputTokens>0).length,v=c.filter(S=>S.hasLive).length,$=c.filter(S=>S.stale&&S.hasLive).length,T=c.reduce((S,E)=>S+E.errors,0);return g`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--on-status)">${h}/${d} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--on-status)">${v} live</span>
      ${$>0?g`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--on-status)">${$} stale</span>`:null}
      ${T>0?g`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--on-status)">${T} errors</span>`:null}
      ${t!=null&&t.active?g`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--on-status)">OTel active</span>`:g`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${s?g`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">aictl Monitor Service <span class="text-muted text-xs">(self)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">CPU</div>
          <div class="metric-chip-value" title=${Hr(s,"cpu_percent",Pn)}>${Pn(s.cpu_percent||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Memory (RSS)</div>
          <div class="metric-chip-value" title=${Hr(s,"memory_rss_bytes",Ht)}>${Ht(s.memory_rss_bytes||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Size</div>
          <div class="metric-chip-value">${Ht(((w=s.db)==null?void 0:w.file_size_bytes)||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Uptime</div>
          <div class="metric-chip-value">${Qo(s.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${s.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${vt((((x=s.db)==null?void 0:x.metrics_count)||0)+(((b=s.db)==null?void 0:b.tool_metrics_count)||0)+(((C=s.db)==null?void 0:C.events_count)||0)+(((M=s.db)==null?void 0:M.samples_count)||0))}</div>
        </div>
      </div>
      ${s.sink?g`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Emitted</div>
          <div class="metric-chip-value">${vt(s.sink.total_emitted||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Flushed</div>
          <div class="metric-chip-value">${vt(s.sink.total_flushed||0)}</div>
        </div>
        <div class="metric-chip" style="${(s.sink.total_dropped||0)>0?"background:rgba(248,113,113,0.15);border:1px solid var(--red)":""}">
          <div class="metric-chip-label" style="${(s.sink.total_dropped||0)>0?"color:var(--red);font-weight:600":"color:var(--fg2)"}">Dropped</div>
          <div class="metric-chip-value" style="${(s.sink.total_dropped||0)>0?"color:var(--red)":""}">${vt(s.sink.total_dropped||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Tracked</div>
          <div class="metric-chip-value">${vt(s.sink.metrics_tracked||0)}</div>
        </div>
      </div>
      ${s.sink.is_flooding?g`<div role="alert" style="margin-top:var(--sp-2);padding:var(--sp-2) var(--sp-3);background:rgba(248,113,113,0.15);border:1px solid var(--red);border-radius:4px;color:var(--red);font-size:var(--fs-xs);font-weight:600">
        DATA LOSS: Flood protection active \u2014 dropping samples (>${s.sink.total_dropped} lost)
      </div>`:null}`:null}
      <div class="text-xs text-muted" style="margin-top:var(--sp-1)">
        PID ${s.pid} \u00b7 These metrics are about the aictl monitoring service itself, not the AI tools it monitors.
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
        ${t.last_receive_at>0?g`<span class="text-muted">Last: ${ll(t.last_receive_at)}</span>`:null}
      </div>
    </div>`:null}

    <!-- Local-store ingesters (copilot / cursor / vscode chat pollers) -->
    ${r!=null?g`<div class="mb-md" data-dp="overview.collector_health.ingesters">
      <div class="es-section-title">Ingesters</div>
      ${r.length===0?g`<div class="text-xs text-muted">No ingesters running</div>`:r.map(S=>{const E=S.last_poll_ts?ll(S.last_poll_ts):"never polled";return g`<div key=${S.name}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span aria-hidden="true"
                title=${S.source_exists?"source present":"source missing"}
                style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${S.source_exists?"var(--green)":"var(--fg2)"}"></span>
              <span class="mono text-xs" style="min-width:170px" title=${S.source_path||""}>${is(S.name)}</span>
              <span class="sr-only">${S.source_exists?"source present":"source missing"}</span>
              <span class="text-xs text-muted" title="last poll" style="min-width:80px">${E}</span>
              <span class="text-xs" style="margin-left:auto"
                title="rows inserted on the last poll">+${S.last_poll_inserted||0} rows</span>
              ${S.rows_ingested_total!=null?g`<span class="text-xs text-muted" title="cumulative rows ingested">${vt(S.rows_ingested_total)} total</span>`:null}
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
          <tbody>${c.map(S=>{var E;return g`<tr key=${S.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${S.stale&&!S.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <${El} tool=${S.tool} size="1em"/>
              ${is(S.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${S.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${S.confidence>=.9?"var(--green)":S.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${S.confidence>0?Pn(S.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.inputTokens?vt(S.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.outputTokens?vt(S.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${S.errors>0?g`<span class="text-red" title=${((E=S.lastError)==null?void 0:E.message)||""}>${S.errors}</span>`:g`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${S.lastSeen>=0?g`<span style="color:${S.stale?"var(--orange)":"var(--fg2)"}">${ll(Date.now()/1e3-S.lastSeen)}</span>`:g`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Data-quality events (sink flood-protection, ingester failures, …) -->
    ${o!=null?g`<div class="mb-md" data-dp="overview.collector_health.data_quality">
      <div class="es-section-title">Data Quality</div>
      ${o.length===0?g`<div class="text-xs text-muted">No data-quality events</div>`:o.slice(0,Ur).map((S,E)=>{const L=vh[S.severity]||"var(--fg2)",D=[S.component,S.source].filter(Boolean).join(" · ");return g`<div key=${(S.component||"")+":"+(S.source||"")+":"+E}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span class="badge" style="background:${L};color:var(--on-status);font-size:var(--fs-2xs)">
                ${S.severity||S.status||"info"}</span>
              <span class="mono text-xs" style="white-space:nowrap" title=${"kind: "+(S.kind||"—")+" · status: "+(S.status||"—")+(S.count?" · seen "+S.count+"x":"")}>${D||"—"}</span>
              <span class="text-xs" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                title=${S.message||""}>${S.message||"—"}</span>
              <span class="text-xs text-muted" style="white-space:nowrap">${ll(S.updated_at)}</span>
            </div>`})}
    </div>`:null}

    <!-- Collector pipeline status -->
    ${p.length>0?g`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${p.map(S=>g`<div key=${S.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${_h[S.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${S.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${S.status}</span>
          </div>
          ${S.detail?g`<div class="text-xs text-muted" style="margin-top:2px">${is(S.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let ho=null;function gh(){return ho?Promise.resolve(ho):Od().then(e=>{const t={};for(const n of e||[])t[n.key]=n;return ho=t,t}).catch(()=>({}))}function yh(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),n=t.match(/^[^.!?]+[.!?]/);return n?n[0].trim():t.slice(0,120)}const bh={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},$h={raw:"raw",deduced:"deduced",aggregated:"agg"};function wh(){const[e,t]=X(null),[n,s]=X({x:0,y:0}),[l,o]=X(!1),i=J(null),r=J(null),a=se(w=>{const x=w.getAttribute("data-dp");x&&gh().then(b=>{const C=b[x];if(!C)return;const M=w.getBoundingClientRect();s({x:M.left,y:M.bottom+4}),t(C),o(!1)})},[]),c=se(()=>{r.current=setTimeout(()=>{t(null),o(!1)},120)},[]),p=se(()=>{r.current&&(clearTimeout(r.current),r.current=null)},[]);if(ae(()=>{function w(C){const M=C.target.closest("[data-dp]");M&&(p(),a(M))}function x(C){C.target.closest("[data-dp]")&&c()}function b(C){C.target.closest("[data-dp]")&&e&&(C.preventDefault(),o(S=>!S))}return document.addEventListener("mouseover",w,!0),document.addEventListener("mouseout",x,!0),document.addEventListener("click",b,!0),document.addEventListener("focusin",w,!0),document.addEventListener("focusout",x,!0),()=>{document.removeEventListener("mouseover",w,!0),document.removeEventListener("mouseout",x,!0),document.removeEventListener("click",b,!0),document.removeEventListener("focusin",w,!0),document.removeEventListener("focusout",x,!0)}},[a,c,p,e]),!e)return null;const h=Math.min(n.x,window.innerWidth-320-8),v=Math.min(n.y,window.innerHeight-180),$=$h[e.source_type]||e.source_type,T=bh[e.unit]||e.unit;return g`<div class="dp-tooltip" ref=${i}
    style=${"left:"+h+"px;top:"+v+"px"}
    onMouseEnter=${p} onMouseLeave=${c}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${$}</span>
      ${T&&g`<span class="dp-tooltip-unit">${T}</span>`}
    </div>
    <div class="dp-tooltip-body">${yh(e.explanation)}</div>
    ${l&&g`<div class="dp-tooltip-detail">
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
    ${!l&&g`<div class="dp-tooltip-hint">click for details</div>`}
  </div>`}class Br extends Xt{constructor(t){super(t),this.state={hasError:!1,error:null}}static getDerivedStateFromError(t){return{hasError:!0,error:t}}componentDidCatch(t,n){console.error("Dashboard error:",t,n);try{Oo.error("Something went wrong in this view")}catch{}}render(){var t;if(this.state.hasError){const n=((t=this.state.error)==null?void 0:t.message)||"Unknown error";return g`<div role="alert">
        <${Oc}
          icon="alert-triangle"
          title="Something went wrong"
          description=${n}
          action=${g`<${hn} variant="primary" onClick=${()=>this.setState({hasError:!1,error:null})}>Retry</${hn}>`}
        />
      </div>`}return this.props.children}}const kh=!0,We="u-",Sh="uplot",xh=We+"hz",Mh=We+"vt",Ch=We+"title",Eh=We+"wrap",Ah=We+"under",Th=We+"over",Lh=We+"axis",Ln=We+"off",Dh=We+"select",Ph=We+"cursor-x",Oh=We+"cursor-y",Rh=We+"cursor-pt",Ih=We+"legend",Nh=We+"live",zh=We+"inline",Vh=We+"series",Fh=We+"marker",Wr=We+"label",Uh=We+"value",Ts="width",Ls="height",Es="top",qr="bottom",ts="left",mo="right",ni="#000",Kr=ni+"0",_o="mousemove",Gr="mousedown",vo="mouseup",Yr="mouseenter",Jr="mouseleave",Zr="dblclick",Hh="resize",jh="scroll",Qr="change",yl="dppxchange",si="--",vs=typeof window<"u",Ro=vs?document:null,cs=vs?window:null,Bh=vs?navigator:null;let ve,ol;function Io(){let e=devicePixelRatio;ve!=e&&(ve=e,ol&&zo(Qr,ol,Io),ol=matchMedia(`(min-resolution: ${ve-.001}dppx) and (max-resolution: ${ve+.001}dppx)`),On(Qr,ol,Io),cs.dispatchEvent(new CustomEvent(yl)))}function wt(e,t){if(t!=null){let n=e.classList;!n.contains(t)&&n.add(t)}}function No(e,t){let n=e.classList;n.contains(t)&&n.remove(t)}function Te(e,t,n){e.style[t]=n+"px"}function Vt(e,t,n,s){let l=Ro.createElement(e);return t!=null&&wt(l,t),n!=null&&n.insertBefore(l,s),l}function Dt(e,t){return Vt("div",e,t)}const Xr=new WeakMap;function Qt(e,t,n,s,l){let o="translate("+t+"px,"+n+"px)",i=Xr.get(e);o!=i&&(e.style.transform=o,Xr.set(e,o),t<0||n<0||t>s||n>l?wt(e,Ln):No(e,Ln))}const ea=new WeakMap;function ta(e,t,n){let s=t+n,l=ea.get(e);s!=l&&(ea.set(e,s),e.style.background=t,e.style.borderColor=n)}const na=new WeakMap;function sa(e,t,n,s){let l=t+""+n,o=na.get(e);l!=o&&(na.set(e,l),e.style.height=n+"px",e.style.width=t+"px",e.style.marginLeft=s?-t/2+"px":0,e.style.marginTop=s?-n/2+"px":0)}const li={passive:!0},Wh={...li,capture:!0};function On(e,t,n,s){t.addEventListener(e,n,s?Wh:li)}function zo(e,t,n,s){t.removeEventListener(e,n,li)}vs&&Io();function Ft(e,t,n,s){let l;n=n||0,s=s||t.length-1;let o=s<=2147483647;for(;s-n>1;)l=o?n+s>>1:kt((n+s)/2),t[l]<e?n=l:s=l;return e-t[n]<=t[s]-e?n:s}function Nc(e){return(n,s,l)=>{let o=-1,i=-1;for(let r=s;r<=l;r++)if(e(n[r])){o=r;break}for(let r=l;r>=s;r--)if(e(n[r])){i=r;break}return[o,i]}}const zc=e=>e!=null,Vc=e=>e!=null&&e>0,Al=Nc(zc),qh=Nc(Vc);function Kh(e,t,n,s=0,l=!1){let o=l?qh:Al,i=l?Vc:zc;[t,n]=o(e,t,n);let r=e[t],a=e[t];if(t>-1)if(s==1)r=e[t],a=e[n];else if(s==-1)r=e[n],a=e[t];else for(let c=t;c<=n;c++){let p=e[c];i(p)&&(p<r?r=p:p>a&&(a=p))}return[r??$e,a??-$e]}function Tl(e,t,n,s){let l=ia(e),o=ia(t);e==t&&(l==-1?(e*=n,t/=n):(e/=n,t*=n));let i=n==10?ln:Fc,r=l==1?kt:Pt,a=o==1?Pt:kt,c=r(i(Be(e))),p=a(i(Be(t))),d=ps(n,c),h=ps(n,p);return n==10&&(c<0&&(d=we(d,-c)),p<0&&(h=we(h,-p))),s||n==2?(e=d*l,t=h*o):(e=Bc(e,d),t=Ll(t,h)),[e,t]}function oi(e,t,n,s){let l=Tl(e,t,n,s);return e==0&&(l[0]=0),t==0&&(l[1]=0),l}const ii=.1,la={mode:3,pad:ii},Os={pad:0,soft:null,mode:0},Gh={min:Os,max:Os};function bl(e,t,n,s){return Dl(n)?oa(e,t,n):(Os.pad=n,Os.soft=s?0:null,Os.mode=s?3:0,oa(e,t,Gh))}function me(e,t){return e??t}function Yh(e,t,n){for(t=me(t,0),n=me(n,e.length-1);t<=n;){if(e[t]!=null)return!0;t++}return!1}function oa(e,t,n){let s=n.min,l=n.max,o=me(s.pad,0),i=me(l.pad,0),r=me(s.hard,-$e),a=me(l.hard,$e),c=me(s.soft,$e),p=me(l.soft,-$e),d=me(s.mode,0),h=me(l.mode,0),v=t-e,$=ln(v),T=dt(Be(e),Be(t)),w=ln(T),x=Be(w-$);(v<1e-24||x>10)&&(v=0,(e==0||t==0)&&(v=1e-24,d==2&&c!=$e&&(o=0),h==2&&p!=-$e&&(i=0)));let b=v||T||1e3,C=ln(b),M=ps(10,kt(C)),S=b*(v==0?e==0?.1:1:o),E=we(Bc(e-S,M/10),24),L=e>=c&&(d==1||d==3&&E<=c||d==2&&E>=c)?c:$e,D=dt(r,E<L&&e>=L?L:Ut(L,E)),z=b*(v==0?t==0?.1:1:i),I=we(Ll(t+z,M/10),24),P=t<=p&&(h==1||h==3&&I>=p||h==2&&I<=p)?p:-$e,Y=Ut(a,I>P&&t<=P?P:dt(P,I));return D==Y&&D==0&&(Y=100),[D,Y]}const Jh=new Intl.NumberFormat(vs?Bh.language:"en-US"),ri=e=>Jh.format(e),St=Math,fl=St.PI,Be=St.abs,kt=St.floor,je=St.round,Pt=St.ceil,Ut=St.min,dt=St.max,ps=St.pow,ia=St.sign,ln=St.log10,Fc=St.log2,Zh=(e,t=1)=>St.sinh(e)*t,go=(e,t=1)=>St.asinh(e/t),$e=1/0;function ra(e){return(ln((e^e>>31)-(e>>31))|0)+1}function Vo(e,t,n){return Ut(dt(e,t),n)}function Uc(e){return typeof e=="function"}function ce(e){return Uc(e)?e:()=>e}const Qh=()=>{},Hc=e=>e,jc=(e,t)=>t,Xh=e=>null,aa=e=>!0,ca=(e,t)=>e==t,em=/\.\d*?(?=9{6,}|0{6,})/gm,In=e=>{if(qc(e)||yn.has(e))return e;const t=`${e}`,n=t.match(em);if(n==null)return e;let s=n[0].length-1;if(t.indexOf("e-")!=-1){let[l,o]=t.split("e");return+`${In(l)}e${o}`}return we(e,s)};function An(e,t){return In(we(In(e/t))*t)}function Ll(e,t){return In(Pt(In(e/t))*t)}function Bc(e,t){return In(kt(In(e/t))*t)}function we(e,t=0){if(qc(e))return e;let n=10**t,s=e*n*(1+Number.EPSILON);return je(s)/n}const yn=new Map;function Wc(e){return((""+e).split(".")[1]||"").length}function js(e,t,n,s){let l=[],o=s.map(Wc);for(let i=t;i<n;i++){let r=Be(i),a=we(ps(e,i),r);for(let c=0;c<s.length;c++){let p=e==10?+`${s[c]}e${i}`:s[c]*a,d=(i>=0?0:r)+(i>=o[c]?0:o[c]),h=e==10?p:we(p,d);l.push(h),yn.set(h,d)}}return l}const Rs={},ai=[],hs=[null,null],mn=Array.isArray,qc=Number.isInteger,tm=e=>e===void 0;function ua(e){return typeof e=="string"}function Dl(e){let t=!1;if(e!=null){let n=e.constructor;t=n==null||n==Object}return t}function nm(e){return e!=null&&typeof e=="object"}const sm=Object.getPrototypeOf(Uint8Array),Kc="__proto__";function ms(e,t=Dl){let n;if(mn(e)){let s=e.find(l=>l!=null);if(mn(s)||t(s)){n=Array(e.length);for(let l=0;l<e.length;l++)n[l]=ms(e[l],t)}else n=e.slice()}else if(e instanceof sm)n=e.slice();else if(t(e)){n={};for(let s in e)s!=Kc&&(n[s]=ms(e[s],t))}else n=e;return n}function Ue(e){let t=arguments;for(let n=1;n<t.length;n++){let s=t[n];for(let l in s)l!=Kc&&(Dl(e[l])?Ue(e[l],ms(s[l])):e[l]=ms(s[l]))}return e}const lm=0,om=1,im=2;function rm(e,t,n){for(let s=0,l,o=-1;s<t.length;s++){let i=t[s];if(i>o){for(l=i-1;l>=0&&e[l]==null;)e[l--]=null;for(l=i+1;l<n&&e[l]==null;)e[o=l++]=null}}}function am(e,t){if(dm(e)){let i=e[0].slice();for(let r=1;r<e.length;r++)i.push(...e[r].slice(1));return fm(i[0])||(i=um(i)),i}let n=new Set;for(let i=0;i<e.length;i++){let a=e[i][0],c=a.length;for(let p=0;p<c;p++)n.add(a[p])}let s=[Array.from(n).sort((i,r)=>i-r)],l=s[0].length,o=new Map;for(let i=0;i<l;i++)o.set(s[0][i],i);for(let i=0;i<e.length;i++){let r=e[i],a=r[0];for(let c=1;c<r.length;c++){let p=r[c],d=Array(l).fill(void 0),h=t?t[i][c]:om,v=[];for(let $=0;$<p.length;$++){let T=p[$],w=o.get(a[$]);T===null?h!=lm&&(d[w]=T,h==im&&v.push(w)):d[w]=T}rm(d,v,l),s.push(d)}}return s}const cm=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function um(e){let t=e[0],n=t.length,s=Array(n);for(let o=0;o<s.length;o++)s[o]=o;s.sort((o,i)=>t[o]-t[i]);let l=[];for(let o=0;o<e.length;o++){let i=e[o],r=Array(n);for(let a=0;a<n;a++)r[a]=i[s[a]];l.push(r)}return l}function dm(e){let t=e[0][0],n=t.length;for(let s=1;s<e.length;s++){let l=e[s][0];if(l.length!=n)return!1;if(l!=t){for(let o=0;o<n;o++)if(l[o]!=t[o])return!1}}return!0}function fm(e,t=100){const n=e.length;if(n<=1)return!0;let s=0,l=n-1;for(;s<=l&&e[s]==null;)s++;for(;l>=s&&e[l]==null;)l--;if(l<=s)return!0;const o=dt(1,kt((l-s+1)/t));for(let i=e[s],r=s+o;r<=l;r+=o){const a=e[r];if(a!=null){if(a<=i)return!1;i=a}}return!0}const Gc=["January","February","March","April","May","June","July","August","September","October","November","December"],Yc=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function Jc(e){return e.slice(0,3)}const pm=Yc.map(Jc),hm=Gc.map(Jc),mm={MMMM:Gc,MMM:hm,WWWW:Yc,WWW:pm};function As(e){return(e<10?"0":"")+e}function _m(e){return(e<10?"00":e<100?"0":"")+e}const vm={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>As(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>As(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>As(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>As(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>As(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>_m(e.getMilliseconds())};function ci(e,t){t=t||mm;let n=[],s=/\{([a-z]+)\}|[^{]+/gi,l;for(;l=s.exec(e);)n.push(l[0][0]=="{"?vm[l[1]]:l[0]);return o=>{let i="";for(let r=0;r<n.length;r++)i+=typeof n[r]=="string"?n[r]:n[r](o,t);return i}}const gm=new Intl.DateTimeFormat().resolvedOptions().timeZone;function ym(e,t){let n;return t=="UTC"||t=="Etc/UTC"?n=new Date(+e+e.getTimezoneOffset()*6e4):t==gm?n=e:(n=new Date(e.toLocaleString("en-US",{timeZone:t})),n.setMilliseconds(e.getMilliseconds())),n}const Zc=e=>e%1==0,$l=[1,2,2.5,5],bm=js(10,-32,0,$l),Qc=js(10,0,32,$l),$m=Qc.filter(Zc),Tn=bm.concat(Qc),ui=`
`,Xc="{YYYY}",da=ui+Xc,eu="{M}/{D}",Ds=ui+eu,il=Ds+"/{YY}",tu="{aa}",wm="{h}:{mm}",ns=wm+tu,fa=ui+ns,pa=":{ss}",ge=null;function nu(e){let t=e*1e3,n=t*60,s=n*60,l=s*24,o=l*30,i=l*365,a=(e==1?js(10,0,3,$l).filter(Zc):js(10,-3,0,$l)).concat([t,t*5,t*10,t*15,t*30,n,n*5,n*10,n*15,n*30,s,s*2,s*3,s*4,s*6,s*8,s*12,l,l*2,l*3,l*4,l*5,l*6,l*7,l*8,l*9,l*10,l*15,o,o*2,o*3,o*4,o*6,i,i*2,i*5,i*10,i*25,i*50,i*100]);const c=[[i,Xc,ge,ge,ge,ge,ge,ge,1],[l*28,"{MMM}",da,ge,ge,ge,ge,ge,1],[l,eu,da,ge,ge,ge,ge,ge,1],[s,"{h}"+tu,il,ge,Ds,ge,ge,ge,1],[n,ns,il,ge,Ds,ge,ge,ge,1],[t,pa,il+" "+ns,ge,Ds+" "+ns,ge,fa,ge,1],[e,pa+".{fff}",il+" "+ns,ge,Ds+" "+ns,ge,fa,ge,1]];function p(d){return(h,v,$,T,w,x)=>{let b=[],C=w>=i,M=w>=o&&w<i,S=d($),E=we(S*e,3),L=yo(S.getFullYear(),C?0:S.getMonth(),M||C?1:S.getDate()),D=we(L*e,3);if(M||C){let z=M?w/o:0,I=C?w/i:0,P=E==D?E:we(yo(L.getFullYear()+I,L.getMonth()+z,1)*e,3),Y=new Date(je(P/e)),U=Y.getFullYear(),K=Y.getMonth();for(let W=0;P<=T;W++){let N=yo(U+I*W,K+z*W,1),V=N-d(we(N*e,3));P=we((+N+V)*e,3),P<=T&&b.push(P)}}else{let z=w>=l?l:w,I=kt($)-kt(E),P=D+I+Ll(E-D,z);b.push(P);let Y=d(P),U=Y.getHours()+Y.getMinutes()/n+Y.getSeconds()/s,K=w/s,W=h.axes[v]._space,N=x/W;for(;P=we(P+w,e==1?0:3),!(P>T);)if(K>1){let V=kt(we(U+K,6))%24,de=d(P).getHours()-V;de>1&&(de=-1),P-=de*s,U=(U+K)%24;let pe=b[b.length-1];we((P-pe)/w,3)*N>=.7&&b.push(P)}else b.push(P)}return b}}return[a,c,p]}const[km,Sm,xm]=nu(1),[Mm,Cm,Em]=nu(.001);js(2,-53,53,[1]);function ha(e,t){return e.map(n=>n.map((s,l)=>l==0||l==8||s==null?s:t(l==1||n[8]==0?s:n[1]+s)))}function ma(e,t){return(n,s,l,o,i)=>{let r=t.find($=>i>=$[0])||t[t.length-1],a,c,p,d,h,v;return s.map($=>{let T=e($),w=T.getFullYear(),x=T.getMonth(),b=T.getDate(),C=T.getHours(),M=T.getMinutes(),S=T.getSeconds(),E=w!=a&&r[2]||x!=c&&r[3]||b!=p&&r[4]||C!=d&&r[5]||M!=h&&r[6]||S!=v&&r[7]||r[1];return a=w,c=x,p=b,d=C,h=M,v=S,E(T)})}}function Am(e,t){let n=ci(t);return(s,l,o,i,r)=>l.map(a=>n(e(a)))}function yo(e,t,n){return new Date(e,t,n)}function _a(e,t){return t(e)}const Tm="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function va(e,t){return(n,s,l,o)=>o==null?si:t(e(s))}function Lm(e,t){let n=e.series[t];return n.width?n.stroke(e,t):n.points.width?n.points.stroke(e,t):null}function Dm(e,t){return e.series[t].fill(e,t)}const Pm={show:!0,live:!0,isolate:!1,mount:Qh,markers:{show:!0,width:2,stroke:Lm,fill:Dm,dash:"solid"},idx:null,idxs:null,values:[]};function Om(e,t){let n=e.cursor.points,s=Dt(),l=n.size(e,t);Te(s,Ts,l),Te(s,Ls,l);let o=l/-2;Te(s,"marginLeft",o),Te(s,"marginTop",o);let i=n.width(e,t,l);return i&&Te(s,"borderWidth",i),s}function Rm(e,t){let n=e.series[t].points;return n._fill||n._stroke}function Im(e,t){let n=e.series[t].points;return n._stroke||n._fill}function Nm(e,t){return e.series[t].points.size}const bo=[0,0];function zm(e,t,n){return bo[0]=t,bo[1]=n,bo}function rl(e,t,n,s=!0){return l=>{l.button==0&&(!s||l.target==t)&&n(l)}}function $o(e,t,n,s=!0){return l=>{(!s||l.target==t)&&n(l)}}const Vm={show:!0,x:!0,y:!0,lock:!1,move:zm,points:{one:!1,show:Om,size:Nm,width:0,stroke:Im,fill:Rm},bind:{mousedown:rl,mouseup:rl,click:rl,dblclick:rl,mousemove:$o,mouseleave:$o,mouseenter:$o},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,n,s,l)=>s-l,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},su={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},di=Ue({},su,{filter:jc}),lu=Ue({},di,{size:10}),ou=Ue({},su,{show:!1}),fi='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',iu="bold "+fi,ru=1.5,ga={show:!0,scale:"x",stroke:ni,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:iu,side:2,grid:di,ticks:lu,border:ou,font:fi,lineGap:ru,rotate:0},Fm="Value",Um="Time",ya={show:!0,scale:"x",auto:!1,sorted:1,min:$e,max:-$e,idxs:[]};function Hm(e,t,n,s,l){return t.map(o=>o==null?"":ri(o))}function jm(e,t,n,s,l,o,i){let r=[],a=yn.get(l)||0;n=i?n:we(Ll(n,l),a);for(let c=n;c<=s;c=we(c+l,a))r.push(Object.is(c,-0)?0:c);return r}function Fo(e,t,n,s,l,o,i){const r=[],a=e.scales[e.axes[t].scale].log,c=a==10?ln:Fc,p=kt(c(n));l=ps(a,p),a==10&&(l=Tn[Ft(l,Tn)]);let d=n,h=l*a;a==10&&(h=Tn[Ft(h,Tn)]);do r.push(d),d=d+l,a==10&&!yn.has(d)&&(d=we(d,yn.get(l))),d>=h&&(l=d,h=l*a,a==10&&(h=Tn[Ft(h,Tn)]));while(d<=s);return r}function Bm(e,t,n,s,l,o,i){let a=e.scales[e.axes[t].scale].asinh,c=s>a?Fo(e,t,dt(a,n),s,l):[a],p=s>=0&&n<=0?[0]:[];return(n<-a?Fo(e,t,dt(a,-s),-n,l):[a]).reverse().map(h=>-h).concat(p,c)}const au=/./,Wm=/[12357]/,qm=/[125]/,ba=/1/,Uo=(e,t,n,s)=>e.map((l,o)=>t==4&&l==0||o%s==0&&n.test(l.toExponential()[l<0?1:0])?l:null);function Km(e,t,n,s,l){let o=e.axes[n],i=o.scale,r=e.scales[i],a=e.valToPos,c=o._space,p=a(10,i),d=a(9,i)-p>=c?au:a(7,i)-p>=c?Wm:a(5,i)-p>=c?qm:ba;if(d==ba){let h=Be(a(1,i)-p);if(h<c)return Uo(t.slice().reverse(),r.distr,d,Pt(c/h)).reverse()}return Uo(t,r.distr,d,1)}function Gm(e,t,n,s,l){let o=e.axes[n],i=o.scale,r=o._space,a=e.valToPos,c=Be(a(1,i)-a(2,i));return c<r?Uo(t.slice().reverse(),3,au,Pt(r/c)).reverse():t}function Ym(e,t,n,s){return s==null?si:t==null?"":ri(t)}const $a={show:!0,scale:"y",stroke:ni,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:iu,side:3,grid:di,ticks:lu,border:ou,font:fi,lineGap:ru,rotate:0};function Jm(e,t){let n=3+(e||1)*2;return we(n*t,3)}function Zm(e,t){let{scale:n,idxs:s}=e.series[0],l=e._data[0],o=e.valToPos(l[s[0]],n,!0),i=e.valToPos(l[s[1]],n,!0),r=Be(i-o),a=e.series[t],c=r/(a.points.space*ve);return s[1]-s[0]<=c}const wa={scale:null,auto:!0,sorted:0,min:$e,max:-$e},cu=(e,t,n,s,l)=>l,ka={show:!0,auto:!0,sorted:0,gaps:cu,alpha:1,facets:[Ue({},wa,{scale:"x"}),Ue({},wa,{scale:"y"})]},Sa={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:cu,alpha:1,points:{show:Zm,filter:null},values:null,min:$e,max:-$e,idxs:[],path:null,clip:null};function Qm(e,t,n,s,l){return n/10}const uu={time:kh,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},Xm=Ue({},uu,{time:!1,ori:1}),xa={};function du(e,t){let n=xa[e];return n||(n={key:e,plots:[],sub(s){n.plots.push(s)},unsub(s){n.plots=n.plots.filter(l=>l!=s)},pub(s,l,o,i,r,a,c){for(let p=0;p<n.plots.length;p++)n.plots[p]!=l&&n.plots[p].pub(s,l,o,i,r,a,c)}},e!=null&&(xa[e]=n)),n}const _s=1,Ho=2;function Nn(e,t,n){const s=e.mode,l=e.series[t],o=s==2?e._data[t]:e._data,i=e.scales,r=e.bbox;let a=o[0],c=s==2?o[1]:o[t],p=s==2?i[l.facets[0].scale]:i[e.series[0].scale],d=s==2?i[l.facets[1].scale]:i[l.scale],h=r.left,v=r.top,$=r.width,T=r.height,w=e.valToPosH,x=e.valToPosV;return p.ori==0?n(l,a,c,p,d,w,x,h,v,$,T,Ol,gs,Il,pu,mu):n(l,a,c,p,d,x,w,v,h,T,$,Rl,ys,mi,hu,_u)}function pi(e,t){let n=0,s=0,l=me(e.bands,ai);for(let o=0;o<l.length;o++){let i=l[o];i.series[0]==t?n=i.dir:i.series[1]==t&&(i.dir==1?s|=1:s|=2)}return[n,s==1?-1:s==2?1:s==3?2:0]}function e0(e,t,n,s,l){let o=e.mode,i=e.series[t],r=o==2?i.facets[1].scale:i.scale,a=e.scales[r];return l==-1?a.min:l==1?a.max:a.distr==3?a.dir==1?a.min:a.max:0}function on(e,t,n,s,l,o){return Nn(e,t,(i,r,a,c,p,d,h,v,$,T,w)=>{let x=i.pxRound;const b=c.dir*(c.ori==0?1:-1),C=c.ori==0?gs:ys;let M,S;b==1?(M=n,S=s):(M=s,S=n);let E=x(d(r[M],c,T,v)),L=x(h(a[M],p,w,$)),D=x(d(r[S],c,T,v)),z=x(h(o==1?p.max:p.min,p,w,$)),I=new Path2D(l);return C(I,D,z),C(I,E,z),C(I,E,L),I})}function Pl(e,t,n,s,l,o){let i=null;if(e.length>0){i=new Path2D;const r=t==0?Il:mi;let a=n;for(let d=0;d<e.length;d++){let h=e[d];if(h[1]>h[0]){let v=h[0]-a;v>0&&r(i,a,s,v,s+o),a=h[1]}}let c=n+l-a,p=10;c>0&&r(i,a,s-p/2,c,s+o+p)}return i}function t0(e,t,n){let s=e[e.length-1];s&&s[0]==t?s[1]=n:e.push([t,n])}function hi(e,t,n,s,l,o,i){let r=[],a=e.length;for(let c=l==1?n:s;c>=n&&c<=s;c+=l)if(t[c]===null){let d=c,h=c;if(l==1)for(;++c<=s&&t[c]===null;)h=c;else for(;--c>=n&&t[c]===null;)h=c;let v=o(e[d]),$=h==d?v:o(e[h]),T=d-l;v=i<=0&&T>=0&&T<a?o(e[T]):v;let x=h+l;$=i>=0&&x>=0&&x<a?o(e[x]):$,$>=v&&r.push([v,$])}return r}function Ma(e){return e==0?Hc:e==1?je:t=>An(t,e)}function fu(e){let t=e==0?Ol:Rl,n=e==0?(l,o,i,r,a,c)=>{l.arcTo(o,i,r,a,c)}:(l,o,i,r,a,c)=>{l.arcTo(i,o,a,r,c)},s=e==0?(l,o,i,r,a)=>{l.rect(o,i,r,a)}:(l,o,i,r,a)=>{l.rect(i,o,a,r)};return(l,o,i,r,a,c=0,p=0)=>{c==0&&p==0?s(l,o,i,r,a):(c=Ut(c,r/2,a/2),p=Ut(p,r/2,a/2),t(l,o+c,i),n(l,o+r,i,o+r,i+a,c),n(l,o+r,i+a,o,i+a,p),n(l,o,i+a,o,i,p),n(l,o,i,o+r,i,c),l.closePath())}}const Ol=(e,t,n)=>{e.moveTo(t,n)},Rl=(e,t,n)=>{e.moveTo(n,t)},gs=(e,t,n)=>{e.lineTo(t,n)},ys=(e,t,n)=>{e.lineTo(n,t)},Il=fu(0),mi=fu(1),pu=(e,t,n,s,l,o)=>{e.arc(t,n,s,l,o)},hu=(e,t,n,s,l,o)=>{e.arc(n,t,s,l,o)},mu=(e,t,n,s,l,o,i)=>{e.bezierCurveTo(t,n,s,l,o,i)},_u=(e,t,n,s,l,o,i)=>{e.bezierCurveTo(n,t,l,s,i,o)};function vu(e){return(t,n,s,l,o)=>Nn(t,n,(i,r,a,c,p,d,h,v,$,T,w)=>{let{pxRound:x,points:b}=i,C,M;c.ori==0?(C=Ol,M=pu):(C=Rl,M=hu);const S=we(b.width*ve,3);let E=(b.size-b.width)/2*ve,L=we(E*2,3),D=new Path2D,z=new Path2D,{left:I,top:P,width:Y,height:U}=t.bbox;Il(z,I-L,P-L,Y+L*2,U+L*2);const K=W=>{if(a[W]!=null){let N=x(d(r[W],c,T,v)),V=x(h(a[W],p,w,$));C(D,N+E,V),M(D,N,V,E,0,fl*2)}};if(o)o.forEach(K);else for(let W=s;W<=l;W++)K(W);return{stroke:S>0?D:null,fill:D,clip:z,flags:_s|Ho}})}function gu(e){return(t,n,s,l,o,i)=>{s!=l&&(o!=s&&i!=s&&e(t,n,s),o!=l&&i!=l&&e(t,n,l),e(t,n,i))}}const n0=gu(gs),s0=gu(ys);function yu(e){const t=me(e==null?void 0:e.alignGaps,0);return(n,s,l,o)=>Nn(n,s,(i,r,a,c,p,d,h,v,$,T,w)=>{[l,o]=Al(a,l,o);let x=i.pxRound,b=U=>x(d(U,c,T,v)),C=U=>x(h(U,p,w,$)),M,S;c.ori==0?(M=gs,S=n0):(M=ys,S=s0);const E=c.dir*(c.ori==0?1:-1),L={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:_s},D=L.stroke;let z=!1;if(o-l>=T*4){let U=q=>n.posToVal(q,c.key,!0),K=null,W=null,N,V,Ie,fe=b(r[E==1?l:o]),de=b(r[l]),pe=b(r[o]),te=U(E==1?de+1:pe-1);for(let q=E==1?l:o;q>=l&&q<=o;q+=E){let Ne=r[q],ke=(E==1?Ne<te:Ne>te)?fe:b(Ne),ue=a[q];ke==fe?ue!=null?(V=ue,K==null?(M(D,ke,C(V)),N=K=W=V):V<K?K=V:V>W&&(W=V)):ue===null&&(z=!0):(K!=null&&S(D,fe,C(K),C(W),C(N),C(V)),ue!=null?(V=ue,M(D,ke,C(V)),K=W=N=V):(K=W=null,ue===null&&(z=!0)),fe=ke,te=U(fe+E))}K!=null&&K!=W&&Ie!=fe&&S(D,fe,C(K),C(W),C(N),C(V))}else for(let U=E==1?l:o;U>=l&&U<=o;U+=E){let K=a[U];K===null?z=!0:K!=null&&M(D,b(r[U]),C(K))}let[P,Y]=pi(n,s);if(i.fill!=null||P!=0){let U=L.fill=new Path2D(D),K=i.fillTo(n,s,i.min,i.max,P),W=C(K),N=b(r[l]),V=b(r[o]);E==-1&&([V,N]=[N,V]),M(U,V,W),M(U,N,W)}if(!i.spanGaps){let U=[];z&&U.push(...hi(r,a,l,o,E,b,t)),L.gaps=U=i.gaps(n,s,l,o,U),L.clip=Pl(U,c.ori,v,$,T,w)}return Y!=0&&(L.band=Y==2?[on(n,s,l,o,D,-1),on(n,s,l,o,D,1)]:on(n,s,l,o,D,Y)),L})}function l0(e){const t=me(e.align,1),n=me(e.ascDesc,!1),s=me(e.alignGaps,0),l=me(e.extend,!1);return(o,i,r,a)=>Nn(o,i,(c,p,d,h,v,$,T,w,x,b,C)=>{[r,a]=Al(d,r,a);let M=c.pxRound,{left:S,width:E}=o.bbox,L=de=>M($(de,h,b,w)),D=de=>M(T(de,v,C,x)),z=h.ori==0?gs:ys;const I={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:_s},P=I.stroke,Y=h.dir*(h.ori==0?1:-1);let U=D(d[Y==1?r:a]),K=L(p[Y==1?r:a]),W=K,N=K;l&&t==-1&&(N=S,z(P,N,U)),z(P,K,U);for(let de=Y==1?r:a;de>=r&&de<=a;de+=Y){let pe=d[de];if(pe==null)continue;let te=L(p[de]),q=D(pe);t==1?z(P,te,U):z(P,W,q),z(P,te,q),U=q,W=te}let V=W;l&&t==1&&(V=S+E,z(P,V,U));let[Ie,fe]=pi(o,i);if(c.fill!=null||Ie!=0){let de=I.fill=new Path2D(P),pe=c.fillTo(o,i,c.min,c.max,Ie),te=D(pe);z(de,V,te),z(de,N,te)}if(!c.spanGaps){let de=[];de.push(...hi(p,d,r,a,Y,L,s));let pe=c.width*ve/2,te=n||t==1?pe:-pe,q=n||t==-1?-pe:pe;de.forEach(Ne=>{Ne[0]+=te,Ne[1]+=q}),I.gaps=de=c.gaps(o,i,r,a,de),I.clip=Pl(de,h.ori,w,x,b,C)}return fe!=0&&(I.band=fe==2?[on(o,i,r,a,P,-1),on(o,i,r,a,P,1)]:on(o,i,r,a,P,fe)),I})}function Ca(e,t,n,s,l,o,i=$e){if(e.length>1){let r=null;for(let a=0,c=1/0;a<e.length;a++)if(t[a]!==void 0){if(r!=null){let p=Be(e[a]-e[r]);p<c&&(c=p,i=Be(n(e[a],s,l,o)-n(e[r],s,l,o)))}r=a}}return i}function o0(e){e=e||Rs;const t=me(e.size,[.6,$e,1]),n=e.align||0,s=e.gap||0;let l=e.radius;l=l==null?[0,0]:typeof l=="number"?[l,0]:l;const o=ce(l),i=1-t[0],r=me(t[1],$e),a=me(t[2],1),c=me(e.disp,Rs),p=me(e.each,v=>{}),{fill:d,stroke:h}=c;return(v,$,T,w)=>Nn(v,$,(x,b,C,M,S,E,L,D,z,I,P)=>{let Y=x.pxRound,U=n,K=s*ve,W=r*ve,N=a*ve,V,Ie;M.ori==0?[V,Ie]=o(v,$):[Ie,V]=o(v,$);const fe=M.dir*(M.ori==0?1:-1);let de=M.ori==0?Il:mi,pe=M.ori==0?p:(j,xe,He,zn,$n,qt,wn)=>{p(j,xe,He,$n,zn,wn,qt)},te=me(v.bands,ai).find(j=>j.series[0]==$),q=te!=null?te.dir:0,Ne=x.fillTo(v,$,x.min,x.max,q),Xe=Y(L(Ne,S,P,z)),ke,ue,ht,Pe=I,Se=Y(x.width*ve),xt=!1,Ot=null,nt=null,Wt=null,en=null;d!=null&&(Se==0||h!=null)&&(xt=!0,Ot=d.values(v,$,T,w),nt=new Map,new Set(Ot).forEach(j=>{j!=null&&nt.set(j,new Path2D)}),Se>0&&(Wt=h.values(v,$,T,w),en=new Map,new Set(Wt).forEach(j=>{j!=null&&en.set(j,new Path2D)})));let{x0:tn,size:rn}=c;if(tn!=null&&rn!=null){U=1,b=tn.values(v,$,T,w),tn.unit==2&&(b=b.map(He=>v.posToVal(D+He*I,M.key,!0)));let j=rn.values(v,$,T,w);rn.unit==2?ue=j[0]*I:ue=E(j[0],M,I,D)-E(0,M,I,D),Pe=Ca(b,C,E,M,I,D,Pe),ht=Pe-ue+K}else Pe=Ca(b,C,E,M,I,D,Pe),ht=Pe*i+K,ue=Pe-ht;ht<1&&(ht=0),Se>=ue/2&&(Se=0),ht<5&&(Y=Hc);let oe=ht>0,qe=Pe-ht-(oe?Se:0);ue=Y(Vo(qe,N,W)),ke=(U==0?ue/2:U==fe?0:ue)-U*fe*((U==0?K/2:0)+(oe?Se/2:0));const ze={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},st=xt?null:new Path2D;let Mt=null;if(te!=null)Mt=v.data[te.series[1]];else{let{y0:j,y1:xe}=c;j!=null&&xe!=null&&(C=xe.values(v,$,T,w),Mt=j.values(v,$,T,w))}let bn=V*ue,ne=Ie*ue;for(let j=fe==1?T:w;j>=T&&j<=w;j+=fe){let xe=C[j];if(xe==null)continue;if(Mt!=null){let mt=Mt[j]??0;if(xe-mt==0)continue;Xe=L(mt,S,P,z)}let He=M.distr!=2||c!=null?b[j]:j,zn=E(He,M,I,D),$n=L(me(xe,Ne),S,P,z),qt=Y(zn-ke),wn=Y(dt($n,Xe)),gt=Y(Ut($n,Xe)),Ct=wn-gt;if(xe!=null){let mt=xe<0?ne:bn,Rt=xe<0?bn:ne;xt?(Se>0&&Wt[j]!=null&&de(en.get(Wt[j]),qt,gt+kt(Se/2),ue,dt(0,Ct-Se),mt,Rt),Ot[j]!=null&&de(nt.get(Ot[j]),qt,gt+kt(Se/2),ue,dt(0,Ct-Se),mt,Rt)):de(st,qt,gt+kt(Se/2),ue,dt(0,Ct-Se),mt,Rt),pe(v,$,j,qt-Se/2,gt,ue+Se,Ct)}}return Se>0?ze.stroke=xt?en:st:xt||(ze._fill=x.width==0?x._fill:x._stroke??x._fill,ze.width=0),ze.fill=xt?nt:st,ze})}function i0(e,t){const n=me(t==null?void 0:t.alignGaps,0);return(s,l,o,i)=>Nn(s,l,(r,a,c,p,d,h,v,$,T,w,x)=>{[o,i]=Al(c,o,i);let b=r.pxRound,C=V=>b(h(V,p,w,$)),M=V=>b(v(V,d,x,T)),S,E,L;p.ori==0?(S=Ol,L=gs,E=mu):(S=Rl,L=ys,E=_u);const D=p.dir*(p.ori==0?1:-1);let z=C(a[D==1?o:i]),I=z,P=[],Y=[];for(let V=D==1?o:i;V>=o&&V<=i;V+=D)if(c[V]!=null){let fe=a[V],de=C(fe);P.push(I=de),Y.push(M(c[V]))}const U={stroke:e(P,Y,S,L,E,b),fill:null,clip:null,band:null,gaps:null,flags:_s},K=U.stroke;let[W,N]=pi(s,l);if(r.fill!=null||W!=0){let V=U.fill=new Path2D(K),Ie=r.fillTo(s,l,r.min,r.max,W),fe=M(Ie);L(V,I,fe),L(V,z,fe)}if(!r.spanGaps){let V=[];V.push(...hi(a,c,o,i,D,C,n)),U.gaps=V=r.gaps(s,l,o,i,V),U.clip=Pl(V,p.ori,$,T,w,x)}return N!=0&&(U.band=N==2?[on(s,l,o,i,K,-1),on(s,l,o,i,K,1)]:on(s,l,o,i,K,N)),U})}function r0(e){return i0(a0,e)}function a0(e,t,n,s,l,o){const i=e.length;if(i<2)return null;const r=new Path2D;if(n(r,e[0],t[0]),i==2)s(r,e[1],t[1]);else{let a=Array(i),c=Array(i-1),p=Array(i-1),d=Array(i-1);for(let h=0;h<i-1;h++)p[h]=t[h+1]-t[h],d[h]=e[h+1]-e[h],c[h]=p[h]/d[h];a[0]=c[0];for(let h=1;h<i-1;h++)c[h]===0||c[h-1]===0||c[h-1]>0!=c[h]>0?a[h]=0:(a[h]=3*(d[h-1]+d[h])/((2*d[h]+d[h-1])/c[h-1]+(d[h]+2*d[h-1])/c[h]),isFinite(a[h])||(a[h]=0));a[i-1]=c[i-2];for(let h=0;h<i-1;h++)l(r,e[h]+d[h]/3,t[h]+a[h]*d[h]/3,e[h+1]-d[h]/3,t[h+1]-a[h+1]*d[h]/3,e[h+1],t[h+1])}return r}const jo=new Set;function Ea(){for(let e of jo)e.syncRect(!0)}vs&&(On(Hh,cs,Ea),On(jh,cs,Ea,!0),On(yl,cs,()=>{it.pxRatio=ve}));const c0=yu(),u0=vu();function Aa(e,t,n,s){return(s?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,i)=>Bo(o,i,t,n))}function d0(e,t){return e.map((n,s)=>s==0?{}:Ue({},t,n))}function Bo(e,t,n,s){return Ue({},t==0?n:s,e)}function bu(e,t,n){return t==null?hs:[t,n]}const f0=bu;function p0(e,t,n){return t==null?hs:bl(t,n,ii,!0)}function $u(e,t,n,s){return t==null?hs:Tl(t,n,e.scales[s].log,!1)}const h0=$u;function wu(e,t,n,s){return t==null?hs:oi(t,n,e.scales[s].log,!1)}const m0=wu;function _0(e,t,n,s,l){let o=dt(ra(e),ra(t)),i=t-e,r=Ft(l/s*i,n);do{let a=n[r],c=s*a/i;if(c>=l&&o+(a<5?yn.get(a):0)<=17)return[a,c]}while(++r<n.length);return[0,0]}function Ta(e){let t,n;return e=e.replace(/(\d+)px/,(s,l)=>(t=je((n=+l)*ve))+"px"),[e,t,n]}function v0(e){e.show&&[e.font,e.labelFont].forEach(t=>{let n=we(t[2]*ve,1);t[0]=t[0].replace(/[0-9.]+px/,n+"px"),t[1]=n})}function it(e,t,n){const s={mode:me(e.mode,1)},l=s.mode;function o(u,f,m,_){let y=f.valToPct(u);return _+m*(f.dir==-1?1-y:y)}function i(u,f,m,_){let y=f.valToPct(u);return _+m*(f.dir==-1?y:1-y)}function r(u,f,m,_){return f.ori==0?o(u,f,m,_):i(u,f,m,_)}s.valToPosH=o,s.valToPosV=i;let a=!1;s.status=0;const c=s.root=Dt(Sh);if(e.id!=null&&(c.id=e.id),wt(c,e.class),e.title){let u=Dt(Ch,c);u.textContent=e.title}const p=Vt("canvas"),d=s.ctx=p.getContext("2d"),h=Dt(Eh,c);On("click",h,u=>{u.target===$&&(Ce!=Yn||Le!=Jn)&&tt.click(s,u)},!0);const v=s.under=Dt(Ah,h);h.appendChild(p);const $=s.over=Dt(Th,h);e=ms(e);const T=+me(e.pxAlign,1),w=Ma(T);(e.plugins||[]).forEach(u=>{u.opts&&(e=u.opts(s,e)||e)});const x=e.ms||.001,b=s.series=l==1?Aa(e.series||[],ya,Sa,!1):d0(e.series||[null],ka),C=s.axes=Aa(e.axes||[],ga,$a,!0),M=s.scales={},S=s.bands=e.bands||[];S.forEach(u=>{u.fill=ce(u.fill||null),u.dir=me(u.dir,-1)});const E=l==2?b[1].facets[0].scale:b[0].scale,L={axes:Fu,series:Ru},D=(e.drawOrder||["axes","series"]).map(u=>L[u]);function z(u){const f=u.distr==3?m=>ln(m>0?m:u.clamp(s,m,u.min,u.max,u.key)):u.distr==4?m=>go(m,u.asinh):u.distr==100?m=>u.fwd(m):m=>m;return m=>{let _=f(m),{_min:y,_max:k}=u,A=k-y;return(_-y)/A}}function I(u){let f=M[u];if(f==null){let m=(e.scales||Rs)[u]||Rs;if(m.from!=null){I(m.from);let _=Ue({},M[m.from],m,{key:u});_.valToPct=z(_),M[u]=_}else{f=M[u]=Ue({},u==E?uu:Xm,m),f.key=u;let _=f.time,y=f.range,k=mn(y);if((u!=E||l==2&&!_)&&(k&&(y[0]==null||y[1]==null)&&(y={min:y[0]==null?la:{mode:1,hard:y[0],soft:y[0]},max:y[1]==null?la:{mode:1,hard:y[1],soft:y[1]}},k=!1),!k&&Dl(y))){let A=y;y=(O,R,F)=>R==null?hs:bl(R,F,A)}f.range=ce(y||(_?f0:u==E?f.distr==3?h0:f.distr==4?m0:bu:f.distr==3?$u:f.distr==4?wu:p0)),f.auto=ce(k?!1:f.auto),f.clamp=ce(f.clamp||Qm),f._min=f._max=null,f.valToPct=z(f)}}}I("x"),I("y"),l==1&&b.forEach(u=>{I(u.scale)}),C.forEach(u=>{I(u.scale)});for(let u in e.scales)I(u);const P=M[E],Y=P.distr;let U,K;P.ori==0?(wt(c,xh),U=o,K=i):(wt(c,Mh),U=i,K=o);const W={};for(let u in M){let f=M[u];(f.min!=null||f.max!=null)&&(W[u]={min:f.min,max:f.max},f.min=f.max=null)}const N=e.tzDate||(u=>new Date(je(u/x))),V=e.fmtDate||ci,Ie=x==1?xm(N):Em(N),fe=ma(N,ha(x==1?Sm:Cm,V)),de=va(N,_a(Tm,V)),pe=[],te=s.legend=Ue({},Pm,e.legend),q=s.cursor=Ue({},Vm,{drag:{y:l==2}},e.cursor),Ne=te.show,Xe=q.show,ke=te.markers;te.idxs=pe,ke.width=ce(ke.width),ke.dash=ce(ke.dash),ke.stroke=ce(ke.stroke),ke.fill=ce(ke.fill);let ue,ht,Pe,Se=[],xt=[],Ot,nt=!1,Wt={};if(te.live){const u=b[1]?b[1].values:null;nt=u!=null,Ot=nt?u(s,1,0):{_:0};for(let f in Ot)Wt[f]=si}if(Ne)if(ue=Vt("table",Ih,c),Pe=Vt("tbody",null,ue),te.mount(s,ue),nt){ht=Vt("thead",null,ue,Pe);let u=Vt("tr",null,ht);Vt("th",null,u);for(var en in Ot)Vt("th",Wr,u).textContent=en}else wt(ue,zh),te.live&&wt(ue,Nh);const tn={show:!0},rn={show:!1};function oe(u,f){if(f==0&&(nt||!te.live||l==2))return hs;let m=[],_=Vt("tr",Vh,Pe,Pe.childNodes[f]);wt(_,u.class),u.show||wt(_,Ln);let y=Vt("th",null,_);if(ke.show){let O=Dt(Fh,y);if(f>0){let R=ke.width(s,f);R&&(O.style.border=R+"px "+ke.dash(s,f)+" "+ke.stroke(s,f)),O.style.background=ke.fill(s,f)}}let k=Dt(Wr,y);u.label instanceof HTMLElement?k.appendChild(u.label):k.textContent=u.label,f>0&&(ke.show||(k.style.color=u.width>0?ke.stroke(s,f):ke.fill(s,f)),ze("click",y,O=>{if(q._lock)return;Sn(O);let R=b.indexOf(u);if((O.ctrlKey||O.metaKey)!=te.isolate){let F=b.some((H,B)=>B>0&&B!=R&&H.show);b.forEach((H,B)=>{B>0&&Gt(B,F?B==R?tn:rn:tn,!0,Ve.setSeries)})}else Gt(R,{show:!u.show},!0,Ve.setSeries)},!1),Fn&&ze(Yr,y,O=>{q._lock||(Sn(O),Gt(b.indexOf(u),Qn,!0,Ve.setSeries))},!1));for(var A in Ot){let O=Vt("td",Uh,_);O.textContent="--",m.push(O)}return[_,m]}const qe=new Map;function ze(u,f,m,_=!0){const y=qe.get(f)||{},k=q.bind[u](s,f,m,_);k&&(On(u,f,y[u]=k),qe.set(f,y))}function st(u,f,m){const _=qe.get(f)||{};for(let y in _)(u==null||y==u)&&(zo(y,f,_[y]),delete _[y]);u==null&&qe.delete(f)}let Mt=0,bn=0,ne=0,j=0,xe=0,He=0,zn=xe,$n=He,qt=ne,wn=j,gt=0,Ct=0,mt=0,Rt=0;s.bbox={};let Nl=!1,Ks=!1,Vn=!1,kn=!1,Gs=!1,Et=!1;function zl(u,f,m){(m||u!=s.width||f!=s.height)&&gi(u,f),Wn(!1),Vn=!0,Ks=!0,qn()}function gi(u,f){s.width=Mt=ne=u,s.height=bn=j=f,xe=He=0,Eu(),Au();let m=s.bbox;gt=m.left=An(xe*ve,.5),Ct=m.top=An(He*ve,.5),mt=m.width=An(ne*ve,.5),Rt=m.height=An(j*ve,.5)}const xu=3;function Mu(){let u=!1,f=0;for(;!u;){f++;let m=zu(f),_=Vu(f);u=f==xu||m&&_,u||(gi(s.width,s.height),Ks=!0)}}function Cu({width:u,height:f}){zl(u,f)}s.setSize=Cu;function Eu(){let u=!1,f=!1,m=!1,_=!1;C.forEach((y,k)=>{if(y.show&&y._show){let{side:A,_size:O}=y,R=A%2,F=y.label!=null?y.labelSize:0,H=O+F;H>0&&(R?(ne-=H,A==3?(xe+=H,_=!0):m=!0):(j-=H,A==0?(He+=H,u=!0):f=!0))}}),xn[0]=u,xn[1]=m,xn[2]=f,xn[3]=_,ne-=an[1]+an[3],xe+=an[3],j-=an[2]+an[0],He+=an[0]}function Au(){let u=xe+ne,f=He+j,m=xe,_=He;function y(k,A){switch(k){case 1:return u+=A,u-A;case 2:return f+=A,f-A;case 3:return m-=A,m+A;case 0:return _-=A,_+A}}C.forEach((k,A)=>{if(k.show&&k._show){let O=k.side;k._pos=y(O,k._size),k.label!=null&&(k._lpos=y(O,k.labelSize))}})}if(q.dataIdx==null){let u=q.hover,f=u.skip=new Set(u.skip??[]);f.add(void 0);let m=u.prox=ce(u.prox),_=u.bias??(u.bias=0);q.dataIdx=(y,k,A,O)=>{if(k==0)return A;let R=A,F=m(y,k,A,O)??$e,H=F>=0&&F<$e,B=P.ori==0?ne:j,ee=q.left,_e=t[0],he=t[k];if(f.has(he[A])){R=null;let re=null,Q=null,G;if(_==0||_==-1)for(G=A;re==null&&G-- >0;)f.has(he[G])||(re=G);if(_==0||_==1)for(G=A;Q==null&&G++<he.length;)f.has(he[G])||(Q=G);if(re!=null||Q!=null)if(H){let Ae=re==null?-1/0:U(_e[re],P,B,0),Oe=Q==null?1/0:U(_e[Q],P,B,0),Qe=ee-Ae,ye=Oe-ee;Qe<=ye?Qe<=F&&(R=re):ye<=F&&(R=Q)}else R=Q==null?re:re==null?Q:A-re<=Q-A?re:Q}else H&&Be(ee-U(_e[A],P,B,0))>F&&(R=null);return R}}const Sn=u=>{q.event=u};q.idxs=pe,q._lock=!1;let lt=q.points;lt.show=ce(lt.show),lt.size=ce(lt.size),lt.stroke=ce(lt.stroke),lt.width=ce(lt.width),lt.fill=ce(lt.fill);const Kt=s.focus=Ue({},e.focus||{alpha:.3},q.focus),Fn=Kt.prox>=0,Un=Fn&&lt.one;let At=[],Hn=[],jn=[];function yi(u,f){let m=lt.show(s,f);if(m instanceof HTMLElement)return wt(m,Rh),wt(m,u.class),Qt(m,-10,-10,ne,j),$.insertBefore(m,At[f]),m}function bi(u,f){if(l==1||f>0){let m=l==1&&M[u.scale].time,_=u.value;u.value=m?ua(_)?va(N,_a(_,V)):_||de:_||Ym,u.label=u.label||(m?Um:Fm)}if(Un||f>0){u.width=u.width==null?1:u.width,u.paths=u.paths||c0||Xh,u.fillTo=ce(u.fillTo||e0),u.pxAlign=+me(u.pxAlign,T),u.pxRound=Ma(u.pxAlign),u.stroke=ce(u.stroke||null),u.fill=ce(u.fill||null),u._stroke=u._fill=u._paths=u._focus=null;let m=Jm(dt(1,u.width),1),_=u.points=Ue({},{size:m,width:dt(1,m*.2),stroke:u.stroke,space:m*2,paths:u0,_stroke:null,_fill:null},u.points);_.show=ce(_.show),_.filter=ce(_.filter),_.fill=ce(_.fill),_.stroke=ce(_.stroke),_.paths=ce(_.paths),_.pxAlign=u.pxAlign}if(Ne){let m=oe(u,f);Se.splice(f,0,m[0]),xt.splice(f,0,m[1]),te.values.push(null)}if(Xe){pe.splice(f,0,null);let m=null;Un?f==0&&(m=yi(u,f)):f>0&&(m=yi(u,f)),At.splice(f,0,m),Hn.splice(f,0,0),jn.splice(f,0,0)}Ze("addSeries",f)}function Tu(u,f){f=f??b.length,u=l==1?Bo(u,f,ya,Sa):Bo(u,f,{},ka),b.splice(f,0,u),bi(b[f],f)}s.addSeries=Tu;function Lu(u){if(b.splice(u,1),Ne){te.values.splice(u,1),xt.splice(u,1);let f=Se.splice(u,1)[0];st(null,f.firstChild),f.remove()}Xe&&(pe.splice(u,1),At.splice(u,1)[0].remove(),Hn.splice(u,1),jn.splice(u,1)),Ze("delSeries",u)}s.delSeries=Lu;const xn=[!1,!1,!1,!1];function Du(u,f){if(u._show=u.show,u.show){let m=u.side%2,_=M[u.scale];_==null&&(u.scale=m?b[1].scale:E,_=M[u.scale]);let y=_.time;u.size=ce(u.size),u.space=ce(u.space),u.rotate=ce(u.rotate),mn(u.incrs)&&u.incrs.forEach(A=>{!yn.has(A)&&yn.set(A,Wc(A))}),u.incrs=ce(u.incrs||(_.distr==2?$m:y?x==1?km:Mm:Tn)),u.splits=ce(u.splits||(y&&_.distr==1?Ie:_.distr==3?Fo:_.distr==4?Bm:jm)),u.stroke=ce(u.stroke),u.grid.stroke=ce(u.grid.stroke),u.ticks.stroke=ce(u.ticks.stroke),u.border.stroke=ce(u.border.stroke);let k=u.values;u.values=mn(k)&&!mn(k[0])?ce(k):y?mn(k)?ma(N,ha(k,V)):ua(k)?Am(N,k):k||fe:k||Hm,u.filter=ce(u.filter||(_.distr>=3&&_.log==10?Km:_.distr==3&&_.log==2?Gm:jc)),u.font=Ta(u.font),u.labelFont=Ta(u.labelFont),u._size=u.size(s,null,f,0),u._space=u._rotate=u._incrs=u._found=u._splits=u._values=null,u._size>0&&(xn[f]=!0,u._el=Dt(Lh,h))}}function bs(u,f,m,_){let[y,k,A,O]=m,R=f%2,F=0;return R==0&&(O||k)&&(F=f==0&&!y||f==2&&!A?je(ga.size/3):0),R==1&&(y||A)&&(F=f==1&&!k||f==3&&!O?je($a.size/2):0),F}const $i=s.padding=(e.padding||[bs,bs,bs,bs]).map(u=>ce(me(u,bs))),an=s._padding=$i.map((u,f)=>u(s,f,xn,0));let et,Ke=null,Ge=null;const Ys=l==1?b[0].idxs:null;let It=null,$s=!1;function wi(u,f){if(t=u??[],s.data=s._data=t,l==2){et=0;for(let m=1;m<b.length;m++)et+=t[m][0].length}else{t.length==0&&(s.data=s._data=t=[[]]),It=t[0],et=It.length;let m=t;if(Y==2){m=t.slice();let _=m[0]=Array(et);for(let y=0;y<et;y++)_[y]=y}s._data=t=m}if(Wn(!0),Ze("setData"),Y==2&&(Vn=!0),f!==!1){let m=P;m.auto(s,$s)?Vl():un(E,m.min,m.max),kn=kn||q.left>=0,Et=!0,qn()}}s.setData=wi;function Vl(){$s=!0;let u,f;l==1&&(et>0?(Ke=Ys[0]=0,Ge=Ys[1]=et-1,u=t[0][Ke],f=t[0][Ge],Y==2?(u=Ke,f=Ge):u==f&&(Y==3?[u,f]=Tl(u,u,P.log,!1):Y==4?[u,f]=oi(u,u,P.log,!1):P.time?f=u+je(86400/x):[u,f]=bl(u,f,ii,!0))):(Ke=Ys[0]=u=null,Ge=Ys[1]=f=null)),un(E,u,f)}let Js,Bn,Fl,Ul,Hl,jl,Bl,Wl,ql,_t;function ki(u,f,m,_,y,k){u??(u=Kr),m??(m=ai),_??(_="butt"),y??(y=Kr),k??(k="round"),u!=Js&&(d.strokeStyle=Js=u),y!=Bn&&(d.fillStyle=Bn=y),f!=Fl&&(d.lineWidth=Fl=f),k!=Hl&&(d.lineJoin=Hl=k),_!=jl&&(d.lineCap=jl=_),m!=Ul&&d.setLineDash(Ul=m)}function Si(u,f,m,_){f!=Bn&&(d.fillStyle=Bn=f),u!=Bl&&(d.font=Bl=u),m!=Wl&&(d.textAlign=Wl=m),_!=ql&&(d.textBaseline=ql=_)}function Kl(u,f,m,_,y=0){if(_.length>0&&u.auto(s,$s)&&(f==null||f.min==null)){let k=me(Ke,0),A=me(Ge,_.length-1),O=m.min==null?Kh(_,k,A,y,u.distr==3):[m.min,m.max];u.min=Ut(u.min,m.min=O[0]),u.max=dt(u.max,m.max=O[1])}}const xi={min:null,max:null};function Pu(){for(let _ in M){let y=M[_];W[_]==null&&(y.min==null||W[E]!=null&&y.auto(s,$s))&&(W[_]=xi)}for(let _ in M){let y=M[_];W[_]==null&&y.from!=null&&W[y.from]!=null&&(W[_]=xi)}W[E]!=null&&Wn(!0);let u={};for(let _ in W){let y=W[_];if(y!=null){let k=u[_]=ms(M[_],nm);if(y.min!=null)Ue(k,y);else if(_!=E||l==2)if(et==0&&k.from==null){let A=k.range(s,null,null,_);k.min=A[0],k.max=A[1]}else k.min=$e,k.max=-$e}}if(et>0){b.forEach((_,y)=>{if(l==1){let k=_.scale,A=W[k];if(A==null)return;let O=u[k];if(y==0){let R=O.range(s,O.min,O.max,k);O.min=R[0],O.max=R[1],Ke=Ft(O.min,t[0]),Ge=Ft(O.max,t[0]),Ge-Ke>1&&(t[0][Ke]<O.min&&Ke++,t[0][Ge]>O.max&&Ge--),_.min=It[Ke],_.max=It[Ge]}else _.show&&_.auto&&Kl(O,A,_,t[y],_.sorted);_.idxs[0]=Ke,_.idxs[1]=Ge}else if(y>0&&_.show&&_.auto){let[k,A]=_.facets,O=k.scale,R=A.scale,[F,H]=t[y],B=u[O],ee=u[R];B!=null&&Kl(B,W[O],k,F,k.sorted),ee!=null&&Kl(ee,W[R],A,H,A.sorted),_.min=A.min,_.max=A.max}});for(let _ in u){let y=u[_],k=W[_];if(y.from==null&&(k==null||k.min==null)){let A=y.range(s,y.min==$e?null:y.min,y.max==-$e?null:y.max,_);y.min=A[0],y.max=A[1]}}}for(let _ in u){let y=u[_];if(y.from!=null){let k=u[y.from];if(k.min==null)y.min=y.max=null;else{let A=y.range(s,k.min,k.max,_);y.min=A[0],y.max=A[1]}}}let f={},m=!1;for(let _ in u){let y=u[_],k=M[_];if(k.min!=y.min||k.max!=y.max){k.min=y.min,k.max=y.max;let A=k.distr;k._min=A==3?ln(k.min):A==4?go(k.min,k.asinh):A==100?k.fwd(k.min):k.min,k._max=A==3?ln(k.max):A==4?go(k.max,k.asinh):A==100?k.fwd(k.max):k.max,f[_]=m=!0}}if(m){b.forEach((_,y)=>{l==2?y>0&&f.y&&(_._paths=null):f[_.scale]&&(_._paths=null)});for(let _ in f)Vn=!0,Ze("setScale",_);Xe&&q.left>=0&&(kn=Et=!0)}for(let _ in W)W[_]=null}function Ou(u){let f=Vo(Ke-1,0,et-1),m=Vo(Ge+1,0,et-1);for(;u[f]==null&&f>0;)f--;for(;u[m]==null&&m<et-1;)m++;return[f,m]}function Ru(){if(et>0){let u=b.some(f=>f._focus)&&_t!=Kt.alpha;u&&(d.globalAlpha=_t=Kt.alpha),b.forEach((f,m)=>{if(m>0&&f.show&&(Mi(m,!1),Mi(m,!0),f._paths==null)){let _=_t;_t!=f.alpha&&(d.globalAlpha=_t=f.alpha);let y=l==2?[0,t[m][0].length-1]:Ou(t[m]);f._paths=f.paths(s,m,y[0],y[1]),_t!=_&&(d.globalAlpha=_t=_)}}),b.forEach((f,m)=>{if(m>0&&f.show){let _=_t;_t!=f.alpha&&(d.globalAlpha=_t=f.alpha),f._paths!=null&&Ci(m,!1);{let y=f._paths!=null?f._paths.gaps:null,k=f.points.show(s,m,Ke,Ge,y),A=f.points.filter(s,m,k,y);(k||A)&&(f.points._paths=f.points.paths(s,m,Ke,Ge,A),Ci(m,!0))}_t!=_&&(d.globalAlpha=_t=_),Ze("drawSeries",m)}}),u&&(d.globalAlpha=_t=1)}}function Mi(u,f){let m=f?b[u].points:b[u];m._stroke=m.stroke(s,u),m._fill=m.fill(s,u)}function Ci(u,f){let m=f?b[u].points:b[u],{stroke:_,fill:y,clip:k,flags:A,_stroke:O=m._stroke,_fill:R=m._fill,_width:F=m.width}=m._paths;F=we(F*ve,3);let H=null,B=F%2/2;f&&R==null&&(R=F>0?"#fff":O);let ee=m.pxAlign==1&&B>0;if(ee&&d.translate(B,B),!f){let _e=gt-F/2,he=Ct-F/2,re=mt+F,Q=Rt+F;H=new Path2D,H.rect(_e,he,re,Q)}f?Gl(O,F,m.dash,m.cap,R,_,y,A,k):Iu(u,O,F,m.dash,m.cap,R,_,y,A,H,k),ee&&d.translate(-B,-B)}function Iu(u,f,m,_,y,k,A,O,R,F,H){let B=!1;R!=0&&S.forEach((ee,_e)=>{if(ee.series[0]==u){let he=b[ee.series[1]],re=t[ee.series[1]],Q=(he._paths||Rs).band;mn(Q)&&(Q=ee.dir==1?Q[0]:Q[1]);let G,Ae=null;he.show&&Q&&Yh(re,Ke,Ge)?(Ae=ee.fill(s,_e)||k,G=he._paths.clip):Q=null,Gl(f,m,_,y,Ae,A,O,R,F,H,G,Q),B=!0}}),B||Gl(f,m,_,y,k,A,O,R,F,H)}const Ei=_s|Ho;function Gl(u,f,m,_,y,k,A,O,R,F,H,B){ki(u,f,m,_,y),(R||F||B)&&(d.save(),R&&d.clip(R),F&&d.clip(F)),B?(O&Ei)==Ei?(d.clip(B),H&&d.clip(H),Qs(y,A),Zs(u,k,f)):O&Ho?(Qs(y,A),d.clip(B),Zs(u,k,f)):O&_s&&(d.save(),d.clip(B),H&&d.clip(H),Qs(y,A),d.restore(),Zs(u,k,f)):(Qs(y,A),Zs(u,k,f)),(R||F||B)&&d.restore()}function Zs(u,f,m){m>0&&(f instanceof Map?f.forEach((_,y)=>{d.strokeStyle=Js=y,d.stroke(_)}):f!=null&&u&&d.stroke(f))}function Qs(u,f){f instanceof Map?f.forEach((m,_)=>{d.fillStyle=Bn=_,d.fill(m)}):f!=null&&u&&d.fill(f)}function Nu(u,f,m,_){let y=C[u],k;if(_<=0)k=[0,0];else{let A=y._space=y.space(s,u,f,m,_),O=y._incrs=y.incrs(s,u,f,m,_,A);k=_0(f,m,O,_,A)}return y._found=k}function Yl(u,f,m,_,y,k,A,O,R,F){let H=A%2/2;T==1&&d.translate(H,H),ki(O,A,R,F,O),d.beginPath();let B,ee,_e,he,re=y+(_==0||_==3?-k:k);m==0?(ee=y,he=re):(B=y,_e=re);for(let Q=0;Q<u.length;Q++)f[Q]!=null&&(m==0?B=_e=u[Q]:ee=he=u[Q],d.moveTo(B,ee),d.lineTo(_e,he));d.stroke(),T==1&&d.translate(-H,-H)}function zu(u){let f=!0;return C.forEach((m,_)=>{if(!m.show)return;let y=M[m.scale];if(y.min==null){m._show&&(f=!1,m._show=!1,Wn(!1));return}else m._show||(f=!1,m._show=!0,Wn(!1));let k=m.side,A=k%2,{min:O,max:R}=y,[F,H]=Nu(_,O,R,A==0?ne:j);if(H==0)return;let B=y.distr==2,ee=m._splits=m.splits(s,_,O,R,F,H,B),_e=y.distr==2?ee.map(G=>It[G]):ee,he=y.distr==2?It[ee[1]]-It[ee[0]]:F,re=m._values=m.values(s,m.filter(s,_e,_,H,he),_,H,he);m._rotate=k==2?m.rotate(s,re,_,H):0;let Q=m._size;m._size=Pt(m.size(s,re,_,u)),Q!=null&&m._size!=Q&&(f=!1)}),f}function Vu(u){let f=!0;return $i.forEach((m,_)=>{let y=m(s,_,xn,u);y!=an[_]&&(f=!1),an[_]=y}),f}function Fu(){for(let u=0;u<C.length;u++){let f=C[u];if(!f.show||!f._show)continue;let m=f.side,_=m%2,y,k,A=f.stroke(s,u),O=m==0||m==3?-1:1,[R,F]=f._found;if(f.label!=null){let at=f.labelGap*O,$t=je((f._lpos+at)*ve);Si(f.labelFont[0],A,"center",m==2?Es:qr),d.save(),_==1?(y=k=0,d.translate($t,je(Ct+Rt/2)),d.rotate((m==3?-fl:fl)/2)):(y=je(gt+mt/2),k=$t);let En=Uc(f.label)?f.label(s,u,R,F):f.label;d.fillText(En,y,k),d.restore()}if(F==0)continue;let H=M[f.scale],B=_==0?mt:Rt,ee=_==0?gt:Ct,_e=f._splits,he=H.distr==2?_e.map(at=>It[at]):_e,re=H.distr==2?It[_e[1]]-It[_e[0]]:R,Q=f.ticks,G=f.border,Ae=Q.show?Q.size:0,Oe=je(Ae*ve),Qe=je((f.alignTo==2?f._size-Ae-f.gap:f.gap)*ve),ye=f._rotate*-fl/180,Re=w(f._pos*ve),yt=(Oe+Qe)*O,rt=Re+yt;k=_==0?rt:0,y=_==1?rt:0;let Tt=f.font[0],Nt=f.align==1?ts:f.align==2?mo:ye>0?ts:ye<0?mo:_==0?"center":m==3?mo:ts,Jt=ye||_==1?"middle":m==2?Es:qr;Si(Tt,A,Nt,Jt);let bt=f.font[1]*f.lineGap,Lt=_e.map(at=>w(r(at,H,B,ee))),zt=f._values;for(let at=0;at<zt.length;at++){let $t=zt[at];if($t!=null){_==0?y=Lt[at]:k=Lt[at],$t=""+$t;let En=$t.indexOf(`
`)==-1?[$t]:$t.split(/\n/gm);for(let ct=0;ct<En.length;ct++){let Ki=En[ct];ye?(d.save(),d.translate(y,k+ct*bt),d.rotate(ye),d.fillText(Ki,0,0),d.restore()):d.fillText(Ki,y,k+ct*bt)}}}Q.show&&Yl(Lt,Q.filter(s,he,u,F,re),_,m,Re,Oe,we(Q.width*ve,3),Q.stroke(s,u),Q.dash,Q.cap);let Zt=f.grid;Zt.show&&Yl(Lt,Zt.filter(s,he,u,F,re),_,_==0?2:1,_==0?Ct:gt,_==0?Rt:mt,we(Zt.width*ve,3),Zt.stroke(s,u),Zt.dash,Zt.cap),G.show&&Yl([Re],[1],_==0?1:0,_==0?1:2,_==1?Ct:gt,_==1?Rt:mt,we(G.width*ve,3),G.stroke(s,u),G.dash,G.cap)}Ze("drawAxes")}function Wn(u){b.forEach((f,m)=>{m>0&&(f._paths=null,u&&(l==1?(f.min=null,f.max=null):f.facets.forEach(_=>{_.min=null,_.max=null})))})}let Xs=!1,Jl=!1,ws=[];function Uu(){Jl=!1;for(let u=0;u<ws.length;u++)Ze(...ws[u]);ws.length=0}function qn(){Xs||(cm(Ai),Xs=!0)}function Hu(u,f=!1){Xs=!0,Jl=f,u(s),Ai(),f&&ws.length>0&&queueMicrotask(Uu)}s.batch=Hu;function Ai(){if(Nl&&(Pu(),Nl=!1),Vn&&(Mu(),Vn=!1),Ks){if(Te(v,ts,xe),Te(v,Es,He),Te(v,Ts,ne),Te(v,Ls,j),Te($,ts,xe),Te($,Es,He),Te($,Ts,ne),Te($,Ls,j),Te(h,Ts,Mt),Te(h,Ls,bn),p.width=je(Mt*ve),p.height=je(bn*ve),C.forEach(({_el:u,_show:f,_size:m,_pos:_,side:y})=>{if(u!=null)if(f){let k=y===3||y===0?m:0,A=y%2==1;Te(u,A?"left":"top",_-k),Te(u,A?"width":"height",m),Te(u,A?"top":"left",A?He:xe),Te(u,A?"height":"width",A?j:ne),No(u,Ln)}else wt(u,Ln)}),Js=Bn=Fl=Hl=jl=Bl=Wl=ql=Ul=null,_t=1,xs(!0),xe!=zn||He!=$n||ne!=qt||j!=wn){Wn(!1);let u=ne/qt,f=j/wn;if(Xe&&!kn&&q.left>=0){q.left*=u,q.top*=f,Kn&&Qt(Kn,je(q.left),0,ne,j),Gn&&Qt(Gn,0,je(q.top),ne,j);for(let m=0;m<At.length;m++){let _=At[m];_!=null&&(Hn[m]*=u,jn[m]*=f,Qt(_,Pt(Hn[m]),Pt(jn[m]),ne,j))}}if(Ee.show&&!Gs&&Ee.left>=0&&Ee.width>0){Ee.left*=u,Ee.width*=u,Ee.top*=f,Ee.height*=f;for(let m in no)Te(Zn,m,Ee[m])}zn=xe,$n=He,qt=ne,wn=j}Ze("setSize"),Ks=!1}Mt>0&&bn>0&&(d.clearRect(0,0,p.width,p.height),Ze("drawClear"),D.forEach(u=>u()),Ze("draw")),Ee.show&&Gs&&(el(Ee),Gs=!1),Xe&&kn&&(Cn(null,!0,!1),kn=!1),te.show&&te.live&&Et&&(eo(),Et=!1),a||(a=!0,s.status=1,Ze("ready")),$s=!1,Xs=!1}s.redraw=(u,f)=>{Vn=f||!1,u!==!1?un(E,P.min,P.max):qn()};function Zl(u,f){let m=M[u];if(m.from==null){if(et==0){let _=m.range(s,f.min,f.max,u);f.min=_[0],f.max=_[1]}if(f.min>f.max){let _=f.min;f.min=f.max,f.max=_}if(et>1&&f.min!=null&&f.max!=null&&f.max-f.min<1e-16)return;u==E&&m.distr==2&&et>0&&(f.min=Ft(f.min,t[0]),f.max=Ft(f.max,t[0]),f.min==f.max&&f.max++),W[u]=f,Nl=!0,qn()}}s.setScale=Zl;let Ql,Xl,Kn,Gn,Ti,Li,Yn,Jn,Di,Pi,Ce,Le,cn=!1;const tt=q.drag;let Ye=tt.x,Je=tt.y;Xe&&(q.x&&(Ql=Dt(Ph,$)),q.y&&(Xl=Dt(Oh,$)),P.ori==0?(Kn=Ql,Gn=Xl):(Kn=Xl,Gn=Ql),Ce=q.left,Le=q.top);const Ee=s.select=Ue({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Zn=Ee.show?Dt(Dh,Ee.over?$:v):null;function el(u,f){if(Ee.show){for(let m in u)Ee[m]=u[m],m in no&&Te(Zn,m,u[m]);f!==!1&&Ze("setSelect")}}s.setSelect=el;function ju(u){if(b[u].show)Ne&&No(Se[u],Ln);else if(Ne&&wt(Se[u],Ln),Xe){let m=Un?At[0]:At[u];m!=null&&Qt(m,-10,-10,ne,j)}}function un(u,f,m){Zl(u,{min:f,max:m})}function Gt(u,f,m,_){f.focus!=null&&Gu(u),f.show!=null&&b.forEach((y,k)=>{k>0&&(u==k||u==null)&&(y.show=f.show,ju(k),l==2?(un(y.facets[0].scale,null,null),un(y.facets[1].scale,null,null)):un(y.scale,null,null),qn())}),m!==!1&&Ze("setSeries",u,f),_&&Ms("setSeries",s,u,f)}s.setSeries=Gt;function Bu(u,f){Ue(S[u],f)}function Wu(u,f){u.fill=ce(u.fill||null),u.dir=me(u.dir,-1),f=f??S.length,S.splice(f,0,u)}function qu(u){u==null?S.length=0:S.splice(u,1)}s.addBand=Wu,s.setBand=Bu,s.delBand=qu;function Ku(u,f){b[u].alpha=f,Xe&&At[u]!=null&&(At[u].style.opacity=f),Ne&&Se[u]&&(Se[u].style.opacity=f)}let nn,dn,Mn;const Qn={focus:!0};function Gu(u){if(u!=Mn){let f=u==null,m=Kt.alpha!=1;b.forEach((_,y)=>{if(l==1||y>0){let k=f||y==0||y==u;_._focus=f?null:k,m&&Ku(y,k?1:Kt.alpha)}}),Mn=u,m&&qn()}}Ne&&Fn&&ze(Jr,ue,u=>{q._lock||(Sn(u),Mn!=null&&Gt(null,Qn,!0,Ve.setSeries))});function Yt(u,f,m){let _=M[f];m&&(u=u/ve-(_.ori==1?He:xe));let y=ne;_.ori==1&&(y=j,u=y-u),_.dir==-1&&(u=y-u);let k=_._min,A=_._max,O=u/y,R=k+(A-k)*O,F=_.distr;return F==3?ps(10,R):F==4?Zh(R,_.asinh):F==100?_.bwd(R):R}function Yu(u,f){let m=Yt(u,E,f);return Ft(m,t[0],Ke,Ge)}s.valToIdx=u=>Ft(u,t[0]),s.posToIdx=Yu,s.posToVal=Yt,s.valToPos=(u,f,m)=>M[f].ori==0?o(u,M[f],m?mt:ne,m?gt:0):i(u,M[f],m?Rt:j,m?Ct:0),s.setCursor=(u,f,m)=>{Ce=u.left,Le=u.top,Cn(null,f,m)};function Oi(u,f){Te(Zn,ts,Ee.left=u),Te(Zn,Ts,Ee.width=f)}function Ri(u,f){Te(Zn,Es,Ee.top=u),Te(Zn,Ls,Ee.height=f)}let ks=P.ori==0?Oi:Ri,Ss=P.ori==1?Oi:Ri;function Ju(){if(Ne&&te.live)for(let u=l==2?1:0;u<b.length;u++){if(u==0&&nt)continue;let f=te.values[u],m=0;for(let _ in f)xt[u][m++].firstChild.nodeValue=f[_]}}function eo(u,f){if(u!=null&&(u.idxs?u.idxs.forEach((m,_)=>{pe[_]=m}):tm(u.idx)||pe.fill(u.idx),te.idx=pe[0]),Ne&&te.live){for(let m=0;m<b.length;m++)(m>0||l==1&&!nt)&&Zu(m,pe[m]);Ju()}Et=!1,f!==!1&&Ze("setLegend")}s.setLegend=eo;function Zu(u,f){let m=b[u],_=u==0&&Y==2?It:t[u],y;nt?y=m.values(s,u,f)??Wt:(y=m.value(s,f==null?null:_[f],u,f),y=y==null?Wt:{_:y}),te.values[u]=y}function Cn(u,f,m){Di=Ce,Pi=Le,[Ce,Le]=q.move(s,Ce,Le),q.left=Ce,q.top=Le,Xe&&(Kn&&Qt(Kn,je(Ce),0,ne,j),Gn&&Qt(Gn,0,je(Le),ne,j));let _,y=Ke>Ge;nn=$e,dn=null;let k=P.ori==0?ne:j,A=P.ori==1?ne:j;if(Ce<0||et==0||y){_=q.idx=null;for(let O=0;O<b.length;O++){let R=At[O];R!=null&&Qt(R,-10,-10,ne,j)}Fn&&Gt(null,Qn,!0,u==null&&Ve.setSeries),te.live&&(pe.fill(_),Et=!0)}else{let O,R,F;l==1&&(O=P.ori==0?Ce:Le,R=Yt(O,E),_=q.idx=Ft(R,t[0],Ke,Ge),F=U(t[0][_],P,k,0));let H=-10,B=-10,ee=0,_e=0,he=!0,re="",Q="";for(let G=l==2?1:0;G<b.length;G++){let Ae=b[G],Oe=pe[G],Qe=Oe==null?null:l==1?t[G][Oe]:t[G][1][Oe],ye=q.dataIdx(s,G,_,R),Re=ye==null?null:l==1?t[G][ye]:t[G][1][ye];if(Et=Et||Re!=Qe||ye!=Oe,pe[G]=ye,G>0&&Ae.show){let yt=ye==null?-10:ye==_?F:U(l==1?t[0][ye]:t[G][0][ye],P,k,0),rt=Re==null?-10:K(Re,l==1?M[Ae.scale]:M[Ae.facets[1].scale],A,0);if(Fn&&Re!=null){let Tt=P.ori==1?Ce:Le,Nt=Be(Kt.dist(s,G,ye,rt,Tt));if(Nt<nn){let Jt=Kt.bias;if(Jt!=0){let bt=Yt(Tt,Ae.scale),Lt=Re>=0?1:-1,zt=bt>=0?1:-1;zt==Lt&&(zt==1?Jt==1?Re>=bt:Re<=bt:Jt==1?Re<=bt:Re>=bt)&&(nn=Nt,dn=G)}else nn=Nt,dn=G}}if(Et||Un){let Tt,Nt;P.ori==0?(Tt=yt,Nt=rt):(Tt=rt,Nt=yt);let Jt,bt,Lt,zt,Zt,at,$t=!0,En=lt.bbox;if(En!=null){$t=!1;let ct=En(s,G);Lt=ct.left,zt=ct.top,Jt=ct.width,bt=ct.height}else Lt=Tt,zt=Nt,Jt=bt=lt.size(s,G);if(at=lt.fill(s,G),Zt=lt.stroke(s,G),Un)G==dn&&nn<=Kt.prox&&(H=Lt,B=zt,ee=Jt,_e=bt,he=$t,re=at,Q=Zt);else{let ct=At[G];ct!=null&&(Hn[G]=Lt,jn[G]=zt,sa(ct,Jt,bt,$t),ta(ct,at,Zt),Qt(ct,Pt(Lt),Pt(zt),ne,j))}}}}if(Un){let G=Kt.prox,Ae=Mn==null?nn<=G:nn>G||dn!=Mn;if(Et||Ae){let Oe=At[0];Oe!=null&&(Hn[0]=H,jn[0]=B,sa(Oe,ee,_e,he),ta(Oe,re,Q),Qt(Oe,Pt(H),Pt(B),ne,j))}}}if(Ee.show&&cn)if(u!=null){let[O,R]=Ve.scales,[F,H]=Ve.match,[B,ee]=u.cursor.sync.scales,_e=u.cursor.drag;if(Ye=_e._x,Je=_e._y,Ye||Je){let{left:he,top:re,width:Q,height:G}=u.select,Ae=u.scales[B].ori,Oe=u.posToVal,Qe,ye,Re,yt,rt,Tt=O!=null&&F(O,B),Nt=R!=null&&H(R,ee);Tt&&Ye?(Ae==0?(Qe=he,ye=Q):(Qe=re,ye=G),Re=M[O],yt=U(Oe(Qe,B),Re,k,0),rt=U(Oe(Qe+ye,B),Re,k,0),ks(Ut(yt,rt),Be(rt-yt))):ks(0,k),Nt&&Je?(Ae==1?(Qe=he,ye=Q):(Qe=re,ye=G),Re=M[R],yt=K(Oe(Qe,ee),Re,A,0),rt=K(Oe(Qe+ye,ee),Re,A,0),Ss(Ut(yt,rt),Be(rt-yt))):Ss(0,A)}else so()}else{let O=Be(Di-Ti),R=Be(Pi-Li);if(P.ori==1){let ee=O;O=R,R=ee}Ye=tt.x&&O>=tt.dist,Je=tt.y&&R>=tt.dist;let F=tt.uni;F!=null?Ye&&Je&&(Ye=O>=F,Je=R>=F,!Ye&&!Je&&(R>O?Je=!0:Ye=!0)):tt.x&&tt.y&&(Ye||Je)&&(Ye=Je=!0);let H,B;Ye&&(P.ori==0?(H=Yn,B=Ce):(H=Jn,B=Le),ks(Ut(H,B),Be(B-H)),Je||Ss(0,A)),Je&&(P.ori==1?(H=Yn,B=Ce):(H=Jn,B=Le),Ss(Ut(H,B),Be(B-H)),Ye||ks(0,k)),!Ye&&!Je&&(ks(0,0),Ss(0,0))}if(tt._x=Ye,tt._y=Je,u==null){if(m){if(qi!=null){let[O,R]=Ve.scales;Ve.values[0]=O!=null?Yt(P.ori==0?Ce:Le,O):null,Ve.values[1]=R!=null?Yt(P.ori==1?Ce:Le,R):null}Ms(_o,s,Ce,Le,ne,j,_)}if(Fn){let O=m&&Ve.setSeries,R=Kt.prox;Mn==null?nn<=R&&Gt(dn,Qn,!0,O):nn>R?Gt(null,Qn,!0,O):dn!=Mn&&Gt(dn,Qn,!0,O)}}Et&&(te.idx=_,eo()),f!==!1&&Ze("setCursor")}let fn=null;Object.defineProperty(s,"rect",{get(){return fn==null&&xs(!1),fn}});function xs(u=!1){u?fn=null:(fn=$.getBoundingClientRect(),Ze("syncRect",fn))}function Ii(u,f,m,_,y,k,A){q._lock||cn&&u!=null&&u.movementX==0&&u.movementY==0||(to(u,f,m,_,y,k,A,!1,u!=null),u!=null?Cn(null,!0,!0):Cn(f,!0,!1))}function to(u,f,m,_,y,k,A,O,R){if(fn==null&&xs(!1),Sn(u),u!=null)m=u.clientX-fn.left,_=u.clientY-fn.top;else{if(m<0||_<0){Ce=-10,Le=-10;return}let[F,H]=Ve.scales,B=f.cursor.sync,[ee,_e]=B.values,[he,re]=B.scales,[Q,G]=Ve.match,Ae=f.axes[0].side%2==1,Oe=P.ori==0?ne:j,Qe=P.ori==1?ne:j,ye=Ae?k:y,Re=Ae?y:k,yt=Ae?_:m,rt=Ae?m:_;if(he!=null?m=Q(F,he)?r(ee,M[F],Oe,0):-10:m=Oe*(yt/ye),re!=null?_=G(H,re)?r(_e,M[H],Qe,0):-10:_=Qe*(rt/Re),P.ori==1){let Tt=m;m=_,_=Tt}}R&&(f==null||f.cursor.event.type==_o)&&((m<=1||m>=ne-1)&&(m=An(m,ne)),(_<=1||_>=j-1)&&(_=An(_,j))),O?(Ti=m,Li=_,[Yn,Jn]=q.move(s,m,_)):(Ce=m,Le=_)}const no={width:0,height:0,left:0,top:0};function so(){el(no,!1)}let Ni,zi,Vi,Fi;function Ui(u,f,m,_,y,k,A){cn=!0,Ye=Je=tt._x=tt._y=!1,to(u,f,m,_,y,k,A,!0,!1),u!=null&&(ze(vo,Ro,Hi,!1),Ms(Gr,s,Yn,Jn,ne,j,null));let{left:O,top:R,width:F,height:H}=Ee;Ni=O,zi=R,Vi=F,Fi=H}function Hi(u,f,m,_,y,k,A){cn=tt._x=tt._y=!1,to(u,f,m,_,y,k,A,!1,!0);let{left:O,top:R,width:F,height:H}=Ee,B=F>0||H>0,ee=Ni!=O||zi!=R||Vi!=F||Fi!=H;if(B&&ee&&el(Ee),tt.setScale&&B&&ee){let _e=O,he=F,re=R,Q=H;if(P.ori==1&&(_e=R,he=H,re=O,Q=F),Ye&&un(E,Yt(_e,E),Yt(_e+he,E)),Je)for(let G in M){let Ae=M[G];G!=E&&Ae.from==null&&Ae.min!=$e&&un(G,Yt(re+Q,G),Yt(re,G))}so()}else q.lock&&(q._lock=!q._lock,Cn(f,!0,u!=null));u!=null&&(st(vo,Ro),Ms(vo,s,Ce,Le,ne,j,null))}function Qu(u,f,m,_,y,k,A){if(q._lock)return;Sn(u);let O=cn;if(cn){let R=!0,F=!0,H=10,B,ee;P.ori==0?(B=Ye,ee=Je):(B=Je,ee=Ye),B&&ee&&(R=Ce<=H||Ce>=ne-H,F=Le<=H||Le>=j-H),B&&R&&(Ce=Ce<Yn?0:ne),ee&&F&&(Le=Le<Jn?0:j),Cn(null,!0,!0),cn=!1}Ce=-10,Le=-10,pe.fill(null),Cn(null,!0,!0),O&&(cn=O)}function ji(u,f,m,_,y,k,A){q._lock||(Sn(u),Vl(),so(),u!=null&&Ms(Zr,s,Ce,Le,ne,j,null))}function Bi(){C.forEach(v0),zl(s.width,s.height,!0)}On(yl,cs,Bi);const Xn={};Xn.mousedown=Ui,Xn.mousemove=Ii,Xn.mouseup=Hi,Xn.dblclick=ji,Xn.setSeries=(u,f,m,_)=>{let y=Ve.match[2];m=y(s,f,m),m!=-1&&Gt(m,_,!0,!1)},Xe&&(ze(Gr,$,Ui),ze(_o,$,Ii),ze(Yr,$,u=>{Sn(u),xs(!1)}),ze(Jr,$,Qu),ze(Zr,$,ji),jo.add(s),s.syncRect=xs);const tl=s.hooks=e.hooks||{};function Ze(u,f,m){Jl?ws.push([u,f,m]):u in tl&&tl[u].forEach(_=>{_.call(null,s,f,m)})}(e.plugins||[]).forEach(u=>{for(let f in u.hooks)tl[f]=(tl[f]||[]).concat(u.hooks[f])});const Wi=(u,f,m)=>m,Ve=Ue({key:null,setSeries:!1,filters:{pub:aa,sub:aa},scales:[E,b[1]?b[1].scale:null],match:[ca,ca,Wi],values:[null,null]},q.sync);Ve.match.length==2&&Ve.match.push(Wi),q.sync=Ve;const qi=Ve.key,lo=du(qi);function Ms(u,f,m,_,y,k,A){Ve.filters.pub(u,f,m,_,y,k,A)&&lo.pub(u,f,m,_,y,k,A)}lo.sub(s);function Xu(u,f,m,_,y,k,A){Ve.filters.sub(u,f,m,_,y,k,A)&&Xn[u](null,f,m,_,y,k,A)}s.pub=Xu;function ed(){lo.unsub(s),jo.delete(s),qe.clear(),zo(yl,cs,Bi),c.remove(),ue==null||ue.remove(),Ze("destroy")}s.destroy=ed;function oo(){Ze("init",e,t),wi(t||e.data,!1),W[E]?Zl(E,W[E]):Vl(),Gs=Ee.show&&(Ee.width>0||Ee.height>0),kn=Et=!0,zl(e.width,e.height)}return b.forEach(bi),C.forEach(Du),n?n instanceof HTMLElement?(n.appendChild(c),oo()):n(s,oo):oo(),s}it.assign=Ue;it.fmtNum=ri;it.rangeNum=bl;it.rangeLog=Tl;it.rangeAsinh=oi;it.orient=Nn;it.pxRatio=ve;it.join=am;it.fmtDate=ci,it.tzDate=ym;it.sync=du;{it.addGap=t0,it.clipGaps=Pl;let e=it.paths={points:vu};e.linear=yu,e.stepped=l0,e.bars=o0,e.spline=r0}function g0(e){let t;return{hooks:{init(n){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",n.over.appendChild(t)},setCursor(n){const s=n.cursor.idx;if(s==null||!n.data[1]||n.data[1][s]==null){t.style.display="none";return}const l=n.data[0][s],o=n.data[1][s],i=new Date(l*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):vt(o)}</b> ${i}`;const r=Math.round(n.valToPos(l,"x"));t.style.left=Math.min(r,n.over.clientWidth-80)+"px",t.style.display=""}}}}function y0(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const n=document.createElement("span");n.style.color=e,document.body.appendChild(n);const s=getComputedStyle(n).color;n.remove();const l=s.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function b0({data:e,color:t,smooth:n,height:s,yMax:l,fmtVal:o,ariaLabel:i,ariaHidden:r}){const a=J(null),c=J(null),p=s||55;return ae(()=>{if(!a.current||!e||e[0].length<2)return;const d=n?Bd(e[1]):e[1],h=[e[0],d];if(c.current){c.current.setData(h);return}const v=l?(T,w,x)=>[0,Math.max(l,x*1.05)]:(T,w,x)=>[Math.max(0,w*.9),x*1.1],$={width:a.current.clientWidth||200,height:p,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:v}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:Ud(t),width:1.5,fill:y0(t,.09)}],plugins:[g0(o)]};return c.current=new it($,h,a.current),()=>{c.current&&(c.current.destroy(),c.current=null)}},[e,t,n]),ae(()=>{if(!c.current||!a.current)return;const d=new ResizeObserver(()=>{c.current&&a.current&&c.current.setSize({width:a.current.clientWidth,height:p})});return d.observe(a.current),()=>d.disconnect()},[]),g`<div class="chart-wrap"
    role=${r?null:"img"}
    aria-hidden=${r?"true":null}
    aria-label=${r?null:i||"Sparkline chart"}
    style=${"height:"+p+"px"} ref=${a}></div>`}function $0(e){if(!e||!e[1])return null;const t=e[1].filter(l=>l!=null&&!isNaN(l));if(t.length<2)return null;const n=t[0],s=t[t.length-1];if(n>0){const l=(s-n)/n*100;return Math.abs(l)<1?null:{dir:l>0?"▲":"▼",pct:Math.round(Math.abs(l))}}return s>0?{dir:"▲",pct:null}:null}function w0({label:e,value:t,valColor:n,data:s,chartColor:l,smooth:o,refLines:i,yMax:r,dp:a,iconName:c}){const p=Me(()=>{if(!s||!s[1]||s[1].length<2)return[];const h=r?Math.max(r,s[1].reduce((v,$)=>Math.max(v,$),0)*1.05):s[1].reduce((v,$)=>Math.max(v,$),0)*1.1;return(i||[]).map(v=>{if(h<=0)return null;const $=(1-v.value/h)*100;return $>=0&&$<=95?{...v,pct:$}:null}).filter(Boolean)},[s,i,r]),d=Me(()=>$0(s),[s]);return g`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${a?{"data-dp":a}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${c?g`<${Bt} name=${c} size="0.85em"/> `:""}${e}</span>
      <span class="chart-val-group">
        ${d?g`<span class="chart-trend" aria-hidden="true">${d.dir}${d.pct!=null?" "+d.pct+"%":""}</span>`:""}
        <span class="chart-val" style=${n?"color:"+n:null} aria-live="polite" aria-atomic="true">${t}</span>
      </span>
    </div>
    <div style="position:relative">
      ${p.map((h,v)=>g`<${gn} key=${h.label??v}>
          <div class="chart-ref-line" style=${"top:"+h.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+h.pct+"% - 8px)"}>${h.label}</div>
        </${gn}>`)}
      ${s&&s[0].length>=2?g`<${b0} data=${s} color=${l||"var(--accent)"} smooth=${o} yMax=${r} ariaHidden=${!0}/>`:g`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:var(--fs-base)">collecting...</div>`}
    </div>
  </div>`}function k0({pct:e,direction:t,inverse:n=!1,compareLabel:s}){if(e==null||t==null)return null;const l=t==="flat"||e===0,o=l?"•":t==="up"?"▲":"▼";let i="neutral";l||(i=(n?t==="down":t==="up")?"success":"danger");const r=Number.isFinite(e)?Math.abs(e).toFixed(Math.abs(e)>=10?0:1):"0",a=g`<${Ir} variant=${i} size="sm"
    aria-label=${"Delta: "+o+" "+r+"%"+(s?" vs "+s:"")}
  >${o} ${r}%</${Ir}>`;return s?g`<${Nr} content=${"vs. "+s}>${a}</${Nr}>`:a}function Wo({label:e,value:t,accent:n,dp:s,sm:l,delta:o,deltaInverse:i}){const r=J(t),[a,c]=X(!1);return ae(()=>{r.current!==t&&(c(!0),setTimeout(()=>c(!1),500)),r.current=t},[t]),g`<div class=${"metric"+(l?" metric--sm":"")} aria-label="${e}: ${t}" ...${s?{"data-dp":s}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(n?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
    ${o?g`<div class="metric-delta"><${k0}
      pct=${o.pct} direction=${o.direction}
      inverse=${i} compareLabel=${o.compareLabel}/></div>`:null}
  </div>`}function La({snap:e,mode:t}){if(!e)return null;const n=!t||t==="files",s=!t||t==="traffic",l=e.tools.filter(c=>{var p;return c.tool!=="aictl"&&((p=c.files)==null?void 0:p.length)}),o=l.reduce((c,p)=>c+p.files.length,0)||1,i=c=>(Number(c.live.outbound_rate_bps)||0)+(Number(c.live.inbound_rate_bps)||0),r=e.tools.filter(c=>c.tool!=="aictl"&&c.live&&i(c)>0),a=r.reduce((c,p)=>c+i(p),0)||1;return g`
    ${n&&l.length>0&&g`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+l.map(c=>c.label+" "+c.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${l.map(c=>g`
        <div class="rbar-seg" style=${"width:"+(c.files.length/o*100).toFixed(1)+"%;background:"+(ss[c.tool]||"var(--fg2)")}
          title="${c.label}: ${c.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${l.map(c=>g`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(ss[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${c.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${s&&g`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(r.length?r.map(c=>c.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${r.length===0?" — no active traffic":""}</div>
      <div class="rbar">${r.map(c=>{const p=i(c);return g`<div class="rbar-seg" style=${"width:"+(p/a*100).toFixed(1)+"%;background:"+(ss[c.tool]||"var(--fg2)")}
          title="${c.label}: ${Ao(p)}"></div>`})}
      </div>
      <div class="rbar-legend">${r.map(c=>{const p=i(c);return g`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(ss[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${Ao(p)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!l.length&&!r.length&&g`<div class="empty-state">
      No AI tool resources found yet.
      <small class="empty-state-source">/api/snapshot · tools[].files · tools[].live</small>
    </div>`}`}const S0=18e4;function x0({loading:e,error:t,data:n,isEmpty:s,updatedAt:l,staleMs:o=S0,now:i=Date.now()}){return n!=null?s&&s(n)?t?"error":"empty":t||l&&i-l>o?"stale":"ready":t?"error":e?"loading":"empty"}function M0(e){return e&&(typeof e=="string"?e:e.message)||"The request failed."}function _n({status:e,error:t,updatedAt:n,onRetry:s,emptyTitle:l="No data",emptyHint:o,emptyFix:i,skeletonHeight:r="72px",label:a,children:c}){if(e==="loading")return g`<div class="panel-state panel-state--loading" role="status" aria-busy="true"
      aria-label=${"Loading "+(a||"panel")}>
      <${as} height=${r} radius="var(--radius-sm)"/>
    </div>`;if(e==="error")return g`<div class="panel-state panel-state--error" role="alert">
      <${Bt} name="alert-triangle" size="14"/>
      <div>
        <div class="panel-state__title">Could not load ${a||"this panel"}</div>
        <div class="panel-state__hint">${M0(t)}</div>
      </div>
      ${s&&g`<button type="button" class="range-btn" onClick=${s}>Retry</button>`}
    </div>`;if(e==="empty")return g`<div class="panel-state panel-state--empty" role="status">
      <div class="panel-state__title">${l}</div>
      ${o&&g`<div class="panel-state__hint">${o}</div>`}
      ${i&&g`<code class="panel-state__fix">${i}</code>`}
    </div>`;const p=n?Math.max(0,Math.round((Date.now()-n)/1e3)):null;return g`
    ${e==="stale"&&g`<div class="panel-state panel-state--stale" role="status">
      <${Bt} name="clock" size="12"/>
      <span>${t?"Refresh failed. ":""}Showing data from ${p!=null?Qo(p)+" ago":"an earlier fetch"}.</span>
      ${s&&g`<button type="button" class="panel-state__retry" onClick=${s}>Retry</button>`}
    </div>`}
    ${c}`}function C0({enabledTools:e,snap:t,what:n="this screen"}){const s=Kp(e),l=sh(e,t);return g`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${Bt} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${s?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${s?`The tool filter in the header has no tool ticked, so ${n} shows nothing. Tick a tool, or choose All tools.`:`${l.join(", ")} ${l.length===1?"has":"have"} nothing to show on ${n}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function E0({perCore:e}){if(!e||!e.length)return null;const t=100;return g`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((n,s)=>{const l=Math.max(1,n/t*100),o=n>80?"var(--red)":n>50?"var(--orange)":n>20?"var(--green)":"var(--fg2)";return g`<div key=${s} title=${"Core "+s+": "+Pn(n)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+l+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function A0({mcpDetail:e}){return e!=null&&e.length?g`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{const n=Id[t.status]||"var(--fg3)";return g`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${n}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${is(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${Hd(t.tool)};white-space:nowrap;flex-shrink:0">${is(t.tool)}</span>
      </div>`})}
  </div>`:g`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`}function T0({label:e,value:t,mcpDetail:n}){const[s,l]=X(!1);return g`<div style="position:relative;cursor:default"
    tabindex="0"
    onMouseEnter=${()=>l(!0)} onMouseLeave=${()=>l(!1)}
    onFocusIn=${()=>l(!0)} onFocusOut=${()=>l(!1)}>
    <${Wo} label=${e} value=${t} sm=${!0}/>
    ${s&&g`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      <${A0} mcpDetail=${n}/>
    </div>`}
  </div>`}const L0=new Set(["cpu","mem_mb","tokens"]);function D0({snap:e,history:t,enabledTools:n=null}){const s=Hs(n),l=Me(()=>s&&e?{...e,...nf(e)}:e,[s,e]),o=Me(()=>sf(t,n),[t,n]),[i,r]=X(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),a=se(()=>{r(h=>{const v=!h;try{localStorage.setItem("aictl-header-expanded",String(v))}catch{}return v})},[]),c=h=>o!=null&&o.ts&&o.ts.length>=2&&(!s||L0.has(h))?[o.ts,o[h]]:null,p=(l==null?void 0:l.cpu_cores)||1,d={cores:p};return s&&!((l==null?void 0:l.tools)||[]).some(h=>h.tool!=="aictl")?g`<${C0} enabledTools=${n} snap=${l} what="the overview totals"/>`:g`
    <div class="grid-sparklines">
      ${Ps.sparklines.map(h=>{const v=l?l["total_"+h.field]??l[h.field]??"":"",$=co(v,h.format,h.suffix,h.multiply),T=h.yMaxExpr?yr(h.yMaxExpr,d):void 0,w=(h.refLines||[]).map(x=>({value:yr(x.valueExpr,d),label:(x.label||"").replace("{cores}",p)})).filter(x=>x.value!=null);return g`<${w0} key=${h.field} label=${h.label} value=${$}
          data=${c(h.field)} chartColor=${h.color||"var(--accent)"}
          smooth=${!!h.smooth} refLines=${w.length?w:void 0}
          yMax=${T} dp=${h.dp} iconName=${h.iconName}/>`})}
    </div>

    <div class=${i?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>
      <div class="mb-sm header-top-row">
        <div>
          <div class="metric-group-label">CPU Cores${s?" (whole machine, all tools)":""}</div>
          <${E0} perCore=${(l==null?void 0:l.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${La} snap=${l} mode="traffic"/></div>
        </div>
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${Ps.liveMetrics.map(h=>{const v=l?l[h.field]??"":"",$=co(v,h.format,h.suffix,h.multiply);return g`<${Wo} key=${h.field} label=${h.label} value=${$}
                accent=${!!h.accent} dp=${h.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div class="grid-inventory">
          ${Ps.inventory.map(h=>{const v=l?l[h.field]??"":"",$=co(v,h.format,h.suffix,h.multiply);return h.field==="total_mcp_servers"?g`<${T0} key=${h.field} label=${h.label} value=${$}
                mcpDetail=${(l==null?void 0:l.mcp_detail)||[]}/>`:g`<${Wo} key=${h.field} label=${h.label} value=${$}
              accent=${!!h.accent} dp=${h.dp} sm=${!0}/>`})}
        </div>
      </div>
      <div class="mb-sm"><${La} snap=${l} mode="files"/></div>
    </div>
    <button class="header-toggle" onClick=${a} aria-label="Toggle details"
      aria-expanded=${i}>
      <span aria-hidden="true">${i?"▲":"▼"}</span> ${i?"less":"more"}
    </button>
  `}const Da={error:0,warn:1,info:2};function Pa(e,t){if(e==="claude-code")return`aictl hooks install --port ${t}`;const n=["copilot","gemini","codex"].find(s=>String(e).startsWith(s));return`aictl enable${n?" --tool "+n:""} --port ${t}`}function Oa(e){return String(e||"").split("-")[0]}function P0(e,t,n=null){var i,r,a;if(!(e!=null&&e.tools))return[];const s=[],l=e.server_port,o=t?new Set([...t].map(Oa)):null;for(const c of Object.values(e.tools))if(jt(c.tool,n)){if(c.status==="missing"){if(o&&!o.has(Oa(c.tool)))continue;const p=Pa(c.tool,l);s.push({id:"hooks:"+c.tool,level:"warn",title:`${c.tool}: hooks not installed`,detail:"No per-tool-call events, so the tool, skill and subagent panels stay empty.",fix:p})}else if(c.status==="disabled"){const p=((i=(c.sources||[]).find(d=>d.host_reason&&!d.host_enabled))==null?void 0:i.host_reason)||"The host tool has hooks turned off.";s.push({id:"hooks:"+c.tool,level:"warn",title:`${c.tool}: hooks disabled by host`,detail:p,fix:p.startsWith("chat.hookFilesLocations")?`Set ${p.replace(/ is false$/,"")} to true in VS Code settings`:null})}else if(c.status==="misconfigured"||c.status==="fail"){const p=(r=c.warnings)==null?void 0:r[0],d=((a=c.warnings)==null?void 0:a.length)>1?`, +${c.warnings.length-1} more`:"";s.push({id:"hooks:"+c.tool,level:"error",title:`${c.tool}: hooks misconfigured`,detail:p?`${p.message} (${p.path}${d})`:"Hook checks failed.",fix:Pa(c.tool,l)})}}return!Hs(n)&&e.total_configured>0&&e.total_fired_24h===0&&s.length===0&&s.push({id:"hooks:silent",level:"warn",title:`${e.total_configured} hooks configured, 0 fired in 24 h`,detail:"Hooks are installed but no event has reached this dashboard.",fix:null}),s}function O0(e){const t=[];for(const n of(e==null?void 0:e.items)||[])n.status==="ok"||n.severity==="info"||n.status!=="source_missing"&&t.push({id:"quality:"+n.component,level:n.severity==="error"?"error":"warn",title:`${n.component}: ${n.status}`,detail:n.message+(n.source?` (${n.source})`:""),fix:null});return t}function R0({connected:e,snapAgeS:t,hooks:n,quality:s,otelActive:l,alerts:o=[],storage:i=null,hiddenContext:r,runningTools:a=null,enabledTools:c=null}){const p=[];(r==null?void 0:r.count)>0?p.push({id:"hidden-context",level:"warn",tab:"hidden",title:`${r.count} unseen context source${r.count===1?"":"s"} found`,detail:r.detail||"Text reaches a model without appearing in its visible configuration.",fix:null}):r===null&&p.push({id:"hidden-context",level:"info",tab:"hidden",title:"Hidden context not checked",detail:"No detector has reported for this build.",fix:null}),i!=null&&i.degraded?p.push({id:"storage",level:"error",title:"Storage degraded: capture is being reduced",detail:`${wl(i)}. New data may lose text or be dropped until disk use is under budget.`,fix:null}):(i==null?void 0:i.pct)>=90&&p.push({id:"storage",level:"warn",title:`Storage at ${i.pct}% of budget`,detail:wl(i),fix:null}),e===!1?p.push({id:"sse",level:"error",title:"Live stream disconnected",detail:"Figures show the last received values. Retrying automatically.",fix:"aictl daemon serve"}):t!=null&&t>60&&p.push({id:"stale",level:"warn",title:`Snapshot is ${Math.round(t)} s old`,detail:"The stream is connected but the collector stopped publishing.",fix:"aictl doctor"});for(const d of o)p.push({id:"alert:"+d.msg,level:d.level==="red"?"error":"warn",title:d.msg,detail:"The Processes tab lists the affected PIDs.",fix:null,tab:"procs"});return p.push(...P0(n,a,c),...O0(s)),l===!1&&p.push({id:"otel",level:"info",title:"OTel receiver has no data",detail:"Exact token and cost figures need it. Estimates are used until then.",fix:"aictl otel enable"}),p.sort((d,h)=>Da[d.level]-Da[h.level])}function _i(e){var s;if(!e)return null;const t=e.storage_bytes??((s=e.db)==null?void 0:s.file_size_bytes)??null,n=e.storage_budget_bytes||null;return{mode:e.capture_mode||null,used:t,budget:n,pct:t!=null&&n?Math.round(t/n*100):null,degraded:!!e.storage_degraded}}function wl(e){if(!e||e.used==null)return"Disk use not reported";const t=Ht(e.used);return e.budget?`${t} of ${Ht(e.budget)} (${e.pct}%)`:`${t}, no budget set`}function I0(e,t){return((e==null?void 0:e.sessions)||[]).filter(s=>s.tool&&jt(s.tool,t)).sort((s,l)=>(l.cpu_percent||0)-(s.cpu_percent||0)||(l.last_seen_at||0)-(s.last_seen_at||0))}function N0(e){return/^[^:]+:\d+:\d+$/.test((e==null?void 0:e.session_id)||"")}function z0(e){const t=e.filter(N0).length,n=e.length-t,s=new Set(e.map(r=>r.tool)).size,l=`process tree${t===1?"":"s"}`,o=`session${n===1?"":"s"}`;return`${t&&n?`${n} ${o} and ${t} ${l}`:t?l:o} in ${s} tool${s===1?"":"s"}`}function V0(e){if(!(e.process_tree||[]).length)return e.mem_mb||0;let t=0;const n=s=>{for(const l of s||[])t+=l.mem_mb||0,n(l.children)};return n(e.process_tree),t}const ku="No price is known for this usage.";function qo(e,t=2){return"$"+Number(e).toLocaleString(void 0,{minimumFractionDigits:t,maximumFractionDigits:t})}function Ra(e){return Number(e).toLocaleString(void 0,{maximumFractionDigits:2})}function Su(e){return String(e||"").replace(/_/g," ").replace(/^ai\b/i,"AI")}function F0(e,t=2){const n=(e==null?void 0:e.cost_reason)||"";if(e!=null&&e.billing_unit&&e.billing_amount!==null&&e.billing_amount!==void 0){const s=[];return e.premium_requests&&s.push(Ra(e.premium_requests)+" premium requests"),e.estimated_list_usd!==null&&e.estimated_list_usd!==void 0&&s.push("est. "+qo(e.estimated_list_usd,t)+" at list price"),{main:Ra(e.billing_amount)+" "+Su(e.billing_unit),sub:s.join(", "),title:n,kind:"billing"}}return(e==null?void 0:e.cost_usd)===null||(e==null?void 0:e.cost_usd)===void 0?{main:"n/a",sub:"",title:n||ku,kind:"none"}:{main:qo(e.cost_usd,t),sub:"est.",title:n||"Estimated from token counts and list prices. Not a billed amount.",kind:"estimate"}}function U0({row:e,digits:t=2,showSub:n=!0}){const s=F0(e,t);return g`<span class=${"cost-value cost-value--"+s.kind} title=${s.title}>${s.main}${n&&s.sub?g` <small class="cost-value__sub">${s.sub}</small>`:null}</span>`}function H0(e,t){const n=((e==null?void 0:e.tools)||[]).filter(a=>jt(a.tool,t)).filter(a=>a.counted_in_totals!==!1),s=new Map;let l=0,o=null,i=0;const r=new Set;for(const a of n){if(a.billing_unit&&a.billing_amount!==null&&a.billing_amount!==void 0){s.set(a.billing_unit,(s.get(a.billing_unit)||0)+a.billing_amount),l+=a.premium_requests||0;continue}if(a.cost_usd===null||a.cost_usd===void 0){i+=1,a.cost_reason&&r.add(a.cost_reason);continue}o=(o||0)+a.cost_usd}return{rows:n.slice().sort((a,c)=>(c.total_tokens||0)-(a.total_tokens||0)),billed:[...s.entries()].map(([a,c])=>({unit:a,amount:c})),premium:l,listUsd:o,unpriced:i,unpricedReason:[...r].join(" "),tokens:n.reduce((a,c)=>a+(c.total_tokens||0),0),sessions:n.reduce((a,c)=>a+(c.sessions||0),0)}}function Gv(e){var s;const t=(e||[]).filter(l=>l.cost_usd!==null&&l.cost_usd!==void 0);if(!t.length)return{cost_usd:null,cost_reason:(s=e==null?void 0:e.find(l=>l.cost_reason))==null?void 0:s.cost_reason};const n=e.length-t.length;return{cost_usd:t.reduce((l,o)=>l+o.cost_usd,0),cost_reason:n?`${n} of ${e.length} rows have no known price and are not included.`:""}}function j0(e){return Array.isArray(e==null?void 0:e.tools)&&e.tools.length?e.tools:e!=null&&e.tool?[e.tool]:[]}function B0(e,t){const n=j0(e);return!n.length||n.some(s=>jt(s,t))}function W0(e,t){if(!e||!Hs(t))return e;const n=c=>jt(c==null?void 0:c.tool,t),s=(e.sources||[]).filter(n),l=(e.findings||[]).filter(c=>B0(c,t)),o={high:0,medium:0,low:0,info:0};for(const c of l)c.severity in o&&(o[c.severity]+=1);const i=Object.fromEntries(Object.entries(e.sources_per_tool||{}).filter(([c])=>jt(c,t))),r=e.drift&&!e.drift.baseline_created?{...e.drift,new:(e.drift.new||[]).filter(n),changed:(e.drift.changed||[]).filter(n),removed:(e.drift.removed||[]).filter(n)}:e.drift,a=e.effective_models?Object.fromEntries(Object.entries(e.effective_models).filter(([c,p])=>jt((p==null?void 0:p.tool)||c,t))):e.effective_models;return{...e,sources:s,findings:l,counts:o,sources_per_tool:i,drift:r,effective_models:a,unattributed:(e.unattributed||[]).filter(n)}}const kl=Object.assign({"./HiddenContextPanel.js":()=>ft(()=>import("./HiddenContextPanel-DfAQ9Mzn.js"),__vite__mapDeps([0,1]))})["./HiddenContextPanel.js"],Ia=kl?pt(kl):null;async function q0(e=null){if(!kl)return null;const t=await kl();if(t.getHiddenContextSummary)return t.getHiddenContextSummary(e);try{return K0(W0(await ie("/api/context-audit"),e))}catch{return null}}function K0(e){if(!(e!=null&&e.counts))return null;const t=["high","medium","low"].filter(n=>e.counts[n]).map(n=>`${e.counts[n]} ${n}`);return{count:["high","medium","low"].reduce((n,s)=>n+(e.counts[s]||0),0),detail:t.length?`Findings by severity: ${t.join(", ")}.`:""}}function G0(){return Ia?g`<${Dn} fallback=${g`<${_n} status="loading" label="hidden context"/>`}>
    <${Ia}/>
  </${Dn}>`:g`<section class="now-panel" data-slot="hidden-context" aria-label="Hidden context">
      <${_n} status="empty" emptyTitle="Hidden context detection is not in this build"
        emptyHint="This view lists prompts and context sources that reach a model without appearing in its visible configuration. Rebuild the dashboard once the detector ships."/>
    </section>`}const Na=8;function Y0({snap:e,enabledTools:t,onOpenSession:n,onShowAll:s}){const l=Me(()=>I0(e,t),[e,t]);return g`<section class="now-panel now-panel--running" aria-labelledby="now-running">
    <header class="now-panel__head">
      <h2 id="now-running">Running now</h2>
      ${!rs(e,t)&&g`<span class="now-panel__figure">${l.length}</span>
      <span class="now-panel__sub">${z0(l)}</span>`}
    </header>
    ${l.length===0?g`<${_n} status="empty" label="running sessions"
          emptyTitle=${rs(e,t)?"Not available from this machine":t?"No sessions for the selected tools":"No live sessions"}
          emptyHint=${rs(e,t)?"The selected tool runs in the vendor's cloud and has no local sessions.":t?"Widen the tool filter, or start a session in one of the selected tools.":"Start an AI coding tool. Sessions appear here within one sample interval."}/>`:g`<div class="now-table-wrap"><table class="now-table">
          <thead><tr>
            <th scope="col">Tool</th><th scope="col">Project</th>
            <th scope="col" class="num">Age</th><th scope="col" class="num">CPU</th>
            <th scope="col" class="num">RAM</th><th scope="col" class="num">Tokens</th>
          </tr></thead>
          <tbody>
            ${l.slice(0,Na).map(o=>{const i=(o.exact_input_tokens||0)+(o.exact_output_tokens||0),r=V0(o);return g`<tr key=${o.session_id}>
                <td class="now-table__tool"><${El} tool=${o.tool} size="1em"/> ${o.label||ds(o.tool,e)}</td>
                <td class="now-table__project">
                  <button type="button" class="now-link" title=${(o.project||"no project")+`
`+o.session_id}
                    onClick=${()=>n(o.session_id,o.tool)}>${rc(o.project)||"no project"}</button>
                </td>
                <td class="num">${Qo(o.duration_s||0)}</td>
                <td class="num">${Pn(o.cpu_percent||0)}</td>
                <td class="num">${r?Ht(r*1048576):"-"}</td>
                <td class="num" title=${i?i.toLocaleString()+" exact tokens":"No exact token data for this session"}>${i?vt(i):"-"}</td>
              </tr>`})}
          </tbody>
        </table></div>
        ${l.length>Na&&g`<button type="button" class="now-link now-panel__more" onClick=${s}>
          Show all ${l.length} sessions</button>`}`}
  </section>`}function J0({onOpenBudget:e,cloudScope:t,enabledTools:n,snap:s}){const l=ls(()=>Ed({since:Date.now()/1e3-86400}),[],{pollMs:6e4}),o=Me(()=>H0(l.data,n),[l.data,n]),i=x0({...l,data:l.data?o.rows:null,isEmpty:a=>!a.length});if(t)return g`<section class="now-panel" aria-labelledby="now-cost">
      <header class="now-panel__head"><h2 id="now-cost">Cost, last 24 h</h2></header>
      <${_n} status="empty" emptyTitle="Not available from this machine"
        emptyHint="The selected tool is billed and metered in the vendor's cloud, so no local token counts exist to estimate from."/>
    </section>`;const r=o.billed.length>0||o.listUsd!==null;return g`<section class="now-panel" aria-labelledby="now-cost">
    <header class="now-panel__head">
      <h2 id="now-cost">Cost, last 24 h</h2>
      ${l.data&&o.billed.map(a=>g`<span key=${a.unit} class="now-panel__figure">${a.amount.toLocaleString(void 0,{maximumFractionDigits:2})}<small class="now-panel__unit"> ${Su(a.unit)}</small></span>`)}
      ${l.data&&o.listUsd!==null&&g`<span class="now-panel__figure" title=${Vf}>${qo(o.listUsd)}<small class="now-panel__unit"> est.</small></span>`}
      ${l.data&&!r&&o.rows.length>0&&g`<span class="now-panel__figure" title=${o.unpricedReason||ku}>n/a</span>`}
    </header>
    <${_n} status=${i} error=${l.error} updatedAt=${l.updatedAt} onRetry=${l.reload}
      label="cost" emptyTitle=${n?"No recorded usage for the selected tools in the last 24 h":"No recorded usage in the last 24 h"}
      emptyHint="Usage comes from per-request telemetry. Turn on the OTel receiver if a tool is running but nothing shows."
      emptyFix="aictl otel enable">
      <div class="now-panel__sub">${vt(o.tokens)} tokens, ${o.sessions} sessions${o.listUsd!==null?". Dollar figures are list-price estimates, not billed amounts.":""}${o.unpriced?` ${o.unpriced} tool${o.unpriced===1?" has":"s have"} no known price.`:""}</div>
      <table class="now-table now-table--plain">
        <tbody>${o.rows.slice(0,5).map(a=>g`<tr key=${a.tool}>
          <td class="now-table__project" title=${(a.tokens_source||[]).length?"Tokens from "+a.tokens_source.join(", ")+(a.tokens_quality?" ("+a.tokens_quality+")":""):a.tokens_reason||""}><${El} tool=${a.tool} size="1em"/> ${ds(a.tool,s)}</td>
          <td class="num">${vt(a.total_tokens||0)}</td>
          <td class="num"><${U0} row=${a}/></td>
        </tr>`)}</tbody>
      </table>
      <button type="button" class="now-link now-panel__more" onClick=${e}>Open budget</button>
    </${_n}>
  </section>`}function Z0({command:e}){const[t,n]=X(!1);if(!e)return null;const s=e.startsWith("aictl ");return g`<div class="now-issue__fix">
    <code>${e}</code>
    ${s&&g`<button type="button" class="now-link" onClick=${()=>{var o;try{(o=navigator.clipboard)==null||o.writeText(e),n(!0),setTimeout(()=>n(!1),1500)}catch{}}}
      aria-label=${"Copy command: "+e}>${t?"Copied":"Copy"}</button>`}
  </div>`}function Q0({selfStatus:e}){const t=_i(e);return t?g`<div class=${"now-storage"+(t.degraded?" is-degraded":"")}>
    <span>Capture <strong>${t.mode||"not reported"}</strong></span>
    <span>Disk <strong>${wl(t)}</strong></span>
    ${t.pct!=null&&g`<div class="now-storage__bar" role="meter" aria-label="Disk use against budget"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.min(t.pct,100)}>
      <span class=${t.pct>=90?"is-high":""} style=${{width:Math.min(t.pct,100)+"%"}}></span>
    </div>`}
  </div>`:null}function X0({models:e}){const t=Object.values(e&&!e.error?e:{}).filter(s=>{var l;return s.value||((l=s.conflicts)==null?void 0:l.length)});if(!t.length)return null;const n=new Map;for(const s of t){const l=JSON.stringify([s.value,s.source,s.line,s.conflicts]);n.has(l)?n.get(l).labels.push(ds(s.tool)):n.set(l,{...s,labels:[ds(s.tool)]})}return g`<div class="now-models" data-testid="now-models">
    ${[...n.values()].map(s=>g`<div key=${s.tool} class="now-models__row">
      <span>${s.labels.join(", ")} model <strong>${s.value||"no pin"}</strong></span>
      ${s.source&&g`<span class="now-models__source" title=${s.why_in_effect}>
        ${s.line?`${s.source}:${s.line}`:s.source}${s.in_project?"":" (not in this project, still in effect)"}
      </span>`}
      ${(s.conflicts||[]).map(l=>g`<span key=${l.requested_at} class="now-models__conflict" data-testid="now-model-conflict">
        Conflict: ${l.requested.join(", ")} requested at ${l.requested_at}, ${l.pinned} is pinned
      </span>`)}
    </div>`)}
  </div>`}function e_({snap:e,enabledTools:t,connected:n,otelActive:s,alerts:l,selfStatus:o,onOpenTab:i}){const r=ls(()=>Dd(),[],{pollMs:6e4}),a=ls(()=>Pd(),[],{pollMs:6e4}),c=ls(()=>dc(),[],{pollMs:6e4}),p=ls(()=>q0(t),[t],{pollMs:6e4}),d=e!=null&&e.timestamp?Date.now()/1e3-e.timestamp:null,h=Me(()=>_i(o),[o]),v=p.updatedAt?p.data:void 0,$=Me(()=>new Set(((e==null?void 0:e.sessions)||[]).map(M=>M.tool)),[e]),T=Me(()=>R0({connected:n,snapAgeS:d,hooks:a.data,quality:c.data,otelActive:s,alerts:l,storage:h,runningTools:$,hiddenContext:v,enabledTools:t}),[n,d,a.data,c.data,s,l,h,$,v,t]),w=T.filter(M=>M.level==="error").length,x=T.filter(M=>M.level==="warn").length,b=a.loading&&!a.data&&c.loading&&!c.data,C=b?"...":w+x;return g`<section class="now-panel now-panel--health" aria-labelledby="now-health">
    <header class="now-panel__head">
      <h2 id="now-health">Needs attention</h2>
      <span class=${"now-panel__figure"+(w?" is-error":x?" is-warn":" is-ok")}>${C}</span>
      <span class="now-panel__sub">${w} error${w===1?"":"s"}, ${x} warning${x===1?"":"s"}</span>
    </header>
    <${Q0} selfStatus=${o}/>
    <${X0} models=${r.data}/>
    ${a.error&&!a.data&&g`<${_n} status="error" error=${a.error}
      onRetry=${a.reload} label="hook status"/>`}
    ${T.length===0&&!b&&!a.error?g`<${_n} status="empty" emptyTitle="All collectors and hooks are healthy"
          emptyHint="Hook delivery, data quality and the live stream all report OK."/>`:g`<ul class="now-issues">
          ${T.slice(0,7).map(M=>g`<li key=${M.id} class=${"now-issue now-issue--"+M.level}>
            <span class="now-issue__level">${M.level==="error"?"Error":M.level==="warn"?"Warn":"Info"}</span>
            <div class="now-issue__body">
              <div class="now-issue__title">${M.tab?g`<button type="button" class="now-link" onClick=${()=>i(M.tab)}>${M.title}</button>`:M.title}</div>
              <div class="now-issue__detail">${M.detail}</div>
              <${Z0} command=${M.fix}/>
            </div>
          </li>`)}
          ${T.length>7&&g`<li class="now-panel__sub">${T.length-7} more in Monitoring health below.</li>`}
        </ul>`}
  </section>`}function t_({snap:e,enabledTools:t,connected:n,otelActive:s,alerts:l,selfStatus:o,onOpenSession:i,onOpenTab:r}){return g`<div class="now-grid">
    <${Y0} snap=${e} enabledTools=${t}
      onOpenSession=${i} onShowAll=${()=>r("live")}/>
    <${J0} onOpenBudget=${()=>r("budget")} cloudScope=${rs(e,t)} enabledTools=${t} snap=${e}/>
    <${e_} snap=${e} enabledTools=${t} connected=${n} otelActive=${s}
      alerts=${l} selfStatus=${o} onOpenTab=${r}/>
  </div>`}function al(e){const t=new Date(e*1e3),n=t.getTimezoneOffset();return new Date(t.getTime()-n*6e4).toISOString().slice(0,16)}function n_({globalRange:e,onPreset:t,onApplyCustom:n}){const[s,l]=X(!1),[o,i]=X(""),r=J(null),a=J(null),c=se(()=>{l(!0),i(""),requestAnimationFrame(()=>{if(!(!r.current||!a.current))if(e.until!=null)r.current.value=al(e.since),a.current.value=al(e.until);else{const d=Fs.find($=>$.id===e.id),h=Date.now()/1e3,v=(d==null?void 0:d.seconds)||86400;r.current.value=al(h-v),a.current.value=al(h)}})},[e]),p=se(()=>{var T,w;const d=(T=r.current)==null?void 0:T.value,h=(w=a.current)==null?void 0:w.value;if(!d||!h){i("Enter both a start and an end time.");return}const v=new Date(d).getTime()/1e3,$=new Date(h).getTime()/1e3;if(!Number.isFinite(v)||!Number.isFinite($)){i("Invalid date/time value.");return}if($<=v){i("End time must be after start time.");return}i(""),n(v,$),l(!1)},[n]);return g`<div class="global-range-bar">
    <div class="range-bar" role="group" aria-label="Time range">
      ${Fs.map(d=>g`<button key=${d.id}
        class=${e.id===d.id&&!s?"range-btn active":"range-btn"}
        aria-pressed=${e.id===d.id&&!s?"true":"false"}
        onClick=${()=>{t(d.id),l(!1),i("")}}>${d.label}</button>`)}
      <button class=${s||e.id==="custom"?"range-btn active":"range-btn"}
        onClick=${c}>Custom</button>
    </div>
    ${s&&g`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${r} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${a} /></label>
      <button class="range-btn active" onClick=${p} style="font-weight:600">Apply</button>
      <span class="error-state" aria-live="polite"
        style="padding:0 var(--sp-2);font-size:var(--fs-xs)">${o}</span>
    </div>`}
  </div>`}function s_(e,t){const n=e.filter(l=>qs.has(l.tool));if(t==null)return`All tools (${n.length})`;const s=n.filter(l=>t.includes(l.tool)).map(l=>l.label);return s.length===0?"No tools":s.length<=2?s.join(", "):`${s[0]} +${s.length-1}`}function l_({snap:e,enabledTools:t,onToggle:n,onSetAll:s}){if(!e)return null;const l=Ec(e.tools.filter(a=>!a.meta));if(!l.length)return null;const o=t===null,i=s_(l,t),r=g`<button type="button" class=${"hdr-btn tool-filter-trigger"+(o?"":" is-filtered")}
    aria-label=${"Tool filter: "+i}>
    <${Bt} name="filter" size="12"/> ${i}
  </button>`;return g`<${gl} trigger=${r} placement="bottom">
    <div class="tool-filter-bar" role="group" aria-label="Filter every panel by tool">
      <label class="tool-filter-item">
        <input type="checkbox" checked=${o}
          onChange=${()=>s(o?[]:null)} />
        <span>All tools</span>
      </label>
      <hr class="hdr-views-sep"/>
      ${l.map(a=>{const c=qs.has(a.tool),p=t===null||t.includes(a.tool);return g`<label key=${a.tool}
          class=${"tool-filter-item"+(c?"":" tool-unverified")}
          title=${c?"":"Discovery only: this tool is not verified yet, so it cannot be filtered"}>
          <input type="checkbox" checked=${p} disabled=${!c}
            onChange=${()=>c&&n(a.tool)} />
          <${El} tool=${a.tool} size="1em"/>
          <span>${a.label}</span>
        </label>`})}
    </div>
  </${gl}>`}const o_=30;function i_({timestamp:e}){const[,t]=X(0);if(ae(()=>{const l=setInterval(()=>t(o=>o+1),5e3);return()=>clearInterval(l)},[]),!e)return null;const n=Math.max(0,Math.floor(Date.now()/1e3-e)),s=n>o_;return g`<span class=${"conn "+(s?"stale":"ok")} role="status" aria-live="polite"
    title=${"Last data snapshot received "+n+"s ago"+(s?" — the refresh loop may be stalled":"")}>
    ● ${s?"stale "+n+"s":n+"s"}
    <span class="sr-only">${s?" — data is stale":" — data age"}</span>
  </span>`}function r_({selfStatus:e}){const t=_i(e);if(!t||t.used==null&&!t.mode)return null;const n=t.degraded?"err":t.pct>=90?"stale":"off";return g`<span class=${"conn hdr-desktop-only "+n} title=${"Disk: "+wl(t)}>
    ${t.mode?"capture="+t.mode+" ":""}${t.used!=null?Ht(t.used):""}${t.budget?" / "+Ht(t.budget):""}
  </span>`}function a_({searchRef:e,searchQuery:t,onSearchChange:n,theme:s,cycleTheme:l,density:o,setDensity:i,otelActive:r,connected:a,selfStatus:c,globalRange:p,onPreset:d,onApplyCustom:h,snap:v,enabledTools:$,onToggleTool:T,onSetAllTools:w,views:x=[],matchingView:b=null,onApplyView:C,onDeleteView:M,onSaveView:S,onOpenPalette:E}){const[L,D]=X(!1),[z,I]=X(!1),[P,Y]=X(""),U=se(()=>{const N=P.trim();N&&(S&&S(N),Y(""),I(!1))},[P,S]),K=[{value:"compact",label:"Compact"},{value:"normal",label:"Normal"},{value:"spacious",label:"Spacious"}],W=g`<button class="hdr-btn" type="button"
    aria-label="Saved views" title="Saved views">
    Views${b?": "+b.name:""} ▾
  </button>`;return g`<header role="banner">
    <h1>aictl</h1>
    <div class="hdr-scope" role="group" aria-label="Scope for every panel">
      <${n_} globalRange=${p}
        onPreset=${d} onApplyCustom=${h}/>
      <${l_} snap=${v} enabledTools=${$}
        onToggle=${T} onSetAll=${w}/>
    </div>
    <div class="hdr-right">
      <!-- Mobile overflow toggle -->
      <button class="hdr-btn hdr-mobile-only" type="button" aria-label="Menu"
        aria-expanded=${L?"true":"false"}
        onClick=${()=>D(N=>!N)}>
        <${$p} size="16" aria-hidden="true"/>
      </button>

      <input type="text" ref=${e} class="search-box hdr-desktop-only"
        placeholder="Filter... ( / )" aria-label="Filter tools"
        value=${t} onInput=${N=>n(N.target.value)}/>

      <!-- Command palette trigger -->
      <button class="hdr-cmdk" type="button"
        onClick=${E}>
        <${rp} size="14" aria-hidden="true"/>
        <span class="hdr-desktop-only">Commands</span>
        <${ot} class="hdr-desktop-only" aria-hidden="true">${Tc()}</${ot}>
        <span class="sr-only">open command palette</span>
      </button>

      <!-- Views dropdown -->
      <${gl} trigger=${W} placement="bottom" class="hdr-desktop-only">
        <div class="hdr-views-menu" role="group" aria-label="Saved views">
          ${x.length===0?g`<div class="hdr-views-empty text-muted">No saved views</div>`:x.map(N=>g`<div key=${N.id} class="hdr-views-row">
                <button class="hdr-views-apply" type="button"
                  onClick=${()=>C&&C(N.id)}
                  aria-label=${"Apply view "+N.name}>${N.name}</button>
                <button class="hdr-views-del" type="button"
                  aria-label=${"Delete view "+N.name}
                  onClick=${()=>M&&M(N.id)}>
                  <${Pp} size="12" aria-hidden="true"/>
                </button>
              </div>`)}
          <hr class="hdr-views-sep"/>
          <${hn} variant="ghost" size="sm"
            onClick=${()=>I(!0)}>
            <${Ap} size="12" aria-hidden="true"/> Save current view…
          </${hn}>
        </div>
      </${gl}>

      <!-- Theme toggle -->
      <button class="theme-btn" type="button" onClick=${l}
        aria-label=${"Toggle theme: "+s} title=${"Theme: "+s}>
        <${Bt} name=${s==="light"?"sun":s==="editorial"?"pen":"moon"} size="16"/>
      </button>

      ${r?g`<span class="conn ok" title="OTel receiver active">OTel</span>`:g`<span class="conn off" title="OTel receiver inactive — enable with: aictl otel enable">OTel off</span>`}
      <${r_} selfStatus=${c}/>
      <${i_} timestamp=${v==null?void 0:v.timestamp}/>
      <span class=${"conn "+(a?"ok":"err")} role="status" aria-live="polite">
        ${a?"live":"reconnecting..."}
        <span class="sr-only">${a?" — connected":" — connection lost, reconnecting"}</span>
      </span>
    </div>

    ${L&&g`<div class="hdr-mobile-overflow hdr-mobile-only">
      <input type="text" class="search-box" placeholder="Filter..."
        aria-label="Filter tools"
        value=${t} onInput=${N=>n(N.target.value)}/>
      <${ah}
        ariaLabel="Density"
        value=${o}
        options=${K}
        onChange=${i}/>
    </div>`}

    ${z&&g`<${fs} open=${!0}
      onClose=${()=>I(!1)} ariaLabel="Save view">
      <h3 style="margin-bottom:var(--sp-5)">Save current view</h3>
      <input type="text" class="search-box" style="width:100%"
        placeholder="View name" value=${P}
        onInput=${N=>Y(N.target.value)}
        onKeyDown=${N=>N.key==="Enter"&&U()}
        autoFocus=${!0}/>
      <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-6);justify-content:flex-end">
        <${hn} variant="ghost" onClick=${()=>I(!1)}>Cancel</${hn}>
        <${hn} variant="primary" onClick=${U}>Save</${hn}>
      </div>
    </${fs}>`}
  </header>`}const za=[{id:"overview",label:"Dashboard",sub:"live event stream"},{id:"explorer",label:"Sessions",sub:"history & traces"},{id:"agents",label:"Agents",sub:"instrumentation"},{id:"prompts",label:"Prompts",sub:"library & workflows"}];function c_(){const e=new Date,t=String(e.getMonth()+1).padStart(2,"0"),n=e.toLocaleDateString("en-CA");return`The aictl daily · vol. ${t} · ${n}`}function u_({activeTab:e,setActiveTab:t}){const n=xl(zs),s=n==null?void 0:n.snap,l=Me(()=>{var a;let r=0;for(const c of(s==null?void 0:s.tools)||[])for(const p of((a=c.live)==null?void 0:a.sessions)||[])p.active!==!1&&r++;return r},[s]),o=za.find(r=>r.id===e),i=l>0?`Live · ${l} session${l!==1?"s":""}`:"Live";return g`<div class="cmasthead">
    <div class="cmasthead-top">
      <div class="cmasthead-identity">
        <div class="cmasthead-kicker">${c_()}</div>
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
      ${za.map(r=>g`<button
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
  </div>`}function d_({tabs:e,activeTab:t,setActiveTab:n}){const s=J(null);return ae(()=>{var o,i;const l=(o=s.current)==null?void 0:o.querySelector('[aria-current="page"]');(i=l==null?void 0:l.scrollIntoView)==null||i.call(l,{block:"nearest",inline:"nearest"})},[t]),g`<nav class="tab-nav" ref=${s} aria-label="Dashboard sections">
    ${Ps.navGroups.map(l=>g`<div key=${l.id} class="tab-group" role="group" aria-labelledby=${"nav-"+l.id}>
      <div class="tab-group__label" id=${"nav-"+l.id}>${l.label}</div>
      ${e.filter(o=>o.group===l.id).map(o=>g`<button key=${o.id} type="button" class="tab-btn"
        aria-current=${t===o.id?"page":null}
        aria-keyshortcuts=${o.key||null}
        onClick=${()=>n(o.id)}>
        <span class="tab-btn-icon"><${Bt} name=${o.iconName} size="14"/></span>
        <span class="tab-btn__label">${o.label}</span>
        ${o.key&&g`<kbd class="tab-btn__key" aria-hidden="true">${o.key}</kbd>`}
      </button>`)}
    </div>`)}
  </nav>`}function f_(e,t){if(!t)return 1;const n=t.toLowerCase(),s=(e.label||"").toLowerCase(),l=(e.group||"").toLowerCase();if(s.startsWith(n))return 1e3-s.length;if(s.includes(n))return 500-s.indexOf(n);if(l.startsWith(n))return 300;if(l.includes(n))return 150;let o=0;for(const i of s)if(i===n[o]&&o++,o===n.length)break;return o===n.length?50:0}function p_({commands:e=[],isOpen:t,onClose:n,lru:s=[],onRun:l}){const[o,i]=X(""),[r,a]=X(0),c=J(null),p=J(null);ae(()=>{t&&(i(""),a(0))},[t]),ae(()=>{t&&c.current&&c.current.focus()},[t]);const d=Me(()=>{if(!o){const w=new Map(e.map(C=>[C.id,C])),x=s.map(C=>w.get(C)).filter(Boolean),b=e.filter(C=>!s.includes(C.id));return[...x,...b]}return e.map(w=>({c:w,s:f_(w,o)})).filter(w=>w.s>0).sort((w,x)=>x.s-w.s).map(w=>w.c)},[e,o,s]);ae(()=>{a(0)},[o]);const h=se(w=>{if(w){l&&l(w);try{w.action&&w.action()}catch(x){console.error("Command failed:",x)}n&&n()}},[l,n]),v=se(w=>{w.key==="ArrowDown"?(w.preventDefault(),a(x=>Math.min(x+1,d.length-1))):w.key==="ArrowUp"?(w.preventDefault(),a(x=>Math.max(x-1,0))):w.key==="Enter"&&(w.preventDefault(),h(d[r]))},[d,r,h]);ae(()=>{if(!p.current)return;const w=p.current.querySelector(`[data-cmd-idx="${r}"]`);w&&w.scrollIntoView&&w.scrollIntoView({block:"nearest"})},[r]);const $=Me(()=>{const w=[],x=new Map;return d.forEach(b=>{const C=b.group||"Commands";x.has(C)||(x.set(C,w.length),w.push({group:C,items:[]})),w[x.get(C)].items.push(b)}),w},[d]);let T=-1;return g`<${fs} open=${t} onClose=${n} ariaLabel="Command palette" class="cmdk-dialog">
    <div class="cmdk">
      <div class="cmdk-input-row">
        <${Dc} size="16" aria-hidden="true"/>
        <input
          ref=${c}
          type="text"
          class="cmdk-input"
          placeholder="Type a command or search…"
          value=${o}
          onInput=${w=>i(w.target.value)}
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
        ${d.length===0?g`<${Oc} icon="search" title="No commands"
              description=${o?'No commands match "'+o+'"':"Start typing…"}/>`:$.map(w=>g`<div key=${w.group} class="cmdk-group" role="group" aria-label=${w.group}>
              <div class="cmdk-group-label" aria-hidden="true">${w.group}</div>
              ${w.items.map(x=>{T+=1;const b=T,C=b===r;return g`<button key=${x.id}
                  type="button"
                  id=${"cmdk-opt-"+b}
                  class=${"cmdk-item"+(C?" cmdk-item--active":"")}
                  role="option"
                  aria-selected=${C?"true":"false"}
                  data-cmd-idx=${b}
                  onMouseEnter=${()=>a(b)}
                  onClick=${()=>h(x)}
                >
                  <span class="cmdk-item__label">${x.label}</span>
                  ${x.shortcut?g`<${ot}>${x.shortcut}</${ot}>`:null}
                </button>`})}
            </div>`)}
      </div>
      <div class="cmdk-foot">
        <${ot}>↑</${ot}><${ot}>↓</${ot}> navigate
        · <${ot}>↵</${ot}> run
        · <${ot}>Esc</${ot}> close
      </div>
    </div>
  </${fs}>`}function h_({target:e="#main-content",label:t="Skip to main content"}){return g`<a href=${e} class="skip-link">${t}</a>`}function wo(e,t){try{const n=localStorage.getItem("aictl-pref-"+e);return n!=null?JSON.parse(n):t}catch{return t}}const m_={live:3600,"1h":3600,"6h":21600,"24h":86400,"7d":604800};wo("active_tab","overview"),(()=>{const e=wo("range","live"),t=m_[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),wo("tool_filter",null);const __=pt(()=>ft(()=>import("./TabOverview-Bx9pRQv9.js"),[])),v_=pt(()=>ft(()=>import("./TabMemory-k33sWHlt.js"),[])),g_=pt(()=>ft(()=>import("./ContextMap-DFzG0Whm.js"),[])),y_=pt(()=>ft(()=>import("./TabLive-CtAR_uvO.js"),__vite__mapDeps([2,3]))),b_=pt(()=>ft(()=>import("./TabEventsStats-Dce0O2K3.js"),[])),$_=pt(()=>ft(()=>import("./TabBudget-A4BnpfwQ.js"),__vite__mapDeps([4,3,5]))),w_=pt(()=>ft(()=>import("./TabAnalytics-_xp_mUvu.js"),__vite__mapDeps([6,7]))),k_=pt(()=>ft(()=>import("./TabExplorer-DG5r_FFv.js"),__vite__mapDeps([8,1,5]))),S_=pt(()=>ft(()=>import("./TabToolConfig-CKz0lXmF.js"),[])),x_=pt(()=>ft(()=>import("./TabProjectEnv-MD3v7xWY.js"),[])),M_=pt(()=>ft(()=>import("./CAgentsTab-NhNA6bmF.js"),[])),C_=pt(()=>ft(()=>import("./CDashboardTab-d4kTmVQf.js"),[])),E_=pt(()=>ft(()=>import("./CPromptsTab-ABFixPM4.js"),[])),A_=pt(()=>ft(()=>import("./CSessionsTab-BeC1o1MM.js"),[])),T_=new Set(["live","procs","events","explorer","budget","analytics","memory"]),L_=()=>g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading view">
  <${as} height="120px" radius="var(--radius-sm)"/>
  <${as} height="200px" radius="var(--radius-sm)"/>
</div>`,be=({tabName:e,children:t})=>g`<${Br} key=${e}><${Dn} fallback=${g`<${L_}/>`}>${t}</${Dn}></${Br}>`;function D_(e,t){const n=J({});ae(()=>{const s=t.current;if(!s)return;const l=n.current[e]||0;s.scrollTop=l;let o=!1;const i=l?[150,500,1200].map(c=>setTimeout(()=>{o||(s.scrollTop=l)},c)):[],r=()=>{o=!0},a=()=>{n.current[e]=s.scrollTop};return s.addEventListener("wheel",r,{passive:!0,once:!0}),s.addEventListener("touchstart",r,{passive:!0,once:!0}),s.addEventListener("scroll",a,{passive:!0}),()=>{i.forEach(clearTimeout),s.removeEventListener("wheel",r),s.removeEventListener("touchstart",r),s.removeEventListener("scroll",a)}},[e,t])}function P_(e,t){ae(()=>{const n=s=>{var l;s.key==="Escape"&&t(null),s.key==="/"&&!ti(s.target)&&(s.preventDefault(),(l=e.current)==null||l.focus())};return document.addEventListener("keydown",n),()=>document.removeEventListener("keydown",n)},[e,t])}function O_(){const[e,t]=X(!1);return ae(()=>{let n=!0;const s=()=>cc().then(o=>{n&&t(o.active||!1)}).catch(()=>{n&&t(!1)});s();const l=setInterval(s,3e4);return()=>{n=!1,clearInterval(l)}},[]),e}function R_(e){const[t,n]=X(null),[s,l]=X([]);return ae(()=>{const{id:o,since:i,until:r}=e;o==="live"?n(null):o!=="custom"?Eo({range:o}).then(n).catch(()=>{}):Eo({since:i,until:r}).then(n).catch(()=>{}),Cd({since:i,until:r}).then(l).catch(()=>{})},[e]),{dbHistory:t,events:s}}function I_(e){const t=J(!1),n=J(e);ae(()=>{if(e&&!t.current){t.current=!0,n.current=e;return}e!==n.current&&(e?(Oo.success("Reconnected"),Dr("Connection restored")):t.current&&(Oo.error("Disconnected. Retrying…"),Dr("Connection lost, retrying","assertive")),n.current=e)},[e])}function N_(e){var i;if(!e)return[];const t=[];let n=0,s=0,l=0,o=0;for(const r of e.tools||[])for(const a of r.processes||[]){const c=parseFloat(a.mem_mb)||0,p=(a.process_type||"").toLowerCase();(p==="subagent"||p==="agent")&&(n+=c),p==="mcp-server"&&a.zombie_risk&&a.zombie_risk!=="none"&&s++,(p==="browser"||(a.name||"").toLowerCase().includes("headless"))&&l++,(i=a.anomalies)!=null&&i.length&&(o+=a.anomalies.length)}return n>2048&&t.push({level:"red",msg:`Subagent memory: ${Ht(n*1048576)} (>2GB) — consider cleanup`}),s>0&&t.push({level:"orange",msg:`${s} MCP server(s) with dead parent — may be orphaned`}),l>0&&t.push({level:"yellow",msg:`${l} headless browser process(es) detected — check for leaks`}),o>5&&t.push({level:"orange",msg:`${o} process anomalies detected`}),t}function cl(e,t){return Jp(e,t)}function z_(e,t,n){if(!e)return e;let s=e.tools.filter(l=>qs.has(l.tool)||l.tool==="aictl");if(s=s.filter(l=>jt(l.tool,t)),n){const l=n.toLowerCase();s=s.filter(o=>o.label.toLowerCase().includes(l)||o.tool.toLowerCase().includes(l)||o.vendor&&o.vendor.toLowerCase().includes(l)||(o.files||[]).some(i=>i.path.toLowerCase().includes(l))||(o.processes||[]).some(i=>(i.name||"").toLowerCase().includes(l)||(i.cmdline||"").toLowerCase().includes(l))||o.live&&((o.live.workspaces||[]).some(i=>i.toLowerCase().includes(l))||(o.live.sources||[]).some(i=>i.toLowerCase().includes(l))))}return{...e,tools:Ec(s),sessions:cl(e.sessions,t),tool_telemetry:cl(e.tool_telemetry,t),tool_configs:Array.isArray(e.tool_configs)?e.tool_configs.filter(l=>Yp(l,t)):e.tool_configs,mcp_detail:cl(e.mcp_detail,t),events:cl(e.events,t),agent_memory:Array.isArray(e.agent_memory)&&Hs(t)?e.agent_memory.filter(l=>nh(l,t)):e.agent_memory,filter_hidden_unlisted:Hs(t)?Cs(e.sessions)+Cs(e.tool_telemetry)+Cs(e.tool_configs)+Cs(e.mcp_detail)+Cs(e.events):0}}function vi(e,t){try{document.dispatchEvent(new CustomEvent("aictl:select-session",{detail:{sessionId:e,tool:t}}))}catch{}}function V_({tabs:e,setActiveTab:t,setPreset:n,presets:s,allTools:l,toggleTool:o,setTheme:i,setDensity:r,views:a,applyView:c,snap:p,onShowShortcuts:d}){const h=[];e.forEach(v=>h.push({id:"tab:"+v.id,group:"Jump to tab",label:v.label,shortcut:v.key,action:()=>t(v.id)})),s.forEach(v=>h.push({id:"range:"+v.id,group:"Range",label:"Set range: "+v.label,action:()=>n(v.id)})),(l||[]).forEach(v=>h.push({id:"filter:"+v,group:"Filter",label:"Toggle tool: "+v,action:()=>o(v)}));for(const v of((p==null?void 0:p.sessions)||[]).slice(0,40)){if(!v.session_id)continue;const $=rc(v.project)||"no project";h.push({id:"session:"+v.session_id,group:"Session",label:"Open session: "+$+" ("+(v.label||v.tool)+")",action:()=>{t("explorer"),vi(v.session_id,v.tool)}})}return a.forEach(v=>h.push({id:"view:"+v.id,group:"View",label:"Apply view: "+v.name,action:()=>c(v.id)})),["auto","dark","light","editorial"].forEach(v=>h.push({id:"theme:"+v,group:"Appearance",label:"Theme: "+v,action:()=>i(v)})),["compact","normal","spacious"].forEach(v=>h.push({id:"density:"+v,group:"Appearance",label:"Density: "+v,action:()=>r(v)})),h.push({id:"help:shortcuts",group:"Shortcuts",label:"Keyboard shortcuts",action:()=>{d&&d()}}),h}function F_({open:e,onClose:t,tabs:n}){if(!e)return null;const s=[...n.map(l=>[l.label,l.key]),["Previous / next view","[ ]"],["Command palette",Tc()],["Focus filter","/"],["This list","?"],["Close panels","Esc"]];return g`<${fs} open=${!0} onClose=${t} ariaLabel="Keyboard shortcuts">
    <h3 style="margin-bottom:var(--sp-5)">Keyboard shortcuts</h3>
    <ul style="list-style:none;margin:0;padding:0;min-width:220px">
      ${s.map(([l,o])=>g`<li key=${l}
        style="display:flex;justify-content:space-between;align-items:center;gap:var(--sp-6);padding:var(--sp-1) 0">
        <span>${l}</span><${ot}>${o}</${ot}>
      </li>`)}
    </ul>
  </${fs}>`}function U_({theme:e,snap:t,filteredSnap:n,enabledTools:s,effectiveHistory:l,activeTab:o,connected:i,otelActive:r,alerts:a,selfStatus:c,openSession:p,setActiveTab:d,setTheme:h}){return{overview:()=>e==="editorial"?g`<${be} tabName="overview">
          <${C_}/>
          <div class="mb-lg" style="margin-top:var(--sp-6)">
            <div class="c-overline" style="margin-bottom:var(--sp-3)">Monitoring</div>
            <${jr}/>
          </div>
        </${be}>`:g`<${be} tabName="overview">
          <${t_} snap=${n} enabledTools=${s}
            connected=${i} otelActive=${r} alerts=${a} selfStatus=${c}
            onOpenSession=${p} onOpenTab=${d}/>
          ${!rs(t,s)&&g`<${D0} snap=${n} history=${l} enabledTools=${s}/>`}
          <div class="mb-lg"><${jr}/></div>
        </${be}>`,hidden:()=>g`<${be} tabName="hidden"><${G0}/></${be}>`,procs:()=>g`<${be} tabName="procs"><div class="mb-lg"><${__}/></div></${be}>`,memory:()=>g`<${be} tabName="memory"><div class="mb-lg"><${g_}/></div><div class="mb-lg"><${v_}/></div></${be}>`,live:()=>g`<${be} tabName="live"><div class="mb-lg"><${y_}/></div></${be}>`,events:()=>g`<${be} tabName="events"><div class="mb-lg"><${b_} key=${"events-"+o}/></div></${be}>`,budget:()=>g`<${be} tabName="budget"><div class="mb-lg"><${$_} key=${"budget-"+o}/></div></${be}>`,analytics:()=>g`<${be} tabName="analytics"><div class="mb-lg"><${w_} key=${"analytics-"+o}/></div></${be}>`,explorer:()=>e==="editorial"?g`<${be} tabName="explorer"><${A_}
          onInspect=${(v,$)=>{d("explorer"),vi(v,$),h("auto")}}
        /></${be}>`:g`<${be} tabName="explorer"><div class="mb-lg"><${k_} key=${"explorer-"+o}/></div></${be}>`,config:()=>g`<${be} tabName="config">
      <div class="mb-lg"><${S_}/></div>
      <div class="mb-lg"><${x_} snap=${t}/></div>
    </${be}>`,agents:()=>g`<${be} tabName="agents"><${M_}
      onViewSessions=${()=>d("explorer")}
      onViewConfig=${()=>d("config")}/></${be}>`,prompts:()=>g`<${be} tabName="prompts"><${E_}/></${be}>`}}function H_(){var rn;const{snapshot:e,history:t,connected:n}=rf(),{range:s,setPreset:l,setCustom:o,setRange:i}=vf(),{activeTab:r,setActiveTab:a,tabs:c}=bf(),{theme:p,setTheme:d,cycleTheme:h}=Sf(),{density:v,setDensity:$}=Mf(),T=Me(()=>e?e.tools.filter(oe=>oe.tool!=="aictl"&&oe.tool!=="any"&&qs.has(oe.tool)).map(oe=>oe.tool):[],[e]),{selectedTools:w,toggleTool:x,setTools:b}=yf(T),[C,M]=X(""),[S,E]=X(null),L=J(null);P_(L,E),I_(n);const D=O_(),{data:z}=ls(()=>uc(),[],{pollMs:6e4}),{dbHistory:I,events:P}=R_(s),Y=Me(()=>({tab:r,range:s,tools:w,density:v,theme:p}),[r,s,w,v,p]),U=se(oe=>{oe.tab&&a(oe.tab),oe.range&&i(oe.range),oe.tools!==void 0&&b(oe.tools),oe.density&&$(oe.density),oe.theme&&d(oe.theme)},[a,i,b,$,d]),{views:K,saveView:W,deleteView:N,applyView:V,matchingView:Ie}=Ef(Y,U),fe=Lf(),[de,pe]=X(!1),te=se(()=>pe(!0),[]);ae(()=>{const oe=qe=>{qe.key==="?"&&!ti(qe.target)&&pe(ze=>!ze)};return document.addEventListener("keydown",oe),()=>document.removeEventListener("keydown",oe)},[]);const q=J(null);D_(r,q);const Ne=se((oe,qe)=>{a("explorer"),vi(oe,qe)},[a]),Xe=Me(()=>V_({tabs:c,setActiveTab:a,setPreset:l,presets:Fs,allTools:T,toggleTool:x,setTheme:d,setDensity:$,views:K,applyView:V,snap:e,onShowShortcuts:te}),[c,a,l,T,x,d,$,K,V,e,te]),ke=s.id==="live"?t:I||t,ue=s.until?s.until-s.since:Cl[s.id]||3600,ht=se((oe,qe={})=>{if(!oe)return E(null);E({path:oe,at:qe.at??null})},[]),Pe=Me(()=>z_(e,w,C),[e,w,C]),Se=Me(()=>{var ze;const oe=Date.now()/1e3-300,qe=new Map;for(const st of P)if(st.kind==="file_modified"&&st.ts>=oe&&((ze=st.detail)!=null&&ze.path)){const Mt=qe.get(st.detail.path);(!Mt||st.ts>Mt.ts)&&qe.set(st.detail.path,{ts:st.ts,growth:st.detail.growth_bytes||0,tool:st.tool})}return qe},[P]),xt=Me(()=>({snap:Pe,history:t,openViewer:ht,recentFiles:Se,globalRange:s,rangeSeconds:ue,enabledTools:w}),[Pe,t,ht,Se,s,ue,w]),Ot=Me(()=>N_(Pe),[Pe]),nt=J(null);nt.current=qp(nt.current,xt,{activeTab:r});const Wt=nt.current.value,en=U_({theme:p,snap:e,filteredSnap:Pe,enabledTools:w,effectiveHistory:ke,activeTab:r,connected:n,otelActive:D,alerts:Ot,selfStatus:z,openSession:Ne,setActiveTab:a,setTheme:d}),tn=e!=null;return g`<${zs.Provider} value=${Wt}>
    <div class="main-wrap">
      <${h_}/>
      <${a_}
        searchRef=${L} searchQuery=${C} onSearchChange=${M}
        theme=${p} cycleTheme=${h}
        density=${v} setDensity=${$}
        otelActive=${D} connected=${n} selfStatus=${z}
        globalRange=${s} onPreset=${l} onApplyCustom=${o}
        snap=${e} enabledTools=${w}
        onToggleTool=${x} onSetAllTools=${b}
        views=${K} matchingView=${Ie}
        onApplyView=${V} onDeleteView=${N} onSaveView=${W}
        onOpenPalette=${fe.open}
      />
      ${p==="editorial"&&g`<${u_}
        activeTab=${r} setActiveTab=${a}
      />`}
      <div class="shell-body">
        <${d_} tabs=${c} activeTab=${r} setActiveTab=${a}/>
        <main class="main" id="main-content" tabindex="0" ref=${q}>
          <div class="main-view" aria-label=${(rn=c.find(oe=>oe.id===r))==null?void 0:rn.label}>
            ${tn&&g`<${lh} count=${(Pe==null?void 0:Pe.filter_hidden_unlisted)||0}/>`}
            ${tn?T_.has(r)&&rs(e,w)?g`<${jp} tools=${w.map(oe=>({tool:oe,label:ds(oe,e)}))}/>`:en[r]?en[r]():g`<p class="text-muted">Unknown tab "${r}"</p>`:g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading dashboard">
                  <${as} height="120px" radius="var(--radius-sm)"/>
                  <${as} height="60px"  radius="var(--radius-sm)"/>
                  <${as} height="200px" radius="var(--radius-sm)"/>
                </div>`}
          </div>
        </main>
      </div>
    </div>
    <${oh} path=${(S==null?void 0:S.path)??(typeof S=="string"?S:null)}
      at=${typeof S=="object"?S==null?void 0:S.at:null}
      onClose=${()=>E(null)}/>
    <${wh}/>
    <${p_} commands=${Xe}
      isOpen=${fe.isOpen} onClose=${fe.close}
      lru=${fe.lru} onRun=${oe=>fe.recordUse(oe.id)}/>
    <${F_} open=${de}
      onClose=${()=>pe(!1)} tabs=${c}/>
    <${mh}/>
  </${zs.Provider}>`}rd(g`<${H_}/>`,document.getElementById("app"));export{ds as $,J as A,Eo as B,U0 as C,w0 as D,_l as E,Kv as F,xv as G,yv as H,Bt as I,Cd as J,jp as K,gn as L,wv as M,Vf as N,Sv as O,_n as P,ls as Q,Rr as R,zs as S,Me as T,uv as U,vv as V,Bv as W,Wv as X,x0 as Y,Gv as Z,b0 as _,Ht as a,jt as a0,as as a1,Oc as a2,vr as a3,dv as a4,fv as a5,pv as a6,Ev as a7,Kp as a8,rv as a9,Tv as aA,Dv as aB,Ov as aC,Av as aD,Pv as aE,W_ as aF,iv as aG,uc as aH,Y_ as aI,J_ as aJ,sv as aK,Vv as aL,Xo as aM,Fv as aN,Uv as aO,K_ as aP,Pd as aQ,hv as aR,fs as aS,qv as aT,mv as aU,Oo as aV,rc as aW,Ad as aX,W0 as aY,lh as aa,j_ as ab,q_ as ac,zv as ad,Hv as ae,Nv as af,Qo as ag,jv as ah,lv as ai,Lv as aj,ov as ak,Z_ as al,B_ as am,nv as an,cv as ao,av as ap,G_ as aq,Q_ as ar,X_ as as,F0 as at,ev as au,tv as av,_v as aw,ie as ax,Hd as ay,To as az,vt as b,Wd as c,X as d,is as e,Pn as f,Rv as g,ll as h,$v as i,Mv as j,Ao as k,Cv as l,g as m,ss as n,kv as o,El as p,se as q,Ud as r,Iv as s,zf as t,bv as u,gv as v,Hs as w,xl as x,ae as y,C0 as z};
