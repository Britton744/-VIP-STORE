import {db, configured} from "./firebase.js";
import {collection,addDoc,getDocs,query,where,orderBy,limit,doc,getDoc,runTransaction,serverTimestamp,increment} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const $=s=>document.querySelector(s);
const demoProducts=[
{id:"demo1",name:"بطاقات أسئلة للتعارف",category:"ألعاب الأسئلة",price:49,description:"مجموعة بطاقات لفتح حوارات ممتعة وأسئلة لطيفة.",image:"",active:true},
{id:"demo2",name:"تحدي يوم كامل",category:"تحديات ثنائية",price:59,description:"بطاقات مهام مرحة تشجع على التعاون والضحك.",image:"",active:true},
{id:"demo3",name:"لعبة من يعرف الآخر؟",category:"ألعاب الأسئلة",price:69,description:"اختبروا مدى معرفتكم ببعض عبر أسئلة متنوعة.",image:"",active:true},
{id:"demo4",name:"صندوق ليلة ألعاب",category:"هدايا",price:119,description:"تجميعة أنيقة لقضاء أمسية مليئة بالمرح.",image:"",active:true},
{id:"demo5",name:"لعبة تحدي الفريق",category:"ألعاب جماعية",price:79,description:"تحديات خفيفة مناسبة للأصدقاء والعائلة.",image:"",active:true},
{id:"demo6",name:"دفتر ذكريات مشترك",category:"هدايا",price:45,description:"مساحة لتدوين اللحظات والأفكار الجميلة.",image:"",active:true}
];
let products=[],cart=JSON.parse(localStorage.getItem("vip_cart")||"[]"),selectedCategory="الكل",favorites=new Set();
const money=n=>`${Number(n||0).toLocaleString("ar-SA")} ر.س`;
function toast(t){$("#toast").textContent=t;$("#toast").classList.add("show");setTimeout(()=>$("#toast").classList.remove("show"),2200)}
function saveCart(){localStorage.setItem("vip_cart",JSON.stringify(cart));$("#cartCount").textContent=cart.reduce((a,x)=>a+x.qty,0);renderCart()}
function renderProducts(){
 let list=products.filter(p=>p.active!==false&& (selectedCategory==="الكل"||p.category===selectedCategory));
 const term=$("#searchInput").value.trim().toLowerCase();if(term)list=list.filter(p=>(p.name+" "+p.description+" "+p.category).toLowerCase().includes(term));
 const sort=$("#sortSelect").value;if(sort==="low")list.sort((a,b)=>a.price-b.price);if(sort==="high")list.sort((a,b)=>b.price-a.price);
 $("#productGrid").innerHTML=list.length?list.map(p=>`<article class="product-card"><div class="product-image">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">`:`<span class="product-placeholder">VIP</span>`}</div><div class="product-info"><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p><div class="price-row"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${esc(p.id)}">＋ أضف للسلة</button></div></div></article>`).join(""):'<div class="empty">لا توجد منتجات في هذا القسم حالياً.</div>';
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderCart(){
 $("#cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-line"><div><b>${esc(x.name)}</b><div class="muted">${money(x.price)} × ${x.qty}</div></div><div><b>${money(x.price*x.qty)}</b><br><button data-remove="${esc(x.id)}">حذف</button></div></div>`).join(""):'<p class="muted">السلة فارغة. أضف منتجاً للبدء.</p>';
 $("#cartTotal").textContent=money(cart.reduce((a,x)=>a+x.price*x.qty,0));
}
async function loadProducts(){
 if(!configured){products=demoProducts;renderProducts();return}
 try{const snap=await getDocs(query(collection(db,"products"),where("active","==",true)));products=snap.docs.map(d=>({id:d.id,...d.data()}));renderProducts();if(!products.length)$("#productGrid").innerHTML='<div class="empty">لم تُضف منتجات بعد. أضف منتجاتك من لوحة الإدارة.</div>'}
 catch(e){console.error(e);products=demoProducts;renderProducts();toast("تعذر الاتصال بقاعدة البيانات؛ المعروض بيانات توضيحية")}
}
document.addEventListener("click",async e=>{
 const add=e.target.closest("[data-add]");if(add){const p=products.find(x=>x.id===add.dataset.add);if(p){const old=cart.find(x=>x.id===p.id);old?old.qty++:cart.push({id:p.id,name:p.name,price:Number(p.price),qty:1});saveCart();toast("تمت إضافة المنتج للسلة")}}
 const rem=e.target.closest("[data-remove]");if(rem){cart=cart.filter(x=>x.id!==rem.dataset.remove);saveCart()}
 const cat=e.target.closest("[data-category]");if(cat){selectedCategory=cat.dataset.category;document.querySelectorAll(".category-card").forEach(x=>x.classList.toggle("active",x===cat));renderProducts()}
});
$("#searchInput").addEventListener("input",renderProducts);$("#sortSelect").addEventListener("change",renderProducts);
$("#cartBtn").onclick=()=>{$("#cartDrawer").classList.add("open");$("#overlay").classList.add("show")};
function closeDrawer(){$("#cartDrawer").classList.remove("open");$("#overlay").classList.remove("show")}
$("#overlay").onclick=closeDrawer;document.querySelectorAll("[data-close]").forEach(x=>x.onclick=closeDrawer);
$("#menuBtn").onclick=()=>$("#topLinks").classList.toggle("open");$("#topLinks").addEventListener("click",()=>$("#topLinks").classList.remove("open"));
$("#searchBtn").onclick=()=>{$("#searchInput").focus();$("#products").scrollIntoView()};
$("#favBtn").onclick=()=>toast("أضف المنتجات للمفضلة قريباً");
$("#checkoutBtn").onclick=()=>{if(!cart.length)return toast("السلة فارغة");$("#checkoutDialog").showModal()};
$("#closeCheckout").onclick=()=>$("#checkoutDialog").close();
$("#checkoutForm").onsubmit=async e=>{
 e.preventDefault();if(!cart.length)return;
 const f=new FormData(e.currentTarget),order={customer:{name:f.get("name"),phone:f.get("phone"),city:f.get("city"),address:f.get("address")},notes:f.get("notes"),items:cart.map(({id,name,price,qty})=>({id,name,price,qty})),total:cart.reduce((a,x)=>a+x.price*x.qty,0),status:"جديد",createdAt:serverTimestamp()};
 try{if(!configured)throw new Error("Firebase غير مضبوط");const ref=await addDoc(collection(db,"orders"),order);$("#checkoutMsg").textContent=`تم استلام طلبك بنجاح. رقم الطلب: ${ref.id}`;cart=[];saveCart();e.currentTarget.reset();toast("تم إرسال طلبك");setTimeout(()=>{$("#checkoutDialog").close();closeDrawer()},2500)}
 catch(err){console.error(err);$("#checkoutMsg").textContent="لم نتمكن من إرسال الطلب. تأكد من إعداد قاعدة البيانات واتصال الإنترنت."}
};
async function trackVisit(){if(!configured)return;try{await addDoc(collection(db,"pageViews"),{page:"home",createdAt:serverTimestamp(),path:location.pathname})}catch(e){console.warn("visit tracking unavailable",e)}}
$("#year").textContent=new Date().getFullYear();saveCart();loadProducts();trackVisit();
