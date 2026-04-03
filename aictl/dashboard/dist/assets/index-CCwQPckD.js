(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const l of o)if(l.type==="childList")for(const a of l.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function s(o){const l={};return o.integrity&&(l.integrity=o.integrity),o.referrerPolicy&&(l.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?l.credentials="include":o.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function n(o){if(o.ep)return;o.ep=!0;const l=s(o);fetch(o.href,l)}})();var ul,Ce,Ji,rs,Oa,Qi,Zi,Xi,zo,fo,vo,er,nl={},ll=[],qc=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,pl=Array.isArray;function Zt(e,t){for(var s in t)e[s]=t[s];return e}function Ro(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function tr(e,t,s){var n,o,l,a={};for(l in t)l=="key"?n=t[l]:l=="ref"?o=t[l]:a[l]=t[l];if(arguments.length>2&&(a.children=arguments.length>3?ul.call(arguments,2):s),typeof e=="function"&&e.defaultProps!=null)for(l in e.defaultProps)a[l]===void 0&&(a[l]=e.defaultProps[l]);return Qn(e,a,n,o,null)}function Qn(e,t,s,n,o){var l={type:e,props:t,key:s,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:o??++Ji,__i:-1,__u:0};return o==null&&Ce.vnode!=null&&Ce.vnode(l),l}function fl(e){return e.children}function Zn(e,t){this.props=e,this.context=t}function on(e,t){if(t==null)return e.__?on(e.__,e.__i+1):null;for(var s;t<e.__k.length;t++)if((s=e.__k[t])!=null&&s.__e!=null)return s.__e;return typeof e.type=="function"?on(e):null}function Vc(e){if(e.__P&&e.__d){var t=e.__v,s=t.__e,n=[],o=[],l=Zt({},t);l.__v=t.__v+1,Ce.vnode&&Ce.vnode(l),Io(e.__P,l,t,e.__n,e.__P.namespaceURI,32&t.__u?[s]:null,n,s??on(t),!!(32&t.__u),o),l.__v=t.__v,l.__.__k[l.__i]=l,or(n,l,o),t.__e=t.__=null,l.__e!=s&&sr(l)}}function sr(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),sr(e)}function mo(e){(!e.__d&&(e.__d=!0)&&rs.push(e)&&!ol.__r++||Oa!=Ce.debounceRendering)&&((Oa=Ce.debounceRendering)||Qi)(ol)}function ol(){try{for(var e,t=1;rs.length;)rs.length>t&&rs.sort(Zi),e=rs.shift(),t=rs.length,Vc(e)}finally{rs.length=ol.__r=0}}function nr(e,t,s,n,o,l,a,i,c,d,v){var p,m,g,x,L,T,y,$=n&&n.__k||ll,k=t.length;for(c=Uc(s,t,$,c,k),p=0;p<k;p++)(g=s.__k[p])!=null&&(m=g.__i!=-1&&$[g.__i]||nl,g.__i=p,T=Io(e,g,m,o,l,a,i,c,d,v),x=g.__e,g.ref&&m.ref!=g.ref&&(m.ref&&Fo(m.ref,null,g),v.push(g.ref,g.__c||x,g)),L==null&&x!=null&&(L=x),(y=!!(4&g.__u))||m.__k===g.__k?c=lr(g,c,e,y):typeof g.type=="function"&&T!==void 0?c=T:x&&(c=x.nextSibling),g.__u&=-7);return s.__e=L,c}function Uc(e,t,s,n,o){var l,a,i,c,d,v=s.length,p=v,m=0;for(e.__k=new Array(o),l=0;l<o;l++)(a=t[l])!=null&&typeof a!="boolean"&&typeof a!="function"?(typeof a=="string"||typeof a=="number"||typeof a=="bigint"||a.constructor==String?a=e.__k[l]=Qn(null,a,null,null,null):pl(a)?a=e.__k[l]=Qn(fl,{children:a},null,null,null):a.constructor===void 0&&a.__b>0?a=e.__k[l]=Qn(a.type,a.props,a.key,a.ref?a.ref:null,a.__v):e.__k[l]=a,c=l+m,a.__=e,a.__b=e.__b+1,i=null,(d=a.__i=Gc(a,s,c,p))!=-1&&(p--,(i=s[d])&&(i.__u|=2)),i==null||i.__v==null?(d==-1&&(o>v?m--:o<v&&m++),typeof a.type!="function"&&(a.__u|=4)):d!=c&&(d==c-1?m--:d==c+1?m++:(d>c?m--:m++,a.__u|=4))):e.__k[l]=null;if(p)for(l=0;l<v;l++)(i=s[l])!=null&&!(2&i.__u)&&(i.__e==n&&(n=on(i)),ir(i,i));return n}function lr(e,t,s,n){var o,l;if(typeof e.type=="function"){for(o=e.__k,l=0;o&&l<o.length;l++)o[l]&&(o[l].__=e,t=lr(o[l],t,s,n));return t}e.__e!=t&&(n&&(t&&e.type&&!t.parentNode&&(t=on(e)),s.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function Gc(e,t,s,n){var o,l,a,i=e.key,c=e.type,d=t[s],v=d!=null&&(2&d.__u)==0;if(d===null&&i==null||v&&i==d.key&&c==d.type)return s;if(n>(v?1:0)){for(o=s-1,l=s+1;o>=0||l<t.length;)if((d=t[a=o>=0?o--:l++])!=null&&!(2&d.__u)&&i==d.key&&c==d.type)return a}return-1}function Pa(e,t,s){t[0]=="-"?e.setProperty(t,s??""):e[t]=s==null?"":typeof s!="number"||qc.test(t)?s:s+"px"}function Wn(e,t,s,n,o){var l,a;e:if(t=="style")if(typeof s=="string")e.style.cssText=s;else{if(typeof n=="string"&&(e.style.cssText=n=""),n)for(t in n)s&&t in s||Pa(e.style,t,"");if(s)for(t in s)n&&s[t]==n[t]||Pa(e.style,t,s[t])}else if(t[0]=="o"&&t[1]=="n")l=t!=(t=t.replace(Xi,"$1")),a=t.toLowerCase(),t=a in e||t=="onFocusOut"||t=="onFocusIn"?a.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+l]=s,s?n?s.u=n.u:(s.u=zo,e.addEventListener(t,l?vo:fo,l)):e.removeEventListener(t,l?vo:fo,l);else{if(o=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=s??"";break e}catch{}typeof s=="function"||(s==null||s===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&s==1?"":s))}}function za(e){return function(t){if(this.l){var s=this.l[t.type+e];if(t.t==null)t.t=zo++;else if(t.t<s.u)return;return s(Ce.event?Ce.event(t):t)}}}function Io(e,t,s,n,o,l,a,i,c,d){var v,p,m,g,x,L,T,y,$,k,S,H,D,O,P,b=t.type;if(t.constructor!==void 0)return null;128&s.__u&&(c=!!(32&s.__u),l=[i=t.__e=s.__e]),(v=Ce.__b)&&v(t);e:if(typeof b=="function")try{if(y=t.props,$=b.prototype&&b.prototype.render,k=(v=b.contextType)&&n[v.__c],S=v?k?k.props.value:v.__:n,s.__c?T=(p=t.__c=s.__c).__=p.__E:($?t.__c=p=new b(y,S):(t.__c=p=new Zn(y,S),p.constructor=b,p.render=Kc),k&&k.sub(p),p.state||(p.state={}),p.__n=n,m=p.__d=!0,p.__h=[],p._sb=[]),$&&p.__s==null&&(p.__s=p.state),$&&b.getDerivedStateFromProps!=null&&(p.__s==p.state&&(p.__s=Zt({},p.__s)),Zt(p.__s,b.getDerivedStateFromProps(y,p.__s))),g=p.props,x=p.state,p.__v=t,m)$&&b.getDerivedStateFromProps==null&&p.componentWillMount!=null&&p.componentWillMount(),$&&p.componentDidMount!=null&&p.__h.push(p.componentDidMount);else{if($&&b.getDerivedStateFromProps==null&&y!==g&&p.componentWillReceiveProps!=null&&p.componentWillReceiveProps(y,S),t.__v==s.__v||!p.__e&&p.shouldComponentUpdate!=null&&p.shouldComponentUpdate(y,p.__s,S)===!1){t.__v!=s.__v&&(p.props=y,p.state=p.__s,p.__d=!1),t.__e=s.__e,t.__k=s.__k,t.__k.some(function(C){C&&(C.__=t)}),ll.push.apply(p.__h,p._sb),p._sb=[],p.__h.length&&a.push(p);break e}p.componentWillUpdate!=null&&p.componentWillUpdate(y,p.__s,S),$&&p.componentDidUpdate!=null&&p.__h.push(function(){p.componentDidUpdate(g,x,L)})}if(p.context=S,p.props=y,p.__P=e,p.__e=!1,H=Ce.__r,D=0,$)p.state=p.__s,p.__d=!1,H&&H(t),v=p.render(p.props,p.state,p.context),ll.push.apply(p.__h,p._sb),p._sb=[];else do p.__d=!1,H&&H(t),v=p.render(p.props,p.state,p.context),p.state=p.__s;while(p.__d&&++D<25);p.state=p.__s,p.getChildContext!=null&&(n=Zt(Zt({},n),p.getChildContext())),$&&!m&&p.getSnapshotBeforeUpdate!=null&&(L=p.getSnapshotBeforeUpdate(g,x)),O=v!=null&&v.type===fl&&v.key==null?ar(v.props.children):v,i=nr(e,pl(O)?O:[O],t,s,n,o,l,a,i,c,d),p.base=t.__e,t.__u&=-161,p.__h.length&&a.push(p),T&&(p.__E=p.__=null)}catch(C){if(t.__v=null,c||l!=null)if(C.then){for(t.__u|=c?160:128;i&&i.nodeType==8&&i.nextSibling;)i=i.nextSibling;l[l.indexOf(i)]=null,t.__e=i}else{for(P=l.length;P--;)Ro(l[P]);ho(t)}else t.__e=s.__e,t.__k=s.__k,C.then||ho(t);Ce.__e(C,t,s)}else l==null&&t.__v==s.__v?(t.__k=s.__k,t.__e=s.__e):i=t.__e=Yc(s.__e,t,s,n,o,l,a,c,d);return(v=Ce.diffed)&&v(t),128&t.__u?void 0:i}function ho(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(ho))}function or(e,t,s){for(var n=0;n<s.length;n++)Fo(s[n],s[++n],s[++n]);Ce.__c&&Ce.__c(t,e),e.some(function(o){try{e=o.__h,o.__h=[],e.some(function(l){l.call(o)})}catch(l){Ce.__e(l,o.__v)}})}function ar(e){return typeof e!="object"||e==null||e.__b>0?e:pl(e)?e.map(ar):Zt({},e)}function Yc(e,t,s,n,o,l,a,i,c){var d,v,p,m,g,x,L,T=s.props||nl,y=t.props,$=t.type;if($=="svg"?o="http://www.w3.org/2000/svg":$=="math"?o="http://www.w3.org/1998/Math/MathML":o||(o="http://www.w3.org/1999/xhtml"),l!=null){for(d=0;d<l.length;d++)if((g=l[d])&&"setAttribute"in g==!!$&&($?g.localName==$:g.nodeType==3)){e=g,l[d]=null;break}}if(e==null){if($==null)return document.createTextNode(y);e=document.createElementNS(o,$,y.is&&y),i&&(Ce.__m&&Ce.__m(t,l),i=!1),l=null}if($==null)T===y||i&&e.data==y||(e.data=y);else{if(l=l&&ul.call(e.childNodes),!i&&l!=null)for(T={},d=0;d<e.attributes.length;d++)T[(g=e.attributes[d]).name]=g.value;for(d in T)g=T[d],d=="dangerouslySetInnerHTML"?p=g:d=="children"||d in y||d=="value"&&"defaultValue"in y||d=="checked"&&"defaultChecked"in y||Wn(e,d,null,g,o);for(d in y)g=y[d],d=="children"?m=g:d=="dangerouslySetInnerHTML"?v=g:d=="value"?x=g:d=="checked"?L=g:i&&typeof g!="function"||T[d]===g||Wn(e,d,g,T[d],o);if(v)i||p&&(v.__html==p.__html||v.__html==e.innerHTML)||(e.innerHTML=v.__html),t.__k=[];else if(p&&(e.innerHTML=""),nr(t.type=="template"?e.content:e,pl(m)?m:[m],t,s,n,$=="foreignObject"?"http://www.w3.org/1999/xhtml":o,l,a,l?l[0]:s.__k&&on(s,0),i,c),l!=null)for(d=l.length;d--;)Ro(l[d]);i||(d="value",$=="progress"&&x==null?e.removeAttribute("value"):x!=null&&(x!==e[d]||$=="progress"&&!x||$=="option"&&x!=T[d])&&Wn(e,d,x,T[d],o),d="checked",L!=null&&L!=e[d]&&Wn(e,d,L,T[d],o))}return e}function Fo(e,t,s){try{if(typeof e=="function"){var n=typeof e.__u=="function";n&&e.__u(),n&&t==null||(e.__u=e(t))}else e.current=t}catch(o){Ce.__e(o,s)}}function ir(e,t,s){var n,o;if(Ce.unmount&&Ce.unmount(e),(n=e.ref)&&(n.current&&n.current!=e.__e||Fo(n,null,t)),(n=e.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(l){Ce.__e(l,t)}n.base=n.__P=null}if(n=e.__k)for(o=0;o<n.length;o++)n[o]&&ir(n[o],t,s||typeof e.type!="function");s||Ro(e.__e),e.__c=e.__=e.__e=void 0}function Kc(e,t,s){return this.constructor(e,s)}function Jc(e,t,s){var n,o,l,a;t==document&&(t=document.documentElement),Ce.__&&Ce.__(e,t),o=(n=!1)?null:t.__k,l=[],a=[],Io(t,e=t.__k=tr(fl,null,[e]),o||nl,nl,t.namespaceURI,o?null:t.firstChild?ul.call(t.childNodes):null,l,o?o.__e:t.firstChild,n,a),or(l,e,a)}function Qc(e){function t(s){var n,o;return this.getChildContext||(n=new Set,(o={})[t.__c]=this,this.getChildContext=function(){return o},this.componentWillUnmount=function(){n=null},this.shouldComponentUpdate=function(l){this.props.value!=l.value&&n.forEach(function(a){a.__e=!0,mo(a)})},this.sub=function(l){n.add(l);var a=l.componentWillUnmount;l.componentWillUnmount=function(){n&&n.delete(l),a&&a.call(l)}}),s.children}return t.__c="__cC"+er++,t.__=e,t.Provider=t.__l=(t.Consumer=function(s,n){return s.children(n)}).contextType=t,t}ul=ll.slice,Ce={__e:function(e,t,s,n){for(var o,l,a;t=t.__;)if((o=t.__c)&&!o.__)try{if((l=o.constructor)&&l.getDerivedStateFromError!=null&&(o.setState(l.getDerivedStateFromError(e)),a=o.__d),o.componentDidCatch!=null&&(o.componentDidCatch(e,n||{}),a=o.__d),a)return o.__E=o}catch(i){e=i}throw e}},Ji=0,Zn.prototype.setState=function(e,t){var s;s=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=Zt({},this.state),typeof e=="function"&&(e=e(Zt({},s),this.props)),e&&Zt(s,e),e!=null&&this.__v&&(t&&this._sb.push(t),mo(this))},Zn.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),mo(this))},Zn.prototype.render=fl,rs=[],Qi=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,Zi=function(e,t){return e.__v.__b-t.__v.__b},ol.__r=0,Xi=/(PointerCapture)$|Capture$/i,zo=0,fo=za(!1),vo=za(!0),er=0;var rr=function(e,t,s,n){var o;t[0]=0;for(var l=1;l<t.length;l++){var a=t[l++],i=t[l]?(t[0]|=a?1:2,s[t[l++]]):t[++l];a===3?n[0]=i:a===4?n[1]=Object.assign(n[1]||{},i):a===5?(n[1]=n[1]||{})[t[++l]]=i:a===6?n[1][t[++l]]+=i+"":a?(o=e.apply(i,rr(e,i,s,["",null])),n.push(o),i[0]?t[0]|=2:(t[l-2]=0,t[l]=o)):n.push(i)}return n},Ra=new Map;function Zc(e){var t=Ra.get(this);return t||(t=new Map,Ra.set(this,t)),(t=rr(this,t.get(e)||(t.set(e,t=function(s){for(var n,o,l=1,a="",i="",c=[0],d=function(m){l===1&&(m||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?c.push(0,m,a):l===3&&(m||a)?(c.push(3,m,a),l=2):l===2&&a==="..."&&m?c.push(4,m,0):l===2&&a&&!m?c.push(5,0,!0,a):l>=5&&((a||!m&&l===5)&&(c.push(l,0,a,o),l=6),m&&(c.push(l,m,0,o),l=6)),a=""},v=0;v<s.length;v++){v&&(l===1&&d(),d(v));for(var p=0;p<s[v].length;p++)n=s[v][p],l===1?n==="<"?(d(),c=[c],l=3):a+=n:l===4?a==="--"&&n===">"?(l=1,a=""):a=n+a[0]:i?n===i?i="":a+=n:n==='"'||n==="'"?i=n:n===">"?(d(),l=1):l&&(n==="="?(l=5,o=a,a=""):n==="/"&&(l<5||s[v][p+1]===">")?(d(),l===3&&(c=c[0]),l=c,(c=c[0]).push(2,0,l),l=0):n===" "||n==="	"||n===`
`||n==="\r"?(d(),l=2):a+=n),l===3&&a==="!--"&&(l=4,c=c[0])}return d(),c}(e)),t),arguments,[])).length>1?t:t[0]}var r=Zc.bind(tr),an,Ae,Yl,Ia,Dn=0,cr=[],Be=Ce,Fa=Be.__b,Na=Be.__r,ja=Be.diffed,Ba=Be.__c,Ha=Be.unmount,Wa=Be.__;function vl(e,t){Be.__h&&Be.__h(Ae,e,Dn||t),Dn=0;var s=Ae.__H||(Ae.__H={__:[],__h:[]});return e>=s.__.length&&s.__.push({}),s.__[e]}function V(e){return Dn=1,dr(pr,e)}function dr(e,t,s){var n=vl(an++,2);if(n.t=e,!n.__c&&(n.__=[pr(void 0,t),function(i){var c=n.__N?n.__N[0]:n.__[0],d=n.t(c,i);c!==d&&(n.__N=[d,n.__[1]],n.__c.setState({}))}],n.__c=Ae,!Ae.__f)){var o=function(i,c,d){if(!n.__c.__H)return!0;var v=n.__c.__H.__.filter(function(m){return m.__c});if(v.every(function(m){return!m.__N}))return!l||l.call(this,i,c,d);var p=n.__c.props!==i;return v.some(function(m){if(m.__N){var g=m.__[0];m.__=m.__N,m.__N=void 0,g!==m.__[0]&&(p=!0)}}),l&&l.call(this,i,c,d)||p};Ae.__f=!0;var l=Ae.shouldComponentUpdate,a=Ae.componentWillUpdate;Ae.componentWillUpdate=function(i,c,d){if(this.__e){var v=l;l=void 0,o(i,c,d),l=v}a&&a.call(this,i,c,d)},Ae.shouldComponentUpdate=o}return n.__N||n.__}function ie(e,t){var s=vl(an++,3);!Be.__s&&ur(s.__H,t)&&(s.__=e,s.u=t,Ae.__H.__h.push(s))}function ot(e){return Dn=5,re(function(){return{current:e}},[])}function re(e,t){var s=vl(an++,7);return ur(s.__H,t)&&(s.__=e(),s.__H=t,s.__h=e),s.__}function Re(e,t){return Dn=8,re(function(){return e},t)}function Ge(e){var t=Ae.context[e.__c],s=vl(an++,9);return s.c=e,t?(s.__==null&&(s.__=!0,t.sub(Ae)),t.props.value):e.__}function Xc(){for(var e;e=cr.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(Xn),t.__h.some(go),t.__h=[]}catch(s){t.__h=[],Be.__e(s,e.__v)}}}Be.__b=function(e){Ae=null,Fa&&Fa(e)},Be.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),Wa&&Wa(e,t)},Be.__r=function(e){Na&&Na(e),an=0;var t=(Ae=e.__c).__H;t&&(Yl===Ae?(t.__h=[],Ae.__h=[],t.__.some(function(s){s.__N&&(s.__=s.__N),s.u=s.__N=void 0})):(t.__h.some(Xn),t.__h.some(go),t.__h=[],an=0)),Yl=Ae},Be.diffed=function(e){ja&&ja(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(cr.push(t)!==1&&Ia===Be.requestAnimationFrame||((Ia=Be.requestAnimationFrame)||ed)(Xc)),t.__H.__.some(function(s){s.u&&(s.__H=s.u),s.u=void 0})),Yl=Ae=null},Be.__c=function(e,t){t.some(function(s){try{s.__h.some(Xn),s.__h=s.__h.filter(function(n){return!n.__||go(n)})}catch(n){t.some(function(o){o.__h&&(o.__h=[])}),t=[],Be.__e(n,s.__v)}}),Ba&&Ba(e,t)},Be.unmount=function(e){Ha&&Ha(e);var t,s=e.__c;s&&s.__H&&(s.__H.__.some(function(n){try{Xn(n)}catch(o){t=o}}),s.__H=void 0,t&&Be.__e(t,s.__v))};var qa=typeof requestAnimationFrame=="function";function ed(e){var t,s=function(){clearTimeout(n),qa&&cancelAnimationFrame(t),setTimeout(e)},n=setTimeout(s,35);qa&&(t=requestAnimationFrame(s))}function Xn(e){var t=Ae,s=e.__c;typeof s=="function"&&(e.__c=void 0,s()),Ae=t}function go(e){var t=Ae;e.__c=e.__(),Ae=t}function ur(e,t){return!e||e.length!==t.length||t.some(function(s,n){return s!==e[n]})}function pr(e,t){return typeof t=="function"?t(e):t}const Ie=Qc(null);let td="";function Fe(e){return td+e}async function Va(){return(await fetch(Fe("/api/snapshot"))).json()}async function Mn(e={}){let t="/api/history";const s=[];return e.range&&s.push("range="+e.range),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.tool&&s.push("tool="+encodeURIComponent(e.tool)),s.length&&(t+="?"+s.join("&")),(await fetch(Fe(t))).json()}async function No(e={}){let t="/api/events";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.sessionId&&s.push("session_id="+encodeURIComponent(e.sessionId)),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(Fe(t))).json()}async function fr(e={}){let t="/api/sessions";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.active!=null&&s.push("active="+e.active),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(Fe(t))).json()}async function vr(e,t,s){let n=`/api/session-flow?session_id=${encodeURIComponent(e)}&since=${t}&until=${s}`;return(await fetch(Fe(n))).json()}async function jo(e,t={}){let s="/api/session-timeline";const n=[];return t.since!=null&&n.push("since="+t.since),t.until!=null&&n.push("until="+t.until),n.length&&(s+="?"+n.join("&")),(await fetch(Fe(s))).json()}async function sd(e,t,s=30,n=20){const o=`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=${s}&limit=${n}`;return(await fetch(Fe(o))).json()}async function nd(e){return(await fetch(Fe("/api/agent-teams?session_id="+encodeURIComponent(e)))).json()}async function ld(e){return(await fetch(Fe("/api/transcript/"+encodeURIComponent(e)))).json()}async function od(e,t={}){return(await fetch(Fe(e),t)).json()}async function ad(e=7){return(await fetch(Fe("/api/project-costs?days="+e))).json()}async function id(e,t=100){return(await fetch(Fe(`/api/api-calls?since=${e}&limit=${t}`))).json()}async function rd(){return(await fetch(Fe("/api/budget"))).json()}async function cd(e,t={}){return fetch(Fe("/api/file?path="+encodeURIComponent(e)),{headers:t})}async function dd(){return(await fetch(Fe("/api/samples?list=1"))).json()}async function ud(e,t){return(await fetch(Fe("/api/samples?series="+encodeURIComponent(e)+"&since="+t))).json()}async function pd(e,t){return(await fetch(Fe("/api/samples?metric="+encodeURIComponent(e)+"&since="+t))).json()}async function mr(){return(await fetch(Fe("/api/otel-status"))).json()}async function fd(){return(await fetch(Fe("/api/self-status"))).json()}let Kl=null;async function vd(){return Kl||(Kl=fetch(Fe("/api/datapoints")).then(e=>e.json())),Kl}function md(){return Fe("/api/stream")}const Oe=window.COLORS??{},bt=window.ICONS??{},hr=window.VENDOR_LABELS??{},hd=window.VENDOR_COLORS??{},gd=window.HOST_LABELS??{},Ua=window.TOOL_RELATIONSHIPS??{},_d={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},Jl=["auto","dark","light"],$d={auto:"☾",dark:"☾",light:"☀"},nn=5,Ks=15,bd={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},Ga=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],yd={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},xd=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],al=new Map,kd=6e4;function gr(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function ml(e,t,s,n=1){for(let o=t.length-1;o>=0;o--){const[l,a]=t[o],i=e/l;if(i>=n)return gr(i)+a}return Math.round(e)+s}const wd=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],Sd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],Td=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function z(e){return ml(e,Sd,"")}function Ve(e){return ml(e,Td,"")}function ge(e){return ml(e,wd,"B")}function Ft(e){return!e||e<=0?"0B/s":ml(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function _e(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function Q(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function Bo(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function _r(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Cs(e){return e&&e.replace(/\\/g,"/")}function Ql(e,t){const s=Cs(e),n=Cs(t);return s.startsWith(n+"/")?"project":s.includes("/.claude/projects/")?"shadow":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")||s.includes("/.copilot/")||s.includes("/.vscode/")?"global":"external"}function Cd(e,t){const s=Cs(e),n=Cs(t);if(s.startsWith(n+"/")){const l=s.slice(n.length+1),a=l.split("/");return a.pop(),a.length?a.join("/"):"(root)"}const o=s.split("/");o.pop();for(let l=o.length-1;l>=0;l--)if(o[l].startsWith(".")&&o[l].length>1&&o[l]!==".."||o[l]==="Library"||o[l]==="AppData")return"~/"+o.slice(l).join("/");return o.slice(-2).join("/")}function Md(e,t){const s={};e.forEach(o=>{const l=Ql(o.path,t),a=Cd(o.path,t),i=l==="project"?a:l+": "+a;(s[i]=s[i]||[]).push(o)});const n={project:0,global:1,shadow:2,external:3};return Object.entries(s).sort((o,l)=>{const a=o[1][0]?Ql(o[1][0].path,t):"z",i=l[1][0]?Ql(l[1][0].path,t):"z";return(n[a]||9)-(n[i]||9)})}function Ed(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let s=2;s<e.length;s++)t.push((e[s-2]+e[s-1]+e[s])/3);return t}async function Ho(e){const t=al.get(e);if(t&&Date.now()-t.ts<kd)return t.content;const s={};t&&t.etag&&(s["If-None-Match"]=t.etag);const n=await cd(e,s);if(n.status===304&&t)return t.ts=Date.now(),t.content;if(!n.ok)throw new Error(n.statusText);const o=await n.text(),l=n.headers.get("ETag")||null;return al.set(e,{content:o,ts:Date.now(),etag:l}),o}function Nt(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function $r(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function Zl(e,t,s,n){if(e==null||e==="")return"";let o=typeof e=="number"?e:parseFloat(e)||0;n&&(o*=n);let l;switch(t){case"size":l=ge(o);break;case"rate":l=Ft(o);break;case"kilo":l=z(o);break;case"percent":l=_e(o);break;case"pct":l=_e(o);break;case"raw":default:l=Number.isInteger(o)?String(o):gr(o)}return s?l+s:l}function Ya(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const Xs={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],tabs:[{id:"overview",label:"Dashboard",icon:"📊",key:"1"},{id:"procs",label:"Processes",icon:"⚙️",key:"2"},{id:"memory",label:"AI Context",icon:"📝",key:"3"},{id:"live",label:"Live Monitor",icon:"📡",key:"4"},{id:"events",label:"Events & Stats",icon:"📈",key:"5"},{id:"budget",label:"Token Budget",icon:"💰",key:"6"},{id:"sessions",label:"Sessions",icon:"🔄",key:"7"},{id:"analytics",label:"Analytics",icon:"🔬",key:"8"},{id:"flow",label:"Session Flow",icon:"🔀",key:"9"},{id:"transcript",label:"Transcript",icon:"📜",key:"t"},{id:"config",label:"Configuration",icon:"⚙️",key:"0"}]},Ka=200,Ja=80,Ld=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Dd(e,t){if(!e)return t;const s=Object.fromEntries((t.tools||[]).map(n=>[n.tool,n]));return{...e,...t,tools:e.tools.map(n=>{const o=s[n.tool];return o?{...n,live:o.live,vendor:o.vendor||n.vendor,host:o.host||n.host}:n})}}function Ad(e,t){var n,o,l,a;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>Ka)for(const i of Ld)e[i]=e[i].slice(-Ka);const s=e.by_tool||{};for(const i of t.tools||[]){if(i.tool==="aictl")continue;const c=((n=i.live)==null?void 0:n.cpu_percent)||0,d=((o=i.live)==null?void 0:o.mem_mb)||0,v=i.tokens||0,p=(((l=i.live)==null?void 0:l.outbound_rate_bps)||0)+(((a=i.live)==null?void 0:a.inbound_rate_bps)||0);s[i.tool]||(s[i.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const m=s[i.tool];if(m.ts.push(t.timestamp),m.cpu.push(Math.round(c*10)/10),m.mem_mb.push(Math.round(d*10)/10),m.tokens.push(v),m.traffic.push(Math.round(p*100)/100),m.ts.length>Ja)for(const g of Object.keys(m))m[g]=m[g].slice(-Ja)}return{...e,by_tool:s}}const Od=!0,Ye="u-",Pd="uplot",zd=Ye+"hz",Rd=Ye+"vt",Id=Ye+"title",Fd=Ye+"wrap",Nd=Ye+"under",jd=Ye+"over",Bd=Ye+"axis",Ss=Ye+"off",Hd=Ye+"select",Wd=Ye+"cursor-x",qd=Ye+"cursor-y",Vd=Ye+"cursor-pt",Ud=Ye+"legend",Gd=Ye+"live",Yd=Ye+"inline",Kd=Ye+"series",Jd=Ye+"marker",Qa=Ye+"label",Qd=Ye+"value",Sn="width",Tn="height",kn="top",Za="bottom",Js="left",Xl="right",Wo="#000",Xa=Wo+"0",eo="mousemove",ei="mousedown",to="mouseup",ti="mouseenter",si="mouseleave",ni="dblclick",Zd="resize",Xd="scroll",li="change",il="dppxchange",qo="--",pn=typeof window<"u",_o=pn?document:null,ln=pn?window:null,eu=pn?navigator:null;let me,qn;function $o(){let e=devicePixelRatio;me!=e&&(me=e,qn&&yo(li,qn,$o),qn=matchMedia(`(min-resolution: ${me-.001}dppx) and (max-resolution: ${me+.001}dppx)`),Ts(li,qn,$o),ln.dispatchEvent(new CustomEvent(il)))}function _t(e,t){if(t!=null){let s=e.classList;!s.contains(t)&&s.add(t)}}function bo(e,t){let s=e.classList;s.contains(t)&&s.remove(t)}function Te(e,t,s){e.style[t]=s+"px"}function zt(e,t,s,n){let o=_o.createElement(e);return t!=null&&_t(o,t),s!=null&&s.insertBefore(o,n),o}function Mt(e,t){return zt("div",e,t)}const oi=new WeakMap;function Gt(e,t,s,n,o){let l="translate("+t+"px,"+s+"px)",a=oi.get(e);l!=a&&(e.style.transform=l,oi.set(e,l),t<0||s<0||t>n||s>o?_t(e,Ss):bo(e,Ss))}const ai=new WeakMap;function ii(e,t,s){let n=t+s,o=ai.get(e);n!=o&&(ai.set(e,n),e.style.background=t,e.style.borderColor=s)}const ri=new WeakMap;function ci(e,t,s,n){let o=t+""+s,l=ri.get(e);o!=l&&(ri.set(e,o),e.style.height=s+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-s/2+"px":0)}const Vo={passive:!0},tu={...Vo,capture:!0};function Ts(e,t,s,n){t.addEventListener(e,s,n?tu:Vo)}function yo(e,t,s,n){t.removeEventListener(e,s,Vo)}pn&&$o();function Rt(e,t,s,n){let o;s=s||0,n=n||t.length-1;let l=n<=2147483647;for(;n-s>1;)o=l?s+n>>1:$t((s+n)/2),t[o]<e?s=o:n=o;return e-t[s]<=t[n]-e?s:n}function br(e){return(s,n,o)=>{let l=-1,a=-1;for(let i=n;i<=o;i++)if(e(s[i])){l=i;break}for(let i=o;i>=n;i--)if(e(s[i])){a=i;break}return[l,a]}}const yr=e=>e!=null,xr=e=>e!=null&&e>0,hl=br(yr),su=br(xr);function nu(e,t,s,n=0,o=!1){let l=o?su:hl,a=o?xr:yr;[t,s]=l(e,t,s);let i=e[t],c=e[t];if(t>-1)if(n==1)i=e[t],c=e[s];else if(n==-1)i=e[s],c=e[t];else for(let d=t;d<=s;d++){let v=e[d];a(v)&&(v<i?i=v:v>c&&(c=v))}return[i??be,c??-be]}function gl(e,t,s,n){let o=pi(e),l=pi(t);e==t&&(o==-1?(e*=s,t/=s):(e/=s,t*=s));let a=s==10?es:kr,i=o==1?$t:Et,c=l==1?Et:$t,d=i(a(Ue(e))),v=c(a(Ue(t))),p=rn(s,d),m=rn(s,v);return s==10&&(d<0&&(p=ye(p,-d)),v<0&&(m=ye(m,-v))),n||s==2?(e=p*o,t=m*l):(e=Cr(e,p),t=_l(t,m)),[e,t]}function Uo(e,t,s,n){let o=gl(e,t,s,n);return e==0&&(o[0]=0),t==0&&(o[1]=0),o}const Go=.1,di={mode:3,pad:Go},En={pad:0,soft:null,mode:0},lu={min:En,max:En};function rl(e,t,s,n){return $l(s)?ui(e,t,s):(En.pad=s,En.soft=n?0:null,En.mode=n?3:0,ui(e,t,lu))}function fe(e,t){return e??t}function ou(e,t,s){for(t=fe(t,0),s=fe(s,e.length-1);t<=s;){if(e[t]!=null)return!0;t++}return!1}function ui(e,t,s){let n=s.min,o=s.max,l=fe(n.pad,0),a=fe(o.pad,0),i=fe(n.hard,-be),c=fe(o.hard,be),d=fe(n.soft,be),v=fe(o.soft,-be),p=fe(n.mode,0),m=fe(o.mode,0),g=t-e,x=es(g),L=dt(Ue(e),Ue(t)),T=es(L),y=Ue(T-x);(g<1e-24||y>10)&&(g=0,(e==0||t==0)&&(g=1e-24,p==2&&d!=be&&(l=0),m==2&&v!=-be&&(a=0)));let $=g||L||1e3,k=es($),S=rn(10,$t(k)),H=$*(g==0?e==0?.1:1:l),D=ye(Cr(e-H,S/10),24),O=e>=d&&(p==1||p==3&&D<=d||p==2&&D>=d)?d:be,P=dt(i,D<O&&e>=O?O:It(O,D)),b=$*(g==0?t==0?.1:1:a),C=ye(_l(t+b,S/10),24),A=t<=v&&(m==1||m==3&&C>=v||m==2&&C<=v)?v:-be,R=It(c,C>A&&t<=A?A:dt(A,C));return P==R&&P==0&&(R=100),[P,R]}const au=new Intl.NumberFormat(pn?eu.language:"en-US"),Yo=e=>au.format(e),yt=Math,el=yt.PI,Ue=yt.abs,$t=yt.floor,qe=yt.round,Et=yt.ceil,It=yt.min,dt=yt.max,rn=yt.pow,pi=yt.sign,es=yt.log10,kr=yt.log2,iu=(e,t=1)=>yt.sinh(e)*t,so=(e,t=1)=>yt.asinh(e/t),be=1/0;function fi(e){return(es((e^e>>31)-(e>>31))|0)+1}function xo(e,t,s){return It(dt(e,t),s)}function wr(e){return typeof e=="function"}function de(e){return wr(e)?e:()=>e}const ru=()=>{},Sr=e=>e,Tr=(e,t)=>t,cu=e=>null,vi=e=>!0,mi=(e,t)=>e==t,du=/\.\d*?(?=9{6,}|0{6,})/gm,Ms=e=>{if(Er(e)||ps.has(e))return e;const t=`${e}`,s=t.match(du);if(s==null)return e;let n=s[0].length-1;if(t.indexOf("e-")!=-1){let[o,l]=t.split("e");return+`${Ms(o)}e${l}`}return ye(e,n)};function ks(e,t){return Ms(ye(Ms(e/t))*t)}function _l(e,t){return Ms(Et(Ms(e/t))*t)}function Cr(e,t){return Ms($t(Ms(e/t))*t)}function ye(e,t=0){if(Er(e))return e;let s=10**t,n=e*s*(1+Number.EPSILON);return qe(n)/s}const ps=new Map;function Mr(e){return((""+e).split(".")[1]||"").length}function An(e,t,s,n){let o=[],l=n.map(Mr);for(let a=t;a<s;a++){let i=Ue(a),c=ye(rn(e,a),i);for(let d=0;d<n.length;d++){let v=e==10?+`${n[d]}e${a}`:n[d]*c,p=(a>=0?0:i)+(a>=l[d]?0:l[d]),m=e==10?v:ye(v,p);o.push(m),ps.set(m,p)}}return o}const Ln={},Ko=[],cn=[null,null],cs=Array.isArray,Er=Number.isInteger,uu=e=>e===void 0;function hi(e){return typeof e=="string"}function $l(e){let t=!1;if(e!=null){let s=e.constructor;t=s==null||s==Object}return t}function pu(e){return e!=null&&typeof e=="object"}const fu=Object.getPrototypeOf(Uint8Array),Lr="__proto__";function dn(e,t=$l){let s;if(cs(e)){let n=e.find(o=>o!=null);if(cs(n)||t(n)){s=Array(e.length);for(let o=0;o<e.length;o++)s[o]=dn(e[o],t)}else s=e.slice()}else if(e instanceof fu)s=e.slice();else if(t(e)){s={};for(let n in e)n!=Lr&&(s[n]=dn(e[n],t))}else s=e;return s}function He(e){let t=arguments;for(let s=1;s<t.length;s++){let n=t[s];for(let o in n)o!=Lr&&($l(e[o])?He(e[o],dn(n[o])):e[o]=dn(n[o]))}return e}const vu=0,mu=1,hu=2;function gu(e,t,s){for(let n=0,o,l=-1;n<t.length;n++){let a=t[n];if(a>l){for(o=a-1;o>=0&&e[o]==null;)e[o--]=null;for(o=a+1;o<s&&e[o]==null;)e[l=o++]=null}}}function _u(e,t){if(yu(e)){let a=e[0].slice();for(let i=1;i<e.length;i++)a.push(...e[i].slice(1));return xu(a[0])||(a=bu(a)),a}let s=new Set;for(let a=0;a<e.length;a++){let c=e[a][0],d=c.length;for(let v=0;v<d;v++)s.add(c[v])}let n=[Array.from(s).sort((a,i)=>a-i)],o=n[0].length,l=new Map;for(let a=0;a<o;a++)l.set(n[0][a],a);for(let a=0;a<e.length;a++){let i=e[a],c=i[0];for(let d=1;d<i.length;d++){let v=i[d],p=Array(o).fill(void 0),m=t?t[a][d]:mu,g=[];for(let x=0;x<v.length;x++){let L=v[x],T=l.get(c[x]);L===null?m!=vu&&(p[T]=L,m==hu&&g.push(T)):p[T]=L}gu(p,g,o),n.push(p)}}return n}const $u=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function bu(e){let t=e[0],s=t.length,n=Array(s);for(let l=0;l<n.length;l++)n[l]=l;n.sort((l,a)=>t[l]-t[a]);let o=[];for(let l=0;l<e.length;l++){let a=e[l],i=Array(s);for(let c=0;c<s;c++)i[c]=a[n[c]];o.push(i)}return o}function yu(e){let t=e[0][0],s=t.length;for(let n=1;n<e.length;n++){let o=e[n][0];if(o.length!=s)return!1;if(o!=t){for(let l=0;l<s;l++)if(o[l]!=t[l])return!1}}return!0}function xu(e,t=100){const s=e.length;if(s<=1)return!0;let n=0,o=s-1;for(;n<=o&&e[n]==null;)n++;for(;o>=n&&e[o]==null;)o--;if(o<=n)return!0;const l=dt(1,$t((o-n+1)/t));for(let a=e[n],i=n+l;i<=o;i+=l){const c=e[i];if(c!=null){if(c<=a)return!1;a=c}}return!0}const Dr=["January","February","March","April","May","June","July","August","September","October","November","December"],Ar=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function Or(e){return e.slice(0,3)}const ku=Ar.map(Or),wu=Dr.map(Or),Su={MMMM:Dr,MMM:wu,WWWW:Ar,WWW:ku};function wn(e){return(e<10?"0":"")+e}function Tu(e){return(e<10?"00":e<100?"0":"")+e}const Cu={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>wn(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>wn(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>wn(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>wn(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>wn(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Tu(e.getMilliseconds())};function Jo(e,t){t=t||Su;let s=[],n=/\{([a-z]+)\}|[^{]+/gi,o;for(;o=n.exec(e);)s.push(o[0][0]=="{"?Cu[o[1]]:o[0]);return l=>{let a="";for(let i=0;i<s.length;i++)a+=typeof s[i]=="string"?s[i]:s[i](l,t);return a}}const Mu=new Intl.DateTimeFormat().resolvedOptions().timeZone;function Eu(e,t){let s;return t=="UTC"||t=="Etc/UTC"?s=new Date(+e+e.getTimezoneOffset()*6e4):t==Mu?s=e:(s=new Date(e.toLocaleString("en-US",{timeZone:t})),s.setMilliseconds(e.getMilliseconds())),s}const Pr=e=>e%1==0,cl=[1,2,2.5,5],Lu=An(10,-32,0,cl),zr=An(10,0,32,cl),Du=zr.filter(Pr),ws=Lu.concat(zr),Qo=`
`,Rr="{YYYY}",gi=Qo+Rr,Ir="{M}/{D}",Cn=Qo+Ir,Vn=Cn+"/{YY}",Fr="{aa}",Au="{h}:{mm}",en=Au+Fr,_i=Qo+en,$i=":{ss}",he=null;function Nr(e){let t=e*1e3,s=t*60,n=s*60,o=n*24,l=o*30,a=o*365,c=(e==1?An(10,0,3,cl).filter(Pr):An(10,-3,0,cl)).concat([t,t*5,t*10,t*15,t*30,s,s*5,s*10,s*15,s*30,n,n*2,n*3,n*4,n*6,n*8,n*12,o,o*2,o*3,o*4,o*5,o*6,o*7,o*8,o*9,o*10,o*15,l,l*2,l*3,l*4,l*6,a,a*2,a*5,a*10,a*25,a*50,a*100]);const d=[[a,Rr,he,he,he,he,he,he,1],[o*28,"{MMM}",gi,he,he,he,he,he,1],[o,Ir,gi,he,he,he,he,he,1],[n,"{h}"+Fr,Vn,he,Cn,he,he,he,1],[s,en,Vn,he,Cn,he,he,he,1],[t,$i,Vn+" "+en,he,Cn+" "+en,he,_i,he,1],[e,$i+".{fff}",Vn+" "+en,he,Cn+" "+en,he,_i,he,1]];function v(p){return(m,g,x,L,T,y)=>{let $=[],k=T>=a,S=T>=l&&T<a,H=p(x),D=ye(H*e,3),O=no(H.getFullYear(),k?0:H.getMonth(),S||k?1:H.getDate()),P=ye(O*e,3);if(S||k){let b=S?T/l:0,C=k?T/a:0,A=D==P?D:ye(no(O.getFullYear()+C,O.getMonth()+b,1)*e,3),R=new Date(qe(A/e)),I=R.getFullYear(),F=R.getMonth();for(let q=0;A<=L;q++){let te=no(I+C*q,F+b*q,1),E=te-p(ye(te*e,3));A=ye((+te+E)*e,3),A<=L&&$.push(A)}}else{let b=T>=o?o:T,C=$t(x)-$t(D),A=P+C+_l(D-P,b);$.push(A);let R=p(A),I=R.getHours()+R.getMinutes()/s+R.getSeconds()/n,F=T/n,q=m.axes[g]._space,te=y/q;for(;A=ye(A+T,e==1?0:3),!(A>L);)if(F>1){let E=$t(ye(I+F,6))%24,G=p(A).getHours()-E;G>1&&(G=-1),A-=G*n,I=(I+F)%24;let le=$[$.length-1];ye((A-le)/T,3)*te>=.7&&$.push(A)}else $.push(A)}return $}}return[c,d,v]}const[Ou,Pu,zu]=Nr(1),[Ru,Iu,Fu]=Nr(.001);An(2,-53,53,[1]);function bi(e,t){return e.map(s=>s.map((n,o)=>o==0||o==8||n==null?n:t(o==1||s[8]==0?n:s[1]+n)))}function yi(e,t){return(s,n,o,l,a)=>{let i=t.find(x=>a>=x[0])||t[t.length-1],c,d,v,p,m,g;return n.map(x=>{let L=e(x),T=L.getFullYear(),y=L.getMonth(),$=L.getDate(),k=L.getHours(),S=L.getMinutes(),H=L.getSeconds(),D=T!=c&&i[2]||y!=d&&i[3]||$!=v&&i[4]||k!=p&&i[5]||S!=m&&i[6]||H!=g&&i[7]||i[1];return c=T,d=y,v=$,p=k,m=S,g=H,D(L)})}}function Nu(e,t){let s=Jo(t);return(n,o,l,a,i)=>o.map(c=>s(e(c)))}function no(e,t,s){return new Date(e,t,s)}function xi(e,t){return t(e)}const ju="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function ki(e,t){return(s,n,o,l)=>l==null?qo:t(e(n))}function Bu(e,t){let s=e.series[t];return s.width?s.stroke(e,t):s.points.width?s.points.stroke(e,t):null}function Hu(e,t){return e.series[t].fill(e,t)}const Wu={show:!0,live:!0,isolate:!1,mount:ru,markers:{show:!0,width:2,stroke:Bu,fill:Hu,dash:"solid"},idx:null,idxs:null,values:[]};function qu(e,t){let s=e.cursor.points,n=Mt(),o=s.size(e,t);Te(n,Sn,o),Te(n,Tn,o);let l=o/-2;Te(n,"marginLeft",l),Te(n,"marginTop",l);let a=s.width(e,t,o);return a&&Te(n,"borderWidth",a),n}function Vu(e,t){let s=e.series[t].points;return s._fill||s._stroke}function Uu(e,t){let s=e.series[t].points;return s._stroke||s._fill}function Gu(e,t){return e.series[t].points.size}const lo=[0,0];function Yu(e,t,s){return lo[0]=t,lo[1]=s,lo}function Un(e,t,s,n=!0){return o=>{o.button==0&&(!n||o.target==t)&&s(o)}}function oo(e,t,s,n=!0){return o=>{(!n||o.target==t)&&s(o)}}const Ku={show:!0,x:!0,y:!0,lock:!1,move:Yu,points:{one:!1,show:qu,size:Gu,width:0,stroke:Uu,fill:Vu},bind:{mousedown:Un,mouseup:Un,click:Un,dblclick:Un,mousemove:oo,mouseleave:oo,mouseenter:oo},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,s,n,o)=>n-o,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},jr={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},Zo=He({},jr,{filter:Tr}),Br=He({},Zo,{size:10}),Hr=He({},jr,{show:!1}),Xo='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',Wr="bold "+Xo,qr=1.5,wi={show:!0,scale:"x",stroke:Wo,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Wr,side:2,grid:Zo,ticks:Br,border:Hr,font:Xo,lineGap:qr,rotate:0},Ju="Value",Qu="Time",Si={show:!0,scale:"x",auto:!1,sorted:1,min:be,max:-be,idxs:[]};function Zu(e,t,s,n,o){return t.map(l=>l==null?"":Yo(l))}function Xu(e,t,s,n,o,l,a){let i=[],c=ps.get(o)||0;s=a?s:ye(_l(s,o),c);for(let d=s;d<=n;d=ye(d+o,c))i.push(Object.is(d,-0)?0:d);return i}function ko(e,t,s,n,o,l,a){const i=[],c=e.scales[e.axes[t].scale].log,d=c==10?es:kr,v=$t(d(s));o=rn(c,v),c==10&&(o=ws[Rt(o,ws)]);let p=s,m=o*c;c==10&&(m=ws[Rt(m,ws)]);do i.push(p),p=p+o,c==10&&!ps.has(p)&&(p=ye(p,ps.get(o))),p>=m&&(o=p,m=o*c,c==10&&(m=ws[Rt(m,ws)]));while(p<=n);return i}function ep(e,t,s,n,o,l,a){let c=e.scales[e.axes[t].scale].asinh,d=n>c?ko(e,t,dt(c,s),n,o):[c],v=n>=0&&s<=0?[0]:[];return(s<-c?ko(e,t,dt(c,-n),-s,o):[c]).reverse().map(m=>-m).concat(v,d)}const Vr=/./,tp=/[12357]/,sp=/[125]/,Ti=/1/,wo=(e,t,s,n)=>e.map((o,l)=>t==4&&o==0||l%n==0&&s.test(o.toExponential()[o<0?1:0])?o:null);function np(e,t,s,n,o){let l=e.axes[s],a=l.scale,i=e.scales[a],c=e.valToPos,d=l._space,v=c(10,a),p=c(9,a)-v>=d?Vr:c(7,a)-v>=d?tp:c(5,a)-v>=d?sp:Ti;if(p==Ti){let m=Ue(c(1,a)-v);if(m<d)return wo(t.slice().reverse(),i.distr,p,Et(d/m)).reverse()}return wo(t,i.distr,p,1)}function lp(e,t,s,n,o){let l=e.axes[s],a=l.scale,i=l._space,c=e.valToPos,d=Ue(c(1,a)-c(2,a));return d<i?wo(t.slice().reverse(),3,Vr,Et(i/d)).reverse():t}function op(e,t,s,n){return n==null?qo:t==null?"":Yo(t)}const Ci={show:!0,scale:"y",stroke:Wo,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Wr,side:3,grid:Zo,ticks:Br,border:Hr,font:Xo,lineGap:qr,rotate:0};function ap(e,t){let s=3+(e||1)*2;return ye(s*t,3)}function ip(e,t){let{scale:s,idxs:n}=e.series[0],o=e._data[0],l=e.valToPos(o[n[0]],s,!0),a=e.valToPos(o[n[1]],s,!0),i=Ue(a-l),c=e.series[t],d=i/(c.points.space*me);return n[1]-n[0]<=d}const Mi={scale:null,auto:!0,sorted:0,min:be,max:-be},Ur=(e,t,s,n,o)=>o,Ei={show:!0,auto:!0,sorted:0,gaps:Ur,alpha:1,facets:[He({},Mi,{scale:"x"}),He({},Mi,{scale:"y"})]},Li={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:Ur,alpha:1,points:{show:ip,filter:null},values:null,min:be,max:-be,idxs:[],path:null,clip:null};function rp(e,t,s,n,o){return s/10}const Gr={time:Od,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},cp=He({},Gr,{time:!1,ori:1}),Di={};function Yr(e,t){let s=Di[e];return s||(s={key:e,plots:[],sub(n){s.plots.push(n)},unsub(n){s.plots=s.plots.filter(o=>o!=n)},pub(n,o,l,a,i,c,d){for(let v=0;v<s.plots.length;v++)s.plots[v]!=o&&s.plots[v].pub(n,o,l,a,i,c,d)}},e!=null&&(Di[e]=s)),s}const un=1,So=2;function Es(e,t,s){const n=e.mode,o=e.series[t],l=n==2?e._data[t]:e._data,a=e.scales,i=e.bbox;let c=l[0],d=n==2?l[1]:l[t],v=n==2?a[o.facets[0].scale]:a[e.series[0].scale],p=n==2?a[o.facets[1].scale]:a[o.scale],m=i.left,g=i.top,x=i.width,L=i.height,T=e.valToPosH,y=e.valToPosV;return v.ori==0?s(o,c,d,v,p,T,y,m,g,x,L,yl,fn,kl,Jr,Zr):s(o,c,d,v,p,y,T,g,m,L,x,xl,vn,sa,Qr,Xr)}function ea(e,t){let s=0,n=0,o=fe(e.bands,Ko);for(let l=0;l<o.length;l++){let a=o[l];a.series[0]==t?s=a.dir:a.series[1]==t&&(a.dir==1?n|=1:n|=2)}return[s,n==1?-1:n==2?1:n==3?2:0]}function dp(e,t,s,n,o){let l=e.mode,a=e.series[t],i=l==2?a.facets[1].scale:a.scale,c=e.scales[i];return o==-1?c.min:o==1?c.max:c.distr==3?c.dir==1?c.min:c.max:0}function ts(e,t,s,n,o,l){return Es(e,t,(a,i,c,d,v,p,m,g,x,L,T)=>{let y=a.pxRound;const $=d.dir*(d.ori==0?1:-1),k=d.ori==0?fn:vn;let S,H;$==1?(S=s,H=n):(S=n,H=s);let D=y(p(i[S],d,L,g)),O=y(m(c[S],v,T,x)),P=y(p(i[H],d,L,g)),b=y(m(l==1?v.max:v.min,v,T,x)),C=new Path2D(o);return k(C,P,b),k(C,D,b),k(C,D,O),C})}function bl(e,t,s,n,o,l){let a=null;if(e.length>0){a=new Path2D;const i=t==0?kl:sa;let c=s;for(let p=0;p<e.length;p++){let m=e[p];if(m[1]>m[0]){let g=m[0]-c;g>0&&i(a,c,n,g,n+l),c=m[1]}}let d=s+o-c,v=10;d>0&&i(a,c,n-v/2,d,n+l+v)}return a}function up(e,t,s){let n=e[e.length-1];n&&n[0]==t?n[1]=s:e.push([t,s])}function ta(e,t,s,n,o,l,a){let i=[],c=e.length;for(let d=o==1?s:n;d>=s&&d<=n;d+=o)if(t[d]===null){let p=d,m=d;if(o==1)for(;++d<=n&&t[d]===null;)m=d;else for(;--d>=s&&t[d]===null;)m=d;let g=l(e[p]),x=m==p?g:l(e[m]),L=p-o;g=a<=0&&L>=0&&L<c?l(e[L]):g;let y=m+o;x=a>=0&&y>=0&&y<c?l(e[y]):x,x>=g&&i.push([g,x])}return i}function Ai(e){return e==0?Sr:e==1?qe:t=>ks(t,e)}function Kr(e){let t=e==0?yl:xl,s=e==0?(o,l,a,i,c,d)=>{o.arcTo(l,a,i,c,d)}:(o,l,a,i,c,d)=>{o.arcTo(a,l,c,i,d)},n=e==0?(o,l,a,i,c)=>{o.rect(l,a,i,c)}:(o,l,a,i,c)=>{o.rect(a,l,c,i)};return(o,l,a,i,c,d=0,v=0)=>{d==0&&v==0?n(o,l,a,i,c):(d=It(d,i/2,c/2),v=It(v,i/2,c/2),t(o,l+d,a),s(o,l+i,a,l+i,a+c,d),s(o,l+i,a+c,l,a+c,v),s(o,l,a+c,l,a,v),s(o,l,a,l+i,a,d),o.closePath())}}const yl=(e,t,s)=>{e.moveTo(t,s)},xl=(e,t,s)=>{e.moveTo(s,t)},fn=(e,t,s)=>{e.lineTo(t,s)},vn=(e,t,s)=>{e.lineTo(s,t)},kl=Kr(0),sa=Kr(1),Jr=(e,t,s,n,o,l)=>{e.arc(t,s,n,o,l)},Qr=(e,t,s,n,o,l)=>{e.arc(s,t,n,o,l)},Zr=(e,t,s,n,o,l,a)=>{e.bezierCurveTo(t,s,n,o,l,a)},Xr=(e,t,s,n,o,l,a)=>{e.bezierCurveTo(s,t,o,n,a,l)};function ec(e){return(t,s,n,o,l)=>Es(t,s,(a,i,c,d,v,p,m,g,x,L,T)=>{let{pxRound:y,points:$}=a,k,S;d.ori==0?(k=yl,S=Jr):(k=xl,S=Qr);const H=ye($.width*me,3);let D=($.size-$.width)/2*me,O=ye(D*2,3),P=new Path2D,b=new Path2D,{left:C,top:A,width:R,height:I}=t.bbox;kl(b,C-O,A-O,R+O*2,I+O*2);const F=q=>{if(c[q]!=null){let te=y(p(i[q],d,L,g)),E=y(m(c[q],v,T,x));k(P,te+D,E),S(P,te,E,D,0,el*2)}};if(l)l.forEach(F);else for(let q=n;q<=o;q++)F(q);return{stroke:H>0?P:null,fill:P,clip:b,flags:un|So}})}function tc(e){return(t,s,n,o,l,a)=>{n!=o&&(l!=n&&a!=n&&e(t,s,n),l!=o&&a!=o&&e(t,s,o),e(t,s,a))}}const pp=tc(fn),fp=tc(vn);function sc(e){const t=fe(e==null?void 0:e.alignGaps,0);return(s,n,o,l)=>Es(s,n,(a,i,c,d,v,p,m,g,x,L,T)=>{[o,l]=hl(c,o,l);let y=a.pxRound,$=I=>y(p(I,d,L,g)),k=I=>y(m(I,v,T,x)),S,H;d.ori==0?(S=fn,H=pp):(S=vn,H=fp);const D=d.dir*(d.ori==0?1:-1),O={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:un},P=O.stroke;let b=!1;if(l-o>=L*4){let I=Y=>s.posToVal(Y,d.key,!0),F=null,q=null,te,E,j,U=$(i[D==1?o:l]),G=$(i[o]),le=$(i[l]),oe=I(D==1?G+1:le-1);for(let Y=D==1?o:l;Y>=o&&Y<=l;Y+=D){let Le=i[Y],Me=(D==1?Le<oe:Le>oe)?U:$(Le),ue=c[Y];Me==U?ue!=null?(E=ue,F==null?(S(P,Me,k(E)),te=F=q=E):E<F?F=E:E>q&&(q=E)):ue===null&&(b=!0):(F!=null&&H(P,U,k(F),k(q),k(te),k(E)),ue!=null?(E=ue,S(P,Me,k(E)),F=q=te=E):(F=q=null,ue===null&&(b=!0)),U=Me,oe=I(U+D))}F!=null&&F!=q&&j!=U&&H(P,U,k(F),k(q),k(te),k(E))}else for(let I=D==1?o:l;I>=o&&I<=l;I+=D){let F=c[I];F===null?b=!0:F!=null&&S(P,$(i[I]),k(F))}let[A,R]=ea(s,n);if(a.fill!=null||A!=0){let I=O.fill=new Path2D(P),F=a.fillTo(s,n,a.min,a.max,A),q=k(F),te=$(i[o]),E=$(i[l]);D==-1&&([E,te]=[te,E]),S(I,E,q),S(I,te,q)}if(!a.spanGaps){let I=[];b&&I.push(...ta(i,c,o,l,D,$,t)),O.gaps=I=a.gaps(s,n,o,l,I),O.clip=bl(I,d.ori,g,x,L,T)}return R!=0&&(O.band=R==2?[ts(s,n,o,l,P,-1),ts(s,n,o,l,P,1)]:ts(s,n,o,l,P,R)),O})}function vp(e){const t=fe(e.align,1),s=fe(e.ascDesc,!1),n=fe(e.alignGaps,0),o=fe(e.extend,!1);return(l,a,i,c)=>Es(l,a,(d,v,p,m,g,x,L,T,y,$,k)=>{[i,c]=hl(p,i,c);let S=d.pxRound,{left:H,width:D}=l.bbox,O=G=>S(x(G,m,$,T)),P=G=>S(L(G,g,k,y)),b=m.ori==0?fn:vn;const C={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:un},A=C.stroke,R=m.dir*(m.ori==0?1:-1);let I=P(p[R==1?i:c]),F=O(v[R==1?i:c]),q=F,te=F;o&&t==-1&&(te=H,b(A,te,I)),b(A,F,I);for(let G=R==1?i:c;G>=i&&G<=c;G+=R){let le=p[G];if(le==null)continue;let oe=O(v[G]),Y=P(le);t==1?b(A,oe,I):b(A,q,Y),b(A,oe,Y),I=Y,q=oe}let E=q;o&&t==1&&(E=H+D,b(A,E,I));let[j,U]=ea(l,a);if(d.fill!=null||j!=0){let G=C.fill=new Path2D(A),le=d.fillTo(l,a,d.min,d.max,j),oe=P(le);b(G,E,oe),b(G,te,oe)}if(!d.spanGaps){let G=[];G.push(...ta(v,p,i,c,R,O,n));let le=d.width*me/2,oe=s||t==1?le:-le,Y=s||t==-1?-le:le;G.forEach(Le=>{Le[0]+=oe,Le[1]+=Y}),C.gaps=G=d.gaps(l,a,i,c,G),C.clip=bl(G,m.ori,T,y,$,k)}return U!=0&&(C.band=U==2?[ts(l,a,i,c,A,-1),ts(l,a,i,c,A,1)]:ts(l,a,i,c,A,U)),C})}function Oi(e,t,s,n,o,l,a=be){if(e.length>1){let i=null;for(let c=0,d=1/0;c<e.length;c++)if(t[c]!==void 0){if(i!=null){let v=Ue(e[c]-e[i]);v<d&&(d=v,a=Ue(s(e[c],n,o,l)-s(e[i],n,o,l)))}i=c}}return a}function mp(e){e=e||Ln;const t=fe(e.size,[.6,be,1]),s=e.align||0,n=e.gap||0;let o=e.radius;o=o==null?[0,0]:typeof o=="number"?[o,0]:o;const l=de(o),a=1-t[0],i=fe(t[1],be),c=fe(t[2],1),d=fe(e.disp,Ln),v=fe(e.each,g=>{}),{fill:p,stroke:m}=d;return(g,x,L,T)=>Es(g,x,(y,$,k,S,H,D,O,P,b,C,A)=>{let R=y.pxRound,I=s,F=n*me,q=i*me,te=c*me,E,j;S.ori==0?[E,j]=l(g,x):[j,E]=l(g,x);const U=S.dir*(S.ori==0?1:-1);let G=S.ori==0?kl:sa,le=S.ori==0?v:(Z,xe,We,Os,ms,Bt,hs)=>{v(Z,xe,We,ms,Os,hs,Bt)},oe=fe(g.bands,Ko).find(Z=>Z.series[0]==x),Y=oe!=null?oe.dir:0,Le=y.fillTo(g,x,y.min,y.max,Y),Ne=R(O(Le,H,A,b)),Me,ue,Lt,ft=C,De=R(y.width*me),jt=!1,Kt=null,xt=null,ss=null,Ls=null;p!=null&&(De==0||m!=null)&&(jt=!0,Kt=p.values(g,x,L,T),xt=new Map,new Set(Kt).forEach(Z=>{Z!=null&&xt.set(Z,new Path2D)}),De>0&&(ss=m.values(g,x,L,T),Ls=new Map,new Set(ss).forEach(Z=>{Z!=null&&Ls.set(Z,new Path2D)})));let{x0:Ds,size:mn}=d;if(Ds!=null&&mn!=null){I=1,$=Ds.values(g,x,L,T),Ds.unit==2&&($=$.map(We=>g.posToVal(P+We*C,S.key,!0)));let Z=mn.values(g,x,L,T);mn.unit==2?ue=Z[0]*C:ue=D(Z[0],S,C,P)-D(0,S,C,P),ft=Oi($,k,D,S,C,P,ft),Lt=ft-ue+F}else ft=Oi($,k,D,S,C,P,ft),Lt=ft*a+F,ue=ft-Lt;Lt<1&&(Lt=0),De>=ue/2&&(De=0),Lt<5&&(R=Sr);let On=Lt>0,fs=ft-Lt-(On?De:0);ue=R(xo(fs,te,q)),Me=(I==0?ue/2:I==U?0:ue)-I*U*((I==0?F/2:0)+(On?De/2:0));const at={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},As=jt?null:new Path2D;let Jt=null;if(oe!=null)Jt=g.data[oe.series[1]];else{let{y0:Z,y1:xe}=d;Z!=null&&xe!=null&&(k=xe.values(g,x,L,T),Jt=Z.values(g,x,L,T))}let vs=E*ue,ae=j*ue;for(let Z=U==1?L:T;Z>=L&&Z<=T;Z+=U){let xe=k[Z];if(xe==null)continue;if(Jt!=null){let ut=Jt[Z]??0;if(xe-ut==0)continue;Ne=O(ut,H,A,b)}let We=S.distr!=2||d!=null?$[Z]:Z,Os=D(We,S,C,P),ms=O(fe(xe,Le),H,A,b),Bt=R(Os-Me),hs=R(dt(ms,Ne)),vt=R(It(ms,Ne)),kt=hs-vt;if(xe!=null){let ut=xe<0?ae:vs,Dt=xe<0?vs:ae;jt?(De>0&&ss[Z]!=null&&G(Ls.get(ss[Z]),Bt,vt+$t(De/2),ue,dt(0,kt-De),ut,Dt),Kt[Z]!=null&&G(xt.get(Kt[Z]),Bt,vt+$t(De/2),ue,dt(0,kt-De),ut,Dt)):G(As,Bt,vt+$t(De/2),ue,dt(0,kt-De),ut,Dt),le(g,x,Z,Bt-De/2,vt,ue+De,kt)}}return De>0?at.stroke=jt?Ls:As:jt||(at._fill=y.width==0?y._fill:y._stroke??y._fill,at.width=0),at.fill=jt?xt:As,at})}function hp(e,t){const s=fe(t==null?void 0:t.alignGaps,0);return(n,o,l,a)=>Es(n,o,(i,c,d,v,p,m,g,x,L,T,y)=>{[l,a]=hl(d,l,a);let $=i.pxRound,k=E=>$(m(E,v,T,x)),S=E=>$(g(E,p,y,L)),H,D,O;v.ori==0?(H=yl,O=fn,D=Zr):(H=xl,O=vn,D=Xr);const P=v.dir*(v.ori==0?1:-1);let b=k(c[P==1?l:a]),C=b,A=[],R=[];for(let E=P==1?l:a;E>=l&&E<=a;E+=P)if(d[E]!=null){let U=c[E],G=k(U);A.push(C=G),R.push(S(d[E]))}const I={stroke:e(A,R,H,O,D,$),fill:null,clip:null,band:null,gaps:null,flags:un},F=I.stroke;let[q,te]=ea(n,o);if(i.fill!=null||q!=0){let E=I.fill=new Path2D(F),j=i.fillTo(n,o,i.min,i.max,q),U=S(j);O(E,C,U),O(E,b,U)}if(!i.spanGaps){let E=[];E.push(...ta(c,d,l,a,P,k,s)),I.gaps=E=i.gaps(n,o,l,a,E),I.clip=bl(E,v.ori,x,L,T,y)}return te!=0&&(I.band=te==2?[ts(n,o,l,a,F,-1),ts(n,o,l,a,F,1)]:ts(n,o,l,a,F,te)),I})}function gp(e){return hp(_p,e)}function _p(e,t,s,n,o,l){const a=e.length;if(a<2)return null;const i=new Path2D;if(s(i,e[0],t[0]),a==2)n(i,e[1],t[1]);else{let c=Array(a),d=Array(a-1),v=Array(a-1),p=Array(a-1);for(let m=0;m<a-1;m++)v[m]=t[m+1]-t[m],p[m]=e[m+1]-e[m],d[m]=v[m]/p[m];c[0]=d[0];for(let m=1;m<a-1;m++)d[m]===0||d[m-1]===0||d[m-1]>0!=d[m]>0?c[m]=0:(c[m]=3*(p[m-1]+p[m])/((2*p[m]+p[m-1])/d[m-1]+(p[m]+2*p[m-1])/d[m]),isFinite(c[m])||(c[m]=0));c[a-1]=d[a-2];for(let m=0;m<a-1;m++)o(i,e[m]+p[m]/3,t[m]+c[m]*p[m]/3,e[m+1]-p[m]/3,t[m+1]-c[m+1]*p[m]/3,e[m+1],t[m+1])}return i}const To=new Set;function Pi(){for(let e of To)e.syncRect(!0)}pn&&(Ts(Zd,ln,Pi),Ts(Xd,ln,Pi,!0),Ts(il,ln,()=>{nt.pxRatio=me}));const $p=sc(),bp=ec();function zi(e,t,s,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((l,a)=>Co(l,a,t,s))}function yp(e,t){return e.map((s,n)=>n==0?{}:He({},t,s))}function Co(e,t,s,n){return He({},t==0?s:n,e)}function nc(e,t,s){return t==null?cn:[t,s]}const xp=nc;function kp(e,t,s){return t==null?cn:rl(t,s,Go,!0)}function lc(e,t,s,n){return t==null?cn:gl(t,s,e.scales[n].log,!1)}const wp=lc;function oc(e,t,s,n){return t==null?cn:Uo(t,s,e.scales[n].log,!1)}const Sp=oc;function Tp(e,t,s,n,o){let l=dt(fi(e),fi(t)),a=t-e,i=Rt(o/n*a,s);do{let c=s[i],d=n*c/a;if(d>=o&&l+(c<5?ps.get(c):0)<=17)return[c,d]}while(++i<s.length);return[0,0]}function Ri(e){let t,s;return e=e.replace(/(\d+)px/,(n,o)=>(t=qe((s=+o)*me))+"px"),[e,t,s]}function Cp(e){e.show&&[e.font,e.labelFont].forEach(t=>{let s=ye(t[2]*me,1);t[0]=t[0].replace(/[0-9.]+px/,s+"px"),t[1]=s})}function nt(e,t,s){const n={mode:fe(e.mode,1)},o=n.mode;function l(u,f,h,_){let w=f.valToPct(u);return _+h*(f.dir==-1?1-w:w)}function a(u,f,h,_){let w=f.valToPct(u);return _+h*(f.dir==-1?w:1-w)}function i(u,f,h,_){return f.ori==0?l(u,f,h,_):a(u,f,h,_)}n.valToPosH=l,n.valToPosV=a;let c=!1;n.status=0;const d=n.root=Mt(Pd);if(e.id!=null&&(d.id=e.id),_t(d,e.class),e.title){let u=Mt(Id,d);u.textContent=e.title}const v=zt("canvas"),p=n.ctx=v.getContext("2d"),m=Mt(Fd,d);Ts("click",m,u=>{u.target===x&&(ke!=qs||Ee!=Vs)&&st.click(n,u)},!0);const g=n.under=Mt(Nd,m);m.appendChild(v);const x=n.over=Mt(jd,m);e=dn(e);const L=+fe(e.pxAlign,1),T=Ai(L);(e.plugins||[]).forEach(u=>{u.opts&&(e=u.opts(n,e)||e)});const y=e.ms||.001,$=n.series=o==1?zi(e.series||[],Si,Li,!1):yp(e.series||[null],Ei),k=n.axes=zi(e.axes||[],wi,Ci,!0),S=n.scales={},H=n.bands=e.bands||[];H.forEach(u=>{u.fill=de(u.fill||null),u.dir=fe(u.dir,-1)});const D=o==2?$[1].facets[0].scale:$[0].scale,O={axes:Ec,series:wc},P=(e.drawOrder||["axes","series"]).map(u=>O[u]);function b(u){const f=u.distr==3?h=>es(h>0?h:u.clamp(n,h,u.min,u.max,u.key)):u.distr==4?h=>so(h,u.asinh):u.distr==100?h=>u.fwd(h):h=>h;return h=>{let _=f(h),{_min:w,_max:M}=u,N=M-w;return(_-w)/N}}function C(u){let f=S[u];if(f==null){let h=(e.scales||Ln)[u]||Ln;if(h.from!=null){C(h.from);let _=He({},S[h.from],h,{key:u});_.valToPct=b(_),S[u]=_}else{f=S[u]=He({},u==D?Gr:cp,h),f.key=u;let _=f.time,w=f.range,M=cs(w);if((u!=D||o==2&&!_)&&(M&&(w[0]==null||w[1]==null)&&(w={min:w[0]==null?di:{mode:1,hard:w[0],soft:w[0]},max:w[1]==null?di:{mode:1,hard:w[1],soft:w[1]}},M=!1),!M&&$l(w))){let N=w;w=(B,W,K)=>W==null?cn:rl(W,K,N)}f.range=de(w||(_?xp:u==D?f.distr==3?wp:f.distr==4?Sp:nc:f.distr==3?lc:f.distr==4?oc:kp)),f.auto=de(M?!1:f.auto),f.clamp=de(f.clamp||rp),f._min=f._max=null,f.valToPct=b(f)}}}C("x"),C("y"),o==1&&$.forEach(u=>{C(u.scale)}),k.forEach(u=>{C(u.scale)});for(let u in e.scales)C(u);const A=S[D],R=A.distr;let I,F;A.ori==0?(_t(d,zd),I=l,F=a):(_t(d,Rd),I=a,F=l);const q={};for(let u in S){let f=S[u];(f.min!=null||f.max!=null)&&(q[u]={min:f.min,max:f.max},f.min=f.max=null)}const te=e.tzDate||(u=>new Date(qe(u/y))),E=e.fmtDate||Jo,j=y==1?zu(te):Fu(te),U=yi(te,bi(y==1?Pu:Iu,E)),G=ki(te,xi(ju,E)),le=[],oe=n.legend=He({},Wu,e.legend),Y=n.cursor=He({},Ku,{drag:{y:o==2}},e.cursor),Le=oe.show,Ne=Y.show,Me=oe.markers;oe.idxs=le,Me.width=de(Me.width),Me.dash=de(Me.dash),Me.stroke=de(Me.stroke),Me.fill=de(Me.fill);let ue,Lt,ft,De=[],jt=[],Kt,xt=!1,ss={};if(oe.live){const u=$[1]?$[1].values:null;xt=u!=null,Kt=xt?u(n,1,0):{_:0};for(let f in Kt)ss[f]=qo}if(Le)if(ue=zt("table",Ud,d),ft=zt("tbody",null,ue),oe.mount(n,ue),xt){Lt=zt("thead",null,ue,ft);let u=zt("tr",null,Lt);zt("th",null,u);for(var Ls in Kt)zt("th",Qa,u).textContent=Ls}else _t(ue,Yd),oe.live&&_t(ue,Gd);const Ds={show:!0},mn={show:!1};function On(u,f){if(f==0&&(xt||!oe.live||o==2))return cn;let h=[],_=zt("tr",Kd,ft,ft.childNodes[f]);_t(_,u.class),u.show||_t(_,Ss);let w=zt("th",null,_);if(Me.show){let B=Mt(Jd,w);if(f>0){let W=Me.width(n,f);W&&(B.style.border=W+"px "+Me.dash(n,f)+" "+Me.stroke(n,f)),B.style.background=Me.fill(n,f)}}let M=Mt(Qa,w);u.label instanceof HTMLElement?M.appendChild(u.label):M.textContent=u.label,f>0&&(Me.show||(M.style.color=u.width>0?Me.stroke(n,f):Me.fill(n,f)),at("click",w,B=>{if(Y._lock)return;_s(B);let W=$.indexOf(u);if((B.ctrlKey||B.metaKey)!=oe.isolate){let K=$.some((J,X)=>X>0&&X!=W&&J.show);$.forEach((J,X)=>{X>0&&Wt(X,K?X==W?Ds:mn:Ds,!0,je.setSeries)})}else Wt(W,{show:!u.show},!0,je.setSeries)},!1),zs&&at(ti,w,B=>{Y._lock||(_s(B),Wt($.indexOf(u),Gs,!0,je.setSeries))},!1));for(var N in Kt){let B=zt("td",Qd,_);B.textContent="--",h.push(B)}return[_,h]}const fs=new Map;function at(u,f,h,_=!0){const w=fs.get(f)||{},M=Y.bind[u](n,f,h,_);M&&(Ts(u,f,w[u]=M),fs.set(f,w))}function As(u,f,h){const _=fs.get(f)||{};for(let w in _)(u==null||w==u)&&(yo(w,f,_[w]),delete _[w]);u==null&&fs.delete(f)}let Jt=0,vs=0,ae=0,Z=0,xe=0,We=0,Os=xe,ms=We,Bt=ae,hs=Z,vt=0,kt=0,ut=0,Dt=0;n.bbox={};let Sl=!1,Pn=!1,Ps=!1,gs=!1,zn=!1,wt=!1;function Tl(u,f,h){(h||u!=n.width||f!=n.height)&&na(u,f),js(!1),Ps=!0,Pn=!0,Bs()}function na(u,f){n.width=Jt=ae=u,n.height=vs=Z=f,xe=We=0,gc(),_c();let h=n.bbox;vt=h.left=ks(xe*me,.5),kt=h.top=ks(We*me,.5),ut=h.width=ks(ae*me,.5),Dt=h.height=ks(Z*me,.5)}const vc=3;function mc(){let u=!1,f=0;for(;!u;){f++;let h=Cc(f),_=Mc(f);u=f==vc||h&&_,u||(na(n.width,n.height),Pn=!0)}}function hc({width:u,height:f}){Tl(u,f)}n.setSize=hc;function gc(){let u=!1,f=!1,h=!1,_=!1;k.forEach((w,M)=>{if(w.show&&w._show){let{side:N,_size:B}=w,W=N%2,K=w.label!=null?w.labelSize:0,J=B+K;J>0&&(W?(ae-=J,N==3?(xe+=J,_=!0):h=!0):(Z-=J,N==0?(We+=J,u=!0):f=!0))}}),$s[0]=u,$s[1]=h,$s[2]=f,$s[3]=_,ae-=ns[1]+ns[3],xe+=ns[3],Z-=ns[2]+ns[0],We+=ns[0]}function _c(){let u=xe+ae,f=We+Z,h=xe,_=We;function w(M,N){switch(M){case 1:return u+=N,u-N;case 2:return f+=N,f-N;case 3:return h-=N,h+N;case 0:return _-=N,_+N}}k.forEach((M,N)=>{if(M.show&&M._show){let B=M.side;M._pos=w(B,M._size),M.label!=null&&(M._lpos=w(B,M.labelSize))}})}if(Y.dataIdx==null){let u=Y.hover,f=u.skip=new Set(u.skip??[]);f.add(void 0);let h=u.prox=de(u.prox),_=u.bias??(u.bias=0);Y.dataIdx=(w,M,N,B)=>{if(M==0)return N;let W=N,K=h(w,M,N,B)??be,J=K>=0&&K<be,X=A.ori==0?ae:Z,ne=Y.left,ve=t[0],pe=t[M];if(f.has(pe[N])){W=null;let ce=null,se=null,ee;if(_==0||_==-1)for(ee=N;ce==null&&ee-- >0;)f.has(pe[ee])||(ce=ee);if(_==0||_==1)for(ee=N;se==null&&ee++<pe.length;)f.has(pe[ee])||(se=ee);if(ce!=null||se!=null)if(J){let Se=ce==null?-1/0:I(ve[ce],A,X,0),Pe=se==null?1/0:I(ve[se],A,X,0),et=ne-Se,$e=Pe-ne;et<=$e?et<=K&&(W=ce):$e<=K&&(W=se)}else W=se==null?ce:ce==null?se:N-ce<=se-N?ce:se}else J&&Ue(ne-I(ve[N],A,X,0))>K&&(W=null);return W}}const _s=u=>{Y.event=u};Y.idxs=le,Y._lock=!1;let lt=Y.points;lt.show=de(lt.show),lt.size=de(lt.size),lt.stroke=de(lt.stroke),lt.width=de(lt.width),lt.fill=de(lt.fill);const Ht=n.focus=He({},e.focus||{alpha:.3},Y.focus),zs=Ht.prox>=0,Rs=zs&&lt.one;let St=[],Is=[],Fs=[];function la(u,f){let h=lt.show(n,f);if(h instanceof HTMLElement)return _t(h,Vd),_t(h,u.class),Gt(h,-10,-10,ae,Z),x.insertBefore(h,St[f]),h}function oa(u,f){if(o==1||f>0){let h=o==1&&S[u.scale].time,_=u.value;u.value=h?hi(_)?ki(te,xi(_,E)):_||G:_||op,u.label=u.label||(h?Qu:Ju)}if(Rs||f>0){u.width=u.width==null?1:u.width,u.paths=u.paths||$p||cu,u.fillTo=de(u.fillTo||dp),u.pxAlign=+fe(u.pxAlign,L),u.pxRound=Ai(u.pxAlign),u.stroke=de(u.stroke||null),u.fill=de(u.fill||null),u._stroke=u._fill=u._paths=u._focus=null;let h=ap(dt(1,u.width),1),_=u.points=He({},{size:h,width:dt(1,h*.2),stroke:u.stroke,space:h*2,paths:bp,_stroke:null,_fill:null},u.points);_.show=de(_.show),_.filter=de(_.filter),_.fill=de(_.fill),_.stroke=de(_.stroke),_.paths=de(_.paths),_.pxAlign=u.pxAlign}if(Le){let h=On(u,f);De.splice(f,0,h[0]),jt.splice(f,0,h[1]),oe.values.push(null)}if(Ne){le.splice(f,0,null);let h=null;Rs?f==0&&(h=la(u,f)):f>0&&(h=la(u,f)),St.splice(f,0,h),Is.splice(f,0,0),Fs.splice(f,0,0)}Xe("addSeries",f)}function $c(u,f){f=f??$.length,u=o==1?Co(u,f,Si,Li):Co(u,f,{},Ei),$.splice(f,0,u),oa($[f],f)}n.addSeries=$c;function bc(u){if($.splice(u,1),Le){oe.values.splice(u,1),jt.splice(u,1);let f=De.splice(u,1)[0];As(null,f.firstChild),f.remove()}Ne&&(le.splice(u,1),St.splice(u,1)[0].remove(),Is.splice(u,1),Fs.splice(u,1)),Xe("delSeries",u)}n.delSeries=bc;const $s=[!1,!1,!1,!1];function yc(u,f){if(u._show=u.show,u.show){let h=u.side%2,_=S[u.scale];_==null&&(u.scale=h?$[1].scale:D,_=S[u.scale]);let w=_.time;u.size=de(u.size),u.space=de(u.space),u.rotate=de(u.rotate),cs(u.incrs)&&u.incrs.forEach(N=>{!ps.has(N)&&ps.set(N,Mr(N))}),u.incrs=de(u.incrs||(_.distr==2?Du:w?y==1?Ou:Ru:ws)),u.splits=de(u.splits||(w&&_.distr==1?j:_.distr==3?ko:_.distr==4?ep:Xu)),u.stroke=de(u.stroke),u.grid.stroke=de(u.grid.stroke),u.ticks.stroke=de(u.ticks.stroke),u.border.stroke=de(u.border.stroke);let M=u.values;u.values=cs(M)&&!cs(M[0])?de(M):w?cs(M)?yi(te,bi(M,E)):hi(M)?Nu(te,M):M||U:M||Zu,u.filter=de(u.filter||(_.distr>=3&&_.log==10?np:_.distr==3&&_.log==2?lp:Tr)),u.font=Ri(u.font),u.labelFont=Ri(u.labelFont),u._size=u.size(n,null,f,0),u._space=u._rotate=u._incrs=u._found=u._splits=u._values=null,u._size>0&&($s[f]=!0,u._el=Mt(Bd,m))}}function hn(u,f,h,_){let[w,M,N,B]=h,W=f%2,K=0;return W==0&&(B||M)&&(K=f==0&&!w||f==2&&!N?qe(wi.size/3):0),W==1&&(w||N)&&(K=f==1&&!M||f==3&&!B?qe(Ci.size/2):0),K}const aa=n.padding=(e.padding||[hn,hn,hn,hn]).map(u=>de(fe(u,hn))),ns=n._padding=aa.map((u,f)=>u(n,f,$s,0));let tt,Ke=null,Je=null;const Rn=o==1?$[0].idxs:null;let At=null,gn=!1;function ia(u,f){if(t=u??[],n.data=n._data=t,o==2){tt=0;for(let h=1;h<$.length;h++)tt+=t[h][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),At=t[0],tt=At.length;let h=t;if(R==2){h=t.slice();let _=h[0]=Array(tt);for(let w=0;w<tt;w++)_[w]=w}n._data=t=h}if(js(!0),Xe("setData"),R==2&&(Ps=!0),f!==!1){let h=A;h.auto(n,gn)?Cl():os(D,h.min,h.max),gs=gs||Y.left>=0,wt=!0,Bs()}}n.setData=ia;function Cl(){gn=!0;let u,f;o==1&&(tt>0?(Ke=Rn[0]=0,Je=Rn[1]=tt-1,u=t[0][Ke],f=t[0][Je],R==2?(u=Ke,f=Je):u==f&&(R==3?[u,f]=gl(u,u,A.log,!1):R==4?[u,f]=Uo(u,u,A.log,!1):A.time?f=u+qe(86400/y):[u,f]=rl(u,f,Go,!0))):(Ke=Rn[0]=u=null,Je=Rn[1]=f=null)),os(D,u,f)}let In,Ns,Ml,El,Ll,Dl,Al,Ol,Pl,pt;function ra(u,f,h,_,w,M){u??(u=Xa),h??(h=Ko),_??(_="butt"),w??(w=Xa),M??(M="round"),u!=In&&(p.strokeStyle=In=u),w!=Ns&&(p.fillStyle=Ns=w),f!=Ml&&(p.lineWidth=Ml=f),M!=Ll&&(p.lineJoin=Ll=M),_!=Dl&&(p.lineCap=Dl=_),h!=El&&p.setLineDash(El=h)}function ca(u,f,h,_){f!=Ns&&(p.fillStyle=Ns=f),u!=Al&&(p.font=Al=u),h!=Ol&&(p.textAlign=Ol=h),_!=Pl&&(p.textBaseline=Pl=_)}function zl(u,f,h,_,w=0){if(_.length>0&&u.auto(n,gn)&&(f==null||f.min==null)){let M=fe(Ke,0),N=fe(Je,_.length-1),B=h.min==null?nu(_,M,N,w,u.distr==3):[h.min,h.max];u.min=It(u.min,h.min=B[0]),u.max=dt(u.max,h.max=B[1])}}const da={min:null,max:null};function xc(){for(let _ in S){let w=S[_];q[_]==null&&(w.min==null||q[D]!=null&&w.auto(n,gn))&&(q[_]=da)}for(let _ in S){let w=S[_];q[_]==null&&w.from!=null&&q[w.from]!=null&&(q[_]=da)}q[D]!=null&&js(!0);let u={};for(let _ in q){let w=q[_];if(w!=null){let M=u[_]=dn(S[_],pu);if(w.min!=null)He(M,w);else if(_!=D||o==2)if(tt==0&&M.from==null){let N=M.range(n,null,null,_);M.min=N[0],M.max=N[1]}else M.min=be,M.max=-be}}if(tt>0){$.forEach((_,w)=>{if(o==1){let M=_.scale,N=q[M];if(N==null)return;let B=u[M];if(w==0){let W=B.range(n,B.min,B.max,M);B.min=W[0],B.max=W[1],Ke=Rt(B.min,t[0]),Je=Rt(B.max,t[0]),Je-Ke>1&&(t[0][Ke]<B.min&&Ke++,t[0][Je]>B.max&&Je--),_.min=At[Ke],_.max=At[Je]}else _.show&&_.auto&&zl(B,N,_,t[w],_.sorted);_.idxs[0]=Ke,_.idxs[1]=Je}else if(w>0&&_.show&&_.auto){let[M,N]=_.facets,B=M.scale,W=N.scale,[K,J]=t[w],X=u[B],ne=u[W];X!=null&&zl(X,q[B],M,K,M.sorted),ne!=null&&zl(ne,q[W],N,J,N.sorted),_.min=N.min,_.max=N.max}});for(let _ in u){let w=u[_],M=q[_];if(w.from==null&&(M==null||M.min==null)){let N=w.range(n,w.min==be?null:w.min,w.max==-be?null:w.max,_);w.min=N[0],w.max=N[1]}}}for(let _ in u){let w=u[_];if(w.from!=null){let M=u[w.from];if(M.min==null)w.min=w.max=null;else{let N=w.range(n,M.min,M.max,_);w.min=N[0],w.max=N[1]}}}let f={},h=!1;for(let _ in u){let w=u[_],M=S[_];if(M.min!=w.min||M.max!=w.max){M.min=w.min,M.max=w.max;let N=M.distr;M._min=N==3?es(M.min):N==4?so(M.min,M.asinh):N==100?M.fwd(M.min):M.min,M._max=N==3?es(M.max):N==4?so(M.max,M.asinh):N==100?M.fwd(M.max):M.max,f[_]=h=!0}}if(h){$.forEach((_,w)=>{o==2?w>0&&f.y&&(_._paths=null):f[_.scale]&&(_._paths=null)});for(let _ in f)Ps=!0,Xe("setScale",_);Ne&&Y.left>=0&&(gs=wt=!0)}for(let _ in q)q[_]=null}function kc(u){let f=xo(Ke-1,0,tt-1),h=xo(Je+1,0,tt-1);for(;u[f]==null&&f>0;)f--;for(;u[h]==null&&h<tt-1;)h++;return[f,h]}function wc(){if(tt>0){let u=$.some(f=>f._focus)&&pt!=Ht.alpha;u&&(p.globalAlpha=pt=Ht.alpha),$.forEach((f,h)=>{if(h>0&&f.show&&(ua(h,!1),ua(h,!0),f._paths==null)){let _=pt;pt!=f.alpha&&(p.globalAlpha=pt=f.alpha);let w=o==2?[0,t[h][0].length-1]:kc(t[h]);f._paths=f.paths(n,h,w[0],w[1]),pt!=_&&(p.globalAlpha=pt=_)}}),$.forEach((f,h)=>{if(h>0&&f.show){let _=pt;pt!=f.alpha&&(p.globalAlpha=pt=f.alpha),f._paths!=null&&pa(h,!1);{let w=f._paths!=null?f._paths.gaps:null,M=f.points.show(n,h,Ke,Je,w),N=f.points.filter(n,h,M,w);(M||N)&&(f.points._paths=f.points.paths(n,h,Ke,Je,N),pa(h,!0))}pt!=_&&(p.globalAlpha=pt=_),Xe("drawSeries",h)}}),u&&(p.globalAlpha=pt=1)}}function ua(u,f){let h=f?$[u].points:$[u];h._stroke=h.stroke(n,u),h._fill=h.fill(n,u)}function pa(u,f){let h=f?$[u].points:$[u],{stroke:_,fill:w,clip:M,flags:N,_stroke:B=h._stroke,_fill:W=h._fill,_width:K=h.width}=h._paths;K=ye(K*me,3);let J=null,X=K%2/2;f&&W==null&&(W=K>0?"#fff":B);let ne=h.pxAlign==1&&X>0;if(ne&&p.translate(X,X),!f){let ve=vt-K/2,pe=kt-K/2,ce=ut+K,se=Dt+K;J=new Path2D,J.rect(ve,pe,ce,se)}f?Rl(B,K,h.dash,h.cap,W,_,w,N,M):Sc(u,B,K,h.dash,h.cap,W,_,w,N,J,M),ne&&p.translate(-X,-X)}function Sc(u,f,h,_,w,M,N,B,W,K,J){let X=!1;W!=0&&H.forEach((ne,ve)=>{if(ne.series[0]==u){let pe=$[ne.series[1]],ce=t[ne.series[1]],se=(pe._paths||Ln).band;cs(se)&&(se=ne.dir==1?se[0]:se[1]);let ee,Se=null;pe.show&&se&&ou(ce,Ke,Je)?(Se=ne.fill(n,ve)||M,ee=pe._paths.clip):se=null,Rl(f,h,_,w,Se,N,B,W,K,J,ee,se),X=!0}}),X||Rl(f,h,_,w,M,N,B,W,K,J)}const fa=un|So;function Rl(u,f,h,_,w,M,N,B,W,K,J,X){ra(u,f,h,_,w),(W||K||X)&&(p.save(),W&&p.clip(W),K&&p.clip(K)),X?(B&fa)==fa?(p.clip(X),J&&p.clip(J),Nn(w,N),Fn(u,M,f)):B&So?(Nn(w,N),p.clip(X),Fn(u,M,f)):B&un&&(p.save(),p.clip(X),J&&p.clip(J),Nn(w,N),p.restore(),Fn(u,M,f)):(Nn(w,N),Fn(u,M,f)),(W||K||X)&&p.restore()}function Fn(u,f,h){h>0&&(f instanceof Map?f.forEach((_,w)=>{p.strokeStyle=In=w,p.stroke(_)}):f!=null&&u&&p.stroke(f))}function Nn(u,f){f instanceof Map?f.forEach((h,_)=>{p.fillStyle=Ns=_,p.fill(h)}):f!=null&&u&&p.fill(f)}function Tc(u,f,h,_){let w=k[u],M;if(_<=0)M=[0,0];else{let N=w._space=w.space(n,u,f,h,_),B=w._incrs=w.incrs(n,u,f,h,_,N);M=Tp(f,h,B,_,N)}return w._found=M}function Il(u,f,h,_,w,M,N,B,W,K){let J=N%2/2;L==1&&p.translate(J,J),ra(B,N,W,K,B),p.beginPath();let X,ne,ve,pe,ce=w+(_==0||_==3?-M:M);h==0?(ne=w,pe=ce):(X=w,ve=ce);for(let se=0;se<u.length;se++)f[se]!=null&&(h==0?X=ve=u[se]:ne=pe=u[se],p.moveTo(X,ne),p.lineTo(ve,pe));p.stroke(),L==1&&p.translate(-J,-J)}function Cc(u){let f=!0;return k.forEach((h,_)=>{if(!h.show)return;let w=S[h.scale];if(w.min==null){h._show&&(f=!1,h._show=!1,js(!1));return}else h._show||(f=!1,h._show=!0,js(!1));let M=h.side,N=M%2,{min:B,max:W}=w,[K,J]=Tc(_,B,W,N==0?ae:Z);if(J==0)return;let X=w.distr==2,ne=h._splits=h.splits(n,_,B,W,K,J,X),ve=w.distr==2?ne.map(ee=>At[ee]):ne,pe=w.distr==2?At[ne[1]]-At[ne[0]]:K,ce=h._values=h.values(n,h.filter(n,ve,_,J,pe),_,J,pe);h._rotate=M==2?h.rotate(n,ce,_,J):0;let se=h._size;h._size=Et(h.size(n,ce,_,u)),se!=null&&h._size!=se&&(f=!1)}),f}function Mc(u){let f=!0;return aa.forEach((h,_)=>{let w=h(n,_,$s,u);w!=ns[_]&&(f=!1),ns[_]=w}),f}function Ec(){for(let u=0;u<k.length;u++){let f=k[u];if(!f.show||!f._show)continue;let h=f.side,_=h%2,w,M,N=f.stroke(n,u),B=h==0||h==3?-1:1,[W,K]=f._found;if(f.label!=null){let rt=f.labelGap*B,gt=qe((f._lpos+rt)*me);ca(f.labelFont[0],N,"center",h==2?kn:Za),p.save(),_==1?(w=M=0,p.translate(gt,qe(kt+Dt/2)),p.rotate((h==3?-el:el)/2)):(w=qe(vt+ut/2),M=gt);let xs=wr(f.label)?f.label(n,u,W,K):f.label;p.fillText(xs,w,M),p.restore()}if(K==0)continue;let J=S[f.scale],X=_==0?ut:Dt,ne=_==0?vt:kt,ve=f._splits,pe=J.distr==2?ve.map(rt=>At[rt]):ve,ce=J.distr==2?At[ve[1]]-At[ve[0]]:W,se=f.ticks,ee=f.border,Se=se.show?se.size:0,Pe=qe(Se*me),et=qe((f.alignTo==2?f._size-Se-f.gap:f.gap)*me),$e=f._rotate*-el/180,ze=T(f._pos*me),mt=(Pe+et)*B,it=ze+mt;M=_==0?it:0,w=_==1?it:0;let Tt=f.font[0],Ot=f.align==1?Js:f.align==2?Xl:$e>0?Js:$e<0?Xl:_==0?"center":h==3?Xl:Js,Vt=$e||_==1?"middle":h==2?kn:Za;ca(Tt,N,Ot,Vt);let ht=f.font[1]*f.lineGap,Ct=ve.map(rt=>T(i(rt,J,X,ne))),Pt=f._values;for(let rt=0;rt<Pt.length;rt++){let gt=Pt[rt];if(gt!=null){_==0?w=Ct[rt]:M=Ct[rt],gt=""+gt;let xs=gt.indexOf(`
`)==-1?[gt]:gt.split(/\n/gm);for(let ct=0;ct<xs.length;ct++){let Aa=xs[ct];$e?(p.save(),p.translate(w,M+ct*ht),p.rotate($e),p.fillText(Aa,0,0),p.restore()):p.fillText(Aa,w,M+ct*ht)}}}se.show&&Il(Ct,se.filter(n,pe,u,K,ce),_,h,ze,Pe,ye(se.width*me,3),se.stroke(n,u),se.dash,se.cap);let Ut=f.grid;Ut.show&&Il(Ct,Ut.filter(n,pe,u,K,ce),_,_==0?2:1,_==0?kt:vt,_==0?Dt:ut,ye(Ut.width*me,3),Ut.stroke(n,u),Ut.dash,Ut.cap),ee.show&&Il([ze],[1],_==0?1:0,_==0?1:2,_==1?kt:vt,_==1?Dt:ut,ye(ee.width*me,3),ee.stroke(n,u),ee.dash,ee.cap)}Xe("drawAxes")}function js(u){$.forEach((f,h)=>{h>0&&(f._paths=null,u&&(o==1?(f.min=null,f.max=null):f.facets.forEach(_=>{_.min=null,_.max=null})))})}let jn=!1,Fl=!1,_n=[];function Lc(){Fl=!1;for(let u=0;u<_n.length;u++)Xe(..._n[u]);_n.length=0}function Bs(){jn||($u(va),jn=!0)}function Dc(u,f=!1){jn=!0,Fl=f,u(n),va(),f&&_n.length>0&&queueMicrotask(Lc)}n.batch=Dc;function va(){if(Sl&&(xc(),Sl=!1),Ps&&(mc(),Ps=!1),Pn){if(Te(g,Js,xe),Te(g,kn,We),Te(g,Sn,ae),Te(g,Tn,Z),Te(x,Js,xe),Te(x,kn,We),Te(x,Sn,ae),Te(x,Tn,Z),Te(m,Sn,Jt),Te(m,Tn,vs),v.width=qe(Jt*me),v.height=qe(vs*me),k.forEach(({_el:u,_show:f,_size:h,_pos:_,side:w})=>{if(u!=null)if(f){let M=w===3||w===0?h:0,N=w%2==1;Te(u,N?"left":"top",_-M),Te(u,N?"width":"height",h),Te(u,N?"top":"left",N?We:xe),Te(u,N?"height":"width",N?Z:ae),bo(u,Ss)}else _t(u,Ss)}),In=Ns=Ml=Ll=Dl=Al=Ol=Pl=El=null,pt=1,yn(!0),xe!=Os||We!=ms||ae!=Bt||Z!=hs){js(!1);let u=ae/Bt,f=Z/hs;if(Ne&&!gs&&Y.left>=0){Y.left*=u,Y.top*=f,Hs&&Gt(Hs,qe(Y.left),0,ae,Z),Ws&&Gt(Ws,0,qe(Y.top),ae,Z);for(let h=0;h<St.length;h++){let _=St[h];_!=null&&(Is[h]*=u,Fs[h]*=f,Gt(_,Et(Is[h]),Et(Fs[h]),ae,Z))}}if(we.show&&!zn&&we.left>=0&&we.width>0){we.left*=u,we.width*=u,we.top*=f,we.height*=f;for(let h in ql)Te(Us,h,we[h])}Os=xe,ms=We,Bt=ae,hs=Z}Xe("setSize"),Pn=!1}Jt>0&&vs>0&&(p.clearRect(0,0,v.width,v.height),Xe("drawClear"),P.forEach(u=>u()),Xe("draw")),we.show&&zn&&(Bn(we),zn=!1),Ne&&gs&&(ys(null,!0,!1),gs=!1),oe.show&&oe.live&&wt&&(Hl(),wt=!1),c||(c=!0,n.status=1,Xe("ready")),gn=!1,jn=!1}n.redraw=(u,f)=>{Ps=f||!1,u!==!1?os(D,A.min,A.max):Bs()};function Nl(u,f){let h=S[u];if(h.from==null){if(tt==0){let _=h.range(n,f.min,f.max,u);f.min=_[0],f.max=_[1]}if(f.min>f.max){let _=f.min;f.min=f.max,f.max=_}if(tt>1&&f.min!=null&&f.max!=null&&f.max-f.min<1e-16)return;u==D&&h.distr==2&&tt>0&&(f.min=Rt(f.min,t[0]),f.max=Rt(f.max,t[0]),f.min==f.max&&f.max++),q[u]=f,Sl=!0,Bs()}}n.setScale=Nl;let jl,Bl,Hs,Ws,ma,ha,qs,Vs,ga,_a,ke,Ee,ls=!1;const st=Y.drag;let Qe=st.x,Ze=st.y;Ne&&(Y.x&&(jl=Mt(Wd,x)),Y.y&&(Bl=Mt(qd,x)),A.ori==0?(Hs=jl,Ws=Bl):(Hs=Bl,Ws=jl),ke=Y.left,Ee=Y.top);const we=n.select=He({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Us=we.show?Mt(Hd,we.over?x:g):null;function Bn(u,f){if(we.show){for(let h in u)we[h]=u[h],h in ql&&Te(Us,h,u[h]);f!==!1&&Xe("setSelect")}}n.setSelect=Bn;function Ac(u){if($[u].show)Le&&bo(De[u],Ss);else if(Le&&_t(De[u],Ss),Ne){let h=Rs?St[0]:St[u];h!=null&&Gt(h,-10,-10,ae,Z)}}function os(u,f,h){Nl(u,{min:f,max:h})}function Wt(u,f,h,_){f.focus!=null&&Ic(u),f.show!=null&&$.forEach((w,M)=>{M>0&&(u==M||u==null)&&(w.show=f.show,Ac(M),o==2?(os(w.facets[0].scale,null,null),os(w.facets[1].scale,null,null)):os(w.scale,null,null),Bs())}),h!==!1&&Xe("setSeries",u,f),_&&xn("setSeries",n,u,f)}n.setSeries=Wt;function Oc(u,f){He(H[u],f)}function Pc(u,f){u.fill=de(u.fill||null),u.dir=fe(u.dir,-1),f=f??H.length,H.splice(f,0,u)}function zc(u){u==null?H.length=0:H.splice(u,1)}n.addBand=Pc,n.setBand=Oc,n.delBand=zc;function Rc(u,f){$[u].alpha=f,Ne&&St[u]!=null&&(St[u].style.opacity=f),Le&&De[u]&&(De[u].style.opacity=f)}let Qt,as,bs;const Gs={focus:!0};function Ic(u){if(u!=bs){let f=u==null,h=Ht.alpha!=1;$.forEach((_,w)=>{if(o==1||w>0){let M=f||w==0||w==u;_._focus=f?null:M,h&&Rc(w,M?1:Ht.alpha)}}),bs=u,h&&Bs()}}Le&&zs&&at(si,ue,u=>{Y._lock||(_s(u),bs!=null&&Wt(null,Gs,!0,je.setSeries))});function qt(u,f,h){let _=S[f];h&&(u=u/me-(_.ori==1?We:xe));let w=ae;_.ori==1&&(w=Z,u=w-u),_.dir==-1&&(u=w-u);let M=_._min,N=_._max,B=u/w,W=M+(N-M)*B,K=_.distr;return K==3?rn(10,W):K==4?iu(W,_.asinh):K==100?_.bwd(W):W}function Fc(u,f){let h=qt(u,D,f);return Rt(h,t[0],Ke,Je)}n.valToIdx=u=>Rt(u,t[0]),n.posToIdx=Fc,n.posToVal=qt,n.valToPos=(u,f,h)=>S[f].ori==0?l(u,S[f],h?ut:ae,h?vt:0):a(u,S[f],h?Dt:Z,h?kt:0),n.setCursor=(u,f,h)=>{ke=u.left,Ee=u.top,ys(null,f,h)};function $a(u,f){Te(Us,Js,we.left=u),Te(Us,Sn,we.width=f)}function ba(u,f){Te(Us,kn,we.top=u),Te(Us,Tn,we.height=f)}let $n=A.ori==0?$a:ba,bn=A.ori==1?$a:ba;function Nc(){if(Le&&oe.live)for(let u=o==2?1:0;u<$.length;u++){if(u==0&&xt)continue;let f=oe.values[u],h=0;for(let _ in f)jt[u][h++].firstChild.nodeValue=f[_]}}function Hl(u,f){if(u!=null&&(u.idxs?u.idxs.forEach((h,_)=>{le[_]=h}):uu(u.idx)||le.fill(u.idx),oe.idx=le[0]),Le&&oe.live){for(let h=0;h<$.length;h++)(h>0||o==1&&!xt)&&jc(h,le[h]);Nc()}wt=!1,f!==!1&&Xe("setLegend")}n.setLegend=Hl;function jc(u,f){let h=$[u],_=u==0&&R==2?At:t[u],w;xt?w=h.values(n,u,f)??ss:(w=h.value(n,f==null?null:_[f],u,f),w=w==null?ss:{_:w}),oe.values[u]=w}function ys(u,f,h){ga=ke,_a=Ee,[ke,Ee]=Y.move(n,ke,Ee),Y.left=ke,Y.top=Ee,Ne&&(Hs&&Gt(Hs,qe(ke),0,ae,Z),Ws&&Gt(Ws,0,qe(Ee),ae,Z));let _,w=Ke>Je;Qt=be,as=null;let M=A.ori==0?ae:Z,N=A.ori==1?ae:Z;if(ke<0||tt==0||w){_=Y.idx=null;for(let B=0;B<$.length;B++){let W=St[B];W!=null&&Gt(W,-10,-10,ae,Z)}zs&&Wt(null,Gs,!0,u==null&&je.setSeries),oe.live&&(le.fill(_),wt=!0)}else{let B,W,K;o==1&&(B=A.ori==0?ke:Ee,W=qt(B,D),_=Y.idx=Rt(W,t[0],Ke,Je),K=I(t[0][_],A,M,0));let J=-10,X=-10,ne=0,ve=0,pe=!0,ce="",se="";for(let ee=o==2?1:0;ee<$.length;ee++){let Se=$[ee],Pe=le[ee],et=Pe==null?null:o==1?t[ee][Pe]:t[ee][1][Pe],$e=Y.dataIdx(n,ee,_,W),ze=$e==null?null:o==1?t[ee][$e]:t[ee][1][$e];if(wt=wt||ze!=et||$e!=Pe,le[ee]=$e,ee>0&&Se.show){let mt=$e==null?-10:$e==_?K:I(o==1?t[0][$e]:t[ee][0][$e],A,M,0),it=ze==null?-10:F(ze,o==1?S[Se.scale]:S[Se.facets[1].scale],N,0);if(zs&&ze!=null){let Tt=A.ori==1?ke:Ee,Ot=Ue(Ht.dist(n,ee,$e,it,Tt));if(Ot<Qt){let Vt=Ht.bias;if(Vt!=0){let ht=qt(Tt,Se.scale),Ct=ze>=0?1:-1,Pt=ht>=0?1:-1;Pt==Ct&&(Pt==1?Vt==1?ze>=ht:ze<=ht:Vt==1?ze<=ht:ze>=ht)&&(Qt=Ot,as=ee)}else Qt=Ot,as=ee}}if(wt||Rs){let Tt,Ot;A.ori==0?(Tt=mt,Ot=it):(Tt=it,Ot=mt);let Vt,ht,Ct,Pt,Ut,rt,gt=!0,xs=lt.bbox;if(xs!=null){gt=!1;let ct=xs(n,ee);Ct=ct.left,Pt=ct.top,Vt=ct.width,ht=ct.height}else Ct=Tt,Pt=Ot,Vt=ht=lt.size(n,ee);if(rt=lt.fill(n,ee),Ut=lt.stroke(n,ee),Rs)ee==as&&Qt<=Ht.prox&&(J=Ct,X=Pt,ne=Vt,ve=ht,pe=gt,ce=rt,se=Ut);else{let ct=St[ee];ct!=null&&(Is[ee]=Ct,Fs[ee]=Pt,ci(ct,Vt,ht,gt),ii(ct,rt,Ut),Gt(ct,Et(Ct),Et(Pt),ae,Z))}}}}if(Rs){let ee=Ht.prox,Se=bs==null?Qt<=ee:Qt>ee||as!=bs;if(wt||Se){let Pe=St[0];Pe!=null&&(Is[0]=J,Fs[0]=X,ci(Pe,ne,ve,pe),ii(Pe,ce,se),Gt(Pe,Et(J),Et(X),ae,Z))}}}if(we.show&&ls)if(u!=null){let[B,W]=je.scales,[K,J]=je.match,[X,ne]=u.cursor.sync.scales,ve=u.cursor.drag;if(Qe=ve._x,Ze=ve._y,Qe||Ze){let{left:pe,top:ce,width:se,height:ee}=u.select,Se=u.scales[X].ori,Pe=u.posToVal,et,$e,ze,mt,it,Tt=B!=null&&K(B,X),Ot=W!=null&&J(W,ne);Tt&&Qe?(Se==0?(et=pe,$e=se):(et=ce,$e=ee),ze=S[B],mt=I(Pe(et,X),ze,M,0),it=I(Pe(et+$e,X),ze,M,0),$n(It(mt,it),Ue(it-mt))):$n(0,M),Ot&&Ze?(Se==1?(et=pe,$e=se):(et=ce,$e=ee),ze=S[W],mt=F(Pe(et,ne),ze,N,0),it=F(Pe(et+$e,ne),ze,N,0),bn(It(mt,it),Ue(it-mt))):bn(0,N)}else Vl()}else{let B=Ue(ga-ma),W=Ue(_a-ha);if(A.ori==1){let ne=B;B=W,W=ne}Qe=st.x&&B>=st.dist,Ze=st.y&&W>=st.dist;let K=st.uni;K!=null?Qe&&Ze&&(Qe=B>=K,Ze=W>=K,!Qe&&!Ze&&(W>B?Ze=!0:Qe=!0)):st.x&&st.y&&(Qe||Ze)&&(Qe=Ze=!0);let J,X;Qe&&(A.ori==0?(J=qs,X=ke):(J=Vs,X=Ee),$n(It(J,X),Ue(X-J)),Ze||bn(0,N)),Ze&&(A.ori==1?(J=qs,X=ke):(J=Vs,X=Ee),bn(It(J,X),Ue(X-J)),Qe||$n(0,M)),!Qe&&!Ze&&($n(0,0),bn(0,0))}if(st._x=Qe,st._y=Ze,u==null){if(h){if(Da!=null){let[B,W]=je.scales;je.values[0]=B!=null?qt(A.ori==0?ke:Ee,B):null,je.values[1]=W!=null?qt(A.ori==1?ke:Ee,W):null}xn(eo,n,ke,Ee,ae,Z,_)}if(zs){let B=h&&je.setSeries,W=Ht.prox;bs==null?Qt<=W&&Wt(as,Gs,!0,B):Qt>W?Wt(null,Gs,!0,B):as!=bs&&Wt(as,Gs,!0,B)}}wt&&(oe.idx=_,Hl()),f!==!1&&Xe("setCursor")}let is=null;Object.defineProperty(n,"rect",{get(){return is==null&&yn(!1),is}});function yn(u=!1){u?is=null:(is=x.getBoundingClientRect(),Xe("syncRect",is))}function ya(u,f,h,_,w,M,N){Y._lock||ls&&u!=null&&u.movementX==0&&u.movementY==0||(Wl(u,f,h,_,w,M,N,!1,u!=null),u!=null?ys(null,!0,!0):ys(f,!0,!1))}function Wl(u,f,h,_,w,M,N,B,W){if(is==null&&yn(!1),_s(u),u!=null)h=u.clientX-is.left,_=u.clientY-is.top;else{if(h<0||_<0){ke=-10,Ee=-10;return}let[K,J]=je.scales,X=f.cursor.sync,[ne,ve]=X.values,[pe,ce]=X.scales,[se,ee]=je.match,Se=f.axes[0].side%2==1,Pe=A.ori==0?ae:Z,et=A.ori==1?ae:Z,$e=Se?M:w,ze=Se?w:M,mt=Se?_:h,it=Se?h:_;if(pe!=null?h=se(K,pe)?i(ne,S[K],Pe,0):-10:h=Pe*(mt/$e),ce!=null?_=ee(J,ce)?i(ve,S[J],et,0):-10:_=et*(it/ze),A.ori==1){let Tt=h;h=_,_=Tt}}W&&(f==null||f.cursor.event.type==eo)&&((h<=1||h>=ae-1)&&(h=ks(h,ae)),(_<=1||_>=Z-1)&&(_=ks(_,Z))),B?(ma=h,ha=_,[qs,Vs]=Y.move(n,h,_)):(ke=h,Ee=_)}const ql={width:0,height:0,left:0,top:0};function Vl(){Bn(ql,!1)}let xa,ka,wa,Sa;function Ta(u,f,h,_,w,M,N){ls=!0,Qe=Ze=st._x=st._y=!1,Wl(u,f,h,_,w,M,N,!0,!1),u!=null&&(at(to,_o,Ca,!1),xn(ei,n,qs,Vs,ae,Z,null));let{left:B,top:W,width:K,height:J}=we;xa=B,ka=W,wa=K,Sa=J}function Ca(u,f,h,_,w,M,N){ls=st._x=st._y=!1,Wl(u,f,h,_,w,M,N,!1,!0);let{left:B,top:W,width:K,height:J}=we,X=K>0||J>0,ne=xa!=B||ka!=W||wa!=K||Sa!=J;if(X&&ne&&Bn(we),st.setScale&&X&&ne){let ve=B,pe=K,ce=W,se=J;if(A.ori==1&&(ve=W,pe=J,ce=B,se=K),Qe&&os(D,qt(ve,D),qt(ve+pe,D)),Ze)for(let ee in S){let Se=S[ee];ee!=D&&Se.from==null&&Se.min!=be&&os(ee,qt(ce+se,ee),qt(ce,ee))}Vl()}else Y.lock&&(Y._lock=!Y._lock,ys(f,!0,u!=null));u!=null&&(As(to,_o),xn(to,n,ke,Ee,ae,Z,null))}function Bc(u,f,h,_,w,M,N){if(Y._lock)return;_s(u);let B=ls;if(ls){let W=!0,K=!0,J=10,X,ne;A.ori==0?(X=Qe,ne=Ze):(X=Ze,ne=Qe),X&&ne&&(W=ke<=J||ke>=ae-J,K=Ee<=J||Ee>=Z-J),X&&W&&(ke=ke<qs?0:ae),ne&&K&&(Ee=Ee<Vs?0:Z),ys(null,!0,!0),ls=!1}ke=-10,Ee=-10,le.fill(null),ys(null,!0,!0),B&&(ls=B)}function Ma(u,f,h,_,w,M,N){Y._lock||(_s(u),Cl(),Vl(),u!=null&&xn(ni,n,ke,Ee,ae,Z,null))}function Ea(){k.forEach(Cp),Tl(n.width,n.height,!0)}Ts(il,ln,Ea);const Ys={};Ys.mousedown=Ta,Ys.mousemove=ya,Ys.mouseup=Ca,Ys.dblclick=Ma,Ys.setSeries=(u,f,h,_)=>{let w=je.match[2];h=w(n,f,h),h!=-1&&Wt(h,_,!0,!1)},Ne&&(at(ei,x,Ta),at(eo,x,ya),at(ti,x,u=>{_s(u),yn(!1)}),at(si,x,Bc),at(ni,x,Ma),To.add(n),n.syncRect=yn);const Hn=n.hooks=e.hooks||{};function Xe(u,f,h){Fl?_n.push([u,f,h]):u in Hn&&Hn[u].forEach(_=>{_.call(null,n,f,h)})}(e.plugins||[]).forEach(u=>{for(let f in u.hooks)Hn[f]=(Hn[f]||[]).concat(u.hooks[f])});const La=(u,f,h)=>h,je=He({key:null,setSeries:!1,filters:{pub:vi,sub:vi},scales:[D,$[1]?$[1].scale:null],match:[mi,mi,La],values:[null,null]},Y.sync);je.match.length==2&&je.match.push(La),Y.sync=je;const Da=je.key,Ul=Yr(Da);function xn(u,f,h,_,w,M,N){je.filters.pub(u,f,h,_,w,M,N)&&Ul.pub(u,f,h,_,w,M,N)}Ul.sub(n);function Hc(u,f,h,_,w,M,N){je.filters.sub(u,f,h,_,w,M,N)&&Ys[u](null,f,h,_,w,M,N)}n.pub=Hc;function Wc(){Ul.unsub(n),To.delete(n),fs.clear(),yo(il,ln,Ea),d.remove(),ue==null||ue.remove(),Xe("destroy")}n.destroy=Wc;function Gl(){Xe("init",e,t),ia(t||e.data,!1),q[D]?Nl(D,q[D]):Cl(),zn=we.show&&(we.width>0||we.height>0),gs=wt=!0,Tl(e.width,e.height)}return $.forEach(oa),k.forEach(yc),s?s instanceof HTMLElement?(s.appendChild(d),Gl()):s(n,Gl):Gl(),n}nt.assign=He;nt.fmtNum=Yo;nt.rangeNum=rl;nt.rangeLog=gl;nt.rangeAsinh=Uo;nt.orient=Es;nt.pxRatio=me;nt.join=_u;nt.fmtDate=Jo,nt.tzDate=Eu;nt.sync=Yr;{nt.addGap=up,nt.clipGaps=bl;let e=nt.paths={points:ec};e.linear=sc,e.stepped=vp,e.bars=mp,e.spline=gp}function Mp(e){let t;return{hooks:{init(s){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",s.over.appendChild(t)},setCursor(s){const n=s.cursor.idx;if(n==null||!s.data[1]||s.data[1][n]==null){t.style.display="none";return}const o=s.data[0][n],l=s.data[1][n],a=new Date(o*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(l):z(l)}</b> ${a}`;const i=Math.round(s.valToPos(o,"x"));t.style.left=Math.min(i,s.over.clientWidth-80)+"px",t.style.display=""}}}}function Ep(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const o=n.match(/[\d.]+/g);return o&&o.length>=3?`rgba(${o[0]},${o[1]},${o[2]},${t})`:`rgba(100,100,100,${t})`}function ac({data:e,color:t,smooth:s,height:n,yMax:o,fmtVal:l}){const a=ot(null),i=ot(null),c=n||55;return ie(()=>{if(!a.current||!e||e[0].length<2)return;const d=s?Ed(e[1]):e[1],v=[e[0],d];if(i.current){i.current.setData(v);return}const p=o?(g,x,L)=>[0,Math.max(o,L*1.05)]:(g,x,L)=>[Math.max(0,x*.9),L*1.1],m={width:a.current.clientWidth||200,height:c,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:p}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:t,width:1.5,fill:Ep(t,.09)}],plugins:[Mp(l)]};return i.current=new nt(m,v,a.current),()=>{i.current&&(i.current.destroy(),i.current=null)}},[e,t,s]),ie(()=>{if(!i.current||!a.current)return;const d=new ResizeObserver(()=>{i.current&&a.current&&i.current.setSize({width:a.current.clientWidth,height:c})});return d.observe(a.current),()=>d.disconnect()},[]),r`<div class="chart-wrap" role="img" aria-label="Sparkline chart" style=${"height:"+c+"px"} ref=${a}></div>`}function Xt({label:e,value:t,valColor:s,data:n,chartColor:o,smooth:l,refLines:a,yMax:i,dp:c}){const d=re(()=>{if(!n||!n[1]||n[1].length<2)return[];const v=i?Math.max(i,n[1].reduce((p,m)=>Math.max(p,m),0)*1.05):n[1].reduce((p,m)=>Math.max(p,m),0)*1.1;return(a||[]).map(p=>{if(v<=0)return null;const m=(1-p.value/v)*100;return m>=0&&m<=95?{...p,pct:m}:null}).filter(Boolean)},[n,a,i]);return r`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${c?{"data-dp":c}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${e}</span>
      <span class="chart-val" style=${"color:"+(s||o||"var(--accent)")} aria-live="polite" aria-atomic="true">${t}</span>
    </div>
    <div style="position:relative">
      ${d.map(v=>r`<Fragment>
          <div class="chart-ref-line" style=${"top:"+v.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+v.pct+"% - 8px)"}>${v.label}</div>
        </Fragment>`)}
      ${n&&n[0].length>=2?r`<${ac} data=${n} color=${o||"var(--accent)"} smooth=${l} yMax=${i}/>`:r`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem">collecting...</div>`}
    </div>
  </div>`}function Mo({label:e,value:t,accent:s,dp:n,sm:o}){const l=ot(t),[a,i]=V(!1);return ie(()=>{l.current!==t&&(i(!0),setTimeout(()=>i(!1),500)),l.current=t},[t]),r`<div class=${"metric"+(o?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(s?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
  </div>`}function Ii({snap:e,mode:t}){if(!e)return null;const s=!t||t==="files",n=!t||t==="traffic",o=e.tools.filter(c=>c.tool!=="aictl"&&c.files.length),l=o.reduce((c,d)=>c+d.files.length,0)||1,a=e.tools.filter(c=>c.tool!=="aictl"&&c.live&&(c.live.outbound_rate_bps||c.live.inbound_rate_bps)),i=a.reduce((c,d)=>c+(d.live.outbound_rate_bps||0)+(d.live.inbound_rate_bps||0),0)||1;return r`
    ${s&&o.length>0&&r`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+o.map(c=>c.label+" "+c.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${o.map(c=>r`
        <div class="rbar-seg" style=${"width:"+(c.files.length/l*100).toFixed(1)+"%;background:"+(Oe[c.tool]||"var(--fg2)")}
          title="${c.label}: ${c.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${o.map(c=>r`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Oe[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${c.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${n&&r`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(a.length?a.map(c=>c.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${a.length===0?" — no active traffic":""}</div>
      <div class="rbar">${a.map(c=>{const d=(c.live.outbound_rate_bps||0)+(c.live.inbound_rate_bps||0);return r`<div class="rbar-seg" style=${"width:"+(d/i*100).toFixed(1)+"%;background:"+(Oe[c.tool]||"var(--fg2)")}
          title="${c.label}: ${Ft(d)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(c=>{const d=(c.live.outbound_rate_bps||0)+(c.live.inbound_rate_bps||0);return r`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Oe[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${Ft(d)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!o.length&&!a.length&&r`<div class="empty-state">No AI tool resources found yet.</div>`}`}function Lp({path:e,onClose:t}){const{snap:s}=Ge(Ie),[n,o]=V(null),[l,a]=V(!1),[i,c]=V(null),d=ot(null),v=ot(null),[p,m]=V(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),g=ot(!1),x=ot(0),L=ot(0),T=Re(D=>{g.current=!0,x.current=D.clientX,L.current=p,D.preventDefault()},[p]);if(ie(()=>{const D=P=>{if(!g.current)return;const b=x.current-P.clientX,C=window.innerWidth,A=Math.min(90,Math.max(20,L.current+b/C*100));m(A)},O=()=>{if(g.current){g.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(p)))}catch{}}};return window.addEventListener("mousemove",D),window.addEventListener("mouseup",O),()=>{window.removeEventListener("mousemove",D),window.removeEventListener("mouseup",O)}},[p]),ie(()=>{if(!e)return;v.current=document.activeElement;const D=setTimeout(()=>{var b;const P=(b=d.current)==null?void 0:b.querySelector("button");P&&P.focus()},50),O=P=>{if(P.key!=="Tab"||!d.current)return;const b=d.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!b.length)return;const C=b[0],A=b[b.length-1];P.shiftKey&&document.activeElement===C?(P.preventDefault(),A.focus()):!P.shiftKey&&document.activeElement===A&&(P.preventDefault(),C.focus())};return document.addEventListener("keydown",O),()=>{clearTimeout(D),document.removeEventListener("keydown",O),v.current&&v.current.focus&&v.current.focus()}},[e]),ie(()=>{e&&(a(!1),c(null),Ho(e).then(o).catch(D=>c(D.message)))},[e]),!e)return null;const y=re(()=>{if(!s)return"";for(const D of s.tools)for(const O of D.files)if(O.path===e)return(O.kind||"")+" | "+ge(O.size)+" | ~"+z(O.tokens)+"tok | scope:"+(O.scope||"?")+" | sent_to_llm:"+(O.sent_to_llm||"?")+" | loaded:"+(O.loaded_when||"?");for(const D of s.agent_memory)if(D.file===e)return D.source+" | "+D.profile+" | "+D.tokens+"tok | "+D.lines+"ln";return""},[s,e]),$=n?n.split(`
`):[],k=$.length,S=k>Ks*2,H=(D,O)=>D.map((P,b)=>r`<div class="fv-line"><span class="fv-ln">${O+b}</span><span class="fv-code">${Q(P)||" "}</span></div>`);return r`<div class="fv" ref=${d} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+p+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${T}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      <button onClick=${t} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${y}</div>
    <div class="fv-body">
      ${i?r`<p class="text-red" style="padding:var(--sp-10)">${i}</p>`:n?!S||l?r`<div class="fv-lines">${H($,1)}</div>`:r`<div class="fv-lines">${H($.slice(0,Ks),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>a(!0)}>\u25BC ${k-Ks*2} more lines \u25BC</div>
            <div class="fv-lines">${H($.slice(-Ks),k-Ks+1)}</div>`:r`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${k} lines${S&&!l?" (showing "+Ks*2+" of "+k+")":""}</span>
      ${S&&r`<button onClick=${()=>a(!l)}>${l?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function Eo({file:e,dirPrefix:t}){var D;const[s,n]=V(!1),[o,l]=V(!1),[a,i]=V(null),[c,d]=V(null),[v,p]=V(!1),m=Ge(Ie),g=(e.path||"").replace(/\\/g,"/").split("/").pop(),x=(e.sent_to_llm||"").toLowerCase(),L=e.mtime&&Date.now()/1e3-e.mtime<300,T=(D=m.recentFiles)==null?void 0:D.get(e.path),y=!!T,$=Re(async()=>{if(s){n(!1);return}n(!0),p(!0),d(null);try{const O=await Ho(e.path);i(O)}catch(O){d(O.message)}finally{p(!1)}},[s,e.path]),k=(O,P)=>O.map((b,C)=>r`<span class="pline"><span class="ln">${P+C}</span>${Q(b)||" "}</span>`),S=()=>{if(v)return r`<span class="text-muted">loading...</span>`;if(c)return r`<span class="text-red">${c}</span>`;if(!a)return null;const O=a.split(`
`),P=O.length;if(P<=nn*3||o)return r`${k(O,1)}
        <div class="prev-actions">
          ${o&&r`<button class="prev-btn" onClick=${()=>l(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
        </div>`;const C=O.slice(-nn),A=P-nn+1;return r`${k(C,A)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>l(!0)}>show all (${P} lines)</button>
        <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
      </div>`},H=e.size>0?Math.round(e.size/60):0;return r`<div>
    <button class="fitem" onClick=${$} aria-expanded=${s} title=${e.path}>
      ${y?r`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Nt(T.ts)}${T.growth>0?" +"+ge(T.growth):""}">●</span>`:L?r`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Nt(e.mtime)}">●</span>`:r`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${t?r`<span class="text-muted">${t}/</span>`:""}${Q(g)}</span>
      <span class="fmeta">
        ${x&&x!=="no"&&r`<span style="color:${$r(x)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${x}">${x==="yes"?"◆":x==="on-demand"?"◇":"○"}</span>`}
        ${ge(e.size)}${H?r` <span class="text-muted">${H}ln</span>`:""}${e.tokens?r` <span class="text-muted">${z(e.tokens)}t</span>`:""}
        ${e.mtime&&L?r` <span class="text-orange text-xs">${Nt(e.mtime)}</span>`:""}
      </span>
    </button>
    ${s&&r`<div class="inline-preview">${S()}</div>`}
  </div>`}function Dp({dir:e,files:t}){const[s,n]=V(!1),o=t.reduce((a,i)=>a+i.tokens,0),l=t.reduce((a,i)=>a+i.size,0);return r`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-muted" title=${e}>${Q(e)}</span>
      <span class="badge">${t.length}</span>
      <span class="badge">${ge(l)}</span>
      <span class="badge">${z(o)}t</span>
    </button>
    ${s&&r`<div style=${{paddingLeft:"var(--sp-8)"}}>${t.map(a=>r`<${Eo} key=${a.path} file=${a}/>`)}</div>`}
  </div>`}function Ap({label:e,files:t,root:s,badge:n,style:o,startOpen:l}){const[a,i]=V(!!l),c=re(()=>Md(t,s),[t,s]),d=re(()=>t.reduce((g,x)=>g+x.tokens,0),[t]),v=re(()=>t.reduce((g,x)=>g+x.size,0),[t]),p=re(()=>{var x;const g={};return t.forEach(L=>{const T=(L.sent_to_llm||"no").toLowerCase();g[T]=(g[T]||0)+1}),((x=Object.entries(g).sort((L,T)=>T[1]-L[1])[0])==null?void 0:x[0])||"no"},[t]),m=()=>c.length===1&&c[0][1].length<=3?c[0][1].map(g=>r`<${Eo} key=${g.path} file=${g}/>`):c.map(([g,x])=>x.length===1?r`<div style=${{marginLeft:"var(--sp-5)"}}><${Eo} key=${x[0].path} file=${x[0]} dirPrefix=${g}/></div>`:r`<${Dp} key=${g} dir=${g} files=${x}/>`);return r`<div class="cat-group" style=${o||""}>
    <button class=${"cat-head"+(a?" open":"")} onClick=${()=>i(!a)} aria-expanded=${a}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${$r(p)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${p}"></span>
      <span class="cat-label" title=${e}>${Q(e)}</span>
      <span class="badge" style="flex-shrink:0">${n||t.length}</span>
      <span class="badge">${ge(v)}</span>
      <span class="badge">${z(d)}t</span>
    </button>
    ${a&&r`<div style=${{paddingLeft:"var(--sp-8)"}}>${m()}</div>`}
  </div>`}function ao({label:e,data:t,color:s}){const n=ot(null);return ie(()=>{const o=n.current;if(!o||!t||t.length<2)return;const l=o.getContext("2d"),a=o.width=o.offsetWidth*(window.devicePixelRatio||1),i=o.height=o.offsetHeight*(window.devicePixelRatio||1);l.clearRect(0,0,a,i);const c=t.slice(-60),d=Math.max(...c)*1.1||1,v=a/(c.length-1);l.beginPath(),l.strokeStyle=s,l.lineWidth=1.5*(window.devicePixelRatio||1),c.forEach((p,m)=>{const g=m*v,x=i-p/d*i*.85;m===0?l.moveTo(g,x):l.lineTo(g,x)}),l.stroke()},[t,s]),r`<div style="position:relative;height:25px">
    <span class="text-muted" style="position:absolute;top:0;left:0;font-size:var(--fs-2xs);z-index:1">${e}</span>
    <canvas ref=${n} aria-hidden="true" style="width:100%;height:100%;display:block"/>
  </div>`}function Op({processes:e,maxMem:t}){if(!e||!e.length)return null;const s=e.reduce((a,i)=>a+(parseFloat(i.mem_mb)||0),0),n=e.reduce((a,i)=>a+(parseFloat(i.cpu_pct)||0),0),o={};e.forEach(a=>{const i=a.process_type||"process";(o[i]=o[i]||[]).push(a)});const l=Object.keys(o).length>1;return r`<div class="proc-section">
    <h3>Processes <span class="badge">${e.length}</span>
      <span class="badge">CPU ${_e(n)}</span>
      <span class="badge">MEM ${ge(s*1048576)}</span></h3>
    ${Object.entries(o).map(([a,i])=>{const c={};return i.forEach(d=>(c[d.name||"unknown"]=c[d.name||"unknown"]||[]).push(d)),r`<div style="margin-bottom:var(--sp-2)">
        ${l?r`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${Q(a)}</div>`:null}
        ${Object.entries(c).map(([d,v])=>{const p=v.sort((m,g)=>(parseFloat(g.mem_mb)||0)-(parseFloat(m.mem_mb)||0));return r`<div key=${d} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${l?"":r`<span style="text-transform:uppercase;letter-spacing:0.03em">${Q(a)}</span>${" · "}`}${Q(d)} <span style="opacity:0.6">(${v.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${p.map(m=>{const g=parseFloat(m.cpu_pct)||0,x=parseFloat(m.mem_mb)||0,L=Math.max(2,Math.min(g,100)),T=g>80?"var(--red)":g>50?"var(--orange)":g>5?"var(--green)":"var(--fg2)",y=m.anomalies&&m.anomalies.length,$=m.zombie_risk&&m.zombie_risk!=="none";return r`<div key=${m.pid}
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
  </div>`}function Pp({config:e}){if(!e)return null;const t=Object.entries(e.settings||{}),s=Object.entries(e.features||{}),n=(e.mcp_servers||[]).length>0,o=(e.extensions||[]).length>0,l=e.otel||{},a=e.hints||[];return!t.length&&!s.length&&!n&&!o&&!l.enabled&&!a.length&&e.model==null&&e.launch_at_startup==null?null:r`<div class="live-section">
    <h3>Configuration
      ${e.launch_at_startup===!0&&r`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${e.launch_at_startup===!1&&r`<span class="badge">no auto-start</span>`}
      ${e.auto_update===!0&&r`<span class="badge">auto-update</span>`}
      ${e.model&&r`<span class="badge">${e.model}</span>`}
      ${l.enabled&&r`<span class="badge" style="background:var(--green);color:var(--bg)">OTel ${l.exporter||"on"}</span>`}
      ${!l.enabled&&l.source&&r`<span class="badge" style="background:var(--orange);color:var(--bg)">OTel off</span>`}
    </h3>
    <div class="metric-grid">
      ${l.enabled&&r`<div class="metric-chip" style="border-color:var(--green)">
        <span class="mlabel text-green">OpenTelemetry</span>
        <div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Exporter:</span> <span class="mono">${l.exporter}</span>
        </div>
        ${l.endpoint&&r`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Endpoint:</span> <span class="mono">${l.endpoint}</span>
        </div>`}
        ${l.file_path&&r`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">File:</span> <span class="mono">${l.file_path}</span>
        </div>`}
        ${l.capture_content&&r`<div class="text-orange" style="font-size:var(--fs-base);padding:0.05rem 0">\u26A0 Content capture enabled</div>`}
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
      ${o&&r`<div class="metric-chip">
        <span class="mlabel">Extensions</span>
        <div class="stack-list">${e.extensions.map(i=>r`<span class="pill mono" key=${i}>${i}</span>`)}</div>
      </div>`}
    </div>
    ${a.length>0&&r`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
      ${a.map(i=>r`<div class="text-orange" style="font-size:var(--fs-base);padding:0.15rem 0">
        <span style="margin-right:var(--sp-3)">\u{1F4A1}</span>${i}
      </div>`)}
    </div>`}
  </div>`}function zp({telemetry:e}){if(!e)return null;const t=e,s=(t.input_tokens||0)+(t.output_tokens||0),n=t.errors||[],o=t.quota_state||{};if(!s&&!t.active_session_input&&!n.length)return null;const[l,a]=V(!1);return r`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${t.source}</span> <span class="badge">${_e(t.confidence*100)} confidence</span>
      ${n.length>0&&r`<span class="badge warn cursor-ptr" onClick=${i=>{i.stopPropagation(),a(!l)}}>${n.length} error${n.length>1?"s":""}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${Ve(t.input_tokens||0)} tok</span>
        <span class="msub">cache read: ${Ve(t.cache_read_tokens||0)} tok \u00B7 creation: ${Ve(t.cache_creation_tokens||0)} tok</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${Ve(t.output_tokens||0)} tok</span>
        <span class="msub">${z(t.total_sessions||0)} sessions \u00B7 ${z(t.total_messages||0)} messages</span>
      </div>
      ${t.cost_usd>0?r`<div class="metric-chip">
        <span class="mlabel">Estimated Cost</span>
        <span class="mvalue">$${t.cost_usd.toFixed(2)}</span>
      </div>`:null}
      ${(o.premium_requests_used>0||o.total_api_duration_ms>0)&&r`<div class="metric-chip">
        <span class="mlabel">Operational</span>
        ${o.premium_requests_used>0&&r`<div style="font-size:var(--fs-base)">Premium requests: <span class="mono">${o.premium_requests_used}</span></div>`}
        ${o.total_api_duration_ms>0&&r`<div style="font-size:var(--fs-base)">API time: <span class="mono">${Math.round(o.total_api_duration_ms/1e3)}s</span></div>`}
        ${o.current_model&&r`<div style="font-size:var(--fs-base)">Model: <span class="mono">${o.current_model}</span></div>`}
        ${o.code_changes&&r`<div class="text-green" style="font-size:var(--fs-base)">+${o.code_changes.lines_added} -${o.code_changes.lines_removed} (${o.code_changes.files_modified} files)</div>`}
      </div>`}
      ${t.active_session_input>0||t.active_session_output>0?r`<div class="metric-chip" style="border-color:var(--accent)">
        <span class="mlabel">Active Session</span>
        <span class="mvalue">${Ve((t.active_session_input||0)+(t.active_session_output||0))} tok</span>
        <span class="msub">in: ${Ve(t.active_session_input||0)} \u00B7 out: ${Ve(t.active_session_output||0)} \u00B7 ${t.active_session_messages||0} msgs</span>
      </div>`:null}
      ${Object.keys(t.by_model||{}).length>0?r`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(t.by_model).map(([i,c])=>r`<div key=${i} class="flex-between flex-wrap" style="font-size:0.75rem;padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${i}</span>
          <span>in:${Ve(c.input_tokens||0)} tok out:${Ve(c.output_tokens||0)} tok${c.cache_read_tokens?" cR:"+Ve(c.cache_read_tokens)+" tok":""}${c.requests?" · "+c.requests+"req":""}${c.cost_usd?" · $"+c.cost_usd.toFixed(2):""}</span>
        </div>`)}
      </div>`:null}
    </div>
    ${l&&n.length>0&&r`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--red);background:color-mix(in srgb,var(--red) 8%,transparent);border-radius:0 4px 4px 0;max-height:10rem;overflow-y:auto">
      <div class="text-red text-bold" style="font-size:var(--fs-base);margin-bottom:0.2rem">Recent Errors</div>
      ${n.map(i=>r`<div class="flex-row gap-sm" style="font-size:0.68rem;padding:0.1rem 0">
        <span class="mono text-muted text-nowrap">${(i.timestamp||"").slice(11,19)}</span>
        <span class="badge" style="font-size:var(--fs-xs);background:var(--red);color:var(--bg);padding:0.05rem var(--sp-2)">${i.type}</span>
        <span class="text-muted">${i.message}</span>
        ${i.model&&r`<span class="mono text-muted">${i.model}</span>`}
      </div>`)}
    </div>`}
  </div>`}function Rp({live:e}){if(!e)return null;const t=e.token_estimate||{},s=e.mcp||{},n=Bo(e);return r`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${e.session_count||0} sess</span>
      <span class="badge">${e.pid_count||0} pid</span>
      <span class="badge">${_e((e.confidence||0)*100)} conf</span>
      ${s.detected&&r`<span class="badge warn">${s.loops||0} MCP loop${(s.loops||0)===1?"":"s"}</span>`}
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
  </div>`}function Lo({tool:e,root:t}){var S,H,D,O,P,b,C,A;const[s,n]=V(!1),{snap:o,history:l}=Ge(Ie),a=re(()=>((o==null?void 0:o.tool_configs)||[]).find(R=>R.tool===e.tool),[o,e.tool]),i=re(()=>{var R;return(R=l==null?void 0:l.by_tool)==null?void 0:R[e.tool]},[l,e.tool]),c=Oe[e.tool]||"var(--fg2)",d=bt[e.tool]||"🔹",v=e.files.reduce((R,I)=>R+I.tokens,0),p=e.processes.filter(R=>R.anomalies&&R.anomalies.length).length,m=Bo(e.live),g=(((S=e.live)==null?void 0:S.outbound_rate_bps)||0)+(((H=e.live)==null?void 0:H.inbound_rate_bps)||0),x=e.processes.reduce((R,I)=>R+(parseFloat(I.cpu_pct)||0),0),L=e.processes.reduce((R,I)=>R+(parseFloat(I.mem_mb)||0),0),T=re(()=>Math.max(...e.processes.map(R=>parseFloat(R.mem_mb)||0),100),[e.processes]),y=(((O=(D=e.token_breakdown)==null?void 0:D.telemetry)==null?void 0:O.errors)||[]).length,$=re(()=>{const R={};return e.files.forEach(I=>{const F=I.kind||"other";(R[F]=R[F]||[]).push(I)}),Object.keys(R).sort((I,F)=>{const q=Ga.indexOf(I),te=Ga.indexOf(F);return(q<0?99:q)-(te<0?99:te)}).map(I=>({kind:I,files:R[I]}))},[e.files]),k="tcard"+(s?" open":"")+(p||y?" has-anomaly":"");return r`<div class=${k}>
    <button class="tcard-head" onClick=${()=>n(!s)} aria-expanded=${s}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)">${d}</span>${Q(e.label)}</h2>
      <span class="badge" data-dp="procs.tool.files">${e.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${z(v)} tok</span>
      ${e.processes.length>0&&r`<span class="badge" data-dp="procs.tool.process_count">${e.processes.length} proc ${_e(x)} ${ge(L*1048576)}</span>`}
      ${e.mcp_servers.length>0&&r`<span class="badge" data-dp="procs.tool.mcp_server_count">${e.mcp_servers.length} MCP</span>`}
      ${p>0&&r`<span class="badge warn" data-dp="procs.tool.anomaly">${p} anomaly</span>`}
      ${y>0&&r`<span class="badge" style="background:var(--red);color:var(--bg)">${y} error${y>1?"s":""}</span>`}
      ${e.live&&r`<span class="badge" style="background:var(--accent);color:var(--bg)">${e.live.session_count||0} live \u00B7 ${Ft(g)}${m>0?" · "+z(m)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${$.map(({kind:R,files:I})=>r`<span class="text-muted" style="font-size:var(--fs-xs)">${R}:${I.length}</span>`)}
      </div>
      ${i&&i.ts.length>2&&!s&&r`<div role="img" aria-label=${"Sparkline charts for "+e.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${R=>R.stopPropagation()}>
        <${ao} label="CPU" data=${i.cpu} color=${c}/>
        <${ao} label="MEM" data=${i.mem_mb} color=${"var(--green)"}/>
        <${ao} label=${e.live?"Traffic":"Tokens"} data=${e.live?i.traffic:i.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${s&&r`<div class="tcard-body">
      ${((P=Ua[e.tool])==null?void 0:P.length)>0&&r`<div class="tool-relationships">
        ${Ua[e.tool].map(R=>r`<span key=${R.label} class="rel-badge rel-${R.type}"
          title=${R.label}>${R.label}</span>`)}
      </div>`}
      <${Pp} config=${a}/>
      <${zp} telemetry=${(b=e.token_breakdown)==null?void 0:b.telemetry}/>
      <${Rp} live=${e.live}/>
      ${$.map(({kind:R,files:I})=>r`<${Ap} key=${R} label=${R} files=${I} root=${t}/>`)}
      <${Op} processes=${(A=(C=e.live)==null?void 0:C.processes)!=null&&A.length?e.live.processes:e.processes} maxMem=${T}/>
      ${e.mcp_servers.length>0&&r`<div class="proc-section"><h3>MCP Servers</h3>
        ${e.mcp_servers.map(R=>r`<div key=${R.name||R.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${Q(R.name)}</span>
          <span class="fmeta">${Q((R.config||{}).command||"")} ${((R.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function Ip({groupKey:e,groupLabel:t,groupColor:s,tools:n,root:o}){const[l,a]=V(!0),i=n.reduce((d,v)=>d+v.files.length,0),c=n.reduce((d,v)=>d+v.files.reduce((p,m)=>p+m.tokens,0),0);return r`<div class="mb-md">
    <button onClick=${()=>a(!l)} aria-expanded=${l}
      class="flex-row gap-sm cursor-ptr" style="background:none;border:none;padding:var(--sp-3) 0;font:inherit;color:var(--fg);width:100%">
      <span style="font-size:var(--fs-xs);transition:transform 0.15s;${l?"transform:rotate(90deg)":""}">\u25B6</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${s};flex-shrink:0"></span>
      <span class="text-bolder" style="font-size:var(--fs-lg)">${t}</span>
      <span class="badge">${n.length} tools</span>
      <span class="badge">${i} files</span>
      <span class="badge">${z(c)} tok</span>
    </button>
    ${l&&r`<div class="tool-grid" style="margin-top:var(--sp-3)">
      ${n.map(d=>r`<${Lo} key=${d.tool} tool=${d} root=${o}/>`)}
    </div>`}
  </div>`}function Fp(){const{snap:e}=Ge(Ie),[t,s]=V("product"),n=c=>c.files.length||c.processes.length||c.mcp_servers.length||c.live,o=(c,d)=>{const v=c.files.length*2+c.processes.length+c.mcp_servers.length;return d.files.length*2+d.processes.length+d.mcp_servers.length-v||c.tool.localeCompare(d.tool)},l=re(()=>e?e.tools.filter(c=>!c.meta&&n(c)).sort(o):[],[e]),a=re(()=>e?e.tools.filter(c=>c.meta&&c.tool!=="project-env"&&n(c)).sort(o):[],[e]),i=re(()=>{if(t==="product"||!l.length)return null;const c={};return l.forEach(d=>{if(t==="vendor"){const v=d.vendor||"community",p=hr[v]||v,m=hd[v]||"var(--fg2)";c[v]||(c[v]={label:p,color:m,tools:[]}),c[v].tools.push(d)}else{const v=(d.host||"any").split(",");for(const p of v){const m=p.trim(),g=gd[m]||m,x="var(--fg2)";c[m]||(c[m]={label:g,color:x,tools:[]}),c[m].tools.push(d)}}}),Object.entries(c).sort((d,v)=>{const p=d[1].tools.reduce((g,x)=>g+x.files.length,0);return v[1].tools.reduce((g,x)=>g+x.files.length,0)-p})},[l,t]);return e?!l.length&&!a.length?r`<p class="empty-state">No AI tool resources found.</p>`:r`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${xd.map(c=>r`<button key=${c.id}
        class=${t===c.id?"range-btn active":"range-btn"}
        onClick=${()=>s(c.id)}>${c.label}</button>`)}
    </div>
    ${l.length>0&&(i?i.map(([c,d])=>r`<${Ip} key=${c}
      groupKey=${c} groupLabel=${d.label} groupColor=${d.color}
      tools=${d.tools} root=${e.root}/>`):r`<div class="tool-grid">
        ${l.map(c=>r`<${Lo} key=${c.tool} tool=${c} root=${e.root}/>`)}
      </div>`)}
    ${a.length>0&&r`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)">▶</span>
        <span>Project Context</span>
        <span class="badge">${a.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${a.map(c=>r`<${Lo} key=${c.tool} tool=${c} root=${e.root}/>`)}
      </div>
    </details>`}
  </div>`:r`<p class="loading-state">Loading...</p>`}function Np({perCore:e}){if(!e||!e.length)return null;const t=100;return r`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((s,n)=>{const o=Math.max(1,s/t*100),l=s>80?"var(--red)":s>50?"var(--orange)":s>20?"var(--green)":"var(--fg2)";return r`<div key=${n} title=${"Core "+n+": "+_e(s)}
        style=${"flex:1;min-width:3px;background:"+l+";height:"+o+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function jp({mem:e}){var k;const[t,s]=V(!1),[n,o]=V(!1),[l,a]=V(null),[i,c]=V(null),[d,v]=V(!1),p=Ge(Ie),m=(e.file||"").replace(/\\/g,"/").split("/").pop(),g=Re(async()=>{if(t){s(!1);return}if(s(!0),al.has(e.file)){a(al.get(e.file));return}v(!0),c(null);try{const S=await Ho(e.file);a(S)}catch(S){c(S.message)}finally{v(!1)}},[t,e.file]),x=(S,H)=>S.map((D,O)=>r`<span class="pline"><span class="ln">${H+O}</span>${Q(D)||" "}</span>`),L=()=>{if(d)return r`<span class="loading-state">Loading...</span>`;if(i)return r`<span class="error-state">${i}</span>`;if(!l)return null;const S=l.split(`
`),H=S.length;if(H<=nn*3||n)return r`${x(S,1)}
        <div class="prev-actions">
          ${n&&r`<button class="prev-btn" onClick=${()=>o(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
        </div>`;const D=S.slice(-nn),O=H-nn+1;return r`${x(D,O)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>o(!0)}>show all (${H} lines)</button>
        <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
      </div>`},T=e.mtime&&Date.now()/1e3-e.mtime<300,y=(k=p.recentFiles)==null?void 0:k.get(e.file),$=!!y;return r`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${g}
      aria-expanded=${t} title=${e.file}>
      ${$?r`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Nt(y.ts)}">●</span>`:T?r`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Nt(e.mtime)}">●</span>`:r`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${Q(m)}</span>
      <span class="fmeta">${ge(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${T||$?r` <span style="color:${$?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${Nt($?y.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${t&&r`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${L()}</div>`}
  </div>`}function Bp({profile:e,items:t}){const[s,n]=V(t.length<=5),o=t.reduce((l,a)=>l+a.tokens,0);return r`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${Q(e)}</span>
      <span class="badge">${t.length} files</span>
      <span class="badge">${z(o)} tok</span>
    </button>
    ${s&&r`<div>${t.map(l=>r`<${jp} key=${l.file} mem=${l}/>`)}</div>`}
  </div>`}function Hp({source:e,entries:t}){const[s,n]=V(!1),o=re(()=>{const l={};return t.forEach(a=>{(l[a.profile]=l[a.profile]||[]).push(a)}),Object.entries(l)},[t]);return r`<div class="mem-group">
    <button class=${"mem-group-head"+(s?" open":"")} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      ${Q(bd[e]||e)} <span class="badge">${t.length}</span>
      <span class="badge">${z(t.reduce((l,a)=>l+a.tokens,0))} tok</span>
    </button>
    ${s&&r`<div>${o.map(([l,a])=>r`<${Bp} key=${l} profile=${l} items=${a}/>`)}</div>`}
  </div>`}function Wp(){const[e,t]=V(null);if(ie(()=>{Mn().then(n=>{n&&n.ts&&n.ts.length>=2&&t(n)}).catch(()=>{})},[]),!e)return null;const s=e.memory_entries&&e.memory_entries.some(n=>n>0);return r`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${Xt} label="Memory Tokens" value=${z(e.mem_tokens[e.mem_tokens.length-1]||0)}
        data=${[e.ts,e.mem_tokens]} chartColor="var(--accent)" smooth />
      ${s&&r`<${Xt} label="Memory Entries" value=${e.memory_entries[e.memory_entries.length-1]||0}
        data=${[e.ts,e.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function qp(){const{snap:e}=Ge(Ie);if(!e||!e.agent_memory.length)return r`<p class="empty-state">No agent memory found.</p>`;const t=re(()=>{const s={};return e.agent_memory.forEach(n=>{(s[n.source]=s[n.source]||[]).push(n)}),Object.entries(s)},[e.agent_memory]);return r`<${Wp}/>
    ${t.map(([s,n])=>r`<${Hp} key=${s} source=${s} entries=${n}/>`)}`}function Vp(){var n,o,l,a;const{snap:e}=Ge(Ie);if(!e)return r`<p class="empty-state">Loading...</p>`;const t=e.tools.filter(i=>i.live).sort((i,c)=>{var d,v,p,m;return(((d=c.live)==null?void 0:d.outbound_rate_bps)||0)+(((v=c.live)==null?void 0:v.inbound_rate_bps)||0)-((((p=i.live)==null?void 0:p.outbound_rate_bps)||0)+(((m=i.live)==null?void 0:m.inbound_rate_bps)||0))}),s=Object.entries(e.live_monitor&&e.live_monitor.diagnostics||{});return r`<div class="live-stack">
    ${s.length>0&&r`<div class="diag-card">
      <h3>Collector Health</h3>
      <table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${s.map(([i,c])=>r`<tr key=${i}>
          <td class="mono">${i}</td>
          <td>${Q(c.status||"unknown")}</td>
          <td>${Q(c.mode||"unknown")}</td>
          <td>${Q(c.detail||"")}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      ${t.length?r`<table role="table" aria-label="Live tool sessions">
        <thead><tr><th>Tool</th><th>Sessions</th><th>Traffic</th><th>Tokens</th><th>MCP</th><th>Files</th><th>CPU</th><th>Workspace</th><th>State</th></tr></thead>
        <tbody>${t.map(i=>{const c=i.live||{},d=c.token_estimate||{},v=c.mcp||{};return r`<tr key=${i.tool}>
            <td>${Q(i.label)}</td>
            <td>${c.session_count||0} sess / ${c.pid_count||0} pid</td>
            <td>\u2191 ${Ft(c.outbound_rate_bps||0)}<br/>\u2193 ${Ft(c.inbound_rate_bps||0)}</td>
            <td>${z(Bo(c))}<br/><span class="text-muted">${Q(d.source||"network-inference")} @ ${_e((d.confidence||0)*100)}</span></td>
            <td>${v.detected?"YES":"NO"}<br/><span class="text-muted">${v.loops||0} loops @ ${_e((v.confidence||0)*100)}</span></td>
            <td>${c.files_touched||0} touched<br/><span class="text-muted">${c.file_events||0} events</span></td>
            <td>${_e(c.cpu_percent||0)}<br/><span class="text-muted">peak ${_e(c.peak_cpu_percent||0)}</span></td>
            <td>${ge((c.workspace_size_mb||0)*1048576)}<br/><span class="mono text-muted text-xs">${Q((c.workspaces||[]).slice(0,2).join(" | ")||"(unknown)")}</span></td>
            <td>${(c.state_bytes_written||0)>0?ge(c.state_bytes_written||0):"—"}</td>
          </tr>
          ${(c.processes||[]).length>0&&r`<tr key=${i.tool+"-procs"}>
            <td colspan="9" style="padding:var(--sp-1) var(--sp-5);background:var(--bg)">
              <details style="font-size:var(--fs-base)">
                <summary class="cursor-ptr text-muted">${c.processes.length} processes</summary>
                <div class="text-mono" style="margin-top:var(--sp-1);font-size:0.7rem">
                  ${c.processes.sort((p,m)=>(m.cpu_pct||0)-(p.cpu_pct||0)).map(p=>r`<div key=${p.pid} style="display:flex;gap:var(--sp-5);padding:var(--sp-1) 0">
                      <span class="text-muted" style="min-width:5ch">${p.pid}</span>
                      <span class="flex-1 text-ellipsis">${p.name}</span>
                      <span class="text-right" style="color:${p.cpu_pct>5?"var(--orange)":"var(--fg2)"};min-width:5ch">${p.cpu_pct}%</span>
                      <span class="text-right" style="min-width:6ch">${p.mem_mb?ge(p.mem_mb*1048576):""}</span>
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
        ${(((o=e.live_monitor)==null?void 0:o.state_paths)||[]).map(i=>r`<span class="pill mono" key=${"state-"+i}>state: ${i}</span>`)}
        ${!(((l=e.live_monitor)==null?void 0:l.workspace_paths)||[]).length&&!(((a=e.live_monitor)==null?void 0:a.state_paths)||[]).length&&r`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`}function Up(){var L,T,y,$;const{snap:e,globalRange:t}=Ge(Ie),[s,n]=V(null),[o,l]=V([]),[a,i]=V(null),c=re(()=>e?e.tools.filter(k=>!k.meta&&(k.files.length||k.processes.length||k.live)).sort((k,S)=>k.label.localeCompare(S.label)):[],[e]);if(ie(()=>{!s&&c.length&&n(c[0].tool)},[c,s]),ie(()=>{!s||!t||No({tool:s,since:t.since,limit:500,until:t.until}).then(l).catch(()=>l([]))},[s,t]),ie(()=>{!s||!t||Mn({since:t.since,tool:s,until:t.until}).then(k=>{var S;return i(((S=k==null?void 0:k.by_tool)==null?void 0:S[s])||null)}).catch(()=>i(null))},[s,t]),!e)return r`<p class="loading-state">Loading...</p>`;const d=c.find(k=>k.tool===s),v=(L=e.tool_telemetry)==null?void 0:L.find(k=>k.tool===s),p=d==null?void 0:d.live,m=Oe[s]||"var(--fg2)",g={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},x=t.until!=null?new Date(t.since*1e3).toLocaleString(void 0,g)+" – "+new Date(t.until*1e3).toLocaleString(void 0,g):"";return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${c.map(k=>r`<button key=${k.tool}
        class=${s===k.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>n(k.tool)}>
        <span style="color:${Oe[k.tool]||"var(--fg2)"}">${bt[k.tool]||"🔹"}</span>
        ${k.label}
        ${k.live?r`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${s&&r`<Fragment>
        <h3 class="flex-row mb-sm gap-sm">
          <span style="color:${m}">${bt[s]||"🔹"}</span>
          ${(d==null?void 0:d.label)||s}
          ${d!=null&&d.vendor?r`<span class="badge">${hr[d.vendor]||d.vendor}</span>`:""}
          ${v!=null&&v.model?r`<span class="badge mono">${v.model}</span>`:""}
        </h3>

        ${a&&((T=a.ts)==null?void 0:T.length)>=2?r`<div class="es-section">
          <div class="es-section-title">Time Series${x?r` <span class="badge">${x}</span>`:""}</div>
          <div class="es-charts">
            <${Xt} label="CPU %" value=${((y=d==null?void 0:d.live)==null?void 0:y.cpu_percent)!=null?_e(d.live.cpu_percent||0):"-"}
              data=${[a.ts,a.cpu]} chartColor=${m} smooth />
            <${Xt} label="Memory (MB)" value=${(($=d==null?void 0:d.live)==null?void 0:$.mem_mb)!=null?ge((d.live.mem_mb||0)*1048576):"-"}
              data=${[a.ts,a.mem_mb]} chartColor="var(--green)" smooth />
            <${Xt} label="Context (tok)" value=${Ve(a.tokens[a.tokens.length-1]||0)}
              data=${[a.ts,a.tokens]} chartColor="var(--accent)" />
            <${Xt} label="Network (B/s)"
              value=${Ft(p?(p.outbound_rate_bps||0)+(p.inbound_rate_bps||0):a.traffic[a.traffic.length-1]||0)}
              valColor=${p?"var(--orange)":void 0}
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
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${Ve(v.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${Ve(v.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${Ve(v.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${Ve(v.cache_creation_tokens||0)}</div></div>
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
              <span>in: ${Ve(S.input||S.input_tokens||0)} tok \u00B7 out: ${Ve(S.output||S.output_tokens||0)} tok${S.cache_read_tokens?" · cR:"+Ve(S.cache_read_tokens):""}${S.cache_creation_tokens?" · cW:"+Ve(S.cache_creation_tokens):""}${S.cost_usd?" · $"+S.cost_usd.toFixed(2):""}</span>
            </div>`)}
          </div>`}
        </div>`:""}

        ${p?r`<div class="es-section">
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
          <div class="es-section-title">Events (${o.length})</div>
          ${o.length?r`<div class="es-feed">
            ${o.map((k,S)=>{const H=yd[k.kind]||"var(--fg2)",D=new Date(k.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),O=k.detail?Object.entries(k.detail).map(([P,b])=>P+"="+b).join(", "):"";return r`<div key=${k.ts+"-"+k.tool+"-"+S} class="es-event">
                <span class="es-event-time">${D}</span>
                <span class="es-event-kind" style="color:${H}">${k.kind}</span>
                <span class="es-event-detail" title=${O}>${O||"-"}</span>
              </div>`})}
          </div>`:r`<p class="empty-state">No events for this tool in the selected range.</p>`}
        </div>
      </Fragment>`}
    </div>
  </div>`}const Qs=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"],Fi={"claude-opus-4-6":1e6,"claude-opus-4-5":1e6,"claude-sonnet-4-6":1e6,"claude-sonnet-4-5":1e6,"claude-sonnet-4":2e5,"claude-haiku-4-5":2e5,"claude-3-5-sonnet":2e5,"gpt-4.1":1e6,"gpt-4.1-mini":1e6,"gpt-4o":128e3,"gpt-4o-mini":128e3,o3:2e5,"o4-mini":2e5,"gemini-2.5-pro":1e6,"gemini-2.5-flash":1e6};function Ni({always:e,onDemand:t,conditional:s,never:n,total:o}){if(!o)return null;const l=a=>(a/o*100).toFixed(1)+"%";return r`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${e>0&&r`<div style="width:${l(e)};height:100%;background:var(--green)" title="Always loaded: ${z(e)}"></div>`}
    ${t>0&&r`<div style="width:${l(t)};height:100%;background:var(--yellow)" title="On-demand: ${z(t)}"></div>`}
    ${s>0&&r`<div style="width:${l(s)};height:100%;background:var(--orange)" title="Conditional: ${z(s)}"></div>`}
    ${n>0&&r`<div style="width:${l(n)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${z(n)}"></div>`}
  </div>`}function Gp(){const{snap:e,history:t,enabledTools:s}=Ge(Ie),[n,o]=V(null),[l,a]=V(!1);if(ie(()=>{o(null),a(!1),rd().then(o).catch(()=>a(!0))},[]),l)return r`<p class="error-state">Failed to load budget.</p>`;if(!n)return r`<p class="loading-state">Loading...</p>`;const i=b=>s===null||s.includes(b),c=re(()=>{const b=(e==null?void 0:e.tool_configs)||[];for(const C of["claude-code","copilot","copilot-vscode"]){const A=b.find(R=>R.tool===C&&R.model);if(A)return A.model}for(const C of b)if(C.model&&Fi[C.model])return C.model;return""},[e]),d=Fi[c]||2e5,v=n.always_loaded_tokens||0,p=n.total_potential_tokens||0,m=v/d*100,g=p/d*100,x=re(()=>{if(!e)return{};const b={};return e.tools.forEach(C=>{C.tool==="aictl"||!C.token_breakdown||!C.token_breakdown.total||(b[C.tool]=C.token_breakdown)}),b},[e]),L=re(()=>e!=null&&e.tool_telemetry?e.tool_telemetry.filter(b=>i(b.tool)):[],[e,s]),T=re(()=>{if(!e)return[];const b={};return e.tools.forEach(C=>{C.tool==="aictl"||!i(C.tool)||(C.files||[]).forEach(A=>{const R=A.kind||"other";b[R]||(b[R]={kind:R,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),b[R].count++,b[R].tokens+=A.tokens,b[R].size+=A.size;const I=(A.sent_to_llm||"").toLowerCase();I==="yes"?b[R].always+=A.tokens:I==="on-demand"?b[R].onDemand+=A.tokens:I==="conditional"||I==="partial"?b[R].conditional+=A.tokens:b[R].never+=A.tokens})}),Object.values(b).sort((C,A)=>A.tokens-C.tokens)},[e,s]),y=re(()=>{if(!(e!=null&&e.tool_telemetry))return null;const b={},C={};e.tool_telemetry.filter(E=>i(E.tool)).forEach(E=>{(E.daily||[]).forEach(j=>{if(j.date&&(b[j.date]||(b[j.date]={}),C[j.date]||(C[j.date]={}),j.tokens_by_model&&Object.entries(j.tokens_by_model).forEach(([U,G])=>{b[j.date][U]=(b[j.date][U]||0)+G}),j.model)){const U=j.model,G=(j.input_tokens||0)+(j.output_tokens||0);b[j.date][U]=(b[j.date][U]||0)+G,C[j.date][U]||(C[j.date][U]={input:0,output:0,cache_read:0,cache_creation:0}),C[j.date][U].input+=j.input_tokens||0,C[j.date][U].output+=j.output_tokens||0,C[j.date][U].cache_read+=j.cache_read_tokens||0,C[j.date][U].cache_creation+=j.cache_creation_tokens||0}})});const A=new Date,R=[];for(let E=6;E>=0;E--){const j=new Date(A);j.setDate(j.getDate()-E),R.push(j.toISOString().slice(0,10))}const I=R.filter(E=>b[E]&&Object.values(b[E]).some(j=>j>0));if(!I.length)return null;const F=[...new Set(I.flatMap(E=>Object.keys(b[E]||{})))],q=Math.max(...I.map(E=>F.reduce((j,U)=>j+((b[E]||{})[U]||0),0)),1),te=I.some(E=>Object.keys(C[E]||{}).length>0);return{dates:I,models:F,byDate:b,byDateModel:C,maxTotal:q,hasDetail:te}},[e,s]),$=t&&t.ts&&t.ts.length>=2?[t.ts,t.live_tokens||t.ts.map(()=>0)]:null,k=L.reduce((b,C)=>b+(C.input_tokens||0),0),S=L.reduce((b,C)=>b+(C.output_tokens||0),0),H=L.reduce((b,C)=>b+(C.cache_read_tokens||0),0),D=L.reduce((b,C)=>b+(C.cache_creation_tokens||0),0),O=L.reduce((b,C)=>b+(C.total_sessions||0),0),P=L.reduce((b,C)=>b+(C.cost_usd||0),0);return r`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${$?r`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${ac} data=${$} color="var(--green)" height=${60}/>
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
        ${y.dates.map(b=>{const C=y.models.reduce((R,I)=>R+((y.byDate[b]||{})[I]||0),0),A=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return r`<div key=${b} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${A}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${b}: ${z(C)} tokens">
              ${y.models.map((R,I)=>{const F=(y.byDate[b]||{})[R]||0;return F?r`<div key=${R} style="width:${(F/y.maxTotal*100).toFixed(1)}%;height:100%;background:${Qs[I%Qs.length]}" title="${R}: ${z(F)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${z(C)}</span>
          </div>`})}
      </div>
      ${y.hasDetail&&r`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${y.dates.flatMap(b=>{const C=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),A=y.byDateModel[b]||{},R=Object.keys(A).sort();return R.length?R.map((I,F)=>{const q=A[I];return r`<tr key=${b+"-"+I}>
                <td>${F===0?C:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${Qs[y.models.indexOf(I)%Qs.length]};margin-right:3px"></span>${I}</td>
                <td>${z(q.input)}</td><td>${z(q.output)}</td>
                <td class="text-muted">${z(q.cache_read)}</td>
                <td class="text-muted">${z(q.cache_creation)}</td>
                <td class="text-bold">${z(q.input+q.output)}</td>
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
          <tbody>${L.map(b=>{const C=x[b.tool];return r`<tr key=${b.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(Oe[b.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${Q(b.tool)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${b.source}</span> <span class="text-muted">${_e(b.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${z(b.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${z(b.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${z(b.total_sessions||0)}</td>
              <td style="text-align:right">${b.cost_usd>0?"$"+b.cost_usd.toFixed(2):"—"}</td>
              <td>${C?r`<${Ni} always=${C.always_loaded||0} onDemand=${C.on_demand||0}
                conditional=${C.conditional||0} never=${C.never_sent||0} total=${C.total||1}/>`:null}</td>
            </tr>`})}
          ${L.length>1&&r`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${z(k)}</td>
            <td style="text-align:right">${z(S)}</td>
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
    ${T.length>0&&r`<div class="budget-card budget-full">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">By Category</h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Per-category tokens" style="width:100%">
          <thead><tr><th>Category</th><th style="text-align:right">Files</th><th style="text-align:right">Tokens</th><th style="text-align:right">Size</th><th style="width:120px">Distribution</th></tr></thead>
          <tbody>${T.map(b=>r`<tr key=${b.kind}>
            <td>${Q(b.kind)}</td>
            <td style="text-align:right">${b.count}</td>
            <td style="text-align:right" class="text-bold">${z(b.tokens)}</td>
            <td style="text-align:right">${ge(b.size)}</td>
            <td><${Ni} always=${b.always} onDemand=${b.onDemand} conditional=${b.conditional} never=${b.never} total=${b.tokens||1}/></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>`}
  </div>`}function Yp(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const Gn={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function ji({agent:e,tasks:t,now:s}){const n=Gn[e.state]||Gn.active,o=e.ended_at?e.ended_at-e.started_at:s-e.started_at,l=t.filter(a=>a.agent_id===e.agent_id);return r`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${n.bg};color:var(--bg)">${n.label}</span>
      <strong class="text-sm">${Q(e.agent_id)}</strong>
      <span class="text-muted text-xs">${Yp(o)}</span>
      ${e.task&&r`<span class="text-xs mono text-muted">\u2014 ${Q(e.task)}</span>`}
    </div>
    ${l.length>0&&r`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${l.map(a=>{const i=Gn[a.state]||Gn.pending;return r`<div key=${a.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${i.bg};color:var(--bg);font-size:0.6rem;padding:1px 4px">${i.label}</span>
          <span class="mono">${Q(a.name||a.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function Kp({entityState:e}){if(!e||!e.agents||!e.agents.length)return null;const t=e.agents,s=e.tasks||[],n=Date.now()/1e3,o=t.filter(a=>a.state==="active"),l=t.filter(a=>a.state!=="active");return r`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${t.length} agent${t.length>1?"s":""}</span>
      ${o.length>0&&r`<span class="badge text-xs" style="background:var(--green);color:var(--bg)">${o.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${o.map(a=>r`<${ji} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
      ${l.map(a=>r`<${ji} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
    </div>
  </div>`}function Jp({tasks:e}){if(!e||!e.length)return null;const t=e.filter(l=>l.state==="pending"),s=e.filter(l=>l.state==="active"),n=e.filter(l=>l.state==="done");function o({title:l,items:a,color:i}){return r`<div class="tt-column">
      <div class="tt-column-head" style="border-bottom:2px solid ${i}">
        <strong class="text-sm">${l}</strong>
        <span class="text-muted text-xs">${a.length}</span>
      </div>
      <div class="tt-column-body">
        ${a.length?a.map(c=>r`<div key=${c.task_id} class="tt-task-card">
              <div class="text-sm" style="font-weight:500">${Q(c.name||c.task_id)}</div>
              ${c.agent_id&&r`<div class="text-xs text-muted">Agent: ${Q(c.agent_id)}</div>`}
            </div>`):r`<p class="text-muted text-xs" style="padding:var(--sp-3)">None</p>`}
      </div>
    </div>`}return r`<div class="tt-board">
    <${o} title="Pending" items=${t} color="var(--fg3)"/>
    <${o} title="Active" items=${s} color="var(--accent)"/>
    <${o} title="Done" items=${n} color="var(--green)"/>
  </div>`}function tl(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Yt({title:e,icon:t,badge:s,defaultOpen:n,children:o}){const[l,a]=V(n||!1);return r`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>a(i=>!i)}
      aria-expanded=${l}>
      <span class="sd-panel-icon">${t}</span>
      <span class="sd-panel-title">${e}</span>
      ${s!=null&&r`<span class="badge text-xs" style="margin-left:var(--sp-2)">${s}</span>`}
      <span class="sd-panel-arrow">${l?"▲":"▼"}</span>
    </button>
    ${l&&r`<div class="sd-panel-body">${o}</div>`}
  </div>`}function Qp({sessionId:e}){const[t,s]=V([]),[n,o]=V(!0);if(ie(()=>{if(!e)return;o(!0);const a=Math.floor(Date.now()/1e3)-86400;No({sessionId:e,limit:200,since:a}).then(i=>{s(i.reverse()),o(!1)}).catch(()=>o(!1))},[e]),n)return r`<p class="loading-state">Loading events...</p>`;if(!t.length)return r`<p class="empty-state">No events recorded for this session.</p>`;const l={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)"};return r`<div class="sd-events">
    ${t.map((a,i)=>{const c=l[a.kind]||"var(--fg3)",d=a.detail||{},v=d.path||d.name||d.tool_name||a.kind;return r`<div key=${i} class="sd-event-row">
        <span class="sd-event-time">${Nt(a.ts)}</span>
        <span class="sd-event-dot" style="background:${c}"></span>
        <span class="sd-event-kind">${a.kind}</span>
        <span class="sd-event-desc mono text-muted">${Q(String(v))}</span>
      </div>`})}
  </div>`}const Zp={"claude-opus-4-6":1e6,"claude-sonnet-4.6":1e6,"claude-sonnet-4":2e5,"claude-haiku-4.5":2e5,"gpt-5.4":2e5,"gpt-5":128e3},Bi=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],Xp=95;function ef({session:e}){const{snap:t}=Ge(Ie),s=e.files_loaded||[],n=((t==null?void 0:t.tool_configs)||[]).map(g=>g.model).filter(Boolean)[0]||"",o=Zp[n]||2e5,a=(t&&t.agent_memory||[]).reduce((g,x)=>g+(x.tokens||0),0),i=s.length*150,d=Bi.reduce((g,x)=>g+x.tokens,0)+a+i,v=Math.min(d/o*100,100),p=Xp,m=[...Bi,{name:"Memory",tokens:a,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:i,color:"var(--green)"}].filter(g=>g.tokens>0);return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${z(d)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${z(o)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${v>80?"var(--orange)":v>50?"var(--yellow)":"var(--green)"}">${_e(v)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${m.map(g=>{const x=(g.tokens/o*100).toFixed(1);return r`<div key=${g.name} style="width:${x}%;background:${g.color};min-width:${g.tokens>0?"1px":"0"}"
              title="${g.name}: ~${z(g.tokens)} tokens"></div>`})}
        </div>
        <div style="position:absolute;left:${p}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${p}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${m.map(g=>r`<span key=${g.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${g.color};margin-right:2px"></span>
          ${g.name} ${z(g.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${p}%</span>
      </div>
    </div>

    ${s.length>0&&r`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${s.map(g=>r`<div key=${g} class="text-muted" style="padding:2px 0">${Q(g)}</div>`)}
    </div>`}
    ${!s.length&&r`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function tf({session:e}){const{snap:t}=Ge(Ie),s=t&&t.agent_memory||[],n=e.project||"",o=n?s.filter(l=>{const a=l.project||l.tool||"";return!n||a.includes(n.replace(/\\/g,"/").split("/").pop())}):s;return o.length?r`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${o.map((l,a)=>r`<${sf} key=${a} mem=${l}/>`)}
  </div>`:r`<p class="empty-state">No memory entries found${n?" for this project":""}.</p>`}function sf({mem:e}){const[t,s]=V(!1),n=e.name||(e.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",o=(e.content||"").slice(0,300);return r`<div class="sd-memory-entry" style="cursor:pointer" onClick=${()=>s(!t)}>
    <div class="flex-row gap-sm" style="align-items:center">
      <span class="badge text-xs">${e.type||e.source||"file"}</span>
      <strong title=${e.file||e.path||""}>${Q(n)}</strong>
      ${e.tokens?r`<span class="text-muted">${z(e.tokens)} tok</span>`:null}
      ${e.lines?r`<span class="text-muted">${e.lines}ln</span>`:null}
      ${e.profile?r`<span class="text-muted">${Q(e.profile)}</span>`:null}
      <span class="text-muted" style="margin-left:auto;font-size:var(--fs-2xs)">${t?"▲":"▼"}</span>
    </div>
    ${t&&o?r`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${Q(e.content)}${e.content&&e.content.length>300,""}</pre>`:null}
  </div>`}function nf({rateLimits:e}){return!e||!Object.keys(e).length?null:r`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(e).map(([t,s])=>{const n=s.used_pct||s.used_percentage||0,o=n>80?"var(--red)":n>60?"var(--orange)":"var(--green)",l=s.resets_at||"";return r`<div key=${t} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${t} window</span>
            <span style="color:${o};font-weight:600">${_e(n)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(n,100)}%;background:${o};border-radius:4px"></div>
          </div>
          ${l&&r`<div class="text-xs text-muted" style="margin-top:2px">resets ${l}</div>`}
        </div>`})}
    </div>
  </div>`}function lf({session:e}){const t=e.exact_input_tokens||0,s=e.exact_output_tokens||0,[n,o]=V(null);ie(()=>{e.tool&&fr({tool:e.tool,active:!1,limit:20}).then(i=>{if(i.length>1){const c=i.filter(v=>v.duration_s>0).map(v=>v.duration_s),d=c.length?c.reduce((v,p)=>v+p,0)/c.length:0;o({avgDuration:d,sampleCount:i.length})}}).catch(()=>{})},[e.tool]);const l=e.duration_s||0,a=n&&n.avgDuration>0?l/n.avgDuration:null;return r`<div>
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
    ${e.entity_state&&r`<${nf} rateLimits=${e.entity_state.rate_limits}/>`}
  </div>`}function of({project:e}){const[t,s]=V(null);return ie(()=>{e&&ad(7).then(n=>{const o=n.find(l=>l.project===e);s(o||null)}).catch(()=>{})},[e]),t?r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${t.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${z(t.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${z(t.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value">$${t.cost_usd.toFixed(2)}</div></div>
    </div>
    ${t.daily&&t.daily.length>0&&r`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${t.daily.map(n=>{const o=n.input_tokens+n.output_tokens,l=Math.max(...t.daily.map(c=>c.input_tokens+c.output_tokens),1),a=(o/l*100).toFixed(1),i=new Date(n.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return r`<div key=${n.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${i}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${a}%;background:var(--green);border-radius:3px"
              title="${z(o)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${z(o)}</span>
        </div>`})}
    </div>`}
  </div>`:r`<p class="empty-state">No cost data available for this project.</p>`}function af({project:e,tool:t}){const[s,n]=V(null);if(ie(()=>{!e||!t||sd(e,t,30,20).then(n).catch(()=>n([]))},[e,t]),!s||s.length<2)return r`<p class="empty-state">Not enough session history for trend analysis.</p>`;const o=Math.max(...s.map(i=>i.total_tokens),1),l=s.reduce((i,c)=>i+c.duration_s,0)/s.length,a=s.reduce((i,c)=>i+c.total_tokens,0)/s.length;return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${tl(l)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${z(a)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${s.map(i=>{const c=(i.total_tokens/o*100).toFixed(1),d=new Date(i.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),v=l>0?i.duration_s/l:1;return r`<div key=${i.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${d}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${c}%;border-radius:3px;background:${v>1.5?"var(--orange)":v<.7?"var(--green)":"var(--accent)"}" title="${z(i.total_tokens)} tok, ${tl(i.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${z(i.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${tl(i.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function rf({sessionId:e}){const[t,s]=V(null),[n,o]=V(!0);if(ie(()=>{o(!0);const i=Math.floor(Date.now()/1e3)-3600;id(i,100).then(c=>{s(c),o(!1)}).catch(()=>o(!1))},[e]),n)return r`<p class="loading-state">Loading API call data...</p>`;if(!t||!t.calls||!t.calls.length)return r`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;const{calls:l,summary:a}=t;return r`<div>
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
      ${l.slice(0,30).map((i,c)=>{const d=i.status==="error",v=new Date(i.ts*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});return r`<div key=${c} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${v}</span>
          <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${d?"var(--red)":"var(--green)"}"></span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${i.model||"—"}</span>
          ${!d&&r`<span style="width:50px;flex-shrink:0;text-align:right">${i.duration_ms||0}ms</span>`}
          ${!d&&r`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${z(i.input_tokens||0)}in</span>`}
          ${d&&r`<span style="color:var(--red)">${Q(i.error||"error")}</span>`}
        </div>`})}
    </div>
  </div>`}function cf({session:e}){const t=e.files_touched||[],s=e.file_events||0;return t.length?r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${t.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${z(s)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${t.map(n=>r`<div key=${n} class="text-muted" style="padding:2px 0">${Q(n)}</div>`)}
    </div>
  </div>`:r`<p class="empty-state">No file changes recorded.</p>`}function df({session:e,onClose:t}){const s=Oe[e.tool]||"var(--fg2)",n=e.files_loaded||[],o=e.files_touched||[],l=e.exact_input_tokens||0,a=e.exact_output_tokens||0,i=e.entity_state||null,c=i&&i.agents&&i.agents.length>0,d=i&&i.tasks&&i.tasks.length>0;return r`<div class="sd-container" style="border-left:3px solid ${s}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${Q(e.tool)}</strong>
        ${e.project&&r`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${e.project}>${Q(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
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
      <${Qp} sessionId=${e.session_id}/>
    <//>
    ${c&&r`<${Yt} title="Team" icon="\uD83D\uDC65" badge=${i.agents.length+" agents"} defaultOpen=${!0}>
      <${Kp} entityState=${i}/>
    <//>`}
    ${d&&r`<${Yt} title="Tasks" icon="\uD83D\uDCCB" badge=${i.tasks.length} defaultOpen=${!0}>
      <${Jp} tasks=${i.tasks}/>
    <//>`}
    <${Yt} title="Context" icon="\uD83D\uDCDA" badge=${n.length||null}>
      <${ef} session=${e}/>
    <//>
    <${Yt} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${!1}>
      <${tf} session=${e}/>
    <//>
    <${Yt} title="Resources" icon="\u2699\uFE0F" badge=${z(l+a)+" tok"}>
      <${lf} session=${e}/>
    <//>
    <${Yt} title="Deliverables" icon="\uD83D\uDCE6" badge=${o.length||null}>
      <${cf} session=${e}/>
    <//>
    <${Yt} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${!1}>
      <${rf} sessionId=${e.session_id}/>
    <//>
    ${e.project&&r`<${Yt} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${!1}>
      <${of} project=${e.project}/>
    <//>`}
    ${e.project&&e.tool&&r`<${Yt} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${!1}>
      <${af} project=${e.project} tool=${e.tool}/>
    <//>`}
  </div>`}function uf(e,t,s){const n=t-e,o=[300,600,900,1800,3600,7200,10800,21600,43200,86400];let l=o[o.length-1];for(const c of o)if(n/c<=s){l=c;break}const a=Math.ceil(e/l)*l,i=[];for(let c=a;c<=t;c+=l){const d=new Date(c*1e3);let v;l>=86400?v=d.toLocaleDateString([],{month:"short",day:"numeric"}):n>86400?v=d.toLocaleString([],{hourCycle:"h23",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):v=d.toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),i.push({ts:c,label:v})}return i}function pf(e){return e>=3600?(e/3600).toFixed(1)+"h":e>=60?Math.round(e/60)+"m":Math.round(e)+"s"}function Hi(e,t,s,n){const o=e.duration_s||(e.ended_at||n)-e.started_at,l=new Date(e.started_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),a=e.ended_at?new Date(e.ended_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):"now",i=[pf(o)];e.conversations&&i.push(e.conversations+" conv"),e.subagents&&i.push(e.subagents+" agents"),e.source_files?i.push(e.source_files+" src files"):e.unique_files&&i.push(e.unique_files+" files"),e.bytes_written>1024&&i.push(ge(e.bytes_written));const c=!e.ended_at;return r`<div class="stl-tip">
    <div class="stl-tip-head">
      <span style=${"color:"+t}>${s}</span>
      <strong>${e.tool}</strong>
      ${c?r`<span class="badge" style="font-size:9px;background:var(--green);color:#000">live</span>`:""}
    </div>
    <div class="stl-tip-time">${l} – ${a}</div>
    <div class="stl-tip-stats">${i.join(" · ")}</div>
    ${e.project?r`<div class="stl-tip-proj">${e.project.replace(/\\/g,"/").split("/").pop()}</div>`:""}
  </div>`}function ff({sessions:e,rangeSeconds:t,onSelect:s}){const n=Date.now()/1e3,o=t||86400,l=n-o,a=(e||[]).filter(O=>(O.ended_at||n)>=l&&O.started_at<=n),i=a.filter(O=>O.ended_at).sort((O,P)=>O.started_at-P.started_at),c=a.filter(O=>!O.ended_at).sort((O,P)=>O.started_at-P.started_at),d=[],v=[];for(const O of i){const P=Math.max(O.started_at,l),b=O.ended_at;let C=-1;for(let A=0;A<d.length;A++)if(P>=d[A]+2){d[A]=b,C=A;break}C<0&&(C=d.length,d.push(b)),v.push(C)}const p=10,m=2,g=18,x=14,L=Math.max(d.length,0),T=L>0?L*(p+m)+m:0,y=c.length>0?x+m*2:0,$=T>0&&y>0?1:0,k=T+$+y,S=Math.max(k,20)+g,H=uf(l,n,8),D=O=>(Math.max(O,l)-l)/o*100;return r`<div class="stl">
    <div class="stl-chart" style=${"height:"+S+"px"}>
      ${H.map(O=>r`<div key=${O.ts} class="stl-grid"
        style=${"left:"+D(O.ts).toFixed(2)+"%;bottom:"+g+"px"} />`)}

      <!-- ended session bars -->
      ${i.map((O,P)=>{const b=Math.max(O.started_at,l),C=D(b),A=Math.max(.15,D(O.ended_at)-C),R=v[P]*(p+m)+m,I=Oe[O.tool]||"var(--fg2)",F=bt[O.tool]||"🔹";return r`<div key=${O.session_id} class="stl-bar"
          style=${"left:"+C.toFixed(2)+"%;width:"+A.toFixed(2)+"%;top:"+R+"px;height:"+p+"px;background:"+I}
          onClick=${()=>s&&s(O)}>
          ${Hi(O,I,F,n)}
        </div>`})}

      <!-- divider between ended and live -->
      ${$?r`<div class="stl-divider" style=${"top:"+T+"px"} />`:""}

      <!-- live session markers -->
      ${c.map(O=>{const P=D(O.started_at),b=T+$+m,C=Oe[O.tool]||"var(--fg2)",A=bt[O.tool]||"🔹";return r`<div key=${O.session_id} class="stl-marker"
          style=${"left:"+P.toFixed(2)+"%;top:"+b+"px;background:"+C}
          onClick=${()=>s&&s(O)}>
          ${Hi(O,C,A,n)}
        </div>`})}

      <div class="stl-axis" style=${"top:"+(S-g)+"px"}>
        ${H.map(O=>r`<span key=${O.ts} class="stl-tick"
          style=${"left:"+D(O.ts).toFixed(2)+"%"}>${O.label}</span>`)}
      </div>
    </div>
  </div>`}function Do(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function ic(e){let t=0;for(const s of e)(s.role==="lead"||s.role==="teammate"||s.role==="subagent")&&t++,t+=ic(s.children||[]);return t}function Wi({session:e,onSelect:t,isSelected:s,agentTeams:n}){const o=Oe[e.tool]||"var(--fg2)",l=bt[e.tool]||"🔹",a=(n||[]).find(d=>d.session_id===e.session_id),i=a?a.agent_count:ic(e.process_tree||[]),c=i>1;return r`<div class="diag-card" style="border-left:3px solid ${o};cursor:pointer;${s?"outline:2px solid var(--accent);outline-offset:-2px":""}"
    onClick=${()=>t(e)}>
    <div class="flex-row gap-sm mb-sm">
      <span style="font-size:var(--fs-2xl)">${l}</span>
      <strong style="font-size:var(--fs-lg)">${Q(e.tool)}</strong>
      ${c&&r`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">Team (${i})</span>`}
      ${e.project&&r`<span class="text-muted text-xs mono text-ellipsis" style="max-width:150px"
        title=${e.project}>${Q(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
      <span class="badge" style="margin-left:auto;background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Duration</div><div class="value">${Do(e.duration_s)}</div></div>
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
  </div>`}function vf(){const{snap:e}=Ge(Ie),t=e&&e.agent_teams||[];if(!t.length)return null;const s=t.reduce((l,a)=>l+a.agent_count,0),n=t.reduce((l,a)=>l+(a.total_input_tokens||0),0),o=t.reduce((l,a)=>l+(a.total_output_tokens||0),0);return r`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Agent Teams
      <span class="badge">${t.length} sessions</span>
      <span class="badge">${s} agents</span>
      <span class="badge">${z(n+o)} tok</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      ${t.sort((l,a)=>(a.total_input_tokens||0)-(l.total_input_tokens||0)).slice(0,8).map(l=>r`
        <${hf} key=${l.session_id} team=${l}/>
      `)}
    </div>
  </div>`}function mf(e){return e?e.replace("claude-","").replace("-20251001",""):"?"}function hf({team:e}){const[t,s]=V(!1),[n,o]=V(e.agents||null),[l,a]=V(!1);e.models,ie(()=>{!t||n||(a(!0),nd(e.session_id).then(p=>{o(p.agents||[]),a(!1)}).catch(()=>{o([]),a(!1)}))},[t]);const i=(n||[]).filter(p=>(p.input_tokens||0)+(p.output_tokens||0)>50),c=(n||[]).length-i.length,d=i.sort((p,m)=>m.input_tokens+m.output_tokens-(p.input_tokens+p.output_tokens)),v=d[0]?(d[0].input_tokens||0)+(d[0].output_tokens||0):1;return r`<div class="diag-card" style="border-left:3px solid var(--accent);padding:var(--sp-4)">
    <div class="flex-row gap-sm mb-sm" style="align-items:center;cursor:pointer" onClick=${()=>s(!t)}>
      <span class="badge" style="background:var(--accent);color:var(--bg)">${e.agent_count||i.length} agents${c?r` <span style="opacity:0.6">+${c}w</span>`:null}</span>
      <span class="text-muted text-xs">${z(e.total_input_tokens||0)}in / ${z(e.total_output_tokens||0)}out</span>
      ${(e.tools_used||[]).length>0&&r`<span class="text-muted text-xs">${e.tools_used.join(", ")}</span>`}
      <span class="mono text-xs text-muted" style="margin-left:auto" title=${e.session_id}>${e.session_id.slice(0,12)}\u2026</span>
      <span class="text-xs text-muted">${t?"▲":"▼"}</span>
    </div>
    <!-- Agent rows: show loading, or compact agent rows with task + tokens -->
    ${l?r`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading agents\u2026</div>`:r`<div style="display:flex;flex-direction:column;gap:1px">
      ${d.slice(0,t?999:5).map(p=>{const m=(p.input_tokens||0)+(p.output_tokens||0),g=Math.max(1,m/v*100);return r`<div key=${p.agent_id} style="display:grid;
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
          <span class="text-muted" style="font-size:var(--fs-2xs)">${mf(p.model)}</span>
          ${p.completed?r`<span class="text-green">\u2713</span>`:r`<span class="text-orange">\u25CB</span>`}
        </div>`})}
      ${!t&&d.length>5?r`<div class="text-muted text-xs cursor-ptr" style="padding:2px var(--sp-2)"
        onClick=${p=>{p.stopPropagation(),s(!0)}}>+${d.length-5} more agents\u2026</div>`:null}
    </div>`}
  </div>`}function gf(){const{snap:e,globalRange:t,rangeSeconds:s,enabledTools:n}=Ge(Ie),[o,l]=V([]),[a,i]=V(!1),[c,d]=V(!0),[v,p]=V(null),[m,g]=V(null),[x,L]=V([]);ie(()=>{d(!0),i(!1),fr({active:!1}).then(b=>{l(b),d(!1)}).catch(()=>{i(!0),d(!1)})},[]),ie(()=>{if(!t)return;const b=Math.min(t.since,Date.now()/1e3-86400);jo(null,{since:b,until:t.until}).then(L).catch(()=>L([]))},[t]),ie(()=>{const b=C=>{const A=C.detail;A&&A.session_id&&(p(A.session_id),g(A))};return window.addEventListener("aictl-session-select",b),()=>window.removeEventListener("aictl-session-select",b)},[]);const T=b=>n===null||n.includes(b),y=(e&&e.sessions||[]).filter(b=>T(b.tool)),$=o.filter(b=>T(b.tool)),k=x.filter(b=>T(b.tool));let S=y.find(b=>b.session_id===v);if(!S&&v){const C=o.find(A=>A.session_id===v)||m;C&&C.session_id===v&&(S={session_id:C.session_id,tool:C.tool,project:C.project||"",duration_s:C.duration_s||0,active:C.active||!1,started_at:C.started_at,ended_at:C.ended_at,files_touched:[],files_loaded:[],exact_input_tokens:C.input_tokens||0,exact_output_tokens:C.output_tokens||0,pids:[],file_events:C.files_modified||0})}const H=b=>{p(C=>C===b.session_id?null:b.session_id)},D={};for(const b of y){const C=b.project||"Unknown Project";D[C]||(D[C]=[]),D[C].push(b)}const O=Object.keys(D).sort();return r`<div>
    <div class="mb-lg">
      <${ff} sessions=${k} rangeSeconds=${s}
        onSelect=${b=>{p(b.session_id),g(b)}}/>
    </div>

    <${vf}/>

    ${S&&r`<${df} session=${S}
      onClose=${()=>p(null)}/>`}

    <div class="es-section">
      <div class="es-section-title">Active Sessions (${y.length})</div>
      ${y.length?O.length>1?O.map(b=>r`<div key=${b} style="margin-bottom:var(--sp-5)">
              <div class="text-muted text-sm mono" style="margin-bottom:var(--sp-3);font-weight:600">
                ${Q(b.replace(/\\/g,"/").split("/").pop()||b)}
                <span class="text-xs" style="font-weight:400"> \u2014 ${D[b].length} session${D[b].length>1?"s":""}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
                ${D[b].map(C=>r`<${Wi} key=${C.session_id} session=${C}
                  onSelect=${H} isSelected=${C.session_id===v} agentTeams=${e==null?void 0:e.agent_teams}/>`)}
              </div>
            </div>`):r`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
              ${y.map(b=>r`<${Wi} key=${b.session_id} session=${b}
                onSelect=${H} isSelected=${b.session_id===v}/>`)}
            </div>`:r`<div class="empty-state">
            <p>No active sessions.</p>
            ${$.length>0&&r`<div class="diag-card" style="margin-top:var(--sp-4);max-width:400px">
              <div class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Last session</div>
              <div class="flex-row gap-sm" style="align-items:center">
                <span style="color:${Oe[$[0].tool]||"var(--fg2)"}">${bt[$[0].tool]||"🔹"}</span>
                <strong>${Q($[0].tool)}</strong>
                <span class="text-muted text-xs">${Do($[0].duration_s)}</span>
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
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr></thead>
                <tbody>${$.map(b=>{const C=Oe[b.tool]||"var(--fg2)",A=bt[b.tool]||"🔹",R=b.session_id?b.session_id.length>12?b.session_id.slice(0,12)+"…":b.session_id:"—";return r`<tr key=${b.session_id} style="cursor:pointer;${b.session_id===v?"background:var(--bg2)":""}"
                    onClick=${()=>{p(b.session_id===v?null:b.session_id),g(null)}}>
                    <td>
                      <span style="color:${C};margin-right:var(--sp-2)">${A}</span>
                      ${Q(b.tool)}
                    </td>
                    <td><span class="mono" title=${b.session_id} style="font-size:0.7rem">${R}</span></td>
                    <td>${Do(b.duration_s)}</td>
                    <td>${b.active?r`<span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>`:r`<span class="badge" style="font-size:var(--fs-xs)">ended</span>`}</td>
                    <td>${b.ended_at?Nt(b.ended_at):"—"}</td>
                  </tr>`})}</tbody>
              </table>`:r`<p class="empty-state">No past sessions recorded.</p>`}
    </div>
  </div>`}function qi(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const o=n.match(/[\d.]+/g);return o&&o.length>=3?`rgba(${o[0]},${o[1]},${o[2]},${t})`:`rgba(100,100,100,${t})`}function _f(e,t,s){let n;return{hooks:{init(o){n=document.createElement("div"),n.className="chart-tooltip",n.style.display="none",o.over.appendChild(n)},setCursor(o){var v;const l=o.cursor.idx;if(l==null){n.style.display="none";return}const a=[];for(let p=1;p<o.series.length;p++){const m=(v=o.data[p])==null?void 0:v[l];m!=null&&a.push(t?t(m):z(m))}if(!a.length){n.style.display="none";return}const i=o.data[0][l],c=s?new Date(i*1e3).toLocaleTimeString([],{hourCycle:"h23"}):e?e(i):z(i);n.innerHTML=`<b>${a.join(", ")}</b> ${c}`;const d=Math.round(o.valToPos(i,"x"));n.style.left=Math.min(d,o.over.clientWidth-100)+"px",n.style.display=""}}}}const $f=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function bf(e){return e==null||e===0?"0":e>=1e6?Math.round(e/1e6)+"M":e>=1e3?Math.round(e/1e3)+"K":e>=1?Math.round(e).toString():e.toPrecision(1)}function yf(e,t,s,n){const o=Math.max(0,Math.floor(Math.log10(Math.max(1,s)))),l=Math.ceil(Math.log10(Math.max(1,n))),a=[];for(let c=o;c<=l;c++)a.push(Math.pow(10,c));if(a.length<=3)return a;const i=Math.floor((o+l)/2);return[Math.pow(10,o),Math.pow(10,i),Math.pow(10,l)]}function io({mode:e,data:t,labels:s,colors:n,height:o,isTime:l,fmtX:a,fmtY:i,xLabel:c,yLabel:d,logX:v}){const p=ot(null),m=ot(null),g=o||200;return ie(()=>{if(!p.current||!t||t.length<2||!t[0]||t[0].length<2)return;try{m.current&&(m.current.destroy(),m.current=null)}catch{m.current=null}const x=t.length-1,L=n||$f,T=[{}];for(let $=0;$<x;$++){const k=L[$%L.length],S=qi(k,.6);e==="scatter"?T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:"transparent",paths:()=>null,points:{show:!0,size:8,fill:S,stroke:"transparent",width:0}}):T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:k,width:1.5,fill:qi(k,.08),points:{show:!1}})}const y={width:p.current.clientWidth||300,height:g,padding:[8,8,0,0],cursor:{show:!0,x:!0,y:!1,points:{show:e!=="scatter"}},legend:{show:!1},select:{show:!1},scales:{x:{time:!!l,...v?{distr:3,log:10}:{}},y:{auto:!0,range:($,k,S)=>[Math.max(0,k*.9),S*1.1||1]}},axes:[{show:!0,size:28,gap:2,...v?{splits:yf}:{},values:l?void 0:($,k)=>k.map(S=>v?bf(S):a?a(S):z(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}},{show:!0,size:50,gap:2,values:($,k)=>k.map(S=>i?i(S):z(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}}],series:T,plugins:[_f(a,i,l)]};try{m.current=new nt(y,t,p.current)}catch($){console.warn("AnalyticsChart: uPlot init failed",$),m.current=null}return()=>{try{m.current&&(m.current.destroy(),m.current=null)}catch{}}},[t,e,n,s,l,v,g]),ie(()=>{if(!m.current||!p.current)return;const x=new ResizeObserver(()=>{m.current&&p.current&&m.current.setSize({width:p.current.clientWidth,height:g})});return x.observe(p.current),()=>x.disconnect()},[g]),r`<div class="analytics-chart-wrap" style=${"height:"+g+"px"} ref=${p}></div>`}function xf(e){const t={};for(const s of e){const n=typeof s=="string"?s:s.metric;if(!n)continue;const o=n.split("."),l=o.length>1?o.slice(0,-1).join("."):"(ungrouped)";(t[l]=t[l]||[]).push({name:n,count:s.count||0,lastValue:s.last_value})}return Object.entries(t).sort((s,n)=>s[0].localeCompare(n[0]))}function kf(){const[e,t]=V([]),[s,n]=V(null),[o,l]=V(null),[a,i]=V([]),[c,d]=V(!1),[v,p]=V(null);ie(()=>{dd().then(T=>{t(T||[]),p(null)}).catch(T=>{t([]),p(T.message)})},[]);const m=re(()=>xf(e),[e]),g=Re(T=>{n(T),l(null),i([]),d(!0);const y=Math.floor(Date.now()/1e3)-1800,$=ud(T,y).then(S=>l(S)).catch(()=>l(null)),k=pd(T,y).then(S=>i(Array.isArray(S)?S:[])).catch(()=>i([]));Promise.allSettled([$,k]).then(()=>d(!1))},[]),x=re(()=>!o||!o.value||!o.value.length?null:o.value[o.value.length-1],[o]),L=re(()=>{const T=new Set;for(const y of a)y.tags&&Object.keys(y.tags).forEach($=>T.add($));return[...T].sort()},[a]);return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${v&&r`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${Q(v)}</p>`}
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

        ${!c&&o&&o.ts&&o.ts.length>=2?r`<div class="es-section">
          <div class="es-section-title">Time Series (last 30m)</div>
          <${Xt}
            label=${s.split(".").pop()}
            value=${x!=null?z(x):"-"}
            data=${[o.ts,o.value]}
            chartColor="var(--accent)"
            smooth />
        </div>`:""}

        ${!c&&o&&o.ts&&o.ts.length<2&&r`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">Not enough data points to chart.</p>
        </div>`}

        ${!c&&!o&&!c&&r`<div class="es-section">
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
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${_r(T.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${z(T.value)}</td>
                  ${L.map($=>r`<td key=${$} style="padding:var(--sp-2) var(--sp-4)">
                    ${T.tags&&T.tags[$]!=null?r`<span class="badge">${T.tags[$]}</span>`:"-"}
                  </td>`)}
                </tr>`)}
              </tbody>
            </table>
          </div>
        </div>`}

        ${!c&&a.length===0&&o&&r`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples</div>
          <p class="empty-state">No raw samples in the last 30 minutes.</p>
        </div>`}
      </Fragment>`}
    </div>
  </div>`}const sn=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function ds(e){return e>=1e3?z(e/1e3)+"s":Math.round(e)+"ms"}function wf(e){return"#"+Math.round(e)}function ro(e){return(e||"").split("/").slice(-2).join("/")}function Sf({data:e}){if(!e||!e.requests||!e.requests.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <p class="empty-state">No request data in this time range.</p>
    </div>`;const t=e.requests,s=re(()=>{const c=t.map(v=>v.ts),d=t.map(v=>v.duration_ms);return[c,d]},[t]),n=re(()=>{const c=[...new Set(t.map(g=>g.model||"(unknown)"))],d=c.map(()=>[]),p=[...t.filter(g=>g.input_tokens>0)].sort((g,x)=>g.input_tokens-x.input_tokens),m=p.map(g=>g.input_tokens);for(const g of c)d[c.indexOf(g)]=p.map(x=>(x.model||"(unknown)")===g?x.duration_ms:null);return{data:[m,...d],labels:c,colors:sn.slice(0,c.length)}},[t]),o=e.by_model||[],l=Math.max(1,...o.map(c=>c.p95_ms)),a=re(()=>{const c=[...new Set(t.map(g=>g.model||"(unknown)"))],v=[...t.filter(g=>g.seq>0)].sort((g,x)=>g.seq-x.seq),p=v.map(g=>g.seq),m=c.map(g=>v.map(x=>(x.model||"(unknown)")===g?x.duration_ms:null));return{data:[p,...m],labels:c,colors:sn.slice(0,c.length)}},[t]),i=t.length?t[t.length-1].duration_ms:0;return r`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${ds(i)}</span></div>
        <${io} mode="line" data=${s} isTime=${!0} fmtY=${ds} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${t.length} requests</span></div>
        <${io} mode="scatter" data=${n.data} labels=${n.labels}
          colors=${n.colors} fmtX=${z} fmtY=${ds} logX=${!0} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${o.map((c,d)=>r`<div key=${c.model} class="hbar-row">
            <span class="hbar-label" title=${c.model}>${c.model.replace(/^claude-/,"")||c.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${"width:"+Math.round(c.avg_ms/l*100)+"%;background:"+sn[d%sn.length]}></div>
              <div class="hbar-p95" style=${"left:"+Math.round(c.p95_ms/l*100)+"%"} title=${"p95: "+ds(c.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ds(c.avg_ms)}</span>
            <span class="badge">${c.count}</span>
          </div>`)}
        </div>
        ${o.length>0&&r`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${io} mode="scatter" data=${a.data} labels=${a.labels}
          colors=${a.colors} fmtX=${wf} fmtY=${ds} logX=${!0} height=${200}/>
      </div>
    </div>
  </div>`}const Tf={"claude-code":"#8b5cf6",codex:"#f97316",aider:"#06b6d4",cursor:"#f472b6"};function rc(e,t){return Tf[e]||sn[t%sn.length]}function Vi({by_cli:e,total:t,barWidth:s,cliTools:n}){return!e||!e.length?r`<div class="hbar-fill" style=${"width:"+s+"%;background:var(--accent)"}></div>`:e.map((o,l)=>{const a=o.count/t*s,i=rc(o.cli_tool,n.indexOf(o.cli_tool));return r`<div key=${o.cli_tool}
      style=${"width:"+a.toFixed(1)+"%;background:"+i+";height:100%;display:inline-block"}
      title=${o.cli_tool+": "+o.count}></div>`})}function Cf({data:e}){if(!e||!e.invocations||!e.invocations.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      <p class="empty-state">${e!=null&&e.total_all_time?"No tool invocation data in this time range. Try a wider range ("+e.total_all_time+" invocations exist).":"No tool invocation data yet. Configure Claude Code hooks to capture tool usage."}</p>
    </div>`;const t=e.invocations,s=e.cli_tools||[],n=Math.max(1,...t.map(l=>l.count)),o=Math.max(1,...t.map(l=>l.p95_ms));return r`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    ${s.length>1&&r`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${s.map((l,a)=>r`<span key=${l} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${"width:10px;height:10px;border-radius:2px;background:"+rc(l,a)}></span>
        ${l}
      </span>`)}
    </div>`}
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Invocation Frequency</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${t.reduce((l,a)=>l+a.count,0)} total</span></div>
        <div class="hbar-list">
          ${t.slice(0,15).map(l=>r`<div key=${l.tool_name} class="hbar-row">
            <span class="hbar-label" title=${l.tool_name}>${l.tool_name}</span>
            <div class="hbar-track" style="overflow:hidden">
              <${Vi} by_cli=${l.by_cli} total=${l.count}
                barWidth=${Math.round(l.count/n*100)} cliTools=${s}/>
            </div>
            <span class="hbar-value">${z(l.count)}</span>
            ${l.error_count?r`<span class="badge" style="color:var(--red)">${l.error_count} err</span>`:""}
          </div>`)}
        </div>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Execution Duration</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">avg + p95</span></div>
        <div class="hbar-list">
          ${t.slice(0,15).map((l,a)=>r`<div key=${l.tool_name} class="hbar-row">
            <span class="hbar-label" title=${l.tool_name}>${l.tool_name}</span>
            <div class="hbar-track">
              <${Vi} by_cli=${l.by_cli} total=${l.count}
                barWidth=${Math.round(l.avg_ms/o*100)} cliTools=${s}/>
              <div class="hbar-p95" style=${"left:"+Math.round(l.p95_ms/o*100)+"%"} title=${"p95: "+ds(l.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ds(l.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`}function Mf({data:e}){const[t,s]=V(!1);if(!e)return null;const n=e.memory_timeline||{},o=e.memory_events||[],l=Object.keys(n);if(!l.length&&!o.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <p class="empty-state">No file write data in this time range.</p>
    </div>`;const a=t?l:l.slice(0,6);return r`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>

    ${l.length>0&&r`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${l.length} files)</div>
      <div class="analytics-charts">
        ${a.map(i=>{const c=n[i];if(!c||c.ts.length<2)return r`<div key=${i} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${i}>${ro(i)}</span>
              <span class="chart-val text-muted">${c&&c.size_bytes.length?ge(c.size_bytes[c.size_bytes.length-1]):"-"}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;const d=c.size_bytes[c.size_bytes.length-1];return r`<div key=${i} class="diag-card">
            <${Xt} label=${ro(i)} value=${ge(d)}
              data=${[c.ts,c.size_bytes]} chartColor="var(--accent)"/>
          </div>`})}
      </div>
      ${l.length>6&&!t&&r`<button class="range-btn" style="margin-top:var(--sp-2)"
        onClick=${()=>s(!0)}>Show all ${l.length} files</button>`}
    </div>`}

    ${o.length>0&&r`<div>
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Recent File Writes (${o.length})</div>
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
            ${o.slice(0,30).map((i,c)=>r`<tr key=${c}
              style="border-bottom:1px solid var(--border);${c%2?"background:var(--bg2)":""}">
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${_r(i.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${i.path}>${ro(i.path)}</td>
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
  </div>`}function Ef(){const e=Ge(Ie),t=e==null?void 0:e.globalRange,[s,n]=V(null),[o,l]=V(!0),[a,i]=V(null);return ie(()=>{l(!0),i(null);const c=(t==null?void 0:t.since)||Date.now()/1e3-86400,d=(t==null?void 0:t.until)||"",v=`/api/analytics?since=${c}${d?"&until="+d:""}`,p=new AbortController,m=setTimeout(()=>p.abort(),15e3);return od(v,{signal:p.signal}).then(g=>{n(g),i(null)}).catch(g=>{g.name==="AbortError"?i("Request timed out"):(n(null),i(g.message))}).finally(()=>{clearTimeout(m),l(!1)}),()=>{clearTimeout(m),p.abort()}},[t==null?void 0:t.since,t==null?void 0:t.until]),r`<div class="analytics-grid">
    ${o&&r`<p class="loading-state">Loading analytics...</p>`}
    ${a&&r`<p class="error-state">Error: ${a}</p>`}
    ${!o&&!a&&r`<Fragment>
      <${Sf} data=${s==null?void 0:s.response_time}/>
      <${Cf} data=${s==null?void 0:s.tools}/>
      <${Mf} data=${s==null?void 0:s.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <div style="margin-top:var(--sp-4)"><${kf}/></div>
      </details>
    </Fragment>`}
  </div>`}function us(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function cc(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Lf(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"})}function dc(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function Ui(e){return e?e.replace("claude-","").replace(/-\d{8}$/,""):""}function Df(e,t){if(!t)return"";let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{return t.slice(0,80)}if(typeof s!="object"||s===null)return String(t).slice(0,80);const n=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const l of n)if(s[l]){let a=String(s[l]);return(l==="file_path"||l==="path")&&a.length>60&&(a=".../"+a.replace(/\\/g,"/").split("/").slice(-2).join("/")),a.slice(0,100)}const o=Object.keys(s);return o.length>0?String(s[o[0]]).slice(0,80):""}const Gi=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],Yi={Bash:"#1a1a1a"};function Ki(e){if(Yi[e])return Yi[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return Gi[t%Gi.length]}function Af(e,t){const s=new Set,n=[],o=(l,a,i)=>{s.has(l)||(s.add(l),n.push({id:l,label:a||l,color:i||"var(--fg2)"}))};o("user","User","var(--green)"),o("tool",t||"AI Tool",Oe[t]||"var(--accent)");for(const l of e){if((l.type==="api_call"||l.type==="api_response"||l.type==="error")&&o("api","API","var(--accent)"),l.type==="tool_use"){const a=l.to||"tool";o("skill:"+a,a,Ki(a))}if(l.type==="subagent"){const a=l.to||"Subagent";o("subagent:"+a,a,Ki(a))}l.type==="hook"&&o("hook","Hooks","var(--orange)")}return n}function Of({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:r`<div class="sf-tool-tabs">
    ${e.map(n=>r`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?Oe[n]||"var(--accent)":"transparent"};color:${Oe[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${bt[n]||"🔹"}</span> ${Q(n)}
    </button>`)}
  </div>`}function Pf(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function zf({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?r`<div class="sf-sess-tabs">
    ${e.map(o=>{const l=o.exact_input_tokens||o.input_tokens||0,a=o.exact_output_tokens||o.output_tokens||0,i=l+a,c=o.duration_s||(o.ended_at&&o.started_at?o.ended_at-o.started_at:0),d=o.session_id===t,v=!o.ended_at;return r`<button key=${o.session_id}
        title=${o.session_id}
        class="sf-sess-tab ${d?"active":""}"
        onClick=${()=>s(o.session_id)}>
        <span class="sf-stab-time">${Lf(o.started_at)}</span>
        <span class="sf-stab-sid">${Pf(o.session_id)}</span>
        <span class="sf-stab-dur">${cc(c)}</span>
        ${i>0&&r`<span class="sf-stab-tok">${z(i)}t</span>`}
        ${(o.files_modified||0)>0&&r`<span class="sf-stab-files">${o.files_modified}f</span>`}
        ${v&&r`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:r`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function Rf({event:e}){if(e.type==="user_message")return e.redacted?r`<div class="sf-seq-tooltip">
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
      <div class="sf-tip-body">${Q(e.message)}</div>
      ${e.prompt_length&&r`<div class="sf-tip-meta">${e.prompt_length} chars</div>`}
    </div>`:null;if(e.type==="api_call"){const t=e.tokens||{};return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Call${e.model?" — "+e.model:""}</div>
      ${e.agent_name&&r`<div class="sf-tip-meta">Agent: ${Q(e.agent_name)}</div>`}
      <div class="sf-tip-meta">
        Input: ${z(t.input||0)} \u00B7 Output: ${z(t.output||0)}
        ${(t.cache_read||0)>0?" · Cache: "+z(t.cache_read):""}
      </div>
      <div class="sf-tip-meta">
        ${e.duration_ms>0?"Duration: "+us(e.duration_ms):""}
        ${e.ttft_ms>0?" · TTFT: "+us(e.ttft_ms):""}
      </div>
      ${e.is_error&&r`<div class="sf-tip-meta" style="color:var(--red)">Error: ${Q(e.error_type||"unknown")}</div>`}
    </div>`}if(e.type==="api_response"){const t=e.tokens||{};return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${e.model?" — "+e.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${z(t.output||0)} tokens
        ${e.duration_ms>0?" · Latency: "+us(e.duration_ms):""}
        ${e.finish_reason?" · "+e.finish_reason:""}
      </div>
      ${e.response_preview&&r`<div class="sf-tip-body">${Q(e.response_preview)}</div>`}
    </div>`}if(e.type==="error")return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${Q(e.error_type||"unknown")}</div>
      ${e.error_message&&r`<div class="sf-tip-body">${Q(e.error_message)}</div>`}
      ${e.parent_span&&r`<div class="sf-tip-meta">During: ${Q(e.parent_span)}</div>`}
    </div>`;if(e.type==="tool_use"){let t=null;if(e.params){let s=e.params;if(typeof s=="string")try{s=JSON.parse(s)}catch{s=null}s&&typeof s=="object"&&(t=Object.entries(s).filter(([n,o])=>o!=null&&o!==""))}return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${Q(e.to||"Tool")}${e.subtype==="result"?" (result)":e.subtype==="decision"?" (decision)":""}</div>
      ${e.decision&&r`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${Q(e.decision)}</strong></div>`}
      ${t?r`<div class="sf-tip-params">
            ${t.map(([s,n])=>{const o=String(n),l=o.length>120;return r`<div key=${s} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${Q(s)}</span>
                <span class="sf-tip-param-val ${l?"sf-tip-param-long":""}" title=${o}>${Q(l?o.slice(0,200)+"...":o)}</span>
              </div>`})}
          </div>`:e.params&&r`<div class="sf-tip-body mono">${Q(e.params)}</div>`}
      ${(e.success||e.duration_ms>0||e.result_size)&&r`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${e.success?"Success: "+e.success:""}
        ${e.duration_ms>0?" · "+us(e.duration_ms):""}
        ${e.result_size?" · Result: "+e.result_size+" bytes":""}
      </div>`}
    </div>`}return e.type==="subagent"?r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${Q(e.to||"agent")}</div>
    </div>`:e.type==="hook"?r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${Q(e.hook_name||"")}</div>
    </div>`:null}function If({event:e,participants:t,hoveredIdx:s,idx:n,onHover:o}){const l=t.findIndex(k=>k.id===e._from),a=t.findIndex(k=>k.id===e._to);if(l<0||a<0)return null;const i=a>l,c=Math.min(l,a),d=Math.max(l,a),v=s===n,p=t.find(k=>k.id===e._to),g={user_message:"var(--green)",api_call:e.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:(p==null?void 0:p.color)||"var(--cat-commands)",subagent:(p==null?void 0:p.color)||"var(--yellow)",hook:"var(--orange)"}[e.type]||"var(--fg2)";let x="",L="";if(e.type==="user_message")e.redacted?x="🔒 prompt ("+(e.prompt_length||"?")+" chars)":(x=e.preview||"(prompt)",e.prompt_length&&(L=e.prompt_length+" chars"));else if(e.type==="api_call"){const k=e.tokens||{};x=e.agent_name||Ui(e.model)||"API call",L=z((k.input||0)+(k.output||0))+"t",e.ttft_ms>0?L+=" ttft:"+us(e.ttft_ms):e.duration_ms>0&&(L+=" "+us(e.duration_ms)),e.is_error&&(L+=" ⚠")}else if(e.type==="api_response"){const k=e.tokens||{};x="← "+z(k.output||0)+"t",e.response_preview&&(x+=" "+e.response_preview.slice(0,60)),L=Ui(e.model)||"",e.finish_reason&&e.finish_reason!=="stop"&&(L+=" ["+e.finish_reason+"]")}else if(e.type==="error")x="⚠ "+(e.error_type||"error"),L=e.error_message?e.error_message.slice(0,60):"";else if(e.type==="tool_use"){const k=e.to||"tool",S=Df(k,e.params);x=k+(S?": "+S:""),e.subtype==="result"?(L=e.success==="true"||e.success===!0?"✓":"✗",e.duration_ms>0&&(L+=" "+us(e.duration_ms)),e.result_size&&(L+=" "+e.result_size+"B")):e.subtype==="decision"&&(L=e.decision||"")}else e.type==="subagent"?x=e.to||"subagent":e.type==="hook"&&(x=e.hook_name||"hook");const T=100/t.length,y=(c+.5)*T,$=(d+.5)*T;return r`<div class="sf-seq-row ${v?"hovered":""}"
    onMouseEnter=${()=>o(n)} onMouseLeave=${()=>o(null)}>
    <!-- Token columns (left side) -->
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${e._cumTok>0?z(e._cumTok):""}</span>
      <span class="sf-seq-rttok">${e._rtTok>0?z(e._rtTok):""}</span>
    </div>
    <!-- Time -->
    <div class="sf-seq-time">${dc(e.ts)}</div>
    <!-- Arrow area -->
    <div class="sf-seq-arrow-area">
      <!-- Swimlane lines -->
      ${t.map((k,S)=>r`<div key=${S} class="sf-seq-lane"
        style="left:${(S+.5)*T}%"></div>`)}
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
      "><span class="sf-seq-label-text" title=${x}>${Q(x)}</span>
        ${L&&r`<span class="sf-seq-sublabel">${L}</span>`}
      </div>
    </div>
    <!-- Hover tooltip -->
    ${v&&r`<${Rf} event=${e}/>`}
  </div>`}function Ff({event:e,participants:t}){100/t.length;let s="",n="var(--fg2)",o="";return e.type==="session_start"?(s="Session started",n="var(--green)",o="▶"):e.type==="session_end"?(s="Session ended",n="var(--fg3)",o="■"):e.type==="compaction"&&(s="Compaction"+(e.compaction_count?" #"+e.compaction_count:""),n="var(--orange)",o="⟳"),r`<div class="sf-seq-marker" style="border-left-color:${n}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${dc(e.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${n}">
      ${o} ${s}
      ${e.type==="compaction"&&e.duration_ms>0?" — "+us(e.duration_ms):""}
      ${e.cwd?r` <span class="text-muted text-xs mono">${Q(e.cwd)}</span>`:""}
    </div>
  </div>`}function Nf({summary:e}){return!e||!e.event_count?null:r`<div class="sf-summary">
    ${e.total_turns>0&&r`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${e.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${e.total_api_calls||0}</div></div>
    ${e.total_tool_uses>0&&r`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${e.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${z(e.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${z(e.total_input_tokens)}/${z(e.total_output_tokens)}</div></div>
    ${e.compactions>0&&r`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${e.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${cc(e.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${e.event_count}</div></div>
  </div>`}function jf(){const{snap:e,globalRange:t,enabledTools:s}=Ge(Ie),[n,o]=V([]),[l,a]=V(!0),[i,c]=V(null),[d,v]=V(null),[p,m]=V(null),[g,x]=V(!1),[L,T]=V(null);ie(()=>{a(!0);const P=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,b=t==null?void 0:t.until;jo(null,{since:P,until:b}).then(C=>{C.sort((A,R)=>(R.started_at||0)-(A.started_at||0)),o(C),a(!1)}).catch(()=>a(!1))},[t]);const y=P=>s===null||s.includes(P),$=n.filter(P=>y(P.tool)),k=[...new Set($.map(P=>P.tool))].sort();ie(()=>{(!i&&k.length>0||i&&!k.includes(i)&&k.length>0)&&c(k[0])},[k.join(",")]);const S=$.filter(P=>P.tool===i);ie(()=>{S.length>0&&(!d||!S.find(P=>P.session_id===d))&&v(S[0].session_id)},[i,S.length]),ie(()=>{if(!d){m(null);return}x(!0);const P=n.find(A=>A.session_id===d),b=P!=null&&P.started_at?P.started_at-60:Date.now()/1e3-86400,C=P!=null&&P.ended_at?P.ended_at+60:Date.now()/1e3+60;vr(d,b,C).then(A=>{m(A),x(!1)}).catch(()=>{m(null),x(!1)})},[d]);const{processedTurns:H,participants:D}=re(()=>{const P=(p==null?void 0:p.turns)||[];if(!P.length)return{processedTurns:[],participants:[]};const b=P.map(I=>{const F={...I};return I.type==="user_message"?(F._from="user",F._to="tool"):I.type==="api_call"?(F._from=I.from||"tool",F._to="api"):I.type==="api_response"||I.type==="error"?(F._from="api",F._to="tool"):I.type==="tool_use"?(F._from="tool",F._to="skill:"+(I.to||"tool")):I.type==="subagent"?(F._from="tool",F._to="subagent:"+(I.to||"agent")):I.type==="hook"&&(F._from="tool",F._to="hook"),F});let C=0,A=0;for(const I of b){const F=I.tokens||{},q=(F.input||0)+(F.output||0);I.type==="user_message"&&(A=0),I.type==="api_call"&&(C+=q,A+=q),I._cumTok=C,I._rtTok=A}const R=Af(b,i);return{processedTurns:b,participants:R}},[p,i]),O=(p==null?void 0:p.summary)||{};return H.filter(P=>P._from&&P._to),H.filter(P=>!P._from||!P._to),r`<div class="sf-container">
    <!-- Tool tabs -->
    <${Of} tools=${k} activeTool=${i} onSelect=${c}/>

    <!-- Session tabs -->
    <${zf} sessions=${S} activeId=${d}
      onSelect=${v} loading=${l}/>

    <!-- Summary -->
    <${Nf} summary=${O}/>

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
                    <div class="sf-seq-participant-box" style="border-color:${P.color}">${Q(P.label)}</div>
                  </div>`})}
              </div>
            </div>
            <!-- Event rows -->
            <div class="sf-seq-body">
              ${H.map((P,b)=>P._from&&P._to?r`<${If} key=${b} event=${P} participants=${D}
                    hoveredIdx=${L} idx=${b} onHover=${T}/>`:r`<${Ff} key=${b} event=${P} participants=${D}/>`)}
            </div>
          `}
    </div>
  </div>`}function wl(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function uc(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function pc(e){return e?e.replace("claude-","").replace("gpt-","").replace(/-\d{8}$/,""):""}function Ao(e,t){return e?e.length>t?e.slice(0,t)+"…":e:""}const Bf={tool_use:"🔧",api_call:"🌐",api_response:"📨",file_edit:"📝",compaction:"🗜️",subagent:"🤖",error:"❌"},Hf={tool_use:"var(--accent)",api_call:"var(--green)",api_response:"var(--fg2)",file_edit:"var(--orange)",compaction:"var(--yellow)",subagent:"var(--accent)",error:"var(--red)"};function Wf({tools:e,activeTool:t,onSelect:s}){return e.length?r`<div class="sf-tool-tabs" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);flex-wrap:wrap">
    ${e.map(n=>r`<button key=${n}
      class="chip ${n===t?"chip-active":""}"
      onClick=${()=>s(n)}
      style="font-size:var(--fs-sm);padding:var(--sp-2) var(--sp-4)">
      ${Q(n)}
    </button>`)}
  </div>`:null}function qf({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions…</div>`:e.length?r`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${e.slice(0,20).map(o=>{const l=o.session_id===t,a=o.ended_at?Math.round(o.ended_at-o.started_at):0,i=a>0?wl(a*1e3):"⏳ live",c=uc(o.started_at);return r`<button key=${o.session_id}
        class="tr-sess-btn ${l?"tr-sess-active":""}"
        onClick=${()=>s(o.session_id)}
        title=${o.session_id}>
        <span class="tr-sess-time">${c}</span>
        <span class="tr-sess-dur">${i}</span>
        ${o.is_live?r`<span class="tr-sess-live">●</span>`:null}
      </button>`})}
  </div>`:r`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`}function Vf({turn:e,index:t,expanded:s,onToggle:n}){const o=e.prompt&&e.prompt.length>0,l=e.actions||[],a=l.filter(m=>m.kind==="tool_use"),i=l.filter(m=>m.kind==="api_call"),c=l.filter(m=>m.kind==="error"),d=e.tokens||{},v=(d.input||0)+(d.output||0),p=e.wall_ms||e.duration_ms||0;return r`<div class="tr-turn ${s?"tr-turn-expanded":""}">
    <!-- Turn header (always visible) -->
    <div class="tr-turn-header" onClick=${n}>
      <div class="tr-turn-num">${t+1}</div>
      <div class="tr-turn-meta">
        <span class="tr-turn-time">${uc(e.ts)}</span>
        ${e.model?r`<span class="tr-turn-model">${pc(e.model)}</span>`:null}
        ${p>0?r`<span class="tr-turn-dur">${wl(p)}</span>`:null}
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
    ${o?r`<div class="tr-prompt ${s?"tr-prompt-full":""}">
      <div class="tr-prompt-icon">👤</div>
      <div class="tr-prompt-text">${s?e.prompt:Ao(e.prompt_preview||e.prompt,120)}</div>
    </div>`:r`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon">👤</div>
      <div class="tr-prompt-text text-muted">(no prompt captured)</div>
    </div>`}

    <!-- Expanded: action timeline + token breakdown -->
    ${s&&l.length>0?r`<div class="tr-actions">
      ${l.map((m,g)=>r`<${Uf} key=${g} action=${m} turnTs=${e.ts}/>`)}
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
  </div>`}function Uf({action:e,turnTs:t}){const s=Bf[e.kind]||"•",n=Hf[e.kind]||"var(--fg2)",o=e.ts-t,l=o>0?"+"+(o<1?o.toFixed(1):Math.round(o))+"s":"",a=e.duration_ms>0?wl(e.duration_ms):"",i=e.tokens,c=i?z((i.input||0)+(i.output||0)):"";return r`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${n}">${s}</span>
    <span class="tr-action-name" style="color:${n}">${Q(e.name||e.kind)}</span>
    ${e.input_summary?r`<span class="tr-action-args">${Q(Ao(e.input_summary,80))}</span>`:null}
    ${e.output_summary?r`<span class="tr-action-result">${Q(Ao(e.output_summary,60))}</span>`:null}
    <span class="tr-action-meta">
      ${l?r`<span class="tr-action-offset">${l}</span>`:null}
      ${a?r`<span class="tr-action-dur">${a}</span>`:null}
      ${c?r`<span class="tr-action-tok">🪙 ${c}</span>`:null}
      ${e.success===!1?r`<span class="tr-action-fail">✗</span>`:null}
      ${e.success===!0?r`<span class="tr-action-ok">✓</span>`:null}
    </span>
  </div>`}function Gf({summary:e,transcript:t}){return e?r`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns">💬 ${e.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls">🌐 ${e.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses">🔧 ${e.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens">🪙 ${z(e.total_tokens||0)}</span>
    ${e.compactions>0?r`<span class="tr-summary-item" title="Compactions">🗜️ ${e.compactions}</span>`:null}
    ${e.errors>0?r`<span class="tr-summary-item tr-stat-err" title="Errors">❌ ${e.errors}</span>`:null}
    ${e.subagents>0?r`<span class="tr-summary-item" title="Subagents">🤖 ${e.subagents}</span>`:null}
    ${e.duration_s>0?r`<span class="tr-summary-item" title="Duration">⏱️ ${wl(e.duration_s*1e3)}</span>`:null}
    ${t!=null&&t.model?r`<span class="tr-summary-item" title="Model">🧠 ${pc(t.model)}</span>`:null}
    ${t!=null&&t.is_live?r`<span class="tr-summary-live">● LIVE</span>`:null}
    <span class="tr-summary-source">${e.source||""}</span>
  </div>`:null}function Yf(){const{snap:e,globalRange:t,enabledTools:s}=Ge(Ie),[n,o]=V([]),[l,a]=V(!0),[i,c]=V(null),[d,v]=V(null),[p,m]=V(null),[g,x]=V(!1),[L,T]=V(new Set),[y,$]=V(!1),[k,S]=V(!0);ie(()=>{a(!0);const F=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,q=t==null?void 0:t.until;jo(null,{since:F,until:q}).then(te=>{te.sort((E,j)=>(j.started_at||0)-(E.started_at||0)),o(te),a(!1)}).catch(()=>a(!1))},[t]);const H=F=>s===null||s.includes(F),D=n.filter(F=>H(F.tool)),O=[...new Set(D.map(F=>F.tool))].sort();ie(()=>{(!i&&O.length>0||i&&!O.includes(i)&&O.length>0)&&c(O[0])},[O.join(",")]);const P=D.filter(F=>F.tool===i);ie(()=>{P.length>0&&(!d||!P.find(F=>F.session_id===d))&&v(P[0].session_id)},[i,P.length]);const b=Re(()=>{if(!d){m(null);return}x(!0),ld(d).then(F=>{m(F),x(!1)}).catch(()=>{const F=n.find(E=>E.session_id===d),q=F!=null&&F.started_at?F.started_at-60:Date.now()/1e3-86400,te=F!=null&&F.ended_at?F.ended_at+60:Date.now()/1e3+60;vr(d,q,te).then(E=>{m(Kf(E,d)),x(!1)}).catch(()=>{m(null),x(!1)})})},[d,n]);ie(b,[b]),ie(()=>{if(!k||!(p!=null&&p.is_live))return;const F=setInterval(b,5e3);return()=>clearInterval(F)},[k,p==null?void 0:p.is_live,b]);const C=Re(F=>{T(q=>{const te=new Set(q);return te.has(F)?te.delete(F):te.add(F),te})},[]),A=Re(()=>{const F=(p==null?void 0:p.turns)||[];y?(T(new Set),$(!1)):(T(new Set(F.map((q,te)=>te))),$(!0))},[y,p]),R=(p==null?void 0:p.turns)||[],I=(p==null?void 0:p.summary)||null;return r`<div class="tr-container">
    <!-- Header -->
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${R.length>0?r`<button class="chip" onClick=${A}
          style="font-size:var(--fs-xs)">
          ${y?"⊟ Collapse all":"⊞ Expand all"}
        </button>`:null}
        ${p!=null&&p.is_live?r`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${k}
            onChange=${F=>S(F.target.checked)}/>
          Auto-refresh
        </label>`:null}
      </div>
    </div>

    <!-- Tool tabs -->
    <${Wf} tools=${O} activeTool=${i} onSelect=${c}/>

    <!-- Session selector -->
    <${qf} sessions=${P} activeId=${d}
      onSelect=${v} loading=${l}/>

    <!-- Summary bar -->
    <${Gf} summary=${I} transcript=${p}/>

    <!-- Turns list -->
    <div class="tr-turns">
      ${g?r`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript…</div>`:R.length===0?r`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                Prompts require hooks enabled: set <code>AICTL_URL</code> in your tool config
              </p>
            </div>`:R.map((F,q)=>r`<${Vf}
              key=${q} turn=${F} index=${q}
              expanded=${L.has(q)}
              onToggle=${()=>C(q)}/>`)}
    </div>
  </div>`}function Kf(e,t){if(!e||!e.turns)return null;const s=e.turns||[],n=[];let o=null;for(const l of s)if(l.type==="user_message"){if(o&&n.push(o),o={ts:l.ts,end_ts:l.end_ts||l.ts,prompt:l.message||"",prompt_preview:l.preview||(l.message||"").slice(0,200),model:l.model||"",tokens:l.tokens||{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:l.api_calls||0,duration_ms:l.duration_ms||0,wall_ms:l.wall_ms||0,actions:[],tool_use_count:0},l.tools&&l.tools.length>0){for(const a of l.tools)o.actions.push({ts:a.ts||l.ts,kind:a.is_agent?"subagent":"tool_use",name:a.name||"",input_summary:a.args_summary||"",duration_ms:a.duration_ms||0});o.tool_use_count=l.tools.length}}else if(o){const i={api_call:"api_call",api_response:"api_response",tool_use:"tool_use",subagent:"subagent",error:"error"}[l.type];i&&(o.actions.push({ts:l.ts,kind:i,name:l.model||l.to||l.tool_name||"",input_summary:l.params||l.decision||"",output_summary:l.response_preview||l.error_message||"",duration_ms:l.duration_ms||0,tokens:l.tokens,success:l.success==="true"?!0:l.success==="false"?!1:void 0}),i==="tool_use"&&o.tool_use_count++,i==="api_call"&&l.tokens&&(o.tokens.input+=l.tokens.input||0,o.tokens.output+=l.tokens.output||0,o.tokens.cache_read+=l.tokens.cache_read||0,o.api_calls++))}o&&n.push(o);for(const l of n)l.tokens.total=(l.tokens.input||0)+(l.tokens.output||0);return{session_id:t,turns:n,summary:e.summary||{},is_live:!1}}const Jf={enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).",enabled:"Whether agent/agentic mode is active.",autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode allows the agent to execute tool calls without confirmation prompts. Use with caution.",autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.",skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",vimMode:"Enables Vim-style keybindings in the Gemini CLI.",approvalMode:"Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).",notifications:"Enables OS notifications for prompt alerts and session completion.",respectGeminiIgnore:"Controls whether the CLI respects patterns in .geminiignore files.",additionalIgnores:"Number of extra patterns added to the global file ignore list.",lineNumbers:"Shows line numbers in code blocks within the chat interface.",alternateScreen:"Uses the terminal alternate buffer to preserve shell scrollback history.",hideContext:"Hides the summary of attached files/context above the input prompt.",effort:"Reasoning effort level for the model (e.g., standard, high).",temperature:"Sampling temperature for model requests. 0 = deterministic; higher = more creative.",budget:"Maximum token budget for reasoning/extended thinking.",coreTools:"Number of built-in tools explicitly enabled for the agent.",excludeTools:"Number of tools explicitly disabled for safety or cost control.",customAgents:"Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks.",webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."};function Qf(e){return Jf[e]||""}function Zf({v:e}){return e===!0?r`<span style="color:var(--green);font-weight:600">on</span>`:e===!1?r`<span style="color:var(--red);opacity:0.8">off</span>`:e==null||e===""?r`<span class="text-muted">—</span>`:typeof e=="object"?r`<span class="mono" style="font-size:var(--fs-xs)">${JSON.stringify(e)}</span>`:r`<span class="mono">${String(e)}</span>`}function tn({k:e,v:t,indent:s}){const n=e.replace(/([A-Z])/g," $1").replace(/^./,l=>l.toUpperCase()),o=Qf(e);return r`<div
    title=${o}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${s?"var(--sp-6)":"var(--sp-4)"};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${o?"help":"default"}">
    <span style="color:var(--fg2)">${n}${o?r`<span style="color:var(--fg3);margin-left:3px;font-size:0.6em">?</span>`:""}</span>
    <${Zf} v=${t}/>
  </div>`}function fc({otel:e}){if(!e||!e.enabled&&!e.source)return null;const t=e.enabled;return r`<div style="margin-bottom:var(--sp-4)">
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
  </div>`}function Oo({name:e,items:t}){const s=Object.entries(t);return s.length?r`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${e}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${s.map(([n,o])=>r`<${tn} key=${n} k=${n} v=${o}/>`)}
    </div>
  </div>`:null}function Xf({cfg:e,label:t}){var i,c;const s=bt[e.tool]||"🔹",n=Oe[e.tool]||"var(--fg2)",o=Object.entries(e.feature_groups||{}),l=Object.entries(e.settings||{}).filter(([d])=>!["agent_historySummarizationMode","agent_maxRequests","debug_requestLoggerMaxEntries","planModel","implementModel"].includes(d));return((i=e.otel)==null?void 0:i.enabled)||((c=e.otel)==null?void 0:c.source)||o.length||l.length||(e.hints||[]).length||(e.mcp_servers||[]).length||(e.extensions||[]).length?r`<div style="background:var(--bg);border:2px solid ${n};border-radius:6px;overflow:hidden;
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
      <${fc} otel=${e.otel}/>
      ${o.map(([d,v])=>r`<${Oo} key=${d} name=${d} items=${v}/>`)}
      ${l.length>0&&r`<${Oo} name="Settings" items=${Object.fromEntries(l)}/>`}
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
  </div>`:null}function ev({cfg:e}){var l,a,i,c;if(!e)return null;const t=Object.entries(e.feature_groups||{});if(!t.length&&!((l=e.otel)!=null&&l.enabled)&&!((a=e.otel)!=null&&a.source))return null;const n=(((i=e.feature_groups)==null?void 0:i.Safety)||{}).globalAutoApprove===!0,o=(((c=e.feature_groups)==null?void 0:c.Agent)||{}).autoReply===!0;return r`<div style="background:var(--bg);border:2px solid #007acc;border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,#007acc 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid #007acc">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:#007acc">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${n&&r`<span class="badge" style="margin-left:auto;background:var(--red);color:#fff;font-weight:700">⚠ YOLO MODE ON</span>`}
      ${!n&&o&&r`<span class="badge" style="margin-left:auto;background:var(--orange);color:#fff">⚠ auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${fc} otel=${e.otel}/>
      ${t.map(([d,v])=>r`<${Oo} key=${d} name=${d} items=${v}/>`)}
    </div>
  </div>`}function tv({snap:e}){var o,l,a;const t=Oe.aictl||"#94a3b8",s=Object.entries(((o=e==null?void 0:e.live_monitor)==null?void 0:o.diagnostics)||{}),n=[...((l=e==null?void 0:e.live_monitor)==null?void 0:l.workspace_paths)||[],...((a=e==null?void 0:e.live_monitor)==null?void 0:a.state_paths)||[]];return!s.length&&!n.length?null:r`<div style="background:var(--bg);border:2px solid ${t};border-radius:6px;overflow:hidden;
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
  </div>`}function sv(){const{snap:e}=Ge(Ie),t=re(()=>e!=null&&e.tool_configs?e.tool_configs:[],[e]),s=re(()=>{const l={};return((e==null?void 0:e.tools)||[]).forEach(a=>{l[a.tool]=a.label}),l},[e]);if(!e)return r`<p class="loading-state">Loading...</p>`;if(!t.length)return r`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const n=t.find(l=>l.tool==="vscode"),o=t.filter(l=>l.tool!=="vscode");return r`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${n&&r`<${ev} cfg=${n}/>`}
    ${o.map(l=>r`<${Xf} key=${l.tool} cfg=${l} label=${s[l.tool]||l.tool}/>`)}
    <${tv} snap=${e}/>
  </div>`}const Yn={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},nv=["project","global","shadow","session","external"],Kn=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function lv(e,t){const s=Cs(e),n=Cs(t);if(!s)return"(unknown)";if(n&&s.startsWith(n+"/")){const o=s.slice(n.length+1).split("/")[0];return o.startsWith(".")?"(root)":o}return s.includes("/.claude/projects/")?"(shadow)":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")?"(global)":"(other)"}function ov(e){if(!e)return"unknown";const t=Cs(e).split("/"),s=t.pop()||"unknown",n=s.lastIndexOf("."),o=n>0?s.slice(0,n):s;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test(o)){const l=t.pop();if(l)return l}return o}function av(){const{snap:e}=Ge(Ie),[t,s]=V(null),n=re(()=>{if(!e)return null;const l=e.tools.filter(T=>T.tool!=="aictl"&&T.tool!=="any");if(!l.length)return null;const a=e.root||"",i={},c={},d={},v={yes:0,"on-demand":0,conditional:0,no:0};let p=0;for(const T of l)for(const y of T.files){const $=y.kind||"other",k=y.scope||"external",S=(y.sent_to_llm||"no").toLowerCase(),H=y.tokens||0,D=lv(y.path,a),O=ov(y.path);i[$]||(i[$]={tokens:0,files:0,projects:{}}),i[$].tokens+=H,i[$].files+=1,i[$].projects[D]||(i[$].projects[D]={tokens:0,count:0}),i[$].projects[D].tokens+=H,i[$].projects[D].count+=1,d[D]||(d[D]={tokens:0,count:0,cats:{}}),d[D].tokens+=H,d[D].count+=1,d[D].cats[$]||(d[D].cats[$]={tokens:0,count:0,items:{}}),d[D].cats[$].tokens+=H,d[D].cats[$].count+=1,d[D].cats[$].items[O]||(d[D].cats[$].items[O]=0),d[D].cats[$].items[O]+=H,c[k]||(c[k]={tokens:0,files:0}),c[k].tokens+=H,c[k].files+=1,v[S]!==void 0?v[S]+=H:v.no+=H,p+=H}const m=Object.entries(i).sort((T,y)=>y[1].tokens-T[1].tokens),g=nv.filter(T=>c[T]).map(T=>[T,c[T]]),x=Object.entries(d).sort((T,y)=>y[1].tokens-T[1].tokens),L=l.map(T=>({tool:T.tool,label:T.label,tokens:T.files.reduce((y,$)=>y+$.tokens,0),files:T.files.length,sentYes:T.files.filter(y=>(y.sent_to_llm||"").toLowerCase()==="yes").reduce((y,$)=>y+$.tokens,0)})).filter(T=>T.tokens>0).sort((T,y)=>y.tokens-T.tokens).slice(0,8);return{cats:m,scopes:g,byPolicy:v,totalTokens:p,perTool:L,byCat:i,byProj:d,projList:x}},[e]);if(!n)return r`<p class="empty-state">No file data available.</p>`;if(!n.totalTokens)return r`<p class="empty-state">No token data collected yet.</p>`;const o=Math.max(...n.cats.map(([,l])=>l.tokens),1);return r`<div class="diag-card" role="region" aria-label="Context window map">
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
        ${n.cats.map(([l,a])=>{const i=a.tokens/n.totalTokens*100;return i<.5?null:r`<div key=${l} style="width:${i}%;background:${Yn[l]||"var(--fg2)"};
            position:relative;min-width:2px"
            title="${l}: ${z(a.tokens)} tokens (${a.files} files)">
            ${i>8?r`<span class="text-ellipsis text-bold" style="position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;font-size:var(--fs-2xs);color:var(--bg);padding:0 2px">${l}</span>`:null}
          </div>`})}
      </div>
    </div>

    <!-- Per-category bars with project sub-segments -->
    <div class="mb-md">
      ${n.cats.map(([l,a])=>{const i=Object.entries(a.projects).sort((d,v)=>v[1].tokens-d[1].tokens),c=a.tokens/o*100;return r`<div key=${l} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);font-size:var(--fs-base)">
          <span class="text-bold text-right" style="width:80px;color:${Yn[l]||"var(--fg2)"};flex-shrink:0">${l}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${c}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${i.map(([d,v],p)=>{const m=a.tokens>0?v.tokens/a.tokens*100:0;if(m<.5)return null;const g=!t||t===d;return r`<div key=${d} style="width:${m}%;height:100%;
                  background:${Yn[l]||"var(--fg2)"};
                  opacity:${g?Math.max(.3,1-p*.12):.12};
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
      ${n.projList.map(([l,a])=>{const i=t===l;return r`<button key=${l}
          style="cursor:pointer;padding:var(--sp-1) var(--sp-3);font-size:var(--fs-sm);
            background:${i?"var(--accent)":"transparent"};
            color:${i?"var(--bg)":"var(--fg2)"};
            border:1px solid ${i?"var(--accent)":"var(--border)"};
            border-radius:4px 4px 0 0;font-weight:${i?600:400};border-bottom:none"
          onClick=${()=>s(i?null:l)}>
          ${l} (${z(a.tokens)})
        </button>`})}
    </div>

    <!-- Tab content: per-category bars with item sub-segments -->
    ${t&&n.byProj[t]?(()=>{const l=n.byProj[t],a=Object.entries(l.cats).sort((c,d)=>d[1].tokens-c[1].tokens),i=Math.max(...a.map(([,c])=>c.tokens),1);return r`<div class="mb-md" style="background:var(--bg2);border-radius:6px;padding:var(--sp-4)">
        <div class="es-section-title">${t} \u2014 ${z(l.tokens)} tokens across ${l.count} files</div>
        ${a.map(([c,d])=>{const v=Object.entries(d.items).sort((x,L)=>L[1]-x[1]),p=v.slice(0,15),m=v.slice(15).reduce((x,[,L])=>x+L,0);m>0&&p.push(["(other)",m]);const g=d.tokens/i*100;return r`<div key=${c} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${Yn[c]||"var(--fg2)"};flex-shrink:0">${c}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${g}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${p.map(([x,L],T)=>{const y=d.tokens>0?L/d.tokens*100:0;if(y<.3)return null;const $=Kn[T%Kn.length];return r`<div key=${x} style="width:${y}%;height:100%;background:${$};
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
              ${p.map(([x,L],T)=>r`<span key=${x}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${Kn[T%Kn.length]};flex-shrink:0"></span>
                <span class="text-muted">${x} ${z(L)}</span>
              </span>`)}
            </div>
          </div>`})}
      </div>`})():null}

    <!-- Scope + Per-tool side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-8)">
      <div>
        <div class="es-section-title">By Scope</div>
        ${n.scopes.map(([l,a])=>r`<div key=${l} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span class="text-bold">${l}</span>
          <span class="text-muted">${a.files} files \u00B7 ${z(a.tokens)} tok</span>
        </div>`)}
      </div>
      <div>
        <div class="es-section-title">By Tool</div>
        ${n.perTool.map(l=>r`<div key=${l.tool} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span><span style="color:${Oe[l.tool]||"var(--fg2)"}">${bt[l.tool]||"🔹"}</span> ${Q(l.label)}</span>
          <span class="text-muted">${z(l.sentYes)} sent \u00B7 ${z(l.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}const iv={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"};function rv(e){if(!e||e<0)return"—";const t=Math.floor(e/3600),s=Math.floor(e%3600/60);return t>0?`${t}h ${s}m`:`${s}m`}function cv(){var m,g,x,L,T;const{snap:e}=Ge(Ie),[t,s]=V(null),[n,o]=V(null);ie(()=>{let y=!0;const $=()=>{mr().then(S=>{y&&s(S)}).catch(()=>{}),fd().then(S=>{y&&o(S)}).catch(()=>{})};$();const k=setInterval($,15e3);return()=>{y=!1,clearInterval(k)}},[]);const l=re(()=>{if(!e)return[];const y=e.tool_telemetry||[];return e.tools.filter($=>$.tool!=="aictl"&&$.tool!=="any").map($=>{var P,b,C,A,R;const k=y.find(I=>I.tool===$.tool),S=$.live||{},H=S.last_seen_at||0,D=H>0?Math.floor(Date.now()/1e3-H):-1,O=D>3600||D<0;return{tool:$.tool,label:$.label,source:(k==null?void 0:k.source)||(S.session_count?"live-monitor":"discovery"),confidence:(k==null?void 0:k.confidence)||((P=S.token_estimate)==null?void 0:P.confidence)||0,inputTokens:(k==null?void 0:k.input_tokens)||0,outputTokens:(k==null?void 0:k.output_tokens)||0,cost:(k==null?void 0:k.cost_usd)||0,sessions:(k==null?void 0:k.total_sessions)||S.session_count||0,errors:((b=k==null?void 0:k.errors)==null?void 0:b.length)||0,lastError:((C=k==null?void 0:k.errors)==null?void 0:C[0])||null,lastSeen:D,stale:O,fileCount:$.files.length,procCount:$.processes.length,hasLive:!!$.live,hasOtel:!!((R=(A=S.sources||[]).includes)!=null&&R.call(A,"otel"))}}).sort(($,k)=>k.inputTokens+k.outputTokens-($.inputTokens+$.outputTokens))},[e]),a=re(()=>{var y;return(y=e==null?void 0:e.live_monitor)!=null&&y.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([$,k])=>({name:$,status:k.status||"unknown",mode:k.mode||"",detail:k.detail||""})):[]},[e]);if(!e)return null;const i=l.length,c=l.filter(y=>y.inputTokens+y.outputTokens>0).length,d=l.filter(y=>y.hasLive).length,v=l.filter(y=>y.stale&&y.hasLive).length,p=l.reduce((y,$)=>y+$.errors,0);return r`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--bg)">${c}/${i} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--bg)">${d} live</span>
      ${v>0?r`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--bg)">${v} stale</span>`:null}
      ${p>0?r`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--bg)">${p} errors</span>`:null}
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
          <div class="metric-chip-value">${rv(n.uptime_s)}</div>
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
          <tbody>${l.map(y=>{var $;return r`<tr key=${y.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${y.stale&&!y.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <span style="color:${Oe[y.tool]||"var(--fg2)"}">${bt[y.tool]||"🔹"}</span>
              ${Q(y.label)}</td>
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
            border-left:3px solid ${iv[y.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${y.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${y.status}</span>
          </div>
          ${y.detail?r`<div class="text-xs text-muted" style="margin-top:2px">${Q(y.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let co=null;function dv(){return co?Promise.resolve(co):vd().then(e=>{const t={};for(const s of e||[])t[s.key]=s;return co=t,t}).catch(()=>({}))}function uv(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),s=t.match(/^[^.!?]+[.!?]/);return s?s[0].trim():t.slice(0,120)}const pv={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},fv={raw:"raw",deduced:"deduced",aggregated:"agg"};function vv(){const[e,t]=V(null),[s,n]=V({x:0,y:0}),[o,l]=V(!1),a=ot(null),i=ot(null),c=Re(T=>{const y=T.getAttribute("data-dp");y&&dv().then($=>{const k=$[y];if(!k)return;const S=T.getBoundingClientRect();n({x:S.left,y:S.bottom+4}),t(k),l(!1)})},[]),d=Re(()=>{i.current=setTimeout(()=>{t(null),l(!1)},120)},[]),v=Re(()=>{i.current&&(clearTimeout(i.current),i.current=null)},[]);if(ie(()=>{function T(k){const S=k.target.closest("[data-dp]");S&&(v(),c(S))}function y(k){k.target.closest("[data-dp]")&&d()}function $(k){k.target.closest("[data-dp]")&&e&&(k.preventDefault(),l(H=>!H))}return document.addEventListener("mouseover",T,!0),document.addEventListener("mouseout",y,!0),document.addEventListener("click",$,!0),()=>{document.removeEventListener("mouseover",T,!0),document.removeEventListener("mouseout",y,!0),document.removeEventListener("click",$,!0)}},[c,d,v,e]),!e)return null;const m=Math.min(s.x,window.innerWidth-320-8),g=Math.min(s.y,window.innerHeight-180),x=fv[e.source_type]||e.source_type,L=pv[e.unit]||e.unit;return r`<div class="dp-tooltip" ref=${a}
    style=${"left:"+m+"px;top:"+g+"px"}
    onMouseEnter=${v} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${x}</span>
      ${L&&r`<span class="dp-tooltip-unit">${L}</span>`}
    </div>
    <div class="dp-tooltip-body">${uv(e.explanation)}</div>
    ${o&&r`<div class="dp-tooltip-detail">
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
    ${!o&&r`<div class="dp-tooltip-hint">click for details</div>`}
  </div>`}function Zs(e,t){try{localStorage.setItem("aictl-pref-"+e,JSON.stringify(t))}catch{}}function uo(e,t){try{const s=localStorage.getItem("aictl-pref-"+e);return s!=null?JSON.parse(s):t}catch{return t}}function Jn(e){const t=new Date(e*1e3),s=t.getTimezoneOffset();return new Date(t.getTime()-s*6e4).toISOString().slice(0,16)}const Po=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],dl={};Po.forEach(e=>{dl[e.id]=e.seconds});const mv={snap:null,history:null,connected:!1,activeTab:uo("active_tab","overview"),globalRange:(()=>{const e=uo("range","live"),t=dl[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:uo("tool_filter",null)};function hv(e,t){switch(t.type){case"SSE_UPDATE":{const s=t.payload,n=e.snap?Dd(e.snap,s):s,o=Ad(e.history,s);return{...e,snap:n,history:o,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const po=Xs.tabs;function gv({globalRange:e,onPreset:t,onApplyCustom:s}){const[n,o]=V(!1),l=ot(null),a=ot(null),i=Re(()=>{o(!0),requestAnimationFrame(()=>{if(l.current&&a.current)if(e.until!=null)l.current.value=Jn(e.since),a.current.value=Jn(e.until);else{const d=Po.find(m=>m.id===e.id),v=Date.now()/1e3,p=(d==null?void 0:d.seconds)||86400;l.current.value=Jn(v-p),a.current.value=Jn(v)}})},[e]),c=Re(()=>{var L,T;const d=(L=l.current)==null?void 0:L.value,v=(T=a.current)==null?void 0:T.value;if(!d||!v)return;const p=new Date(d).getTime(),m=new Date(v).getTime();if(!Number.isFinite(p)||!Number.isFinite(m))return;const g=p/1e3,x=m/1e3;x<=g||(s(g,x),o(!1))},[s]);return r`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${Po.map(d=>r`<button key=${d.id}
        class=${e.id===d.id&&!n?"range-btn active":"range-btn"}
        onClick=${()=>{t(d.id),o(!1)}}>${d.label}</button>`)}
      <button class=${n||e.id==="custom"?"range-btn active":"range-btn"}
        onClick=${i}>Custom</button>
    </div>
    ${n&&r`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${l} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${a} /></label>
      <button class="range-btn active" onClick=${c} style="font-weight:600">Apply</button>
    </div>`}
  </div>`}const sl=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]);function _v({snap:e,enabledTools:t,onToggle:s,onSetAll:n}){if(!e)return null;const o=e.tools.filter(a=>!a.meta);if(!o.length)return null;const l=t===null;return t?t.length:o.length,r`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${l}
        onChange=${()=>n(l?[]:null)} />
      <span class="text-muted">All (${o.length})</span>
    </label>
    ${o.sort((a,i)=>a.label.localeCompare(i.label)).map(a=>{const i=sl.has(a.tool),c=t===null||t.includes(a.tool),d=Oe[a.tool]||"var(--fg2)",v=bt[a.tool]||"🔹";return r`<label key=${a.tool} class=${"tool-filter-item"+(i?"":" tool-unverified")}
        title=${i?"":"Not yet verified — discovery only"}>
        <input type="checkbox" checked=${c} disabled=${!i}
          onChange=${()=>i&&s(a.tool)} />
        <span style=${"color:"+d}>${v}</span>
        <span>${a.label}</span>
      </label>`})}
  </div>`}function $v({mcpDetail:e}){return!e||!e.length?r`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`:r`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{t.status;const s=_d[t.status]||"var(--fg3)",n=Oe[t.tool]||"var(--fg3)";return r`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${s}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Q(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${n};white-space:nowrap;flex-shrink:0">${Q(t.tool)}</span>
      </div>`})}
  </div>`}function bv({label:e,value:t,mcpDetail:s}){const[n,o]=V(!1);return r`<div style="position:relative;cursor:default"
    onMouseEnter=${()=>o(!0)}
    onMouseLeave=${()=>o(!1)}>
    <${Mo} label=${e} value=${t} sm=${!0}/>
    ${n&&r`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      ${s.length>0?r`<${$v} mcpDetail=${s}/>`:r`<div style="color:var(--fg3);font-size:var(--fs-sm)">None configured</div>`}
    </div>`}
  </div>`}function yv({snap:e,history:t,globalRange:s}){const[n,o]=V(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),l=Re(()=>{o(d=>{const v=!d;try{localStorage.setItem("aictl-header-expanded",String(v))}catch{}return v})},[]),a=d=>!t||!t.ts||t.ts.length<2?null:[t.ts,t[d]],i=(e==null?void 0:e.cpu_cores)||1,c={cores:i};return r`
    <div style=${"display:grid;grid-template-columns:repeat("+Xs.sparklines.length+",1fr);gap:var(--sp-4);margin-bottom:var(--sp-4)"}>
      ${Xs.sparklines.map(d=>{const v=e?e["total_"+d.field]??e[d.field]??"":"",p=Zl(v,d.format,d.suffix,d.multiply),m=d.yMaxExpr?Ya(d.yMaxExpr,c):void 0,g=(d.refLines||[]).map(x=>({value:Ya(x.valueExpr,c),label:(x.label||"").replace("{cores}",i)})).filter(x=>x.value!=null);return r`<${Xt} key=${d.field} label=${d.label} value=${p}
          data=${a(d.field)} chartColor=${d.color||"var(--accent)"}
          smooth=${!!d.smooth} refLines=${g.length?g:void 0} yMax=${m} dp=${d.dp}/>`})}
    </div>

    <div class=${n?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>

      <!-- Row 1: (CPU bars + Live traffic) | Live metric boxes -->
      <div class="mb-sm" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);align-items:start">
        <!-- Left: per-core CPU bars + live traffic bar -->
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${Np} perCore=${(e==null?void 0:e.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${Ii} snap=${e} mode="traffic"/></div>
        </div>
        <!-- Right: 4 live metric boxes in 2×2 grid -->
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${Xs.liveMetrics.map(d=>{const v=e?e[d.field]??"":"",p=Zl(v,d.format,d.suffix,d.multiply);return r`<${Mo} key=${d.field} label=${d.label} value=${p} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>

      <!-- Row 2: Inventory — full width; MCP box shows hover popover -->
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div style="display:grid;grid-template-columns:repeat(${Xs.inventory.length},1fr);gap:var(--sp-2)">
          ${Xs.inventory.map(d=>{const v=e?e[d.field]??"":"",p=Zl(v,d.format,d.suffix,d.multiply);return d.field==="total_mcp_servers"?r`<${bv} key=${d.field} label=${d.label} value=${p} mcpDetail=${(e==null?void 0:e.mcp_detail)||[]}/>`:r`<${Mo} key=${d.field} label=${d.label} value=${p} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
        </div>
      </div>

      <!-- Row 3: CSV footprint — full width -->
      <div class="mb-sm"><${Ii} snap=${e} mode="files"/></div>

    </div>
    <button class="header-toggle" onClick=${l} aria-label="Toggle details">
      ${n?"▲ less":"▼ more"}
    </button>
  `}function xv(){var te;const[e,t]=dr(hv,mv),{snap:s,history:n,connected:o,activeTab:l,globalRange:a,searchQuery:i,theme:c,viewerPath:d,events:v,enabledTools:p}=e,[m,g]=V(null),x=ot(null);ie(()=>{document.documentElement.setAttribute("data-theme",c);try{localStorage.setItem("aictl-theme",c)}catch{}},[c]);const L=Re(()=>{t({type:"SET_THEME",payload:Jl[(Jl.indexOf(c)+1)%Jl.length]})},[c]),T=Re(E=>{const j=E.since,U=E.until;E.id==="live"?g(null):E.id!=="custom"?Mn({range:E.id}).then(g).catch(()=>{}):Mn({since:j,until:U}).then(g).catch(()=>{}),No({since:j,until:U}).then(G=>t({type:"EVENTS_INIT",payload:G})).catch(()=>{})},[]);ie(()=>{let E,j=1e3,U=!1,G=!1;Va().then(Y=>t({type:"SNAP_REPLACE",payload:Y})).catch(()=>{}),Mn().then(Y=>t({type:"HISTORY_INIT",payload:Y})).catch(()=>{}),T(a);function le(){U||(E=new EventSource(md()),E.onmessage=Y=>{const Le=JSON.parse(Y.data);t({type:"SSE_UPDATE",payload:Le}),j=1e3},E.onerror=()=>{t({type:"SET_CONNECTED",payload:!1}),E.close(),U||setTimeout(le,j),j=Math.min(j*2,3e4)})}le();const oe=setInterval(()=>{U||G||(G=!0,Va().then(Y=>t({type:"SNAP_REPLACE",payload:Y})).catch(()=>{}).finally(()=>{G=!1}))},3e4);return()=>{U=!0,E&&E.close(),clearInterval(oe)}},[]);const y=Re(E=>{const j=dl[E]||3600,U={id:E,since:Date.now()/1e3-j,until:null};t({type:"SET_RANGE",payload:U}),Zs("range",E),T(U)},[T]),$=Re((E,j)=>{const U={id:"custom",since:E,until:j};t({type:"SET_RANGE",payload:U}),T(U)},[T]),k=a.id==="live"?n:m||n,S=a.until?a.until-a.since:dl[a.id]||3600;ie(()=>{const E=j=>{var U;if(j.key==="Escape"&&t({type:"SET_VIEWER",payload:null}),j.key==="/"&&document.activeElement!==x.current&&(j.preventDefault(),(U=x.current)==null||U.focus()),document.activeElement!==x.current){const G=po.find(le=>le.key===j.key);G&&(t({type:"SET_TAB",payload:G.id}),Zs("active_tab",G.id))}};return document.addEventListener("keydown",E),()=>document.removeEventListener("keydown",E)},[]);const H=Re(E=>t({type:"SET_VIEWER",payload:E}),[]),D=Re(E=>{if(!sl.has(E))return;const j=s?s.tools.filter(G=>G.tool!=="aictl"&&G.tool!=="any"&&sl.has(G.tool)).map(G=>G.tool):[];let U;p===null?U=j.filter(G=>G!==E):p.indexOf(E)>=0?U=p.filter(le=>le!==E):(U=[...p,E],U.length>=j.length&&(U=null)),t({type:"SET_TOOL_FILTER",payload:U}),Zs("tool_filter",U)},[s,p]),O=Re(E=>{t({type:"SET_TOOL_FILTER",payload:E}),Zs("tool_filter",E)},[]),P=re(()=>{if(!s)return s;let E=s.tools;if(E=E.filter(j=>sl.has(j.tool)||j.tool==="aictl"),p!==null&&(E=E.filter(j=>p.includes(j.tool)||j.tool==="aictl")),i){const j=i.toLowerCase();E=E.filter(U=>U.label.toLowerCase().includes(j)||U.tool.toLowerCase().includes(j)||U.vendor&&U.vendor.toLowerCase().includes(j)||U.files.some(G=>G.path.toLowerCase().includes(j))||U.processes.some(G=>(G.name||"").toLowerCase().includes(j)||(G.cmdline||"").toLowerCase().includes(j))||U.live&&((U.live.workspaces||[]).some(G=>G.toLowerCase().includes(j))||(U.live.sources||[]).some(G=>G.toLowerCase().includes(j))))}return{...s,tools:E}},[s,i,p]),b=re(()=>{var U;const E=Date.now()/1e3-300,j=new Map;for(const G of v)if(G.kind==="file_modified"&&G.ts>=E&&((U=G.detail)!=null&&U.path)){const le=j.get(G.detail.path);(!le||G.ts>le.ts)&&j.set(G.detail.path,{ts:G.ts,growth:G.detail.growth_bytes||0,tool:G.tool})}return j},[v]),C=re(()=>({snap:P,history:n,openViewer:H,recentFiles:b,globalRange:a,rangeSeconds:S,enabledTools:p}),[P,n,H,b,a,S,p]),A={overview:()=>r`
      <${yv} snap=${P} history=${k}
        globalRange=${a}/>
      <div class="mb-lg"><${cv}/></div>
    `,procs:()=>r`
      <div class="mb-lg"><${Fp}/></div>
    `,memory:()=>r`
      <div class="mb-lg"><${av}/></div>
      <div class="mb-lg"><${qp}/></div>
    `,live:()=>r`<div class="mb-lg"><${Vp}/></div>`,events:()=>r`<div class="mb-lg"><${Up} key=${"events-"+l}/></div>`,budget:()=>r`<div class="mb-lg"><${Gp} key=${"budget-"+l}/></div>`,sessions:()=>r`<div class="mb-lg"><${gf} key=${"sessions-"+l}/></div>`,analytics:()=>r`<div class="mb-lg"><${Ef} key=${"analytics-"+l}/></div>`,flow:()=>r`<div class="mb-lg"><${jf} key=${"flow-"+l}/></div>`,transcript:()=>r`<div class="mb-lg"><${Yf} key=${"transcript-"+l}/></div>`,config:()=>r`<div class="mb-lg"><${sv}/></div>`},R=Re(E=>{t({type:"SET_TAB",payload:E}),Zs("active_tab",E)},[]);Re(E=>{t({type:"SET_TAB",payload:"sessions"}),Zs("active_tab","sessions"),window.__aictl_selected_session=E.session_id,window.dispatchEvent(new CustomEvent("aictl-session-select",{detail:E}))},[]);const[I,F]=V(!1);ie(()=>{let E=!0;const j=()=>mr().then(G=>{E&&F(G.active||!1)}).catch(()=>{E&&F(!1)});j();const U=setInterval(j,3e4);return()=>{E=!1,clearInterval(U)}},[]);const q=re(()=>{if(!s)return[];const E=[];let j=0,U=0,G=0,le=0;for(const oe of s.tools||[])for(const Y of oe.processes||[]){const Le=parseFloat(Y.mem_mb)||0,Ne=(Y.process_type||"").toLowerCase();(Ne==="subagent"||Ne==="agent")&&(j+=Le),Ne==="mcp-server"&&Y.zombie_risk&&Y.zombie_risk!=="none"&&U++,(Ne==="browser"||(Y.name||"").toLowerCase().includes("headless"))&&G++,Y.anomalies&&Y.anomalies.length&&(le+=Y.anomalies.length)}return j>2048&&E.push({level:"red",msg:`Subagent memory: ${ge(j*1048576)} (>2GB) — consider cleanup`}),U>0&&E.push({level:"orange",msg:`${U} MCP server(s) with dead parent — may be orphaned`}),G>0&&E.push({level:"yellow",msg:`${G} headless browser process(es) detected — check for leaks`}),le>5&&E.push({level:"orange",msg:`${le} process anomalies detected`}),E},[s]);return r`<${Ie.Provider} value=${C}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${x} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${i} onInput=${E=>t({type:"SET_SEARCH",payload:E.target.value})}/>
          <button class="theme-btn" onClick=${L} aria-label="Toggle theme: ${c}"
            title="Theme: ${c}">${$d[c]}</button>
          ${I&&r`<span class="conn ok" title="OTel receiver active — Claude Code pushing telemetry">OTel</span>`}
          <span class=${"conn "+(o?"ok":"err")} role="status" aria-live="polite">${o?"live":"reconnecting..."}<span class="sr-only">${o?" — connected to server":" — connection lost, attempting to reconnect"}</span></span>
        </div>
      </header>
      ${q.length>0&&r`<div class="alert-banner" role="alert">
        ${q.map((E,j)=>r`<div key=${j} class="alert-item" style="color:var(--${E.level})">
          \u26A0 ${E.msg}
        </div>`)}
      </div>`}
      <${gv} globalRange=${a} onPreset=${y} onApplyCustom=${$}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${po.map(E=>r`<button key=${E.id} class="tab-btn" role="tab"
            aria-selected=${l===E.id} onClick=${()=>R(E.id)}
            title="Shortcut: ${E.key}">${E.icon?E.icon+" ":""}${E.label}</button>`)}
        </nav>
        <${_v} snap=${s} enabledTools=${p}
          onToggle=${D} onSetAll=${O}/>
        <div id="main-content" role="tabpanel" aria-label=${(te=po.find(E=>E.id===l))==null?void 0:te.label}>
          ${A[l]?A[l]():r`<p class="text-muted">Unknown tab "${l}"</p>`}
        </div>
      </main>
    </div>
    <${Lp} path=${d} onClose=${()=>t({type:"SET_VIEWER",payload:null})}/>
    <${vv}/>
  </${Ie.Provider}>`}Jc(r`<${xv}/>`,document.getElementById("app"));
