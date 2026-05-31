const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // Your data (this replaces the JSON from AI Studio)
  const data = {
    name: "OG",
    sprint_name: "Gain Clarity First",
    outcome: "Ggh",
    bg_gradient: "linear-gradient(135deg, #040d0a 0%, #081711 50%, #0e261d 100%)",
    custom_font: "'Inter', sans-serif",
    text_font: "'Playfair Display', serif",
    font_link: ""
  };

  try {
    // Read your HTML template
    let html = fs.readFileSync('template.html', 'utf8');

    // Inject data and theme variables into the template
    html = html
      .replace('{{name}}', data.name)
      .replace('{{sprint_name}}', data.sprint_name)
      .replace('{{outcome}}', data.outcome)
      .replace('{{{font_link}}}', data.font_link || '')
      .replace('{{{bg_gradient}}}', data.bg_gradient || 'linear-gradient(135deg, #040d0a 0%, #081711 50%, #0e261d 100%)')
      .replace('{{{custom_font}}}', data.custom_font || "'Inter', sans-serif")
      .replace('{{{text_font}}}', data.text_font || "'Playfair Display', serif");

    // Launch browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Load HTML content
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Set viewport dimensions matching the template card
    await page.setViewport({ width: 600, height: 800 });

    // Take screenshot → THIS creates the image
    await page.screenshot({
      path: 'output.png',
      fullPage: true
    });

    await browser.close();

    console.log('✅ Image generated: output.png');
  } catch (err) {
    console.error('❌ Failed to generate achievement card image:', err);
  }
})();
