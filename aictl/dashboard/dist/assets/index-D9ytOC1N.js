(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))n(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function s(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(l){if(l.ep)return;l.ep=!0;const o=s(l);fetch(l.href,o)}})();var ml,Ee,ur,cs,Ba,pr,fr,vr,Bo,_o,$o,mr,ol={},al=[],ad=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,hl=Array.isArray;function Xt(e,t){for(var s in t)e[s]=t[s];return e}function Ho(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function hr(e,t,s){var n,l,o,a={};for(o in t)o=="key"?n=t[o]:o=="ref"?l=t[o]:a[o]=t[o];if(arguments.length>2&&(a.children=arguments.length>3?ml.call(arguments,2):s),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)a[o]===void 0&&(a[o]=e.defaultProps[o]);return Xn(e,a,n,l,null)}function Xn(e,t,s,n,l){var o={type:e,props:t,key:s,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:l??++ur,__i:-1,__u:0};return l==null&&Ee.vnode!=null&&Ee.vnode(o),o}function gl(e){return e.children}function En(e,t){this.props=e,this.context=t}function an(e,t){if(t==null)return e.__?an(e.__,e.__i+1):null;for(var s;t<e.__k.length;t++)if((s=e.__k[t])!=null&&s.__e!=null)return s.__e;return typeof e.type=="function"?an(e):null}function id(e){if(e.__P&&e.__d){var t=e.__v,s=t.__e,n=[],l=[],o=Xt({},t);o.__v=t.__v+1,Ee.vnode&&Ee.vnode(o),Wo(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[s]:null,n,s??an(t),!!(32&t.__u),l),o.__v=t.__v,o.__.__k[o.__i]=o,br(n,o,l),t.__e=t.__=null,o.__e!=s&&gr(o)}}function gr(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),gr(e)}function bo(e){(!e.__d&&(e.__d=!0)&&cs.push(e)&&!il.__r++||Ba!=Ee.debounceRendering)&&((Ba=Ee.debounceRendering)||pr)(il)}function il(){try{for(var e,t=1;cs.length;)cs.length>t&&cs.sort(fr),e=cs.shift(),t=cs.length,id(e)}finally{cs.length=il.__r=0}}function _r(e,t,s,n,l,o,a,i,c,d,v){var u,m,g,x,L,T,y,$=n&&n.__k||al,k=t.length;for(c=rd(s,t,$,c,k),u=0;u<k;u++)(g=s.__k[u])!=null&&(m=g.__i!=-1&&$[g.__i]||ol,g.__i=u,T=Wo(e,g,m,l,o,a,i,c,d,v),x=g.__e,g.ref&&m.ref!=g.ref&&(m.ref&&qo(m.ref,null,g),v.push(g.ref,g.__c||x,g)),L==null&&x!=null&&(L=x),(y=!!(4&g.__u))||m.__k===g.__k?c=$r(g,c,e,y):typeof g.type=="function"&&T!==void 0?c=T:x&&(c=x.nextSibling),g.__u&=-7);return s.__e=L,c}function rd(e,t,s,n,l){var o,a,i,c,d,v=s.length,u=v,m=0;for(e.__k=new Array(l),o=0;o<l;o++)(a=t[o])!=null&&typeof a!="boolean"&&typeof a!="function"?(typeof a=="string"||typeof a=="number"||typeof a=="bigint"||a.constructor==String?a=e.__k[o]=Xn(null,a,null,null,null):hl(a)?a=e.__k[o]=Xn(gl,{children:a},null,null,null):a.constructor===void 0&&a.__b>0?a=e.__k[o]=Xn(a.type,a.props,a.key,a.ref?a.ref:null,a.__v):e.__k[o]=a,c=o+m,a.__=e,a.__b=e.__b+1,i=null,(d=a.__i=cd(a,s,c,u))!=-1&&(u--,(i=s[d])&&(i.__u|=2)),i==null||i.__v==null?(d==-1&&(l>v?m--:l<v&&m++),typeof a.type!="function"&&(a.__u|=4)):d!=c&&(d==c-1?m--:d==c+1?m++:(d>c?m--:m++,a.__u|=4))):e.__k[o]=null;if(u)for(o=0;o<v;o++)(i=s[o])!=null&&!(2&i.__u)&&(i.__e==n&&(n=an(i)),xr(i,i));return n}function $r(e,t,s,n){var l,o;if(typeof e.type=="function"){for(l=e.__k,o=0;l&&o<l.length;o++)l[o]&&(l[o].__=e,t=$r(l[o],t,s,n));return t}e.__e!=t&&(n&&(t&&e.type&&!t.parentNode&&(t=an(e)),s.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function cd(e,t,s,n){var l,o,a,i=e.key,c=e.type,d=t[s],v=d!=null&&(2&d.__u)==0;if(d===null&&i==null||v&&i==d.key&&c==d.type)return s;if(n>(v?1:0)){for(l=s-1,o=s+1;l>=0||o<t.length;)if((d=t[a=l>=0?l--:o++])!=null&&!(2&d.__u)&&i==d.key&&c==d.type)return a}return-1}function Ha(e,t,s){t[0]=="-"?e.setProperty(t,s??""):e[t]=s==null?"":typeof s!="number"||ad.test(t)?s:s+"px"}function Un(e,t,s,n,l){var o,a;e:if(t=="style")if(typeof s=="string")e.style.cssText=s;else{if(typeof n=="string"&&(e.style.cssText=n=""),n)for(t in n)s&&t in s||Ha(e.style,t,"");if(s)for(t in s)n&&s[t]==n[t]||Ha(e.style,t,s[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace(vr,"$1")),a=t.toLowerCase(),t=a in e||t=="onFocusOut"||t=="onFocusIn"?a.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=s,s?n?s.u=n.u:(s.u=Bo,e.addEventListener(t,o?$o:_o,o)):e.removeEventListener(t,o?$o:_o,o);else{if(l=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=s??"";break e}catch{}typeof s=="function"||(s==null||s===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&s==1?"":s))}}function Wa(e){return function(t){if(this.l){var s=this.l[t.type+e];if(t.t==null)t.t=Bo++;else if(t.t<s.u)return;return s(Ee.event?Ee.event(t):t)}}}function Wo(e,t,s,n,l,o,a,i,c,d){var v,u,m,g,x,L,T,y,$,k,S,B,A,C,I,b=t.type;if(t.constructor!==void 0)return null;128&s.__u&&(c=!!(32&s.__u),o=[i=t.__e=s.__e]),(v=Ee.__b)&&v(t);e:if(typeof b=="function")try{if(y=t.props,$=b.prototype&&b.prototype.render,k=(v=b.contextType)&&n[v.__c],S=v?k?k.props.value:v.__:n,s.__c?T=(u=t.__c=s.__c).__=u.__E:($?t.__c=u=new b(y,S):(t.__c=u=new En(y,S),u.constructor=b,u.render=ud),k&&k.sub(u),u.state||(u.state={}),u.__n=n,m=u.__d=!0,u.__h=[],u._sb=[]),$&&u.__s==null&&(u.__s=u.state),$&&b.getDerivedStateFromProps!=null&&(u.__s==u.state&&(u.__s=Xt({},u.__s)),Xt(u.__s,b.getDerivedStateFromProps(y,u.__s))),g=u.props,x=u.state,u.__v=t,m)$&&b.getDerivedStateFromProps==null&&u.componentWillMount!=null&&u.componentWillMount(),$&&u.componentDidMount!=null&&u.__h.push(u.componentDidMount);else{if($&&b.getDerivedStateFromProps==null&&y!==g&&u.componentWillReceiveProps!=null&&u.componentWillReceiveProps(y,S),t.__v==s.__v||!u.__e&&u.shouldComponentUpdate!=null&&u.shouldComponentUpdate(y,u.__s,S)===!1){t.__v!=s.__v&&(u.props=y,u.state=u.__s,u.__d=!1),t.__e=s.__e,t.__k=s.__k,t.__k.some(function(M){M&&(M.__=t)}),al.push.apply(u.__h,u._sb),u._sb=[],u.__h.length&&a.push(u);break e}u.componentWillUpdate!=null&&u.componentWillUpdate(y,u.__s,S),$&&u.componentDidUpdate!=null&&u.__h.push(function(){u.componentDidUpdate(g,x,L)})}if(u.context=S,u.props=y,u.__P=e,u.__e=!1,B=Ee.__r,A=0,$)u.state=u.__s,u.__d=!1,B&&B(t),v=u.render(u.props,u.state,u.context),al.push.apply(u.__h,u._sb),u._sb=[];else do u.__d=!1,B&&B(t),v=u.render(u.props,u.state,u.context),u.state=u.__s;while(u.__d&&++A<25);u.state=u.__s,u.getChildContext!=null&&(n=Xt(Xt({},n),u.getChildContext())),$&&!m&&u.getSnapshotBeforeUpdate!=null&&(L=u.getSnapshotBeforeUpdate(g,x)),C=v!=null&&v.type===gl&&v.key==null?yr(v.props.children):v,i=_r(e,hl(C)?C:[C],t,s,n,l,o,a,i,c,d),u.base=t.__e,t.__u&=-161,u.__h.length&&a.push(u),T&&(u.__E=u.__=null)}catch(M){if(t.__v=null,c||o!=null)if(M.then){for(t.__u|=c?160:128;i&&i.nodeType==8&&i.nextSibling;)i=i.nextSibling;o[o.indexOf(i)]=null,t.__e=i}else{for(I=o.length;I--;)Ho(o[I]);yo(t)}else t.__e=s.__e,t.__k=s.__k,M.then||yo(t);Ee.__e(M,t,s)}else o==null&&t.__v==s.__v?(t.__k=s.__k,t.__e=s.__e):i=t.__e=dd(s.__e,t,s,n,l,o,a,c,d);return(v=Ee.diffed)&&v(t),128&t.__u?void 0:i}function yo(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(yo))}function br(e,t,s){for(var n=0;n<s.length;n++)qo(s[n],s[++n],s[++n]);Ee.__c&&Ee.__c(t,e),e.some(function(l){try{e=l.__h,l.__h=[],e.some(function(o){o.call(l)})}catch(o){Ee.__e(o,l.__v)}})}function yr(e){return typeof e!="object"||e==null||e.__b>0?e:hl(e)?e.map(yr):Xt({},e)}function dd(e,t,s,n,l,o,a,i,c){var d,v,u,m,g,x,L,T=s.props||ol,y=t.props,$=t.type;if($=="svg"?l="http://www.w3.org/2000/svg":$=="math"?l="http://www.w3.org/1998/Math/MathML":l||(l="http://www.w3.org/1999/xhtml"),o!=null){for(d=0;d<o.length;d++)if((g=o[d])&&"setAttribute"in g==!!$&&($?g.localName==$:g.nodeType==3)){e=g,o[d]=null;break}}if(e==null){if($==null)return document.createTextNode(y);e=document.createElementNS(l,$,y.is&&y),i&&(Ee.__m&&Ee.__m(t,o),i=!1),o=null}if($==null)T===y||i&&e.data==y||(e.data=y);else{if(o=o&&ml.call(e.childNodes),!i&&o!=null)for(T={},d=0;d<e.attributes.length;d++)T[(g=e.attributes[d]).name]=g.value;for(d in T)g=T[d],d=="dangerouslySetInnerHTML"?u=g:d=="children"||d in y||d=="value"&&"defaultValue"in y||d=="checked"&&"defaultChecked"in y||Un(e,d,null,g,l);for(d in y)g=y[d],d=="children"?m=g:d=="dangerouslySetInnerHTML"?v=g:d=="value"?x=g:d=="checked"?L=g:i&&typeof g!="function"||T[d]===g||Un(e,d,g,T[d],l);if(v)i||u&&(v.__html==u.__html||v.__html==e.innerHTML)||(e.innerHTML=v.__html),t.__k=[];else if(u&&(e.innerHTML=""),_r(t.type=="template"?e.content:e,hl(m)?m:[m],t,s,n,$=="foreignObject"?"http://www.w3.org/1999/xhtml":l,o,a,o?o[0]:s.__k&&an(s,0),i,c),o!=null)for(d=o.length;d--;)Ho(o[d]);i||(d="value",$=="progress"&&x==null?e.removeAttribute("value"):x!=null&&(x!==e[d]||$=="progress"&&!x||$=="option"&&x!=T[d])&&Un(e,d,x,T[d],l),d="checked",L!=null&&L!=e[d]&&Un(e,d,L,T[d],l))}return e}function qo(e,t,s){try{if(typeof e=="function"){var n=typeof e.__u=="function";n&&e.__u(),n&&t==null||(e.__u=e(t))}else e.current=t}catch(l){Ee.__e(l,s)}}function xr(e,t,s){var n,l;if(Ee.unmount&&Ee.unmount(e),(n=e.ref)&&(n.current&&n.current!=e.__e||qo(n,null,t)),(n=e.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(o){Ee.__e(o,t)}n.base=n.__P=null}if(n=e.__k)for(l=0;l<n.length;l++)n[l]&&xr(n[l],t,s||typeof e.type!="function");s||Ho(e.__e),e.__c=e.__=e.__e=void 0}function ud(e,t,s){return this.constructor(e,s)}function pd(e,t,s){var n,l,o,a;t==document&&(t=document.documentElement),Ee.__&&Ee.__(e,t),l=(n=!1)?null:t.__k,o=[],a=[],Wo(t,e=t.__k=hr(gl,null,[e]),l||ol,ol,t.namespaceURI,l?null:t.firstChild?ml.call(t.childNodes):null,o,l?l.__e:t.firstChild,n,a),br(o,e,a)}function fd(e){function t(s){var n,l;return this.getChildContext||(n=new Set,(l={})[t.__c]=this,this.getChildContext=function(){return l},this.componentWillUnmount=function(){n=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&n.forEach(function(a){a.__e=!0,bo(a)})},this.sub=function(o){n.add(o);var a=o.componentWillUnmount;o.componentWillUnmount=function(){n&&n.delete(o),a&&a.call(o)}}),s.children}return t.__c="__cC"+mr++,t.__=e,t.Provider=t.__l=(t.Consumer=function(s,n){return s.children(n)}).contextType=t,t}ml=al.slice,Ee={__e:function(e,t,s,n){for(var l,o,a;t=t.__;)if((l=t.__c)&&!l.__)try{if((o=l.constructor)&&o.getDerivedStateFromError!=null&&(l.setState(o.getDerivedStateFromError(e)),a=l.__d),l.componentDidCatch!=null&&(l.componentDidCatch(e,n||{}),a=l.__d),a)return l.__E=l}catch(i){e=i}throw e}},ur=0,En.prototype.setState=function(e,t){var s;s=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=Xt({},this.state),typeof e=="function"&&(e=e(Xt({},s),this.props)),e&&Xt(s,e),e!=null&&this.__v&&(t&&this._sb.push(t),bo(this))},En.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),bo(this))},En.prototype.render=gl,cs=[],pr=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,fr=function(e,t){return e.__v.__b-t.__v.__b},il.__r=0,vr=/(PointerCapture)$|Capture$/i,Bo=0,_o=Wa(!1),$o=Wa(!0),mr=0;var kr=function(e,t,s,n){var l;t[0]=0;for(var o=1;o<t.length;o++){var a=t[o++],i=t[o]?(t[0]|=a?1:2,s[t[o++]]):t[++o];a===3?n[0]=i:a===4?n[1]=Object.assign(n[1]||{},i):a===5?(n[1]=n[1]||{})[t[++o]]=i:a===6?n[1][t[++o]]+=i+"":a?(l=e.apply(i,kr(e,i,s,["",null])),n.push(l),i[0]?t[0]|=2:(t[o-2]=0,t[o]=l)):n.push(i)}return n},qa=new Map;function vd(e){var t=qa.get(this);return t||(t=new Map,qa.set(this,t)),(t=kr(this,t.get(e)||(t.set(e,t=function(s){for(var n,l,o=1,a="",i="",c=[0],d=function(m){o===1&&(m||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?c.push(0,m,a):o===3&&(m||a)?(c.push(3,m,a),o=2):o===2&&a==="..."&&m?c.push(4,m,0):o===2&&a&&!m?c.push(5,0,!0,a):o>=5&&((a||!m&&o===5)&&(c.push(o,0,a,l),o=6),m&&(c.push(o,m,0,l),o=6)),a=""},v=0;v<s.length;v++){v&&(o===1&&d(),d(v));for(var u=0;u<s[v].length;u++)n=s[v][u],o===1?n==="<"?(d(),c=[c],o=3):a+=n:o===4?a==="--"&&n===">"?(o=1,a=""):a=n+a[0]:i?n===i?i="":a+=n:n==='"'||n==="'"?i=n:n===">"?(d(),o=1):o&&(n==="="?(o=5,l=a,a=""):n==="/"&&(o<5||s[v][u+1]===">")?(d(),o===3&&(c=c[0]),o=c,(c=c[0]).push(2,0,o),o=0):n===" "||n==="	"||n===`
`||n==="\r"?(d(),o=2):a+=n),o===3&&a==="!--"&&(o=4,c=c[0])}return d(),c}(e)),t),arguments,[])).length>1?t:t[0]}var r=vd.bind(hr),rn,Re,Xl,Ua,On=0,wr=[],He=Ee,Va=He.__b,Ga=He.__r,Ya=He.diffed,Ka=He.__c,Ja=He.unmount,Qa=He.__;function _l(e,t){He.__h&&He.__h(Re,e,On||t),On=0;var s=Re.__H||(Re.__H={__:[],__h:[]});return e>=s.__.length&&s.__.push({}),s.__[e]}function q(e){return On=1,Sr(Cr,e)}function Sr(e,t,s){var n=_l(rn++,2);if(n.t=e,!n.__c&&(n.__=[Cr(void 0,t),function(i){var c=n.__N?n.__N[0]:n.__[0],d=n.t(c,i);c!==d&&(n.__N=[d,n.__[1]],n.__c.setState({}))}],n.__c=Re,!Re.__f)){var l=function(i,c,d){if(!n.__c.__H)return!0;var v=n.__c.__H.__.filter(function(m){return m.__c});if(v.every(function(m){return!m.__N}))return!o||o.call(this,i,c,d);var u=n.__c.props!==i;return v.some(function(m){if(m.__N){var g=m.__[0];m.__=m.__N,m.__N=void 0,g!==m.__[0]&&(u=!0)}}),o&&o.call(this,i,c,d)||u};Re.__f=!0;var o=Re.shouldComponentUpdate,a=Re.componentWillUpdate;Re.componentWillUpdate=function(i,c,d){if(this.__e){var v=o;o=void 0,l(i,c,d),o=v}a&&a.call(this,i,c,d)},Re.shouldComponentUpdate=l}return n.__N||n.__}function ae(e,t){var s=_l(rn++,3);!He.__s&&Tr(s.__H,t)&&(s.__=e,s.u=t,Re.__H.__h.push(s))}function lt(e){return On=5,re(function(){return{current:e}},[])}function re(e,t){var s=_l(rn++,7);return Tr(s.__H,t)&&(s.__=e(),s.__H=t,s.__h=e),s.__}function ye(e,t){return On=8,re(function(){return e},t)}function qe(e){var t=Re.context[e.__c],s=_l(rn++,9);return s.c=e,t?(s.__==null&&(s.__=!0,t.sub(Re)),t.props.value):e.__}function md(){for(var e;e=wr.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(el),t.__h.some(xo),t.__h=[]}catch(s){t.__h=[],He.__e(s,e.__v)}}}He.__b=function(e){Re=null,Va&&Va(e)},He.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),Qa&&Qa(e,t)},He.__r=function(e){Ga&&Ga(e),rn=0;var t=(Re=e.__c).__H;t&&(Xl===Re?(t.__h=[],Re.__h=[],t.__.some(function(s){s.__N&&(s.__=s.__N),s.u=s.__N=void 0})):(t.__h.some(el),t.__h.some(xo),t.__h=[],rn=0)),Xl=Re},He.diffed=function(e){Ya&&Ya(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(wr.push(t)!==1&&Ua===He.requestAnimationFrame||((Ua=He.requestAnimationFrame)||hd)(md)),t.__H.__.some(function(s){s.u&&(s.__H=s.u),s.u=void 0})),Xl=Re=null},He.__c=function(e,t){t.some(function(s){try{s.__h.some(el),s.__h=s.__h.filter(function(n){return!n.__||xo(n)})}catch(n){t.some(function(l){l.__h&&(l.__h=[])}),t=[],He.__e(n,s.__v)}}),Ka&&Ka(e,t)},He.unmount=function(e){Ja&&Ja(e);var t,s=e.__c;s&&s.__H&&(s.__H.__.some(function(n){try{el(n)}catch(l){t=l}}),s.__H=void 0,t&&He.__e(t,s.__v))};var Za=typeof requestAnimationFrame=="function";function hd(e){var t,s=function(){clearTimeout(n),Za&&cancelAnimationFrame(t),setTimeout(e)},n=setTimeout(s,35);Za&&(t=requestAnimationFrame(s))}function el(e){var t=Re,s=e.__c;typeof s=="function"&&(e.__c=void 0,s()),Re=t}function xo(e){var t=Re;e.__c=e.__(),Re=t}function Tr(e,t){return!e||e.length!==t.length||t.some(function(s,n){return s!==e[n]})}function Cr(e,t){return typeof t=="function"?t(e):t}const Ne=fd(null);let gd="";function je(e){return gd+e}async function Xa(){return(await fetch(je("/api/snapshot"))).json()}async function Ln(e={}){let t="/api/history";const s=[];return e.range&&s.push("range="+e.range),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.tool&&s.push("tool="+encodeURIComponent(e.tool)),s.length&&(t+="?"+s.join("&")),(await fetch(je(t))).json()}async function Uo(e={}){let t="/api/events";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.sessionId&&s.push("session_id="+encodeURIComponent(e.sessionId)),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(je(t))).json()}async function Mr(e={}){let t="/api/sessions";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.active!=null&&s.push("active="+e.active),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(je(t))).json()}async function Vo(e,t,s){let n=`/api/session-flow?session_id=${encodeURIComponent(e)}&since=${t}&until=${s}`;return(await fetch(je(n))).json()}async function $l(e,t={}){let s="/api/session-timeline";const n=[];return t.since!=null&&n.push("since="+t.since),t.until!=null&&n.push("until="+t.until),n.length&&(s+="?"+n.join("&")),(await fetch(je(s))).json()}async function _d(e,t,s=30,n=20){const l=`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=${s}&limit=${n}`;return(await fetch(je(l))).json()}async function $d(e){return(await fetch(je("/api/agent-teams?session_id="+encodeURIComponent(e)))).json()}async function bd(e){return(await fetch(je("/api/transcript/"+encodeURIComponent(e)))).json()}async function yd(e,t={}){return(await fetch(je(e),t)).json()}async function xd(e=7){return(await fetch(je("/api/project-costs?days="+e))).json()}async function kd(e,t=100){return(await fetch(je(`/api/api-calls?since=${e}&limit=${t}`))).json()}async function wd(){return(await fetch(je("/api/budget"))).json()}async function Sd(e,t={}){return fetch(je("/api/file?path="+encodeURIComponent(e)),{headers:t})}async function Td(){return(await fetch(je("/api/samples?list=1"))).json()}async function Cd(e,t){return(await fetch(je("/api/samples?series="+encodeURIComponent(e)+"&since="+t))).json()}async function Md(e,t){return(await fetch(je("/api/samples?metric="+encodeURIComponent(e)+"&since="+t))).json()}async function Er(){return(await fetch(je("/api/otel-status"))).json()}async function Ed(){return(await fetch(je("/api/self-status"))).json()}let eo=null;async function Ld(){return eo||(eo=fetch(je("/api/datapoints")).then(e=>e.json())),eo}function Dd(){return je("/api/stream")}const Le=window.COLORS??{},vt=window.ICONS??{},Lr=window.VENDOR_LABELS??{},Ad=window.VENDOR_COLORS??{},Od=window.HOST_LABELS??{},ei=window.TOOL_RELATIONSHIPS??{},Pd={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},to=["auto","dark","light"],zd={auto:"☾",dark:"☾",light:"☀"},ln=5,Js=15,Rd={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},ti=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],Id={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},Fd=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],rl=new Map,Nd=6e4;function Dr(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function bl(e,t,s,n=1){for(let l=t.length-1;l>=0;l--){const[o,a]=t[l],i=e/o;if(i>=n)return Dr(i)+a}return Math.round(e)+s}const jd=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],Bd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],Hd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function z(e){return bl(e,Bd,"")}function Ge(e){return bl(e,Hd,"")}function ge(e){return bl(e,jd,"B")}function Nt(e){return!e||e<=0?"0B/s":bl(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function _e(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function K(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function Go(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function Ar(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Ms(e){return e&&e.replace(/\\/g,"/")}function so(e,t){const s=Ms(e),n=Ms(t);return s.startsWith(n+"/")?"project":s.includes("/.claude/projects/")?"shadow":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")||s.includes("/.copilot/")||s.includes("/.vscode/")?"global":"external"}function Wd(e,t){const s=Ms(e),n=Ms(t);if(s.startsWith(n+"/")){const o=s.slice(n.length+1),a=o.split("/");return a.pop(),a.length?a.join("/"):"(root)"}const l=s.split("/");l.pop();for(let o=l.length-1;o>=0;o--)if(l[o].startsWith(".")&&l[o].length>1&&l[o]!==".."||l[o]==="Library"||l[o]==="AppData")return"~/"+l.slice(o).join("/");return l.slice(-2).join("/")}function qd(e,t){const s={};e.forEach(l=>{const o=so(l.path,t),a=Wd(l.path,t),i=o==="project"?a:o+": "+a;(s[i]=s[i]||[]).push(l)});const n={project:0,global:1,shadow:2,external:3};return Object.entries(s).sort((l,o)=>{const a=l[1][0]?so(l[1][0].path,t):"z",i=o[1][0]?so(o[1][0].path,t):"z";return(n[a]||9)-(n[i]||9)})}function Ud(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let s=2;s<e.length;s++)t.push((e[s-2]+e[s-1]+e[s])/3);return t}async function Yo(e){const t=rl.get(e);if(t&&Date.now()-t.ts<Nd)return t.content;const s={};t&&t.etag&&(s["If-None-Match"]=t.etag);const n=await Sd(e,s);if(n.status===304&&t)return t.ts=Date.now(),t.content;if(!n.ok)throw new Error(n.statusText);const l=await n.text(),o=n.headers.get("ETag")||null;return rl.set(e,{content:l,ts:Date.now(),etag:o}),l}function jt(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function Or(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function no(e,t,s,n){if(e==null||e==="")return"";let l=typeof e=="number"?e:parseFloat(e)||0;n&&(l*=n);let o;switch(t){case"size":o=ge(l);break;case"rate":o=Nt(l);break;case"kilo":o=z(l);break;case"percent":o=_e(l);break;case"pct":o=_e(l);break;case"raw":default:o=Number.isInteger(l)?String(l):Dr(l)}return s?o+s:o}function si(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const en={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],tabs:[{id:"overview",label:"Dashboard",icon:"📊",key:"1"},{id:"procs",label:"Processes",icon:"⚙️",key:"2"},{id:"memory",label:"AI Context",icon:"📝",key:"3"},{id:"live",label:"Live Monitor",icon:"📡",key:"4"},{id:"events",label:"Events & Stats",icon:"📈",key:"5"},{id:"budget",label:"Token Budget",icon:"💰",key:"6"},{id:"sessions",label:"Sessions",icon:"🔄",key:"7"},{id:"analytics",label:"Analytics",icon:"🔬",key:"8"},{id:"flow",label:"Session Flow",icon:"🔀",key:"9"},{id:"transcript",label:"Transcript",icon:"📜",key:"t"},{id:"timeline",label:"Timeline",icon:"📉",key:"y"},{id:"config",label:"Configuration",icon:"⚙️",key:"0"}]},ni=200,li=80,Vd=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Gd(e,t){if(!e)return t;const s=Object.fromEntries((t.tools||[]).map(n=>[n.tool,n]));return{...e,...t,tools:e.tools.map(n=>{const l=s[n.tool];return l?{...n,live:l.live,vendor:l.vendor||n.vendor,host:l.host||n.host}:n})}}function Yd(e,t){var n,l,o,a;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>ni)for(const i of Vd)e[i]=e[i].slice(-ni);const s=e.by_tool||{};for(const i of t.tools||[]){if(i.tool==="aictl")continue;const c=((n=i.live)==null?void 0:n.cpu_percent)||0,d=((l=i.live)==null?void 0:l.mem_mb)||0,v=i.tokens||0,u=(((o=i.live)==null?void 0:o.outbound_rate_bps)||0)+(((a=i.live)==null?void 0:a.inbound_rate_bps)||0);s[i.tool]||(s[i.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const m=s[i.tool];if(m.ts.push(t.timestamp),m.cpu.push(Math.round(c*10)/10),m.mem_mb.push(Math.round(d*10)/10),m.tokens.push(v),m.traffic.push(Math.round(u*100)/100),m.ts.length>li)for(const g of Object.keys(m))m[g]=m[g].slice(-li)}return{...e,by_tool:s}}const Kd=!0,Ke="u-",Jd="uplot",Qd=Ke+"hz",Zd=Ke+"vt",Xd=Ke+"title",eu=Ke+"wrap",tu=Ke+"under",su=Ke+"over",nu=Ke+"axis",Ts=Ke+"off",lu=Ke+"select",ou=Ke+"cursor-x",au=Ke+"cursor-y",iu=Ke+"cursor-pt",ru=Ke+"legend",cu=Ke+"live",du=Ke+"inline",uu=Ke+"series",pu=Ke+"marker",oi=Ke+"label",fu=Ke+"value",Tn="width",Cn="height",wn="top",ai="bottom",Qs="left",lo="right",Ko="#000",ii=Ko+"0",oo="mousemove",ri="mousedown",ao="mouseup",ci="mouseenter",di="mouseleave",ui="dblclick",vu="resize",mu="scroll",pi="change",cl="dppxchange",Jo="--",fn=typeof window<"u",ko=fn?document:null,on=fn?window:null,hu=fn?navigator:null;let me,Vn;function wo(){let e=devicePixelRatio;me!=e&&(me=e,Vn&&To(pi,Vn,wo),Vn=matchMedia(`(min-resolution: ${me-.001}dppx) and (max-resolution: ${me+.001}dppx)`),Cs(pi,Vn,wo),on.dispatchEvent(new CustomEvent(cl)))}function bt(e,t){if(t!=null){let s=e.classList;!s.contains(t)&&s.add(t)}}function So(e,t){let s=e.classList;s.contains(t)&&s.remove(t)}function Me(e,t,s){e.style[t]=s+"px"}function Rt(e,t,s,n){let l=ko.createElement(e);return t!=null&&bt(l,t),s!=null&&s.insertBefore(l,n),l}function Et(e,t){return Rt("div",e,t)}const fi=new WeakMap;function Yt(e,t,s,n,l){let o="translate("+t+"px,"+s+"px)",a=fi.get(e);o!=a&&(e.style.transform=o,fi.set(e,o),t<0||s<0||t>n||s>l?bt(e,Ts):So(e,Ts))}const vi=new WeakMap;function mi(e,t,s){let n=t+s,l=vi.get(e);n!=l&&(vi.set(e,n),e.style.background=t,e.style.borderColor=s)}const hi=new WeakMap;function gi(e,t,s,n){let l=t+""+s,o=hi.get(e);l!=o&&(hi.set(e,l),e.style.height=s+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-s/2+"px":0)}const Qo={passive:!0},gu={...Qo,capture:!0};function Cs(e,t,s,n){t.addEventListener(e,s,n?gu:Qo)}function To(e,t,s,n){t.removeEventListener(e,s,Qo)}fn&&wo();function It(e,t,s,n){let l;s=s||0,n=n||t.length-1;let o=n<=2147483647;for(;n-s>1;)l=o?s+n>>1:yt((s+n)/2),t[l]<e?s=l:n=l;return e-t[s]<=t[n]-e?s:n}function Pr(e){return(s,n,l)=>{let o=-1,a=-1;for(let i=n;i<=l;i++)if(e(s[i])){o=i;break}for(let i=l;i>=n;i--)if(e(s[i])){a=i;break}return[o,a]}}const zr=e=>e!=null,Rr=e=>e!=null&&e>0,yl=Pr(zr),_u=Pr(Rr);function $u(e,t,s,n=0,l=!1){let o=l?_u:yl,a=l?Rr:zr;[t,s]=o(e,t,s);let i=e[t],c=e[t];if(t>-1)if(n==1)i=e[t],c=e[s];else if(n==-1)i=e[s],c=e[t];else for(let d=t;d<=s;d++){let v=e[d];a(v)&&(v<i?i=v:v>c&&(c=v))}return[i??xe,c??-xe]}function xl(e,t,s,n){let l=bi(e),o=bi(t);e==t&&(l==-1?(e*=s,t/=s):(e/=s,t*=s));let a=s==10?ts:Ir,i=l==1?yt:Lt,c=o==1?Lt:yt,d=i(a(Ye(e))),v=c(a(Ye(t))),u=cn(s,d),m=cn(s,v);return s==10&&(d<0&&(u=ke(u,-d)),v<0&&(m=ke(m,-v))),n||s==2?(e=u*l,t=m*o):(e=Br(e,u),t=kl(t,m)),[e,t]}function Zo(e,t,s,n){let l=xl(e,t,s,n);return e==0&&(l[0]=0),t==0&&(l[1]=0),l}const Xo=.1,_i={mode:3,pad:Xo},Dn={pad:0,soft:null,mode:0},bu={min:Dn,max:Dn};function dl(e,t,s,n){return wl(s)?$i(e,t,s):(Dn.pad=s,Dn.soft=n?0:null,Dn.mode=n?3:0,$i(e,t,bu))}function fe(e,t){return e??t}function yu(e,t,s){for(t=fe(t,0),s=fe(s,e.length-1);t<=s;){if(e[t]!=null)return!0;t++}return!1}function $i(e,t,s){let n=s.min,l=s.max,o=fe(n.pad,0),a=fe(l.pad,0),i=fe(n.hard,-xe),c=fe(l.hard,xe),d=fe(n.soft,xe),v=fe(l.soft,-xe),u=fe(n.mode,0),m=fe(l.mode,0),g=t-e,x=ts(g),L=ut(Ye(e),Ye(t)),T=ts(L),y=Ye(T-x);(g<1e-24||y>10)&&(g=0,(e==0||t==0)&&(g=1e-24,u==2&&d!=xe&&(o=0),m==2&&v!=-xe&&(a=0)));let $=g||L||1e3,k=ts($),S=cn(10,yt(k)),B=$*(g==0?e==0?.1:1:o),A=ke(Br(e-B,S/10),24),C=e>=d&&(u==1||u==3&&A<=d||u==2&&A>=d)?d:xe,I=ut(i,A<C&&e>=C?C:Ft(C,A)),b=$*(g==0?t==0?.1:1:a),M=ke(kl(t+b,S/10),24),O=t<=v&&(m==1||m==3&&M>=v||m==2&&M<=v)?v:-xe,P=Ft(c,M>O&&t<=O?O:ut(O,M));return I==P&&I==0&&(P=100),[I,P]}const xu=new Intl.NumberFormat(fn?hu.language:"en-US"),ea=e=>xu.format(e),xt=Math,tl=xt.PI,Ye=xt.abs,yt=xt.floor,Ve=xt.round,Lt=xt.ceil,Ft=xt.min,ut=xt.max,cn=xt.pow,bi=xt.sign,ts=xt.log10,Ir=xt.log2,ku=(e,t=1)=>xt.sinh(e)*t,io=(e,t=1)=>xt.asinh(e/t),xe=1/0;function yi(e){return(ts((e^e>>31)-(e>>31))|0)+1}function Co(e,t,s){return Ft(ut(e,t),s)}function Fr(e){return typeof e=="function"}function de(e){return Fr(e)?e:()=>e}const wu=()=>{},Nr=e=>e,jr=(e,t)=>t,Su=e=>null,xi=e=>!0,ki=(e,t)=>e==t,Tu=/\.\d*?(?=9{6,}|0{6,})/gm,Es=e=>{if(Wr(e)||fs.has(e))return e;const t=`${e}`,s=t.match(Tu);if(s==null)return e;let n=s[0].length-1;if(t.indexOf("e-")!=-1){let[l,o]=t.split("e");return+`${Es(l)}e${o}`}return ke(e,n)};function ws(e,t){return Es(ke(Es(e/t))*t)}function kl(e,t){return Es(Lt(Es(e/t))*t)}function Br(e,t){return Es(yt(Es(e/t))*t)}function ke(e,t=0){if(Wr(e))return e;let s=10**t,n=e*s*(1+Number.EPSILON);return Ve(n)/s}const fs=new Map;function Hr(e){return((""+e).split(".")[1]||"").length}function Pn(e,t,s,n){let l=[],o=n.map(Hr);for(let a=t;a<s;a++){let i=Ye(a),c=ke(cn(e,a),i);for(let d=0;d<n.length;d++){let v=e==10?+`${n[d]}e${a}`:n[d]*c,u=(a>=0?0:i)+(a>=o[d]?0:o[d]),m=e==10?v:ke(v,u);l.push(m),fs.set(m,u)}}return l}const An={},ta=[],dn=[null,null],ds=Array.isArray,Wr=Number.isInteger,Cu=e=>e===void 0;function wi(e){return typeof e=="string"}function wl(e){let t=!1;if(e!=null){let s=e.constructor;t=s==null||s==Object}return t}function Mu(e){return e!=null&&typeof e=="object"}const Eu=Object.getPrototypeOf(Uint8Array),qr="__proto__";function un(e,t=wl){let s;if(ds(e)){let n=e.find(l=>l!=null);if(ds(n)||t(n)){s=Array(e.length);for(let l=0;l<e.length;l++)s[l]=un(e[l],t)}else s=e.slice()}else if(e instanceof Eu)s=e.slice();else if(t(e)){s={};for(let n in e)n!=qr&&(s[n]=un(e[n],t))}else s=e;return s}function We(e){let t=arguments;for(let s=1;s<t.length;s++){let n=t[s];for(let l in n)l!=qr&&(wl(e[l])?We(e[l],un(n[l])):e[l]=un(n[l]))}return e}const Lu=0,Du=1,Au=2;function Ou(e,t,s){for(let n=0,l,o=-1;n<t.length;n++){let a=t[n];if(a>o){for(l=a-1;l>=0&&e[l]==null;)e[l--]=null;for(l=a+1;l<s&&e[l]==null;)e[o=l++]=null}}}function Pu(e,t){if(Iu(e)){let a=e[0].slice();for(let i=1;i<e.length;i++)a.push(...e[i].slice(1));return Fu(a[0])||(a=Ru(a)),a}let s=new Set;for(let a=0;a<e.length;a++){let c=e[a][0],d=c.length;for(let v=0;v<d;v++)s.add(c[v])}let n=[Array.from(s).sort((a,i)=>a-i)],l=n[0].length,o=new Map;for(let a=0;a<l;a++)o.set(n[0][a],a);for(let a=0;a<e.length;a++){let i=e[a],c=i[0];for(let d=1;d<i.length;d++){let v=i[d],u=Array(l).fill(void 0),m=t?t[a][d]:Du,g=[];for(let x=0;x<v.length;x++){let L=v[x],T=o.get(c[x]);L===null?m!=Lu&&(u[T]=L,m==Au&&g.push(T)):u[T]=L}Ou(u,g,l),n.push(u)}}return n}const zu=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function Ru(e){let t=e[0],s=t.length,n=Array(s);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,a)=>t[o]-t[a]);let l=[];for(let o=0;o<e.length;o++){let a=e[o],i=Array(s);for(let c=0;c<s;c++)i[c]=a[n[c]];l.push(i)}return l}function Iu(e){let t=e[0][0],s=t.length;for(let n=1;n<e.length;n++){let l=e[n][0];if(l.length!=s)return!1;if(l!=t){for(let o=0;o<s;o++)if(l[o]!=t[o])return!1}}return!0}function Fu(e,t=100){const s=e.length;if(s<=1)return!0;let n=0,l=s-1;for(;n<=l&&e[n]==null;)n++;for(;l>=n&&e[l]==null;)l--;if(l<=n)return!0;const o=ut(1,yt((l-n+1)/t));for(let a=e[n],i=n+o;i<=l;i+=o){const c=e[i];if(c!=null){if(c<=a)return!1;a=c}}return!0}const Ur=["January","February","March","April","May","June","July","August","September","October","November","December"],Vr=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function Gr(e){return e.slice(0,3)}const Nu=Vr.map(Gr),ju=Ur.map(Gr),Bu={MMMM:Ur,MMM:ju,WWWW:Vr,WWW:Nu};function Sn(e){return(e<10?"0":"")+e}function Hu(e){return(e<10?"00":e<100?"0":"")+e}const Wu={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>Sn(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>Sn(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>Sn(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>Sn(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>Sn(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Hu(e.getMilliseconds())};function sa(e,t){t=t||Bu;let s=[],n=/\{([a-z]+)\}|[^{]+/gi,l;for(;l=n.exec(e);)s.push(l[0][0]=="{"?Wu[l[1]]:l[0]);return o=>{let a="";for(let i=0;i<s.length;i++)a+=typeof s[i]=="string"?s[i]:s[i](o,t);return a}}const qu=new Intl.DateTimeFormat().resolvedOptions().timeZone;function Uu(e,t){let s;return t=="UTC"||t=="Etc/UTC"?s=new Date(+e+e.getTimezoneOffset()*6e4):t==qu?s=e:(s=new Date(e.toLocaleString("en-US",{timeZone:t})),s.setMilliseconds(e.getMilliseconds())),s}const Yr=e=>e%1==0,ul=[1,2,2.5,5],Vu=Pn(10,-32,0,ul),Kr=Pn(10,0,32,ul),Gu=Kr.filter(Yr),Ss=Vu.concat(Kr),na=`
`,Jr="{YYYY}",Si=na+Jr,Qr="{M}/{D}",Mn=na+Qr,Gn=Mn+"/{YY}",Zr="{aa}",Yu="{h}:{mm}",tn=Yu+Zr,Ti=na+tn,Ci=":{ss}",he=null;function Xr(e){let t=e*1e3,s=t*60,n=s*60,l=n*24,o=l*30,a=l*365,c=(e==1?Pn(10,0,3,ul).filter(Yr):Pn(10,-3,0,ul)).concat([t,t*5,t*10,t*15,t*30,s,s*5,s*10,s*15,s*30,n,n*2,n*3,n*4,n*6,n*8,n*12,l,l*2,l*3,l*4,l*5,l*6,l*7,l*8,l*9,l*10,l*15,o,o*2,o*3,o*4,o*6,a,a*2,a*5,a*10,a*25,a*50,a*100]);const d=[[a,Jr,he,he,he,he,he,he,1],[l*28,"{MMM}",Si,he,he,he,he,he,1],[l,Qr,Si,he,he,he,he,he,1],[n,"{h}"+Zr,Gn,he,Mn,he,he,he,1],[s,tn,Gn,he,Mn,he,he,he,1],[t,Ci,Gn+" "+tn,he,Mn+" "+tn,he,Ti,he,1],[e,Ci+".{fff}",Gn+" "+tn,he,Mn+" "+tn,he,Ti,he,1]];function v(u){return(m,g,x,L,T,y)=>{let $=[],k=T>=a,S=T>=o&&T<a,B=u(x),A=ke(B*e,3),C=ro(B.getFullYear(),k?0:B.getMonth(),S||k?1:B.getDate()),I=ke(C*e,3);if(S||k){let b=S?T/o:0,M=k?T/a:0,O=A==I?A:ke(ro(C.getFullYear()+M,C.getMonth()+b,1)*e,3),P=new Date(Ve(O/e)),R=P.getFullYear(),N=P.getMonth();for(let Y=0;O<=L;Y++){let te=ro(R+M*Y,N+b*Y,1),D=te-u(ke(te*e,3));O=ke((+te+D)*e,3),O<=L&&$.push(O)}}else{let b=T>=l?l:T,M=yt(x)-yt(A),O=I+M+kl(A-I,b);$.push(O);let P=u(O),R=P.getHours()+P.getMinutes()/s+P.getSeconds()/n,N=T/n,Y=m.axes[g]._space,te=y/Y;for(;O=ke(O+T,e==1?0:3),!(O>L);)if(N>1){let D=yt(ke(R+N,6))%24,j=u(O).getHours()-D;j>1&&(j=-1),O-=j*n,R=(R+N)%24;let ne=$[$.length-1];ke((O-ne)/T,3)*te>=.7&&$.push(O)}else $.push(O)}return $}}return[c,d,v]}const[Ku,Ju,Qu]=Xr(1),[Zu,Xu,ep]=Xr(.001);Pn(2,-53,53,[1]);function Mi(e,t){return e.map(s=>s.map((n,l)=>l==0||l==8||n==null?n:t(l==1||s[8]==0?n:s[1]+n)))}function Ei(e,t){return(s,n,l,o,a)=>{let i=t.find(x=>a>=x[0])||t[t.length-1],c,d,v,u,m,g;return n.map(x=>{let L=e(x),T=L.getFullYear(),y=L.getMonth(),$=L.getDate(),k=L.getHours(),S=L.getMinutes(),B=L.getSeconds(),A=T!=c&&i[2]||y!=d&&i[3]||$!=v&&i[4]||k!=u&&i[5]||S!=m&&i[6]||B!=g&&i[7]||i[1];return c=T,d=y,v=$,u=k,m=S,g=B,A(L)})}}function tp(e,t){let s=sa(t);return(n,l,o,a,i)=>l.map(c=>s(e(c)))}function ro(e,t,s){return new Date(e,t,s)}function Li(e,t){return t(e)}const sp="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function Di(e,t){return(s,n,l,o)=>o==null?Jo:t(e(n))}function np(e,t){let s=e.series[t];return s.width?s.stroke(e,t):s.points.width?s.points.stroke(e,t):null}function lp(e,t){return e.series[t].fill(e,t)}const op={show:!0,live:!0,isolate:!1,mount:wu,markers:{show:!0,width:2,stroke:np,fill:lp,dash:"solid"},idx:null,idxs:null,values:[]};function ap(e,t){let s=e.cursor.points,n=Et(),l=s.size(e,t);Me(n,Tn,l),Me(n,Cn,l);let o=l/-2;Me(n,"marginLeft",o),Me(n,"marginTop",o);let a=s.width(e,t,l);return a&&Me(n,"borderWidth",a),n}function ip(e,t){let s=e.series[t].points;return s._fill||s._stroke}function rp(e,t){let s=e.series[t].points;return s._stroke||s._fill}function cp(e,t){return e.series[t].points.size}const co=[0,0];function dp(e,t,s){return co[0]=t,co[1]=s,co}function Yn(e,t,s,n=!0){return l=>{l.button==0&&(!n||l.target==t)&&s(l)}}function uo(e,t,s,n=!0){return l=>{(!n||l.target==t)&&s(l)}}const up={show:!0,x:!0,y:!0,lock:!1,move:dp,points:{one:!1,show:ap,size:cp,width:0,stroke:rp,fill:ip},bind:{mousedown:Yn,mouseup:Yn,click:Yn,dblclick:Yn,mousemove:uo,mouseleave:uo,mouseenter:uo},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,s,n,l)=>n-l,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},ec={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},la=We({},ec,{filter:jr}),tc=We({},la,{size:10}),sc=We({},ec,{show:!1}),oa='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',nc="bold "+oa,lc=1.5,Ai={show:!0,scale:"x",stroke:Ko,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:nc,side:2,grid:la,ticks:tc,border:sc,font:oa,lineGap:lc,rotate:0},pp="Value",fp="Time",Oi={show:!0,scale:"x",auto:!1,sorted:1,min:xe,max:-xe,idxs:[]};function vp(e,t,s,n,l){return t.map(o=>o==null?"":ea(o))}function mp(e,t,s,n,l,o,a){let i=[],c=fs.get(l)||0;s=a?s:ke(kl(s,l),c);for(let d=s;d<=n;d=ke(d+l,c))i.push(Object.is(d,-0)?0:d);return i}function Mo(e,t,s,n,l,o,a){const i=[],c=e.scales[e.axes[t].scale].log,d=c==10?ts:Ir,v=yt(d(s));l=cn(c,v),c==10&&(l=Ss[It(l,Ss)]);let u=s,m=l*c;c==10&&(m=Ss[It(m,Ss)]);do i.push(u),u=u+l,c==10&&!fs.has(u)&&(u=ke(u,fs.get(l))),u>=m&&(l=u,m=l*c,c==10&&(m=Ss[It(m,Ss)]));while(u<=n);return i}function hp(e,t,s,n,l,o,a){let c=e.scales[e.axes[t].scale].asinh,d=n>c?Mo(e,t,ut(c,s),n,l):[c],v=n>=0&&s<=0?[0]:[];return(s<-c?Mo(e,t,ut(c,-n),-s,l):[c]).reverse().map(m=>-m).concat(v,d)}const oc=/./,gp=/[12357]/,_p=/[125]/,Pi=/1/,Eo=(e,t,s,n)=>e.map((l,o)=>t==4&&l==0||o%n==0&&s.test(l.toExponential()[l<0?1:0])?l:null);function $p(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=e.scales[a],c=e.valToPos,d=o._space,v=c(10,a),u=c(9,a)-v>=d?oc:c(7,a)-v>=d?gp:c(5,a)-v>=d?_p:Pi;if(u==Pi){let m=Ye(c(1,a)-v);if(m<d)return Eo(t.slice().reverse(),i.distr,u,Lt(d/m)).reverse()}return Eo(t,i.distr,u,1)}function bp(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=o._space,c=e.valToPos,d=Ye(c(1,a)-c(2,a));return d<i?Eo(t.slice().reverse(),3,oc,Lt(i/d)).reverse():t}function yp(e,t,s,n){return n==null?Jo:t==null?"":ea(t)}const zi={show:!0,scale:"y",stroke:Ko,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:nc,side:3,grid:la,ticks:tc,border:sc,font:oa,lineGap:lc,rotate:0};function xp(e,t){let s=3+(e||1)*2;return ke(s*t,3)}function kp(e,t){let{scale:s,idxs:n}=e.series[0],l=e._data[0],o=e.valToPos(l[n[0]],s,!0),a=e.valToPos(l[n[1]],s,!0),i=Ye(a-o),c=e.series[t],d=i/(c.points.space*me);return n[1]-n[0]<=d}const Ri={scale:null,auto:!0,sorted:0,min:xe,max:-xe},ac=(e,t,s,n,l)=>l,Ii={show:!0,auto:!0,sorted:0,gaps:ac,alpha:1,facets:[We({},Ri,{scale:"x"}),We({},Ri,{scale:"y"})]},Fi={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:ac,alpha:1,points:{show:kp,filter:null},values:null,min:xe,max:-xe,idxs:[],path:null,clip:null};function wp(e,t,s,n,l){return s/10}const ic={time:Kd,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},Sp=We({},ic,{time:!1,ori:1}),Ni={};function rc(e,t){let s=Ni[e];return s||(s={key:e,plots:[],sub(n){s.plots.push(n)},unsub(n){s.plots=s.plots.filter(l=>l!=n)},pub(n,l,o,a,i,c,d){for(let v=0;v<s.plots.length;v++)s.plots[v]!=l&&s.plots[v].pub(n,l,o,a,i,c,d)}},e!=null&&(Ni[e]=s)),s}const pn=1,Lo=2;function Ls(e,t,s){const n=e.mode,l=e.series[t],o=n==2?e._data[t]:e._data,a=e.scales,i=e.bbox;let c=o[0],d=n==2?o[1]:o[t],v=n==2?a[l.facets[0].scale]:a[e.series[0].scale],u=n==2?a[l.facets[1].scale]:a[l.scale],m=i.left,g=i.top,x=i.width,L=i.height,T=e.valToPosH,y=e.valToPosV;return v.ori==0?s(l,c,d,v,u,T,y,m,g,x,L,Tl,vn,Ml,dc,pc):s(l,c,d,v,u,y,T,g,m,L,x,Cl,mn,ra,uc,fc)}function aa(e,t){let s=0,n=0,l=fe(e.bands,ta);for(let o=0;o<l.length;o++){let a=l[o];a.series[0]==t?s=a.dir:a.series[1]==t&&(a.dir==1?n|=1:n|=2)}return[s,n==1?-1:n==2?1:n==3?2:0]}function Tp(e,t,s,n,l){let o=e.mode,a=e.series[t],i=o==2?a.facets[1].scale:a.scale,c=e.scales[i];return l==-1?c.min:l==1?c.max:c.distr==3?c.dir==1?c.min:c.max:0}function ss(e,t,s,n,l,o){return Ls(e,t,(a,i,c,d,v,u,m,g,x,L,T)=>{let y=a.pxRound;const $=d.dir*(d.ori==0?1:-1),k=d.ori==0?vn:mn;let S,B;$==1?(S=s,B=n):(S=n,B=s);let A=y(u(i[S],d,L,g)),C=y(m(c[S],v,T,x)),I=y(u(i[B],d,L,g)),b=y(m(o==1?v.max:v.min,v,T,x)),M=new Path2D(l);return k(M,I,b),k(M,A,b),k(M,A,C),M})}function Sl(e,t,s,n,l,o){let a=null;if(e.length>0){a=new Path2D;const i=t==0?Ml:ra;let c=s;for(let u=0;u<e.length;u++){let m=e[u];if(m[1]>m[0]){let g=m[0]-c;g>0&&i(a,c,n,g,n+o),c=m[1]}}let d=s+l-c,v=10;d>0&&i(a,c,n-v/2,d,n+o+v)}return a}function Cp(e,t,s){let n=e[e.length-1];n&&n[0]==t?n[1]=s:e.push([t,s])}function ia(e,t,s,n,l,o,a){let i=[],c=e.length;for(let d=l==1?s:n;d>=s&&d<=n;d+=l)if(t[d]===null){let u=d,m=d;if(l==1)for(;++d<=n&&t[d]===null;)m=d;else for(;--d>=s&&t[d]===null;)m=d;let g=o(e[u]),x=m==u?g:o(e[m]),L=u-l;g=a<=0&&L>=0&&L<c?o(e[L]):g;let y=m+l;x=a>=0&&y>=0&&y<c?o(e[y]):x,x>=g&&i.push([g,x])}return i}function ji(e){return e==0?Nr:e==1?Ve:t=>ws(t,e)}function cc(e){let t=e==0?Tl:Cl,s=e==0?(l,o,a,i,c,d)=>{l.arcTo(o,a,i,c,d)}:(l,o,a,i,c,d)=>{l.arcTo(a,o,c,i,d)},n=e==0?(l,o,a,i,c)=>{l.rect(o,a,i,c)}:(l,o,a,i,c)=>{l.rect(a,o,c,i)};return(l,o,a,i,c,d=0,v=0)=>{d==0&&v==0?n(l,o,a,i,c):(d=Ft(d,i/2,c/2),v=Ft(v,i/2,c/2),t(l,o+d,a),s(l,o+i,a,o+i,a+c,d),s(l,o+i,a+c,o,a+c,v),s(l,o,a+c,o,a,v),s(l,o,a,o+i,a,d),l.closePath())}}const Tl=(e,t,s)=>{e.moveTo(t,s)},Cl=(e,t,s)=>{e.moveTo(s,t)},vn=(e,t,s)=>{e.lineTo(t,s)},mn=(e,t,s)=>{e.lineTo(s,t)},Ml=cc(0),ra=cc(1),dc=(e,t,s,n,l,o)=>{e.arc(t,s,n,l,o)},uc=(e,t,s,n,l,o)=>{e.arc(s,t,n,l,o)},pc=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(t,s,n,l,o,a)},fc=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(s,t,l,n,a,o)};function vc(e){return(t,s,n,l,o)=>Ls(t,s,(a,i,c,d,v,u,m,g,x,L,T)=>{let{pxRound:y,points:$}=a,k,S;d.ori==0?(k=Tl,S=dc):(k=Cl,S=uc);const B=ke($.width*me,3);let A=($.size-$.width)/2*me,C=ke(A*2,3),I=new Path2D,b=new Path2D,{left:M,top:O,width:P,height:R}=t.bbox;Ml(b,M-C,O-C,P+C*2,R+C*2);const N=Y=>{if(c[Y]!=null){let te=y(u(i[Y],d,L,g)),D=y(m(c[Y],v,T,x));k(I,te+A,D),S(I,te,D,A,0,tl*2)}};if(o)o.forEach(N);else for(let Y=n;Y<=l;Y++)N(Y);return{stroke:B>0?I:null,fill:I,clip:b,flags:pn|Lo}})}function mc(e){return(t,s,n,l,o,a)=>{n!=l&&(o!=n&&a!=n&&e(t,s,n),o!=l&&a!=l&&e(t,s,l),e(t,s,a))}}const Mp=mc(vn),Ep=mc(mn);function hc(e){const t=fe(e==null?void 0:e.alignGaps,0);return(s,n,l,o)=>Ls(s,n,(a,i,c,d,v,u,m,g,x,L,T)=>{[l,o]=yl(c,l,o);let y=a.pxRound,$=R=>y(u(R,d,L,g)),k=R=>y(m(R,v,T,x)),S,B;d.ori==0?(S=vn,B=Mp):(S=mn,B=Ep);const A=d.dir*(d.ori==0?1:-1),C={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:pn},I=C.stroke;let b=!1;if(o-l>=L*4){let R=V=>s.posToVal(V,d.key,!0),N=null,Y=null,te,D,H,G=$(i[A==1?l:o]),j=$(i[l]),ne=$(i[o]),ee=R(A==1?j+1:ne-1);for(let V=A==1?l:o;V>=l&&V<=o;V+=A){let be=i[V],De=(A==1?be<ee:be>ee)?G:$(be),ue=c[V];De==G?ue!=null?(D=ue,N==null?(S(I,De,k(D)),te=N=Y=D):D<N?N=D:D>Y&&(Y=D)):ue===null&&(b=!0):(N!=null&&B(I,G,k(N),k(Y),k(te),k(D)),ue!=null?(D=ue,S(I,De,k(D)),N=Y=te=D):(N=Y=null,ue===null&&(b=!0)),G=De,ee=R(G+A))}N!=null&&N!=Y&&H!=G&&B(I,G,k(N),k(Y),k(te),k(D))}else for(let R=A==1?l:o;R>=l&&R<=o;R+=A){let N=c[R];N===null?b=!0:N!=null&&S(I,$(i[R]),k(N))}let[O,P]=aa(s,n);if(a.fill!=null||O!=0){let R=C.fill=new Path2D(I),N=a.fillTo(s,n,a.min,a.max,O),Y=k(N),te=$(i[l]),D=$(i[o]);A==-1&&([D,te]=[te,D]),S(R,D,Y),S(R,te,Y)}if(!a.spanGaps){let R=[];b&&R.push(...ia(i,c,l,o,A,$,t)),C.gaps=R=a.gaps(s,n,l,o,R),C.clip=Sl(R,d.ori,g,x,L,T)}return P!=0&&(C.band=P==2?[ss(s,n,l,o,I,-1),ss(s,n,l,o,I,1)]:ss(s,n,l,o,I,P)),C})}function Lp(e){const t=fe(e.align,1),s=fe(e.ascDesc,!1),n=fe(e.alignGaps,0),l=fe(e.extend,!1);return(o,a,i,c)=>Ls(o,a,(d,v,u,m,g,x,L,T,y,$,k)=>{[i,c]=yl(u,i,c);let S=d.pxRound,{left:B,width:A}=o.bbox,C=j=>S(x(j,m,$,T)),I=j=>S(L(j,g,k,y)),b=m.ori==0?vn:mn;const M={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:pn},O=M.stroke,P=m.dir*(m.ori==0?1:-1);let R=I(u[P==1?i:c]),N=C(v[P==1?i:c]),Y=N,te=N;l&&t==-1&&(te=B,b(O,te,R)),b(O,N,R);for(let j=P==1?i:c;j>=i&&j<=c;j+=P){let ne=u[j];if(ne==null)continue;let ee=C(v[j]),V=I(ne);t==1?b(O,ee,R):b(O,Y,V),b(O,ee,V),R=V,Y=ee}let D=Y;l&&t==1&&(D=B+A,b(O,D,R));let[H,G]=aa(o,a);if(d.fill!=null||H!=0){let j=M.fill=new Path2D(O),ne=d.fillTo(o,a,d.min,d.max,H),ee=I(ne);b(j,D,ee),b(j,te,ee)}if(!d.spanGaps){let j=[];j.push(...ia(v,u,i,c,P,C,n));let ne=d.width*me/2,ee=s||t==1?ne:-ne,V=s||t==-1?-ne:ne;j.forEach(be=>{be[0]+=ee,be[1]+=V}),M.gaps=j=d.gaps(o,a,i,c,j),M.clip=Sl(j,m.ori,T,y,$,k)}return G!=0&&(M.band=G==2?[ss(o,a,i,c,O,-1),ss(o,a,i,c,O,1)]:ss(o,a,i,c,O,G)),M})}function Bi(e,t,s,n,l,o,a=xe){if(e.length>1){let i=null;for(let c=0,d=1/0;c<e.length;c++)if(t[c]!==void 0){if(i!=null){let v=Ye(e[c]-e[i]);v<d&&(d=v,a=Ye(s(e[c],n,l,o)-s(e[i],n,l,o)))}i=c}}return a}function Dp(e){e=e||An;const t=fe(e.size,[.6,xe,1]),s=e.align||0,n=e.gap||0;let l=e.radius;l=l==null?[0,0]:typeof l=="number"?[l,0]:l;const o=de(l),a=1-t[0],i=fe(t[1],xe),c=fe(t[2],1),d=fe(e.disp,An),v=fe(e.each,g=>{}),{fill:u,stroke:m}=d;return(g,x,L,T)=>Ls(g,x,(y,$,k,S,B,A,C,I,b,M,O)=>{let P=y.pxRound,R=s,N=n*me,Y=i*me,te=c*me,D,H;S.ori==0?[D,H]=o(g,x):[H,D]=o(g,x);const G=S.dir*(S.ori==0?1:-1);let j=S.ori==0?Ml:ra,ne=S.ori==0?v:(Z,we,Ue,Ps,hs,Ht,gs)=>{v(Z,we,Ue,hs,Ps,gs,Ht)},ee=fe(g.bands,ta).find(Z=>Z.series[0]==x),V=ee!=null?ee.dir:0,be=y.fillTo(g,x,y.min,y.max,V),Pe=P(C(be,B,O,b)),De,ue,Dt,mt=M,ze=P(y.width*me),Bt=!1,Jt=null,kt=null,ns=null,Ds=null;u!=null&&(ze==0||m!=null)&&(Bt=!0,Jt=u.values(g,x,L,T),kt=new Map,new Set(Jt).forEach(Z=>{Z!=null&&kt.set(Z,new Path2D)}),ze>0&&(ns=m.values(g,x,L,T),Ds=new Map,new Set(ns).forEach(Z=>{Z!=null&&Ds.set(Z,new Path2D)})));let{x0:As,size:hn}=d;if(As!=null&&hn!=null){R=1,$=As.values(g,x,L,T),As.unit==2&&($=$.map(Ue=>g.posToVal(I+Ue*M,S.key,!0)));let Z=hn.values(g,x,L,T);hn.unit==2?ue=Z[0]*M:ue=A(Z[0],S,M,I)-A(0,S,M,I),mt=Bi($,k,A,S,M,I,mt),Dt=mt-ue+N}else mt=Bi($,k,A,S,M,I,mt),Dt=mt*a+N,ue=mt-Dt;Dt<1&&(Dt=0),ze>=ue/2&&(ze=0),Dt<5&&(P=Nr);let zn=Dt>0,vs=mt-Dt-(zn?ze:0);ue=P(Co(vs,te,Y)),De=(R==0?ue/2:R==G?0:ue)-R*G*((R==0?N/2:0)+(zn?ze/2:0));const it={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},Os=Bt?null:new Path2D;let Qt=null;if(ee!=null)Qt=g.data[ee.series[1]];else{let{y0:Z,y1:we}=d;Z!=null&&we!=null&&(k=we.values(g,x,L,T),Qt=Z.values(g,x,L,T))}let ms=D*ue,ie=H*ue;for(let Z=G==1?L:T;Z>=L&&Z<=T;Z+=G){let we=k[Z];if(we==null)continue;if(Qt!=null){let pt=Qt[Z]??0;if(we-pt==0)continue;Pe=C(pt,B,O,b)}let Ue=S.distr!=2||d!=null?$[Z]:Z,Ps=A(Ue,S,M,I),hs=C(fe(we,be),B,O,b),Ht=P(Ps-De),gs=P(ut(hs,Pe)),ht=P(Ft(hs,Pe)),wt=gs-ht;if(we!=null){let pt=we<0?ie:ms,At=we<0?ms:ie;Bt?(ze>0&&ns[Z]!=null&&j(Ds.get(ns[Z]),Ht,ht+yt(ze/2),ue,ut(0,wt-ze),pt,At),Jt[Z]!=null&&j(kt.get(Jt[Z]),Ht,ht+yt(ze/2),ue,ut(0,wt-ze),pt,At)):j(Os,Ht,ht+yt(ze/2),ue,ut(0,wt-ze),pt,At),ne(g,x,Z,Ht-ze/2,ht,ue+ze,wt)}}return ze>0?it.stroke=Bt?Ds:Os:Bt||(it._fill=y.width==0?y._fill:y._stroke??y._fill,it.width=0),it.fill=Bt?kt:Os,it})}function Ap(e,t){const s=fe(t==null?void 0:t.alignGaps,0);return(n,l,o,a)=>Ls(n,l,(i,c,d,v,u,m,g,x,L,T,y)=>{[o,a]=yl(d,o,a);let $=i.pxRound,k=D=>$(m(D,v,T,x)),S=D=>$(g(D,u,y,L)),B,A,C;v.ori==0?(B=Tl,C=vn,A=pc):(B=Cl,C=mn,A=fc);const I=v.dir*(v.ori==0?1:-1);let b=k(c[I==1?o:a]),M=b,O=[],P=[];for(let D=I==1?o:a;D>=o&&D<=a;D+=I)if(d[D]!=null){let G=c[D],j=k(G);O.push(M=j),P.push(S(d[D]))}const R={stroke:e(O,P,B,C,A,$),fill:null,clip:null,band:null,gaps:null,flags:pn},N=R.stroke;let[Y,te]=aa(n,l);if(i.fill!=null||Y!=0){let D=R.fill=new Path2D(N),H=i.fillTo(n,l,i.min,i.max,Y),G=S(H);C(D,M,G),C(D,b,G)}if(!i.spanGaps){let D=[];D.push(...ia(c,d,o,a,I,k,s)),R.gaps=D=i.gaps(n,l,o,a,D),R.clip=Sl(D,v.ori,x,L,T,y)}return te!=0&&(R.band=te==2?[ss(n,l,o,a,N,-1),ss(n,l,o,a,N,1)]:ss(n,l,o,a,N,te)),R})}function Op(e){return Ap(Pp,e)}function Pp(e,t,s,n,l,o){const a=e.length;if(a<2)return null;const i=new Path2D;if(s(i,e[0],t[0]),a==2)n(i,e[1],t[1]);else{let c=Array(a),d=Array(a-1),v=Array(a-1),u=Array(a-1);for(let m=0;m<a-1;m++)v[m]=t[m+1]-t[m],u[m]=e[m+1]-e[m],d[m]=v[m]/u[m];c[0]=d[0];for(let m=1;m<a-1;m++)d[m]===0||d[m-1]===0||d[m-1]>0!=d[m]>0?c[m]=0:(c[m]=3*(u[m-1]+u[m])/((2*u[m]+u[m-1])/d[m-1]+(u[m]+2*u[m-1])/d[m]),isFinite(c[m])||(c[m]=0));c[a-1]=d[a-2];for(let m=0;m<a-1;m++)l(i,e[m]+u[m]/3,t[m]+c[m]*u[m]/3,e[m+1]-u[m]/3,t[m+1]-c[m+1]*u[m]/3,e[m+1],t[m+1])}return i}const Do=new Set;function Hi(){for(let e of Do)e.syncRect(!0)}fn&&(Cs(vu,on,Hi),Cs(mu,on,Hi,!0),Cs(cl,on,()=>{ot.pxRatio=me}));const zp=hc(),Rp=vc();function Wi(e,t,s,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,a)=>Ao(o,a,t,s))}function Ip(e,t){return e.map((s,n)=>n==0?{}:We({},t,s))}function Ao(e,t,s,n){return We({},t==0?s:n,e)}function gc(e,t,s){return t==null?dn:[t,s]}const Fp=gc;function Np(e,t,s){return t==null?dn:dl(t,s,Xo,!0)}function _c(e,t,s,n){return t==null?dn:xl(t,s,e.scales[n].log,!1)}const jp=_c;function $c(e,t,s,n){return t==null?dn:Zo(t,s,e.scales[n].log,!1)}const Bp=$c;function Hp(e,t,s,n,l){let o=ut(yi(e),yi(t)),a=t-e,i=It(l/n*a,s);do{let c=s[i],d=n*c/a;if(d>=l&&o+(c<5?fs.get(c):0)<=17)return[c,d]}while(++i<s.length);return[0,0]}function qi(e){let t,s;return e=e.replace(/(\d+)px/,(n,l)=>(t=Ve((s=+l)*me))+"px"),[e,t,s]}function Wp(e){e.show&&[e.font,e.labelFont].forEach(t=>{let s=ke(t[2]*me,1);t[0]=t[0].replace(/[0-9.]+px/,s+"px"),t[1]=s})}function ot(e,t,s){const n={mode:fe(e.mode,1)},l=n.mode;function o(p,f,h,_){let w=f.valToPct(p);return _+h*(f.dir==-1?1-w:w)}function a(p,f,h,_){let w=f.valToPct(p);return _+h*(f.dir==-1?w:1-w)}function i(p,f,h,_){return f.ori==0?o(p,f,h,_):a(p,f,h,_)}n.valToPosH=o,n.valToPosV=a;let c=!1;n.status=0;const d=n.root=Et(Jd);if(e.id!=null&&(d.id=e.id),bt(d,e.class),e.title){let p=Et(Xd,d);p.textContent=e.title}const v=Rt("canvas"),u=n.ctx=v.getContext("2d"),m=Et(eu,d);Cs("click",m,p=>{p.target===x&&(Se!=Us||Ae!=Vs)&&nt.click(n,p)},!0);const g=n.under=Et(tu,m);m.appendChild(v);const x=n.over=Et(su,m);e=un(e);const L=+fe(e.pxAlign,1),T=ji(L);(e.plugins||[]).forEach(p=>{p.opts&&(e=p.opts(n,e)||e)});const y=e.ms||.001,$=n.series=l==1?Wi(e.series||[],Oi,Fi,!1):Ip(e.series||[null],Ii),k=n.axes=Wi(e.axes||[],Ai,zi,!0),S=n.scales={},B=n.bands=e.bands||[];B.forEach(p=>{p.fill=de(p.fill||null),p.dir=fe(p.dir,-1)});const A=l==2?$[1].facets[0].scale:$[0].scale,C={axes:Uc,series:jc},I=(e.drawOrder||["axes","series"]).map(p=>C[p]);function b(p){const f=p.distr==3?h=>ts(h>0?h:p.clamp(n,h,p.min,p.max,p.key)):p.distr==4?h=>io(h,p.asinh):p.distr==100?h=>p.fwd(h):h=>h;return h=>{let _=f(h),{_min:w,_max:E}=p,F=E-w;return(_-w)/F}}function M(p){let f=S[p];if(f==null){let h=(e.scales||An)[p]||An;if(h.from!=null){M(h.from);let _=We({},S[h.from],h,{key:p});_.valToPct=b(_),S[p]=_}else{f=S[p]=We({},p==A?ic:Sp,h),f.key=p;let _=f.time,w=f.range,E=ds(w);if((p!=A||l==2&&!_)&&(E&&(w[0]==null||w[1]==null)&&(w={min:w[0]==null?_i:{mode:1,hard:w[0],soft:w[0]},max:w[1]==null?_i:{mode:1,hard:w[1],soft:w[1]}},E=!1),!E&&wl(w))){let F=w;w=(W,U,J)=>U==null?dn:dl(U,J,F)}f.range=de(w||(_?Fp:p==A?f.distr==3?jp:f.distr==4?Bp:gc:f.distr==3?_c:f.distr==4?$c:Np)),f.auto=de(E?!1:f.auto),f.clamp=de(f.clamp||wp),f._min=f._max=null,f.valToPct=b(f)}}}M("x"),M("y"),l==1&&$.forEach(p=>{M(p.scale)}),k.forEach(p=>{M(p.scale)});for(let p in e.scales)M(p);const O=S[A],P=O.distr;let R,N;O.ori==0?(bt(d,Qd),R=o,N=a):(bt(d,Zd),R=a,N=o);const Y={};for(let p in S){let f=S[p];(f.min!=null||f.max!=null)&&(Y[p]={min:f.min,max:f.max},f.min=f.max=null)}const te=e.tzDate||(p=>new Date(Ve(p/y))),D=e.fmtDate||sa,H=y==1?Qu(te):ep(te),G=Ei(te,Mi(y==1?Ju:Xu,D)),j=Di(te,Li(sp,D)),ne=[],ee=n.legend=We({},op,e.legend),V=n.cursor=We({},up,{drag:{y:l==2}},e.cursor),be=ee.show,Pe=V.show,De=ee.markers;ee.idxs=ne,De.width=de(De.width),De.dash=de(De.dash),De.stroke=de(De.stroke),De.fill=de(De.fill);let ue,Dt,mt,ze=[],Bt=[],Jt,kt=!1,ns={};if(ee.live){const p=$[1]?$[1].values:null;kt=p!=null,Jt=kt?p(n,1,0):{_:0};for(let f in Jt)ns[f]=Jo}if(be)if(ue=Rt("table",ru,d),mt=Rt("tbody",null,ue),ee.mount(n,ue),kt){Dt=Rt("thead",null,ue,mt);let p=Rt("tr",null,Dt);Rt("th",null,p);for(var Ds in Jt)Rt("th",oi,p).textContent=Ds}else bt(ue,du),ee.live&&bt(ue,cu);const As={show:!0},hn={show:!1};function zn(p,f){if(f==0&&(kt||!ee.live||l==2))return dn;let h=[],_=Rt("tr",uu,mt,mt.childNodes[f]);bt(_,p.class),p.show||bt(_,Ts);let w=Rt("th",null,_);if(De.show){let W=Et(pu,w);if(f>0){let U=De.width(n,f);U&&(W.style.border=U+"px "+De.dash(n,f)+" "+De.stroke(n,f)),W.style.background=De.fill(n,f)}}let E=Et(oi,w);p.label instanceof HTMLElement?E.appendChild(p.label):E.textContent=p.label,f>0&&(De.show||(E.style.color=p.width>0?De.stroke(n,f):De.fill(n,f)),it("click",w,W=>{if(V._lock)return;$s(W);let U=$.indexOf(p);if((W.ctrlKey||W.metaKey)!=ee.isolate){let J=$.some((Q,X)=>X>0&&X!=U&&Q.show);$.forEach((Q,X)=>{X>0&&qt(X,J?X==U?As:hn:As,!0,Be.setSeries)})}else qt(U,{show:!p.show},!0,Be.setSeries)},!1),Rs&&it(ci,w,W=>{V._lock||($s(W),qt($.indexOf(p),Ys,!0,Be.setSeries))},!1));for(var F in Jt){let W=Rt("td",fu,_);W.textContent="--",h.push(W)}return[_,h]}const vs=new Map;function it(p,f,h,_=!0){const w=vs.get(f)||{},E=V.bind[p](n,f,h,_);E&&(Cs(p,f,w[p]=E),vs.set(f,w))}function Os(p,f,h){const _=vs.get(f)||{};for(let w in _)(p==null||w==p)&&(To(w,f,_[w]),delete _[w]);p==null&&vs.delete(f)}let Qt=0,ms=0,ie=0,Z=0,we=0,Ue=0,Ps=we,hs=Ue,Ht=ie,gs=Z,ht=0,wt=0,pt=0,At=0;n.bbox={};let Ll=!1,Rn=!1,zs=!1,_s=!1,In=!1,St=!1;function Dl(p,f,h){(h||p!=n.width||f!=n.height)&&ua(p,f),Bs(!1),zs=!0,Rn=!0,Hs()}function ua(p,f){n.width=Qt=ie=p,n.height=ms=Z=f,we=Ue=0,Oc(),Pc();let h=n.bbox;ht=h.left=ws(we*me,.5),wt=h.top=ws(Ue*me,.5),pt=h.width=ws(ie*me,.5),At=h.height=ws(Z*me,.5)}const Lc=3;function Dc(){let p=!1,f=0;for(;!p;){f++;let h=Wc(f),_=qc(f);p=f==Lc||h&&_,p||(ua(n.width,n.height),Rn=!0)}}function Ac({width:p,height:f}){Dl(p,f)}n.setSize=Ac;function Oc(){let p=!1,f=!1,h=!1,_=!1;k.forEach((w,E)=>{if(w.show&&w._show){let{side:F,_size:W}=w,U=F%2,J=w.label!=null?w.labelSize:0,Q=W+J;Q>0&&(U?(ie-=Q,F==3?(we+=Q,_=!0):h=!0):(Z-=Q,F==0?(Ue+=Q,p=!0):f=!0))}}),bs[0]=p,bs[1]=h,bs[2]=f,bs[3]=_,ie-=ls[1]+ls[3],we+=ls[3],Z-=ls[2]+ls[0],Ue+=ls[0]}function Pc(){let p=we+ie,f=Ue+Z,h=we,_=Ue;function w(E,F){switch(E){case 1:return p+=F,p-F;case 2:return f+=F,f-F;case 3:return h-=F,h+F;case 0:return _-=F,_+F}}k.forEach((E,F)=>{if(E.show&&E._show){let W=E.side;E._pos=w(W,E._size),E.label!=null&&(E._lpos=w(W,E.labelSize))}})}if(V.dataIdx==null){let p=V.hover,f=p.skip=new Set(p.skip??[]);f.add(void 0);let h=p.prox=de(p.prox),_=p.bias??(p.bias=0);V.dataIdx=(w,E,F,W)=>{if(E==0)return F;let U=F,J=h(w,E,F,W)??xe,Q=J>=0&&J<xe,X=O.ori==0?ie:Z,oe=V.left,ve=t[0],pe=t[E];if(f.has(pe[F])){U=null;let ce=null,le=null,se;if(_==0||_==-1)for(se=F;ce==null&&se-- >0;)f.has(pe[se])||(ce=se);if(_==0||_==1)for(se=F;le==null&&se++<pe.length;)f.has(pe[se])||(le=se);if(ce!=null||le!=null)if(Q){let Ce=ce==null?-1/0:R(ve[ce],O,X,0),Ie=le==null?1/0:R(ve[le],O,X,0),tt=oe-Ce,$e=Ie-oe;tt<=$e?tt<=J&&(U=ce):$e<=J&&(U=le)}else U=le==null?ce:ce==null?le:F-ce<=le-F?ce:le}else Q&&Ye(oe-R(ve[F],O,X,0))>J&&(U=null);return U}}const $s=p=>{V.event=p};V.idxs=ne,V._lock=!1;let at=V.points;at.show=de(at.show),at.size=de(at.size),at.stroke=de(at.stroke),at.width=de(at.width),at.fill=de(at.fill);const Wt=n.focus=We({},e.focus||{alpha:.3},V.focus),Rs=Wt.prox>=0,Is=Rs&&at.one;let Tt=[],Fs=[],Ns=[];function pa(p,f){let h=at.show(n,f);if(h instanceof HTMLElement)return bt(h,iu),bt(h,p.class),Yt(h,-10,-10,ie,Z),x.insertBefore(h,Tt[f]),h}function fa(p,f){if(l==1||f>0){let h=l==1&&S[p.scale].time,_=p.value;p.value=h?wi(_)?Di(te,Li(_,D)):_||j:_||yp,p.label=p.label||(h?fp:pp)}if(Is||f>0){p.width=p.width==null?1:p.width,p.paths=p.paths||zp||Su,p.fillTo=de(p.fillTo||Tp),p.pxAlign=+fe(p.pxAlign,L),p.pxRound=ji(p.pxAlign),p.stroke=de(p.stroke||null),p.fill=de(p.fill||null),p._stroke=p._fill=p._paths=p._focus=null;let h=xp(ut(1,p.width),1),_=p.points=We({},{size:h,width:ut(1,h*.2),stroke:p.stroke,space:h*2,paths:Rp,_stroke:null,_fill:null},p.points);_.show=de(_.show),_.filter=de(_.filter),_.fill=de(_.fill),_.stroke=de(_.stroke),_.paths=de(_.paths),_.pxAlign=p.pxAlign}if(be){let h=zn(p,f);ze.splice(f,0,h[0]),Bt.splice(f,0,h[1]),ee.values.push(null)}if(Pe){ne.splice(f,0,null);let h=null;Is?f==0&&(h=pa(p,f)):f>0&&(h=pa(p,f)),Tt.splice(f,0,h),Fs.splice(f,0,0),Ns.splice(f,0,0)}et("addSeries",f)}function zc(p,f){f=f??$.length,p=l==1?Ao(p,f,Oi,Fi):Ao(p,f,{},Ii),$.splice(f,0,p),fa($[f],f)}n.addSeries=zc;function Rc(p){if($.splice(p,1),be){ee.values.splice(p,1),Bt.splice(p,1);let f=ze.splice(p,1)[0];Os(null,f.firstChild),f.remove()}Pe&&(ne.splice(p,1),Tt.splice(p,1)[0].remove(),Fs.splice(p,1),Ns.splice(p,1)),et("delSeries",p)}n.delSeries=Rc;const bs=[!1,!1,!1,!1];function Ic(p,f){if(p._show=p.show,p.show){let h=p.side%2,_=S[p.scale];_==null&&(p.scale=h?$[1].scale:A,_=S[p.scale]);let w=_.time;p.size=de(p.size),p.space=de(p.space),p.rotate=de(p.rotate),ds(p.incrs)&&p.incrs.forEach(F=>{!fs.has(F)&&fs.set(F,Hr(F))}),p.incrs=de(p.incrs||(_.distr==2?Gu:w?y==1?Ku:Zu:Ss)),p.splits=de(p.splits||(w&&_.distr==1?H:_.distr==3?Mo:_.distr==4?hp:mp)),p.stroke=de(p.stroke),p.grid.stroke=de(p.grid.stroke),p.ticks.stroke=de(p.ticks.stroke),p.border.stroke=de(p.border.stroke);let E=p.values;p.values=ds(E)&&!ds(E[0])?de(E):w?ds(E)?Ei(te,Mi(E,D)):wi(E)?tp(te,E):E||G:E||vp,p.filter=de(p.filter||(_.distr>=3&&_.log==10?$p:_.distr==3&&_.log==2?bp:jr)),p.font=qi(p.font),p.labelFont=qi(p.labelFont),p._size=p.size(n,null,f,0),p._space=p._rotate=p._incrs=p._found=p._splits=p._values=null,p._size>0&&(bs[f]=!0,p._el=Et(nu,m))}}function gn(p,f,h,_){let[w,E,F,W]=h,U=f%2,J=0;return U==0&&(W||E)&&(J=f==0&&!w||f==2&&!F?Ve(Ai.size/3):0),U==1&&(w||F)&&(J=f==1&&!E||f==3&&!W?Ve(zi.size/2):0),J}const va=n.padding=(e.padding||[gn,gn,gn,gn]).map(p=>de(fe(p,gn))),ls=n._padding=va.map((p,f)=>p(n,f,bs,0));let st,Je=null,Qe=null;const Fn=l==1?$[0].idxs:null;let Ot=null,_n=!1;function ma(p,f){if(t=p??[],n.data=n._data=t,l==2){st=0;for(let h=1;h<$.length;h++)st+=t[h][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),Ot=t[0],st=Ot.length;let h=t;if(P==2){h=t.slice();let _=h[0]=Array(st);for(let w=0;w<st;w++)_[w]=w}n._data=t=h}if(Bs(!0),et("setData"),P==2&&(zs=!0),f!==!1){let h=O;h.auto(n,_n)?Al():as(A,h.min,h.max),_s=_s||V.left>=0,St=!0,Hs()}}n.setData=ma;function Al(){_n=!0;let p,f;l==1&&(st>0?(Je=Fn[0]=0,Qe=Fn[1]=st-1,p=t[0][Je],f=t[0][Qe],P==2?(p=Je,f=Qe):p==f&&(P==3?[p,f]=xl(p,p,O.log,!1):P==4?[p,f]=Zo(p,p,O.log,!1):O.time?f=p+Ve(86400/y):[p,f]=dl(p,f,Xo,!0))):(Je=Fn[0]=p=null,Qe=Fn[1]=f=null)),as(A,p,f)}let Nn,js,Ol,Pl,zl,Rl,Il,Fl,Nl,ft;function ha(p,f,h,_,w,E){p??(p=ii),h??(h=ta),_??(_="butt"),w??(w=ii),E??(E="round"),p!=Nn&&(u.strokeStyle=Nn=p),w!=js&&(u.fillStyle=js=w),f!=Ol&&(u.lineWidth=Ol=f),E!=zl&&(u.lineJoin=zl=E),_!=Rl&&(u.lineCap=Rl=_),h!=Pl&&u.setLineDash(Pl=h)}function ga(p,f,h,_){f!=js&&(u.fillStyle=js=f),p!=Il&&(u.font=Il=p),h!=Fl&&(u.textAlign=Fl=h),_!=Nl&&(u.textBaseline=Nl=_)}function jl(p,f,h,_,w=0){if(_.length>0&&p.auto(n,_n)&&(f==null||f.min==null)){let E=fe(Je,0),F=fe(Qe,_.length-1),W=h.min==null?$u(_,E,F,w,p.distr==3):[h.min,h.max];p.min=Ft(p.min,h.min=W[0]),p.max=ut(p.max,h.max=W[1])}}const _a={min:null,max:null};function Fc(){for(let _ in S){let w=S[_];Y[_]==null&&(w.min==null||Y[A]!=null&&w.auto(n,_n))&&(Y[_]=_a)}for(let _ in S){let w=S[_];Y[_]==null&&w.from!=null&&Y[w.from]!=null&&(Y[_]=_a)}Y[A]!=null&&Bs(!0);let p={};for(let _ in Y){let w=Y[_];if(w!=null){let E=p[_]=un(S[_],Mu);if(w.min!=null)We(E,w);else if(_!=A||l==2)if(st==0&&E.from==null){let F=E.range(n,null,null,_);E.min=F[0],E.max=F[1]}else E.min=xe,E.max=-xe}}if(st>0){$.forEach((_,w)=>{if(l==1){let E=_.scale,F=Y[E];if(F==null)return;let W=p[E];if(w==0){let U=W.range(n,W.min,W.max,E);W.min=U[0],W.max=U[1],Je=It(W.min,t[0]),Qe=It(W.max,t[0]),Qe-Je>1&&(t[0][Je]<W.min&&Je++,t[0][Qe]>W.max&&Qe--),_.min=Ot[Je],_.max=Ot[Qe]}else _.show&&_.auto&&jl(W,F,_,t[w],_.sorted);_.idxs[0]=Je,_.idxs[1]=Qe}else if(w>0&&_.show&&_.auto){let[E,F]=_.facets,W=E.scale,U=F.scale,[J,Q]=t[w],X=p[W],oe=p[U];X!=null&&jl(X,Y[W],E,J,E.sorted),oe!=null&&jl(oe,Y[U],F,Q,F.sorted),_.min=F.min,_.max=F.max}});for(let _ in p){let w=p[_],E=Y[_];if(w.from==null&&(E==null||E.min==null)){let F=w.range(n,w.min==xe?null:w.min,w.max==-xe?null:w.max,_);w.min=F[0],w.max=F[1]}}}for(let _ in p){let w=p[_];if(w.from!=null){let E=p[w.from];if(E.min==null)w.min=w.max=null;else{let F=w.range(n,E.min,E.max,_);w.min=F[0],w.max=F[1]}}}let f={},h=!1;for(let _ in p){let w=p[_],E=S[_];if(E.min!=w.min||E.max!=w.max){E.min=w.min,E.max=w.max;let F=E.distr;E._min=F==3?ts(E.min):F==4?io(E.min,E.asinh):F==100?E.fwd(E.min):E.min,E._max=F==3?ts(E.max):F==4?io(E.max,E.asinh):F==100?E.fwd(E.max):E.max,f[_]=h=!0}}if(h){$.forEach((_,w)=>{l==2?w>0&&f.y&&(_._paths=null):f[_.scale]&&(_._paths=null)});for(let _ in f)zs=!0,et("setScale",_);Pe&&V.left>=0&&(_s=St=!0)}for(let _ in Y)Y[_]=null}function Nc(p){let f=Co(Je-1,0,st-1),h=Co(Qe+1,0,st-1);for(;p[f]==null&&f>0;)f--;for(;p[h]==null&&h<st-1;)h++;return[f,h]}function jc(){if(st>0){let p=$.some(f=>f._focus)&&ft!=Wt.alpha;p&&(u.globalAlpha=ft=Wt.alpha),$.forEach((f,h)=>{if(h>0&&f.show&&($a(h,!1),$a(h,!0),f._paths==null)){let _=ft;ft!=f.alpha&&(u.globalAlpha=ft=f.alpha);let w=l==2?[0,t[h][0].length-1]:Nc(t[h]);f._paths=f.paths(n,h,w[0],w[1]),ft!=_&&(u.globalAlpha=ft=_)}}),$.forEach((f,h)=>{if(h>0&&f.show){let _=ft;ft!=f.alpha&&(u.globalAlpha=ft=f.alpha),f._paths!=null&&ba(h,!1);{let w=f._paths!=null?f._paths.gaps:null,E=f.points.show(n,h,Je,Qe,w),F=f.points.filter(n,h,E,w);(E||F)&&(f.points._paths=f.points.paths(n,h,Je,Qe,F),ba(h,!0))}ft!=_&&(u.globalAlpha=ft=_),et("drawSeries",h)}}),p&&(u.globalAlpha=ft=1)}}function $a(p,f){let h=f?$[p].points:$[p];h._stroke=h.stroke(n,p),h._fill=h.fill(n,p)}function ba(p,f){let h=f?$[p].points:$[p],{stroke:_,fill:w,clip:E,flags:F,_stroke:W=h._stroke,_fill:U=h._fill,_width:J=h.width}=h._paths;J=ke(J*me,3);let Q=null,X=J%2/2;f&&U==null&&(U=J>0?"#fff":W);let oe=h.pxAlign==1&&X>0;if(oe&&u.translate(X,X),!f){let ve=ht-J/2,pe=wt-J/2,ce=pt+J,le=At+J;Q=new Path2D,Q.rect(ve,pe,ce,le)}f?Bl(W,J,h.dash,h.cap,U,_,w,F,E):Bc(p,W,J,h.dash,h.cap,U,_,w,F,Q,E),oe&&u.translate(-X,-X)}function Bc(p,f,h,_,w,E,F,W,U,J,Q){let X=!1;U!=0&&B.forEach((oe,ve)=>{if(oe.series[0]==p){let pe=$[oe.series[1]],ce=t[oe.series[1]],le=(pe._paths||An).band;ds(le)&&(le=oe.dir==1?le[0]:le[1]);let se,Ce=null;pe.show&&le&&yu(ce,Je,Qe)?(Ce=oe.fill(n,ve)||E,se=pe._paths.clip):le=null,Bl(f,h,_,w,Ce,F,W,U,J,Q,se,le),X=!0}}),X||Bl(f,h,_,w,E,F,W,U,J,Q)}const ya=pn|Lo;function Bl(p,f,h,_,w,E,F,W,U,J,Q,X){ha(p,f,h,_,w),(U||J||X)&&(u.save(),U&&u.clip(U),J&&u.clip(J)),X?(W&ya)==ya?(u.clip(X),Q&&u.clip(Q),Bn(w,F),jn(p,E,f)):W&Lo?(Bn(w,F),u.clip(X),jn(p,E,f)):W&pn&&(u.save(),u.clip(X),Q&&u.clip(Q),Bn(w,F),u.restore(),jn(p,E,f)):(Bn(w,F),jn(p,E,f)),(U||J||X)&&u.restore()}function jn(p,f,h){h>0&&(f instanceof Map?f.forEach((_,w)=>{u.strokeStyle=Nn=w,u.stroke(_)}):f!=null&&p&&u.stroke(f))}function Bn(p,f){f instanceof Map?f.forEach((h,_)=>{u.fillStyle=js=_,u.fill(h)}):f!=null&&p&&u.fill(f)}function Hc(p,f,h,_){let w=k[p],E;if(_<=0)E=[0,0];else{let F=w._space=w.space(n,p,f,h,_),W=w._incrs=w.incrs(n,p,f,h,_,F);E=Hp(f,h,W,_,F)}return w._found=E}function Hl(p,f,h,_,w,E,F,W,U,J){let Q=F%2/2;L==1&&u.translate(Q,Q),ha(W,F,U,J,W),u.beginPath();let X,oe,ve,pe,ce=w+(_==0||_==3?-E:E);h==0?(oe=w,pe=ce):(X=w,ve=ce);for(let le=0;le<p.length;le++)f[le]!=null&&(h==0?X=ve=p[le]:oe=pe=p[le],u.moveTo(X,oe),u.lineTo(ve,pe));u.stroke(),L==1&&u.translate(-Q,-Q)}function Wc(p){let f=!0;return k.forEach((h,_)=>{if(!h.show)return;let w=S[h.scale];if(w.min==null){h._show&&(f=!1,h._show=!1,Bs(!1));return}else h._show||(f=!1,h._show=!0,Bs(!1));let E=h.side,F=E%2,{min:W,max:U}=w,[J,Q]=Hc(_,W,U,F==0?ie:Z);if(Q==0)return;let X=w.distr==2,oe=h._splits=h.splits(n,_,W,U,J,Q,X),ve=w.distr==2?oe.map(se=>Ot[se]):oe,pe=w.distr==2?Ot[oe[1]]-Ot[oe[0]]:J,ce=h._values=h.values(n,h.filter(n,ve,_,Q,pe),_,Q,pe);h._rotate=E==2?h.rotate(n,ce,_,Q):0;let le=h._size;h._size=Lt(h.size(n,ce,_,p)),le!=null&&h._size!=le&&(f=!1)}),f}function qc(p){let f=!0;return va.forEach((h,_)=>{let w=h(n,_,bs,p);w!=ls[_]&&(f=!1),ls[_]=w}),f}function Uc(){for(let p=0;p<k.length;p++){let f=k[p];if(!f.show||!f._show)continue;let h=f.side,_=h%2,w,E,F=f.stroke(n,p),W=h==0||h==3?-1:1,[U,J]=f._found;if(f.label!=null){let ct=f.labelGap*W,$t=Ve((f._lpos+ct)*me);ga(f.labelFont[0],F,"center",h==2?wn:ai),u.save(),_==1?(w=E=0,u.translate($t,Ve(wt+At/2)),u.rotate((h==3?-tl:tl)/2)):(w=Ve(ht+pt/2),E=$t);let ks=Fr(f.label)?f.label(n,p,U,J):f.label;u.fillText(ks,w,E),u.restore()}if(J==0)continue;let Q=S[f.scale],X=_==0?pt:At,oe=_==0?ht:wt,ve=f._splits,pe=Q.distr==2?ve.map(ct=>Ot[ct]):ve,ce=Q.distr==2?Ot[ve[1]]-Ot[ve[0]]:U,le=f.ticks,se=f.border,Ce=le.show?le.size:0,Ie=Ve(Ce*me),tt=Ve((f.alignTo==2?f._size-Ce-f.gap:f.gap)*me),$e=f._rotate*-tl/180,Fe=T(f._pos*me),gt=(Ie+tt)*W,rt=Fe+gt;E=_==0?rt:0,w=_==1?rt:0;let Ct=f.font[0],Pt=f.align==1?Qs:f.align==2?lo:$e>0?Qs:$e<0?lo:_==0?"center":h==3?lo:Qs,Vt=$e||_==1?"middle":h==2?wn:ai;ga(Ct,F,Pt,Vt);let _t=f.font[1]*f.lineGap,Mt=ve.map(ct=>T(i(ct,Q,X,oe))),zt=f._values;for(let ct=0;ct<zt.length;ct++){let $t=zt[ct];if($t!=null){_==0?w=Mt[ct]:E=Mt[ct],$t=""+$t;let ks=$t.indexOf(`
`)==-1?[$t]:$t.split(/\n/gm);for(let dt=0;dt<ks.length;dt++){let ja=ks[dt];$e?(u.save(),u.translate(w,E+dt*_t),u.rotate($e),u.fillText(ja,0,0),u.restore()):u.fillText(ja,w,E+dt*_t)}}}le.show&&Hl(Mt,le.filter(n,pe,p,J,ce),_,h,Fe,Ie,ke(le.width*me,3),le.stroke(n,p),le.dash,le.cap);let Gt=f.grid;Gt.show&&Hl(Mt,Gt.filter(n,pe,p,J,ce),_,_==0?2:1,_==0?wt:ht,_==0?At:pt,ke(Gt.width*me,3),Gt.stroke(n,p),Gt.dash,Gt.cap),se.show&&Hl([Fe],[1],_==0?1:0,_==0?1:2,_==1?wt:ht,_==1?At:pt,ke(se.width*me,3),se.stroke(n,p),se.dash,se.cap)}et("drawAxes")}function Bs(p){$.forEach((f,h)=>{h>0&&(f._paths=null,p&&(l==1?(f.min=null,f.max=null):f.facets.forEach(_=>{_.min=null,_.max=null})))})}let Hn=!1,Wl=!1,$n=[];function Vc(){Wl=!1;for(let p=0;p<$n.length;p++)et(...$n[p]);$n.length=0}function Hs(){Hn||(zu(xa),Hn=!0)}function Gc(p,f=!1){Hn=!0,Wl=f,p(n),xa(),f&&$n.length>0&&queueMicrotask(Vc)}n.batch=Gc;function xa(){if(Ll&&(Fc(),Ll=!1),zs&&(Dc(),zs=!1),Rn){if(Me(g,Qs,we),Me(g,wn,Ue),Me(g,Tn,ie),Me(g,Cn,Z),Me(x,Qs,we),Me(x,wn,Ue),Me(x,Tn,ie),Me(x,Cn,Z),Me(m,Tn,Qt),Me(m,Cn,ms),v.width=Ve(Qt*me),v.height=Ve(ms*me),k.forEach(({_el:p,_show:f,_size:h,_pos:_,side:w})=>{if(p!=null)if(f){let E=w===3||w===0?h:0,F=w%2==1;Me(p,F?"left":"top",_-E),Me(p,F?"width":"height",h),Me(p,F?"top":"left",F?Ue:we),Me(p,F?"height":"width",F?Z:ie),So(p,Ts)}else bt(p,Ts)}),Nn=js=Ol=zl=Rl=Il=Fl=Nl=Pl=null,ft=1,xn(!0),we!=Ps||Ue!=hs||ie!=Ht||Z!=gs){Bs(!1);let p=ie/Ht,f=Z/gs;if(Pe&&!_s&&V.left>=0){V.left*=p,V.top*=f,Ws&&Yt(Ws,Ve(V.left),0,ie,Z),qs&&Yt(qs,0,Ve(V.top),ie,Z);for(let h=0;h<Tt.length;h++){let _=Tt[h];_!=null&&(Fs[h]*=p,Ns[h]*=f,Yt(_,Lt(Fs[h]),Lt(Ns[h]),ie,Z))}}if(Te.show&&!In&&Te.left>=0&&Te.width>0){Te.left*=p,Te.width*=p,Te.top*=f,Te.height*=f;for(let h in Kl)Me(Gs,h,Te[h])}Ps=we,hs=Ue,Ht=ie,gs=Z}et("setSize"),Rn=!1}Qt>0&&ms>0&&(u.clearRect(0,0,v.width,v.height),et("drawClear"),I.forEach(p=>p()),et("draw")),Te.show&&In&&(Wn(Te),In=!1),Pe&&_s&&(xs(null,!0,!1),_s=!1),ee.show&&ee.live&&St&&(Gl(),St=!1),c||(c=!0,n.status=1,et("ready")),_n=!1,Hn=!1}n.redraw=(p,f)=>{zs=f||!1,p!==!1?as(A,O.min,O.max):Hs()};function ql(p,f){let h=S[p];if(h.from==null){if(st==0){let _=h.range(n,f.min,f.max,p);f.min=_[0],f.max=_[1]}if(f.min>f.max){let _=f.min;f.min=f.max,f.max=_}if(st>1&&f.min!=null&&f.max!=null&&f.max-f.min<1e-16)return;p==A&&h.distr==2&&st>0&&(f.min=It(f.min,t[0]),f.max=It(f.max,t[0]),f.min==f.max&&f.max++),Y[p]=f,Ll=!0,Hs()}}n.setScale=ql;let Ul,Vl,Ws,qs,ka,wa,Us,Vs,Sa,Ta,Se,Ae,os=!1;const nt=V.drag;let Ze=nt.x,Xe=nt.y;Pe&&(V.x&&(Ul=Et(ou,x)),V.y&&(Vl=Et(au,x)),O.ori==0?(Ws=Ul,qs=Vl):(Ws=Vl,qs=Ul),Se=V.left,Ae=V.top);const Te=n.select=We({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Gs=Te.show?Et(lu,Te.over?x:g):null;function Wn(p,f){if(Te.show){for(let h in p)Te[h]=p[h],h in Kl&&Me(Gs,h,p[h]);f!==!1&&et("setSelect")}}n.setSelect=Wn;function Yc(p){if($[p].show)be&&So(ze[p],Ts);else if(be&&bt(ze[p],Ts),Pe){let h=Is?Tt[0]:Tt[p];h!=null&&Yt(h,-10,-10,ie,Z)}}function as(p,f,h){ql(p,{min:f,max:h})}function qt(p,f,h,_){f.focus!=null&&Xc(p),f.show!=null&&$.forEach((w,E)=>{E>0&&(p==E||p==null)&&(w.show=f.show,Yc(E),l==2?(as(w.facets[0].scale,null,null),as(w.facets[1].scale,null,null)):as(w.scale,null,null),Hs())}),h!==!1&&et("setSeries",p,f),_&&kn("setSeries",n,p,f)}n.setSeries=qt;function Kc(p,f){We(B[p],f)}function Jc(p,f){p.fill=de(p.fill||null),p.dir=fe(p.dir,-1),f=f??B.length,B.splice(f,0,p)}function Qc(p){p==null?B.length=0:B.splice(p,1)}n.addBand=Jc,n.setBand=Kc,n.delBand=Qc;function Zc(p,f){$[p].alpha=f,Pe&&Tt[p]!=null&&(Tt[p].style.opacity=f),be&&ze[p]&&(ze[p].style.opacity=f)}let Zt,is,ys;const Ys={focus:!0};function Xc(p){if(p!=ys){let f=p==null,h=Wt.alpha!=1;$.forEach((_,w)=>{if(l==1||w>0){let E=f||w==0||w==p;_._focus=f?null:E,h&&Zc(w,E?1:Wt.alpha)}}),ys=p,h&&Hs()}}be&&Rs&&it(di,ue,p=>{V._lock||($s(p),ys!=null&&qt(null,Ys,!0,Be.setSeries))});function Ut(p,f,h){let _=S[f];h&&(p=p/me-(_.ori==1?Ue:we));let w=ie;_.ori==1&&(w=Z,p=w-p),_.dir==-1&&(p=w-p);let E=_._min,F=_._max,W=p/w,U=E+(F-E)*W,J=_.distr;return J==3?cn(10,U):J==4?ku(U,_.asinh):J==100?_.bwd(U):U}function ed(p,f){let h=Ut(p,A,f);return It(h,t[0],Je,Qe)}n.valToIdx=p=>It(p,t[0]),n.posToIdx=ed,n.posToVal=Ut,n.valToPos=(p,f,h)=>S[f].ori==0?o(p,S[f],h?pt:ie,h?ht:0):a(p,S[f],h?At:Z,h?wt:0),n.setCursor=(p,f,h)=>{Se=p.left,Ae=p.top,xs(null,f,h)};function Ca(p,f){Me(Gs,Qs,Te.left=p),Me(Gs,Tn,Te.width=f)}function Ma(p,f){Me(Gs,wn,Te.top=p),Me(Gs,Cn,Te.height=f)}let bn=O.ori==0?Ca:Ma,yn=O.ori==1?Ca:Ma;function td(){if(be&&ee.live)for(let p=l==2?1:0;p<$.length;p++){if(p==0&&kt)continue;let f=ee.values[p],h=0;for(let _ in f)Bt[p][h++].firstChild.nodeValue=f[_]}}function Gl(p,f){if(p!=null&&(p.idxs?p.idxs.forEach((h,_)=>{ne[_]=h}):Cu(p.idx)||ne.fill(p.idx),ee.idx=ne[0]),be&&ee.live){for(let h=0;h<$.length;h++)(h>0||l==1&&!kt)&&sd(h,ne[h]);td()}St=!1,f!==!1&&et("setLegend")}n.setLegend=Gl;function sd(p,f){let h=$[p],_=p==0&&P==2?Ot:t[p],w;kt?w=h.values(n,p,f)??ns:(w=h.value(n,f==null?null:_[f],p,f),w=w==null?ns:{_:w}),ee.values[p]=w}function xs(p,f,h){Sa=Se,Ta=Ae,[Se,Ae]=V.move(n,Se,Ae),V.left=Se,V.top=Ae,Pe&&(Ws&&Yt(Ws,Ve(Se),0,ie,Z),qs&&Yt(qs,0,Ve(Ae),ie,Z));let _,w=Je>Qe;Zt=xe,is=null;let E=O.ori==0?ie:Z,F=O.ori==1?ie:Z;if(Se<0||st==0||w){_=V.idx=null;for(let W=0;W<$.length;W++){let U=Tt[W];U!=null&&Yt(U,-10,-10,ie,Z)}Rs&&qt(null,Ys,!0,p==null&&Be.setSeries),ee.live&&(ne.fill(_),St=!0)}else{let W,U,J;l==1&&(W=O.ori==0?Se:Ae,U=Ut(W,A),_=V.idx=It(U,t[0],Je,Qe),J=R(t[0][_],O,E,0));let Q=-10,X=-10,oe=0,ve=0,pe=!0,ce="",le="";for(let se=l==2?1:0;se<$.length;se++){let Ce=$[se],Ie=ne[se],tt=Ie==null?null:l==1?t[se][Ie]:t[se][1][Ie],$e=V.dataIdx(n,se,_,U),Fe=$e==null?null:l==1?t[se][$e]:t[se][1][$e];if(St=St||Fe!=tt||$e!=Ie,ne[se]=$e,se>0&&Ce.show){let gt=$e==null?-10:$e==_?J:R(l==1?t[0][$e]:t[se][0][$e],O,E,0),rt=Fe==null?-10:N(Fe,l==1?S[Ce.scale]:S[Ce.facets[1].scale],F,0);if(Rs&&Fe!=null){let Ct=O.ori==1?Se:Ae,Pt=Ye(Wt.dist(n,se,$e,rt,Ct));if(Pt<Zt){let Vt=Wt.bias;if(Vt!=0){let _t=Ut(Ct,Ce.scale),Mt=Fe>=0?1:-1,zt=_t>=0?1:-1;zt==Mt&&(zt==1?Vt==1?Fe>=_t:Fe<=_t:Vt==1?Fe<=_t:Fe>=_t)&&(Zt=Pt,is=se)}else Zt=Pt,is=se}}if(St||Is){let Ct,Pt;O.ori==0?(Ct=gt,Pt=rt):(Ct=rt,Pt=gt);let Vt,_t,Mt,zt,Gt,ct,$t=!0,ks=at.bbox;if(ks!=null){$t=!1;let dt=ks(n,se);Mt=dt.left,zt=dt.top,Vt=dt.width,_t=dt.height}else Mt=Ct,zt=Pt,Vt=_t=at.size(n,se);if(ct=at.fill(n,se),Gt=at.stroke(n,se),Is)se==is&&Zt<=Wt.prox&&(Q=Mt,X=zt,oe=Vt,ve=_t,pe=$t,ce=ct,le=Gt);else{let dt=Tt[se];dt!=null&&(Fs[se]=Mt,Ns[se]=zt,gi(dt,Vt,_t,$t),mi(dt,ct,Gt),Yt(dt,Lt(Mt),Lt(zt),ie,Z))}}}}if(Is){let se=Wt.prox,Ce=ys==null?Zt<=se:Zt>se||is!=ys;if(St||Ce){let Ie=Tt[0];Ie!=null&&(Fs[0]=Q,Ns[0]=X,gi(Ie,oe,ve,pe),mi(Ie,ce,le),Yt(Ie,Lt(Q),Lt(X),ie,Z))}}}if(Te.show&&os)if(p!=null){let[W,U]=Be.scales,[J,Q]=Be.match,[X,oe]=p.cursor.sync.scales,ve=p.cursor.drag;if(Ze=ve._x,Xe=ve._y,Ze||Xe){let{left:pe,top:ce,width:le,height:se}=p.select,Ce=p.scales[X].ori,Ie=p.posToVal,tt,$e,Fe,gt,rt,Ct=W!=null&&J(W,X),Pt=U!=null&&Q(U,oe);Ct&&Ze?(Ce==0?(tt=pe,$e=le):(tt=ce,$e=se),Fe=S[W],gt=R(Ie(tt,X),Fe,E,0),rt=R(Ie(tt+$e,X),Fe,E,0),bn(Ft(gt,rt),Ye(rt-gt))):bn(0,E),Pt&&Xe?(Ce==1?(tt=pe,$e=le):(tt=ce,$e=se),Fe=S[U],gt=N(Ie(tt,oe),Fe,F,0),rt=N(Ie(tt+$e,oe),Fe,F,0),yn(Ft(gt,rt),Ye(rt-gt))):yn(0,F)}else Jl()}else{let W=Ye(Sa-ka),U=Ye(Ta-wa);if(O.ori==1){let oe=W;W=U,U=oe}Ze=nt.x&&W>=nt.dist,Xe=nt.y&&U>=nt.dist;let J=nt.uni;J!=null?Ze&&Xe&&(Ze=W>=J,Xe=U>=J,!Ze&&!Xe&&(U>W?Xe=!0:Ze=!0)):nt.x&&nt.y&&(Ze||Xe)&&(Ze=Xe=!0);let Q,X;Ze&&(O.ori==0?(Q=Us,X=Se):(Q=Vs,X=Ae),bn(Ft(Q,X),Ye(X-Q)),Xe||yn(0,F)),Xe&&(O.ori==1?(Q=Us,X=Se):(Q=Vs,X=Ae),yn(Ft(Q,X),Ye(X-Q)),Ze||bn(0,E)),!Ze&&!Xe&&(bn(0,0),yn(0,0))}if(nt._x=Ze,nt._y=Xe,p==null){if(h){if(Na!=null){let[W,U]=Be.scales;Be.values[0]=W!=null?Ut(O.ori==0?Se:Ae,W):null,Be.values[1]=U!=null?Ut(O.ori==1?Se:Ae,U):null}kn(oo,n,Se,Ae,ie,Z,_)}if(Rs){let W=h&&Be.setSeries,U=Wt.prox;ys==null?Zt<=U&&qt(is,Ys,!0,W):Zt>U?qt(null,Ys,!0,W):is!=ys&&qt(is,Ys,!0,W)}}St&&(ee.idx=_,Gl()),f!==!1&&et("setCursor")}let rs=null;Object.defineProperty(n,"rect",{get(){return rs==null&&xn(!1),rs}});function xn(p=!1){p?rs=null:(rs=x.getBoundingClientRect(),et("syncRect",rs))}function Ea(p,f,h,_,w,E,F){V._lock||os&&p!=null&&p.movementX==0&&p.movementY==0||(Yl(p,f,h,_,w,E,F,!1,p!=null),p!=null?xs(null,!0,!0):xs(f,!0,!1))}function Yl(p,f,h,_,w,E,F,W,U){if(rs==null&&xn(!1),$s(p),p!=null)h=p.clientX-rs.left,_=p.clientY-rs.top;else{if(h<0||_<0){Se=-10,Ae=-10;return}let[J,Q]=Be.scales,X=f.cursor.sync,[oe,ve]=X.values,[pe,ce]=X.scales,[le,se]=Be.match,Ce=f.axes[0].side%2==1,Ie=O.ori==0?ie:Z,tt=O.ori==1?ie:Z,$e=Ce?E:w,Fe=Ce?w:E,gt=Ce?_:h,rt=Ce?h:_;if(pe!=null?h=le(J,pe)?i(oe,S[J],Ie,0):-10:h=Ie*(gt/$e),ce!=null?_=se(Q,ce)?i(ve,S[Q],tt,0):-10:_=tt*(rt/Fe),O.ori==1){let Ct=h;h=_,_=Ct}}U&&(f==null||f.cursor.event.type==oo)&&((h<=1||h>=ie-1)&&(h=ws(h,ie)),(_<=1||_>=Z-1)&&(_=ws(_,Z))),W?(ka=h,wa=_,[Us,Vs]=V.move(n,h,_)):(Se=h,Ae=_)}const Kl={width:0,height:0,left:0,top:0};function Jl(){Wn(Kl,!1)}let La,Da,Aa,Oa;function Pa(p,f,h,_,w,E,F){os=!0,Ze=Xe=nt._x=nt._y=!1,Yl(p,f,h,_,w,E,F,!0,!1),p!=null&&(it(ao,ko,za,!1),kn(ri,n,Us,Vs,ie,Z,null));let{left:W,top:U,width:J,height:Q}=Te;La=W,Da=U,Aa=J,Oa=Q}function za(p,f,h,_,w,E,F){os=nt._x=nt._y=!1,Yl(p,f,h,_,w,E,F,!1,!0);let{left:W,top:U,width:J,height:Q}=Te,X=J>0||Q>0,oe=La!=W||Da!=U||Aa!=J||Oa!=Q;if(X&&oe&&Wn(Te),nt.setScale&&X&&oe){let ve=W,pe=J,ce=U,le=Q;if(O.ori==1&&(ve=U,pe=Q,ce=W,le=J),Ze&&as(A,Ut(ve,A),Ut(ve+pe,A)),Xe)for(let se in S){let Ce=S[se];se!=A&&Ce.from==null&&Ce.min!=xe&&as(se,Ut(ce+le,se),Ut(ce,se))}Jl()}else V.lock&&(V._lock=!V._lock,xs(f,!0,p!=null));p!=null&&(Os(ao,ko),kn(ao,n,Se,Ae,ie,Z,null))}function nd(p,f,h,_,w,E,F){if(V._lock)return;$s(p);let W=os;if(os){let U=!0,J=!0,Q=10,X,oe;O.ori==0?(X=Ze,oe=Xe):(X=Xe,oe=Ze),X&&oe&&(U=Se<=Q||Se>=ie-Q,J=Ae<=Q||Ae>=Z-Q),X&&U&&(Se=Se<Us?0:ie),oe&&J&&(Ae=Ae<Vs?0:Z),xs(null,!0,!0),os=!1}Se=-10,Ae=-10,ne.fill(null),xs(null,!0,!0),W&&(os=W)}function Ra(p,f,h,_,w,E,F){V._lock||($s(p),Al(),Jl(),p!=null&&kn(ui,n,Se,Ae,ie,Z,null))}function Ia(){k.forEach(Wp),Dl(n.width,n.height,!0)}Cs(cl,on,Ia);const Ks={};Ks.mousedown=Pa,Ks.mousemove=Ea,Ks.mouseup=za,Ks.dblclick=Ra,Ks.setSeries=(p,f,h,_)=>{let w=Be.match[2];h=w(n,f,h),h!=-1&&qt(h,_,!0,!1)},Pe&&(it(ri,x,Pa),it(oo,x,Ea),it(ci,x,p=>{$s(p),xn(!1)}),it(di,x,nd),it(ui,x,Ra),Do.add(n),n.syncRect=xn);const qn=n.hooks=e.hooks||{};function et(p,f,h){Wl?$n.push([p,f,h]):p in qn&&qn[p].forEach(_=>{_.call(null,n,f,h)})}(e.plugins||[]).forEach(p=>{for(let f in p.hooks)qn[f]=(qn[f]||[]).concat(p.hooks[f])});const Fa=(p,f,h)=>h,Be=We({key:null,setSeries:!1,filters:{pub:xi,sub:xi},scales:[A,$[1]?$[1].scale:null],match:[ki,ki,Fa],values:[null,null]},V.sync);Be.match.length==2&&Be.match.push(Fa),V.sync=Be;const Na=Be.key,Ql=rc(Na);function kn(p,f,h,_,w,E,F){Be.filters.pub(p,f,h,_,w,E,F)&&Ql.pub(p,f,h,_,w,E,F)}Ql.sub(n);function ld(p,f,h,_,w,E,F){Be.filters.sub(p,f,h,_,w,E,F)&&Ks[p](null,f,h,_,w,E,F)}n.pub=ld;function od(){Ql.unsub(n),Do.delete(n),vs.clear(),To(cl,on,Ia),d.remove(),ue==null||ue.remove(),et("destroy")}n.destroy=od;function Zl(){et("init",e,t),ma(t||e.data,!1),Y[A]?ql(A,Y[A]):Al(),In=Te.show&&(Te.width>0||Te.height>0),_s=St=!0,Dl(e.width,e.height)}return $.forEach(fa),k.forEach(Ic),s?s instanceof HTMLElement?(s.appendChild(d),Zl()):s(n,Zl):Zl(),n}ot.assign=We;ot.fmtNum=ea;ot.rangeNum=dl;ot.rangeLog=xl;ot.rangeAsinh=Zo;ot.orient=Ls;ot.pxRatio=me;ot.join=Pu;ot.fmtDate=sa,ot.tzDate=Uu;ot.sync=rc;{ot.addGap=Cp,ot.clipGaps=Sl;let e=ot.paths={points:vc};e.linear=hc,e.stepped=Lp,e.bars=Dp,e.spline=Op}function qp(e){let t;return{hooks:{init(s){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",s.over.appendChild(t)},setCursor(s){const n=s.cursor.idx;if(n==null||!s.data[1]||s.data[1][n]==null){t.style.display="none";return}const l=s.data[0][n],o=s.data[1][n],a=new Date(l*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):z(o)}</b> ${a}`;const i=Math.round(s.valToPos(l,"x"));t.style.left=Math.min(i,s.over.clientWidth-80)+"px",t.style.display=""}}}}function Up(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function bc({data:e,color:t,smooth:s,height:n,yMax:l,fmtVal:o}){const a=lt(null),i=lt(null),c=n||55;return ae(()=>{if(!a.current||!e||e[0].length<2)return;const d=s?Ud(e[1]):e[1],v=[e[0],d];if(i.current){i.current.setData(v);return}const u=l?(g,x,L)=>[0,Math.max(l,L*1.05)]:(g,x,L)=>[Math.max(0,x*.9),L*1.1],m={width:a.current.clientWidth||200,height:c,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:u}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:t,width:1.5,fill:Up(t,.09)}],plugins:[qp(o)]};return i.current=new ot(m,v,a.current),()=>{i.current&&(i.current.destroy(),i.current=null)}},[e,t,s]),ae(()=>{if(!i.current||!a.current)return;const d=new ResizeObserver(()=>{i.current&&a.current&&i.current.setSize({width:a.current.clientWidth,height:c})});return d.observe(a.current),()=>d.disconnect()},[]),r`<div class="chart-wrap" role="img" aria-label="Sparkline chart" style=${"height:"+c+"px"} ref=${a}></div>`}function es({label:e,value:t,valColor:s,data:n,chartColor:l,smooth:o,refLines:a,yMax:i,dp:c}){const d=re(()=>{if(!n||!n[1]||n[1].length<2)return[];const v=i?Math.max(i,n[1].reduce((u,m)=>Math.max(u,m),0)*1.05):n[1].reduce((u,m)=>Math.max(u,m),0)*1.1;return(a||[]).map(u=>{if(v<=0)return null;const m=(1-u.value/v)*100;return m>=0&&m<=95?{...u,pct:m}:null}).filter(Boolean)},[n,a,i]);return r`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${c?{"data-dp":c}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${e}</span>
      <span class="chart-val" style=${"color:"+(s||l||"var(--accent)")} aria-live="polite" aria-atomic="true">${t}</span>
    </div>
    <div style="position:relative">
      ${d.map(v=>r`<Fragment>
          <div class="chart-ref-line" style=${"top:"+v.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+v.pct+"% - 8px)"}>${v.label}</div>
        </Fragment>`)}
      ${n&&n[0].length>=2?r`<${bc} data=${n} color=${l||"var(--accent)"} smooth=${o} yMax=${i}/>`:r`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem">collecting...</div>`}
    </div>
  </div>`}function Oo({label:e,value:t,accent:s,dp:n,sm:l}){const o=lt(t),[a,i]=q(!1);return ae(()=>{o.current!==t&&(i(!0),setTimeout(()=>i(!1),500)),o.current=t},[t]),r`<div class=${"metric"+(l?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(s?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
  </div>`}function Ui({snap:e,mode:t}){if(!e)return null;const s=!t||t==="files",n=!t||t==="traffic",l=e.tools.filter(c=>c.tool!=="aictl"&&c.files.length),o=l.reduce((c,d)=>c+d.files.length,0)||1,a=e.tools.filter(c=>c.tool!=="aictl"&&c.live&&(c.live.outbound_rate_bps||c.live.inbound_rate_bps)),i=a.reduce((c,d)=>c+(d.live.outbound_rate_bps||0)+(d.live.inbound_rate_bps||0),0)||1;return r`
    ${s&&l.length>0&&r`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+l.map(c=>c.label+" "+c.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${l.map(c=>r`
        <div class="rbar-seg" style=${"width:"+(c.files.length/o*100).toFixed(1)+"%;background:"+(Le[c.tool]||"var(--fg2)")}
          title="${c.label}: ${c.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${l.map(c=>r`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Le[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${c.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${n&&r`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(a.length?a.map(c=>c.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${a.length===0?" — no active traffic":""}</div>
      <div class="rbar">${a.map(c=>{const d=(c.live.outbound_rate_bps||0)+(c.live.inbound_rate_bps||0);return r`<div class="rbar-seg" style=${"width:"+(d/i*100).toFixed(1)+"%;background:"+(Le[c.tool]||"var(--fg2)")}
          title="${c.label}: ${Nt(d)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(c=>{const d=(c.live.outbound_rate_bps||0)+(c.live.inbound_rate_bps||0);return r`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Le[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${Nt(d)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!l.length&&!a.length&&r`<div class="empty-state">No AI tool resources found yet.</div>`}`}function Vp({path:e,onClose:t}){const{snap:s}=qe(Ne),[n,l]=q(null),[o,a]=q(!1),[i,c]=q(null),d=lt(null),v=lt(null),[u,m]=q(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),g=lt(!1),x=lt(0),L=lt(0),T=ye(A=>{g.current=!0,x.current=A.clientX,L.current=u,A.preventDefault()},[u]);if(ae(()=>{const A=I=>{if(!g.current)return;const b=x.current-I.clientX,M=window.innerWidth,O=Math.min(90,Math.max(20,L.current+b/M*100));m(O)},C=()=>{if(g.current){g.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(u)))}catch{}}};return window.addEventListener("mousemove",A),window.addEventListener("mouseup",C),()=>{window.removeEventListener("mousemove",A),window.removeEventListener("mouseup",C)}},[u]),ae(()=>{if(!e)return;v.current=document.activeElement;const A=setTimeout(()=>{var b;const I=(b=d.current)==null?void 0:b.querySelector("button");I&&I.focus()},50),C=I=>{if(I.key!=="Tab"||!d.current)return;const b=d.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!b.length)return;const M=b[0],O=b[b.length-1];I.shiftKey&&document.activeElement===M?(I.preventDefault(),O.focus()):!I.shiftKey&&document.activeElement===O&&(I.preventDefault(),M.focus())};return document.addEventListener("keydown",C),()=>{clearTimeout(A),document.removeEventListener("keydown",C),v.current&&v.current.focus&&v.current.focus()}},[e]),ae(()=>{e&&(a(!1),c(null),Yo(e).then(l).catch(A=>c(A.message)))},[e]),!e)return null;const y=re(()=>{if(!s)return"";for(const A of s.tools)for(const C of A.files)if(C.path===e)return(C.kind||"")+" | "+ge(C.size)+" | ~"+z(C.tokens)+"tok | scope:"+(C.scope||"?")+" | sent_to_llm:"+(C.sent_to_llm||"?")+" | loaded:"+(C.loaded_when||"?");for(const A of s.agent_memory)if(A.file===e)return A.source+" | "+A.profile+" | "+A.tokens+"tok | "+A.lines+"ln";return""},[s,e]),$=n?n.split(`
`):[],k=$.length,S=k>Js*2,B=(A,C)=>A.map((I,b)=>r`<div class="fv-line"><span class="fv-ln">${C+b}</span><span class="fv-code">${K(I)||" "}</span></div>`);return r`<div class="fv" ref=${d} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+u+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${T}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      <button onClick=${t} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${y}</div>
    <div class="fv-body">
      ${i?r`<p class="text-red" style="padding:var(--sp-10)">${i}</p>`:n?!S||o?r`<div class="fv-lines">${B($,1)}</div>`:r`<div class="fv-lines">${B($.slice(0,Js),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>a(!0)}>\u25BC ${k-Js*2} more lines \u25BC</div>
            <div class="fv-lines">${B($.slice(-Js),k-Js+1)}</div>`:r`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${k} lines${S&&!o?" (showing "+Js*2+" of "+k+")":""}</span>
      ${S&&r`<button onClick=${()=>a(!o)}>${o?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function Po({file:e,dirPrefix:t}){var A;const[s,n]=q(!1),[l,o]=q(!1),[a,i]=q(null),[c,d]=q(null),[v,u]=q(!1),m=qe(Ne),g=(e.path||"").replace(/\\/g,"/").split("/").pop(),x=(e.sent_to_llm||"").toLowerCase(),L=e.mtime&&Date.now()/1e3-e.mtime<300,T=(A=m.recentFiles)==null?void 0:A.get(e.path),y=!!T,$=ye(async()=>{if(s){n(!1);return}n(!0),u(!0),d(null);try{const C=await Yo(e.path);i(C)}catch(C){d(C.message)}finally{u(!1)}},[s,e.path]),k=(C,I)=>C.map((b,M)=>r`<span class="pline"><span class="ln">${I+M}</span>${K(b)||" "}</span>`),S=()=>{if(v)return r`<span class="text-muted">loading...</span>`;if(c)return r`<span class="text-red">${c}</span>`;if(!a)return null;const C=a.split(`
`),I=C.length;if(I<=ln*3||l)return r`${k(C,1)}
        <div class="prev-actions">
          ${l&&r`<button class="prev-btn" onClick=${()=>o(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
        </div>`;const M=C.slice(-ln),O=I-ln+1;return r`${k(M,O)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>o(!0)}>show all (${I} lines)</button>
        <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
      </div>`},B=e.size>0?Math.round(e.size/60):0;return r`<div>
    <button class="fitem" onClick=${$} aria-expanded=${s} title=${e.path}>
      ${y?r`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${jt(T.ts)}${T.growth>0?" +"+ge(T.growth):""}">●</span>`:L?r`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${jt(e.mtime)}">●</span>`:r`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${t?r`<span class="text-muted">${t}/</span>`:""}${K(g)}</span>
      <span class="fmeta">
        ${x&&x!=="no"&&r`<span style="color:${Or(x)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${x}">${x==="yes"?"◆":x==="on-demand"?"◇":"○"}</span>`}
        ${ge(e.size)}${B?r` <span class="text-muted">${B}ln</span>`:""}${e.tokens?r` <span class="text-muted">${z(e.tokens)}t</span>`:""}
        ${e.mtime&&L?r` <span class="text-orange text-xs">${jt(e.mtime)}</span>`:""}
      </span>
    </button>
    ${s&&r`<div class="inline-preview">${S()}</div>`}
  </div>`}function Gp({dir:e,files:t}){const[s,n]=q(!1),l=t.reduce((a,i)=>a+i.tokens,0),o=t.reduce((a,i)=>a+i.size,0);return r`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-muted" title=${e}>${K(e)}</span>
      <span class="badge">${t.length}</span>
      <span class="badge">${ge(o)}</span>
      <span class="badge">${z(l)}t</span>
    </button>
    ${s&&r`<div style=${{paddingLeft:"var(--sp-8)"}}>${t.map(a=>r`<${Po} key=${a.path} file=${a}/>`)}</div>`}
  </div>`}function Yp({label:e,files:t,root:s,badge:n,style:l,startOpen:o}){const[a,i]=q(!!o),c=re(()=>qd(t,s),[t,s]),d=re(()=>t.reduce((g,x)=>g+x.tokens,0),[t]),v=re(()=>t.reduce((g,x)=>g+x.size,0),[t]),u=re(()=>{var x;const g={};return t.forEach(L=>{const T=(L.sent_to_llm||"no").toLowerCase();g[T]=(g[T]||0)+1}),((x=Object.entries(g).sort((L,T)=>T[1]-L[1])[0])==null?void 0:x[0])||"no"},[t]),m=()=>c.length===1&&c[0][1].length<=3?c[0][1].map(g=>r`<${Po} key=${g.path} file=${g}/>`):c.map(([g,x])=>x.length===1?r`<div style=${{marginLeft:"var(--sp-5)"}}><${Po} key=${x[0].path} file=${x[0]} dirPrefix=${g}/></div>`:r`<${Gp} key=${g} dir=${g} files=${x}/>`);return r`<div class="cat-group" style=${l||""}>
    <button class=${"cat-head"+(a?" open":"")} onClick=${()=>i(!a)} aria-expanded=${a}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${Or(u)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${u}"></span>
      <span class="cat-label" title=${e}>${K(e)}</span>
      <span class="badge" style="flex-shrink:0">${n||t.length}</span>
      <span class="badge">${ge(v)}</span>
      <span class="badge">${z(d)}t</span>
    </button>
    ${a&&r`<div style=${{paddingLeft:"var(--sp-8)"}}>${m()}</div>`}
  </div>`}function po({label:e,data:t,color:s}){const n=lt(null);return ae(()=>{const l=n.current;if(!l||!t||t.length<2)return;const o=l.getContext("2d"),a=l.width=l.offsetWidth*(window.devicePixelRatio||1),i=l.height=l.offsetHeight*(window.devicePixelRatio||1);o.clearRect(0,0,a,i);const c=t.slice(-60),d=Math.max(...c)*1.1||1,v=a/(c.length-1);o.beginPath(),o.strokeStyle=s,o.lineWidth=1.5*(window.devicePixelRatio||1),c.forEach((u,m)=>{const g=m*v,x=i-u/d*i*.85;m===0?o.moveTo(g,x):o.lineTo(g,x)}),o.stroke()},[t,s]),r`<div style="position:relative;height:25px">
    <span class="text-muted" style="position:absolute;top:0;left:0;font-size:var(--fs-2xs);z-index:1">${e}</span>
    <canvas ref=${n} aria-hidden="true" style="width:100%;height:100%;display:block"/>
  </div>`}function Kp({processes:e,maxMem:t}){if(!e||!e.length)return null;const s=e.reduce((a,i)=>a+(parseFloat(i.mem_mb)||0),0),n=e.reduce((a,i)=>a+(parseFloat(i.cpu_pct)||0),0),l={};e.forEach(a=>{const i=a.process_type||"process";(l[i]=l[i]||[]).push(a)});const o=Object.keys(l).length>1;return r`<div class="proc-section">
    <h3>Processes <span class="badge">${e.length}</span>
      <span class="badge">CPU ${_e(n)}</span>
      <span class="badge">MEM ${ge(s*1048576)}</span></h3>
    ${Object.entries(l).map(([a,i])=>{const c={};return i.forEach(d=>(c[d.name||"unknown"]=c[d.name||"unknown"]||[]).push(d)),r`<div style="margin-bottom:var(--sp-2)">
        ${o?r`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${K(a)}</div>`:null}
        ${Object.entries(c).map(([d,v])=>{const u=v.sort((m,g)=>(parseFloat(g.mem_mb)||0)-(parseFloat(m.mem_mb)||0));return r`<div key=${d} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${o?"":r`<span style="text-transform:uppercase;letter-spacing:0.03em">${K(a)}</span>${" · "}`}${K(d)} <span style="opacity:0.6">(${v.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${u.map(m=>{const g=parseFloat(m.cpu_pct)||0,x=parseFloat(m.mem_mb)||0,L=Math.max(2,Math.min(g,100)),T=g>80?"var(--red)":g>50?"var(--orange)":g>5?"var(--green)":"var(--fg2)",y=m.anomalies&&m.anomalies.length,$=m.zombie_risk&&m.zombie_risk!=="none";return r`<div key=${m.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${y?"border-left:2px solid var(--red);":""}${$?"border-left:2px solid var(--orange);":""}"
                  title=${m.cmdline||m.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${L}%;height:100%;background:${T};border-radius:2px"></div>
                    </div>
                    <span style="color:${T};min-width:3ch;text-align:right">${_e(g)}</span>
                  </div>
                  <div class="mono text-muted">${m.pid}</div>
                  <div>${ge(x*1048576)}</div>
                  ${y?r`<div class="text-red">\u26A0${m.anomalies.length}</div>`:null}
                </div>`})}
            </div>
          </div>`})}
      </div>`})}
  </div>`}function Jp({config:e}){if(!e)return null;const t=Object.entries(e.settings||{}),s=Object.entries(e.features||{}),n=(e.mcp_servers||[]).length>0,l=(e.extensions||[]).length>0,o=e.otel||{},a=e.hints||[];return!t.length&&!s.length&&!n&&!l&&!o.enabled&&!a.length&&e.model==null&&e.launch_at_startup==null?null:r`<div class="live-section">
    <h3>Configuration
      ${e.launch_at_startup===!0&&r`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${e.launch_at_startup===!1&&r`<span class="badge">no auto-start</span>`}
      ${e.auto_update===!0&&r`<span class="badge">auto-update</span>`}
      ${e.model&&r`<span class="badge">${e.model}</span>`}
      ${o.enabled&&r`<span class="badge" style="background:var(--green);color:var(--bg)">OTel ${o.exporter||"on"}</span>`}
      ${!o.enabled&&o.source&&r`<span class="badge" style="background:var(--orange);color:var(--bg)">OTel off</span>`}
    </h3>
    <div class="metric-grid">
      ${o.enabled&&r`<div class="metric-chip" style="border-color:var(--green)">
        <span class="mlabel text-green">OpenTelemetry</span>
        <div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Exporter:</span> <span class="mono">${o.exporter}</span>
        </div>
        ${o.endpoint&&r`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Endpoint:</span> <span class="mono">${o.endpoint}</span>
        </div>`}
        ${o.file_path&&r`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">File:</span> <span class="mono">${o.file_path}</span>
        </div>`}
        ${o.capture_content&&r`<div class="text-orange" style="font-size:var(--fs-base);padding:0.05rem 0">\u26A0 Content capture enabled</div>`}
      </div>`}
      ${t.length>0&&r`<div class="metric-chip">
        <span class="mlabel">Settings</span>
        ${t.map(([i,c])=>r`<div key=${i} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${i}</span>
          <span class="mono">${typeof c=="object"?JSON.stringify(c):String(c)}</span>
        </div>`)}
      </div>`}
      ${Object.entries(e.feature_groups||{}).map(([i,c])=>r`<div key=${i} class="metric-chip">
        <span class="mlabel">${i}</span>
        ${Object.entries(c).map(([d,v])=>r`<div key=${d} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${d}</span>
          <span style="color:${v===!0?"var(--green)":v===!1?"var(--red)":"var(--fg)"}">${typeof v=="object"?JSON.stringify(v):String(v)}</span>
        </div>`)}
      </div>`)}
      ${s.length>0&&!Object.keys(e.feature_groups||{}).length&&r`<div class="metric-chip">
        <span class="mlabel">Features</span>
        ${s.map(([i,c])=>r`<div key=${i} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${i}</span>
          <span style="color:${c===!0?"var(--green)":c===!1?"var(--red)":"var(--fg)"}">${String(c)}</span>
        </div>`)}
      </div>`}
      ${n&&r`<div class="metric-chip">
        <span class="mlabel">MCP Servers</span>
        <div class="stack-list">${e.mcp_servers.map((i,c)=>r`<span class="pill mono" key=${i||c}>${i}</span>`)}</div>
      </div>`}
      ${l&&r`<div class="metric-chip">
        <span class="mlabel">Extensions</span>
        <div class="stack-list">${e.extensions.map(i=>r`<span class="pill mono" key=${i}>${i}</span>`)}</div>
      </div>`}
    </div>
    ${a.length>0&&r`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
      ${a.map(i=>r`<div class="text-orange" style="font-size:var(--fs-base);padding:0.15rem 0">
        <span style="margin-right:var(--sp-3)">\u{1F4A1}</span>${i}
      </div>`)}
    </div>`}
  </div>`}function Qp({telemetry:e}){if(!e)return null;const t=e,s=(t.input_tokens||0)+(t.output_tokens||0),n=t.errors||[],l=t.quota_state||{};if(!s&&!t.active_session_input&&!n.length)return null;const[o,a]=q(!1);return r`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${t.source}</span> <span class="badge">${_e(t.confidence*100)} confidence</span>
      ${n.length>0&&r`<span class="badge warn cursor-ptr" onClick=${i=>{i.stopPropagation(),a(!o)}}>${n.length} error${n.length>1?"s":""}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${Ge(t.input_tokens||0)} tok</span>
        <span class="msub">cache read: ${Ge(t.cache_read_tokens||0)} tok \u00B7 creation: ${Ge(t.cache_creation_tokens||0)} tok</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${Ge(t.output_tokens||0)} tok</span>
        <span class="msub">${z(t.total_sessions||0)} sessions \u00B7 ${z(t.total_messages||0)} messages</span>
      </div>
      ${t.cost_usd>0?r`<div class="metric-chip">
        <span class="mlabel">Estimated Cost</span>
        <span class="mvalue">$${t.cost_usd.toFixed(2)}</span>
      </div>`:null}
      ${(l.premium_requests_used>0||l.total_api_duration_ms>0)&&r`<div class="metric-chip">
        <span class="mlabel">Operational</span>
        ${l.premium_requests_used>0&&r`<div style="font-size:var(--fs-base)">Premium requests: <span class="mono">${l.premium_requests_used}</span></div>`}
        ${l.total_api_duration_ms>0&&r`<div style="font-size:var(--fs-base)">API time: <span class="mono">${Math.round(l.total_api_duration_ms/1e3)}s</span></div>`}
        ${l.current_model&&r`<div style="font-size:var(--fs-base)">Model: <span class="mono">${l.current_model}</span></div>`}
        ${l.code_changes&&r`<div class="text-green" style="font-size:var(--fs-base)">+${l.code_changes.lines_added} -${l.code_changes.lines_removed} (${l.code_changes.files_modified} files)</div>`}
      </div>`}
      ${t.active_session_input>0||t.active_session_output>0?r`<div class="metric-chip" style="border-color:var(--accent)">
        <span class="mlabel">Active Session</span>
        <span class="mvalue">${Ge((t.active_session_input||0)+(t.active_session_output||0))} tok</span>
        <span class="msub">in: ${Ge(t.active_session_input||0)} \u00B7 out: ${Ge(t.active_session_output||0)} \u00B7 ${t.active_session_messages||0} msgs</span>
      </div>`:null}
      ${Object.keys(t.by_model||{}).length>0?r`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(t.by_model).map(([i,c])=>r`<div key=${i} class="flex-between flex-wrap" style="font-size:0.75rem;padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${i}</span>
          <span>in:${Ge(c.input_tokens||0)} tok out:${Ge(c.output_tokens||0)} tok${c.cache_read_tokens?" cR:"+Ge(c.cache_read_tokens)+" tok":""}${c.requests?" · "+c.requests+"req":""}${c.cost_usd?" · $"+c.cost_usd.toFixed(2):""}</span>
        </div>`)}
      </div>`:null}
    </div>
    ${o&&n.length>0&&r`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--red);background:color-mix(in srgb,var(--red) 8%,transparent);border-radius:0 4px 4px 0;max-height:10rem;overflow-y:auto">
      <div class="text-red text-bold" style="font-size:var(--fs-base);margin-bottom:0.2rem">Recent Errors</div>
      ${n.map(i=>r`<div class="flex-row gap-sm" style="font-size:0.68rem;padding:0.1rem 0">
        <span class="mono text-muted text-nowrap">${(i.timestamp||"").slice(11,19)}</span>
        <span class="badge" style="font-size:var(--fs-xs);background:var(--red);color:var(--bg);padding:0.05rem var(--sp-2)">${i.type}</span>
        <span class="text-muted">${i.message}</span>
        ${i.model&&r`<span class="mono text-muted">${i.model}</span>`}
      </div>`)}
    </div>`}
  </div>`}function Zp({live:e}){if(!e)return null;const t=e.token_estimate||{},s=e.mcp||{},n=Go(e);return r`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${e.session_count||0} sess</span>
      <span class="badge">${e.pid_count||0} pid</span>
      <span class="badge">${_e((e.confidence||0)*100)} conf</span>
      ${s.detected&&r`<span class="badge warn">${s.loops||0} MCP loop${(s.loops||0)===1?"":"s"}</span>`}
    </h3>
    <div class="metric-grid" aria-live="polite" aria-relevant="text" aria-atomic="false">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">\u2191 ${Nt(e.outbound_rate_bps||0)}</span>
        <span class="msub">\u2193 ${Nt(e.inbound_rate_bps||0)} total ${ge((e.outbound_bytes||0)+(e.inbound_bytes||0))}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Tokens</span>
        <span class="mvalue">${z(n)}</span>
        <span class="msub">${t.source||"network-inference"} at ${_e((t.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">MCP</span>
        <span class="mvalue">${s.detected?"Detected":"No loop"}</span>
        <span class="msub">${s.loops||0} loops at ${_e((s.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Context</span>
        <span class="mvalue">${e.files_touched||0} files</span>
        <span class="msub">${e.file_events||0} events \u00B7 repo ${ge((e.workspace_size_mb||0)*1048576)}</span>
      </div>
      ${(e.state_bytes_written||0)>0&&r`<div class="metric-chip">
        <span class="mlabel">State Writes</span>
        <span class="mvalue">${ge(e.state_bytes_written||0)}</span>
      </div>`}
      <div class="metric-chip">
        <span class="mlabel">CPU</span>
        <span class="mvalue">${_e(e.cpu_percent||0)}</span>
        <span class="msub">peak ${_e(e.peak_cpu_percent||0)}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Workspaces</span>
        <span class="mvalue">${(e.workspaces||[]).length||0}</span>
        <span class="msub mono">${(e.workspaces||[]).slice(0,2).join(" | ")||"(unknown)"}</span>
      </div>
    </div>
  </div>`}function zo({tool:e,root:t}){var S,B,A,C,I,b,M,O;const[s,n]=q(!1),{snap:l,history:o}=qe(Ne),a=re(()=>((l==null?void 0:l.tool_configs)||[]).find(P=>P.tool===e.tool),[l,e.tool]),i=re(()=>{var P;return(P=o==null?void 0:o.by_tool)==null?void 0:P[e.tool]},[o,e.tool]),c=Le[e.tool]||"var(--fg2)",d=vt[e.tool]||"🔹",v=e.files.reduce((P,R)=>P+R.tokens,0),u=e.processes.filter(P=>P.anomalies&&P.anomalies.length).length,m=Go(e.live),g=(((S=e.live)==null?void 0:S.outbound_rate_bps)||0)+(((B=e.live)==null?void 0:B.inbound_rate_bps)||0),x=e.processes.reduce((P,R)=>P+(parseFloat(R.cpu_pct)||0),0),L=e.processes.reduce((P,R)=>P+(parseFloat(R.mem_mb)||0),0),T=re(()=>Math.max(...e.processes.map(P=>parseFloat(P.mem_mb)||0),100),[e.processes]),y=(((C=(A=e.token_breakdown)==null?void 0:A.telemetry)==null?void 0:C.errors)||[]).length,$=re(()=>{const P={};return e.files.forEach(R=>{const N=R.kind||"other";(P[N]=P[N]||[]).push(R)}),Object.keys(P).sort((R,N)=>{const Y=ti.indexOf(R),te=ti.indexOf(N);return(Y<0?99:Y)-(te<0?99:te)}).map(R=>({kind:R,files:P[R]}))},[e.files]),k="tcard"+(s?" open":"")+(u||y?" has-anomaly":"");return r`<div class=${k}>
    <button class="tcard-head" onClick=${()=>n(!s)} aria-expanded=${s}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)">${d}</span>${K(e.label)}</h2>
      <span class="badge" data-dp="procs.tool.files">${e.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${z(v)} tok</span>
      ${e.processes.length>0&&r`<span class="badge" data-dp="procs.tool.process_count">${e.processes.length} proc ${_e(x)} ${ge(L*1048576)}</span>`}
      ${e.mcp_servers.length>0&&r`<span class="badge" data-dp="procs.tool.mcp_server_count">${e.mcp_servers.length} MCP</span>`}
      ${u>0&&r`<span class="badge warn" data-dp="procs.tool.anomaly">${u} anomaly</span>`}
      ${y>0&&r`<span class="badge" style="background:var(--red);color:var(--bg)">${y} error${y>1?"s":""}</span>`}
      ${e.live&&r`<span class="badge" style="background:var(--accent);color:var(--bg)">${e.live.session_count||0} live \u00B7 ${Nt(g)}${m>0?" · "+z(m)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${$.map(({kind:P,files:R})=>r`<span class="text-muted" style="font-size:var(--fs-xs)">${P}:${R.length}</span>`)}
      </div>
      ${i&&i.ts.length>2&&!s&&r`<div role="img" aria-label=${"Sparkline charts for "+e.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${P=>P.stopPropagation()}>
        <${po} label="CPU" data=${i.cpu} color=${c}/>
        <${po} label="MEM" data=${i.mem_mb} color=${"var(--green)"}/>
        <${po} label=${e.live?"Traffic":"Tokens"} data=${e.live?i.traffic:i.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${s&&r`<div class="tcard-body">
      ${((I=ei[e.tool])==null?void 0:I.length)>0&&r`<div class="tool-relationships">
        ${ei[e.tool].map(P=>r`<span key=${P.label} class="rel-badge rel-${P.type}"
          title=${P.label}>${P.label}</span>`)}
      </div>`}
      <${Jp} config=${a}/>
      <${Qp} telemetry=${(b=e.token_breakdown)==null?void 0:b.telemetry}/>
      <${Zp} live=${e.live}/>
      ${$.map(({kind:P,files:R})=>r`<${Yp} key=${P} label=${P} files=${R} root=${t}/>`)}
      <${Kp} processes=${(O=(M=e.live)==null?void 0:M.processes)!=null&&O.length?e.live.processes:e.processes} maxMem=${T}/>
      ${e.mcp_servers.length>0&&r`<div class="proc-section"><h3>MCP Servers</h3>
        ${e.mcp_servers.map(P=>r`<div key=${P.name||P.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${K(P.name)}</span>
          <span class="fmeta">${K((P.config||{}).command||"")} ${((P.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function Xp({groupKey:e,groupLabel:t,groupColor:s,tools:n,root:l}){const[o,a]=q(!0),i=n.reduce((d,v)=>d+v.files.length,0),c=n.reduce((d,v)=>d+v.files.reduce((u,m)=>u+m.tokens,0),0);return r`<div class="mb-md">
    <button onClick=${()=>a(!o)} aria-expanded=${o}
      class="flex-row gap-sm cursor-ptr" style="background:none;border:none;padding:var(--sp-3) 0;font:inherit;color:var(--fg);width:100%">
      <span style="font-size:var(--fs-xs);transition:transform 0.15s;${o?"transform:rotate(90deg)":""}">\u25B6</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${s};flex-shrink:0"></span>
      <span class="text-bolder" style="font-size:var(--fs-lg)">${t}</span>
      <span class="badge">${n.length} tools</span>
      <span class="badge">${i} files</span>
      <span class="badge">${z(c)} tok</span>
    </button>
    ${o&&r`<div class="tool-grid" style="margin-top:var(--sp-3)">
      ${n.map(d=>r`<${zo} key=${d.tool} tool=${d} root=${l}/>`)}
    </div>`}
  </div>`}function ef(){const{snap:e}=qe(Ne),[t,s]=q("product"),n=c=>c.files.length||c.processes.length||c.mcp_servers.length||c.live,l=(c,d)=>{const v=c.files.length*2+c.processes.length+c.mcp_servers.length;return d.files.length*2+d.processes.length+d.mcp_servers.length-v||c.tool.localeCompare(d.tool)},o=re(()=>e?e.tools.filter(c=>!c.meta&&n(c)).sort(l):[],[e]),a=re(()=>e?e.tools.filter(c=>c.meta&&c.tool!=="project-env"&&n(c)).sort(l):[],[e]),i=re(()=>{if(t==="product"||!o.length)return null;const c={};return o.forEach(d=>{if(t==="vendor"){const v=d.vendor||"community",u=Lr[v]||v,m=Ad[v]||"var(--fg2)";c[v]||(c[v]={label:u,color:m,tools:[]}),c[v].tools.push(d)}else{const v=(d.host||"any").split(",");for(const u of v){const m=u.trim(),g=Od[m]||m,x="var(--fg2)";c[m]||(c[m]={label:g,color:x,tools:[]}),c[m].tools.push(d)}}}),Object.entries(c).sort((d,v)=>{const u=d[1].tools.reduce((g,x)=>g+x.files.length,0);return v[1].tools.reduce((g,x)=>g+x.files.length,0)-u})},[o,t]);return e?!o.length&&!a.length?r`<p class="empty-state">No AI tool resources found.</p>`:r`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${Fd.map(c=>r`<button key=${c.id}
        class=${t===c.id?"range-btn active":"range-btn"}
        onClick=${()=>s(c.id)}>${c.label}</button>`)}
    </div>
    ${o.length>0&&(i?i.map(([c,d])=>r`<${Xp} key=${c}
      groupKey=${c} groupLabel=${d.label} groupColor=${d.color}
      tools=${d.tools} root=${e.root}/>`):r`<div class="tool-grid">
        ${o.map(c=>r`<${zo} key=${c.tool} tool=${c} root=${e.root}/>`)}
      </div>`)}
    ${a.length>0&&r`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)">▶</span>
        <span>Project Context</span>
        <span class="badge">${a.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${a.map(c=>r`<${zo} key=${c.tool} tool=${c} root=${e.root}/>`)}
      </div>
    </details>`}
  </div>`:r`<p class="loading-state">Loading...</p>`}function tf({perCore:e}){if(!e||!e.length)return null;const t=100;return r`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((s,n)=>{const l=Math.max(1,s/t*100),o=s>80?"var(--red)":s>50?"var(--orange)":s>20?"var(--green)":"var(--fg2)";return r`<div key=${n} title=${"Core "+n+": "+_e(s)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+l+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function sf({mem:e}){var k;const[t,s]=q(!1),[n,l]=q(!1),[o,a]=q(null),[i,c]=q(null),[d,v]=q(!1),u=qe(Ne),m=(e.file||"").replace(/\\/g,"/").split("/").pop(),g=ye(async()=>{if(t){s(!1);return}if(s(!0),rl.has(e.file)){a(rl.get(e.file));return}v(!0),c(null);try{const S=await Yo(e.file);a(S)}catch(S){c(S.message)}finally{v(!1)}},[t,e.file]),x=(S,B)=>S.map((A,C)=>r`<span class="pline"><span class="ln">${B+C}</span>${K(A)||" "}</span>`),L=()=>{if(d)return r`<span class="loading-state">Loading...</span>`;if(i)return r`<span class="error-state">${i}</span>`;if(!o)return null;const S=o.split(`
`),B=S.length;if(B<=ln*3||n)return r`${x(S,1)}
        <div class="prev-actions">
          ${n&&r`<button class="prev-btn" onClick=${()=>l(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>u.openViewer(e.file)}>open in viewer</button>
        </div>`;const A=S.slice(-ln),C=B-ln+1;return r`${x(A,C)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>l(!0)}>show all (${B} lines)</button>
        <button class="prev-btn" onClick=${()=>u.openViewer(e.file)}>open in viewer</button>
      </div>`},T=e.mtime&&Date.now()/1e3-e.mtime<300,y=(k=u.recentFiles)==null?void 0:k.get(e.file),$=!!y;return r`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${g}
      aria-expanded=${t} title=${e.file}>
      ${$?r`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${jt(y.ts)}">●</span>`:T?r`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${jt(e.mtime)}">●</span>`:r`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${K(m)}</span>
      <span class="fmeta">${ge(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${T||$?r` <span style="color:${$?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${jt($?y.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${t&&r`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${L()}</div>`}
  </div>`}function nf({profile:e,items:t}){const[s,n]=q(t.length<=5),l=t.reduce((o,a)=>o+a.tokens,0);return r`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${K(e)}</span>
      <span class="badge">${t.length} files</span>
      <span class="badge">${z(l)} tok</span>
    </button>
    ${s&&r`<div>${t.map(o=>r`<${sf} key=${o.file} mem=${o}/>`)}</div>`}
  </div>`}function lf({source:e,entries:t}){const[s,n]=q(!1),l=re(()=>{const o={};return t.forEach(a=>{(o[a.profile]=o[a.profile]||[]).push(a)}),Object.entries(o)},[t]);return r`<div class="mem-group">
    <button class=${"mem-group-head"+(s?" open":"")} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      ${K(Rd[e]||e)} <span class="badge">${t.length}</span>
      <span class="badge">${z(t.reduce((o,a)=>o+a.tokens,0))} tok</span>
    </button>
    ${s&&r`<div>${l.map(([o,a])=>r`<${nf} key=${o} profile=${o} items=${a}/>`)}</div>`}
  </div>`}function of(){const[e,t]=q(null);if(ae(()=>{Ln().then(n=>{n&&n.ts&&n.ts.length>=2&&t(n)}).catch(()=>{})},[]),!e)return null;const s=e.memory_entries&&e.memory_entries.some(n=>n>0);return r`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${es} label="Memory Tokens" value=${z(e.mem_tokens[e.mem_tokens.length-1]||0)}
        data=${[e.ts,e.mem_tokens]} chartColor="var(--accent)" smooth />
      ${s&&r`<${es} label="Memory Entries" value=${e.memory_entries[e.memory_entries.length-1]||0}
        data=${[e.ts,e.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function af(){const{snap:e}=qe(Ne);if(!e||!e.agent_memory.length)return r`<p class="empty-state">No agent memory found.</p>`;const t=re(()=>{const s={};return e.agent_memory.forEach(n=>{(s[n.source]=s[n.source]||[]).push(n)}),Object.entries(s)},[e.agent_memory]);return r`<${of}/>
    ${t.map(([s,n])=>r`<${lf} key=${s} source=${s} entries=${n}/>`)}`}function rf(){var n,l,o,a;const{snap:e}=qe(Ne);if(!e)return r`<p class="empty-state">Loading...</p>`;const t=e.tools.filter(i=>i.live).sort((i,c)=>{var d,v,u,m;return(((d=c.live)==null?void 0:d.outbound_rate_bps)||0)+(((v=c.live)==null?void 0:v.inbound_rate_bps)||0)-((((u=i.live)==null?void 0:u.outbound_rate_bps)||0)+(((m=i.live)==null?void 0:m.inbound_rate_bps)||0))}),s=Object.entries(e.live_monitor&&e.live_monitor.diagnostics||{});return r`<div class="live-stack">
    ${s.length>0&&r`<div class="diag-card">
      <h3>Collector Health</h3>
      <table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${s.map(([i,c])=>r`<tr key=${i}>
          <td class="mono">${i}</td>
          <td>${K(c.status||"unknown")}</td>
          <td>${K(c.mode||"unknown")}</td>
          <td>${K(c.detail||"")}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      ${t.length?r`<table role="table" aria-label="Live tool sessions">
        <thead><tr><th>Tool</th><th>Sessions</th><th>Traffic</th><th>Tokens</th><th>MCP</th><th>Files</th><th>CPU</th><th>Workspace</th><th>State</th></tr></thead>
        <tbody>${t.map(i=>{const c=i.live||{},d=c.token_estimate||{},v=c.mcp||{};return r`<tr key=${i.tool}>
            <td>${K(i.label)}</td>
            <td>${c.session_count||0} sess / ${c.pid_count||0} pid</td>
            <td>\u2191 ${Nt(c.outbound_rate_bps||0)}<br/>\u2193 ${Nt(c.inbound_rate_bps||0)}</td>
            <td>${z(Go(c))}<br/><span class="text-muted">${K(d.source||"network-inference")} @ ${_e((d.confidence||0)*100)}</span></td>
            <td>${v.detected?"YES":"NO"}<br/><span class="text-muted">${v.loops||0} loops @ ${_e((v.confidence||0)*100)}</span></td>
            <td>${c.files_touched||0} touched<br/><span class="text-muted">${c.file_events||0} events</span></td>
            <td>${_e(c.cpu_percent||0)}<br/><span class="text-muted">peak ${_e(c.peak_cpu_percent||0)}</span></td>
            <td>${ge((c.workspace_size_mb||0)*1048576)}<br/><span class="mono text-muted text-xs">${K((c.workspaces||[]).slice(0,2).join(" | ")||"(unknown)")}</span></td>
            <td>${(c.state_bytes_written||0)>0?ge(c.state_bytes_written||0):"—"}</td>
          </tr>
          ${(c.processes||[]).length>0&&r`<tr key=${i.tool+"-procs"}>
            <td colspan="9" style="padding:var(--sp-1) var(--sp-5);background:var(--bg)">
              <details style="font-size:var(--fs-base)">
                <summary class="cursor-ptr text-muted">${c.processes.length} processes</summary>
                <div class="text-mono" style="margin-top:var(--sp-1);font-size:0.7rem">
                  ${c.processes.sort((u,m)=>(m.cpu_pct||0)-(u.cpu_pct||0)).map(u=>r`<div key=${u.pid} style="display:flex;gap:var(--sp-5);padding:var(--sp-1) 0">
                      <span class="text-muted" style="min-width:5ch">${u.pid}</span>
                      <span class="flex-1 text-ellipsis">${u.name}</span>
                      <span class="text-right" style="color:${u.cpu_pct>5?"var(--orange)":"var(--fg2)"};min-width:5ch">${u.cpu_pct}%</span>
                      <span class="text-right" style="min-width:6ch">${u.mem_mb?ge(u.mem_mb*1048576):""}</span>
                    </div>`)}
                </div>
              </details>
            </td>
          </tr>`}`})}</tbody>
      </table>`:r`<p class="empty-state">No active AI-tool sessions detected yet.</p>`}
    </div>

    <div class="diag-card">
      <h3>Monitor Roots</h3>
      <div class="stack-list">
        ${(((n=e.live_monitor)==null?void 0:n.workspace_paths)||[]).map(i=>r`<span class="pill mono" key=${"ws-"+i}>workspace: ${i}</span>`)}
        ${(((l=e.live_monitor)==null?void 0:l.state_paths)||[]).map(i=>r`<span class="pill mono" key=${"state-"+i}>state: ${i}</span>`)}
        ${!(((o=e.live_monitor)==null?void 0:o.workspace_paths)||[]).length&&!(((a=e.live_monitor)==null?void 0:a.state_paths)||[]).length&&r`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`}function cf(){var L,T,y,$;const{snap:e,globalRange:t}=qe(Ne),[s,n]=q(null),[l,o]=q([]),[a,i]=q(null),c=re(()=>e?e.tools.filter(k=>!k.meta&&(k.files.length||k.processes.length||k.live)).sort((k,S)=>k.label.localeCompare(S.label)):[],[e]);if(ae(()=>{!s&&c.length&&n(c[0].tool)},[c,s]),ae(()=>{!s||!t||Uo({tool:s,since:t.since,limit:500,until:t.until}).then(o).catch(()=>o([]))},[s,t]),ae(()=>{!s||!t||Ln({since:t.since,tool:s,until:t.until}).then(k=>{var S;return i(((S=k==null?void 0:k.by_tool)==null?void 0:S[s])||null)}).catch(()=>i(null))},[s,t]),!e)return r`<p class="loading-state">Loading...</p>`;const d=c.find(k=>k.tool===s),v=(L=e.tool_telemetry)==null?void 0:L.find(k=>k.tool===s),u=d==null?void 0:d.live,m=Le[s]||"var(--fg2)",g={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},x=t.until!=null?new Date(t.since*1e3).toLocaleString(void 0,g)+" – "+new Date(t.until*1e3).toLocaleString(void 0,g):"";return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${c.map(k=>r`<button key=${k.tool}
        class=${s===k.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>n(k.tool)}>
        <span style="color:${Le[k.tool]||"var(--fg2)"}">${vt[k.tool]||"🔹"}</span>
        ${k.label}
        ${k.live?r`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${s&&r`<Fragment>
        <h3 class="flex-row mb-sm gap-sm">
          <span style="color:${m}">${vt[s]||"🔹"}</span>
          ${(d==null?void 0:d.label)||s}
          ${d!=null&&d.vendor?r`<span class="badge">${Lr[d.vendor]||d.vendor}</span>`:""}
          ${v!=null&&v.model?r`<span class="badge mono">${v.model}</span>`:""}
        </h3>

        ${a&&((T=a.ts)==null?void 0:T.length)>=2?r`<div class="es-section">
          <div class="es-section-title">Time Series${x?r` <span class="badge">${x}</span>`:""}</div>
          <div class="es-charts">
            <${es} label="CPU %" value=${((y=d==null?void 0:d.live)==null?void 0:y.cpu_percent)!=null?_e(d.live.cpu_percent||0):"-"}
              data=${[a.ts,a.cpu]} chartColor=${m} smooth />
            <${es} label="Memory (MB)" value=${(($=d==null?void 0:d.live)==null?void 0:$.mem_mb)!=null?ge((d.live.mem_mb||0)*1048576):"-"}
              data=${[a.ts,a.mem_mb]} chartColor="var(--green)" smooth />
            <${es} label="Context (tok)" value=${Ge(a.tokens[a.tokens.length-1]||0)}
              data=${[a.ts,a.tokens]} chartColor="var(--accent)" />
            <${es} label="Network (B/s)"
              value=${Nt(u?(u.outbound_rate_bps||0)+(u.inbound_rate_bps||0):a.traffic[a.traffic.length-1]||0)}
              valColor=${u?"var(--orange)":void 0}
              data=${[a.ts,a.traffic]} chartColor="var(--orange)" />
          </div>
        </div>`:r`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="loading-state">No data for this range.</p>
        </div>`}

        ${v?r`<div class="es-section">
          <div class="es-section-title">Telemetry
            <span class="badge" style="margin-left:var(--sp-3)">${v.source}</span>
            <span class="badge">${_e(v.confidence*100)}</span>
          </div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${Ge(v.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${Ge(v.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${Ge(v.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${Ge(v.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${z(v.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${z(v.total_messages||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cost</div><div class="value">${v.cost_usd?"$"+v.cost_usd.toFixed(2):"-"}</div></div>
          </div>
          ${Object.keys(v.by_model||{}).length>0&&r`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(v.by_model).map(([k,S])=>r`<div key=${k}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${k}</span>
              <span>in: ${Ge(S.input||S.input_tokens||0)} tok \u00B7 out: ${Ge(S.output||S.output_tokens||0)} tok${S.cache_read_tokens?" · cR:"+Ge(S.cache_read_tokens):""}${S.cache_creation_tokens?" · cW:"+Ge(S.cache_creation_tokens):""}${S.cost_usd?" · $"+S.cost_usd.toFixed(2):""}</span>
            </div>`)}
          </div>`}
        </div>`:""}

        ${u?r`<div class="es-section">
          <div class="es-section-title">Live Monitor</div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${u.session_count||0}</div></div>
            <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${u.pid_count||0}</div></div>
            <div class="es-kv-card"><div class="label">CPU</div><div class="value">${_e(u.cpu_percent||0)}</div></div>
            <div class="es-kv-card"><div class="label">Memory</div><div class="value">${ge((u.mem_mb||0)*1048576)}</div></div>
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${Nt(u.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${Nt(u.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">Events (${l.length})</div>
          ${l.length?r`<div class="es-feed">
            ${l.map((k,S)=>{const B=Id[k.kind]||"var(--fg2)",A=new Date(k.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),C=k.detail?Object.entries(k.detail).map(([I,b])=>I+"="+b).join(", "):"";return r`<div key=${k.ts+"-"+k.tool+"-"+S} class="es-event">
                <span class="es-event-time">${A}</span>
                <span class="es-event-kind" style="color:${B}">${k.kind}</span>
                <span class="es-event-detail" title=${C}>${C||"-"}</span>
              </div>`})}
          </div>`:r`<p class="empty-state">No events for this tool in the selected range.</p>`}
        </div>
      </Fragment>`}
    </div>
  </div>`}const Zs=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"],Vi={"claude-opus-4-6":1e6,"claude-opus-4-5":1e6,"claude-sonnet-4-6":1e6,"claude-sonnet-4-5":1e6,"claude-sonnet-4":2e5,"claude-haiku-4-5":2e5,"claude-3-5-sonnet":2e5,"gpt-4.1":1e6,"gpt-4.1-mini":1e6,"gpt-4o":128e3,"gpt-4o-mini":128e3,o3:2e5,"o4-mini":2e5,"gemini-2.5-pro":1e6,"gemini-2.5-flash":1e6};function Gi({always:e,onDemand:t,conditional:s,never:n,total:l}){if(!l)return null;const o=a=>(a/l*100).toFixed(1)+"%";return r`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${e>0&&r`<div style="width:${o(e)};height:100%;background:var(--green)" title="Always loaded: ${z(e)}"></div>`}
    ${t>0&&r`<div style="width:${o(t)};height:100%;background:var(--yellow)" title="On-demand: ${z(t)}"></div>`}
    ${s>0&&r`<div style="width:${o(s)};height:100%;background:var(--orange)" title="Conditional: ${z(s)}"></div>`}
    ${n>0&&r`<div style="width:${o(n)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${z(n)}"></div>`}
  </div>`}function df(){const{snap:e,history:t,enabledTools:s}=qe(Ne),[n,l]=q(null),[o,a]=q(!1);if(ae(()=>{l(null),a(!1),wd().then(l).catch(()=>a(!0))},[]),o)return r`<p class="error-state">Failed to load budget.</p>`;if(!n)return r`<p class="loading-state">Loading...</p>`;const i=b=>s===null||s.includes(b),c=re(()=>{const b=(e==null?void 0:e.tool_configs)||[];for(const M of["claude-code","copilot","copilot-vscode"]){const O=b.find(P=>P.tool===M&&P.model);if(O)return O.model}for(const M of b)if(M.model&&Vi[M.model])return M.model;return""},[e]),d=Vi[c]||2e5,v=n.always_loaded_tokens||0,u=n.total_potential_tokens||0,m=v/d*100,g=u/d*100,x=re(()=>{if(!e)return{};const b={};return e.tools.forEach(M=>{M.tool==="aictl"||!M.token_breakdown||!M.token_breakdown.total||(b[M.tool]=M.token_breakdown)}),b},[e]),L=re(()=>e!=null&&e.tool_telemetry?e.tool_telemetry.filter(b=>i(b.tool)):[],[e,s]),T=re(()=>{if(!e)return[];const b={};return e.tools.forEach(M=>{M.tool==="aictl"||!i(M.tool)||(M.files||[]).forEach(O=>{const P=O.kind||"other";b[P]||(b[P]={kind:P,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),b[P].count++,b[P].tokens+=O.tokens,b[P].size+=O.size;const R=(O.sent_to_llm||"").toLowerCase();R==="yes"?b[P].always+=O.tokens:R==="on-demand"?b[P].onDemand+=O.tokens:R==="conditional"||R==="partial"?b[P].conditional+=O.tokens:b[P].never+=O.tokens})}),Object.values(b).sort((M,O)=>O.tokens-M.tokens)},[e,s]),y=re(()=>{if(!(e!=null&&e.tool_telemetry))return null;const b={},M={};e.tool_telemetry.filter(D=>i(D.tool)).forEach(D=>{(D.daily||[]).forEach(H=>{if(H.date&&(b[H.date]||(b[H.date]={}),M[H.date]||(M[H.date]={}),H.tokens_by_model&&Object.entries(H.tokens_by_model).forEach(([G,j])=>{b[H.date][G]=(b[H.date][G]||0)+j}),H.model)){const G=H.model,j=(H.input_tokens||0)+(H.output_tokens||0);b[H.date][G]=(b[H.date][G]||0)+j,M[H.date][G]||(M[H.date][G]={input:0,output:0,cache_read:0,cache_creation:0}),M[H.date][G].input+=H.input_tokens||0,M[H.date][G].output+=H.output_tokens||0,M[H.date][G].cache_read+=H.cache_read_tokens||0,M[H.date][G].cache_creation+=H.cache_creation_tokens||0}})});const O=new Date,P=[];for(let D=6;D>=0;D--){const H=new Date(O);H.setDate(H.getDate()-D),P.push(H.toISOString().slice(0,10))}const R=P.filter(D=>b[D]&&Object.values(b[D]).some(H=>H>0));if(!R.length)return null;const N=[...new Set(R.flatMap(D=>Object.keys(b[D]||{})))],Y=Math.max(...R.map(D=>N.reduce((H,G)=>H+((b[D]||{})[G]||0),0)),1),te=R.some(D=>Object.keys(M[D]||{}).length>0);return{dates:R,models:N,byDate:b,byDateModel:M,maxTotal:Y,hasDetail:te}},[e,s]),$=t&&t.ts&&t.ts.length>=2?[t.ts,t.live_tokens||t.ts.map(()=>0)]:null,k=L.reduce((b,M)=>b+(M.input_tokens||0),0),S=L.reduce((b,M)=>b+(M.output_tokens||0),0),B=L.reduce((b,M)=>b+(M.cache_read_tokens||0),0),A=L.reduce((b,M)=>b+(M.cache_creation_tokens||0),0),C=L.reduce((b,M)=>b+(M.total_sessions||0),0),I=L.reduce((b,M)=>b+(M.cost_usd||0),0);return r`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${$?r`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${bc} data=${$} color="var(--green)" height=${60}/>
        <div class="text-muted" style="font-size:var(--fs-base);margin-top:var(--sp-2)">
          Current: ${z((e==null?void 0:e.total_live_estimated_tokens)||0)} estimated tokens
        </div>
      </div>`:r`<div></div>`}
      <div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Context Window${c?r` <span class="badge">${c}</span>`:""}</h3>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Always loaded: ${z(v)} of ${z(d)}</span>
            <span class="text-bolder" style="color:${m>80?"var(--orange)":m>50?"var(--yellow)":"var(--green)"}">${_e(m)}</span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:4px;background:var(--border)">
            <div style="height:100%;width:${Math.min(m,100).toFixed(1)}%;background:var(--green);border-radius:4px"></div>
          </div>
        </div>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Max potential: ${z(u)}</span>
            <span class="text-bolder" style="color:${g>100?"var(--red)":"var(--fg2)"}">${_e(g)}${g>100?" ⚠":""}</span>
          </div>
          <div class="overflow-hidden" style="height:6px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${Math.min(g,100).toFixed(1)}%;background:${g>100?"var(--red)":"var(--fg2)"};opacity:0.5;border-radius:3px"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-1);font-size:var(--fs-sm)">
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:4px"></span>Always: ${z(n.always_loaded_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--yellow);margin-right:4px"></span>On-demand: ${z(n.on_demand_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--orange);margin-right:4px"></span>Conditional: ${z(n.conditional_tokens||0)}</span>
          <span class="text-muted">Cacheable: ${z(n.cacheable_tokens||0)}</span>
        </div>
        ${(n.project_count||0)>1?r`<div class="text-muted" style="font-size:var(--fs-xs);margin-top:var(--sp-2);border-top:1px solid var(--border);padding-top:var(--sp-1)">
          Estimate for largest project (${n.largest_project||"?"}): ${z(n.largest_project_tokens||0)} + ${z(n.global_tokens||0)} global.
          ${(n.raw_total_all_projects||0)>(n.total_potential_tokens||0)?r` Raw total across all ${n.project_count} projects: ${z(n.raw_total_all_projects)}.`:null}
        </div>`:null}
      </div>
    </div>

    <!-- Daily token usage -->
    ${y&&r`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">Daily Token Usage (last 7 days)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-6);font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        ${y.models.map((b,M)=>r`<span key=${b}>
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${Zs[M%Zs.length]};margin-right:3px"></span>${b}
        </span>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
        ${y.dates.map(b=>{const M=y.models.reduce((P,R)=>P+((y.byDate[b]||{})[R]||0),0),O=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return r`<div key=${b} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${O}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${b}: ${z(M)} tokens">
              ${y.models.map((P,R)=>{const N=(y.byDate[b]||{})[P]||0;return N?r`<div key=${P} style="width:${(N/y.maxTotal*100).toFixed(1)}%;height:100%;background:${Zs[R%Zs.length]}" title="${P}: ${z(N)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${z(M)}</span>
          </div>`})}
      </div>
      ${y.hasDetail&&r`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${y.dates.flatMap(b=>{const M=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),O=y.byDateModel[b]||{},P=Object.keys(O).sort();return P.length?P.map((R,N)=>{const Y=O[R];return r`<tr key=${b+"-"+R}>
                <td>${N===0?M:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${Zs[y.models.indexOf(R)%Zs.length]};margin-right:3px"></span>${R}</td>
                <td>${z(Y.input)}</td><td>${z(Y.output)}</td>
                <td class="text-muted">${z(Y.cache_read)}</td>
                <td class="text-muted">${z(Y.cache_creation)}</td>
                <td class="text-bold">${z(Y.input+Y.output)}</td>
              </tr>`}):[]})}</tbody>
        </table>
      </details>`}
    </div>`}

    <!-- Verified token usage (main table) -->
    ${L.length>0&&r`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">Token Usage by Tool</h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Tool telemetry" style="width:100%">
          <thead><tr>
            <th>Tool</th><th>Source</th>
            <th style="text-align:right">Input</th><th style="text-align:right">Output</th>
            <th style="text-align:right">Cache R</th><th style="text-align:right">Cache W</th>
            <th style="text-align:right">Sessions</th><th style="text-align:right">Cost</th>
            <th style="width:100px">Context Split</th>
          </tr></thead>
          <tbody>${L.map(b=>{const M=x[b.tool];return r`<tr key=${b.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(Le[b.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${K(b.tool)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${b.source}</span> <span class="text-muted">${_e(b.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${z(b.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${z(b.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${z(b.total_sessions||0)}</td>
              <td style="text-align:right">${b.cost_usd>0?"$"+b.cost_usd.toFixed(2):"—"}</td>
              <td>${M?r`<${Gi} always=${M.always_loaded||0} onDemand=${M.on_demand||0}
                conditional=${M.conditional||0} never=${M.never_sent||0} total=${M.total||1}/>`:null}</td>
            </tr>`})}
          ${L.length>1&&r`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${z(k)}</td>
            <td style="text-align:right">${z(S)}</td>
            <td style="text-align:right" class="text-muted">${z(B)}</td>
            <td style="text-align:right" class="text-muted">${z(A)}</td>
            <td style="text-align:right">${z(C)}</td>
            <td style="text-align:right">${I>0?"$"+I.toFixed(2):"—"}</td>
            <td></td>
          </tr>`}</tbody>
        </table>
      </div>
    </div>`}

    <!-- By category -->
    ${T.length>0&&r`<div class="budget-card budget-full">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">By Category</h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Per-category tokens" style="width:100%">
          <thead><tr><th>Category</th><th style="text-align:right">Files</th><th style="text-align:right">Tokens</th><th style="text-align:right">Size</th><th style="width:120px">Distribution</th></tr></thead>
          <tbody>${T.map(b=>r`<tr key=${b.kind}>
            <td>${K(b.kind)}</td>
            <td style="text-align:right">${b.count}</td>
            <td style="text-align:right" class="text-bold">${z(b.tokens)}</td>
            <td style="text-align:right">${ge(b.size)}</td>
            <td><${Gi} always=${b.always} onDemand=${b.onDemand} conditional=${b.conditional} never=${b.never} total=${b.tokens||1}/></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>`}
  </div>`}function uf(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const Kn={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function Yi({agent:e,tasks:t,now:s}){const n=Kn[e.state]||Kn.active,l=e.ended_at?e.ended_at-e.started_at:s-e.started_at,o=t.filter(a=>a.agent_id===e.agent_id);return r`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${n.bg};color:var(--bg)">${n.label}</span>
      <strong class="text-sm">${K(e.agent_id)}</strong>
      <span class="text-muted text-xs">${uf(l)}</span>
      ${e.task&&r`<span class="text-xs mono text-muted">\u2014 ${K(e.task)}</span>`}
    </div>
    ${o.length>0&&r`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${o.map(a=>{const i=Kn[a.state]||Kn.pending;return r`<div key=${a.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${i.bg};color:var(--bg);font-size:0.6rem;padding:1px 4px">${i.label}</span>
          <span class="mono">${K(a.name||a.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function pf({entityState:e}){if(!e||!e.agents||!e.agents.length)return null;const t=e.agents,s=e.tasks||[],n=Date.now()/1e3,l=t.filter(a=>a.state==="active"),o=t.filter(a=>a.state!=="active");return r`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${t.length} agent${t.length>1?"s":""}</span>
      ${l.length>0&&r`<span class="badge text-xs" style="background:var(--green);color:var(--bg)">${l.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${l.map(a=>r`<${Yi} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
      ${o.map(a=>r`<${Yi} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
    </div>
  </div>`}function ff({tasks:e}){if(!e||!e.length)return null;const t=e.filter(o=>o.state==="pending"),s=e.filter(o=>o.state==="active"),n=e.filter(o=>o.state==="done");function l({title:o,items:a,color:i}){return r`<div class="tt-column">
      <div class="tt-column-head" style="border-bottom:2px solid ${i}">
        <strong class="text-sm">${o}</strong>
        <span class="text-muted text-xs">${a.length}</span>
      </div>
      <div class="tt-column-body">
        ${a.length?a.map(c=>r`<div key=${c.task_id} class="tt-task-card">
              <div class="text-sm" style="font-weight:500">${K(c.name||c.task_id)}</div>
              ${c.agent_id&&r`<div class="text-xs text-muted">Agent: ${K(c.agent_id)}</div>`}
            </div>`):r`<p class="text-muted text-xs" style="padding:var(--sp-3)">None</p>`}
      </div>
    </div>`}return r`<div class="tt-board">
    <${l} title="Pending" items=${t} color="var(--fg3)"/>
    <${l} title="Active" items=${s} color="var(--accent)"/>
    <${l} title="Done" items=${n} color="var(--green)"/>
  </div>`}function sl(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Kt({title:e,icon:t,badge:s,defaultOpen:n,children:l}){const[o,a]=q(n||!1);return r`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>a(i=>!i)}
      aria-expanded=${o}>
      <span class="sd-panel-icon">${t}</span>
      <span class="sd-panel-title">${e}</span>
      ${s!=null&&r`<span class="badge text-xs" style="margin-left:var(--sp-2)">${s}</span>`}
      <span class="sd-panel-arrow">${o?"▲":"▼"}</span>
    </button>
    ${o&&r`<div class="sd-panel-body">${l}</div>`}
  </div>`}function vf({sessionId:e}){const[t,s]=q([]),[n,l]=q(!0);if(ae(()=>{if(!e)return;l(!0);const a=Math.floor(Date.now()/1e3)-86400;Uo({sessionId:e,limit:200,since:a}).then(i=>{s(i.reverse()),l(!1)}).catch(()=>l(!1))},[e]),n)return r`<p class="loading-state">Loading events...</p>`;if(!t.length)return r`<p class="empty-state">No events recorded for this session.</p>`;const o={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)"};return r`<div class="sd-events">
    ${t.map((a,i)=>{const c=o[a.kind]||"var(--fg3)",d=a.detail||{},v=d.path||d.name||d.tool_name||a.kind;return r`<div key=${i} class="sd-event-row">
        <span class="sd-event-time">${jt(a.ts)}</span>
        <span class="sd-event-dot" style="background:${c}"></span>
        <span class="sd-event-kind">${a.kind}</span>
        <span class="sd-event-desc mono text-muted">${K(String(v))}</span>
      </div>`})}
  </div>`}const mf={"claude-opus-4-6":1e6,"claude-sonnet-4.6":1e6,"claude-sonnet-4":2e5,"claude-haiku-4.5":2e5,"gpt-5.4":2e5,"gpt-5":128e3},Ki=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],hf=95;function gf({session:e}){const{snap:t}=qe(Ne),s=e.files_loaded||[],n=((t==null?void 0:t.tool_configs)||[]).map(g=>g.model).filter(Boolean)[0]||"",l=mf[n]||2e5,a=(t&&t.agent_memory||[]).reduce((g,x)=>g+(x.tokens||0),0),i=s.length*150,d=Ki.reduce((g,x)=>g+x.tokens,0)+a+i,v=Math.min(d/l*100,100),u=hf,m=[...Ki,{name:"Memory",tokens:a,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:i,color:"var(--green)"}].filter(g=>g.tokens>0);return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${z(d)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${z(l)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${v>80?"var(--orange)":v>50?"var(--yellow)":"var(--green)"}">${_e(v)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${m.map(g=>{const x=(g.tokens/l*100).toFixed(1);return r`<div key=${g.name} style="width:${x}%;background:${g.color};min-width:${g.tokens>0?"1px":"0"}"
              title="${g.name}: ~${z(g.tokens)} tokens"></div>`})}
        </div>
        <div style="position:absolute;left:${u}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${u}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${m.map(g=>r`<span key=${g.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${g.color};margin-right:2px"></span>
          ${g.name} ${z(g.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${u}%</span>
      </div>
    </div>

    ${s.length>0&&r`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${s.map(g=>r`<div key=${g} class="text-muted" style="padding:2px 0">${K(g)}</div>`)}
    </div>`}
    ${!s.length&&r`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function _f({session:e}){const{snap:t}=qe(Ne),s=t&&t.agent_memory||[],n=e.project||"",l=n?s.filter(o=>{const a=o.project||o.tool||"";return!n||a.includes(n.replace(/\\/g,"/").split("/").pop())}):s;return l.length?r`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${l.map((o,a)=>r`<${$f} key=${a} mem=${o}/>`)}
  </div>`:r`<p class="empty-state">No memory entries found${n?" for this project":""}.</p>`}function $f({mem:e}){const[t,s]=q(!1),n=e.name||(e.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",l=(e.content||"").slice(0,300);return r`<div class="sd-memory-entry" style="cursor:pointer" onClick=${()=>s(!t)}>
    <div class="flex-row gap-sm" style="align-items:center">
      <span class="badge text-xs">${e.type||e.source||"file"}</span>
      <strong title=${e.file||e.path||""}>${K(n)}</strong>
      ${e.tokens?r`<span class="text-muted">${z(e.tokens)} tok</span>`:null}
      ${e.lines?r`<span class="text-muted">${e.lines}ln</span>`:null}
      ${e.profile?r`<span class="text-muted">${K(e.profile)}</span>`:null}
      <span class="text-muted" style="margin-left:auto;font-size:var(--fs-2xs)">${t?"▲":"▼"}</span>
    </div>
    ${t&&l?r`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${K(e.content)}${e.content&&e.content.length>300,""}</pre>`:null}
  </div>`}function bf({rateLimits:e}){return!e||!Object.keys(e).length?null:r`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(e).map(([t,s])=>{const n=s.used_pct||s.used_percentage||0,l=n>80?"var(--red)":n>60?"var(--orange)":"var(--green)",o=s.resets_at||"";return r`<div key=${t} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${t} window</span>
            <span style="color:${l};font-weight:600">${_e(n)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(n,100)}%;background:${l};border-radius:4px"></div>
          </div>
          ${o&&r`<div class="text-xs text-muted" style="margin-top:2px">resets ${o}</div>`}
        </div>`})}
    </div>
  </div>`}function yf({session:e}){const t=e.exact_input_tokens||0,s=e.exact_output_tokens||0,[n,l]=q(null);ae(()=>{e.tool&&Mr({tool:e.tool,active:!1,limit:20}).then(i=>{if(i.length>1){const c=i.filter(v=>v.duration_s>0).map(v=>v.duration_s),d=c.length?c.reduce((v,u)=>v+u,0)/c.length:0;l({avgDuration:d,sampleCount:i.length})}}).catch(()=>{})},[e.tool]);const o=e.duration_s||0,a=n&&n.avgDuration>0?o/n.avgDuration:null;return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${z(t)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${z(s)}</div></div>
      <div class="es-kv-card"><div class="label">Total Tokens</div><div class="value">${z(t+s)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${_e(e.cpu_percent||0)}</div></div>
      <div class="es-kv-card"><div class="label">Peak CPU</div><div class="value">${_e(e.peak_cpu_percent||0)}</div></div>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Inbound</div><div class="value">${ge(e.inbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">Outbound</div><div class="value">${ge(e.outbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">State Writes</div><div class="value">${ge(e.state_bytes_written||0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(e.pids)?e.pids.length:e.pids||0}</div></div>
    </div>
    ${a!=null&&r`<div class="text-xs text-muted" style="margin-top:var(--sp-3)">
      vs average (${n.sampleCount} sessions):
      duration ${a>1.2?r`<span class="text-orange">${a.toFixed(1)}x longer</span>`:a<.8?r`<span class="text-green">${(1/a).toFixed(1)}x shorter</span>`:r`<span>similar</span>`}
    </div>`}
    ${e.entity_state&&r`<${bf} rateLimits=${e.entity_state.rate_limits}/>`}
  </div>`}function xf({project:e}){const[t,s]=q(null);return ae(()=>{e&&xd(7).then(n=>{const l=n.find(o=>o.project===e);s(l||null)}).catch(()=>{})},[e]),t?r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${t.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${z(t.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${z(t.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value">$${t.cost_usd.toFixed(2)}</div></div>
    </div>
    ${t.daily&&t.daily.length>0&&r`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${t.daily.map(n=>{const l=n.input_tokens+n.output_tokens,o=Math.max(...t.daily.map(c=>c.input_tokens+c.output_tokens),1),a=(l/o*100).toFixed(1),i=new Date(n.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return r`<div key=${n.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${i}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${a}%;background:var(--green);border-radius:3px"
              title="${z(l)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${z(l)}</span>
        </div>`})}
    </div>`}
  </div>`:r`<p class="empty-state">No cost data available for this project.</p>`}function kf({project:e,tool:t}){const[s,n]=q(null);if(ae(()=>{!e||!t||_d(e,t,30,20).then(n).catch(()=>n([]))},[e,t]),!s||s.length<2)return r`<p class="empty-state">Not enough session history for trend analysis.</p>`;const l=Math.max(...s.map(i=>i.total_tokens),1),o=s.reduce((i,c)=>i+c.duration_s,0)/s.length,a=s.reduce((i,c)=>i+c.total_tokens,0)/s.length;return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${sl(o)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${z(a)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${s.map(i=>{const c=(i.total_tokens/l*100).toFixed(1),d=new Date(i.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),v=o>0?i.duration_s/o:1;return r`<div key=${i.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${d}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${c}%;border-radius:3px;background:${v>1.5?"var(--orange)":v<.7?"var(--green)":"var(--accent)"}" title="${z(i.total_tokens)} tok, ${sl(i.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${z(i.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${sl(i.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function wf({sessionId:e}){const[t,s]=q(null),[n,l]=q(!0);if(ae(()=>{l(!0);const i=Math.floor(Date.now()/1e3)-3600;kd(i,100).then(c=>{s(c),l(!1)}).catch(()=>l(!1))},[e]),n)return r`<p class="loading-state">Loading API call data...</p>`;if(!t||!t.calls||!t.calls.length)return r`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;const{calls:o,summary:a}=t;return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">API Calls</div><div class="value">${a.total_calls}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${a.total_errors>0?"var(--red)":"var(--fg)"}">${a.total_errors}</div>
      </div>
      <div class="es-kv-card"><div class="label">Avg Latency</div><div class="value">${a.avg_latency_ms}ms</div></div>
      <div class="es-kv-card"><div class="label">P95 Latency</div><div class="value">${a.p95_latency_ms}ms</div></div>
    </div>
    ${a.by_model&&Object.keys(a.by_model).length>0&&r`
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By model</div>
      <div class="flex-row gap-sm flex-wrap" style="margin-bottom:var(--sp-3)">
        ${Object.entries(a.by_model).map(([i,c])=>r`
          <span key=${i} class="badge text-xs">${i}: ${c}</span>
        `)}
      </div>
    `}
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${o.slice(0,30).map((i,c)=>{const d=i.status==="error",v=new Date(i.ts*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});return r`<div key=${c} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${v}</span>
          <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${d?"var(--red)":"var(--green)"}"></span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${i.model||"—"}</span>
          ${!d&&r`<span style="width:50px;flex-shrink:0;text-align:right">${i.duration_ms||0}ms</span>`}
          ${!d&&r`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${z(i.input_tokens||0)}in</span>`}
          ${d&&r`<span style="color:var(--red)">${K(i.error||"error")}</span>`}
        </div>`})}
    </div>
  </div>`}function Sf({session:e}){const t=e.files_touched||[],s=e.file_events||0;return t.length?r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${t.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${z(s)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${t.map(n=>r`<div key=${n} class="text-muted" style="padding:2px 0">${K(n)}</div>`)}
    </div>
  </div>`:r`<p class="empty-state">No file changes recorded.</p>`}function Tf({session:e,onClose:t}){const s=Le[e.tool]||"var(--fg2)",n=e.files_loaded||[],l=e.files_touched||[],o=e.exact_input_tokens||0,a=e.exact_output_tokens||0,i=e.entity_state||null,c=i&&i.agents&&i.agents.length>0,d=i&&i.tasks&&i.tasks.length>0;return r`<div class="sd-container" style="border-left:3px solid ${s}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${K(e.tool)}</strong>
        ${e.project&&r`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${e.project}>${K(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">
          ${sl(e.duration_s)}
        </span>
        ${c&&r`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">
          Team (${i.agents.length})
        </span>`}
      </div>
      <div class="text-muted text-xs mono" style="margin-top:var(--sp-2)" title=${e.session_id}>
        ${e.session_id}
      </div>
      ${t&&r`<button class="sd-close" onClick=${t} aria-label="Close session detail">\u2715</button>`}
    </div>

    <${Kt} title="Actions" icon="\u26A1" badge=${null} defaultOpen=${!0}>
      <${vf} sessionId=${e.session_id}/>
    <//>
    ${c&&r`<${Kt} title="Team" icon="\uD83D\uDC65" badge=${i.agents.length+" agents"} defaultOpen=${!0}>
      <${pf} entityState=${i}/>
    <//>`}
    ${d&&r`<${Kt} title="Tasks" icon="\uD83D\uDCCB" badge=${i.tasks.length} defaultOpen=${!0}>
      <${ff} tasks=${i.tasks}/>
    <//>`}
    <${Kt} title="Context" icon="\uD83D\uDCDA" badge=${n.length||null}>
      <${gf} session=${e}/>
    <//>
    <${Kt} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${!1}>
      <${_f} session=${e}/>
    <//>
    <${Kt} title="Resources" icon="\u2699\uFE0F" badge=${z(o+a)+" tok"}>
      <${yf} session=${e}/>
    <//>
    <${Kt} title="Deliverables" icon="\uD83D\uDCE6" badge=${l.length||null}>
      <${Sf} session=${e}/>
    <//>
    <${Kt} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${!1}>
      <${wf} sessionId=${e.session_id}/>
    <//>
    ${e.project&&r`<${Kt} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${!1}>
      <${xf} project=${e.project}/>
    <//>`}
    ${e.project&&e.tool&&r`<${Kt} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${!1}>
      <${kf} project=${e.project} tool=${e.tool}/>
    <//>`}
  </div>`}function Cf(e,t,s){const n=t-e,l=[300,600,900,1800,3600,7200,10800,21600,43200,86400];let o=l[l.length-1];for(const c of l)if(n/c<=s){o=c;break}const a=Math.ceil(e/o)*o,i=[];for(let c=a;c<=t;c+=o){const d=new Date(c*1e3);let v;o>=86400?v=d.toLocaleDateString([],{month:"short",day:"numeric"}):n>86400?v=d.toLocaleString([],{hourCycle:"h23",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):v=d.toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),i.push({ts:c,label:v})}return i}function Mf(e){return e>=3600?(e/3600).toFixed(1)+"h":e>=60?Math.round(e/60)+"m":Math.round(e)+"s"}function Ji(e,t,s,n){const l=e.duration_s||(e.ended_at||n)-e.started_at,o=new Date(e.started_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),a=e.ended_at?new Date(e.ended_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):"now",i=[Mf(l)];e.conversations&&i.push(e.conversations+" conv"),e.subagents&&i.push(e.subagents+" agents"),e.source_files?i.push(e.source_files+" src files"):e.unique_files&&i.push(e.unique_files+" files"),e.bytes_written>1024&&i.push(ge(e.bytes_written));const c=!e.ended_at;return r`<div class="stl-tip">
    <div class="stl-tip-head">
      <span style=${"color:"+t}>${s}</span>
      <strong>${e.tool}</strong>
      ${c?r`<span class="badge" style="font-size:9px;background:var(--green);color:#000">live</span>`:""}
    </div>
    <div class="stl-tip-time">${o} – ${a}</div>
    <div class="stl-tip-stats">${i.join(" · ")}</div>
    ${e.project?r`<div class="stl-tip-proj">${e.project.replace(/\\/g,"/").split("/").pop()}</div>`:""}
  </div>`}function Ef({sessions:e,rangeSeconds:t,onSelect:s}){const n=Date.now()/1e3,l=t||86400,o=n-l,a=(e||[]).filter(C=>(C.ended_at||n)>=o&&C.started_at<=n),i=a.filter(C=>C.ended_at).sort((C,I)=>C.started_at-I.started_at),c=a.filter(C=>!C.ended_at).sort((C,I)=>C.started_at-I.started_at),d=[],v=[];for(const C of i){const I=Math.max(C.started_at,o),b=C.ended_at;let M=-1;for(let O=0;O<d.length;O++)if(I>=d[O]+2){d[O]=b,M=O;break}M<0&&(M=d.length,d.push(b)),v.push(M)}const u=10,m=2,g=18,x=14,L=Math.max(d.length,0),T=L>0?L*(u+m)+m:0,y=c.length>0?x+m*2:0,$=T>0&&y>0?1:0,k=T+$+y,S=Math.max(k,20)+g,B=Cf(o,n,8),A=C=>(Math.max(C,o)-o)/l*100;return r`<div class="stl">
    <div class="stl-chart" style=${"height:"+S+"px"}>
      ${B.map(C=>r`<div key=${C.ts} class="stl-grid"
        style=${"left:"+A(C.ts).toFixed(2)+"%;bottom:"+g+"px"} />`)}

      <!-- ended session bars -->
      ${i.map((C,I)=>{const b=Math.max(C.started_at,o),M=A(b),O=Math.max(.15,A(C.ended_at)-M),P=v[I]*(u+m)+m,R=Le[C.tool]||"var(--fg2)",N=vt[C.tool]||"🔹";return r`<div key=${C.session_id} class="stl-bar"
          style=${"left:"+M.toFixed(2)+"%;width:"+O.toFixed(2)+"%;top:"+P+"px;height:"+u+"px;background:"+R}
          onClick=${()=>s&&s(C)}>
          ${Ji(C,R,N,n)}
        </div>`})}

      <!-- divider between ended and live -->
      ${$?r`<div class="stl-divider" style=${"top:"+T+"px"} />`:""}

      <!-- live session markers -->
      ${c.map(C=>{const I=A(C.started_at),b=T+$+m,M=Le[C.tool]||"var(--fg2)",O=vt[C.tool]||"🔹";return r`<div key=${C.session_id} class="stl-marker"
          style=${"left:"+I.toFixed(2)+"%;top:"+b+"px;background:"+M}
          onClick=${()=>s&&s(C)}>
          ${Ji(C,M,O,n)}
        </div>`})}

      <div class="stl-axis" style=${"top:"+(S-g)+"px"}>
        ${B.map(C=>r`<span key=${C.ts} class="stl-tick"
          style=${"left:"+A(C.ts).toFixed(2)+"%"}>${C.label}</span>`)}
      </div>
    </div>
  </div>`}function Ro(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function yc(e){let t=0;for(const s of e)(s.role==="lead"||s.role==="teammate"||s.role==="subagent")&&t++,t+=yc(s.children||[]);return t}function Qi({session:e,onSelect:t,isSelected:s,agentTeams:n}){const l=Le[e.tool]||"var(--fg2)",o=vt[e.tool]||"🔹",a=(n||[]).find(d=>d.session_id===e.session_id),i=a?a.agent_count:yc(e.process_tree||[]),c=i>1;return r`<div class="diag-card" style="border-left:3px solid ${l};cursor:pointer;${s?"outline:2px solid var(--accent);outline-offset:-2px":""}"
    onClick=${()=>t(e)}>
    <div class="flex-row gap-sm mb-sm">
      <span style="font-size:var(--fs-2xl)">${o}</span>
      <strong style="font-size:var(--fs-lg)">${K(e.tool)}</strong>
      ${c&&r`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">Team (${i})</span>`}
      ${e.project&&r`<span class="text-muted text-xs mono text-ellipsis" style="max-width:150px"
        title=${e.project}>${K(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
      <span class="badge" style="margin-left:auto;background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Duration</div><div class="value">${Ro(e.duration_s)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${_e(e.cpu_percent||0)}</div></div>
      <div class="es-kv-card"><div class="label">Input Tok</div><div class="value">${z(e.exact_input_tokens||0)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tok</div><div class="value">${z(e.exact_output_tokens||0)}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${z(e.file_events||0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(e.pids)?e.pids.length:e.pids||0}</div></div>
    </div>
    <div class="text-muted text-xs text-mono text-ellipsis" style="margin-top:var(--sp-3)"
      title=${e.session_id}>
      ${e.session_id}
    </div>
  </div>`}function Lf(){const{snap:e}=qe(Ne),t=e&&e.agent_teams||[];if(!t.length)return null;const s=t.reduce((o,a)=>o+a.agent_count,0),n=t.reduce((o,a)=>o+(a.total_input_tokens||0),0),l=t.reduce((o,a)=>o+(a.total_output_tokens||0),0);return r`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Agent Teams
      <span class="badge">${t.length} sessions</span>
      <span class="badge">${s} agents</span>
      <span class="badge">${z(n+l)} tok</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      ${t.sort((o,a)=>(a.total_input_tokens||0)-(o.total_input_tokens||0)).slice(0,8).map(o=>r`
        <${Af} key=${o.session_id} team=${o}/>
      `)}
    </div>
  </div>`}function Df(e){return e?e.replace("claude-","").replace("-20251001",""):"?"}function Af({team:e}){const[t,s]=q(!1),[n,l]=q(e.agents||null),[o,a]=q(!1);e.models,ae(()=>{!t||n||(a(!0),$d(e.session_id).then(u=>{l(u.agents||[]),a(!1)}).catch(()=>{l([]),a(!1)}))},[t]);const i=(n||[]).filter(u=>(u.input_tokens||0)+(u.output_tokens||0)>50),c=(n||[]).length-i.length,d=i.sort((u,m)=>m.input_tokens+m.output_tokens-(u.input_tokens+u.output_tokens)),v=d[0]?(d[0].input_tokens||0)+(d[0].output_tokens||0):1;return r`<div class="diag-card" style="border-left:3px solid var(--accent);padding:var(--sp-4)">
    <div class="flex-row gap-sm mb-sm" style="align-items:center;cursor:pointer" onClick=${()=>s(!t)}>
      <span class="badge" style="background:var(--accent);color:var(--bg)">${e.agent_count||i.length} agents${c?r` <span style="opacity:0.6">+${c}w</span>`:null}</span>
      <span class="text-muted text-xs">${z(e.total_input_tokens||0)}in / ${z(e.total_output_tokens||0)}out</span>
      ${(e.tools_used||[]).length>0&&r`<span class="text-muted text-xs">${e.tools_used.join(", ")}</span>`}
      <span class="mono text-xs text-muted" style="margin-left:auto" title=${e.session_id}>${e.session_id.slice(0,12)}\u2026</span>
      <span class="text-xs text-muted">${t?"▲":"▼"}</span>
    </div>
    <!-- Agent rows: show loading, or compact agent rows with task + tokens -->
    ${o?r`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading agents\u2026</div>`:r`<div style="display:flex;flex-direction:column;gap:1px">
      ${d.slice(0,t?999:5).map(u=>{const m=(u.input_tokens||0)+(u.output_tokens||0),g=Math.max(1,m/v*100);return r`<div key=${u.agent_id} style="display:grid;
          grid-template-columns:2px 1fr minmax(60px,auto) minmax(50px,auto) 14px;
          gap:var(--sp-2);align-items:center;padding:2px var(--sp-2);font-size:var(--fs-xs);
          background:var(--bg);border-radius:2px">
          <div style="width:2px;height:100%;background:${u.is_sidechain?"var(--yellow)":"var(--green)"}"></div>
          <div class="text-ellipsis" title=${u.task||u.slug||u.agent_id}
            style="color:${u.task?"var(--fg)":"var(--fg2)"}">${u.task||u.slug||u.agent_id.slice(0,10)}</div>
          <div style="display:flex;align-items:center;gap:var(--sp-1)">
            <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;min-width:30px">
              <div style="height:100%;width:${g}%;background:${u.is_sidechain?"var(--yellow)":"var(--green)"};border-radius:2px;opacity:0.7"></div>
            </div>
            <span class="text-muted" style="font-size:var(--fs-2xs);white-space:nowrap">${z(m)}</span>
          </div>
          <span class="text-muted" style="font-size:var(--fs-2xs)">${Df(u.model)}</span>
          ${u.completed?r`<span class="text-green">\u2713</span>`:r`<span class="text-orange">\u25CB</span>`}
        </div>`})}
      ${!t&&d.length>5?r`<div class="text-muted text-xs cursor-ptr" style="padding:2px var(--sp-2)"
        onClick=${u=>{u.stopPropagation(),s(!0)}}>+${d.length-5} more agents\u2026</div>`:null}
    </div>`}
  </div>`}function Of(){const{snap:e,globalRange:t,rangeSeconds:s,enabledTools:n}=qe(Ne),[l,o]=q([]),[a,i]=q(!1),[c,d]=q(!0),[v,u]=q(null),[m,g]=q(null),[x,L]=q([]);ae(()=>{d(!0),i(!1),Mr({active:!1}).then(b=>{o(b),d(!1)}).catch(()=>{i(!0),d(!1)})},[]),ae(()=>{if(!t)return;const b=Math.min(t.since,Date.now()/1e3-86400);$l(null,{since:b,until:t.until}).then(L).catch(()=>L([]))},[t]),ae(()=>{const b=M=>{const O=M.detail;O&&O.session_id&&(u(O.session_id),g(O))};return window.addEventListener("aictl-session-select",b),()=>window.removeEventListener("aictl-session-select",b)},[]);const T=b=>n===null||n.includes(b),y=(e&&e.sessions||[]).filter(b=>T(b.tool)),$=l.filter(b=>T(b.tool)),k=x.filter(b=>T(b.tool));let S=y.find(b=>b.session_id===v);if(!S&&v){const M=l.find(O=>O.session_id===v)||m;M&&M.session_id===v&&(S={session_id:M.session_id,tool:M.tool,project:M.project||"",duration_s:M.duration_s||0,active:M.active||!1,started_at:M.started_at,ended_at:M.ended_at,files_touched:[],files_loaded:[],exact_input_tokens:M.input_tokens||0,exact_output_tokens:M.output_tokens||0,pids:[],file_events:M.files_modified||0})}const B=b=>{u(M=>M===b.session_id?null:b.session_id)},A={};for(const b of y){const M=b.project||"Unknown Project";A[M]||(A[M]=[]),A[M].push(b)}const C=Object.keys(A).sort();return r`<div>
    <div class="mb-lg">
      <${Ef} sessions=${k} rangeSeconds=${s}
        onSelect=${b=>{u(b.session_id),g(b)}}/>
    </div>

    <${Lf}/>

    ${S&&r`<${Tf} session=${S}
      onClose=${()=>u(null)}/>`}

    <div class="es-section">
      <div class="es-section-title">Active Sessions (${y.length})</div>
      ${y.length?C.length>1?C.map(b=>r`<div key=${b} style="margin-bottom:var(--sp-5)">
              <div class="text-muted text-sm mono" style="margin-bottom:var(--sp-3);font-weight:600">
                ${K(b.replace(/\\/g,"/").split("/").pop()||b)}
                <span class="text-xs" style="font-weight:400"> \u2014 ${A[b].length} session${A[b].length>1?"s":""}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
                ${A[b].map(M=>r`<${Qi} key=${M.session_id} session=${M}
                  onSelect=${B} isSelected=${M.session_id===v} agentTeams=${e==null?void 0:e.agent_teams}/>`)}
              </div>
            </div>`):r`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
              ${y.map(b=>r`<${Qi} key=${b.session_id} session=${b}
                onSelect=${B} isSelected=${b.session_id===v}/>`)}
            </div>`:r`<div class="empty-state">
            <p>No active sessions.</p>
            ${$.length>0&&r`<div class="diag-card" style="margin-top:var(--sp-4);max-width:400px">
              <div class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Last session</div>
              <div class="flex-row gap-sm" style="align-items:center">
                <span style="color:${Le[$[0].tool]||"var(--fg2)"}">${vt[$[0].tool]||"🔹"}</span>
                <strong>${K($[0].tool)}</strong>
                <span class="text-muted text-xs">${Ro($[0].duration_s)}</span>
                ${$[0].ended_at&&r`<span class="text-muted text-xs">${jt($[0].ended_at)}</span>`}
              </div>
            </div>`}
          </div>`}
    </div>

    <div class="es-section" style="margin-top:var(--sp-8)">
      <div class="es-section-title">Session History</div>
      ${c?r`<p class="loading-state">Loading...</p>`:a?r`<p class="error-state">Failed to load session history.</p>`:$.length?r`<table role="table" aria-label="Session history" class="text-sm">
                <thead><tr>
                  <th>Tool</th>
                  <th>Session ID</th>
                  <th>PID</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr></thead>
                <tbody>${$.map(b=>{const M=Le[b.tool]||"var(--fg2)",O=vt[b.tool]||"🔹",P=b.session_id?b.session_id.length>12?b.session_id.slice(0,12)+"…":b.session_id:"—";return r`<tr key=${b.session_id} style="cursor:pointer;${b.session_id===v?"background:var(--bg2)":""}"
                    onClick=${()=>{u(b.session_id===v?null:b.session_id),g(null)}}>
                    <td>
                      <span style="color:${M};margin-right:var(--sp-2)">${O}</span>
                      ${K(b.tool)}
                    </td>
                    <td><span class="mono" title=${b.session_id} style="font-size:0.7rem">${P}</span></td>
                    <td><span class="mono" style="font-size:0.7rem">${b.pid||"—"}</span></td>
                    <td>${Ro(b.duration_s)}</td>
                    <td>${b.active?r`<span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>`:r`<span class="badge" style="font-size:var(--fs-xs)">ended</span>`}</td>
                    <td>${b.ended_at?jt(b.ended_at):"—"}</td>
                  </tr>`})}</tbody>
              </table>`:r`<p class="empty-state">No past sessions recorded.</p>`}
    </div>
  </div>`}function Zi(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function Pf(e,t,s){let n;return{hooks:{init(l){n=document.createElement("div"),n.className="chart-tooltip",n.style.display="none",l.over.appendChild(n)},setCursor(l){var v;const o=l.cursor.idx;if(o==null){n.style.display="none";return}const a=[];for(let u=1;u<l.series.length;u++){const m=(v=l.data[u])==null?void 0:v[o];m!=null&&a.push(t?t(m):z(m))}if(!a.length){n.style.display="none";return}const i=l.data[0][o],c=s?new Date(i*1e3).toLocaleTimeString([],{hourCycle:"h23"}):e?e(i):z(i);n.innerHTML=`<b>${a.join(", ")}</b> ${c}`;const d=Math.round(l.valToPos(i,"x"));n.style.left=Math.min(d,l.over.clientWidth-100)+"px",n.style.display=""}}}}const zf=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function Rf(e){return e==null||e===0?"0":e>=1e6?Math.round(e/1e6)+"M":e>=1e3?Math.round(e/1e3)+"K":e>=1?Math.round(e).toString():e.toPrecision(1)}function If(e,t,s,n){const l=Math.max(0,Math.floor(Math.log10(Math.max(1,s)))),o=Math.ceil(Math.log10(Math.max(1,n))),a=[];for(let c=l;c<=o;c++)a.push(Math.pow(10,c));if(a.length<=3)return a;const i=Math.floor((l+o)/2);return[Math.pow(10,l),Math.pow(10,i),Math.pow(10,o)]}function fo({mode:e,data:t,labels:s,colors:n,height:l,isTime:o,fmtX:a,fmtY:i,xLabel:c,yLabel:d,logX:v}){const u=lt(null),m=lt(null),g=l||200;return ae(()=>{if(!u.current||!t||t.length<2||!t[0]||t[0].length<2)return;try{m.current&&(m.current.destroy(),m.current=null)}catch{m.current=null}const x=t.length-1,L=n||zf,T=[{}];for(let $=0;$<x;$++){const k=L[$%L.length],S=Zi(k,.6);e==="scatter"?T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:"transparent",paths:()=>null,points:{show:!0,size:8,fill:S,stroke:"transparent",width:0}}):T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:k,width:1.5,fill:Zi(k,.08),points:{show:!1}})}const y={width:u.current.clientWidth||300,height:g,padding:[8,8,0,0],cursor:{show:!0,x:!0,y:!1,points:{show:e!=="scatter"}},legend:{show:!1},select:{show:!1},scales:{x:{time:!!o,...v?{distr:3,log:10}:{}},y:{auto:!0,range:($,k,S)=>[Math.max(0,k*.9),S*1.1||1]}},axes:[{show:!0,size:28,gap:2,...v?{splits:If}:{},values:o?void 0:($,k)=>k.map(S=>v?Rf(S):a?a(S):z(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}},{show:!0,size:50,gap:2,values:($,k)=>k.map(S=>i?i(S):z(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}}],series:T,plugins:[Pf(a,i,o)]};try{m.current=new ot(y,t,u.current)}catch($){console.warn("AnalyticsChart: uPlot init failed",$),m.current=null}return()=>{try{m.current&&(m.current.destroy(),m.current=null)}catch{}}},[t,e,n,s,o,v,g]),ae(()=>{if(!m.current||!u.current)return;const x=new ResizeObserver(()=>{m.current&&u.current&&m.current.setSize({width:u.current.clientWidth,height:g})});return x.observe(u.current),()=>x.disconnect()},[g]),r`<div class="analytics-chart-wrap" style=${"height:"+g+"px"} ref=${u}></div>`}function Ff(e){const t={};for(const s of e){const n=typeof s=="string"?s:s.metric;if(!n)continue;const l=n.split("."),o=l.length>1?l.slice(0,-1).join("."):"(ungrouped)";(t[o]=t[o]||[]).push({name:n,count:s.count||0,lastValue:s.last_value})}return Object.entries(t).sort((s,n)=>s[0].localeCompare(n[0]))}function Nf(){const[e,t]=q([]),[s,n]=q(null),[l,o]=q(null),[a,i]=q([]),[c,d]=q(!1),[v,u]=q(null);ae(()=>{Td().then(T=>{t(T||[]),u(null)}).catch(T=>{t([]),u(T.message)})},[]);const m=re(()=>Ff(e),[e]),g=ye(T=>{n(T),o(null),i([]),d(!0);const y=Math.floor(Date.now()/1e3)-1800,$=Cd(T,y).then(S=>o(S)).catch(()=>o(null)),k=Md(T,y).then(S=>i(Array.isArray(S)?S:[])).catch(()=>i([]));Promise.allSettled([$,k]).then(()=>d(!1))},[]),x=re(()=>!l||!l.value||!l.value.length?null:l.value[l.value.length-1],[l]),L=re(()=>{const T=new Set;for(const y of a)y.tags&&Object.keys(y.tags).forEach($=>T.add($));return[...T].sort()},[a]);return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${v&&r`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${K(v)}</p>`}
      ${!v&&!e.length&&r`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${m.map(([T,y])=>r`<div key=${T}>
        <div class="text-muted" style="font-size:0.62rem;padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${T}</div>
        ${y.map($=>r`<button key=${$.name}
          class=${s===$.name?"es-tool-btn active":"es-tool-btn"}
          onClick=${()=>g($.name)}>
          ${$.name.split(".").pop()}
          ${$.count?r`<span class="badge" style="margin-left:auto;font-size:var(--fs-2xs)">${z($.count)}</span>`:""}
        </button>`)}
      </div>`)}
    </div>
    <div>
      ${!s&&r`<div class="diag-card text-center" style="padding:2rem">
        <p class="text-muted">Select a metric from the sidebar to view its time series.</p>
      </div>`}

      ${s&&r`<Fragment>
        <h3 class="mb-sm">${s}</h3>

        ${c&&r`<p class="loading-state">Loading...</p>`}

        ${!c&&l&&l.ts&&l.ts.length>=2?r`<div class="es-section">
          <div class="es-section-title">Time Series (last 30m)</div>
          <${es}
            label=${s.split(".").pop()}
            value=${x!=null?z(x):"-"}
            data=${[l.ts,l.value]}
            chartColor="var(--accent)"
            smooth />
        </div>`:""}

        ${!c&&l&&l.ts&&l.ts.length<2&&r`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">Not enough data points to chart.</p>
        </div>`}

        ${!c&&!l&&!c&&r`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">No series data available.</p>
        </div>`}

        ${!c&&a.length>0&&r`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples (${a.length})</div>
          <div style="overflow-x:auto">
            <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
              <thead>
                <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
                  <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
                  <th style="padding:var(--sp-2) var(--sp-4)">Value</th>
                  ${L.map(T=>r`<th key=${T} style="padding:var(--sp-2) var(--sp-4)">${T}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${a.slice(-50).reverse().map((T,y)=>r`<tr key=${y}
                  style="border-bottom:1px solid var(--border);${y%2?"background:var(--bg2)":""}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${Ar(T.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${z(T.value)}</td>
                  ${L.map($=>r`<td key=${$} style="padding:var(--sp-2) var(--sp-4)">
                    ${T.tags&&T.tags[$]!=null?r`<span class="badge">${T.tags[$]}</span>`:"-"}
                  </td>`)}
                </tr>`)}
              </tbody>
            </table>
          </div>
        </div>`}

        ${!c&&a.length===0&&l&&r`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples</div>
          <p class="empty-state">No raw samples in the last 30 minutes.</p>
        </div>`}
      </Fragment>`}
    </div>
  </div>`}const nn=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function us(e){return e>=1e3?z(e/1e3)+"s":Math.round(e)+"ms"}function jf(e){return"#"+Math.round(e)}function vo(e){return(e||"").split("/").slice(-2).join("/")}function Bf({data:e}){if(!e||!e.requests||!e.requests.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <p class="empty-state">No request data in this time range.</p>
    </div>`;const t=e.requests,s=re(()=>{const c=t.map(v=>v.ts),d=t.map(v=>v.duration_ms);return[c,d]},[t]),n=re(()=>{const c=[...new Set(t.map(g=>g.model||"(unknown)"))],d=c.map(()=>[]),u=[...t.filter(g=>g.input_tokens>0)].sort((g,x)=>g.input_tokens-x.input_tokens),m=u.map(g=>g.input_tokens);for(const g of c)d[c.indexOf(g)]=u.map(x=>(x.model||"(unknown)")===g?x.duration_ms:null);return{data:[m,...d],labels:c,colors:nn.slice(0,c.length)}},[t]),l=e.by_model||[],o=Math.max(1,...l.map(c=>c.p95_ms)),a=re(()=>{const c=[...new Set(t.map(g=>g.model||"(unknown)"))],v=[...t.filter(g=>g.seq>0)].sort((g,x)=>g.seq-x.seq),u=v.map(g=>g.seq),m=c.map(g=>v.map(x=>(x.model||"(unknown)")===g?x.duration_ms:null));return{data:[u,...m],labels:c,colors:nn.slice(0,c.length)}},[t]),i=t.length?t[t.length-1].duration_ms:0;return r`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${us(i)}</span></div>
        <${fo} mode="line" data=${s} isTime=${!0} fmtY=${us} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${t.length} requests</span></div>
        <${fo} mode="scatter" data=${n.data} labels=${n.labels}
          colors=${n.colors} fmtX=${z} fmtY=${us} logX=${!0} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${l.map((c,d)=>r`<div key=${c.model} class="hbar-row">
            <span class="hbar-label" title=${c.model}>${c.model.replace(/^claude-/,"")||c.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${"width:"+Math.round(c.avg_ms/o*100)+"%;background:"+nn[d%nn.length]}></div>
              <div class="hbar-p95" style=${"left:"+Math.round(c.p95_ms/o*100)+"%"} title=${"p95: "+us(c.p95_ms)}></div>
            </div>
            <span class="hbar-value">${us(c.avg_ms)}</span>
            <span class="badge">${c.count}</span>
          </div>`)}
        </div>
        ${l.length>0&&r`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${fo} mode="scatter" data=${a.data} labels=${a.labels}
          colors=${a.colors} fmtX=${jf} fmtY=${us} logX=${!0} height=${200}/>
      </div>
    </div>
  </div>`}const Hf={"claude-code":"#8b5cf6",codex:"#f97316",aider:"#06b6d4",cursor:"#f472b6"};function xc(e,t){return Hf[e]||nn[t%nn.length]}function Xi({by_cli:e,total:t,barWidth:s,cliTools:n}){return!e||!e.length?r`<div class="hbar-fill" style=${"width:"+s+"%;background:var(--accent)"}></div>`:e.map((l,o)=>{const a=l.count/t*s,i=xc(l.cli_tool,n.indexOf(l.cli_tool));return r`<div key=${l.cli_tool}
      style=${"width:"+a.toFixed(1)+"%;background:"+i+";height:100%;display:inline-block"}
      title=${l.cli_tool+": "+l.count}></div>`})}function Wf({data:e}){if(!e||!e.invocations||!e.invocations.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      <p class="empty-state">${e!=null&&e.total_all_time?"No tool invocation data in this time range. Try a wider range ("+e.total_all_time+" invocations exist).":"No tool invocation data yet. Configure Claude Code hooks to capture tool usage."}</p>
    </div>`;const t=e.invocations,s=e.cli_tools||[],n=Math.max(1,...t.map(o=>o.count)),l=Math.max(1,...t.map(o=>o.p95_ms));return r`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    ${s.length>1&&r`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${s.map((o,a)=>r`<span key=${o} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${"width:10px;height:10px;border-radius:2px;background:"+xc(o,a)}></span>
        ${o}
      </span>`)}
    </div>`}
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Invocation Frequency</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${t.reduce((o,a)=>o+a.count,0)} total</span></div>
        <div class="hbar-list">
          ${t.slice(0,15).map(o=>r`<div key=${o.tool_name} class="hbar-row">
            <span class="hbar-label" title=${o.tool_name}>${o.tool_name}</span>
            <div class="hbar-track" style="overflow:hidden">
              <${Xi} by_cli=${o.by_cli} total=${o.count}
                barWidth=${Math.round(o.count/n*100)} cliTools=${s}/>
            </div>
            <span class="hbar-value">${z(o.count)}</span>
            ${o.error_count?r`<span class="badge" style="color:var(--red)">${o.error_count} err</span>`:""}
          </div>`)}
        </div>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Execution Duration</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">avg + p95</span></div>
        <div class="hbar-list">
          ${t.slice(0,15).map((o,a)=>r`<div key=${o.tool_name} class="hbar-row">
            <span class="hbar-label" title=${o.tool_name}>${o.tool_name}</span>
            <div class="hbar-track">
              <${Xi} by_cli=${o.by_cli} total=${o.count}
                barWidth=${Math.round(o.avg_ms/l*100)} cliTools=${s}/>
              <div class="hbar-p95" style=${"left:"+Math.round(o.p95_ms/l*100)+"%"} title=${"p95: "+us(o.p95_ms)}></div>
            </div>
            <span class="hbar-value">${us(o.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`}function qf({data:e}){const[t,s]=q(!1);if(!e)return null;const n=e.memory_timeline||{},l=e.memory_events||[],o=Object.keys(n);if(!o.length&&!l.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <p class="empty-state">No file write data in this time range.</p>
    </div>`;const a=t?o:o.slice(0,6);return r`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>

    ${o.length>0&&r`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${o.length} files)</div>
      <div class="analytics-charts">
        ${a.map(i=>{const c=n[i];if(!c||c.ts.length<2)return r`<div key=${i} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${i}>${vo(i)}</span>
              <span class="chart-val text-muted">${c&&c.size_bytes.length?ge(c.size_bytes[c.size_bytes.length-1]):"-"}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;const d=c.size_bytes[c.size_bytes.length-1];return r`<div key=${i} class="diag-card">
            <${es} label=${vo(i)} value=${ge(d)}
              data=${[c.ts,c.size_bytes]} chartColor="var(--accent)"/>
          </div>`})}
      </div>
      ${o.length>6&&!t&&r`<button class="range-btn" style="margin-top:var(--sp-2)"
        onClick=${()=>s(!0)}>Show all ${o.length} files</button>`}
    </div>`}

    ${l.length>0&&r`<div>
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Recent File Writes (${l.length})</div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
          <thead>
            <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
              <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
              <th style="padding:var(--sp-2) var(--sp-4)">File</th>
              <th style="padding:var(--sp-2) var(--sp-4)">Bytes</th>
              <th style="padding:var(--sp-2) var(--sp-4)">Growth</th>
              <th style="padding:var(--sp-2) var(--sp-4)">Tokens</th>
            </tr>
          </thead>
          <tbody>
            ${l.slice(0,30).map((i,c)=>r`<tr key=${c}
              style="border-bottom:1px solid var(--border);${c%2?"background:var(--bg2)":""}">
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${Ar(i.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${i.path}>${vo(i.path)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${ge(i.size_bytes)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4);color:${i.delta>0?"var(--green)":i.delta<0?"var(--red)":"var(--fg2)"}">
                ${i.delta>0?"+":""}${ge(Math.abs(i.delta))}${i.delta<0?" ↓":i.delta>0?" ↑":""}
              </td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${z(i.tokens)}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`}
  </div>`}function Uf(){const e=qe(Ne),t=e==null?void 0:e.globalRange,[s,n]=q(null),[l,o]=q(!0),[a,i]=q(null);return ae(()=>{o(!0),i(null);const c=(t==null?void 0:t.since)||Date.now()/1e3-86400,d=(t==null?void 0:t.until)||"",v=`/api/analytics?since=${c}${d?"&until="+d:""}`,u=new AbortController,m=setTimeout(()=>u.abort(),15e3);return yd(v,{signal:u.signal}).then(g=>{n(g),i(null)}).catch(g=>{g.name==="AbortError"?i("Request timed out"):(n(null),i(g.message))}).finally(()=>{clearTimeout(m),o(!1)}),()=>{clearTimeout(m),u.abort()}},[t==null?void 0:t.since,t==null?void 0:t.until]),r`<div class="analytics-grid">
    ${l&&r`<p class="loading-state">Loading analytics...</p>`}
    ${a&&r`<p class="error-state">Error: ${a}</p>`}
    ${!l&&!a&&r`<Fragment>
      <${Bf} data=${s==null?void 0:s.response_time}/>
      <${Wf} data=${s==null?void 0:s.tools}/>
      <${qf} data=${s==null?void 0:s.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <div style="margin-top:var(--sp-4)"><${Nf}/></div>
      </details>
    </Fragment>`}
  </div>`}function Vf({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:r`<div class="sf-tool-tabs">
    ${e.map(n=>r`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?Le[n]||"var(--accent)":"transparent"};color:${Le[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${vt[n]||"🔹"}</span> ${K(n)}
    </button>`)}
  </div>`}function ps(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function kc(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Gf(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"})}function wc(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function er(e){return e?e.replace("claude-","").replace(/-\d{8}$/,""):""}function Yf(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function Kf(e,t){if(!t)return"";let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{return t.slice(0,80)}if(typeof s!="object"||s===null)return String(t).slice(0,80);const n=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const o of n)if(s[o]){let a=String(s[o]);return(o==="file_path"||o==="path")&&a.length>60&&(a=".../"+a.replace(/\\/g,"/").split("/").slice(-2).join("/")),a.slice(0,100)}const l=Object.keys(s);return l.length>0?String(s[l[0]]).slice(0,80):""}const tr=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],sr={Bash:"#1a1a1a"};function nr(e){if(sr[e])return sr[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return tr[t%tr.length]}function Jf({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?r`<div class="sf-sess-tabs">
    ${e.map(l=>{const o=l.exact_input_tokens||l.input_tokens||0,a=l.exact_output_tokens||l.output_tokens||0,i=o+a,c=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),d=l.session_id===t,v=!l.ended_at;return r`<button key=${l.session_id}
        title=${l.session_id}
        class="sf-sess-tab ${d?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${Gf(l.started_at)}</span>
        <span class="sf-stab-sid">${Yf(l.session_id)}</span>
        <span class="sf-stab-dur">${kc(c)}</span>
        ${i>0&&r`<span class="sf-stab-tok">${z(i)}t</span>`}
        ${(l.files_modified||0)>0&&r`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${v&&r`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:r`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function Qf({event:e}){if(e.type==="user_message")return e.redacted?r`<div class="sf-seq-tooltip">
        <div class="sf-tip-label">User Prompt <span style="color:var(--orange)">(redacted)</span></div>
        <div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">
          Claude Code redacts prompts by default in OTel telemetry.
        </div>
        <div class="sf-tip-meta">
          To capture prompt text, restart Claude Code with:<br/>
          <code style="color:var(--accent)">eval $(aictl otel enable)</code><br/>
          This sets <code>OTEL_LOG_USER_PROMPTS=1</code> before launch.
        </div>
        ${e.prompt_length&&r`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">Prompt length: ${e.prompt_length} chars</div>`}
      </div>`:e.message?r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">User Prompt</div>
      <div class="sf-tip-body">${K(e.message)}</div>
      ${e.prompt_length&&r`<div class="sf-tip-meta">${e.prompt_length} chars</div>`}
    </div>`:null;if(e.type==="api_call"){const t=e.tokens||{};return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Call${e.model?" — "+e.model:""}</div>
      ${e.agent_name&&r`<div class="sf-tip-meta">Agent: ${K(e.agent_name)}</div>`}
      <div class="sf-tip-meta">
        Input: ${z(t.input||0)} \u00B7 Output: ${z(t.output||0)}
        ${(t.cache_read||0)>0?" · Cache: "+z(t.cache_read):""}
      </div>
      <div class="sf-tip-meta">
        ${e.duration_ms>0?"Duration: "+ps(e.duration_ms):""}
        ${e.ttft_ms>0?" · TTFT: "+ps(e.ttft_ms):""}
      </div>
      ${e.is_error&&r`<div class="sf-tip-meta" style="color:var(--red)">Error: ${K(e.error_type||"unknown")}</div>`}
    </div>`}if(e.type==="api_response"){const t=e.tokens||{};return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${e.model?" — "+e.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${z(t.output||0)} tokens
        ${e.duration_ms>0?" · Latency: "+ps(e.duration_ms):""}
        ${e.finish_reason?" · "+e.finish_reason:""}
      </div>
      ${e.response_preview&&r`<div class="sf-tip-body">${K(e.response_preview)}</div>`}
    </div>`}if(e.type==="error")return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${K(e.error_type||"unknown")}</div>
      ${e.error_message&&r`<div class="sf-tip-body">${K(e.error_message)}</div>`}
      ${e.parent_span&&r`<div class="sf-tip-meta">During: ${K(e.parent_span)}</div>`}
    </div>`;if(e.type==="tool_use"){let t=null;if(e.params){let s=e.params;if(typeof s=="string")try{s=JSON.parse(s)}catch{s=null}s&&typeof s=="object"&&(t=Object.entries(s).filter(([,n])=>n!=null&&n!==""))}return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${K(e.to||"Tool")}${e.subtype==="result"?" (result)":e.subtype==="decision"?" (decision)":""}</div>
      ${e.decision&&r`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${K(e.decision)}</strong></div>`}
      ${t?r`<div class="sf-tip-params">
            ${t.map(([s,n])=>{const l=String(n),o=l.length>120;return r`<div key=${s} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${K(s)}</span>
                <span class="sf-tip-param-val ${o?"sf-tip-param-long":""}" title=${l}>${K(o?l.slice(0,200)+"...":l)}</span>
              </div>`})}
          </div>`:e.params&&r`<div class="sf-tip-body mono">${K(e.params)}</div>`}
      ${(e.success||e.duration_ms>0||e.result_size)&&r`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${e.success?"Success: "+e.success:""}
        ${e.duration_ms>0?" · "+ps(e.duration_ms):""}
        ${e.result_size?" · Result: "+e.result_size+" bytes":""}
      </div>`}
    </div>`}return e.type==="subagent"?r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${K(e.to||"agent")}</div>
    </div>`:e.type==="hook"?r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${K(e.hook_name||"")}</div>
    </div>`:null}function Zf({event:e,participants:t,hoveredIdx:s,idx:n,onHover:l}){const o=t.findIndex(k=>k.id===e._from),a=t.findIndex(k=>k.id===e._to);if(o<0||a<0)return null;const i=a>o,c=Math.min(o,a),d=Math.max(o,a),v=s===n,u=t.find(k=>k.id===e._to),g={user_message:"var(--green)",api_call:e.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:(u==null?void 0:u.color)||"var(--cat-commands)",subagent:(u==null?void 0:u.color)||"var(--yellow)",hook:"var(--orange)"}[e.type]||"var(--fg2)";let x="",L="";if(e.type==="user_message")e.redacted?x="🔒 prompt ("+(e.prompt_length||"?")+" chars)":(x=e.preview||"(prompt)",e.prompt_length&&(L=e.prompt_length+" chars"));else if(e.type==="api_call"){const k=e.tokens||{};x=e.agent_name||er(e.model)||"API call",L=z((k.input||0)+(k.output||0))+"t",e.ttft_ms>0?L+=" ttft:"+ps(e.ttft_ms):e.duration_ms>0&&(L+=" "+ps(e.duration_ms)),e.is_error&&(L+=" ⚠")}else if(e.type==="api_response"){const k=e.tokens||{};x="← "+z(k.output||0)+"t",e.response_preview&&(x+=" "+e.response_preview.slice(0,60)),L=er(e.model)||"",e.finish_reason&&e.finish_reason!=="stop"&&(L+=" ["+e.finish_reason+"]")}else if(e.type==="error")x="⚠ "+(e.error_type||"error"),L=e.error_message?e.error_message.slice(0,60):"";else if(e.type==="tool_use"){const k=e.to||"tool",S=Kf(k,e.params);x=k+(S?": "+S:""),e.subtype==="result"?(L=e.success==="true"||e.success===!0?"✓":"✗",e.duration_ms>0&&(L+=" "+ps(e.duration_ms)),e.result_size&&(L+=" "+e.result_size+"B")):e.subtype==="decision"&&(L=e.decision||"")}else e.type==="subagent"?x=e.to||"subagent":e.type==="hook"&&(x=e.hook_name||"hook");const T=100/t.length,y=(c+.5)*T,$=(d+.5)*T;return r`<div class="sf-seq-row ${v?"hovered":""}"
    onMouseEnter=${()=>l(n)} onMouseLeave=${()=>l(null)}>
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${e._cumTok>0?z(e._cumTok):""}</span>
      <span class="sf-seq-rttok">${e._rtTok>0?z(e._rtTok):""}</span>
    </div>
    <div class="sf-seq-time">${wc(e.ts)}</div>
    <div class="sf-seq-arrow-area">
      ${t.map((k,S)=>r`<div key=${S} class="sf-seq-lane"
        style="left:${(S+.5)*T}%"></div>`)}
      <div class="sf-seq-arrow-line" style="
        left:${y}%;
        width:${$-y}%;
        border-color:${g};
      "></div>
      <div class="sf-seq-arrowhead" style="
        left:${i?$:y}%;
        border-${i?"left":"right"}-color:${g};
        transform:translateX(${i?"-100%":"0"});
      "></div>
      <div class="sf-seq-label" style="
        left:${(y+$)/2}%;
        color:${g};
      "><span class="sf-seq-label-text" title=${x}>${K(x)}</span>
        ${L&&r`<span class="sf-seq-sublabel">${L}</span>`}
      </div>
    </div>
    ${v&&r`<${Qf} event=${e}/>`}
  </div>`}function Xf({event:e}){let t="",s="var(--fg2)",n="";return e.type==="session_start"?(t="Session started",s="var(--green)",n="▶"):e.type==="session_end"?(t="Session ended",s="var(--fg3)",n="■"):e.type==="compaction"&&(t="Compaction"+(e.compaction_count?" #"+e.compaction_count:""),s="var(--orange)",n="⟳"),r`<div class="sf-seq-marker" style="border-left-color:${s}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${wc(e.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${s}">
      ${n} ${t}
      ${e.type==="compaction"&&e.duration_ms>0?" — "+ps(e.duration_ms):""}
      ${e.cwd?r` <span class="text-muted text-xs mono">${K(e.cwd)}</span>`:""}
    </div>
  </div>`}function ev({summary:e}){return!e||!e.event_count?null:r`<div class="sf-summary">
    ${e.total_turns>0&&r`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${e.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${e.total_api_calls||0}</div></div>
    ${e.total_tool_uses>0&&r`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${e.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${z(e.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${z(e.total_input_tokens)}/${z(e.total_output_tokens)}</div></div>
    ${e.compactions>0&&r`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${e.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${kc(e.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${e.event_count}</div></div>
  </div>`}function tv(e,t){const s=new Set,n=[],l=(o,a,i)=>{s.has(o)||(s.add(o),n.push({id:o,label:a||o,color:i||"var(--fg2)"}))};l("user","User","var(--green)"),l("tool",t||"AI Tool",Le[t]||"var(--accent)");for(const o of e){if((o.type==="api_call"||o.type==="api_response"||o.type==="error")&&l("api","API","var(--accent)"),o.type==="tool_use"){const a=o.to||"tool";l("skill:"+a,a,nr(a))}if(o.type==="subagent"){const a=o.to||"Subagent";l("subagent:"+a,a,nr(a))}o.type==="hook"&&l("hook","Hooks","var(--orange)")}return n}function sv(){const{globalRange:e,enabledTools:t}=qe(Ne),[s,n]=q([]),[l,o]=q(!0),[a,i]=q(null),[c,d]=q(null),[v,u]=q(null),[m,g]=q(!1),[x,L]=q(null);ae(()=>{o(!0);const C=e?Math.min(e.since,Date.now()/1e3-86400):Date.now()/1e3-86400,I=e==null?void 0:e.until;$l(null,{since:C,until:I}).then(b=>{b.sort((M,O)=>(O.started_at||0)-(M.started_at||0)),n(b),o(!1)}).catch(()=>o(!1))},[e]);const T=C=>t===null||t.includes(C),y=s.filter(C=>T(C.tool)),$=[...new Set(y.map(C=>C.tool))].sort();ae(()=>{(!a&&$.length>0||a&&!$.includes(a)&&$.length>0)&&i($[0])},[$.join(",")]);const k=y.filter(C=>C.tool===a);ae(()=>{k.length>0&&(!c||!k.find(C=>C.session_id===c))&&d(k[0].session_id)},[a,k.length]),ae(()=>{if(!c){u(null);return}g(!0);const C=s.find(M=>M.session_id===c),I=C!=null&&C.started_at?C.started_at-60:Date.now()/1e3-86400,b=C!=null&&C.ended_at?C.ended_at+60:Date.now()/1e3+60;Vo(c,I,b).then(M=>{u(M),g(!1)}).catch(()=>{u(null),g(!1)})},[c]);const{processedTurns:S,participants:B}=re(()=>{const C=(v==null?void 0:v.turns)||[];if(!C.length)return{processedTurns:[],participants:[]};const I=C.map(P=>{const R={...P};return P.type==="user_message"?(R._from="user",R._to="tool"):P.type==="api_call"?(R._from=P.from||"tool",R._to="api"):P.type==="api_response"||P.type==="error"?(R._from="api",R._to="tool"):P.type==="tool_use"?(R._from="tool",R._to="skill:"+(P.to||"tool")):P.type==="subagent"?(R._from="tool",R._to="subagent:"+(P.to||"agent")):P.type==="hook"&&(R._from="tool",R._to="hook"),R});let b=0,M=0;for(const P of I){const R=P.tokens||{},N=(R.input||0)+(R.output||0);P.type==="user_message"&&(M=0),P.type==="api_call"&&(b+=N,M+=N),P._cumTok=b,P._rtTok=M}const O=tv(I,a);return{processedTurns:I,participants:O}},[v,a]),A=(v==null?void 0:v.summary)||{};return r`<div class="sf-container">
    <${Vf} tools=${$} activeTool=${a} onSelect=${i}/>

    <${Jf} sessions=${k} activeId=${c}
      onSelect=${d} loading=${l}/>

    <${ev} summary=${A}/>

    <div class="sf-seq-container">
      ${m?r`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`:S.length===0?r`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No flow data for this session.</p>
              <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
                Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
              </p>
            </div>`:r`
            <div class="sf-seq-header">
              <div class="sf-seq-tokens">
                <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
              </div>
              <div class="sf-seq-time"></div>
              <div class="sf-seq-arrow-area">
                ${B.map((C,I)=>{const b=100/B.length;return r`<div key=${C.id} class="sf-seq-participant"
                    style="left:${(I+.5)*b}%;color:${C.color}">
                    <div class="sf-seq-participant-box" style="border-color:${C.color}">${K(C.label)}</div>
                  </div>`})}
              </div>
            </div>
            <div class="sf-seq-body">
              ${S.map((C,I)=>C._from&&C._to?r`<${Zf} key=${I} event=${C} participants=${B}
                    hoveredIdx=${x} idx=${I} onHover=${L}/>`:r`<${Xf} key=${I} event=${C} participants=${B}/>`)}
            </div>
          `}
    </div>
  </div>`}function El(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Sc(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function Tc(e){return e?e.replace("claude-","").replace("gpt-","").replace(/-\d{8}$/,""):""}function Io(e,t){return e?e.length>t?e.slice(0,t)+"…":e:""}const nv={tool_use:"🔧",api_call:"🌐",api_response:"📨",file_edit:"📝",compaction:"🗜️",subagent:"🤖",error:"❌"},lv={tool_use:"var(--accent)",api_call:"var(--green)",api_response:"var(--fg2)",file_edit:"var(--orange)",compaction:"var(--yellow)",subagent:"var(--accent)",error:"var(--red)"};function ov({tools:e,activeTool:t,onSelect:s}){return e.length?r`<div class="sf-tool-tabs" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);flex-wrap:wrap">
    ${e.map(n=>r`<button key=${n}
      class="chip ${n===t?"chip-active":""}"
      onClick=${()=>s(n)}
      style="font-size:var(--fs-sm);padding:var(--sp-2) var(--sp-4)">
      ${K(n)}
    </button>`)}
  </div>`:null}function av({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions…</div>`:e.length?r`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${e.slice(0,20).map(l=>{const o=l.session_id===t,a=l.ended_at?Math.round(l.ended_at-l.started_at):0,i=a>0?El(a*1e3):"⏳ live",c=Sc(l.started_at);return r`<button key=${l.session_id}
        class="tr-sess-btn ${o?"tr-sess-active":""}"
        onClick=${()=>s(l.session_id)}
        title=${l.session_id}>
        <span class="tr-sess-time">${c}</span>
        <span class="tr-sess-dur">${i}</span>
        ${l.is_live?r`<span class="tr-sess-live">●</span>`:null}
      </button>`})}
  </div>`:r`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`}function iv({turn:e,index:t,expanded:s,onToggle:n}){const l=e.prompt&&e.prompt.length>0,o=e.actions||[],a=o.filter(m=>m.kind==="tool_use"),i=o.filter(m=>m.kind==="api_call"),c=o.filter(m=>m.kind==="error"),d=e.tokens||{},v=(d.input||0)+(d.output||0),u=e.wall_ms||e.duration_ms||0;return r`<div class="tr-turn ${s?"tr-turn-expanded":""}">
    <!-- Turn header (always visible) -->
    <div class="tr-turn-header" onClick=${n}>
      <div class="tr-turn-num">${t+1}</div>
      <div class="tr-turn-meta">
        <span class="tr-turn-time">${Sc(e.ts)}</span>
        ${e.model?r`<span class="tr-turn-model">${Tc(e.model)}</span>`:null}
        ${u>0?r`<span class="tr-turn-dur">${El(u)}</span>`:null}
      </div>
      <div class="tr-turn-stats">
        ${v>0?r`<span class="tr-stat" title="Tokens">🪙 ${z(v)}</span>`:null}
        ${a.length>0?r`<span class="tr-stat" title="Tool uses">🔧 ${a.length}</span>`:null}
        ${i.length>0?r`<span class="tr-stat" title="API calls">🌐 ${i.length}</span>`:null}
        ${c.length>0?r`<span class="tr-stat tr-stat-err" title="Errors">❌ ${c.length}</span>`:null}
      </div>
      <div class="tr-turn-chevron">${s?"▾":"▸"}</div>
    </div>

    <!-- Prompt (always visible as preview, full when expanded) -->
    ${l?r`<div class="tr-prompt ${s?"tr-prompt-full":""}">
      <div class="tr-prompt-icon">👤</div>
      <div class="tr-prompt-text">${s?e.prompt:Io(e.prompt_preview||e.prompt,120)}</div>
    </div>`:r`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon">👤</div>
      <div class="tr-prompt-text text-muted">(no prompt captured)</div>
    </div>`}

    <!-- Expanded: action timeline + token breakdown -->
    ${s&&o.length>0?r`<div class="tr-actions">
      ${o.map((m,g)=>r`<${rv} key=${g} action=${m} turnTs=${e.ts}/>`)}
    </div>`:null}

    <!-- Expanded: token breakdown -->
    ${s&&v>0?r`<div class="tr-token-bar">
      <div class="tr-token-seg tr-tok-in"
        style="flex:${d.input||0}" title="Input: ${z(d.input||0)}">
        ${d.input>0?"in "+z(d.input):""}
      </div>
      ${d.cache_read>0?r`<div class="tr-token-seg tr-tok-cache"
        style="flex:${d.cache_read}" title="Cache read: ${z(d.cache_read)}">
        cache ${z(d.cache_read)}
      </div>`:null}
      <div class="tr-token-seg tr-tok-out"
        style="flex:${d.output||0}" title="Output: ${z(d.output||0)}">
        ${d.output>0?"out "+z(d.output):""}
      </div>
    </div>`:null}
  </div>`}function rv({action:e,turnTs:t}){const s=nv[e.kind]||"•",n=lv[e.kind]||"var(--fg2)",l=e.ts-t,o=l>0?"+"+(l<1?l.toFixed(1):Math.round(l))+"s":"",a=e.duration_ms>0?El(e.duration_ms):"",i=e.tokens,c=i?z((i.input||0)+(i.output||0)):"";return r`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${n}">${s}</span>
    <span class="tr-action-name" style="color:${n}">${K(e.name||e.kind)}</span>
    ${e.input_summary?r`<span class="tr-action-args">${K(Io(e.input_summary,80))}</span>`:null}
    ${e.output_summary?r`<span class="tr-action-result">${K(Io(e.output_summary,60))}</span>`:null}
    <span class="tr-action-meta">
      ${o?r`<span class="tr-action-offset">${o}</span>`:null}
      ${a?r`<span class="tr-action-dur">${a}</span>`:null}
      ${c?r`<span class="tr-action-tok">🪙 ${c}</span>`:null}
      ${e.success===!1?r`<span class="tr-action-fail">✗</span>`:null}
      ${e.success===!0?r`<span class="tr-action-ok">✓</span>`:null}
    </span>
  </div>`}function cv({summary:e,transcript:t}){return e?r`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns">💬 ${e.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls">🌐 ${e.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses">🔧 ${e.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens">🪙 ${z(e.total_tokens||0)}</span>
    ${e.compactions>0?r`<span class="tr-summary-item" title="Compactions">🗜️ ${e.compactions}</span>`:null}
    ${e.errors>0?r`<span class="tr-summary-item tr-stat-err" title="Errors">❌ ${e.errors}</span>`:null}
    ${e.subagents>0?r`<span class="tr-summary-item" title="Subagents">🤖 ${e.subagents}</span>`:null}
    ${e.duration_s>0?r`<span class="tr-summary-item" title="Duration">⏱️ ${El(e.duration_s*1e3)}</span>`:null}
    ${t!=null&&t.model?r`<span class="tr-summary-item" title="Model">🧠 ${Tc(t.model)}</span>`:null}
    ${t!=null&&t.is_live?r`<span class="tr-summary-live">● LIVE</span>`:null}
    <span class="tr-summary-source">${e.source||""}</span>
  </div>`:null}function dv(){const{snap:e,globalRange:t,enabledTools:s}=qe(Ne),[n,l]=q([]),[o,a]=q(!0),[i,c]=q(null),[d,v]=q(null),[u,m]=q(null),[g,x]=q(!1),[L,T]=q(new Set),[y,$]=q(!1),[k,S]=q(!0);ae(()=>{a(!0);const N=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,Y=t==null?void 0:t.until;$l(null,{since:N,until:Y}).then(te=>{te.sort((D,H)=>(H.started_at||0)-(D.started_at||0)),l(te),a(!1)}).catch(()=>a(!1))},[t]);const B=N=>s===null||s.includes(N),A=n.filter(N=>B(N.tool)),C=[...new Set(A.map(N=>N.tool))].sort();ae(()=>{(!i&&C.length>0||i&&!C.includes(i)&&C.length>0)&&c(C[0])},[C.join(",")]);const I=A.filter(N=>N.tool===i);ae(()=>{I.length>0&&(!d||!I.find(N=>N.session_id===d))&&v(I[0].session_id)},[i,I.length]);const b=ye(()=>{if(!d){m(null);return}x(!0),bd(d).then(N=>{uv(N)?m(lr(N,d)):m(N),x(!1)}).catch(()=>{const N=n.find(D=>D.session_id===d),Y=N!=null&&N.started_at?N.started_at-60:Date.now()/1e3-86400,te=N!=null&&N.ended_at?N.ended_at+60:Date.now()/1e3+60;Vo(d,Y,te).then(D=>{m(lr(D,d)),x(!1)}).catch(()=>{m(null),x(!1)})})},[d,n]);ae(b,[b]),ae(()=>{if(!k||!(u!=null&&u.is_live))return;const N=setInterval(b,5e3);return()=>clearInterval(N)},[k,u==null?void 0:u.is_live,b]);const M=ye(N=>{T(Y=>{const te=new Set(Y);return te.has(N)?te.delete(N):te.add(N),te})},[]),O=ye(()=>{const N=(u==null?void 0:u.turns)||[];y?(T(new Set),$(!1)):(T(new Set(N.map((Y,te)=>te))),$(!0))},[y,u]),P=((u==null?void 0:u.turns)||[]).filter(N=>N.prompt&&N.prompt.length>0||N.actions&&N.actions.length>0||N.tool_use_count>0),R=(u==null?void 0:u.summary)||null;return r`<div class="tr-container">
    <!-- Header -->
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${P.length>0?r`<button class="chip" onClick=${O}
          style="font-size:var(--fs-xs)">
          ${y?"⊟ Collapse all":"⊞ Expand all"}
        </button>`:null}
        ${u!=null&&u.is_live?r`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${k}
            onChange=${N=>S(N.target.checked)}/>
          Auto-refresh
        </label>`:null}
      </div>
    </div>

    <!-- Tool tabs -->
    <${ov} tools=${C} activeTool=${i} onSelect=${c}/>

    <!-- Session selector -->
    <${av} sessions=${I} activeId=${d}
      onSelect=${v} loading=${o}/>

    <!-- Summary bar -->
    <${cv} summary=${R} transcript=${u}/>

    <!-- Turns list -->
    <div class="tr-turns">
      ${g?r`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript…</div>`:P.length===0?r`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                Prompts require hooks enabled: set <code>AICTL_URL</code> in your tool config
              </p>
            </div>`:P.map((N,Y)=>r`<${iv}
              key=${Y} turn=${N} index=${Y}
              expanded=${L.has(Y)}
              onToggle=${()=>M(Y)}/>`)}
    </div>
  </div>`}function uv(e){if(!e||!e.turns||e.turns.length===0)return!1;const t=e.turns[0];return t.type!=null&&t.actions==null}function lr(e,t){if(!e||!e.turns)return null;const s=e.turns||[],n=[];let l=null;const o={api_call:"api_call",api_response:"api_response",tool_use:"tool_use",subagent:"subagent",error:"error",hook:"tool_use"};for(const a of s)if(a.type==="user_message"){if(l&&n.push(l),l={ts:a.ts,end_ts:a.end_ts||a.ts,prompt:a.message||"",prompt_preview:a.preview||(a.message||"").slice(0,200),model:a.model||"",tokens:a.tokens||{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:a.api_calls||0,duration_ms:a.duration_ms||0,wall_ms:a.wall_ms||0,actions:[],tool_use_count:0},a.tools&&a.tools.length>0){for(const i of a.tools)l.actions.push({ts:i.ts||a.ts,kind:i.is_agent?"subagent":"tool_use",name:i.name||"",input_summary:i.args_summary||"",duration_ms:i.duration_ms||0});l.tool_use_count=a.tools.length}}else{if(a.type==="session_start"||a.type==="session_end")continue;if(a.type==="compaction")continue;if(l){const i=o[a.type];i&&(l.actions.push({ts:a.ts,kind:i,name:a.model||a.to||a.tool_name||a.hook_name||"",input_summary:a.params||a.decision||"",output_summary:a.response_preview||a.error_message||"",duration_ms:a.duration_ms||0,tokens:a.tokens,success:a.success==="true"?!0:a.success==="false"?!1:void 0}),i==="tool_use"&&l.tool_use_count++,i==="api_call"&&a.tokens&&(l.tokens.input+=a.tokens.input||0,l.tokens.output+=a.tokens.output||0,l.tokens.cache_read+=a.tokens.cache_read||0,l.api_calls++))}else{const i=o[a.type];i&&i!=="api_response"&&(l={ts:a.ts,end_ts:a.ts,prompt:"",prompt_preview:"",model:a.model||"",tokens:{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:0,duration_ms:0,wall_ms:0,actions:[],tool_use_count:0},l.actions.push({ts:a.ts,kind:i,name:a.model||a.to||a.tool_name||"",input_summary:a.params||a.decision||"",output_summary:a.response_preview||a.error_message||"",duration_ms:a.duration_ms||0,tokens:a.tokens,success:a.success==="true"?!0:a.success==="false"?!1:void 0}),i==="tool_use"&&l.tool_use_count++,i==="api_call"&&a.tokens&&(l.tokens.input+=a.tokens.input||0,l.tokens.output+=a.tokens.output||0,l.tokens.cache_read+=a.tokens.cache_read||0,l.api_calls++))}}l&&n.push(l);for(const a of n)if(a.tokens.total=(a.tokens.input||0)+(a.tokens.output||0),a.actions.length>0){const i=a.actions[a.actions.length-1];a.end_ts=Math.max(a.end_ts||0,i.ts+(i.duration_ms||0)/1e3)}return{session_id:t,turns:n,summary:e.summary||{},is_live:!1}}const or=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],ar={Bash:"#6b7280",Read:"#60a5fa",Edit:"#34d399",Write:"#22d3ee",Grep:"#fbbf24",Glob:"#a78bfa",Agent:"#f472b6",Prompt:"var(--green)",Compaction:"var(--yellow)",Error:"var(--red)"};function pl(e){if(!e)return"var(--fg2)";if(ar[e])return ar[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return or[t%or.length]}function Cc(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}function Fo(e){return e?new Date(e*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function pv(e){return e?e<1e3?e+"ms":(e/1e3).toFixed(1)+"s":""}function Mc(e){if(!e||e<=0)return"0s";if(e<60)return Math.round(e)+"s";const t=Math.floor(e/60),s=Math.round(e%60);if(e<3600)return t+"m"+(s?" "+s+"s":"");const n=Math.floor(t/60),l=t%60;return n+"h"+(l?" "+l+"m":"")}function ir(e){return e<60?Math.round(e)+"s":e<3600?Math.round(e/60)+"m":e<86400?(e/3600).toFixed(1)+"h":(e/86400).toFixed(1)+"d"}function fv(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function ca(e){const t=e.tokens||{};return(t.input||0)+(t.output||0)}function da(e){const t=e.tokens||{};return(t.cache_read||0)+(t.cache_creation||0)}function vv(e){return ca(e)+da(e)}function rr(e,t){return t==="fresh"?ca(e):t==="cached"?da(e):vv(e)}function fl(e){return e.type==="user_message"?"Prompt":e.type==="api_call"||e.type==="api_response"?e.model||"API":e.type==="tool_use"?e.to||e.name||"Tool":e.type==="subagent"?e.to||"Agent":e.type==="compaction"?"Compaction":e.type==="error"?"Error":e.type==="hook"?e.hook_name||"Hook":e.type||"?"}function mv({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:r`<div class="sf-tool-tabs">
    ${e.map(n=>r`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?Le[n]||"var(--accent)":"transparent"};color:${Le[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${vt[n]||"🔹"}</span> ${K(n)}
    </button>`)}
  </div>`}function hv({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?r`<div class="sf-sess-tabs">
    ${e.map(l=>{const o=(l.exact_input_tokens||l.input_tokens||0)+(l.exact_output_tokens||l.output_tokens||0),a=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),i=l.session_id===t;return r`<button key=${l.session_id} title=${l.session_id}
        class="sf-sess-tab ${i?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${Cc(l.started_at)}</span>
        <span class="sf-stab-sid">${fv(l.session_id)}</span>
        <span class="sf-stab-dur">${Mc(a)}</span>
        ${o>0&&r`<span class="sf-stab-tok">${z(o)}t</span>`}
        ${(l.files_modified||0)>0&&r`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${!l.ended_at&&r`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:r`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function gv({bar:e,x:t,y:s}){if(!e)return null;const n=e,l=n.tokens||{},o=fl(n);return r`<div class="tc-tooltip" style="left:${t}px;top:${s}px">
    <div style="font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
      <span class="tc-legend-swatch" style="background:${pl(o)}"></span>
      ${K(o)}
    </div>
    <div class="tc-tip-row"><span class="tc-tip-label">Time</span><span>${Fo(n.ts)}</span></div>
    ${n.type==="user_message"&&n.message&&r`
      <div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Message</span>
        <span style="white-space:pre-wrap;max-height:120px;overflow:auto;font-size:var(--fs-xs)">${K((n.message||"").slice(0,300))}</span>
      </div>`}
    ${(n.type==="api_call"||n.type==="api_response")&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Model</span><span>${n.model||"?"}</span></div>`}
    ${n.type==="tool_use"&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Tool</span><span>${n.to||n.name||"?"}</span></div>
      ${n.params&&r`<div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Args</span>
        <span class="mono" style="font-size:var(--fs-xs);max-height:80px;overflow:auto">${K(String(n.params).slice(0,200))}</span>
      </div>`}`}
    ${n.type==="subagent"&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${n.to||"?"}</span></div>`}
    ${n.duration_ms>0&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Duration</span><span>${pv(n.duration_ms)}</span></div>`}
    ${l.input||l.output||l.cache_read?r`
      <div class="tc-tip-row"><span class="tc-tip-label">Tokens</span>
        <span>in:${z(l.input||0)} out:${z(l.output||0)}${l.cache_read?" cache:"+z(l.cache_read):""}${l.cache_creation?" cache_w:"+z(l.cache_creation):""}</span>
      </div>`:null}
    ${n.type==="error"&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Error</span><span style="color:var(--red)">${n.error_type||""}: ${(n.error_message||"").slice(0,100)}</span></div>`}
    ${n.type==="compaction"&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Count</span><span>#${n.compaction_count||""}</span></div>`}
    ${n.agent_name&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${n.agent_name}</span></div>`}
  </div>`}function _v({summary:e}){if(!e||!e.total_tokens)return null;const t=[["Prompts",e.total_turns],["API Calls",e.total_api_calls],["Tools",e.total_tool_uses],["Tokens",z(e.total_tokens)],["Duration",Mc(e.duration_s)]].filter(([,s])=>s);return r`<div class="tc-summary">
    ${t.map(([s,n])=>r`<div class="tc-summary-item">
      <div class="tc-summary-val">${n}</div>
      <div class="tc-summary-label">${s}</div>
    </div>`)}
  </div>`}const nl=110,$v=16,cr=nl+$v,bv=30;function yv(e){const t=[];for(let s=0;s<e.length;s++){if(s>0){const n=e[s].ts-e[s-1].ts;n>bv&&t.push({type:"gap",endTs:e[s-1].ts,startTs:e[s].ts,gap:n})}t.push({type:"bar",bar:e[s]})}return t}function xv({entities:e,selected:t,onToggle:s,onAll:n,onNone:l}){return r`<div class="tc-filter">
    <span class="tc-filter-label">Entities</span>
    <button class="tc-filter-btn" onClick=${n}>All</button>
    <button class="tc-filter-btn" onClick=${l}>None</button>
    ${e.map(o=>{const a=t.has(o);return r`<label key=${o} class="tc-filter-check ${a?"active":""}"
        style="--swatch:${pl(o)}">
        <input type="checkbox" checked=${a}
          onChange=${()=>s(o)}/>
        <span class="tc-legend-swatch" style="background:${pl(o)}"></span>
        ${K(o)}
      </label>`})}
  </div>`}function kv({mode:e,onChange:t}){return r`<div class="tc-filter">
    <span class="tc-filter-label">Tokens</span>
    ${[["all","All Tokens"],["fresh","Non-Cached"],["cached","Cached Only"]].map(([n,l])=>r`<label key=${n}
      class="tc-filter-check ${e===n?"active":""}">
      <input type="radio" name="tc-tok-mode" checked=${e===n}
        onChange=${()=>t(n)}/>
      ${l}
    </label>`)}
  </div>`}function wv({bars:e,tokenMode:t,onHover:s,onLeave:n}){if(!e.length)return r`<div class="empty-state" style="padding:var(--sp-8)">
    <p>No matching events.</p>
  </div>`;const l=yv(e),o=Math.max(1,...e.map(d=>rr(d,t))),a=[];l.forEach((d,v)=>{d.type==="bar"&&a.push(v)});const i=Math.max(1,Math.floor(a.length/Math.ceil(a.length/20))),c=new Set;return a.forEach((d,v)=>{(v===0||v===a.length-1||v%i===0)&&c.add(d)}),r`<div class="tc-flow">
    ${l.map((d,v)=>{if(d.type==="gap"){const I=Fo(d.endTs)+" → "+Fo(d.startTs)+"  ("+ir(d.gap)+" gap)";return r`<div key=${"g"+v} class="tc-flow-slot" style="height:${cr}px" title=${I}>
          <div class="tc-flow-gap-line" style="height:${nl}px"></div>
          <div class="tc-flow-time">${ir(d.gap)}</div>
        </div>`}const u=d.bar,m=rr(u,t),g=o>0?Math.max(.08,Math.log1p(m)/Math.log1p(o)):.08,x=Math.max(6,g*nl),L=fl(u),T=pl(L),y=ca(u),$=da(u),k=y+$;let S,B;t==="cached"?(S=0,B=100):t==="fresh"?(S=100,B=0):k>0?(S=Math.round(y/k*100),B=100-S):(S=100,B=0);const A=B>0,C=c.has(v);return r`<div key=${v} class="tc-flow-slot" style="height:${cr}px"
        onMouseEnter=${I=>s(u,I)}
        onMouseLeave=${n}>
        <div class="tc-flow-bar-area" style="height:${nl}px">
          <div class="tc-flow-fill ${A?"tc-split":""}"
            style="height:${x}px;--bar-color:${T}">
            ${A&&r`
              ${S>0&&r`<div class="tc-fill-fresh" style="height:${S}%"></div>`}
              <div class="tc-fill-cached" style="height:${S>0?B:100}%"></div>`}
          </div>
        </div>
        <div class="tc-flow-time">${C?Cc(u.ts):""}</div>
      </div>`})}
  </div>`}function Sv(){const{snap:e,globalRange:t,enabledTools:s}=qe(Ne),[n,l]=q([]),[o,a]=q(!0),[i,c]=q(null),[d,v]=q(null),[u,m]=q(null),[g,x]=q(!1),[L,T]=q(null),[y,$]=q(null),[k,S]=q("all"),B=lt(null);ae(()=>{a(!0);const j=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,ne=t==null?void 0:t.until;$l(null,{since:j,until:ne}).then(ee=>{ee.sort((V,be)=>(be.started_at||0)-(V.started_at||0)),l(ee),a(!1)}).catch(()=>a(!1))},[t]);const A=j=>s===null||s.includes(j),C=n.filter(j=>A(j.tool)),I=[...new Set(C.map(j=>j.tool))].sort();ae(()=>{(!i&&I.length>0||i&&!I.includes(i)&&I.length>0)&&c(I[0])},[I.join(",")]);const b=C.filter(j=>j.tool===i);ae(()=>{b.length>0&&(!d||!b.find(j=>j.session_id===d))&&v(b[0].session_id)},[i,b.length]),ae(()=>{if(!d){m(null);return}x(!0);const j=n.find(V=>V.session_id===d),ne=j!=null&&j.started_at?j.started_at-60:Date.now()/1e3-86400,ee=j!=null&&j.ended_at?j.ended_at+60:Date.now()/1e3+60;Vo(d,ne,ee).then(V=>{m(V),x(!1),$(null)}).catch(()=>{m(null),x(!1)})},[d]);const{allBars:M,allEntities:O}=re(()=>{const ne=((u==null?void 0:u.turns)||[]).filter(V=>["user_message","api_call","api_response","tool_use","compaction","subagent","error","hook"].includes(V.type)),ee=new Set;for(const V of ne)ee.add(fl(V));return{allBars:ne,allEntities:[...ee].sort()}},[u]),P=y||new Set(O),R=re(()=>M.filter(j=>P.has(fl(j))),[M,P]),N=ye(j=>{$(ne=>{const ee=new Set(ne||O);return ee.has(j)?ee.delete(j):ee.add(j),ee})},[O]),Y=ye(()=>$(null),[]),te=ye(()=>$(new Set),[]),D=ye((j,ne)=>{var Pe;const ee=(Pe=B.current)==null?void 0:Pe.getBoundingClientRect();if(!ee)return;const V=Math.min(ne.clientX-ee.left+12,ee.width-320),be=ne.clientY-ee.top+12;T({bar:j,x:V,y:be})},[]),H=ye(()=>T(null),[]),G=(u==null?void 0:u.summary)||{};return r`<div class="tc-container" ref=${B}>
    <${mv} tools=${I} activeTool=${i} onSelect=${c}/>
    <${hv} sessions=${b} activeId=${d}
      onSelect=${v} loading=${o}/>
    <${_v} summary=${G}/>

    ${g?r`<div class="loading-state" style="padding:var(--sp-8)">Loading timeline...</div>`:M.length===0?r`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
          </div>`:r`
          <div class="tc-controls">
            <${xv} entities=${O} selected=${P}
              onToggle=${N} onAll=${Y} onNone=${te}/>
            <${kv} mode=${k} onChange=${S}/>
          </div>
          <${wv} bars=${R} tokenMode=${k}
            onHover=${D} onLeave=${H}/>
          ${L&&r`<${gv} bar=${L.bar} x=${L.x} y=${L.y}/>`}
        `}
  </div>`}const Tv={enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).",enabled:"Whether agent/agentic mode is active.",autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode allows the agent to execute tool calls without confirmation prompts. Use with caution.",autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.",skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",vimMode:"Enables Vim-style keybindings in the Gemini CLI.",approvalMode:"Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).",notifications:"Enables OS notifications for prompt alerts and session completion.",respectGeminiIgnore:"Controls whether the CLI respects patterns in .geminiignore files.",additionalIgnores:"Number of extra patterns added to the global file ignore list.",lineNumbers:"Shows line numbers in code blocks within the chat interface.",alternateScreen:"Uses the terminal alternate buffer to preserve shell scrollback history.",hideContext:"Hides the summary of attached files/context above the input prompt.",effort:"Reasoning effort level for the model (e.g., standard, high).",temperature:"Sampling temperature for model requests. 0 = deterministic; higher = more creative.",budget:"Maximum token budget for reasoning/extended thinking.",coreTools:"Number of built-in tools explicitly enabled for the agent.",excludeTools:"Number of tools explicitly disabled for safety or cost control.",customAgents:"Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks.",webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."};function Cv(e){return Tv[e]||""}function Mv({v:e}){return e===!0?r`<span style="color:var(--green);font-weight:600">on</span>`:e===!1?r`<span style="color:var(--red);opacity:0.8">off</span>`:e==null||e===""?r`<span class="text-muted">—</span>`:typeof e=="object"?r`<span class="mono" style="font-size:var(--fs-xs)">${JSON.stringify(e)}</span>`:r`<span class="mono">${String(e)}</span>`}function sn({k:e,v:t,indent:s}){const n=e.replace(/([A-Z])/g," $1").replace(/^./,o=>o.toUpperCase()),l=Cv(e);return r`<div
    title=${l}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${s?"var(--sp-6)":"var(--sp-4)"};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${l?"help":"default"}">
    <span style="color:var(--fg2)">${n}${l?r`<span style="color:var(--fg3);margin-left:3px;font-size:0.6em">?</span>`:""}</span>
    <${Mv} v=${t}/>
  </div>`}function Ec({otel:e}){if(!e||!e.enabled&&!e.source)return null;const t=e.enabled;return r`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:${t?"var(--green)":"var(--fg3)"};padding:var(--sp-2) var(--sp-4) var(--sp-1)">
      OpenTelemetry ${t?"● on":"○ off"}
    </div>
    <div style="border:1px solid ${t?"var(--green)":"var(--bg2)"};border-radius:4px;overflow:hidden;
                background:${t?"color-mix(in srgb,var(--green) 4%,transparent)":"transparent"}">
      ${t&&r`<${sn} k="exporter" v=${e.exporter||"—"}/>`}
      ${e.endpoint&&r`<${sn} k="endpoint" v=${e.endpoint}/>`}
      ${e.file_path&&r`<${sn} k="file_path" v=${e.file_path}/>`}
      ${e.capture_content!==void 0&&r`<${sn} k="capture_content" v=${!!e.capture_content}/>`}
      ${!t&&e.source&&r`<${sn} k="source" v=${e.source}/>`}
    </div>
  </div>`}function No({name:e,items:t}){const s=Object.entries(t);return s.length?r`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${e}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${s.map(([n,l])=>r`<${sn} key=${n} k=${n} v=${l}/>`)}
    </div>
  </div>`:null}function Ev({cfg:e,label:t}){var i,c;const s=vt[e.tool]||"🔹",n=Le[e.tool]||"var(--fg2)",l=Object.entries(e.feature_groups||{}),o=Object.entries(e.settings||{}).filter(([d])=>!["agent_historySummarizationMode","agent_maxRequests","debug_requestLoggerMaxEntries","planModel","implementModel"].includes(d));return((i=e.otel)==null?void 0:i.enabled)||((c=e.otel)==null?void 0:c.source)||l.length||o.length||(e.hints||[]).length||(e.mcp_servers||[]).length||(e.extensions||[]).length?r`<div style="background:var(--bg);border:2px solid ${n};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${n} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${n}">
      <span>${s}</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${n}">${t||e.tool}</span>
      ${e.model&&r`<span class="badge mono">${e.model}</span>`}
      ${e.auto_update===!0&&r`<span class="badge">auto-update on</span>`}
      ${e.auto_update===!1&&r`<span class="badge" style="opacity:0.6">auto-update off</span>`}
      ${e.launch_at_startup===!0&&r`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${e.launch_at_startup===!1&&r`<span class="badge" style="opacity:0.6">no auto-start</span>`}
    </div>
    <div style="padding:var(--sp-4);flex:1">
      <${Ec} otel=${e.otel}/>
      ${l.map(([d,v])=>r`<${No} key=${d} name=${d} items=${v}/>`)}
      ${o.length>0&&r`<${No} name="Settings" items=${Object.fromEntries(o)}/>`}
      ${(e.mcp_servers||[]).length>0&&r`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">MCP Servers</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${e.mcp_servers.map(d=>r`<span key=${d} class="pill mono">${d}</span>`)}
        </div>
      </div>`}
      ${(e.extensions||[]).length>0&&r`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Extensions</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${e.extensions.map(d=>r`<span key=${d} class="pill mono" style="font-size:var(--fs-2xs)">${d}</span>`)}
        </div>
      </div>`}
      ${(e.hints||[]).length>0&&r`<div style="padding:var(--sp-3) var(--sp-4);border-left:3px solid var(--orange);
          background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
        ${e.hints.map((d,v)=>r`<div key=${v} class="text-orange" style="font-size:var(--fs-sm);padding:1px 0">
          <span style="margin-right:var(--sp-2)">💡</span>${d}
        </div>`)}
      </div>`}
    </div>
  </div>`:null}function Lv({cfg:e}){var o,a,i,c;if(!e)return null;const t=Object.entries(e.feature_groups||{});if(!t.length&&!((o=e.otel)!=null&&o.enabled)&&!((a=e.otel)!=null&&a.source))return null;const n=(((i=e.feature_groups)==null?void 0:i.Safety)||{}).globalAutoApprove===!0,l=(((c=e.feature_groups)==null?void 0:c.Agent)||{}).autoReply===!0;return r`<div style="background:var(--bg);border:2px solid #007acc;border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,#007acc 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid #007acc">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:#007acc">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${n&&r`<span class="badge" style="margin-left:auto;background:var(--red);color:#fff;font-weight:700">⚠ YOLO MODE ON</span>`}
      ${!n&&l&&r`<span class="badge" style="margin-left:auto;background:var(--orange);color:#fff">⚠ auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${Ec} otel=${e.otel}/>
      ${t.map(([d,v])=>r`<${No} key=${d} name=${d} items=${v}/>`)}
    </div>
  </div>`}function Dv({snap:e}){var l,o,a;const t=Le.aictl||"#94a3b8",s=Object.entries(((l=e==null?void 0:e.live_monitor)==null?void 0:l.diagnostics)||{}),n=[...((o=e==null?void 0:e.live_monitor)==null?void 0:o.workspace_paths)||[],...((a=e==null?void 0:e.live_monitor)==null?void 0:a.state_paths)||[]];return!s.length&&!n.length?null:r`<div style="background:var(--bg);border:2px solid ${t};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${t} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${t}">
      <span>⚙️</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${t}">aictl</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">monitoring engine</span>
    </div>
    <div style="padding:var(--sp-4);flex:1">
      ${s.length>0&&r`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Collectors</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
          ${s.map(([i,c])=>{const d=c.status==="active";return r`<div key=${i} title=${c.detail||""} style="display:flex;align-items:baseline;gap:var(--sp-4);padding:3px var(--sp-4);
                font-size:var(--fs-sm);border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);cursor:help">
              <span class="mono" style="flex:1">${i}</span>
              <span style="color:var(--fg3)">${c.mode||""}</span>
              <span style="color:${d?"var(--green)":"var(--orange)"}">
                ${d?"●":"○"} ${c.status||"unknown"}
              </span>
            </div>`})}
        </div>
      </div>`}
      ${n.length>0&&r`<div>
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Monitored Roots</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4)">
          ${n.map((i,c)=>r`<div key=${c} class="mono text-muted" style="font-size:var(--fs-xs);padding:1px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${i}>${i}</div>`)}
        </div>
      </div>`}
    </div>
  </div>`}function Av(){const{snap:e}=qe(Ne),t=re(()=>e!=null&&e.tool_configs?e.tool_configs:[],[e]),s=re(()=>{const o={};return((e==null?void 0:e.tools)||[]).forEach(a=>{o[a.tool]=a.label}),o},[e]);if(!e)return r`<p class="loading-state">Loading...</p>`;if(!t.length)return r`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const n=t.find(o=>o.tool==="vscode"),l=t.filter(o=>o.tool!=="vscode");return r`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${n&&r`<${Lv} cfg=${n}/>`}
    ${l.map(o=>r`<${Ev} key=${o.tool} cfg=${o} label=${s[o.tool]||o.tool}/>`)}
    <${Dv} snap=${e}/>
  </div>`}const Jn={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},Ov=["project","global","shadow","session","external"],Qn=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function Pv(e,t){const s=Ms(e),n=Ms(t);if(!s)return"(unknown)";if(n&&s.startsWith(n+"/")){const l=s.slice(n.length+1).split("/")[0];return l.startsWith(".")?"(root)":l}return s.includes("/.claude/projects/")?"(shadow)":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")?"(global)":"(other)"}function zv(e){if(!e)return"unknown";const t=Ms(e).split("/"),s=t.pop()||"unknown",n=s.lastIndexOf("."),l=n>0?s.slice(0,n):s;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test(l)){const o=t.pop();if(o)return o}return l}function Rv(){const{snap:e}=qe(Ne),[t,s]=q(null),n=re(()=>{if(!e)return null;const o=e.tools.filter(T=>T.tool!=="aictl"&&T.tool!=="any");if(!o.length)return null;const a=e.root||"",i={},c={},d={},v={yes:0,"on-demand":0,conditional:0,no:0};let u=0;for(const T of o)for(const y of T.files){const $=y.kind||"other",k=y.scope||"external",S=(y.sent_to_llm||"no").toLowerCase(),B=y.tokens||0,A=Pv(y.path,a),C=zv(y.path);i[$]||(i[$]={tokens:0,files:0,projects:{}}),i[$].tokens+=B,i[$].files+=1,i[$].projects[A]||(i[$].projects[A]={tokens:0,count:0}),i[$].projects[A].tokens+=B,i[$].projects[A].count+=1,d[A]||(d[A]={tokens:0,count:0,cats:{}}),d[A].tokens+=B,d[A].count+=1,d[A].cats[$]||(d[A].cats[$]={tokens:0,count:0,items:{}}),d[A].cats[$].tokens+=B,d[A].cats[$].count+=1,d[A].cats[$].items[C]||(d[A].cats[$].items[C]=0),d[A].cats[$].items[C]+=B,c[k]||(c[k]={tokens:0,files:0}),c[k].tokens+=B,c[k].files+=1,v[S]!==void 0?v[S]+=B:v.no+=B,u+=B}const m=Object.entries(i).sort((T,y)=>y[1].tokens-T[1].tokens),g=Ov.filter(T=>c[T]).map(T=>[T,c[T]]),x=Object.entries(d).sort((T,y)=>y[1].tokens-T[1].tokens),L=o.map(T=>({tool:T.tool,label:T.label,tokens:T.files.reduce((y,$)=>y+$.tokens,0),files:T.files.length,sentYes:T.files.filter(y=>(y.sent_to_llm||"").toLowerCase()==="yes").reduce((y,$)=>y+$.tokens,0)})).filter(T=>T.tokens>0).sort((T,y)=>y.tokens-T.tokens).slice(0,8);return{cats:m,scopes:g,byPolicy:v,totalTokens:u,perTool:L,byCat:i,byProj:d,projList:x}},[e]);if(!n)return r`<p class="empty-state">No file data available.</p>`;if(!n.totalTokens)return r`<p class="empty-state">No token data collected yet.</p>`;const l=Math.max(...n.cats.map(([,o])=>o.tokens),1);return r`<div class="diag-card" role="region" aria-label="Context window map">
    <h3 style=${{marginBottom:"var(--sp-5)"}}>Context Window Map</h3>

    <!-- Policy summary -->
    <div class="flex-row flex-wrap gap-md mb-md">
      <span class="badge--accent badge" data-dp="overview.context_map.sent_to_llm" style="background:var(--green);color:var(--bg)">
        Sent to LLM: ${z(n.byPolicy.yes)} tok</span>
      <span class="badge" data-dp="overview.context_map.on_demand" style="background:var(--yellow);color:var(--bg)">
        On-demand: ${z(n.byPolicy["on-demand"])} tok</span>
      <span class="badge" data-dp="overview.context_map.conditional" style="background:var(--orange);color:var(--bg)">
        Conditional: ${z(n.byPolicy.conditional)} tok</span>
      <span class="badge--muted badge" data-dp="overview.context_map.not_sent">
        Not sent: ${z(n.byPolicy.no)} tok</span>
    </div>

    <!-- Top stacked bar: tokens by category -->
    <div class="mb-md">
      <div class="es-section-title">Tokens by Category (${z(n.totalTokens)} total)</div>
      <div class="overflow-hidden" style="display:flex;height:24px;border-radius:4px;background:var(--bg)">
        ${n.cats.map(([o,a])=>{const i=a.tokens/n.totalTokens*100;return i<.5?null:r`<div key=${o} style="width:${i}%;background:${Jn[o]||"var(--fg2)"};
            position:relative;min-width:2px"
            title="${o}: ${z(a.tokens)} tokens (${a.files} files)">
            ${i>8?r`<span class="text-ellipsis text-bold" style="position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;font-size:var(--fs-2xs);color:var(--bg);padding:0 2px">${o}</span>`:null}
          </div>`})}
      </div>
    </div>

    <!-- Per-category bars with project sub-segments -->
    <div class="mb-md">
      ${n.cats.map(([o,a])=>{const i=Object.entries(a.projects).sort((d,v)=>v[1].tokens-d[1].tokens),c=a.tokens/l*100;return r`<div key=${o} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);font-size:var(--fs-base)">
          <span class="text-bold text-right" style="width:80px;color:${Jn[o]||"var(--fg2)"};flex-shrink:0">${o}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${c}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${i.map(([d,v],u)=>{const m=a.tokens>0?v.tokens/a.tokens*100:0;if(m<.5)return null;const g=!t||t===d;return r`<div key=${d} style="width:${m}%;height:100%;
                  background:${Jn[o]||"var(--fg2)"};
                  opacity:${g?Math.max(.3,1-u*.12):.12};
                  border-right:1px solid var(--bg);
                  display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px;
                  cursor:pointer;transition:opacity 0.15s"
                  title="${d}: ${z(v.tokens)} tok (${v.count} files)"
                  onClick=${()=>s(t===d?null:d)}>
                  ${m>12&&c>15?r`<span style="font-size:9px;color:var(--bg);
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:600">${d}</span>`:null}
                </div>`})}
            </div>
          </div>
          <span class="text-right text-muted" style="min-width:55px">${z(a.tokens)} tok</span>
          <span class="text-right text-muted" style="min-width:40px">${a.files} f</span>
        </div>`})}
    </div>

    <!-- Project sub-tabs -->
    <div class="flex-row flex-wrap gap-sm" style="border-bottom:1px solid var(--border);padding-bottom:var(--sp-2);margin-bottom:var(--sp-4)">
      ${n.projList.map(([o,a])=>{const i=t===o;return r`<button key=${o}
          style="cursor:pointer;padding:var(--sp-1) var(--sp-3);font-size:var(--fs-sm);
            background:${i?"var(--accent)":"transparent"};
            color:${i?"var(--bg)":"var(--fg2)"};
            border:1px solid ${i?"var(--accent)":"var(--border)"};
            border-radius:4px 4px 0 0;font-weight:${i?600:400};border-bottom:none"
          onClick=${()=>s(i?null:o)}>
          ${o} (${z(a.tokens)})
        </button>`})}
    </div>

    <!-- Tab content: per-category bars with item sub-segments -->
    ${t&&n.byProj[t]?(()=>{const o=n.byProj[t],a=Object.entries(o.cats).sort((c,d)=>d[1].tokens-c[1].tokens),i=Math.max(...a.map(([,c])=>c.tokens),1);return r`<div class="mb-md" style="background:var(--bg2);border-radius:6px;padding:var(--sp-4)">
        <div class="es-section-title">${t} \u2014 ${z(o.tokens)} tokens across ${o.count} files</div>
        ${a.map(([c,d])=>{const v=Object.entries(d.items).sort((x,L)=>L[1]-x[1]),u=v.slice(0,15),m=v.slice(15).reduce((x,[,L])=>x+L,0);m>0&&u.push(["(other)",m]);const g=d.tokens/i*100;return r`<div key=${c} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${Jn[c]||"var(--fg2)"};flex-shrink:0">${c}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${g}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${u.map(([x,L],T)=>{const y=d.tokens>0?L/d.tokens*100:0;if(y<.3)return null;const $=Qn[T%Qn.length];return r`<div key=${x} style="width:${y}%;height:100%;background:${$};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${x}: ${z(L)} tok">
                      ${y>10&&g>20?r`<span style="font-size:9px;color:#111;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:700">${x}</span>`:null}
                    </div>`})}
                </div>
              </div>
              <span class="text-right text-muted" style="min-width:55px">${z(d.tokens)} tok</span>
              <span class="text-right text-muted" style="min-width:30px">${d.count}f</span>
            </div>
            <!-- Item legend -->
            <div style="padding-left:88px;display:flex;flex-wrap:wrap;gap:var(--sp-1) var(--sp-3);margin-top:3px">
              ${u.map(([x,L],T)=>r`<span key=${x}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${Qn[T%Qn.length]};flex-shrink:0"></span>
                <span class="text-muted">${x} ${z(L)}</span>
              </span>`)}
            </div>
          </div>`})}
      </div>`})():null}

    <!-- Scope + Per-tool side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-8)">
      <div>
        <div class="es-section-title">By Scope</div>
        ${n.scopes.map(([o,a])=>r`<div key=${o} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span class="text-bold">${o}</span>
          <span class="text-muted">${a.files} files \u00B7 ${z(a.tokens)} tok</span>
        </div>`)}
      </div>
      <div>
        <div class="es-section-title">By Tool</div>
        ${n.perTool.map(o=>r`<div key=${o.tool} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span><span style="color:${Le[o.tool]||"var(--fg2)"}">${vt[o.tool]||"🔹"}</span> ${K(o.label)}</span>
          <span class="text-muted">${z(o.sentYes)} sent \u00B7 ${z(o.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}const Iv={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"};function Fv(e){if(!e||e<0)return"—";const t=Math.floor(e/3600),s=Math.floor(e%3600/60);return t>0?`${t}h ${s}m`:`${s}m`}function Nv(){var m,g,x,L,T;const{snap:e}=qe(Ne),[t,s]=q(null),[n,l]=q(null);ae(()=>{let y=!0;const $=()=>{Er().then(S=>{y&&s(S)}).catch(()=>{}),Ed().then(S=>{y&&l(S)}).catch(()=>{})};$();const k=setInterval($,15e3);return()=>{y=!1,clearInterval(k)}},[]);const o=re(()=>{if(!e)return[];const y=e.tool_telemetry||[];return e.tools.filter($=>$.tool!=="aictl"&&$.tool!=="any").map($=>{var I,b,M,O,P;const k=y.find(R=>R.tool===$.tool),S=$.live||{},B=S.last_seen_at||0,A=B>0?Math.floor(Date.now()/1e3-B):-1,C=A>3600||A<0;return{tool:$.tool,label:$.label,source:(k==null?void 0:k.source)||(S.session_count?"live-monitor":"discovery"),confidence:(k==null?void 0:k.confidence)||((I=S.token_estimate)==null?void 0:I.confidence)||0,inputTokens:(k==null?void 0:k.input_tokens)||0,outputTokens:(k==null?void 0:k.output_tokens)||0,cost:(k==null?void 0:k.cost_usd)||0,sessions:(k==null?void 0:k.total_sessions)||S.session_count||0,errors:((b=k==null?void 0:k.errors)==null?void 0:b.length)||0,lastError:((M=k==null?void 0:k.errors)==null?void 0:M[0])||null,lastSeen:A,stale:C,fileCount:$.files.length,procCount:$.processes.length,hasLive:!!$.live,hasOtel:!!((P=(O=S.sources||[]).includes)!=null&&P.call(O,"otel"))}}).sort(($,k)=>k.inputTokens+k.outputTokens-($.inputTokens+$.outputTokens))},[e]),a=re(()=>{var y;return(y=e==null?void 0:e.live_monitor)!=null&&y.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([$,k])=>({name:$,status:k.status||"unknown",mode:k.mode||"",detail:k.detail||""})):[]},[e]);if(!e)return null;const i=o.length,c=o.filter(y=>y.inputTokens+y.outputTokens>0).length,d=o.filter(y=>y.hasLive).length,v=o.filter(y=>y.stale&&y.hasLive).length,u=o.reduce((y,$)=>y+$.errors,0);return r`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--bg)">${c}/${i} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--bg)">${d} live</span>
      ${v>0?r`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--bg)">${v} stale</span>`:null}
      ${u>0?r`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--bg)">${u} errors</span>`:null}
      ${t!=null&&t.active?r`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--bg)">OTel active</span>`:r`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${n?r`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">aictl Monitor Service <span class="text-muted text-xs">(self)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">CPU</div>
          <div class="metric-chip-value">${_e(n.cpu_percent||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Memory (RSS)</div>
          <div class="metric-chip-value">${ge(n.memory_rss_bytes||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Size</div>
          <div class="metric-chip-value">${ge(((m=n.db)==null?void 0:m.file_size_bytes)||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Uptime</div>
          <div class="metric-chip-value">${Fv(n.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${n.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${z((((g=n.db)==null?void 0:g.metrics_count)||0)+(((x=n.db)==null?void 0:x.tool_metrics_count)||0)+(((L=n.db)==null?void 0:L.events_count)||0)+(((T=n.db)==null?void 0:T.samples_count)||0))}</div>
        </div>
      </div>
      ${n.sink?r`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Emitted</div>
          <div class="metric-chip-value">${z(n.sink.total_emitted||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Flushed</div>
          <div class="metric-chip-value">${z(n.sink.total_flushed||0)}</div>
        </div>
        <div class="metric-chip" style="${(n.sink.total_dropped||0)>0?"background:rgba(248,113,113,0.15);border:1px solid var(--red)":""}">
          <div class="metric-chip-label" style="${(n.sink.total_dropped||0)>0?"color:var(--red);font-weight:600":"color:var(--fg2)"}">Dropped</div>
          <div class="metric-chip-value" style="${(n.sink.total_dropped||0)>0?"color:var(--red)":""}">${z(n.sink.total_dropped||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Tracked</div>
          <div class="metric-chip-value">${z(n.sink.metrics_tracked||0)}</div>
        </div>
      </div>
      ${n.sink.is_flooding?r`<div style="margin-top:var(--sp-2);padding:var(--sp-2) var(--sp-3);background:rgba(248,113,113,0.15);border:1px solid var(--red);border-radius:4px;color:var(--red);font-size:var(--fs-xs);font-weight:600">
        DATA LOSS: Flood protection active \u2014 dropping samples (>${n.sink.total_dropped} lost)
      </div>`:null}`:null}
      <div class="text-xs text-muted" style="margin-top:var(--sp-1)">
        PID ${n.pid} \u00b7 These metrics are about the aictl monitoring service itself, not the AI tools it monitors.
      </div>
    </div>`:null}

    <!-- OTel receiver stats -->
    ${t?r`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">OTel Receiver</div>
      <div class="flex-row gap-md flex-wrap">
        <span>Metrics: <strong>${t.metrics_received||0}</strong></span>
        <span>Events: <strong>${t.events_received||0}</strong></span>
        <span>API calls: <strong>${t.api_calls_total||0}</strong></span>
        ${t.api_errors_total>0?r`<span class="text-red">Errors: <strong>${t.api_errors_total}</strong></span>`:null}
        ${t.errors>0?r`<span class="text-orange">Parse errors: <strong>${t.errors}</strong></span>`:null}
        ${t.last_receive_at>0?r`<span class="text-muted">Last: ${jt(t.last_receive_at)}</span>`:null}
      </div>
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
          <tbody>${o.map(y=>{var $;return r`<tr key=${y.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${y.stale&&!y.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <span style="color:${Le[y.tool]||"var(--fg2)"}">${vt[y.tool]||"🔹"}</span>
              ${K(y.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${y.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${y.confidence>=.9?"var(--green)":y.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${y.confidence>0?_e(y.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.inputTokens?z(y.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.outputTokens?z(y.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${y.errors>0?r`<span class="text-red" title=${(($=y.lastError)==null?void 0:$.message)||""}>${y.errors}</span>`:r`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${y.lastSeen>=0?r`<span style="color:${y.stale?"var(--orange)":"var(--fg2)"}">${jt(Date.now()/1e3-y.lastSeen)}</span>`:r`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Collector pipeline status -->
    ${a.length>0?r`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${a.map(y=>r`<div key=${y.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${Iv[y.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${y.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${y.status}</span>
          </div>
          ${y.detail?r`<div class="text-xs text-muted" style="margin-top:2px">${K(y.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let mo=null;function jv(){return mo?Promise.resolve(mo):Ld().then(e=>{const t={};for(const s of e||[])t[s.key]=s;return mo=t,t}).catch(()=>({}))}function Bv(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),s=t.match(/^[^.!?]+[.!?]/);return s?s[0].trim():t.slice(0,120)}const Hv={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},Wv={raw:"raw",deduced:"deduced",aggregated:"agg"};function qv(){const[e,t]=q(null),[s,n]=q({x:0,y:0}),[l,o]=q(!1),a=lt(null),i=lt(null),c=ye(T=>{const y=T.getAttribute("data-dp");y&&jv().then($=>{const k=$[y];if(!k)return;const S=T.getBoundingClientRect();n({x:S.left,y:S.bottom+4}),t(k),o(!1)})},[]),d=ye(()=>{i.current=setTimeout(()=>{t(null),o(!1)},120)},[]),v=ye(()=>{i.current&&(clearTimeout(i.current),i.current=null)},[]);if(ae(()=>{function T(k){const S=k.target.closest("[data-dp]");S&&(v(),c(S))}function y(k){k.target.closest("[data-dp]")&&d()}function $(k){k.target.closest("[data-dp]")&&e&&(k.preventDefault(),o(B=>!B))}return document.addEventListener("mouseover",T,!0),document.addEventListener("mouseout",y,!0),document.addEventListener("click",$,!0),()=>{document.removeEventListener("mouseover",T,!0),document.removeEventListener("mouseout",y,!0),document.removeEventListener("click",$,!0)}},[c,d,v,e]),!e)return null;const m=Math.min(s.x,window.innerWidth-320-8),g=Math.min(s.y,window.innerHeight-180),x=Wv[e.source_type]||e.source_type,L=Hv[e.unit]||e.unit;return r`<div class="dp-tooltip" ref=${a}
    style=${"left:"+m+"px;top:"+g+"px"}
    onMouseEnter=${v} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${x}</span>
      ${L&&r`<span class="dp-tooltip-unit">${L}</span>`}
    </div>
    <div class="dp-tooltip-body">${Bv(e.explanation)}</div>
    ${l&&r`<div class="dp-tooltip-detail">
      <div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Source</div>
        <div>${e.source_static||e.source||"—"}</div>
      </div>
      ${e.source_dynamic&&r`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Live provenance</div>
        <div>${typeof e.source_dynamic=="string"?e.source_dynamic:JSON.stringify(e.source_dynamic)}</div>
      </div>`}
      ${e.query&&r`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Query</div>
        <code class="dp-tooltip-code">${e.query}</code>
      </div>`}
      ${e.otel_metric&&r`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">OTel metric</div>
        <code>${e.otel_metric}</code>
      </div>`}
    </div>`}
    ${!l&&r`<div class="dp-tooltip-hint">click for details</div>`}
  </div>`}class dr extends En{constructor(t){super(t),this.state={hasError:!1,error:null}}static getDerivedStateFromError(t){return{hasError:!0,error:t}}componentDidCatch(t,s){console.error("Dashboard error:",t,s)}render(){var t;return this.state.hasError?r`<div class="text-red" style="padding:var(--sp-10)">
        <h3>Something went wrong</h3>
        <pre style="font-size:0.75rem;margin-top:var(--sp-5)">${((t=this.state.error)==null?void 0:t.message)||"Unknown error"}</pre>
        <button class="prev-btn" style="margin-top:var(--sp-5)" onClick=${()=>this.setState({hasError:!1,error:null})}>Try again</button>
      </div>`:this.props.children}}function Oe({tabName:e,children:t}){return r`<${dr} key=${e}>${t}</${dr}>`}function Xs(e,t){try{localStorage.setItem("aictl-pref-"+e,JSON.stringify(t))}catch{}}function ho(e,t){try{const s=localStorage.getItem("aictl-pref-"+e);return s!=null?JSON.parse(s):t}catch{return t}}function Zn(e){const t=new Date(e*1e3),s=t.getTimezoneOffset();return new Date(t.getTime()-s*6e4).toISOString().slice(0,16)}const jo=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],vl={};jo.forEach(e=>{vl[e.id]=e.seconds});const Uv={snap:null,history:null,connected:!1,activeTab:ho("active_tab","overview"),globalRange:(()=>{const e=ho("range","live"),t=vl[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:ho("tool_filter",null)};function Vv(e,t){switch(t.type){case"SSE_UPDATE":{const s=t.payload,n=e.snap?Gd(e.snap,s):s,l=Yd(e.history,s);return{...e,snap:n,history:l,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const go=en.tabs;function Gv({globalRange:e,onPreset:t,onApplyCustom:s}){const[n,l]=q(!1),o=lt(null),a=lt(null),i=ye(()=>{l(!0),requestAnimationFrame(()=>{if(o.current&&a.current)if(e.until!=null)o.current.value=Zn(e.since),a.current.value=Zn(e.until);else{const d=jo.find(m=>m.id===e.id),v=Date.now()/1e3,u=(d==null?void 0:d.seconds)||86400;o.current.value=Zn(v-u),a.current.value=Zn(v)}})},[e]),c=ye(()=>{var L,T;const d=(L=o.current)==null?void 0:L.value,v=(T=a.current)==null?void 0:T.value;if(!d||!v)return;const u=new Date(d).getTime(),m=new Date(v).getTime();if(!Number.isFinite(u)||!Number.isFinite(m))return;const g=u/1e3,x=m/1e3;x<=g||(s(g,x),l(!1))},[s]);return r`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${jo.map(d=>r`<button key=${d.id}
        class=${e.id===d.id&&!n?"range-btn active":"range-btn"}
        onClick=${()=>{t(d.id),l(!1)}}>${d.label}</button>`)}
      <button class=${n||e.id==="custom"?"range-btn active":"range-btn"}
        onClick=${i}>Custom</button>
    </div>
    ${n&&r`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${o} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${a} /></label>
      <button class="range-btn active" onClick=${c} style="font-weight:600">Apply</button>
    </div>`}
  </div>`}const ll=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]);function Yv({snap:e,enabledTools:t,onToggle:s,onSetAll:n}){if(!e)return null;const l=e.tools.filter(a=>!a.meta);if(!l.length)return null;const o=t===null;return t?t.length:l.length,r`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${o}
        onChange=${()=>n(o?[]:null)} />
      <span class="text-muted">All (${l.length})</span>
    </label>
    ${l.sort((a,i)=>a.label.localeCompare(i.label)).map(a=>{const i=ll.has(a.tool),c=t===null||t.includes(a.tool),d=Le[a.tool]||"var(--fg2)",v=vt[a.tool]||"🔹";return r`<label key=${a.tool} class=${"tool-filter-item"+(i?"":" tool-unverified")}
        title=${i?"":"Not yet verified — discovery only"}>
        <input type="checkbox" checked=${c} disabled=${!i}
          onChange=${()=>i&&s(a.tool)} />
        <span style=${"color:"+d}>${v}</span>
        <span>${a.label}</span>
      </label>`})}
  </div>`}function Kv({mcpDetail:e}){return!e||!e.length?r`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`:r`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{t.status;const s=Pd[t.status]||"var(--fg3)",n=Le[t.tool]||"var(--fg3)";return r`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${s}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${K(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${n};white-space:nowrap;flex-shrink:0">${K(t.tool)}</span>
      </div>`})}
  </div>`}function Jv({label:e,value:t,mcpDetail:s}){const[n,l]=q(!1);return r`<div style="position:relative;cursor:default"
    onMouseEnter=${()=>l(!0)}
    onMouseLeave=${()=>l(!1)}>
    <${Oo} label=${e} value=${t} sm=${!0}/>
    ${n&&r`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      ${s.length>0?r`<${Kv} mcpDetail=${s}/>`:r`<div style="color:var(--fg3);font-size:var(--fs-sm)">None configured</div>`}
    </div>`}
  </div>`}function Qv({snap:e,history:t,globalRange:s}){const[n,l]=q(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),o=ye(()=>{l(d=>{const v=!d;try{localStorage.setItem("aictl-header-expanded",String(v))}catch{}return v})},[]),a=d=>!t||!t.ts||t.ts.length<2?null:[t.ts,t[d]],i=(e==null?void 0:e.cpu_cores)||1,c={cores:i};return r`
    <div style=${"display:grid;grid-template-columns:repeat("+en.sparklines.length+",1fr);gap:var(--sp-4);margin-bottom:var(--sp-4)"}>
      ${en.sparklines.map(d=>{const v=e?e["total_"+d.field]??e[d.field]??"":"",u=no(v,d.format,d.suffix,d.multiply),m=d.yMaxExpr?si(d.yMaxExpr,c):void 0,g=(d.refLines||[]).map(x=>({value:si(x.valueExpr,c),label:(x.label||"").replace("{cores}",i)})).filter(x=>x.value!=null);return r`<${es} key=${d.field} label=${d.label} value=${u}
          data=${a(d.field)} chartColor=${d.color||"var(--accent)"}
          smooth=${!!d.smooth} refLines=${g.length?g:void 0} yMax=${m} dp=${d.dp}/>`})}
    </div>

    <div class=${n?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>

      <!-- Row 1: (CPU bars + Live traffic) | Live metric boxes -->
      <div class="mb-sm" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);align-items:start">
        <!-- Left: per-core CPU bars + live traffic bar -->
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${tf} perCore=${(e==null?void 0:e.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${Ui} snap=${e} mode="traffic"/></div>
        </div>
        <!-- Right: 4 live metric boxes in 2×2 grid -->
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${en.liveMetrics.map(d=>{const v=e?e[d.field]??"":"",u=no(v,d.format,d.suffix,d.multiply);return r`<${Oo} key=${d.field} label=${d.label} value=${u} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>

      <!-- Row 2: Inventory — full width; MCP box shows hover popover -->
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div style="display:grid;grid-template-columns:repeat(${en.inventory.length},1fr);gap:var(--sp-2)">
          ${en.inventory.map(d=>{const v=e?e[d.field]??"":"",u=no(v,d.format,d.suffix,d.multiply);return d.field==="total_mcp_servers"?r`<${Jv} key=${d.field} label=${d.label} value=${u} mcpDetail=${(e==null?void 0:e.mcp_detail)||[]}/>`:r`<${Oo} key=${d.field} label=${d.label} value=${u} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
        </div>
      </div>

      <!-- Row 3: CSV footprint — full width -->
      <div class="mb-sm"><${Ui} snap=${e} mode="files"/></div>

    </div>
    <button class="header-toggle" onClick=${o} aria-label="Toggle details">
      ${n?"▲ less":"▼ more"}
    </button>
  `}function Zv(){var te;const[e,t]=Sr(Vv,Uv),{snap:s,history:n,connected:l,activeTab:o,globalRange:a,searchQuery:i,theme:c,viewerPath:d,events:v,enabledTools:u}=e,[m,g]=q(null),x=lt(null);ae(()=>{document.documentElement.setAttribute("data-theme",c);try{localStorage.setItem("aictl-theme",c)}catch{}},[c]);const L=ye(()=>{t({type:"SET_THEME",payload:to[(to.indexOf(c)+1)%to.length]})},[c]),T=ye(D=>{const H=D.since,G=D.until;D.id==="live"?g(null):D.id!=="custom"?Ln({range:D.id}).then(g).catch(()=>{}):Ln({since:H,until:G}).then(g).catch(()=>{}),Uo({since:H,until:G}).then(j=>t({type:"EVENTS_INIT",payload:j})).catch(()=>{})},[]);ae(()=>{let D,H=1e3,G=!1,j=!1;Xa().then(V=>t({type:"SNAP_REPLACE",payload:V})).catch(()=>{}),Ln().then(V=>t({type:"HISTORY_INIT",payload:V})).catch(()=>{}),T(a);function ne(){G||(D=new EventSource(Dd()),D.onmessage=V=>{const be=JSON.parse(V.data);t({type:"SSE_UPDATE",payload:be}),H=1e3},D.onerror=()=>{t({type:"SET_CONNECTED",payload:!1}),D.close(),G||setTimeout(ne,H),H=Math.min(H*2,3e4)})}ne();const ee=setInterval(()=>{G||j||(j=!0,Xa().then(V=>t({type:"SNAP_REPLACE",payload:V})).catch(()=>{}).finally(()=>{j=!1}))},3e4);return()=>{G=!0,D&&D.close(),clearInterval(ee)}},[]);const y=ye(D=>{const H=vl[D]||3600,G={id:D,since:Date.now()/1e3-H,until:null};t({type:"SET_RANGE",payload:G}),Xs("range",D),T(G)},[T]),$=ye((D,H)=>{const G={id:"custom",since:D,until:H};t({type:"SET_RANGE",payload:G}),T(G)},[T]),k=a.id==="live"?n:m||n,S=a.until?a.until-a.since:vl[a.id]||3600;ae(()=>{const D=H=>{var G;if(H.key==="Escape"&&t({type:"SET_VIEWER",payload:null}),H.key==="/"&&document.activeElement!==x.current&&(H.preventDefault(),(G=x.current)==null||G.focus()),document.activeElement!==x.current){const j=go.find(ne=>ne.key===H.key);j&&(t({type:"SET_TAB",payload:j.id}),Xs("active_tab",j.id))}};return document.addEventListener("keydown",D),()=>document.removeEventListener("keydown",D)},[]);const B=ye(D=>t({type:"SET_VIEWER",payload:D}),[]),A=ye(D=>{if(!ll.has(D))return;const H=s?s.tools.filter(j=>j.tool!=="aictl"&&j.tool!=="any"&&ll.has(j.tool)).map(j=>j.tool):[];let G;u===null?G=H.filter(j=>j!==D):u.indexOf(D)>=0?G=u.filter(ne=>ne!==D):(G=[...u,D],G.length>=H.length&&(G=null)),t({type:"SET_TOOL_FILTER",payload:G}),Xs("tool_filter",G)},[s,u]),C=ye(D=>{t({type:"SET_TOOL_FILTER",payload:D}),Xs("tool_filter",D)},[]),I=re(()=>{if(!s)return s;let D=s.tools;if(D=D.filter(H=>ll.has(H.tool)||H.tool==="aictl"),u!==null&&(D=D.filter(H=>u.includes(H.tool)||H.tool==="aictl")),i){const H=i.toLowerCase();D=D.filter(G=>G.label.toLowerCase().includes(H)||G.tool.toLowerCase().includes(H)||G.vendor&&G.vendor.toLowerCase().includes(H)||G.files.some(j=>j.path.toLowerCase().includes(H))||G.processes.some(j=>(j.name||"").toLowerCase().includes(H)||(j.cmdline||"").toLowerCase().includes(H))||G.live&&((G.live.workspaces||[]).some(j=>j.toLowerCase().includes(H))||(G.live.sources||[]).some(j=>j.toLowerCase().includes(H))))}return{...s,tools:D}},[s,i,u]),b=re(()=>{var G;const D=Date.now()/1e3-300,H=new Map;for(const j of v)if(j.kind==="file_modified"&&j.ts>=D&&((G=j.detail)!=null&&G.path)){const ne=H.get(j.detail.path);(!ne||j.ts>ne.ts)&&H.set(j.detail.path,{ts:j.ts,growth:j.detail.growth_bytes||0,tool:j.tool})}return H},[v]),M=re(()=>({snap:I,history:n,openViewer:B,recentFiles:b,globalRange:a,rangeSeconds:S,enabledTools:u}),[I,n,B,b,a,S,u]),O={overview:()=>r`<${Oe} tabName="overview">
      <${Qv} snap=${I} history=${k}
        globalRange=${a}/>
      <div class="mb-lg"><${Nv}/></div>
    </${Oe}>`,procs:()=>r`<${Oe} tabName="procs">
      <div class="mb-lg"><${ef}/></div>
    </${Oe}>`,memory:()=>r`<${Oe} tabName="memory">
      <div class="mb-lg"><${Rv}/></div>
      <div class="mb-lg"><${af}/></div>
    </${Oe}>`,live:()=>r`<${Oe} tabName="live"><div class="mb-lg"><${rf}/></div></${Oe}>`,events:()=>r`<${Oe} tabName="events"><div class="mb-lg"><${cf} key=${"events-"+o}/></div></${Oe}>`,budget:()=>r`<${Oe} tabName="budget"><div class="mb-lg"><${df} key=${"budget-"+o}/></div></${Oe}>`,sessions:()=>r`<${Oe} tabName="sessions"><div class="mb-lg"><${Of} key=${"sessions-"+o}/></div></${Oe}>`,analytics:()=>r`<${Oe} tabName="analytics"><div class="mb-lg"><${Uf} key=${"analytics-"+o}/></div></${Oe}>`,flow:()=>r`<${Oe} tabName="flow"><div class="mb-lg"><${sv} key=${"flow-"+o}/></div></${Oe}>`,transcript:()=>r`<${Oe} tabName="transcript"><div class="mb-lg"><${dv} key=${"transcript-"+o}/></div></${Oe}>`,timeline:()=>r`<${Oe} tabName="timeline"><div class="mb-lg"><${Sv} key=${"timeline-"+o}/></div></${Oe}>`,config:()=>r`<${Oe} tabName="config"><div class="mb-lg"><${Av}/></div></${Oe}>`},P=ye(D=>{t({type:"SET_TAB",payload:D}),Xs("active_tab",D)},[]);ye(D=>{t({type:"SET_TAB",payload:"sessions"}),Xs("active_tab","sessions"),window.__aictl_selected_session=D.session_id,window.dispatchEvent(new CustomEvent("aictl-session-select",{detail:D}))},[]);const[R,N]=q(!1);ae(()=>{let D=!0;const H=()=>Er().then(j=>{D&&N(j.active||!1)}).catch(()=>{D&&N(!1)});H();const G=setInterval(H,3e4);return()=>{D=!1,clearInterval(G)}},[]);const Y=re(()=>{if(!s)return[];const D=[];let H=0,G=0,j=0,ne=0;for(const ee of s.tools||[])for(const V of ee.processes||[]){const be=parseFloat(V.mem_mb)||0,Pe=(V.process_type||"").toLowerCase();(Pe==="subagent"||Pe==="agent")&&(H+=be),Pe==="mcp-server"&&V.zombie_risk&&V.zombie_risk!=="none"&&G++,(Pe==="browser"||(V.name||"").toLowerCase().includes("headless"))&&j++,V.anomalies&&V.anomalies.length&&(ne+=V.anomalies.length)}return H>2048&&D.push({level:"red",msg:`Subagent memory: ${ge(H*1048576)} (>2GB) — consider cleanup`}),G>0&&D.push({level:"orange",msg:`${G} MCP server(s) with dead parent — may be orphaned`}),j>0&&D.push({level:"yellow",msg:`${j} headless browser process(es) detected — check for leaks`}),ne>5&&D.push({level:"orange",msg:`${ne} process anomalies detected`}),D},[s]);return r`<${Ne.Provider} value=${M}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${x} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${i} onInput=${D=>t({type:"SET_SEARCH",payload:D.target.value})}/>
          <button class="theme-btn" onClick=${L} aria-label="Toggle theme: ${c}"
            title="Theme: ${c}">${zd[c]}</button>
          ${R&&r`<span class="conn ok" title="OTel receiver active — Claude Code pushing telemetry">OTel</span>`}
          <span class=${"conn "+(l?"ok":"err")} role="status" aria-live="polite">${l?"live":"reconnecting..."}<span class="sr-only">${l?" — connected to server":" — connection lost, attempting to reconnect"}</span></span>
        </div>
      </header>
      ${Y.length>0&&r`<div class="alert-banner" role="alert">
        ${Y.map((D,H)=>r`<div key=${H} class="alert-item" style="color:var(--${D.level})">
          \u26A0 ${D.msg}
        </div>`)}
      </div>`}
      <${Gv} globalRange=${a} onPreset=${y} onApplyCustom=${$}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${go.map(D=>r`<button key=${D.id} class="tab-btn" role="tab"
            aria-selected=${o===D.id} onClick=${()=>P(D.id)}
            title="Shortcut: ${D.key}">${D.icon?D.icon+" ":""}${D.label}</button>`)}
        </nav>
        <${Yv} snap=${s} enabledTools=${u}
          onToggle=${A} onSetAll=${C}/>
        <div id="main-content" role="tabpanel" aria-label=${(te=go.find(D=>D.id===o))==null?void 0:te.label}>
          ${O[o]?O[o]():r`<p class="text-muted">Unknown tab "${o}"</p>`}
        </div>
      </main>
    </div>
    <${Vp} path=${d} onClose=${()=>t({type:"SET_VIEWER",payload:null})}/>
    <${qv}/>
  </${Ne.Provider}>`}pd(r`<${Zv}/>`,document.getElementById("app"));
