(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))n(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function s(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(l){if(l.ep)return;l.ep=!0;const o=s(l);fetch(l.href,o)}})();var ul,Ce,Gi,rs,La,Yi,Ki,Ji,Oo,po,fo,Qi,nl={},ll=[],Nc=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,pl=Array.isArray;function Zt(e,t){for(var s in t)e[s]=t[s];return e}function Po(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function Zi(e,t,s){var n,l,o,a={};for(o in t)o=="key"?n=t[o]:o=="ref"?l=t[o]:a[o]=t[o];if(arguments.length>2&&(a.children=arguments.length>3?ul.call(arguments,2):s),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)a[o]===void 0&&(a[o]=e.defaultProps[o]);return Qn(e,a,n,l,null)}function Qn(e,t,s,n,l){var o={type:e,props:t,key:s,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:l??++Gi,__i:-1,__u:0};return l==null&&Ce.vnode!=null&&Ce.vnode(o),o}function fl(e){return e.children}function Zn(e,t){this.props=e,this.context=t}function on(e,t){if(t==null)return e.__?on(e.__,e.__i+1):null;for(var s;t<e.__k.length;t++)if((s=e.__k[t])!=null&&s.__e!=null)return s.__e;return typeof e.type=="function"?on(e):null}function jc(e){if(e.__P&&e.__d){var t=e.__v,s=t.__e,n=[],l=[],o=Zt({},t);o.__v=t.__v+1,Ce.vnode&&Ce.vnode(o),zo(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[s]:null,n,s??on(t),!!(32&t.__u),l),o.__v=t.__v,o.__.__k[o.__i]=o,sr(n,o,l),t.__e=t.__=null,o.__e!=s&&Xi(o)}}function Xi(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),Xi(e)}function vo(e){(!e.__d&&(e.__d=!0)&&rs.push(e)&&!ol.__r++||La!=Ce.debounceRendering)&&((La=Ce.debounceRendering)||Yi)(ol)}function ol(){try{for(var e,t=1;rs.length;)rs.length>t&&rs.sort(Ki),e=rs.shift(),t=rs.length,jc(e)}finally{rs.length=ol.__r=0}}function er(e,t,s,n,l,o,a,i,r,d,v){var p,m,_,x,E,T,y,$=n&&n.__k||ll,k=t.length;for(r=Bc(s,t,$,r,k),p=0;p<k;p++)(_=s.__k[p])!=null&&(m=_.__i!=-1&&$[_.__i]||nl,_.__i=p,T=zo(e,_,m,l,o,a,i,r,d,v),x=_.__e,_.ref&&m.ref!=_.ref&&(m.ref&&Ro(m.ref,null,_),v.push(_.ref,_.__c||x,_)),E==null&&x!=null&&(E=x),(y=!!(4&_.__u))||m.__k===_.__k?r=tr(_,r,e,y):typeof _.type=="function"&&T!==void 0?r=T:x&&(r=x.nextSibling),_.__u&=-7);return s.__e=E,r}function Bc(e,t,s,n,l){var o,a,i,r,d,v=s.length,p=v,m=0;for(e.__k=new Array(l),o=0;o<l;o++)(a=t[o])!=null&&typeof a!="boolean"&&typeof a!="function"?(typeof a=="string"||typeof a=="number"||typeof a=="bigint"||a.constructor==String?a=e.__k[o]=Qn(null,a,null,null,null):pl(a)?a=e.__k[o]=Qn(fl,{children:a},null,null,null):a.constructor===void 0&&a.__b>0?a=e.__k[o]=Qn(a.type,a.props,a.key,a.ref?a.ref:null,a.__v):e.__k[o]=a,r=o+m,a.__=e,a.__b=e.__b+1,i=null,(d=a.__i=Hc(a,s,r,p))!=-1&&(p--,(i=s[d])&&(i.__u|=2)),i==null||i.__v==null?(d==-1&&(l>v?m--:l<v&&m++),typeof a.type!="function"&&(a.__u|=4)):d!=r&&(d==r-1?m--:d==r+1?m++:(d>r?m--:m++,a.__u|=4))):e.__k[o]=null;if(p)for(o=0;o<v;o++)(i=s[o])!=null&&!(2&i.__u)&&(i.__e==n&&(n=on(i)),lr(i,i));return n}function tr(e,t,s,n){var l,o;if(typeof e.type=="function"){for(l=e.__k,o=0;l&&o<l.length;o++)l[o]&&(l[o].__=e,t=tr(l[o],t,s,n));return t}e.__e!=t&&(n&&(t&&e.type&&!t.parentNode&&(t=on(e)),s.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function Hc(e,t,s,n){var l,o,a,i=e.key,r=e.type,d=t[s],v=d!=null&&(2&d.__u)==0;if(d===null&&i==null||v&&i==d.key&&r==d.type)return s;if(n>(v?1:0)){for(l=s-1,o=s+1;l>=0||o<t.length;)if((d=t[a=l>=0?l--:o++])!=null&&!(2&d.__u)&&i==d.key&&r==d.type)return a}return-1}function Da(e,t,s){t[0]=="-"?e.setProperty(t,s??""):e[t]=s==null?"":typeof s!="number"||Nc.test(t)?s:s+"px"}function Wn(e,t,s,n,l){var o,a;e:if(t=="style")if(typeof s=="string")e.style.cssText=s;else{if(typeof n=="string"&&(e.style.cssText=n=""),n)for(t in n)s&&t in s||Da(e.style,t,"");if(s)for(t in s)n&&s[t]==n[t]||Da(e.style,t,s[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace(Ji,"$1")),a=t.toLowerCase(),t=a in e||t=="onFocusOut"||t=="onFocusIn"?a.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=s,s?n?s.u=n.u:(s.u=Oo,e.addEventListener(t,o?fo:po,o)):e.removeEventListener(t,o?fo:po,o);else{if(l=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=s??"";break e}catch{}typeof s=="function"||(s==null||s===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&s==1?"":s))}}function Aa(e){return function(t){if(this.l){var s=this.l[t.type+e];if(t.t==null)t.t=Oo++;else if(t.t<s.u)return;return s(Ce.event?Ce.event(t):t)}}}function zo(e,t,s,n,l,o,a,i,r,d){var v,p,m,_,x,E,T,y,$,k,S,B,A,O,P,b=t.type;if(t.constructor!==void 0)return null;128&s.__u&&(r=!!(32&s.__u),o=[i=t.__e=s.__e]),(v=Ce.__b)&&v(t);e:if(typeof b=="function")try{if(y=t.props,$=b.prototype&&b.prototype.render,k=(v=b.contextType)&&n[v.__c],S=v?k?k.props.value:v.__:n,s.__c?T=(p=t.__c=s.__c).__=p.__E:($?t.__c=p=new b(y,S):(t.__c=p=new Zn(y,S),p.constructor=b,p.render=qc),k&&k.sub(p),p.state||(p.state={}),p.__n=n,m=p.__d=!0,p.__h=[],p._sb=[]),$&&p.__s==null&&(p.__s=p.state),$&&b.getDerivedStateFromProps!=null&&(p.__s==p.state&&(p.__s=Zt({},p.__s)),Zt(p.__s,b.getDerivedStateFromProps(y,p.__s))),_=p.props,x=p.state,p.__v=t,m)$&&b.getDerivedStateFromProps==null&&p.componentWillMount!=null&&p.componentWillMount(),$&&p.componentDidMount!=null&&p.__h.push(p.componentDidMount);else{if($&&b.getDerivedStateFromProps==null&&y!==_&&p.componentWillReceiveProps!=null&&p.componentWillReceiveProps(y,S),t.__v==s.__v||!p.__e&&p.shouldComponentUpdate!=null&&p.shouldComponentUpdate(y,p.__s,S)===!1){t.__v!=s.__v&&(p.props=y,p.state=p.__s,p.__d=!1),t.__e=s.__e,t.__k=s.__k,t.__k.some(function(C){C&&(C.__=t)}),ll.push.apply(p.__h,p._sb),p._sb=[],p.__h.length&&a.push(p);break e}p.componentWillUpdate!=null&&p.componentWillUpdate(y,p.__s,S),$&&p.componentDidUpdate!=null&&p.__h.push(function(){p.componentDidUpdate(_,x,E)})}if(p.context=S,p.props=y,p.__P=e,p.__e=!1,B=Ce.__r,A=0,$)p.state=p.__s,p.__d=!1,B&&B(t),v=p.render(p.props,p.state,p.context),ll.push.apply(p.__h,p._sb),p._sb=[];else do p.__d=!1,B&&B(t),v=p.render(p.props,p.state,p.context),p.state=p.__s;while(p.__d&&++A<25);p.state=p.__s,p.getChildContext!=null&&(n=Zt(Zt({},n),p.getChildContext())),$&&!m&&p.getSnapshotBeforeUpdate!=null&&(E=p.getSnapshotBeforeUpdate(_,x)),O=v!=null&&v.type===fl&&v.key==null?nr(v.props.children):v,i=er(e,pl(O)?O:[O],t,s,n,l,o,a,i,r,d),p.base=t.__e,t.__u&=-161,p.__h.length&&a.push(p),T&&(p.__E=p.__=null)}catch(C){if(t.__v=null,r||o!=null)if(C.then){for(t.__u|=r?160:128;i&&i.nodeType==8&&i.nextSibling;)i=i.nextSibling;o[o.indexOf(i)]=null,t.__e=i}else{for(P=o.length;P--;)Po(o[P]);mo(t)}else t.__e=s.__e,t.__k=s.__k,C.then||mo(t);Ce.__e(C,t,s)}else o==null&&t.__v==s.__v?(t.__k=s.__k,t.__e=s.__e):i=t.__e=Wc(s.__e,t,s,n,l,o,a,r,d);return(v=Ce.diffed)&&v(t),128&t.__u?void 0:i}function mo(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(mo))}function sr(e,t,s){for(var n=0;n<s.length;n++)Ro(s[n],s[++n],s[++n]);Ce.__c&&Ce.__c(t,e),e.some(function(l){try{e=l.__h,l.__h=[],e.some(function(o){o.call(l)})}catch(o){Ce.__e(o,l.__v)}})}function nr(e){return typeof e!="object"||e==null||e.__b>0?e:pl(e)?e.map(nr):Zt({},e)}function Wc(e,t,s,n,l,o,a,i,r){var d,v,p,m,_,x,E,T=s.props||nl,y=t.props,$=t.type;if($=="svg"?l="http://www.w3.org/2000/svg":$=="math"?l="http://www.w3.org/1998/Math/MathML":l||(l="http://www.w3.org/1999/xhtml"),o!=null){for(d=0;d<o.length;d++)if((_=o[d])&&"setAttribute"in _==!!$&&($?_.localName==$:_.nodeType==3)){e=_,o[d]=null;break}}if(e==null){if($==null)return document.createTextNode(y);e=document.createElementNS(l,$,y.is&&y),i&&(Ce.__m&&Ce.__m(t,o),i=!1),o=null}if($==null)T===y||i&&e.data==y||(e.data=y);else{if(o=o&&ul.call(e.childNodes),!i&&o!=null)for(T={},d=0;d<e.attributes.length;d++)T[(_=e.attributes[d]).name]=_.value;for(d in T)_=T[d],d=="dangerouslySetInnerHTML"?p=_:d=="children"||d in y||d=="value"&&"defaultValue"in y||d=="checked"&&"defaultChecked"in y||Wn(e,d,null,_,l);for(d in y)_=y[d],d=="children"?m=_:d=="dangerouslySetInnerHTML"?v=_:d=="value"?x=_:d=="checked"?E=_:i&&typeof _!="function"||T[d]===_||Wn(e,d,_,T[d],l);if(v)i||p&&(v.__html==p.__html||v.__html==e.innerHTML)||(e.innerHTML=v.__html),t.__k=[];else if(p&&(e.innerHTML=""),er(t.type=="template"?e.content:e,pl(m)?m:[m],t,s,n,$=="foreignObject"?"http://www.w3.org/1999/xhtml":l,o,a,o?o[0]:s.__k&&on(s,0),i,r),o!=null)for(d=o.length;d--;)Po(o[d]);i||(d="value",$=="progress"&&x==null?e.removeAttribute("value"):x!=null&&(x!==e[d]||$=="progress"&&!x||$=="option"&&x!=T[d])&&Wn(e,d,x,T[d],l),d="checked",E!=null&&E!=e[d]&&Wn(e,d,E,T[d],l))}return e}function Ro(e,t,s){try{if(typeof e=="function"){var n=typeof e.__u=="function";n&&e.__u(),n&&t==null||(e.__u=e(t))}else e.current=t}catch(l){Ce.__e(l,s)}}function lr(e,t,s){var n,l;if(Ce.unmount&&Ce.unmount(e),(n=e.ref)&&(n.current&&n.current!=e.__e||Ro(n,null,t)),(n=e.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(o){Ce.__e(o,t)}n.base=n.__P=null}if(n=e.__k)for(l=0;l<n.length;l++)n[l]&&lr(n[l],t,s||typeof e.type!="function");s||Po(e.__e),e.__c=e.__=e.__e=void 0}function qc(e,t,s){return this.constructor(e,s)}function Vc(e,t,s){var n,l,o,a;t==document&&(t=document.documentElement),Ce.__&&Ce.__(e,t),l=(n=!1)?null:t.__k,o=[],a=[],zo(t,e=t.__k=Zi(fl,null,[e]),l||nl,nl,t.namespaceURI,l?null:t.firstChild?ul.call(t.childNodes):null,o,l?l.__e:t.firstChild,n,a),sr(o,e,a)}function Uc(e){function t(s){var n,l;return this.getChildContext||(n=new Set,(l={})[t.__c]=this,this.getChildContext=function(){return l},this.componentWillUnmount=function(){n=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&n.forEach(function(a){a.__e=!0,vo(a)})},this.sub=function(o){n.add(o);var a=o.componentWillUnmount;o.componentWillUnmount=function(){n&&n.delete(o),a&&a.call(o)}}),s.children}return t.__c="__cC"+Qi++,t.__=e,t.Provider=t.__l=(t.Consumer=function(s,n){return s.children(n)}).contextType=t,t}ul=ll.slice,Ce={__e:function(e,t,s,n){for(var l,o,a;t=t.__;)if((l=t.__c)&&!l.__)try{if((o=l.constructor)&&o.getDerivedStateFromError!=null&&(l.setState(o.getDerivedStateFromError(e)),a=l.__d),l.componentDidCatch!=null&&(l.componentDidCatch(e,n||{}),a=l.__d),a)return l.__E=l}catch(i){e=i}throw e}},Gi=0,Zn.prototype.setState=function(e,t){var s;s=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=Zt({},this.state),typeof e=="function"&&(e=e(Zt({},s),this.props)),e&&Zt(s,e),e!=null&&this.__v&&(t&&this._sb.push(t),vo(this))},Zn.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),vo(this))},Zn.prototype.render=fl,rs=[],Yi=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,Ki=function(e,t){return e.__v.__b-t.__v.__b},ol.__r=0,Ji=/(PointerCapture)$|Capture$/i,Oo=0,po=Aa(!1),fo=Aa(!0),Qi=0;var or=function(e,t,s,n){var l;t[0]=0;for(var o=1;o<t.length;o++){var a=t[o++],i=t[o]?(t[0]|=a?1:2,s[t[o++]]):t[++o];a===3?n[0]=i:a===4?n[1]=Object.assign(n[1]||{},i):a===5?(n[1]=n[1]||{})[t[++o]]=i:a===6?n[1][t[++o]]+=i+"":a?(l=e.apply(i,or(e,i,s,["",null])),n.push(l),i[0]?t[0]|=2:(t[o-2]=0,t[o]=l)):n.push(i)}return n},Oa=new Map;function Gc(e){var t=Oa.get(this);return t||(t=new Map,Oa.set(this,t)),(t=or(this,t.get(e)||(t.set(e,t=function(s){for(var n,l,o=1,a="",i="",r=[0],d=function(m){o===1&&(m||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?r.push(0,m,a):o===3&&(m||a)?(r.push(3,m,a),o=2):o===2&&a==="..."&&m?r.push(4,m,0):o===2&&a&&!m?r.push(5,0,!0,a):o>=5&&((a||!m&&o===5)&&(r.push(o,0,a,l),o=6),m&&(r.push(o,m,0,l),o=6)),a=""},v=0;v<s.length;v++){v&&(o===1&&d(),d(v));for(var p=0;p<s[v].length;p++)n=s[v][p],o===1?n==="<"?(d(),r=[r],o=3):a+=n:o===4?a==="--"&&n===">"?(o=1,a=""):a=n+a[0]:i?n===i?i="":a+=n:n==='"'||n==="'"?i=n:n===">"?(d(),o=1):o&&(n==="="?(o=5,l=a,a=""):n==="/"&&(o<5||s[v][p+1]===">")?(d(),o===3&&(r=r[0]),o=r,(r=r[0]).push(2,0,o),o=0):n===" "||n==="	"||n===`
`||n==="\r"?(d(),o=2):a+=n),o===3&&a==="!--"&&(o=4,r=r[0])}return d(),r}(e)),t),arguments,[])).length>1?t:t[0]}var c=Gc.bind(Zi),an,Ae,Gl,Pa,Dn=0,ar=[],Ie=Ce,za=Ie.__b,Ra=Ie.__r,Fa=Ie.diffed,Ia=Ie.__c,Na=Ie.unmount,ja=Ie.__;function vl(e,t){Ie.__h&&Ie.__h(Ae,e,Dn||t),Dn=0;var s=Ae.__H||(Ae.__H={__:[],__h:[]});return e>=s.__.length&&s.__.push({}),s.__[e]}function U(e){return Dn=1,ir(cr,e)}function ir(e,t,s){var n=vl(an++,2);if(n.t=e,!n.__c&&(n.__=[cr(void 0,t),function(i){var r=n.__N?n.__N[0]:n.__[0],d=n.t(r,i);r!==d&&(n.__N=[d,n.__[1]],n.__c.setState({}))}],n.__c=Ae,!Ae.__f)){var l=function(i,r,d){if(!n.__c.__H)return!0;var v=n.__c.__H.__.filter(function(m){return m.__c});if(v.every(function(m){return!m.__N}))return!o||o.call(this,i,r,d);var p=n.__c.props!==i;return v.some(function(m){if(m.__N){var _=m.__[0];m.__=m.__N,m.__N=void 0,_!==m.__[0]&&(p=!0)}}),o&&o.call(this,i,r,d)||p};Ae.__f=!0;var o=Ae.shouldComponentUpdate,a=Ae.componentWillUpdate;Ae.componentWillUpdate=function(i,r,d){if(this.__e){var v=o;o=void 0,l(i,r,d),o=v}a&&a.call(this,i,r,d)},Ae.shouldComponentUpdate=l}return n.__N||n.__}function de(e,t){var s=vl(an++,3);!Ie.__s&&rr(s.__H,t)&&(s.__=e,s.u=t,Ae.__H.__h.push(s))}function ot(e){return Dn=5,ie(function(){return{current:e}},[])}function ie(e,t){var s=vl(an++,7);return rr(s.__H,t)&&(s.__=e(),s.__H=t,s.__h=e),s.__}function Ve(e,t){return Dn=8,ie(function(){return e},t)}function et(e){var t=Ae.context[e.__c],s=vl(an++,9);return s.c=e,t?(s.__==null&&(s.__=!0,t.sub(Ae)),t.props.value):e.__}function Yc(){for(var e;e=ar.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(Xn),t.__h.some(ho),t.__h=[]}catch(s){t.__h=[],Ie.__e(s,e.__v)}}}Ie.__b=function(e){Ae=null,za&&za(e)},Ie.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),ja&&ja(e,t)},Ie.__r=function(e){Ra&&Ra(e),an=0;var t=(Ae=e.__c).__H;t&&(Gl===Ae?(t.__h=[],Ae.__h=[],t.__.some(function(s){s.__N&&(s.__=s.__N),s.u=s.__N=void 0})):(t.__h.some(Xn),t.__h.some(ho),t.__h=[],an=0)),Gl=Ae},Ie.diffed=function(e){Fa&&Fa(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(ar.push(t)!==1&&Pa===Ie.requestAnimationFrame||((Pa=Ie.requestAnimationFrame)||Kc)(Yc)),t.__H.__.some(function(s){s.u&&(s.__H=s.u),s.u=void 0})),Gl=Ae=null},Ie.__c=function(e,t){t.some(function(s){try{s.__h.some(Xn),s.__h=s.__h.filter(function(n){return!n.__||ho(n)})}catch(n){t.some(function(l){l.__h&&(l.__h=[])}),t=[],Ie.__e(n,s.__v)}}),Ia&&Ia(e,t)},Ie.unmount=function(e){Na&&Na(e);var t,s=e.__c;s&&s.__H&&(s.__H.__.some(function(n){try{Xn(n)}catch(l){t=l}}),s.__H=void 0,t&&Ie.__e(t,s.__v))};var Ba=typeof requestAnimationFrame=="function";function Kc(e){var t,s=function(){clearTimeout(n),Ba&&cancelAnimationFrame(t),setTimeout(e)},n=setTimeout(s,35);Ba&&(t=requestAnimationFrame(s))}function Xn(e){var t=Ae,s=e.__c;typeof s=="function"&&(e.__c=void 0,s()),Ae=t}function ho(e){var t=Ae;e.__c=e.__(),Ae=t}function rr(e,t){return!e||e.length!==t.length||t.some(function(s,n){return s!==e[n]})}function cr(e,t){return typeof t=="function"?t(e):t}const je=Uc(null);let Jc="";function Be(e){return Jc+e}async function Ha(){return(await fetch(Be("/api/snapshot"))).json()}async function Mn(e={}){let t="/api/history";const s=[];return e.range&&s.push("range="+e.range),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.tool&&s.push("tool="+encodeURIComponent(e.tool)),s.length&&(t+="?"+s.join("&")),(await fetch(Be(t))).json()}async function Fo(e={}){let t="/api/events";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.since!=null&&s.push("since="+e.since),e.until!=null&&s.push("until="+e.until),e.sessionId&&s.push("session_id="+encodeURIComponent(e.sessionId)),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(Be(t))).json()}async function dr(e={}){let t="/api/sessions";const s=[];return e.tool&&s.push("tool="+encodeURIComponent(e.tool)),e.active!=null&&s.push("active="+e.active),e.limit&&s.push("limit="+e.limit),s.length&&(t+="?"+s.join("&")),(await fetch(Be(t))).json()}async function Qc(e,t,s){let n=`/api/session-flow?session_id=${encodeURIComponent(e)}&since=${t}&until=${s}`;return(await fetch(Be(n))).json()}async function ur(e,t={}){let s="/api/session-timeline";const n=[];return t.since!=null&&n.push("since="+t.since),t.until!=null&&n.push("until="+t.until),n.length&&(s+="?"+n.join("&")),(await fetch(Be(s))).json()}async function Zc(e,t,s=30,n=20){const l=`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=${s}&limit=${n}`;return(await fetch(Be(l))).json()}async function Xc(e){return(await fetch(Be("/api/agent-teams?session_id="+encodeURIComponent(e)))).json()}async function ed(e,t={}){return(await fetch(Be(e),t)).json()}async function td(e=7){return(await fetch(Be("/api/project-costs?days="+e))).json()}async function sd(e,t=100){return(await fetch(Be(`/api/api-calls?since=${e}&limit=${t}`))).json()}async function nd(){return(await fetch(Be("/api/budget"))).json()}async function ld(e,t={}){return fetch(Be("/api/file?path="+encodeURIComponent(e)),{headers:t})}async function od(){return(await fetch(Be("/api/samples?list=1"))).json()}async function ad(e,t){return(await fetch(Be("/api/samples?series="+encodeURIComponent(e)+"&since="+t))).json()}async function id(e,t){return(await fetch(Be("/api/samples?metric="+encodeURIComponent(e)+"&since="+t))).json()}async function pr(){return(await fetch(Be("/api/otel-status"))).json()}async function rd(){return(await fetch(Be("/api/self-status"))).json()}let Yl=null;async function cd(){return Yl||(Yl=fetch(Be("/api/datapoints")).then(e=>e.json())),Yl}function dd(){return Be("/api/stream")}const Oe=window.COLORS??{},bt=window.ICONS??{},fr=window.VENDOR_LABELS??{},ud=window.VENDOR_COLORS??{},pd=window.HOST_LABELS??{},Wa=window.TOOL_RELATIONSHIPS??{},fd={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},Kl=["auto","dark","light"],vd={auto:"☾",dark:"☾",light:"☀"},nn=5,Ks=15,md={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},qa=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],hd={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},gd=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],al=new Map,_d=6e4;function vr(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function ml(e,t,s,n=1){for(let l=t.length-1;l>=0;l--){const[o,a]=t[l],i=e/o;if(i>=n)return vr(i)+a}return Math.round(e)+s}const $d=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],bd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],yd=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function z(e){return ml(e,bd,"")}function qe(e){return ml(e,yd,"")}function ge(e){return ml(e,$d,"B")}function It(e){return!e||e<=0?"0B/s":ml(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function _e(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function X(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function Io(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function mr(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Cs(e){return e&&e.replace(/\\/g,"/")}function Jl(e,t){const s=Cs(e),n=Cs(t);return s.startsWith(n+"/")?"project":s.includes("/.claude/projects/")?"shadow":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")||s.includes("/.copilot/")||s.includes("/.vscode/")?"global":"external"}function xd(e,t){const s=Cs(e),n=Cs(t);if(s.startsWith(n+"/")){const o=s.slice(n.length+1),a=o.split("/");return a.pop(),a.length?a.join("/"):"(root)"}const l=s.split("/");l.pop();for(let o=l.length-1;o>=0;o--)if(l[o].startsWith(".")&&l[o].length>1&&l[o]!==".."||l[o]==="Library"||l[o]==="AppData")return"~/"+l.slice(o).join("/");return l.slice(-2).join("/")}function kd(e,t){const s={};e.forEach(l=>{const o=Jl(l.path,t),a=xd(l.path,t),i=o==="project"?a:o+": "+a;(s[i]=s[i]||[]).push(l)});const n={project:0,global:1,shadow:2,external:3};return Object.entries(s).sort((l,o)=>{const a=l[1][0]?Jl(l[1][0].path,t):"z",i=o[1][0]?Jl(o[1][0].path,t):"z";return(n[a]||9)-(n[i]||9)})}function wd(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let s=2;s<e.length;s++)t.push((e[s-2]+e[s-1]+e[s])/3);return t}async function No(e){const t=al.get(e);if(t&&Date.now()-t.ts<_d)return t.content;const s={};t&&t.etag&&(s["If-None-Match"]=t.etag);const n=await ld(e,s);if(n.status===304&&t)return t.ts=Date.now(),t.content;if(!n.ok)throw new Error(n.statusText);const l=await n.text(),o=n.headers.get("ETag")||null;return al.set(e,{content:l,ts:Date.now(),etag:o}),l}function Nt(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function hr(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function Ql(e,t,s,n){if(e==null||e==="")return"";let l=typeof e=="number"?e:parseFloat(e)||0;n&&(l*=n);let o;switch(t){case"size":o=ge(l);break;case"rate":o=It(l);break;case"kilo":o=z(l);break;case"percent":o=_e(l);break;case"pct":o=_e(l);break;case"raw":default:o=Number.isInteger(l)?String(l):vr(l)}return s?o+s:o}function Va(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const Xs={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],tabs:[{id:"overview",label:"Dashboard",icon:"📊",key:"1"},{id:"procs",label:"Processes",icon:"⚙️",key:"2"},{id:"memory",label:"AI Context",icon:"📝",key:"3"},{id:"live",label:"Live Monitor",icon:"📡",key:"4"},{id:"events",label:"Events & Stats",icon:"📈",key:"5"},{id:"budget",label:"Token Budget",icon:"💰",key:"6"},{id:"sessions",label:"Sessions",icon:"🔄",key:"7"},{id:"analytics",label:"Analytics",icon:"🔬",key:"8"},{id:"flow",label:"Session Flow",icon:"🔀",key:"9"},{id:"config",label:"Configuration",icon:"⚙️",key:"0"}]},Ua=200,Ga=80,Sd=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function Td(e,t){if(!e)return t;const s=Object.fromEntries((t.tools||[]).map(n=>[n.tool,n]));return{...e,...t,tools:e.tools.map(n=>{const l=s[n.tool];return l?{...n,live:l.live,vendor:l.vendor||n.vendor,host:l.host||n.host}:n})}}function Cd(e,t){var n,l,o,a;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>Ua)for(const i of Sd)e[i]=e[i].slice(-Ua);const s=e.by_tool||{};for(const i of t.tools||[]){if(i.tool==="aictl")continue;const r=((n=i.live)==null?void 0:n.cpu_percent)||0,d=((l=i.live)==null?void 0:l.mem_mb)||0,v=i.tokens||0,p=(((o=i.live)==null?void 0:o.outbound_rate_bps)||0)+(((a=i.live)==null?void 0:a.inbound_rate_bps)||0);s[i.tool]||(s[i.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const m=s[i.tool];if(m.ts.push(t.timestamp),m.cpu.push(Math.round(r*10)/10),m.mem_mb.push(Math.round(d*10)/10),m.tokens.push(v),m.traffic.push(Math.round(p*100)/100),m.ts.length>Ga)for(const _ of Object.keys(m))m[_]=m[_].slice(-Ga)}return{...e,by_tool:s}}const Md=!0,Ge="u-",Ed="uplot",Ld=Ge+"hz",Dd=Ge+"vt",Ad=Ge+"title",Od=Ge+"wrap",Pd=Ge+"under",zd=Ge+"over",Rd=Ge+"axis",Ss=Ge+"off",Fd=Ge+"select",Id=Ge+"cursor-x",Nd=Ge+"cursor-y",jd=Ge+"cursor-pt",Bd=Ge+"legend",Hd=Ge+"live",Wd=Ge+"inline",qd=Ge+"series",Vd=Ge+"marker",Ya=Ge+"label",Ud=Ge+"value",Sn="width",Tn="height",kn="top",Ka="bottom",Js="left",Zl="right",jo="#000",Ja=jo+"0",Xl="mousemove",Qa="mousedown",eo="mouseup",Za="mouseenter",Xa="mouseleave",ei="dblclick",Gd="resize",Yd="scroll",ti="change",il="dppxchange",Bo="--",pn=typeof window<"u",go=pn?document:null,ln=pn?window:null,Kd=pn?navigator:null;let me,qn;function _o(){let e=devicePixelRatio;me!=e&&(me=e,qn&&bo(ti,qn,_o),qn=matchMedia(`(min-resolution: ${me-.001}dppx) and (max-resolution: ${me+.001}dppx)`),Ts(ti,qn,_o),ln.dispatchEvent(new CustomEvent(il)))}function _t(e,t){if(t!=null){let s=e.classList;!s.contains(t)&&s.add(t)}}function $o(e,t){let s=e.classList;s.contains(t)&&s.remove(t)}function Te(e,t,s){e.style[t]=s+"px"}function zt(e,t,s,n){let l=go.createElement(e);return t!=null&&_t(l,t),s!=null&&s.insertBefore(l,n),l}function Mt(e,t){return zt("div",e,t)}const si=new WeakMap;function Gt(e,t,s,n,l){let o="translate("+t+"px,"+s+"px)",a=si.get(e);o!=a&&(e.style.transform=o,si.set(e,o),t<0||s<0||t>n||s>l?_t(e,Ss):$o(e,Ss))}const ni=new WeakMap;function li(e,t,s){let n=t+s,l=ni.get(e);n!=l&&(ni.set(e,n),e.style.background=t,e.style.borderColor=s)}const oi=new WeakMap;function ai(e,t,s,n){let l=t+""+s,o=oi.get(e);l!=o&&(oi.set(e,l),e.style.height=s+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-s/2+"px":0)}const Ho={passive:!0},Jd={...Ho,capture:!0};function Ts(e,t,s,n){t.addEventListener(e,s,n?Jd:Ho)}function bo(e,t,s,n){t.removeEventListener(e,s,Ho)}pn&&_o();function Rt(e,t,s,n){let l;s=s||0,n=n||t.length-1;let o=n<=2147483647;for(;n-s>1;)l=o?s+n>>1:$t((s+n)/2),t[l]<e?s=l:n=l;return e-t[s]<=t[n]-e?s:n}function gr(e){return(s,n,l)=>{let o=-1,a=-1;for(let i=n;i<=l;i++)if(e(s[i])){o=i;break}for(let i=l;i>=n;i--)if(e(s[i])){a=i;break}return[o,a]}}const _r=e=>e!=null,$r=e=>e!=null&&e>0,hl=gr(_r),Qd=gr($r);function Zd(e,t,s,n=0,l=!1){let o=l?Qd:hl,a=l?$r:_r;[t,s]=o(e,t,s);let i=e[t],r=e[t];if(t>-1)if(n==1)i=e[t],r=e[s];else if(n==-1)i=e[s],r=e[t];else for(let d=t;d<=s;d++){let v=e[d];a(v)&&(v<i?i=v:v>r&&(r=v))}return[i??be,r??-be]}function gl(e,t,s,n){let l=ci(e),o=ci(t);e==t&&(l==-1?(e*=s,t/=s):(e/=s,t*=s));let a=s==10?es:br,i=l==1?$t:Et,r=o==1?Et:$t,d=i(a(Ue(e))),v=r(a(Ue(t))),p=rn(s,d),m=rn(s,v);return s==10&&(d<0&&(p=ye(p,-d)),v<0&&(m=ye(m,-v))),n||s==2?(e=p*l,t=m*o):(e=wr(e,p),t=_l(t,m)),[e,t]}function Wo(e,t,s,n){let l=gl(e,t,s,n);return e==0&&(l[0]=0),t==0&&(l[1]=0),l}const qo=.1,ii={mode:3,pad:qo},En={pad:0,soft:null,mode:0},Xd={min:En,max:En};function rl(e,t,s,n){return $l(s)?ri(e,t,s):(En.pad=s,En.soft=n?0:null,En.mode=n?3:0,ri(e,t,Xd))}function fe(e,t){return e??t}function eu(e,t,s){for(t=fe(t,0),s=fe(s,e.length-1);t<=s;){if(e[t]!=null)return!0;t++}return!1}function ri(e,t,s){let n=s.min,l=s.max,o=fe(n.pad,0),a=fe(l.pad,0),i=fe(n.hard,-be),r=fe(l.hard,be),d=fe(n.soft,be),v=fe(l.soft,-be),p=fe(n.mode,0),m=fe(l.mode,0),_=t-e,x=es(_),E=dt(Ue(e),Ue(t)),T=es(E),y=Ue(T-x);(_<1e-24||y>10)&&(_=0,(e==0||t==0)&&(_=1e-24,p==2&&d!=be&&(o=0),m==2&&v!=-be&&(a=0)));let $=_||E||1e3,k=es($),S=rn(10,$t(k)),B=$*(_==0?e==0?.1:1:o),A=ye(wr(e-B,S/10),24),O=e>=d&&(p==1||p==3&&A<=d||p==2&&A>=d)?d:be,P=dt(i,A<O&&e>=O?O:Ft(O,A)),b=$*(_==0?t==0?.1:1:a),C=ye(_l(t+b,S/10),24),D=t<=v&&(m==1||m==3&&C>=v||m==2&&C<=v)?v:-be,F=Ft(r,C>D&&t<=D?D:dt(D,C));return P==F&&P==0&&(F=100),[P,F]}const tu=new Intl.NumberFormat(pn?Kd.language:"en-US"),Vo=e=>tu.format(e),yt=Math,el=yt.PI,Ue=yt.abs,$t=yt.floor,We=yt.round,Et=yt.ceil,Ft=yt.min,dt=yt.max,rn=yt.pow,ci=yt.sign,es=yt.log10,br=yt.log2,su=(e,t=1)=>yt.sinh(e)*t,to=(e,t=1)=>yt.asinh(e/t),be=1/0;function di(e){return(es((e^e>>31)-(e>>31))|0)+1}function yo(e,t,s){return Ft(dt(e,t),s)}function yr(e){return typeof e=="function"}function ce(e){return yr(e)?e:()=>e}const nu=()=>{},xr=e=>e,kr=(e,t)=>t,lu=e=>null,ui=e=>!0,pi=(e,t)=>e==t,ou=/\.\d*?(?=9{6,}|0{6,})/gm,Ms=e=>{if(Tr(e)||ps.has(e))return e;const t=`${e}`,s=t.match(ou);if(s==null)return e;let n=s[0].length-1;if(t.indexOf("e-")!=-1){let[l,o]=t.split("e");return+`${Ms(l)}e${o}`}return ye(e,n)};function ks(e,t){return Ms(ye(Ms(e/t))*t)}function _l(e,t){return Ms(Et(Ms(e/t))*t)}function wr(e,t){return Ms($t(Ms(e/t))*t)}function ye(e,t=0){if(Tr(e))return e;let s=10**t,n=e*s*(1+Number.EPSILON);return We(n)/s}const ps=new Map;function Sr(e){return((""+e).split(".")[1]||"").length}function An(e,t,s,n){let l=[],o=n.map(Sr);for(let a=t;a<s;a++){let i=Ue(a),r=ye(rn(e,a),i);for(let d=0;d<n.length;d++){let v=e==10?+`${n[d]}e${a}`:n[d]*r,p=(a>=0?0:i)+(a>=o[d]?0:o[d]),m=e==10?v:ye(v,p);l.push(m),ps.set(m,p)}}return l}const Ln={},Uo=[],cn=[null,null],cs=Array.isArray,Tr=Number.isInteger,au=e=>e===void 0;function fi(e){return typeof e=="string"}function $l(e){let t=!1;if(e!=null){let s=e.constructor;t=s==null||s==Object}return t}function iu(e){return e!=null&&typeof e=="object"}const ru=Object.getPrototypeOf(Uint8Array),Cr="__proto__";function dn(e,t=$l){let s;if(cs(e)){let n=e.find(l=>l!=null);if(cs(n)||t(n)){s=Array(e.length);for(let l=0;l<e.length;l++)s[l]=dn(e[l],t)}else s=e.slice()}else if(e instanceof ru)s=e.slice();else if(t(e)){s={};for(let n in e)n!=Cr&&(s[n]=dn(e[n],t))}else s=e;return s}function Ne(e){let t=arguments;for(let s=1;s<t.length;s++){let n=t[s];for(let l in n)l!=Cr&&($l(e[l])?Ne(e[l],dn(n[l])):e[l]=dn(n[l]))}return e}const cu=0,du=1,uu=2;function pu(e,t,s){for(let n=0,l,o=-1;n<t.length;n++){let a=t[n];if(a>o){for(l=a-1;l>=0&&e[l]==null;)e[l--]=null;for(l=a+1;l<s&&e[l]==null;)e[o=l++]=null}}}function fu(e,t){if(hu(e)){let a=e[0].slice();for(let i=1;i<e.length;i++)a.push(...e[i].slice(1));return gu(a[0])||(a=mu(a)),a}let s=new Set;for(let a=0;a<e.length;a++){let r=e[a][0],d=r.length;for(let v=0;v<d;v++)s.add(r[v])}let n=[Array.from(s).sort((a,i)=>a-i)],l=n[0].length,o=new Map;for(let a=0;a<l;a++)o.set(n[0][a],a);for(let a=0;a<e.length;a++){let i=e[a],r=i[0];for(let d=1;d<i.length;d++){let v=i[d],p=Array(l).fill(void 0),m=t?t[a][d]:du,_=[];for(let x=0;x<v.length;x++){let E=v[x],T=o.get(r[x]);E===null?m!=cu&&(p[T]=E,m==uu&&_.push(T)):p[T]=E}pu(p,_,l),n.push(p)}}return n}const vu=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function mu(e){let t=e[0],s=t.length,n=Array(s);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,a)=>t[o]-t[a]);let l=[];for(let o=0;o<e.length;o++){let a=e[o],i=Array(s);for(let r=0;r<s;r++)i[r]=a[n[r]];l.push(i)}return l}function hu(e){let t=e[0][0],s=t.length;for(let n=1;n<e.length;n++){let l=e[n][0];if(l.length!=s)return!1;if(l!=t){for(let o=0;o<s;o++)if(l[o]!=t[o])return!1}}return!0}function gu(e,t=100){const s=e.length;if(s<=1)return!0;let n=0,l=s-1;for(;n<=l&&e[n]==null;)n++;for(;l>=n&&e[l]==null;)l--;if(l<=n)return!0;const o=dt(1,$t((l-n+1)/t));for(let a=e[n],i=n+o;i<=l;i+=o){const r=e[i];if(r!=null){if(r<=a)return!1;a=r}}return!0}const Mr=["January","February","March","April","May","June","July","August","September","October","November","December"],Er=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function Lr(e){return e.slice(0,3)}const _u=Er.map(Lr),$u=Mr.map(Lr),bu={MMMM:Mr,MMM:$u,WWWW:Er,WWW:_u};function wn(e){return(e<10?"0":"")+e}function yu(e){return(e<10?"00":e<100?"0":"")+e}const xu={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>wn(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>wn(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>wn(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>wn(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>wn(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>yu(e.getMilliseconds())};function Go(e,t){t=t||bu;let s=[],n=/\{([a-z]+)\}|[^{]+/gi,l;for(;l=n.exec(e);)s.push(l[0][0]=="{"?xu[l[1]]:l[0]);return o=>{let a="";for(let i=0;i<s.length;i++)a+=typeof s[i]=="string"?s[i]:s[i](o,t);return a}}const ku=new Intl.DateTimeFormat().resolvedOptions().timeZone;function wu(e,t){let s;return t=="UTC"||t=="Etc/UTC"?s=new Date(+e+e.getTimezoneOffset()*6e4):t==ku?s=e:(s=new Date(e.toLocaleString("en-US",{timeZone:t})),s.setMilliseconds(e.getMilliseconds())),s}const Dr=e=>e%1==0,cl=[1,2,2.5,5],Su=An(10,-32,0,cl),Ar=An(10,0,32,cl),Tu=Ar.filter(Dr),ws=Su.concat(Ar),Yo=`
`,Or="{YYYY}",vi=Yo+Or,Pr="{M}/{D}",Cn=Yo+Pr,Vn=Cn+"/{YY}",zr="{aa}",Cu="{h}:{mm}",en=Cu+zr,mi=Yo+en,hi=":{ss}",he=null;function Rr(e){let t=e*1e3,s=t*60,n=s*60,l=n*24,o=l*30,a=l*365,r=(e==1?An(10,0,3,cl).filter(Dr):An(10,-3,0,cl)).concat([t,t*5,t*10,t*15,t*30,s,s*5,s*10,s*15,s*30,n,n*2,n*3,n*4,n*6,n*8,n*12,l,l*2,l*3,l*4,l*5,l*6,l*7,l*8,l*9,l*10,l*15,o,o*2,o*3,o*4,o*6,a,a*2,a*5,a*10,a*25,a*50,a*100]);const d=[[a,Or,he,he,he,he,he,he,1],[l*28,"{MMM}",vi,he,he,he,he,he,1],[l,Pr,vi,he,he,he,he,he,1],[n,"{h}"+zr,Vn,he,Cn,he,he,he,1],[s,en,Vn,he,Cn,he,he,he,1],[t,hi,Vn+" "+en,he,Cn+" "+en,he,mi,he,1],[e,hi+".{fff}",Vn+" "+en,he,Cn+" "+en,he,mi,he,1]];function v(p){return(m,_,x,E,T,y)=>{let $=[],k=T>=a,S=T>=o&&T<a,B=p(x),A=ye(B*e,3),O=so(B.getFullYear(),k?0:B.getMonth(),S||k?1:B.getDate()),P=ye(O*e,3);if(S||k){let b=S?T/o:0,C=k?T/a:0,D=A==P?A:ye(so(O.getFullYear()+C,O.getMonth()+b,1)*e,3),F=new Date(We(D/e)),R=F.getFullYear(),W=F.getMonth();for(let Y=0;D<=E;Y++){let ne=so(R+C*Y,W+b*Y,1),L=ne-p(ye(ne*e,3));D=ye((+ne+L)*e,3),D<=E&&$.push(D)}}else{let b=T>=l?l:T,C=$t(x)-$t(A),D=P+C+_l(A-P,b);$.push(D);let F=p(D),R=F.getHours()+F.getMinutes()/s+F.getSeconds()/n,W=T/n,Y=m.axes[_]._space,ne=y/Y;for(;D=ye(D+T,e==1?0:3),!(D>E);)if(W>1){let L=$t(ye(R+W,6))%24,V=p(D).getHours()-L;V>1&&(V=-1),D-=V*n,R=(R+W)%24;let le=$[$.length-1];ye((D-le)/T,3)*ne>=.7&&$.push(D)}else $.push(D)}return $}}return[r,d,v]}const[Mu,Eu,Lu]=Rr(1),[Du,Au,Ou]=Rr(.001);An(2,-53,53,[1]);function gi(e,t){return e.map(s=>s.map((n,l)=>l==0||l==8||n==null?n:t(l==1||s[8]==0?n:s[1]+n)))}function _i(e,t){return(s,n,l,o,a)=>{let i=t.find(x=>a>=x[0])||t[t.length-1],r,d,v,p,m,_;return n.map(x=>{let E=e(x),T=E.getFullYear(),y=E.getMonth(),$=E.getDate(),k=E.getHours(),S=E.getMinutes(),B=E.getSeconds(),A=T!=r&&i[2]||y!=d&&i[3]||$!=v&&i[4]||k!=p&&i[5]||S!=m&&i[6]||B!=_&&i[7]||i[1];return r=T,d=y,v=$,p=k,m=S,_=B,A(E)})}}function Pu(e,t){let s=Go(t);return(n,l,o,a,i)=>l.map(r=>s(e(r)))}function so(e,t,s){return new Date(e,t,s)}function $i(e,t){return t(e)}const zu="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function bi(e,t){return(s,n,l,o)=>o==null?Bo:t(e(n))}function Ru(e,t){let s=e.series[t];return s.width?s.stroke(e,t):s.points.width?s.points.stroke(e,t):null}function Fu(e,t){return e.series[t].fill(e,t)}const Iu={show:!0,live:!0,isolate:!1,mount:nu,markers:{show:!0,width:2,stroke:Ru,fill:Fu,dash:"solid"},idx:null,idxs:null,values:[]};function Nu(e,t){let s=e.cursor.points,n=Mt(),l=s.size(e,t);Te(n,Sn,l),Te(n,Tn,l);let o=l/-2;Te(n,"marginLeft",o),Te(n,"marginTop",o);let a=s.width(e,t,l);return a&&Te(n,"borderWidth",a),n}function ju(e,t){let s=e.series[t].points;return s._fill||s._stroke}function Bu(e,t){let s=e.series[t].points;return s._stroke||s._fill}function Hu(e,t){return e.series[t].points.size}const no=[0,0];function Wu(e,t,s){return no[0]=t,no[1]=s,no}function Un(e,t,s,n=!0){return l=>{l.button==0&&(!n||l.target==t)&&s(l)}}function lo(e,t,s,n=!0){return l=>{(!n||l.target==t)&&s(l)}}const qu={show:!0,x:!0,y:!0,lock:!1,move:Wu,points:{one:!1,show:Nu,size:Hu,width:0,stroke:Bu,fill:ju},bind:{mousedown:Un,mouseup:Un,click:Un,dblclick:Un,mousemove:lo,mouseleave:lo,mouseenter:lo},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,s,n,l)=>n-l,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},Fr={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},Ko=Ne({},Fr,{filter:kr}),Ir=Ne({},Ko,{size:10}),Nr=Ne({},Fr,{show:!1}),Jo='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',jr="bold "+Jo,Br=1.5,yi={show:!0,scale:"x",stroke:jo,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:jr,side:2,grid:Ko,ticks:Ir,border:Nr,font:Jo,lineGap:Br,rotate:0},Vu="Value",Uu="Time",xi={show:!0,scale:"x",auto:!1,sorted:1,min:be,max:-be,idxs:[]};function Gu(e,t,s,n,l){return t.map(o=>o==null?"":Vo(o))}function Yu(e,t,s,n,l,o,a){let i=[],r=ps.get(l)||0;s=a?s:ye(_l(s,l),r);for(let d=s;d<=n;d=ye(d+l,r))i.push(Object.is(d,-0)?0:d);return i}function xo(e,t,s,n,l,o,a){const i=[],r=e.scales[e.axes[t].scale].log,d=r==10?es:br,v=$t(d(s));l=rn(r,v),r==10&&(l=ws[Rt(l,ws)]);let p=s,m=l*r;r==10&&(m=ws[Rt(m,ws)]);do i.push(p),p=p+l,r==10&&!ps.has(p)&&(p=ye(p,ps.get(l))),p>=m&&(l=p,m=l*r,r==10&&(m=ws[Rt(m,ws)]));while(p<=n);return i}function Ku(e,t,s,n,l,o,a){let r=e.scales[e.axes[t].scale].asinh,d=n>r?xo(e,t,dt(r,s),n,l):[r],v=n>=0&&s<=0?[0]:[];return(s<-r?xo(e,t,dt(r,-n),-s,l):[r]).reverse().map(m=>-m).concat(v,d)}const Hr=/./,Ju=/[12357]/,Qu=/[125]/,ki=/1/,ko=(e,t,s,n)=>e.map((l,o)=>t==4&&l==0||o%n==0&&s.test(l.toExponential()[l<0?1:0])?l:null);function Zu(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=e.scales[a],r=e.valToPos,d=o._space,v=r(10,a),p=r(9,a)-v>=d?Hr:r(7,a)-v>=d?Ju:r(5,a)-v>=d?Qu:ki;if(p==ki){let m=Ue(r(1,a)-v);if(m<d)return ko(t.slice().reverse(),i.distr,p,Et(d/m)).reverse()}return ko(t,i.distr,p,1)}function Xu(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=o._space,r=e.valToPos,d=Ue(r(1,a)-r(2,a));return d<i?ko(t.slice().reverse(),3,Hr,Et(i/d)).reverse():t}function ep(e,t,s,n){return n==null?Bo:t==null?"":Vo(t)}const wi={show:!0,scale:"y",stroke:jo,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:jr,side:3,grid:Ko,ticks:Ir,border:Nr,font:Jo,lineGap:Br,rotate:0};function tp(e,t){let s=3+(e||1)*2;return ye(s*t,3)}function sp(e,t){let{scale:s,idxs:n}=e.series[0],l=e._data[0],o=e.valToPos(l[n[0]],s,!0),a=e.valToPos(l[n[1]],s,!0),i=Ue(a-o),r=e.series[t],d=i/(r.points.space*me);return n[1]-n[0]<=d}const Si={scale:null,auto:!0,sorted:0,min:be,max:-be},Wr=(e,t,s,n,l)=>l,Ti={show:!0,auto:!0,sorted:0,gaps:Wr,alpha:1,facets:[Ne({},Si,{scale:"x"}),Ne({},Si,{scale:"y"})]},Ci={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:Wr,alpha:1,points:{show:sp,filter:null},values:null,min:be,max:-be,idxs:[],path:null,clip:null};function np(e,t,s,n,l){return s/10}const qr={time:Md,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},lp=Ne({},qr,{time:!1,ori:1}),Mi={};function Vr(e,t){let s=Mi[e];return s||(s={key:e,plots:[],sub(n){s.plots.push(n)},unsub(n){s.plots=s.plots.filter(l=>l!=n)},pub(n,l,o,a,i,r,d){for(let v=0;v<s.plots.length;v++)s.plots[v]!=l&&s.plots[v].pub(n,l,o,a,i,r,d)}},e!=null&&(Mi[e]=s)),s}const un=1,wo=2;function Es(e,t,s){const n=e.mode,l=e.series[t],o=n==2?e._data[t]:e._data,a=e.scales,i=e.bbox;let r=o[0],d=n==2?o[1]:o[t],v=n==2?a[l.facets[0].scale]:a[e.series[0].scale],p=n==2?a[l.facets[1].scale]:a[l.scale],m=i.left,_=i.top,x=i.width,E=i.height,T=e.valToPosH,y=e.valToPosV;return v.ori==0?s(l,r,d,v,p,T,y,m,_,x,E,yl,fn,kl,Gr,Kr):s(l,r,d,v,p,y,T,_,m,E,x,xl,vn,Xo,Yr,Jr)}function Qo(e,t){let s=0,n=0,l=fe(e.bands,Uo);for(let o=0;o<l.length;o++){let a=l[o];a.series[0]==t?s=a.dir:a.series[1]==t&&(a.dir==1?n|=1:n|=2)}return[s,n==1?-1:n==2?1:n==3?2:0]}function op(e,t,s,n,l){let o=e.mode,a=e.series[t],i=o==2?a.facets[1].scale:a.scale,r=e.scales[i];return l==-1?r.min:l==1?r.max:r.distr==3?r.dir==1?r.min:r.max:0}function ts(e,t,s,n,l,o){return Es(e,t,(a,i,r,d,v,p,m,_,x,E,T)=>{let y=a.pxRound;const $=d.dir*(d.ori==0?1:-1),k=d.ori==0?fn:vn;let S,B;$==1?(S=s,B=n):(S=n,B=s);let A=y(p(i[S],d,E,_)),O=y(m(r[S],v,T,x)),P=y(p(i[B],d,E,_)),b=y(m(o==1?v.max:v.min,v,T,x)),C=new Path2D(l);return k(C,P,b),k(C,A,b),k(C,A,O),C})}function bl(e,t,s,n,l,o){let a=null;if(e.length>0){a=new Path2D;const i=t==0?kl:Xo;let r=s;for(let p=0;p<e.length;p++){let m=e[p];if(m[1]>m[0]){let _=m[0]-r;_>0&&i(a,r,n,_,n+o),r=m[1]}}let d=s+l-r,v=10;d>0&&i(a,r,n-v/2,d,n+o+v)}return a}function ap(e,t,s){let n=e[e.length-1];n&&n[0]==t?n[1]=s:e.push([t,s])}function Zo(e,t,s,n,l,o,a){let i=[],r=e.length;for(let d=l==1?s:n;d>=s&&d<=n;d+=l)if(t[d]===null){let p=d,m=d;if(l==1)for(;++d<=n&&t[d]===null;)m=d;else for(;--d>=s&&t[d]===null;)m=d;let _=o(e[p]),x=m==p?_:o(e[m]),E=p-l;_=a<=0&&E>=0&&E<r?o(e[E]):_;let y=m+l;x=a>=0&&y>=0&&y<r?o(e[y]):x,x>=_&&i.push([_,x])}return i}function Ei(e){return e==0?xr:e==1?We:t=>ks(t,e)}function Ur(e){let t=e==0?yl:xl,s=e==0?(l,o,a,i,r,d)=>{l.arcTo(o,a,i,r,d)}:(l,o,a,i,r,d)=>{l.arcTo(a,o,r,i,d)},n=e==0?(l,o,a,i,r)=>{l.rect(o,a,i,r)}:(l,o,a,i,r)=>{l.rect(a,o,r,i)};return(l,o,a,i,r,d=0,v=0)=>{d==0&&v==0?n(l,o,a,i,r):(d=Ft(d,i/2,r/2),v=Ft(v,i/2,r/2),t(l,o+d,a),s(l,o+i,a,o+i,a+r,d),s(l,o+i,a+r,o,a+r,v),s(l,o,a+r,o,a,v),s(l,o,a,o+i,a,d),l.closePath())}}const yl=(e,t,s)=>{e.moveTo(t,s)},xl=(e,t,s)=>{e.moveTo(s,t)},fn=(e,t,s)=>{e.lineTo(t,s)},vn=(e,t,s)=>{e.lineTo(s,t)},kl=Ur(0),Xo=Ur(1),Gr=(e,t,s,n,l,o)=>{e.arc(t,s,n,l,o)},Yr=(e,t,s,n,l,o)=>{e.arc(s,t,n,l,o)},Kr=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(t,s,n,l,o,a)},Jr=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(s,t,l,n,a,o)};function Qr(e){return(t,s,n,l,o)=>Es(t,s,(a,i,r,d,v,p,m,_,x,E,T)=>{let{pxRound:y,points:$}=a,k,S;d.ori==0?(k=yl,S=Gr):(k=xl,S=Yr);const B=ye($.width*me,3);let A=($.size-$.width)/2*me,O=ye(A*2,3),P=new Path2D,b=new Path2D,{left:C,top:D,width:F,height:R}=t.bbox;kl(b,C-O,D-O,F+O*2,R+O*2);const W=Y=>{if(r[Y]!=null){let ne=y(p(i[Y],d,E,_)),L=y(m(r[Y],v,T,x));k(P,ne+A,L),S(P,ne,L,A,0,el*2)}};if(o)o.forEach(W);else for(let Y=n;Y<=l;Y++)W(Y);return{stroke:B>0?P:null,fill:P,clip:b,flags:un|wo}})}function Zr(e){return(t,s,n,l,o,a)=>{n!=l&&(o!=n&&a!=n&&e(t,s,n),o!=l&&a!=l&&e(t,s,l),e(t,s,a))}}const ip=Zr(fn),rp=Zr(vn);function Xr(e){const t=fe(e==null?void 0:e.alignGaps,0);return(s,n,l,o)=>Es(s,n,(a,i,r,d,v,p,m,_,x,E,T)=>{[l,o]=hl(r,l,o);let y=a.pxRound,$=R=>y(p(R,d,E,_)),k=R=>y(m(R,v,T,x)),S,B;d.ori==0?(S=fn,B=ip):(S=vn,B=rp);const A=d.dir*(d.ori==0?1:-1),O={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:un},P=O.stroke;let b=!1;if(o-l>=E*4){let R=G=>s.posToVal(G,d.key,!0),W=null,Y=null,ne,L,j,q=$(i[A==1?l:o]),V=$(i[l]),le=$(i[o]),oe=R(A==1?V+1:le-1);for(let G=A==1?l:o;G>=l&&G<=o;G+=A){let Le=i[G],Me=(A==1?Le<oe:Le>oe)?q:$(Le),ue=r[G];Me==q?ue!=null?(L=ue,W==null?(S(P,Me,k(L)),ne=W=Y=L):L<W?W=L:L>Y&&(Y=L)):ue===null&&(b=!0):(W!=null&&B(P,q,k(W),k(Y),k(ne),k(L)),ue!=null?(L=ue,S(P,Me,k(L)),W=Y=ne=L):(W=Y=null,ue===null&&(b=!0)),q=Me,oe=R(q+A))}W!=null&&W!=Y&&j!=q&&B(P,q,k(W),k(Y),k(ne),k(L))}else for(let R=A==1?l:o;R>=l&&R<=o;R+=A){let W=r[R];W===null?b=!0:W!=null&&S(P,$(i[R]),k(W))}let[D,F]=Qo(s,n);if(a.fill!=null||D!=0){let R=O.fill=new Path2D(P),W=a.fillTo(s,n,a.min,a.max,D),Y=k(W),ne=$(i[l]),L=$(i[o]);A==-1&&([L,ne]=[ne,L]),S(R,L,Y),S(R,ne,Y)}if(!a.spanGaps){let R=[];b&&R.push(...Zo(i,r,l,o,A,$,t)),O.gaps=R=a.gaps(s,n,l,o,R),O.clip=bl(R,d.ori,_,x,E,T)}return F!=0&&(O.band=F==2?[ts(s,n,l,o,P,-1),ts(s,n,l,o,P,1)]:ts(s,n,l,o,P,F)),O})}function cp(e){const t=fe(e.align,1),s=fe(e.ascDesc,!1),n=fe(e.alignGaps,0),l=fe(e.extend,!1);return(o,a,i,r)=>Es(o,a,(d,v,p,m,_,x,E,T,y,$,k)=>{[i,r]=hl(p,i,r);let S=d.pxRound,{left:B,width:A}=o.bbox,O=V=>S(x(V,m,$,T)),P=V=>S(E(V,_,k,y)),b=m.ori==0?fn:vn;const C={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:un},D=C.stroke,F=m.dir*(m.ori==0?1:-1);let R=P(p[F==1?i:r]),W=O(v[F==1?i:r]),Y=W,ne=W;l&&t==-1&&(ne=B,b(D,ne,R)),b(D,W,R);for(let V=F==1?i:r;V>=i&&V<=r;V+=F){let le=p[V];if(le==null)continue;let oe=O(v[V]),G=P(le);t==1?b(D,oe,R):b(D,Y,G),b(D,oe,G),R=G,Y=oe}let L=Y;l&&t==1&&(L=B+A,b(D,L,R));let[j,q]=Qo(o,a);if(d.fill!=null||j!=0){let V=C.fill=new Path2D(D),le=d.fillTo(o,a,d.min,d.max,j),oe=P(le);b(V,L,oe),b(V,ne,oe)}if(!d.spanGaps){let V=[];V.push(...Zo(v,p,i,r,F,O,n));let le=d.width*me/2,oe=s||t==1?le:-le,G=s||t==-1?-le:le;V.forEach(Le=>{Le[0]+=oe,Le[1]+=G}),C.gaps=V=d.gaps(o,a,i,r,V),C.clip=bl(V,m.ori,T,y,$,k)}return q!=0&&(C.band=q==2?[ts(o,a,i,r,D,-1),ts(o,a,i,r,D,1)]:ts(o,a,i,r,D,q)),C})}function Li(e,t,s,n,l,o,a=be){if(e.length>1){let i=null;for(let r=0,d=1/0;r<e.length;r++)if(t[r]!==void 0){if(i!=null){let v=Ue(e[r]-e[i]);v<d&&(d=v,a=Ue(s(e[r],n,l,o)-s(e[i],n,l,o)))}i=r}}return a}function dp(e){e=e||Ln;const t=fe(e.size,[.6,be,1]),s=e.align||0,n=e.gap||0;let l=e.radius;l=l==null?[0,0]:typeof l=="number"?[l,0]:l;const o=ce(l),a=1-t[0],i=fe(t[1],be),r=fe(t[2],1),d=fe(e.disp,Ln),v=fe(e.each,_=>{}),{fill:p,stroke:m}=d;return(_,x,E,T)=>Es(_,x,(y,$,k,S,B,A,O,P,b,C,D)=>{let F=y.pxRound,R=s,W=n*me,Y=i*me,ne=r*me,L,j;S.ori==0?[L,j]=o(_,x):[j,L]=o(_,x);const q=S.dir*(S.ori==0?1:-1);let V=S.ori==0?kl:Xo,le=S.ori==0?v:(Q,xe,He,Os,ms,Bt,hs)=>{v(Q,xe,He,ms,Os,hs,Bt)},oe=fe(_.bands,Uo).find(Q=>Q.series[0]==x),G=oe!=null?oe.dir:0,Le=y.fillTo(_,x,y.min,y.max,G),Re=F(O(Le,B,D,b)),Me,ue,Lt,ft=C,De=F(y.width*me),jt=!1,Kt=null,xt=null,ss=null,Ls=null;p!=null&&(De==0||m!=null)&&(jt=!0,Kt=p.values(_,x,E,T),xt=new Map,new Set(Kt).forEach(Q=>{Q!=null&&xt.set(Q,new Path2D)}),De>0&&(ss=m.values(_,x,E,T),Ls=new Map,new Set(ss).forEach(Q=>{Q!=null&&Ls.set(Q,new Path2D)})));let{x0:Ds,size:mn}=d;if(Ds!=null&&mn!=null){R=1,$=Ds.values(_,x,E,T),Ds.unit==2&&($=$.map(He=>_.posToVal(P+He*C,S.key,!0)));let Q=mn.values(_,x,E,T);mn.unit==2?ue=Q[0]*C:ue=A(Q[0],S,C,P)-A(0,S,C,P),ft=Li($,k,A,S,C,P,ft),Lt=ft-ue+W}else ft=Li($,k,A,S,C,P,ft),Lt=ft*a+W,ue=ft-Lt;Lt<1&&(Lt=0),De>=ue/2&&(De=0),Lt<5&&(F=xr);let On=Lt>0,fs=ft-Lt-(On?De:0);ue=F(yo(fs,ne,Y)),Me=(R==0?ue/2:R==q?0:ue)-R*q*((R==0?W/2:0)+(On?De/2:0));const at={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},As=jt?null:new Path2D;let Jt=null;if(oe!=null)Jt=_.data[oe.series[1]];else{let{y0:Q,y1:xe}=d;Q!=null&&xe!=null&&(k=xe.values(_,x,E,T),Jt=Q.values(_,x,E,T))}let vs=L*ue,ae=j*ue;for(let Q=q==1?E:T;Q>=E&&Q<=T;Q+=q){let xe=k[Q];if(xe==null)continue;if(Jt!=null){let ut=Jt[Q]??0;if(xe-ut==0)continue;Re=O(ut,B,D,b)}let He=S.distr!=2||d!=null?$[Q]:Q,Os=A(He,S,C,P),ms=O(fe(xe,Le),B,D,b),Bt=F(Os-Me),hs=F(dt(ms,Re)),vt=F(Ft(ms,Re)),kt=hs-vt;if(xe!=null){let ut=xe<0?ae:vs,Dt=xe<0?vs:ae;jt?(De>0&&ss[Q]!=null&&V(Ls.get(ss[Q]),Bt,vt+$t(De/2),ue,dt(0,kt-De),ut,Dt),Kt[Q]!=null&&V(xt.get(Kt[Q]),Bt,vt+$t(De/2),ue,dt(0,kt-De),ut,Dt)):V(As,Bt,vt+$t(De/2),ue,dt(0,kt-De),ut,Dt),le(_,x,Q,Bt-De/2,vt,ue+De,kt)}}return De>0?at.stroke=jt?Ls:As:jt||(at._fill=y.width==0?y._fill:y._stroke??y._fill,at.width=0),at.fill=jt?xt:As,at})}function up(e,t){const s=fe(t==null?void 0:t.alignGaps,0);return(n,l,o,a)=>Es(n,l,(i,r,d,v,p,m,_,x,E,T,y)=>{[o,a]=hl(d,o,a);let $=i.pxRound,k=L=>$(m(L,v,T,x)),S=L=>$(_(L,p,y,E)),B,A,O;v.ori==0?(B=yl,O=fn,A=Kr):(B=xl,O=vn,A=Jr);const P=v.dir*(v.ori==0?1:-1);let b=k(r[P==1?o:a]),C=b,D=[],F=[];for(let L=P==1?o:a;L>=o&&L<=a;L+=P)if(d[L]!=null){let q=r[L],V=k(q);D.push(C=V),F.push(S(d[L]))}const R={stroke:e(D,F,B,O,A,$),fill:null,clip:null,band:null,gaps:null,flags:un},W=R.stroke;let[Y,ne]=Qo(n,l);if(i.fill!=null||Y!=0){let L=R.fill=new Path2D(W),j=i.fillTo(n,l,i.min,i.max,Y),q=S(j);O(L,C,q),O(L,b,q)}if(!i.spanGaps){let L=[];L.push(...Zo(r,d,o,a,P,k,s)),R.gaps=L=i.gaps(n,l,o,a,L),R.clip=bl(L,v.ori,x,E,T,y)}return ne!=0&&(R.band=ne==2?[ts(n,l,o,a,W,-1),ts(n,l,o,a,W,1)]:ts(n,l,o,a,W,ne)),R})}function pp(e){return up(fp,e)}function fp(e,t,s,n,l,o){const a=e.length;if(a<2)return null;const i=new Path2D;if(s(i,e[0],t[0]),a==2)n(i,e[1],t[1]);else{let r=Array(a),d=Array(a-1),v=Array(a-1),p=Array(a-1);for(let m=0;m<a-1;m++)v[m]=t[m+1]-t[m],p[m]=e[m+1]-e[m],d[m]=v[m]/p[m];r[0]=d[0];for(let m=1;m<a-1;m++)d[m]===0||d[m-1]===0||d[m-1]>0!=d[m]>0?r[m]=0:(r[m]=3*(p[m-1]+p[m])/((2*p[m]+p[m-1])/d[m-1]+(p[m]+2*p[m-1])/d[m]),isFinite(r[m])||(r[m]=0));r[a-1]=d[a-2];for(let m=0;m<a-1;m++)l(i,e[m]+p[m]/3,t[m]+r[m]*p[m]/3,e[m+1]-p[m]/3,t[m+1]-r[m+1]*p[m]/3,e[m+1],t[m+1])}return i}const So=new Set;function Di(){for(let e of So)e.syncRect(!0)}pn&&(Ts(Gd,ln,Di),Ts(Yd,ln,Di,!0),Ts(il,ln,()=>{nt.pxRatio=me}));const vp=Xr(),mp=Qr();function Ai(e,t,s,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,a)=>To(o,a,t,s))}function hp(e,t){return e.map((s,n)=>n==0?{}:Ne({},t,s))}function To(e,t,s,n){return Ne({},t==0?s:n,e)}function ec(e,t,s){return t==null?cn:[t,s]}const gp=ec;function _p(e,t,s){return t==null?cn:rl(t,s,qo,!0)}function tc(e,t,s,n){return t==null?cn:gl(t,s,e.scales[n].log,!1)}const $p=tc;function sc(e,t,s,n){return t==null?cn:Wo(t,s,e.scales[n].log,!1)}const bp=sc;function yp(e,t,s,n,l){let o=dt(di(e),di(t)),a=t-e,i=Rt(l/n*a,s);do{let r=s[i],d=n*r/a;if(d>=l&&o+(r<5?ps.get(r):0)<=17)return[r,d]}while(++i<s.length);return[0,0]}function Oi(e){let t,s;return e=e.replace(/(\d+)px/,(n,l)=>(t=We((s=+l)*me))+"px"),[e,t,s]}function xp(e){e.show&&[e.font,e.labelFont].forEach(t=>{let s=ye(t[2]*me,1);t[0]=t[0].replace(/[0-9.]+px/,s+"px"),t[1]=s})}function nt(e,t,s){const n={mode:fe(e.mode,1)},l=n.mode;function o(u,f,h,g){let w=f.valToPct(u);return g+h*(f.dir==-1?1-w:w)}function a(u,f,h,g){let w=f.valToPct(u);return g+h*(f.dir==-1?w:1-w)}function i(u,f,h,g){return f.ori==0?o(u,f,h,g):a(u,f,h,g)}n.valToPosH=o,n.valToPosV=a;let r=!1;n.status=0;const d=n.root=Mt(Ed);if(e.id!=null&&(d.id=e.id),_t(d,e.class),e.title){let u=Mt(Ad,d);u.textContent=e.title}const v=zt("canvas"),p=n.ctx=v.getContext("2d"),m=Mt(Od,d);Ts("click",m,u=>{u.target===x&&(ke!=qs||Ee!=Vs)&&st.click(n,u)},!0);const _=n.under=Mt(Pd,m);m.appendChild(v);const x=n.over=Mt(zd,m);e=dn(e);const E=+fe(e.pxAlign,1),T=Ei(E);(e.plugins||[]).forEach(u=>{u.opts&&(e=u.opts(n,e)||e)});const y=e.ms||.001,$=n.series=l==1?Ai(e.series||[],xi,Ci,!1):hp(e.series||[null],Ti),k=n.axes=Ai(e.axes||[],yi,wi,!0),S=n.scales={},B=n.bands=e.bands||[];B.forEach(u=>{u.fill=ce(u.fill||null),u.dir=fe(u.dir,-1)});const A=l==2?$[1].facets[0].scale:$[0].scale,O={axes:wc,series:$c},P=(e.drawOrder||["axes","series"]).map(u=>O[u]);function b(u){const f=u.distr==3?h=>es(h>0?h:u.clamp(n,h,u.min,u.max,u.key)):u.distr==4?h=>to(h,u.asinh):u.distr==100?h=>u.fwd(h):h=>h;return h=>{let g=f(h),{_min:w,_max:M}=u,I=M-w;return(g-w)/I}}function C(u){let f=S[u];if(f==null){let h=(e.scales||Ln)[u]||Ln;if(h.from!=null){C(h.from);let g=Ne({},S[h.from],h,{key:u});g.valToPct=b(g),S[u]=g}else{f=S[u]=Ne({},u==A?qr:lp,h),f.key=u;let g=f.time,w=f.range,M=cs(w);if((u!=A||l==2&&!g)&&(M&&(w[0]==null||w[1]==null)&&(w={min:w[0]==null?ii:{mode:1,hard:w[0],soft:w[0]},max:w[1]==null?ii:{mode:1,hard:w[1],soft:w[1]}},M=!1),!M&&$l(w))){let I=w;w=(N,H,K)=>H==null?cn:rl(H,K,I)}f.range=ce(w||(g?gp:u==A?f.distr==3?$p:f.distr==4?bp:ec:f.distr==3?tc:f.distr==4?sc:_p)),f.auto=ce(M?!1:f.auto),f.clamp=ce(f.clamp||np),f._min=f._max=null,f.valToPct=b(f)}}}C("x"),C("y"),l==1&&$.forEach(u=>{C(u.scale)}),k.forEach(u=>{C(u.scale)});for(let u in e.scales)C(u);const D=S[A],F=D.distr;let R,W;D.ori==0?(_t(d,Ld),R=o,W=a):(_t(d,Dd),R=a,W=o);const Y={};for(let u in S){let f=S[u];(f.min!=null||f.max!=null)&&(Y[u]={min:f.min,max:f.max},f.min=f.max=null)}const ne=e.tzDate||(u=>new Date(We(u/y))),L=e.fmtDate||Go,j=y==1?Lu(ne):Ou(ne),q=_i(ne,gi(y==1?Eu:Au,L)),V=bi(ne,$i(zu,L)),le=[],oe=n.legend=Ne({},Iu,e.legend),G=n.cursor=Ne({},qu,{drag:{y:l==2}},e.cursor),Le=oe.show,Re=G.show,Me=oe.markers;oe.idxs=le,Me.width=ce(Me.width),Me.dash=ce(Me.dash),Me.stroke=ce(Me.stroke),Me.fill=ce(Me.fill);let ue,Lt,ft,De=[],jt=[],Kt,xt=!1,ss={};if(oe.live){const u=$[1]?$[1].values:null;xt=u!=null,Kt=xt?u(n,1,0):{_:0};for(let f in Kt)ss[f]=Bo}if(Le)if(ue=zt("table",Bd,d),ft=zt("tbody",null,ue),oe.mount(n,ue),xt){Lt=zt("thead",null,ue,ft);let u=zt("tr",null,Lt);zt("th",null,u);for(var Ls in Kt)zt("th",Ya,u).textContent=Ls}else _t(ue,Wd),oe.live&&_t(ue,Hd);const Ds={show:!0},mn={show:!1};function On(u,f){if(f==0&&(xt||!oe.live||l==2))return cn;let h=[],g=zt("tr",qd,ft,ft.childNodes[f]);_t(g,u.class),u.show||_t(g,Ss);let w=zt("th",null,g);if(Me.show){let N=Mt(Vd,w);if(f>0){let H=Me.width(n,f);H&&(N.style.border=H+"px "+Me.dash(n,f)+" "+Me.stroke(n,f)),N.style.background=Me.fill(n,f)}}let M=Mt(Ya,w);u.label instanceof HTMLElement?M.appendChild(u.label):M.textContent=u.label,f>0&&(Me.show||(M.style.color=u.width>0?Me.stroke(n,f):Me.fill(n,f)),at("click",w,N=>{if(G._lock)return;_s(N);let H=$.indexOf(u);if((N.ctrlKey||N.metaKey)!=oe.isolate){let K=$.some((J,Z)=>Z>0&&Z!=H&&J.show);$.forEach((J,Z)=>{Z>0&&Wt(Z,K?Z==H?Ds:mn:Ds,!0,Fe.setSeries)})}else Wt(H,{show:!u.show},!0,Fe.setSeries)},!1),zs&&at(Za,w,N=>{G._lock||(_s(N),Wt($.indexOf(u),Gs,!0,Fe.setSeries))},!1));for(var I in Kt){let N=zt("td",Ud,g);N.textContent="--",h.push(N)}return[g,h]}const fs=new Map;function at(u,f,h,g=!0){const w=fs.get(f)||{},M=G.bind[u](n,f,h,g);M&&(Ts(u,f,w[u]=M),fs.set(f,w))}function As(u,f,h){const g=fs.get(f)||{};for(let w in g)(u==null||w==u)&&(bo(w,f,g[w]),delete g[w]);u==null&&fs.delete(f)}let Jt=0,vs=0,ae=0,Q=0,xe=0,He=0,Os=xe,ms=He,Bt=ae,hs=Q,vt=0,kt=0,ut=0,Dt=0;n.bbox={};let wl=!1,Pn=!1,Ps=!1,gs=!1,zn=!1,wt=!1;function Sl(u,f,h){(h||u!=n.width||f!=n.height)&&ea(u,f),js(!1),Ps=!0,Pn=!0,Bs()}function ea(u,f){n.width=Jt=ae=u,n.height=vs=Q=f,xe=He=0,pc(),fc();let h=n.bbox;vt=h.left=ks(xe*me,.5),kt=h.top=ks(He*me,.5),ut=h.width=ks(ae*me,.5),Dt=h.height=ks(Q*me,.5)}const cc=3;function dc(){let u=!1,f=0;for(;!u;){f++;let h=xc(f),g=kc(f);u=f==cc||h&&g,u||(ea(n.width,n.height),Pn=!0)}}function uc({width:u,height:f}){Sl(u,f)}n.setSize=uc;function pc(){let u=!1,f=!1,h=!1,g=!1;k.forEach((w,M)=>{if(w.show&&w._show){let{side:I,_size:N}=w,H=I%2,K=w.label!=null?w.labelSize:0,J=N+K;J>0&&(H?(ae-=J,I==3?(xe+=J,g=!0):h=!0):(Q-=J,I==0?(He+=J,u=!0):f=!0))}}),$s[0]=u,$s[1]=h,$s[2]=f,$s[3]=g,ae-=ns[1]+ns[3],xe+=ns[3],Q-=ns[2]+ns[0],He+=ns[0]}function fc(){let u=xe+ae,f=He+Q,h=xe,g=He;function w(M,I){switch(M){case 1:return u+=I,u-I;case 2:return f+=I,f-I;case 3:return h-=I,h+I;case 0:return g-=I,g+I}}k.forEach((M,I)=>{if(M.show&&M._show){let N=M.side;M._pos=w(N,M._size),M.label!=null&&(M._lpos=w(N,M.labelSize))}})}if(G.dataIdx==null){let u=G.hover,f=u.skip=new Set(u.skip??[]);f.add(void 0);let h=u.prox=ce(u.prox),g=u.bias??(u.bias=0);G.dataIdx=(w,M,I,N)=>{if(M==0)return I;let H=I,K=h(w,M,I,N)??be,J=K>=0&&K<be,Z=D.ori==0?ae:Q,se=G.left,ve=t[0],pe=t[M];if(f.has(pe[I])){H=null;let re=null,te=null,ee;if(g==0||g==-1)for(ee=I;re==null&&ee-- >0;)f.has(pe[ee])||(re=ee);if(g==0||g==1)for(ee=I;te==null&&ee++<pe.length;)f.has(pe[ee])||(te=ee);if(re!=null||te!=null)if(J){let Se=re==null?-1/0:R(ve[re],D,Z,0),Pe=te==null?1/0:R(ve[te],D,Z,0),Xe=se-Se,$e=Pe-se;Xe<=$e?Xe<=K&&(H=re):$e<=K&&(H=te)}else H=te==null?re:re==null?te:I-re<=te-I?re:te}else J&&Ue(se-R(ve[I],D,Z,0))>K&&(H=null);return H}}const _s=u=>{G.event=u};G.idxs=le,G._lock=!1;let lt=G.points;lt.show=ce(lt.show),lt.size=ce(lt.size),lt.stroke=ce(lt.stroke),lt.width=ce(lt.width),lt.fill=ce(lt.fill);const Ht=n.focus=Ne({},e.focus||{alpha:.3},G.focus),zs=Ht.prox>=0,Rs=zs&&lt.one;let St=[],Fs=[],Is=[];function ta(u,f){let h=lt.show(n,f);if(h instanceof HTMLElement)return _t(h,jd),_t(h,u.class),Gt(h,-10,-10,ae,Q),x.insertBefore(h,St[f]),h}function sa(u,f){if(l==1||f>0){let h=l==1&&S[u.scale].time,g=u.value;u.value=h?fi(g)?bi(ne,$i(g,L)):g||V:g||ep,u.label=u.label||(h?Uu:Vu)}if(Rs||f>0){u.width=u.width==null?1:u.width,u.paths=u.paths||vp||lu,u.fillTo=ce(u.fillTo||op),u.pxAlign=+fe(u.pxAlign,E),u.pxRound=Ei(u.pxAlign),u.stroke=ce(u.stroke||null),u.fill=ce(u.fill||null),u._stroke=u._fill=u._paths=u._focus=null;let h=tp(dt(1,u.width),1),g=u.points=Ne({},{size:h,width:dt(1,h*.2),stroke:u.stroke,space:h*2,paths:mp,_stroke:null,_fill:null},u.points);g.show=ce(g.show),g.filter=ce(g.filter),g.fill=ce(g.fill),g.stroke=ce(g.stroke),g.paths=ce(g.paths),g.pxAlign=u.pxAlign}if(Le){let h=On(u,f);De.splice(f,0,h[0]),jt.splice(f,0,h[1]),oe.values.push(null)}if(Re){le.splice(f,0,null);let h=null;Rs?f==0&&(h=ta(u,f)):f>0&&(h=ta(u,f)),St.splice(f,0,h),Fs.splice(f,0,0),Is.splice(f,0,0)}Ze("addSeries",f)}function vc(u,f){f=f??$.length,u=l==1?To(u,f,xi,Ci):To(u,f,{},Ti),$.splice(f,0,u),sa($[f],f)}n.addSeries=vc;function mc(u){if($.splice(u,1),Le){oe.values.splice(u,1),jt.splice(u,1);let f=De.splice(u,1)[0];As(null,f.firstChild),f.remove()}Re&&(le.splice(u,1),St.splice(u,1)[0].remove(),Fs.splice(u,1),Is.splice(u,1)),Ze("delSeries",u)}n.delSeries=mc;const $s=[!1,!1,!1,!1];function hc(u,f){if(u._show=u.show,u.show){let h=u.side%2,g=S[u.scale];g==null&&(u.scale=h?$[1].scale:A,g=S[u.scale]);let w=g.time;u.size=ce(u.size),u.space=ce(u.space),u.rotate=ce(u.rotate),cs(u.incrs)&&u.incrs.forEach(I=>{!ps.has(I)&&ps.set(I,Sr(I))}),u.incrs=ce(u.incrs||(g.distr==2?Tu:w?y==1?Mu:Du:ws)),u.splits=ce(u.splits||(w&&g.distr==1?j:g.distr==3?xo:g.distr==4?Ku:Yu)),u.stroke=ce(u.stroke),u.grid.stroke=ce(u.grid.stroke),u.ticks.stroke=ce(u.ticks.stroke),u.border.stroke=ce(u.border.stroke);let M=u.values;u.values=cs(M)&&!cs(M[0])?ce(M):w?cs(M)?_i(ne,gi(M,L)):fi(M)?Pu(ne,M):M||q:M||Gu,u.filter=ce(u.filter||(g.distr>=3&&g.log==10?Zu:g.distr==3&&g.log==2?Xu:kr)),u.font=Oi(u.font),u.labelFont=Oi(u.labelFont),u._size=u.size(n,null,f,0),u._space=u._rotate=u._incrs=u._found=u._splits=u._values=null,u._size>0&&($s[f]=!0,u._el=Mt(Rd,m))}}function hn(u,f,h,g){let[w,M,I,N]=h,H=f%2,K=0;return H==0&&(N||M)&&(K=f==0&&!w||f==2&&!I?We(yi.size/3):0),H==1&&(w||I)&&(K=f==1&&!M||f==3&&!N?We(wi.size/2):0),K}const na=n.padding=(e.padding||[hn,hn,hn,hn]).map(u=>ce(fe(u,hn))),ns=n._padding=na.map((u,f)=>u(n,f,$s,0));let tt,Ye=null,Ke=null;const Rn=l==1?$[0].idxs:null;let At=null,gn=!1;function la(u,f){if(t=u??[],n.data=n._data=t,l==2){tt=0;for(let h=1;h<$.length;h++)tt+=t[h][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),At=t[0],tt=At.length;let h=t;if(F==2){h=t.slice();let g=h[0]=Array(tt);for(let w=0;w<tt;w++)g[w]=w}n._data=t=h}if(js(!0),Ze("setData"),F==2&&(Ps=!0),f!==!1){let h=D;h.auto(n,gn)?Tl():os(A,h.min,h.max),gs=gs||G.left>=0,wt=!0,Bs()}}n.setData=la;function Tl(){gn=!0;let u,f;l==1&&(tt>0?(Ye=Rn[0]=0,Ke=Rn[1]=tt-1,u=t[0][Ye],f=t[0][Ke],F==2?(u=Ye,f=Ke):u==f&&(F==3?[u,f]=gl(u,u,D.log,!1):F==4?[u,f]=Wo(u,u,D.log,!1):D.time?f=u+We(86400/y):[u,f]=rl(u,f,qo,!0))):(Ye=Rn[0]=u=null,Ke=Rn[1]=f=null)),os(A,u,f)}let Fn,Ns,Cl,Ml,El,Ll,Dl,Al,Ol,pt;function oa(u,f,h,g,w,M){u??(u=Ja),h??(h=Uo),g??(g="butt"),w??(w=Ja),M??(M="round"),u!=Fn&&(p.strokeStyle=Fn=u),w!=Ns&&(p.fillStyle=Ns=w),f!=Cl&&(p.lineWidth=Cl=f),M!=El&&(p.lineJoin=El=M),g!=Ll&&(p.lineCap=Ll=g),h!=Ml&&p.setLineDash(Ml=h)}function aa(u,f,h,g){f!=Ns&&(p.fillStyle=Ns=f),u!=Dl&&(p.font=Dl=u),h!=Al&&(p.textAlign=Al=h),g!=Ol&&(p.textBaseline=Ol=g)}function Pl(u,f,h,g,w=0){if(g.length>0&&u.auto(n,gn)&&(f==null||f.min==null)){let M=fe(Ye,0),I=fe(Ke,g.length-1),N=h.min==null?Zd(g,M,I,w,u.distr==3):[h.min,h.max];u.min=Ft(u.min,h.min=N[0]),u.max=dt(u.max,h.max=N[1])}}const ia={min:null,max:null};function gc(){for(let g in S){let w=S[g];Y[g]==null&&(w.min==null||Y[A]!=null&&w.auto(n,gn))&&(Y[g]=ia)}for(let g in S){let w=S[g];Y[g]==null&&w.from!=null&&Y[w.from]!=null&&(Y[g]=ia)}Y[A]!=null&&js(!0);let u={};for(let g in Y){let w=Y[g];if(w!=null){let M=u[g]=dn(S[g],iu);if(w.min!=null)Ne(M,w);else if(g!=A||l==2)if(tt==0&&M.from==null){let I=M.range(n,null,null,g);M.min=I[0],M.max=I[1]}else M.min=be,M.max=-be}}if(tt>0){$.forEach((g,w)=>{if(l==1){let M=g.scale,I=Y[M];if(I==null)return;let N=u[M];if(w==0){let H=N.range(n,N.min,N.max,M);N.min=H[0],N.max=H[1],Ye=Rt(N.min,t[0]),Ke=Rt(N.max,t[0]),Ke-Ye>1&&(t[0][Ye]<N.min&&Ye++,t[0][Ke]>N.max&&Ke--),g.min=At[Ye],g.max=At[Ke]}else g.show&&g.auto&&Pl(N,I,g,t[w],g.sorted);g.idxs[0]=Ye,g.idxs[1]=Ke}else if(w>0&&g.show&&g.auto){let[M,I]=g.facets,N=M.scale,H=I.scale,[K,J]=t[w],Z=u[N],se=u[H];Z!=null&&Pl(Z,Y[N],M,K,M.sorted),se!=null&&Pl(se,Y[H],I,J,I.sorted),g.min=I.min,g.max=I.max}});for(let g in u){let w=u[g],M=Y[g];if(w.from==null&&(M==null||M.min==null)){let I=w.range(n,w.min==be?null:w.min,w.max==-be?null:w.max,g);w.min=I[0],w.max=I[1]}}}for(let g in u){let w=u[g];if(w.from!=null){let M=u[w.from];if(M.min==null)w.min=w.max=null;else{let I=w.range(n,M.min,M.max,g);w.min=I[0],w.max=I[1]}}}let f={},h=!1;for(let g in u){let w=u[g],M=S[g];if(M.min!=w.min||M.max!=w.max){M.min=w.min,M.max=w.max;let I=M.distr;M._min=I==3?es(M.min):I==4?to(M.min,M.asinh):I==100?M.fwd(M.min):M.min,M._max=I==3?es(M.max):I==4?to(M.max,M.asinh):I==100?M.fwd(M.max):M.max,f[g]=h=!0}}if(h){$.forEach((g,w)=>{l==2?w>0&&f.y&&(g._paths=null):f[g.scale]&&(g._paths=null)});for(let g in f)Ps=!0,Ze("setScale",g);Re&&G.left>=0&&(gs=wt=!0)}for(let g in Y)Y[g]=null}function _c(u){let f=yo(Ye-1,0,tt-1),h=yo(Ke+1,0,tt-1);for(;u[f]==null&&f>0;)f--;for(;u[h]==null&&h<tt-1;)h++;return[f,h]}function $c(){if(tt>0){let u=$.some(f=>f._focus)&&pt!=Ht.alpha;u&&(p.globalAlpha=pt=Ht.alpha),$.forEach((f,h)=>{if(h>0&&f.show&&(ra(h,!1),ra(h,!0),f._paths==null)){let g=pt;pt!=f.alpha&&(p.globalAlpha=pt=f.alpha);let w=l==2?[0,t[h][0].length-1]:_c(t[h]);f._paths=f.paths(n,h,w[0],w[1]),pt!=g&&(p.globalAlpha=pt=g)}}),$.forEach((f,h)=>{if(h>0&&f.show){let g=pt;pt!=f.alpha&&(p.globalAlpha=pt=f.alpha),f._paths!=null&&ca(h,!1);{let w=f._paths!=null?f._paths.gaps:null,M=f.points.show(n,h,Ye,Ke,w),I=f.points.filter(n,h,M,w);(M||I)&&(f.points._paths=f.points.paths(n,h,Ye,Ke,I),ca(h,!0))}pt!=g&&(p.globalAlpha=pt=g),Ze("drawSeries",h)}}),u&&(p.globalAlpha=pt=1)}}function ra(u,f){let h=f?$[u].points:$[u];h._stroke=h.stroke(n,u),h._fill=h.fill(n,u)}function ca(u,f){let h=f?$[u].points:$[u],{stroke:g,fill:w,clip:M,flags:I,_stroke:N=h._stroke,_fill:H=h._fill,_width:K=h.width}=h._paths;K=ye(K*me,3);let J=null,Z=K%2/2;f&&H==null&&(H=K>0?"#fff":N);let se=h.pxAlign==1&&Z>0;if(se&&p.translate(Z,Z),!f){let ve=vt-K/2,pe=kt-K/2,re=ut+K,te=Dt+K;J=new Path2D,J.rect(ve,pe,re,te)}f?zl(N,K,h.dash,h.cap,H,g,w,I,M):bc(u,N,K,h.dash,h.cap,H,g,w,I,J,M),se&&p.translate(-Z,-Z)}function bc(u,f,h,g,w,M,I,N,H,K,J){let Z=!1;H!=0&&B.forEach((se,ve)=>{if(se.series[0]==u){let pe=$[se.series[1]],re=t[se.series[1]],te=(pe._paths||Ln).band;cs(te)&&(te=se.dir==1?te[0]:te[1]);let ee,Se=null;pe.show&&te&&eu(re,Ye,Ke)?(Se=se.fill(n,ve)||M,ee=pe._paths.clip):te=null,zl(f,h,g,w,Se,I,N,H,K,J,ee,te),Z=!0}}),Z||zl(f,h,g,w,M,I,N,H,K,J)}const da=un|wo;function zl(u,f,h,g,w,M,I,N,H,K,J,Z){oa(u,f,h,g,w),(H||K||Z)&&(p.save(),H&&p.clip(H),K&&p.clip(K)),Z?(N&da)==da?(p.clip(Z),J&&p.clip(J),Nn(w,I),In(u,M,f)):N&wo?(Nn(w,I),p.clip(Z),In(u,M,f)):N&un&&(p.save(),p.clip(Z),J&&p.clip(J),Nn(w,I),p.restore(),In(u,M,f)):(Nn(w,I),In(u,M,f)),(H||K||Z)&&p.restore()}function In(u,f,h){h>0&&(f instanceof Map?f.forEach((g,w)=>{p.strokeStyle=Fn=w,p.stroke(g)}):f!=null&&u&&p.stroke(f))}function Nn(u,f){f instanceof Map?f.forEach((h,g)=>{p.fillStyle=Ns=g,p.fill(h)}):f!=null&&u&&p.fill(f)}function yc(u,f,h,g){let w=k[u],M;if(g<=0)M=[0,0];else{let I=w._space=w.space(n,u,f,h,g),N=w._incrs=w.incrs(n,u,f,h,g,I);M=yp(f,h,N,g,I)}return w._found=M}function Rl(u,f,h,g,w,M,I,N,H,K){let J=I%2/2;E==1&&p.translate(J,J),oa(N,I,H,K,N),p.beginPath();let Z,se,ve,pe,re=w+(g==0||g==3?-M:M);h==0?(se=w,pe=re):(Z=w,ve=re);for(let te=0;te<u.length;te++)f[te]!=null&&(h==0?Z=ve=u[te]:se=pe=u[te],p.moveTo(Z,se),p.lineTo(ve,pe));p.stroke(),E==1&&p.translate(-J,-J)}function xc(u){let f=!0;return k.forEach((h,g)=>{if(!h.show)return;let w=S[h.scale];if(w.min==null){h._show&&(f=!1,h._show=!1,js(!1));return}else h._show||(f=!1,h._show=!0,js(!1));let M=h.side,I=M%2,{min:N,max:H}=w,[K,J]=yc(g,N,H,I==0?ae:Q);if(J==0)return;let Z=w.distr==2,se=h._splits=h.splits(n,g,N,H,K,J,Z),ve=w.distr==2?se.map(ee=>At[ee]):se,pe=w.distr==2?At[se[1]]-At[se[0]]:K,re=h._values=h.values(n,h.filter(n,ve,g,J,pe),g,J,pe);h._rotate=M==2?h.rotate(n,re,g,J):0;let te=h._size;h._size=Et(h.size(n,re,g,u)),te!=null&&h._size!=te&&(f=!1)}),f}function kc(u){let f=!0;return na.forEach((h,g)=>{let w=h(n,g,$s,u);w!=ns[g]&&(f=!1),ns[g]=w}),f}function wc(){for(let u=0;u<k.length;u++){let f=k[u];if(!f.show||!f._show)continue;let h=f.side,g=h%2,w,M,I=f.stroke(n,u),N=h==0||h==3?-1:1,[H,K]=f._found;if(f.label!=null){let rt=f.labelGap*N,gt=We((f._lpos+rt)*me);aa(f.labelFont[0],I,"center",h==2?kn:Ka),p.save(),g==1?(w=M=0,p.translate(gt,We(kt+Dt/2)),p.rotate((h==3?-el:el)/2)):(w=We(vt+ut/2),M=gt);let xs=yr(f.label)?f.label(n,u,H,K):f.label;p.fillText(xs,w,M),p.restore()}if(K==0)continue;let J=S[f.scale],Z=g==0?ut:Dt,se=g==0?vt:kt,ve=f._splits,pe=J.distr==2?ve.map(rt=>At[rt]):ve,re=J.distr==2?At[ve[1]]-At[ve[0]]:H,te=f.ticks,ee=f.border,Se=te.show?te.size:0,Pe=We(Se*me),Xe=We((f.alignTo==2?f._size-Se-f.gap:f.gap)*me),$e=f._rotate*-el/180,ze=T(f._pos*me),mt=(Pe+Xe)*N,it=ze+mt;M=g==0?it:0,w=g==1?it:0;let Tt=f.font[0],Ot=f.align==1?Js:f.align==2?Zl:$e>0?Js:$e<0?Zl:g==0?"center":h==3?Zl:Js,Vt=$e||g==1?"middle":h==2?kn:Ka;aa(Tt,I,Ot,Vt);let ht=f.font[1]*f.lineGap,Ct=ve.map(rt=>T(i(rt,J,Z,se))),Pt=f._values;for(let rt=0;rt<Pt.length;rt++){let gt=Pt[rt];if(gt!=null){g==0?w=Ct[rt]:M=Ct[rt],gt=""+gt;let xs=gt.indexOf(`
`)==-1?[gt]:gt.split(/\n/gm);for(let ct=0;ct<xs.length;ct++){let Ea=xs[ct];$e?(p.save(),p.translate(w,M+ct*ht),p.rotate($e),p.fillText(Ea,0,0),p.restore()):p.fillText(Ea,w,M+ct*ht)}}}te.show&&Rl(Ct,te.filter(n,pe,u,K,re),g,h,ze,Pe,ye(te.width*me,3),te.stroke(n,u),te.dash,te.cap);let Ut=f.grid;Ut.show&&Rl(Ct,Ut.filter(n,pe,u,K,re),g,g==0?2:1,g==0?kt:vt,g==0?Dt:ut,ye(Ut.width*me,3),Ut.stroke(n,u),Ut.dash,Ut.cap),ee.show&&Rl([ze],[1],g==0?1:0,g==0?1:2,g==1?kt:vt,g==1?Dt:ut,ye(ee.width*me,3),ee.stroke(n,u),ee.dash,ee.cap)}Ze("drawAxes")}function js(u){$.forEach((f,h)=>{h>0&&(f._paths=null,u&&(l==1?(f.min=null,f.max=null):f.facets.forEach(g=>{g.min=null,g.max=null})))})}let jn=!1,Fl=!1,_n=[];function Sc(){Fl=!1;for(let u=0;u<_n.length;u++)Ze(..._n[u]);_n.length=0}function Bs(){jn||(vu(ua),jn=!0)}function Tc(u,f=!1){jn=!0,Fl=f,u(n),ua(),f&&_n.length>0&&queueMicrotask(Sc)}n.batch=Tc;function ua(){if(wl&&(gc(),wl=!1),Ps&&(dc(),Ps=!1),Pn){if(Te(_,Js,xe),Te(_,kn,He),Te(_,Sn,ae),Te(_,Tn,Q),Te(x,Js,xe),Te(x,kn,He),Te(x,Sn,ae),Te(x,Tn,Q),Te(m,Sn,Jt),Te(m,Tn,vs),v.width=We(Jt*me),v.height=We(vs*me),k.forEach(({_el:u,_show:f,_size:h,_pos:g,side:w})=>{if(u!=null)if(f){let M=w===3||w===0?h:0,I=w%2==1;Te(u,I?"left":"top",g-M),Te(u,I?"width":"height",h),Te(u,I?"top":"left",I?He:xe),Te(u,I?"height":"width",I?Q:ae),$o(u,Ss)}else _t(u,Ss)}),Fn=Ns=Cl=El=Ll=Dl=Al=Ol=Ml=null,pt=1,yn(!0),xe!=Os||He!=ms||ae!=Bt||Q!=hs){js(!1);let u=ae/Bt,f=Q/hs;if(Re&&!gs&&G.left>=0){G.left*=u,G.top*=f,Hs&&Gt(Hs,We(G.left),0,ae,Q),Ws&&Gt(Ws,0,We(G.top),ae,Q);for(let h=0;h<St.length;h++){let g=St[h];g!=null&&(Fs[h]*=u,Is[h]*=f,Gt(g,Et(Fs[h]),Et(Is[h]),ae,Q))}}if(we.show&&!zn&&we.left>=0&&we.width>0){we.left*=u,we.width*=u,we.top*=f,we.height*=f;for(let h in Wl)Te(Us,h,we[h])}Os=xe,ms=He,Bt=ae,hs=Q}Ze("setSize"),Pn=!1}Jt>0&&vs>0&&(p.clearRect(0,0,v.width,v.height),Ze("drawClear"),P.forEach(u=>u()),Ze("draw")),we.show&&zn&&(Bn(we),zn=!1),Re&&gs&&(ys(null,!0,!1),gs=!1),oe.show&&oe.live&&wt&&(Bl(),wt=!1),r||(r=!0,n.status=1,Ze("ready")),gn=!1,jn=!1}n.redraw=(u,f)=>{Ps=f||!1,u!==!1?os(A,D.min,D.max):Bs()};function Il(u,f){let h=S[u];if(h.from==null){if(tt==0){let g=h.range(n,f.min,f.max,u);f.min=g[0],f.max=g[1]}if(f.min>f.max){let g=f.min;f.min=f.max,f.max=g}if(tt>1&&f.min!=null&&f.max!=null&&f.max-f.min<1e-16)return;u==A&&h.distr==2&&tt>0&&(f.min=Rt(f.min,t[0]),f.max=Rt(f.max,t[0]),f.min==f.max&&f.max++),Y[u]=f,wl=!0,Bs()}}n.setScale=Il;let Nl,jl,Hs,Ws,pa,fa,qs,Vs,va,ma,ke,Ee,ls=!1;const st=G.drag;let Je=st.x,Qe=st.y;Re&&(G.x&&(Nl=Mt(Id,x)),G.y&&(jl=Mt(Nd,x)),D.ori==0?(Hs=Nl,Ws=jl):(Hs=jl,Ws=Nl),ke=G.left,Ee=G.top);const we=n.select=Ne({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Us=we.show?Mt(Fd,we.over?x:_):null;function Bn(u,f){if(we.show){for(let h in u)we[h]=u[h],h in Wl&&Te(Us,h,u[h]);f!==!1&&Ze("setSelect")}}n.setSelect=Bn;function Cc(u){if($[u].show)Le&&$o(De[u],Ss);else if(Le&&_t(De[u],Ss),Re){let h=Rs?St[0]:St[u];h!=null&&Gt(h,-10,-10,ae,Q)}}function os(u,f,h){Il(u,{min:f,max:h})}function Wt(u,f,h,g){f.focus!=null&&Ac(u),f.show!=null&&$.forEach((w,M)=>{M>0&&(u==M||u==null)&&(w.show=f.show,Cc(M),l==2?(os(w.facets[0].scale,null,null),os(w.facets[1].scale,null,null)):os(w.scale,null,null),Bs())}),h!==!1&&Ze("setSeries",u,f),g&&xn("setSeries",n,u,f)}n.setSeries=Wt;function Mc(u,f){Ne(B[u],f)}function Ec(u,f){u.fill=ce(u.fill||null),u.dir=fe(u.dir,-1),f=f??B.length,B.splice(f,0,u)}function Lc(u){u==null?B.length=0:B.splice(u,1)}n.addBand=Ec,n.setBand=Mc,n.delBand=Lc;function Dc(u,f){$[u].alpha=f,Re&&St[u]!=null&&(St[u].style.opacity=f),Le&&De[u]&&(De[u].style.opacity=f)}let Qt,as,bs;const Gs={focus:!0};function Ac(u){if(u!=bs){let f=u==null,h=Ht.alpha!=1;$.forEach((g,w)=>{if(l==1||w>0){let M=f||w==0||w==u;g._focus=f?null:M,h&&Dc(w,M?1:Ht.alpha)}}),bs=u,h&&Bs()}}Le&&zs&&at(Xa,ue,u=>{G._lock||(_s(u),bs!=null&&Wt(null,Gs,!0,Fe.setSeries))});function qt(u,f,h){let g=S[f];h&&(u=u/me-(g.ori==1?He:xe));let w=ae;g.ori==1&&(w=Q,u=w-u),g.dir==-1&&(u=w-u);let M=g._min,I=g._max,N=u/w,H=M+(I-M)*N,K=g.distr;return K==3?rn(10,H):K==4?su(H,g.asinh):K==100?g.bwd(H):H}function Oc(u,f){let h=qt(u,A,f);return Rt(h,t[0],Ye,Ke)}n.valToIdx=u=>Rt(u,t[0]),n.posToIdx=Oc,n.posToVal=qt,n.valToPos=(u,f,h)=>S[f].ori==0?o(u,S[f],h?ut:ae,h?vt:0):a(u,S[f],h?Dt:Q,h?kt:0),n.setCursor=(u,f,h)=>{ke=u.left,Ee=u.top,ys(null,f,h)};function ha(u,f){Te(Us,Js,we.left=u),Te(Us,Sn,we.width=f)}function ga(u,f){Te(Us,kn,we.top=u),Te(Us,Tn,we.height=f)}let $n=D.ori==0?ha:ga,bn=D.ori==1?ha:ga;function Pc(){if(Le&&oe.live)for(let u=l==2?1:0;u<$.length;u++){if(u==0&&xt)continue;let f=oe.values[u],h=0;for(let g in f)jt[u][h++].firstChild.nodeValue=f[g]}}function Bl(u,f){if(u!=null&&(u.idxs?u.idxs.forEach((h,g)=>{le[g]=h}):au(u.idx)||le.fill(u.idx),oe.idx=le[0]),Le&&oe.live){for(let h=0;h<$.length;h++)(h>0||l==1&&!xt)&&zc(h,le[h]);Pc()}wt=!1,f!==!1&&Ze("setLegend")}n.setLegend=Bl;function zc(u,f){let h=$[u],g=u==0&&F==2?At:t[u],w;xt?w=h.values(n,u,f)??ss:(w=h.value(n,f==null?null:g[f],u,f),w=w==null?ss:{_:w}),oe.values[u]=w}function ys(u,f,h){va=ke,ma=Ee,[ke,Ee]=G.move(n,ke,Ee),G.left=ke,G.top=Ee,Re&&(Hs&&Gt(Hs,We(ke),0,ae,Q),Ws&&Gt(Ws,0,We(Ee),ae,Q));let g,w=Ye>Ke;Qt=be,as=null;let M=D.ori==0?ae:Q,I=D.ori==1?ae:Q;if(ke<0||tt==0||w){g=G.idx=null;for(let N=0;N<$.length;N++){let H=St[N];H!=null&&Gt(H,-10,-10,ae,Q)}zs&&Wt(null,Gs,!0,u==null&&Fe.setSeries),oe.live&&(le.fill(g),wt=!0)}else{let N,H,K;l==1&&(N=D.ori==0?ke:Ee,H=qt(N,A),g=G.idx=Rt(H,t[0],Ye,Ke),K=R(t[0][g],D,M,0));let J=-10,Z=-10,se=0,ve=0,pe=!0,re="",te="";for(let ee=l==2?1:0;ee<$.length;ee++){let Se=$[ee],Pe=le[ee],Xe=Pe==null?null:l==1?t[ee][Pe]:t[ee][1][Pe],$e=G.dataIdx(n,ee,g,H),ze=$e==null?null:l==1?t[ee][$e]:t[ee][1][$e];if(wt=wt||ze!=Xe||$e!=Pe,le[ee]=$e,ee>0&&Se.show){let mt=$e==null?-10:$e==g?K:R(l==1?t[0][$e]:t[ee][0][$e],D,M,0),it=ze==null?-10:W(ze,l==1?S[Se.scale]:S[Se.facets[1].scale],I,0);if(zs&&ze!=null){let Tt=D.ori==1?ke:Ee,Ot=Ue(Ht.dist(n,ee,$e,it,Tt));if(Ot<Qt){let Vt=Ht.bias;if(Vt!=0){let ht=qt(Tt,Se.scale),Ct=ze>=0?1:-1,Pt=ht>=0?1:-1;Pt==Ct&&(Pt==1?Vt==1?ze>=ht:ze<=ht:Vt==1?ze<=ht:ze>=ht)&&(Qt=Ot,as=ee)}else Qt=Ot,as=ee}}if(wt||Rs){let Tt,Ot;D.ori==0?(Tt=mt,Ot=it):(Tt=it,Ot=mt);let Vt,ht,Ct,Pt,Ut,rt,gt=!0,xs=lt.bbox;if(xs!=null){gt=!1;let ct=xs(n,ee);Ct=ct.left,Pt=ct.top,Vt=ct.width,ht=ct.height}else Ct=Tt,Pt=Ot,Vt=ht=lt.size(n,ee);if(rt=lt.fill(n,ee),Ut=lt.stroke(n,ee),Rs)ee==as&&Qt<=Ht.prox&&(J=Ct,Z=Pt,se=Vt,ve=ht,pe=gt,re=rt,te=Ut);else{let ct=St[ee];ct!=null&&(Fs[ee]=Ct,Is[ee]=Pt,ai(ct,Vt,ht,gt),li(ct,rt,Ut),Gt(ct,Et(Ct),Et(Pt),ae,Q))}}}}if(Rs){let ee=Ht.prox,Se=bs==null?Qt<=ee:Qt>ee||as!=bs;if(wt||Se){let Pe=St[0];Pe!=null&&(Fs[0]=J,Is[0]=Z,ai(Pe,se,ve,pe),li(Pe,re,te),Gt(Pe,Et(J),Et(Z),ae,Q))}}}if(we.show&&ls)if(u!=null){let[N,H]=Fe.scales,[K,J]=Fe.match,[Z,se]=u.cursor.sync.scales,ve=u.cursor.drag;if(Je=ve._x,Qe=ve._y,Je||Qe){let{left:pe,top:re,width:te,height:ee}=u.select,Se=u.scales[Z].ori,Pe=u.posToVal,Xe,$e,ze,mt,it,Tt=N!=null&&K(N,Z),Ot=H!=null&&J(H,se);Tt&&Je?(Se==0?(Xe=pe,$e=te):(Xe=re,$e=ee),ze=S[N],mt=R(Pe(Xe,Z),ze,M,0),it=R(Pe(Xe+$e,Z),ze,M,0),$n(Ft(mt,it),Ue(it-mt))):$n(0,M),Ot&&Qe?(Se==1?(Xe=pe,$e=te):(Xe=re,$e=ee),ze=S[H],mt=W(Pe(Xe,se),ze,I,0),it=W(Pe(Xe+$e,se),ze,I,0),bn(Ft(mt,it),Ue(it-mt))):bn(0,I)}else ql()}else{let N=Ue(va-pa),H=Ue(ma-fa);if(D.ori==1){let se=N;N=H,H=se}Je=st.x&&N>=st.dist,Qe=st.y&&H>=st.dist;let K=st.uni;K!=null?Je&&Qe&&(Je=N>=K,Qe=H>=K,!Je&&!Qe&&(H>N?Qe=!0:Je=!0)):st.x&&st.y&&(Je||Qe)&&(Je=Qe=!0);let J,Z;Je&&(D.ori==0?(J=qs,Z=ke):(J=Vs,Z=Ee),$n(Ft(J,Z),Ue(Z-J)),Qe||bn(0,I)),Qe&&(D.ori==1?(J=qs,Z=ke):(J=Vs,Z=Ee),bn(Ft(J,Z),Ue(Z-J)),Je||$n(0,M)),!Je&&!Qe&&($n(0,0),bn(0,0))}if(st._x=Je,st._y=Qe,u==null){if(h){if(Ma!=null){let[N,H]=Fe.scales;Fe.values[0]=N!=null?qt(D.ori==0?ke:Ee,N):null,Fe.values[1]=H!=null?qt(D.ori==1?ke:Ee,H):null}xn(Xl,n,ke,Ee,ae,Q,g)}if(zs){let N=h&&Fe.setSeries,H=Ht.prox;bs==null?Qt<=H&&Wt(as,Gs,!0,N):Qt>H?Wt(null,Gs,!0,N):as!=bs&&Wt(as,Gs,!0,N)}}wt&&(oe.idx=g,Bl()),f!==!1&&Ze("setCursor")}let is=null;Object.defineProperty(n,"rect",{get(){return is==null&&yn(!1),is}});function yn(u=!1){u?is=null:(is=x.getBoundingClientRect(),Ze("syncRect",is))}function _a(u,f,h,g,w,M,I){G._lock||ls&&u!=null&&u.movementX==0&&u.movementY==0||(Hl(u,f,h,g,w,M,I,!1,u!=null),u!=null?ys(null,!0,!0):ys(f,!0,!1))}function Hl(u,f,h,g,w,M,I,N,H){if(is==null&&yn(!1),_s(u),u!=null)h=u.clientX-is.left,g=u.clientY-is.top;else{if(h<0||g<0){ke=-10,Ee=-10;return}let[K,J]=Fe.scales,Z=f.cursor.sync,[se,ve]=Z.values,[pe,re]=Z.scales,[te,ee]=Fe.match,Se=f.axes[0].side%2==1,Pe=D.ori==0?ae:Q,Xe=D.ori==1?ae:Q,$e=Se?M:w,ze=Se?w:M,mt=Se?g:h,it=Se?h:g;if(pe!=null?h=te(K,pe)?i(se,S[K],Pe,0):-10:h=Pe*(mt/$e),re!=null?g=ee(J,re)?i(ve,S[J],Xe,0):-10:g=Xe*(it/ze),D.ori==1){let Tt=h;h=g,g=Tt}}H&&(f==null||f.cursor.event.type==Xl)&&((h<=1||h>=ae-1)&&(h=ks(h,ae)),(g<=1||g>=Q-1)&&(g=ks(g,Q))),N?(pa=h,fa=g,[qs,Vs]=G.move(n,h,g)):(ke=h,Ee=g)}const Wl={width:0,height:0,left:0,top:0};function ql(){Bn(Wl,!1)}let $a,ba,ya,xa;function ka(u,f,h,g,w,M,I){ls=!0,Je=Qe=st._x=st._y=!1,Hl(u,f,h,g,w,M,I,!0,!1),u!=null&&(at(eo,go,wa,!1),xn(Qa,n,qs,Vs,ae,Q,null));let{left:N,top:H,width:K,height:J}=we;$a=N,ba=H,ya=K,xa=J}function wa(u,f,h,g,w,M,I){ls=st._x=st._y=!1,Hl(u,f,h,g,w,M,I,!1,!0);let{left:N,top:H,width:K,height:J}=we,Z=K>0||J>0,se=$a!=N||ba!=H||ya!=K||xa!=J;if(Z&&se&&Bn(we),st.setScale&&Z&&se){let ve=N,pe=K,re=H,te=J;if(D.ori==1&&(ve=H,pe=J,re=N,te=K),Je&&os(A,qt(ve,A),qt(ve+pe,A)),Qe)for(let ee in S){let Se=S[ee];ee!=A&&Se.from==null&&Se.min!=be&&os(ee,qt(re+te,ee),qt(re,ee))}ql()}else G.lock&&(G._lock=!G._lock,ys(f,!0,u!=null));u!=null&&(As(eo,go),xn(eo,n,ke,Ee,ae,Q,null))}function Rc(u,f,h,g,w,M,I){if(G._lock)return;_s(u);let N=ls;if(ls){let H=!0,K=!0,J=10,Z,se;D.ori==0?(Z=Je,se=Qe):(Z=Qe,se=Je),Z&&se&&(H=ke<=J||ke>=ae-J,K=Ee<=J||Ee>=Q-J),Z&&H&&(ke=ke<qs?0:ae),se&&K&&(Ee=Ee<Vs?0:Q),ys(null,!0,!0),ls=!1}ke=-10,Ee=-10,le.fill(null),ys(null,!0,!0),N&&(ls=N)}function Sa(u,f,h,g,w,M,I){G._lock||(_s(u),Tl(),ql(),u!=null&&xn(ei,n,ke,Ee,ae,Q,null))}function Ta(){k.forEach(xp),Sl(n.width,n.height,!0)}Ts(il,ln,Ta);const Ys={};Ys.mousedown=ka,Ys.mousemove=_a,Ys.mouseup=wa,Ys.dblclick=Sa,Ys.setSeries=(u,f,h,g)=>{let w=Fe.match[2];h=w(n,f,h),h!=-1&&Wt(h,g,!0,!1)},Re&&(at(Qa,x,ka),at(Xl,x,_a),at(Za,x,u=>{_s(u),yn(!1)}),at(Xa,x,Rc),at(ei,x,Sa),So.add(n),n.syncRect=yn);const Hn=n.hooks=e.hooks||{};function Ze(u,f,h){Fl?_n.push([u,f,h]):u in Hn&&Hn[u].forEach(g=>{g.call(null,n,f,h)})}(e.plugins||[]).forEach(u=>{for(let f in u.hooks)Hn[f]=(Hn[f]||[]).concat(u.hooks[f])});const Ca=(u,f,h)=>h,Fe=Ne({key:null,setSeries:!1,filters:{pub:ui,sub:ui},scales:[A,$[1]?$[1].scale:null],match:[pi,pi,Ca],values:[null,null]},G.sync);Fe.match.length==2&&Fe.match.push(Ca),G.sync=Fe;const Ma=Fe.key,Vl=Vr(Ma);function xn(u,f,h,g,w,M,I){Fe.filters.pub(u,f,h,g,w,M,I)&&Vl.pub(u,f,h,g,w,M,I)}Vl.sub(n);function Fc(u,f,h,g,w,M,I){Fe.filters.sub(u,f,h,g,w,M,I)&&Ys[u](null,f,h,g,w,M,I)}n.pub=Fc;function Ic(){Vl.unsub(n),So.delete(n),fs.clear(),bo(il,ln,Ta),d.remove(),ue==null||ue.remove(),Ze("destroy")}n.destroy=Ic;function Ul(){Ze("init",e,t),la(t||e.data,!1),Y[A]?Il(A,Y[A]):Tl(),zn=we.show&&(we.width>0||we.height>0),gs=wt=!0,Sl(e.width,e.height)}return $.forEach(sa),k.forEach(hc),s?s instanceof HTMLElement?(s.appendChild(d),Ul()):s(n,Ul):Ul(),n}nt.assign=Ne;nt.fmtNum=Vo;nt.rangeNum=rl;nt.rangeLog=gl;nt.rangeAsinh=Wo;nt.orient=Es;nt.pxRatio=me;nt.join=fu;nt.fmtDate=Go,nt.tzDate=wu;nt.sync=Vr;{nt.addGap=ap,nt.clipGaps=bl;let e=nt.paths={points:Qr};e.linear=Xr,e.stepped=cp,e.bars=dp,e.spline=pp}function kp(e){let t;return{hooks:{init(s){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",s.over.appendChild(t)},setCursor(s){const n=s.cursor.idx;if(n==null||!s.data[1]||s.data[1][n]==null){t.style.display="none";return}const l=s.data[0][n],o=s.data[1][n],a=new Date(l*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):z(o)}</b> ${a}`;const i=Math.round(s.valToPos(l,"x"));t.style.left=Math.min(i,s.over.clientWidth-80)+"px",t.style.display=""}}}}function wp(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function nc({data:e,color:t,smooth:s,height:n,yMax:l,fmtVal:o}){const a=ot(null),i=ot(null),r=n||55;return de(()=>{if(!a.current||!e||e[0].length<2)return;const d=s?wd(e[1]):e[1],v=[e[0],d];if(i.current){i.current.setData(v);return}const p=l?(_,x,E)=>[0,Math.max(l,E*1.05)]:(_,x,E)=>[Math.max(0,x*.9),E*1.1],m={width:a.current.clientWidth||200,height:r,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:p}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:t,width:1.5,fill:wp(t,.09)}],plugins:[kp(o)]};return i.current=new nt(m,v,a.current),()=>{i.current&&(i.current.destroy(),i.current=null)}},[e,t,s]),de(()=>{if(!i.current||!a.current)return;const d=new ResizeObserver(()=>{i.current&&a.current&&i.current.setSize({width:a.current.clientWidth,height:r})});return d.observe(a.current),()=>d.disconnect()},[]),c`<div class="chart-wrap" role="img" aria-label="Sparkline chart" style=${"height:"+r+"px"} ref=${a}></div>`}function Xt({label:e,value:t,valColor:s,data:n,chartColor:l,smooth:o,refLines:a,yMax:i,dp:r}){const d=ie(()=>{if(!n||!n[1]||n[1].length<2)return[];const v=i?Math.max(i,n[1].reduce((p,m)=>Math.max(p,m),0)*1.05):n[1].reduce((p,m)=>Math.max(p,m),0)*1.1;return(a||[]).map(p=>{if(v<=0)return null;const m=(1-p.value/v)*100;return m>=0&&m<=95?{...p,pct:m}:null}).filter(Boolean)},[n,a,i]);return c`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${r?{"data-dp":r}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${e}</span>
      <span class="chart-val" style=${"color:"+(s||l||"var(--accent)")} aria-live="polite" aria-atomic="true">${t}</span>
    </div>
    <div style="position:relative">
      ${d.map(v=>c`<Fragment>
          <div class="chart-ref-line" style=${"top:"+v.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+v.pct+"% - 8px)"}>${v.label}</div>
        </Fragment>`)}
      ${n&&n[0].length>=2?c`<${nc} data=${n} color=${l||"var(--accent)"} smooth=${o} yMax=${i}/>`:c`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem">collecting...</div>`}
    </div>
  </div>`}function Co({label:e,value:t,accent:s,dp:n,sm:l}){const o=ot(t),[a,i]=U(!1);return de(()=>{o.current!==t&&(i(!0),setTimeout(()=>i(!1),500)),o.current=t},[t]),c`<div class=${"metric"+(l?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(s?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
  </div>`}function Pi({snap:e,mode:t}){if(!e)return null;const s=!t||t==="files",n=!t||t==="traffic",l=e.tools.filter(r=>r.tool!=="aictl"&&r.files.length),o=l.reduce((r,d)=>r+d.files.length,0)||1,a=e.tools.filter(r=>r.tool!=="aictl"&&r.live&&(r.live.outbound_rate_bps||r.live.inbound_rate_bps)),i=a.reduce((r,d)=>r+(d.live.outbound_rate_bps||0)+(d.live.inbound_rate_bps||0),0)||1;return c`
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
          title="${r.label}: ${It(d)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(r=>{const d=(r.live.outbound_rate_bps||0)+(r.live.inbound_rate_bps||0);return c`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Oe[r.tool]||"var(--fg2)")}></span>
          ${r.label} <span class="text-muted">${It(d)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!l.length&&!a.length&&c`<div class="empty-state">No AI tool resources found yet.</div>`}`}function Sp({path:e,onClose:t}){const{snap:s}=et(je),[n,l]=U(null),[o,a]=U(!1),[i,r]=U(null),d=ot(null),v=ot(null),[p,m]=U(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),_=ot(!1),x=ot(0),E=ot(0),T=Ve(A=>{_.current=!0,x.current=A.clientX,E.current=p,A.preventDefault()},[p]);if(de(()=>{const A=P=>{if(!_.current)return;const b=x.current-P.clientX,C=window.innerWidth,D=Math.min(90,Math.max(20,E.current+b/C*100));m(D)},O=()=>{if(_.current){_.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(p)))}catch{}}};return window.addEventListener("mousemove",A),window.addEventListener("mouseup",O),()=>{window.removeEventListener("mousemove",A),window.removeEventListener("mouseup",O)}},[p]),de(()=>{if(!e)return;v.current=document.activeElement;const A=setTimeout(()=>{var b;const P=(b=d.current)==null?void 0:b.querySelector("button");P&&P.focus()},50),O=P=>{if(P.key!=="Tab"||!d.current)return;const b=d.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!b.length)return;const C=b[0],D=b[b.length-1];P.shiftKey&&document.activeElement===C?(P.preventDefault(),D.focus()):!P.shiftKey&&document.activeElement===D&&(P.preventDefault(),C.focus())};return document.addEventListener("keydown",O),()=>{clearTimeout(A),document.removeEventListener("keydown",O),v.current&&v.current.focus&&v.current.focus()}},[e]),de(()=>{e&&(a(!1),r(null),No(e).then(l).catch(A=>r(A.message)))},[e]),!e)return null;const y=ie(()=>{if(!s)return"";for(const A of s.tools)for(const O of A.files)if(O.path===e)return(O.kind||"")+" | "+ge(O.size)+" | ~"+z(O.tokens)+"tok | scope:"+(O.scope||"?")+" | sent_to_llm:"+(O.sent_to_llm||"?")+" | loaded:"+(O.loaded_when||"?");for(const A of s.agent_memory)if(A.file===e)return A.source+" | "+A.profile+" | "+A.tokens+"tok | "+A.lines+"ln";return""},[s,e]),$=n?n.split(`
`):[],k=$.length,S=k>Ks*2,B=(A,O)=>A.map((P,b)=>c`<div class="fv-line"><span class="fv-ln">${O+b}</span><span class="fv-code">${X(P)||" "}</span></div>`);return c`<div class="fv" ref=${d} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+p+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${T}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      <button onClick=${t} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${y}</div>
    <div class="fv-body">
      ${i?c`<p class="text-red" style="padding:var(--sp-10)">${i}</p>`:n?!S||o?c`<div class="fv-lines">${B($,1)}</div>`:c`<div class="fv-lines">${B($.slice(0,Ks),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>a(!0)}>\u25BC ${k-Ks*2} more lines \u25BC</div>
            <div class="fv-lines">${B($.slice(-Ks),k-Ks+1)}</div>`:c`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${k} lines${S&&!o?" (showing "+Ks*2+" of "+k+")":""}</span>
      ${S&&c`<button onClick=${()=>a(!o)}>${o?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function Mo({file:e,dirPrefix:t}){var A;const[s,n]=U(!1),[l,o]=U(!1),[a,i]=U(null),[r,d]=U(null),[v,p]=U(!1),m=et(je),_=(e.path||"").replace(/\\/g,"/").split("/").pop(),x=(e.sent_to_llm||"").toLowerCase(),E=e.mtime&&Date.now()/1e3-e.mtime<300,T=(A=m.recentFiles)==null?void 0:A.get(e.path),y=!!T,$=Ve(async()=>{if(s){n(!1);return}n(!0),p(!0),d(null);try{const O=await No(e.path);i(O)}catch(O){d(O.message)}finally{p(!1)}},[s,e.path]),k=(O,P)=>O.map((b,C)=>c`<span class="pline"><span class="ln">${P+C}</span>${X(b)||" "}</span>`),S=()=>{if(v)return c`<span class="text-muted">loading...</span>`;if(r)return c`<span class="text-red">${r}</span>`;if(!a)return null;const O=a.split(`
`),P=O.length;if(P<=nn*3||l)return c`${k(O,1)}
        <div class="prev-actions">
          ${l&&c`<button class="prev-btn" onClick=${()=>o(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
        </div>`;const C=O.slice(-nn),D=P-nn+1;return c`${k(C,D)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>o(!0)}>show all (${P} lines)</button>
        <button class="prev-btn" onClick=${()=>m.openViewer(e.path)}>open in viewer</button>
      </div>`},B=e.size>0?Math.round(e.size/60):0;return c`<div>
    <button class="fitem" onClick=${$} aria-expanded=${s} title=${e.path}>
      ${y?c`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Nt(T.ts)}${T.growth>0?" +"+ge(T.growth):""}">●</span>`:E?c`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Nt(e.mtime)}">●</span>`:c`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${t?c`<span class="text-muted">${t}/</span>`:""}${X(_)}</span>
      <span class="fmeta">
        ${x&&x!=="no"&&c`<span style="color:${hr(x)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${x}">${x==="yes"?"◆":x==="on-demand"?"◇":"○"}</span>`}
        ${ge(e.size)}${B?c` <span class="text-muted">${B}ln</span>`:""}${e.tokens?c` <span class="text-muted">${z(e.tokens)}t</span>`:""}
        ${e.mtime&&E?c` <span class="text-orange text-xs">${Nt(e.mtime)}</span>`:""}
      </span>
    </button>
    ${s&&c`<div class="inline-preview">${S()}</div>`}
  </div>`}function Tp({dir:e,files:t}){const[s,n]=U(!1),l=t.reduce((a,i)=>a+i.tokens,0),o=t.reduce((a,i)=>a+i.size,0);return c`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-muted" title=${e}>${X(e)}</span>
      <span class="badge">${t.length}</span>
      <span class="badge">${ge(o)}</span>
      <span class="badge">${z(l)}t</span>
    </button>
    ${s&&c`<div style=${{paddingLeft:"var(--sp-8)"}}>${t.map(a=>c`<${Mo} key=${a.path} file=${a}/>`)}</div>`}
  </div>`}function Cp({label:e,files:t,root:s,badge:n,style:l,startOpen:o}){const[a,i]=U(!!o),r=ie(()=>kd(t,s),[t,s]),d=ie(()=>t.reduce((_,x)=>_+x.tokens,0),[t]),v=ie(()=>t.reduce((_,x)=>_+x.size,0),[t]),p=ie(()=>{var x;const _={};return t.forEach(E=>{const T=(E.sent_to_llm||"no").toLowerCase();_[T]=(_[T]||0)+1}),((x=Object.entries(_).sort((E,T)=>T[1]-E[1])[0])==null?void 0:x[0])||"no"},[t]),m=()=>r.length===1&&r[0][1].length<=3?r[0][1].map(_=>c`<${Mo} key=${_.path} file=${_}/>`):r.map(([_,x])=>x.length===1?c`<div style=${{marginLeft:"var(--sp-5)"}}><${Mo} key=${x[0].path} file=${x[0]} dirPrefix=${_}/></div>`:c`<${Tp} key=${_} dir=${_} files=${x}/>`);return c`<div class="cat-group" style=${l||""}>
    <button class=${"cat-head"+(a?" open":"")} onClick=${()=>i(!a)} aria-expanded=${a}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${hr(p)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${p}"></span>
      <span class="cat-label" title=${e}>${X(e)}</span>
      <span class="badge" style="flex-shrink:0">${n||t.length}</span>
      <span class="badge">${ge(v)}</span>
      <span class="badge">${z(d)}t</span>
    </button>
    ${a&&c`<div style=${{paddingLeft:"var(--sp-8)"}}>${m()}</div>`}
  </div>`}function oo({label:e,data:t,color:s}){const n=ot(null);return de(()=>{const l=n.current;if(!l||!t||t.length<2)return;const o=l.getContext("2d"),a=l.width=l.offsetWidth*(window.devicePixelRatio||1),i=l.height=l.offsetHeight*(window.devicePixelRatio||1);o.clearRect(0,0,a,i);const r=t.slice(-60),d=Math.max(...r)*1.1||1,v=a/(r.length-1);o.beginPath(),o.strokeStyle=s,o.lineWidth=1.5*(window.devicePixelRatio||1),r.forEach((p,m)=>{const _=m*v,x=i-p/d*i*.85;m===0?o.moveTo(_,x):o.lineTo(_,x)}),o.stroke()},[t,s]),c`<div style="position:relative;height:25px">
    <span class="text-muted" style="position:absolute;top:0;left:0;font-size:var(--fs-2xs);z-index:1">${e}</span>
    <canvas ref=${n} aria-hidden="true" style="width:100%;height:100%;display:block"/>
  </div>`}function Mp({processes:e,maxMem:t}){if(!e||!e.length)return null;const s=e.reduce((a,i)=>a+(parseFloat(i.mem_mb)||0),0),n=e.reduce((a,i)=>a+(parseFloat(i.cpu_pct)||0),0),l={};e.forEach(a=>{const i=a.process_type||"process";(l[i]=l[i]||[]).push(a)});const o=Object.keys(l).length>1;return c`<div class="proc-section">
    <h3>Processes <span class="badge">${e.length}</span>
      <span class="badge">CPU ${_e(n)}</span>
      <span class="badge">MEM ${ge(s*1048576)}</span></h3>
    ${Object.entries(l).map(([a,i])=>{const r={};return i.forEach(d=>(r[d.name||"unknown"]=r[d.name||"unknown"]||[]).push(d)),c`<div style="margin-bottom:var(--sp-2)">
        ${o?c`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${X(a)}</div>`:null}
        ${Object.entries(r).map(([d,v])=>{const p=v.sort((m,_)=>(parseFloat(_.mem_mb)||0)-(parseFloat(m.mem_mb)||0));return c`<div key=${d} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${o?"":c`<span style="text-transform:uppercase;letter-spacing:0.03em">${X(a)}</span>${" · "}`}${X(d)} <span style="opacity:0.6">(${v.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${p.map(m=>{const _=parseFloat(m.cpu_pct)||0,x=parseFloat(m.mem_mb)||0,E=Math.max(2,Math.min(_,100)),T=_>80?"var(--red)":_>50?"var(--orange)":_>5?"var(--green)":"var(--fg2)",y=m.anomalies&&m.anomalies.length,$=m.zombie_risk&&m.zombie_risk!=="none";return c`<div key=${m.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${y?"border-left:2px solid var(--red);":""}${$?"border-left:2px solid var(--orange);":""}"
                  title=${m.cmdline||m.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${E}%;height:100%;background:${T};border-radius:2px"></div>
                    </div>
                    <span style="color:${T};min-width:3ch;text-align:right">${_e(_)}</span>
                  </div>
                  <div class="mono text-muted">${m.pid}</div>
                  <div>${ge(x*1048576)}</div>
                  ${y?c`<div class="text-red">\u26A0${m.anomalies.length}</div>`:null}
                </div>`})}
            </div>
          </div>`})}
      </div>`})}
  </div>`}function Ep({config:e}){if(!e)return null;const t=Object.entries(e.settings||{}),s=Object.entries(e.features||{}),n=(e.mcp_servers||[]).length>0,l=(e.extensions||[]).length>0,o=e.otel||{},a=e.hints||[];return!t.length&&!s.length&&!n&&!l&&!o.enabled&&!a.length&&e.model==null&&e.launch_at_startup==null?null:c`<div class="live-section">
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
  </div>`}function Lp({telemetry:e}){if(!e)return null;const t=e,s=(t.input_tokens||0)+(t.output_tokens||0),n=t.errors||[],l=t.quota_state||{};if(!s&&!t.active_session_input&&!n.length)return null;const[o,a]=U(!1);return c`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${t.source}</span> <span class="badge">${_e(t.confidence*100)} confidence</span>
      ${n.length>0&&c`<span class="badge warn cursor-ptr" onClick=${i=>{i.stopPropagation(),a(!o)}}>${n.length} error${n.length>1?"s":""}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${qe(t.input_tokens||0)} tok</span>
        <span class="msub">cache read: ${qe(t.cache_read_tokens||0)} tok \u00B7 creation: ${qe(t.cache_creation_tokens||0)} tok</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${qe(t.output_tokens||0)} tok</span>
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
        <span class="mvalue">${qe((t.active_session_input||0)+(t.active_session_output||0))} tok</span>
        <span class="msub">in: ${qe(t.active_session_input||0)} \u00B7 out: ${qe(t.active_session_output||0)} \u00B7 ${t.active_session_messages||0} msgs</span>
      </div>`:null}
      ${Object.keys(t.by_model||{}).length>0?c`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(t.by_model).map(([i,r])=>c`<div key=${i} class="flex-between flex-wrap" style="font-size:0.75rem;padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${i}</span>
          <span>in:${qe(r.input_tokens||0)} tok out:${qe(r.output_tokens||0)} tok${r.cache_read_tokens?" cR:"+qe(r.cache_read_tokens)+" tok":""}${r.requests?" · "+r.requests+"req":""}${r.cost_usd?" · $"+r.cost_usd.toFixed(2):""}</span>
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
  </div>`}function Dp({live:e}){if(!e)return null;const t=e.token_estimate||{},s=e.mcp||{},n=Io(e);return c`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${e.session_count||0} sess</span>
      <span class="badge">${e.pid_count||0} pid</span>
      <span class="badge">${_e((e.confidence||0)*100)} conf</span>
      ${s.detected&&c`<span class="badge warn">${s.loops||0} MCP loop${(s.loops||0)===1?"":"s"}</span>`}
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
  </div>`}function Eo({tool:e,root:t}){var S,B,A,O,P,b,C,D;const[s,n]=U(!1),{snap:l,history:o}=et(je),a=ie(()=>((l==null?void 0:l.tool_configs)||[]).find(F=>F.tool===e.tool),[l,e.tool]),i=ie(()=>{var F;return(F=o==null?void 0:o.by_tool)==null?void 0:F[e.tool]},[o,e.tool]),r=Oe[e.tool]||"var(--fg2)",d=bt[e.tool]||"🔹",v=e.files.reduce((F,R)=>F+R.tokens,0),p=e.processes.filter(F=>F.anomalies&&F.anomalies.length).length,m=Io(e.live),_=(((S=e.live)==null?void 0:S.outbound_rate_bps)||0)+(((B=e.live)==null?void 0:B.inbound_rate_bps)||0),x=e.processes.reduce((F,R)=>F+(parseFloat(R.cpu_pct)||0),0),E=e.processes.reduce((F,R)=>F+(parseFloat(R.mem_mb)||0),0),T=ie(()=>Math.max(...e.processes.map(F=>parseFloat(F.mem_mb)||0),100),[e.processes]),y=(((O=(A=e.token_breakdown)==null?void 0:A.telemetry)==null?void 0:O.errors)||[]).length,$=ie(()=>{const F={};return e.files.forEach(R=>{const W=R.kind||"other";(F[W]=F[W]||[]).push(R)}),Object.keys(F).sort((R,W)=>{const Y=qa.indexOf(R),ne=qa.indexOf(W);return(Y<0?99:Y)-(ne<0?99:ne)}).map(R=>({kind:R,files:F[R]}))},[e.files]),k="tcard"+(s?" open":"")+(p||y?" has-anomaly":"");return c`<div class=${k}>
    <button class="tcard-head" onClick=${()=>n(!s)} aria-expanded=${s}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)">${d}</span>${X(e.label)}</h2>
      <span class="badge" data-dp="procs.tool.files">${e.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${z(v)} tok</span>
      ${e.processes.length>0&&c`<span class="badge" data-dp="procs.tool.process_count">${e.processes.length} proc ${_e(x)} ${ge(E*1048576)}</span>`}
      ${e.mcp_servers.length>0&&c`<span class="badge" data-dp="procs.tool.mcp_server_count">${e.mcp_servers.length} MCP</span>`}
      ${p>0&&c`<span class="badge warn" data-dp="procs.tool.anomaly">${p} anomaly</span>`}
      ${y>0&&c`<span class="badge" style="background:var(--red);color:var(--bg)">${y} error${y>1?"s":""}</span>`}
      ${e.live&&c`<span class="badge" style="background:var(--accent);color:var(--bg)">${e.live.session_count||0} live \u00B7 ${It(_)}${m>0?" · "+z(m)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${$.map(({kind:F,files:R})=>c`<span class="text-muted" style="font-size:var(--fs-xs)">${F}:${R.length}</span>`)}
      </div>
      ${i&&i.ts.length>2&&!s&&c`<div role="img" aria-label=${"Sparkline charts for "+e.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${F=>F.stopPropagation()}>
        <${oo} label="CPU" data=${i.cpu} color=${r}/>
        <${oo} label="MEM" data=${i.mem_mb} color=${"var(--green)"}/>
        <${oo} label=${e.live?"Traffic":"Tokens"} data=${e.live?i.traffic:i.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${s&&c`<div class="tcard-body">
      ${((P=Wa[e.tool])==null?void 0:P.length)>0&&c`<div class="tool-relationships">
        ${Wa[e.tool].map(F=>c`<span key=${F.label} class="rel-badge rel-${F.type}"
          title=${F.label}>${F.label}</span>`)}
      </div>`}
      <${Ep} config=${a}/>
      <${Lp} telemetry=${(b=e.token_breakdown)==null?void 0:b.telemetry}/>
      <${Dp} live=${e.live}/>
      ${$.map(({kind:F,files:R})=>c`<${Cp} key=${F} label=${F} files=${R} root=${t}/>`)}
      <${Mp} processes=${(D=(C=e.live)==null?void 0:C.processes)!=null&&D.length?e.live.processes:e.processes} maxMem=${T}/>
      ${e.mcp_servers.length>0&&c`<div class="proc-section"><h3>MCP Servers</h3>
        ${e.mcp_servers.map(F=>c`<div key=${F.name||F.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${X(F.name)}</span>
          <span class="fmeta">${X((F.config||{}).command||"")} ${((F.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function Ap({groupKey:e,groupLabel:t,groupColor:s,tools:n,root:l}){const[o,a]=U(!0),i=n.reduce((d,v)=>d+v.files.length,0),r=n.reduce((d,v)=>d+v.files.reduce((p,m)=>p+m.tokens,0),0);return c`<div class="mb-md">
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
      ${n.map(d=>c`<${Eo} key=${d.tool} tool=${d} root=${l}/>`)}
    </div>`}
  </div>`}function Op(){const{snap:e}=et(je),[t,s]=U("product"),n=r=>r.files.length||r.processes.length||r.mcp_servers.length||r.live,l=(r,d)=>{const v=r.files.length*2+r.processes.length+r.mcp_servers.length;return d.files.length*2+d.processes.length+d.mcp_servers.length-v||r.tool.localeCompare(d.tool)},o=ie(()=>e?e.tools.filter(r=>!r.meta&&n(r)).sort(l):[],[e]),a=ie(()=>e?e.tools.filter(r=>r.meta&&r.tool!=="project-env"&&n(r)).sort(l):[],[e]),i=ie(()=>{if(t==="product"||!o.length)return null;const r={};return o.forEach(d=>{if(t==="vendor"){const v=d.vendor||"community",p=fr[v]||v,m=ud[v]||"var(--fg2)";r[v]||(r[v]={label:p,color:m,tools:[]}),r[v].tools.push(d)}else{const v=(d.host||"any").split(",");for(const p of v){const m=p.trim(),_=pd[m]||m,x="var(--fg2)";r[m]||(r[m]={label:_,color:x,tools:[]}),r[m].tools.push(d)}}}),Object.entries(r).sort((d,v)=>{const p=d[1].tools.reduce((_,x)=>_+x.files.length,0);return v[1].tools.reduce((_,x)=>_+x.files.length,0)-p})},[o,t]);return e?!o.length&&!a.length?c`<p class="empty-state">No AI tool resources found.</p>`:c`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${gd.map(r=>c`<button key=${r.id}
        class=${t===r.id?"range-btn active":"range-btn"}
        onClick=${()=>s(r.id)}>${r.label}</button>`)}
    </div>
    ${o.length>0&&(i?i.map(([r,d])=>c`<${Ap} key=${r}
      groupKey=${r} groupLabel=${d.label} groupColor=${d.color}
      tools=${d.tools} root=${e.root}/>`):c`<div class="tool-grid">
        ${o.map(r=>c`<${Eo} key=${r.tool} tool=${r} root=${e.root}/>`)}
      </div>`)}
    ${a.length>0&&c`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)">▶</span>
        <span>Project Context</span>
        <span class="badge">${a.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${a.map(r=>c`<${Eo} key=${r.tool} tool=${r} root=${e.root}/>`)}
      </div>
    </details>`}
  </div>`:c`<p class="loading-state">Loading...</p>`}function Pp({perCore:e}){if(!e||!e.length)return null;const t=100;return c`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((s,n)=>{const l=Math.max(1,s/t*100),o=s>80?"var(--red)":s>50?"var(--orange)":s>20?"var(--green)":"var(--fg2)";return c`<div key=${n} title=${"Core "+n+": "+_e(s)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+l+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function zp({mem:e}){var k;const[t,s]=U(!1),[n,l]=U(!1),[o,a]=U(null),[i,r]=U(null),[d,v]=U(!1),p=et(je),m=(e.file||"").replace(/\\/g,"/").split("/").pop(),_=Ve(async()=>{if(t){s(!1);return}if(s(!0),al.has(e.file)){a(al.get(e.file));return}v(!0),r(null);try{const S=await No(e.file);a(S)}catch(S){r(S.message)}finally{v(!1)}},[t,e.file]),x=(S,B)=>S.map((A,O)=>c`<span class="pline"><span class="ln">${B+O}</span>${X(A)||" "}</span>`),E=()=>{if(d)return c`<span class="loading-state">Loading...</span>`;if(i)return c`<span class="error-state">${i}</span>`;if(!o)return null;const S=o.split(`
`),B=S.length;if(B<=nn*3||n)return c`${x(S,1)}
        <div class="prev-actions">
          ${n&&c`<button class="prev-btn" onClick=${()=>l(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
        </div>`;const A=S.slice(-nn),O=B-nn+1;return c`${x(A,O)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>l(!0)}>show all (${B} lines)</button>
        <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
      </div>`},T=e.mtime&&Date.now()/1e3-e.mtime<300,y=(k=p.recentFiles)==null?void 0:k.get(e.file),$=!!y;return c`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${_}
      aria-expanded=${t} title=${e.file}>
      ${$?c`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${Nt(y.ts)}">●</span>`:T?c`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${Nt(e.mtime)}">●</span>`:c`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${X(m)}</span>
      <span class="fmeta">${ge(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${T||$?c` <span style="color:${$?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${Nt($?y.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${t&&c`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${E()}</div>`}
  </div>`}function Rp({profile:e,items:t}){const[s,n]=U(t.length<=5),l=t.reduce((o,a)=>o+a.tokens,0);return c`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${X(e)}</span>
      <span class="badge">${t.length} files</span>
      <span class="badge">${z(l)} tok</span>
    </button>
    ${s&&c`<div>${t.map(o=>c`<${zp} key=${o.file} mem=${o}/>`)}</div>`}
  </div>`}function Fp({source:e,entries:t}){const[s,n]=U(!1),l=ie(()=>{const o={};return t.forEach(a=>{(o[a.profile]=o[a.profile]||[]).push(a)}),Object.entries(o)},[t]);return c`<div class="mem-group">
    <button class=${"mem-group-head"+(s?" open":"")} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      ${X(md[e]||e)} <span class="badge">${t.length}</span>
      <span class="badge">${z(t.reduce((o,a)=>o+a.tokens,0))} tok</span>
    </button>
    ${s&&c`<div>${l.map(([o,a])=>c`<${Rp} key=${o} profile=${o} items=${a}/>`)}</div>`}
  </div>`}function Ip(){const[e,t]=U(null);if(de(()=>{Mn().then(n=>{n&&n.ts&&n.ts.length>=2&&t(n)}).catch(()=>{})},[]),!e)return null;const s=e.memory_entries&&e.memory_entries.some(n=>n>0);return c`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${Xt} label="Memory Tokens" value=${z(e.mem_tokens[e.mem_tokens.length-1]||0)}
        data=${[e.ts,e.mem_tokens]} chartColor="var(--accent)" smooth />
      ${s&&c`<${Xt} label="Memory Entries" value=${e.memory_entries[e.memory_entries.length-1]||0}
        data=${[e.ts,e.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function Np(){const{snap:e}=et(je);if(!e||!e.agent_memory.length)return c`<p class="empty-state">No agent memory found.</p>`;const t=ie(()=>{const s={};return e.agent_memory.forEach(n=>{(s[n.source]=s[n.source]||[]).push(n)}),Object.entries(s)},[e.agent_memory]);return c`<${Ip}/>
    ${t.map(([s,n])=>c`<${Fp} key=${s} source=${s} entries=${n}/>`)}`}function jp(){var n,l,o,a;const{snap:e}=et(je);if(!e)return c`<p class="empty-state">Loading...</p>`;const t=e.tools.filter(i=>i.live).sort((i,r)=>{var d,v,p,m;return(((d=r.live)==null?void 0:d.outbound_rate_bps)||0)+(((v=r.live)==null?void 0:v.inbound_rate_bps)||0)-((((p=i.live)==null?void 0:p.outbound_rate_bps)||0)+(((m=i.live)==null?void 0:m.inbound_rate_bps)||0))}),s=Object.entries(e.live_monitor&&e.live_monitor.diagnostics||{});return c`<div class="live-stack">
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
            <td>\u2191 ${It(r.outbound_rate_bps||0)}<br/>\u2193 ${It(r.inbound_rate_bps||0)}</td>
            <td>${z(Io(r))}<br/><span class="text-muted">${X(d.source||"network-inference")} @ ${_e((d.confidence||0)*100)}</span></td>
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
  </div>`}function Bp(){var E,T,y,$;const{snap:e,globalRange:t}=et(je),[s,n]=U(null),[l,o]=U([]),[a,i]=U(null),r=ie(()=>e?e.tools.filter(k=>!k.meta&&(k.files.length||k.processes.length||k.live)).sort((k,S)=>k.label.localeCompare(S.label)):[],[e]);if(de(()=>{!s&&r.length&&n(r[0].tool)},[r,s]),de(()=>{!s||!t||Fo({tool:s,since:t.since,limit:500,until:t.until}).then(o).catch(()=>o([]))},[s,t]),de(()=>{!s||!t||Mn({since:t.since,tool:s,until:t.until}).then(k=>{var S;return i(((S=k==null?void 0:k.by_tool)==null?void 0:S[s])||null)}).catch(()=>i(null))},[s,t]),!e)return c`<p class="loading-state">Loading...</p>`;const d=r.find(k=>k.tool===s),v=(E=e.tool_telemetry)==null?void 0:E.find(k=>k.tool===s),p=d==null?void 0:d.live,m=Oe[s]||"var(--fg2)",_={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},x=t.until!=null?new Date(t.since*1e3).toLocaleString(void 0,_)+" – "+new Date(t.until*1e3).toLocaleString(void 0,_):"";return c`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${r.map(k=>c`<button key=${k.tool}
        class=${s===k.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>n(k.tool)}>
        <span style="color:${Oe[k.tool]||"var(--fg2)"}">${bt[k.tool]||"🔹"}</span>
        ${k.label}
        ${k.live?c`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${s&&c`<Fragment>
        <h3 class="flex-row mb-sm gap-sm">
          <span style="color:${m}">${bt[s]||"🔹"}</span>
          ${(d==null?void 0:d.label)||s}
          ${d!=null&&d.vendor?c`<span class="badge">${fr[d.vendor]||d.vendor}</span>`:""}
          ${v!=null&&v.model?c`<span class="badge mono">${v.model}</span>`:""}
        </h3>

        ${a&&((T=a.ts)==null?void 0:T.length)>=2?c`<div class="es-section">
          <div class="es-section-title">Time Series${x?c` <span class="badge">${x}</span>`:""}</div>
          <div class="es-charts">
            <${Xt} label="CPU %" value=${((y=d==null?void 0:d.live)==null?void 0:y.cpu_percent)!=null?_e(d.live.cpu_percent||0):"-"}
              data=${[a.ts,a.cpu]} chartColor=${m} smooth />
            <${Xt} label="Memory (MB)" value=${(($=d==null?void 0:d.live)==null?void 0:$.mem_mb)!=null?ge((d.live.mem_mb||0)*1048576):"-"}
              data=${[a.ts,a.mem_mb]} chartColor="var(--green)" smooth />
            <${Xt} label="Context (tok)" value=${qe(a.tokens[a.tokens.length-1]||0)}
              data=${[a.ts,a.tokens]} chartColor="var(--accent)" />
            <${Xt} label="Network (B/s)"
              value=${It(p?(p.outbound_rate_bps||0)+(p.inbound_rate_bps||0):a.traffic[a.traffic.length-1]||0)}
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
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${qe(v.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${qe(v.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${qe(v.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${qe(v.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${z(v.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${z(v.total_messages||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cost</div><div class="value">${v.cost_usd?"$"+v.cost_usd.toFixed(2):"-"}</div></div>
          </div>
          ${Object.keys(v.by_model||{}).length>0&&c`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(v.by_model).map(([k,S])=>c`<div key=${k}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${k}</span>
              <span>in: ${qe(S.input||S.input_tokens||0)} tok \u00B7 out: ${qe(S.output||S.output_tokens||0)} tok${S.cache_read_tokens?" · cR:"+qe(S.cache_read_tokens):""}${S.cache_creation_tokens?" · cW:"+qe(S.cache_creation_tokens):""}${S.cost_usd?" · $"+S.cost_usd.toFixed(2):""}</span>
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
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${It(p.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${It(p.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">Events (${l.length})</div>
          ${l.length?c`<div class="es-feed">
            ${l.map((k,S)=>{const B=hd[k.kind]||"var(--fg2)",A=new Date(k.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),O=k.detail?Object.entries(k.detail).map(([P,b])=>P+"="+b).join(", "):"";return c`<div key=${k.ts+"-"+k.tool+"-"+S} class="es-event">
                <span class="es-event-time">${A}</span>
                <span class="es-event-kind" style="color:${B}">${k.kind}</span>
                <span class="es-event-detail" title=${O}>${O||"-"}</span>
              </div>`})}
          </div>`:c`<p class="empty-state">No events for this tool in the selected range.</p>`}
        </div>
      </Fragment>`}
    </div>
  </div>`}const Qs=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"],zi={"claude-opus-4-6":1e6,"claude-opus-4-5":1e6,"claude-sonnet-4-6":1e6,"claude-sonnet-4-5":1e6,"claude-sonnet-4":2e5,"claude-haiku-4-5":2e5,"claude-3-5-sonnet":2e5,"gpt-4.1":1e6,"gpt-4.1-mini":1e6,"gpt-4o":128e3,"gpt-4o-mini":128e3,o3:2e5,"o4-mini":2e5,"gemini-2.5-pro":1e6,"gemini-2.5-flash":1e6};function Ri({always:e,onDemand:t,conditional:s,never:n,total:l}){if(!l)return null;const o=a=>(a/l*100).toFixed(1)+"%";return c`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${e>0&&c`<div style="width:${o(e)};height:100%;background:var(--green)" title="Always loaded: ${z(e)}"></div>`}
    ${t>0&&c`<div style="width:${o(t)};height:100%;background:var(--yellow)" title="On-demand: ${z(t)}"></div>`}
    ${s>0&&c`<div style="width:${o(s)};height:100%;background:var(--orange)" title="Conditional: ${z(s)}"></div>`}
    ${n>0&&c`<div style="width:${o(n)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${z(n)}"></div>`}
  </div>`}function Hp(){const{snap:e,history:t,enabledTools:s}=et(je),[n,l]=U(null),[o,a]=U(!1);if(de(()=>{l(null),a(!1),nd().then(l).catch(()=>a(!0))},[]),o)return c`<p class="error-state">Failed to load budget.</p>`;if(!n)return c`<p class="loading-state">Loading...</p>`;const i=b=>s===null||s.includes(b),r=ie(()=>{const b=(e==null?void 0:e.tool_configs)||[];for(const C of["claude-code","copilot","copilot-vscode"]){const D=b.find(F=>F.tool===C&&F.model);if(D)return D.model}for(const C of b)if(C.model&&zi[C.model])return C.model;return""},[e]),d=zi[r]||2e5,v=n.always_loaded_tokens||0,p=n.total_potential_tokens||0,m=v/d*100,_=p/d*100,x=ie(()=>{if(!e)return{};const b={};return e.tools.forEach(C=>{C.tool==="aictl"||!C.token_breakdown||!C.token_breakdown.total||(b[C.tool]=C.token_breakdown)}),b},[e]),E=ie(()=>e!=null&&e.tool_telemetry?e.tool_telemetry.filter(b=>i(b.tool)):[],[e,s]),T=ie(()=>{if(!e)return[];const b={};return e.tools.forEach(C=>{C.tool==="aictl"||!i(C.tool)||(C.files||[]).forEach(D=>{const F=D.kind||"other";b[F]||(b[F]={kind:F,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),b[F].count++,b[F].tokens+=D.tokens,b[F].size+=D.size;const R=(D.sent_to_llm||"").toLowerCase();R==="yes"?b[F].always+=D.tokens:R==="on-demand"?b[F].onDemand+=D.tokens:R==="conditional"||R==="partial"?b[F].conditional+=D.tokens:b[F].never+=D.tokens})}),Object.values(b).sort((C,D)=>D.tokens-C.tokens)},[e,s]),y=ie(()=>{if(!(e!=null&&e.tool_telemetry))return null;const b={},C={};e.tool_telemetry.filter(L=>i(L.tool)).forEach(L=>{(L.daily||[]).forEach(j=>{if(j.date&&(b[j.date]||(b[j.date]={}),C[j.date]||(C[j.date]={}),j.tokens_by_model&&Object.entries(j.tokens_by_model).forEach(([q,V])=>{b[j.date][q]=(b[j.date][q]||0)+V}),j.model)){const q=j.model,V=(j.input_tokens||0)+(j.output_tokens||0);b[j.date][q]=(b[j.date][q]||0)+V,C[j.date][q]||(C[j.date][q]={input:0,output:0,cache_read:0,cache_creation:0}),C[j.date][q].input+=j.input_tokens||0,C[j.date][q].output+=j.output_tokens||0,C[j.date][q].cache_read+=j.cache_read_tokens||0,C[j.date][q].cache_creation+=j.cache_creation_tokens||0}})});const D=new Date,F=[];for(let L=6;L>=0;L--){const j=new Date(D);j.setDate(j.getDate()-L),F.push(j.toISOString().slice(0,10))}const R=F.filter(L=>b[L]&&Object.values(b[L]).some(j=>j>0));if(!R.length)return null;const W=[...new Set(R.flatMap(L=>Object.keys(b[L]||{})))],Y=Math.max(...R.map(L=>W.reduce((j,q)=>j+((b[L]||{})[q]||0),0)),1),ne=R.some(L=>Object.keys(C[L]||{}).length>0);return{dates:R,models:W,byDate:b,byDateModel:C,maxTotal:Y,hasDetail:ne}},[e,s]),$=t&&t.ts&&t.ts.length>=2?[t.ts,t.live_tokens||t.ts.map(()=>0)]:null,k=E.reduce((b,C)=>b+(C.input_tokens||0),0),S=E.reduce((b,C)=>b+(C.output_tokens||0),0),B=E.reduce((b,C)=>b+(C.cache_read_tokens||0),0),A=E.reduce((b,C)=>b+(C.cache_creation_tokens||0),0),O=E.reduce((b,C)=>b+(C.total_sessions||0),0),P=E.reduce((b,C)=>b+(C.cost_usd||0),0);return c`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${$?c`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${nc} data=${$} color="var(--green)" height=${60}/>
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
            <span class="text-bolder" style="color:${_>100?"var(--red)":"var(--fg2)"}">${_e(_)}${_>100?" ⚠":""}</span>
          </div>
          <div class="overflow-hidden" style="height:6px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${Math.min(_,100).toFixed(1)}%;background:${_>100?"var(--red)":"var(--fg2)"};opacity:0.5;border-radius:3px"></div>
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
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${Qs[C%Qs.length]};margin-right:3px"></span>${b}
        </span>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
        ${y.dates.map(b=>{const C=y.models.reduce((F,R)=>F+((y.byDate[b]||{})[R]||0),0),D=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return c`<div key=${b} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${D}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${b}: ${z(C)} tokens">
              ${y.models.map((F,R)=>{const W=(y.byDate[b]||{})[F]||0;return W?c`<div key=${F} style="width:${(W/y.maxTotal*100).toFixed(1)}%;height:100%;background:${Qs[R%Qs.length]}" title="${F}: ${z(W)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${z(C)}</span>
          </div>`})}
      </div>
      ${y.hasDetail&&c`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${y.dates.flatMap(b=>{const C=new Date(b+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),D=y.byDateModel[b]||{},F=Object.keys(D).sort();return F.length?F.map((R,W)=>{const Y=D[R];return c`<tr key=${b+"-"+R}>
                <td>${W===0?C:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${Qs[y.models.indexOf(R)%Qs.length]};margin-right:3px"></span>${R}</td>
                <td>${z(Y.input)}</td><td>${z(Y.output)}</td>
                <td class="text-muted">${z(Y.cache_read)}</td>
                <td class="text-muted">${z(Y.cache_creation)}</td>
                <td class="text-bold">${z(Y.input+Y.output)}</td>
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
          <tbody>${E.map(b=>{const C=x[b.tool];return c`<tr key=${b.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(Oe[b.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${X(b.tool)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${b.source}</span> <span class="text-muted">${_e(b.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${z(b.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${z(b.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${z(b.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${z(b.total_sessions||0)}</td>
              <td style="text-align:right">${b.cost_usd>0?"$"+b.cost_usd.toFixed(2):"—"}</td>
              <td>${C?c`<${Ri} always=${C.always_loaded||0} onDemand=${C.on_demand||0}
                conditional=${C.conditional||0} never=${C.never_sent||0} total=${C.total||1}/>`:null}</td>
            </tr>`})}
          ${E.length>1&&c`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${z(k)}</td>
            <td style="text-align:right">${z(S)}</td>
            <td style="text-align:right" class="text-muted">${z(B)}</td>
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
            <td><${Ri} always=${b.always} onDemand=${b.onDemand} conditional=${b.conditional} never=${b.never} total=${b.tokens||1}/></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>`}
  </div>`}function Wp(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const Gn={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function Fi({agent:e,tasks:t,now:s}){const n=Gn[e.state]||Gn.active,l=e.ended_at?e.ended_at-e.started_at:s-e.started_at,o=t.filter(a=>a.agent_id===e.agent_id);return c`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${n.bg};color:var(--bg)">${n.label}</span>
      <strong class="text-sm">${X(e.agent_id)}</strong>
      <span class="text-muted text-xs">${Wp(l)}</span>
      ${e.task&&c`<span class="text-xs mono text-muted">\u2014 ${X(e.task)}</span>`}
    </div>
    ${o.length>0&&c`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${o.map(a=>{const i=Gn[a.state]||Gn.pending;return c`<div key=${a.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${i.bg};color:var(--bg);font-size:0.6rem;padding:1px 4px">${i.label}</span>
          <span class="mono">${X(a.name||a.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function qp({entityState:e}){if(!e||!e.agents||!e.agents.length)return null;const t=e.agents,s=e.tasks||[],n=Date.now()/1e3,l=t.filter(a=>a.state==="active"),o=t.filter(a=>a.state!=="active");return c`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${t.length} agent${t.length>1?"s":""}</span>
      ${l.length>0&&c`<span class="badge text-xs" style="background:var(--green);color:var(--bg)">${l.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${l.map(a=>c`<${Fi} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
      ${o.map(a=>c`<${Fi} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
    </div>
  </div>`}function Vp({tasks:e}){if(!e||!e.length)return null;const t=e.filter(o=>o.state==="pending"),s=e.filter(o=>o.state==="active"),n=e.filter(o=>o.state==="done");function l({title:o,items:a,color:i}){return c`<div class="tt-column">
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
  </div>`}function tl(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Yt({title:e,icon:t,badge:s,defaultOpen:n,children:l}){const[o,a]=U(n||!1);return c`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>a(i=>!i)}
      aria-expanded=${o}>
      <span class="sd-panel-icon">${t}</span>
      <span class="sd-panel-title">${e}</span>
      ${s!=null&&c`<span class="badge text-xs" style="margin-left:var(--sp-2)">${s}</span>`}
      <span class="sd-panel-arrow">${o?"▲":"▼"}</span>
    </button>
    ${o&&c`<div class="sd-panel-body">${l}</div>`}
  </div>`}function Up({sessionId:e}){const[t,s]=U([]),[n,l]=U(!0);if(de(()=>{if(!e)return;l(!0);const a=Math.floor(Date.now()/1e3)-86400;Fo({sessionId:e,limit:200,since:a}).then(i=>{s(i.reverse()),l(!1)}).catch(()=>l(!1))},[e]),n)return c`<p class="loading-state">Loading events...</p>`;if(!t.length)return c`<p class="empty-state">No events recorded for this session.</p>`;const o={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)"};return c`<div class="sd-events">
    ${t.map((a,i)=>{const r=o[a.kind]||"var(--fg3)",d=a.detail||{},v=d.path||d.name||d.tool_name||a.kind;return c`<div key=${i} class="sd-event-row">
        <span class="sd-event-time">${Nt(a.ts)}</span>
        <span class="sd-event-dot" style="background:${r}"></span>
        <span class="sd-event-kind">${a.kind}</span>
        <span class="sd-event-desc mono text-muted">${X(String(v))}</span>
      </div>`})}
  </div>`}const Gp={"claude-opus-4-6":1e6,"claude-sonnet-4.6":1e6,"claude-sonnet-4":2e5,"claude-haiku-4.5":2e5,"gpt-5.4":2e5,"gpt-5":128e3},Ii=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],Yp=95;function Kp({session:e}){const{snap:t}=et(je),s=e.files_loaded||[],n=((t==null?void 0:t.tool_configs)||[]).map(_=>_.model).filter(Boolean)[0]||"",l=Gp[n]||2e5,a=(t&&t.agent_memory||[]).reduce((_,x)=>_+(x.tokens||0),0),i=s.length*150,d=Ii.reduce((_,x)=>_+x.tokens,0)+a+i,v=Math.min(d/l*100,100),p=Yp,m=[...Ii,{name:"Memory",tokens:a,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:i,color:"var(--green)"}].filter(_=>_.tokens>0);return c`<div>
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
          ${m.map(_=>{const x=(_.tokens/l*100).toFixed(1);return c`<div key=${_.name} style="width:${x}%;background:${_.color};min-width:${_.tokens>0?"1px":"0"}"
              title="${_.name}: ~${z(_.tokens)} tokens"></div>`})}
        </div>
        <div style="position:absolute;left:${p}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${p}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${m.map(_=>c`<span key=${_.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${_.color};margin-right:2px"></span>
          ${_.name} ${z(_.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${p}%</span>
      </div>
    </div>

    ${s.length>0&&c`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${s.map(_=>c`<div key=${_} class="text-muted" style="padding:2px 0">${X(_)}</div>`)}
    </div>`}
    ${!s.length&&c`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function Jp({session:e}){const{snap:t}=et(je),s=t&&t.agent_memory||[],n=e.project||"",l=n?s.filter(o=>{const a=o.project||o.tool||"";return!n||a.includes(n.replace(/\\/g,"/").split("/").pop())}):s;return l.length?c`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${l.map((o,a)=>c`<${Qp} key=${a} mem=${o}/>`)}
  </div>`:c`<p class="empty-state">No memory entries found${n?" for this project":""}.</p>`}function Qp({mem:e}){const[t,s]=U(!1),n=e.name||(e.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",l=(e.content||"").slice(0,300);return c`<div class="sd-memory-entry" style="cursor:pointer" onClick=${()=>s(!t)}>
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
  </div>`}function Zp({rateLimits:e}){return!e||!Object.keys(e).length?null:c`<div style="margin-top:var(--sp-3)">
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
  </div>`}function Xp({session:e}){const t=e.exact_input_tokens||0,s=e.exact_output_tokens||0,[n,l]=U(null);de(()=>{e.tool&&dr({tool:e.tool,active:!1,limit:20}).then(i=>{if(i.length>1){const r=i.filter(v=>v.duration_s>0).map(v=>v.duration_s),d=r.length?r.reduce((v,p)=>v+p,0)/r.length:0;l({avgDuration:d,sampleCount:i.length})}}).catch(()=>{})},[e.tool]);const o=e.duration_s||0,a=n&&n.avgDuration>0?o/n.avgDuration:null;return c`<div>
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
    ${e.entity_state&&c`<${Zp} rateLimits=${e.entity_state.rate_limits}/>`}
  </div>`}function ef({project:e}){const[t,s]=U(null);return de(()=>{e&&td(7).then(n=>{const l=n.find(o=>o.project===e);s(l||null)}).catch(()=>{})},[e]),t?c`<div>
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
  </div>`:c`<p class="empty-state">No cost data available for this project.</p>`}function tf({project:e,tool:t}){const[s,n]=U(null);if(de(()=>{!e||!t||Zc(e,t,30,20).then(n).catch(()=>n([]))},[e,t]),!s||s.length<2)return c`<p class="empty-state">Not enough session history for trend analysis.</p>`;const l=Math.max(...s.map(i=>i.total_tokens),1),o=s.reduce((i,r)=>i+r.duration_s,0)/s.length,a=s.reduce((i,r)=>i+r.total_tokens,0)/s.length;return c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${tl(o)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${z(a)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${s.map(i=>{const r=(i.total_tokens/l*100).toFixed(1),d=new Date(i.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),v=o>0?i.duration_s/o:1;return c`<div key=${i.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${d}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${r}%;border-radius:3px;background:${v>1.5?"var(--orange)":v<.7?"var(--green)":"var(--accent)"}" title="${z(i.total_tokens)} tok, ${tl(i.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${z(i.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${tl(i.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function sf({sessionId:e}){const[t,s]=U(null),[n,l]=U(!0);if(de(()=>{l(!0);const i=Math.floor(Date.now()/1e3)-3600;sd(i,100).then(r=>{s(r),l(!1)}).catch(()=>l(!1))},[e]),n)return c`<p class="loading-state">Loading API call data...</p>`;if(!t||!t.calls||!t.calls.length)return c`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;const{calls:o,summary:a}=t;return c`<div>
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
  </div>`}function nf({session:e}){const t=e.files_touched||[],s=e.file_events||0;return t.length?c`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${t.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${z(s)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${t.map(n=>c`<div key=${n} class="text-muted" style="padding:2px 0">${X(n)}</div>`)}
    </div>
  </div>`:c`<p class="empty-state">No file changes recorded.</p>`}function lf({session:e,onClose:t}){const s=Oe[e.tool]||"var(--fg2)",n=e.files_loaded||[],l=e.files_touched||[],o=e.exact_input_tokens||0,a=e.exact_output_tokens||0,i=e.entity_state||null,r=i&&i.agents&&i.agents.length>0,d=i&&i.tasks&&i.tasks.length>0;return c`<div class="sd-container" style="border-left:3px solid ${s}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${X(e.tool)}</strong>
        ${e.project&&c`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${e.project}>${X(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">
          ${tl(e.duration_s)}
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

    <${Yt} title="Actions" icon="\u26A1" badge=${null} defaultOpen=${!0}>
      <${Up} sessionId=${e.session_id}/>
    <//>
    ${r&&c`<${Yt} title="Team" icon="\uD83D\uDC65" badge=${i.agents.length+" agents"} defaultOpen=${!0}>
      <${qp} entityState=${i}/>
    <//>`}
    ${d&&c`<${Yt} title="Tasks" icon="\uD83D\uDCCB" badge=${i.tasks.length} defaultOpen=${!0}>
      <${Vp} tasks=${i.tasks}/>
    <//>`}
    <${Yt} title="Context" icon="\uD83D\uDCDA" badge=${n.length||null}>
      <${Kp} session=${e}/>
    <//>
    <${Yt} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${!1}>
      <${Jp} session=${e}/>
    <//>
    <${Yt} title="Resources" icon="\u2699\uFE0F" badge=${z(o+a)+" tok"}>
      <${Xp} session=${e}/>
    <//>
    <${Yt} title="Deliverables" icon="\uD83D\uDCE6" badge=${l.length||null}>
      <${nf} session=${e}/>
    <//>
    <${Yt} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${!1}>
      <${sf} sessionId=${e.session_id}/>
    <//>
    ${e.project&&c`<${Yt} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${!1}>
      <${ef} project=${e.project}/>
    <//>`}
    ${e.project&&e.tool&&c`<${Yt} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${!1}>
      <${tf} project=${e.project} tool=${e.tool}/>
    <//>`}
  </div>`}function of(e,t,s){const n=t-e,l=[300,600,900,1800,3600,7200,10800,21600,43200,86400];let o=l[l.length-1];for(const r of l)if(n/r<=s){o=r;break}const a=Math.ceil(e/o)*o,i=[];for(let r=a;r<=t;r+=o){const d=new Date(r*1e3);let v;o>=86400?v=d.toLocaleDateString([],{month:"short",day:"numeric"}):n>86400?v=d.toLocaleString([],{hourCycle:"h23",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):v=d.toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),i.push({ts:r,label:v})}return i}function af(e){return e>=3600?(e/3600).toFixed(1)+"h":e>=60?Math.round(e/60)+"m":Math.round(e)+"s"}function Ni(e,t,s,n){const l=e.duration_s||(e.ended_at||n)-e.started_at,o=new Date(e.started_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),a=e.ended_at?new Date(e.ended_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):"now",i=[af(l)];e.conversations&&i.push(e.conversations+" conv"),e.subagents&&i.push(e.subagents+" agents"),e.source_files?i.push(e.source_files+" src files"):e.unique_files&&i.push(e.unique_files+" files"),e.bytes_written>1024&&i.push(ge(e.bytes_written));const r=!e.ended_at;return c`<div class="stl-tip">
    <div class="stl-tip-head">
      <span style=${"color:"+t}>${s}</span>
      <strong>${e.tool}</strong>
      ${r?c`<span class="badge" style="font-size:9px;background:var(--green);color:#000">live</span>`:""}
    </div>
    <div class="stl-tip-time">${o} – ${a}</div>
    <div class="stl-tip-stats">${i.join(" · ")}</div>
    ${e.project?c`<div class="stl-tip-proj">${e.project.replace(/\\/g,"/").split("/").pop()}</div>`:""}
  </div>`}function rf({sessions:e,rangeSeconds:t,onSelect:s}){const n=Date.now()/1e3,l=t||86400,o=n-l,a=(e||[]).filter(O=>(O.ended_at||n)>=o&&O.started_at<=n),i=a.filter(O=>O.ended_at).sort((O,P)=>O.started_at-P.started_at),r=a.filter(O=>!O.ended_at).sort((O,P)=>O.started_at-P.started_at),d=[],v=[];for(const O of i){const P=Math.max(O.started_at,o),b=O.ended_at;let C=-1;for(let D=0;D<d.length;D++)if(P>=d[D]+2){d[D]=b,C=D;break}C<0&&(C=d.length,d.push(b)),v.push(C)}const p=10,m=2,_=18,x=14,E=Math.max(d.length,0),T=E>0?E*(p+m)+m:0,y=r.length>0?x+m*2:0,$=T>0&&y>0?1:0,k=T+$+y,S=Math.max(k,20)+_,B=of(o,n,8),A=O=>(Math.max(O,o)-o)/l*100;return c`<div class="stl">
    <div class="stl-chart" style=${"height:"+S+"px"}>
      ${B.map(O=>c`<div key=${O.ts} class="stl-grid"
        style=${"left:"+A(O.ts).toFixed(2)+"%;bottom:"+_+"px"} />`)}

      <!-- ended session bars -->
      ${i.map((O,P)=>{const b=Math.max(O.started_at,o),C=A(b),D=Math.max(.15,A(O.ended_at)-C),F=v[P]*(p+m)+m,R=Oe[O.tool]||"var(--fg2)",W=bt[O.tool]||"🔹";return c`<div key=${O.session_id} class="stl-bar"
          style=${"left:"+C.toFixed(2)+"%;width:"+D.toFixed(2)+"%;top:"+F+"px;height:"+p+"px;background:"+R}
          onClick=${()=>s&&s(O)}>
          ${Ni(O,R,W,n)}
        </div>`})}

      <!-- divider between ended and live -->
      ${$?c`<div class="stl-divider" style=${"top:"+T+"px"} />`:""}

      <!-- live session markers -->
      ${r.map(O=>{const P=A(O.started_at),b=T+$+m,C=Oe[O.tool]||"var(--fg2)",D=bt[O.tool]||"🔹";return c`<div key=${O.session_id} class="stl-marker"
          style=${"left:"+P.toFixed(2)+"%;top:"+b+"px;background:"+C}
          onClick=${()=>s&&s(O)}>
          ${Ni(O,C,D,n)}
        </div>`})}

      <div class="stl-axis" style=${"top:"+(S-_)+"px"}>
        ${B.map(O=>c`<span key=${O.ts} class="stl-tick"
          style=${"left:"+A(O.ts).toFixed(2)+"%"}>${O.label}</span>`)}
      </div>
    </div>
  </div>`}function Lo(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function lc(e){let t=0;for(const s of e)(s.role==="lead"||s.role==="teammate"||s.role==="subagent")&&t++,t+=lc(s.children||[]);return t}function ji({session:e,onSelect:t,isSelected:s,agentTeams:n}){const l=Oe[e.tool]||"var(--fg2)",o=bt[e.tool]||"🔹",a=(n||[]).find(d=>d.session_id===e.session_id),i=a?a.agent_count:lc(e.process_tree||[]),r=i>1;return c`<div class="diag-card" style="border-left:3px solid ${l};cursor:pointer;${s?"outline:2px solid var(--accent);outline-offset:-2px":""}"
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
      <div class="es-kv-card"><div class="label">Duration</div><div class="value">${Lo(e.duration_s)}</div></div>
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
  </div>`}function cf(){const{snap:e}=et(je),t=e&&e.agent_teams||[];if(!t.length)return null;const s=t.reduce((o,a)=>o+a.agent_count,0),n=t.reduce((o,a)=>o+(a.total_input_tokens||0),0),l=t.reduce((o,a)=>o+(a.total_output_tokens||0),0);return c`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Agent Teams
      <span class="badge">${t.length} sessions</span>
      <span class="badge">${s} agents</span>
      <span class="badge">${z(n+l)} tok</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      ${t.sort((o,a)=>(a.total_input_tokens||0)-(o.total_input_tokens||0)).slice(0,8).map(o=>c`
        <${uf} key=${o.session_id} team=${o}/>
      `)}
    </div>
  </div>`}function df(e){return e?e.replace("claude-","").replace("-20251001",""):"?"}function uf({team:e}){const[t,s]=U(!1),[n,l]=U(e.agents||null),[o,a]=U(!1);e.models,de(()=>{!t||n||(a(!0),Xc(e.session_id).then(p=>{l(p.agents||[]),a(!1)}).catch(()=>{l([]),a(!1)}))},[t]);const i=(n||[]).filter(p=>(p.input_tokens||0)+(p.output_tokens||0)>50),r=(n||[]).length-i.length,d=i.sort((p,m)=>m.input_tokens+m.output_tokens-(p.input_tokens+p.output_tokens)),v=d[0]?(d[0].input_tokens||0)+(d[0].output_tokens||0):1;return c`<div class="diag-card" style="border-left:3px solid var(--accent);padding:var(--sp-4)">
    <div class="flex-row gap-sm mb-sm" style="align-items:center;cursor:pointer" onClick=${()=>s(!t)}>
      <span class="badge" style="background:var(--accent);color:var(--bg)">${e.agent_count||i.length} agents${r?c` <span style="opacity:0.6">+${r}w</span>`:null}</span>
      <span class="text-muted text-xs">${z(e.total_input_tokens||0)}in / ${z(e.total_output_tokens||0)}out</span>
      ${(e.tools_used||[]).length>0&&c`<span class="text-muted text-xs">${e.tools_used.join(", ")}</span>`}
      <span class="mono text-xs text-muted" style="margin-left:auto" title=${e.session_id}>${e.session_id.slice(0,12)}\u2026</span>
      <span class="text-xs text-muted">${t?"▲":"▼"}</span>
    </div>
    <!-- Agent rows: show loading, or compact agent rows with task + tokens -->
    ${o?c`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading agents\u2026</div>`:c`<div style="display:flex;flex-direction:column;gap:1px">
      ${d.slice(0,t?999:5).map(p=>{const m=(p.input_tokens||0)+(p.output_tokens||0),_=Math.max(1,m/v*100);return c`<div key=${p.agent_id} style="display:grid;
          grid-template-columns:2px 1fr minmax(60px,auto) minmax(50px,auto) 14px;
          gap:var(--sp-2);align-items:center;padding:2px var(--sp-2);font-size:var(--fs-xs);
          background:var(--bg);border-radius:2px">
          <div style="width:2px;height:100%;background:${p.is_sidechain?"var(--yellow)":"var(--green)"}"></div>
          <div class="text-ellipsis" title=${p.task||p.slug||p.agent_id}
            style="color:${p.task?"var(--fg)":"var(--fg2)"}">${p.task||p.slug||p.agent_id.slice(0,10)}</div>
          <div style="display:flex;align-items:center;gap:var(--sp-1)">
            <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;min-width:30px">
              <div style="height:100%;width:${_}%;background:${p.is_sidechain?"var(--yellow)":"var(--green)"};border-radius:2px;opacity:0.7"></div>
            </div>
            <span class="text-muted" style="font-size:var(--fs-2xs);white-space:nowrap">${z(m)}</span>
          </div>
          <span class="text-muted" style="font-size:var(--fs-2xs)">${df(p.model)}</span>
          ${p.completed?c`<span class="text-green">\u2713</span>`:c`<span class="text-orange">\u25CB</span>`}
        </div>`})}
      ${!t&&d.length>5?c`<div class="text-muted text-xs cursor-ptr" style="padding:2px var(--sp-2)"
        onClick=${p=>{p.stopPropagation(),s(!0)}}>+${d.length-5} more agents\u2026</div>`:null}
    </div>`}
  </div>`}function pf(){const{snap:e,globalRange:t,rangeSeconds:s,enabledTools:n}=et(je),[l,o]=U([]),[a,i]=U(!1),[r,d]=U(!0),[v,p]=U(null),[m,_]=U(null),[x,E]=U([]);de(()=>{d(!0),i(!1),dr({active:!1}).then(b=>{o(b),d(!1)}).catch(()=>{i(!0),d(!1)})},[]),de(()=>{if(!t)return;const b=Math.min(t.since,Date.now()/1e3-86400);ur(null,{since:b,until:t.until}).then(E).catch(()=>E([]))},[t]),de(()=>{const b=C=>{const D=C.detail;D&&D.session_id&&(p(D.session_id),_(D))};return window.addEventListener("aictl-session-select",b),()=>window.removeEventListener("aictl-session-select",b)},[]);const T=b=>n===null||n.includes(b),y=(e&&e.sessions||[]).filter(b=>T(b.tool)),$=l.filter(b=>T(b.tool)),k=x.filter(b=>T(b.tool));let S=y.find(b=>b.session_id===v);if(!S&&v){const C=l.find(D=>D.session_id===v)||m;C&&C.session_id===v&&(S={session_id:C.session_id,tool:C.tool,project:C.project||"",duration_s:C.duration_s||0,active:C.active||!1,started_at:C.started_at,ended_at:C.ended_at,files_touched:[],files_loaded:[],exact_input_tokens:C.input_tokens||0,exact_output_tokens:C.output_tokens||0,pids:[],file_events:C.files_modified||0})}const B=b=>{p(C=>C===b.session_id?null:b.session_id)},A={};for(const b of y){const C=b.project||"Unknown Project";A[C]||(A[C]=[]),A[C].push(b)}const O=Object.keys(A).sort();return c`<div>
    <div class="mb-lg">
      <${rf} sessions=${k} rangeSeconds=${s}
        onSelect=${b=>{p(b.session_id),_(b)}}/>
    </div>

    <${cf}/>

    ${S&&c`<${lf} session=${S}
      onClose=${()=>p(null)}/>`}

    <div class="es-section">
      <div class="es-section-title">Active Sessions (${y.length})</div>
      ${y.length?O.length>1?O.map(b=>c`<div key=${b} style="margin-bottom:var(--sp-5)">
              <div class="text-muted text-sm mono" style="margin-bottom:var(--sp-3);font-weight:600">
                ${X(b.replace(/\\/g,"/").split("/").pop()||b)}
                <span class="text-xs" style="font-weight:400"> \u2014 ${A[b].length} session${A[b].length>1?"s":""}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
                ${A[b].map(C=>c`<${ji} key=${C.session_id} session=${C}
                  onSelect=${B} isSelected=${C.session_id===v} agentTeams=${e==null?void 0:e.agent_teams}/>`)}
              </div>
            </div>`):c`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
              ${y.map(b=>c`<${ji} key=${b.session_id} session=${b}
                onSelect=${B} isSelected=${b.session_id===v}/>`)}
            </div>`:c`<div class="empty-state">
            <p>No active sessions.</p>
            ${$.length>0&&c`<div class="diag-card" style="margin-top:var(--sp-4);max-width:400px">
              <div class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Last session</div>
              <div class="flex-row gap-sm" style="align-items:center">
                <span style="color:${Oe[$[0].tool]||"var(--fg2)"}">${bt[$[0].tool]||"🔹"}</span>
                <strong>${X($[0].tool)}</strong>
                <span class="text-muted text-xs">${Lo($[0].duration_s)}</span>
                ${$[0].ended_at&&c`<span class="text-muted text-xs">${Nt($[0].ended_at)}</span>`}
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
                <tbody>${$.map(b=>{const C=Oe[b.tool]||"var(--fg2)",D=bt[b.tool]||"🔹",F=b.session_id?b.session_id.length>12?b.session_id.slice(0,12)+"…":b.session_id:"—";return c`<tr key=${b.session_id} style="cursor:pointer;${b.session_id===v?"background:var(--bg2)":""}"
                    onClick=${()=>{p(b.session_id===v?null:b.session_id),_(null)}}>
                    <td>
                      <span style="color:${C};margin-right:var(--sp-2)">${D}</span>
                      ${X(b.tool)}
                    </td>
                    <td><span class="mono" title=${b.session_id} style="font-size:0.7rem">${F}</span></td>
                    <td>${Lo(b.duration_s)}</td>
                    <td>${b.active?c`<span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>`:c`<span class="badge" style="font-size:var(--fs-xs)">ended</span>`}</td>
                    <td>${b.ended_at?Nt(b.ended_at):"—"}</td>
                  </tr>`})}</tbody>
              </table>`:c`<p class="empty-state">No past sessions recorded.</p>`}
    </div>
  </div>`}function Bi(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function ff(e,t,s){let n;return{hooks:{init(l){n=document.createElement("div"),n.className="chart-tooltip",n.style.display="none",l.over.appendChild(n)},setCursor(l){var v;const o=l.cursor.idx;if(o==null){n.style.display="none";return}const a=[];for(let p=1;p<l.series.length;p++){const m=(v=l.data[p])==null?void 0:v[o];m!=null&&a.push(t?t(m):z(m))}if(!a.length){n.style.display="none";return}const i=l.data[0][o],r=s?new Date(i*1e3).toLocaleTimeString([],{hourCycle:"h23"}):e?e(i):z(i);n.innerHTML=`<b>${a.join(", ")}</b> ${r}`;const d=Math.round(l.valToPos(i,"x"));n.style.left=Math.min(d,l.over.clientWidth-100)+"px",n.style.display=""}}}}const vf=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function mf(e){return e==null||e===0?"0":e>=1e6?Math.round(e/1e6)+"M":e>=1e3?Math.round(e/1e3)+"K":e>=1?Math.round(e).toString():e.toPrecision(1)}function hf(e,t,s,n){const l=Math.max(0,Math.floor(Math.log10(Math.max(1,s)))),o=Math.ceil(Math.log10(Math.max(1,n))),a=[];for(let r=l;r<=o;r++)a.push(Math.pow(10,r));if(a.length<=3)return a;const i=Math.floor((l+o)/2);return[Math.pow(10,l),Math.pow(10,i),Math.pow(10,o)]}function ao({mode:e,data:t,labels:s,colors:n,height:l,isTime:o,fmtX:a,fmtY:i,xLabel:r,yLabel:d,logX:v}){const p=ot(null),m=ot(null),_=l||200;return de(()=>{if(!p.current||!t||t.length<2||!t[0]||t[0].length<2)return;try{m.current&&(m.current.destroy(),m.current=null)}catch{m.current=null}const x=t.length-1,E=n||vf,T=[{}];for(let $=0;$<x;$++){const k=E[$%E.length],S=Bi(k,.6);e==="scatter"?T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:"transparent",paths:()=>null,points:{show:!0,size:8,fill:S,stroke:"transparent",width:0}}):T.push({label:(s==null?void 0:s[$])||`Series ${$+1}`,stroke:k,width:1.5,fill:Bi(k,.08),points:{show:!1}})}const y={width:p.current.clientWidth||300,height:_,padding:[8,8,0,0],cursor:{show:!0,x:!0,y:!1,points:{show:e!=="scatter"}},legend:{show:!1},select:{show:!1},scales:{x:{time:!!o,...v?{distr:3,log:10}:{}},y:{auto:!0,range:($,k,S)=>[Math.max(0,k*.9),S*1.1||1]}},axes:[{show:!0,size:28,gap:2,...v?{splits:hf}:{},values:o?void 0:($,k)=>k.map(S=>v?mf(S):a?a(S):z(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}},{show:!0,size:50,gap:2,values:($,k)=>k.map(S=>i?i(S):z(S)),stroke:"var(--fg2)",font:"10px sans-serif",ticks:{stroke:"var(--border)",width:1},grid:{stroke:"var(--border)",width:1,dash:[2,4]}}],series:T,plugins:[ff(a,i,o)]};try{m.current=new nt(y,t,p.current)}catch($){console.warn("AnalyticsChart: uPlot init failed",$),m.current=null}return()=>{try{m.current&&(m.current.destroy(),m.current=null)}catch{}}},[t,e,n,s,o,v,_]),de(()=>{if(!m.current||!p.current)return;const x=new ResizeObserver(()=>{m.current&&p.current&&m.current.setSize({width:p.current.clientWidth,height:_})});return x.observe(p.current),()=>x.disconnect()},[_]),c`<div class="analytics-chart-wrap" style=${"height:"+_+"px"} ref=${p}></div>`}function gf(e){const t={};for(const s of e){const n=typeof s=="string"?s:s.metric;if(!n)continue;const l=n.split("."),o=l.length>1?l.slice(0,-1).join("."):"(ungrouped)";(t[o]=t[o]||[]).push({name:n,count:s.count||0,lastValue:s.last_value})}return Object.entries(t).sort((s,n)=>s[0].localeCompare(n[0]))}function _f(){const[e,t]=U([]),[s,n]=U(null),[l,o]=U(null),[a,i]=U([]),[r,d]=U(!1),[v,p]=U(null);de(()=>{od().then(T=>{t(T||[]),p(null)}).catch(T=>{t([]),p(T.message)})},[]);const m=ie(()=>gf(e),[e]),_=Ve(T=>{n(T),o(null),i([]),d(!0);const y=Math.floor(Date.now()/1e3)-1800,$=ad(T,y).then(S=>o(S)).catch(()=>o(null)),k=id(T,y).then(S=>i(Array.isArray(S)?S:[])).catch(()=>i([]));Promise.allSettled([$,k]).then(()=>d(!1))},[]),x=ie(()=>!l||!l.value||!l.value.length?null:l.value[l.value.length-1],[l]),E=ie(()=>{const T=new Set;for(const y of a)y.tags&&Object.keys(y.tags).forEach($=>T.add($));return[...T].sort()},[a]);return c`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${v&&c`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${X(v)}</p>`}
      ${!v&&!e.length&&c`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${m.map(([T,y])=>c`<div key=${T}>
        <div class="text-muted" style="font-size:0.62rem;padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${T}</div>
        ${y.map($=>c`<button key=${$.name}
          class=${s===$.name?"es-tool-btn active":"es-tool-btn"}
          onClick=${()=>_($.name)}>
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
          <${Xt}
            label=${s.split(".").pop()}
            value=${x!=null?z(x):"-"}
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
                  ${E.map(T=>c`<th key=${T} style="padding:var(--sp-2) var(--sp-4)">${T}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${a.slice(-50).reverse().map((T,y)=>c`<tr key=${y}
                  style="border-bottom:1px solid var(--border);${y%2?"background:var(--bg2)":""}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${mr(T.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${z(T.value)}</td>
                  ${E.map($=>c`<td key=${$} style="padding:var(--sp-2) var(--sp-4)">
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
  </div>`}const sn=["var(--green)","var(--orange)","var(--accent)","var(--red)","var(--yellow)","#8b5cf6","#06b6d4","#f472b6"];function ds(e){return e>=1e3?z(e/1e3)+"s":Math.round(e)+"ms"}function $f(e){return"#"+Math.round(e)}function io(e){return(e||"").split("/").slice(-2).join("/")}function bf({data:e}){if(!e||!e.requests||!e.requests.length)return c`<div class="analytics-section">
      <div class="analytics-section-title">Response Time Analysis</div>
      <p class="empty-state">No request data in this time range.</p>
    </div>`;const t=e.requests,s=ie(()=>{const r=t.map(v=>v.ts),d=t.map(v=>v.duration_ms);return[r,d]},[t]),n=ie(()=>{const r=[...new Set(t.map(_=>_.model||"(unknown)"))],d=r.map(()=>[]),p=[...t.filter(_=>_.input_tokens>0)].sort((_,x)=>_.input_tokens-x.input_tokens),m=p.map(_=>_.input_tokens);for(const _ of r)d[r.indexOf(_)]=p.map(x=>(x.model||"(unknown)")===_?x.duration_ms:null);return{data:[m,...d],labels:r,colors:sn.slice(0,r.length)}},[t]),l=e.by_model||[],o=Math.max(1,...l.map(r=>r.p95_ms)),a=ie(()=>{const r=[...new Set(t.map(_=>_.model||"(unknown)"))],v=[...t.filter(_=>_.seq>0)].sort((_,x)=>_.seq-x.seq),p=v.map(_=>_.seq),m=r.map(_=>v.map(x=>(x.model||"(unknown)")===_?x.duration_ms:null));return{data:[p,...m],labels:r,colors:sn.slice(0,r.length)}},[t]),i=t.length?t[t.length-1].duration_ms:0;return c`<div class="analytics-section">
    <div class="analytics-section-title">Response Time Analysis</div>
    <div class="analytics-charts">
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time Over Time</span>
          <span class="chart-val" style="color:var(--accent)">${ds(i)}</span></div>
        <${ao} mode="line" data=${s} isTime=${!0} fmtY=${ds} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time vs Input Size</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">${t.length} requests</span></div>
        <${ao} mode="scatter" data=${n.data} labels=${n.labels}
          colors=${n.colors} fmtX=${z} fmtY=${ds} logX=${!0} height=${200}/>
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Response Time by Model</span></div>
        <div class="hbar-list">
          ${l.map((r,d)=>c`<div key=${r.model} class="hbar-row">
            <span class="hbar-label" title=${r.model}>${r.model.replace(/^claude-/,"")||r.model}</span>
            <div class="hbar-track">
              <div class="hbar-fill" style=${"width:"+Math.round(r.avg_ms/o*100)+"%;background:"+sn[d%sn.length]}></div>
              <div class="hbar-p95" style=${"left:"+Math.round(r.p95_ms/o*100)+"%"} title=${"p95: "+ds(r.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ds(r.avg_ms)}</span>
            <span class="badge">${r.count}</span>
          </div>`)}
        </div>
        ${l.length>0&&c`<div class="text-muted" style="font-size:var(--fs-2xs);margin-top:var(--sp-2);padding-left:130px">
          Bar = avg, dashed line = p95</div>`}
      </div>
      <div class="diag-card">
        <div class="chart-hdr"><span class="chart-label">Session Lifecycle (seq vs latency)</span>
          <span class="chart-val text-muted" style="font-size:var(--fs-sm)">degradation?</span></div>
        <${ao} mode="scatter" data=${a.data} labels=${a.labels}
          colors=${a.colors} fmtX=${$f} fmtY=${ds} logX=${!0} height=${200}/>
      </div>
    </div>
  </div>`}const yf={"claude-code":"#8b5cf6",codex:"#f97316",aider:"#06b6d4",cursor:"#f472b6"};function oc(e,t){return yf[e]||sn[t%sn.length]}function Hi({by_cli:e,total:t,barWidth:s,cliTools:n}){return!e||!e.length?c`<div class="hbar-fill" style=${"width:"+s+"%;background:var(--accent)"}></div>`:e.map((l,o)=>{const a=l.count/t*s,i=oc(l.cli_tool,n.indexOf(l.cli_tool));return c`<div key=${l.cli_tool}
      style=${"width:"+a.toFixed(1)+"%;background:"+i+";height:100%;display:inline-block"}
      title=${l.cli_tool+": "+l.count}></div>`})}function xf({data:e}){if(!e||!e.invocations||!e.invocations.length)return c`<div class="analytics-section">
      <div class="analytics-section-title">Tool Usage</div>
      <p class="empty-state">${e!=null&&e.total_all_time?"No tool invocation data in this time range. Try a wider range ("+e.total_all_time+" invocations exist).":"No tool invocation data yet. Configure Claude Code hooks to capture tool usage."}</p>
    </div>`;const t=e.invocations,s=e.cli_tools||[],n=Math.max(1,...t.map(o=>o.count)),l=Math.max(1,...t.map(o=>o.p95_ms));return c`<div class="analytics-section">
    <div class="analytics-section-title">Tool Usage</div>
    ${s.length>1&&c`<div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-3);flex-wrap:wrap">
      ${s.map((o,a)=>c`<span key=${o} style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)">
        <span style=${"width:10px;height:10px;border-radius:2px;background:"+oc(o,a)}></span>
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
              <${Hi} by_cli=${o.by_cli} total=${o.count}
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
              <${Hi} by_cli=${o.by_cli} total=${o.count}
                barWidth=${Math.round(o.avg_ms/l*100)} cliTools=${s}/>
              <div class="hbar-p95" style=${"left:"+Math.round(o.p95_ms/l*100)+"%"} title=${"p95: "+ds(o.p95_ms)}></div>
            </div>
            <span class="hbar-value">${ds(o.avg_ms)}</span>
          </div>`)}
        </div>
      </div>
    </div>
  </div>`}function kf({data:e}){const[t,s]=U(!1);if(!e)return null;const n=e.memory_timeline||{},l=e.memory_events||[],o=Object.keys(n);if(!o.length&&!l.length)return c`<div class="analytics-section">
      <div class="analytics-section-title">File Write Activity</div>
      <p class="empty-state">No file write data in this time range.</p>
    </div>`;const a=t?o:o.slice(0,6);return c`<div class="analytics-section">
    <div class="analytics-section-title">File Write Activity</div>

    ${o.length>0&&c`<div style="margin-bottom:var(--sp-6)">
      <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        Cumulative Bytes Written (${o.length} files)</div>
      <div class="analytics-charts">
        ${a.map(i=>{const r=n[i];if(!r||r.ts.length<2)return c`<div key=${i} class="diag-card">
            <div class="chart-hdr"><span class="chart-label" title=${i}>${io(i)}</span>
              <span class="chart-val text-muted">${r&&r.size_bytes.length?ge(r.size_bytes[r.size_bytes.length-1]):"-"}</span></div>
            <div class="empty-state" style="font-size:var(--fs-sm)">Single snapshot</div>
          </div>`;const d=r.size_bytes[r.size_bytes.length-1];return c`<div key=${i} class="diag-card">
            <${Xt} label=${io(i)} value=${ge(d)}
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
              <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${mr(i.ts)}</td>
              <td style="padding:var(--sp-2) var(--sp-4)" title=${i.path}>${io(i.path)}</td>
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
  </div>`}function wf(){const e=et(je),t=e==null?void 0:e.globalRange,[s,n]=U(null),[l,o]=U(!0),[a,i]=U(null);return de(()=>{o(!0),i(null);const r=(t==null?void 0:t.since)||Date.now()/1e3-86400,d=(t==null?void 0:t.until)||"",v=`/api/analytics?since=${r}${d?"&until="+d:""}`,p=new AbortController,m=setTimeout(()=>p.abort(),15e3);return ed(v,{signal:p.signal}).then(_=>{n(_),i(null)}).catch(_=>{_.name==="AbortError"?i("Request timed out"):(n(null),i(_.message))}).finally(()=>{clearTimeout(m),o(!1)}),()=>{clearTimeout(m),p.abort()}},[t==null?void 0:t.since,t==null?void 0:t.until]),c`<div class="analytics-grid">
    ${l&&c`<p class="loading-state">Loading analytics...</p>`}
    ${a&&c`<p class="error-state">Error: ${a}</p>`}
    ${!l&&!a&&c`<Fragment>
      <${bf} data=${s==null?void 0:s.response_time}/>
      <${xf} data=${s==null?void 0:s.tools}/>
      <${kf} data=${s==null?void 0:s.files}/>
      <details class="analytics-section">
        <summary class="analytics-section-title" style="cursor:pointer;user-select:none">
          Raw Metrics Explorer</summary>
        <div style="margin-top:var(--sp-4)"><${_f}/></div>
      </details>
    </Fragment>`}
  </div>`}function us(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function ac(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Sf(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"})}function ic(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function Wi(e){return e?e.replace("claude-","").replace(/-\d{8}$/,""):""}function Tf(e,t){if(!t)return"";let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{return t.slice(0,80)}if(typeof s!="object"||s===null)return String(t).slice(0,80);const n=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const o of n)if(s[o]){let a=String(s[o]);return(o==="file_path"||o==="path")&&a.length>60&&(a=".../"+a.replace(/\\/g,"/").split("/").slice(-2).join("/")),a.slice(0,100)}const l=Object.keys(s);return l.length>0?String(s[l[0]]).slice(0,80):""}const qi=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],Vi={Bash:"#1a1a1a"};function Ui(e){if(Vi[e])return Vi[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return qi[t%qi.length]}function Cf(e,t){const s=new Set,n=[],l=(o,a,i)=>{s.has(o)||(s.add(o),n.push({id:o,label:a||o,color:i||"var(--fg2)"}))};l("user","User","var(--green)"),l("tool",t||"AI Tool",Oe[t]||"var(--accent)");for(const o of e){if((o.type==="api_call"||o.type==="api_response"||o.type==="error")&&l("api","API","var(--accent)"),o.type==="tool_use"){const a=o.to||"tool";l("skill:"+a,a,Ui(a))}if(o.type==="subagent"){const a=o.to||"Subagent";l("subagent:"+a,a,Ui(a))}o.type==="hook"&&l("hook","Hooks","var(--orange)")}return n}function Mf({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:c`<div class="sf-tool-tabs">
    ${e.map(n=>c`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?Oe[n]||"var(--accent)":"transparent"};color:${Oe[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${bt[n]||"🔹"}</span> ${X(n)}
    </button>`)}
  </div>`}function Ef(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function Lf({sessions:e,activeId:t,onSelect:s,loading:n}){return n?c`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?c`<div class="sf-sess-tabs">
    ${e.map(l=>{const o=l.exact_input_tokens||l.input_tokens||0,a=l.exact_output_tokens||l.output_tokens||0,i=o+a,r=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),d=l.session_id===t,v=!l.ended_at;return c`<button key=${l.session_id}
        title=${l.session_id}
        class="sf-sess-tab ${d?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${Sf(l.started_at)}</span>
        <span class="sf-stab-sid">${Ef(l.session_id)}</span>
        <span class="sf-stab-dur">${ac(r)}</span>
        ${i>0&&c`<span class="sf-stab-tok">${z(i)}t</span>`}
        ${(l.files_modified||0)>0&&c`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${v&&c`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:c`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function Df({event:e}){if(e.type==="user_message")return e.redacted?c`<div class="sf-seq-tooltip">
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
        ${e.duration_ms>0?"Duration: "+us(e.duration_ms):""}
        ${e.ttft_ms>0?" · TTFT: "+us(e.ttft_ms):""}
      </div>
      ${e.is_error&&c`<div class="sf-tip-meta" style="color:var(--red)">Error: ${X(e.error_type||"unknown")}</div>`}
    </div>`}if(e.type==="api_response"){const t=e.tokens||{};return c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${e.model?" — "+e.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${z(t.output||0)} tokens
        ${e.duration_ms>0?" · Latency: "+us(e.duration_ms):""}
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
        ${e.duration_ms>0?" · "+us(e.duration_ms):""}
        ${e.result_size?" · Result: "+e.result_size+" bytes":""}
      </div>`}
    </div>`}return e.type==="subagent"?c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${X(e.to||"agent")}</div>
    </div>`:e.type==="hook"?c`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${X(e.hook_name||"")}</div>
    </div>`:null}function Af({event:e,participants:t,hoveredIdx:s,idx:n,onHover:l}){const o=t.findIndex(k=>k.id===e._from),a=t.findIndex(k=>k.id===e._to);if(o<0||a<0)return null;const i=a>o,r=Math.min(o,a),d=Math.max(o,a),v=s===n,p=t.find(k=>k.id===e._to),_={user_message:"var(--green)",api_call:e.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:(p==null?void 0:p.color)||"var(--cat-commands)",subagent:(p==null?void 0:p.color)||"var(--yellow)",hook:"var(--orange)"}[e.type]||"var(--fg2)";let x="",E="";if(e.type==="user_message")e.redacted?x="🔒 prompt ("+(e.prompt_length||"?")+" chars)":(x=e.preview||"(prompt)",e.prompt_length&&(E=e.prompt_length+" chars"));else if(e.type==="api_call"){const k=e.tokens||{};x=e.agent_name||Wi(e.model)||"API call",E=z((k.input||0)+(k.output||0))+"t",e.ttft_ms>0?E+=" ttft:"+us(e.ttft_ms):e.duration_ms>0&&(E+=" "+us(e.duration_ms)),e.is_error&&(E+=" ⚠")}else if(e.type==="api_response"){const k=e.tokens||{};x="← "+z(k.output||0)+"t",e.response_preview&&(x+=" "+e.response_preview.slice(0,60)),E=Wi(e.model)||"",e.finish_reason&&e.finish_reason!=="stop"&&(E+=" ["+e.finish_reason+"]")}else if(e.type==="error")x="⚠ "+(e.error_type||"error"),E=e.error_message?e.error_message.slice(0,60):"";else if(e.type==="tool_use"){const k=e.to||"tool",S=Tf(k,e.params);x=k+(S?": "+S:""),e.subtype==="result"?(E=e.success==="true"||e.success===!0?"✓":"✗",e.duration_ms>0&&(E+=" "+us(e.duration_ms)),e.result_size&&(E+=" "+e.result_size+"B")):e.subtype==="decision"&&(E=e.decision||"")}else e.type==="subagent"?x=e.to||"subagent":e.type==="hook"&&(x=e.hook_name||"hook");const T=100/t.length,y=(r+.5)*T,$=(d+.5)*T;return c`<div class="sf-seq-row ${v?"hovered":""}"
    onMouseEnter=${()=>l(n)} onMouseLeave=${()=>l(null)}>
    <!-- Token columns (left side) -->
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${e._cumTok>0?z(e._cumTok):""}</span>
      <span class="sf-seq-rttok">${e._rtTok>0?z(e._rtTok):""}</span>
    </div>
    <!-- Time -->
    <div class="sf-seq-time">${ic(e.ts)}</div>
    <!-- Arrow area -->
    <div class="sf-seq-arrow-area">
      <!-- Swimlane lines -->
      ${t.map((k,S)=>c`<div key=${S} class="sf-seq-lane"
        style="left:${(S+.5)*T}%"></div>`)}
      <!-- Arrow line -->
      <div class="sf-seq-arrow-line" style="
        left:${y}%;
        width:${$-y}%;
        border-color:${_};
      "></div>
      <!-- Arrowhead -->
      <div class="sf-seq-arrowhead" style="
        left:${i?$:y}%;
        border-${i?"left":"right"}-color:${_};
        transform:translateX(${i?"-100%":"0"});
      "></div>
      <!-- Label -->
      <div class="sf-seq-label" style="
        left:${(y+$)/2}%;
        color:${_};
      "><span class="sf-seq-label-text" title=${x}>${X(x)}</span>
        ${E&&c`<span class="sf-seq-sublabel">${E}</span>`}
      </div>
    </div>
    <!-- Hover tooltip -->
    ${v&&c`<${Df} event=${e}/>`}
  </div>`}function Of({event:e,participants:t}){100/t.length;let s="",n="var(--fg2)",l="";return e.type==="session_start"?(s="Session started",n="var(--green)",l="▶"):e.type==="session_end"?(s="Session ended",n="var(--fg3)",l="■"):e.type==="compaction"&&(s="Compaction"+(e.compaction_count?" #"+e.compaction_count:""),n="var(--orange)",l="⟳"),c`<div class="sf-seq-marker" style="border-left-color:${n}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${ic(e.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${n}">
      ${l} ${s}
      ${e.type==="compaction"&&e.duration_ms>0?" — "+us(e.duration_ms):""}
      ${e.cwd?c` <span class="text-muted text-xs mono">${X(e.cwd)}</span>`:""}
    </div>
  </div>`}function Pf({summary:e}){return!e||!e.event_count?null:c`<div class="sf-summary">
    ${e.total_turns>0&&c`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${e.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${e.total_api_calls||0}</div></div>
    ${e.total_tool_uses>0&&c`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${e.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${z(e.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${z(e.total_input_tokens)}/${z(e.total_output_tokens)}</div></div>
    ${e.compactions>0&&c`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${e.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${ac(e.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${e.event_count}</div></div>
  </div>`}function zf(){const{snap:e,globalRange:t,enabledTools:s}=et(je),[n,l]=U([]),[o,a]=U(!0),[i,r]=U(null),[d,v]=U(null),[p,m]=U(null),[_,x]=U(!1),[E,T]=U(null);de(()=>{a(!0);const P=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,b=t==null?void 0:t.until;ur(null,{since:P,until:b}).then(C=>{C.sort((D,F)=>(F.started_at||0)-(D.started_at||0)),l(C),a(!1)}).catch(()=>a(!1))},[t]);const y=P=>s===null||s.includes(P),$=n.filter(P=>y(P.tool)),k=[...new Set($.map(P=>P.tool))].sort();de(()=>{(!i&&k.length>0||i&&!k.includes(i)&&k.length>0)&&r(k[0])},[k.join(",")]);const S=$.filter(P=>P.tool===i);de(()=>{S.length>0&&(!d||!S.find(P=>P.session_id===d))&&v(S[0].session_id)},[i,S.length]),de(()=>{if(!d){m(null);return}x(!0);const P=n.find(D=>D.session_id===d),b=P!=null&&P.started_at?P.started_at-60:Date.now()/1e3-86400,C=P!=null&&P.ended_at?P.ended_at+60:Date.now()/1e3+60;Qc(d,b,C).then(D=>{m(D),x(!1)}).catch(()=>{m(null),x(!1)})},[d]);const{processedTurns:B,participants:A}=ie(()=>{const P=(p==null?void 0:p.turns)||[];if(!P.length)return{processedTurns:[],participants:[]};const b=P.map(R=>{const W={...R};return R.type==="user_message"?(W._from="user",W._to="tool"):R.type==="api_call"?(W._from=R.from||"tool",W._to="api"):R.type==="api_response"||R.type==="error"?(W._from="api",W._to="tool"):R.type==="tool_use"?(W._from="tool",W._to="skill:"+(R.to||"tool")):R.type==="subagent"?(W._from="tool",W._to="subagent:"+(R.to||"agent")):R.type==="hook"&&(W._from="tool",W._to="hook"),W});let C=0,D=0;for(const R of b){const W=R.tokens||{},Y=(W.input||0)+(W.output||0);R.type==="user_message"&&(D=0),R.type==="api_call"&&(C+=Y,D+=Y),R._cumTok=C,R._rtTok=D}const F=Cf(b,i);return{processedTurns:b,participants:F}},[p,i]),O=(p==null?void 0:p.summary)||{};return B.filter(P=>P._from&&P._to),B.filter(P=>!P._from||!P._to),c`<div class="sf-container">
    <!-- Tool tabs -->
    <${Mf} tools=${k} activeTool=${i} onSelect=${r}/>

    <!-- Session tabs -->
    <${Lf} sessions=${S} activeId=${d}
      onSelect=${v} loading=${o}/>

    <!-- Summary -->
    <${Pf} summary=${O}/>

    <!-- Sequence diagram -->
    <div class="sf-seq-container">
      ${_?c`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`:B.length===0?c`<div class="empty-state" style="padding:var(--sp-8)">
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
              ${B.map((P,b)=>P._from&&P._to?c`<${Af} key=${b} event=${P} participants=${A}
                    hoveredIdx=${E} idx=${b} onHover=${T}/>`:c`<${Of} key=${b} event=${P} participants=${A}/>`)}
            </div>
          `}
    </div>
  </div>`}const Rf={enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).",enabled:"Whether agent/agentic mode is active.",autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode allows the agent to execute tool calls without confirmation prompts. Use with caution.",autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.",skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",vimMode:"Enables Vim-style keybindings in the Gemini CLI.",approvalMode:"Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).",notifications:"Enables OS notifications for prompt alerts and session completion.",respectGeminiIgnore:"Controls whether the CLI respects patterns in .geminiignore files.",additionalIgnores:"Number of extra patterns added to the global file ignore list.",lineNumbers:"Shows line numbers in code blocks within the chat interface.",alternateScreen:"Uses the terminal alternate buffer to preserve shell scrollback history.",hideContext:"Hides the summary of attached files/context above the input prompt.",effort:"Reasoning effort level for the model (e.g., standard, high).",temperature:"Sampling temperature for model requests. 0 = deterministic; higher = more creative.",budget:"Maximum token budget for reasoning/extended thinking.",coreTools:"Number of built-in tools explicitly enabled for the agent.",excludeTools:"Number of tools explicitly disabled for safety or cost control.",customAgents:"Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks.",webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."};function Ff(e){return Rf[e]||""}function If({v:e}){return e===!0?c`<span style="color:var(--green);font-weight:600">on</span>`:e===!1?c`<span style="color:var(--red);opacity:0.8">off</span>`:e==null||e===""?c`<span class="text-muted">—</span>`:typeof e=="object"?c`<span class="mono" style="font-size:var(--fs-xs)">${JSON.stringify(e)}</span>`:c`<span class="mono">${String(e)}</span>`}function tn({k:e,v:t,indent:s}){const n=e.replace(/([A-Z])/g," $1").replace(/^./,o=>o.toUpperCase()),l=Ff(e);return c`<div
    title=${l}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${s?"var(--sp-6)":"var(--sp-4)"};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${l?"help":"default"}">
    <span style="color:var(--fg2)">${n}${l?c`<span style="color:var(--fg3);margin-left:3px;font-size:0.6em">?</span>`:""}</span>
    <${If} v=${t}/>
  </div>`}function rc({otel:e}){if(!e||!e.enabled&&!e.source)return null;const t=e.enabled;return c`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:${t?"var(--green)":"var(--fg3)"};padding:var(--sp-2) var(--sp-4) var(--sp-1)">
      OpenTelemetry ${t?"● on":"○ off"}
    </div>
    <div style="border:1px solid ${t?"var(--green)":"var(--bg2)"};border-radius:4px;overflow:hidden;
                background:${t?"color-mix(in srgb,var(--green) 4%,transparent)":"transparent"}">
      ${t&&c`<${tn} k="exporter" v=${e.exporter||"—"}/>`}
      ${e.endpoint&&c`<${tn} k="endpoint" v=${e.endpoint}/>`}
      ${e.file_path&&c`<${tn} k="file_path" v=${e.file_path}/>`}
      ${e.capture_content!==void 0&&c`<${tn} k="capture_content" v=${!!e.capture_content}/>`}
      ${!t&&e.source&&c`<${tn} k="source" v=${e.source}/>`}
    </div>
  </div>`}function Do({name:e,items:t}){const s=Object.entries(t);return s.length?c`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${e}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${s.map(([n,l])=>c`<${tn} key=${n} k=${n} v=${l}/>`)}
    </div>
  </div>`:null}function Nf({cfg:e,label:t}){var i,r;const s=bt[e.tool]||"🔹",n=Oe[e.tool]||"var(--fg2)",l=Object.entries(e.feature_groups||{}),o=Object.entries(e.settings||{}).filter(([d])=>!["agent_historySummarizationMode","agent_maxRequests","debug_requestLoggerMaxEntries","planModel","implementModel"].includes(d));return((i=e.otel)==null?void 0:i.enabled)||((r=e.otel)==null?void 0:r.source)||l.length||o.length||(e.hints||[]).length||(e.mcp_servers||[]).length||(e.extensions||[]).length?c`<div style="background:var(--bg);border:2px solid ${n};border-radius:6px;overflow:hidden;
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
      <${rc} otel=${e.otel}/>
      ${l.map(([d,v])=>c`<${Do} key=${d} name=${d} items=${v}/>`)}
      ${o.length>0&&c`<${Do} name="Settings" items=${Object.fromEntries(o)}/>`}
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
  </div>`:null}function jf({cfg:e}){var o,a,i,r;if(!e)return null;const t=Object.entries(e.feature_groups||{});if(!t.length&&!((o=e.otel)!=null&&o.enabled)&&!((a=e.otel)!=null&&a.source))return null;const n=(((i=e.feature_groups)==null?void 0:i.Safety)||{}).globalAutoApprove===!0,l=(((r=e.feature_groups)==null?void 0:r.Agent)||{}).autoReply===!0;return c`<div style="background:var(--bg);border:2px solid #007acc;border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,#007acc 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid #007acc">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:#007acc">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${n&&c`<span class="badge" style="margin-left:auto;background:var(--red);color:#fff;font-weight:700">⚠ YOLO MODE ON</span>`}
      ${!n&&l&&c`<span class="badge" style="margin-left:auto;background:var(--orange);color:#fff">⚠ auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${rc} otel=${e.otel}/>
      ${t.map(([d,v])=>c`<${Do} key=${d} name=${d} items=${v}/>`)}
    </div>
  </div>`}function Bf({snap:e}){var l,o,a;const t=Oe.aictl||"#94a3b8",s=Object.entries(((l=e==null?void 0:e.live_monitor)==null?void 0:l.diagnostics)||{}),n=[...((o=e==null?void 0:e.live_monitor)==null?void 0:o.workspace_paths)||[],...((a=e==null?void 0:e.live_monitor)==null?void 0:a.state_paths)||[]];return!s.length&&!n.length?null:c`<div style="background:var(--bg);border:2px solid ${t};border-radius:6px;overflow:hidden;
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
  </div>`}function Hf(){const{snap:e}=et(je),t=ie(()=>e!=null&&e.tool_configs?e.tool_configs:[],[e]),s=ie(()=>{const o={};return((e==null?void 0:e.tools)||[]).forEach(a=>{o[a.tool]=a.label}),o},[e]);if(!e)return c`<p class="loading-state">Loading...</p>`;if(!t.length)return c`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const n=t.find(o=>o.tool==="vscode"),l=t.filter(o=>o.tool!=="vscode");return c`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${n&&c`<${jf} cfg=${n}/>`}
    ${l.map(o=>c`<${Nf} key=${o.tool} cfg=${o} label=${s[o.tool]||o.tool}/>`)}
    <${Bf} snap=${e}/>
  </div>`}const Yn={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},Wf=["project","global","shadow","session","external"],Kn=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function qf(e,t){const s=Cs(e),n=Cs(t);if(!s)return"(unknown)";if(n&&s.startsWith(n+"/")){const l=s.slice(n.length+1).split("/")[0];return l.startsWith(".")?"(root)":l}return s.includes("/.claude/projects/")?"(shadow)":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")?"(global)":"(other)"}function Vf(e){if(!e)return"unknown";const t=Cs(e).split("/"),s=t.pop()||"unknown",n=s.lastIndexOf("."),l=n>0?s.slice(0,n):s;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test(l)){const o=t.pop();if(o)return o}return l}function Uf(){const{snap:e}=et(je),[t,s]=U(null),n=ie(()=>{if(!e)return null;const o=e.tools.filter(T=>T.tool!=="aictl"&&T.tool!=="any");if(!o.length)return null;const a=e.root||"",i={},r={},d={},v={yes:0,"on-demand":0,conditional:0,no:0};let p=0;for(const T of o)for(const y of T.files){const $=y.kind||"other",k=y.scope||"external",S=(y.sent_to_llm||"no").toLowerCase(),B=y.tokens||0,A=qf(y.path,a),O=Vf(y.path);i[$]||(i[$]={tokens:0,files:0,projects:{}}),i[$].tokens+=B,i[$].files+=1,i[$].projects[A]||(i[$].projects[A]={tokens:0,count:0}),i[$].projects[A].tokens+=B,i[$].projects[A].count+=1,d[A]||(d[A]={tokens:0,count:0,cats:{}}),d[A].tokens+=B,d[A].count+=1,d[A].cats[$]||(d[A].cats[$]={tokens:0,count:0,items:{}}),d[A].cats[$].tokens+=B,d[A].cats[$].count+=1,d[A].cats[$].items[O]||(d[A].cats[$].items[O]=0),d[A].cats[$].items[O]+=B,r[k]||(r[k]={tokens:0,files:0}),r[k].tokens+=B,r[k].files+=1,v[S]!==void 0?v[S]+=B:v.no+=B,p+=B}const m=Object.entries(i).sort((T,y)=>y[1].tokens-T[1].tokens),_=Wf.filter(T=>r[T]).map(T=>[T,r[T]]),x=Object.entries(d).sort((T,y)=>y[1].tokens-T[1].tokens),E=o.map(T=>({tool:T.tool,label:T.label,tokens:T.files.reduce((y,$)=>y+$.tokens,0),files:T.files.length,sentYes:T.files.filter(y=>(y.sent_to_llm||"").toLowerCase()==="yes").reduce((y,$)=>y+$.tokens,0)})).filter(T=>T.tokens>0).sort((T,y)=>y.tokens-T.tokens).slice(0,8);return{cats:m,scopes:_,byPolicy:v,totalTokens:p,perTool:E,byCat:i,byProj:d,projList:x}},[e]);if(!n)return c`<p class="empty-state">No file data available.</p>`;if(!n.totalTokens)return c`<p class="empty-state">No token data collected yet.</p>`;const l=Math.max(...n.cats.map(([,o])=>o.tokens),1);return c`<div class="diag-card" role="region" aria-label="Context window map">
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
        ${n.cats.map(([o,a])=>{const i=a.tokens/n.totalTokens*100;return i<.5?null:c`<div key=${o} style="width:${i}%;background:${Yn[o]||"var(--fg2)"};
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
          <span class="text-bold text-right" style="width:80px;color:${Yn[o]||"var(--fg2)"};flex-shrink:0">${o}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${r}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${i.map(([d,v],p)=>{const m=a.tokens>0?v.tokens/a.tokens*100:0;if(m<.5)return null;const _=!t||t===d;return c`<div key=${d} style="width:${m}%;height:100%;
                  background:${Yn[o]||"var(--fg2)"};
                  opacity:${_?Math.max(.3,1-p*.12):.12};
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
        ${a.map(([r,d])=>{const v=Object.entries(d.items).sort((x,E)=>E[1]-x[1]),p=v.slice(0,15),m=v.slice(15).reduce((x,[,E])=>x+E,0);m>0&&p.push(["(other)",m]);const _=d.tokens/i*100;return c`<div key=${r} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${Yn[r]||"var(--fg2)"};flex-shrink:0">${r}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${_}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${p.map(([x,E],T)=>{const y=d.tokens>0?E/d.tokens*100:0;if(y<.3)return null;const $=Kn[T%Kn.length];return c`<div key=${x} style="width:${y}%;height:100%;background:${$};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${x}: ${z(E)} tok">
                      ${y>10&&_>20?c`<span style="font-size:9px;color:#111;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:700">${x}</span>`:null}
                    </div>`})}
                </div>
              </div>
              <span class="text-right text-muted" style="min-width:55px">${z(d.tokens)} tok</span>
              <span class="text-right text-muted" style="min-width:30px">${d.count}f</span>
            </div>
            <!-- Item legend -->
            <div style="padding-left:88px;display:flex;flex-wrap:wrap;gap:var(--sp-1) var(--sp-3);margin-top:3px">
              ${p.map(([x,E],T)=>c`<span key=${x}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${Kn[T%Kn.length]};flex-shrink:0"></span>
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
          <span><span style="color:${Oe[o.tool]||"var(--fg2)"}">${bt[o.tool]||"🔹"}</span> ${X(o.label)}</span>
          <span class="text-muted">${z(o.sentYes)} sent \u00B7 ${z(o.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}const Gf={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"};function Yf(e){if(!e||e<0)return"—";const t=Math.floor(e/3600),s=Math.floor(e%3600/60);return t>0?`${t}h ${s}m`:`${s}m`}function Kf(){var m,_,x,E,T;const{snap:e}=et(je),[t,s]=U(null),[n,l]=U(null);de(()=>{let y=!0;const $=()=>{pr().then(S=>{y&&s(S)}).catch(()=>{}),rd().then(S=>{y&&l(S)}).catch(()=>{})};$();const k=setInterval($,15e3);return()=>{y=!1,clearInterval(k)}},[]);const o=ie(()=>{if(!e)return[];const y=e.tool_telemetry||[];return e.tools.filter($=>$.tool!=="aictl"&&$.tool!=="any").map($=>{var P,b,C,D,F;const k=y.find(R=>R.tool===$.tool),S=$.live||{},B=S.last_seen_at||0,A=B>0?Math.floor(Date.now()/1e3-B):-1,O=A>3600||A<0;return{tool:$.tool,label:$.label,source:(k==null?void 0:k.source)||(S.session_count?"live-monitor":"discovery"),confidence:(k==null?void 0:k.confidence)||((P=S.token_estimate)==null?void 0:P.confidence)||0,inputTokens:(k==null?void 0:k.input_tokens)||0,outputTokens:(k==null?void 0:k.output_tokens)||0,cost:(k==null?void 0:k.cost_usd)||0,sessions:(k==null?void 0:k.total_sessions)||S.session_count||0,errors:((b=k==null?void 0:k.errors)==null?void 0:b.length)||0,lastError:((C=k==null?void 0:k.errors)==null?void 0:C[0])||null,lastSeen:A,stale:O,fileCount:$.files.length,procCount:$.processes.length,hasLive:!!$.live,hasOtel:!!((F=(D=S.sources||[]).includes)!=null&&F.call(D,"otel"))}}).sort(($,k)=>k.inputTokens+k.outputTokens-($.inputTokens+$.outputTokens))},[e]),a=ie(()=>{var y;return(y=e==null?void 0:e.live_monitor)!=null&&y.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([$,k])=>({name:$,status:k.status||"unknown",mode:k.mode||"",detail:k.detail||""})):[]},[e]);if(!e)return null;const i=o.length,r=o.filter(y=>y.inputTokens+y.outputTokens>0).length,d=o.filter(y=>y.hasLive).length,v=o.filter(y=>y.stale&&y.hasLive).length,p=o.reduce((y,$)=>y+$.errors,0);return c`<div class="diag-card" role="region" aria-label="Collector health">
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
          <div class="metric-chip-value">${Yf(n.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${n.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${z((((_=n.db)==null?void 0:_.metrics_count)||0)+(((x=n.db)==null?void 0:x.tool_metrics_count)||0)+(((E=n.db)==null?void 0:E.events_count)||0)+(((T=n.db)==null?void 0:T.samples_count)||0))}</div>
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
        ${t.last_receive_at>0?c`<span class="text-muted">Last: ${Nt(t.last_receive_at)}</span>`:null}
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
              <span style="color:${Oe[y.tool]||"var(--fg2)"}">${bt[y.tool]||"🔹"}</span>
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
              ${y.lastSeen>=0?c`<span style="color:${y.stale?"var(--orange)":"var(--fg2)"}">${Nt(Date.now()/1e3-y.lastSeen)}</span>`:c`<span class="text-muted">\u2014</span>`}</td>
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
            border-left:3px solid ${Gf[y.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${y.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${y.status}</span>
          </div>
          ${y.detail?c`<div class="text-xs text-muted" style="margin-top:2px">${X(y.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let ro=null;function Jf(){return ro?Promise.resolve(ro):cd().then(e=>{const t={};for(const s of e||[])t[s.key]=s;return ro=t,t}).catch(()=>({}))}function Qf(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),s=t.match(/^[^.!?]+[.!?]/);return s?s[0].trim():t.slice(0,120)}const Zf={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},Xf={raw:"raw",deduced:"deduced",aggregated:"agg"};function ev(){const[e,t]=U(null),[s,n]=U({x:0,y:0}),[l,o]=U(!1),a=ot(null),i=ot(null),r=Ve(T=>{const y=T.getAttribute("data-dp");y&&Jf().then($=>{const k=$[y];if(!k)return;const S=T.getBoundingClientRect();n({x:S.left,y:S.bottom+4}),t(k),o(!1)})},[]),d=Ve(()=>{i.current=setTimeout(()=>{t(null),o(!1)},120)},[]),v=Ve(()=>{i.current&&(clearTimeout(i.current),i.current=null)},[]);if(de(()=>{function T(k){const S=k.target.closest("[data-dp]");S&&(v(),r(S))}function y(k){k.target.closest("[data-dp]")&&d()}function $(k){k.target.closest("[data-dp]")&&e&&(k.preventDefault(),o(B=>!B))}return document.addEventListener("mouseover",T,!0),document.addEventListener("mouseout",y,!0),document.addEventListener("click",$,!0),()=>{document.removeEventListener("mouseover",T,!0),document.removeEventListener("mouseout",y,!0),document.removeEventListener("click",$,!0)}},[r,d,v,e]),!e)return null;const m=Math.min(s.x,window.innerWidth-320-8),_=Math.min(s.y,window.innerHeight-180),x=Xf[e.source_type]||e.source_type,E=Zf[e.unit]||e.unit;return c`<div class="dp-tooltip" ref=${a}
    style=${"left:"+m+"px;top:"+_+"px"}
    onMouseEnter=${v} onMouseLeave=${d}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${x}</span>
      ${E&&c`<span class="dp-tooltip-unit">${E}</span>`}
    </div>
    <div class="dp-tooltip-body">${Qf(e.explanation)}</div>
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
  </div>`}function Zs(e,t){try{localStorage.setItem("aictl-pref-"+e,JSON.stringify(t))}catch{}}function co(e,t){try{const s=localStorage.getItem("aictl-pref-"+e);return s!=null?JSON.parse(s):t}catch{return t}}function Jn(e){const t=new Date(e*1e3),s=t.getTimezoneOffset();return new Date(t.getTime()-s*6e4).toISOString().slice(0,16)}const Ao=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],dl={};Ao.forEach(e=>{dl[e.id]=e.seconds});const tv={snap:null,history:null,connected:!1,activeTab:co("active_tab","overview"),globalRange:(()=>{const e=co("range","live"),t=dl[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:co("tool_filter",null)};function sv(e,t){switch(t.type){case"SSE_UPDATE":{const s=t.payload,n=e.snap?Td(e.snap,s):s,l=Cd(e.history,s);return{...e,snap:n,history:l,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const uo=Xs.tabs;function nv({globalRange:e,onPreset:t,onApplyCustom:s}){const[n,l]=U(!1),o=ot(null),a=ot(null),i=Ve(()=>{l(!0),requestAnimationFrame(()=>{if(o.current&&a.current)if(e.until!=null)o.current.value=Jn(e.since),a.current.value=Jn(e.until);else{const d=Ao.find(m=>m.id===e.id),v=Date.now()/1e3,p=(d==null?void 0:d.seconds)||86400;o.current.value=Jn(v-p),a.current.value=Jn(v)}})},[e]),r=Ve(()=>{var E,T;const d=(E=o.current)==null?void 0:E.value,v=(T=a.current)==null?void 0:T.value;if(!d||!v)return;const p=new Date(d).getTime(),m=new Date(v).getTime();if(!Number.isFinite(p)||!Number.isFinite(m))return;const _=p/1e3,x=m/1e3;x<=_||(s(_,x),l(!1))},[s]);return c`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${Ao.map(d=>c`<button key=${d.id}
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
  </div>`}const sl=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-jetbrains","copilot-vs","copilot365","codex-cli","gemini","gemini-cli"]);function lv({snap:e,enabledTools:t,onToggle:s,onSetAll:n}){if(!e)return null;const l=e.tools.filter(a=>!a.meta);if(!l.length)return null;const o=t===null;return t?t.length:l.length,c`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${o}
        onChange=${()=>n(o?[]:null)} />
      <span class="text-muted">All (${l.length})</span>
    </label>
    ${l.sort((a,i)=>a.label.localeCompare(i.label)).map(a=>{const i=sl.has(a.tool),r=t===null||t.includes(a.tool),d=Oe[a.tool]||"var(--fg2)",v=bt[a.tool]||"🔹";return c`<label key=${a.tool} class=${"tool-filter-item"+(i?"":" tool-unverified")}
        title=${i?"":"Not yet verified — discovery only"}>
        <input type="checkbox" checked=${r} disabled=${!i}
          onChange=${()=>i&&s(a.tool)} />
        <span style=${"color:"+d}>${v}</span>
        <span>${a.label}</span>
      </label>`})}
  </div>`}function ov({mcpDetail:e}){return!e||!e.length?c`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`:c`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{t.status;const s=fd[t.status]||"var(--fg3)",n=Oe[t.tool]||"var(--fg3)";return c`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${s}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${X(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${n};white-space:nowrap;flex-shrink:0">${X(t.tool)}</span>
      </div>`})}
  </div>`}function av({label:e,value:t,mcpDetail:s}){const[n,l]=U(!1);return c`<div style="position:relative;cursor:default"
    onMouseEnter=${()=>l(!0)}
    onMouseLeave=${()=>l(!1)}>
    <${Co} label=${e} value=${t} sm=${!0}/>
    ${n&&c`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      ${s.length>0?c`<${ov} mcpDetail=${s}/>`:c`<div style="color:var(--fg3);font-size:var(--fs-sm)">None configured</div>`}
    </div>`}
  </div>`}function iv({snap:e,history:t,globalRange:s}){const[n,l]=U(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),o=Ve(()=>{l(d=>{const v=!d;try{localStorage.setItem("aictl-header-expanded",String(v))}catch{}return v})},[]),a=d=>!t||!t.ts||t.ts.length<2?null:[t.ts,t[d]],i=(e==null?void 0:e.cpu_cores)||1,r={cores:i};return c`
    <div style=${"display:grid;grid-template-columns:repeat("+Xs.sparklines.length+",1fr);gap:var(--sp-4);margin-bottom:var(--sp-4)"}>
      ${Xs.sparklines.map(d=>{const v=e?e["total_"+d.field]??e[d.field]??"":"",p=Ql(v,d.format,d.suffix,d.multiply),m=d.yMaxExpr?Va(d.yMaxExpr,r):void 0,_=(d.refLines||[]).map(x=>({value:Va(x.valueExpr,r),label:(x.label||"").replace("{cores}",i)})).filter(x=>x.value!=null);return c`<${Xt} key=${d.field} label=${d.label} value=${p}
          data=${a(d.field)} chartColor=${d.color||"var(--accent)"}
          smooth=${!!d.smooth} refLines=${_.length?_:void 0} yMax=${m} dp=${d.dp}/>`})}
    </div>

    <div class=${n?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>

      <!-- Row 1: (CPU bars + Live traffic) | Live metric boxes -->
      <div class="mb-sm" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);align-items:start">
        <!-- Left: per-core CPU bars + live traffic bar -->
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${Pp} perCore=${(e==null?void 0:e.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${Pi} snap=${e} mode="traffic"/></div>
        </div>
        <!-- Right: 4 live metric boxes in 2×2 grid -->
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${Xs.liveMetrics.map(d=>{const v=e?e[d.field]??"":"",p=Ql(v,d.format,d.suffix,d.multiply);return c`<${Co} key=${d.field} label=${d.label} value=${p} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>

      <!-- Row 2: Inventory — full width; MCP box shows hover popover -->
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div style="display:grid;grid-template-columns:repeat(${Xs.inventory.length},1fr);gap:var(--sp-2)">
          ${Xs.inventory.map(d=>{const v=e?e[d.field]??"":"",p=Ql(v,d.format,d.suffix,d.multiply);return d.field==="total_mcp_servers"?c`<${av} key=${d.field} label=${d.label} value=${p} mcpDetail=${(e==null?void 0:e.mcp_detail)||[]}/>`:c`<${Co} key=${d.field} label=${d.label} value=${p} accent=${!!d.accent} dp=${d.dp} sm=${!0}/>`})}
        </div>
      </div>

      <!-- Row 3: CSV footprint — full width -->
      <div class="mb-sm"><${Pi} snap=${e} mode="files"/></div>

    </div>
    <button class="header-toggle" onClick=${o} aria-label="Toggle details">
      ${n?"▲ less":"▼ more"}
    </button>
  `}function rv(){var ne;const[e,t]=ir(sv,tv),{snap:s,history:n,connected:l,activeTab:o,globalRange:a,searchQuery:i,theme:r,viewerPath:d,events:v,enabledTools:p}=e,[m,_]=U(null),x=ot(null);de(()=>{document.documentElement.setAttribute("data-theme",r);try{localStorage.setItem("aictl-theme",r)}catch{}},[r]);const E=Ve(()=>{t({type:"SET_THEME",payload:Kl[(Kl.indexOf(r)+1)%Kl.length]})},[r]),T=Ve(L=>{const j=L.since,q=L.until;L.id==="live"?_(null):L.id!=="custom"?Mn({range:L.id}).then(_).catch(()=>{}):Mn({since:j,until:q}).then(_).catch(()=>{}),Fo({since:j,until:q}).then(V=>t({type:"EVENTS_INIT",payload:V})).catch(()=>{})},[]);de(()=>{let L,j=1e3,q=!1,V=!1;Ha().then(G=>t({type:"SNAP_REPLACE",payload:G})).catch(()=>{}),Mn().then(G=>t({type:"HISTORY_INIT",payload:G})).catch(()=>{}),T(a);function le(){q||(L=new EventSource(dd()),L.onmessage=G=>{const Le=JSON.parse(G.data);t({type:"SSE_UPDATE",payload:Le}),j=1e3},L.onerror=()=>{t({type:"SET_CONNECTED",payload:!1}),L.close(),q||setTimeout(le,j),j=Math.min(j*2,3e4)})}le();const oe=setInterval(()=>{q||V||(V=!0,Ha().then(G=>t({type:"SNAP_REPLACE",payload:G})).catch(()=>{}).finally(()=>{V=!1}))},3e4);return()=>{q=!0,L&&L.close(),clearInterval(oe)}},[]);const y=Ve(L=>{const j=dl[L]||3600,q={id:L,since:Date.now()/1e3-j,until:null};t({type:"SET_RANGE",payload:q}),Zs("range",L),T(q)},[T]),$=Ve((L,j)=>{const q={id:"custom",since:L,until:j};t({type:"SET_RANGE",payload:q}),T(q)},[T]),k=a.id==="live"?n:m||n,S=a.until?a.until-a.since:dl[a.id]||3600;de(()=>{const L=j=>{var q;if(j.key==="Escape"&&t({type:"SET_VIEWER",payload:null}),j.key==="/"&&document.activeElement!==x.current&&(j.preventDefault(),(q=x.current)==null||q.focus()),document.activeElement!==x.current){const V=uo.find(le=>le.key===j.key);V&&(t({type:"SET_TAB",payload:V.id}),Zs("active_tab",V.id))}};return document.addEventListener("keydown",L),()=>document.removeEventListener("keydown",L)},[]);const B=Ve(L=>t({type:"SET_VIEWER",payload:L}),[]),A=Ve(L=>{if(!sl.has(L))return;const j=s?s.tools.filter(V=>V.tool!=="aictl"&&V.tool!=="any"&&sl.has(V.tool)).map(V=>V.tool):[];let q;p===null?q=j.filter(V=>V!==L):p.indexOf(L)>=0?q=p.filter(le=>le!==L):(q=[...p,L],q.length>=j.length&&(q=null)),t({type:"SET_TOOL_FILTER",payload:q}),Zs("tool_filter",q)},[s,p]),O=Ve(L=>{t({type:"SET_TOOL_FILTER",payload:L}),Zs("tool_filter",L)},[]),P=ie(()=>{if(!s)return s;let L=s.tools;if(L=L.filter(j=>sl.has(j.tool)||j.tool==="aictl"),p!==null&&(L=L.filter(j=>p.includes(j.tool)||j.tool==="aictl")),i){const j=i.toLowerCase();L=L.filter(q=>q.label.toLowerCase().includes(j)||q.tool.toLowerCase().includes(j)||q.vendor&&q.vendor.toLowerCase().includes(j)||q.files.some(V=>V.path.toLowerCase().includes(j))||q.processes.some(V=>(V.name||"").toLowerCase().includes(j)||(V.cmdline||"").toLowerCase().includes(j))||q.live&&((q.live.workspaces||[]).some(V=>V.toLowerCase().includes(j))||(q.live.sources||[]).some(V=>V.toLowerCase().includes(j))))}return{...s,tools:L}},[s,i,p]),b=ie(()=>{var q;const L=Date.now()/1e3-300,j=new Map;for(const V of v)if(V.kind==="file_modified"&&V.ts>=L&&((q=V.detail)!=null&&q.path)){const le=j.get(V.detail.path);(!le||V.ts>le.ts)&&j.set(V.detail.path,{ts:V.ts,growth:V.detail.growth_bytes||0,tool:V.tool})}return j},[v]),C=ie(()=>({snap:P,history:n,openViewer:B,recentFiles:b,globalRange:a,rangeSeconds:S,enabledTools:p}),[P,n,B,b,a,S,p]),D={overview:()=>c`
      <${iv} snap=${P} history=${k}
        globalRange=${a}/>
      <div class="mb-lg"><${Kf}/></div>
    `,procs:()=>c`
      <div class="mb-lg"><${Op}/></div>
    `,memory:()=>c`
      <div class="mb-lg"><${Uf}/></div>
      <div class="mb-lg"><${Np}/></div>
    `,live:()=>c`<div class="mb-lg"><${jp}/></div>`,events:()=>c`<div class="mb-lg"><${Bp} key=${"events-"+o}/></div>`,budget:()=>c`<div class="mb-lg"><${Hp} key=${"budget-"+o}/></div>`,sessions:()=>c`<div class="mb-lg"><${pf} key=${"sessions-"+o}/></div>`,analytics:()=>c`<div class="mb-lg"><${wf} key=${"analytics-"+o}/></div>`,flow:()=>c`<div class="mb-lg"><${zf} key=${"flow-"+o}/></div>`,config:()=>c`<div class="mb-lg"><${Hf}/></div>`},F=Ve(L=>{t({type:"SET_TAB",payload:L}),Zs("active_tab",L)},[]);Ve(L=>{t({type:"SET_TAB",payload:"sessions"}),Zs("active_tab","sessions"),window.__aictl_selected_session=L.session_id,window.dispatchEvent(new CustomEvent("aictl-session-select",{detail:L}))},[]);const[R,W]=U(!1);de(()=>{let L=!0;const j=()=>pr().then(V=>{L&&W(V.active||!1)}).catch(()=>{L&&W(!1)});j();const q=setInterval(j,3e4);return()=>{L=!1,clearInterval(q)}},[]);const Y=ie(()=>{if(!s)return[];const L=[];let j=0,q=0,V=0,le=0;for(const oe of s.tools||[])for(const G of oe.processes||[]){const Le=parseFloat(G.mem_mb)||0,Re=(G.process_type||"").toLowerCase();(Re==="subagent"||Re==="agent")&&(j+=Le),Re==="mcp-server"&&G.zombie_risk&&G.zombie_risk!=="none"&&q++,(Re==="browser"||(G.name||"").toLowerCase().includes("headless"))&&V++,G.anomalies&&G.anomalies.length&&(le+=G.anomalies.length)}return j>2048&&L.push({level:"red",msg:`Subagent memory: ${ge(j*1048576)} (>2GB) — consider cleanup`}),q>0&&L.push({level:"orange",msg:`${q} MCP server(s) with dead parent — may be orphaned`}),V>0&&L.push({level:"yellow",msg:`${V} headless browser process(es) detected — check for leaks`}),le>5&&L.push({level:"orange",msg:`${le} process anomalies detected`}),L},[s]);return c`<${je.Provider} value=${C}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${x} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${i} onInput=${L=>t({type:"SET_SEARCH",payload:L.target.value})}/>
          <button class="theme-btn" onClick=${E} aria-label="Toggle theme: ${r}"
            title="Theme: ${r}">${vd[r]}</button>
          ${R&&c`<span class="conn ok" title="OTel receiver active — Claude Code pushing telemetry">OTel</span>`}
          <span class=${"conn "+(l?"ok":"err")} role="status" aria-live="polite">${l?"live":"reconnecting..."}<span class="sr-only">${l?" — connected to server":" — connection lost, attempting to reconnect"}</span></span>
        </div>
      </header>
      ${Y.length>0&&c`<div class="alert-banner" role="alert">
        ${Y.map((L,j)=>c`<div key=${j} class="alert-item" style="color:var(--${L.level})">
          \u26A0 ${L.msg}
        </div>`)}
      </div>`}
      <${nv} globalRange=${a} onPreset=${y} onApplyCustom=${$}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${uo.map(L=>c`<button key=${L.id} class="tab-btn" role="tab"
            aria-selected=${o===L.id} onClick=${()=>F(L.id)}
            title="Shortcut: ${L.key}">${L.icon?L.icon+" ":""}${L.label}</button>`)}
        </nav>
        <${lv} snap=${s} enabledTools=${p}
          onToggle=${A} onSetAll=${O}/>
        <div id="main-content" role="tabpanel" aria-label=${(ne=uo.find(L=>L.id===o))==null?void 0:ne.label}>
          ${D[o]?D[o]():c`<p class="text-muted">Unknown tab "${o}"</p>`}
        </div>
      </main>
    </div>
    <${Sp} path=${d} onClose=${()=>t({type:"SET_VIEWER",payload:null})}/>
    <${ev}/>
  </${je.Provider}>`}Vc(c`<${rv}/>`,document.getElementById("app"));
