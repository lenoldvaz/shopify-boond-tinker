// Custom Currency Converter for Shopify Theme
// Works independently of Shopify Payments

class CurrencyConverter {
  constructor() {
    this.baseCurrency = window.customCurrencyPicker?.baseCurrency || 'INR';
    this.currencies = window.customCurrencyPicker?.currencies || {};
    
    // Load saved currency or use base currency
    const savedCurrency = this.loadCurrency();
    this.currentCurrency = savedCurrency && this.currencies[savedCurrency] ? savedCurrency : this.baseCurrency;
    this.currentRate = this.currencies[this.currentCurrency]?.rate || 1;
    
    this.init();
  }

  init() {
    console.log('Currency Converter initialized with:', {
      baseCurrency: this.baseCurrency,
      currentCurrency: this.currentCurrency,
      currentRate: this.currentRate,
      currencies: this.currencies
    });

    // Listen for currency change events
    document.addEventListener('currency:changed', (e) => {
      console.log('Currency changed to:', e.detail);
      this.currentCurrency = e.detail.currency;
      this.currentRate = parseFloat(e.detail.rate);
      this.convertAllPrices();
    });

    // Convert prices on page load
    if (this.currentCurrency !== this.baseCurrency) {
      this.convertAllPrices();
    }

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
      // Extract price from text content - handle Shopify money format
      const priceText = element.textContent.trim();
      
      // Match various price formats including Shopify's
      // This regex matches: $123.45, USD 123.45, 123.45, $1,234.56, etc.
      const priceMatch = priceText.match(/(?:[\$€£¥₹]?\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
      
      if (priceMatch && priceMatch[1]) {
        originalPrice = priceMatch[1].replace(/,/g, '');
        element.dataset.originalPrice = originalPrice;
        
        // Store the original full text for format preservation
        element.dataset.originalFormat = priceText;
      }
    }

    if (originalPrice) {
      const basePrice = parseFloat(originalPrice);
      if (isNaN(basePrice)) return;
      
      const convertedPrice = (basePrice * this.currentRate).toFixed(2);
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