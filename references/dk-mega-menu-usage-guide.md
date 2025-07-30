# DK Mega Menu Usage Guide

## Overview
This guide explains how to use the DK Mega Menu that was built to replicate the Hey Bud menu layout. The mega menu is integrated into the header menu system and provides a comprehensive navigation experience with category columns and featured products.

**IMPLEMENTATION STATUS: ✅ COMPLETED**
The DK Mega Menu is fully implemented and ready for use.

## System Architecture

### Integration Approach
The DK Mega Menu is implemented as a **header menu style** rather than a standalone section. This provides:
- Seamless integration with existing header functionality
- Proper dropdown positioning and animations
- Mobile-responsive behavior
- Consistent user experience

### Components Included
- **Navigation Categories** - Left sidebar (Best Sellers, Bundle, Subscribe & Save)
- **Menu Columns** - Product category columns (Skincare, Haircare)  
- **Featured Products Carousel** - Trending products with navigation

## Quick Setup

### Step 1: Enable DK Mega Menu
1. Go to **Online Store > Themes > Customize**
2. Navigate to the **Header** section
3. Click on the **Menu** block within the header
4. In the **Style** dropdown, select **"DK Mega Menu"**

### Step 2: Configure Navigation Categories  
Once "DK Mega Menu" is selected, additional settings will appear:

1. **Show navigation categories**: Toggle to enable the left sidebar
2. **Navigation categories**: Enter categories separated by commas:
   ```
   Best Sellers,Build Your Own Bundle,Subscribe & Save
   ```
3. **Category links**: Enter corresponding URLs:
   ```
   /collections/best-sellers,/pages/build-bundle,/pages/subscribe
   ```

### Step 3: Set Up Menu Columns
1. **Skincare column title**: Set to "Shop Skincare" 
2. **Skincare menu**: Select your skincare navigation menu
3. **Haircare column title**: Set to "Shop Haircare"
4. **Haircare menu**: Select your haircare navigation menu
5. **Maximum links per column**: Set limit (default: 8)
6. **Show 'Shop All' links**: Toggle to show "SHOP ALL" buttons

### Step 4: Configure Featured Products
1. **Show featured products carousel**: Toggle to enable
2. **Carousel title**: Set to "Trending this Week"
3. **Featured collection**: Select a product collection
4. **Products to show**: Set number of products (3-10)
5. **Show product descriptions**: Toggle product descriptions
6. **Show sale badges**: Toggle discount percentage badges

## Detailed Configuration

### All Available Settings

#### Navigation Categories Section
- **Show navigation categories**: Toggle the left sidebar on/off
- **Navigation categories**: Comma-separated list of category names
- **Category links**: Comma-separated list of URLs (must match category order)

#### Menu Columns Section  
- **Skincare column title**: Header text for first column
- **Skincare menu**: Shopify navigation menu selection
- **Haircare column title**: Header text for second column
- **Haircare menu**: Shopify navigation menu selection
- **Maximum links per column**: Limit displayed links (3-15)
- **Show 'Shop All' links**: Toggle "SHOP ALL" buttons
- **'Shop All' text**: Customize button text (default: "SHOP ALL")

#### Featured Products Section
- **Show featured products carousel**: Toggle the product carousel
- **Carousel title**: Header text for products section
- **Featured collection**: Source collection for products
- **Products to show**: Number of products in carousel (3-10) 
- **Show product descriptions**: Toggle product descriptions
- **Show sale badges**: Toggle discount percentage badges

#### Layout Controls
- **Gap (Desktop)**: Spacing between sections on desktop (0-100px, default: 32px)
- **Gap (Mobile)**: Spacing between sections on mobile (0-100px, default: 24px)

### DK Navigation Categories Block

#### Content Setup
- **Navigation categories**: Enter categories separated by commas or new lines
- **Category links**: Enter corresponding URLs in the same order

**Example:**
```
Categories: Best Sellers,New Arrivals,Sale Items
Links: /collections/best-sellers,/collections/new,/collections/sale
```

#### Best Practices
- Keep category names concise (2-3 words max)
- Use high-traffic or important page links
- Test links to ensure they're working

### DK Menu Column Block

#### Basic Settings
- **Column title**: Header text for the column
- **Menu**: Select a Shopify navigation menu
- **Maximum links to show**: Limit displayed links (3-15)

#### Shop All Settings
- **Show 'Shop All' link**: Toggle the bottom link
- **'Shop All' text**: Customize the text (default: "SHOP ALL")

#### Menu Setup Requirements
1. **Create Navigation Menus** in Online Store > Navigation:
   - **Skincare Menu**: Dry + Sensitive, Hyperpigmentation, Acne, etc.
   - **Haircare Menu**: Hair Essentials, Hair Mask, Hair Growth Serum, etc.

**Example Menu Structure:**
```
Skincare Menu:
├── Dry + Sensitive → /collections/dry-sensitive
├── Hyperpigmentation → /collections/hyperpigmentation  
├── Acne → /collections/acne
├── Anti-Aging → /collections/anti-aging
└── Combination → /collections/combination
```

