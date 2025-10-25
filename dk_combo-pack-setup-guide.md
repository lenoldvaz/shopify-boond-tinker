# DK Combo Pack Setup Guide
*Added by DK on 2025-10-25*

## Overview
The combo pack feature allows customers to switch between single products and combo variants without page reloads. This guide explains how to set up and configure the combo pack functionality.

## What Was Implemented

### 1. Files Created
- `blocks/dk_combo-pack-selector.liquid` - The main combo pack UI component
- `assets/dk_combo-pack.js` - JavaScript for product swapping functionality 
- `dk_combo-pack-setup-guide.md` - This setup guide

### 2. Files Modified
- `templates/product.json` - Added combo pack block to product layout
- `layout/theme.liquid` - Included JavaScript on product pages

## Setting Up Metafields

### Step 1: Create Product Metafields
In your Shopify admin, go to **Settings > Metafields > Products** and create these metafields:

#### Required: Combo Products List
- **Namespace and key**: `custom.combo_products`
- **Name**: Combo Products
- **Description**: Select combo products to display on this product page
- **Content type**: List of product references
- **Validation**: None required

#### Optional: Custom Combo Heading
- **Namespace and key**: `custom.combo_heading` 
- **Name**: Combo Pack Heading
- **Description**: Custom heading for combo pack section (defaults to "Combo Packs")
- **Content type**: Single line text
- **Validation**: None required

#### Optional: Short Product Titles
- **Namespace and key**: `custom.short_title`
- **Name**: Short Product Title
- **Description**: Short title for combo pack cards (falls back to full title)
- **Content type**: Single line text
- **Validation**: None required

### Step 2: Configure Products

#### For Single Products (that should show combo options):
1. Edit the product in Shopify admin
2. Scroll to **Metafields** section
3. Find **Combo Products** metafield
4. Add 1-2 combo products that customers can switch to
5. Optionally set a custom **Combo Pack Heading**

#### For Combo Products:
1. Create combo products as separate products with their own SKUs
2. Leave the **Combo Products** metafield empty (these are the destination products)
3. Optionally add **Short Product Title** for cleaner display in cards

## How It Works

### Customer Experience
1. Customer visits a single product page
2. If combo products are configured, they see a "Combo Packs" section
3. Clicking a combo card instantly swaps the entire product section
4. URL updates to the combo product URL
5. Product gallery, price, inventory, and add-to-cart form all update

### Technical Implementation
- Uses Shopify's Section Rendering API for fast product swapping
- No full page reload required
- Maintains browser history and shareable URLs
- Includes loading states and error handling
- Analytics-ready with custom events

## Customization Options

### Styling
The combo pack cards inherit theme styles but can be customized via CSS:
- `.dk-combo-card` - Main card styling
- `.dk-combo-card:hover` - Hover effects
- Mobile responsive (stacks vertically on mobile)

### JavaScript Events
Listen for the `product:swapped` event for analytics:
```javascript
document.addEventListener('product:swapped', (event) => {
  console.log('Product swapped to:', event.detail.newUrl);
  // Send to analytics
});
```

### Block Settings
The combo pack block includes spacing settings in the theme customizer:
- Top/bottom padding
- Left/right padding

## Testing Checklist

### Required Setup
- [ ] Metafields created in Shopify admin
- [ ] Test products configured with combo products
- [ ] Both single and combo products exist

### Functionality Tests
- [ ] Combo pack section appears on configured products
- [ ] Combo pack section hidden on products without combos
- [ ] Clicking combo cards swaps products correctly
- [ ] URL updates when switching products
- [ ] Loading states work properly
- [ ] Error handling for failed requests
- [ ] Mobile responsive design
- [ ] Sold out badges display correctly

### Edge Cases
- [ ] Products with no images display placeholder
- [ ] Products with no combo metafield don't show section
- [ ] Combo products themselves don't show combo options
- [ ] Browser back/forward buttons work correctly

## Troubleshooting

### Combo Pack Section Not Showing
1. Verify metafield `custom.combo_products` exists
2. Check product has combo products assigned in metafield
3. Ensure combo products are published and available

### JavaScript Errors
1. Check browser console for errors
2. Verify `dk_combo-pack.js` is loading on product pages
3. Check Section Rendering API responses in Network tab

### Styling Issues
1. Verify theme CSS compatibility
2. Check for conflicting styles
3. Test on different screen sizes

## Analytics Integration

The combo pack system dispatches custom events for analytics tracking:

```javascript
// GTM integration example
document.addEventListener('product:swapped', (event) => {
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'product_view',
      ecommerce: {
        currency: window.Shopify?.currency?.active || 'USD',
        // Additional product data will be available in DOM
      },
      combo_pack_swap: true,
      new_url: event.detail.newUrl
    });
  }
});
```

## Future Enhancements

Potential improvements that could be added:
- Multi-variant combo support
- Quantity-based pricing
- Bundle discount display
- Recently viewed combo tracking
- A/B testing for combo placement
- Cross-sell recommendations

---

*For technical support or customizations, refer to the implementation files or consult the development team.*