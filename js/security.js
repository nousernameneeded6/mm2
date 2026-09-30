/* Security - Lightweight */
(function(){
    'use strict';

    /* Right click disabled on non-inputs */
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    /* Keyboard shortcuts disabled */
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.keyCode === 123) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.keyCode === 83) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.keyCode === 80) { e.preventDefault(); return false; }
    });

    /* Text selection disabled on non-inputs */
    document.addEventListener('selectstart', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    /* Drag disabled */
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName !== 'INPUT') e.preventDefault();
    });

    /* Image right-click disabled */
    document.addEventListener('mousedown', function(e) {
        if (e.target.tagName === 'IMG' && e.button === 2) e.preventDefault();
    });

    /* AI meta tags */
    var m1 = document.createElement('meta');
    m1.name = 'robots';
    m1.content = 'noai, noimageai, noarchive, nosnippet';
    document.head.appendChild(m1);

    /* Add close button to modal */
    function addClose() {
        var h = document.querySelector('.gen-header');
        if (h && !h.querySelector('.gen-close')) {
            var b = document.createElement('button');
            b.className = 'gen-close';
            b.textContent = 'X';
            b.onclick = function() { closeGenModal(); };
            h.appendChild(b);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addClose);
    } else {
        addClose();
    }

    var obs = new MutationObserver(function(m) {
        m.forEach(function(x) {
            if (x.target.classList && x.target.classList.contains('open')) {
                setTimeout(addClose, 100);
            }
        });
    });
    var gm = document.getElementById('gen-modal');
    if (gm) obs.observe(gm, { attributes: true, attributeFilter: ['class'] });

})();
