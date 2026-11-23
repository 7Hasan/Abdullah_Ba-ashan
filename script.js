(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const stories = [
    {category:"دعاء للفقيد",text:"اللهم اغفر له وارحمه، وعافه واعفُ عنه، وأكرم نزله ووسّع مدخله."},
    {category:"دعاء للمسلمين",text:"اللهم اغفر للمؤمنين والمؤمنات والمسلمين والمسلمات الأحياء منهم والأموات."},
    {category:"ذكر",text:"سبحان الله وبحمده، سبحان الله العظيم."},
    {category:"الصلاة على النبي ﷺ",text:"اللهم صلِّ وسلم وبارك على نبينا محمد وعلى آله وصحبه أجمعين."},
    {category:"دعاء",text:"اللهم آنس وحشته، ونوّر قبره، واجعل قبره روضةً من رياض الجنة."}
  ];
  let storyIndex = 0;
  let storyInterval = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function renderStory() {
    const category = $("#story-category");
    const content = $("#story-text");
    if (!category || !content) return;
    category.textContent = stories[storyIndex].category;
    content.textContent = stories[storyIndex].text;
  }
  function nextStory() {
    storyIndex = (storyIndex + 1) % stories.length;
    renderStory();
  }
  function startStories() {
    if (reducedMotion || storyInterval) return;
    storyInterval = window.setInterval(nextStory, 7000);
  }
  function stopStories() {
    window.clearInterval(storyInterval);
    storyInterval = null;
  }
  window.nextStory = nextStory;
  window.shareCurrentStory = async () => {
    const message = stories[storyIndex].text + "\n\n" + location.href;
    await share({title:document.title,text:message,url:location.href});
  };
  window.sharePage = async () => share({
    title:document.title,
    text:"صدقة جارية عن روح الفقيه عبدالله براهم باعشن رحمه الله. نسألكم الدعاء له.",
    url:location.href
  });
  async function share(data) {
    try {
      if (navigator.share) await navigator.share(data);
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.url + (data.text ? "\n" + data.text : ""));
        alert("نُسخ الرابط والنص. يمكنك مشاركته الآن.");
      } else {
        window.prompt("انسخ رابط الصفحة:", data.url);
      }
    } catch (error) {
      if (error?.name !== "AbortError") console.warn("تعذرت المشاركة:", error);
    }
  }

  window.executeIslamicSearch = () => {
    const query = $("#islamic-search-query")?.value.trim();
    const source = $("#search-source")?.value;
    if (!query) { alert("اكتب موضوع البحث أولاً."); $("#islamic-search-query")?.focus(); return; }
    const urls = {
      dorar: "https://dorar.net/hadith/search?q=",
      islamweb: "https://www.islamweb.net/ar/search/index.php?searchText=",
      binbaz: "https://binbaz.org.sa/search?search="
    };
    const base = urls[source];
    if (base) window.open(base + encodeURIComponent(query), "_blank", "noopener,noreferrer");
  };

  // سجل الدعاء مركزي: القراءة من Google Sheets والإرسال للمراجعة.
  const DUA_API_URL = "https://script.google.com/macros/s/AKfycbylOH-ILGZZUnR52h1AFowa5EYsL0tIWmPoWDkefvNvYC7ATR9jUHGa9Ai3QSFhsM7S/exec";
  const wallForm = $("#dua-form");
  const wallList = $("#dua-list");
  const wallStatus = $("#wall-status");
  let publishedDuas = [];

  // JSONP لتجاوز قيود CORS في GitHub Pages مع Apps Script.
  function requestDuaApi(params) {
    return new Promise((resolve, reject) => {
      const callbackName = "__duaApiCallback_" + Date.now() + "_" +
        Math.floor(Math.random() * 1000000);
      const script = document.createElement("script");
      const query = new URLSearchParams({...params, callback: callbackName});
      let settled = false;

      const cleanup = () => {
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        window.clearTimeout(timeout);
      };

      const finish = (error, result) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve(result);
      };

      window[callbackName] = result => finish(null, result);
      script.onerror = () => finish(new Error("تعذر الاتصال بخدمة سجل الدعاء."));
      script.src = DUA_API_URL + "?" + query.toString();
      const timeout = window.setTimeout(
        () => finish(new Error("انتهت مهلة الاتصال. حاول مرة أخرى.")),
        15000
      );
      document.head.appendChild(script);
    });
  }

  function renderDuas() {
    if (!wallList) return;
    wallList.replaceChildren();

    if (!publishedDuas.length) {
      const empty = document.createElement("p");
      empty.className = "small";
      empty.textContent = "لا توجد أدعية منشورة حتى الآن. كن أول من يترك دعاءً.";
      wallList.appendChild(empty);
      return;
    }

    publishedDuas.slice().reverse().forEach(item => {
      const card = document.createElement("article");
      card.className = "wall-msg-card";

      const name = document.createElement("strong");
      name.textContent = item.name || "زائر كريم";

      const message = document.createElement("p");
      message.textContent = item.dua || "";

      const date = document.createElement("span");
      date.className = "small";
      if (item.date) {
        const parsedDate = new Date(item.date);
        date.textContent = Number.isNaN(parsedDate.getTime())
          ? ""
          : parsedDate.toLocaleDateString("ar");
      }

      card.append(name, message, date);
      wallList.appendChild(card);
    });
  }

  async function loadPublishedDuas() {
    if (wallStatus) wallStatus.textContent = "جارٍ تحميل الأدعية المنشورة...";
    try {
      const result = await requestDuaApi({});
      if (!result || !result.success || !Array.isArray(result.duas)) {
        throw new Error(result?.message || "تعذر تحميل الأدعية.");
      }
      publishedDuas = result.duas;
      renderDuas();
      if (wallStatus) wallStatus.textContent = "";
    } catch (error) {
      if (wallStatus) wallStatus.textContent =
        "تعذر تحميل سجل الدعاء حاليًا. يرجى تحديث الصفحة لاحقًا.";
      if (wallList) wallList.replaceChildren();
      console.warn("Dua list loading failed:", error);
    }
  }

  wallForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const message = $("#dua-message")?.value.trim() || "";
    const name = $("#dua-name")?.value.trim().slice(0, 45) || "زائر كريم";
    const submitButton = wallForm.querySelector('button[type="submit"]');

    if (!message) {
      if (wallStatus) wallStatus.textContent = "اكتب الدعاء أولاً.";
      return;
    }
    if (message.length > 500) {
      if (wallStatus) wallStatus.textContent = "الدعاء يجب ألا يتجاوز 500 حرف.";
      return;
    }

    if (submitButton) submitButton.disabled = true;
    if (wallStatus) wallStatus.textContent = "جارٍ إرسال الدعاء للمراجعة...";

    try {
      const result = await requestDuaApi({
        action: "submit",
        dua: message,
        name: name
      });

      if (!result || !result.success) {
        throw new Error(result?.message || "تعذر إرسال الدعاء.");
      }

      wallForm.reset();
      if (wallStatus) {
        wallStatus.textContent =
          "وصل دعاؤك بنجاح، وسيظهر للجميع بعد مراجعته والموافقة عليه.";
      }
      // لا نضيف الدعاء إلى القائمة؛ فهو قيد المراجعة ولن يظهر قبل الموافقة.
    } catch (error) {
      if (wallStatus) {
        wallStatus.textContent =
          error.message || "تعذر إرسال الدعاء. حاول مرة أخرى.";
      }
      console.warn("Dua submission failed:", error);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  loadPublishedDuas();

  // طلب تثبيت الموقع عندما يدعم المتصفح واجهة التثبيت.
  let installPrompt = null;
  const installButton = $("#install-app");
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener("click", async () => {
    if (!installPrompt) {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isAndroid = /android/i.test(navigator.userAgent);
      const help = isIOS
        ? "لتثبيت الموقع: اضغط مشاركة في Safari، ثم اختر إضافة إلى الشاشة الرئيسية."
        : isAndroid
          ? "لتثبيت الموقع: افتح قائمة Chrome ⋮ ثم اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية."
          : "لتثبيت الموقع: افتح قائمة Chrome ⋮ ثم اختر حفظ ومشاركة، وبعدها تثبيت الصفحة كتطبيق.";
      if (wallStatus) wallStatus.textContent = help;
      else window.alert(help);
      return;
    }

    const promptEvent = installPrompt;
    installPrompt = null;
    installButton.disabled = true;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        installButton.hidden = true;
        if (wallStatus) wallStatus.textContent = "جارٍ تثبيت الموقع...";
      } else {
        if (wallStatus) wallStatus.textContent = "لم يتم التثبيت. يمكنك المحاولة مرة أخرى من قائمة Chrome.";
      }
    } catch (error) {
      console.warn("تعذر فتح نافذة التثبيت:", error);
      if (wallStatus) wallStatus.textContent =
        "لم تفتح نافذة التثبيت. افتح قائمة Chrome واختر تثبيت التطبيق.";
    } finally {
      installButton.disabled = false;
    }
  });
  window.addEventListener("appinstalled", () => {
    if (installButton) installButton.hidden = true;
    if (wallStatus) wallStatus.textContent = "تم تثبيت الموقع على جهازك.";
  });

  // ملفات الموقع الأساسية تُخزّن محليًا للعمل دون اتصال بعد أول زيارة.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(error =>
        console.warn("تعذر تفعيل وضع عدم الاتصال:", error)
      );
    });
  }

  const storageKey = "abdullah_baashan_tasbeeh_v1";
  let count = 0;
  try { count = Number(localStorage.getItem(storageKey)) || 0; } catch (_) {}
  const counter = $("#tasbeeh-count");
  if (counter) counter.textContent = String(count);
  $("#tasbeeh-btn")?.addEventListener("click", () => {
    count += 1;
    if (counter) counter.textContent = String(count);
    try { localStorage.setItem(storageKey, String(count)); } catch (_) {}
  });
  $("#tasbeeh-reset")?.addEventListener("click", () => {
    count = 0;
    if (counter) counter.textContent = "0";
    try { localStorage.removeItem(storageKey); } catch (_) {}
  });

  // نستخدم textContent فقط لعرض النصوص، فلا تُفسّر مدخلات الزائر على أنها HTML.
  $("#islamic-search-query")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") window.executeIslamicSearch();
  });

  const storyBox = $("#story-box");
  storyBox?.addEventListener("mouseenter", stopStories);
  storyBox?.addEventListener("mouseleave", startStories);
  storyBox?.addEventListener("focusin", stopStories);
  storyBox?.addEventListener("focusout", startStories);
  document.addEventListener("visibilitychange", () => document.hidden ? stopStories() : startStories());

  // ظهور الأقسام تدريجياً عند الاقتراب منها، مع احترام إعداد تقليل الحركة.
  const sections = document.querySelectorAll(".section");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, {threshold:0.08});
    sections.forEach(section => { section.classList.add("reveal"); observer.observe(section); });
  }
  renderStory();
  startStories();
})();