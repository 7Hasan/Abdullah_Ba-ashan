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

  // هذا العداد شخصي ومحفوظ على جهاز الزائر فقط، وليس إحصاءً عاماً.
  // سجل الدعاء محلي على الجهاز، ولا يرسل أي بيانات إلى خادم.
  const wallKey = "abdullah_baashan_duas_v1";
  const wallForm = $("#dua-form");
  const wallList = $("#dua-list");
  const wallStatus = $("#wall-status");
  function readDuas() {
    try {
      const current = localStorage.getItem(wallKey);
      if (current !== null) {
        const parsed = JSON.parse(current);
        return Array.isArray(parsed) ? parsed : [];
      }
      // ترحيل رسائل سجل الدعاء من النسخة السابقة إن كانت محفوظة على الجهاز.
      const legacy = JSON.parse(localStorage.getItem("abdullah_wall_msgs") || "[]");
      const migrated = Array.isArray(legacy) ? legacy.map(item => ({
        name: String(item.name || "زائر كريم").slice(0, 45),
        message: String(item.text || "").slice(0, 500),
        date: "من النسخة السابقة"
      })).filter(item => item.message) : [];
      if (migrated.length) localStorage.setItem(wallKey, JSON.stringify(migrated.slice(-100)));
      return migrated;
    } catch (_) { return []; }
  }
  function renderDuas() {
    if (!wallList) return;
    wallList.replaceChildren();
    const items = readDuas();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "small";
      empty.textContent = "لا توجد أدعية محفوظة على هذا الجهاز بعد.";
      wallList.appendChild(empty);
      return;
    }
    items.slice().reverse().forEach(item => {
      const card = document.createElement("article");
      card.className = "wall-msg-card";
      const name = document.createElement("strong");
      name.textContent = item.name || "زائر كريم";
      const message = document.createElement("p");
      message.textContent = item.message || "";
      const date = document.createElement("span");
      date.className = "small";
      date.textContent = item.date || "";
      card.append(name, message, date);
      wallList.appendChild(card);
    });
  }
  wallForm?.addEventListener("submit", event => {
    event.preventDefault();
    const message = $("#dua-message")?.value.trim();
    const name = $("#dua-name")?.value.trim().slice(0, 45) || "زائر كريم";
    if (!message) {
      if (wallStatus) wallStatus.textContent = "اكتب الدعاء أولاً.";
      return;
    }
    try {
      const items = readDuas();
      items.push({name, message:message.slice(0, 500), date:new Date().toLocaleDateString("ar")});
      localStorage.setItem(wallKey, JSON.stringify(items.slice(-100)));
      wallForm.reset();
      if (wallStatus) wallStatus.textContent = "تم حفظ الدعاء على هذا الجهاز.";
      renderDuas();
    } catch (_) {
      if (wallStatus) wallStatus.textContent = "تعذر الحفظ. قد تكون مساحة التخزين ممتلئة أو معطلة.";
    }
  });
  renderDuas();

  // طلب تثبيت الموقع عندما يدعم المتصفح واجهة التثبيت.
  let installPrompt = null;
  const installButton = $("#install-app");
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
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