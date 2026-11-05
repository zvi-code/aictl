const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/HiddenContextPanel-BTMLx_CF.js","assets/useAsyncResource-BM297V9F.js","assets/TabLive-WItQBRFO.js","assets/DataTable-9cDslJt8.js","assets/TabBudget-Cg33L19c.js","assets/models-DHnW0Za4.js","assets/TabAnalytics-_w_ot4HM.js","assets/echarts-BbyLWlSf.js","assets/TabExplorer-CKHFLNY0.js"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&l(i)}).observe(document,{childList:!0,subtree:!0});function n(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function l(s){if(s.ep)return;s.ep=!0;const o=n(s);fetch(s.href,o)}})();var Ss,se,Va,pn,Gi,Fa,Ua,Ha,Ko,ko,So,ja,ps={},hs=[],ed=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,Bl=Array.isArray;function ln(e,t){for(var n in t)e[n]=t[n];return e}function Go(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function vn(e,t,n){var l,s,o,i={};for(o in t)o=="key"?l=t[o]:o=="ref"?s=t[o]:i[o]=t[o];if(arguments.length>2&&(i.children=arguments.length>3?Ss.call(arguments,2):n),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)i[o]===void 0&&(i[o]=e.defaultProps[o]);return us(e,i,l,s,null)}function us(e,t,n,l,s){var o={type:e,props:t,key:n,ref:l,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:s??++Va,__i:-1,__u:0};return s==null&&se.vnode!=null&&se.vnode(o),o}function gn(e){return e.children}function Qt(e,t){this.props=e,this.context=t}function cl(e,t){if(t==null)return e.__?cl(e.__,e.__i+1):null;for(var n;t<e.__k.length;t++)if((n=e.__k[t])!=null&&n.__e!=null)return n.__e;return typeof e.type=="function"?cl(e):null}function td(e){if(e.__P&&e.__d){var t=e.__v,n=t.__e,l=[],s=[],o=ln({},t);o.__v=t.__v+1,se.vnode&&se.vnode(o),Yo(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[n]:null,l,n??cl(t),!!(32&t.__u),s),o.__v=t.__v,o.__.__k[o.__i]=o,Ka(l,o,s),t.__e=t.__=null,o.__e!=n&&Ba(o)}}function Ba(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),Ba(e)}function xo(e){(!e.__d&&(e.__d=!0)&&pn.push(e)&&!ms.__r++||Gi!=se.debounceRendering)&&((Gi=se.debounceRendering)||Fa)(ms)}function ms(){try{for(var e,t=1;pn.length;)pn.length>t&&pn.sort(Ua),e=pn.shift(),t=pn.length,td(e)}finally{pn.length=ms.__r=0}}function Wa(e,t,n,l,s,o,i,r,a,c,h){var d,p,v,$,A,k,x,b=l&&l.__k||hs,E=t.length;for(a=nd(n,t,b,a,E),d=0;d<E;d++)(v=n.__k[d])!=null&&(p=v.__i!=-1&&b[v.__i]||ps,v.__i=d,k=Yo(e,v,p,s,o,i,r,a,c,h),$=v.__e,v.ref&&p.ref!=v.ref&&(p.ref&&Jo(p.ref,null,v),h.push(v.ref,v.__c||$,v)),A==null&&$!=null&&(A=$),(x=!!(4&v.__u))||p.__k===v.__k?a=qa(v,a,e,x):typeof v.type=="function"&&k!==void 0?a=k:$&&(a=$.nextSibling),v.__u&=-7);return n.__e=A,a}function nd(e,t,n,l,s){var o,i,r,a,c,h=n.length,d=h,p=0;for(e.__k=new Array(s),o=0;o<s;o++)(i=t[o])!=null&&typeof i!="boolean"&&typeof i!="function"?(typeof i=="string"||typeof i=="number"||typeof i=="bigint"||i.constructor==String?i=e.__k[o]=us(null,i,null,null,null):Bl(i)?i=e.__k[o]=us(gn,{children:i},null,null,null):i.constructor===void 0&&i.__b>0?i=e.__k[o]=us(i.type,i.props,i.key,i.ref?i.ref:null,i.__v):e.__k[o]=i,a=o+p,i.__=e,i.__b=e.__b+1,r=null,(c=i.__i=ld(i,n,a,d))!=-1&&(d--,(r=n[c])&&(r.__u|=2)),r==null||r.__v==null?(c==-1&&(s>h?p--:s<h&&p++),typeof i.type!="function"&&(i.__u|=4)):c!=a&&(c==a-1?p--:c==a+1?p++:(c>a?p--:p++,i.__u|=4))):e.__k[o]=null;if(d)for(o=0;o<h;o++)(r=n[o])!=null&&!(2&r.__u)&&(r.__e==l&&(l=cl(r)),Ya(r,r));return l}function qa(e,t,n,l){var s,o;if(typeof e.type=="function"){for(s=e.__k,o=0;s&&o<s.length;o++)s[o]&&(s[o].__=e,t=qa(s[o],t,n,l));return t}e.__e!=t&&(l&&(t&&e.type&&!t.parentNode&&(t=cl(e)),n.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function Il(e,t){return t=t||[],e==null||typeof e=="boolean"||(Bl(e)?e.some(function(n){Il(n,t)}):t.push(e)),t}function ld(e,t,n,l){var s,o,i,r=e.key,a=e.type,c=t[n],h=c!=null&&(2&c.__u)==0;if(c===null&&r==null||h&&r==c.key&&a==c.type)return n;if(l>(h?1:0)){for(s=n-1,o=n+1;s>=0||o<t.length;)if((c=t[i=s>=0?s--:o++])!=null&&!(2&c.__u)&&r==c.key&&a==c.type)return i}return-1}function Yi(e,t,n){t[0]=="-"?e.setProperty(t,n??""):e[t]=n==null?"":typeof n!="number"||ed.test(t)?n:n+"px"}function ns(e,t,n,l,s){var o,i;e:if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof l=="string"&&(e.style.cssText=l=""),l)for(t in l)n&&t in n||Yi(e.style,t,"");if(n)for(t in n)l&&n[t]==l[t]||Yi(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace(Ha,"$1")),i=t.toLowerCase(),t=i in e||t=="onFocusOut"||t=="onFocusIn"?i.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=n,n?l?n.u=l.u:(n.u=Ko,e.addEventListener(t,o?So:ko,o)):e.removeEventListener(t,o?So:ko,o);else{if(s=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n))}}function Ji(e){return function(t){if(this.l){var n=this.l[t.type+e];if(t.t==null)t.t=Ko++;else if(t.t<n.u)return;return n(se.event?se.event(t):t)}}}function Yo(e,t,n,l,s,o,i,r,a,c){var h,d,p,v,$,A,k,x,b,E,M,S,T,L,D,N=t.type;if(t.constructor!==void 0)return null;128&n.__u&&(a=!!(32&n.__u),o=[r=t.__e=n.__e]),(h=se.__b)&&h(t);e:if(typeof N=="function")try{if(x=t.props,b=N.prototype&&N.prototype.render,E=(h=N.contextType)&&l[h.__c],M=h?E?E.props.value:h.__:l,n.__c?k=(d=t.__c=n.__c).__=d.__E:(b?t.__c=d=new N(x,M):(t.__c=d=new Qt(x,M),d.constructor=N,d.render=od),E&&E.sub(d),d.state||(d.state={}),d.__n=l,p=d.__d=!0,d.__h=[],d._sb=[]),b&&d.__s==null&&(d.__s=d.state),b&&N.getDerivedStateFromProps!=null&&(d.__s==d.state&&(d.__s=ln({},d.__s)),ln(d.__s,N.getDerivedStateFromProps(x,d.__s))),v=d.props,$=d.state,d.__v=t,p)b&&N.getDerivedStateFromProps==null&&d.componentWillMount!=null&&d.componentWillMount(),b&&d.componentDidMount!=null&&d.__h.push(d.componentDidMount);else{if(b&&N.getDerivedStateFromProps==null&&x!==v&&d.componentWillReceiveProps!=null&&d.componentWillReceiveProps(x,M),t.__v==n.__v||!d.__e&&d.shouldComponentUpdate!=null&&d.shouldComponentUpdate(x,d.__s,M)===!1){t.__v!=n.__v&&(d.props=x,d.state=d.__s,d.__d=!1),t.__e=n.__e,t.__k=n.__k,t.__k.some(function(I){I&&(I.__=t)}),hs.push.apply(d.__h,d._sb),d._sb=[],d.__h.length&&i.push(d);break e}d.componentWillUpdate!=null&&d.componentWillUpdate(x,d.__s,M),b&&d.componentDidUpdate!=null&&d.__h.push(function(){d.componentDidUpdate(v,$,A)})}if(d.context=M,d.props=x,d.__P=e,d.__e=!1,S=se.__r,T=0,b)d.state=d.__s,d.__d=!1,S&&S(t),h=d.render(d.props,d.state,d.context),hs.push.apply(d.__h,d._sb),d._sb=[];else do d.__d=!1,S&&S(t),h=d.render(d.props,d.state,d.context),d.state=d.__s;while(d.__d&&++T<25);d.state=d.__s,d.getChildContext!=null&&(l=ln(ln({},l),d.getChildContext())),b&&!p&&d.getSnapshotBeforeUpdate!=null&&(A=d.getSnapshotBeforeUpdate(v,$)),L=h!=null&&h.type===gn&&h.key==null?Ga(h.props.children):h,r=Wa(e,Bl(L)?L:[L],t,n,l,s,o,i,r,a,c),d.base=t.__e,t.__u&=-161,d.__h.length&&i.push(d),k&&(d.__E=d.__=null)}catch(I){if(t.__v=null,a||o!=null)if(I.then){for(t.__u|=a?160:128;r&&r.nodeType==8&&r.nextSibling;)r=r.nextSibling;o[o.indexOf(r)]=null,t.__e=r}else{for(D=o.length;D--;)Go(o[D]);Mo(t)}else t.__e=n.__e,t.__k=n.__k,I.then||Mo(t);se.__e(I,t,n)}else o==null&&t.__v==n.__v?(t.__k=n.__k,t.__e=n.__e):r=t.__e=sd(n.__e,t,n,l,s,o,i,a,c);return(h=se.diffed)&&h(t),128&t.__u?void 0:r}function Mo(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(Mo))}function Ka(e,t,n){for(var l=0;l<n.length;l++)Jo(n[l],n[++l],n[++l]);se.__c&&se.__c(t,e),e.some(function(s){try{e=s.__h,s.__h=[],e.some(function(o){o.call(s)})}catch(o){se.__e(o,s.__v)}})}function Ga(e){return typeof e!="object"||e==null||e.__b>0?e:Bl(e)?e.map(Ga):ln({},e)}function sd(e,t,n,l,s,o,i,r,a){var c,h,d,p,v,$,A,k=n.props||ps,x=t.props,b=t.type;if(b=="svg"?s="http://www.w3.org/2000/svg":b=="math"?s="http://www.w3.org/1998/Math/MathML":s||(s="http://www.w3.org/1999/xhtml"),o!=null){for(c=0;c<o.length;c++)if((v=o[c])&&"setAttribute"in v==!!b&&(b?v.localName==b:v.nodeType==3)){e=v,o[c]=null;break}}if(e==null){if(b==null)return document.createTextNode(x);e=document.createElementNS(s,b,x.is&&x),r&&(se.__m&&se.__m(t,o),r=!1),o=null}if(b==null)k===x||r&&e.data==x||(e.data=x);else{if(o=o&&Ss.call(e.childNodes),!r&&o!=null)for(k={},c=0;c<e.attributes.length;c++)k[(v=e.attributes[c]).name]=v.value;for(c in k)v=k[c],c=="dangerouslySetInnerHTML"?d=v:c=="children"||c in x||c=="value"&&"defaultValue"in x||c=="checked"&&"defaultChecked"in x||ns(e,c,null,v,s);for(c in x)v=x[c],c=="children"?p=v:c=="dangerouslySetInnerHTML"?h=v:c=="value"?$=v:c=="checked"?A=v:r&&typeof v!="function"||k[c]===v||ns(e,c,v,k[c],s);if(h)r||d&&(h.__html==d.__html||h.__html==e.innerHTML)||(e.innerHTML=h.__html),t.__k=[];else if(d&&(e.innerHTML=""),Wa(t.type=="template"?e.content:e,Bl(p)?p:[p],t,n,l,b=="foreignObject"?"http://www.w3.org/1999/xhtml":s,o,i,o?o[0]:n.__k&&cl(n,0),r,a),o!=null)for(c=o.length;c--;)Go(o[c]);r||(c="value",b=="progress"&&$==null?e.removeAttribute("value"):$!=null&&($!==e[c]||b=="progress"&&!$||b=="option"&&$!=k[c])&&ns(e,c,$,k[c],s),c="checked",A!=null&&A!=e[c]&&ns(e,c,A,k[c],s))}return e}function Jo(e,t,n){try{if(typeof e=="function"){var l=typeof e.__u=="function";l&&e.__u(),l&&t==null||(e.__u=e(t))}else e.current=t}catch(s){se.__e(s,n)}}function Ya(e,t,n){var l,s;if(se.unmount&&se.unmount(e),(l=e.ref)&&(l.current&&l.current!=e.__e||Jo(l,null,t)),(l=e.__c)!=null){if(l.componentWillUnmount)try{l.componentWillUnmount()}catch(o){se.__e(o,t)}l.base=l.__P=null}if(l=e.__k)for(s=0;s<l.length;s++)l[s]&&Ya(l[s],t,n||typeof e.type!="function");n||Go(e.__e),e.__c=e.__=e.__e=void 0}function od(e,t,n){return this.constructor(e,n)}function id(e,t,n){var l,s,o,i;t==document&&(t=document.documentElement),se.__&&se.__(e,t),s=(l=!1)?null:t.__k,o=[],i=[],Yo(t,e=t.__k=vn(gn,null,[e]),s||ps,ps,t.namespaceURI,s?null:t.firstChild?Ss.call(t.childNodes):null,o,s?s.__e:t.firstChild,l,i),Ka(o,e,i)}function Ja(e){function t(n){var l,s;return this.getChildContext||(l=new Set,(s={})[t.__c]=this,this.getChildContext=function(){return s},this.componentWillUnmount=function(){l=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&l.forEach(function(i){i.__e=!0,xo(i)})},this.sub=function(o){l.add(o);var i=o.componentWillUnmount;o.componentWillUnmount=function(){l&&l.delete(o),i&&i.call(o)}}),n.children}return t.__c="__cC"+ja++,t.__=e,t.Provider=t.__l=(t.Consumer=function(n,l){return n.children(l)}).contextType=t,t}Ss=hs.slice,se={__e:function(e,t,n,l){for(var s,o,i;t=t.__;)if((s=t.__c)&&!s.__)try{if((o=s.constructor)&&o.getDerivedStateFromError!=null&&(s.setState(o.getDerivedStateFromError(e)),i=s.__d),s.componentDidCatch!=null&&(s.componentDidCatch(e,l||{}),i=s.__d),i)return s.__E=s}catch(r){e=r}throw e}},Va=0,Qt.prototype.setState=function(e,t){var n;n=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=ln({},this.state),typeof e=="function"&&(e=e(ln({},n),this.props)),e&&ln(n,e),e!=null&&this.__v&&(t&&this._sb.push(t),xo(this))},Qt.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),xo(this))},Qt.prototype.render=gn,pn=[],Fa=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,Ua=function(e,t){return e.__v.__b-t.__v.__b},ms.__r=0,Ha=/(PointerCapture)$|Capture$/i,Ko=0,ko=Ji(!1),So=Ji(!0),ja=0;var Za=function(e,t,n,l){var s;t[0]=0;for(var o=1;o<t.length;o++){var i=t[o++],r=t[o]?(t[0]|=i?1:2,n[t[o++]]):t[++o];i===3?l[0]=r:i===4?l[1]=Object.assign(l[1]||{},r):i===5?(l[1]=l[1]||{})[t[++o]]=r:i===6?l[1][t[++o]]+=r+"":i?(s=e.apply(r,Za(e,r,n,["",null])),l.push(s),r[0]?t[0]|=2:(t[o-2]=0,t[o]=s)):l.push(r)}return l},Zi=new Map;function rd(e){var t=Zi.get(this);return t||(t=new Map,Zi.set(this,t)),(t=Za(this,t.get(e)||(t.set(e,t=function(n){for(var l,s,o=1,i="",r="",a=[0],c=function(p){o===1&&(p||(i=i.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?a.push(0,p,i):o===3&&(p||i)?(a.push(3,p,i),o=2):o===2&&i==="..."&&p?a.push(4,p,0):o===2&&i&&!p?a.push(5,0,!0,i):o>=5&&((i||!p&&o===5)&&(a.push(o,0,i,s),o=6),p&&(a.push(o,p,0,s),o=6)),i=""},h=0;h<n.length;h++){h&&(o===1&&c(),c(h));for(var d=0;d<n[h].length;d++)l=n[h][d],o===1?l==="<"?(c(),a=[a],o=3):i+=l:o===4?i==="--"&&l===">"?(o=1,i=""):i=l+i[0]:r?l===r?r="":i+=l:l==='"'||l==="'"?r=l:l===">"?(c(),o=1):o&&(l==="="?(o=5,s=i,i=""):l==="/"&&(o<5||n[h][d+1]===">")?(c(),o===3&&(a=a[0]),o=a,(a=a[0]).push(2,0,o),o=0):l===" "||l==="	"||l===`
`||l==="\r"?(c(),o=2):i+=l),o===3&&i==="!--"&&(o=4,a=a[0])}return c(),a}(e)),t),arguments,[])).length>1?t:t[0]}var g=rd.bind(vn);const ad="modulepreload",cd=function(e){return"/"+e},Qi={},ft=function(t,n,l){let s=Promise.resolve();if(n&&n.length>0){document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),r=(i==null?void 0:i.nonce)||(i==null?void 0:i.getAttribute("nonce"));s=Promise.allSettled(n.map(a=>{if(a=cd(a),a in Qi)return;Qi[a]=!0;const c=a.endsWith(".css"),h=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${a}"]${h}`))return;const d=document.createElement("link");if(d.rel=c?"stylesheet":ad,c||(d.as="script"),d.crossOrigin="",d.href=a,r&&d.setAttribute("nonce",r),document.head.appendChild(d),c)return new Promise((p,v)=>{d.addEventListener("load",p),d.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${a}`)))})}))}function o(i){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=i,window.dispatchEvent(r),!r.defaultPrevented)throw i}return s.then(i=>{for(const r of i||[])r.status==="rejected"&&o(r.reason);return t().catch(o)})};var On,De,io,Xi,Nl=0,Qa=[],Ve=se,er=Ve.__b,tr=Ve.__r,nr=Ve.diffed,lr=Ve.__c,sr=Ve.unmount,or=Ve.__;function Wl(e,t){Ve.__h&&Ve.__h(De,e,Nl||t),Nl=0;var n=De.__H||(De.__H={__:[],__h:[]});return e>=n.__.length&&n.__.push({}),n.__[e]}function Q(e){return Nl=1,ud(ec,e)}function ud(e,t,n){var l=Wl(On++,2);if(l.t=e,!l.__c&&(l.__=[n?n(t):ec(void 0,t),function(r){var a=l.__N?l.__N[0]:l.__[0],c=l.t(a,r);a!==c&&(l.__N=[c,l.__[1]],l.__c.setState({}))}],l.__c=De,!De.__f)){var s=function(r,a,c){if(!l.__c.__H)return!0;var h=l.__c.__H.__.filter(function(p){return p.__c});if(h.every(function(p){return!p.__N}))return!o||o.call(this,r,a,c);var d=l.__c.props!==r;return h.some(function(p){if(p.__N){var v=p.__[0];p.__=p.__N,p.__N=void 0,v!==p.__[0]&&(d=!0)}}),o&&o.call(this,r,a,c)||d};De.__f=!0;var o=De.shouldComponentUpdate,i=De.componentWillUpdate;De.componentWillUpdate=function(r,a,c){if(this.__e){var h=o;o=void 0,s(r,a,c),o=h}i&&i.call(this,r,a,c)},De.shouldComponentUpdate=s}return l.__N||l.__}function ce(e,t){var n=Wl(On++,3);!Ve.__s&&Xa(n.__H,t)&&(n.__=e,n.u=t,De.__H.__h.push(n))}function ee(e){return Nl=5,Me(function(){return{current:e}},[])}function Me(e,t){var n=Wl(On++,7);return Xa(n.__H,t)&&(n.__=e(),n.__H=t,n.__h=e),n.__}function le(e,t){return Nl=8,Me(function(){return e},t)}function xs(e){var t=De.context[e.__c],n=Wl(On++,9);return n.c=e,t?(n.__==null&&(n.__=!0,t.sub(De)),t.props.value):e.__}function dd(){var e=Wl(On++,11);if(!e.__){for(var t=De.__v;t!==null&&!t.__m&&t.__!==null;)t=t.__;var n=t.__m||(t.__m=[0,0]);e.__="P"+n[0]+"-"+n[1]++}return e.__}function fd(){for(var e;e=Qa.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(ds),t.__h.some(Eo),t.__h=[]}catch(n){t.__h=[],Ve.__e(n,e.__v)}}}Ve.__b=function(e){De=null,er&&er(e)},Ve.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),or&&or(e,t)},Ve.__r=function(e){tr&&tr(e),On=0;var t=(De=e.__c).__H;t&&(io===De?(t.__h=[],De.__h=[],t.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(t.__h.some(ds),t.__h.some(Eo),t.__h=[],On=0)),io=De},Ve.diffed=function(e){nr&&nr(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(Qa.push(t)!==1&&Xi===Ve.requestAnimationFrame||((Xi=Ve.requestAnimationFrame)||pd)(fd)),t.__H.__.some(function(n){n.u&&(n.__H=n.u),n.u=void 0})),io=De=null},Ve.__c=function(e,t){t.some(function(n){try{n.__h.some(ds),n.__h=n.__h.filter(function(l){return!l.__||Eo(l)})}catch(l){t.some(function(s){s.__h&&(s.__h=[])}),t=[],Ve.__e(l,n.__v)}}),lr&&lr(e,t)},Ve.unmount=function(e){sr&&sr(e);var t,n=e.__c;n&&n.__H&&(n.__H.__.some(function(l){try{ds(l)}catch(s){t=s}}),n.__H=void 0,t&&Ve.__e(t,n.__v))};var ir=typeof requestAnimationFrame=="function";function pd(e){var t,n=function(){clearTimeout(l),ir&&cancelAnimationFrame(t),setTimeout(e)},l=setTimeout(n,35);ir&&(t=requestAnimationFrame(n))}function ds(e){var t=De,n=e.__c;typeof n=="function"&&(e.__c=void 0,n()),De=t}function Eo(e){var t=De;e.__c=e.__(),De=t}function Xa(e,t){return!e||e.length!==t.length||t.some(function(n,l){return n!==e[l]})}function ec(e,t){return typeof t=="function"?t(e):t}function hd(e,t){for(var n in t)e[n]=t[n];return e}function rr(e,t){for(var n in e)if(n!=="__source"&&!(n in t))return!0;for(var l in t)if(l!=="__source"&&e[l]!==t[l])return!0;return!1}function ar(e,t){this.props=e,this.context=t}(ar.prototype=new Qt).isPureReactComponent=!0,ar.prototype.shouldComponentUpdate=function(e,t){return rr(this.props,e)||rr(this.state,t)};var cr=se.__b;se.__b=function(e){e.type&&e.type.__f&&e.ref&&(e.props.ref=e.ref,e.ref=null),cr&&cr(e)};var md=se.__e;se.__e=function(e,t,n,l){if(e.then){for(var s,o=t;o=o.__;)if((s=o.__c)&&s.__c)return t.__e==null&&(t.__e=n.__e,t.__k=n.__k),s.__c(e,t)}md(e,t,n,l)};var ur=se.unmount;function tc(e,t,n){return e&&(e.__c&&e.__c.__H&&(e.__c.__H.__.forEach(function(l){typeof l.__c=="function"&&l.__c()}),e.__c.__H=null),(e=hd({},e)).__c!=null&&(e.__c.__P===n&&(e.__c.__P=t),e.__c.__e=!0,e.__c=null),e.__k=e.__k&&e.__k.map(function(l){return tc(l,t,n)})),e}function nc(e,t,n){return e&&n&&(e.__v=null,e.__k=e.__k&&e.__k.map(function(l){return nc(l,t,n)}),e.__c&&e.__c.__P===t&&(e.__e&&n.appendChild(e.__e),e.__c.__e=!0,e.__c.__P=n)),e}function Dn(){this.__u=0,this.o=null,this.__b=null}function lc(e){var t=e.__&&e.__.__c;return t&&t.__a&&t.__a(e)}function pt(e){var t,n,l,s=null;function o(i){if(t||(t=e()).then(function(r){r&&(s=r.default||r),l=!0},function(r){n=r,l=!0}),n)throw n;if(!l)throw t;return s?vn(s,i):null}return o.displayName="Lazy",o.__f=!0,o}function ls(){this.i=null,this.l=null}se.unmount=function(e){var t=e.__c;t&&(t.__z=!0),t&&t.__R&&t.__R(),t&&32&e.__u&&(e.type=null),ur&&ur(e)},(Dn.prototype=new Qt).__c=function(e,t){var n=t.__c,l=this;l.o==null&&(l.o=[]),l.o.push(n);var s=lc(l.__v),o=!1,i=function(){o||l.__z||(o=!0,n.__R=null,s?s(a):a())};n.__R=i;var r=n.__P;n.__P=null;var a=function(){if(!--l.__u){if(l.state.__a){var c=l.state.__a;l.__v.__k[0]=nc(c,c.__c.__P,c.__c.__O)}var h;for(l.setState({__a:l.__b=null});h=l.o.pop();)h.__P=r,h.forceUpdate()}};l.__u++||32&t.__u||l.setState({__a:l.__b=l.__v.__k[0]}),e.then(i,i)},Dn.prototype.componentWillUnmount=function(){this.o=[]},Dn.prototype.render=function(e,t){if(this.__b){if(this.__v.__k){var n=document.createElement("div"),l=this.__v.__k[0].__c;this.__v.__k[0]=tc(this.__b,n,l.__O=l.__P)}this.__b=null}var s=t.__a&&vn(gn,null,e.fallback);return s&&(s.__u&=-33),[vn(gn,null,t.__a?null:e.children),s]};var dr=function(e,t,n){if(++n[1]===n[0]&&e.l.delete(t),e.props.revealOrder&&(e.props.revealOrder[0]!=="t"||!e.l.size))for(n=e.i;n;){for(;n.length>3;)n.pop()();if(n[1]<n[0])break;e.i=n=n[2]}};(ls.prototype=new Qt).__a=function(e){var t=this,n=lc(t.__v),l=t.l.get(e);return l[0]++,function(s){var o=function(){t.props.revealOrder?(l.push(s),dr(t,e,l)):s()};n?n(o):o()}},ls.prototype.render=function(e){this.i=null,this.l=new Map;var t=Il(e.children);e.revealOrder&&e.revealOrder[0]==="b"&&t.reverse();for(var n=t.length;n--;)this.l.set(t[n],this.i=[1,0,this.i]);return e.children},ls.prototype.componentDidUpdate=ls.prototype.componentDidMount=function(){var e=this;this.l.forEach(function(t,n){dr(e,n,t)})};var _d=typeof Symbol<"u"&&Symbol.for&&Symbol.for("react.element")||60103,vd=/^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/,gd=/^on(Ani|Tra|Tou|BeforeInp|Compo)/,yd=/[A-Z0-9]/g,bd=typeof document<"u",$d=function(e){return(typeof Symbol<"u"&&typeof Symbol()=="symbol"?/fil|che|rad/:/fil|che|ra/).test(e)};Qt.prototype.isReactComponent=!0,["componentWillMount","componentWillReceiveProps","componentWillUpdate"].forEach(function(e){Object.defineProperty(Qt.prototype,e,{configurable:!0,get:function(){return this["UNSAFE_"+e]},set:function(t){Object.defineProperty(this,e,{configurable:!0,writable:!0,value:t})}})});var fr=se.event;se.event=function(e){return fr&&(e=fr(e)),e.persist=function(){},e.isPropagationStopped=function(){return this.cancelBubble},e.isDefaultPrevented=function(){return this.defaultPrevented},e.nativeEvent=e};var wd={configurable:!0,get:function(){return this.class}},pr=se.vnode;se.vnode=function(e){typeof e.type=="string"&&function(t){var n=t.props,l=t.type,s={},o=l.indexOf("-")==-1;for(var i in n){var r=n[i];if(!(i==="value"&&"defaultValue"in n&&r==null||bd&&i==="children"&&l==="noscript"||i==="class"||i==="className")){var a=i.toLowerCase();i==="defaultValue"&&"value"in n&&n.value==null?i="value":i==="download"&&r===!0?r="":a==="translate"&&r==="no"?r=!1:a[0]==="o"&&a[1]==="n"?a==="ondoubleclick"?i="ondblclick":a!=="onchange"||l!=="input"&&l!=="textarea"||$d(n.type)?a==="onfocus"?i="onfocusin":a==="onblur"?i="onfocusout":gd.test(i)&&(i=a):a=i="oninput":o&&vd.test(i)?i=i.replace(yd,"-$&").toLowerCase():r===null&&(r=void 0),a==="oninput"&&s[i=a]&&(i="oninputCapture"),s[i]=r}}l=="select"&&(s.multiple&&Array.isArray(s.value)&&(s.value=Il(n.children).forEach(function(c){c.props.selected=s.value.indexOf(c.props.value)!=-1})),s.defaultValue!=null&&(s.value=Il(n.children).forEach(function(c){c.props.selected=s.multiple?s.defaultValue.indexOf(c.props.value)!=-1:s.defaultValue==c.props.value}))),n.class&&!n.className?(s.class=n.class,Object.defineProperty(s,"className",wd)):n.className&&(s.class=s.className=n.className),t.props=s}(e),e.$$typeof=_d,pr&&pr(e)};var hr=se.__r;se.__r=function(e){hr&&hr(e),e.__c};var mr=se.diffed;se.diffed=function(e){mr&&mr(e);var t=e.props,n=e.__e;n!=null&&e.type==="textarea"&&"value"in t&&t.value!==n.value&&(n.value=t.value==null?"":t.value)};const zl=Ja(null);function kd(e){const t=String(e||"");return/^[A-Za-z]:([\\/]|$)/.test(t)||t.startsWith("\\\\")||t.includes("\\")&&!t.includes("/")}function sc(e){return kd(e)?"\\":"/"}function oc(e){return String(e||"").split(/[\\/]+/).filter(Boolean)}function ic(e){const t=String(e||"");if(!t)return"";const n=oc(t);if(!n.length)return t;const l=n[n.length-1];return n.length===1&&/^[A-Za-z]:$/.test(l)?l+"\\":l}function F_(e,t=2){const n=String(e||"");if(!n)return"";const l=sc(n),s=oc(n);return s.length<=t?n:"…"+l+s.slice(-t).join(l)}let Sd="";function Vl(e){return Sd+e}async function ie(e,t=void 0){const n=await(t===void 0?fetch(Vl(e)):fetch(Vl(e),t));if(!n.ok){let l="";try{const o=await n.text();if(o)try{l=JSON.parse(o).error||o}catch{l=o}}catch{}const s=new Error(`HTTP ${n.status} ${e}`+(l?`: ${String(l).slice(0,200)}`:""));throw s.status=n.status,s}return n.json()}async function xd(){return ie("/api/snapshot")}async function Co(e={}){let t="/api/history";const n=[];return e.range&&n.push("range="+e.range),e.since!=null&&n.push("since="+e.since),e.until!=null&&n.push("until="+e.until),e.tool&&n.push("tool="+encodeURIComponent(e.tool)),n.length&&(t+="?"+n.join("&")),ie(t)}async function Md(e={}){let t="/api/events";const n=[];return e.tool&&n.push("tool="+encodeURIComponent(e.tool)),e.since!=null&&n.push("since="+e.since),e.until!=null&&n.push("until="+e.until),e.sessionId&&n.push("session_id="+encodeURIComponent(e.sessionId)),e.limit&&n.push("limit="+e.limit),n.length&&(t+="?"+n.join("&")),ie(t)}async function U_(e={}){let t="/api/sessions";const n=[];return e.tool&&n.push("tool="+encodeURIComponent(e.tool)),e.active!=null&&n.push("active="+e.active),e.limit&&n.push("limit="+e.limit),n.length&&(t+="?"+n.join("&")),ie(t)}async function Zo(e,t,n){const l=(Array.isArray(e)?e:[e]).filter(r=>r!=null&&r!=="");let s,o=!1,i=null;for(const r of l)try{const a=await t(r);if(n(a))return a;o||(s=a,o=!0)}catch(a){i===null&&(i=a)}if(o)return s;throw i??new Error("no session id to fetch")}async function H_(e,t,n){return Zo(e,l=>ie(`/api/session-flow?session_id=${encodeURIComponent(l)}&since=${t}&until=${n}`),l=>{var s;return(((s=l==null?void 0:l.turns)==null?void 0:s.length)??0)>0})}let rc=0;async function j_(e,t={}){let n="/api/session-timeline";const l=[];t.since!=null&&l.push("since="+t.since),t.until!=null&&l.push("until="+t.until),l.length&&(n+="?"+l.join("&"));const s=await ie(n),o=Array.isArray(s)?s:Array.isArray(s==null?void 0:s.sessions)?s.sessions:[],i=Array.isArray(s)?0:Number(s==null?void 0:s.filtered_count)||0;rc=i;try{o.filtered_count=i}catch{}return o}function B_(){return rc}async function W_(e,t,n=30,l=20){return ie(`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=${n}&limit=${l}`)}async function q_(e,t={}){let n="/api/events?session_id="+encodeURIComponent(e);return t.since!=null&&(n+="&since="+t.since),t.until!=null&&(n+="&until="+t.until),t.limit!=null&&(n+="&limit="+t.limit),ie(n)}async function K_(e,t={}){let n="/api/samples?metric="+encodeURIComponent(e);if(t.since!=null&&(n+="&since="+t.since),t.limit!=null&&(n+="&limit="+t.limit),t.tags)for(const[l,s]of Object.entries(t.tags))s!=null&&(n+="&tag."+encodeURIComponent(l)+"="+encodeURIComponent(s));return ie(n)}async function G_(e){return ie("/api/session-subprocesses?session_id="+encodeURIComponent(e))}async function Y_(e){return ie("/api/session-mcp-usage?session_id="+encodeURIComponent(e))}async function J_(e){return ie("/api/session-cost-by-model?session_id="+encodeURIComponent(e))}async function Z_(e){return ie("/api/session-processes?session_id="+encodeURIComponent(e))}async function Q_(e){return Zo(e,t=>ie("/api/session-tool-calls?session_id="+encodeURIComponent(t)),t=>{var n;return(((n=t==null?void 0:t.calls)==null?void 0:n.length)??0)>0})}async function X_(e){return ie("/api/session-stats?session_id="+encodeURIComponent(e))}async function ev(e){return ie("/api/session-commits?session_id="+encodeURIComponent(e))}async function tv(e,t=200){return ie("/api/session-messages?session_id="+encodeURIComponent(e)+"&limit="+t)}async function nv(e){return ie("/api/session-memory-diff?session_id="+encodeURIComponent(e))}async function lv(e){return Zo(e,t=>ie("/api/transcript/"+encodeURIComponent(t)),t=>{var n;return(((n=t==null?void 0:t.turns)==null?void 0:n.length)??0)>0})}async function sv(e,t={}){return ie(e,t)}async function Ed({since:e,until:t}={}){const n=new URLSearchParams;e!=null&&n.set("since",String(e)),t!=null&&n.set("until",String(t));const l=n.toString();return ie("/api/usage"+(l?"?"+l:""))}async function ov(e=7){return ie("/api/project-costs?days="+e)}async function iv(e,t=100,n=null){const l=new URLSearchParams({since:String(e),limit:String(t)});return n&&l.set("session_id",n),ie(`/api/api-calls?${l.toString()}`)}async function rv(e=""){return ie("/api/budget"+(e?"?"+e:""))}async function Cd(e,t={}){return fetch(Vl("/api/file?path="+encodeURIComponent(e)),{headers:t})}async function Ad(e,t){return fetch(Vl("/api/files/history?path="+encodeURIComponent(e)+"&ts="+t))}async function av(){return ie("/api/samples?list=1")}async function cv(e,t){return ie("/api/samples?series="+encodeURIComponent(e)+"&since="+t)}async function uv(e,t){return ie("/api/samples?metric="+encodeURIComponent(e)+"&since="+t)}async function ac(){return ie("/api/otel-status")}async function Td(){return ie("/api/ingesters")}async function cc(){return ie("/api/self-status")}async function Ld(){return ie("/api/effective-models")}async function Dd(){return ie("/api/hooks-status")}async function uc(e={}){let t="/api/data-quality";const n=[];return e.status&&n.push("status="+encodeURIComponent(e.status)),e.kind&&n.push("kind="+encodeURIComponent(e.kind)),e.component&&n.push("component="+encodeURIComponent(e.component)),e.limit&&n.push("limit="+e.limit),n.length&&(t+="?"+n.join("&")),ie(t)}async function dv(e){return ie("/api/tool-config/"+encodeURIComponent(e))}async function fv(e,t){return ie("/api/tool-config/"+encodeURIComponent(e),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})}async function pv(e,t="TERM"){return ie("/api/session-kill",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:e,confirm:!0,signal:t})})}let ro=null;async function Pd(){return ro||(ro=ie("/api/datapoints")),ro}function Od(){return Vl("/api/stream")}const nl=window.COLORS??{},hv=window.VENDOR_LABELS??{},mv=window.VENDOR_COLORS??{},_v=window.HOST_LABELS??{},vv=window.TOOL_RELATIONSHIPS??{},Rd={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},dc=["auto","dark","light","editorial"],gv=5,Xn=15,yv={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},bv=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],$v={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},wv=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],_r=new Map,Id=6e4;function fc(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function Ms(e,t,n,l=1){for(let s=t.length-1;s>=0;s--){const[o,i]=t[s],r=e/o;if(r>=l)return fc(r)+i}return Math.round(e)+n}const Nd=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],zd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],Vd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function vt(e){return Ms(e,zd,"")}function kv(e){return Ms(e,Vd,"")}function Xt(e){return Ms(e,Nd,"B")}function Ao(e){return!e||e<=0?"0B/s":Ms(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function ul(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function ol(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function vr(e,t){if(!e)return t;if(typeof e=="string"&&e.startsWith("var(")){const n=e.slice(4,-1).trim();return(typeof document<"u"?getComputedStyle(document.documentElement).getPropertyValue(n).trim():"")||t}return e}function Fd(e){return vr(e,"")||vr("var(--fg2)","")||void 0}function Sv(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function xv(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Qo(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const n=Math.floor(t/60);return n<60?n+"m "+t%60+"s":Math.floor(n/60)+"h "+n%60+"m"}function Mv(e){if(e==null||isNaN(e)||e<=0)return"";if(e<1e3)return Math.round(e)+"ms";const t=e/1e3;if(t<10)return t.toFixed(1).replace(/\.0$/,"")+"s";const n=Math.round(t);if(n<60)return n+"s";const l=Math.floor(n/60);return l<60?l+"m "+n%60+"s":Math.floor(l/60)+"h "+l%60+"m"}function Ev(e){return e?new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):""}function Cv(e){return e?new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function Av(e){if(!e)return"";const t=String(e).split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:String(e).slice(-6)}function Tv(e){return e?e.replace("claude-","").replace("gpt-","").replace(/-\d{8}$/,""):""}const gr=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"];function Lv(e){if(!e)return"var(--fg2)";let t=0;for(let n=0;n<e.length;n++)t=t*31+e.charCodeAt(n)&65535;return gr[t%gr.length]}function Ud(e){return nl[e]||"var(--fg2)"}function _s(e){return e&&e.replace(/\\/g,"/")}function ao(e,t){const n=_s(e),l=_s(t);return n.startsWith(l+"/")?"project":n.includes("/.claude/projects/")?"shadow":n.includes("/.claude/")||n.includes("/.config/")||n.includes("/Library/")||n.includes("/AppData/")||n.includes("/.copilot/")||n.includes("/.vscode/")?"global":"external"}function Hd(e,t){const n=_s(e),l=_s(t),s=sc(e);if(n.startsWith(l+"/")){const r=n.slice(l.length+1),a=r.split("/");return a.pop(),a.length?a.join(s):"(root)"}const o=n.split("/");o.pop();const i=s==="/"?"~/":"";for(let r=o.length-1;r>=0;r--)if(o[r].startsWith(".")&&o[r].length>1&&o[r]!==".."||o[r]==="Library"||o[r]==="AppData")return i+o.slice(r).join(s);return o.slice(-2).join(s)}function Dv(e,t){const n={};e.forEach(s=>{const o=ao(s.path,t),i=Hd(s.path,t),r=o==="project"?i:o+": "+i;(n[r]=n[r]||[]).push(s)});const l={project:0,global:1,shadow:2,external:3};return Object.entries(n).sort((s,o)=>{const i=s[1][0]?ao(s[1][0].path,t):"z",r=o[1][0]?ao(o[1][0].path,t):"z";return(l[i]||9)-(l[r]||9)})}function jd(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let n=2;n<e.length;n++)t.push((e[n-2]+e[n-1]+e[n])/3);return t}async function Bd(e){const t=_r.get(e);if(t&&Date.now()-t.ts<Id)return t.content;const n={};t&&t.etag&&(n["If-None-Match"]=t.etag);const l=await Cd(e,n);if(l.status===304&&t)return t.ts=Date.now(),t.content;if(!l.ok)throw new Error(l.statusText);const s=await l.text(),o=l.headers.get("ETag")||null;return _r.set(e,{content:s,ts:Date.now(),etag:o}),s}async function Wd(e,t){const n=await Ad(e,t);if(n.status===404)throw new Error("No content at that timestamp");if(!n.ok)throw new Error(n.statusText);return n.text()}function ss(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function Pv(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function co(e,t,n,l){if(e==null||e==="")return"";let s=typeof e=="number"?e:parseFloat(e)||0;l&&(s*=l);let o;switch(t){case"size":o=Xt(s);break;case"rate":o=Ao(s);break;case"kilo":o=vt(s);break;case"percent":o=ul(s);break;case"pct":o=ul(s);break;case"raw":default:o=Number.isInteger(s)?String(s):fc(s)}return n?o+n:o}function yr(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const br=200,$r=80,qd=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Kd(e,t){if(!e)return t;const n=Object.fromEntries((t.tools||[]).map(l=>[l.tool,l]));return{...e,...t,tools:e.tools.map(l=>{const s=n[l.tool];return s?{...l,live:s.live,vendor:s.vendor||l.vendor,host:s.host||l.host}:l})}}function Gd(e,t){var l,s,o,i;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>br)for(const r of qd)e[r]=e[r].slice(-br);const n=e.by_tool||{};for(const r of t.tools||[]){if(r.tool==="aictl")continue;const a=((l=r.live)==null?void 0:l.cpu_percent)||0,c=((s=r.live)==null?void 0:s.mem_mb)||0,h=r.tokens||0,d=(((o=r.live)==null?void 0:o.outbound_rate_bps)||0)+(((i=r.live)==null?void 0:i.inbound_rate_bps)||0);n[r.tool]||(n[r.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const p=n[r.tool];if(p.ts.push(t.timestamp),p.cpu.push(Math.round(a*10)/10),p.mem_mb.push(Math.round(c*10)/10),p.tokens.push(h),p.traffic.push(Math.round(d*100)/100),p.ts.length>$r)for(const v of Object.keys(p))p[v]=p[v].slice(-$r)}return{...e,by_tool:n}}const Yd=15,Jd=5;function pc(e){return(e==null?void 0:e.session_id)??(e==null?void 0:e.id)??null}const wr=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;function Zd(e){return Array.isArray(e==null?void 0:e.alt_session_ids)?e.alt_session_ids:[]}function To(e){const t=[];for(const n of[pc(e),...Zd(e)])n!=null&&n!==""&&!t.includes(n)&&t.push(n);return t}function Ov(e,t){if(t!=null)return(e||[]).find(n=>To(n).includes(t))}function kr(e){return Math.max((e==null?void 0:e.ended_at)||0,(e==null?void 0:e.started_at)||0,(e==null?void 0:e.last_activity)||0)}function Sr(e){return e!=null&&e.duration_s?e.duration_s:e!=null&&e.ended_at&&(e!=null&&e.started_at)?e.ended_at-e.started_at:null}function xr(e,t){const[n,l]=kr(t)>kr(e)?[t,e]:[e,t],s={...n};for(const i of["input_tokens","output_tokens","exact_input_tokens","exact_output_tokens","files_modified"]){const r=(l==null?void 0:l[i])||0;r>(s[i]||0)&&(s[i]=r)}for(const i of Object.keys(l||{}))s[i]==null&&l[i]!=null&&(s[i]=l[i]);const o=[];for(const i of[...To(n),...To(l)])o.includes(i)||o.push(i);if(o.length>1){const i=wr.test(String(o[0]))?o[0]:o.find(r=>wr.test(String(r)))??o[0];s.session_id=i,s.id!=null&&(s.id=i),s.alt_session_ids=o.filter(r=>r!==i)}return s}function Qd(e,t){if(!(e!=null&&e.tool)||e.tool!==(t==null?void 0:t.tool)||e.started_at==null||t.started_at==null||Math.abs(e.started_at-t.started_at)>Yd)return!1;const n=Sr(e),l=Sr(t);return n==null&&l==null?!0:n==null||l==null?!1:Math.abs(n-l)<=Jd}function Rv(e){if(!Array.isArray(e))return[];if(e.length<2)return e.slice();const t=new Map,n=[];for(const s of e){if(!s)continue;const o=pc(s);if(o!=null&&t.has(o)){const i=t.get(o);n[i]=xr(n[i],s)}else o!=null&&t.set(o,n.length),n.push(s)}const l=[];for(const s of n){const o=l.findIndex(i=>Qd(i,s));o>=0?l[o]=xr(l[o],s):l.push(s)}return l}const ut=e=>Number(e)||0;function Xd(e){const t=((e==null?void 0:e.tools)||[]).filter(r=>r.tool!=="aictl"),n=r=>Array.isArray(r.files)?r.files:[],l=r=>t.reduce((a,c)=>a+r(c),0),s=r=>r.live||{},o=(e==null?void 0:e.agent_memory)||[],i=r=>{var a,c;return ut((a=s(r).token_estimate)==null?void 0:a.input_tokens)+ut((c=s(r).token_estimate)==null?void 0:c.output_tokens)};return{total_files:l(r=>Array.isArray(r.files)?r.files.length:ut(r.files_count)),total_tokens:l(r=>n(r).reduce((a,c)=>a+ut(c.tokens),0)),total_size:l(r=>n(r).reduce((a,c)=>a+ut(c.size),0)),total_processes:l(r=>Math.max(Array.isArray(r.processes)?r.processes.length:ut(r.processes_count),ut(s(r).pid_count))),total_cpu:Math.round(l(r=>s(r).cpu_percent?ut(s(r).cpu_percent):(r.processes||[]).reduce((a,c)=>a+ut(c.cpu_pct),0))*10)/10,total_mem_mb:Math.round(l(r=>(r.processes||[]).reduce((a,c)=>a+ut(c.mem_mb),0))*10)/10,total_mcp_servers:((e==null?void 0:e.mcp_detail)||[]).length,total_memory_tokens:o.reduce((r,a)=>r+ut(a.tokens),0),total_live_sessions:l(r=>ut(s(r).session_count)),total_live_estimated_tokens:l(i),total_live_outbound_rate_bps:Math.round(l(r=>ut(s(r).outbound_rate_bps))*100)/100,total_live_inbound_rate_bps:Math.round(l(r=>ut(s(r).inbound_rate_bps))*100)/100}}function ef(e,t){if(!e||!Array.isArray(t))return e;const n=e.by_tool||{},l=t.filter(i=>{var r,a;return(a=(r=n[i])==null?void 0:r.ts)==null?void 0:a.length}),s=[...new Set(l.flatMap(i=>n[i].ts))].sort((i,r)=>i-r),o=i=>s.map(r=>l.reduce((a,c)=>{var d;const h=n[c].ts.indexOf(r);return a+(h>=0?ut((d=n[c][i])==null?void 0:d[h]):0)},0));return{ts:s,cpu:o("cpu"),mem_mb:o("mem_mb"),tokens:o("tokens"),by_tool:n}}function tf(e,t,n={}){const{onConnect:l,onDisconnect:s,initialRetryMs:o=1e3,maxRetryMs:i=3e4,EventSourceClass:r=typeof EventSource<"u"?EventSource:null}=n,[a,c]=Q(!1),h=ee(null),d=ee(!1),p=ee(o),v=ee(t);v.current=t;const $=ee(l);$.current=l;const A=ee(s);A.current=s,ce(()=>{if(!r||!e)return;d.current=!1,p.current=o;function x(){if(d.current)return;const b=new r(e);h.current=b,b.onopen=()=>{var E;c(!0),p.current=o,(E=$.current)==null||E.call($)},b.onmessage=E=>{try{const M=JSON.parse(E.data);v.current(M)}catch{}},b.onerror=()=>{var E;c(!1),(E=A.current)==null||E.call(A),b.close(),d.current||(setTimeout(x,p.current),p.current=Math.min(p.current*2,i))}}return x(),()=>{var b;d.current=!0,(b=h.current)==null||b.close(),c(!1)}},[e,r,o,i]);const k=le(()=>{var x;d.current=!0,(x=h.current)==null||x.close(),c(!1)},[]);return{connected:a,close:k}}const nf=720;function lf(e={}){const{EventSourceClass:t,refreshMs:n=3e4,applyMs:l=1e3}=e,[s,o]=Q(null),[i,r]=Q(null),[a,c]=Q(null),h=ee(!1),d=le(()=>h.current?Promise.resolve():(h.current=!0,xd().then(b=>{o(b),c(Date.now())}).catch(()=>{}).finally(()=>{h.current=!1})),[]);ce(()=>{d(),Co().then(r).catch(()=>{})},[d]);const p=ee([]),v=ee(0),$=ee(null),A=le(()=>{$.current&&(clearTimeout($.current),$.current=null);const b=p.current;if(!b.length)return;p.current=[],v.current=Date.now();const E=b[b.length-1];o(M=>M&&Kd(M,E)),r(M=>b.reduce(Gd,M)),c(Date.now())},[]),k=le(b=>{if(p.current.push(b),p.current.length>nf&&p.current.shift(),typeof document<"u"&&document.hidden)return;const E=l-(Date.now()-v.current);E<=0?A():$.current||($.current=setTimeout(A,E))},[l,A]);ce(()=>{const b=()=>{document.hidden||A()};return document.addEventListener("visibilitychange",b),()=>{document.removeEventListener("visibilitychange",b),$.current&&clearTimeout($.current)}},[A]);const{connected:x}=tf(Od(),k,t?{EventSourceClass:t}:{});return ce(()=>{if(!n)return;const b=setInterval(()=>{document.hidden||d()},n);return()=>clearInterval(b)},[d,n]),{snapshot:s,history:i,connected:x,lastUpdateAt:a,refresh:d,setHistory:r}}function ll(e,t=[],{pollMs:n=0}={}){const[l,s]=Q({data:null,error:null,loading:!0,updatedAt:null}),o=ee(e);o.current=e;const i=ee(0),r=le(()=>{const a=++i.current;return s(c=>({...c,loading:!0})),Promise.resolve().then(()=>o.current()).then(c=>{a===i.current&&s({data:c,error:null,loading:!1,updatedAt:Date.now()})}).catch(c=>{a===i.current&&s(h=>({...h,error:c,loading:!1}))})},[]);return ce(()=>{if(r(),!n)return()=>{i.current++};const a=setInterval(()=>{document.hidden||r()},n);return()=>{clearInterval(a),i.current++}},[r,n,...t]),{...l,reload:r}}const sf={dashboard:"overview",sessions:"explorer","session-explorer":"explorer",processes:"procs",context:"memory","ai-context":"memory",monitor:"live","events-stats":"events",token_budget:"budget",configuration:"config"};function Mr(e,t){if(!e)return null;const n=sf[e]||e;return t.includes(n)?n:null}function of(e){const t=new URLSearchParams(e||""),n={};if(t.has("tab")&&(n.tab=t.get("tab")),t.has("range")){const l=t.get("range");if(l==="custom"){const s=Number(t.get("since")),o=Number(t.get("until"));s>0&&o>s&&(n.range={id:l,since:s,until:o})}else n.range={id:l}}if(t.has("tools")){const l=t.get("tools");n.tools=l?l.split(",").filter(Boolean):[]}return n}function rf(e,t){const n=new URLSearchParams(e||"");for(const[s,o]of Object.entries(t))o==null?n.delete(s):n.set(s,String(o));const l=n.toString().replace(/%2C/g,",");return l?"?"+l:""}function af(e){return!e||e.id==="live"?{range:null,since:null,until:null}:e.id==="custom"?{range:"custom",since:Math.floor(e.since),until:Math.floor(e.until)}:{range:e.id,since:null,until:null}}function cf(e){return{tools:e==null?null:e.join(",")}}function uf(e,t="overview"){return{tab:e===t?null:e}}function hc(){return typeof window<"u"?window.location:null}function Xo(e,{push:t=!1}={}){const n=hc();if(!n||typeof history>"u")return;const l=rf(n.search,e);if(l===n.search)return;const s=n.pathname+l+n.hash;try{t?history.pushState(null,"",s):history.replaceState(null,"",s)}catch{}}function ei(){const e=hc();return of(e?e.search:"")}const Fl=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],Es=Object.fromEntries(Fl.map(e=>[e.id,e.seconds])),mc="aictl-pref-range";function df(){try{const e=localStorage.getItem(mc),t=e!=null?JSON.parse(e):"live";return Es[t]?t:"live"}catch{return"live"}}function ff(e){try{localStorage.setItem(mc,JSON.stringify(e))}catch{}}function Lo(e){const t=Es[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}}function pf(){const e=ei().range;return(e==null?void 0:e.id)==="custom"?e:e&&Es[e.id]?Lo(e.id):Lo(df())}function hf(){const[e,t]=Q(pf);ce(()=>{Xo(af(e))},[e]);const n=le(o=>{t(Lo(o)),ff(o)},[]),l=le((o,i)=>{t({id:"custom",since:o,until:i})},[]),s=le(o=>{typeof o=="string"?n(o):o&&typeof o=="object"&&t(o)},[n]);return{range:e,setRange:s,setPreset:n,setCustom:l,presets:Fl}}const _c="aictl-pref-tool_filter";function mf(){const e=ei().tools;if(e!==void 0)return e;try{const t=localStorage.getItem(_c);return t!=null?JSON.parse(t):null}catch{return null}}function Er(e){try{localStorage.setItem(_c,JSON.stringify(e))}catch{}Xo(cf(e))}function _f(e=[]){const[t,n]=Q(mf),l=le(o=>{n(o),Er(o)},[]),s=le(o=>{n(i=>{let r;return i===null?r=e.filter(a=>a!==o):i.includes(o)?r=i.filter(a=>a!==o):(r=[...i,o],r.length>=e.length&&(r=null)),Er(r),r})},[e]);return{selectedTools:t,setTools:l,toggleTool:s,allTools:e}}const Pl={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files",iconName:"file-text"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens",iconName:"coins"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",iconName:"cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb",iconName:"server"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],navGroups:[{id:"monitor",label:"Monitor"},{id:"work",label:"Sessions"},{id:"spend",label:"Spend"},{id:"setup",label:"Setup"}],tabs:[{id:"overview",group:"monitor",label:"Overview",iconName:"layout-dashboard",key:"1"},{id:"hidden",group:"monitor",label:"Hidden context",iconName:"eye-off",key:"h"},{id:"live",group:"monitor",label:"Live",iconName:"radio",key:"2"},{id:"procs",group:"monitor",label:"Processes",iconName:"cpu",key:"3"},{id:"events",group:"monitor",label:"Events",iconName:"activity",key:"4"},{id:"explorer",group:"work",label:"Explorer",iconName:"search",key:"5"},{id:"agents",group:"work",label:"Agents",iconName:"bot",key:"6"},{id:"prompts",group:"work",label:"Prompts",iconName:"pen",key:"7"},{id:"budget",group:"spend",label:"Budget",iconName:"coins",key:"8"},{id:"analytics",group:"spend",label:"Analytics",iconName:"bar-chart-3",key:"9"},{id:"memory",group:"setup",label:"AI context",iconName:"brain",key:"0"},{id:"config",group:"setup",label:"Configuration",iconName:"settings",key:"-"}]},vc="aictl-pref-active_tab",vs=Pl.tabs,sl=vs.map(e=>e.id);var za;const Do=((za=vs[0])==null?void 0:za.id)||"overview";function Cr(){const e=Mr(ei().tab,sl);if(e)return e;try{const t=localStorage.getItem(vc);return Mr(t!=null?JSON.parse(t):null,sl)||Do}catch{return Do}}function ti(e){if(!e)return!1;const t=e.tagName;return t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||e.isContentEditable}function vf(){const[e,t]=Q(Cr),n=ee(e);n.current=e;const l=le(s=>{t(s),Xo(uf(s,Do),{push:!0});try{localStorage.setItem(vc,JSON.stringify(s))}catch{}},[]);return ce(()=>{const s=()=>t(Cr());return window.addEventListener("popstate",s),()=>window.removeEventListener("popstate",s)},[]),ce(()=>{const s=o=>{if(ti(o.target)||o.metaKey||o.ctrlKey||o.altKey)return;if(o.key==="["||o.key==="]"){const r=o.key==="]"?1:-1,a=sl.indexOf(n.current);l(sl[(a+r+sl.length)%sl.length]);return}const i=vs.find(r=>r.key&&r.key===o.key);i&&l(i.id)};return document.addEventListener("keydown",s),()=>document.removeEventListener("keydown",s)},[l]),{activeTab:e,setActiveTab:l,tabs:vs}}const gc="aictl-theme",yc=new Set(dc),uo=["auto","dark","light"],gf="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600&display=swap";function yf(){if(document.getElementById("aictl-editorial-fonts"))return;const e=document.createElement("link");e.id="aictl-editorial-fonts",e.rel="stylesheet",e.href=gf,document.head.appendChild(e)}function bf(){try{const e=localStorage.getItem(gc);return yc.has(e)?e:"auto"}catch{return"auto"}}function $f(){const[e,t]=Q(bf);ce(()=>{document.documentElement.setAttribute("data-theme",e),e==="editorial"&&yf();try{localStorage.setItem(gc,e)}catch{}},[e]);const n=le(s=>{yc.has(s)&&t(s)},[]),l=le(()=>{t(s=>uo[(uo.indexOf(s)+1)%uo.length])},[]);return{theme:e,setTheme:n,cycleTheme:l,themes:dc}}const bc=["compact","normal","spacious"],$c="aictl-density",wc=new Set(bc);function wf(){try{const e=localStorage.getItem($c);return wc.has(e)?e:"normal"}catch{return"normal"}}function kf(){const[e,t]=Q(wf);ce(()=>{document.documentElement.setAttribute("data-density",e);try{localStorage.setItem($c,e)}catch{}},[e]);const n=le(l=>{wc.has(l)&&t(l)},[]);return{density:e,setDensity:n,densities:bc}}const kc="aictl-views-v1";function Ar(){try{const e=localStorage.getItem(kc),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}function Tr(e){try{localStorage.setItem(kc,JSON.stringify(e))}catch{}}function Lr(e){try{const t=JSON.stringify({tab:e.tab,range:e.range,tools:Array.isArray(e.tools)?[...e.tools].sort():e.tools,density:e.density,theme:e.theme});let n=5381;for(let l=0;l<t.length;l++)n=(n<<5)+n+t.charCodeAt(l)|0;return String(n)}catch{return""}}function Sf(){return"v_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}function xf(e,t){const[n,l]=Q(Ar);ce(()=>{if(!(typeof window>"u"))try{const h=new URLSearchParams(window.location.search).get("view");if(!h)return;const d=Ar().find(p=>p.id===h);d&&t&&t(d)}catch{}},[]);const s=le(c=>{const h=(c||"").trim();if(!h)return null;const d={id:Sf(),name:h,tab:e.tab,range:e.range,tools:e.tools,density:e.density,theme:e.theme,createdAt:Date.now()};return l(p=>{const v=[...p,d];return Tr(v),v}),d},[e]),o=le(c=>{l(h=>{const d=h.filter(p=>p.id!==c);return Tr(d),d})},[]),i=le(c=>{const h=n.find(d=>d.id===c);if(!h)return!1;t&&t(h);try{const d=new URL(window.location.href);d.searchParams.set("view",c),window.history.replaceState({},"",d.toString())}catch{}return!0},[n,t]),r=Me(()=>Lr(e),[e]),a=Me(()=>n.find(c=>Lr({tab:c.tab,range:c.range,tools:c.tools,density:c.density,theme:c.theme})===r)||null,[n,r]);return{views:n,saveView:s,deleteView:o,applyView:i,currentHash:r,matchingView:a}}const Sc="aictl-cmdpalette-lru-v1",xc=5;function Mf(){try{const e=localStorage.getItem(Sc),t=e?JSON.parse(e):[];return Array.isArray(t)?t.slice(0,xc):[]}catch{return[]}}function Ef(e){try{localStorage.setItem(Sc,JSON.stringify(e))}catch{}}function Cf(){const[e,t]=Q(!1),[n,l]=Q(Mf),s=le(()=>t(!0),[]),o=le(()=>t(!1),[]),i=le(()=>t(a=>!a),[]),r=le(a=>{a&&l(c=>{const h=[a,...c.filter(d=>d!==a)].slice(0,xc);return Ef(h),h})},[]);return ce(()=>{const a=c=>{(c.metaKey||c.ctrlKey)&&(c.key==="k"||c.key==="K")&&(c.preventDefault(),t(d=>!d))};return document.addEventListener("keydown",a),()=>document.removeEventListener("keydown",a)},[]),{isOpen:e,open:s,close:o,toggle:i,lru:n,recordUse:r}}const Af="sr-only",Tf="aictl-a11y-live",Lf="aictl-a11y-live-assertive";function Df(e,t){if(typeof document>"u")return null;let n=document.getElementById(e);return n||(n=document.createElement("div"),n.id=e,n.setAttribute("role","status"),n.setAttribute("aria-live",t),n.setAttribute("aria-atomic","true"),n.className=Af,document.body.appendChild(n)),n}function Dr(e,t="polite"){if(!e)return;const l=Df(t==="assertive"?Lf:Tf,t);l&&(l.textContent="",setTimeout(()=>{l.textContent=e},16))}let Ul=null,Mc=null;if(typeof document<"u"){document.addEventListener("aictl:select-session",t=>{var n;Ul=(n=t==null?void 0:t.detail)!=null&&n.sessionId?t.detail:null});const e=new URLSearchParams(window.location.search).get("session");e&&(Ul={sessionId:e,tool:null})}function Iv(){const e=Ul||Mc;return Ul=null,e}function Nv(){Ul=null}function zv(e,t){Mc=e?{sessionId:e,tool:t||null}:null}const ql=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-desktop","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]),Pf={any:"Unattributed","claude-code":"Claude Code","claude-desktop":"Claude Desktop","codex-cli":"Codex CLI","gemini-cli":"Gemini CLI","copilot-cli":"Copilot CLI","copilot-desktop":"Copilot Desktop","copilot-vscode":"Copilot VS Code",copilot365:"Microsoft 365 Copilot"};function dl(e,t){var n,l;return((l=(n=t==null?void 0:t.tools)==null?void 0:n.find(s=>s.tool===e))==null?void 0:l.label)||Pf[e]||e}function Of(e){var n,l;const t=e.live||{};return[t.session_count||0,(e.processes||[]).length,(((n=t.token_estimate)==null?void 0:n.input_tokens)||0)+(((l=t.token_estimate)==null?void 0:l.output_tokens)||0)]}function Ec(e){return e.map(t=>[Of(t),t]).sort(([t,n],[l,s])=>l[0]-t[0]||l[1]-t[1]||l[2]-t[2]||String(n.label||n.tool).localeCompare(String(s.label||s.tool))).map(([,t])=>t)}function Vv(e){const t=new Map;for(const n of e)t.set(n.tool,(t.get(n.tool)||0)+1);return[...t.keys()].sort((n,l)=>t.get(l)-t.get(n)||n.localeCompare(l))}const Cc=new Set(["copilot365"]);function Rf(e,t){var l,s,o;if(!e||(l=e.live)!=null&&l.session_count)return!1;const n=(o=(s=t==null?void 0:t.tool_configs)==null?void 0:s.find(i=>i.tool===e.tool))==null?void 0:o.local_data;return n&&Object.keys(n).length?Object.values(n).every(i=>!i):Cc.has(e.tool)&&!(e.files||[]).length&&!(e.processes||[]).length}function il(e,t){return t!=null&&t.length?t.every(n=>{var s;const l=(s=e==null?void 0:e.tools)==null?void 0:s.find(o=>o.tool===n);return l?Rf(l,e):Cc.has(n)}):!1}const If="Estimated from token counts and list prices. Not a billed amount.";function Nf(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/mac|iphone|ipad/i.test(e)}function Fv(){var t;if(typeof navigator>"u")return!1;const e=((t=navigator.userAgentData)==null?void 0:t.platform)||navigator.platform||navigator.userAgent||"";return/win/i.test(e)&&!/darwin/i.test(e)}function Ac(){return Nf()?"⌘K":"Ctrl+K"}/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tc=(...e)=>e.filter((t,n,l)=>!!t&&t.trim()!==""&&l.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pr=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zf=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,n,l)=>l?l.toUpperCase():n.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Or=e=>{const t=zf(e);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Vf={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ff=Ja({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),Uf=()=>xs(Ff);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hf=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jf=({color:e,size:t,strokeWidth:n,absoluteStrokeWidth:l,children:s,iconNode:o,class:i="",...r})=>{const{size:a=24,strokeWidth:c=2,absoluteStrokeWidth:h=!1,color:d="currentColor",class:p=""}=Uf()??{},v=l??h?Number(n??c)*24/Number(t??a):n??c;return vn("svg",{...Vf,width:t??a??24,height:t??a??24,stroke:e??d,"stroke-width":v,class:Tc("lucide",p,i),...!s&&!Hf(r)&&{"aria-hidden":"true"},...r},[...o.map(([$,A])=>vn($,A)),...Il(s)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=(e,t)=>{const n=({class:l="",className:s="",children:o,...i})=>vn(jf,{...i,iconNode:t,class:Tc(`lucide-${Pr(Or(e))}`,`lucide-${Pr(e)}`,l,s)},o);return n.displayName=Or(e),n};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bf=J("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wf=J("archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qf=J("banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kf=J("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gf=J("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yf=J("brain-circuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jf=J("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zf=J("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qf=J("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xf=J("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ep=J("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tp=J("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const np=J("clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lp=J("coins",[["path",{d:"M13.744 17.736a6 6 0 1 1-7.48-7.48",key:"bq4yh3"}],["path",{d:"M15 6h1v4",key:"11y1tn"}],["path",{d:"m6.134 14.768.866-.5 2 3.464",key:"17snzx"}],["circle",{cx:"16",cy:"8",r:"6",key:"14bfc9"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sp=J("command",[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3",key:"11bfej"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const op=J("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ip=J("eye-off",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rp=J("file-pen",[["path",{d:"M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34",key:"o6klzx"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z",key:"zhnas1"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ap=J("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cp=J("folder",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const up=J("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dp=J("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fp=J("globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pp=J("grid-3x3",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"M15 3v18",key:"14nvp0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hp=J("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mp=J("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _p=J("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vp=J("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gp=J("menu",[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yp=J("message-square",[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bp=J("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $p=J("package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wp=J("pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kp=J("plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",key:"1xoxul"}],["path",{d:"M9 8V2",key:"14iosj"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sp=J("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xp=J("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mp=J("save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lc=J("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ep=J("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cp=J("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ap=J("sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tp=J("trash-2",[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lp=J("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dp=J("user",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pp=J("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Op=J("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rp=J("webhook",[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2",key:"q3hayz"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06",key:"1go1hn"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8",key:"qlwsc0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ip=J("wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Np=J("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zp=J("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Vp={activity:Bf,"alert-triangle":Lp,filter:up,"eye-off":ip,archive:Wf,banknote:qf,"bar-chart-3":Zf,"book-open":Kf,bot:Gf,brain:Jf,"brain-circuit":Yf,"chevron-down":Xf,"chevron-right":ep,"clipboard-list":tp,clock:np,coins:lp,cpu:op,"file-pen":rp,"file-text":ap,folder:cp,"git-branch":dp,globe:fp,"grid-3x3":pp,layers:mp,"layout-dashboard":hp,"line-chart":Qf,lock:_p,mail:vp,"message-square":yp,moon:bp,package:$p,pen:wp,plug:kp,radio:Sp,"refresh-cw":xp,search:Lc,server:Ep,settings:Cp,sun:Ap,user:Dp,users:Pp,wallet:Op,webhook:Rp,wrench:Ip,x:Np,zap:zp};function jt({name:e,size:t="1em",strokeWidth:n=2,...l}){if(!e)return null;const s=Vp[String(e)];return s?g`<${s} size=${t} strokeWidth=${n} aria-hidden="true" ...${l} />`:g`<span aria-hidden="true" ...${l}>${e}</span>`}function Fp({tool:e,tools:t}){const n=(t||[e]).filter(Boolean).map(l=>l.label||l.tool).join(", ");return g`<div class="panel-state panel-state--withheld" role="status">
    <${jt} name="radio" size="14"/>
    <div>
      <div class="panel-state__title">Not available from this machine</div>
      <div class="panel-state__hint">${n} runs in the vendor's cloud, so it leaves no local sessions, processes, tokens or files for aictl to read. Its activity is visible only in the vendor's admin reports.</div>
    </div>
  </div>`}const Up=new Set(["overview","live","procs","events","explorer"]),Hp=3e4;function jp(e,t,{activeTab:n,now:l=Date.now()}){var r;const s={value:t,at:l,tab:n};return!e||Up.has(n)||e.tab!==n||!!!((r=e.value)!=null&&r.snap)&&t.snap||!(e.value.enabledTools===t.enabledTools&&e.value.globalRange===t.globalRange&&e.value.openViewer===t.openViewer&&e.value.recentFiles===t.recentFiles)||l-e.at>=Hp?s:e}const Dc=new Set(["aictl","vscode","project-env"]);function Hl(e){return Array.isArray(e)}function Bp(e){return Array.isArray(e)&&e.length===0}function Ht(e,t){return!Array.isArray(t)||!e||Dc.has(e)?!0:t.includes(e)}const Wp={copilot:["copilot","copilot-vscode"]};function qp(e,t){const n=Wp[e==null?void 0:e.tool];return!n||!Array.isArray(t)?Ht(e==null?void 0:e.tool,t):n.some(l=>t.includes(l))}function Uv(e){return Array.isArray(e)?"tools="+[...new Set(e)].sort().map(encodeURIComponent).join(","):""}function Rr(e){return Array.isArray(e)?"only:"+[...new Set(e)].sort().join(","):"all"}function Hv(e,t){const n=e==null?void 0:e.selection;return Array.isArray(t)?!n||n.all_tools||!Array.isArray(n.tools)?!1:Rr(n.tools)===Rr(t):!n||n.all_tools===!0}function Kp(e,t,n="tool"){return!Array.isArray(e)||!Array.isArray(t)?e:e.filter(l=>Ht(l==null?void 0:l[n],t))}const Gp=new Set(["","unknown","any"]);function jv(e,t,n=l=>l){let l=0,s=0;for(const[o,i]of Object.entries(e||{})){const r=Number(n(i))||0;Array.isArray(t)?Gp.has(o)?s+=r:Ht(o,t)&&(l+=r):l+=r}return{total:l,hidden:s}}function Yp(e){return!!e&&!Dc.has(e)&&!ql.has(e)}function El(e,t="tool"){return Array.isArray(e)?e.reduce((n,l)=>n+(Yp(l==null?void 0:l[t])?1:0),0):0}function Bv(e,t){return t&&e.includes(t)?t:e[0]??null}const Jp=["copilot","copilot-vscode","copilot-cli","copilot-desktop","copilot-jetbrains","copilot-vs"],Zp=[["claude-",["claude-code","claude-desktop"]],["copilot-",Jp],["codex-",["codex-cli"]],["gemini-",["gemini","gemini-cli"]],["windsurf-",["windsurf"]],["cursor-",["cursor"]]];function Qp(e){if(e!=null&&e.tool)return[e.tool];const t=String((e==null?void 0:e.source)||""),n=Zp.find(([l])=>t.startsWith(l));return n?n[1]:null}function Xp(e,t){if(!Array.isArray(t))return!0;const n=Qp(e);return!n||n.some(l=>t.includes(l))}function eh(e,t){return Array.isArray(e)?e.map(n=>dl(n,t)):[]}function th({count:e}){return e?g`<div class="panel-state panel-state--note" role="note" data-testid="filter-hidden-note">
    <${jt} name="filter" size="12"/>
    <span>${e} row${e===1?"":"s"} from unattributed or unverified tools ${e===1?"is":"are"} hidden while the tool filter is on. Choose All tools to see ${e===1?"it":"them"}.</span>
  </div>`:null}function nh({path:e,at:t,onClose:n}){const{snap:l}=xs(zl),[s,o]=Q(null),[i,r]=Q(!1),[a,c]=Q(null),h=ee(null),d=ee(null),[p,v]=Q(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),$=ee(!1),A=ee(0),k=ee(0),x=le(L=>{$.current=!0,A.current=L.clientX,k.current=p,L.preventDefault()},[p]);if(ce(()=>{const L=N=>{if(!$.current)return;const I=A.current-N.clientX,O=window.innerWidth,Y=Math.min(90,Math.max(20,k.current+I/O*100));v(Y)},D=()=>{if($.current){$.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(p)))}catch{}}};return window.addEventListener("mousemove",L),window.addEventListener("mouseup",D),()=>{window.removeEventListener("mousemove",L),window.removeEventListener("mouseup",D)}},[p]),ce(()=>{if(!e)return;d.current=document.activeElement;const L=setTimeout(()=>{var I;const N=(I=h.current)==null?void 0:I.querySelector("button");N&&N.focus()},50),D=N=>{if(N.key!=="Tab"||!h.current)return;const I=h.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!I.length)return;const O=I[0],Y=I[I.length-1];N.shiftKey&&document.activeElement===O?(N.preventDefault(),Y.focus()):!N.shiftKey&&document.activeElement===Y&&(N.preventDefault(),O.focus())};return document.addEventListener("keydown",D),()=>{clearTimeout(L),document.removeEventListener("keydown",D),d.current&&d.current.focus&&d.current.focus()}},[e]),ce(()=>{if(!e)return;r(!1),c(null),o(null),(t?Wd(e,t):Bd(e)).then(o).catch(D=>c(D.message))},[e,t]),!e)return null;const b=Me(()=>{if(!l)return"";for(const L of l.tools)for(const D of L.files)if(D.path===e)return(D.kind||"")+" | "+Xt(D.size)+" | ~"+vt(D.tokens)+"tok | scope:"+(D.scope||"?")+" | sent_to_llm:"+(D.sent_to_llm||"?")+" | loaded:"+(D.loaded_when||"?");for(const L of l.agent_memory)if(L.file===e)return L.source+" | "+L.profile+" | "+L.tokens+"tok | "+L.lines+"ln";return""},[l,e]),E=s?s.split(`
`):[],M=E.length,S=M>Xn*2,T=(L,D)=>L.map((N,I)=>g`<div class="fv-line"><span class="fv-ln">${D+I}</span><span class="fv-code">${ol(N)||" "}</span></div>`);return g`<div class="fv" ref=${h} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+p+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${x}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      ${t&&g`<span class="badge text-xs mono" style="background:var(--bg2);color:var(--fg2);margin-left:var(--sp-2)"
        title=${"Historical content at unix ts "+t}>@ ${new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>`}
      <button onClick=${n} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${b}</div>
    <div class="fv-body">
      ${a?g`<p class="text-red" style="padding:var(--sp-10)">${a}</p>`:s?!S||i?g`<div class="fv-lines">${T(E,1)}</div>`:g`<div class="fv-lines">${T(E.slice(0,Xn),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>r(!0)}>\u25BC ${M-Xn*2} more lines \u25BC</div>
            <div class="fv-lines">${T(E.slice(-Xn),M-Xn+1)}</div>`:g`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${M} lines${S&&!i?" (showing "+Xn*2+" of "+M+")":""}</span>
      ${S&&g`<button onClick=${()=>r(!i)}>${i?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function hn({variant:e="secondary",size:t="md",loading:n=!1,disabled:l=!1,type:s="button",onClick:o,class:i,className:r,children:a,...c}){const h=["aictl-ui-btn",`aictl-ui-btn--${e}`,t==="sm"?"aictl-ui-btn--sm":null,i,r].filter(Boolean).join(" "),d=l||n;return g`<button
    type=${s}
    class=${h}
    disabled=${d}
    aria-busy=${n?"true":null}
    onClick=${d?void 0:o}
    ...${c}
  >${n?g`<span class="aictl-ui-btn__spinner" aria-hidden="true"></span>`:null}${a}</button>`}function Ir({variant:e="neutral",size:t="sm",dot:n=!1,class:l,className:s,children:o,...i}){const r=["aictl-ui-badge",`aictl-ui-badge--${e}`,t==="md"?"aictl-ui-badge--md":null,l,s].filter(Boolean).join(" ");return g`<span class=${r} ...${i}>
    ${n?g`<span class="aictl-ui-badge__dot" aria-hidden="true"></span>`:null}
    ${o}
  </span>`}function lh(e,t,n){let s=0,o=0;switch(n){case"top":s=e.top-t.height-6,o=e.left+(e.width-t.width)/2;break;case"bottom":s=e.bottom+6,o=e.left+(e.width-t.width)/2;break;case"left":s=e.top+(e.height-t.height)/2,o=e.left-t.width-6;break;case"right":default:s=e.top+(e.height-t.height)/2,o=e.right+6;break}const i=window.innerWidth,r=window.innerHeight;return o=Math.max(4,Math.min(o,i-t.width-4)),s=Math.max(4,Math.min(s,r-t.height-4)),{top:s,left:o}}function Nr({content:e,placement:t="top",open:n,onOpenChange:l,children:s,class:o,className:i,...r}){const[a,c]=Q(!1),h=n!==void 0?n:a,d=le(M=>{n===void 0&&c(M),l&&l(M)},[n,l]),p=ee(null),v=ee(null),$=dd(),[A,k]=Q({top:-9999,left:-9999});ce(()=>{if(!h)return;const M=p.current,S=v.current;if(!M||!S)return;const T=()=>k(lh(M.getBoundingClientRect(),S.getBoundingClientRect(),t));return T(),window.addEventListener("scroll",T,!0),window.addEventListener("resize",T),()=>{window.removeEventListener("scroll",T,!0),window.removeEventListener("resize",T)}},[h,t,e]);const x=()=>d(!0),b=()=>d(!1),E=["aictl-ui-tooltip-wrap",o,i].filter(Boolean).join(" ");return g`<span
    ref=${p}
    class=${E}
    onMouseEnter=${x}
    onMouseLeave=${b}
    onFocusIn=${x}
    onFocusOut=${b}
    aria-describedby=${h?$:null}
    ...${r}
  >
    ${s}
    ${h?g`<span
      ref=${v}
      id=${$}
      role="tooltip"
      class="aictl-ui-tooltip"
      style=${`top:${A.top}px;left:${A.left}px`}
    >${e}</span>`:null}
  </span>`}function sh(e,t,n){let s=0,o=0;switch(n){case"top":s=e.top-t.height-6,o=e.left;break;case"left":s=e.top,o=e.left-t.width-6;break;case"right":s=e.top,o=e.right+6;break;case"bottom":default:s=e.bottom+6,o=e.left;break}const i=window.innerWidth,r=window.innerHeight;return o=Math.max(4,Math.min(o,i-t.width-4)),s=Math.max(4,Math.min(s,r-t.height-4)),{top:s,left:o}}const zr='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function gs({trigger:e,placement:t="bottom",open:n,onOpenChange:l,children:s,class:o,className:i,...r}){const[a,c]=Q(!1),h=n!==void 0?n:a,d=le(b=>{n===void 0&&c(b),l&&l(b)},[n,l]),p=ee(null),v=ee(null),[$,A]=Q({top:-9999,left:-9999});ce(()=>{if(!h)return;const b=p.current,E=v.current;if(!b||!E)return;const M=()=>A(sh(b.getBoundingClientRect(),E.getBoundingClientRect(),t));M();const S=D=>{!E.contains(D.target)&&!b.contains(D.target)&&d(!1)},T=D=>{if(D.key==="Escape"){d(!1),b.focus&&b.focus();return}if(D.key==="Tab"){const N=E.querySelectorAll(zr);if(!N.length)return;const I=N[0],O=N[N.length-1];D.shiftKey&&document.activeElement===I?(D.preventDefault(),O.focus()):!D.shiftKey&&document.activeElement===O&&(D.preventDefault(),I.focus())}};document.addEventListener("mousedown",S),document.addEventListener("keydown",T),window.addEventListener("resize",M);const L=E.querySelector(zr);return L?L.focus():E.focus(),()=>{document.removeEventListener("mousedown",S),document.removeEventListener("keydown",T),window.removeEventListener("resize",M)}},[h,t,d]);const k=b=>{b.stopPropagation(),d(!h)},x=["aictl-ui-popover",o,i].filter(Boolean).join(" ");return g`<span style="display:inline-flex;position:relative" ...${r}>
    <span ref=${p} onClick=${k}>${e}</span>
    ${h?g`<div
      ref=${v}
      class=${x}
      role="dialog"
      tabindex="-1"
      style=${`top:${$.top}px;left:${$.left}px`}
    >${s}</div>`:null}
  </span>`}const Vr='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';function fl({open:e,onClose:t,ariaLabel:n,labelledBy:l,children:s,closeOnBackdrop:o=!0,class:i,className:r,...a}){const c=ee(null),h=ee(null),d=le(()=>{t&&t()},[t]);if(ce(()=>{if(!e)return;h.current=document.activeElement;const $=c.current;if(!$)return;($.querySelector(Vr)||$).focus();const k=x=>{if(x.key==="Escape"){x.stopPropagation(),d();return}if(x.key==="Tab"){const b=$.querySelectorAll(Vr);if(!b.length){x.preventDefault();return}const E=b[0],M=b[b.length-1];x.shiftKey&&document.activeElement===E?(x.preventDefault(),M.focus()):!x.shiftKey&&document.activeElement===M&&(x.preventDefault(),E.focus())}};return document.addEventListener("keydown",k),()=>{document.removeEventListener("keydown",k),h.current&&h.current.focus&&h.current.focus()}},[e,d]),!e)return null;const p=$=>{o&&$.target===$.currentTarget&&d()},v=["aictl-ui-dialog",i,r].filter(Boolean).join(" ");return g`<div class="aictl-ui-dialog-backdrop" onMouseDown=${p}>
    <div
      ref=${c}
      class=${v}
      role="dialog"
      aria-modal="true"
      aria-label=${n||null}
      aria-labelledby=${l||null}
      tabindex="-1"
      ...${a}
    >${s}</div>
  </div>`}function oh({options:e=[],value:t,onChange:n,ariaLabel:l,class:s,className:o,...i}){const r=["aictl-ui-segmented",s,o].filter(Boolean).join(" "),a=ee([]),c=h=>{var v;if(!e.length)return;const d=Math.max(0,e.findIndex($=>$.value===t));let p=null;h.key==="ArrowRight"||h.key==="ArrowDown"?p=(d+1)%e.length:h.key==="ArrowLeft"||h.key==="ArrowUp"?p=(d-1+e.length)%e.length:h.key==="Home"?p=0:h.key==="End"&&(p=e.length-1),p!=null&&(h.preventDefault(),n&&n(e[p].value),(v=a.current[p])==null||v.focus())};return g`<div
    class=${r}
    role="radiogroup"
    aria-label=${l||null}
    ...${i}
  >${e.map((h,d)=>{const p=h.value===t;return g`<button
      key=${h.value}
      ref=${v=>{a.current[d]=v}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${p?"true":"false"}
      tabindex=${p?"0":"-1"}
      onClick=${()=>n&&n(h.value)}
      onKeyDown=${c}
    >${h.icon?g`<${jt} name=${h.icon} size="0.9em"/>`:null}${h.label}</button>`})}</div>`}function ot({class:e,className:t,children:n,...l}){const s=["aictl-ui-kbd",e,t].filter(Boolean).join(" ");return g`<kbd class=${s} ...${l}>${n}</kbd>`}function Pc({icon:e,title:t,description:n,action:l,source:s,class:o,className:i,...r}){const a=["aictl-ui-empty",o,i].filter(Boolean).join(" ");return g`<div class=${a} role="status" ...${r}>
    ${e?g`<div class="aictl-ui-empty__icon">
      ${typeof e=="string"?g`<${jt} name=${e} size="32"/>`:e}
    </div>`:null}
    ${t?g`<div class="aictl-ui-empty__title">${t}</div>`:null}
    ${n?g`<div class="aictl-ui-empty__desc">${n}</div>`:null}
    ${l?g`<div>${l}</div>`:null}
    ${s?g`<div class="aictl-ui-empty__source" title="Data source for this view">${s}</div>`:null}
  </div>`}function rl({height:e="1em",width:t="100%",radius:n="4px",count:l=1,class:s,className:o,style:i,...r}){const a=["aictl-ui-skel",s,o].filter(Boolean).join(" "),c={height:e,width:t,borderRadius:n};if(l<=1)return g`<span class=${a} style=${{...c,...i||{}}} aria-hidden="true" ...${r}></span>`;const h=[];for(let d=0;d<l;d++)h.push(d);return g`<span style="display:flex;flex-direction:column;gap:var(--sp-2)" aria-hidden="true" ...${r}>
    ${h.map(d=>g`<span key=${d} class=${a} style=${{...c,...i||{}}}></span>`)}
  </span>`}const ih=window.TOOL_VENDORS??{},rh={"claude-code":"anthropic","claude-desktop":"anthropic","claude-mcp-memory":"anthropic",copilot:"github","copilot-vscode":"github","copilot-cli":"github","copilot-desktop":"github","copilot-jetbrains":"github","copilot-vs":"github",copilot365:"microsoft","codex-cli":"openai","chatgpt-desktop":"openai","chatgpt-lencx":"openai",gemini:"google","gemini-cli":"google",cursor:"cursor-inc",windsurf:"codeium",openclaw:"community",vscode:"microsoft"},Fr={anthropic:'<path d="M12 4.5V19.5"/><path d="M4.5 12H19.5"/><path d="M6.7 6.7 17.3 17.3"/><path d="M17.3 6.7 6.7 17.3"/>',github:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',microsoft:'<rect x="3.5" y="6.5" width="17" height="11" rx="5.5" fill="none"/><circle cx="9.2" cy="12" r="1.6" stroke="none" fill="currentColor"/><circle cx="14.8" cy="12" r="1.6" stroke="none" fill="currentColor"/>',openai:'<path d="M12 3.2 19.6 7.6V16.4L12 20.8 4.4 16.4V7.6Z" fill="none"/>',google:'<path d="M12 3.2C12 8 16 12 20.8 12C16 12 12 16 12 20.8C12 16 8 12 3.2 12C8 12 12 8 12 3.2Z" stroke="none" fill="currentColor"/>',"cursor-inc":'<path d="M6 3.5 6 18 10 14 12.6 19.5 15 18.4 12.4 13 18 13Z" fill="none" stroke-linejoin="round"/>',codeium:'<path d="M11.5 4 16 12.5H11.5Z" stroke="none" fill="currentColor"/><path d="M4 16C7 12.5 9.5 12.5 12 16 14.5 19.5 17 19.5 20 16" fill="none" stroke-linecap="round"/>',community:'<path d="M17 4.5C10 5.5 5.5 9.5 5.5 13.5 5.5 17 8 19.5 11.5 19.5" fill="none" stroke-linecap="round"/><path d="M17 4.5 13.5 6M17 4.5 18.8 7.8" stroke-linecap="round"/>',_fallback:'<circle cx="12" cy="12" r="4.5" stroke="none" fill="currentColor"/>'};function ah(e){return ih[e]||rh[e]||""}function Cs({tool:e,size:t="1em",strokeWidth:n=2,...l}){const s=ah(e),o=Fr[s]||Fr._fallback,i=nl[e]||"var(--fg2)";return g`<svg class="tool-ico" viewBox="0 0 24 24" width=${t} height=${t}
    fill="none" stroke="currentColor" stroke-width=${n} stroke-linecap="round"
    style=${"color:"+i} aria-hidden="true" ...${l}
    dangerouslySetInnerHTML=${{__html:o}}></svg>`}const Po=new Set;let ch=0;const fo=3,uh=5e3;function Oc(e){Po.forEach(t=>{try{t(e)}catch{}})}function dh(e){return Po.add(e),()=>Po.delete(e)}function po(e,t,n={}){const l=++ch;return Oc({type:"add",toast:{id:l,variant:e,message:t,ttl:n.ttl||uh}}),l}function Rc(e){Oc({type:"remove",id:e})}const Oo={success:(e,t)=>po("success",e,t),error:(e,t)=>po("error",e,t),info:(e,t)=>po("info",e,t),dismiss:Rc};function fh(){const[e,t]=Q([]),n=ee(new Map);ce(()=>{const o=n.current,i=a=>{const c=o.get(a);c!=null&&c.tid&&clearTimeout(c.tid),o.delete(a)},r=dh(a=>{if(a.type==="add"){t(h=>{const d=[...h,a.toast];return d.length>fo?(d.slice(0,d.length-fo).forEach(p=>i(p.id)),d.slice(d.length-fo)):d});const c=setTimeout(()=>{t(h=>h.filter(d=>d.id!==a.toast.id)),o.delete(a.toast.id)},a.toast.ttl);o.set(a.toast.id,{tid:c,expiresAt:Date.now()+a.toast.ttl,remaining:null})}else a.type==="remove"&&(i(a.id),t(c=>c.filter(h=>h.id!==a.id)))});return()=>{r(),o.forEach(a=>{a.tid&&clearTimeout(a.tid)}),o.clear()}},[]);const l=le(o=>{const r=n.current.get(o);!r||r.tid==null||(clearTimeout(r.tid),r.tid=null,r.remaining=Math.max(500,r.expiresAt-Date.now()))},[]),s=le(o=>{const i=n.current,r=i.get(o);if(!r||r.tid!=null)return;const a=r.remaining??500;r.expiresAt=Date.now()+a,r.remaining=null,r.tid=setTimeout(()=>{t(c=>c.filter(h=>h.id!==o)),i.delete(o)},a)},[]);return e.length?g`<div class="aictl-ui-toast-stack" role="region" aria-label="Notifications">
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
        onClick=${()=>Rc(o.id)}>×</button>
    </div>`)}
  </div>`:null}const ph={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"},hh={error:"var(--red)",warning:"var(--orange)"},Ur=20;function Hr(){var k,x,b,E,M;const{snap:e}=xs(zl),[t,n]=Q(null),[l,s]=Q(null),[o,i]=Q(null),[r,a]=Q(null);ce(()=>{let S=!0;const T=()=>{ac().then(D=>{S&&n(D)}).catch(()=>{}),cc().then(D=>{S&&s(D)}).catch(()=>{}),uc({limit:Ur}).then(D=>{S&&i(Array.isArray(D==null?void 0:D.items)?D.items:[])}).catch(()=>{}),Td().then(D=>{S&&a(Array.isArray(D==null?void 0:D.ingesters)?D.ingesters:[])}).catch(()=>{})};T();const L=setInterval(T,15e3);return()=>{S=!1,clearInterval(L)}},[]);const c=Me(()=>{if(!e)return[];const S=e.tool_telemetry||[];return e.tools.filter(T=>T.tool!=="aictl"&&T.tool!=="any").map(T=>{var Y,H,G,j,W;const L=S.find(B=>B.tool===T.tool),D=T.live||{},N=D.last_seen_at||0,I=N>0?Math.floor(Date.now()/1e3-N):-1,O=I>3600||I<0;return{tool:T.tool,label:T.label,source:(L==null?void 0:L.source)||(D.session_count?"live-monitor":"discovery"),confidence:(L==null?void 0:L.confidence)||((Y=D.token_estimate)==null?void 0:Y.confidence)||0,inputTokens:(L==null?void 0:L.input_tokens)||0,outputTokens:(L==null?void 0:L.output_tokens)||0,cost:(L==null?void 0:L.cost_usd)??null,sessions:(L==null?void 0:L.total_sessions)||D.session_count||0,errors:((H=L==null?void 0:L.errors)==null?void 0:H.length)||0,lastError:((G=L==null?void 0:L.errors)==null?void 0:G[0])||null,lastSeen:I,stale:O,fileCount:T.files.length,procCount:T.processes.length,hasLive:!!T.live,hasOtel:!!((W=(j=D.sources||[]).includes)!=null&&W.call(j,"otel"))}}).sort((T,L)=>L.inputTokens+L.outputTokens-(T.inputTokens+T.outputTokens))},[e]),h=Me(()=>{var S;return(S=e==null?void 0:e.live_monitor)!=null&&S.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([T,L])=>({name:T,status:L.status||"unknown",mode:L.mode||"",detail:L.detail||""})):[]},[e]);if(!e)return null;const d=c.length,p=c.filter(S=>S.inputTokens+S.outputTokens>0).length,v=c.filter(S=>S.hasLive).length,$=c.filter(S=>S.stale&&S.hasLive).length,A=c.reduce((S,T)=>S+T.errors,0);return g`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--on-status)">${p}/${d} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--on-status)">${v} live</span>
      ${$>0?g`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--on-status)">${$} stale</span>`:null}
      ${A>0?g`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--on-status)">${A} errors</span>`:null}
      ${t!=null&&t.active?g`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--on-status)">OTel active</span>`:g`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${l?g`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">aictl Monitor Service <span class="text-muted text-xs">(self)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">CPU</div>
          <div class="metric-chip-value">${ul(l.cpu_percent||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Memory (RSS)</div>
          <div class="metric-chip-value">${Xt(l.memory_rss_bytes||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Size</div>
          <div class="metric-chip-value">${Xt(((k=l.db)==null?void 0:k.file_size_bytes)||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Uptime</div>
          <div class="metric-chip-value">${Qo(l.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${l.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${vt((((x=l.db)==null?void 0:x.metrics_count)||0)+(((b=l.db)==null?void 0:b.tool_metrics_count)||0)+(((E=l.db)==null?void 0:E.events_count)||0)+(((M=l.db)==null?void 0:M.samples_count)||0))}</div>
        </div>
      </div>
      ${l.sink?g`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Emitted</div>
          <div class="metric-chip-value">${vt(l.sink.total_emitted||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Flushed</div>
          <div class="metric-chip-value">${vt(l.sink.total_flushed||0)}</div>
        </div>
        <div class="metric-chip" style="${(l.sink.total_dropped||0)>0?"background:rgba(248,113,113,0.15);border:1px solid var(--red)":""}">
          <div class="metric-chip-label" style="${(l.sink.total_dropped||0)>0?"color:var(--red);font-weight:600":"color:var(--fg2)"}">Dropped</div>
          <div class="metric-chip-value" style="${(l.sink.total_dropped||0)>0?"color:var(--red)":""}">${vt(l.sink.total_dropped||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Tracked</div>
          <div class="metric-chip-value">${vt(l.sink.metrics_tracked||0)}</div>
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
        ${t.last_receive_at>0?g`<span class="text-muted">Last: ${ss(t.last_receive_at)}</span>`:null}
      </div>
    </div>`:null}

    <!-- Local-store ingesters (copilot / cursor / vscode chat pollers) -->
    ${r!=null?g`<div class="mb-md" data-dp="overview.collector_health.ingesters">
      <div class="es-section-title">Ingesters</div>
      ${r.length===0?g`<div class="text-xs text-muted">No ingesters running</div>`:r.map(S=>{const T=S.last_poll_ts?ss(S.last_poll_ts):"never polled";return g`<div key=${S.name}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span aria-hidden="true"
                title=${S.source_exists?"source present":"source missing"}
                style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${S.source_exists?"var(--green)":"var(--fg2)"}"></span>
              <span class="mono text-xs" style="min-width:170px" title=${S.source_path||""}>${ol(S.name)}</span>
              <span class="sr-only">${S.source_exists?"source present":"source missing"}</span>
              <span class="text-xs text-muted" title="last poll" style="min-width:80px">${T}</span>
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
          <tbody>${c.map(S=>{var T;return g`<tr key=${S.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${S.stale&&!S.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <${Cs} tool=${S.tool} size="1em"/>
              ${ol(S.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${S.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${S.confidence>=.9?"var(--green)":S.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${S.confidence>0?ul(S.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.inputTokens?vt(S.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.outputTokens?vt(S.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${S.errors>0?g`<span class="text-red" title=${((T=S.lastError)==null?void 0:T.message)||""}>${S.errors}</span>`:g`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${S.lastSeen>=0?g`<span style="color:${S.stale?"var(--orange)":"var(--fg2)"}">${ss(Date.now()/1e3-S.lastSeen)}</span>`:g`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${S.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Data-quality events (sink flood-protection, ingester failures, …) -->
    ${o!=null?g`<div class="mb-md" data-dp="overview.collector_health.data_quality">
      <div class="es-section-title">Data Quality</div>
      ${o.length===0?g`<div class="text-xs text-muted">No data-quality events</div>`:o.slice(0,Ur).map((S,T)=>{const L=hh[S.severity]||"var(--fg2)",D=[S.component,S.source].filter(Boolean).join(" · ");return g`<div key=${(S.component||"")+":"+(S.source||"")+":"+T}
              class="flex-row gap-sm" style="align-items:center;padding:var(--sp-1) 0;font-size:var(--fs-sm)">
              <span class="badge" style="background:${L};color:var(--on-status);font-size:var(--fs-2xs)">
                ${S.severity||S.status||"info"}</span>
              <span class="mono text-xs" style="white-space:nowrap" title=${"kind: "+(S.kind||"—")+" · status: "+(S.status||"—")+(S.count?" · seen "+S.count+"x":"")}>${D||"—"}</span>
              <span class="text-xs" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                title=${S.message||""}>${S.message||"—"}</span>
              <span class="text-xs text-muted" style="white-space:nowrap">${ss(S.updated_at)}</span>
            </div>`})}
    </div>`:null}

    <!-- Collector pipeline status -->
    ${h.length>0?g`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${h.map(S=>g`<div key=${S.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${ph[S.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${S.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${S.status}</span>
          </div>
          ${S.detail?g`<div class="text-xs text-muted" style="margin-top:2px">${ol(S.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let ho=null;function mh(){return ho?Promise.resolve(ho):Pd().then(e=>{const t={};for(const n of e||[])t[n.key]=n;return ho=t,t}).catch(()=>({}))}function _h(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),n=t.match(/^[^.!?]+[.!?]/);return n?n[0].trim():t.slice(0,120)}const vh={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},gh={raw:"raw",deduced:"deduced",aggregated:"agg"};function yh(){const[e,t]=Q(null),[n,l]=Q({x:0,y:0}),[s,o]=Q(!1),i=ee(null),r=ee(null),a=le(k=>{const x=k.getAttribute("data-dp");x&&mh().then(b=>{const E=b[x];if(!E)return;const M=k.getBoundingClientRect();l({x:M.left,y:M.bottom+4}),t(E),o(!1)})},[]),c=le(()=>{r.current=setTimeout(()=>{t(null),o(!1)},120)},[]),h=le(()=>{r.current&&(clearTimeout(r.current),r.current=null)},[]);if(ce(()=>{function k(E){const M=E.target.closest("[data-dp]");M&&(h(),a(M))}function x(E){E.target.closest("[data-dp]")&&c()}function b(E){E.target.closest("[data-dp]")&&e&&(E.preventDefault(),o(S=>!S))}return document.addEventListener("mouseover",k,!0),document.addEventListener("mouseout",x,!0),document.addEventListener("click",b,!0),document.addEventListener("focusin",k,!0),document.addEventListener("focusout",x,!0),()=>{document.removeEventListener("mouseover",k,!0),document.removeEventListener("mouseout",x,!0),document.removeEventListener("click",b,!0),document.removeEventListener("focusin",k,!0),document.removeEventListener("focusout",x,!0)}},[a,c,h,e]),!e)return null;const p=Math.min(n.x,window.innerWidth-320-8),v=Math.min(n.y,window.innerHeight-180),$=gh[e.source_type]||e.source_type,A=vh[e.unit]||e.unit;return g`<div class="dp-tooltip" ref=${i}
    style=${"left:"+p+"px;top:"+v+"px"}
    onMouseEnter=${h} onMouseLeave=${c}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${$}</span>
      ${A&&g`<span class="dp-tooltip-unit">${A}</span>`}
    </div>
    <div class="dp-tooltip-body">${_h(e.explanation)}</div>
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
  </div>`}class jr extends Qt{constructor(t){super(t),this.state={hasError:!1,error:null}}static getDerivedStateFromError(t){return{hasError:!0,error:t}}componentDidCatch(t,n){console.error("Dashboard error:",t,n);try{Oo.error("Something went wrong in this view")}catch{}}render(){var t;if(this.state.hasError){const n=((t=this.state.error)==null?void 0:t.message)||"Unknown error";return g`<div role="alert">
        <${Pc}
          icon="alert-triangle"
          title="Something went wrong"
          description=${n}
          action=${g`<${hn} variant="primary" onClick=${()=>this.setState({hasError:!1,error:null})}>Retry</${hn}>`}
        />
      </div>`}return this.props.children}}const bh=!0,Be="u-",$h="uplot",wh=Be+"hz",kh=Be+"vt",Sh=Be+"title",xh=Be+"wrap",Mh=Be+"under",Eh=Be+"over",Ch=Be+"axis",Ln=Be+"off",Ah=Be+"select",Th=Be+"cursor-x",Lh=Be+"cursor-y",Dh=Be+"cursor-pt",Ph=Be+"legend",Oh=Be+"live",Rh=Be+"inline",Ih=Be+"series",Nh=Be+"marker",Br=Be+"label",zh=Be+"value",Tl="width",Ll="height",Cl="top",Wr="bottom",el="left",mo="right",ni="#000",qr=ni+"0",_o="mousemove",Kr="mousedown",vo="mouseup",Gr="mouseenter",Yr="mouseleave",Jr="dblclick",Vh="resize",Fh="scroll",Zr="change",ys="dppxchange",li="--",vl=typeof window<"u",Ro=vl?document:null,al=vl?window:null,Uh=vl?navigator:null;let _e,os;function Io(){let e=devicePixelRatio;_e!=e&&(_e=e,os&&zo(Zr,os,Io),os=matchMedia(`(min-resolution: ${_e-.001}dppx) and (max-resolution: ${_e+.001}dppx)`),Pn(Zr,os,Io),al.dispatchEvent(new CustomEvent(ys)))}function wt(e,t){if(t!=null){let n=e.classList;!n.contains(t)&&n.add(t)}}function No(e,t){let n=e.classList;n.contains(t)&&n.remove(t)}function Te(e,t,n){e.style[t]=n+"px"}function Vt(e,t,n,l){let s=Ro.createElement(e);return t!=null&&wt(s,t),n!=null&&n.insertBefore(s,l),s}function Dt(e,t){return Vt("div",e,t)}const Qr=new WeakMap;function Zt(e,t,n,l,s){let o="translate("+t+"px,"+n+"px)",i=Qr.get(e);o!=i&&(e.style.transform=o,Qr.set(e,o),t<0||n<0||t>l||n>s?wt(e,Ln):No(e,Ln))}const Xr=new WeakMap;function ea(e,t,n){let l=t+n,s=Xr.get(e);l!=s&&(Xr.set(e,l),e.style.background=t,e.style.borderColor=n)}const ta=new WeakMap;function na(e,t,n,l){let s=t+""+n,o=ta.get(e);s!=o&&(ta.set(e,s),e.style.height=n+"px",e.style.width=t+"px",e.style.marginLeft=l?-t/2+"px":0,e.style.marginTop=l?-n/2+"px":0)}const si={passive:!0},Hh={...si,capture:!0};function Pn(e,t,n,l){t.addEventListener(e,n,l?Hh:si)}function zo(e,t,n,l){t.removeEventListener(e,n,si)}vl&&Io();function Ft(e,t,n,l){let s;n=n||0,l=l||t.length-1;let o=l<=2147483647;for(;l-n>1;)s=o?n+l>>1:kt((n+l)/2),t[s]<e?n=s:l=s;return e-t[n]<=t[l]-e?n:l}function Ic(e){return(n,l,s)=>{let o=-1,i=-1;for(let r=l;r<=s;r++)if(e(n[r])){o=r;break}for(let r=s;r>=l;r--)if(e(n[r])){i=r;break}return[o,i]}}const Nc=e=>e!=null,zc=e=>e!=null&&e>0,As=Ic(Nc),jh=Ic(zc);function Bh(e,t,n,l=0,s=!1){let o=s?jh:As,i=s?zc:Nc;[t,n]=o(e,t,n);let r=e[t],a=e[t];if(t>-1)if(l==1)r=e[t],a=e[n];else if(l==-1)r=e[n],a=e[t];else for(let c=t;c<=n;c++){let h=e[c];i(h)&&(h<r?r=h:h>a&&(a=h))}return[r??$e,a??-$e]}function Ts(e,t,n,l){let s=oa(e),o=oa(t);e==t&&(s==-1?(e*=n,t/=n):(e/=n,t*=n));let i=n==10?sn:Vc,r=s==1?kt:Pt,a=o==1?Pt:kt,c=r(i(je(e))),h=a(i(je(t))),d=pl(n,c),p=pl(n,h);return n==10&&(c<0&&(d=we(d,-c)),h<0&&(p=we(p,-h))),l||n==2?(e=d*s,t=p*o):(e=jc(e,d),t=Ls(t,p)),[e,t]}function oi(e,t,n,l){let s=Ts(e,t,n,l);return e==0&&(s[0]=0),t==0&&(s[1]=0),s}const ii=.1,la={mode:3,pad:ii},Ol={pad:0,soft:null,mode:0},Wh={min:Ol,max:Ol};function bs(e,t,n,l){return Ds(n)?sa(e,t,n):(Ol.pad=n,Ol.soft=l?0:null,Ol.mode=l?3:0,sa(e,t,Wh))}function he(e,t){return e??t}function qh(e,t,n){for(t=he(t,0),n=he(n,e.length-1);t<=n;){if(e[t]!=null)return!0;t++}return!1}function sa(e,t,n){let l=n.min,s=n.max,o=he(l.pad,0),i=he(s.pad,0),r=he(l.hard,-$e),a=he(s.hard,$e),c=he(l.soft,$e),h=he(s.soft,-$e),d=he(l.mode,0),p=he(s.mode,0),v=t-e,$=sn(v),A=dt(je(e),je(t)),k=sn(A),x=je(k-$);(v<1e-24||x>10)&&(v=0,(e==0||t==0)&&(v=1e-24,d==2&&c!=$e&&(o=0),p==2&&h!=-$e&&(i=0)));let b=v||A||1e3,E=sn(b),M=pl(10,kt(E)),S=b*(v==0?e==0?.1:1:o),T=we(jc(e-S,M/10),24),L=e>=c&&(d==1||d==3&&T<=c||d==2&&T>=c)?c:$e,D=dt(r,T<L&&e>=L?L:Ut(L,T)),N=b*(v==0?t==0?.1:1:i),I=we(Ls(t+N,M/10),24),O=t<=h&&(p==1||p==3&&I>=h||p==2&&I<=h)?h:-$e,Y=Ut(a,I>O&&t<=O?O:dt(O,I));return D==Y&&D==0&&(Y=100),[D,Y]}const Kh=new Intl.NumberFormat(vl?Uh.language:"en-US"),ri=e=>Kh.format(e),St=Math,fs=St.PI,je=St.abs,kt=St.floor,He=St.round,Pt=St.ceil,Ut=St.min,dt=St.max,pl=St.pow,oa=St.sign,sn=St.log10,Vc=St.log2,Gh=(e,t=1)=>St.sinh(e)*t,go=(e,t=1)=>St.asinh(e/t),$e=1/0;function ia(e){return(sn((e^e>>31)-(e>>31))|0)+1}function Vo(e,t,n){return Ut(dt(e,t),n)}function Fc(e){return typeof e=="function"}function ae(e){return Fc(e)?e:()=>e}const Yh=()=>{},Uc=e=>e,Hc=(e,t)=>t,Jh=e=>null,ra=e=>!0,aa=(e,t)=>e==t,Zh=/\.\d*?(?=9{6,}|0{6,})/gm,Rn=e=>{if(Wc(e)||yn.has(e))return e;const t=`${e}`,n=t.match(Zh);if(n==null)return e;let l=n[0].length-1;if(t.indexOf("e-")!=-1){let[s,o]=t.split("e");return+`${Rn(s)}e${o}`}return we(e,l)};function An(e,t){return Rn(we(Rn(e/t))*t)}function Ls(e,t){return Rn(Pt(Rn(e/t))*t)}function jc(e,t){return Rn(kt(Rn(e/t))*t)}function we(e,t=0){if(Wc(e))return e;let n=10**t,l=e*n*(1+Number.EPSILON);return He(l)/n}const yn=new Map;function Bc(e){return((""+e).split(".")[1]||"").length}function jl(e,t,n,l){let s=[],o=l.map(Bc);for(let i=t;i<n;i++){let r=je(i),a=we(pl(e,i),r);for(let c=0;c<l.length;c++){let h=e==10?+`${l[c]}e${i}`:l[c]*a,d=(i>=0?0:r)+(i>=o[c]?0:o[c]),p=e==10?h:we(h,d);s.push(p),yn.set(p,d)}}return s}const Rl={},ai=[],hl=[null,null],mn=Array.isArray,Wc=Number.isInteger,Qh=e=>e===void 0;function ca(e){return typeof e=="string"}function Ds(e){let t=!1;if(e!=null){let n=e.constructor;t=n==null||n==Object}return t}function Xh(e){return e!=null&&typeof e=="object"}const em=Object.getPrototypeOf(Uint8Array),qc="__proto__";function ml(e,t=Ds){let n;if(mn(e)){let l=e.find(s=>s!=null);if(mn(l)||t(l)){n=Array(e.length);for(let s=0;s<e.length;s++)n[s]=ml(e[s],t)}else n=e.slice()}else if(e instanceof em)n=e.slice();else if(t(e)){n={};for(let l in e)l!=qc&&(n[l]=ml(e[l],t))}else n=e;return n}function Fe(e){let t=arguments;for(let n=1;n<t.length;n++){let l=t[n];for(let s in l)s!=qc&&(Ds(e[s])?Fe(e[s],ml(l[s])):e[s]=ml(l[s]))}return e}const tm=0,nm=1,lm=2;function sm(e,t,n){for(let l=0,s,o=-1;l<t.length;l++){let i=t[l];if(i>o){for(s=i-1;s>=0&&e[s]==null;)e[s--]=null;for(s=i+1;s<n&&e[s]==null;)e[o=s++]=null}}}function om(e,t){if(am(e)){let i=e[0].slice();for(let r=1;r<e.length;r++)i.push(...e[r].slice(1));return cm(i[0])||(i=rm(i)),i}let n=new Set;for(let i=0;i<e.length;i++){let a=e[i][0],c=a.length;for(let h=0;h<c;h++)n.add(a[h])}let l=[Array.from(n).sort((i,r)=>i-r)],s=l[0].length,o=new Map;for(let i=0;i<s;i++)o.set(l[0][i],i);for(let i=0;i<e.length;i++){let r=e[i],a=r[0];for(let c=1;c<r.length;c++){let h=r[c],d=Array(s).fill(void 0),p=t?t[i][c]:nm,v=[];for(let $=0;$<h.length;$++){let A=h[$],k=o.get(a[$]);A===null?p!=tm&&(d[k]=A,p==lm&&v.push(k)):d[k]=A}sm(d,v,s),l.push(d)}}return l}const im=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function rm(e){let t=e[0],n=t.length,l=Array(n);for(let o=0;o<l.length;o++)l[o]=o;l.sort((o,i)=>t[o]-t[i]);let s=[];for(let o=0;o<e.length;o++){let i=e[o],r=Array(n);for(let a=0;a<n;a++)r[a]=i[l[a]];s.push(r)}return s}function am(e){let t=e[0][0],n=t.length;for(let l=1;l<e.length;l++){let s=e[l][0];if(s.length!=n)return!1;if(s!=t){for(let o=0;o<n;o++)if(s[o]!=t[o])return!1}}return!0}function cm(e,t=100){const n=e.length;if(n<=1)return!0;let l=0,s=n-1;for(;l<=s&&e[l]==null;)l++;for(;s>=l&&e[s]==null;)s--;if(s<=l)return!0;const o=dt(1,kt((s-l+1)/t));for(let i=e[l],r=l+o;r<=s;r+=o){const a=e[r];if(a!=null){if(a<=i)return!1;i=a}}return!0}const Kc=["January","February","March","April","May","June","July","August","September","October","November","December"],Gc=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function Yc(e){return e.slice(0,3)}const um=Gc.map(Yc),dm=Kc.map(Yc),fm={MMMM:Kc,MMM:dm,WWWW:Gc,WWW:um};function Al(e){return(e<10?"0":"")+e}function pm(e){return(e<10?"00":e<100?"0":"")+e}const hm={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>Al(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>Al(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>Al(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>Al(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>Al(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>pm(e.getMilliseconds())};function ci(e,t){t=t||fm;let n=[],l=/\{([a-z]+)\}|[^{]+/gi,s;for(;s=l.exec(e);)n.push(s[0][0]=="{"?hm[s[1]]:s[0]);return o=>{let i="";for(let r=0;r<n.length;r++)i+=typeof n[r]=="string"?n[r]:n[r](o,t);return i}}const mm=new Intl.DateTimeFormat().resolvedOptions().timeZone;function _m(e,t){let n;return t=="UTC"||t=="Etc/UTC"?n=new Date(+e+e.getTimezoneOffset()*6e4):t==mm?n=e:(n=new Date(e.toLocaleString("en-US",{timeZone:t})),n.setMilliseconds(e.getMilliseconds())),n}const Jc=e=>e%1==0,$s=[1,2,2.5,5],vm=jl(10,-32,0,$s),Zc=jl(10,0,32,$s),gm=Zc.filter(Jc),Tn=vm.concat(Zc),ui=`
`,Qc="{YYYY}",ua=ui+Qc,Xc="{M}/{D}",Dl=ui+Xc,is=Dl+"/{YY}",eu="{aa}",ym="{h}:{mm}",tl=ym+eu,da=ui+tl,fa=":{ss}",ge=null;function tu(e){let t=e*1e3,n=t*60,l=n*60,s=l*24,o=s*30,i=s*365,a=(e==1?jl(10,0,3,$s).filter(Jc):jl(10,-3,0,$s)).concat([t,t*5,t*10,t*15,t*30,n,n*5,n*10,n*15,n*30,l,l*2,l*3,l*4,l*6,l*8,l*12,s,s*2,s*3,s*4,s*5,s*6,s*7,s*8,s*9,s*10,s*15,o,o*2,o*3,o*4,o*6,i,i*2,i*5,i*10,i*25,i*50,i*100]);const c=[[i,Qc,ge,ge,ge,ge,ge,ge,1],[s*28,"{MMM}",ua,ge,ge,ge,ge,ge,1],[s,Xc,ua,ge,ge,ge,ge,ge,1],[l,"{h}"+eu,is,ge,Dl,ge,ge,ge,1],[n,tl,is,ge,Dl,ge,ge,ge,1],[t,fa,is+" "+tl,ge,Dl+" "+tl,ge,da,ge,1],[e,fa+".{fff}",is+" "+tl,ge,Dl+" "+tl,ge,da,ge,1]];function h(d){return(p,v,$,A,k,x)=>{let b=[],E=k>=i,M=k>=o&&k<i,S=d($),T=we(S*e,3),L=yo(S.getFullYear(),E?0:S.getMonth(),M||E?1:S.getDate()),D=we(L*e,3);if(M||E){let N=M?k/o:0,I=E?k/i:0,O=T==D?T:we(yo(L.getFullYear()+I,L.getMonth()+N,1)*e,3),Y=new Date(He(O/e)),H=Y.getFullYear(),G=Y.getMonth();for(let j=0;O<=A;j++){let W=yo(H+I*j,G+N*j,1),B=W-d(we(W*e,3));O=we((+W+B)*e,3),O<=A&&b.push(O)}}else{let N=k>=s?s:k,I=kt($)-kt(T),O=D+I+Ls(T-D,N);b.push(O);let Y=d(O),H=Y.getHours()+Y.getMinutes()/n+Y.getSeconds()/l,G=k/l,j=p.axes[v]._space,W=x/j;for(;O=we(O+k,e==1?0:3),!(O>A);)if(G>1){let B=kt(we(H+G,6))%24,de=d(O).getHours()-B;de>1&&(de=-1),O-=de*l,H=(H+G)%24;let fe=b[b.length-1];we((O-fe)/k,3)*W>=.7&&b.push(O)}else b.push(O)}return b}}return[a,c,h]}const[bm,$m,wm]=tu(1),[km,Sm,xm]=tu(.001);jl(2,-53,53,[1]);function pa(e,t){return e.map(n=>n.map((l,s)=>s==0||s==8||l==null?l:t(s==1||n[8]==0?l:n[1]+l)))}function ha(e,t){return(n,l,s,o,i)=>{let r=t.find($=>i>=$[0])||t[t.length-1],a,c,h,d,p,v;return l.map($=>{let A=e($),k=A.getFullYear(),x=A.getMonth(),b=A.getDate(),E=A.getHours(),M=A.getMinutes(),S=A.getSeconds(),T=k!=a&&r[2]||x!=c&&r[3]||b!=h&&r[4]||E!=d&&r[5]||M!=p&&r[6]||S!=v&&r[7]||r[1];return a=k,c=x,h=b,d=E,p=M,v=S,T(A)})}}function Mm(e,t){let n=ci(t);return(l,s,o,i,r)=>s.map(a=>n(e(a)))}function yo(e,t,n){return new Date(e,t,n)}function ma(e,t){return t(e)}const Em="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function _a(e,t){return(n,l,s,o)=>o==null?li:t(e(l))}function Cm(e,t){let n=e.series[t];return n.width?n.stroke(e,t):n.points.width?n.points.stroke(e,t):null}function Am(e,t){return e.series[t].fill(e,t)}const Tm={show:!0,live:!0,isolate:!1,mount:Yh,markers:{show:!0,width:2,stroke:Cm,fill:Am,dash:"solid"},idx:null,idxs:null,values:[]};function Lm(e,t){let n=e.cursor.points,l=Dt(),s=n.size(e,t);Te(l,Tl,s),Te(l,Ll,s);let o=s/-2;Te(l,"marginLeft",o),Te(l,"marginTop",o);let i=n.width(e,t,s);return i&&Te(l,"borderWidth",i),l}function Dm(e,t){let n=e.series[t].points;return n._fill||n._stroke}function Pm(e,t){let n=e.series[t].points;return n._stroke||n._fill}function Om(e,t){return e.series[t].points.size}const bo=[0,0];function Rm(e,t,n){return bo[0]=t,bo[1]=n,bo}function rs(e,t,n,l=!0){return s=>{s.button==0&&(!l||s.target==t)&&n(s)}}function $o(e,t,n,l=!0){return s=>{(!l||s.target==t)&&n(s)}}const Im={show:!0,x:!0,y:!0,lock:!1,move:Rm,points:{one:!1,show:Lm,size:Om,width:0,stroke:Pm,fill:Dm},bind:{mousedown:rs,mouseup:rs,click:rs,dblclick:rs,mousemove:$o,mouseleave:$o,mouseenter:$o},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,n,l,s)=>l-s,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},nu={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},di=Fe({},nu,{filter:Hc}),lu=Fe({},di,{size:10}),su=Fe({},nu,{show:!1}),fi='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',ou="bold "+fi,iu=1.5,va={show:!0,scale:"x",stroke:ni,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:ou,side:2,grid:di,ticks:lu,border:su,font:fi,lineGap:iu,rotate:0},Nm="Value",zm="Time",ga={show:!0,scale:"x",auto:!1,sorted:1,min:$e,max:-$e,idxs:[]};function Vm(e,t,n,l,s){return t.map(o=>o==null?"":ri(o))}function Fm(e,t,n,l,s,o,i){let r=[],a=yn.get(s)||0;n=i?n:we(Ls(n,s),a);for(let c=n;c<=l;c=we(c+s,a))r.push(Object.is(c,-0)?0:c);return r}function Fo(e,t,n,l,s,o,i){const r=[],a=e.scales[e.axes[t].scale].log,c=a==10?sn:Vc,h=kt(c(n));s=pl(a,h),a==10&&(s=Tn[Ft(s,Tn)]);let d=n,p=s*a;a==10&&(p=Tn[Ft(p,Tn)]);do r.push(d),d=d+s,a==10&&!yn.has(d)&&(d=we(d,yn.get(s))),d>=p&&(s=d,p=s*a,a==10&&(p=Tn[Ft(p,Tn)]));while(d<=l);return r}function Um(e,t,n,l,s,o,i){let a=e.scales[e.axes[t].scale].asinh,c=l>a?Fo(e,t,dt(a,n),l,s):[a],h=l>=0&&n<=0?[0]:[];return(n<-a?Fo(e,t,dt(a,-l),-n,s):[a]).reverse().map(p=>-p).concat(h,c)}const ru=/./,Hm=/[12357]/,jm=/[125]/,ya=/1/,Uo=(e,t,n,l)=>e.map((s,o)=>t==4&&s==0||o%l==0&&n.test(s.toExponential()[s<0?1:0])?s:null);function Bm(e,t,n,l,s){let o=e.axes[n],i=o.scale,r=e.scales[i],a=e.valToPos,c=o._space,h=a(10,i),d=a(9,i)-h>=c?ru:a(7,i)-h>=c?Hm:a(5,i)-h>=c?jm:ya;if(d==ya){let p=je(a(1,i)-h);if(p<c)return Uo(t.slice().reverse(),r.distr,d,Pt(c/p)).reverse()}return Uo(t,r.distr,d,1)}function Wm(e,t,n,l,s){let o=e.axes[n],i=o.scale,r=o._space,a=e.valToPos,c=je(a(1,i)-a(2,i));return c<r?Uo(t.slice().reverse(),3,ru,Pt(r/c)).reverse():t}function qm(e,t,n,l){return l==null?li:t==null?"":ri(t)}const ba={show:!0,scale:"y",stroke:ni,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:ou,side:3,grid:di,ticks:lu,border:su,font:fi,lineGap:iu,rotate:0};function Km(e,t){let n=3+(e||1)*2;return we(n*t,3)}function Gm(e,t){let{scale:n,idxs:l}=e.series[0],s=e._data[0],o=e.valToPos(s[l[0]],n,!0),i=e.valToPos(s[l[1]],n,!0),r=je(i-o),a=e.series[t],c=r/(a.points.space*_e);return l[1]-l[0]<=c}const $a={scale:null,auto:!0,sorted:0,min:$e,max:-$e},au=(e,t,n,l,s)=>s,wa={show:!0,auto:!0,sorted:0,gaps:au,alpha:1,facets:[Fe({},$a,{scale:"x"}),Fe({},$a,{scale:"y"})]},ka={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:au,alpha:1,points:{show:Gm,filter:null},values:null,min:$e,max:-$e,idxs:[],path:null,clip:null};function Ym(e,t,n,l,s){return n/10}const cu={time:bh,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},Jm=Fe({},cu,{time:!1,ori:1}),Sa={};function uu(e,t){let n=Sa[e];return n||(n={key:e,plots:[],sub(l){n.plots.push(l)},unsub(l){n.plots=n.plots.filter(s=>s!=l)},pub(l,s,o,i,r,a,c){for(let h=0;h<n.plots.length;h++)n.plots[h]!=s&&n.plots[h].pub(l,s,o,i,r,a,c)}},e!=null&&(Sa[e]=n)),n}const _l=1,Ho=2;function In(e,t,n){const l=e.mode,s=e.series[t],o=l==2?e._data[t]:e._data,i=e.scales,r=e.bbox;let a=o[0],c=l==2?o[1]:o[t],h=l==2?i[s.facets[0].scale]:i[e.series[0].scale],d=l==2?i[s.facets[1].scale]:i[s.scale],p=r.left,v=r.top,$=r.width,A=r.height,k=e.valToPosH,x=e.valToPosV;return h.ori==0?n(s,a,c,h,d,k,x,p,v,$,A,Os,gl,Is,fu,hu):n(s,a,c,h,d,x,k,v,p,A,$,Rs,yl,mi,pu,mu)}function pi(e,t){let n=0,l=0,s=he(e.bands,ai);for(let o=0;o<s.length;o++){let i=s[o];i.series[0]==t?n=i.dir:i.series[1]==t&&(i.dir==1?l|=1:l|=2)}return[n,l==1?-1:l==2?1:l==3?2:0]}function Zm(e,t,n,l,s){let o=e.mode,i=e.series[t],r=o==2?i.facets[1].scale:i.scale,a=e.scales[r];return s==-1?a.min:s==1?a.max:a.distr==3?a.dir==1?a.min:a.max:0}function on(e,t,n,l,s,o){return In(e,t,(i,r,a,c,h,d,p,v,$,A,k)=>{let x=i.pxRound;const b=c.dir*(c.ori==0?1:-1),E=c.ori==0?gl:yl;let M,S;b==1?(M=n,S=l):(M=l,S=n);let T=x(d(r[M],c,A,v)),L=x(p(a[M],h,k,$)),D=x(d(r[S],c,A,v)),N=x(p(o==1?h.max:h.min,h,k,$)),I=new Path2D(s);return E(I,D,N),E(I,T,N),E(I,T,L),I})}function Ps(e,t,n,l,s,o){let i=null;if(e.length>0){i=new Path2D;const r=t==0?Is:mi;let a=n;for(let d=0;d<e.length;d++){let p=e[d];if(p[1]>p[0]){let v=p[0]-a;v>0&&r(i,a,l,v,l+o),a=p[1]}}let c=n+s-a,h=10;c>0&&r(i,a,l-h/2,c,l+o+h)}return i}function Qm(e,t,n){let l=e[e.length-1];l&&l[0]==t?l[1]=n:e.push([t,n])}function hi(e,t,n,l,s,o,i){let r=[],a=e.length;for(let c=s==1?n:l;c>=n&&c<=l;c+=s)if(t[c]===null){let d=c,p=c;if(s==1)for(;++c<=l&&t[c]===null;)p=c;else for(;--c>=n&&t[c]===null;)p=c;let v=o(e[d]),$=p==d?v:o(e[p]),A=d-s;v=i<=0&&A>=0&&A<a?o(e[A]):v;let x=p+s;$=i>=0&&x>=0&&x<a?o(e[x]):$,$>=v&&r.push([v,$])}return r}function xa(e){return e==0?Uc:e==1?He:t=>An(t,e)}function du(e){let t=e==0?Os:Rs,n=e==0?(s,o,i,r,a,c)=>{s.arcTo(o,i,r,a,c)}:(s,o,i,r,a,c)=>{s.arcTo(i,o,a,r,c)},l=e==0?(s,o,i,r,a)=>{s.rect(o,i,r,a)}:(s,o,i,r,a)=>{s.rect(i,o,a,r)};return(s,o,i,r,a,c=0,h=0)=>{c==0&&h==0?l(s,o,i,r,a):(c=Ut(c,r/2,a/2),h=Ut(h,r/2,a/2),t(s,o+c,i),n(s,o+r,i,o+r,i+a,c),n(s,o+r,i+a,o,i+a,h),n(s,o,i+a,o,i,h),n(s,o,i,o+r,i,c),s.closePath())}}const Os=(e,t,n)=>{e.moveTo(t,n)},Rs=(e,t,n)=>{e.moveTo(n,t)},gl=(e,t,n)=>{e.lineTo(t,n)},yl=(e,t,n)=>{e.lineTo(n,t)},Is=du(0),mi=du(1),fu=(e,t,n,l,s,o)=>{e.arc(t,n,l,s,o)},pu=(e,t,n,l,s,o)=>{e.arc(n,t,l,s,o)},hu=(e,t,n,l,s,o,i)=>{e.bezierCurveTo(t,n,l,s,o,i)},mu=(e,t,n,l,s,o,i)=>{e.bezierCurveTo(n,t,s,l,i,o)};function _u(e){return(t,n,l,s,o)=>In(t,n,(i,r,a,c,h,d,p,v,$,A,k)=>{let{pxRound:x,points:b}=i,E,M;c.ori==0?(E=Os,M=fu):(E=Rs,M=pu);const S=we(b.width*_e,3);let T=(b.size-b.width)/2*_e,L=we(T*2,3),D=new Path2D,N=new Path2D,{left:I,top:O,width:Y,height:H}=t.bbox;Is(N,I-L,O-L,Y+L*2,H+L*2);const G=j=>{if(a[j]!=null){let W=x(d(r[j],c,A,v)),B=x(p(a[j],h,k,$));E(D,W+T,B),M(D,W,B,T,0,fs*2)}};if(o)o.forEach(G);else for(let j=l;j<=s;j++)G(j);return{stroke:S>0?D:null,fill:D,clip:N,flags:_l|Ho}})}function vu(e){return(t,n,l,s,o,i)=>{l!=s&&(o!=l&&i!=l&&e(t,n,l),o!=s&&i!=s&&e(t,n,s),e(t,n,i))}}const Xm=vu(gl),e0=vu(yl);function gu(e){const t=he(e==null?void 0:e.alignGaps,0);return(n,l,s,o)=>In(n,l,(i,r,a,c,h,d,p,v,$,A,k)=>{[s,o]=As(a,s,o);let x=i.pxRound,b=H=>x(d(H,c,A,v)),E=H=>x(p(H,h,k,$)),M,S;c.ori==0?(M=gl,S=Xm):(M=yl,S=e0);const T=c.dir*(c.ori==0?1:-1),L={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:_l},D=L.stroke;let N=!1;if(o-s>=A*4){let H=q=>n.posToVal(q,c.key,!0),G=null,j=null,W,B,tt,ve=b(r[T==1?s:o]),de=b(r[s]),fe=b(r[o]),te=H(T==1?de+1:fe-1);for(let q=T==1?s:o;q>=s&&q<=o;q+=T){let Ie=r[q],ke=(T==1?Ie<te:Ie>te)?ve:b(Ie),ue=a[q];ke==ve?ue!=null?(B=ue,G==null?(M(D,ke,E(B)),W=G=j=B):B<G?G=B:B>j&&(j=B)):ue===null&&(N=!0):(G!=null&&S(D,ve,E(G),E(j),E(W),E(B)),ue!=null?(B=ue,M(D,ke,E(B)),G=j=W=B):(G=j=null,ue===null&&(N=!0)),ve=ke,te=H(ve+T))}G!=null&&G!=j&&tt!=ve&&S(D,ve,E(G),E(j),E(W),E(B))}else for(let H=T==1?s:o;H>=s&&H<=o;H+=T){let G=a[H];G===null?N=!0:G!=null&&M(D,b(r[H]),E(G))}let[O,Y]=pi(n,l);if(i.fill!=null||O!=0){let H=L.fill=new Path2D(D),G=i.fillTo(n,l,i.min,i.max,O),j=E(G),W=b(r[s]),B=b(r[o]);T==-1&&([B,W]=[W,B]),M(H,B,j),M(H,W,j)}if(!i.spanGaps){let H=[];N&&H.push(...hi(r,a,s,o,T,b,t)),L.gaps=H=i.gaps(n,l,s,o,H),L.clip=Ps(H,c.ori,v,$,A,k)}return Y!=0&&(L.band=Y==2?[on(n,l,s,o,D,-1),on(n,l,s,o,D,1)]:on(n,l,s,o,D,Y)),L})}function t0(e){const t=he(e.align,1),n=he(e.ascDesc,!1),l=he(e.alignGaps,0),s=he(e.extend,!1);return(o,i,r,a)=>In(o,i,(c,h,d,p,v,$,A,k,x,b,E)=>{[r,a]=As(d,r,a);let M=c.pxRound,{left:S,width:T}=o.bbox,L=de=>M($(de,p,b,k)),D=de=>M(A(de,v,E,x)),N=p.ori==0?gl:yl;const I={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:_l},O=I.stroke,Y=p.dir*(p.ori==0?1:-1);let H=D(d[Y==1?r:a]),G=L(h[Y==1?r:a]),j=G,W=G;s&&t==-1&&(W=S,N(O,W,H)),N(O,G,H);for(let de=Y==1?r:a;de>=r&&de<=a;de+=Y){let fe=d[de];if(fe==null)continue;let te=L(h[de]),q=D(fe);t==1?N(O,te,H):N(O,j,q),N(O,te,q),H=q,j=te}let B=j;s&&t==1&&(B=S+T,N(O,B,H));let[tt,ve]=pi(o,i);if(c.fill!=null||tt!=0){let de=I.fill=new Path2D(O),fe=c.fillTo(o,i,c.min,c.max,tt),te=D(fe);N(de,B,te),N(de,W,te)}if(!c.spanGaps){let de=[];de.push(...hi(h,d,r,a,Y,L,l));let fe=c.width*_e/2,te=n||t==1?fe:-fe,q=n||t==-1?-fe:fe;de.forEach(Ie=>{Ie[0]+=te,Ie[1]+=q}),I.gaps=de=c.gaps(o,i,r,a,de),I.clip=Ps(de,p.ori,k,x,b,E)}return ve!=0&&(I.band=ve==2?[on(o,i,r,a,O,-1),on(o,i,r,a,O,1)]:on(o,i,r,a,O,ve)),I})}function Ma(e,t,n,l,s,o,i=$e){if(e.length>1){let r=null;for(let a=0,c=1/0;a<e.length;a++)if(t[a]!==void 0){if(r!=null){let h=je(e[a]-e[r]);h<c&&(c=h,i=je(n(e[a],l,s,o)-n(e[r],l,s,o)))}r=a}}return i}function n0(e){e=e||Rl;const t=he(e.size,[.6,$e,1]),n=e.align||0,l=e.gap||0;let s=e.radius;s=s==null?[0,0]:typeof s=="number"?[s,0]:s;const o=ae(s),i=1-t[0],r=he(t[1],$e),a=he(t[2],1),c=he(e.disp,Rl),h=he(e.each,v=>{}),{fill:d,stroke:p}=c;return(v,$,A,k)=>In(v,$,(x,b,E,M,S,T,L,D,N,I,O)=>{let Y=x.pxRound,H=n,G=l*_e,j=r*_e,W=a*_e,B,tt;M.ori==0?[B,tt]=o(v,$):[tt,B]=o(v,$);const ve=M.dir*(M.ori==0?1:-1);let de=M.ori==0?Is:mi,fe=M.ori==0?h:(F,xe,Ue,Nn,$n,Wt,wn)=>{h(F,xe,Ue,$n,Nn,wn,Wt)},te=he(v.bands,ai).find(F=>F.series[0]==$),q=te!=null?te.dir:0,Ie=x.fillTo(v,$,x.min,x.max,q),Qe=Y(L(Ie,S,O,N)),ke,ue,ht,Pe=I,Se=Y(x.width*_e),xt=!1,Ot=null,nt=null,Bt=null,en=null;d!=null&&(Se==0||p!=null)&&(xt=!0,Ot=d.values(v,$,A,k),nt=new Map,new Set(Ot).forEach(F=>{F!=null&&nt.set(F,new Path2D)}),Se>0&&(Bt=p.values(v,$,A,k),en=new Map,new Set(Bt).forEach(F=>{F!=null&&en.set(F,new Path2D)})));let{x0:tn,size:rn}=c;if(tn!=null&&rn!=null){H=1,b=tn.values(v,$,A,k),tn.unit==2&&(b=b.map(Ue=>v.posToVal(D+Ue*I,M.key,!0)));let F=rn.values(v,$,A,k);rn.unit==2?ue=F[0]*I:ue=T(F[0],M,I,D)-T(0,M,I,D),Pe=Ma(b,E,T,M,I,D,Pe),ht=Pe-ue+G}else Pe=Ma(b,E,T,M,I,D,Pe),ht=Pe*i+G,ue=Pe-ht;ht<1&&(ht=0),Se>=ue/2&&(Se=0),ht<5&&(Y=Uc);let oe=ht>0,We=Pe-ht-(oe?Se:0);ue=Y(Vo(We,W,j)),ke=(H==0?ue/2:H==ve?0:ue)-H*ve*((H==0?G/2:0)+(oe?Se/2:0));const Ne={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},lt=xt?null:new Path2D;let Mt=null;if(te!=null)Mt=v.data[te.series[1]];else{let{y0:F,y1:xe}=c;F!=null&&xe!=null&&(E=xe.values(v,$,A,k),Mt=F.values(v,$,A,k))}let bn=B*ue,ne=tt*ue;for(let F=ve==1?A:k;F>=A&&F<=k;F+=ve){let xe=E[F];if(xe==null)continue;if(Mt!=null){let mt=Mt[F]??0;if(xe-mt==0)continue;Qe=L(mt,S,O,N)}let Ue=M.distr!=2||c!=null?b[F]:F,Nn=T(Ue,M,I,D),$n=L(he(xe,Ie),S,O,N),Wt=Y(Nn-ke),wn=Y(dt($n,Qe)),gt=Y(Ut($n,Qe)),Et=wn-gt;if(xe!=null){let mt=xe<0?ne:bn,Rt=xe<0?bn:ne;xt?(Se>0&&Bt[F]!=null&&de(en.get(Bt[F]),Wt,gt+kt(Se/2),ue,dt(0,Et-Se),mt,Rt),Ot[F]!=null&&de(nt.get(Ot[F]),Wt,gt+kt(Se/2),ue,dt(0,Et-Se),mt,Rt)):de(lt,Wt,gt+kt(Se/2),ue,dt(0,Et-Se),mt,Rt),fe(v,$,F,Wt-Se/2,gt,ue+Se,Et)}}return Se>0?Ne.stroke=xt?en:lt:xt||(Ne._fill=x.width==0?x._fill:x._stroke??x._fill,Ne.width=0),Ne.fill=xt?nt:lt,Ne})}function l0(e,t){const n=he(t==null?void 0:t.alignGaps,0);return(l,s,o,i)=>In(l,s,(r,a,c,h,d,p,v,$,A,k,x)=>{[o,i]=As(c,o,i);let b=r.pxRound,E=B=>b(p(B,h,k,$)),M=B=>b(v(B,d,x,A)),S,T,L;h.ori==0?(S=Os,L=gl,T=hu):(S=Rs,L=yl,T=mu);const D=h.dir*(h.ori==0?1:-1);let N=E(a[D==1?o:i]),I=N,O=[],Y=[];for(let B=D==1?o:i;B>=o&&B<=i;B+=D)if(c[B]!=null){let ve=a[B],de=E(ve);O.push(I=de),Y.push(M(c[B]))}const H={stroke:e(O,Y,S,L,T,b),fill:null,clip:null,band:null,gaps:null,flags:_l},G=H.stroke;let[j,W]=pi(l,s);if(r.fill!=null||j!=0){let B=H.fill=new Path2D(G),tt=r.fillTo(l,s,r.min,r.max,j),ve=M(tt);L(B,I,ve),L(B,N,ve)}if(!r.spanGaps){let B=[];B.push(...hi(a,c,o,i,D,E,n)),H.gaps=B=r.gaps(l,s,o,i,B),H.clip=Ps(B,h.ori,$,A,k,x)}return W!=0&&(H.band=W==2?[on(l,s,o,i,G,-1),on(l,s,o,i,G,1)]:on(l,s,o,i,G,W)),H})}function s0(e){return l0(o0,e)}function o0(e,t,n,l,s,o){const i=e.length;if(i<2)return null;const r=new Path2D;if(n(r,e[0],t[0]),i==2)l(r,e[1],t[1]);else{let a=Array(i),c=Array(i-1),h=Array(i-1),d=Array(i-1);for(let p=0;p<i-1;p++)h[p]=t[p+1]-t[p],d[p]=e[p+1]-e[p],c[p]=h[p]/d[p];a[0]=c[0];for(let p=1;p<i-1;p++)c[p]===0||c[p-1]===0||c[p-1]>0!=c[p]>0?a[p]=0:(a[p]=3*(d[p-1]+d[p])/((2*d[p]+d[p-1])/c[p-1]+(d[p]+2*d[p-1])/c[p]),isFinite(a[p])||(a[p]=0));a[i-1]=c[i-2];for(let p=0;p<i-1;p++)s(r,e[p]+d[p]/3,t[p]+a[p]*d[p]/3,e[p+1]-d[p]/3,t[p+1]-a[p+1]*d[p]/3,e[p+1],t[p+1])}return r}const jo=new Set;function Ea(){for(let e of jo)e.syncRect(!0)}vl&&(Pn(Vh,al,Ea),Pn(Fh,al,Ea,!0),Pn(ys,al,()=>{it.pxRatio=_e}));const i0=gu(),r0=_u();function Ca(e,t,n,l){return(l?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,i)=>Bo(o,i,t,n))}function a0(e,t){return e.map((n,l)=>l==0?{}:Fe({},t,n))}function Bo(e,t,n,l){return Fe({},t==0?n:l,e)}function yu(e,t,n){return t==null?hl:[t,n]}const c0=yu;function u0(e,t,n){return t==null?hl:bs(t,n,ii,!0)}function bu(e,t,n,l){return t==null?hl:Ts(t,n,e.scales[l].log,!1)}const d0=bu;function $u(e,t,n,l){return t==null?hl:oi(t,n,e.scales[l].log,!1)}const f0=$u;function p0(e,t,n,l,s){let o=dt(ia(e),ia(t)),i=t-e,r=Ft(s/l*i,n);do{let a=n[r],c=l*a/i;if(c>=s&&o+(a<5?yn.get(a):0)<=17)return[a,c]}while(++r<n.length);return[0,0]}function Aa(e){let t,n;return e=e.replace(/(\d+)px/,(l,s)=>(t=He((n=+s)*_e))+"px"),[e,t,n]}function h0(e){e.show&&[e.font,e.labelFont].forEach(t=>{let n=we(t[2]*_e,1);t[0]=t[0].replace(/[0-9.]+px/,n+"px"),t[1]=n})}function it(e,t,n){const l={mode:he(e.mode,1)},s=l.mode;function o(u,f,m,_){let y=f.valToPct(u);return _+m*(f.dir==-1?1-y:y)}function i(u,f,m,_){let y=f.valToPct(u);return _+m*(f.dir==-1?y:1-y)}function r(u,f,m,_){return f.ori==0?o(u,f,m,_):i(u,f,m,_)}l.valToPosH=o,l.valToPosV=i;let a=!1;l.status=0;const c=l.root=Dt($h);if(e.id!=null&&(c.id=e.id),wt(c,e.class),e.title){let u=Dt(Sh,c);u.textContent=e.title}const h=Vt("canvas"),d=l.ctx=h.getContext("2d"),p=Dt(xh,c);Pn("click",p,u=>{u.target===$&&(Ee!=Gn||Le!=Yn)&&et.click(l,u)},!0);const v=l.under=Dt(Mh,p);p.appendChild(h);const $=l.over=Dt(Eh,p);e=ml(e);const A=+he(e.pxAlign,1),k=xa(A);(e.plugins||[]).forEach(u=>{u.opts&&(e=u.opts(l,e)||e)});const x=e.ms||.001,b=l.series=s==1?Ca(e.series||[],ga,ka,!1):a0(e.series||[null],wa),E=l.axes=Ca(e.axes||[],va,ba,!0),M=l.scales={},S=l.bands=e.bands||[];S.forEach(u=>{u.fill=ae(u.fill||null),u.dir=he(u.dir,-1)});const T=s==2?b[1].facets[0].scale:b[0].scale,L={axes:Vu,series:Ou},D=(e.drawOrder||["axes","series"]).map(u=>L[u]);function N(u){const f=u.distr==3?m=>sn(m>0?m:u.clamp(l,m,u.min,u.max,u.key)):u.distr==4?m=>go(m,u.asinh):u.distr==100?m=>u.fwd(m):m=>m;return m=>{let _=f(m),{_min:y,_max:w}=u,C=w-y;return(_-y)/C}}function I(u){let f=M[u];if(f==null){let m=(e.scales||Rl)[u]||Rl;if(m.from!=null){I(m.from);let _=Fe({},M[m.from],m,{key:u});_.valToPct=N(_),M[u]=_}else{f=M[u]=Fe({},u==T?cu:Jm,m),f.key=u;let _=f.time,y=f.range,w=mn(y);if((u!=T||s==2&&!_)&&(w&&(y[0]==null||y[1]==null)&&(y={min:y[0]==null?la:{mode:1,hard:y[0],soft:y[0]},max:y[1]==null?la:{mode:1,hard:y[1],soft:y[1]}},w=!1),!w&&Ds(y))){let C=y;y=(P,R,z)=>R==null?hl:bs(R,z,C)}f.range=ae(y||(_?c0:u==T?f.distr==3?d0:f.distr==4?f0:yu:f.distr==3?bu:f.distr==4?$u:u0)),f.auto=ae(w?!1:f.auto),f.clamp=ae(f.clamp||Ym),f._min=f._max=null,f.valToPct=N(f)}}}I("x"),I("y"),s==1&&b.forEach(u=>{I(u.scale)}),E.forEach(u=>{I(u.scale)});for(let u in e.scales)I(u);const O=M[T],Y=O.distr;let H,G;O.ori==0?(wt(c,wh),H=o,G=i):(wt(c,kh),H=i,G=o);const j={};for(let u in M){let f=M[u];(f.min!=null||f.max!=null)&&(j[u]={min:f.min,max:f.max},f.min=f.max=null)}const W=e.tzDate||(u=>new Date(He(u/x))),B=e.fmtDate||ci,tt=x==1?wm(W):xm(W),ve=ha(W,pa(x==1?$m:Sm,B)),de=_a(W,ma(Em,B)),fe=[],te=l.legend=Fe({},Tm,e.legend),q=l.cursor=Fe({},Im,{drag:{y:s==2}},e.cursor),Ie=te.show,Qe=q.show,ke=te.markers;te.idxs=fe,ke.width=ae(ke.width),ke.dash=ae(ke.dash),ke.stroke=ae(ke.stroke),ke.fill=ae(ke.fill);let ue,ht,Pe,Se=[],xt=[],Ot,nt=!1,Bt={};if(te.live){const u=b[1]?b[1].values:null;nt=u!=null,Ot=nt?u(l,1,0):{_:0};for(let f in Ot)Bt[f]=li}if(Ie)if(ue=Vt("table",Ph,c),Pe=Vt("tbody",null,ue),te.mount(l,ue),nt){ht=Vt("thead",null,ue,Pe);let u=Vt("tr",null,ht);Vt("th",null,u);for(var en in Ot)Vt("th",Br,u).textContent=en}else wt(ue,Rh),te.live&&wt(ue,Oh);const tn={show:!0},rn={show:!1};function oe(u,f){if(f==0&&(nt||!te.live||s==2))return hl;let m=[],_=Vt("tr",Ih,Pe,Pe.childNodes[f]);wt(_,u.class),u.show||wt(_,Ln);let y=Vt("th",null,_);if(ke.show){let P=Dt(Nh,y);if(f>0){let R=ke.width(l,f);R&&(P.style.border=R+"px "+ke.dash(l,f)+" "+ke.stroke(l,f)),P.style.background=ke.fill(l,f)}}let w=Dt(Br,y);u.label instanceof HTMLElement?w.appendChild(u.label):w.textContent=u.label,f>0&&(ke.show||(w.style.color=u.width>0?ke.stroke(l,f):ke.fill(l,f)),Ne("click",y,P=>{if(q._lock)return;Sn(P);let R=b.indexOf(u);if((P.ctrlKey||P.metaKey)!=te.isolate){let z=b.some((V,U)=>U>0&&U!=R&&V.show);b.forEach((V,U)=>{U>0&&Kt(U,z?U==R?tn:rn:tn,!0,ze.setSeries)})}else Kt(R,{show:!u.show},!0,ze.setSeries)},!1),Vn&&Ne(Gr,y,P=>{q._lock||(Sn(P),Kt(b.indexOf(u),Zn,!0,ze.setSeries))},!1));for(var C in Ot){let P=Vt("td",zh,_);P.textContent="--",m.push(P)}return[_,m]}const We=new Map;function Ne(u,f,m,_=!0){const y=We.get(f)||{},w=q.bind[u](l,f,m,_);w&&(Pn(u,f,y[u]=w),We.set(f,y))}function lt(u,f,m){const _=We.get(f)||{};for(let y in _)(u==null||y==u)&&(zo(y,f,_[y]),delete _[y]);u==null&&We.delete(f)}let Mt=0,bn=0,ne=0,F=0,xe=0,Ue=0,Nn=xe,$n=Ue,Wt=ne,wn=F,gt=0,Et=0,mt=0,Rt=0;l.bbox={};let Ns=!1,Kl=!1,zn=!1,kn=!1,Gl=!1,Ct=!1;function zs(u,f,m){(m||u!=l.width||f!=l.height)&&gi(u,f),Bn(!1),zn=!0,Kl=!0,Wn()}function gi(u,f){l.width=Mt=ne=u,l.height=bn=F=f,xe=Ue=0,Eu(),Cu();let m=l.bbox;gt=m.left=An(xe*_e,.5),Et=m.top=An(Ue*_e,.5),mt=m.width=An(ne*_e,.5),Rt=m.height=An(F*_e,.5)}const Su=3;function xu(){let u=!1,f=0;for(;!u;){f++;let m=Nu(f),_=zu(f);u=f==Su||m&&_,u||(gi(l.width,l.height),Kl=!0)}}function Mu({width:u,height:f}){zs(u,f)}l.setSize=Mu;function Eu(){let u=!1,f=!1,m=!1,_=!1;E.forEach((y,w)=>{if(y.show&&y._show){let{side:C,_size:P}=y,R=C%2,z=y.label!=null?y.labelSize:0,V=P+z;V>0&&(R?(ne-=V,C==3?(xe+=V,_=!0):m=!0):(F-=V,C==0?(Ue+=V,u=!0):f=!0))}}),xn[0]=u,xn[1]=m,xn[2]=f,xn[3]=_,ne-=an[1]+an[3],xe+=an[3],F-=an[2]+an[0],Ue+=an[0]}function Cu(){let u=xe+ne,f=Ue+F,m=xe,_=Ue;function y(w,C){switch(w){case 1:return u+=C,u-C;case 2:return f+=C,f-C;case 3:return m-=C,m+C;case 0:return _-=C,_+C}}E.forEach((w,C)=>{if(w.show&&w._show){let P=w.side;w._pos=y(P,w._size),w.label!=null&&(w._lpos=y(P,w.labelSize))}})}if(q.dataIdx==null){let u=q.hover,f=u.skip=new Set(u.skip??[]);f.add(void 0);let m=u.prox=ae(u.prox),_=u.bias??(u.bias=0);q.dataIdx=(y,w,C,P)=>{if(w==0)return C;let R=C,z=m(y,w,C,P)??$e,V=z>=0&&z<$e,U=O.ori==0?ne:F,X=q.left,me=t[0],pe=t[w];if(f.has(pe[C])){R=null;let re=null,Z=null,K;if(_==0||_==-1)for(K=C;re==null&&K-- >0;)f.has(pe[K])||(re=K);if(_==0||_==1)for(K=C;Z==null&&K++<pe.length;)f.has(pe[K])||(Z=K);if(re!=null||Z!=null)if(V){let Ae=re==null?-1/0:H(me[re],O,U,0),Oe=Z==null?1/0:H(me[Z],O,U,0),Ze=X-Ae,ye=Oe-X;Ze<=ye?Ze<=z&&(R=re):ye<=z&&(R=Z)}else R=Z==null?re:re==null?Z:C-re<=Z-C?re:Z}else V&&je(X-H(me[C],O,U,0))>z&&(R=null);return R}}const Sn=u=>{q.event=u};q.idxs=fe,q._lock=!1;let st=q.points;st.show=ae(st.show),st.size=ae(st.size),st.stroke=ae(st.stroke),st.width=ae(st.width),st.fill=ae(st.fill);const qt=l.focus=Fe({},e.focus||{alpha:.3},q.focus),Vn=qt.prox>=0,Fn=Vn&&st.one;let At=[],Un=[],Hn=[];function yi(u,f){let m=st.show(l,f);if(m instanceof HTMLElement)return wt(m,Dh),wt(m,u.class),Zt(m,-10,-10,ne,F),$.insertBefore(m,At[f]),m}function bi(u,f){if(s==1||f>0){let m=s==1&&M[u.scale].time,_=u.value;u.value=m?ca(_)?_a(W,ma(_,B)):_||de:_||qm,u.label=u.label||(m?zm:Nm)}if(Fn||f>0){u.width=u.width==null?1:u.width,u.paths=u.paths||i0||Jh,u.fillTo=ae(u.fillTo||Zm),u.pxAlign=+he(u.pxAlign,A),u.pxRound=xa(u.pxAlign),u.stroke=ae(u.stroke||null),u.fill=ae(u.fill||null),u._stroke=u._fill=u._paths=u._focus=null;let m=Km(dt(1,u.width),1),_=u.points=Fe({},{size:m,width:dt(1,m*.2),stroke:u.stroke,space:m*2,paths:r0,_stroke:null,_fill:null},u.points);_.show=ae(_.show),_.filter=ae(_.filter),_.fill=ae(_.fill),_.stroke=ae(_.stroke),_.paths=ae(_.paths),_.pxAlign=u.pxAlign}if(Ie){let m=oe(u,f);Se.splice(f,0,m[0]),xt.splice(f,0,m[1]),te.values.push(null)}if(Qe){fe.splice(f,0,null);let m=null;Fn?f==0&&(m=yi(u,f)):f>0&&(m=yi(u,f)),At.splice(f,0,m),Un.splice(f,0,0),Hn.splice(f,0,0)}Je("addSeries",f)}function Au(u,f){f=f??b.length,u=s==1?Bo(u,f,ga,ka):Bo(u,f,{},wa),b.splice(f,0,u),bi(b[f],f)}l.addSeries=Au;function Tu(u){if(b.splice(u,1),Ie){te.values.splice(u,1),xt.splice(u,1);let f=Se.splice(u,1)[0];lt(null,f.firstChild),f.remove()}Qe&&(fe.splice(u,1),At.splice(u,1)[0].remove(),Un.splice(u,1),Hn.splice(u,1)),Je("delSeries",u)}l.delSeries=Tu;const xn=[!1,!1,!1,!1];function Lu(u,f){if(u._show=u.show,u.show){let m=u.side%2,_=M[u.scale];_==null&&(u.scale=m?b[1].scale:T,_=M[u.scale]);let y=_.time;u.size=ae(u.size),u.space=ae(u.space),u.rotate=ae(u.rotate),mn(u.incrs)&&u.incrs.forEach(C=>{!yn.has(C)&&yn.set(C,Bc(C))}),u.incrs=ae(u.incrs||(_.distr==2?gm:y?x==1?bm:km:Tn)),u.splits=ae(u.splits||(y&&_.distr==1?tt:_.distr==3?Fo:_.distr==4?Um:Fm)),u.stroke=ae(u.stroke),u.grid.stroke=ae(u.grid.stroke),u.ticks.stroke=ae(u.ticks.stroke),u.border.stroke=ae(u.border.stroke);let w=u.values;u.values=mn(w)&&!mn(w[0])?ae(w):y?mn(w)?ha(W,pa(w,B)):ca(w)?Mm(W,w):w||ve:w||Vm,u.filter=ae(u.filter||(_.distr>=3&&_.log==10?Bm:_.distr==3&&_.log==2?Wm:Hc)),u.font=Aa(u.font),u.labelFont=Aa(u.labelFont),u._size=u.size(l,null,f,0),u._space=u._rotate=u._incrs=u._found=u._splits=u._values=null,u._size>0&&(xn[f]=!0,u._el=Dt(Ch,p))}}function bl(u,f,m,_){let[y,w,C,P]=m,R=f%2,z=0;return R==0&&(P||w)&&(z=f==0&&!y||f==2&&!C?He(va.size/3):0),R==1&&(y||C)&&(z=f==1&&!w||f==3&&!P?He(ba.size/2):0),z}const $i=l.padding=(e.padding||[bl,bl,bl,bl]).map(u=>ae(he(u,bl))),an=l._padding=$i.map((u,f)=>u(l,f,xn,0));let Xe,qe=null,Ke=null;const Yl=s==1?b[0].idxs:null;let It=null,$l=!1;function wi(u,f){if(t=u??[],l.data=l._data=t,s==2){Xe=0;for(let m=1;m<b.length;m++)Xe+=t[m][0].length}else{t.length==0&&(l.data=l._data=t=[[]]),It=t[0],Xe=It.length;let m=t;if(Y==2){m=t.slice();let _=m[0]=Array(Xe);for(let y=0;y<Xe;y++)_[y]=y}l._data=t=m}if(Bn(!0),Je("setData"),Y==2&&(zn=!0),f!==!1){let m=O;m.auto(l,$l)?Vs():un(T,m.min,m.max),kn=kn||q.left>=0,Ct=!0,Wn()}}l.setData=wi;function Vs(){$l=!0;let u,f;s==1&&(Xe>0?(qe=Yl[0]=0,Ke=Yl[1]=Xe-1,u=t[0][qe],f=t[0][Ke],Y==2?(u=qe,f=Ke):u==f&&(Y==3?[u,f]=Ts(u,u,O.log,!1):Y==4?[u,f]=oi(u,u,O.log,!1):O.time?f=u+He(86400/x):[u,f]=bs(u,f,ii,!0))):(qe=Yl[0]=u=null,Ke=Yl[1]=f=null)),un(T,u,f)}let Jl,jn,Fs,Us,Hs,js,Bs,Ws,qs,_t;function ki(u,f,m,_,y,w){u??(u=qr),m??(m=ai),_??(_="butt"),y??(y=qr),w??(w="round"),u!=Jl&&(d.strokeStyle=Jl=u),y!=jn&&(d.fillStyle=jn=y),f!=Fs&&(d.lineWidth=Fs=f),w!=Hs&&(d.lineJoin=Hs=w),_!=js&&(d.lineCap=js=_),m!=Us&&d.setLineDash(Us=m)}function Si(u,f,m,_){f!=jn&&(d.fillStyle=jn=f),u!=Bs&&(d.font=Bs=u),m!=Ws&&(d.textAlign=Ws=m),_!=qs&&(d.textBaseline=qs=_)}function Ks(u,f,m,_,y=0){if(_.length>0&&u.auto(l,$l)&&(f==null||f.min==null)){let w=he(qe,0),C=he(Ke,_.length-1),P=m.min==null?Bh(_,w,C,y,u.distr==3):[m.min,m.max];u.min=Ut(u.min,m.min=P[0]),u.max=dt(u.max,m.max=P[1])}}const xi={min:null,max:null};function Du(){for(let _ in M){let y=M[_];j[_]==null&&(y.min==null||j[T]!=null&&y.auto(l,$l))&&(j[_]=xi)}for(let _ in M){let y=M[_];j[_]==null&&y.from!=null&&j[y.from]!=null&&(j[_]=xi)}j[T]!=null&&Bn(!0);let u={};for(let _ in j){let y=j[_];if(y!=null){let w=u[_]=ml(M[_],Xh);if(y.min!=null)Fe(w,y);else if(_!=T||s==2)if(Xe==0&&w.from==null){let C=w.range(l,null,null,_);w.min=C[0],w.max=C[1]}else w.min=$e,w.max=-$e}}if(Xe>0){b.forEach((_,y)=>{if(s==1){let w=_.scale,C=j[w];if(C==null)return;let P=u[w];if(y==0){let R=P.range(l,P.min,P.max,w);P.min=R[0],P.max=R[1],qe=Ft(P.min,t[0]),Ke=Ft(P.max,t[0]),Ke-qe>1&&(t[0][qe]<P.min&&qe++,t[0][Ke]>P.max&&Ke--),_.min=It[qe],_.max=It[Ke]}else _.show&&_.auto&&Ks(P,C,_,t[y],_.sorted);_.idxs[0]=qe,_.idxs[1]=Ke}else if(y>0&&_.show&&_.auto){let[w,C]=_.facets,P=w.scale,R=C.scale,[z,V]=t[y],U=u[P],X=u[R];U!=null&&Ks(U,j[P],w,z,w.sorted),X!=null&&Ks(X,j[R],C,V,C.sorted),_.min=C.min,_.max=C.max}});for(let _ in u){let y=u[_],w=j[_];if(y.from==null&&(w==null||w.min==null)){let C=y.range(l,y.min==$e?null:y.min,y.max==-$e?null:y.max,_);y.min=C[0],y.max=C[1]}}}for(let _ in u){let y=u[_];if(y.from!=null){let w=u[y.from];if(w.min==null)y.min=y.max=null;else{let C=y.range(l,w.min,w.max,_);y.min=C[0],y.max=C[1]}}}let f={},m=!1;for(let _ in u){let y=u[_],w=M[_];if(w.min!=y.min||w.max!=y.max){w.min=y.min,w.max=y.max;let C=w.distr;w._min=C==3?sn(w.min):C==4?go(w.min,w.asinh):C==100?w.fwd(w.min):w.min,w._max=C==3?sn(w.max):C==4?go(w.max,w.asinh):C==100?w.fwd(w.max):w.max,f[_]=m=!0}}if(m){b.forEach((_,y)=>{s==2?y>0&&f.y&&(_._paths=null):f[_.scale]&&(_._paths=null)});for(let _ in f)zn=!0,Je("setScale",_);Qe&&q.left>=0&&(kn=Ct=!0)}for(let _ in j)j[_]=null}function Pu(u){let f=Vo(qe-1,0,Xe-1),m=Vo(Ke+1,0,Xe-1);for(;u[f]==null&&f>0;)f--;for(;u[m]==null&&m<Xe-1;)m++;return[f,m]}function Ou(){if(Xe>0){let u=b.some(f=>f._focus)&&_t!=qt.alpha;u&&(d.globalAlpha=_t=qt.alpha),b.forEach((f,m)=>{if(m>0&&f.show&&(Mi(m,!1),Mi(m,!0),f._paths==null)){let _=_t;_t!=f.alpha&&(d.globalAlpha=_t=f.alpha);let y=s==2?[0,t[m][0].length-1]:Pu(t[m]);f._paths=f.paths(l,m,y[0],y[1]),_t!=_&&(d.globalAlpha=_t=_)}}),b.forEach((f,m)=>{if(m>0&&f.show){let _=_t;_t!=f.alpha&&(d.globalAlpha=_t=f.alpha),f._paths!=null&&Ei(m,!1);{let y=f._paths!=null?f._paths.gaps:null,w=f.points.show(l,m,qe,Ke,y),C=f.points.filter(l,m,w,y);(w||C)&&(f.points._paths=f.points.paths(l,m,qe,Ke,C),Ei(m,!0))}_t!=_&&(d.globalAlpha=_t=_),Je("drawSeries",m)}}),u&&(d.globalAlpha=_t=1)}}function Mi(u,f){let m=f?b[u].points:b[u];m._stroke=m.stroke(l,u),m._fill=m.fill(l,u)}function Ei(u,f){let m=f?b[u].points:b[u],{stroke:_,fill:y,clip:w,flags:C,_stroke:P=m._stroke,_fill:R=m._fill,_width:z=m.width}=m._paths;z=we(z*_e,3);let V=null,U=z%2/2;f&&R==null&&(R=z>0?"#fff":P);let X=m.pxAlign==1&&U>0;if(X&&d.translate(U,U),!f){let me=gt-z/2,pe=Et-z/2,re=mt+z,Z=Rt+z;V=new Path2D,V.rect(me,pe,re,Z)}f?Gs(P,z,m.dash,m.cap,R,_,y,C,w):Ru(u,P,z,m.dash,m.cap,R,_,y,C,V,w),X&&d.translate(-U,-U)}function Ru(u,f,m,_,y,w,C,P,R,z,V){let U=!1;R!=0&&S.forEach((X,me)=>{if(X.series[0]==u){let pe=b[X.series[1]],re=t[X.series[1]],Z=(pe._paths||Rl).band;mn(Z)&&(Z=X.dir==1?Z[0]:Z[1]);let K,Ae=null;pe.show&&Z&&qh(re,qe,Ke)?(Ae=X.fill(l,me)||w,K=pe._paths.clip):Z=null,Gs(f,m,_,y,Ae,C,P,R,z,V,K,Z),U=!0}}),U||Gs(f,m,_,y,w,C,P,R,z,V)}const Ci=_l|Ho;function Gs(u,f,m,_,y,w,C,P,R,z,V,U){ki(u,f,m,_,y),(R||z||U)&&(d.save(),R&&d.clip(R),z&&d.clip(z)),U?(P&Ci)==Ci?(d.clip(U),V&&d.clip(V),Ql(y,C),Zl(u,w,f)):P&Ho?(Ql(y,C),d.clip(U),Zl(u,w,f)):P&_l&&(d.save(),d.clip(U),V&&d.clip(V),Ql(y,C),d.restore(),Zl(u,w,f)):(Ql(y,C),Zl(u,w,f)),(R||z||U)&&d.restore()}function Zl(u,f,m){m>0&&(f instanceof Map?f.forEach((_,y)=>{d.strokeStyle=Jl=y,d.stroke(_)}):f!=null&&u&&d.stroke(f))}function Ql(u,f){f instanceof Map?f.forEach((m,_)=>{d.fillStyle=jn=_,d.fill(m)}):f!=null&&u&&d.fill(f)}function Iu(u,f,m,_){let y=E[u],w;if(_<=0)w=[0,0];else{let C=y._space=y.space(l,u,f,m,_),P=y._incrs=y.incrs(l,u,f,m,_,C);w=p0(f,m,P,_,C)}return y._found=w}function Ys(u,f,m,_,y,w,C,P,R,z){let V=C%2/2;A==1&&d.translate(V,V),ki(P,C,R,z,P),d.beginPath();let U,X,me,pe,re=y+(_==0||_==3?-w:w);m==0?(X=y,pe=re):(U=y,me=re);for(let Z=0;Z<u.length;Z++)f[Z]!=null&&(m==0?U=me=u[Z]:X=pe=u[Z],d.moveTo(U,X),d.lineTo(me,pe));d.stroke(),A==1&&d.translate(-V,-V)}function Nu(u){let f=!0;return E.forEach((m,_)=>{if(!m.show)return;let y=M[m.scale];if(y.min==null){m._show&&(f=!1,m._show=!1,Bn(!1));return}else m._show||(f=!1,m._show=!0,Bn(!1));let w=m.side,C=w%2,{min:P,max:R}=y,[z,V]=Iu(_,P,R,C==0?ne:F);if(V==0)return;let U=y.distr==2,X=m._splits=m.splits(l,_,P,R,z,V,U),me=y.distr==2?X.map(K=>It[K]):X,pe=y.distr==2?It[X[1]]-It[X[0]]:z,re=m._values=m.values(l,m.filter(l,me,_,V,pe),_,V,pe);m._rotate=w==2?m.rotate(l,re,_,V):0;let Z=m._size;m._size=Pt(m.size(l,re,_,u)),Z!=null&&m._size!=Z&&(f=!1)}),f}function zu(u){let f=!0;return $i.forEach((m,_)=>{let y=m(l,_,xn,u);y!=an[_]&&(f=!1),an[_]=y}),f}function Vu(){for(let u=0;u<E.length;u++){let f=E[u];if(!f.show||!f._show)continue;let m=f.side,_=m%2,y,w,C=f.stroke(l,u),P=m==0||m==3?-1:1,[R,z]=f._found;if(f.label!=null){let at=f.labelGap*P,$t=He((f._lpos+at)*_e);Si(f.labelFont[0],C,"center",m==2?Cl:Wr),d.save(),_==1?(y=w=0,d.translate($t,He(Et+Rt/2)),d.rotate((m==3?-fs:fs)/2)):(y=He(gt+mt/2),w=$t);let Cn=Fc(f.label)?f.label(l,u,R,z):f.label;d.fillText(Cn,y,w),d.restore()}if(z==0)continue;let V=M[f.scale],U=_==0?mt:Rt,X=_==0?gt:Et,me=f._splits,pe=V.distr==2?me.map(at=>It[at]):me,re=V.distr==2?It[me[1]]-It[me[0]]:R,Z=f.ticks,K=f.border,Ae=Z.show?Z.size:0,Oe=He(Ae*_e),Ze=He((f.alignTo==2?f._size-Ae-f.gap:f.gap)*_e),ye=f._rotate*-fs/180,Re=k(f._pos*_e),yt=(Oe+Ze)*P,rt=Re+yt;w=_==0?rt:0,y=_==1?rt:0;let Tt=f.font[0],Nt=f.align==1?el:f.align==2?mo:ye>0?el:ye<0?mo:_==0?"center":m==3?mo:el,Yt=ye||_==1?"middle":m==2?Cl:Wr;Si(Tt,C,Nt,Yt);let bt=f.font[1]*f.lineGap,Lt=me.map(at=>k(r(at,V,U,X))),zt=f._values;for(let at=0;at<zt.length;at++){let $t=zt[at];if($t!=null){_==0?y=Lt[at]:w=Lt[at],$t=""+$t;let Cn=$t.indexOf(`
`)==-1?[$t]:$t.split(/\n/gm);for(let ct=0;ct<Cn.length;ct++){let Ki=Cn[ct];ye?(d.save(),d.translate(y,w+ct*bt),d.rotate(ye),d.fillText(Ki,0,0),d.restore()):d.fillText(Ki,y,w+ct*bt)}}}Z.show&&Ys(Lt,Z.filter(l,pe,u,z,re),_,m,Re,Oe,we(Z.width*_e,3),Z.stroke(l,u),Z.dash,Z.cap);let Jt=f.grid;Jt.show&&Ys(Lt,Jt.filter(l,pe,u,z,re),_,_==0?2:1,_==0?Et:gt,_==0?Rt:mt,we(Jt.width*_e,3),Jt.stroke(l,u),Jt.dash,Jt.cap),K.show&&Ys([Re],[1],_==0?1:0,_==0?1:2,_==1?Et:gt,_==1?Rt:mt,we(K.width*_e,3),K.stroke(l,u),K.dash,K.cap)}Je("drawAxes")}function Bn(u){b.forEach((f,m)=>{m>0&&(f._paths=null,u&&(s==1?(f.min=null,f.max=null):f.facets.forEach(_=>{_.min=null,_.max=null})))})}let Xl=!1,Js=!1,wl=[];function Fu(){Js=!1;for(let u=0;u<wl.length;u++)Je(...wl[u]);wl.length=0}function Wn(){Xl||(im(Ai),Xl=!0)}function Uu(u,f=!1){Xl=!0,Js=f,u(l),Ai(),f&&wl.length>0&&queueMicrotask(Fu)}l.batch=Uu;function Ai(){if(Ns&&(Du(),Ns=!1),zn&&(xu(),zn=!1),Kl){if(Te(v,el,xe),Te(v,Cl,Ue),Te(v,Tl,ne),Te(v,Ll,F),Te($,el,xe),Te($,Cl,Ue),Te($,Tl,ne),Te($,Ll,F),Te(p,Tl,Mt),Te(p,Ll,bn),h.width=He(Mt*_e),h.height=He(bn*_e),E.forEach(({_el:u,_show:f,_size:m,_pos:_,side:y})=>{if(u!=null)if(f){let w=y===3||y===0?m:0,C=y%2==1;Te(u,C?"left":"top",_-w),Te(u,C?"width":"height",m),Te(u,C?"top":"left",C?Ue:xe),Te(u,C?"height":"width",C?F:ne),No(u,Ln)}else wt(u,Ln)}),Jl=jn=Fs=Hs=js=Bs=Ws=qs=Us=null,_t=1,xl(!0),xe!=Nn||Ue!=$n||ne!=Wt||F!=wn){Bn(!1);let u=ne/Wt,f=F/wn;if(Qe&&!kn&&q.left>=0){q.left*=u,q.top*=f,qn&&Zt(qn,He(q.left),0,ne,F),Kn&&Zt(Kn,0,He(q.top),ne,F);for(let m=0;m<At.length;m++){let _=At[m];_!=null&&(Un[m]*=u,Hn[m]*=f,Zt(_,Pt(Un[m]),Pt(Hn[m]),ne,F))}}if(Ce.show&&!Gl&&Ce.left>=0&&Ce.width>0){Ce.left*=u,Ce.width*=u,Ce.top*=f,Ce.height*=f;for(let m in no)Te(Jn,m,Ce[m])}Nn=xe,$n=Ue,Wt=ne,wn=F}Je("setSize"),Kl=!1}Mt>0&&bn>0&&(d.clearRect(0,0,h.width,h.height),Je("drawClear"),D.forEach(u=>u()),Je("draw")),Ce.show&&Gl&&(es(Ce),Gl=!1),Qe&&kn&&(En(null,!0,!1),kn=!1),te.show&&te.live&&Ct&&(eo(),Ct=!1),a||(a=!0,l.status=1,Je("ready")),$l=!1,Xl=!1}l.redraw=(u,f)=>{zn=f||!1,u!==!1?un(T,O.min,O.max):Wn()};function Zs(u,f){let m=M[u];if(m.from==null){if(Xe==0){let _=m.range(l,f.min,f.max,u);f.min=_[0],f.max=_[1]}if(f.min>f.max){let _=f.min;f.min=f.max,f.max=_}if(Xe>1&&f.min!=null&&f.max!=null&&f.max-f.min<1e-16)return;u==T&&m.distr==2&&Xe>0&&(f.min=Ft(f.min,t[0]),f.max=Ft(f.max,t[0]),f.min==f.max&&f.max++),j[u]=f,Ns=!0,Wn()}}l.setScale=Zs;let Qs,Xs,qn,Kn,Ti,Li,Gn,Yn,Di,Pi,Ee,Le,cn=!1;const et=q.drag;let Ge=et.x,Ye=et.y;Qe&&(q.x&&(Qs=Dt(Th,$)),q.y&&(Xs=Dt(Lh,$)),O.ori==0?(qn=Qs,Kn=Xs):(qn=Xs,Kn=Qs),Ee=q.left,Le=q.top);const Ce=l.select=Fe({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Jn=Ce.show?Dt(Ah,Ce.over?$:v):null;function es(u,f){if(Ce.show){for(let m in u)Ce[m]=u[m],m in no&&Te(Jn,m,u[m]);f!==!1&&Je("setSelect")}}l.setSelect=es;function Hu(u){if(b[u].show)Ie&&No(Se[u],Ln);else if(Ie&&wt(Se[u],Ln),Qe){let m=Fn?At[0]:At[u];m!=null&&Zt(m,-10,-10,ne,F)}}function un(u,f,m){Zs(u,{min:f,max:m})}function Kt(u,f,m,_){f.focus!=null&&Ku(u),f.show!=null&&b.forEach((y,w)=>{w>0&&(u==w||u==null)&&(y.show=f.show,Hu(w),s==2?(un(y.facets[0].scale,null,null),un(y.facets[1].scale,null,null)):un(y.scale,null,null),Wn())}),m!==!1&&Je("setSeries",u,f),_&&Ml("setSeries",l,u,f)}l.setSeries=Kt;function ju(u,f){Fe(S[u],f)}function Bu(u,f){u.fill=ae(u.fill||null),u.dir=he(u.dir,-1),f=f??S.length,S.splice(f,0,u)}function Wu(u){u==null?S.length=0:S.splice(u,1)}l.addBand=Bu,l.setBand=ju,l.delBand=Wu;function qu(u,f){b[u].alpha=f,Qe&&At[u]!=null&&(At[u].style.opacity=f),Ie&&Se[u]&&(Se[u].style.opacity=f)}let nn,dn,Mn;const Zn={focus:!0};function Ku(u){if(u!=Mn){let f=u==null,m=qt.alpha!=1;b.forEach((_,y)=>{if(s==1||y>0){let w=f||y==0||y==u;_._focus=f?null:w,m&&qu(y,w?1:qt.alpha)}}),Mn=u,m&&Wn()}}Ie&&Vn&&Ne(Yr,ue,u=>{q._lock||(Sn(u),Mn!=null&&Kt(null,Zn,!0,ze.setSeries))});function Gt(u,f,m){let _=M[f];m&&(u=u/_e-(_.ori==1?Ue:xe));let y=ne;_.ori==1&&(y=F,u=y-u),_.dir==-1&&(u=y-u);let w=_._min,C=_._max,P=u/y,R=w+(C-w)*P,z=_.distr;return z==3?pl(10,R):z==4?Gh(R,_.asinh):z==100?_.bwd(R):R}function Gu(u,f){let m=Gt(u,T,f);return Ft(m,t[0],qe,Ke)}l.valToIdx=u=>Ft(u,t[0]),l.posToIdx=Gu,l.posToVal=Gt,l.valToPos=(u,f,m)=>M[f].ori==0?o(u,M[f],m?mt:ne,m?gt:0):i(u,M[f],m?Rt:F,m?Et:0),l.setCursor=(u,f,m)=>{Ee=u.left,Le=u.top,En(null,f,m)};function Oi(u,f){Te(Jn,el,Ce.left=u),Te(Jn,Tl,Ce.width=f)}function Ri(u,f){Te(Jn,Cl,Ce.top=u),Te(Jn,Ll,Ce.height=f)}let kl=O.ori==0?Oi:Ri,Sl=O.ori==1?Oi:Ri;function Yu(){if(Ie&&te.live)for(let u=s==2?1:0;u<b.length;u++){if(u==0&&nt)continue;let f=te.values[u],m=0;for(let _ in f)xt[u][m++].firstChild.nodeValue=f[_]}}function eo(u,f){if(u!=null&&(u.idxs?u.idxs.forEach((m,_)=>{fe[_]=m}):Qh(u.idx)||fe.fill(u.idx),te.idx=fe[0]),Ie&&te.live){for(let m=0;m<b.length;m++)(m>0||s==1&&!nt)&&Ju(m,fe[m]);Yu()}Ct=!1,f!==!1&&Je("setLegend")}l.setLegend=eo;function Ju(u,f){let m=b[u],_=u==0&&Y==2?It:t[u],y;nt?y=m.values(l,u,f)??Bt:(y=m.value(l,f==null?null:_[f],u,f),y=y==null?Bt:{_:y}),te.values[u]=y}function En(u,f,m){Di=Ee,Pi=Le,[Ee,Le]=q.move(l,Ee,Le),q.left=Ee,q.top=Le,Qe&&(qn&&Zt(qn,He(Ee),0,ne,F),Kn&&Zt(Kn,0,He(Le),ne,F));let _,y=qe>Ke;nn=$e,dn=null;let w=O.ori==0?ne:F,C=O.ori==1?ne:F;if(Ee<0||Xe==0||y){_=q.idx=null;for(let P=0;P<b.length;P++){let R=At[P];R!=null&&Zt(R,-10,-10,ne,F)}Vn&&Kt(null,Zn,!0,u==null&&ze.setSeries),te.live&&(fe.fill(_),Ct=!0)}else{let P,R,z;s==1&&(P=O.ori==0?Ee:Le,R=Gt(P,T),_=q.idx=Ft(R,t[0],qe,Ke),z=H(t[0][_],O,w,0));let V=-10,U=-10,X=0,me=0,pe=!0,re="",Z="";for(let K=s==2?1:0;K<b.length;K++){let Ae=b[K],Oe=fe[K],Ze=Oe==null?null:s==1?t[K][Oe]:t[K][1][Oe],ye=q.dataIdx(l,K,_,R),Re=ye==null?null:s==1?t[K][ye]:t[K][1][ye];if(Ct=Ct||Re!=Ze||ye!=Oe,fe[K]=ye,K>0&&Ae.show){let yt=ye==null?-10:ye==_?z:H(s==1?t[0][ye]:t[K][0][ye],O,w,0),rt=Re==null?-10:G(Re,s==1?M[Ae.scale]:M[Ae.facets[1].scale],C,0);if(Vn&&Re!=null){let Tt=O.ori==1?Ee:Le,Nt=je(qt.dist(l,K,ye,rt,Tt));if(Nt<nn){let Yt=qt.bias;if(Yt!=0){let bt=Gt(Tt,Ae.scale),Lt=Re>=0?1:-1,zt=bt>=0?1:-1;zt==Lt&&(zt==1?Yt==1?Re>=bt:Re<=bt:Yt==1?Re<=bt:Re>=bt)&&(nn=Nt,dn=K)}else nn=Nt,dn=K}}if(Ct||Fn){let Tt,Nt;O.ori==0?(Tt=yt,Nt=rt):(Tt=rt,Nt=yt);let Yt,bt,Lt,zt,Jt,at,$t=!0,Cn=st.bbox;if(Cn!=null){$t=!1;let ct=Cn(l,K);Lt=ct.left,zt=ct.top,Yt=ct.width,bt=ct.height}else Lt=Tt,zt=Nt,Yt=bt=st.size(l,K);if(at=st.fill(l,K),Jt=st.stroke(l,K),Fn)K==dn&&nn<=qt.prox&&(V=Lt,U=zt,X=Yt,me=bt,pe=$t,re=at,Z=Jt);else{let ct=At[K];ct!=null&&(Un[K]=Lt,Hn[K]=zt,na(ct,Yt,bt,$t),ea(ct,at,Jt),Zt(ct,Pt(Lt),Pt(zt),ne,F))}}}}if(Fn){let K=qt.prox,Ae=Mn==null?nn<=K:nn>K||dn!=Mn;if(Ct||Ae){let Oe=At[0];Oe!=null&&(Un[0]=V,Hn[0]=U,na(Oe,X,me,pe),ea(Oe,re,Z),Zt(Oe,Pt(V),Pt(U),ne,F))}}}if(Ce.show&&cn)if(u!=null){let[P,R]=ze.scales,[z,V]=ze.match,[U,X]=u.cursor.sync.scales,me=u.cursor.drag;if(Ge=me._x,Ye=me._y,Ge||Ye){let{left:pe,top:re,width:Z,height:K}=u.select,Ae=u.scales[U].ori,Oe=u.posToVal,Ze,ye,Re,yt,rt,Tt=P!=null&&z(P,U),Nt=R!=null&&V(R,X);Tt&&Ge?(Ae==0?(Ze=pe,ye=Z):(Ze=re,ye=K),Re=M[P],yt=H(Oe(Ze,U),Re,w,0),rt=H(Oe(Ze+ye,U),Re,w,0),kl(Ut(yt,rt),je(rt-yt))):kl(0,w),Nt&&Ye?(Ae==1?(Ze=pe,ye=Z):(Ze=re,ye=K),Re=M[R],yt=G(Oe(Ze,X),Re,C,0),rt=G(Oe(Ze+ye,X),Re,C,0),Sl(Ut(yt,rt),je(rt-yt))):Sl(0,C)}else lo()}else{let P=je(Di-Ti),R=je(Pi-Li);if(O.ori==1){let X=P;P=R,R=X}Ge=et.x&&P>=et.dist,Ye=et.y&&R>=et.dist;let z=et.uni;z!=null?Ge&&Ye&&(Ge=P>=z,Ye=R>=z,!Ge&&!Ye&&(R>P?Ye=!0:Ge=!0)):et.x&&et.y&&(Ge||Ye)&&(Ge=Ye=!0);let V,U;Ge&&(O.ori==0?(V=Gn,U=Ee):(V=Yn,U=Le),kl(Ut(V,U),je(U-V)),Ye||Sl(0,C)),Ye&&(O.ori==1?(V=Gn,U=Ee):(V=Yn,U=Le),Sl(Ut(V,U),je(U-V)),Ge||kl(0,w)),!Ge&&!Ye&&(kl(0,0),Sl(0,0))}if(et._x=Ge,et._y=Ye,u==null){if(m){if(qi!=null){let[P,R]=ze.scales;ze.values[0]=P!=null?Gt(O.ori==0?Ee:Le,P):null,ze.values[1]=R!=null?Gt(O.ori==1?Ee:Le,R):null}Ml(_o,l,Ee,Le,ne,F,_)}if(Vn){let P=m&&ze.setSeries,R=qt.prox;Mn==null?nn<=R&&Kt(dn,Zn,!0,P):nn>R?Kt(null,Zn,!0,P):dn!=Mn&&Kt(dn,Zn,!0,P)}}Ct&&(te.idx=_,eo()),f!==!1&&Je("setCursor")}let fn=null;Object.defineProperty(l,"rect",{get(){return fn==null&&xl(!1),fn}});function xl(u=!1){u?fn=null:(fn=$.getBoundingClientRect(),Je("syncRect",fn))}function Ii(u,f,m,_,y,w,C){q._lock||cn&&u!=null&&u.movementX==0&&u.movementY==0||(to(u,f,m,_,y,w,C,!1,u!=null),u!=null?En(null,!0,!0):En(f,!0,!1))}function to(u,f,m,_,y,w,C,P,R){if(fn==null&&xl(!1),Sn(u),u!=null)m=u.clientX-fn.left,_=u.clientY-fn.top;else{if(m<0||_<0){Ee=-10,Le=-10;return}let[z,V]=ze.scales,U=f.cursor.sync,[X,me]=U.values,[pe,re]=U.scales,[Z,K]=ze.match,Ae=f.axes[0].side%2==1,Oe=O.ori==0?ne:F,Ze=O.ori==1?ne:F,ye=Ae?w:y,Re=Ae?y:w,yt=Ae?_:m,rt=Ae?m:_;if(pe!=null?m=Z(z,pe)?r(X,M[z],Oe,0):-10:m=Oe*(yt/ye),re!=null?_=K(V,re)?r(me,M[V],Ze,0):-10:_=Ze*(rt/Re),O.ori==1){let Tt=m;m=_,_=Tt}}R&&(f==null||f.cursor.event.type==_o)&&((m<=1||m>=ne-1)&&(m=An(m,ne)),(_<=1||_>=F-1)&&(_=An(_,F))),P?(Ti=m,Li=_,[Gn,Yn]=q.move(l,m,_)):(Ee=m,Le=_)}const no={width:0,height:0,left:0,top:0};function lo(){es(no,!1)}let Ni,zi,Vi,Fi;function Ui(u,f,m,_,y,w,C){cn=!0,Ge=Ye=et._x=et._y=!1,to(u,f,m,_,y,w,C,!0,!1),u!=null&&(Ne(vo,Ro,Hi,!1),Ml(Kr,l,Gn,Yn,ne,F,null));let{left:P,top:R,width:z,height:V}=Ce;Ni=P,zi=R,Vi=z,Fi=V}function Hi(u,f,m,_,y,w,C){cn=et._x=et._y=!1,to(u,f,m,_,y,w,C,!1,!0);let{left:P,top:R,width:z,height:V}=Ce,U=z>0||V>0,X=Ni!=P||zi!=R||Vi!=z||Fi!=V;if(U&&X&&es(Ce),et.setScale&&U&&X){let me=P,pe=z,re=R,Z=V;if(O.ori==1&&(me=R,pe=V,re=P,Z=z),Ge&&un(T,Gt(me,T),Gt(me+pe,T)),Ye)for(let K in M){let Ae=M[K];K!=T&&Ae.from==null&&Ae.min!=$e&&un(K,Gt(re+Z,K),Gt(re,K))}lo()}else q.lock&&(q._lock=!q._lock,En(f,!0,u!=null));u!=null&&(lt(vo,Ro),Ml(vo,l,Ee,Le,ne,F,null))}function Zu(u,f,m,_,y,w,C){if(q._lock)return;Sn(u);let P=cn;if(cn){let R=!0,z=!0,V=10,U,X;O.ori==0?(U=Ge,X=Ye):(U=Ye,X=Ge),U&&X&&(R=Ee<=V||Ee>=ne-V,z=Le<=V||Le>=F-V),U&&R&&(Ee=Ee<Gn?0:ne),X&&z&&(Le=Le<Yn?0:F),En(null,!0,!0),cn=!1}Ee=-10,Le=-10,fe.fill(null),En(null,!0,!0),P&&(cn=P)}function ji(u,f,m,_,y,w,C){q._lock||(Sn(u),Vs(),lo(),u!=null&&Ml(Jr,l,Ee,Le,ne,F,null))}function Bi(){E.forEach(h0),zs(l.width,l.height,!0)}Pn(ys,al,Bi);const Qn={};Qn.mousedown=Ui,Qn.mousemove=Ii,Qn.mouseup=Hi,Qn.dblclick=ji,Qn.setSeries=(u,f,m,_)=>{let y=ze.match[2];m=y(l,f,m),m!=-1&&Kt(m,_,!0,!1)},Qe&&(Ne(Kr,$,Ui),Ne(_o,$,Ii),Ne(Gr,$,u=>{Sn(u),xl(!1)}),Ne(Yr,$,Zu),Ne(Jr,$,ji),jo.add(l),l.syncRect=xl);const ts=l.hooks=e.hooks||{};function Je(u,f,m){Js?wl.push([u,f,m]):u in ts&&ts[u].forEach(_=>{_.call(null,l,f,m)})}(e.plugins||[]).forEach(u=>{for(let f in u.hooks)ts[f]=(ts[f]||[]).concat(u.hooks[f])});const Wi=(u,f,m)=>m,ze=Fe({key:null,setSeries:!1,filters:{pub:ra,sub:ra},scales:[T,b[1]?b[1].scale:null],match:[aa,aa,Wi],values:[null,null]},q.sync);ze.match.length==2&&ze.match.push(Wi),q.sync=ze;const qi=ze.key,so=uu(qi);function Ml(u,f,m,_,y,w,C){ze.filters.pub(u,f,m,_,y,w,C)&&so.pub(u,f,m,_,y,w,C)}so.sub(l);function Qu(u,f,m,_,y,w,C){ze.filters.sub(u,f,m,_,y,w,C)&&Qn[u](null,f,m,_,y,w,C)}l.pub=Qu;function Xu(){so.unsub(l),jo.delete(l),We.clear(),zo(ys,al,Bi),c.remove(),ue==null||ue.remove(),Je("destroy")}l.destroy=Xu;function oo(){Je("init",e,t),wi(t||e.data,!1),j[T]?Zs(T,j[T]):Vs(),Gl=Ce.show&&(Ce.width>0||Ce.height>0),kn=Ct=!0,zs(e.width,e.height)}return b.forEach(bi),E.forEach(Lu),n?n instanceof HTMLElement?(n.appendChild(c),oo()):n(l,oo):oo(),l}it.assign=Fe;it.fmtNum=ri;it.rangeNum=bs;it.rangeLog=Ts;it.rangeAsinh=oi;it.orient=In;it.pxRatio=_e;it.join=om;it.fmtDate=ci,it.tzDate=_m;it.sync=uu;{it.addGap=Qm,it.clipGaps=Ps;let e=it.paths={points:_u};e.linear=gu,e.stepped=t0,e.bars=n0,e.spline=s0}function m0(e){let t;return{hooks:{init(n){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",n.over.appendChild(t)},setCursor(n){const l=n.cursor.idx;if(l==null||!n.data[1]||n.data[1][l]==null){t.style.display="none";return}const s=n.data[0][l],o=n.data[1][l],i=new Date(s*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):vt(o)}</b> ${i}`;const r=Math.round(n.valToPos(s,"x"));t.style.left=Math.min(r,n.over.clientWidth-80)+"px",t.style.display=""}}}}function _0(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const n=document.createElement("span");n.style.color=e,document.body.appendChild(n);const l=getComputedStyle(n).color;n.remove();const s=l.match(/[\d.]+/g);return s&&s.length>=3?`rgba(${s[0]},${s[1]},${s[2]},${t})`:`rgba(100,100,100,${t})`}function v0({data:e,color:t,smooth:n,height:l,yMax:s,fmtVal:o,ariaLabel:i,ariaHidden:r}){const a=ee(null),c=ee(null),h=l||55;return ce(()=>{if(!a.current||!e||e[0].length<2)return;const d=n?jd(e[1]):e[1],p=[e[0],d];if(c.current){c.current.setData(p);return}const v=s?(A,k,x)=>[0,Math.max(s,x*1.05)]:(A,k,x)=>[Math.max(0,k*.9),x*1.1],$={width:a.current.clientWidth||200,height:h,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:v}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:Fd(t),width:1.5,fill:_0(t,.09)}],plugins:[m0(o)]};return c.current=new it($,p,a.current),()=>{c.current&&(c.current.destroy(),c.current=null)}},[e,t,n]),ce(()=>{if(!c.current||!a.current)return;const d=new ResizeObserver(()=>{c.current&&a.current&&c.current.setSize({width:a.current.clientWidth,height:h})});return d.observe(a.current),()=>d.disconnect()},[]),g`<div class="chart-wrap"
    role=${r?null:"img"}
    aria-hidden=${r?"true":null}
    aria-label=${r?null:i||"Sparkline chart"}
    style=${"height:"+h+"px"} ref=${a}></div>`}function g0(e){if(!e||!e[1])return null;const t=e[1].filter(s=>s!=null&&!isNaN(s));if(t.length<2)return null;const n=t[0],l=t[t.length-1];if(n>0){const s=(l-n)/n*100;return Math.abs(s)<1?null:{dir:s>0?"▲":"▼",pct:Math.round(Math.abs(s))}}return l>0?{dir:"▲",pct:null}:null}function y0({label:e,value:t,valColor:n,data:l,chartColor:s,smooth:o,refLines:i,yMax:r,dp:a,iconName:c}){const h=Me(()=>{if(!l||!l[1]||l[1].length<2)return[];const p=r?Math.max(r,l[1].reduce((v,$)=>Math.max(v,$),0)*1.05):l[1].reduce((v,$)=>Math.max(v,$),0)*1.1;return(i||[]).map(v=>{if(p<=0)return null;const $=(1-v.value/p)*100;return $>=0&&$<=95?{...v,pct:$}:null}).filter(Boolean)},[l,i,r]),d=Me(()=>g0(l),[l]);return g`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${a?{"data-dp":a}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${c?g`<${jt} name=${c} size="0.85em"/> `:""}${e}</span>
      <span class="chart-val-group">
        ${d?g`<span class="chart-trend" aria-hidden="true">${d.dir}${d.pct!=null?" "+d.pct+"%":""}</span>`:""}
        <span class="chart-val" style=${n?"color:"+n:null} aria-live="polite" aria-atomic="true">${t}</span>
      </span>
    </div>
    <div style="position:relative">
      ${h.map((p,v)=>g`<${gn} key=${p.label??v}>
          <div class="chart-ref-line" style=${"top:"+p.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+p.pct+"% - 8px)"}>${p.label}</div>
        </${gn}>`)}
      ${l&&l[0].length>=2?g`<${v0} data=${l} color=${s||"var(--accent)"} smooth=${o} yMax=${r} ariaHidden=${!0}/>`:g`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:var(--fs-base)">collecting...</div>`}
    </div>
  </div>`}function b0({pct:e,direction:t,inverse:n=!1,compareLabel:l}){if(e==null||t==null)return null;const s=t==="flat"||e===0,o=s?"•":t==="up"?"▲":"▼";let i="neutral";s||(i=(n?t==="down":t==="up")?"success":"danger");const r=Number.isFinite(e)?Math.abs(e).toFixed(Math.abs(e)>=10?0:1):"0",a=g`<${Ir} variant=${i} size="sm"
    aria-label=${"Delta: "+o+" "+r+"%"+(l?" vs "+l:"")}
  >${o} ${r}%</${Ir}>`;return l?g`<${Nr} content=${"vs. "+l}>${a}</${Nr}>`:a}function Wo({label:e,value:t,accent:n,dp:l,sm:s,delta:o,deltaInverse:i}){const r=ee(t),[a,c]=Q(!1);return ce(()=>{r.current!==t&&(c(!0),setTimeout(()=>c(!1),500)),r.current=t},[t]),g`<div class=${"metric"+(s?" metric--sm":"")} aria-label="${e}: ${t}" ...${l?{"data-dp":l}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(n?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
    ${o?g`<div class="metric-delta"><${b0}
      pct=${o.pct} direction=${o.direction}
      inverse=${i} compareLabel=${o.compareLabel}/></div>`:null}
  </div>`}function Ta({snap:e,mode:t}){if(!e)return null;const n=!t||t==="files",l=!t||t==="traffic",s=e.tools.filter(c=>{var h;return c.tool!=="aictl"&&((h=c.files)==null?void 0:h.length)}),o=s.reduce((c,h)=>c+h.files.length,0)||1,i=c=>(Number(c.live.outbound_rate_bps)||0)+(Number(c.live.inbound_rate_bps)||0),r=e.tools.filter(c=>c.tool!=="aictl"&&c.live&&i(c)>0),a=r.reduce((c,h)=>c+i(h),0)||1;return g`
    ${n&&s.length>0&&g`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+s.map(c=>c.label+" "+c.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${s.map(c=>g`
        <div class="rbar-seg" style=${"width:"+(c.files.length/o*100).toFixed(1)+"%;background:"+(nl[c.tool]||"var(--fg2)")}
          title="${c.label}: ${c.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${s.map(c=>g`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(nl[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${c.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${l&&g`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(r.length?r.map(c=>c.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${r.length===0?" — no active traffic":""}</div>
      <div class="rbar">${r.map(c=>{const h=i(c);return g`<div class="rbar-seg" style=${"width:"+(h/a*100).toFixed(1)+"%;background:"+(nl[c.tool]||"var(--fg2)")}
          title="${c.label}: ${Ao(h)}"></div>`})}
      </div>
      <div class="rbar-legend">${r.map(c=>{const h=i(c);return g`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(nl[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${Ao(h)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!s.length&&!r.length&&g`<div class="empty-state">
      No AI tool resources found yet.
      <small class="empty-state-source">/api/snapshot · tools[].files · tools[].live</small>
    </div>`}`}const $0=18e4;function w0({loading:e,error:t,data:n,isEmpty:l,updatedAt:s,staleMs:o=$0,now:i=Date.now()}){return n!=null?l&&l(n)?t?"error":"empty":t||s&&i-s>o?"stale":"ready":t?"error":e?"loading":"empty"}function k0(e){return e&&(typeof e=="string"?e:e.message)||"The request failed."}function _n({status:e,error:t,updatedAt:n,onRetry:l,emptyTitle:s="No data",emptyHint:o,emptyFix:i,skeletonHeight:r="72px",label:a,children:c}){if(e==="loading")return g`<div class="panel-state panel-state--loading" role="status" aria-busy="true"
      aria-label=${"Loading "+(a||"panel")}>
      <${rl} height=${r} radius="var(--radius-sm)"/>
    </div>`;if(e==="error")return g`<div class="panel-state panel-state--error" role="alert">
      <${jt} name="alert-triangle" size="14"/>
      <div>
        <div class="panel-state__title">Could not load ${a||"this panel"}</div>
        <div class="panel-state__hint">${k0(t)}</div>
      </div>
      ${l&&g`<button type="button" class="range-btn" onClick=${l}>Retry</button>`}
    </div>`;if(e==="empty")return g`<div class="panel-state panel-state--empty" role="status">
      <div class="panel-state__title">${s}</div>
      ${o&&g`<div class="panel-state__hint">${o}</div>`}
      ${i&&g`<code class="panel-state__fix">${i}</code>`}
    </div>`;const h=n?Math.max(0,Math.round((Date.now()-n)/1e3)):null;return g`
    ${e==="stale"&&g`<div class="panel-state panel-state--stale" role="status">
      <${jt} name="clock" size="12"/>
      <span>${t?"Refresh failed. ":""}Showing data from ${h!=null?Qo(h)+" ago":"an earlier fetch"}.</span>
      ${l&&g`<button type="button" class="panel-state__retry" onClick=${l}>Retry</button>`}
    </div>`}
    ${c}`}function S0({enabledTools:e,snap:t,what:n="this screen"}){const l=Bp(e),s=eh(e,t);return g`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${jt} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${l?"No tools are selected":"The selected tools have no data here"}</div>
      <div class="panel-state__hint">${l?`The tool filter in the header has no tool ticked, so ${n} shows nothing. Tick a tool, or choose All tools.`:`${s.join(", ")} ${s.length===1?"has":"have"} nothing to show on ${n}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function x0({perCore:e}){if(!e||!e.length)return null;const t=100;return g`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((n,l)=>{const s=Math.max(1,n/t*100),o=n>80?"var(--red)":n>50?"var(--orange)":n>20?"var(--green)":"var(--fg2)";return g`<div key=${l} title=${"Core "+l+": "+ul(n)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+s+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function M0({mcpDetail:e}){return e!=null&&e.length?g`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{const n=Rd[t.status]||"var(--fg3)";return g`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${n}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ol(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${Ud(t.tool)};white-space:nowrap;flex-shrink:0">${ol(t.tool)}</span>
      </div>`})}
  </div>`:g`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`}function E0({label:e,value:t,mcpDetail:n}){const[l,s]=Q(!1);return g`<div style="position:relative;cursor:default"
    tabindex="0"
    onMouseEnter=${()=>s(!0)} onMouseLeave=${()=>s(!1)}
    onFocusIn=${()=>s(!0)} onFocusOut=${()=>s(!1)}>
    <${Wo} label=${e} value=${t} sm=${!0}/>
    ${l&&g`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      <${M0} mcpDetail=${n}/>
    </div>`}
  </div>`}const C0=new Set(["cpu","mem_mb","tokens"]);function A0({snap:e,history:t,enabledTools:n=null}){const l=Hl(n),s=Me(()=>l&&e?{...e,...Xd(e)}:e,[l,e]),o=Me(()=>ef(t,n),[t,n]),[i,r]=Q(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),a=le(()=>{r(p=>{const v=!p;try{localStorage.setItem("aictl-header-expanded",String(v))}catch{}return v})},[]),c=p=>o!=null&&o.ts&&o.ts.length>=2&&(!l||C0.has(p))?[o.ts,o[p]]:null,h=(s==null?void 0:s.cpu_cores)||1,d={cores:h};return l&&!((s==null?void 0:s.tools)||[]).some(p=>p.tool!=="aictl")?g`<${S0} enabledTools=${n} snap=${s} what="the overview totals"/>`:g`
    <div class="grid-sparklines">
      ${Pl.sparklines.map(p=>{const v=s?s["total_"+p.field]??s[p.field]??"":"",$=co(v,p.format,p.suffix,p.multiply),A=p.yMaxExpr?yr(p.yMaxExpr,d):void 0,k=(p.refLines||[]).map(x=>({value:yr(x.valueExpr,d),label:(x.label||"").replace("{cores}",h)})).filter(x=>x.value!=null);return g`<${y0} key=${p.field} label=${p.label} value=${$}
          data=${c(p.field)} chartColor=${p.color||"var(--accent)"}
          smooth=${!!p.smooth} refLines=${k.length?k:void 0}
          yMax=${A} dp=${p.dp} iconName=${p.iconName}/>`})}
    </div>

    <div class=${i?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>
      <div class="mb-sm header-top-row">
        <div>
          <div class="metric-group-label">CPU Cores${l?" (whole machine, all tools)":""}</div>
          <${x0} perCore=${(s==null?void 0:s.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${Ta} snap=${s} mode="traffic"/></div>
        </div>
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${Pl.liveMetrics.map(p=>{const v=s?s[p.field]??"":"",$=co(v,p.format,p.suffix,p.multiply);return g`<${Wo} key=${p.field} label=${p.label} value=${$}
                accent=${!!p.accent} dp=${p.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div class="grid-inventory">
          ${Pl.inventory.map(p=>{const v=s?s[p.field]??"":"",$=co(v,p.format,p.suffix,p.multiply);return p.field==="total_mcp_servers"?g`<${E0} key=${p.field} label=${p.label} value=${$}
                mcpDetail=${(s==null?void 0:s.mcp_detail)||[]}/>`:g`<${Wo} key=${p.field} label=${p.label} value=${$}
              accent=${!!p.accent} dp=${p.dp} sm=${!0}/>`})}
        </div>
      </div>
      <div class="mb-sm"><${Ta} snap=${s} mode="files"/></div>
    </div>
    <button class="header-toggle" onClick=${a} aria-label="Toggle details"
      aria-expanded=${i}>
      <span aria-hidden="true">${i?"▲":"▼"}</span> ${i?"less":"more"}
    </button>
  `}const La={error:0,warn:1,info:2};function Da(e,t){if(e==="claude-code")return`aictl hooks install --port ${t}`;const n=["copilot","gemini","codex"].find(l=>String(e).startsWith(l));return`aictl enable${n?" --tool "+n:""} --port ${t}`}function Pa(e){return String(e||"").split("-")[0]}function T0(e,t,n=null){var i,r,a;if(!(e!=null&&e.tools))return[];const l=[],s=e.server_port,o=t?new Set([...t].map(Pa)):null;for(const c of Object.values(e.tools))if(Ht(c.tool,n)){if(c.status==="missing"){if(o&&!o.has(Pa(c.tool)))continue;const h=Da(c.tool,s);l.push({id:"hooks:"+c.tool,level:"warn",title:`${c.tool}: hooks not installed`,detail:"No per-tool-call events, so the tool, skill and subagent panels stay empty.",fix:h})}else if(c.status==="disabled"){const h=((i=(c.sources||[]).find(d=>d.host_reason&&!d.host_enabled))==null?void 0:i.host_reason)||"The host tool has hooks turned off.";l.push({id:"hooks:"+c.tool,level:"warn",title:`${c.tool}: hooks disabled by host`,detail:h,fix:h.startsWith("chat.hookFilesLocations")?`Set ${h.replace(/ is false$/,"")} to true in VS Code settings`:null})}else if(c.status==="misconfigured"||c.status==="fail"){const h=(r=c.warnings)==null?void 0:r[0],d=((a=c.warnings)==null?void 0:a.length)>1?`, +${c.warnings.length-1} more`:"";l.push({id:"hooks:"+c.tool,level:"error",title:`${c.tool}: hooks misconfigured`,detail:h?`${h.message} (${h.path}${d})`:"Hook checks failed.",fix:Da(c.tool,s)})}}return!Hl(n)&&e.total_configured>0&&e.total_fired_24h===0&&l.length===0&&l.push({id:"hooks:silent",level:"warn",title:`${e.total_configured} hooks configured, 0 fired in 24 h`,detail:"Hooks are installed but no event has reached this dashboard.",fix:null}),l}function L0(e){const t=[];for(const n of(e==null?void 0:e.items)||[])n.status==="ok"||n.severity==="info"||n.status!=="source_missing"&&t.push({id:"quality:"+n.component,level:n.severity==="error"?"error":"warn",title:`${n.component}: ${n.status}`,detail:n.message+(n.source?` (${n.source})`:""),fix:null});return t}function D0({connected:e,snapAgeS:t,hooks:n,quality:l,otelActive:s,alerts:o=[],storage:i=null,hiddenContext:r,runningTools:a=null,enabledTools:c=null}){const h=[];(r==null?void 0:r.count)>0?h.push({id:"hidden-context",level:"warn",tab:"hidden",title:`${r.count} unseen context source${r.count===1?"":"s"} found`,detail:r.detail||"Text reaches a model without appearing in its visible configuration.",fix:null}):r===null&&h.push({id:"hidden-context",level:"info",tab:"hidden",title:"Hidden context not checked",detail:"No detector has reported for this build.",fix:null}),i!=null&&i.degraded?h.push({id:"storage",level:"error",title:"Storage degraded: capture is being reduced",detail:`${ws(i)}. New data may lose text or be dropped until disk use is under budget.`,fix:null}):(i==null?void 0:i.pct)>=90&&h.push({id:"storage",level:"warn",title:`Storage at ${i.pct}% of budget`,detail:ws(i),fix:null}),e===!1?h.push({id:"sse",level:"error",title:"Live stream disconnected",detail:"Figures show the last received values. Retrying automatically.",fix:"aictl daemon serve"}):t!=null&&t>60&&h.push({id:"stale",level:"warn",title:`Snapshot is ${Math.round(t)} s old`,detail:"The stream is connected but the collector stopped publishing.",fix:"aictl doctor"});for(const d of o)h.push({id:"alert:"+d.msg,level:d.level==="red"?"error":"warn",title:d.msg,detail:"The Processes tab lists the affected PIDs.",fix:null,tab:"procs"});return h.push(...T0(n,a,c),...L0(l)),s===!1&&h.push({id:"otel",level:"info",title:"OTel receiver has no data",detail:"Exact token and cost figures need it. Estimates are used until then.",fix:"aictl otel enable"}),h.sort((d,p)=>La[d.level]-La[p.level])}function _i(e){var l;if(!e)return null;const t=e.storage_bytes??((l=e.db)==null?void 0:l.file_size_bytes)??null,n=e.storage_budget_bytes||null;return{mode:e.capture_mode||null,used:t,budget:n,pct:t!=null&&n?Math.round(t/n*100):null,degraded:!!e.storage_degraded}}function ws(e){if(!e||e.used==null)return"Disk use not reported";const t=Xt(e.used);return e.budget?`${t} of ${Xt(e.budget)} (${e.pct}%)`:`${t}, no budget set`}function P0(e,t){return((e==null?void 0:e.sessions)||[]).filter(l=>l.tool&&Ht(l.tool,t)).sort((l,s)=>(s.cpu_percent||0)-(l.cpu_percent||0)||(s.last_seen_at||0)-(l.last_seen_at||0))}function O0(e){return/^[^:]+:\d+:\d+$/.test((e==null?void 0:e.session_id)||"")}function R0(e){const t=e.filter(O0).length,n=e.length-t,l=new Set(e.map(r=>r.tool)).size,s=`process tree${t===1?"":"s"}`,o=`session${n===1?"":"s"}`;return`${t&&n?`${n} ${o} and ${t} ${s}`:t?s:o} in ${l} tool${l===1?"":"s"}`}function I0(e){let t=0;const n=l=>{for(const s of l||[])t+=s.mem_mb||0,n(s.children)};return n(e.process_tree),t}const wu="No price is known for this usage.";function qo(e,t=2){return"$"+Number(e).toLocaleString(void 0,{minimumFractionDigits:t,maximumFractionDigits:t})}function Oa(e){return Number(e).toLocaleString(void 0,{maximumFractionDigits:2})}function ku(e){return String(e||"").replace(/_/g," ").replace(/^ai\b/i,"AI")}function N0(e,t=2){const n=(e==null?void 0:e.cost_reason)||"";if(e!=null&&e.billing_unit&&e.billing_amount!==null&&e.billing_amount!==void 0){const l=[];return e.premium_requests&&l.push(Oa(e.premium_requests)+" premium requests"),e.estimated_list_usd!==null&&e.estimated_list_usd!==void 0&&l.push("est. "+qo(e.estimated_list_usd,t)+" at list price"),{main:Oa(e.billing_amount)+" "+ku(e.billing_unit),sub:l.join(", "),title:n,kind:"billing"}}return(e==null?void 0:e.cost_usd)===null||(e==null?void 0:e.cost_usd)===void 0?{main:"n/a",sub:"",title:n||wu,kind:"none"}:{main:qo(e.cost_usd,t),sub:"est.",title:n||"Estimated from token counts and list prices. Not a billed amount.",kind:"estimate"}}function z0({row:e,digits:t=2,showSub:n=!0}){const l=N0(e,t);return g`<span class=${"cost-value cost-value--"+l.kind} title=${l.title}>${l.main}${n&&l.sub?g` <small class="cost-value__sub">${l.sub}</small>`:null}</span>`}function V0(e,t){const n=((e==null?void 0:e.tools)||[]).filter(a=>Ht(a.tool,t)).filter(a=>a.counted_in_totals!==!1),l=new Map;let s=0,o=null,i=0;const r=new Set;for(const a of n){if(a.billing_unit&&a.billing_amount!==null&&a.billing_amount!==void 0){l.set(a.billing_unit,(l.get(a.billing_unit)||0)+a.billing_amount),s+=a.premium_requests||0;continue}if(a.cost_usd===null||a.cost_usd===void 0){i+=1,a.cost_reason&&r.add(a.cost_reason);continue}o=(o||0)+a.cost_usd}return{rows:n.slice().sort((a,c)=>(c.total_tokens||0)-(a.total_tokens||0)),billed:[...l.entries()].map(([a,c])=>({unit:a,amount:c})),premium:s,listUsd:o,unpriced:i,unpricedReason:[...r].join(" "),tokens:n.reduce((a,c)=>a+(c.total_tokens||0),0),sessions:n.reduce((a,c)=>a+(c.sessions||0),0)}}function Wv(e){var l;const t=(e||[]).filter(s=>s.cost_usd!==null&&s.cost_usd!==void 0);if(!t.length)return{cost_usd:null,cost_reason:(l=e==null?void 0:e.find(s=>s.cost_reason))==null?void 0:l.cost_reason};const n=e.length-t.length;return{cost_usd:t.reduce((s,o)=>s+o.cost_usd,0),cost_reason:n?`${n} of ${e.length} rows have no known price and are not included.`:""}}function F0(e){return Array.isArray(e==null?void 0:e.tools)&&e.tools.length?e.tools:e!=null&&e.tool?[e.tool]:[]}function U0(e,t){const n=F0(e);return!n.length||n.some(l=>Ht(l,t))}function H0(e,t){if(!e||!Hl(t))return e;const n=c=>Ht(c==null?void 0:c.tool,t),l=(e.sources||[]).filter(n),s=(e.findings||[]).filter(c=>U0(c,t)),o={high:0,medium:0,low:0,info:0};for(const c of s)c.severity in o&&(o[c.severity]+=1);const i=Object.fromEntries(Object.entries(e.sources_per_tool||{}).filter(([c])=>Ht(c,t))),r=e.drift&&!e.drift.baseline_created?{...e.drift,new:(e.drift.new||[]).filter(n),changed:(e.drift.changed||[]).filter(n),removed:(e.drift.removed||[]).filter(n)}:e.drift,a=e.effective_models?Object.fromEntries(Object.entries(e.effective_models).filter(([c,h])=>Ht((h==null?void 0:h.tool)||c,t))):e.effective_models;return{...e,sources:l,findings:s,counts:o,sources_per_tool:i,drift:r,effective_models:a,unattributed:(e.unattributed||[]).filter(n)}}const ks=Object.assign({"./HiddenContextPanel.js":()=>ft(()=>import("./HiddenContextPanel-BTMLx_CF.js"),__vite__mapDeps([0,1]))})["./HiddenContextPanel.js"],Ra=ks?pt(ks):null;async function j0(e=null){if(!ks)return null;const t=await ks();if(t.getHiddenContextSummary)return t.getHiddenContextSummary(e);try{return B0(H0(await ie("/api/context-audit"),e))}catch{return null}}function B0(e){if(!(e!=null&&e.counts))return null;const t=["high","medium","low"].filter(n=>e.counts[n]).map(n=>`${e.counts[n]} ${n}`);return{count:["high","medium","low"].reduce((n,l)=>n+(e.counts[l]||0),0),detail:t.length?`Findings by severity: ${t.join(", ")}.`:""}}function W0(){return Ra?g`<${Dn} fallback=${g`<${_n} status="loading" label="hidden context"/>`}>
    <${Ra}/>
  </${Dn}>`:g`<section class="now-panel" data-slot="hidden-context" aria-label="Hidden context">
      <${_n} status="empty" emptyTitle="Hidden context detection is not in this build"
        emptyHint="This view lists prompts and context sources that reach a model without appearing in its visible configuration. Rebuild the dashboard once the detector ships."/>
    </section>`}const Ia=8;function q0({snap:e,enabledTools:t,onOpenSession:n,onShowAll:l}){const s=Me(()=>P0(e,t),[e,t]);return g`<section class="now-panel now-panel--running" aria-labelledby="now-running">
    <header class="now-panel__head">
      <h2 id="now-running">Running now</h2>
      ${!il(e,t)&&g`<span class="now-panel__figure">${s.length}</span>
      <span class="now-panel__sub">${R0(s)}</span>`}
    </header>
    ${s.length===0?g`<${_n} status="empty" label="running sessions"
          emptyTitle=${il(e,t)?"Not available from this machine":t?"No sessions for the selected tools":"No live sessions"}
          emptyHint=${il(e,t)?"The selected tool runs in the vendor's cloud and has no local sessions.":t?"Widen the tool filter, or start a session in one of the selected tools.":"Start an AI coding tool. Sessions appear here within one sample interval."}/>`:g`<div class="now-table-wrap"><table class="now-table">
          <thead><tr>
            <th scope="col">Tool</th><th scope="col">Project</th>
            <th scope="col" class="num">Age</th><th scope="col" class="num">CPU</th>
            <th scope="col" class="num">RAM</th><th scope="col" class="num">Tokens</th>
          </tr></thead>
          <tbody>
            ${s.slice(0,Ia).map(o=>{const i=(o.exact_input_tokens||0)+(o.exact_output_tokens||0),r=I0(o);return g`<tr key=${o.session_id}>
                <td class="now-table__tool"><${Cs} tool=${o.tool} size="1em"/> ${o.label||dl(o.tool,e)}</td>
                <td class="now-table__project">
                  <button type="button" class="now-link" title=${(o.project||"no project")+`
`+o.session_id}
                    onClick=${()=>n(o.session_id,o.tool)}>${ic(o.project)||"no project"}</button>
                </td>
                <td class="num">${Qo(o.duration_s||0)}</td>
                <td class="num">${ul(o.cpu_percent||0)}</td>
                <td class="num">${r?Xt(r*1048576):"-"}</td>
                <td class="num" title=${i?i.toLocaleString()+" exact tokens":"No exact token data for this session"}>${i?vt(i):"-"}</td>
              </tr>`})}
          </tbody>
        </table></div>
        ${s.length>Ia&&g`<button type="button" class="now-link now-panel__more" onClick=${l}>
          Show all ${s.length} sessions</button>`}`}
  </section>`}function K0({onOpenBudget:e,cloudScope:t,enabledTools:n,snap:l}){const s=ll(()=>Ed({since:Date.now()/1e3-86400}),[],{pollMs:6e4}),o=Me(()=>V0(s.data,n),[s.data,n]),i=w0({...s,data:s.data?o.rows:null,isEmpty:a=>!a.length});if(t)return g`<section class="now-panel" aria-labelledby="now-cost">
      <header class="now-panel__head"><h2 id="now-cost">Cost, last 24 h</h2></header>
      <${_n} status="empty" emptyTitle="Not available from this machine"
        emptyHint="The selected tool is billed and metered in the vendor's cloud, so no local token counts exist to estimate from."/>
    </section>`;const r=o.billed.length>0||o.listUsd!==null;return g`<section class="now-panel" aria-labelledby="now-cost">
    <header class="now-panel__head">
      <h2 id="now-cost">Cost, last 24 h</h2>
      ${s.data&&o.billed.map(a=>g`<span key=${a.unit} class="now-panel__figure">${a.amount.toLocaleString(void 0,{maximumFractionDigits:2})}<small class="now-panel__unit"> ${ku(a.unit)}</small></span>`)}
      ${s.data&&o.listUsd!==null&&g`<span class="now-panel__figure" title=${If}>${qo(o.listUsd)}<small class="now-panel__unit"> est.</small></span>`}
      ${s.data&&!r&&o.rows.length>0&&g`<span class="now-panel__figure" title=${o.unpricedReason||wu}>n/a</span>`}
    </header>
    <${_n} status=${i} error=${s.error} updatedAt=${s.updatedAt} onRetry=${s.reload}
      label="cost" emptyTitle=${n?"No recorded usage for the selected tools in the last 24 h":"No recorded usage in the last 24 h"}
      emptyHint="Usage comes from per-request telemetry. Turn on the OTel receiver if a tool is running but nothing shows."
      emptyFix="aictl otel enable">
      <div class="now-panel__sub">${vt(o.tokens)} tokens, ${o.sessions} sessions${o.listUsd!==null?". Dollar figures are list-price estimates, not billed amounts.":""}${o.unpriced?` ${o.unpriced} tool${o.unpriced===1?" has":"s have"} no known price.`:""}</div>
      <table class="now-table now-table--plain">
        <tbody>${o.rows.slice(0,5).map(a=>g`<tr key=${a.tool}>
          <td class="now-table__project" title=${(a.tokens_source||[]).length?"Tokens from "+a.tokens_source.join(", ")+(a.tokens_quality?" ("+a.tokens_quality+")":""):a.tokens_reason||""}><${Cs} tool=${a.tool} size="1em"/> ${dl(a.tool,l)}</td>
          <td class="num">${vt(a.total_tokens||0)}</td>
          <td class="num"><${z0} row=${a}/></td>
        </tr>`)}</tbody>
      </table>
      <button type="button" class="now-link now-panel__more" onClick=${e}>Open budget</button>
    </${_n}>
  </section>`}function G0({command:e}){const[t,n]=Q(!1);if(!e)return null;const l=e.startsWith("aictl ");return g`<div class="now-issue__fix">
    <code>${e}</code>
    ${l&&g`<button type="button" class="now-link" onClick=${()=>{var o;try{(o=navigator.clipboard)==null||o.writeText(e),n(!0),setTimeout(()=>n(!1),1500)}catch{}}}
      aria-label=${"Copy command: "+e}>${t?"Copied":"Copy"}</button>`}
  </div>`}function Y0({selfStatus:e}){const t=_i(e);return t?g`<div class=${"now-storage"+(t.degraded?" is-degraded":"")}>
    <span>Capture <strong>${t.mode||"not reported"}</strong></span>
    <span>Disk <strong>${ws(t)}</strong></span>
    ${t.pct!=null&&g`<div class="now-storage__bar" role="meter" aria-label="Disk use against budget"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.min(t.pct,100)}>
      <span class=${t.pct>=90?"is-high":""} style=${{width:Math.min(t.pct,100)+"%"}}></span>
    </div>`}
  </div>`:null}function J0({models:e}){const t=Object.values(e&&!e.error?e:{}).filter(l=>{var s;return l.value||((s=l.conflicts)==null?void 0:s.length)});if(!t.length)return null;const n=new Map;for(const l of t){const s=JSON.stringify([l.value,l.source,l.line,l.conflicts]);n.has(s)?n.get(s).labels.push(dl(l.tool)):n.set(s,{...l,labels:[dl(l.tool)]})}return g`<div class="now-models" data-testid="now-models">
    ${[...n.values()].map(l=>g`<div key=${l.tool} class="now-models__row">
      <span>${l.labels.join(", ")} model <strong>${l.value||"no pin"}</strong></span>
      ${l.source&&g`<span class="now-models__source" title=${l.why_in_effect}>
        ${l.line?`${l.source}:${l.line}`:l.source}${l.in_project?"":" (not in this project, still in effect)"}
      </span>`}
      ${(l.conflicts||[]).map(s=>g`<span key=${s.requested_at} class="now-models__conflict" data-testid="now-model-conflict">
        Conflict: ${s.requested.join(", ")} requested at ${s.requested_at}, ${s.pinned} is pinned
      </span>`)}
    </div>`)}
  </div>`}function Z0({snap:e,enabledTools:t,connected:n,otelActive:l,alerts:s,selfStatus:o,onOpenTab:i}){const r=ll(()=>Ld(),[],{pollMs:6e4}),a=ll(()=>Dd(),[],{pollMs:6e4}),c=ll(()=>uc(),[],{pollMs:6e4}),h=ll(()=>j0(t),[t],{pollMs:6e4}),d=e!=null&&e.timestamp?Date.now()/1e3-e.timestamp:null,p=Me(()=>_i(o),[o]),v=h.updatedAt?h.data:void 0,$=Me(()=>new Set(((e==null?void 0:e.sessions)||[]).map(M=>M.tool)),[e]),A=Me(()=>D0({connected:n,snapAgeS:d,hooks:a.data,quality:c.data,otelActive:l,alerts:s,storage:p,runningTools:$,hiddenContext:v,enabledTools:t}),[n,d,a.data,c.data,l,s,p,$,v,t]),k=A.filter(M=>M.level==="error").length,x=A.filter(M=>M.level==="warn").length,b=a.loading&&!a.data&&c.loading&&!c.data,E=b?"...":k+x;return g`<section class="now-panel now-panel--health" aria-labelledby="now-health">
    <header class="now-panel__head">
      <h2 id="now-health">Needs attention</h2>
      <span class=${"now-panel__figure"+(k?" is-error":x?" is-warn":" is-ok")}>${E}</span>
      <span class="now-panel__sub">${k} error${k===1?"":"s"}, ${x} warning${x===1?"":"s"}</span>
    </header>
    <${Y0} selfStatus=${o}/>
    <${J0} models=${r.data}/>
    ${a.error&&!a.data&&g`<${_n} status="error" error=${a.error}
      onRetry=${a.reload} label="hook status"/>`}
    ${A.length===0&&!b&&!a.error?g`<${_n} status="empty" emptyTitle="All collectors and hooks are healthy"
          emptyHint="Hook delivery, data quality and the live stream all report OK."/>`:g`<ul class="now-issues">
          ${A.slice(0,7).map(M=>g`<li key=${M.id} class=${"now-issue now-issue--"+M.level}>
            <span class="now-issue__level">${M.level==="error"?"Error":M.level==="warn"?"Warn":"Info"}</span>
            <div class="now-issue__body">
              <div class="now-issue__title">${M.tab?g`<button type="button" class="now-link" onClick=${()=>i(M.tab)}>${M.title}</button>`:M.title}</div>
              <div class="now-issue__detail">${M.detail}</div>
              <${G0} command=${M.fix}/>
            </div>
          </li>`)}
          ${A.length>7&&g`<li class="now-panel__sub">${A.length-7} more in Monitoring health below.</li>`}
        </ul>`}
  </section>`}function Q0({snap:e,enabledTools:t,connected:n,otelActive:l,alerts:s,selfStatus:o,onOpenSession:i,onOpenTab:r}){return g`<div class="now-grid">
    <${q0} snap=${e} enabledTools=${t}
      onOpenSession=${i} onShowAll=${()=>r("live")}/>
    <${K0} onOpenBudget=${()=>r("budget")} cloudScope=${il(e,t)} enabledTools=${t} snap=${e}/>
    <${Z0} snap=${e} enabledTools=${t} connected=${n} otelActive=${l}
      alerts=${s} selfStatus=${o} onOpenTab=${r}/>
  </div>`}function as(e){const t=new Date(e*1e3),n=t.getTimezoneOffset();return new Date(t.getTime()-n*6e4).toISOString().slice(0,16)}function X0({globalRange:e,onPreset:t,onApplyCustom:n}){const[l,s]=Q(!1),[o,i]=Q(""),r=ee(null),a=ee(null),c=le(()=>{s(!0),i(""),requestAnimationFrame(()=>{if(!(!r.current||!a.current))if(e.until!=null)r.current.value=as(e.since),a.current.value=as(e.until);else{const d=Fl.find($=>$.id===e.id),p=Date.now()/1e3,v=(d==null?void 0:d.seconds)||86400;r.current.value=as(p-v),a.current.value=as(p)}})},[e]),h=le(()=>{var A,k;const d=(A=r.current)==null?void 0:A.value,p=(k=a.current)==null?void 0:k.value;if(!d||!p){i("Enter both a start and an end time.");return}const v=new Date(d).getTime()/1e3,$=new Date(p).getTime()/1e3;if(!Number.isFinite(v)||!Number.isFinite($)){i("Invalid date/time value.");return}if($<=v){i("End time must be after start time.");return}i(""),n(v,$),s(!1)},[n]);return g`<div class="global-range-bar">
    <div class="range-bar" role="group" aria-label="Time range">
      ${Fl.map(d=>g`<button key=${d.id}
        class=${e.id===d.id&&!l?"range-btn active":"range-btn"}
        aria-pressed=${e.id===d.id&&!l?"true":"false"}
        onClick=${()=>{t(d.id),s(!1),i("")}}>${d.label}</button>`)}
      <button class=${l||e.id==="custom"?"range-btn active":"range-btn"}
        onClick=${c}>Custom</button>
    </div>
    ${l&&g`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${r} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${a} /></label>
      <button class="range-btn active" onClick=${h} style="font-weight:600">Apply</button>
      <span class="error-state" aria-live="polite"
        style="padding:0 var(--sp-2);font-size:var(--fs-xs)">${o}</span>
    </div>`}
  </div>`}function e_(e,t){const n=e.filter(s=>ql.has(s.tool));if(t==null)return`All tools (${n.length})`;const l=n.filter(s=>t.includes(s.tool)).map(s=>s.label);return l.length===0?"No tools":l.length<=2?l.join(", "):`${l[0]} +${l.length-1}`}function t_({snap:e,enabledTools:t,onToggle:n,onSetAll:l}){if(!e)return null;const s=Ec(e.tools.filter(a=>!a.meta));if(!s.length)return null;const o=t===null,i=e_(s,t),r=g`<button type="button" class=${"hdr-btn tool-filter-trigger"+(o?"":" is-filtered")}
    aria-label=${"Tool filter: "+i}>
    <${jt} name="filter" size="12"/> ${i}
  </button>`;return g`<${gs} trigger=${r} placement="bottom">
    <div class="tool-filter-bar" role="group" aria-label="Filter every panel by tool">
      <label class="tool-filter-item">
        <input type="checkbox" checked=${o}
          onChange=${()=>l(o?[]:null)} />
        <span>All tools</span>
      </label>
      <hr class="hdr-views-sep"/>
      ${s.map(a=>{const c=ql.has(a.tool),h=t===null||t.includes(a.tool);return g`<label key=${a.tool}
          class=${"tool-filter-item"+(c?"":" tool-unverified")}
          title=${c?"":"Discovery only: this tool is not verified yet, so it cannot be filtered"}>
          <input type="checkbox" checked=${h} disabled=${!c}
            onChange=${()=>c&&n(a.tool)} />
          <${Cs} tool=${a.tool} size="1em"/>
          <span>${a.label}</span>
        </label>`})}
    </div>
  </${gs}>`}const n_=30;function l_({timestamp:e}){const[,t]=Q(0);if(ce(()=>{const s=setInterval(()=>t(o=>o+1),5e3);return()=>clearInterval(s)},[]),!e)return null;const n=Math.max(0,Math.floor(Date.now()/1e3-e)),l=n>n_;return g`<span class=${"conn "+(l?"stale":"ok")} role="status" aria-live="polite"
    title=${"Last data snapshot received "+n+"s ago"+(l?" — the refresh loop may be stalled":"")}>
    ● ${l?"stale "+n+"s":n+"s"}
    <span class="sr-only">${l?" — data is stale":" — data age"}</span>
  </span>`}function s_({selfStatus:e}){const t=_i(e);if(!t||t.used==null&&!t.mode)return null;const n=t.degraded?"err":t.pct>=90?"stale":"off";return g`<span class=${"conn hdr-desktop-only "+n} title=${"Disk: "+ws(t)}>
    ${t.mode?"capture="+t.mode+" ":""}${t.used!=null?Xt(t.used):""}${t.budget?" / "+Xt(t.budget):""}
  </span>`}function o_({searchRef:e,searchQuery:t,onSearchChange:n,theme:l,cycleTheme:s,density:o,setDensity:i,otelActive:r,connected:a,selfStatus:c,globalRange:h,onPreset:d,onApplyCustom:p,snap:v,enabledTools:$,onToggleTool:A,onSetAllTools:k,views:x=[],matchingView:b=null,onApplyView:E,onDeleteView:M,onSaveView:S,onOpenPalette:T}){const[L,D]=Q(!1),[N,I]=Q(!1),[O,Y]=Q(""),H=le(()=>{const W=O.trim();W&&(S&&S(W),Y(""),I(!1))},[O,S]),G=[{value:"compact",label:"Compact"},{value:"normal",label:"Normal"},{value:"spacious",label:"Spacious"}],j=g`<button class="hdr-btn" type="button"
    aria-label="Saved views" title="Saved views">
    Views${b?": "+b.name:""} ▾
  </button>`;return g`<header role="banner">
    <h1>aictl</h1>
    <div class="hdr-scope" role="group" aria-label="Scope for every panel">
      <${X0} globalRange=${h}
        onPreset=${d} onApplyCustom=${p}/>
      <${t_} snap=${v} enabledTools=${$}
        onToggle=${A} onSetAll=${k}/>
    </div>
    <div class="hdr-right">
      <!-- Mobile overflow toggle -->
      <button class="hdr-btn hdr-mobile-only" type="button" aria-label="Menu"
        aria-expanded=${L?"true":"false"}
        onClick=${()=>D(W=>!W)}>
        <${gp} size="16" aria-hidden="true"/>
      </button>

      <input type="text" ref=${e} class="search-box hdr-desktop-only"
        placeholder="Filter... ( / )" aria-label="Filter tools"
        value=${t} onInput=${W=>n(W.target.value)}/>

      <!-- Command palette trigger -->
      <button class="hdr-cmdk" type="button"
        onClick=${T}>
        <${sp} size="14" aria-hidden="true"/>
        <span class="hdr-desktop-only">Commands</span>
        <${ot} class="hdr-desktop-only" aria-hidden="true">${Ac()}</${ot}>
        <span class="sr-only">open command palette</span>
      </button>

      <!-- Views dropdown -->
      <${gs} trigger=${j} placement="bottom" class="hdr-desktop-only">
        <div class="hdr-views-menu" role="group" aria-label="Saved views">
          ${x.length===0?g`<div class="hdr-views-empty text-muted">No saved views</div>`:x.map(W=>g`<div key=${W.id} class="hdr-views-row">
                <button class="hdr-views-apply" type="button"
                  onClick=${()=>E&&E(W.id)}
                  aria-label=${"Apply view "+W.name}>${W.name}</button>
                <button class="hdr-views-del" type="button"
                  aria-label=${"Delete view "+W.name}
                  onClick=${()=>M&&M(W.id)}>
                  <${Tp} size="12" aria-hidden="true"/>
                </button>
              </div>`)}
          <hr class="hdr-views-sep"/>
          <${hn} variant="ghost" size="sm"
            onClick=${()=>I(!0)}>
            <${Mp} size="12" aria-hidden="true"/> Save current view…
          </${hn}>
        </div>
      </${gs}>

      <!-- Theme toggle -->
      <button class="theme-btn" type="button" onClick=${s}
        aria-label=${"Toggle theme: "+l} title=${"Theme: "+l}>
        <${jt} name=${l==="light"?"sun":l==="editorial"?"pen":"moon"} size="16"/>
      </button>

      ${r?g`<span class="conn ok" title="OTel receiver active">OTel</span>`:g`<span class="conn off" title="OTel receiver inactive — enable with: aictl otel enable">OTel off</span>`}
      <${s_} selfStatus=${c}/>
      <${l_} timestamp=${v==null?void 0:v.timestamp}/>
      <span class=${"conn "+(a?"ok":"err")} role="status" aria-live="polite">
        ${a?"live":"reconnecting..."}
        <span class="sr-only">${a?" — connected":" — connection lost, reconnecting"}</span>
      </span>
    </div>

    ${L&&g`<div class="hdr-mobile-overflow hdr-mobile-only">
      <input type="text" class="search-box" placeholder="Filter..."
        aria-label="Filter tools"
        value=${t} onInput=${W=>n(W.target.value)}/>
      <${oh}
        ariaLabel="Density"
        value=${o}
        options=${G}
        onChange=${i}/>
    </div>`}

    ${N&&g`<${fl} open=${!0}
      onClose=${()=>I(!1)} ariaLabel="Save view">
      <h3 style="margin-bottom:var(--sp-5)">Save current view</h3>
      <input type="text" class="search-box" style="width:100%"
        placeholder="View name" value=${O}
        onInput=${W=>Y(W.target.value)}
        onKeyDown=${W=>W.key==="Enter"&&H()}
        autoFocus=${!0}/>
      <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-6);justify-content:flex-end">
        <${hn} variant="ghost" onClick=${()=>I(!1)}>Cancel</${hn}>
        <${hn} variant="primary" onClick=${H}>Save</${hn}>
      </div>
    </${fl}>`}
  </header>`}const Na=[{id:"overview",label:"Dashboard",sub:"live event stream"},{id:"explorer",label:"Sessions",sub:"history & traces"},{id:"agents",label:"Agents",sub:"instrumentation"},{id:"prompts",label:"Prompts",sub:"library & workflows"}];function i_(){const e=new Date,t=String(e.getMonth()+1).padStart(2,"0"),n=e.toLocaleDateString("en-CA");return`The aictl daily · vol. ${t} · ${n}`}function r_({activeTab:e,setActiveTab:t}){const n=xs(zl),l=n==null?void 0:n.snap,s=Me(()=>{var a;let r=0;for(const c of(l==null?void 0:l.tools)||[])for(const h of((a=c.live)==null?void 0:a.sessions)||[])h.active!==!1&&r++;return r},[l]),o=Na.find(r=>r.id===e),i=s>0?`Live · ${s} session${s!==1?"s":""}`:"Live";return g`<div class="cmasthead">
    <div class="cmasthead-top">
      <div class="cmasthead-identity">
        <div class="cmasthead-kicker">${i_()}</div>
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
      ${Na.map(r=>g`<button
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
  </div>`}function a_({tabs:e,activeTab:t,setActiveTab:n}){const l=ee(null);return ce(()=>{var o,i;const s=(o=l.current)==null?void 0:o.querySelector('[aria-current="page"]');(i=s==null?void 0:s.scrollIntoView)==null||i.call(s,{block:"nearest",inline:"nearest"})},[t]),g`<nav class="tab-nav" ref=${l} aria-label="Dashboard sections">
    ${Pl.navGroups.map(s=>g`<div key=${s.id} class="tab-group" role="group" aria-labelledby=${"nav-"+s.id}>
      <div class="tab-group__label" id=${"nav-"+s.id}>${s.label}</div>
      ${e.filter(o=>o.group===s.id).map(o=>g`<button key=${o.id} type="button" class="tab-btn"
        aria-current=${t===o.id?"page":null}
        aria-keyshortcuts=${o.key||null}
        onClick=${()=>n(o.id)}>
        <span class="tab-btn-icon"><${jt} name=${o.iconName} size="14"/></span>
        <span class="tab-btn__label">${o.label}</span>
        ${o.key&&g`<kbd class="tab-btn__key" aria-hidden="true">${o.key}</kbd>`}
      </button>`)}
    </div>`)}
  </nav>`}function c_(e,t){if(!t)return 1;const n=t.toLowerCase(),l=(e.label||"").toLowerCase(),s=(e.group||"").toLowerCase();if(l.startsWith(n))return 1e3-l.length;if(l.includes(n))return 500-l.indexOf(n);if(s.startsWith(n))return 300;if(s.includes(n))return 150;let o=0;for(const i of l)if(i===n[o]&&o++,o===n.length)break;return o===n.length?50:0}function u_({commands:e=[],isOpen:t,onClose:n,lru:l=[],onRun:s}){const[o,i]=Q(""),[r,a]=Q(0),c=ee(null),h=ee(null);ce(()=>{t&&(i(""),a(0))},[t]),ce(()=>{t&&c.current&&c.current.focus()},[t]);const d=Me(()=>{if(!o){const k=new Map(e.map(E=>[E.id,E])),x=l.map(E=>k.get(E)).filter(Boolean),b=e.filter(E=>!l.includes(E.id));return[...x,...b]}return e.map(k=>({c:k,s:c_(k,o)})).filter(k=>k.s>0).sort((k,x)=>x.s-k.s).map(k=>k.c)},[e,o,l]);ce(()=>{a(0)},[o]);const p=le(k=>{if(k){s&&s(k);try{k.action&&k.action()}catch(x){console.error("Command failed:",x)}n&&n()}},[s,n]),v=le(k=>{k.key==="ArrowDown"?(k.preventDefault(),a(x=>Math.min(x+1,d.length-1))):k.key==="ArrowUp"?(k.preventDefault(),a(x=>Math.max(x-1,0))):k.key==="Enter"&&(k.preventDefault(),p(d[r]))},[d,r,p]);ce(()=>{if(!h.current)return;const k=h.current.querySelector(`[data-cmd-idx="${r}"]`);k&&k.scrollIntoView&&k.scrollIntoView({block:"nearest"})},[r]);const $=Me(()=>{const k=[],x=new Map;return d.forEach(b=>{const E=b.group||"Commands";x.has(E)||(x.set(E,k.length),k.push({group:E,items:[]})),k[x.get(E)].items.push(b)}),k},[d]);let A=-1;return g`<${fl} open=${t} onClose=${n} ariaLabel="Command palette" class="cmdk-dialog">
    <div class="cmdk">
      <div class="cmdk-input-row">
        <${Lc} size="16" aria-hidden="true"/>
        <input
          ref=${c}
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
      <div id="cmdk-list" class="cmdk-list" role="listbox" ref=${h}>
        ${d.length===0?g`<${Pc} icon="search" title="No commands"
              description=${o?'No commands match "'+o+'"':"Start typing…"}/>`:$.map(k=>g`<div key=${k.group} class="cmdk-group" role="group" aria-label=${k.group}>
              <div class="cmdk-group-label" aria-hidden="true">${k.group}</div>
              ${k.items.map(x=>{A+=1;const b=A,E=b===r;return g`<button key=${x.id}
                  type="button"
                  id=${"cmdk-opt-"+b}
                  class=${"cmdk-item"+(E?" cmdk-item--active":"")}
                  role="option"
                  aria-selected=${E?"true":"false"}
                  data-cmd-idx=${b}
                  onMouseEnter=${()=>a(b)}
                  onClick=${()=>p(x)}
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
  </${fl}>`}function d_({target:e="#main-content",label:t="Skip to main content"}){return g`<a href=${e} class="skip-link">${t}</a>`}function wo(e,t){try{const n=localStorage.getItem("aictl-pref-"+e);return n!=null?JSON.parse(n):t}catch{return t}}const f_={live:3600,"1h":3600,"6h":21600,"24h":86400,"7d":604800};wo("active_tab","overview"),(()=>{const e=wo("range","live"),t=f_[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),wo("tool_filter",null);const p_=pt(()=>ft(()=>import("./TabOverview-Cx6G2Z6P.js"),[])),h_=pt(()=>ft(()=>import("./TabMemory-D3GgF8MQ.js"),[])),m_=pt(()=>ft(()=>import("./ContextMap-DTo3kLN6.js"),[])),__=pt(()=>ft(()=>import("./TabLive-WItQBRFO.js"),__vite__mapDeps([2,3]))),v_=pt(()=>ft(()=>import("./TabEventsStats-DF0REBAI.js"),[])),g_=pt(()=>ft(()=>import("./TabBudget-Cg33L19c.js"),__vite__mapDeps([4,3,5]))),y_=pt(()=>ft(()=>import("./TabAnalytics-_w_ot4HM.js"),__vite__mapDeps([6,7]))),b_=pt(()=>ft(()=>import("./TabExplorer-CKHFLNY0.js"),__vite__mapDeps([8,1,5]))),$_=pt(()=>ft(()=>import("./TabToolConfig-BnckxnLg.js"),[])),w_=pt(()=>ft(()=>import("./TabProjectEnv-DwF55MV5.js"),[])),k_=pt(()=>ft(()=>import("./CAgentsTab-ne8APtb3.js"),[])),S_=pt(()=>ft(()=>import("./CDashboardTab-CvAcFhaN.js"),[])),x_=pt(()=>ft(()=>import("./CPromptsTab-3OcyzYp-.js"),[])),M_=pt(()=>ft(()=>import("./CSessionsTab-UtERgo9T.js"),[])),E_=new Set(["live","procs","events","explorer","budget","analytics","memory"]),C_=()=>g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading view">
  <${rl} height="120px" radius="var(--radius-sm)"/>
  <${rl} height="200px" radius="var(--radius-sm)"/>
</div>`,be=({tabName:e,children:t})=>g`<${jr} key=${e}><${Dn} fallback=${g`<${C_}/>`}>${t}</${Dn}></${jr}>`;function A_(e,t){const n=ee({});ce(()=>{const l=t.current;if(!l)return;const s=n.current[e]||0;l.scrollTop=s;let o=!1;const i=s?[150,500,1200].map(c=>setTimeout(()=>{o||(l.scrollTop=s)},c)):[],r=()=>{o=!0},a=()=>{n.current[e]=l.scrollTop};return l.addEventListener("wheel",r,{passive:!0,once:!0}),l.addEventListener("touchstart",r,{passive:!0,once:!0}),l.addEventListener("scroll",a,{passive:!0}),()=>{i.forEach(clearTimeout),l.removeEventListener("wheel",r),l.removeEventListener("touchstart",r),l.removeEventListener("scroll",a)}},[e,t])}function T_(e,t){ce(()=>{const n=l=>{var s;l.key==="Escape"&&t(null),l.key==="/"&&!ti(l.target)&&(l.preventDefault(),(s=e.current)==null||s.focus())};return document.addEventListener("keydown",n),()=>document.removeEventListener("keydown",n)},[e,t])}function L_(){const[e,t]=Q(!1);return ce(()=>{let n=!0;const l=()=>ac().then(o=>{n&&t(o.active||!1)}).catch(()=>{n&&t(!1)});l();const s=setInterval(l,3e4);return()=>{n=!1,clearInterval(s)}},[]),e}function D_(e){const[t,n]=Q(null),[l,s]=Q([]);return ce(()=>{const{id:o,since:i,until:r}=e;o==="live"?n(null):o!=="custom"?Co({range:o}).then(n).catch(()=>{}):Co({since:i,until:r}).then(n).catch(()=>{}),Md({since:i,until:r}).then(s).catch(()=>{})},[e]),{dbHistory:t,events:l}}function P_(e){const t=ee(!1),n=ee(e);ce(()=>{if(e&&!t.current){t.current=!0,n.current=e;return}e!==n.current&&(e?(Oo.success("Reconnected"),Dr("Connection restored")):t.current&&(Oo.error("Disconnected. Retrying…"),Dr("Connection lost, retrying","assertive")),n.current=e)},[e])}function O_(e){var i;if(!e)return[];const t=[];let n=0,l=0,s=0,o=0;for(const r of e.tools||[])for(const a of r.processes||[]){const c=parseFloat(a.mem_mb)||0,h=(a.process_type||"").toLowerCase();(h==="subagent"||h==="agent")&&(n+=c),h==="mcp-server"&&a.zombie_risk&&a.zombie_risk!=="none"&&l++,(h==="browser"||(a.name||"").toLowerCase().includes("headless"))&&s++,(i=a.anomalies)!=null&&i.length&&(o+=a.anomalies.length)}return n>2048&&t.push({level:"red",msg:`Subagent memory: ${Xt(n*1048576)} (>2GB) — consider cleanup`}),l>0&&t.push({level:"orange",msg:`${l} MCP server(s) with dead parent — may be orphaned`}),s>0&&t.push({level:"yellow",msg:`${s} headless browser process(es) detected — check for leaks`}),o>5&&t.push({level:"orange",msg:`${o} process anomalies detected`}),t}function cs(e,t){return Kp(e,t)}function R_(e,t,n){if(!e)return e;let l=e.tools.filter(s=>ql.has(s.tool)||s.tool==="aictl");if(l=l.filter(s=>Ht(s.tool,t)),n){const s=n.toLowerCase();l=l.filter(o=>o.label.toLowerCase().includes(s)||o.tool.toLowerCase().includes(s)||o.vendor&&o.vendor.toLowerCase().includes(s)||(o.files||[]).some(i=>i.path.toLowerCase().includes(s))||(o.processes||[]).some(i=>(i.name||"").toLowerCase().includes(s)||(i.cmdline||"").toLowerCase().includes(s))||o.live&&((o.live.workspaces||[]).some(i=>i.toLowerCase().includes(s))||(o.live.sources||[]).some(i=>i.toLowerCase().includes(s))))}return{...e,tools:Ec(l),sessions:cs(e.sessions,t),tool_telemetry:cs(e.tool_telemetry,t),tool_configs:Array.isArray(e.tool_configs)?e.tool_configs.filter(s=>qp(s,t)):e.tool_configs,mcp_detail:cs(e.mcp_detail,t),events:cs(e.events,t),agent_memory:Array.isArray(e.agent_memory)&&Hl(t)?e.agent_memory.filter(s=>Xp(s,t)):e.agent_memory,filter_hidden_unlisted:Hl(t)?El(e.sessions)+El(e.tool_telemetry)+El(e.tool_configs)+El(e.mcp_detail)+El(e.events):0}}function vi(e,t){try{document.dispatchEvent(new CustomEvent("aictl:select-session",{detail:{sessionId:e,tool:t}}))}catch{}}function I_({tabs:e,setActiveTab:t,setPreset:n,presets:l,allTools:s,toggleTool:o,setTheme:i,setDensity:r,views:a,applyView:c,snap:h,onShowShortcuts:d}){const p=[];e.forEach(v=>p.push({id:"tab:"+v.id,group:"Jump to tab",label:v.label,shortcut:v.key,action:()=>t(v.id)})),l.forEach(v=>p.push({id:"range:"+v.id,group:"Range",label:"Set range: "+v.label,action:()=>n(v.id)})),(s||[]).forEach(v=>p.push({id:"filter:"+v,group:"Filter",label:"Toggle tool: "+v,action:()=>o(v)}));for(const v of((h==null?void 0:h.sessions)||[]).slice(0,40)){if(!v.session_id)continue;const $=ic(v.project)||"no project";p.push({id:"session:"+v.session_id,group:"Session",label:"Open session: "+$+" ("+(v.label||v.tool)+")",action:()=>{t("explorer"),vi(v.session_id,v.tool)}})}return a.forEach(v=>p.push({id:"view:"+v.id,group:"View",label:"Apply view: "+v.name,action:()=>c(v.id)})),["auto","dark","light","editorial"].forEach(v=>p.push({id:"theme:"+v,group:"Appearance",label:"Theme: "+v,action:()=>i(v)})),["compact","normal","spacious"].forEach(v=>p.push({id:"density:"+v,group:"Appearance",label:"Density: "+v,action:()=>r(v)})),p.push({id:"help:shortcuts",group:"Shortcuts",label:"Keyboard shortcuts",action:()=>{d&&d()}}),p}function N_({open:e,onClose:t,tabs:n}){if(!e)return null;const l=[...n.map(s=>[s.label,s.key]),["Previous / next view","[ ]"],["Command palette",Ac()],["Focus filter","/"],["This list","?"],["Close panels","Esc"]];return g`<${fl} open=${!0} onClose=${t} ariaLabel="Keyboard shortcuts">
    <h3 style="margin-bottom:var(--sp-5)">Keyboard shortcuts</h3>
    <ul style="list-style:none;margin:0;padding:0;min-width:220px">
      ${l.map(([s,o])=>g`<li key=${s}
        style="display:flex;justify-content:space-between;align-items:center;gap:var(--sp-6);padding:var(--sp-1) 0">
        <span>${s}</span><${ot}>${o}</${ot}>
      </li>`)}
    </ul>
  </${fl}>`}function z_({theme:e,snap:t,filteredSnap:n,enabledTools:l,effectiveHistory:s,activeTab:o,connected:i,otelActive:r,alerts:a,selfStatus:c,openSession:h,setActiveTab:d,setTheme:p}){return{overview:()=>e==="editorial"?g`<${be} tabName="overview">
          <${S_}/>
          <div class="mb-lg" style="margin-top:var(--sp-6)">
            <div class="c-overline" style="margin-bottom:var(--sp-3)">Monitoring</div>
            <${Hr}/>
          </div>
        </${be}>`:g`<${be} tabName="overview">
          <${Q0} snap=${n} enabledTools=${l}
            connected=${i} otelActive=${r} alerts=${a} selfStatus=${c}
            onOpenSession=${h} onOpenTab=${d}/>
          ${!il(t,l)&&g`<${A0} snap=${n} history=${s} enabledTools=${l}/>`}
          <div class="mb-lg"><${Hr}/></div>
        </${be}>`,hidden:()=>g`<${be} tabName="hidden"><${W0}/></${be}>`,procs:()=>g`<${be} tabName="procs"><div class="mb-lg"><${p_}/></div></${be}>`,memory:()=>g`<${be} tabName="memory"><div class="mb-lg"><${m_}/></div><div class="mb-lg"><${h_}/></div></${be}>`,live:()=>g`<${be} tabName="live"><div class="mb-lg"><${__}/></div></${be}>`,events:()=>g`<${be} tabName="events"><div class="mb-lg"><${v_} key=${"events-"+o}/></div></${be}>`,budget:()=>g`<${be} tabName="budget"><div class="mb-lg"><${g_} key=${"budget-"+o}/></div></${be}>`,analytics:()=>g`<${be} tabName="analytics"><div class="mb-lg"><${y_} key=${"analytics-"+o}/></div></${be}>`,explorer:()=>e==="editorial"?g`<${be} tabName="explorer"><${M_}
          onInspect=${(v,$)=>{d("explorer"),vi(v,$),p("auto")}}
        /></${be}>`:g`<${be} tabName="explorer"><div class="mb-lg"><${b_} key=${"explorer-"+o}/></div></${be}>`,config:()=>g`<${be} tabName="config">
      <div class="mb-lg"><${$_}/></div>
      <div class="mb-lg"><${w_} snap=${t}/></div>
    </${be}>`,agents:()=>g`<${be} tabName="agents"><${k_}
      onViewSessions=${()=>d("explorer")}
      onViewConfig=${()=>d("config")}/></${be}>`,prompts:()=>g`<${be} tabName="prompts"><${x_}/></${be}>`}}function V_(){var rn;const{snapshot:e,history:t,connected:n}=lf(),{range:l,setPreset:s,setCustom:o,setRange:i}=hf(),{activeTab:r,setActiveTab:a,tabs:c}=vf(),{theme:h,setTheme:d,cycleTheme:p}=$f(),{density:v,setDensity:$}=kf(),A=Me(()=>e?e.tools.filter(oe=>oe.tool!=="aictl"&&oe.tool!=="any"&&ql.has(oe.tool)).map(oe=>oe.tool):[],[e]),{selectedTools:k,toggleTool:x,setTools:b}=_f(A),[E,M]=Q(""),[S,T]=Q(null),L=ee(null);T_(L,T),P_(n);const D=L_(),{data:N}=ll(()=>cc(),[],{pollMs:6e4}),{dbHistory:I,events:O}=D_(l),Y=Me(()=>({tab:r,range:l,tools:k,density:v,theme:h}),[r,l,k,v,h]),H=le(oe=>{oe.tab&&a(oe.tab),oe.range&&i(oe.range),oe.tools!==void 0&&b(oe.tools),oe.density&&$(oe.density),oe.theme&&d(oe.theme)},[a,i,b,$,d]),{views:G,saveView:j,deleteView:W,applyView:B,matchingView:tt}=xf(Y,H),ve=Cf(),[de,fe]=Q(!1),te=le(()=>fe(!0),[]);ce(()=>{const oe=We=>{We.key==="?"&&!ti(We.target)&&fe(Ne=>!Ne)};return document.addEventListener("keydown",oe),()=>document.removeEventListener("keydown",oe)},[]);const q=ee(null);A_(r,q);const Ie=le((oe,We)=>{a("explorer"),vi(oe,We)},[a]),Qe=Me(()=>I_({tabs:c,setActiveTab:a,setPreset:s,presets:Fl,allTools:A,toggleTool:x,setTheme:d,setDensity:$,views:G,applyView:B,snap:e,onShowShortcuts:te}),[c,a,s,A,x,d,$,G,B,e,te]),ke=l.id==="live"?t:I||t,ue=l.until?l.until-l.since:Es[l.id]||3600,ht=le((oe,We={})=>{if(!oe)return T(null);T({path:oe,at:We.at??null})},[]),Pe=Me(()=>R_(e,k,E),[e,k,E]),Se=Me(()=>{var Ne;const oe=Date.now()/1e3-300,We=new Map;for(const lt of O)if(lt.kind==="file_modified"&&lt.ts>=oe&&((Ne=lt.detail)!=null&&Ne.path)){const Mt=We.get(lt.detail.path);(!Mt||lt.ts>Mt.ts)&&We.set(lt.detail.path,{ts:lt.ts,growth:lt.detail.growth_bytes||0,tool:lt.tool})}return We},[O]),xt=Me(()=>({snap:Pe,history:t,openViewer:ht,recentFiles:Se,globalRange:l,rangeSeconds:ue,enabledTools:k}),[Pe,t,ht,Se,l,ue,k]),Ot=Me(()=>O_(Pe),[Pe]),nt=ee(null);nt.current=jp(nt.current,xt,{activeTab:r});const Bt=nt.current.value,en=z_({theme:h,snap:e,filteredSnap:Pe,enabledTools:k,effectiveHistory:ke,activeTab:r,connected:n,otelActive:D,alerts:Ot,selfStatus:N,openSession:Ie,setActiveTab:a,setTheme:d}),tn=e!=null;return g`<${zl.Provider} value=${Bt}>
    <div class="main-wrap">
      <${d_}/>
      <${o_}
        searchRef=${L} searchQuery=${E} onSearchChange=${M}
        theme=${h} cycleTheme=${p}
        density=${v} setDensity=${$}
        otelActive=${D} connected=${n} selfStatus=${N}
        globalRange=${l} onPreset=${s} onApplyCustom=${o}
        snap=${e} enabledTools=${k}
        onToggleTool=${x} onSetAllTools=${b}
        views=${G} matchingView=${tt}
        onApplyView=${B} onDeleteView=${W} onSaveView=${j}
        onOpenPalette=${ve.open}
      />
      ${h==="editorial"&&g`<${r_}
        activeTab=${r} setActiveTab=${a}
      />`}
      <div class="shell-body">
        <${a_} tabs=${c} activeTab=${r} setActiveTab=${a}/>
        <main class="main" id="main-content" tabindex="0" ref=${q}>
          <div class="main-view" aria-label=${(rn=c.find(oe=>oe.id===r))==null?void 0:rn.label}>
            ${tn&&g`<${th} count=${(Pe==null?void 0:Pe.filter_hidden_unlisted)||0}/>`}
            ${tn?E_.has(r)&&il(e,k)?g`<${Fp} tools=${k.map(oe=>({tool:oe,label:dl(oe,e)}))}/>`:en[r]?en[r]():g`<p class="text-muted">Unknown tab "${r}"</p>`:g`<div class="tab-skeleton" role="status" aria-busy="true" aria-label="Loading dashboard">
                  <${rl} height="120px" radius="var(--radius-sm)"/>
                  <${rl} height="60px"  radius="var(--radius-sm)"/>
                  <${rl} height="200px" radius="var(--radius-sm)"/>
                </div>`}
          </div>
        </main>
      </div>
    </div>
    <${nh} path=${(S==null?void 0:S.path)??(typeof S=="string"?S:null)}
      at=${typeof S=="object"?S==null?void 0:S.at:null}
      onClose=${()=>T(null)}/>
    <${yh}/>
    <${u_} commands=${Qe}
      isOpen=${ve.isOpen} onClose=${ve.close}
      lru=${ve.lru} onRun=${oe=>ve.recordUse(oe.id)}/>
    <${N_} open=${de}
      onClose=${()=>fe(!1)} tabs=${c}/>
    <${fh}/>
  </${zl.Provider}>`}id(g`<${V_}/>`,document.getElementById("app"));export{dl as $,ee as A,Co as B,z0 as C,y0 as D,_s as E,Bv as F,wv as G,_v as H,jt as I,Md as J,Fp as K,gn as L,yv as M,If as N,$v as O,_n as P,ll as Q,Rr as R,zl as S,Me as T,rv as U,hv as V,Uv as W,Hv as X,w0 as Y,Wv as Z,v0 as _,Xt as a,Ht as a0,rl as a1,Pc as a2,vr as a3,av as a4,cv as a5,uv as a6,xv as a7,Bp as a8,sv as a9,Ev as aA,Av as aB,Lv as aC,Mv as aD,Tv as aE,H_ as aF,lv as aG,cc as aH,q_ as aI,K_ as aJ,ev as aK,Iv as aL,Xo as aM,Nv as aN,zv as aO,B_ as aP,Dd as aQ,dv as aR,fl as aS,jv as aT,fv as aU,Oo as aV,ic as aW,Cd as aX,H0 as aY,th as aa,F_ as ab,j_ as ac,Rv as ad,Vv as ae,Ov as af,Qo as ag,Fv as ah,tv as ai,Cv as aj,nv as ak,G_ as al,U_ as am,X_ as an,iv as ao,ov as ap,W_ as aq,Y_ as ar,J_ as as,N0 as at,Z_ as au,Q_ as av,pv as aw,ie as ax,Ud as ay,To as az,vt as b,Bd as c,Q as d,ol as e,ul as f,Dv as g,ss as h,gv as i,kv as j,Ao as k,Sv as l,g as m,nl as n,bv as o,Cs as p,le as q,Fd as r,Pv as s,Rf as t,vv as u,mv as v,Hl as w,xs as x,ce as y,S0 as z};
