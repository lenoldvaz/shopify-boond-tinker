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
- **Individual dropdowns per menu item** - Different content for SHOP, RAKHI 2025, GIFTING

### Menu Item Behavior
- **SHOP Menu Item**: Shows full mega menu with all components
- **RAKHI 2025 & GIFTING**: Show regular dropdown menus (if they have sub-links)
- **Simple Links**: No dropdown for menu items without sub-links

### Components Included
- **Navigation Categories** - Left sidebar (Best Sellers, Bundle, Subscribe & Save)
- **Menu Columns** - Product category columns (Skincare, Haircare)  
- **Featured Products Carousel** - Trending products with navigation
- **Simple Product Cards** - Custom-designed cards with hover effects

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
4. **Category callout pills**: Add attention-grabbing pills (NEW, HOT, etc.):
   ```
   NEW,,HOT
   ```
   This creates "Best Sellers NEW", "Build Your Own Bundle" (no pill), "Subscribe & Save HOT"

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
- **Category callout pills**: Comma-separated list of pill text (NEW, HOT, SELLING OUT FAST, etc.)
  - Leave empty positions for no pill: `NEW,,HOT` = first gets NEW, second gets nothing, third gets HOT
  - Must match the same order as categories

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

## Callout Pills Feature

### Overview
The DK Mega Menu includes a powerful callout pills system that adds attention-grabbing badges next to navigation categories. These pills help highlight special promotions, new arrivals, trending items, or urgency messaging.

### Available Pill Types
The system automatically color-codes pills based on the text you enter:

#### Pre-styled Pills
- **NEW** → Green pill (`#10b981`)
- **HOT** → Red pill (`#ef4444`)
- **SELLING OUT FAST** → Orange pill (`#f59e0b`)
- **SALE** → Purple pill (`#8b5cf6`)
- **LIMITED** → Pink pill (`#ec4899`)
- **TRENDING** → Cyan pill (`#06b6d4`)

#### Custom Pills
- Any other text → Hey Bud green pill (`#173f36`)

### How to Configure Pills

1. **In Theme Customizer**: Header → Menu → DK Mega Menu
2. **Find "Category callout pills" setting**
3. **Enter pill text separated by commas**
4. **Must match category order exactly**

### Examples

#### Example 1: Basic Setup
```
Categories: Best Sellers,New Arrivals,Sale Items
Pills: HOT,NEW,SALE
```
**Result:**
- Best Sellers **HOT** (red pill)
- New Arrivals **NEW** (green pill)  
- Sale Items **SALE** (purple pill)

#### Example 2: Selective Pills
```
Categories: Best Sellers,Build Bundle,Subscribe & Save,Sale
Pills: ,,HOT,SELLING OUT FAST
```
**Result:**
- Best Sellers (no pill)
- Build Bundle (no pill)
- Subscribe & Save **HOT** (red pill)
- Sale **SELLING OUT FAST** (orange pill)

#### Example 3: Custom Text
```
Categories: Skincare,Haircare,Bundles
Pills: 50% OFF,BESTSELLER,
```
**Result:**
- Skincare **50% OFF** (Hey Bud green pill)
- Haircare **BESTSELLER** (Hey Bud green pill)
- Bundles (no pill)

### Visual Features
- **Animated pulse effect** draws attention
- **Rounded pill design** matches modern UI trends
- **High contrast colors** for readability
- **Responsive design** works on all screen sizes
- **Uppercase styling** for consistency

### Best Practices
- **Keep text short**: 1-3 words maximum
- **Use urgency**: "SELLING OUT FAST", "LIMITED TIME"
- **Highlight new items**: "NEW", "JUST LAUNCHED"  
- **Show promotions**: "SALE", "50% OFF"
- **Create urgency**: "HOT", "TRENDING"

## Integration Details

### Header Menu Integration
The DK Mega Menu works seamlessly within the header system:
- **Automatic positioning**: Dropdown appears below the header menu
- **Animation support**: Uses existing header menu animations
- **Mobile compatibility**: Integrates with mobile menu drawer
- **Individual hover behavior**: Each menu item shows its own dropdown content
- **Smart content detection**: SHOP items get mega menu, others get regular dropdowns
- **Menu item detection**: Automatically detects menu handles containing "shop"

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
- **Main Structure**: Modify menu item logic in `snippets/dk_mega-menu.liquid`
- **Mega Menu Content**: Update layout in `snippets/dk_mega-menu-content.liquid`
- **Styling**: Update CSS in `snippets/dk_mega-menu-styles.liquid`  
- **Integration**: Extend header integration in `blocks/_header-menu.liquid`

### File Structure
- `snippets/dk_mega-menu.liquid` - Main menu wrapper with individual dropdown logic
- `snippets/dk_mega-menu-content.liquid` - Full mega menu content for "shop" items
- `snippets/dk_mega-menu-styles.liquid` - All CSS styles and hover states
- `blocks/_header-menu.liquid` - Header integration and settings schema

## Recent Improvements

### Individual Menu Item Dropdowns ✨ NEW
- **Separate dropdowns per menu item** - SHOP gets mega menu, others get regular dropdowns
- **Smart menu detection** - Automatically detects "shop" menu items for mega menu
- **Flexible dropdown system** - Mix mega menus and regular dropdowns in same header
- **Better user experience** - Only relevant content shows for each menu item

### Product Card Fixes ✅ FIXED
- **Custom product card structure** - No longer depends on complex theme snippets
- **Product images now visible** - Fixed missing product display issue
- **Sale badges properly positioned** inside product cards with correct styling
- **Improved hover effects** with smooth animations and scale transforms
- **Better image sizing** with proper aspect ratios and object-fit coverage

### Column Layout Fixes
- **Perfect alignment** between column titles and content
- **Consistent spacing** throughout all sections
- **Improved mobile responsiveness**

### Carousel Functionality ✅ FIXED
- **Working navigation controls** - Previous/Next buttons now fully functional
- **Live slide counter** - Shows current position (1/5, 2/5, etc.)
- **Auto-play feature** - Automatically cycles through products every 5 seconds
- **Smooth transitions** between slides
- **Multiple carousel support** - Each menu item can have its own carousel

### Hey Bud Design Matching
- **Authentic color scheme** - Uses Hey Bud's signature green (#173f36)
- **Professional typography** - Matches Hey Bud's font sizing and weights
- **Clean spacing** - Professional 48px padding and gaps
- **Subtle shadows** - Elegant hover effects
- **Modern button styling** - Green buttons with hover states

## Troubleshooting

### Common Issues

#### Product Cards Not Showing ✅ FIXED
- **Issue**: Product images and cards not displaying in carousel
- **Solution**: Now uses custom product card structure - should work automatically
- **Note**: No longer dependent on complex theme snippets

#### Wrong Menu Item Shows Mega Menu
- **Check**: Menu item handle contains "shop" (case-insensitive)
- **Solution**: Rename menu item to include "shop" or edit the detection logic in `dk_mega-menu.liquid` line 53

#### Carousel Controls Not Working ✅ FIXED
- **Issue**: Previous/Next buttons not functional
- **Solution**: Enhanced JavaScript now properly initializes all carousels
- **Note**: Supports multiple carousels per page

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