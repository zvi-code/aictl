(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))n(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function s(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(l){if(l.ep)return;l.ep=!0;const o=s(l);fetch(l.href,o)}})();var dl,Ce,Wi,is,Ca,qi,Vi,Ui,Do,co,uo,Gi,sl={},nl=[],Ac=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,ul=Array.isArray;function Qt(e,t){for(var s in t)e[s]=t[s];return e}function Ao(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function Yi(e,t,s){var n,l,o,a={};for(o in t)o=="key"?n=t[o]:o=="ref"?l=t[o]:a[o]=t[o];if(arguments.length>2&&(a.children=arguments.length>3?dl.call(arguments,2):s),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)a[o]===void 0&&(a[o]=e.defaultProps[o]);return Jn(e,a,n,l,null)}function Jn(e,t,s,n,l){var o={type:e,props:t,key:s,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:l??++Wi,__i:-1,__u:0};return l==null&&Ce.vnode!=null&&Ce.vnode(o),o}function pl(e){return e.children}function Qn(e,t){this.props=e,this.context=t}function ln(e,t){if(t==null)return e.__?ln(e.__,e.__i+1):null;for(var s;t<e.__k.length;t++)if((s=e.__k[t])!=null&&s.__e!=null)return s.__e;return typeof e.type=="function"?ln(e):null}function Oc(e){if(e.__P&&e.__d){var t=e.__v,s=t.__e,n=[],l=[],o=Qt({},t);o.__v=t.__v+1,Ce.vnode&&Ce.vnode(o),Oo(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[s]:null,n,s??ln(t),!!(32&t.__u),l),o.__v=t.__v,o.__.__k[o.__i]=o,Zi(n,o,l),t.__e=t.__=null,o.__e!=s&&Ki(o)}}function Ki(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),Ki(e)}function po(e){(!e.__d&&(e.__d=!0)&&is.push(e)&&!ll.__r++||Ca!=Ce.debounceRendering)&&((Ca=Ce.debounceRendering)||qi)(ll)}function ll(){try{for(var e,t=1;is.length;)is.length>t&&is.sort(Vi),e=is.shift(),t=is.length,Oc(e)}finally{is.length=ll.__r=0}}function Ji(e,t,s,n,l,o,a,i,r,d,v){var p,m,g,k,M,T,y,$=n&&n.__k||nl,x=t.length;for(r=Pc(s,t,$,r,x),p=0;p<x;p++)(g=s.__k[p])!=null&&(m=g.__i!=-1&&$[g.__i]||sl,g.__i=p,T=Oo(e,g,m,l,o,a,i,r,d,v),k=g.__e,g.ref&&m.ref!=g.ref&&(m.ref&&Po(m.ref,null,g),v.push(g.ref,g.__c||k,g)),M==null&&k!=null&&(M=k),(y=!!(4&g.__u))||m.__k===g.__k?r=Qi(g,r,e,y):typeof g.type=="function"&&T!==void 0?r=T:k&&(r=k.nextSibling),g.__u&=-7);return s.__e=M,r}function Pc(e,t,s,n,l){var o,a,i,r,d,v=s.length,p=v,m=0;for(e.__k=new Array(l),o=0;o<l;o++)(a=t[o])!=null&&typeof a!="boolean"&&typeof a!="function"?(typeof a=="string"||typeof a=="number"||typeof a=="bigint"||a.constructor==String?a=e.__k[o]=Jn(null,a,null,null,null):ul(a)?a=e.__k[o]=Jn(pl,{children:a},null,null,null):a.constructor===void 0&&a.__b>0?a=e.__k[o]=Jn(a.type,a.props,a.key,a.ref?a.ref:null,a.__v):e.__k[o]=a,r=o+m,a.__=e,a.__b=e.__b+1,i=null,(d=a.__i=zc(a,s,r,p))!=-1&&(p--,(i=s[d])&&(i.__u|=2)),i==null||i.__v==null?(d==-1&&(l>v?m--:l<v&&m++),typeof a.type!="function"&&(a.__u|=4)):d!=r&&(d==r-1?m--:d==r+1?m++:(d>r?m--:m++,a.__u|=4))):e.__k[o]=null;if(p)for(o=0;o<v;o++)(i=s[o])!=null&&!(2&i.__u)&&(i.__e==n&&(n=ln(i)),er(i,i));return n}function Qi(e,t,s,n){var l,o;if(typeof e.type=="function"){for(l=e.__k,o=0;l&&o<l.length;o++)l[o]&&(l[o].__=e,t=Qi(l[o],t,s,n));return t}e.__e!=t&&(n&&(t&&e.type&&!t.parentNode&&(t=ln(e)),s.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function zc(e,t,s,n){var l,o,a,i=e.key,r=e.type,d=t[s],v=d!=null&&(2&d.__u)==0;if(d===null&&i==null||v&&i==d.key&&r==d.type)return s;if(n>(v?1:0)){for(l=s-1,o=s+1;l>=0||o<t.length;)if((d=t[a=l>=0?l--:o++])!=null&&!(2&d.__u)&&i==d.key&&r==d.type)return a}return-1}function Ea(e,t,s){t[0]=="-"?e.setProperty(t,s??""):e[t]=s==null?"":typeof s!="number"||Ac.test(t)?s:s+"px"}function Hn(e,t,s,n,l){var o,a;e:if(t=="style")if(typeof s=="string")e.style.cssText=s;else{if(typeof n=="string"&&(e.style.cssText=n=""),n)for(t in n)s&&t in s||Ea(e.style,t,"");if(s)for(t in s)n&&s[t]==n[t]||Ea(e.style,t,s[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace(Ui,"$1")),a=t.toLowerCase(),t=a in e||t=="onFocusOut"||t=="onFocusIn"?a.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=s,s?n?s.u=n.u:(s.u=Do,e.addEventListener(t,o?uo:co,o)):e.removeEventListener(t,o?uo:co,o);else{if(l=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=s??"";break e}catch{}typeof s=="function"||(s==null||s===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&s==1?"":s))}}function Ma(e){return function(t){if(this.l){var s=this.l[t.type+e];if(t.t==null)t.t=Do++;else if(t.t<s.u)return;return s(Ce.event?Ce.event(t):t)}}}function Oo(e,t,s,n,l,o,a,i,r,d){var v,p,m,g,k,M,T,y,$,x,w,N,A,O,P,b=t.type;if(t.constructor!==void 0)return null;128&s.__u&&(r=!!(32&s.__u),o=[i=t.__e=s.__e]),(v=Ce.__b)&&v(t);e:if(typeof b=="function")try{if(y=t.props,$=b.prototype&&b.prototype.render,x=(v=b.contextType)&&n[v.__c],w=v?x?x.props.value:v.__:n,s.__c?T=(p=t.__c=s.__c).__=p.__E:($?t.__c=p=new b(y,w):(t.__c=p=new Qn(y,w),p.constructor=b,p.render=Fc),x&&x.sub(p),p.state||(p.state={}),p.__n=n,m=p.__d=!0,p.__h=[],p._sb=[]),$&&p.__s==null&&(p.__s=p.state),$&&b.getDerivedStateFromProps!=null&&(p.__s==p.state&&(p.__s=Qt({},p.__s)),Qt(p.__s,b.getDerivedStateFromProps(y,p.__s))),g=p.props,k=p.state,p.__v=t,m)$&&b.getDerivedStateFromProps==null&&p.componentWillMount!=null&&p.componentWillMount(),$&&p.componentDidMount!=null&&p.__h.push(p.componentDidMount);else{if($&&b.getDerivedStateFromProps==null&&y!==g&&p.componentWillReceiveProps!=null&&p.componentWillReceiveProps(y,w),t.__v==s.__v||!p.__e&&p.shouldComponentUpdate!=null&&p.shouldComponentUpdate(y,p.__s,w)===!1){t.__v!=s.__v&&(p.props=y,p.state=p.__s,p.__d=!1),t.__e=s.__e,t.__k=s.__k,t.__k.some(function(C){C&&(C.__=t)}),nl.push.apply(p.__h,p._sb),p._sb=[],p.__h.length&&a.push(p);break e}p.componentWillUpdate!=null&&p.componentWillUpdate(y,p.__s,w),$&&p.componentDidUpdate!=null&&p.__h.push(function(){p.componentDidUpdate(g,k,M)})}if(p.context=w,p.props=y,p.__P=e,p.__e=!1,N=Ce.__r,A=0,$)p.state=p.__s,p.__d=!1,N&&N(t),v=p.render(p.props,p.state,p.context),nl.push.apply(p.__h,p._sb),p._sb=[];else do p.__d=!1,N&&N(t),v=p.render(p.props,p.state,p.context),p.state=p.__s;while(p.__d&&++A<25);p.state=p.__s,p.getChildContext!=null&&(n=Qt(Qt({},n),p.getChildContext())),$&&!m&&p.getSnapshotBeforeUpdate!=null&&(M=p.getSnapshotBeforeUpdate(g,k)),O=v!=null&&v.type===pl&&v.key==null?Xi(v.props.children):v,i=Ji(e,ul(O)?O:[O],t,s,n,l,o,a,i,r,d),p.base=t.__e,t.__u&=-161,p.__h.length&&a.push(p),T&&(p.__E=p.__=null)}catch(C){if(t.__v=null,r||o!=null)if(C.then){for(t.__u|=r?160:128;i&&i.nodeType==8&&i.nextSibling;)i=i.nextSibling;o[o.indexOf(i)]=null,t.__e=i}else{for(P=o.length;P--;)Ao(o[P]);fo(t)}else t.__e=s.__e,t.__k=s.__k,C.then||fo(t);Ce.__e(C,t,s)}else o==null&&t.__v==s.__v?(t.__k=s.__k,t.__e=s.__e):i=t.__e=Rc(s.__e,t,s,n,l,o,a,r,d);return(v=Ce.diffed)&&v(t),128&t.__u?void 0:i}function fo(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(fo))}function Zi(e,t,s){for(var n=0;n<s.length;n++)Po(s[n],s[++n],s[++n]);Ce.__c&&Ce.__c(t,e),e.some(function(l){try{e=l.__h,l.__h=[],e.some(function(o){o.call(l)})}catch(o){Ce.__e(o,l.__v)}})}function Xi(e){return typeof e!="object"||e==null||e.__b>0?e:ul(e)?e.map(Xi):Qt({},e)}function Rc(e,t,s,n,l,o,a,i,r){var d,v,p,m,g,k,M,T=s.props||sl,y=t.props,$=t.type;if($=="svg"?l="http://www.w3.org/2000/svg":$=="math"?l="http://www.w3.org/1998/Math/MathML":l||(l="http://www.w3.org/1999/xhtml"),o!=null){for(d=0;d<o.length;d++)if((g=o[d])&&"setAttribute"in g==!!$&&($?g.localName==$:g.nodeType==3)){e=g,o[d]=null;break}}if(e==null){if($==null)return document.createTextNode(y);e=document.createElementNS(l,$,y.is&&y),i&&(Ce.__m&&Ce.__m(t,o),i=!1),o=null}if($==null)T===y||i&&e.data==y||(e.data=y);else{if(o=o&&dl.call(e.childNodes),!i&&o!=null)for(T={},d=0;d<e.attributes.length;d++)T[(g=e.attributes[d]).name]=g.value;for(d in T)g=T[d],d=="dangerouslySetInnerHTML"?p=g:d=="children"||d in y||d=="value"&&"defaultValue"in y||d=="checked"&&"defaultChecked"in y||Hn(e,d,null,g,l);for(d in y)g=y[d],d=="children"?m=g:d=="dangerouslySetInnerHTML"?v=g:d=="value"?k=g:d=="checked"?M=g:i&&typeof g!="function"||T[d]===g||Hn(e,d,g,T[d],l);if(v)i||p&&(v.__html==p.__html||v.__html==e.innerHTML)||(e.innerHTML=v.__html),t.__k=[];else if(p&&(e.innerHTML=""),Ji(t.type=="template"?e.content:e,ul(m)?m:[m],t,s,n,$=="foreignObject"?"http://www.w3.org/1999/xhtml":l,o,a,o?o[0]:s.__k&&ln(s,0),i,r),o!=null)for(d=o.length;d--;)Ao(o[d]);i||(d="value",$=="progress"&&k==null?e.removeAttribute("value"):k!=null&&(k!==e[d]||$=="progress"&&!k||$=="option"&&k!=T[d])&&Hn(e,d,k,T[d],l),d="checked",M!=null&&M!=e[d]&&Hn(e,d,M,T[d],l))}return e}function Po(e,t,s){try{if(typeof e=="function"){var n=typeof e.__u=="function";n&&e.__u(),n&&t==null||(e.__u=e(t))}else e.current=t}catch(l){Ce.__e(l,s)}}function er(e,t,s){var n,l;if(Ce.unmount&&Ce.unmount(e),(n=e.ref)&&(n.current&&n.current!=e.__e||Po(n,null,t)),(n=e.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(o){Ce.__e(o,t)}n.base=n.__P=null}if(n=e.__k)for(l=0;l<n.length;l++)n[l]&&er(n[l],t,s||typeof e.type!="function");s||Ao(e.__e),e.__c=e.__=e.__e=void 0}function Fc(e,t,s){return this.constructor(e,s)}function Ic(e,t,s){var n,l,o,a;t==document&&(t=document.documentElement),Ce.__&&Ce.__(e,t),l=(n=!1)?null:t.__k,o=[],a=[],Oo(t,e=t.__k=Yi(pl,null,[e]),l||sl,sl,t.namespaceURI,l?null:t.firstChild?dl.call(t.childNodes):null,o,l?l.__e:t.firstChild,n,a),Zi(o,e,a)}function jc(e){function t(s){var n,l;return this.getChildContext||(n=new Set,(l={})[t.__c]=this,this.getChildContext=function(){return l},this.componentWillUnmount=function(){n=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&n.forEach(function(a){a.__e=!0,po(a)})},this.sub=function(o){n.add(o);var a=o.componentWillUnmount;o.componentWillUnmount=function(){n&&n.delete(o),a&&a.call(o)}}),s.children}return t.__c="__cC"+Gi++,t.__=e,t.Provider=t.__l=(t.Consumer=function(s,n){return s.children(n)}).contextType=t,t}dl=nl.slice,Ce={__e:function(e,t,s,n){for(var l,o,a;t=t.__;)if((l=t.__c)&&!l.__)try{if((o=l.constructor)&&o.getDerivedStateFromError!=null&&(l.setState(o.getDerivedStateFromError(e)),a=l.__d),l.componentDidCatch!=null&&(l.componentDidCatch(e,n||{}),a=l.__d),a)return l.__E=l}catch(i){e=i}throw e}},Wi=0,Qn.prototype.setState=function(e,t){var s;s=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=Qt({},this.state),typeof e=="function"&&(e=e(Qt({},s),this.props)),e&&Qt(s,e),e!=null&&this.__v&&(t&&this._sb.push(t),po(this))},Qn.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),po(this))},Qn.prototype.render=pl,is=[],qi=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,Vi=function(e,t){return e.__v.__b-t.__v.__b},ll.__r=0,Ui=/(PointerCapture)$|Capture$/i,Do=0,co=Ma(!1),uo=Ma(!0),Gi=0;var tr=function(e,t,s,n){var l;t[0]=0;for(var o=1;o<t.length;o++){var a=t[o++],i=t[o]?(t[0]|=a?1:2,s[t[o++]]):t[++o];a===3?n[0]=i:a===4?n[1]=Object.assign(n[1]||{},i):a===5?(n[1]=n[1]||{})[t[++o]]=i:a===6?n[1][t[++o]]+=i+"":a?(l=e.apply(i,tr(e,i,s,["",null])),n.push(l),i[0]?t[0]|=2:(t[o-2]=0,t[o]=l)):n.push(i)}return n},La=new Map;function Nc(e){var t=La.get(this);return t||(t=new Map,La.set(this,t)),(t=tr(this,t.get(e)||(t.set(e,t=function(s){for(var n,l,o=1,a="",i="",r=[0],d=function(m){o===1&&(m||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?r.push(0,m,a):o===3&&(m||a)?(r.push(3,m,a),o=2):o===2&&a==="..."&&m?r.push(4,m,0):o===2&&a&&!m?r.push(5,0,!0,a):o>=5&&((a||!m&&o===5)&&(r.push(o,0,a,l),o=6),m&&(r.push(o,m,0,l),o=6)),a=""},v=0;v<s.length;v++){v&&(o===1&&d(),d(v));for(var p=0;p<s[v].length;p++)n=s[v][p],o===1?n==="<"?(d(),r=[r],o=3):a+=n:o===4?a==="--"&&n===">"?(o=1,a=""):a=n+a[0]:i?n===i?i="":a+=n:n==='"'||n==="'"?i=n:n===">"?(d(),o=1):o&&(n==="="?(o=5,l=a,a=""):n==="/"&&(o<5||s[v][p+1]===">")?(d(),o===3&&(r=r[0]),o=r,(r=r[0]).push(2,0,o),o=0):n===" "||n==="	"||n===`
`||n==="\r"?(d(),o=2):a+=n),o===3&&a==="!--"&&(o=4,r=r[0])}return d(),r}(e)),t),arguments,[])).length>1?t:t[0]}var c=Nc.bind(Yi),on,Ae,Ul,Da,Ln=0,sr=[],Ie=Ce,Aa=Ie.__b,Oa=Ie.__r,Pa=Ie.diffed,za=Ie.__c,Ra=Ie.unmount,Fa=Ie.__;function fl(e,t){Ie.__h&&Ie.__h(Ae,e,Ln||t),Ln=0;var s=Ae.__H||(Ae.__H={__:[],__h:[]});return e>=s.__.length&&s.__.push({}),s.__[e]}function G(e){return Ln=1,nr(or,e)}function nr(e,t,s){var n=fl(on++,2);if(n.t=e,!n.__c&&(n.__=[or(void 0,t),function(i){var r=n.__N?n.__N[0]:n.__[0],d=n.t(r,i);r!==d&&(n.__N=[d,n.__[1]],n.__c.setState({}))}],n.__c=Ae,!Ae.__f)){var l=function(i,r,d){if(!n.__c.__H)return!0;var v=n.__c.__H.__.filter(function(m){return m.__c});if(v.every(function(m){return!m.__N}))return!o||o.call(this,i,r,d);var p=n.__c.props!==i;return v.some(function(m){if(m.__N){var g=m.__[0];m.__=m.__N,m.__N=void 0,g!==m.__[0]&&(p=!0)}}),o&&o.call(this,i,r,d)||p};Ae.__f=!0;var o=Ae.shouldComponentUpdate,a=Ae.componentWillUpdate;Ae.componentWillUpdate=function(i,r,d){if(this.__e){var v=o;o=void 0,l(i,r,d),o=v}a&&a.call(this,i,r,d)},Ae.shouldComponentUpdate=l}return n.__N||n.__}function de(e,t){var s=fl(on++,3);!Ie.__s&&lr(s.__H,t)&&(s.__=e,s.u=t,Ae.__H.__h.push(s))}function lt(e){return Ln=5,ie(function(){return{current:e}},[])}function ie(e,t){var s=fl(on++,7);return lr(s.__H,t)&&(s.__=e(),s.__H=t,s.__h=e),s.__}function qe(e,t){return Ln=8,ie(function(){return e},t)}function Xe(e){var t=Ae.context[e.__c],s=fl(on++,9);return s.c=e,t?(s.__==null&&(s.__=!0,t.sub(Ae)),t.props.value):e.__}function Bc(){for(var e;e=sr.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(Zn),t.__h.some(vo),t.__h=[]}catch(s){t.__h=[],Ie.__e(s,e.__v)}}}Ie.__b=function(e){Ae=null,Aa&&Aa(e)},Ie.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),Fa&&Fa(e,t)},Ie.__r=function(e){Oa&&Oa(e),on=0;var t=(Ae=e.__c).__H;t&&(Ul===Ae?(t.__h=[],Ae.__h=[],t.__.some(function(s){s.__N&&(s.__=s.__N),s.u=s.__N=void 0})):(t.__h.some(Zn),t.__h.some(vo),t.__h=[],on=0)),Ul=Ae},Ie.diffed=function(e){Pa&&Pa(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(sr.push(t)!==1&&Da===Ie.requestAnimationFrame||((Da=Ie.requestAnimationFrame)||Hc)(Bc)),t.__H.__.some(function(s){s.u&&(s.__H=s.u),s.u=void 0})),Ul=Ae=null},Ie.__c=function(e,t){t.some(function(s){try{s.__h.some(Zn),s.__h=s.__h.filter(function(n){return!n.__||vo(n)})}catch(n){t.some(function(l){l.__h&&(l.__h=[])}),t=[],Ie.__e(n,s.__v)}}),za&&za(e,t)},Ie.unmount=function(e){Ra&&Ra(e);var t,s=e.__c;s&&s.__H&&(s.__H.__.some(function(n){try{Zn(n)}catch(l){t=l}}),s.__H=void 0,t&&Ie.__e(t,s.__v))};var Ia=typeof requestAnimationFrame=="function";function Hc(e){var t,s=function(){clearTimeout(n),Ia&&cancelAnimationFrame(t),setTimeout(e)},n=setTimeout(s,35);Ia&&(t=requestAnimationFrame(s))}function Zn(e){var t=Ae,s=e.__c;typeof s=="function"&&(e.__c=void 0,s()),Ae=t}function vo(e){var t=Ae;e.__c=e.__(),Ae=t}function lr(e,t){return!e||e.length!==t.length||t.some(function(s,n){return s!==e[n]})}function or(e,t){return typeof t=="function"?t(e):t}const Ne=jc(null),Oe=window.COLORS??{},$t=window.ICONS??{},ar=window.VENDOR_LABELS??{},Wc=window.VENDOR_COLORS??{},qc=window.HOST_LABELS??{},ja=window.TOOL_RELATIONSHIPS??{},Vc={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},Gl=["auto","dark","light"],Uc={auto:"☾",dark:"☾",light:"☀"},sn=5,Ys=15,Gc={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},Na=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],Yc={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},Kc=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],ol=new Map,Jc=6e4;function ir(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function vl(e,t,s,n=1){for(let l=t.length-1;l>=0;l--){const[o,a]=t[l],i=e/o;if(i>=n)return ir(i)+a}return Math.round(e)+s}const Qc=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],Zc=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],Xc=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function z(e){return vl(e,Zc,"")}function We(e){return vl(e,Xc,"")}function ge(e){return vl(e,Qc,"B")}function Ft(e){return!e||e<=0?"0B/s":vl(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function _e(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function X(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function zo(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function rr(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Ts(e){return e&&e.replace(/\\/g,"/")}function Yl(e,t){const s=Ts(e),n=Ts(t);return s.startsWith(n+"/")?"project":s.includes("/.claude/projects/")?"shadow":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")||s.includes("/.copilot/")||s.includes("/.vscode/")?"global":"external"}function ed(e,t){const s=Ts(e),n=Ts(t);if(s.startsWith(n+"/")){const o=s.slice(n.length+1),a=o.split("/");return a.pop(),a.length?a.join("/"):"(root)"}const l=s.split("/");l.pop();for(let o=l.length-1;o>=0;o--)if(l[o].startsWith(".")&&l[o].length>1&&l[o]!==".."||l[o]==="Library"||l[o]==="AppData")return"~/"+l.slice(o).join("/");return l.slice(-2).join("/")}function td(e,t){const s={};e.forEach(l=>{const o=Yl(l.path,t),a=ed(l.path,t),i=o==="project"?a:o+": "+a;(s[i]=s[i]||[]).push(l)});const n={project:0,global:1,shadow:2,external:3};return Object.entries(s).sort((l,o)=>{const a=l[1][0]?Yl(l[1][0].path,t):"z",i=o[1][0]?Yl(o[1][0].path,t):"z";return(n[a]||9)-(n[i]||9)})}function sd(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let s=2;s<e.length;s++)t.push((e[s-2]+e[s-1]+e[s])/3);return t}async function Ro(e){const t=ol.get(e);if(t&&Date.now()-t.ts<Jc)return t.content;const s={};t&&t.etag&&(s["If-None-Match"]=t.etag);const n=await fetch("/api/file?path="+encodeURIComponent(e),{headers:s});if(n.status===304&&t)return t.ts=Date.now(),t.content;if(!n.ok)throw new Error(n.statusText);const l=await n.text(),o=n.headers.get("ETag")||null;return ol.set(e,{content:l,ts:Date.now(),etag:o}),l}function It(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function cr(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function Kl(e,t,s,n){if(e==null||e==="")return"";let l=typeof e=="number"?e:parseFloat(e)||0;n&&(l*=n);let o;switch(t){case"size":o=ge(l);break;case"rate":o=Ft(l);break;case"kilo":o=z(l);break;case"percent":o=_e(l);break;case"pct":o=_e(l);break;case"raw":default:o=Number.isInteger(l)?String(l):ir(l)}return s?o+s:o}function Ba(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const Zs={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],tabs:[{id:"overview",label:"Dashboard",icon:"📊",key:"1"},{id:"procs",label:"Processes",icon:"⚙️",key:"2"},{id:"memory",label:"AI Context",icon:"📝",key:"3"},{id:"live",label:"Live Monitor",icon:"📡",key:"4"},{id:"events",label:"Events & Stats",icon:"📈",key:"5"},{id:"budget",label:"Token Budget",icon:"💰",key:"6"},{id:"sessions",label:"Sessions",icon:"🔄",key:"7"},{id:"analytics",label:"Analytics",icon:"🔬",key:"8"},{id:"flow",label:"Session Flow",icon:"🔀",key:"9"},{id:"config",label:"Configuration",icon:"⚙️",key:"0"}]},nd=!0,Ue="u-",ld="uplot",od=Ue+"hz",ad=Ue+"vt",id=Ue+"title",rd=Ue+"wrap",cd=Ue+"under",dd=Ue+"over",ud=Ue+"axis",ws=Ue+"off",pd=Ue+"select",fd=Ue+"cursor-x",vd=Ue+"cursor-y",md=Ue+"cursor-pt",hd=Ue+"legend",gd=Ue+"live",_d=Ue+"inline",$d=Ue+"series",bd=Ue+"marker",Ha=Ue+"label",yd=Ue+"value",Sn="width",Tn="height",xn="top",Wa="bottom",Ks="left",Jl="right",Fo="#000",qa=Fo+"0",Ql="mousemove",Va="mousedown",Zl="mouseup",Ua="mouseenter",Ga="mouseleave",Ya="dblclick",xd="resize",kd="scroll",Ka="change",al="dppxchange",Io="--",un=typeof window<"u",mo=un?document:null,nn=un?window:null,wd=un?navigator:null;let me,Wn;function ho(){let e=devicePixelRatio;me!=e&&(me=e,Wn&&_o(Ka,Wn,ho),Wn=matchMedia(`(min-resolution: ${me-.001}dppx) and (max-resolution: ${me+.001}dppx)`),Ss(Ka,Wn,ho),nn.dispatchEvent(new CustomEvent(al)))}function gt(e,t){if(t!=null){let s=e.classList;!s.contains(t)&&s.add(t)}}function go(e,t){let s=e.classList;s.contains(t)&&s.remove(t)}function Te(e,t,s){e.style[t]=s+"px"}function Pt(e,t,s,n){let l=mo.createElement(e);return t!=null&&gt(l,t),s!=null&&s.insertBefore(l,n),l}function Ct(e,t){return Pt("div",e,t)}const Ja=new WeakMap;function Ut(e,t,s,n,l){let o="translate("+t+"px,"+s+"px)",a=Ja.get(e);o!=a&&(e.style.transform=o,Ja.set(e,o),t<0||s<0||t>n||s>l?gt(e,ws):go(e,ws))}const Qa=new WeakMap;function Za(e,t,s){let n=t+s,l=Qa.get(e);n!=l&&(Qa.set(e,n),e.style.background=t,e.style.borderColor=s)}const Xa=new WeakMap;function ei(e,t,s,n){let l=t+""+s,o=Xa.get(e);l!=o&&(Xa.set(e,l),e.style.height=s+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-s/2+"px":0)}const jo={passive:!0},Sd={...jo,capture:!0};function Ss(e,t,s,n){t.addEventListener(e,s,n?Sd:jo)}function _o(e,t,s,n){t.removeEventListener(e,s,jo)}un&&ho();function zt(e,t,s,n){let l;s=s||0,n=n||t.length-1;let o=n<=2147483647;for(;n-s>1;)l=o?s+n>>1:_t((s+n)/2),t[l]<e?s=l:n=l;return e-t[s]<=t[n]-e?s:n}function dr(e){return(s,n,l)=>{let o=-1,a=-1;for(let i=n;i<=l;i++)if(e(s[i])){o=i;break}for(let i=l;i>=n;i--)if(e(s[i])){a=i;break}return[o,a]}}const ur=e=>e!=null,pr=e=>e!=null&&e>0,ml=dr(ur),Td=dr(pr);function Cd(e,t,s,n=0,l=!1){let o=l?Td:ml,a=l?pr:ur;[t,s]=o(e,t,s);let i=e[t],r=e[t];if(t>-1)if(n==1)i=e[t],r=e[s];else if(n==-1)i=e[s],r=e[t];else for(let d=t;d<=s;d++){let v=e[d];a(v)&&(v<i?i=v:v>r&&(r=v))}return[i??be,r??-be]}function hl(e,t,s,n){let l=ni(e),o=ni(t);e==t&&(l==-1?(e*=s,t/=s):(e/=s,t*=s));let a=s==10?Xt:fr,i=l==1?_t:Et,r=o==1?Et:_t,d=i(a(Ve(e))),v=r(a(Ve(t))),p=an(s,d),m=an(s,v);return s==10&&(d<0&&(p=ye(p,-d)),v<0&&(m=ye(m,-v))),n||s==2?(e=p*l,t=m*o):(e=gr(e,p),t=gl(t,m)),[e,t]}function No(e,t,s,n){let l=hl(e,t,s,n);return e==0&&(l[0]=0),t==0&&(l[1]=0),l}const Bo=.1,ti={mode:3,pad:Bo},En={pad:0,soft:null,mode:0},Ed={min:En,max:En};function il(e,t,s,n){return _l(s)?si(e,t,s):(En.pad=s,En.soft=n?0:null,En.mode=n?3:0,si(e,t,Ed))}function fe(e,t){return e??t}function Md(e,t,s){for(t=fe(t,0),s=fe(s,e.length-1);t<=s;){if(e[t]!=null)return!0;t++}return!1}function si(e,t,s){let n=s.min,l=s.max,o=fe(n.pad,0),a=fe(l.pad,0),i=fe(n.hard,-be),r=fe(l.hard,be),d=fe(n.soft,be),v=fe(l.soft,-be),p=fe(n.mode,0),m=fe(l.mode,0),g=t-e,k=Xt(g),M=ct(Ve(e),Ve(t)),T=Xt(M),y=Ve(T-k);(g<1e-24||y>10)&&(g=0,(e==0||t==0)&&(g=1e-24,p==2&&d!=be&&(o=0),m==2&&v!=-be&&(a=0)));let $=g||M||1e3,x=Xt($),w=an(10,_t(x)),N=$*(g==0?e==0?.1:1:o),A=ye(gr(e-N,w/10),24),O=e>=d&&(p==1||p==3&&A<=d||p==2&&A>=d)?d:be,P=ct(i,A<O&&e>=O?O:Rt(O,A)),b=$*(g==0?t==0?.1:1:a),C=ye(gl(t+b,w/10),24),D=t<=v&&(m==1||m==3&&C>=v||m==2&&C<=v)?v:-be,F=Rt(r,C>D&&t<=D?D:ct(D,C));return P==F&&P==0&&(F=100),[P,F]}const Ld=new Intl.NumberFormat(un?wd.language:"en-US"),Ho=e=>Ld.format(e),bt=Math,Xn=bt.PI,Ve=bt.abs,_t=bt.floor,He=bt.round,Et=bt.ceil,Rt=bt.min,ct=bt.max,an=bt.pow,ni=bt.sign,Xt=bt.log10,fr=bt.log2,Dd=(e,t=1)=>bt.sinh(e)*t,Xl=(e,t=1)=>bt.asinh(e/t),be=1/0;function li(e){return(Xt((e^e>>31)-(e>>31))|0)+1}function $o(e,t,s){return Rt(ct(e,t),s)}function vr(e){return typeof e=="function"}function ce(e){return vr(e)?e:()=>e}const Ad=()=>{},mr=e=>e,hr=(e,t)=>t,Od=e=>null,oi=e=>!0,ai=(e,t)=>e==t,Pd=/\.\d*?(?=9{6,}|0{6,})/gm,Cs=e=>{if($r(e)||us.has(e))return e;const t=`${e}`,s=t.match(Pd);if(s==null)return e;let n=s[0].length-1;if(t.indexOf("e-")!=-1){let[l,o]=t.split("e");return+`${Cs(l)}e${o}`}return ye(e,n)};function xs(e,t){return Cs(ye(Cs(e/t))*t)}function gl(e,t){return Cs(Et(Cs(e/t))*t)}function gr(e,t){return Cs(_t(Cs(e/t))*t)}function ye(e,t=0){if($r(e))return e;let s=10**t,n=e*s*(1+Number.EPSILON);return He(n)/s}const us=new Map;function _r(e){return((""+e).split(".")[1]||"").length}function Dn(e,t,s,n){let l=[],o=n.map(_r);for(let a=t;a<s;a++){let i=Ve(a),r=ye(an(e,a),i);for(let d=0;d<n.length;d++){let v=e==10?+`${n[d]}e${a}`:n[d]*r,p=(a>=0?0:i)+(a>=o[d]?0:o[d]),m=e==10?v:ye(v,p);l.push(m),us.set(m,p)}}return l}const Mn={},Wo=[],rn=[null,null],rs=Array.isArray,$r=Number.isInteger,zd=e=>e===void 0;function ii(e){return typeof e=="string"}function _l(e){let t=!1;if(e!=null){let s=e.constructor;t=s==null||s==Object}return t}function Rd(e){return e!=null&&typeof e=="object"}const Fd=Object.getPrototypeOf(Uint8Array),br="__proto__";function cn(e,t=_l){let s;if(rs(e)){let n=e.find(l=>l!=null);if(rs(n)||t(n)){s=Array(e.length);for(let l=0;l<e.length;l++)s[l]=cn(e[l],t)}else s=e.slice()}else if(e instanceof Fd)s=e.slice();else if(t(e)){s={};for(let n in e)n!=br&&(s[n]=cn(e[n],t))}else s=e;return s}function je(e){let t=arguments;for(let s=1;s<t.length;s++){let n=t[s];for(let l in n)l!=br&&(_l(e[l])?je(e[l],cn(n[l])):e[l]=cn(n[l]))}return e}const Id=0,jd=1,Nd=2;function Bd(e,t,s){for(let n=0,l,o=-1;n<t.length;n++){let a=t[n];if(a>o){for(l=a-1;l>=0&&e[l]==null;)e[l--]=null;for(l=a+1;l<s&&e[l]==null;)e[o=l++]=null}}}function Hd(e,t){if(Vd(e)){let a=e[0].slice();for(let i=1;i<e.length;i++)a.push(...e[i].slice(1));return Ud(a[0])||(a=qd(a)),a}let s=new Set;for(let a=0;a<e.length;a++){let r=e[a][0],d=r.length;for(let v=0;v<d;v++)s.add(r[v])}let n=[Array.from(s).sort((a,i)=>a-i)],l=n[0].length,o=new Map;for(let a=0;a<l;a++)o.set(n[0][a],a);for(let a=0;a<e.length;a++){let i=e[a],r=i[0];for(let d=1;d<i.length;d++){let v=i[d],p=Array(l).fill(void 0),m=t?t[a][d]:jd,g=[];for(let k=0;k<v.length;k++){let M=v[k],T=o.get(r[k]);M===null?m!=Id&&(p[T]=M,m==Nd&&g.push(T)):p[T]=M}Bd(p,g,l),n.push(p)}}return n}const Wd=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function qd(e){let t=e[0],s=t.length,n=Array(s);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,a)=>t[o]-t[a]);let l=[];for(let o=0;o<e.length;o++){let a=e[o],i=Array(s);for(let r=0;r<s;r++)i[r]=a[n[r]];l.push(i)}return l}function Vd(e){let t=e[0][0],s=t.length;for(let n=1;n<e.length;n++){let l=e[n][0];if(l.length!=s)return!1;if(l!=t){for(let o=0;o<s;o++)if(l[o]!=t[o])return!1}}return!0}function Ud(e,t=100){const s=e.length;if(s<=1)return!0;let n=0,l=s-1;for(;n<=l&&e[n]==null;)n++;for(;l>=n&&e[l]==null;)l--;if(l<=n)return!0;const o=ct(1,_t((l-n+1)/t));for(let a=e[n],i=n+o;i<=l;i+=o){const r=e[i];if(r!=null){if(r<=a)return!1;a=r}}return!0}const yr=["January","February","March","April","May","June","July","August","September","October","November","December"],xr=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function kr(e){return e.slice(0,3)}const Gd=xr.map(kr),Yd=yr.map(kr),Kd={MMMM:yr,MMM:Yd,WWWW:xr,WWW:Gd};function kn(e){return(e<10?"0":"")+e}function Jd(e){return(e<10?"00":e<100?"0":"")+e}const Qd={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>kn(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>kn(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>kn(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>kn(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>kn(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Jd(e.getMilliseconds())};function qo(e,t){t=t||Kd;let s=[],n=/\{([a-z]+)\}|[^{]+/gi,l;for(;l=n.exec(e);)s.push(l[0][0]=="{"?Qd[l[1]]:l[0]);return o=>{let a="";for(let i=0;i<s.length;i++)a+=typeof s[i]=="string"?s[i]:s[i](o,t);return a}}const Zd=new Intl.DateTimeFormat().resolvedOptions().timeZone;function Xd(e,t){let s;return t=="UTC"||t=="Etc/UTC"?s=new Date(+e+e.getTimezoneOffset()*6e4):t==Zd?s=e:(s=new Date(e.toLocaleString("en-US",{timeZone:t})),s.setMilliseconds(e.getMilliseconds())),s}const wr=e=>e%1==0,rl=[1,2,2.5,5],eu=Dn(10,-32,0,rl),Sr=Dn(10,0,32,rl),tu=Sr.filter(wr),ks=eu.concat(Sr),Vo=`
`,Tr="{YYYY}",ri=Vo+Tr,Cr="{M}/{D}",Cn=Vo+Cr,qn=Cn+"/{YY}",Er="{aa}",su="{h}:{mm}",Xs=su+Er,ci=Vo+Xs,di=":{ss}",he=null;function Mr(e){let t=e*1e3,s=t*60,n=s*60,l=n*24,o=l*30,a=l*365,r=(e==1?Dn(10,0,3,rl).filter(wr):Dn(10,-3,0,rl)).concat([t,t*5,t*10,t*15,t*30,s,s*5,s*10,s*15,s*30,n,n*2,n*3,n*4,n*6,n*8,n*12,l,l*2,l*3,l*4,l*5,l*6,l*7,l*8,l*9,l*10,l*15,o,o*2,o*3,o*4,o*6,a,a*2,a*5,a*10,a*25,a*50,a*100]);const d=[[a,Tr,he,he,he,he,he,he,1],[l*28,"{MMM}",ri,he,he,he,he,he,1],[l,Cr,ri,he,he,he,he,he,1],[n,"{h}"+Er,qn,he,Cn,he,he,he,1],[s,Xs,qn,he,Cn,he,he,he,1],[t,di,qn+" "+Xs,he,Cn+" "+Xs,he,ci,he,1],[e,di+".{fff}",qn+" "+Xs,he,Cn+" "+Xs,he,ci,he,1]];function v(p){return(m,g,k,M,T,y)=>{let $=[],x=T>=a,w=T>=o&&T<a,N=p(k),A=ye(N*e,3),O=eo(N.getFullYear(),x?0:N.getMonth(),w||x?1:N.getDate()),P=ye(O*e,3);if(w||x){let b=w?T/o:0,C=x?T/a:0,D=A==P?A:ye(eo(O.getFullYear()+C,O.getMonth()+b,1)*e,3),F=new Date(He(D/e)),R=F.getFullYear(),q=F.getMonth();for(let Y=0;D<=M;Y++){let ne=eo(R+C*Y,q+b*Y,1),L=ne-p(ye(ne*e,3));D=ye((+ne+L)*e,3),D<=M&&$.push(D)}}else{let b=T>=l?l:T,C=_t(k)-_t(A),D=P+C+gl(A-P,b);$.push(D);let F=p(D),R=F.getHours()+F.getMinutes()/s+F.getSeconds()/n,q=T/n,Y=m.axes[g]._space,ne=y/Y;for(;D=ye(D+T,e==1?0:3),!(D>M);)if(q>1){let L=_t(ye(R+q,6))%24,H=p(D).getHours()-L;H>1&&(H=-1),D-=H*n,R=(R+q)%24;let le=$[$.length-1];ye((D-le)/T,3)*ne>=.7&&$.push(D)}else $.push(D)}return $}}return[r,d,v]}const[nu,lu,ou]=Mr(1),[au,iu,ru]=Mr(.001);Dn(2,-53,53,[1]);function ui(e,t){return e.map(s=>s.map((n,l)=>l==0||l==8||n==null?n:t(l==1||s[8]==0?n:s[1]+n)))}function pi(e,t){return(s,n,l,o,a)=>{let i=t.find(k=>a>=k[0])||t[t.length-1],r,d,v,p,m,g;return n.map(k=>{let M=e(k),T=M.getFullYear(),y=M.getMonth(),$=M.getDate(),x=M.getHours(),w=M.getMinutes(),N=M.getSeconds(),A=T!=r&&i[2]||y!=d&&i[3]||$!=v&&i[4]||x!=p&&i[5]||w!=m&&i[6]||N!=g&&i[7]||i[1];return r=T,d=y,v=$,p=x,m=w,g=N,A(M)})}}function cu(e,t){let s=qo(t);return(n,l,o,a,i)=>l.map(r=>s(e(r)))}function eo(e,t,s){return new Date(e,t,s)}function fi(e,t){return t(e)}const du="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function vi(e,t){return(s,n,l,o)=>o==null?Io:t(e(n))}function uu(e,t){let s=e.series[t];return s.width?s.stroke(e,t):s.points.width?s.points.stroke(e,t):null}function pu(e,t){return e.series[t].fill(e,t)}const fu={show:!0,live:!0,isolate:!1,mount:Ad,markers:{show:!0,width:2,stroke:uu,fill:pu,dash:"solid"},idx:null,idxs:null,values:[]};function vu(e,t){let s=e.cursor.points,n=Ct(),l=s.size(e,t);Te(n,Sn,l),Te(n,Tn,l);let o=l/-2;Te(n,"marginLeft",o),Te(n,"marginTop",o);let a=s.width(e,t,l);return a&&Te(n,"borderWidth",a),n}function mu(e,t){let s=e.series[t].points;return s._fill||s._stroke}function hu(e,t){let s=e.series[t].points;return s._stroke||s._fill}function gu(e,t){return e.series[t].points.size}const to=[0,0];function _u(e,t,s){return to[0]=t,to[1]=s,to}function Vn(e,t,s,n=!0){return l=>{l.button==0&&(!n||l.target==t)&&s(l)}}function so(e,t,s,n=!0){return l=>{(!n||l.target==t)&&s(l)}}const $u={show:!0,x:!0,y:!0,lock:!1,move:_u,points:{one:!1,show:vu,size:gu,width:0,stroke:hu,fill:mu},bind:{mousedown:Vn,mouseup:Vn,click:Vn,dblclick:Vn,mousemove:so,mouseleave:so,mouseenter:so},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,s,n,l)=>n-l,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},Lr={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},Uo=je({},Lr,{filter:hr}),Dr=je({},Uo,{size:10}),Ar=je({},Lr,{show:!1}),Go='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',Or="bold "+Go,Pr=1.5,mi={show:!0,scale:"x",stroke:Fo,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Or,side:2,grid:Uo,ticks:Dr,border:Ar,font:Go,lineGap:Pr,rotate:0},bu="Value",yu="Time",hi={show:!0,scale:"x",auto:!1,sorted:1,min:be,max:-be,idxs:[]};function xu(e,t,s,n,l){return t.map(o=>o==null?"":Ho(o))}function ku(e,t,s,n,l,o,a){let i=[],r=us.get(l)||0;s=a?s:ye(gl(s,l),r);for(let d=s;d<=n;d=ye(d+l,r))i.push(Object.is(d,-0)?0:d);return i}function bo(e,t,s,n,l,o,a){const i=[],r=e.scales[e.axes[t].scale].log,d=r==10?Xt:fr,v=_t(d(s));l=an(r,v),r==10&&(l=ks[zt(l,ks)]);let p=s,m=l*r;r==10&&(m=ks[zt(m,ks)]);do i.push(p),p=p+l,r==10&&!us.has(p)&&(p=ye(p,us.get(l))),p>=m&&(l=p,m=l*r,r==10&&(m=ks[zt(m,ks)]));while(p<=n);return i}function wu(e,t,s,n,l,o,a){let r=e.scales[e.axes[t].scale].asinh,d=n>r?bo(e,t,ct(r,s),n,l):[r],v=n>=0&&s<=0?[0]:[];return(s<-r?bo(e,t,ct(r,-n),-s,l):[r]).reverse().map(m=>-m).concat(v,d)}const zr=/./,Su=/[12357]/,Tu=/[125]/,gi=/1/,yo=(e,t,s,n)=>e.map((l,o)=>t==4&&l==0||o%n==0&&s.test(l.toExponential()[l<0?1:0])?l:null);function Cu(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=e.scales[a],r=e.valToPos,d=o._space,v=r(10,a),p=r(9,a)-v>=d?zr:r(7,a)-v>=d?Su:r(5,a)-v>=d?Tu:gi;if(p==gi){let m=Ve(r(1,a)-v);if(m<d)return yo(t.slice().reverse(),i.distr,p,Et(d/m)).reverse()}return yo(t,i.distr,p,1)}function Eu(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=o._space,r=e.valToPos,d=Ve(r(1,a)-r(2,a));return d<i?yo(t.slice().reverse(),3,zr,Et(i/d)).reverse():t}function Mu(e,t,s,n){return n==null?Io:t==null?"":Ho(t)}const _i={show:!0,scale:"y",stroke:Fo,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Or,side:3,grid:Uo,ticks:Dr,border:Ar,font:Go,lineGap:Pr,rotate:0};function Lu(e,t){let s=3+(e||1)*2;return ye(s*t,3)}function Du(e,t){let{scale:s,idxs:n}=e.series[0],l=e._data[0],o=e.valToPos(l[n[0]],s,!0),a=e.valToPos(l[n[1]],s,!0),i=Ve(a-o),r=e.series[t],d=i/(r.points.space*me);return n[1]-n[0]<=d}const $i={scale:null,auto:!0,sorted:0,min:be,max:-be},Rr=(e,t,s,n,l)=>l,bi={show:!0,auto:!0,sorted:0,gaps:Rr,alpha:1,facets:[je({},$i,{scale:"x"}),je({},$i,{scale:"y"})]},yi={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:Rr,alpha:1,points:{show:Du,filter:null},values:null,min:be,max:-be,idxs:[],path:null,clip:null};function Au(e,t,s,n,l){return s/10}const Fr={time:nd,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},Ou=je({},Fr,{time:!1,ori:1}),xi={};function Ir(e,t){let s=xi[e];return s||(s={key:e,plots:[],sub(n){s.plots.push(n)},unsub(n){s.plots=s.plots.filter(l=>l!=n)},pub(n,l,o,a,i,r,d){for(let v=0;v<s.plots.length;v++)s.plots[v]!=l&&s.plots[v].pub(n,l,o,a,i,r,d)}},e!=null&&(xi[e]=s)),s}const dn=1,xo=2;function Es(e,t,s){const n=e.mode,l=e.series[t],o=n==2?e._data[t]:e._data,a=e.scales,i=e.bbox;let r=o[0],d=n==2?o[1]:o[t],v=n==2?a[l.facets[0].scale]:a[e.series[0].scale],p=n==2?a[l.facets[1].scale]:a[l.scale],m=i.left,g=i.top,k=i.width,M=i.height,T=e.valToPosH,y=e.valToPosV;return v.ori==0?s(l,r,d,v,p,T,y,m,g,k,M,bl,pn,xl,Nr,Hr):s(l,r,d,v,p,y,T,g,m,M,k,yl,fn,Jo,Br,Wr)}function Yo(e,t){let s=0,n=0,l=fe(e.bands,Wo);for(let o=0;o<l.length;o++){let a=l[o];a.series[0]==t?s=a.dir:a.series[1]==t&&(a.dir==1?n|=1:n|=2)}return[s,n==1?-1:n==2?1:n==3?2:0]}function Pu(e,t,s,n,l){let o=e.mode,a=e.series[t],i=o==2?a.facets[1].scale:a.scale,r=e.scales[i];return l==-1?r.min:l==1?r.max:r.distr==3?r.dir==1?r.min:r.max:0}function es(e,t,s,n,l,o){return Es(e,t,(a,i,r,d,v,p,m,g,k,M,T)=>{let y=a.pxRound;const $=d.dir*(d.ori==0?1:-1),x=d.ori==0?pn:fn;let w,N;$==1?(w=s,N=n):(w=n,N=s);let A=y(p(i[w],d,M,g)),O=y(m(r[w],v,T,k)),P=y(p(i[N],d,M,g)),b=y(m(o==1?v.max:v.min,v,T,k)),C=new Path2D(l);return x(C,P,b),x(C,A,b),x(C,A,O),C})}function $l(e,t,s,n,l,o){let a=null;if(e.length>0){a=new Path2D;const i=t==0?xl:Jo;let r=s;for(let p=0;p<e.length;p++){let m=e[p];if(m[1]>m[0]){let g=m[0]-r;g>0&&i(a,r,n,g,n+o),r=m[1]}}let d=s+l-r,v=10;d>0&&i(a,r,n-v/2,d,n+o+v)}return a}function zu(e,t,s){let n=e[e.length-1];n&&n[0]==t?n[1]=s:e.push([t,s])}function Ko(e,t,s,n,l,o,a){let i=[],r=e.length;for(let d=l==1?s:n;d>=s&&d<=n;d+=l)if(t[d]===null){let p=d,m=d;if(l==1)for(;++d<=n&&t[d]===null;)m=d;else for(;--d>=s&&t[d]===null;)m=d;let g=o(e[p]),k=m==p?g:o(e[m]),M=p-l;g=a<=0&&M>=0&&M<r?o(e[M]):g;let y=m+l;k=a>=0&&y>=0&&y<r?o(e[y]):k,k>=g&&i.push([g,k])}return i}function ki(e){return e==0?mr:e==1?He:t=>xs(t,e)}function jr(e){let t=e==0?bl:yl,s=e==0?(l,o,a,i,r,d)=>{l.arcTo(o,a,i,r,d)}:(l,o,a,i,r,d)=>{l.arcTo(a,o,r,i,d)},n=e==0?(l,o,a,i,r)=>{l.rect(o,a,i,r)}:(l,o,a,i,r)=>{l.rect(a,o,r,i)};return(l,o,a,i,r,d=0,v=0)=>{d==0&&v==0?n(l,o,a,i,r):(d=Rt(d,i/2,r/2),v=Rt(v,i/2,r/2),t(l,o+d,a),s(l,o+i,a,o+i,a+r,d),s(l,o+i,a+r,o,a+r,v),s(l,o,a+r,o,a,v),s(l,o,a,o+i,a,d),l.closePath())}}const bl=(e,t,s)=>{e.moveTo(t,s)},yl=(e,t,s)=>{e.moveTo(s,t)},pn=(e,t,s)=>{e.lineTo(t,s)},fn=(e,t,s)=>{e.lineTo(s,t)},xl=jr(0),Jo=jr(1),Nr=(e,t,s,n,l,o)=>{e.arc(t,s,n,l,o)},Br=(e,t,s,n,l,o)=>{e.arc(s,t,n,l,o)},Hr=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(t,s,n,l,o,a)},Wr=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(s,t,l,n,a,o)};function qr(e){return(t,s,n,l,o)=>Es(t,s,(a,i,r,d,v,p,m,g,k,M,T)=>{let{pxRound:y,points:$}=a,x,w;d.ori==0?(x=bl,w=Nr):(x=yl,w=Br);const N=ye($.width*me,3);let A=($.size-$.width)/2*me,O=ye(A*2,3),P=new Path2D,b=new Path2D,{left:C,top:D,width:F,height:R}=t.bbox;xl(b,C-O,D-O,F+O*2,R+O*2);const q=Y=>{if(r[Y]!=null){let ne=y(p(i[Y],d,M,g)),L=y(m(r[Y],v,T,k));x(P,ne+A,L),w(P,ne,L,A,0,Xn*2)}};if(o)o.forEach(q);else for(let Y=n;Y<=l;Y++)q(Y);return{stroke:N>0?P:null,fill:P,clip:b,flags:dn|xo}})}function Vr(e){return(t,s,n,l,o,a)=>{n!=l&&(o!=n&&a!=n&&e(t,s,n),o!=l&&a!=l&&e(t,s,l),e(t,s,a))}}const Ru=Vr(pn),Fu=Vr(fn);function Ur(e){const t=fe(e==null?void 0:e.alignGaps,0);return(s,n,l,o)=>Es(s,n,(a,i,r,d,v,p,m,g,k,M,T)=>{[l,o]=ml(r,l,o);let y=a.pxRound,$=R=>y(p(R,d,M,g)),x=R=>y(m(R,v,T,k)),w,N;d.ori==0?(w=pn,N=Ru):(w=fn,N=Fu);const A=d.dir*(d.ori==0?1:-1),O={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:dn},P=O.stroke;let b=!1;if(o-l>=M*4){let R=U=>s.posToVal(U,d.key,!0),q=null,Y=null,ne,L,B,V=$(i[A==1?l:o]),H=$(i[l]),le=$(i[o]),oe=R(A==1?H+1:le-1);for(let U=A==1?l:o;U>=l&&U<=o;U+=A){let Le=i[U],Ee=(A==1?Le<oe:Le>oe)?V:$(Le),ue=r[U];Ee==V?ue!=null?(L=ue,q==null?(w(P,Ee,x(L)),ne=q=Y=L):L<q?q=L:L>Y&&(Y=L)):ue===null&&(b=!0):(q!=null&&N(P,V,x(q),x(Y),x(ne),x(L)),ue!=null?(L=ue,w(P,Ee,x(L)),q=Y=ne=L):(q=Y=null,ue===null&&(b=!0)),V=Ee,oe=R(V+A))}q!=null&&q!=Y&&B!=V&&N(P,V,x(q),x(Y),x(ne),x(L))}else for(let R=A==1?l:o;R>=l&&R<=o;R+=A){let q=r[R];q===null?b=!0:q!=null&&w(P,$(i[R]),x(q))}let[D,F]=Yo(s,n);if(a.fill!=null||D!=0){let R=O.fill=new Path2D(P),q=a.fillTo(s,n,a.min,a.max,D),Y=x(q),ne=$(i[l]),L=$(i[o]);A==-1&&([L,ne]=[ne,L]),w(R,L,Y),w(R,ne,Y)}if(!a.spanGaps){let R=[];b&&R.push(...Ko(i,r,l,o,A,$,t)),O.gaps=R=a.gaps(s,n,l,o,R),O.clip=$l(R,d.ori,g,k,M,T)}return F!=0&&(O.band=F==2?[es(s,n,l,o,P,-1),es(s,n,l,o,P,1)]:es(s,n,l,o,P,F)),O})}function Iu(e){const t=fe(e.align,1),s=fe(e.ascDesc,!1),n=fe(e.alignGaps,0),l=fe(e.extend,!1);return(o,a,i,r)=>Es(o,a,(d,v,p,m,g,k,M,T,y,$,x)=>{[i,r]=ml(p,i,r);let w=d.pxRound,{left:N,width:A}=o.bbox,O=H=>w(k(H,m,$,T)),P=H=>w(M(H,g,x,y)),b=m.ori==0?pn:fn;const C={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:dn},D=C.stroke,F=m.dir*(m.ori==0?1:-1);let R=P(p[F==1?i:r]),q=O(v[F==1?i:r]),Y=q,ne=q;l&&t==-1&&(ne=N,b(D,ne,R)),b(D,q,R);for(let H=F==1?i:r;H>=i&&H<=r;H+=F){let le=p[H];if(le==null)continue;let oe=O(v[H]),U=P(le);t==1?b(D,oe,R):b(D,Y,U),b(D,oe,U),R=U,Y=oe}let L=Y;l&&t==1&&(L=N+A,b(D,L,R));let[B,V]=Yo(o,a);if(d.fill!=null||B!=0){let H=C.fill=new Path2D(D),le=d.fillTo(o,a,d.min,d.max,B),oe=P(le);b(H,L,oe),b(H,ne,oe)}if(!d.spanGaps){let H=[];H.push(...Ko(v,p,i,r,F,O,n));let le=d.width*me/2,oe=s||t==1?le:-le,U=s||t==-1?-le:le;H.forEach(Le=>{Le[0]+=oe,Le[1]+=U}),C.gaps=H=d.gaps(o,a,i,r,H),C.clip=$l(H,m.ori,T,y,$,x)}return V!=0&&(C.band=V==2?[es(o,a,i,r,D,-1),es(o,a,i,r,D,1)]:es(o,a,i,r,D,V)),C})}function wi(e,t,s,n,l,o,a=be){if(e.length>1){let i=null;for(let r=0,d=1/0;r<e.length;r++)if(t[r]!==void 0){if(i!=null){let v=Ve(e[r]-e[i]);v<d&&(d=v,a=Ve(s(e[r],n,l,o)-s(e[i],n,l,o)))}i=r}}return a}function ju(e){e=e||Mn;const t=fe(e.size,[.6,be,1]),s=e.align||0,n=e.gap||0;let l=e.radius;l=l==null?[0,0]:typeof l=="number"?[l,0]:l;const o=ce(l),a=1-t[0],i=fe(t[1],be),r=fe(t[2],1),d=fe(e.disp,Mn),v=fe(e.each,g=>{}),{fill:p,stroke:m}=d;return(g,k,M,T)=>Es(g,k,(y,$,x,w,N,A,O,P,b,C,D)=>{let F=y.pxRound,R=s,q=n*me,Y=i*me,ne=r*me,L,B;w.ori==0?[L,B]=o(g,k):[B,L]=o(g,k);const V=w.dir*(w.ori==0?1:-1);let H=w.ori==0?xl:Jo,le=w.ori==0?v:(Q,xe,Be,As,vs,Nt,ms)=>{v(Q,xe,Be,vs,As,ms,Nt)},oe=fe(g.bands,Wo).find(Q=>Q.series[0]==k),U=oe!=null?oe.dir:0,Le=y.fillTo(g,k,y.min,y.max,U),Re=F(O(Le,N,D,b)),Ee,ue,Mt,pt=C,De=F(y.width*me),jt=!1,Yt=null,yt=null,ts=null,Ms=null;p!=null&&(De==0||m!=null)&&(jt=!0,Yt=p.values(g,k,M,T),yt=new Map,new Set(Yt).forEach(Q=>{Q!=null&&yt.set(Q,new Path2D)}),De>0&&(ts=m.values(g,k,M,T),Ms=new Map,new Set(ts).forEach(Q=>{Q!=null&&Ms.set(Q,new Path2D)})));let{x0:Ls,size:vn}=d;if(Ls!=null&&vn!=null){R=1,$=Ls.values(g,k,M,T),Ls.unit==2&&($=$.map(Be=>g.posToVal(P+Be*C,w.key,!0)));let Q=vn.values(g,k,M,T);vn.unit==2?ue=Q[0]*C:ue=A(Q[0],w,C,P)-A(0,w,C,P),pt=wi($,x,A,w,C,P,pt),Mt=pt-ue+q}else pt=wi($,x,A,w,C,P,pt),Mt=pt*a+q,ue=pt-Mt;Mt<1&&(Mt=0),De>=ue/2&&(De=0),Mt<5&&(F=mr);let An=Mt>0,ps=pt-Mt-(An?De:0);ue=F($o(ps,ne,Y)),Ee=(R==0?ue/2:R==V?0:ue)-R*V*((R==0?q/2:0)+(An?De/2:0));const ot={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},Ds=jt?null:new Path2D;let Kt=null;if(oe!=null)Kt=g.data[oe.series[1]];else{let{y0:Q,y1:xe}=d;Q!=null&&xe!=null&&(x=xe.values(g,k,M,T),Kt=Q.values(g,k,M,T))}let fs=L*ue,ae=B*ue;for(let Q=V==1?M:T;Q>=M&&Q<=T;Q+=V){let xe=x[Q];if(xe==null)continue;if(Kt!=null){let dt=Kt[Q]??0;if(xe-dt==0)continue;Re=O(dt,N,D,b)}let Be=w.distr!=2||d!=null?$[Q]:Q,As=A(Be,w,C,P),vs=O(fe(xe,Le),N,D,b),Nt=F(As-Ee),ms=F(ct(vs,Re)),ft=F(Rt(vs,Re)),xt=ms-ft;if(xe!=null){let dt=xe<0?ae:fs,Lt=xe<0?fs:ae;jt?(De>0&&ts[Q]!=null&&H(Ms.get(ts[Q]),Nt,ft+_t(De/2),ue,ct(0,xt-De),dt,Lt),Yt[Q]!=null&&H(yt.get(Yt[Q]),Nt,ft+_t(De/2),ue,ct(0,xt-De),dt,Lt)):H(Ds,Nt,ft+_t(De/2),ue,ct(0,xt-De),dt,Lt),le(g,k,Q,Nt-De/2,ft,ue+De,xt)}}return De>0?ot.stroke=jt?Ms:Ds:jt||(ot._fill=y.width==0?y._fill:y._stroke??y._fill,ot.width=0),ot.fill=jt?yt:Ds,ot})}function Nu(e,t){const s=fe(t==null?void 0:t.alignGaps,0);return(n,l,o,a)=>Es(n,l,(i,r,d,v,p,m,g,k,M,T,y)=>{[o,a]=ml(d,o,a);let $=i.pxRound,x=L=>$(m(L,v,T,k)),w=L=>$(g(L,p,y,M)),N,A,O;v.ori==0?(N=bl,O=pn,A=Hr):(N=yl,O=fn,A=Wr);const P=v.dir*(v.ori==0?1:-1);let b=x(r[P==1?o:a]),C=b,D=[],F=[];for(let L=P==1?o:a;L>=o&&L<=a;L+=P)if(d[L]!=null){let V=r[L],H=x(V);D.push(C=H),F.push(w(d[L]))}const R={stroke:e(D,F,N,O,A,$),fill:null,clip:null,band:null,gaps:null,flags:dn},q=R.stroke;let[Y,ne]=Yo(n,l);if(i.fill!=null||Y!=0){let L=R.fill=new Path2D(q),B=i.fillTo(n,l,i.min,i.max,Y),V=w(B);O(L,C,V),O(L,b,V)}if(!i.spanGaps){let L=[];L.push(...Ko(r,d,o,a,P,x,s)),R.gaps=L=i.gaps(n,l,o,a,L),R.clip=$l(L,v.ori,k,M,T,y)}return ne!=0&&(R.band=ne==2?[es(n,l,o,a,q,-1),es(n,l,o,a,q,1)]:es(n,l,o,a,q,ne)),R})}function Bu(e){return Nu(Hu,e)}function Hu(e,t,s,n,l,o){const a=e.length;if(a<2)return null;const i=new Path2D;if(s(i,e[0],t[0]),a==2)n(i,e[1],t[1]);else{let r=Array(a),d=Array(a-1),v=Array(a-1),p=Array(a-1);for(let m=0;m<a-1;m++)v[m]=t[m+1]-t[m],p[m]=e[m+1]-e[m],d[m]=v[m]/p[m];r[0]=d[0];for(let m=1;m<a-1;m++)d[m]===0||d[m-1]===0||d[m-1]>0!=d[m]>0?r[m]=0:(r[m]=3*(p[m-1]+p[m])/((2*p[m]+p[m-1])/d[m-1]+(p[m]+2*p[m-1])/d[m]),isFinite(r[m])||(r[m]=0));r[a-1]=d[a-2];for(let m=0;m<a-1;m++)l(i,e[m]+p[m]/3,t[m]+r[m]*p[m]/3,e[m+1]-p[m]/3,t[m+1]-r[m+1]*p[m]/3,e[m+1],t[m+1])}return i}const ko=new Set;function Si(){for(let e of ko)e.syncRect(!0)}un&&(Ss(xd,nn,Si),Ss(kd,nn,Si,!0),Ss(al,nn,()=>{st.pxRatio=me}));const Wu=Ur(),qu=qr();function Ti(e,t,s,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,a)=>wo(o,a,t,s))}function Vu(e,t){return e.map((s,n)=>n==0?{}:je({},t,s))}function wo(e,t,s,n){return je({},t==0?s:n,e)}function Gr(e,t,s){return t==null?rn:[t,s]}const Uu=Gr;function Gu(e,t,s){return t==null?rn:il(t,s,Bo,!0)}function Yr(e,t,s,n){return t==null?rn:hl(t,s,e.scales[n].log,!1)}const Yu=Yr;function Kr(e,t,s,n){return t==null?rn:No(t,s,e.scales[n].log,!1)}const Ku=Kr;function Ju(e,t,s,n,l){let o=ct(li(e),li(t)),a=t-e,i=zt(l/n*a,s);do{let r=s[i],d=n*r/a;if(d>=l&&o+(r<5?us.get(r):0)<=17)return[r,d]}while(++i<s.length);return[0,0]}function Ci(e){let t,s;return e=e.replace(/(\d+)px/,(n,l)=>(t=He((s=+l)*me))+"px"),[e,t,s]}function Qu(e){e.show&&[e.font,e.labelFont].forEach(t=>{let s=ye(t[2]*me,1);t[0]=t[0].replace(/[0-9.]+px/,s+"px"),t[1]=s})}function st(e,t,s){const n={mode:fe(e.mode,1)},l=n.mode;function o(u,f,h,_){let S=f.valToPct(u);return _+h*(f.dir==-1?1-S:S)}function a(u,f,h,_){let S=f.valToPct(u);return _+h*(f.dir==-1?S:1-S)}function i(u,f,h,_){return f.ori==0?o(u,f,h,_):a(u,f,h,_)}n.valToPosH=o,n.valToPosV=a;let r=!1;n.status=0;const d=n.root=Ct(ld);if(e.id!=null&&(d.id=e.id),gt(d,e.class),e.title){let u=Ct(id,d);u.textContent=e.title}const v=Pt("canvas"),p=n.ctx=v.getContext("2d"),m=Ct(rd,d);Ss("click",m,u=>{u.target===k&&(ke!=Ws||Me!=qs)&&tt.click(n,u)},!0);const g=n.under=Ct(cd,m);m.appendChild(v);const k=n.over=Ct(dd,m);e=cn(e);const M=+fe(e.pxAlign,1),T=ki(M);(e.plugins||[]).forEach(u=>{u.opts&&(e=u.opts(n,e)||e)});const y=e.ms||.001,$=n.series=l==1?Ti(e.series||[],hi,yi,!1):Vu(e.series||[null],bi),x=n.axes=Ti(e.axes||[],mi,_i,!0),w=n.scales={},N=n.bands=e.bands||[];N.forEach(u=>{u.fill=ce(u.fill||null),u.dir=fe(u.dir,-1)});const A=l==2?$[1].facets[0].scale:$[0].scale,O={axes:gc,series:pc},P=(e.drawOrder||["axes","series"]).map(u=>O[u]);function b(u){const f=u.distr==3?h=>Xt(h>0?h:u.clamp(n,h,u.min,u.max,u.key)):u.distr==4?h=>Xl(h,u.asinh):u.distr==100?h=>u.fwd(h):h=>h;return h=>{let _=f(h),{_min:S,_max:E}=u,I=E-S;return(_-S)/I}}function C(u){let f=w[u];if(f==null){let h=(e.scales||Mn)[u]||Mn;if(h.from!=null){C(h.from);let _=je({},w[h.from],h,{key:u});_.valToPct=b(_),w[u]=_}else{f=w[u]=je({},u==A?Fr:Ou,h),f.key=u;let _=f.time,S=f.range,E=rs(S);if((u!=A||l==2&&!_)&&(E&&(S[0]==null||S[1]==null)&&(S={min:S[0]==null?ti:{mode:1,hard:S[0],soft:S[0]},max:S[1]==null?ti:{mode:1,hard:S[1],soft:S[1]}},E=!1),!E&&_l(S))){let I=S;S=(j,W,K)=>W==null?rn:il(W,K,I)}f.range=ce(S||(_?Uu:u==A?f.distr==3?Yu:f.distr==4?Ku:Gr:f.distr==3?Yr:f.distr==4?Kr:Gu)),f.auto=ce(E?!1:f.auto),f.clamp=ce(f.clamp||Au),f._min=f._max=null,f.valToPct=b(f)}}}C("x"),C("y"),l==1&&$.forEach(u=>{C(u.scale)}),x.forEach(u=>{C(u.scale)});for(let u in e.scales)C(u);const D=w[A],F=D.distr;let R,q;D.ori==0?(gt(d,od),R=o,q=a):(gt(d,ad),R=a,q=o);const Y={};for(let u in w){let f=w[u];(f.min!=null||f.max!=null)&&(Y[u]={min:f.min,max:f.max},f.min=f.max=null)}const ne=e.tzDate||(u=>new Date(He(u/y))),L=e.fmtDate||qo,B=y==1?ou(ne):ru(ne),V=pi(ne,ui(y==1?lu:iu,L)),H=vi(ne,fi(du,L)),le=[],oe=n.legend=je({},fu,e.legend),U=n.cursor=je({},$u,{drag:{y:l==2}},e.cursor),Le=oe.show,Re=U.show,Ee=oe.markers;oe.idxs=le,Ee.width=ce(Ee.width),Ee.dash=ce(Ee.dash),Ee.stroke=ce(Ee.stroke),Ee.fill=ce(Ee.fill);let ue,Mt,pt,De=[],jt=[],Yt,yt=!1,ts={};if(oe.live){const u=$[1]?$[1].values:null;yt=u!=null,Yt=yt?u(n,1,0):{_:0};for(let f in Yt)ts[f]=Io}if(Le)if(ue=Pt("table",hd,d),pt=Pt("tbody",null,ue),oe.mount(n,ue),yt){Mt=Pt("thead",null,ue,pt);let u=Pt("tr",null,Mt);Pt("th",null,u);for(var Ms in Yt)Pt("th",Ha,u).textContent=Ms}else gt(ue,_d),oe.live&&gt(ue,gd);const Ls={show:!0},vn={show:!1};function An(u,f){if(f==0&&(yt||!oe.live||l==2))return rn;let h=[],_=Pt("tr",$d,pt,pt.childNodes[f]);gt(_,u.class),u.show||gt(_,ws);let S=Pt("th",null,_);if(Ee.show){let j=Ct(bd,S);if(f>0){let W=Ee.width(n,f);W&&(j.style.border=W+"px "+Ee.dash(n,f)+" "+Ee.stroke(n,f)),j.style.background=Ee.fill(n,f)}}let E=Ct(Ha,S);u.label instanceof HTMLElement?E.appendChild(u.label):E.textContent=u.label,f>0&&(Ee.show||(E.style.color=u.width>0?Ee.stroke(n,f):Ee.fill(n,f)),ot("click",S,j=>{if(U._lock)return;gs(j);let W=$.indexOf(u);if((j.ctrlKey||j.metaKey)!=oe.isolate){let K=$.some((J,Z)=>Z>0&&Z!=W&&J.show);$.forEach((J,Z)=>{Z>0&&Ht(Z,K?Z==W?Ls:vn:Ls,!0,Fe.setSeries)})}else Ht(W,{show:!u.show},!0,Fe.setSeries)},!1),Ps&&ot(Ua,S,j=>{U._lock||(gs(j),Ht($.indexOf(u),Us,!0,Fe.setSeries))},!1));for(var I in Yt){let j=Pt("td",yd,_);j.textContent="--",h.push(j)}return[_,h]}const ps=new Map;function ot(u,f,h,_=!0){const S=ps.get(f)||{},E=U.bind[u](n,f,h,_);E&&(Ss(u,f,S[u]=E),ps.set(f,S))}function Ds(u,f,h){const _=ps.get(f)||{};for(let S in _)(u==null||S==u)&&(_o(S,f,_[S]),delete _[S]);u==null&&ps.delete(f)}let Kt=0,fs=0,ae=0,Q=0,xe=0,Be=0,As=xe,vs=Be,Nt=ae,ms=Q,ft=0,xt=0,dt=0,Lt=0;n.bbox={};let kl=!1,On=!1,Os=!1,hs=!1,Pn=!1,kt=!1;function wl(u,f,h){(h||u!=n.width||f!=n.height)&&Qo(u,f),js(!1),Os=!0,On=!0,Ns()}function Qo(u,f){n.width=Kt=ae=u,n.height=fs=Q=f,xe=Be=0,oc(),ac();let h=n.bbox;ft=h.left=xs(xe*me,.5),xt=h.top=xs(Be*me,.5),dt=h.width=xs(ae*me,.5),Lt=h.height=xs(Q*me,.5)}const sc=3;function nc(){let u=!1,f=0;for(;!u;){f++;let h=mc(f),_=hc(f);u=f==sc||h&&_,u||(Qo(n.width,n.height),On=!0)}}function lc({width:u,height:f}){wl(u,f)}n.setSize=lc;function oc(){let u=!1,f=!1,h=!1,_=!1;x.forEach((S,E)=>{if(S.show&&S._show){let{side:I,_size:j}=S,W=I%2,K=S.label!=null?S.labelSize:0,J=j+K;J>0&&(W?(ae-=J,I==3?(xe+=J,_=!0):h=!0):(Q-=J,I==0?(Be+=J,u=!0):f=!0))}}),_s[0]=u,_s[1]=h,_s[2]=f,_s[3]=_,ae-=ss[1]+ss[3],xe+=ss[3],Q-=ss[2]+ss[0],Be+=ss[0]}function ac(){let u=xe+ae,f=Be+Q,h=xe,_=Be;function S(E,I){switch(E){case 1:return u+=I,u-I;case 2:return f+=I,f-I;case 3:return h-=I,h+I;case 0:return _-=I,_+I}}x.forEach((E,I)=>{if(E.show&&E._show){let j=E.side;E._pos=S(j,E._size),E.label!=null&&(E._lpos=S(j,E.labelSize))}})}if(U.dataIdx==null){let u=U.hover,f=u.skip=new Set(u.skip??[]);f.add(void 0);let h=u.prox=ce(u.prox),_=u.bias??(u.bias=0);U.dataIdx=(S,E,I,j)=>{if(E==0)return I;let W=I,K=h(S,E,I,j)??be,J=K>=0&&K<be,Z=D.ori==0?ae:Q,se=U.left,ve=t[0],pe=t[E];if(f.has(pe[I])){W=null;let re=null,te=null,ee;if(_==0||_==-1)for(ee=I;re==null&&ee-- >0;)f.has(pe[ee])||(re=ee);if(_==0||_==1)for(ee=I;te==null&&ee++<pe.length;)f.has(pe[ee])||(te=ee);if(re!=null||te!=null)if(J){let Se=re==null?-1/0:R(ve[re],D,Z,0),Pe=te==null?1/0:R(ve[te],D,Z,0),Ze=se-Se,$e=Pe-se;Ze<=$e?Ze<=K&&(W=re):$e<=K&&(W=te)}else W=te==null?re:re==null?te:I-re<=te-I?re:te}else J&&Ve(se-R(ve[I],D,Z,0))>K&&(W=null);return W}}const gs=u=>{U.event=u};U.idxs=le,U._lock=!1;let nt=U.points;nt.show=ce(nt.show),nt.size=ce(nt.size),nt.stroke=ce(nt.stroke),nt.width=ce(nt.width),nt.fill=ce(nt.fill);const Bt=n.focus=je({},e.focus||{alpha:.3},U.focus),Ps=Bt.prox>=0,zs=Ps&&nt.one;let wt=[],Rs=[],Fs=[];function Zo(u,f){let h=nt.show(n,f);if(h instanceof HTMLElement)return gt(h,md),gt(h,u.class),Ut(h,-10,-10,ae,Q),k.insertBefore(h,wt[f]),h}function Xo(u,f){if(l==1||f>0){let h=l==1&&w[u.scale].time,_=u.value;u.value=h?ii(_)?vi(ne,fi(_,L)):_||H:_||Mu,u.label=u.label||(h?yu:bu)}if(zs||f>0){u.width=u.width==null?1:u.width,u.paths=u.paths||Wu||Od,u.fillTo=ce(u.fillTo||Pu),u.pxAlign=+fe(u.pxAlign,M),u.pxRound=ki(u.pxAlign),u.stroke=ce(u.stroke||null),u.fill=ce(u.fill||null),u._stroke=u._fill=u._paths=u._focus=null;let h=Lu(ct(1,u.width),1),_=u.points=je({},{size:h,width:ct(1,h*.2),stroke:u.stroke,space:h*2,paths:qu,_stroke:null,_fill:null},u.points);_.show=ce(_.show),_.filter=ce(_.filter),_.fill=ce(_.fill),_.stroke=ce(_.stroke),_.paths=ce(_.paths),_.pxAlign=u.pxAlign}if(Le){let h=An(u,f);De.splice(f,0,h[0]),jt.splice(f,0,h[1]),oe.values.push(null)}if(Re){le.splice(f,0,null);let h=null;zs?f==0&&(h=Zo(u,f)):f>0&&(h=Zo(u,f)),wt.splice(f,0,h),Rs.splice(f,0,0),Fs.splice(f,0,0)}Qe("addSeries",f)}function ic(u,f){f=f??$.length,u=l==1?wo(u,f,hi,yi):wo(u,f,{},bi),$.splice(f,0,u),Xo($[f],f)}n.addSeries=ic;function rc(u){if($.splice(u,1),Le){oe.values.splice(u,1),jt.splice(u,1);let f=De.splice(u,1)[0];Ds(null,f.firstChild),f.remove()}Re&&(le.splice(u,1),wt.splice(u,1)[0].remove(),Rs.splice(u,1),Fs.splice(u,1)),Qe("delSeries",u)}n.delSeries=rc;const _s=[!1,!1,!1,!1];function cc(u,f){if(u._show=u.show,u.show){let h=u.side%2,_=w[u.scale];_==null&&(u.scale=h?$[1].scale:A,_=w[u.scale]);let S=_.time;u.size=ce(u.size),u.space=ce(u.space),u.rotate=ce(u.rotate),rs(u.incrs)&&u.incrs.forEach(I=>{!us.has(I)&&us.set(I,_r(I))}),u.incrs=ce(u.incrs||(_.distr==2?tu:S?y==1?nu:au:ks)),u.splits=ce(u.splits||(S&&_.distr==1?B:_.distr==3?bo:_.distr==4?wu:ku)),u.stroke=ce(u.stroke),u.grid.stroke=ce(u.grid.stroke),u.ticks.stroke=ce(u.ticks.stroke),u.border.stroke=ce(u.border.stroke);let E=u.values;u.values=rs(E)&&!rs(E[0])?ce(E):S?rs(E)?pi(ne,ui(E,L)):ii(E)?cu(ne,E):E||V:E||xu,u.filter=ce(u.filter||(_.distr>=3&&_.log==10?Cu:_.distr==3&&_.log==2?Eu:hr)),u.font=Ci(u.font),u.labelFont=Ci(u.labelFont),u._size=u.size(n,null,f,0),u._space=u._rotate=u._incrs=u._found=u._splits=u._values=null,u._size>0&&(_s[f]=!0,u._el=Ct(ud,m))}}function mn(u,f,h,_){let[S,E,I,j]=h,W=f%2,K=0;return W==0&&(j||E)&&(K=f==0&&!S||f==2&&!I?He(mi.size/3):0),W==1&&(S||I)&&(K=f==1&&!E||f==3&&!j?He(_i.size/2):0),K}const ea=n.padding=(e.padding||[mn,mn,mn,mn]).map(u=>ce(fe(u,mn))),ss=n._padding=ea.map((u,f)=>u(n,f,_s,0));let et,Ge=null,Ye=null;const zn=l==1?$[0].idxs:null;let Dt=null,hn=!1;function ta(u,f){if(t=u??[],n.data=n._data=t,l==2){et=0;for(let h=1;h<$.length;h++)et+=t[h][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),Dt=t[0],et=Dt.length;let h=t;if(F==2){h=t.slice();let _=h[0]=Array(et);for(let S=0;S<et;S++)_[S]=S}n._data=t=h}if(js(!0),Qe("setData"),F==2&&(Os=!0),f!==!1){let h=D;h.auto(n,hn)?Sl():ls(A,h.min,h.max),hs=hs||U.left>=0,kt=!0,Ns()}}n.setData=ta;function Sl(){hn=!0;let u,f;l==1&&(et>0?(Ge=zn[0]=0,Ye=zn[1]=et-1,u=t[0][Ge],f=t[0][Ye],F==2?(u=Ge,f=Ye):u==f&&(F==3?[u,f]=hl(u,u,D.log,!1):F==4?[u,f]=No(u,u,D.log,!1):D.time?f=u+He(86400/y):[u,f]=il(u,f,Bo,!0))):(Ge=zn[0]=u=null,Ye=zn[1]=f=null)),ls(A,u,f)}let Rn,Is,Tl,Cl,El,Ml,Ll,Dl,Al,ut;function sa(u,f,h,_,S,E){u??(u=qa),h??(h=Wo),_??(_="butt"),S??(S=qa),E??(E="round"),u!=Rn&&(p.strokeStyle=Rn=u),S!=Is&&(p.fillStyle=Is=S),f!=Tl&&(p.lineWidth=Tl=f),E!=El&&(p.lineJoin=El=E),_!=Ml&&(p.lineCap=Ml=_),h!=Cl&&p.setLineDash(Cl=h)}function na(u,f,h,_){f!=Is&&(p.fillStyle=Is=f),u!=Ll&&(p.font=Ll=u),h!=Dl&&(p.textAlign=Dl=h),_!=Al&&(p.textBaseline=Al=_)}function Ol(u,f,h,_,S=0){if(_.length>0&&u.auto(n,hn)&&(f==null||f.min==null)){let E=fe(Ge,0),I=fe(Ye,_.length-1),j=h.min==null?Cd(_,E,I,S,u.distr==3):[h.min,h.max];u.min=Rt(u.min,h.min=j[0]),u.max=ct(u.max,h.max=j[1])}}const la={min:null,max:null};function dc(){for(let _ in w){let S=w[_];Y[_]==null&&(S.min==null||Y[A]!=null&&S.auto(n,hn))&&(Y[_]=la)}for(let _ in w){let S=w[_];Y[_]==null&&S.from!=null&&Y[S.from]!=null&&(Y[_]=la)}Y[A]!=null&&js(!0);let u={};for(let _ in Y){let S=Y[_];if(S!=null){let E=u[_]=cn(w[_],Rd);if(S.min!=null)je(E,S);else if(_!=A||l==2)if(et==0&&E.from==null){let I=E.range(n,null,null,_);E.min=I[0],E.max=I[1]}else E.min=be,E.max=-be}}if(et>0){$.forEach((_,S)=>{if(l==1){let E=_.scale,I=Y[E];if(I==null)return;let j=u[E];if(S==0){let W=j.range(n,j.min,j.max,E);j.min=W[0],j.max=W[1],Ge=zt(j.min,t[0]),Ye=zt(j.max,t[0]),Ye-Ge>1&&(t[0][Ge]<j.min&&Ge++,t[0][Ye]>j.max&&Ye--),_.min=Dt[Ge],_.max=Dt[Ye]}else _.show&&_.auto&&Ol(j,I,_,t[S],_.sorted);_.idxs[0]=Ge,_.idxs[1]=Ye}else if(S>0&&_.show&&_.auto){let[E,I]=_.facets,j=E.scale,W=I.scale,[K,J]=t[S],Z=u[j],se=u[W];Z!=null&&Ol(Z,Y[j],E,K,E.sorted),se!=null&&Ol(se,Y[W],I,J,I.sorted),_.min=I.min,_.max=I.max}});for(let _ in u){let S=u[_],E=Y[_];if(S.from==null&&(E==null||E.min==null)){let I=S.range(n,S.min==be?null:S.min,S.max==-be?null:S.max,_);S.min=I[0],S.max=I[1]}}}for(let _ in u){let S=u[_];if(S.from!=null){let E=u[S.from];if(E.min==null)S.min=S.max=null;else{let I=S.range(n,E.min,E.max,_);S.min=I[0],S.max=I[1]}}}let f={},h=!1;for(let _ in u){let S=u[_],E=w[_];if(E.min!=S.min||E.max!=S.max){E.min=S.min,E.max=S.max;let I=E.distr;E._min=I==3?Xt(E.min):I==4?Xl(E.min,E.asinh):I==100?E.fwd(E.min):E.min,E._max=I==3?Xt(E.max):I==4?Xl(E.max,E.asinh):I==100?E.fwd(E.max):E.max,f[_]=h=!0}}if(h){$.forEach((_,S)=>{l==2?S>0&&f.y&&(_._paths=null):f[_.scale]&&(_._paths=null)});for(let _ in f)Os=!0,Qe("setScale",_);Re&&U.left>=0&&(hs=kt=!0)}for(let _ in Y)Y[_]=null}function uc(u){let f=$o(Ge-1,0,et-1),h=$o(Ye+1,0,et-1);for(;u[f]==null&&f>0;)f--;for(;u[h]==null&&h<et-1;)h++;return[f,h]}function pc(){if(et>0){let u=$.some(f=>f._focus)&&ut!=Bt.alpha;u&&(p.globalAlpha=ut=Bt.alpha),$.forEach((f,h)=>{if(h>0&&f.show&&(oa(h,!1),oa(h,!0),f._paths==null)){let _=ut;ut!=f.alpha&&(p.globalAlpha=ut=f.alpha);let S=l==2?[0,t[h][0].length-1]:uc(t[h]);f._paths=f.paths(n,h,S[0],S[1]),ut!=_&&(p.globalAlpha=ut=_)}}),$.forEach((f,h)=>{if(h>0&&f.show){let _=ut;ut!=f.alpha&&(p.globalAlpha=ut=f.alpha),f._paths!=null&&aa(h,!1);{let S=f._paths!=null?f._paths.gaps:null,E=f.points.show(n,h,Ge,Ye,S),I=f.points.filter(n,h,E,S);(E||I)&&(f.points._paths=f.points.paths(n,h,Ge,Ye,I),aa(h,!0))}ut!=_&&(p.globalAlpha=ut=_),Qe("drawSeries",h)}}),u&&(p.globalAlpha=ut=1)}}function oa(u,f){let h=f?$[u].points:$[u];h._stroke=h.stroke(n,u),h._fill=h.fill(n,u)}function aa(u,f){let h=f?$[u].points:$[u],{stroke:_,fill:S,clip:E,flags:I,_stroke:j=h._stroke,_fill:W=h._fill,_width:K=h.width}=h._paths;K=ye(K*me,3);let J=null,Z=K%2/2;f&&W==null&&(W=K>0?"#fff":j);let se=h.pxAlign==1&&Z>0;if(se&&p.translate(Z,Z),!f){let ve=ft-K/2,pe=xt-K/2,re=dt+K,te=Lt+K;J=new Path2D,J.rect(ve,pe,re,te)}f?Pl(j,K,h.dash,h.cap,W,_,S,I,E):fc(u,j,K,h.dash,h.cap,W,_,S,I,J,E),se&&p.translate(-Z,-Z)}function fc(u,f,h,_,S,E,I,j,W,K,J){let Z=!1;W!=0&&N.forEach((se,ve)=>{if(se.series[0]==u){let pe=$[se.series[1]],re=t[se.series[1]],te=(pe._paths||Mn).band;rs(te)&&(te=se.dir==1?te[0]:te[1]);let ee,Se=null;pe.show&&te&&Md(re,Ge,Ye)?(Se=se.fill(n,ve)||E,ee=pe._paths.clip):te=null,Pl(f,h,_,S,Se,I,j,W,K,J,ee,te),Z=!0}}),Z||Pl(f,h,_,S,E,I,j,W,K,J)}const ia=dn|xo;function Pl(u,f,h,_,S,E,I,j,W,K,J,Z){sa(u,f,h,_,S),(W||K||Z)&&(p.save(),W&&p.clip(W),K&&p.clip(K)),Z?(j&ia)==ia?(p.clip(Z),J&&p.clip(J),In(S,I),Fn(u,E,f)):j&xo?(In(S,I),p.clip(Z),Fn(u,E,f)):j&dn&&(p.save(),p.clip(Z),J&&p.clip(J),In(S,I),p.restore(),Fn(u,E,f)):(In(S,I),Fn(u,E,f)),(W||K||Z)&&p.restore()}function Fn(u,f,h){h>0&&(f instanceof Map?f.forEach((_,S)=>{p.strokeStyle=Rn=S,p.stroke(_)}):f!=null&&u&&p.stroke(f))}function In(u,f){f instanceof Map?f.forEach((h,_)=>{p.fillStyle=Is=_,p.fill(h)}):f!=null&&u&&p.fill(f)}function vc(u,f,h,_){let S=x[u],E;if(_<=0)E=[0,0];else{let I=S._space=S.space(n,u,f,h,_),j=S._incrs=S.incrs(n,u,f,h,_,I);E=Ju(f,h,j,_,I)}return S._found=E}function zl(u,f,h,_,S,E,I,j,W,K){let J=I%2/2;M==1&&p.translate(J,J),sa(j,I,W,K,j),p.beginPath();let Z,se,ve,pe,re=S+(_==0||_==3?-E:E);h==0?(se=S,pe=re):(Z=S,ve=re);for(let te=0;te<u.length;te++)f[te]!=null&&(h==0?Z=ve=u[te]:se=pe=u[te],p.moveTo(Z,se),p.lineTo(ve,pe));p.stroke(),M==1&&p.translate(-J,-J)}function mc(u){let f=!0;return x.forEach((h,_)=>{if(!h.show)return;let S=w[h.scale];if(S.min==null){h._show&&(f=!1,h._show=!1,js(!1));return}else h._show||(f=!1,h._show=!0,js(!1));let E=h.side,I=E%2,{min:j,max:W}=S,[K,J]=vc(_,j,W,I==0?ae:Q);if(J==0)return;let Z=S.distr==2,se=h._splits=h.splits(n,_,j,W,K,J,Z),ve=S.distr==2?se.map(ee=>Dt[ee]):se,pe=S.distr==2?Dt[se[1]]-Dt[se[0]]:K,re=h._values=h.values(n,h.filter(n,ve,_,J,pe),_,J,pe);h._rotate=E==2?h.rotate(n,re,_,J):0;let te=h._size;h._size=Et(h.size(n,re,_,u)),te!=null&&h._size!=te&&(f=!1)}),f}function hc(u){let f=!0;return ea.forEach((h,_)=>{let S=h(n,_,_s,u);S!=ss[_]&&(f=!1),ss[_]=S}),f}function gc(){for(let u=0;u<x.length;u++){let f=x[u];if(!f.show||!f._show)continue;let h=f.side,_=h%2,S,E,I=f.stroke(n,u),j=h==0||h==3?-1:1,[W,K]=f._found;if(f.label!=null){let it=f.labelGap*j,ht=He((f._lpos+it)*me);na(f.labelFont[0],I,"center",h==2?xn:Wa),p.save(),_==1?(S=E=0,p.translate(ht,He(xt+Lt/2)),p.rotate((h==3?-Xn:Xn)/2)):(S=He(ft+dt/2),E=ht);let ys=vr(f.label)?f.label(n,u,W,K):f.label;p.fillText(ys,S,E),p.restore()}if(K==0)continue;let J=w[f.scale],Z=_==0?dt:Lt,se=_==0?ft:xt,ve=f._splits,pe=J.distr==2?ve.map(it=>Dt[it]):ve,re=J.distr==2?Dt[ve[1]]-Dt[ve[0]]:W,te=f.ticks,ee=f.border,Se=te.show?te.size:0,Pe=He(Se*me),Ze=He((f.alignTo==2?f._size-Se-f.gap:f.gap)*me),$e=f._rotate*-Xn/180,ze=T(f._pos*me),vt=(Pe+Ze)*j,at=ze+vt;E=_==0?at:0,S=_==1?at:0;let St=f.font[0],At=f.align==1?Ks:f.align==2?Jl:$e>0?Ks:$e<0?Jl:_==0?"center":h==3?Jl:Ks,qt=$e||_==1?"middle":h==2?xn:Wa;na(St,I,At,qt);let mt=f.font[1]*f.lineGap,Tt=ve.map(it=>T(i(it,J,Z,se))),Ot=f._values;for(let it=0;it<Ot.length;it++){let ht=Ot[it];if(ht!=null){_==0?S=Tt[it]:E=Tt[it],ht=""+ht;let ys=ht.indexOf(`
`)==-1?[ht]:ht.split(/\n/gm);for(let rt=0;rt<ys.length;rt++){let Ta=ys[rt];$e?(p.save(),p.translate(S,E+rt*mt),p.rotate($e),p.fillText(Ta,0,0),p.restore()):p.fillText(Ta,S,E+rt*mt)}}}te.show&&zl(Tt,te.filter(n,pe,u,K,re),_,h,ze,Pe,ye(te.width*me,3),te.stroke(n,u),te.dash,te.cap);let Vt=f.grid;Vt.show&&zl(Tt,Vt.filter(n,pe,u,K,re),_,_==0?2:1,_==0?xt:ft,_==0?Lt:dt,ye(Vt.width*me,3),Vt.stroke(n,u),Vt.dash,Vt.cap),ee.show&&zl([ze],[1],_==0?1:0,_==0?1:2,_==1?xt:ft,_==1?Lt:dt,ye(ee.width*me,3),ee.stroke(n,u),ee.dash,ee.cap)}Qe("drawAxes")}function js(u){$.forEach((f,h)=>{h>0&&(f._paths=null,u&&(l==1?(f.min=null,f.max=null):f.facets.forEach(_=>{_.min=null,_.max=null})))})}let jn=!1,Rl=!1,gn=[];function _c(){Rl=!1;for(let u=0;u<gn.length;u++)Qe(...gn[u]);gn.length=0}function Ns(){jn||(Wd(ra),jn=!0)}function $c(u,f=!1){jn=!0,Rl=f,u(n),ra(),f&&gn.length>0&&queueMicrotask(_c)}n.batch=$c;function ra(){if(kl&&(dc(),kl=!1),Os&&(nc(),Os=!1),On){if(Te(g,Ks,xe),Te(g,xn,Be),Te(g,Sn,ae),Te(g,Tn,Q),Te(k,Ks,xe),Te(k,xn,Be),Te(k,Sn,ae),Te(k,Tn,Q),Te(m,Sn,Kt),Te(m,Tn,fs),v.width=He(Kt*me),v.height=He(fs*me),x.forEach(({_el:u,_show:f,_size:h,_pos:_,side:S})=>{if(u!=null)if(f){let E=S===3||S===0?h:0,I=S%2==1;Te(u,I?"left":"top",_-E),Te(u,I?"width":"height",h),Te(u,I?"top":"left",I?Be:xe),Te(u,I?"height":"width",I?Q:ae),go(u,ws)}else gt(u,ws)}),Rn=Is=Tl=El=Ml=Ll=Dl=Al=Cl=null,ut=1,bn(!0),xe!=As||Be!=vs||ae!=Nt||Q!=ms){js(!1);let u=ae/Nt,f=Q/ms;if(Re&&!hs&&U.left>=0){U.left*=u,U.top*=f,Bs&&Ut(Bs,He(U.left),0,ae,Q),Hs&&Ut(Hs,0,He(U.top),ae,Q);for(let h=0;h<wt.length;h++){let _=wt[h];_!=null&&(Rs[h]*=u,Fs[h]*=f,Ut(_,Et(Rs[h]),Et(Fs[h]),ae,Q))}}if(we.show&&!Pn&&we.left>=0&&we.width>0){we.left*=u,we.width*=u,we.top*=f,we.height*=f;for(let h in Hl)Te(Vs,h,we[h])}As=xe,vs=Be,Nt=ae,ms=Q}Qe("setSize"),On=!1}Kt>0&&fs>0&&(p.clearRect(0,0,v.width,v.height),Qe("drawClear"),P.forEach(u=>u()),Qe("draw")),we.show&&Pn&&(Nn(we),Pn=!1),Re&&hs&&(bs(null,!0,!1),hs=!1),oe.show&&oe.live&&kt&&(Nl(),kt=!1),r||(r=!0,n.status=1,Qe("ready")),hn=!1,jn=!1}n.redraw=(u,f)=>{Os=f||!1,u!==!1?ls(A,D.min,D.max):Ns()};function Fl(u,f){let h=w[u];if(h.from==null){if(et==0){let _=h.range(n,f.min,f.max,u);f.min=_[0],f.max=_[1]}if(f.min>f.max){let _=f.min;f.min=f.max,f.max=_}if(et>1&&f.min!=null&&f.max!=null&&f.max-f.min<1e-16)return;u==A&&h.distr==2&&et>0&&(f.min=zt(f.min,t[0]),f.max=zt(f.max,t[0]),f.min==f.max&&f.max++),Y[u]=f,kl=!0,Ns()}}n.setScale=Fl;let Il,jl,Bs,Hs,ca,da,Ws,qs,ua,pa,ke,Me,ns=!1;const tt=U.drag;let Ke=tt.x,Je=tt.y;Re&&(U.x&&(Il=Ct(fd,k)),U.y&&(jl=Ct(vd,k)),D.ori==0?(Bs=Il,Hs=jl):(Bs=jl,Hs=Il),ke=U.left,Me=U.top);const we=n.select=je({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Vs=we.show?Ct(pd,we.over?k:g):null;function Nn(u,f){if(we.show){for(let h in u)we[h]=u[h],h in Hl&&Te(Vs,h,u[h]);f!==!1&&Qe("setSelect")}}n.setSelect=Nn;function bc(u){if($[u].show)Le&&go(De[u],ws);else if(Le&&gt(De[u],ws),Re){let h=zs?wt[0]:wt[u];h!=null&&Ut(h,-10,-10,ae,Q)}}function ls(u,f,h){Fl(u,{min:f,max:h})}function Ht(u,f,h,_){f.focus!=null&&Sc(u),f.show!=null&&$.forEach((S,E)=>{E>0&&(u==E||u==null)&&(S.show=f.show,bc(E),l==2?(ls(S.facets[0].scale,null,null),ls(S.facets[1].scale,null,null)):ls(S.scale,null,null),Ns())}),h!==!1&&Qe("setSeries",u,f),_&&yn("setSeries",n,u,f)}n.setSeries=Ht;function yc(u,f){je(N[u],f)}function xc(u,f){u.fill=ce(u.fill||null),u.dir=fe(u.dir,-1),f=f??N.length,N.splice(f,0,u)}function kc(u){u==null?N.length=0:N.splice(u,1)}n.addBand=xc,n.setBand=yc,n.delBand=kc;function wc(u,f){$[u].alpha=f,Re&&wt[u]!=null&&(wt[u].style.opacity=f),Le&&De[u]&&(De[u].style.opacity=f)}let Jt,os,$s;const Us={focus:!0};function Sc(u){if(u!=$s){let f=u==null,h=Bt.alpha!=1;$.forEach((_,S)=>{if(l==1||S>0){let E=f||S==0||S==u;_._focus=f?null:E,h&&wc(S,E?1:Bt.alpha)}}),$s=u,h&&Ns()}}Le&&Ps&&ot(Ga,ue,u=>{U._lock||(gs(u),$s!=null&&Ht(null,Us,!0,Fe.setSeries))});function Wt(u,f,h){let _=w[f];h&&(u=u/me-(_.ori==1?Be:xe));let S=ae;_.ori==1&&(S=Q,u=S-u),_.dir==-1&&(u=S-u);let E=_._min,I=_._max,j=u/S,W=E+(I-E)*j,K=_.distr;return K==3?an(10,W):K==4?Dd(W,_.asinh):K==100?_.bwd(W):W}function Tc(u,f){let h=Wt(u,A,f);return zt(h,t[0],Ge,Ye)}n.valToIdx=u=>zt(u,t[0]),n.posToIdx=Tc,n.posToVal=Wt,n.valToPos=(u,f,h)=>w[f].ori==0?o(u,w[f],h?dt:ae,h?ft:0):a(u,w[f],h?Lt:Q,h?xt:0),n.setCursor=(u,f,h)=>{ke=u.left,Me=u.top,bs(null,f,h)};function fa(u,f){Te(Vs,Ks,we.left=u),Te(Vs,Sn,we.width=f)}function va(u,f){Te(Vs,xn,we.top=u),Te(Vs,Tn,we.height=f)}let _n=D.ori==0?fa:va,$n=D.ori==1?fa:va;function Cc(){if(Le&&oe.live)for(let u=l==2?1:0;u<$.length;u++){if(u==0&&yt)continue;let f=oe.values[u],h=0;for(let _ in f)jt[u][h++].firstChild.nodeValue=f[_]}}function Nl(u,f){if(u!=null&&(u.idxs?u.idxs.forEach((h,_)=>{le[_]=h}):zd(u.idx)||le.fill(u.idx),oe.idx=le[0]),Le&&oe.live){for(let h=0;h<$.length;h++)(h>0||l==1&&!yt)&&Ec(h,le[h]);Cc()}kt=!1,f!==!1&&Qe("setLegend")}n.setLegend=Nl;function Ec(u,f){let h=$[u],_=u==0&&F==2?Dt:t[u],S;yt?S=h.values(n,u,f)??ts:(S=h.value(n,f==null?null:_[f],u,f),S=S==null?ts:{_:S}),oe.values[u]=S}function bs(u,f,h){ua=ke,pa=Me,[ke,Me]=U.move(n,ke,Me),U.left=ke,U.top=Me,Re&&(Bs&&Ut(Bs,He(ke),0,ae,Q),Hs&&Ut(Hs,0,He(Me),ae,Q));let _,S=Ge>Ye;Jt=be,os=null;let E=D.ori==0?ae:Q,I=D.ori==1?ae:Q;if(ke<0||et==0||S){_=U.idx=null;for(let j=0;j<$.length;j++){let W=wt[j];W!=null&&Ut(W,-10,-10,ae,Q)}Ps&&Ht(null,Us,!0,u==null&&Fe.setSeries),oe.live&&(le.fill(_),kt=!0)}else{let j,W,K;l==1&&(j=D.ori==0?ke:Me,W=Wt(j,A),_=U.idx=zt(W,t[0],Ge,Ye),K=R(t[0][_],D,E,0));let J=-10,Z=-10,se=0,ve=0,pe=!0,re="",te="";for(let ee=l==2?1:0;ee<$.length;ee++){let Se=$[ee],Pe=le[ee],Ze=Pe==null?null:l==1?t[ee][Pe]:t[ee][1][Pe],$e=U.dataIdx(n,ee,_,W),ze=$e==null?null:l==1?t[ee][$e]:t[ee][1][$e];if(kt=kt||ze!=Ze||$e!=Pe,le[ee]=$e,ee>0&&Se.show){let vt=$e==null?-10:$e==_?K:R(l==1?t[0][$e]:t[ee][0][$e],D,E,0),at=ze==null?-10:q(ze,l==1?w[Se.scale]:w[Se.facets[1].scale],I,0);if(Ps&&ze!=null){let St=D.ori==1?ke:Me,At=Ve(Bt.dist(n,ee,$e,at,St));if(At<Jt){let qt=Bt.bias;if(qt!=0){let mt=Wt(St,Se.scale),Tt=ze>=0?1:-1,Ot=mt>=0?1:-1;Ot==Tt&&(Ot==1?qt==1?ze>=mt:ze<=mt:qt==1?ze<=mt:ze>=mt)&&(Jt=At,os=ee)}else Jt=At,os=ee}}if(kt||zs){let St,At;D.ori==0?(St=vt,At=at):(St=at,At=vt);let qt,mt,Tt,Ot,Vt,it,ht=!0,ys=nt.bbox;if(ys!=null){ht=!1;let rt=ys(n,ee);Tt=rt.left,Ot=rt.top,qt=rt.width,mt=rt.height}else Tt=St,Ot=At,qt=mt=nt.size(n,ee);if(it=nt.fill(n,ee),Vt=nt.stroke(n,ee),zs)ee==os&&Jt<=Bt.prox&&(J=Tt,Z=Ot,se=qt,ve=mt,pe=ht,re=it,te=Vt);else{let rt=wt[ee];rt!=null&&(Rs[ee]=Tt,Fs[ee]=Ot,ei(rt,qt,mt,ht),Za(rt,it,Vt),Ut(rt,Et(Tt),Et(Ot),ae,Q))}}}}if(zs){let ee=Bt.prox,Se=$s==null?Jt<=ee:Jt>ee||os!=$s;if(kt||Se){let Pe=wt[0];Pe!=null&&(Rs[0]=J,Fs[0]=Z,ei(Pe,se,ve,pe),Za(Pe,re,te),Ut(Pe,Et(J),Et(Z),ae,Q))}}}if(we.show&&ns)if(u!=null){let[j,W]=Fe.scales,[K,J]=Fe.match,[Z,se]=u.cursor.sync.scales,ve=u.cursor.drag;if(Ke=ve._x,Je=ve._y,Ke||Je){let{left:pe,top:re,width:te,height:ee}=u.select,Se=u.scales[Z].ori,Pe=u.posToVal,Ze,$e,ze,vt,at,St=j!=null&&K(j,Z),At=W!=null&&J(W,se);St&&Ke?(Se==0?(Ze=pe,$e=te):(Ze=re,$e=ee),ze=w[j],vt=R(Pe(Ze,Z),ze,E,0),at=R(Pe(Ze+$e,Z),ze,E,0),_n(Rt(vt,at),Ve(at-vt))):_n(0,E),At&&Je?(Se==1?(Ze=pe,$e=te):(Ze=re,$e=ee),ze=w[W],vt=q(Pe(Ze,se),ze,I,0),at=q(Pe(Ze+$e,se),ze,I,0),$n(Rt(vt,at),Ve(at-vt))):$n(0,I)}else Wl()}else{let j=Ve(ua-ca),W=Ve(pa-da);if(D.ori==1){let se=j;j=W,W=se}Ke=tt.x&&j>=tt.dist,Je=tt.y&&W>=tt.dist;let K=tt.uni;K!=null?Ke&&Je&&(Ke=j>=K,Je=W>=K,!Ke&&!Je&&(W>j?Je=!0:Ke=!0)):tt.x&&tt.y&&(Ke||Je)&&(Ke=Je=!0);let J,Z;Ke&&(D.ori==0?(J=Ws,Z=ke):(J=qs,Z=Me),_n(Rt(J,Z),Ve(Z-J)),Je||$n(0,I)),Je&&(D.ori==1?(J=Ws,Z=ke):(J=qs,Z=Me),$n(Rt(J,Z),Ve(Z-J)),Ke||_n(0,E)),!Ke&&!Je&&(_n(0,0),$n(0,0))}if(tt._x=Ke,tt._y=Je,u==null){if(h){if(Sa!=null){let[j,W]=Fe.scales;Fe.values[0]=j!=null?Wt(D.ori==0?ke:Me,j):null,Fe.values[1]=W!=null?Wt(D.ori==1?ke:Me,W):null}yn(Ql,n,ke,Me,ae,Q,_)}if(Ps){let j=h&&Fe.setSeries,W=Bt.prox;$s==null?Jt<=W&&Ht(os,Us,!0,j):Jt>W?Ht(null,Us,!0,j):os!=$s&&Ht(os,Us,!0,j)}}kt&&(oe.idx=_,Nl()),f!==!1&&Qe("setCursor")}let as=null;Object.defineProperty(n,"rect",{get(){return as==null&&bn(!1),as}});function bn(u=!1){u?as=null:(as=k.getBoundingClientRect(),Qe("syncRect",as))}function ma(u,f,h,_,S,E,I){U._lock||ns&&u!=null&&u.movementX==0&&u.movementY==0||(Bl(u,f,h,_,S,E,I,!1,u!=null),u!=null?bs(null,!0,!0):bs(f,!0,!1))}function Bl(u,f,h,_,S,E,I,j,W){if(as==null&&bn(!1),gs(u),u!=null)h=u.clientX-as.left,_=u.clientY-as.top;else{if(h<0||_<0){ke=-10,Me=-10;return}let[K,J]=Fe.scales,Z=f.cursor.sync,[se,ve]=Z.values,[pe,re]=Z.scales,[te,ee]=Fe.match,Se=f.axes[0].side%2==1,Pe=D.ori==0?ae:Q,Ze=D.ori==1?ae:Q,$e=Se?E:S,ze=Se?S:E,vt=Se?_:h,at=Se?h:_;if(pe!=null?h=te(K,pe)?i(se,w[K],Pe,0):-10:h=Pe*(vt/$e),re!=null?_=ee(J,re)?i(ve,w[J],Ze,0):-10:_=Ze*(at/ze),D.ori==1){let St=h;h=_,_=St}}W&&(f==null||f.cursor.event.type==Ql)&&((h<=1||h>=ae-1)&&(h=xs(h,ae)),(_<=1||_>=Q-1)&&(_=xs(_,Q))),j?(ca=h,da=_,[Ws,qs]=U.move(n,h,_)):(ke=h,Me=_)}const Hl={width:0,height:0,left:0,top:0};function Wl(){Nn(Hl,!1)}let ha,ga,_a,$a;function ba(u,f,h,_,S,E,I){ns=!0,Ke=Je=tt._x=tt._y=!1,Bl(u,f,h,_,S,E,I,!0,!1),u!=null&&(ot(Zl,mo,ya,!1),yn(Va,n,Ws,qs,ae,Q,null));let{left:j,top:W,width:K,height:J}=we;ha=j,ga=W,_a=K,$a=J}function ya(u,f,h,_,S,E,I){ns=tt._x=tt._y=!1,Bl(u,f,h,_,S,E,I,!1,!0);let{left:j,top:W,width:K,height:J}=we,Z=K>0||J>0,se=ha!=j||ga!=W||_a!=K||$a!=J;if(Z&&se&&Nn(we),tt.setScale&&Z&&se){let ve=j,pe=K,re=W,te=J;if(D.ori==1&&(ve=W,pe=J,re=j,te=K),Ke&&ls(A,Wt(ve,A),Wt(ve+pe,A)),Je)for(let ee in w){let Se=w[ee];ee!=A&&Se.from==null&&Se.min!=be&&ls(ee,Wt(re+te,ee),Wt(re,ee))}Wl()}else U.lock&&(U._lock=!U._lock,bs(f,!0,u!=null));u!=null&&(Ds(Zl,mo),yn(Zl,n,ke,Me,ae,Q,null))}function Mc(u,f,h,_,S,E,I){if(U._lock)return;gs(u);let j=ns;if(ns){let W=!0,K=!0,J=10,Z,se;D.ori==0?(Z=Ke,se=Je):(Z=Je,se=Ke),Z&&se&&(W=ke<=J||ke>=ae-J,K=Me<=J||Me>=Q-J),Z&&W&&(ke=ke<Ws?0:ae),se&&K&&(Me=Me<qs?0:Q),bs(null,!0,!0),ns=!1}ke=-10,Me=-10,le.fill(null),bs(null,!0,!0),j&&(ns=j)}function xa(u,f,h,_,S,E,I){U._lock||(gs(u),Sl(),Wl(),u!=null&&yn(Ya,n,ke,Me,ae,Q,null))}function ka(){x.forEach(Qu),wl(n.width,n.height,!0)}Ss(al,nn,ka);const Gs={};Gs.mousedown=ba,Gs.mousemove=ma,Gs.mouseup=ya,Gs.dblclick=xa,Gs.setSeries=(u,f,h,_)=>{let S=Fe.match[2];h=S(n,f,h),h!=-1&&Ht(h,_,!0,!1)},Re&&(ot(Va,k,ba),ot(Ql,k,ma),ot(Ua,k,u=>{gs(u),bn(!1)}),ot(Ga,k,Mc),ot(Ya,k,xa),ko.add(n),n.syncRect=bn);const Bn=n.hooks=e.hooks||{};function Qe(u,f,h){Rl?gn.push([u,f,h]):u in Bn&&Bn[u].forEach(_=>{_.call(null,n,f,h)})}(e.plugins||[]).forEach(u=>{for(let f in u.hooks)Bn[f]=(Bn[f]||[]).concat(u.hooks[f])});const wa=(u,f,h)=>h,Fe=je({key:null,setSeries:!1,filters:{pub:oi,sub:oi},scales:[A,$[1]?$[1].scale:null],match:[ai,ai,wa],values:[null,null]},U.sync);Fe.match.length==2&&Fe.match.push(wa),U.sync=Fe;const Sa=Fe.key,ql=Ir(Sa);function yn(u,f,h,_,S,E,I){Fe.filters.pub(u,f,h,_,S,E,I)&&ql.pub(u,f,h,_,S,E,I)}ql.sub(n);function Lc(u,f,h,_,S,E,I){Fe.filters.sub(u,f,h,_,S,E,I)&&Gs[u](null,f,h,_,S,E,I)}n.pub=Lc;function Dc(){ql.unsub(n),ko.delete(n),ps.clear(),_o(al,nn,ka),d.remove(),ue==null||ue.remove(),Qe("destroy")}n.destroy=Dc;function Vl(){Qe("init",e,t),ta(t||e.data,!1),Y[A]?Fl(A,Y[A]):Sl(),Pn=we.show&&(we.width>0||we.height>0),hs=kt=!0,wl(e.width,e.height)}return $.forEach(Xo),x.forEach(cc),s?s instanceof HTMLElement?(s.appendChild(d),Vl()):s(n,Vl):Vl(),n}st.assign=je;st.fmtNum=Ho;st.rangeNum=il;st.rangeLog=hl;st.rangeAsinh=No;st.orient=Es;st.pxRatio=me;st.join=Hd;st.fmtDate=qo,st.tzDate=Xd;st.sync=Ir;{st.addGap=zu,st.clipGaps=$l;let e=st.paths={points:qr};e.linear=Ur,e.stepped=Iu,e.bars=ju,e.spline=Bu}function Zu(e){let t;return{hooks:{init(s){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",s.over.appendChild(t)},setCursor(s){const n=s.cursor.idx;if(n==null||!s.data[1]||s.data[1][n]==null){t.style.display="none";return}const l=s.data[0][n],o=s.data[1][n],a=new Date(l*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):z(o)}</b> ${a}`;const i=Math.round(s.valToPos(l,"x"));t.style.left=Math.min(i,s.over.clientWidth-80)+"px",t.style.display=""}}}}function Xu(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function Jr({data:e,color:t,smooth:s,height:n,yMax:l,fmtVal:o}){const a=lt(null),i=lt(null),r=n||55;return de(()=>{if(!a.current||!e||e[0].length<2)return;const d=s?sd(e[1]):e[1],v=[e[0],d];if(i.current){i.current.setData(v);return}const p=l?(g,k,M)=>[0,Math.max(l,M*1.05)]:(g,k,M)=>[Math.max(0,k*.9),M*1.1],m={width:a.current.clientWidth||200,height:r,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:p}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:t,width:1.5,fill:Xu(t,.09)}],plugins:[Zu(o)]};return i.current=new st(m,v,a.current),()=>{i.current&&(i.current.destroy(),i.current=null)}},[e,t,s]),de(()=>{if(!i.current||!a.current)return;const d=new ResizeObserver(()=>{i.current&&a.current&&i.current.setSize({width:a.current.clientWidth,height:r})});return d.observe(a.current),()=>d.disconnect()},[]),c`<div class="chart-wrap" role="img" aria-label="Sparkline chart" style=${"height:"+r+"px"} ref=${a}></div>`}function Zt({label:e,value:t,valColor:s,data:n,chartColor:l,smooth:o,refLines:a,yMax:i,dp:r}){const d=ie(()=>{if(!n||!n[1]||n[1].length<2)return[];const v=i?Math.max(i,n[1].reduce((p,m)=>Math.max(p,m),0)*1.05):n[1].reduce((p,m)=>Math.max(p,m),0)*1.1;return(a||[]).map(p=>{if(v<=0)return null;const m=(1-p.value/v)*100;return m>=0&&m<=95?{...p,pct:m}:null}).filter(Boolean)},[n,a,i]);return c`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${r?{"data-dp":r}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${e}</span>
      <span class="chart-val" style=${"color:"+(s||l||"var(--accent)")} aria-live="polite" aria-atomic="true">${t}</span>
    </div>
    <div style="position:relative">
      ${d.map(v=>c`<Fragment>
          <div class="chart-ref-line" style=${"top:"+v.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+v.pct+"% - 8px)"}>${v.label}</div>
        </Fragment>`)}
      ${n&&n[0].length>=2?c`<${Jr} data=${n} color=${l||"var(--accent)"} smooth=${o} yMax=${i}/>`:c`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem">collecting...</div>`}
    </div>
  </div>`}function So({label:e,value:t,accent:s,dp:n,sm:l}){const o=lt(t),[a,i]=G(!1);return de(()=>{o.current!==t&&(i(!0),setTimeout(()=>i(!1),500)),o.current=t},[t]),c`<div class=${"metric"+(l?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(s?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
  </div>`}function Ei({snap:e,mode:t}){if(!e)return null;const s=!t||t==="files",n=!t||t==="traffic",l=e.tools.filter(r=>r.tool!=="aictl"&&r.files.length),o=l.reduce((r,d)=>r+d.files.length,0)||1,a=e.tools.filter(r=>r.tool!=="aictl"&&r.live&&(r.live.outbound_rate_bps||r.live.inbound_rate_bps)),i=a.reduce((r,d)=>r+(d.live.outbound_rate_bps||0)+(d.live.inbound_rate_bps||0),0)||1;return c`
    ${s&&l.length>0&&c`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+l.map(r=>r.label+" "+r.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${l.map(r=>c`
        <div class="rbar-seg" style=${"width:"+(r.files.length/o*100).toFixed(1)+"%;background:"+(Oe[r.tool]||"var(--fg2)")}
          title="${r.label}: ${r.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${l.map(r=>c`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Oe[r.tool]||"var(--fg2)")}></span>
          ${r.label} <span class="text-muted">${r.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${n&&c`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(a.length?a.map(r=>r.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${a.length===0?" — no active traffic":""}</div>
      <div class="rbar">${a.map(r=>{const d=(r.live.outbound_rate_bps||0)+(r.live.inbound_rate_bps||0);return c`<div class="rbar-seg" style=${"width:"+(d/i*100).toFixed(1)+"%;background:"+(Oe[r.tool]||"var(--fg2)")}
          title="${r.label}: ${Ft(d)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(r=>{const d=(r.live.outbound_rate_bps||0)+(r.live.inbound_rate_bps||0);return c`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Oe[r.tool]||"var(--fg2)")}></span>
          ${r.label} <span class="text-muted">${Ft(d)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!l.length&&!a.length&&c`<div class="empty-state">No AI tool resources found yet.</div>`}`}function ep({path:e,onClose:t}){const{snap:s}=Xe(Ne),[n,l]=G(null),[o,a]=G(!1),[i,r]=G(null),d=lt(null),v=lt(null),[p,m]=G(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),g=lt(!1),k=lt(0),M=lt(0),T=qe(A=>{g.current=!0,k.current=A.clientX,M.current=p,A.preventDefault()},[p]);if(de(()=>{const A=P=>{if(!g.current)return;const b=k.current-P.clientX,C=window.innerWidth,D=Math.min(90,Math.max(20,M.current+b/C*100));m(D)},O=()=>{if(g.current){g.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(p)))}catch{}}};return window.addEventListener("mousemove",A),window.addEventListener("mouseup",O),()=>{window.removeEventListener("mousemove",A),window.removeEventListener("mouseup",O)}},[p]),de(()=>{if(!e)return;v.current=document.activeElement;const A=setTimeout(()=>{var b;const P=(b=d.current)==null?void 0:b.querySelector("button");P&&P.focus()},50),O=P=>{if(P.key!=="Tab"||!d.current)return;const b=d.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!b.length)return;const C=b[0],D=b[b.length-1];P.shiftKey&&document.activeElement===C?(P.preventDefault(),D.focus()):!P.shiftKey&&document.activeElement===D&&(P.preventDefault(),C.focus())};return document.addEventListener("keydown",O),()=>{clearTimeout(A),document.removeEventListener("keydown",O),v.current&&v.current.focus&&v.current.focus()}},[e]),de(()=>{e&&(a(!1),r(null),Ro(e).then(l).catch(A=>r(A.message)))},[e]),!e)return null;const y=ie(()=>{if(!s)return"";for(const A of s.tools)for(const O of A.files)if(O.path===e)return(O.kind||"")+" | "+ge(O.size)+" | ~"+z(O.tokens)+"tok | scope:"+(O.scope||"?")+" | sent_to_llm:"+(O.sent_to_llm||"?")+" | loaded:"+(O.loaded_when||"?");for(const A of s.agent_memory)if(A.file===e)return A.source+" | "+A.profile+" | "+A.tokens+"tok | "+A.lines+"ln";return""},[s,e]),$=n?n.split(`
`):[],x=$.length,w=x>Ys*2,N=(A,O)=>A.map((P,b)=>c`<div class="fv-line"><span class="fv-ln">${O+b}</span><span class="fv-code">${X(P)||" "}</span></div>`);return c`<div class="fv" ref=${d} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+p+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${T}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      <button onClick=${t} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${y}</div>
    <div class="fv-body">
      ${i?c`<p class="text-red" style="padding:var(--sp-10)">${i}</p>`:n?!w||o?c`<div class="fv-lines">${N($,1)}</div>`:c`<div class="fv-lines">${N($.slice(0,Ys),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>a(!0)}>\u25BC ${x-Ys*2} more lines \u25BC</div>
            <div class="fv-lines">${N($.slice(-Ys),x-Ys+1)}</div>`:c`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${x} lines${w&&!o?" (showing "+Ys*2+" of "+x+")":""}</span>
      ${w&&c`<button onClick=${()=>a(!o)}>${o?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function To({file:e,dirPrefix:t}){var A;const[s,n]=G(!1),[l,o]=G(!1),[a,i]=G(null),[r,d]=G(null),[v,p]=G(!1),m=Xe(Ne),g=(e.path||"").replace(/\\/g,"/").split("/").pop(),k=(e.sent_to_llm||"").toLowerCase(),M=e.mtime&&Date.now()/1e3-e.mtime<300,T=(A=m.recentFiles)==null?void 0:A.get(e.path),y=!!T,$=qe(async()=>{if(s){n(!1);return}n(!0),p(!0),d(null);try{const O=await Ro(e.path);i(O)}catch(O){d(O.message)}finally{p(!1)}},[s,e.path]),x=(O,P)=>O.map((b,C)=>c`<span class="pline"><span class="ln">${P+C}</span>${X(b)||" "}</span>`),w=()=>{if(v)return c`<span class="text-muted">loading...</span>`;if(r)return c`<span class="text-red">${r}</span>`;if(!a)return null;const O=a.split(`
`),P=O.length;if(P<=sn*3||l)return c`${x(O,1)}
        <div class="prev-actions">
          ${l&&c`<button class="prev-btn" onClick=${()=>o(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
        </div>`;const C=O.slice(-sn),D=P-sn+1;return c`${x(C,D)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>o(!0)}>show all (${P} lines)</button>
        <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
      </div>`},N=e.size>0?Math.round(e.size/60):0;return c`<div>
    <button class="fitem" onClick=${$} aria-expanded=${s} title=${e.path}>
      ${y?c`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${It(T.ts)}${T.growth>0?" +"+ge(T.growth):""}">●</span>`:M?c`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${It(e.mtime)}">●</span>`:c`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${t?c`<span class="text-muted">${t}/</span>`:""}${X(g)}</span>
      <span class="fmeta">
        ${k&&k!=="no"&&c`<span style="color:${cr(k)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${k}">${k==="yes"?"◆":k==="on-demand"?"◇":"○"}</span>`}
        ${ge(e.size)}${N?c` <span class="text-muted">${N}ln</span>`:""}${e.tokens?c` <span class="text-muted">${z(e.tokens)}t</span>`:""}
        ${e.mtime&&M?c` <span class="text-orange text-xs">${It(e.mtime)}</span>`:""}
      </span>
    </button>
    ${s&&c`<div class="inline-preview">${w()}</div>`}
  </div>`}function tp({dir:e,files:t}){const[s,n]=G(!1),l=t.reduce((a,i)=>a+i.tokens,0),o=t.reduce((a,i)=>a+i.size,0);return c`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-muted" title=${e}>${X(e)}</span>
      <span class="badge">${t.length}</span>
      <span class="badge">${ge(o)}</span>
      <span class="badge">${z(l)}t</span>
    </button>
    ${s&&c`<div style=${{paddingLeft:"var(--sp-8)"}}>${t.map(a=>c`<${To} key=${a.path} file=${a}/>`)}</div>`}
  </div>`}function sp({label:e,files:t,root:s,badge:n,style:l,startOpen:o}){const[a,i]=G(!!o),r=ie(()=>td(t,s),[t,s]),d=ie(()=>t.reduce((g,k)=>g+k.tokens,0),[t]),v=ie(()=>t.reduce((g,k)=>g+k.size,0),[t]),p=ie(()=>{var k;const g={};return t.forEach(M=>{const T=(M.sent_to_llm||"no").toLowerCase();g[T]=(g[T]||0)+1}),((k=Object.entries(g).sort((M,T)=>T[1]-M[1])[0])==null?void 0:k[0])||"no"},[t]),m=()=>r.length===1&&r[0][1].length<=3?r[0][1].map(g=>c`<${To} key=${g.path} file=${g}/>`):r.map(([g,k])=>k.length===1?c`<div style=${{marginLeft:"var(--sp-5)"}}><${To} key=${k[0].path} file=${k[0]} dirPrefix=${g}/></div>`:c`<${tp} key=${g} dir=${g} files=${k}/>`);return c`<div class="cat-group" style=${l||""}>
    <button class=${"cat-head"+(a?" open":"")} onClick=${()=>i(!a)} aria-expanded=${a}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${cr(p)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${p}"></span>
      <span class="cat-label" title=${e}>${X(e)}</span>
      <span class="badge" style="flex-shrink:0">${n||t.length}</span>
      <span class="badge">${ge(v)}</span>
      <span class="badge">${z(d)}t</span>
    </button>
    ${a&&c`<div style=${{paddingLeft:"var(--sp-8)"}}>${m()}</div>`}
  </div>`}function no({label:e,data:t,color:s}){const n=lt(null);return de(()=>{const l=n.current;if(!l||!t||t.length<2)return;const o=l.getContext("2d"),a=l.width=l.offsetWidth*(window.devicePixelRatio||1),i=l.height=l.offsetHeight*(window.devicePixelRatio||1);o.clearRect(0,0,a,i);const r=t.slice(-60),d=Math.max(...r)*1.1||1,v=a/(r.length-1);o.beginPath(),o.strokeStyle=s,o.lineWidth=1.5*(window.devicePixelRatio||1),r.forEach((p,m)=>{const g=m*v,k=i-p/d*i*.85;m===0?o.moveTo(g,k):o.lineTo(g,k)}),o.stroke()},[t,s]),c`<div style="position:relative;height:25px">
    <span class="text-muted" style="position:absolute;top:0;left:0;font-size:var(--fs-2xs);z-index:1">${e}</span>
    <canvas ref=${n} aria-hidden="true" style="width:100%;height:100%;display:block"/>
  </div>`}function np({processes:e,maxMem:t}){if(!e||!e.length)return null;const s=e.reduce((a,i)=>a+(parseFloat(i.mem_mb)||0),0),n=e.reduce((a,i)=>a+(parseFloat(i.cpu_pct)||0),0),l={};e.forEach(a=>{const i=a.process_type||"process";(l[i]=l[i]||[]).push(a)});const o=Object.keys(l).length>1;return c`<div class="proc-section">
    <h3>Processes <span class="badge">${e.length}</span>
      <span class="badge">CPU ${_e(n)}</span>
      <span class="badge">MEM ${ge(s*1048576)}</span></h3>
    ${Object.entries(l).map(([a,i])=>{const r={};return i.forEach(d=>(r[d.name||"unknown"]=r[d.name||"unknown"]||[]).push(d)),c`<div style="margin-bottom:var(--sp-2)">
        ${o?c`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${X(a)}</div>`:null}
        ${Object.entries(r).map(([d,v])=>{const p=v.sort((m,g)=>(parseFloat(g.mem_mb)||0)-(parseFloat(m.mem_mb)||0));return c`<div key=${d} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${o?"":c`<span style="text-transform:uppercase;letter-spacing:0.03em">${X(a)}</span>${" · "}`}${X(d)} <span style="opacity:0.6">(${v.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${p.map(m=>{const g=parseFloat(m.cpu_pct)||0,k=parseFloat(m.mem_mb)||0,M=Math.max(2,Math.min(g,100)),T=g>80?"var(--red)":g>50?"var(--orange)":g>5?"var(--green)":"var(--fg2)",y=m.anomalies&&m.anomalies.length,$=m.zombie_risk&&m.zombie_risk!=="none";return c`<div key=${m.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${y?"border-left:2px solid var(--red);":""}${$?"border-left:2px solid var(--orange);":""}"
                  title=${m.cmdline||m.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${M}%;height:100%;background:${T};border-radius:2px"></div>
                    </div>
                    <span style="color:${T};min-width:3ch;text-align:right">${_e(g)}</span>
                  </div>
                  <div class="mono text-muted">${m.pid}</div>
                  <div>${ge(k*1048576)}</div>
                  ${y?c`<div class="text-red">\u26A0${m.anomalies.length}</div>`:null}
                </div>`})}
            </div>
          </div>`})}
      </div>`})}
  </div>`}function lp({config:e}){if(!e)return null;const t=Object.entries(e.settings||{}),s=Object.entries(e.features||{}),n=(e.mcp_servers||[]).length>0,l=(e.extensions||[]).length>0,o=e.otel||{},a=e.hints||[];return!t.length&&!s.length&&!n&&!l&&!o.enabled&&!a.length&&e.model==null&&e.launch_at_startup==null?null:c`<div class="live-section">
    <h3>Configuration
      ${e.launch_at_startup===!0&&c`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${e.launch_at_startup===!1&&c`<span class="badge">no auto-start</span>`}
      ${e.auto_update===!0&&c`<span class="badge">auto-update</span>`}
      ${e.model&&c`<span class="badge">${e.model}</span>`}
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
      ${t.length>0&&c`<div class="metric-chip">
        <span class="mlabel">Settings</span>
        ${t.map(([i,r])=>c`<div key=${i} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${i}</span>
          <span class="mono">${typeof r=="object"?JSON.stringify(r):String(r)}</span>
        </div>`)}
      </div>`}
      ${Object.entries(e.feature_groups||{}).map(([i,r])=>c`<div key=${i} class="metric-chip">
        <span class="mlabel">${i}</span>
        ${Object.entries(r).map(([d,v])=>c`<div key=${d} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${d}</span>
          <span style="color:${v===!0?"var(--green)":v===!1?"var(--red)":"var(--fg)"}">${typeof v=="object"?JSON.stringify(v):String(v)}</span>
        </div>`)}
      </div>`)}
      ${s.length>0&&!Object.keys(e.feature_groups||{}).length&&c`<div class="metric-chip">
        <span class="mlabel">Features</span>
        ${s.map(([i,r])=>c`<div key=${i} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${i}</span>
          <span style="color:${r===!0?"var(--green)":r===!1?"var(--red)":"var(--fg)"}">${String(r)}</span>
        </div>`)}
      </div>`}
      ${n&&c`<div class="metric-chip">
        <span class="mlabel">MCP Servers</span>
        <div class="stack-list">${e.mcp_servers.map((i,r)=>c`<span class="pill mono" key=${i||r}>${i}</span>`)}</div>
      </div>`}
      ${l&&c`<div class="metric-chip">
        <span class="mlabel">Extensions</span>
        <div class="stack-list">${e.extensions.map(i=>c`<span class="pill mono" key=${i}>${i}</span>`)}</div>
      </div>`}
    </div>
    ${a.length>0&&c`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
      ${a.map(i=>c`<div class="text-orange" style="font-size:var(--fs-base);padding:0.15rem 0">
        <span style="margin-right:var(--sp-3)">\u{1F4A1}</span>${i}
      </div>`)}
    </div>`}
  </div>`}function op({telemetry:e}){if(!e)return null;const t=e,s=(t.input_tokens||0)+(t.output_tokens||0),n=t.errors||[],l=t.quota_state||{};if(!s&&!t.active_session_input&&!n.length)return null;const[o,a]=G(!1);return c`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${t.source}</span> <span class="badge">${_e(t.confidence*100)} confidence</span>
      ${n.length>0&&c`<span class="badge warn cursor-ptr" onClick=${i=>{i.stopPropagation(),a(!o)}}>${n.length} error${n.length>1?"s":""}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${We(t.input_tokens||0)} tok</span>
        <span class="msub">cache read: ${We(t.cache_read_tokens||0)} tok \u00B7 creation: ${We(t.cache_creation_tokens||0)} tok</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${We(t.output_tokens||0)} tok</span>
        <span class="msub">${z(t.total_sessions||0)} sessions \u00B7 ${z(t.total_messages||0)} messages</span>
      </div>
      ${t.cost_usd>0?c`<div class="metric-chip">
        <span class="mlabel">Estimated Cost</span>
        <span class="mvalue">$${t.cost_usd.toFixed(2)}</span>
      </div>`:null}
      ${(l.premium_requests_used>0||l.total_api_duration_ms>0)&&c`<div class="metric-chip">
        <span class="mlabel">Operational</span>
        ${l.premium_requests_used>0&&c`<div style="font-size:var(--fs-base)">Premium requests: <span class="mono">${l.premium_requests_used}</span></div>`}
        ${l.total_api_duration_ms>0&&c`<div style="font-size:var(--fs-base)">API time: <span class="mono">${Math.round(l.total_api_duration_ms/1e3)}s</span></div>`}
        ${l.current_model&&c`<div style="font-size:var(--fs-base)">Model: <span class="mono">${l.current_model}</span></div>`}
        ${l.code_changes&&c`<div class="text-green" style="font-size:var(--fs-base)">+${l.code_changes.lines_added} -${l.code_changes.lines_removed} (${l.code_changes.files_modified} files)</div>`}
      </div>`}
      ${t.active_session_input>0||t.active_session_output>0?c`<div class="metric-chip" style="border-color:var(--accent)">
        <span class="mlabel">Active Session</span>
        <span class="mvalue">${We((t.active_session_input||0)+(t.active_session_output||0))} tok</span>
        <span class="msub">in: ${We(t.active_session_input||0)} \u00B7 out: ${We(t.active_session_output||0)} \u00B7 ${t.active_session_messages||0} msgs</span>
      </div>`:null}
      ${Object.keys(t.by_model||{}).length>0?c`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(t.by_model).map(([i,r])=>c`<div key=${i} class="flex-between flex-wrap" style="font-size:0.75rem;padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${i}</span>
          <span>in:${We(r.input_tokens||0)} tok out:${We(r.output_tokens||0)} tok${r.cache_read_tokens?" cR:"+We(r.cache_read_tokens)+" tok":""}${r.requests?" · "+r.requests+"req":""}${r.cost_usd?" · $"+r.cost_usd.toFixed(2):""}</span>
        </div>`)}
      </div>`:null}
    </div>
    ${o&&n.length>0&&c`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--red);background:color-mix(in srgb,var(--red) 8%,transparent);border-radius:0 4px 4px 0;max-height:10rem;overflow-y:auto">
      <div class="text-red text-bold" style="font-size:var(--fs-base);margin-bottom:0.2rem">Recent Errors</div>
      ${n.map(i=>c`<div class="flex-row gap-sm" style="font-size:0.68rem;padding:0.1rem 0">
        <span class="mono text-muted text-nowrap">${(i.timestamp||"").slice(11,19)}</span>
        <span class="badge" style="font-size:var(--fs-xs);background:var(--red);color:var(--bg);padding:0.05rem var(--sp-2)">${i.type}</span>
        <span class="text-muted">${i.message}</span>
        ${i.model&&c`<span class="mono text-muted">${i.model}</span>`}
      </div>`)}
    </div>`}
  </div>`}function ap({live:e}){if(!e)return null;const t=e.token_estimate||{},s=e.mcp||{},n=zo(e);return c`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${e.session_count||0} sess</span>
      <span class="badge">${e.pid_count||0} pid</span>
      <span class="badge">${_e((e.confidence||0)*100)} conf</span>
      ${s.detected&&c`<span class="badge warn">${s.loops||0} MCP loop${(s.loops||0)===1?"":"s"}</span>`}
    </h3>
    <div class="metric-grid" aria-live="polite" aria-relevant="text" aria-atomic="false">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">\u2191 ${Ft(e.outbound_rate_bps||0)}</span>
        <span class="msub">\u2193 ${Ft(e.inbound_rate_bps||0)} total ${ge((e.outbound_bytes||0)+(e.inbound_bytes||0))}</span>
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
      ${(e.state_bytes_written||0)>0&&c`<div class="metric-chip">
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
  </div>`}function Co({tool:e,root:t}){var w,N,A,O,P,b,C,D;const[s,n]=G(!1),{snap:l,history:o}=Xe(Ne),a=ie(()=>((l==null?void 0:l.tool_configs)||[]).find(F=>F.tool===e.tool),[l,e.tool]),i=ie(()=>{var F;return(F=o==null?void 0:o.by_tool)==null?void 0:F[e.tool]},[o,e.tool]),r=Oe[e.tool]||"var(--fg2)",d=$t[e.tool]||"🔹",v=e.files.reduce((F,R)=>F+R.tokens,0),p=e.processes.filter(F=>F.anomalies&&F.anomalies.length).length,m=zo(e.live),g=(((w=e.live)==null?void 0:w.outbound_rate_bps)||0)+(((N=e.live)==null?void 0:N.inbound_rate_bps)||0),k=e.processes.reduce((F,R)=>F+(parseFloat(R.cpu_pct)||0),0),M=e.processes.reduce((F,R)=>F+(parseFloat(R.mem_mb)||0),0),T=ie(()=>Math.max(...e.processes.map(F=>parseFloat(F.mem_mb)||0),100),[e.processes]),y=(((O=(A=e.token_breakdown)==null?void 0:A.telemetry)==null?void 0:O.errors)||[]).length,$=ie(()=>{const F={};return e.files.forEach(R=>{const q=R.kind||"other";(F[q]=F[q]||[]).push(R)}),Object.keys(F).sort((R,q)=>{const Y=Na.indexOf(R),ne=Na.indexOf(q);return(Y<0?99:Y)-(ne<0?99:ne)}).map(R=>({kind:R,files:F[R]}))},[e.files]),x="tcard"+(s?" open":"")+(p||y?" has-anomaly":"");return c`<div class=${x}>
    <button class="tcard-head" onClick=${()=>n(!s)} aria-expanded=${s}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)">${d}</span>${X(e.label)}</h2>
      <span class="badge" data-dp="procs.tool.files">${e.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${z(v)} tok</span>
      ${e.processes.length>0&&c`<span class="badge" data-dp="procs.tool.process_count">${e.processes.length} proc ${_e(k)} ${ge(M*1048576)}</span>`}
      ${e.mcp_servers.length>0&&c`<span class="badge" data-dp="procs.tool.mcp_server_count">${e.mcp_servers.length} MCP</span>`}
      ${p>0&&c`<span class="badge warn" data-dp="procs.tool.anomaly">${p} anomaly</span>`}
      ${y>0&&c`<span class="badge" style="background:var(--red);color:var(--bg)">${y} error${y>1?"s":""}</span>`}
      ${e.live&&c`<span class="badge" style="background:var(--accent);color:var(--bg)">${e.live.session_count||0} live \u00B7 ${Ft(g)}${m>0?" · "+z(m)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${$.map(({kind:F,files:R})=>c`<span class="text-muted" style="font-size:var(--fs-xs)">${F}:${R.length}</span>`)}
      </div>
      ${i&&i.ts.length>2&&!s&&c`<div role="img" aria-label=${"Sparkline charts for "+e.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${F=>F.stopPropagation()}>
        <${no} label="CPU" data=${i.cpu} color=${r}/>
        <${no} label="MEM" data=${i.mem_mb} color=${"var(--green)"}/>
        <${no} label=${e.live?"Traffic":"Tokens"} data=${e.live?i.traffic:i.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${s&&c`<div class="tcard-body">
      ${((P=ja[e.tool])==null?void 0:P.length)>0&&c`<div class="tool-relationships">
        ${ja[e.tool].map(F=>c`<span key=${F.label} class="rel-badge rel-${F.type}"
          title=${F.label}>${F.label}</span>`)}
      </div>`}
      <${lp} config=${a}/>
      <${op} telemetry=${(b=e.token_breakdown)==null?void 0:b.telemetry}/>
      <${ap} live=${e.live}/>
      ${$.map(({kind:F,files:R})=>c`<${sp} key=${F} label=${F} files=${R} root=${t}/>`)}
      <${np} processes=${(D=(C=e.live)==null?void 0:C.processes)!=null&&D.length?e.live.processes:e.processes} maxMem=${T}/>
      ${e.mcp_servers.length>0&&c`<div class="proc-section"><h3>MCP Servers</h3>
        ${e.mcp_servers.map(F=>c`<div key=${F.name||F.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${X(F.name)}</span>
          <span class="fmeta">${X((F.config||{}).command||"")} ${((F.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function ip({groupKey:e,groupLabel:t,groupColor:s,tools:n,root:l}){const[o,a]=G(!0),i=n.reduce((d,v)=>d+v.files.length,0),r=n.reduce((d,v)=>d+v.files.reduce((p,m)=>p+m.tokens,0),0);return c`<div class="mb-md">
    <button onClick=${()=>a(!o)} aria-expanded=${o}
      class="flex-row gap-sm cursor-ptr" style="background:none;border:none;padding:var(--sp-3) 0;font:inherit;color:var(--fg);width:100%">
      <span style="font-size:var(--fs-xs);transition:transform 0.15s;${o?"transform:rotate(90deg)":""}">\u25B6</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${s};flex-shrink:0"></span>
      <span class="text-bolder" style="font-size:var(--fs-lg)">${t}</span>
      <span class="badge">${n.length} tools</span>
      <span class="badge">${i} files</span>
      <span class="badge">${z(r)} tok</span>
    </button>
    ${o&&c`<div class="tool-grid" style="margin-top:var(--sp-3)">
      ${n.map(d=>c`<${Co} key=${d.tool} tool=${d} root=${l}/>`)}
    </div>`}
  </div>`}function rp(){const{snap:e}=Xe(Ne),[t,s]=G("product"),n=r=>r.files.length||r.processes.length||r.mcp_servers.length||r.live,l=(r,d)=>{const v=r.files.length*2+r.processes.length+r.mcp_servers.length;return d.files.length*2+d.processes.length+d.mcp_servers.length-v||r.tool.localeCompare(d.tool)},o=ie(()=>e?e.tools.filter(r=>!r.meta&&n(r)).sort(l):[],[e]),a=ie(()=>e?e.tools.filter(r=>r.meta&&r.tool!=="project-env"&&n(r)).sort(l):[],[e]),i=ie(()=>{if(t==="product"||!o.length)return null;const r={};return o.forEach(d=>{if(t==="vendor"){const v=d.vendor||"community",p=ar[v]||v,m=Wc[v]||"var(--fg2)";r[v]||(r[v]={label:p,color:m,tools:[]}),r[v].tools.push(d)}else{const v=(d.host||"any").split(",");for(const p of v){const m=p.trim(),g=qc[m]||m,k="var(--fg2)";r[m]||(r[m]={label:g,color:k,tools:[]}),r[m].tools.push(d)}}}),Object.entries(r).sort((d,v)=>{const p=d[1].tools.reduce((g,k)=>g+k.files.length,0);return v[1].tools.reduce((g,k)=>g+k.files.length,0)-p})},[o,t]);return e?!o.length&&!a.length?c`<p class="empty-state">No AI tool resources found.</p>`:c`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${Kc.map(r=>c`<button key=${r.id}
        class=${t===r.id?"range-btn active":"range-btn"}
        onClick=${()=>s(r.id)}>${r.label}</button>`)}
    </div>
    ${o.length>0&&(i?i.map(([r,d])=>c`<${ip} key=${r}
      groupKey=${r} groupLabel=${d.label} groupColor=${d.color}
      tools=${d.tools} root=${e.root}/>`):c`<div class="tool-grid">
        ${o.map(r=>c`<${Co} key=${r.tool} tool=${r} root=${e.root}/>`)}
      </div>`)}
    ${a.length>0&&c`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)">▶</span>
        <span>Project Context</span>
        <span class="badge">${a.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${a.map(r=>c`<${Co} key=${r.tool} tool=${r} root=${e.root}/>`)}
      </div>
    </details>`}
  </div>`:c`<p class="loading-state">Loading...</p>`}function cp({perCore:e}){if(!e||!e.length)return null;const t=100;return c`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((s,n)=>{const l=Math.max(1,s/t*100),o=s>80?"var(--red)":s>50?"var(--orange)":s>20?"var(--green)":"var(--fg2)";return c`<div key=${n} title=${"Core "+n+": "+_e(s)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+l+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function dp({mem:e}){var x;const[t,s]=G(!1),[n,l]=G(!1),[o,a]=G(null),[i,r]=G(null),[d,v]=G(!1),p=Xe(Ne),m=(e.file||"").replace(/\\/g,"/").split("/").pop(),g=qe(async()=>{if(t){s(!1);return}if(s(!0),ol.has(e.file)){a(ol.get(e.file));return}v(!0),r(null);try{const w=await Ro(e.file);a(w)}catch(w){r(w.message)}finally{v(!1)}},[t,e.file]),k=(w,N)=>w.map((A,O)=>c`<span class="pline"><span class="ln">${N+O}</span>${X(A)||" "}</span>`),M=()=>{if(d)return c`<span class="loading-state">Loading...</span>`;if(i)return c`<span class="error-state">${i}</span>`;if(!o)return null;const w=o.split(`
`),N=w.length;if(N<=sn*3||n)return c`${k(w,1)}
        <div class="prev-actions">
          ${n&&c`<button class="prev-btn" onClick=${()=>l(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
        </div>`;const A=w.slice(-sn),O=N-sn+1;return c`${k(A,O)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>l(!0)}>show all (${N} lines)</button>
        <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
      </div>`},T=e.mtime&&Date.now()/1e3-e.mtime<300,y=(x=p.recentFiles)==null?void 0:x.get(e.file),$=!!y;return c`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${g}
      aria-expanded=${t} title=${e.file}>
      ${$?c`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${It(y.ts)}">●</span>`:T?c`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${It(e.mtime)}">●</span>`:c`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${X(m)}</span>
      <span class="fmeta">${ge(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${T||$?c` <span style="color:${$?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${It($?y.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${t&&c`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${M()}</div>`}
  </div>`}function up({profile:e,items:t}){const[s,n]=G(t.length<=5),l=t.reduce((o,a)=>o+a.tokens,0);return c`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${X(e)}</span>
      <span class="badge">${t.length} files</span>
      <span class="badge">${z(l)} tok</span>
    </button>
    ${s&&c`<div>${t.map(o=>c`<${dp} key=${o.file} mem=${o}/>`)}</div>`}
  </div>`}function pp({source:e,entries:t}){const[s,n]=G(!1),l=ie(()=>{const o={};return t.forEach(a=>{(o[a.profile]=o[a.profile]||[]).push(a)}),Object.entries(o)},[t]);return c`<div class="mem-group">
    <button class=${"mem-group-head"+(s?" open":"")} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      ${X(Gc[e]||e)} <span class="badge">${t.length}</span>
      <span class="badge">${z(t.reduce((o,a)=>o+a.tokens,0))} tok</span>
    </button>
    ${s&&c`<div>${l.map(([o,a])=>c`<${up} key=${o} profile=${o} items=${a}/>`)}</div>`}
  </div>`}function fp(){const[e,t]=G(null);if(de(()=>{fetch("/api/history").then(n=>n.json()).then(n=>{n&&n.ts&&n.ts.length>=2&&t(n)}).catch(()=>{})},[]),!e)return null;const s=e.memory_entries&&e.memory_entries.some(n=>n>0);return c`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${Zt} label="Memory Tokens" value=${z(e.mem_tokens[e.mem_tokens.length-1]||0)}
        data=${[e.ts,e.mem_tokens]} chartColor="var(--accent)" smooth />
      ${s&&c`<${Zt} label="Memory Entries" value=${e.memory_entries[e.memory_entries.length-1]||0}
        data=${[e.ts,e.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function vp(){const{snap:e}=Xe(Ne);if(!e||!e.agent_memory.length)return c`<p class="empty-state">No agent memory found.</p>`;const t=ie(()=>{const s={};return e.agent_memory.forEach(n=>{(s[n.source]=s[n.source]||[]).push(n)}),Object.entries(s)},[e.agent_memory]);return c`<${fp}/>
    ${t.map(([s,n])=>c`<${pp} key=${s} source=${s} entries=${n}/>`)}`}function mp(){var n,l,o,a;const{snap:e}=Xe(Ne);if(!e)return c`<p class="empty-state">Loading...</p>`;const t=e.tools.filter(i=>i.live).sort((i,r)=>{var d,v,p,m;return(((d=r.live)==null?void 0:d.outbound_rate_bps)||0)+(((v=r.live)==null?void 0:v.inbound_rate_bps)||0)-((((p=i.live)==null?void 0:p.outbound_rate_bps)||0)+(((m=i.live)==null?void 0:m.inbound_rate_bps)||0))}),s=Object.entries(e.live_monitor&&e.live_monitor.diagnostics||{});return c`<div class="live-stack">
    ${s.length>0&&c`<div class="diag-card">
      <h3>Collector Health</h3>
      <table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${s.map(([i,r])=>c`<tr key=${i}>
          <td class="mono">${i}</td>
          <td>${X(r.status||"unknown")}</td>
          <td>${X(r.mode||"unknown")}</td>
          <td>${X(r.detail||"")}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      ${t.length?c`<table role="table" aria-label="Live tool sessions">
        <thead><tr><th>Tool</th><th>Sessions</th><th>Traffic</th><th>Tokens</th><th>MCP</th><th>Files</th><th>CPU</th><th>Workspace</th><th>State</th></tr></thead>
        <tbody>${t.map(i=>{const r=i.live||{},d=r.token_estimate||{},v=r.mcp||{};return c`<tr key=${i.tool}>
            <td>${X(i.label)}</td>
            <td>${r.session_count||0} sess / ${r.pid_count||0} pid</td>
            <td>\u2191 ${Ft(r.outbound_rate_bps||0)}<br/>\u2193 ${Ft(r.inbound_rate_bps||0)}</td>
            <td>${z(zo(r))}<br/><span class="text-muted">${X(d.source||"network-inference")} @ ${_e((d.confidence||0)*100)}</span></td>
            <td>${v.detected?"YES":"NO"}<br/><span class="text-muted">${v.loops||0} loops @ ${_e((v.confidence||0)*100)}</span></td>
            <td>${r.files_touched||0} touched<br/><span class="text-muted">${r.file_events||0} events</span></td>
            <td>${_e(r.cpu_percent||0)}<br/><span class="text-muted">peak ${_e(r.peak_cpu_percent||0)}</span></td>
            <td>${ge((r.workspace_size_mb||0)*1048576)}<br/><span class="mono text-muted text-xs">${X((r.workspaces||[]).slice(0,2).join(" | ")||"(unknown)")}</span></td>
            <td>${(r.state_bytes_written||0)>0?ge(r.state_bytes_written||0):"—"}</td>
          </tr>
          ${(r.processes||[]).length>0&&c`<tr key=${i.tool+"-procs"}>
            <td colspan="9" style="padding:var(--sp-1) var(--sp-5);background:var(--bg)">
              <details style="font-size:var(--fs-base)">
                <summary class="cursor-ptr text-muted">${r.processes.length} processes</summary>
                <div class="text-mono" style="margin-top:var(--sp-1);font-size:0.7rem">
                  ${r.processes.sort((p,m)=>(m.cpu_pct||0)-(p.cpu_pct||0)).map(p=>c`<div key=${p.pid} style="display:flex;gap:var(--sp-5);padding:var(--sp-1) 0">
                      <span class="text-muted" style="min-width:5ch">${p.pid}</span>
                      <span class="flex-1 text-ellipsis">${p.name}</span>
                      <span class="text-right" style="color:${p.cpu_pct>5?"var(--orange)":"var(--fg2)"};min-width:5ch">${p.cpu_pct}%</span>
                      <span class="text-right" style="min-width:6ch">${p.mem_mb?ge(p.mem_mb*1048576):""}</span>
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
        ${(((n=e.live_monitor)==null?void 0:n.workspace_paths)||[]).map(i=>c`<span class="pill mono" key=${"ws-"+i}>workspace: ${i}</span>`)}
        ${(((l=e.live_monitor)==null?void 0:l.state_paths)||[]).map(i=>c`<span class="pill mono" key=${"state-"+i}>state: ${i}</span>`)}
        ${!(((o=e.live_monitor)==null?void 0:o.workspace_paths)||[]).length&&!(((a=e.live_monitor)==null?void 0:a.state_paths)||[]).length&&c`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`}function hp(){var M,T,y,$;const{snap:e,globalRange:t}=Xe(Ne),[s,n]=G(null),[l,o]=G([]),[a,i]=G(null),r=ie(()=>e?e.tools.filter(x=>!x.meta&&(x.files.length||x.processes.length||x.live)).sort((x,w)=>x.label.localeCompare(w.label)):[],[e]);if(de(()=>{!s&&r.length&&n(r[0].tool)},[r,s]),de(()=>{if(!s||!t)return;let x="/api/events?tool="+encodeURIComponent(s)+"&since="+t.since+"&limit=500";t.until!=null&&(x+="&until="+t.until),fetch(x).then(w=>w.json()).then(o).catch(()=>o([]))},[s,t]),de(()=>{if(!s||!t)return;let x="/api/history?since="+t.since+"&tool="+encodeURIComponent(s);t.until!=null&&(x+="&until="+t.until),fetch(x).then(w=>w.json()).then(w=>{var N;return i(((N=w==null?void 0:w.by_tool)==null?void 0:N[s])||null)}).catch(()=>i(null))},[s,t]),!e)return c`<p class="loading-state">Loading...</p>`;const d=r.find(x=>x.tool===s),v=(M=e.tool_telemetry)==null?void 0:M.find(x=>x.tool===s),p=d==null?void 0:d.live,m=Oe[s]||"var(--fg2)",g={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},k=t.until!=null?new Date(t.since*1e3).toLocaleString(void 0,g)+" – "+new Date(t.until*1e3).toLocaleString(void 0,g):"";return c`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${r.map(x=>c`<button key=${x.tool}
        class=${s===x.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>n(x.tool)}>
        <span style="color:${Oe[x.tool]||"var(--fg2)"}">${$t[x.tool]||"🔹"}</span>
        ${x.label}
        ${x.live?c`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${s&&c`<Fragment>
        <h3 class="flex-row mb-sm gap-sm">
          <span style="color:${m}">${$t[s]||"🔹"}</span>
          ${(d==null?void 0:d.label)||s}
          ${d!=null&&d.vendor?c`<span class="badge">${ar[d.vendor]||d.vendor}</span>`:""}
          ${v!=null&&v.model?c`<span class="badge mono">${v.model}</span>`:""}
        </h3>

        ${a&&((T=a.ts)==null?void 0:T.length)>=2?c`<div class="es-section">
          <div class="es-section-title">Time Series${k?c` <span class="badge">${k}</span>`:""}</div>
          <div class="es-charts">
            <${Zt} label="CPU %" value=${((y=d==null?void 0:d.live)==null?void 0:y.cpu_percent)!=null?_e(d.live.cpu_percent||0):"-"}
              data=${[a.ts,a.cpu]} chartColor=${m} smooth />
            <${Zt} label="Memory (MB)" value=${(($=d==null?void 0:d.live)==null?void 0:$.mem_mb)!=null?ge((d.live.mem_mb||0)*1048576):"-"}
              data=${[a.ts,a.mem_mb]} chartColor="var(--green)" smooth />
            <${Zt} label="Context (tok)" value=${We(a.tokens[a.tokens.length-1]||0)}
              data=${[a.ts,a.tokens]} chartColor="var(--accent)" />
            <${Zt} label="Network (B/s)"
              value=${Ft(p?(p.outbound_rate_bps||0)+(p.inbound_rate_bps||0):a.traffic[a.traffic.length-1]||0)}
              valColor=${p?"var(--orange)":void 0}
              data=${[a.ts,a.traffic]} chartColor="var(--orange)" />
          </div>
        </div>`:c`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="loading-state">No data for this range.</p>
        </div>`}

        ${v?c`<div class="es-section">
          <div class="es-section-title">Telemetry
            <span class="badge" style="margin-left:var(--sp-3)">${v.source}</span>
            <span class="badge">${_e(v.confidence*100)}</span>
          </div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${We(v.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${We(v.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${We(v.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${We(v.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${z(v.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${z(v.total_messages||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cost</div><div class="value">${v.cost_usd?"$"+v.cost_usd.toFixed(2):"-"}</div></div>
          </div>
          ${Object.keys(v.by_model||{}).length>0&&c`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(v.by_model).map(([x,w])=>c`<div key=${x}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${x}</span>
              <span>in: ${We(w.input||w.input_tokens||0)} tok \u00B7 out: ${We(w.output||w.output_tokens||0)} tok${w.cache_read_tokens?" · cR:"+We(w.cache_read_tokens):""}${w.cache_creation_tokens?" · cW:"+We(w.cache_creation_tokens):""}${w.cost_usd?" · $"+w.cost_usd.toFixed(2):""}</span>
            </div>`)}
          </div>`}
        </div>`:""}

        ${p?c`<div class="es-section">
          <div class="es-section-title">Live Monitor</div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${p.session_count||0}</div></div>
            <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${p.pid_count||0}</div></div>
            <div class="es-kv-card"><div class="label">CPU</div><div class="value">${_e(p.cpu_percent||0)}</div></div>
            <div class="es-kv-card"><div class="label">Memory</div><div class="value">${ge((p.mem_mb||0)*1048576)}</div></div>
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${Ft(p.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${Ft(p.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">Events (${l.length})</div>
          ${l.length?c`<div class="es-feed">
            ${l.map((x,w)=>{const N=Yc[x.kind]||"var(--fg2)",A=new Date(x.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),O=x.detail?Object.entries(x.detail).map(([P,b])=>P+"="+b).join(", "):"";return c`<div key=${x.ts+"-"+x.tool+"-"+w} class="es-event">
                <span class="es-event-time">${A}</span>
                <span class="es-event-kind" style="color:${N}">${x.kind}</span>
                <span class="es-event-detail" title=${O}>${O||"-"}</span>
              </div>`})}
          </div>`:c`<p class="empty-state">No events for this tool in the selected range.</p>`}
        </div>
      </Fragment>`}
    </div>
  </div>`}const Js=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"],Mi={"claude-opus-4-6":1e6,"claude-opus-4-5":1e6,"claude-sonnet-4-6":1e6,"claude-sonnet-4-5":1e6,"claude-sonnet-4":2e5,"claude-haiku-4-5":2e5,"claude-3-5-sonnet":2e5,"gpt-4.1":1e6,"gpt-4.1-mini":1e6,"gpt-4o":128e3,"gpt-4o-mini":128e3,o3:2e5,"o4-mini":2e5,"gemini-2.5-pro":1e6,"gemini-2.5-flash":1e6};function Li({always:e,onDemand:t,conditional:s,never:n,total:l}){if(!l)return null;const o=a=>(a/l*100).toFixed(1)+"%";return c`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${e>0&&c`<div style="width:${o(e)};height:100%;background:var(--green)" title="Always loaded: ${z(e)}"></div>`}
    ${t>0&&c`<div style="width:${o(t)};height:100%;background:var(--yellow)" title="On-demand: ${z(t)}"></div>`}
    ${s>0&&c`<div style="width:${o(s)};height:100%;background:var(--orange)" title="Conditional: ${z(s)}"></div>`}
    ${n>0&&c`<div style="width:${o(n)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${z(n)}"></div>`}
  </div>`}function gp(){const{snap:e,history:t,enabledTools:s}=Xe(Ne),[n,l]=G(null),[o,a]=G(!1);if(de(()=>{l(null),a(!1),fetch("/api/budget").then(b=>b.json()).then(l).catch(()=>a(!0))},[]),o)return c`<p class="error-state">Failed to load budget.</p>`;if(!n)return c`<p class="loading-state">Loading...</p>`;const i=b=>s===null||s.includes(b),r=ie(()=>{const b=(e==null?void 0:e.tool_configs)||[];for(const C of["claude-code","copilot","copilot-vscode"]){const D=b.find(F=>F.tool===C&&F.model);if(D)return D.model}for(const C of b)if(C.model&&Mi[C.model])return C.model;return""},[e]),d=Mi[r]||2e5,v=n.always_loaded_tokens||0,p=n.total_potential_tokens||0,m=v/d*100,g=p/d*100,k=ie(()=>{if(!e)return{};const b={};return e.tools.forEach(C=>{C.tool==="aictl"||!C.token_breakdown||!C.token_breakdown.total||(b[C.tool]=C.token_breakdown)}),b},[e]),M=ie(()=>e!=null&&e.tool_telemetry?e.tool_telemetry.filter(b=>i(b.tool)):[],[e,s]),T=ie(()=>{if(!e)return[];const b={};return e.tools.forEach(C=>{C.tool==="aictl"||!i(C.tool)||(C.files||[]).forEach(D=>{const F=D.kind||"other";b[F]||(b[F]={kind:F,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),b[F].count++,b[F].tokens+=D.tokens,b[F].size+=D.size;const R=(D.sent_to_llm||"").toLowerCase();R==="yes"?b[F].always+=D.tokens:R==="on-demand"?b[F].onDemand+=D.tokens:R==="conditional"||R==="partial"?b[F].conditional+=D.tokens:b[F].never+=D.tokens})}),Object.values(b).sort((C,D)=>D.tokens-C.tokens)},[e,s]),y=ie(()=>{if(!(e!=null&&e.tool_telemetry))return null;const b={},C={};e.tool_telemetry.filter(L=>i(L.tool)).forEach(L=>{(L.daily||[]).forEach(B=>{if(B.date&&(b[B.date]||(b[B.date]={}),C[B.date]||(C[B.date]={}),B.tokens_by_model&&Object.entries(B.tokens_by_model).forEach(([V,H])=>{b[B.date][V]=(b[B.date][V]||0)+H}),B.model)){const V=B.model,H=(B.input_tokens||0)+(B.output_tokens||0);b[B.date][V]=(b[B.date][V]||0)+H,C[B.date][V]||(C[B.date][V]={input:0,output:0,cache_read:0,cache_creation:0}),C[B.date][V].input+=B.input_tokens||0,C[B.date][V].output+=B.output_tokens||0,C[B.date][V].cache_read+=B.cache_read_tokens||0,C[B.date][V].cache_creation+=B.cache_creation_tokens||0}})});const D=new Date,F=[];for(let L=6;L>=0;L--){const B=new Date(D);B.setDate(B.getDate()-L),F.push(B.toISOString().slice(0,10))}const R=F.filter(L=>b[L]&&Object.values(b[L]).some(B=>B>0));if(!R.length)return null;const q=[...new Set(R.flatMap(L=>Object.keys(b[L]||{})))],Y=Math.max(...R.map(L=>q.reduce((B,V)=>B+((b[L]||{})[V]||0),0)),1),ne=R.some(L=>Object.keys(C[L]||{}).length>0);return{dates:R,models:q,byDate:b,byDateModel:C,maxTotal:Y,hasDetail:ne}},[e,s]),$=t&&t.ts&&t.ts.length>=2?[t.ts,t.live_tokens||t.ts.map(()=>0)]:null,x=M.reduce((b,C)=>b+(C.input_tokens||0),0),w=M.reduce((b,C)=>b+(C.output_tokens||0),0),N=M.reduce((b,C)=>b+(C.cache_read_tokens||0),0),A=M.reduce((b,C)=>b+(C.cache_creation_tokens||0),0),O=M.reduce((b,C)=>b+(C.total_sessions||0),0),P=M.reduce((b,C)=>b+(C.cost_usd||0),0);return c`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${$?c`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${Jr} data=${$} color="var(--green)" height=${60}/>
        <div class="text-muted" style="font-size:var(--fs-base);margin-top:var(--sp-2)">
          Current: ${z((e==null?void 0:e.total_live_estimated_tokens)||0)} estimated tokens
        </div>
      </div>`:c`<div></div>`}
      <div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Context Window${r?c` <span class="badge">${r}</span>`:""}</h3>
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
            <span>Max potential: ${z(p)}</span>
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
        ${(n.project_count||0)>1?c`<div class="text-muted" style="font-size:var(--fs-xs);margin-top:var(--sp-2);border-top:1px solid var(--border);padding-top:var(--sp-1)">
          Estimate for largest project (${n.largest_project||"?"}): ${z(n.largest_project_tokens||0)} + ${z(n.global_tokens||0)} global.
          ${(n.raw_total_all_projects||0)>(n.total_potential_tokens||0)?c` Raw total across all ${n.project_count} projects: ${z(n.raw_total_all_projects)}.`:null}
        </div>`:null}
      </div>
    </div>

    <!-- Daily token usage -->
    ${y&&c`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">Daily Token Usage (last 7 days)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-6);font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        ${y.models.map((b,C)=>c`<span key=${b}>
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${Js[C%Js.length]};margin-right:3px"></span>${b}
        </span>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
        ${y.dates.map(b=>{const C=y.models.reduce((F,R)=>F+((y.byDate[b]||{})[R]||0),0),D=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return c`<div key=${b} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${D}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${b}: ${z(C)} tokens">
              ${y.models.map((F,R)=>{const q=(y.byDate[b]||{})[F]||0;return q?c`<div key=${F} style="width:${(q/y.maxTotal*100).toFixed(1)}%;height:100%;background:${Js[R%Js.length]}" title="${F}: ${z(q)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${z(C)}</span>
          </div>`})}
      </div>
      ${y.hasDetail&&c`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${y.dates.flatMap(b=>{const C=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),D=y.byDateModel[b]||{},F=Object.keys(D).sort();return F.length?F.map((R,q)=>{const Y=D[R];return c`<tr key=${b+"-"+R}>
                <td>${q===0?C:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${Js[y.models.indexOf(R)%Js.length]};margin-right:3px"></span>${R}</td>
                <td>${z(Y.input)}</td><td>${z(Y.output)}</td>
                <td class="text-muted">${z(Y.cache_read)}</td>
                <td class="text-muted">${z(Y.cache_creation)}</td>
                <td class="text-bold">${z(Y.input+Y.output)}</td>
              </tr>`}):[]})}</tbody>
        </table>
      </details>`}
    </div>`}

    <!-- Verified token usage (main table) -->
    ${M.length>0&&c`<div class="budget-card mb-md">
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
          <tbody>${M.map(b=>{const C=k[b.tool];return c`<tr key=${b.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(Oe[b.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${X(b.tool)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${b.source}</span> <span class="text-muted">${_e(b.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${z(b.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${z(b.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${z(b.total_sessions||0)}</td>
              <td style="text-align:right">${b.cost_usd>0?"$"+b.cost_usd.toFixed(2):"—"}</td>
              <td>${C?c`<${Li} always=${C.always_loaded||0} onDemand=${C.on_demand||0}
                conditional=${C.conditional||0} never=${C.never_sent||0} total=${C.total||1}/>`:null}</td>
            </tr>`})}
          ${M.length>1&&c`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${z(x)}</td>
            <td style="text-align:right">${z(w)}</td>
            <td style="text-align:right" class="text-muted">${z(N)}</td>
            <td style="text-align:right" class="text-muted">${z(A)}</td>
            <td style="text-align:right">${z(O)}</td>
            <td style="text-align:right">${P>0?"$"+P.toFixed(2):"—"}</td>
            <td></td>
          </tr>`}</tbody>
        </table>
      </div>
    </div>`}

    <!-- By category -->
    ${T.length>0&&c`<div class="budget-card budget-full">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">By Category</h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Per-category tokens" style="width:100%">
          <thead><tr><th>Category</th><th style="text-align:right">Files</th><th style="text-align:right">Tokens</th><th style="text-align:right">Size</th><th style="width:120px">Distribution</th></tr></thead>
          <tbody>${T.map(b=>c`<tr key=${b.kind}>
            <td>${X(b.kind)}</td>
            <td style="text-align:right">${b.count}</td>
            <td style="text-align:right" class="text-bold">${z(b.tokens)}</td>
            <td style="text-align:right">${ge(b.size)}</td>
            <td><${Li} always=${b.always} onDemand=${b.onDemand} conditional=${b.conditional} never=${b.never} total=${b.tokens||1}/></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>`}
  </div>`}function _p(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const Un={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function Di({agent:e,tasks:t,now:s}){const n=Un[e.state]||Un.active,l=e.ended_at?e.ended_at-e.started_at:s-e.started_at,o=t.filter(a=>a.agent_id===e.agent_id);return c`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${n.bg};color:var(--bg)">${n.label}</span>
      <strong class="text-sm">${X(e.agent_id)}</strong>
      <span class="text-muted text-xs">${_p(l)}</span>
      ${e.task&&c`<span class="text-xs mono text-muted">\u2014 ${X(e.task)}</span>`}
    </div>
    ${o.length>0&&c`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${o.map(a=>{const i=Un[a.state]||Un.pending;return c`<div key=${a.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${i.bg};color:var(--bg);font-size:0.6rem;padding:1px 4px">${i.label}</span>
          <span class="mono">${X(a.name||a.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function $p({entityState:e}){if(!e||!e.agents||!e.agents.length)return null;const t=e.agents,s=e.tasks||[],n=Date.now()/1e3,l=t.filter(a=>a.state==="active"),o=t.filter(a=>a.state!=="active");return c`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${t.length} agent${t.length>1?"s":""}</span>
      ${l.length>0&&c`<span class="badge text-xs" style="background:var(--green);color:var(--bg)">${l.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${l.map(a=>c`<${Di} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
      ${o.map(a=>c`<${Di} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
    </div>
  </div>`}function bp({tasks:e}){if(!e||!e.length)return null;const t=e.filter(o=>o.state==="pending"),s=e.filter(o=>o.state==="active"),n=e.filter(o=>o.state==="done");function l({title:o,items:a,color:i}){return c`<div class="tt-column">
      <div class="tt-column-head" style="border-bottom:2px solid ${i}">
        <strong class="text-sm">${o}</strong>
        <span class="text-muted text-xs">${a.length}</span>
      </div>
      <div class="tt-column-body">
        ${a.length?a.map(r=>c`<div key=${r.task_id} class="tt-task-card">
              <div class="text-sm" style="font-weight:500">${X(r.name||r.task_id)}</div>
              ${r.agent_id&&c`<div class="text-xs text-muted">Agent: ${X(r.agent_id)}</div>`}
            </div>`):c`<p class="text-muted text-xs" style="padding:var(--sp-3)">None</p>`}
      </div>
    </div>`}return c`<div class="tt-board">
    <${l} title="Pending" items=${t} color="var(--fg3)"/>
    <${l} title="Active" items=${s} color="var(--accent)"/>
    <${l} title="Done" items=${n} color="var(--green)"/>
  </div>`}function el(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Gt({title:e,icon:t,badge:s,defaultOpen:n,children:l}){const[o,a]=G(n||!1);return c`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>a(i=>!i)}
      aria-expanded=${o}>
      <span class="sd-panel-icon">${t}</span>
      <span class="sd-panel-title">${e}</span>
      ${s!=null&&c`<span class="badge text-xs" style="margin-left:var(--sp-2)">${s}</span>`}
      <span class="sd-panel-arrow">${o?"▲":"▼"}</span>
    </button>
    ${o&&c`<div class="sd-panel-body">${l}</div>`}
  </div>`}function yp({sessionId:e}){const[t,s]=G([]),[n,l]=G(!0);if(de(()=>{if(!e)return;l(!0);const a=Math.floor(Date.now()/1e3)-86400;fetch(`/api/events?session_id=${encodeURIComponent(e)}&limit=200&since=${a}`).then(i=>i.json()).then(i=>{s(i.reverse()),l(!1)}).catch(()=>l(!1))},[e]),n)return c`<p class="loading-state">Loading events...</p>`;if(!t.length)return c`<p class="empty-state">No events recorded for this session.</p>`;const o={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)"};return c`<div class="sd-events">
    ${t.map((a,i)=>{const r=o[a.kind]||"var(--fg3)",d=a.detail||{},v=d.path||d.name||d.tool_name||a.kind;return c`<div key=${i} class="sd-event-row">
        <span class="sd-event-time">${It(a.ts)}</span>
        <span class="sd-event-dot" style="background:${r}"></span>
        <span class="sd-event-kind">${a.kind}</span>
        <span class="sd-event-desc mono text-muted">${X(String(v))}</span>
      </div>`})}
  </div>`}const xp={"claude-opus-4-6":1e6,"claude-sonnet-4.6":1e6,"claude-sonnet-4":2e5,"claude-haiku-4.5":2e5,"gpt-5.4":2e5,"gpt-5":128e3},Ai=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],kp=95;function wp({session:e}){const{snap:t}=Xe(Ne),s=e.files_loaded||[],n=((t==null?void 0:t.tool_configs)||[]).map(g=>g.model).filter(Boolean)[0]||"",l=xp[n]||2e5,a=(t&&t.agent_memory||[]).reduce((g,k)=>g+(k.tokens||0),0),i=s.length*150,d=Ai.reduce((g,k)=>g+k.tokens,0)+a+i,v=Math.min(d/l*100,100),p=kp,m=[...Ai,{name:"Memory",tokens:a,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:i,color:"var(--green)"}].filter(g=>g.tokens>0);return c`<div>
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
          ${m.map(g=>{const k=(g.tokens/l*100).toFixed(1);return c`<div key=${g.name} style="width:${k}%;background:${g.color};min-width:${g.tokens>0?"1px":"0"}"
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
      ${s.map(g=>c`<div key=${g} class="text-muted" style="padding:2px 0">${X(g)}</div>`)}
    </div>`}
    ${!s.length&&c`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function Sp({session:e}){const{snap:t}=Xe(Ne),s=t&&t.agent_memory||[],n=e.project||"",l=n?s.filter(o=>{const a=o.project||o.tool||"";return!n||a.includes(n.replace(/\\/g,"/").split("/").pop())}):s;return l.length?c`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${l.map((o,a)=>c`<${Tp} key=${a} mem=${o}/>`)}
  </div>`:c`<p class="empty-state">No memory entries found${n?" for this project":""}.</p>`}function Tp({mem:e}){const[t,s]=G(!1),n=e.name||(e.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",l=(e.content||"").slice(0,300);return c`<div class="sd-memory-entry" style="cursor:pointer" onClick=${()=>s(!t)}>
    <div class="flex-row gap-sm" style="align-items:center">
      <span class="badge text-xs">${e.type||e.source||"file"}</span>
      <strong title=${e.file||e.path||""}>${X(n)}</strong>
      ${e.tokens?c`<span class="text-muted">${z(e.tokens)} tok</span>`:null}
      ${e.lines?c`<span class="text-muted">${e.lines}ln</span>`:null}
      ${e.profile?c`<span class="text-muted">${X(e.profile)}</span>`:null}
      <span class="text-muted" style="margin-left:auto;font-size:var(--fs-2xs)">${t?"▲":"▼"}</span>
    </div>
    ${t&&l?c`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${X(e.content)}${e.content&&e.content.length>300,""}</pre>`:null}
  </div>`}function Cp({rateLimits:e}){return!e||!Object.keys(e).length?null:c`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(e).map(([t,s])=>{const n=s.used_pct||s.used_percentage||0,l=n>80?"var(--red)":n>60?"var(--orange)":"var(--green)",o=s.resets_at||"";return c`<div key=${t} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${t} window</span>
            <span style="color:${l};font-weight:600">${_e(n)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(n,100)}%;background:${l};border-radius:4px"></div>
          </div>
          ${o&&c`<div class="text-xs text-muted" style="margin-top:2px">resets ${o}</div>`}
        </div>`})}
    </div>
  </div>`}function Ep({session:e}){const t=e.exact_input_tokens||0,s=e.exact_output_tokens||0,[n,l]=G(null);de(()=>{e.tool&&fetch(`/api/sessions?tool=${encodeURIComponent(e.tool)}&active=false&limit=20`).then(i=>i.json()).then(i=>{if(i.length>1){const r=i.filter(v=>v.duration_s>0).map(v=>v.duration_s),d=r.length?r.reduce((v,p)=>v+p,0)/r.length:0;l({avgDuration:d,sampleCount:i.length})}}).catch(()=>{})},[e.tool]);const o=e.duration_s||0,a=n&&n.avgDuration>0?o/n.avgDuration:null;return c`<div>
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
    ${a!=null&&c`<div class="text-xs text-muted" style="margin-top:var(--sp-3)">
      vs average (${n.sampleCount} sessions):
      duration ${a>1.2?c`<span class="text-orange">${a.toFixed(1)}x longer</span>`:a<.8?c`<span class="text-green">${(1/a).toFixed(1)}x shorter</span>`:c`<span>similar</span>`}
    </div>`}
    ${e.entity_state&&c`<${Cp} rateLimits=${e.entity_state.rate_limits}/>`}
  </div>`}function Mp({project:e}){const[t,s]=G(null);return de(()=>{e&&fetch("/api/project-costs?days=7").then(n=>n.json()).then(n=>{const l=n.find(o=>o.project===e);s(l||null)}).catch(()=>{})},[e]),t?c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${t.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${z(t.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${z(t.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value">$${t.cost_usd.toFixed(2)}</div></div>
    </div>
    ${t.daily&&t.daily.length>0&&c`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${t.daily.map(n=>{const l=n.input_tokens+n.output_tokens,o=Math.max(...t.daily.map(r=>r.input_tokens+r.output_tokens),1),a=(l/o*100).toFixed(1),i=new Date(n.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return c`<div key=${n.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${i}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${a}%;background:var(--green);border-radius:3px"
              title="${z(l)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${z(l)}</span>
        </div>`})}
    </div>`}
  </div>`:c`<p class="empty-state">No cost data available for this project.</p>`}function Lp({project:e,tool:t}){const[s,n]=G(null);if(de(()=>{!e||!t||fetch(`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=30&limit=20`).then(i=>i.json()).then(n).catch(()=>n([]))},[e,t]),!s||s.length<2)return c`<p class="empty-state">Not enough session history for trend analysis.</p>`;const l=Math.max(...s.map(i=>i.total_tokens),1),o=s.reduce((i,r)=>i+r.duration_s,0)/s.length,a=s.reduce((i,r)=>i+r.total_tokens,0)/s.length;return c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${el(o)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${z(a)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${s.map(i=>{const r=(i.total_tokens/l*100).toFixed(1),d=new Date(i.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),v=o>0?i.duration_s/o:1;return c`<div key=${i.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${d}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${r}%;border-radius:3px;background:${v>1.5?"var(--orange)":v<.7?"var(--green)":"var(--accent)"}" title="${z(i.total_tokens)} tok, ${el(i.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${z(i.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${el(i.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function Dp({sessionId:e}){const[t,s]=G(null),[n,l]=G(!0);if(de(()=>{l(!0);const i=Math.floor(Date.now()/1e3)-3600;fetch(`/api/api-calls?since=${i}&limit=100`).then(r=>r.json()).then(r=>{s(r),l(!1)}).catch(()=>l(!1))},[e]),n)return c`<p class="loading-state">Loading API call data...</p>`;if(!t||!t.calls||!t.calls.length)return c`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;const{calls:o,summary:a}=t;return c`<div>
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
        ${Object.entries(a.by_model).map(([i,r])=>c`
          <span key=${i} class="badge text-xs">${i}: ${r}</span>
        `)}
      </div>
    `}
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${o.slice(0,30).map((i,r)=>{const d=i.status==="error",v=new Date(i.ts*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});return c`<div key=${r} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${v}</span>
          <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${d?"var(--red)":"var(--green)"}"></span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${i.model||"—"}</span>
          ${!d&&c`<span style="width:50px;flex-shrink:0;text-align:right">${i.duration_ms||0}ms</span>`}
          ${!d&&c`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${z(i.input_tokens||0)}in</span>`}
          ${d&&c`<span style="color:var(--red)">${X(i.error||"error")}</span>`}
        </div>`})}
    </div>
  </div>`}function Ap({session:e}){const t=e.files_touched||[],s=e.file_events||0;return t.length?c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${t.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${z(s)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${t.map(n=>c`<div key=${n} class="text-muted" style="padding:2px 0">${X(n)}</div>`)}
    </div>
  </div>`:c`<p class="empty-state">No file changes recorded.</p>`}function Op({session:e,onClose:t}){const s=Oe[e.tool]||"var(--fg2)",n=e.files_loaded||[],l=e.files_touched||[],o=e.exact_input_tokens||0,a=e.exact_output_tokens||0,i=e.entity_state||null,r=i&&i.agents&&i.agents.length>0,d=i&&i.tasks&&i.tasks.length>0;return c`<div class="sd-container" style="border-left:3px solid ${s}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${X(e.tool)}</strong>
        ${e.project&&c`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${e.project}>${X(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">
          ${el(e.duration_s)}
        </span>
        ${r&&c`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">
          Team (${i.agents.length})
        </span>`}
      </div>
      <div class="text-muted text-xs mono" style="margin-top:var(--sp-2)" title=${e.session_id}>
        ${e.session_id}
      </div>
      ${t&&c`<button class="sd-close" onClick=${t} aria-label="Close session detail">\u2715</button>`}
    </div>

    <${Gt} title="Actions" icon="\u26A1" badge=${null} defaultOpen=${!0}>
      <${yp} sessionId=${e.session_id}/>
    <//>
    ${r&&c`<${Gt} title="Team" icon="\uD83D\uDC65" badge=${i.agents.length+" agents"} defaultOpen=${!0}>
      <${$p} entityState=${i}/>
    <//>`}
    ${d&&c`<${Gt} title="Tasks" icon="\uD83D\uDCCB" badge=${i.tasks.length} defaultOpen=${!0}>
      <${bp} tasks=${i.tasks}/>
    <//>`}
    <${Gt} title="Context" icon="\uD83D\uDCDA" badge=${n.length||null}>
      <${wp} session=${e}/>
    <//>
    <${Gt} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${!1}>
      <${Sp} session=${e}/>
    <//>
    <${Gt} title="Resources" icon="\u2699\uFE0F" badge=${z(o+a)+" tok"}>
      <${Ep} session=${e}/>
    <//>
    <${Gt} title="Deliverables" icon="\uD83D\uDCE6" badge=${l.length||null}>
      <${Ap} session=${e}/>
    <//>
    <${Gt} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${!1}>
      <${Dp} sessionId=${e.session_id}/>
    <//>
    ${e.project&&c`<${Gt} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${!1}>
      <${Mp} project=${e.project}/>
    <//>`}
    ${e.project&&e.tool&&c`<${Gt} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${!1}>
      <${Lp} project=${e.project} tool=${e.tool}/>
    <//>`}
  </div>`}function Pp(e,t,s){const n=t-e,l=[300,600,900,1800,3600,7200,10800,21600,43200,86400];let o=l[l.length-1];for(const r of l)if(n/r<=s){o=r;break}const a=Math.ceil(e/o)*o,i=[];for(let r=a;r<=t;r+=o){const d=new Date(r*1e3);let v;o>=86400?v=d.toLocaleDateString([],{month:"short",day:"numeric"}):n>86400?v=d.toLocaleString([],{hourCycle:"h23",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):v=d.toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),i.push({ts:r,label:v})}return i}function zp(e){return e>=3600?(e/3600).toFixed(1)+"h":e>=60?Math.round(e/60)+"m":Math.round(e)+"s"}function Oi(e,t,s,n){const l=e.duration_s||(e.ended_at||n)-e.started_at,o=new Date(e.started_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),a=e.ended_at?new Date(e.ended_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):"now",i=[zp(l)];e.conversations&&i.push(e.conversations+" conv"),e.subagents&&i.push(e.subagents+" agents"),e.source_files?i.push(e.source_files+" src files"):e.unique_files&&i.push(e.unique_files+" files"),e.bytes_written>1024&&i.push(ge(e.bytes_written));const r=!e.ended_at;return c`<div class="stl-tip">
    <div class="stl-tip-head">
      <span style=${"color:"+t}>${s}</span>
      <strong>${e.tool}</strong>
      ${r?c`<span class="badge" style="font-size:9px;background:var(--green);color:#000">live</span>`:""}
    </div>
    <div class="stl-tip-time">${o} – ${a}</div>
    <div class="stl-tip-stats">${i.join(" · ")}</div>
    ${e.project?c`<div class="stl-tip-proj">${e.project.replace(/\\/g,"/").split("/").pop()}</div>`:""}
  </div>`}function Rp({sessions:e,rangeSeconds:t,onSelect:s}){const n=Date.now()/1e3,l=t||86400,o=n-l,a=(e||[]).filter(O=>(O.ended_at||n)>=o&&O.started_at<=n),i=a.filter(O=>O.ended_at).sort((O,P)=>O.started_at-P.started_at),r=a.filter(O=>!O.ended_at).sort((O,P)=>O.started_at-P.started_at),d=[],v=[];for(const O of i){const P=Math.max(O.started_at,o),b=O.ended_at;let C=-1;for(let D=0;D<d.length;D++)if(P>=d[D]+2){d[D]=b,C=D;break}C<0&&(C=d.length,d.push(b)),v.push(C)}const p=10,m=2,g=18,k=14,M=Math.max(d.length,0),T=M>0?M*(p+m)+m:0,y=r.length>0?k+m*2:0,$=T>0&&y>0?1:0,x=T+$+y,w=Math.max(x,20)+g,N=Pp(o,n,8),A=O=>(Math.max(O,o)-o)/l*100;return c`<div class="stl">
    <div class="stl-chart" style=${"height:"+w+"px"}>
      ${N.map(O=>c`<div key=${O.ts} class="stl-grid"
        style=${"left:"+A(O.ts).toFixed(2)+"%;bottom:"+g+"px"} />`)}

      <!-- ended session bars -->
      ${i.map((O,P)=>{const b=Math.max(O.started_at,o),C=A(b),D=Math.max(.15,A(O.ended_at)-C),F=v[P]*(p+m)+m,R=Oe[O.tool]||"var(--fg2)",q=$t[O.tool]||"🔹";return c`<div key=${O.session_id} class="stl-bar"
          style=${"left:"+C.toFixed(2)+"%;width:"+D.toFixed(2)+"%;top:"+F+"px;height:"+p+"px;background:"+R}
          onClick=${()=>s&&s(O)}>
          ${Oi(O,R,q,n)}
        </div>`})}

      <!-- divider between ended and live -->
      ${$?c`<div class="stl-divider" style=${"top:"+T+"px"} />`:""}

      <!-- live session markers -->
      ${r.map(O=>{const P=A(O.started_at),b=T+$+m,C=Oe[O.tool]||"var(--fg2)",D=$t[O.tool]||"🔹";return c`<div key=${O.session_id} class="stl-marker"
          style=${"left:"+P.toFixed(2)+"%;top:"+b+"px;background:"+C}
          onClick=${()=>s&&s(O)}>
          ${Oi(O,C,D,n)}
        </div>`})}

      <div class="stl-axis" style=${"top:"+(w-g)+"px"}>
        ${N.map(O=>c`<span key=${O.ts} class="stl-tick"
          style=${"left:"+A(O.ts).toFixed(2)+"%"}>${O.label}</span>`)}
      </div>
    </div>
  </div>`}function Eo(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Qr(e){let t=0;for(const s of e)(s.role==="lead"||s.role==="teammate"||s.role==="subagent")&&t++,t+=Qr(s.children||[]);return t}function Pi({session:e,onSelect:t,isSelected:s,agentTeams:n}){const l=Oe[e.tool]||"var(--fg2)",o=$t[e.tool]||"🔹",a=(n||[]).find(d=>d.session_id===e.session_id),i=a?a.agent_count:Qr(e.process_tree||[]),r=i>1;return c`<div class="diag-card" style="border-left:3px solid ${l};cursor:pointer;${s?"outline:2px solid var(--accent);outline-offset:-2px":""}"
    onClick=${()=>t(e)}>
    <div class="flex-row gap-sm mb-sm">
      <span style="font-size:var(--fs-2xl)">${o}</span>
      <strong style="font-size:var(--fs-lg)">${X(e.tool)}</strong>
      ${r&&c`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">Team (${i})</span>`}
      ${e.project&&c`<span class="text-muted text-xs mono text-ellipsis" style="max-width:150px"
        title=${e.project}>${X(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
      <span class="badge" style="margin-left:auto;background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Duration</div><div class="value">${Eo(e.duration_s)}</div></div>
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
  </div>`}function Fp(){const{snap:e}=Xe(Ne),t=e&&e.agent_teams||[];if(!t.length)return null;const s=t.reduce((o,a)=>o+a.agent_count,0),n=t.reduce((o,a)=>o+(a.total_input_tokens||0),0),l=t.reduce((o,a)=>o+(a.total_output_tokens||0),0);return c`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Agent Teams
      <span class="badge">${t.length} sessions</span>
      <span class="badge">${s} agents</span>
      <span class="badge">${z(n+l)} tok</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      ${t.sort((o,a)=>(a.total_input_tokens||0)-(o.total_input_tokens||0)).slice(0,8).map(o=>c`
        <${jp} key=${o.session_id} team=${o}/>
      `)}
    </div>
  </div>`}function Ip(e){return e?e.replace("claude-","").replace("-20251001",""):"?"}function jp({team:e}){const[t,s]=G(!1),[n,l]=G(e.agents||null),[o,a]=G(!1);e.models,de(()=>{!t||n||(a(!0),fetch("/api/agent-teams?session_id="+encodeURIComponent(e.session_id)).then(p=>p.json()).then(p=>{l(p.agents||[]),a(!1)}).catch(()=>{l([]),a(!1)}))},[t]);const i=(n||[]).filter(p=>(p.input_tokens||0)+(p.output_tokens||0)>50),r=(n||[]).length-i.length,d=i.sort((p,m)=>m.input_tokens+m.output_tokens-(p.input_tokens+p.output_tokens)),v=d[0]?(d[0].input_tokens||0)+(d[0].output_tokens||0):1;return c`<div class="diag-card" style="border-left:3px solid var(--accent);padding:var(--sp-4)">
    <div class="flex-row gap-sm mb-sm" style="align-items:center;cursor:pointer" onClick=${()=>s(!t)}>
      <span class="badge" style="background:var(--accent);color:var(--bg)">${e.agent_count||i.length} agents${r?c` <span style="opacity:0.6">+${r}w</span>`:null}</span>
      <span class="text-muted text-xs">${z(e.total_input_tokens||0)}in / ${z(e.total_output_tokens||0)}out</span>
      ${(e.tools_used||[]).length>0&&c`<span class="text-muted text-xs">${e.tools_used.join(", ")}</span>`}
      <span class="mono text-xs text-muted" style="margin-left:auto" title=${e.session_id}>${e.session_id.slice(0,12)}\u2026</span>
      <span class="text-xs text-muted">${t?"▲":"▼"}</span>
    </div>
    <!-- Agent rows: show loading, or compact agent rows with task + tokens -->
    ${o?c`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading agents\u2026</div>`:c`<div style="display:flex;flex-direction:column;gap:1px">
      ${d.slice(0,t?999:5).map(p=>{const m=(p.input_tokens||0)+(p.output_tokens||0),g=Math.max(1,m/v*100);return c`<div key=${p.agent_id} style="display:grid;
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
          <span class="text-muted" style="font-size:var(--fs-2xs)">${Ip(p.model)}</span>
          ${p.completed?c`<span class="text-green">\u2713</span>`:c`<span class="text-orange">\u25CB</span>`}
        </div>`})}
      ${!t&&d.length>5?c`<div class="text-muted text-xs cursor-ptr" style="padding:2px var(--sp-2)"
        onClick=${p=>{p.stopPropagation(),s(!0)}}>+${d.length-5} more agents\u2026</div>`:null}
    </div>`}
  </div>`}function Np(){const{snap:e,globalRange:t,rangeSeconds:s,enabledTools:n}=Xe(Ne),[l,o]=G([]),[a,i]=G(!1),[r,d]=G(!0),[v,p]=G(null),[m,g]=G(null),[k,M]=G([]);de(()=>{d(!0),i(!1),fetch("/api/sessions?active=false").then(b=>b.json()).then(b=>{o(b),d(!1)}).catch(()=>{i(!0),d(!1)})},[]),de(()=>{if(!t)return;let C="/api/session-timeline?since="+Math.min(t.since,Date.now()/1e3-86400);t.until!=null&&(C+="&until="+t.until),fetch(C).then(D=>D.json()).then(M).catch(()=>M([]))},[t]),de(()=>{const b=C=>{const D=C.detail;D&&D.session_id&&(p(D.session_id),g(D))};return window.addEventListener("aictl-session-select",b),()=>window.removeEventListener("aictl-session-select",b)},[]);const T=b=>n===null||n.includes(b),y=(e&&e.sessions||[]).filter(b=>T(b.tool)),$=l.filter(b=>T(b.tool)),x=k.filter(b=>T(b.tool));let w=y.find(b=>b.session_id===v);if(!w&&v){const C=l.find(D=>D.session_id===v)||m;C&&C.session_id===v&&(w={session_id:C.session_id,tool:C.tool,project:C.project||"",duration_s:C.duration_s||0,active:C.active||!1,started_at:C.started_at,ended_at:C.ended_at,files_touched:[],files_loaded:[],exact_input_tokens:C.input_tokens||0,exact_output_tokens:C.output_tokens||0,pids:[],file_events:C.files_modified||0})}const N=b=>{p(C=>C===b.session_id?null:b.session_id)},A={};for(const b of y){const C=b.project||"Unknown Project";A[C]||(A[C]=[]),A[C].push(b)}const O=Object.keys(A).sort();return c`<div>
    <div class="mb-lg">
      <${Rp} sessions=${x} rangeSeconds=${s}
        onSelect=${b=>{p(b.session_id),g(b)}}/>
    </div>

    <${Fp}/>

    ${w&&c`<${Op} session=${w}
      onClose=${()=>p(null)}/>`}

    <div class="es-section">
      <div class="es-section-title">Active Sessions (${y.length})</div>
      ${y.length?O.length>1?O.map(b=>c`<div key=${b} style="margin-bottom:var(--sp-5)">
              <div class="text-muted text-sm mono" style="margin-bottom:var(--sp-3);font-weight:600">
                ${X(b.replace(/\\/g,"/").split("/").pop()||b)}
                <span class="text-xs" style="font-weight:400"> \u2014 ${A[b].length} session${A[b].length>1?"s":""}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
                ${A[b].map(C=>c`<${Pi} key=${C.session_id} session=${C}
                  onSelect=${N} isSelected=${C.session_id===v} agentTeams=${e==null?void 0:e.agent_teams}/>`)}
              </div>
            </div>`):c`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
              ${y.map(b=>c`<${Pi} key=${b.session_id} session=${b}
                onSelect=${N} isSelected=${b.session_id===v}/>`)}
            </div>`:c`<div class="empty-state">
            <p>No active sessions.</p>
            ${$.length>0&&c`<div class="diag-card" style="margin-top:var(--sp-4);max-width:400px">
              <div class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Last session</div>
              <div class="flex-row gap-sm" style="align-items:center">
                <span style="color:${Oe[$[0].tool]||"var(--fg2)"}">${$t[$[0].tool]||"🔹"}</span>
                <strong>${X($[0].tool)}</strong>
                <span class="text-muted text-xs">${Eo($[0].duration_s)}</span>
                ${$[0].ended_at&&c`<span class="text-muted text-xs">${It($[0].ended_at)}</span>`}
              </div>
            </div>`}
          </div>`}
    </div>

    <div class="es-section" style="margin-top:var(--sp-8)">
      <div class="es-section-title">Session History</div>
      ${r?c`<p class="loading-state">Loading...</p>`:a?c`<p class="error-state">Failed to load session history.</p>`:$.length?c`<table role="table" aria-label="Session history" class="text-sm">
                <thead><tr>
                  <th>Tool</th>
                  <th>Session ID</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr></thead>
                <tbody>${$.map(b=>{const C=Oe[b.tool]||"var(--fg2)",D=$t[b.tool]||"🔹",F=b.session_id?b.session_id.length>12?b.session_id.slice(0,12)+"…":b.session_id:"—";return c`<tr key=${b.session_id} style="cursor:pointer;${b.session_id===v?"background:var(--bg2)":""}"
                    onClick=${()=>{p(b.session_id===v?null:b.session_id),g(null)}}>
                    <td>
                      <span style="color:${C};margin-right:var(--sp-2)">${D}</span>
                      ${X(b.tool)}
                    </td>
                    <td><span class="mono" title=${b.session_id} style="font-size:0.7rem">${F}</span></td>
                    <td>${Eo(b.duration_s)}</td>
                    <td>${b.active?c`<span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>`:c`<span class="badge" style="font-size:var(--fs-xs)">ended</span>`}</td>
                    <td>${b.ended_at?It(b.ended_at):"—"}</td>
                  </tr>`})}</tbody>
              </table>`:c`<p class="empty-state">No past sessions recorded.</p>`}
    </div>
  </div>`}function zi(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function Bp(e,t,s){let n;return{hooks:{init(l){n=document.createElement("div"),n.className="chart-tooltip",n.style.display="none",l.over.appendChild(n)},setCursor(l){var v;const o=l.cursor.idx;if(o==null){n.style.display="none";return}const a=[];for(let p=1;p<l.series.length;p++){const m=(v=l.data[p])==null?void 0:v[o];m!=null&&a.push(t?t(m):z(m))}if(!a.length){n.style.display="none";return}const i=l.data[0][o],r=s?new Date(i*1e3).toLocaleTimeString([],{hourCycle:"h23"}):e?e(i):z(i);n.innerHTML=`<b>${a.join(", ")}</b> ${r}`;const d=Math.round(l.valToPos(i,"x"));n.style.left=Math.min(d,l.over.clientWidth-100)+"px",n.style.display=""}}}}const Hp=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function Wp(e){return e==null||e===0?"0":e>=1e6?Math.round(e/1e6)+"M":e>=1e3?Math.round(e/1e3)+"K":e>=1?Math.round(e).toString():e.toPrecision(1)}function qp(e,t,s,n){const l=Math.max(0,Math.floor(Math.log10(Math.max(1,s)))),o=Math.ceil(Math.log10(Math.max(1,n))),a=[];for(let r=l;r<=o;r++)a.push(Math.pow(10,r));if(a.length<=3)return a;const i=Math.floor((l+o)/2);return[Math.pow(10,l),Math.pow(10,i),Math.pow(10,o)]}function lo({mode:e,data:t,labels:s,colors:n,height:l,isTime:o,fmtX:a,fmtY:i,xLabel:r,yLabel:d,logX:v}){const p=lt(null),m=lt(null),g=l||200;return de(()=>{if(!p.current||!t||t.length<2||!t[0]||t[0].length<2)return;try{m.current&&(m.current.destroy(),m.current=null)}catch{m.current=null}const k=t.length-1,M=n||Hp,T=[{}];for(let $=0;$<k;$++){const x=M[$%M.length],w=zi(x,.6);e==="scatter"?T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:"transparent",paths:()=>null,points:{show:!0,size:8,fill:w,stroke:"transparent",width:0}}):T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:x,width:1.5,fill:zi(x,.08),points:{show:!1}})}const y={width:p.current.clientWidth||300,height:g,padding:[8,8,0,0],cursor:{show:!0,x:!0,y:!1,points:{show:e!=="scatter"}},legend:{show:!1},select:{show:!1},scales:{x:{time:!!o,...v?{distr:3,log:10}:{}},y:{auto:!0,range:($,x,w)=>[Math.max(0,x*.9),w*1.1||1]}},axes:[{show:!0,size:28,gap:2,...v?{splits:qp}:{},values:o?void 0:($,x)=>x.map(w=>v?Wp(w):a?a(w):z(w)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}},{show:!0,size:50,gap:2,values:($,x)=>x.map(w=>i?i(w):z(w)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}}],series:T,plugins:[Bp(a,i,o)]};try{m.current=new st(y,t,p.current)}catch($){console.warn("AnalyticsChart: uPlot init failed",$),m.current=null}return()=>{try{m.current&&(m.current.destroy(),m.current=null)}catch{}}},[t,e,n,s,o,v,g]),de(()=>{if(!m.current||!p.current)return;const k=new ResizeObserver(()=>{m.current&&p.current&&m.current.setSize({width:p.current.clientWidth,height:g})});return k.observe(p.current),()=>k.disconnect()},[g]),c`<div class="analytics-chart-wrap" style=${"height:"+g+"px"} ref=${p}></div>`}function Vp(e){const t={};for(const s of e){const n=typeof s=="string"?s:s.metric;if(!n)continue;const l=n.split("."),o=l.length>1?l.slice(0,-1).join("."):"(ungrouped)";(t[o]=t[o]||[]).push({name:n,count:s.count||0,lastValue:s.last_value})}return Object.entries(t).sort((s,n)=>s[0].localeCompare(n[0]))}function Up(){const[e,t]=G([]),[s,n]=G(null),[l,o]=G(null),[a,i]=G([]),[r,d]=G(!1),[v,p]=G(null);de(()=>{fetch("/api/samples?list=1").then(T=>{if(!T.ok)throw new Error(T.statusText);return T.json()}).then(T=>{t(T||[]),p(null)}).catch(T=>{t([]),p(T.message)})},[]);const m=ie(()=>Vp(e),[e]),g=qe(T=>{n(T),o(null),i([]),d(!0);const y=Math.floor(Date.now()/1e3)-1800,$=fetch("/api/samples?series="+encodeURIComponent(T)+"&since="+y).then(w=>{if(!w.ok)throw new Error(w.statusText);return w.json()}).then(w=>o(w)).catch(()=>o(null)),x=fetch("/api/samples?metric="+encodeURIComponent(T)+"&since="+y).then(w=>{if(!w.ok)throw new Error(w.statusText);return w.json()}).then(w=>i(Array.isArray(w)?w:[])).catch(()=>i([]));Promise.allSettled([$,x]).then(()=>d(!1))},[]),k=ie(()=>!l||!l.value||!l.value.length?null:l.value[l.value.length-1],[l]),M=ie(()=>{const T=new Set;for(const y of a)y.tags&&Object.keys(y.tags).forEach($=>T.add($));return[...T].sort()},[a]);return c`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${v&&c`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${X(v)}</p>`}
      ${!v&&!e.length&&c`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${m.map(([T,y])=>c`<div key=${T}>
        <div class="text-muted" style="font-size:0.62rem;padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${T}</div>
        ${y.map($=>c`<button key=${$.name}
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

        ${r&&c`<p class="loading-state">Loading...</p>`}

        ${!r&&l&&l.ts&&l.ts.length>=2?c`<div class="es-section">
          <div class="es-section-title">Time Series (last 30m)</div>
          <${Zt}
            label=${s.split(".").pop()}
            value=${k!=null?z(k):"-"}
            data=${[l.ts,l.value]}
            chartColor="var(--accent)"
            smooth />
        </div>`:""}

        ${!r&&l&&l.ts&&l.ts.length<2&&c`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">Not enough data points to chart.</p>
        </div>`}

        ${!r&&!l&&!r&&c`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">No series data available.</p>
        </div>`}

        ${!r&&a.length>0&&c`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples (${a.length})</div>
          <div style="overflow-x:auto">
            <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
              <thead>
                <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
                  <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
                  <th style="padding:var(--sp-2) var(--sp-4)">Value</th>
                  ${M.map(T=>c`<th key=${T} style="padding:var(--sp-2) var(--sp-4)">${T}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${a.slice(-50).reverse().map((T,y)=>c`<tr key=${y}
                  style="border-bottom:1px solid var(--border);${y%2?"background:var(--bg2)":""}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${rr(T.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${z(T.value)}</td>
                  ${M.map($=>c`<td key=${$} style="padding:var(--sp-2) var(--sp-4)">
                    ${T.tags&&T.tags[$]!=null?c`<span class="badge">${T.tags[$]}</span>`:"-"}
                  </td>`)}
                </tr>`)}
              </tbody>
            </table>
          </div>
        </div>`}

        ${!r&&a.length===0&&l&&c`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples</div>
          <p class="empty-state">No raw samples in the last 30 minutes.</p>
        </div>`}
      </Fragment>`}
    </div>
  </div>`}const tn=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function cs(e){return e>=1e3?z(e/1e3)+"s":Math.round(e)+"ms"}function Gp(e){return"#"+Math.round(e)}function oo(e){return(e||"").split("/").slice(-2).join("/")}function Yp({data:e}){if(!e||!e.requests||!e.requests.length)return c`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <p class="empty-state">No request data in this time range.</p>
    </div>`;const t=e.requests,s=ie(()=>{const r=t.map(v=>v.ts),d=t.map(v=>v.duration_ms);return[r,d]},[t]),n=ie(()=>{const r=[...new Set(t.map(g=>g.model||"(unknown)"))],d=r.map(()=>[]),p=[...t.filter(g=>g.input_tokens>0)].sort((g,k)=>g.input_tokens-k.input_tokens),m=p.map(g=>g.input_tokens);for(const g of r)d[r.indexOf(g)]=p.map(k=>(k.model||"(unknown)")===g?k.duration_ms:null);return{data:[m,...d],labels:r,colors:tn.slice(0,r.length)}},[t]),l=e.by_model||[],o=Math.max(1,...l.map(r=>r.p95_ms)),a=ie(()=>{const r=[...new Set(t.map(g=>g.model||"(unknown)"))],v=[...t.filter(g=>g.seq>0)].sort((g,k)=>g.seq-k.seq),p=v.map(g=>g.seq),m=r.map(g=>v.map(k=>(k.model||"(unknown)")===g?k.duration_ms:null));return{data:[p,...m],labels:r,colors:tn.slice(0,r.length)}},[t]),i=t.length?t[t.length-1].duration_ms:0;return c`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${cs(i)}</span></div>
        <${lo} mode="line" data=${s} isTime=${!0} fmtY=${cs} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${t.length} requests</span></div>
        <${lo} mode="scatter" data=${n.data} labels=${n.labels}
          colors=${n.colors} fmtX=${z} fmtY=${cs} logX=${!0} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${l.map((r,d)=>c`<div key=${r.model} class="hbar-row">
            <span class="hbar-label" title=${r.model}>${r.model.replace(/^claude-/,"")||r.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${"width:"+Math.round(r.avg_ms/o*100)+"%;background:"+tn[d%tn.length]}></div>
              <div class="hbar-p95" style=${"left:"+Math.round(r.p95_ms/o*100)+"%"} title=${"p95: "+cs(r.p95_ms)}></div>
            </div>
            <span class="hbar-value">${cs(r.avg_ms)}</span>
            <span class="badge">${r.count}</span>
          </div>`)}
        </div>
        ${l.length>0&&c`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${lo} mode="scatter" data=${a.data} labels=${a.labels}
          colors=${a.colors} fmtX=${Gp} fmtY=${cs} logX=${!0} height=${200}/>
      </div>
    </div>
  </div>`}const Kp={"claude-code":"#8b5cf6",codex:"#f97316",aider:"#06b6d4",cursor:"#f472b6"};function Zr(e,t){return Kp[e]||tn[t%tn.length]}function Ri({by_cli:e,total:t,barWidth:s,cliTools:n}){return!e||!e.length?c`<div class="hbar-fill" style=${"width:"+s+"%;background:var(--accent)"}></div>`:e.map((l,o)=>{const a=l.count/t*s,i=Zr(l.cli_tool,n.indexOf(l.cli_tool));return c`<div key=${l.cli_tool}
      style=${"width:"+a.toFixed(1)+"%;background:"+i+";height:100%;display:inline-block"}
      title=${l.cli_tool+": "+l.count}></div>`})}function Jp({data:e}){if(!e||!e.invocations||!e.invocations.length)return c`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      <p class="empty-state">${e!=null&&e.total_all_time?"No tool invocation data in this time range. Try a wider range ("+e.total_all_time+" invocations exist).":"No tool invocation data yet. Configure Claude Code hooks to capture tool usage."}</p>
    </div>`;const t=e.invocations,s=e.cli_tools||[],n=Math.max(1,...t.map(o=>o.count)),l=Math.max(1,...t.map(o=>o.p95_ms));return c`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    ${s.length>1&&c`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${s.map((o,a)=>c`<span key=${o} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${"width:10px;height:10px;border-radius:2px;background:"+Zr(o,a)}></span>
        ${o}
      </span>`)}
    </div>`}
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Invocation Frequency</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${t.reduce((o,a)=>o+a.count,0)} total</span></div>
        <div class="hbar-list">
          ${t.slice(0,15).map(o=>c`<div key=${o.tool_name} class="hbar-row">
            <span class="hbar-label" title=${o.tool_name}>${o.tool_name}</span>
            <div class="hbar-track" style="overflow:hidden">
              <${Ri} by_cli=${o.by_cli} total=${o.count}
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
          ${t.slice(0,15).map((o,a)=>c`<div key=${o.tool_name} class="hbar-row">
            <span class="hbar-label" title=${o.tool_name}>${o.tool_name}</span>
            <div class="hbar-track">
              <${Ri} by_cli=${o.by_cli} total=${o.count}
                barWidth=${Math.round(o.avg_ms/l*100)} cliTools=${s}/>
              <div class="hbar-p95" style=${"left:"+Math.round(o.p95_ms/l*100)+"%"} title=${"p95: "+cs(o.p95_ms)}></div>
            </div>
            <span class="hbar-value">${cs(o.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`}function Qp({data:e}){const[t,s]=G(!1);if(!e)return null;const n=e.memory_timeline||{},l=e.memory_events||[],o=Object.keys(n);if(!o.length&&!l.length)return c`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <p class="empty-state">No file write data in this time range.</p>
    </div>`;const a=t?o:o.slice(0,6);return c`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>

    ${o.length>0&&c`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${o.length} files)</div>
      <div class="analytics-charts">
        ${a.map(i=>{const r=n[i];if(!r||r.ts.length<2)return c`<div key=${i} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${i}>${oo(i)}</span>
              <span class="chart-val text-muted">${r&&r.size_bytes.length?ge(r.size_bytes[r.size_bytes.length-1]):"-"}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;const d=r.size_bytes[r.size_bytes.length-1];return c`<div key=${i} class="diag-card">
            <${Zt} label=${oo(i)} value=${ge(d)}
              data=${[r.ts,r.size_bytes]} chartColor="var(--accent)"/>
          </div>`})}
      </div>
      ${o.length>6&&!t&&c`<button class="range-btn" style="margin-top:var(--sp-2)"
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
            ${l.slice(0,30).map((i,r)=>c`<tr key=${r}
              style="border-bottom:1px solid var(--border);${r%2?"background:var(--bg2)":""}">
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${rr(i.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${i.path}>${oo(i.path)}</td>
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
  </div>`}function Zp(){const e=Xe(Ne),t=e==null?void 0:e.globalRange,[s,n]=G(null),[l,o]=G(!0),[a,i]=G(null);return de(()=>{o(!0),i(null);const r=(t==null?void 0:t.since)||Date.now()/1e3-86400,d=(t==null?void 0:t.until)||"",v=`/api/analytics?since=${r}${d?"&until="+d:""}`,p=new AbortController,m=setTimeout(()=>p.abort(),15e3);return fetch(v,{signal:p.signal}).then(g=>{if(!g.ok)throw new Error(g.statusText);return g.json()}).then(g=>{n(g),i(null)}).catch(g=>{g.name==="AbortError"?i("Request timed out"):(n(null),i(g.message))}).finally(()=>{clearTimeout(m),o(!1)}),()=>{clearTimeout(m),p.abort()}},[t==null?void 0:t.since,t==null?void 0:t.until]),c`<div class="analytics-grid">
    ${l&&c`<p class="loading-state">Loading analytics...</p>`}
    ${a&&c`<p class="error-state">Error: ${a}</p>`}
    ${!l&&!a&&c`<Fragment>
      <${Yp} data=${s==null?void 0:s.response_time}/>
      <${Jp} data=${s==null?void 0:s.tools}/>
      <${Qp} data=${s==null?void 0:s.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <div style="margin-top:var(--sp-4)"><${Up}/></div>
      </details>
    </Fragment>`}
  </div>`}function ds(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Xr(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Xp(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"})}function ec(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function Fi(e){return e?e.replace("claude-","").replace(/-\d{8}$/,""):""}function ef(e,t){if(!t)return"";let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{return t.slice(0,80)}if(typeof s!="object"||s===null)return String(t).slice(0,80);const n=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const o of n)if(s[o]){let a=String(s[o]);return(o==="file_path"||o==="path")&&a.length>60&&(a=".../"+a.replace(/\\/g,"/").split("/").slice(-2).join("/")),a.slice(0,100)}const l=Object.keys(s);return l.length>0?String(s[l[0]]).slice(0,80):""}const Ii=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],ji={Bash:"#1a1a1a"};function Ni(e){if(ji[e])return ji[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return Ii[t%Ii.length]}function tf(e,t){const s=new Set,n=[],l=(o,a,i)=>{s.has(o)||(s.add(o),n.push({id:o,label:a||o,color:i||"var(--fg2)"}))};l("user","User","var(--green)"),l("tool",t||"AI Tool",Oe[t]||"var(--accent)");for(const o of e){if((o.type==="api_call"||o.type==="api_response"||o.type==="error")&&l("api","API","var(--accent)"),o.type==="tool_use"){const a=o.to||"tool";l("skill:"+a,a,Ni(a))}if(o.type==="subagent"){const a=o.to||"Subagent";l("subagent:"+a,a,Ni(a))}o.type==="hook"&&l("hook","Hooks","var(--orange)")}return n}function sf({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:c`<div class="sf-tool-tabs">
    ${e.map(n=>c`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?Oe[n]||"var(--accent)":"transparent"};color:${Oe[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${$t[n]||"🔹"}</span> ${X(n)}
    </button>`)}
  </div>`}function nf(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function lf({sessions:e,activeId:t,onSelect:s,loading:n}){return n?c`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?c`<div class="sf-sess-tabs">
    ${e.map(l=>{const o=l.exact_input_tokens||l.input_tokens||0,a=l.exact_output_tokens||l.output_tokens||0,i=o+a,r=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),d=l.session_id===t,v=!l.ended_at;return c`<button key=${l.session_id}
        title=${l.session_id}
        class="sf-sess-tab ${d?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${Xp(l.started_at)}</span>
        <span class="sf-stab-sid">${nf(l.session_id)}</span>
        <span class="sf-stab-dur">${Xr(r)}</span>
        ${i>0&&c`<span class="sf-stab-tok">${z(i)}t</span>`}
        ${(l.files_modified||0)>0&&c`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${v&&c`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:c`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function of({event:e}){if(e.type==="user_message")return e.redacted?c`<div class="sf-seq-tooltip">
        <div class="sf-tip-label">User Prompt <span style="color:var(--orange)">(redacted)</span></div>
        <div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">
          Claude Code redacts prompts by default in OTel telemetry.
        </div>
        <div class="sf-tip-meta">
          To capture prompt text, restart Claude Code with:<br/>
          <code style="color:var(--accent)">eval $(aictl otel enable)</code><br/>
          This sets <code>OTEL_LOG_USER_PROMPTS=1</code> before launch.
        </div>
        ${e.prompt_length&&c`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">Prompt length: ${e.prompt_length} chars</div>`}
      </div>`:e.message?c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">User Prompt</div>
      <div class="sf-tip-body">${X(e.message)}</div>
      ${e.prompt_length&&c`<div class="sf-tip-meta">${e.prompt_length} chars</div>`}
    </div>`:null;if(e.type==="api_call"){const t=e.tokens||{};return c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Call${e.model?" — "+e.model:""}</div>
      ${e.agent_name&&c`<div class="sf-tip-meta">Agent: ${X(e.agent_name)}</div>`}
      <div class="sf-tip-meta">
        Input: ${z(t.input||0)} \u00B7 Output: ${z(t.output||0)}
        ${(t.cache_read||0)>0?" · Cache: "+z(t.cache_read):""}
      </div>
      <div class="sf-tip-meta">
        ${e.duration_ms>0?"Duration: "+ds(e.duration_ms):""}
        ${e.ttft_ms>0?" · TTFT: "+ds(e.ttft_ms):""}
      </div>
      ${e.is_error&&c`<div class="sf-tip-meta" style="color:var(--red)">Error: ${X(e.error_type||"unknown")}</div>`}
    </div>`}if(e.type==="api_response"){const t=e.tokens||{};return c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${e.model?" — "+e.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${z(t.output||0)} tokens
        ${e.duration_ms>0?" · Latency: "+ds(e.duration_ms):""}
        ${e.finish_reason?" · "+e.finish_reason:""}
      </div>
      ${e.response_preview&&c`<div class="sf-tip-body">${X(e.response_preview)}</div>`}
    </div>`}if(e.type==="error")return c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${X(e.error_type||"unknown")}</div>
      ${e.error_message&&c`<div class="sf-tip-body">${X(e.error_message)}</div>`}
      ${e.parent_span&&c`<div class="sf-tip-meta">During: ${X(e.parent_span)}</div>`}
    </div>`;if(e.type==="tool_use"){let t=null;if(e.params){let s=e.params;if(typeof s=="string")try{s=JSON.parse(s)}catch{s=null}s&&typeof s=="object"&&(t=Object.entries(s).filter(([n,l])=>l!=null&&l!==""))}return c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${X(e.to||"Tool")}${e.subtype==="result"?" (result)":e.subtype==="decision"?" (decision)":""}</div>
      ${e.decision&&c`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${X(e.decision)}</strong></div>`}
      ${t?c`<div class="sf-tip-params">
            ${t.map(([s,n])=>{const l=String(n),o=l.length>120;return c`<div key=${s} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${X(s)}</span>
                <span class="sf-tip-param-val ${o?"sf-tip-param-long":""}" title=${l}>${X(o?l.slice(0,200)+"...":l)}</span>
              </div>`})}
          </div>`:e.params&&c`<div class="sf-tip-body mono">${X(e.params)}</div>`}
      ${(e.success||e.duration_ms>0||e.result_size)&&c`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${e.success?"Success: "+e.success:""}
        ${e.duration_ms>0?" · "+ds(e.duration_ms):""}
        ${e.result_size?" · Result: "+e.result_size+" bytes":""}
      </div>`}
    </div>`}return e.type==="subagent"?c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${X(e.to||"agent")}</div>
    </div>`:e.type==="hook"?c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${X(e.hook_name||"")}</div>
    </div>`:null}function af({event:e,participants:t,hoveredIdx:s,idx:n,onHover:l}){const o=t.findIndex(x=>x.id===e._from),a=t.findIndex(x=>x.id===e._to);if(o<0||a<0)return null;const i=a>o,r=Math.min(o,a),d=Math.max(o,a),v=s===n,p=t.find(x=>x.id===e._to),g={user_message:"var(--green)",api_call:e.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:(p==null?void 0:p.color)||"var(--cat-commands)",subagent:(p==null?void 0:p.color)||"var(--yellow)",hook:"var(--orange)"}[e.type]||"var(--fg2)";let k="",M="";if(e.type==="user_message")e.redacted?k="🔒 prompt ("+(e.prompt_length||"?")+" chars)":(k=e.preview||"(prompt)",e.prompt_length&&(M=e.prompt_length+" chars"));else if(e.type==="api_call"){const x=e.tokens||{};k=e.agent_name||Fi(e.model)||"API call",M=z((x.input||0)+(x.output||0))+"t",e.ttft_ms>0?M+=" ttft:"+ds(e.ttft_ms):e.duration_ms>0&&(M+=" "+ds(e.duration_ms)),e.is_error&&(M+=" ⚠")}else if(e.type==="api_response"){const x=e.tokens||{};k="← "+z(x.output||0)+"t",e.response_preview&&(k+=" "+e.response_preview.slice(0,60)),M=Fi(e.model)||"",e.finish_reason&&e.finish_reason!=="stop"&&(M+=" ["+e.finish_reason+"]")}else if(e.type==="error")k="⚠ "+(e.error_type||"error"),M=e.error_message?e.error_message.slice(0,60):"";else if(e.type==="tool_use"){const x=e.to||"tool",w=ef(x,e.params);k=x+(w?": "+w:""),e.subtype==="result"?(M=e.success==="true"||e.success===!0?"✓":"✗",e.duration_ms>0&&(M+=" "+ds(e.duration_ms)),e.result_size&&(M+=" "+e.result_size+"B")):e.subtype==="decision"&&(M=e.decision||"")}else e.type==="subagent"?k=e.to||"subagent":e.type==="hook"&&(k=e.hook_name||"hook");const T=100/t.length,y=(r+.5)*T,$=(d+.5)*T;return c`<div class="sf-seq-row ${v?"hovered":""}"
    onMouseEnter=${()=>l(n)} onMouseLeave=${()=>l(null)}>
    <!-- Token columns (left side) -->
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${e._cumTok>0?z(e._cumTok):""}</span>
      <span class="sf-seq-rttok">${e._rtTok>0?z(e._rtTok):""}</span>
    </div>
    <!-- Time -->
    <div class="sf-seq-time">${ec(e.ts)}</div>
    <!-- Arrow area -->
    <div class="sf-seq-arrow-area">
      <!-- Swimlane lines -->
      ${t.map((x,w)=>c`<div key=${w} class="sf-seq-lane"
        style="left:${(w+.5)*T}%"></div>`)}
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
      "><span class="sf-seq-label-text" title=${k}>${X(k)}</span>
        ${M&&c`<span class="sf-seq-sublabel">${M}</span>`}
      </div>
    </div>
    <!-- Hover tooltip -->
    ${v&&c`<${of} event=${e}/>`}
  </div>`}function rf({event:e,participants:t}){100/t.length;let s="",n="var(--fg2)",l="";return e.type==="session_start"?(s="Session started",n="var(--green)",l="▶"):e.type==="session_end"?(s="Session ended",n="var(--fg3)",l="■"):e.type==="compaction"&&(s="Compaction"+(e.compaction_count?" #"+e.compaction_count:""),n="var(--orange)",l="⟳"),c`<div class="sf-seq-marker" style="border-left-color:${n}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${ec(e.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${n}">
      ${l} ${s}
      ${e.type==="compaction"&&e.duration_ms>0?" — "+ds(e.duration_ms):""}
      ${e.cwd?c` <span class="text-muted text-xs mono">${X(e.cwd)}</span>`:""}
    </div>
  </div>`}function cf({summary:e}){return!e||!e.event_count?null:c`<div class="sf-summary">
    ${e.total_turns>0&&c`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${e.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${e.total_api_calls||0}</div></div>
    ${e.total_tool_uses>0&&c`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${e.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${z(e.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${z(e.total_input_tokens)}/${z(e.total_output_tokens)}</div></div>
    ${e.compactions>0&&c`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${e.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${Xr(e.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${e.event_count}</div></div>
  </div>`}function df(){const{snap:e,globalRange:t,enabledTools:s}=Xe(Ne),[n,l]=G([]),[o,a]=G(!0),[i,r]=G(null),[d,v]=G(null),[p,m]=G(null),[g,k]=G(!1),[M,T]=G(null);de(()=>{a(!0);let b="/api/session-timeline?since="+(t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400);t&&t.until!=null&&(b+="&until="+t.until),fetch(b).then(C=>C.json()).then(C=>{C.sort((D,F)=>(F.started_at||0)-(D.started_at||0)),l(C),a(!1)}).catch(()=>a(!1))},[t]);const y=P=>s===null||s.includes(P),$=n.filter(P=>y(P.tool)),x=[...new Set($.map(P=>P.tool))].sort();de(()=>{(!i&&x.length>0||i&&!x.includes(i)&&x.length>0)&&r(x[0])},[x.join(",")]);const w=$.filter(P=>P.tool===i);de(()=>{w.length>0&&(!d||!w.find(P=>P.session_id===d))&&v(w[0].session_id)},[i,w.length]),de(()=>{if(!d){m(null);return}k(!0);const P=n.find(D=>D.session_id===d),b=P!=null&&P.started_at?P.started_at-60:Date.now()/1e3-86400,C=P!=null&&P.ended_at?P.ended_at+60:Date.now()/1e3+60;fetch(`/api/session-flow?session_id=${encodeURIComponent(d)}&since=${b}&until=${C}`).then(D=>D.json()).then(D=>{m(D),k(!1)}).catch(()=>{m(null),k(!1)})},[d]);const{processedTurns:N,participants:A}=ie(()=>{const P=(p==null?void 0:p.turns)||[];if(!P.length)return{processedTurns:[],participants:[]};const b=P.map(R=>{const q={...R};return R.type==="user_message"?(q._from="user",q._to="tool"):R.type==="api_call"?(q._from=R.from||"tool",q._to="api"):R.type==="api_response"||R.type==="error"?(q._from="api",q._to="tool"):R.type==="tool_use"?(q._from="tool",q._to="skill:"+(R.to||"tool")):R.type==="subagent"?(q._from="tool",q._to="subagent:"+(R.to||"agent")):R.type==="hook"&&(q._from="tool",q._to="hook"),q});let C=0,D=0;for(const R of b){const q=R.tokens||{},Y=(q.input||0)+(q.output||0);R.type==="user_message"&&(D=0),R.type==="api_call"&&(C+=Y,D+=Y),R._cumTok=C,R._rtTok=D}const F=tf(b,i);return{processedTurns:b,participants:F}},[p,i]),O=(p==null?void 0:p.summary)||{};return N.filter(P=>P._from&&P._to),N.filter(P=>!P._from||!P._to),c`<div class="sf-container">
    <!-- Tool tabs -->
    <${sf} tools=${x} activeTool=${i} onSelect=${r}/>

    <!-- Session tabs -->
    <${lf} sessions=${w} activeId=${d}
      onSelect=${v} loading=${o}/>

    <!-- Summary -->
    <${cf} summary=${O}/>

    <!-- Sequence diagram -->
    <div class="sf-seq-container">
      ${g?c`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`:N.length===0?c`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No flow data for this session.</p>
              <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
                Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
              </p>
            </div>`:c`
            <!-- Participant headers (swimlane columns) -->
            <div class="sf-seq-header">
              <div class="sf-seq-tokens">
                <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
              </div>
              <div class="sf-seq-time"></div>
              <div class="sf-seq-arrow-area">
                ${A.map((P,b)=>{const C=100/A.length;return c`<div key=${P.id} class="sf-seq-participant"
                    style="left:${(b+.5)*C}%;color:${P.color}">
                    <div class="sf-seq-participant-box" style="border-color:${P.color}">${X(P.label)}</div>
                  </div>`})}
              </div>
            </div>
            <!-- Event rows -->
            <div class="sf-seq-body">
              ${N.map((P,b)=>P._from&&P._to?c`<${af} key=${b} event=${P} participants=${A}
                    hoveredIdx=${M} idx=${b} onHover=${T}/>`:c`<${rf} key=${b} event=${P} participants=${A}/>`)}
            </div>
          `}
    </div>
  </div>`}const uf={enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).",enabled:"Whether agent/agentic mode is active.",autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode allows the agent to execute tool calls without confirmation prompts. Use with caution.",autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.",skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks.",webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."};function pf(e){return uf[e]||""}function ff({v:e}){return e===!0?c`<span style="color:var(--green);font-weight:600">on</span>`:e===!1?c`<span style="color:var(--red);opacity:0.8">off</span>`:e==null||e===""?c`<span class="text-muted">—</span>`:typeof e=="object"?c`<span class="mono" style="font-size:var(--fs-xs)">${JSON.stringify(e)}</span>`:c`<span class="mono">${String(e)}</span>`}function en({k:e,v:t,indent:s}){const n=e.replace(/([A-Z])/g," $1").replace(/^./,o=>o.toUpperCase()),l=pf(e);return c`<div
    title=${l}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${s?"var(--sp-6)":"var(--sp-4)"};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${l?"help":"default"}">
    <span style="color:var(--fg2)">${n}${l?c`<span style="color:var(--fg3);margin-left:3px;font-size:0.6em">?</span>`:""}</span>
    <${ff} v=${t}/>
  </div>`}function tc({otel:e}){if(!e||!e.enabled&&!e.source)return null;const t=e.enabled;return c`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:${t?"var(--green)":"var(--fg3)"};padding:var(--sp-2) var(--sp-4) var(--sp-1)">
      OpenTelemetry ${t?"● on":"○ off"}
    </div>
    <div style="border:1px solid ${t?"var(--green)":"var(--bg2)"};border-radius:4px;overflow:hidden;
                background:${t?"color-mix(in srgb,var(--green) 4%,transparent)":"transparent"}">
      ${t&&c`<${en} k="exporter" v=${e.exporter||"—"}/>`}
      ${e.endpoint&&c`<${en} k="endpoint" v=${e.endpoint}/>`}
      ${e.file_path&&c`<${en} k="file_path" v=${e.file_path}/>`}
      ${e.capture_content!==void 0&&c`<${en} k="capture_content" v=${!!e.capture_content}/>`}
      ${!t&&e.source&&c`<${en} k="source" v=${e.source}/>`}
    </div>
  </div>`}function Mo({name:e,items:t}){const s=Object.entries(t);return s.length?c`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${e}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${s.map(([n,l])=>c`<${en} key=${n} k=${n} v=${l}/>`)}
    </div>
  </div>`:null}function vf({cfg:e,label:t}){var i,r;const s=$t[e.tool]||"🔹",n=Oe[e.tool]||"var(--fg2)",l=Object.entries(e.feature_groups||{}),o=Object.entries(e.settings||{}).filter(([d])=>!["agent_historySummarizationMode","agent_maxRequests","debug_requestLoggerMaxEntries","planModel","implementModel"].includes(d));return((i=e.otel)==null?void 0:i.enabled)||((r=e.otel)==null?void 0:r.source)||l.length||o.length||(e.hints||[]).length||(e.mcp_servers||[]).length||(e.extensions||[]).length?c`<div style="background:var(--bg);border:2px solid ${n};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${n} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${n}">
      <span>${s}</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${n}">${t||e.tool}</span>
      ${e.model&&c`<span class="badge mono">${e.model}</span>`}
      ${e.auto_update===!0&&c`<span class="badge">auto-update on</span>`}
      ${e.auto_update===!1&&c`<span class="badge" style="opacity:0.6">auto-update off</span>`}
      ${e.launch_at_startup===!0&&c`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${e.launch_at_startup===!1&&c`<span class="badge" style="opacity:0.6">no auto-start</span>`}
    </div>
    <div style="padding:var(--sp-4);flex:1">
      <${tc} otel=${e.otel}/>
      ${l.map(([d,v])=>c`<${Mo} key=${d} name=${d} items=${v}/>`)}
      ${o.length>0&&c`<${Mo} name="Settings" items=${Object.fromEntries(o)}/>`}
      ${(e.mcp_servers||[]).length>0&&c`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">MCP Servers</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${e.mcp_servers.map(d=>c`<span key=${d} class="pill mono">${d}</span>`)}
        </div>
      </div>`}
      ${(e.extensions||[]).length>0&&c`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Extensions</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${e.extensions.map(d=>c`<span key=${d} class="pill mono" style="font-size:var(--fs-2xs)">${d}</span>`)}
        </div>
      </div>`}
      ${(e.hints||[]).length>0&&c`<div style="padding:var(--sp-3) var(--sp-4);border-left:3px solid var(--orange);
          background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
        ${e.hints.map((d,v)=>c`<div key=${v} class="text-orange" style="font-size:var(--fs-sm);padding:1px 0">
          <span style="margin-right:var(--sp-2)">💡</span>${d}
        </div>`)}
      </div>`}
    </div>
  </div>`:null}function mf({cfg:e}){var o,a,i,r;if(!e)return null;const t=Object.entries(e.feature_groups||{});if(!t.length&&!((o=e.otel)!=null&&o.enabled)&&!((a=e.otel)!=null&&a.source))return null;const n=(((i=e.feature_groups)==null?void 0:i.Safety)||{}).globalAutoApprove===!0,l=(((r=e.feature_groups)==null?void 0:r.Agent)||{}).autoReply===!0;return c`<div style="background:var(--bg);border:2px solid #007acc;border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,#007acc 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid #007acc">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:#007acc">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${n&&c`<span class="badge" style="margin-left:auto;background:var(--red);color:#fff;font-weight:700">⚠ YOLO MODE ON</span>`}
      ${!n&&l&&c`<span class="badge" style="margin-left:auto;background:var(--orange);color:#fff">⚠ auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${tc} otel=${e.otel}/>
      ${t.map(([d,v])=>c`<${Mo} key=${d} name=${d} items=${v}/>`)}
    </div>
  </div>`}function hf({snap:e}){var l,o,a;const t=Oe.aictl||"#94a3b8",s=Object.entries(((l=e==null?void 0:e.live_monitor)==null?void 0:l.diagnostics)||{}),n=[...((o=e==null?void 0:e.live_monitor)==null?void 0:o.workspace_paths)||[],...((a=e==null?void 0:e.live_monitor)==null?void 0:a.state_paths)||[]];return!s.length&&!n.length?null:c`<div style="background:var(--bg);border:2px solid ${t};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${t} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${t}">
      <span>⚙️</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${t}">aictl</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">monitoring engine</span>
    </div>
    <div style="padding:var(--sp-4);flex:1">
      ${s.length>0&&c`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Collectors</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
          ${s.map(([i,r])=>{const d=r.status==="active";return c`<div key=${i} title=${r.detail||""} style="display:flex;align-items:baseline;gap:var(--sp-4);padding:3px var(--sp-4);
                font-size:var(--fs-sm);border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);cursor:help">
              <span class="mono" style="flex:1">${i}</span>
              <span style="color:var(--fg3)">${r.mode||""}</span>
              <span style="color:${d?"var(--green)":"var(--orange)"}">
                ${d?"●":"○"} ${r.status||"unknown"}
              </span>
            </div>`})}
        </div>
      </div>`}
      ${n.length>0&&c`<div>
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Monitored Roots</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4)">
          ${n.map((i,r)=>c`<div key=${r} class="mono text-muted" style="font-size:var(--fs-xs);padding:1px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${i}>${i}</div>`)}
        </div>
      </div>`}
    </div>
  </div>`}function gf(){const{snap:e}=Xe(Ne),t=ie(()=>e!=null&&e.tool_configs?e.tool_configs:[],[e]),s=ie(()=>{const o={};return((e==null?void 0:e.tools)||[]).forEach(a=>{o[a.tool]=a.label}),o},[e]);if(!e)return c`<p class="loading-state">Loading...</p>`;if(!t.length)return c`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const n=t.find(o=>o.tool==="vscode"),l=t.filter(o=>o.tool!=="vscode");return c`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${n&&c`<${mf} cfg=${n}/>`}
    ${l.map(o=>c`<${vf} key=${o.tool} cfg=${o} label=${s[o.tool]||o.tool}/>`)}
    <${hf} snap=${e}/>
  </div>`}const Gn={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},_f=["project","global","shadow","session","external"],Yn=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function $f(e,t){const s=Ts(e),n=Ts(t);if(!s)return"(unknown)";if(n&&s.startsWith(n+"/")){const l=s.slice(n.length+1).split("/")[0];return l.startsWith(".")?"(root)":l}return s.includes("/.claude/projects/")?"(shadow)":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")?"(global)":"(other)"}function bf(e){if(!e)return"unknown";const t=Ts(e).split("/"),s=t.pop()||"unknown",n=s.lastIndexOf("."),l=n>0?s.slice(0,n):s;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test(l)){const o=t.pop();if(o)return o}return l}function yf(){const{snap:e}=Xe(Ne),[t,s]=G(null),n=ie(()=>{if(!e)return null;const o=e.tools.filter(T=>T.tool!=="aictl"&&T.tool!=="any");if(!o.length)return null;const a=e.root||"",i={},r={},d={},v={yes:0,"on-demand":0,conditional:0,no:0};let p=0;for(const T of o)for(const y of T.files){const $=y.kind||"other",x=y.scope||"external",w=(y.sent_to_llm||"no").toLowerCase(),N=y.tokens||0,A=$f(y.path,a),O=bf(y.path);i[$]||(i[$]={tokens:0,files:0,projects:{}}),i[$].tokens+=N,i[$].files+=1,i[$].projects[A]||(i[$].projects[A]={tokens:0,count:0}),i[$].projects[A].tokens+=N,i[$].projects[A].count+=1,d[A]||(d[A]={tokens:0,count:0,cats:{}}),d[A].tokens+=N,d[A].count+=1,d[A].cats[$]||(d[A].cats[$]={tokens:0,count:0,items:{}}),d[A].cats[$].tokens+=N,d[A].cats[$].count+=1,d[A].cats[$].items[O]||(d[A].cats[$].items[O]=0),d[A].cats[$].items[O]+=N,r[x]||(r[x]={tokens:0,files:0}),r[x].tokens+=N,r[x].files+=1,v[w]!==void 0?v[w]+=N:v.no+=N,p+=N}const m=Object.entries(i).sort((T,y)=>y[1].tokens-T[1].tokens),g=_f.filter(T=>r[T]).map(T=>[T,r[T]]),k=Object.entries(d).sort((T,y)=>y[1].tokens-T[1].tokens),M=o.map(T=>({tool:T.tool,label:T.label,tokens:T.files.reduce((y,$)=>y+$.tokens,0),files:T.files.length,sentYes:T.files.filter(y=>(y.sent_to_llm||"").toLowerCase()==="yes").reduce((y,$)=>y+$.tokens,0)})).filter(T=>T.tokens>0).sort((T,y)=>y.tokens-T.tokens).slice(0,8);return{cats:m,scopes:g,byPolicy:v,totalTokens:p,perTool:M,byCat:i,byProj:d,projList:k}},[e]);if(!n)return c`<p class="empty-state">No file data available.</p>`;if(!n.totalTokens)return c`<p class="empty-state">No token data collected yet.</p>`;const l=Math.max(...n.cats.map(([,o])=>o.tokens),1);return c`<div class="diag-card" role="region" aria-label="Context window map">
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
        ${n.cats.map(([o,a])=>{const i=a.tokens/n.totalTokens*100;return i<.5?null:c`<div key=${o} style="width:${i}%;background:${Gn[o]||"var(--fg2)"};
            position:relative;min-width:2px"
            title="${o}: ${z(a.tokens)} tokens (${a.files} files)">
            ${i>8?c`<span class="text-ellipsis text-bold" style="position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;font-size:var(--fs-2xs);color:var(--bg);padding:0 2px">${o}</span>`:null}
          </div>`})}
      </div>
    </div>

    <!-- Per-category bars with project sub-segments -->
    <div class="mb-md">
      ${n.cats.map(([o,a])=>{const i=Object.entries(a.projects).sort((d,v)=>v[1].tokens-d[1].tokens),r=a.tokens/l*100;return c`<div key=${o} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);font-size:var(--fs-base)">
          <span class="text-bold text-right" style="width:80px;color:${Gn[o]||"var(--fg2)"};flex-shrink:0">${o}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${r}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${i.map(([d,v],p)=>{const m=a.tokens>0?v.tokens/a.tokens*100:0;if(m<.5)return null;const g=!t||t===d;return c`<div key=${d} style="width:${m}%;height:100%;
                  background:${Gn[o]||"var(--fg2)"};
                  opacity:${g?Math.max(.3,1-p*.12):.12};
                  border-right:1px solid var(--bg);
                  display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px;
                  cursor:pointer;transition:opacity 0.15s"
                  title="${d}: ${z(v.tokens)} tok (${v.count} files)"
                  onClick=${()=>s(t===d?null:d)}>
                  ${m>12&&r>15?c`<span style="font-size:9px;color:var(--bg);
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
      ${n.projList.map(([o,a])=>{const i=t===o;return c`<button key=${o}
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
    ${t&&n.byProj[t]?(()=>{const o=n.byProj[t],a=Object.entries(o.cats).sort((r,d)=>d[1].tokens-r[1].tokens),i=Math.max(...a.map(([,r])=>r.tokens),1);return c`<div class="mb-md" style="background:var(--bg2);border-radius:6px;padding:var(--sp-4)">
        <div class="es-section-title">${t} \u2014 ${z(o.tokens)} tokens across ${o.count} files</div>
        ${a.map(([r,d])=>{const v=Object.entries(d.items).sort((k,M)=>M[1]-k[1]),p=v.slice(0,15),m=v.slice(15).reduce((k,[,M])=>k+M,0);m>0&&p.push(["(other)",m]);const g=d.tokens/i*100;return c`<div key=${r} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${Gn[r]||"var(--fg2)"};flex-shrink:0">${r}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${g}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${p.map(([k,M],T)=>{const y=d.tokens>0?M/d.tokens*100:0;if(y<.3)return null;const $=Yn[T%Yn.length];return c`<div key=${k} style="width:${y}%;height:100%;background:${$};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${k}: ${z(M)} tok">
                      ${y>10&&g>20?c`<span style="font-size:9px;color:#111;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:700">${k}</span>`:null}
                    </div>`})}
                </div>
              </div>
              <span class="text-right text-muted" style="min-width:55px">${z(d.tokens)} tok</span>
              <span class="text-right text-muted" style="min-width:30px">${d.count}f</span>
            </div>
            <!-- Item legend -->
            <div style="padding-left:88px;display:flex;flex-wrap:wrap;gap:var(--sp-1) var(--sp-3);margin-top:3px">
              ${p.map(([k,M],T)=>c`<span key=${k}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${Yn[T%Yn.length]};flex-shrink:0"></span>
                <span class="text-muted">${k} ${z(M)}</span>
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
          <span><span style="color:${Oe[o.tool]||"var(--fg2)"}">${$t[o.tool]||"🔹"}</span> ${X(o.label)}</span>
          <span class="text-muted">${z(o.sentYes)} sent \u00B7 ${z(o.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}const xf={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"};function kf(e){if(!e||e<0)return"—";const t=Math.floor(e/3600),s=Math.floor(e%3600/60);return t>0?`${t}h ${s}m`:`${s}m`}function wf(){var m,g,k,M,T;const{snap:e}=Xe(Ne),[t,s]=G(null),[n,l]=G(null);de(()=>{let y=!0;const $=()=>{fetch("/api/otel-status").then(w=>w.json()).then(w=>{y&&s(w)}).catch(()=>{}),fetch("/api/self-status").then(w=>w.json()).then(w=>{y&&l(w)}).catch(()=>{})};$();const x=setInterval($,15e3);return()=>{y=!1,clearInterval(x)}},[]);const o=ie(()=>{if(!e)return[];const y=e.tool_telemetry||[];return e.tools.filter($=>$.tool!=="aictl"&&$.tool!=="any").map($=>{var P,b,C,D,F;const x=y.find(R=>R.tool===$.tool),w=$.live||{},N=w.last_seen_at||0,A=N>0?Math.floor(Date.now()/1e3-N):-1,O=A>3600||A<0;return{tool:$.tool,label:$.label,source:(x==null?void 0:x.source)||(w.session_count?"live-monitor":"discovery"),confidence:(x==null?void 0:x.confidence)||((P=w.token_estimate)==null?void 0:P.confidence)||0,inputTokens:(x==null?void 0:x.input_tokens)||0,outputTokens:(x==null?void 0:x.output_tokens)||0,cost:(x==null?void 0:x.cost_usd)||0,sessions:(x==null?void 0:x.total_sessions)||w.session_count||0,errors:((b=x==null?void 0:x.errors)==null?void 0:b.length)||0,lastError:((C=x==null?void 0:x.errors)==null?void 0:C[0])||null,lastSeen:A,stale:O,fileCount:$.files.length,procCount:$.processes.length,hasLive:!!$.live,hasOtel:!!((F=(D=w.sources||[]).includes)!=null&&F.call(D,"otel"))}}).sort(($,x)=>x.inputTokens+x.outputTokens-($.inputTokens+$.outputTokens))},[e]),a=ie(()=>{var y;return(y=e==null?void 0:e.live_monitor)!=null&&y.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([$,x])=>({name:$,status:x.status||"unknown",mode:x.mode||"",detail:x.detail||""})):[]},[e]);if(!e)return null;const i=o.length,r=o.filter(y=>y.inputTokens+y.outputTokens>0).length,d=o.filter(y=>y.hasLive).length,v=o.filter(y=>y.stale&&y.hasLive).length,p=o.reduce((y,$)=>y+$.errors,0);return c`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--bg)">${r}/${i} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--bg)">${d} live</span>
      ${v>0?c`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--bg)">${v} stale</span>`:null}
      ${p>0?c`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--bg)">${p} errors</span>`:null}
      ${t!=null&&t.active?c`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--bg)">OTel active</span>`:c`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${n?c`<div class="mb-md" style="font-size:var(--fs-sm)">
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
          <div class="metric-chip-value">${kf(n.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${n.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${z((((g=n.db)==null?void 0:g.metrics_count)||0)+(((k=n.db)==null?void 0:k.tool_metrics_count)||0)+(((M=n.db)==null?void 0:M.events_count)||0)+(((T=n.db)==null?void 0:T.samples_count)||0))}</div>
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
    ${t?c`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">OTel Receiver</div>
      <div class="flex-row gap-md flex-wrap">
        <span>Metrics: <strong>${t.metrics_received||0}</strong></span>
        <span>Events: <strong>${t.events_received||0}</strong></span>
        <span>API calls: <strong>${t.api_calls_total||0}</strong></span>
        ${t.api_errors_total>0?c`<span class="text-red">Errors: <strong>${t.api_errors_total}</strong></span>`:null}
        ${t.errors>0?c`<span class="text-orange">Parse errors: <strong>${t.errors}</strong></span>`:null}
        ${t.last_receive_at>0?c`<span class="text-muted">Last: ${It(t.last_receive_at)}</span>`:null}
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
          <tbody>${o.map(y=>{var $;return c`<tr key=${y.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${y.stale&&!y.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <span style="color:${Oe[y.tool]||"var(--fg2)"}">${$t[y.tool]||"🔹"}</span>
              ${X(y.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${y.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${y.confidence>=.9?"var(--green)":y.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${y.confidence>0?_e(y.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.inputTokens?z(y.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.outputTokens?z(y.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${y.errors>0?c`<span class="text-red" title=${(($=y.lastError)==null?void 0:$.message)||""}>${y.errors}</span>`:c`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${y.lastSeen>=0?c`<span style="color:${y.stale?"var(--orange)":"var(--fg2)"}">${It(Date.now()/1e3-y.lastSeen)}</span>`:c`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Collector pipeline status -->
    ${a.length>0?c`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${a.map(y=>c`<div key=${y.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${xf[y.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${y.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${y.status}</span>
          </div>
          ${y.detail?c`<div class="text-xs text-muted" style="margin-top:2px">${X(y.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let ao=null,wn=null;function Sf(){return ao?Promise.resolve(ao):wn||(wn=fetch("/api/datapoints").then(e=>e.ok?e.json():[]).then(e=>{const t={};for(const s of e)t[s.key]=s;return ao=t,t}).catch(()=>(wn=null,{})),wn)}function Tf(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),s=t.match(/^[^.!?]+[.!?]/);return s?s[0].trim():t.slice(0,120)}const Cf={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},Ef={raw:"raw",deduced:"deduced",aggregated:"agg"};function Mf(){const[e,t]=G(null),[s,n]=G({x:0,y:0}),[l,o]=G(!1),a=lt(null),i=lt(null),r=qe(T=>{const y=T.getAttribute("data-dp");y&&Sf().then($=>{const x=$[y];if(!x)return;const w=T.getBoundingClientRect();n({x:w.left,y:w.bottom+4}),t(x),o(!1)})},[]),d=qe(()=>{i.current=setTimeout(()=>{t(null),o(!1)},120)},[]),v=qe(()=>{i.current&&(clearTimeout(i.current),i.current=null)},[]);if(de(()=>{function T(x){const w=x.target.closest("[data-dp]");w&&(v(),r(w))}function y(x){x.target.closest("[data-dp]")&&d()}function $(x){x.target.closest("[data-dp]")&&e&&(x.preventDefault(),o(N=>!N))}return document.addEventListener("mouseover",T,!0),document.addEventListener("mouseout",y,!0),document.addEventListener("click",$,!0),()=>{document.removeEventListener("mouseover",T,!0),document.removeEventListener("mouseout",y,!0),document.removeEventListener("click",$,!0)}},[r,d,v,e]),!e)return null;const m=Math.min(s.x,window.innerWidth-320-8),g=Math.min(s.y,window.innerHeight-180),k=Ef[e.source_type]||e.source_type,M=Cf[e.unit]||e.unit;return c`<div class="dp-tooltip" ref=${a}
    style=${"left:"+m+"px;top:"+g+"px"}
    onMouseEnter=${v} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${k}</span>
      ${M&&c`<span class="dp-tooltip-unit">${M}</span>`}
    </div>
    <div class="dp-tooltip-body">${Tf(e.explanation)}</div>
    ${l&&c`<div class="dp-tooltip-detail">
      <div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Source</div>
        <div>${e.source_static||e.source||"—"}</div>
      </div>
      ${e.source_dynamic&&c`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Live provenance</div>
        <div>${typeof e.source_dynamic=="string"?e.source_dynamic:JSON.stringify(e.source_dynamic)}</div>
      </div>`}
      ${e.query&&c`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Query</div>
        <code class="dp-tooltip-code">${e.query}</code>
      </div>`}
      ${e.otel_metric&&c`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">OTel metric</div>
        <code>${e.otel_metric}</code>
      </div>`}
    </div>`}
    ${!l&&c`<div class="dp-tooltip-hint">click for details</div>`}
  </div>`}function Qs(e,t){try{localStorage.setItem("aictl-pref-"+e,JSON.stringify(t))}catch{}}function io(e,t){try{const s=localStorage.getItem("aictl-pref-"+e);return s!=null?JSON.parse(s):t}catch{return t}}function Kn(e){const t=new Date(e*1e3),s=t.getTimezoneOffset();return new Date(t.getTime()-s*6e4).toISOString().slice(0,16)}const Bi=200,Hi=80,Lf=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Df(e,t){if(!e)return t;const s=Object.fromEntries((t.tools||[]).map(n=>[n.tool,n]));return{...e,...t,tools:e.tools.map(n=>{const l=s[n.tool];return l?{...n,live:l.live,vendor:l.vendor||n.vendor,host:l.host||n.host}:n})}}function Af(e,t){var n,l,o,a;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>Bi)for(const i of Lf)e[i]=e[i].slice(-Bi);const s=e.by_tool||{};for(const i of t.tools||[]){if(i.tool==="aictl")continue;const r=((n=i.live)==null?void 0:n.cpu_percent)||0,d=((l=i.live)==null?void 0:l.mem_mb)||0,v=i.tokens||0,p=(((o=i.live)==null?void 0:o.outbound_rate_bps)||0)+(((a=i.live)==null?void 0:a.inbound_rate_bps)||0);s[i.tool]||(s[i.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const m=s[i.tool];if(m.ts.push(t.timestamp),m.cpu.push(Math.round(r*10)/10),m.mem_mb.push(Math.round(d*10)/10),m.tokens.push(v),m.traffic.push(Math.round(p*100)/100),m.ts.length>Hi)for(const g of Object.keys(m))m[g]=m[g].slice(-Hi)}return{...e,by_tool:s}}const Lo=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],cl={};Lo.forEach(e=>{cl[e.id]=e.seconds});const Of={snap:null,history:null,connected:!1,activeTab:io("active_tab","overview"),globalRange:(()=>{const e=io("range","live"),t=cl[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:io("tool_filter",null)};function Pf(e,t){switch(t.type){case"SSE_UPDATE":{const s=t.payload,n=e.snap?Df(e.snap,s):s,l=Af(e.history,s);return{...e,snap:n,history:l,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const ro=Zs.tabs;function zf({globalRange:e,onPreset:t,onApplyCustom:s}){const[n,l]=G(!1),o=lt(null),a=lt(null),i=qe(()=>{l(!0),requestAnimationFrame(()=>{if(o.current&&a.current)if(e.until!=null)o.current.value=Kn(e.since),a.current.value=Kn(e.until);else{const d=Lo.find(m=>m.id===e.id),v=Date.now()/1e3,p=(d==null?void 0:d.seconds)||86400;o.current.value=Kn(v-p),a.current.value=Kn(v)}})},[e]),r=qe(()=>{var M,T;const d=(M=o.current)==null?void 0:M.value,v=(T=a.current)==null?void 0:T.value;if(!d||!v)return;const p=new Date(d).getTime(),m=new Date(v).getTime();if(!Number.isFinite(p)||!Number.isFinite(m))return;const g=p/1e3,k=m/1e3;k<=g||(s(g,k),l(!1))},[s]);return c`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${Lo.map(d=>c`<button key=${d.id}
        class=${e.id===d.id&&!n?"range-btn active":"range-btn"}
        onClick=${()=>{t(d.id),l(!1)}}>${d.label}</button>`)}
      <button class=${n||e.id==="custom"?"range-btn active":"range-btn"}
        onClick=${i}>Custom</button>
    </div>
    ${n&&c`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${o} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${a} /></label>
      <button class="range-btn active" onClick=${r} style="font-weight:600">Apply</button>
    </div>`}
  </div>`}const tl=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-jetbrains","copilot-vs","copilot365","codex-cli"]);function Rf({snap:e,enabledTools:t,onToggle:s,onSetAll:n}){if(!e)return null;const l=e.tools.filter(a=>!a.meta);if(!l.length)return null;const o=t===null;return t?t.length:l.length,c`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${o}
        onChange=${()=>n(o?[]:null)} />
      <span class="text-muted">All (${l.length})</span>
    </label>
    ${l.sort((a,i)=>a.label.localeCompare(i.label)).map(a=>{const i=tl.has(a.tool),r=t===null||t.includes(a.tool),d=Oe[a.tool]||"var(--fg2)",v=$t[a.tool]||"🔹";return c`<label key=${a.tool} class=${"tool-filter-item"+(i?"":" tool-unverified")}
        title=${i?"":"Not yet verified — discovery only"}>
        <input type="checkbox" checked=${r} disabled=${!i}
          onChange=${()=>i&&s(a.tool)} />
        <span style=${"color:"+d}>${v}</span>
        <span>${a.label}</span>
      </label>`})}
  </div>`}function Ff({mcpDetail:e}){return!e||!e.length?c`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`:c`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{t.status;const s=Vc[t.status]||"var(--fg3)",n=Oe[t.tool]||"var(--fg3)";return c`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${s}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${X(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${n};white-space:nowrap;flex-shrink:0">${X(t.tool)}</span>
      </div>`})}
  </div>`}function If({label:e,value:t,mcpDetail:s}){const[n,l]=G(!1);return c`<div style="position:relative;cursor:default"
    onMouseEnter=${()=>l(!0)}
    onMouseLeave=${()=>l(!1)}>
    <${So} label=${e} value=${t} sm=${!0}/>
    ${n&&c`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      ${s.length>0?c`<${Ff} mcpDetail=${s}/>`:c`<div style="color:var(--fg3);font-size:var(--fs-sm)">None configured</div>`}
    </div>`}
  </div>`}function jf({snap:e,history:t,globalRange:s}){const[n,l]=G(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),o=qe(()=>{l(d=>{const v=!d;try{localStorage.setItem("aictl-header-expanded",String(v))}catch{}return v})},[]),a=d=>!t||!t.ts||t.ts.length<2?null:[t.ts,t[d]],i=(e==null?void 0:e.cpu_cores)||1,r={cores:i};return c`
    <div style=${"display:grid;grid-template-columns:repeat("+Zs.sparklines.length+",1fr);gap:var(--sp-4);margin-bottom:var(--sp-4)"}>
      ${Zs.sparklines.map(d=>{const v=e?e["total_"+d.field]??e[d.field]??"":"",p=Kl(v,d.format,d.suffix,d.multiply),m=d.yMaxExpr?Ba(d.yMaxExpr,r):void 0,g=(d.refLines||[]).map(k=>({value:Ba(k.valueExpr,r),label:(k.label||"").replace("{cores}",i)})).filter(k=>k.value!=null);return c`<${Zt} key=${d.field} label=${d.label} value=${p}
          data=${a(d.field)} chartColor=${d.color||"var(--accent)"}
          smooth=${!!d.smooth} refLines=${g.length?g:void 0} yMax=${m} dp=${d.dp}/>`})}
    </div>

    <div class=${n?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>

      <!-- Row 1: (CPU bars + Live traffic) | Live metric boxes -->
      <div class="mb-sm" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);align-items:start">
        <!-- Left: per-core CPU bars + live traffic bar -->
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${cp} perCore=${(e==null?void 0:e.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${Ei} snap=${e} mode="traffic"/></div>
        </div>
        <!-- Right: 4 live metric boxes in 2×2 grid -->
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${Zs.liveMetrics.map(d=>{const v=e?e[d.field]??"":"",p=Kl(v,d.format,d.suffix,d.multiply);return c`<${So} key=${d.field} label=${d.label} value=${p} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>

      <!-- Row 2: Inventory — full width; MCP box shows hover popover -->
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div style="display:grid;grid-template-columns:repeat(${Zs.inventory.length},1fr);gap:var(--sp-2)">
          ${Zs.inventory.map(d=>{const v=e?e[d.field]??"":"",p=Kl(v,d.format,d.suffix,d.multiply);return d.field==="total_mcp_servers"?c`<${If} key=${d.field} label=${d.label} value=${p} mcpDetail=${(e==null?void 0:e.mcp_detail)||[]}/>`:c`<${So} key=${d.field} label=${d.label} value=${p} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
        </div>
      </div>

      <!-- Row 3: CSV footprint — full width -->
      <div class="mb-sm"><${Ei} snap=${e} mode="files"/></div>

    </div>
    <button class="header-toggle" onClick=${o} aria-label="Toggle details">
      ${n?"▲ less":"▼ more"}
    </button>
  `}function Nf(){var ne;const[e,t]=nr(Pf,Of),{snap:s,history:n,connected:l,activeTab:o,globalRange:a,searchQuery:i,theme:r,viewerPath:d,events:v,enabledTools:p}=e,[m,g]=G(null),k=lt(null);de(()=>{document.documentElement.setAttribute("data-theme",r);try{localStorage.setItem("aictl-theme",r)}catch{}},[r]);const M=qe(()=>{t({type:"SET_THEME",payload:Gl[(Gl.indexOf(r)+1)%Gl.length]})},[r]),T=qe(L=>{const B=L.since,V=L.until!=null?"&until="+L.until:"";L.id==="live"?g(null):L.id!=="custom"?fetch("/api/history?range="+L.id).then(H=>H.json()).then(g).catch(()=>{}):fetch("/api/history?since="+B+V).then(H=>H.json()).then(g).catch(()=>{}),fetch("/api/events?since="+B+V).then(H=>H.json()).then(H=>t({type:"EVENTS_INIT",payload:H})).catch(()=>{})},[]);de(()=>{let L,B=1e3,V=!1,H=!1;fetch("/api/snapshot").then(U=>U.json()).then(U=>t({type:"SNAP_REPLACE",payload:U})).catch(()=>{}),fetch("/api/history").then(U=>U.json()).then(U=>t({type:"HISTORY_INIT",payload:U})).catch(()=>{}),T(a);function le(){V||(L=new EventSource("/api/stream"),L.onmessage=U=>{const Le=JSON.parse(U.data);t({type:"SSE_UPDATE",payload:Le}),B=1e3},L.onerror=()=>{t({type:"SET_CONNECTED",payload:!1}),L.close(),V||setTimeout(le,B),B=Math.min(B*2,3e4)})}le();const oe=setInterval(()=>{V||H||(H=!0,fetch("/api/snapshot").then(U=>U.json()).then(U=>t({type:"SNAP_REPLACE",payload:U})).catch(()=>{}).finally(()=>{H=!1}))},3e4);return()=>{V=!0,L&&L.close(),clearInterval(oe)}},[]);const y=qe(L=>{const B=cl[L]||3600,V={id:L,since:Date.now()/1e3-B,until:null};t({type:"SET_RANGE",payload:V}),Qs("range",L),T(V)},[T]),$=qe((L,B)=>{const V={id:"custom",since:L,until:B};t({type:"SET_RANGE",payload:V}),T(V)},[T]),x=a.id==="live"?n:m||n,w=a.until?a.until-a.since:cl[a.id]||3600;de(()=>{const L=B=>{var V;if(B.key==="Escape"&&t({type:"SET_VIEWER",payload:null}),B.key==="/"&&document.activeElement!==k.current&&(B.preventDefault(),(V=k.current)==null||V.focus()),document.activeElement!==k.current){const H=ro.find(le=>le.key===B.key);H&&(t({type:"SET_TAB",payload:H.id}),Qs("active_tab",H.id))}};return document.addEventListener("keydown",L),()=>document.removeEventListener("keydown",L)},[]);const N=qe(L=>t({type:"SET_VIEWER",payload:L}),[]),A=qe(L=>{if(!tl.has(L))return;const B=s?s.tools.filter(H=>H.tool!=="aictl"&&H.tool!=="any"&&tl.has(H.tool)).map(H=>H.tool):[];let V;p===null?V=B.filter(H=>H!==L):p.indexOf(L)>=0?V=p.filter(le=>le!==L):(V=[...p,L],V.length>=B.length&&(V=null)),t({type:"SET_TOOL_FILTER",payload:V}),Qs("tool_filter",V)},[s,p]),O=qe(L=>{t({type:"SET_TOOL_FILTER",payload:L}),Qs("tool_filter",L)},[]),P=ie(()=>{if(!s)return s;let L=s.tools;if(L=L.filter(B=>tl.has(B.tool)||B.tool==="aictl"),p!==null&&(L=L.filter(B=>p.includes(B.tool)||B.tool==="aictl")),i){const B=i.toLowerCase();L=L.filter(V=>V.label.toLowerCase().includes(B)||V.tool.toLowerCase().includes(B)||V.vendor&&V.vendor.toLowerCase().includes(B)||V.files.some(H=>H.path.toLowerCase().includes(B))||V.processes.some(H=>(H.name||"").toLowerCase().includes(B)||(H.cmdline||"").toLowerCase().includes(B))||V.live&&((V.live.workspaces||[]).some(H=>H.toLowerCase().includes(B))||(V.live.sources||[]).some(H=>H.toLowerCase().includes(B))))}return{...s,tools:L}},[s,i,p]),b=ie(()=>{var V;const L=Date.now()/1e3-300,B=new Map;for(const H of v)if(H.kind==="file_modified"&&H.ts>=L&&((V=H.detail)!=null&&V.path)){const le=B.get(H.detail.path);(!le||H.ts>le.ts)&&B.set(H.detail.path,{ts:H.ts,growth:H.detail.growth_bytes||0,tool:H.tool})}return B},[v]),C=ie(()=>({snap:P,history:n,openViewer:N,recentFiles:b,globalRange:a,rangeSeconds:w,enabledTools:p}),[P,n,N,b,a,w,p]),D={overview:()=>c`
      <${jf} snap=${P} history=${x}
        globalRange=${a}/>
      <div class="mb-lg"><${wf}/></div>
    `,procs:()=>c`
      <div class="mb-lg"><${rp}/></div>
    `,memory:()=>c`
      <div class="mb-lg"><${yf}/></div>
      <div class="mb-lg"><${vp}/></div>
    `,live:()=>c`<div class="mb-lg"><${mp}/></div>`,events:()=>c`<div class="mb-lg"><${hp} key=${"events-"+o}/></div>`,budget:()=>c`<div class="mb-lg"><${gp} key=${"budget-"+o}/></div>`,sessions:()=>c`<div class="mb-lg"><${Np} key=${"sessions-"+o}/></div>`,analytics:()=>c`<div class="mb-lg"><${Zp} key=${"analytics-"+o}/></div>`,flow:()=>c`<div class="mb-lg"><${df} key=${"flow-"+o}/></div>`,config:()=>c`<div class="mb-lg"><${gf}/></div>`},F=qe(L=>{t({type:"SET_TAB",payload:L}),Qs("active_tab",L)},[]);qe(L=>{t({type:"SET_TAB",payload:"sessions"}),Qs("active_tab","sessions"),window.__aictl_selected_session=L.session_id,window.dispatchEvent(new CustomEvent("aictl-session-select",{detail:L}))},[]);const[R,q]=G(!1);de(()=>{let L=!0;const B=()=>fetch("/api/otel-status").then(H=>H.json()).then(H=>{L&&q(H.active||!1)}).catch(()=>{L&&q(!1)});B();const V=setInterval(B,3e4);return()=>{L=!1,clearInterval(V)}},[]);const Y=ie(()=>{if(!s)return[];const L=[];let B=0,V=0,H=0,le=0;for(const oe of s.tools||[])for(const U of oe.processes||[]){const Le=parseFloat(U.mem_mb)||0,Re=(U.process_type||"").toLowerCase();(Re==="subagent"||Re==="agent")&&(B+=Le),Re==="mcp-server"&&U.zombie_risk&&U.zombie_risk!=="none"&&V++,(Re==="browser"||(U.name||"").toLowerCase().includes("headless"))&&H++,U.anomalies&&U.anomalies.length&&(le+=U.anomalies.length)}return B>2048&&L.push({level:"red",msg:`Subagent memory: ${ge(B*1048576)} (>2GB) — consider cleanup`}),V>0&&L.push({level:"orange",msg:`${V} MCP server(s) with dead parent — may be orphaned`}),H>0&&L.push({level:"yellow",msg:`${H} headless browser process(es) detected — check for leaks`}),le>5&&L.push({level:"orange",msg:`${le} process anomalies detected`}),L},[s]);return c`<${Ne.Provider} value=${C}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${k} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${i} onInput=${L=>t({type:"SET_SEARCH",payload:L.target.value})}/>
          <button class="theme-btn" onClick=${M} aria-label="Toggle theme: ${r}"
            title="Theme: ${r}">${Uc[r]}</button>
          ${R&&c`<span class="conn ok" title="OTel receiver active — Claude Code pushing telemetry">OTel</span>`}
          <span class=${"conn "+(l?"ok":"err")} role="status" aria-live="polite">${l?"live":"reconnecting..."}<span class="sr-only">${l?" — connected to server":" — connection lost, attempting to reconnect"}</span></span>
        </div>
      </header>
      ${Y.length>0&&c`<div class="alert-banner" role="alert">
        ${Y.map((L,B)=>c`<div key=${B} class="alert-item" style="color:var(--${L.level})">
          \u26A0 ${L.msg}
        </div>`)}
      </div>`}
      <${zf} globalRange=${a} onPreset=${y} onApplyCustom=${$}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${ro.map(L=>c`<button key=${L.id} class="tab-btn" role="tab"
            aria-selected=${o===L.id} onClick=${()=>F(L.id)}
            title="Shortcut: ${L.key}">${L.icon?L.icon+" ":""}${L.label}</button>`)}
        </nav>
        <${Rf} snap=${s} enabledTools=${p}
          onToggle=${A} onSetAll=${O}/>
        <div id="main-content" role="tabpanel" aria-label=${(ne=ro.find(L=>L.id===o))==null?void 0:ne.label}>
          ${D[o]?D[o]():c`<p class="text-muted">Unknown tab "${o}"</p>`}
        </div>
      </main>
    </div>
    <${ep} path=${d} onClose=${()=>t({type:"SET_VIEWER",payload:null})}/>
    <${Mf}/>
  </${Ne.Provider}>`}Ic(c`<${Nf}/>`,document.getElementById("app"));
