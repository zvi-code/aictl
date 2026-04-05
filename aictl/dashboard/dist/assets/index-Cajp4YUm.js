(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))n(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function s(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(l){if(l.ep)return;l.ep=!0;const o=s(l);fetch(l.href,o)}})();var fl,Ee,ir,rs,Na,rr,cr,dr,No,ho,go,ur,nl={},ll=[],td=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,vl=Array.isArray;function Zt(e,t){for(var s in t)e[s]=t[s];return e}function jo(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function pr(e,t,s){var n,l,o,a={};for(o in t)o=="key"?n=t[o]:o=="ref"?l=t[o]:a[o]=t[o];if(arguments.length>2&&(a.children=arguments.length>3?fl.call(arguments,2):s),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)a[o]===void 0&&(a[o]=e.defaultProps[o]);return Qn(e,a,n,l,null)}function Qn(e,t,s,n,l){var o={type:e,props:t,key:s,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:l??++ir,__i:-1,__u:0};return l==null&&Ee.vnode!=null&&Ee.vnode(o),o}function ml(e){return e.children}function Zn(e,t){this.props=e,this.context=t}function on(e,t){if(t==null)return e.__?on(e.__,e.__i+1):null;for(var s;t<e.__k.length;t++)if((s=e.__k[t])!=null&&s.__e!=null)return s.__e;return typeof e.type=="function"?on(e):null}function sd(e){if(e.__P&&e.__d){var t=e.__v,s=t.__e,n=[],l=[],o=Zt({},t);o.__v=t.__v+1,Ee.vnode&&Ee.vnode(o),Bo(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[s]:null,n,s??on(t),!!(32&t.__u),l),o.__v=t.__v,o.__.__k[o.__i]=o,hr(n,o,l),t.__e=t.__=null,o.__e!=s&&fr(o)}}function fr(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),fr(e)}function _o(e){(!e.__d&&(e.__d=!0)&&rs.push(e)&&!ol.__r++||Na!=Ee.debounceRendering)&&((Na=Ee.debounceRendering)||rr)(ol)}function ol(){try{for(var e,t=1;rs.length;)rs.length>t&&rs.sort(cr),e=rs.shift(),t=rs.length,sd(e)}finally{rs.length=ol.__r=0}}function vr(e,t,s,n,l,o,a,i,c,d,v){var u,m,g,x,E,S,y,$=n&&n.__k||ll,k=t.length;for(c=nd(s,t,$,c,k),u=0;u<k;u++)(g=s.__k[u])!=null&&(m=g.__i!=-1&&$[g.__i]||nl,g.__i=u,S=Bo(e,g,m,l,o,a,i,c,d,v),x=g.__e,g.ref&&m.ref!=g.ref&&(m.ref&&Ho(m.ref,null,g),v.push(g.ref,g.__c||x,g)),E==null&&x!=null&&(E=x),(y=!!(4&g.__u))||m.__k===g.__k?c=mr(g,c,e,y):typeof g.type=="function"&&S!==void 0?c=S:x&&(c=x.nextSibling),g.__u&=-7);return s.__e=E,c}function nd(e,t,s,n,l){var o,a,i,c,d,v=s.length,u=v,m=0;for(e.__k=new Array(l),o=0;o<l;o++)(a=t[o])!=null&&typeof a!="boolean"&&typeof a!="function"?(typeof a=="string"||typeof a=="number"||typeof a=="bigint"||a.constructor==String?a=e.__k[o]=Qn(null,a,null,null,null):vl(a)?a=e.__k[o]=Qn(ml,{children:a},null,null,null):a.constructor===void 0&&a.__b>0?a=e.__k[o]=Qn(a.type,a.props,a.key,a.ref?a.ref:null,a.__v):e.__k[o]=a,c=o+m,a.__=e,a.__b=e.__b+1,i=null,(d=a.__i=ld(a,s,c,u))!=-1&&(u--,(i=s[d])&&(i.__u|=2)),i==null||i.__v==null?(d==-1&&(l>v?m--:l<v&&m++),typeof a.type!="function"&&(a.__u|=4)):d!=c&&(d==c-1?m--:d==c+1?m++:(d>c?m--:m++,a.__u|=4))):e.__k[o]=null;if(u)for(o=0;o<v;o++)(i=s[o])!=null&&!(2&i.__u)&&(i.__e==n&&(n=on(i)),_r(i,i));return n}function mr(e,t,s,n){var l,o;if(typeof e.type=="function"){for(l=e.__k,o=0;l&&o<l.length;o++)l[o]&&(l[o].__=e,t=mr(l[o],t,s,n));return t}e.__e!=t&&(n&&(t&&e.type&&!t.parentNode&&(t=on(e)),s.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function ld(e,t,s,n){var l,o,a,i=e.key,c=e.type,d=t[s],v=d!=null&&(2&d.__u)==0;if(d===null&&i==null||v&&i==d.key&&c==d.type)return s;if(n>(v?1:0)){for(l=s-1,o=s+1;l>=0||o<t.length;)if((d=t[a=l>=0?l--:o++])!=null&&!(2&d.__u)&&i==d.key&&c==d.type)return a}return-1}function ja(e,t,s){t[0]=="-"?e.setProperty(t,s??""):e[t]=s==null?"":typeof s!="number"||td.test(t)?s:s+"px"}function Wn(e,t,s,n,l){var o,a;e:if(t=="style")if(typeof s=="string")e.style.cssText=s;else{if(typeof n=="string"&&(e.style.cssText=n=""),n)for(t in n)s&&t in s||ja(e.style,t,"");if(s)for(t in s)n&&s[t]==n[t]||ja(e.style,t,s[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace(dr,"$1")),a=t.toLowerCase(),t=a in e||t=="onFocusOut"||t=="onFocusIn"?a.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=s,s?n?s.u=n.u:(s.u=No,e.addEventListener(t,o?go:ho,o)):e.removeEventListener(t,o?go:ho,o);else{if(l=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=s??"";break e}catch{}typeof s=="function"||(s==null||s===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&s==1?"":s))}}function Ba(e){return function(t){if(this.l){var s=this.l[t.type+e];if(t.t==null)t.t=No++;else if(t.t<s.u)return;return s(Ee.event?Ee.event(t):t)}}}function Bo(e,t,s,n,l,o,a,i,c,d){var v,u,m,g,x,E,S,y,$,k,T,H,D,O,P,b=t.type;if(t.constructor!==void 0)return null;128&s.__u&&(c=!!(32&s.__u),o=[i=t.__e=s.__e]),(v=Ee.__b)&&v(t);e:if(typeof b=="function")try{if(y=t.props,$=b.prototype&&b.prototype.render,k=(v=b.contextType)&&n[v.__c],T=v?k?k.props.value:v.__:n,s.__c?S=(u=t.__c=s.__c).__=u.__E:($?t.__c=u=new b(y,T):(t.__c=u=new Zn(y,T),u.constructor=b,u.render=ad),k&&k.sub(u),u.state||(u.state={}),u.__n=n,m=u.__d=!0,u.__h=[],u._sb=[]),$&&u.__s==null&&(u.__s=u.state),$&&b.getDerivedStateFromProps!=null&&(u.__s==u.state&&(u.__s=Zt({},u.__s)),Zt(u.__s,b.getDerivedStateFromProps(y,u.__s))),g=u.props,x=u.state,u.__v=t,m)$&&b.getDerivedStateFromProps==null&&u.componentWillMount!=null&&u.componentWillMount(),$&&u.componentDidMount!=null&&u.__h.push(u.componentDidMount);else{if($&&b.getDerivedStateFromProps==null&&y!==g&&u.componentWillReceiveProps!=null&&u.componentWillReceiveProps(y,T),t.__v==s.__v||!u.__e&&u.shouldComponentUpdate!=null&&u.shouldComponentUpdate(y,u.__s,T)===!1){t.__v!=s.__v&&(u.props=y,u.state=u.__s,u.__d=!1),t.__e=s.__e,t.__k=s.__k,t.__k.some(function(C){C&&(C.__=t)}),ll.push.apply(u.__h,u._sb),u._sb=[],u.__h.length&&a.push(u);break e}u.componentWillUpdate!=null&&u.componentWillUpdate(y,u.__s,T),$&&u.componentDidUpdate!=null&&u.__h.push(function(){u.componentDidUpdate(g,x,E)})}if(u.context=T,u.props=y,u.__P=e,u.__e=!1,H=Ee.__r,D=0,$)u.state=u.__s,u.__d=!1,H&&H(t),v=u.render(u.props,u.state,u.context),ll.push.apply(u.__h,u._sb),u._sb=[];else do u.__d=!1,H&&H(t),v=u.render(u.props,u.state,u.context),u.state=u.__s;while(u.__d&&++D<25);u.state=u.__s,u.getChildContext!=null&&(n=Zt(Zt({},n),u.getChildContext())),$&&!m&&u.getSnapshotBeforeUpdate!=null&&(E=u.getSnapshotBeforeUpdate(g,x)),O=v!=null&&v.type===ml&&v.key==null?gr(v.props.children):v,i=vr(e,vl(O)?O:[O],t,s,n,l,o,a,i,c,d),u.base=t.__e,t.__u&=-161,u.__h.length&&a.push(u),S&&(u.__E=u.__=null)}catch(C){if(t.__v=null,c||o!=null)if(C.then){for(t.__u|=c?160:128;i&&i.nodeType==8&&i.nextSibling;)i=i.nextSibling;o[o.indexOf(i)]=null,t.__e=i}else{for(P=o.length;P--;)jo(o[P]);$o(t)}else t.__e=s.__e,t.__k=s.__k,C.then||$o(t);Ee.__e(C,t,s)}else o==null&&t.__v==s.__v?(t.__k=s.__k,t.__e=s.__e):i=t.__e=od(s.__e,t,s,n,l,o,a,c,d);return(v=Ee.diffed)&&v(t),128&t.__u?void 0:i}function $o(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some($o))}function hr(e,t,s){for(var n=0;n<s.length;n++)Ho(s[n],s[++n],s[++n]);Ee.__c&&Ee.__c(t,e),e.some(function(l){try{e=l.__h,l.__h=[],e.some(function(o){o.call(l)})}catch(o){Ee.__e(o,l.__v)}})}function gr(e){return typeof e!="object"||e==null||e.__b>0?e:vl(e)?e.map(gr):Zt({},e)}function od(e,t,s,n,l,o,a,i,c){var d,v,u,m,g,x,E,S=s.props||nl,y=t.props,$=t.type;if($=="svg"?l="http://www.w3.org/2000/svg":$=="math"?l="http://www.w3.org/1998/Math/MathML":l||(l="http://www.w3.org/1999/xhtml"),o!=null){for(d=0;d<o.length;d++)if((g=o[d])&&"setAttribute"in g==!!$&&($?g.localName==$:g.nodeType==3)){e=g,o[d]=null;break}}if(e==null){if($==null)return document.createTextNode(y);e=document.createElementNS(l,$,y.is&&y),i&&(Ee.__m&&Ee.__m(t,o),i=!1),o=null}if($==null)S===y||i&&e.data==y||(e.data=y);else{if(o=o&&fl.call(e.childNodes),!i&&o!=null)for(S={},d=0;d<e.attributes.length;d++)S[(g=e.attributes[d]).name]=g.value;for(d in S)g=S[d],d=="dangerouslySetInnerHTML"?u=g:d=="children"||d in y||d=="value"&&"defaultValue"in y||d=="checked"&&"defaultChecked"in y||Wn(e,d,null,g,l);for(d in y)g=y[d],d=="children"?m=g:d=="dangerouslySetInnerHTML"?v=g:d=="value"?x=g:d=="checked"?E=g:i&&typeof g!="function"||S[d]===g||Wn(e,d,g,S[d],l);if(v)i||u&&(v.__html==u.__html||v.__html==e.innerHTML)||(e.innerHTML=v.__html),t.__k=[];else if(u&&(e.innerHTML=""),vr(t.type=="template"?e.content:e,vl(m)?m:[m],t,s,n,$=="foreignObject"?"http://www.w3.org/1999/xhtml":l,o,a,o?o[0]:s.__k&&on(s,0),i,c),o!=null)for(d=o.length;d--;)jo(o[d]);i||(d="value",$=="progress"&&x==null?e.removeAttribute("value"):x!=null&&(x!==e[d]||$=="progress"&&!x||$=="option"&&x!=S[d])&&Wn(e,d,x,S[d],l),d="checked",E!=null&&E!=e[d]&&Wn(e,d,E,S[d],l))}return e}function Ho(e,t,s){try{if(typeof e=="function"){var n=typeof e.__u=="function";n&&e.__u(),n&&t==null||(e.__u=e(t))}else e.current=t}catch(l){Ee.__e(l,s)}}function _r(e,t,s){var n,l;if(Ee.unmount&&Ee.unmount(e),(n=e.ref)&&(n.current&&n.current!=e.__e||Ho(n,null,t)),(n=e.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(o){Ee.__e(o,t)}n.base=n.__P=null}if(n=e.__k)for(l=0;l<n.length;l++)n[l]&&_r(n[l],t,s||typeof e.type!="function");s||jo(e.__e),e.__c=e.__=e.__e=void 0}function ad(e,t,s){return this.constructor(e,s)}function id(e,t,s){var n,l,o,a;t==document&&(t=document.documentElement),Ee.__&&Ee.__(e,t),l=(n=!1)?null:t.__k,o=[],a=[],Bo(t,e=t.__k=pr(ml,null,[e]),l||nl,nl,t.namespaceURI,l?null:t.firstChild?fl.call(t.childNodes):null,o,l?l.__e:t.firstChild,n,a),hr(o,e,a)}function rd(e){function t(s){var n,l;return this.getChildContext||(n=new Set,(l={})[t.__c]=this,this.getChildContext=function(){return l},this.componentWillUnmount=function(){n=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&n.forEach(function(a){a.__e=!0,_o(a)})},this.sub=function(o){n.add(o);var a=o.componentWillUnmount;o.componentWillUnmount=function(){n&&n.delete(o),a&&a.call(o)}}),s.children}return t.__c="__cC"+ur++,t.__=e,t.Provider=t.__l=(t.Consumer=function(s,n){return s.children(n)}).contextType=t,t}fl=ll.slice,Ee={__e:function(e,t,s,n){for(var l,o,a;t=t.__;)if((l=t.__c)&&!l.__)try{if((o=l.constructor)&&o.getDerivedStateFromError!=null&&(l.setState(o.getDerivedStateFromError(e)),a=l.__d),l.componentDidCatch!=null&&(l.componentDidCatch(e,n||{}),a=l.__d),a)return l.__E=l}catch(i){e=i}throw e}},ir=0,Zn.prototype.setState=function(e,t){var s;s=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=Zt({},this.state),typeof e=="function"&&(e=e(Zt({},s),this.props)),e&&Zt(s,e),e!=null&&this.__v&&(t&&this._sb.push(t),_o(this))},Zn.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),_o(this))},Zn.prototype.render=ml,rs=[],rr=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,cr=function(e,t){return e.__v.__b-t.__v.__b},ol.__r=0,dr=/(PointerCapture)$|Capture$/i,No=0,ho=Ba(!1),go=Ba(!0),ur=0;var $r=function(e,t,s,n){var l;t[0]=0;for(var o=1;o<t.length;o++){var a=t[o++],i=t[o]?(t[0]|=a?1:2,s[t[o++]]):t[++o];a===3?n[0]=i:a===4?n[1]=Object.assign(n[1]||{},i):a===5?(n[1]=n[1]||{})[t[++o]]=i:a===6?n[1][t[++o]]+=i+"":a?(l=e.apply(i,$r(e,i,s,["",null])),n.push(l),i[0]?t[0]|=2:(t[o-2]=0,t[o]=l)):n.push(i)}return n},Ha=new Map;function cd(e){var t=Ha.get(this);return t||(t=new Map,Ha.set(this,t)),(t=$r(this,t.get(e)||(t.set(e,t=function(s){for(var n,l,o=1,a="",i="",c=[0],d=function(m){o===1&&(m||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?c.push(0,m,a):o===3&&(m||a)?(c.push(3,m,a),o=2):o===2&&a==="..."&&m?c.push(4,m,0):o===2&&a&&!m?c.push(5,0,!0,a):o>=5&&((a||!m&&o===5)&&(c.push(o,0,a,l),o=6),m&&(c.push(o,m,0,l),o=6)),a=""},v=0;v<s.length;v++){v&&(o===1&&d(),d(v));for(var u=0;u<s[v].length;u++)n=s[v][u],o===1?n==="<"?(d(),c=[c],o=3):a+=n:o===4?a==="--"&&n===">"?(o=1,a=""):a=n+a[0]:i?n===i?i="":a+=n:n==='"'||n==="'"?i=n:n===">"?(d(),o=1):o&&(n==="="?(o=5,l=a,a=""):n==="/"&&(o<5||s[v][u+1]===">")?(d(),o===3&&(c=c[0]),o=c,(c=c[0]).push(2,0,o),o=0):n===" "||n==="	"||n===`
`||n==="\r"?(d(),o=2):a+=n),o===3&&a==="!--"&&(o=4,c=c[0])}return d(),c}(e)),t),arguments,[])).length>1?t:t[0]}var r=cd.bind(pr),an,ze,Ql,Wa,An=0,br=[],Be=Ee,qa=Be.__b,Va=Be.__r,Ua=Be.diffed,Ga=Be.__c,Ya=Be.unmount,Ka=Be.__;function hl(e,t){Be.__h&&Be.__h(ze,e,An||t),An=0;var s=ze.__H||(ze.__H={__:[],__h:[]});return e>=s.__.length&&s.__.push({}),s.__[e]}function q(e){return An=1,yr(kr,e)}function yr(e,t,s){var n=hl(an++,2);if(n.t=e,!n.__c&&(n.__=[kr(void 0,t),function(i){var c=n.__N?n.__N[0]:n.__[0],d=n.t(c,i);c!==d&&(n.__N=[d,n.__[1]],n.__c.setState({}))}],n.__c=ze,!ze.__f)){var l=function(i,c,d){if(!n.__c.__H)return!0;var v=n.__c.__H.__.filter(function(m){return m.__c});if(v.every(function(m){return!m.__N}))return!o||o.call(this,i,c,d);var u=n.__c.props!==i;return v.some(function(m){if(m.__N){var g=m.__[0];m.__=m.__N,m.__N=void 0,g!==m.__[0]&&(u=!0)}}),o&&o.call(this,i,c,d)||u};ze.__f=!0;var o=ze.shouldComponentUpdate,a=ze.componentWillUpdate;ze.componentWillUpdate=function(i,c,d){if(this.__e){var v=o;o=void 0,l(i,c,d),o=v}a&&a.call(this,i,c,d)},ze.shouldComponentUpdate=l}return n.__N||n.__}function ae(e,t){var s=hl(an++,3);!Be.__s&&xr(s.__H,t)&&(s.__=e,s.u=t,ze.__H.__h.push(s))}function nt(e){return An=5,re(function(){return{current:e}},[])}function re(e,t){var s=hl(an++,7);return xr(s.__H,t)&&(s.__=e(),s.__H=t,s.__h=e),s.__}function ye(e,t){return An=8,re(function(){return e},t)}function We(e){var t=ze.context[e.__c],s=hl(an++,9);return s.c=e,t?(s.__==null&&(s.__=!0,t.sub(ze)),t.props.value):e.__}function dd(){for(var e;e=br.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(Xn),t.__h.some(bo),t.__h=[]}catch(s){t.__h=[],Be.__e(s,e.__v)}}}Be.__b=function(e){ze=null,qa&&qa(e)},Be.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),Ka&&Ka(e,t)},Be.__r=function(e){Va&&Va(e),an=0;var t=(ze=e.__c).__H;t&&(Ql===ze?(t.__h=[],ze.__h=[],t.__.some(function(s){s.__N&&(s.__=s.__N),s.u=s.__N=void 0})):(t.__h.some(Xn),t.__h.some(bo),t.__h=[],an=0)),Ql=ze},Be.diffed=function(e){Ua&&Ua(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(br.push(t)!==1&&Wa===Be.requestAnimationFrame||((Wa=Be.requestAnimationFrame)||ud)(dd)),t.__H.__.some(function(s){s.u&&(s.__H=s.u),s.u=void 0})),Ql=ze=null},Be.__c=function(e,t){t.some(function(s){try{s.__h.some(Xn),s.__h=s.__h.filter(function(n){return!n.__||bo(n)})}catch(n){t.some(function(l){l.__h&&(l.__h=[])}),t=[],Be.__e(n,s.__v)}}),Ga&&Ga(e,t)},Be.unmount=function(e){Ya&&Ya(e);var t,s=e.__c;s&&s.__H&&(s.__H.__.some(function(n){try{Xn(n)}catch(l){t=l}}),s.__H=void 0,t&&Be.__e(t,s.__v))};var Ja=typeof requestAnimationFrame=="function";function ud(e){var t,s=function(){clearTimeout(n),Ja&&cancelAnimationFrame(t),setTimeout(e)},n=setTimeout(s,35);Ja&&(t=requestAnimationFrame(s))}function Xn(e){var t=ze,s=e.__c;typeof s=="function"&&(e.__c=void 0,s()),ze=t}function bo(e){var t=ze;e.__c=e.__(),ze=t}function xr(e,t){return!e||e.length!==t.length||t.some(function(s,n){return s!==e[n]})}function kr(e,t){return typeof t=="function"?t(e):t}const Ie=rd(null);let pd="";function Ne(e){return pd+e}async function Qa(){return(await fetch(Ne("/api/snapshot"))).json()}async function Mn(e={}){let t="/api/history";const s=[];return e.range&&s.push("range="+e.range),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.tool&&s.push("tool="+encodeURIComponent(e.tool)),s.length&&(t+="?"+s.join("&")),(await fetch(Ne(t))).json()}async function Wo(e={}){let t="/api/events";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.sessionId&&s.push("session_id="+encodeURIComponent(e.sessionId)),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(Ne(t))).json()}async function wr(e={}){let t="/api/sessions";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.active!=null&&s.push("active="+e.active),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(Ne(t))).json()}async function qo(e,t,s){let n=`/api/session-flow?session_id=${encodeURIComponent(e)}&since=${t}&until=${s}`;return(await fetch(Ne(n))).json()}async function gl(e,t={}){let s="/api/session-timeline";const n=[];return t.since!=null&&n.push("since="+t.since),t.until!=null&&n.push("until="+t.until),n.length&&(s+="?"+n.join("&")),(await fetch(Ne(s))).json()}async function fd(e,t,s=30,n=20){const l=`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=${s}&limit=${n}`;return(await fetch(Ne(l))).json()}async function vd(e){return(await fetch(Ne("/api/agent-teams?session_id="+encodeURIComponent(e)))).json()}async function md(e){return(await fetch(Ne("/api/transcript/"+encodeURIComponent(e)))).json()}async function hd(e,t={}){return(await fetch(Ne(e),t)).json()}async function gd(e=7){return(await fetch(Ne("/api/project-costs?days="+e))).json()}async function _d(e,t=100){return(await fetch(Ne(`/api/api-calls?since=${e}&limit=${t}`))).json()}async function $d(){return(await fetch(Ne("/api/budget"))).json()}async function bd(e,t={}){return fetch(Ne("/api/file?path="+encodeURIComponent(e)),{headers:t})}async function yd(){return(await fetch(Ne("/api/samples?list=1"))).json()}async function xd(e,t){return(await fetch(Ne("/api/samples?series="+encodeURIComponent(e)+"&since="+t))).json()}async function kd(e,t){return(await fetch(Ne("/api/samples?metric="+encodeURIComponent(e)+"&since="+t))).json()}async function Sr(){return(await fetch(Ne("/api/otel-status"))).json()}async function wd(){return(await fetch(Ne("/api/self-status"))).json()}let Zl=null;async function Sd(){return Zl||(Zl=fetch(Ne("/api/datapoints")).then(e=>e.json())),Zl}function Td(){return Ne("/api/stream")}const Le=window.COLORS??{},ft=window.ICONS??{},Tr=window.VENDOR_LABELS??{},Cd=window.VENDOR_COLORS??{},Md=window.HOST_LABELS??{},Za=window.TOOL_RELATIONSHIPS??{},Ed={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},Xl=["auto","dark","light"],Ld={auto:"☾",dark:"☾",light:"☀"},nn=5,Ks=15,Ad={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},Xa=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],Dd={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},Pd=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],al=new Map,Od=6e4;function Cr(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function _l(e,t,s,n=1){for(let l=t.length-1;l>=0;l--){const[o,a]=t[l],i=e/o;if(i>=n)return Cr(i)+a}return Math.round(e)+s}const zd=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],Rd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],Fd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function z(e){return _l(e,Rd,"")}function Ue(e){return _l(e,Fd,"")}function ge(e){return _l(e,zd,"B")}function It(e){return!e||e<=0?"0B/s":_l(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function _e(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function K(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function Vo(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function Mr(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Cs(e){return e&&e.replace(/\\/g,"/")}function eo(e,t){const s=Cs(e),n=Cs(t);return s.startsWith(n+"/")?"project":s.includes("/.claude/projects/")?"shadow":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")||s.includes("/.copilot/")||s.includes("/.vscode/")?"global":"external"}function Id(e,t){const s=Cs(e),n=Cs(t);if(s.startsWith(n+"/")){const o=s.slice(n.length+1),a=o.split("/");return a.pop(),a.length?a.join("/"):"(root)"}const l=s.split("/");l.pop();for(let o=l.length-1;o>=0;o--)if(l[o].startsWith(".")&&l[o].length>1&&l[o]!==".."||l[o]==="Library"||l[o]==="AppData")return"~/"+l.slice(o).join("/");return l.slice(-2).join("/")}function Nd(e,t){const s={};e.forEach(l=>{const o=eo(l.path,t),a=Id(l.path,t),i=o==="project"?a:o+": "+a;(s[i]=s[i]||[]).push(l)});const n={project:0,global:1,shadow:2,external:3};return Object.entries(s).sort((l,o)=>{const a=l[1][0]?eo(l[1][0].path,t):"z",i=o[1][0]?eo(o[1][0].path,t):"z";return(n[a]||9)-(n[i]||9)})}function jd(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let s=2;s<e.length;s++)t.push((e[s-2]+e[s-1]+e[s])/3);return t}async function Uo(e){const t=al.get(e);if(t&&Date.now()-t.ts<Od)return t.content;const s={};t&&t.etag&&(s["If-None-Match"]=t.etag);const n=await bd(e,s);if(n.status===304&&t)return t.ts=Date.now(),t.content;if(!n.ok)throw new Error(n.statusText);const l=await n.text(),o=n.headers.get("ETag")||null;return al.set(e,{content:l,ts:Date.now(),etag:o}),l}function Nt(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function Er(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function to(e,t,s,n){if(e==null||e==="")return"";let l=typeof e=="number"?e:parseFloat(e)||0;n&&(l*=n);let o;switch(t){case"size":o=ge(l);break;case"rate":o=It(l);break;case"kilo":o=z(l);break;case"percent":o=_e(l);break;case"pct":o=_e(l);break;case"raw":default:o=Number.isInteger(l)?String(l):Cr(l)}return s?o+s:o}function ei(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const Xs={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],tabs:[{id:"overview",label:"Dashboard",icon:"📊",key:"1"},{id:"procs",label:"Processes",icon:"⚙️",key:"2"},{id:"memory",label:"AI Context",icon:"📝",key:"3"},{id:"live",label:"Live Monitor",icon:"📡",key:"4"},{id:"events",label:"Events & Stats",icon:"📈",key:"5"},{id:"budget",label:"Token Budget",icon:"💰",key:"6"},{id:"sessions",label:"Sessions",icon:"🔄",key:"7"},{id:"analytics",label:"Analytics",icon:"🔬",key:"8"},{id:"flow",label:"Session Flow",icon:"🔀",key:"9"},{id:"transcript",label:"Transcript",icon:"📜",key:"t"},{id:"timeline",label:"Timeline",icon:"📉",key:"y"},{id:"config",label:"Configuration",icon:"⚙️",key:"0"}]},ti=200,si=80,Bd=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Hd(e,t){if(!e)return t;const s=Object.fromEntries((t.tools||[]).map(n=>[n.tool,n]));return{...e,...t,tools:e.tools.map(n=>{const l=s[n.tool];return l?{...n,live:l.live,vendor:l.vendor||n.vendor,host:l.host||n.host}:n})}}function Wd(e,t){var n,l,o,a;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>ti)for(const i of Bd)e[i]=e[i].slice(-ti);const s=e.by_tool||{};for(const i of t.tools||[]){if(i.tool==="aictl")continue;const c=((n=i.live)==null?void 0:n.cpu_percent)||0,d=((l=i.live)==null?void 0:l.mem_mb)||0,v=i.tokens||0,u=(((o=i.live)==null?void 0:o.outbound_rate_bps)||0)+(((a=i.live)==null?void 0:a.inbound_rate_bps)||0);s[i.tool]||(s[i.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const m=s[i.tool];if(m.ts.push(t.timestamp),m.cpu.push(Math.round(c*10)/10),m.mem_mb.push(Math.round(d*10)/10),m.tokens.push(v),m.traffic.push(Math.round(u*100)/100),m.ts.length>si)for(const g of Object.keys(m))m[g]=m[g].slice(-si)}return{...e,by_tool:s}}const qd=!0,Ye="u-",Vd="uplot",Ud=Ye+"hz",Gd=Ye+"vt",Yd=Ye+"title",Kd=Ye+"wrap",Jd=Ye+"under",Qd=Ye+"over",Zd=Ye+"axis",Ss=Ye+"off",Xd=Ye+"select",eu=Ye+"cursor-x",tu=Ye+"cursor-y",su=Ye+"cursor-pt",nu=Ye+"legend",lu=Ye+"live",ou=Ye+"inline",au=Ye+"series",iu=Ye+"marker",ni=Ye+"label",ru=Ye+"value",Sn="width",Tn="height",kn="top",li="bottom",Js="left",so="right",Go="#000",oi=Go+"0",no="mousemove",ai="mousedown",lo="mouseup",ii="mouseenter",ri="mouseleave",ci="dblclick",cu="resize",du="scroll",di="change",il="dppxchange",Yo="--",pn=typeof window<"u",yo=pn?document:null,ln=pn?window:null,uu=pn?navigator:null;let me,qn;function xo(){let e=devicePixelRatio;me!=e&&(me=e,qn&&wo(di,qn,xo),qn=matchMedia(`(min-resolution: ${me-.001}dppx) and (max-resolution: ${me+.001}dppx)`),Ts(di,qn,xo),ln.dispatchEvent(new CustomEvent(il)))}function $t(e,t){if(t!=null){let s=e.classList;!s.contains(t)&&s.add(t)}}function ko(e,t){let s=e.classList;s.contains(t)&&s.remove(t)}function Me(e,t,s){e.style[t]=s+"px"}function zt(e,t,s,n){let l=yo.createElement(e);return t!=null&&$t(l,t),s!=null&&s.insertBefore(l,n),l}function Mt(e,t){return zt("div",e,t)}const ui=new WeakMap;function Gt(e,t,s,n,l){let o="translate("+t+"px,"+s+"px)",a=ui.get(e);o!=a&&(e.style.transform=o,ui.set(e,o),t<0||s<0||t>n||s>l?$t(e,Ss):ko(e,Ss))}const pi=new WeakMap;function fi(e,t,s){let n=t+s,l=pi.get(e);n!=l&&(pi.set(e,n),e.style.background=t,e.style.borderColor=s)}const vi=new WeakMap;function mi(e,t,s,n){let l=t+""+s,o=vi.get(e);l!=o&&(vi.set(e,l),e.style.height=s+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-s/2+"px":0)}const Ko={passive:!0},pu={...Ko,capture:!0};function Ts(e,t,s,n){t.addEventListener(e,s,n?pu:Ko)}function wo(e,t,s,n){t.removeEventListener(e,s,Ko)}pn&&xo();function Rt(e,t,s,n){let l;s=s||0,n=n||t.length-1;let o=n<=2147483647;for(;n-s>1;)l=o?s+n>>1:bt((s+n)/2),t[l]<e?s=l:n=l;return e-t[s]<=t[n]-e?s:n}function Lr(e){return(s,n,l)=>{let o=-1,a=-1;for(let i=n;i<=l;i++)if(e(s[i])){o=i;break}for(let i=l;i>=n;i--)if(e(s[i])){a=i;break}return[o,a]}}const Ar=e=>e!=null,Dr=e=>e!=null&&e>0,$l=Lr(Ar),fu=Lr(Dr);function vu(e,t,s,n=0,l=!1){let o=l?fu:$l,a=l?Dr:Ar;[t,s]=o(e,t,s);let i=e[t],c=e[t];if(t>-1)if(n==1)i=e[t],c=e[s];else if(n==-1)i=e[s],c=e[t];else for(let d=t;d<=s;d++){let v=e[d];a(v)&&(v<i?i=v:v>c&&(c=v))}return[i??xe,c??-xe]}function bl(e,t,s,n){let l=_i(e),o=_i(t);e==t&&(l==-1?(e*=s,t/=s):(e/=s,t*=s));let a=s==10?es:Pr,i=l==1?bt:Et,c=o==1?Et:bt,d=i(a(Ge(e))),v=c(a(Ge(t))),u=rn(s,d),m=rn(s,v);return s==10&&(d<0&&(u=ke(u,-d)),v<0&&(m=ke(m,-v))),n||s==2?(e=u*l,t=m*o):(e=Fr(e,u),t=yl(t,m)),[e,t]}function Jo(e,t,s,n){let l=bl(e,t,s,n);return e==0&&(l[0]=0),t==0&&(l[1]=0),l}const Qo=.1,hi={mode:3,pad:Qo},En={pad:0,soft:null,mode:0},mu={min:En,max:En};function rl(e,t,s,n){return xl(s)?gi(e,t,s):(En.pad=s,En.soft=n?0:null,En.mode=n?3:0,gi(e,t,mu))}function fe(e,t){return e??t}function hu(e,t,s){for(t=fe(t,0),s=fe(s,e.length-1);t<=s;){if(e[t]!=null)return!0;t++}return!1}function gi(e,t,s){let n=s.min,l=s.max,o=fe(n.pad,0),a=fe(l.pad,0),i=fe(n.hard,-xe),c=fe(l.hard,xe),d=fe(n.soft,xe),v=fe(l.soft,-xe),u=fe(n.mode,0),m=fe(l.mode,0),g=t-e,x=es(g),E=dt(Ge(e),Ge(t)),S=es(E),y=Ge(S-x);(g<1e-24||y>10)&&(g=0,(e==0||t==0)&&(g=1e-24,u==2&&d!=xe&&(o=0),m==2&&v!=-xe&&(a=0)));let $=g||E||1e3,k=es($),T=rn(10,bt(k)),H=$*(g==0?e==0?.1:1:o),D=ke(Fr(e-H,T/10),24),O=e>=d&&(u==1||u==3&&D<=d||u==2&&D>=d)?d:xe,P=dt(i,D<O&&e>=O?O:Ft(O,D)),b=$*(g==0?t==0?.1:1:a),C=ke(yl(t+b,T/10),24),A=t<=v&&(m==1||m==3&&C>=v||m==2&&C<=v)?v:-xe,F=Ft(c,C>A&&t<=A?A:dt(A,C));return P==F&&P==0&&(F=100),[P,F]}const gu=new Intl.NumberFormat(pn?uu.language:"en-US"),Zo=e=>gu.format(e),yt=Math,el=yt.PI,Ge=yt.abs,bt=yt.floor,Ve=yt.round,Et=yt.ceil,Ft=yt.min,dt=yt.max,rn=yt.pow,_i=yt.sign,es=yt.log10,Pr=yt.log2,_u=(e,t=1)=>yt.sinh(e)*t,oo=(e,t=1)=>yt.asinh(e/t),xe=1/0;function $i(e){return(es((e^e>>31)-(e>>31))|0)+1}function So(e,t,s){return Ft(dt(e,t),s)}function Or(e){return typeof e=="function"}function de(e){return Or(e)?e:()=>e}const $u=()=>{},zr=e=>e,Rr=(e,t)=>t,bu=e=>null,bi=e=>!0,yi=(e,t)=>e==t,yu=/\.\d*?(?=9{6,}|0{6,})/gm,Ms=e=>{if(Nr(e)||ps.has(e))return e;const t=`${e}`,s=t.match(yu);if(s==null)return e;let n=s[0].length-1;if(t.indexOf("e-")!=-1){let[l,o]=t.split("e");return+`${Ms(l)}e${o}`}return ke(e,n)};function ks(e,t){return Ms(ke(Ms(e/t))*t)}function yl(e,t){return Ms(Et(Ms(e/t))*t)}function Fr(e,t){return Ms(bt(Ms(e/t))*t)}function ke(e,t=0){if(Nr(e))return e;let s=10**t,n=e*s*(1+Number.EPSILON);return Ve(n)/s}const ps=new Map;function Ir(e){return((""+e).split(".")[1]||"").length}function Dn(e,t,s,n){let l=[],o=n.map(Ir);for(let a=t;a<s;a++){let i=Ge(a),c=ke(rn(e,a),i);for(let d=0;d<n.length;d++){let v=e==10?+`${n[d]}e${a}`:n[d]*c,u=(a>=0?0:i)+(a>=o[d]?0:o[d]),m=e==10?v:ke(v,u);l.push(m),ps.set(m,u)}}return l}const Ln={},Xo=[],cn=[null,null],cs=Array.isArray,Nr=Number.isInteger,xu=e=>e===void 0;function xi(e){return typeof e=="string"}function xl(e){let t=!1;if(e!=null){let s=e.constructor;t=s==null||s==Object}return t}function ku(e){return e!=null&&typeof e=="object"}const wu=Object.getPrototypeOf(Uint8Array),jr="__proto__";function dn(e,t=xl){let s;if(cs(e)){let n=e.find(l=>l!=null);if(cs(n)||t(n)){s=Array(e.length);for(let l=0;l<e.length;l++)s[l]=dn(e[l],t)}else s=e.slice()}else if(e instanceof wu)s=e.slice();else if(t(e)){s={};for(let n in e)n!=jr&&(s[n]=dn(e[n],t))}else s=e;return s}function He(e){let t=arguments;for(let s=1;s<t.length;s++){let n=t[s];for(let l in n)l!=jr&&(xl(e[l])?He(e[l],dn(n[l])):e[l]=dn(n[l]))}return e}const Su=0,Tu=1,Cu=2;function Mu(e,t,s){for(let n=0,l,o=-1;n<t.length;n++){let a=t[n];if(a>o){for(l=a-1;l>=0&&e[l]==null;)e[l--]=null;for(l=a+1;l<s&&e[l]==null;)e[o=l++]=null}}}function Eu(e,t){if(Du(e)){let a=e[0].slice();for(let i=1;i<e.length;i++)a.push(...e[i].slice(1));return Pu(a[0])||(a=Au(a)),a}let s=new Set;for(let a=0;a<e.length;a++){let c=e[a][0],d=c.length;for(let v=0;v<d;v++)s.add(c[v])}let n=[Array.from(s).sort((a,i)=>a-i)],l=n[0].length,o=new Map;for(let a=0;a<l;a++)o.set(n[0][a],a);for(let a=0;a<e.length;a++){let i=e[a],c=i[0];for(let d=1;d<i.length;d++){let v=i[d],u=Array(l).fill(void 0),m=t?t[a][d]:Tu,g=[];for(let x=0;x<v.length;x++){let E=v[x],S=o.get(c[x]);E===null?m!=Su&&(u[S]=E,m==Cu&&g.push(S)):u[S]=E}Mu(u,g,l),n.push(u)}}return n}const Lu=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function Au(e){let t=e[0],s=t.length,n=Array(s);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,a)=>t[o]-t[a]);let l=[];for(let o=0;o<e.length;o++){let a=e[o],i=Array(s);for(let c=0;c<s;c++)i[c]=a[n[c]];l.push(i)}return l}function Du(e){let t=e[0][0],s=t.length;for(let n=1;n<e.length;n++){let l=e[n][0];if(l.length!=s)return!1;if(l!=t){for(let o=0;o<s;o++)if(l[o]!=t[o])return!1}}return!0}function Pu(e,t=100){const s=e.length;if(s<=1)return!0;let n=0,l=s-1;for(;n<=l&&e[n]==null;)n++;for(;l>=n&&e[l]==null;)l--;if(l<=n)return!0;const o=dt(1,bt((l-n+1)/t));for(let a=e[n],i=n+o;i<=l;i+=o){const c=e[i];if(c!=null){if(c<=a)return!1;a=c}}return!0}const Br=["January","February","March","April","May","June","July","August","September","October","November","December"],Hr=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function Wr(e){return e.slice(0,3)}const Ou=Hr.map(Wr),zu=Br.map(Wr),Ru={MMMM:Br,MMM:zu,WWWW:Hr,WWW:Ou};function wn(e){return(e<10?"0":"")+e}function Fu(e){return(e<10?"00":e<100?"0":"")+e}const Iu={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>wn(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>wn(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>wn(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>wn(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>wn(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Fu(e.getMilliseconds())};function ea(e,t){t=t||Ru;let s=[],n=/\{([a-z]+)\}|[^{]+/gi,l;for(;l=n.exec(e);)s.push(l[0][0]=="{"?Iu[l[1]]:l[0]);return o=>{let a="";for(let i=0;i<s.length;i++)a+=typeof s[i]=="string"?s[i]:s[i](o,t);return a}}const Nu=new Intl.DateTimeFormat().resolvedOptions().timeZone;function ju(e,t){let s;return t=="UTC"||t=="Etc/UTC"?s=new Date(+e+e.getTimezoneOffset()*6e4):t==Nu?s=e:(s=new Date(e.toLocaleString("en-US",{timeZone:t})),s.setMilliseconds(e.getMilliseconds())),s}const qr=e=>e%1==0,cl=[1,2,2.5,5],Bu=Dn(10,-32,0,cl),Vr=Dn(10,0,32,cl),Hu=Vr.filter(qr),ws=Bu.concat(Vr),ta=`
`,Ur="{YYYY}",ki=ta+Ur,Gr="{M}/{D}",Cn=ta+Gr,Vn=Cn+"/{YY}",Yr="{aa}",Wu="{h}:{mm}",en=Wu+Yr,wi=ta+en,Si=":{ss}",he=null;function Kr(e){let t=e*1e3,s=t*60,n=s*60,l=n*24,o=l*30,a=l*365,c=(e==1?Dn(10,0,3,cl).filter(qr):Dn(10,-3,0,cl)).concat([t,t*5,t*10,t*15,t*30,s,s*5,s*10,s*15,s*30,n,n*2,n*3,n*4,n*6,n*8,n*12,l,l*2,l*3,l*4,l*5,l*6,l*7,l*8,l*9,l*10,l*15,o,o*2,o*3,o*4,o*6,a,a*2,a*5,a*10,a*25,a*50,a*100]);const d=[[a,Ur,he,he,he,he,he,he,1],[l*28,"{MMM}",ki,he,he,he,he,he,1],[l,Gr,ki,he,he,he,he,he,1],[n,"{h}"+Yr,Vn,he,Cn,he,he,he,1],[s,en,Vn,he,Cn,he,he,he,1],[t,Si,Vn+" "+en,he,Cn+" "+en,he,wi,he,1],[e,Si+".{fff}",Vn+" "+en,he,Cn+" "+en,he,wi,he,1]];function v(u){return(m,g,x,E,S,y)=>{let $=[],k=S>=a,T=S>=o&&S<a,H=u(x),D=ke(H*e,3),O=ao(H.getFullYear(),k?0:H.getMonth(),T||k?1:H.getDate()),P=ke(O*e,3);if(T||k){let b=T?S/o:0,C=k?S/a:0,A=D==P?D:ke(ao(O.getFullYear()+C,O.getMonth()+b,1)*e,3),F=new Date(Ve(A/e)),I=F.getFullYear(),R=F.getMonth();for(let U=0;A<=E;U++){let te=ao(I+C*U,R+b*U,1),L=te-u(ke(te*e,3));A=ke((+te+L)*e,3),A<=E&&$.push(A)}}else{let b=S>=l?l:S,C=bt(x)-bt(D),A=P+C+yl(D-P,b);$.push(A);let F=u(A),I=F.getHours()+F.getMinutes()/s+F.getSeconds()/n,R=S/n,U=m.axes[g]._space,te=y/U;for(;A=ke(A+S,e==1?0:3),!(A>E);)if(R>1){let L=bt(ke(I+R,6))%24,j=u(A).getHours()-L;j>1&&(j=-1),A-=j*n,I=(I+R)%24;let ne=$[$.length-1];ke((A-ne)/S,3)*te>=.7&&$.push(A)}else $.push(A)}return $}}return[c,d,v]}const[qu,Vu,Uu]=Kr(1),[Gu,Yu,Ku]=Kr(.001);Dn(2,-53,53,[1]);function Ti(e,t){return e.map(s=>s.map((n,l)=>l==0||l==8||n==null?n:t(l==1||s[8]==0?n:s[1]+n)))}function Ci(e,t){return(s,n,l,o,a)=>{let i=t.find(x=>a>=x[0])||t[t.length-1],c,d,v,u,m,g;return n.map(x=>{let E=e(x),S=E.getFullYear(),y=E.getMonth(),$=E.getDate(),k=E.getHours(),T=E.getMinutes(),H=E.getSeconds(),D=S!=c&&i[2]||y!=d&&i[3]||$!=v&&i[4]||k!=u&&i[5]||T!=m&&i[6]||H!=g&&i[7]||i[1];return c=S,d=y,v=$,u=k,m=T,g=H,D(E)})}}function Ju(e,t){let s=ea(t);return(n,l,o,a,i)=>l.map(c=>s(e(c)))}function ao(e,t,s){return new Date(e,t,s)}function Mi(e,t){return t(e)}const Qu="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function Ei(e,t){return(s,n,l,o)=>o==null?Yo:t(e(n))}function Zu(e,t){let s=e.series[t];return s.width?s.stroke(e,t):s.points.width?s.points.stroke(e,t):null}function Xu(e,t){return e.series[t].fill(e,t)}const ep={show:!0,live:!0,isolate:!1,mount:$u,markers:{show:!0,width:2,stroke:Zu,fill:Xu,dash:"solid"},idx:null,idxs:null,values:[]};function tp(e,t){let s=e.cursor.points,n=Mt(),l=s.size(e,t);Me(n,Sn,l),Me(n,Tn,l);let o=l/-2;Me(n,"marginLeft",o),Me(n,"marginTop",o);let a=s.width(e,t,l);return a&&Me(n,"borderWidth",a),n}function sp(e,t){let s=e.series[t].points;return s._fill||s._stroke}function np(e,t){let s=e.series[t].points;return s._stroke||s._fill}function lp(e,t){return e.series[t].points.size}const io=[0,0];function op(e,t,s){return io[0]=t,io[1]=s,io}function Un(e,t,s,n=!0){return l=>{l.button==0&&(!n||l.target==t)&&s(l)}}function ro(e,t,s,n=!0){return l=>{(!n||l.target==t)&&s(l)}}const ap={show:!0,x:!0,y:!0,lock:!1,move:op,points:{one:!1,show:tp,size:lp,width:0,stroke:np,fill:sp},bind:{mousedown:Un,mouseup:Un,click:Un,dblclick:Un,mousemove:ro,mouseleave:ro,mouseenter:ro},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,s,n,l)=>n-l,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},Jr={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},sa=He({},Jr,{filter:Rr}),Qr=He({},sa,{size:10}),Zr=He({},Jr,{show:!1}),na='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',Xr="bold "+na,ec=1.5,Li={show:!0,scale:"x",stroke:Go,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Xr,side:2,grid:sa,ticks:Qr,border:Zr,font:na,lineGap:ec,rotate:0},ip="Value",rp="Time",Ai={show:!0,scale:"x",auto:!1,sorted:1,min:xe,max:-xe,idxs:[]};function cp(e,t,s,n,l){return t.map(o=>o==null?"":Zo(o))}function dp(e,t,s,n,l,o,a){let i=[],c=ps.get(l)||0;s=a?s:ke(yl(s,l),c);for(let d=s;d<=n;d=ke(d+l,c))i.push(Object.is(d,-0)?0:d);return i}function To(e,t,s,n,l,o,a){const i=[],c=e.scales[e.axes[t].scale].log,d=c==10?es:Pr,v=bt(d(s));l=rn(c,v),c==10&&(l=ws[Rt(l,ws)]);let u=s,m=l*c;c==10&&(m=ws[Rt(m,ws)]);do i.push(u),u=u+l,c==10&&!ps.has(u)&&(u=ke(u,ps.get(l))),u>=m&&(l=u,m=l*c,c==10&&(m=ws[Rt(m,ws)]));while(u<=n);return i}function up(e,t,s,n,l,o,a){let c=e.scales[e.axes[t].scale].asinh,d=n>c?To(e,t,dt(c,s),n,l):[c],v=n>=0&&s<=0?[0]:[];return(s<-c?To(e,t,dt(c,-n),-s,l):[c]).reverse().map(m=>-m).concat(v,d)}const tc=/./,pp=/[12357]/,fp=/[125]/,Di=/1/,Co=(e,t,s,n)=>e.map((l,o)=>t==4&&l==0||o%n==0&&s.test(l.toExponential()[l<0?1:0])?l:null);function vp(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=e.scales[a],c=e.valToPos,d=o._space,v=c(10,a),u=c(9,a)-v>=d?tc:c(7,a)-v>=d?pp:c(5,a)-v>=d?fp:Di;if(u==Di){let m=Ge(c(1,a)-v);if(m<d)return Co(t.slice().reverse(),i.distr,u,Et(d/m)).reverse()}return Co(t,i.distr,u,1)}function mp(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=o._space,c=e.valToPos,d=Ge(c(1,a)-c(2,a));return d<i?Co(t.slice().reverse(),3,tc,Et(i/d)).reverse():t}function hp(e,t,s,n){return n==null?Yo:t==null?"":Zo(t)}const Pi={show:!0,scale:"y",stroke:Go,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Xr,side:3,grid:sa,ticks:Qr,border:Zr,font:na,lineGap:ec,rotate:0};function gp(e,t){let s=3+(e||1)*2;return ke(s*t,3)}function _p(e,t){let{scale:s,idxs:n}=e.series[0],l=e._data[0],o=e.valToPos(l[n[0]],s,!0),a=e.valToPos(l[n[1]],s,!0),i=Ge(a-o),c=e.series[t],d=i/(c.points.space*me);return n[1]-n[0]<=d}const Oi={scale:null,auto:!0,sorted:0,min:xe,max:-xe},sc=(e,t,s,n,l)=>l,zi={show:!0,auto:!0,sorted:0,gaps:sc,alpha:1,facets:[He({},Oi,{scale:"x"}),He({},Oi,{scale:"y"})]},Ri={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:sc,alpha:1,points:{show:_p,filter:null},values:null,min:xe,max:-xe,idxs:[],path:null,clip:null};function $p(e,t,s,n,l){return s/10}const nc={time:qd,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},bp=He({},nc,{time:!1,ori:1}),Fi={};function lc(e,t){let s=Fi[e];return s||(s={key:e,plots:[],sub(n){s.plots.push(n)},unsub(n){s.plots=s.plots.filter(l=>l!=n)},pub(n,l,o,a,i,c,d){for(let v=0;v<s.plots.length;v++)s.plots[v]!=l&&s.plots[v].pub(n,l,o,a,i,c,d)}},e!=null&&(Fi[e]=s)),s}const un=1,Mo=2;function Es(e,t,s){const n=e.mode,l=e.series[t],o=n==2?e._data[t]:e._data,a=e.scales,i=e.bbox;let c=o[0],d=n==2?o[1]:o[t],v=n==2?a[l.facets[0].scale]:a[e.series[0].scale],u=n==2?a[l.facets[1].scale]:a[l.scale],m=i.left,g=i.top,x=i.width,E=i.height,S=e.valToPosH,y=e.valToPosV;return v.ori==0?s(l,c,d,v,u,S,y,m,g,x,E,wl,fn,Tl,ac,rc):s(l,c,d,v,u,y,S,g,m,E,x,Sl,vn,aa,ic,cc)}function la(e,t){let s=0,n=0,l=fe(e.bands,Xo);for(let o=0;o<l.length;o++){let a=l[o];a.series[0]==t?s=a.dir:a.series[1]==t&&(a.dir==1?n|=1:n|=2)}return[s,n==1?-1:n==2?1:n==3?2:0]}function yp(e,t,s,n,l){let o=e.mode,a=e.series[t],i=o==2?a.facets[1].scale:a.scale,c=e.scales[i];return l==-1?c.min:l==1?c.max:c.distr==3?c.dir==1?c.min:c.max:0}function ts(e,t,s,n,l,o){return Es(e,t,(a,i,c,d,v,u,m,g,x,E,S)=>{let y=a.pxRound;const $=d.dir*(d.ori==0?1:-1),k=d.ori==0?fn:vn;let T,H;$==1?(T=s,H=n):(T=n,H=s);let D=y(u(i[T],d,E,g)),O=y(m(c[T],v,S,x)),P=y(u(i[H],d,E,g)),b=y(m(o==1?v.max:v.min,v,S,x)),C=new Path2D(l);return k(C,P,b),k(C,D,b),k(C,D,O),C})}function kl(e,t,s,n,l,o){let a=null;if(e.length>0){a=new Path2D;const i=t==0?Tl:aa;let c=s;for(let u=0;u<e.length;u++){let m=e[u];if(m[1]>m[0]){let g=m[0]-c;g>0&&i(a,c,n,g,n+o),c=m[1]}}let d=s+l-c,v=10;d>0&&i(a,c,n-v/2,d,n+o+v)}return a}function xp(e,t,s){let n=e[e.length-1];n&&n[0]==t?n[1]=s:e.push([t,s])}function oa(e,t,s,n,l,o,a){let i=[],c=e.length;for(let d=l==1?s:n;d>=s&&d<=n;d+=l)if(t[d]===null){let u=d,m=d;if(l==1)for(;++d<=n&&t[d]===null;)m=d;else for(;--d>=s&&t[d]===null;)m=d;let g=o(e[u]),x=m==u?g:o(e[m]),E=u-l;g=a<=0&&E>=0&&E<c?o(e[E]):g;let y=m+l;x=a>=0&&y>=0&&y<c?o(e[y]):x,x>=g&&i.push([g,x])}return i}function Ii(e){return e==0?zr:e==1?Ve:t=>ks(t,e)}function oc(e){let t=e==0?wl:Sl,s=e==0?(l,o,a,i,c,d)=>{l.arcTo(o,a,i,c,d)}:(l,o,a,i,c,d)=>{l.arcTo(a,o,c,i,d)},n=e==0?(l,o,a,i,c)=>{l.rect(o,a,i,c)}:(l,o,a,i,c)=>{l.rect(a,o,c,i)};return(l,o,a,i,c,d=0,v=0)=>{d==0&&v==0?n(l,o,a,i,c):(d=Ft(d,i/2,c/2),v=Ft(v,i/2,c/2),t(l,o+d,a),s(l,o+i,a,o+i,a+c,d),s(l,o+i,a+c,o,a+c,v),s(l,o,a+c,o,a,v),s(l,o,a,o+i,a,d),l.closePath())}}const wl=(e,t,s)=>{e.moveTo(t,s)},Sl=(e,t,s)=>{e.moveTo(s,t)},fn=(e,t,s)=>{e.lineTo(t,s)},vn=(e,t,s)=>{e.lineTo(s,t)},Tl=oc(0),aa=oc(1),ac=(e,t,s,n,l,o)=>{e.arc(t,s,n,l,o)},ic=(e,t,s,n,l,o)=>{e.arc(s,t,n,l,o)},rc=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(t,s,n,l,o,a)},cc=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(s,t,l,n,a,o)};function dc(e){return(t,s,n,l,o)=>Es(t,s,(a,i,c,d,v,u,m,g,x,E,S)=>{let{pxRound:y,points:$}=a,k,T;d.ori==0?(k=wl,T=ac):(k=Sl,T=ic);const H=ke($.width*me,3);let D=($.size-$.width)/2*me,O=ke(D*2,3),P=new Path2D,b=new Path2D,{left:C,top:A,width:F,height:I}=t.bbox;Tl(b,C-O,A-O,F+O*2,I+O*2);const R=U=>{if(c[U]!=null){let te=y(u(i[U],d,E,g)),L=y(m(c[U],v,S,x));k(P,te+D,L),T(P,te,L,D,0,el*2)}};if(o)o.forEach(R);else for(let U=n;U<=l;U++)R(U);return{stroke:H>0?P:null,fill:P,clip:b,flags:un|Mo}})}function uc(e){return(t,s,n,l,o,a)=>{n!=l&&(o!=n&&a!=n&&e(t,s,n),o!=l&&a!=l&&e(t,s,l),e(t,s,a))}}const kp=uc(fn),wp=uc(vn);function pc(e){const t=fe(e==null?void 0:e.alignGaps,0);return(s,n,l,o)=>Es(s,n,(a,i,c,d,v,u,m,g,x,E,S)=>{[l,o]=$l(c,l,o);let y=a.pxRound,$=I=>y(u(I,d,E,g)),k=I=>y(m(I,v,S,x)),T,H;d.ori==0?(T=fn,H=kp):(T=vn,H=wp);const D=d.dir*(d.ori==0?1:-1),O={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:un},P=O.stroke;let b=!1;if(o-l>=E*4){let I=G=>s.posToVal(G,d.key,!0),R=null,U=null,te,L,B,Y=$(i[D==1?l:o]),j=$(i[l]),ne=$(i[o]),ee=I(D==1?j+1:ne-1);for(let G=D==1?l:o;G>=l&&G<=o;G+=D){let be=i[G],Ae=(D==1?be<ee:be>ee)?Y:$(be),ue=c[G];Ae==Y?ue!=null?(L=ue,R==null?(T(P,Ae,k(L)),te=R=U=L):L<R?R=L:L>U&&(U=L)):ue===null&&(b=!0):(R!=null&&H(P,Y,k(R),k(U),k(te),k(L)),ue!=null?(L=ue,T(P,Ae,k(L)),R=U=te=L):(R=U=null,ue===null&&(b=!0)),Y=Ae,ee=I(Y+D))}R!=null&&R!=U&&B!=Y&&H(P,Y,k(R),k(U),k(te),k(L))}else for(let I=D==1?l:o;I>=l&&I<=o;I+=D){let R=c[I];R===null?b=!0:R!=null&&T(P,$(i[I]),k(R))}let[A,F]=la(s,n);if(a.fill!=null||A!=0){let I=O.fill=new Path2D(P),R=a.fillTo(s,n,a.min,a.max,A),U=k(R),te=$(i[l]),L=$(i[o]);D==-1&&([L,te]=[te,L]),T(I,L,U),T(I,te,U)}if(!a.spanGaps){let I=[];b&&I.push(...oa(i,c,l,o,D,$,t)),O.gaps=I=a.gaps(s,n,l,o,I),O.clip=kl(I,d.ori,g,x,E,S)}return F!=0&&(O.band=F==2?[ts(s,n,l,o,P,-1),ts(s,n,l,o,P,1)]:ts(s,n,l,o,P,F)),O})}function Sp(e){const t=fe(e.align,1),s=fe(e.ascDesc,!1),n=fe(e.alignGaps,0),l=fe(e.extend,!1);return(o,a,i,c)=>Es(o,a,(d,v,u,m,g,x,E,S,y,$,k)=>{[i,c]=$l(u,i,c);let T=d.pxRound,{left:H,width:D}=o.bbox,O=j=>T(x(j,m,$,S)),P=j=>T(E(j,g,k,y)),b=m.ori==0?fn:vn;const C={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:un},A=C.stroke,F=m.dir*(m.ori==0?1:-1);let I=P(u[F==1?i:c]),R=O(v[F==1?i:c]),U=R,te=R;l&&t==-1&&(te=H,b(A,te,I)),b(A,R,I);for(let j=F==1?i:c;j>=i&&j<=c;j+=F){let ne=u[j];if(ne==null)continue;let ee=O(v[j]),G=P(ne);t==1?b(A,ee,I):b(A,U,G),b(A,ee,G),I=G,U=ee}let L=U;l&&t==1&&(L=H+D,b(A,L,I));let[B,Y]=la(o,a);if(d.fill!=null||B!=0){let j=C.fill=new Path2D(A),ne=d.fillTo(o,a,d.min,d.max,B),ee=P(ne);b(j,L,ee),b(j,te,ee)}if(!d.spanGaps){let j=[];j.push(...oa(v,u,i,c,F,O,n));let ne=d.width*me/2,ee=s||t==1?ne:-ne,G=s||t==-1?-ne:ne;j.forEach(be=>{be[0]+=ee,be[1]+=G}),C.gaps=j=d.gaps(o,a,i,c,j),C.clip=kl(j,m.ori,S,y,$,k)}return Y!=0&&(C.band=Y==2?[ts(o,a,i,c,A,-1),ts(o,a,i,c,A,1)]:ts(o,a,i,c,A,Y)),C})}function Ni(e,t,s,n,l,o,a=xe){if(e.length>1){let i=null;for(let c=0,d=1/0;c<e.length;c++)if(t[c]!==void 0){if(i!=null){let v=Ge(e[c]-e[i]);v<d&&(d=v,a=Ge(s(e[c],n,l,o)-s(e[i],n,l,o)))}i=c}}return a}function Tp(e){e=e||Ln;const t=fe(e.size,[.6,xe,1]),s=e.align||0,n=e.gap||0;let l=e.radius;l=l==null?[0,0]:typeof l=="number"?[l,0]:l;const o=de(l),a=1-t[0],i=fe(t[1],xe),c=fe(t[2],1),d=fe(e.disp,Ln),v=fe(e.each,g=>{}),{fill:u,stroke:m}=d;return(g,x,E,S)=>Es(g,x,(y,$,k,T,H,D,O,P,b,C,A)=>{let F=y.pxRound,I=s,R=n*me,U=i*me,te=c*me,L,B;T.ori==0?[L,B]=o(g,x):[B,L]=o(g,x);const Y=T.dir*(T.ori==0?1:-1);let j=T.ori==0?Tl:aa,ne=T.ori==0?v:(Z,we,qe,Ps,ms,Bt,hs)=>{v(Z,we,qe,ms,Ps,hs,Bt)},ee=fe(g.bands,Xo).find(Z=>Z.series[0]==x),G=ee!=null?ee.dir:0,be=y.fillTo(g,x,y.min,y.max,G),Pe=F(O(be,H,A,b)),Ae,ue,Lt,vt=C,Oe=F(y.width*me),jt=!1,Kt=null,xt=null,ss=null,Ls=null;u!=null&&(Oe==0||m!=null)&&(jt=!0,Kt=u.values(g,x,E,S),xt=new Map,new Set(Kt).forEach(Z=>{Z!=null&&xt.set(Z,new Path2D)}),Oe>0&&(ss=m.values(g,x,E,S),Ls=new Map,new Set(ss).forEach(Z=>{Z!=null&&Ls.set(Z,new Path2D)})));let{x0:As,size:mn}=d;if(As!=null&&mn!=null){I=1,$=As.values(g,x,E,S),As.unit==2&&($=$.map(qe=>g.posToVal(P+qe*C,T.key,!0)));let Z=mn.values(g,x,E,S);mn.unit==2?ue=Z[0]*C:ue=D(Z[0],T,C,P)-D(0,T,C,P),vt=Ni($,k,D,T,C,P,vt),Lt=vt-ue+R}else vt=Ni($,k,D,T,C,P,vt),Lt=vt*a+R,ue=vt-Lt;Lt<1&&(Lt=0),Oe>=ue/2&&(Oe=0),Lt<5&&(F=zr);let Pn=Lt>0,fs=vt-Lt-(Pn?Oe:0);ue=F(So(fs,te,U)),Ae=(I==0?ue/2:I==Y?0:ue)-I*Y*((I==0?R/2:0)+(Pn?Oe/2:0));const at={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},Ds=jt?null:new Path2D;let Jt=null;if(ee!=null)Jt=g.data[ee.series[1]];else{let{y0:Z,y1:we}=d;Z!=null&&we!=null&&(k=we.values(g,x,E,S),Jt=Z.values(g,x,E,S))}let vs=L*ue,ie=B*ue;for(let Z=Y==1?E:S;Z>=E&&Z<=S;Z+=Y){let we=k[Z];if(we==null)continue;if(Jt!=null){let ut=Jt[Z]??0;if(we-ut==0)continue;Pe=O(ut,H,A,b)}let qe=T.distr!=2||d!=null?$[Z]:Z,Ps=D(qe,T,C,P),ms=O(fe(we,be),H,A,b),Bt=F(Ps-Ae),hs=F(dt(ms,Pe)),mt=F(Ft(ms,Pe)),kt=hs-mt;if(we!=null){let ut=we<0?ie:vs,At=we<0?vs:ie;jt?(Oe>0&&ss[Z]!=null&&j(Ls.get(ss[Z]),Bt,mt+bt(Oe/2),ue,dt(0,kt-Oe),ut,At),Kt[Z]!=null&&j(xt.get(Kt[Z]),Bt,mt+bt(Oe/2),ue,dt(0,kt-Oe),ut,At)):j(Ds,Bt,mt+bt(Oe/2),ue,dt(0,kt-Oe),ut,At),ne(g,x,Z,Bt-Oe/2,mt,ue+Oe,kt)}}return Oe>0?at.stroke=jt?Ls:Ds:jt||(at._fill=y.width==0?y._fill:y._stroke??y._fill,at.width=0),at.fill=jt?xt:Ds,at})}function Cp(e,t){const s=fe(t==null?void 0:t.alignGaps,0);return(n,l,o,a)=>Es(n,l,(i,c,d,v,u,m,g,x,E,S,y)=>{[o,a]=$l(d,o,a);let $=i.pxRound,k=L=>$(m(L,v,S,x)),T=L=>$(g(L,u,y,E)),H,D,O;v.ori==0?(H=wl,O=fn,D=rc):(H=Sl,O=vn,D=cc);const P=v.dir*(v.ori==0?1:-1);let b=k(c[P==1?o:a]),C=b,A=[],F=[];for(let L=P==1?o:a;L>=o&&L<=a;L+=P)if(d[L]!=null){let Y=c[L],j=k(Y);A.push(C=j),F.push(T(d[L]))}const I={stroke:e(A,F,H,O,D,$),fill:null,clip:null,band:null,gaps:null,flags:un},R=I.stroke;let[U,te]=la(n,l);if(i.fill!=null||U!=0){let L=I.fill=new Path2D(R),B=i.fillTo(n,l,i.min,i.max,U),Y=T(B);O(L,C,Y),O(L,b,Y)}if(!i.spanGaps){let L=[];L.push(...oa(c,d,o,a,P,k,s)),I.gaps=L=i.gaps(n,l,o,a,L),I.clip=kl(L,v.ori,x,E,S,y)}return te!=0&&(I.band=te==2?[ts(n,l,o,a,R,-1),ts(n,l,o,a,R,1)]:ts(n,l,o,a,R,te)),I})}function Mp(e){return Cp(Ep,e)}function Ep(e,t,s,n,l,o){const a=e.length;if(a<2)return null;const i=new Path2D;if(s(i,e[0],t[0]),a==2)n(i,e[1],t[1]);else{let c=Array(a),d=Array(a-1),v=Array(a-1),u=Array(a-1);for(let m=0;m<a-1;m++)v[m]=t[m+1]-t[m],u[m]=e[m+1]-e[m],d[m]=v[m]/u[m];c[0]=d[0];for(let m=1;m<a-1;m++)d[m]===0||d[m-1]===0||d[m-1]>0!=d[m]>0?c[m]=0:(c[m]=3*(u[m-1]+u[m])/((2*u[m]+u[m-1])/d[m-1]+(u[m]+2*u[m-1])/d[m]),isFinite(c[m])||(c[m]=0));c[a-1]=d[a-2];for(let m=0;m<a-1;m++)l(i,e[m]+u[m]/3,t[m]+c[m]*u[m]/3,e[m+1]-u[m]/3,t[m+1]-c[m+1]*u[m]/3,e[m+1],t[m+1])}return i}const Eo=new Set;function ji(){for(let e of Eo)e.syncRect(!0)}pn&&(Ts(cu,ln,ji),Ts(du,ln,ji,!0),Ts(il,ln,()=>{lt.pxRatio=me}));const Lp=pc(),Ap=dc();function Bi(e,t,s,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,a)=>Lo(o,a,t,s))}function Dp(e,t){return e.map((s,n)=>n==0?{}:He({},t,s))}function Lo(e,t,s,n){return He({},t==0?s:n,e)}function fc(e,t,s){return t==null?cn:[t,s]}const Pp=fc;function Op(e,t,s){return t==null?cn:rl(t,s,Qo,!0)}function vc(e,t,s,n){return t==null?cn:bl(t,s,e.scales[n].log,!1)}const zp=vc;function mc(e,t,s,n){return t==null?cn:Jo(t,s,e.scales[n].log,!1)}const Rp=mc;function Fp(e,t,s,n,l){let o=dt($i(e),$i(t)),a=t-e,i=Rt(l/n*a,s);do{let c=s[i],d=n*c/a;if(d>=l&&o+(c<5?ps.get(c):0)<=17)return[c,d]}while(++i<s.length);return[0,0]}function Hi(e){let t,s;return e=e.replace(/(\d+)px/,(n,l)=>(t=Ve((s=+l)*me))+"px"),[e,t,s]}function Ip(e){e.show&&[e.font,e.labelFont].forEach(t=>{let s=ke(t[2]*me,1);t[0]=t[0].replace(/[0-9.]+px/,s+"px"),t[1]=s})}function lt(e,t,s){const n={mode:fe(e.mode,1)},l=n.mode;function o(p,f,h,_){let w=f.valToPct(p);return _+h*(f.dir==-1?1-w:w)}function a(p,f,h,_){let w=f.valToPct(p);return _+h*(f.dir==-1?w:1-w)}function i(p,f,h,_){return f.ori==0?o(p,f,h,_):a(p,f,h,_)}n.valToPosH=o,n.valToPosV=a;let c=!1;n.status=0;const d=n.root=Mt(Vd);if(e.id!=null&&(d.id=e.id),$t(d,e.class),e.title){let p=Mt(Yd,d);p.textContent=e.title}const v=zt("canvas"),u=n.ctx=v.getContext("2d"),m=Mt(Kd,d);Ts("click",m,p=>{p.target===x&&(Se!=qs||De!=Vs)&&st.click(n,p)},!0);const g=n.under=Mt(Jd,m);m.appendChild(v);const x=n.over=Mt(Qd,m);e=dn(e);const E=+fe(e.pxAlign,1),S=Ii(E);(e.plugins||[]).forEach(p=>{p.opts&&(e=p.opts(n,e)||e)});const y=e.ms||.001,$=n.series=l==1?Bi(e.series||[],Ai,Ri,!1):Dp(e.series||[null],zi),k=n.axes=Bi(e.axes||[],Li,Pi,!0),T=n.scales={},H=n.bands=e.bands||[];H.forEach(p=>{p.fill=de(p.fill||null),p.dir=fe(p.dir,-1)});const D=l==2?$[1].facets[0].scale:$[0].scale,O={axes:jc,series:zc},P=(e.drawOrder||["axes","series"]).map(p=>O[p]);function b(p){const f=p.distr==3?h=>es(h>0?h:p.clamp(n,h,p.min,p.max,p.key)):p.distr==4?h=>oo(h,p.asinh):p.distr==100?h=>p.fwd(h):h=>h;return h=>{let _=f(h),{_min:w,_max:M}=p,N=M-w;return(_-w)/N}}function C(p){let f=T[p];if(f==null){let h=(e.scales||Ln)[p]||Ln;if(h.from!=null){C(h.from);let _=He({},T[h.from],h,{key:p});_.valToPct=b(_),T[p]=_}else{f=T[p]=He({},p==D?nc:bp,h),f.key=p;let _=f.time,w=f.range,M=cs(w);if((p!=D||l==2&&!_)&&(M&&(w[0]==null||w[1]==null)&&(w={min:w[0]==null?hi:{mode:1,hard:w[0],soft:w[0]},max:w[1]==null?hi:{mode:1,hard:w[1],soft:w[1]}},M=!1),!M&&xl(w))){let N=w;w=(W,V,J)=>V==null?cn:rl(V,J,N)}f.range=de(w||(_?Pp:p==D?f.distr==3?zp:f.distr==4?Rp:fc:f.distr==3?vc:f.distr==4?mc:Op)),f.auto=de(M?!1:f.auto),f.clamp=de(f.clamp||$p),f._min=f._max=null,f.valToPct=b(f)}}}C("x"),C("y"),l==1&&$.forEach(p=>{C(p.scale)}),k.forEach(p=>{C(p.scale)});for(let p in e.scales)C(p);const A=T[D],F=A.distr;let I,R;A.ori==0?($t(d,Ud),I=o,R=a):($t(d,Gd),I=a,R=o);const U={};for(let p in T){let f=T[p];(f.min!=null||f.max!=null)&&(U[p]={min:f.min,max:f.max},f.min=f.max=null)}const te=e.tzDate||(p=>new Date(Ve(p/y))),L=e.fmtDate||ea,B=y==1?Uu(te):Ku(te),Y=Ci(te,Ti(y==1?Vu:Yu,L)),j=Ei(te,Mi(Qu,L)),ne=[],ee=n.legend=He({},ep,e.legend),G=n.cursor=He({},ap,{drag:{y:l==2}},e.cursor),be=ee.show,Pe=G.show,Ae=ee.markers;ee.idxs=ne,Ae.width=de(Ae.width),Ae.dash=de(Ae.dash),Ae.stroke=de(Ae.stroke),Ae.fill=de(Ae.fill);let ue,Lt,vt,Oe=[],jt=[],Kt,xt=!1,ss={};if(ee.live){const p=$[1]?$[1].values:null;xt=p!=null,Kt=xt?p(n,1,0):{_:0};for(let f in Kt)ss[f]=Yo}if(be)if(ue=zt("table",nu,d),vt=zt("tbody",null,ue),ee.mount(n,ue),xt){Lt=zt("thead",null,ue,vt);let p=zt("tr",null,Lt);zt("th",null,p);for(var Ls in Kt)zt("th",ni,p).textContent=Ls}else $t(ue,ou),ee.live&&$t(ue,lu);const As={show:!0},mn={show:!1};function Pn(p,f){if(f==0&&(xt||!ee.live||l==2))return cn;let h=[],_=zt("tr",au,vt,vt.childNodes[f]);$t(_,p.class),p.show||$t(_,Ss);let w=zt("th",null,_);if(Ae.show){let W=Mt(iu,w);if(f>0){let V=Ae.width(n,f);V&&(W.style.border=V+"px "+Ae.dash(n,f)+" "+Ae.stroke(n,f)),W.style.background=Ae.fill(n,f)}}let M=Mt(ni,w);p.label instanceof HTMLElement?M.appendChild(p.label):M.textContent=p.label,f>0&&(Ae.show||(M.style.color=p.width>0?Ae.stroke(n,f):Ae.fill(n,f)),at("click",w,W=>{if(G._lock)return;_s(W);let V=$.indexOf(p);if((W.ctrlKey||W.metaKey)!=ee.isolate){let J=$.some((Q,X)=>X>0&&X!=V&&Q.show);$.forEach((Q,X)=>{X>0&&Wt(X,J?X==V?As:mn:As,!0,je.setSeries)})}else Wt(V,{show:!p.show},!0,je.setSeries)},!1),zs&&at(ii,w,W=>{G._lock||(_s(W),Wt($.indexOf(p),Gs,!0,je.setSeries))},!1));for(var N in Kt){let W=zt("td",ru,_);W.textContent="--",h.push(W)}return[_,h]}const fs=new Map;function at(p,f,h,_=!0){const w=fs.get(f)||{},M=G.bind[p](n,f,h,_);M&&(Ts(p,f,w[p]=M),fs.set(f,w))}function Ds(p,f,h){const _=fs.get(f)||{};for(let w in _)(p==null||w==p)&&(wo(w,f,_[w]),delete _[w]);p==null&&fs.delete(f)}let Jt=0,vs=0,ie=0,Z=0,we=0,qe=0,Ps=we,ms=qe,Bt=ie,hs=Z,mt=0,kt=0,ut=0,At=0;n.bbox={};let Ml=!1,On=!1,Os=!1,gs=!1,zn=!1,wt=!1;function El(p,f,h){(h||p!=n.width||f!=n.height)&&ca(p,f),js(!1),Os=!0,On=!0,Bs()}function ca(p,f){n.width=Jt=ie=p,n.height=vs=Z=f,we=qe=0,Mc(),Ec();let h=n.bbox;mt=h.left=ks(we*me,.5),kt=h.top=ks(qe*me,.5),ut=h.width=ks(ie*me,.5),At=h.height=ks(Z*me,.5)}const Sc=3;function Tc(){let p=!1,f=0;for(;!p;){f++;let h=Ic(f),_=Nc(f);p=f==Sc||h&&_,p||(ca(n.width,n.height),On=!0)}}function Cc({width:p,height:f}){El(p,f)}n.setSize=Cc;function Mc(){let p=!1,f=!1,h=!1,_=!1;k.forEach((w,M)=>{if(w.show&&w._show){let{side:N,_size:W}=w,V=N%2,J=w.label!=null?w.labelSize:0,Q=W+J;Q>0&&(V?(ie-=Q,N==3?(we+=Q,_=!0):h=!0):(Z-=Q,N==0?(qe+=Q,p=!0):f=!0))}}),$s[0]=p,$s[1]=h,$s[2]=f,$s[3]=_,ie-=ns[1]+ns[3],we+=ns[3],Z-=ns[2]+ns[0],qe+=ns[0]}function Ec(){let p=we+ie,f=qe+Z,h=we,_=qe;function w(M,N){switch(M){case 1:return p+=N,p-N;case 2:return f+=N,f-N;case 3:return h-=N,h+N;case 0:return _-=N,_+N}}k.forEach((M,N)=>{if(M.show&&M._show){let W=M.side;M._pos=w(W,M._size),M.label!=null&&(M._lpos=w(W,M.labelSize))}})}if(G.dataIdx==null){let p=G.hover,f=p.skip=new Set(p.skip??[]);f.add(void 0);let h=p.prox=de(p.prox),_=p.bias??(p.bias=0);G.dataIdx=(w,M,N,W)=>{if(M==0)return N;let V=N,J=h(w,M,N,W)??xe,Q=J>=0&&J<xe,X=A.ori==0?ie:Z,oe=G.left,ve=t[0],pe=t[M];if(f.has(pe[N])){V=null;let ce=null,le=null,se;if(_==0||_==-1)for(se=N;ce==null&&se-- >0;)f.has(pe[se])||(ce=se);if(_==0||_==1)for(se=N;le==null&&se++<pe.length;)f.has(pe[se])||(le=se);if(ce!=null||le!=null)if(Q){let Ce=ce==null?-1/0:I(ve[ce],A,X,0),Re=le==null?1/0:I(ve[le],A,X,0),et=oe-Ce,$e=Re-oe;et<=$e?et<=J&&(V=ce):$e<=J&&(V=le)}else V=le==null?ce:ce==null?le:N-ce<=le-N?ce:le}else Q&&Ge(oe-I(ve[N],A,X,0))>J&&(V=null);return V}}const _s=p=>{G.event=p};G.idxs=ne,G._lock=!1;let ot=G.points;ot.show=de(ot.show),ot.size=de(ot.size),ot.stroke=de(ot.stroke),ot.width=de(ot.width),ot.fill=de(ot.fill);const Ht=n.focus=He({},e.focus||{alpha:.3},G.focus),zs=Ht.prox>=0,Rs=zs&&ot.one;let St=[],Fs=[],Is=[];function da(p,f){let h=ot.show(n,f);if(h instanceof HTMLElement)return $t(h,su),$t(h,p.class),Gt(h,-10,-10,ie,Z),x.insertBefore(h,St[f]),h}function ua(p,f){if(l==1||f>0){let h=l==1&&T[p.scale].time,_=p.value;p.value=h?xi(_)?Ei(te,Mi(_,L)):_||j:_||hp,p.label=p.label||(h?rp:ip)}if(Rs||f>0){p.width=p.width==null?1:p.width,p.paths=p.paths||Lp||bu,p.fillTo=de(p.fillTo||yp),p.pxAlign=+fe(p.pxAlign,E),p.pxRound=Ii(p.pxAlign),p.stroke=de(p.stroke||null),p.fill=de(p.fill||null),p._stroke=p._fill=p._paths=p._focus=null;let h=gp(dt(1,p.width),1),_=p.points=He({},{size:h,width:dt(1,h*.2),stroke:p.stroke,space:h*2,paths:Ap,_stroke:null,_fill:null},p.points);_.show=de(_.show),_.filter=de(_.filter),_.fill=de(_.fill),_.stroke=de(_.stroke),_.paths=de(_.paths),_.pxAlign=p.pxAlign}if(be){let h=Pn(p,f);Oe.splice(f,0,h[0]),jt.splice(f,0,h[1]),ee.values.push(null)}if(Pe){ne.splice(f,0,null);let h=null;Rs?f==0&&(h=da(p,f)):f>0&&(h=da(p,f)),St.splice(f,0,h),Fs.splice(f,0,0),Is.splice(f,0,0)}Xe("addSeries",f)}function Lc(p,f){f=f??$.length,p=l==1?Lo(p,f,Ai,Ri):Lo(p,f,{},zi),$.splice(f,0,p),ua($[f],f)}n.addSeries=Lc;function Ac(p){if($.splice(p,1),be){ee.values.splice(p,1),jt.splice(p,1);let f=Oe.splice(p,1)[0];Ds(null,f.firstChild),f.remove()}Pe&&(ne.splice(p,1),St.splice(p,1)[0].remove(),Fs.splice(p,1),Is.splice(p,1)),Xe("delSeries",p)}n.delSeries=Ac;const $s=[!1,!1,!1,!1];function Dc(p,f){if(p._show=p.show,p.show){let h=p.side%2,_=T[p.scale];_==null&&(p.scale=h?$[1].scale:D,_=T[p.scale]);let w=_.time;p.size=de(p.size),p.space=de(p.space),p.rotate=de(p.rotate),cs(p.incrs)&&p.incrs.forEach(N=>{!ps.has(N)&&ps.set(N,Ir(N))}),p.incrs=de(p.incrs||(_.distr==2?Hu:w?y==1?qu:Gu:ws)),p.splits=de(p.splits||(w&&_.distr==1?B:_.distr==3?To:_.distr==4?up:dp)),p.stroke=de(p.stroke),p.grid.stroke=de(p.grid.stroke),p.ticks.stroke=de(p.ticks.stroke),p.border.stroke=de(p.border.stroke);let M=p.values;p.values=cs(M)&&!cs(M[0])?de(M):w?cs(M)?Ci(te,Ti(M,L)):xi(M)?Ju(te,M):M||Y:M||cp,p.filter=de(p.filter||(_.distr>=3&&_.log==10?vp:_.distr==3&&_.log==2?mp:Rr)),p.font=Hi(p.font),p.labelFont=Hi(p.labelFont),p._size=p.size(n,null,f,0),p._space=p._rotate=p._incrs=p._found=p._splits=p._values=null,p._size>0&&($s[f]=!0,p._el=Mt(Zd,m))}}function hn(p,f,h,_){let[w,M,N,W]=h,V=f%2,J=0;return V==0&&(W||M)&&(J=f==0&&!w||f==2&&!N?Ve(Li.size/3):0),V==1&&(w||N)&&(J=f==1&&!M||f==3&&!W?Ve(Pi.size/2):0),J}const pa=n.padding=(e.padding||[hn,hn,hn,hn]).map(p=>de(fe(p,hn))),ns=n._padding=pa.map((p,f)=>p(n,f,$s,0));let tt,Ke=null,Je=null;const Rn=l==1?$[0].idxs:null;let Dt=null,gn=!1;function fa(p,f){if(t=p??[],n.data=n._data=t,l==2){tt=0;for(let h=1;h<$.length;h++)tt+=t[h][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),Dt=t[0],tt=Dt.length;let h=t;if(F==2){h=t.slice();let _=h[0]=Array(tt);for(let w=0;w<tt;w++)_[w]=w}n._data=t=h}if(js(!0),Xe("setData"),F==2&&(Os=!0),f!==!1){let h=A;h.auto(n,gn)?Ll():os(D,h.min,h.max),gs=gs||G.left>=0,wt=!0,Bs()}}n.setData=fa;function Ll(){gn=!0;let p,f;l==1&&(tt>0?(Ke=Rn[0]=0,Je=Rn[1]=tt-1,p=t[0][Ke],f=t[0][Je],F==2?(p=Ke,f=Je):p==f&&(F==3?[p,f]=bl(p,p,A.log,!1):F==4?[p,f]=Jo(p,p,A.log,!1):A.time?f=p+Ve(86400/y):[p,f]=rl(p,f,Qo,!0))):(Ke=Rn[0]=p=null,Je=Rn[1]=f=null)),os(D,p,f)}let Fn,Ns,Al,Dl,Pl,Ol,zl,Rl,Fl,pt;function va(p,f,h,_,w,M){p??(p=oi),h??(h=Xo),_??(_="butt"),w??(w=oi),M??(M="round"),p!=Fn&&(u.strokeStyle=Fn=p),w!=Ns&&(u.fillStyle=Ns=w),f!=Al&&(u.lineWidth=Al=f),M!=Pl&&(u.lineJoin=Pl=M),_!=Ol&&(u.lineCap=Ol=_),h!=Dl&&u.setLineDash(Dl=h)}function ma(p,f,h,_){f!=Ns&&(u.fillStyle=Ns=f),p!=zl&&(u.font=zl=p),h!=Rl&&(u.textAlign=Rl=h),_!=Fl&&(u.textBaseline=Fl=_)}function Il(p,f,h,_,w=0){if(_.length>0&&p.auto(n,gn)&&(f==null||f.min==null)){let M=fe(Ke,0),N=fe(Je,_.length-1),W=h.min==null?vu(_,M,N,w,p.distr==3):[h.min,h.max];p.min=Ft(p.min,h.min=W[0]),p.max=dt(p.max,h.max=W[1])}}const ha={min:null,max:null};function Pc(){for(let _ in T){let w=T[_];U[_]==null&&(w.min==null||U[D]!=null&&w.auto(n,gn))&&(U[_]=ha)}for(let _ in T){let w=T[_];U[_]==null&&w.from!=null&&U[w.from]!=null&&(U[_]=ha)}U[D]!=null&&js(!0);let p={};for(let _ in U){let w=U[_];if(w!=null){let M=p[_]=dn(T[_],ku);if(w.min!=null)He(M,w);else if(_!=D||l==2)if(tt==0&&M.from==null){let N=M.range(n,null,null,_);M.min=N[0],M.max=N[1]}else M.min=xe,M.max=-xe}}if(tt>0){$.forEach((_,w)=>{if(l==1){let M=_.scale,N=U[M];if(N==null)return;let W=p[M];if(w==0){let V=W.range(n,W.min,W.max,M);W.min=V[0],W.max=V[1],Ke=Rt(W.min,t[0]),Je=Rt(W.max,t[0]),Je-Ke>1&&(t[0][Ke]<W.min&&Ke++,t[0][Je]>W.max&&Je--),_.min=Dt[Ke],_.max=Dt[Je]}else _.show&&_.auto&&Il(W,N,_,t[w],_.sorted);_.idxs[0]=Ke,_.idxs[1]=Je}else if(w>0&&_.show&&_.auto){let[M,N]=_.facets,W=M.scale,V=N.scale,[J,Q]=t[w],X=p[W],oe=p[V];X!=null&&Il(X,U[W],M,J,M.sorted),oe!=null&&Il(oe,U[V],N,Q,N.sorted),_.min=N.min,_.max=N.max}});for(let _ in p){let w=p[_],M=U[_];if(w.from==null&&(M==null||M.min==null)){let N=w.range(n,w.min==xe?null:w.min,w.max==-xe?null:w.max,_);w.min=N[0],w.max=N[1]}}}for(let _ in p){let w=p[_];if(w.from!=null){let M=p[w.from];if(M.min==null)w.min=w.max=null;else{let N=w.range(n,M.min,M.max,_);w.min=N[0],w.max=N[1]}}}let f={},h=!1;for(let _ in p){let w=p[_],M=T[_];if(M.min!=w.min||M.max!=w.max){M.min=w.min,M.max=w.max;let N=M.distr;M._min=N==3?es(M.min):N==4?oo(M.min,M.asinh):N==100?M.fwd(M.min):M.min,M._max=N==3?es(M.max):N==4?oo(M.max,M.asinh):N==100?M.fwd(M.max):M.max,f[_]=h=!0}}if(h){$.forEach((_,w)=>{l==2?w>0&&f.y&&(_._paths=null):f[_.scale]&&(_._paths=null)});for(let _ in f)Os=!0,Xe("setScale",_);Pe&&G.left>=0&&(gs=wt=!0)}for(let _ in U)U[_]=null}function Oc(p){let f=So(Ke-1,0,tt-1),h=So(Je+1,0,tt-1);for(;p[f]==null&&f>0;)f--;for(;p[h]==null&&h<tt-1;)h++;return[f,h]}function zc(){if(tt>0){let p=$.some(f=>f._focus)&&pt!=Ht.alpha;p&&(u.globalAlpha=pt=Ht.alpha),$.forEach((f,h)=>{if(h>0&&f.show&&(ga(h,!1),ga(h,!0),f._paths==null)){let _=pt;pt!=f.alpha&&(u.globalAlpha=pt=f.alpha);let w=l==2?[0,t[h][0].length-1]:Oc(t[h]);f._paths=f.paths(n,h,w[0],w[1]),pt!=_&&(u.globalAlpha=pt=_)}}),$.forEach((f,h)=>{if(h>0&&f.show){let _=pt;pt!=f.alpha&&(u.globalAlpha=pt=f.alpha),f._paths!=null&&_a(h,!1);{let w=f._paths!=null?f._paths.gaps:null,M=f.points.show(n,h,Ke,Je,w),N=f.points.filter(n,h,M,w);(M||N)&&(f.points._paths=f.points.paths(n,h,Ke,Je,N),_a(h,!0))}pt!=_&&(u.globalAlpha=pt=_),Xe("drawSeries",h)}}),p&&(u.globalAlpha=pt=1)}}function ga(p,f){let h=f?$[p].points:$[p];h._stroke=h.stroke(n,p),h._fill=h.fill(n,p)}function _a(p,f){let h=f?$[p].points:$[p],{stroke:_,fill:w,clip:M,flags:N,_stroke:W=h._stroke,_fill:V=h._fill,_width:J=h.width}=h._paths;J=ke(J*me,3);let Q=null,X=J%2/2;f&&V==null&&(V=J>0?"#fff":W);let oe=h.pxAlign==1&&X>0;if(oe&&u.translate(X,X),!f){let ve=mt-J/2,pe=kt-J/2,ce=ut+J,le=At+J;Q=new Path2D,Q.rect(ve,pe,ce,le)}f?Nl(W,J,h.dash,h.cap,V,_,w,N,M):Rc(p,W,J,h.dash,h.cap,V,_,w,N,Q,M),oe&&u.translate(-X,-X)}function Rc(p,f,h,_,w,M,N,W,V,J,Q){let X=!1;V!=0&&H.forEach((oe,ve)=>{if(oe.series[0]==p){let pe=$[oe.series[1]],ce=t[oe.series[1]],le=(pe._paths||Ln).band;cs(le)&&(le=oe.dir==1?le[0]:le[1]);let se,Ce=null;pe.show&&le&&hu(ce,Ke,Je)?(Ce=oe.fill(n,ve)||M,se=pe._paths.clip):le=null,Nl(f,h,_,w,Ce,N,W,V,J,Q,se,le),X=!0}}),X||Nl(f,h,_,w,M,N,W,V,J,Q)}const $a=un|Mo;function Nl(p,f,h,_,w,M,N,W,V,J,Q,X){va(p,f,h,_,w),(V||J||X)&&(u.save(),V&&u.clip(V),J&&u.clip(J)),X?(W&$a)==$a?(u.clip(X),Q&&u.clip(Q),Nn(w,N),In(p,M,f)):W&Mo?(Nn(w,N),u.clip(X),In(p,M,f)):W&un&&(u.save(),u.clip(X),Q&&u.clip(Q),Nn(w,N),u.restore(),In(p,M,f)):(Nn(w,N),In(p,M,f)),(V||J||X)&&u.restore()}function In(p,f,h){h>0&&(f instanceof Map?f.forEach((_,w)=>{u.strokeStyle=Fn=w,u.stroke(_)}):f!=null&&p&&u.stroke(f))}function Nn(p,f){f instanceof Map?f.forEach((h,_)=>{u.fillStyle=Ns=_,u.fill(h)}):f!=null&&p&&u.fill(f)}function Fc(p,f,h,_){let w=k[p],M;if(_<=0)M=[0,0];else{let N=w._space=w.space(n,p,f,h,_),W=w._incrs=w.incrs(n,p,f,h,_,N);M=Fp(f,h,W,_,N)}return w._found=M}function jl(p,f,h,_,w,M,N,W,V,J){let Q=N%2/2;E==1&&u.translate(Q,Q),va(W,N,V,J,W),u.beginPath();let X,oe,ve,pe,ce=w+(_==0||_==3?-M:M);h==0?(oe=w,pe=ce):(X=w,ve=ce);for(let le=0;le<p.length;le++)f[le]!=null&&(h==0?X=ve=p[le]:oe=pe=p[le],u.moveTo(X,oe),u.lineTo(ve,pe));u.stroke(),E==1&&u.translate(-Q,-Q)}function Ic(p){let f=!0;return k.forEach((h,_)=>{if(!h.show)return;let w=T[h.scale];if(w.min==null){h._show&&(f=!1,h._show=!1,js(!1));return}else h._show||(f=!1,h._show=!0,js(!1));let M=h.side,N=M%2,{min:W,max:V}=w,[J,Q]=Fc(_,W,V,N==0?ie:Z);if(Q==0)return;let X=w.distr==2,oe=h._splits=h.splits(n,_,W,V,J,Q,X),ve=w.distr==2?oe.map(se=>Dt[se]):oe,pe=w.distr==2?Dt[oe[1]]-Dt[oe[0]]:J,ce=h._values=h.values(n,h.filter(n,ve,_,Q,pe),_,Q,pe);h._rotate=M==2?h.rotate(n,ce,_,Q):0;let le=h._size;h._size=Et(h.size(n,ce,_,p)),le!=null&&h._size!=le&&(f=!1)}),f}function Nc(p){let f=!0;return pa.forEach((h,_)=>{let w=h(n,_,$s,p);w!=ns[_]&&(f=!1),ns[_]=w}),f}function jc(){for(let p=0;p<k.length;p++){let f=k[p];if(!f.show||!f._show)continue;let h=f.side,_=h%2,w,M,N=f.stroke(n,p),W=h==0||h==3?-1:1,[V,J]=f._found;if(f.label!=null){let rt=f.labelGap*W,_t=Ve((f._lpos+rt)*me);ma(f.labelFont[0],N,"center",h==2?kn:li),u.save(),_==1?(w=M=0,u.translate(_t,Ve(kt+At/2)),u.rotate((h==3?-el:el)/2)):(w=Ve(mt+ut/2),M=_t);let xs=Or(f.label)?f.label(n,p,V,J):f.label;u.fillText(xs,w,M),u.restore()}if(J==0)continue;let Q=T[f.scale],X=_==0?ut:At,oe=_==0?mt:kt,ve=f._splits,pe=Q.distr==2?ve.map(rt=>Dt[rt]):ve,ce=Q.distr==2?Dt[ve[1]]-Dt[ve[0]]:V,le=f.ticks,se=f.border,Ce=le.show?le.size:0,Re=Ve(Ce*me),et=Ve((f.alignTo==2?f._size-Ce-f.gap:f.gap)*me),$e=f._rotate*-el/180,Fe=S(f._pos*me),ht=(Re+et)*W,it=Fe+ht;M=_==0?it:0,w=_==1?it:0;let Tt=f.font[0],Pt=f.align==1?Js:f.align==2?so:$e>0?Js:$e<0?so:_==0?"center":h==3?so:Js,Vt=$e||_==1?"middle":h==2?kn:li;ma(Tt,N,Pt,Vt);let gt=f.font[1]*f.lineGap,Ct=ve.map(rt=>S(i(rt,Q,X,oe))),Ot=f._values;for(let rt=0;rt<Ot.length;rt++){let _t=Ot[rt];if(_t!=null){_==0?w=Ct[rt]:M=Ct[rt],_t=""+_t;let xs=_t.indexOf(`
`)==-1?[_t]:_t.split(/\n/gm);for(let ct=0;ct<xs.length;ct++){let Ia=xs[ct];$e?(u.save(),u.translate(w,M+ct*gt),u.rotate($e),u.fillText(Ia,0,0),u.restore()):u.fillText(Ia,w,M+ct*gt)}}}le.show&&jl(Ct,le.filter(n,pe,p,J,ce),_,h,Fe,Re,ke(le.width*me,3),le.stroke(n,p),le.dash,le.cap);let Ut=f.grid;Ut.show&&jl(Ct,Ut.filter(n,pe,p,J,ce),_,_==0?2:1,_==0?kt:mt,_==0?At:ut,ke(Ut.width*me,3),Ut.stroke(n,p),Ut.dash,Ut.cap),se.show&&jl([Fe],[1],_==0?1:0,_==0?1:2,_==1?kt:mt,_==1?At:ut,ke(se.width*me,3),se.stroke(n,p),se.dash,se.cap)}Xe("drawAxes")}function js(p){$.forEach((f,h)=>{h>0&&(f._paths=null,p&&(l==1?(f.min=null,f.max=null):f.facets.forEach(_=>{_.min=null,_.max=null})))})}let jn=!1,Bl=!1,_n=[];function Bc(){Bl=!1;for(let p=0;p<_n.length;p++)Xe(..._n[p]);_n.length=0}function Bs(){jn||(Lu(ba),jn=!0)}function Hc(p,f=!1){jn=!0,Bl=f,p(n),ba(),f&&_n.length>0&&queueMicrotask(Bc)}n.batch=Hc;function ba(){if(Ml&&(Pc(),Ml=!1),Os&&(Tc(),Os=!1),On){if(Me(g,Js,we),Me(g,kn,qe),Me(g,Sn,ie),Me(g,Tn,Z),Me(x,Js,we),Me(x,kn,qe),Me(x,Sn,ie),Me(x,Tn,Z),Me(m,Sn,Jt),Me(m,Tn,vs),v.width=Ve(Jt*me),v.height=Ve(vs*me),k.forEach(({_el:p,_show:f,_size:h,_pos:_,side:w})=>{if(p!=null)if(f){let M=w===3||w===0?h:0,N=w%2==1;Me(p,N?"left":"top",_-M),Me(p,N?"width":"height",h),Me(p,N?"top":"left",N?qe:we),Me(p,N?"height":"width",N?Z:ie),ko(p,Ss)}else $t(p,Ss)}),Fn=Ns=Al=Pl=Ol=zl=Rl=Fl=Dl=null,pt=1,yn(!0),we!=Ps||qe!=ms||ie!=Bt||Z!=hs){js(!1);let p=ie/Bt,f=Z/hs;if(Pe&&!gs&&G.left>=0){G.left*=p,G.top*=f,Hs&&Gt(Hs,Ve(G.left),0,ie,Z),Ws&&Gt(Ws,0,Ve(G.top),ie,Z);for(let h=0;h<St.length;h++){let _=St[h];_!=null&&(Fs[h]*=p,Is[h]*=f,Gt(_,Et(Fs[h]),Et(Is[h]),ie,Z))}}if(Te.show&&!zn&&Te.left>=0&&Te.width>0){Te.left*=p,Te.width*=p,Te.top*=f,Te.height*=f;for(let h in Gl)Me(Us,h,Te[h])}Ps=we,ms=qe,Bt=ie,hs=Z}Xe("setSize"),On=!1}Jt>0&&vs>0&&(u.clearRect(0,0,v.width,v.height),Xe("drawClear"),P.forEach(p=>p()),Xe("draw")),Te.show&&zn&&(Bn(Te),zn=!1),Pe&&gs&&(ys(null,!0,!1),gs=!1),ee.show&&ee.live&&wt&&(Vl(),wt=!1),c||(c=!0,n.status=1,Xe("ready")),gn=!1,jn=!1}n.redraw=(p,f)=>{Os=f||!1,p!==!1?os(D,A.min,A.max):Bs()};function Hl(p,f){let h=T[p];if(h.from==null){if(tt==0){let _=h.range(n,f.min,f.max,p);f.min=_[0],f.max=_[1]}if(f.min>f.max){let _=f.min;f.min=f.max,f.max=_}if(tt>1&&f.min!=null&&f.max!=null&&f.max-f.min<1e-16)return;p==D&&h.distr==2&&tt>0&&(f.min=Rt(f.min,t[0]),f.max=Rt(f.max,t[0]),f.min==f.max&&f.max++),U[p]=f,Ml=!0,Bs()}}n.setScale=Hl;let Wl,ql,Hs,Ws,ya,xa,qs,Vs,ka,wa,Se,De,ls=!1;const st=G.drag;let Qe=st.x,Ze=st.y;Pe&&(G.x&&(Wl=Mt(eu,x)),G.y&&(ql=Mt(tu,x)),A.ori==0?(Hs=Wl,Ws=ql):(Hs=ql,Ws=Wl),Se=G.left,De=G.top);const Te=n.select=He({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Us=Te.show?Mt(Xd,Te.over?x:g):null;function Bn(p,f){if(Te.show){for(let h in p)Te[h]=p[h],h in Gl&&Me(Us,h,p[h]);f!==!1&&Xe("setSelect")}}n.setSelect=Bn;function Wc(p){if($[p].show)be&&ko(Oe[p],Ss);else if(be&&$t(Oe[p],Ss),Pe){let h=Rs?St[0]:St[p];h!=null&&Gt(h,-10,-10,ie,Z)}}function os(p,f,h){Hl(p,{min:f,max:h})}function Wt(p,f,h,_){f.focus!=null&&Yc(p),f.show!=null&&$.forEach((w,M)=>{M>0&&(p==M||p==null)&&(w.show=f.show,Wc(M),l==2?(os(w.facets[0].scale,null,null),os(w.facets[1].scale,null,null)):os(w.scale,null,null),Bs())}),h!==!1&&Xe("setSeries",p,f),_&&xn("setSeries",n,p,f)}n.setSeries=Wt;function qc(p,f){He(H[p],f)}function Vc(p,f){p.fill=de(p.fill||null),p.dir=fe(p.dir,-1),f=f??H.length,H.splice(f,0,p)}function Uc(p){p==null?H.length=0:H.splice(p,1)}n.addBand=Vc,n.setBand=qc,n.delBand=Uc;function Gc(p,f){$[p].alpha=f,Pe&&St[p]!=null&&(St[p].style.opacity=f),be&&Oe[p]&&(Oe[p].style.opacity=f)}let Qt,as,bs;const Gs={focus:!0};function Yc(p){if(p!=bs){let f=p==null,h=Ht.alpha!=1;$.forEach((_,w)=>{if(l==1||w>0){let M=f||w==0||w==p;_._focus=f?null:M,h&&Gc(w,M?1:Ht.alpha)}}),bs=p,h&&Bs()}}be&&zs&&at(ri,ue,p=>{G._lock||(_s(p),bs!=null&&Wt(null,Gs,!0,je.setSeries))});function qt(p,f,h){let _=T[f];h&&(p=p/me-(_.ori==1?qe:we));let w=ie;_.ori==1&&(w=Z,p=w-p),_.dir==-1&&(p=w-p);let M=_._min,N=_._max,W=p/w,V=M+(N-M)*W,J=_.distr;return J==3?rn(10,V):J==4?_u(V,_.asinh):J==100?_.bwd(V):V}function Kc(p,f){let h=qt(p,D,f);return Rt(h,t[0],Ke,Je)}n.valToIdx=p=>Rt(p,t[0]),n.posToIdx=Kc,n.posToVal=qt,n.valToPos=(p,f,h)=>T[f].ori==0?o(p,T[f],h?ut:ie,h?mt:0):a(p,T[f],h?At:Z,h?kt:0),n.setCursor=(p,f,h)=>{Se=p.left,De=p.top,ys(null,f,h)};function Sa(p,f){Me(Us,Js,Te.left=p),Me(Us,Sn,Te.width=f)}function Ta(p,f){Me(Us,kn,Te.top=p),Me(Us,Tn,Te.height=f)}let $n=A.ori==0?Sa:Ta,bn=A.ori==1?Sa:Ta;function Jc(){if(be&&ee.live)for(let p=l==2?1:0;p<$.length;p++){if(p==0&&xt)continue;let f=ee.values[p],h=0;for(let _ in f)jt[p][h++].firstChild.nodeValue=f[_]}}function Vl(p,f){if(p!=null&&(p.idxs?p.idxs.forEach((h,_)=>{ne[_]=h}):xu(p.idx)||ne.fill(p.idx),ee.idx=ne[0]),be&&ee.live){for(let h=0;h<$.length;h++)(h>0||l==1&&!xt)&&Qc(h,ne[h]);Jc()}wt=!1,f!==!1&&Xe("setLegend")}n.setLegend=Vl;function Qc(p,f){let h=$[p],_=p==0&&F==2?Dt:t[p],w;xt?w=h.values(n,p,f)??ss:(w=h.value(n,f==null?null:_[f],p,f),w=w==null?ss:{_:w}),ee.values[p]=w}function ys(p,f,h){ka=Se,wa=De,[Se,De]=G.move(n,Se,De),G.left=Se,G.top=De,Pe&&(Hs&&Gt(Hs,Ve(Se),0,ie,Z),Ws&&Gt(Ws,0,Ve(De),ie,Z));let _,w=Ke>Je;Qt=xe,as=null;let M=A.ori==0?ie:Z,N=A.ori==1?ie:Z;if(Se<0||tt==0||w){_=G.idx=null;for(let W=0;W<$.length;W++){let V=St[W];V!=null&&Gt(V,-10,-10,ie,Z)}zs&&Wt(null,Gs,!0,p==null&&je.setSeries),ee.live&&(ne.fill(_),wt=!0)}else{let W,V,J;l==1&&(W=A.ori==0?Se:De,V=qt(W,D),_=G.idx=Rt(V,t[0],Ke,Je),J=I(t[0][_],A,M,0));let Q=-10,X=-10,oe=0,ve=0,pe=!0,ce="",le="";for(let se=l==2?1:0;se<$.length;se++){let Ce=$[se],Re=ne[se],et=Re==null?null:l==1?t[se][Re]:t[se][1][Re],$e=G.dataIdx(n,se,_,V),Fe=$e==null?null:l==1?t[se][$e]:t[se][1][$e];if(wt=wt||Fe!=et||$e!=Re,ne[se]=$e,se>0&&Ce.show){let ht=$e==null?-10:$e==_?J:I(l==1?t[0][$e]:t[se][0][$e],A,M,0),it=Fe==null?-10:R(Fe,l==1?T[Ce.scale]:T[Ce.facets[1].scale],N,0);if(zs&&Fe!=null){let Tt=A.ori==1?Se:De,Pt=Ge(Ht.dist(n,se,$e,it,Tt));if(Pt<Qt){let Vt=Ht.bias;if(Vt!=0){let gt=qt(Tt,Ce.scale),Ct=Fe>=0?1:-1,Ot=gt>=0?1:-1;Ot==Ct&&(Ot==1?Vt==1?Fe>=gt:Fe<=gt:Vt==1?Fe<=gt:Fe>=gt)&&(Qt=Pt,as=se)}else Qt=Pt,as=se}}if(wt||Rs){let Tt,Pt;A.ori==0?(Tt=ht,Pt=it):(Tt=it,Pt=ht);let Vt,gt,Ct,Ot,Ut,rt,_t=!0,xs=ot.bbox;if(xs!=null){_t=!1;let ct=xs(n,se);Ct=ct.left,Ot=ct.top,Vt=ct.width,gt=ct.height}else Ct=Tt,Ot=Pt,Vt=gt=ot.size(n,se);if(rt=ot.fill(n,se),Ut=ot.stroke(n,se),Rs)se==as&&Qt<=Ht.prox&&(Q=Ct,X=Ot,oe=Vt,ve=gt,pe=_t,ce=rt,le=Ut);else{let ct=St[se];ct!=null&&(Fs[se]=Ct,Is[se]=Ot,mi(ct,Vt,gt,_t),fi(ct,rt,Ut),Gt(ct,Et(Ct),Et(Ot),ie,Z))}}}}if(Rs){let se=Ht.prox,Ce=bs==null?Qt<=se:Qt>se||as!=bs;if(wt||Ce){let Re=St[0];Re!=null&&(Fs[0]=Q,Is[0]=X,mi(Re,oe,ve,pe),fi(Re,ce,le),Gt(Re,Et(Q),Et(X),ie,Z))}}}if(Te.show&&ls)if(p!=null){let[W,V]=je.scales,[J,Q]=je.match,[X,oe]=p.cursor.sync.scales,ve=p.cursor.drag;if(Qe=ve._x,Ze=ve._y,Qe||Ze){let{left:pe,top:ce,width:le,height:se}=p.select,Ce=p.scales[X].ori,Re=p.posToVal,et,$e,Fe,ht,it,Tt=W!=null&&J(W,X),Pt=V!=null&&Q(V,oe);Tt&&Qe?(Ce==0?(et=pe,$e=le):(et=ce,$e=se),Fe=T[W],ht=I(Re(et,X),Fe,M,0),it=I(Re(et+$e,X),Fe,M,0),$n(Ft(ht,it),Ge(it-ht))):$n(0,M),Pt&&Ze?(Ce==1?(et=pe,$e=le):(et=ce,$e=se),Fe=T[V],ht=R(Re(et,oe),Fe,N,0),it=R(Re(et+$e,oe),Fe,N,0),bn(Ft(ht,it),Ge(it-ht))):bn(0,N)}else Yl()}else{let W=Ge(ka-ya),V=Ge(wa-xa);if(A.ori==1){let oe=W;W=V,V=oe}Qe=st.x&&W>=st.dist,Ze=st.y&&V>=st.dist;let J=st.uni;J!=null?Qe&&Ze&&(Qe=W>=J,Ze=V>=J,!Qe&&!Ze&&(V>W?Ze=!0:Qe=!0)):st.x&&st.y&&(Qe||Ze)&&(Qe=Ze=!0);let Q,X;Qe&&(A.ori==0?(Q=qs,X=Se):(Q=Vs,X=De),$n(Ft(Q,X),Ge(X-Q)),Ze||bn(0,N)),Ze&&(A.ori==1?(Q=qs,X=Se):(Q=Vs,X=De),bn(Ft(Q,X),Ge(X-Q)),Qe||$n(0,M)),!Qe&&!Ze&&($n(0,0),bn(0,0))}if(st._x=Qe,st._y=Ze,p==null){if(h){if(Fa!=null){let[W,V]=je.scales;je.values[0]=W!=null?qt(A.ori==0?Se:De,W):null,je.values[1]=V!=null?qt(A.ori==1?Se:De,V):null}xn(no,n,Se,De,ie,Z,_)}if(zs){let W=h&&je.setSeries,V=Ht.prox;bs==null?Qt<=V&&Wt(as,Gs,!0,W):Qt>V?Wt(null,Gs,!0,W):as!=bs&&Wt(as,Gs,!0,W)}}wt&&(ee.idx=_,Vl()),f!==!1&&Xe("setCursor")}let is=null;Object.defineProperty(n,"rect",{get(){return is==null&&yn(!1),is}});function yn(p=!1){p?is=null:(is=x.getBoundingClientRect(),Xe("syncRect",is))}function Ca(p,f,h,_,w,M,N){G._lock||ls&&p!=null&&p.movementX==0&&p.movementY==0||(Ul(p,f,h,_,w,M,N,!1,p!=null),p!=null?ys(null,!0,!0):ys(f,!0,!1))}function Ul(p,f,h,_,w,M,N,W,V){if(is==null&&yn(!1),_s(p),p!=null)h=p.clientX-is.left,_=p.clientY-is.top;else{if(h<0||_<0){Se=-10,De=-10;return}let[J,Q]=je.scales,X=f.cursor.sync,[oe,ve]=X.values,[pe,ce]=X.scales,[le,se]=je.match,Ce=f.axes[0].side%2==1,Re=A.ori==0?ie:Z,et=A.ori==1?ie:Z,$e=Ce?M:w,Fe=Ce?w:M,ht=Ce?_:h,it=Ce?h:_;if(pe!=null?h=le(J,pe)?i(oe,T[J],Re,0):-10:h=Re*(ht/$e),ce!=null?_=se(Q,ce)?i(ve,T[Q],et,0):-10:_=et*(it/Fe),A.ori==1){let Tt=h;h=_,_=Tt}}V&&(f==null||f.cursor.event.type==no)&&((h<=1||h>=ie-1)&&(h=ks(h,ie)),(_<=1||_>=Z-1)&&(_=ks(_,Z))),W?(ya=h,xa=_,[qs,Vs]=G.move(n,h,_)):(Se=h,De=_)}const Gl={width:0,height:0,left:0,top:0};function Yl(){Bn(Gl,!1)}let Ma,Ea,La,Aa;function Da(p,f,h,_,w,M,N){ls=!0,Qe=Ze=st._x=st._y=!1,Ul(p,f,h,_,w,M,N,!0,!1),p!=null&&(at(lo,yo,Pa,!1),xn(ai,n,qs,Vs,ie,Z,null));let{left:W,top:V,width:J,height:Q}=Te;Ma=W,Ea=V,La=J,Aa=Q}function Pa(p,f,h,_,w,M,N){ls=st._x=st._y=!1,Ul(p,f,h,_,w,M,N,!1,!0);let{left:W,top:V,width:J,height:Q}=Te,X=J>0||Q>0,oe=Ma!=W||Ea!=V||La!=J||Aa!=Q;if(X&&oe&&Bn(Te),st.setScale&&X&&oe){let ve=W,pe=J,ce=V,le=Q;if(A.ori==1&&(ve=V,pe=Q,ce=W,le=J),Qe&&os(D,qt(ve,D),qt(ve+pe,D)),Ze)for(let se in T){let Ce=T[se];se!=D&&Ce.from==null&&Ce.min!=xe&&os(se,qt(ce+le,se),qt(ce,se))}Yl()}else G.lock&&(G._lock=!G._lock,ys(f,!0,p!=null));p!=null&&(Ds(lo,yo),xn(lo,n,Se,De,ie,Z,null))}function Zc(p,f,h,_,w,M,N){if(G._lock)return;_s(p);let W=ls;if(ls){let V=!0,J=!0,Q=10,X,oe;A.ori==0?(X=Qe,oe=Ze):(X=Ze,oe=Qe),X&&oe&&(V=Se<=Q||Se>=ie-Q,J=De<=Q||De>=Z-Q),X&&V&&(Se=Se<qs?0:ie),oe&&J&&(De=De<Vs?0:Z),ys(null,!0,!0),ls=!1}Se=-10,De=-10,ne.fill(null),ys(null,!0,!0),W&&(ls=W)}function Oa(p,f,h,_,w,M,N){G._lock||(_s(p),Ll(),Yl(),p!=null&&xn(ci,n,Se,De,ie,Z,null))}function za(){k.forEach(Ip),El(n.width,n.height,!0)}Ts(il,ln,za);const Ys={};Ys.mousedown=Da,Ys.mousemove=Ca,Ys.mouseup=Pa,Ys.dblclick=Oa,Ys.setSeries=(p,f,h,_)=>{let w=je.match[2];h=w(n,f,h),h!=-1&&Wt(h,_,!0,!1)},Pe&&(at(ai,x,Da),at(no,x,Ca),at(ii,x,p=>{_s(p),yn(!1)}),at(ri,x,Zc),at(ci,x,Oa),Eo.add(n),n.syncRect=yn);const Hn=n.hooks=e.hooks||{};function Xe(p,f,h){Bl?_n.push([p,f,h]):p in Hn&&Hn[p].forEach(_=>{_.call(null,n,f,h)})}(e.plugins||[]).forEach(p=>{for(let f in p.hooks)Hn[f]=(Hn[f]||[]).concat(p.hooks[f])});const Ra=(p,f,h)=>h,je=He({key:null,setSeries:!1,filters:{pub:bi,sub:bi},scales:[D,$[1]?$[1].scale:null],match:[yi,yi,Ra],values:[null,null]},G.sync);je.match.length==2&&je.match.push(Ra),G.sync=je;const Fa=je.key,Kl=lc(Fa);function xn(p,f,h,_,w,M,N){je.filters.pub(p,f,h,_,w,M,N)&&Kl.pub(p,f,h,_,w,M,N)}Kl.sub(n);function Xc(p,f,h,_,w,M,N){je.filters.sub(p,f,h,_,w,M,N)&&Ys[p](null,f,h,_,w,M,N)}n.pub=Xc;function ed(){Kl.unsub(n),Eo.delete(n),fs.clear(),wo(il,ln,za),d.remove(),ue==null||ue.remove(),Xe("destroy")}n.destroy=ed;function Jl(){Xe("init",e,t),fa(t||e.data,!1),U[D]?Hl(D,U[D]):Ll(),zn=Te.show&&(Te.width>0||Te.height>0),gs=wt=!0,El(e.width,e.height)}return $.forEach(ua),k.forEach(Dc),s?s instanceof HTMLElement?(s.appendChild(d),Jl()):s(n,Jl):Jl(),n}lt.assign=He;lt.fmtNum=Zo;lt.rangeNum=rl;lt.rangeLog=bl;lt.rangeAsinh=Jo;lt.orient=Es;lt.pxRatio=me;lt.join=Eu;lt.fmtDate=ea,lt.tzDate=ju;lt.sync=lc;{lt.addGap=xp,lt.clipGaps=kl;let e=lt.paths={points:dc};e.linear=pc,e.stepped=Sp,e.bars=Tp,e.spline=Mp}function Np(e){let t;return{hooks:{init(s){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",s.over.appendChild(t)},setCursor(s){const n=s.cursor.idx;if(n==null||!s.data[1]||s.data[1][n]==null){t.style.display="none";return}const l=s.data[0][n],o=s.data[1][n],a=new Date(l*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):z(o)}</b> ${a}`;const i=Math.round(s.valToPos(l,"x"));t.style.left=Math.min(i,s.over.clientWidth-80)+"px",t.style.display=""}}}}function jp(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function hc({data:e,color:t,smooth:s,height:n,yMax:l,fmtVal:o}){const a=nt(null),i=nt(null),c=n||55;return ae(()=>{if(!a.current||!e||e[0].length<2)return;const d=s?jd(e[1]):e[1],v=[e[0],d];if(i.current){i.current.setData(v);return}const u=l?(g,x,E)=>[0,Math.max(l,E*1.05)]:(g,x,E)=>[Math.max(0,x*.9),E*1.1],m={width:a.current.clientWidth||200,height:c,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:u}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:t,width:1.5,fill:jp(t,.09)}],plugins:[Np(o)]};return i.current=new lt(m,v,a.current),()=>{i.current&&(i.current.destroy(),i.current=null)}},[e,t,s]),ae(()=>{if(!i.current||!a.current)return;const d=new ResizeObserver(()=>{i.current&&a.current&&i.current.setSize({width:a.current.clientWidth,height:c})});return d.observe(a.current),()=>d.disconnect()},[]),r`<div class="chart-wrap" role="img" aria-label="Sparkline chart" style=${"height:"+c+"px"} ref=${a}></div>`}function Xt({label:e,value:t,valColor:s,data:n,chartColor:l,smooth:o,refLines:a,yMax:i,dp:c}){const d=re(()=>{if(!n||!n[1]||n[1].length<2)return[];const v=i?Math.max(i,n[1].reduce((u,m)=>Math.max(u,m),0)*1.05):n[1].reduce((u,m)=>Math.max(u,m),0)*1.1;return(a||[]).map(u=>{if(v<=0)return null;const m=(1-u.value/v)*100;return m>=0&&m<=95?{...u,pct:m}:null}).filter(Boolean)},[n,a,i]);return r`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${c?{"data-dp":c}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${e}</span>
      <span class="chart-val" style=${"color:"+(s||l||"var(--accent)")} aria-live="polite" aria-atomic="true">${t}</span>
    </div>
    <div style="position:relative">
      ${d.map(v=>r`<Fragment>
          <div class="chart-ref-line" style=${"top:"+v.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+v.pct+"% - 8px)"}>${v.label}</div>
        </Fragment>`)}
      ${n&&n[0].length>=2?r`<${hc} data=${n} color=${l||"var(--accent)"} smooth=${o} yMax=${i}/>`:r`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem">collecting...</div>`}
    </div>
  </div>`}function Ao({label:e,value:t,accent:s,dp:n,sm:l}){const o=nt(t),[a,i]=q(!1);return ae(()=>{o.current!==t&&(i(!0),setTimeout(()=>i(!1),500)),o.current=t},[t]),r`<div class=${"metric"+(l?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(s?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
  </div>`}function Wi({snap:e,mode:t}){if(!e)return null;const s=!t||t==="files",n=!t||t==="traffic",l=e.tools.filter(c=>c.tool!=="aictl"&&c.files.length),o=l.reduce((c,d)=>c+d.files.length,0)||1,a=e.tools.filter(c=>c.tool!=="aictl"&&c.live&&(c.live.outbound_rate_bps||c.live.inbound_rate_bps)),i=a.reduce((c,d)=>c+(d.live.outbound_rate_bps||0)+(d.live.inbound_rate_bps||0),0)||1;return r`
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
          title="${c.label}: ${It(d)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(c=>{const d=(c.live.outbound_rate_bps||0)+(c.live.inbound_rate_bps||0);return r`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Le[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${It(d)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!l.length&&!a.length&&r`<div class="empty-state">No AI tool resources found yet.</div>`}`}function Bp({path:e,onClose:t}){const{snap:s}=We(Ie),[n,l]=q(null),[o,a]=q(!1),[i,c]=q(null),d=nt(null),v=nt(null),[u,m]=q(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),g=nt(!1),x=nt(0),E=nt(0),S=ye(D=>{g.current=!0,x.current=D.clientX,E.current=u,D.preventDefault()},[u]);if(ae(()=>{const D=P=>{if(!g.current)return;const b=x.current-P.clientX,C=window.innerWidth,A=Math.min(90,Math.max(20,E.current+b/C*100));m(A)},O=()=>{if(g.current){g.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(u)))}catch{}}};return window.addEventListener("mousemove",D),window.addEventListener("mouseup",O),()=>{window.removeEventListener("mousemove",D),window.removeEventListener("mouseup",O)}},[u]),ae(()=>{if(!e)return;v.current=document.activeElement;const D=setTimeout(()=>{var b;const P=(b=d.current)==null?void 0:b.querySelector("button");P&&P.focus()},50),O=P=>{if(P.key!=="Tab"||!d.current)return;const b=d.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!b.length)return;const C=b[0],A=b[b.length-1];P.shiftKey&&document.activeElement===C?(P.preventDefault(),A.focus()):!P.shiftKey&&document.activeElement===A&&(P.preventDefault(),C.focus())};return document.addEventListener("keydown",O),()=>{clearTimeout(D),document.removeEventListener("keydown",O),v.current&&v.current.focus&&v.current.focus()}},[e]),ae(()=>{e&&(a(!1),c(null),Uo(e).then(l).catch(D=>c(D.message)))},[e]),!e)return null;const y=re(()=>{if(!s)return"";for(const D of s.tools)for(const O of D.files)if(O.path===e)return(O.kind||"")+" | "+ge(O.size)+" | ~"+z(O.tokens)+"tok | scope:"+(O.scope||"?")+" | sent_to_llm:"+(O.sent_to_llm||"?")+" | loaded:"+(O.loaded_when||"?");for(const D of s.agent_memory)if(D.file===e)return D.source+" | "+D.profile+" | "+D.tokens+"tok | "+D.lines+"ln";return""},[s,e]),$=n?n.split(`
`):[],k=$.length,T=k>Ks*2,H=(D,O)=>D.map((P,b)=>r`<div class="fv-line"><span class="fv-ln">${O+b}</span><span class="fv-code">${K(P)||" "}</span></div>`);return r`<div class="fv" ref=${d} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+u+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${S}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      <button onClick=${t} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${y}</div>
    <div class="fv-body">
      ${i?r`<p class="text-red" style="padding:var(--sp-10)">${i}</p>`:n?!T||o?r`<div class="fv-lines">${H($,1)}</div>`:r`<div class="fv-lines">${H($.slice(0,Ks),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>a(!0)}>\u25BC ${k-Ks*2} more lines \u25BC</div>
            <div class="fv-lines">${H($.slice(-Ks),k-Ks+1)}</div>`:r`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${k} lines${T&&!o?" (showing "+Ks*2+" of "+k+")":""}</span>
      ${T&&r`<button onClick=${()=>a(!o)}>${o?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function Do({file:e,dirPrefix:t}){var D;const[s,n]=q(!1),[l,o]=q(!1),[a,i]=q(null),[c,d]=q(null),[v,u]=q(!1),m=We(Ie),g=(e.path||"").replace(/\\/g,"/").split("/").pop(),x=(e.sent_to_llm||"").toLowerCase(),E=e.mtime&&Date.now()/1e3-e.mtime<300,S=(D=m.recentFiles)==null?void 0:D.get(e.path),y=!!S,$=ye(async()=>{if(s){n(!1);return}n(!0),u(!0),d(null);try{const O=await Uo(e.path);i(O)}catch(O){d(O.message)}finally{u(!1)}},[s,e.path]),k=(O,P)=>O.map((b,C)=>r`<span class="pline"><span class="ln">${P+C}</span>${K(b)||" "}</span>`),T=()=>{if(v)return r`<span class="text-muted">loading...</span>`;if(c)return r`<span class="text-red">${c}</span>`;if(!a)return null;const O=a.split(`
`),P=O.length;if(P<=nn*3||l)return r`${k(O,1)}
        <div class="prev-actions">
          ${l&&r`<button class="prev-btn" onClick=${()=>o(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
        </div>`;const C=O.slice(-nn),A=P-nn+1;return r`${k(C,A)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>o(!0)}>show all (${P} lines)</button>
        <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
      </div>`},H=e.size>0?Math.round(e.size/60):0;return r`<div>
    <button class="fitem" onClick=${$} aria-expanded=${s} title=${e.path}>
      ${y?r`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Nt(S.ts)}${S.growth>0?" +"+ge(S.growth):""}">●</span>`:E?r`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Nt(e.mtime)}">●</span>`:r`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${t?r`<span class="text-muted">${t}/</span>`:""}${K(g)}</span>
      <span class="fmeta">
        ${x&&x!=="no"&&r`<span style="color:${Er(x)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${x}">${x==="yes"?"◆":x==="on-demand"?"◇":"○"}</span>`}
        ${ge(e.size)}${H?r` <span class="text-muted">${H}ln</span>`:""}${e.tokens?r` <span class="text-muted">${z(e.tokens)}t</span>`:""}
        ${e.mtime&&E?r` <span class="text-orange text-xs">${Nt(e.mtime)}</span>`:""}
      </span>
    </button>
    ${s&&r`<div class="inline-preview">${T()}</div>`}
  </div>`}function Hp({dir:e,files:t}){const[s,n]=q(!1),l=t.reduce((a,i)=>a+i.tokens,0),o=t.reduce((a,i)=>a+i.size,0);return r`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-muted" title=${e}>${K(e)}</span>
      <span class="badge">${t.length}</span>
      <span class="badge">${ge(o)}</span>
      <span class="badge">${z(l)}t</span>
    </button>
    ${s&&r`<div style=${{paddingLeft:"var(--sp-8)"}}>${t.map(a=>r`<${Do} key=${a.path} file=${a}/>`)}</div>`}
  </div>`}function Wp({label:e,files:t,root:s,badge:n,style:l,startOpen:o}){const[a,i]=q(!!o),c=re(()=>Nd(t,s),[t,s]),d=re(()=>t.reduce((g,x)=>g+x.tokens,0),[t]),v=re(()=>t.reduce((g,x)=>g+x.size,0),[t]),u=re(()=>{var x;const g={};return t.forEach(E=>{const S=(E.sent_to_llm||"no").toLowerCase();g[S]=(g[S]||0)+1}),((x=Object.entries(g).sort((E,S)=>S[1]-E[1])[0])==null?void 0:x[0])||"no"},[t]),m=()=>c.length===1&&c[0][1].length<=3?c[0][1].map(g=>r`<${Do} key=${g.path} file=${g}/>`):c.map(([g,x])=>x.length===1?r`<div style=${{marginLeft:"var(--sp-5)"}}><${Do} key=${x[0].path} file=${x[0]} dirPrefix=${g}/></div>`:r`<${Hp} key=${g} dir=${g} files=${x}/>`);return r`<div class="cat-group" style=${l||""}>
    <button class=${"cat-head"+(a?" open":"")} onClick=${()=>i(!a)} aria-expanded=${a}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${Er(u)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${u}"></span>
      <span class="cat-label" title=${e}>${K(e)}</span>
      <span class="badge" style="flex-shrink:0">${n||t.length}</span>
      <span class="badge">${ge(v)}</span>
      <span class="badge">${z(d)}t</span>
    </button>
    ${a&&r`<div style=${{paddingLeft:"var(--sp-8)"}}>${m()}</div>`}
  </div>`}function co({label:e,data:t,color:s}){const n=nt(null);return ae(()=>{const l=n.current;if(!l||!t||t.length<2)return;const o=l.getContext("2d"),a=l.width=l.offsetWidth*(window.devicePixelRatio||1),i=l.height=l.offsetHeight*(window.devicePixelRatio||1);o.clearRect(0,0,a,i);const c=t.slice(-60),d=Math.max(...c)*1.1||1,v=a/(c.length-1);o.beginPath(),o.strokeStyle=s,o.lineWidth=1.5*(window.devicePixelRatio||1),c.forEach((u,m)=>{const g=m*v,x=i-u/d*i*.85;m===0?o.moveTo(g,x):o.lineTo(g,x)}),o.stroke()},[t,s]),r`<div style="position:relative;height:25px">
    <span class="text-muted" style="position:absolute;top:0;left:0;font-size:var(--fs-2xs);z-index:1">${e}</span>
    <canvas ref=${n} aria-hidden="true" style="width:100%;height:100%;display:block"/>
  </div>`}function qp({processes:e,maxMem:t}){if(!e||!e.length)return null;const s=e.reduce((a,i)=>a+(parseFloat(i.mem_mb)||0),0),n=e.reduce((a,i)=>a+(parseFloat(i.cpu_pct)||0),0),l={};e.forEach(a=>{const i=a.process_type||"process";(l[i]=l[i]||[]).push(a)});const o=Object.keys(l).length>1;return r`<div class="proc-section">
    <h3>Processes <span class="badge">${e.length}</span>
      <span class="badge">CPU ${_e(n)}</span>
      <span class="badge">MEM ${ge(s*1048576)}</span></h3>
    ${Object.entries(l).map(([a,i])=>{const c={};return i.forEach(d=>(c[d.name||"unknown"]=c[d.name||"unknown"]||[]).push(d)),r`<div style="margin-bottom:var(--sp-2)">
        ${o?r`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${K(a)}</div>`:null}
        ${Object.entries(c).map(([d,v])=>{const u=v.sort((m,g)=>(parseFloat(g.mem_mb)||0)-(parseFloat(m.mem_mb)||0));return r`<div key=${d} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${o?"":r`<span style="text-transform:uppercase;letter-spacing:0.03em">${K(a)}</span>${" · "}`}${K(d)} <span style="opacity:0.6">(${v.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${u.map(m=>{const g=parseFloat(m.cpu_pct)||0,x=parseFloat(m.mem_mb)||0,E=Math.max(2,Math.min(g,100)),S=g>80?"var(--red)":g>50?"var(--orange)":g>5?"var(--green)":"var(--fg2)",y=m.anomalies&&m.anomalies.length,$=m.zombie_risk&&m.zombie_risk!=="none";return r`<div key=${m.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${y?"border-left:2px solid var(--red);":""}${$?"border-left:2px solid var(--orange);":""}"
                  title=${m.cmdline||m.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${E}%;height:100%;background:${S};border-radius:2px"></div>
                    </div>
                    <span style="color:${S};min-width:3ch;text-align:right">${_e(g)}</span>
                  </div>
                  <div class="mono text-muted">${m.pid}</div>
                  <div>${ge(x*1048576)}</div>
                  ${y?r`<div class="text-red">\u26A0${m.anomalies.length}</div>`:null}
                </div>`})}
            </div>
          </div>`})}
      </div>`})}
  </div>`}function Vp({config:e}){if(!e)return null;const t=Object.entries(e.settings||{}),s=Object.entries(e.features||{}),n=(e.mcp_servers||[]).length>0,l=(e.extensions||[]).length>0,o=e.otel||{},a=e.hints||[];return!t.length&&!s.length&&!n&&!l&&!o.enabled&&!a.length&&e.model==null&&e.launch_at_startup==null?null:r`<div class="live-section">
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
  </div>`}function Up({telemetry:e}){if(!e)return null;const t=e,s=(t.input_tokens||0)+(t.output_tokens||0),n=t.errors||[],l=t.quota_state||{};if(!s&&!t.active_session_input&&!n.length)return null;const[o,a]=q(!1);return r`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${t.source}</span> <span class="badge">${_e(t.confidence*100)} confidence</span>
      ${n.length>0&&r`<span class="badge warn cursor-ptr" onClick=${i=>{i.stopPropagation(),a(!o)}}>${n.length} error${n.length>1?"s":""}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${Ue(t.input_tokens||0)} tok</span>
        <span class="msub">cache read: ${Ue(t.cache_read_tokens||0)} tok \u00B7 creation: ${Ue(t.cache_creation_tokens||0)} tok</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${Ue(t.output_tokens||0)} tok</span>
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
        <span class="mvalue">${Ue((t.active_session_input||0)+(t.active_session_output||0))} tok</span>
        <span class="msub">in: ${Ue(t.active_session_input||0)} \u00B7 out: ${Ue(t.active_session_output||0)} \u00B7 ${t.active_session_messages||0} msgs</span>
      </div>`:null}
      ${Object.keys(t.by_model||{}).length>0?r`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(t.by_model).map(([i,c])=>r`<div key=${i} class="flex-between flex-wrap" style="font-size:0.75rem;padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${i}</span>
          <span>in:${Ue(c.input_tokens||0)} tok out:${Ue(c.output_tokens||0)} tok${c.cache_read_tokens?" cR:"+Ue(c.cache_read_tokens)+" tok":""}${c.requests?" · "+c.requests+"req":""}${c.cost_usd?" · $"+c.cost_usd.toFixed(2):""}</span>
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
  </div>`}function Gp({live:e}){if(!e)return null;const t=e.token_estimate||{},s=e.mcp||{},n=Vo(e);return r`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${e.session_count||0} sess</span>
      <span class="badge">${e.pid_count||0} pid</span>
      <span class="badge">${_e((e.confidence||0)*100)} conf</span>
      ${s.detected&&r`<span class="badge warn">${s.loops||0} MCP loop${(s.loops||0)===1?"":"s"}</span>`}
    </h3>
    <div class="metric-grid" aria-live="polite" aria-relevant="text" aria-atomic="false">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">\u2191 ${It(e.outbound_rate_bps||0)}</span>
        <span class="msub">\u2193 ${It(e.inbound_rate_bps||0)} total ${ge((e.outbound_bytes||0)+(e.inbound_bytes||0))}</span>
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
  </div>`}function Po({tool:e,root:t}){var T,H,D,O,P,b,C,A;const[s,n]=q(!1),{snap:l,history:o}=We(Ie),a=re(()=>((l==null?void 0:l.tool_configs)||[]).find(F=>F.tool===e.tool),[l,e.tool]),i=re(()=>{var F;return(F=o==null?void 0:o.by_tool)==null?void 0:F[e.tool]},[o,e.tool]),c=Le[e.tool]||"var(--fg2)",d=ft[e.tool]||"🔹",v=e.files.reduce((F,I)=>F+I.tokens,0),u=e.processes.filter(F=>F.anomalies&&F.anomalies.length).length,m=Vo(e.live),g=(((T=e.live)==null?void 0:T.outbound_rate_bps)||0)+(((H=e.live)==null?void 0:H.inbound_rate_bps)||0),x=e.processes.reduce((F,I)=>F+(parseFloat(I.cpu_pct)||0),0),E=e.processes.reduce((F,I)=>F+(parseFloat(I.mem_mb)||0),0),S=re(()=>Math.max(...e.processes.map(F=>parseFloat(F.mem_mb)||0),100),[e.processes]),y=(((O=(D=e.token_breakdown)==null?void 0:D.telemetry)==null?void 0:O.errors)||[]).length,$=re(()=>{const F={};return e.files.forEach(I=>{const R=I.kind||"other";(F[R]=F[R]||[]).push(I)}),Object.keys(F).sort((I,R)=>{const U=Xa.indexOf(I),te=Xa.indexOf(R);return(U<0?99:U)-(te<0?99:te)}).map(I=>({kind:I,files:F[I]}))},[e.files]),k="tcard"+(s?" open":"")+(u||y?" has-anomaly":"");return r`<div class=${k}>
    <button class="tcard-head" onClick=${()=>n(!s)} aria-expanded=${s}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)">${d}</span>${K(e.label)}</h2>
      <span class="badge" data-dp="procs.tool.files">${e.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${z(v)} tok</span>
      ${e.processes.length>0&&r`<span class="badge" data-dp="procs.tool.process_count">${e.processes.length} proc ${_e(x)} ${ge(E*1048576)}</span>`}
      ${e.mcp_servers.length>0&&r`<span class="badge" data-dp="procs.tool.mcp_server_count">${e.mcp_servers.length} MCP</span>`}
      ${u>0&&r`<span class="badge warn" data-dp="procs.tool.anomaly">${u} anomaly</span>`}
      ${y>0&&r`<span class="badge" style="background:var(--red);color:var(--bg)">${y} error${y>1?"s":""}</span>`}
      ${e.live&&r`<span class="badge" style="background:var(--accent);color:var(--bg)">${e.live.session_count||0} live \u00B7 ${It(g)}${m>0?" · "+z(m)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${$.map(({kind:F,files:I})=>r`<span class="text-muted" style="font-size:var(--fs-xs)">${F}:${I.length}</span>`)}
      </div>
      ${i&&i.ts.length>2&&!s&&r`<div role="img" aria-label=${"Sparkline charts for "+e.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${F=>F.stopPropagation()}>
        <${co} label="CPU" data=${i.cpu} color=${c}/>
        <${co} label="MEM" data=${i.mem_mb} color=${"var(--green)"}/>
        <${co} label=${e.live?"Traffic":"Tokens"} data=${e.live?i.traffic:i.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${s&&r`<div class="tcard-body">
      ${((P=Za[e.tool])==null?void 0:P.length)>0&&r`<div class="tool-relationships">
        ${Za[e.tool].map(F=>r`<span key=${F.label} class="rel-badge rel-${F.type}"
          title=${F.label}>${F.label}</span>`)}
      </div>`}
      <${Vp} config=${a}/>
      <${Up} telemetry=${(b=e.token_breakdown)==null?void 0:b.telemetry}/>
      <${Gp} live=${e.live}/>
      ${$.map(({kind:F,files:I})=>r`<${Wp} key=${F} label=${F} files=${I} root=${t}/>`)}
      <${qp} processes=${(A=(C=e.live)==null?void 0:C.processes)!=null&&A.length?e.live.processes:e.processes} maxMem=${S}/>
      ${e.mcp_servers.length>0&&r`<div class="proc-section"><h3>MCP Servers</h3>
        ${e.mcp_servers.map(F=>r`<div key=${F.name||F.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${K(F.name)}</span>
          <span class="fmeta">${K((F.config||{}).command||"")} ${((F.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function Yp({groupKey:e,groupLabel:t,groupColor:s,tools:n,root:l}){const[o,a]=q(!0),i=n.reduce((d,v)=>d+v.files.length,0),c=n.reduce((d,v)=>d+v.files.reduce((u,m)=>u+m.tokens,0),0);return r`<div class="mb-md">
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
      ${n.map(d=>r`<${Po} key=${d.tool} tool=${d} root=${l}/>`)}
    </div>`}
  </div>`}function Kp(){const{snap:e}=We(Ie),[t,s]=q("product"),n=c=>c.files.length||c.processes.length||c.mcp_servers.length||c.live,l=(c,d)=>{const v=c.files.length*2+c.processes.length+c.mcp_servers.length;return d.files.length*2+d.processes.length+d.mcp_servers.length-v||c.tool.localeCompare(d.tool)},o=re(()=>e?e.tools.filter(c=>!c.meta&&n(c)).sort(l):[],[e]),a=re(()=>e?e.tools.filter(c=>c.meta&&c.tool!=="project-env"&&n(c)).sort(l):[],[e]),i=re(()=>{if(t==="product"||!o.length)return null;const c={};return o.forEach(d=>{if(t==="vendor"){const v=d.vendor||"community",u=Tr[v]||v,m=Cd[v]||"var(--fg2)";c[v]||(c[v]={label:u,color:m,tools:[]}),c[v].tools.push(d)}else{const v=(d.host||"any").split(",");for(const u of v){const m=u.trim(),g=Md[m]||m,x="var(--fg2)";c[m]||(c[m]={label:g,color:x,tools:[]}),c[m].tools.push(d)}}}),Object.entries(c).sort((d,v)=>{const u=d[1].tools.reduce((g,x)=>g+x.files.length,0);return v[1].tools.reduce((g,x)=>g+x.files.length,0)-u})},[o,t]);return e?!o.length&&!a.length?r`<p class="empty-state">No AI tool resources found.</p>`:r`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${Pd.map(c=>r`<button key=${c.id}
        class=${t===c.id?"range-btn active":"range-btn"}
        onClick=${()=>s(c.id)}>${c.label}</button>`)}
    </div>
    ${o.length>0&&(i?i.map(([c,d])=>r`<${Yp} key=${c}
      groupKey=${c} groupLabel=${d.label} groupColor=${d.color}
      tools=${d.tools} root=${e.root}/>`):r`<div class="tool-grid">
        ${o.map(c=>r`<${Po} key=${c.tool} tool=${c} root=${e.root}/>`)}
      </div>`)}
    ${a.length>0&&r`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)">▶</span>
        <span>Project Context</span>
        <span class="badge">${a.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${a.map(c=>r`<${Po} key=${c.tool} tool=${c} root=${e.root}/>`)}
      </div>
    </details>`}
  </div>`:r`<p class="loading-state">Loading...</p>`}function Jp({perCore:e}){if(!e||!e.length)return null;const t=100;return r`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((s,n)=>{const l=Math.max(1,s/t*100),o=s>80?"var(--red)":s>50?"var(--orange)":s>20?"var(--green)":"var(--fg2)";return r`<div key=${n} title=${"Core "+n+": "+_e(s)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+l+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function Qp({mem:e}){var k;const[t,s]=q(!1),[n,l]=q(!1),[o,a]=q(null),[i,c]=q(null),[d,v]=q(!1),u=We(Ie),m=(e.file||"").replace(/\\/g,"/").split("/").pop(),g=ye(async()=>{if(t){s(!1);return}if(s(!0),al.has(e.file)){a(al.get(e.file));return}v(!0),c(null);try{const T=await Uo(e.file);a(T)}catch(T){c(T.message)}finally{v(!1)}},[t,e.file]),x=(T,H)=>T.map((D,O)=>r`<span class="pline"><span class="ln">${H+O}</span>${K(D)||" "}</span>`),E=()=>{if(d)return r`<span class="loading-state">Loading...</span>`;if(i)return r`<span class="error-state">${i}</span>`;if(!o)return null;const T=o.split(`
`),H=T.length;if(H<=nn*3||n)return r`${x(T,1)}
        <div class="prev-actions">
          ${n&&r`<button class="prev-btn" onClick=${()=>l(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>u.openViewer(e.file)}>open in viewer</button>
        </div>`;const D=T.slice(-nn),O=H-nn+1;return r`${x(D,O)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>l(!0)}>show all (${H} lines)</button>
        <button class="prev-btn" onClick=${()=>u.openViewer(e.file)}>open in viewer</button>
      </div>`},S=e.mtime&&Date.now()/1e3-e.mtime<300,y=(k=u.recentFiles)==null?void 0:k.get(e.file),$=!!y;return r`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${g}
      aria-expanded=${t} title=${e.file}>
      ${$?r`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Nt(y.ts)}">●</span>`:S?r`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Nt(e.mtime)}">●</span>`:r`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${K(m)}</span>
      <span class="fmeta">${ge(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${S||$?r` <span style="color:${$?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${Nt($?y.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${t&&r`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${E()}</div>`}
  </div>`}function Zp({profile:e,items:t}){const[s,n]=q(t.length<=5),l=t.reduce((o,a)=>o+a.tokens,0);return r`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${K(e)}</span>
      <span class="badge">${t.length} files</span>
      <span class="badge">${z(l)} tok</span>
    </button>
    ${s&&r`<div>${t.map(o=>r`<${Qp} key=${o.file} mem=${o}/>`)}</div>`}
  </div>`}function Xp({source:e,entries:t}){const[s,n]=q(!1),l=re(()=>{const o={};return t.forEach(a=>{(o[a.profile]=o[a.profile]||[]).push(a)}),Object.entries(o)},[t]);return r`<div class="mem-group">
    <button class=${"mem-group-head"+(s?" open":"")} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      ${K(Ad[e]||e)} <span class="badge">${t.length}</span>
      <span class="badge">${z(t.reduce((o,a)=>o+a.tokens,0))} tok</span>
    </button>
    ${s&&r`<div>${l.map(([o,a])=>r`<${Zp} key=${o} profile=${o} items=${a}/>`)}</div>`}
  </div>`}function ef(){const[e,t]=q(null);if(ae(()=>{Mn().then(n=>{n&&n.ts&&n.ts.length>=2&&t(n)}).catch(()=>{})},[]),!e)return null;const s=e.memory_entries&&e.memory_entries.some(n=>n>0);return r`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${Xt} label="Memory Tokens" value=${z(e.mem_tokens[e.mem_tokens.length-1]||0)}
        data=${[e.ts,e.mem_tokens]} chartColor="var(--accent)" smooth />
      ${s&&r`<${Xt} label="Memory Entries" value=${e.memory_entries[e.memory_entries.length-1]||0}
        data=${[e.ts,e.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function tf(){const{snap:e}=We(Ie);if(!e||!e.agent_memory.length)return r`<p class="empty-state">No agent memory found.</p>`;const t=re(()=>{const s={};return e.agent_memory.forEach(n=>{(s[n.source]=s[n.source]||[]).push(n)}),Object.entries(s)},[e.agent_memory]);return r`<${ef}/>
    ${t.map(([s,n])=>r`<${Xp} key=${s} source=${s} entries=${n}/>`)}`}function sf(){var n,l,o,a;const{snap:e}=We(Ie);if(!e)return r`<p class="empty-state">Loading...</p>`;const t=e.tools.filter(i=>i.live).sort((i,c)=>{var d,v,u,m;return(((d=c.live)==null?void 0:d.outbound_rate_bps)||0)+(((v=c.live)==null?void 0:v.inbound_rate_bps)||0)-((((u=i.live)==null?void 0:u.outbound_rate_bps)||0)+(((m=i.live)==null?void 0:m.inbound_rate_bps)||0))}),s=Object.entries(e.live_monitor&&e.live_monitor.diagnostics||{});return r`<div class="live-stack">
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
            <td>\u2191 ${It(c.outbound_rate_bps||0)}<br/>\u2193 ${It(c.inbound_rate_bps||0)}</td>
            <td>${z(Vo(c))}<br/><span class="text-muted">${K(d.source||"network-inference")} @ ${_e((d.confidence||0)*100)}</span></td>
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
  </div>`}function nf(){var E,S,y,$;const{snap:e,globalRange:t}=We(Ie),[s,n]=q(null),[l,o]=q([]),[a,i]=q(null),c=re(()=>e?e.tools.filter(k=>!k.meta&&(k.files.length||k.processes.length||k.live)).sort((k,T)=>k.label.localeCompare(T.label)):[],[e]);if(ae(()=>{!s&&c.length&&n(c[0].tool)},[c,s]),ae(()=>{!s||!t||Wo({tool:s,since:t.since,limit:500,until:t.until}).then(o).catch(()=>o([]))},[s,t]),ae(()=>{!s||!t||Mn({since:t.since,tool:s,until:t.until}).then(k=>{var T;return i(((T=k==null?void 0:k.by_tool)==null?void 0:T[s])||null)}).catch(()=>i(null))},[s,t]),!e)return r`<p class="loading-state">Loading...</p>`;const d=c.find(k=>k.tool===s),v=(E=e.tool_telemetry)==null?void 0:E.find(k=>k.tool===s),u=d==null?void 0:d.live,m=Le[s]||"var(--fg2)",g={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},x=t.until!=null?new Date(t.since*1e3).toLocaleString(void 0,g)+" – "+new Date(t.until*1e3).toLocaleString(void 0,g):"";return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${c.map(k=>r`<button key=${k.tool}
        class=${s===k.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>n(k.tool)}>
        <span style="color:${Le[k.tool]||"var(--fg2)"}">${ft[k.tool]||"🔹"}</span>
        ${k.label}
        ${k.live?r`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${s&&r`<Fragment>
        <h3 class="flex-row mb-sm gap-sm">
          <span style="color:${m}">${ft[s]||"🔹"}</span>
          ${(d==null?void 0:d.label)||s}
          ${d!=null&&d.vendor?r`<span class="badge">${Tr[d.vendor]||d.vendor}</span>`:""}
          ${v!=null&&v.model?r`<span class="badge mono">${v.model}</span>`:""}
        </h3>

        ${a&&((S=a.ts)==null?void 0:S.length)>=2?r`<div class="es-section">
          <div class="es-section-title">Time Series${x?r` <span class="badge">${x}</span>`:""}</div>
          <div class="es-charts">
            <${Xt} label="CPU %" value=${((y=d==null?void 0:d.live)==null?void 0:y.cpu_percent)!=null?_e(d.live.cpu_percent||0):"-"}
              data=${[a.ts,a.cpu]} chartColor=${m} smooth />
            <${Xt} label="Memory (MB)" value=${(($=d==null?void 0:d.live)==null?void 0:$.mem_mb)!=null?ge((d.live.mem_mb||0)*1048576):"-"}
              data=${[a.ts,a.mem_mb]} chartColor="var(--green)" smooth />
            <${Xt} label="Context (tok)" value=${Ue(a.tokens[a.tokens.length-1]||0)}
              data=${[a.ts,a.tokens]} chartColor="var(--accent)" />
            <${Xt} label="Network (B/s)"
              value=${It(u?(u.outbound_rate_bps||0)+(u.inbound_rate_bps||0):a.traffic[a.traffic.length-1]||0)}
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
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${Ue(v.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${Ue(v.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${Ue(v.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${Ue(v.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${z(v.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${z(v.total_messages||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cost</div><div class="value">${v.cost_usd?"$"+v.cost_usd.toFixed(2):"-"}</div></div>
          </div>
          ${Object.keys(v.by_model||{}).length>0&&r`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(v.by_model).map(([k,T])=>r`<div key=${k}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${k}</span>
              <span>in: ${Ue(T.input||T.input_tokens||0)} tok \u00B7 out: ${Ue(T.output||T.output_tokens||0)} tok${T.cache_read_tokens?" · cR:"+Ue(T.cache_read_tokens):""}${T.cache_creation_tokens?" · cW:"+Ue(T.cache_creation_tokens):""}${T.cost_usd?" · $"+T.cost_usd.toFixed(2):""}</span>
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
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${It(u.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${It(u.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">Events (${l.length})</div>
          ${l.length?r`<div class="es-feed">
            ${l.map((k,T)=>{const H=Dd[k.kind]||"var(--fg2)",D=new Date(k.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),O=k.detail?Object.entries(k.detail).map(([P,b])=>P+"="+b).join(", "):"";return r`<div key=${k.ts+"-"+k.tool+"-"+T} class="es-event">
                <span class="es-event-time">${D}</span>
                <span class="es-event-kind" style="color:${H}">${k.kind}</span>
                <span class="es-event-detail" title=${O}>${O||"-"}</span>
              </div>`})}
          </div>`:r`<p class="empty-state">No events for this tool in the selected range.</p>`}
        </div>
      </Fragment>`}
    </div>
  </div>`}const Qs=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"],qi={"claude-opus-4-6":1e6,"claude-opus-4-5":1e6,"claude-sonnet-4-6":1e6,"claude-sonnet-4-5":1e6,"claude-sonnet-4":2e5,"claude-haiku-4-5":2e5,"claude-3-5-sonnet":2e5,"gpt-4.1":1e6,"gpt-4.1-mini":1e6,"gpt-4o":128e3,"gpt-4o-mini":128e3,o3:2e5,"o4-mini":2e5,"gemini-2.5-pro":1e6,"gemini-2.5-flash":1e6};function Vi({always:e,onDemand:t,conditional:s,never:n,total:l}){if(!l)return null;const o=a=>(a/l*100).toFixed(1)+"%";return r`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${e>0&&r`<div style="width:${o(e)};height:100%;background:var(--green)" title="Always loaded: ${z(e)}"></div>`}
    ${t>0&&r`<div style="width:${o(t)};height:100%;background:var(--yellow)" title="On-demand: ${z(t)}"></div>`}
    ${s>0&&r`<div style="width:${o(s)};height:100%;background:var(--orange)" title="Conditional: ${z(s)}"></div>`}
    ${n>0&&r`<div style="width:${o(n)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${z(n)}"></div>`}
  </div>`}function lf(){const{snap:e,history:t,enabledTools:s}=We(Ie),[n,l]=q(null),[o,a]=q(!1);if(ae(()=>{l(null),a(!1),$d().then(l).catch(()=>a(!0))},[]),o)return r`<p class="error-state">Failed to load budget.</p>`;if(!n)return r`<p class="loading-state">Loading...</p>`;const i=b=>s===null||s.includes(b),c=re(()=>{const b=(e==null?void 0:e.tool_configs)||[];for(const C of["claude-code","copilot","copilot-vscode"]){const A=b.find(F=>F.tool===C&&F.model);if(A)return A.model}for(const C of b)if(C.model&&qi[C.model])return C.model;return""},[e]),d=qi[c]||2e5,v=n.always_loaded_tokens||0,u=n.total_potential_tokens||0,m=v/d*100,g=u/d*100,x=re(()=>{if(!e)return{};const b={};return e.tools.forEach(C=>{C.tool==="aictl"||!C.token_breakdown||!C.token_breakdown.total||(b[C.tool]=C.token_breakdown)}),b},[e]),E=re(()=>e!=null&&e.tool_telemetry?e.tool_telemetry.filter(b=>i(b.tool)):[],[e,s]),S=re(()=>{if(!e)return[];const b={};return e.tools.forEach(C=>{C.tool==="aictl"||!i(C.tool)||(C.files||[]).forEach(A=>{const F=A.kind||"other";b[F]||(b[F]={kind:F,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),b[F].count++,b[F].tokens+=A.tokens,b[F].size+=A.size;const I=(A.sent_to_llm||"").toLowerCase();I==="yes"?b[F].always+=A.tokens:I==="on-demand"?b[F].onDemand+=A.tokens:I==="conditional"||I==="partial"?b[F].conditional+=A.tokens:b[F].never+=A.tokens})}),Object.values(b).sort((C,A)=>A.tokens-C.tokens)},[e,s]),y=re(()=>{if(!(e!=null&&e.tool_telemetry))return null;const b={},C={};e.tool_telemetry.filter(L=>i(L.tool)).forEach(L=>{(L.daily||[]).forEach(B=>{if(B.date&&(b[B.date]||(b[B.date]={}),C[B.date]||(C[B.date]={}),B.tokens_by_model&&Object.entries(B.tokens_by_model).forEach(([Y,j])=>{b[B.date][Y]=(b[B.date][Y]||0)+j}),B.model)){const Y=B.model,j=(B.input_tokens||0)+(B.output_tokens||0);b[B.date][Y]=(b[B.date][Y]||0)+j,C[B.date][Y]||(C[B.date][Y]={input:0,output:0,cache_read:0,cache_creation:0}),C[B.date][Y].input+=B.input_tokens||0,C[B.date][Y].output+=B.output_tokens||0,C[B.date][Y].cache_read+=B.cache_read_tokens||0,C[B.date][Y].cache_creation+=B.cache_creation_tokens||0}})});const A=new Date,F=[];for(let L=6;L>=0;L--){const B=new Date(A);B.setDate(B.getDate()-L),F.push(B.toISOString().slice(0,10))}const I=F.filter(L=>b[L]&&Object.values(b[L]).some(B=>B>0));if(!I.length)return null;const R=[...new Set(I.flatMap(L=>Object.keys(b[L]||{})))],U=Math.max(...I.map(L=>R.reduce((B,Y)=>B+((b[L]||{})[Y]||0),0)),1),te=I.some(L=>Object.keys(C[L]||{}).length>0);return{dates:I,models:R,byDate:b,byDateModel:C,maxTotal:U,hasDetail:te}},[e,s]),$=t&&t.ts&&t.ts.length>=2?[t.ts,t.live_tokens||t.ts.map(()=>0)]:null,k=E.reduce((b,C)=>b+(C.input_tokens||0),0),T=E.reduce((b,C)=>b+(C.output_tokens||0),0),H=E.reduce((b,C)=>b+(C.cache_read_tokens||0),0),D=E.reduce((b,C)=>b+(C.cache_creation_tokens||0),0),O=E.reduce((b,C)=>b+(C.total_sessions||0),0),P=E.reduce((b,C)=>b+(C.cost_usd||0),0);return r`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${$?r`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${hc} data=${$} color="var(--green)" height=${60}/>
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
        ${y.models.map((b,C)=>r`<span key=${b}>
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${Qs[C%Qs.length]};margin-right:3px"></span>${b}
        </span>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
        ${y.dates.map(b=>{const C=y.models.reduce((F,I)=>F+((y.byDate[b]||{})[I]||0),0),A=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return r`<div key=${b} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${A}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${b}: ${z(C)} tokens">
              ${y.models.map((F,I)=>{const R=(y.byDate[b]||{})[F]||0;return R?r`<div key=${F} style="width:${(R/y.maxTotal*100).toFixed(1)}%;height:100%;background:${Qs[I%Qs.length]}" title="${F}: ${z(R)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${z(C)}</span>
          </div>`})}
      </div>
      ${y.hasDetail&&r`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${y.dates.flatMap(b=>{const C=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),A=y.byDateModel[b]||{},F=Object.keys(A).sort();return F.length?F.map((I,R)=>{const U=A[I];return r`<tr key=${b+"-"+I}>
                <td>${R===0?C:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${Qs[y.models.indexOf(I)%Qs.length]};margin-right:3px"></span>${I}</td>
                <td>${z(U.input)}</td><td>${z(U.output)}</td>
                <td class="text-muted">${z(U.cache_read)}</td>
                <td class="text-muted">${z(U.cache_creation)}</td>
                <td class="text-bold">${z(U.input+U.output)}</td>
              </tr>`}):[]})}</tbody>
        </table>
      </details>`}
    </div>`}

    <!-- Verified token usage (main table) -->
    ${E.length>0&&r`<div class="budget-card mb-md">
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
          <tbody>${E.map(b=>{const C=x[b.tool];return r`<tr key=${b.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(Le[b.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${K(b.tool)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${b.source}</span> <span class="text-muted">${_e(b.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${z(b.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${z(b.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${z(b.total_sessions||0)}</td>
              <td style="text-align:right">${b.cost_usd>0?"$"+b.cost_usd.toFixed(2):"—"}</td>
              <td>${C?r`<${Vi} always=${C.always_loaded||0} onDemand=${C.on_demand||0}
                conditional=${C.conditional||0} never=${C.never_sent||0} total=${C.total||1}/>`:null}</td>
            </tr>`})}
          ${E.length>1&&r`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${z(k)}</td>
            <td style="text-align:right">${z(T)}</td>
            <td style="text-align:right" class="text-muted">${z(H)}</td>
            <td style="text-align:right" class="text-muted">${z(D)}</td>
            <td style="text-align:right">${z(O)}</td>
            <td style="text-align:right">${P>0?"$"+P.toFixed(2):"—"}</td>
            <td></td>
          </tr>`}</tbody>
        </table>
      </div>
    </div>`}

    <!-- By category -->
    ${S.length>0&&r`<div class="budget-card budget-full">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">By Category</h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Per-category tokens" style="width:100%">
          <thead><tr><th>Category</th><th style="text-align:right">Files</th><th style="text-align:right">Tokens</th><th style="text-align:right">Size</th><th style="width:120px">Distribution</th></tr></thead>
          <tbody>${S.map(b=>r`<tr key=${b.kind}>
            <td>${K(b.kind)}</td>
            <td style="text-align:right">${b.count}</td>
            <td style="text-align:right" class="text-bold">${z(b.tokens)}</td>
            <td style="text-align:right">${ge(b.size)}</td>
            <td><${Vi} always=${b.always} onDemand=${b.onDemand} conditional=${b.conditional} never=${b.never} total=${b.tokens||1}/></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>`}
  </div>`}function of(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const Gn={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function Ui({agent:e,tasks:t,now:s}){const n=Gn[e.state]||Gn.active,l=e.ended_at?e.ended_at-e.started_at:s-e.started_at,o=t.filter(a=>a.agent_id===e.agent_id);return r`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${n.bg};color:var(--bg)">${n.label}</span>
      <strong class="text-sm">${K(e.agent_id)}</strong>
      <span class="text-muted text-xs">${of(l)}</span>
      ${e.task&&r`<span class="text-xs mono text-muted">\u2014 ${K(e.task)}</span>`}
    </div>
    ${o.length>0&&r`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${o.map(a=>{const i=Gn[a.state]||Gn.pending;return r`<div key=${a.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${i.bg};color:var(--bg);font-size:0.6rem;padding:1px 4px">${i.label}</span>
          <span class="mono">${K(a.name||a.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function af({entityState:e}){if(!e||!e.agents||!e.agents.length)return null;const t=e.agents,s=e.tasks||[],n=Date.now()/1e3,l=t.filter(a=>a.state==="active"),o=t.filter(a=>a.state!=="active");return r`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${t.length} agent${t.length>1?"s":""}</span>
      ${l.length>0&&r`<span class="badge text-xs" style="background:var(--green);color:var(--bg)">${l.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${l.map(a=>r`<${Ui} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
      ${o.map(a=>r`<${Ui} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
    </div>
  </div>`}function rf({tasks:e}){if(!e||!e.length)return null;const t=e.filter(o=>o.state==="pending"),s=e.filter(o=>o.state==="active"),n=e.filter(o=>o.state==="done");function l({title:o,items:a,color:i}){return r`<div class="tt-column">
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
  </div>`}function tl(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Yt({title:e,icon:t,badge:s,defaultOpen:n,children:l}){const[o,a]=q(n||!1);return r`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>a(i=>!i)}
      aria-expanded=${o}>
      <span class="sd-panel-icon">${t}</span>
      <span class="sd-panel-title">${e}</span>
      ${s!=null&&r`<span class="badge text-xs" style="margin-left:var(--sp-2)">${s}</span>`}
      <span class="sd-panel-arrow">${o?"▲":"▼"}</span>
    </button>
    ${o&&r`<div class="sd-panel-body">${l}</div>`}
  </div>`}function cf({sessionId:e}){const[t,s]=q([]),[n,l]=q(!0);if(ae(()=>{if(!e)return;l(!0);const a=Math.floor(Date.now()/1e3)-86400;Wo({sessionId:e,limit:200,since:a}).then(i=>{s(i.reverse()),l(!1)}).catch(()=>l(!1))},[e]),n)return r`<p class="loading-state">Loading events...</p>`;if(!t.length)return r`<p class="empty-state">No events recorded for this session.</p>`;const o={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)"};return r`<div class="sd-events">
    ${t.map((a,i)=>{const c=o[a.kind]||"var(--fg3)",d=a.detail||{},v=d.path||d.name||d.tool_name||a.kind;return r`<div key=${i} class="sd-event-row">
        <span class="sd-event-time">${Nt(a.ts)}</span>
        <span class="sd-event-dot" style="background:${c}"></span>
        <span class="sd-event-kind">${a.kind}</span>
        <span class="sd-event-desc mono text-muted">${K(String(v))}</span>
      </div>`})}
  </div>`}const df={"claude-opus-4-6":1e6,"claude-sonnet-4.6":1e6,"claude-sonnet-4":2e5,"claude-haiku-4.5":2e5,"gpt-5.4":2e5,"gpt-5":128e3},Gi=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],uf=95;function pf({session:e}){const{snap:t}=We(Ie),s=e.files_loaded||[],n=((t==null?void 0:t.tool_configs)||[]).map(g=>g.model).filter(Boolean)[0]||"",l=df[n]||2e5,a=(t&&t.agent_memory||[]).reduce((g,x)=>g+(x.tokens||0),0),i=s.length*150,d=Gi.reduce((g,x)=>g+x.tokens,0)+a+i,v=Math.min(d/l*100,100),u=uf,m=[...Gi,{name:"Memory",tokens:a,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:i,color:"var(--green)"}].filter(g=>g.tokens>0);return r`<div>
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
  </div>`}function ff({session:e}){const{snap:t}=We(Ie),s=t&&t.agent_memory||[],n=e.project||"",l=n?s.filter(o=>{const a=o.project||o.tool||"";return!n||a.includes(n.replace(/\\/g,"/").split("/").pop())}):s;return l.length?r`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${l.map((o,a)=>r`<${vf} key=${a} mem=${o}/>`)}
  </div>`:r`<p class="empty-state">No memory entries found${n?" for this project":""}.</p>`}function vf({mem:e}){const[t,s]=q(!1),n=e.name||(e.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",l=(e.content||"").slice(0,300);return r`<div class="sd-memory-entry" style="cursor:pointer" onClick=${()=>s(!t)}>
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
  </div>`}function mf({rateLimits:e}){return!e||!Object.keys(e).length?null:r`<div style="margin-top:var(--sp-3)">
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
  </div>`}function hf({session:e}){const t=e.exact_input_tokens||0,s=e.exact_output_tokens||0,[n,l]=q(null);ae(()=>{e.tool&&wr({tool:e.tool,active:!1,limit:20}).then(i=>{if(i.length>1){const c=i.filter(v=>v.duration_s>0).map(v=>v.duration_s),d=c.length?c.reduce((v,u)=>v+u,0)/c.length:0;l({avgDuration:d,sampleCount:i.length})}}).catch(()=>{})},[e.tool]);const o=e.duration_s||0,a=n&&n.avgDuration>0?o/n.avgDuration:null;return r`<div>
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
    ${e.entity_state&&r`<${mf} rateLimits=${e.entity_state.rate_limits}/>`}
  </div>`}function gf({project:e}){const[t,s]=q(null);return ae(()=>{e&&gd(7).then(n=>{const l=n.find(o=>o.project===e);s(l||null)}).catch(()=>{})},[e]),t?r`<div>
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
  </div>`:r`<p class="empty-state">No cost data available for this project.</p>`}function _f({project:e,tool:t}){const[s,n]=q(null);if(ae(()=>{!e||!t||fd(e,t,30,20).then(n).catch(()=>n([]))},[e,t]),!s||s.length<2)return r`<p class="empty-state">Not enough session history for trend analysis.</p>`;const l=Math.max(...s.map(i=>i.total_tokens),1),o=s.reduce((i,c)=>i+c.duration_s,0)/s.length,a=s.reduce((i,c)=>i+c.total_tokens,0)/s.length;return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${tl(o)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${z(a)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${s.map(i=>{const c=(i.total_tokens/l*100).toFixed(1),d=new Date(i.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),v=o>0?i.duration_s/o:1;return r`<div key=${i.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${d}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${c}%;border-radius:3px;background:${v>1.5?"var(--orange)":v<.7?"var(--green)":"var(--accent)"}" title="${z(i.total_tokens)} tok, ${tl(i.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${z(i.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${tl(i.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function $f({sessionId:e}){const[t,s]=q(null),[n,l]=q(!0);if(ae(()=>{l(!0);const i=Math.floor(Date.now()/1e3)-3600;_d(i,100).then(c=>{s(c),l(!1)}).catch(()=>l(!1))},[e]),n)return r`<p class="loading-state">Loading API call data...</p>`;if(!t||!t.calls||!t.calls.length)return r`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;const{calls:o,summary:a}=t;return r`<div>
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
  </div>`}function bf({session:e}){const t=e.files_touched||[],s=e.file_events||0;return t.length?r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${t.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${z(s)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${t.map(n=>r`<div key=${n} class="text-muted" style="padding:2px 0">${K(n)}</div>`)}
    </div>
  </div>`:r`<p class="empty-state">No file changes recorded.</p>`}function yf({session:e,onClose:t}){const s=Le[e.tool]||"var(--fg2)",n=e.files_loaded||[],l=e.files_touched||[],o=e.exact_input_tokens||0,a=e.exact_output_tokens||0,i=e.entity_state||null,c=i&&i.agents&&i.agents.length>0,d=i&&i.tasks&&i.tasks.length>0;return r`<div class="sd-container" style="border-left:3px solid ${s}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${K(e.tool)}</strong>
        ${e.project&&r`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${e.project}>${K(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">
          ${tl(e.duration_s)}
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

    <${Yt} title="Actions" icon="\u26A1" badge=${null} defaultOpen=${!0}>
      <${cf} sessionId=${e.session_id}/>
    <//>
    ${c&&r`<${Yt} title="Team" icon="\uD83D\uDC65" badge=${i.agents.length+" agents"} defaultOpen=${!0}>
      <${af} entityState=${i}/>
    <//>`}
    ${d&&r`<${Yt} title="Tasks" icon="\uD83D\uDCCB" badge=${i.tasks.length} defaultOpen=${!0}>
      <${rf} tasks=${i.tasks}/>
    <//>`}
    <${Yt} title="Context" icon="\uD83D\uDCDA" badge=${n.length||null}>
      <${pf} session=${e}/>
    <//>
    <${Yt} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${!1}>
      <${ff} session=${e}/>
    <//>
    <${Yt} title="Resources" icon="\u2699\uFE0F" badge=${z(o+a)+" tok"}>
      <${hf} session=${e}/>
    <//>
    <${Yt} title="Deliverables" icon="\uD83D\uDCE6" badge=${l.length||null}>
      <${bf} session=${e}/>
    <//>
    <${Yt} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${!1}>
      <${$f} sessionId=${e.session_id}/>
    <//>
    ${e.project&&r`<${Yt} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${!1}>
      <${gf} project=${e.project}/>
    <//>`}
    ${e.project&&e.tool&&r`<${Yt} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${!1}>
      <${_f} project=${e.project} tool=${e.tool}/>
    <//>`}
  </div>`}function xf(e,t,s){const n=t-e,l=[300,600,900,1800,3600,7200,10800,21600,43200,86400];let o=l[l.length-1];for(const c of l)if(n/c<=s){o=c;break}const a=Math.ceil(e/o)*o,i=[];for(let c=a;c<=t;c+=o){const d=new Date(c*1e3);let v;o>=86400?v=d.toLocaleDateString([],{month:"short",day:"numeric"}):n>86400?v=d.toLocaleString([],{hourCycle:"h23",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):v=d.toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),i.push({ts:c,label:v})}return i}function kf(e){return e>=3600?(e/3600).toFixed(1)+"h":e>=60?Math.round(e/60)+"m":Math.round(e)+"s"}function Yi(e,t,s,n){const l=e.duration_s||(e.ended_at||n)-e.started_at,o=new Date(e.started_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),a=e.ended_at?new Date(e.ended_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):"now",i=[kf(l)];e.conversations&&i.push(e.conversations+" conv"),e.subagents&&i.push(e.subagents+" agents"),e.source_files?i.push(e.source_files+" src files"):e.unique_files&&i.push(e.unique_files+" files"),e.bytes_written>1024&&i.push(ge(e.bytes_written));const c=!e.ended_at;return r`<div class="stl-tip">
    <div class="stl-tip-head">
      <span style=${"color:"+t}>${s}</span>
      <strong>${e.tool}</strong>
      ${c?r`<span class="badge" style="font-size:9px;background:var(--green);color:#000">live</span>`:""}
    </div>
    <div class="stl-tip-time">${o} – ${a}</div>
    <div class="stl-tip-stats">${i.join(" · ")}</div>
    ${e.project?r`<div class="stl-tip-proj">${e.project.replace(/\\/g,"/").split("/").pop()}</div>`:""}
  </div>`}function wf({sessions:e,rangeSeconds:t,onSelect:s}){const n=Date.now()/1e3,l=t||86400,o=n-l,a=(e||[]).filter(O=>(O.ended_at||n)>=o&&O.started_at<=n),i=a.filter(O=>O.ended_at).sort((O,P)=>O.started_at-P.started_at),c=a.filter(O=>!O.ended_at).sort((O,P)=>O.started_at-P.started_at),d=[],v=[];for(const O of i){const P=Math.max(O.started_at,o),b=O.ended_at;let C=-1;for(let A=0;A<d.length;A++)if(P>=d[A]+2){d[A]=b,C=A;break}C<0&&(C=d.length,d.push(b)),v.push(C)}const u=10,m=2,g=18,x=14,E=Math.max(d.length,0),S=E>0?E*(u+m)+m:0,y=c.length>0?x+m*2:0,$=S>0&&y>0?1:0,k=S+$+y,T=Math.max(k,20)+g,H=xf(o,n,8),D=O=>(Math.max(O,o)-o)/l*100;return r`<div class="stl">
    <div class="stl-chart" style=${"height:"+T+"px"}>
      ${H.map(O=>r`<div key=${O.ts} class="stl-grid"
        style=${"left:"+D(O.ts).toFixed(2)+"%;bottom:"+g+"px"} />`)}

      <!-- ended session bars -->
      ${i.map((O,P)=>{const b=Math.max(O.started_at,o),C=D(b),A=Math.max(.15,D(O.ended_at)-C),F=v[P]*(u+m)+m,I=Le[O.tool]||"var(--fg2)",R=ft[O.tool]||"🔹";return r`<div key=${O.session_id} class="stl-bar"
          style=${"left:"+C.toFixed(2)+"%;width:"+A.toFixed(2)+"%;top:"+F+"px;height:"+u+"px;background:"+I}
          onClick=${()=>s&&s(O)}>
          ${Yi(O,I,R,n)}
        </div>`})}

      <!-- divider between ended and live -->
      ${$?r`<div class="stl-divider" style=${"top:"+S+"px"} />`:""}

      <!-- live session markers -->
      ${c.map(O=>{const P=D(O.started_at),b=S+$+m,C=Le[O.tool]||"var(--fg2)",A=ft[O.tool]||"🔹";return r`<div key=${O.session_id} class="stl-marker"
          style=${"left:"+P.toFixed(2)+"%;top:"+b+"px;background:"+C}
          onClick=${()=>s&&s(O)}>
          ${Yi(O,C,A,n)}
        </div>`})}

      <div class="stl-axis" style=${"top:"+(T-g)+"px"}>
        ${H.map(O=>r`<span key=${O.ts} class="stl-tick"
          style=${"left:"+D(O.ts).toFixed(2)+"%"}>${O.label}</span>`)}
      </div>
    </div>
  </div>`}function Oo(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function gc(e){let t=0;for(const s of e)(s.role==="lead"||s.role==="teammate"||s.role==="subagent")&&t++,t+=gc(s.children||[]);return t}function Ki({session:e,onSelect:t,isSelected:s,agentTeams:n}){const l=Le[e.tool]||"var(--fg2)",o=ft[e.tool]||"🔹",a=(n||[]).find(d=>d.session_id===e.session_id),i=a?a.agent_count:gc(e.process_tree||[]),c=i>1;return r`<div class="diag-card" style="border-left:3px solid ${l};cursor:pointer;${s?"outline:2px solid var(--accent);outline-offset:-2px":""}"
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
      <div class="es-kv-card"><div class="label">Duration</div><div class="value">${Oo(e.duration_s)}</div></div>
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
  </div>`}function Sf(){const{snap:e}=We(Ie),t=e&&e.agent_teams||[];if(!t.length)return null;const s=t.reduce((o,a)=>o+a.agent_count,0),n=t.reduce((o,a)=>o+(a.total_input_tokens||0),0),l=t.reduce((o,a)=>o+(a.total_output_tokens||0),0);return r`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Agent Teams
      <span class="badge">${t.length} sessions</span>
      <span class="badge">${s} agents</span>
      <span class="badge">${z(n+l)} tok</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      ${t.sort((o,a)=>(a.total_input_tokens||0)-(o.total_input_tokens||0)).slice(0,8).map(o=>r`
        <${Cf} key=${o.session_id} team=${o}/>
      `)}
    </div>
  </div>`}function Tf(e){return e?e.replace("claude-","").replace("-20251001",""):"?"}function Cf({team:e}){const[t,s]=q(!1),[n,l]=q(e.agents||null),[o,a]=q(!1);e.models,ae(()=>{!t||n||(a(!0),vd(e.session_id).then(u=>{l(u.agents||[]),a(!1)}).catch(()=>{l([]),a(!1)}))},[t]);const i=(n||[]).filter(u=>(u.input_tokens||0)+(u.output_tokens||0)>50),c=(n||[]).length-i.length,d=i.sort((u,m)=>m.input_tokens+m.output_tokens-(u.input_tokens+u.output_tokens)),v=d[0]?(d[0].input_tokens||0)+(d[0].output_tokens||0):1;return r`<div class="diag-card" style="border-left:3px solid var(--accent);padding:var(--sp-4)">
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
          <span class="text-muted" style="font-size:var(--fs-2xs)">${Tf(u.model)}</span>
          ${u.completed?r`<span class="text-green">\u2713</span>`:r`<span class="text-orange">\u25CB</span>`}
        </div>`})}
      ${!t&&d.length>5?r`<div class="text-muted text-xs cursor-ptr" style="padding:2px var(--sp-2)"
        onClick=${u=>{u.stopPropagation(),s(!0)}}>+${d.length-5} more agents\u2026</div>`:null}
    </div>`}
  </div>`}function Mf(){const{snap:e,globalRange:t,rangeSeconds:s,enabledTools:n}=We(Ie),[l,o]=q([]),[a,i]=q(!1),[c,d]=q(!0),[v,u]=q(null),[m,g]=q(null),[x,E]=q([]);ae(()=>{d(!0),i(!1),wr({active:!1}).then(b=>{o(b),d(!1)}).catch(()=>{i(!0),d(!1)})},[]),ae(()=>{if(!t)return;const b=Math.min(t.since,Date.now()/1e3-86400);gl(null,{since:b,until:t.until}).then(E).catch(()=>E([]))},[t]),ae(()=>{const b=C=>{const A=C.detail;A&&A.session_id&&(u(A.session_id),g(A))};return window.addEventListener("aictl-session-select",b),()=>window.removeEventListener("aictl-session-select",b)},[]);const S=b=>n===null||n.includes(b),y=(e&&e.sessions||[]).filter(b=>S(b.tool)),$=l.filter(b=>S(b.tool)),k=x.filter(b=>S(b.tool));let T=y.find(b=>b.session_id===v);if(!T&&v){const C=l.find(A=>A.session_id===v)||m;C&&C.session_id===v&&(T={session_id:C.session_id,tool:C.tool,project:C.project||"",duration_s:C.duration_s||0,active:C.active||!1,started_at:C.started_at,ended_at:C.ended_at,files_touched:[],files_loaded:[],exact_input_tokens:C.input_tokens||0,exact_output_tokens:C.output_tokens||0,pids:[],file_events:C.files_modified||0})}const H=b=>{u(C=>C===b.session_id?null:b.session_id)},D={};for(const b of y){const C=b.project||"Unknown Project";D[C]||(D[C]=[]),D[C].push(b)}const O=Object.keys(D).sort();return r`<div>
    <div class="mb-lg">
      <${wf} sessions=${k} rangeSeconds=${s}
        onSelect=${b=>{u(b.session_id),g(b)}}/>
    </div>

    <${Sf}/>

    ${T&&r`<${yf} session=${T}
      onClose=${()=>u(null)}/>`}

    <div class="es-section">
      <div class="es-section-title">Active Sessions (${y.length})</div>
      ${y.length?O.length>1?O.map(b=>r`<div key=${b} style="margin-bottom:var(--sp-5)">
              <div class="text-muted text-sm mono" style="margin-bottom:var(--sp-3);font-weight:600">
                ${K(b.replace(/\\/g,"/").split("/").pop()||b)}
                <span class="text-xs" style="font-weight:400"> \u2014 ${D[b].length} session${D[b].length>1?"s":""}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
                ${D[b].map(C=>r`<${Ki} key=${C.session_id} session=${C}
                  onSelect=${H} isSelected=${C.session_id===v} agentTeams=${e==null?void 0:e.agent_teams}/>`)}
              </div>
            </div>`):r`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
              ${y.map(b=>r`<${Ki} key=${b.session_id} session=${b}
                onSelect=${H} isSelected=${b.session_id===v}/>`)}
            </div>`:r`<div class="empty-state">
            <p>No active sessions.</p>
            ${$.length>0&&r`<div class="diag-card" style="margin-top:var(--sp-4);max-width:400px">
              <div class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Last session</div>
              <div class="flex-row gap-sm" style="align-items:center">
                <span style="color:${Le[$[0].tool]||"var(--fg2)"}">${ft[$[0].tool]||"🔹"}</span>
                <strong>${K($[0].tool)}</strong>
                <span class="text-muted text-xs">${Oo($[0].duration_s)}</span>
                ${$[0].ended_at&&r`<span class="text-muted text-xs">${Nt($[0].ended_at)}</span>`}
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
                <tbody>${$.map(b=>{const C=Le[b.tool]||"var(--fg2)",A=ft[b.tool]||"🔹",F=b.session_id?b.session_id.length>12?b.session_id.slice(0,12)+"…":b.session_id:"—";return r`<tr key=${b.session_id} style="cursor:pointer;${b.session_id===v?"background:var(--bg2)":""}"
                    onClick=${()=>{u(b.session_id===v?null:b.session_id),g(null)}}>
                    <td>
                      <span style="color:${C};margin-right:var(--sp-2)">${A}</span>
                      ${K(b.tool)}
                    </td>
                    <td><span class="mono" title=${b.session_id} style="font-size:0.7rem">${F}</span></td>
                    <td><span class="mono" style="font-size:0.7rem">${b.pid||"—"}</span></td>
                    <td>${Oo(b.duration_s)}</td>
                    <td>${b.active?r`<span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>`:r`<span class="badge" style="font-size:var(--fs-xs)">ended</span>`}</td>
                    <td>${b.ended_at?Nt(b.ended_at):"—"}</td>
                  </tr>`})}</tbody>
              </table>`:r`<p class="empty-state">No past sessions recorded.</p>`}
    </div>
  </div>`}function Ji(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function Ef(e,t,s){let n;return{hooks:{init(l){n=document.createElement("div"),n.className="chart-tooltip",n.style.display="none",l.over.appendChild(n)},setCursor(l){var v;const o=l.cursor.idx;if(o==null){n.style.display="none";return}const a=[];for(let u=1;u<l.series.length;u++){const m=(v=l.data[u])==null?void 0:v[o];m!=null&&a.push(t?t(m):z(m))}if(!a.length){n.style.display="none";return}const i=l.data[0][o],c=s?new Date(i*1e3).toLocaleTimeString([],{hourCycle:"h23"}):e?e(i):z(i);n.innerHTML=`<b>${a.join(", ")}</b> ${c}`;const d=Math.round(l.valToPos(i,"x"));n.style.left=Math.min(d,l.over.clientWidth-100)+"px",n.style.display=""}}}}const Lf=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function Af(e){return e==null||e===0?"0":e>=1e6?Math.round(e/1e6)+"M":e>=1e3?Math.round(e/1e3)+"K":e>=1?Math.round(e).toString():e.toPrecision(1)}function Df(e,t,s,n){const l=Math.max(0,Math.floor(Math.log10(Math.max(1,s)))),o=Math.ceil(Math.log10(Math.max(1,n))),a=[];for(let c=l;c<=o;c++)a.push(Math.pow(10,c));if(a.length<=3)return a;const i=Math.floor((l+o)/2);return[Math.pow(10,l),Math.pow(10,i),Math.pow(10,o)]}function uo({mode:e,data:t,labels:s,colors:n,height:l,isTime:o,fmtX:a,fmtY:i,xLabel:c,yLabel:d,logX:v}){const u=nt(null),m=nt(null),g=l||200;return ae(()=>{if(!u.current||!t||t.length<2||!t[0]||t[0].length<2)return;try{m.current&&(m.current.destroy(),m.current=null)}catch{m.current=null}const x=t.length-1,E=n||Lf,S=[{}];for(let $=0;$<x;$++){const k=E[$%E.length],T=Ji(k,.6);e==="scatter"?S.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:"transparent",paths:()=>null,points:{show:!0,size:8,fill:T,stroke:"transparent",width:0}}):S.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:k,width:1.5,fill:Ji(k,.08),points:{show:!1}})}const y={width:u.current.clientWidth||300,height:g,padding:[8,8,0,0],cursor:{show:!0,x:!0,y:!1,points:{show:e!=="scatter"}},legend:{show:!1},select:{show:!1},scales:{x:{time:!!o,...v?{distr:3,log:10}:{}},y:{auto:!0,range:($,k,T)=>[Math.max(0,k*.9),T*1.1||1]}},axes:[{show:!0,size:28,gap:2,...v?{splits:Df}:{},values:o?void 0:($,k)=>k.map(T=>v?Af(T):a?a(T):z(T)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}},{show:!0,size:50,gap:2,values:($,k)=>k.map(T=>i?i(T):z(T)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}}],series:S,plugins:[Ef(a,i,o)]};try{m.current=new lt(y,t,u.current)}catch($){console.warn("AnalyticsChart: uPlot init failed",$),m.current=null}return()=>{try{m.current&&(m.current.destroy(),m.current=null)}catch{}}},[t,e,n,s,o,v,g]),ae(()=>{if(!m.current||!u.current)return;const x=new ResizeObserver(()=>{m.current&&u.current&&m.current.setSize({width:u.current.clientWidth,height:g})});return x.observe(u.current),()=>x.disconnect()},[g]),r`<div class="analytics-chart-wrap" style=${"height:"+g+"px"} ref=${u}></div>`}function Pf(e){const t={};for(const s of e){const n=typeof s=="string"?s:s.metric;if(!n)continue;const l=n.split("."),o=l.length>1?l.slice(0,-1).join("."):"(ungrouped)";(t[o]=t[o]||[]).push({name:n,count:s.count||0,lastValue:s.last_value})}return Object.entries(t).sort((s,n)=>s[0].localeCompare(n[0]))}function Of(){const[e,t]=q([]),[s,n]=q(null),[l,o]=q(null),[a,i]=q([]),[c,d]=q(!1),[v,u]=q(null);ae(()=>{yd().then(S=>{t(S||[]),u(null)}).catch(S=>{t([]),u(S.message)})},[]);const m=re(()=>Pf(e),[e]),g=ye(S=>{n(S),o(null),i([]),d(!0);const y=Math.floor(Date.now()/1e3)-1800,$=xd(S,y).then(T=>o(T)).catch(()=>o(null)),k=kd(S,y).then(T=>i(Array.isArray(T)?T:[])).catch(()=>i([]));Promise.allSettled([$,k]).then(()=>d(!1))},[]),x=re(()=>!l||!l.value||!l.value.length?null:l.value[l.value.length-1],[l]),E=re(()=>{const S=new Set;for(const y of a)y.tags&&Object.keys(y.tags).forEach($=>S.add($));return[...S].sort()},[a]);return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${v&&r`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${K(v)}</p>`}
      ${!v&&!e.length&&r`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${m.map(([S,y])=>r`<div key=${S}>
        <div class="text-muted" style="font-size:0.62rem;padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${S}</div>
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
          <${Xt}
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
                  ${E.map(S=>r`<th key=${S} style="padding:var(--sp-2) var(--sp-4)">${S}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${a.slice(-50).reverse().map((S,y)=>r`<tr key=${y}
                  style="border-bottom:1px solid var(--border);${y%2?"background:var(--bg2)":""}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${Mr(S.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${z(S.value)}</td>
                  ${E.map($=>r`<td key=${$} style="padding:var(--sp-2) var(--sp-4)">
                    ${S.tags&&S.tags[$]!=null?r`<span class="badge">${S.tags[$]}</span>`:"-"}
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
  </div>`}const sn=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function ds(e){return e>=1e3?z(e/1e3)+"s":Math.round(e)+"ms"}function zf(e){return"#"+Math.round(e)}function po(e){return(e||"").split("/").slice(-2).join("/")}function Rf({data:e}){if(!e||!e.requests||!e.requests.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <p class="empty-state">No request data in this time range.</p>
    </div>`;const t=e.requests,s=re(()=>{const c=t.map(v=>v.ts),d=t.map(v=>v.duration_ms);return[c,d]},[t]),n=re(()=>{const c=[...new Set(t.map(g=>g.model||"(unknown)"))],d=c.map(()=>[]),u=[...t.filter(g=>g.input_tokens>0)].sort((g,x)=>g.input_tokens-x.input_tokens),m=u.map(g=>g.input_tokens);for(const g of c)d[c.indexOf(g)]=u.map(x=>(x.model||"(unknown)")===g?x.duration_ms:null);return{data:[m,...d],labels:c,colors:sn.slice(0,c.length)}},[t]),l=e.by_model||[],o=Math.max(1,...l.map(c=>c.p95_ms)),a=re(()=>{const c=[...new Set(t.map(g=>g.model||"(unknown)"))],v=[...t.filter(g=>g.seq>0)].sort((g,x)=>g.seq-x.seq),u=v.map(g=>g.seq),m=c.map(g=>v.map(x=>(x.model||"(unknown)")===g?x.duration_ms:null));return{data:[u,...m],labels:c,colors:sn.slice(0,c.length)}},[t]),i=t.length?t[t.length-1].duration_ms:0;return r`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${ds(i)}</span></div>
        <${uo} mode="line" data=${s} isTime=${!0} fmtY=${ds} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${t.length} requests</span></div>
        <${uo} mode="scatter" data=${n.data} labels=${n.labels}
          colors=${n.colors} fmtX=${z} fmtY=${ds} logX=${!0} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${l.map((c,d)=>r`<div key=${c.model} class="hbar-row">
            <span class="hbar-label" title=${c.model}>${c.model.replace(/^claude-/,"")||c.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${"width:"+Math.round(c.avg_ms/o*100)+"%;background:"+sn[d%sn.length]}></div>
              <div class="hbar-p95" style=${"left:"+Math.round(c.p95_ms/o*100)+"%"} title=${"p95: "+ds(c.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ds(c.avg_ms)}</span>
            <span class="badge">${c.count}</span>
          </div>`)}
        </div>
        ${l.length>0&&r`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${uo} mode="scatter" data=${a.data} labels=${a.labels}
          colors=${a.colors} fmtX=${zf} fmtY=${ds} logX=${!0} height=${200}/>
      </div>
    </div>
  </div>`}const Ff={"claude-code":"#8b5cf6",codex:"#f97316",aider:"#06b6d4",cursor:"#f472b6"};function _c(e,t){return Ff[e]||sn[t%sn.length]}function Qi({by_cli:e,total:t,barWidth:s,cliTools:n}){return!e||!e.length?r`<div class="hbar-fill" style=${"width:"+s+"%;background:var(--accent)"}></div>`:e.map((l,o)=>{const a=l.count/t*s,i=_c(l.cli_tool,n.indexOf(l.cli_tool));return r`<div key=${l.cli_tool}
      style=${"width:"+a.toFixed(1)+"%;background:"+i+";height:100%;display:inline-block"}
      title=${l.cli_tool+": "+l.count}></div>`})}function If({data:e}){if(!e||!e.invocations||!e.invocations.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      <p class="empty-state">${e!=null&&e.total_all_time?"No tool invocation data in this time range. Try a wider range ("+e.total_all_time+" invocations exist).":"No tool invocation data yet. Configure Claude Code hooks to capture tool usage."}</p>
    </div>`;const t=e.invocations,s=e.cli_tools||[],n=Math.max(1,...t.map(o=>o.count)),l=Math.max(1,...t.map(o=>o.p95_ms));return r`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    ${s.length>1&&r`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${s.map((o,a)=>r`<span key=${o} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${"width:10px;height:10px;border-radius:2px;background:"+_c(o,a)}></span>
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
              <${Qi} by_cli=${o.by_cli} total=${o.count}
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
              <${Qi} by_cli=${o.by_cli} total=${o.count}
                barWidth=${Math.round(o.avg_ms/l*100)} cliTools=${s}/>
              <div class="hbar-p95" style=${"left:"+Math.round(o.p95_ms/l*100)+"%"} title=${"p95: "+ds(o.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ds(o.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`}function Nf({data:e}){const[t,s]=q(!1);if(!e)return null;const n=e.memory_timeline||{},l=e.memory_events||[],o=Object.keys(n);if(!o.length&&!l.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <p class="empty-state">No file write data in this time range.</p>
    </div>`;const a=t?o:o.slice(0,6);return r`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>

    ${o.length>0&&r`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${o.length} files)</div>
      <div class="analytics-charts">
        ${a.map(i=>{const c=n[i];if(!c||c.ts.length<2)return r`<div key=${i} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${i}>${po(i)}</span>
              <span class="chart-val text-muted">${c&&c.size_bytes.length?ge(c.size_bytes[c.size_bytes.length-1]):"-"}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;const d=c.size_bytes[c.size_bytes.length-1];return r`<div key=${i} class="diag-card">
            <${Xt} label=${po(i)} value=${ge(d)}
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
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${Mr(i.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${i.path}>${po(i.path)}</td>
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
  </div>`}function jf(){const e=We(Ie),t=e==null?void 0:e.globalRange,[s,n]=q(null),[l,o]=q(!0),[a,i]=q(null);return ae(()=>{o(!0),i(null);const c=(t==null?void 0:t.since)||Date.now()/1e3-86400,d=(t==null?void 0:t.until)||"",v=`/api/analytics?since=${c}${d?"&until="+d:""}`,u=new AbortController,m=setTimeout(()=>u.abort(),15e3);return hd(v,{signal:u.signal}).then(g=>{n(g),i(null)}).catch(g=>{g.name==="AbortError"?i("Request timed out"):(n(null),i(g.message))}).finally(()=>{clearTimeout(m),o(!1)}),()=>{clearTimeout(m),u.abort()}},[t==null?void 0:t.since,t==null?void 0:t.until]),r`<div class="analytics-grid">
    ${l&&r`<p class="loading-state">Loading analytics...</p>`}
    ${a&&r`<p class="error-state">Error: ${a}</p>`}
    ${!l&&!a&&r`<Fragment>
      <${Rf} data=${s==null?void 0:s.response_time}/>
      <${If} data=${s==null?void 0:s.tools}/>
      <${Nf} data=${s==null?void 0:s.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <div style="margin-top:var(--sp-4)"><${Of}/></div>
      </details>
    </Fragment>`}
  </div>`}function us(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function $c(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Bf(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"})}function bc(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function Zi(e){return e?e.replace("claude-","").replace(/-\d{8}$/,""):""}function Hf(e,t){if(!t)return"";let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{return t.slice(0,80)}if(typeof s!="object"||s===null)return String(t).slice(0,80);const n=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const o of n)if(s[o]){let a=String(s[o]);return(o==="file_path"||o==="path")&&a.length>60&&(a=".../"+a.replace(/\\/g,"/").split("/").slice(-2).join("/")),a.slice(0,100)}const l=Object.keys(s);return l.length>0?String(s[l[0]]).slice(0,80):""}const Xi=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],er={Bash:"#1a1a1a"};function tr(e){if(er[e])return er[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return Xi[t%Xi.length]}function Wf(e,t){const s=new Set,n=[],l=(o,a,i)=>{s.has(o)||(s.add(o),n.push({id:o,label:a||o,color:i||"var(--fg2)"}))};l("user","User","var(--green)"),l("tool",t||"AI Tool",Le[t]||"var(--accent)");for(const o of e){if((o.type==="api_call"||o.type==="api_response"||o.type==="error")&&l("api","API","var(--accent)"),o.type==="tool_use"){const a=o.to||"tool";l("skill:"+a,a,tr(a))}if(o.type==="subagent"){const a=o.to||"Subagent";l("subagent:"+a,a,tr(a))}o.type==="hook"&&l("hook","Hooks","var(--orange)")}return n}function qf({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:r`<div class="sf-tool-tabs">
    ${e.map(n=>r`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?Le[n]||"var(--accent)":"transparent"};color:${Le[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${ft[n]||"🔹"}</span> ${K(n)}
    </button>`)}
  </div>`}function Vf(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function Uf({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?r`<div class="sf-sess-tabs">
    ${e.map(l=>{const o=l.exact_input_tokens||l.input_tokens||0,a=l.exact_output_tokens||l.output_tokens||0,i=o+a,c=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),d=l.session_id===t,v=!l.ended_at;return r`<button key=${l.session_id}
        title=${l.session_id}
        class="sf-sess-tab ${d?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${Bf(l.started_at)}</span>
        <span class="sf-stab-sid">${Vf(l.session_id)}</span>
        <span class="sf-stab-dur">${$c(c)}</span>
        ${i>0&&r`<span class="sf-stab-tok">${z(i)}t</span>`}
        ${(l.files_modified||0)>0&&r`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${v&&r`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:r`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function Gf({event:e}){if(e.type==="user_message")return e.redacted?r`<div class="sf-seq-tooltip">
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
        ${e.duration_ms>0?"Duration: "+us(e.duration_ms):""}
        ${e.ttft_ms>0?" · TTFT: "+us(e.ttft_ms):""}
      </div>
      ${e.is_error&&r`<div class="sf-tip-meta" style="color:var(--red)">Error: ${K(e.error_type||"unknown")}</div>`}
    </div>`}if(e.type==="api_response"){const t=e.tokens||{};return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${e.model?" — "+e.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${z(t.output||0)} tokens
        ${e.duration_ms>0?" · Latency: "+us(e.duration_ms):""}
        ${e.finish_reason?" · "+e.finish_reason:""}
      </div>
      ${e.response_preview&&r`<div class="sf-tip-body">${K(e.response_preview)}</div>`}
    </div>`}if(e.type==="error")return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${K(e.error_type||"unknown")}</div>
      ${e.error_message&&r`<div class="sf-tip-body">${K(e.error_message)}</div>`}
      ${e.parent_span&&r`<div class="sf-tip-meta">During: ${K(e.parent_span)}</div>`}
    </div>`;if(e.type==="tool_use"){let t=null;if(e.params){let s=e.params;if(typeof s=="string")try{s=JSON.parse(s)}catch{s=null}s&&typeof s=="object"&&(t=Object.entries(s).filter(([n,l])=>l!=null&&l!==""))}return r`<div class="sf-seq-tooltip">
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
        ${e.duration_ms>0?" · "+us(e.duration_ms):""}
        ${e.result_size?" · Result: "+e.result_size+" bytes":""}
      </div>`}
    </div>`}return e.type==="subagent"?r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${K(e.to||"agent")}</div>
    </div>`:e.type==="hook"?r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${K(e.hook_name||"")}</div>
    </div>`:null}function Yf({event:e,participants:t,hoveredIdx:s,idx:n,onHover:l}){const o=t.findIndex(k=>k.id===e._from),a=t.findIndex(k=>k.id===e._to);if(o<0||a<0)return null;const i=a>o,c=Math.min(o,a),d=Math.max(o,a),v=s===n,u=t.find(k=>k.id===e._to),g={user_message:"var(--green)",api_call:e.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:(u==null?void 0:u.color)||"var(--cat-commands)",subagent:(u==null?void 0:u.color)||"var(--yellow)",hook:"var(--orange)"}[e.type]||"var(--fg2)";let x="",E="";if(e.type==="user_message")e.redacted?x="🔒 prompt ("+(e.prompt_length||"?")+" chars)":(x=e.preview||"(prompt)",e.prompt_length&&(E=e.prompt_length+" chars"));else if(e.type==="api_call"){const k=e.tokens||{};x=e.agent_name||Zi(e.model)||"API call",E=z((k.input||0)+(k.output||0))+"t",e.ttft_ms>0?E+=" ttft:"+us(e.ttft_ms):e.duration_ms>0&&(E+=" "+us(e.duration_ms)),e.is_error&&(E+=" ⚠")}else if(e.type==="api_response"){const k=e.tokens||{};x="← "+z(k.output||0)+"t",e.response_preview&&(x+=" "+e.response_preview.slice(0,60)),E=Zi(e.model)||"",e.finish_reason&&e.finish_reason!=="stop"&&(E+=" ["+e.finish_reason+"]")}else if(e.type==="error")x="⚠ "+(e.error_type||"error"),E=e.error_message?e.error_message.slice(0,60):"";else if(e.type==="tool_use"){const k=e.to||"tool",T=Hf(k,e.params);x=k+(T?": "+T:""),e.subtype==="result"?(E=e.success==="true"||e.success===!0?"✓":"✗",e.duration_ms>0&&(E+=" "+us(e.duration_ms)),e.result_size&&(E+=" "+e.result_size+"B")):e.subtype==="decision"&&(E=e.decision||"")}else e.type==="subagent"?x=e.to||"subagent":e.type==="hook"&&(x=e.hook_name||"hook");const S=100/t.length,y=(c+.5)*S,$=(d+.5)*S;return r`<div class="sf-seq-row ${v?"hovered":""}"
    onMouseEnter=${()=>l(n)} onMouseLeave=${()=>l(null)}>
    <!-- Token columns (left side) -->
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${e._cumTok>0?z(e._cumTok):""}</span>
      <span class="sf-seq-rttok">${e._rtTok>0?z(e._rtTok):""}</span>
    </div>
    <!-- Time -->
    <div class="sf-seq-time">${bc(e.ts)}</div>
    <!-- Arrow area -->
    <div class="sf-seq-arrow-area">
      <!-- Swimlane lines -->
      ${t.map((k,T)=>r`<div key=${T} class="sf-seq-lane"
        style="left:${(T+.5)*S}%"></div>`)}
      <!-- Arrow line -->
      <div class="sf-seq-arrow-line" style="
        left:${y}%;
        width:${$-y}%;
        border-color:${g};
      "></div>
      <!-- Arrowhead -->
      <div class="sf-seq-arrowhead" style="
        left:${i?$:y}%;
        border-${i?"left":"right"}-color:${g};
        transform:translateX(${i?"-100%":"0"});
      "></div>
      <!-- Label -->
      <div class="sf-seq-label" style="
        left:${(y+$)/2}%;
        color:${g};
      "><span class="sf-seq-label-text" title=${x}>${K(x)}</span>
        ${E&&r`<span class="sf-seq-sublabel">${E}</span>`}
      </div>
    </div>
    <!-- Hover tooltip -->
    ${v&&r`<${Gf} event=${e}/>`}
  </div>`}function Kf({event:e,participants:t}){100/t.length;let s="",n="var(--fg2)",l="";return e.type==="session_start"?(s="Session started",n="var(--green)",l="▶"):e.type==="session_end"?(s="Session ended",n="var(--fg3)",l="■"):e.type==="compaction"&&(s="Compaction"+(e.compaction_count?" #"+e.compaction_count:""),n="var(--orange)",l="⟳"),r`<div class="sf-seq-marker" style="border-left-color:${n}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${bc(e.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${n}">
      ${l} ${s}
      ${e.type==="compaction"&&e.duration_ms>0?" — "+us(e.duration_ms):""}
      ${e.cwd?r` <span class="text-muted text-xs mono">${K(e.cwd)}</span>`:""}
    </div>
  </div>`}function Jf({summary:e}){return!e||!e.event_count?null:r`<div class="sf-summary">
    ${e.total_turns>0&&r`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${e.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${e.total_api_calls||0}</div></div>
    ${e.total_tool_uses>0&&r`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${e.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${z(e.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${z(e.total_input_tokens)}/${z(e.total_output_tokens)}</div></div>
    ${e.compactions>0&&r`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${e.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${$c(e.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${e.event_count}</div></div>
  </div>`}function Qf(){const{snap:e,globalRange:t,enabledTools:s}=We(Ie),[n,l]=q([]),[o,a]=q(!0),[i,c]=q(null),[d,v]=q(null),[u,m]=q(null),[g,x]=q(!1),[E,S]=q(null);ae(()=>{a(!0);const P=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,b=t==null?void 0:t.until;gl(null,{since:P,until:b}).then(C=>{C.sort((A,F)=>(F.started_at||0)-(A.started_at||0)),l(C),a(!1)}).catch(()=>a(!1))},[t]);const y=P=>s===null||s.includes(P),$=n.filter(P=>y(P.tool)),k=[...new Set($.map(P=>P.tool))].sort();ae(()=>{(!i&&k.length>0||i&&!k.includes(i)&&k.length>0)&&c(k[0])},[k.join(",")]);const T=$.filter(P=>P.tool===i);ae(()=>{T.length>0&&(!d||!T.find(P=>P.session_id===d))&&v(T[0].session_id)},[i,T.length]),ae(()=>{if(!d){m(null);return}x(!0);const P=n.find(A=>A.session_id===d),b=P!=null&&P.started_at?P.started_at-60:Date.now()/1e3-86400,C=P!=null&&P.ended_at?P.ended_at+60:Date.now()/1e3+60;qo(d,b,C).then(A=>{m(A),x(!1)}).catch(()=>{m(null),x(!1)})},[d]);const{processedTurns:H,participants:D}=re(()=>{const P=(u==null?void 0:u.turns)||[];if(!P.length)return{processedTurns:[],participants:[]};const b=P.map(I=>{const R={...I};return I.type==="user_message"?(R._from="user",R._to="tool"):I.type==="api_call"?(R._from=I.from||"tool",R._to="api"):I.type==="api_response"||I.type==="error"?(R._from="api",R._to="tool"):I.type==="tool_use"?(R._from="tool",R._to="skill:"+(I.to||"tool")):I.type==="subagent"?(R._from="tool",R._to="subagent:"+(I.to||"agent")):I.type==="hook"&&(R._from="tool",R._to="hook"),R});let C=0,A=0;for(const I of b){const R=I.tokens||{},U=(R.input||0)+(R.output||0);I.type==="user_message"&&(A=0),I.type==="api_call"&&(C+=U,A+=U),I._cumTok=C,I._rtTok=A}const F=Wf(b,i);return{processedTurns:b,participants:F}},[u,i]),O=(u==null?void 0:u.summary)||{};return H.filter(P=>P._from&&P._to),H.filter(P=>!P._from||!P._to),r`<div class="sf-container">
    <!-- Tool tabs -->
    <${qf} tools=${k} activeTool=${i} onSelect=${c}/>

    <!-- Session tabs -->
    <${Uf} sessions=${T} activeId=${d}
      onSelect=${v} loading=${o}/>

    <!-- Summary -->
    <${Jf} summary=${O}/>

    <!-- Sequence diagram -->
    <div class="sf-seq-container">
      ${g?r`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`:H.length===0?r`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No flow data for this session.</p>
              <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
                Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
              </p>
            </div>`:r`
            <!-- Participant headers (swimlane columns) -->
            <div class="sf-seq-header">
              <div class="sf-seq-tokens">
                <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
              </div>
              <div class="sf-seq-time"></div>
              <div class="sf-seq-arrow-area">
                ${D.map((P,b)=>{const C=100/D.length;return r`<div key=${P.id} class="sf-seq-participant"
                    style="left:${(b+.5)*C}%;color:${P.color}">
                    <div class="sf-seq-participant-box" style="border-color:${P.color}">${K(P.label)}</div>
                  </div>`})}
              </div>
            </div>
            <!-- Event rows -->
            <div class="sf-seq-body">
              ${H.map((P,b)=>P._from&&P._to?r`<${Yf} key=${b} event=${P} participants=${D}
                    hoveredIdx=${E} idx=${b} onHover=${S}/>`:r`<${Kf} key=${b} event=${P} participants=${D}/>`)}
            </div>
          `}
    </div>
  </div>`}function Cl(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function yc(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function xc(e){return e?e.replace("claude-","").replace("gpt-","").replace(/-\d{8}$/,""):""}function zo(e,t){return e?e.length>t?e.slice(0,t)+"…":e:""}const Zf={tool_use:"🔧",api_call:"🌐",api_response:"📨",file_edit:"📝",compaction:"🗜️",subagent:"🤖",error:"❌"},Xf={tool_use:"var(--accent)",api_call:"var(--green)",api_response:"var(--fg2)",file_edit:"var(--orange)",compaction:"var(--yellow)",subagent:"var(--accent)",error:"var(--red)"};function ev({tools:e,activeTool:t,onSelect:s}){return e.length?r`<div class="sf-tool-tabs" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);flex-wrap:wrap">
    ${e.map(n=>r`<button key=${n}
      class="chip ${n===t?"chip-active":""}"
      onClick=${()=>s(n)}
      style="font-size:var(--fs-sm);padding:var(--sp-2) var(--sp-4)">
      ${K(n)}
    </button>`)}
  </div>`:null}function tv({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions…</div>`:e.length?r`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${e.slice(0,20).map(l=>{const o=l.session_id===t,a=l.ended_at?Math.round(l.ended_at-l.started_at):0,i=a>0?Cl(a*1e3):"⏳ live",c=yc(l.started_at);return r`<button key=${l.session_id}
        class="tr-sess-btn ${o?"tr-sess-active":""}"
        onClick=${()=>s(l.session_id)}
        title=${l.session_id}>
        <span class="tr-sess-time">${c}</span>
        <span class="tr-sess-dur">${i}</span>
        ${l.is_live?r`<span class="tr-sess-live">●</span>`:null}
      </button>`})}
  </div>`:r`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`}function sv({turn:e,index:t,expanded:s,onToggle:n}){const l=e.prompt&&e.prompt.length>0,o=e.actions||[],a=o.filter(m=>m.kind==="tool_use"),i=o.filter(m=>m.kind==="api_call"),c=o.filter(m=>m.kind==="error"),d=e.tokens||{},v=(d.input||0)+(d.output||0),u=e.wall_ms||e.duration_ms||0;return r`<div class="tr-turn ${s?"tr-turn-expanded":""}">
    <!-- Turn header (always visible) -->
    <div class="tr-turn-header" onClick=${n}>
      <div class="tr-turn-num">${t+1}</div>
      <div class="tr-turn-meta">
        <span class="tr-turn-time">${yc(e.ts)}</span>
        ${e.model?r`<span class="tr-turn-model">${xc(e.model)}</span>`:null}
        ${u>0?r`<span class="tr-turn-dur">${Cl(u)}</span>`:null}
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
      <div class="tr-prompt-text">${s?e.prompt:zo(e.prompt_preview||e.prompt,120)}</div>
    </div>`:r`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon">👤</div>
      <div class="tr-prompt-text text-muted">(no prompt captured)</div>
    </div>`}

    <!-- Expanded: action timeline + token breakdown -->
    ${s&&o.length>0?r`<div class="tr-actions">
      ${o.map((m,g)=>r`<${nv} key=${g} action=${m} turnTs=${e.ts}/>`)}
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
  </div>`}function nv({action:e,turnTs:t}){const s=Zf[e.kind]||"•",n=Xf[e.kind]||"var(--fg2)",l=e.ts-t,o=l>0?"+"+(l<1?l.toFixed(1):Math.round(l))+"s":"",a=e.duration_ms>0?Cl(e.duration_ms):"",i=e.tokens,c=i?z((i.input||0)+(i.output||0)):"";return r`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${n}">${s}</span>
    <span class="tr-action-name" style="color:${n}">${K(e.name||e.kind)}</span>
    ${e.input_summary?r`<span class="tr-action-args">${K(zo(e.input_summary,80))}</span>`:null}
    ${e.output_summary?r`<span class="tr-action-result">${K(zo(e.output_summary,60))}</span>`:null}
    <span class="tr-action-meta">
      ${o?r`<span class="tr-action-offset">${o}</span>`:null}
      ${a?r`<span class="tr-action-dur">${a}</span>`:null}
      ${c?r`<span class="tr-action-tok">🪙 ${c}</span>`:null}
      ${e.success===!1?r`<span class="tr-action-fail">✗</span>`:null}
      ${e.success===!0?r`<span class="tr-action-ok">✓</span>`:null}
    </span>
  </div>`}function lv({summary:e,transcript:t}){return e?r`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns">💬 ${e.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls">🌐 ${e.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses">🔧 ${e.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens">🪙 ${z(e.total_tokens||0)}</span>
    ${e.compactions>0?r`<span class="tr-summary-item" title="Compactions">🗜️ ${e.compactions}</span>`:null}
    ${e.errors>0?r`<span class="tr-summary-item tr-stat-err" title="Errors">❌ ${e.errors}</span>`:null}
    ${e.subagents>0?r`<span class="tr-summary-item" title="Subagents">🤖 ${e.subagents}</span>`:null}
    ${e.duration_s>0?r`<span class="tr-summary-item" title="Duration">⏱️ ${Cl(e.duration_s*1e3)}</span>`:null}
    ${t!=null&&t.model?r`<span class="tr-summary-item" title="Model">🧠 ${xc(t.model)}</span>`:null}
    ${t!=null&&t.is_live?r`<span class="tr-summary-live">● LIVE</span>`:null}
    <span class="tr-summary-source">${e.source||""}</span>
  </div>`:null}function ov(){const{snap:e,globalRange:t,enabledTools:s}=We(Ie),[n,l]=q([]),[o,a]=q(!0),[i,c]=q(null),[d,v]=q(null),[u,m]=q(null),[g,x]=q(!1),[E,S]=q(new Set),[y,$]=q(!1),[k,T]=q(!0);ae(()=>{a(!0);const R=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,U=t==null?void 0:t.until;gl(null,{since:R,until:U}).then(te=>{te.sort((L,B)=>(B.started_at||0)-(L.started_at||0)),l(te),a(!1)}).catch(()=>a(!1))},[t]);const H=R=>s===null||s.includes(R),D=n.filter(R=>H(R.tool)),O=[...new Set(D.map(R=>R.tool))].sort();ae(()=>{(!i&&O.length>0||i&&!O.includes(i)&&O.length>0)&&c(O[0])},[O.join(",")]);const P=D.filter(R=>R.tool===i);ae(()=>{P.length>0&&(!d||!P.find(R=>R.session_id===d))&&v(P[0].session_id)},[i,P.length]);const b=ye(()=>{if(!d){m(null);return}x(!0),md(d).then(R=>{av(R)?m(sr(R,d)):m(R),x(!1)}).catch(()=>{const R=n.find(L=>L.session_id===d),U=R!=null&&R.started_at?R.started_at-60:Date.now()/1e3-86400,te=R!=null&&R.ended_at?R.ended_at+60:Date.now()/1e3+60;qo(d,U,te).then(L=>{m(sr(L,d)),x(!1)}).catch(()=>{m(null),x(!1)})})},[d,n]);ae(b,[b]),ae(()=>{if(!k||!(u!=null&&u.is_live))return;const R=setInterval(b,5e3);return()=>clearInterval(R)},[k,u==null?void 0:u.is_live,b]);const C=ye(R=>{S(U=>{const te=new Set(U);return te.has(R)?te.delete(R):te.add(R),te})},[]),A=ye(()=>{const R=(u==null?void 0:u.turns)||[];y?(S(new Set),$(!1)):(S(new Set(R.map((U,te)=>te))),$(!0))},[y,u]),F=((u==null?void 0:u.turns)||[]).filter(R=>R.prompt&&R.prompt.length>0||R.actions&&R.actions.length>0||R.tool_use_count>0),I=(u==null?void 0:u.summary)||null;return r`<div class="tr-container">
    <!-- Header -->
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${F.length>0?r`<button class="chip" onClick=${A}
          style="font-size:var(--fs-xs)">
          ${y?"⊟ Collapse all":"⊞ Expand all"}
        </button>`:null}
        ${u!=null&&u.is_live?r`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${k}
            onChange=${R=>T(R.target.checked)}/>
          Auto-refresh
        </label>`:null}
      </div>
    </div>

    <!-- Tool tabs -->
    <${ev} tools=${O} activeTool=${i} onSelect=${c}/>

    <!-- Session selector -->
    <${tv} sessions=${P} activeId=${d}
      onSelect=${v} loading=${o}/>

    <!-- Summary bar -->
    <${lv} summary=${I} transcript=${u}/>

    <!-- Turns list -->
    <div class="tr-turns">
      ${g?r`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript…</div>`:F.length===0?r`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                Prompts require hooks enabled: set <code>AICTL_URL</code> in your tool config
              </p>
            </div>`:F.map((R,U)=>r`<${sv}
              key=${U} turn=${R} index=${U}
              expanded=${E.has(U)}
              onToggle=${()=>C(U)}/>`)}
    </div>
  </div>`}function av(e){if(!e||!e.turns||e.turns.length===0)return!1;const t=e.turns[0];return t.type!=null&&t.actions==null}function sr(e,t){if(!e||!e.turns)return null;const s=e.turns||[],n=[];let l=null;const o={api_call:"api_call",api_response:"api_response",tool_use:"tool_use",subagent:"subagent",error:"error",hook:"tool_use"};for(const a of s)if(a.type==="user_message"){if(l&&n.push(l),l={ts:a.ts,end_ts:a.end_ts||a.ts,prompt:a.message||"",prompt_preview:a.preview||(a.message||"").slice(0,200),model:a.model||"",tokens:a.tokens||{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:a.api_calls||0,duration_ms:a.duration_ms||0,wall_ms:a.wall_ms||0,actions:[],tool_use_count:0},a.tools&&a.tools.length>0){for(const i of a.tools)l.actions.push({ts:i.ts||a.ts,kind:i.is_agent?"subagent":"tool_use",name:i.name||"",input_summary:i.args_summary||"",duration_ms:i.duration_ms||0});l.tool_use_count=a.tools.length}}else{if(a.type==="session_start"||a.type==="session_end")continue;if(a.type==="compaction")continue;if(l){const i=o[a.type];i&&(l.actions.push({ts:a.ts,kind:i,name:a.model||a.to||a.tool_name||a.hook_name||"",input_summary:a.params||a.decision||"",output_summary:a.response_preview||a.error_message||"",duration_ms:a.duration_ms||0,tokens:a.tokens,success:a.success==="true"?!0:a.success==="false"?!1:void 0}),i==="tool_use"&&l.tool_use_count++,i==="api_call"&&a.tokens&&(l.tokens.input+=a.tokens.input||0,l.tokens.output+=a.tokens.output||0,l.tokens.cache_read+=a.tokens.cache_read||0,l.api_calls++))}else{const i=o[a.type];i&&i!=="api_response"&&(l={ts:a.ts,end_ts:a.ts,prompt:"",prompt_preview:"",model:a.model||"",tokens:{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:0,duration_ms:0,wall_ms:0,actions:[],tool_use_count:0},l.actions.push({ts:a.ts,kind:i,name:a.model||a.to||a.tool_name||"",input_summary:a.params||a.decision||"",output_summary:a.response_preview||a.error_message||"",duration_ms:a.duration_ms||0,tokens:a.tokens,success:a.success==="true"?!0:a.success==="false"?!1:void 0}),i==="tool_use"&&l.tool_use_count++,i==="api_call"&&a.tokens&&(l.tokens.input+=a.tokens.input||0,l.tokens.output+=a.tokens.output||0,l.tokens.cache_read+=a.tokens.cache_read||0,l.api_calls++))}}l&&n.push(l);for(const a of n)if(a.tokens.total=(a.tokens.input||0)+(a.tokens.output||0),a.actions.length>0){const i=a.actions[a.actions.length-1];a.end_ts=Math.max(a.end_ts||0,i.ts+(i.duration_ms||0)/1e3)}return{session_id:t,turns:n,summary:e.summary||{},is_live:!1}}const nr=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],lr={Bash:"#6b7280",Read:"#60a5fa",Edit:"#34d399",Write:"#22d3ee",Grep:"#fbbf24",Glob:"#a78bfa",Agent:"#f472b6",Prompt:"var(--green)",Compaction:"var(--yellow)",Error:"var(--red)"};function dl(e){if(!e)return"var(--fg2)";if(lr[e])return lr[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return nr[t%nr.length]}function Ro(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}function iv(e){return e?new Date(e*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function rv(e){return e?e<1e3?e+"ms":(e/1e3).toFixed(1)+"s":""}function kc(e){if(!e||e<=0)return"0s";if(e<60)return Math.round(e)+"s";const t=Math.floor(e/60),s=Math.round(e%60);if(e<3600)return t+"m"+(s?" "+s+"s":"");const n=Math.floor(t/60),l=t%60;return n+"h"+(l?" "+l+"m":"")}function cv(e){return e<60?Math.round(e)+"s":e<3600?Math.round(e/60)+"m":e<86400?(e/3600).toFixed(1)+"h":(e/86400).toFixed(1)+"d"}function dv(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function ia(e){const t=e.tokens||{};return(t.input||0)+(t.output||0)}function ra(e){const t=e.tokens||{};return(t.cache_read||0)+(t.cache_creation||0)}function uv(e){return ia(e)+ra(e)}function or(e,t){return t==="fresh"?ia(e):t==="cached"?ra(e):uv(e)}function ul(e){return e.type==="user_message"?"Prompt":e.type==="api_call"||e.type==="api_response"?e.model||"API":e.type==="tool_use"?e.to||e.name||"Tool":e.type==="subagent"?e.to||"Agent":e.type==="compaction"?"Compaction":e.type==="error"?"Error":e.type==="hook"?e.hook_name||"Hook":e.type||"?"}function pv({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:r`<div class="sf-tool-tabs">
    ${e.map(n=>r`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?Le[n]||"var(--accent)":"transparent"};color:${Le[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${ft[n]||"🔹"}</span> ${K(n)}
    </button>`)}
  </div>`}function fv({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?r`<div class="sf-sess-tabs">
    ${e.map(l=>{const o=(l.exact_input_tokens||l.input_tokens||0)+(l.exact_output_tokens||l.output_tokens||0),a=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),i=l.session_id===t;return r`<button key=${l.session_id} title=${l.session_id}
        class="sf-sess-tab ${i?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${Ro(l.started_at)}</span>
        <span class="sf-stab-sid">${dv(l.session_id)}</span>
        <span class="sf-stab-dur">${kc(a)}</span>
        ${o>0&&r`<span class="sf-stab-tok">${z(o)}t</span>`}
        ${(l.files_modified||0)>0&&r`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${!l.ended_at&&r`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:r`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function vv({bar:e,x:t,y:s}){if(!e)return null;const n=e,l=n.tokens||{},o=ul(n);return r`<div class="tc-tooltip" style="left:${t}px;top:${s}px">
    <div style="font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
      <span class="tc-legend-swatch" style="background:${dl(o)}"></span>
      ${K(o)}
    </div>
    <div class="tc-tip-row"><span class="tc-tip-label">Time</span><span>${iv(n.ts)}</span></div>
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
      <div class="tc-tip-row"><span class="tc-tip-label">Duration</span><span>${rv(n.duration_ms)}</span></div>`}
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
  </div>`}function mv({summary:e}){if(!e||!e.total_tokens)return null;const t=[["Prompts",e.total_turns],["API Calls",e.total_api_calls],["Tools",e.total_tool_uses],["Tokens",z(e.total_tokens)],["Duration",kc(e.duration_s)]].filter(([,s])=>s);return r`<div class="tc-summary">
    ${t.map(([s,n])=>r`<div class="tc-summary-item">
      <div class="tc-summary-val">${n}</div>
      <div class="tc-summary-label">${s}</div>
    </div>`)}
  </div>`}const ar=110,hv=30;function gv(e){const t=[];for(let s=0;s<e.length;s++){if(s>0){const n=e[s].ts-e[s-1].ts;n>hv&&t.push({type:"gap",endTs:e[s-1].ts,startTs:e[s].ts,gap:n})}t.push({type:"bar",bar:e[s]})}return t}function _v({entities:e,selected:t,onToggle:s,onAll:n,onNone:l}){return r`<div class="tc-filter">
    <span class="tc-filter-label">Entities</span>
    <button class="tc-filter-btn" onClick=${n}>All</button>
    <button class="tc-filter-btn" onClick=${l}>None</button>
    ${e.map(o=>{const a=t.has(o);return r`<label key=${o} class="tc-filter-check ${a?"active":""}"
        style="--swatch:${dl(o)}">
        <input type="checkbox" checked=${a}
          onChange=${()=>s(o)}/>
        <span class="tc-legend-swatch" style="background:${dl(o)}"></span>
        ${K(o)}
      </label>`})}
  </div>`}function $v({mode:e,onChange:t}){return r`<div class="tc-filter">
    <span class="tc-filter-label">Tokens</span>
    ${[["all","All Tokens"],["fresh","Non-Cached"],["cached","Cached Only"]].map(([n,l])=>r`<label key=${n}
      class="tc-filter-check ${e===n?"active":""}">
      <input type="radio" name="tc-tok-mode" checked=${e===n}
        onChange=${()=>t(n)}/>
      ${l}
    </label>`)}
  </div>`}function bv({bars:e,tokenMode:t,onHover:s,onLeave:n}){if(!e.length)return r`<div class="empty-state" style="padding:var(--sp-8)">
    <p>No matching events.</p>
  </div>`;const l=gv(e),o=Math.max(1,...e.map(a=>or(a,t)));return r`<div class="tc-flow">
    ${l.map((a,i)=>{if(a.type==="gap")return r`<div key=${"g"+i} class="tc-flow-gap">
          <span class="tc-gap-label">${Ro(a.endTs)}</span>
          <span class="tc-gap-dots">\u00b7\u00b7 ${cv(a.gap)} \u00b7\u00b7</span>
          <span class="tc-gap-label">${Ro(a.startTs)}</span>
        </div>`;const c=a.bar,d=or(c,t),v=o>0?Math.max(.08,Math.log1p(d)/Math.log1p(o)):.08,u=Math.max(6,v*ar),m=ul(c),g=dl(m),x=ia(c),E=ra(c),S=x+E;let y,$;t==="cached"?(y=0,$=100):t==="fresh"?(y=100,$=0):S>0?(y=Math.round(x/S*100),$=100-y):(y=100,$=0);const k=$>0;return r`<div key=${i} class="tc-flow-bar"
        style="height:${ar}px"
        onMouseEnter=${T=>s(c,T)}
        onMouseLeave=${n}>
        <div class="tc-flow-fill ${k?"tc-split":""}"
          style="height:${u}px;--bar-color:${g}">
          ${k&&r`
            ${y>0&&r`<div class="tc-fill-fresh" style="height:${y}%"></div>`}
            <div class="tc-fill-cached" style="height:${y>0?$:100}%"></div>`}
        </div>
      </div>`})}
  </div>`}function yv(){const{snap:e,globalRange:t,enabledTools:s}=We(Ie),[n,l]=q([]),[o,a]=q(!0),[i,c]=q(null),[d,v]=q(null),[u,m]=q(null),[g,x]=q(!1),[E,S]=q(null),[y,$]=q(null),[k,T]=q("all"),H=nt(null);ae(()=>{a(!0);const j=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,ne=t==null?void 0:t.until;gl(null,{since:j,until:ne}).then(ee=>{ee.sort((G,be)=>(be.started_at||0)-(G.started_at||0)),l(ee),a(!1)}).catch(()=>a(!1))},[t]);const D=j=>s===null||s.includes(j),O=n.filter(j=>D(j.tool)),P=[...new Set(O.map(j=>j.tool))].sort();ae(()=>{(!i&&P.length>0||i&&!P.includes(i)&&P.length>0)&&c(P[0])},[P.join(",")]);const b=O.filter(j=>j.tool===i);ae(()=>{b.length>0&&(!d||!b.find(j=>j.session_id===d))&&v(b[0].session_id)},[i,b.length]),ae(()=>{if(!d){m(null);return}x(!0);const j=n.find(G=>G.session_id===d),ne=j!=null&&j.started_at?j.started_at-60:Date.now()/1e3-86400,ee=j!=null&&j.ended_at?j.ended_at+60:Date.now()/1e3+60;qo(d,ne,ee).then(G=>{m(G),x(!1),$(null)}).catch(()=>{m(null),x(!1)})},[d]);const{allBars:C,allEntities:A}=re(()=>{const ne=((u==null?void 0:u.turns)||[]).filter(G=>["user_message","api_call","api_response","tool_use","compaction","subagent","error","hook"].includes(G.type)),ee=new Set;for(const G of ne)ee.add(ul(G));return{allBars:ne,allEntities:[...ee].sort()}},[u]),F=y||new Set(A),I=re(()=>C.filter(j=>F.has(ul(j))),[C,F]),R=ye(j=>{$(ne=>{const ee=new Set(ne||A);return ee.has(j)?ee.delete(j):ee.add(j),ee})},[A]),U=ye(()=>$(null),[]),te=ye(()=>$(new Set),[]),L=ye((j,ne)=>{var Pe;const ee=(Pe=H.current)==null?void 0:Pe.getBoundingClientRect();if(!ee)return;const G=Math.min(ne.clientX-ee.left+12,ee.width-320),be=ne.clientY-ee.top+12;S({bar:j,x:G,y:be})},[]),B=ye(()=>S(null),[]),Y=(u==null?void 0:u.summary)||{};return r`<div class="tc-container" ref=${H}>
    <${pv} tools=${P} activeTool=${i} onSelect=${c}/>
    <${fv} sessions=${b} activeId=${d}
      onSelect=${v} loading=${o}/>
    <${mv} summary=${Y}/>

    ${g?r`<div class="loading-state" style="padding:var(--sp-8)">Loading timeline...</div>`:C.length===0?r`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
          </div>`:r`
          <div class="tc-controls">
            <${_v} entities=${A} selected=${F}
              onToggle=${R} onAll=${U} onNone=${te}/>
            <${$v} mode=${k} onChange=${T}/>
          </div>
          <${bv} bars=${I} tokenMode=${k}
            onHover=${L} onLeave=${B}/>
          ${E&&r`<${vv} bar=${E.bar} x=${E.x} y=${E.y}/>`}
        `}
  </div>`}const xv={enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).",enabled:"Whether agent/agentic mode is active.",autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode allows the agent to execute tool calls without confirmation prompts. Use with caution.",autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.",skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",vimMode:"Enables Vim-style keybindings in the Gemini CLI.",approvalMode:"Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).",notifications:"Enables OS notifications for prompt alerts and session completion.",respectGeminiIgnore:"Controls whether the CLI respects patterns in .geminiignore files.",additionalIgnores:"Number of extra patterns added to the global file ignore list.",lineNumbers:"Shows line numbers in code blocks within the chat interface.",alternateScreen:"Uses the terminal alternate buffer to preserve shell scrollback history.",hideContext:"Hides the summary of attached files/context above the input prompt.",effort:"Reasoning effort level for the model (e.g., standard, high).",temperature:"Sampling temperature for model requests. 0 = deterministic; higher = more creative.",budget:"Maximum token budget for reasoning/extended thinking.",coreTools:"Number of built-in tools explicitly enabled for the agent.",excludeTools:"Number of tools explicitly disabled for safety or cost control.",customAgents:"Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks.",webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."};function kv(e){return xv[e]||""}function wv({v:e}){return e===!0?r`<span style="color:var(--green);font-weight:600">on</span>`:e===!1?r`<span style="color:var(--red);opacity:0.8">off</span>`:e==null||e===""?r`<span class="text-muted">—</span>`:typeof e=="object"?r`<span class="mono" style="font-size:var(--fs-xs)">${JSON.stringify(e)}</span>`:r`<span class="mono">${String(e)}</span>`}function tn({k:e,v:t,indent:s}){const n=e.replace(/([A-Z])/g," $1").replace(/^./,o=>o.toUpperCase()),l=kv(e);return r`<div
    title=${l}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${s?"var(--sp-6)":"var(--sp-4)"};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${l?"help":"default"}">
    <span style="color:var(--fg2)">${n}${l?r`<span style="color:var(--fg3);margin-left:3px;font-size:0.6em">?</span>`:""}</span>
    <${wv} v=${t}/>
  </div>`}function wc({otel:e}){if(!e||!e.enabled&&!e.source)return null;const t=e.enabled;return r`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:${t?"var(--green)":"var(--fg3)"};padding:var(--sp-2) var(--sp-4) var(--sp-1)">
      OpenTelemetry ${t?"● on":"○ off"}
    </div>
    <div style="border:1px solid ${t?"var(--green)":"var(--bg2)"};border-radius:4px;overflow:hidden;
                background:${t?"color-mix(in srgb,var(--green) 4%,transparent)":"transparent"}">
      ${t&&r`<${tn} k="exporter" v=${e.exporter||"—"}/>`}
      ${e.endpoint&&r`<${tn} k="endpoint" v=${e.endpoint}/>`}
      ${e.file_path&&r`<${tn} k="file_path" v=${e.file_path}/>`}
      ${e.capture_content!==void 0&&r`<${tn} k="capture_content" v=${!!e.capture_content}/>`}
      ${!t&&e.source&&r`<${tn} k="source" v=${e.source}/>`}
    </div>
  </div>`}function Fo({name:e,items:t}){const s=Object.entries(t);return s.length?r`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${e}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${s.map(([n,l])=>r`<${tn} key=${n} k=${n} v=${l}/>`)}
    </div>
  </div>`:null}function Sv({cfg:e,label:t}){var i,c;const s=ft[e.tool]||"🔹",n=Le[e.tool]||"var(--fg2)",l=Object.entries(e.feature_groups||{}),o=Object.entries(e.settings||{}).filter(([d])=>!["agent_historySummarizationMode","agent_maxRequests","debug_requestLoggerMaxEntries","planModel","implementModel"].includes(d));return((i=e.otel)==null?void 0:i.enabled)||((c=e.otel)==null?void 0:c.source)||l.length||o.length||(e.hints||[]).length||(e.mcp_servers||[]).length||(e.extensions||[]).length?r`<div style="background:var(--bg);border:2px solid ${n};border-radius:6px;overflow:hidden;
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
      <${wc} otel=${e.otel}/>
      ${l.map(([d,v])=>r`<${Fo} key=${d} name=${d} items=${v}/>`)}
      ${o.length>0&&r`<${Fo} name="Settings" items=${Object.fromEntries(o)}/>`}
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
  </div>`:null}function Tv({cfg:e}){var o,a,i,c;if(!e)return null;const t=Object.entries(e.feature_groups||{});if(!t.length&&!((o=e.otel)!=null&&o.enabled)&&!((a=e.otel)!=null&&a.source))return null;const n=(((i=e.feature_groups)==null?void 0:i.Safety)||{}).globalAutoApprove===!0,l=(((c=e.feature_groups)==null?void 0:c.Agent)||{}).autoReply===!0;return r`<div style="background:var(--bg);border:2px solid #007acc;border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,#007acc 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid #007acc">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:#007acc">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${n&&r`<span class="badge" style="margin-left:auto;background:var(--red);color:#fff;font-weight:700">⚠ YOLO MODE ON</span>`}
      ${!n&&l&&r`<span class="badge" style="margin-left:auto;background:var(--orange);color:#fff">⚠ auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${wc} otel=${e.otel}/>
      ${t.map(([d,v])=>r`<${Fo} key=${d} name=${d} items=${v}/>`)}
    </div>
  </div>`}function Cv({snap:e}){var l,o,a;const t=Le.aictl||"#94a3b8",s=Object.entries(((l=e==null?void 0:e.live_monitor)==null?void 0:l.diagnostics)||{}),n=[...((o=e==null?void 0:e.live_monitor)==null?void 0:o.workspace_paths)||[],...((a=e==null?void 0:e.live_monitor)==null?void 0:a.state_paths)||[]];return!s.length&&!n.length?null:r`<div style="background:var(--bg);border:2px solid ${t};border-radius:6px;overflow:hidden;
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
  </div>`}function Mv(){const{snap:e}=We(Ie),t=re(()=>e!=null&&e.tool_configs?e.tool_configs:[],[e]),s=re(()=>{const o={};return((e==null?void 0:e.tools)||[]).forEach(a=>{o[a.tool]=a.label}),o},[e]);if(!e)return r`<p class="loading-state">Loading...</p>`;if(!t.length)return r`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const n=t.find(o=>o.tool==="vscode"),l=t.filter(o=>o.tool!=="vscode");return r`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${n&&r`<${Tv} cfg=${n}/>`}
    ${l.map(o=>r`<${Sv} key=${o.tool} cfg=${o} label=${s[o.tool]||o.tool}/>`)}
    <${Cv} snap=${e}/>
  </div>`}const Yn={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},Ev=["project","global","shadow","session","external"],Kn=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function Lv(e,t){const s=Cs(e),n=Cs(t);if(!s)return"(unknown)";if(n&&s.startsWith(n+"/")){const l=s.slice(n.length+1).split("/")[0];return l.startsWith(".")?"(root)":l}return s.includes("/.claude/projects/")?"(shadow)":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")?"(global)":"(other)"}function Av(e){if(!e)return"unknown";const t=Cs(e).split("/"),s=t.pop()||"unknown",n=s.lastIndexOf("."),l=n>0?s.slice(0,n):s;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test(l)){const o=t.pop();if(o)return o}return l}function Dv(){const{snap:e}=We(Ie),[t,s]=q(null),n=re(()=>{if(!e)return null;const o=e.tools.filter(S=>S.tool!=="aictl"&&S.tool!=="any");if(!o.length)return null;const a=e.root||"",i={},c={},d={},v={yes:0,"on-demand":0,conditional:0,no:0};let u=0;for(const S of o)for(const y of S.files){const $=y.kind||"other",k=y.scope||"external",T=(y.sent_to_llm||"no").toLowerCase(),H=y.tokens||0,D=Lv(y.path,a),O=Av(y.path);i[$]||(i[$]={tokens:0,files:0,projects:{}}),i[$].tokens+=H,i[$].files+=1,i[$].projects[D]||(i[$].projects[D]={tokens:0,count:0}),i[$].projects[D].tokens+=H,i[$].projects[D].count+=1,d[D]||(d[D]={tokens:0,count:0,cats:{}}),d[D].tokens+=H,d[D].count+=1,d[D].cats[$]||(d[D].cats[$]={tokens:0,count:0,items:{}}),d[D].cats[$].tokens+=H,d[D].cats[$].count+=1,d[D].cats[$].items[O]||(d[D].cats[$].items[O]=0),d[D].cats[$].items[O]+=H,c[k]||(c[k]={tokens:0,files:0}),c[k].tokens+=H,c[k].files+=1,v[T]!==void 0?v[T]+=H:v.no+=H,u+=H}const m=Object.entries(i).sort((S,y)=>y[1].tokens-S[1].tokens),g=Ev.filter(S=>c[S]).map(S=>[S,c[S]]),x=Object.entries(d).sort((S,y)=>y[1].tokens-S[1].tokens),E=o.map(S=>({tool:S.tool,label:S.label,tokens:S.files.reduce((y,$)=>y+$.tokens,0),files:S.files.length,sentYes:S.files.filter(y=>(y.sent_to_llm||"").toLowerCase()==="yes").reduce((y,$)=>y+$.tokens,0)})).filter(S=>S.tokens>0).sort((S,y)=>y.tokens-S.tokens).slice(0,8);return{cats:m,scopes:g,byPolicy:v,totalTokens:u,perTool:E,byCat:i,byProj:d,projList:x}},[e]);if(!n)return r`<p class="empty-state">No file data available.</p>`;if(!n.totalTokens)return r`<p class="empty-state">No token data collected yet.</p>`;const l=Math.max(...n.cats.map(([,o])=>o.tokens),1);return r`<div class="diag-card" role="region" aria-label="Context window map">
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
        ${n.cats.map(([o,a])=>{const i=a.tokens/n.totalTokens*100;return i<.5?null:r`<div key=${o} style="width:${i}%;background:${Yn[o]||"var(--fg2)"};
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
          <span class="text-bold text-right" style="width:80px;color:${Yn[o]||"var(--fg2)"};flex-shrink:0">${o}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${c}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${i.map(([d,v],u)=>{const m=a.tokens>0?v.tokens/a.tokens*100:0;if(m<.5)return null;const g=!t||t===d;return r`<div key=${d} style="width:${m}%;height:100%;
                  background:${Yn[o]||"var(--fg2)"};
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
        ${a.map(([c,d])=>{const v=Object.entries(d.items).sort((x,E)=>E[1]-x[1]),u=v.slice(0,15),m=v.slice(15).reduce((x,[,E])=>x+E,0);m>0&&u.push(["(other)",m]);const g=d.tokens/i*100;return r`<div key=${c} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${Yn[c]||"var(--fg2)"};flex-shrink:0">${c}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${g}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${u.map(([x,E],S)=>{const y=d.tokens>0?E/d.tokens*100:0;if(y<.3)return null;const $=Kn[S%Kn.length];return r`<div key=${x} style="width:${y}%;height:100%;background:${$};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${x}: ${z(E)} tok">
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
              ${u.map(([x,E],S)=>r`<span key=${x}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${Kn[S%Kn.length]};flex-shrink:0"></span>
                <span class="text-muted">${x} ${z(E)}</span>
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
          <span><span style="color:${Le[o.tool]||"var(--fg2)"}">${ft[o.tool]||"🔹"}</span> ${K(o.label)}</span>
          <span class="text-muted">${z(o.sentYes)} sent \u00B7 ${z(o.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}const Pv={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"};function Ov(e){if(!e||e<0)return"—";const t=Math.floor(e/3600),s=Math.floor(e%3600/60);return t>0?`${t}h ${s}m`:`${s}m`}function zv(){var m,g,x,E,S;const{snap:e}=We(Ie),[t,s]=q(null),[n,l]=q(null);ae(()=>{let y=!0;const $=()=>{Sr().then(T=>{y&&s(T)}).catch(()=>{}),wd().then(T=>{y&&l(T)}).catch(()=>{})};$();const k=setInterval($,15e3);return()=>{y=!1,clearInterval(k)}},[]);const o=re(()=>{if(!e)return[];const y=e.tool_telemetry||[];return e.tools.filter($=>$.tool!=="aictl"&&$.tool!=="any").map($=>{var P,b,C,A,F;const k=y.find(I=>I.tool===$.tool),T=$.live||{},H=T.last_seen_at||0,D=H>0?Math.floor(Date.now()/1e3-H):-1,O=D>3600||D<0;return{tool:$.tool,label:$.label,source:(k==null?void 0:k.source)||(T.session_count?"live-monitor":"discovery"),confidence:(k==null?void 0:k.confidence)||((P=T.token_estimate)==null?void 0:P.confidence)||0,inputTokens:(k==null?void 0:k.input_tokens)||0,outputTokens:(k==null?void 0:k.output_tokens)||0,cost:(k==null?void 0:k.cost_usd)||0,sessions:(k==null?void 0:k.total_sessions)||T.session_count||0,errors:((b=k==null?void 0:k.errors)==null?void 0:b.length)||0,lastError:((C=k==null?void 0:k.errors)==null?void 0:C[0])||null,lastSeen:D,stale:O,fileCount:$.files.length,procCount:$.processes.length,hasLive:!!$.live,hasOtel:!!((F=(A=T.sources||[]).includes)!=null&&F.call(A,"otel"))}}).sort(($,k)=>k.inputTokens+k.outputTokens-($.inputTokens+$.outputTokens))},[e]),a=re(()=>{var y;return(y=e==null?void 0:e.live_monitor)!=null&&y.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([$,k])=>({name:$,status:k.status||"unknown",mode:k.mode||"",detail:k.detail||""})):[]},[e]);if(!e)return null;const i=o.length,c=o.filter(y=>y.inputTokens+y.outputTokens>0).length,d=o.filter(y=>y.hasLive).length,v=o.filter(y=>y.stale&&y.hasLive).length,u=o.reduce((y,$)=>y+$.errors,0);return r`<div class="diag-card" role="region" aria-label="Collector health">
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
          <div class="metric-chip-value">${Ov(n.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${n.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${z((((g=n.db)==null?void 0:g.metrics_count)||0)+(((x=n.db)==null?void 0:x.tool_metrics_count)||0)+(((E=n.db)==null?void 0:E.events_count)||0)+(((S=n.db)==null?void 0:S.samples_count)||0))}</div>
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
        ${t.last_receive_at>0?r`<span class="text-muted">Last: ${Nt(t.last_receive_at)}</span>`:null}
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
              <span style="color:${Le[y.tool]||"var(--fg2)"}">${ft[y.tool]||"🔹"}</span>
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
              ${y.lastSeen>=0?r`<span style="color:${y.stale?"var(--orange)":"var(--fg2)"}">${Nt(Date.now()/1e3-y.lastSeen)}</span>`:r`<span class="text-muted">\u2014</span>`}</td>
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
            border-left:3px solid ${Pv[y.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${y.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${y.status}</span>
          </div>
          ${y.detail?r`<div class="text-xs text-muted" style="margin-top:2px">${K(y.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let fo=null;function Rv(){return fo?Promise.resolve(fo):Sd().then(e=>{const t={};for(const s of e||[])t[s.key]=s;return fo=t,t}).catch(()=>({}))}function Fv(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),s=t.match(/^[^.!?]+[.!?]/);return s?s[0].trim():t.slice(0,120)}const Iv={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},Nv={raw:"raw",deduced:"deduced",aggregated:"agg"};function jv(){const[e,t]=q(null),[s,n]=q({x:0,y:0}),[l,o]=q(!1),a=nt(null),i=nt(null),c=ye(S=>{const y=S.getAttribute("data-dp");y&&Rv().then($=>{const k=$[y];if(!k)return;const T=S.getBoundingClientRect();n({x:T.left,y:T.bottom+4}),t(k),o(!1)})},[]),d=ye(()=>{i.current=setTimeout(()=>{t(null),o(!1)},120)},[]),v=ye(()=>{i.current&&(clearTimeout(i.current),i.current=null)},[]);if(ae(()=>{function S(k){const T=k.target.closest("[data-dp]");T&&(v(),c(T))}function y(k){k.target.closest("[data-dp]")&&d()}function $(k){k.target.closest("[data-dp]")&&e&&(k.preventDefault(),o(H=>!H))}return document.addEventListener("mouseover",S,!0),document.addEventListener("mouseout",y,!0),document.addEventListener("click",$,!0),()=>{document.removeEventListener("mouseover",S,!0),document.removeEventListener("mouseout",y,!0),document.removeEventListener("click",$,!0)}},[c,d,v,e]),!e)return null;const m=Math.min(s.x,window.innerWidth-320-8),g=Math.min(s.y,window.innerHeight-180),x=Nv[e.source_type]||e.source_type,E=Iv[e.unit]||e.unit;return r`<div class="dp-tooltip" ref=${a}
    style=${"left:"+m+"px;top:"+g+"px"}
    onMouseEnter=${v} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${x}</span>
      ${E&&r`<span class="dp-tooltip-unit">${E}</span>`}
    </div>
    <div class="dp-tooltip-body">${Fv(e.explanation)}</div>
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
  </div>`}function Zs(e,t){try{localStorage.setItem("aictl-pref-"+e,JSON.stringify(t))}catch{}}function vo(e,t){try{const s=localStorage.getItem("aictl-pref-"+e);return s!=null?JSON.parse(s):t}catch{return t}}function Jn(e){const t=new Date(e*1e3),s=t.getTimezoneOffset();return new Date(t.getTime()-s*6e4).toISOString().slice(0,16)}const Io=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],pl={};Io.forEach(e=>{pl[e.id]=e.seconds});const Bv={snap:null,history:null,connected:!1,activeTab:vo("active_tab","overview"),globalRange:(()=>{const e=vo("range","live"),t=pl[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:vo("tool_filter",null)};function Hv(e,t){switch(t.type){case"SSE_UPDATE":{const s=t.payload,n=e.snap?Hd(e.snap,s):s,l=Wd(e.history,s);return{...e,snap:n,history:l,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const mo=Xs.tabs;function Wv({globalRange:e,onPreset:t,onApplyCustom:s}){const[n,l]=q(!1),o=nt(null),a=nt(null),i=ye(()=>{l(!0),requestAnimationFrame(()=>{if(o.current&&a.current)if(e.until!=null)o.current.value=Jn(e.since),a.current.value=Jn(e.until);else{const d=Io.find(m=>m.id===e.id),v=Date.now()/1e3,u=(d==null?void 0:d.seconds)||86400;o.current.value=Jn(v-u),a.current.value=Jn(v)}})},[e]),c=ye(()=>{var E,S;const d=(E=o.current)==null?void 0:E.value,v=(S=a.current)==null?void 0:S.value;if(!d||!v)return;const u=new Date(d).getTime(),m=new Date(v).getTime();if(!Number.isFinite(u)||!Number.isFinite(m))return;const g=u/1e3,x=m/1e3;x<=g||(s(g,x),l(!1))},[s]);return r`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${Io.map(d=>r`<button key=${d.id}
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
  </div>`}const sl=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]);function qv({snap:e,enabledTools:t,onToggle:s,onSetAll:n}){if(!e)return null;const l=e.tools.filter(a=>!a.meta);if(!l.length)return null;const o=t===null;return t?t.length:l.length,r`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${o}
        onChange=${()=>n(o?[]:null)} />
      <span class="text-muted">All (${l.length})</span>
    </label>
    ${l.sort((a,i)=>a.label.localeCompare(i.label)).map(a=>{const i=sl.has(a.tool),c=t===null||t.includes(a.tool),d=Le[a.tool]||"var(--fg2)",v=ft[a.tool]||"🔹";return r`<label key=${a.tool} class=${"tool-filter-item"+(i?"":" tool-unverified")}
        title=${i?"":"Not yet verified — discovery only"}>
        <input type="checkbox" checked=${c} disabled=${!i}
          onChange=${()=>i&&s(a.tool)} />
        <span style=${"color:"+d}>${v}</span>
        <span>${a.label}</span>
      </label>`})}
  </div>`}function Vv({mcpDetail:e}){return!e||!e.length?r`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`:r`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{t.status;const s=Ed[t.status]||"var(--fg3)",n=Le[t.tool]||"var(--fg3)";return r`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${s}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${K(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${n};white-space:nowrap;flex-shrink:0">${K(t.tool)}</span>
      </div>`})}
  </div>`}function Uv({label:e,value:t,mcpDetail:s}){const[n,l]=q(!1);return r`<div style="position:relative;cursor:default"
    onMouseEnter=${()=>l(!0)}
    onMouseLeave=${()=>l(!1)}>
    <${Ao} label=${e} value=${t} sm=${!0}/>
    ${n&&r`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      ${s.length>0?r`<${Vv} mcpDetail=${s}/>`:r`<div style="color:var(--fg3);font-size:var(--fs-sm)">None configured</div>`}
    </div>`}
  </div>`}function Gv({snap:e,history:t,globalRange:s}){const[n,l]=q(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),o=ye(()=>{l(d=>{const v=!d;try{localStorage.setItem("aictl-header-expanded",String(v))}catch{}return v})},[]),a=d=>!t||!t.ts||t.ts.length<2?null:[t.ts,t[d]],i=(e==null?void 0:e.cpu_cores)||1,c={cores:i};return r`
    <div style=${"display:grid;grid-template-columns:repeat("+Xs.sparklines.length+",1fr);gap:var(--sp-4);margin-bottom:var(--sp-4)"}>
      ${Xs.sparklines.map(d=>{const v=e?e["total_"+d.field]??e[d.field]??"":"",u=to(v,d.format,d.suffix,d.multiply),m=d.yMaxExpr?ei(d.yMaxExpr,c):void 0,g=(d.refLines||[]).map(x=>({value:ei(x.valueExpr,c),label:(x.label||"").replace("{cores}",i)})).filter(x=>x.value!=null);return r`<${Xt} key=${d.field} label=${d.label} value=${u}
          data=${a(d.field)} chartColor=${d.color||"var(--accent)"}
          smooth=${!!d.smooth} refLines=${g.length?g:void 0} yMax=${m} dp=${d.dp}/>`})}
    </div>

    <div class=${n?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>

      <!-- Row 1: (CPU bars + Live traffic) | Live metric boxes -->
      <div class="mb-sm" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);align-items:start">
        <!-- Left: per-core CPU bars + live traffic bar -->
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${Jp} perCore=${(e==null?void 0:e.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${Wi} snap=${e} mode="traffic"/></div>
        </div>
        <!-- Right: 4 live metric boxes in 2×2 grid -->
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${Xs.liveMetrics.map(d=>{const v=e?e[d.field]??"":"",u=to(v,d.format,d.suffix,d.multiply);return r`<${Ao} key=${d.field} label=${d.label} value=${u} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>

      <!-- Row 2: Inventory — full width; MCP box shows hover popover -->
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div style="display:grid;grid-template-columns:repeat(${Xs.inventory.length},1fr);gap:var(--sp-2)">
          ${Xs.inventory.map(d=>{const v=e?e[d.field]??"":"",u=to(v,d.format,d.suffix,d.multiply);return d.field==="total_mcp_servers"?r`<${Uv} key=${d.field} label=${d.label} value=${u} mcpDetail=${(e==null?void 0:e.mcp_detail)||[]}/>`:r`<${Ao} key=${d.field} label=${d.label} value=${u} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
        </div>
      </div>

      <!-- Row 3: CSV footprint — full width -->
      <div class="mb-sm"><${Wi} snap=${e} mode="files"/></div>

    </div>
    <button class="header-toggle" onClick=${o} aria-label="Toggle details">
      ${n?"▲ less":"▼ more"}
    </button>
  `}function Yv(){var te;const[e,t]=yr(Hv,Bv),{snap:s,history:n,connected:l,activeTab:o,globalRange:a,searchQuery:i,theme:c,viewerPath:d,events:v,enabledTools:u}=e,[m,g]=q(null),x=nt(null);ae(()=>{document.documentElement.setAttribute("data-theme",c);try{localStorage.setItem("aictl-theme",c)}catch{}},[c]);const E=ye(()=>{t({type:"SET_THEME",payload:Xl[(Xl.indexOf(c)+1)%Xl.length]})},[c]),S=ye(L=>{const B=L.since,Y=L.until;L.id==="live"?g(null):L.id!=="custom"?Mn({range:L.id}).then(g).catch(()=>{}):Mn({since:B,until:Y}).then(g).catch(()=>{}),Wo({since:B,until:Y}).then(j=>t({type:"EVENTS_INIT",payload:j})).catch(()=>{})},[]);ae(()=>{let L,B=1e3,Y=!1,j=!1;Qa().then(G=>t({type:"SNAP_REPLACE",payload:G})).catch(()=>{}),Mn().then(G=>t({type:"HISTORY_INIT",payload:G})).catch(()=>{}),S(a);function ne(){Y||(L=new EventSource(Td()),L.onmessage=G=>{const be=JSON.parse(G.data);t({type:"SSE_UPDATE",payload:be}),B=1e3},L.onerror=()=>{t({type:"SET_CONNECTED",payload:!1}),L.close(),Y||setTimeout(ne,B),B=Math.min(B*2,3e4)})}ne();const ee=setInterval(()=>{Y||j||(j=!0,Qa().then(G=>t({type:"SNAP_REPLACE",payload:G})).catch(()=>{}).finally(()=>{j=!1}))},3e4);return()=>{Y=!0,L&&L.close(),clearInterval(ee)}},[]);const y=ye(L=>{const B=pl[L]||3600,Y={id:L,since:Date.now()/1e3-B,until:null};t({type:"SET_RANGE",payload:Y}),Zs("range",L),S(Y)},[S]),$=ye((L,B)=>{const Y={id:"custom",since:L,until:B};t({type:"SET_RANGE",payload:Y}),S(Y)},[S]),k=a.id==="live"?n:m||n,T=a.until?a.until-a.since:pl[a.id]||3600;ae(()=>{const L=B=>{var Y;if(B.key==="Escape"&&t({type:"SET_VIEWER",payload:null}),B.key==="/"&&document.activeElement!==x.current&&(B.preventDefault(),(Y=x.current)==null||Y.focus()),document.activeElement!==x.current){const j=mo.find(ne=>ne.key===B.key);j&&(t({type:"SET_TAB",payload:j.id}),Zs("active_tab",j.id))}};return document.addEventListener("keydown",L),()=>document.removeEventListener("keydown",L)},[]);const H=ye(L=>t({type:"SET_VIEWER",payload:L}),[]),D=ye(L=>{if(!sl.has(L))return;const B=s?s.tools.filter(j=>j.tool!=="aictl"&&j.tool!=="any"&&sl.has(j.tool)).map(j=>j.tool):[];let Y;u===null?Y=B.filter(j=>j!==L):u.indexOf(L)>=0?Y=u.filter(ne=>ne!==L):(Y=[...u,L],Y.length>=B.length&&(Y=null)),t({type:"SET_TOOL_FILTER",payload:Y}),Zs("tool_filter",Y)},[s,u]),O=ye(L=>{t({type:"SET_TOOL_FILTER",payload:L}),Zs("tool_filter",L)},[]),P=re(()=>{if(!s)return s;let L=s.tools;if(L=L.filter(B=>sl.has(B.tool)||B.tool==="aictl"),u!==null&&(L=L.filter(B=>u.includes(B.tool)||B.tool==="aictl")),i){const B=i.toLowerCase();L=L.filter(Y=>Y.label.toLowerCase().includes(B)||Y.tool.toLowerCase().includes(B)||Y.vendor&&Y.vendor.toLowerCase().includes(B)||Y.files.some(j=>j.path.toLowerCase().includes(B))||Y.processes.some(j=>(j.name||"").toLowerCase().includes(B)||(j.cmdline||"").toLowerCase().includes(B))||Y.live&&((Y.live.workspaces||[]).some(j=>j.toLowerCase().includes(B))||(Y.live.sources||[]).some(j=>j.toLowerCase().includes(B))))}return{...s,tools:L}},[s,i,u]),b=re(()=>{var Y;const L=Date.now()/1e3-300,B=new Map;for(const j of v)if(j.kind==="file_modified"&&j.ts>=L&&((Y=j.detail)!=null&&Y.path)){const ne=B.get(j.detail.path);(!ne||j.ts>ne.ts)&&B.set(j.detail.path,{ts:j.ts,growth:j.detail.growth_bytes||0,tool:j.tool})}return B},[v]),C=re(()=>({snap:P,history:n,openViewer:H,recentFiles:b,globalRange:a,rangeSeconds:T,enabledTools:u}),[P,n,H,b,a,T,u]),A={overview:()=>r`
      <${Gv} snap=${P} history=${k}
        globalRange=${a}/>
      <div class="mb-lg"><${zv}/></div>
    `,procs:()=>r`
      <div class="mb-lg"><${Kp}/></div>
    `,memory:()=>r`
      <div class="mb-lg"><${Dv}/></div>
      <div class="mb-lg"><${tf}/></div>
    `,live:()=>r`<div class="mb-lg"><${sf}/></div>`,events:()=>r`<div class="mb-lg"><${nf} key=${"events-"+o}/></div>`,budget:()=>r`<div class="mb-lg"><${lf} key=${"budget-"+o}/></div>`,sessions:()=>r`<div class="mb-lg"><${Mf} key=${"sessions-"+o}/></div>`,analytics:()=>r`<div class="mb-lg"><${jf} key=${"analytics-"+o}/></div>`,flow:()=>r`<div class="mb-lg"><${Qf} key=${"flow-"+o}/></div>`,transcript:()=>r`<div class="mb-lg"><${ov} key=${"transcript-"+o}/></div>`,timeline:()=>r`<div class="mb-lg"><${yv} key=${"timeline-"+o}/></div>`,config:()=>r`<div class="mb-lg"><${Mv}/></div>`},F=ye(L=>{t({type:"SET_TAB",payload:L}),Zs("active_tab",L)},[]);ye(L=>{t({type:"SET_TAB",payload:"sessions"}),Zs("active_tab","sessions"),window.__aictl_selected_session=L.session_id,window.dispatchEvent(new CustomEvent("aictl-session-select",{detail:L}))},[]);const[I,R]=q(!1);ae(()=>{let L=!0;const B=()=>Sr().then(j=>{L&&R(j.active||!1)}).catch(()=>{L&&R(!1)});B();const Y=setInterval(B,3e4);return()=>{L=!1,clearInterval(Y)}},[]);const U=re(()=>{if(!s)return[];const L=[];let B=0,Y=0,j=0,ne=0;for(const ee of s.tools||[])for(const G of ee.processes||[]){const be=parseFloat(G.mem_mb)||0,Pe=(G.process_type||"").toLowerCase();(Pe==="subagent"||Pe==="agent")&&(B+=be),Pe==="mcp-server"&&G.zombie_risk&&G.zombie_risk!=="none"&&Y++,(Pe==="browser"||(G.name||"").toLowerCase().includes("headless"))&&j++,G.anomalies&&G.anomalies.length&&(ne+=G.anomalies.length)}return B>2048&&L.push({level:"red",msg:`Subagent memory: ${ge(B*1048576)} (>2GB) — consider cleanup`}),Y>0&&L.push({level:"orange",msg:`${Y} MCP server(s) with dead parent — may be orphaned`}),j>0&&L.push({level:"yellow",msg:`${j} headless browser process(es) detected — check for leaks`}),ne>5&&L.push({level:"orange",msg:`${ne} process anomalies detected`}),L},[s]);return r`<${Ie.Provider} value=${C}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${x} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${i} onInput=${L=>t({type:"SET_SEARCH",payload:L.target.value})}/>
          <button class="theme-btn" onClick=${E} aria-label="Toggle theme: ${c}"
            title="Theme: ${c}">${Ld[c]}</button>
          ${I&&r`<span class="conn ok" title="OTel receiver active — Claude Code pushing telemetry">OTel</span>`}
          <span class=${"conn "+(l?"ok":"err")} role="status" aria-live="polite">${l?"live":"reconnecting..."}<span class="sr-only">${l?" — connected to server":" — connection lost, attempting to reconnect"}</span></span>
        </div>
      </header>
      ${U.length>0&&r`<div class="alert-banner" role="alert">
        ${U.map((L,B)=>r`<div key=${B} class="alert-item" style="color:var(--${L.level})">
          \u26A0 ${L.msg}
        </div>`)}
      </div>`}
      <${Wv} globalRange=${a} onPreset=${y} onApplyCustom=${$}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${mo.map(L=>r`<button key=${L.id} class="tab-btn" role="tab"
            aria-selected=${o===L.id} onClick=${()=>F(L.id)}
            title="Shortcut: ${L.key}">${L.icon?L.icon+" ":""}${L.label}</button>`)}
        </nav>
        <${qv} snap=${s} enabledTools=${u}
          onToggle=${D} onSetAll=${O}/>
        <div id="main-content" role="tabpanel" aria-label=${(te=mo.find(L=>L.id===o))==null?void 0:te.label}>
          ${A[o]?A[o]():r`<p class="text-muted">Unknown tab "${o}"</p>`}
        </div>
      </main>
    </div>
    <${Bp} path=${d} onClose=${()=>t({type:"SET_VIEWER",payload:null})}/>
    <${jv}/>
  </${Ie.Provider}>`}id(r`<${Yv}/>`,document.getElementById("app"));
