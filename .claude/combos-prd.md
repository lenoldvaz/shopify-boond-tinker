Got it. You want a new “option” on the PDP called Combo Packs that shows 2 cards; clicking one should jump this PDP to that separate combo product (no full page reload). Here’s the clean way.
What you’ll set up
1. Each combo is its own product (bundle SKU).
2. Add a product metafield on every single-SKU PDP that should expose combos:
    * Namespace/key: custom.combo_products
    * Type: List → Product reference
    * Value: the 2 combo products you want to show.
(If this PDP is the combo, just leave the metafield empty.)
Liquid (render “Combo Packs” block)
Drop this inside your product section (where “Size / Giftwrap” options live). Works on Dawn/OS 2.0; adjust classes to your theme.

{%- assign combos = product.metafields.custom.combo_products.value -%}
{%- if combos and combos.size > 0 -%}
  <div id="ComboPacks" class="pdp-option-block">
    <div class="mb-2 text-sm font-medium">Combo Packs</div>
    <div class="grid grid-cols-2 gap-3">
      {%- for p in combos -%}
        <button
          type="button"
          class="js-cross-product block text-left border rounded overflow-hidden"
          data-url="{{ p.url }}"
          aria-label="{{ p.title | escape }}"
        >
          <div class="aspect-square overflow-hidden">
            {%- if p.featured_image -%}
              <img
                src="{{ p.featured_image | image_url: width: 480 }}"
                alt="{{ p.featured_image.alt | escape }}"
                loading="lazy"
                class="w-full h-full object-cover"
              >
            {%- endif -%}
          </div>
          <div class="p-3">
            <div class="text-xs text-neutral-600 line-clamp-2">{{ p.title }}</div>
            <div class="mt-1 text-sm font-semibold">
              {%- if p.price_varies -%}
                From {{ p.price_min | money }}
              {%- else -%}
                {{ p.price | money }}
              {%- endif -%}
            </div>
          </div>
        </button>
      {%- endfor -%}
    </div>
  </div>
{%- endif -%}
JS (swap in the target product using Sections Rendering API)
Add once to your theme (theme.js or a small inline <script>). Update SECTION_ID and TARGET_SELECTOR if your section IDs differ.

<script>
(() => {
  const SECTION_ID = 'main-product';          // your product section id
  const TARGET_SELECTOR = '#MainProduct';     // wrapper around the product section

  async function fetchSection(url) {
    const glue = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${glue}section_id=${SECTION_ID}`, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Fetch failed');
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const next = doc.querySelector(TARGET_SELECTOR);
    if (!next) throw new Error('Section not found');
    return { next, doc };
  }

  async function swapTo(url) {
    const { next, doc } = await fetchSection(url);
    const current = document.querySelector(TARGET_SELECTOR);
    current.replaceWith(next);

    history.replaceState({}, '', url); // keep shareable URL

    // Optional: update canonical
    const newCanon = doc.querySelector('link[rel="canonical"]');
    if (newCanon) {
      let canon = document.querySelector('link[rel="canonical"]');
      if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
      canon.href = newCanon.href;
    }

    // Re-init product scripts if your theme needs it
    document.dispatchEvent(new CustomEvent('product:swapped'));
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('.js-cross-product');
    if (!el) return;
    e.preventDefault();
    const url = el.dataset.url;
    if (!window.fetch) { location.href = url; return; } // old browser fallback
    el.disabled = true;
    swapTo(url).catch(() => location.href = url).finally(() => el.disabled = false);
  });
})();
</script>
How it behaves
* “Combo Packs” appears like a third option group under Size/Giftwrap.
* Clicking a combo card hot-swaps the entire product section (gallery, price, inventory, ATC form) to the combo product, and the URL updates accordingly.
* Analytics: listen for product:swapped in GTM and push a view event with the new product/variant.
Optional niceties
* Add a text metafield custom.combo_heading if you want to change the label “Combo Packs” per product.
* If a combo is sold out, you can badge it:    {%- if p.available == false -%}<span class="badge">Sold out</span>{%- endif -%}
*   
* If you want thumbnail + short label instead of full product title, add a metafield on the combo products like custom.short_title and render that.
That’s it. Create the metafield, link the 2 combo products, paste the Liquid block, paste the JS once, and you’re live.



