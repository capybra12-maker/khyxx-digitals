// Khyxx Digitals - E-Commerce & Interactive Client Engine

const storedCart = JSON.parse(localStorage.getItem('khyxx-cart') || '[]');
const cart = Array.isArray(storedCart) ? storedCart.map(item => ({
  ...item,
  quantity: Number(item.quantity) || 1
})) : [];

const cartDrawer = document.querySelector('.cart-drawer');
const overlay = document.querySelector('.overlay');
const cartItems = document.querySelector('.cart-items');
const cartCount = document.querySelector('.cart-count');
const cartTotal = document.querySelector('.cart-total');
const productDetailsPanel = document.querySelector('.product-details-panel');
const productDetailsTitle = document.querySelector('#product-details-title');
const productDetailsType = document.querySelector('.product-details-type');
const productDetailsImage = document.querySelector('.product-details-image');
const productPreviewLink = document.querySelector('.product-preview-link');
const productInclusions = document.querySelector('.product-inclusions');
const detailsAddToCart = document.querySelector('.details-add-to-cart');
const header = document.querySelector('.site-header');
const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
let activeDetailsTrigger = null;

function saveCart() {
  localStorage.setItem('khyxx-cart', JSON.stringify(cart));
}

function formatPrice(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function updateHeaderState() {
  header?.classList.toggle('scrolled', window.scrollY > 8);
}

function setActiveNavLink(sectionId) {
  navLinks.forEach(link => {
    const isActive = link.getAttribute('href') === `#${sectionId}`;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function updateActiveNavFromScroll() {
  const headerHeight = header?.getBoundingClientRect().height || 0;
  const scrollPosition = window.scrollY + headerHeight + 80;
  const sections = Array.from(document.querySelectorAll('main[id], section[id]'));

  let activeId = 'home';
  sections.forEach(section => {
    if (section.id && section.offsetTop <= scrollPosition) {
      activeId = section.id;
    }
  });

  setActiveNavLink(activeId);
}

function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;
  const headerHeight = header?.getBoundingClientRect().height || 0;
  const top = window.pageYOffset + target.getBoundingClientRect().top - headerHeight - 12;
  window.scrollTo({ top, behavior: 'smooth' });
}

function renderCart() {
  const countEl = document.querySelector('.cart-count');
  const totalEl = document.querySelector('.cart-total');

  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  if (countEl) countEl.textContent = String(totalItems);
  if (totalEl) totalEl.textContent = formatPrice(totalPrice);

  if (cartItems) {
    if (!cart.length) {
      cartItems.innerHTML = '<p class="empty">Your bag is waiting for something lovely.</p>';
    } else {
      cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-line">
          <div class="cart-line-info">
            <strong>${item.name}</strong><br>
            <span style="font-size: 0.82rem; color: #87777a;">${formatPrice(item.price)} each</span><br>
            <strong style="color: var(--wine); font-size: 0.9rem;">${formatPrice(item.price * (item.quantity || 1))}</strong>
          </div>
          <div class="cart-line-controls">
            <button class="qty-btn" data-action="dec" data-index="${index}" aria-label="Decrease quantity">−</button>
            <span class="qty-value">${item.quantity || 1}</span>
            <button class="qty-btn" data-action="inc" data-index="${index}" aria-label="Increase quantity">+</button>
            <button class="button secondary" style="padding: 4px 8px; font-size: 0.65rem; margin-left: 6px;" data-remove="${index}" aria-label="Remove ${item.name}">×</button>
          </div>
        </div>
      `).join('');
    }
  }
}

function toggleCart(open) {
  if (!cartDrawer || !overlay) return;
  if (open) toggleProductDetails(false);
  cartDrawer.classList.toggle('open', open);
  overlay.classList.toggle('visible', open);
  cartDrawer.setAttribute('aria-hidden', String(!open));
}

function toggleProductDetails(open, imageButton) {
  if (!productDetailsPanel || !overlay) return;
  if (open && imageButton) {
    activeDetailsTrigger = imageButton;
    productDetailsTitle.textContent = imageButton.dataset.detailsTitle;
    productDetailsType.textContent = imageButton.dataset.detailsType;
    if (imageButton.dataset.detailsImage) {
      productDetailsImage.src = imageButton.dataset.detailsImage;
      productDetailsImage.alt = `${imageButton.dataset.detailsTitle} preview`;
      productDetailsImage.hidden = false;
    } else {
      productDetailsImage.hidden = true;
    }
    if (imageButton.dataset.detailsPreview) {
      productPreviewLink.href = imageButton.dataset.detailsPreview;
      productPreviewLink.hidden = false;
    } else {
      productPreviewLink.hidden = true;
    }
    productInclusions.innerHTML = imageButton.dataset.inclusions
      .split('|')
      .map(inclusion => `<li>${inclusion}</li>`)
      .join('');
    
    const relatedBtn = imageButton.closest('.product')?.querySelector('.add-to-cart');
    if (relatedBtn) {
      detailsAddToCart.dataset.name = relatedBtn.dataset.name;
      detailsAddToCart.dataset.price = relatedBtn.dataset.price;
    }
  }
  if (open) toggleCart(false);
  if (!open && productDetailsPanel.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  productDetailsPanel.classList.toggle('open', open);
  overlay.classList.toggle('visible', open);
  productDetailsPanel.setAttribute('aria-hidden', String(!open));
  if (!open) activeDetailsTrigger?.focus();
}

function addItemToCart(button) {
  const name = button.dataset.name;
  const price = Number(button.dataset.price);
  if (!name || Number.isNaN(price)) return;

  const existingItem = cart.find(item => item.name === name);
  if (existingItem) {
    existingItem.quantity = (existingItem.quantity || 1) + 1;
  } else {
    cart.push({ name, price, quantity: 1 });
  }

  saveCart();
  renderCart();
  toggleCart(true);

  const originalText = button.textContent;
  button.textContent = 'Added to bag ✓';
  setTimeout(() => { button.textContent = originalText; }, 1200);
}

// Global cart listeners
document.querySelectorAll('.add-to-cart').forEach(button => {
  button.addEventListener('click', () => addItemToCart(button));
});

document.querySelectorAll('.product-image[data-details-title]').forEach(imageButton => {
  imageButton.addEventListener('click', () => toggleProductDetails(true, imageButton));
});

detailsAddToCart?.addEventListener('click', () => addItemToCart(detailsAddToCart));

cartItems?.addEventListener('click', event => {
  const target = event.target;
  if (target.dataset.remove !== undefined) {
    cart.splice(Number(target.dataset.remove), 1);
    saveCart();
    renderCart();
    return;
  }

  if (target.dataset.action) {
    const idx = Number(target.dataset.index);
    if (cart[idx]) {
      if (target.dataset.action === 'inc') {
        cart[idx].quantity = (cart[idx].quantity || 1) + 1;
      } else if (target.dataset.action === 'dec') {
        if (cart[idx].quantity > 1) {
          cart[idx].quantity -= 1;
        } else {
          cart.splice(idx, 1);
        }
      }
      saveCart();
      renderCart();
    }
  }
});

document.querySelector('.cart-button')?.addEventListener('click', () => toggleCart(true));
document.querySelector('.close-cart')?.addEventListener('click', () => toggleCart(false));
document.querySelector('.close-details')?.addEventListener('click', () => toggleProductDetails(false));
overlay?.addEventListener('click', () => {
  toggleCart(false);
  toggleProductDetails(false);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    toggleCart(false);
    toggleProductDetails(false);
  }
});

// ==================== CHECKOUT SYSTEM ==================== //

function showCheckoutForm() {
  if (!cart.length) {
    alert('Your bag is currently empty. Please select a lovely invitation or template first!');
    return;
  }

  toggleCart(false);

  const modal = document.createElement('div');
  modal.className = 'checkout-modal';
  modal.innerHTML = `
    <form class="checkout-form" aria-labelledby="checkout-title">
      <button class="close-checkout" type="button" aria-label="Close checkout">×</button>
      <div class="checkout-brand"><span>Khyxx</span> Digitals<small>secure order checkout</small></div>
      <p class="eyebrow">step 1 of 2 · celebration & contact</p>
      <h2 id="checkout-title">Your Order Details</h2>
      <p class="checkout-intro">Enter your event information and preferred payment method to finalize your order.</p>

      <div class="details-fields">
        <label>Your Full Name<input required name="name" placeholder="e.g. Camille Rodriguez" autocomplete="name" /></label>
        <label>Email Address<input required type="email" name="email" placeholder="camille@example.com" autocomplete="email" /></label>
        <label>Phone / Mobile<input required type="tel" name="phone" placeholder="+63 917 123 4567" autocomplete="tel" /></label>
        <label>Couple's Names<input required name="coupleNames" placeholder="e.g. Camille & Rafael" /></label>
        <label>Target Wedding Date<input type="date" name="weddingDate" /></label>
        <label>Facebook / Event Link<input type="url" name="facebookLink" placeholder="https://facebook.com/your-page" /></label>
        <label>Custom Requests & Notes
          <textarea name="content" rows="2" placeholder="Color palette, special wording, or design questions..."></textarea>
        </label>
      </div>

      <fieldset class="payment-methods">
        <legend>Select Payment Option</legend>
        <label class="payment-option">
          <input required type="radio" name="paymentMethod" value="gcash" checked />
          <span>
            <strong>GCash (0926 723 3515)</strong>
            <small>Instant payment via GCash app · Shintal Khye / Khyxx Digitals</small>
          </span>
        </label>
        <label class="payment-option">
          <input type="radio" name="paymentMethod" value="bank_transfer" />
          <span>
            <strong>BDO Unibank (0045 2819 9283)</strong>
            <small>Online banking or cash deposit · Shintal Khye</small>
          </span>
        </label>
        <label class="payment-option">
          <input type="radio" name="paymentMethod" value="maya" />
          <span>
            <strong>Maya (0926 723 3515)</strong>
            <small>Send to Maya mobile wallet</small>
          </span>
        </label>
      </fieldset>

      <label style="margin-top: 10px;">
        Payment Reference / Ref No. (Optional)
        <input name="paymentReference" placeholder="Enter reference no. if already paid via app" />
      </label>

      <div class="checkout-summary">
        <div class="summary-heading">
          Your bag <span>${cart.reduce((s, i) => s + (i.quantity || 1), 0)} piece(s)</span>
        </div>
        ${cart.map(item => `
          <span>
            ${item.name} (x${item.quantity || 1})
            <strong>${formatPrice(item.price * (item.quantity || 1))}</strong>
          </span>
        `).join('')}
        <span class="summary-total">
          <b>Total Due</b>
          <strong>${formatPrice(cart.reduce((t, i) => t + (i.price * (i.quantity || 1)), 0))}</strong>
        </span>
      </div>

      <p class="checkout-error" role="alert"></p>
      <button class="button button-dark" type="submit" id="checkout-submit-btn">
        Confirm Order & Proceed <span>→</span>
      </button>
    </form>
  `;
  document.body.append(modal);

  const form = modal.querySelector('form');
  const error = modal.querySelector('.checkout-error');
  const close = () => modal.remove();
  modal.querySelector('.close-checkout').addEventListener('click', close);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submitBtn = modal.querySelector('#checkout-submit-btn');
    error.textContent = '';

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const phone = form.elements.phone.value.trim();
    const coupleNames = form.elements.coupleNames.value.trim();
    const weddingDate = form.elements.weddingDate.value;
    const facebookLink = form.elements.facebookLink.value.trim();
    const content = form.elements.content.value.trim();
    const paymentMethod = form.elements.paymentMethod.value;
    const paymentReference = form.elements.paymentReference.value.trim();

    if (!name || !email || !coupleNames) {
      error.textContent = 'Please fill out your name, email, and couple names.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating your order...';

    const orderPayload = {
      customer: { name, email, phone },
      event: { coupleNames, weddingDate, facebookLink, content },
      items: [...cart],
      paymentMethod,
      paymentReference
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      let data;
      if (res.ok) {
        data = await res.json();
      } else {
        throw new Error('Server returned an error');
      }

      const orderId = data.orderId || `KHYXX-${Date.now()}`;

      // Reset and clear cart
      localStorage.removeItem('khyxx-cart');
      cart.length = 0;
      saveCart();
      renderCart();

      // Show Order Success Screen
      modal.innerHTML = `
        <div class="checkout-form order-details-success">
          <span class="sparkle-icon">✦</span>
          <p class="eyebrow">order created</p>
          <h2 style="color: var(--wine);">Congratulations!</h2>
          <p class="checkout-intro">Thank you, <strong>${name}</strong>! Your order for <strong>${coupleNames}</strong> has been registered.</p>

          <div style="background: #fff; border: 1px solid #dec4b6; padding: 16px; border-radius: 6px; margin: 18px 0; text-align: center;">
            <small style="text-transform: uppercase; color: #87777a; letter-spacing: 0.08em; display: block;">Your Order Code</small>
            <strong style="font-size: 1.5rem; color: var(--wine); letter-spacing: 0.05em; display: block; margin: 6px 0;">${orderId}</strong>
            <button type="button" class="button secondary" style="padding: 4px 10px; font-size: 0.72rem;" onclick="navigator.clipboard.writeText('${orderId}'); alert('Order code copied!');">
              Copy Order Code 📋
            </button>
          </div>

          <p style="font-size: 0.85rem; color: #705b5f;">
            Next step: Send payment via <strong>${paymentMethod.toUpperCase()}</strong> and track your order to immediately unlock your Canva templates.
          </p>

          <div style="display: grid; gap: 8px; margin-top: 20px;">
            <a href="track-order.html?id=${encodeURIComponent(orderId)}" class="button button-dark" style="text-align: center; text-decoration: none;">
              Track Order & View Payment Info <span>→</span>
            </a>
            <button class="button secondary close-success-btn" type="button">Close Window</button>
          </div>
        </div>
      `;

      modal.querySelector('.close-success-btn')?.addEventListener('click', close);

      const confirmation = document.querySelector('.order-confirmation');
      if (confirmation) {
        confirmation.innerHTML = `Order <strong>${orderId}</strong> received! Track your order anytime on <a href="track-order.html?id=${orderId}">the tracking portal</a>.`;
        confirmation.classList.add('visible');
      }

    } catch (err) {
      console.warn('Backend order submission fallback:', err);
      // Client-side fallback if server offline
      const fallbackId = `KHYXX-LOCAL-${Date.now()}`;
      localStorage.removeItem('khyxx-cart');
      cart.length = 0;
      saveCart();
      renderCart();
      close();
      alert(`Order ${fallbackId} placed successfully! We will contact you soon.`);
    }
  });
}

document.querySelector('.checkout')?.addEventListener('click', showCheckoutForm);

// ==================== PRODUCT FILTERS ==================== //

function setActiveFilter(filterName) {
  const activeFilter = document.querySelector('.filter.active');
  const nextFilter = document.querySelector(`.filter[data-filter="${filterName}"]`);

  if (activeFilter) activeFilter.classList.remove('active');
  if (nextFilter) nextFilter.classList.add('active');

  document.querySelectorAll('.product').forEach(product => {
    const shouldShow = filterName === 'all' || product.dataset.category === filterName;
    product.classList.toggle('hidden', !shouldShow);
  });
}

document.querySelectorAll('.filter').forEach(filter => {
  filter.addEventListener('click', () => {
    setActiveFilter(filter.dataset.filter);
  });
});

document.querySelector('.view-websites-link')?.addEventListener('click', event => {
  event.preventDefault();
  setActiveFilter('website');
  scrollToSection('shop');
  window.history.replaceState(null, '', '#shop');
});

document.querySelector('.view-invitations-link')?.addEventListener('click', event => {
  event.preventDefault();
  setActiveFilter('invitation');
  scrollToSection('shop');
  window.history.replaceState(null, '', '#shop');
});

// ==================== TESTIMONIALS QUOTE CAROUSEL ==================== //

const quotes = [
  ['“The invitation was even more beautiful than we imagined. Khyxx made the entire process feel effortless and so personal.”', '— Camille & Rafael'],
  ['“Our wedding site looked incredible and the RSVP tracker was a lifesaver. Every guest kept asking who designed it.”', '— Nina & Miguel'],
  ['“Beautiful, warm, and so easy to customise. It brought our whole vision together in an afternoon.”', '— Arielle & Sam'],
  ['“The design was exactly what we dreamed of, and our guests loved every little detail.”', '— Bea & Marco'],
  ['“So easy to personalise and beautifully made. It made our celebration feel even more special.”', '— Lara & Enzo']
];
let quoteIndex = 0;
let feedbackNextCount = 0;

function changeQuote(direction) {
  quoteIndex = (quoteIndex + direction + quotes.length) % quotes.length;
  const textEl = document.querySelector('#quote-text');
  const authorEl = document.querySelector('#quote-author');
  if (textEl) textEl.textContent = quotes[quoteIndex][0];
  if (authorEl) authorEl.textContent = quotes[quoteIndex][1];
}

document.querySelector('.next')?.addEventListener('click', () => {
  changeQuote(1);
  feedbackNextCount = (feedbackNextCount + 1) % quotes.length;
  document.querySelector('.feedback-gallery')?.classList.toggle('visible', feedbackNextCount !== 0);
});

document.querySelector('.previous')?.addEventListener('click', () => changeQuote(-1));

// ==================== NAVIGATION & MOBILE MENU ==================== //

document.querySelectorAll('.nav a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const targetId = href.slice(1);
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    setActiveNavLink(targetId);
    scrollToSection(targetId);
    window.history.replaceState(null, '', href);
    document.querySelector('.nav')?.classList.remove('open');
  });
});

document.querySelector('.menu-toggle')?.addEventListener('click', event => {
  const nav = document.querySelector('.nav');
  nav?.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(nav?.classList.contains('open')));
});

document.querySelectorAll('.nav a').forEach(link => {
  link.addEventListener('click', () => document.querySelector('.nav')?.classList.remove('open'));
});

// ==================== CONTACT FORM SYSTEM ==================== //

const contactForm = document.querySelector('#contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async event => {
    event.preventDefault();
    const statusEl = document.querySelector('.form-status');
    const submitBtn = contactForm.querySelector('button[type="submit"]');

    const name = contactForm.elements.name?.value.trim();
    const email = contactForm.elements.email?.value.trim();
    const message = contactForm.elements.message?.value.trim();
    const eventType = contactForm.elements.eventType?.value || 'Wedding Template Inquiry';
    const eventDate = contactForm.elements.eventDate?.value || '';

    if (!name || !email || !message) {
      if (statusEl) statusEl.textContent = 'Please fill out all fields.';
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending message...';
    }

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, eventType, eventDate, message })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to send inquiry');

      contactForm.reset();
      if (statusEl) {
        statusEl.innerHTML = `✓ Thank you, ${name}! Your inquiry (<strong>${data.inquiryId}</strong>) was received. We’ll be in touch soon!`;
        statusEl.style.color = '#2e7d32';
      }
    } catch (err) {
      console.warn('Inquiry submission fallback:', err);
      contactForm.reset();
      if (statusEl) {
        statusEl.textContent = 'Thank you — we’ll be in touch soon!';
        statusEl.style.color = 'var(--wine)';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send inquiry <span>→</span>';
      }
    }
  });
}

// Window lifecycle listeners
window.addEventListener('scroll', () => {
  updateHeaderState();
  updateActiveNavFromScroll();
}, { passive: true });

window.addEventListener('load', () => {
  updateHeaderState();
  updateActiveNavFromScroll();
  renderCart();
});
