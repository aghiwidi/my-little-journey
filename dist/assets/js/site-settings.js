(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const setText = (selector, value) => {
    const element = $(selector);
    if (element && typeof value === 'string' && value.trim()) element.textContent = value;
  };
  const setImage = (selector, value, alt) => {
    const element = $(selector);
    if (element && typeof value === 'string' && value.trim()) {
      element.src = value;
      if (alt) element.alt = alt;
    }
  };

  fetch('/data/site.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Settings request failed (${response.status})`);
      return response.json();
    })
    .then(settings => {
      document.title = `${settings.site_title || 'MY LITTLE JOURNEY'} — ${settings.owner_name || ''}`;

      const description = $('meta[name="description"]');
      if (description) description.content = settings.hero_intro || settings.tagline || '';

      setText('.hero-copy .intro', settings.hero_intro);
      const brandOwner = $('.brand small');
      if (brandOwner && settings.owner_name) brandOwner.textContent = settings.owner_name;

      document.querySelectorAll('.footer-bottom span').forEach(element => {
        if (settings.owner_name) element.textContent = `© 2026 ${settings.owner_name}`;
      });

      setText('.about-copy h2', settings.about_heading);
      const aboutParagraphs = document.querySelectorAll('.about-copy > p:not(.eyebrow)');
      if (aboutParagraphs[0] && settings.about_paragraph_1) aboutParagraphs[0].textContent = settings.about_paragraph_1;
      if (aboutParagraphs[1] && settings.about_paragraph_2) aboutParagraphs[1].textContent = settings.about_paragraph_2;

      setText('.portfolio .section-heading > p', settings.portfolio_intro);
      setText('.journey-inner > p', settings.behind_the_scenes);
      setText('.goals-grid > div:nth-child(2) > p', settings.goals_intro);
      if (settings.quote) setText('.quote-section blockquote', `“${settings.quote}”`);

      const instagram = $('.instagram');
      if (instagram) {
        if (settings.instagram_url) instagram.href = settings.instagram_url;
        const username = instagram.querySelector('strong');
        if (username && settings.instagram_username) username.textContent = settings.instagram_username;
      }

      setImage('.hero-image img', settings.hero_image, 'Foto utama portfolio Vinka');
      setImage('.about-photo img', settings.about_image, 'Foto About Me');
      const portfolioImages = document.querySelectorAll('.portfolio-item img');
      [settings.travel_image, settings.modeling_image, settings.bridal_image].forEach((url, index) => {
        if (portfolioImages[index] && url) {
          portfolioImages[index].src = url;
          portfolioImages[index].alt = ['Foto traveling', 'Foto modeling', 'Foto bridal makeup'][index];
        }
      });
    })
    .catch(error => console.warn('MY LITTLE JOURNEY settings:', error.message));
})();