### DK Featured Products Carousel Block

#### Content Settings
- **Carousel title**: Header text (e.g., "Trending this Week")
- **Collection**: Source collection for products
- **Products to show**: Number of products in carousel (3-10)

#### Display Options
- **Show product reviews**: Requires review metafields setup
- **Show product descriptions**: Displays truncated descriptions
- **Show sale badges**: Shows discount percentages

#### Autoplay Settings
- **Auto-rotate products**: Enable automatic sliding
- **Autoplay speed**: Time between slides (3-10 seconds)

#### Product Review Setup
For reviews to display, products need these metafields:
- `product.metafields.reviews.rating.value` (number)
- `product.metafields.reviews.rating_count.value` (number)

## Integration Details

### Header Menu Integration
The DK Mega Menu works seamlessly within the header system:
- **Automatic positioning**: Dropdown appears below the header menu
- **Animation support**: Uses existing header menu animations
- **Mobile compatibility**: Integrates with mobile menu drawer
- **Hover behavior**: Shows on menu hover (desktop) and click (mobile)

## Responsive Behavior

### Desktop (750px+)
- 4-column grid layout
- Hover effects and animations
- Full carousel functionality

### Mobile (<750px)
- Single column stack
- Enhanced touch interactions
- Simplified navigation

## Customization Options

### Styling Customization
The system uses Boond 2025 theme variables:
- `--gap-desktop` / `--gap-mobile` for spacing
- Theme color schemes for colors
- Standard theme typography scaling

### Advanced Customization
Edit the mega menu files for deeper customization:
- **Layout**: Modify grid structure in `snippets/dk_mega-menu.liquid`
- **Styling**: Update CSS in `snippets/dk_mega-menu-styles.liquid`  
- **Integration**: Extend header integration in `blocks/_header-menu.liquid`

## Troubleshooting

### Common Issues

#### Menus Not Displaying
- **Check**: Navigation menus are created and published
- **Solution**: Go to Online Store > Navigation and create required menus

#### Products Not Showing
- **Check**: Collection is selected and has products
- **Solution**: Verify collection exists and contains published products

#### Reviews Not Appearing
- **Check**: Product review metafields are configured
- **Solution**: Set up review app or manually add review metafields

#### Mobile Layout Issues
- **Check**: "Stack vertically on mobile" is enabled
- **Solution**: Adjust mobile gap settings for better spacing

### Performance Optimization

#### Image Optimization
- Use high-quality product images (minimum 300x300px)
- Enable lazy loading for better performance
- Consider WebP format for faster loading

#### Collection Size
- Limit featured product collections to prevent slow loading
- Use specific collections rather than "All products"

## Best Practices

### Content Strategy
1. **Navigation Categories**: Focus on key user journeys
2. **Menu Columns**: Group related products logically  
3. **Featured Products**: Highlight trending or promotional items

### User Experience
1. **Keep menu structure shallow** (avoid too many nested levels)
2. **Use clear, descriptive labels** for all navigation items
3. **Test on mobile devices** to ensure usability
4. **Monitor analytics** to optimize menu performance

### Maintenance
1. **Regular Updates**: Keep featured products fresh
2. **Link Verification**: Check that all links work correctly
3. **Performance Monitoring**: Watch for loading speed impacts
4. **User Feedback**: Gather insights on navigation effectiveness

## Advanced Features

### Extending Menu Columns
The current implementation supports two menu columns (Skincare and Haircare). To add more columns:
1. Edit `snippets/dk_mega-menu.liquid`
2. Add additional column sections following the existing pattern
3. Update the grid layout CSS accordingly
4. Add corresponding settings to `blocks/_header-menu.liquid`

### Custom Product Collections
Create specific collections for the carousel:
1. Go to **Products > Collections**
2. Create collection (e.g., "Mega Menu Featured")
3. Add products manually or use automated conditions
4. Select in carousel settings

### Seasonal Updates
Update the mega menu for seasons/promotions:
1. **Featured Products**: Switch to seasonal collections
2. **Navigation Categories**: Add temporary promotional links
3. **Menu Columns**: Highlight seasonal product categories

## Analytics and Optimization

### Tracking Setup
Monitor mega menu performance:
- Click-through rates on navigation categories
- Product clicks in featured carousel
- Mobile vs desktop usage patterns

### A/B Testing Opportunities
- Different featured product collections
- Alternative navigation category orders
- Various menu column arrangements

## Support and Updates

### Getting Help
- Check component files for inline documentation
- Reference the implementation guide for technical details
- Test changes in a development environment first

### Future Enhancements
The modular design allows for easy additions:
- Additional block types
- Enhanced animations
- Integration with third-party apps
- Custom product filtering

This mega menu system provides a solid foundation that can grow with your needs while maintaining the Hey Bud design aesthetic and user experience.