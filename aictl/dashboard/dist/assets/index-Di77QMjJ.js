(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))n(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function s(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(l){if(l.ep)return;l.ep=!0;const o=s(l);fetch(l.href,o)}})();var rl,Ce,Fi,as,ka,Ii,ji,Ni,Co,oo,ao,Bi,el={},tl=[],wc=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,cl=Array.isArray;function Qt(e,t){for(var s in t)e[s]=t[s];return e}function Eo(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function Hi(e,t,s){var n,l,o,a={};for(o in t)o=="key"?n=t[o]:o=="ref"?l=t[o]:a[o]=t[o];if(arguments.length>2&&(a.children=arguments.length>3?rl.call(arguments,2):s),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)a[o]===void 0&&(a[o]=e.defaultProps[o]);return Yn(e,a,n,l,null)}function Yn(e,t,s,n,l){var o={type:e,props:t,key:s,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:l??++Fi,__i:-1,__u:0};return l==null&&Ce.vnode!=null&&Ce.vnode(o),o}function dl(e){return e.children}function Kn(e,t){this.props=e,this.context=t}function sn(e,t){if(t==null)return e.__?sn(e.__,e.__i+1):null;for(var s;t<e.__k.length;t++)if((s=e.__k[t])!=null&&s.__e!=null)return s.__e;return typeof e.type=="function"?sn(e):null}function Sc(e){if(e.__P&&e.__d){var t=e.__v,s=t.__e,n=[],l=[],o=Qt({},t);o.__v=t.__v+1,Ce.vnode&&Ce.vnode(o),Mo(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[s]:null,n,s??sn(t),!!(32&t.__u),l),o.__v=t.__v,o.__.__k[o.__i]=o,qi(n,o,l),t.__e=t.__=null,o.__e!=s&&Wi(o)}}function Wi(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),Wi(e)}function io(e){(!e.__d&&(e.__d=!0)&&as.push(e)&&!sl.__r++||ka!=Ce.debounceRendering)&&((ka=Ce.debounceRendering)||Ii)(sl)}function sl(){try{for(var e,t=1;as.length;)as.length>t&&as.sort(ji),e=as.shift(),t=as.length,Sc(e)}finally{as.length=sl.__r=0}}function Vi(e,t,s,n,l,o,a,i,r,c,v){var p,h,b,S,D,T,y,$=n&&n.__k||tl,k=t.length;for(r=Tc(s,t,$,r,k),p=0;p<k;p++)(b=s.__k[p])!=null&&(h=b.__i!=-1&&$[b.__i]||el,b.__i=p,T=Mo(e,b,h,l,o,a,i,r,c,v),S=b.__e,b.ref&&h.ref!=b.ref&&(h.ref&&Lo(h.ref,null,b),v.push(b.ref,b.__c||S,b)),D==null&&S!=null&&(D=S),(y=!!(4&b.__u))||h.__k===b.__k?r=Ui(b,r,e,y):typeof b.type=="function"&&T!==void 0?r=T:S&&(r=S.nextSibling),b.__u&=-7);return s.__e=D,r}function Tc(e,t,s,n,l){var o,a,i,r,c,v=s.length,p=v,h=0;for(e.__k=new Array(l),o=0;o<l;o++)(a=t[o])!=null&&typeof a!="boolean"&&typeof a!="function"?(typeof a=="string"||typeof a=="number"||typeof a=="bigint"||a.constructor==String?a=e.__k[o]=Yn(null,a,null,null,null):cl(a)?a=e.__k[o]=Yn(dl,{children:a},null,null,null):a.constructor===void 0&&a.__b>0?a=e.__k[o]=Yn(a.type,a.props,a.key,a.ref?a.ref:null,a.__v):e.__k[o]=a,r=o+h,a.__=e,a.__b=e.__b+1,i=null,(c=a.__i=Cc(a,s,r,p))!=-1&&(p--,(i=s[c])&&(i.__u|=2)),i==null||i.__v==null?(c==-1&&(l>v?h--:l<v&&h++),typeof a.type!="function"&&(a.__u|=4)):c!=r&&(c==r-1?h--:c==r+1?h++:(c>r?h--:h++,a.__u|=4))):e.__k[o]=null;if(p)for(o=0;o<v;o++)(i=s[o])!=null&&!(2&i.__u)&&(i.__e==n&&(n=sn(i)),Yi(i,i));return n}function Ui(e,t,s,n){var l,o;if(typeof e.type=="function"){for(l=e.__k,o=0;l&&o<l.length;o++)l[o]&&(l[o].__=e,t=Ui(l[o],t,s,n));return t}e.__e!=t&&(n&&(t&&e.type&&!t.parentNode&&(t=sn(e)),s.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function Cc(e,t,s,n){var l,o,a,i=e.key,r=e.type,c=t[s],v=c!=null&&(2&c.__u)==0;if(c===null&&i==null||v&&i==c.key&&r==c.type)return s;if(n>(v?1:0)){for(l=s-1,o=s+1;l>=0||o<t.length;)if((c=t[a=l>=0?l--:o++])!=null&&!(2&c.__u)&&i==c.key&&r==c.type)return a}return-1}function wa(e,t,s){t[0]=="-"?e.setProperty(t,s??""):e[t]=s==null?"":typeof s!="number"||wc.test(t)?s:s+"px"}function Nn(e,t,s,n,l){var o,a;e:if(t=="style")if(typeof s=="string")e.style.cssText=s;else{if(typeof n=="string"&&(e.style.cssText=n=""),n)for(t in n)s&&t in s||wa(e.style,t,"");if(s)for(t in s)n&&s[t]==n[t]||wa(e.style,t,s[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace(Ni,"$1")),a=t.toLowerCase(),t=a in e||t=="onFocusOut"||t=="onFocusIn"?a.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=s,s?n?s.u=n.u:(s.u=Co,e.addEventListener(t,o?ao:oo,o)):e.removeEventListener(t,o?ao:oo,o);else{if(l=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=s??"";break e}catch{}typeof s=="function"||(s==null||s===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&s==1?"":s))}}function Sa(e){return function(t){if(this.l){var s=this.l[t.type+e];if(t.t==null)t.t=Co++;else if(t.t<s.u)return;return s(Ce.event?Ce.event(t):t)}}}function Mo(e,t,s,n,l,o,a,i,r,c){var v,p,h,b,S,D,T,y,$,k,w,N,A,P,O,_=t.type;if(t.constructor!==void 0)return null;128&s.__u&&(r=!!(32&s.__u),o=[i=t.__e=s.__e]),(v=Ce.__b)&&v(t);e:if(typeof _=="function")try{if(y=t.props,$=_.prototype&&_.prototype.render,k=(v=_.contextType)&&n[v.__c],w=v?k?k.props.value:v.__:n,s.__c?T=(p=t.__c=s.__c).__=p.__E:($?t.__c=p=new _(y,w):(t.__c=p=new Kn(y,w),p.constructor=_,p.render=Mc),k&&k.sub(p),p.state||(p.state={}),p.__n=n,h=p.__d=!0,p.__h=[],p._sb=[]),$&&p.__s==null&&(p.__s=p.state),$&&_.getDerivedStateFromProps!=null&&(p.__s==p.state&&(p.__s=Qt({},p.__s)),Qt(p.__s,_.getDerivedStateFromProps(y,p.__s))),b=p.props,S=p.state,p.__v=t,h)$&&_.getDerivedStateFromProps==null&&p.componentWillMount!=null&&p.componentWillMount(),$&&p.componentDidMount!=null&&p.__h.push(p.componentDidMount);else{if($&&_.getDerivedStateFromProps==null&&y!==b&&p.componentWillReceiveProps!=null&&p.componentWillReceiveProps(y,w),t.__v==s.__v||!p.__e&&p.shouldComponentUpdate!=null&&p.shouldComponentUpdate(y,p.__s,w)===!1){t.__v!=s.__v&&(p.props=y,p.state=p.__s,p.__d=!1),t.__e=s.__e,t.__k=s.__k,t.__k.some(function(C){C&&(C.__=t)}),tl.push.apply(p.__h,p._sb),p._sb=[],p.__h.length&&a.push(p);break e}p.componentWillUpdate!=null&&p.componentWillUpdate(y,p.__s,w),$&&p.componentDidUpdate!=null&&p.__h.push(function(){p.componentDidUpdate(b,S,D)})}if(p.context=w,p.props=y,p.__P=e,p.__e=!1,N=Ce.__r,A=0,$)p.state=p.__s,p.__d=!1,N&&N(t),v=p.render(p.props,p.state,p.context),tl.push.apply(p.__h,p._sb),p._sb=[];else do p.__d=!1,N&&N(t),v=p.render(p.props,p.state,p.context),p.state=p.__s;while(p.__d&&++A<25);p.state=p.__s,p.getChildContext!=null&&(n=Qt(Qt({},n),p.getChildContext())),$&&!h&&p.getSnapshotBeforeUpdate!=null&&(D=p.getSnapshotBeforeUpdate(b,S)),P=v!=null&&v.type===dl&&v.key==null?Gi(v.props.children):v,i=Vi(e,cl(P)?P:[P],t,s,n,l,o,a,i,r,c),p.base=t.__e,t.__u&=-161,p.__h.length&&a.push(p),T&&(p.__E=p.__=null)}catch(C){if(t.__v=null,r||o!=null)if(C.then){for(t.__u|=r?160:128;i&&i.nodeType==8&&i.nextSibling;)i=i.nextSibling;o[o.indexOf(i)]=null,t.__e=i}else{for(O=o.length;O--;)Eo(o[O]);ro(t)}else t.__e=s.__e,t.__k=s.__k,C.then||ro(t);Ce.__e(C,t,s)}else o==null&&t.__v==s.__v?(t.__k=s.__k,t.__e=s.__e):i=t.__e=Ec(s.__e,t,s,n,l,o,a,r,c);return(v=Ce.diffed)&&v(t),128&t.__u?void 0:i}function ro(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(ro))}function qi(e,t,s){for(var n=0;n<s.length;n++)Lo(s[n],s[++n],s[++n]);Ce.__c&&Ce.__c(t,e),e.some(function(l){try{e=l.__h,l.__h=[],e.some(function(o){o.call(l)})}catch(o){Ce.__e(o,l.__v)}})}function Gi(e){return typeof e!="object"||e==null||e.__b>0?e:cl(e)?e.map(Gi):Qt({},e)}function Ec(e,t,s,n,l,o,a,i,r){var c,v,p,h,b,S,D,T=s.props||el,y=t.props,$=t.type;if($=="svg"?l="http://www.w3.org/2000/svg":$=="math"?l="http://www.w3.org/1998/Math/MathML":l||(l="http://www.w3.org/1999/xhtml"),o!=null){for(c=0;c<o.length;c++)if((b=o[c])&&"setAttribute"in b==!!$&&($?b.localName==$:b.nodeType==3)){e=b,o[c]=null;break}}if(e==null){if($==null)return document.createTextNode(y);e=document.createElementNS(l,$,y.is&&y),i&&(Ce.__m&&Ce.__m(t,o),i=!1),o=null}if($==null)T===y||i&&e.data==y||(e.data=y);else{if(o=o&&rl.call(e.childNodes),!i&&o!=null)for(T={},c=0;c<e.attributes.length;c++)T[(b=e.attributes[c]).name]=b.value;for(c in T)b=T[c],c=="dangerouslySetInnerHTML"?p=b:c=="children"||c in y||c=="value"&&"defaultValue"in y||c=="checked"&&"defaultChecked"in y||Nn(e,c,null,b,l);for(c in y)b=y[c],c=="children"?h=b:c=="dangerouslySetInnerHTML"?v=b:c=="value"?S=b:c=="checked"?D=b:i&&typeof b!="function"||T[c]===b||Nn(e,c,b,T[c],l);if(v)i||p&&(v.__html==p.__html||v.__html==e.innerHTML)||(e.innerHTML=v.__html),t.__k=[];else if(p&&(e.innerHTML=""),Vi(t.type=="template"?e.content:e,cl(h)?h:[h],t,s,n,$=="foreignObject"?"http://www.w3.org/1999/xhtml":l,o,a,o?o[0]:s.__k&&sn(s,0),i,r),o!=null)for(c=o.length;c--;)Eo(o[c]);i||(c="value",$=="progress"&&S==null?e.removeAttribute("value"):S!=null&&(S!==e[c]||$=="progress"&&!S||$=="option"&&S!=T[c])&&Nn(e,c,S,T[c],l),c="checked",D!=null&&D!=e[c]&&Nn(e,c,D,T[c],l))}return e}function Lo(e,t,s){try{if(typeof e=="function"){var n=typeof e.__u=="function";n&&e.__u(),n&&t==null||(e.__u=e(t))}else e.current=t}catch(l){Ce.__e(l,s)}}function Yi(e,t,s){var n,l;if(Ce.unmount&&Ce.unmount(e),(n=e.ref)&&(n.current&&n.current!=e.__e||Lo(n,null,t)),(n=e.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(o){Ce.__e(o,t)}n.base=n.__P=null}if(n=e.__k)for(l=0;l<n.length;l++)n[l]&&Yi(n[l],t,s||typeof e.type!="function");s||Eo(e.__e),e.__c=e.__=e.__e=void 0}function Mc(e,t,s){return this.constructor(e,s)}function Lc(e,t,s){var n,l,o,a;t==document&&(t=document.documentElement),Ce.__&&Ce.__(e,t),l=(n=!1)?null:t.__k,o=[],a=[],Mo(t,e=t.__k=Hi(dl,null,[e]),l||el,el,t.namespaceURI,l?null:t.firstChild?rl.call(t.childNodes):null,o,l?l.__e:t.firstChild,n,a),qi(o,e,a)}function Dc(e){function t(s){var n,l;return this.getChildContext||(n=new Set,(l={})[t.__c]=this,this.getChildContext=function(){return l},this.componentWillUnmount=function(){n=null},this.shouldComponentUpdate=function(o){this.props.value!=o.value&&n.forEach(function(a){a.__e=!0,io(a)})},this.sub=function(o){n.add(o);var a=o.componentWillUnmount;o.componentWillUnmount=function(){n&&n.delete(o),a&&a.call(o)}}),s.children}return t.__c="__cC"+Bi++,t.__=e,t.Provider=t.__l=(t.Consumer=function(s,n){return s.children(n)}).contextType=t,t}rl=tl.slice,Ce={__e:function(e,t,s,n){for(var l,o,a;t=t.__;)if((l=t.__c)&&!l.__)try{if((o=l.constructor)&&o.getDerivedStateFromError!=null&&(l.setState(o.getDerivedStateFromError(e)),a=l.__d),l.componentDidCatch!=null&&(l.componentDidCatch(e,n||{}),a=l.__d),a)return l.__E=l}catch(i){e=i}throw e}},Fi=0,Kn.prototype.setState=function(e,t){var s;s=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=Qt({},this.state),typeof e=="function"&&(e=e(Qt({},s),this.props)),e&&Qt(s,e),e!=null&&this.__v&&(t&&this._sb.push(t),io(this))},Kn.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),io(this))},Kn.prototype.render=dl,as=[],Ii=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,ji=function(e,t){return e.__v.__b-t.__v.__b},sl.__r=0,Ni=/(PointerCapture)$|Capture$/i,Co=0,oo=Sa(!1),ao=Sa(!0),Bi=0;var Ki=function(e,t,s,n){var l;t[0]=0;for(var o=1;o<t.length;o++){var a=t[o++],i=t[o]?(t[0]|=a?1:2,s[t[o++]]):t[++o];a===3?n[0]=i:a===4?n[1]=Object.assign(n[1]||{},i):a===5?(n[1]=n[1]||{})[t[++o]]=i:a===6?n[1][t[++o]]+=i+"":a?(l=e.apply(i,Ki(e,i,s,["",null])),n.push(l),i[0]?t[0]|=2:(t[o-2]=0,t[o]=l)):n.push(i)}return n},Ta=new Map;function Ac(e){var t=Ta.get(this);return t||(t=new Map,Ta.set(this,t)),(t=Ki(this,t.get(e)||(t.set(e,t=function(s){for(var n,l,o=1,a="",i="",r=[0],c=function(h){o===1&&(h||(a=a.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?r.push(0,h,a):o===3&&(h||a)?(r.push(3,h,a),o=2):o===2&&a==="..."&&h?r.push(4,h,0):o===2&&a&&!h?r.push(5,0,!0,a):o>=5&&((a||!h&&o===5)&&(r.push(o,0,a,l),o=6),h&&(r.push(o,h,0,l),o=6)),a=""},v=0;v<s.length;v++){v&&(o===1&&c(),c(v));for(var p=0;p<s[v].length;p++)n=s[v][p],o===1?n==="<"?(c(),r=[r],o=3):a+=n:o===4?a==="--"&&n===">"?(o=1,a=""):a=n+a[0]:i?n===i?i="":a+=n:n==='"'||n==="'"?i=n:n===">"?(c(),o=1):o&&(n==="="?(o=5,l=a,a=""):n==="/"&&(o<5||s[v][p+1]===">")?(c(),o===3&&(r=r[0]),o=r,(r=r[0]).push(2,0,o),o=0):n===" "||n==="	"||n===`
`||n==="\r"?(c(),o=2):a+=n),o===3&&a==="!--"&&(o=4,r=r[0])}return c(),r}(e)),t),arguments,[])).length>1?t:t[0]}var d=Ac.bind(Hi),nn,De,Vl,Ca,En=0,Ji=[],Ie=Ce,Ea=Ie.__b,Ma=Ie.__r,La=Ie.diffed,Da=Ie.__c,Aa=Ie.unmount,Pa=Ie.__;function ul(e,t){Ie.__h&&Ie.__h(De,e,En||t),En=0;var s=De.__H||(De.__H={__:[],__h:[]});return e>=s.__.length&&s.__.push({}),s.__[e]}function K(e){return En=1,Qi(Xi,e)}function Qi(e,t,s){var n=ul(nn++,2);if(n.t=e,!n.__c&&(n.__=[Xi(void 0,t),function(i){var r=n.__N?n.__N[0]:n.__[0],c=n.t(r,i);r!==c&&(n.__N=[c,n.__[1]],n.__c.setState({}))}],n.__c=De,!De.__f)){var l=function(i,r,c){if(!n.__c.__H)return!0;var v=n.__c.__H.__.filter(function(h){return h.__c});if(v.every(function(h){return!h.__N}))return!o||o.call(this,i,r,c);var p=n.__c.props!==i;return v.some(function(h){if(h.__N){var b=h.__[0];h.__=h.__N,h.__N=void 0,b!==h.__[0]&&(p=!0)}}),o&&o.call(this,i,r,c)||p};De.__f=!0;var o=De.shouldComponentUpdate,a=De.componentWillUpdate;De.componentWillUpdate=function(i,r,c){if(this.__e){var v=o;o=void 0,l(i,r,c),o=v}a&&a.call(this,i,r,c)},De.shouldComponentUpdate=l}return n.__N||n.__}function me(e,t){var s=ul(nn++,3);!Ie.__s&&Zi(s.__H,t)&&(s.__=e,s.u=t,De.__H.__h.push(s))}function ut(e){return En=5,ce(function(){return{current:e}},[])}function ce(e,t){var s=ul(nn++,7);return Zi(s.__H,t)&&(s.__=e(),s.__H=t,s.__h=e),s.__}function We(e,t){return En=8,ce(function(){return e},t)}function tt(e){var t=De.context[e.__c],s=ul(nn++,9);return s.c=e,t?(s.__==null&&(s.__=!0,t.sub(De)),t.props.value):e.__}function Pc(){for(var e;e=Ji.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(Jn),t.__h.some(co),t.__h=[]}catch(s){t.__h=[],Ie.__e(s,e.__v)}}}Ie.__b=function(e){De=null,Ea&&Ea(e)},Ie.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),Pa&&Pa(e,t)},Ie.__r=function(e){Ma&&Ma(e),nn=0;var t=(De=e.__c).__H;t&&(Vl===De?(t.__h=[],De.__h=[],t.__.some(function(s){s.__N&&(s.__=s.__N),s.u=s.__N=void 0})):(t.__h.some(Jn),t.__h.some(co),t.__h=[],nn=0)),Vl=De},Ie.diffed=function(e){La&&La(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(Ji.push(t)!==1&&Ca===Ie.requestAnimationFrame||((Ca=Ie.requestAnimationFrame)||Oc)(Pc)),t.__H.__.some(function(s){s.u&&(s.__H=s.u),s.u=void 0})),Vl=De=null},Ie.__c=function(e,t){t.some(function(s){try{s.__h.some(Jn),s.__h=s.__h.filter(function(n){return!n.__||co(n)})}catch(n){t.some(function(l){l.__h&&(l.__h=[])}),t=[],Ie.__e(n,s.__v)}}),Da&&Da(e,t)},Ie.unmount=function(e){Aa&&Aa(e);var t,s=e.__c;s&&s.__H&&(s.__H.__.some(function(n){try{Jn(n)}catch(l){t=l}}),s.__H=void 0,t&&Ie.__e(t,s.__v))};var Oa=typeof requestAnimationFrame=="function";function Oc(e){var t,s=function(){clearTimeout(n),Oa&&cancelAnimationFrame(t),setTimeout(e)},n=setTimeout(s,35);Oa&&(t=requestAnimationFrame(s))}function Jn(e){var t=De,s=e.__c;typeof s=="function"&&(e.__c=void 0,s()),De=t}function co(e){var t=De;e.__c=e.__(),De=t}function Zi(e,t){return!e||e.length!==t.length||t.some(function(s,n){return s!==e[n]})}function Xi(e,t){return typeof t=="function"?t(e):t}const Ue=Dc(null),Ae=window.COLORS??{},$t=window.ICONS??{},er=window.VENDOR_LABELS??{},zc=window.VENDOR_COLORS??{},Rc=window.HOST_LABELS??{},za=window.TOOL_RELATIONSHIPS??{},Fc={running:"var(--green)",stopped:"var(--red)",error:"var(--orange)",unknown:"var(--fg2)"},Ul=["auto","dark","light"],Ic={auto:"☾",dark:"☾",light:"☀"},en=5,Gs=15,jc={"claude-user-memory":"Claude User Memory","claude-project-memory":"Claude Project Memory","claude-auto-memory":"Claude Auto Memory","copilot-agent-memory":"Copilot Agent Memory","copilot-session-state":"Copilot Session State","copilot-user-memory":"Copilot Instructions","codex-user-memory":"Codex Instructions","windsurf-user-memory":"Windsurf Global Rules"},Ra=["instructions","config","rules","commands","skills","agent","memory","prompt","transcript","temp","runtime","credentials","extensions"],Nc={session_start:"var(--green)",session_end:"var(--red)",file_modified:"var(--accent)",config_change:"var(--yellow)",anomaly:"var(--orange)",model_switch:"var(--model-switch)",mcp_start:"var(--green)",mcp_stop:"var(--red)",process_exit:"var(--red)",quota_warning:"var(--orange)"},Bc=[{id:"product",label:"Product"},{id:"vendor",label:"Vendor"},{id:"host",label:"Host"}],nl=new Map,Hc=6e4;function tr(e){if(e>=10)return String(Math.round(e));const t=e.toFixed(1);return t.endsWith(".0")?t.slice(0,-2):t}function pl(e,t,s,n=1){for(let l=t.length-1;l>=0;l--){const[o,a]=t[l],i=e/o;if(i>=n)return tr(i)+a}return Math.round(e)+s}const Wc=[[1024,"KB"],[1048576,"MB"],[1073741824,"GB"],[1099511627776,"TB"]],Vc=[[1e3,"K"],[1e6,"M"],[1e9,"G"]],Uc=[[1e3,"K"],[1e6,"M"],[1e9,"G"]];function I(e){return pl(e,Vc,"")}function He(e){return pl(e,Uc,"")}function xe(e){return pl(e,Wc,"B")}function Ft(e){return!e||e<=0?"0B/s":pl(e,[[1024,"KB/s"],[1048576,"MB/s"],[1073741824,"GB/s"]],"B/s",.1)}function ge(e){const t=Number(e)||0;return t===0?"0%":t>=10?Math.round(t)+"%":t.toFixed(1)+"%"}function X(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function Do(e){const t=e&&e.token_estimate||{};return(t.input_tokens||0)+(t.output_tokens||0)}function qc(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}):"—"}function Ss(e){return e&&e.replace(/\\/g,"/")}function ql(e,t){const s=Ss(e),n=Ss(t);return s.startsWith(n+"/")?"project":s.includes("/.claude/projects/")?"shadow":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")||s.includes("/.copilot/")||s.includes("/.vscode/")?"global":"external"}function Gc(e,t){const s=Ss(e),n=Ss(t);if(s.startsWith(n+"/")){const o=s.slice(n.length+1),a=o.split("/");return a.pop(),a.length?a.join("/"):"(root)"}const l=s.split("/");l.pop();for(let o=l.length-1;o>=0;o--)if(l[o].startsWith(".")&&l[o].length>1&&l[o]!==".."||l[o]==="Library"||l[o]==="AppData")return"~/"+l.slice(o).join("/");return l.slice(-2).join("/")}function Yc(e,t){const s={};e.forEach(l=>{const o=ql(l.path,t),a=Gc(l.path,t),i=o==="project"?a:o+": "+a;(s[i]=s[i]||[]).push(l)});const n={project:0,global:1,shadow:2,external:3};return Object.entries(s).sort((l,o)=>{const a=l[1][0]?ql(l[1][0].path,t):"z",i=o[1][0]?ql(o[1][0].path,t):"z";return(n[a]||9)-(n[i]||9)})}function Kc(e){if(e.length<3)return e.slice();const t=[e[0],(e[0]+e[1])/2];for(let s=2;s<e.length;s++)t.push((e[s-2]+e[s-1]+e[s])/3);return t}async function Ao(e){const t=nl.get(e);if(t&&Date.now()-t.ts<Hc)return t.content;const s={};t&&t.etag&&(s["If-None-Match"]=t.etag);const n=await fetch("/api/file?path="+encodeURIComponent(e),{headers:s});if(n.status===304&&t)return t.ts=Date.now(),t.content;if(!n.ok)throw new Error(n.statusText);const l=await n.text(),o=n.headers.get("ETag")||null;return nl.set(e,{content:l,ts:Date.now(),etag:o}),l}function It(e){if(!e)return"";const t=Math.floor(Date.now()/1e3-e);return t<0?"":t<60?t+"s ago":t<3600?Math.floor(t/60)+"m ago":t<86400?Math.floor(t/3600)+"h ago":Math.floor(t/86400)+"d ago"}function sr(e){const t=(e||"").toLowerCase();return t==="yes"?"var(--green)":t==="on-demand"?"var(--yellow)":t==="conditional"||t==="partial"?"var(--orange)":"var(--fg2)"}function Gl(e,t,s,n){if(e==null||e==="")return"";let l=typeof e=="number"?e:parseFloat(e)||0;n&&(l*=n);let o;switch(t){case"size":o=xe(l);break;case"rate":o=Ft(l);break;case"kilo":o=I(l);break;case"percent":o=ge(l);break;case"pct":o=ge(l);break;case"raw":default:o=Number.isInteger(l)?String(l):tr(l)}return s?o+s:o}function Fa(e,t){if(typeof e=="number")return e;if(e)try{return new Function(...Object.keys(t),"return "+e)(...Object.values(t))}catch{return}}const Qs={sparklines:[{field:"files",label:"Files",color:"var(--accent)",format:"raw",dp:"overview.files"},{field:"tokens",label:"Tokens",color:"var(--green)",format:"kilo",dp:"overview.tokens"},{field:"cpu",label:"CPU",color:"var(--orange)",format:"percent",smooth:!0,dp:"overview.cpu",refLines:[{valueExpr:"100",label:"1 core"}]},{field:"mem_mb",label:"Proc RAM",color:"var(--yellow)",format:"size",smooth:!0,multiply:1048576,dp:"overview.mem_mb"}],inventory:[{field:"total_processes",label:"Processes",format:"raw",dp:"overview.total_processes"},{field:"total_size",label:"Disk Size",format:"size",dp:"overview.total_size"},{field:"total_mcp_servers",label:"MCP Servers",format:"raw",dp:"overview.total_mcp_servers"},{field:"total_memory_tokens",label:"AI Context",format:"kilo",suffix:"t",dp:"overview.total_memory_tokens"}],liveMetrics:[{field:"total_live_sessions",label:"Sessions",format:"raw",accent:!0,dp:"overview.total_live_sessions"},{field:"total_live_estimated_tokens",label:"Est. Tokens",format:"kilo",suffix:"t",dp:"overview.total_live_estimated_tokens"},{field:"total_live_outbound_rate_bps",label:"↑ Outbound",format:"rate",dp:"overview.total_live_outbound_rate_bps"},{field:"total_live_inbound_rate_bps",label:"↓ Inbound",format:"rate",dp:"overview.total_live_inbound_rate_bps"}],tabs:[{id:"overview",label:"Dashboard",icon:"📊",key:"1"},{id:"procs",label:"Processes",icon:"⚙️",key:"2"},{id:"memory",label:"AI Context",icon:"📝",key:"3"},{id:"live",label:"Live Monitor",icon:"📡",key:"4"},{id:"events",label:"Events & Stats",icon:"📈",key:"5"},{id:"budget",label:"Token Budget",icon:"💰",key:"6"},{id:"sessions",label:"Sessions",icon:"🔄",key:"7"},{id:"samples",label:"Metrics Explorer",icon:"🔬",key:"8"},{id:"flow",label:"Session Flow",icon:"🔀",key:"9"},{id:"config",label:"Configuration",icon:"⚙️",key:"0"}]},Jc=!0,qe="u-",Qc="uplot",Zc=qe+"hz",Xc=qe+"vt",ed=qe+"title",td=qe+"wrap",sd=qe+"under",nd=qe+"over",ld=qe+"axis",ks=qe+"off",od=qe+"select",ad=qe+"cursor-x",id=qe+"cursor-y",rd=qe+"cursor-pt",cd=qe+"legend",dd=qe+"live",ud=qe+"inline",pd=qe+"series",fd=qe+"marker",Ia=qe+"label",vd=qe+"value",kn="width",wn="height",bn="top",ja="bottom",Ys="left",Yl="right",Po="#000",Na=Po+"0",Kl="mousemove",Ba="mousedown",Jl="mouseup",Ha="mouseenter",Wa="mouseleave",Va="dblclick",md="resize",hd="scroll",Ua="change",ll="dppxchange",Oo="--",cn=typeof window<"u",uo=cn?document:null,tn=cn?window:null,gd=cn?navigator:null;let ve,Bn;function po(){let e=devicePixelRatio;ve!=e&&(ve=e,Bn&&vo(Ua,Bn,po),Bn=matchMedia(`(min-resolution: ${ve-.001}dppx) and (max-resolution: ${ve+.001}dppx)`),ws(Ua,Bn,po),tn.dispatchEvent(new CustomEvent(ll)))}function gt(e,t){if(t!=null){let s=e.classList;!s.contains(t)&&s.add(t)}}function fo(e,t){let s=e.classList;s.contains(t)&&s.remove(t)}function Te(e,t,s){e.style[t]=s+"px"}function Ot(e,t,s,n){let l=uo.createElement(e);return t!=null&&gt(l,t),s!=null&&s.insertBefore(l,n),l}function Ct(e,t){return Ot("div",e,t)}const qa=new WeakMap;function qt(e,t,s,n,l){let o="translate("+t+"px,"+s+"px)",a=qa.get(e);o!=a&&(e.style.transform=o,qa.set(e,o),t<0||s<0||t>n||s>l?gt(e,ks):fo(e,ks))}const Ga=new WeakMap;function Ya(e,t,s){let n=t+s,l=Ga.get(e);n!=l&&(Ga.set(e,n),e.style.background=t,e.style.borderColor=s)}const Ka=new WeakMap;function Ja(e,t,s,n){let l=t+""+s,o=Ka.get(e);l!=o&&(Ka.set(e,l),e.style.height=s+"px",e.style.width=t+"px",e.style.marginLeft=n?-t/2+"px":0,e.style.marginTop=n?-s/2+"px":0)}const zo={passive:!0},_d={...zo,capture:!0};function ws(e,t,s,n){t.addEventListener(e,s,n?_d:zo)}function vo(e,t,s,n){t.removeEventListener(e,s,zo)}cn&&po();function zt(e,t,s,n){let l;s=s||0,n=n||t.length-1;let o=n<=2147483647;for(;n-s>1;)l=o?s+n>>1:_t((s+n)/2),t[l]<e?s=l:n=l;return e-t[s]<=t[n]-e?s:n}function nr(e){return(s,n,l)=>{let o=-1,a=-1;for(let i=n;i<=l;i++)if(e(s[i])){o=i;break}for(let i=l;i>=n;i--)if(e(s[i])){a=i;break}return[o,a]}}const lr=e=>e!=null,or=e=>e!=null&&e>0,fl=nr(lr),$d=nr(or);function bd(e,t,s,n=0,l=!1){let o=l?$d:fl,a=l?or:lr;[t,s]=o(e,t,s);let i=e[t],r=e[t];if(t>-1)if(n==1)i=e[t],r=e[s];else if(n==-1)i=e[s],r=e[t];else for(let c=t;c<=s;c++){let v=e[c];a(v)&&(v<i?i=v:v>r&&(r=v))}return[i??$e,r??-$e]}function vl(e,t,s,n){let l=Xa(e),o=Xa(t);e==t&&(l==-1?(e*=s,t/=s):(e/=s,t*=s));let a=s==10?Zt:ar,i=l==1?_t:Et,r=o==1?Et:_t,c=i(a(Ve(e))),v=r(a(Ve(t))),p=ln(s,c),h=ln(s,v);return s==10&&(c<0&&(p=be(p,-c)),v<0&&(h=be(h,-v))),n||s==2?(e=p*l,t=h*o):(e=dr(e,p),t=ml(t,h)),[e,t]}function Ro(e,t,s,n){let l=vl(e,t,s,n);return e==0&&(l[0]=0),t==0&&(l[1]=0),l}const Fo=.1,Qa={mode:3,pad:Fo},Tn={pad:0,soft:null,mode:0},yd={min:Tn,max:Tn};function ol(e,t,s,n){return hl(s)?Za(e,t,s):(Tn.pad=s,Tn.soft=n?0:null,Tn.mode=n?3:0,Za(e,t,yd))}function pe(e,t){return e??t}function xd(e,t,s){for(t=pe(t,0),s=pe(s,e.length-1);t<=s;){if(e[t]!=null)return!0;t++}return!1}function Za(e,t,s){let n=s.min,l=s.max,o=pe(n.pad,0),a=pe(l.pad,0),i=pe(n.hard,-$e),r=pe(l.hard,$e),c=pe(n.soft,$e),v=pe(l.soft,-$e),p=pe(n.mode,0),h=pe(l.mode,0),b=t-e,S=Zt(b),D=rt(Ve(e),Ve(t)),T=Zt(D),y=Ve(T-S);(b<1e-24||y>10)&&(b=0,(e==0||t==0)&&(b=1e-24,p==2&&c!=$e&&(o=0),h==2&&v!=-$e&&(a=0)));let $=b||D||1e3,k=Zt($),w=ln(10,_t(k)),N=$*(b==0?e==0?.1:1:o),A=be(dr(e-N,w/10),24),P=e>=c&&(p==1||p==3&&A<=c||p==2&&A>=c)?c:$e,O=rt(i,A<P&&e>=P?P:Rt(P,A)),_=$*(b==0?t==0?.1:1:a),C=be(ml(t+_,w/10),24),L=t<=v&&(h==1||h==3&&C>=v||h==2&&C<=v)?v:-$e,R=Rt(r,C>L&&t<=L?L:rt(L,C));return O==R&&O==0&&(R=100),[O,R]}const kd=new Intl.NumberFormat(cn?gd.language:"en-US"),Io=e=>kd.format(e),bt=Math,Qn=bt.PI,Ve=bt.abs,_t=bt.floor,Be=bt.round,Et=bt.ceil,Rt=bt.min,rt=bt.max,ln=bt.pow,Xa=bt.sign,Zt=bt.log10,ar=bt.log2,wd=(e,t=1)=>bt.sinh(e)*t,Ql=(e,t=1)=>bt.asinh(e/t),$e=1/0;function ei(e){return(Zt((e^e>>31)-(e>>31))|0)+1}function mo(e,t,s){return Rt(rt(e,t),s)}function ir(e){return typeof e=="function"}function re(e){return ir(e)?e:()=>e}const Sd=()=>{},rr=e=>e,cr=(e,t)=>t,Td=e=>null,ti=e=>!0,si=(e,t)=>e==t,Cd=/\.\d*?(?=9{6,}|0{6,})/gm,Ts=e=>{if(pr(e)||ds.has(e))return e;const t=`${e}`,s=t.match(Cd);if(s==null)return e;let n=s[0].length-1;if(t.indexOf("e-")!=-1){let[l,o]=t.split("e");return+`${Ts(l)}e${o}`}return be(e,n)};function ys(e,t){return Ts(be(Ts(e/t))*t)}function ml(e,t){return Ts(Et(Ts(e/t))*t)}function dr(e,t){return Ts(_t(Ts(e/t))*t)}function be(e,t=0){if(pr(e))return e;let s=10**t,n=e*s*(1+Number.EPSILON);return Be(n)/s}const ds=new Map;function ur(e){return((""+e).split(".")[1]||"").length}function Mn(e,t,s,n){let l=[],o=n.map(ur);for(let a=t;a<s;a++){let i=Ve(a),r=be(ln(e,a),i);for(let c=0;c<n.length;c++){let v=e==10?+`${n[c]}e${a}`:n[c]*r,p=(a>=0?0:i)+(a>=o[c]?0:o[c]),h=e==10?v:be(v,p);l.push(h),ds.set(h,p)}}return l}const Cn={},jo=[],on=[null,null],is=Array.isArray,pr=Number.isInteger,Ed=e=>e===void 0;function ni(e){return typeof e=="string"}function hl(e){let t=!1;if(e!=null){let s=e.constructor;t=s==null||s==Object}return t}function Md(e){return e!=null&&typeof e=="object"}const Ld=Object.getPrototypeOf(Uint8Array),fr="__proto__";function an(e,t=hl){let s;if(is(e)){let n=e.find(l=>l!=null);if(is(n)||t(n)){s=Array(e.length);for(let l=0;l<e.length;l++)s[l]=an(e[l],t)}else s=e.slice()}else if(e instanceof Ld)s=e.slice();else if(t(e)){s={};for(let n in e)n!=fr&&(s[n]=an(e[n],t))}else s=e;return s}function je(e){let t=arguments;for(let s=1;s<t.length;s++){let n=t[s];for(let l in n)l!=fr&&(hl(e[l])?je(e[l],an(n[l])):e[l]=an(n[l]))}return e}const Dd=0,Ad=1,Pd=2;function Od(e,t,s){for(let n=0,l,o=-1;n<t.length;n++){let a=t[n];if(a>o){for(l=a-1;l>=0&&e[l]==null;)e[l--]=null;for(l=a+1;l<s&&e[l]==null;)e[o=l++]=null}}}function zd(e,t){if(Id(e)){let a=e[0].slice();for(let i=1;i<e.length;i++)a.push(...e[i].slice(1));return jd(a[0])||(a=Fd(a)),a}let s=new Set;for(let a=0;a<e.length;a++){let r=e[a][0],c=r.length;for(let v=0;v<c;v++)s.add(r[v])}let n=[Array.from(s).sort((a,i)=>a-i)],l=n[0].length,o=new Map;for(let a=0;a<l;a++)o.set(n[0][a],a);for(let a=0;a<e.length;a++){let i=e[a],r=i[0];for(let c=1;c<i.length;c++){let v=i[c],p=Array(l).fill(void 0),h=t?t[a][c]:Ad,b=[];for(let S=0;S<v.length;S++){let D=v[S],T=o.get(r[S]);D===null?h!=Dd&&(p[T]=D,h==Pd&&b.push(T)):p[T]=D}Od(p,b,l),n.push(p)}}return n}const Rd=typeof queueMicrotask>"u"?e=>Promise.resolve().then(e):queueMicrotask;function Fd(e){let t=e[0],s=t.length,n=Array(s);for(let o=0;o<n.length;o++)n[o]=o;n.sort((o,a)=>t[o]-t[a]);let l=[];for(let o=0;o<e.length;o++){let a=e[o],i=Array(s);for(let r=0;r<s;r++)i[r]=a[n[r]];l.push(i)}return l}function Id(e){let t=e[0][0],s=t.length;for(let n=1;n<e.length;n++){let l=e[n][0];if(l.length!=s)return!1;if(l!=t){for(let o=0;o<s;o++)if(l[o]!=t[o])return!1}}return!0}function jd(e,t=100){const s=e.length;if(s<=1)return!0;let n=0,l=s-1;for(;n<=l&&e[n]==null;)n++;for(;l>=n&&e[l]==null;)l--;if(l<=n)return!0;const o=rt(1,_t((l-n+1)/t));for(let a=e[n],i=n+o;i<=l;i+=o){const r=e[i];if(r!=null){if(r<=a)return!1;a=r}}return!0}const vr=["January","February","March","April","May","June","July","August","September","October","November","December"],mr=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function hr(e){return e.slice(0,3)}const Nd=mr.map(hr),Bd=vr.map(hr),Hd={MMMM:vr,MMM:Bd,WWWW:mr,WWW:Nd};function yn(e){return(e<10?"0":"")+e}function Wd(e){return(e<10?"00":e<100?"0":"")+e}const Vd={YYYY:e=>e.getFullYear(),YY:e=>(e.getFullYear()+"").slice(2),MMMM:(e,t)=>t.MMMM[e.getMonth()],MMM:(e,t)=>t.MMM[e.getMonth()],MM:e=>yn(e.getMonth()+1),M:e=>e.getMonth()+1,DD:e=>yn(e.getDate()),D:e=>e.getDate(),WWWW:(e,t)=>t.WWWW[e.getDay()],WWW:(e,t)=>t.WWW[e.getDay()],HH:e=>yn(e.getHours()),H:e=>e.getHours(),h:e=>{let t=e.getHours();return t==0?12:t>12?t-12:t},AA:e=>e.getHours()>=12?"PM":"AM",aa:e=>e.getHours()>=12?"pm":"am",a:e=>e.getHours()>=12?"p":"a",mm:e=>yn(e.getMinutes()),m:e=>e.getMinutes(),ss:e=>yn(e.getSeconds()),s:e=>e.getSeconds(),fff:e=>Wd(e.getMilliseconds())};function No(e,t){t=t||Hd;let s=[],n=/\{([a-z]+)\}|[^{]+/gi,l;for(;l=n.exec(e);)s.push(l[0][0]=="{"?Vd[l[1]]:l[0]);return o=>{let a="";for(let i=0;i<s.length;i++)a+=typeof s[i]=="string"?s[i]:s[i](o,t);return a}}const Ud=new Intl.DateTimeFormat().resolvedOptions().timeZone;function qd(e,t){let s;return t=="UTC"||t=="Etc/UTC"?s=new Date(+e+e.getTimezoneOffset()*6e4):t==Ud?s=e:(s=new Date(e.toLocaleString("en-US",{timeZone:t})),s.setMilliseconds(e.getMilliseconds())),s}const gr=e=>e%1==0,al=[1,2,2.5,5],Gd=Mn(10,-32,0,al),_r=Mn(10,0,32,al),Yd=_r.filter(gr),xs=Gd.concat(_r),Bo=`
`,$r="{YYYY}",li=Bo+$r,br="{M}/{D}",Sn=Bo+br,Hn=Sn+"/{YY}",yr="{aa}",Kd="{h}:{mm}",Zs=Kd+yr,oi=Bo+Zs,ai=":{ss}",he=null;function xr(e){let t=e*1e3,s=t*60,n=s*60,l=n*24,o=l*30,a=l*365,r=(e==1?Mn(10,0,3,al).filter(gr):Mn(10,-3,0,al)).concat([t,t*5,t*10,t*15,t*30,s,s*5,s*10,s*15,s*30,n,n*2,n*3,n*4,n*6,n*8,n*12,l,l*2,l*3,l*4,l*5,l*6,l*7,l*8,l*9,l*10,l*15,o,o*2,o*3,o*4,o*6,a,a*2,a*5,a*10,a*25,a*50,a*100]);const c=[[a,$r,he,he,he,he,he,he,1],[l*28,"{MMM}",li,he,he,he,he,he,1],[l,br,li,he,he,he,he,he,1],[n,"{h}"+yr,Hn,he,Sn,he,he,he,1],[s,Zs,Hn,he,Sn,he,he,he,1],[t,ai,Hn+" "+Zs,he,Sn+" "+Zs,he,oi,he,1],[e,ai+".{fff}",Hn+" "+Zs,he,Sn+" "+Zs,he,oi,he,1]];function v(p){return(h,b,S,D,T,y)=>{let $=[],k=T>=a,w=T>=o&&T<a,N=p(S),A=be(N*e,3),P=Zl(N.getFullYear(),k?0:N.getMonth(),w||k?1:N.getDate()),O=be(P*e,3);if(w||k){let _=w?T/o:0,C=k?T/a:0,L=A==O?A:be(Zl(P.getFullYear()+C,P.getMonth()+_,1)*e,3),R=new Date(Be(L/e)),z=R.getFullYear(),V=R.getMonth();for(let q=0;L<=D;q++){let le=Zl(z+C*q,V+_*q,1),M=le-p(be(le*e,3));L=be((+le+M)*e,3),L<=D&&$.push(L)}}else{let _=T>=l?l:T,C=_t(S)-_t(A),L=O+C+ml(A-O,_);$.push(L);let R=p(L),z=R.getHours()+R.getMinutes()/s+R.getSeconds()/n,V=T/n,q=h.axes[b]._space,le=y/q;for(;L=be(L+T,e==1?0:3),!(L>D);)if(V>1){let M=_t(be(z+V,6))%24,W=p(L).getHours()-M;W>1&&(W=-1),L-=W*n,z=(z+V)%24;let oe=$[$.length-1];be((L-oe)/T,3)*le>=.7&&$.push(L)}else $.push(L)}return $}}return[r,c,v]}const[Jd,Qd,Zd]=xr(1),[Xd,eu,tu]=xr(.001);Mn(2,-53,53,[1]);function ii(e,t){return e.map(s=>s.map((n,l)=>l==0||l==8||n==null?n:t(l==1||s[8]==0?n:s[1]+n)))}function ri(e,t){return(s,n,l,o,a)=>{let i=t.find(S=>a>=S[0])||t[t.length-1],r,c,v,p,h,b;return n.map(S=>{let D=e(S),T=D.getFullYear(),y=D.getMonth(),$=D.getDate(),k=D.getHours(),w=D.getMinutes(),N=D.getSeconds(),A=T!=r&&i[2]||y!=c&&i[3]||$!=v&&i[4]||k!=p&&i[5]||w!=h&&i[6]||N!=b&&i[7]||i[1];return r=T,c=y,v=$,p=k,h=w,b=N,A(D)})}}function su(e,t){let s=No(t);return(n,l,o,a,i)=>l.map(r=>s(e(r)))}function Zl(e,t,s){return new Date(e,t,s)}function ci(e,t){return t(e)}const nu="{YYYY}-{MM}-{DD} {h}:{mm}{aa}";function di(e,t){return(s,n,l,o)=>o==null?Oo:t(e(n))}function lu(e,t){let s=e.series[t];return s.width?s.stroke(e,t):s.points.width?s.points.stroke(e,t):null}function ou(e,t){return e.series[t].fill(e,t)}const au={show:!0,live:!0,isolate:!1,mount:Sd,markers:{show:!0,width:2,stroke:lu,fill:ou,dash:"solid"},idx:null,idxs:null,values:[]};function iu(e,t){let s=e.cursor.points,n=Ct(),l=s.size(e,t);Te(n,kn,l),Te(n,wn,l);let o=l/-2;Te(n,"marginLeft",o),Te(n,"marginTop",o);let a=s.width(e,t,l);return a&&Te(n,"borderWidth",a),n}function ru(e,t){let s=e.series[t].points;return s._fill||s._stroke}function cu(e,t){let s=e.series[t].points;return s._stroke||s._fill}function du(e,t){return e.series[t].points.size}const Xl=[0,0];function uu(e,t,s){return Xl[0]=t,Xl[1]=s,Xl}function Wn(e,t,s,n=!0){return l=>{l.button==0&&(!n||l.target==t)&&s(l)}}function eo(e,t,s,n=!0){return l=>{(!n||l.target==t)&&s(l)}}const pu={show:!0,x:!0,y:!0,lock:!1,move:uu,points:{one:!1,show:iu,size:du,width:0,stroke:cu,fill:ru},bind:{mousedown:Wn,mouseup:Wn,click:Wn,dblclick:Wn,mousemove:eo,mouseleave:eo,mouseenter:eo},drag:{setScale:!0,x:!0,y:!1,dist:0,uni:null,click:(e,t)=>{t.stopPropagation(),t.stopImmediatePropagation()},_x:!1,_y:!1},focus:{dist:(e,t,s,n,l)=>n-l,prox:-1,bias:0},hover:{skip:[void 0],prox:null,bias:0},left:-10,top:-10,idx:null,dataIdx:null,idxs:null,event:null},kr={show:!0,stroke:"rgba(0,0,0,0.07)",width:2},Ho=je({},kr,{filter:cr}),wr=je({},Ho,{size:10}),Sr=je({},kr,{show:!1}),Wo='12px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',Tr="bold "+Wo,Cr=1.5,ui={show:!0,scale:"x",stroke:Po,space:50,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Tr,side:2,grid:Ho,ticks:wr,border:Sr,font:Wo,lineGap:Cr,rotate:0},fu="Value",vu="Time",pi={show:!0,scale:"x",auto:!1,sorted:1,min:$e,max:-$e,idxs:[]};function mu(e,t,s,n,l){return t.map(o=>o==null?"":Io(o))}function hu(e,t,s,n,l,o,a){let i=[],r=ds.get(l)||0;s=a?s:be(ml(s,l),r);for(let c=s;c<=n;c=be(c+l,r))i.push(Object.is(c,-0)?0:c);return i}function ho(e,t,s,n,l,o,a){const i=[],r=e.scales[e.axes[t].scale].log,c=r==10?Zt:ar,v=_t(c(s));l=ln(r,v),r==10&&(l=xs[zt(l,xs)]);let p=s,h=l*r;r==10&&(h=xs[zt(h,xs)]);do i.push(p),p=p+l,r==10&&!ds.has(p)&&(p=be(p,ds.get(l))),p>=h&&(l=p,h=l*r,r==10&&(h=xs[zt(h,xs)]));while(p<=n);return i}function gu(e,t,s,n,l,o,a){let r=e.scales[e.axes[t].scale].asinh,c=n>r?ho(e,t,rt(r,s),n,l):[r],v=n>=0&&s<=0?[0]:[];return(s<-r?ho(e,t,rt(r,-n),-s,l):[r]).reverse().map(h=>-h).concat(v,c)}const Er=/./,_u=/[12357]/,$u=/[125]/,fi=/1/,go=(e,t,s,n)=>e.map((l,o)=>t==4&&l==0||o%n==0&&s.test(l.toExponential()[l<0?1:0])?l:null);function bu(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=e.scales[a],r=e.valToPos,c=o._space,v=r(10,a),p=r(9,a)-v>=c?Er:r(7,a)-v>=c?_u:r(5,a)-v>=c?$u:fi;if(p==fi){let h=Ve(r(1,a)-v);if(h<c)return go(t.slice().reverse(),i.distr,p,Et(c/h)).reverse()}return go(t,i.distr,p,1)}function yu(e,t,s,n,l){let o=e.axes[s],a=o.scale,i=o._space,r=e.valToPos,c=Ve(r(1,a)-r(2,a));return c<i?go(t.slice().reverse(),3,Er,Et(i/c)).reverse():t}function xu(e,t,s,n){return n==null?Oo:t==null?"":Io(t)}const vi={show:!0,scale:"y",stroke:Po,space:30,gap:5,alignTo:1,size:50,labelGap:0,labelSize:30,labelFont:Tr,side:3,grid:Ho,ticks:wr,border:Sr,font:Wo,lineGap:Cr,rotate:0};function ku(e,t){let s=3+(e||1)*2;return be(s*t,3)}function wu(e,t){let{scale:s,idxs:n}=e.series[0],l=e._data[0],o=e.valToPos(l[n[0]],s,!0),a=e.valToPos(l[n[1]],s,!0),i=Ve(a-o),r=e.series[t],c=i/(r.points.space*ve);return n[1]-n[0]<=c}const mi={scale:null,auto:!0,sorted:0,min:$e,max:-$e},Mr=(e,t,s,n,l)=>l,hi={show:!0,auto:!0,sorted:0,gaps:Mr,alpha:1,facets:[je({},mi,{scale:"x"}),je({},mi,{scale:"y"})]},gi={scale:"y",auto:!0,sorted:0,show:!0,spanGaps:!1,gaps:Mr,alpha:1,points:{show:wu,filter:null},values:null,min:$e,max:-$e,idxs:[],path:null,clip:null};function Su(e,t,s,n,l){return s/10}const Lr={time:Jc,auto:!0,distr:1,log:10,asinh:1,min:null,max:null,dir:1,ori:0},Tu=je({},Lr,{time:!1,ori:1}),_i={};function Dr(e,t){let s=_i[e];return s||(s={key:e,plots:[],sub(n){s.plots.push(n)},unsub(n){s.plots=s.plots.filter(l=>l!=n)},pub(n,l,o,a,i,r,c){for(let v=0;v<s.plots.length;v++)s.plots[v]!=l&&s.plots[v].pub(n,l,o,a,i,r,c)}},e!=null&&(_i[e]=s)),s}const rn=1,_o=2;function Cs(e,t,s){const n=e.mode,l=e.series[t],o=n==2?e._data[t]:e._data,a=e.scales,i=e.bbox;let r=o[0],c=n==2?o[1]:o[t],v=n==2?a[l.facets[0].scale]:a[e.series[0].scale],p=n==2?a[l.facets[1].scale]:a[l.scale],h=i.left,b=i.top,S=i.width,D=i.height,T=e.valToPosH,y=e.valToPosV;return v.ori==0?s(l,r,c,v,p,T,y,h,b,S,D,_l,dn,bl,Pr,zr):s(l,r,c,v,p,y,T,b,h,D,S,$l,un,qo,Or,Rr)}function Vo(e,t){let s=0,n=0,l=pe(e.bands,jo);for(let o=0;o<l.length;o++){let a=l[o];a.series[0]==t?s=a.dir:a.series[1]==t&&(a.dir==1?n|=1:n|=2)}return[s,n==1?-1:n==2?1:n==3?2:0]}function Cu(e,t,s,n,l){let o=e.mode,a=e.series[t],i=o==2?a.facets[1].scale:a.scale,r=e.scales[i];return l==-1?r.min:l==1?r.max:r.distr==3?r.dir==1?r.min:r.max:0}function Xt(e,t,s,n,l,o){return Cs(e,t,(a,i,r,c,v,p,h,b,S,D,T)=>{let y=a.pxRound;const $=c.dir*(c.ori==0?1:-1),k=c.ori==0?dn:un;let w,N;$==1?(w=s,N=n):(w=n,N=s);let A=y(p(i[w],c,D,b)),P=y(h(r[w],v,T,S)),O=y(p(i[N],c,D,b)),_=y(h(o==1?v.max:v.min,v,T,S)),C=new Path2D(l);return k(C,O,_),k(C,A,_),k(C,A,P),C})}function gl(e,t,s,n,l,o){let a=null;if(e.length>0){a=new Path2D;const i=t==0?bl:qo;let r=s;for(let p=0;p<e.length;p++){let h=e[p];if(h[1]>h[0]){let b=h[0]-r;b>0&&i(a,r,n,b,n+o),r=h[1]}}let c=s+l-r,v=10;c>0&&i(a,r,n-v/2,c,n+o+v)}return a}function Eu(e,t,s){let n=e[e.length-1];n&&n[0]==t?n[1]=s:e.push([t,s])}function Uo(e,t,s,n,l,o,a){let i=[],r=e.length;for(let c=l==1?s:n;c>=s&&c<=n;c+=l)if(t[c]===null){let p=c,h=c;if(l==1)for(;++c<=n&&t[c]===null;)h=c;else for(;--c>=s&&t[c]===null;)h=c;let b=o(e[p]),S=h==p?b:o(e[h]),D=p-l;b=a<=0&&D>=0&&D<r?o(e[D]):b;let y=h+l;S=a>=0&&y>=0&&y<r?o(e[y]):S,S>=b&&i.push([b,S])}return i}function $i(e){return e==0?rr:e==1?Be:t=>ys(t,e)}function Ar(e){let t=e==0?_l:$l,s=e==0?(l,o,a,i,r,c)=>{l.arcTo(o,a,i,r,c)}:(l,o,a,i,r,c)=>{l.arcTo(a,o,r,i,c)},n=e==0?(l,o,a,i,r)=>{l.rect(o,a,i,r)}:(l,o,a,i,r)=>{l.rect(a,o,r,i)};return(l,o,a,i,r,c=0,v=0)=>{c==0&&v==0?n(l,o,a,i,r):(c=Rt(c,i/2,r/2),v=Rt(v,i/2,r/2),t(l,o+c,a),s(l,o+i,a,o+i,a+r,c),s(l,o+i,a+r,o,a+r,v),s(l,o,a+r,o,a,v),s(l,o,a,o+i,a,c),l.closePath())}}const _l=(e,t,s)=>{e.moveTo(t,s)},$l=(e,t,s)=>{e.moveTo(s,t)},dn=(e,t,s)=>{e.lineTo(t,s)},un=(e,t,s)=>{e.lineTo(s,t)},bl=Ar(0),qo=Ar(1),Pr=(e,t,s,n,l,o)=>{e.arc(t,s,n,l,o)},Or=(e,t,s,n,l,o)=>{e.arc(s,t,n,l,o)},zr=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(t,s,n,l,o,a)},Rr=(e,t,s,n,l,o,a)=>{e.bezierCurveTo(s,t,l,n,a,o)};function Fr(e){return(t,s,n,l,o)=>Cs(t,s,(a,i,r,c,v,p,h,b,S,D,T)=>{let{pxRound:y,points:$}=a,k,w;c.ori==0?(k=_l,w=Pr):(k=$l,w=Or);const N=be($.width*ve,3);let A=($.size-$.width)/2*ve,P=be(A*2,3),O=new Path2D,_=new Path2D,{left:C,top:L,width:R,height:z}=t.bbox;bl(_,C-P,L-P,R+P*2,z+P*2);const V=q=>{if(r[q]!=null){let le=y(p(i[q],c,D,b)),M=y(h(r[q],v,T,S));k(O,le+A,M),w(O,le,M,A,0,Qn*2)}};if(o)o.forEach(V);else for(let q=n;q<=l;q++)V(q);return{stroke:N>0?O:null,fill:O,clip:_,flags:rn|_o}})}function Ir(e){return(t,s,n,l,o,a)=>{n!=l&&(o!=n&&a!=n&&e(t,s,n),o!=l&&a!=l&&e(t,s,l),e(t,s,a))}}const Mu=Ir(dn),Lu=Ir(un);function jr(e){const t=pe(e==null?void 0:e.alignGaps,0);return(s,n,l,o)=>Cs(s,n,(a,i,r,c,v,p,h,b,S,D,T)=>{[l,o]=fl(r,l,o);let y=a.pxRound,$=z=>y(p(z,c,D,b)),k=z=>y(h(z,v,T,S)),w,N;c.ori==0?(w=dn,N=Mu):(w=un,N=Lu);const A=c.dir*(c.ori==0?1:-1),P={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:rn},O=P.stroke;let _=!1;if(o-l>=D*4){let z=J=>s.posToVal(J,c.key,!0),V=null,q=null,le,M,B,U=$(i[A==1?l:o]),W=$(i[l]),oe=$(i[o]),ee=z(A==1?W+1:oe-1);for(let J=A==1?l:o;J>=l&&J<=o;J+=A){let ze=i[J],Ee=(A==1?ze<ee:ze>ee)?U:$(ze),de=r[J];Ee==U?de!=null?(M=de,V==null?(w(O,Ee,k(M)),le=V=q=M):M<V?V=M:M>q&&(q=M)):de===null&&(_=!0):(V!=null&&N(O,U,k(V),k(q),k(le),k(M)),de!=null?(M=de,w(O,Ee,k(M)),V=q=le=M):(V=q=null,de===null&&(_=!0)),U=Ee,ee=z(U+A))}V!=null&&V!=q&&B!=U&&N(O,U,k(V),k(q),k(le),k(M))}else for(let z=A==1?l:o;z>=l&&z<=o;z+=A){let V=r[z];V===null?_=!0:V!=null&&w(O,$(i[z]),k(V))}let[L,R]=Vo(s,n);if(a.fill!=null||L!=0){let z=P.fill=new Path2D(O),V=a.fillTo(s,n,a.min,a.max,L),q=k(V),le=$(i[l]),M=$(i[o]);A==-1&&([M,le]=[le,M]),w(z,M,q),w(z,le,q)}if(!a.spanGaps){let z=[];_&&z.push(...Uo(i,r,l,o,A,$,t)),P.gaps=z=a.gaps(s,n,l,o,z),P.clip=gl(z,c.ori,b,S,D,T)}return R!=0&&(P.band=R==2?[Xt(s,n,l,o,O,-1),Xt(s,n,l,o,O,1)]:Xt(s,n,l,o,O,R)),P})}function Du(e){const t=pe(e.align,1),s=pe(e.ascDesc,!1),n=pe(e.alignGaps,0),l=pe(e.extend,!1);return(o,a,i,r)=>Cs(o,a,(c,v,p,h,b,S,D,T,y,$,k)=>{[i,r]=fl(p,i,r);let w=c.pxRound,{left:N,width:A}=o.bbox,P=W=>w(S(W,h,$,T)),O=W=>w(D(W,b,k,y)),_=h.ori==0?dn:un;const C={stroke:new Path2D,fill:null,clip:null,band:null,gaps:null,flags:rn},L=C.stroke,R=h.dir*(h.ori==0?1:-1);let z=O(p[R==1?i:r]),V=P(v[R==1?i:r]),q=V,le=V;l&&t==-1&&(le=N,_(L,le,z)),_(L,V,z);for(let W=R==1?i:r;W>=i&&W<=r;W+=R){let oe=p[W];if(oe==null)continue;let ee=P(v[W]),J=O(oe);t==1?_(L,ee,z):_(L,q,J),_(L,ee,J),z=J,q=ee}let M=q;l&&t==1&&(M=N+A,_(L,M,z));let[B,U]=Vo(o,a);if(c.fill!=null||B!=0){let W=C.fill=new Path2D(L),oe=c.fillTo(o,a,c.min,c.max,B),ee=O(oe);_(W,M,ee),_(W,le,ee)}if(!c.spanGaps){let W=[];W.push(...Uo(v,p,i,r,R,P,n));let oe=c.width*ve/2,ee=s||t==1?oe:-oe,J=s||t==-1?-oe:oe;W.forEach(ze=>{ze[0]+=ee,ze[1]+=J}),C.gaps=W=c.gaps(o,a,i,r,W),C.clip=gl(W,h.ori,T,y,$,k)}return U!=0&&(C.band=U==2?[Xt(o,a,i,r,L,-1),Xt(o,a,i,r,L,1)]:Xt(o,a,i,r,L,U)),C})}function bi(e,t,s,n,l,o,a=$e){if(e.length>1){let i=null;for(let r=0,c=1/0;r<e.length;r++)if(t[r]!==void 0){if(i!=null){let v=Ve(e[r]-e[i]);v<c&&(c=v,a=Ve(s(e[r],n,l,o)-s(e[i],n,l,o)))}i=r}}return a}function Au(e){e=e||Cn;const t=pe(e.size,[.6,$e,1]),s=e.align||0,n=e.gap||0;let l=e.radius;l=l==null?[0,0]:typeof l=="number"?[l,0]:l;const o=re(l),a=1-t[0],i=pe(t[1],$e),r=pe(t[2],1),c=pe(e.disp,Cn),v=pe(e.each,b=>{}),{fill:p,stroke:h}=c;return(b,S,D,T)=>Cs(b,S,(y,$,k,w,N,A,P,O,_,C,L)=>{let R=y.pxRound,z=s,V=n*ve,q=i*ve,le=r*ve,M,B;w.ori==0?[M,B]=o(b,S):[B,M]=o(b,S);const U=w.dir*(w.ori==0?1:-1);let W=w.ori==0?bl:qo,oe=w.ori==0?v:(Q,ye,Ne,Ds,fs,Nt,vs)=>{v(Q,ye,Ne,fs,Ds,vs,Nt)},ee=pe(b.bands,jo).find(Q=>Q.series[0]==S),J=ee!=null?ee.dir:0,ze=y.fillTo(b,S,y.min,y.max,J),Re=R(P(ze,N,L,_)),Ee,de,Mt,pt=C,Le=R(y.width*ve),jt=!1,Yt=null,yt=null,es=null,Es=null;p!=null&&(Le==0||h!=null)&&(jt=!0,Yt=p.values(b,S,D,T),yt=new Map,new Set(Yt).forEach(Q=>{Q!=null&&yt.set(Q,new Path2D)}),Le>0&&(es=h.values(b,S,D,T),Es=new Map,new Set(es).forEach(Q=>{Q!=null&&Es.set(Q,new Path2D)})));let{x0:Ms,size:pn}=c;if(Ms!=null&&pn!=null){z=1,$=Ms.values(b,S,D,T),Ms.unit==2&&($=$.map(Ne=>b.posToVal(O+Ne*C,w.key,!0)));let Q=pn.values(b,S,D,T);pn.unit==2?de=Q[0]*C:de=A(Q[0],w,C,O)-A(0,w,C,O),pt=bi($,k,A,w,C,O,pt),Mt=pt-de+V}else pt=bi($,k,A,w,C,O,pt),Mt=pt*a+V,de=pt-Mt;Mt<1&&(Mt=0),Le>=de/2&&(Le=0),Mt<5&&(R=rr);let Ln=Mt>0,us=pt-Mt-(Ln?Le:0);de=R(mo(us,le,q)),Ee=(z==0?de/2:z==U?0:de)-z*U*((z==0?V/2:0)+(Ln?Le/2:0));const lt={stroke:null,fill:null,clip:null,band:null,gaps:null,flags:0},Ls=jt?null:new Path2D;let Kt=null;if(ee!=null)Kt=b.data[ee.series[1]];else{let{y0:Q,y1:ye}=c;Q!=null&&ye!=null&&(k=ye.values(b,S,D,T),Kt=Q.values(b,S,D,T))}let ps=M*de,ae=B*de;for(let Q=U==1?D:T;Q>=D&&Q<=T;Q+=U){let ye=k[Q];if(ye==null)continue;if(Kt!=null){let ct=Kt[Q]??0;if(ye-ct==0)continue;Re=P(ct,N,L,_)}let Ne=w.distr!=2||c!=null?$[Q]:Q,Ds=A(Ne,w,C,O),fs=P(pe(ye,ze),N,L,_),Nt=R(Ds-Ee),vs=R(rt(fs,Re)),ft=R(Rt(fs,Re)),xt=vs-ft;if(ye!=null){let ct=ye<0?ae:ps,Lt=ye<0?ps:ae;jt?(Le>0&&es[Q]!=null&&W(Es.get(es[Q]),Nt,ft+_t(Le/2),de,rt(0,xt-Le),ct,Lt),Yt[Q]!=null&&W(yt.get(Yt[Q]),Nt,ft+_t(Le/2),de,rt(0,xt-Le),ct,Lt)):W(Ls,Nt,ft+_t(Le/2),de,rt(0,xt-Le),ct,Lt),oe(b,S,Q,Nt-Le/2,ft,de+Le,xt)}}return Le>0?lt.stroke=jt?Es:Ls:jt||(lt._fill=y.width==0?y._fill:y._stroke??y._fill,lt.width=0),lt.fill=jt?yt:Ls,lt})}function Pu(e,t){const s=pe(t==null?void 0:t.alignGaps,0);return(n,l,o,a)=>Cs(n,l,(i,r,c,v,p,h,b,S,D,T,y)=>{[o,a]=fl(c,o,a);let $=i.pxRound,k=M=>$(h(M,v,T,S)),w=M=>$(b(M,p,y,D)),N,A,P;v.ori==0?(N=_l,P=dn,A=zr):(N=$l,P=un,A=Rr);const O=v.dir*(v.ori==0?1:-1);let _=k(r[O==1?o:a]),C=_,L=[],R=[];for(let M=O==1?o:a;M>=o&&M<=a;M+=O)if(c[M]!=null){let U=r[M],W=k(U);L.push(C=W),R.push(w(c[M]))}const z={stroke:e(L,R,N,P,A,$),fill:null,clip:null,band:null,gaps:null,flags:rn},V=z.stroke;let[q,le]=Vo(n,l);if(i.fill!=null||q!=0){let M=z.fill=new Path2D(V),B=i.fillTo(n,l,i.min,i.max,q),U=w(B);P(M,C,U),P(M,_,U)}if(!i.spanGaps){let M=[];M.push(...Uo(r,c,o,a,O,k,s)),z.gaps=M=i.gaps(n,l,o,a,M),z.clip=gl(M,v.ori,S,D,T,y)}return le!=0&&(z.band=le==2?[Xt(n,l,o,a,V,-1),Xt(n,l,o,a,V,1)]:Xt(n,l,o,a,V,le)),z})}function Ou(e){return Pu(zu,e)}function zu(e,t,s,n,l,o){const a=e.length;if(a<2)return null;const i=new Path2D;if(s(i,e[0],t[0]),a==2)n(i,e[1],t[1]);else{let r=Array(a),c=Array(a-1),v=Array(a-1),p=Array(a-1);for(let h=0;h<a-1;h++)v[h]=t[h+1]-t[h],p[h]=e[h+1]-e[h],c[h]=v[h]/p[h];r[0]=c[0];for(let h=1;h<a-1;h++)c[h]===0||c[h-1]===0||c[h-1]>0!=c[h]>0?r[h]=0:(r[h]=3*(p[h-1]+p[h])/((2*p[h]+p[h-1])/c[h-1]+(p[h]+2*p[h-1])/c[h]),isFinite(r[h])||(r[h]=0));r[a-1]=c[a-2];for(let h=0;h<a-1;h++)l(i,e[h]+p[h]/3,t[h]+r[h]*p[h]/3,e[h+1]-p[h]/3,t[h+1]-r[h+1]*p[h]/3,e[h+1],t[h+1])}return i}const $o=new Set;function yi(){for(let e of $o)e.syncRect(!0)}cn&&(ws(md,tn,yi),ws(hd,tn,yi,!0),ws(ll,tn,()=>{nt.pxRatio=ve}));const Ru=jr(),Fu=Fr();function xi(e,t,s,n){return(n?[e[0],e[1]].concat(e.slice(2)):[e[0]].concat(e.slice(1))).map((o,a)=>bo(o,a,t,s))}function Iu(e,t){return e.map((s,n)=>n==0?{}:je({},t,s))}function bo(e,t,s,n){return je({},t==0?s:n,e)}function Nr(e,t,s){return t==null?on:[t,s]}const ju=Nr;function Nu(e,t,s){return t==null?on:ol(t,s,Fo,!0)}function Br(e,t,s,n){return t==null?on:vl(t,s,e.scales[n].log,!1)}const Bu=Br;function Hr(e,t,s,n){return t==null?on:Ro(t,s,e.scales[n].log,!1)}const Hu=Hr;function Wu(e,t,s,n,l){let o=rt(ei(e),ei(t)),a=t-e,i=zt(l/n*a,s);do{let r=s[i],c=n*r/a;if(c>=l&&o+(r<5?ds.get(r):0)<=17)return[r,c]}while(++i<s.length);return[0,0]}function ki(e){let t,s;return e=e.replace(/(\d+)px/,(n,l)=>(t=Be((s=+l)*ve))+"px"),[e,t,s]}function Vu(e){e.show&&[e.font,e.labelFont].forEach(t=>{let s=be(t[2]*ve,1);t[0]=t[0].replace(/[0-9.]+px/,s+"px"),t[1]=s})}function nt(e,t,s){const n={mode:pe(e.mode,1)},l=n.mode;function o(u,f,m,g){let x=f.valToPct(u);return g+m*(f.dir==-1?1-x:x)}function a(u,f,m,g){let x=f.valToPct(u);return g+m*(f.dir==-1?x:1-x)}function i(u,f,m,g){return f.ori==0?o(u,f,m,g):a(u,f,m,g)}n.valToPosH=o,n.valToPosV=a;let r=!1;n.status=0;const c=n.root=Ct(Qc);if(e.id!=null&&(c.id=e.id),gt(c,e.class),e.title){let u=Ct(ed,c);u.textContent=e.title}const v=Ot("canvas"),p=n.ctx=v.getContext("2d"),h=Ct(td,c);ws("click",h,u=>{u.target===S&&(ke!=Hs||Me!=Ws)&&et.click(n,u)},!0);const b=n.under=Ct(sd,h);h.appendChild(v);const S=n.over=Ct(nd,h);e=an(e);const D=+pe(e.pxAlign,1),T=$i(D);(e.plugins||[]).forEach(u=>{u.opts&&(e=u.opts(n,e)||e)});const y=e.ms||.001,$=n.series=l==1?xi(e.series||[],pi,gi,!1):Iu(e.series||[null],hi),k=n.axes=xi(e.axes||[],ui,vi,!0),w=n.scales={},N=n.bands=e.bands||[];N.forEach(u=>{u.fill=re(u.fill||null),u.dir=pe(u.dir,-1)});const A=l==2?$[1].facets[0].scale:$[0].scale,P={axes:cc,series:lc},O=(e.drawOrder||["axes","series"]).map(u=>P[u]);function _(u){const f=u.distr==3?m=>Zt(m>0?m:u.clamp(n,m,u.min,u.max,u.key)):u.distr==4?m=>Ql(m,u.asinh):u.distr==100?m=>u.fwd(m):m=>m;return m=>{let g=f(m),{_min:x,_max:E}=u,F=E-x;return(g-x)/F}}function C(u){let f=w[u];if(f==null){let m=(e.scales||Cn)[u]||Cn;if(m.from!=null){C(m.from);let g=je({},w[m.from],m,{key:u});g.valToPct=_(g),w[u]=g}else{f=w[u]=je({},u==A?Lr:Tu,m),f.key=u;let g=f.time,x=f.range,E=is(x);if((u!=A||l==2&&!g)&&(E&&(x[0]==null||x[1]==null)&&(x={min:x[0]==null?Qa:{mode:1,hard:x[0],soft:x[0]},max:x[1]==null?Qa:{mode:1,hard:x[1],soft:x[1]}},E=!1),!E&&hl(x))){let F=x;x=(j,H,G)=>H==null?on:ol(H,G,F)}f.range=re(x||(g?ju:u==A?f.distr==3?Bu:f.distr==4?Hu:Nr:f.distr==3?Br:f.distr==4?Hr:Nu)),f.auto=re(E?!1:f.auto),f.clamp=re(f.clamp||Su),f._min=f._max=null,f.valToPct=_(f)}}}C("x"),C("y"),l==1&&$.forEach(u=>{C(u.scale)}),k.forEach(u=>{C(u.scale)});for(let u in e.scales)C(u);const L=w[A],R=L.distr;let z,V;L.ori==0?(gt(c,Zc),z=o,V=a):(gt(c,Xc),z=a,V=o);const q={};for(let u in w){let f=w[u];(f.min!=null||f.max!=null)&&(q[u]={min:f.min,max:f.max},f.min=f.max=null)}const le=e.tzDate||(u=>new Date(Be(u/y))),M=e.fmtDate||No,B=y==1?Zd(le):tu(le),U=ri(le,ii(y==1?Qd:eu,M)),W=di(le,ci(nu,M)),oe=[],ee=n.legend=je({},au,e.legend),J=n.cursor=je({},pu,{drag:{y:l==2}},e.cursor),ze=ee.show,Re=J.show,Ee=ee.markers;ee.idxs=oe,Ee.width=re(Ee.width),Ee.dash=re(Ee.dash),Ee.stroke=re(Ee.stroke),Ee.fill=re(Ee.fill);let de,Mt,pt,Le=[],jt=[],Yt,yt=!1,es={};if(ee.live){const u=$[1]?$[1].values:null;yt=u!=null,Yt=yt?u(n,1,0):{_:0};for(let f in Yt)es[f]=Oo}if(ze)if(de=Ot("table",cd,c),pt=Ot("tbody",null,de),ee.mount(n,de),yt){Mt=Ot("thead",null,de,pt);let u=Ot("tr",null,Mt);Ot("th",null,u);for(var Es in Yt)Ot("th",Ia,u).textContent=Es}else gt(de,ud),ee.live&&gt(de,dd);const Ms={show:!0},pn={show:!1};function Ln(u,f){if(f==0&&(yt||!ee.live||l==2))return on;let m=[],g=Ot("tr",pd,pt,pt.childNodes[f]);gt(g,u.class),u.show||gt(g,ks);let x=Ot("th",null,g);if(Ee.show){let j=Ct(fd,x);if(f>0){let H=Ee.width(n,f);H&&(j.style.border=H+"px "+Ee.dash(n,f)+" "+Ee.stroke(n,f)),j.style.background=Ee.fill(n,f)}}let E=Ct(Ia,x);u.label instanceof HTMLElement?E.appendChild(u.label):E.textContent=u.label,f>0&&(Ee.show||(E.style.color=u.width>0?Ee.stroke(n,f):Ee.fill(n,f)),lt("click",x,j=>{if(J._lock)return;hs(j);let H=$.indexOf(u);if((j.ctrlKey||j.metaKey)!=ee.isolate){let G=$.some((Y,Z)=>Z>0&&Z!=H&&Y.show);$.forEach((Y,Z)=>{Z>0&&Ht(Z,G?Z==H?Ms:pn:Ms,!0,Fe.setSeries)})}else Ht(H,{show:!u.show},!0,Fe.setSeries)},!1),Ps&&lt(Ha,x,j=>{J._lock||(hs(j),Ht($.indexOf(u),Us,!0,Fe.setSeries))},!1));for(var F in Yt){let j=Ot("td",vd,g);j.textContent="--",m.push(j)}return[g,m]}const us=new Map;function lt(u,f,m,g=!0){const x=us.get(f)||{},E=J.bind[u](n,f,m,g);E&&(ws(u,f,x[u]=E),us.set(f,x))}function Ls(u,f,m){const g=us.get(f)||{};for(let x in g)(u==null||x==u)&&(vo(x,f,g[x]),delete g[x]);u==null&&us.delete(f)}let Kt=0,ps=0,ae=0,Q=0,ye=0,Ne=0,Ds=ye,fs=Ne,Nt=ae,vs=Q,ft=0,xt=0,ct=0,Lt=0;n.bbox={};let yl=!1,Dn=!1,As=!1,ms=!1,An=!1,kt=!1;function xl(u,f,m){(m||u!=n.width||f!=n.height)&&Go(u,f),Is(!1),As=!0,Dn=!0,js()}function Go(u,f){n.width=Kt=ae=u,n.height=ps=Q=f,ye=Ne=0,Qr(),Zr();let m=n.bbox;ft=m.left=ys(ye*ve,.5),xt=m.top=ys(Ne*ve,.5),ct=m.width=ys(ae*ve,.5),Lt=m.height=ys(Q*ve,.5)}const Yr=3;function Kr(){let u=!1,f=0;for(;!u;){f++;let m=ic(f),g=rc(f);u=f==Yr||m&&g,u||(Go(n.width,n.height),Dn=!0)}}function Jr({width:u,height:f}){xl(u,f)}n.setSize=Jr;function Qr(){let u=!1,f=!1,m=!1,g=!1;k.forEach((x,E)=>{if(x.show&&x._show){let{side:F,_size:j}=x,H=F%2,G=x.label!=null?x.labelSize:0,Y=j+G;Y>0&&(H?(ae-=Y,F==3?(ye+=Y,g=!0):m=!0):(Q-=Y,F==0?(Ne+=Y,u=!0):f=!0))}}),gs[0]=u,gs[1]=m,gs[2]=f,gs[3]=g,ae-=ts[1]+ts[3],ye+=ts[3],Q-=ts[2]+ts[0],Ne+=ts[0]}function Zr(){let u=ye+ae,f=Ne+Q,m=ye,g=Ne;function x(E,F){switch(E){case 1:return u+=F,u-F;case 2:return f+=F,f-F;case 3:return m-=F,m+F;case 0:return g-=F,g+F}}k.forEach((E,F)=>{if(E.show&&E._show){let j=E.side;E._pos=x(j,E._size),E.label!=null&&(E._lpos=x(j,E.labelSize))}})}if(J.dataIdx==null){let u=J.hover,f=u.skip=new Set(u.skip??[]);f.add(void 0);let m=u.prox=re(u.prox),g=u.bias??(u.bias=0);J.dataIdx=(x,E,F,j)=>{if(E==0)return F;let H=F,G=m(x,E,F,j)??$e,Y=G>=0&&G<$e,Z=L.ori==0?ae:Q,ne=J.left,fe=t[0],ue=t[E];if(f.has(ue[F])){H=null;let ie=null,se=null,te;if(g==0||g==-1)for(te=F;ie==null&&te-- >0;)f.has(ue[te])||(ie=te);if(g==0||g==1)for(te=F;se==null&&te++<ue.length;)f.has(ue[te])||(se=te);if(ie!=null||se!=null)if(Y){let Se=ie==null?-1/0:z(fe[ie],L,Z,0),Pe=se==null?1/0:z(fe[se],L,Z,0),Ze=ne-Se,_e=Pe-ne;Ze<=_e?Ze<=G&&(H=ie):_e<=G&&(H=se)}else H=se==null?ie:ie==null?se:F-ie<=se-F?ie:se}else Y&&Ve(ne-z(fe[F],L,Z,0))>G&&(H=null);return H}}const hs=u=>{J.event=u};J.idxs=oe,J._lock=!1;let st=J.points;st.show=re(st.show),st.size=re(st.size),st.stroke=re(st.stroke),st.width=re(st.width),st.fill=re(st.fill);const Bt=n.focus=je({},e.focus||{alpha:.3},J.focus),Ps=Bt.prox>=0,Os=Ps&&st.one;let wt=[],zs=[],Rs=[];function Yo(u,f){let m=st.show(n,f);if(m instanceof HTMLElement)return gt(m,rd),gt(m,u.class),qt(m,-10,-10,ae,Q),S.insertBefore(m,wt[f]),m}function Ko(u,f){if(l==1||f>0){let m=l==1&&w[u.scale].time,g=u.value;u.value=m?ni(g)?di(le,ci(g,M)):g||W:g||xu,u.label=u.label||(m?vu:fu)}if(Os||f>0){u.width=u.width==null?1:u.width,u.paths=u.paths||Ru||Td,u.fillTo=re(u.fillTo||Cu),u.pxAlign=+pe(u.pxAlign,D),u.pxRound=$i(u.pxAlign),u.stroke=re(u.stroke||null),u.fill=re(u.fill||null),u._stroke=u._fill=u._paths=u._focus=null;let m=ku(rt(1,u.width),1),g=u.points=je({},{size:m,width:rt(1,m*.2),stroke:u.stroke,space:m*2,paths:Fu,_stroke:null,_fill:null},u.points);g.show=re(g.show),g.filter=re(g.filter),g.fill=re(g.fill),g.stroke=re(g.stroke),g.paths=re(g.paths),g.pxAlign=u.pxAlign}if(ze){let m=Ln(u,f);Le.splice(f,0,m[0]),jt.splice(f,0,m[1]),ee.values.push(null)}if(Re){oe.splice(f,0,null);let m=null;Os?f==0&&(m=Yo(u,f)):f>0&&(m=Yo(u,f)),wt.splice(f,0,m),zs.splice(f,0,0),Rs.splice(f,0,0)}Qe("addSeries",f)}function Xr(u,f){f=f??$.length,u=l==1?bo(u,f,pi,gi):bo(u,f,{},hi),$.splice(f,0,u),Ko($[f],f)}n.addSeries=Xr;function ec(u){if($.splice(u,1),ze){ee.values.splice(u,1),jt.splice(u,1);let f=Le.splice(u,1)[0];Ls(null,f.firstChild),f.remove()}Re&&(oe.splice(u,1),wt.splice(u,1)[0].remove(),zs.splice(u,1),Rs.splice(u,1)),Qe("delSeries",u)}n.delSeries=ec;const gs=[!1,!1,!1,!1];function tc(u,f){if(u._show=u.show,u.show){let m=u.side%2,g=w[u.scale];g==null&&(u.scale=m?$[1].scale:A,g=w[u.scale]);let x=g.time;u.size=re(u.size),u.space=re(u.space),u.rotate=re(u.rotate),is(u.incrs)&&u.incrs.forEach(F=>{!ds.has(F)&&ds.set(F,ur(F))}),u.incrs=re(u.incrs||(g.distr==2?Yd:x?y==1?Jd:Xd:xs)),u.splits=re(u.splits||(x&&g.distr==1?B:g.distr==3?ho:g.distr==4?gu:hu)),u.stroke=re(u.stroke),u.grid.stroke=re(u.grid.stroke),u.ticks.stroke=re(u.ticks.stroke),u.border.stroke=re(u.border.stroke);let E=u.values;u.values=is(E)&&!is(E[0])?re(E):x?is(E)?ri(le,ii(E,M)):ni(E)?su(le,E):E||U:E||mu,u.filter=re(u.filter||(g.distr>=3&&g.log==10?bu:g.distr==3&&g.log==2?yu:cr)),u.font=ki(u.font),u.labelFont=ki(u.labelFont),u._size=u.size(n,null,f,0),u._space=u._rotate=u._incrs=u._found=u._splits=u._values=null,u._size>0&&(gs[f]=!0,u._el=Ct(ld,h))}}function fn(u,f,m,g){let[x,E,F,j]=m,H=f%2,G=0;return H==0&&(j||E)&&(G=f==0&&!x||f==2&&!F?Be(ui.size/3):0),H==1&&(x||F)&&(G=f==1&&!E||f==3&&!j?Be(vi.size/2):0),G}const Jo=n.padding=(e.padding||[fn,fn,fn,fn]).map(u=>re(pe(u,fn))),ts=n._padding=Jo.map((u,f)=>u(n,f,gs,0));let Xe,Ge=null,Ye=null;const Pn=l==1?$[0].idxs:null;let Dt=null,vn=!1;function Qo(u,f){if(t=u??[],n.data=n._data=t,l==2){Xe=0;for(let m=1;m<$.length;m++)Xe+=t[m][0].length}else{t.length==0&&(n.data=n._data=t=[[]]),Dt=t[0],Xe=Dt.length;let m=t;if(R==2){m=t.slice();let g=m[0]=Array(Xe);for(let x=0;x<Xe;x++)g[x]=x}n._data=t=m}if(Is(!0),Qe("setData"),R==2&&(As=!0),f!==!1){let m=L;m.auto(n,vn)?kl():ns(A,m.min,m.max),ms=ms||J.left>=0,kt=!0,js()}}n.setData=Qo;function kl(){vn=!0;let u,f;l==1&&(Xe>0?(Ge=Pn[0]=0,Ye=Pn[1]=Xe-1,u=t[0][Ge],f=t[0][Ye],R==2?(u=Ge,f=Ye):u==f&&(R==3?[u,f]=vl(u,u,L.log,!1):R==4?[u,f]=Ro(u,u,L.log,!1):L.time?f=u+Be(86400/y):[u,f]=ol(u,f,Fo,!0))):(Ge=Pn[0]=u=null,Ye=Pn[1]=f=null)),ns(A,u,f)}let On,Fs,wl,Sl,Tl,Cl,El,Ml,Ll,dt;function Zo(u,f,m,g,x,E){u??(u=Na),m??(m=jo),g??(g="butt"),x??(x=Na),E??(E="round"),u!=On&&(p.strokeStyle=On=u),x!=Fs&&(p.fillStyle=Fs=x),f!=wl&&(p.lineWidth=wl=f),E!=Tl&&(p.lineJoin=Tl=E),g!=Cl&&(p.lineCap=Cl=g),m!=Sl&&p.setLineDash(Sl=m)}function Xo(u,f,m,g){f!=Fs&&(p.fillStyle=Fs=f),u!=El&&(p.font=El=u),m!=Ml&&(p.textAlign=Ml=m),g!=Ll&&(p.textBaseline=Ll=g)}function Dl(u,f,m,g,x=0){if(g.length>0&&u.auto(n,vn)&&(f==null||f.min==null)){let E=pe(Ge,0),F=pe(Ye,g.length-1),j=m.min==null?bd(g,E,F,x,u.distr==3):[m.min,m.max];u.min=Rt(u.min,m.min=j[0]),u.max=rt(u.max,m.max=j[1])}}const ea={min:null,max:null};function sc(){for(let g in w){let x=w[g];q[g]==null&&(x.min==null||q[A]!=null&&x.auto(n,vn))&&(q[g]=ea)}for(let g in w){let x=w[g];q[g]==null&&x.from!=null&&q[x.from]!=null&&(q[g]=ea)}q[A]!=null&&Is(!0);let u={};for(let g in q){let x=q[g];if(x!=null){let E=u[g]=an(w[g],Md);if(x.min!=null)je(E,x);else if(g!=A||l==2)if(Xe==0&&E.from==null){let F=E.range(n,null,null,g);E.min=F[0],E.max=F[1]}else E.min=$e,E.max=-$e}}if(Xe>0){$.forEach((g,x)=>{if(l==1){let E=g.scale,F=q[E];if(F==null)return;let j=u[E];if(x==0){let H=j.range(n,j.min,j.max,E);j.min=H[0],j.max=H[1],Ge=zt(j.min,t[0]),Ye=zt(j.max,t[0]),Ye-Ge>1&&(t[0][Ge]<j.min&&Ge++,t[0][Ye]>j.max&&Ye--),g.min=Dt[Ge],g.max=Dt[Ye]}else g.show&&g.auto&&Dl(j,F,g,t[x],g.sorted);g.idxs[0]=Ge,g.idxs[1]=Ye}else if(x>0&&g.show&&g.auto){let[E,F]=g.facets,j=E.scale,H=F.scale,[G,Y]=t[x],Z=u[j],ne=u[H];Z!=null&&Dl(Z,q[j],E,G,E.sorted),ne!=null&&Dl(ne,q[H],F,Y,F.sorted),g.min=F.min,g.max=F.max}});for(let g in u){let x=u[g],E=q[g];if(x.from==null&&(E==null||E.min==null)){let F=x.range(n,x.min==$e?null:x.min,x.max==-$e?null:x.max,g);x.min=F[0],x.max=F[1]}}}for(let g in u){let x=u[g];if(x.from!=null){let E=u[x.from];if(E.min==null)x.min=x.max=null;else{let F=x.range(n,E.min,E.max,g);x.min=F[0],x.max=F[1]}}}let f={},m=!1;for(let g in u){let x=u[g],E=w[g];if(E.min!=x.min||E.max!=x.max){E.min=x.min,E.max=x.max;let F=E.distr;E._min=F==3?Zt(E.min):F==4?Ql(E.min,E.asinh):F==100?E.fwd(E.min):E.min,E._max=F==3?Zt(E.max):F==4?Ql(E.max,E.asinh):F==100?E.fwd(E.max):E.max,f[g]=m=!0}}if(m){$.forEach((g,x)=>{l==2?x>0&&f.y&&(g._paths=null):f[g.scale]&&(g._paths=null)});for(let g in f)As=!0,Qe("setScale",g);Re&&J.left>=0&&(ms=kt=!0)}for(let g in q)q[g]=null}function nc(u){let f=mo(Ge-1,0,Xe-1),m=mo(Ye+1,0,Xe-1);for(;u[f]==null&&f>0;)f--;for(;u[m]==null&&m<Xe-1;)m++;return[f,m]}function lc(){if(Xe>0){let u=$.some(f=>f._focus)&&dt!=Bt.alpha;u&&(p.globalAlpha=dt=Bt.alpha),$.forEach((f,m)=>{if(m>0&&f.show&&(ta(m,!1),ta(m,!0),f._paths==null)){let g=dt;dt!=f.alpha&&(p.globalAlpha=dt=f.alpha);let x=l==2?[0,t[m][0].length-1]:nc(t[m]);f._paths=f.paths(n,m,x[0],x[1]),dt!=g&&(p.globalAlpha=dt=g)}}),$.forEach((f,m)=>{if(m>0&&f.show){let g=dt;dt!=f.alpha&&(p.globalAlpha=dt=f.alpha),f._paths!=null&&sa(m,!1);{let x=f._paths!=null?f._paths.gaps:null,E=f.points.show(n,m,Ge,Ye,x),F=f.points.filter(n,m,E,x);(E||F)&&(f.points._paths=f.points.paths(n,m,Ge,Ye,F),sa(m,!0))}dt!=g&&(p.globalAlpha=dt=g),Qe("drawSeries",m)}}),u&&(p.globalAlpha=dt=1)}}function ta(u,f){let m=f?$[u].points:$[u];m._stroke=m.stroke(n,u),m._fill=m.fill(n,u)}function sa(u,f){let m=f?$[u].points:$[u],{stroke:g,fill:x,clip:E,flags:F,_stroke:j=m._stroke,_fill:H=m._fill,_width:G=m.width}=m._paths;G=be(G*ve,3);let Y=null,Z=G%2/2;f&&H==null&&(H=G>0?"#fff":j);let ne=m.pxAlign==1&&Z>0;if(ne&&p.translate(Z,Z),!f){let fe=ft-G/2,ue=xt-G/2,ie=ct+G,se=Lt+G;Y=new Path2D,Y.rect(fe,ue,ie,se)}f?Al(j,G,m.dash,m.cap,H,g,x,F,E):oc(u,j,G,m.dash,m.cap,H,g,x,F,Y,E),ne&&p.translate(-Z,-Z)}function oc(u,f,m,g,x,E,F,j,H,G,Y){let Z=!1;H!=0&&N.forEach((ne,fe)=>{if(ne.series[0]==u){let ue=$[ne.series[1]],ie=t[ne.series[1]],se=(ue._paths||Cn).band;is(se)&&(se=ne.dir==1?se[0]:se[1]);let te,Se=null;ue.show&&se&&xd(ie,Ge,Ye)?(Se=ne.fill(n,fe)||E,te=ue._paths.clip):se=null,Al(f,m,g,x,Se,F,j,H,G,Y,te,se),Z=!0}}),Z||Al(f,m,g,x,E,F,j,H,G,Y)}const na=rn|_o;function Al(u,f,m,g,x,E,F,j,H,G,Y,Z){Zo(u,f,m,g,x),(H||G||Z)&&(p.save(),H&&p.clip(H),G&&p.clip(G)),Z?(j&na)==na?(p.clip(Z),Y&&p.clip(Y),Rn(x,F),zn(u,E,f)):j&_o?(Rn(x,F),p.clip(Z),zn(u,E,f)):j&rn&&(p.save(),p.clip(Z),Y&&p.clip(Y),Rn(x,F),p.restore(),zn(u,E,f)):(Rn(x,F),zn(u,E,f)),(H||G||Z)&&p.restore()}function zn(u,f,m){m>0&&(f instanceof Map?f.forEach((g,x)=>{p.strokeStyle=On=x,p.stroke(g)}):f!=null&&u&&p.stroke(f))}function Rn(u,f){f instanceof Map?f.forEach((m,g)=>{p.fillStyle=Fs=g,p.fill(m)}):f!=null&&u&&p.fill(f)}function ac(u,f,m,g){let x=k[u],E;if(g<=0)E=[0,0];else{let F=x._space=x.space(n,u,f,m,g),j=x._incrs=x.incrs(n,u,f,m,g,F);E=Wu(f,m,j,g,F)}return x._found=E}function Pl(u,f,m,g,x,E,F,j,H,G){let Y=F%2/2;D==1&&p.translate(Y,Y),Zo(j,F,H,G,j),p.beginPath();let Z,ne,fe,ue,ie=x+(g==0||g==3?-E:E);m==0?(ne=x,ue=ie):(Z=x,fe=ie);for(let se=0;se<u.length;se++)f[se]!=null&&(m==0?Z=fe=u[se]:ne=ue=u[se],p.moveTo(Z,ne),p.lineTo(fe,ue));p.stroke(),D==1&&p.translate(-Y,-Y)}function ic(u){let f=!0;return k.forEach((m,g)=>{if(!m.show)return;let x=w[m.scale];if(x.min==null){m._show&&(f=!1,m._show=!1,Is(!1));return}else m._show||(f=!1,m._show=!0,Is(!1));let E=m.side,F=E%2,{min:j,max:H}=x,[G,Y]=ac(g,j,H,F==0?ae:Q);if(Y==0)return;let Z=x.distr==2,ne=m._splits=m.splits(n,g,j,H,G,Y,Z),fe=x.distr==2?ne.map(te=>Dt[te]):ne,ue=x.distr==2?Dt[ne[1]]-Dt[ne[0]]:G,ie=m._values=m.values(n,m.filter(n,fe,g,Y,ue),g,Y,ue);m._rotate=E==2?m.rotate(n,ie,g,Y):0;let se=m._size;m._size=Et(m.size(n,ie,g,u)),se!=null&&m._size!=se&&(f=!1)}),f}function rc(u){let f=!0;return Jo.forEach((m,g)=>{let x=m(n,g,gs,u);x!=ts[g]&&(f=!1),ts[g]=x}),f}function cc(){for(let u=0;u<k.length;u++){let f=k[u];if(!f.show||!f._show)continue;let m=f.side,g=m%2,x,E,F=f.stroke(n,u),j=m==0||m==3?-1:1,[H,G]=f._found;if(f.label!=null){let at=f.labelGap*j,ht=Be((f._lpos+at)*ve);Xo(f.labelFont[0],F,"center",m==2?bn:ja),p.save(),g==1?(x=E=0,p.translate(ht,Be(xt+Lt/2)),p.rotate((m==3?-Qn:Qn)/2)):(x=Be(ft+ct/2),E=ht);let bs=ir(f.label)?f.label(n,u,H,G):f.label;p.fillText(bs,x,E),p.restore()}if(G==0)continue;let Y=w[f.scale],Z=g==0?ct:Lt,ne=g==0?ft:xt,fe=f._splits,ue=Y.distr==2?fe.map(at=>Dt[at]):fe,ie=Y.distr==2?Dt[fe[1]]-Dt[fe[0]]:H,se=f.ticks,te=f.border,Se=se.show?se.size:0,Pe=Be(Se*ve),Ze=Be((f.alignTo==2?f._size-Se-f.gap:f.gap)*ve),_e=f._rotate*-Qn/180,Oe=T(f._pos*ve),vt=(Pe+Ze)*j,ot=Oe+vt;E=g==0?ot:0,x=g==1?ot:0;let St=f.font[0],At=f.align==1?Ys:f.align==2?Yl:_e>0?Ys:_e<0?Yl:g==0?"center":m==3?Yl:Ys,Vt=_e||g==1?"middle":m==2?bn:ja;Xo(St,F,At,Vt);let mt=f.font[1]*f.lineGap,Tt=fe.map(at=>T(i(at,Y,Z,ne))),Pt=f._values;for(let at=0;at<Pt.length;at++){let ht=Pt[at];if(ht!=null){g==0?x=Tt[at]:E=Tt[at],ht=""+ht;let bs=ht.indexOf(`
`)==-1?[ht]:ht.split(/\n/gm);for(let it=0;it<bs.length;it++){let xa=bs[it];_e?(p.save(),p.translate(x,E+it*mt),p.rotate(_e),p.fillText(xa,0,0),p.restore()):p.fillText(xa,x,E+it*mt)}}}se.show&&Pl(Tt,se.filter(n,ue,u,G,ie),g,m,Oe,Pe,be(se.width*ve,3),se.stroke(n,u),se.dash,se.cap);let Ut=f.grid;Ut.show&&Pl(Tt,Ut.filter(n,ue,u,G,ie),g,g==0?2:1,g==0?xt:ft,g==0?Lt:ct,be(Ut.width*ve,3),Ut.stroke(n,u),Ut.dash,Ut.cap),te.show&&Pl([Oe],[1],g==0?1:0,g==0?1:2,g==1?xt:ft,g==1?Lt:ct,be(te.width*ve,3),te.stroke(n,u),te.dash,te.cap)}Qe("drawAxes")}function Is(u){$.forEach((f,m)=>{m>0&&(f._paths=null,u&&(l==1?(f.min=null,f.max=null):f.facets.forEach(g=>{g.min=null,g.max=null})))})}let Fn=!1,Ol=!1,mn=[];function dc(){Ol=!1;for(let u=0;u<mn.length;u++)Qe(...mn[u]);mn.length=0}function js(){Fn||(Rd(la),Fn=!0)}function uc(u,f=!1){Fn=!0,Ol=f,u(n),la(),f&&mn.length>0&&queueMicrotask(dc)}n.batch=uc;function la(){if(yl&&(sc(),yl=!1),As&&(Kr(),As=!1),Dn){if(Te(b,Ys,ye),Te(b,bn,Ne),Te(b,kn,ae),Te(b,wn,Q),Te(S,Ys,ye),Te(S,bn,Ne),Te(S,kn,ae),Te(S,wn,Q),Te(h,kn,Kt),Te(h,wn,ps),v.width=Be(Kt*ve),v.height=Be(ps*ve),k.forEach(({_el:u,_show:f,_size:m,_pos:g,side:x})=>{if(u!=null)if(f){let E=x===3||x===0?m:0,F=x%2==1;Te(u,F?"left":"top",g-E),Te(u,F?"width":"height",m),Te(u,F?"top":"left",F?Ne:ye),Te(u,F?"height":"width",F?Q:ae),fo(u,ks)}else gt(u,ks)}),On=Fs=wl=Tl=Cl=El=Ml=Ll=Sl=null,dt=1,_n(!0),ye!=Ds||Ne!=fs||ae!=Nt||Q!=vs){Is(!1);let u=ae/Nt,f=Q/vs;if(Re&&!ms&&J.left>=0){J.left*=u,J.top*=f,Ns&&qt(Ns,Be(J.left),0,ae,Q),Bs&&qt(Bs,0,Be(J.top),ae,Q);for(let m=0;m<wt.length;m++){let g=wt[m];g!=null&&(zs[m]*=u,Rs[m]*=f,qt(g,Et(zs[m]),Et(Rs[m]),ae,Q))}}if(we.show&&!An&&we.left>=0&&we.width>0){we.left*=u,we.width*=u,we.top*=f,we.height*=f;for(let m in Nl)Te(Vs,m,we[m])}Ds=ye,fs=Ne,Nt=ae,vs=Q}Qe("setSize"),Dn=!1}Kt>0&&ps>0&&(p.clearRect(0,0,v.width,v.height),Qe("drawClear"),O.forEach(u=>u()),Qe("draw")),we.show&&An&&(In(we),An=!1),Re&&ms&&($s(null,!0,!1),ms=!1),ee.show&&ee.live&&kt&&(Il(),kt=!1),r||(r=!0,n.status=1,Qe("ready")),vn=!1,Fn=!1}n.redraw=(u,f)=>{As=f||!1,u!==!1?ns(A,L.min,L.max):js()};function zl(u,f){let m=w[u];if(m.from==null){if(Xe==0){let g=m.range(n,f.min,f.max,u);f.min=g[0],f.max=g[1]}if(f.min>f.max){let g=f.min;f.min=f.max,f.max=g}if(Xe>1&&f.min!=null&&f.max!=null&&f.max-f.min<1e-16)return;u==A&&m.distr==2&&Xe>0&&(f.min=zt(f.min,t[0]),f.max=zt(f.max,t[0]),f.min==f.max&&f.max++),q[u]=f,yl=!0,js()}}n.setScale=zl;let Rl,Fl,Ns,Bs,oa,aa,Hs,Ws,ia,ra,ke,Me,ss=!1;const et=J.drag;let Ke=et.x,Je=et.y;Re&&(J.x&&(Rl=Ct(ad,S)),J.y&&(Fl=Ct(id,S)),L.ori==0?(Ns=Rl,Bs=Fl):(Ns=Fl,Bs=Rl),ke=J.left,Me=J.top);const we=n.select=je({show:!0,over:!0,left:0,width:0,top:0,height:0},e.select),Vs=we.show?Ct(od,we.over?S:b):null;function In(u,f){if(we.show){for(let m in u)we[m]=u[m],m in Nl&&Te(Vs,m,u[m]);f!==!1&&Qe("setSelect")}}n.setSelect=In;function pc(u){if($[u].show)ze&&fo(Le[u],ks);else if(ze&&gt(Le[u],ks),Re){let m=Os?wt[0]:wt[u];m!=null&&qt(m,-10,-10,ae,Q)}}function ns(u,f,m){zl(u,{min:f,max:m})}function Ht(u,f,m,g){f.focus!=null&&gc(u),f.show!=null&&$.forEach((x,E)=>{E>0&&(u==E||u==null)&&(x.show=f.show,pc(E),l==2?(ns(x.facets[0].scale,null,null),ns(x.facets[1].scale,null,null)):ns(x.scale,null,null),js())}),m!==!1&&Qe("setSeries",u,f),g&&$n("setSeries",n,u,f)}n.setSeries=Ht;function fc(u,f){je(N[u],f)}function vc(u,f){u.fill=re(u.fill||null),u.dir=pe(u.dir,-1),f=f??N.length,N.splice(f,0,u)}function mc(u){u==null?N.length=0:N.splice(u,1)}n.addBand=vc,n.setBand=fc,n.delBand=mc;function hc(u,f){$[u].alpha=f,Re&&wt[u]!=null&&(wt[u].style.opacity=f),ze&&Le[u]&&(Le[u].style.opacity=f)}let Jt,ls,_s;const Us={focus:!0};function gc(u){if(u!=_s){let f=u==null,m=Bt.alpha!=1;$.forEach((g,x)=>{if(l==1||x>0){let E=f||x==0||x==u;g._focus=f?null:E,m&&hc(x,E?1:Bt.alpha)}}),_s=u,m&&js()}}ze&&Ps&&lt(Wa,de,u=>{J._lock||(hs(u),_s!=null&&Ht(null,Us,!0,Fe.setSeries))});function Wt(u,f,m){let g=w[f];m&&(u=u/ve-(g.ori==1?Ne:ye));let x=ae;g.ori==1&&(x=Q,u=x-u),g.dir==-1&&(u=x-u);let E=g._min,F=g._max,j=u/x,H=E+(F-E)*j,G=g.distr;return G==3?ln(10,H):G==4?wd(H,g.asinh):G==100?g.bwd(H):H}function _c(u,f){let m=Wt(u,A,f);return zt(m,t[0],Ge,Ye)}n.valToIdx=u=>zt(u,t[0]),n.posToIdx=_c,n.posToVal=Wt,n.valToPos=(u,f,m)=>w[f].ori==0?o(u,w[f],m?ct:ae,m?ft:0):a(u,w[f],m?Lt:Q,m?xt:0),n.setCursor=(u,f,m)=>{ke=u.left,Me=u.top,$s(null,f,m)};function ca(u,f){Te(Vs,Ys,we.left=u),Te(Vs,kn,we.width=f)}function da(u,f){Te(Vs,bn,we.top=u),Te(Vs,wn,we.height=f)}let hn=L.ori==0?ca:da,gn=L.ori==1?ca:da;function $c(){if(ze&&ee.live)for(let u=l==2?1:0;u<$.length;u++){if(u==0&&yt)continue;let f=ee.values[u],m=0;for(let g in f)jt[u][m++].firstChild.nodeValue=f[g]}}function Il(u,f){if(u!=null&&(u.idxs?u.idxs.forEach((m,g)=>{oe[g]=m}):Ed(u.idx)||oe.fill(u.idx),ee.idx=oe[0]),ze&&ee.live){for(let m=0;m<$.length;m++)(m>0||l==1&&!yt)&&bc(m,oe[m]);$c()}kt=!1,f!==!1&&Qe("setLegend")}n.setLegend=Il;function bc(u,f){let m=$[u],g=u==0&&R==2?Dt:t[u],x;yt?x=m.values(n,u,f)??es:(x=m.value(n,f==null?null:g[f],u,f),x=x==null?es:{_:x}),ee.values[u]=x}function $s(u,f,m){ia=ke,ra=Me,[ke,Me]=J.move(n,ke,Me),J.left=ke,J.top=Me,Re&&(Ns&&qt(Ns,Be(ke),0,ae,Q),Bs&&qt(Bs,0,Be(Me),ae,Q));let g,x=Ge>Ye;Jt=$e,ls=null;let E=L.ori==0?ae:Q,F=L.ori==1?ae:Q;if(ke<0||Xe==0||x){g=J.idx=null;for(let j=0;j<$.length;j++){let H=wt[j];H!=null&&qt(H,-10,-10,ae,Q)}Ps&&Ht(null,Us,!0,u==null&&Fe.setSeries),ee.live&&(oe.fill(g),kt=!0)}else{let j,H,G;l==1&&(j=L.ori==0?ke:Me,H=Wt(j,A),g=J.idx=zt(H,t[0],Ge,Ye),G=z(t[0][g],L,E,0));let Y=-10,Z=-10,ne=0,fe=0,ue=!0,ie="",se="";for(let te=l==2?1:0;te<$.length;te++){let Se=$[te],Pe=oe[te],Ze=Pe==null?null:l==1?t[te][Pe]:t[te][1][Pe],_e=J.dataIdx(n,te,g,H),Oe=_e==null?null:l==1?t[te][_e]:t[te][1][_e];if(kt=kt||Oe!=Ze||_e!=Pe,oe[te]=_e,te>0&&Se.show){let vt=_e==null?-10:_e==g?G:z(l==1?t[0][_e]:t[te][0][_e],L,E,0),ot=Oe==null?-10:V(Oe,l==1?w[Se.scale]:w[Se.facets[1].scale],F,0);if(Ps&&Oe!=null){let St=L.ori==1?ke:Me,At=Ve(Bt.dist(n,te,_e,ot,St));if(At<Jt){let Vt=Bt.bias;if(Vt!=0){let mt=Wt(St,Se.scale),Tt=Oe>=0?1:-1,Pt=mt>=0?1:-1;Pt==Tt&&(Pt==1?Vt==1?Oe>=mt:Oe<=mt:Vt==1?Oe<=mt:Oe>=mt)&&(Jt=At,ls=te)}else Jt=At,ls=te}}if(kt||Os){let St,At;L.ori==0?(St=vt,At=ot):(St=ot,At=vt);let Vt,mt,Tt,Pt,Ut,at,ht=!0,bs=st.bbox;if(bs!=null){ht=!1;let it=bs(n,te);Tt=it.left,Pt=it.top,Vt=it.width,mt=it.height}else Tt=St,Pt=At,Vt=mt=st.size(n,te);if(at=st.fill(n,te),Ut=st.stroke(n,te),Os)te==ls&&Jt<=Bt.prox&&(Y=Tt,Z=Pt,ne=Vt,fe=mt,ue=ht,ie=at,se=Ut);else{let it=wt[te];it!=null&&(zs[te]=Tt,Rs[te]=Pt,Ja(it,Vt,mt,ht),Ya(it,at,Ut),qt(it,Et(Tt),Et(Pt),ae,Q))}}}}if(Os){let te=Bt.prox,Se=_s==null?Jt<=te:Jt>te||ls!=_s;if(kt||Se){let Pe=wt[0];Pe!=null&&(zs[0]=Y,Rs[0]=Z,Ja(Pe,ne,fe,ue),Ya(Pe,ie,se),qt(Pe,Et(Y),Et(Z),ae,Q))}}}if(we.show&&ss)if(u!=null){let[j,H]=Fe.scales,[G,Y]=Fe.match,[Z,ne]=u.cursor.sync.scales,fe=u.cursor.drag;if(Ke=fe._x,Je=fe._y,Ke||Je){let{left:ue,top:ie,width:se,height:te}=u.select,Se=u.scales[Z].ori,Pe=u.posToVal,Ze,_e,Oe,vt,ot,St=j!=null&&G(j,Z),At=H!=null&&Y(H,ne);St&&Ke?(Se==0?(Ze=ue,_e=se):(Ze=ie,_e=te),Oe=w[j],vt=z(Pe(Ze,Z),Oe,E,0),ot=z(Pe(Ze+_e,Z),Oe,E,0),hn(Rt(vt,ot),Ve(ot-vt))):hn(0,E),At&&Je?(Se==1?(Ze=ue,_e=se):(Ze=ie,_e=te),Oe=w[H],vt=V(Pe(Ze,ne),Oe,F,0),ot=V(Pe(Ze+_e,ne),Oe,F,0),gn(Rt(vt,ot),Ve(ot-vt))):gn(0,F)}else Bl()}else{let j=Ve(ia-oa),H=Ve(ra-aa);if(L.ori==1){let ne=j;j=H,H=ne}Ke=et.x&&j>=et.dist,Je=et.y&&H>=et.dist;let G=et.uni;G!=null?Ke&&Je&&(Ke=j>=G,Je=H>=G,!Ke&&!Je&&(H>j?Je=!0:Ke=!0)):et.x&&et.y&&(Ke||Je)&&(Ke=Je=!0);let Y,Z;Ke&&(L.ori==0?(Y=Hs,Z=ke):(Y=Ws,Z=Me),hn(Rt(Y,Z),Ve(Z-Y)),Je||gn(0,F)),Je&&(L.ori==1?(Y=Hs,Z=ke):(Y=Ws,Z=Me),gn(Rt(Y,Z),Ve(Z-Y)),Ke||hn(0,E)),!Ke&&!Je&&(hn(0,0),gn(0,0))}if(et._x=Ke,et._y=Je,u==null){if(m){if(ya!=null){let[j,H]=Fe.scales;Fe.values[0]=j!=null?Wt(L.ori==0?ke:Me,j):null,Fe.values[1]=H!=null?Wt(L.ori==1?ke:Me,H):null}$n(Kl,n,ke,Me,ae,Q,g)}if(Ps){let j=m&&Fe.setSeries,H=Bt.prox;_s==null?Jt<=H&&Ht(ls,Us,!0,j):Jt>H?Ht(null,Us,!0,j):ls!=_s&&Ht(ls,Us,!0,j)}}kt&&(ee.idx=g,Il()),f!==!1&&Qe("setCursor")}let os=null;Object.defineProperty(n,"rect",{get(){return os==null&&_n(!1),os}});function _n(u=!1){u?os=null:(os=S.getBoundingClientRect(),Qe("syncRect",os))}function ua(u,f,m,g,x,E,F){J._lock||ss&&u!=null&&u.movementX==0&&u.movementY==0||(jl(u,f,m,g,x,E,F,!1,u!=null),u!=null?$s(null,!0,!0):$s(f,!0,!1))}function jl(u,f,m,g,x,E,F,j,H){if(os==null&&_n(!1),hs(u),u!=null)m=u.clientX-os.left,g=u.clientY-os.top;else{if(m<0||g<0){ke=-10,Me=-10;return}let[G,Y]=Fe.scales,Z=f.cursor.sync,[ne,fe]=Z.values,[ue,ie]=Z.scales,[se,te]=Fe.match,Se=f.axes[0].side%2==1,Pe=L.ori==0?ae:Q,Ze=L.ori==1?ae:Q,_e=Se?E:x,Oe=Se?x:E,vt=Se?g:m,ot=Se?m:g;if(ue!=null?m=se(G,ue)?i(ne,w[G],Pe,0):-10:m=Pe*(vt/_e),ie!=null?g=te(Y,ie)?i(fe,w[Y],Ze,0):-10:g=Ze*(ot/Oe),L.ori==1){let St=m;m=g,g=St}}H&&(f==null||f.cursor.event.type==Kl)&&((m<=1||m>=ae-1)&&(m=ys(m,ae)),(g<=1||g>=Q-1)&&(g=ys(g,Q))),j?(oa=m,aa=g,[Hs,Ws]=J.move(n,m,g)):(ke=m,Me=g)}const Nl={width:0,height:0,left:0,top:0};function Bl(){In(Nl,!1)}let pa,fa,va,ma;function ha(u,f,m,g,x,E,F){ss=!0,Ke=Je=et._x=et._y=!1,jl(u,f,m,g,x,E,F,!0,!1),u!=null&&(lt(Jl,uo,ga,!1),$n(Ba,n,Hs,Ws,ae,Q,null));let{left:j,top:H,width:G,height:Y}=we;pa=j,fa=H,va=G,ma=Y}function ga(u,f,m,g,x,E,F){ss=et._x=et._y=!1,jl(u,f,m,g,x,E,F,!1,!0);let{left:j,top:H,width:G,height:Y}=we,Z=G>0||Y>0,ne=pa!=j||fa!=H||va!=G||ma!=Y;if(Z&&ne&&In(we),et.setScale&&Z&&ne){let fe=j,ue=G,ie=H,se=Y;if(L.ori==1&&(fe=H,ue=Y,ie=j,se=G),Ke&&ns(A,Wt(fe,A),Wt(fe+ue,A)),Je)for(let te in w){let Se=w[te];te!=A&&Se.from==null&&Se.min!=$e&&ns(te,Wt(ie+se,te),Wt(ie,te))}Bl()}else J.lock&&(J._lock=!J._lock,$s(f,!0,u!=null));u!=null&&(Ls(Jl,uo),$n(Jl,n,ke,Me,ae,Q,null))}function yc(u,f,m,g,x,E,F){if(J._lock)return;hs(u);let j=ss;if(ss){let H=!0,G=!0,Y=10,Z,ne;L.ori==0?(Z=Ke,ne=Je):(Z=Je,ne=Ke),Z&&ne&&(H=ke<=Y||ke>=ae-Y,G=Me<=Y||Me>=Q-Y),Z&&H&&(ke=ke<Hs?0:ae),ne&&G&&(Me=Me<Ws?0:Q),$s(null,!0,!0),ss=!1}ke=-10,Me=-10,oe.fill(null),$s(null,!0,!0),j&&(ss=j)}function _a(u,f,m,g,x,E,F){J._lock||(hs(u),kl(),Bl(),u!=null&&$n(Va,n,ke,Me,ae,Q,null))}function $a(){k.forEach(Vu),xl(n.width,n.height,!0)}ws(ll,tn,$a);const qs={};qs.mousedown=ha,qs.mousemove=ua,qs.mouseup=ga,qs.dblclick=_a,qs.setSeries=(u,f,m,g)=>{let x=Fe.match[2];m=x(n,f,m),m!=-1&&Ht(m,g,!0,!1)},Re&&(lt(Ba,S,ha),lt(Kl,S,ua),lt(Ha,S,u=>{hs(u),_n(!1)}),lt(Wa,S,yc),lt(Va,S,_a),$o.add(n),n.syncRect=_n);const jn=n.hooks=e.hooks||{};function Qe(u,f,m){Ol?mn.push([u,f,m]):u in jn&&jn[u].forEach(g=>{g.call(null,n,f,m)})}(e.plugins||[]).forEach(u=>{for(let f in u.hooks)jn[f]=(jn[f]||[]).concat(u.hooks[f])});const ba=(u,f,m)=>m,Fe=je({key:null,setSeries:!1,filters:{pub:ti,sub:ti},scales:[A,$[1]?$[1].scale:null],match:[si,si,ba],values:[null,null]},J.sync);Fe.match.length==2&&Fe.match.push(ba),J.sync=Fe;const ya=Fe.key,Hl=Dr(ya);function $n(u,f,m,g,x,E,F){Fe.filters.pub(u,f,m,g,x,E,F)&&Hl.pub(u,f,m,g,x,E,F)}Hl.sub(n);function xc(u,f,m,g,x,E,F){Fe.filters.sub(u,f,m,g,x,E,F)&&qs[u](null,f,m,g,x,E,F)}n.pub=xc;function kc(){Hl.unsub(n),$o.delete(n),us.clear(),vo(ll,tn,$a),c.remove(),de==null||de.remove(),Qe("destroy")}n.destroy=kc;function Wl(){Qe("init",e,t),Qo(t||e.data,!1),q[A]?zl(A,q[A]):kl(),An=we.show&&(we.width>0||we.height>0),ms=kt=!0,xl(e.width,e.height)}return $.forEach(Ko),k.forEach(tc),s?s instanceof HTMLElement?(s.appendChild(c),Wl()):s(n,Wl):Wl(),n}nt.assign=je;nt.fmtNum=Io;nt.rangeNum=ol;nt.rangeLog=vl;nt.rangeAsinh=Ro;nt.orient=Cs;nt.pxRatio=ve;nt.join=zd;nt.fmtDate=No,nt.tzDate=qd;nt.sync=Dr;{nt.addGap=Eu,nt.clipGaps=gl;let e=nt.paths={points:Fr};e.linear=jr,e.stepped=Du,e.bars=Au,e.spline=Ou}function Uu(e){let t;return{hooks:{init(s){t=document.createElement("div"),t.className="chart-tooltip",t.style.display="none",s.over.appendChild(t)},setCursor(s){const n=s.cursor.idx;if(n==null||!s.data[1]||s.data[1][n]==null){t.style.display="none";return}const l=s.data[0][n],o=s.data[1][n],a=new Date(l*1e3).toLocaleTimeString([],{hourCycle:"h23"});t.innerHTML=`<b>${e?e(o):I(o)}</b> ${a}`;const i=Math.round(s.valToPos(l,"x"));t.style.left=Math.min(i,s.over.clientWidth-80)+"px",t.style.display=""}}}}function qu(e,t){if(typeof document>"u")return`rgba(100,100,100,${t})`;const s=document.createElement("span");s.style.color=e,document.body.appendChild(s);const n=getComputedStyle(s).color;s.remove();const l=n.match(/[\d.]+/g);return l&&l.length>=3?`rgba(${l[0]},${l[1]},${l[2]},${t})`:`rgba(100,100,100,${t})`}function Wr({data:e,color:t,smooth:s,height:n,yMax:l,fmtVal:o}){const a=ut(null),i=ut(null),r=n||55;return me(()=>{if(!a.current||!e||e[0].length<2)return;const c=s?Kc(e[1]):e[1],v=[e[0],c];if(i.current){i.current.setData(v);return}const p=l?(b,S,D)=>[0,Math.max(l,D*1.05)]:(b,S,D)=>[Math.max(0,S*.9),D*1.1],h={width:a.current.clientWidth||200,height:r,padding:[2,0,4,0],cursor:{show:!0,x:!0,y:!1,points:{show:!1}},legend:{show:!1},select:{show:!1},scales:{x:{time:!0},y:{auto:!0,range:p}},axes:[{show:!1,size:0,gap:0},{show:!1,size:0,gap:0}],series:[{},{stroke:t,width:1.5,fill:qu(t,.09)}],plugins:[Uu(o)]};return i.current=new nt(h,v,a.current),()=>{i.current&&(i.current.destroy(),i.current=null)}},[e,t,s]),me(()=>{if(!i.current||!a.current)return;const c=new ResizeObserver(()=>{i.current&&a.current&&i.current.setSize({width:a.current.clientWidth,height:r})});return c.observe(a.current),()=>c.disconnect()},[]),d`<div class="chart-wrap" role="img" aria-label="Sparkline chart" style=${"height:"+r+"px"} ref=${a}></div>`}function rs({label:e,value:t,valColor:s,data:n,chartColor:l,smooth:o,refLines:a,yMax:i,dp:r}){const c=ce(()=>{if(!n||!n[1]||n[1].length<2)return[];const v=i?Math.max(i,n[1].reduce((p,h)=>Math.max(p,h),0)*1.05):n[1].reduce((p,h)=>Math.max(p,h),0)*1.1;return(a||[]).map(p=>{if(v<=0)return null;const h=(1-p.value/v)*100;return h>=0&&h<=95?{...p,pct:h}:null}).filter(Boolean)},[n,a,i]);return d`<div class="chart-box" role="img" aria-label=${"Chart: "+e+" — current value: "+(t||"no data")} ...${r?{"data-dp":r}:{}}>
    <div class="chart-hdr">
      <span class="chart-label">${e}</span>
      <span class="chart-val" style=${"color:"+(s||l||"var(--accent)")} aria-live="polite" aria-atomic="true">${t}</span>
    </div>
    <div style="position:relative">
      ${c.map(v=>d`<Fragment>
          <div class="chart-ref-line" style=${"top:"+v.pct+"%"} />
          <div class="chart-ref-label" style=${"top:calc("+v.pct+"% - 8px)"}>${v.label}</div>
        </Fragment>`)}
      ${n&&n[0].length>=2?d`<${Wr} data=${n} color=${l||"var(--accent)"} smooth=${o} yMax=${i}/>`:d`<div class="chart-wrap text-muted" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem">collecting...</div>`}
    </div>
  </div>`}function yo({label:e,value:t,accent:s,dp:n,sm:l}){const o=ut(t),[a,i]=K(!1);return me(()=>{o.current!==t&&(i(!0),setTimeout(()=>i(!1),500)),o.current=t},[t]),d`<div class=${"metric"+(l?" metric--sm":"")} aria-label="${e}: ${t}" ...${n?{"data-dp":n}:{}}>
    <div class="label">${e}</div>
    <div class=${"value"+(s?" accent":"")+(a?" flash":"")} aria-live="polite" aria-atomic="true">${t}</div>
  </div>`}function wi({snap:e,mode:t}){if(!e)return null;const s=!t||t==="files",n=!t||t==="traffic",l=e.tools.filter(r=>r.tool!=="aictl"&&r.files.length),o=l.reduce((r,c)=>r+c.files.length,0)||1,a=e.tools.filter(r=>r.tool!=="aictl"&&r.live&&(r.live.outbound_rate_bps||r.live.inbound_rate_bps)),i=a.reduce((r,c)=>r+(c.live.outbound_rate_bps||0)+(c.live.inbound_rate_bps||0),0)||1;return d`
    ${s&&l.length>0&&d`<div class="rbar-block" data-dp="overview.csv_footprint_bar" role="img" aria-label=${"CSV footprint: "+l.map(r=>r.label+" "+r.files.length+" files").join(", ")}>
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${l.map(r=>d`
        <div class="rbar-seg" style=${"width:"+(r.files.length/o*100).toFixed(1)+"%;background:"+(Ae[r.tool]||"var(--fg2)")}
          title="${r.label}: ${r.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${l.map(r=>d`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Ae[r.tool]||"var(--fg2)")}></span>
          ${r.label} <span class="text-muted">${r.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${n&&d`<div class="rbar-block" data-dp="overview.live_traffic_bar" role="img" aria-label=${"Live traffic: "+(a.length?a.map(r=>r.label).join(", "):"no active traffic")}>
      <div class="rbar-title">Live Traffic${a.length===0?" — no active traffic":""}</div>
      <div class="rbar">${a.map(r=>{const c=(r.live.outbound_rate_bps||0)+(r.live.inbound_rate_bps||0);return d`<div class="rbar-seg" style=${"width:"+(c/i*100).toFixed(1)+"%;background:"+(Ae[r.tool]||"var(--fg2)")}
          title="${r.label}: ${Ft(c)}"></div>`})}
      </div>
      <div class="rbar-legend">${a.map(r=>{const c=(r.live.outbound_rate_bps||0)+(r.live.inbound_rate_bps||0);return d`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${"background:"+(Ae[r.tool]||"var(--fg2)")}></span>
          ${r.label} <span class="text-muted">${Ft(c)}</span>
        </span>`})}
      </div>
    </div>`}
    ${!t&&!l.length&&!a.length&&d`<div class="empty-state">No AI tool resources found yet.</div>`}`}function Gu({path:e,onClose:t}){const{snap:s}=tt(Ue),[n,l]=K(null),[o,a]=K(!1),[i,r]=K(null),c=ut(null),v=ut(null),[p,h]=K(()=>{try{return parseInt(localStorage.getItem("aictl-viewer-width"))||55}catch{return 55}}),b=ut(!1),S=ut(0),D=ut(0),T=We(A=>{b.current=!0,S.current=A.clientX,D.current=p,A.preventDefault()},[p]);if(me(()=>{const A=O=>{if(!b.current)return;const _=S.current-O.clientX,C=window.innerWidth,L=Math.min(90,Math.max(20,D.current+_/C*100));h(L)},P=()=>{if(b.current){b.current=!1;try{localStorage.setItem("aictl-viewer-width",String(Math.round(p)))}catch{}}};return window.addEventListener("mousemove",A),window.addEventListener("mouseup",P),()=>{window.removeEventListener("mousemove",A),window.removeEventListener("mouseup",P)}},[p]),me(()=>{if(!e)return;v.current=document.activeElement;const A=setTimeout(()=>{var _;const O=(_=c.current)==null?void 0:_.querySelector("button");O&&O.focus()},50),P=O=>{if(O.key!=="Tab"||!c.current)return;const _=c.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');if(!_.length)return;const C=_[0],L=_[_.length-1];O.shiftKey&&document.activeElement===C?(O.preventDefault(),L.focus()):!O.shiftKey&&document.activeElement===L&&(O.preventDefault(),C.focus())};return document.addEventListener("keydown",P),()=>{clearTimeout(A),document.removeEventListener("keydown",P),v.current&&v.current.focus&&v.current.focus()}},[e]),me(()=>{e&&(a(!1),r(null),Ao(e).then(l).catch(A=>r(A.message)))},[e]),!e)return null;const y=ce(()=>{if(!s)return"";for(const A of s.tools)for(const P of A.files)if(P.path===e)return(P.kind||"")+" | "+xe(P.size)+" | ~"+I(P.tokens)+"tok | scope:"+(P.scope||"?")+" | sent_to_llm:"+(P.sent_to_llm||"?")+" | loaded:"+(P.loaded_when||"?");for(const A of s.agent_memory)if(A.file===e)return A.source+" | "+A.profile+" | "+A.tokens+"tok | "+A.lines+"ln";return""},[s,e]),$=n?n.split(`
`):[],k=$.length,w=k>Gs*2,N=(A,P)=>A.map((O,_)=>d`<div class="fv-line"><span class="fv-ln">${P+_}</span><span class="fv-code">${X(O)||" "}</span></div>`);return d`<div class="fv" ref=${c} role="dialog" aria-modal="true" aria-label="File viewer" style=${"width:"+p+"vw"}>
    <div class="file-viewer__resize-handle" onMouseDown=${T}/>
    <div class="fv-head">
      <span class="path">${e}</span>
      <button onClick=${t} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${y}</div>
    <div class="fv-body">
      ${i?d`<p class="text-red" style="padding:var(--sp-10)">${i}</p>`:n?!w||o?d`<div class="fv-lines">${N($,1)}</div>`:d`<div class="fv-lines">${N($.slice(0,Gs),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>a(!0)}>\u25BC ${k-Gs*2} more lines \u25BC</div>
            <div class="fv-lines">${N($.slice(-Gs),k-Gs+1)}</div>`:d`<p class="text-muted" style="padding:var(--sp-10)">Loading...</p>`}
    </div>
    <div class="fv-toolbar">
      <span>${k} lines${w&&!o?" (showing "+Gs*2+" of "+k+")":""}</span>
      ${w&&d`<button onClick=${()=>a(!o)}>${o?"Collapse":"Show all"}</button>`}
    </div>
  </div>`}function xo({file:e,dirPrefix:t}){var A;const[s,n]=K(!1),[l,o]=K(!1),[a,i]=K(null),[r,c]=K(null),[v,p]=K(!1),h=tt(Ue),b=(e.path||"").replace(/\\/g,"/").split("/").pop(),S=(e.sent_to_llm||"").toLowerCase(),D=e.mtime&&Date.now()/1e3-e.mtime<300,T=(A=h.recentFiles)==null?void 0:A.get(e.path),y=!!T,$=We(async()=>{if(s){n(!1);return}n(!0),p(!0),c(null);try{const P=await Ao(e.path);i(P)}catch(P){c(P.message)}finally{p(!1)}},[s,e.path]),k=(P,O)=>P.map((_,C)=>d`<span class="pline"><span class="ln">${O+C}</span>${X(_)||" "}</span>`),w=()=>{if(v)return d`<span class="text-muted">loading...</span>`;if(r)return d`<span class="text-red">${r}</span>`;if(!a)return null;const P=a.split(`
`),O=P.length;if(O<=en*3||l)return d`${k(P,1)}
        <div class="prev-actions">
          ${l&&d`<button class="prev-btn" onClick=${()=>o(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>h.openViewer(e.path)}>open in viewer</button>
        </div>`;const C=P.slice(-en),L=O-en+1;return d`${k(C,L)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>o(!0)}>show all (${O} lines)</button>
        <button class="prev-btn" onClick=${()=>h.openViewer(e.path)}>open in viewer</button>
      </div>`},N=e.size>0?Math.round(e.size/60):0;return d`<div>
    <button class="fitem" onClick=${$} aria-expanded=${s} title=${e.path}>
      ${y?d`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${It(T.ts)}${T.growth>0?" +"+xe(T.growth):""}">●</span>`:D?d`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${It(e.mtime)}">●</span>`:d`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${t?d`<span class="text-muted">${t}/</span>`:""}${X(b)}</span>
      <span class="fmeta">
        ${S&&S!=="no"&&d`<span style="color:${sr(S)};font-size:var(--fs-xs);margin-right:var(--sp-1)" title="sent_to_llm: ${S}">${S==="yes"?"◆":S==="on-demand"?"◇":"○"}</span>`}
        ${xe(e.size)}${N?d` <span class="text-muted">${N}ln</span>`:""}${e.tokens?d` <span class="text-muted">${I(e.tokens)}t</span>`:""}
        ${e.mtime&&D?d` <span class="text-orange text-xs">${It(e.mtime)}</span>`:""}
      </span>
    </button>
    ${s&&d`<div class="inline-preview">${w()}</div>`}
  </div>`}function Yu({dir:e,files:t}){const[s,n]=K(!1),l=t.reduce((a,i)=>a+i.tokens,0),o=t.reduce((a,i)=>a+i.size,0);return d`<div class="cat-group" style=${{marginLeft:"var(--sp-5)"}}>
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-muted" title=${e}>${X(e)}</span>
      <span class="badge">${t.length}</span>
      <span class="badge">${xe(o)}</span>
      <span class="badge">${I(l)}t</span>
    </button>
    ${s&&d`<div style=${{paddingLeft:"var(--sp-8)"}}>${t.map(a=>d`<${xo} key=${a.path} file=${a}/>`)}</div>`}
  </div>`}function Ku({label:e,files:t,root:s,badge:n,style:l,startOpen:o}){const[a,i]=K(!!o),r=ce(()=>Yc(t,s),[t,s]),c=ce(()=>t.reduce((b,S)=>b+S.tokens,0),[t]),v=ce(()=>t.reduce((b,S)=>b+S.size,0),[t]),p=ce(()=>{var S;const b={};return t.forEach(D=>{const T=(D.sent_to_llm||"no").toLowerCase();b[T]=(b[T]||0)+1}),((S=Object.entries(b).sort((D,T)=>T[1]-D[1])[0])==null?void 0:S[0])||"no"},[t]),h=()=>r.length===1&&r[0][1].length<=3?r[0][1].map(b=>d`<${xo} key=${b.path} file=${b}/>`):r.map(([b,S])=>S.length===1?d`<div style=${{marginLeft:"var(--sp-5)"}}><${xo} key=${S[0].path} file=${S[0]} dirPrefix=${b}/></div>`:d`<${Yu} key=${b} dir=${b} files=${S}/>`);return d`<div class="cat-group" style=${l||""}>
    <button class=${"cat-head"+(a?" open":"")} onClick=${()=>i(!a)} aria-expanded=${a}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${sr(p)};margin-right:var(--sp-1);flex-shrink:0" title="sent_to_llm: ${p}"></span>
      <span class="cat-label" title=${e}>${X(e)}</span>
      <span class="badge" style="flex-shrink:0">${n||t.length}</span>
      <span class="badge">${xe(v)}</span>
      <span class="badge">${I(c)}t</span>
    </button>
    ${a&&d`<div style=${{paddingLeft:"var(--sp-8)"}}>${h()}</div>`}
  </div>`}function to({label:e,data:t,color:s}){const n=ut(null);return me(()=>{const l=n.current;if(!l||!t||t.length<2)return;const o=l.getContext("2d"),a=l.width=l.offsetWidth*(window.devicePixelRatio||1),i=l.height=l.offsetHeight*(window.devicePixelRatio||1);o.clearRect(0,0,a,i);const r=t.slice(-60),c=Math.max(...r)*1.1||1,v=a/(r.length-1);o.beginPath(),o.strokeStyle=s,o.lineWidth=1.5*(window.devicePixelRatio||1),r.forEach((p,h)=>{const b=h*v,S=i-p/c*i*.85;h===0?o.moveTo(b,S):o.lineTo(b,S)}),o.stroke()},[t,s]),d`<div style="position:relative;height:25px">
    <span class="text-muted" style="position:absolute;top:0;left:0;font-size:var(--fs-2xs);z-index:1">${e}</span>
    <canvas ref=${n} aria-hidden="true" style="width:100%;height:100%;display:block"/>
  </div>`}function Ju({processes:e,maxMem:t}){if(!e||!e.length)return null;const s=e.reduce((a,i)=>a+(parseFloat(i.mem_mb)||0),0),n=e.reduce((a,i)=>a+(parseFloat(i.cpu_pct)||0),0),l={};e.forEach(a=>{const i=a.process_type||"process";(l[i]=l[i]||[]).push(a)});const o=Object.keys(l).length>1;return d`<div class="proc-section">
    <h3>Processes <span class="badge">${e.length}</span>
      <span class="badge">CPU ${ge(n)}</span>
      <span class="badge">MEM ${xe(s*1048576)}</span></h3>
    ${Object.entries(l).map(([a,i])=>{const r={};return i.forEach(c=>(r[c.name||"unknown"]=r[c.name||"unknown"]||[]).push(c)),d`<div style="margin-bottom:var(--sp-2)">
        ${o?d`<div class="text-muted" style="font-size:var(--fs-base);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-1)">${X(a)}</div>`:null}
        ${Object.entries(r).map(([c,v])=>{const p=v.sort((h,b)=>(parseFloat(b.mem_mb)||0)-(parseFloat(h.mem_mb)||0));return d`<div key=${c} style="margin-bottom:var(--sp-2)">
            <div class="text-muted" style="font-size:var(--fs-sm);margin-bottom:2px">
              ${o?"":d`<span style="text-transform:uppercase;letter-spacing:0.03em">${X(a)}</span>${" · "}`}${X(c)} <span style="opacity:0.6">(${v.length})</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:var(--sp-1)">
              ${p.map(h=>{const b=parseFloat(h.cpu_pct)||0,S=parseFloat(h.mem_mb)||0,D=Math.max(2,Math.min(b,100)),T=b>80?"var(--red)":b>50?"var(--orange)":b>5?"var(--green)":"var(--fg2)",y=h.anomalies&&h.anomalies.length,$=h.zombie_risk&&h.zombie_risk!=="none";return d`<div key=${h.pid}
                  style="padding:3px var(--sp-2);background:var(--bg);border-radius:3px;
                    font-size:var(--fs-xs);line-height:1.3;
                    ${y?"border-left:2px solid var(--red);":""}${$?"border-left:2px solid var(--orange);":""}"
                  title=${h.cmdline||h.name}>
                  <div style="display:flex;align-items:center;gap:4px">
                    <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
                      <div style="width:${D}%;height:100%;background:${T};border-radius:2px"></div>
                    </div>
                    <span style="color:${T};min-width:3ch;text-align:right">${ge(b)}</span>
                  </div>
                  <div class="mono text-muted">${h.pid}</div>
                  <div>${xe(S*1048576)}</div>
                  ${y?d`<div class="text-red">\u26A0${h.anomalies.length}</div>`:null}
                </div>`})}
            </div>
          </div>`})}
      </div>`})}
  </div>`}function Qu({config:e}){if(!e)return null;const t=Object.entries(e.settings||{}),s=Object.entries(e.features||{}),n=(e.mcp_servers||[]).length>0,l=(e.extensions||[]).length>0,o=e.otel||{},a=e.hints||[];return!t.length&&!s.length&&!n&&!l&&!o.enabled&&!a.length&&e.model==null&&e.launch_at_startup==null?null:d`<div class="live-section">
    <h3>Configuration
      ${e.launch_at_startup===!0&&d`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${e.launch_at_startup===!1&&d`<span class="badge">no auto-start</span>`}
      ${e.auto_update===!0&&d`<span class="badge">auto-update</span>`}
      ${e.model&&d`<span class="badge">${e.model}</span>`}
      ${o.enabled&&d`<span class="badge" style="background:var(--green);color:var(--bg)">OTel ${o.exporter||"on"}</span>`}
      ${!o.enabled&&o.source&&d`<span class="badge" style="background:var(--orange);color:var(--bg)">OTel off</span>`}
    </h3>
    <div class="metric-grid">
      ${o.enabled&&d`<div class="metric-chip" style="border-color:var(--green)">
        <span class="mlabel text-green">OpenTelemetry</span>
        <div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Exporter:</span> <span class="mono">${o.exporter}</span>
        </div>
        ${o.endpoint&&d`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">Endpoint:</span> <span class="mono">${o.endpoint}</span>
        </div>`}
        ${o.file_path&&d`<div style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">File:</span> <span class="mono">${o.file_path}</span>
        </div>`}
        ${o.capture_content&&d`<div class="text-orange" style="font-size:var(--fs-base);padding:0.05rem 0">\u26A0 Content capture enabled</div>`}
      </div>`}
      ${t.length>0&&d`<div class="metric-chip">
        <span class="mlabel">Settings</span>
        ${t.map(([i,r])=>d`<div key=${i} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${i}</span>
          <span class="mono">${typeof r=="object"?JSON.stringify(r):String(r)}</span>
        </div>`)}
      </div>`}
      ${Object.entries(e.feature_groups||{}).map(([i,r])=>d`<div key=${i} class="metric-chip">
        <span class="mlabel">${i}</span>
        ${Object.entries(r).map(([c,v])=>d`<div key=${c} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${c}</span>
          <span style="color:${v===!0?"var(--green)":v===!1?"var(--red)":"var(--fg)"}">${typeof v=="object"?JSON.stringify(v):String(v)}</span>
        </div>`)}
      </div>`)}
      ${s.length>0&&!Object.keys(e.feature_groups||{}).length&&d`<div class="metric-chip">
        <span class="mlabel">Features</span>
        ${s.map(([i,r])=>d`<div key=${i} class="flex-between" style="font-size:var(--fs-base);padding:0.05rem 0">
          <span class="text-muted">${i}</span>
          <span style="color:${r===!0?"var(--green)":r===!1?"var(--red)":"var(--fg)"}">${String(r)}</span>
        </div>`)}
      </div>`}
      ${n&&d`<div class="metric-chip">
        <span class="mlabel">MCP Servers</span>
        <div class="stack-list">${e.mcp_servers.map((i,r)=>d`<span class="pill mono" key=${i||r}>${i}</span>`)}</div>
      </div>`}
      ${l&&d`<div class="metric-chip">
        <span class="mlabel">Extensions</span>
        <div class="stack-list">${e.extensions.map(i=>d`<span class="pill mono" key=${i}>${i}</span>`)}</div>
      </div>`}
    </div>
    ${a.length>0&&d`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
      ${a.map(i=>d`<div class="text-orange" style="font-size:var(--fs-base);padding:0.15rem 0">
        <span style="margin-right:var(--sp-3)">\u{1F4A1}</span>${i}
      </div>`)}
    </div>`}
  </div>`}function Zu({telemetry:e}){if(!e)return null;const t=e,s=(t.input_tokens||0)+(t.output_tokens||0),n=t.errors||[],l=t.quota_state||{};if(!s&&!t.active_session_input&&!n.length)return null;const[o,a]=K(!1);return d`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${t.source}</span> <span class="badge">${ge(t.confidence*100)} confidence</span>
      ${n.length>0&&d`<span class="badge warn cursor-ptr" onClick=${i=>{i.stopPropagation(),a(!o)}}>${n.length} error${n.length>1?"s":""}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${He(t.input_tokens||0)} tok</span>
        <span class="msub">cache read: ${He(t.cache_read_tokens||0)} tok \u00B7 creation: ${He(t.cache_creation_tokens||0)} tok</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${He(t.output_tokens||0)} tok</span>
        <span class="msub">${I(t.total_sessions||0)} sessions \u00B7 ${I(t.total_messages||0)} messages</span>
      </div>
      ${t.cost_usd>0?d`<div class="metric-chip">
        <span class="mlabel">Estimated Cost</span>
        <span class="mvalue">$${t.cost_usd.toFixed(2)}</span>
      </div>`:null}
      ${(l.premium_requests_used>0||l.total_api_duration_ms>0)&&d`<div class="metric-chip">
        <span class="mlabel">Operational</span>
        ${l.premium_requests_used>0&&d`<div style="font-size:var(--fs-base)">Premium requests: <span class="mono">${l.premium_requests_used}</span></div>`}
        ${l.total_api_duration_ms>0&&d`<div style="font-size:var(--fs-base)">API time: <span class="mono">${Math.round(l.total_api_duration_ms/1e3)}s</span></div>`}
        ${l.current_model&&d`<div style="font-size:var(--fs-base)">Model: <span class="mono">${l.current_model}</span></div>`}
        ${l.code_changes&&d`<div class="text-green" style="font-size:var(--fs-base)">+${l.code_changes.lines_added} -${l.code_changes.lines_removed} (${l.code_changes.files_modified} files)</div>`}
      </div>`}
      ${t.active_session_input>0||t.active_session_output>0?d`<div class="metric-chip" style="border-color:var(--accent)">
        <span class="mlabel">Active Session</span>
        <span class="mvalue">${He((t.active_session_input||0)+(t.active_session_output||0))} tok</span>
        <span class="msub">in: ${He(t.active_session_input||0)} \u00B7 out: ${He(t.active_session_output||0)} \u00B7 ${t.active_session_messages||0} msgs</span>
      </div>`:null}
      ${Object.keys(t.by_model||{}).length>0?d`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(t.by_model).map(([i,r])=>d`<div key=${i} class="flex-between flex-wrap" style="font-size:0.75rem;padding:0.1rem 0;gap:0.2rem">
          <span class="mono">${i}</span>
          <span>in:${He(r.input_tokens||0)} tok out:${He(r.output_tokens||0)} tok${r.cache_read_tokens?" cR:"+He(r.cache_read_tokens)+" tok":""}${r.requests?" · "+r.requests+"req":""}${r.cost_usd?" · $"+r.cost_usd.toFixed(2):""}</span>
        </div>`)}
      </div>`:null}
    </div>
    ${o&&n.length>0&&d`<div class="mt-sm" style="padding:var(--sp-4) var(--sp-6);border-left:3px solid var(--red);background:color-mix(in srgb,var(--red) 8%,transparent);border-radius:0 4px 4px 0;max-height:10rem;overflow-y:auto">
      <div class="text-red text-bold" style="font-size:var(--fs-base);margin-bottom:0.2rem">Recent Errors</div>
      ${n.map(i=>d`<div class="flex-row gap-sm" style="font-size:0.68rem;padding:0.1rem 0">
        <span class="mono text-muted text-nowrap">${(i.timestamp||"").slice(11,19)}</span>
        <span class="badge" style="font-size:var(--fs-xs);background:var(--red);color:var(--bg);padding:0.05rem var(--sp-2)">${i.type}</span>
        <span class="text-muted">${i.message}</span>
        ${i.model&&d`<span class="mono text-muted">${i.model}</span>`}
      </div>`)}
    </div>`}
  </div>`}function Xu({live:e}){if(!e)return null;const t=e.token_estimate||{},s=e.mcp||{},n=Do(e);return d`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${e.session_count||0} sess</span>
      <span class="badge">${e.pid_count||0} pid</span>
      <span class="badge">${ge((e.confidence||0)*100)} conf</span>
      ${s.detected&&d`<span class="badge warn">${s.loops||0} MCP loop${(s.loops||0)===1?"":"s"}</span>`}
    </h3>
    <div class="metric-grid" aria-live="polite" aria-relevant="text" aria-atomic="false">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">\u2191 ${Ft(e.outbound_rate_bps||0)}</span>
        <span class="msub">\u2193 ${Ft(e.inbound_rate_bps||0)} total ${xe((e.outbound_bytes||0)+(e.inbound_bytes||0))}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Tokens</span>
        <span class="mvalue">${I(n)}</span>
        <span class="msub">${t.source||"network-inference"} at ${ge((t.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">MCP</span>
        <span class="mvalue">${s.detected?"Detected":"No loop"}</span>
        <span class="msub">${s.loops||0} loops at ${ge((s.confidence||0)*100)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Context</span>
        <span class="mvalue">${e.files_touched||0} files</span>
        <span class="msub">${e.file_events||0} events \u00B7 repo ${xe((e.workspace_size_mb||0)*1048576)}</span>
      </div>
      ${(e.state_bytes_written||0)>0&&d`<div class="metric-chip">
        <span class="mlabel">State Writes</span>
        <span class="mvalue">${xe(e.state_bytes_written||0)}</span>
      </div>`}
      <div class="metric-chip">
        <span class="mlabel">CPU</span>
        <span class="mvalue">${ge(e.cpu_percent||0)}</span>
        <span class="msub">peak ${ge(e.peak_cpu_percent||0)}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Workspaces</span>
        <span class="mvalue">${(e.workspaces||[]).length||0}</span>
        <span class="msub mono">${(e.workspaces||[]).slice(0,2).join(" | ")||"(unknown)"}</span>
      </div>
    </div>
  </div>`}function ko({tool:e,root:t}){var w,N,A,P,O,_,C,L;const[s,n]=K(!1),{snap:l,history:o}=tt(Ue),a=ce(()=>((l==null?void 0:l.tool_configs)||[]).find(R=>R.tool===e.tool),[l,e.tool]),i=ce(()=>{var R;return(R=o==null?void 0:o.by_tool)==null?void 0:R[e.tool]},[o,e.tool]),r=Ae[e.tool]||"var(--fg2)",c=$t[e.tool]||"🔹",v=e.files.reduce((R,z)=>R+z.tokens,0),p=e.processes.filter(R=>R.anomalies&&R.anomalies.length).length,h=Do(e.live),b=(((w=e.live)==null?void 0:w.outbound_rate_bps)||0)+(((N=e.live)==null?void 0:N.inbound_rate_bps)||0),S=e.processes.reduce((R,z)=>R+(parseFloat(z.cpu_pct)||0),0),D=e.processes.reduce((R,z)=>R+(parseFloat(z.mem_mb)||0),0),T=ce(()=>Math.max(...e.processes.map(R=>parseFloat(R.mem_mb)||0),100),[e.processes]),y=(((P=(A=e.token_breakdown)==null?void 0:A.telemetry)==null?void 0:P.errors)||[]).length,$=ce(()=>{const R={};return e.files.forEach(z=>{const V=z.kind||"other";(R[V]=R[V]||[]).push(z)}),Object.keys(R).sort((z,V)=>{const q=Ra.indexOf(z),le=Ra.indexOf(V);return(q<0?99:q)-(le<0?99:le)}).map(z=>({kind:z,files:R[z]}))},[e.files]),k="tcard"+(s?" open":"")+(p||y?" has-anomaly":"");return d`<div class=${k}>
    <button class="tcard-head" onClick=${()=>n(!s)} aria-expanded=${s}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:var(--sp-2)">${c}</span>${X(e.label)}</h2>
      <span class="badge" data-dp="procs.tool.files">${e.files.length} files</span>
      <span class="badge" data-dp="procs.tool.tokens">${I(v)} tok</span>
      ${e.processes.length>0&&d`<span class="badge" data-dp="procs.tool.process_count">${e.processes.length} proc ${ge(S)} ${xe(D*1048576)}</span>`}
      ${e.mcp_servers.length>0&&d`<span class="badge" data-dp="procs.tool.mcp_server_count">${e.mcp_servers.length} MCP</span>`}
      ${p>0&&d`<span class="badge warn" data-dp="procs.tool.anomaly">${p} anomaly</span>`}
      ${y>0&&d`<span class="badge" style="background:var(--red);color:var(--bg)">${y} error${y>1?"s":""}</span>`}
      ${e.live&&d`<span class="badge" style="background:var(--accent);color:var(--bg)">${e.live.session_count||0} live \u00B7 ${Ft(b)}${h>0?" · "+I(h)+"tok":""}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:0.1rem">
        ${$.map(({kind:R,files:z})=>d`<span class="text-muted" style="font-size:var(--fs-xs)">${R}:${z.length}</span>`)}
      </div>
      ${i&&i.ts.length>2&&!s&&d`<div role="img" aria-label=${"Sparkline charts for "+e.label} style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:0.2rem" onClick=${R=>R.stopPropagation()}>
        <${to} label="CPU" data=${i.cpu} color=${r}/>
        <${to} label="MEM" data=${i.mem_mb} color=${"var(--green)"}/>
        <${to} label=${e.live?"Traffic":"Tokens"} data=${e.live?i.traffic:i.tokens} color=${"var(--orange)"}/>
      </div>`}
    </button>
    ${s&&d`<div class="tcard-body">
      ${((O=za[e.tool])==null?void 0:O.length)>0&&d`<div class="tool-relationships">
        ${za[e.tool].map(R=>d`<span key=${R.label} class="rel-badge rel-${R.type}"
          title=${R.label}>${R.label}</span>`)}
      </div>`}
      <${Qu} config=${a}/>
      <${Zu} telemetry=${(_=e.token_breakdown)==null?void 0:_.telemetry}/>
      <${Xu} live=${e.live}/>
      ${$.map(({kind:R,files:z})=>d`<${Ku} key=${R} label=${R} files=${z} root=${t}/>`)}
      <${Ju} processes=${(L=(C=e.live)==null?void 0:C.processes)!=null&&L.length?e.live.processes:e.processes} maxMem=${T}/>
      ${e.mcp_servers.length>0&&d`<div class="proc-section"><h3>MCP Servers</h3>
        ${e.mcp_servers.map(R=>d`<div key=${R.name||R.pid||""} class="fitem" style="cursor:default">
          <span class="fpath text-green">${X(R.name)}</span>
          <span class="fmeta">${X((R.config||{}).command||"")} ${((R.config||{}).args||[]).join(" ").slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`}function ep({groupKey:e,groupLabel:t,groupColor:s,tools:n,root:l}){const[o,a]=K(!0),i=n.reduce((c,v)=>c+v.files.length,0),r=n.reduce((c,v)=>c+v.files.reduce((p,h)=>p+h.tokens,0),0);return d`<div class="mb-md">
    <button onClick=${()=>a(!o)} aria-expanded=${o}
      class="flex-row gap-sm cursor-ptr" style="background:none;border:none;padding:var(--sp-3) 0;font:inherit;color:var(--fg);width:100%">
      <span style="font-size:var(--fs-xs);transition:transform 0.15s;${o?"transform:rotate(90deg)":""}">\u25B6</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${s};flex-shrink:0"></span>
      <span class="text-bolder" style="font-size:var(--fs-lg)">${t}</span>
      <span class="badge">${n.length} tools</span>
      <span class="badge">${i} files</span>
      <span class="badge">${I(r)} tok</span>
    </button>
    ${o&&d`<div class="tool-grid" style="margin-top:var(--sp-3)">
      ${n.map(c=>d`<${ko} key=${c.tool} tool=${c} root=${l}/>`)}
    </div>`}
  </div>`}function tp(){const{snap:e}=tt(Ue),[t,s]=K("product"),n=r=>r.files.length||r.processes.length||r.mcp_servers.length||r.live,l=(r,c)=>{const v=r.files.length*2+r.processes.length+r.mcp_servers.length;return c.files.length*2+c.processes.length+c.mcp_servers.length-v||r.tool.localeCompare(c.tool)},o=ce(()=>e?e.tools.filter(r=>!r.meta&&n(r)).sort(l):[],[e]),a=ce(()=>e?e.tools.filter(r=>r.meta&&r.tool!=="project-env"&&n(r)).sort(l):[],[e]),i=ce(()=>{if(t==="product"||!o.length)return null;const r={};return o.forEach(c=>{if(t==="vendor"){const v=c.vendor||"community",p=er[v]||v,h=zc[v]||"var(--fg2)";r[v]||(r[v]={label:p,color:h,tools:[]}),r[v].tools.push(c)}else{const v=(c.host||"any").split(",");for(const p of v){const h=p.trim(),b=Rc[h]||h,S="var(--fg2)";r[h]||(r[h]={label:b,color:S,tools:[]}),r[h].tools.push(c)}}}),Object.entries(r).sort((c,v)=>{const p=c[1].tools.reduce((b,S)=>b+S.files.length,0);return v[1].tools.reduce((b,S)=>b+S.files.length,0)-p})},[o,t]);return e?!o.length&&!a.length?d`<p class="empty-state">No AI tool resources found.</p>`:d`<div>
    <div class="range-bar" style="margin-bottom:var(--sp-5)">
      <span class="range-label">Group by:</span>
      ${Bc.map(r=>d`<button key=${r.id}
        class=${t===r.id?"range-btn active":"range-btn"}
        onClick=${()=>s(r.id)}>${r.label}</button>`)}
    </div>
    ${o.length>0&&(i?i.map(([r,c])=>d`<${ep} key=${r}
      groupKey=${r} groupLabel=${c.label} groupColor=${c.color}
      tools=${c.tools} root=${e.root}/>`):d`<div class="tool-grid">
        ${o.map(r=>d`<${ko} key=${r.tool} tool=${r} root=${e.root}/>`)}
      </div>`)}
    ${a.length>0&&d`<details style="margin-top:var(--sp-6)">
      <summary class="cursor-ptr text-muted" style="font-size:var(--fs-base);padding:var(--sp-2) 0;list-style:none;display:flex;align-items:center;gap:var(--sp-3)">
        <span style="font-size:var(--fs-xs)">▶</span>
        <span>Project Context</span>
        <span class="badge">${a.length}</span>
        <span class="text-muted" style="font-size:var(--fs-xs)">env files, shared instructions</span>
      </summary>
      <div class="tool-grid" style="margin-top:var(--sp-3)">
        ${a.map(r=>d`<${ko} key=${r.tool} tool=${r} root=${e.root}/>`)}
      </div>
    </details>`}
  </div>`:d`<p class="loading-state">Loading...</p>`}function sp({perCore:e}){if(!e||!e.length)return null;const t=100;return d`<div class="mb-sm" style="display:flex;gap:2px;align-items:end;height:40px">
    ${e.map((s,n)=>{const l=Math.max(1,s/t*100),o=s>80?"var(--red)":s>50?"var(--orange)":s>20?"var(--green)":"var(--fg2)";return d`<div key=${n} title=${"Core "+n+": "+ge(s)}
        style=${"flex:1;min-width:3px;background:"+o+";height:"+l+"%;border-radius:1px;opacity:0.8;transition:height 0.3s"}/>`})}
  </div>`}function np({mem:e}){var k;const[t,s]=K(!1),[n,l]=K(!1),[o,a]=K(null),[i,r]=K(null),[c,v]=K(!1),p=tt(Ue),h=(e.file||"").replace(/\\/g,"/").split("/").pop(),b=We(async()=>{if(t){s(!1);return}if(s(!0),nl.has(e.file)){a(nl.get(e.file));return}v(!0),r(null);try{const w=await Ao(e.file);a(w)}catch(w){r(w.message)}finally{v(!1)}},[t,e.file]),S=(w,N)=>w.map((A,P)=>d`<span class="pline"><span class="ln">${N+P}</span>${X(A)||" "}</span>`),D=()=>{if(c)return d`<span class="loading-state">Loading...</span>`;if(i)return d`<span class="error-state">${i}</span>`;if(!o)return null;const w=o.split(`
`),N=w.length;if(N<=en*3||n)return d`${S(w,1)}
        <div class="prev-actions">
          ${n&&d`<button class="prev-btn" onClick=${()=>l(!1)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
        </div>`;const A=w.slice(-en),P=N-en+1;return d`${S(A,P)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>l(!0)}>show all (${N} lines)</button>
        <button class="prev-btn" onClick=${()=>p.openViewer(e.file)}>open in viewer</button>
      </div>`},T=e.mtime&&Date.now()/1e3-e.mtime<300,y=(k=p.recentFiles)==null?void 0:k.get(e.file),$=!!y;return d`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem var(--sp-8)" onClick=${b}
      aria-expanded=${t} title=${e.file}>
      ${$?d`<span class="text-green" style="font-size:var(--fs-xs);animation:pulse 1s infinite" title="Active — last change ${It(y.ts)}">●</span>`:T?d`<span class="text-orange" style="font-size:var(--fs-xs)" title="Modified ${It(e.mtime)}">●</span>`:d`<span class="text-muted" style="font-size:var(--fs-xs)">○</span>`}
      <span class="fpath">${X(h)}</span>
      <span class="fmeta">${xe(e.tokens*4)} ${e.tokens}tok ${e.lines}ln${T||$?d` <span style="color:${$?"var(--green)":"var(--orange)"};font-size:var(--fs-sm)">${It($?y.ts:e.mtime)}</span>`:""}</span>
    </button>
    ${t&&d`<div class="inline-preview" style="margin:0 var(--sp-8) var(--sp-4)">${D()}</div>`}
  </div>`}function lp({profile:e,items:t}){const[s,n]=K(t.length<=5),l=t.reduce((o,a)=>o+a.tokens,0);return d`<div class="cat-group" style="margin:0 var(--sp-5)">
    <button class=${s?"mem-profile-head open":"mem-profile-head"} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label text-orange text-bold" title=${e}>${X(e)}</span>
      <span class="badge">${t.length} files</span>
      <span class="badge">${I(l)} tok</span>
    </button>
    ${s&&d`<div>${t.map(o=>d`<${np} key=${o.file} mem=${o}/>`)}</div>`}
  </div>`}function op({source:e,entries:t}){const[s,n]=K(!1),l=ce(()=>{const o={};return t.forEach(a=>{(o[a.profile]=o[a.profile]||[]).push(a)}),Object.entries(o)},[t]);return d`<div class="mem-group">
    <button class=${"mem-group-head"+(s?" open":"")} onClick=${()=>n(!s)} aria-expanded=${s}>
      <span class="carrow">\u25B6</span>
      ${X(jc[e]||e)} <span class="badge">${t.length}</span>
      <span class="badge">${I(t.reduce((o,a)=>o+a.tokens,0))} tok</span>
    </button>
    ${s&&d`<div>${l.map(([o,a])=>d`<${lp} key=${o} profile=${o} items=${a}/>`)}</div>`}
  </div>`}function ap(){const[e,t]=K(null);if(me(()=>{fetch("/api/history").then(n=>n.json()).then(n=>{n&&n.ts&&n.ts.length>=2&&t(n)}).catch(()=>{})},[]),!e)return null;const s=e.memory_entries&&e.memory_entries.some(n=>n>0);return d`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Memory Growth</div>
    <div class="es-charts">
      <${rs} label="Memory Tokens" value=${I(e.mem_tokens[e.mem_tokens.length-1]||0)}
        data=${[e.ts,e.mem_tokens]} chartColor="var(--accent)" smooth />
      ${s&&d`<${rs} label="Memory Entries" value=${e.memory_entries[e.memory_entries.length-1]||0}
        data=${[e.ts,e.memory_entries]} chartColor="var(--green)" smooth />`}
    </div>
  </div>`}function ip(){const{snap:e}=tt(Ue);if(!e||!e.agent_memory.length)return d`<p class="empty-state">No agent memory found.</p>`;const t=ce(()=>{const s={};return e.agent_memory.forEach(n=>{(s[n.source]=s[n.source]||[]).push(n)}),Object.entries(s)},[e.agent_memory]);return d`<${ap}/>
    ${t.map(([s,n])=>d`<${op} key=${s} source=${s} entries=${n}/>`)}`}function rp(){var n,l,o,a;const{snap:e}=tt(Ue);if(!e)return d`<p class="empty-state">Loading...</p>`;const t=e.tools.filter(i=>i.live).sort((i,r)=>{var c,v,p,h;return(((c=r.live)==null?void 0:c.outbound_rate_bps)||0)+(((v=r.live)==null?void 0:v.inbound_rate_bps)||0)-((((p=i.live)==null?void 0:p.outbound_rate_bps)||0)+(((h=i.live)==null?void 0:h.inbound_rate_bps)||0))}),s=Object.entries(e.live_monitor&&e.live_monitor.diagnostics||{});return d`<div class="live-stack">
    ${s.length>0&&d`<div class="diag-card">
      <h3>Collector Health</h3>
      <table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${s.map(([i,r])=>d`<tr key=${i}>
          <td class="mono">${i}</td>
          <td>${X(r.status||"unknown")}</td>
          <td>${X(r.mode||"unknown")}</td>
          <td>${X(r.detail||"")}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      ${t.length?d`<table role="table" aria-label="Live tool sessions">
        <thead><tr><th>Tool</th><th>Sessions</th><th>Traffic</th><th>Tokens</th><th>MCP</th><th>Files</th><th>CPU</th><th>Workspace</th><th>State</th></tr></thead>
        <tbody>${t.map(i=>{const r=i.live||{},c=r.token_estimate||{},v=r.mcp||{};return d`<tr key=${i.tool}>
            <td>${X(i.label)}</td>
            <td>${r.session_count||0} sess / ${r.pid_count||0} pid</td>
            <td>\u2191 ${Ft(r.outbound_rate_bps||0)}<br/>\u2193 ${Ft(r.inbound_rate_bps||0)}</td>
            <td>${I(Do(r))}<br/><span class="text-muted">${X(c.source||"network-inference")} @ ${ge((c.confidence||0)*100)}</span></td>
            <td>${v.detected?"YES":"NO"}<br/><span class="text-muted">${v.loops||0} loops @ ${ge((v.confidence||0)*100)}</span></td>
            <td>${r.files_touched||0} touched<br/><span class="text-muted">${r.file_events||0} events</span></td>
            <td>${ge(r.cpu_percent||0)}<br/><span class="text-muted">peak ${ge(r.peak_cpu_percent||0)}</span></td>
            <td>${xe((r.workspace_size_mb||0)*1048576)}<br/><span class="mono text-muted text-xs">${X((r.workspaces||[]).slice(0,2).join(" | ")||"(unknown)")}</span></td>
            <td>${(r.state_bytes_written||0)>0?xe(r.state_bytes_written||0):"—"}</td>
          </tr>
          ${(r.processes||[]).length>0&&d`<tr key=${i.tool+"-procs"}>
            <td colspan="9" style="padding:var(--sp-1) var(--sp-5);background:var(--bg)">
              <details style="font-size:var(--fs-base)">
                <summary class="cursor-ptr text-muted">${r.processes.length} processes</summary>
                <div class="text-mono" style="margin-top:var(--sp-1);font-size:0.7rem">
                  ${r.processes.sort((p,h)=>(h.cpu_pct||0)-(p.cpu_pct||0)).map(p=>d`<div key=${p.pid} style="display:flex;gap:var(--sp-5);padding:var(--sp-1) 0">
                      <span class="text-muted" style="min-width:5ch">${p.pid}</span>
                      <span class="flex-1 text-ellipsis">${p.name}</span>
                      <span class="text-right" style="color:${p.cpu_pct>5?"var(--orange)":"var(--fg2)"};min-width:5ch">${p.cpu_pct}%</span>
                      <span class="text-right" style="min-width:6ch">${p.mem_mb?xe(p.mem_mb*1048576):""}</span>
                    </div>`)}
                </div>
              </details>
            </td>
          </tr>`}`})}</tbody>
      </table>`:d`<p class="empty-state">No active AI-tool sessions detected yet.</p>`}
    </div>

    <div class="diag-card">
      <h3>Monitor Roots</h3>
      <div class="stack-list">
        ${(((n=e.live_monitor)==null?void 0:n.workspace_paths)||[]).map(i=>d`<span class="pill mono" key=${"ws-"+i}>workspace: ${i}</span>`)}
        ${(((l=e.live_monitor)==null?void 0:l.state_paths)||[]).map(i=>d`<span class="pill mono" key=${"state-"+i}>state: ${i}</span>`)}
        ${!(((o=e.live_monitor)==null?void 0:o.workspace_paths)||[]).length&&!(((a=e.live_monitor)==null?void 0:a.state_paths)||[]).length&&d`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`}function cp(){var D,T,y,$;const{snap:e,globalRange:t}=tt(Ue),[s,n]=K(null),[l,o]=K([]),[a,i]=K(null),r=ce(()=>e?e.tools.filter(k=>!k.meta&&(k.files.length||k.processes.length||k.live)).sort((k,w)=>k.label.localeCompare(w.label)):[],[e]);if(me(()=>{!s&&r.length&&n(r[0].tool)},[r,s]),me(()=>{if(!s||!t)return;let k="/api/events?tool="+encodeURIComponent(s)+"&since="+t.since+"&limit=500";t.until!=null&&(k+="&until="+t.until),fetch(k).then(w=>w.json()).then(o).catch(()=>o([]))},[s,t]),me(()=>{if(!s||!t)return;let k="/api/history?since="+t.since+"&tool="+encodeURIComponent(s);t.until!=null&&(k+="&until="+t.until),fetch(k).then(w=>w.json()).then(w=>{var N;return i(((N=w==null?void 0:w.by_tool)==null?void 0:N[s])||null)}).catch(()=>i(null))},[s,t]),!e)return d`<p class="loading-state">Loading...</p>`;const c=r.find(k=>k.tool===s),v=(D=e.tool_telemetry)==null?void 0:D.find(k=>k.tool===s),p=c==null?void 0:c.live,h=Ae[s]||"var(--fg2)",b={month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"},S=t.until!=null?new Date(t.since*1e3).toLocaleString(void 0,b)+" – "+new Date(t.until*1e3).toLocaleString(void 0,b):"";return d`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Tools</div>
      ${r.map(k=>d`<button key=${k.tool}
        class=${s===k.tool?"es-tool-btn active":"es-tool-btn"}
        onClick=${()=>n(k.tool)}>
        <span style="color:${Ae[k.tool]||"var(--fg2)"}">${$t[k.tool]||"🔹"}</span>
        ${k.label}
        ${k.live?d`<span class="badge" style="font-size:var(--fs-2xs);margin-left:auto">live</span>`:""}
      </button>`)}
    </div>
    <div>
      ${s&&d`<Fragment>
        <h3 class="flex-row mb-sm gap-sm">
          <span style="color:${h}">${$t[s]||"🔹"}</span>
          ${(c==null?void 0:c.label)||s}
          ${c!=null&&c.vendor?d`<span class="badge">${er[c.vendor]||c.vendor}</span>`:""}
          ${v!=null&&v.model?d`<span class="badge mono">${v.model}</span>`:""}
        </h3>

        ${a&&((T=a.ts)==null?void 0:T.length)>=2?d`<div class="es-section">
          <div class="es-section-title">Time Series${S?d` <span class="badge">${S}</span>`:""}</div>
          <div class="es-charts">
            <${rs} label="CPU %" value=${((y=c==null?void 0:c.live)==null?void 0:y.cpu_percent)!=null?ge(c.live.cpu_percent||0):"-"}
              data=${[a.ts,a.cpu]} chartColor=${h} smooth />
            <${rs} label="Memory (MB)" value=${(($=c==null?void 0:c.live)==null?void 0:$.mem_mb)!=null?xe((c.live.mem_mb||0)*1048576):"-"}
              data=${[a.ts,a.mem_mb]} chartColor="var(--green)" smooth />
            <${rs} label="Context (tok)" value=${He(a.tokens[a.tokens.length-1]||0)}
              data=${[a.ts,a.tokens]} chartColor="var(--accent)" />
            <${rs} label="Network (B/s)"
              value=${Ft(p?(p.outbound_rate_bps||0)+(p.inbound_rate_bps||0):a.traffic[a.traffic.length-1]||0)}
              valColor=${p?"var(--orange)":void 0}
              data=${[a.ts,a.traffic]} chartColor="var(--orange)" />
          </div>
        </div>`:d`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="loading-state">No data for this range.</p>
        </div>`}

        ${v?d`<div class="es-section">
          <div class="es-section-title">Telemetry
            <span class="badge" style="margin-left:var(--sp-3)">${v.source}</span>
            <span class="badge">${ge(v.confidence*100)}</span>
          </div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${He(v.input_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${He(v.output_tokens)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Read (tok)</div><div class="value">${He(v.cache_read_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cache Write (tok)</div><div class="value">${He(v.cache_creation_tokens||0)}</div></div>
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${I(v.total_sessions||0)}</div></div>
            <div class="es-kv-card"><div class="label">Messages</div><div class="value">${I(v.total_messages||0)}</div></div>
            <div class="es-kv-card"><div class="label">Cost</div><div class="value">${v.cost_usd?"$"+v.cost_usd.toFixed(2):"-"}</div></div>
          </div>
          ${Object.keys(v.by_model||{}).length>0&&d`<div style="margin-top:var(--sp-3)">
            <div class="es-section-title">By Model</div>
            ${Object.entries(v.by_model).map(([k,w])=>d`<div key=${k}
              class="flex-between" style="font-size:var(--fs-base);padding:var(--sp-1) var(--sp-4);
                     background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
              <span class="mono">${k}</span>
              <span>in: ${He(w.input||w.input_tokens||0)} tok \u00B7 out: ${He(w.output||w.output_tokens||0)} tok${w.cache_read_tokens?" · cR:"+He(w.cache_read_tokens):""}${w.cache_creation_tokens?" · cW:"+He(w.cache_creation_tokens):""}${w.cost_usd?" · $"+w.cost_usd.toFixed(2):""}</span>
            </div>`)}
          </div>`}
        </div>`:""}

        ${p?d`<div class="es-section">
          <div class="es-section-title">Live Monitor</div>
          <div class="es-kv">
            <div class="es-kv-card"><div class="label">Sessions</div><div class="value">${p.session_count||0}</div></div>
            <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${p.pid_count||0}</div></div>
            <div class="es-kv-card"><div class="label">CPU</div><div class="value">${ge(p.cpu_percent||0)}</div></div>
            <div class="es-kv-card"><div class="label">Memory</div><div class="value">${xe((p.mem_mb||0)*1048576)}</div></div>
            <div class="es-kv-card"><div class="label">\u2191 Out</div><div class="value">${Ft(p.outbound_rate_bps||0)}</div></div>
            <div class="es-kv-card"><div class="label">\u2193 In</div><div class="value">${Ft(p.inbound_rate_bps||0)}</div></div>
          </div>
        </div>`:""}

        <div class="es-section">
          <div class="es-section-title">Events (${l.length})</div>
          ${l.length?d`<div class="es-feed">
            ${l.map((k,w)=>{const N=Nc[k.kind]||"var(--fg2)",A=new Date(k.ts*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),P=k.detail?Object.entries(k.detail).map(([O,_])=>O+"="+_).join(", "):"";return d`<div key=${k.ts+"-"+k.tool+"-"+w} class="es-event">
                <span class="es-event-time">${A}</span>
                <span class="es-event-kind" style="color:${N}">${k.kind}</span>
                <span class="es-event-detail" title=${P}>${P||"-"}</span>
              </div>`})}
          </div>`:d`<p class="empty-state">No events for this tool in the selected range.</p>`}
        </div>
      </Fragment>`}
    </div>
  </div>`}const Ks=["var(--green)","var(--model-7)","var(--orange)","var(--red)","var(--model-5)","var(--yellow)","var(--accent)","var(--model-8)"],Si={"claude-opus-4-6":1e6,"claude-opus-4-5":1e6,"claude-sonnet-4-6":1e6,"claude-sonnet-4-5":1e6,"claude-sonnet-4":2e5,"claude-haiku-4-5":2e5,"claude-3-5-sonnet":2e5,"gpt-4.1":1e6,"gpt-4.1-mini":1e6,"gpt-4o":128e3,"gpt-4o-mini":128e3,o3:2e5,"o4-mini":2e5,"gemini-2.5-pro":1e6,"gemini-2.5-flash":1e6};function Ti({always:e,onDemand:t,conditional:s,never:n,total:l}){if(!l)return null;const o=a=>(a/l*100).toFixed(1)+"%";return d`<div class="overflow-hidden" style="display:flex;height:10px;border-radius:5px;background:var(--border)">
    ${e>0&&d`<div style="width:${o(e)};height:100%;background:var(--green)" title="Always loaded: ${I(e)}"></div>`}
    ${t>0&&d`<div style="width:${o(t)};height:100%;background:var(--yellow)" title="On-demand: ${I(t)}"></div>`}
    ${s>0&&d`<div style="width:${o(s)};height:100%;background:var(--orange)" title="Conditional: ${I(s)}"></div>`}
    ${n>0&&d`<div style="width:${o(n)};height:100%;background:var(--fg2);opacity:0.3" title="Never sent: ${I(n)}"></div>`}
  </div>`}function dp(){const{snap:e,history:t,enabledTools:s}=tt(Ue),[n,l]=K(null),[o,a]=K(!1);if(me(()=>{l(null),a(!1),fetch("/api/budget").then(_=>_.json()).then(l).catch(()=>a(!0))},[]),o)return d`<p class="error-state">Failed to load budget.</p>`;if(!n)return d`<p class="loading-state">Loading...</p>`;const i=_=>s===null||s.includes(_),r=ce(()=>{const _=(e==null?void 0:e.tool_configs)||[];for(const C of["claude-code","copilot","copilot-vscode"]){const L=_.find(R=>R.tool===C&&R.model);if(L)return L.model}for(const C of _)if(C.model&&Si[C.model])return C.model;return""},[e]),c=Si[r]||2e5,v=n.always_loaded_tokens||0,p=n.total_potential_tokens||0,h=v/c*100,b=p/c*100,S=ce(()=>{if(!e)return{};const _={};return e.tools.forEach(C=>{C.tool==="aictl"||!C.token_breakdown||!C.token_breakdown.total||(_[C.tool]=C.token_breakdown)}),_},[e]),D=ce(()=>e!=null&&e.tool_telemetry?e.tool_telemetry.filter(_=>i(_.tool)):[],[e,s]),T=ce(()=>{if(!e)return[];const _={};return e.tools.forEach(C=>{C.tool==="aictl"||!i(C.tool)||(C.files||[]).forEach(L=>{const R=L.kind||"other";_[R]||(_[R]={kind:R,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0}),_[R].count++,_[R].tokens+=L.tokens,_[R].size+=L.size;const z=(L.sent_to_llm||"").toLowerCase();z==="yes"?_[R].always+=L.tokens:z==="on-demand"?_[R].onDemand+=L.tokens:z==="conditional"||z==="partial"?_[R].conditional+=L.tokens:_[R].never+=L.tokens})}),Object.values(_).sort((C,L)=>L.tokens-C.tokens)},[e,s]),y=ce(()=>{if(!(e!=null&&e.tool_telemetry))return null;const _={},C={};e.tool_telemetry.filter(M=>i(M.tool)).forEach(M=>{(M.daily||[]).forEach(B=>{if(B.date&&(_[B.date]||(_[B.date]={}),C[B.date]||(C[B.date]={}),B.tokens_by_model&&Object.entries(B.tokens_by_model).forEach(([U,W])=>{_[B.date][U]=(_[B.date][U]||0)+W}),B.model)){const U=B.model,W=(B.input_tokens||0)+(B.output_tokens||0);_[B.date][U]=(_[B.date][U]||0)+W,C[B.date][U]||(C[B.date][U]={input:0,output:0,cache_read:0,cache_creation:0}),C[B.date][U].input+=B.input_tokens||0,C[B.date][U].output+=B.output_tokens||0,C[B.date][U].cache_read+=B.cache_read_tokens||0,C[B.date][U].cache_creation+=B.cache_creation_tokens||0}})});const L=new Date,R=[];for(let M=6;M>=0;M--){const B=new Date(L);B.setDate(B.getDate()-M),R.push(B.toISOString().slice(0,10))}const z=R.filter(M=>_[M]&&Object.values(_[M]).some(B=>B>0));if(!z.length)return null;const V=[...new Set(z.flatMap(M=>Object.keys(_[M]||{})))],q=Math.max(...z.map(M=>V.reduce((B,U)=>B+((_[M]||{})[U]||0),0)),1),le=z.some(M=>Object.keys(C[M]||{}).length>0);return{dates:z,models:V,byDate:_,byDateModel:C,maxTotal:q,hasDetail:le}},[e,s]),$=t&&t.ts&&t.ts.length>=2?[t.ts,t.live_tokens||t.ts.map(()=>0)]:null,k=D.reduce((_,C)=>_+(C.input_tokens||0),0),w=D.reduce((_,C)=>_+(C.output_tokens||0),0),N=D.reduce((_,C)=>_+(C.cache_read_tokens||0),0),A=D.reduce((_,C)=>_+(C.cache_creation_tokens||0),0),P=D.reduce((_,C)=>_+(C.total_sessions||0),0),O=D.reduce((_,C)=>_+(C.cost_usd||0),0);return d`<div class="budget-grid">
    <!-- Live sparkline + context window side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);margin-bottom:var(--sp-6)">
      ${$?d`<div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Live Token Usage</h3>
        <${Wr} data=${$} color="var(--green)" height=${60}/>
        <div class="text-muted" style="font-size:var(--fs-base);margin-top:var(--sp-2)">
          Current: ${I((e==null?void 0:e.total_live_estimated_tokens)||0)} estimated tokens
        </div>
      </div>`:d`<div></div>`}
      <div class="budget-card">
        <h3 class="text-accent" style="margin-bottom:var(--sp-3)">Context Window${r?d` <span class="badge">${r}</span>`:""}</h3>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Always loaded: ${I(v)} of ${I(c)}</span>
            <span class="text-bolder" style="color:${h>80?"var(--orange)":h>50?"var(--yellow)":"var(--green)"}">${ge(h)}</span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:4px;background:var(--border)">
            <div style="height:100%;width:${Math.min(h,100).toFixed(1)}%;background:var(--green);border-radius:4px"></div>
          </div>
        </div>
        <div style="margin-bottom:var(--sp-3)">
          <div class="flex-between text-sm" style="margin-bottom:2px">
            <span>Max potential: ${I(p)}</span>
            <span class="text-bolder" style="color:${b>100?"var(--red)":"var(--fg2)"}">${ge(b)}${b>100?" ⚠":""}</span>
          </div>
          <div class="overflow-hidden" style="height:6px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${Math.min(b,100).toFixed(1)}%;background:${b>100?"var(--red)":"var(--fg2)"};opacity:0.5;border-radius:3px"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-1);font-size:var(--fs-sm)">
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:4px"></span>Always: ${I(n.always_loaded_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--yellow);margin-right:4px"></span>On-demand: ${I(n.on_demand_tokens||0)}</span>
          <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--orange);margin-right:4px"></span>Conditional: ${I(n.conditional_tokens||0)}</span>
          <span class="text-muted">Cacheable: ${I(n.cacheable_tokens||0)}</span>
        </div>
        ${(n.project_count||0)>1?d`<div class="text-muted" style="font-size:var(--fs-xs);margin-top:var(--sp-2);border-top:1px solid var(--border);padding-top:var(--sp-1)">
          Estimate for largest project (${n.largest_project||"?"}): ${I(n.largest_project_tokens||0)} + ${I(n.global_tokens||0)} global.
          ${(n.raw_total_all_projects||0)>(n.total_potential_tokens||0)?d` Raw total across all ${n.project_count} projects: ${I(n.raw_total_all_projects)}.`:null}
        </div>`:null}
      </div>
    </div>

    <!-- Daily token usage -->
    ${y&&d`<div class="budget-card mb-md">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">Daily Token Usage (last 7 days)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-6);font-size:var(--fs-sm);margin-bottom:var(--sp-3)">
        ${y.models.map((_,C)=>d`<span key=${_}>
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${Ks[C%Ks.length]};margin-right:3px"></span>${_}
        </span>`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
        ${y.dates.map(_=>{const C=y.models.reduce((R,z)=>R+((y.byDate[_]||{})[z]||0),0),L=new Date(_+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return d`<div key=${_} style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="text-muted text-right" style="width:56px;font-size:var(--fs-sm);flex-shrink:0">${L}</span>
            <div class="flex-1 overflow-hidden" style="display:flex;height:18px;border-radius:3px;background:var(--border)" title="${_}: ${I(C)} tokens">
              ${y.models.map((R,z)=>{const V=(y.byDate[_]||{})[R]||0;return V?d`<div key=${R} style="width:${(V/y.maxTotal*100).toFixed(1)}%;height:100%;background:${Ks[z%Ks.length]}" title="${R}: ${I(V)}"></div>`:null})}
            </div>
            <span class="text-muted" style="width:45px;font-size:var(--fs-sm);flex-shrink:0;text-align:right">${I(C)}</span>
          </div>`})}
      </div>
      ${y.hasDetail&&d`<details style="margin-top:var(--sp-4)">
        <summary class="text-muted cursor-ptr" style="font-size:var(--fs-sm)">Show detailed breakdown</summary>
        <table role="table" aria-label="Daily token detail" style="margin-top:var(--sp-3);font-size:var(--fs-sm)">
          <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>Total</th></tr></thead>
          <tbody>${y.dates.flatMap(_=>{const C=new Date(_+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"}),L=y.byDateModel[_]||{},R=Object.keys(L).sort();return R.length?R.map((z,V)=>{const q=L[z];return d`<tr key=${_+"-"+z}>
                <td>${V===0?C:""}</td>
                <td><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${Ks[y.models.indexOf(z)%Ks.length]};margin-right:3px"></span>${z}</td>
                <td>${I(q.input)}</td><td>${I(q.output)}</td>
                <td class="text-muted">${I(q.cache_read)}</td>
                <td class="text-muted">${I(q.cache_creation)}</td>
                <td class="text-bold">${I(q.input+q.output)}</td>
              </tr>`}):[]})}</tbody>
        </table>
      </details>`}
    </div>`}

    <!-- Verified token usage (main table) -->
    ${D.length>0&&d`<div class="budget-card mb-md">
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
          <tbody>${D.map(_=>{const C=S[_.tool];return d`<tr key=${_.tool}>
              <td style="white-space:nowrap"><span class="dot" style=${"background:"+(Ae[_.tool]||"var(--fg2)")+";margin-right:var(--sp-2)"}></span>${X(_.tool)}</td>
              <td><span class="badge" style="font-size:var(--fs-2xs)">${_.source}</span> <span class="text-muted">${ge(_.confidence*100)}</span></td>
              <td style="text-align:right" class="text-bold">${I(_.input_tokens||0)}</td>
              <td style="text-align:right" class="text-bold">${I(_.output_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${I(_.cache_read_tokens||0)}</td>
              <td style="text-align:right" class="text-muted">${I(_.cache_creation_tokens||0)}</td>
              <td style="text-align:right">${I(_.total_sessions||0)}</td>
              <td style="text-align:right">${_.cost_usd>0?"$"+_.cost_usd.toFixed(2):"—"}</td>
              <td>${C?d`<${Ti} always=${C.always_loaded||0} onDemand=${C.on_demand||0}
                conditional=${C.conditional||0} never=${C.never_sent||0} total=${C.total||1}/>`:null}</td>
            </tr>`})}
          ${D.length>1&&d`<tr class="text-bolder" style="border-top:2px solid var(--border)">
            <td>Total</td><td></td>
            <td style="text-align:right">${I(k)}</td>
            <td style="text-align:right">${I(w)}</td>
            <td style="text-align:right" class="text-muted">${I(N)}</td>
            <td style="text-align:right" class="text-muted">${I(A)}</td>
            <td style="text-align:right">${I(P)}</td>
            <td style="text-align:right">${O>0?"$"+O.toFixed(2):"—"}</td>
            <td></td>
          </tr>`}</tbody>
        </table>
      </div>
    </div>`}

    <!-- By category -->
    ${T.length>0&&d`<div class="budget-card budget-full">
      <h3 class="text-accent" style="margin-bottom:var(--sp-4)">By Category</h3>
      <div style="overflow-x:auto">
        <table role="table" aria-label="Per-category tokens" style="width:100%">
          <thead><tr><th>Category</th><th style="text-align:right">Files</th><th style="text-align:right">Tokens</th><th style="text-align:right">Size</th><th style="width:120px">Distribution</th></tr></thead>
          <tbody>${T.map(_=>d`<tr key=${_.kind}>
            <td>${X(_.kind)}</td>
            <td style="text-align:right">${_.count}</td>
            <td style="text-align:right" class="text-bold">${I(_.tokens)}</td>
            <td style="text-align:right">${xe(_.size)}</td>
            <td><${Ti} always=${_.always} onDemand=${_.onDemand} conditional=${_.conditional} never=${_.never} total=${_.tokens||1}/></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </div>`}
  </div>`}function up(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}const Vn={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function Ci({agent:e,tasks:t,now:s}){const n=Vn[e.state]||Vn.active,l=e.ended_at?e.ended_at-e.started_at:s-e.started_at,o=t.filter(a=>a.agent_id===e.agent_id);return d`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${n.bg};color:var(--bg)">${n.label}</span>
      <strong class="text-sm">${X(e.agent_id)}</strong>
      <span class="text-muted text-xs">${up(l)}</span>
      ${e.task&&d`<span class="text-xs mono text-muted">\u2014 ${X(e.task)}</span>`}
    </div>
    ${o.length>0&&d`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${o.map(a=>{const i=Vn[a.state]||Vn.pending;return d`<div key=${a.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${i.bg};color:var(--bg);font-size:0.6rem;padding:1px 4px">${i.label}</span>
          <span class="mono">${X(a.name||a.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function pp({entityState:e}){if(!e||!e.agents||!e.agents.length)return null;const t=e.agents,s=e.tasks||[],n=Date.now()/1e3,l=t.filter(a=>a.state==="active"),o=t.filter(a=>a.state!=="active");return d`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${t.length} agent${t.length>1?"s":""}</span>
      ${l.length>0&&d`<span class="badge text-xs" style="background:var(--green);color:var(--bg)">${l.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${l.map(a=>d`<${Ci} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
      ${o.map(a=>d`<${Ci} key=${a.agent_id} agent=${a} tasks=${s} now=${n}/>`)}
    </div>
  </div>`}function fp({tasks:e}){if(!e||!e.length)return null;const t=e.filter(o=>o.state==="pending"),s=e.filter(o=>o.state==="active"),n=e.filter(o=>o.state==="done");function l({title:o,items:a,color:i}){return d`<div class="tt-column">
      <div class="tt-column-head" style="border-bottom:2px solid ${i}">
        <strong class="text-sm">${o}</strong>
        <span class="text-muted text-xs">${a.length}</span>
      </div>
      <div class="tt-column-body">
        ${a.length?a.map(r=>d`<div key=${r.task_id} class="tt-task-card">
              <div class="text-sm" style="font-weight:500">${X(r.name||r.task_id)}</div>
              ${r.agent_id&&d`<div class="text-xs text-muted">Agent: ${X(r.agent_id)}</div>`}
            </div>`):d`<p class="text-muted text-xs" style="padding:var(--sp-3)">None</p>`}
      </div>
    </div>`}return d`<div class="tt-board">
    <${l} title="Pending" items=${t} color="var(--fg3)"/>
    <${l} title="Active" items=${s} color="var(--accent)"/>
    <${l} title="Done" items=${n} color="var(--green)"/>
  </div>`}function Zn(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Gt({title:e,icon:t,badge:s,defaultOpen:n,children:l}){const[o,a]=K(n||!1);return d`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>a(i=>!i)}
      aria-expanded=${o}>
      <span class="sd-panel-icon">${t}</span>
      <span class="sd-panel-title">${e}</span>
      ${s!=null&&d`<span class="badge text-xs" style="margin-left:var(--sp-2)">${s}</span>`}
      <span class="sd-panel-arrow">${o?"▲":"▼"}</span>
    </button>
    ${o&&d`<div class="sd-panel-body">${l}</div>`}
  </div>`}function vp({sessionId:e}){const[t,s]=K([]),[n,l]=K(!0);if(me(()=>{if(!e)return;l(!0);const a=Math.floor(Date.now()/1e3)-86400;fetch(`/api/events?session_id=${encodeURIComponent(e)}&limit=200&since=${a}`).then(i=>i.json()).then(i=>{s(i.reverse()),l(!1)}).catch(()=>l(!1))},[e]),n)return d`<p class="loading-state">Loading events...</p>`;if(!t.length)return d`<p class="empty-state">No events recorded for this session.</p>`;const o={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)"};return d`<div class="sd-events">
    ${t.map((a,i)=>{const r=o[a.kind]||"var(--fg3)",c=a.detail||{},v=c.path||c.name||c.tool_name||a.kind;return d`<div key=${i} class="sd-event-row">
        <span class="sd-event-time">${It(a.ts)}</span>
        <span class="sd-event-dot" style="background:${r}"></span>
        <span class="sd-event-kind">${a.kind}</span>
        <span class="sd-event-desc mono text-muted">${X(String(v))}</span>
      </div>`})}
  </div>`}const mp={"claude-opus-4-6":1e6,"claude-sonnet-4.6":1e6,"claude-sonnet-4":2e5,"claude-haiku-4.5":2e5,"gpt-5.4":2e5,"gpt-5":128e3},Ei=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],hp=95;function gp({session:e}){const{snap:t}=tt(Ue),s=e.files_loaded||[],n=((t==null?void 0:t.tool_configs)||[]).map(b=>b.model).filter(Boolean)[0]||"",l=mp[n]||2e5,a=(t&&t.agent_memory||[]).reduce((b,S)=>b+(S.tokens||0),0),i=s.length*150,c=Ei.reduce((b,S)=>b+S.tokens,0)+a+i,v=Math.min(c/l*100,100),p=hp,h=[...Ei,{name:"Memory",tokens:a,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:i,color:"var(--green)"}].filter(b=>b.tokens>0);return d`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${I(c)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${I(l)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${v>80?"var(--orange)":v>50?"var(--yellow)":"var(--green)"}">${ge(v)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${h.map(b=>{const S=(b.tokens/l*100).toFixed(1);return d`<div key=${b.name} style="width:${S}%;background:${b.color};min-width:${b.tokens>0?"1px":"0"}"
              title="${b.name}: ~${I(b.tokens)} tokens"></div>`})}
        </div>
        <div style="position:absolute;left:${p}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${p}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${h.map(b=>d`<span key=${b.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${b.color};margin-right:2px"></span>
          ${b.name} ${I(b.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${p}%</span>
      </div>
    </div>

    ${s.length>0&&d`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${s.map(b=>d`<div key=${b} class="text-muted" style="padding:2px 0">${X(b)}</div>`)}
    </div>`}
    ${!s.length&&d`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function _p({session:e}){const{snap:t}=tt(Ue),s=t&&t.agent_memory||[],n=e.project||"",l=n?s.filter(o=>{const a=o.project||o.tool||"";return!n||a.includes(n.replace(/\\/g,"/").split("/").pop())}):s;return l.length?d`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
    ${l.map((o,a)=>d`<${$p} key=${a} mem=${o}/>`)}
  </div>`:d`<p class="empty-state">No memory entries found${n?" for this project":""}.</p>`}function $p({mem:e}){const[t,s]=K(!1),n=e.name||(e.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",l=(e.content||"").slice(0,300);return d`<div class="sd-memory-entry" style="cursor:pointer" onClick=${()=>s(!t)}>
    <div class="flex-row gap-sm" style="align-items:center">
      <span class="badge text-xs">${e.type||e.source||"file"}</span>
      <strong title=${e.file||e.path||""}>${X(n)}</strong>
      ${e.tokens?d`<span class="text-muted">${I(e.tokens)} tok</span>`:null}
      ${e.lines?d`<span class="text-muted">${e.lines}ln</span>`:null}
      ${e.profile?d`<span class="text-muted">${X(e.profile)}</span>`:null}
      <span class="text-muted" style="margin-left:auto;font-size:var(--fs-2xs)">${t?"▲":"▼"}</span>
    </div>
    ${t&&l?d`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${X(e.content)}${e.content&&e.content.length>300,""}</pre>`:null}
  </div>`}function bp({rateLimits:e}){return!e||!Object.keys(e).length?null:d`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(e).map(([t,s])=>{const n=s.used_pct||s.used_percentage||0,l=n>80?"var(--red)":n>60?"var(--orange)":"var(--green)",o=s.resets_at||"";return d`<div key=${t} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${t} window</span>
            <span style="color:${l};font-weight:600">${ge(n)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(n,100)}%;background:${l};border-radius:4px"></div>
          </div>
          ${o&&d`<div class="text-xs text-muted" style="margin-top:2px">resets ${o}</div>`}
        </div>`})}
    </div>
  </div>`}function yp({session:e}){const t=e.exact_input_tokens||0,s=e.exact_output_tokens||0,[n,l]=K(null);me(()=>{e.tool&&fetch(`/api/sessions?tool=${encodeURIComponent(e.tool)}&active=false&limit=20`).then(i=>i.json()).then(i=>{if(i.length>1){const r=i.filter(v=>v.duration_s>0).map(v=>v.duration_s),c=r.length?r.reduce((v,p)=>v+p,0)/r.length:0;l({avgDuration:c,sampleCount:i.length})}}).catch(()=>{})},[e.tool]);const o=e.duration_s||0,a=n&&n.avgDuration>0?o/n.avgDuration:null;return d`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${I(t)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${I(s)}</div></div>
      <div class="es-kv-card"><div class="label">Total Tokens</div><div class="value">${I(t+s)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${ge(e.cpu_percent||0)}</div></div>
      <div class="es-kv-card"><div class="label">Peak CPU</div><div class="value">${ge(e.peak_cpu_percent||0)}</div></div>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Inbound</div><div class="value">${xe(e.inbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">Outbound</div><div class="value">${xe(e.outbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">State Writes</div><div class="value">${xe(e.state_bytes_written||0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(e.pids)?e.pids.length:e.pids||0}</div></div>
    </div>
    ${a!=null&&d`<div class="text-xs text-muted" style="margin-top:var(--sp-3)">
      vs average (${n.sampleCount} sessions):
      duration ${a>1.2?d`<span class="text-orange">${a.toFixed(1)}x longer</span>`:a<.8?d`<span class="text-green">${(1/a).toFixed(1)}x shorter</span>`:d`<span>similar</span>`}
    </div>`}
    ${e.entity_state&&d`<${bp} rateLimits=${e.entity_state.rate_limits}/>`}
  </div>`}function xp({project:e}){const[t,s]=K(null);return me(()=>{e&&fetch("/api/project-costs?days=7").then(n=>n.json()).then(n=>{const l=n.find(o=>o.project===e);s(l||null)}).catch(()=>{})},[e]),t?d`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${t.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${I(t.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${I(t.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value">$${t.cost_usd.toFixed(2)}</div></div>
    </div>
    ${t.daily&&t.daily.length>0&&d`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${t.daily.map(n=>{const l=n.input_tokens+n.output_tokens,o=Math.max(...t.daily.map(r=>r.input_tokens+r.output_tokens),1),a=(l/o*100).toFixed(1),i=new Date(n.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return d`<div key=${n.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${i}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${a}%;background:var(--green);border-radius:3px"
              title="${I(l)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${I(l)}</span>
        </div>`})}
    </div>`}
  </div>`:d`<p class="empty-state">No cost data available for this project.</p>`}function kp({project:e,tool:t}){const[s,n]=K(null);if(me(()=>{!e||!t||fetch(`/api/session-runs?project=${encodeURIComponent(e)}&tool=${encodeURIComponent(t)}&days=30&limit=20`).then(i=>i.json()).then(n).catch(()=>n([]))},[e,t]),!s||s.length<2)return d`<p class="empty-state">Not enough session history for trend analysis.</p>`;const l=Math.max(...s.map(i=>i.total_tokens),1),o=s.reduce((i,r)=>i+r.duration_s,0)/s.length,a=s.reduce((i,r)=>i+r.total_tokens,0)/s.length;return d`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${s.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${Zn(o)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${I(a)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${s.map(i=>{const r=(i.total_tokens/l*100).toFixed(1),c=new Date(i.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),v=o>0?i.duration_s/o:1;return d`<div key=${i.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${c}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${r}%;border-radius:3px;background:${v>1.5?"var(--orange)":v<.7?"var(--green)":"var(--accent)"}" title="${I(i.total_tokens)} tok, ${Zn(i.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${I(i.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${Zn(i.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function wp({sessionId:e}){const[t,s]=K(null),[n,l]=K(!0);if(me(()=>{l(!0);const i=Math.floor(Date.now()/1e3)-3600;fetch(`/api/api-calls?since=${i}&limit=100`).then(r=>r.json()).then(r=>{s(r),l(!1)}).catch(()=>l(!1))},[e]),n)return d`<p class="loading-state">Loading API call data...</p>`;if(!t||!t.calls||!t.calls.length)return d`<p class="empty-state">No OTel API call data. Enable with: <code>eval $(aictl otel setup)</code></p>`;const{calls:o,summary:a}=t;return d`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">API Calls</div><div class="value">${a.total_calls}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${a.total_errors>0?"var(--red)":"var(--fg)"}">${a.total_errors}</div>
      </div>
      <div class="es-kv-card"><div class="label">Avg Latency</div><div class="value">${a.avg_latency_ms}ms</div></div>
      <div class="es-kv-card"><div class="label">P95 Latency</div><div class="value">${a.p95_latency_ms}ms</div></div>
    </div>
    ${a.by_model&&Object.keys(a.by_model).length>0&&d`
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By model</div>
      <div class="flex-row gap-sm flex-wrap" style="margin-bottom:var(--sp-3)">
        ${Object.entries(a.by_model).map(([i,r])=>d`
          <span key=${i} class="badge text-xs">${i}: ${r}</span>
        `)}
      </div>
    `}
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${o.slice(0,30).map((i,r)=>{const c=i.status==="error",v=new Date(i.ts*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});return d`<div key=${r} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${v}</span>
          <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${c?"var(--red)":"var(--green)"}"></span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${i.model||"—"}</span>
          ${!c&&d`<span style="width:50px;flex-shrink:0;text-align:right">${i.duration_ms||0}ms</span>`}
          ${!c&&d`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${I(i.input_tokens||0)}in</span>`}
          ${c&&d`<span style="color:var(--red)">${X(i.error||"error")}</span>`}
        </div>`})}
    </div>
  </div>`}function Sp({session:e}){const t=e.files_touched||[],s=e.file_events||0;return t.length?d`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${t.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${I(s)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${t.map(n=>d`<div key=${n} class="text-muted" style="padding:2px 0">${X(n)}</div>`)}
    </div>
  </div>`:d`<p class="empty-state">No file changes recorded.</p>`}function Tp({session:e,onClose:t}){const s=Ae[e.tool]||"var(--fg2)",n=e.files_loaded||[],l=e.files_touched||[],o=e.exact_input_tokens||0,a=e.exact_output_tokens||0,i=e.entity_state||null,r=i&&i.agents&&i.agents.length>0,c=i&&i.tasks&&i.tasks.length>0;return d`<div class="sd-container" style="border-left:3px solid ${s}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)">${X(e.tool)}</strong>
        ${e.project&&d`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${e.project}>${X(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">
          ${Zn(e.duration_s)}
        </span>
        ${r&&d`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">
          Team (${i.agents.length})
        </span>`}
      </div>
      <div class="text-muted text-xs mono" style="margin-top:var(--sp-2)" title=${e.session_id}>
        ${e.session_id}
      </div>
      ${t&&d`<button class="sd-close" onClick=${t} aria-label="Close session detail">\u2715</button>`}
    </div>

    <${Gt} title="Actions" icon="\u26A1" badge=${null} defaultOpen=${!0}>
      <${vp} sessionId=${e.session_id}/>
    <//>
    ${r&&d`<${Gt} title="Team" icon="\uD83D\uDC65" badge=${i.agents.length+" agents"} defaultOpen=${!0}>
      <${pp} entityState=${i}/>
    <//>`}
    ${c&&d`<${Gt} title="Tasks" icon="\uD83D\uDCCB" badge=${i.tasks.length} defaultOpen=${!0}>
      <${fp} tasks=${i.tasks}/>
    <//>`}
    <${Gt} title="Context" icon="\uD83D\uDCDA" badge=${n.length||null}>
      <${gp} session=${e}/>
    <//>
    <${Gt} title="Memory" icon="\uD83E\uDDE0" defaultOpen=${!1}>
      <${_p} session=${e}/>
    <//>
    <${Gt} title="Resources" icon="\u2699\uFE0F" badge=${I(o+a)+" tok"}>
      <${yp} session=${e}/>
    <//>
    <${Gt} title="Deliverables" icon="\uD83D\uDCE6" badge=${l.length||null}>
      <${Sp} session=${e}/>
    <//>
    <${Gt} title="API Calls" icon="\uD83D\uDD17" defaultOpen=${!1}>
      <${wp} sessionId=${e.session_id}/>
    <//>
    ${e.project&&d`<${Gt} title="Project Costs" icon="\uD83D\uDCB0" defaultOpen=${!1}>
      <${xp} project=${e.project}/>
    <//>`}
    ${e.project&&e.tool&&d`<${Gt} title="Run History" icon="\uD83D\uDCC8" defaultOpen=${!1}>
      <${kp} project=${e.project} tool=${e.tool}/>
    <//>`}
  </div>`}function Cp(e,t,s){const n=t-e,l=[300,600,900,1800,3600,7200,10800,21600,43200,86400];let o=l[l.length-1];for(const r of l)if(n/r<=s){o=r;break}const a=Math.ceil(e/o)*o,i=[];for(let r=a;r<=t;r+=o){const c=new Date(r*1e3);let v;o>=86400?v=c.toLocaleDateString([],{month:"short",day:"numeric"}):n>86400?v=c.toLocaleString([],{hourCycle:"h23",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):v=c.toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),i.push({ts:r,label:v})}return i}function Ep(e){return e>=3600?(e/3600).toFixed(1)+"h":e>=60?Math.round(e/60)+"m":Math.round(e)+"s"}function Mi(e,t,s,n){const l=e.duration_s||(e.ended_at||n)-e.started_at,o=new Date(e.started_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}),a=e.ended_at?new Date(e.ended_at*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"}):"now",i=[Ep(l)];e.conversations&&i.push(e.conversations+" conv"),e.subagents&&i.push(e.subagents+" agents"),e.source_files?i.push(e.source_files+" src files"):e.unique_files&&i.push(e.unique_files+" files"),e.bytes_written>1024&&i.push(xe(e.bytes_written));const r=!e.ended_at;return d`<div class="stl-tip">
    <div class="stl-tip-head">
      <span style=${"color:"+t}>${s}</span>
      <strong>${e.tool}</strong>
      ${r?d`<span class="badge" style="font-size:9px;background:var(--green);color:#000">live</span>`:""}
    </div>
    <div class="stl-tip-time">${o} – ${a}</div>
    <div class="stl-tip-stats">${i.join(" · ")}</div>
    ${e.project?d`<div class="stl-tip-proj">${e.project.replace(/\\/g,"/").split("/").pop()}</div>`:""}
  </div>`}function Mp({sessions:e,rangeSeconds:t,onSelect:s}){const n=Date.now()/1e3,l=t||86400,o=n-l,a=(e||[]).filter(P=>(P.ended_at||n)>=o&&P.started_at<=n),i=a.filter(P=>P.ended_at).sort((P,O)=>P.started_at-O.started_at),r=a.filter(P=>!P.ended_at).sort((P,O)=>P.started_at-O.started_at),c=[],v=[];for(const P of i){const O=Math.max(P.started_at,o),_=P.ended_at;let C=-1;for(let L=0;L<c.length;L++)if(O>=c[L]+2){c[L]=_,C=L;break}C<0&&(C=c.length,c.push(_)),v.push(C)}const p=10,h=2,b=18,S=14,D=Math.max(c.length,0),T=D>0?D*(p+h)+h:0,y=r.length>0?S+h*2:0,$=T>0&&y>0?1:0,k=T+$+y,w=Math.max(k,20)+b,N=Cp(o,n,8),A=P=>(Math.max(P,o)-o)/l*100;return d`<div class="stl">
    <div class="stl-chart" style=${"height:"+w+"px"}>
      ${N.map(P=>d`<div key=${P.ts} class="stl-grid"
        style=${"left:"+A(P.ts).toFixed(2)+"%;bottom:"+b+"px"} />`)}

      <!-- ended session bars -->
      ${i.map((P,O)=>{const _=Math.max(P.started_at,o),C=A(_),L=Math.max(.15,A(P.ended_at)-C),R=v[O]*(p+h)+h,z=Ae[P.tool]||"var(--fg2)",V=$t[P.tool]||"🔹";return d`<div key=${P.session_id} class="stl-bar"
          style=${"left:"+C.toFixed(2)+"%;width:"+L.toFixed(2)+"%;top:"+R+"px;height:"+p+"px;background:"+z}
          onClick=${()=>s&&s(P)}>
          ${Mi(P,z,V,n)}
        </div>`})}

      <!-- divider between ended and live -->
      ${$?d`<div class="stl-divider" style=${"top:"+T+"px"} />`:""}

      <!-- live session markers -->
      ${r.map(P=>{const O=A(P.started_at),_=T+$+h,C=Ae[P.tool]||"var(--fg2)",L=$t[P.tool]||"🔹";return d`<div key=${P.session_id} class="stl-marker"
          style=${"left:"+O.toFixed(2)+"%;top:"+_+"px;background:"+C}
          onClick=${()=>s&&s(P)}>
          ${Mi(P,C,L,n)}
        </div>`})}

      <div class="stl-axis" style=${"top:"+(w-b)+"px"}>
        ${N.map(P=>d`<span key=${P.ts} class="stl-tick"
          style=${"left:"+A(P.ts).toFixed(2)+"%"}>${P.label}</span>`)}
      </div>
    </div>
  </div>`}function wo(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60),n=t%60;return s<60?s+"m "+n+"s":Math.floor(s/60)+"h "+s%60+"m"}function Vr(e){let t=0;for(const s of e)(s.role==="lead"||s.role==="teammate"||s.role==="subagent")&&t++,t+=Vr(s.children||[]);return t}function Li({session:e,onSelect:t,isSelected:s,agentTeams:n}){const l=Ae[e.tool]||"var(--fg2)",o=$t[e.tool]||"🔹",a=(n||[]).find(c=>c.session_id===e.session_id),i=a?a.agent_count:Vr(e.process_tree||[]),r=i>1;return d`<div class="diag-card" style="border-left:3px solid ${l};cursor:pointer;${s?"outline:2px solid var(--accent);outline-offset:-2px":""}"
    onClick=${()=>t(e)}>
    <div class="flex-row gap-sm mb-sm">
      <span style="font-size:var(--fs-2xl)">${o}</span>
      <strong style="font-size:var(--fs-lg)">${X(e.tool)}</strong>
      ${r&&d`<span class="badge" style="background:var(--accent);color:var(--bg);font-size:var(--fs-xs)">Team (${i})</span>`}
      ${e.project&&d`<span class="text-muted text-xs mono text-ellipsis" style="max-width:150px"
        title=${e.project}>${X(e.project.replace(/\\/g,"/").split("/").pop())}</span>`}
      <span class="badge" style="margin-left:auto;background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Duration</div><div class="value">${wo(e.duration_s)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${ge(e.cpu_percent||0)}</div></div>
      <div class="es-kv-card"><div class="label">Input Tok</div><div class="value">${I(e.exact_input_tokens||0)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tok</div><div class="value">${I(e.exact_output_tokens||0)}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${I(e.file_events||0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(e.pids)?e.pids.length:e.pids||0}</div></div>
    </div>
    <div class="text-muted text-xs text-mono text-ellipsis" style="margin-top:var(--sp-3)"
      title=${e.session_id}>
      ${e.session_id}
    </div>
  </div>`}function Lp(){const{snap:e}=tt(Ue),t=e&&e.agent_teams||[];if(!t.length)return null;const s=t.reduce((o,a)=>o+a.agent_count,0),n=t.reduce((o,a)=>o+(a.total_input_tokens||0),0),l=t.reduce((o,a)=>o+(a.total_output_tokens||0),0);return d`<div class="es-section" style="margin-bottom:var(--sp-6)">
    <div class="es-section-title">Agent Teams
      <span class="badge">${t.length} sessions</span>
      <span class="badge">${s} agents</span>
      <span class="badge">${I(n+l)} tok</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      ${t.sort((o,a)=>(a.total_input_tokens||0)-(o.total_input_tokens||0)).slice(0,8).map(o=>d`
        <${Ap} key=${o.session_id} team=${o}/>
      `)}
    </div>
  </div>`}function Dp(e){return e?e.replace("claude-","").replace("-20251001",""):"?"}function Ap({team:e}){const[t,s]=K(!1);e.models;const n=e.agents||[],l=n.filter(r=>(r.input_tokens||0)+(r.output_tokens||0)>50),o=n.length-l.length,a=l.sort((r,c)=>c.input_tokens+c.output_tokens-(r.input_tokens+r.output_tokens)),i=a[0]?(a[0].input_tokens||0)+(a[0].output_tokens||0):1;return d`<div class="diag-card" style="border-left:3px solid var(--accent);padding:var(--sp-4)">
    <div class="flex-row gap-sm mb-sm" style="align-items:center;cursor:pointer" onClick=${()=>s(!t)}>
      <span class="badge" style="background:var(--accent);color:var(--bg)">${l.length} agents${o?d` <span style="opacity:0.6">+${o}w</span>`:null}</span>
      <span class="text-muted text-xs">${I(e.total_input_tokens||0)}in / ${I(e.total_output_tokens||0)}out</span>
      ${(e.tools_used||[]).length>0&&d`<span class="text-muted text-xs">${e.tools_used.join(", ")}</span>`}
      <span class="mono text-xs text-muted" style="margin-left:auto" title=${e.session_id}>${e.session_id.slice(0,12)}\u2026</span>
      <span class="text-xs text-muted">${t?"▲":"▼"}</span>
    </div>
    <!-- Always show: compact agent rows with task + tokens -->
    <div style="display:flex;flex-direction:column;gap:1px">
      ${a.slice(0,t?999:5).map(r=>{const c=(r.input_tokens||0)+(r.output_tokens||0),v=Math.max(1,c/i*100);return d`<div key=${r.agent_id} style="display:grid;
          grid-template-columns:2px 1fr minmax(60px,auto) minmax(50px,auto) 14px;
          gap:var(--sp-2);align-items:center;padding:2px var(--sp-2);font-size:var(--fs-xs);
          background:var(--bg);border-radius:2px">
          <div style="width:2px;height:100%;background:${r.is_sidechain?"var(--yellow)":"var(--green)"}"></div>
          <div class="text-ellipsis" title=${r.task||r.slug||r.agent_id}
            style="color:${r.task?"var(--fg)":"var(--fg2)"}">${r.task||r.slug||r.agent_id.slice(0,10)}</div>
          <div style="display:flex;align-items:center;gap:var(--sp-1)">
            <div style="flex:1;height:4px;background:var(--bg2);border-radius:2px;min-width:30px">
              <div style="height:100%;width:${v}%;background:${r.is_sidechain?"var(--yellow)":"var(--green)"};border-radius:2px;opacity:0.7"></div>
            </div>
            <span class="text-muted" style="font-size:var(--fs-2xs);white-space:nowrap">${I(c)}</span>
          </div>
          <span class="text-muted" style="font-size:var(--fs-2xs)">${Dp(r.model)}</span>
          ${r.completed?d`<span class="text-green">\u2713</span>`:d`<span class="text-orange">\u25CB</span>`}
        </div>`})}
      ${!t&&a.length>5?d`<div class="text-muted text-xs cursor-ptr" style="padding:2px var(--sp-2)"
        onClick=${r=>{r.stopPropagation(),s(!0)}}>+${a.length-5} more agents\u2026</div>`:null}
    </div>
  </div>`}function Pp(){const{snap:e,globalRange:t,rangeSeconds:s,enabledTools:n}=tt(Ue),[l,o]=K([]),[a,i]=K(!1),[r,c]=K(!0),[v,p]=K(null),[h,b]=K(null),[S,D]=K([]);me(()=>{c(!0),i(!1),fetch("/api/sessions?active=false").then(_=>_.json()).then(_=>{o(_),c(!1)}).catch(()=>{i(!0),c(!1)})},[]),me(()=>{if(!t)return;let C="/api/session-timeline?since="+Math.min(t.since,Date.now()/1e3-86400);t.until!=null&&(C+="&until="+t.until),fetch(C).then(L=>L.json()).then(D).catch(()=>D([]))},[t]),me(()=>{const _=C=>{const L=C.detail;L&&L.session_id&&(p(L.session_id),b(L))};return window.addEventListener("aictl-session-select",_),()=>window.removeEventListener("aictl-session-select",_)},[]);const T=_=>n===null||n.includes(_),y=(e&&e.sessions||[]).filter(_=>T(_.tool)),$=l.filter(_=>T(_.tool)),k=S.filter(_=>T(_.tool));let w=y.find(_=>_.session_id===v);if(!w&&v){const C=l.find(L=>L.session_id===v)||h;C&&C.session_id===v&&(w={session_id:C.session_id,tool:C.tool,project:C.project||"",duration_s:C.duration_s||0,active:C.active||!1,started_at:C.started_at,ended_at:C.ended_at,files_touched:[],files_loaded:[],exact_input_tokens:C.input_tokens||0,exact_output_tokens:C.output_tokens||0,pids:[],file_events:C.files_modified||0})}const N=_=>{p(C=>C===_.session_id?null:_.session_id)},A={};for(const _ of y){const C=_.project||"Unknown Project";A[C]||(A[C]=[]),A[C].push(_)}const P=Object.keys(A).sort();return d`<div>
    <div class="mb-lg">
      <${Mp} sessions=${k} rangeSeconds=${s}
        onSelect=${_=>{p(_.session_id),b(_)}}/>
    </div>

    <${Lp}/>

    ${w&&d`<${Tp} session=${w}
      onClose=${()=>p(null)}/>`}

    <div class="es-section">
      <div class="es-section-title">Active Sessions (${y.length})</div>
      ${y.length?P.length>1?P.map(_=>d`<div key=${_} style="margin-bottom:var(--sp-5)">
              <div class="text-muted text-sm mono" style="margin-bottom:var(--sp-3);font-weight:600">
                ${X(_.replace(/\\/g,"/").split("/").pop()||_)}
                <span class="text-xs" style="font-weight:400"> \u2014 ${A[_].length} session${A[_].length>1?"s":""}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
                ${A[_].map(C=>d`<${Li} key=${C.session_id} session=${C}
                  onSelect=${N} isSelected=${C.session_id===v} agentTeams=${e==null?void 0:e.agent_teams}/>`)}
              </div>
            </div>`):d`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
              ${y.map(_=>d`<${Li} key=${_.session_id} session=${_}
                onSelect=${N} isSelected=${_.session_id===v}/>`)}
            </div>`:d`<div class="empty-state">
            <p>No active sessions.</p>
            ${$.length>0&&d`<div class="diag-card" style="margin-top:var(--sp-4);max-width:400px">
              <div class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Last session</div>
              <div class="flex-row gap-sm" style="align-items:center">
                <span style="color:${Ae[$[0].tool]||"var(--fg2)"}">${$t[$[0].tool]||"🔹"}</span>
                <strong>${X($[0].tool)}</strong>
                <span class="text-muted text-xs">${wo($[0].duration_s)}</span>
                ${$[0].ended_at&&d`<span class="text-muted text-xs">${It($[0].ended_at)}</span>`}
              </div>
            </div>`}
          </div>`}
    </div>

    <div class="es-section" style="margin-top:var(--sp-8)">
      <div class="es-section-title">Session History</div>
      ${r?d`<p class="loading-state">Loading...</p>`:a?d`<p class="error-state">Failed to load session history.</p>`:$.length?d`<table role="table" aria-label="Session history" class="text-sm">
                <thead><tr>
                  <th>Tool</th>
                  <th>Session ID</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr></thead>
                <tbody>${$.map(_=>{const C=Ae[_.tool]||"var(--fg2)",L=$t[_.tool]||"🔹",R=_.session_id?_.session_id.length>12?_.session_id.slice(0,12)+"…":_.session_id:"—";return d`<tr key=${_.session_id} style="cursor:pointer;${_.session_id===v?"background:var(--bg2)":""}"
                    onClick=${()=>{p(_.session_id===v?null:_.session_id),b(null)}}>
                    <td>
                      <span style="color:${C};margin-right:var(--sp-2)">${L}</span>
                      ${X(_.tool)}
                    </td>
                    <td><span class="mono" title=${_.session_id} style="font-size:0.7rem">${R}</span></td>
                    <td>${wo(_.duration_s)}</td>
                    <td>${_.active?d`<span class="badge" style="background:var(--green);color:var(--bg);font-size:var(--fs-xs)">active</span>`:d`<span class="badge" style="font-size:var(--fs-xs)">ended</span>`}</td>
                    <td>${_.ended_at?It(_.ended_at):"—"}</td>
                  </tr>`})}</tbody>
              </table>`:d`<p class="empty-state">No past sessions recorded.</p>`}
    </div>
  </div>`}function Op(e){const t={};for(const s of e){const n=typeof s=="string"?s:s.metric;if(!n)continue;const l=n.split("."),o=l.length>1?l.slice(0,-1).join("."):"(ungrouped)";(t[o]=t[o]||[]).push({name:n,count:s.count||0,lastValue:s.last_value})}return Object.entries(t).sort((s,n)=>s[0].localeCompare(n[0]))}function zp(){const[e,t]=K([]),[s,n]=K(null),[l,o]=K(null),[a,i]=K([]),[r,c]=K(!1),[v,p]=K(null);me(()=>{fetch("/api/samples?list=1").then(T=>{if(!T.ok)throw new Error(T.statusText);return T.json()}).then(T=>{t(T||[]),p(null)}).catch(T=>{t([]),p(T.message)})},[]);const h=ce(()=>Op(e),[e]),b=We(T=>{n(T),o(null),i([]),c(!0);const y=Math.floor(Date.now()/1e3)-1800,$=fetch("/api/samples?series="+encodeURIComponent(T)+"&since="+y).then(w=>{if(!w.ok)throw new Error(w.statusText);return w.json()}).then(w=>o(w)).catch(()=>o(null)),k=fetch("/api/samples?metric="+encodeURIComponent(T)+"&since="+y).then(w=>{if(!w.ok)throw new Error(w.statusText);return w.json()}).then(w=>i(Array.isArray(w)?w:[])).catch(()=>i([]));Promise.allSettled([$,k]).then(()=>c(!1))},[]),S=ce(()=>!l||!l.value||!l.value.length?null:l.value[l.value.length-1],[l]),D=ce(()=>{const T=new Set;for(const y of a)y.tags&&Object.keys(y.tags).forEach($=>T.add($));return[...T].sort()},[a]);return d`<div class="es-layout">
    <div class="es-tool-list">
      <div class="es-section-title">Metrics</div>
      ${v&&d`<p class="error-state" style="padding:0 var(--sp-4)">Error: ${X(v)}</p>`}
      ${!v&&!e.length&&d`<p class="empty-state" style="padding:0 var(--sp-4)">No metrics available.</p>`}
      ${h.map(([T,y])=>d`<div key=${T}>
        <div class="text-muted" style="font-size:0.62rem;padding:0.35rem var(--sp-5) 0.1rem;text-transform:uppercase;letter-spacing:0.03em">${T}</div>
        ${y.map($=>d`<button key=${$.name}
          class=${s===$.name?"es-tool-btn active":"es-tool-btn"}
          onClick=${()=>b($.name)}>
          ${$.name.split(".").pop()}
          ${$.count?d`<span class="badge" style="margin-left:auto;font-size:var(--fs-2xs)">${I($.count)}</span>`:""}
        </button>`)}
      </div>`)}
    </div>
    <div>
      ${!s&&d`<div class="diag-card text-center" style="padding:2rem">
        <p class="text-muted">Select a metric from the sidebar to view its time series.</p>
      </div>`}

      ${s&&d`<Fragment>
        <h3 class="mb-sm">${s}</h3>

        ${r&&d`<p class="loading-state">Loading...</p>`}

        ${!r&&l&&l.ts&&l.ts.length>=2?d`<div class="es-section">
          <div class="es-section-title">Time Series (last 30m)</div>
          <${rs}
            label=${s.split(".").pop()}
            value=${S!=null?I(S):"-"}
            data=${[l.ts,l.value]}
            chartColor="var(--accent)"
            smooth />
        </div>`:""}

        ${!r&&l&&l.ts&&l.ts.length<2&&d`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">Not enough data points to chart.</p>
        </div>`}

        ${!r&&!l&&!r&&d`<div class="es-section">
          <div class="es-section-title">Time Series</div>
          <p class="empty-state">No series data available.</p>
        </div>`}

        ${!r&&a.length>0&&d`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples (${a.length})</div>
          <div style="overflow-x:auto">
            <table style="width:100%;font-size:var(--fs-base);border-collapse:collapse">
              <thead>
                <tr class="text-muted" style="text-align:left;border-bottom:1px solid var(--border)">
                  <th style="padding:var(--sp-2) var(--sp-4)">Time</th>
                  <th style="padding:var(--sp-2) var(--sp-4)">Value</th>
                  ${D.map(T=>d`<th key=${T} style="padding:var(--sp-2) var(--sp-4)">${T}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${a.slice(-50).reverse().map((T,y)=>d`<tr key=${y}
                  style="border-bottom:1px solid var(--border);${y%2?"background:var(--bg2)":""}">
                  <td class="mono text-nowrap" style="padding:var(--sp-2) var(--sp-4)">${qc(T.ts)}</td>
                  <td class="mono" style="padding:var(--sp-2) var(--sp-4)">${I(T.value)}</td>
                  ${D.map($=>d`<td key=${$} style="padding:var(--sp-2) var(--sp-4)">
                    ${T.tags&&T.tags[$]!=null?d`<span class="badge">${T.tags[$]}</span>`:"-"}
                  </td>`)}
                </tr>`)}
              </tbody>
            </table>
          </div>
        </div>`}

        ${!r&&a.length===0&&l&&d`<div class="es-section" style="margin-top:var(--sp-6)">
          <div class="es-section-title">Recent Samples</div>
          <p class="empty-state">No raw samples in the last 30 minutes.</p>
        </div>`}
      </Fragment>`}
    </div>
  </div>`}function cs(e){if(e==null||isNaN(e)||e<=0)return"";const t=Math.round(e/1e3);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Ur(e){if(e==null||isNaN(e))return"—";const t=Math.round(e);if(t<60)return t+"s";const s=Math.floor(t/60);return s<60?s+"m "+t%60+"s":Math.floor(s/60)+"h "+s%60+"m"}function Rp(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit"})}function qr(e){return new Date(e*1e3).toLocaleTimeString([],{hourCycle:"h23",hour:"2-digit",minute:"2-digit",second:"2-digit"})}function Di(e){return e?e.replace("claude-","").replace(/-\d{8}$/,""):""}function Fp(e,t){if(!t)return"";let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{return t.slice(0,80)}if(typeof s!="object"||s===null)return String(t).slice(0,80);const n=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const o of n)if(s[o]){let a=String(s[o]);return(o==="file_path"||o==="path")&&a.length>60&&(a=".../"+a.replace(/\\/g,"/").split("/").slice(-2).join("/")),a.slice(0,100)}const l=Object.keys(s);return l.length>0?String(s[l[0]]).slice(0,80):""}const Ai=["#f97316","#a78bfa","#60a5fa","#f472b6","#34d399","#fbbf24","#06b6d4","#84cc16","#e11d48","#0ea5e9","#c084fc","#fb923c"],Pi={Bash:"#1a1a1a"};function Oi(e){if(Pi[e])return Pi[e];let t=0;for(let s=0;s<e.length;s++)t=t*31+e.charCodeAt(s)&65535;return Ai[t%Ai.length]}function Ip(e,t){const s=new Set,n=[],l=(o,a,i)=>{s.has(o)||(s.add(o),n.push({id:o,label:a||o,color:i||"var(--fg2)"}))};l("user","User","var(--green)"),l("tool",t||"AI Tool",Ae[t]||"var(--accent)");for(const o of e){if((o.type==="api_call"||o.type==="api_response"||o.type==="error")&&l("api","API","var(--accent)"),o.type==="tool_use"){const a=o.to||"tool";l("skill:"+a,a,Oi(a))}if(o.type==="subagent"){const a=o.to||"Subagent";l("subagent:"+a,a,Oi(a))}o.type==="hook"&&l("hook","Hooks","var(--orange)")}return n}function jp({tools:e,activeTool:t,onSelect:s}){return e.length<=1?null:d`<div class="sf-tool-tabs">
    ${e.map(n=>d`<button key=${n} class="sf-tool-tab ${n===t?"active":""}"
      style="border-bottom-color:${n===t?Ae[n]||"var(--accent)":"transparent"};color:${Ae[n]||"var(--fg)"}"
      onClick=${()=>s(n)}>
      <span>${$t[n]||"🔹"}</span> ${X(n)}
    </button>`)}
  </div>`}function Np(e){if(!e)return"";const t=e.split(":");return t.length===3&&/^\d+$/.test(t[1])?t[1]:e.slice(-6)}function Bp({sessions:e,activeId:t,onSelect:s,loading:n}){return n?d`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:e.length?d`<div class="sf-sess-tabs">
    ${e.map(l=>{const o=l.exact_input_tokens||l.input_tokens||0,a=l.exact_output_tokens||l.output_tokens||0,i=o+a,r=l.duration_s||(l.ended_at&&l.started_at?l.ended_at-l.started_at:0),c=l.session_id===t,v=!l.ended_at;return d`<button key=${l.session_id}
        title=${l.session_id}
        class="sf-sess-tab ${c?"active":""}"
        onClick=${()=>s(l.session_id)}>
        <span class="sf-stab-time">${Rp(l.started_at)}</span>
        <span class="sf-stab-sid">${Np(l.session_id)}</span>
        <span class="sf-stab-dur">${Ur(r)}</span>
        ${i>0&&d`<span class="sf-stab-tok">${I(i)}t</span>`}
        ${(l.files_modified||0)>0&&d`<span class="sf-stab-files">${l.files_modified}f</span>`}
        ${v&&d`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:d`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function Hp({event:e}){if(e.type==="user_message")return e.redacted?d`<div class="sf-seq-tooltip">
        <div class="sf-tip-label">User Prompt <span style="color:var(--orange)">(redacted)</span></div>
        <div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">
          Claude Code redacts prompts by default in OTel telemetry.
        </div>
        <div class="sf-tip-meta">
          To capture prompt text, restart Claude Code with:<br/>
          <code style="color:var(--accent)">eval $(aictl otel enable)</code><br/>
          This sets <code>OTEL_LOG_USER_PROMPTS=1</code> before launch.
        </div>
        ${e.prompt_length&&d`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">Prompt length: ${e.prompt_length} chars</div>`}
      </div>`:e.message?d`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">User Prompt</div>
      <div class="sf-tip-body">${X(e.message)}</div>
      ${e.prompt_length&&d`<div class="sf-tip-meta">${e.prompt_length} chars</div>`}
    </div>`:null;if(e.type==="api_call"){const t=e.tokens||{};return d`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Call${e.model?" — "+e.model:""}</div>
      ${e.agent_name&&d`<div class="sf-tip-meta">Agent: ${X(e.agent_name)}</div>`}
      <div class="sf-tip-meta">
        Input: ${I(t.input||0)} \u00B7 Output: ${I(t.output||0)}
        ${(t.cache_read||0)>0?" · Cache: "+I(t.cache_read):""}
      </div>
      <div class="sf-tip-meta">
        ${e.duration_ms>0?"Duration: "+cs(e.duration_ms):""}
        ${e.ttft_ms>0?" · TTFT: "+cs(e.ttft_ms):""}
      </div>
      ${e.is_error&&d`<div class="sf-tip-meta" style="color:var(--red)">Error: ${X(e.error_type||"unknown")}</div>`}
    </div>`}if(e.type==="api_response"){const t=e.tokens||{};return d`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${e.model?" — "+e.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${I(t.output||0)} tokens
        ${e.duration_ms>0?" · Latency: "+cs(e.duration_ms):""}
        ${e.finish_reason?" · "+e.finish_reason:""}
      </div>
      ${e.response_preview&&d`<div class="sf-tip-body">${X(e.response_preview)}</div>`}
    </div>`}if(e.type==="error")return d`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${X(e.error_type||"unknown")}</div>
      ${e.error_message&&d`<div class="sf-tip-body">${X(e.error_message)}</div>`}
      ${e.parent_span&&d`<div class="sf-tip-meta">During: ${X(e.parent_span)}</div>`}
    </div>`;if(e.type==="tool_use"){let t=null;if(e.params){let s=e.params;if(typeof s=="string")try{s=JSON.parse(s)}catch{s=null}s&&typeof s=="object"&&(t=Object.entries(s).filter(([n,l])=>l!=null&&l!==""))}return d`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${X(e.to||"Tool")}${e.subtype==="result"?" (result)":e.subtype==="decision"?" (decision)":""}</div>
      ${e.decision&&d`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${X(e.decision)}</strong></div>`}
      ${t?d`<div class="sf-tip-params">
            ${t.map(([s,n])=>{const l=String(n),o=l.length>120;return d`<div key=${s} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${X(s)}</span>
                <span class="sf-tip-param-val ${o?"sf-tip-param-long":""}" title=${l}>${X(o?l.slice(0,200)+"...":l)}</span>
              </div>`})}
          </div>`:e.params&&d`<div class="sf-tip-body mono">${X(e.params)}</div>`}
      ${(e.success||e.duration_ms>0||e.result_size)&&d`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${e.success?"Success: "+e.success:""}
        ${e.duration_ms>0?" · "+cs(e.duration_ms):""}
        ${e.result_size?" · Result: "+e.result_size+" bytes":""}
      </div>`}
    </div>`}return e.type==="subagent"?d`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${X(e.to||"agent")}</div>
    </div>`:e.type==="hook"?d`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${X(e.hook_name||"")}</div>
    </div>`:null}function Wp({event:e,participants:t,hoveredIdx:s,idx:n,onHover:l}){const o=t.findIndex(k=>k.id===e._from),a=t.findIndex(k=>k.id===e._to);if(o<0||a<0)return null;const i=a>o,r=Math.min(o,a),c=Math.max(o,a),v=s===n,p=t.find(k=>k.id===e._to),b={user_message:"var(--green)",api_call:e.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:(p==null?void 0:p.color)||"var(--cat-commands)",subagent:(p==null?void 0:p.color)||"var(--yellow)",hook:"var(--orange)"}[e.type]||"var(--fg2)";let S="",D="";if(e.type==="user_message")e.redacted?S="🔒 prompt ("+(e.prompt_length||"?")+" chars)":(S=e.preview||"(prompt)",e.prompt_length&&(D=e.prompt_length+" chars"));else if(e.type==="api_call"){const k=e.tokens||{};S=e.agent_name||Di(e.model)||"API call",D=I((k.input||0)+(k.output||0))+"t",e.ttft_ms>0?D+=" ttft:"+cs(e.ttft_ms):e.duration_ms>0&&(D+=" "+cs(e.duration_ms)),e.is_error&&(D+=" ⚠")}else if(e.type==="api_response"){const k=e.tokens||{};S="← "+I(k.output||0)+"t",e.response_preview&&(S+=" "+e.response_preview.slice(0,60)),D=Di(e.model)||"",e.finish_reason&&e.finish_reason!=="stop"&&(D+=" ["+e.finish_reason+"]")}else if(e.type==="error")S="⚠ "+(e.error_type||"error"),D=e.error_message?e.error_message.slice(0,60):"";else if(e.type==="tool_use"){const k=e.to||"tool",w=Fp(k,e.params);S=k+(w?": "+w:""),e.subtype==="result"?(D=e.success==="true"||e.success===!0?"✓":"✗",e.duration_ms>0&&(D+=" "+cs(e.duration_ms)),e.result_size&&(D+=" "+e.result_size+"B")):e.subtype==="decision"&&(D=e.decision||"")}else e.type==="subagent"?S=e.to||"subagent":e.type==="hook"&&(S=e.hook_name||"hook");const T=100/t.length,y=(r+.5)*T,$=(c+.5)*T;return d`<div class="sf-seq-row ${v?"hovered":""}"
    onMouseEnter=${()=>l(n)} onMouseLeave=${()=>l(null)}>
    <!-- Token columns (left side) -->
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${e._cumTok>0?I(e._cumTok):""}</span>
      <span class="sf-seq-rttok">${e._rtTok>0?I(e._rtTok):""}</span>
    </div>
    <!-- Time -->
    <div class="sf-seq-time">${qr(e.ts)}</div>
    <!-- Arrow area -->
    <div class="sf-seq-arrow-area">
      <!-- Swimlane lines -->
      ${t.map((k,w)=>d`<div key=${w} class="sf-seq-lane"
        style="left:${(w+.5)*T}%"></div>`)}
      <!-- Arrow line -->
      <div class="sf-seq-arrow-line" style="
        left:${y}%;
        width:${$-y}%;
        border-color:${b};
      "></div>
      <!-- Arrowhead -->
      <div class="sf-seq-arrowhead" style="
        left:${i?$:y}%;
        border-${i?"left":"right"}-color:${b};
        transform:translateX(${i?"-100%":"0"});
      "></div>
      <!-- Label -->
      <div class="sf-seq-label" style="
        left:${(y+$)/2}%;
        color:${b};
      "><span class="sf-seq-label-text" title=${S}>${X(S)}</span>
        ${D&&d`<span class="sf-seq-sublabel">${D}</span>`}
      </div>
    </div>
    <!-- Hover tooltip -->
    ${v&&d`<${Hp} event=${e}/>`}
  </div>`}function Vp({event:e,participants:t}){100/t.length;let s="",n="var(--fg2)",l="";return e.type==="session_start"?(s="Session started",n="var(--green)",l="▶"):e.type==="session_end"?(s="Session ended",n="var(--fg3)",l="■"):e.type==="compaction"&&(s="Compaction"+(e.compaction_count?" #"+e.compaction_count:""),n="var(--orange)",l="⟳"),d`<div class="sf-seq-marker" style="border-left-color:${n}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${qr(e.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${n}">
      ${l} ${s}
      ${e.type==="compaction"&&e.duration_ms>0?" — "+cs(e.duration_ms):""}
      ${e.cwd?d` <span class="text-muted text-xs mono">${X(e.cwd)}</span>`:""}
    </div>
  </div>`}function Up({summary:e}){return!e||!e.event_count?null:d`<div class="sf-summary">
    ${e.total_turns>0&&d`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${e.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${e.total_api_calls||0}</div></div>
    ${e.total_tool_uses>0&&d`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${e.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${I(e.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${I(e.total_input_tokens)}/${I(e.total_output_tokens)}</div></div>
    ${e.compactions>0&&d`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${e.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${Ur(e.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${e.event_count}</div></div>
  </div>`}function qp(){const{snap:e,globalRange:t,enabledTools:s}=tt(Ue),[n,l]=K([]),[o,a]=K(!0),[i,r]=K(null),[c,v]=K(null),[p,h]=K(null),[b,S]=K(!1),[D,T]=K(null);me(()=>{a(!0);let _="/api/session-timeline?since="+(t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400);t&&t.until!=null&&(_+="&until="+t.until),fetch(_).then(C=>C.json()).then(C=>{C.sort((L,R)=>(R.started_at||0)-(L.started_at||0)),l(C),a(!1)}).catch(()=>a(!1))},[t]);const y=O=>s===null||s.includes(O),$=n.filter(O=>y(O.tool)),k=[...new Set($.map(O=>O.tool))].sort();me(()=>{(!i&&k.length>0||i&&!k.includes(i)&&k.length>0)&&r(k[0])},[k.join(",")]);const w=$.filter(O=>O.tool===i);me(()=>{w.length>0&&(!c||!w.find(O=>O.session_id===c))&&v(w[0].session_id)},[i,w.length]),me(()=>{if(!c){h(null);return}S(!0);const O=n.find(L=>L.session_id===c),_=O!=null&&O.started_at?O.started_at-60:Date.now()/1e3-86400,C=O!=null&&O.ended_at?O.ended_at+60:Date.now()/1e3+60;fetch(`/api/session-flow?session_id=${encodeURIComponent(c)}&since=${_}&until=${C}`).then(L=>L.json()).then(L=>{h(L),S(!1)}).catch(()=>{h(null),S(!1)})},[c]);const{processedTurns:N,participants:A}=ce(()=>{const O=(p==null?void 0:p.turns)||[];if(!O.length)return{processedTurns:[],participants:[]};const _=O.map(z=>{const V={...z};return z.type==="user_message"?(V._from="user",V._to="tool"):z.type==="api_call"?(V._from=z.from||"tool",V._to="api"):z.type==="api_response"||z.type==="error"?(V._from="api",V._to="tool"):z.type==="tool_use"?(V._from="tool",V._to="skill:"+(z.to||"tool")):z.type==="subagent"?(V._from="tool",V._to="subagent:"+(z.to||"agent")):z.type==="hook"&&(V._from="tool",V._to="hook"),V});let C=0,L=0;for(const z of _){const V=z.tokens||{},q=(V.input||0)+(V.output||0);z.type==="user_message"&&(L=0),z.type==="api_call"&&(C+=q,L+=q),z._cumTok=C,z._rtTok=L}const R=Ip(_,i);return{processedTurns:_,participants:R}},[p,i]),P=(p==null?void 0:p.summary)||{};return N.filter(O=>O._from&&O._to),N.filter(O=>!O._from||!O._to),d`<div class="sf-container">
    <!-- Tool tabs -->
    <${jp} tools=${k} activeTool=${i} onSelect=${r}/>

    <!-- Session tabs -->
    <${Bp} sessions=${w} activeId=${c}
      onSelect=${v} loading=${o}/>

    <!-- Summary -->
    <${Up} summary=${P}/>

    <!-- Sequence diagram -->
    <div class="sf-seq-container">
      ${b?d`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`:N.length===0?d`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No flow data for this session.</p>
              <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
                Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
              </p>
            </div>`:d`
            <!-- Participant headers (swimlane columns) -->
            <div class="sf-seq-header">
              <div class="sf-seq-tokens">
                <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
              </div>
              <div class="sf-seq-time"></div>
              <div class="sf-seq-arrow-area">
                ${A.map((O,_)=>{const C=100/A.length;return d`<div key=${O.id} class="sf-seq-participant"
                    style="left:${(_+.5)*C}%;color:${O.color}">
                    <div class="sf-seq-participant-box" style="border-color:${O.color}">${X(O.label)}</div>
                  </div>`})}
              </div>
            </div>
            <!-- Event rows -->
            <div class="sf-seq-body">
              ${N.map((O,_)=>O._from&&O._to?d`<${Wp} key=${_} event=${O} participants=${A}
                    hoveredIdx=${D} idx=${_} onHover=${T}/>`:d`<${Vp} key=${_} event=${O} participants=${A}/>`)}
            </div>
          `}
    </div>
  </div>`}const Gp={enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).",enabled:"Whether agent/agentic mode is active.",autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode allows the agent to execute tool calls without confirmation prompts. Use with caution.",autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.",skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks.",webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."};function Yp(e){return Gp[e]||""}function Kp({v:e}){return e===!0?d`<span style="color:var(--green);font-weight:600">on</span>`:e===!1?d`<span style="color:var(--red);opacity:0.8">off</span>`:e==null||e===""?d`<span class="text-muted">—</span>`:typeof e=="object"?d`<span class="mono" style="font-size:var(--fs-xs)">${JSON.stringify(e)}</span>`:d`<span class="mono">${String(e)}</span>`}function Xs({k:e,v:t,indent:s}){const n=e.replace(/([A-Z])/g," $1").replace(/^./,o=>o.toUpperCase()),l=Yp(e);return d`<div
    title=${l}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${s?"var(--sp-6)":"var(--sp-4)"};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${l?"help":"default"}">
    <span style="color:var(--fg2)">${n}${l?d`<span style="color:var(--fg3);margin-left:3px;font-size:0.6em">?</span>`:""}</span>
    <${Kp} v=${t}/>
  </div>`}function Gr({otel:e}){if(!e||!e.enabled&&!e.source)return null;const t=e.enabled;return d`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:${t?"var(--green)":"var(--fg3)"};padding:var(--sp-2) var(--sp-4) var(--sp-1)">
      OpenTelemetry ${t?"● on":"○ off"}
    </div>
    <div style="border:1px solid ${t?"var(--green)":"var(--bg2)"};border-radius:4px;overflow:hidden;
                background:${t?"color-mix(in srgb,var(--green) 4%,transparent)":"transparent"}">
      ${t&&d`<${Xs} k="exporter" v=${e.exporter||"—"}/>`}
      ${e.endpoint&&d`<${Xs} k="endpoint" v=${e.endpoint}/>`}
      ${e.file_path&&d`<${Xs} k="file_path" v=${e.file_path}/>`}
      ${e.capture_content!==void 0&&d`<${Xs} k="capture_content" v=${!!e.capture_content}/>`}
      ${!t&&e.source&&d`<${Xs} k="source" v=${e.source}/>`}
    </div>
  </div>`}function So({name:e,items:t}){const s=Object.entries(t);return s.length?d`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${e}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${s.map(([n,l])=>d`<${Xs} key=${n} k=${n} v=${l}/>`)}
    </div>
  </div>`:null}function Jp({cfg:e,label:t}){var i,r;const s=$t[e.tool]||"🔹",n=Ae[e.tool]||"var(--fg2)",l=Object.entries(e.feature_groups||{}),o=Object.entries(e.settings||{}).filter(([c])=>!["agent_historySummarizationMode","agent_maxRequests","debug_requestLoggerMaxEntries","planModel","implementModel"].includes(c));return((i=e.otel)==null?void 0:i.enabled)||((r=e.otel)==null?void 0:r.source)||l.length||o.length||(e.hints||[]).length||(e.mcp_servers||[]).length||(e.extensions||[]).length?d`<div style="background:var(--bg);border:2px solid ${n};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${n} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${n}">
      <span>${s}</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${n}">${t||e.tool}</span>
      ${e.model&&d`<span class="badge mono">${e.model}</span>`}
      ${e.auto_update===!0&&d`<span class="badge">auto-update on</span>`}
      ${e.auto_update===!1&&d`<span class="badge" style="opacity:0.6">auto-update off</span>`}
      ${e.launch_at_startup===!0&&d`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${e.launch_at_startup===!1&&d`<span class="badge" style="opacity:0.6">no auto-start</span>`}
    </div>
    <div style="padding:var(--sp-4);flex:1">
      <${Gr} otel=${e.otel}/>
      ${l.map(([c,v])=>d`<${So} key=${c} name=${c} items=${v}/>`)}
      ${o.length>0&&d`<${So} name="Settings" items=${Object.fromEntries(o)}/>`}
      ${(e.mcp_servers||[]).length>0&&d`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">MCP Servers</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${e.mcp_servers.map(c=>d`<span key=${c} class="pill mono">${c}</span>`)}
        </div>
      </div>`}
      ${(e.extensions||[]).length>0&&d`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Extensions</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${e.extensions.map(c=>d`<span key=${c} class="pill mono" style="font-size:var(--fs-2xs)">${c}</span>`)}
        </div>
      </div>`}
      ${(e.hints||[]).length>0&&d`<div style="padding:var(--sp-3) var(--sp-4);border-left:3px solid var(--orange);
          background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
        ${e.hints.map((c,v)=>d`<div key=${v} class="text-orange" style="font-size:var(--fs-sm);padding:1px 0">
          <span style="margin-right:var(--sp-2)">💡</span>${c}
        </div>`)}
      </div>`}
    </div>
  </div>`:null}function Qp({cfg:e}){var o,a,i,r;if(!e)return null;const t=Object.entries(e.feature_groups||{});if(!t.length&&!((o=e.otel)!=null&&o.enabled)&&!((a=e.otel)!=null&&a.source))return null;const n=(((i=e.feature_groups)==null?void 0:i.Safety)||{}).globalAutoApprove===!0,l=(((r=e.feature_groups)==null?void 0:r.Agent)||{}).autoReply===!0;return d`<div style="background:var(--bg);border:2px solid #007acc;border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,#007acc 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid #007acc">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:#007acc">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${n&&d`<span class="badge" style="margin-left:auto;background:var(--red);color:#fff;font-weight:700">⚠ YOLO MODE ON</span>`}
      ${!n&&l&&d`<span class="badge" style="margin-left:auto;background:var(--orange);color:#fff">⚠ auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${Gr} otel=${e.otel}/>
      ${t.map(([c,v])=>d`<${So} key=${c} name=${c} items=${v}/>`)}
    </div>
  </div>`}function Zp({snap:e}){var l,o,a;const t=Ae.aictl||"#94a3b8",s=Object.entries(((l=e==null?void 0:e.live_monitor)==null?void 0:l.diagnostics)||{}),n=[...((o=e==null?void 0:e.live_monitor)==null?void 0:o.workspace_paths)||[],...((a=e==null?void 0:e.live_monitor)==null?void 0:a.state_paths)||[]];return!s.length&&!n.length?null:d`<div style="background:var(--bg);border:2px solid ${t};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${t} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${t}">
      <span>⚙️</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${t}">aictl</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">monitoring engine</span>
    </div>
    <div style="padding:var(--sp-4);flex:1">
      ${s.length>0&&d`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Collectors</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
          ${s.map(([i,r])=>{const c=r.status==="active";return d`<div key=${i} title=${r.detail||""} style="display:flex;align-items:baseline;gap:var(--sp-4);padding:3px var(--sp-4);
                font-size:var(--fs-sm);border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);cursor:help">
              <span class="mono" style="flex:1">${i}</span>
              <span style="color:var(--fg3)">${r.mode||""}</span>
              <span style="color:${c?"var(--green)":"var(--orange)"}">
                ${c?"●":"○"} ${r.status||"unknown"}
              </span>
            </div>`})}
        </div>
      </div>`}
      ${n.length>0&&d`<div>
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Monitored Roots</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4)">
          ${n.map((i,r)=>d`<div key=${r} class="mono text-muted" style="font-size:var(--fs-xs);padding:1px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${i}>${i}</div>`)}
        </div>
      </div>`}
    </div>
  </div>`}function Xp(){const{snap:e}=tt(Ue),t=ce(()=>e!=null&&e.tool_configs?e.tool_configs:[],[e]),s=ce(()=>{const o={};return((e==null?void 0:e.tools)||[]).forEach(a=>{o[a.tool]=a.label}),o},[e]);if(!e)return d`<p class="loading-state">Loading...</p>`;if(!t.length)return d`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const n=t.find(o=>o.tool==="vscode"),l=t.filter(o=>o.tool!=="vscode");return d`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${n&&d`<${Qp} cfg=${n}/>`}
    ${l.map(o=>d`<${Jp} key=${o.tool} cfg=${o} label=${s[o.tool]||o.tool}/>`)}
    <${Zp} snap=${e}/>
  </div>`}const Un={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},ef=["project","global","shadow","session","external"],qn=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function tf(e,t){const s=Ss(e),n=Ss(t);if(!s)return"(unknown)";if(n&&s.startsWith(n+"/")){const l=s.slice(n.length+1).split("/")[0];return l.startsWith(".")?"(root)":l}return s.includes("/.claude/projects/")?"(shadow)":s.includes("/.claude/")||s.includes("/.config/")||s.includes("/Library/")||s.includes("/AppData/")?"(global)":"(other)"}function sf(e){if(!e)return"unknown";const t=Ss(e).split("/"),s=t.pop()||"unknown",n=s.lastIndexOf("."),l=n>0?s.slice(0,n):s;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test(l)){const o=t.pop();if(o)return o}return l}function nf(){const{snap:e}=tt(Ue),[t,s]=K(null),n=ce(()=>{if(!e)return null;const o=e.tools.filter(T=>T.tool!=="aictl"&&T.tool!=="any");if(!o.length)return null;const a=e.root||"",i={},r={},c={},v={yes:0,"on-demand":0,conditional:0,no:0};let p=0;for(const T of o)for(const y of T.files){const $=y.kind||"other",k=y.scope||"external",w=(y.sent_to_llm||"no").toLowerCase(),N=y.tokens||0,A=tf(y.path,a),P=sf(y.path);i[$]||(i[$]={tokens:0,files:0,projects:{}}),i[$].tokens+=N,i[$].files+=1,i[$].projects[A]||(i[$].projects[A]={tokens:0,count:0}),i[$].projects[A].tokens+=N,i[$].projects[A].count+=1,c[A]||(c[A]={tokens:0,count:0,cats:{}}),c[A].tokens+=N,c[A].count+=1,c[A].cats[$]||(c[A].cats[$]={tokens:0,count:0,items:{}}),c[A].cats[$].tokens+=N,c[A].cats[$].count+=1,c[A].cats[$].items[P]||(c[A].cats[$].items[P]=0),c[A].cats[$].items[P]+=N,r[k]||(r[k]={tokens:0,files:0}),r[k].tokens+=N,r[k].files+=1,v[w]!==void 0?v[w]+=N:v.no+=N,p+=N}const h=Object.entries(i).sort((T,y)=>y[1].tokens-T[1].tokens),b=ef.filter(T=>r[T]).map(T=>[T,r[T]]),S=Object.entries(c).sort((T,y)=>y[1].tokens-T[1].tokens),D=o.map(T=>({tool:T.tool,label:T.label,tokens:T.files.reduce((y,$)=>y+$.tokens,0),files:T.files.length,sentYes:T.files.filter(y=>(y.sent_to_llm||"").toLowerCase()==="yes").reduce((y,$)=>y+$.tokens,0)})).filter(T=>T.tokens>0).sort((T,y)=>y.tokens-T.tokens).slice(0,8);return{cats:h,scopes:b,byPolicy:v,totalTokens:p,perTool:D,byCat:i,byProj:c,projList:S}},[e]);if(!n)return d`<p class="empty-state">No file data available.</p>`;if(!n.totalTokens)return d`<p class="empty-state">No token data collected yet.</p>`;const l=Math.max(...n.cats.map(([,o])=>o.tokens),1);return d`<div class="diag-card" role="region" aria-label="Context window map">
    <h3 style=${{marginBottom:"var(--sp-5)"}}>Context Window Map</h3>

    <!-- Policy summary -->
    <div class="flex-row flex-wrap gap-md mb-md">
      <span class="badge--accent badge" data-dp="overview.context_map.sent_to_llm" style="background:var(--green);color:var(--bg)">
        Sent to LLM: ${I(n.byPolicy.yes)} tok</span>
      <span class="badge" data-dp="overview.context_map.on_demand" style="background:var(--yellow);color:var(--bg)">
        On-demand: ${I(n.byPolicy["on-demand"])} tok</span>
      <span class="badge" data-dp="overview.context_map.conditional" style="background:var(--orange);color:var(--bg)">
        Conditional: ${I(n.byPolicy.conditional)} tok</span>
      <span class="badge--muted badge" data-dp="overview.context_map.not_sent">
        Not sent: ${I(n.byPolicy.no)} tok</span>
    </div>

    <!-- Top stacked bar: tokens by category -->
    <div class="mb-md">
      <div class="es-section-title">Tokens by Category (${I(n.totalTokens)} total)</div>
      <div class="overflow-hidden" style="display:flex;height:24px;border-radius:4px;background:var(--bg)">
        ${n.cats.map(([o,a])=>{const i=a.tokens/n.totalTokens*100;return i<.5?null:d`<div key=${o} style="width:${i}%;background:${Un[o]||"var(--fg2)"};
            position:relative;min-width:2px"
            title="${o}: ${I(a.tokens)} tokens (${a.files} files)">
            ${i>8?d`<span class="text-ellipsis text-bold" style="position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;font-size:var(--fs-2xs);color:var(--bg);padding:0 2px">${o}</span>`:null}
          </div>`})}
      </div>
    </div>

    <!-- Per-category bars with project sub-segments -->
    <div class="mb-md">
      ${n.cats.map(([o,a])=>{const i=Object.entries(a.projects).sort((c,v)=>v[1].tokens-c[1].tokens),r=a.tokens/l*100;return d`<div key=${o} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);font-size:var(--fs-base)">
          <span class="text-bold text-right" style="width:80px;color:${Un[o]||"var(--fg2)"};flex-shrink:0">${o}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${r}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${i.map(([c,v],p)=>{const h=a.tokens>0?v.tokens/a.tokens*100:0;if(h<.5)return null;const b=!t||t===c;return d`<div key=${c} style="width:${h}%;height:100%;
                  background:${Un[o]||"var(--fg2)"};
                  opacity:${b?Math.max(.3,1-p*.12):.12};
                  border-right:1px solid var(--bg);
                  display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px;
                  cursor:pointer;transition:opacity 0.15s"
                  title="${c}: ${I(v.tokens)} tok (${v.count} files)"
                  onClick=${()=>s(t===c?null:c)}>
                  ${h>12&&r>15?d`<span style="font-size:9px;color:var(--bg);
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:600">${c}</span>`:null}
                </div>`})}
            </div>
          </div>
          <span class="text-right text-muted" style="min-width:55px">${I(a.tokens)} tok</span>
          <span class="text-right text-muted" style="min-width:40px">${a.files} f</span>
        </div>`})}
    </div>

    <!-- Project sub-tabs -->
    <div class="flex-row flex-wrap gap-sm" style="border-bottom:1px solid var(--border);padding-bottom:var(--sp-2);margin-bottom:var(--sp-4)">
      ${n.projList.map(([o,a])=>{const i=t===o;return d`<button key=${o}
          style="cursor:pointer;padding:var(--sp-1) var(--sp-3);font-size:var(--fs-sm);
            background:${i?"var(--accent)":"transparent"};
            color:${i?"var(--bg)":"var(--fg2)"};
            border:1px solid ${i?"var(--accent)":"var(--border)"};
            border-radius:4px 4px 0 0;font-weight:${i?600:400};border-bottom:none"
          onClick=${()=>s(i?null:o)}>
          ${o} (${I(a.tokens)})
        </button>`})}
    </div>

    <!-- Tab content: per-category bars with item sub-segments -->
    ${t&&n.byProj[t]?(()=>{const o=n.byProj[t],a=Object.entries(o.cats).sort((r,c)=>c[1].tokens-r[1].tokens),i=Math.max(...a.map(([,r])=>r.tokens),1);return d`<div class="mb-md" style="background:var(--bg2);border-radius:6px;padding:var(--sp-4)">
        <div class="es-section-title">${t} \u2014 ${I(o.tokens)} tokens across ${o.count} files</div>
        ${a.map(([r,c])=>{const v=Object.entries(c.items).sort((S,D)=>D[1]-S[1]),p=v.slice(0,15),h=v.slice(15).reduce((S,[,D])=>S+D,0);h>0&&p.push(["(other)",h]);const b=c.tokens/i*100;return d`<div key=${r} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${Un[r]||"var(--fg2)"};flex-shrink:0">${r}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${b}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${p.map(([S,D],T)=>{const y=c.tokens>0?D/c.tokens*100:0;if(y<.3)return null;const $=qn[T%qn.length];return d`<div key=${S} style="width:${y}%;height:100%;background:${$};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${S}: ${I(D)} tok">
                      ${y>10&&b>20?d`<span style="font-size:9px;color:#111;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:700">${S}</span>`:null}
                    </div>`})}
                </div>
              </div>
              <span class="text-right text-muted" style="min-width:55px">${I(c.tokens)} tok</span>
              <span class="text-right text-muted" style="min-width:30px">${c.count}f</span>
            </div>
            <!-- Item legend -->
            <div style="padding-left:88px;display:flex;flex-wrap:wrap;gap:var(--sp-1) var(--sp-3);margin-top:3px">
              ${p.map(([S,D],T)=>d`<span key=${S}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${qn[T%qn.length]};flex-shrink:0"></span>
                <span class="text-muted">${S} ${I(D)}</span>
              </span>`)}
            </div>
          </div>`})}
      </div>`})():null}

    <!-- Scope + Per-tool side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-8)">
      <div>
        <div class="es-section-title">By Scope</div>
        ${n.scopes.map(([o,a])=>d`<div key=${o} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span class="text-bold">${o}</span>
          <span class="text-muted">${a.files} files \u00B7 ${I(a.tokens)} tok</span>
        </div>`)}
      </div>
      <div>
        <div class="es-section-title">By Tool</div>
        ${n.perTool.map(o=>d`<div key=${o.tool} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span><span style="color:${Ae[o.tool]||"var(--fg2)"}">${$t[o.tool]||"🔹"}</span> ${X(o.label)}</span>
          <span class="text-muted">${I(o.sentYes)} sent \u00B7 ${I(o.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}const lf={active:"var(--green)",degraded:"var(--orange)",disabled:"var(--fg2)",unknown:"var(--fg2)"};function of(e){if(!e||e<0)return"—";const t=Math.floor(e/3600),s=Math.floor(e%3600/60);return t>0?`${t}h ${s}m`:`${s}m`}function af(){var h,b,S,D,T;const{snap:e}=tt(Ue),[t,s]=K(null),[n,l]=K(null);me(()=>{let y=!0;const $=()=>{fetch("/api/otel-status").then(w=>w.json()).then(w=>{y&&s(w)}).catch(()=>{}),fetch("/api/self-status").then(w=>w.json()).then(w=>{y&&l(w)}).catch(()=>{})};$();const k=setInterval($,15e3);return()=>{y=!1,clearInterval(k)}},[]);const o=ce(()=>{if(!e)return[];const y=e.tool_telemetry||[];return e.tools.filter($=>$.tool!=="aictl"&&$.tool!=="any").map($=>{var O,_,C,L,R;const k=y.find(z=>z.tool===$.tool),w=$.live||{},N=w.last_seen_at||0,A=N>0?Math.floor(Date.now()/1e3-N):-1,P=A>3600||A<0;return{tool:$.tool,label:$.label,source:(k==null?void 0:k.source)||(w.session_count?"live-monitor":"discovery"),confidence:(k==null?void 0:k.confidence)||((O=w.token_estimate)==null?void 0:O.confidence)||0,inputTokens:(k==null?void 0:k.input_tokens)||0,outputTokens:(k==null?void 0:k.output_tokens)||0,cost:(k==null?void 0:k.cost_usd)||0,sessions:(k==null?void 0:k.total_sessions)||w.session_count||0,errors:((_=k==null?void 0:k.errors)==null?void 0:_.length)||0,lastError:((C=k==null?void 0:k.errors)==null?void 0:C[0])||null,lastSeen:A,stale:P,fileCount:$.files.length,procCount:$.processes.length,hasLive:!!$.live,hasOtel:!!((R=(L=w.sources||[]).includes)!=null&&R.call(L,"otel"))}}).sort(($,k)=>k.inputTokens+k.outputTokens-($.inputTokens+$.outputTokens))},[e]),a=ce(()=>{var y;return(y=e==null?void 0:e.live_monitor)!=null&&y.diagnostics?Object.entries(e.live_monitor.diagnostics).map(([$,k])=>({name:$,status:k.status||"unknown",mode:k.mode||"",detail:k.detail||""})):[]},[e]);if(!e)return null;const i=o.length,r=o.filter(y=>y.inputTokens+y.outputTokens>0).length,c=o.filter(y=>y.hasLive).length,v=o.filter(y=>y.stale&&y.hasLive).length,p=o.reduce((y,$)=>y+$.errors,0);return d`<div class="diag-card" role="region" aria-label="Collector health">
    <h3 style=${{marginBottom:"var(--sp-4)"}}>Monitoring Health</h3>

    <!-- Summary badges -->
    <div class="flex-row flex-wrap gap-sm mb-md">
      <span class="badge" data-dp="overview.collector_health.tools_with_telemetry" style="background:var(--green);color:var(--bg)">${r}/${i} tools with telemetry</span>
      <span class="badge" data-dp="overview.collector_health.live_tools" style="background:var(--accent);color:var(--bg)">${c} live</span>
      ${v>0?d`<span class="badge" data-dp="overview.collector_health.stale_tools" style="background:var(--orange);color:var(--bg)">${v} stale</span>`:null}
      ${p>0?d`<span class="badge" data-dp="overview.collector_health.errors" style="background:var(--red);color:var(--bg)">${p} errors</span>`:null}
      ${t!=null&&t.active?d`<span class="badge" data-dp="overview.collector_health.otel_status" style="background:var(--green);color:var(--bg)">OTel active</span>`:d`<span class="badge--muted badge" data-dp="overview.collector_health.otel_status">OTel inactive</span>`}
    </div>

    <!-- aictl self-monitoring -->
    ${n?d`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">aictl Monitor Service <span class="text-muted text-xs">(self)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">CPU</div>
          <div class="metric-chip-value">${ge(n.cpu_percent||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Memory (RSS)</div>
          <div class="metric-chip-value">${xe(n.memory_rss_bytes||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Size</div>
          <div class="metric-chip-value">${xe(((h=n.db)==null?void 0:h.file_size_bytes)||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Uptime</div>
          <div class="metric-chip-value">${of(n.uptime_s)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Threads</div>
          <div class="metric-chip-value">${n.threads||"—"}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">DB Rows</div>
          <div class="metric-chip-value" title="metrics + tool_metrics + events + samples">
            ${I((((b=n.db)==null?void 0:b.metrics_count)||0)+(((S=n.db)==null?void 0:S.tool_metrics_count)||0)+(((D=n.db)==null?void 0:D.events_count)||0)+(((T=n.db)==null?void 0:T.samples_count)||0))}</div>
        </div>
      </div>
      ${n.sink?d`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--sp-2);margin-top:var(--sp-2)">
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Emitted</div>
          <div class="metric-chip-value">${I(n.sink.total_emitted||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Flushed</div>
          <div class="metric-chip-value">${I(n.sink.total_flushed||0)}</div>
        </div>
        <div class="metric-chip" style="${(n.sink.total_dropped||0)>0?"background:rgba(248,113,113,0.15);border:1px solid var(--red)":""}">
          <div class="metric-chip-label" style="${(n.sink.total_dropped||0)>0?"color:var(--red);font-weight:600":"color:var(--fg2)"}">Dropped</div>
          <div class="metric-chip-value" style="${(n.sink.total_dropped||0)>0?"color:var(--red)":""}">${I(n.sink.total_dropped||0)}</div>
        </div>
        <div class="metric-chip">
          <div class="metric-chip-label text-muted">Tracked</div>
          <div class="metric-chip-value">${I(n.sink.metrics_tracked||0)}</div>
        </div>
      </div>
      ${n.sink.is_flooding?d`<div style="margin-top:var(--sp-2);padding:var(--sp-2) var(--sp-3);background:rgba(248,113,113,0.15);border:1px solid var(--red);border-radius:4px;color:var(--red);font-size:var(--fs-xs);font-weight:600">
        DATA LOSS: Flood protection active \u2014 dropping samples (>${n.sink.total_dropped} lost)
      </div>`:null}`:null}
      <div class="text-xs text-muted" style="margin-top:var(--sp-1)">
        PID ${n.pid} \u00b7 These metrics are about the aictl monitoring service itself, not the AI tools it monitors.
      </div>
    </div>`:null}

    <!-- OTel receiver stats -->
    ${t?d`<div class="mb-md" style="font-size:var(--fs-sm)">
      <div class="es-section-title">OTel Receiver</div>
      <div class="flex-row gap-md flex-wrap">
        <span>Metrics: <strong>${t.metrics_received||0}</strong></span>
        <span>Events: <strong>${t.events_received||0}</strong></span>
        <span>API calls: <strong>${t.api_calls_total||0}</strong></span>
        ${t.api_errors_total>0?d`<span class="text-red">Errors: <strong>${t.api_errors_total}</strong></span>`:null}
        ${t.errors>0?d`<span class="text-orange">Parse errors: <strong>${t.errors}</strong></span>`:null}
        ${t.last_receive_at>0?d`<span class="text-muted">Last: ${It(t.last_receive_at)}</span>`:null}
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
          <tbody>${o.map(y=>{var $;return d`<tr key=${y.tool}
            style="border-bottom:1px solid var(--bg3);opacity:${y.stale&&!y.fileCount?.4:1}">
            <td style="padding:var(--sp-1) var(--sp-2);white-space:nowrap">
              <span style="color:${Ae[y.tool]||"var(--fg2)"}">${$t[y.tool]||"🔹"}</span>
              ${X(y.label)}</td>
            <td style="padding:var(--sp-1) var(--sp-2)" class="text-muted mono">${y.source}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              <span style="color:${y.confidence>=.9?"var(--green)":y.confidence>=.7?"var(--yellow)":"var(--orange)"}">
                ${y.confidence>0?ge(y.confidence*100):"—"}</span></td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.inputTokens?I(y.inputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.outputTokens?I(y.outputTokens):"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.sessions||"—"}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:center">
              ${y.errors>0?d`<span class="text-red" title=${(($=y.lastError)==null?void 0:$.message)||""}>${y.errors}</span>`:d`<span class="text-green">0</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">
              ${y.lastSeen>=0?d`<span style="color:${y.stale?"var(--orange)":"var(--fg2)"}">${It(Date.now()/1e3-y.lastSeen)}</span>`:d`<span class="text-muted">\u2014</span>`}</td>
            <td style="padding:var(--sp-1) var(--sp-2);text-align:right">${y.fileCount}</td>
          </tr>`})}</tbody>
        </table>
      </div>
    </div>

    <!-- Collector pipeline status -->
    ${a.length>0?d`<div>
      <div class="es-section-title">Collector Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-2)">
        ${a.map(y=>d`<div key=${y.name}
          style="padding:var(--sp-2) var(--sp-3);background:var(--bg);border-radius:4px;
            border-left:3px solid ${lf[y.status]||"var(--fg2)"}">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="mono text-xs text-bold">${y.name}</span>
            <span class="text-xs text-muted" style="margin-left:auto">${y.status}</span>
          </div>
          ${y.detail?d`<div class="text-xs text-muted" style="margin-top:2px">${X(y.detail)}</div>`:null}
        </div>`)}
      </div>
    </div>`:null}
  </div>`}let so=null,xn=null;function rf(){return so?Promise.resolve(so):xn||(xn=fetch("/api/datapoints").then(e=>e.ok?e.json():[]).then(e=>{const t={};for(const s of e)t[s.key]=s;return so=t,t}).catch(()=>(xn=null,{})),xn)}function cf(e){if(!e)return"";const t=e.replace(/\s+/g," ").trim(),s=t.match(/^[^.!?]+[.!?]/);return s?s[0].trim():t.slice(0,120)}const df={tokens:"tokens",bytes:"bytes",percent:"%",count:"count",rate_bps:"bytes/s",usd:"USD",seconds:"sec",ratio:"ratio"},uf={raw:"raw",deduced:"deduced",aggregated:"agg"};function pf(){const[e,t]=K(null),[s,n]=K({x:0,y:0}),[l,o]=K(!1),a=ut(null),i=ut(null),r=We(T=>{const y=T.getAttribute("data-dp");y&&rf().then($=>{const k=$[y];if(!k)return;const w=T.getBoundingClientRect();n({x:w.left,y:w.bottom+4}),t(k),o(!1)})},[]),c=We(()=>{i.current=setTimeout(()=>{t(null),o(!1)},120)},[]),v=We(()=>{i.current&&(clearTimeout(i.current),i.current=null)},[]);if(me(()=>{function T(k){const w=k.target.closest("[data-dp]");w&&(v(),r(w))}function y(k){k.target.closest("[data-dp]")&&c()}function $(k){k.target.closest("[data-dp]")&&e&&(k.preventDefault(),o(N=>!N))}return document.addEventListener("mouseover",T,!0),document.addEventListener("mouseout",y,!0),document.addEventListener("click",$,!0),()=>{document.removeEventListener("mouseover",T,!0),document.removeEventListener("mouseout",y,!0),document.removeEventListener("click",$,!0)}},[r,c,v,e]),!e)return null;const h=Math.min(s.x,window.innerWidth-320-8),b=Math.min(s.y,window.innerHeight-180),S=uf[e.source_type]||e.source_type,D=df[e.unit]||e.unit;return d`<div class="dp-tooltip" ref=${a}
    style=${"left:"+h+"px;top:"+b+"px"}
    onMouseEnter=${v} onMouseLeave=${c}>
    <div class="dp-tooltip-head">
      <span class="dp-tooltip-key">${e.key}</span>
      <span class="dp-tooltip-badge dp-badge-${e.source_type}">${S}</span>
      ${D&&d`<span class="dp-tooltip-unit">${D}</span>`}
    </div>
    <div class="dp-tooltip-body">${cf(e.explanation)}</div>
    ${l&&d`<div class="dp-tooltip-detail">
      <div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Source</div>
        <div>${e.source_static||e.source||"—"}</div>
      </div>
      ${e.source_dynamic&&d`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Live provenance</div>
        <div>${typeof e.source_dynamic=="string"?e.source_dynamic:JSON.stringify(e.source_dynamic)}</div>
      </div>`}
      ${e.query&&d`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">Query</div>
        <code class="dp-tooltip-code">${e.query}</code>
      </div>`}
      ${e.otel_metric&&d`<div class="dp-tooltip-section">
        <div class="dp-tooltip-section-title">OTel metric</div>
        <code>${e.otel_metric}</code>
      </div>`}
    </div>`}
    ${!l&&d`<div class="dp-tooltip-hint">click for details</div>`}
  </div>`}function Js(e,t){try{localStorage.setItem("aictl-pref-"+e,JSON.stringify(t))}catch{}}function no(e,t){try{const s=localStorage.getItem("aictl-pref-"+e);return s!=null?JSON.parse(s):t}catch{return t}}function Gn(e){const t=new Date(e*1e3),s=t.getTimezoneOffset();return new Date(t.getTime()-s*6e4).toISOString().slice(0,16)}const zi=200,Ri=80,ff=["ts","files","tokens","cpu","mem_mb","mcp","mem_tokens","live_sessions","live_tokens","live_in_rate","live_out_rate"];function vf(e,t){if(!e)return t;const s=Object.fromEntries((t.tools||[]).map(n=>[n.tool,n]));return{...e,...t,tools:e.tools.map(n=>{const l=s[n.tool];return l?{...n,live:l.live,vendor:l.vendor||n.vendor,host:l.host||n.host}:n})}}function mf(e,t){var n,l,o,a;if(!e)return e;if(e.ts.push(t.timestamp),e.files.push(t.total_files),e.tokens.push(t.total_tokens),e.cpu.push(Math.round(t.total_cpu*10)/10),e.mem_mb.push(Math.round(t.total_mem_mb*10)/10),e.mcp.push(t.total_mcp_servers),e.mem_tokens.push(t.total_memory_tokens),e.live_sessions.push(t.total_live_sessions),e.live_tokens.push(t.total_live_estimated_tokens),e.live_in_rate.push(Math.round((t.total_live_inbound_rate_bps||0)*100)/100),e.live_out_rate.push(Math.round((t.total_live_outbound_rate_bps||0)*100)/100),e.ts.length>zi)for(const i of ff)e[i]=e[i].slice(-zi);const s=e.by_tool||{};for(const i of t.tools||[]){if(i.tool==="aictl")continue;const r=((n=i.live)==null?void 0:n.cpu_percent)||0,c=((l=i.live)==null?void 0:l.mem_mb)||0,v=i.tokens||0,p=(((o=i.live)==null?void 0:o.outbound_rate_bps)||0)+(((a=i.live)==null?void 0:a.inbound_rate_bps)||0);s[i.tool]||(s[i.tool]={ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]});const h=s[i.tool];if(h.ts.push(t.timestamp),h.cpu.push(Math.round(r*10)/10),h.mem_mb.push(Math.round(c*10)/10),h.tokens.push(v),h.traffic.push(Math.round(p*100)/100),h.ts.length>Ri)for(const b of Object.keys(h))h[b]=h[b].slice(-Ri)}return{...e,by_tool:s}}const To=[{id:"live",label:"Live",seconds:3600},{id:"1h",label:"1h",seconds:3600},{id:"6h",label:"6h",seconds:21600},{id:"24h",label:"24h",seconds:86400},{id:"7d",label:"7d",seconds:604800}],il={};To.forEach(e=>{il[e.id]=e.seconds});const hf={snap:null,history:null,connected:!1,activeTab:no("active_tab","overview"),globalRange:(()=>{const e=no("range","live"),t=il[e]||3600;return{id:e,since:Date.now()/1e3-t,until:null}})(),searchQuery:"",theme:(()=>{try{return localStorage.getItem("aictl-theme")||"auto"}catch{return"auto"}})(),viewerPath:null,events:[],enabledTools:no("tool_filter",null)};function gf(e,t){switch(t.type){case"SSE_UPDATE":{const s=t.payload,n=e.snap?vf(e.snap,s):s,l=mf(e.history,s);return{...e,snap:n,history:l,connected:!0}}case"SNAP_REPLACE":return{...e,snap:t.payload};case"HISTORY_INIT":return{...e,history:t.payload};case"EVENTS_INIT":return{...e,events:t.payload};case"SET_CONNECTED":return{...e,connected:t.payload};case"SET_TAB":return{...e,activeTab:t.payload};case"SET_RANGE":return{...e,globalRange:t.payload};case"SET_SEARCH":return{...e,searchQuery:t.payload};case"SET_THEME":return{...e,theme:t.payload};case"SET_VIEWER":return{...e,viewerPath:t.payload};case"SET_TOOL_FILTER":return{...e,enabledTools:t.payload};default:return e}}const lo=Qs.tabs;function _f({globalRange:e,onPreset:t,onApplyCustom:s}){const[n,l]=K(!1),o=ut(null),a=ut(null),i=We(()=>{l(!0),requestAnimationFrame(()=>{if(o.current&&a.current)if(e.until!=null)o.current.value=Gn(e.since),a.current.value=Gn(e.until);else{const c=To.find(h=>h.id===e.id),v=Date.now()/1e3,p=(c==null?void 0:c.seconds)||86400;o.current.value=Gn(v-p),a.current.value=Gn(v)}})},[e]),r=We(()=>{var D,T;const c=(D=o.current)==null?void 0:D.value,v=(T=a.current)==null?void 0:T.value;if(!c||!v)return;const p=new Date(c).getTime(),h=new Date(v).getTime();if(!Number.isFinite(p)||!Number.isFinite(h))return;const b=p/1e3,S=h/1e3;S<=b||(s(b,S),l(!1))},[s]);return d`<div class="global-range-bar">
    <div class="range-bar">
      <span class="range-label">Range:</span>
      ${To.map(c=>d`<button key=${c.id}
        class=${e.id===c.id&&!n?"range-btn active":"range-btn"}
        onClick=${()=>{t(c.id),l(!1)}}>${c.label}</button>`)}
      <button class=${n||e.id==="custom"?"range-btn active":"range-btn"}
        onClick=${i}>Custom</button>
    </div>
    ${n&&d`<div class="es-custom-range">
      <label><span class="range-label">From</span>
        <input type="datetime-local" class="es-date-input" ref=${o} /></label>
      <label><span class="range-label">To</span>
        <input type="datetime-local" class="es-date-input" ref=${a} /></label>
      <button class="range-btn active" onClick=${r} style="font-weight:600">Apply</button>
    </div>`}
  </div>`}const Xn=new Set(["claude-code","claude-desktop","copilot","copilot-vscode","copilot-cli","copilot-jetbrains","copilot-vs","copilot365","codex-cli"]);function $f({snap:e,enabledTools:t,onToggle:s,onSetAll:n}){if(!e)return null;const l=e.tools.filter(a=>!a.meta);if(!l.length)return null;const o=t===null;return t?t.length:l.length,d`<div class="tool-filter-bar">
    <label class="tool-filter-item">
      <input type="checkbox" checked=${o}
        onChange=${()=>n(o?[]:null)} />
      <span class="text-muted">All (${l.length})</span>
    </label>
    ${l.sort((a,i)=>a.label.localeCompare(i.label)).map(a=>{const i=Xn.has(a.tool),r=t===null||t.includes(a.tool),c=Ae[a.tool]||"var(--fg2)",v=$t[a.tool]||"🔹";return d`<label key=${a.tool} class=${"tool-filter-item"+(i?"":" tool-unverified")}
        title=${i?"":"Not yet verified — discovery only"}>
        <input type="checkbox" checked=${r} disabled=${!i}
          onChange=${()=>i&&s(a.tool)} />
        <span style=${"color:"+c}>${v}</span>
        <span>${a.label}</span>
      </label>`})}
  </div>`}function bf({mcpDetail:e}){return!e||!e.length?d`<div style="color:var(--fg3);font-size:var(--fs-sm);padding:var(--sp-2) 0">None configured</div>`:d`<div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
    ${e.map(t=>{t.status;const s=Fc[t.status]||"var(--fg3)",n=Ae[t.tool]||"var(--fg3)";return d`<div key=${t.name+t.tool}
        style="display:flex;align-items:center;gap:var(--sp-2);padding:3px var(--sp-3);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent)"
        title=${t.status+(t.pid?" PID "+t.pid:"")+(t.transport?" · "+t.transport:"")}>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${s}"></span>
        <span class="mono" style="font-size:var(--fs-xs);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${X(t.name)}</span>
        <span style="font-size:var(--fs-2xs);color:${n};white-space:nowrap;flex-shrink:0">${X(t.tool)}</span>
      </div>`})}
  </div>`}function yf({label:e,value:t,mcpDetail:s}){const[n,l]=K(!1);return d`<div style="position:relative;cursor:default"
    onMouseEnter=${()=>l(!0)}
    onMouseLeave=${()=>l(!1)}>
    <${yo} label=${e} value=${t} sm=${!0}/>
    ${n&&d`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:200;
        min-width:260px;background:var(--bg);border:1px solid var(--border);border-radius:6px;
        box-shadow:0 4px 20px rgba(0,0,0,0.35);padding:var(--sp-3)">
      <div class="metric-group-label" style="padding:0 0 var(--sp-2)">MCP Servers</div>
      ${s.length>0?d`<${bf} mcpDetail=${s}/>`:d`<div style="color:var(--fg3);font-size:var(--fs-sm)">None configured</div>`}
    </div>`}
  </div>`}function xf({snap:e,history:t,globalRange:s}){const[n,l]=K(()=>{try{return localStorage.getItem("aictl-header-expanded")!=="false"}catch{return!0}}),o=We(()=>{l(c=>{const v=!c;try{localStorage.setItem("aictl-header-expanded",String(v))}catch{}return v})},[]),a=c=>!t||!t.ts||t.ts.length<2?null:[t.ts,t[c]],i=(e==null?void 0:e.cpu_cores)||1,r={cores:i};return d`
    <div style=${"display:grid;grid-template-columns:repeat("+Qs.sparklines.length+",1fr);gap:var(--sp-4);margin-bottom:var(--sp-4)"}>
      ${Qs.sparklines.map(c=>{const v=e?e["total_"+c.field]??e[c.field]??"":"",p=Gl(v,c.format,c.suffix,c.multiply),h=c.yMaxExpr?Fa(c.yMaxExpr,r):void 0,b=(c.refLines||[]).map(S=>({value:Fa(S.valueExpr,r),label:(S.label||"").replace("{cores}",i)})).filter(S=>S.value!=null);return d`<${rs} key=${c.field} label=${c.label} value=${p}
          data=${a(c.field)} chartColor=${c.color||"var(--accent)"}
          smooth=${!!c.smooth} refLines=${b.length?b:void 0} yMax=${h} dp=${c.dp}/>`})}
    </div>

    <div class=${n?"header-sections header-sections--expanded":"header-sections header-sections--collapsed"}>

      <!-- Row 1: (CPU bars + Live traffic) | Live metric boxes -->
      <div class="mb-sm" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);align-items:start">
        <!-- Left: per-core CPU bars + live traffic bar -->
        <div>
          <div class="metric-group-label">CPU Cores</div>
          <${sp} perCore=${(e==null?void 0:e.cpu_per_core)||[]}/>
          <div style="margin-top:var(--sp-3)"><${wi} snap=${e} mode="traffic"/></div>
        </div>
        <!-- Right: 4 live metric boxes in 2×2 grid -->
        <div>
          <div class="metric-group-label">Live Monitor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
            ${Qs.liveMetrics.map(c=>{const v=e?e[c.field]??"":"",p=Gl(v,c.format,c.suffix,c.multiply);return d`<${yo} key=${c.field} label=${c.label} value=${p} accent=${!!c.accent} dp=${c.dp} sm=${!0}/>`})}
          </div>
        </div>
      </div>

      <!-- Row 2: Inventory — full width; MCP box shows hover popover -->
      <div class="mb-sm">
        <div class="metric-group-label">Inventory</div>
        <div style="display:grid;grid-template-columns:repeat(${Qs.inventory.length},1fr);gap:var(--sp-2)">
          ${Qs.inventory.map(c=>{const v=e?e[c.field]??"":"",p=Gl(v,c.format,c.suffix,c.multiply);return c.field==="total_mcp_servers"?d`<${yf} key=${c.field} label=${c.label} value=${p} mcpDetail=${(e==null?void 0:e.mcp_detail)||[]}/>`:d`<${yo} key=${c.field} label=${c.label} value=${p} accent=${!!c.accent} dp=${c.dp} sm=${!0}/>`})}
        </div>
      </div>

      <!-- Row 3: CSV footprint — full width -->
      <div class="mb-sm"><${wi} snap=${e} mode="files"/></div>

    </div>
    <button class="header-toggle" onClick=${o} aria-label="Toggle details">
      ${n?"▲ less":"▼ more"}
    </button>
  `}function kf(){var le;const[e,t]=Qi(gf,hf),{snap:s,history:n,connected:l,activeTab:o,globalRange:a,searchQuery:i,theme:r,viewerPath:c,events:v,enabledTools:p}=e,[h,b]=K(null),S=ut(null);me(()=>{document.documentElement.setAttribute("data-theme",r);try{localStorage.setItem("aictl-theme",r)}catch{}},[r]);const D=We(()=>{t({type:"SET_THEME",payload:Ul[(Ul.indexOf(r)+1)%Ul.length]})},[r]),T=We(M=>{const B=M.since,U=M.until!=null?"&until="+M.until:"";M.id==="live"?b(null):M.id!=="custom"?fetch("/api/history?range="+M.id).then(W=>W.json()).then(b).catch(()=>{}):fetch("/api/history?since="+B+U).then(W=>W.json()).then(b).catch(()=>{}),fetch("/api/events?since="+B+U).then(W=>W.json()).then(W=>t({type:"EVENTS_INIT",payload:W})).catch(()=>{})},[]);me(()=>{let M,B=1e3,U=!1;fetch("/api/snapshot").then(ee=>ee.json()).then(ee=>t({type:"SNAP_REPLACE",payload:ee})).catch(()=>{}),fetch("/api/history").then(ee=>ee.json()).then(ee=>t({type:"HISTORY_INIT",payload:ee})).catch(()=>{}),T(a);function W(){U||(M=new EventSource("/api/stream"),M.onmessage=ee=>{const J=JSON.parse(ee.data);t({type:"SSE_UPDATE",payload:J}),B=1e3},M.onerror=()=>{t({type:"SET_CONNECTED",payload:!1}),M.close(),U||setTimeout(()=>{W(),fetch("/api/snapshot").then(ee=>ee.json()).then(ee=>t({type:"SNAP_REPLACE",payload:ee})).catch(()=>{})},B),B=Math.min(B*2,3e4)})}W();const oe=setInterval(()=>{U||fetch("/api/snapshot").then(ee=>ee.json()).then(ee=>t({type:"SNAP_REPLACE",payload:ee})).catch(()=>{})},3e4);return()=>{U=!0,M&&M.close(),clearInterval(oe)}},[]);const y=We(M=>{const B=il[M]||3600,U={id:M,since:Date.now()/1e3-B,until:null};t({type:"SET_RANGE",payload:U}),Js("range",M),T(U)},[T]),$=We((M,B)=>{const U={id:"custom",since:M,until:B};t({type:"SET_RANGE",payload:U}),T(U)},[T]),k=a.id==="live"?n:h||n,w=a.until?a.until-a.since:il[a.id]||3600;me(()=>{const M=B=>{var U;if(B.key==="Escape"&&t({type:"SET_VIEWER",payload:null}),B.key==="/"&&document.activeElement!==S.current&&(B.preventDefault(),(U=S.current)==null||U.focus()),document.activeElement!==S.current){const W=lo.find(oe=>oe.key===B.key);W&&(t({type:"SET_TAB",payload:W.id}),Js("active_tab",W.id))}};return document.addEventListener("keydown",M),()=>document.removeEventListener("keydown",M)},[]);const N=We(M=>t({type:"SET_VIEWER",payload:M}),[]),A=We(M=>{if(!Xn.has(M))return;const B=s?s.tools.filter(W=>W.tool!=="aictl"&&W.tool!=="any"&&Xn.has(W.tool)).map(W=>W.tool):[];let U;p===null?U=B.filter(W=>W!==M):p.indexOf(M)>=0?U=p.filter(oe=>oe!==M):(U=[...p,M],U.length>=B.length&&(U=null)),t({type:"SET_TOOL_FILTER",payload:U}),Js("tool_filter",U)},[s,p]),P=We(M=>{t({type:"SET_TOOL_FILTER",payload:M}),Js("tool_filter",M)},[]),O=ce(()=>{if(!s)return s;let M=s.tools;if(M=M.filter(B=>Xn.has(B.tool)||B.tool==="aictl"),p!==null&&(M=M.filter(B=>p.includes(B.tool)||B.tool==="aictl")),i){const B=i.toLowerCase();M=M.filter(U=>U.label.toLowerCase().includes(B)||U.tool.toLowerCase().includes(B)||U.vendor&&U.vendor.toLowerCase().includes(B)||U.files.some(W=>W.path.toLowerCase().includes(B))||U.processes.some(W=>(W.name||"").toLowerCase().includes(B)||(W.cmdline||"").toLowerCase().includes(B))||U.live&&((U.live.workspaces||[]).some(W=>W.toLowerCase().includes(B))||(U.live.sources||[]).some(W=>W.toLowerCase().includes(B))))}return{...s,tools:M}},[s,i,p]),_=ce(()=>{var U;const M=Date.now()/1e3-300,B=new Map;for(const W of v)if(W.kind==="file_modified"&&W.ts>=M&&((U=W.detail)!=null&&U.path)){const oe=B.get(W.detail.path);(!oe||W.ts>oe.ts)&&B.set(W.detail.path,{ts:W.ts,growth:W.detail.growth_bytes||0,tool:W.tool})}return B},[v]),C=ce(()=>({snap:O,history:n,openViewer:N,recentFiles:_,globalRange:a,rangeSeconds:w,enabledTools:p}),[O,n,N,_,a,w,p]),L={overview:()=>d`
      <${xf} snap=${O} history=${k}
        globalRange=${a}/>
      <div class="mb-lg"><${af}/></div>
    `,procs:()=>d`
      <div class="mb-lg"><${tp}/></div>
    `,memory:()=>d`
      <div class="mb-lg"><${nf}/></div>
      <div class="mb-lg"><${ip}/></div>
    `,live:()=>d`<div class="mb-lg"><${rp}/></div>`,events:()=>d`<div class="mb-lg"><${cp} key=${"events-"+o}/></div>`,budget:()=>d`<div class="mb-lg"><${dp} key=${"budget-"+o}/></div>`,sessions:()=>d`<div class="mb-lg"><${Pp} key=${"sessions-"+o}/></div>`,samples:()=>d`<div class="mb-lg"><${zp} key=${"samples-"+o}/></div>`,flow:()=>d`<div class="mb-lg"><${qp} key=${"flow-"+o}/></div>`,config:()=>d`<div class="mb-lg"><${Xp}/></div>`},R=We(M=>{t({type:"SET_TAB",payload:M}),Js("active_tab",M)},[]);We(M=>{t({type:"SET_TAB",payload:"sessions"}),Js("active_tab","sessions"),window.__aictl_selected_session=M.session_id,window.dispatchEvent(new CustomEvent("aictl-session-select",{detail:M}))},[]);const[z,V]=K(!1);me(()=>{let M=!0;const B=()=>fetch("/api/otel-status").then(W=>W.json()).then(W=>{M&&V(W.active||!1)}).catch(()=>{M&&V(!1)});B();const U=setInterval(B,3e4);return()=>{M=!1,clearInterval(U)}},[]);const q=ce(()=>{if(!s)return[];const M=[];let B=0,U=0,W=0,oe=0;for(const ee of s.tools||[])for(const J of ee.processes||[]){const ze=parseFloat(J.mem_mb)||0,Re=(J.process_type||"").toLowerCase();(Re==="subagent"||Re==="agent")&&(B+=ze),Re==="mcp-server"&&J.zombie_risk&&J.zombie_risk!=="none"&&U++,(Re==="browser"||(J.name||"").toLowerCase().includes("headless"))&&W++,J.anomalies&&J.anomalies.length&&(oe+=J.anomalies.length)}return B>2048&&M.push({level:"red",msg:`Subagent memory: ${xe(B*1048576)} (>2GB) — consider cleanup`}),U>0&&M.push({level:"orange",msg:`${U} MCP server(s) with dead parent — may be orphaned`}),W>0&&M.push({level:"yellow",msg:`${W} headless browser process(es) detected — check for leaks`}),oe>5&&M.push({level:"orange",msg:`${oe} process anomalies detected`}),M},[s]);return d`<${Ue.Provider} value=${C}>
    <div class="main-wrap">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${S} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${i} onInput=${M=>t({type:"SET_SEARCH",payload:M.target.value})}/>
          <button class="theme-btn" onClick=${D} aria-label="Toggle theme: ${r}"
            title="Theme: ${r}">${Ic[r]}</button>
          ${z&&d`<span class="conn ok" title="OTel receiver active — Claude Code pushing telemetry">OTel</span>`}
          <span class=${"conn "+(l?"ok":"err")} role="status" aria-live="polite">${l?"live":"reconnecting..."}<span class="sr-only">${l?" — connected to server":" — connection lost, attempting to reconnect"}</span></span>
        </div>
      </header>
      ${q.length>0&&d`<div class="alert-banner" role="alert">
        ${q.map((M,B)=>d`<div key=${B} class="alert-item" style="color:var(--${M.level})">
          \u26A0 ${M.msg}
        </div>`)}
      </div>`}
      <${_f} globalRange=${a} onPreset=${y} onApplyCustom=${$}/>
      <main class="main">
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${lo.map(M=>d`<button key=${M.id} class="tab-btn" role="tab"
            aria-selected=${o===M.id} onClick=${()=>R(M.id)}
            title="Shortcut: ${M.key}">${M.icon?M.icon+" ":""}${M.label}</button>`)}
        </nav>
        <${$f} snap=${s} enabledTools=${p}
          onToggle=${A} onSetAll=${P}/>
        <div id="main-content" role="tabpanel" aria-label=${(le=lo.find(M=>M.id===o))==null?void 0:le.label}>
          ${L[o]?L[o]():d`<p class="text-muted">Unknown tab "${o}"</p>`}
        </div>
      </main>
    </div>
    <${Gu} path=${c} onClose=${()=>t({type:"SET_VIEWER",payload:null})}/>
    <${pf}/>
  </${Ue.Provider}>`}Lc(d`<${kf}/>`,document.getElementById("app"));
