(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))n(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function s(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(l){if(l.ep)return;l.ep=!0;const o=s(l);fetch(l.href,o)}})();var $l,Mt,vr,ds,ja,mr,hr,gr,jo,$o,_o,$r,il={},rl=[],yd=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,Fn=Array.isArray;function ts(t,e){for(var s in e)t[s]=e[s];return t}function Bo(t){t&&t.parentNode&&t.parentNode.removeChild(t)}function An(t,e,s){var n,l,o,a={};for(o in e)o=="key"?n=e[o]:o=="ref"?l=e[o]:a[o]=e[o];if(arguments.length>2&&(a.children=arguments.length>3?$l.call(arguments,2):s),typeof t=="function"&&t.defaultProps!=null)for(o in t.defaultProps)a[o]===void 0&&(a[o]=t.defaultProps[o]);return el(t,a,n,l,null)}function el(t,e,s,n,l){var o={type:t,props:e,key:s,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:l??++vr,__i:-1,__u:0};return l==null&&Mt.vnode!=null&&Mt.vnode(o),o}function _l(t){return t.children}function Dn(t,e){this.props=t,this.context=e}function on(t,e){if(e==null)return t.__?on(t.__,t.__i+1):null;for(var s;e<t.__k.length;e++)if((s=t.__k[e])!=null&&s.__e!=null)return s.__e;return typeof t.type=="function"?on(t):null}function bd(t){if(t.__P&&t.__d){var e=t.__v,s=e.__e,n=[],l=[],o=ts({},e);o.__v=e.__v+1,Mt.vnode&&Mt.vnode(o),Ho(t.__P,o,e,t.__n,t.__P.namespaceURI,32&e.__u?[s]:null,n,s??on(e),!!(32&e.__u),l),o.__v=e.__v,o.__.__k[o.__i]=o,xr(n,o,l),e.__e=e.__=null,o.__e!=s&&_r(o)}}function _r(t){if((t=t.__)!=null&&t.__c!=null)return t.__e=t.__c.base=null,t.__k.some(function(e){if(e!=null&&e.__e!=null)return t.__e=t.__c.base=e.__e}),_r(t)}function yo(t){(!t.__d&&(t.__d=!0)&&ds.push(t)&&!cl.__r++||ja!=Mt.debounceRendering)&&((ja=Mt.debounceRendering)||mr)(cl)}function cl(){try{for(var t,e=1;ds.length;)ds.length>e&&ds.sort(hr),t=ds.shift(),e=ds.length,bd(t)}finally{ds.length=cl.__r=0}}function yr(t,e,s,n,l,o,a,r,i,d,f){var p,m,g,x,E,C,b,$=n&&n.__k||rl,k=e.length;for(i=kd(s,e,$,i,k),p=0;p<k;p++)(g=s.__k[p])!=null&&(m=g.__i!=-1&&$[g.__i]||il,g.__i=p,C=Ho(t,g,m,l,o,a,r,i,d,f),x=g.__e,g.ref&&m.ref!=g.ref&&(m.ref&&Wo(m.ref,null,g),f.push(g.ref,g.__c||x,g)),E==null&&x!=null&&(E=x),(b=!!(4&g.__u))||m.__k===g.__k?i=br(g,i,t,b):typeof g.type=="function"&&C!==void 0?i=C:x&&(i=x.nextSibling),g.__u&=-7);return s.__e=E,i}function kd(t,e,s,n,l){var o,a,r,i,d,f=s.length,p=f,m=0;for(t.__k=new Array(l),o=0;o<l;o++)(a=e[o])!=null&&typeof a!="boolean"&&typeof a!="function"?(typeof a=="string"||typeof a=="number"||typeof a=="bigint"||a.constructor==String?a=t.__k[o]=el(null,a,null,null,null):Fn(a)?a=t.__k[o]=el(_l,{children:a},null,null,null):a.constructor===void 0&&a.__b>0?a=t.__k[o]=el(a.type,a.props,a.key,a.ref?a.ref:null,a.__v):t.__k[o]=a,i=o+m,a.__=t,a.__b=t.__b+1,r=null,(d=a.__i=xd(a,s,i,p))!=-1&&(p--,(r=s[d])&&(r.__u|=2)),r==null||r.__v==null?(d==-1&&(l>f?m--:l<f&&m++),typeof a.type!="function"&&(a.__u|=4)):d!=i&&(d==i-1?m--:d==i+1?m++:(d>i?m--:m++,a.__u|=4))):t.__k[o]=null;if(p)for(o=0;o<f;o++)(r=s[o])!=null&&!(2&r.__u)&&(r.__e==n&&(n=on(r)),Sr(r,r));return n}function br(t,e,s,n){var l,o;if(typeof t.type=="function"){for(l=t.__k,o=0;l&&o<l.length;o++)l[o]&&(l[o].__=t,e=br(l[o],e,s,n));return e}t.__e!=e&&(n&&(e&&t.type&&!e.parentNode&&(e=on(t)),s.insertBefore(t.__e,e||null)),e=t.__e);do e=e&&e.nextSibling;while(e!=null&&e.nodeType==8);return e}function kr(t,e){return e=e||[],t==null||typeof t=="boolean"||(Fn(t)?t.some(function(s){kr(s,e)}):e.push(t)),e}function xd(t,e,s,n){var l,o,a,r=t.key,i=t.type,d=e[s],f=d!=null&&(2&d.__u)==0;if(d===null&&r==null||f&&r==d.key&&i==d.type)return s;if(n>(f?1:0)){for(l=s-1,o=s+1;l>=0||o<e.length;)if((d=e[a=l>=0?l--:o++])!=null&&!(2&d.__u)&&r==d.key&&i==d.type)return a}return-1}function Ba(t,e,s){e[0]=="-"?t.setProperty(e,s??""):t[e]=s==null?"":typeof s!="number"||yd.test(e)?s:s+"px"}function Gn(t,e,s,n,l){var o,a;t:if(e=="style")if(typeof s=="string")t.style.cssText=s;else{if(typeof n=="string"&&(t.style.cssText=n=""),n)for(e in n)s&&e in s||Ba(t.style,e,"");if(s)for(e in s)n&&s[e]==n[e]||Ba(t.style,e,s[e])}else if(e[0]=="o"&&e[1]=="n")o=e!=(e=e.replace(gr,"$1")),a=e.toLowerCase(),e=a in t||e=="onFocusOut"||e=="onFocusIn"?a.slice(2):e.slice(2),t.l||(t.l={}),t.l[e+o]=s,s?n?s.u=n.u:(s.u=jo,t.addEventListener(e,o?_o:$o,o)):t.removeEventListener(e,o?_o:$o,o);else{if(l=="http://www.w3.org/2000/svg")e=e.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(e!="width"&&e!="height"&&e!="href"&&e!="list"&&e!="form"&&e!="tabIndex"&&e!="download"&&e!="rowSpan"&&e!="colSpan"&&e!="role"&&e!="popover"&&e in t)try{t[e]=s??"";break t}catch{}typeof s=="function"||(s==null||s===!1&&e[4]!="-"?t.removeAttribute(e):t.setAttribute(e,e=="popover"&&s==1?"":s))}}function Ha(t){return function(e){if(this.l){var s=this.l[e.type+t];if(e.t==null)e.t=jo++;else if(e.t<s.u)return;return s(Mt.event?Mt.event(e):e)}}}function Ho(t,e,s,n,l,o,a,r,i,d){var f,p,m,g,x,E,C,b,$,k,S,N,A,M,F,y=e.type;if(e.constructor!==void 0)return null;128&s.__u&&(i=!!(32&s.__u),o=[r=e.__e=s.__e]),(f=Mt.__b)&&f(e);t:if(typeof y=="function")try{if(b=e.props,$=y.prototype&&y.prototype.render,k=(f=y.contextType)&&n[f.__c],S=f?k?k.props.value:f.__:n,s.__c?C=(p=e.__c=s.__c).__=p.__E:($?e.__c=p=new y(b,S):(e.__c=p=new Dn(b,S),p.constructor=y,p.render=Sd),k&&k.sub(p),p.state||(p.state={}),p.__n=n,m=p.__d=!0,p.__h=[],p._sb=[]),$&&p.__s==null&&(p.__s=p.state),$&&y.getDerivedStateFromProps!=null&&(p.__s==p.state&&(p.__s=ts({},p.__s)),ts(p.__s,y.getDerivedStateFromProps(b,p.__s))),g=p.props,x=p.state,p.__v=e,m)$&&y.getDerivedStateFromProps==null&&p.componentWillMount!=null&&p.componentWillMount(),$&&p.componentDidMount!=null&&p.__h.push(p.componentDidMount);else{if($&&y.getDerivedStateFromProps==null&&b!==g&&p.componentWillReceiveProps!=null&&p.componentWillReceiveProps(b,S),e.__v==s.__v||!p.__e&&p.shouldComponentUpdate!=null&&p.shouldComponentUpdate(b,p.__s,S)===!1){e.__v!=s.__v&&(p.props=b,p.state=p.__s,p.__d=!1),e.__e=s.__e,e.__k=s.__k,e.__k.some(function(T){T&&(T.__=e)}),rl.push.apply(p.__h,p._sb),p._sb=[],p.__h.length&&a.push(p);break t}p.componentWillUpdate!=null&&p.componentWillUpdate(b,p.__s,S),$&&p.componentDidUpdate!=null&&p.__h.push(function(){p.componentDidUpdate(g,x,E)})}if(p.context=S,p.props=b,p.__P=t,p.__e=!1,N=Mt.__r,A=0,$)p.state=p.__s,p.__d=!1,N&&N(e),f=p.render(p.props,p.state,p.context),rl.push.apply(p.__h,p._sb),p._sb=[];else do p.__d=!1,N&&N(e),f=p.render(p.props,p.state,p.context),p.state=p.__s;while(p.__d&&++A<25);p.state=p.__s,p.getChildContext!=null&&(n=ts(ts({},n),p.getChildContext())),$&&!m&&p.getSnapshotBeforeUpdate!=null&&(E=p.getSnapshotBeforeUpdate(g,x)),M=f!=null&&f.type===_l&&f.key==null?wr(f.props.children):f,r=yr(t,Fn(M)?M:[M],e,s,n,l,o,a,r,i,d),p.base=e.__e,e.__u&=-161,p.__h.length&&a.push(p),C&&(p.__E=p.__=null)}catch(T){if(e.__v=null,i||o!=null)if(T.then){for(e.__u|=i?160:128;r&&r.nodeType==8&&r.nextSibling;)r=r.nextSibling;o[o.indexOf(r)]=null,e.__e=r}else{for(F=o.length;F--;)Bo(o[F]);bo(e)}else e.__e=s.__e,e.__k=s.__k,T.then||bo(e);Mt.__e(T,e,s)}else o==null&&e.__v==s.__v?(e.__k=s.__k,e.__e=s.__e):r=e.__e=wd(s.__e,e,s,n,l,o,a,i,d);return(f=Mt.diffed)&&f(e),128&e.__u?void 0:r}function bo(t){t&&(t.__c&&(t.__c.__e=!0),t.__k&&t.__k.some(bo))}function xr(t,e,s){for(var n=0;n<s.length;n++)Wo(s[n],s[++n],s[++n]);Mt.__c&&Mt.__c(e,t),t.some(function(l){try{t=l.__h,l.__h=[],t.some(function(o){o.call(l)})}catch(o){Mt.__e(o,l.__v)}})}function wr(t){return typeof t!="object"||t==null||t.__b>0?t:Fn(t)?t.map(wr):ts({},t)}function wd(t,e,s,n,l,o,a,r,i){var d,f,p,m,g,x,E,C=s.props||il,b=e.props,$=e.type;if($=="svg"?l="http://www.w3.org/2000/svg":$=="math"?l="http://www.w3.org/1998/Math/MathML":l||(l="http://www.w3.org/1999/xhtml"),o!=null){for(d=0;d<o.length;d++)if((g=o[d])&&"setAttribute"in g==!!$&&($?g.localName==$:g.nodeType==3)){t=g,o[d]=null;break}}if(t==null){if($==null)return document.createTextNode(b);t=document.createElementNS(l,$,b.is&&b),r&&(Mt.__m&&Mt.__m(e,o),r=!1),o=null}if($==null)C===b||r&&t.data==b||(t.data=b);else{if(o=o&&$l.call(t.childNodes),!r&&o!=null)for(C={},d=0;d<t.attributes.length;d++)C[(g=t.attributes[d]).name]=g.value;for(d in C)g=C[d],d=="dangerouslySetInnerHTML"?p=g:d=="children"||d in b||d=="value"&&"defaultValue"in b||d=="checked"&&"defaultChecked"in b||Gn(t,d,null,g,l);for(d in b)g=b[d],d=="children"?m=g:d=="dangerouslySetInnerHTML"?f=g:d=="value"?x=g:d=="checked"?E=g:r&&typeof g!="function"||C[d]===g||Gn(t,d,g,C[d],l);if(f)r||p&&(f.__html==p.__html||f.__html==t.innerHTML)||(t.innerHTML=f.__html),e.__k=[];else if(p&&(t.innerHTML=""),yr(e.type=="template"?t.content:t,Fn(m)?m:[m],e,s,n,$=="foreignObject"?"http://www.w3.org/1999/xhtml":l,o,a,o?o[0]:s.__k&&on(s,0),r,i),o!=null)for(d=o.length;d--;)Bo(o[d]);r||(d="value",$=="progress"&&x==null?t.removeAttribute("value"):x!=null&&(x!==t[d]||$=="progress"&&!x||$=="option"&&x!=C[d])&&Gn(t,d,x,C[d],l),d="checked",E!=null&&E!=t[d]&&Gn(t,d,E,C[d],l))}return t}function Wo(t,e,s){try{if(typeof t=="function"){var n=typeof t.__u=="function";n&&t.__u(),n&&e==null||(t.__u=t(e))}else t.current=e}catch(l){Mt.__e(l,s)}}function Sr(t,e,s){var n,l;if(Mt.unmount&&Mt.unmount(t),(n=t.ref)&&(n.current&&n.current!=t.__e||Wo(n,null,e)),(n=t.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(o){Mt.__e(o,e)}n.base=n.__P=null}if(n=t.__k)for(l=0;l<n.length;l++)n[l]&&Sr(n[l],e,s||typeof t.type!="function");s||Bo(t.__e),t.__c=t.__=t.__e=void 0}function Sd(t,e,s){return this.constructor(t,s)}function Cd(t,e,s){var n,l,o,a;e==document&&(e=document.documentElement),Mt.__&&Mt.__(t,e),l=(n=!1)?null:e.__k,o=[],a=[],Ho(e,t=e.__k=An(_l,null,[t]),l||il,il,e.namespaceURI,l?null:e.firstChild?$l.call(e.childNodes):null,o,l?l.__e:e.firstChild,n,a),xr(o,t,a)}function Cr(t){function e(s){var n,l;return this.getChildContext||(n=new Set,(l={})[e.__c]=this,this.getChildContext=function(){return l},this.componentWillUnmount=function(){n=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&n.forEach(function(a){a.__e=!0,yo(a)})},this.sub=function(o){n.add(o);var a=o.componentWillUnmount;o.componentWillUnmount=function(){n&&n.delete(o),a&&a.call(o)}}),s.children}return e.__c="__cC"+$r++,e.__=t,e.Provider=e.__l=(e.Consumer=function(s,n){return s.children(n)}).contextType=e,e}$l=rl.slice,Mt={__e:function(t,e,s,n){for(var l,o,a;e=e.__;)if((l=e.__c)&&!l.__)try{if((o=l.constructor)&&o.getDerivedStateFromError!=null&&(l.setState(o.getDerivedStateFromError(t)),a=l.__d),l.componentDidCatch!=null&&(l.componentDidCatch(t,n||{}),a=l.__d),a)return l.__E=l}catch(r){t=r}throw t}},vr=0,Dn.prototype.setState=function(t,e){var s;s=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=ts({},this.state),typeof t=="function"&&(t=t(ts({},s),this.props)),t&&ts(s,t),t!=null&&this.__v&&(e&&this._sb.push(e),yo(this))},Dn.prototype.forceUpdate=function(t){this.__v&&(this.__e=!0,t&&this.__h.push(t),yo(this))},Dn.prototype.render=_l,ds=[],mr=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,hr=function(t,e){return t.__v.__b-e.__v.__b},cl.__r=0,gr=/(PointerCapture)$|Capture$/i,jo=0,$o=Ha(!1),_o=Ha(!0),$r=0;var Tr=function(t,e,s,n){var l;e[0]=0;for(var o=1;o<e.length;o++){var a=e[o++],r=e[o]?(e[0]|=a?1:2,s[e[o++]]):e[++o];a===3?n[0]=r:a===4?n[1]=Object.assign(n[1]||{},r):a===5?(n[1]=n[1]||{})[e[++o]]=r:a===6?n[1][e[++o]]+=r+"":a?(l=t.apply(r,Tr(t,r,s,["",null])),n.push(l),r[0]?e[0]|=2:(e[o-2]=0,e[o]=l)):n.push(r)}return n},Wa=new Map;function Td(t){var e=Wa.get(this);return e||(e=new Map,Wa.set(this,e)),(e=Tr(this,e.get(t)||(e.set(t,e=function(s){for(var n,l,o=1,a="",r="",i=[0],d=function(m){o===1&&(m||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?i.push(0,m,a):o===3&&(m||a)?(i.push(3,m,a),o=2):o===2&&a==="..."&&m?i.push(4,m,0):o===2&&a&&!m?i.push(5,0,!0,a):o>=5&&((a||!m&&o===5)&&(i.push(o,0,a,l),o=6),m&&(i.push(o,m,0,l),o=6)),a=""},f=0;f<s.length;f++){f&&(o===1&&d(),d(f));for(var p=0;p<s[f].length;p++)n=s[f][p],o===1?n==="<"?(d(),i=[i],o=3):a+=n:o===4?a==="--"&&n===">"?(o=1,a=""):a=n+a[0]:r?n===r?r="":a+=n:n==='"'||n==="'"?r=n:n===">"?(d(),o=1):o&&(n==="="?(o=5,l=a,a=""):n==="/"&&(o<5||s[f][p+1]===">")?(d(),o===3&&(i=i[0]),o=i,(i=i[0]).push(2,0,o),o=0):n===" "||n==="	"||n===`
`||n==="\r"?(d(),o=2):a+=n),o===3&&a==="!--"&&(o=4,i=i[0])}return d(),i}(t)),e),arguments,[])).length>1?e:e[0]}var c=Td.bind(An),an,Ft,eo,qa,On=0,Mr=[],Wt=Mt,Va=Wt.__b,Ua=Wt.__r,Ga=Wt.diffed,Ya=Wt.__c,Ka=Wt.unmount,Ja=Wt.__;function yl(t,e){Wt.__h&&Wt.__h(Ft,t,On||e),On=0;var s=Ft.__H||(Ft.__H={__:[],__h:[]});return t>=s.__.length&&s.__.push({}),s.__[t]}function R(t){return On=1,Md(Er,t)}function Md(t,e,s){var n=yl(an++,2);if(n.t=t,!n.__c&&(n.__=[Er(void 0,e),function(r){var i=n.__N?n.__N[0]:n.__[0],d=n.t(i,r);i!==d&&(n.__N=[d,n.__[1]],n.__c.setState({}))}],n.__c=Ft,!Ft.__f)){var l=function(r,i,d){if(!n.__c.__H)return!0;var f=n.__c.__H.__.filter(function(m){return m.__c});if(f.every(function(m){return!m.__N}))return!o||o.call(this,r,i,d);var p=n.__c.props!==r;return f.some(function(m){if(m.__N){var g=m.__[0];m.__=m.__N,m.__N=void 0,g!==m.__[0]&&(p=!0)}}),o&&o.call(this,r,i,d)||p};Ft.__f=!0;var o=Ft.shouldComponentUpdate,a=Ft.componentWillUpdate;Ft.componentWillUpdate=function(r,i,d){if(this.__e){var f=o;o=void 0,l(r,i,d),o=f}a&&a.call(this,r,i,d)},Ft.shouldComponentUpdate=l}return n.__N||n.__}function lt(t,e){var s=yl(an++,3);!Wt.__s&&Dr(s.__H,e)&&(s.__=t,s.u=e,Ft.__H.__h.push(s))}function Ot(t){return On=5,at(function(){return{current:t}},[])}function at(t,e){var s=yl(an++,7);return Dr(s.__H,e)&&(s.__=t(),s.__H=e,s.__h=t),s.__}function ht(t,e){return On=8,at(function(){return t},e)}function jt(t){var e=Ft.context[t.__c],s=yl(an++,9);return s.c=t,e?(s.__==null&&(s.__=!0,e.sub(Ft)),e.props.value):t.__}function Dd(){for(var t;t=Mr.shift();){var e=t.__H;if(t.__P&&e)try{e.__h.some(sl),e.__h.some(ko),e.__h=[]}catch(s){e.__h=[],Wt.__e(s,t.__v)}}}Wt.__b=function(t){Ft=null,Va&&Va(t)},Wt.__=function(t,e){t&&e.__k&&e.__k.__m&&(t.__m=e.__k.__m),Ja&&Ja(t,e)},Wt.__r=function(t){Ua&&Ua(t),an=0;var e=(Ft=t.__c).__H;e&&(eo===Ft?(e.__h=[],Ft.__h=[],e.__.some(function(s){s.__N&&(s.__=s.__N),s.u=s.__N=void 0})):(e.__h.some(sl),e.__h.some(ko),e.__h=[],an=0)),eo=Ft},Wt.diffed=function(t){Ga&&Ga(t);var e=t.__c;e&&e.__H&&(e.__H.__h.length&&(Mr.push(e)!==1&&qa===Wt.requestAnimationFrame||((qa=Wt.requestAnimationFrame)||Ed)(Dd)),e.__H.__.some(function(s){s.u&&(s.__H=s.u),s.u=void 0})),eo=Ft=null},Wt.__c=function(t,e){e.some(function(s){try{s.__h.some(sl),s.__h=s.__h.filter(function(n){return!n.__||ko(n)})}catch(n){e.some(function(l){l.__h&&(l.__h=[])}),e=[],Wt.__e(n,s.__v)}}),Ya&&Ya(t,e)},Wt.unmount=function(t){Ka&&Ka(t);var e,s=t.__c;s&&s.__H&&(s.__H.__.some(function(n){try{sl(n)}catch(l){e=l}}),s.__H=void 0,e&&Wt.__e(e,s.__v))};var Za=typeof requestAnimationFrame=="function";function Ed(t){var e,s=function(){clearTimeout(n),Za&&cancelAnimationFrame(e),setTimeout(t)},n=setTimeout(s,35);Za&&(e=requestAnimationFrame(s))}function sl(t){var e=Ft,s=t.__c;typeof s=="function"&&(t.__c=void 0,s()),Ft=e}function ko(t){var e=Ft;t.__c=t.__(),Ft=e}function Dr(t,e){return!t||t.length!==e.length||e.some(function(s,n){return s!==t[n]})}function Er(t,e){return typeof e=="function"?e(t):e}const Rt=Cr(null);let Ld="";function Bt(t){return Ld+t}async function Ad(){return(await fetch(Bt("/api/snapshot"))).json()}async function Pn(t={}){let e="/api/history";const s=[];return t.range&&s.push("range="+t.range),t.since!=null&&s.push("since="+t.since),t.until!=null&&s.push("until="+t.until),t.tool&&s.push("tool="+encodeURIComponent(t.tool)),s.length&&(e+="?"+s.join("&")),(await fetch(Bt(e))).json()}async function qo(t={}){let e="/api/events";const s=[];return t.tool&&s.push("tool="+encodeURIComponent(t.tool)),t.since!=null&&s.push("since="+t.since),t.until!=null&&s.push("until="+t.until),t.sessionId&&s.push("session_id="+encodeURIComponent(t.sessionId)),t.limit&&s.push("limit="+t.limit),s.length&&(e+="?"+s.join("&")),(await fetch(Bt(e))).json()}async function Lr(t={}){let e="/api/sessions";const s=[];return t.tool&&s.push("tool="+encodeURIComponent(t.tool)),t.active!=null&&s.push("active="+t.active),t.limit&&s.push("limit="+t.limit),s.length&&(e+="?"+s.join("&")),(await fetch(Bt(e))).json()}async function Vo(t,e,s){let n=`/api/session-flow?session_id=${encodeURIComponent(t)}&since=${e}&until=${s}`;return(await fetch(Bt(n))).json()}async function bl(t,e={}){let s="/api/session-timeline";const n=[];return e.since!=null&&n.push("since="+e.since),e.until!=null&&n.push("until="+e.until),n.length&&(s+="?"+n.join("&")),(await fetch(Bt(s))).json()}async function Od(t,e,s=30,n=20){const l=`/api/session-runs?project=${encodeURIComponent(t)}&tool=${encodeURIComponent(e)}&days=${s}&limit=${n}`;return(await fetch(Bt(l))).json()}async function Pd(t){return(await fetch(Bt("/api/agent-teams?session_id="+encodeURIComponent(t)))).json()}async function zd(t){return(await fetch(Bt("/api/transcript/"+encodeURIComponent(t)))).json()}async function Fd(t,e={}){return(await fetch(Bt(t),e)).json()}async function Id(t=7){return(await fetch(Bt("/api/project-costs?days="+t))).json()}async function Nd(t,e=100){return(await fetch(Bt(`/api/api-calls?since=${t}&limit=${e}`))).json()}async function Rd(){return(await fetch(Bt("/api/budget"))).json()}async function jd(t,e={}){return fetch(Bt("/api/file?path="+encodeURIComponent(t)),{headers:e})}async function Bd(){return(await fetch(Bt("/api/samples?list=1"))).json()}async function Hd(t,e){return(await fetch(Bt("/api/samples?series="+encodeURIComponent(t)+"&since="+e))).json()}async function Wd(t,e){return(await fetch(Bt("/api/samples?metric="+encodeURIComponent(t)+"&since="+e))).json()}async function Ar(){return(await fetch(Bt("/api/otel-status"))).json()}async function qd(){return(await fetch(Bt("/api/self-status"))).json()}let so=null;async function Vd(){return so||(so=fetch(Bt("/api/datapoints")).then(t=>t.json())),so}function Ud(){return Bt("/api/stream")}const Dt=window.COLORS??{},me=window.ICONS??{},Or=window.VENDOR_LABELS??{},Gd=window.VENDOR_COLORS??{},Yd=window.HOST_LABELS??{},Qa=window.TOOL_RELATIONSHIPS??{},Kd={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},Sn=["auto","dark","light"],Jd={auto:"☾",dark:"☾",light:"☀"},nn=5,Zs=15,Zd={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},Xa=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],Qd={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},Xd=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],dl=new Map,tu=6e4;function Pr(t){if(t>=10)return String(Math.round(t));const e=t.toFixed(1);return e.endsWith(".0")?e.slice(0,-2):e}function kl(t,e,s,n=1){for(let l=e.length-1;l>=0;l--){const[o,a]=e[l],r=t/o;if(r>=n)return Pr(r)+a}return Math.round(t)+s}const eu=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],su=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],nu=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function z(t){return kl(t,su,"")}function Gt(t){return kl(t,nu,"")}function $t(t){return kl(t,eu,"B")}function je(t){return!t||t<=0?"0B/s":kl(t,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function _t(t){const e=Number(t)||0;return e===0?"0%":e>=10?Math.round(e)+"%":e.toFixed(1)+"%"}function V(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Uo(t){const e=t&&t.token_estimate||{};return(e.input_tokens||0)+(e.output_tokens||0)}function zr(t){return t?new Date(t*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Ds(t){return t&&t.replace(/\\/g,"/")}function no(t,e){const s=Ds(t),n=Ds(e);return s.startsWith(n+"/")?"project":s.includes("/.claude/projects/")?"shadow":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")||s.includes("/.copilot/")||s.includes("/.vscode/")?"global":"external"}function lu(t,e){const s=Ds(t),n=Ds(e);if(s.startsWith(n+"/")){const o=s.slice(n.length+1),a=o.split("/");return a.pop(),a.length?a.join("/"):"(root)"}const l=s.split("/");l.pop();for(let o=l.length-1;o>=0;o--)if(l[o].startsWith(".")&&l[o].length>1&&l[o]!==".."||l[o]==="Library"||l[o]==="AppData")return"~/"+l.slice(o).join("/");return l.slice(-2).join("/")}function ou(t,e){const s={};t.forEach(l=>{const o=no(l.path,e),a=lu(l.path,e),r=o==="project"?a:o+": "+a;(s[r]=s[r]||[]).push(l)});const n={project:0,global:1,shadow:2,external:3};return Object.entries(s).sort((l,o)=>{const a=l[1][0]?no(l[1][0].path,e):"z",r=o[1][0]?no(o[1][0].path,e):"z";return(n[a]||9)-(n[r]||9)})}function au(t){if(t.length<3)return t.slice();const e=[t[0],(t[0]+t[1])/2];for(let s=2;s<t.length;s++)e.push((t[s-2]+t[s-1]+t[s])/3);return e}async function Go(t){const e=dl.get(t);if(e&&Date.now()-e.ts<tu)return e.content;const s={};e&&e.etag&&(s["If-None-Match"]=e.etag);const n=await jd(t,s);if(n.status===304&&e)return e.ts=Date.now(),e.content;if(!n.ok)throw new Error(n.statusText);const l=await n.text(),o=n.headers.get("ETag")||null;return dl.set(t,{content:l,ts:Date.now(),etag:o}),l}function Be(t){if(!t)return"";const e=Math.floor(Date.now()/1e3-t);return e<0?"":e<60?e+"s ago":e<3600?Math.floor(e/60)+"m ago":e<86400?Math.floor(e/3600)+"h ago":Math.floor(e/86400)+"d ago"}function Fr(t){const e=(t||"").toLowerCase();return e==="yes"?"var(--green)":e==="on-demand"?"var(--yellow)":e==="conditional"||e==="partial"?"var(--orange)":"var(--fg2)"}function lo(t,e,s,n){if(t==null||t==="")return"";let l=typeof t=="number"?t:parseFloat(t)||0;n&&(l*=n);let o;switch(e){case"size":o=$t(l);break;case"rate":o=je(l);break;case"kilo":o=z(l);break;case"percent":o=_t(l);break;case"pct":o=_t(l);break;case"raw":default:o=Number.isInteger(l)?String(l):Pr(l)}return s?o+s:o}function ti(t,e){if(typeof t=="number")return t;if(t)try{return new Function(...Object.keys(e),"return "+t)(...Object.values(e))}catch{return}}const ei=200,si=80,iu=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function ru(t,e){if(!t)return e;const s=Object.fromEntries((e.tools||[]).map(n=>[n.tool,n]));return{...t,...e,tools:t.tools.map(n=>{const l=s[n.tool];return l?{...n,live:l.live,vendor:l.vendor||n.vendor,host:l.host||n.host}:n})}}function cu(t,e){var n,l,o,a;if(!t)return t;if(t.ts.push(e.timestamp),t.files.push(e.total_files),t.tokens.push(e.total_tokens),t.cpu.push(Math.round(e.total_cpu*10)/10),t.mem_mb.push(Math.round(e.total_mem_mb*10)/10),t.mcp.push(e.total_mcp_servers),t.mem_tokens.push(e.total_memory_tokens),t.live_sessions.push(e.total_live_sessions),t.live_tokens.push(e.total_live_estimated_tokens),t.live_in_rate.push(Math.round((e.total_live_inbound_rate_bps||0)*100)/100),t.live_out_rate.push(Math.round((e.total_live_outbound_rate_bps||0)*100)/100),t.ts.length>ei)for(const r of iu)t[r]=t[r].slice(-ei);const s=t.by_tool||{};for(const r of e.tools||[]){if(r.tool==="aictl")continue;const i=((n=r.live)==null?void 0:n.cpu_percent)||0,d=((l=r.live)==null?void 0:l.mem_mb)||0,f=r.tokens||0,p=(((o=r.live)==null?void 0:o.outbound_rate_bps)||0)+(((a=r.live)==null?void 0:a.inbound_rate_bps)||0);s[r.tool]||(s[r.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const m=s[r.tool];if(m.ts.push(e.timestamp),m.cpu.push(Math.round(i*10)/10),m.mem_mb.push(Math.round(d*10)/10),m.tokens.push(f),m.traffic.push(Math.round(p*100)/100),m.ts.length>si)for(const g of Object.keys(m))m[g]=m[g].slice(-si)}return{...t,by_tool:s}}function du(t,e,s={}){const{onConnect:n,onDisconnect:l,initialRetryMs:o=1e3,maxRetryMs:a=3e4,EventSourceClass:r=typeof EventSource<"u"?EventSource:null}=s,[i,d]=R(!1),f=Ot(null),p=Ot(!1),m=Ot(o),g=Ot(e);g.current=e;const x=Ot(n);x.current=n;const E=Ot(l);E.current=l,lt(()=>{if(!r||!t)return;p.current=!1,m.current=o;function b(){if(p.current)return;const $=new r(t);f.current=$,$.onopen=()=>{var k;d(!0),m.current=o,(k=x.current)==null||k.call(x)},$.onmessage=k=>{try{const S=JSON.parse(k.data);g.current(S)}catch{}},$.onerror=()=>{var k;d(!1),(k=E.current)==null||k.call(E),$.close(),p.current||(setTimeout(b,m.current),m.current=Math.min(m.current*2,a))}}return b(),()=>{var $;p.current=!0,($=f.current)==null||$.close(),d(!1)}},[t,r,o,a]);const C=ht(()=>{var b;p.current=!0,(b=f.current)==null||b.close(),d(!1)},[]);return{connected:i,close:C}}function uu(t={}){const{EventSourceClass:e,refreshMs:s=3e4}=t,[n,l]=R(null),[o,a]=R(null),[r,i]=R(null),d=Ot(!1),f=ht(()=>d.current?Promise.resolve():(d.current=!0,Ad().then(g=>{l(g),i(Date.now())}).catch(()=>{}).finally(()=>{d.current=!1})),[]);lt(()=>{f(),Pn().then(a).catch(()=>{})},[f]);const p=ht(g=>{l(x=>x?ru(x,g):g),a(x=>cu(x,g)),i(Date.now())},[]),{connected:m}=du(Ud(),p,e?{EventSourceClass:e}:{});return lt(()=>{if(!s)return;const g=setInterval(f,s);return()=>clearInterval(g)},[f,s]),{snapshot:n,history:o,connected:m,lastUpdateAt:r,refresh:f,setHistory:a}}const ul=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],Ir=Object.fromEntries(ul.map(t=>[t.id,t.seconds])),Nr="aictl-pref-range";function pu(){try{const t=localStorage.getItem(Nr);return t!=null?JSON.parse(t):"live"}catch{return"live"}}function fu(t){try{localStorage.setItem(Nr,JSON.stringify(t))}catch{}}function ni(t){const e=Ir[t]||3600;return{id:t,since:Date.now()/1e3-e,until:null}}function vu(){const[t,e]=R(()=>ni(pu())),s=ht(o=>{const a=ni(o);e(a),fu(o)},[]),n=ht((o,a)=>{e({id:"custom",since:o,until:a})},[]),l=ht(o=>{typeof o=="string"?s(o):o&&typeof o=="object"&&e(o)},[s]);return{range:t,setRange:l,setPreset:s,setCustom:n,presets:ul}}const Rr="aictl-pref-tool_filter";function mu(){try{const t=localStorage.getItem(Rr);return t!=null?JSON.parse(t):null}catch{return null}}function li(t){try{localStorage.setItem(Rr,JSON.stringify(t))}catch{}}function hu(t=[]){const[e,s]=R(mu),n=ht(o=>{s(o),li(o)},[]),l=ht(o=>{s(a=>{let r;return a===null?r=t.filter(i=>i!==o):a.includes(o)?r=a.filter(i=>i!==o):(r=[...a,o],r.length>=t.length&&(r=null)),li(r),r})},[t]);return{selectedTools:e,setTools:n,toggleTool:l,allTools:t}}const nl={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],tabs:[{id:"overview",label:"Dashboard",icon:"📊",iconName:"layout-dashboard",key:"1"},{id:"procs",label:"Processes",icon:"⚙️",iconName:"cpu",key:"2"},{id:"memory",label:"AI Context",icon:"📝",iconName:"brain",key:"3"},{id:"live",label:"Live Monitor",icon:"📡",iconName:"radio",key:"4"},{id:"events",label:"Events & Stats",icon:"📈",iconName:"activity",key:"5"},{id:"budget",label:"Token Budget",icon:"💰",iconName:"wallet",key:"6"},{id:"sessions",label:"Sessions",icon:"🔄",iconName:"refresh-cw",key:"7"},{id:"analytics",label:"Analytics",icon:"🔬",iconName:"bar-chart-3",key:"8"},{id:"flow",label:"Session Flow",icon:"🔀",iconName:"git-branch",key:"9"},{id:"transcript",label:"Transcript",icon:"📜",iconName:"file-text",key:"t"},{id:"timeline",label:"Timeline",icon:"📉",iconName:"line-chart",key:"y"},{id:"config",label:"Configuration",icon:"⚙️",iconName:"settings",key:"0"}]},jr="aictl-pref-active_tab",oi=nl.tabs;function gu(){try{const t=localStorage.getItem(jr);return t!=null?JSON.parse(t):"overview"}catch{return"overview"}}function $u(t){if(!t)return!1;const e=t.tagName;return e==="INPUT"||e==="TEXTAREA"||e==="SELECT"||t.isContentEditable}function _u(){const[t,e]=R(gu),s=ht(n=>{e(n);try{localStorage.setItem(jr,JSON.stringify(n))}catch{}},[]);return lt(()=>{const n=l=>{if($u(l.target)||l.metaKey||l.ctrlKey||l.altKey)return;const o=oi.find(a=>a.key===l.key);o&&s(o.id)};return document.addEventListener("keydown",n),()=>document.removeEventListener("keydown",n)},[s]),{activeTab:t,setActiveTab:s,tabs:oi}}const Br="aictl-theme",Hr=new Set(Sn);function yu(){try{const t=localStorage.getItem(Br);return Hr.has(t)?t:"auto"}catch{return"auto"}}function bu(){const[t,e]=R(yu);lt(()=>{document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem(Br,t)}catch{}},[t]);const s=ht(l=>{Hr.has(l)&&e(l)},[]),n=ht(()=>{e(l=>Sn[(Sn.indexOf(l)+1)%Sn.length])},[]);return{theme:t,setTheme:s,cycleTheme:n,themes:Sn}}const Wr=["compact","normal","spacious"],qr="aictl-density",Vr=new Set(Wr);function ku(){try{const t=localStorage.getItem(qr);return Vr.has(t)?t:"normal"}catch{return"normal"}}function xu(){const[t,e]=R(ku);lt(()=>{document.documentElement.setAttribute("data-density",t);try{localStorage.setItem(qr,t)}catch{}},[t]);const s=ht(n=>{Vr.has(n)&&e(n)},[]);return{density:t,setDensity:s,densities:Wr}}function wu({path:t,onClose:e}){const{snap:s}=jt(Rt),[n,l]=R(null),[o,a]=R(!1),[r,i]=R(null),d=Ot(null),f=Ot(null),[p,m]=R(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),g=Ot(!1),x=Ot(0),E=Ot(0),C=ht(A=>{g.current=!0,x.current=A.clientX,E.current=p,A.preventDefault()},[p]);if(lt(()=>{const A=F=>{if(!g.current)return;const y=x.current-F.clientX,T=window.innerWidth,O=Math.min(90,Math.max(20,E.current+y/T*100));m(O)},M=()=>{if(g.current){g.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(p)))}catch{}}};return window.addEventListener("mousemove",A),window.addEventListener("mouseup",M),()=>{window.removeEventListener("mousemove",A),window.removeEventListener("mouseup",M)}},[p]),lt(()=>{if(!t)return;f.current=document.activeElement;const A=setTimeout(()=>{var y;const F=(y=d.current)==null?void 0:y.querySelector("button");F&&F.focus()},50),M=F=>{if(F.key!=="Tab"||!d.current)return;const y=d.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!y.length)return;const T=y[0],O=y[y.length-1];F.shiftKey&&document.activeElement===T?(F.preventDefault(),O.focus()):!F.shiftKey&&document.activeElement===O&&(F.preventDefault(),T.focus())};return document.addEventListener("keydown",M),()=>{clearTimeout(A),document.removeEventListener("keydown",M),f.current&&f.current.focus&&f.current.focus()}},[t]),lt(()=>{t&&(a(!1),i(null),Go(t).then(l).catch(A=>i(A.message)))},[t]),!t)return null;const b=at(()=>{if(!s)return"";for(const A of s.tools)for(const M of A.files)if(M.path===t)return(M.kind||"")+" | "+$t(M.size)+" | ~"+z(M.tokens)+"tok | scope:"+(M.scope||"?")+" | sent_to_llm:"+(M.sent_to_llm||"?")+" | loaded:"+(M.loaded_when||"?");for(const A of s.agent_memory)if(A.file===t)return A.source+" | "+A.profile+" | "+A.tokens+"tok | "+A.lines+"ln";return""},[s,t]),$=n?n.split(`
`):[],k=$.length,S=k>Zs*2,N=(A,M)=>A.map((F,y)=>c`<div class="fv-line"><span class="fv-ln">${M+y}</span><span class="fv-code">${V(F)||" "}</span></div>`);return c`<div class="fv" ref=${d} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+p+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${C}/>
    <div class="fv-head">
      <span class="path">${t}</span>
      <button onClick=${e} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${b}</div>
    <div class="fv-body">
      ${r?c`<p class="text-red" style="padding:var(--sp-10)">${r}</p>`:n?!S||o?c`<div class="fv-lines">${N($,1)}</div>`:c`<div class="fv-lines">${N($.slice(0,Zs),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>a(!0)}>\u25BC ${k-Zs*2} more lines \u25BC</div>
            <div class="fv-lines">${N($.slice(-Zs),k-Zs+1)}</div>`:c`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${k} lines${S&&!o?" (showing "+Zs*2+" of "+k+")":""}</span>
      ${S&&c`<button onClick=${()=>a(!o)}>${o?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function xo({file:t,dirPrefix:e}){var A;const[s,n]=R(!1),[l,o]=R(!1),[a,r]=R(null),[i,d]=R(null),[f,p]=R(!1),m=jt(Rt),g=(t.path||"").replace(/\\/g,"/").split("/").pop(),x=(t.sent_to_llm||"").toLowerCase(),E=t.mtime&&Date.now()/1e3-t.mtime<300,C=(A=m.recentFiles)==null?void 0:A.get(t.path),b=!!C,$=ht(async()=>{if(s){n(!1);return}n(!0),p(!0),d(null);try{const M=await Go(t.path);r(M)}catch(M){d(M.message)}finally{p(!1)}},[s,t.path]),k=(M,F)=>M.map((y,T)=>c`<span class="pline"><span class="ln">${F+T}</span>${V(y)||" "}</span>`),S=()=>{if(f)return c`<span class="text-muted">loading...</span>`;if(i)return c`<span class="text-red">${i}</span>`;if(!a)return null;const M=a.split(`
`),F=M.length;if(F<=nn*3||l)return c`${k(M,1)}
        <div class="prev-actions">
          ${l&&c`<button class="prev-btn" onClick=${()=>o(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>m.openViewer(t.path)}>open in viewer</button>
        </div>`;const T=M.slice(-nn),O=F-nn+1;return c`${k(T,O)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>o(!0)}>show all (${F} lines)</button>
        <button class="prev-btn" onClick=${()=>m.openViewer(t.path)}>open in viewer</button>
      </div>`},N=t.size>0?Math.round(t.size/60):0;return c`<div>
    <button class="fitem" onClick=${$} aria-expanded=${s} title=${t.path}>
      ${b?c`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Be(C.ts)}${C.growth>0?" +"+$t(C.growth):""}">●</span>`:E?c`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Be(t.mtime)}">●</span>`:c`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${e?c`<span class="text-muted">${e}/</span>`:""}${V(g)}</span>
      <span class="fmeta">
        ${x&&x!=="no"&&c`<span style="color:${Fr(x)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${x}">${x==="yes"?"◆":x==="on-demand"?"◇":"○"}</span>`}
        ${$t(t.size)}${N?c` <span class="text-muted">${N}ln</span>`:""}${t.tokens?c` <span class="text-muted">${z(t.tokens)}t</span>`:""}
        ${t.mtime&&E?c` <span class="text-orange text-xs">${Be(t.mtime)}</span>`:""}
      </span>
    </button>
    ${s&&c`<div class="inline-preview">${S()}</div>`}
  </div>`}function Su({dir:t,files:e}){const[s,n]=R(!1),l=e.reduce((a,r)=>a+r.tokens,0),o=e.reduce((a,r)=>a+r.size,0);return c`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-muted" title=${t}>${V(t)}</span>
      <span class="badge">${e.length}</span>
      <span class="badge">${$t(o)}</span>
      <span class="badge">${z(l)}t</span>
    </button>
    ${s&&c`<div style=${{paddingLeft:"var(--sp-8)"}}>${e.map(a=>c`<${xo} key=${a.path} file=${a}/>`)}</div>`}
  </div>`}function Cu({label:t,files:e,root:s,badge:n,style:l,startOpen:o}){const[a,r]=R(!!o),i=at(()=>ou(e,s),[e,s]),d=at(()=>e.reduce((g,x)=>g+x.tokens,0),[e]),f=at(()=>e.reduce((g,x)=>g+x.size,0),[e]),p=at(()=>{var x;const g={};return e.forEach(E=>{const C=(E.sent_to_llm||"no").toLowerCase();g[C]=(g[C]||0)+1}),((x=Object.entries(g).sort((E,C)=>C[1]-E[1])[0])==null?void 0:x[0])||"no"},[e]),m=()=>i.length===1&&i[0][1].length<=3?i[0][1].map(g=>c`<${xo} key=${g.path} file=${g}/>`):i.map(([g,x])=>x.length===1?c`<div style=${{marginLeft:"var(--sp-5)"}}><${xo} key=${x[0].path} file=${x[0]} dirPrefix=${g}/></div>`:c`<${Su} key=${g} dir=${g} files=${x}/>`);return c`<div class="cat-group" style=${l||""}>
    <button class=${"cat-head"+(a?" open":"")} onClick=${()=>r(!a)} aria-expanded=${a}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${Fr(p)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${p}"></span>
      <span class="cat-label" title=${t}>${V(t)}</span>
      <span class="badge" style="flex-shrink:0">${n||e.length}</span>
      <span class="badge">${$t(f)}</span>
      <span class="badge">${z(d)}t</span>
    </button>
    ${a&&c`<div style=${{paddingLeft:"var(--sp-8)"}}>${m()}</div>`}
  </div>`}/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ur=(...t)=>t.filter((e,s,n)=>!!e&&e.trim()!==""&&n.indexOf(e)===s).join(" ").trim();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ai=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tu=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,s,n)=>n?n.toUpperCase():s.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ii=t=>{const e=Tu(t);return e.charAt(0).toUpperCase()+e.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Mu={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Du=Cr({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),Eu=()=>jt(Du);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lu=t=>{for(const e in t)if(e.startsWith("aria-")||e==="role"||e==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Au=({color:t,size:e,strokeWidth:s,absoluteStrokeWidth:n,children:l,iconNode:o,class:a="",...r})=>{const{size:i=24,strokeWidth:d=2,absoluteStrokeWidth:f=!1,color:p="currentColor",class:m=""}=Eu()??{},g=n??f?Number(s??d)*24/Number(e??i):s??d;return An("svg",{...Mu,width:e??i??24,height:e??i??24,stroke:t??p,"stroke-width":g,class:Ur("lucide",m,a),...!l&&!Lu(r)&&{"aria-hidden":"true"},...r},[...o.map(([x,E])=>An(x,E)),...kr(l)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=(t,e)=>{const s=({class:n="",className:l="",children:o,...a})=>An(Au,{...a,iconNode:e,class:Ur(`lucide-${ai(ii(t))}`,`lucide-${ai(t)}`,n,l)},o);return s.displayName=ii(t),s};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ou=ae("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pu=ae("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zu=ae("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fu=ae("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Iu=ae("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nu=ae("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ru=ae("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ju=ae("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bu=ae("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hu=ae("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wu=ae("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qu=ae("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vu=ae("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uu=ae("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gu=ae("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yu=ae("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ku=ae("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]),Ju={activity:Ou,"alert-triangle":Gu,"bar-chart-3":zu,brain:Pu,"chevron-down":Iu,"chevron-right":Nu,cpu:Ru,"file-text":ju,"git-branch":Bu,"layout-dashboard":Hu,"line-chart":Fu,radio:Wu,"refresh-cw":qu,search:Vu,settings:Uu,wallet:Yu,x:Ku};function pl({name:t,size:e="1em",strokeWidth:s=2,...n}){if(!t)return null;const l=Ju[String(t)];return l?c`<${l} size=${e} strokeWidth=${s} aria-hidden="true" ...${n} />`:c`<span aria-hidden="true" ...${n}>${t}</span>`}function oo({label:t,data:e,color:s}){const n=Ot(null);return lt(()=>{const l=n.current;if(!l||!e||e.length<2)return;const o=l.getContext("2d"),a=l.width=l.offsetWidth*(window.devicePixelRatio||1),r=l.height=l.offsetHeight*(window.devicePixelRatio||1);o.clearRect(0,0,a,r);const i=e.slice(-60),d=Math.max(...i)*1.1||1,f=a/(i.length-1);o.beginPath(),o.strokeStyle=s,o.lineWidth=1.5*(window.devicePixelRatio||1),i.forEach((p,m)=>{const g=m*f,x=r-p/d*r*.85;m===0?o.moveTo(g,x):o.lineTo(g,x)}),o.stroke()},[e,s]),c`<div style="position:relative;height:25px">
    <span class="text-muted" style="position:absolute;top:0;left:0;font-size:var(--fs-2xs);z-index:1">${t}</span>
    <canvas ref=${n} aria-hidden="true" style="width:100%;height:100%;display:block"/>
  </div>`}function Zu({processes:t,maxMem:e}){if(!t||!t.length)return null;const s=t.reduce((a,r)=>a+(parseFloat(r.mem_mb)||0),0),n=t.reduce((a,r)=>a+(parseFloat(r.cpu_pct)||0),0),l={};t.forEach(a=>{const r=a.process_type||"process";(l[r]=l[r]||[]).push(a)});const o=Object.keys(l).length>1;return c`<div class="proc-section">
    <h3>Processes <span class="badge">${t.length}</span>
      <span class="badge">CPU ${_t(n)}</span>
      <span class="badge">MEM ${$t(s*1048576)}</span></h3>
    ${Object.entries(l).map(([a,r])=>{const i={};return r.forEach(d=>(i[d.name||"unknown"]=i[d.name||"unknown"]||[]).push(d)),c`<div style="margin-bottom:var(--sp-2)">
        ${o?c`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${V(a)}</div>`:null}
        ${Object.entries(i).map(([d,f])=>{const p=f.sort((m,g)=>(parseFloat(g.mem_mb)||0)-(parseFloat(m.mem_mb)||0));return c`<div key=${d} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${o?"":c`<span style="text-transform:uppercase;letter-spacing:0.03em">${V(a)}</span>${" · "}`}${V(d)} <span style="opacity:0.6">(${f.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${p.map(m=>{const g=parseFloat(m.cpu_pct)||0,x=parseFloat(m.mem_mb)||0,E=Math.max(2,Math.min(g,100)),C=g>80?"var(--red)":g>50?"var(--orange)":g>5?"var(--green)":"var(--fg2)",b=m.anomalies&&m.anomalies.length,$=m.zombie_risk&&m.zombie_risk!=="none";return c`<div key=${m.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${b?"border-left:2px solid var(--red);":""}${$?"border-left:2px solid var(--orange);":""}"
                  title=${m.cmdline||m.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${E}%;height:100%;background:${C};border-radius:2px"></div>
                    </div>
                    <span style="color:${C};min-width:3ch;text-align:right">${_t(g)}</span>
                  </div>
                  <div class="mono text-muted">${m.pid}</div>
                  <div>${$t(x*1048576)}</div>
                  ${b?c`<div class="text-red">\u26A0${m.anomalies.length}</div>`:null}
                </div>`})}
            </div>
          </div>`})}
      </div>`})}
  </div>`}function Qu({config:t}){if(!t)return null;const e=Object.entries(t.settings||{}),s=Object.entries(t.features||{}),n=(t.mcp_servers||[]).length>0,l=(t.extensions||[]).length>0,o=t.otel||{},a=t.hints||[];return!e.length&&!s.length&&!n&&!l&&!o.enabled&&!a.length&&t.model==null&&t.launch_at_startup==null?null:c`<div class="live-section">
    <h3>Configuration
      ${t.launch_at_startup===!0&&c`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${t.launch_at_startup===!1&&c`<span class="badge">no auto-start</span>`}
      ${t.auto_update===!0&&c`<span class="badge">auto-update</span>`}
      ${t.model&&c`<span class="badge">${t.model}</span>`}
      ${o.enabled&&c`<span class="badge" style="background:var(--green);color:var(--bg)">OTel ${o.exporter||"on"}</span>`}
      ${!o.enabled&&o.source&&c`<span class="badge" style="background:var(--orange);color:var(--bg)">OTel off</span>`}
    </h3>
    <div class="metric-grid">
      ${o.enabled&&c`<div class="metric-chip" style="border-color:var(--green)">
        <span class="mlabel text-green">OpenTelemetry</span>
        <div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Exporter:</span> <span class="mono">${o.exporter}</span>
        </div>
        ${o.endpoint&&c`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Endpoint:</span> <span class="mono">${o.endpoint}</span>
        </div>`}
        ${o.file_path&&c`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">File:</span> <span class="mono">${o.file_path}</span>
        </div>`}
        ${o.capture_content&&c`<div class="text-orange" style="font-size:var(--fs-base);padding:0.05rem 0">\u26A0 Content capture enabled</div>`}
      </div>`}
      ${e.length>0&&c`<div class="metric-chip">
        <span class="mlabel">Settings</span>
        ${e.map(([r,i])=>c`<div key=${r} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${r}</span>
          <span class="mono">${typeof i=="object"?JSON.stringify(i):String(i)}</span>
        </div>`)}
      </div>`}
      ${Object.entries(t.feature_groups||{}).map(([r,i])=>c`<div key=${r} class="metric-chip">
        <span class="mlabel">${r}</span>
        ${Object.entries(i).map(([d,f])=>c`<div key=${d} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${d}</span>
          <span style="color:${f===!0?"var(--green)":f===!1?"var(--red)":"var(--fg)"}">${typeof f=="object"?JSON.stringify(f):String(f)}</span>
        </div>`)}
      </div>`)}
      ${s.length>0&&!Object.keys(t.feature_groups||{}).length&&c`<div class="metric-chip">
        <span class="mlabel">Features</span>
        ${s.map(([r,i])=>c`<div key=${r} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${r}</span>
          <span style="color:${i===!0?"var(--green)":i===!1?"var(--red)":"var(--fg)"}">${String(i)}</span>
        </div>`)}
      </div>`}
      ${n&&c`<div class="metric-chip">
        <span class="mlabel">MCP Servers</span>
        <div class="stack-list">${t.mcp_servers.map((r,i)=>c`<span class="pill mono" key=${r||i}>${r}</span>`)}</div>
      </div>`}
      ${l&&c`<div class="metric-chip">
        <span class="mlabel">Extensions</span>
        <div class="stack-list">${t.extensions.map(r=>c`<span class="pill mono" key=${r}>${r}</span>`)}</div>
      </div>`}
    </div>
    ${a.length>0&&c`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
      ${a.map(r=>c`<div class="text-orange" style="font-size:var(--fs-base);padding:0.15rem 0">
        <span style="margin-right:var(--sp-3)">\u{1F4A1}</span>${r}
      </div>`)}
    </div>`}
  </div>`}function Xu({telemetry:t}){if(!t)return null;const e=t,s=(e.input_tokens||0)+(e.output_tokens||0),n=e.errors||[],l=e.quota_state||{};if(!s&&!e.active_session_input&&!n.length)return null;const[o,a]=R(!1);return c`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${e.source}</span> <span class="badge">${_t(e.confidence*100)} confidence</span>
      ${n.length>0&&c`<span class="badge warn cursor-ptr" onClick=${r=>{r.stopPropagation(),a(!o)}}>${n.length} error${n.length>1?"s":""}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${Gt(e.input_tokens||0)} tok</span>
        <span class="msub">cache read: ${Gt(e.cache_read_tokens||0)} tok \u00B7 creation: ${Gt(e.cache_creation_tokens||0)} tok</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${Gt(e.output_tokens||0)} tok</span>
        <span class="msub">${z(e.total_sessions||0)} sessions \u00B7 ${z(e.total_messages||0)} messages</span>
      </div>
      ${e.cost_usd>0?c`<div class="metric-chip">
        <span class="mlabel">Estimated Cost</span>
        <span class="mvalue">$${e.cost_usd.toFixed(2)}</span>
      </div>`:null}
      ${(l.premium_requests_used>0||l.total_api_duration_ms>0)&&c`<div class="metric-chip">
        <span class="mlabel">Operational</span>
        ${l.premium_requests_used>0&&c`<div style="font-size:var(--fs-base)">Premium requests: <span class="mono">${l.premium_requests_used}</span></div>`}
        ${l.total_api_duration_ms>0&&c`<div style="font-size:var(--fs-base)">API time: <span class="mono">${Math.round(l.total_api_duration_ms/1e3)}s</span></div>`}
        ${l.current_model&&c`<div style="font-size:var(--fs-base)">Model: <span class="mono">${l.current_model}</span></div>`}
        ${l.code_changes&&c`<div class="text-green" style="font-size:var(--fs-base)">+${l.code_changes.lines_added} -${l.code_changes.lines_removed} (${l.code_changes.files_modified} files)</div>`}
      </div>`}
      ${e.active_session_input>0||e.active_session_output>0?c`<div class="metric-chip" style="border-color:var(--accent)">
        <span class="mlabel">Active Session</span>
        <span class="mvalue">${Gt((e.active_session_input||0)+(e.active_session_output||0))} tok</span>
        <span class="msub">in: ${Gt(e.active_session_input||0)} \u00B7 out: ${Gt(e.active_session_output||0)} \u00B7 ${e.active_session_messages||0} msgs</span>
      </div>`:null}
      ${Object.keys(e.by_model||{}).length>0?c`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(e.by_model).map(([r,i])=>c`<div key=${r} class="flex-between flex-wrap" style="font-size:var(--fs-md);padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${r}</span>
          <span>in:${Gt(i.input_tokens||0)} tok out:${Gt(i.output_tokens||0)} tok${i.cache_read_tokens?" cR:"+Gt(i.cache_read_tokens)+" tok":""}${i.requests?" · "+i.requests+"req":""}${i.cost_usd?" · $"+i.cost_usd.toFixed(2):""}</span>
        </div>`)}
      </div>`:null}
    </div>
    ${o&&n.length>0&&c`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--red);background:color-mix(in srgb,var(--red) 8%,transparent);border-radius:0 4px 4px 0;max-height:10rem;overflow-y:auto">
      <div class="text-red text-bold" style="font-size:var(--fs-base);margin-bottom:0.2rem">Recent Errors</div>
      ${n.map(r=>c`<div class="flex-row gap-sm" style="font-size:var(--fs-sm);padding:0.1rem 0">
        <span class="mono text-muted text-nowrap">${(r.timestamp||"").slice(11,19)}</span>
        <span class="badge" style="font-size:var(--fs-xs);background:var(--red);color:var(--bg);padding:0.05rem var(--sp-2)">${r.type}</span>
        <span class="text-muted">${r.message}</span>
        ${r.model&&c`<span class="mono text-muted">${r.model}</span>`}
      </div>`)}
    </div>`}
  </div>`}function tp({live:t}){if(!t)return null;const e=t.token_estimate||{},s=t.mcp||{},n=Uo(t);return c`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${t.session_count||0} sess</span>
      <span class="badge">${t.pid_count||0} pid</span>
      <span class="badge">${_t((t.confidence||0)*100)} conf</span>
      ${s.detected&&c`<span class="badge warn">${s.loops||0} MCP loop${(s.loops||0)===1?"":"s"}</span>`}
    </h3>
    <div class="metric-grid" aria-live="polite" aria-relevant="text" aria-atomic="false">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">\u2191 ${je(t.outbound_rate_bps||0)}</span>
        <span class="msub">\u2193 ${je(t.inbound_rate_bps||0)} total ${$t((t.outbound_bytes||0)+(t.inbound_bytes||0))}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Tokens</span>
        <span class="mvalue">${z(n)}</span>
        <span class="msub">${e.source||"network-inference"} at ${_t((e.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">MCP</span>
        <span class="mvalue">${s.detected?"Detected":"No loop"}</span>
        <span class="msub">${s.loops||0} loops at ${_t((s.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Context</span>
        <span class="mvalue">${t.files_touched||0} files</span>
        <span class="msub">${t.file_events||0} events \u00B7 repo ${$t((t.workspace_size_mb||0)*1048576)}</span>
      </div>
      ${(t.state_bytes_written||0)>0&&c`<div class="metric-chip">
        <span class="mlabel">State Writes</span>
        <span class="mvalue">${$t(t.state_bytes_written||0)}</span>
      </div>`}
      <div class="metric-chip">
        <span class="mlabel">CPU</span>
        <span class="mvalue">${_t(t.cpu_percent||0)}</span>
        <span class="msub">peak ${_t(t.peak_cpu_percent||0)}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Workspaces</span>
        <span class="mvalue">${(t.workspaces||[]).length||0}</span>
        <span class="msub mono">${(t.workspaces||[]).slice(0,2).join(" | ")||"(unknown)"}</span>
      </div>
    </div>
  </div>`}function wo({tool:t,root:e}){var S,N,A,M,F,y,T,O;const[s,n]=R(!1),{snap:l,history:o}=jt(Rt),a=at(()=>((l==null?void 0:l.tool_configs)||[]).find(P=>P.tool===t.tool),[l,t.tool]),r=at(()=>{var P;return(P=o==null?void 0:o.by_tool)==null?void 0:P[t.tool]},[o,t.tool]),i=Dt[t.tool]||"var(--fg2)",d=me[t.tool]||"🔹",f=t.files.reduce((P,D)=>P+D.tokens,0),p=t.processes.filter(P=>P.anomalies&&P.anomalies.length).length,m=Uo(t.live),g=(((S=t.live)==null?void 0:S.outbound_rate_bps)||0)+(((N=t.live)==null?void 0:N.inbound_rate_bps)||0),x=t.processes.reduce((P,D)=>P+(parseFloat(D.cpu_pct)||0),0),E=t.processes.reduce((P,D)=>P+(parseFloat(D.mem_mb)||0),0),C=at(()=>Math.max(...t.processes.map(P=>parseFloat(P.mem_mb)||0),100),[t.processes]),b=(((M=(A=t.token_breakdown)==null?void 0:A.telemetry)==null?void 0:M.errors)||[]).length,$=at(()=>{const P={};return t.files.forEach(D=>{const q=D.kind||"other";(P[q]=P[q]||[]).push(D)}),Object.keys(P).sort((D,q)=>{const H=Xa.indexOf(D),U=Xa.indexOf(q);return(H<0?99:H)-(U<0?99:U)}).map(D=>({kind:D,files:P[D]}))},[t.files]),k="tcard"+(s?" open":"")+(p||b?" has-anomaly":"");return c`<div class=${k}>
    <button class="tcard-head" onClick=${()=>n(!s)} aria-expanded=${s}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)">${d}</span>${V(t.label)}</h2>
      <span class="badge" data-dp="procs.tool.files">${t.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${z(f)} tok</span>
      ${t.processes.length>0&&c`<span class="badge" data-dp="procs.tool.process_count">${t.processes.length} proc ${_t(x)} ${$t(E*1048576)}</span>`}
      ${t.mcp_servers.length>0&&c`<span class="badge" data-dp="procs.tool.mcp_server_count">${t.mcp_servers.length} MCP</span>`}
      ${p>0&&c`<span class="badge warn" data-dp="procs.tool.anomaly">${p} anomaly</span>`}
      ${b>0&&c`<span class="badge" style="background:var(--red);color:var(--bg)">${b} error${b>1?"s":""}</span>`}
      ${t.live&&c`<span class="badge" style="background:var(--accent);color:var(--bg)">${t.live.session_count||0} live \u00B7 ${je(g)}${m>0?" · "+z(m)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${$.map(({kind:P,files:D})=>c`<span class="text-muted" style="font-size:var(--fs-xs)">${P}:${D.length}</span>`)}
      </div>
      ${r&&r.ts.length>2&&!s&&c`<div role="img" aria-label=${"Sparkline charts for "+t.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${P=>P.stopPropagation()}>
        <${oo} label="CPU" data=${r.cpu} color=${i}/>
        <${oo} label="MEM" data=${r.mem_mb} color=${"var(--green)"}/>
        <${oo} label=${t.live?"Traffic":"Tokens"} data=${t.live?r.traffic:r.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${s&&c`<div class="tcard-body">
      ${((F=Qa[t.tool])==null?void 0:F.length)>0&&c`<div class="tool-relationships">
        ${Qa[t.tool].map(P=>c`<span key=${P.label} class="rel-badge rel-${P.type}"
          title=${P.label}>${P.label}</span>`)}
      </div>`}
      <${Qu} config=${a}/>
      <${Xu} telemetry=${(y=t.token_breakdown)==null?void 0:y.telemetry}/>
      <${tp} live=${t.live}/>
      ${$.map(({kind:P,files:D})=>c`<${Cu} key=${P} label=${P} files=${D} root=${e}/>`)}
      <${Zu} processes=${(O=(T=t.live)==null?void 0:T.processes)!=null&&O.length?t.live.processes:t.processes} maxMem=${C}/>
      ${t.mcp_servers.length>0&&c`<div class="proc-section"><h3>MCP Servers</h3>
        ${t.mcp_servers.map(P=>c`<div key=${P.name||P.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${V(P.name)}</span>
          <span class="fmeta">${V((P.config||{}).command||"")} ${((P.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function ep({groupKey:t,groupLabel:e,groupColor:s,tools:n,root:l}){const[o,a]=R(!0),r=n.reduce((d,f)=>d+f.files.length,0),i=n.reduce((d,f)=>d+f.files.reduce((p,m)=>p+m.tokens,0),0);return c`<div class="mb-md">
    <button onClick=${()=>a(!o)} aria-expanded=${o}
      class="flex-row gap-sm cursor-ptr" style="background:none;border:none;padding:var(--sp-3) 0;font:inherit;color:var(--fg);width:100%">
      <span style="font-size:var(--fs-xs);transition:transform 0.15s;${o?"transform:rotate(90deg)":""}">\u25B6</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${s};flex-shrink:0"></span>
      <span class="text-bolder" style="font-size:var(--fs-lg)">${e}</span>
      <span class="badge">${n.length} tools</span>
      <span class="badge">${r} files</span>
      <span class="badge">${z(i)} tok</span>
    </button>
    ${o&&c`<div class="tool-grid" style="margin-top:var(--sp-3)">
      ${n.map(d=>c`<${wo} key=${d.tool} tool=${d} root=${l}/>`)}
    </div>`}
  </div>`}function sp(){const{snap:t}=jt(Rt),[e,s]=R("product"),n=i=>i.files.length||i.processes.length||i.mcp_servers.length||i.live,l=(i,d)=>{const f=i.files.length*2+i.processes.length+i.mcp_servers.length;return d.files.length*2+d.processes.length+d.mcp_servers.length-f||i.tool.localeCompare(d.tool)},o=at(()=>t?t.tools.filter(i=>!i.meta&&n(i)).sort(l):[],[t]),a=at(()=>t?t.tools.filter(i=>i.meta&&i.tool!=="project-env"&&n(i)).sort(l):[],[t]),r=at(()=>{if(e==="product"||!o.length)return null;const i={};return o.forEach(d=>{if(e==="vendor"){const f=d.vendor||"community",p=Or[f]||f,m=Gd[f]||"var(--fg2)";i[f]||(i[f]={label:p,color:m,tools:[]}),i[f].tools.push(d)}else{const f=(d.host||"any").split(",");for(const p of f){const m=p.trim(),g=Yd[m]||m,x="var(--fg2)";i[m]||(i[m]={label:g,color:x,tools:[]}),i[m].tools.push(d)}}}),Object.entries(i).sort((d,f)=>{const p=d[1].tools.reduce((g,x)=>g+x.files.length,0);return f[1].tools.reduce((g,x)=>g+x.files.length,0)-p})},[o,e]);return t?!o.length&&!a.length?c`<p class="empty-state">No AI tool resources found.</p>`:c`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${Xd.map(i=>c`<button key=${i.id}
        class=${e===i.id?"range-btn active":"range-btn"}
        onClick=${()=>s(i.id)}>${i.label}</button>`)}
    </div>
    ${o.length>0&&(r?r.map(([i,d])=>c`<${ep} key=${i}
      groupKey=${i} groupLabel=${d.label} groupColor=${d.color}
      tools=${d.tools} root=${t.root}/>`):c`<div class="tool-grid">
        ${o.map(i=>c`<${wo} key=${i.tool} tool=${i} root=${t.root}/>`)}
      </div>`)}
    ${a.length>0&&c`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)"><${pl} name="chevron-right" size="0.8em"/></span>
        <span>Project Context</span>
        <span class="badge">${a.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${a.map(i=>c`<${wo} key=${i.tool} tool=${i} root=${t.root}/>`)}
      </div>
    </details>`}
  </div>`:c`<p class="loading-state">Loading...</p>`}const np=!0,Kt="u-",lp="uplot",op=Kt+"hz",ap=Kt+"vt",ip=Kt+"title",rp=Kt+"wrap",cp=Kt+"under",dp=Kt+"over",up=Kt+"axis",Ts=Kt+"off",pp=Kt+"select",fp=Kt+"cursor-x",vp=Kt+"cursor-y",mp=Kt+"cursor-pt",hp=Kt+"legend",gp=Kt+"live",$p=Kt+"inline",_p=Kt+"series",yp=Kt+"marker",ri=Kt+"label",bp=Kt+"value",Cn="width",Tn="height",xn="top",ci="bottom",Qs="left",ao="right",Yo="#000",di=Yo+"0",io="mousemove",ui="mousedown",ro="mouseup",pi="mouseenter",fi="mouseleave",vi="dblclick",kp="resize",xp="scroll",mi="change",fl="dppxchange",Ko="--",pn=typeof window<"u",So=pn?document:null,ln=pn?window:null,wp=pn?navigator:null;let mt,Yn;function Co(){let t=devicePixelRatio;mt!=t&&(mt=t,Yn&&Mo(mi,Yn,Co),Yn=matchMedia(`(min-resolution: ${mt-.001}dppx) and (max-resolution: ${mt+.001}dppx)`),Ms(mi,Yn,Co),ln.dispatchEvent(new CustomEvent(fl)))}function be(t,e){if(e!=null){let s=t.classList;!s.contains(e)&&s.add(e)}}function To(t,e){let s=t.classList;s.contains(e)&&s.remove(e)}function Tt(t,e,s){t.style[e]=s+"px"}function Ie(t,e,s,n){let l=So.createElement(t);return e!=null&&be(l,e),s!=null&&s.insertBefore(l,n),l}function Ee(t,e){return Ie("div",t,e)}const hi=new WeakMap;function Ke(t,e,s,n,l){let o="translate("+e+"px,"+s+"px)",a=hi.get(t);o!=a&&(t.style.transform=o,hi.set(t,o),e<0||s<0||e>n||s>l?be(t,Ts):To(t,Ts))}const gi=new WeakMap;function $i(t,e,s){let n=e+s,l=gi.get(t);n!=l&&(gi.set(t,n),t.style.background=e,t.style.borderColor=s)}const _i=new WeakMap;function yi(t,e,s,n){let l=e+""+s,o=_i.get(t);l!=o&&(_i.set(t,l),t.style.height=s+"px",t.style.width=e+"px",t.style.marginLeft=n?-e/2+"px":0,t.style.marginTop=n?-s/2+"px":0)}const Jo={passive:!0},Sp={...Jo,capture:!0};function Ms(t,e,s,n){e.addEventListener(t,s,n?Sp:Jo)}function Mo(t,e,s,n){e.removeEventListener(t,s,Jo)}pn&&Co();function Ne(t,e,s,n){let l;s=s||0,n=n||e.length-1;let o=n<=2147483647;for(;n-s>1;)l=o?s+n>>1:ke((s+n)/2),e[l]<t?s=l:n=l;return t-e[s]<=e[n]-t?s:n}function Gr(t){return(s,n,l)=>{let o=-1,a=-1;for(let r=n;r<=l;r++)if(t(s[r])){o=r;break}for(let r=l;r>=n;r--)if(t(s[r])){a=r;break}return[o,a]}}const Yr=t=>t!=null,Kr=t=>t!=null&&t>0,xl=Gr(Yr),Cp=Gr(Kr);function Tp(t,e,s,n=0,l=!1){let o=l?Cp:xl,a=l?Kr:Yr;[e,s]=o(t,e,s);let r=t[e],i=t[e];if(e>-1)if(n==1)r=t[e],i=t[s];else if(n==-1)r=t[s],i=t[e];else for(let d=e;d<=s;d++){let f=t[d];a(f)&&(f<r?r=f:f>i&&(i=f))}return[r??bt,i??-bt]}function wl(t,e,s,n){let l=xi(t),o=xi(e);t==e&&(l==-1?(t*=s,e/=s):(t/=s,e*=s));let a=s==10?ss:Jr,r=l==1?ke:Le,i=o==1?Le:ke,d=r(a(Yt(t))),f=i(a(Yt(e))),p=rn(s,d),m=rn(s,f);return s==10&&(d<0&&(p=kt(p,-d)),f<0&&(m=kt(m,-f))),n||s==2?(t=p*l,e=m*o):(t=tc(t,p),e=Sl(e,m)),[t,e]}function Zo(t,e,s,n){let l=wl(t,e,s,n);return t==0&&(l[0]=0),e==0&&(l[1]=0),l}const Qo=.1,bi={mode:3,pad:Qo},En={pad:0,soft:null,mode:0},Mp={min:En,max:En};function vl(t,e,s,n){return Cl(s)?ki(t,e,s):(En.pad=s,En.soft=n?0:null,En.mode=n?3:0,ki(t,e,Mp))}function ft(t,e){return t??e}function Dp(t,e,s){for(e=ft(e,0),s=ft(s,t.length-1);e<=s;){if(t[e]!=null)return!0;e++}return!1}function ki(t,e,s){let n=s.min,l=s.max,o=ft(n.pad,0),a=ft(l.pad,0),r=ft(n.hard,-bt),i=ft(l.hard,bt),d=ft(n.soft,bt),f=ft(l.soft,-bt),p=ft(n.mode,0),m=ft(l.mode,0),g=e-t,x=ss(g),E=pe(Yt(t),Yt(e)),C=ss(E),b=Yt(C-x);(g<1e-24||b>10)&&(g=0,(t==0||e==0)&&(g=1e-24,p==2&&d!=bt&&(o=0),m==2&&f!=-bt&&(a=0)));let $=g||E||1e3,k=ss($),S=rn(10,ke(k)),N=$*(g==0?t==0?.1:1:o),A=kt(tc(t-N,S/10),24),M=t>=d&&(p==1||p==3&&A<=d||p==2&&A>=d)?d:bt,F=pe(r,A<M&&t>=M?M:Re(M,A)),y=$*(g==0?e==0?.1:1:a),T=kt(Sl(e+y,S/10),24),O=e<=f&&(m==1||m==3&&T>=f||m==2&&T<=f)?f:-bt,P=Re(i,T>O&&e<=O?O:pe(O,T));return F==P&&F==0&&(P=100),[F,P]}const Ep=new Intl.NumberFormat(pn?wp.language:"en-US"),Xo=t=>Ep.format(t),xe=Math,ll=xe.PI,Yt=xe.abs,ke=xe.floor,Ut=xe.round,Le=xe.ceil,Re=xe.min,pe=xe.max,rn=xe.pow,xi=xe.sign,ss=xe.log10,Jr=xe.log2,Lp=(t,e=1)=>xe.sinh(t)*e,co=(t,e=1)=>xe.asinh(t/e),bt=1/0;function wi(t){return(ss((t^t>>31)-(t>>31))|0)+1}function Do(t,e,s){return Re(pe(t,e),s)}function Zr(t){return typeof t=="function"}function dt(t){return Zr(t)?t:()=>t}const Ap=()=>{},Qr=t=>t,Xr=(t,e)=>e,Op=t=>null,Si=t=>!0,Ci=(t,e)=>t==e,Pp=/\.\d*?(?=9{6,}|0{6,})/gm,Es=t=>{if(sc(t)||vs.has(t))return t;const e=`${t}`,s=e.match(Pp);if(s==null)return t;let n=s[0].length-1;if(e.indexOf("e-")!=-1){let[l,o]=e.split("e");return+`${Es(l)}e${o}`}return kt(t,n)};function Ss(t,e){return Es(kt(Es(t/e))*e)}function Sl(t,e){return Es(Le(Es(t/e))*e)}function tc(t,e){return Es(ke(Es(t/e))*e)}function kt(t,e=0){if(sc(t))return t;let s=10**e,n=t*s*(1+Number.EPSILON);return Ut(n)/s}const vs=new Map;function ec(t){return((""+t).split(".")[1]||"").length}function zn(t,e,s,n){let l=[],o=n.map(ec);for(let a=e;a<s;a++){let r=Yt(a),i=kt(rn(t,a),r);for(let d=0;d<n.length;d++){let f=t==10?+`${n[d]}e${a}`:n[d]*i,p=(a>=0?0:r)+(a>=o[d]?0:o[d]),m=t==10?f:kt(f,p);l.push(m),vs.set(m,p)}}return l}const Ln={},ta=[],cn=[null,null],us=Array.isArray,sc=Number.isInteger,zp=t=>t===void 0;function Ti(t){return typeof t=="string"}function Cl(t){let e=!1;if(t!=null){let s=t.constructor;e=s==null||s==Object}return e}function Fp(t){return t!=null&&typeof t=="object"}const Ip=Object.getPrototypeOf(Uint8Array),nc="__proto__";function dn(t,e=Cl){let s;if(us(t)){let n=t.find(l=>l!=null);if(us(n)||e(n)){s=Array(t.length);for(let l=0;l<t.length;l++)s[l]=dn(t[l],e)}else s=t.slice()}else if(t instanceof Ip)s=t.slice();else if(e(t)){s={};for(let n in t)n!=nc&&(s[n]=dn(t[n],e))}else s=t;return s}function qt(t){let e=arguments;for(let s=1;s<e.length;s++){let n=e[s];for(let l in n)l!=nc&&(Cl(t[l])?qt(t[l],dn(n[l])):t[l]=dn(n[l]))}return t}const Np=0,Rp=1,jp=2;function Bp(t,e,s){for(let n=0,l,o=-1;n<e.length;n++){let a=e[n];if(a>o){for(l=a-1;l>=0&&t[l]==null;)t[l--]=null;for(l=a+1;l<s&&t[l]==null;)t[o=l++]=null}}}function Hp(t,e){if(Vp(t)){let a=t[0].slice();for(let r=1;r<t.length;r++)a.push(...t[r].slice(1));return Up(a[0])||(a=qp(a)),a}let s=new Set;for(let a=0;a<t.length;a++){let i=t[a][0],d=i.length;for(let f=0;f<d;f++)s.add(i[f])}let n=[Array.from(s).sort((a,r)=>a-r)],l=n[0].length,o=new Map;for(let a=0;a<l;a++)o.set(n[0][a],a);for(let a=0;a<t.length;a++){let r=t[a],i=r[0];for(let d=1;d<r.length;d++){let f=r[d],p=Array(l).fill(void 0),m=e?e[a][d]:Rp,g=[];for(let x=0;x<f.length;x++){let E=f[x],C=o.get(i[x]);E===null?m!=Np&&(p[C]=E,m==jp&&g.push(C)):p[C]=E}Bp(p,g,l),n.push(p)}}return n}const Wp=typeof queueMicrotask>"u"?t=>Promise.resolve().then(t):queueMicrotask;function qp(t){let e=t[0],s=e.length,n=Array(s);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,a)=>e[o]-e[a]);let l=[];for(let o=0;o<t.length;o++){let a=t[o],r=Array(s);for(let i=0;i<s;i++)r[i]=a[n[i]];l.push(r)}return l}function Vp(t){let e=t[0][0],s=e.length;for(let n=1;n<t.length;n++){let l=t[n][0];if(l.length!=s)return!1;if(l!=e){for(let o=0;o<s;o++)if(l[o]!=e[o])return!1}}return!0}function Up(t,e=100){const s=t.length;if(s<=1)return!0;let n=0,l=s-1;for(;n<=l&&t[n]==null;)n++;for(;l>=n&&t[l]==null;)l--;if(l<=n)return!0;const o=pe(1,ke((l-n+1)/e));for(let a=t[n],r=n+o;r<=l;r+=o){const i=t[r];if(i!=null){if(i<=a)return!1;a=i}}return!0}const lc=["January","February","March","April","May","June","July","August","September","October","November","December"],oc=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function ac(t){return t.slice(0,3)}const Gp=oc.map(ac),Yp=lc.map(ac),Kp={MMMM:lc,MMM:Yp,WWWW:oc,WWW:Gp};function wn(t){return(t<10?"0":"")+t}function Jp(t){return(t<10?"00":t<100?"0":"")+t}const Zp={YYYY:t=>t.getFullYear(),YY:t=>(t.getFullYear()+"").slice(2),MMMM:(t,e)=>e.MMMM[t.getMonth()],MMM:(t,e)=>e.MMM[t.getMonth()],MM:t=>wn(t.getMonth()+1),M:t=>t.getMonth()+1,DD:t=>wn(t.getDate()),D:t=>t.getDate(),WWWW:(t,e)=>e.WWWW[t.getDay()],WWW:(t,e)=>e.WWW[t.getDay()],HH:t=>wn(t.getHours()),H:t=>t.getHours(),h:t=>{let e=t.getHours();return e==0?12:e>12?e-12:e},AA:t=>t.getHours()>=12?"PM":"AM",aa:t=>t.getHours()>=12?"pm":"am",a:t=>t.getHours()>=12?"p":"a",mm:t=>wn(t.getMinutes()),m:t=>t.getMinutes(),ss:t=>wn(t.getSeconds()),s:t=>t.getSeconds(),fff:t=>Jp(t.getMilliseconds())};function ea(t,e){e=e||Kp;let s=[],n=/\{([a-z]+)\}|[^{]+/gi,l;for(;l=n.exec(t);)s.push(l[0][0]=="{"?Zp[l[1]]:l[0]);return o=>{let a="";for(let r=0;r<s.length;r++)a+=typeof s[r]=="string"?s[r]:s[r](o,e);return a}}const Qp=new Intl.DateTimeFormat().resolvedOptions().timeZone;function Xp(t,e){let s;return e=="UTC"||e=="Etc/UTC"?s=new Date(+t+t.getTimezoneOffset()*6e4):e==Qp?s=t:(s=new Date(t.toLocaleString("en-US",{timeZone:e})),s.setMilliseconds(t.getMilliseconds())),s}const ic=t=>t%1==0,ml=[1,2,2.5,5],tf=zn(10,-32,0,ml),rc=zn(10,0,32,ml),ef=rc.filter(ic),Cs=tf.concat(rc),sa=`
`,cc="{YYYY}",Mi=sa+cc,dc="{M}/{D}",Mn=sa+dc,Kn=Mn+"/{YY}",uc="{aa}",sf="{h}:{mm}",tn=sf+uc,Di=sa+tn,Ei=":{ss}",gt=null;function pc(t){let e=t*1e3,s=e*60,n=s*60,l=n*24,o=l*30,a=l*365,i=(t==1?zn(10,0,3,ml).filter(ic):zn(10,-3,0,ml)).concat([e,e*5,e*10,e*15,e*30,s,s*5,s*10,s*15,s*30,n,n*2,n*3,n*4,n*6,n*8,n*12,l,l*2,l*3,l*4,l*5,l*6,l*7,l*8,l*9,l*10,l*15,o,o*2,o*3,o*4,o*6,a,a*2,a*5,a*10,a*25,a*50,a*100]);const d=[[a,cc,gt,gt,gt,gt,gt,gt,1],[l*28,"{MMM}",Mi,gt,gt,gt,gt,gt,1],[l,dc,Mi,gt,gt,gt,gt,gt,1],[n,"{h}"+uc,Kn,gt,Mn,gt,gt,gt,1],[s,tn,Kn,gt,Mn,gt,gt,gt,1],[e,Ei,Kn+" "+tn,gt,Mn+" "+tn,gt,Di,gt,1],[t,Ei+".{fff}",Kn+" "+tn,gt,Mn+" "+tn,gt,Di,gt,1]];function f(p){return(m,g,x,E,C,b)=>{let $=[],k=C>=a,S=C>=o&&C<a,N=p(x),A=kt(N*t,3),M=uo(N.getFullYear(),k?0:N.getMonth(),S||k?1:N.getDate()),F=kt(M*t,3);if(S||k){let y=S?C/o:0,T=k?C/a:0,O=A==F?A:kt(uo(M.getFullYear()+T,M.getMonth()+y,1)*t,3),P=new Date(Ut(O/t)),D=P.getFullYear(),q=P.getMonth();for(let H=0;O<=E;H++){let U=uo(D+T*H,q+y*H,1),W=U-p(kt(U*t,3));O=kt((+U+W)*t,3),O<=E&&$.push(O)}}else{let y=C>=l?l:C,T=ke(x)-ke(A),O=F+T+Sl(A-F,y);$.push(O);let P=p(O),D=P.getHours()+P.getMinutes()/s+P.getSeconds()/n,q=C/n,H=m.axes[g]._space,U=b/H;for(;O=kt(O+C,t==1?0:3),!(O>E);)if(q>1){let W=ke(kt(D+q,6))%24,K=p(O).getHours()-W;K>1&&(K=-1),O-=K*n,D=(D+q)%24;let rt=$[$.length-1];kt((O-rt)/C,3)*U>=.7&&$.push(O)}else $.push(O)}return $}}return[i,d,f]}const[nf,lf,of]=pc(1),[af,rf,cf]=pc(.001);zn(2,-53,53,[1]);function Li(t,e){return t.map(s=>s.map((n,l)=>l==0||l==8||n==null?n:e(l==1||s[8]==0?n:s[1]+n)))}function Ai(t,e){return(s,n,l,o,a)=>{let r=e.find(x=>a>=x[0])||e[e.length-1],i,d,f,p,m,g;return n.map(x=>{let E=t(x),C=E.getFullYear(),b=E.getMonth(),$=E.getDate(),k=E.getHours(),S=E.getMinutes(),N=E.getSeconds(),A=C!=i&&r[2]||b!=d&&r[3]||$!=f&&r[4]||k!=p&&r[5]||S!=m&&r[6]||N!=g&&r[7]||r[1];return i=C,d=b,f=$,p=k,m=S,g=N,A(E)})}}function df(t,e){let s=ea(e);return(n,l,o,a,r)=>l.map(i=>s(t(i)))}function uo(t,e,s){return new Date(t,e,s)}function Oi(t,e){return e(t)}const uf="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function Pi(t,e){return(s,n,l,o)=>o==null?Ko:e(t(n))}function pf(t,e){let s=t.series[e];return s.width?s.stroke(t,e):s.points.width?s.points.stroke(t,e):null}function ff(t,e){return t.series[e].fill(t,e)}const vf={show:!0,live:!0,isolate:!1,mount:Ap,markers:{show:!0,width:2,stroke:pf,fill:ff,dash:"solid"},idx:null,idxs:null,values:[]};function mf(t,e){let s=t.cursor.points,n=Ee(),l=s.size(t,e);Tt(n,Cn,l),Tt(n,Tn,l);let o=l/-2;Tt(n,"marginLeft",o),Tt(n,"marginTop",o);let a=s.width(t,e,l);return a&&Tt(n,"borderWidth",a),n}function hf(t,e){let s=t.series[e].points;return s._fill||s._stroke}function gf(t,e){let s=t.series[e].points;return s._stroke||s._fill}function $f(t,e){return t.series[e].points.size}const po=[0,0];function _f(t,e,s){return po[0]=e,po[1]=s,po}function Jn(t,e,s,n=!0){return l=>{l.button==0&&(!n||l.target==e)&&s(l)}}function fo(t,e,s,n=!0){return l=>{(!n||l.target==e)&&s(l)}}const yf={show:!0,x:!0,y:!0,lock:!1,move:_f,points:{one:!1,show:mf,size:$f,width:0,stroke:gf,fill:hf},bind:{mousedown:Jn,mouseup:Jn,click:Jn,dblclick:Jn,mousemove:fo,mouseleave:fo,mouseenter:fo},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(t,e)=>{e.stopPropagation(),e.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(t,e,s,n,l)=>n-l,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},fc={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},na=qt({},fc,{filter:Xr}),vc=qt({},na,{size:10}),mc=qt({},fc,{show:!1}),la='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',hc="bold "+la,gc=1.5,zi={show:!0,scale:"x",stroke:Yo,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:hc,side:2,grid:na,ticks:vc,border:mc,font:la,lineGap:gc,rotate:0},bf="Value",kf="Time",Fi={show:!0,scale:"x",auto:!1,sorted:1,min:bt,max:-bt,idxs:[]};function xf(t,e,s,n,l){return e.map(o=>o==null?"":Xo(o))}function wf(t,e,s,n,l,o,a){let r=[],i=vs.get(l)||0;s=a?s:kt(Sl(s,l),i);for(let d=s;d<=n;d=kt(d+l,i))r.push(Object.is(d,-0)?0:d);return r}function Eo(t,e,s,n,l,o,a){const r=[],i=t.scales[t.axes[e].scale].log,d=i==10?ss:Jr,f=ke(d(s));l=rn(i,f),i==10&&(l=Cs[Ne(l,Cs)]);let p=s,m=l*i;i==10&&(m=Cs[Ne(m,Cs)]);do r.push(p),p=p+l,i==10&&!vs.has(p)&&(p=kt(p,vs.get(l))),p>=m&&(l=p,m=l*i,i==10&&(m=Cs[Ne(m,Cs)]));while(p<=n);return r}function Sf(t,e,s,n,l,o,a){let i=t.scales[t.axes[e].scale].asinh,d=n>i?Eo(t,e,pe(i,s),n,l):[i],f=n>=0&&s<=0?[0]:[];return(s<-i?Eo(t,e,pe(i,-n),-s,l):[i]).reverse().map(m=>-m).concat(f,d)}const $c=/./,Cf=/[12357]/,Tf=/[125]/,Ii=/1/,Lo=(t,e,s,n)=>t.map((l,o)=>e==4&&l==0||o%n==0&&s.test(l.toExponential()[l<0?1:0])?l:null);function Mf(t,e,s,n,l){let o=t.axes[s],a=o.scale,r=t.scales[a],i=t.valToPos,d=o._space,f=i(10,a),p=i(9,a)-f>=d?$c:i(7,a)-f>=d?Cf:i(5,a)-f>=d?Tf:Ii;if(p==Ii){let m=Yt(i(1,a)-f);if(m<d)return Lo(e.slice().reverse(),r.distr,p,Le(d/m)).reverse()}return Lo(e,r.distr,p,1)}function Df(t,e,s,n,l){let o=t.axes[s],a=o.scale,r=o._space,i=t.valToPos,d=Yt(i(1,a)-i(2,a));return d<r?Lo(e.slice().reverse(),3,$c,Le(r/d)).reverse():e}function Ef(t,e,s,n){return n==null?Ko:e==null?"":Xo(e)}const Ni={show:!0,scale:"y",stroke:Yo,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:hc,side:3,grid:na,ticks:vc,border:mc,font:la,lineGap:gc,rotate:0};function Lf(t,e){let s=3+(t||1)*2;return kt(s*e,3)}function Af(t,e){let{scale:s,idxs:n}=t.series[0],l=t._data[0],o=t.valToPos(l[n[0]],s,!0),a=t.valToPos(l[n[1]],s,!0),r=Yt(a-o),i=t.series[e],d=r/(i.points.space*mt);return n[1]-n[0]<=d}const Ri={scale:null,auto:!0,sorted:0,min:bt,max:-bt},_c=(t,e,s,n,l)=>l,ji={show:!0,auto:!0,sorted:0,gaps:_c,alpha:1,facets:[qt({},Ri,{scale:"x"}),qt({},Ri,{scale:"y"})]},Bi={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:_c,alpha:1,points:{show:Af,filter:null},values:null,min:bt,max:-bt,idxs:[],path:null,clip:null};function Of(t,e,s,n,l){return s/10}const yc={time:np,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},Pf=qt({},yc,{time:!1,ori:1}),Hi={};function bc(t,e){let s=Hi[t];return s||(s={key:t,plots:[],sub(n){s.plots.push(n)},unsub(n){s.plots=s.plots.filter(l=>l!=n)},pub(n,l,o,a,r,i,d){for(let f=0;f<s.plots.length;f++)s.plots[f]!=l&&s.plots[f].pub(n,l,o,a,r,i,d)}},t!=null&&(Hi[t]=s)),s}const un=1,Ao=2;function Ls(t,e,s){const n=t.mode,l=t.series[e],o=n==2?t._data[e]:t._data,a=t.scales,r=t.bbox;let i=o[0],d=n==2?o[1]:o[e],f=n==2?a[l.facets[0].scale]:a[t.series[0].scale],p=n==2?a[l.facets[1].scale]:a[l.scale],m=r.left,g=r.top,x=r.width,E=r.height,C=t.valToPosH,b=t.valToPosV;return f.ori==0?s(l,i,d,f,p,C,b,m,g,x,E,Ml,fn,El,xc,Sc):s(l,i,d,f,p,b,C,g,m,E,x,Dl,vn,ia,wc,Cc)}function oa(t,e){let s=0,n=0,l=ft(t.bands,ta);for(let o=0;o<l.length;o++){let a=l[o];a.series[0]==e?s=a.dir:a.series[1]==e&&(a.dir==1?n|=1:n|=2)}return[s,n==1?-1:n==2?1:n==3?2:0]}function zf(t,e,s,n,l){let o=t.mode,a=t.series[e],r=o==2?a.facets[1].scale:a.scale,i=t.scales[r];return l==-1?i.min:l==1?i.max:i.distr==3?i.dir==1?i.min:i.max:0}function ns(t,e,s,n,l,o){return Ls(t,e,(a,r,i,d,f,p,m,g,x,E,C)=>{let b=a.pxRound;const $=d.dir*(d.ori==0?1:-1),k=d.ori==0?fn:vn;let S,N;$==1?(S=s,N=n):(S=n,N=s);let A=b(p(r[S],d,E,g)),M=b(m(i[S],f,C,x)),F=b(p(r[N],d,E,g)),y=b(m(o==1?f.max:f.min,f,C,x)),T=new Path2D(l);return k(T,F,y),k(T,A,y),k(T,A,M),T})}function Tl(t,e,s,n,l,o){let a=null;if(t.length>0){a=new Path2D;const r=e==0?El:ia;let i=s;for(let p=0;p<t.length;p++){let m=t[p];if(m[1]>m[0]){let g=m[0]-i;g>0&&r(a,i,n,g,n+o),i=m[1]}}let d=s+l-i,f=10;d>0&&r(a,i,n-f/2,d,n+o+f)}return a}function Ff(t,e,s){let n=t[t.length-1];n&&n[0]==e?n[1]=s:t.push([e,s])}function aa(t,e,s,n,l,o,a){let r=[],i=t.length;for(let d=l==1?s:n;d>=s&&d<=n;d+=l)if(e[d]===null){let p=d,m=d;if(l==1)for(;++d<=n&&e[d]===null;)m=d;else for(;--d>=s&&e[d]===null;)m=d;let g=o(t[p]),x=m==p?g:o(t[m]),E=p-l;g=a<=0&&E>=0&&E<i?o(t[E]):g;let b=m+l;x=a>=0&&b>=0&&b<i?o(t[b]):x,x>=g&&r.push([g,x])}return r}function Wi(t){return t==0?Qr:t==1?Ut:e=>Ss(e,t)}function kc(t){let e=t==0?Ml:Dl,s=t==0?(l,o,a,r,i,d)=>{l.arcTo(o,a,r,i,d)}:(l,o,a,r,i,d)=>{l.arcTo(a,o,i,r,d)},n=t==0?(l,o,a,r,i)=>{l.rect(o,a,r,i)}:(l,o,a,r,i)=>{l.rect(a,o,i,r)};return(l,o,a,r,i,d=0,f=0)=>{d==0&&f==0?n(l,o,a,r,i):(d=Re(d,r/2,i/2),f=Re(f,r/2,i/2),e(l,o+d,a),s(l,o+r,a,o+r,a+i,d),s(l,o+r,a+i,o,a+i,f),s(l,o,a+i,o,a,f),s(l,o,a,o+r,a,d),l.closePath())}}const Ml=(t,e,s)=>{t.moveTo(e,s)},Dl=(t,e,s)=>{t.moveTo(s,e)},fn=(t,e,s)=>{t.lineTo(e,s)},vn=(t,e,s)=>{t.lineTo(s,e)},El=kc(0),ia=kc(1),xc=(t,e,s,n,l,o)=>{t.arc(e,s,n,l,o)},wc=(t,e,s,n,l,o)=>{t.arc(s,e,n,l,o)},Sc=(t,e,s,n,l,o,a)=>{t.bezierCurveTo(e,s,n,l,o,a)},Cc=(t,e,s,n,l,o,a)=>{t.bezierCurveTo(s,e,l,n,a,o)};function Tc(t){return(e,s,n,l,o)=>Ls(e,s,(a,r,i,d,f,p,m,g,x,E,C)=>{let{pxRound:b,points:$}=a,k,S;d.ori==0?(k=Ml,S=xc):(k=Dl,S=wc);const N=kt($.width*mt,3);let A=($.size-$.width)/2*mt,M=kt(A*2,3),F=new Path2D,y=new Path2D,{left:T,top:O,width:P,height:D}=e.bbox;El(y,T-M,O-M,P+M*2,D+M*2);const q=H=>{if(i[H]!=null){let U=b(p(r[H],d,E,g)),W=b(m(i[H],f,C,x));k(F,U+A,W),S(F,U,W,A,0,ll*2)}};if(o)o.forEach(q);else for(let H=n;H<=l;H++)q(H);return{stroke:N>0?F:null,fill:F,clip:y,flags:un|Ao}})}function Mc(t){return(e,s,n,l,o,a)=>{n!=l&&(o!=n&&a!=n&&t(e,s,n),o!=l&&a!=l&&t(e,s,l),t(e,s,a))}}const If=Mc(fn),Nf=Mc(vn);function Dc(t){const e=ft(t==null?void 0:t.alignGaps,0);return(s,n,l,o)=>Ls(s,n,(a,r,i,d,f,p,m,g,x,E,C)=>{[l,o]=xl(i,l,o);let b=a.pxRound,$=D=>b(p(D,d,E,g)),k=D=>b(m(D,f,C,x)),S,N;d.ori==0?(S=fn,N=If):(S=vn,N=Nf);const A=d.dir*(d.ori==0?1:-1),M={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:un},F=M.stroke;let y=!1;if(o-l>=E*4){let D=J=>s.posToVal(J,d.key,!0),q=null,H=null,U,W,et,st=$(r[A==1?l:o]),K=$(r[l]),rt=$(r[o]),tt=D(A==1?K+1:rt-1);for(let J=A==1?l:o;J>=l&&J<=o;J+=A){let Pt=r[J],Et=(A==1?Pt<tt:Pt>tt)?st:$(Pt),ut=i[J];Et==st?ut!=null?(W=ut,q==null?(S(F,Et,k(W)),U=q=H=W):W<q?q=W:W>H&&(H=W)):ut===null&&(y=!0):(q!=null&&N(F,st,k(q),k(H),k(U),k(W)),ut!=null?(W=ut,S(F,Et,k(W)),q=H=U=W):(q=H=null,ut===null&&(y=!0)),st=Et,tt=D(st+A))}q!=null&&q!=H&&et!=st&&N(F,st,k(q),k(H),k(U),k(W))}else for(let D=A==1?l:o;D>=l&&D<=o;D+=A){let q=i[D];q===null?y=!0:q!=null&&S(F,$(r[D]),k(q))}let[O,P]=oa(s,n);if(a.fill!=null||O!=0){let D=M.fill=new Path2D(F),q=a.fillTo(s,n,a.min,a.max,O),H=k(q),U=$(r[l]),W=$(r[o]);A==-1&&([W,U]=[U,W]),S(D,W,H),S(D,U,H)}if(!a.spanGaps){let D=[];y&&D.push(...aa(r,i,l,o,A,$,e)),M.gaps=D=a.gaps(s,n,l,o,D),M.clip=Tl(D,d.ori,g,x,E,C)}return P!=0&&(M.band=P==2?[ns(s,n,l,o,F,-1),ns(s,n,l,o,F,1)]:ns(s,n,l,o,F,P)),M})}function Rf(t){const e=ft(t.align,1),s=ft(t.ascDesc,!1),n=ft(t.alignGaps,0),l=ft(t.extend,!1);return(o,a,r,i)=>Ls(o,a,(d,f,p,m,g,x,E,C,b,$,k)=>{[r,i]=xl(p,r,i);let S=d.pxRound,{left:N,width:A}=o.bbox,M=K=>S(x(K,m,$,C)),F=K=>S(E(K,g,k,b)),y=m.ori==0?fn:vn;const T={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:un},O=T.stroke,P=m.dir*(m.ori==0?1:-1);let D=F(p[P==1?r:i]),q=M(f[P==1?r:i]),H=q,U=q;l&&e==-1&&(U=N,y(O,U,D)),y(O,q,D);for(let K=P==1?r:i;K>=r&&K<=i;K+=P){let rt=p[K];if(rt==null)continue;let tt=M(f[K]),J=F(rt);e==1?y(O,tt,D):y(O,H,J),y(O,tt,J),D=J,H=tt}let W=H;l&&e==1&&(W=N+A,y(O,W,D));let[et,st]=oa(o,a);if(d.fill!=null||et!=0){let K=T.fill=new Path2D(O),rt=d.fillTo(o,a,d.min,d.max,et),tt=F(rt);y(K,W,tt),y(K,U,tt)}if(!d.spanGaps){let K=[];K.push(...aa(f,p,r,i,P,M,n));let rt=d.width*mt/2,tt=s||e==1?rt:-rt,J=s||e==-1?-rt:rt;K.forEach(Pt=>{Pt[0]+=tt,Pt[1]+=J}),T.gaps=K=d.gaps(o,a,r,i,K),T.clip=Tl(K,m.ori,C,b,$,k)}return st!=0&&(T.band=st==2?[ns(o,a,r,i,O,-1),ns(o,a,r,i,O,1)]:ns(o,a,r,i,O,st)),T})}function qi(t,e,s,n,l,o,a=bt){if(t.length>1){let r=null;for(let i=0,d=1/0;i<t.length;i++)if(e[i]!==void 0){if(r!=null){let f=Yt(t[i]-t[r]);f<d&&(d=f,a=Yt(s(t[i],n,l,o)-s(t[r],n,l,o)))}r=i}}return a}function jf(t){t=t||Ln;const e=ft(t.size,[.6,bt,1]),s=t.align||0,n=t.gap||0;let l=t.radius;l=l==null?[0,0]:typeof l=="number"?[l,0]:l;const o=dt(l),a=1-e[0],r=ft(e[1],bt),i=ft(e[2],1),d=ft(t.disp,Ln),f=ft(t.each,g=>{}),{fill:p,stroke:m}=d;return(g,x,E,C)=>Ls(g,x,(b,$,k,S,N,A,M,F,y,T,O)=>{let P=b.pxRound,D=s,q=n*mt,H=r*mt,U=i*mt,W,et;S.ori==0?[W,et]=o(g,x):[et,W]=o(g,x);const st=S.dir*(S.ori==0?1:-1);let K=S.ori==0?El:ia,rt=S.ori==0?f:(Z,xt,Vt,zs,gs,We,$s)=>{f(Z,xt,Vt,gs,zs,$s,We)},tt=ft(g.bands,ta).find(Z=>Z.series[0]==x),J=tt!=null?tt.dir:0,Pt=b.fillTo(g,x,b.min,b.max,J),Jt=P(M(Pt,N,O,y)),Et,ut,Ae,he=T,zt=P(b.width*mt),He=!1,Ze=null,we=null,ls=null,As=null;p!=null&&(zt==0||m!=null)&&(He=!0,Ze=p.values(g,x,E,C),we=new Map,new Set(Ze).forEach(Z=>{Z!=null&&we.set(Z,new Path2D)}),zt>0&&(ls=m.values(g,x,E,C),As=new Map,new Set(ls).forEach(Z=>{Z!=null&&As.set(Z,new Path2D)})));let{x0:Os,size:mn}=d;if(Os!=null&&mn!=null){D=1,$=Os.values(g,x,E,C),Os.unit==2&&($=$.map(Vt=>g.posToVal(F+Vt*T,S.key,!0)));let Z=mn.values(g,x,E,C);mn.unit==2?ut=Z[0]*T:ut=A(Z[0],S,T,F)-A(0,S,T,F),he=qi($,k,A,S,T,F,he),Ae=he-ut+q}else he=qi($,k,A,S,T,F,he),Ae=he*a+q,ut=he-Ae;Ae<1&&(Ae=0),zt>=ut/2&&(zt=0),Ae<5&&(P=Qr);let In=Ae>0,ms=he-Ae-(In?zt:0);ut=P(Do(ms,U,H)),Et=(D==0?ut/2:D==st?0:ut)-D*st*((D==0?q/2:0)+(In?zt/2:0));const re={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},Ps=He?null:new Path2D;let Qe=null;if(tt!=null)Qe=g.data[tt.series[1]];else{let{y0:Z,y1:xt}=d;Z!=null&&xt!=null&&(k=xt.values(g,x,E,C),Qe=Z.values(g,x,E,C))}let hs=W*ut,it=et*ut;for(let Z=st==1?E:C;Z>=E&&Z<=C;Z+=st){let xt=k[Z];if(xt==null)continue;if(Qe!=null){let fe=Qe[Z]??0;if(xt-fe==0)continue;Jt=M(fe,N,O,y)}let Vt=S.distr!=2||d!=null?$[Z]:Z,zs=A(Vt,S,T,F),gs=M(ft(xt,Pt),N,O,y),We=P(zs-Et),$s=P(pe(gs,Jt)),ge=P(Re(gs,Jt)),Se=$s-ge;if(xt!=null){let fe=xt<0?it:hs,Oe=xt<0?hs:it;He?(zt>0&&ls[Z]!=null&&K(As.get(ls[Z]),We,ge+ke(zt/2),ut,pe(0,Se-zt),fe,Oe),Ze[Z]!=null&&K(we.get(Ze[Z]),We,ge+ke(zt/2),ut,pe(0,Se-zt),fe,Oe)):K(Ps,We,ge+ke(zt/2),ut,pe(0,Se-zt),fe,Oe),rt(g,x,Z,We-zt/2,ge,ut+zt,Se)}}return zt>0?re.stroke=He?As:Ps:He||(re._fill=b.width==0?b._fill:b._stroke??b._fill,re.width=0),re.fill=He?we:Ps,re})}function Bf(t,e){const s=ft(e==null?void 0:e.alignGaps,0);return(n,l,o,a)=>Ls(n,l,(r,i,d,f,p,m,g,x,E,C,b)=>{[o,a]=xl(d,o,a);let $=r.pxRound,k=W=>$(m(W,f,C,x)),S=W=>$(g(W,p,b,E)),N,A,M;f.ori==0?(N=Ml,M=fn,A=Sc):(N=Dl,M=vn,A=Cc);const F=f.dir*(f.ori==0?1:-1);let y=k(i[F==1?o:a]),T=y,O=[],P=[];for(let W=F==1?o:a;W>=o&&W<=a;W+=F)if(d[W]!=null){let st=i[W],K=k(st);O.push(T=K),P.push(S(d[W]))}const D={stroke:t(O,P,N,M,A,$),fill:null,clip:null,band:null,gaps:null,flags:un},q=D.stroke;let[H,U]=oa(n,l);if(r.fill!=null||H!=0){let W=D.fill=new Path2D(q),et=r.fillTo(n,l,r.min,r.max,H),st=S(et);M(W,T,st),M(W,y,st)}if(!r.spanGaps){let W=[];W.push(...aa(i,d,o,a,F,k,s)),D.gaps=W=r.gaps(n,l,o,a,W),D.clip=Tl(W,f.ori,x,E,C,b)}return U!=0&&(D.band=U==2?[ns(n,l,o,a,q,-1),ns(n,l,o,a,q,1)]:ns(n,l,o,a,q,U)),D})}function Hf(t){return Bf(Wf,t)}function Wf(t,e,s,n,l,o){const a=t.length;if(a<2)return null;const r=new Path2D;if(s(r,t[0],e[0]),a==2)n(r,t[1],e[1]);else{let i=Array(a),d=Array(a-1),f=Array(a-1),p=Array(a-1);for(let m=0;m<a-1;m++)f[m]=e[m+1]-e[m],p[m]=t[m+1]-t[m],d[m]=f[m]/p[m];i[0]=d[0];for(let m=1;m<a-1;m++)d[m]===0||d[m-1]===0||d[m-1]>0!=d[m]>0?i[m]=0:(i[m]=3*(p[m-1]+p[m])/((2*p[m]+p[m-1])/d[m-1]+(p[m]+2*p[m-1])/d[m]),isFinite(i[m])||(i[m]=0));i[a-1]=d[a-2];for(let m=0;m<a-1;m++)l(r,t[m]+p[m]/3,e[m]+i[m]*p[m]/3,t[m+1]-p[m]/3,e[m+1]-i[m+1]*p[m]/3,t[m+1],e[m+1])}return r}const Oo=new Set;function Vi(){for(let t of Oo)t.syncRect(!0)}pn&&(Ms(kp,ln,Vi),Ms(xp,ln,Vi,!0),Ms(fl,ln,()=>{oe.pxRatio=mt}));const qf=Dc(),Vf=Tc();function Ui(t,e,s,n){return(n?[t[0],t[1]].concat(t.slice(2)):[t[0]].concat(t.slice(1))).map((o,a)=>Po(o,a,e,s))}function Uf(t,e){return t.map((s,n)=>n==0?{}:qt({},e,s))}function Po(t,e,s,n){return qt({},e==0?s:n,t)}function Ec(t,e,s){return e==null?cn:[e,s]}const Gf=Ec;function Yf(t,e,s){return e==null?cn:vl(e,s,Qo,!0)}function Lc(t,e,s,n){return e==null?cn:wl(e,s,t.scales[n].log,!1)}const Kf=Lc;function Ac(t,e,s,n){return e==null?cn:Zo(e,s,t.scales[n].log,!1)}const Jf=Ac;function Zf(t,e,s,n,l){let o=pe(wi(t),wi(e)),a=e-t,r=Ne(l/n*a,s);do{let i=s[r],d=n*i/a;if(d>=l&&o+(i<5?vs.get(i):0)<=17)return[i,d]}while(++r<s.length);return[0,0]}function Gi(t){let e,s;return t=t.replace(/(\d+)px/,(n,l)=>(e=Ut((s=+l)*mt))+"px"),[t,e,s]}function Qf(t){t.show&&[t.font,t.labelFont].forEach(e=>{let s=kt(e[2]*mt,1);e[0]=e[0].replace(/[0-9.]+px/,s+"px"),e[1]=s})}function oe(t,e,s){const n={mode:ft(t.mode,1)},l=n.mode;function o(u,v,h,_){let w=v.valToPct(u);return _+h*(v.dir==-1?1-w:w)}function a(u,v,h,_){let w=v.valToPct(u);return _+h*(v.dir==-1?w:1-w)}function r(u,v,h,_){return v.ori==0?o(u,v,h,_):a(u,v,h,_)}n.valToPosH=o,n.valToPosV=a;let i=!1;n.status=0;const d=n.root=Ee(lp);if(t.id!=null&&(d.id=t.id),be(d,t.class),t.title){let u=Ee(ip,d);u.textContent=t.title}const f=Ie("canvas"),p=n.ctx=f.getContext("2d"),m=Ee(rp,d);Ms("click",m,u=>{u.target===x&&(wt!=Us||Lt!=Gs)&&le.click(n,u)},!0);const g=n.under=Ee(cp,m);m.appendChild(f);const x=n.over=Ee(dp,m);t=dn(t);const E=+ft(t.pxAlign,1),C=Wi(E);(t.plugins||[]).forEach(u=>{u.opts&&(t=u.opts(n,t)||t)});const b=t.ms||.001,$=n.series=l==1?Ui(t.series||[],Fi,Bi,!1):Uf(t.series||[null],ji),k=n.axes=Ui(t.axes||[],zi,Ni,!0),S=n.scales={},N=n.bands=t.bands||[];N.forEach(u=>{u.fill=dt(u.fill||null),u.dir=ft(u.dir,-1)});const A=l==2?$[1].facets[0].scale:$[0].scale,M={axes:od,series:td},F=(t.drawOrder||["axes","series"]).map(u=>M[u]);function y(u){const v=u.distr==3?h=>ss(h>0?h:u.clamp(n,h,u.min,u.max,u.key)):u.distr==4?h=>co(h,u.asinh):u.distr==100?h=>u.fwd(h):h=>h;return h=>{let _=v(h),{_min:w,_max:L}=u,I=L-w;return(_-w)/I}}function T(u){let v=S[u];if(v==null){let h=(t.scales||Ln)[u]||Ln;if(h.from!=null){T(h.from);let _=qt({},S[h.from],h,{key:u});_.valToPct=y(_),S[u]=_}else{v=S[u]=qt({},u==A?yc:Pf,h),v.key=u;let _=v.time,w=v.range,L=us(w);if((u!=A||l==2&&!_)&&(L&&(w[0]==null||w[1]==null)&&(w={min:w[0]==null?bi:{mode:1,hard:w[0],soft:w[0]},max:w[1]==null?bi:{mode:1,hard:w[1],soft:w[1]}},L=!1),!L&&Cl(w))){let I=w;w=(j,B,G)=>B==null?cn:vl(B,G,I)}v.range=dt(w||(_?Gf:u==A?v.distr==3?Kf:v.distr==4?Jf:Ec:v.distr==3?Lc:v.distr==4?Ac:Yf)),v.auto=dt(L?!1:v.auto),v.clamp=dt(v.clamp||Of),v._min=v._max=null,v.valToPct=y(v)}}}T("x"),T("y"),l==1&&$.forEach(u=>{T(u.scale)}),k.forEach(u=>{T(u.scale)});for(let u in t.scales)T(u);const O=S[A],P=O.distr;let D,q;O.ori==0?(be(d,op),D=o,q=a):(be(d,ap),D=a,q=o);const H={};for(let u in S){let v=S[u];(v.min!=null||v.max!=null)&&(H[u]={min:v.min,max:v.max},v.min=v.max=null)}const U=t.tzDate||(u=>new Date(Ut(u/b))),W=t.fmtDate||ea,et=b==1?of(U):cf(U),st=Ai(U,Li(b==1?lf:rf,W)),K=Pi(U,Oi(uf,W)),rt=[],tt=n.legend=qt({},vf,t.legend),J=n.cursor=qt({},yf,{drag:{y:l==2}},t.cursor),Pt=tt.show,Jt=J.show,Et=tt.markers;tt.idxs=rt,Et.width=dt(Et.width),Et.dash=dt(Et.dash),Et.stroke=dt(Et.stroke),Et.fill=dt(Et.fill);let ut,Ae,he,zt=[],He=[],Ze,we=!1,ls={};if(tt.live){const u=$[1]?$[1].values:null;we=u!=null,Ze=we?u(n,1,0):{_:0};for(let v in Ze)ls[v]=Ko}if(Pt)if(ut=Ie("table",hp,d),he=Ie("tbody",null,ut),tt.mount(n,ut),we){Ae=Ie("thead",null,ut,he);let u=Ie("tr",null,Ae);Ie("th",null,u);for(var As in Ze)Ie("th",ri,u).textContent=As}else be(ut,$p),tt.live&&be(ut,gp);const Os={show:!0},mn={show:!1};function In(u,v){if(v==0&&(we||!tt.live||l==2))return cn;let h=[],_=Ie("tr",_p,he,he.childNodes[v]);be(_,u.class),u.show||be(_,Ts);let w=Ie("th",null,_);if(Et.show){let j=Ee(yp,w);if(v>0){let B=Et.width(n,v);B&&(j.style.border=B+"px "+Et.dash(n,v)+" "+Et.stroke(n,v)),j.style.background=Et.fill(n,v)}}let L=Ee(ri,w);u.label instanceof HTMLElement?L.appendChild(u.label):L.textContent=u.label,v>0&&(Et.show||(L.style.color=u.width>0?Et.stroke(n,v):Et.fill(n,v)),re("click",w,j=>{if(J._lock)return;ys(j);let B=$.indexOf(u);if((j.ctrlKey||j.metaKey)!=tt.isolate){let G=$.some((Y,Q)=>Q>0&&Q!=B&&Y.show);$.forEach((Y,Q)=>{Q>0&&Ve(Q,G?Q==B?Os:mn:Os,!0,Ht.setSeries)})}else Ve(B,{show:!u.show},!0,Ht.setSeries)},!1),Is&&re(pi,w,j=>{J._lock||(ys(j),Ve($.indexOf(u),Ks,!0,Ht.setSeries))},!1));for(var I in Ze){let j=Ie("td",bp,_);j.textContent="--",h.push(j)}return[_,h]}const ms=new Map;function re(u,v,h,_=!0){const w=ms.get(v)||{},L=J.bind[u](n,v,h,_);L&&(Ms(u,v,w[u]=L),ms.set(v,w))}function Ps(u,v,h){const _=ms.get(v)||{};for(let w in _)(u==null||w==u)&&(Mo(w,v,_[w]),delete _[w]);u==null&&ms.delete(v)}let Qe=0,hs=0,it=0,Z=0,xt=0,Vt=0,zs=xt,gs=Vt,We=it,$s=Z,ge=0,Se=0,fe=0,Oe=0;n.bbox={};let Al=!1,Nn=!1,Fs=!1,_s=!1,Rn=!1,Ce=!1;function Ol(u,v,h){(h||u!=n.width||v!=n.height)&&da(u,v),Hs(!1),Fs=!0,Nn=!0,Ws()}function da(u,v){n.width=Qe=it=u,n.height=hs=Z=v,xt=Vt=0,Gc(),Yc();let h=n.bbox;ge=h.left=Ss(xt*mt,.5),Se=h.top=Ss(Vt*mt,.5),fe=h.width=Ss(it*mt,.5),Oe=h.height=Ss(Z*mt,.5)}const qc=3;function Vc(){let u=!1,v=0;for(;!u;){v++;let h=nd(v),_=ld(v);u=v==qc||h&&_,u||(da(n.width,n.height),Nn=!0)}}function Uc({width:u,height:v}){Ol(u,v)}n.setSize=Uc;function Gc(){let u=!1,v=!1,h=!1,_=!1;k.forEach((w,L)=>{if(w.show&&w._show){let{side:I,_size:j}=w,B=I%2,G=w.label!=null?w.labelSize:0,Y=j+G;Y>0&&(B?(it-=Y,I==3?(xt+=Y,_=!0):h=!0):(Z-=Y,I==0?(Vt+=Y,u=!0):v=!0))}}),bs[0]=u,bs[1]=h,bs[2]=v,bs[3]=_,it-=os[1]+os[3],xt+=os[3],Z-=os[2]+os[0],Vt+=os[0]}function Yc(){let u=xt+it,v=Vt+Z,h=xt,_=Vt;function w(L,I){switch(L){case 1:return u+=I,u-I;case 2:return v+=I,v-I;case 3:return h-=I,h+I;case 0:return _-=I,_+I}}k.forEach((L,I)=>{if(L.show&&L._show){let j=L.side;L._pos=w(j,L._size),L.label!=null&&(L._lpos=w(j,L.labelSize))}})}if(J.dataIdx==null){let u=J.hover,v=u.skip=new Set(u.skip??[]);v.add(void 0);let h=u.prox=dt(u.prox),_=u.bias??(u.bias=0);J.dataIdx=(w,L,I,j)=>{if(L==0)return I;let B=I,G=h(w,L,I,j)??bt,Y=G>=0&&G<bt,Q=O.ori==0?it:Z,ot=J.left,vt=e[0],pt=e[L];if(v.has(pt[I])){B=null;let ct=null,nt=null,X;if(_==0||_==-1)for(X=I;ct==null&&X-- >0;)v.has(pt[X])||(ct=X);if(_==0||_==1)for(X=I;nt==null&&X++<pt.length;)v.has(pt[X])||(nt=X);if(ct!=null||nt!=null)if(Y){let Ct=ct==null?-1/0:D(vt[ct],O,Q,0),It=nt==null?1/0:D(vt[nt],O,Q,0),se=ot-Ct,yt=It-ot;se<=yt?se<=G&&(B=ct):yt<=G&&(B=nt)}else B=nt==null?ct:ct==null?nt:I-ct<=nt-I?ct:nt}else Y&&Yt(ot-D(vt[I],O,Q,0))>G&&(B=null);return B}}const ys=u=>{J.event=u};J.idxs=rt,J._lock=!1;let ie=J.points;ie.show=dt(ie.show),ie.size=dt(ie.size),ie.stroke=dt(ie.stroke),ie.width=dt(ie.width),ie.fill=dt(ie.fill);const qe=n.focus=qt({},t.focus||{alpha:.3},J.focus),Is=qe.prox>=0,Ns=Is&&ie.one;let Te=[],Rs=[],js=[];function ua(u,v){let h=ie.show(n,v);if(h instanceof HTMLElement)return be(h,mp),be(h,u.class),Ke(h,-10,-10,it,Z),x.insertBefore(h,Te[v]),h}function pa(u,v){if(l==1||v>0){let h=l==1&&S[u.scale].time,_=u.value;u.value=h?Ti(_)?Pi(U,Oi(_,W)):_||K:_||Ef,u.label=u.label||(h?kf:bf)}if(Ns||v>0){u.width=u.width==null?1:u.width,u.paths=u.paths||qf||Op,u.fillTo=dt(u.fillTo||zf),u.pxAlign=+ft(u.pxAlign,E),u.pxRound=Wi(u.pxAlign),u.stroke=dt(u.stroke||null),u.fill=dt(u.fill||null),u._stroke=u._fill=u._paths=u._focus=null;let h=Lf(pe(1,u.width),1),_=u.points=qt({},{size:h,width:pe(1,h*.2),stroke:u.stroke,space:h*2,paths:Vf,_stroke:null,_fill:null},u.points);_.show=dt(_.show),_.filter=dt(_.filter),_.fill=dt(_.fill),_.stroke=dt(_.stroke),_.paths=dt(_.paths),_.pxAlign=u.pxAlign}if(Pt){let h=In(u,v);zt.splice(v,0,h[0]),He.splice(v,0,h[1]),tt.values.push(null)}if(Jt){rt.splice(v,0,null);let h=null;Ns?v==0&&(h=ua(u,v)):v>0&&(h=ua(u,v)),Te.splice(v,0,h),Rs.splice(v,0,0),js.splice(v,0,0)}ee("addSeries",v)}function Kc(u,v){v=v??$.length,u=l==1?Po(u,v,Fi,Bi):Po(u,v,{},ji),$.splice(v,0,u),pa($[v],v)}n.addSeries=Kc;function Jc(u){if($.splice(u,1),Pt){tt.values.splice(u,1),He.splice(u,1);let v=zt.splice(u,1)[0];Ps(null,v.firstChild),v.remove()}Jt&&(rt.splice(u,1),Te.splice(u,1)[0].remove(),Rs.splice(u,1),js.splice(u,1)),ee("delSeries",u)}n.delSeries=Jc;const bs=[!1,!1,!1,!1];function Zc(u,v){if(u._show=u.show,u.show){let h=u.side%2,_=S[u.scale];_==null&&(u.scale=h?$[1].scale:A,_=S[u.scale]);let w=_.time;u.size=dt(u.size),u.space=dt(u.space),u.rotate=dt(u.rotate),us(u.incrs)&&u.incrs.forEach(I=>{!vs.has(I)&&vs.set(I,ec(I))}),u.incrs=dt(u.incrs||(_.distr==2?ef:w?b==1?nf:af:Cs)),u.splits=dt(u.splits||(w&&_.distr==1?et:_.distr==3?Eo:_.distr==4?Sf:wf)),u.stroke=dt(u.stroke),u.grid.stroke=dt(u.grid.stroke),u.ticks.stroke=dt(u.ticks.stroke),u.border.stroke=dt(u.border.stroke);let L=u.values;u.values=us(L)&&!us(L[0])?dt(L):w?us(L)?Ai(U,Li(L,W)):Ti(L)?df(U,L):L||st:L||xf,u.filter=dt(u.filter||(_.distr>=3&&_.log==10?Mf:_.distr==3&&_.log==2?Df:Xr)),u.font=Gi(u.font),u.labelFont=Gi(u.labelFont),u._size=u.size(n,null,v,0),u._space=u._rotate=u._incrs=u._found=u._splits=u._values=null,u._size>0&&(bs[v]=!0,u._el=Ee(up,m))}}function hn(u,v,h,_){let[w,L,I,j]=h,B=v%2,G=0;return B==0&&(j||L)&&(G=v==0&&!w||v==2&&!I?Ut(zi.size/3):0),B==1&&(w||I)&&(G=v==1&&!L||v==3&&!j?Ut(Ni.size/2):0),G}const fa=n.padding=(t.padding||[hn,hn,hn,hn]).map(u=>dt(ft(u,hn))),os=n._padding=fa.map((u,v)=>u(n,v,bs,0));let ne,Zt=null,Qt=null;const jn=l==1?$[0].idxs:null;let Pe=null,gn=!1;function va(u,v){if(e=u??[],n.data=n._data=e,l==2){ne=0;for(let h=1;h<$.length;h++)ne+=e[h][0].length}else{e.length==0&&(n.data=n._data=e=[[]]),Pe=e[0],ne=Pe.length;let h=e;if(P==2){h=e.slice();let _=h[0]=Array(ne);for(let w=0;w<ne;w++)_[w]=w}n._data=e=h}if(Hs(!0),ee("setData"),P==2&&(Fs=!0),v!==!1){let h=O;h.auto(n,gn)?Pl():is(A,h.min,h.max),_s=_s||J.left>=0,Ce=!0,Ws()}}n.setData=va;function Pl(){gn=!0;let u,v;l==1&&(ne>0?(Zt=jn[0]=0,Qt=jn[1]=ne-1,u=e[0][Zt],v=e[0][Qt],P==2?(u=Zt,v=Qt):u==v&&(P==3?[u,v]=wl(u,u,O.log,!1):P==4?[u,v]=Zo(u,u,O.log,!1):O.time?v=u+Ut(86400/b):[u,v]=vl(u,v,Qo,!0))):(Zt=jn[0]=u=null,Qt=jn[1]=v=null)),is(A,u,v)}let Bn,Bs,zl,Fl,Il,Nl,Rl,jl,Bl,ve;function ma(u,v,h,_,w,L){u??(u=di),h??(h=ta),_??(_="butt"),w??(w=di),L??(L="round"),u!=Bn&&(p.strokeStyle=Bn=u),w!=Bs&&(p.fillStyle=Bs=w),v!=zl&&(p.lineWidth=zl=v),L!=Il&&(p.lineJoin=Il=L),_!=Nl&&(p.lineCap=Nl=_),h!=Fl&&p.setLineDash(Fl=h)}function ha(u,v,h,_){v!=Bs&&(p.fillStyle=Bs=v),u!=Rl&&(p.font=Rl=u),h!=jl&&(p.textAlign=jl=h),_!=Bl&&(p.textBaseline=Bl=_)}function Hl(u,v,h,_,w=0){if(_.length>0&&u.auto(n,gn)&&(v==null||v.min==null)){let L=ft(Zt,0),I=ft(Qt,_.length-1),j=h.min==null?Tp(_,L,I,w,u.distr==3):[h.min,h.max];u.min=Re(u.min,h.min=j[0]),u.max=pe(u.max,h.max=j[1])}}const ga={min:null,max:null};function Qc(){for(let _ in S){let w=S[_];H[_]==null&&(w.min==null||H[A]!=null&&w.auto(n,gn))&&(H[_]=ga)}for(let _ in S){let w=S[_];H[_]==null&&w.from!=null&&H[w.from]!=null&&(H[_]=ga)}H[A]!=null&&Hs(!0);let u={};for(let _ in H){let w=H[_];if(w!=null){let L=u[_]=dn(S[_],Fp);if(w.min!=null)qt(L,w);else if(_!=A||l==2)if(ne==0&&L.from==null){let I=L.range(n,null,null,_);L.min=I[0],L.max=I[1]}else L.min=bt,L.max=-bt}}if(ne>0){$.forEach((_,w)=>{if(l==1){let L=_.scale,I=H[L];if(I==null)return;let j=u[L];if(w==0){let B=j.range(n,j.min,j.max,L);j.min=B[0],j.max=B[1],Zt=Ne(j.min,e[0]),Qt=Ne(j.max,e[0]),Qt-Zt>1&&(e[0][Zt]<j.min&&Zt++,e[0][Qt]>j.max&&Qt--),_.min=Pe[Zt],_.max=Pe[Qt]}else _.show&&_.auto&&Hl(j,I,_,e[w],_.sorted);_.idxs[0]=Zt,_.idxs[1]=Qt}else if(w>0&&_.show&&_.auto){let[L,I]=_.facets,j=L.scale,B=I.scale,[G,Y]=e[w],Q=u[j],ot=u[B];Q!=null&&Hl(Q,H[j],L,G,L.sorted),ot!=null&&Hl(ot,H[B],I,Y,I.sorted),_.min=I.min,_.max=I.max}});for(let _ in u){let w=u[_],L=H[_];if(w.from==null&&(L==null||L.min==null)){let I=w.range(n,w.min==bt?null:w.min,w.max==-bt?null:w.max,_);w.min=I[0],w.max=I[1]}}}for(let _ in u){let w=u[_];if(w.from!=null){let L=u[w.from];if(L.min==null)w.min=w.max=null;else{let I=w.range(n,L.min,L.max,_);w.min=I[0],w.max=I[1]}}}let v={},h=!1;for(let _ in u){let w=u[_],L=S[_];if(L.min!=w.min||L.max!=w.max){L.min=w.min,L.max=w.max;let I=L.distr;L._min=I==3?ss(L.min):I==4?co(L.min,L.asinh):I==100?L.fwd(L.min):L.min,L._max=I==3?ss(L.max):I==4?co(L.max,L.asinh):I==100?L.fwd(L.max):L.max,v[_]=h=!0}}if(h){$.forEach((_,w)=>{l==2?w>0&&v.y&&(_._paths=null):v[_.scale]&&(_._paths=null)});for(let _ in v)Fs=!0,ee("setScale",_);Jt&&J.left>=0&&(_s=Ce=!0)}for(let _ in H)H[_]=null}function Xc(u){let v=Do(Zt-1,0,ne-1),h=Do(Qt+1,0,ne-1);for(;u[v]==null&&v>0;)v--;for(;u[h]==null&&h<ne-1;)h++;return[v,h]}function td(){if(ne>0){let u=$.some(v=>v._focus)&&ve!=qe.alpha;u&&(p.globalAlpha=ve=qe.alpha),$.forEach((v,h)=>{if(h>0&&v.show&&($a(h,!1),$a(h,!0),v._paths==null)){let _=ve;ve!=v.alpha&&(p.globalAlpha=ve=v.alpha);let w=l==2?[0,e[h][0].length-1]:Xc(e[h]);v._paths=v.paths(n,h,w[0],w[1]),ve!=_&&(p.globalAlpha=ve=_)}}),$.forEach((v,h)=>{if(h>0&&v.show){let _=ve;ve!=v.alpha&&(p.globalAlpha=ve=v.alpha),v._paths!=null&&_a(h,!1);{let w=v._paths!=null?v._paths.gaps:null,L=v.points.show(n,h,Zt,Qt,w),I=v.points.filter(n,h,L,w);(L||I)&&(v.points._paths=v.points.paths(n,h,Zt,Qt,I),_a(h,!0))}ve!=_&&(p.globalAlpha=ve=_),ee("drawSeries",h)}}),u&&(p.globalAlpha=ve=1)}}function $a(u,v){let h=v?$[u].points:$[u];h._stroke=h.stroke(n,u),h._fill=h.fill(n,u)}function _a(u,v){let h=v?$[u].points:$[u],{stroke:_,fill:w,clip:L,flags:I,_stroke:j=h._stroke,_fill:B=h._fill,_width:G=h.width}=h._paths;G=kt(G*mt,3);let Y=null,Q=G%2/2;v&&B==null&&(B=G>0?"#fff":j);let ot=h.pxAlign==1&&Q>0;if(ot&&p.translate(Q,Q),!v){let vt=ge-G/2,pt=Se-G/2,ct=fe+G,nt=Oe+G;Y=new Path2D,Y.rect(vt,pt,ct,nt)}v?Wl(j,G,h.dash,h.cap,B,_,w,I,L):ed(u,j,G,h.dash,h.cap,B,_,w,I,Y,L),ot&&p.translate(-Q,-Q)}function ed(u,v,h,_,w,L,I,j,B,G,Y){let Q=!1;B!=0&&N.forEach((ot,vt)=>{if(ot.series[0]==u){let pt=$[ot.series[1]],ct=e[ot.series[1]],nt=(pt._paths||Ln).band;us(nt)&&(nt=ot.dir==1?nt[0]:nt[1]);let X,Ct=null;pt.show&&nt&&Dp(ct,Zt,Qt)?(Ct=ot.fill(n,vt)||L,X=pt._paths.clip):nt=null,Wl(v,h,_,w,Ct,I,j,B,G,Y,X,nt),Q=!0}}),Q||Wl(v,h,_,w,L,I,j,B,G,Y)}const ya=un|Ao;function Wl(u,v,h,_,w,L,I,j,B,G,Y,Q){ma(u,v,h,_,w),(B||G||Q)&&(p.save(),B&&p.clip(B),G&&p.clip(G)),Q?(j&ya)==ya?(p.clip(Q),Y&&p.clip(Y),Wn(w,I),Hn(u,L,v)):j&Ao?(Wn(w,I),p.clip(Q),Hn(u,L,v)):j&un&&(p.save(),p.clip(Q),Y&&p.clip(Y),Wn(w,I),p.restore(),Hn(u,L,v)):(Wn(w,I),Hn(u,L,v)),(B||G||Q)&&p.restore()}function Hn(u,v,h){h>0&&(v instanceof Map?v.forEach((_,w)=>{p.strokeStyle=Bn=w,p.stroke(_)}):v!=null&&u&&p.stroke(v))}function Wn(u,v){v instanceof Map?v.forEach((h,_)=>{p.fillStyle=Bs=_,p.fill(h)}):v!=null&&u&&p.fill(v)}function sd(u,v,h,_){let w=k[u],L;if(_<=0)L=[0,0];else{let I=w._space=w.space(n,u,v,h,_),j=w._incrs=w.incrs(n,u,v,h,_,I);L=Zf(v,h,j,_,I)}return w._found=L}function ql(u,v,h,_,w,L,I,j,B,G){let Y=I%2/2;E==1&&p.translate(Y,Y),ma(j,I,B,G,j),p.beginPath();let Q,ot,vt,pt,ct=w+(_==0||_==3?-L:L);h==0?(ot=w,pt=ct):(Q=w,vt=ct);for(let nt=0;nt<u.length;nt++)v[nt]!=null&&(h==0?Q=vt=u[nt]:ot=pt=u[nt],p.moveTo(Q,ot),p.lineTo(vt,pt));p.stroke(),E==1&&p.translate(-Y,-Y)}function nd(u){let v=!0;return k.forEach((h,_)=>{if(!h.show)return;let w=S[h.scale];if(w.min==null){h._show&&(v=!1,h._show=!1,Hs(!1));return}else h._show||(v=!1,h._show=!0,Hs(!1));let L=h.side,I=L%2,{min:j,max:B}=w,[G,Y]=sd(_,j,B,I==0?it:Z);if(Y==0)return;let Q=w.distr==2,ot=h._splits=h.splits(n,_,j,B,G,Y,Q),vt=w.distr==2?ot.map(X=>Pe[X]):ot,pt=w.distr==2?Pe[ot[1]]-Pe[ot[0]]:G,ct=h._values=h.values(n,h.filter(n,vt,_,Y,pt),_,Y,pt);h._rotate=L==2?h.rotate(n,ct,_,Y):0;let nt=h._size;h._size=Le(h.size(n,ct,_,u)),nt!=null&&h._size!=nt&&(v=!1)}),v}function ld(u){let v=!0;return fa.forEach((h,_)=>{let w=h(n,_,bs,u);w!=os[_]&&(v=!1),os[_]=w}),v}function od(){for(let u=0;u<k.length;u++){let v=k[u];if(!v.show||!v._show)continue;let h=v.side,_=h%2,w,L,I=v.stroke(n,u),j=h==0||h==3?-1:1,[B,G]=v._found;if(v.label!=null){let de=v.labelGap*j,ye=Ut((v._lpos+de)*mt);ha(v.labelFont[0],I,"center",h==2?xn:ci),p.save(),_==1?(w=L=0,p.translate(ye,Ut(Se+Oe/2)),p.rotate((h==3?-ll:ll)/2)):(w=Ut(ge+fe/2),L=ye);let ws=Zr(v.label)?v.label(n,u,B,G):v.label;p.fillText(ws,w,L),p.restore()}if(G==0)continue;let Y=S[v.scale],Q=_==0?fe:Oe,ot=_==0?ge:Se,vt=v._splits,pt=Y.distr==2?vt.map(de=>Pe[de]):vt,ct=Y.distr==2?Pe[vt[1]]-Pe[vt[0]]:B,nt=v.ticks,X=v.border,Ct=nt.show?nt.size:0,It=Ut(Ct*mt),se=Ut((v.alignTo==2?v._size-Ct-v.gap:v.gap)*mt),yt=v._rotate*-ll/180,Nt=C(v._pos*mt),$e=(It+se)*j,ce=Nt+$e;L=_==0?ce:0,w=_==1?ce:0;let Me=v.font[0],ze=v.align==1?Qs:v.align==2?ao:yt>0?Qs:yt<0?ao:_==0?"center":h==3?ao:Qs,Ge=yt||_==1?"middle":h==2?xn:ci;ha(Me,I,ze,Ge);let _e=v.font[1]*v.lineGap,De=vt.map(de=>C(r(de,Y,Q,ot))),Fe=v._values;for(let de=0;de<Fe.length;de++){let ye=Fe[de];if(ye!=null){_==0?w=De[de]:L=De[de],ye=""+ye;let ws=ye.indexOf(`
`)==-1?[ye]:ye.split(/\n/gm);for(let ue=0;ue<ws.length;ue++){let Ra=ws[ue];yt?(p.save(),p.translate(w,L+ue*_e),p.rotate(yt),p.fillText(Ra,0,0),p.restore()):p.fillText(Ra,w,L+ue*_e)}}}nt.show&&ql(De,nt.filter(n,pt,u,G,ct),_,h,Nt,It,kt(nt.width*mt,3),nt.stroke(n,u),nt.dash,nt.cap);let Ye=v.grid;Ye.show&&ql(De,Ye.filter(n,pt,u,G,ct),_,_==0?2:1,_==0?Se:ge,_==0?Oe:fe,kt(Ye.width*mt,3),Ye.stroke(n,u),Ye.dash,Ye.cap),X.show&&ql([Nt],[1],_==0?1:0,_==0?1:2,_==1?Se:ge,_==1?Oe:fe,kt(X.width*mt,3),X.stroke(n,u),X.dash,X.cap)}ee("drawAxes")}function Hs(u){$.forEach((v,h)=>{h>0&&(v._paths=null,u&&(l==1?(v.min=null,v.max=null):v.facets.forEach(_=>{_.min=null,_.max=null})))})}let qn=!1,Vl=!1,$n=[];function ad(){Vl=!1;for(let u=0;u<$n.length;u++)ee(...$n[u]);$n.length=0}function Ws(){qn||(Wp(ba),qn=!0)}function id(u,v=!1){qn=!0,Vl=v,u(n),ba(),v&&$n.length>0&&queueMicrotask(ad)}n.batch=id;function ba(){if(Al&&(Qc(),Al=!1),Fs&&(Vc(),Fs=!1),Nn){if(Tt(g,Qs,xt),Tt(g,xn,Vt),Tt(g,Cn,it),Tt(g,Tn,Z),Tt(x,Qs,xt),Tt(x,xn,Vt),Tt(x,Cn,it),Tt(x,Tn,Z),Tt(m,Cn,Qe),Tt(m,Tn,hs),f.width=Ut(Qe*mt),f.height=Ut(hs*mt),k.forEach(({_el:u,_show:v,_size:h,_pos:_,side:w})=>{if(u!=null)if(v){let L=w===3||w===0?h:0,I=w%2==1;Tt(u,I?"left":"top",_-L),Tt(u,I?"width":"height",h),Tt(u,I?"top":"left",I?Vt:xt),Tt(u,I?"height":"width",I?Z:it),To(u,Ts)}else be(u,Ts)}),Bn=Bs=zl=Il=Nl=Rl=jl=Bl=Fl=null,ve=1,bn(!0),xt!=zs||Vt!=gs||it!=We||Z!=$s){Hs(!1);let u=it/We,v=Z/$s;if(Jt&&!_s&&J.left>=0){J.left*=u,J.top*=v,qs&&Ke(qs,Ut(J.left),0,it,Z),Vs&&Ke(Vs,0,Ut(J.top),it,Z);for(let h=0;h<Te.length;h++){let _=Te[h];_!=null&&(Rs[h]*=u,js[h]*=v,Ke(_,Le(Rs[h]),Le(js[h]),it,Z))}}if(St.show&&!Rn&&St.left>=0&&St.width>0){St.left*=u,St.width*=u,St.top*=v,St.height*=v;for(let h in Zl)Tt(Ys,h,St[h])}zs=xt,gs=Vt,We=it,$s=Z}ee("setSize"),Nn=!1}Qe>0&&hs>0&&(p.clearRect(0,0,f.width,f.height),ee("drawClear"),F.forEach(u=>u()),ee("draw")),St.show&&Rn&&(Vn(St),Rn=!1),Jt&&_s&&(xs(null,!0,!1),_s=!1),tt.show&&tt.live&&Ce&&(Kl(),Ce=!1),i||(i=!0,n.status=1,ee("ready")),gn=!1,qn=!1}n.redraw=(u,v)=>{Fs=v||!1,u!==!1?is(A,O.min,O.max):Ws()};function Ul(u,v){let h=S[u];if(h.from==null){if(ne==0){let _=h.range(n,v.min,v.max,u);v.min=_[0],v.max=_[1]}if(v.min>v.max){let _=v.min;v.min=v.max,v.max=_}if(ne>1&&v.min!=null&&v.max!=null&&v.max-v.min<1e-16)return;u==A&&h.distr==2&&ne>0&&(v.min=Ne(v.min,e[0]),v.max=Ne(v.max,e[0]),v.min==v.max&&v.max++),H[u]=v,Al=!0,Ws()}}n.setScale=Ul;let Gl,Yl,qs,Vs,ka,xa,Us,Gs,wa,Sa,wt,Lt,as=!1;const le=J.drag;let Xt=le.x,te=le.y;Jt&&(J.x&&(Gl=Ee(fp,x)),J.y&&(Yl=Ee(vp,x)),O.ori==0?(qs=Gl,Vs=Yl):(qs=Yl,Vs=Gl),wt=J.left,Lt=J.top);const St=n.select=qt({show:!0,over:!0,left:0,width:0,top:0,height:0},t.select),Ys=St.show?Ee(pp,St.over?x:g):null;function Vn(u,v){if(St.show){for(let h in u)St[h]=u[h],h in Zl&&Tt(Ys,h,u[h]);v!==!1&&ee("setSelect")}}n.setSelect=Vn;function rd(u){if($[u].show)Pt&&To(zt[u],Ts);else if(Pt&&be(zt[u],Ts),Jt){let h=Ns?Te[0]:Te[u];h!=null&&Ke(h,-10,-10,it,Z)}}function is(u,v,h){Ul(u,{min:v,max:h})}function Ve(u,v,h,_){v.focus!=null&&fd(u),v.show!=null&&$.forEach((w,L)=>{L>0&&(u==L||u==null)&&(w.show=v.show,rd(L),l==2?(is(w.facets[0].scale,null,null),is(w.facets[1].scale,null,null)):is(w.scale,null,null),Ws())}),h!==!1&&ee("setSeries",u,v),_&&kn("setSeries",n,u,v)}n.setSeries=Ve;function cd(u,v){qt(N[u],v)}function dd(u,v){u.fill=dt(u.fill||null),u.dir=ft(u.dir,-1),v=v??N.length,N.splice(v,0,u)}function ud(u){u==null?N.length=0:N.splice(u,1)}n.addBand=dd,n.setBand=cd,n.delBand=ud;function pd(u,v){$[u].alpha=v,Jt&&Te[u]!=null&&(Te[u].style.opacity=v),Pt&&zt[u]&&(zt[u].style.opacity=v)}let Xe,rs,ks;const Ks={focus:!0};function fd(u){if(u!=ks){let v=u==null,h=qe.alpha!=1;$.forEach((_,w)=>{if(l==1||w>0){let L=v||w==0||w==u;_._focus=v?null:L,h&&pd(w,L?1:qe.alpha)}}),ks=u,h&&Ws()}}Pt&&Is&&re(fi,ut,u=>{J._lock||(ys(u),ks!=null&&Ve(null,Ks,!0,Ht.setSeries))});function Ue(u,v,h){let _=S[v];h&&(u=u/mt-(_.ori==1?Vt:xt));let w=it;_.ori==1&&(w=Z,u=w-u),_.dir==-1&&(u=w-u);let L=_._min,I=_._max,j=u/w,B=L+(I-L)*j,G=_.distr;return G==3?rn(10,B):G==4?Lp(B,_.asinh):G==100?_.bwd(B):B}function vd(u,v){let h=Ue(u,A,v);return Ne(h,e[0],Zt,Qt)}n.valToIdx=u=>Ne(u,e[0]),n.posToIdx=vd,n.posToVal=Ue,n.valToPos=(u,v,h)=>S[v].ori==0?o(u,S[v],h?fe:it,h?ge:0):a(u,S[v],h?Oe:Z,h?Se:0),n.setCursor=(u,v,h)=>{wt=u.left,Lt=u.top,xs(null,v,h)};function Ca(u,v){Tt(Ys,Qs,St.left=u),Tt(Ys,Cn,St.width=v)}function Ta(u,v){Tt(Ys,xn,St.top=u),Tt(Ys,Tn,St.height=v)}let _n=O.ori==0?Ca:Ta,yn=O.ori==1?Ca:Ta;function md(){if(Pt&&tt.live)for(let u=l==2?1:0;u<$.length;u++){if(u==0&&we)continue;let v=tt.values[u],h=0;for(let _ in v)He[u][h++].firstChild.nodeValue=v[_]}}function Kl(u,v){if(u!=null&&(u.idxs?u.idxs.forEach((h,_)=>{rt[_]=h}):zp(u.idx)||rt.fill(u.idx),tt.idx=rt[0]),Pt&&tt.live){for(let h=0;h<$.length;h++)(h>0||l==1&&!we)&&hd(h,rt[h]);md()}Ce=!1,v!==!1&&ee("setLegend")}n.setLegend=Kl;function hd(u,v){let h=$[u],_=u==0&&P==2?Pe:e[u],w;we?w=h.values(n,u,v)??ls:(w=h.value(n,v==null?null:_[v],u,v),w=w==null?ls:{_:w}),tt.values[u]=w}function xs(u,v,h){wa=wt,Sa=Lt,[wt,Lt]=J.move(n,wt,Lt),J.left=wt,J.top=Lt,Jt&&(qs&&Ke(qs,Ut(wt),0,it,Z),Vs&&Ke(Vs,0,Ut(Lt),it,Z));let _,w=Zt>Qt;Xe=bt,rs=null;let L=O.ori==0?it:Z,I=O.ori==1?it:Z;if(wt<0||ne==0||w){_=J.idx=null;for(let j=0;j<$.length;j++){let B=Te[j];B!=null&&Ke(B,-10,-10,it,Z)}Is&&Ve(null,Ks,!0,u==null&&Ht.setSeries),tt.live&&(rt.fill(_),Ce=!0)}else{let j,B,G;l==1&&(j=O.ori==0?wt:Lt,B=Ue(j,A),_=J.idx=Ne(B,e[0],Zt,Qt),G=D(e[0][_],O,L,0));let Y=-10,Q=-10,ot=0,vt=0,pt=!0,ct="",nt="";for(let X=l==2?1:0;X<$.length;X++){let Ct=$[X],It=rt[X],se=It==null?null:l==1?e[X][It]:e[X][1][It],yt=J.dataIdx(n,X,_,B),Nt=yt==null?null:l==1?e[X][yt]:e[X][1][yt];if(Ce=Ce||Nt!=se||yt!=It,rt[X]=yt,X>0&&Ct.show){let $e=yt==null?-10:yt==_?G:D(l==1?e[0][yt]:e[X][0][yt],O,L,0),ce=Nt==null?-10:q(Nt,l==1?S[Ct.scale]:S[Ct.facets[1].scale],I,0);if(Is&&Nt!=null){let Me=O.ori==1?wt:Lt,ze=Yt(qe.dist(n,X,yt,ce,Me));if(ze<Xe){let Ge=qe.bias;if(Ge!=0){let _e=Ue(Me,Ct.scale),De=Nt>=0?1:-1,Fe=_e>=0?1:-1;Fe==De&&(Fe==1?Ge==1?Nt>=_e:Nt<=_e:Ge==1?Nt<=_e:Nt>=_e)&&(Xe=ze,rs=X)}else Xe=ze,rs=X}}if(Ce||Ns){let Me,ze;O.ori==0?(Me=$e,ze=ce):(Me=ce,ze=$e);let Ge,_e,De,Fe,Ye,de,ye=!0,ws=ie.bbox;if(ws!=null){ye=!1;let ue=ws(n,X);De=ue.left,Fe=ue.top,Ge=ue.width,_e=ue.height}else De=Me,Fe=ze,Ge=_e=ie.size(n,X);if(de=ie.fill(n,X),Ye=ie.stroke(n,X),Ns)X==rs&&Xe<=qe.prox&&(Y=De,Q=Fe,ot=Ge,vt=_e,pt=ye,ct=de,nt=Ye);else{let ue=Te[X];ue!=null&&(Rs[X]=De,js[X]=Fe,yi(ue,Ge,_e,ye),$i(ue,de,Ye),Ke(ue,Le(De),Le(Fe),it,Z))}}}}if(Ns){let X=qe.prox,Ct=ks==null?Xe<=X:Xe>X||rs!=ks;if(Ce||Ct){let It=Te[0];It!=null&&(Rs[0]=Y,js[0]=Q,yi(It,ot,vt,pt),$i(It,ct,nt),Ke(It,Le(Y),Le(Q),it,Z))}}}if(St.show&&as)if(u!=null){let[j,B]=Ht.scales,[G,Y]=Ht.match,[Q,ot]=u.cursor.sync.scales,vt=u.cursor.drag;if(Xt=vt._x,te=vt._y,Xt||te){let{left:pt,top:ct,width:nt,height:X}=u.select,Ct=u.scales[Q].ori,It=u.posToVal,se,yt,Nt,$e,ce,Me=j!=null&&G(j,Q),ze=B!=null&&Y(B,ot);Me&&Xt?(Ct==0?(se=pt,yt=nt):(se=ct,yt=X),Nt=S[j],$e=D(It(se,Q),Nt,L,0),ce=D(It(se+yt,Q),Nt,L,0),_n(Re($e,ce),Yt(ce-$e))):_n(0,L),ze&&te?(Ct==1?(se=pt,yt=nt):(se=ct,yt=X),Nt=S[B],$e=q(It(se,ot),Nt,I,0),ce=q(It(se+yt,ot),Nt,I,0),yn(Re($e,ce),Yt(ce-$e))):yn(0,I)}else Ql()}else{let j=Yt(wa-ka),B=Yt(Sa-xa);if(O.ori==1){let ot=j;j=B,B=ot}Xt=le.x&&j>=le.dist,te=le.y&&B>=le.dist;let G=le.uni;G!=null?Xt&&te&&(Xt=j>=G,te=B>=G,!Xt&&!te&&(B>j?te=!0:Xt=!0)):le.x&&le.y&&(Xt||te)&&(Xt=te=!0);let Y,Q;Xt&&(O.ori==0?(Y=Us,Q=wt):(Y=Gs,Q=Lt),_n(Re(Y,Q),Yt(Q-Y)),te||yn(0,I)),te&&(O.ori==1?(Y=Us,Q=wt):(Y=Gs,Q=Lt),yn(Re(Y,Q),Yt(Q-Y)),Xt||_n(0,L)),!Xt&&!te&&(_n(0,0),yn(0,0))}if(le._x=Xt,le._y=te,u==null){if(h){if(Na!=null){let[j,B]=Ht.scales;Ht.values[0]=j!=null?Ue(O.ori==0?wt:Lt,j):null,Ht.values[1]=B!=null?Ue(O.ori==1?wt:Lt,B):null}kn(io,n,wt,Lt,it,Z,_)}if(Is){let j=h&&Ht.setSeries,B=qe.prox;ks==null?Xe<=B&&Ve(rs,Ks,!0,j):Xe>B?Ve(null,Ks,!0,j):rs!=ks&&Ve(rs,Ks,!0,j)}}Ce&&(tt.idx=_,Kl()),v!==!1&&ee("setCursor")}let cs=null;Object.defineProperty(n,"rect",{get(){return cs==null&&bn(!1),cs}});function bn(u=!1){u?cs=null:(cs=x.getBoundingClientRect(),ee("syncRect",cs))}function Ma(u,v,h,_,w,L,I){J._lock||as&&u!=null&&u.movementX==0&&u.movementY==0||(Jl(u,v,h,_,w,L,I,!1,u!=null),u!=null?xs(null,!0,!0):xs(v,!0,!1))}function Jl(u,v,h,_,w,L,I,j,B){if(cs==null&&bn(!1),ys(u),u!=null)h=u.clientX-cs.left,_=u.clientY-cs.top;else{if(h<0||_<0){wt=-10,Lt=-10;return}let[G,Y]=Ht.scales,Q=v.cursor.sync,[ot,vt]=Q.values,[pt,ct]=Q.scales,[nt,X]=Ht.match,Ct=v.axes[0].side%2==1,It=O.ori==0?it:Z,se=O.ori==1?it:Z,yt=Ct?L:w,Nt=Ct?w:L,$e=Ct?_:h,ce=Ct?h:_;if(pt!=null?h=nt(G,pt)?r(ot,S[G],It,0):-10:h=It*($e/yt),ct!=null?_=X(Y,ct)?r(vt,S[Y],se,0):-10:_=se*(ce/Nt),O.ori==1){let Me=h;h=_,_=Me}}B&&(v==null||v.cursor.event.type==io)&&((h<=1||h>=it-1)&&(h=Ss(h,it)),(_<=1||_>=Z-1)&&(_=Ss(_,Z))),j?(ka=h,xa=_,[Us,Gs]=J.move(n,h,_)):(wt=h,Lt=_)}const Zl={width:0,height:0,left:0,top:0};function Ql(){Vn(Zl,!1)}let Da,Ea,La,Aa;function Oa(u,v,h,_,w,L,I){as=!0,Xt=te=le._x=le._y=!1,Jl(u,v,h,_,w,L,I,!0,!1),u!=null&&(re(ro,So,Pa,!1),kn(ui,n,Us,Gs,it,Z,null));let{left:j,top:B,width:G,height:Y}=St;Da=j,Ea=B,La=G,Aa=Y}function Pa(u,v,h,_,w,L,I){as=le._x=le._y=!1,Jl(u,v,h,_,w,L,I,!1,!0);let{left:j,top:B,width:G,height:Y}=St,Q=G>0||Y>0,ot=Da!=j||Ea!=B||La!=G||Aa!=Y;if(Q&&ot&&Vn(St),le.setScale&&Q&&ot){let vt=j,pt=G,ct=B,nt=Y;if(O.ori==1&&(vt=B,pt=Y,ct=j,nt=G),Xt&&is(A,Ue(vt,A),Ue(vt+pt,A)),te)for(let X in S){let Ct=S[X];X!=A&&Ct.from==null&&Ct.min!=bt&&is(X,Ue(ct+nt,X),Ue(ct,X))}Ql()}else J.lock&&(J._lock=!J._lock,xs(v,!0,u!=null));u!=null&&(Ps(ro,So),kn(ro,n,wt,Lt,it,Z,null))}function gd(u,v,h,_,w,L,I){if(J._lock)return;ys(u);let j=as;if(as){let B=!0,G=!0,Y=10,Q,ot;O.ori==0?(Q=Xt,ot=te):(Q=te,ot=Xt),Q&&ot&&(B=wt<=Y||wt>=it-Y,G=Lt<=Y||Lt>=Z-Y),Q&&B&&(wt=wt<Us?0:it),ot&&G&&(Lt=Lt<Gs?0:Z),xs(null,!0,!0),as=!1}wt=-10,Lt=-10,rt.fill(null),xs(null,!0,!0),j&&(as=j)}function za(u,v,h,_,w,L,I){J._lock||(ys(u),Pl(),Ql(),u!=null&&kn(vi,n,wt,Lt,it,Z,null))}function Fa(){k.forEach(Qf),Ol(n.width,n.height,!0)}Ms(fl,ln,Fa);const Js={};Js.mousedown=Oa,Js.mousemove=Ma,Js.mouseup=Pa,Js.dblclick=za,Js.setSeries=(u,v,h,_)=>{let w=Ht.match[2];h=w(n,v,h),h!=-1&&Ve(h,_,!0,!1)},Jt&&(re(ui,x,Oa),re(io,x,Ma),re(pi,x,u=>{ys(u),bn(!1)}),re(fi,x,gd),re(vi,x,za),Oo.add(n),n.syncRect=bn);const Un=n.hooks=t.hooks||{};function ee(u,v,h){Vl?$n.push([u,v,h]):u in Un&&Un[u].forEach(_=>{_.call(null,n,v,h)})}(t.plugins||[]).forEach(u=>{for(let v in u.hooks)Un[v]=(Un[v]||[]).concat(u.hooks[v])});const Ia=(u,v,h)=>h,Ht=qt({key:null,setSeries:!1,filters:{pub:Si,sub:Si},scales:[A,$[1]?$[1].scale:null],match:[Ci,Ci,Ia],values:[null,null]},J.sync);Ht.match.length==2&&Ht.match.push(Ia),J.sync=Ht;const Na=Ht.key,Xl=bc(Na);function kn(u,v,h,_,w,L,I){Ht.filters.pub(u,v,h,_,w,L,I)&&Xl.pub(u,v,h,_,w,L,I)}Xl.sub(n);function $d(u,v,h,_,w,L,I){Ht.filters.sub(u,v,h,_,w,L,I)&&Js[u](null,v,h,_,w,L,I)}n.pub=$d;function _d(){Xl.unsub(n),Oo.delete(n),ms.clear(),Mo(fl,ln,Fa),d.remove(),ut==null||ut.remove(),ee("destroy")}n.destroy=_d;function to(){ee("init",t,e),va(e||t.data,!1),H[A]?Ul(A,H[A]):Pl(),Rn=St.show&&(St.width>0||St.height>0),_s=Ce=!0,Ol(t.width,t.height)}return $.forEach(pa),k.forEach(Zc),s?s instanceof HTMLElement?(s.appendChild(d),to()):s(n,to):to(),n}oe.assign=qt;oe.fmtNum=Xo;oe.rangeNum=vl;oe.rangeLog=wl;oe.rangeAsinh=Zo;oe.orient=Ls;oe.pxRatio=mt;oe.join=Hp;oe.fmtDate=ea,oe.tzDate=Xp;oe.sync=bc;{oe.addGap=Ff,oe.clipGaps=Tl;let t=oe.paths={points:Tc};t.linear=Dc,t.stepped=Rf,t.bars=jf,t.spline=Hf}function Xf(t){let e;return{hooks:{init(s){e=document.createElement("div"),e.className="chart-tooltip",e.style.display="none",s.over.appendChild(e)},setCursor(s){const n=s.cursor.idx;if(n==null||!s.data[1]||s.data[1][n]==null){e.style.display="none";return}const l=s.data[0][n],o=s.data[1][n],a=new Date(l*1e3).toLocaleTimeString([],{hourCycle:"h23"});e.innerHTML=`<b>${t?t(o):z(o)}</b> ${a}`;const r=Math.round(s.valToPos(l,"x"));e.style.left=Math.min(r,s.over.clientWidth-80)+"px",e.style.display=""}}}}function tv(t,e){if(typeof document>"u")return`rgba(100,100,100,${e})`;const s=document.createElement("span");s.style.color=t,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${e})`:`rgba(100,100,100,${e})`}function Oc({data:t,color:e,smooth:s,height:n,yMax:l,fmtVal:o}){const a=Ot(null),r=Ot(null),i=n||55;return lt(()=>{if(!a.current||!t||t[0].length<2)return;const d=s?au(t[1]):t[1],f=[t[0],d];if(r.current){r.current.setData(f);return}const p=l?(g,x,E)=>[0,Math.max(l,E*1.05)]:(g,x,E)=>[Math.max(0,x*.9),E*1.1],m={width:a.current.clientWidth||200,height:i,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:p}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:e,width:1.5,fill:tv(e,.09)}],plugins:[Xf(o)]};return r.current=new oe(m,f,a.current),()=>{r.current&&(r.current.destroy(),r.current=null)}},[t,e,s]),lt(()=>{if(!r.current||!a.current)return;const d=new ResizeObserver(()=>{r.current&&a.current&&r.current.setSize({width:a.current.clientWidth,height:i})});return d.observe(a.current),()=>d.disconnect()},[]),c`<div class="chart-wrap" role="img" aria-label="Sparkline chart" style=${"height:"+i+"px"} ref=${a}></div>`}function es({label:t,value:e,valColor:s,data:n,chartColor:l,smooth:o,refLines:a,yMax:r,dp:i}){const d=at(()=>{if(!n||!n[1]||n[1].length<2)return[];const f=r?Math.max(r,n[1].reduce((p,m)=>Math.max(p,m),0)*1.05):n[1].reduce((p,m)=>Math.max(p,m),0)*1.1;return(a||[]).map(p=>{if(f<=0)return null;const m=(1-p.value/f)*100;return m>=0&&m<=95?{...p,pct:m}:null}).filter(Boolean)},[n,a,r]);return c`<div class="chart-box" role="img" aria-label=${"Chart: "+t+" — current value: "+(e||"no data")} ...${i?{"data-dp":i}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${t}</span>
      <span class="chart-val" style=${"color:"+(s||l||"var(--accent)")} aria-live="polite" aria-atomic="true">${e}</span>
    </div>
    <div style="position:relative">
      ${d.map(f=>c`<Fragment>
          <div class="chart-ref-line" style=${"top:"+f.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+f.pct+"% - 8px)"}>${f.label}</div>
        </Fragment>`)}
      ${n&&n[0].length>=2?c`<${Oc} data=${n} color=${l||"var(--accent)"} smooth=${o} yMax=${r}/>`:c`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:var(--fs-base)">collecting...</div>`}
    </div>
  </div>`}function ev({mem:t}){var k;const[e,s]=R(!1),[n,l]=R(!1),[o,a]=R(null),[r,i]=R(null),[d,f]=R(!1),p=jt(Rt),m=(t.file||"").replace(/\\/g,"/").split("/").pop(),g=ht(async()=>{if(e){s(!1);return}if(s(!0),dl.has(t.file)){a(dl.get(t.file));return}f(!0),i(null);try{const S=await Go(t.file);a(S)}catch(S){i(S.message)}finally{f(!1)}},[e,t.file]),x=(S,N)=>S.map((A,M)=>c`<span class="pline"><span class="ln">${N+M}</span>${V(A)||" "}</span>`),E=()=>{if(d)return c`<span class="loading-state">Loading...</span>`;if(r)return c`<span class="error-state">${r}</span>`;if(!o)return null;const S=o.split(`
`),N=S.length;if(N<=nn*3||n)return c`${x(S,1)}
        <div class="prev-actions">
          ${n&&c`<button class="prev-btn" onClick=${()=>l(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>p.openViewer(t.file)}>open in viewer</button>
        </div>`;const A=S.slice(-nn),M=N-nn+1;return c`${x(A,M)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>l(!0)}>show all (${N} lines)</button>
        <button class="prev-btn" onClick=${()=>p.openViewer(t.file)}>open in viewer</button>
      </div>`},C=t.mtime&&Date.now()/1e3-t.mtime<300,b=(k=p.recentFiles)==null?void 0:k.get(t.file),$=!!b;return c`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${g}
      aria-expanded=${e} title=${t.file}>
      ${$?c`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Be(b.ts)}">●</span>`:C?c`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Be(t.mtime)}">●</span>`:c`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${V(m)}</span>
      <span class="fmeta">${$t(t.tokens*4)} ${t.tokens}tok ${t.lines}ln${C||$?c` <span style="color:${$?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${Be($?b.ts:t.mtime)}</span>`:""}</span>
    </button>
    ${e&&c`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${E()}</div>`}
  </div>`}function sv({profile:t,items:e}){const[s,n]=R(e.length<=5),l=e.reduce((o,a)=>o+a.tokens,0);return c`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${t}>${V(t)}</span>
      <span class="badge">${e.length} files</span>
      <span class="badge">${z(l)} tok</span>
    </button>
    ${s&&c`<div>${e.map(o=>c`<${ev} key=${o.file} mem=${o}/>`)}</div>`}
  </div>`}function nv({source:t,entries:e}){const[s,n]=R(!1),l=at(()=>{const o={};return e.forEach(a=>{(o[a.profile]=o[a.profile]||[]).push(a)}),Object.entries(o)},[e]);return c`<div class="mem-group">
    <button class=${"mem-group-head"+(s?" open":"")} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      ${V(Zd[t]||t)} <span class="badge">${e.length}</span>
      <span class="badge">${z(e.reduce((o,a)=>o+a.tokens,0))} tok</span>
    </button>
    ${s&&c`<div>${l.map(([o,a])=>c`<${sv} key=${o} profile=${o} items=${a}/>`)}</div>`}
  </div>`}function lv(){const[t,e]=R(null);if(lt(()=>{Pn().then(n=>{n&&n.ts&&n.ts.length>=2&&e(n)}).catch(()=>{})},[]),!t)return null;const s=t.memory_entries&&t.memory_entries.some(n=>n>0);return c`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${es} label="Memory Tokens" value=${z(t.mem_tokens[t.mem_tokens.length-1]||0)}
        data=${[t.ts,t.mem_tokens]} chartColor="var(--accent)" smooth />
      ${s&&c`<${es} label="Memory Entries" value=${t.memory_entries[t.memory_entries.length-1]||0}
        data=${[t.ts,t.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function ov(){const{snap:t}=jt(Rt);if(!t||!t.agent_memory.length)return c`<p class="empty-state">No agent memory found.</p>`;const e=at(()=>{const s={};return t.agent_memory.forEach(n=>{(s[n.source]=s[n.source]||[]).push(n)}),Object.entries(s)},[t.agent_memory]);return c`<${lv}/>
    ${e.map(([s,n])=>c`<${nv} key=${s} source=${s} entries=${n}/>`)}`}function av(){var n,l,o,a;const{snap:t}=jt(Rt);if(!t)return c`<p class="empty-state">Loading...</p>`;const e=t.tools.filter(r=>r.live).sort((r,i)=>{var d,f,p,m;return(((d=i.live)==null?void 0:d.outbound_rate_bps)||0)+(((f=i.live)==null?void 0:f.inbound_rate_bps)||0)-((((p=r.live)==null?void 0:p.outbound_rate_bps)||0)+(((m=r.live)==null?void 0:m.inbound_rate_bps)||0))}),s=Object.entries(t.live_monitor&&t.live_monitor.diagnostics||{});return c`<div class="live-stack">
    ${s.length>0&&c`<div class="diag-card">
      <h3>Collector Health</h3>
      <table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${s.map(([r,i])=>c`<tr key=${r}>
          <td class="mono">${r}</td>
          <td>${V(i.status||"unknown")}</td>
          <td>${V(i.mode||"unknown")}</td>
          <td>${V(i.detail||"")}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      ${e.length?c`<table role="table" aria-label="Live tool sessions">
        <thead><tr><th>Tool</th><th>Sessions</th><th>Traffic</th><th>Tokens</th><th>MCP</th><th>Files</th><th>CPU</th><th>Workspace</th><th>State</th></tr></thead>
        <tbody>${e.map(r=>{const i=r.live||{},d=i.token_estimate||{},f=i.mcp||{};return c`<tr key=${r.tool}>
            <td>${V(r.label)}</td>
            <td>${i.session_count||0} sess / ${i.pid_count||0} pid</td>
            <td>\u2191 ${je(i.outbound_rate_bps||0)}<br/>\u2193 ${je(i.inbound_rate_bps||0)}</td>
            <td>${z(Uo(i))}<br/><span class="text-muted">${V(d.source||"network-inference")} @ ${_t((d.confidence||0)*100)}</span></td>
            <td>${f.detected?"YES":"NO"}<br/><span class="text-muted">${f.loops||0} loops @ ${_t((f.confidence||0)*100)}</span></td>
            <td>${i.files_touched||0} touched<br/><span class="text-muted">${i.file_events||0} events</span></td>
            <td>${_t(i.cpu_percent||0)}<br/><span class="text-muted">peak ${_t(i.peak_cpu_percent||0)}</span></td>
            <td>${$t((i.workspace_size_mb||0)*1048576)}<br/><span class="mono text-muted text-xs">${V((i.workspaces||[]).slice(0,2).join(" | ")||"(unknown)")}</span></td>
            <td>${(i.state_bytes_written||0)>0?$t(i.state_bytes_written||0):"—"}</td>
          </tr>
          ${(i.processes||[]).length>0&&c`<tr key=${r.tool+"-procs"}>
            <td colspan="9" style="padding:var(--sp-1) var(--sp-5);background:var(--bg)">
              <details style="font-size:var(--fs-base)">
                <summary class="cursor-ptr text-muted">${i.processes.length} processes</summary>
                <div class="text-mono" style="margin-top:var(--sp-1);font-size:var(--fs-base)">
                  ${i.processes.sort((p,m)=>(m.cpu_pct||0)-(p.cpu_pct||0)).map(p=>c`<div key=${p.pid} style="display:flex;gap:var(--sp-5);padding:var(--sp-1) 0">
                      <span class="text-muted" style="min-width:5ch">${p.pid}</span>
                      <span class="flex-1 text-ellipsis">${p.name}</span>
                      <span class="text-right" style="color:${p.cpu_pct>5?"var(--orange)":"var(--fg2)"};min-width:5ch">${p.cpu_pct}%</span>
                      <span class="text-right" style="min-width:6ch">${p.mem_mb?$t(p.mem_mb*1048576):""}</span>
                    </div>`)}
                </div>
              </details>
            </td>
          </tr>`}`})}</tbody>
      </table>`:c`<p class="empty-state">No active AI-tool sessions detected yet.</p>`}
    </div>

    <div class="diag-card">
      <h3>Monitor Roots</h3>
      <div class="stack-list">
        ${(((n=t.live_monitor)==null?void 0:n.workspace_paths)||[]).map(r=>c`<span class="pill mono" key=${"ws-"+r}>workspace: ${r}</span>`)}
        ${(((l=t.live_monitor)==null?void 0:l.state_paths)||[]).map(r=>c`<span class="pill mono" key=${"state-"+r}>state: ${r}</span>`)}
        ${!(((o=t.live_monitor)==null?void 0:o.workspace_paths)||[]).length&&!(((a=t.live_monitor)==null?void 0:a.state_paths)||[]).length&&c`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`}function iv(){var E,C,b,$;const{snap:t,globalRange:e}=jt(Rt),[s,n]=R(null),[l,o]=R([]),[a,r]=R(null),i=at(()=>t?t.tools.filter(k=>!k.meta&&(k.files.length||k.processes.length||k.live)).sort((k,S)=>k.label.localeCompare(S.label)):[],[t]);if(lt(()=>{!s&&i.length&&n(i[0].tool)},[i,s]),lt(()=>{!s||!e||qo({tool:s,since:e.since,limit:500,until:e.until}).then(o).catch(()=>o([]))},[s,e]),lt(()=>{!s||!e||Pn({since:e.since,tool:s,until:e.until}).then(k=>{var S;return r(((S=k==null?void 0:k.by_tool)==null?void 0:S[s])||null)}).catch(()=>r(null))},[s,e]),!t)return c`<p class="loading-state">Loading...</p>`;const d=i.find(k=>k.tool===s),f=(E=t.tool_telemetry)==null?void 0:E.find(k=>k.tool===s),p=d==null?void 0:d.live,m=Dt[s]||"var(--fg2)",g={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},x=e.until!=null?new Date(e.since*1e3).toLocaleString(void 0,g)+" – "+new Date(e.until*1e3).toLocaleString(void 0,g):"";return c`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${i.map(k=>c`<button key=${k.tool}
        class=${s===k.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>n(k.tool)}>
        <span style="color:${Dt[k.tool]||"var(--fg2)"}">${me[k.tool]||"🔹"}</span>
        ${k.label}
        ${k.live?c`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${s&&c`<Fragment>
        <h3 class="flex-row mb-sm gap-sm">
          <span style="color:${m}">${me[s]||"🔹"}</span>
          ${(d==null?void 0:d.label)||s}
          ${d!=null&&d.vendor?c`<span class="badge">${Or[d.vendor]||d.vendor}</span>`:""}
          ${f!=null&&f.model?c`<span class="badge mono">${f.model}</span>`:""}
        </h3>

        ${a&&((C=a.ts)==null?void 0:C.length)>=2?c`<div class="es-section">
          <div class="es-section-title">Time Series${x?c` <span class="badge">${x}</span>`:""}</div>
          <div class="es-charts">
            <${es} label="CPU %" value=${((b=d==null?void 0:d.live)==null?void 0:b.cpu_percent)!=null?_t(d.live.cpu_percent||0):"-"}
              data=${[a.ts,a.cpu]} chartColor=${m} smooth />
            <${es} label="Memory (MB)" value=${(($=d==null?void 0:d.live)==null?void 0:$.mem_mb)!=null?$t((d.live.mem_mb||0)*1048576):"-"}
              data=${[a.ts,a.mem_mb]} chartColor="var(--green)" smooth />
            <${es} label="Context (tok)" value=${Gt(a.tokens[a.tokens.length-1]||0)}
              data=${[a.ts,a.tokens]} chartColor="var(--accent)" />
            <${es} label="Network (B/s)"
              value=${je(p?(p.outbound_rate_bps||0)+(p.inbound_rate_bps||0):a.traffic[a.traffic.length-1]||0)}
              valColor=${p?"var(--orange)":void 0}
              data=${[a.ts,a.traffic]} chartColor="var(--orange)" />
          </div>
        </div>`:c`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="loading-state">No data for this range.</p>
        </div>`}

        ${f?c`<div class="es-section">
          <div class="es-section-title">Telemetry
            <span class="badge" style="margin-left:var(--sp-3)">${f.source}</span>
            <span class="badge">${_t(f.confidence*100)}</span>
          </div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${Gt(f.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${Gt(f.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${Gt(f.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${Gt(f.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${z(f.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${z(f.total_messages||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cost</div><div class="value">${f.cost_usd?"$"+f.cost_usd.toFixed(2):"-"}</div></div>
          </div>
          ${Object.keys(f.by_model||{}).length>0&&c`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(f.by_model).map(([k,S])=>c`<div key=${k}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${k}</span>
              <span>in: ${Gt(S.input||S.input_tokens||0)} tok \u00B7 out: ${Gt(S.output||S.output_tokens||0)} tok${S.cache_read_tokens?" · cR:"+Gt(S.cache_read_tokens):""}${S.cache_creation_tokens?" · cW:"+Gt(S.cache_creation_tokens):""}${S.cost_usd?" · $"+S.cost_usd.toFixed(2):""}</span>
            </div>`)}
          </div>`}
        </div>`:""}

        ${p?c`<div class="es-section">
          <div class="es-section-title">Live Monitor</div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${p.session_count||0}</div></div>
            <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${p.pid_count||0}</div></div>
            <div class="es-kv-card"><div class="label">CPU</div><div class="value">${_t(p.cpu_percent||0)}</div></div>
            <div class="es-kv-card"><div class="label">Memory</div><div class="value">${$t((p.mem_mb||0)*1048576)}</div></div>
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${je(p.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${je(p.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">Events (${l.length})</div>
          ${l.length?c`<div class="es-feed">
            ${l.map((k,S)=>{const N=Qd[k.kind]||"var(--fg2)",A=new Date(k.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),M=k.detail?Object.entries(k.detail).map(([F,y])=>F+"="+y).join(", "):"";return c`<div key=${k.ts+"-"+k.tool+"-"+S} class="es-event">
                <span class="es-event-time">${A}</span>
                <span class="es-event-kind" style="color:${N}">${k.kind}</span>
                <span class="es-event-detail" title=${M}>${M||"-"}</span>
              </div>`})}
          </div>`:c`<p class="empty-state">No events for this tool in the selected range.</p>`}
        </div>
      </Fragment>`}
    </div>
  </div>`}const Xs=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"],Yi={"claude-opus-4-6":1e6,"claude-opus-4-5":1e6,"claude-sonnet-4-6":1e6,"claude-sonnet-4-5":1e6,"claude-sonnet-4":2e5,"claude-haiku-4-5":2e5,"claude-3-5-sonnet":2e5,"gpt-4.1":1e6,"gpt-4.1-mini":1e6,"gpt-4o":128e3,"gpt-4o-mini":128e3,o3:2e5,"o4-mini":2e5,"gemini-2.5-pro":1e6,"gemini-2.5-flash":1e6};function Ki({always:t,onDemand:e,conditional:s,never:n,total:l}){if(!l)return null;const o=a=>(a/l*100).toFixed(1)+"%";return c`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${t>0&&c`<div style="width:${o(t)};height:100%;background:var(--green)" title="Always loaded: ${z(t)}"></div>`}
    ${e>0&&c`<div style="width:${o(e)};height:100%;background:var(--yellow)" title="On-demand: ${z(e)}"></div>`}
    ${s>0&&c`<div style="width:${o(s)};height:100%;background:var(--orange)" title="Conditional: ${z(s)}"></div>`}
    ${n>0&&c`<div style="width:${o(n)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${z(n)}"></div>`}
  </div>`}function rv(){const{snap:t,history:e,enabledTools:s}=jt(Rt),[n,l]=R(null),[o,a]=R(!1);if(lt(()=>{l(null),a(!1),Rd().then(l).catch(()=>a(!0))},[]),o)return c`<p class="error-state">Failed to load budget.</p>`;if(!n)return c`<p class="loading-state">Loading...</p>`;const r=y=>s===null||s.includes(y),i=at(()=>{const y=(t==null?void 0:t.tool_configs)||[];for(const T of["claude-code","copilot","copilot-vscode"]){const O=y.find(P=>P.tool===T&&P.model);if(O)return O.model}for(const T of y)if(T.model&&Yi[T.model])return T.model;return""},[t]),d=Yi[i]||2e5,f=n.always_loaded_tokens||0,p=n.total_potential_tokens||0,m=f/d*100,g=p/d*100,x=at(()=>{if(!t)return{};const y={};return t.tools.forEach(T=>{T.tool==="aictl"||!T.token_breakdown||!T.token_breakdown.total||(y[T.tool]=T.token_breakdown)}),y},[t]),E=at(()=>t!=null&&t.tool_telemetry?t.tool_telemetry.filter(y=>r(y.tool)):[],[t,s]),C=at(()=>{if(!t)return[];const y={};return t.tools.forEach(T=>{T.tool==="aictl"||!r(T.tool)||(T.files||[]).forEach(O=>{const P=O.kind||"other";y[P]||(y[P]={kind:P,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),y[P].count++,y[P].tokens+=O.tokens,y[P].size+=O.size;const D=(O.sent_to_llm||"").toLowerCase();D==="yes"?y[P].always+=O.tokens:D==="on-demand"?y[P].onDemand+=O.tokens:D==="conditional"||D==="partial"?y[P].conditional+=O.tokens:y[P].never+=O.tokens})}),Object.values(y).sort((T,O)=>O.tokens-T.tokens)},[t,s]),b=at(()=>{if(!(t!=null&&t.tool_telemetry))return null;const y={},T={};t.tool_telemetry.filter(W=>r(W.tool)).forEach(W=>{(W.daily||[]).forEach(et=>{if(et.date&&(y[et.date]||(y[et.date]={}),T[et.date]||(T[et.date]={}),et.tokens_by_model&&Object.entries(et.tokens_by_model).forEach(([st,K])=>{y[et.date][st]=(y[et.date][st]||0)+K}),et.model)){const st=et.model,K=(et.input_tokens||0)+(et.output_tokens||0);y[et.date][st]=(y[et.date][st]||0)+K,T[et.date][st]||(T[et.date][st]={input:0,output:0,cache_read:0,cache_creation:0}),T[et.date][st].input+=et.input_tokens||0,T[et.date][st].output+=et.output_tokens||0,T[et.date][st].cache_read+=et.cache_read_tokens||0,T[et.date][st].cache_creation+=et.cache_creation_tokens||0}})});const O=new Date,P=[];for(let W=6;W>=0;W--){const et=new Date(O);et.setDate(et.getDate()-W),P.push(et.toISOString().slice(0,10))}const D=P.filter(W=>y[W]&&Object.values(y[W]).some(et=>et>0));if(!D.length)return null;const q=[...new Set(D.flatMap(W=>Object.keys(y[W]||{})))],H=Math.max(...D.map(W=>q.reduce((et,st)=>et+((y[W]||{})[st]||0),0)),1),U=D.some(W=>Object.keys(T[W]||{}).length>0);return{dates:D,models:q,byDate:y,byDateModel:T,maxTotal:H,hasDetail:U}},[t,s]),$=e&&e.ts&&e.ts.length>=2?[e.ts,e.live_tokens||e.ts.map(()=>0)]:null,k=E.reduce((y,T)=>y+(T.input_tokens||0),0),S=E.reduce((y,T)=>y+(T.output_tokens||0),0),N=E.reduce((y,T)=>y+(T.cache_read_tokens||0),0),A=E.reduce((y,T)=>y+(T.cache_creation_tokens||0),0),M=E.reduce((y,T)=>y+(T.total_sessions||0),0),F=E.reduce((y,T)=>y+(T.cost_usd||0),0);return c`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${$?c`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${Oc} data=${$} color="var(--green)" height=${60}/>
        <div class="text-muted" style="font-size:var(--fs-base);margin-top:var(--sp-2)">
          Current: ${z((t==null?void 0:t.total_live_estimated_tokens)||0)} estimated tokens
        </div>
      </div>`:c`<div></div>`}
      <div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Context Window${i?c` <span class="badge">${i}</span>`:""}</h3>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Always loaded: ${z(f)} of ${z(d)}</span>
            <span class="text-bolder" style="color:${m>80?"var(--orange)":m>50?"var(--yellow)":"var(--green)"}">${_t(m)}</span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:4px;background:var(--border)">
            <div style="height:100%;width:${Math.min(m,100).toFixed(1)}%;background:var(--green);border-radius:4px"></div>
          </div>
        </div>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Max potential: ${z(p)}</span>
            <span class="text-bolder" style="color:${g>100?"var(--red)":"var(--fg2)"}">${_t(g)}${g>100?" ⚠":""}</span>
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
        ${(n.project_count||0)>1?c`<div class="text-muted" style="font-size:var(--fs-xs);margin-top:var(--sp-2);border-top:1px solid var(--border);padding-top:var(--sp-1)">
          Estimate for largest project (${n.largest_project||"?"}): ${z(n.largest_project_tokens||0)} + ${z(n.global_tokens||0)} global.
          ${(n.raw_total_all_projects||0)>(n.total_potential_tokens||0)?c` Raw total across all ${n.project_count} projects: ${z(n.raw_total_all_projects)}.`:null}
        </div>`:null}
      </div>
    </div>

    <!-- Daily token usage -->
    ${b&&c`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">Daily Token Usage (last 7 days)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-6);font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        ${b.models.map((y,T)=>c`<span key=${y}>
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${Xs[T%Xs.length]};margin-right:3px"></span>${y}
        </span>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
        ${b.dates.map(y=>{const T=b.models.reduce((P,D)=>P+((b.byDate[y]||{})[D]||0),0),O=new Date(y+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return c`<div key=${y} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${O}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${y}: ${z(T)} tokens">
              ${b.models.map((P,D)=>{const q=(b.byDate[y]||{})[P]||0;return q?c`<div key=${P} style="width:${(q/b.maxTotal*100).toFixed(1)}%;height:100%;background:${Xs[D%Xs.length]}" title="${P}: ${z(q)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${z(T)}</span>
          </div>`})}
      </div>
      ${b.hasDetail&&c`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${b.dates.flatMap(y=>{const T=new Date(y+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),O=b.byDateModel[y]||{},P=Object.keys(O).sort();return P.length?P.map((D,q)=>{const H=O[D];return c`<tr key=${y+"-"+D}>
                <td>${q===0?T:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${Xs[b.models.indexOf(D)%Xs.length]};margin-right:3px"></span>${D}</td>
                <td>${z(H.input)}</td><td>${z(H.output)}</td>
                <td class="text-muted">${z(H.cache_read)}</td>
                <td class="text-muted">${z(H.cache_creation)}</td>
                <td class="text-bold">${z(H.input+H.output)}</td>
              </tr>`}):[]})}</tbody>
        </table>
      </details>`}
    </div>`}

    <!-- Verified token usage (main table) -->
    ${E.length>0&&c`<div class="budget-card mb-md">
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
          <tbody>${E.map(y=>{const T=x[y.tool];return c`<tr key=${y.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(Dt[y.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${V(y.tool)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${y.source}</span> <span class="text-muted">${_t(y.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${z(y.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${z(y.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(y.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(y.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${z(y.total_sessions||0)}</td>
              <td style="text-align:right">${y.cost_usd>0?"$"+y.cost_usd.toFixed(2):"—"}</td>
              <td>${T?c`<${Ki} always=${T.always_loaded||0} onDemand=${T.on_demand||0}
                conditional=${T.conditional||0} never=${T.never_sent||0} total=${T.total||1}/>`:null}</td>
            </tr>`})}
          ${E.length>1&&c`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${z(k)}</td>
            <td style="text-align:right">${z(S)}</td>
            <td style="text-align:right" class="text-muted">${z(N)}</td>
            <td style="text-align:right" class="text-muted">${z(A)}</td>
            <td style="text-align:right">${z(M)}</td>
            <td style="text-align:right">${F>0?"$"+F.toFixed(2):"—"}</td>
            <td></td>
          </tr>`}</tbody>
        </table>
      </div>
    </div>`}

    <!-- By category -->
    ${C.length>0&&c`<div class="budget-card budget-full">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">By Category</h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Per-category tokens" style="width:100%">
          <thead><tr><th>Category</th><th style="text-align:right">Files</th><th style="text-align:right">Tokens</th><th style="text-align:right">Size</th><th style="width:120px">Distribution</th></tr></thead>
          <tbody>${C.map(y=>c`<tr key=${y.kind}>
            <td>${V(y.kind)}</td>
            <td style="text-align:right">${y.count}</td>
            <td style="text-align:right" class="text-bold">${z(y.tokens)}</td>
            <td style="text-align:right">${$t(y.size)}</td>
            <td><${Ki} always=${y.always} onDemand=${y.onDemand} conditional=${y.conditional} never=${y.never} total=${y.tokens||1}/></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>`}
  </div>`}function cv(t){if(t==null||isNaN(t))return"—";const e=Math.round(t);if(e<60)return e+"s";const s=Math.floor(e/60),n=e%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const Zn={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function Ji({agent:t,tasks:e,now:s}){const n=Zn[t.state]||Zn.active,l=t.ended_at?t.ended_at-t.started_at:s-t.started_at,o=e.filter(a=>a.agent_id===t.agent_id);return c`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${n.bg};color:var(--bg)">${n.label}</span>
      <strong class="text-sm">${V(t.agent_id)}</strong>
      <span class="text-muted text-xs">${cv(l)}</span>
      ${t.task&&c`<span class="text-xs mono text-muted">\u2014 ${V(t.task)}</span>`}
    </div>
    ${o.length>0&&c`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${o.map(a=>{const r=Zn[a.state]||Zn.pending;return c`<div key=${a.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${r.bg};color:var(--bg);font-size:var(--fs-xs);padding:1px 4px">${r.label}</span>
          <span class="mono">${V(a.name||a.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function dv({entityState:t}){if(!t||!t.agents||!t.agents.length)return null;const e=t.agents,s=t.tasks||[],n=Date.now()/1e3,l=e.filter(a=>a.state==="active"),o=e.filter(a=>a.state!=="active");return c`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${e.length} agent${e.length>1?"s":""}</span>
      ${l.length>0&&c`<span class="badge text-xs" style="background:var(--green);color:var(--bg)">${l.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${l.map(a=>c`<${Ji} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
      ${o.map(a=>c`<${Ji} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
    </div>
  </div>`}function uv({tasks:t}){if(!t||!t.length)return null;const e=t.filter(o=>o.state==="pending"),s=t.filter(o=>o.state==="active"),n=t.filter(o=>o.state==="done");function l({title:o,items:a,color:r}){return c`<div class="tt-column">
      <div class="tt-column-head" style="border-bottom:2px solid ${r}">
        <strong class="text-sm">${o}</strong>
        <span class="text-muted text-xs">${a.length}</span>
      </div>
      <div class="tt-column-body">
        ${a.length?a.map(i=>c`<div key=${i.task_id} class="tt-task-card">
              <div class="text-sm" style="font-weight:500">${V(i.name||i.task_id)}</div>
              ${i.agent_id&&c`<div class="text-xs text-muted">Agent: ${V(i.agent_id)}</div>`}
            </div>`):c`<p class="text-muted text-xs" style="padding:var(--sp-3)">None</p>`}
      </div>
    </div>`}return c`<div class="tt-board">
    <${l} title="Pending" items=${e} color="var(--fg3)"/>
    <${l} title="Active" items=${s} color="var(--accent)"/>
    <${l} title="Done" items=${n} color="var(--green)"/>
  </div>`}function Je({title:t,icon:e,badge:s,defaultOpen:n,children:l}){const[o,a]=R(n||!1);return c`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>a(r=>!r)}
      aria-expanded=${o}>
      <span class="sd-panel-icon">${e}</span>
      <span class="sd-panel-title">${t}</span>
      ${s!=null&&c`<span class="badge text-xs" style="margin-left:var(--sp-2)">${s}</span>`}
      <span class="sd-panel-arrow">${o?"▲":"▼"}</span>
    </button>
    ${o&&c`<div class="sd-panel-body">${l}</div>`}
  </div>`}const pv={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)"};function fv({sessionId:t}){const[e,s]=R([]),[n,l]=R(!0);return lt(()=>{if(!t)return;l(!0);const o=Math.floor(Date.now()/1e3)-86400;qo({sessionId:t,limit:200,since:o}).then(a=>{s(a.reverse()),l(!1)}).catch(()=>l(!1))},[t]),n?c`<p class="loading-state">Loading events...</p>`:e.length?c`<div class="sd-events">
    ${e.map((o,a)=>{const r=pv[o.kind]||"var(--fg3)",i=o.detail||{},d=i.path||i.name||i.tool_name||o.kind;return c`<div key=${a} class="sd-event-row">
        <span class="sd-event-time">${Be(o.ts)}</span>
        <span class="sd-event-dot" style="background:${r}"></span>
        <span class="sd-event-kind">${o.kind}</span>
        <span class="sd-event-desc mono text-muted">${V(String(d))}</span>
      </div>`})}
  </div>`:c`<p class="empty-state">No events recorded for this session.</p>`}function ol(t){if(t==null||isNaN(t))return"—";const e=Math.round(t);if(e<60)return e+"s";const s=Math.floor(e/60),n=e%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const vv={"claude-opus-4-6":1e6,"claude-sonnet-4.6":1e6,"claude-sonnet-4":2e5,"claude-haiku-4.5":2e5,"gpt-5.4":2e5,"gpt-5":128e3},Zi=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],mv=95;function hv({session:t}){const{snap:e}=jt(Rt),s=t.files_loaded||[],n=((e==null?void 0:e.tool_configs)||[]).map(g=>g.model).filter(Boolean)[0]||"",l=vv[n]||2e5,a=(e&&e.agent_memory||[]).reduce((g,x)=>g+(x.tokens||0),0),r=s.length*150,d=Zi.reduce((g,x)=>g+x.tokens,0)+a+r,f=Math.min(d/l*100,100),p=mv,m=[...Zi,{name:"Memory",tokens:a,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:r,color:"var(--green)"}].filter(g=>g.tokens>0);return c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${z(d)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${z(l)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${f>80?"var(--orange)":f>50?"var(--yellow)":"var(--green)"}">${_t(f)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${m.map(g=>{const x=(g.tokens/l*100).toFixed(1);return c`<div key=${g.name} style="width:${x}%;background:${g.color};min-width:${g.tokens>0?"1px":"0"}"
              title="${g.name}: ~${z(g.tokens)} tokens"></div>`})}
        </div>
        <div style="position:absolute;left:${p}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${p}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${m.map(g=>c`<span key=${g.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${g.color};margin-right:2px"></span>
          ${g.name} ${z(g.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${p}%</span>
      </div>
    </div>

    ${s.length>0&&c`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${s.map(g=>c`<div key=${g} class="text-muted" style="padding:2px 0">${V(g)}</div>`)}
    </div>`}
    ${!s.length&&c`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function gv({mem:t}){const[e,s]=R(!1),n=t.name||(t.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",l=(t.content||"").slice(0,300);return c`<div class="sd-memory-entry" style="cursor:pointer" onClick=${()=>s(!e)}>
    <div class="flex-row gap-sm" style="align-items:center">
      <span class="badge text-xs">${t.type||t.source||"file"}</span>
      <strong title=${t.file||t.path||""}>${V(n)}</strong>
      ${t.tokens?c`<span class="text-muted">${z(t.tokens)} tok</span>`:null}
      ${t.lines?c`<span class="text-muted">${t.lines}ln</span>`:null}
      ${t.profile?c`<span class="text-muted">${V(t.profile)}</span>`:null}
      <span class="text-muted" style="margin-left:auto;font-size:var(--fs-2xs)">${e?"▲":"▼"}</span>
    </div>
    ${e&&l?c`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${V(t.content)}${t.content&&t.content.length>300,""}</pre>`:null}
  </div>`}function $v({session:t}){const{snap:e}=jt(Rt),s=e&&e.agent_memory||[],n=t.project||"",l=n?s.filter(o=>{const a=o.project||o.tool||"";return!n||a.includes(n.replace(/\\/g,"/").split("/").pop())}):s;return l.length?c`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${l.map((o,a)=>c`<${gv} key=${a} mem=${o}/>`)}
  </div>`:c`<p class="empty-state">No memory entries found${n?" for this project":""}.</p>`}function _v({rateLimits:t}){return!t||!Object.keys(t).length?null:c`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(t).map(([e,s])=>{const n=s.used_pct||s.used_percentage||0,l=n>80?"var(--red)":n>60?"var(--orange)":"var(--green)",o=s.resets_at||"";return c`<div key=${e} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${e} window</span>
            <span style="color:${l};font-weight:600">${_t(n)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(n,100)}%;background:${l};border-radius:4px"></div>
          </div>
          ${o&&c`<div class="text-xs text-muted" style="margin-top:2px">resets ${o}</div>`}
        </div>`})}
    </div>
  </div>`}function yv({session:t}){const e=t.exact_input_tokens||0,s=t.exact_output_tokens||0,[n,l]=R(null);lt(()=>{t.tool&&Lr({tool:t.tool,active:!1,limit:20}).then(r=>{if(r.length>1){const i=r.filter(f=>f.duration_s>0).map(f=>f.duration_s),d=i.length?i.reduce((f,p)=>f+p,0)/i.length:0;l({avgDuration:d,sampleCount:r.length})}}).catch(()=>{})},[t.tool]);const o=t.duration_s||0,a=n&&n.avgDuration>0?o/n.avgDuration:null;return c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${z(e)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${z(s)}</div></div>
      <div class="es-kv-card"><div class="label">Total Tokens</div><div class="value">${z(e+s)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${_t(t.cpu_percent||0)}</div></div>
      <div class="es-kv-card"><div class="label">Peak CPU</div><div class="value">${_t(t.peak_cpu_percent||0)}</div></div>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Inbound</div><div class="value">${$t(t.inbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">Outbound</div><div class="value">${$t(t.outbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">State Writes</div><div class="value">${$t(t.state_bytes_written||0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(t.pids)?t.pids.length:t.pids||0}</div></div>
    </div>
    ${a!=null&&c`<div class="text-xs text-muted" style="margin-top:var(--sp-3)">
      vs average (${n.sampleCount} sessions):
      duration ${a>1.2?c`<span class="text-orange">${a.toFixed(1)}x longer</span>`:a<.8?c`<span class="text-green">${(1/a).toFixed(1)}x shorter</span>`:c`<span>similar</span>`}
    </div>`}
    ${t.entity_state&&c`<${_v} rateLimits=${t.entity_state.rate_limits}/>`}
  </div>`}function bv({session:t}){const e=t.files_touched||[],s=t.file_events||0;return e.length?c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${e.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${z(s)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${e.map(n=>c`<div key=${n} class="text-muted" style="padding:2px 0">${V(n)}</div>`)}
    </div>
  </div>`:c`<p class="empty-state">No file changes recorded.</p>`}function kv({sessionId:t}){const[e,s]=R(null),[n,l]=R(!0);if(lt(()=>{l(!0);const r=Math.floor(Date.now()/1e3)-3600;Nd(r,100).then(i=>{s(i),l(!1)}).catch(()=>l(!1))},[t]),n)return c`<p class="loading-state">Loading API call data...</p>`;if(!e||!e.calls||!e.calls.length)return c`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;const{calls:o,summary:a}=e;return c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">API Calls</div><div class="value">${a.total_calls}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${a.total_errors>0?"var(--red)":"var(--fg)"}">${a.total_errors}</div>
      </div>
      <div class="es-kv-card"><div class="label">Avg Latency</div><div class="value">${a.avg_latency_ms}ms</div></div>
      <div class="es-kv-card"><div class="label">P95 Latency</div><div class="value">${a.p95_latency_ms}ms</div></div>
    </div>
    ${a.by_model&&Object.keys(a.by_model).length>0&&c`
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By model</div>
      <div class="flex-row gap-sm flex-wrap" style="margin-bottom:var(--sp-3)">
        ${Object.entries(a.by_model).map(([r,i])=>c`
          <span key=${r} class="badge text-xs">${r}: ${i}</span>
        `)}
      </div>
    `}
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${o.slice(0,30).map((r,i)=>{const d=r.status==="error",f=new Date(r.ts*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});return c`<div key=${i} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${f}</span>
          <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${d?"var(--red)":"var(--green)"}"></span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${r.model||"—"}</span>
          ${!d&&c`<span style="width:50px;flex-shrink:0;text-align:right">${r.duration_ms||0}ms</span>`}
          ${!d&&c`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${z(r.input_tokens||0)}in</span>`}
          ${d&&c`<span style="color:var(--red)">${V(r.error||"error")}</span>`}
        </div>`})}
    </div>
  </div>`}function xv({project:t}){const[e,s]=R(null);return lt(()=>{t&&Id(7).then(n=>{const l=n.find(o=>o.project===t);s(l||null)}).catch(()=>{})},[t]),e?c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${e.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${z(e.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${z(e.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value">$${e.cost_usd.toFixed(2)}</div></div>
    </div>
    ${e.daily&&e.daily.length>0&&c`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${e.daily.map(n=>{const l=n.input_tokens+n.output_tokens,o=Math.max(...e.daily.map(i=>i.input_tokens+i.output_tokens),1),a=(l/o*100).toFixed(1),r=new Date(n.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return c`<div key=${n.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${r}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${a}%;background:var(--green);border-radius:3px"
              title="${z(l)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${z(l)}</span>
        </div>`})}
    </div>`}
  </div>`:c`<p class="empty-state">No cost data available for this project.</p>`}function wv({project:t,tool:e}){const[s,n]=R(null);if(lt(()=>{!t||!e||Od(t,e,30,20).then(n).catch(()=>n([]))},[t,e]),!s||s.length<2)return c`<p class="empty-state">Not enough session history for trend analysis.</p>`;const l=Math.max(...s.map(r=>r.total_tokens),1),o=s.reduce((r,i)=>r+i.duration_s,0)/s.length,a=s.reduce((r,i)=>r+i.total_tokens,0)/s.length;return c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${ol(o)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${z(a)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${s.map(r=>{const i=(r.total_tokens/l*100).toFixed(1),d=new Date(r.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),f=o>0?r.duration_s/o:1;return c`<div key=${r.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${d}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${i}%;border-radius:3px;background:${f>1.5?"var(--orange)":f<.7?"var(--green)":"var(--accent)"}" title="${z(r.total_tokens)} tok, ${ol(r.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${z(r.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${ol(r.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function Sv({session:t,onClose:e}){const s=Dt[t.tool]||"var(--fg2)",n=t.files_loaded||[],l=t.files_touched||[],o=t.exact_input_tokens||0,a=t.exact_output_tokens||0,r=t.entity_state||null,i=r&&r.agents&&r.agents.length>0,d=r&&r.tasks&&r.tasks.length>0;return c`<div class="sd-container" style="border-left:3px solid ${s}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${V(t.tool)}</strong>
        ${t.project&&c`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${t.project}>${V(t.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">
          ${ol(t.duration_s)}
        </span>
        ${i&&c`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">
          Team (${r.agents.length})
        </span>`}
      </div>
      <div class="text-muted text-xs mono" style="margin-top:var(--sp-2)" title=${t.session_id}>
        ${t.session_id}
      </div>
      ${e&&c`<button class="sd-close" onClick=${e} aria-label="Close session detail">\u2715</button>`}
    </div>

    <${Je} title="Actions" icon="\u26A1" badge=${null} defaultOpen=${!0}>
      <${fv} sessionId=${t.session_id}/>
    <//>
    ${i&&c`<${Je} title="Team" icon="\uD83D\uDC65" badge=${r.agents.length+" agents"} defaultOpen=${!0}>
      <${dv} entityState=${r}/>
    <//>`}
    ${d&&c`<${Je} title="Tasks" icon="\uD83D\uDCCB" badge=${r.tasks.length} defaultOpen=${!0}>
      <${uv} tasks=${r.tasks}/>
    <//>`}
    <${Je} title="Context" icon="\uD83D\uDCDA" badge=${n.length||null}>
      <${hv} session=${t}/>
    <//>
    <${Je} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${!1}>
      <${$v} session=${t}/>
    <//>
    <${Je} title="Resources" icon="\u2699\uFE0F" badge=${z(o+a)+" tok"}>
      <${yv} session=${t}/>
    <//>
    <${Je} title="Deliverables" icon="\uD83D\uDCE6" badge=${l.length||null}>
      <${bv} session=${t}/>
    <//>
    <${Je} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${!1}>
      <${kv} sessionId=${t.session_id}/>
    <//>
    ${t.project&&c`<${Je} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${!1}>
      <${xv} project=${t.project}/>
    <//>`}
    ${t.project&&t.tool&&c`<${Je} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${!1}>
      <${wv} project=${t.project} tool=${t.tool}/>
    <//>`}
  </div>`}function Cv(t,e,s){const n=e-t,l=[300,600,900,1800,3600,7200,10800,21600,43200,86400];let o=l[l.length-1];for(const i of l)if(n/i<=s){o=i;break}const a=Math.ceil(t/o)*o,r=[];for(let i=a;i<=e;i+=o){const d=new Date(i*1e3);let f;o>=86400?f=d.toLocaleDateString([],{month:"short",day:"numeric"}):n>86400?f=d.toLocaleString([],{hourCycle:"h23",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):f=d.toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),r.push({ts:i,label:f})}return r}function Tv(t){return t>=3600?(t/3600).toFixed(1)+"h":t>=60?Math.round(t/60)+"m":Math.round(t)+"s"}function Qi(t,e,s,n){const l=t.duration_s||(t.ended_at||n)-t.started_at,o=new Date(t.started_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),a=t.ended_at?new Date(t.ended_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):"now",r=[Tv(l)];t.conversations&&r.push(t.conversations+" conv"),t.subagents&&r.push(t.subagents+" agents"),t.source_files?r.push(t.source_files+" src files"):t.unique_files&&r.push(t.unique_files+" files"),t.bytes_written>1024&&r.push($t(t.bytes_written));const i=!t.ended_at;return c`<div class="stl-tip">
    <div class="stl-tip-head">
      <span style=${"color:"+e}>${s}</span>
      <strong>${t.tool}</strong>
      ${i?c`<span class="badge" style="font-size:var(--fs-2xs);background:var(--green);color:#000">live</span>`:""}
    </div>
    <div class="stl-tip-time">${o} – ${a}</div>
    <div class="stl-tip-stats">${r.join(" · ")}</div>
    ${t.project?c`<div class="stl-tip-proj">${t.project.replace(/\\/g,"/").split("/").pop()}</div>`:""}
  </div>`}function Mv({sessions:t,rangeSeconds:e,onSelect:s}){const n=Date.now()/1e3,l=e||86400,o=n-l,a=(t||[]).filter(M=>(M.ended_at||n)>=o&&M.started_at<=n),r=a.filter(M=>M.ended_at).sort((M,F)=>M.started_at-F.started_at),i=a.filter(M=>!M.ended_at).sort((M,F)=>M.started_at-F.started_at),d=[],f=[];for(const M of r){const F=Math.max(M.started_at,o),y=M.ended_at;let T=-1;for(let O=0;O<d.length;O++)if(F>=d[O]+2){d[O]=y,T=O;break}T<0&&(T=d.length,d.push(y)),f.push(T)}const p=10,m=2,g=18,x=14,E=Math.max(d.length,0),C=E>0?E*(p+m)+m:0,b=i.length>0?x+m*2:0,$=C>0&&b>0?1:0,k=C+$+b,S=Math.max(k,20)+g,N=Cv(o,n,8),A=M=>(Math.max(M,o)-o)/l*100;return c`<div class="stl">
    <div class="stl-chart" style=${"height:"+S+"px"}>
      ${N.map(M=>c`<div key=${M.ts} class="stl-grid"
        style=${"left:"+A(M.ts).toFixed(2)+"%;bottom:"+g+"px"} />`)}

      <!-- ended session bars -->
      ${r.map((M,F)=>{const y=Math.max(M.started_at,o),T=A(y),O=Math.max(.15,A(M.ended_at)-T),P=f[F]*(p+m)+m,D=Dt[M.tool]||"var(--fg2)",q=me[M.tool]||"🔹";return c`<div key=${M.session_id} class="stl-bar"
          style=${"left:"+T.toFixed(2)+"%;width:"+O.toFixed(2)+"%;top:"+P+"px;height:"+p+"px;background:"+D}
          onClick=${()=>s&&s(M)}>
          ${Qi(M,D,q,n)}
        </div>`})}

      <!-- divider between ended and live -->
      ${$?c`<div class="stl-divider" style=${"top:"+C+"px"} />`:""}

      <!-- live session markers -->
      ${i.map(M=>{const F=A(M.started_at),y=C+$+m,T=Dt[M.tool]||"var(--fg2)",O=me[M.tool]||"🔹";return c`<div key=${M.session_id} class="stl-marker"
          style=${"left:"+F.toFixed(2)+"%;top:"+y+"px;background:"+T}
          onClick=${()=>s&&s(M)}>
          ${Qi(M,T,O,n)}
        </div>`})}

      <div class="stl-axis" style=${"top:"+(S-g)+"px"}>
        ${N.map(M=>c`<span key=${M.ts} class="stl-tick"
          style=${"left:"+A(M.ts).toFixed(2)+"%"}>${M.label}</span>`)}
      </div>
    </div>
  </div>`}function zo(t){if(t==null||isNaN(t))return"—";const e=Math.round(t);if(e<60)return e+"s";const s=Math.floor(e/60),n=e%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Pc(t){let e=0;for(const s of t)(s.role==="lead"||s.role==="teammate"||s.role==="subagent")&&e++,e+=Pc(s.children||[]);return e}function Xi({session:t,onSelect:e,isSelected:s,agentTeams:n}){const l=Dt[t.tool]||"var(--fg2)",o=me[t.tool]||"🔹",a=(n||[]).find(d=>d.session_id===t.session_id),r=a?a.agent_count:Pc(t.process_tree||[]),i=r>1;return c`<div class="diag-card" style="border-left:3px solid ${l};cursor:pointer;${s?"outline:2px solid var(--accent);outline-offset:-2px":""}"
    onClick=${()=>e(t)}>
    <div class="flex-row gap-sm mb-sm">
      <span style="font-size:var(--fs-2xl)">${o}</span>
      <strong style="font-size:var(--fs-lg)">${V(t.tool)}</strong>
      ${i&&c`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">Team (${r})</span>`}
      ${t.project&&c`<span class="text-muted text-xs mono text-ellipsis" style="max-width:150px"
        title=${t.project}>${V(t.project.replace(/\\/g,"/").split("/").pop())}</span>`}
      <span class="badge" style="margin-left:auto;background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Duration</div><div class="value">${zo(t.duration_s)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${_t(t.cpu_percent||0)}</div></div>
      <div class="es-kv-card"><div class="label">Input Tok</div><div class="value">${z(t.exact_input_tokens||0)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tok</div><div class="value">${z(t.exact_output_tokens||0)}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${z(t.file_events||0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(t.pids)?t.pids.length:t.pids||0}</div></div>
    </div>
    <div class="text-muted text-xs text-mono text-ellipsis" style="margin-top:var(--sp-3)"
      title=${t.session_id}>
      ${t.session_id}
    </div>
  </div>`}function Dv(){const{snap:t}=jt(Rt),e=t&&t.agent_teams||[];if(!e.length)return null;const s=e.reduce((o,a)=>o+a.agent_count,0),n=e.reduce((o,a)=>o+(a.total_input_tokens||0),0),l=e.reduce((o,a)=>o+(a.total_output_tokens||0),0);return c`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Agent Teams
      <span class="badge">${e.length} sessions</span>
      <span class="badge">${s} agents</span>
      <span class="badge">${z(n+l)} tok</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      ${e.sort((o,a)=>(a.total_input_tokens||0)-(o.total_input_tokens||0)).slice(0,8).map(o=>c`
        <${Lv} key=${o.session_id} team=${o}/>
      `)}
    </div>
  </div>`}function Ev(t){return t?t.replace("claude-","").replace("-20251001",""):"?"}function Lv({team:t}){const[e,s]=R(!1),[n,l]=R(t.agents||null),[o,a]=R(!1);t.models,lt(()=>{!e||n||(a(!0),Pd(t.session_id).then(p=>{l(p.agents||[]),a(!1)}).catch(()=>{l([]),a(!1)}))},[e]);const r=(n||[]).filter(p=>(p.input_tokens||0)+(p.output_tokens||0)>50),i=(n||[]).length-r.length,d=r.sort((p,m)=>m.input_tokens+m.output_tokens-(p.input_tokens+p.output_tokens)),f=d[0]?(d[0].input_tokens||0)+(d[0].output_tokens||0):1;return c`<div class="diag-card" style="border-left:3px solid var(--accent);padding:var(--sp-4)">
    <div class="flex-row gap-sm mb-sm" style="align-items:center;cursor:pointer" onClick=${()=>s(!e)}>
      <span class="badge" style="background:var(--accent);color:var(--bg)">${t.agent_count||r.length} agents${i?c` <span style="opacity:0.6">+${i}w</span>`:null}</span>
      <span class="text-muted text-xs">${z(t.total_input_tokens||0)}in / ${z(t.total_output_tokens||0)}out</span>
      ${(t.tools_used||[]).length>0&&c`<span class="text-muted text-xs">${t.tools_used.join(", ")}</span>`}
      <span class="mono text-xs text-muted" style="margin-left:auto" title=${t.session_id}>${t.session_id.slice(0,12)}\u2026</span>
      <span class="text-xs text-muted">${e?"▲":"▼"}</span>
    </div>
    <!-- Agent rows: show loading, or compact agent rows with task + tokens -->
    ${o?c`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading agents\u2026</div>`:c`<div style="display:flex;flex-direction:column;gap:1px">
      ${d.slice(0,e?999:5).map(p=>{const m=(p.input_tokens||0)+(p.output_tokens||0),g=Math.max(1,m/f*100);return c`<div key=${p.agent_id} style="display:grid;
          grid-template-columns:2px 1fr minmax(60px,auto) minmax(50px,auto) 14px;
          gap:var(--sp-2);align-items:center;padding:2px var(--sp-2);font-size:var(--fs-xs);
          background:var(--bg);border-radius:2px">
          <div style="width:2px;height:100%;background:${p.is_sidechain?"var(--yellow)":"var(--green)"}"></div>
          <div class="text-ellipsis" title=${p.task||p.slug||p.agent_id}
            style="color:${p.task?"var(--fg)":"var(--fg2)"}">${p.task||p.slug||p.agent_id.slice(0,10)}</div>
          <div style="display:flex;align-items:center;gap:var(--sp-1)">
            <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;min-width:30px">
              <div style="height:100%;width:${g}%;background:${p.is_sidechain?"var(--yellow)":"var(--green)"};border-radius:2px;opacity:0.7"></div>
            </div>
            <span class="text-muted" style="font-size:var(--fs-2xs);white-space:nowrap">${z(m)}</span>
          </div>
          <span class="text-muted" style="font-size:var(--fs-2xs)">${Ev(p.model)}</span>
          ${p.completed?c`<span class="text-green">\u2713</span>`:c`<span class="text-orange">\u25CB</span>`}
        </div>`})}
      ${!e&&d.length>5?c`<div class="text-muted text-xs cursor-ptr" style="padding:2px var(--sp-2)"
        onClick=${p=>{p.stopPropagation(),s(!0)}}>+${d.length-5} more agents\u2026</div>`:null}
    </div>`}
  </div>`}function Av(){const{snap:t,globalRange:e,rangeSeconds:s,enabledTools:n}=jt(Rt),[l,o]=R([]),[a,r]=R(!1),[i,d]=R(!0),[f,p]=R(null),[m,g]=R(null),[x,E]=R([]);lt(()=>{d(!0),r(!1),Lr({active:!1}).then(y=>{o(y),d(!1)}).catch(()=>{r(!0),d(!1)})},[]),lt(()=>{if(!e)return;const y=Math.min(e.since,Date.now()/1e3-86400);bl(null,{since:y,until:e.until}).then(E).catch(()=>E([]))},[e]),lt(()=>{const y=T=>{const O=T.detail;O&&O.session_id&&(p(O.session_id),g(O))};return window.addEventListener("aictl-session-select",y),()=>window.removeEventListener("aictl-session-select",y)},[]);const C=y=>n===null||n.includes(y),b=(t&&t.sessions||[]).filter(y=>C(y.tool)),$=l.filter(y=>C(y.tool)),k=x.filter(y=>C(y.tool));let S=b.find(y=>y.session_id===f);if(!S&&f){const T=l.find(O=>O.session_id===f)||m;T&&T.session_id===f&&(S={session_id:T.session_id,tool:T.tool,project:T.project||"",duration_s:T.duration_s||0,active:T.active||!1,started_at:T.started_at,ended_at:T.ended_at,files_touched:[],files_loaded:[],exact_input_tokens:T.input_tokens||0,exact_output_tokens:T.output_tokens||0,pids:[],file_events:T.files_modified||0})}const N=y=>{p(T=>T===y.session_id?null:y.session_id)},A={};for(const y of b){const T=y.project||"Unknown Project";A[T]||(A[T]=[]),A[T].push(y)}const M=Object.keys(A).sort();return c`<div>
    <div class="mb-lg">
      <${Mv} sessions=${k} rangeSeconds=${s}
        onSelect=${y=>{p(y.session_id),g(y)}}/>
    </div>

    <${Dv}/>

    ${S&&c`<${Sv} session=${S}
      onClose=${()=>p(null)}/>`}

    <div class="es-section">
      <div class="es-section-title">Active Sessions (${b.length})</div>
      ${b.length?M.length>1?M.map(y=>c`<div key=${y} style="margin-bottom:var(--sp-5)">
              <div class="text-muted text-sm mono" style="margin-bottom:var(--sp-3);font-weight:600">
                ${V(y.replace(/\\/g,"/").split("/").pop()||y)}
                <span class="text-xs" style="font-weight:400"> \u2014 ${A[y].length} session${A[y].length>1?"s":""}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
                ${A[y].map(T=>c`<${Xi} key=${T.session_id} session=${T}
                  onSelect=${N} isSelected=${T.session_id===f} agentTeams=${t==null?void 0:t.agent_teams}/>`)}
              </div>
            </div>`):c`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
              ${b.map(y=>c`<${Xi} key=${y.session_id} session=${y}
                onSelect=${N} isSelected=${y.session_id===f}/>`)}
            </div>`:c`<div class="empty-state">
            <p>No active sessions.</p>
            ${$.length>0&&c`<div class="diag-card" style="margin-top:var(--sp-4);max-width:400px">
              <div class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Last session</div>
              <div class="flex-row gap-sm" style="align-items:center">
                <span style="color:${Dt[$[0].tool]||"var(--fg2)"}">${me[$[0].tool]||"🔹"}</span>
                <strong>${V($[0].tool)}</strong>
                <span class="text-muted text-xs">${zo($[0].duration_s)}</span>
                ${$[0].ended_at&&c`<span class="text-muted text-xs">${Be($[0].ended_at)}</span>`}
              </div>
            </div>`}
          </div>`}
    </div>

    <div class="es-section" style="margin-top:var(--sp-8)">
      <div class="es-section-title">Session History</div>
      ${i?c`<p class="loading-state">Loading...</p>`:a?c`<p class="error-state">Failed to load session history.</p>`:$.length?c`<table role="table" aria-label="Session history" class="text-sm">
                <thead><tr>
                  <th>Tool</th>
                  <th>Session ID</th>
                  <th>PID</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr></thead>
                <tbody>${$.map(y=>{const T=Dt[y.tool]||"var(--fg2)",O=me[y.tool]||"🔹",P=y.session_id?y.session_id.length>12?y.session_id.slice(0,12)+"…":y.session_id:"—";return c`<tr key=${y.session_id} style="cursor:pointer;${y.session_id===f?"background:var(--bg2)":""}"
                    onClick=${()=>{p(y.session_id===f?null:y.session_id),g(null)}}>
                    <td>
                      <span style="color:${T};margin-right:var(--sp-2)">${O}</span>
                      ${V(y.tool)}
                    </td>
                    <td><span class="mono" title=${y.session_id} style="font-size:var(--fs-base)">${P}</span></td>
                    <td><span class="mono" style="font-size:var(--fs-base)">${y.pid||"—"}</span></td>
                    <td>${zo(y.duration_s)}</td>
                    <td>${y.active?c`<span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>`:c`<span class="badge" style="font-size:var(--fs-xs)">ended</span>`}</td>
                    <td>${y.ended_at?Be(y.ended_at):"—"}</td>
                  </tr>`})}</tbody>
              </table>`:c`<p class="empty-state">No past sessions recorded.</p>`}
    </div>
  </div>`}function tr(t,e){if(typeof document>"u")return`rgba(100,100,100,${e})`;const s=document.createElement("span");s.style.color=t,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${e})`:`rgba(100,100,100,${e})`}function Ov(t,e,s){let n;return{hooks:{init(l){n=document.createElement("div"),n.className="chart-tooltip",n.style.display="none",l.over.appendChild(n)},setCursor(l){var f;const o=l.cursor.idx;if(o==null){n.style.display="none";return}const a=[];for(let p=1;p<l.series.length;p++){const m=(f=l.data[p])==null?void 0:f[o];m!=null&&a.push(e?e(m):z(m))}if(!a.length){n.style.display="none";return}const r=l.data[0][o],i=s?new Date(r*1e3).toLocaleTimeString([],{hourCycle:"h23"}):t?t(r):z(r);n.innerHTML=`<b>${a.join(", ")}</b> ${i}`;const d=Math.round(l.valToPos(r,"x"));n.style.left=Math.min(d,l.over.clientWidth-100)+"px",n.style.display=""}}}}const Pv=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function zv(t){return t==null||t===0?"0":t>=1e6?Math.round(t/1e6)+"M":t>=1e3?Math.round(t/1e3)+"K":t>=1?Math.round(t).toString():t.toPrecision(1)}function Fv(t,e,s,n){const l=Math.max(0,Math.floor(Math.log10(Math.max(1,s)))),o=Math.ceil(Math.log10(Math.max(1,n))),a=[];for(let i=l;i<=o;i++)a.push(Math.pow(10,i));if(a.length<=3)return a;const r=Math.floor((l+o)/2);return[Math.pow(10,l),Math.pow(10,r),Math.pow(10,o)]}function vo({mode:t,data:e,labels:s,colors:n,height:l,isTime:o,fmtX:a,fmtY:r,xLabel:i,yLabel:d,logX:f}){const p=Ot(null),m=Ot(null),g=l||200;return lt(()=>{if(!p.current||!e||e.length<2||!e[0]||e[0].length<2)return;try{m.current&&(m.current.destroy(),m.current=null)}catch{m.current=null}const x=e.length-1,E=n||Pv,C=[{}];for(let $=0;$<x;$++){const k=E[$%E.length],S=tr(k,.6);t==="scatter"?C.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:"transparent",paths:()=>null,points:{show:!0,size:8,fill:S,stroke:"transparent",width:0}}):C.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:k,width:1.5,fill:tr(k,.08),points:{show:!1}})}const b={width:p.current.clientWidth||300,height:g,padding:[8,8,0,0],cursor:{show:!0,x:!0,y:!1,points:{show:t!=="scatter"}},legend:{show:!1},select:{show:!1},scales:{x:{time:!!o,...f?{distr:3,log:10}:{}},y:{auto:!0,range:($,k,S)=>[Math.max(0,k*.9),S*1.1||1]}},axes:[{show:!0,size:28,gap:2,...f?{splits:Fv}:{},values:o?void 0:($,k)=>k.map(S=>f?zv(S):a?a(S):z(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}},{show:!0,size:50,gap:2,values:($,k)=>k.map(S=>r?r(S):z(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}}],series:C,plugins:[Ov(a,r,o)]};try{m.current=new oe(b,e,p.current)}catch($){console.warn("AnalyticsChart: uPlot init failed",$),m.current=null}return()=>{try{m.current&&(m.current.destroy(),m.current=null)}catch{}}},[e,t,n,s,o,f,g]),lt(()=>{if(!m.current||!p.current)return;const x=new ResizeObserver(()=>{m.current&&p.current&&m.current.setSize({width:p.current.clientWidth,height:g})});return x.observe(p.current),()=>x.disconnect()},[g]),c`<div class="analytics-chart-wrap" style=${"height:"+g+"px"} ref=${p}></div>`}function Iv(t){const e={};for(const s of t){const n=typeof s=="string"?s:s.metric;if(!n)continue;const l=n.split("."),o=l.length>1?l.slice(0,-1).join("."):"(ungrouped)";(e[o]=e[o]||[]).push({name:n,count:s.count||0,lastValue:s.last_value})}return Object.entries(e).sort((s,n)=>s[0].localeCompare(n[0]))}function Nv(){const[t,e]=R([]),[s,n]=R(null),[l,o]=R(null),[a,r]=R([]),[i,d]=R(!1),[f,p]=R(null);lt(()=>{Bd().then(C=>{e(C||[]),p(null)}).catch(C=>{e([]),p(C.message)})},[]);const m=at(()=>Iv(t),[t]),g=ht(C=>{n(C),o(null),r([]),d(!0);const b=Math.floor(Date.now()/1e3)-1800,$=Hd(C,b).then(S=>o(S)).catch(()=>o(null)),k=Wd(C,b).then(S=>r(Array.isArray(S)?S:[])).catch(()=>r([]));Promise.allSettled([$,k]).then(()=>d(!1))},[]),x=at(()=>!l||!l.value||!l.value.length?null:l.value[l.value.length-1],[l]),E=at(()=>{const C=new Set;for(const b of a)b.tags&&Object.keys(b.tags).forEach($=>C.add($));return[...C].sort()},[a]);return c`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${f&&c`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${V(f)}</p>`}
      ${!f&&!t.length&&c`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${m.map(([C,b])=>c`<div key=${C}>
        <div class="text-muted" style="font-size:var(--fs-xs);padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${C}</div>
        ${b.map($=>c`<button key=${$.name}
          class=${s===$.name?"es-tool-btn active":"es-tool-btn"}
          onClick=${()=>g($.name)}>
          ${$.name.split(".").pop()}
          ${$.count?c`<span class="badge" style="margin-left:auto;font-size:var(--fs-2xs)">${z($.count)}</span>`:""}
        </button>`)}
      </div>`)}
    </div>
    <div>
      ${!s&&c`<div class="diag-card text-center" style="padding:2rem">
        <p class="text-muted">Select a metric from the sidebar to view its time series.</p>
      </div>`}

      ${s&&c`<Fragment>
        <h3 class="mb-sm">${s}</h3>

        ${i&&c`<p class="loading-state">Loading...</p>`}

        ${!i&&l&&l.ts&&l.ts.length>=2?c`<div class="es-section">
          <div class="es-section-title">Time Series (last 30m)</div>
          <${es}
            label=${s.split(".").pop()}
            value=${x!=null?z(x):"-"}
            data=${[l.ts,l.value]}
            chartColor="var(--accent)"
            smooth />
        </div>`:""}

        ${!i&&l&&l.ts&&l.ts.length<2&&c`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">Not enough data points to chart.</p>
        </div>`}

        ${!i&&!l&&!i&&c`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">No series data available.</p>
        </div>`}

        ${!i&&a.length>0&&c`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples (${a.length})</div>
          <div style="overflow-x:auto">
            <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
              <thead>
                <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
                  <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
                  <th style="padding:var(--sp-2) var(--sp-4)">Value</th>
                  ${E.map(C=>c`<th key=${C} style="padding:var(--sp-2) var(--sp-4)">${C}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${a.slice(-50).reverse().map((C,b)=>c`<tr key=${b}
                  style="border-bottom:1px solid var(--border);${b%2?"background:var(--bg2)":""}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${zr(C.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${z(C.value)}</td>
                  ${E.map($=>c`<td key=${$} style="padding:var(--sp-2) var(--sp-4)">
                    ${C.tags&&C.tags[$]!=null?c`<span class="badge">${C.tags[$]}</span>`:"-"}
                  </td>`)}
                </tr>`)}
              </tbody>
            </table>
          </div>
        </div>`}

        ${!i&&a.length===0&&l&&c`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples</div>
          <p class="empty-state">No raw samples in the last 30 minutes.</p>
        </div>`}
      </Fragment>`}
    </div>
  </div>`}const sn=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function ps(t){return t>=1e3?z(t/1e3)+"s":Math.round(t)+"ms"}function Rv(t){return"#"+Math.round(t)}function mo(t){return(t||"").split("/").slice(-2).join("/")}function jv({data:t}){if(!t||!t.requests||!t.requests.length)return c`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <p class="empty-state">No request data in this time range.</p>
    </div>`;const e=t.requests,s=at(()=>{const i=e.map(f=>f.ts),d=e.map(f=>f.duration_ms);return[i,d]},[e]),n=at(()=>{const i=[...new Set(e.map(g=>g.model||"(unknown)"))],d=i.map(()=>[]),p=[...e.filter(g=>g.input_tokens>0)].sort((g,x)=>g.input_tokens-x.input_tokens),m=p.map(g=>g.input_tokens);for(const g of i)d[i.indexOf(g)]=p.map(x=>(x.model||"(unknown)")===g?x.duration_ms:null);return{data:[m,...d],labels:i,colors:sn.slice(0,i.length)}},[e]),l=t.by_model||[],o=Math.max(1,...l.map(i=>i.p95_ms)),a=at(()=>{const i=[...new Set(e.map(g=>g.model||"(unknown)"))],f=[...e.filter(g=>g.seq>0)].sort((g,x)=>g.seq-x.seq),p=f.map(g=>g.seq),m=i.map(g=>f.map(x=>(x.model||"(unknown)")===g?x.duration_ms:null));return{data:[p,...m],labels:i,colors:sn.slice(0,i.length)}},[e]),r=e.length?e[e.length-1].duration_ms:0;return c`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${ps(r)}</span></div>
        <${vo} mode="line" data=${s} isTime=${!0} fmtY=${ps} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${e.length} requests</span></div>
        <${vo} mode="scatter" data=${n.data} labels=${n.labels}
          colors=${n.colors} fmtX=${z} fmtY=${ps} logX=${!0} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${l.map((i,d)=>c`<div key=${i.model} class="hbar-row">
            <span class="hbar-label" title=${i.model}>${i.model.replace(/^claude-/,"")||i.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${"width:"+Math.round(i.avg_ms/o*100)+"%;background:"+sn[d%sn.length]}></div>
              <div class="hbar-p95" style=${"left:"+Math.round(i.p95_ms/o*100)+"%"} title=${"p95: "+ps(i.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ps(i.avg_ms)}</span>
            <span class="badge">${i.count}</span>
          </div>`)}
        </div>
        ${l.length>0&&c`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${vo} mode="scatter" data=${a.data} labels=${a.labels}
          colors=${a.colors} fmtX=${Rv} fmtY=${ps} logX=${!0} height=${200}/>
      </div>
    </div>
  </div>`}const Bv={"claude-code":"#8b5cf6",codex:"#f97316",aider:"#06b6d4",cursor:"#f472b6"};function zc(t,e){return Bv[t]||sn[e%sn.length]}function er({by_cli:t,total:e,barWidth:s,cliTools:n}){return!t||!t.length?c`<div class="hbar-fill" style=${"width:"+s+"%;background:var(--accent)"}></div>`:t.map((l,o)=>{const a=l.count/e*s,r=zc(l.cli_tool,n.indexOf(l.cli_tool));return c`<div key=${l.cli_tool}
      style=${"width:"+a.toFixed(1)+"%;background:"+r+";height:100%;display:inline-block"}
      title=${l.cli_tool+": "+l.count}></div>`})}function Hv({data:t}){if(!t||!t.invocations||!t.invocations.length)return c`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      <p class="empty-state">${t!=null&&t.total_all_time?"No tool invocation data in this time range. Try a wider range ("+t.total_all_time+" invocations exist).":"No tool invocation data yet. Configure Claude Code hooks to capture tool usage."}</p>
    </div>`;const e=t.invocations,s=t.cli_tools||[],n=Math.max(1,...e.map(o=>o.count)),l=Math.max(1,...e.map(o=>o.p95_ms));return c`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    ${s.length>1&&c`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${s.map((o,a)=>c`<span key=${o} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${"width:10px;height:10px;border-radius:2px;background:"+zc(o,a)}></span>
        ${o}
      </span>`)}
    </div>`}
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Invocation Frequency</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${e.reduce((o,a)=>o+a.count,0)} total</span></div>
        <div class="hbar-list">
          ${e.slice(0,15).map(o=>c`<div key=${o.tool_name} class="hbar-row">
            <span class="hbar-label" title=${o.tool_name}>${o.tool_name}</span>
            <div class="hbar-track" style="overflow:hidden">
              <${er} by_cli=${o.by_cli} total=${o.count}
                barWidth=${Math.round(o.count/n*100)} cliTools=${s}/>
            </div>
            <span class="hbar-value">${z(o.count)}</span>
            ${o.error_count?c`<span class="badge" style="color:var(--red)">${o.error_count} err</span>`:""}
          </div>`)}
        </div>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Execution Duration</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">avg + p95</span></div>
        <div class="hbar-list">
          ${e.slice(0,15).map((o,a)=>c`<div key=${o.tool_name} class="hbar-row">
            <span class="hbar-label" title=${o.tool_name}>${o.tool_name}</span>
            <div class="hbar-track">
              <${er} by_cli=${o.by_cli} total=${o.count}
                barWidth=${Math.round(o.avg_ms/l*100)} cliTools=${s}/>
              <div class="hbar-p95" style=${"left:"+Math.round(o.p95_ms/l*100)+"%"} title=${"p95: "+ps(o.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ps(o.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`}function Wv({data:t}){const[e,s]=R(!1);if(!t)return null;const n=t.memory_timeline||{},l=t.memory_events||[],o=Object.keys(n);if(!o.length&&!l.length)return c`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <p class="empty-state">No file write data in this time range.</p>
    </div>`;const a=e?o:o.slice(0,6);return c`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>

    ${o.length>0&&c`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${o.length} files)</div>
      <div class="analytics-charts">
        ${a.map(r=>{const i=n[r];if(!i||i.ts.length<2)return c`<div key=${r} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${r}>${mo(r)}</span>
              <span class="chart-val text-muted">${i&&i.size_bytes.length?$t(i.size_bytes[i.size_bytes.length-1]):"-"}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;const d=i.size_bytes[i.size_bytes.length-1];return c`<div key=${r} class="diag-card">
            <${es} label=${mo(r)} value=${$t(d)}
              data=${[i.ts,i.size_bytes]} chartColor="var(--accent)"/>
          </div>`})}
      </div>
      ${o.length>6&&!e&&c`<button class="range-btn" style="margin-top:var(--sp-2)"
        onClick=${()=>s(!0)}>Show all ${o.length} files</button>`}
    </div>`}

    ${l.length>0&&c`<div>
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
            ${l.slice(0,30).map((r,i)=>c`<tr key=${i}
              style="border-bottom:1px solid var(--border);${i%2?"background:var(--bg2)":""}">
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${zr(r.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${r.path}>${mo(r.path)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${$t(r.size_bytes)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4);color:${r.delta>0?"var(--green)":r.delta<0?"var(--red)":"var(--fg2)"}">
                ${r.delta>0?"+":""}${$t(Math.abs(r.delta))}${r.delta<0?" ↓":r.delta>0?" ↑":""}
              </td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${z(r.tokens)}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`}
  </div>`}function qv(){const t=jt(Rt),e=t==null?void 0:t.globalRange,[s,n]=R(null),[l,o]=R(!0),[a,r]=R(null);return lt(()=>{o(!0),r(null);const i=(e==null?void 0:e.since)||Date.now()/1e3-86400,d=(e==null?void 0:e.until)||"",f=`/api/analytics?since=${i}${d?"&until="+d:""}`,p=new AbortController,m=setTimeout(()=>p.abort(),15e3);return Fd(f,{signal:p.signal}).then(g=>{n(g),r(null)}).catch(g=>{g.name==="AbortError"?r("Request timed out"):(n(null),r(g.message))}).finally(()=>{clearTimeout(m),o(!1)}),()=>{clearTimeout(m),p.abort()}},[e==null?void 0:e.since,e==null?void 0:e.until]),c`<div class="analytics-grid">
    ${l&&c`<p class="loading-state">Loading analytics...</p>`}
    ${a&&c`<p class="error-state">Error: ${a}</p>`}
    ${!l&&!a&&c`<Fragment>
      <${jv} data=${s==null?void 0:s.response_time}/>
      <${Hv} data=${s==null?void 0:s.tools}/>
      <${Wv} data=${s==null?void 0:s.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <div style="margin-top:var(--sp-4)"><${Nv}/></div>
      </details>
    </Fragment>`}
  </div>`}function Vv({tools:t,activeTool:e,onSelect:s}){return t.length<=1?null:c`<div class="sf-tool-tabs">
    ${t.map(n=>c`<button key=${n} class="sf-tool-tab ${n===e?"active":""}"
      style="border-bottom-color:${n===e?Dt[n]||"var(--accent)":"transparent"};color:${Dt[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${me[n]||"🔹"}</span> ${V(n)}
    </button>`)}
  </div>`}function fs(t){if(t==null||isNaN(t)||t<=0)return"";const e=Math.round(t/1e3);if(e<60)return e+"s";const s=Math.floor(e/60);return s<60?s+"m "+e%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Fc(t){if(t==null||isNaN(t))return"—";const e=Math.round(t);if(e<60)return e+"s";const s=Math.floor(e/60);return s<60?s+"m "+e%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Uv(t){return new Date(t*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"})}function Ic(t){return new Date(t*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function sr(t){return t?t.replace("claude-","").replace(/-\d{8}$/,""):""}function Gv(t){if(!t)return"";const e=t.split(":");return e.length===3&&/^\d+$/.test(e[1])?e[1]:t.slice(-6)}function Yv(t,e){if(!e)return"";let s=e;if(typeof e=="string")try{s=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof s!="object"||s===null)return String(e).slice(0,80);const n=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const o of n)if(s[o]){let a=String(s[o]);return(o==="file_path"||o==="path")&&a.length>60&&(a=".../"+a.replace(/\\/g,"/").split("/").slice(-2).join("/")),a.slice(0,100)}const l=Object.keys(s);return l.length>0?String(s[l[0]]).slice(0,80):""}const nr=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],lr={Bash:"#1a1a1a"};function or(t){if(lr[t])return lr[t];let e=0;for(let s=0;s<t.length;s++)e=e*31+t.charCodeAt(s)&65535;return nr[e%nr.length]}function Kv({sessions:t,activeId:e,onSelect:s,loading:n}){return n?c`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:t.length?c`<div class="sf-sess-tabs">
    ${t.map(l=>{const o=l.exact_input_tokens||l.input_tokens||0,a=l.exact_output_tokens||l.output_tokens||0,r=o+a,i=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),d=l.session_id===e,f=!l.ended_at;return c`<button key=${l.session_id}
        title=${l.session_id}
        class="sf-sess-tab ${d?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${Uv(l.started_at)}</span>
        <span class="sf-stab-sid">${Gv(l.session_id)}</span>
        <span class="sf-stab-dur">${Fc(i)}</span>
        ${r>0&&c`<span class="sf-stab-tok">${z(r)}t</span>`}
        ${(l.files_modified||0)>0&&c`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${f&&c`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:c`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function Jv({event:t}){if(t.type==="user_message")return t.redacted?c`<div class="sf-seq-tooltip">
        <div class="sf-tip-label">User Prompt <span style="color:var(--orange)">(redacted)</span></div>
        <div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">
          Claude Code redacts prompts by default in OTel telemetry.
        </div>
        <div class="sf-tip-meta">
          To capture prompt text, restart Claude Code with:<br/>
          <code style="color:var(--accent)">eval $(aictl otel enable)</code><br/>
          This sets <code>OTEL_LOG_USER_PROMPTS=1</code> before launch.
        </div>
        ${t.prompt_length&&c`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">Prompt length: ${t.prompt_length} chars</div>`}
      </div>`:t.message?c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">User Prompt</div>
      <div class="sf-tip-body">${V(t.message)}</div>
      ${t.prompt_length&&c`<div class="sf-tip-meta">${t.prompt_length} chars</div>`}
    </div>`:null;if(t.type==="api_call"){const e=t.tokens||{};return c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Call${t.model?" — "+t.model:""}</div>
      ${t.agent_name&&c`<div class="sf-tip-meta">Agent: ${V(t.agent_name)}</div>`}
      <div class="sf-tip-meta">
        Input: ${z(e.input||0)} \u00B7 Output: ${z(e.output||0)}
        ${(e.cache_read||0)>0?" · Cache: "+z(e.cache_read):""}
      </div>
      <div class="sf-tip-meta">
        ${t.duration_ms>0?"Duration: "+fs(t.duration_ms):""}
        ${t.ttft_ms>0?" · TTFT: "+fs(t.ttft_ms):""}
      </div>
      ${t.is_error&&c`<div class="sf-tip-meta" style="color:var(--red)">Error: ${V(t.error_type||"unknown")}</div>`}
    </div>`}if(t.type==="api_response"){const e=t.tokens||{};return c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${t.model?" — "+t.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${z(e.output||0)} tokens
        ${t.duration_ms>0?" · Latency: "+fs(t.duration_ms):""}
        ${t.finish_reason?" · "+t.finish_reason:""}
      </div>
      ${t.response_preview&&c`<div class="sf-tip-body">${V(t.response_preview)}</div>`}
    </div>`}if(t.type==="error")return c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${V(t.error_type||"unknown")}</div>
      ${t.error_message&&c`<div class="sf-tip-body">${V(t.error_message)}</div>`}
      ${t.parent_span&&c`<div class="sf-tip-meta">During: ${V(t.parent_span)}</div>`}
    </div>`;if(t.type==="tool_use"){let e=null;if(t.params){let s=t.params;if(typeof s=="string")try{s=JSON.parse(s)}catch{s=null}s&&typeof s=="object"&&(e=Object.entries(s).filter(([,n])=>n!=null&&n!==""))}return c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${V(t.to||"Tool")}${t.subtype==="result"?" (result)":t.subtype==="decision"?" (decision)":""}</div>
      ${t.decision&&c`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${V(t.decision)}</strong></div>`}
      ${e?c`<div class="sf-tip-params">
            ${e.map(([s,n])=>{const l=String(n),o=l.length>120;return c`<div key=${s} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${V(s)}</span>
                <span class="sf-tip-param-val ${o?"sf-tip-param-long":""}" title=${l}>${V(o?l.slice(0,200)+"...":l)}</span>
              </div>`})}
          </div>`:t.params&&c`<div class="sf-tip-body mono">${V(t.params)}</div>`}
      ${(t.success||t.duration_ms>0||t.result_size)&&c`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${t.success?"Success: "+t.success:""}
        ${t.duration_ms>0?" · "+fs(t.duration_ms):""}
        ${t.result_size?" · Result: "+t.result_size+" bytes":""}
      </div>`}
    </div>`}return t.type==="subagent"?c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${V(t.to||"agent")}</div>
    </div>`:t.type==="hook"?c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${V(t.hook_name||"")}</div>
    </div>`:null}function Zv({event:t,participants:e,hoveredIdx:s,idx:n,onHover:l}){const o=e.findIndex(k=>k.id===t._from),a=e.findIndex(k=>k.id===t._to);if(o<0||a<0)return null;const r=a>o,i=Math.min(o,a),d=Math.max(o,a),f=s===n,p=e.find(k=>k.id===t._to),g={user_message:"var(--green)",api_call:t.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:(p==null?void 0:p.color)||"var(--cat-commands)",subagent:(p==null?void 0:p.color)||"var(--yellow)",hook:"var(--orange)"}[t.type]||"var(--fg2)";let x="",E="";if(t.type==="user_message")t.redacted?x="🔒 prompt ("+(t.prompt_length||"?")+" chars)":(x=t.preview||"(prompt)",t.prompt_length&&(E=t.prompt_length+" chars"));else if(t.type==="api_call"){const k=t.tokens||{};x=t.agent_name||sr(t.model)||"API call",E=z((k.input||0)+(k.output||0))+"t",t.ttft_ms>0?E+=" ttft:"+fs(t.ttft_ms):t.duration_ms>0&&(E+=" "+fs(t.duration_ms)),t.is_error&&(E+=" ⚠")}else if(t.type==="api_response"){const k=t.tokens||{};x="← "+z(k.output||0)+"t",t.response_preview&&(x+=" "+t.response_preview.slice(0,60)),E=sr(t.model)||"",t.finish_reason&&t.finish_reason!=="stop"&&(E+=" ["+t.finish_reason+"]")}else if(t.type==="error")x="⚠ "+(t.error_type||"error"),E=t.error_message?t.error_message.slice(0,60):"";else if(t.type==="tool_use"){const k=t.to||"tool",S=Yv(k,t.params);x=k+(S?": "+S:""),t.subtype==="result"?(E=t.success==="true"||t.success===!0?"✓":"✗",t.duration_ms>0&&(E+=" "+fs(t.duration_ms)),t.result_size&&(E+=" "+t.result_size+"B")):t.subtype==="decision"&&(E=t.decision||"")}else t.type==="subagent"?x=t.to||"subagent":t.type==="hook"&&(x=t.hook_name||"hook");const C=100/e.length,b=(i+.5)*C,$=(d+.5)*C;return c`<div class="sf-seq-row ${f?"hovered":""}"
    onMouseEnter=${()=>l(n)} onMouseLeave=${()=>l(null)}>
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${t._cumTok>0?z(t._cumTok):""}</span>
      <span class="sf-seq-rttok">${t._rtTok>0?z(t._rtTok):""}</span>
    </div>
    <div class="sf-seq-time">${Ic(t.ts)}</div>
    <div class="sf-seq-arrow-area">
      ${e.map((k,S)=>c`<div key=${S} class="sf-seq-lane"
        style="left:${(S+.5)*C}%"></div>`)}
      <div class="sf-seq-arrow-line" style="
        left:${b}%;
        width:${$-b}%;
        border-color:${g};
      "></div>
      <div class="sf-seq-arrowhead" style="
        left:${r?$:b}%;
        border-${r?"left":"right"}-color:${g};
        transform:translateX(${r?"-100%":"0"});
      "></div>
      <div class="sf-seq-label" style="
        left:${(b+$)/2}%;
        color:${g};
      "><span class="sf-seq-label-text" title=${x}>${V(x)}</span>
        ${E&&c`<span class="sf-seq-sublabel">${E}</span>`}
      </div>
    </div>
    ${f&&c`<${Jv} event=${t}/>`}
  </div>`}function Qv({event:t}){let e="",s="var(--fg2)",n="";return t.type==="session_start"?(e="Session started",s="var(--green)",n="▶"):t.type==="session_end"?(e="Session ended",s="var(--fg3)",n="■"):t.type==="compaction"&&(e="Compaction"+(t.compaction_count?" #"+t.compaction_count:""),s="var(--orange)",n="⟳"),c`<div class="sf-seq-marker" style="border-left-color:${s}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${Ic(t.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${s}">
      ${n} ${e}
      ${t.type==="compaction"&&t.duration_ms>0?" — "+fs(t.duration_ms):""}
      ${t.cwd?c` <span class="text-muted text-xs mono">${V(t.cwd)}</span>`:""}
    </div>
  </div>`}function Xv({summary:t}){return!t||!t.event_count?null:c`<div class="sf-summary">
    ${t.total_turns>0&&c`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${t.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${t.total_api_calls||0}</div></div>
    ${t.total_tool_uses>0&&c`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${t.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${z(t.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${z(t.total_input_tokens)}/${z(t.total_output_tokens)}</div></div>
    ${t.compactions>0&&c`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${t.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${Fc(t.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${t.event_count}</div></div>
  </div>`}function tm(t,e){const s=new Set,n=[],l=(o,a,r)=>{s.has(o)||(s.add(o),n.push({id:o,label:a||o,color:r||"var(--fg2)"}))};l("user","User","var(--green)"),l("tool",e||"AI Tool",Dt[e]||"var(--accent)");for(const o of t){if((o.type==="api_call"||o.type==="api_response"||o.type==="error")&&l("api","API","var(--accent)"),o.type==="tool_use"){const a=o.to||"tool";l("skill:"+a,a,or(a))}if(o.type==="subagent"){const a=o.to||"Subagent";l("subagent:"+a,a,or(a))}o.type==="hook"&&l("hook","Hooks","var(--orange)")}return n}function em(){const{globalRange:t,enabledTools:e}=jt(Rt),[s,n]=R([]),[l,o]=R(!0),[a,r]=R(null),[i,d]=R(null),[f,p]=R(null),[m,g]=R(!1),[x,E]=R(null);lt(()=>{o(!0);const M=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,F=t==null?void 0:t.until;bl(null,{since:M,until:F}).then(y=>{y.sort((T,O)=>(O.started_at||0)-(T.started_at||0)),n(y),o(!1)}).catch(()=>o(!1))},[t]);const C=M=>e===null||e.includes(M),b=s.filter(M=>C(M.tool)),$=[...new Set(b.map(M=>M.tool))].sort();lt(()=>{(!a&&$.length>0||a&&!$.includes(a)&&$.length>0)&&r($[0])},[$.join(",")]);const k=b.filter(M=>M.tool===a);lt(()=>{k.length>0&&(!i||!k.find(M=>M.session_id===i))&&d(k[0].session_id)},[a,k.length]),lt(()=>{if(!i){p(null);return}g(!0);const M=s.find(T=>T.session_id===i),F=M!=null&&M.started_at?M.started_at-60:Date.now()/1e3-86400,y=M!=null&&M.ended_at?M.ended_at+60:Date.now()/1e3+60;Vo(i,F,y).then(T=>{p(T),g(!1)}).catch(()=>{p(null),g(!1)})},[i]);const{processedTurns:S,participants:N}=at(()=>{const M=(f==null?void 0:f.turns)||[];if(!M.length)return{processedTurns:[],participants:[]};const F=M.map(P=>{const D={...P};return P.type==="user_message"?(D._from="user",D._to="tool"):P.type==="api_call"?(D._from=P.from||"tool",D._to="api"):P.type==="api_response"||P.type==="error"?(D._from="api",D._to="tool"):P.type==="tool_use"?(D._from="tool",D._to="skill:"+(P.to||"tool")):P.type==="subagent"?(D._from="tool",D._to="subagent:"+(P.to||"agent")):P.type==="hook"&&(D._from="tool",D._to="hook"),D});let y=0,T=0;for(const P of F){const D=P.tokens||{},q=(D.input||0)+(D.output||0);P.type==="user_message"&&(T=0),P.type==="api_call"&&(y+=q,T+=q),P._cumTok=y,P._rtTok=T}const O=tm(F,a);return{processedTurns:F,participants:O}},[f,a]),A=(f==null?void 0:f.summary)||{};return c`<div class="sf-container">
    <${Vv} tools=${$} activeTool=${a} onSelect=${r}/>

    <${Kv} sessions=${k} activeId=${i}
      onSelect=${d} loading=${l}/>

    <${Xv} summary=${A}/>

    <div class="sf-seq-container">
      ${m?c`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`:S.length===0?c`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No flow data for this session.</p>
              <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
                Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
              </p>
            </div>`:c`
            <div class="sf-seq-header">
              <div class="sf-seq-tokens">
                <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
              </div>
              <div class="sf-seq-time"></div>
              <div class="sf-seq-arrow-area">
                ${N.map((M,F)=>{const y=100/N.length;return c`<div key=${M.id} class="sf-seq-participant"
                    style="left:${(F+.5)*y}%;color:${M.color}">
                    <div class="sf-seq-participant-box" style="border-color:${M.color}">${V(M.label)}</div>
                  </div>`})}
              </div>
            </div>
            <div class="sf-seq-body">
              ${S.map((M,F)=>M._from&&M._to?c`<${Zv} key=${F} event=${M} participants=${N}
                    hoveredIdx=${x} idx=${F} onHover=${E}/>`:c`<${Qv} key=${F} event=${M} participants=${N}/>`)}
            </div>
          `}
    </div>
  </div>`}function sm({tools:t,activeTool:e,onSelect:s}){return t.length?c`<div class="sf-tool-tabs" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);flex-wrap:wrap">
    ${t.map(n=>c`<button key=${n}
      class="chip ${n===e?"chip-active":""}"
      onClick=${()=>s(n)}
      style="font-size:var(--fs-sm);padding:var(--sp-2) var(--sp-4)">
      ${V(n)}
    </button>`)}
  </div>`:null}function Ll(t){if(t==null||isNaN(t)||t<=0)return"";const e=Math.round(t/1e3);if(e<60)return e+"s";const s=Math.floor(e/60);return s<60?s+"m "+e%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Nc(t){return new Date(t*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function Rc(t){return t?t.replace("claude-","").replace("gpt-","").replace(/-\d{8}$/,""):""}function Fo(t,e){return t?t.length>e?t.slice(0,e)+"…":t:""}const nm={tool_use:"🔧",api_call:"🌐",api_response:"📨",file_edit:"📝",compaction:"🗜️",subagent:"🤖",error:"❌"},lm={tool_use:"var(--accent)",api_call:"var(--green)",api_response:"var(--fg2)",file_edit:"var(--orange)",compaction:"var(--yellow)",subagent:"var(--accent)",error:"var(--red)"};function om({sessions:t,activeId:e,onSelect:s,loading:n}){return n?c`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions\u2026</div>`:t.length?c`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${t.slice(0,20).map(l=>{const o=l.session_id===e,a=l.ended_at?Math.round(l.ended_at-l.started_at):0,r=a>0?Ll(a*1e3):"⏳ live",i=Nc(l.started_at);return c`<button key=${l.session_id}
        class="tr-sess-btn ${o?"tr-sess-active":""}"
        onClick=${()=>s(l.session_id)}
        title=${l.session_id}>
        <span class="tr-sess-time">${i}</span>
        <span class="tr-sess-dur">${r}</span>
        ${l.is_live?c`<span class="tr-sess-live">\u25CF</span>`:null}
      </button>`})}
  </div>`:c`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`}function am({action:t,turnTs:e}){const s=nm[t.kind]||"•",n=lm[t.kind]||"var(--fg2)",l=t.ts-e,o=l>0?"+"+(l<1?l.toFixed(1):Math.round(l))+"s":"",a=t.duration_ms>0?Ll(t.duration_ms):"",r=t.tokens,i=r?z((r.input||0)+(r.output||0)):"";return c`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${n}">${s}</span>
    <span class="tr-action-name" style="color:${n}">${V(t.name||t.kind)}</span>
    ${t.input_summary?c`<span class="tr-action-args">${V(Fo(t.input_summary,80))}</span>`:null}
    ${t.output_summary?c`<span class="tr-action-result">${V(Fo(t.output_summary,60))}</span>`:null}
    <span class="tr-action-meta">
      ${o?c`<span class="tr-action-offset">${o}</span>`:null}
      ${a?c`<span class="tr-action-dur">${a}</span>`:null}
      ${i?c`<span class="tr-action-tok">\uD83E\uDE99 ${i}</span>`:null}
      ${t.success===!1?c`<span class="tr-action-fail">\u2717</span>`:null}
      ${t.success===!0?c`<span class="tr-action-ok">\u2713</span>`:null}
    </span>
  </div>`}function im({turn:t,index:e,expanded:s,onToggle:n}){const l=t.prompt&&t.prompt.length>0,o=t.actions||[],a=o.filter(m=>m.kind==="tool_use"),r=o.filter(m=>m.kind==="api_call"),i=o.filter(m=>m.kind==="error"),d=t.tokens||{},f=(d.input||0)+(d.output||0),p=t.wall_ms||t.duration_ms||0;return c`<div class="tr-turn ${s?"tr-turn-expanded":""}">
    <div class="tr-turn-header" onClick=${n}>
      <div class="tr-turn-num">${e+1}</div>
      <div class="tr-turn-meta">
        <span class="tr-turn-time">${Nc(t.ts)}</span>
        ${t.model?c`<span class="tr-turn-model">${Rc(t.model)}</span>`:null}
        ${p>0?c`<span class="tr-turn-dur">${Ll(p)}</span>`:null}
      </div>
      <div class="tr-turn-stats">
        ${f>0?c`<span class="tr-stat" title="Tokens">\uD83E\uDE99 ${z(f)}</span>`:null}
        ${a.length>0?c`<span class="tr-stat" title="Tool uses">\uD83D\uDD27 ${a.length}</span>`:null}
        ${r.length>0?c`<span class="tr-stat" title="API calls">\uD83C\uDF10 ${r.length}</span>`:null}
        ${i.length>0?c`<span class="tr-stat tr-stat-err" title="Errors">\u274C ${i.length}</span>`:null}
      </div>
      <div class="tr-turn-chevron">${s?"▾":"▸"}</div>
    </div>

    ${l?c`<div class="tr-prompt ${s?"tr-prompt-full":""}">
      <div class="tr-prompt-icon">\uD83D\uDC64</div>
      <div class="tr-prompt-text">${s?t.prompt:Fo(t.prompt_preview||t.prompt,120)}</div>
    </div>`:c`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon">\uD83D\uDC64</div>
      <div class="tr-prompt-text text-muted">(no prompt captured)</div>
    </div>`}

    ${s&&o.length>0?c`<div class="tr-actions">
      ${o.map((m,g)=>c`<${am} key=${g} action=${m} turnTs=${t.ts}/>`)}
    </div>`:null}

    ${s&&f>0?c`<div class="tr-token-bar">
      <div class="tr-token-seg tr-tok-in"
        style="flex:${d.input||0}" title="Input: ${z(d.input||0)}">
        ${d.input>0?"in "+z(d.input):""}
      </div>
      ${d.cache_read>0?c`<div class="tr-token-seg tr-tok-cache"
        style="flex:${d.cache_read}" title="Cache read: ${z(d.cache_read)}">
        cache ${z(d.cache_read)}
      </div>`:null}
      <div class="tr-token-seg tr-tok-out"
        style="flex:${d.output||0}" title="Output: ${z(d.output||0)}">
        ${d.output>0?"out "+z(d.output):""}
      </div>
    </div>`:null}
  </div>`}function rm({summary:t,transcript:e}){return t?c`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns">\uD83D\uDCAC ${t.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls">\uD83C\uDF10 ${t.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses">\uD83D\uDD27 ${t.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens">\uD83E\uDE99 ${z(t.total_tokens||0)}</span>
    ${t.compactions>0?c`<span class="tr-summary-item" title="Compactions">\uD83D\uDDDC\uFE0F ${t.compactions}</span>`:null}
    ${t.errors>0?c`<span class="tr-summary-item tr-stat-err" title="Errors">\u274C ${t.errors}</span>`:null}
    ${t.subagents>0?c`<span class="tr-summary-item" title="Subagents">\uD83E\uDD16 ${t.subagents}</span>`:null}
    ${t.duration_s>0?c`<span class="tr-summary-item" title="Duration">\u23F1\uFE0F ${Ll(t.duration_s*1e3)}</span>`:null}
    ${e!=null&&e.model?c`<span class="tr-summary-item" title="Model">\uD83E\uDDE0 ${Rc(e.model)}</span>`:null}
    ${e!=null&&e.is_live?c`<span class="tr-summary-live">\u25CF LIVE</span>`:null}
    <span class="tr-summary-source">${t.source||""}</span>
  </div>`:null}function cm(t){if(!t||!t.turns||t.turns.length===0)return!1;const e=t.turns[0];return e.type!=null&&e.actions==null}function ar(t,e){if(!t||!t.turns)return null;const s=t.turns||[],n=[];let l=null;const o={api_call:"api_call",api_response:"api_response",tool_use:"tool_use",subagent:"subagent",error:"error",hook:"tool_use"};for(const a of s)if(a.type==="user_message"){if(l&&n.push(l),l={ts:a.ts,end_ts:a.end_ts||a.ts,prompt:a.message||"",prompt_preview:a.preview||(a.message||"").slice(0,200),model:a.model||"",tokens:a.tokens||{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:a.api_calls||0,duration_ms:a.duration_ms||0,wall_ms:a.wall_ms||0,actions:[],tool_use_count:0},a.tools&&a.tools.length>0){for(const r of a.tools)l.actions.push({ts:r.ts||a.ts,kind:r.is_agent?"subagent":"tool_use",name:r.name||"",input_summary:r.args_summary||"",duration_ms:r.duration_ms||0});l.tool_use_count=a.tools.length}}else{if(a.type==="session_start"||a.type==="session_end")continue;if(a.type==="compaction")continue;if(l){const r=o[a.type];r&&(l.actions.push({ts:a.ts,kind:r,name:a.model||a.to||a.tool_name||a.hook_name||"",input_summary:a.params||a.decision||"",output_summary:a.response_preview||a.error_message||"",duration_ms:a.duration_ms||0,tokens:a.tokens,success:a.success==="true"?!0:a.success==="false"?!1:void 0}),r==="tool_use"&&l.tool_use_count++,r==="api_call"&&a.tokens&&(l.tokens.input+=a.tokens.input||0,l.tokens.output+=a.tokens.output||0,l.tokens.cache_read+=a.tokens.cache_read||0,l.api_calls++))}else{const r=o[a.type];r&&r!=="api_response"&&(l={ts:a.ts,end_ts:a.ts,prompt:"",prompt_preview:"",model:a.model||"",tokens:{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:0,duration_ms:0,wall_ms:0,actions:[],tool_use_count:0},l.actions.push({ts:a.ts,kind:r,name:a.model||a.to||a.tool_name||"",input_summary:a.params||a.decision||"",output_summary:a.response_preview||a.error_message||"",duration_ms:a.duration_ms||0,tokens:a.tokens,success:a.success==="true"?!0:a.success==="false"?!1:void 0}),r==="tool_use"&&l.tool_use_count++,r==="api_call"&&a.tokens&&(l.tokens.input+=a.tokens.input||0,l.tokens.output+=a.tokens.output||0,l.tokens.cache_read+=a.tokens.cache_read||0,l.api_calls++))}}l&&n.push(l);for(const a of n)if(a.tokens.total=(a.tokens.input||0)+(a.tokens.output||0),a.actions.length>0){const r=a.actions[a.actions.length-1];a.end_ts=Math.max(a.end_ts||0,r.ts+(r.duration_ms||0)/1e3)}return{session_id:e,turns:n,summary:t.summary||{},is_live:!1}}function dm(){const{globalRange:t,enabledTools:e}=jt(Rt),[s,n]=R([]),[l,o]=R(!0),[a,r]=R(null),[i,d]=R(null),[f,p]=R(null),[m,g]=R(!1),[x,E]=R(new Set),[C,b]=R(!1),[$,k]=R(!0);lt(()=>{o(!0);const D=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,q=t==null?void 0:t.until;bl(null,{since:D,until:q}).then(H=>{H.sort((U,W)=>(W.started_at||0)-(U.started_at||0)),n(H),o(!1)}).catch(()=>o(!1))},[t]);const S=D=>e===null||e.includes(D),N=s.filter(D=>S(D.tool)),A=[...new Set(N.map(D=>D.tool))].sort();lt(()=>{(!a&&A.length>0||a&&!A.includes(a)&&A.length>0)&&r(A[0])},[A.join(",")]);const M=N.filter(D=>D.tool===a);lt(()=>{M.length>0&&(!i||!M.find(D=>D.session_id===i))&&d(M[0].session_id)},[a,M.length]);const F=ht(()=>{if(!i){p(null);return}g(!0),zd(i).then(D=>{cm(D)?p(ar(D,i)):p(D),g(!1)}).catch(()=>{const D=s.find(U=>U.session_id===i),q=D!=null&&D.started_at?D.started_at-60:Date.now()/1e3-86400,H=D!=null&&D.ended_at?D.ended_at+60:Date.now()/1e3+60;Vo(i,q,H).then(U=>{p(ar(U,i)),g(!1)}).catch(()=>{p(null),g(!1)})})},[i,s]);lt(F,[F]),lt(()=>{if(!$||!(f!=null&&f.is_live))return;const D=setInterval(F,5e3);return()=>clearInterval(D)},[$,f==null?void 0:f.is_live,F]);const y=ht(D=>{E(q=>{const H=new Set(q);return H.has(D)?H.delete(D):H.add(D),H})},[]),T=ht(()=>{const D=(f==null?void 0:f.turns)||[];C?(E(new Set),b(!1)):(E(new Set(D.map((q,H)=>H))),b(!0))},[C,f]),O=((f==null?void 0:f.turns)||[]).filter(D=>D.prompt&&D.prompt.length>0||D.actions&&D.actions.length>0||D.tool_use_count>0),P=(f==null?void 0:f.summary)||null;return c`<div class="tr-container">
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${O.length>0?c`<button class="chip" onClick=${T}
          style="font-size:var(--fs-xs)">
          ${C?"⊡ Collapse all":"⊞ Expand all"}
        </button>`:null}
        ${f!=null&&f.is_live?c`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${$}
            onChange=${D=>k(D.target.checked)}/>
          Auto-refresh
        </label>`:null}
      </div>
    </div>

    <${sm} tools=${A} activeTool=${a} onSelect=${r}/>

    <${om} sessions=${M} activeId=${i}
      onSelect=${d} loading=${l}/>

    <${rm} summary=${P} transcript=${f}/>

    <div class="tr-turns">
      ${m?c`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript\u2026</div>`:O.length===0?c`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                Prompts require hooks enabled: set <code>AICTL_URL</code> in your tool config
              </p>
            </div>`:O.map((D,q)=>c`<${im}
              key=${q} turn=${D} index=${q}
              expanded=${x.has(q)}
              onToggle=${()=>y(q)}/>`)}
    </div>
  </div>`}const ir=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],rr={Bash:"#6b7280",Read:"#60a5fa",Edit:"#34d399",Write:"#22d3ee",Grep:"#fbbf24",Glob:"#a78bfa",Agent:"#f472b6",Prompt:"var(--green)",Compaction:"var(--yellow)",Error:"var(--red)"};function hl(t){if(!t)return"var(--fg2)";if(rr[t])return rr[t];let e=0;for(let s=0;s<t.length;s++)e=e*31+t.charCodeAt(s)&65535;return ir[e%ir.length]}function jc(t){return t?new Date(t*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}function Io(t){return t?new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function um(t){return t?t<1e3?t+"ms":(t/1e3).toFixed(1)+"s":""}function Bc(t){if(!t||t<=0)return"0s";if(t<60)return Math.round(t)+"s";const e=Math.floor(t/60),s=Math.round(t%60);if(t<3600)return e+"m"+(s?" "+s+"s":"");const n=Math.floor(e/60),l=e%60;return n+"h"+(l?" "+l+"m":"")}function cr(t){return t<60?Math.round(t)+"s":t<3600?Math.round(t/60)+"m":t<86400?(t/3600).toFixed(1)+"h":(t/86400).toFixed(1)+"d"}function pm(t){if(!t)return"";const e=t.split(":");return e.length===3&&/^\d+$/.test(e[1])?e[1]:t.slice(-6)}function ra(t){const e=t.tokens||{};return(e.input||0)+(e.output||0)}function ca(t){const e=t.tokens||{};return(e.cache_read||0)+(e.cache_creation||0)}function fm(t){return ra(t)+ca(t)}function dr(t,e){return e==="fresh"?ra(t):e==="cached"?ca(t):fm(t)}function gl(t){return t.type==="user_message"?"Prompt":t.type==="api_call"||t.type==="api_response"?t.model||"API":t.type==="tool_use"?t.to||t.name||"Tool":t.type==="subagent"?t.to||"Agent":t.type==="compaction"?"Compaction":t.type==="error"?"Error":t.type==="hook"?t.hook_name||"Hook":t.type||"?"}function vm({tools:t,activeTool:e,onSelect:s}){return t.length<=1?null:c`<div class="sf-tool-tabs">
    ${t.map(n=>c`<button key=${n} class="sf-tool-tab ${n===e?"active":""}"
      style="border-bottom-color:${n===e?Dt[n]||"var(--accent)":"transparent"};color:${Dt[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${me[n]||"🔹"}</span> ${V(n)}
    </button>`)}
  </div>`}function mm({sessions:t,activeId:e,onSelect:s,loading:n}){return n?c`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:t.length?c`<div class="sf-sess-tabs">
    ${t.map(l=>{const o=(l.exact_input_tokens||l.input_tokens||0)+(l.exact_output_tokens||l.output_tokens||0),a=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),r=l.session_id===e;return c`<button key=${l.session_id} title=${l.session_id}
        class="sf-sess-tab ${r?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${jc(l.started_at)}</span>
        <span class="sf-stab-sid">${pm(l.session_id)}</span>
        <span class="sf-stab-dur">${Bc(a)}</span>
        ${o>0&&c`<span class="sf-stab-tok">${z(o)}t</span>`}
        ${(l.files_modified||0)>0&&c`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${!l.ended_at&&c`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:c`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function hm({bar:t,x:e,y:s}){if(!t)return null;const n=t,l=n.tokens||{},o=gl(n);return c`<div class="tc-tooltip" style="left:${e}px;top:${s}px">
    <div style="font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
      <span class="tc-legend-swatch" style="background:${hl(o)}"></span>
      ${V(o)}
    </div>
    <div class="tc-tip-row"><span class="tc-tip-label">Time</span><span>${Io(n.ts)}</span></div>
    ${n.type==="user_message"&&n.message&&c`
      <div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Message</span>
        <span style="white-space:pre-wrap;max-height:120px;overflow:auto;font-size:var(--fs-xs)">${V((n.message||"").slice(0,300))}</span>
      </div>`}
    ${(n.type==="api_call"||n.type==="api_response")&&c`
      <div class="tc-tip-row"><span class="tc-tip-label">Model</span><span>${n.model||"?"}</span></div>`}
    ${n.type==="tool_use"&&c`
      <div class="tc-tip-row"><span class="tc-tip-label">Tool</span><span>${n.to||n.name||"?"}</span></div>
      ${n.params&&c`<div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Args</span>
        <span class="mono" style="font-size:var(--fs-xs);max-height:80px;overflow:auto">${V(String(n.params).slice(0,200))}</span>
      </div>`}`}
    ${n.type==="subagent"&&c`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${n.to||"?"}</span></div>`}
    ${n.duration_ms>0&&c`
      <div class="tc-tip-row"><span class="tc-tip-label">Duration</span><span>${um(n.duration_ms)}</span></div>`}
    ${l.input||l.output||l.cache_read?c`
      <div class="tc-tip-row"><span class="tc-tip-label">Tokens</span>
        <span>in:${z(l.input||0)} out:${z(l.output||0)}${l.cache_read?" cache:"+z(l.cache_read):""}${l.cache_creation?" cache_w:"+z(l.cache_creation):""}</span>
      </div>`:null}
    ${n.type==="error"&&c`
      <div class="tc-tip-row"><span class="tc-tip-label">Error</span><span style="color:var(--red)">${n.error_type||""}: ${(n.error_message||"").slice(0,100)}</span></div>`}
    ${n.type==="compaction"&&c`
      <div class="tc-tip-row"><span class="tc-tip-label">Count</span><span>#${n.compaction_count||""}</span></div>`}
    ${n.agent_name&&c`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${n.agent_name}</span></div>`}
  </div>`}function gm({summary:t}){if(!t||!t.total_tokens)return null;const e=[["Prompts",t.total_turns],["API Calls",t.total_api_calls],["Tools",t.total_tool_uses],["Tokens",z(t.total_tokens)],["Duration",Bc(t.duration_s)]].filter(([,s])=>s);return c`<div class="tc-summary">
    ${e.map(([s,n])=>c`<div class="tc-summary-item">
      <div class="tc-summary-val">${n}</div>
      <div class="tc-summary-label">${s}</div>
    </div>`)}
  </div>`}const al=110,$m=16,ur=al+$m,_m=30;function ym(t){const e=[];for(let s=0;s<t.length;s++){if(s>0){const n=t[s].ts-t[s-1].ts;n>_m&&e.push({type:"gap",endTs:t[s-1].ts,startTs:t[s].ts,gap:n})}e.push({type:"bar",bar:t[s]})}return e}function bm({entities:t,selected:e,onToggle:s,onAll:n,onNone:l}){return c`<div class="tc-filter">
    <span class="tc-filter-label">Entities</span>
    <button class="tc-filter-btn" onClick=${n}>All</button>
    <button class="tc-filter-btn" onClick=${l}>None</button>
    ${t.map(o=>{const a=e.has(o);return c`<label key=${o} class="tc-filter-check ${a?"active":""}"
        style="--swatch:${hl(o)}">
        <input type="checkbox" checked=${a}
          onChange=${()=>s(o)}/>
        <span class="tc-legend-swatch" style="background:${hl(o)}"></span>
        ${V(o)}
      </label>`})}
  </div>`}function km({mode:t,onChange:e}){return c`<div class="tc-filter">
    <span class="tc-filter-label">Tokens</span>
    ${[["all","All Tokens"],["fresh","Non-Cached"],["cached","Cached Only"]].map(([n,l])=>c`<label key=${n}
      class="tc-filter-check ${t===n?"active":""}">
      <input type="radio" name="tc-tok-mode" checked=${t===n}
        onChange=${()=>e(n)}/>
      ${l}
    </label>`)}
  </div>`}function xm({bars:t,tokenMode:e,onHover:s,onLeave:n}){if(!t.length)return c`<div class="empty-state" style="padding:var(--sp-8)">
    <p>No matching events.</p>
  </div>`;const l=ym(t),o=Math.max(1,...t.map(d=>dr(d,e))),a=[];l.forEach((d,f)=>{d.type==="bar"&&a.push(f)});const r=Math.max(1,Math.floor(a.length/Math.ceil(a.length/20))),i=new Set;return a.forEach((d,f)=>{(f===0||f===a.length-1||f%r===0)&&i.add(d)}),c`<div class="tc-flow">
    ${l.map((d,f)=>{if(d.type==="gap"){const F=Io(d.endTs)+" → "+Io(d.startTs)+"  ("+cr(d.gap)+" gap)";return c`<div key=${"g"+f} class="tc-flow-slot" style="height:${ur}px" title=${F}>
          <div class="tc-flow-gap-line" style="height:${al}px"></div>
          <div class="tc-flow-time">${cr(d.gap)}</div>
        </div>`}const p=d.bar,m=dr(p,e),g=o>0?Math.max(.08,Math.log1p(m)/Math.log1p(o)):.08,x=Math.max(6,g*al),E=gl(p),C=hl(E),b=ra(p),$=ca(p),k=b+$;let S,N;e==="cached"?(S=0,N=100):e==="fresh"?(S=100,N=0):k>0?(S=Math.round(b/k*100),N=100-S):(S=100,N=0);const A=N>0,M=i.has(f);return c`<div key=${f} class="tc-flow-slot" style="height:${ur}px"
        onMouseEnter=${F=>s(p,F)}
        onMouseLeave=${n}>
        <div class="tc-flow-bar-area" style="height:${al}px">
          <div class="tc-flow-fill ${A?"tc-split":""}"
            style="height:${x}px;--bar-color:${C}">
            ${A&&c`
              ${S>0&&c`<div class="tc-fill-fresh" style="height:${S}%"></div>`}
              <div class="tc-fill-cached" style="height:${S>0?N:100}%"></div>`}
          </div>
        </div>
        <div class="tc-flow-time">${M?jc(p.ts):""}</div>
      </div>`})}
  </div>`}function wm(){const{snap:t,globalRange:e,enabledTools:s}=jt(Rt),[n,l]=R([]),[o,a]=R(!0),[r,i]=R(null),[d,f]=R(null),[p,m]=R(null),[g,x]=R(!1),[E,C]=R(null),[b,$]=R(null),[k,S]=R("all"),N=Ot(null);lt(()=>{a(!0);const K=e?Math.min(e.since,Date.now()/1e3-86400):Date.now()/1e3-86400,rt=e==null?void 0:e.until;bl(null,{since:K,until:rt}).then(tt=>{tt.sort((J,Pt)=>(Pt.started_at||0)-(J.started_at||0)),l(tt),a(!1)}).catch(()=>a(!1))},[e]);const A=K=>s===null||s.includes(K),M=n.filter(K=>A(K.tool)),F=[...new Set(M.map(K=>K.tool))].sort();lt(()=>{(!r&&F.length>0||r&&!F.includes(r)&&F.length>0)&&i(F[0])},[F.join(",")]);const y=M.filter(K=>K.tool===r);lt(()=>{y.length>0&&(!d||!y.find(K=>K.session_id===d))&&f(y[0].session_id)},[r,y.length]),lt(()=>{if(!d){m(null);return}x(!0);const K=n.find(J=>J.session_id===d),rt=K!=null&&K.started_at?K.started_at-60:Date.now()/1e3-86400,tt=K!=null&&K.ended_at?K.ended_at+60:Date.now()/1e3+60;Vo(d,rt,tt).then(J=>{m(J),x(!1),$(null)}).catch(()=>{m(null),x(!1)})},[d]);const{allBars:T,allEntities:O}=at(()=>{const rt=((p==null?void 0:p.turns)||[]).filter(J=>["user_message","api_call","api_response","tool_use","compaction","subagent","error","hook"].includes(J.type)),tt=new Set;for(const J of rt)tt.add(gl(J));return{allBars:rt,allEntities:[...tt].sort()}},[p]),P=b||new Set(O),D=at(()=>T.filter(K=>P.has(gl(K))),[T,P]),q=ht(K=>{$(rt=>{const tt=new Set(rt||O);return tt.has(K)?tt.delete(K):tt.add(K),tt})},[O]),H=ht(()=>$(null),[]),U=ht(()=>$(new Set),[]),W=ht((K,rt)=>{var Jt;const tt=(Jt=N.current)==null?void 0:Jt.getBoundingClientRect();if(!tt)return;const J=Math.min(rt.clientX-tt.left+12,tt.width-320),Pt=rt.clientY-tt.top+12;C({bar:K,x:J,y:Pt})},[]),et=ht(()=>C(null),[]),st=(p==null?void 0:p.summary)||{};return c`<div class="tc-container" ref=${N}>
    <${vm} tools=${F} activeTool=${r} onSelect=${i}/>
    <${mm} sessions=${y} activeId=${d}
      onSelect=${f} loading=${o}/>
    <${gm} summary=${st}/>

    ${g?c`<div class="loading-state" style="padding:var(--sp-8)">Loading timeline...</div>`:T.length===0?c`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
          </div>`:c`
          <div class="tc-controls">
            <${bm} entities=${O} selected=${P}
              onToggle=${q} onAll=${H} onNone=${U}/>
            <${km} mode=${k} onChange=${S}/>
          </div>
          <${xm} bars=${D} tokenMode=${k}
            onHover=${W} onLeave=${et}/>
          ${E&&c`<${hm} bar=${E.bar} x=${E.x} y=${E.y}/>`}
        `}
  </div>`}const Sm={enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).",enabled:"Whether agent/agentic mode is active.",autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode allows the agent to execute tool calls without confirmation prompts. Use with caution.",autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.",skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",vimMode:"Enables Vim-style keybindings in the Gemini CLI.",approvalMode:"Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).",notifications:"Enables OS notifications for prompt alerts and session completion.",respectGeminiIgnore:"Controls whether the CLI respects patterns in .geminiignore files.",additionalIgnores:"Number of extra patterns added to the global file ignore list.",lineNumbers:"Shows line numbers in code blocks within the chat interface.",alternateScreen:"Uses the terminal alternate buffer to preserve shell scrollback history.",hideContext:"Hides the summary of attached files/context above the input prompt.",effort:"Reasoning effort level for the model (e.g., standard, high).",temperature:"Sampling temperature for model requests. 0 = deterministic; higher = more creative.",budget:"Maximum token budget for reasoning/extended thinking.",coreTools:"Number of built-in tools explicitly enabled for the agent.",excludeTools:"Number of tools explicitly disabled for safety or cost control.",customAgents:"Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks.",webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."};function Cm(t){return Sm[t]||""}function Tm({v:t}){return t===!0?c`<span style="color:var(--green);font-weight:600">on</span>`:t===!1?c`<span style="color:var(--red);opacity:0.8">off</span>`:t==null||t===""?c`<span class="text-muted">—</span>`:typeof t=="object"?c`<span class="mono" style="font-size:var(--fs-xs)">${JSON.stringify(t)}</span>`:c`<span class="mono">${String(t)}</span>`}function en({k:t,v:e,indent:s}){const n=t.replace(/([A-Z])/g," $1").replace(/^./,o=>o.toUpperCase()),l=Cm(t);return c`<div
    title=${l}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${s?"var(--sp-6)":"var(--sp-4)"};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${l?"help":"default"}">
    <span style="color:var(--fg2)">${n}${l?c`<span style="color:var(--fg3);margin-left:3px;font-size:var(--fs-xs)">?</span>`:""}</span>
    <${Tm} v=${e}/>
  </div>`}function Hc({otel:t}){if(!t||!t.enabled&&!t.source)return null;const e=t.enabled;return c`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:${e?"var(--green)":"var(--fg3)"};padding:var(--sp-2) var(--sp-4) var(--sp-1)">
      OpenTelemetry ${e?"● on":"○ off"}
    </div>
    <div style="border:1px solid ${e?"var(--green)":"var(--bg2)"};border-radius:4px;overflow:hidden;
                background:${e?"color-mix(in srgb,var(--green) 4%,transparent)":"transparent"}">
      ${e&&c`<${en} k="exporter" v=${t.exporter||"—"}/>`}
      ${t.endpoint&&c`<${en} k="endpoint" v=${t.endpoint}/>`}
      ${t.file_path&&c`<${en} k="file_path" v=${t.file_path}/>`}
      ${t.capture_content!==void 0&&c`<${en} k="capture_content" v=${!!t.capture_content}/>`}
      ${!e&&t.source&&c`<${en} k="source" v=${t.source}/>`}
    </div>
  </div>`}function No({name:t,items:e}){const s=Object.entries(e);return s.length?c`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${t}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${s.map(([n,l])=>c`<${en} key=${n} k=${n} v=${l}/>`)}
    </div>
  </div>`:null}function Mm({cfg:t,label:e}){var r,i;const s=me[t.tool]||"🔹",n=Dt[t.tool]||"var(--fg2)",l=Object.entries(t.feature_groups||{}),o=Object.entries(t.settings||{}).filter(([d])=>!["agent_historySummarizationMode","agent_maxRequests","debug_requestLoggerMaxEntries","planModel","implementModel"].includes(d));return((r=t.otel)==null?void 0:r.enabled)||((i=t.otel)==null?void 0:i.source)||l.length||o.length||(t.hints||[]).length||(t.mcp_servers||[]).length||(t.extensions||[]).length?c`<div style="background:var(--bg);border:2px solid ${n};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${n} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${n}">
      <span>${s}</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${n}">${e||t.tool}</span>
      ${t.model&&c`<span class="badge mono">${t.model}</span>`}
      ${t.auto_update===!0&&c`<span class="badge">auto-update on</span>`}
      ${t.auto_update===!1&&c`<span class="badge" style="opacity:0.6">auto-update off</span>`}
      ${t.launch_at_startup===!0&&c`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${t.launch_at_startup===!1&&c`<span class="badge" style="opacity:0.6">no auto-start</span>`}
    </div>
    <div style="padding:var(--sp-4);flex:1">
      <${Hc} otel=${t.otel}/>
      ${l.map(([d,f])=>c`<${No} key=${d} name=${d} items=${f}/>`)}
      ${o.length>0&&c`<${No} name="Settings" items=${Object.fromEntries(o)}/>`}
      ${(t.mcp_servers||[]).length>0&&c`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">MCP Servers</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${t.mcp_servers.map(d=>c`<span key=${d} class="pill mono">${d}</span>`)}
        </div>
      </div>`}
      ${(t.extensions||[]).length>0&&c`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Extensions</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${t.extensions.map(d=>c`<span key=${d} class="pill mono" style="font-size:var(--fs-2xs)">${d}</span>`)}
        </div>
      </div>`}
      ${(t.hints||[]).length>0&&c`<div style="padding:var(--sp-3) var(--sp-4);border-left:3px solid var(--orange);
          background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
        ${t.hints.map((d,f)=>c`<div key=${f} class="text-orange" style="font-size:var(--fs-sm);padding:1px 0">
          <span style="margin-right:var(--sp-2)">💡</span>${d}
        </div>`)}
      </div>`}
    </div>
  </div>`:null}function Dm({cfg:t}){var o,a,r,i;if(!t)return null;const e=Object.entries(t.feature_groups||{});if(!e.length&&!((o=t.otel)!=null&&o.enabled)&&!((a=t.otel)!=null&&a.source))return null;const n=(((r=t.feature_groups)==null?void 0:r.Safety)||{}).globalAutoApprove===!0,l=(((i=t.feature_groups)==null?void 0:i.Agent)||{}).autoReply===!0;return c`<div style="background:var(--bg);border:2px solid #007acc;border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,#007acc 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid #007acc">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:#007acc">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${n&&c`<span class="badge" style="margin-left:auto;background:var(--red);color:#fff;font-weight:700"><${pl} name="alert-triangle" size="0.9em"/> YOLO MODE ON</span>`}
      ${!n&&l&&c`<span class="badge" style="margin-left:auto;background:var(--orange);color:#fff"><${pl} name="alert-triangle" size="0.9em"/> auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${Hc} otel=${t.otel}/>
      ${e.map(([d,f])=>c`<${No} key=${d} name=${d} items=${f}/>`)}
    </div>
  </div>`}function Em({snap:t}){var l,o,a;const e=Dt.aictl||"#94a3b8",s=Object.entries(((l=t==null?void 0:t.live_monitor)==null?void 0:l.diagnostics)||{}),n=[...((o=t==null?void 0:t.live_monitor)==null?void 0:o.workspace_paths)||[],...((a=t==null?void 0:t.live_monitor)==null?void 0:a.state_paths)||[]];return!s.length&&!n.length?null:c`<div style="background:var(--bg);border:2px solid ${e};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${e} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${e}">
      <span><${pl} name="settings" size="1em"/></span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${e}">aictl</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">monitoring engine</span>
    </div>
    <div style="padding:var(--sp-4);flex:1">
      ${s.length>0&&c`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Collectors</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
          ${s.map(([r,i])=>{const d=i.status==="active";return c`<div key=${r} title=${i.detail||""} style="display:flex;align-items:baseline;gap:var(--sp-4);padding:3px var(--sp-4);
                font-size:var(--fs-sm);border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);cursor:help">
              <span class="mono" style="flex:1">${r}</span>
              <span style="color:var(--fg3)">${i.mode||""}</span>
              <span style="color:${d?"var(--green)":"var(--orange)"}">
                ${d?"●":"○"} ${i.status||"unknown"}
              </span>
            </div>`})}
        </div>
      </div>`}
      ${n.length>0&&c`<div>
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Monitored Roots</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4)">
          ${n.map((r,i)=>c`<div key=${i} class="mono text-muted" style="font-size:var(--fs-xs);padding:1px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${r}>${r}</div>`)}
        </div>
      </div>`}
    </div>
  </div>`}function Lm(){const{snap:t}=jt(Rt),e=at(()=>t!=null&&t.tool_configs?t.tool_configs:[],[t]),s=at(()=>{const o={};return((t==null?void 0:t.tools)||[]).forEach(a=>{o[a.tool]=a.label}),o},[t]);if(!t)return c`<p class="loading-state">Loading...</p>`;if(!e.length)return c`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const n=e.find(o=>o.tool==="vscode"),l=e.filter(o=>o.tool!=="vscode");return c`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${n&&c`<${Dm} cfg=${n}/>`}
    ${l.map(o=>c`<${Mm} key=${o.tool} cfg=${o} label=${s[o.tool]||o.tool}/>`)}
    <${Em} snap=${t}/>
  </div>`}const Qn={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},Am=["project","global","shadow","session","external"],Xn=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function Om(t,e){const s=Ds(t),n=Ds(e);if(!s)return"(unknown)";if(n&&s.startsWith(n+"/")){const l=s.slice(n.length+1).split("/")[0];return l.startsWith(".")?"(root)":l}return s.includes("/.claude/projects/")?"(shadow)":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")?"(global)":"(other)"}function Pm(t){if(!t)return"unknown";const e=Ds(t).split("/"),s=e.pop()||"unknown",n=s.lastIndexOf("."),l=n>0?s.slice(0,n):s;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test(l)){const o=e.pop();if(o)return o}return l}function zm(){const{snap:t}=jt(Rt),[e,s]=R(null),n=at(()=>{if(!t)return null;const o=t.tools.filter(C=>C.tool!=="aictl"&&C.tool!=="any");if(!o.length)return null;const a=t.root||"",r={},i={},d={},f={yes:0,"on-demand":0,conditional:0,no:0};let p=0;for(const C of o)for(const b of C.files){const $=b.kind||"other",k=b.scope||"external",S=(b.sent_to_llm||"no").toLowerCase(),N=b.tokens||0,A=Om(b.path,a),M=Pm(b.path);r[$]||(r[$]={tokens:0,files:0,projects:{}}),r[$].tokens+=N,r[$].files+=1,r[$].projects[A]||(r[$].projects[A]={tokens:0,count:0}),r[$].projects[A].tokens+=N,r[$].projects[A].count+=1,d[A]||(d[A]={tokens:0,count:0,cats:{}}),d[A].tokens+=N,d[A].count+=1,d[A].cats[$]||(d[A].cats[$]={tokens:0,count:0,items:{}}),d[A].cats[$].tokens+=N,d[A].cats[$].count+=1,d[A].cats[$].items[M]||(d[A].cats[$].items[M]=0),d[A].cats[$].items[M]+=N,i[k]||(i[k]={tokens:0,files:0}),i[k].tokens+=N,i[k].files+=1,f[S]!==void 0?f[S]+=N:f.no+=N,p+=N}const m=Object.entries(r).sort((C,b)=>b[1].tokens-C[1].tokens),g=Am.filter(C=>i[C]).map(C=>[C,i[C]]),x=Object.entries(d).sort((C,b)=>b[1].tokens-C[1].tokens),E=o.map(C=>({tool:C.tool,label:C.label,tokens:C.files.reduce((b,$)=>b+$.tokens,0),files:C.files.length,sentYes:C.files.filter(b=>(b.sent_to_llm||"").toLowerCase()==="yes").reduce((b,$)=>b+$.tokens,0)})).filter(C=>C.tokens>0).sort((C,b)=>b.tokens-C.tokens).slice(0,8);return{cats:m,scopes:g,byPolicy:f,totalTokens:p,perTool:E,byCat:r,byProj:d,projList:x}},[t]);if(!n)return c`<p class="empty-state">No file data available.</p>`;if(!n.totalTokens)return c`<p class="empty-state">No token data collected yet.</p>`;const l=Math.max(...n.cats.map(([,o])=>o.tokens),1);return c`<div class="diag-card" role="region" aria-label="Context window map">
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
        ${n.cats.map(([o,a])=>{const r=a.tokens/n.totalTokens*100;return r<.5?null:c`<div key=${o} style="width:${r}%;background:${Qn[o]||"var(--fg2)"};
            position:relative;min-width:2px"
            title="${o}: ${z(a.tokens)} tokens (${a.files} files)">
            ${r>8?c`<span class="text-ellipsis text-bold" style="position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;font-size:var(--fs-2xs);color:var(--bg);padding:0 2px">${o}</span>`:null}
          </div>`})}
      </div>
    </div>

    <!-- Per-category bars with project sub-segments -->
    <div class="mb-md">
      ${n.cats.map(([o,a])=>{const r=Object.entries(a.projects).sort((d,f)=>f[1].tokens-d[1].tokens),i=a.tokens/l*100;return c`<div key=${o} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);font-size:var(--fs-base)">
          <span class="text-bold text-right" style="width:80px;color:${Qn[o]||"var(--fg2)"};flex-shrink:0">${o}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${i}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${r.map(([d,f],p)=>{const m=a.tokens>0?f.tokens/a.tokens*100:0;if(m<.5)return null;const g=!e||e===d;return c`<div key=${d} style="width:${m}%;height:100%;
                  background:${Qn[o]||"var(--fg2)"};
                  opacity:${g?Math.max(.3,1-p*.12):.12};
                  border-right:1px solid var(--bg);
                  display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px;
                  cursor:pointer;transition:opacity 0.15s"
                  title="${d}: ${z(f.tokens)} tok (${f.count} files)"
                  onClick=${()=>s(e===d?null:d)}>
                  ${m>12&&i>15?c`<span style="font-size:var(--fs-2xs);color:var(--bg);
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
      ${n.projList.map(([o,a])=>{const r=e===o;return c`<button key=${o}
          style="cursor:pointer;padding:var(--sp-1) var(--sp-3);font-size:var(--fs-sm);
            background:${r?"var(--accent)":"transparent"};
            color:${r?"var(--bg)":"var(--fg2)"};
            border:1px solid ${r?"var(--accent)":"var(--border)"};
            border-radius:4px 4px 0 0;font-weight:${r?600:400};border-bottom:none"
          onClick=${()=>s(r?null:o)}>
          ${o} (${z(a.tokens)})
        </button>`})}
    </div>

    <!-- Tab content: per-category bars with item sub-segments -->
    ${e&&n.byProj[e]?(()=>{const o=n.byProj[e],a=Object.entries(o.cats).sort((i,d)=>d[1].tokens-i[1].tokens),r=Math.max(...a.map(([,i])=>i.tokens),1);return c`<div class="mb-md" style="background:var(--bg2);border-radius:6px;padding:var(--sp-4)">
        <div class="es-section-title">${e} \u2014 ${z(o.tokens)} tokens across ${o.count} files</div>
        ${a.map(([i,d])=>{const f=Object.entries(d.items).sort((x,E)=>E[1]-x[1]),p=f.slice(0,15),m=f.slice(15).reduce((x,[,E])=>x+E,0);m>0&&p.push(["(other)",m]);const g=d.tokens/r*100;return c`<div key=${i} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${Qn[i]||"var(--fg2)"};flex-shrink:0">${i}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${g}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${p.map(([x,E],C)=>{const b=d.tokens>0?E/d.tokens*100:0;if(b<.3)return null;const $=Xn[C%Xn.length];return c`<div key=${x} style="width:${b}%;height:100%;background:${$};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${x}: ${z(E)} tok">
                      ${b>10&&g>20?c`<span style="font-size:var(--fs-2xs);color:#111;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:700">${x}</span>`:null}
                    </div>`})}
                </div>
              </div>
              <span class="text-right text-muted" style="min-width:55px">${z(d.tokens)} tok</span>
              <span class="text-right text-muted" style="min-width:30px">${d.count}f</span>
            </div>
            <!-- Item legend -->
            <div style="padding-left:88px;display:flex;flex-wrap:wrap;gap:var(--sp-1) var(--sp-3);margin-top:3px">
              ${p.map(([x,E],C)=>c`<span key=${x}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${Xn[C%Xn.length]};flex-shrink:0"></span>
                <span class="text-muted">${x} ${z(E)}</span>
              </span>`)}
            </div>
          </div>`})}
      </div>`})():null}

    <!-- Scope + Per-tool side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-8)">
      <div>
        <div class="es-section-title">By Scope</div>
        ${n.scopes.map(([o,a])=>c`<div key=${o} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span class="text-bold">${o}</span>
          <span class="text-muted">${a.files} files \u00B7 ${z(a.tokens)} tok</span>
        </div>`)}
      </div>
      <div>
        <div class="es-section-title">By Tool</div>
        ${n.perTool.map(o=>c`<div key=${o.tool} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span><span style="color:${Dt[o.tool]||"var(--fg2)"}">${me[o.tool]||"🔹"}</span> ${V(o.label)}</span>
          <span class="text-muted">${z(o.sentYes)} sent \u00B7 ${z(o.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}const Fm={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"};function Im(t){if(!t||t<0)return"—";const e=Math.floor(t/3600),s=Math.floor(t%3600/60);return e>0?`${e}h ${s}m`:`${s}m`}function Nm(){var m,g,x,E,C;const{snap:t}=jt(Rt),[e,s]=R(null),[n,l]=R(null);lt(()=>{let b=!0;const $=()=>{Ar().then(S=>{b&&s(S)}).catch(()=>{}),qd().then(S=>{b&&l(S)}).catch(()=>{})};$();const k=setInterval($,15e3);return()=>{b=!1,clearInterval(k)}},[]);const o=at(()=>{if(!t)return[];const b=t.tool_telemetry||[];return t.tools.filter($=>$.tool!=="aictl"&&$.tool!=="any").map($=>{var F,y,T,O,P;const k=b.find(D=>D.tool===$.tool),S=$.live||{},N=S.last_seen_at||0,A=N>0?Math.floor(Date.now()/1e3-N):-1,M=A>3600||A<0;return{tool:$.tool,label:$.label,source:(k==null?void 0:k.source)||(S.session_count?"live-monitor":"discovery"),confidence:(k==null?void 0:k.confidence)||((F=S.token_estimate)==null?void 0:F.confidence)||0,inputTokens:(k==null?void 0:k.input_tokens)||0,outputTokens:(k==null?void 0:k.output_tokens)||0,cost:(k==null?void 0:k.cost_usd)||0,sessions:(k==null?void 0:k.total_sessions)||S.session_count||0,errors:((y=k==null?void 0:k.errors)==null?void 0:y.length)||0,lastError:((T=k==null?void 0:k.errors)==null?void 0:T[0])||null,lastSeen:A,stale:M,fileCount:$.files.length,procCount:$.processes.length,hasLive:!!$.live,hasOtel:!!((P=(O=S.sources||[]).includes)!=null&&P.call(O,"otel"))}}).sort(($,k)=>k.inputTokens+k.outputTokens-($.inputTokens+$.outputTokens))},[t]),a=at(()=>{var b;return(b=t==null?void 0:t.live_monitor)!=null&&b.diagnostics?Object.entries(t.live_monitor.diagnostics).map(([$,k])=>({name:$,status:k.status||"unknown",mode:k.mode||"",detail:k.detail||""})):[]},[t]);if(!t)return null;const r=o.length,i=o.filter(b=>b.inputTokens+b.outputTokens>0).length,d=o.filter(b=>b.hasLive).length,f=o.filter(b=>b.stale&&b.hasLive).length,p=o.reduce((b,$)=>b+$.errors,0);return c`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--bg)">${i}/${r} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--bg)">${d} live</span>
      ${f>0?c`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--bg)">${f} stale</span>`:null}
      ${p>0?c`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--bg)">${p} errors</span>`:null}
      ${e!=null&&e.active?c`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--bg)">OTel active</span>`:c`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${n?c`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">aictl Monitor Service <span class="text-muted text-xs">(self)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">CPU</div>
          <div class="metric-chip-value">${_t(n.cpu_percent||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Memory (RSS)</div>
          <div class="metric-chip-value">${$t(n.memory_rss_bytes||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Size</div>
          <div class="metric-chip-value">${$t(((m=n.db)==null?void 0:m.file_size_bytes)||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Uptime</div>
          <div class="metric-chip-value">${Im(n.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${n.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${z((((g=n.db)==null?void 0:g.metrics_count)||0)+(((x=n.db)==null?void 0:x.tool_metrics_count)||0)+(((E=n.db)==null?void 0:E.events_count)||0)+(((C=n.db)==null?void 0:C.samples_count)||0))}</div>
        </div>
      </div>
      ${n.sink?c`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
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
      ${n.sink.is_flooding?c`<div style="margin-top:var(--sp-2);padding:var(--sp-2) var(--sp-3);background:rgba(248,113,113,0.15);border:1px solid var(--red);border-radius:4px;color:var(--red);font-size:var(--fs-xs);font-weight:600">
        DATA LOSS: Flood protection active \u2014 dropping samples (>${n.sink.total_dropped} lost)
      </div>`:null}`:null}
      <div class="text-xs text-muted" style="margin-top:var(--sp-1)">
        PID ${n.pid} \u00b7 These metrics are about the aictl monitoring service itself, not the AI tools it monitors.
      </div>
    </div>`:null}

    <!-- OTel receiver stats -->
    ${e?c`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">OTel Receiver</div>
      <div class="flex-row gap-md flex-wrap">
        <span>Metrics: <strong>${e.metrics_received||0}</strong></span>
        <span>Events: <strong>${e.events_received||0}</strong></span>
        <span>API calls: <strong>${e.api_calls_total||0}</strong></span>
        ${e.api_errors_total>0?c`<span class="text-red">Errors: <strong>${e.api_errors_total}</strong></span>`:null}
        ${e.errors>0?c`<span class="text-orange">Parse errors: <strong>${e.errors}</strong></span>`:null}
        ${e.last_receive_at>0?c`<span class="text-muted">Last: ${Be(e.last_receive_at)}</span>`:null}
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
          <tbody>${o.map(b=>{var $;return c`<tr key=${b.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${b.stale&&!b.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <span style="color:${Dt[b.tool]||"var(--fg2)"}">${me[b.tool]||"🔹"}</span>
              ${V(b.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${b.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${b.confidence>=.9?"var(--green)":b.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${b.confidence>0?_t(b.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${b.inputTokens?z(b.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${b.outputTokens?z(b.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${b.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${b.errors>0?c`<span class="text-red" title=${(($=b.lastError)==null?void 0:$.message)||""}>${b.errors}</span>`:c`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${b.lastSeen>=0?c`<span style="color:${b.stale?"var(--orange)":"var(--fg2)"}">${Be(Date.now()/1e3-b.lastSeen)}</span>`:c`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${b.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Collector pipeline status -->
    ${a.length>0?c`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${a.map(b=>c`<div key=${b.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${Fm[b.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${b.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${b.status}</span>
          </div>
          ${b.detail?c`<div class="text-xs text-muted" style="margin-top:2px">${V(b.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let ho=null;function Rm(){return ho?Promise.resolve(ho):Vd().then(t=>{const e={};for(const s of t||[])e[s.key]=s;return ho=e,e}).catch(()=>({}))}function jm(t){if(!t)return"";const e=t.replace(/\s+/g," ").trim(),s=e.match(/^[^.!?]+[.!?]/);return s?s[0].trim():e.slice(0,120)}const Bm={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},Hm={raw:"raw",deduced:"deduced",aggregated:"agg"};function Wm(){const[t,e]=R(null),[s,n]=R({x:0,y:0}),[l,o]=R(!1),a=Ot(null),r=Ot(null),i=ht(C=>{const b=C.getAttribute("data-dp");b&&Rm().then($=>{const k=$[b];if(!k)return;const S=C.getBoundingClientRect();n({x:S.left,y:S.bottom+4}),e(k),o(!1)})},[]),d=ht(()=>{r.current=setTimeout(()=>{e(null),o(!1)},120)},[]),f=ht(()=>{r.current&&(clearTimeout(r.current),r.current=null)},[]);if(lt(()=>{function C(k){const S=k.target.closest("[data-dp]");S&&(f(),i(S))}function b(k){k.target.closest("[data-dp]")&&d()}function $(k){k.target.closest("[data-dp]")&&t&&(k.preventDefault(),o(N=>!N))}return document.addEventListener("mouseover",C,!0),document.addEventListener("mouseout",b,!0),document.addEventListener("click",$,!0),()=>{document.removeEventListener("mouseover",C,!0),document.removeEventListener("mouseout",b,!0),document.removeEventListener("click",$,!0)}},[i,d,f,t]),!t)return null;const m=Math.min(s.x,window.innerWidth-320-8),g=Math.min(s.y,window.innerHeight-180),x=Hm[t.source_type]||t.source_type,E=Bm[t.unit]||t.unit;return c`<div class="dp-tooltip" ref=${a}
    style=${"left:"+m+"px;top:"+g+"px"}
    onMouseEnter=${f} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${t.key}</span>
      <span class="dp-tooltip-badge dp-badge-${t.source_type}">${x}</span>
      ${E&&c`<span class="dp-tooltip-unit">${E}</span>`}
    </div>
    <div class="dp-tooltip-body">${jm(t.explanation)}</div>
    ${l&&c`<div class="dp-tooltip-detail">
      <div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Source</div>
        <div>${t.source_static||t.source||"—"}</div>
      </div>
      ${t.source_dynamic&&c`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Live provenance</div>
        <div>${typeof t.source_dynamic=="string"?t.source_dynamic:JSON.stringify(t.source_dynamic)}</div>
      </div>`}
      ${t.query&&c`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Query</div>
        <code class="dp-tooltip-code">${t.query}</code>
      </div>`}
      ${t.otel_metric&&c`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">OTel metric</div>
        <code>${t.otel_metric}</code>
      </div>`}
    </div>`}
    ${!l&&c`<div class="dp-tooltip-hint">click for details</div>`}
  </div>`}class pr extends Dn{constructor(e){super(e),this.state={hasError:!1,error:null}}static getDerivedStateFromError(e){return{hasError:!0,error:e}}componentDidCatch(e,s){console.error("Dashboard error:",e,s)}render(){var e;return this.state.hasError?c`<div class="text-red" style="padding:var(--sp-10)">
        <h3>Something went wrong</h3>
        <pre style="font-size:var(--fs-md);margin-top:var(--sp-5)">${((e=this.state.error)==null?void 0:e.message)||"Unknown error"}</pre>
        <button class="prev-btn" style="margin-top:var(--sp-5)" onClick=${()=>this.setState({hasError:!1,error:null})}>Try again</button>
      </div>`:this.props.children}}function Ro({label:t,value:e,accent:s,dp:n,sm:l}){const o=Ot(e),[a,r]=R(!1);return lt(()=>{o.current!==e&&(r(!0),setTimeout(()=>r(!1),500)),o.current=e},[e]),c`<div class=${"metric"+(l?" metric--sm":"")} aria-label="${t}: ${e}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${t}</div>
    <div class=${"value"+(s?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${e}</div>
  </div>`}function fr({snap:t,mode:e}){if(!t)return null;const s=!e||e==="files",n=!e||e==="traffic",l=t.tools.filter(i=>i.tool!=="aictl"&&i.files.length),o=l.reduce((i,d)=>i+d.files.length,0)||1,a=t.tools.filter(i=>i.tool!=="aictl"&&i.live&&(i.live.outbound_rate_bps||i.live.inbound_rate_bps)),r=a.reduce((i,d)=>i+(d.live.outbound_rate_bps||0)+(d.live.inbound_rate_bps||0),0)||1;return c`
    ${s&&l.length>0&&c`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+l.map(i=>i.label+" "+i.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${l.map(i=>c`
        <div class="rbar-seg" style=${"width:"+(i.files.length/o*100).toFixed(1)+"%;background:"+(Dt[i.tool]||"var(--fg2)")}
          title="${i.label}: ${i.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${l.map(i=>c`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Dt[i.tool]||"var(--fg2)")}></span>
          ${i.label} <span class="text-muted">${i.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${n&&c`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(a.length?a.map(i=>i.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${a.length===0?" — no active traffic":""}</div>
      <div class="rbar">${a.map(i=>{const d=(i.live.outbound_rate_bps||0)+(i.live.inbound_rate_bps||0);return c`<div class="rbar-seg" style=${"width:"+(d/r*100).toFixed(1)+"%;background:"+(Dt[i.tool]||"var(--fg2)")}
          title="${i.label}: ${je(d)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(i=>{const d=(i.live.outbound_rate_bps||0)+(i.live.inbound_rate_bps||0);return c`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Dt[i.tool]||"var(--fg2)")}></span>
          ${i.label} <span class="text-muted">${je(d)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!e&&!l.length&&!a.length&&c`<div class="empty-state">No AI tool resources found yet.</div>`}`}function qm({perCore:t}){if(!t||!t.length)return null;const e=100;return c`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${t.map((s,n)=>{const l=Math.max(1,s/e*100),o=s>80?"var(--red)":s>50?"var(--orange)":s>20?"var(--green)":"var(--fg2)";return c`<div key=${n} title=${"Core "+n+": "+_t(s)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+l+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function Vm({mcpDetail:t}){return t!=null&&t.length?c`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${t.map(e=>{const s=Kd[e.status]||"var(--fg3)",n=Dt[e.tool]||"var(--fg3)";return c`<div key=${e.name+e.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${e.status+(e.pid?" PID "+e.pid:"")+(e.transport?" · "+e.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${s}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${V(e.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${n};white-space:nowrap;flex-shrink:0">${V(e.tool)}</span>
      </div>`})}
  </div>`:c`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`}function Um({label:t,value:e,mcpDetail:s}){const[n,l]=R(!1);return c`<div style="position:relative;cursor:default"
    onMouseEnter=${()=>l(!0)} onMouseLeave=${()=>l(!1)}>
    <${Ro} label=${t} value=${e} sm=${!0}/>
    ${n&&c`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      <${Vm} mcpDetail=${s}/>
    </div>`}
  </div>`}function Gm({snap:t,history:e}){const[s,n]=R(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),l=ht(()=>{n(i=>{const d=!i;try{localStorage.setItem("aictl-header-expanded",String(d))}catch{}return d})},[]),o=i=>e!=null&&e.ts&&e.ts.length>=2?[e.ts,e[i]]:null,a=(t==null?void 0:t.cpu_cores)||1,r={cores:a};return c`
    <div class="grid-sparklines">
      ${nl.sparklines.map(i=>{const d=t?t["total_"+i.field]??t[i.field]??"":"",f=lo(d,i.format,i.suffix,i.multiply),p=i.yMaxExpr?ti(i.yMaxExpr,r):void 0,m=(i.refLines||[]).map(g=>({value:ti(g.valueExpr,r),label:(g.label||"").replace("{cores}",a)})).filter(g=>g.value!=null);return c`<${es} key=${i.field} label=${i.label} value=${f}
          data=${o(i.field)} chartColor=${i.color||"var(--accent)"}
          smooth=${!!i.smooth} refLines=${m.length?m:void 0}
          yMax=${p} dp=${i.dp}/>`})}
    </div>

    <div class=${s?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>
      <div class="mb-sm header-top-row">
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${qm} perCore=${(t==null?void 0:t.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${fr} snap=${t} mode="traffic"/></div>
        </div>
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${nl.liveMetrics.map(i=>{const d=t?t[i.field]??"":"",f=lo(d,i.format,i.suffix,i.multiply);return c`<${Ro} key=${i.field} label=${i.label} value=${f}
                accent=${!!i.accent} dp=${i.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div class="grid-inventory">
          ${nl.inventory.map(i=>{const d=t?t[i.field]??"":"",f=lo(d,i.format,i.suffix,i.multiply);return i.field==="total_mcp_servers"?c`<${Um} key=${i.field} label=${i.label} value=${f}
                mcpDetail=${(t==null?void 0:t.mcp_detail)||[]}/>`:c`<${Ro} key=${i.field} label=${i.label} value=${f}
              accent=${!!i.accent} dp=${i.dp} sm=${!0}/>`})}
        </div>
      </div>
      <div class="mb-sm"><${fr} snap=${t} mode="files"/></div>
    </div>
    <button class="header-toggle" onClick=${l} aria-label="Toggle details">
      ${s?"▲ less":"▼ more"}
    </button>
  `}function tl(t){const e=new Date(t*1e3),s=e.getTimezoneOffset();return new Date(e.getTime()-s*6e4).toISOString().slice(0,16)}function Ym({globalRange:t,onPreset:e,onApplyCustom:s}){const[n,l]=R(!1),o=Ot(null),a=Ot(null),r=ht(()=>{l(!0),requestAnimationFrame(()=>{if(!(!o.current||!a.current))if(t.until!=null)o.current.value=tl(t.since),a.current.value=tl(t.until);else{const d=ul.find(m=>m.id===t.id),f=Date.now()/1e3,p=(d==null?void 0:d.seconds)||86400;o.current.value=tl(f-p),a.current.value=tl(f)}})},[t]),i=ht(()=>{var g,x;const d=(g=o.current)==null?void 0:g.value,f=(x=a.current)==null?void 0:x.value;if(!d||!f)return;const p=new Date(d).getTime()/1e3,m=new Date(f).getTime()/1e3;!Number.isFinite(p)||!Number.isFinite(m)||m<=p||(s(p,m),l(!1))},[s]);return c`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${ul.map(d=>c`<button key=${d.id}
        class=${t.id===d.id&&!n?"range-btn active":"range-btn"}
        onClick=${()=>{e(d.id),l(!1)}}>${d.label}</button>`)}
      <button class=${n||t.id==="custom"?"range-btn active":"range-btn"}
        onClick=${r}>Custom</button>
    </div>
    ${n&&c`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${o} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${a} /></label>
      <button class="range-btn active" onClick=${i} style="font-weight:600">Apply</button>
    </div>`}
  </div>`}const Km=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]);function Jm({snap:t,enabledTools:e,onToggle:s,onSetAll:n}){if(!t)return null;const l=t.tools.filter(a=>!a.meta);if(!l.length)return null;const o=e===null;return c`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${o}
        onChange=${()=>n(o?[]:null)} />
      <span class="text-muted">All (${l.length})</span>
    </label>
    ${l.sort((a,r)=>a.label.localeCompare(r.label)).map(a=>{const r=Km.has(a.tool),i=e===null||e.includes(a.tool),d=Dt[a.tool]||"var(--fg2)",f=me[a.tool]||"🔹";return c`<label key=${a.tool}
        class=${"tool-filter-item"+(r?"":" tool-unverified")}
        title=${r?"":"Not yet verified — discovery only"}>
        <input type="checkbox" checked=${i} disabled=${!r}
          onChange=${()=>r&&s(a.tool)} />
        <span style=${"color:"+d}>${f}</span>
        <span>${a.label}</span>
      </label>`})}
  </div>`}function go(t,e){try{const s=localStorage.getItem("aictl-pref-"+t);return s!=null?JSON.parse(s):e}catch{return e}}const Zm={live:3600,"1h":3600,"6h":21600,"24h":86400,"7d":604800};go("active_tab","overview"),(()=>{const t=go("range","live"),e=Zm[t]||3600;return{id:t,since:Date.now()/1e3-e,until:null}})(),(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),go("tool_filter",null);const Wc=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]),At=({tabName:t,children:e})=>c`<${pr} key=${t}>${e}</${pr}>`;function Qm(t,e){lt(()=>{const s=n=>{var l;n.key==="Escape"&&e(null),n.key==="/"&&document.activeElement!==t.current&&(n.preventDefault(),(l=t.current)==null||l.focus())};return document.addEventListener("keydown",s),()=>document.removeEventListener("keydown",s)},[t,e])}function Xm(){const[t,e]=R(!1);return lt(()=>{let s=!0;const n=()=>Ar().then(o=>{s&&e(o.active||!1)}).catch(()=>{s&&e(!1)});n();const l=setInterval(n,3e4);return()=>{s=!1,clearInterval(l)}},[]),t}function th(t){const[e,s]=R(null),[n,l]=R([]);return lt(()=>{const{id:o,since:a,until:r}=t;o==="live"?s(null):o!=="custom"?Pn({range:o}).then(s).catch(()=>{}):Pn({since:a,until:r}).then(s).catch(()=>{}),qo({since:a,until:r}).then(l).catch(()=>{})},[t]),{dbHistory:e,events:n}}function eh(t){var a;if(!t)return[];const e=[];let s=0,n=0,l=0,o=0;for(const r of t.tools||[])for(const i of r.processes||[]){const d=parseFloat(i.mem_mb)||0,f=(i.process_type||"").toLowerCase();(f==="subagent"||f==="agent")&&(s+=d),f==="mcp-server"&&i.zombie_risk&&i.zombie_risk!=="none"&&n++,(f==="browser"||(i.name||"").toLowerCase().includes("headless"))&&l++,(a=i.anomalies)!=null&&a.length&&(o+=i.anomalies.length)}return s>2048&&e.push({level:"red",msg:`Subagent memory: ${$t(s*1048576)} (>2GB) — consider cleanup`}),n>0&&e.push({level:"orange",msg:`${n} MCP server(s) with dead parent — may be orphaned`}),l>0&&e.push({level:"yellow",msg:`${l} headless browser process(es) detected — check for leaks`}),o>5&&e.push({level:"orange",msg:`${o} process anomalies detected`}),e}function sh(t,e,s){if(!t)return t;let n=t.tools.filter(l=>Wc.has(l.tool)||l.tool==="aictl");if(e!==null&&(n=n.filter(l=>e.includes(l.tool)||l.tool==="aictl")),s){const l=s.toLowerCase();n=n.filter(o=>o.label.toLowerCase().includes(l)||o.tool.toLowerCase().includes(l)||o.vendor&&o.vendor.toLowerCase().includes(l)||o.files.some(a=>a.path.toLowerCase().includes(l))||o.processes.some(a=>(a.name||"").toLowerCase().includes(l)||(a.cmdline||"").toLowerCase().includes(l))||o.live&&((o.live.workspaces||[]).some(a=>a.toLowerCase().includes(l))||(o.live.sources||[]).some(a=>a.toLowerCase().includes(l))))}return{...t,tools:n}}function nh(){var H;const{snapshot:t,history:e,connected:s}=uu(),{range:n,setPreset:l,setCustom:o}=vu(),{activeTab:a,setActiveTab:r,tabs:i}=_u(),{theme:d,cycleTheme:f}=bu();xu();const p=at(()=>t?t.tools.filter(U=>U.tool!=="aictl"&&U.tool!=="any"&&Wc.has(U.tool)).map(U=>U.tool):[],[t]),{selectedTools:m,toggleTool:g,setTools:x}=hu(p),[E,C]=R(""),[b,$]=R(null),k=Ot(null);Qm(k,$);const S=Xm(),{dbHistory:N,events:A}=th(n),M=n.id==="live"?e:N||e,F=n.until?n.until-n.since:Ir[n.id]||3600,y=ht(U=>$(U),[]),T=at(()=>sh(t,m,E),[t,m,E]),O=at(()=>{var et;const U=Date.now()/1e3-300,W=new Map;for(const st of A)if(st.kind==="file_modified"&&st.ts>=U&&((et=st.detail)!=null&&et.path)){const K=W.get(st.detail.path);(!K||st.ts>K.ts)&&W.set(st.detail.path,{ts:st.ts,growth:st.detail.growth_bytes||0,tool:st.tool})}return W},[A]),P=at(()=>({snap:T,history:e,openViewer:y,recentFiles:O,globalRange:n,rangeSeconds:F,enabledTools:m}),[T,e,y,O,n,F,m]),D=at(()=>eh(t),[t]),q={overview:()=>c`<${At} tabName="overview">
      <${Gm} snap=${T} history=${M}/>
      <div class="mb-lg"><${Nm}/></div>
    </${At}>`,procs:()=>c`<${At} tabName="procs"><div class="mb-lg"><${sp}/></div></${At}>`,memory:()=>c`<${At} tabName="memory"><div class="mb-lg"><${zm}/></div><div class="mb-lg"><${ov}/></div></${At}>`,live:()=>c`<${At} tabName="live"><div class="mb-lg"><${av}/></div></${At}>`,events:()=>c`<${At} tabName="events"><div class="mb-lg"><${iv} key=${"events-"+a}/></div></${At}>`,budget:()=>c`<${At} tabName="budget"><div class="mb-lg"><${rv} key=${"budget-"+a}/></div></${At}>`,sessions:()=>c`<${At} tabName="sessions"><div class="mb-lg"><${Av} key=${"sessions-"+a}/></div></${At}>`,analytics:()=>c`<${At} tabName="analytics"><div class="mb-lg"><${qv} key=${"analytics-"+a}/></div></${At}>`,flow:()=>c`<${At} tabName="flow"><div class="mb-lg"><${em} key=${"flow-"+a}/></div></${At}>`,transcript:()=>c`<${At} tabName="transcript"><div class="mb-lg"><${dm} key=${"transcript-"+a}/></div></${At}>`,timeline:()=>c`<${At} tabName="timeline"><div class="mb-lg"><${wm} key=${"timeline-"+a}/></div></${At}>`,config:()=>c`<${At} tabName="config"><div class="mb-lg"><${Lm}/></div></${At}>`};return c`<${Rt.Provider} value=${P}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${k} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${E}
            onInput=${U=>C(U.target.value)}/>
          <button class="theme-btn" onClick=${f} aria-label="Toggle theme: ${d}"
            title="Theme: ${d}">${Jd[d]}</button>
          ${S&&c`<span class="conn ok" title="OTel receiver active">OTel</span>`}
          <span class=${"conn "+(s?"ok":"err")} role="status" aria-live="polite">
            ${s?"live":"reconnecting..."}
            <span class="sr-only">${s?" — connected":" — connection lost, reconnecting"}</span>
          </span>
        </div>
      </header>
      ${D.length>0&&c`<div class="alert-banner" role="alert">
        ${D.map((U,W)=>c`<div key=${W} class="alert-item" style="color:var(--${U.level})">\u26A0 ${U.msg}</div>`)}
      </div>`}
      <${Ym} globalRange=${n} onPreset=${l} onApplyCustom=${o}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${i.map(U=>c`<button key=${U.id} class="tab-btn" role="tab"
            aria-selected=${a===U.id} onClick=${()=>r(U.id)}
            title="Shortcut: ${U.key}">${U.icon?U.icon+" ":""}${U.label}</button>`)}
        </nav>
        <${Jm} snap=${t} enabledTools=${m}
          onToggle=${g} onSetAll=${x}/>
        <div id="main-content" role="tabpanel" aria-label=${(H=i.find(U=>U.id===a))==null?void 0:H.label}>
          ${q[a]?q[a]():c`<p class="text-muted">Unknown tab "${a}"</p>`}
        </div>
      </main>
    </div>
    <${wu} path=${b} onClose=${()=>$(null)}/>
    <${Wm}/>
  </${Rt.Provider}>`}Cd(c`<${nh}/>`,document.getElementById("app"));
