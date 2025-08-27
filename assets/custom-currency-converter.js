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

    // Convert prices on page load (always convert to show correct currency symbol)
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
      // Extract price from text content - handle Shopify money format
      const priceText = element.textContent.trim();
      
      // Remove any currency symbols and extract the number
      // This regex matches: $123.45, USD 123.45, 123.45, $1,234.56, ₹1,234.56, etc.
      const cleanedText = priceText.replace(/[A-Z]{3}\s*/g, ''); // Remove currency codes like USD
      const priceMatch = cleanedText.match(/[\d,]+\.?\d*/);
      
      if (priceMatch && priceMatch[0]) {
        originalPrice = priceMatch[0].replace(/,/g, '');
        element.dataset.originalPrice = originalPrice;
        
        // Store the original full text for format preservation
        element.dataset.originalFormat = priceText;
        console.log('Extracted price:', originalPrice, 'from:', priceText);
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
    // Define currency symbols
    const currencySymbols = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'AED': 'د.إ'
    };

    // Try to use Intl.NumberFormat for proper formatting
    try {
      // For INR, use Indian number format
      const locale = this.currentCurrency === 'INR' ? 'en-IN' : undefined;
      
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: this.currentCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return formatter.format(price);
    } catch (e) {
      // Fallback for unsupported currencies
      const symbol = currencySymbols[this.currentCurrency] || this.currentCurrency;
      const formattedNumber = parseFloat(price).toFixed(2);
      
      // For INR, format with Indian numbering system
      if (this.currentCurrency === 'INR') {
        const parts = formattedNumber.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        return `${symbol}${parts.join('.')}`;
      }
      
      return `${symbol}${formattedNumber}`;
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
    // Small delay to ensure Shopify's price rendering is complete
    setTimeout(() => {
      window.currencyConverter = new CurrencyConverter();
    }, 100);
  });
} else {
  setTimeout(() => {
    window.currencyConverter = new CurrencyConverter();
  }, 100);
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