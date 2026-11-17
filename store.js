import {db, configured} from "./firebase.js";
import {collection,addDoc,getDocs,query,where,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* ضع رقم واتساب المتجر بصيغة دولية دون + أو مسافات، مثال: 9665XXXXXXXX */
const WHATSAPP_NUMBER = "";
const STORE_EMAIL = ""; // البريد الظاهر للعميل فقط؛ الإرسال الفعلي يحتاج خدمة بريد آمنة على الخادم.

const $ = s => document.querySelector(s);
const demoProducts = [
 {id:"demo1",name:"بطاقات أسئلة للتعارف",category:"ألعاب الأسئلة",price:49,description:"مجموعة بطاقات لفتح حوارات ممتعة وأسئلة لطيفة للأصدقاء والعائلة.",image:"",images:[],active:true},
 {id:"demo2",name:"تحدي يوم كامل",category:"تحديات ثنائية",price:59,description:"بطاقات مهام مرحة تشجع على التعاون والضحك وقضاء وقت ممتع.",image:"",images:[],active:true},
 {id:"demo3",name:"لعبة من يعرف الآخر؟",category:"ألعاب الأسئلة",price:69,description:"اختبروا مدى معرفتكم ببعض عبر أسئلة متنوعة ومسلية.",image:"",images:[],active:true},
 {id:"demo4",name:"صندوق ليلة ألعاب",category:"هدايا",price:119,description:"تجميعة أنيقة لقضاء أمسية مليئة بالمرح والذكريات.",image:"",images:[],active:true},
 {id:"demo5",name:"لعبة تحدي الفريق",category:"ألعاب جماعية",price:79,description:"تحديات خفيفة مناسبة للأصدقاء والعائلة.",image:"",images:[],active:true},
 {id:"demo6",name:"دفتر ذكريات مشترك",category:"هدايا",price:45,description:"مساحة جميلة لتدوين اللحظات والأفكار والذكريات.",image:"",images:[],active:true}
];

let products = [], cart = JSON.parse(localStorage.getItem("vip_cart") || "[]");
let selectedCategory = "الكل", favorites = new Set(JSON.parse(localStorage.getItem("vip_favorites") || "[]"));
let lastOrder = null, detailProduct = null, detailQty = 1, detailImage = "";

const money = n => `${Number(n || 0).toLocaleString("ar-SA")} ر.س`;
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(message){$("#toast").textContent=message;$("#toast").classList.add("show");setTimeout(()=>$("#toast").classList.remove("show"),2300)}
function productImages(p){return [...new Set([...(Array.isArray(p.images)?p.images:[]),p.image].filter(Boolean))]}
function saveCart(){
 localStorage.setItem("vip_cart",JSON.stringify(cart));
 const count=cart.reduce((sum,item)=>sum+item.qty,0);
 $("#cartCount").textContent=count;$("#bottomCartCount").textContent=count;renderCart();
}
function renderProducts(){
 let list=products.filter(p=>p.active!==false&&(selectedCategory==="الكل"||p.category===selectedCategory));
 const term=$("#searchInput").value.trim().toLowerCase();
 if(term)list=list.filter(p=>(p.name+" "+(p.description||"")+" "+(p.category||"")).toLowerCase().includes(term));
 const sort=$("#sortSelect").value;
 if(sort==="low")list.sort((a,b)=>Number(a.price)-Number(b.price));
 if(sort==="high")list.sort((a,b)=>Number(b.price)-Number(a.price));
 $("#productGrid").innerHTML=list.length?list.map(p=>{
  const imgs=productImages(p),image=imgs[0]||"";
  return `<article class="product-card">
   <button class="fav-small ${favorites.has(String(p.id))?"active":""}" data-fav="${esc(p.id)}" aria-label="إضافة للمفضلة">♡</button>
   <div class="product-image" data-details="${esc(p.id)}">${image?`<img src="${esc(image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'">`:`<span class="product-placeholder">VIP</span>`}</div>
   <div class="product-info"><h3>${esc(p.name)}</h3><p>${esc(p.description||"اكتشف تفاصيل هذا المنتج.")}</p>
    <div class="price-row"><span class="price">${money(p.price)}</span><div class="card-actions"><button class="details-btn" data-details="${esc(p.id)}">التفاصيل</button><button class="add-btn" data-add="${esc(p.id)}">＋ أضف</button></div></div>
   </div></article>`;
 }).join(""):'<div class="empty">لا توجد منتجات في هذا القسم حالياً.</div>';
}
function renderCart(){
 $("#cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-line">
  <div><b>${esc(x.name)}</b><div class="muted">${money(x.price)} × ${x.qty}</div></div>
  <div><b>${money(x.price*x.qty)}</b><br><button data-remove="${esc(x.id)}">حذف</button></div>
 </div>`).join(""):'<p class="muted">السلة فارغة. أضف منتجاً للبدء.</p>';
 $("#cartTotal").textContent=money(cart.reduce((a,x)=>a+x.price*x.qty,0));
}
function addToCart(p,qty=1){
 const old=cart.find(x=>String(x.id)===String(p.id));
 if(old)old.qty+=qty;else cart.push({id:p.id,name:p.name,price:Number(p.price)||0,qty});
 saveCart();toast("تمت إضافة المنتج للسلة");
}
async function loadProducts(){
 if(!configured){products=demoProducts;renderProducts();return}
 try{
  const snap=await getDocs(query(collection(db,"products"),where("active","==",true)));
  products=snap.docs.map(d=>({id:d.id,...d.data()}));renderProducts();
  if(!products.length)$("#productGrid").innerHTML='<div class="empty">لم تُضف منتجات بعد. أضف منتجاتك من لوحة الإدارة.</div>';
 }catch(error){console.error(error);products=demoProducts;renderProducts();toast("تعذر الاتصال؛ المعروض منتجات تجريبية")}
}
function openCart(){$("#cartDrawer").classList.add("open");$("#overlay").classList.add("show")}
function closeCart(){$("#cartDrawer").classList.remove("open");$("#overlay").classList.remove("show")}
function openDetails(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 detailProduct=p;detailQty=1;const imgs=productImages(p);detailImage=imgs[0]||"";
 const imageHtml=detailImage?`<img class="detail-main-image" id="detailMainImage" src="${esc(detailImage)}" alt="${esc(p.name)}">`:`<div class="detail-main-image detail-placeholder">VIP</div>`;
 $("#productDetails").innerHTML=`<div class="drawer-head"><span class="eyebrow">تفاصيل المنتج</span><button class="close-btn" id="closeProduct" aria-label="إغلاق">×</button></div>
  <div class="detail-layout"><div>${imageHtml}<div class="detail-thumbs">${imgs.map(src=>`<img src="${esc(src)}" data-detail-image="${esc(src)}" alt="صورة إضافية">`).join("")}</div></div>
  <div class="detail-copy"><span class="eyebrow">${esc(p.category||"VIP COLLECTION")}</span><h2>${esc(p.name)}</h2><p>${esc(p.description||"لا يوجد وصف إضافي لهذا المنتج حالياً.")}</p>
   <div class="detail-price">${money(p.price)}</div><div class="qty-row"><span>الكمية</span><button id="qtyMinus">−</button><b id="detailQty">1</b><button id="qtyPlus">＋</button></div>
   <button class="btn primary full" id="detailAdd">أضف إلى السلة</button></div></div>`;
 $("#productDialog").showModal();
 $("#closeProduct").onclick=()=>$("#productDialog").close();
 $("#qtyMinus").onclick=()=>{detailQty=Math.max(1,detailQty-1);$("#detailQty").textContent=detailQty};
 $("#qtyPlus").onclick=()=>{detailQty=Math.min(99,detailQty+1);$("#detailQty").textContent=detailQty};
 $("#detailAdd").onclick=()=>{addToCart(p,detailQty);$("#productDialog").close()};
 document.querySelectorAll("[data-detail-image]").forEach(img=>img.onclick=()=>{$("#detailMainImage").src=img.dataset.detailImage});
}
function invoiceMarkup(order){
 const rows=order.items.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.qty}</td><td>${money(x.price)}</td><td>${money(x.price*x.qty)}</td></tr>`).join("");
 const c=order.customer;
 return `<div id="printInvoice" class="invoice-box" dir="rtl"><h3>VIP — فاتورة طلب</h3>
 <p><b>رقم الطلب:</b> ${esc(order.orderId)}</p><p><b>التاريخ:</b> ${esc(order.dateText)}</p>
 <hr><p><b>العميل:</b> ${esc(c.name)}</p><p><b>الجوال:</b> ${esc(c.phone)}</p>
 <p><b>المدينة:</b> ${esc(c.city)} — <b>الحي:</b> ${esc(c.neighborhood)}</p>
 <p><b>العنوان الوطني:</b> ${esc(c.nationalAddress)}</p><p><b>العنوان التفصيلي:</b> ${esc(c.address)}</p>
 <table class="invoice-table"><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
 <h3>الإجمالي: ${money(order.total)}</h3><p>رسوم التوصيل: يتم تأكيدها مع العميل.</p><p>هذه فاتورة طلب مبدئية وليست إثبات دفع.</p></div>`;
}
function showSuccess(order){
 lastOrder=order;
 const waText=`طلب جديد من متجر VIP%0Aرقم الطلب: ${order.orderId}%0Aالاسم: ${order.customer.name}%0Aالجوال: ${order.customer.phone}%0Aالإجمالي: ${money(order.total)}`;
 const waUrl=WHATSAPP_NUMBER?`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`:"";
 $("#successContent").innerHTML=`<h2>تم تسجيل طلبك</h2><p>رقم الطلب: <b>${esc(order.orderId)}</b></p><p class="muted">احتفظ برقم الطلب. سيتم تأكيد تفاصيل التوصيل والدفع معك.</p>
 ${invoiceMarkup(order)}<div class="invoice-actions"><button class="btn primary" id="printBtn">طباعة الفاتورة</button>${waUrl?`<a class="btn ghost" target="_blank" rel="noopener" href="${waUrl}">إرسال عبر واتساب</a>`:`<button class="btn ghost" id="noWhatsApp">واتساب غير مضبوط</button>`}</div>
 <button class="btn ghost full" id="finishOrder" style="margin-top:10px">إغلاق</button>`;
 $("#successDialog").showModal();
 $("#printBtn").onclick=()=>{const content=$("#printInvoice").outerHTML;const w=window.open("","_blank");if(!w){toast("اسمح بفتح النوافذ لطباعة الفاتورة");return}w.document.write(`<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة VIP</title><style>body{font-family:Arial,sans-serif;padding:25px;color:#222}.invoice-box{max-width:750px;margin:auto}.invoice-table{width:100%;border-collapse:collapse}.invoice-table td,.invoice-table th{border:1px solid #ccc;padding:9px;text-align:right}</style></head><body>${content}</body></html>`);w.document.close();w.focus();w.print()};
 const noWa=$("#noWhatsApp");if(noWa)noWa.onclick=()=>toast("أضف رقم واتساب المتجر داخل store.js");
 $("#finishOrder").onclick=()=>$("#successDialog").close();
}
document.addEventListener("click",e=>{
 const add=e.target.closest("[data-add]");if(add){const p=products.find(x=>String(x.id)===add.dataset.add);if(p)addToCart(p)}
 const rem=e.target.closest("[data-remove]");if(rem){cart=cart.filter(x=>String(x.id)!==rem.dataset.remove);saveCart()}
 const cat=e.target.closest("[data-category]");if(cat){selectedCategory=cat.dataset.category;document.querySelectorAll(".category-card").forEach(x=>x.classList.toggle("active",x===cat));renderProducts()}
 const details=e.target.closest("[data-details]");if(details)openDetails(details.dataset.details);
 const fav=e.target.closest("[data-fav]");if(fav){const id=String(fav.dataset.fav);favorites.has(id)?favorites.delete(id):favorites.add(id);localStorage.setItem("vip_favorites",JSON.stringify([...favorites]));renderProducts();toast(favorites.has(id)?"أضيف للمفضلة":"أزيل من المفضلة")}
});
$("#searchInput").addEventListener("input",renderProducts);
$("#sortSelect").addEventListener("change",renderProducts);
$("#cartBtn").onclick=openCart;$("#bottomCartBtn").onclick=openCart;
$("#overlay").onclick=closeCart;
document.querySelectorAll("[data-close]").forEach(x=>x.onclick=closeCart);
$("#menuBtn").onclick=()=>$("#topLinks").classList.toggle("open");
$("#topLinks").addEventListener("click",()=>$("#topLinks").classList.remove("open"));
$("#searchBtn").onclick=()=>{$("#searchInput").focus();$("#products").scrollIntoView()};
function showFavorites(){selectedCategory="الكل";$("#searchInput").value="";renderProducts();const ids=new Set([...favorites]);document.querySelectorAll(".product-card").forEach(card=>{const b=card.querySelector("[data-fav]");card.style.display=ids.has(b?.dataset.fav)?"":"none"});$("#products").scrollIntoView()}
$("#favBtn").onclick=showFavorites;$("#bottomFavBtn").onclick=showFavorites;
$("#checkoutBtn").onclick=()=>{if(!cart.length)return toast("السلة فارغة");$("#checkoutDialog").showModal()};
$("#closeCheckout").onclick=()=>$("#checkoutDialog").close();

$("#checkoutForm").onsubmit=async e=>{
 e.preventDefault();if(!cart.length)return;
 const btn=$("#submitOrderBtn");btn.disabled=true;btn.textContent="جارٍ إرسال الطلب...";
 const f=new FormData(e.currentTarget);
 const customer={name:f.get("name").trim(),phone:f.get("phone").trim(),city:f.get("city").trim(),neighborhood:f.get("neighborhood").trim(),nationalAddress:f.get("nationalAddress").trim(),address:f.get("address").trim()};
 const items=cart.map(({id,name,price,qty})=>({id,name,price:Number(price),qty:Number(qty)}));
 const total=items.reduce((sum,x)=>sum+x.price*x.qty,0);
 const dateText=new Date().toLocaleString("ar-SA");
 const order={customer,notes:f.get("notes"),items,total,status:"جديد",createdAt:serverTimestamp()};
 try{
  let orderId;
  if(configured){const ref=await addDoc(collection(db,"orders"),order);orderId=ref.id}
  else orderId="VIP-DEMO-"+Date.now().toString().slice(-7);
  const completed={...order,orderId,dateText,createdAtLocal:new Date().toISOString()};
  $("#checkoutDialog").close();e.currentTarget.reset();cart=[];saveCart();showSuccess(completed);
  if(!configured)toast("طلب تجريبي: لم يُحفظ في Firebase");
 }catch(error){console.error(error);$("#checkoutMsg").textContent="تعذر إرسال الطلب. تحقق من إعداد Firebase وقواعد Firestore والإنترنت."}
 finally{btn.disabled=false;btn.textContent="إرسال الطلب"}
};

async function trackVisit(){if(!configured)return;try{await addDoc(collection(db,"pageViews"),{page:"home",createdAt:serverTimestamp(),path:location.pathname})}catch(error){console.warn("visit tracking unavailable",error)}}
document.querySelectorAll(".bottom-link[href]").forEach(link=>link.addEventListener("click",()=>{document.querySelectorAll(".bottom-link").forEach(x=>x.classList.remove("active"));link.classList.add("active")}));
$("#year").textContent=new Date().getFullYear();
saveCart();loadProducts();trackVisit();
