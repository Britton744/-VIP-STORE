import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// هوية المدير المعتمد - عدله بعد ما تشوف UID حقك في Console
const ADMIN_UID = "JZBRq09omwXLHUt3EiiAIlQL6Xi2";

const $ = s => document.querySelector(s);

let products = [];
let orders = [];

const money = n =>
  `${Number(n || 0).toLocaleString("ar-SA")} ر.س`;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// تسجيل الدخول - بدون حاجز configured
$("#loginForm").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  $("#loginMsg").textContent = "جارٍ تسجيل الدخول...";
  try {
    const cred = await signInWithEmailAndPassword(auth, f.get("email").trim(), f.get("password"));
    console.log("تم الدخول، UID حقك هو:", cred.user.uid);
    $("#loginMsg").textContent = "";
  } catch (err) {
    console.error(err);
    let msg = "تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.";
    if (err.code === "auth/user-not-found") msg = "هذا الحساب غير موجود في Firebase. روح Authentication > Users واضفه.";
    if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") msg = "كلمة المرور غلط، أو الحساب غير موجود.";
    if (err.code === "auth/invalid-email") msg = "صيغة الإيميل غلط.";
    if (err.code === "auth/configuration-not-found") msg = "فعل Email/Password من Firebase Console > Authentication > Sign-in method";
    if (err.code === "auth/api-key-not-valid" || err.code === "auth/invalid-api-key") msg = "ملف firebase.js لسه قديم على GitHub، ارفعه من جديد.";
    $("#loginMsg").textContent = msg;
  }
};

// التحقق من حساب المدير
onAuthStateChanged(auth, async user => {
  if (user) {
    console.log("المستخدم الحالي UID:", user.uid, "المطلوب:", ADMIN_UID);
    if (user.uid === ADMIN_UID) {
      $("#loginView").hidden = true;
      $("#adminView").hidden = false;
      await loadAll();
      return;
    } else {
      $("#loginView").hidden = false;
      $("#adminView").hidden = true;
      $("#loginMsg").textContent = "دخلت صح، لكن هذا الحساب ليس مدير. UID حقك: " + user.uid + " انسخه وارسل لي اياه عشان اعدله لك.";
      await signOut(auth);
      return;
    }
  }
  $("#loginView").hidden = false;
  $("#adminView").hidden = true;
});

$("#logoutBtn").onclick = () => signOut(auth);

document.querySelectorAll("[data-tab]").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => { x.hidden = true; });
    $("#" + b.dataset.tab + "Tab").hidden = false;
    document.querySelectorAll(".nav").forEach(x => { x.classList.toggle("active", x === b); });
    $("#pageTitle").textContent = b.textContent.trim();
  };
});

async function loadAll() {
  try {
    const [ps, os, vs] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(100))),
      getCountFromServer(collection(db, "pageViews"))
    ]);
    products = ps.docs.map(d => ({ id: d.id, ...d.data() }));
    orders = os.docs.map(d => ({ id: d.id, ...d.data() }));
    $("#statProducts").textContent = products.length;
    $("#statOrders").textContent = orders.length;
    $("#statSales").textContent = money(orders.filter(o => ["مكتمل", "تم التسليم"].includes(o.status)).reduce((a, o) => a + Number(o.total || 0), 0));
    $("#statVisits").textContent = vs.data().count;
    renderProducts();
    renderOrders();
    renderRecent();
  } catch (e) {
    console.error(e);
    $("#recentOrders").textContent = "تعذر تحميل البيانات. تحقق من قواعد Firestore وصلاحية حساب الإدارة.";
  }
}

$("#productForm").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const id = f.get("id");
  const data = { name: f.get("name"), category: f.get("category"), price: Number(f.get("price")), image: f.get("image"), description: f.get("description"), active: f.get("active") === "on", updatedAt: new Date() };
  try {
    if (id) { await setDoc(doc(db, "products", id), data, { merge: true }); }
    else { await addDoc(collection(db, "products"), { ...data, createdAt: new Date() }); }
    $("#productMsg").textContent = "تم حفظ المنتج في قاعدة البيانات.";
    e.currentTarget.reset();
    e.currentTarget.elements.id.value = "";
    await loadAll();
  } catch (err) { console.error(err); $("#productMsg").textContent = "فشل الحفظ. تحقق من صلاحيات Firestore."; }
};

$("#resetProduct").onclick = () => { $("#productForm").reset(); $("#productForm").elements.id.value = ""; };

function renderProducts() {
  $("#productTable").innerHTML = products.length ? `<table class="data-table"><thead><tr><th>المنتج</th><th>القسم</th><th>السعر</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${products.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${p.active === false ? "مخفي" : "ظاهر"}</td><td><button data-edit="${esc(p.id)}">تعديل</button><button data-del="${esc(p.id)}">حذف</button></td></tr>`).join("")}</tbody></table>` : '<div class="empty">لا توجد منتجات حالياً.</div>';
}

$("#productTable").onclick = async e => {
  const edit = e.target.dataset.edit;
  const del = e.target.dataset.del;
  if (edit) {
    const p = products.find(x => x.id === edit);
    const f = $("#productForm");
    for (const k of ["id","name","category","price","image","description"]) { f.elements[k].value = p[k] ?? ""; }
    f.elements.active.checked = p.active !== false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (del && confirm("هل تريد حذف المنتج؟")) {
    try { await deleteDoc(doc(db, "products", del)); await loadAll(); } catch (err) { console.error(err); alert("تعذر حذف المنتج."); }
  }
};

function renderOrders() {
  const statuses = ["جديد","قيد التجهيز","تم الشحن","تم التسليم","ملغي"];
  $("#ordersTable").innerHTML = orders.length ? `<table class="data-table"><thead><tr><th>رقم الطلب</th><th>العميل</th><th>المنتجات</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>${orders.map(o => `<tr><td>${esc(o.id.slice(0, 9))}</td><td>${esc(o.customer?.name)}<br><small>${esc(o.customer?.phone)}</small></td><td class="order-items">${(o.items || []).map(i => esc(i.name) + " × " + Number(i.qty || 0)).join("، ")}</td><td>${money(o.total)}</td><td><select class="status-select" data-status="${esc(o.id)}">${statuses.map(s => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>` : '<div class="empty">لا توجد طلبات حتى الآن.</div>';
}

$("#ordersTable").onchange = async e => {
  const id = e.target.dataset.status;
  if (id) { try { await updateDoc(doc(db, "orders", id), { status: e.target.value }); await loadAll(); } catch (err) { console.error(err); alert("تعذر تحديث حالة الطلب."); } }
};

function renderRecent() {
  $("#recentOrders").innerHTML = orders.length ? `<table class="data-table"><tr><th>العميل</th><th>الإجمالي</th><th>الحالة</th></tr>${orders.slice(0, 5).map(o => `<tr><td>${esc(o.customer?.name)}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join("")}</table>` : "لا توجد طلبات مسجلة بعد.";
}
