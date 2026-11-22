
import { auth, db, configured } from "./firebase.js";

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

const ADMIN_UID = "JZBRq09omwXLHUt3EiiAIlQL6Xi2";

const $ = s => document.querySelector(s);

let products = [];
let orders = [];

const money = n =>
  `${Number(n || 0).toLocaleString("ar-SA")} ر.س`;

function message(text) {
  const el = $("#loginMsg");
  if (el) el.textContent = text;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

if (!configured || !auth || !db) {
  message("إعداد Firebase غير مكتمل. راجع firebase.js");
  throw new Error("Firebase configuration is missing");
}

const loginForm = $("#loginForm");

loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  const form = new FormData(e.currentTarget);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");

  message("جارٍ تسجيل الدخول...");

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log("UID:", cred.user.uid);
  } catch (err) {
    console.error("Login error:", err);

    const errors = {
      "auth/user-not-found": "الحساب غير موجود.",
      "auth/wrong-password": "كلمة المرور غير صحيحة.",
      "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.",
      "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
      "auth/configuration-not-found": "فعّل Email/Password في Firebase Authentication.",
      "auth/invalid-api-key": "تحقق من مفتاح Firebase في firebase.js.",
      "auth/network-request-failed": "تحقق من اتصال الإنترنت."
    };

    message(errors[err.code] || "تعذر تسجيل الدخول: " + err.message);
  }
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    $("#loginView").hidden = false;
    $("#adminView").hidden = true;
    return;
  }

  if (user.uid !== ADMIN_UID) {
    $("#loginView").hidden = false;
    $("#adminView").hidden = true;
    message("هذا الحساب ليس حساب المدير. UID: " + user.uid);
    await signOut(auth);
    return;
  }

  $("#loginView").hidden = true;
  $("#adminView").hidden = false;

  await loadAll();
});

$("#logoutBtn").addEventListener("click", () => signOut(auth));

document.querySelectorAll("[data-tab]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.hidden = true;
    });

    const target = $("#" + button.dataset.tab + "Tab");
    if (target) target.hidden = false;

    document.querySelectorAll(".nav").forEach(nav => {
      nav.classList.toggle("active", nav === button);
    });

    $("#pageTitle").textContent = button.textContent.trim();
  });
});

async function loadAll() {
  try {
    const [ps, os, vs] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        limit(100)
      )),
      getCountFromServer(collection(db, "pageViews"))
    ]);

    products = ps.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    orders = os.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    $("#statProducts").textContent = products.length;
    $("#statOrders").textContent = orders.length;

    $("#statSales").textContent = money(
      orders
        .filter(o => ["مكتمل", "تم التسليم"].includes(o.status))
        .reduce((sum, o) => sum + Number(o.total || 0), 0)
    );

    $("#statVisits").textContent = vs.data().count;

    renderProducts();
    renderOrders();
    renderRecent();

  } catch (err) {
    console.error("Firestore error:", err);
    $("#recentOrders").textContent =
      "تعذر تحميل البيانات. تحقق من قواعد Firestore.";
  }
}

$("#productForm").addEventListener("submit", async e => {
  e.preventDefault();

  const form = new FormData(e.currentTarget);
  const id = form.get("id");

  const data = {
    name: form.get("name"),
    category: form.get("category"),
    price: Number(form.get("price")),
    image: form.get("image"),
    description: form.get("description"),
    active: form.get("active") === "on",
    updatedAt: new Date()
  };

  try {
    if (id) {
      await setDoc(doc(db, "products", id), data, { merge: true });
    } else {
      await addDoc(collection(db, "products"), {
        ...data,
        createdAt: new Date()
      });
    }

    $("#productMsg").textContent = "تم حفظ المنتج بنجاح.";
    e.currentTarget.reset();
    e.currentTarget.elements.id.value = "";

    await loadAll();

  } catch (err) {
    console.error(err);
    $("#productMsg").textContent = "فشل الحفظ. تحقق من صلاحيات Firestore.";
  }
});

$("#resetProduct").addEventListener("click", () => {
  $("#productForm").reset();
  $("#productForm").elements.id.value = "";
});

function renderProducts() {
  $("#productTable").innerHTML = products.length
    ? `<table class="data-table">
      <thead><tr>
        <th>المنتج</th><th>القسم</th><th>السعر</th>
        <th>الحالة</th><th>إجراء</th>
      </tr></thead>
      <tbody>
      ${products.map(p => `
        <tr>
          <td>${esc(p.name)}</td>
          <td>${esc(p.category)}</td>
          <td>${money(p.price)}</td>
          <td>${p.active === false ? "مخفي" : "ظاهر"}</td>
          <td>
            <button data-edit="${esc(p.id)}">تعديل</button>
            <button data-del="${esc(p.id)}">حذف</button>
          </td>
        </tr>
      `).join("")}
      </tbody></table>`
    : '<div class="empty">لا توجد منتجات حالياً.</div>';
}

$("#productTable").addEventListener("click", async e => {
  const edit = e.target.dataset.edit;
  const del = e.target.dataset.del;

  if (edit) {
    const p = products.find(x => x.id === edit);
    const form = $("#productForm");

    for (const key of [
      "id", "name", "category", "price",
      "image", "description"
    ]) {
      form.elements[key].value = p[key] ?? "";
    }

    form.elements.active.checked = p.active !== false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (del && confirm("هل تريد حذف المنتج؟")) {
    try {
      await deleteDoc(doc(db, "products", del));
      await loadAll();
    } catch (err) {
      console.error(err);
      alert("تعذر حذف المنتج.");
    }
  }
});

function renderOrders() {
  const statuses = [
    "جديد", "قيد التجهيز", "تم الشحن",
    "تم التسليم", "ملغي"
  ];

  $("#ordersTable").innerHTML = orders.length
    ? `<table class="data-table">
      <thead><tr>
        <th>رقم الطلب</th><th>العميل</th>
        <th>المنتجات</th><th>الإجمالي</th><th>الحالة</th>
      </tr></thead>
      <tbody>
      ${orders.map(o => `
        <tr>
          <td>${esc(o.id.slice(0, 9))}</td>
          <td>${esc(o.customer?.name)}<br>
          <small>${esc(o.customer?.phone)}</small></td>
          <td>${(o.items || []).map(i =>
            esc(i.name) + " × " + Number(i.qty || 0)
          ).join("، ")}</td>
          <td>${money(o.total)}</td>
          <td>
            <select data-status="${esc(o.id)}">
            ${statuses.map(s =>
              `<option ${o.status === s ? "selected" : ""}>${s}</option>`
            ).join("")}
            </select>
          </td>
        </tr>
      `).join("")}
      </tbody></table>`
    : '<div class="empty">لا توجد طلبات حتى الآن.</div>';
}

$("#ordersTable").addEventListener("change", async e => {
  const id = e.target.dataset.status;
  if (!id) return;

  try {
    await updateDoc(doc(db, "orders", id), {
      status: e.target.value
    });
    await loadAll();
  } catch (err) {
    console.error(err);
    alert("تعذر تحديث حالة الطلب.");
  }
});

function renderRecent() {
  $("#recentOrders").innerHTML = orders.length
    ? `<table class="data-table">
      <tr><th>العميل</th><th>الإجمالي</th><th>الحالة</th></tr>
      ${orders.slice(0, 5).map(o => `
        <tr>
          <td>${esc(o.customer?.name)}</td>
          <td>${money(o.total)}</td>
          <td>${esc(o.status)}</td>
        </tr>
      `).join("")}
    </table>`
    : "لا توجد طلبات مسجلة بعد.";
}
