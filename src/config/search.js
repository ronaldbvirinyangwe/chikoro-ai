import express from 'express';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const app = express();
const port = 4173;

app.use(express.json());

/**
 * Performs a search on DuckDuckGo Lite and returns the results.
 * @param {string} query The search query.
 * @param {number} maxResults The maximum number of results to return.
 * @returns {Promise<Array<{title: string, url: string}>>} A promise that resolves to an array of search results.
 */
async function duckduckgoSearch(query, maxResults = 10) {
    const searchUrl = `https://lite.duckduckgo.com/lite?q=${encodeURIComponent(query)}`;
    console.log(`[Tool Server] Performing search for: ${query}`);

    try {
        // Using axios for the GET request
        const {
            data: html
        } = await (await import('axios')).default.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(html);
        const results = [];

        // Corrected selector to find search result links
        $('a.result-link').each((i, el) => {
            if (results.length >= maxResults) {
                return false; // Break the loop
            }

            const title = $(el).text().trim();
            const url = $(el).attr('href');

            // The URLs are relative, so we need to prepend the domain
            const absoluteUrl = `https://lite.duckduckgo.com${url}`;


            // The actual URL is in a query parameter 'uddg'
            const decodedUrl = decodeURIComponent(absoluteUrl.split('uddg=')[1]);

            if (decodedUrl) {
                const finalUrl = decodedUrl.split('&rut=')[0];
                if (!finalUrl.startsWith('https://duckduckgo.com')) {
                    results.push({
                        title,
                        url: finalUrl
                    });
                }
            }
        });


        return results;
    } catch (error) {
        console.error('[Tool Server] Error fetching search results:', error.message);
        return [];
    }
}


/**
 * UPGRADED SCRAPER using Puppeteer to behave like a real browser.
 * @param {string} url The URL of the webpage to scrape.
 * @returns {Promise<string>} A promise that resolves to the cleaned text content of the page.
 */
async function scrapeAndRead(url) {
    console.log(`[Tool Server] Scraping URL with Puppeteer: ${url}`);
    let browser;
    try {
        // Launch a headless browser instance
        browser = await puppeteer.launch({
            headless: true, // Run in the background
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Args for compatibility
        });
        const page = await browser.newPage();

        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

        // Navigate to the URL and wait for the page to be fully loaded
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Get the full HTML content of the page after it has loaded
        const html = await page.content();

        // Use Cheerio to parse the HTML and extract text (same logic as before)
        const $ = cheerio.load(html);
        $('script, style, nav, footer, header, aside, form, .ads, #ads, [aria-hidden="true"]').remove();
        const bodyText = $('body').text();
        const cleanedText = bodyText.replace(/\s\s+/g, ' ').replace(/\n+/g, '\n').trim();
        const maxLength = 8000;
        return cleanedText.length > maxLength ? cleanedText.substring(0, maxLength) + "..." : cleanedText;

    } catch (error) {
        console.error(`[Tool Server] Error scraping URL with Puppeteer ${url}:`, error.message);
        return `Failed to retrieve content from the URL. It may be heavily protected or require a CAPTCHA. Error: ${error.message}`;
    } finally {
        // VERY IMPORTANT: Ensure the browser is closed to prevent memory leaks
        if (browser) {
            await browser.close();
        }
    }
}


// --- API Endpoints (No changes here) ---

app.post('/search', async (req, res) => {
    const {
        query
    } = req.body;
    if (!query) {
        return res.status(400).json({
            error: 'Query is required'
        });
    }
    const results = await duckduckgoSearch(query);
    res.json(results);
});

app.post('/scrape', async (req, res) => {
    const {
        url
    } = req.body;
    if (!url) {
        return res.status(400).json({
            error: 'URL is required'
        });
    }
    const content = await scrapeAndRead(url);
    res.send(content);
});

app.listen(port, () => {
    console.log(`Tool server with Puppeteer listening at http://localhost:${port}`);
});
