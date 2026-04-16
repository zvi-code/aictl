(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))n(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function s(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(l){if(l.ep)return;l.ep=!0;const o=s(l);fetch(l.href,o)}})();var $l,Ee,hr,ds,qa,gr,_r,$r,qo,bo,ko,yr,rl={},cl=[],fd=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,Rn=Array.isArray;function es(e,t){for(var s in t)e[s]=t[s];return e}function Vo(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function Pn(e,t,s){var n,l,o,a={};for(o in t)o=="key"?n=t[o]:o=="ref"?l=t[o]:a[o]=t[o];if(arguments.length>2&&(a.children=arguments.length>3?$l.call(arguments,2):s),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)a[o]===void 0&&(a[o]=e.defaultProps[o]);return sl(e,a,n,l,null)}function sl(e,t,s,n,l){var o={type:e,props:t,key:s,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:l??++hr,__i:-1,__u:0};return l==null&&Ee.vnode!=null&&Ee.vnode(o),o}function yl(e){return e.children}function Dn(e,t){this.props=e,this.context=t}function rn(e,t){if(t==null)return e.__?rn(e.__,e.__i+1):null;for(var s;t<e.__k.length;t++)if((s=e.__k[t])!=null&&s.__e!=null)return s.__e;return typeof e.type=="function"?rn(e):null}function vd(e){if(e.__P&&e.__d){var t=e.__v,s=t.__e,n=[],l=[],o=es({},t);o.__v=t.__v+1,Ee.vnode&&Ee.vnode(o),Uo(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[s]:null,n,s??rn(t),!!(32&t.__u),l),o.__v=t.__v,o.__.__k[o.__i]=o,Sr(n,o,l),t.__e=t.__=null,o.__e!=s&&br(o)}}function br(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),br(e)}function xo(e){(!e.__d&&(e.__d=!0)&&ds.push(e)&&!dl.__r++||qa!=Ee.debounceRendering)&&((qa=Ee.debounceRendering)||gr)(dl)}function dl(){try{for(var e,t=1;ds.length;)ds.length>t&&ds.sort(_r),e=ds.shift(),t=ds.length,vd(e)}finally{ds.length=dl.__r=0}}function kr(e,t,s,n,l,o,a,i,c,d,f){var p,m,g,k,D,T,b,$=n&&n.__k||cl,x=t.length;for(c=md(s,t,$,c,x),p=0;p<x;p++)(g=s.__k[p])!=null&&(m=g.__i!=-1&&$[g.__i]||rl,g.__i=p,T=Uo(e,g,m,l,o,a,i,c,d,f),k=g.__e,g.ref&&m.ref!=g.ref&&(m.ref&&Go(m.ref,null,g),f.push(g.ref,g.__c||k,g)),D==null&&k!=null&&(D=k),(b=!!(4&g.__u))||m.__k===g.__k?c=xr(g,c,e,b):typeof g.type=="function"&&T!==void 0?c=T:k&&(c=k.nextSibling),g.__u&=-7);return s.__e=D,c}function md(e,t,s,n,l){var o,a,i,c,d,f=s.length,p=f,m=0;for(e.__k=new Array(l),o=0;o<l;o++)(a=t[o])!=null&&typeof a!="boolean"&&typeof a!="function"?(typeof a=="string"||typeof a=="number"||typeof a=="bigint"||a.constructor==String?a=e.__k[o]=sl(null,a,null,null,null):Rn(a)?a=e.__k[o]=sl(yl,{children:a},null,null,null):a.constructor===void 0&&a.__b>0?a=e.__k[o]=sl(a.type,a.props,a.key,a.ref?a.ref:null,a.__v):e.__k[o]=a,c=o+m,a.__=e,a.__b=e.__b+1,i=null,(d=a.__i=hd(a,s,c,p))!=-1&&(p--,(i=s[d])&&(i.__u|=2)),i==null||i.__v==null?(d==-1&&(l>f?m--:l<f&&m++),typeof a.type!="function"&&(a.__u|=4)):d!=c&&(d==c-1?m--:d==c+1?m++:(d>c?m--:m++,a.__u|=4))):e.__k[o]=null;if(p)for(o=0;o<f;o++)(i=s[o])!=null&&!(2&i.__u)&&(i.__e==n&&(n=rn(i)),Cr(i,i));return n}function xr(e,t,s,n){var l,o;if(typeof e.type=="function"){for(l=e.__k,o=0;l&&o<l.length;o++)l[o]&&(l[o].__=e,t=xr(l[o],t,s,n));return t}e.__e!=t&&(n&&(t&&e.type&&!t.parentNode&&(t=rn(e)),s.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function wr(e,t){return t=t||[],e==null||typeof e=="boolean"||(Rn(e)?e.some(function(s){wr(s,t)}):t.push(e)),t}function hd(e,t,s,n){var l,o,a,i=e.key,c=e.type,d=t[s],f=d!=null&&(2&d.__u)==0;if(d===null&&i==null||f&&i==d.key&&c==d.type)return s;if(n>(f?1:0)){for(l=s-1,o=s+1;l>=0||o<t.length;)if((d=t[a=l>=0?l--:o++])!=null&&!(2&d.__u)&&i==d.key&&c==d.type)return a}return-1}function Va(e,t,s){t[0]=="-"?e.setProperty(t,s??""):e[t]=s==null?"":typeof s!="number"||fd.test(t)?s:s+"px"}function Yn(e,t,s,n,l){var o,a;e:if(t=="style")if(typeof s=="string")e.style.cssText=s;else{if(typeof n=="string"&&(e.style.cssText=n=""),n)for(t in n)s&&t in s||Va(e.style,t,"");if(s)for(t in s)n&&s[t]==n[t]||Va(e.style,t,s[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace($r,"$1")),a=t.toLowerCase(),t=a in e||t=="onFocusOut"||t=="onFocusIn"?a.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=s,s?n?s.u=n.u:(s.u=qo,e.addEventListener(t,o?ko:bo,o)):e.removeEventListener(t,o?ko:bo,o);else{if(l=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=s??"";break e}catch{}typeof s=="function"||(s==null||s===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&s==1?"":s))}}function Ua(e){return function(t){if(this.l){var s=this.l[t.type+e];if(t.t==null)t.t=qo++;else if(t.t<s.u)return;return s(Ee.event?Ee.event(t):t)}}}function Uo(e,t,s,n,l,o,a,i,c,d){var f,p,m,g,k,D,T,b,$,x,S,j,A,M,R,y=t.type;if(t.constructor!==void 0)return null;128&s.__u&&(c=!!(32&s.__u),o=[i=t.__e=s.__e]),(f=Ee.__b)&&f(t);e:if(typeof y=="function")try{if(b=t.props,$=y.prototype&&y.prototype.render,x=(f=y.contextType)&&n[f.__c],S=f?x?x.props.value:f.__:n,s.__c?T=(p=t.__c=s.__c).__=p.__E:($?t.__c=p=new y(b,S):(t.__c=p=new Dn(b,S),p.constructor=y,p.render=_d),x&&x.sub(p),p.state||(p.state={}),p.__n=n,m=p.__d=!0,p.__h=[],p._sb=[]),$&&p.__s==null&&(p.__s=p.state),$&&y.getDerivedStateFromProps!=null&&(p.__s==p.state&&(p.__s=es({},p.__s)),es(p.__s,y.getDerivedStateFromProps(b,p.__s))),g=p.props,k=p.state,p.__v=t,m)$&&y.getDerivedStateFromProps==null&&p.componentWillMount!=null&&p.componentWillMount(),$&&p.componentDidMount!=null&&p.__h.push(p.componentDidMount);else{if($&&y.getDerivedStateFromProps==null&&b!==g&&p.componentWillReceiveProps!=null&&p.componentWillReceiveProps(b,S),t.__v==s.__v||!p.__e&&p.shouldComponentUpdate!=null&&p.shouldComponentUpdate(b,p.__s,S)===!1){t.__v!=s.__v&&(p.props=b,p.state=p.__s,p.__d=!1),t.__e=s.__e,t.__k=s.__k,t.__k.some(function(C){C&&(C.__=t)}),cl.push.apply(p.__h,p._sb),p._sb=[],p.__h.length&&a.push(p);break e}p.componentWillUpdate!=null&&p.componentWillUpdate(b,p.__s,S),$&&p.componentDidUpdate!=null&&p.__h.push(function(){p.componentDidUpdate(g,k,D)})}if(p.context=S,p.props=b,p.__P=e,p.__e=!1,j=Ee.__r,A=0,$)p.state=p.__s,p.__d=!1,j&&j(t),f=p.render(p.props,p.state,p.context),cl.push.apply(p.__h,p._sb),p._sb=[];else do p.__d=!1,j&&j(t),f=p.render(p.props,p.state,p.context),p.state=p.__s;while(p.__d&&++A<25);p.state=p.__s,p.getChildContext!=null&&(n=es(es({},n),p.getChildContext())),$&&!m&&p.getSnapshotBeforeUpdate!=null&&(D=p.getSnapshotBeforeUpdate(g,k)),M=f!=null&&f.type===yl&&f.key==null?Tr(f.props.children):f,i=kr(e,Rn(M)?M:[M],t,s,n,l,o,a,i,c,d),p.base=t.__e,t.__u&=-161,p.__h.length&&a.push(p),T&&(p.__E=p.__=null)}catch(C){if(t.__v=null,c||o!=null)if(C.then){for(t.__u|=c?160:128;i&&i.nodeType==8&&i.nextSibling;)i=i.nextSibling;o[o.indexOf(i)]=null,t.__e=i}else{for(R=o.length;R--;)Vo(o[R]);wo(t)}else t.__e=s.__e,t.__k=s.__k,C.then||wo(t);Ee.__e(C,t,s)}else o==null&&t.__v==s.__v?(t.__k=s.__k,t.__e=s.__e):i=t.__e=gd(s.__e,t,s,n,l,o,a,c,d);return(f=Ee.diffed)&&f(t),128&t.__u?void 0:i}function wo(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(wo))}function Sr(e,t,s){for(var n=0;n<s.length;n++)Go(s[n],s[++n],s[++n]);Ee.__c&&Ee.__c(t,e),e.some(function(l){try{e=l.__h,l.__h=[],e.some(function(o){o.call(l)})}catch(o){Ee.__e(o,l.__v)}})}function Tr(e){return typeof e!="object"||e==null||e.__b>0?e:Rn(e)?e.map(Tr):es({},e)}function gd(e,t,s,n,l,o,a,i,c){var d,f,p,m,g,k,D,T=s.props||rl,b=t.props,$=t.type;if($=="svg"?l="http://www.w3.org/2000/svg":$=="math"?l="http://www.w3.org/1998/Math/MathML":l||(l="http://www.w3.org/1999/xhtml"),o!=null){for(d=0;d<o.length;d++)if((g=o[d])&&"setAttribute"in g==!!$&&($?g.localName==$:g.nodeType==3)){e=g,o[d]=null;break}}if(e==null){if($==null)return document.createTextNode(b);e=document.createElementNS(l,$,b.is&&b),i&&(Ee.__m&&Ee.__m(t,o),i=!1),o=null}if($==null)T===b||i&&e.data==b||(e.data=b);else{if(o=o&&$l.call(e.childNodes),!i&&o!=null)for(T={},d=0;d<e.attributes.length;d++)T[(g=e.attributes[d]).name]=g.value;for(d in T)g=T[d],d=="dangerouslySetInnerHTML"?p=g:d=="children"||d in b||d=="value"&&"defaultValue"in b||d=="checked"&&"defaultChecked"in b||Yn(e,d,null,g,l);for(d in b)g=b[d],d=="children"?m=g:d=="dangerouslySetInnerHTML"?f=g:d=="value"?k=g:d=="checked"?D=g:i&&typeof g!="function"||T[d]===g||Yn(e,d,g,T[d],l);if(f)i||p&&(f.__html==p.__html||f.__html==e.innerHTML)||(e.innerHTML=f.__html),t.__k=[];else if(p&&(e.innerHTML=""),kr(t.type=="template"?e.content:e,Rn(m)?m:[m],t,s,n,$=="foreignObject"?"http://www.w3.org/1999/xhtml":l,o,a,o?o[0]:s.__k&&rn(s,0),i,c),o!=null)for(d=o.length;d--;)Vo(o[d]);i||(d="value",$=="progress"&&k==null?e.removeAttribute("value"):k!=null&&(k!==e[d]||$=="progress"&&!k||$=="option"&&k!=T[d])&&Yn(e,d,k,T[d],l),d="checked",D!=null&&D!=e[d]&&Yn(e,d,D,T[d],l))}return e}function Go(e,t,s){try{if(typeof e=="function"){var n=typeof e.__u=="function";n&&e.__u(),n&&t==null||(e.__u=e(t))}else e.current=t}catch(l){Ee.__e(l,s)}}function Cr(e,t,s){var n,l;if(Ee.unmount&&Ee.unmount(e),(n=e.ref)&&(n.current&&n.current!=e.__e||Go(n,null,t)),(n=e.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(o){Ee.__e(o,t)}n.base=n.__P=null}if(n=e.__k)for(l=0;l<n.length;l++)n[l]&&Cr(n[l],t,s||typeof e.type!="function");s||Vo(e.__e),e.__c=e.__=e.__e=void 0}function _d(e,t,s){return this.constructor(e,s)}function $d(e,t,s){var n,l,o,a;t==document&&(t=document.documentElement),Ee.__&&Ee.__(e,t),l=(n=!1)?null:t.__k,o=[],a=[],Uo(t,e=t.__k=Pn(yl,null,[e]),l||rl,rl,t.namespaceURI,l?null:t.firstChild?$l.call(t.childNodes):null,o,l?l.__e:t.firstChild,n,a),Sr(o,e,a)}function Mr(e){function t(s){var n,l;return this.getChildContext||(n=new Set,(l={})[t.__c]=this,this.getChildContext=function(){return l},this.componentWillUnmount=function(){n=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&n.forEach(function(a){a.__e=!0,xo(a)})},this.sub=function(o){n.add(o);var a=o.componentWillUnmount;o.componentWillUnmount=function(){n&&n.delete(o),a&&a.call(o)}}),s.children}return t.__c="__cC"+yr++,t.__=e,t.Provider=t.__l=(t.Consumer=function(s,n){return s.children(n)}).contextType=t,t}$l=cl.slice,Ee={__e:function(e,t,s,n){for(var l,o,a;t=t.__;)if((l=t.__c)&&!l.__)try{if((o=l.constructor)&&o.getDerivedStateFromError!=null&&(l.setState(o.getDerivedStateFromError(e)),a=l.__d),l.componentDidCatch!=null&&(l.componentDidCatch(e,n||{}),a=l.__d),a)return l.__E=l}catch(i){e=i}throw e}},hr=0,Dn.prototype.setState=function(e,t){var s;s=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=es({},this.state),typeof e=="function"&&(e=e(es({},s),this.props)),e&&es(s,e),e!=null&&this.__v&&(t&&this._sb.push(t),xo(this))},Dn.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),xo(this))},Dn.prototype.render=yl,ds=[],gr=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,_r=function(e,t){return e.__v.__b-t.__v.__b},dl.__r=0,$r=/(PointerCapture)$|Capture$/i,qo=0,bo=Ua(!1),ko=Ua(!0),yr=0;var Er=function(e,t,s,n){var l;t[0]=0;for(var o=1;o<t.length;o++){var a=t[o++],i=t[o]?(t[0]|=a?1:2,s[t[o++]]):t[++o];a===3?n[0]=i:a===4?n[1]=Object.assign(n[1]||{},i):a===5?(n[1]=n[1]||{})[t[++o]]=i:a===6?n[1][t[++o]]+=i+"":a?(l=e.apply(i,Er(e,i,s,["",null])),n.push(l),i[0]?t[0]|=2:(t[o-2]=0,t[o]=l)):n.push(i)}return n},Ga=new Map;function yd(e){var t=Ga.get(this);return t||(t=new Map,Ga.set(this,t)),(t=Er(this,t.get(e)||(t.set(e,t=function(s){for(var n,l,o=1,a="",i="",c=[0],d=function(m){o===1&&(m||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?c.push(0,m,a):o===3&&(m||a)?(c.push(3,m,a),o=2):o===2&&a==="..."&&m?c.push(4,m,0):o===2&&a&&!m?c.push(5,0,!0,a):o>=5&&((a||!m&&o===5)&&(c.push(o,0,a,l),o=6),m&&(c.push(o,m,0,l),o=6)),a=""},f=0;f<s.length;f++){f&&(o===1&&d(),d(f));for(var p=0;p<s[f].length;p++)n=s[f][p],o===1?n==="<"?(d(),c=[c],o=3):a+=n:o===4?a==="--"&&n===">"?(o=1,a=""):a=n+a[0]:i?n===i?i="":a+=n:n==='"'||n==="'"?i=n:n===">"?(d(),o=1):o&&(n==="="?(o=5,l=a,a=""):n==="/"&&(o<5||s[f][p+1]===">")?(d(),o===3&&(c=c[0]),o=c,(c=c[0]).push(2,0,o),o=0):n===" "||n==="	"||n===`
`||n==="\r"?(d(),o=2):a+=n),o===3&&a==="!--"&&(o=4,c=c[0])}return d(),c}(e)),t),arguments,[])).length>1?t:t[0]}var r=yd.bind(Pn),cn,Fe,so,Ya,zn=0,Dr=[],We=Ee,Ka=We.__b,Ja=We.__r,Za=We.diffed,Qa=We.__c,Xa=We.unmount,ei=We.__;function bl(e,t){We.__h&&We.__h(Fe,e,zn||t),zn=0;var s=Fe.__H||(Fe.__H={__:[],__h:[]});return e>=s.__.length&&s.__.push({}),s.__[e]}function W(e){return zn=1,Lr(Or,e)}function Lr(e,t,s){var n=bl(cn++,2);if(n.t=e,!n.__c&&(n.__=[Or(void 0,t),function(i){var c=n.__N?n.__N[0]:n.__[0],d=n.t(c,i);c!==d&&(n.__N=[d,n.__[1]],n.__c.setState({}))}],n.__c=Fe,!Fe.__f)){var l=function(i,c,d){if(!n.__c.__H)return!0;var f=n.__c.__H.__.filter(function(m){return m.__c});if(f.every(function(m){return!m.__N}))return!o||o.call(this,i,c,d);var p=n.__c.props!==i;return f.some(function(m){if(m.__N){var g=m.__[0];m.__=m.__N,m.__N=void 0,g!==m.__[0]&&(p=!0)}}),o&&o.call(this,i,c,d)||p};Fe.__f=!0;var o=Fe.shouldComponentUpdate,a=Fe.componentWillUpdate;Fe.componentWillUpdate=function(i,c,d){if(this.__e){var f=o;o=void 0,l(i,c,d),o=f}a&&a.call(this,i,c,d)},Fe.shouldComponentUpdate=l}return n.__N||n.__}function ae(e,t){var s=bl(cn++,3);!We.__s&&Ar(s.__H,t)&&(s.__=e,s.u=t,Fe.__H.__h.push(s))}function lt(e){return zn=5,re(function(){return{current:e}},[])}function re(e,t){var s=bl(cn++,7);return Ar(s.__H,t)&&(s.__=e(),s.__H=t,s.__h=e),s.__}function be(e,t){return zn=8,re(function(){return e},t)}function je(e){var t=Fe.context[e.__c],s=bl(cn++,9);return s.c=e,t?(s.__==null&&(s.__=!0,t.sub(Fe)),t.props.value):e.__}function bd(){for(var e;e=Dr.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(nl),t.__h.some(So),t.__h=[]}catch(s){t.__h=[],We.__e(s,e.__v)}}}We.__b=function(e){Fe=null,Ka&&Ka(e)},We.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),ei&&ei(e,t)},We.__r=function(e){Ja&&Ja(e),cn=0;var t=(Fe=e.__c).__H;t&&(so===Fe?(t.__h=[],Fe.__h=[],t.__.some(function(s){s.__N&&(s.__=s.__N),s.u=s.__N=void 0})):(t.__h.some(nl),t.__h.some(So),t.__h=[],cn=0)),so=Fe},We.diffed=function(e){Za&&Za(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(Dr.push(t)!==1&&Ya===We.requestAnimationFrame||((Ya=We.requestAnimationFrame)||kd)(bd)),t.__H.__.some(function(s){s.u&&(s.__H=s.u),s.u=void 0})),so=Fe=null},We.__c=function(e,t){t.some(function(s){try{s.__h.some(nl),s.__h=s.__h.filter(function(n){return!n.__||So(n)})}catch(n){t.some(function(l){l.__h&&(l.__h=[])}),t=[],We.__e(n,s.__v)}}),Qa&&Qa(e,t)},We.unmount=function(e){Xa&&Xa(e);var t,s=e.__c;s&&s.__H&&(s.__H.__.some(function(n){try{nl(n)}catch(l){t=l}}),s.__H=void 0,t&&We.__e(t,s.__v))};var ti=typeof requestAnimationFrame=="function";function kd(e){var t,s=function(){clearTimeout(n),ti&&cancelAnimationFrame(t),setTimeout(e)},n=setTimeout(s,35);ti&&(t=requestAnimationFrame(s))}function nl(e){var t=Fe,s=e.__c;typeof s=="function"&&(e.__c=void 0,s()),Fe=t}function So(e){var t=Fe;e.__c=e.__(),Fe=t}function Ar(e,t){return!e||e.length!==t.length||t.some(function(s,n){return s!==e[n]})}function Or(e,t){return typeof t=="function"?t(e):t}const Ie=Mr(null);let xd="";function Be(e){return xd+e}async function si(){return(await fetch(Be("/api/snapshot"))).json()}async function Ln(e={}){let t="/api/history";const s=[];return e.range&&s.push("range="+e.range),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.tool&&s.push("tool="+encodeURIComponent(e.tool)),s.length&&(t+="?"+s.join("&")),(await fetch(Be(t))).json()}async function Yo(e={}){let t="/api/events";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.sessionId&&s.push("session_id="+encodeURIComponent(e.sessionId)),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(Be(t))).json()}async function Pr(e={}){let t="/api/sessions";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.active!=null&&s.push("active="+e.active),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(Be(t))).json()}async function Ko(e,t,s){let n=`/api/session-flow?session_id=${encodeURIComponent(e)}&since=${t}&until=${s}`;return(await fetch(Be(n))).json()}async function kl(e,t={}){let s="/api/session-timeline";const n=[];return t.since!=null&&n.push("since="+t.since),t.until!=null&&n.push("until="+t.until),n.length&&(s+="?"+n.join("&")),(await fetch(Be(s))).json()}async function wd(e,t,s=30,n=20){const l=`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=${s}&limit=${n}`;return(await fetch(Be(l))).json()}async function Sd(e){return(await fetch(Be("/api/agent-teams?session_id="+encodeURIComponent(e)))).json()}async function Td(e){return(await fetch(Be("/api/transcript/"+encodeURIComponent(e)))).json()}async function Cd(e,t={}){return(await fetch(Be(e),t)).json()}async function Md(e=7){return(await fetch(Be("/api/project-costs?days="+e))).json()}async function Ed(e,t=100){return(await fetch(Be(`/api/api-calls?since=${e}&limit=${t}`))).json()}async function Dd(){return(await fetch(Be("/api/budget"))).json()}async function Ld(e,t={}){return fetch(Be("/api/file?path="+encodeURIComponent(e)),{headers:t})}async function Ad(){return(await fetch(Be("/api/samples?list=1"))).json()}async function Od(e,t){return(await fetch(Be("/api/samples?series="+encodeURIComponent(e)+"&since="+t))).json()}async function Pd(e,t){return(await fetch(Be("/api/samples?metric="+encodeURIComponent(e)+"&since="+t))).json()}async function zr(){return(await fetch(Be("/api/otel-status"))).json()}async function zd(){return(await fetch(Be("/api/self-status"))).json()}let no=null;async function Fd(){return no||(no=fetch(Be("/api/datapoints")).then(e=>e.json())),no}function Rd(){return Be("/api/stream")}const De=window.COLORS??{},mt=window.ICONS??{},Fr=window.VENDOR_LABELS??{},Nd=window.VENDOR_COLORS??{},Id=window.HOST_LABELS??{},ni=window.TOOL_RELATIONSHIPS??{},jd={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},lo=["auto","dark","light"],Bd={auto:"☾",dark:"☾",light:"☀"},on=5,Zs=15,Hd={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},li=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],Wd={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},qd=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],ul=new Map,Vd=6e4;function Rr(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function xl(e,t,s,n=1){for(let l=t.length-1;l>=0;l--){const[o,a]=t[l],i=e/o;if(i>=n)return Rr(i)+a}return Math.round(e)+s}const Ud=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],Gd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],Yd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function F(e){return xl(e,Gd,"")}function Ge(e){return xl(e,Yd,"")}function ge(e){return xl(e,Ud,"B")}function jt(e){return!e||e<=0?"0B/s":xl(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function _e(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function K(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function Jo(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function Nr(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Es(e){return e&&e.replace(/\\/g,"/")}function oo(e,t){const s=Es(e),n=Es(t);return s.startsWith(n+"/")?"project":s.includes("/.claude/projects/")?"shadow":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")||s.includes("/.copilot/")||s.includes("/.vscode/")?"global":"external"}function Kd(e,t){const s=Es(e),n=Es(t);if(s.startsWith(n+"/")){const o=s.slice(n.length+1),a=o.split("/");return a.pop(),a.length?a.join("/"):"(root)"}const l=s.split("/");l.pop();for(let o=l.length-1;o>=0;o--)if(l[o].startsWith(".")&&l[o].length>1&&l[o]!==".."||l[o]==="Library"||l[o]==="AppData")return"~/"+l.slice(o).join("/");return l.slice(-2).join("/")}function Jd(e,t){const s={};e.forEach(l=>{const o=oo(l.path,t),a=Kd(l.path,t),i=o==="project"?a:o+": "+a;(s[i]=s[i]||[]).push(l)});const n={project:0,global:1,shadow:2,external:3};return Object.entries(s).sort((l,o)=>{const a=l[1][0]?oo(l[1][0].path,t):"z",i=o[1][0]?oo(o[1][0].path,t):"z";return(n[a]||9)-(n[i]||9)})}function Zd(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let s=2;s<e.length;s++)t.push((e[s-2]+e[s-1]+e[s])/3);return t}async function Zo(e){const t=ul.get(e);if(t&&Date.now()-t.ts<Vd)return t.content;const s={};t&&t.etag&&(s["If-None-Match"]=t.etag);const n=await Ld(e,s);if(n.status===304&&t)return t.ts=Date.now(),t.content;if(!n.ok)throw new Error(n.statusText);const l=await n.text(),o=n.headers.get("ETag")||null;return ul.set(e,{content:l,ts:Date.now(),etag:o}),l}function Bt(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function Ir(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function ao(e,t,s,n){if(e==null||e==="")return"";let l=typeof e=="number"?e:parseFloat(e)||0;n&&(l*=n);let o;switch(t){case"size":o=ge(l);break;case"rate":o=jt(l);break;case"kilo":o=F(l);break;case"percent":o=_e(l);break;case"pct":o=_e(l);break;case"raw":default:o=Number.isInteger(l)?String(l):Rr(l)}return s?o+s:o}function oi(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const tn={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],tabs:[{id:"overview",label:"Dashboard",icon:"📊",iconName:"layout-dashboard",key:"1"},{id:"procs",label:"Processes",icon:"⚙️",iconName:"cpu",key:"2"},{id:"memory",label:"AI Context",icon:"📝",iconName:"brain",key:"3"},{id:"live",label:"Live Monitor",icon:"📡",iconName:"radio",key:"4"},{id:"events",label:"Events & Stats",icon:"📈",iconName:"activity",key:"5"},{id:"budget",label:"Token Budget",icon:"💰",iconName:"wallet",key:"6"},{id:"sessions",label:"Sessions",icon:"🔄",iconName:"refresh-cw",key:"7"},{id:"analytics",label:"Analytics",icon:"🔬",iconName:"bar-chart-3",key:"8"},{id:"flow",label:"Session Flow",icon:"🔀",iconName:"git-branch",key:"9"},{id:"transcript",label:"Transcript",icon:"📜",iconName:"file-text",key:"t"},{id:"timeline",label:"Timeline",icon:"📉",iconName:"line-chart",key:"y"},{id:"config",label:"Configuration",icon:"⚙️",iconName:"settings",key:"0"}]},ai=200,ii=80,Qd=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Xd(e,t){if(!e)return t;const s=Object.fromEntries((t.tools||[]).map(n=>[n.tool,n]));return{...e,...t,tools:e.tools.map(n=>{const l=s[n.tool];return l?{...n,live:l.live,vendor:l.vendor||n.vendor,host:l.host||n.host}:n})}}function eu(e,t){var n,l,o,a;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>ai)for(const i of Qd)e[i]=e[i].slice(-ai);const s=e.by_tool||{};for(const i of t.tools||[]){if(i.tool==="aictl")continue;const c=((n=i.live)==null?void 0:n.cpu_percent)||0,d=((l=i.live)==null?void 0:l.mem_mb)||0,f=i.tokens||0,p=(((o=i.live)==null?void 0:o.outbound_rate_bps)||0)+(((a=i.live)==null?void 0:a.inbound_rate_bps)||0);s[i.tool]||(s[i.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const m=s[i.tool];if(m.ts.push(t.timestamp),m.cpu.push(Math.round(c*10)/10),m.mem_mb.push(Math.round(d*10)/10),m.tokens.push(f),m.traffic.push(Math.round(p*100)/100),m.ts.length>ii)for(const g of Object.keys(m))m[g]=m[g].slice(-ii)}return{...e,by_tool:s}}const tu=!0,Ke="u-",su="uplot",nu=Ke+"hz",lu=Ke+"vt",ou=Ke+"title",au=Ke+"wrap",iu=Ke+"under",ru=Ke+"over",cu=Ke+"axis",Cs=Ke+"off",du=Ke+"select",uu=Ke+"cursor-x",pu=Ke+"cursor-y",fu=Ke+"cursor-pt",vu=Ke+"legend",mu=Ke+"live",hu=Ke+"inline",gu=Ke+"series",_u=Ke+"marker",ri=Ke+"label",$u=Ke+"value",Cn="width",Mn="height",Sn="top",ci="bottom",Qs="left",io="right",Qo="#000",di=Qo+"0",ro="mousemove",ui="mousedown",co="mouseup",pi="mouseenter",fi="mouseleave",vi="dblclick",yu="resize",bu="scroll",mi="change",pl="dppxchange",Xo="--",vn=typeof window<"u",To=vn?document:null,an=vn?window:null,ku=vn?navigator:null;let me,Kn;function Co(){let e=devicePixelRatio;me!=e&&(me=e,Kn&&Eo(mi,Kn,Co),Kn=matchMedia(`(min-resolution: ${me-.001}dppx) and (max-resolution: ${me+.001}dppx)`),Ms(mi,Kn,Co),an.dispatchEvent(new CustomEvent(pl)))}function bt(e,t){if(t!=null){let s=e.classList;!s.contains(t)&&s.add(t)}}function Mo(e,t){let s=e.classList;s.contains(t)&&s.remove(t)}function Me(e,t,s){e.style[t]=s+"px"}function Rt(e,t,s,n){let l=To.createElement(e);return t!=null&&bt(l,t),s!=null&&s.insertBefore(l,n),l}function Dt(e,t){return Rt("div",e,t)}const hi=new WeakMap;function Kt(e,t,s,n,l){let o="translate("+t+"px,"+s+"px)",a=hi.get(e);o!=a&&(e.style.transform=o,hi.set(e,o),t<0||s<0||t>n||s>l?bt(e,Cs):Mo(e,Cs))}const gi=new WeakMap;function _i(e,t,s){let n=t+s,l=gi.get(e);n!=l&&(gi.set(e,n),e.style.background=t,e.style.borderColor=s)}const $i=new WeakMap;function yi(e,t,s,n){let l=t+""+s,o=$i.get(e);l!=o&&($i.set(e,l),e.style.height=s+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-s/2+"px":0)}const ea={passive:!0},xu={...ea,capture:!0};function Ms(e,t,s,n){t.addEventListener(e,s,n?xu:ea)}function Eo(e,t,s,n){t.removeEventListener(e,s,ea)}vn&&Co();function Nt(e,t,s,n){let l;s=s||0,n=n||t.length-1;let o=n<=2147483647;for(;n-s>1;)l=o?s+n>>1:kt((s+n)/2),t[l]<e?s=l:n=l;return e-t[s]<=t[n]-e?s:n}function jr(e){return(s,n,l)=>{let o=-1,a=-1;for(let i=n;i<=l;i++)if(e(s[i])){o=i;break}for(let i=l;i>=n;i--)if(e(s[i])){a=i;break}return[o,a]}}const Br=e=>e!=null,Hr=e=>e!=null&&e>0,wl=jr(Br),wu=jr(Hr);function Su(e,t,s,n=0,l=!1){let o=l?wu:wl,a=l?Hr:Br;[t,s]=o(e,t,s);let i=e[t],c=e[t];if(t>-1)if(n==1)i=e[t],c=e[s];else if(n==-1)i=e[s],c=e[t];else for(let d=t;d<=s;d++){let f=e[d];a(f)&&(f<i?i=f:f>c&&(c=f))}return[i??ke,c??-ke]}function Sl(e,t,s,n){let l=xi(e),o=xi(t);e==t&&(l==-1?(e*=s,t/=s):(e/=s,t*=s));let a=s==10?ss:Wr,i=l==1?kt:Lt,c=o==1?Lt:kt,d=i(a(Ye(e))),f=c(a(Ye(t))),p=dn(s,d),m=dn(s,f);return s==10&&(d<0&&(p=xe(p,-d)),f<0&&(m=xe(m,-f))),n||s==2?(e=p*l,t=m*o):(e=Gr(e,p),t=Tl(t,m)),[e,t]}function ta(e,t,s,n){let l=Sl(e,t,s,n);return e==0&&(l[0]=0),t==0&&(l[1]=0),l}const sa=.1,bi={mode:3,pad:sa},An={pad:0,soft:null,mode:0},Tu={min:An,max:An};function fl(e,t,s,n){return Cl(s)?ki(e,t,s):(An.pad=s,An.soft=n?0:null,An.mode=n?3:0,ki(e,t,Tu))}function fe(e,t){return e??t}function Cu(e,t,s){for(t=fe(t,0),s=fe(s,e.length-1);t<=s;){if(e[t]!=null)return!0;t++}return!1}function ki(e,t,s){let n=s.min,l=s.max,o=fe(n.pad,0),a=fe(l.pad,0),i=fe(n.hard,-ke),c=fe(l.hard,ke),d=fe(n.soft,ke),f=fe(l.soft,-ke),p=fe(n.mode,0),m=fe(l.mode,0),g=t-e,k=ss(g),D=pt(Ye(e),Ye(t)),T=ss(D),b=Ye(T-k);(g<1e-24||b>10)&&(g=0,(e==0||t==0)&&(g=1e-24,p==2&&d!=ke&&(o=0),m==2&&f!=-ke&&(a=0)));let $=g||D||1e3,x=ss($),S=dn(10,kt(x)),j=$*(g==0?e==0?.1:1:o),A=xe(Gr(e-j,S/10),24),M=e>=d&&(p==1||p==3&&A<=d||p==2&&A>=d)?d:ke,R=pt(i,A<M&&e>=M?M:It(M,A)),y=$*(g==0?t==0?.1:1:a),C=xe(Tl(t+y,S/10),24),P=t<=f&&(m==1||m==3&&C>=f||m==2&&C<=f)?f:-ke,z=It(c,C>P&&t<=P?P:pt(P,C));return R==z&&R==0&&(z=100),[R,z]}const Mu=new Intl.NumberFormat(vn?ku.language:"en-US"),na=e=>Mu.format(e),xt=Math,ll=xt.PI,Ye=xt.abs,kt=xt.floor,Ue=xt.round,Lt=xt.ceil,It=xt.min,pt=xt.max,dn=xt.pow,xi=xt.sign,ss=xt.log10,Wr=xt.log2,Eu=(e,t=1)=>xt.sinh(e)*t,uo=(e,t=1)=>xt.asinh(e/t),ke=1/0;function wi(e){return(ss((e^e>>31)-(e>>31))|0)+1}function Do(e,t,s){return It(pt(e,t),s)}function qr(e){return typeof e=="function"}function de(e){return qr(e)?e:()=>e}const Du=()=>{},Vr=e=>e,Ur=(e,t)=>t,Lu=e=>null,Si=e=>!0,Ti=(e,t)=>e==t,Au=/\.\d*?(?=9{6,}|0{6,})/gm,Ds=e=>{if(Kr(e)||vs.has(e))return e;const t=`${e}`,s=t.match(Au);if(s==null)return e;let n=s[0].length-1;if(t.indexOf("e-")!=-1){let[l,o]=t.split("e");return+`${Ds(l)}e${o}`}return xe(e,n)};function Ss(e,t){return Ds(xe(Ds(e/t))*t)}function Tl(e,t){return Ds(Lt(Ds(e/t))*t)}function Gr(e,t){return Ds(kt(Ds(e/t))*t)}function xe(e,t=0){if(Kr(e))return e;let s=10**t,n=e*s*(1+Number.EPSILON);return Ue(n)/s}const vs=new Map;function Yr(e){return((""+e).split(".")[1]||"").length}function Fn(e,t,s,n){let l=[],o=n.map(Yr);for(let a=t;a<s;a++){let i=Ye(a),c=xe(dn(e,a),i);for(let d=0;d<n.length;d++){let f=e==10?+`${n[d]}e${a}`:n[d]*c,p=(a>=0?0:i)+(a>=o[d]?0:o[d]),m=e==10?f:xe(f,p);l.push(m),vs.set(m,p)}}return l}const On={},la=[],un=[null,null],us=Array.isArray,Kr=Number.isInteger,Ou=e=>e===void 0;function Ci(e){return typeof e=="string"}function Cl(e){let t=!1;if(e!=null){let s=e.constructor;t=s==null||s==Object}return t}function Pu(e){return e!=null&&typeof e=="object"}const zu=Object.getPrototypeOf(Uint8Array),Jr="__proto__";function pn(e,t=Cl){let s;if(us(e)){let n=e.find(l=>l!=null);if(us(n)||t(n)){s=Array(e.length);for(let l=0;l<e.length;l++)s[l]=pn(e[l],t)}else s=e.slice()}else if(e instanceof zu)s=e.slice();else if(t(e)){s={};for(let n in e)n!=Jr&&(s[n]=pn(e[n],t))}else s=e;return s}function qe(e){let t=arguments;for(let s=1;s<t.length;s++){let n=t[s];for(let l in n)l!=Jr&&(Cl(e[l])?qe(e[l],pn(n[l])):e[l]=pn(n[l]))}return e}const Fu=0,Ru=1,Nu=2;function Iu(e,t,s){for(let n=0,l,o=-1;n<t.length;n++){let a=t[n];if(a>o){for(l=a-1;l>=0&&e[l]==null;)e[l--]=null;for(l=a+1;l<s&&e[l]==null;)e[o=l++]=null}}}function ju(e,t){if(Wu(e)){let a=e[0].slice();for(let i=1;i<e.length;i++)a.push(...e[i].slice(1));return qu(a[0])||(a=Hu(a)),a}let s=new Set;for(let a=0;a<e.length;a++){let c=e[a][0],d=c.length;for(let f=0;f<d;f++)s.add(c[f])}let n=[Array.from(s).sort((a,i)=>a-i)],l=n[0].length,o=new Map;for(let a=0;a<l;a++)o.set(n[0][a],a);for(let a=0;a<e.length;a++){let i=e[a],c=i[0];for(let d=1;d<i.length;d++){let f=i[d],p=Array(l).fill(void 0),m=t?t[a][d]:Ru,g=[];for(let k=0;k<f.length;k++){let D=f[k],T=o.get(c[k]);D===null?m!=Fu&&(p[T]=D,m==Nu&&g.push(T)):p[T]=D}Iu(p,g,l),n.push(p)}}return n}const Bu=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function Hu(e){let t=e[0],s=t.length,n=Array(s);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,a)=>t[o]-t[a]);let l=[];for(let o=0;o<e.length;o++){let a=e[o],i=Array(s);for(let c=0;c<s;c++)i[c]=a[n[c]];l.push(i)}return l}function Wu(e){let t=e[0][0],s=t.length;for(let n=1;n<e.length;n++){let l=e[n][0];if(l.length!=s)return!1;if(l!=t){for(let o=0;o<s;o++)if(l[o]!=t[o])return!1}}return!0}function qu(e,t=100){const s=e.length;if(s<=1)return!0;let n=0,l=s-1;for(;n<=l&&e[n]==null;)n++;for(;l>=n&&e[l]==null;)l--;if(l<=n)return!0;const o=pt(1,kt((l-n+1)/t));for(let a=e[n],i=n+o;i<=l;i+=o){const c=e[i];if(c!=null){if(c<=a)return!1;a=c}}return!0}const Zr=["January","February","March","April","May","June","July","August","September","October","November","December"],Qr=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function Xr(e){return e.slice(0,3)}const Vu=Qr.map(Xr),Uu=Zr.map(Xr),Gu={MMMM:Zr,MMM:Uu,WWWW:Qr,WWW:Vu};function Tn(e){return(e<10?"0":"")+e}function Yu(e){return(e<10?"00":e<100?"0":"")+e}const Ku={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>Tn(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>Tn(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>Tn(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>Tn(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>Tn(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Yu(e.getMilliseconds())};function oa(e,t){t=t||Gu;let s=[],n=/\{([a-z]+)\}|[^{]+/gi,l;for(;l=n.exec(e);)s.push(l[0][0]=="{"?Ku[l[1]]:l[0]);return o=>{let a="";for(let i=0;i<s.length;i++)a+=typeof s[i]=="string"?s[i]:s[i](o,t);return a}}const Ju=new Intl.DateTimeFormat().resolvedOptions().timeZone;function Zu(e,t){let s;return t=="UTC"||t=="Etc/UTC"?s=new Date(+e+e.getTimezoneOffset()*6e4):t==Ju?s=e:(s=new Date(e.toLocaleString("en-US",{timeZone:t})),s.setMilliseconds(e.getMilliseconds())),s}const ec=e=>e%1==0,vl=[1,2,2.5,5],Qu=Fn(10,-32,0,vl),tc=Fn(10,0,32,vl),Xu=tc.filter(ec),Ts=Qu.concat(tc),aa=`
`,sc="{YYYY}",Mi=aa+sc,nc="{M}/{D}",En=aa+nc,Jn=En+"/{YY}",lc="{aa}",ep="{h}:{mm}",sn=ep+lc,Ei=aa+sn,Di=":{ss}",he=null;function oc(e){let t=e*1e3,s=t*60,n=s*60,l=n*24,o=l*30,a=l*365,c=(e==1?Fn(10,0,3,vl).filter(ec):Fn(10,-3,0,vl)).concat([t,t*5,t*10,t*15,t*30,s,s*5,s*10,s*15,s*30,n,n*2,n*3,n*4,n*6,n*8,n*12,l,l*2,l*3,l*4,l*5,l*6,l*7,l*8,l*9,l*10,l*15,o,o*2,o*3,o*4,o*6,a,a*2,a*5,a*10,a*25,a*50,a*100]);const d=[[a,sc,he,he,he,he,he,he,1],[l*28,"{MMM}",Mi,he,he,he,he,he,1],[l,nc,Mi,he,he,he,he,he,1],[n,"{h}"+lc,Jn,he,En,he,he,he,1],[s,sn,Jn,he,En,he,he,he,1],[t,Di,Jn+" "+sn,he,En+" "+sn,he,Ei,he,1],[e,Di+".{fff}",Jn+" "+sn,he,En+" "+sn,he,Ei,he,1]];function f(p){return(m,g,k,D,T,b)=>{let $=[],x=T>=a,S=T>=o&&T<a,j=p(k),A=xe(j*e,3),M=po(j.getFullYear(),x?0:j.getMonth(),S||x?1:j.getDate()),R=xe(M*e,3);if(S||x){let y=S?T/o:0,C=x?T/a:0,P=A==R?A:xe(po(M.getFullYear()+C,M.getMonth()+y,1)*e,3),z=new Date(Ue(P/e)),E=z.getFullYear(),Y=z.getMonth();for(let G=0;P<=D;G++){let ne=po(E+C*G,Y+y*G,1),O=ne-p(xe(ne*e,3));P=xe((+ne+O)*e,3),P<=D&&$.push(P)}}else{let y=T>=l?l:T,C=kt(k)-kt(A),P=R+C+Tl(A-R,y);$.push(P);let z=p(P),E=z.getHours()+z.getMinutes()/s+z.getSeconds()/n,Y=T/n,G=m.axes[g]._space,ne=b/G;for(;P=xe(P+T,e==1?0:3),!(P>D);)if(Y>1){let O=kt(xe(E+Y,6))%24,I=p(P).getHours()-O;I>1&&(I=-1),P-=I*n,E=(E+Y)%24;let se=$[$.length-1];xe((P-se)/T,3)*ne>=.7&&$.push(P)}else $.push(P)}return $}}return[c,d,f]}const[tp,sp,np]=oc(1),[lp,op,ap]=oc(.001);Fn(2,-53,53,[1]);function Li(e,t){return e.map(s=>s.map((n,l)=>l==0||l==8||n==null?n:t(l==1||s[8]==0?n:s[1]+n)))}function Ai(e,t){return(s,n,l,o,a)=>{let i=t.find(k=>a>=k[0])||t[t.length-1],c,d,f,p,m,g;return n.map(k=>{let D=e(k),T=D.getFullYear(),b=D.getMonth(),$=D.getDate(),x=D.getHours(),S=D.getMinutes(),j=D.getSeconds(),A=T!=c&&i[2]||b!=d&&i[3]||$!=f&&i[4]||x!=p&&i[5]||S!=m&&i[6]||j!=g&&i[7]||i[1];return c=T,d=b,f=$,p=x,m=S,g=j,A(D)})}}function ip(e,t){let s=oa(t);return(n,l,o,a,i)=>l.map(c=>s(e(c)))}function po(e,t,s){return new Date(e,t,s)}function Oi(e,t){return t(e)}const rp="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function Pi(e,t){return(s,n,l,o)=>o==null?Xo:t(e(n))}function cp(e,t){let s=e.series[t];return s.width?s.stroke(e,t):s.points.width?s.points.stroke(e,t):null}function dp(e,t){return e.series[t].fill(e,t)}const up={show:!0,live:!0,isolate:!1,mount:Du,markers:{show:!0,width:2,stroke:cp,fill:dp,dash:"solid"},idx:null,idxs:null,values:[]};function pp(e,t){let s=e.cursor.points,n=Dt(),l=s.size(e,t);Me(n,Cn,l),Me(n,Mn,l);let o=l/-2;Me(n,"marginLeft",o),Me(n,"marginTop",o);let a=s.width(e,t,l);return a&&Me(n,"borderWidth",a),n}function fp(e,t){let s=e.series[t].points;return s._fill||s._stroke}function vp(e,t){let s=e.series[t].points;return s._stroke||s._fill}function mp(e,t){return e.series[t].points.size}const fo=[0,0];function hp(e,t,s){return fo[0]=t,fo[1]=s,fo}function Zn(e,t,s,n=!0){return l=>{l.button==0&&(!n||l.target==t)&&s(l)}}function vo(e,t,s,n=!0){return l=>{(!n||l.target==t)&&s(l)}}const gp={show:!0,x:!0,y:!0,lock:!1,move:hp,points:{one:!1,show:pp,size:mp,width:0,stroke:vp,fill:fp},bind:{mousedown:Zn,mouseup:Zn,click:Zn,dblclick:Zn,mousemove:vo,mouseleave:vo,mouseenter:vo},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,s,n,l)=>n-l,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},ac={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},ia=qe({},ac,{filter:Ur}),ic=qe({},ia,{size:10}),rc=qe({},ac,{show:!1}),ra='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',cc="bold "+ra,dc=1.5,zi={show:!0,scale:"x",stroke:Qo,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:cc,side:2,grid:ia,ticks:ic,border:rc,font:ra,lineGap:dc,rotate:0},_p="Value",$p="Time",Fi={show:!0,scale:"x",auto:!1,sorted:1,min:ke,max:-ke,idxs:[]};function yp(e,t,s,n,l){return t.map(o=>o==null?"":na(o))}function bp(e,t,s,n,l,o,a){let i=[],c=vs.get(l)||0;s=a?s:xe(Tl(s,l),c);for(let d=s;d<=n;d=xe(d+l,c))i.push(Object.is(d,-0)?0:d);return i}function Lo(e,t,s,n,l,o,a){const i=[],c=e.scales[e.axes[t].scale].log,d=c==10?ss:Wr,f=kt(d(s));l=dn(c,f),c==10&&(l=Ts[Nt(l,Ts)]);let p=s,m=l*c;c==10&&(m=Ts[Nt(m,Ts)]);do i.push(p),p=p+l,c==10&&!vs.has(p)&&(p=xe(p,vs.get(l))),p>=m&&(l=p,m=l*c,c==10&&(m=Ts[Nt(m,Ts)]));while(p<=n);return i}function kp(e,t,s,n,l,o,a){let c=e.scales[e.axes[t].scale].asinh,d=n>c?Lo(e,t,pt(c,s),n,l):[c],f=n>=0&&s<=0?[0]:[];return(s<-c?Lo(e,t,pt(c,-n),-s,l):[c]).reverse().map(m=>-m).concat(f,d)}const uc=/./,xp=/[12357]/,wp=/[125]/,Ri=/1/,Ao=(e,t,s,n)=>e.map((l,o)=>t==4&&l==0||o%n==0&&s.test(l.toExponential()[l<0?1:0])?l:null);function Sp(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=e.scales[a],c=e.valToPos,d=o._space,f=c(10,a),p=c(9,a)-f>=d?uc:c(7,a)-f>=d?xp:c(5,a)-f>=d?wp:Ri;if(p==Ri){let m=Ye(c(1,a)-f);if(m<d)return Ao(t.slice().reverse(),i.distr,p,Lt(d/m)).reverse()}return Ao(t,i.distr,p,1)}function Tp(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=o._space,c=e.valToPos,d=Ye(c(1,a)-c(2,a));return d<i?Ao(t.slice().reverse(),3,uc,Lt(i/d)).reverse():t}function Cp(e,t,s,n){return n==null?Xo:t==null?"":na(t)}const Ni={show:!0,scale:"y",stroke:Qo,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:cc,side:3,grid:ia,ticks:ic,border:rc,font:ra,lineGap:dc,rotate:0};function Mp(e,t){let s=3+(e||1)*2;return xe(s*t,3)}function Ep(e,t){let{scale:s,idxs:n}=e.series[0],l=e._data[0],o=e.valToPos(l[n[0]],s,!0),a=e.valToPos(l[n[1]],s,!0),i=Ye(a-o),c=e.series[t],d=i/(c.points.space*me);return n[1]-n[0]<=d}const Ii={scale:null,auto:!0,sorted:0,min:ke,max:-ke},pc=(e,t,s,n,l)=>l,ji={show:!0,auto:!0,sorted:0,gaps:pc,alpha:1,facets:[qe({},Ii,{scale:"x"}),qe({},Ii,{scale:"y"})]},Bi={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:pc,alpha:1,points:{show:Ep,filter:null},values:null,min:ke,max:-ke,idxs:[],path:null,clip:null};function Dp(e,t,s,n,l){return s/10}const fc={time:tu,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},Lp=qe({},fc,{time:!1,ori:1}),Hi={};function vc(e,t){let s=Hi[e];return s||(s={key:e,plots:[],sub(n){s.plots.push(n)},unsub(n){s.plots=s.plots.filter(l=>l!=n)},pub(n,l,o,a,i,c,d){for(let f=0;f<s.plots.length;f++)s.plots[f]!=l&&s.plots[f].pub(n,l,o,a,i,c,d)}},e!=null&&(Hi[e]=s)),s}const fn=1,Oo=2;function Ls(e,t,s){const n=e.mode,l=e.series[t],o=n==2?e._data[t]:e._data,a=e.scales,i=e.bbox;let c=o[0],d=n==2?o[1]:o[t],f=n==2?a[l.facets[0].scale]:a[e.series[0].scale],p=n==2?a[l.facets[1].scale]:a[l.scale],m=i.left,g=i.top,k=i.width,D=i.height,T=e.valToPosH,b=e.valToPosV;return f.ori==0?s(l,c,d,f,p,T,b,m,g,k,D,El,mn,Ll,hc,_c):s(l,c,d,f,p,b,T,g,m,D,k,Dl,hn,ua,gc,$c)}function ca(e,t){let s=0,n=0,l=fe(e.bands,la);for(let o=0;o<l.length;o++){let a=l[o];a.series[0]==t?s=a.dir:a.series[1]==t&&(a.dir==1?n|=1:n|=2)}return[s,n==1?-1:n==2?1:n==3?2:0]}function Ap(e,t,s,n,l){let o=e.mode,a=e.series[t],i=o==2?a.facets[1].scale:a.scale,c=e.scales[i];return l==-1?c.min:l==1?c.max:c.distr==3?c.dir==1?c.min:c.max:0}function ns(e,t,s,n,l,o){return Ls(e,t,(a,i,c,d,f,p,m,g,k,D,T)=>{let b=a.pxRound;const $=d.dir*(d.ori==0?1:-1),x=d.ori==0?mn:hn;let S,j;$==1?(S=s,j=n):(S=n,j=s);let A=b(p(i[S],d,D,g)),M=b(m(c[S],f,T,k)),R=b(p(i[j],d,D,g)),y=b(m(o==1?f.max:f.min,f,T,k)),C=new Path2D(l);return x(C,R,y),x(C,A,y),x(C,A,M),C})}function Ml(e,t,s,n,l,o){let a=null;if(e.length>0){a=new Path2D;const i=t==0?Ll:ua;let c=s;for(let p=0;p<e.length;p++){let m=e[p];if(m[1]>m[0]){let g=m[0]-c;g>0&&i(a,c,n,g,n+o),c=m[1]}}let d=s+l-c,f=10;d>0&&i(a,c,n-f/2,d,n+o+f)}return a}function Op(e,t,s){let n=e[e.length-1];n&&n[0]==t?n[1]=s:e.push([t,s])}function da(e,t,s,n,l,o,a){let i=[],c=e.length;for(let d=l==1?s:n;d>=s&&d<=n;d+=l)if(t[d]===null){let p=d,m=d;if(l==1)for(;++d<=n&&t[d]===null;)m=d;else for(;--d>=s&&t[d]===null;)m=d;let g=o(e[p]),k=m==p?g:o(e[m]),D=p-l;g=a<=0&&D>=0&&D<c?o(e[D]):g;let b=m+l;k=a>=0&&b>=0&&b<c?o(e[b]):k,k>=g&&i.push([g,k])}return i}function Wi(e){return e==0?Vr:e==1?Ue:t=>Ss(t,e)}function mc(e){let t=e==0?El:Dl,s=e==0?(l,o,a,i,c,d)=>{l.arcTo(o,a,i,c,d)}:(l,o,a,i,c,d)=>{l.arcTo(a,o,c,i,d)},n=e==0?(l,o,a,i,c)=>{l.rect(o,a,i,c)}:(l,o,a,i,c)=>{l.rect(a,o,c,i)};return(l,o,a,i,c,d=0,f=0)=>{d==0&&f==0?n(l,o,a,i,c):(d=It(d,i/2,c/2),f=It(f,i/2,c/2),t(l,o+d,a),s(l,o+i,a,o+i,a+c,d),s(l,o+i,a+c,o,a+c,f),s(l,o,a+c,o,a,f),s(l,o,a,o+i,a,d),l.closePath())}}const El=(e,t,s)=>{e.moveTo(t,s)},Dl=(e,t,s)=>{e.moveTo(s,t)},mn=(e,t,s)=>{e.lineTo(t,s)},hn=(e,t,s)=>{e.lineTo(s,t)},Ll=mc(0),ua=mc(1),hc=(e,t,s,n,l,o)=>{e.arc(t,s,n,l,o)},gc=(e,t,s,n,l,o)=>{e.arc(s,t,n,l,o)},_c=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(t,s,n,l,o,a)},$c=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(s,t,l,n,a,o)};function yc(e){return(t,s,n,l,o)=>Ls(t,s,(a,i,c,d,f,p,m,g,k,D,T)=>{let{pxRound:b,points:$}=a,x,S;d.ori==0?(x=El,S=hc):(x=Dl,S=gc);const j=xe($.width*me,3);let A=($.size-$.width)/2*me,M=xe(A*2,3),R=new Path2D,y=new Path2D,{left:C,top:P,width:z,height:E}=t.bbox;Ll(y,C-M,P-M,z+M*2,E+M*2);const Y=G=>{if(c[G]!=null){let ne=b(p(i[G],d,D,g)),O=b(m(c[G],f,T,k));x(R,ne+A,O),S(R,ne,O,A,0,ll*2)}};if(o)o.forEach(Y);else for(let G=n;G<=l;G++)Y(G);return{stroke:j>0?R:null,fill:R,clip:y,flags:fn|Oo}})}function bc(e){return(t,s,n,l,o,a)=>{n!=l&&(o!=n&&a!=n&&e(t,s,n),o!=l&&a!=l&&e(t,s,l),e(t,s,a))}}const Pp=bc(mn),zp=bc(hn);function kc(e){const t=fe(e==null?void 0:e.alignGaps,0);return(s,n,l,o)=>Ls(s,n,(a,i,c,d,f,p,m,g,k,D,T)=>{[l,o]=wl(c,l,o);let b=a.pxRound,$=E=>b(p(E,d,D,g)),x=E=>b(m(E,f,T,k)),S,j;d.ori==0?(S=mn,j=Pp):(S=hn,j=zp);const A=d.dir*(d.ori==0?1:-1),M={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:fn},R=M.stroke;let y=!1;if(o-l>=D*4){let E=V=>s.posToVal(V,d.key,!0),Y=null,G=null,ne,O,B,U=$(i[A==1?l:o]),I=$(i[l]),se=$(i[o]),ee=E(A==1?I+1:se-1);for(let V=A==1?l:o;V>=l&&V<=o;V+=A){let ye=i[V],Le=(A==1?ye<ee:ye>ee)?U:$(ye),ue=c[V];Le==U?ue!=null?(O=ue,Y==null?(S(R,Le,x(O)),ne=Y=G=O):O<Y?Y=O:O>G&&(G=O)):ue===null&&(y=!0):(Y!=null&&j(R,U,x(Y),x(G),x(ne),x(O)),ue!=null?(O=ue,S(R,Le,x(O)),Y=G=ne=O):(Y=G=null,ue===null&&(y=!0)),U=Le,ee=E(U+A))}Y!=null&&Y!=G&&B!=U&&j(R,U,x(Y),x(G),x(ne),x(O))}else for(let E=A==1?l:o;E>=l&&E<=o;E+=A){let Y=c[E];Y===null?y=!0:Y!=null&&S(R,$(i[E]),x(Y))}let[P,z]=ca(s,n);if(a.fill!=null||P!=0){let E=M.fill=new Path2D(R),Y=a.fillTo(s,n,a.min,a.max,P),G=x(Y),ne=$(i[l]),O=$(i[o]);A==-1&&([O,ne]=[ne,O]),S(E,O,G),S(E,ne,G)}if(!a.spanGaps){let E=[];y&&E.push(...da(i,c,l,o,A,$,t)),M.gaps=E=a.gaps(s,n,l,o,E),M.clip=Ml(E,d.ori,g,k,D,T)}return z!=0&&(M.band=z==2?[ns(s,n,l,o,R,-1),ns(s,n,l,o,R,1)]:ns(s,n,l,o,R,z)),M})}function Fp(e){const t=fe(e.align,1),s=fe(e.ascDesc,!1),n=fe(e.alignGaps,0),l=fe(e.extend,!1);return(o,a,i,c)=>Ls(o,a,(d,f,p,m,g,k,D,T,b,$,x)=>{[i,c]=wl(p,i,c);let S=d.pxRound,{left:j,width:A}=o.bbox,M=I=>S(k(I,m,$,T)),R=I=>S(D(I,g,x,b)),y=m.ori==0?mn:hn;const C={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:fn},P=C.stroke,z=m.dir*(m.ori==0?1:-1);let E=R(p[z==1?i:c]),Y=M(f[z==1?i:c]),G=Y,ne=Y;l&&t==-1&&(ne=j,y(P,ne,E)),y(P,Y,E);for(let I=z==1?i:c;I>=i&&I<=c;I+=z){let se=p[I];if(se==null)continue;let ee=M(f[I]),V=R(se);t==1?y(P,ee,E):y(P,G,V),y(P,ee,V),E=V,G=ee}let O=G;l&&t==1&&(O=j+A,y(P,O,E));let[B,U]=ca(o,a);if(d.fill!=null||B!=0){let I=C.fill=new Path2D(P),se=d.fillTo(o,a,d.min,d.max,B),ee=R(se);y(I,O,ee),y(I,ne,ee)}if(!d.spanGaps){let I=[];I.push(...da(f,p,i,c,z,M,n));let se=d.width*me/2,ee=s||t==1?se:-se,V=s||t==-1?-se:se;I.forEach(ye=>{ye[0]+=ee,ye[1]+=V}),C.gaps=I=d.gaps(o,a,i,c,I),C.clip=Ml(I,m.ori,T,b,$,x)}return U!=0&&(C.band=U==2?[ns(o,a,i,c,P,-1),ns(o,a,i,c,P,1)]:ns(o,a,i,c,P,U)),C})}function qi(e,t,s,n,l,o,a=ke){if(e.length>1){let i=null;for(let c=0,d=1/0;c<e.length;c++)if(t[c]!==void 0){if(i!=null){let f=Ye(e[c]-e[i]);f<d&&(d=f,a=Ye(s(e[c],n,l,o)-s(e[i],n,l,o)))}i=c}}return a}function Rp(e){e=e||On;const t=fe(e.size,[.6,ke,1]),s=e.align||0,n=e.gap||0;let l=e.radius;l=l==null?[0,0]:typeof l=="number"?[l,0]:l;const o=de(l),a=1-t[0],i=fe(t[1],ke),c=fe(t[2],1),d=fe(e.disp,On),f=fe(e.each,g=>{}),{fill:p,stroke:m}=d;return(g,k,D,T)=>Ls(g,k,(b,$,x,S,j,A,M,R,y,C,P)=>{let z=b.pxRound,E=s,Y=n*me,G=i*me,ne=c*me,O,B;S.ori==0?[O,B]=o(g,k):[B,O]=o(g,k);const U=S.dir*(S.ori==0?1:-1);let I=S.ori==0?Ll:ua,se=S.ori==0?f:(Q,we,Ve,zs,gs,Wt,_s)=>{f(Q,we,Ve,gs,zs,_s,Wt)},ee=fe(g.bands,la).find(Q=>Q.series[0]==k),V=ee!=null?ee.dir:0,ye=b.fillTo(g,k,b.min,b.max,V),Pe=z(M(ye,j,P,y)),Le,ue,At,ht=C,ze=z(b.width*me),Ht=!1,Zt=null,wt=null,ls=null,As=null;p!=null&&(ze==0||m!=null)&&(Ht=!0,Zt=p.values(g,k,D,T),wt=new Map,new Set(Zt).forEach(Q=>{Q!=null&&wt.set(Q,new Path2D)}),ze>0&&(ls=m.values(g,k,D,T),As=new Map,new Set(ls).forEach(Q=>{Q!=null&&As.set(Q,new Path2D)})));let{x0:Os,size:gn}=d;if(Os!=null&&gn!=null){E=1,$=Os.values(g,k,D,T),Os.unit==2&&($=$.map(Ve=>g.posToVal(R+Ve*C,S.key,!0)));let Q=gn.values(g,k,D,T);gn.unit==2?ue=Q[0]*C:ue=A(Q[0],S,C,R)-A(0,S,C,R),ht=qi($,x,A,S,C,R,ht),At=ht-ue+Y}else ht=qi($,x,A,S,C,R,ht),At=ht*a+Y,ue=ht-At;At<1&&(At=0),ze>=ue/2&&(ze=0),At<5&&(z=Vr);let Nn=At>0,ms=ht-At-(Nn?ze:0);ue=z(Do(ms,ne,G)),Le=(E==0?ue/2:E==U?0:ue)-E*U*((E==0?Y/2:0)+(Nn?ze/2:0));const rt={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},Ps=Ht?null:new Path2D;let Qt=null;if(ee!=null)Qt=g.data[ee.series[1]];else{let{y0:Q,y1:we}=d;Q!=null&&we!=null&&(x=we.values(g,k,D,T),Qt=Q.values(g,k,D,T))}let hs=O*ue,ie=B*ue;for(let Q=U==1?D:T;Q>=D&&Q<=T;Q+=U){let we=x[Q];if(we==null)continue;if(Qt!=null){let ft=Qt[Q]??0;if(we-ft==0)continue;Pe=M(ft,j,P,y)}let Ve=S.distr!=2||d!=null?$[Q]:Q,zs=A(Ve,S,C,R),gs=M(fe(we,ye),j,P,y),Wt=z(zs-Le),_s=z(pt(gs,Pe)),gt=z(It(gs,Pe)),St=_s-gt;if(we!=null){let ft=we<0?ie:hs,Ot=we<0?hs:ie;Ht?(ze>0&&ls[Q]!=null&&I(As.get(ls[Q]),Wt,gt+kt(ze/2),ue,pt(0,St-ze),ft,Ot),Zt[Q]!=null&&I(wt.get(Zt[Q]),Wt,gt+kt(ze/2),ue,pt(0,St-ze),ft,Ot)):I(Ps,Wt,gt+kt(ze/2),ue,pt(0,St-ze),ft,Ot),se(g,k,Q,Wt-ze/2,gt,ue+ze,St)}}return ze>0?rt.stroke=Ht?As:Ps:Ht||(rt._fill=b.width==0?b._fill:b._stroke??b._fill,rt.width=0),rt.fill=Ht?wt:Ps,rt})}function Np(e,t){const s=fe(t==null?void 0:t.alignGaps,0);return(n,l,o,a)=>Ls(n,l,(i,c,d,f,p,m,g,k,D,T,b)=>{[o,a]=wl(d,o,a);let $=i.pxRound,x=O=>$(m(O,f,T,k)),S=O=>$(g(O,p,b,D)),j,A,M;f.ori==0?(j=El,M=mn,A=_c):(j=Dl,M=hn,A=$c);const R=f.dir*(f.ori==0?1:-1);let y=x(c[R==1?o:a]),C=y,P=[],z=[];for(let O=R==1?o:a;O>=o&&O<=a;O+=R)if(d[O]!=null){let U=c[O],I=x(U);P.push(C=I),z.push(S(d[O]))}const E={stroke:e(P,z,j,M,A,$),fill:null,clip:null,band:null,gaps:null,flags:fn},Y=E.stroke;let[G,ne]=ca(n,l);if(i.fill!=null||G!=0){let O=E.fill=new Path2D(Y),B=i.fillTo(n,l,i.min,i.max,G),U=S(B);M(O,C,U),M(O,y,U)}if(!i.spanGaps){let O=[];O.push(...da(c,d,o,a,R,x,s)),E.gaps=O=i.gaps(n,l,o,a,O),E.clip=Ml(O,f.ori,k,D,T,b)}return ne!=0&&(E.band=ne==2?[ns(n,l,o,a,Y,-1),ns(n,l,o,a,Y,1)]:ns(n,l,o,a,Y,ne)),E})}function Ip(e){return Np(jp,e)}function jp(e,t,s,n,l,o){const a=e.length;if(a<2)return null;const i=new Path2D;if(s(i,e[0],t[0]),a==2)n(i,e[1],t[1]);else{let c=Array(a),d=Array(a-1),f=Array(a-1),p=Array(a-1);for(let m=0;m<a-1;m++)f[m]=t[m+1]-t[m],p[m]=e[m+1]-e[m],d[m]=f[m]/p[m];c[0]=d[0];for(let m=1;m<a-1;m++)d[m]===0||d[m-1]===0||d[m-1]>0!=d[m]>0?c[m]=0:(c[m]=3*(p[m-1]+p[m])/((2*p[m]+p[m-1])/d[m-1]+(p[m]+2*p[m-1])/d[m]),isFinite(c[m])||(c[m]=0));c[a-1]=d[a-2];for(let m=0;m<a-1;m++)l(i,e[m]+p[m]/3,t[m]+c[m]*p[m]/3,e[m+1]-p[m]/3,t[m+1]-c[m+1]*p[m]/3,e[m+1],t[m+1])}return i}const Po=new Set;function Vi(){for(let e of Po)e.syncRect(!0)}vn&&(Ms(yu,an,Vi),Ms(bu,an,Vi,!0),Ms(pl,an,()=>{ot.pxRatio=me}));const Bp=kc(),Hp=yc();function Ui(e,t,s,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,a)=>zo(o,a,t,s))}function Wp(e,t){return e.map((s,n)=>n==0?{}:qe({},t,s))}function zo(e,t,s,n){return qe({},t==0?s:n,e)}function xc(e,t,s){return t==null?un:[t,s]}const qp=xc;function Vp(e,t,s){return t==null?un:fl(t,s,sa,!0)}function wc(e,t,s,n){return t==null?un:Sl(t,s,e.scales[n].log,!1)}const Up=wc;function Sc(e,t,s,n){return t==null?un:ta(t,s,e.scales[n].log,!1)}const Gp=Sc;function Yp(e,t,s,n,l){let o=pt(wi(e),wi(t)),a=t-e,i=Nt(l/n*a,s);do{let c=s[i],d=n*c/a;if(d>=l&&o+(c<5?vs.get(c):0)<=17)return[c,d]}while(++i<s.length);return[0,0]}function Gi(e){let t,s;return e=e.replace(/(\d+)px/,(n,l)=>(t=Ue((s=+l)*me))+"px"),[e,t,s]}function Kp(e){e.show&&[e.font,e.labelFont].forEach(t=>{let s=xe(t[2]*me,1);t[0]=t[0].replace(/[0-9.]+px/,s+"px"),t[1]=s})}function ot(e,t,s){const n={mode:fe(e.mode,1)},l=n.mode;function o(u,v,h,_){let w=v.valToPct(u);return _+h*(v.dir==-1?1-w:w)}function a(u,v,h,_){let w=v.valToPct(u);return _+h*(v.dir==-1?w:1-w)}function i(u,v,h,_){return v.ori==0?o(u,v,h,_):a(u,v,h,_)}n.valToPosH=o,n.valToPosV=a;let c=!1;n.status=0;const d=n.root=Dt(su);if(e.id!=null&&(d.id=e.id),bt(d,e.class),e.title){let u=Dt(ou,d);u.textContent=e.title}const f=Rt("canvas"),p=n.ctx=f.getContext("2d"),m=Dt(au,d);Ms("click",m,u=>{u.target===k&&(Se!=Us||Ae!=Gs)&&nt.click(n,u)},!0);const g=n.under=Dt(iu,m);m.appendChild(f);const k=n.over=Dt(ru,m);e=pn(e);const D=+fe(e.pxAlign,1),T=Wi(D);(e.plugins||[]).forEach(u=>{u.opts&&(e=u.opts(n,e)||e)});const b=e.ms||.001,$=n.series=l==1?Ui(e.series||[],Fi,Bi,!1):Wp(e.series||[null],ji),x=n.axes=Ui(e.axes||[],zi,Ni,!0),S=n.scales={},j=n.bands=e.bands||[];j.forEach(u=>{u.fill=de(u.fill||null),u.dir=fe(u.dir,-1)});const A=l==2?$[1].facets[0].scale:$[0].scale,M={axes:Qc,series:Gc},R=(e.drawOrder||["axes","series"]).map(u=>M[u]);function y(u){const v=u.distr==3?h=>ss(h>0?h:u.clamp(n,h,u.min,u.max,u.key)):u.distr==4?h=>uo(h,u.asinh):u.distr==100?h=>u.fwd(h):h=>h;return h=>{let _=v(h),{_min:w,_max:L}=u,N=L-w;return(_-w)/N}}function C(u){let v=S[u];if(v==null){let h=(e.scales||On)[u]||On;if(h.from!=null){C(h.from);let _=qe({},S[h.from],h,{key:u});_.valToPct=y(_),S[u]=_}else{v=S[u]=qe({},u==A?fc:Lp,h),v.key=u;let _=v.time,w=v.range,L=us(w);if((u!=A||l==2&&!_)&&(L&&(w[0]==null||w[1]==null)&&(w={min:w[0]==null?bi:{mode:1,hard:w[0],soft:w[0]},max:w[1]==null?bi:{mode:1,hard:w[1],soft:w[1]}},L=!1),!L&&Cl(w))){let N=w;w=(H,q,J)=>q==null?un:fl(q,J,N)}v.range=de(w||(_?qp:u==A?v.distr==3?Up:v.distr==4?Gp:xc:v.distr==3?wc:v.distr==4?Sc:Vp)),v.auto=de(L?!1:v.auto),v.clamp=de(v.clamp||Dp),v._min=v._max=null,v.valToPct=y(v)}}}C("x"),C("y"),l==1&&$.forEach(u=>{C(u.scale)}),x.forEach(u=>{C(u.scale)});for(let u in e.scales)C(u);const P=S[A],z=P.distr;let E,Y;P.ori==0?(bt(d,nu),E=o,Y=a):(bt(d,lu),E=a,Y=o);const G={};for(let u in S){let v=S[u];(v.min!=null||v.max!=null)&&(G[u]={min:v.min,max:v.max},v.min=v.max=null)}const ne=e.tzDate||(u=>new Date(Ue(u/b))),O=e.fmtDate||oa,B=b==1?np(ne):ap(ne),U=Ai(ne,Li(b==1?sp:op,O)),I=Pi(ne,Oi(rp,O)),se=[],ee=n.legend=qe({},up,e.legend),V=n.cursor=qe({},gp,{drag:{y:l==2}},e.cursor),ye=ee.show,Pe=V.show,Le=ee.markers;ee.idxs=se,Le.width=de(Le.width),Le.dash=de(Le.dash),Le.stroke=de(Le.stroke),Le.fill=de(Le.fill);let ue,At,ht,ze=[],Ht=[],Zt,wt=!1,ls={};if(ee.live){const u=$[1]?$[1].values:null;wt=u!=null,Zt=wt?u(n,1,0):{_:0};for(let v in Zt)ls[v]=Xo}if(ye)if(ue=Rt("table",vu,d),ht=Rt("tbody",null,ue),ee.mount(n,ue),wt){At=Rt("thead",null,ue,ht);let u=Rt("tr",null,At);Rt("th",null,u);for(var As in Zt)Rt("th",ri,u).textContent=As}else bt(ue,hu),ee.live&&bt(ue,mu);const Os={show:!0},gn={show:!1};function Nn(u,v){if(v==0&&(wt||!ee.live||l==2))return un;let h=[],_=Rt("tr",gu,ht,ht.childNodes[v]);bt(_,u.class),u.show||bt(_,Cs);let w=Rt("th",null,_);if(Le.show){let H=Dt(_u,w);if(v>0){let q=Le.width(n,v);q&&(H.style.border=q+"px "+Le.dash(n,v)+" "+Le.stroke(n,v)),H.style.background=Le.fill(n,v)}}let L=Dt(ri,w);u.label instanceof HTMLElement?L.appendChild(u.label):L.textContent=u.label,v>0&&(Le.show||(L.style.color=u.width>0?Le.stroke(n,v):Le.fill(n,v)),rt("click",w,H=>{if(V._lock)return;ys(H);let q=$.indexOf(u);if((H.ctrlKey||H.metaKey)!=ee.isolate){let J=$.some((Z,X)=>X>0&&X!=q&&Z.show);$.forEach((Z,X)=>{X>0&&Vt(X,J?X==q?Os:gn:Os,!0,He.setSeries)})}else Vt(q,{show:!u.show},!0,He.setSeries)},!1),Rs&&rt(pi,w,H=>{V._lock||(ys(H),Vt($.indexOf(u),Ks,!0,He.setSeries))},!1));for(var N in Zt){let H=Rt("td",$u,_);H.textContent="--",h.push(H)}return[_,h]}const ms=new Map;function rt(u,v,h,_=!0){const w=ms.get(v)||{},L=V.bind[u](n,v,h,_);L&&(Ms(u,v,w[u]=L),ms.set(v,w))}function Ps(u,v,h){const _=ms.get(v)||{};for(let w in _)(u==null||w==u)&&(Eo(w,v,_[w]),delete _[w]);u==null&&ms.delete(v)}let Qt=0,hs=0,ie=0,Q=0,we=0,Ve=0,zs=we,gs=Ve,Wt=ie,_s=Q,gt=0,St=0,ft=0,Ot=0;n.bbox={};let Ol=!1,In=!1,Fs=!1,$s=!1,jn=!1,Tt=!1;function Pl(u,v,h){(h||u!=n.width||v!=n.height)&&va(u,v),Hs(!1),Fs=!0,In=!0,Ws()}function va(u,v){n.width=Qt=ie=u,n.height=hs=Q=v,we=Ve=0,jc(),Bc();let h=n.bbox;gt=h.left=Ss(we*me,.5),St=h.top=Ss(Ve*me,.5),ft=h.width=Ss(ie*me,.5),Ot=h.height=Ss(Q*me,.5)}const Rc=3;function Nc(){let u=!1,v=0;for(;!u;){v++;let h=Jc(v),_=Zc(v);u=v==Rc||h&&_,u||(va(n.width,n.height),In=!0)}}function Ic({width:u,height:v}){Pl(u,v)}n.setSize=Ic;function jc(){let u=!1,v=!1,h=!1,_=!1;x.forEach((w,L)=>{if(w.show&&w._show){let{side:N,_size:H}=w,q=N%2,J=w.label!=null?w.labelSize:0,Z=H+J;Z>0&&(q?(ie-=Z,N==3?(we+=Z,_=!0):h=!0):(Q-=Z,N==0?(Ve+=Z,u=!0):v=!0))}}),bs[0]=u,bs[1]=h,bs[2]=v,bs[3]=_,ie-=os[1]+os[3],we+=os[3],Q-=os[2]+os[0],Ve+=os[0]}function Bc(){let u=we+ie,v=Ve+Q,h=we,_=Ve;function w(L,N){switch(L){case 1:return u+=N,u-N;case 2:return v+=N,v-N;case 3:return h-=N,h+N;case 0:return _-=N,_+N}}x.forEach((L,N)=>{if(L.show&&L._show){let H=L.side;L._pos=w(H,L._size),L.label!=null&&(L._lpos=w(H,L.labelSize))}})}if(V.dataIdx==null){let u=V.hover,v=u.skip=new Set(u.skip??[]);v.add(void 0);let h=u.prox=de(u.prox),_=u.bias??(u.bias=0);V.dataIdx=(w,L,N,H)=>{if(L==0)return N;let q=N,J=h(w,L,N,H)??ke,Z=J>=0&&J<ke,X=P.ori==0?ie:Q,oe=V.left,ve=t[0],pe=t[L];if(v.has(pe[N])){q=null;let ce=null,le=null,te;if(_==0||_==-1)for(te=N;ce==null&&te-- >0;)v.has(pe[te])||(ce=te);if(_==0||_==1)for(te=N;le==null&&te++<pe.length;)v.has(pe[te])||(le=te);if(ce!=null||le!=null)if(Z){let Ce=ce==null?-1/0:E(ve[ce],P,X,0),Re=le==null?1/0:E(ve[le],P,X,0),tt=oe-Ce,$e=Re-oe;tt<=$e?tt<=J&&(q=ce):$e<=J&&(q=le)}else q=le==null?ce:ce==null?le:N-ce<=le-N?ce:le}else Z&&Ye(oe-E(ve[N],P,X,0))>J&&(q=null);return q}}const ys=u=>{V.event=u};V.idxs=se,V._lock=!1;let it=V.points;it.show=de(it.show),it.size=de(it.size),it.stroke=de(it.stroke),it.width=de(it.width),it.fill=de(it.fill);const qt=n.focus=qe({},e.focus||{alpha:.3},V.focus),Rs=qt.prox>=0,Ns=Rs&&it.one;let Ct=[],Is=[],js=[];function ma(u,v){let h=it.show(n,v);if(h instanceof HTMLElement)return bt(h,fu),bt(h,u.class),Kt(h,-10,-10,ie,Q),k.insertBefore(h,Ct[v]),h}function ha(u,v){if(l==1||v>0){let h=l==1&&S[u.scale].time,_=u.value;u.value=h?Ci(_)?Pi(ne,Oi(_,O)):_||I:_||Cp,u.label=u.label||(h?$p:_p)}if(Ns||v>0){u.width=u.width==null?1:u.width,u.paths=u.paths||Bp||Lu,u.fillTo=de(u.fillTo||Ap),u.pxAlign=+fe(u.pxAlign,D),u.pxRound=Wi(u.pxAlign),u.stroke=de(u.stroke||null),u.fill=de(u.fill||null),u._stroke=u._fill=u._paths=u._focus=null;let h=Mp(pt(1,u.width),1),_=u.points=qe({},{size:h,width:pt(1,h*.2),stroke:u.stroke,space:h*2,paths:Hp,_stroke:null,_fill:null},u.points);_.show=de(_.show),_.filter=de(_.filter),_.fill=de(_.fill),_.stroke=de(_.stroke),_.paths=de(_.paths),_.pxAlign=u.pxAlign}if(ye){let h=Nn(u,v);ze.splice(v,0,h[0]),Ht.splice(v,0,h[1]),ee.values.push(null)}if(Pe){se.splice(v,0,null);let h=null;Ns?v==0&&(h=ma(u,v)):v>0&&(h=ma(u,v)),Ct.splice(v,0,h),Is.splice(v,0,0),js.splice(v,0,0)}et("addSeries",v)}function Hc(u,v){v=v??$.length,u=l==1?zo(u,v,Fi,Bi):zo(u,v,{},ji),$.splice(v,0,u),ha($[v],v)}n.addSeries=Hc;function Wc(u){if($.splice(u,1),ye){ee.values.splice(u,1),Ht.splice(u,1);let v=ze.splice(u,1)[0];Ps(null,v.firstChild),v.remove()}Pe&&(se.splice(u,1),Ct.splice(u,1)[0].remove(),Is.splice(u,1),js.splice(u,1)),et("delSeries",u)}n.delSeries=Wc;const bs=[!1,!1,!1,!1];function qc(u,v){if(u._show=u.show,u.show){let h=u.side%2,_=S[u.scale];_==null&&(u.scale=h?$[1].scale:A,_=S[u.scale]);let w=_.time;u.size=de(u.size),u.space=de(u.space),u.rotate=de(u.rotate),us(u.incrs)&&u.incrs.forEach(N=>{!vs.has(N)&&vs.set(N,Yr(N))}),u.incrs=de(u.incrs||(_.distr==2?Xu:w?b==1?tp:lp:Ts)),u.splits=de(u.splits||(w&&_.distr==1?B:_.distr==3?Lo:_.distr==4?kp:bp)),u.stroke=de(u.stroke),u.grid.stroke=de(u.grid.stroke),u.ticks.stroke=de(u.ticks.stroke),u.border.stroke=de(u.border.stroke);let L=u.values;u.values=us(L)&&!us(L[0])?de(L):w?us(L)?Ai(ne,Li(L,O)):Ci(L)?ip(ne,L):L||U:L||yp,u.filter=de(u.filter||(_.distr>=3&&_.log==10?Sp:_.distr==3&&_.log==2?Tp:Ur)),u.font=Gi(u.font),u.labelFont=Gi(u.labelFont),u._size=u.size(n,null,v,0),u._space=u._rotate=u._incrs=u._found=u._splits=u._values=null,u._size>0&&(bs[v]=!0,u._el=Dt(cu,m))}}function _n(u,v,h,_){let[w,L,N,H]=h,q=v%2,J=0;return q==0&&(H||L)&&(J=v==0&&!w||v==2&&!N?Ue(zi.size/3):0),q==1&&(w||N)&&(J=v==1&&!L||v==3&&!H?Ue(Ni.size/2):0),J}const ga=n.padding=(e.padding||[_n,_n,_n,_n]).map(u=>de(fe(u,_n))),os=n._padding=ga.map((u,v)=>u(n,v,bs,0));let st,Je=null,Ze=null;const Bn=l==1?$[0].idxs:null;let Pt=null,$n=!1;function _a(u,v){if(t=u??[],n.data=n._data=t,l==2){st=0;for(let h=1;h<$.length;h++)st+=t[h][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),Pt=t[0],st=Pt.length;let h=t;if(z==2){h=t.slice();let _=h[0]=Array(st);for(let w=0;w<st;w++)_[w]=w}n._data=t=h}if(Hs(!0),et("setData"),z==2&&(Fs=!0),v!==!1){let h=P;h.auto(n,$n)?zl():is(A,h.min,h.max),$s=$s||V.left>=0,Tt=!0,Ws()}}n.setData=_a;function zl(){$n=!0;let u,v;l==1&&(st>0?(Je=Bn[0]=0,Ze=Bn[1]=st-1,u=t[0][Je],v=t[0][Ze],z==2?(u=Je,v=Ze):u==v&&(z==3?[u,v]=Sl(u,u,P.log,!1):z==4?[u,v]=ta(u,u,P.log,!1):P.time?v=u+Ue(86400/b):[u,v]=fl(u,v,sa,!0))):(Je=Bn[0]=u=null,Ze=Bn[1]=v=null)),is(A,u,v)}let Hn,Bs,Fl,Rl,Nl,Il,jl,Bl,Hl,vt;function $a(u,v,h,_,w,L){u??(u=di),h??(h=la),_??(_="butt"),w??(w=di),L??(L="round"),u!=Hn&&(p.strokeStyle=Hn=u),w!=Bs&&(p.fillStyle=Bs=w),v!=Fl&&(p.lineWidth=Fl=v),L!=Nl&&(p.lineJoin=Nl=L),_!=Il&&(p.lineCap=Il=_),h!=Rl&&p.setLineDash(Rl=h)}function ya(u,v,h,_){v!=Bs&&(p.fillStyle=Bs=v),u!=jl&&(p.font=jl=u),h!=Bl&&(p.textAlign=Bl=h),_!=Hl&&(p.textBaseline=Hl=_)}function Wl(u,v,h,_,w=0){if(_.length>0&&u.auto(n,$n)&&(v==null||v.min==null)){let L=fe(Je,0),N=fe(Ze,_.length-1),H=h.min==null?Su(_,L,N,w,u.distr==3):[h.min,h.max];u.min=It(u.min,h.min=H[0]),u.max=pt(u.max,h.max=H[1])}}const ba={min:null,max:null};function Vc(){for(let _ in S){let w=S[_];G[_]==null&&(w.min==null||G[A]!=null&&w.auto(n,$n))&&(G[_]=ba)}for(let _ in S){let w=S[_];G[_]==null&&w.from!=null&&G[w.from]!=null&&(G[_]=ba)}G[A]!=null&&Hs(!0);let u={};for(let _ in G){let w=G[_];if(w!=null){let L=u[_]=pn(S[_],Pu);if(w.min!=null)qe(L,w);else if(_!=A||l==2)if(st==0&&L.from==null){let N=L.range(n,null,null,_);L.min=N[0],L.max=N[1]}else L.min=ke,L.max=-ke}}if(st>0){$.forEach((_,w)=>{if(l==1){let L=_.scale,N=G[L];if(N==null)return;let H=u[L];if(w==0){let q=H.range(n,H.min,H.max,L);H.min=q[0],H.max=q[1],Je=Nt(H.min,t[0]),Ze=Nt(H.max,t[0]),Ze-Je>1&&(t[0][Je]<H.min&&Je++,t[0][Ze]>H.max&&Ze--),_.min=Pt[Je],_.max=Pt[Ze]}else _.show&&_.auto&&Wl(H,N,_,t[w],_.sorted);_.idxs[0]=Je,_.idxs[1]=Ze}else if(w>0&&_.show&&_.auto){let[L,N]=_.facets,H=L.scale,q=N.scale,[J,Z]=t[w],X=u[H],oe=u[q];X!=null&&Wl(X,G[H],L,J,L.sorted),oe!=null&&Wl(oe,G[q],N,Z,N.sorted),_.min=N.min,_.max=N.max}});for(let _ in u){let w=u[_],L=G[_];if(w.from==null&&(L==null||L.min==null)){let N=w.range(n,w.min==ke?null:w.min,w.max==-ke?null:w.max,_);w.min=N[0],w.max=N[1]}}}for(let _ in u){let w=u[_];if(w.from!=null){let L=u[w.from];if(L.min==null)w.min=w.max=null;else{let N=w.range(n,L.min,L.max,_);w.min=N[0],w.max=N[1]}}}let v={},h=!1;for(let _ in u){let w=u[_],L=S[_];if(L.min!=w.min||L.max!=w.max){L.min=w.min,L.max=w.max;let N=L.distr;L._min=N==3?ss(L.min):N==4?uo(L.min,L.asinh):N==100?L.fwd(L.min):L.min,L._max=N==3?ss(L.max):N==4?uo(L.max,L.asinh):N==100?L.fwd(L.max):L.max,v[_]=h=!0}}if(h){$.forEach((_,w)=>{l==2?w>0&&v.y&&(_._paths=null):v[_.scale]&&(_._paths=null)});for(let _ in v)Fs=!0,et("setScale",_);Pe&&V.left>=0&&($s=Tt=!0)}for(let _ in G)G[_]=null}function Uc(u){let v=Do(Je-1,0,st-1),h=Do(Ze+1,0,st-1);for(;u[v]==null&&v>0;)v--;for(;u[h]==null&&h<st-1;)h++;return[v,h]}function Gc(){if(st>0){let u=$.some(v=>v._focus)&&vt!=qt.alpha;u&&(p.globalAlpha=vt=qt.alpha),$.forEach((v,h)=>{if(h>0&&v.show&&(ka(h,!1),ka(h,!0),v._paths==null)){let _=vt;vt!=v.alpha&&(p.globalAlpha=vt=v.alpha);let w=l==2?[0,t[h][0].length-1]:Uc(t[h]);v._paths=v.paths(n,h,w[0],w[1]),vt!=_&&(p.globalAlpha=vt=_)}}),$.forEach((v,h)=>{if(h>0&&v.show){let _=vt;vt!=v.alpha&&(p.globalAlpha=vt=v.alpha),v._paths!=null&&xa(h,!1);{let w=v._paths!=null?v._paths.gaps:null,L=v.points.show(n,h,Je,Ze,w),N=v.points.filter(n,h,L,w);(L||N)&&(v.points._paths=v.points.paths(n,h,Je,Ze,N),xa(h,!0))}vt!=_&&(p.globalAlpha=vt=_),et("drawSeries",h)}}),u&&(p.globalAlpha=vt=1)}}function ka(u,v){let h=v?$[u].points:$[u];h._stroke=h.stroke(n,u),h._fill=h.fill(n,u)}function xa(u,v){let h=v?$[u].points:$[u],{stroke:_,fill:w,clip:L,flags:N,_stroke:H=h._stroke,_fill:q=h._fill,_width:J=h.width}=h._paths;J=xe(J*me,3);let Z=null,X=J%2/2;v&&q==null&&(q=J>0?"#fff":H);let oe=h.pxAlign==1&&X>0;if(oe&&p.translate(X,X),!v){let ve=gt-J/2,pe=St-J/2,ce=ft+J,le=Ot+J;Z=new Path2D,Z.rect(ve,pe,ce,le)}v?ql(H,J,h.dash,h.cap,q,_,w,N,L):Yc(u,H,J,h.dash,h.cap,q,_,w,N,Z,L),oe&&p.translate(-X,-X)}function Yc(u,v,h,_,w,L,N,H,q,J,Z){let X=!1;q!=0&&j.forEach((oe,ve)=>{if(oe.series[0]==u){let pe=$[oe.series[1]],ce=t[oe.series[1]],le=(pe._paths||On).band;us(le)&&(le=oe.dir==1?le[0]:le[1]);let te,Ce=null;pe.show&&le&&Cu(ce,Je,Ze)?(Ce=oe.fill(n,ve)||L,te=pe._paths.clip):le=null,ql(v,h,_,w,Ce,N,H,q,J,Z,te,le),X=!0}}),X||ql(v,h,_,w,L,N,H,q,J,Z)}const wa=fn|Oo;function ql(u,v,h,_,w,L,N,H,q,J,Z,X){$a(u,v,h,_,w),(q||J||X)&&(p.save(),q&&p.clip(q),J&&p.clip(J)),X?(H&wa)==wa?(p.clip(X),Z&&p.clip(Z),qn(w,N),Wn(u,L,v)):H&Oo?(qn(w,N),p.clip(X),Wn(u,L,v)):H&fn&&(p.save(),p.clip(X),Z&&p.clip(Z),qn(w,N),p.restore(),Wn(u,L,v)):(qn(w,N),Wn(u,L,v)),(q||J||X)&&p.restore()}function Wn(u,v,h){h>0&&(v instanceof Map?v.forEach((_,w)=>{p.strokeStyle=Hn=w,p.stroke(_)}):v!=null&&u&&p.stroke(v))}function qn(u,v){v instanceof Map?v.forEach((h,_)=>{p.fillStyle=Bs=_,p.fill(h)}):v!=null&&u&&p.fill(v)}function Kc(u,v,h,_){let w=x[u],L;if(_<=0)L=[0,0];else{let N=w._space=w.space(n,u,v,h,_),H=w._incrs=w.incrs(n,u,v,h,_,N);L=Yp(v,h,H,_,N)}return w._found=L}function Vl(u,v,h,_,w,L,N,H,q,J){let Z=N%2/2;D==1&&p.translate(Z,Z),$a(H,N,q,J,H),p.beginPath();let X,oe,ve,pe,ce=w+(_==0||_==3?-L:L);h==0?(oe=w,pe=ce):(X=w,ve=ce);for(let le=0;le<u.length;le++)v[le]!=null&&(h==0?X=ve=u[le]:oe=pe=u[le],p.moveTo(X,oe),p.lineTo(ve,pe));p.stroke(),D==1&&p.translate(-Z,-Z)}function Jc(u){let v=!0;return x.forEach((h,_)=>{if(!h.show)return;let w=S[h.scale];if(w.min==null){h._show&&(v=!1,h._show=!1,Hs(!1));return}else h._show||(v=!1,h._show=!0,Hs(!1));let L=h.side,N=L%2,{min:H,max:q}=w,[J,Z]=Kc(_,H,q,N==0?ie:Q);if(Z==0)return;let X=w.distr==2,oe=h._splits=h.splits(n,_,H,q,J,Z,X),ve=w.distr==2?oe.map(te=>Pt[te]):oe,pe=w.distr==2?Pt[oe[1]]-Pt[oe[0]]:J,ce=h._values=h.values(n,h.filter(n,ve,_,Z,pe),_,Z,pe);h._rotate=L==2?h.rotate(n,ce,_,Z):0;let le=h._size;h._size=Lt(h.size(n,ce,_,u)),le!=null&&h._size!=le&&(v=!1)}),v}function Zc(u){let v=!0;return ga.forEach((h,_)=>{let w=h(n,_,bs,u);w!=os[_]&&(v=!1),os[_]=w}),v}function Qc(){for(let u=0;u<x.length;u++){let v=x[u];if(!v.show||!v._show)continue;let h=v.side,_=h%2,w,L,N=v.stroke(n,u),H=h==0||h==3?-1:1,[q,J]=v._found;if(v.label!=null){let dt=v.labelGap*H,yt=Ue((v._lpos+dt)*me);ya(v.labelFont[0],N,"center",h==2?Sn:ci),p.save(),_==1?(w=L=0,p.translate(yt,Ue(St+Ot/2)),p.rotate((h==3?-ll:ll)/2)):(w=Ue(gt+ft/2),L=yt);let ws=qr(v.label)?v.label(n,u,q,J):v.label;p.fillText(ws,w,L),p.restore()}if(J==0)continue;let Z=S[v.scale],X=_==0?ft:Ot,oe=_==0?gt:St,ve=v._splits,pe=Z.distr==2?ve.map(dt=>Pt[dt]):ve,ce=Z.distr==2?Pt[ve[1]]-Pt[ve[0]]:q,le=v.ticks,te=v.border,Ce=le.show?le.size:0,Re=Ue(Ce*me),tt=Ue((v.alignTo==2?v._size-Ce-v.gap:v.gap)*me),$e=v._rotate*-ll/180,Ne=T(v._pos*me),_t=(Re+tt)*H,ct=Ne+_t;L=_==0?ct:0,w=_==1?ct:0;let Mt=v.font[0],zt=v.align==1?Qs:v.align==2?io:$e>0?Qs:$e<0?io:_==0?"center":h==3?io:Qs,Gt=$e||_==1?"middle":h==2?Sn:ci;ya(Mt,N,zt,Gt);let $t=v.font[1]*v.lineGap,Et=ve.map(dt=>T(i(dt,Z,X,oe))),Ft=v._values;for(let dt=0;dt<Ft.length;dt++){let yt=Ft[dt];if(yt!=null){_==0?w=Et[dt]:L=Et[dt],yt=""+yt;let ws=yt.indexOf(`
`)==-1?[yt]:yt.split(/\n/gm);for(let ut=0;ut<ws.length;ut++){let Wa=ws[ut];$e?(p.save(),p.translate(w,L+ut*$t),p.rotate($e),p.fillText(Wa,0,0),p.restore()):p.fillText(Wa,w,L+ut*$t)}}}le.show&&Vl(Et,le.filter(n,pe,u,J,ce),_,h,Ne,Re,xe(le.width*me,3),le.stroke(n,u),le.dash,le.cap);let Yt=v.grid;Yt.show&&Vl(Et,Yt.filter(n,pe,u,J,ce),_,_==0?2:1,_==0?St:gt,_==0?Ot:ft,xe(Yt.width*me,3),Yt.stroke(n,u),Yt.dash,Yt.cap),te.show&&Vl([Ne],[1],_==0?1:0,_==0?1:2,_==1?St:gt,_==1?Ot:ft,xe(te.width*me,3),te.stroke(n,u),te.dash,te.cap)}et("drawAxes")}function Hs(u){$.forEach((v,h)=>{h>0&&(v._paths=null,u&&(l==1?(v.min=null,v.max=null):v.facets.forEach(_=>{_.min=null,_.max=null})))})}let Vn=!1,Ul=!1,yn=[];function Xc(){Ul=!1;for(let u=0;u<yn.length;u++)et(...yn[u]);yn.length=0}function Ws(){Vn||(Bu(Sa),Vn=!0)}function ed(u,v=!1){Vn=!0,Ul=v,u(n),Sa(),v&&yn.length>0&&queueMicrotask(Xc)}n.batch=ed;function Sa(){if(Ol&&(Vc(),Ol=!1),Fs&&(Nc(),Fs=!1),In){if(Me(g,Qs,we),Me(g,Sn,Ve),Me(g,Cn,ie),Me(g,Mn,Q),Me(k,Qs,we),Me(k,Sn,Ve),Me(k,Cn,ie),Me(k,Mn,Q),Me(m,Cn,Qt),Me(m,Mn,hs),f.width=Ue(Qt*me),f.height=Ue(hs*me),x.forEach(({_el:u,_show:v,_size:h,_pos:_,side:w})=>{if(u!=null)if(v){let L=w===3||w===0?h:0,N=w%2==1;Me(u,N?"left":"top",_-L),Me(u,N?"width":"height",h),Me(u,N?"top":"left",N?Ve:we),Me(u,N?"height":"width",N?Q:ie),Mo(u,Cs)}else bt(u,Cs)}),Hn=Bs=Fl=Nl=Il=jl=Bl=Hl=Rl=null,vt=1,xn(!0),we!=zs||Ve!=gs||ie!=Wt||Q!=_s){Hs(!1);let u=ie/Wt,v=Q/_s;if(Pe&&!$s&&V.left>=0){V.left*=u,V.top*=v,qs&&Kt(qs,Ue(V.left),0,ie,Q),Vs&&Kt(Vs,0,Ue(V.top),ie,Q);for(let h=0;h<Ct.length;h++){let _=Ct[h];_!=null&&(Is[h]*=u,js[h]*=v,Kt(_,Lt(Is[h]),Lt(js[h]),ie,Q))}}if(Te.show&&!jn&&Te.left>=0&&Te.width>0){Te.left*=u,Te.width*=u,Te.top*=v,Te.height*=v;for(let h in Ql)Me(Ys,h,Te[h])}zs=we,gs=Ve,Wt=ie,_s=Q}et("setSize"),In=!1}Qt>0&&hs>0&&(p.clearRect(0,0,f.width,f.height),et("drawClear"),R.forEach(u=>u()),et("draw")),Te.show&&jn&&(Un(Te),jn=!1),Pe&&$s&&(xs(null,!0,!1),$s=!1),ee.show&&ee.live&&Tt&&(Jl(),Tt=!1),c||(c=!0,n.status=1,et("ready")),$n=!1,Vn=!1}n.redraw=(u,v)=>{Fs=v||!1,u!==!1?is(A,P.min,P.max):Ws()};function Gl(u,v){let h=S[u];if(h.from==null){if(st==0){let _=h.range(n,v.min,v.max,u);v.min=_[0],v.max=_[1]}if(v.min>v.max){let _=v.min;v.min=v.max,v.max=_}if(st>1&&v.min!=null&&v.max!=null&&v.max-v.min<1e-16)return;u==A&&h.distr==2&&st>0&&(v.min=Nt(v.min,t[0]),v.max=Nt(v.max,t[0]),v.min==v.max&&v.max++),G[u]=v,Ol=!0,Ws()}}n.setScale=Gl;let Yl,Kl,qs,Vs,Ta,Ca,Us,Gs,Ma,Ea,Se,Ae,as=!1;const nt=V.drag;let Qe=nt.x,Xe=nt.y;Pe&&(V.x&&(Yl=Dt(uu,k)),V.y&&(Kl=Dt(pu,k)),P.ori==0?(qs=Yl,Vs=Kl):(qs=Kl,Vs=Yl),Se=V.left,Ae=V.top);const Te=n.select=qe({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Ys=Te.show?Dt(du,Te.over?k:g):null;function Un(u,v){if(Te.show){for(let h in u)Te[h]=u[h],h in Ql&&Me(Ys,h,u[h]);v!==!1&&et("setSelect")}}n.setSelect=Un;function td(u){if($[u].show)ye&&Mo(ze[u],Cs);else if(ye&&bt(ze[u],Cs),Pe){let h=Ns?Ct[0]:Ct[u];h!=null&&Kt(h,-10,-10,ie,Q)}}function is(u,v,h){Gl(u,{min:v,max:h})}function Vt(u,v,h,_){v.focus!=null&&ad(u),v.show!=null&&$.forEach((w,L)=>{L>0&&(u==L||u==null)&&(w.show=v.show,td(L),l==2?(is(w.facets[0].scale,null,null),is(w.facets[1].scale,null,null)):is(w.scale,null,null),Ws())}),h!==!1&&et("setSeries",u,v),_&&wn("setSeries",n,u,v)}n.setSeries=Vt;function sd(u,v){qe(j[u],v)}function nd(u,v){u.fill=de(u.fill||null),u.dir=fe(u.dir,-1),v=v??j.length,j.splice(v,0,u)}function ld(u){u==null?j.length=0:j.splice(u,1)}n.addBand=nd,n.setBand=sd,n.delBand=ld;function od(u,v){$[u].alpha=v,Pe&&Ct[u]!=null&&(Ct[u].style.opacity=v),ye&&ze[u]&&(ze[u].style.opacity=v)}let Xt,rs,ks;const Ks={focus:!0};function ad(u){if(u!=ks){let v=u==null,h=qt.alpha!=1;$.forEach((_,w)=>{if(l==1||w>0){let L=v||w==0||w==u;_._focus=v?null:L,h&&od(w,L?1:qt.alpha)}}),ks=u,h&&Ws()}}ye&&Rs&&rt(fi,ue,u=>{V._lock||(ys(u),ks!=null&&Vt(null,Ks,!0,He.setSeries))});function Ut(u,v,h){let _=S[v];h&&(u=u/me-(_.ori==1?Ve:we));let w=ie;_.ori==1&&(w=Q,u=w-u),_.dir==-1&&(u=w-u);let L=_._min,N=_._max,H=u/w,q=L+(N-L)*H,J=_.distr;return J==3?dn(10,q):J==4?Eu(q,_.asinh):J==100?_.bwd(q):q}function id(u,v){let h=Ut(u,A,v);return Nt(h,t[0],Je,Ze)}n.valToIdx=u=>Nt(u,t[0]),n.posToIdx=id,n.posToVal=Ut,n.valToPos=(u,v,h)=>S[v].ori==0?o(u,S[v],h?ft:ie,h?gt:0):a(u,S[v],h?Ot:Q,h?St:0),n.setCursor=(u,v,h)=>{Se=u.left,Ae=u.top,xs(null,v,h)};function Da(u,v){Me(Ys,Qs,Te.left=u),Me(Ys,Cn,Te.width=v)}function La(u,v){Me(Ys,Sn,Te.top=u),Me(Ys,Mn,Te.height=v)}let bn=P.ori==0?Da:La,kn=P.ori==1?Da:La;function rd(){if(ye&&ee.live)for(let u=l==2?1:0;u<$.length;u++){if(u==0&&wt)continue;let v=ee.values[u],h=0;for(let _ in v)Ht[u][h++].firstChild.nodeValue=v[_]}}function Jl(u,v){if(u!=null&&(u.idxs?u.idxs.forEach((h,_)=>{se[_]=h}):Ou(u.idx)||se.fill(u.idx),ee.idx=se[0]),ye&&ee.live){for(let h=0;h<$.length;h++)(h>0||l==1&&!wt)&&cd(h,se[h]);rd()}Tt=!1,v!==!1&&et("setLegend")}n.setLegend=Jl;function cd(u,v){let h=$[u],_=u==0&&z==2?Pt:t[u],w;wt?w=h.values(n,u,v)??ls:(w=h.value(n,v==null?null:_[v],u,v),w=w==null?ls:{_:w}),ee.values[u]=w}function xs(u,v,h){Ma=Se,Ea=Ae,[Se,Ae]=V.move(n,Se,Ae),V.left=Se,V.top=Ae,Pe&&(qs&&Kt(qs,Ue(Se),0,ie,Q),Vs&&Kt(Vs,0,Ue(Ae),ie,Q));let _,w=Je>Ze;Xt=ke,rs=null;let L=P.ori==0?ie:Q,N=P.ori==1?ie:Q;if(Se<0||st==0||w){_=V.idx=null;for(let H=0;H<$.length;H++){let q=Ct[H];q!=null&&Kt(q,-10,-10,ie,Q)}Rs&&Vt(null,Ks,!0,u==null&&He.setSeries),ee.live&&(se.fill(_),Tt=!0)}else{let H,q,J;l==1&&(H=P.ori==0?Se:Ae,q=Ut(H,A),_=V.idx=Nt(q,t[0],Je,Ze),J=E(t[0][_],P,L,0));let Z=-10,X=-10,oe=0,ve=0,pe=!0,ce="",le="";for(let te=l==2?1:0;te<$.length;te++){let Ce=$[te],Re=se[te],tt=Re==null?null:l==1?t[te][Re]:t[te][1][Re],$e=V.dataIdx(n,te,_,q),Ne=$e==null?null:l==1?t[te][$e]:t[te][1][$e];if(Tt=Tt||Ne!=tt||$e!=Re,se[te]=$e,te>0&&Ce.show){let _t=$e==null?-10:$e==_?J:E(l==1?t[0][$e]:t[te][0][$e],P,L,0),ct=Ne==null?-10:Y(Ne,l==1?S[Ce.scale]:S[Ce.facets[1].scale],N,0);if(Rs&&Ne!=null){let Mt=P.ori==1?Se:Ae,zt=Ye(qt.dist(n,te,$e,ct,Mt));if(zt<Xt){let Gt=qt.bias;if(Gt!=0){let $t=Ut(Mt,Ce.scale),Et=Ne>=0?1:-1,Ft=$t>=0?1:-1;Ft==Et&&(Ft==1?Gt==1?Ne>=$t:Ne<=$t:Gt==1?Ne<=$t:Ne>=$t)&&(Xt=zt,rs=te)}else Xt=zt,rs=te}}if(Tt||Ns){let Mt,zt;P.ori==0?(Mt=_t,zt=ct):(Mt=ct,zt=_t);let Gt,$t,Et,Ft,Yt,dt,yt=!0,ws=it.bbox;if(ws!=null){yt=!1;let ut=ws(n,te);Et=ut.left,Ft=ut.top,Gt=ut.width,$t=ut.height}else Et=Mt,Ft=zt,Gt=$t=it.size(n,te);if(dt=it.fill(n,te),Yt=it.stroke(n,te),Ns)te==rs&&Xt<=qt.prox&&(Z=Et,X=Ft,oe=Gt,ve=$t,pe=yt,ce=dt,le=Yt);else{let ut=Ct[te];ut!=null&&(Is[te]=Et,js[te]=Ft,yi(ut,Gt,$t,yt),_i(ut,dt,Yt),Kt(ut,Lt(Et),Lt(Ft),ie,Q))}}}}if(Ns){let te=qt.prox,Ce=ks==null?Xt<=te:Xt>te||rs!=ks;if(Tt||Ce){let Re=Ct[0];Re!=null&&(Is[0]=Z,js[0]=X,yi(Re,oe,ve,pe),_i(Re,ce,le),Kt(Re,Lt(Z),Lt(X),ie,Q))}}}if(Te.show&&as)if(u!=null){let[H,q]=He.scales,[J,Z]=He.match,[X,oe]=u.cursor.sync.scales,ve=u.cursor.drag;if(Qe=ve._x,Xe=ve._y,Qe||Xe){let{left:pe,top:ce,width:le,height:te}=u.select,Ce=u.scales[X].ori,Re=u.posToVal,tt,$e,Ne,_t,ct,Mt=H!=null&&J(H,X),zt=q!=null&&Z(q,oe);Mt&&Qe?(Ce==0?(tt=pe,$e=le):(tt=ce,$e=te),Ne=S[H],_t=E(Re(tt,X),Ne,L,0),ct=E(Re(tt+$e,X),Ne,L,0),bn(It(_t,ct),Ye(ct-_t))):bn(0,L),zt&&Xe?(Ce==1?(tt=pe,$e=le):(tt=ce,$e=te),Ne=S[q],_t=Y(Re(tt,oe),Ne,N,0),ct=Y(Re(tt+$e,oe),Ne,N,0),kn(It(_t,ct),Ye(ct-_t))):kn(0,N)}else Xl()}else{let H=Ye(Ma-Ta),q=Ye(Ea-Ca);if(P.ori==1){let oe=H;H=q,q=oe}Qe=nt.x&&H>=nt.dist,Xe=nt.y&&q>=nt.dist;let J=nt.uni;J!=null?Qe&&Xe&&(Qe=H>=J,Xe=q>=J,!Qe&&!Xe&&(q>H?Xe=!0:Qe=!0)):nt.x&&nt.y&&(Qe||Xe)&&(Qe=Xe=!0);let Z,X;Qe&&(P.ori==0?(Z=Us,X=Se):(Z=Gs,X=Ae),bn(It(Z,X),Ye(X-Z)),Xe||kn(0,N)),Xe&&(P.ori==1?(Z=Us,X=Se):(Z=Gs,X=Ae),kn(It(Z,X),Ye(X-Z)),Qe||bn(0,L)),!Qe&&!Xe&&(bn(0,0),kn(0,0))}if(nt._x=Qe,nt._y=Xe,u==null){if(h){if(Ha!=null){let[H,q]=He.scales;He.values[0]=H!=null?Ut(P.ori==0?Se:Ae,H):null,He.values[1]=q!=null?Ut(P.ori==1?Se:Ae,q):null}wn(ro,n,Se,Ae,ie,Q,_)}if(Rs){let H=h&&He.setSeries,q=qt.prox;ks==null?Xt<=q&&Vt(rs,Ks,!0,H):Xt>q?Vt(null,Ks,!0,H):rs!=ks&&Vt(rs,Ks,!0,H)}}Tt&&(ee.idx=_,Jl()),v!==!1&&et("setCursor")}let cs=null;Object.defineProperty(n,"rect",{get(){return cs==null&&xn(!1),cs}});function xn(u=!1){u?cs=null:(cs=k.getBoundingClientRect(),et("syncRect",cs))}function Aa(u,v,h,_,w,L,N){V._lock||as&&u!=null&&u.movementX==0&&u.movementY==0||(Zl(u,v,h,_,w,L,N,!1,u!=null),u!=null?xs(null,!0,!0):xs(v,!0,!1))}function Zl(u,v,h,_,w,L,N,H,q){if(cs==null&&xn(!1),ys(u),u!=null)h=u.clientX-cs.left,_=u.clientY-cs.top;else{if(h<0||_<0){Se=-10,Ae=-10;return}let[J,Z]=He.scales,X=v.cursor.sync,[oe,ve]=X.values,[pe,ce]=X.scales,[le,te]=He.match,Ce=v.axes[0].side%2==1,Re=P.ori==0?ie:Q,tt=P.ori==1?ie:Q,$e=Ce?L:w,Ne=Ce?w:L,_t=Ce?_:h,ct=Ce?h:_;if(pe!=null?h=le(J,pe)?i(oe,S[J],Re,0):-10:h=Re*(_t/$e),ce!=null?_=te(Z,ce)?i(ve,S[Z],tt,0):-10:_=tt*(ct/Ne),P.ori==1){let Mt=h;h=_,_=Mt}}q&&(v==null||v.cursor.event.type==ro)&&((h<=1||h>=ie-1)&&(h=Ss(h,ie)),(_<=1||_>=Q-1)&&(_=Ss(_,Q))),H?(Ta=h,Ca=_,[Us,Gs]=V.move(n,h,_)):(Se=h,Ae=_)}const Ql={width:0,height:0,left:0,top:0};function Xl(){Un(Ql,!1)}let Oa,Pa,za,Fa;function Ra(u,v,h,_,w,L,N){as=!0,Qe=Xe=nt._x=nt._y=!1,Zl(u,v,h,_,w,L,N,!0,!1),u!=null&&(rt(co,To,Na,!1),wn(ui,n,Us,Gs,ie,Q,null));let{left:H,top:q,width:J,height:Z}=Te;Oa=H,Pa=q,za=J,Fa=Z}function Na(u,v,h,_,w,L,N){as=nt._x=nt._y=!1,Zl(u,v,h,_,w,L,N,!1,!0);let{left:H,top:q,width:J,height:Z}=Te,X=J>0||Z>0,oe=Oa!=H||Pa!=q||za!=J||Fa!=Z;if(X&&oe&&Un(Te),nt.setScale&&X&&oe){let ve=H,pe=J,ce=q,le=Z;if(P.ori==1&&(ve=q,pe=Z,ce=H,le=J),Qe&&is(A,Ut(ve,A),Ut(ve+pe,A)),Xe)for(let te in S){let Ce=S[te];te!=A&&Ce.from==null&&Ce.min!=ke&&is(te,Ut(ce+le,te),Ut(ce,te))}Xl()}else V.lock&&(V._lock=!V._lock,xs(v,!0,u!=null));u!=null&&(Ps(co,To),wn(co,n,Se,Ae,ie,Q,null))}function dd(u,v,h,_,w,L,N){if(V._lock)return;ys(u);let H=as;if(as){let q=!0,J=!0,Z=10,X,oe;P.ori==0?(X=Qe,oe=Xe):(X=Xe,oe=Qe),X&&oe&&(q=Se<=Z||Se>=ie-Z,J=Ae<=Z||Ae>=Q-Z),X&&q&&(Se=Se<Us?0:ie),oe&&J&&(Ae=Ae<Gs?0:Q),xs(null,!0,!0),as=!1}Se=-10,Ae=-10,se.fill(null),xs(null,!0,!0),H&&(as=H)}function Ia(u,v,h,_,w,L,N){V._lock||(ys(u),zl(),Xl(),u!=null&&wn(vi,n,Se,Ae,ie,Q,null))}function ja(){x.forEach(Kp),Pl(n.width,n.height,!0)}Ms(pl,an,ja);const Js={};Js.mousedown=Ra,Js.mousemove=Aa,Js.mouseup=Na,Js.dblclick=Ia,Js.setSeries=(u,v,h,_)=>{let w=He.match[2];h=w(n,v,h),h!=-1&&Vt(h,_,!0,!1)},Pe&&(rt(ui,k,Ra),rt(ro,k,Aa),rt(pi,k,u=>{ys(u),xn(!1)}),rt(fi,k,dd),rt(vi,k,Ia),Po.add(n),n.syncRect=xn);const Gn=n.hooks=e.hooks||{};function et(u,v,h){Ul?yn.push([u,v,h]):u in Gn&&Gn[u].forEach(_=>{_.call(null,n,v,h)})}(e.plugins||[]).forEach(u=>{for(let v in u.hooks)Gn[v]=(Gn[v]||[]).concat(u.hooks[v])});const Ba=(u,v,h)=>h,He=qe({key:null,setSeries:!1,filters:{pub:Si,sub:Si},scales:[A,$[1]?$[1].scale:null],match:[Ti,Ti,Ba],values:[null,null]},V.sync);He.match.length==2&&He.match.push(Ba),V.sync=He;const Ha=He.key,eo=vc(Ha);function wn(u,v,h,_,w,L,N){He.filters.pub(u,v,h,_,w,L,N)&&eo.pub(u,v,h,_,w,L,N)}eo.sub(n);function ud(u,v,h,_,w,L,N){He.filters.sub(u,v,h,_,w,L,N)&&Js[u](null,v,h,_,w,L,N)}n.pub=ud;function pd(){eo.unsub(n),Po.delete(n),ms.clear(),Eo(pl,an,ja),d.remove(),ue==null||ue.remove(),et("destroy")}n.destroy=pd;function to(){et("init",e,t),_a(t||e.data,!1),G[A]?Gl(A,G[A]):zl(),jn=Te.show&&(Te.width>0||Te.height>0),$s=Tt=!0,Pl(e.width,e.height)}return $.forEach(ha),x.forEach(qc),s?s instanceof HTMLElement?(s.appendChild(d),to()):s(n,to):to(),n}ot.assign=qe;ot.fmtNum=na;ot.rangeNum=fl;ot.rangeLog=Sl;ot.rangeAsinh=ta;ot.orient=Ls;ot.pxRatio=me;ot.join=ju;ot.fmtDate=oa,ot.tzDate=Zu;ot.sync=vc;{ot.addGap=Op,ot.clipGaps=Ml;let e=ot.paths={points:yc};e.linear=kc,e.stepped=Fp,e.bars=Rp,e.spline=Ip}function Jp(e){let t;return{hooks:{init(s){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",s.over.appendChild(t)},setCursor(s){const n=s.cursor.idx;if(n==null||!s.data[1]||s.data[1][n]==null){t.style.display="none";return}const l=s.data[0][n],o=s.data[1][n],a=new Date(l*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):F(o)}</b> ${a}`;const i=Math.round(s.valToPos(l,"x"));t.style.left=Math.min(i,s.over.clientWidth-80)+"px",t.style.display=""}}}}function Zp(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function Tc({data:e,color:t,smooth:s,height:n,yMax:l,fmtVal:o}){const a=lt(null),i=lt(null),c=n||55;return ae(()=>{if(!a.current||!e||e[0].length<2)return;const d=s?Zd(e[1]):e[1],f=[e[0],d];if(i.current){i.current.setData(f);return}const p=l?(g,k,D)=>[0,Math.max(l,D*1.05)]:(g,k,D)=>[Math.max(0,k*.9),D*1.1],m={width:a.current.clientWidth||200,height:c,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:p}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:t,width:1.5,fill:Zp(t,.09)}],plugins:[Jp(o)]};return i.current=new ot(m,f,a.current),()=>{i.current&&(i.current.destroy(),i.current=null)}},[e,t,s]),ae(()=>{if(!i.current||!a.current)return;const d=new ResizeObserver(()=>{i.current&&a.current&&i.current.setSize({width:a.current.clientWidth,height:c})});return d.observe(a.current),()=>d.disconnect()},[]),r`<div class="chart-wrap" role="img" aria-label="Sparkline chart" style=${"height:"+c+"px"} ref=${a}></div>`}function ts({label:e,value:t,valColor:s,data:n,chartColor:l,smooth:o,refLines:a,yMax:i,dp:c}){const d=re(()=>{if(!n||!n[1]||n[1].length<2)return[];const f=i?Math.max(i,n[1].reduce((p,m)=>Math.max(p,m),0)*1.05):n[1].reduce((p,m)=>Math.max(p,m),0)*1.1;return(a||[]).map(p=>{if(f<=0)return null;const m=(1-p.value/f)*100;return m>=0&&m<=95?{...p,pct:m}:null}).filter(Boolean)},[n,a,i]);return r`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${c?{"data-dp":c}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${e}</span>
      <span class="chart-val" style=${"color:"+(s||l||"var(--accent)")} aria-live="polite" aria-atomic="true">${t}</span>
    </div>
    <div style="position:relative">
      ${d.map(f=>r`<Fragment>
          <div class="chart-ref-line" style=${"top:"+f.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+f.pct+"% - 8px)"}>${f.label}</div>
        </Fragment>`)}
      ${n&&n[0].length>=2?r`<${Tc} data=${n} color=${l||"var(--accent)"} smooth=${o} yMax=${i}/>`:r`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem">collecting...</div>`}
    </div>
  </div>`}function Fo({label:e,value:t,accent:s,dp:n,sm:l}){const o=lt(t),[a,i]=W(!1);return ae(()=>{o.current!==t&&(i(!0),setTimeout(()=>i(!1),500)),o.current=t},[t]),r`<div class=${"metric"+(l?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(s?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
  </div>`}function Yi({snap:e,mode:t}){if(!e)return null;const s=!t||t==="files",n=!t||t==="traffic",l=e.tools.filter(c=>c.tool!=="aictl"&&c.files.length),o=l.reduce((c,d)=>c+d.files.length,0)||1,a=e.tools.filter(c=>c.tool!=="aictl"&&c.live&&(c.live.outbound_rate_bps||c.live.inbound_rate_bps)),i=a.reduce((c,d)=>c+(d.live.outbound_rate_bps||0)+(d.live.inbound_rate_bps||0),0)||1;return r`
    ${s&&l.length>0&&r`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+l.map(c=>c.label+" "+c.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${l.map(c=>r`
        <div class="rbar-seg" style=${"width:"+(c.files.length/o*100).toFixed(1)+"%;background:"+(De[c.tool]||"var(--fg2)")}
          title="${c.label}: ${c.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${l.map(c=>r`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(De[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${c.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${n&&r`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(a.length?a.map(c=>c.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${a.length===0?" — no active traffic":""}</div>
      <div class="rbar">${a.map(c=>{const d=(c.live.outbound_rate_bps||0)+(c.live.inbound_rate_bps||0);return r`<div class="rbar-seg" style=${"width:"+(d/i*100).toFixed(1)+"%;background:"+(De[c.tool]||"var(--fg2)")}
          title="${c.label}: ${jt(d)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(c=>{const d=(c.live.outbound_rate_bps||0)+(c.live.inbound_rate_bps||0);return r`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(De[c.tool]||"var(--fg2)")}></span>
          ${c.label} <span class="text-muted">${jt(d)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!l.length&&!a.length&&r`<div class="empty-state">No AI tool resources found yet.</div>`}`}function Qp({path:e,onClose:t}){const{snap:s}=je(Ie),[n,l]=W(null),[o,a]=W(!1),[i,c]=W(null),d=lt(null),f=lt(null),[p,m]=W(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),g=lt(!1),k=lt(0),D=lt(0),T=be(A=>{g.current=!0,k.current=A.clientX,D.current=p,A.preventDefault()},[p]);if(ae(()=>{const A=R=>{if(!g.current)return;const y=k.current-R.clientX,C=window.innerWidth,P=Math.min(90,Math.max(20,D.current+y/C*100));m(P)},M=()=>{if(g.current){g.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(p)))}catch{}}};return window.addEventListener("mousemove",A),window.addEventListener("mouseup",M),()=>{window.removeEventListener("mousemove",A),window.removeEventListener("mouseup",M)}},[p]),ae(()=>{if(!e)return;f.current=document.activeElement;const A=setTimeout(()=>{var y;const R=(y=d.current)==null?void 0:y.querySelector("button");R&&R.focus()},50),M=R=>{if(R.key!=="Tab"||!d.current)return;const y=d.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!y.length)return;const C=y[0],P=y[y.length-1];R.shiftKey&&document.activeElement===C?(R.preventDefault(),P.focus()):!R.shiftKey&&document.activeElement===P&&(R.preventDefault(),C.focus())};return document.addEventListener("keydown",M),()=>{clearTimeout(A),document.removeEventListener("keydown",M),f.current&&f.current.focus&&f.current.focus()}},[e]),ae(()=>{e&&(a(!1),c(null),Zo(e).then(l).catch(A=>c(A.message)))},[e]),!e)return null;const b=re(()=>{if(!s)return"";for(const A of s.tools)for(const M of A.files)if(M.path===e)return(M.kind||"")+" | "+ge(M.size)+" | ~"+F(M.tokens)+"tok | scope:"+(M.scope||"?")+" | sent_to_llm:"+(M.sent_to_llm||"?")+" | loaded:"+(M.loaded_when||"?");for(const A of s.agent_memory)if(A.file===e)return A.source+" | "+A.profile+" | "+A.tokens+"tok | "+A.lines+"ln";return""},[s,e]),$=n?n.split(`
`):[],x=$.length,S=x>Zs*2,j=(A,M)=>A.map((R,y)=>r`<div class="fv-line"><span class="fv-ln">${M+y}</span><span class="fv-code">${K(R)||" "}</span></div>`);return r`<div class="fv" ref=${d} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+p+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${T}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      <button onClick=${t} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${b}</div>
    <div class="fv-body">
      ${i?r`<p class="text-red" style="padding:var(--sp-10)">${i}</p>`:n?!S||o?r`<div class="fv-lines">${j($,1)}</div>`:r`<div class="fv-lines">${j($.slice(0,Zs),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>a(!0)}>\u25BC ${x-Zs*2} more lines \u25BC</div>
            <div class="fv-lines">${j($.slice(-Zs),x-Zs+1)}</div>`:r`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${x} lines${S&&!o?" (showing "+Zs*2+" of "+x+")":""}</span>
      ${S&&r`<button onClick=${()=>a(!o)}>${o?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function Ro({file:e,dirPrefix:t}){var A;const[s,n]=W(!1),[l,o]=W(!1),[a,i]=W(null),[c,d]=W(null),[f,p]=W(!1),m=je(Ie),g=(e.path||"").replace(/\\/g,"/").split("/").pop(),k=(e.sent_to_llm||"").toLowerCase(),D=e.mtime&&Date.now()/1e3-e.mtime<300,T=(A=m.recentFiles)==null?void 0:A.get(e.path),b=!!T,$=be(async()=>{if(s){n(!1);return}n(!0),p(!0),d(null);try{const M=await Zo(e.path);i(M)}catch(M){d(M.message)}finally{p(!1)}},[s,e.path]),x=(M,R)=>M.map((y,C)=>r`<span class="pline"><span class="ln">${R+C}</span>${K(y)||" "}</span>`),S=()=>{if(f)return r`<span class="text-muted">loading...</span>`;if(c)return r`<span class="text-red">${c}</span>`;if(!a)return null;const M=a.split(`
`),R=M.length;if(R<=on*3||l)return r`${x(M,1)}
        <div class="prev-actions">
          ${l&&r`<button class="prev-btn" onClick=${()=>o(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
        </div>`;const C=M.slice(-on),P=R-on+1;return r`${x(C,P)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>o(!0)}>show all (${R} lines)</button>
        <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
      </div>`},j=e.size>0?Math.round(e.size/60):0;return r`<div>
    <button class="fitem" onClick=${$} aria-expanded=${s} title=${e.path}>
      ${b?r`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Bt(T.ts)}${T.growth>0?" +"+ge(T.growth):""}">●</span>`:D?r`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Bt(e.mtime)}">●</span>`:r`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${t?r`<span class="text-muted">${t}/</span>`:""}${K(g)}</span>
      <span class="fmeta">
        ${k&&k!=="no"&&r`<span style="color:${Ir(k)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${k}">${k==="yes"?"◆":k==="on-demand"?"◇":"○"}</span>`}
        ${ge(e.size)}${j?r` <span class="text-muted">${j}ln</span>`:""}${e.tokens?r` <span class="text-muted">${F(e.tokens)}t</span>`:""}
        ${e.mtime&&D?r` <span class="text-orange text-xs">${Bt(e.mtime)}</span>`:""}
      </span>
    </button>
    ${s&&r`<div class="inline-preview">${S()}</div>`}
  </div>`}function Xp({dir:e,files:t}){const[s,n]=W(!1),l=t.reduce((a,i)=>a+i.tokens,0),o=t.reduce((a,i)=>a+i.size,0);return r`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-muted" title=${e}>${K(e)}</span>
      <span class="badge">${t.length}</span>
      <span class="badge">${ge(o)}</span>
      <span class="badge">${F(l)}t</span>
    </button>
    ${s&&r`<div style=${{paddingLeft:"var(--sp-8)"}}>${t.map(a=>r`<${Ro} key=${a.path} file=${a}/>`)}</div>`}
  </div>`}function ef({label:e,files:t,root:s,badge:n,style:l,startOpen:o}){const[a,i]=W(!!o),c=re(()=>Jd(t,s),[t,s]),d=re(()=>t.reduce((g,k)=>g+k.tokens,0),[t]),f=re(()=>t.reduce((g,k)=>g+k.size,0),[t]),p=re(()=>{var k;const g={};return t.forEach(D=>{const T=(D.sent_to_llm||"no").toLowerCase();g[T]=(g[T]||0)+1}),((k=Object.entries(g).sort((D,T)=>T[1]-D[1])[0])==null?void 0:k[0])||"no"},[t]),m=()=>c.length===1&&c[0][1].length<=3?c[0][1].map(g=>r`<${Ro} key=${g.path} file=${g}/>`):c.map(([g,k])=>k.length===1?r`<div style=${{marginLeft:"var(--sp-5)"}}><${Ro} key=${k[0].path} file=${k[0]} dirPrefix=${g}/></div>`:r`<${Xp} key=${g} dir=${g} files=${k}/>`);return r`<div class="cat-group" style=${l||""}>
    <button class=${"cat-head"+(a?" open":"")} onClick=${()=>i(!a)} aria-expanded=${a}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${Ir(p)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${p}"></span>
      <span class="cat-label" title=${e}>${K(e)}</span>
      <span class="badge" style="flex-shrink:0">${n||t.length}</span>
      <span class="badge">${ge(f)}</span>
      <span class="badge">${F(d)}t</span>
    </button>
    ${a&&r`<div style=${{paddingLeft:"var(--sp-8)"}}>${m()}</div>`}
  </div>`}/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cc=(...e)=>e.filter((t,s,n)=>!!t&&t.trim()!==""&&n.indexOf(t)===s).join(" ").trim();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ki=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tf=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,s,n)=>n?n.toUpperCase():s.toLowerCase());/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ji=e=>{const t=tf(e);return t.charAt(0).toUpperCase()+t.slice(1)};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var sf={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nf=Mr({size:24,color:"currentColor",strokeWidth:2,absoluteStrokeWidth:!1,class:""}),lf=()=>je(nf);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const of=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const af=({color:e,size:t,strokeWidth:s,absoluteStrokeWidth:n,children:l,iconNode:o,class:a="",...i})=>{const{size:c=24,strokeWidth:d=2,absoluteStrokeWidth:f=!1,color:p="currentColor",class:m=""}=lf()??{},g=n??f?Number(s??d)*24/Number(t??c):s??d;return Pn("svg",{...sf,width:t??c??24,height:t??c??24,stroke:e??p,"stroke-width":g,class:Cc("lucide",m,a),...!l&&!of(i)&&{"aria-hidden":"true"},...i},[...o.map(([k,D])=>Pn(k,D)),...wr(l)])};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const at=(e,t)=>{const s=({class:n="",className:l="",children:o,...a})=>Pn(af,{...a,iconNode:t,class:Cc(`lucide-${Ki(Ji(e))}`,`lucide-${Ki(e)}`,n,l)},o);return s.displayName=Ji(e),s};/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rf=at("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cf=at("brain",[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const df=at("chart-column",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uf=at("chart-line",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pf=at("chevron-down",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ff=at("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vf=at("cpu",[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mf=at("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hf=at("git-branch",[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gf=at("layout-dashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _f=at("radio",[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $f=at("refresh-cw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yf=at("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bf=at("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kf=at("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xf=at("wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-preact v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wf=at("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]),Sf={activity:rf,"alert-triangle":kf,"bar-chart-3":df,brain:cf,"chevron-down":pf,"chevron-right":ff,cpu:vf,"file-text":mf,"git-branch":hf,"layout-dashboard":gf,"line-chart":uf,radio:_f,"refresh-cw":$f,search:yf,settings:bf,wallet:xf,x:wf};function ml({name:e,size:t="1em",strokeWidth:s=2,...n}){if(!e)return null;const l=Sf[String(e)];return l?r`<${l} size=${t} strokeWidth=${s} aria-hidden="true" ...${n} />`:r`<span aria-hidden="true" ...${n}>${e}</span>`}function mo({label:e,data:t,color:s}){const n=lt(null);return ae(()=>{const l=n.current;if(!l||!t||t.length<2)return;const o=l.getContext("2d"),a=l.width=l.offsetWidth*(window.devicePixelRatio||1),i=l.height=l.offsetHeight*(window.devicePixelRatio||1);o.clearRect(0,0,a,i);const c=t.slice(-60),d=Math.max(...c)*1.1||1,f=a/(c.length-1);o.beginPath(),o.strokeStyle=s,o.lineWidth=1.5*(window.devicePixelRatio||1),c.forEach((p,m)=>{const g=m*f,k=i-p/d*i*.85;m===0?o.moveTo(g,k):o.lineTo(g,k)}),o.stroke()},[t,s]),r`<div style="position:relative;height:25px">
    <span class="text-muted" style="position:absolute;top:0;left:0;font-size:var(--fs-2xs);z-index:1">${e}</span>
    <canvas ref=${n} aria-hidden="true" style="width:100%;height:100%;display:block"/>
  </div>`}function Tf({processes:e,maxMem:t}){if(!e||!e.length)return null;const s=e.reduce((a,i)=>a+(parseFloat(i.mem_mb)||0),0),n=e.reduce((a,i)=>a+(parseFloat(i.cpu_pct)||0),0),l={};e.forEach(a=>{const i=a.process_type||"process";(l[i]=l[i]||[]).push(a)});const o=Object.keys(l).length>1;return r`<div class="proc-section">
    <h3>Processes <span class="badge">${e.length}</span>
      <span class="badge">CPU ${_e(n)}</span>
      <span class="badge">MEM ${ge(s*1048576)}</span></h3>
    ${Object.entries(l).map(([a,i])=>{const c={};return i.forEach(d=>(c[d.name||"unknown"]=c[d.name||"unknown"]||[]).push(d)),r`<div style="margin-bottom:var(--sp-2)">
        ${o?r`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${K(a)}</div>`:null}
        ${Object.entries(c).map(([d,f])=>{const p=f.sort((m,g)=>(parseFloat(g.mem_mb)||0)-(parseFloat(m.mem_mb)||0));return r`<div key=${d} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${o?"":r`<span style="text-transform:uppercase;letter-spacing:0.03em">${K(a)}</span>${" · "}`}${K(d)} <span style="opacity:0.6">(${f.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${p.map(m=>{const g=parseFloat(m.cpu_pct)||0,k=parseFloat(m.mem_mb)||0,D=Math.max(2,Math.min(g,100)),T=g>80?"var(--red)":g>50?"var(--orange)":g>5?"var(--green)":"var(--fg2)",b=m.anomalies&&m.anomalies.length,$=m.zombie_risk&&m.zombie_risk!=="none";return r`<div key=${m.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${b?"border-left:2px solid var(--red);":""}${$?"border-left:2px solid var(--orange);":""}"
                  title=${m.cmdline||m.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${D}%;height:100%;background:${T};border-radius:2px"></div>
                    </div>
                    <span style="color:${T};min-width:3ch;text-align:right">${_e(g)}</span>
                  </div>
                  <div class="mono text-muted">${m.pid}</div>
                  <div>${ge(k*1048576)}</div>
                  ${b?r`<div class="text-red">\u26A0${m.anomalies.length}</div>`:null}
                </div>`})}
            </div>
          </div>`})}
      </div>`})}
  </div>`}function Cf({config:e}){if(!e)return null;const t=Object.entries(e.settings||{}),s=Object.entries(e.features||{}),n=(e.mcp_servers||[]).length>0,l=(e.extensions||[]).length>0,o=e.otel||{},a=e.hints||[];return!t.length&&!s.length&&!n&&!l&&!o.enabled&&!a.length&&e.model==null&&e.launch_at_startup==null?null:r`<div class="live-section">
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
        ${Object.entries(c).map(([d,f])=>r`<div key=${d} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${d}</span>
          <span style="color:${f===!0?"var(--green)":f===!1?"var(--red)":"var(--fg)"}">${typeof f=="object"?JSON.stringify(f):String(f)}</span>
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
  </div>`}function Mf({telemetry:e}){if(!e)return null;const t=e,s=(t.input_tokens||0)+(t.output_tokens||0),n=t.errors||[],l=t.quota_state||{};if(!s&&!t.active_session_input&&!n.length)return null;const[o,a]=W(!1);return r`<div class="live-section">
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
        <span class="msub">${F(t.total_sessions||0)} sessions \u00B7 ${F(t.total_messages||0)} messages</span>
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
  </div>`}function Ef({live:e}){if(!e)return null;const t=e.token_estimate||{},s=e.mcp||{},n=Jo(e);return r`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${e.session_count||0} sess</span>
      <span class="badge">${e.pid_count||0} pid</span>
      <span class="badge">${_e((e.confidence||0)*100)} conf</span>
      ${s.detected&&r`<span class="badge warn">${s.loops||0} MCP loop${(s.loops||0)===1?"":"s"}</span>`}
    </h3>
    <div class="metric-grid" aria-live="polite" aria-relevant="text" aria-atomic="false">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">\u2191 ${jt(e.outbound_rate_bps||0)}</span>
        <span class="msub">\u2193 ${jt(e.inbound_rate_bps||0)} total ${ge((e.outbound_bytes||0)+(e.inbound_bytes||0))}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Tokens</span>
        <span class="mvalue">${F(n)}</span>
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
  </div>`}function No({tool:e,root:t}){var S,j,A,M,R,y,C,P;const[s,n]=W(!1),{snap:l,history:o}=je(Ie),a=re(()=>((l==null?void 0:l.tool_configs)||[]).find(z=>z.tool===e.tool),[l,e.tool]),i=re(()=>{var z;return(z=o==null?void 0:o.by_tool)==null?void 0:z[e.tool]},[o,e.tool]),c=De[e.tool]||"var(--fg2)",d=mt[e.tool]||"🔹",f=e.files.reduce((z,E)=>z+E.tokens,0),p=e.processes.filter(z=>z.anomalies&&z.anomalies.length).length,m=Jo(e.live),g=(((S=e.live)==null?void 0:S.outbound_rate_bps)||0)+(((j=e.live)==null?void 0:j.inbound_rate_bps)||0),k=e.processes.reduce((z,E)=>z+(parseFloat(E.cpu_pct)||0),0),D=e.processes.reduce((z,E)=>z+(parseFloat(E.mem_mb)||0),0),T=re(()=>Math.max(...e.processes.map(z=>parseFloat(z.mem_mb)||0),100),[e.processes]),b=(((M=(A=e.token_breakdown)==null?void 0:A.telemetry)==null?void 0:M.errors)||[]).length,$=re(()=>{const z={};return e.files.forEach(E=>{const Y=E.kind||"other";(z[Y]=z[Y]||[]).push(E)}),Object.keys(z).sort((E,Y)=>{const G=li.indexOf(E),ne=li.indexOf(Y);return(G<0?99:G)-(ne<0?99:ne)}).map(E=>({kind:E,files:z[E]}))},[e.files]),x="tcard"+(s?" open":"")+(p||b?" has-anomaly":"");return r`<div class=${x}>
    <button class="tcard-head" onClick=${()=>n(!s)} aria-expanded=${s}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)">${d}</span>${K(e.label)}</h2>
      <span class="badge" data-dp="procs.tool.files">${e.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${F(f)} tok</span>
      ${e.processes.length>0&&r`<span class="badge" data-dp="procs.tool.process_count">${e.processes.length} proc ${_e(k)} ${ge(D*1048576)}</span>`}
      ${e.mcp_servers.length>0&&r`<span class="badge" data-dp="procs.tool.mcp_server_count">${e.mcp_servers.length} MCP</span>`}
      ${p>0&&r`<span class="badge warn" data-dp="procs.tool.anomaly">${p} anomaly</span>`}
      ${b>0&&r`<span class="badge" style="background:var(--red);color:var(--bg)">${b} error${b>1?"s":""}</span>`}
      ${e.live&&r`<span class="badge" style="background:var(--accent);color:var(--bg)">${e.live.session_count||0} live \u00B7 ${jt(g)}${m>0?" · "+F(m)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${$.map(({kind:z,files:E})=>r`<span class="text-muted" style="font-size:var(--fs-xs)">${z}:${E.length}</span>`)}
      </div>
      ${i&&i.ts.length>2&&!s&&r`<div role="img" aria-label=${"Sparkline charts for "+e.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${z=>z.stopPropagation()}>
        <${mo} label="CPU" data=${i.cpu} color=${c}/>
        <${mo} label="MEM" data=${i.mem_mb} color=${"var(--green)"}/>
        <${mo} label=${e.live?"Traffic":"Tokens"} data=${e.live?i.traffic:i.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${s&&r`<div class="tcard-body">
      ${((R=ni[e.tool])==null?void 0:R.length)>0&&r`<div class="tool-relationships">
        ${ni[e.tool].map(z=>r`<span key=${z.label} class="rel-badge rel-${z.type}"
          title=${z.label}>${z.label}</span>`)}
      </div>`}
      <${Cf} config=${a}/>
      <${Mf} telemetry=${(y=e.token_breakdown)==null?void 0:y.telemetry}/>
      <${Ef} live=${e.live}/>
      ${$.map(({kind:z,files:E})=>r`<${ef} key=${z} label=${z} files=${E} root=${t}/>`)}
      <${Tf} processes=${(P=(C=e.live)==null?void 0:C.processes)!=null&&P.length?e.live.processes:e.processes} maxMem=${T}/>
      ${e.mcp_servers.length>0&&r`<div class="proc-section"><h3>MCP Servers</h3>
        ${e.mcp_servers.map(z=>r`<div key=${z.name||z.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${K(z.name)}</span>
          <span class="fmeta">${K((z.config||{}).command||"")} ${((z.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function Df({groupKey:e,groupLabel:t,groupColor:s,tools:n,root:l}){const[o,a]=W(!0),i=n.reduce((d,f)=>d+f.files.length,0),c=n.reduce((d,f)=>d+f.files.reduce((p,m)=>p+m.tokens,0),0);return r`<div class="mb-md">
    <button onClick=${()=>a(!o)} aria-expanded=${o}
      class="flex-row gap-sm cursor-ptr" style="background:none;border:none;padding:var(--sp-3) 0;font:inherit;color:var(--fg);width:100%">
      <span style="font-size:var(--fs-xs);transition:transform 0.15s;${o?"transform:rotate(90deg)":""}">\u25B6</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${s};flex-shrink:0"></span>
      <span class="text-bolder" style="font-size:var(--fs-lg)">${t}</span>
      <span class="badge">${n.length} tools</span>
      <span class="badge">${i} files</span>
      <span class="badge">${F(c)} tok</span>
    </button>
    ${o&&r`<div class="tool-grid" style="margin-top:var(--sp-3)">
      ${n.map(d=>r`<${No} key=${d.tool} tool=${d} root=${l}/>`)}
    </div>`}
  </div>`}function Lf(){const{snap:e}=je(Ie),[t,s]=W("product"),n=c=>c.files.length||c.processes.length||c.mcp_servers.length||c.live,l=(c,d)=>{const f=c.files.length*2+c.processes.length+c.mcp_servers.length;return d.files.length*2+d.processes.length+d.mcp_servers.length-f||c.tool.localeCompare(d.tool)},o=re(()=>e?e.tools.filter(c=>!c.meta&&n(c)).sort(l):[],[e]),a=re(()=>e?e.tools.filter(c=>c.meta&&c.tool!=="project-env"&&n(c)).sort(l):[],[e]),i=re(()=>{if(t==="product"||!o.length)return null;const c={};return o.forEach(d=>{if(t==="vendor"){const f=d.vendor||"community",p=Fr[f]||f,m=Nd[f]||"var(--fg2)";c[f]||(c[f]={label:p,color:m,tools:[]}),c[f].tools.push(d)}else{const f=(d.host||"any").split(",");for(const p of f){const m=p.trim(),g=Id[m]||m,k="var(--fg2)";c[m]||(c[m]={label:g,color:k,tools:[]}),c[m].tools.push(d)}}}),Object.entries(c).sort((d,f)=>{const p=d[1].tools.reduce((g,k)=>g+k.files.length,0);return f[1].tools.reduce((g,k)=>g+k.files.length,0)-p})},[o,t]);return e?!o.length&&!a.length?r`<p class="empty-state">No AI tool resources found.</p>`:r`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${qd.map(c=>r`<button key=${c.id}
        class=${t===c.id?"range-btn active":"range-btn"}
        onClick=${()=>s(c.id)}>${c.label}</button>`)}
    </div>
    ${o.length>0&&(i?i.map(([c,d])=>r`<${Df} key=${c}
      groupKey=${c} groupLabel=${d.label} groupColor=${d.color}
      tools=${d.tools} root=${e.root}/>`):r`<div class="tool-grid">
        ${o.map(c=>r`<${No} key=${c.tool} tool=${c} root=${e.root}/>`)}
      </div>`)}
    ${a.length>0&&r`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)"><${ml} name="chevron-right" size="0.8em"/></span>
        <span>Project Context</span>
        <span class="badge">${a.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${a.map(c=>r`<${No} key=${c.tool} tool=${c} root=${e.root}/>`)}
      </div>
    </details>`}
  </div>`:r`<p class="loading-state">Loading...</p>`}function Af({perCore:e}){if(!e||!e.length)return null;const t=100;return r`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((s,n)=>{const l=Math.max(1,s/t*100),o=s>80?"var(--red)":s>50?"var(--orange)":s>20?"var(--green)":"var(--fg2)";return r`<div key=${n} title=${"Core "+n+": "+_e(s)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+l+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function Of({mem:e}){var x;const[t,s]=W(!1),[n,l]=W(!1),[o,a]=W(null),[i,c]=W(null),[d,f]=W(!1),p=je(Ie),m=(e.file||"").replace(/\\/g,"/").split("/").pop(),g=be(async()=>{if(t){s(!1);return}if(s(!0),ul.has(e.file)){a(ul.get(e.file));return}f(!0),c(null);try{const S=await Zo(e.file);a(S)}catch(S){c(S.message)}finally{f(!1)}},[t,e.file]),k=(S,j)=>S.map((A,M)=>r`<span class="pline"><span class="ln">${j+M}</span>${K(A)||" "}</span>`),D=()=>{if(d)return r`<span class="loading-state">Loading...</span>`;if(i)return r`<span class="error-state">${i}</span>`;if(!o)return null;const S=o.split(`
`),j=S.length;if(j<=on*3||n)return r`${k(S,1)}
        <div class="prev-actions">
          ${n&&r`<button class="prev-btn" onClick=${()=>l(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
        </div>`;const A=S.slice(-on),M=j-on+1;return r`${k(A,M)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>l(!0)}>show all (${j} lines)</button>
        <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
      </div>`},T=e.mtime&&Date.now()/1e3-e.mtime<300,b=(x=p.recentFiles)==null?void 0:x.get(e.file),$=!!b;return r`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${g}
      aria-expanded=${t} title=${e.file}>
      ${$?r`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Bt(b.ts)}">●</span>`:T?r`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Bt(e.mtime)}">●</span>`:r`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${K(m)}</span>
      <span class="fmeta">${ge(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${T||$?r` <span style="color:${$?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${Bt($?b.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${t&&r`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${D()}</div>`}
  </div>`}function Pf({profile:e,items:t}){const[s,n]=W(t.length<=5),l=t.reduce((o,a)=>o+a.tokens,0);return r`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${K(e)}</span>
      <span class="badge">${t.length} files</span>
      <span class="badge">${F(l)} tok</span>
    </button>
    ${s&&r`<div>${t.map(o=>r`<${Of} key=${o.file} mem=${o}/>`)}</div>`}
  </div>`}function zf({source:e,entries:t}){const[s,n]=W(!1),l=re(()=>{const o={};return t.forEach(a=>{(o[a.profile]=o[a.profile]||[]).push(a)}),Object.entries(o)},[t]);return r`<div class="mem-group">
    <button class=${"mem-group-head"+(s?" open":"")} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      ${K(Hd[e]||e)} <span class="badge">${t.length}</span>
      <span class="badge">${F(t.reduce((o,a)=>o+a.tokens,0))} tok</span>
    </button>
    ${s&&r`<div>${l.map(([o,a])=>r`<${Pf} key=${o} profile=${o} items=${a}/>`)}</div>`}
  </div>`}function Ff(){const[e,t]=W(null);if(ae(()=>{Ln().then(n=>{n&&n.ts&&n.ts.length>=2&&t(n)}).catch(()=>{})},[]),!e)return null;const s=e.memory_entries&&e.memory_entries.some(n=>n>0);return r`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${ts} label="Memory Tokens" value=${F(e.mem_tokens[e.mem_tokens.length-1]||0)}
        data=${[e.ts,e.mem_tokens]} chartColor="var(--accent)" smooth />
      ${s&&r`<${ts} label="Memory Entries" value=${e.memory_entries[e.memory_entries.length-1]||0}
        data=${[e.ts,e.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function Rf(){const{snap:e}=je(Ie);if(!e||!e.agent_memory.length)return r`<p class="empty-state">No agent memory found.</p>`;const t=re(()=>{const s={};return e.agent_memory.forEach(n=>{(s[n.source]=s[n.source]||[]).push(n)}),Object.entries(s)},[e.agent_memory]);return r`<${Ff}/>
    ${t.map(([s,n])=>r`<${zf} key=${s} source=${s} entries=${n}/>`)}`}function Nf(){var n,l,o,a;const{snap:e}=je(Ie);if(!e)return r`<p class="empty-state">Loading...</p>`;const t=e.tools.filter(i=>i.live).sort((i,c)=>{var d,f,p,m;return(((d=c.live)==null?void 0:d.outbound_rate_bps)||0)+(((f=c.live)==null?void 0:f.inbound_rate_bps)||0)-((((p=i.live)==null?void 0:p.outbound_rate_bps)||0)+(((m=i.live)==null?void 0:m.inbound_rate_bps)||0))}),s=Object.entries(e.live_monitor&&e.live_monitor.diagnostics||{});return r`<div class="live-stack">
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
        <tbody>${t.map(i=>{const c=i.live||{},d=c.token_estimate||{},f=c.mcp||{};return r`<tr key=${i.tool}>
            <td>${K(i.label)}</td>
            <td>${c.session_count||0} sess / ${c.pid_count||0} pid</td>
            <td>\u2191 ${jt(c.outbound_rate_bps||0)}<br/>\u2193 ${jt(c.inbound_rate_bps||0)}</td>
            <td>${F(Jo(c))}<br/><span class="text-muted">${K(d.source||"network-inference")} @ ${_e((d.confidence||0)*100)}</span></td>
            <td>${f.detected?"YES":"NO"}<br/><span class="text-muted">${f.loops||0} loops @ ${_e((f.confidence||0)*100)}</span></td>
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
        ${(((l=e.live_monitor)==null?void 0:l.state_paths)||[]).map(i=>r`<span class="pill mono" key=${"state-"+i}>state: ${i}</span>`)}
        ${!(((o=e.live_monitor)==null?void 0:o.workspace_paths)||[]).length&&!(((a=e.live_monitor)==null?void 0:a.state_paths)||[]).length&&r`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`}function If(){var D,T,b,$;const{snap:e,globalRange:t}=je(Ie),[s,n]=W(null),[l,o]=W([]),[a,i]=W(null),c=re(()=>e?e.tools.filter(x=>!x.meta&&(x.files.length||x.processes.length||x.live)).sort((x,S)=>x.label.localeCompare(S.label)):[],[e]);if(ae(()=>{!s&&c.length&&n(c[0].tool)},[c,s]),ae(()=>{!s||!t||Yo({tool:s,since:t.since,limit:500,until:t.until}).then(o).catch(()=>o([]))},[s,t]),ae(()=>{!s||!t||Ln({since:t.since,tool:s,until:t.until}).then(x=>{var S;return i(((S=x==null?void 0:x.by_tool)==null?void 0:S[s])||null)}).catch(()=>i(null))},[s,t]),!e)return r`<p class="loading-state">Loading...</p>`;const d=c.find(x=>x.tool===s),f=(D=e.tool_telemetry)==null?void 0:D.find(x=>x.tool===s),p=d==null?void 0:d.live,m=De[s]||"var(--fg2)",g={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},k=t.until!=null?new Date(t.since*1e3).toLocaleString(void 0,g)+" – "+new Date(t.until*1e3).toLocaleString(void 0,g):"";return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${c.map(x=>r`<button key=${x.tool}
        class=${s===x.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>n(x.tool)}>
        <span style="color:${De[x.tool]||"var(--fg2)"}">${mt[x.tool]||"🔹"}</span>
        ${x.label}
        ${x.live?r`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${s&&r`<Fragment>
        <h3 class="flex-row mb-sm gap-sm">
          <span style="color:${m}">${mt[s]||"🔹"}</span>
          ${(d==null?void 0:d.label)||s}
          ${d!=null&&d.vendor?r`<span class="badge">${Fr[d.vendor]||d.vendor}</span>`:""}
          ${f!=null&&f.model?r`<span class="badge mono">${f.model}</span>`:""}
        </h3>

        ${a&&((T=a.ts)==null?void 0:T.length)>=2?r`<div class="es-section">
          <div class="es-section-title">Time Series${k?r` <span class="badge">${k}</span>`:""}</div>
          <div class="es-charts">
            <${ts} label="CPU %" value=${((b=d==null?void 0:d.live)==null?void 0:b.cpu_percent)!=null?_e(d.live.cpu_percent||0):"-"}
              data=${[a.ts,a.cpu]} chartColor=${m} smooth />
            <${ts} label="Memory (MB)" value=${(($=d==null?void 0:d.live)==null?void 0:$.mem_mb)!=null?ge((d.live.mem_mb||0)*1048576):"-"}
              data=${[a.ts,a.mem_mb]} chartColor="var(--green)" smooth />
            <${ts} label="Context (tok)" value=${Ge(a.tokens[a.tokens.length-1]||0)}
              data=${[a.ts,a.tokens]} chartColor="var(--accent)" />
            <${ts} label="Network (B/s)"
              value=${jt(p?(p.outbound_rate_bps||0)+(p.inbound_rate_bps||0):a.traffic[a.traffic.length-1]||0)}
              valColor=${p?"var(--orange)":void 0}
              data=${[a.ts,a.traffic]} chartColor="var(--orange)" />
          </div>
        </div>`:r`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="loading-state">No data for this range.</p>
        </div>`}

        ${f?r`<div class="es-section">
          <div class="es-section-title">Telemetry
            <span class="badge" style="margin-left:var(--sp-3)">${f.source}</span>
            <span class="badge">${_e(f.confidence*100)}</span>
          </div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${Ge(f.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${Ge(f.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${Ge(f.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${Ge(f.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${F(f.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${F(f.total_messages||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cost</div><div class="value">${f.cost_usd?"$"+f.cost_usd.toFixed(2):"-"}</div></div>
          </div>
          ${Object.keys(f.by_model||{}).length>0&&r`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(f.by_model).map(([x,S])=>r`<div key=${x}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${x}</span>
              <span>in: ${Ge(S.input||S.input_tokens||0)} tok \u00B7 out: ${Ge(S.output||S.output_tokens||0)} tok${S.cache_read_tokens?" · cR:"+Ge(S.cache_read_tokens):""}${S.cache_creation_tokens?" · cW:"+Ge(S.cache_creation_tokens):""}${S.cost_usd?" · $"+S.cost_usd.toFixed(2):""}</span>
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
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${jt(p.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${jt(p.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">Events (${l.length})</div>
          ${l.length?r`<div class="es-feed">
            ${l.map((x,S)=>{const j=Wd[x.kind]||"var(--fg2)",A=new Date(x.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),M=x.detail?Object.entries(x.detail).map(([R,y])=>R+"="+y).join(", "):"";return r`<div key=${x.ts+"-"+x.tool+"-"+S} class="es-event">
                <span class="es-event-time">${A}</span>
                <span class="es-event-kind" style="color:${j}">${x.kind}</span>
                <span class="es-event-detail" title=${M}>${M||"-"}</span>
              </div>`})}
          </div>`:r`<p class="empty-state">No events for this tool in the selected range.</p>`}
        </div>
      </Fragment>`}
    </div>
  </div>`}const Xs=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"],Zi={"claude-opus-4-6":1e6,"claude-opus-4-5":1e6,"claude-sonnet-4-6":1e6,"claude-sonnet-4-5":1e6,"claude-sonnet-4":2e5,"claude-haiku-4-5":2e5,"claude-3-5-sonnet":2e5,"gpt-4.1":1e6,"gpt-4.1-mini":1e6,"gpt-4o":128e3,"gpt-4o-mini":128e3,o3:2e5,"o4-mini":2e5,"gemini-2.5-pro":1e6,"gemini-2.5-flash":1e6};function Qi({always:e,onDemand:t,conditional:s,never:n,total:l}){if(!l)return null;const o=a=>(a/l*100).toFixed(1)+"%";return r`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${e>0&&r`<div style="width:${o(e)};height:100%;background:var(--green)" title="Always loaded: ${F(e)}"></div>`}
    ${t>0&&r`<div style="width:${o(t)};height:100%;background:var(--yellow)" title="On-demand: ${F(t)}"></div>`}
    ${s>0&&r`<div style="width:${o(s)};height:100%;background:var(--orange)" title="Conditional: ${F(s)}"></div>`}
    ${n>0&&r`<div style="width:${o(n)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${F(n)}"></div>`}
  </div>`}function jf(){const{snap:e,history:t,enabledTools:s}=je(Ie),[n,l]=W(null),[o,a]=W(!1);if(ae(()=>{l(null),a(!1),Dd().then(l).catch(()=>a(!0))},[]),o)return r`<p class="error-state">Failed to load budget.</p>`;if(!n)return r`<p class="loading-state">Loading...</p>`;const i=y=>s===null||s.includes(y),c=re(()=>{const y=(e==null?void 0:e.tool_configs)||[];for(const C of["claude-code","copilot","copilot-vscode"]){const P=y.find(z=>z.tool===C&&z.model);if(P)return P.model}for(const C of y)if(C.model&&Zi[C.model])return C.model;return""},[e]),d=Zi[c]||2e5,f=n.always_loaded_tokens||0,p=n.total_potential_tokens||0,m=f/d*100,g=p/d*100,k=re(()=>{if(!e)return{};const y={};return e.tools.forEach(C=>{C.tool==="aictl"||!C.token_breakdown||!C.token_breakdown.total||(y[C.tool]=C.token_breakdown)}),y},[e]),D=re(()=>e!=null&&e.tool_telemetry?e.tool_telemetry.filter(y=>i(y.tool)):[],[e,s]),T=re(()=>{if(!e)return[];const y={};return e.tools.forEach(C=>{C.tool==="aictl"||!i(C.tool)||(C.files||[]).forEach(P=>{const z=P.kind||"other";y[z]||(y[z]={kind:z,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),y[z].count++,y[z].tokens+=P.tokens,y[z].size+=P.size;const E=(P.sent_to_llm||"").toLowerCase();E==="yes"?y[z].always+=P.tokens:E==="on-demand"?y[z].onDemand+=P.tokens:E==="conditional"||E==="partial"?y[z].conditional+=P.tokens:y[z].never+=P.tokens})}),Object.values(y).sort((C,P)=>P.tokens-C.tokens)},[e,s]),b=re(()=>{if(!(e!=null&&e.tool_telemetry))return null;const y={},C={};e.tool_telemetry.filter(O=>i(O.tool)).forEach(O=>{(O.daily||[]).forEach(B=>{if(B.date&&(y[B.date]||(y[B.date]={}),C[B.date]||(C[B.date]={}),B.tokens_by_model&&Object.entries(B.tokens_by_model).forEach(([U,I])=>{y[B.date][U]=(y[B.date][U]||0)+I}),B.model)){const U=B.model,I=(B.input_tokens||0)+(B.output_tokens||0);y[B.date][U]=(y[B.date][U]||0)+I,C[B.date][U]||(C[B.date][U]={input:0,output:0,cache_read:0,cache_creation:0}),C[B.date][U].input+=B.input_tokens||0,C[B.date][U].output+=B.output_tokens||0,C[B.date][U].cache_read+=B.cache_read_tokens||0,C[B.date][U].cache_creation+=B.cache_creation_tokens||0}})});const P=new Date,z=[];for(let O=6;O>=0;O--){const B=new Date(P);B.setDate(B.getDate()-O),z.push(B.toISOString().slice(0,10))}const E=z.filter(O=>y[O]&&Object.values(y[O]).some(B=>B>0));if(!E.length)return null;const Y=[...new Set(E.flatMap(O=>Object.keys(y[O]||{})))],G=Math.max(...E.map(O=>Y.reduce((B,U)=>B+((y[O]||{})[U]||0),0)),1),ne=E.some(O=>Object.keys(C[O]||{}).length>0);return{dates:E,models:Y,byDate:y,byDateModel:C,maxTotal:G,hasDetail:ne}},[e,s]),$=t&&t.ts&&t.ts.length>=2?[t.ts,t.live_tokens||t.ts.map(()=>0)]:null,x=D.reduce((y,C)=>y+(C.input_tokens||0),0),S=D.reduce((y,C)=>y+(C.output_tokens||0),0),j=D.reduce((y,C)=>y+(C.cache_read_tokens||0),0),A=D.reduce((y,C)=>y+(C.cache_creation_tokens||0),0),M=D.reduce((y,C)=>y+(C.total_sessions||0),0),R=D.reduce((y,C)=>y+(C.cost_usd||0),0);return r`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${$?r`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${Tc} data=${$} color="var(--green)" height=${60}/>
        <div class="text-muted" style="font-size:var(--fs-base);margin-top:var(--sp-2)">
          Current: ${F((e==null?void 0:e.total_live_estimated_tokens)||0)} estimated tokens
        </div>
      </div>`:r`<div></div>`}
      <div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Context Window${c?r` <span class="badge">${c}</span>`:""}</h3>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Always loaded: ${F(f)} of ${F(d)}</span>
            <span class="text-bolder" style="color:${m>80?"var(--orange)":m>50?"var(--yellow)":"var(--green)"}">${_e(m)}</span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:4px;background:var(--border)">
            <div style="height:100%;width:${Math.min(m,100).toFixed(1)}%;background:var(--green);border-radius:4px"></div>
          </div>
        </div>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Max potential: ${F(p)}</span>
            <span class="text-bolder" style="color:${g>100?"var(--red)":"var(--fg2)"}">${_e(g)}${g>100?" ⚠":""}</span>
          </div>
          <div class="overflow-hidden" style="height:6px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${Math.min(g,100).toFixed(1)}%;background:${g>100?"var(--red)":"var(--fg2)"};opacity:0.5;border-radius:3px"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-1);font-size:var(--fs-sm)">
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:4px"></span>Always: ${F(n.always_loaded_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--yellow);margin-right:4px"></span>On-demand: ${F(n.on_demand_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--orange);margin-right:4px"></span>Conditional: ${F(n.conditional_tokens||0)}</span>
          <span class="text-muted">Cacheable: ${F(n.cacheable_tokens||0)}</span>
        </div>
        ${(n.project_count||0)>1?r`<div class="text-muted" style="font-size:var(--fs-xs);margin-top:var(--sp-2);border-top:1px solid var(--border);padding-top:var(--sp-1)">
          Estimate for largest project (${n.largest_project||"?"}): ${F(n.largest_project_tokens||0)} + ${F(n.global_tokens||0)} global.
          ${(n.raw_total_all_projects||0)>(n.total_potential_tokens||0)?r` Raw total across all ${n.project_count} projects: ${F(n.raw_total_all_projects)}.`:null}
        </div>`:null}
      </div>
    </div>

    <!-- Daily token usage -->
    ${b&&r`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">Daily Token Usage (last 7 days)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-6);font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        ${b.models.map((y,C)=>r`<span key=${y}>
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${Xs[C%Xs.length]};margin-right:3px"></span>${y}
        </span>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
        ${b.dates.map(y=>{const C=b.models.reduce((z,E)=>z+((b.byDate[y]||{})[E]||0),0),P=new Date(y+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return r`<div key=${y} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${P}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${y}: ${F(C)} tokens">
              ${b.models.map((z,E)=>{const Y=(b.byDate[y]||{})[z]||0;return Y?r`<div key=${z} style="width:${(Y/b.maxTotal*100).toFixed(1)}%;height:100%;background:${Xs[E%Xs.length]}" title="${z}: ${F(Y)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${F(C)}</span>
          </div>`})}
      </div>
      ${b.hasDetail&&r`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${b.dates.flatMap(y=>{const C=new Date(y+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),P=b.byDateModel[y]||{},z=Object.keys(P).sort();return z.length?z.map((E,Y)=>{const G=P[E];return r`<tr key=${y+"-"+E}>
                <td>${Y===0?C:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${Xs[b.models.indexOf(E)%Xs.length]};margin-right:3px"></span>${E}</td>
                <td>${F(G.input)}</td><td>${F(G.output)}</td>
                <td class="text-muted">${F(G.cache_read)}</td>
                <td class="text-muted">${F(G.cache_creation)}</td>
                <td class="text-bold">${F(G.input+G.output)}</td>
              </tr>`}):[]})}</tbody>
        </table>
      </details>`}
    </div>`}

    <!-- Verified token usage (main table) -->
    ${D.length>0&&r`<div class="budget-card mb-md">
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
          <tbody>${D.map(y=>{const C=k[y.tool];return r`<tr key=${y.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(De[y.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${K(y.tool)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${y.source}</span> <span class="text-muted">${_e(y.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${F(y.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${F(y.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${F(y.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${F(y.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${F(y.total_sessions||0)}</td>
              <td style="text-align:right">${y.cost_usd>0?"$"+y.cost_usd.toFixed(2):"—"}</td>
              <td>${C?r`<${Qi} always=${C.always_loaded||0} onDemand=${C.on_demand||0}
                conditional=${C.conditional||0} never=${C.never_sent||0} total=${C.total||1}/>`:null}</td>
            </tr>`})}
          ${D.length>1&&r`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${F(x)}</td>
            <td style="text-align:right">${F(S)}</td>
            <td style="text-align:right" class="text-muted">${F(j)}</td>
            <td style="text-align:right" class="text-muted">${F(A)}</td>
            <td style="text-align:right">${F(M)}</td>
            <td style="text-align:right">${R>0?"$"+R.toFixed(2):"—"}</td>
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
          <tbody>${T.map(y=>r`<tr key=${y.kind}>
            <td>${K(y.kind)}</td>
            <td style="text-align:right">${y.count}</td>
            <td style="text-align:right" class="text-bold">${F(y.tokens)}</td>
            <td style="text-align:right">${ge(y.size)}</td>
            <td><${Qi} always=${y.always} onDemand=${y.onDemand} conditional=${y.conditional} never=${y.never} total=${y.tokens||1}/></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>`}
  </div>`}function Bf(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const Qn={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function Xi({agent:e,tasks:t,now:s}){const n=Qn[e.state]||Qn.active,l=e.ended_at?e.ended_at-e.started_at:s-e.started_at,o=t.filter(a=>a.agent_id===e.agent_id);return r`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${n.bg};color:var(--bg)">${n.label}</span>
      <strong class="text-sm">${K(e.agent_id)}</strong>
      <span class="text-muted text-xs">${Bf(l)}</span>
      ${e.task&&r`<span class="text-xs mono text-muted">\u2014 ${K(e.task)}</span>`}
    </div>
    ${o.length>0&&r`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${o.map(a=>{const i=Qn[a.state]||Qn.pending;return r`<div key=${a.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${i.bg};color:var(--bg);font-size:0.6rem;padding:1px 4px">${i.label}</span>
          <span class="mono">${K(a.name||a.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function Hf({entityState:e}){if(!e||!e.agents||!e.agents.length)return null;const t=e.agents,s=e.tasks||[],n=Date.now()/1e3,l=t.filter(a=>a.state==="active"),o=t.filter(a=>a.state!=="active");return r`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${t.length} agent${t.length>1?"s":""}</span>
      ${l.length>0&&r`<span class="badge text-xs" style="background:var(--green);color:var(--bg)">${l.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${l.map(a=>r`<${Xi} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
      ${o.map(a=>r`<${Xi} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
    </div>
  </div>`}function Wf({tasks:e}){if(!e||!e.length)return null;const t=e.filter(o=>o.state==="pending"),s=e.filter(o=>o.state==="active"),n=e.filter(o=>o.state==="done");function l({title:o,items:a,color:i}){return r`<div class="tt-column">
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
  </div>`}function Jt({title:e,icon:t,badge:s,defaultOpen:n,children:l}){const[o,a]=W(n||!1);return r`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>a(i=>!i)}
      aria-expanded=${o}>
      <span class="sd-panel-icon">${t}</span>
      <span class="sd-panel-title">${e}</span>
      ${s!=null&&r`<span class="badge text-xs" style="margin-left:var(--sp-2)">${s}</span>`}
      <span class="sd-panel-arrow">${o?"▲":"▼"}</span>
    </button>
    ${o&&r`<div class="sd-panel-body">${l}</div>`}
  </div>`}const qf={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)"};function Vf({sessionId:e}){const[t,s]=W([]),[n,l]=W(!0);return ae(()=>{if(!e)return;l(!0);const o=Math.floor(Date.now()/1e3)-86400;Yo({sessionId:e,limit:200,since:o}).then(a=>{s(a.reverse()),l(!1)}).catch(()=>l(!1))},[e]),n?r`<p class="loading-state">Loading events...</p>`:t.length?r`<div class="sd-events">
    ${t.map((o,a)=>{const i=qf[o.kind]||"var(--fg3)",c=o.detail||{},d=c.path||c.name||c.tool_name||o.kind;return r`<div key=${a} class="sd-event-row">
        <span class="sd-event-time">${Bt(o.ts)}</span>
        <span class="sd-event-dot" style="background:${i}"></span>
        <span class="sd-event-kind">${o.kind}</span>
        <span class="sd-event-desc mono text-muted">${K(String(d))}</span>
      </div>`})}
  </div>`:r`<p class="empty-state">No events recorded for this session.</p>`}function ol(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const Uf={"claude-opus-4-6":1e6,"claude-sonnet-4.6":1e6,"claude-sonnet-4":2e5,"claude-haiku-4.5":2e5,"gpt-5.4":2e5,"gpt-5":128e3},er=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],Gf=95;function Yf({session:e}){const{snap:t}=je(Ie),s=e.files_loaded||[],n=((t==null?void 0:t.tool_configs)||[]).map(g=>g.model).filter(Boolean)[0]||"",l=Uf[n]||2e5,a=(t&&t.agent_memory||[]).reduce((g,k)=>g+(k.tokens||0),0),i=s.length*150,d=er.reduce((g,k)=>g+k.tokens,0)+a+i,f=Math.min(d/l*100,100),p=Gf,m=[...er,{name:"Memory",tokens:a,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:i,color:"var(--green)"}].filter(g=>g.tokens>0);return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${F(d)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${F(l)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${f>80?"var(--orange)":f>50?"var(--yellow)":"var(--green)"}">${_e(f)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${m.map(g=>{const k=(g.tokens/l*100).toFixed(1);return r`<div key=${g.name} style="width:${k}%;background:${g.color};min-width:${g.tokens>0?"1px":"0"}"
              title="${g.name}: ~${F(g.tokens)} tokens"></div>`})}
        </div>
        <div style="position:absolute;left:${p}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${p}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${m.map(g=>r`<span key=${g.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${g.color};margin-right:2px"></span>
          ${g.name} ${F(g.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${p}%</span>
      </div>
    </div>

    ${s.length>0&&r`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${s.map(g=>r`<div key=${g} class="text-muted" style="padding:2px 0">${K(g)}</div>`)}
    </div>`}
    ${!s.length&&r`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function Kf({mem:e}){const[t,s]=W(!1),n=e.name||(e.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",l=(e.content||"").slice(0,300);return r`<div class="sd-memory-entry" style="cursor:pointer" onClick=${()=>s(!t)}>
    <div class="flex-row gap-sm" style="align-items:center">
      <span class="badge text-xs">${e.type||e.source||"file"}</span>
      <strong title=${e.file||e.path||""}>${K(n)}</strong>
      ${e.tokens?r`<span class="text-muted">${F(e.tokens)} tok</span>`:null}
      ${e.lines?r`<span class="text-muted">${e.lines}ln</span>`:null}
      ${e.profile?r`<span class="text-muted">${K(e.profile)}</span>`:null}
      <span class="text-muted" style="margin-left:auto;font-size:var(--fs-2xs)">${t?"▲":"▼"}</span>
    </div>
    ${t&&l?r`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${K(e.content)}${e.content&&e.content.length>300,""}</pre>`:null}
  </div>`}function Jf({session:e}){const{snap:t}=je(Ie),s=t&&t.agent_memory||[],n=e.project||"",l=n?s.filter(o=>{const a=o.project||o.tool||"";return!n||a.includes(n.replace(/\\/g,"/").split("/").pop())}):s;return l.length?r`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${l.map((o,a)=>r`<${Kf} key=${a} mem=${o}/>`)}
  </div>`:r`<p class="empty-state">No memory entries found${n?" for this project":""}.</p>`}function Zf({rateLimits:e}){return!e||!Object.keys(e).length?null:r`<div style="margin-top:var(--sp-3)">
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
  </div>`}function Qf({session:e}){const t=e.exact_input_tokens||0,s=e.exact_output_tokens||0,[n,l]=W(null);ae(()=>{e.tool&&Pr({tool:e.tool,active:!1,limit:20}).then(i=>{if(i.length>1){const c=i.filter(f=>f.duration_s>0).map(f=>f.duration_s),d=c.length?c.reduce((f,p)=>f+p,0)/c.length:0;l({avgDuration:d,sampleCount:i.length})}}).catch(()=>{})},[e.tool]);const o=e.duration_s||0,a=n&&n.avgDuration>0?o/n.avgDuration:null;return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${F(t)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${F(s)}</div></div>
      <div class="es-kv-card"><div class="label">Total Tokens</div><div class="value">${F(t+s)}</div></div>
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
    ${e.entity_state&&r`<${Zf} rateLimits=${e.entity_state.rate_limits}/>`}
  </div>`}function Xf({session:e}){const t=e.files_touched||[],s=e.file_events||0;return t.length?r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${t.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${F(s)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${t.map(n=>r`<div key=${n} class="text-muted" style="padding:2px 0">${K(n)}</div>`)}
    </div>
  </div>`:r`<p class="empty-state">No file changes recorded.</p>`}function ev({sessionId:e}){const[t,s]=W(null),[n,l]=W(!0);if(ae(()=>{l(!0);const i=Math.floor(Date.now()/1e3)-3600;Ed(i,100).then(c=>{s(c),l(!1)}).catch(()=>l(!1))},[e]),n)return r`<p class="loading-state">Loading API call data...</p>`;if(!t||!t.calls||!t.calls.length)return r`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;const{calls:o,summary:a}=t;return r`<div>
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
      ${o.slice(0,30).map((i,c)=>{const d=i.status==="error",f=new Date(i.ts*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});return r`<div key=${c} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${f}</span>
          <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${d?"var(--red)":"var(--green)"}"></span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${i.model||"—"}</span>
          ${!d&&r`<span style="width:50px;flex-shrink:0;text-align:right">${i.duration_ms||0}ms</span>`}
          ${!d&&r`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${F(i.input_tokens||0)}in</span>`}
          ${d&&r`<span style="color:var(--red)">${K(i.error||"error")}</span>`}
        </div>`})}
    </div>
  </div>`}function tv({project:e}){const[t,s]=W(null);return ae(()=>{e&&Md(7).then(n=>{const l=n.find(o=>o.project===e);s(l||null)}).catch(()=>{})},[e]),t?r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${t.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${F(t.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${F(t.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value">$${t.cost_usd.toFixed(2)}</div></div>
    </div>
    ${t.daily&&t.daily.length>0&&r`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${t.daily.map(n=>{const l=n.input_tokens+n.output_tokens,o=Math.max(...t.daily.map(c=>c.input_tokens+c.output_tokens),1),a=(l/o*100).toFixed(1),i=new Date(n.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return r`<div key=${n.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${i}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${a}%;background:var(--green);border-radius:3px"
              title="${F(l)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${F(l)}</span>
        </div>`})}
    </div>`}
  </div>`:r`<p class="empty-state">No cost data available for this project.</p>`}function sv({project:e,tool:t}){const[s,n]=W(null);if(ae(()=>{!e||!t||wd(e,t,30,20).then(n).catch(()=>n([]))},[e,t]),!s||s.length<2)return r`<p class="empty-state">Not enough session history for trend analysis.</p>`;const l=Math.max(...s.map(i=>i.total_tokens),1),o=s.reduce((i,c)=>i+c.duration_s,0)/s.length,a=s.reduce((i,c)=>i+c.total_tokens,0)/s.length;return r`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${ol(o)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${F(a)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${s.map(i=>{const c=(i.total_tokens/l*100).toFixed(1),d=new Date(i.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),f=o>0?i.duration_s/o:1;return r`<div key=${i.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${d}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${c}%;border-radius:3px;background:${f>1.5?"var(--orange)":f<.7?"var(--green)":"var(--accent)"}" title="${F(i.total_tokens)} tok, ${ol(i.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${F(i.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${ol(i.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function nv({session:e,onClose:t}){const s=De[e.tool]||"var(--fg2)",n=e.files_loaded||[],l=e.files_touched||[],o=e.exact_input_tokens||0,a=e.exact_output_tokens||0,i=e.entity_state||null,c=i&&i.agents&&i.agents.length>0,d=i&&i.tasks&&i.tasks.length>0;return r`<div class="sd-container" style="border-left:3px solid ${s}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${K(e.tool)}</strong>
        ${e.project&&r`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${e.project}>${K(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">
          ${ol(e.duration_s)}
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

    <${Jt} title="Actions" icon="\u26A1" badge=${null} defaultOpen=${!0}>
      <${Vf} sessionId=${e.session_id}/>
    <//>
    ${c&&r`<${Jt} title="Team" icon="\uD83D\uDC65" badge=${i.agents.length+" agents"} defaultOpen=${!0}>
      <${Hf} entityState=${i}/>
    <//>`}
    ${d&&r`<${Jt} title="Tasks" icon="\uD83D\uDCCB" badge=${i.tasks.length} defaultOpen=${!0}>
      <${Wf} tasks=${i.tasks}/>
    <//>`}
    <${Jt} title="Context" icon="\uD83D\uDCDA" badge=${n.length||null}>
      <${Yf} session=${e}/>
    <//>
    <${Jt} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${!1}>
      <${Jf} session=${e}/>
    <//>
    <${Jt} title="Resources" icon="\u2699\uFE0F" badge=${F(o+a)+" tok"}>
      <${Qf} session=${e}/>
    <//>
    <${Jt} title="Deliverables" icon="\uD83D\uDCE6" badge=${l.length||null}>
      <${Xf} session=${e}/>
    <//>
    <${Jt} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${!1}>
      <${ev} sessionId=${e.session_id}/>
    <//>
    ${e.project&&r`<${Jt} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${!1}>
      <${tv} project=${e.project}/>
    <//>`}
    ${e.project&&e.tool&&r`<${Jt} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${!1}>
      <${sv} project=${e.project} tool=${e.tool}/>
    <//>`}
  </div>`}function lv(e,t,s){const n=t-e,l=[300,600,900,1800,3600,7200,10800,21600,43200,86400];let o=l[l.length-1];for(const c of l)if(n/c<=s){o=c;break}const a=Math.ceil(e/o)*o,i=[];for(let c=a;c<=t;c+=o){const d=new Date(c*1e3);let f;o>=86400?f=d.toLocaleDateString([],{month:"short",day:"numeric"}):n>86400?f=d.toLocaleString([],{hourCycle:"h23",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):f=d.toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),i.push({ts:c,label:f})}return i}function ov(e){return e>=3600?(e/3600).toFixed(1)+"h":e>=60?Math.round(e/60)+"m":Math.round(e)+"s"}function tr(e,t,s,n){const l=e.duration_s||(e.ended_at||n)-e.started_at,o=new Date(e.started_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),a=e.ended_at?new Date(e.ended_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):"now",i=[ov(l)];e.conversations&&i.push(e.conversations+" conv"),e.subagents&&i.push(e.subagents+" agents"),e.source_files?i.push(e.source_files+" src files"):e.unique_files&&i.push(e.unique_files+" files"),e.bytes_written>1024&&i.push(ge(e.bytes_written));const c=!e.ended_at;return r`<div class="stl-tip">
    <div class="stl-tip-head">
      <span style=${"color:"+t}>${s}</span>
      <strong>${e.tool}</strong>
      ${c?r`<span class="badge" style="font-size:9px;background:var(--green);color:#000">live</span>`:""}
    </div>
    <div class="stl-tip-time">${o} – ${a}</div>
    <div class="stl-tip-stats">${i.join(" · ")}</div>
    ${e.project?r`<div class="stl-tip-proj">${e.project.replace(/\\/g,"/").split("/").pop()}</div>`:""}
  </div>`}function av({sessions:e,rangeSeconds:t,onSelect:s}){const n=Date.now()/1e3,l=t||86400,o=n-l,a=(e||[]).filter(M=>(M.ended_at||n)>=o&&M.started_at<=n),i=a.filter(M=>M.ended_at).sort((M,R)=>M.started_at-R.started_at),c=a.filter(M=>!M.ended_at).sort((M,R)=>M.started_at-R.started_at),d=[],f=[];for(const M of i){const R=Math.max(M.started_at,o),y=M.ended_at;let C=-1;for(let P=0;P<d.length;P++)if(R>=d[P]+2){d[P]=y,C=P;break}C<0&&(C=d.length,d.push(y)),f.push(C)}const p=10,m=2,g=18,k=14,D=Math.max(d.length,0),T=D>0?D*(p+m)+m:0,b=c.length>0?k+m*2:0,$=T>0&&b>0?1:0,x=T+$+b,S=Math.max(x,20)+g,j=lv(o,n,8),A=M=>(Math.max(M,o)-o)/l*100;return r`<div class="stl">
    <div class="stl-chart" style=${"height:"+S+"px"}>
      ${j.map(M=>r`<div key=${M.ts} class="stl-grid"
        style=${"left:"+A(M.ts).toFixed(2)+"%;bottom:"+g+"px"} />`)}

      <!-- ended session bars -->
      ${i.map((M,R)=>{const y=Math.max(M.started_at,o),C=A(y),P=Math.max(.15,A(M.ended_at)-C),z=f[R]*(p+m)+m,E=De[M.tool]||"var(--fg2)",Y=mt[M.tool]||"🔹";return r`<div key=${M.session_id} class="stl-bar"
          style=${"left:"+C.toFixed(2)+"%;width:"+P.toFixed(2)+"%;top:"+z+"px;height:"+p+"px;background:"+E}
          onClick=${()=>s&&s(M)}>
          ${tr(M,E,Y,n)}
        </div>`})}

      <!-- divider between ended and live -->
      ${$?r`<div class="stl-divider" style=${"top:"+T+"px"} />`:""}

      <!-- live session markers -->
      ${c.map(M=>{const R=A(M.started_at),y=T+$+m,C=De[M.tool]||"var(--fg2)",P=mt[M.tool]||"🔹";return r`<div key=${M.session_id} class="stl-marker"
          style=${"left:"+R.toFixed(2)+"%;top:"+y+"px;background:"+C}
          onClick=${()=>s&&s(M)}>
          ${tr(M,C,P,n)}
        </div>`})}

      <div class="stl-axis" style=${"top:"+(S-g)+"px"}>
        ${j.map(M=>r`<span key=${M.ts} class="stl-tick"
          style=${"left:"+A(M.ts).toFixed(2)+"%"}>${M.label}</span>`)}
      </div>
    </div>
  </div>`}function Io(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Mc(e){let t=0;for(const s of e)(s.role==="lead"||s.role==="teammate"||s.role==="subagent")&&t++,t+=Mc(s.children||[]);return t}function sr({session:e,onSelect:t,isSelected:s,agentTeams:n}){const l=De[e.tool]||"var(--fg2)",o=mt[e.tool]||"🔹",a=(n||[]).find(d=>d.session_id===e.session_id),i=a?a.agent_count:Mc(e.process_tree||[]),c=i>1;return r`<div class="diag-card" style="border-left:3px solid ${l};cursor:pointer;${s?"outline:2px solid var(--accent);outline-offset:-2px":""}"
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
      <div class="es-kv-card"><div class="label">Duration</div><div class="value">${Io(e.duration_s)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${_e(e.cpu_percent||0)}</div></div>
      <div class="es-kv-card"><div class="label">Input Tok</div><div class="value">${F(e.exact_input_tokens||0)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tok</div><div class="value">${F(e.exact_output_tokens||0)}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${F(e.file_events||0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(e.pids)?e.pids.length:e.pids||0}</div></div>
    </div>
    <div class="text-muted text-xs text-mono text-ellipsis" style="margin-top:var(--sp-3)"
      title=${e.session_id}>
      ${e.session_id}
    </div>
  </div>`}function iv(){const{snap:e}=je(Ie),t=e&&e.agent_teams||[];if(!t.length)return null;const s=t.reduce((o,a)=>o+a.agent_count,0),n=t.reduce((o,a)=>o+(a.total_input_tokens||0),0),l=t.reduce((o,a)=>o+(a.total_output_tokens||0),0);return r`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Agent Teams
      <span class="badge">${t.length} sessions</span>
      <span class="badge">${s} agents</span>
      <span class="badge">${F(n+l)} tok</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      ${t.sort((o,a)=>(a.total_input_tokens||0)-(o.total_input_tokens||0)).slice(0,8).map(o=>r`
        <${cv} key=${o.session_id} team=${o}/>
      `)}
    </div>
  </div>`}function rv(e){return e?e.replace("claude-","").replace("-20251001",""):"?"}function cv({team:e}){const[t,s]=W(!1),[n,l]=W(e.agents||null),[o,a]=W(!1);e.models,ae(()=>{!t||n||(a(!0),Sd(e.session_id).then(p=>{l(p.agents||[]),a(!1)}).catch(()=>{l([]),a(!1)}))},[t]);const i=(n||[]).filter(p=>(p.input_tokens||0)+(p.output_tokens||0)>50),c=(n||[]).length-i.length,d=i.sort((p,m)=>m.input_tokens+m.output_tokens-(p.input_tokens+p.output_tokens)),f=d[0]?(d[0].input_tokens||0)+(d[0].output_tokens||0):1;return r`<div class="diag-card" style="border-left:3px solid var(--accent);padding:var(--sp-4)">
    <div class="flex-row gap-sm mb-sm" style="align-items:center;cursor:pointer" onClick=${()=>s(!t)}>
      <span class="badge" style="background:var(--accent);color:var(--bg)">${e.agent_count||i.length} agents${c?r` <span style="opacity:0.6">+${c}w</span>`:null}</span>
      <span class="text-muted text-xs">${F(e.total_input_tokens||0)}in / ${F(e.total_output_tokens||0)}out</span>
      ${(e.tools_used||[]).length>0&&r`<span class="text-muted text-xs">${e.tools_used.join(", ")}</span>`}
      <span class="mono text-xs text-muted" style="margin-left:auto" title=${e.session_id}>${e.session_id.slice(0,12)}\u2026</span>
      <span class="text-xs text-muted">${t?"▲":"▼"}</span>
    </div>
    <!-- Agent rows: show loading, or compact agent rows with task + tokens -->
    ${o?r`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading agents\u2026</div>`:r`<div style="display:flex;flex-direction:column;gap:1px">
      ${d.slice(0,t?999:5).map(p=>{const m=(p.input_tokens||0)+(p.output_tokens||0),g=Math.max(1,m/f*100);return r`<div key=${p.agent_id} style="display:grid;
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
            <span class="text-muted" style="font-size:var(--fs-2xs);white-space:nowrap">${F(m)}</span>
          </div>
          <span class="text-muted" style="font-size:var(--fs-2xs)">${rv(p.model)}</span>
          ${p.completed?r`<span class="text-green">\u2713</span>`:r`<span class="text-orange">\u25CB</span>`}
        </div>`})}
      ${!t&&d.length>5?r`<div class="text-muted text-xs cursor-ptr" style="padding:2px var(--sp-2)"
        onClick=${p=>{p.stopPropagation(),s(!0)}}>+${d.length-5} more agents\u2026</div>`:null}
    </div>`}
  </div>`}function dv(){const{snap:e,globalRange:t,rangeSeconds:s,enabledTools:n}=je(Ie),[l,o]=W([]),[a,i]=W(!1),[c,d]=W(!0),[f,p]=W(null),[m,g]=W(null),[k,D]=W([]);ae(()=>{d(!0),i(!1),Pr({active:!1}).then(y=>{o(y),d(!1)}).catch(()=>{i(!0),d(!1)})},[]),ae(()=>{if(!t)return;const y=Math.min(t.since,Date.now()/1e3-86400);kl(null,{since:y,until:t.until}).then(D).catch(()=>D([]))},[t]),ae(()=>{const y=C=>{const P=C.detail;P&&P.session_id&&(p(P.session_id),g(P))};return window.addEventListener("aictl-session-select",y),()=>window.removeEventListener("aictl-session-select",y)},[]);const T=y=>n===null||n.includes(y),b=(e&&e.sessions||[]).filter(y=>T(y.tool)),$=l.filter(y=>T(y.tool)),x=k.filter(y=>T(y.tool));let S=b.find(y=>y.session_id===f);if(!S&&f){const C=l.find(P=>P.session_id===f)||m;C&&C.session_id===f&&(S={session_id:C.session_id,tool:C.tool,project:C.project||"",duration_s:C.duration_s||0,active:C.active||!1,started_at:C.started_at,ended_at:C.ended_at,files_touched:[],files_loaded:[],exact_input_tokens:C.input_tokens||0,exact_output_tokens:C.output_tokens||0,pids:[],file_events:C.files_modified||0})}const j=y=>{p(C=>C===y.session_id?null:y.session_id)},A={};for(const y of b){const C=y.project||"Unknown Project";A[C]||(A[C]=[]),A[C].push(y)}const M=Object.keys(A).sort();return r`<div>
    <div class="mb-lg">
      <${av} sessions=${x} rangeSeconds=${s}
        onSelect=${y=>{p(y.session_id),g(y)}}/>
    </div>

    <${iv}/>

    ${S&&r`<${nv} session=${S}
      onClose=${()=>p(null)}/>`}

    <div class="es-section">
      <div class="es-section-title">Active Sessions (${b.length})</div>
      ${b.length?M.length>1?M.map(y=>r`<div key=${y} style="margin-bottom:var(--sp-5)">
              <div class="text-muted text-sm mono" style="margin-bottom:var(--sp-3);font-weight:600">
                ${K(y.replace(/\\/g,"/").split("/").pop()||y)}
                <span class="text-xs" style="font-weight:400"> \u2014 ${A[y].length} session${A[y].length>1?"s":""}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
                ${A[y].map(C=>r`<${sr} key=${C.session_id} session=${C}
                  onSelect=${j} isSelected=${C.session_id===f} agentTeams=${e==null?void 0:e.agent_teams}/>`)}
              </div>
            </div>`):r`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
              ${b.map(y=>r`<${sr} key=${y.session_id} session=${y}
                onSelect=${j} isSelected=${y.session_id===f}/>`)}
            </div>`:r`<div class="empty-state">
            <p>No active sessions.</p>
            ${$.length>0&&r`<div class="diag-card" style="margin-top:var(--sp-4);max-width:400px">
              <div class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Last session</div>
              <div class="flex-row gap-sm" style="align-items:center">
                <span style="color:${De[$[0].tool]||"var(--fg2)"}">${mt[$[0].tool]||"🔹"}</span>
                <strong>${K($[0].tool)}</strong>
                <span class="text-muted text-xs">${Io($[0].duration_s)}</span>
                ${$[0].ended_at&&r`<span class="text-muted text-xs">${Bt($[0].ended_at)}</span>`}
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
                <tbody>${$.map(y=>{const C=De[y.tool]||"var(--fg2)",P=mt[y.tool]||"🔹",z=y.session_id?y.session_id.length>12?y.session_id.slice(0,12)+"…":y.session_id:"—";return r`<tr key=${y.session_id} style="cursor:pointer;${y.session_id===f?"background:var(--bg2)":""}"
                    onClick=${()=>{p(y.session_id===f?null:y.session_id),g(null)}}>
                    <td>
                      <span style="color:${C};margin-right:var(--sp-2)">${P}</span>
                      ${K(y.tool)}
                    </td>
                    <td><span class="mono" title=${y.session_id} style="font-size:0.7rem">${z}</span></td>
                    <td><span class="mono" style="font-size:0.7rem">${y.pid||"—"}</span></td>
                    <td>${Io(y.duration_s)}</td>
                    <td>${y.active?r`<span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>`:r`<span class="badge" style="font-size:var(--fs-xs)">ended</span>`}</td>
                    <td>${y.ended_at?Bt(y.ended_at):"—"}</td>
                  </tr>`})}</tbody>
              </table>`:r`<p class="empty-state">No past sessions recorded.</p>`}
    </div>
  </div>`}function nr(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function uv(e,t,s){let n;return{hooks:{init(l){n=document.createElement("div"),n.className="chart-tooltip",n.style.display="none",l.over.appendChild(n)},setCursor(l){var f;const o=l.cursor.idx;if(o==null){n.style.display="none";return}const a=[];for(let p=1;p<l.series.length;p++){const m=(f=l.data[p])==null?void 0:f[o];m!=null&&a.push(t?t(m):F(m))}if(!a.length){n.style.display="none";return}const i=l.data[0][o],c=s?new Date(i*1e3).toLocaleTimeString([],{hourCycle:"h23"}):e?e(i):F(i);n.innerHTML=`<b>${a.join(", ")}</b> ${c}`;const d=Math.round(l.valToPos(i,"x"));n.style.left=Math.min(d,l.over.clientWidth-100)+"px",n.style.display=""}}}}const pv=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function fv(e){return e==null||e===0?"0":e>=1e6?Math.round(e/1e6)+"M":e>=1e3?Math.round(e/1e3)+"K":e>=1?Math.round(e).toString():e.toPrecision(1)}function vv(e,t,s,n){const l=Math.max(0,Math.floor(Math.log10(Math.max(1,s)))),o=Math.ceil(Math.log10(Math.max(1,n))),a=[];for(let c=l;c<=o;c++)a.push(Math.pow(10,c));if(a.length<=3)return a;const i=Math.floor((l+o)/2);return[Math.pow(10,l),Math.pow(10,i),Math.pow(10,o)]}function ho({mode:e,data:t,labels:s,colors:n,height:l,isTime:o,fmtX:a,fmtY:i,xLabel:c,yLabel:d,logX:f}){const p=lt(null),m=lt(null),g=l||200;return ae(()=>{if(!p.current||!t||t.length<2||!t[0]||t[0].length<2)return;try{m.current&&(m.current.destroy(),m.current=null)}catch{m.current=null}const k=t.length-1,D=n||pv,T=[{}];for(let $=0;$<k;$++){const x=D[$%D.length],S=nr(x,.6);e==="scatter"?T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:"transparent",paths:()=>null,points:{show:!0,size:8,fill:S,stroke:"transparent",width:0}}):T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:x,width:1.5,fill:nr(x,.08),points:{show:!1}})}const b={width:p.current.clientWidth||300,height:g,padding:[8,8,0,0],cursor:{show:!0,x:!0,y:!1,points:{show:e!=="scatter"}},legend:{show:!1},select:{show:!1},scales:{x:{time:!!o,...f?{distr:3,log:10}:{}},y:{auto:!0,range:($,x,S)=>[Math.max(0,x*.9),S*1.1||1]}},axes:[{show:!0,size:28,gap:2,...f?{splits:vv}:{},values:o?void 0:($,x)=>x.map(S=>f?fv(S):a?a(S):F(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}},{show:!0,size:50,gap:2,values:($,x)=>x.map(S=>i?i(S):F(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}}],series:T,plugins:[uv(a,i,o)]};try{m.current=new ot(b,t,p.current)}catch($){console.warn("AnalyticsChart: uPlot init failed",$),m.current=null}return()=>{try{m.current&&(m.current.destroy(),m.current=null)}catch{}}},[t,e,n,s,o,f,g]),ae(()=>{if(!m.current||!p.current)return;const k=new ResizeObserver(()=>{m.current&&p.current&&m.current.setSize({width:p.current.clientWidth,height:g})});return k.observe(p.current),()=>k.disconnect()},[g]),r`<div class="analytics-chart-wrap" style=${"height:"+g+"px"} ref=${p}></div>`}function mv(e){const t={};for(const s of e){const n=typeof s=="string"?s:s.metric;if(!n)continue;const l=n.split("."),o=l.length>1?l.slice(0,-1).join("."):"(ungrouped)";(t[o]=t[o]||[]).push({name:n,count:s.count||0,lastValue:s.last_value})}return Object.entries(t).sort((s,n)=>s[0].localeCompare(n[0]))}function hv(){const[e,t]=W([]),[s,n]=W(null),[l,o]=W(null),[a,i]=W([]),[c,d]=W(!1),[f,p]=W(null);ae(()=>{Ad().then(T=>{t(T||[]),p(null)}).catch(T=>{t([]),p(T.message)})},[]);const m=re(()=>mv(e),[e]),g=be(T=>{n(T),o(null),i([]),d(!0);const b=Math.floor(Date.now()/1e3)-1800,$=Od(T,b).then(S=>o(S)).catch(()=>o(null)),x=Pd(T,b).then(S=>i(Array.isArray(S)?S:[])).catch(()=>i([]));Promise.allSettled([$,x]).then(()=>d(!1))},[]),k=re(()=>!l||!l.value||!l.value.length?null:l.value[l.value.length-1],[l]),D=re(()=>{const T=new Set;for(const b of a)b.tags&&Object.keys(b.tags).forEach($=>T.add($));return[...T].sort()},[a]);return r`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${f&&r`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${K(f)}</p>`}
      ${!f&&!e.length&&r`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${m.map(([T,b])=>r`<div key=${T}>
        <div class="text-muted" style="font-size:0.62rem;padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${T}</div>
        ${b.map($=>r`<button key=${$.name}
          class=${s===$.name?"es-tool-btn active":"es-tool-btn"}
          onClick=${()=>g($.name)}>
          ${$.name.split(".").pop()}
          ${$.count?r`<span class="badge" style="margin-left:auto;font-size:var(--fs-2xs)">${F($.count)}</span>`:""}
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
          <${ts}
            label=${s.split(".").pop()}
            value=${k!=null?F(k):"-"}
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
                  ${D.map(T=>r`<th key=${T} style="padding:var(--sp-2) var(--sp-4)">${T}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${a.slice(-50).reverse().map((T,b)=>r`<tr key=${b}
                  style="border-bottom:1px solid var(--border);${b%2?"background:var(--bg2)":""}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${Nr(T.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${F(T.value)}</td>
                  ${D.map($=>r`<td key=${$} style="padding:var(--sp-2) var(--sp-4)">
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
  </div>`}const ln=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function ps(e){return e>=1e3?F(e/1e3)+"s":Math.round(e)+"ms"}function gv(e){return"#"+Math.round(e)}function go(e){return(e||"").split("/").slice(-2).join("/")}function _v({data:e}){if(!e||!e.requests||!e.requests.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <p class="empty-state">No request data in this time range.</p>
    </div>`;const t=e.requests,s=re(()=>{const c=t.map(f=>f.ts),d=t.map(f=>f.duration_ms);return[c,d]},[t]),n=re(()=>{const c=[...new Set(t.map(g=>g.model||"(unknown)"))],d=c.map(()=>[]),p=[...t.filter(g=>g.input_tokens>0)].sort((g,k)=>g.input_tokens-k.input_tokens),m=p.map(g=>g.input_tokens);for(const g of c)d[c.indexOf(g)]=p.map(k=>(k.model||"(unknown)")===g?k.duration_ms:null);return{data:[m,...d],labels:c,colors:ln.slice(0,c.length)}},[t]),l=e.by_model||[],o=Math.max(1,...l.map(c=>c.p95_ms)),a=re(()=>{const c=[...new Set(t.map(g=>g.model||"(unknown)"))],f=[...t.filter(g=>g.seq>0)].sort((g,k)=>g.seq-k.seq),p=f.map(g=>g.seq),m=c.map(g=>f.map(k=>(k.model||"(unknown)")===g?k.duration_ms:null));return{data:[p,...m],labels:c,colors:ln.slice(0,c.length)}},[t]),i=t.length?t[t.length-1].duration_ms:0;return r`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${ps(i)}</span></div>
        <${ho} mode="line" data=${s} isTime=${!0} fmtY=${ps} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${t.length} requests</span></div>
        <${ho} mode="scatter" data=${n.data} labels=${n.labels}
          colors=${n.colors} fmtX=${F} fmtY=${ps} logX=${!0} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${l.map((c,d)=>r`<div key=${c.model} class="hbar-row">
            <span class="hbar-label" title=${c.model}>${c.model.replace(/^claude-/,"")||c.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${"width:"+Math.round(c.avg_ms/o*100)+"%;background:"+ln[d%ln.length]}></div>
              <div class="hbar-p95" style=${"left:"+Math.round(c.p95_ms/o*100)+"%"} title=${"p95: "+ps(c.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ps(c.avg_ms)}</span>
            <span class="badge">${c.count}</span>
          </div>`)}
        </div>
        ${l.length>0&&r`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${ho} mode="scatter" data=${a.data} labels=${a.labels}
          colors=${a.colors} fmtX=${gv} fmtY=${ps} logX=${!0} height=${200}/>
      </div>
    </div>
  </div>`}const $v={"claude-code":"#8b5cf6",codex:"#f97316",aider:"#06b6d4",cursor:"#f472b6"};function Ec(e,t){return $v[e]||ln[t%ln.length]}function lr({by_cli:e,total:t,barWidth:s,cliTools:n}){return!e||!e.length?r`<div class="hbar-fill" style=${"width:"+s+"%;background:var(--accent)"}></div>`:e.map((l,o)=>{const a=l.count/t*s,i=Ec(l.cli_tool,n.indexOf(l.cli_tool));return r`<div key=${l.cli_tool}
      style=${"width:"+a.toFixed(1)+"%;background:"+i+";height:100%;display:inline-block"}
      title=${l.cli_tool+": "+l.count}></div>`})}function yv({data:e}){if(!e||!e.invocations||!e.invocations.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      <p class="empty-state">${e!=null&&e.total_all_time?"No tool invocation data in this time range. Try a wider range ("+e.total_all_time+" invocations exist).":"No tool invocation data yet. Configure Claude Code hooks to capture tool usage."}</p>
    </div>`;const t=e.invocations,s=e.cli_tools||[],n=Math.max(1,...t.map(o=>o.count)),l=Math.max(1,...t.map(o=>o.p95_ms));return r`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    ${s.length>1&&r`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${s.map((o,a)=>r`<span key=${o} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${"width:10px;height:10px;border-radius:2px;background:"+Ec(o,a)}></span>
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
              <${lr} by_cli=${o.by_cli} total=${o.count}
                barWidth=${Math.round(o.count/n*100)} cliTools=${s}/>
            </div>
            <span class="hbar-value">${F(o.count)}</span>
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
              <${lr} by_cli=${o.by_cli} total=${o.count}
                barWidth=${Math.round(o.avg_ms/l*100)} cliTools=${s}/>
              <div class="hbar-p95" style=${"left:"+Math.round(o.p95_ms/l*100)+"%"} title=${"p95: "+ps(o.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ps(o.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`}function bv({data:e}){const[t,s]=W(!1);if(!e)return null;const n=e.memory_timeline||{},l=e.memory_events||[],o=Object.keys(n);if(!o.length&&!l.length)return r`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <p class="empty-state">No file write data in this time range.</p>
    </div>`;const a=t?o:o.slice(0,6);return r`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>

    ${o.length>0&&r`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${o.length} files)</div>
      <div class="analytics-charts">
        ${a.map(i=>{const c=n[i];if(!c||c.ts.length<2)return r`<div key=${i} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${i}>${go(i)}</span>
              <span class="chart-val text-muted">${c&&c.size_bytes.length?ge(c.size_bytes[c.size_bytes.length-1]):"-"}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;const d=c.size_bytes[c.size_bytes.length-1];return r`<div key=${i} class="diag-card">
            <${ts} label=${go(i)} value=${ge(d)}
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
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${Nr(i.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${i.path}>${go(i.path)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${ge(i.size_bytes)}</td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4);color:${i.delta>0?"var(--green)":i.delta<0?"var(--red)":"var(--fg2)"}">
                ${i.delta>0?"+":""}${ge(Math.abs(i.delta))}${i.delta<0?" ↓":i.delta>0?" ↑":""}
              </td>
              <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${F(i.tokens)}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`}
  </div>`}function kv(){const e=je(Ie),t=e==null?void 0:e.globalRange,[s,n]=W(null),[l,o]=W(!0),[a,i]=W(null);return ae(()=>{o(!0),i(null);const c=(t==null?void 0:t.since)||Date.now()/1e3-86400,d=(t==null?void 0:t.until)||"",f=`/api/analytics?since=${c}${d?"&until="+d:""}`,p=new AbortController,m=setTimeout(()=>p.abort(),15e3);return Cd(f,{signal:p.signal}).then(g=>{n(g),i(null)}).catch(g=>{g.name==="AbortError"?i("Request timed out"):(n(null),i(g.message))}).finally(()=>{clearTimeout(m),o(!1)}),()=>{clearTimeout(m),p.abort()}},[t==null?void 0:t.since,t==null?void 0:t.until]),r`<div class="analytics-grid">
    ${l&&r`<p class="loading-state">Loading analytics...</p>`}
    ${a&&r`<p class="error-state">Error: ${a}</p>`}
    ${!l&&!a&&r`<Fragment>
      <${_v} data=${s==null?void 0:s.response_time}/>
      <${yv} data=${s==null?void 0:s.tools}/>
      <${bv} data=${s==null?void 0:s.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <div style="margin-top:var(--sp-4)"><${hv}/></div>
      </details>
    </Fragment>`}
  </div>`}function xv({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:r`<div class="sf-tool-tabs">
    ${e.map(n=>r`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?De[n]||"var(--accent)":"transparent"};color:${De[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${mt[n]||"🔹"}</span> ${K(n)}
    </button>`)}
  </div>`}function fs(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Dc(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function wv(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"})}function Lc(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function or(e){return e?e.replace("claude-","").replace(/-\d{8}$/,""):""}function Sv(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function Tv(e,t){if(!t)return"";let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{return t.slice(0,80)}if(typeof s!="object"||s===null)return String(t).slice(0,80);const n=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const o of n)if(s[o]){let a=String(s[o]);return(o==="file_path"||o==="path")&&a.length>60&&(a=".../"+a.replace(/\\/g,"/").split("/").slice(-2).join("/")),a.slice(0,100)}const l=Object.keys(s);return l.length>0?String(s[l[0]]).slice(0,80):""}const ar=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],ir={Bash:"#1a1a1a"};function rr(e){if(ir[e])return ir[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return ar[t%ar.length]}function Cv({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?r`<div class="sf-sess-tabs">
    ${e.map(l=>{const o=l.exact_input_tokens||l.input_tokens||0,a=l.exact_output_tokens||l.output_tokens||0,i=o+a,c=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),d=l.session_id===t,f=!l.ended_at;return r`<button key=${l.session_id}
        title=${l.session_id}
        class="sf-sess-tab ${d?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${wv(l.started_at)}</span>
        <span class="sf-stab-sid">${Sv(l.session_id)}</span>
        <span class="sf-stab-dur">${Dc(c)}</span>
        ${i>0&&r`<span class="sf-stab-tok">${F(i)}t</span>`}
        ${(l.files_modified||0)>0&&r`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${f&&r`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:r`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function Mv({event:e}){if(e.type==="user_message")return e.redacted?r`<div class="sf-seq-tooltip">
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
        Input: ${F(t.input||0)} \u00B7 Output: ${F(t.output||0)}
        ${(t.cache_read||0)>0?" · Cache: "+F(t.cache_read):""}
      </div>
      <div class="sf-tip-meta">
        ${e.duration_ms>0?"Duration: "+fs(e.duration_ms):""}
        ${e.ttft_ms>0?" · TTFT: "+fs(e.ttft_ms):""}
      </div>
      ${e.is_error&&r`<div class="sf-tip-meta" style="color:var(--red)">Error: ${K(e.error_type||"unknown")}</div>`}
    </div>`}if(e.type==="api_response"){const t=e.tokens||{};return r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${e.model?" — "+e.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${F(t.output||0)} tokens
        ${e.duration_ms>0?" · Latency: "+fs(e.duration_ms):""}
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
        ${e.duration_ms>0?" · "+fs(e.duration_ms):""}
        ${e.result_size?" · Result: "+e.result_size+" bytes":""}
      </div>`}
    </div>`}return e.type==="subagent"?r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${K(e.to||"agent")}</div>
    </div>`:e.type==="hook"?r`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${K(e.hook_name||"")}</div>
    </div>`:null}function Ev({event:e,participants:t,hoveredIdx:s,idx:n,onHover:l}){const o=t.findIndex(x=>x.id===e._from),a=t.findIndex(x=>x.id===e._to);if(o<0||a<0)return null;const i=a>o,c=Math.min(o,a),d=Math.max(o,a),f=s===n,p=t.find(x=>x.id===e._to),g={user_message:"var(--green)",api_call:e.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:(p==null?void 0:p.color)||"var(--cat-commands)",subagent:(p==null?void 0:p.color)||"var(--yellow)",hook:"var(--orange)"}[e.type]||"var(--fg2)";let k="",D="";if(e.type==="user_message")e.redacted?k="🔒 prompt ("+(e.prompt_length||"?")+" chars)":(k=e.preview||"(prompt)",e.prompt_length&&(D=e.prompt_length+" chars"));else if(e.type==="api_call"){const x=e.tokens||{};k=e.agent_name||or(e.model)||"API call",D=F((x.input||0)+(x.output||0))+"t",e.ttft_ms>0?D+=" ttft:"+fs(e.ttft_ms):e.duration_ms>0&&(D+=" "+fs(e.duration_ms)),e.is_error&&(D+=" ⚠")}else if(e.type==="api_response"){const x=e.tokens||{};k="← "+F(x.output||0)+"t",e.response_preview&&(k+=" "+e.response_preview.slice(0,60)),D=or(e.model)||"",e.finish_reason&&e.finish_reason!=="stop"&&(D+=" ["+e.finish_reason+"]")}else if(e.type==="error")k="⚠ "+(e.error_type||"error"),D=e.error_message?e.error_message.slice(0,60):"";else if(e.type==="tool_use"){const x=e.to||"tool",S=Tv(x,e.params);k=x+(S?": "+S:""),e.subtype==="result"?(D=e.success==="true"||e.success===!0?"✓":"✗",e.duration_ms>0&&(D+=" "+fs(e.duration_ms)),e.result_size&&(D+=" "+e.result_size+"B")):e.subtype==="decision"&&(D=e.decision||"")}else e.type==="subagent"?k=e.to||"subagent":e.type==="hook"&&(k=e.hook_name||"hook");const T=100/t.length,b=(c+.5)*T,$=(d+.5)*T;return r`<div class="sf-seq-row ${f?"hovered":""}"
    onMouseEnter=${()=>l(n)} onMouseLeave=${()=>l(null)}>
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${e._cumTok>0?F(e._cumTok):""}</span>
      <span class="sf-seq-rttok">${e._rtTok>0?F(e._rtTok):""}</span>
    </div>
    <div class="sf-seq-time">${Lc(e.ts)}</div>
    <div class="sf-seq-arrow-area">
      ${t.map((x,S)=>r`<div key=${S} class="sf-seq-lane"
        style="left:${(S+.5)*T}%"></div>`)}
      <div class="sf-seq-arrow-line" style="
        left:${b}%;
        width:${$-b}%;
        border-color:${g};
      "></div>
      <div class="sf-seq-arrowhead" style="
        left:${i?$:b}%;
        border-${i?"left":"right"}-color:${g};
        transform:translateX(${i?"-100%":"0"});
      "></div>
      <div class="sf-seq-label" style="
        left:${(b+$)/2}%;
        color:${g};
      "><span class="sf-seq-label-text" title=${k}>${K(k)}</span>
        ${D&&r`<span class="sf-seq-sublabel">${D}</span>`}
      </div>
    </div>
    ${f&&r`<${Mv} event=${e}/>`}
  </div>`}function Dv({event:e}){let t="",s="var(--fg2)",n="";return e.type==="session_start"?(t="Session started",s="var(--green)",n="▶"):e.type==="session_end"?(t="Session ended",s="var(--fg3)",n="■"):e.type==="compaction"&&(t="Compaction"+(e.compaction_count?" #"+e.compaction_count:""),s="var(--orange)",n="⟳"),r`<div class="sf-seq-marker" style="border-left-color:${s}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${Lc(e.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${s}">
      ${n} ${t}
      ${e.type==="compaction"&&e.duration_ms>0?" — "+fs(e.duration_ms):""}
      ${e.cwd?r` <span class="text-muted text-xs mono">${K(e.cwd)}</span>`:""}
    </div>
  </div>`}function Lv({summary:e}){return!e||!e.event_count?null:r`<div class="sf-summary">
    ${e.total_turns>0&&r`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${e.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${e.total_api_calls||0}</div></div>
    ${e.total_tool_uses>0&&r`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${e.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${F(e.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${F(e.total_input_tokens)}/${F(e.total_output_tokens)}</div></div>
    ${e.compactions>0&&r`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${e.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${Dc(e.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${e.event_count}</div></div>
  </div>`}function Av(e,t){const s=new Set,n=[],l=(o,a,i)=>{s.has(o)||(s.add(o),n.push({id:o,label:a||o,color:i||"var(--fg2)"}))};l("user","User","var(--green)"),l("tool",t||"AI Tool",De[t]||"var(--accent)");for(const o of e){if((o.type==="api_call"||o.type==="api_response"||o.type==="error")&&l("api","API","var(--accent)"),o.type==="tool_use"){const a=o.to||"tool";l("skill:"+a,a,rr(a))}if(o.type==="subagent"){const a=o.to||"Subagent";l("subagent:"+a,a,rr(a))}o.type==="hook"&&l("hook","Hooks","var(--orange)")}return n}function Ov(){const{globalRange:e,enabledTools:t}=je(Ie),[s,n]=W([]),[l,o]=W(!0),[a,i]=W(null),[c,d]=W(null),[f,p]=W(null),[m,g]=W(!1),[k,D]=W(null);ae(()=>{o(!0);const M=e?Math.min(e.since,Date.now()/1e3-86400):Date.now()/1e3-86400,R=e==null?void 0:e.until;kl(null,{since:M,until:R}).then(y=>{y.sort((C,P)=>(P.started_at||0)-(C.started_at||0)),n(y),o(!1)}).catch(()=>o(!1))},[e]);const T=M=>t===null||t.includes(M),b=s.filter(M=>T(M.tool)),$=[...new Set(b.map(M=>M.tool))].sort();ae(()=>{(!a&&$.length>0||a&&!$.includes(a)&&$.length>0)&&i($[0])},[$.join(",")]);const x=b.filter(M=>M.tool===a);ae(()=>{x.length>0&&(!c||!x.find(M=>M.session_id===c))&&d(x[0].session_id)},[a,x.length]),ae(()=>{if(!c){p(null);return}g(!0);const M=s.find(C=>C.session_id===c),R=M!=null&&M.started_at?M.started_at-60:Date.now()/1e3-86400,y=M!=null&&M.ended_at?M.ended_at+60:Date.now()/1e3+60;Ko(c,R,y).then(C=>{p(C),g(!1)}).catch(()=>{p(null),g(!1)})},[c]);const{processedTurns:S,participants:j}=re(()=>{const M=(f==null?void 0:f.turns)||[];if(!M.length)return{processedTurns:[],participants:[]};const R=M.map(z=>{const E={...z};return z.type==="user_message"?(E._from="user",E._to="tool"):z.type==="api_call"?(E._from=z.from||"tool",E._to="api"):z.type==="api_response"||z.type==="error"?(E._from="api",E._to="tool"):z.type==="tool_use"?(E._from="tool",E._to="skill:"+(z.to||"tool")):z.type==="subagent"?(E._from="tool",E._to="subagent:"+(z.to||"agent")):z.type==="hook"&&(E._from="tool",E._to="hook"),E});let y=0,C=0;for(const z of R){const E=z.tokens||{},Y=(E.input||0)+(E.output||0);z.type==="user_message"&&(C=0),z.type==="api_call"&&(y+=Y,C+=Y),z._cumTok=y,z._rtTok=C}const P=Av(R,a);return{processedTurns:R,participants:P}},[f,a]),A=(f==null?void 0:f.summary)||{};return r`<div class="sf-container">
    <${xv} tools=${$} activeTool=${a} onSelect=${i}/>

    <${Cv} sessions=${x} activeId=${c}
      onSelect=${d} loading=${l}/>

    <${Lv} summary=${A}/>

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
                ${j.map((M,R)=>{const y=100/j.length;return r`<div key=${M.id} class="sf-seq-participant"
                    style="left:${(R+.5)*y}%;color:${M.color}">
                    <div class="sf-seq-participant-box" style="border-color:${M.color}">${K(M.label)}</div>
                  </div>`})}
              </div>
            </div>
            <div class="sf-seq-body">
              ${S.map((M,R)=>M._from&&M._to?r`<${Ev} key=${R} event=${M} participants=${j}
                    hoveredIdx=${k} idx=${R} onHover=${D}/>`:r`<${Dv} key=${R} event=${M} participants=${j}/>`)}
            </div>
          `}
    </div>
  </div>`}function Pv({tools:e,activeTool:t,onSelect:s}){return e.length?r`<div class="sf-tool-tabs" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);flex-wrap:wrap">
    ${e.map(n=>r`<button key=${n}
      class="chip ${n===t?"chip-active":""}"
      onClick=${()=>s(n)}
      style="font-size:var(--fs-sm);padding:var(--sp-2) var(--sp-4)">
      ${K(n)}
    </button>`)}
  </div>`:null}function Al(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Ac(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function Oc(e){return e?e.replace("claude-","").replace("gpt-","").replace(/-\d{8}$/,""):""}function jo(e,t){return e?e.length>t?e.slice(0,t)+"…":e:""}const zv={tool_use:"🔧",api_call:"🌐",api_response:"📨",file_edit:"📝",compaction:"🗜️",subagent:"🤖",error:"❌"},Fv={tool_use:"var(--accent)",api_call:"var(--green)",api_response:"var(--fg2)",file_edit:"var(--orange)",compaction:"var(--yellow)",subagent:"var(--accent)",error:"var(--red)"};function Rv({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions\u2026</div>`:e.length?r`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${e.slice(0,20).map(l=>{const o=l.session_id===t,a=l.ended_at?Math.round(l.ended_at-l.started_at):0,i=a>0?Al(a*1e3):"⏳ live",c=Ac(l.started_at);return r`<button key=${l.session_id}
        class="tr-sess-btn ${o?"tr-sess-active":""}"
        onClick=${()=>s(l.session_id)}
        title=${l.session_id}>
        <span class="tr-sess-time">${c}</span>
        <span class="tr-sess-dur">${i}</span>
        ${l.is_live?r`<span class="tr-sess-live">\u25CF</span>`:null}
      </button>`})}
  </div>`:r`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`}function Nv({action:e,turnTs:t}){const s=zv[e.kind]||"•",n=Fv[e.kind]||"var(--fg2)",l=e.ts-t,o=l>0?"+"+(l<1?l.toFixed(1):Math.round(l))+"s":"",a=e.duration_ms>0?Al(e.duration_ms):"",i=e.tokens,c=i?F((i.input||0)+(i.output||0)):"";return r`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${n}">${s}</span>
    <span class="tr-action-name" style="color:${n}">${K(e.name||e.kind)}</span>
    ${e.input_summary?r`<span class="tr-action-args">${K(jo(e.input_summary,80))}</span>`:null}
    ${e.output_summary?r`<span class="tr-action-result">${K(jo(e.output_summary,60))}</span>`:null}
    <span class="tr-action-meta">
      ${o?r`<span class="tr-action-offset">${o}</span>`:null}
      ${a?r`<span class="tr-action-dur">${a}</span>`:null}
      ${c?r`<span class="tr-action-tok">\uD83E\uDE99 ${c}</span>`:null}
      ${e.success===!1?r`<span class="tr-action-fail">\u2717</span>`:null}
      ${e.success===!0?r`<span class="tr-action-ok">\u2713</span>`:null}
    </span>
  </div>`}function Iv({turn:e,index:t,expanded:s,onToggle:n}){const l=e.prompt&&e.prompt.length>0,o=e.actions||[],a=o.filter(m=>m.kind==="tool_use"),i=o.filter(m=>m.kind==="api_call"),c=o.filter(m=>m.kind==="error"),d=e.tokens||{},f=(d.input||0)+(d.output||0),p=e.wall_ms||e.duration_ms||0;return r`<div class="tr-turn ${s?"tr-turn-expanded":""}">
    <div class="tr-turn-header" onClick=${n}>
      <div class="tr-turn-num">${t+1}</div>
      <div class="tr-turn-meta">
        <span class="tr-turn-time">${Ac(e.ts)}</span>
        ${e.model?r`<span class="tr-turn-model">${Oc(e.model)}</span>`:null}
        ${p>0?r`<span class="tr-turn-dur">${Al(p)}</span>`:null}
      </div>
      <div class="tr-turn-stats">
        ${f>0?r`<span class="tr-stat" title="Tokens">\uD83E\uDE99 ${F(f)}</span>`:null}
        ${a.length>0?r`<span class="tr-stat" title="Tool uses">\uD83D\uDD27 ${a.length}</span>`:null}
        ${i.length>0?r`<span class="tr-stat" title="API calls">\uD83C\uDF10 ${i.length}</span>`:null}
        ${c.length>0?r`<span class="tr-stat tr-stat-err" title="Errors">\u274C ${c.length}</span>`:null}
      </div>
      <div class="tr-turn-chevron">${s?"▾":"▸"}</div>
    </div>

    ${l?r`<div class="tr-prompt ${s?"tr-prompt-full":""}">
      <div class="tr-prompt-icon">\uD83D\uDC64</div>
      <div class="tr-prompt-text">${s?e.prompt:jo(e.prompt_preview||e.prompt,120)}</div>
    </div>`:r`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon">\uD83D\uDC64</div>
      <div class="tr-prompt-text text-muted">(no prompt captured)</div>
    </div>`}

    ${s&&o.length>0?r`<div class="tr-actions">
      ${o.map((m,g)=>r`<${Nv} key=${g} action=${m} turnTs=${e.ts}/>`)}
    </div>`:null}

    ${s&&f>0?r`<div class="tr-token-bar">
      <div class="tr-token-seg tr-tok-in"
        style="flex:${d.input||0}" title="Input: ${F(d.input||0)}">
        ${d.input>0?"in "+F(d.input):""}
      </div>
      ${d.cache_read>0?r`<div class="tr-token-seg tr-tok-cache"
        style="flex:${d.cache_read}" title="Cache read: ${F(d.cache_read)}">
        cache ${F(d.cache_read)}
      </div>`:null}
      <div class="tr-token-seg tr-tok-out"
        style="flex:${d.output||0}" title="Output: ${F(d.output||0)}">
        ${d.output>0?"out "+F(d.output):""}
      </div>
    </div>`:null}
  </div>`}function jv({summary:e,transcript:t}){return e?r`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns">\uD83D\uDCAC ${e.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls">\uD83C\uDF10 ${e.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses">\uD83D\uDD27 ${e.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens">\uD83E\uDE99 ${F(e.total_tokens||0)}</span>
    ${e.compactions>0?r`<span class="tr-summary-item" title="Compactions">\uD83D\uDDDC\uFE0F ${e.compactions}</span>`:null}
    ${e.errors>0?r`<span class="tr-summary-item tr-stat-err" title="Errors">\u274C ${e.errors}</span>`:null}
    ${e.subagents>0?r`<span class="tr-summary-item" title="Subagents">\uD83E\uDD16 ${e.subagents}</span>`:null}
    ${e.duration_s>0?r`<span class="tr-summary-item" title="Duration">\u23F1\uFE0F ${Al(e.duration_s*1e3)}</span>`:null}
    ${t!=null&&t.model?r`<span class="tr-summary-item" title="Model">\uD83E\uDDE0 ${Oc(t.model)}</span>`:null}
    ${t!=null&&t.is_live?r`<span class="tr-summary-live">\u25CF LIVE</span>`:null}
    <span class="tr-summary-source">${e.source||""}</span>
  </div>`:null}function Bv(e){if(!e||!e.turns||e.turns.length===0)return!1;const t=e.turns[0];return t.type!=null&&t.actions==null}function cr(e,t){if(!e||!e.turns)return null;const s=e.turns||[],n=[];let l=null;const o={api_call:"api_call",api_response:"api_response",tool_use:"tool_use",subagent:"subagent",error:"error",hook:"tool_use"};for(const a of s)if(a.type==="user_message"){if(l&&n.push(l),l={ts:a.ts,end_ts:a.end_ts||a.ts,prompt:a.message||"",prompt_preview:a.preview||(a.message||"").slice(0,200),model:a.model||"",tokens:a.tokens||{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:a.api_calls||0,duration_ms:a.duration_ms||0,wall_ms:a.wall_ms||0,actions:[],tool_use_count:0},a.tools&&a.tools.length>0){for(const i of a.tools)l.actions.push({ts:i.ts||a.ts,kind:i.is_agent?"subagent":"tool_use",name:i.name||"",input_summary:i.args_summary||"",duration_ms:i.duration_ms||0});l.tool_use_count=a.tools.length}}else{if(a.type==="session_start"||a.type==="session_end")continue;if(a.type==="compaction")continue;if(l){const i=o[a.type];i&&(l.actions.push({ts:a.ts,kind:i,name:a.model||a.to||a.tool_name||a.hook_name||"",input_summary:a.params||a.decision||"",output_summary:a.response_preview||a.error_message||"",duration_ms:a.duration_ms||0,tokens:a.tokens,success:a.success==="true"?!0:a.success==="false"?!1:void 0}),i==="tool_use"&&l.tool_use_count++,i==="api_call"&&a.tokens&&(l.tokens.input+=a.tokens.input||0,l.tokens.output+=a.tokens.output||0,l.tokens.cache_read+=a.tokens.cache_read||0,l.api_calls++))}else{const i=o[a.type];i&&i!=="api_response"&&(l={ts:a.ts,end_ts:a.ts,prompt:"",prompt_preview:"",model:a.model||"",tokens:{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:0,duration_ms:0,wall_ms:0,actions:[],tool_use_count:0},l.actions.push({ts:a.ts,kind:i,name:a.model||a.to||a.tool_name||"",input_summary:a.params||a.decision||"",output_summary:a.response_preview||a.error_message||"",duration_ms:a.duration_ms||0,tokens:a.tokens,success:a.success==="true"?!0:a.success==="false"?!1:void 0}),i==="tool_use"&&l.tool_use_count++,i==="api_call"&&a.tokens&&(l.tokens.input+=a.tokens.input||0,l.tokens.output+=a.tokens.output||0,l.tokens.cache_read+=a.tokens.cache_read||0,l.api_calls++))}}l&&n.push(l);for(const a of n)if(a.tokens.total=(a.tokens.input||0)+(a.tokens.output||0),a.actions.length>0){const i=a.actions[a.actions.length-1];a.end_ts=Math.max(a.end_ts||0,i.ts+(i.duration_ms||0)/1e3)}return{session_id:t,turns:n,summary:e.summary||{},is_live:!1}}function Hv(){const{globalRange:e,enabledTools:t}=je(Ie),[s,n]=W([]),[l,o]=W(!0),[a,i]=W(null),[c,d]=W(null),[f,p]=W(null),[m,g]=W(!1),[k,D]=W(new Set),[T,b]=W(!1),[$,x]=W(!0);ae(()=>{o(!0);const E=e?Math.min(e.since,Date.now()/1e3-86400):Date.now()/1e3-86400,Y=e==null?void 0:e.until;kl(null,{since:E,until:Y}).then(G=>{G.sort((ne,O)=>(O.started_at||0)-(ne.started_at||0)),n(G),o(!1)}).catch(()=>o(!1))},[e]);const S=E=>t===null||t.includes(E),j=s.filter(E=>S(E.tool)),A=[...new Set(j.map(E=>E.tool))].sort();ae(()=>{(!a&&A.length>0||a&&!A.includes(a)&&A.length>0)&&i(A[0])},[A.join(",")]);const M=j.filter(E=>E.tool===a);ae(()=>{M.length>0&&(!c||!M.find(E=>E.session_id===c))&&d(M[0].session_id)},[a,M.length]);const R=be(()=>{if(!c){p(null);return}g(!0),Td(c).then(E=>{Bv(E)?p(cr(E,c)):p(E),g(!1)}).catch(()=>{const E=s.find(ne=>ne.session_id===c),Y=E!=null&&E.started_at?E.started_at-60:Date.now()/1e3-86400,G=E!=null&&E.ended_at?E.ended_at+60:Date.now()/1e3+60;Ko(c,Y,G).then(ne=>{p(cr(ne,c)),g(!1)}).catch(()=>{p(null),g(!1)})})},[c,s]);ae(R,[R]),ae(()=>{if(!$||!(f!=null&&f.is_live))return;const E=setInterval(R,5e3);return()=>clearInterval(E)},[$,f==null?void 0:f.is_live,R]);const y=be(E=>{D(Y=>{const G=new Set(Y);return G.has(E)?G.delete(E):G.add(E),G})},[]),C=be(()=>{const E=(f==null?void 0:f.turns)||[];T?(D(new Set),b(!1)):(D(new Set(E.map((Y,G)=>G))),b(!0))},[T,f]),P=((f==null?void 0:f.turns)||[]).filter(E=>E.prompt&&E.prompt.length>0||E.actions&&E.actions.length>0||E.tool_use_count>0),z=(f==null?void 0:f.summary)||null;return r`<div class="tr-container">
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${P.length>0?r`<button class="chip" onClick=${C}
          style="font-size:var(--fs-xs)">
          ${T?"⊡ Collapse all":"⊞ Expand all"}
        </button>`:null}
        ${f!=null&&f.is_live?r`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${$}
            onChange=${E=>x(E.target.checked)}/>
          Auto-refresh
        </label>`:null}
      </div>
    </div>

    <${Pv} tools=${A} activeTool=${a} onSelect=${i}/>

    <${Rv} sessions=${M} activeId=${c}
      onSelect=${d} loading=${l}/>

    <${jv} summary=${z} transcript=${f}/>

    <div class="tr-turns">
      ${m?r`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript\u2026</div>`:P.length===0?r`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                Prompts require hooks enabled: set <code>AICTL_URL</code> in your tool config
              </p>
            </div>`:P.map((E,Y)=>r`<${Iv}
              key=${Y} turn=${E} index=${Y}
              expanded=${k.has(Y)}
              onToggle=${()=>y(Y)}/>`)}
    </div>
  </div>`}const dr=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],ur={Bash:"#6b7280",Read:"#60a5fa",Edit:"#34d399",Write:"#22d3ee",Grep:"#fbbf24",Glob:"#a78bfa",Agent:"#f472b6",Prompt:"var(--green)",Compaction:"var(--yellow)",Error:"var(--red)"};function hl(e){if(!e)return"var(--fg2)";if(ur[e])return ur[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return dr[t%dr.length]}function Pc(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}function Bo(e){return e?new Date(e*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function Wv(e){return e?e<1e3?e+"ms":(e/1e3).toFixed(1)+"s":""}function zc(e){if(!e||e<=0)return"0s";if(e<60)return Math.round(e)+"s";const t=Math.floor(e/60),s=Math.round(e%60);if(e<3600)return t+"m"+(s?" "+s+"s":"");const n=Math.floor(t/60),l=t%60;return n+"h"+(l?" "+l+"m":"")}function pr(e){return e<60?Math.round(e)+"s":e<3600?Math.round(e/60)+"m":e<86400?(e/3600).toFixed(1)+"h":(e/86400).toFixed(1)+"d"}function qv(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function pa(e){const t=e.tokens||{};return(t.input||0)+(t.output||0)}function fa(e){const t=e.tokens||{};return(t.cache_read||0)+(t.cache_creation||0)}function Vv(e){return pa(e)+fa(e)}function fr(e,t){return t==="fresh"?pa(e):t==="cached"?fa(e):Vv(e)}function gl(e){return e.type==="user_message"?"Prompt":e.type==="api_call"||e.type==="api_response"?e.model||"API":e.type==="tool_use"?e.to||e.name||"Tool":e.type==="subagent"?e.to||"Agent":e.type==="compaction"?"Compaction":e.type==="error"?"Error":e.type==="hook"?e.hook_name||"Hook":e.type||"?"}function Uv({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:r`<div class="sf-tool-tabs">
    ${e.map(n=>r`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?De[n]||"var(--accent)":"transparent"};color:${De[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${mt[n]||"🔹"}</span> ${K(n)}
    </button>`)}
  </div>`}function Gv({sessions:e,activeId:t,onSelect:s,loading:n}){return n?r`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?r`<div class="sf-sess-tabs">
    ${e.map(l=>{const o=(l.exact_input_tokens||l.input_tokens||0)+(l.exact_output_tokens||l.output_tokens||0),a=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),i=l.session_id===t;return r`<button key=${l.session_id} title=${l.session_id}
        class="sf-sess-tab ${i?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${Pc(l.started_at)}</span>
        <span class="sf-stab-sid">${qv(l.session_id)}</span>
        <span class="sf-stab-dur">${zc(a)}</span>
        ${o>0&&r`<span class="sf-stab-tok">${F(o)}t</span>`}
        ${(l.files_modified||0)>0&&r`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${!l.ended_at&&r`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:r`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function Yv({bar:e,x:t,y:s}){if(!e)return null;const n=e,l=n.tokens||{},o=gl(n);return r`<div class="tc-tooltip" style="left:${t}px;top:${s}px">
    <div style="font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
      <span class="tc-legend-swatch" style="background:${hl(o)}"></span>
      ${K(o)}
    </div>
    <div class="tc-tip-row"><span class="tc-tip-label">Time</span><span>${Bo(n.ts)}</span></div>
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
      <div class="tc-tip-row"><span class="tc-tip-label">Duration</span><span>${Wv(n.duration_ms)}</span></div>`}
    ${l.input||l.output||l.cache_read?r`
      <div class="tc-tip-row"><span class="tc-tip-label">Tokens</span>
        <span>in:${F(l.input||0)} out:${F(l.output||0)}${l.cache_read?" cache:"+F(l.cache_read):""}${l.cache_creation?" cache_w:"+F(l.cache_creation):""}</span>
      </div>`:null}
    ${n.type==="error"&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Error</span><span style="color:var(--red)">${n.error_type||""}: ${(n.error_message||"").slice(0,100)}</span></div>`}
    ${n.type==="compaction"&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Count</span><span>#${n.compaction_count||""}</span></div>`}
    ${n.agent_name&&r`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${n.agent_name}</span></div>`}
  </div>`}function Kv({summary:e}){if(!e||!e.total_tokens)return null;const t=[["Prompts",e.total_turns],["API Calls",e.total_api_calls],["Tools",e.total_tool_uses],["Tokens",F(e.total_tokens)],["Duration",zc(e.duration_s)]].filter(([,s])=>s);return r`<div class="tc-summary">
    ${t.map(([s,n])=>r`<div class="tc-summary-item">
      <div class="tc-summary-val">${n}</div>
      <div class="tc-summary-label">${s}</div>
    </div>`)}
  </div>`}const al=110,Jv=16,vr=al+Jv,Zv=30;function Qv(e){const t=[];for(let s=0;s<e.length;s++){if(s>0){const n=e[s].ts-e[s-1].ts;n>Zv&&t.push({type:"gap",endTs:e[s-1].ts,startTs:e[s].ts,gap:n})}t.push({type:"bar",bar:e[s]})}return t}function Xv({entities:e,selected:t,onToggle:s,onAll:n,onNone:l}){return r`<div class="tc-filter">
    <span class="tc-filter-label">Entities</span>
    <button class="tc-filter-btn" onClick=${n}>All</button>
    <button class="tc-filter-btn" onClick=${l}>None</button>
    ${e.map(o=>{const a=t.has(o);return r`<label key=${o} class="tc-filter-check ${a?"active":""}"
        style="--swatch:${hl(o)}">
        <input type="checkbox" checked=${a}
          onChange=${()=>s(o)}/>
        <span class="tc-legend-swatch" style="background:${hl(o)}"></span>
        ${K(o)}
      </label>`})}
  </div>`}function em({mode:e,onChange:t}){return r`<div class="tc-filter">
    <span class="tc-filter-label">Tokens</span>
    ${[["all","All Tokens"],["fresh","Non-Cached"],["cached","Cached Only"]].map(([n,l])=>r`<label key=${n}
      class="tc-filter-check ${e===n?"active":""}">
      <input type="radio" name="tc-tok-mode" checked=${e===n}
        onChange=${()=>t(n)}/>
      ${l}
    </label>`)}
  </div>`}function tm({bars:e,tokenMode:t,onHover:s,onLeave:n}){if(!e.length)return r`<div class="empty-state" style="padding:var(--sp-8)">
    <p>No matching events.</p>
  </div>`;const l=Qv(e),o=Math.max(1,...e.map(d=>fr(d,t))),a=[];l.forEach((d,f)=>{d.type==="bar"&&a.push(f)});const i=Math.max(1,Math.floor(a.length/Math.ceil(a.length/20))),c=new Set;return a.forEach((d,f)=>{(f===0||f===a.length-1||f%i===0)&&c.add(d)}),r`<div class="tc-flow">
    ${l.map((d,f)=>{if(d.type==="gap"){const R=Bo(d.endTs)+" → "+Bo(d.startTs)+"  ("+pr(d.gap)+" gap)";return r`<div key=${"g"+f} class="tc-flow-slot" style="height:${vr}px" title=${R}>
          <div class="tc-flow-gap-line" style="height:${al}px"></div>
          <div class="tc-flow-time">${pr(d.gap)}</div>
        </div>`}const p=d.bar,m=fr(p,t),g=o>0?Math.max(.08,Math.log1p(m)/Math.log1p(o)):.08,k=Math.max(6,g*al),D=gl(p),T=hl(D),b=pa(p),$=fa(p),x=b+$;let S,j;t==="cached"?(S=0,j=100):t==="fresh"?(S=100,j=0):x>0?(S=Math.round(b/x*100),j=100-S):(S=100,j=0);const A=j>0,M=c.has(f);return r`<div key=${f} class="tc-flow-slot" style="height:${vr}px"
        onMouseEnter=${R=>s(p,R)}
        onMouseLeave=${n}>
        <div class="tc-flow-bar-area" style="height:${al}px">
          <div class="tc-flow-fill ${A?"tc-split":""}"
            style="height:${k}px;--bar-color:${T}">
            ${A&&r`
              ${S>0&&r`<div class="tc-fill-fresh" style="height:${S}%"></div>`}
              <div class="tc-fill-cached" style="height:${S>0?j:100}%"></div>`}
          </div>
        </div>
        <div class="tc-flow-time">${M?Pc(p.ts):""}</div>
      </div>`})}
  </div>`}function sm(){const{snap:e,globalRange:t,enabledTools:s}=je(Ie),[n,l]=W([]),[o,a]=W(!0),[i,c]=W(null),[d,f]=W(null),[p,m]=W(null),[g,k]=W(!1),[D,T]=W(null),[b,$]=W(null),[x,S]=W("all"),j=lt(null);ae(()=>{a(!0);const I=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,se=t==null?void 0:t.until;kl(null,{since:I,until:se}).then(ee=>{ee.sort((V,ye)=>(ye.started_at||0)-(V.started_at||0)),l(ee),a(!1)}).catch(()=>a(!1))},[t]);const A=I=>s===null||s.includes(I),M=n.filter(I=>A(I.tool)),R=[...new Set(M.map(I=>I.tool))].sort();ae(()=>{(!i&&R.length>0||i&&!R.includes(i)&&R.length>0)&&c(R[0])},[R.join(",")]);const y=M.filter(I=>I.tool===i);ae(()=>{y.length>0&&(!d||!y.find(I=>I.session_id===d))&&f(y[0].session_id)},[i,y.length]),ae(()=>{if(!d){m(null);return}k(!0);const I=n.find(V=>V.session_id===d),se=I!=null&&I.started_at?I.started_at-60:Date.now()/1e3-86400,ee=I!=null&&I.ended_at?I.ended_at+60:Date.now()/1e3+60;Ko(d,se,ee).then(V=>{m(V),k(!1),$(null)}).catch(()=>{m(null),k(!1)})},[d]);const{allBars:C,allEntities:P}=re(()=>{const se=((p==null?void 0:p.turns)||[]).filter(V=>["user_message","api_call","api_response","tool_use","compaction","subagent","error","hook"].includes(V.type)),ee=new Set;for(const V of se)ee.add(gl(V));return{allBars:se,allEntities:[...ee].sort()}},[p]),z=b||new Set(P),E=re(()=>C.filter(I=>z.has(gl(I))),[C,z]),Y=be(I=>{$(se=>{const ee=new Set(se||P);return ee.has(I)?ee.delete(I):ee.add(I),ee})},[P]),G=be(()=>$(null),[]),ne=be(()=>$(new Set),[]),O=be((I,se)=>{var Pe;const ee=(Pe=j.current)==null?void 0:Pe.getBoundingClientRect();if(!ee)return;const V=Math.min(se.clientX-ee.left+12,ee.width-320),ye=se.clientY-ee.top+12;T({bar:I,x:V,y:ye})},[]),B=be(()=>T(null),[]),U=(p==null?void 0:p.summary)||{};return r`<div class="tc-container" ref=${j}>
    <${Uv} tools=${R} activeTool=${i} onSelect=${c}/>
    <${Gv} sessions=${y} activeId=${d}
      onSelect=${f} loading=${o}/>
    <${Kv} summary=${U}/>

    ${g?r`<div class="loading-state" style="padding:var(--sp-8)">Loading timeline...</div>`:C.length===0?r`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
          </div>`:r`
          <div class="tc-controls">
            <${Xv} entities=${P} selected=${z}
              onToggle=${Y} onAll=${G} onNone=${ne}/>
            <${em} mode=${x} onChange=${S}/>
          </div>
          <${tm} bars=${E} tokenMode=${x}
            onHover=${O} onLeave=${B}/>
          ${D&&r`<${Yv} bar=${D.bar} x=${D.x} y=${D.y}/>`}
        `}
  </div>`}const nm={enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).",enabled:"Whether agent/agentic mode is active.",autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode allows the agent to execute tool calls without confirmation prompts. Use with caution.",autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.",skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",vimMode:"Enables Vim-style keybindings in the Gemini CLI.",approvalMode:"Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).",notifications:"Enables OS notifications for prompt alerts and session completion.",respectGeminiIgnore:"Controls whether the CLI respects patterns in .geminiignore files.",additionalIgnores:"Number of extra patterns added to the global file ignore list.",lineNumbers:"Shows line numbers in code blocks within the chat interface.",alternateScreen:"Uses the terminal alternate buffer to preserve shell scrollback history.",hideContext:"Hides the summary of attached files/context above the input prompt.",effort:"Reasoning effort level for the model (e.g., standard, high).",temperature:"Sampling temperature for model requests. 0 = deterministic; higher = more creative.",budget:"Maximum token budget for reasoning/extended thinking.",coreTools:"Number of built-in tools explicitly enabled for the agent.",excludeTools:"Number of tools explicitly disabled for safety or cost control.",customAgents:"Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks.",webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."};function lm(e){return nm[e]||""}function om({v:e}){return e===!0?r`<span style="color:var(--green);font-weight:600">on</span>`:e===!1?r`<span style="color:var(--red);opacity:0.8">off</span>`:e==null||e===""?r`<span class="text-muted">—</span>`:typeof e=="object"?r`<span class="mono" style="font-size:var(--fs-xs)">${JSON.stringify(e)}</span>`:r`<span class="mono">${String(e)}</span>`}function nn({k:e,v:t,indent:s}){const n=e.replace(/([A-Z])/g," $1").replace(/^./,o=>o.toUpperCase()),l=lm(e);return r`<div
    title=${l}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${s?"var(--sp-6)":"var(--sp-4)"};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${l?"help":"default"}">
    <span style="color:var(--fg2)">${n}${l?r`<span style="color:var(--fg3);margin-left:3px;font-size:0.6em">?</span>`:""}</span>
    <${om} v=${t}/>
  </div>`}function Fc({otel:e}){if(!e||!e.enabled&&!e.source)return null;const t=e.enabled;return r`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:${t?"var(--green)":"var(--fg3)"};padding:var(--sp-2) var(--sp-4) var(--sp-1)">
      OpenTelemetry ${t?"● on":"○ off"}
    </div>
    <div style="border:1px solid ${t?"var(--green)":"var(--bg2)"};border-radius:4px;overflow:hidden;
                background:${t?"color-mix(in srgb,var(--green) 4%,transparent)":"transparent"}">
      ${t&&r`<${nn} k="exporter" v=${e.exporter||"—"}/>`}
      ${e.endpoint&&r`<${nn} k="endpoint" v=${e.endpoint}/>`}
      ${e.file_path&&r`<${nn} k="file_path" v=${e.file_path}/>`}
      ${e.capture_content!==void 0&&r`<${nn} k="capture_content" v=${!!e.capture_content}/>`}
      ${!t&&e.source&&r`<${nn} k="source" v=${e.source}/>`}
    </div>
  </div>`}function Ho({name:e,items:t}){const s=Object.entries(t);return s.length?r`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${e}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${s.map(([n,l])=>r`<${nn} key=${n} k=${n} v=${l}/>`)}
    </div>
  </div>`:null}function am({cfg:e,label:t}){var i,c;const s=mt[e.tool]||"🔹",n=De[e.tool]||"var(--fg2)",l=Object.entries(e.feature_groups||{}),o=Object.entries(e.settings||{}).filter(([d])=>!["agent_historySummarizationMode","agent_maxRequests","debug_requestLoggerMaxEntries","planModel","implementModel"].includes(d));return((i=e.otel)==null?void 0:i.enabled)||((c=e.otel)==null?void 0:c.source)||l.length||o.length||(e.hints||[]).length||(e.mcp_servers||[]).length||(e.extensions||[]).length?r`<div style="background:var(--bg);border:2px solid ${n};border-radius:6px;overflow:hidden;
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
      <${Fc} otel=${e.otel}/>
      ${l.map(([d,f])=>r`<${Ho} key=${d} name=${d} items=${f}/>`)}
      ${o.length>0&&r`<${Ho} name="Settings" items=${Object.fromEntries(o)}/>`}
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
        ${e.hints.map((d,f)=>r`<div key=${f} class="text-orange" style="font-size:var(--fs-sm);padding:1px 0">
          <span style="margin-right:var(--sp-2)">💡</span>${d}
        </div>`)}
      </div>`}
    </div>
  </div>`:null}function im({cfg:e}){var o,a,i,c;if(!e)return null;const t=Object.entries(e.feature_groups||{});if(!t.length&&!((o=e.otel)!=null&&o.enabled)&&!((a=e.otel)!=null&&a.source))return null;const n=(((i=e.feature_groups)==null?void 0:i.Safety)||{}).globalAutoApprove===!0,l=(((c=e.feature_groups)==null?void 0:c.Agent)||{}).autoReply===!0;return r`<div style="background:var(--bg);border:2px solid #007acc;border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,#007acc 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid #007acc">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:#007acc">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${n&&r`<span class="badge" style="margin-left:auto;background:var(--red);color:#fff;font-weight:700"><${ml} name="alert-triangle" size="0.9em"/> YOLO MODE ON</span>`}
      ${!n&&l&&r`<span class="badge" style="margin-left:auto;background:var(--orange);color:#fff"><${ml} name="alert-triangle" size="0.9em"/> auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${Fc} otel=${e.otel}/>
      ${t.map(([d,f])=>r`<${Ho} key=${d} name=${d} items=${f}/>`)}
    </div>
  </div>`}function rm({snap:e}){var l,o,a;const t=De.aictl||"#94a3b8",s=Object.entries(((l=e==null?void 0:e.live_monitor)==null?void 0:l.diagnostics)||{}),n=[...((o=e==null?void 0:e.live_monitor)==null?void 0:o.workspace_paths)||[],...((a=e==null?void 0:e.live_monitor)==null?void 0:a.state_paths)||[]];return!s.length&&!n.length?null:r`<div style="background:var(--bg);border:2px solid ${t};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${t} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${t}">
      <span><${ml} name="settings" size="1em"/></span>
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
  </div>`}function cm(){const{snap:e}=je(Ie),t=re(()=>e!=null&&e.tool_configs?e.tool_configs:[],[e]),s=re(()=>{const o={};return((e==null?void 0:e.tools)||[]).forEach(a=>{o[a.tool]=a.label}),o},[e]);if(!e)return r`<p class="loading-state">Loading...</p>`;if(!t.length)return r`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const n=t.find(o=>o.tool==="vscode"),l=t.filter(o=>o.tool!=="vscode");return r`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${n&&r`<${im} cfg=${n}/>`}
    ${l.map(o=>r`<${am} key=${o.tool} cfg=${o} label=${s[o.tool]||o.tool}/>`)}
    <${rm} snap=${e}/>
  </div>`}const Xn={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},dm=["project","global","shadow","session","external"],el=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function um(e,t){const s=Es(e),n=Es(t);if(!s)return"(unknown)";if(n&&s.startsWith(n+"/")){const l=s.slice(n.length+1).split("/")[0];return l.startsWith(".")?"(root)":l}return s.includes("/.claude/projects/")?"(shadow)":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")?"(global)":"(other)"}function pm(e){if(!e)return"unknown";const t=Es(e).split("/"),s=t.pop()||"unknown",n=s.lastIndexOf("."),l=n>0?s.slice(0,n):s;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test(l)){const o=t.pop();if(o)return o}return l}function fm(){const{snap:e}=je(Ie),[t,s]=W(null),n=re(()=>{if(!e)return null;const o=e.tools.filter(T=>T.tool!=="aictl"&&T.tool!=="any");if(!o.length)return null;const a=e.root||"",i={},c={},d={},f={yes:0,"on-demand":0,conditional:0,no:0};let p=0;for(const T of o)for(const b of T.files){const $=b.kind||"other",x=b.scope||"external",S=(b.sent_to_llm||"no").toLowerCase(),j=b.tokens||0,A=um(b.path,a),M=pm(b.path);i[$]||(i[$]={tokens:0,files:0,projects:{}}),i[$].tokens+=j,i[$].files+=1,i[$].projects[A]||(i[$].projects[A]={tokens:0,count:0}),i[$].projects[A].tokens+=j,i[$].projects[A].count+=1,d[A]||(d[A]={tokens:0,count:0,cats:{}}),d[A].tokens+=j,d[A].count+=1,d[A].cats[$]||(d[A].cats[$]={tokens:0,count:0,items:{}}),d[A].cats[$].tokens+=j,d[A].cats[$].count+=1,d[A].cats[$].items[M]||(d[A].cats[$].items[M]=0),d[A].cats[$].items[M]+=j,c[x]||(c[x]={tokens:0,files:0}),c[x].tokens+=j,c[x].files+=1,f[S]!==void 0?f[S]+=j:f.no+=j,p+=j}const m=Object.entries(i).sort((T,b)=>b[1].tokens-T[1].tokens),g=dm.filter(T=>c[T]).map(T=>[T,c[T]]),k=Object.entries(d).sort((T,b)=>b[1].tokens-T[1].tokens),D=o.map(T=>({tool:T.tool,label:T.label,tokens:T.files.reduce((b,$)=>b+$.tokens,0),files:T.files.length,sentYes:T.files.filter(b=>(b.sent_to_llm||"").toLowerCase()==="yes").reduce((b,$)=>b+$.tokens,0)})).filter(T=>T.tokens>0).sort((T,b)=>b.tokens-T.tokens).slice(0,8);return{cats:m,scopes:g,byPolicy:f,totalTokens:p,perTool:D,byCat:i,byProj:d,projList:k}},[e]);if(!n)return r`<p class="empty-state">No file data available.</p>`;if(!n.totalTokens)return r`<p class="empty-state">No token data collected yet.</p>`;const l=Math.max(...n.cats.map(([,o])=>o.tokens),1);return r`<div class="diag-card" role="region" aria-label="Context window map">
    <h3 style=${{marginBottom:"var(--sp-5)"}}>Context Window Map</h3>

    <!-- Policy summary -->
    <div class="flex-row flex-wrap gap-md mb-md">
      <span class="badge--accent badge" data-dp="overview.context_map.sent_to_llm" style="background:var(--green);color:var(--bg)">
        Sent to LLM: ${F(n.byPolicy.yes)} tok</span>
      <span class="badge" data-dp="overview.context_map.on_demand" style="background:var(--yellow);color:var(--bg)">
        On-demand: ${F(n.byPolicy["on-demand"])} tok</span>
      <span class="badge" data-dp="overview.context_map.conditional" style="background:var(--orange);color:var(--bg)">
        Conditional: ${F(n.byPolicy.conditional)} tok</span>
      <span class="badge--muted badge" data-dp="overview.context_map.not_sent">
        Not sent: ${F(n.byPolicy.no)} tok</span>
    </div>

    <!-- Top stacked bar: tokens by category -->
    <div class="mb-md">
      <div class="es-section-title">Tokens by Category (${F(n.totalTokens)} total)</div>
      <div class="overflow-hidden" style="display:flex;height:24px;border-radius:4px;background:var(--bg)">
        ${n.cats.map(([o,a])=>{const i=a.tokens/n.totalTokens*100;return i<.5?null:r`<div key=${o} style="width:${i}%;background:${Xn[o]||"var(--fg2)"};
            position:relative;min-width:2px"
            title="${o}: ${F(a.tokens)} tokens (${a.files} files)">
            ${i>8?r`<span class="text-ellipsis text-bold" style="position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;font-size:var(--fs-2xs);color:var(--bg);padding:0 2px">${o}</span>`:null}
          </div>`})}
      </div>
    </div>

    <!-- Per-category bars with project sub-segments -->
    <div class="mb-md">
      ${n.cats.map(([o,a])=>{const i=Object.entries(a.projects).sort((d,f)=>f[1].tokens-d[1].tokens),c=a.tokens/l*100;return r`<div key=${o} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);font-size:var(--fs-base)">
          <span class="text-bold text-right" style="width:80px;color:${Xn[o]||"var(--fg2)"};flex-shrink:0">${o}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${c}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${i.map(([d,f],p)=>{const m=a.tokens>0?f.tokens/a.tokens*100:0;if(m<.5)return null;const g=!t||t===d;return r`<div key=${d} style="width:${m}%;height:100%;
                  background:${Xn[o]||"var(--fg2)"};
                  opacity:${g?Math.max(.3,1-p*.12):.12};
                  border-right:1px solid var(--bg);
                  display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px;
                  cursor:pointer;transition:opacity 0.15s"
                  title="${d}: ${F(f.tokens)} tok (${f.count} files)"
                  onClick=${()=>s(t===d?null:d)}>
                  ${m>12&&c>15?r`<span style="font-size:9px;color:var(--bg);
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:600">${d}</span>`:null}
                </div>`})}
            </div>
          </div>
          <span class="text-right text-muted" style="min-width:55px">${F(a.tokens)} tok</span>
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
          ${o} (${F(a.tokens)})
        </button>`})}
    </div>

    <!-- Tab content: per-category bars with item sub-segments -->
    ${t&&n.byProj[t]?(()=>{const o=n.byProj[t],a=Object.entries(o.cats).sort((c,d)=>d[1].tokens-c[1].tokens),i=Math.max(...a.map(([,c])=>c.tokens),1);return r`<div class="mb-md" style="background:var(--bg2);border-radius:6px;padding:var(--sp-4)">
        <div class="es-section-title">${t} \u2014 ${F(o.tokens)} tokens across ${o.count} files</div>
        ${a.map(([c,d])=>{const f=Object.entries(d.items).sort((k,D)=>D[1]-k[1]),p=f.slice(0,15),m=f.slice(15).reduce((k,[,D])=>k+D,0);m>0&&p.push(["(other)",m]);const g=d.tokens/i*100;return r`<div key=${c} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${Xn[c]||"var(--fg2)"};flex-shrink:0">${c}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${g}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${p.map(([k,D],T)=>{const b=d.tokens>0?D/d.tokens*100:0;if(b<.3)return null;const $=el[T%el.length];return r`<div key=${k} style="width:${b}%;height:100%;background:${$};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${k}: ${F(D)} tok">
                      ${b>10&&g>20?r`<span style="font-size:9px;color:#111;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:700">${k}</span>`:null}
                    </div>`})}
                </div>
              </div>
              <span class="text-right text-muted" style="min-width:55px">${F(d.tokens)} tok</span>
              <span class="text-right text-muted" style="min-width:30px">${d.count}f</span>
            </div>
            <!-- Item legend -->
            <div style="padding-left:88px;display:flex;flex-wrap:wrap;gap:var(--sp-1) var(--sp-3);margin-top:3px">
              ${p.map(([k,D],T)=>r`<span key=${k}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${el[T%el.length]};flex-shrink:0"></span>
                <span class="text-muted">${k} ${F(D)}</span>
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
          <span class="text-muted">${a.files} files \u00B7 ${F(a.tokens)} tok</span>
        </div>`)}
      </div>
      <div>
        <div class="es-section-title">By Tool</div>
        ${n.perTool.map(o=>r`<div key=${o.tool} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span><span style="color:${De[o.tool]||"var(--fg2)"}">${mt[o.tool]||"🔹"}</span> ${K(o.label)}</span>
          <span class="text-muted">${F(o.sentYes)} sent \u00B7 ${F(o.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}const vm={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"};function mm(e){if(!e||e<0)return"—";const t=Math.floor(e/3600),s=Math.floor(e%3600/60);return t>0?`${t}h ${s}m`:`${s}m`}function hm(){var m,g,k,D,T;const{snap:e}=je(Ie),[t,s]=W(null),[n,l]=W(null);ae(()=>{let b=!0;const $=()=>{zr().then(S=>{b&&s(S)}).catch(()=>{}),zd().then(S=>{b&&l(S)}).catch(()=>{})};$();const x=setInterval($,15e3);return()=>{b=!1,clearInterval(x)}},[]);const o=re(()=>{if(!e)return[];const b=e.tool_telemetry||[];return e.tools.filter($=>$.tool!=="aictl"&&$.tool!=="any").map($=>{var R,y,C,P,z;const x=b.find(E=>E.tool===$.tool),S=$.live||{},j=S.last_seen_at||0,A=j>0?Math.floor(Date.now()/1e3-j):-1,M=A>3600||A<0;return{tool:$.tool,label:$.label,source:(x==null?void 0:x.source)||(S.session_count?"live-monitor":"discovery"),confidence:(x==null?void 0:x.confidence)||((R=S.token_estimate)==null?void 0:R.confidence)||0,inputTokens:(x==null?void 0:x.input_tokens)||0,outputTokens:(x==null?void 0:x.output_tokens)||0,cost:(x==null?void 0:x.cost_usd)||0,sessions:(x==null?void 0:x.total_sessions)||S.session_count||0,errors:((y=x==null?void 0:x.errors)==null?void 0:y.length)||0,lastError:((C=x==null?void 0:x.errors)==null?void 0:C[0])||null,lastSeen:A,stale:M,fileCount:$.files.length,procCount:$.processes.length,hasLive:!!$.live,hasOtel:!!((z=(P=S.sources||[]).includes)!=null&&z.call(P,"otel"))}}).sort(($,x)=>x.inputTokens+x.outputTokens-($.inputTokens+$.outputTokens))},[e]),a=re(()=>{var b;return(b=e==null?void 0:e.live_monitor)!=null&&b.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([$,x])=>({name:$,status:x.status||"unknown",mode:x.mode||"",detail:x.detail||""})):[]},[e]);if(!e)return null;const i=o.length,c=o.filter(b=>b.inputTokens+b.outputTokens>0).length,d=o.filter(b=>b.hasLive).length,f=o.filter(b=>b.stale&&b.hasLive).length,p=o.reduce((b,$)=>b+$.errors,0);return r`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--bg)">${c}/${i} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--bg)">${d} live</span>
      ${f>0?r`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--bg)">${f} stale</span>`:null}
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
          <div class="metric-chip-value">${mm(n.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${n.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${F((((g=n.db)==null?void 0:g.metrics_count)||0)+(((k=n.db)==null?void 0:k.tool_metrics_count)||0)+(((D=n.db)==null?void 0:D.events_count)||0)+(((T=n.db)==null?void 0:T.samples_count)||0))}</div>
        </div>
      </div>
      ${n.sink?r`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Emitted</div>
          <div class="metric-chip-value">${F(n.sink.total_emitted||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Flushed</div>
          <div class="metric-chip-value">${F(n.sink.total_flushed||0)}</div>
        </div>
        <div class="metric-chip" style="${(n.sink.total_dropped||0)>0?"background:rgba(248,113,113,0.15);border:1px solid var(--red)":""}">
          <div class="metric-chip-label" style="${(n.sink.total_dropped||0)>0?"color:var(--red);font-weight:600":"color:var(--fg2)"}">Dropped</div>
          <div class="metric-chip-value" style="${(n.sink.total_dropped||0)>0?"color:var(--red)":""}">${F(n.sink.total_dropped||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Tracked</div>
          <div class="metric-chip-value">${F(n.sink.metrics_tracked||0)}</div>
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
        ${t.last_receive_at>0?r`<span class="text-muted">Last: ${Bt(t.last_receive_at)}</span>`:null}
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
          <tbody>${o.map(b=>{var $;return r`<tr key=${b.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${b.stale&&!b.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <span style="color:${De[b.tool]||"var(--fg2)"}">${mt[b.tool]||"🔹"}</span>
              ${K(b.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${b.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${b.confidence>=.9?"var(--green)":b.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${b.confidence>0?_e(b.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${b.inputTokens?F(b.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${b.outputTokens?F(b.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${b.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${b.errors>0?r`<span class="text-red" title=${(($=b.lastError)==null?void 0:$.message)||""}>${b.errors}</span>`:r`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${b.lastSeen>=0?r`<span style="color:${b.stale?"var(--orange)":"var(--fg2)"}">${Bt(Date.now()/1e3-b.lastSeen)}</span>`:r`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${b.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Collector pipeline status -->
    ${a.length>0?r`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${a.map(b=>r`<div key=${b.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${vm[b.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${b.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${b.status}</span>
          </div>
          ${b.detail?r`<div class="text-xs text-muted" style="margin-top:2px">${K(b.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let _o=null;function gm(){return _o?Promise.resolve(_o):Fd().then(e=>{const t={};for(const s of e||[])t[s.key]=s;return _o=t,t}).catch(()=>({}))}function _m(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),s=t.match(/^[^.!?]+[.!?]/);return s?s[0].trim():t.slice(0,120)}const $m={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},ym={raw:"raw",deduced:"deduced",aggregated:"agg"};function bm(){const[e,t]=W(null),[s,n]=W({x:0,y:0}),[l,o]=W(!1),a=lt(null),i=lt(null),c=be(T=>{const b=T.getAttribute("data-dp");b&&gm().then($=>{const x=$[b];if(!x)return;const S=T.getBoundingClientRect();n({x:S.left,y:S.bottom+4}),t(x),o(!1)})},[]),d=be(()=>{i.current=setTimeout(()=>{t(null),o(!1)},120)},[]),f=be(()=>{i.current&&(clearTimeout(i.current),i.current=null)},[]);if(ae(()=>{function T(x){const S=x.target.closest("[data-dp]");S&&(f(),c(S))}function b(x){x.target.closest("[data-dp]")&&d()}function $(x){x.target.closest("[data-dp]")&&e&&(x.preventDefault(),o(j=>!j))}return document.addEventListener("mouseover",T,!0),document.addEventListener("mouseout",b,!0),document.addEventListener("click",$,!0),()=>{document.removeEventListener("mouseover",T,!0),document.removeEventListener("mouseout",b,!0),document.removeEventListener("click",$,!0)}},[c,d,f,e]),!e)return null;const m=Math.min(s.x,window.innerWidth-320-8),g=Math.min(s.y,window.innerHeight-180),k=ym[e.source_type]||e.source_type,D=$m[e.unit]||e.unit;return r`<div class="dp-tooltip" ref=${a}
    style=${"left:"+m+"px;top:"+g+"px"}
    onMouseEnter=${f} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${k}</span>
      ${D&&r`<span class="dp-tooltip-unit">${D}</span>`}
    </div>
    <div class="dp-tooltip-body">${_m(e.explanation)}</div>
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
  </div>`}class mr extends Dn{constructor(t){super(t),this.state={hasError:!1,error:null}}static getDerivedStateFromError(t){return{hasError:!0,error:t}}componentDidCatch(t,s){console.error("Dashboard error:",t,s)}render(){var t;return this.state.hasError?r`<div class="text-red" style="padding:var(--sp-10)">
        <h3>Something went wrong</h3>
        <pre style="font-size:0.75rem;margin-top:var(--sp-5)">${((t=this.state.error)==null?void 0:t.message)||"Unknown error"}</pre>
        <button class="prev-btn" style="margin-top:var(--sp-5)" onClick=${()=>this.setState({hasError:!1,error:null})}>Try again</button>
      </div>`:this.props.children}}function Oe({tabName:e,children:t}){return r`<${mr} key=${e}>${t}</${mr}>`}function en(e,t){try{localStorage.setItem("aictl-pref-"+e,JSON.stringify(t))}catch{}}function $o(e,t){try{const s=localStorage.getItem("aictl-pref-"+e);return s!=null?JSON.parse(s):t}catch{return t}}function tl(e){const t=new Date(e*1e3),s=t.getTimezoneOffset();return new Date(t.getTime()-s*6e4).toISOString().slice(0,16)}const Wo=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],_l={};Wo.forEach(e=>{_l[e.id]=e.seconds});const km={snap:null,history:null,connected:!1,activeTab:$o("active_tab","overview"),globalRange:(()=>{const e=$o("range","live"),t=_l[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:$o("tool_filter",null)};function xm(e,t){switch(t.type){case"SSE_UPDATE":{const s=t.payload,n=e.snap?Xd(e.snap,s):s,l=eu(e.history,s);return{...e,snap:n,history:l,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const yo=tn.tabs;function wm({globalRange:e,onPreset:t,onApplyCustom:s}){const[n,l]=W(!1),o=lt(null),a=lt(null),i=be(()=>{l(!0),requestAnimationFrame(()=>{if(o.current&&a.current)if(e.until!=null)o.current.value=tl(e.since),a.current.value=tl(e.until);else{const d=Wo.find(m=>m.id===e.id),f=Date.now()/1e3,p=(d==null?void 0:d.seconds)||86400;o.current.value=tl(f-p),a.current.value=tl(f)}})},[e]),c=be(()=>{var D,T;const d=(D=o.current)==null?void 0:D.value,f=(T=a.current)==null?void 0:T.value;if(!d||!f)return;const p=new Date(d).getTime(),m=new Date(f).getTime();if(!Number.isFinite(p)||!Number.isFinite(m))return;const g=p/1e3,k=m/1e3;k<=g||(s(g,k),l(!1))},[s]);return r`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${Wo.map(d=>r`<button key=${d.id}
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
  </div>`}const il=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]);function Sm({snap:e,enabledTools:t,onToggle:s,onSetAll:n}){if(!e)return null;const l=e.tools.filter(a=>!a.meta);if(!l.length)return null;const o=t===null;return t?t.length:l.length,r`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${o}
        onChange=${()=>n(o?[]:null)} />
      <span class="text-muted">All (${l.length})</span>
    </label>
    ${l.sort((a,i)=>a.label.localeCompare(i.label)).map(a=>{const i=il.has(a.tool),c=t===null||t.includes(a.tool),d=De[a.tool]||"var(--fg2)",f=mt[a.tool]||"🔹";return r`<label key=${a.tool} class=${"tool-filter-item"+(i?"":" tool-unverified")}
        title=${i?"":"Not yet verified — discovery only"}>
        <input type="checkbox" checked=${c} disabled=${!i}
          onChange=${()=>i&&s(a.tool)} />
        <span style=${"color:"+d}>${f}</span>
        <span>${a.label}</span>
      </label>`})}
  </div>`}function Tm({mcpDetail:e}){return!e||!e.length?r`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`:r`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{t.status;const s=jd[t.status]||"var(--fg3)",n=De[t.tool]||"var(--fg3)";return r`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${s}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${K(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${n};white-space:nowrap;flex-shrink:0">${K(t.tool)}</span>
      </div>`})}
  </div>`}function Cm({label:e,value:t,mcpDetail:s}){const[n,l]=W(!1);return r`<div style="position:relative;cursor:default"
    onMouseEnter=${()=>l(!0)}
    onMouseLeave=${()=>l(!1)}>
    <${Fo} label=${e} value=${t} sm=${!0}/>
    ${n&&r`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      ${s.length>0?r`<${Tm} mcpDetail=${s}/>`:r`<div style="color:var(--fg3);font-size:var(--fs-sm)">None configured</div>`}
    </div>`}
  </div>`}function Mm({snap:e,history:t,globalRange:s}){const[n,l]=W(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),o=be(()=>{l(d=>{const f=!d;try{localStorage.setItem("aictl-header-expanded",String(f))}catch{}return f})},[]),a=d=>!t||!t.ts||t.ts.length<2?null:[t.ts,t[d]],i=(e==null?void 0:e.cpu_cores)||1,c={cores:i};return r`
    <div style=${"display:grid;grid-template-columns:repeat("+tn.sparklines.length+",1fr);gap:var(--sp-4);margin-bottom:var(--sp-4)"}>
      ${tn.sparklines.map(d=>{const f=e?e["total_"+d.field]??e[d.field]??"":"",p=ao(f,d.format,d.suffix,d.multiply),m=d.yMaxExpr?oi(d.yMaxExpr,c):void 0,g=(d.refLines||[]).map(k=>({value:oi(k.valueExpr,c),label:(k.label||"").replace("{cores}",i)})).filter(k=>k.value!=null);return r`<${ts} key=${d.field} label=${d.label} value=${p}
          data=${a(d.field)} chartColor=${d.color||"var(--accent)"}
          smooth=${!!d.smooth} refLines=${g.length?g:void 0} yMax=${m} dp=${d.dp}/>`})}
    </div>

    <div class=${n?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>

      <!-- Row 1: (CPU bars + Live traffic) | Live metric boxes -->
      <div class="mb-sm" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);align-items:start">
        <!-- Left: per-core CPU bars + live traffic bar -->
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${Af} perCore=${(e==null?void 0:e.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${Yi} snap=${e} mode="traffic"/></div>
        </div>
        <!-- Right: 4 live metric boxes in 2×2 grid -->
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${tn.liveMetrics.map(d=>{const f=e?e[d.field]??"":"",p=ao(f,d.format,d.suffix,d.multiply);return r`<${Fo} key=${d.field} label=${d.label} value=${p} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>

      <!-- Row 2: Inventory — full width; MCP box shows hover popover -->
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div style="display:grid;grid-template-columns:repeat(${tn.inventory.length},1fr);gap:var(--sp-2)">
          ${tn.inventory.map(d=>{const f=e?e[d.field]??"":"",p=ao(f,d.format,d.suffix,d.multiply);return d.field==="total_mcp_servers"?r`<${Cm} key=${d.field} label=${d.label} value=${p} mcpDetail=${(e==null?void 0:e.mcp_detail)||[]}/>`:r`<${Fo} key=${d.field} label=${d.label} value=${p} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
        </div>
      </div>

      <!-- Row 3: CSV footprint — full width -->
      <div class="mb-sm"><${Yi} snap=${e} mode="files"/></div>

    </div>
    <button class="header-toggle" onClick=${o} aria-label="Toggle details">
      ${n?"▲ less":"▼ more"}
    </button>
  `}function Em(){var ne;const[e,t]=Lr(xm,km),{snap:s,history:n,connected:l,activeTab:o,globalRange:a,searchQuery:i,theme:c,viewerPath:d,events:f,enabledTools:p}=e,[m,g]=W(null),k=lt(null);ae(()=>{document.documentElement.setAttribute("data-theme",c);try{localStorage.setItem("aictl-theme",c)}catch{}},[c]);const D=be(()=>{t({type:"SET_THEME",payload:lo[(lo.indexOf(c)+1)%lo.length]})},[c]),T=be(O=>{const B=O.since,U=O.until;O.id==="live"?g(null):O.id!=="custom"?Ln({range:O.id}).then(g).catch(()=>{}):Ln({since:B,until:U}).then(g).catch(()=>{}),Yo({since:B,until:U}).then(I=>t({type:"EVENTS_INIT",payload:I})).catch(()=>{})},[]);ae(()=>{let O,B=1e3,U=!1,I=!1;si().then(V=>t({type:"SNAP_REPLACE",payload:V})).catch(()=>{}),Ln().then(V=>t({type:"HISTORY_INIT",payload:V})).catch(()=>{}),T(a);function se(){U||(O=new EventSource(Rd()),O.onmessage=V=>{const ye=JSON.parse(V.data);t({type:"SSE_UPDATE",payload:ye}),B=1e3},O.onerror=()=>{t({type:"SET_CONNECTED",payload:!1}),O.close(),U||setTimeout(se,B),B=Math.min(B*2,3e4)})}se();const ee=setInterval(()=>{U||I||(I=!0,si().then(V=>t({type:"SNAP_REPLACE",payload:V})).catch(()=>{}).finally(()=>{I=!1}))},3e4);return()=>{U=!0,O&&O.close(),clearInterval(ee)}},[]);const b=be(O=>{const B=_l[O]||3600,U={id:O,since:Date.now()/1e3-B,until:null};t({type:"SET_RANGE",payload:U}),en("range",O),T(U)},[T]),$=be((O,B)=>{const U={id:"custom",since:O,until:B};t({type:"SET_RANGE",payload:U}),T(U)},[T]),x=a.id==="live"?n:m||n,S=a.until?a.until-a.since:_l[a.id]||3600;ae(()=>{const O=B=>{var U;if(B.key==="Escape"&&t({type:"SET_VIEWER",payload:null}),B.key==="/"&&document.activeElement!==k.current&&(B.preventDefault(),(U=k.current)==null||U.focus()),document.activeElement!==k.current){const I=yo.find(se=>se.key===B.key);I&&(t({type:"SET_TAB",payload:I.id}),en("active_tab",I.id))}};return document.addEventListener("keydown",O),()=>document.removeEventListener("keydown",O)},[]);const j=be(O=>t({type:"SET_VIEWER",payload:O}),[]),A=be(O=>{if(!il.has(O))return;const B=s?s.tools.filter(I=>I.tool!=="aictl"&&I.tool!=="any"&&il.has(I.tool)).map(I=>I.tool):[];let U;p===null?U=B.filter(I=>I!==O):p.indexOf(O)>=0?U=p.filter(se=>se!==O):(U=[...p,O],U.length>=B.length&&(U=null)),t({type:"SET_TOOL_FILTER",payload:U}),en("tool_filter",U)},[s,p]),M=be(O=>{t({type:"SET_TOOL_FILTER",payload:O}),en("tool_filter",O)},[]),R=re(()=>{if(!s)return s;let O=s.tools;if(O=O.filter(B=>il.has(B.tool)||B.tool==="aictl"),p!==null&&(O=O.filter(B=>p.includes(B.tool)||B.tool==="aictl")),i){const B=i.toLowerCase();O=O.filter(U=>U.label.toLowerCase().includes(B)||U.tool.toLowerCase().includes(B)||U.vendor&&U.vendor.toLowerCase().includes(B)||U.files.some(I=>I.path.toLowerCase().includes(B))||U.processes.some(I=>(I.name||"").toLowerCase().includes(B)||(I.cmdline||"").toLowerCase().includes(B))||U.live&&((U.live.workspaces||[]).some(I=>I.toLowerCase().includes(B))||(U.live.sources||[]).some(I=>I.toLowerCase().includes(B))))}return{...s,tools:O}},[s,i,p]),y=re(()=>{var U;const O=Date.now()/1e3-300,B=new Map;for(const I of f)if(I.kind==="file_modified"&&I.ts>=O&&((U=I.detail)!=null&&U.path)){const se=B.get(I.detail.path);(!se||I.ts>se.ts)&&B.set(I.detail.path,{ts:I.ts,growth:I.detail.growth_bytes||0,tool:I.tool})}return B},[f]),C=re(()=>({snap:R,history:n,openViewer:j,recentFiles:y,globalRange:a,rangeSeconds:S,enabledTools:p}),[R,n,j,y,a,S,p]),P={overview:()=>r`<${Oe} tabName="overview">
      <${Mm} snap=${R} history=${x}
        globalRange=${a}/>
      <div class="mb-lg"><${hm}/></div>
    </${Oe}>`,procs:()=>r`<${Oe} tabName="procs">
      <div class="mb-lg"><${Lf}/></div>
    </${Oe}>`,memory:()=>r`<${Oe} tabName="memory">
      <div class="mb-lg"><${fm}/></div>
      <div class="mb-lg"><${Rf}/></div>
    </${Oe}>`,live:()=>r`<${Oe} tabName="live"><div class="mb-lg"><${Nf}/></div></${Oe}>`,events:()=>r`<${Oe} tabName="events"><div class="mb-lg"><${If} key=${"events-"+o}/></div></${Oe}>`,budget:()=>r`<${Oe} tabName="budget"><div class="mb-lg"><${jf} key=${"budget-"+o}/></div></${Oe}>`,sessions:()=>r`<${Oe} tabName="sessions"><div class="mb-lg"><${dv} key=${"sessions-"+o}/></div></${Oe}>`,analytics:()=>r`<${Oe} tabName="analytics"><div class="mb-lg"><${kv} key=${"analytics-"+o}/></div></${Oe}>`,flow:()=>r`<${Oe} tabName="flow"><div class="mb-lg"><${Ov} key=${"flow-"+o}/></div></${Oe}>`,transcript:()=>r`<${Oe} tabName="transcript"><div class="mb-lg"><${Hv} key=${"transcript-"+o}/></div></${Oe}>`,timeline:()=>r`<${Oe} tabName="timeline"><div class="mb-lg"><${sm} key=${"timeline-"+o}/></div></${Oe}>`,config:()=>r`<${Oe} tabName="config"><div class="mb-lg"><${cm}/></div></${Oe}>`},z=be(O=>{t({type:"SET_TAB",payload:O}),en("active_tab",O)},[]);be(O=>{t({type:"SET_TAB",payload:"sessions"}),en("active_tab","sessions"),window.__aictl_selected_session=O.session_id,window.dispatchEvent(new CustomEvent("aictl-session-select",{detail:O}))},[]);const[E,Y]=W(!1);ae(()=>{let O=!0;const B=()=>zr().then(I=>{O&&Y(I.active||!1)}).catch(()=>{O&&Y(!1)});B();const U=setInterval(B,3e4);return()=>{O=!1,clearInterval(U)}},[]);const G=re(()=>{if(!s)return[];const O=[];let B=0,U=0,I=0,se=0;for(const ee of s.tools||[])for(const V of ee.processes||[]){const ye=parseFloat(V.mem_mb)||0,Pe=(V.process_type||"").toLowerCase();(Pe==="subagent"||Pe==="agent")&&(B+=ye),Pe==="mcp-server"&&V.zombie_risk&&V.zombie_risk!=="none"&&U++,(Pe==="browser"||(V.name||"").toLowerCase().includes("headless"))&&I++,V.anomalies&&V.anomalies.length&&(se+=V.anomalies.length)}return B>2048&&O.push({level:"red",msg:`Subagent memory: ${ge(B*1048576)} (>2GB) — consider cleanup`}),U>0&&O.push({level:"orange",msg:`${U} MCP server(s) with dead parent — may be orphaned`}),I>0&&O.push({level:"yellow",msg:`${I} headless browser process(es) detected — check for leaks`}),se>5&&O.push({level:"orange",msg:`${se} process anomalies detected`}),O},[s]);return r`<${Ie.Provider} value=${C}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${k} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${i} onInput=${O=>t({type:"SET_SEARCH",payload:O.target.value})}/>
          <button class="theme-btn" onClick=${D} aria-label="Toggle theme: ${c}"
            title="Theme: ${c}">${Bd[c]}</button>
          ${E&&r`<span class="conn ok" title="OTel receiver active — Claude Code pushing telemetry">OTel</span>`}
          <span class=${"conn "+(l?"ok":"err")} role="status" aria-live="polite">${l?"live":"reconnecting..."}<span class="sr-only">${l?" — connected to server":" — connection lost, attempting to reconnect"}</span></span>
        </div>
      </header>
      ${G.length>0&&r`<div class="alert-banner" role="alert">
        ${G.map((O,B)=>r`<div key=${B} class="alert-item" style="color:var(--${O.level})">
          \u26A0 ${O.msg}
        </div>`)}
      </div>`}
      <${wm} globalRange=${a} onPreset=${b} onApplyCustom=${$}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${yo.map(O=>r`<button key=${O.id} class="tab-btn" role="tab"
            aria-selected=${o===O.id} onClick=${()=>z(O.id)}
            title="Shortcut: ${O.key}">${O.icon?O.icon+" ":""}${O.label}</button>`)}
        </nav>
        <${Sm} snap=${s} enabledTools=${p}
          onToggle=${A} onSetAll=${M}/>
        <div id="main-content" role="tabpanel" aria-label=${(ne=yo.find(O=>O.id===o))==null?void 0:ne.label}>
          ${P[o]?P[o]():r`<p class="text-muted">Unknown tab "${o}"</p>`}
        </div>
      </main>
    </div>
    <${Qp} path=${d} onClose=${()=>t({type:"SET_VIEWER",payload:null})}/>
    <${bm}/>
  </${Ie.Provider}>`}$d(r`<${Em}/>`,document.getElementById("app"));
