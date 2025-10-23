// logo-switcher-core.js
(function() {
    'use strict';
    
    // This will be provided by the configuration script
    window.LogoSwitcherConfig = window.LogoSwitcherConfig || [];

    let currentLocationId = null;
    let observer = null;
    let urlCheckInterval = null;

    const GHL_LOGO_SELECTORS = [
        '.agency-logo-container img',
        '.hl_navbar--logo img',
        'nav img[src*="msgsndr"]',
        'header img[src*="msgsndr"]',
        '[data-testid="sidebar-logo"] img',
        '.sidebar-logo img',
        'img[alt*="logo" i]',
        'img[alt*="agency logo"]'
    ];

    function init() {
        console.log("🚀 Logo Switcher Initialized");
        console.log("📋 Loaded config entries:", window.LogoSwitcherConfig.length);
        setupURLObserver();
        setupMutationObserver();
        setupAccountSwitchListener();
        startURLPolling();
        checkAndReplaceLogo();
    }

    function startURLPolling() {
        let lastUrl = location.href;
        urlCheckInterval = setInterval(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                console.log("🔄 URL Changed (polling):", currentUrl);
                lastUrl = currentUrl;
                setTimeout(checkAndReplaceLogo, 300);
            }
        }, 500);
    }

    function setupURLObserver() {
        let lastUrl = location.href;
        
        observer = new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                console.log("🔄 URL Changed (observer):", currentUrl);
                lastUrl = currentUrl;
                setTimeout(checkAndReplaceLogo, 300);
            }
        });

        observer.observe(document.body, { 
            subtree: true, 
            childList: true,
            attributes: true,
            attributeFilter: ['href', 'src']
        });
    }

    function setupMutationObserver() {
        const logoObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.classList?.contains('agency-logo-container') || 
                        target.classList?.contains('hl_navbar--logo') ||
                        target.tagName === 'IMG') {
                        console.log("🖼️ Logo element changed, checking...");
                        setTimeout(checkAndReplaceLogo, 200);
                        break;
                    }
                }
            }
        });

        logoObserver.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['src', 'class']
        });
    }

    function setupAccountSwitchListener() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button, [role="button"]');
            if (target) {
                const href = target.href || target.getAttribute('href') || '';
                const text = target.textContent?.toLowerCase() || '';
                
                if (href.includes('/location/') || 
                    text.includes('switch') || 
                    text.includes('location') ||
                    target.id?.includes('location') ||
                    target.classList?.contains('location')) {
                    console.log("🔀 Location switch detected, waiting for change...");
                    setTimeout(checkAndReplaceLogo, 500);
                    setTimeout(checkAndReplaceLogo, 1000);
                    setTimeout(checkAndReplaceLogo, 1500);
                }
            }
        }, true);

        window.addEventListener('popstate', () => {
            console.log("⬅️ Browser navigation detected");
            setTimeout(checkAndReplaceLogo, 300);
        });

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function() {
            originalPushState.apply(this, arguments);
            console.log("📍 pushState detected");
            setTimeout(checkAndReplaceLogo, 300);
        };

        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            console.log("📍 replaceState detected");
            setTimeout(checkAndReplaceLogo, 300);
        };
    }

    function checkAndReplaceLogo() {
        const newLocationId = getLocationId();
        
        if (!newLocationId) {
            console.log("❌ No location ID found in URL");
            return;
        }

        console.log("📍 Current Location ID:", newLocationId);

        const config = window.LogoSwitcherConfig.find(entry => 
            entry.locationIds.includes(newLocationId)
        );

        if (config) {
            console.log(`✅ Found config for: ${config.name}`);
            replaceLogo(config.logoURL, config.name);
        } else {
            console.log("⚪ No custom logo for this location, restoring default");
            restoreDefaultLogo();
        }

        currentLocationId = newLocationId;
    }

    function getLocationId() {
        try {
            const url = window.location.href;
            const match = url.match(/\/location\/([a-zA-Z0-9]+)(?:\/|$|\?)/);
            return match ? match[1] : null;
        } catch (e) {
            console.error("❌ Error getting location ID:", e);
            return null;
        }
    }

    function replaceLogo(logoUrl, name) {
        let attempts = 0;
        const MAX_ATTEMPTS = 8;

        function attemptReplace() {
            const logoElements = findAllGhlLogos();
            
            if (logoElements.length > 0) {
                console.log(`🖼️ Found ${logoElements.length} logo(s), replacing with ${name} logo...`);
                let replaced = 0;
                logoElements.forEach(logoElement => {
                    if (applyLogoStyles(logoElement, logoUrl)) {
                        replaced++;
                    }
                });
                console.log(`✅ Successfully replaced ${replaced} logo(s)!`);
                return true;
            } else if (attempts < MAX_ATTEMPTS) {
                attempts++;
                console.log(`⏳ Retrying... (${attempts}/${MAX_ATTEMPTS})`);
                setTimeout(attemptReplace, 500);
            } else {
                console.log("❌ Could not find logo after retries");
            }
            return false;
        }

        attemptReplace();
    }

    function findAllGhlLogos() {
        const logos = [];
        const seen = new Set();
        
        for (const selector of GHL_LOGO_SELECTORS) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element && !seen.has(element)) {
                    seen.add(element);
                    logos.push(element);
                }
            });
        }
        return logos;
    }

    function applyLogoStyles(logoElement, logoUrl) {
        try {
            if (!logoElement.dataset.originalSrc) {
                logoElement.dataset.originalSrc = logoElement.src;
            }
            
            if (logoElement.src !== logoUrl) {
                logoElement.src = logoUrl;
                logoElement.style.objectFit = 'contain';
                logoElement.style.maxHeight = '40px';
                logoElement.style.maxWidth = '180px';
                logoElement.style.padding = '4px';
                logoElement.style.borderRadius = '4px';
                logoElement.style.display = 'block';
                return true;
            }
            return false;
        } catch (e) {
            console.error("❌ Error applying logo:", e);
            return false;
        }
    }

    function restoreDefaultLogo() {
        const logoElements = findAllGhlLogos();
        logoElements.forEach(logoElement => {
            if (logoElement && logoElement.dataset.originalSrc) {
                logoElement.src = logoElement.dataset.originalSrc;
                logoElement.style = '';
            }
        });
    }

    // Expose public API for config updates
    window.LogoSwitcher = {
        refresh: checkAndReplaceLogo,
        addConfig: function(config) {
            window.LogoSwitcherConfig.push(config);
            checkAndReplaceLogo();
        },
        updateConfig: function(newConfig) {
            window.LogoSwitcherConfig = newConfig;
            checkAndReplaceLogo();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    let safetyChecks = 0;
    const safetyInterval = setInterval(() => {
        checkAndReplaceLogo();
        safetyChecks++;
        if (safetyChecks >= 10) clearInterval(safetyInterval);
    }, 1000);

})();