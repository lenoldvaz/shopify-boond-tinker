/**
 * DK Combo Pack Product Swapper
 * Added by DK on 2025-10-25
 * 
 * Handles product swapping for combo pack selections without full page reload
 * Uses Shopify's Section Rendering API for seamless product transitions
 */

(() => {
  // Configuration - adjust these based on your theme structure
  const SECTION_ID = 'main';                  // your product section id  
  const TARGET_SELECTOR = '.product-information';  // wrapper around the product section
  const LOADING_SELECTOR = '#combo-loading';  // loading indicator

  /**
   * Fetches a product section using Section Rendering API
   * @param {string} url - Product URL to fetch
   * @returns {Promise<{next: Element, doc: Document}>}
   */
  async function fetchSection(url) {
    try {
      const glue = url.includes('?') ? '&' : '?';
      const fetchUrl = `${url}${glue}section_id=${SECTION_ID}`;
      
      const response = await fetch(fetchUrl, { 
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'text/html'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const next = doc.querySelector(TARGET_SELECTOR);
      
      if (!next) {
        throw new Error('Product section not found in response');
      }
      
      return { next, doc };
    } catch (error) {
      console.error('Failed to fetch product section:', error);
      throw error;
    }
  }

  /**
   * Shows loading state
   */
  function showLoading() {
    const loader = document.querySelector(LOADING_SELECTOR);
    if (loader) {
      loader.classList.remove('hidden');
    }
  }

  /**
   * Hides loading state
   */
  function hideLoading() {
    const loader = document.querySelector(LOADING_SELECTOR);
    if (loader) {
      loader.classList.add('hidden');
    }
  }

  /**
   * Updates page title and meta information
   * @param {Document} doc - New document to extract meta from
   */
  function updatePageMeta(doc) {
    // Update page title
    const newTitle = doc.querySelector('title');
    if (newTitle && document.title !== newTitle.textContent) {
      document.title = newTitle.textContent;
    }

    // Update canonical URL
    const newCanonical = doc.querySelector('link[rel="canonical"]');
    if (newCanonical) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = newCanonical.href;
    }

    // Update meta description
    const newDescription = doc.querySelector('meta[name="description"]');
    if (newDescription) {
      let description = document.querySelector('meta[name="description"]');
      if (!description) {
        description = document.createElement('meta');
        description.name = 'description';
        document.head.appendChild(description);
      }
      description.content = newDescription.content;
    }
  }

  /**
   * Swaps the current product with a new one
   * @param {string} url - URL of the product to swap to
   */
  async function swapTo(url) {
    try {
      showLoading();
      
      const { next, doc } = await fetchSection(url);
      const current = document.querySelector(TARGET_SELECTOR);
      
      if (!current) {
        throw new Error('Current product section not found');
      }

      // Replace the product section
      current.replaceWith(next);

      // Update browser history without reload
      history.replaceState({}, '', url);

      // Update page meta information
      updatePageMeta(doc);

      // Dispatch custom event for analytics and other integrations
      document.dispatchEvent(new CustomEvent('product:swapped', {
        detail: {
          newUrl: url,
          timestamp: Date.now()
        }
      }));

      // Re-initialize any theme-specific scripts if needed
      if (window.theme && typeof window.theme.initProduct === 'function') {
        window.theme.initProduct();
      }

      // Scroll to top of product section smoothly
      const newSection = document.querySelector(TARGET_SELECTOR);
      if (newSection) {
        newSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }

    } catch (error) {
      console.error('Product swap failed:', error);
      throw error;
    } finally {
      hideLoading();
    }
  }

  /**
   * Handles combo pack card clicks
   */
  function handleComboClick(event) {
    const button = event.target.closest('.js-cross-product');
    if (!button) return;

    event.preventDefault();
    
    const url = button.dataset.url;
    if (!url) {
      console.warn('No URL found for combo product');
      return;
    }

    // Fallback for browsers without fetch support
    if (!window.fetch) {
      location.href = url;
      return;
    }

    // Disable button to prevent double-clicks
    button.disabled = true;
    button.style.opacity = '0.6';

    // Attempt the swap
    swapTo(url)
      .catch((error) => {
        console.error('Swap failed, falling back to page navigation:', error);
        // Fallback to full page navigation
        location.href = url;
      })
      .finally(() => {
        // Re-enable button
        button.disabled = false;
        button.style.opacity = '';
      });
  }

  /**
   * Initialize combo pack functionality
   */
  function init() {
    // Add click listener for combo pack cards
    document.addEventListener('click', handleComboClick);

    // Add analytics support
    document.addEventListener('product:swapped', (event) => {
      // Send analytics event if GTM is available
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'product_view',
          ecommerce: {
            currency: window.Shopify?.currency?.active || 'USD',
            value: 0, // Will be filled by GTM based on product data
            items: [] // Will be filled by GTM based on product data
          },
          combo_pack_swap: true,
          new_url: event.detail.newUrl
        });
      }

      // Console log for debugging
      console.log('Product swapped to:', event.detail.newUrl);
    });

    console.log('🔧 DK Combo Pack functionality initialized - DEBUG MODE');
    console.log('Target selector:', TARGET_SELECTOR);
    console.log('Section ID:', SECTION_ID);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.DKComboPack = {
    swapTo,
    fetchSection,
    version: '1.0.0'
  };
})();