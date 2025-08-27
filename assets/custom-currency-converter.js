// Custom Currency Converter for Shopify Theme
// Works independently of Shopify Payments

class CurrencyConverter {
  constructor() {
    this.baseCurrency = window.customCurrencyPicker?.baseCurrency || 'USD';
    this.currencies = window.customCurrencyPicker?.currencies || {};
    this.currentCurrency = this.loadCurrency() || this.baseCurrency;
    this.currentRate = this.currencies[this.currentCurrency]?.rate || 1;
    
    this.init();
  }

  init() {
    // Listen for currency change events
    document.addEventListener('currency:changed', (e) => {
      this.currentCurrency = e.detail.currency;
      this.currentRate = e.detail.rate;
      this.convertAllPrices();
    });

    // Convert prices on page load
    this.convertAllPrices();

    // Watch for new content (AJAX loaded products, etc.)
    this.observePriceChanges();
  }

  loadCurrency() {
    const saved = localStorage.getItem('custom_currency');
    if (saved && this.currencies[saved]) {
      this.currentCurrency = saved;
      this.currentRate = this.currencies[saved].rate;
      return saved;
    }
    return null;
  }

  convertAllPrices() {
    // Find all price elements
    const priceSelectors = [
      '.price',
      '.money',
      '[data-price]',
      '.price__regular',
      '.price__sale',
      '.price-item',
      '.product-price',
      '.cart-item__price',
      '.totals__price',
      '.price--highlight',
      '.price--compare',
      '.dk_price'
    ];

    const priceElements = document.querySelectorAll(priceSelectors.join(', '));
    
    priceElements.forEach(element => {
      this.convertPrice(element);
    });
  }

  convertPrice(element) {
    // Skip if already converted
    if (element.dataset.converted === 'true' && element.dataset.convertedCurrency === this.currentCurrency) {
      return;
    }

    let originalPrice = element.dataset.originalPrice;
    
    if (!originalPrice) {
      // Extract price from text content
      const priceText = element.textContent;
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      
      if (priceMatch) {
        originalPrice = priceMatch[0].replace(/,/g, '');
        element.dataset.originalPrice = originalPrice;
      }
    }

    if (originalPrice) {
      const convertedPrice = (parseFloat(originalPrice) * this.currentRate).toFixed(2);
      const formattedPrice = this.formatPrice(convertedPrice);
      
      // Update the element
      element.textContent = formattedPrice;
      element.dataset.converted = 'true';
      element.dataset.convertedCurrency = this.currentCurrency;
    }
  }

  formatPrice(price) {
    // Try to use Intl.NumberFormat for proper formatting
    try {
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: this.currentCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return formatter.format(price);
    } catch (e) {
      // Fallback for unsupported currencies
      const symbol = this.currencies[this.currentCurrency]?.symbol || this.currentCurrency;
      return `${symbol} ${parseFloat(price).toFixed(2)}`;
    }
  }

  observePriceChanges() {
    // Watch for DOM changes (new products loaded via AJAX, etc.)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if the node or its children contain prices
            const priceElements = node.querySelectorAll('.price, .money, [data-price]');
            priceElements.forEach(element => {
              this.convertPrice(element);
            });
            
            // Also check if the node itself is a price element
            if (node.classList && (node.classList.contains('price') || node.classList.contains('money'))) {
              this.convertPrice(node);
            }
          }
        });
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.currencyConverter = new CurrencyConverter();
  });
} else {
  window.currencyConverter = new CurrencyConverter();
}

// Shopify-specific integrations
document.addEventListener('variant:changed', () => {
  if (window.currencyConverter) {
    setTimeout(() => window.currencyConverter.convertAllPrices(), 100);
  }
});

document.addEventListener('cart:updated', () => {
  if (window.currencyConverter) {
    setTimeout(() => window.currencyConverter.convertAllPrices(), 100);
  }
});

// Handle quick shop/modal events
document.addEventListener('quickshop:loaded', () => {
  if (window.currencyConverter) {
    setTimeout(() => window.currencyConverter.convertAllPrices(), 100);
  }
});